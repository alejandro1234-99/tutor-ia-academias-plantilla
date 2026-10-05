-- =====================================================================
--  EL BUSCADOR DEL TEMARIO Y LA RESPUESTA A LAS DUDAS
-- =====================================================================

set search_path = academia, extensions, public;

-- Convierte una pregunta en una búsqueda por palabras: cualquiera de las
-- palabras importantes (sin las vacías como «qué» o «para»), sin acentos.
create or replace function academia.consulta_palabras(p_texto text)
returns tsquery language sql immutable parallel safe
as $$
  select case when count(*) = 0 then null
    else to_tsquery('simple', string_agg(quote_literal(l), ' | ')) end
  from unnest(tsvector_to_array(to_tsvector('spanish'::regconfig, academia.sin_acentos(coalesce(p_texto, ''))))) as l
$$;

-- Busca en el temario ACTUAL de una oposición los trozos que hablan de la
-- pregunta, mezclando las dos búsquedas (palabras exactas y significado).
-- El alumno solo puede buscar en su oposición; el personal, en las que
-- gestiona. También devuelve las notas del formador que vengan a cuento.
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
  v_q tsquery := academia.consulta_palabras(p_consulta);
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

  return query
  with vigentes as (
    select t.version_actual_id as vid, t.id as tid, t.numero, coalesce(t.nombre_corto, t.nombre) as nombre
    from academia.temas t
    where t.oposicion_id = v_op and t.version_actual_id is not null
      and (p_temas is null or t.id = any(p_temas))
  ),
  lex as (
    select tr.id, row_number() over (order by ts_rank_cd(tr.fts, v_q, 1) desc) as r
    from academia.trozos tr
    where v_q is not null and tr.version_id in (select vid from vigentes) and not tr.es_indice and tr.fts @@ v_q
    order by ts_rank_cd(tr.fts, v_q, 1) desc
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
revoke execute on function academia.buscar_temario(text, extensions.vector, text[], int, uuid, uuid[]) from public;
grant execute on function academia.buscar_temario(text, extensions.vector, text[], int, uuid, uuid[]) to app_usuario;

-- El formador contesta una duda de su bandeja. La respuesta aparece en la
-- conversación del alumno como «Respuesta de tu formador». El formador
-- nunca sabe de quién es la duda: esta función no lo devuelve.
create or replace function academia.contestar_duda(
  p_duda uuid,
  p_texto text,
  p_guardar_nota boolean,
  p_tema uuid
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  d record;
  v_nombre text;
  v_nota uuid;
begin
  select * into d from academia.dudas where id = p_duda for update;
  if not found or not (d.grupo_id = any(academia.mis_grupos())) then
    raise exception 'no encontrado' using errcode = 'P0002';
  end if;
  if coalesce(trim(p_texto), '') = '' then
    raise exception 'La respuesta está vacía' using errcode = '22023';
  end if;
  select nombre into v_nombre from academia.personas where id = academia.yo();

  if p_guardar_nota then
    if p_tema is null or not academia.tema_gestionable(p_tema) then
      raise exception 'Elige el tema donde guardar la nota' using errcode = '22023';
    end if;
    insert into academia.notas_formador (tema_id, autor_id, autor_nombre, pregunta, texto)
    values (p_tema, academia.yo(), v_nombre, d.pregunta, trim(p_texto))
    returning id into v_nota;
  end if;

  if d.conversacion_id is not null and d.alumno_id is not null then
    insert into academia.mensajes (conversacion_id, alumno_id, rol, texto, autor_nombre, nota_id, citas)
    values (
      d.conversacion_id, d.alumno_id, 'formador', trim(p_texto), v_nombre, v_nota,
      case when v_nota is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
        'tipo', 'nota', 'notaId', v_nota, 'temaId', p_tema,
        'temaNumero', (select numero from academia.temas where id = p_tema),
        'fecha', now()
      )) end
    );
    update academia.conversaciones set actualizada_at = now() where id = d.conversacion_id;
  end if;

  update academia.dudas
     set estado = 'contestada', respuesta = trim(p_texto), contestada_por = academia.yo(),
         contestada_por_nombre = v_nombre, contestada_at = now(), nota_id = v_nota,
         tema_id = coalesce(p_tema, tema_id)
   where id = p_duda;
  return v_nota;
end
$$;
revoke execute on function academia.contestar_duda(uuid, text, boolean, uuid) from public;
grant execute on function academia.contestar_duda(uuid, text, boolean, uuid) to app_usuario;
