-- =====================================================================
--  BUSCADOR: SOLO CUENTAN LAS PALABRAS QUE DICEN DE QUÉ VA LA PREGUNTA
--  En la prueba de las 50 dudas con la IA real, palabras de pregunta como
--  «cuánto» o «puede» hacían subir trozos y notas del formador que no
--  venían a cuento (una nota sobre trienios salía al preguntar cuánto se
--  puede ampliar un plazo). Ahora esas palabras no cuentan tampoco para la
--  densidad ni para las notas, y una nota del formador solo sale si trae la
--  mayoría de las palabras útiles de la pregunta.
-- =====================================================================

set search_path = academia, extensions, public;

-- Las palabras (ya reducidas a su raíz) que no dicen de qué trata una pregunta.
create or replace function academia.palabras_de_pregunta()
returns text[] language sql immutable parallel safe
as $$
  select array['hac', 'falt', 'cuant', 'dur', 'tien', 'pued', 'hay', 'dic', 'deb', 'sirv', 'signif', 'pas', 'ocurr',
               'mism', 'cualqu', 'algun', 'ningun', 'tod', 'cad', 'part', 'form', 'cas', 'vec', 'dia']
$$;

create or replace function academia.buscar_temario(
  p_consulta text,
  p_embedding extensions.vector(1024),
  p_articulos text[] default '{}',
  p_limite int default 6,
  p_oposicion uuid default null,
  p_temas uuid[] default null
)
returns table (
  tipo text, id uuid, tema_id uuid, tema_numero int, tema_nombre text, version_id uuid,
  pagina int, pagina_impresa int, parrafo_desde int, parrafos jsonb, articulos text[], texto text,
  autor_nombre text, fecha timestamptz, puntuacion double precision
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_op uuid;
  v_utiles text[];
  v_q tsquery;
  v_minimo_nota int;
begin
  if academia.yo() is null then
    return;
  end if;
  if p_oposicion is not null and p_oposicion = any(academia.mis_oposiciones_gestion()) then
    v_op := p_oposicion;
  else
    v_op := academia.mi_oposicion();
  end if;
  if v_op is null then
    return;
  end if;

  select coalesce(array_agg(distinct l), '{}') into v_utiles
  from unnest(tsvector_to_array(to_tsvector('spanish'::regconfig, academia.sin_acentos(coalesce(p_consulta, ''))))) as l
  where l <> all (academia.palabras_de_pregunta());
  -- Si la pregunta solo tiene palabras de pregunta, se usan todas.
  v_q := case when cardinality(v_utiles) > 0
              then to_tsquery('simple', (select string_agg(quote_literal(u), ' | ') from unnest(v_utiles) u))
              else academia.consulta_palabras(p_consulta) end;
  -- Una nota del formador tiene que traer la mayoría de las palabras útiles.
  v_minimo_nota := greatest(1, ceil(cardinality(v_utiles) * 0.6))::int;

  return query
  with vigentes as (
    select t.version_actual_id as vid, t.id as tid, t.numero, coalesce(t.nombre_corto, t.nombre) as nombre
    from academia.temas t
    where t.oposicion_id = v_op and t.version_actual_id is not null
      and (p_temas is null or t.id = any(p_temas))
  ),
  candidatos as (
    select tr.id, tr.fts, length(tr.texto) as largo
    from academia.trozos tr
    where tr.version_id in (select vid from vigentes) and not tr.es_indice
  ),
  total as (select count(*)::float as n, greatest(avg(largo), 1)::float as media from candidatos),
  palabras as (
    select unnest(v_utiles) as lexema
  ),
  -- Cuántos trozos tienen cada palabra, y su peso: más raro, más peso.
  pesos as (
    select p.lexema,
           ln(1 + ((select n from total) - count(c.id) + 0.5) / (count(c.id) + 0.5)) as idf
    from palabras p
    left join candidatos c on c.fts @@ to_tsquery('simple', quote_literal(p.lexema))
    group by p.lexema
  ),
  bm25 as (
    select c.id,
           row_number() over (order by sum(pe.idf * 2.2 / (1 + 1.2 * (0.7 + 0.3 * c.largo / (select media from total)))) desc) as r
    from candidatos c
    join pesos pe on c.fts @@ to_tsquery('simple', quote_literal(pe.lexema))
    group by c.id
    order by 2
    limit 40
  ),
  densidad as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, v_q, 1) desc) as r
    from candidatos c
    where v_q is not null and c.fts @@ v_q
    order by 2
    limit 40
  ),
  -- Las dos formas de puntuar las palabras, mezcladas.
  lex as (
    select x.id, row_number() over (order by sum(1.0 / (60 + x.r)) desc) as r
    from (select * from bm25 union all select * from densidad) x
    group by x.id
    order by 2
    limit 40
  ),
  sem as (
    select tr.id, row_number() over (order by tr.embedding operator(extensions.<=>) p_embedding) as r
    from academia.trozos tr
    where p_embedding is not null and tr.embedding is not null
      and tr.version_id in (select vid from vigentes) and not tr.es_indice
    order by tr.embedding operator(extensions.<=>) p_embedding
    limit 40
  ),
  fusion as (
    select x.id, sum(1.0 / (60 + x.r)) as s
    from (select * from lex union all select * from sem) x
    group by x.id
  ),
  trozos_top as (
    select tr.id, tr.tema_id, tr.version_id, tr.pagina, tr.pagina_impresa, tr.parrafo_desde, tr.parrafos,
           tr.articulos, tr.texto,
           f.s + case when cardinality(p_articulos) > 0 and tr.articulos && p_articulos then 0.05 else 0 end as s
    from fusion f join academia.trozos tr on tr.id = f.id
    order by 10 desc
    limit p_limite
  ),
  notas_lex as (
    select n.id, row_number() over (order by ts_rank_cd(n.fts, v_q, 1) desc) as r
    from academia.notas_formador n
    join vigentes v on v.tid = n.tema_id
    where n.retirada_at is null and v_q is not null and n.fts @@ v_q
      and (select count(*) from unnest(v_utiles) u where n.fts @@ to_tsquery('simple', quote_literal(u))) >= v_minimo_nota
    limit 10
  ),
  notas_sem as (
    select n.id, row_number() over (order by n.embedding operator(extensions.<=>) p_embedding) as r
    from academia.notas_formador n
    join vigentes v on v.tid = n.tema_id
    where n.retirada_at is null and p_embedding is not null and n.embedding is not null
      and (n.embedding operator(extensions.<=>) p_embedding) < 0.55
    order by n.embedding operator(extensions.<=>) p_embedding
    limit 10
  ),
  notas_top as (
    select x.id, sum(1.0 / (60 + x.r)) as s
    from (select * from notas_lex union all select * from notas_sem) x
    group by x.id
    order by 2 desc
    limit 2
  )
  select * from (
    select 'temario'::text, t.id, t.tema_id, v.numero, v.nombre, t.version_id, t.pagina, t.pagina_impresa,
           t.parrafo_desde, t.parrafos, t.articulos, t.texto, null::text, null::timestamptz, t.s::double precision
    from trozos_top t join vigentes v on v.tid = t.tema_id
    union all
    select 'nota'::text, n.id, n.tema_id, v.numero, v.nombre, null::uuid, null::int, null::int,
           null::int, null::jsonb, '{}'::text[], n.texto, n.autor_nombre, coalesce(n.editada_at, n.creada_at), nt.s::double precision
    from notas_top nt join academia.notas_formador n on n.id = nt.id join vigentes v on v.tid = n.tema_id
  ) r
  order by 15 desc;
end
$$;
