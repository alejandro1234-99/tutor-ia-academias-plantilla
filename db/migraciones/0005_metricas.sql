-- =====================================================================
--  MÉTRICAS (SOLUCION.md, sección 12)
--  El formador y el dueño NO pueden leer lo que pregunta cada alumno ni
--  sus notas. Estas funciones hacen las cuentas dentro de la base de datos
--  y solo devuelven totales, y solo de los grupos que le tocan a quien
--  pregunta: el formador, los suyos; el dueño, toda la academia.
--  La regla de los 5 alumnos la aplica cada función.
-- =====================================================================

set search_path = academia, extensions, public;

-- Los grupos sobre los que puede ver métricas quien pregunta.
create or replace function academia.alcance_metricas(p_grupos uuid[], p_como_dueno boolean)
returns uuid[] language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(g.id), '{}')
  from academia.grupos g
  where (p_grupos is null or g.id = any(p_grupos))
    and (
      (p_como_dueno and academia.soy_dueno())
      or g.id = any(academia.mis_grupos())
    )
$$;

-- Alumnos (no dados de baja) de esos grupos.
create or replace function academia._alumnos_de(p_grupos uuid[])
returns table (id uuid, grupo_id uuid) language sql stable security definer set search_path = ''
as $$ select p.id, p.grupo_id from academia.personas p where p.es_alumno and p.grupo_id = any(p_grupos) $$;
revoke execute on function academia._alumnos_de(uuid[]) from public;

-- M1 · Uso
create or replace function academia.metricas_uso(p_desde date, p_grupos uuid[], p_como_dueno boolean, p_minimo int)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_g uuid[] := academia.alcance_metricas(p_grupos, p_como_dueno);
  v_activos int;
  v_total int;
begin
  select count(*) into v_total from academia._alumnos_de(v_g) a join academia.personas p on p.id = a.id where p.estado <> 'baja';
  select count(distinct ac.persona_id) into v_activos
    from academia.actividad ac join academia._alumnos_de(v_g) a on a.id = ac.persona_id where ac.fecha >= p_desde;
  if v_activos < p_minimo then
    return jsonb_build_object('suficientes', false, 'alumnos', v_total);
  end if;
  return jsonb_build_object(
    'suficientes', true,
    'alumnos', v_total,
    'activos', v_activos,
    'preguntas', (select count(*) from academia.uso u where u.tipo = 'pregunta' and u.fecha >= p_desde and u.grupo_id = any(v_g)),
    'materiales', (select count(*) from academia.uso u join academia._alumnos_de(v_g) a on a.id = u.persona_id where u.tipo = 'material' and u.fecha >= p_desde),
    'porDia', (select coalesce(jsonb_agg(jsonb_build_object('fecha', f, 'n', n) order by f), '[]') from (
        select u.fecha as f, count(*) as n from academia.uso u where u.tipo = 'pregunta' and u.fecha >= p_desde and u.grupo_id = any(v_g) group by u.fecha) x),
    'mapa', (select coalesce(jsonb_agg(jsonb_build_object('dia', d, 'hora', h, 'n', n)), '[]') from (
        select extract(isodow from (u.creado_at at time zone 'Europe/Madrid'))::int as d,
               extract(hour from (u.creado_at at time zone 'Europe/Madrid'))::int as h, count(*) as n
        from academia.uso u where u.tipo = 'pregunta' and u.fecha >= p_desde and u.grupo_id = any(v_g) group by 1, 2) x)
  );
end
$$;

-- Preguntas de los alumnos (para que la IA las agrupe por asunto). No sale
-- nunca quién las hizo: solo una marca anónima para contar alumnos distintos.
create or replace function academia.metricas_preguntas(p_desde date, p_grupos uuid[], p_como_dueno boolean, p_solo_no_esta boolean, p_limite int)
returns table (texto text, alumno text, tema int) language sql stable security definer set search_path = ''
as $$
  select q.texto, md5(q.alumno_id::text || 'metricas'), (r.citas -> 0 ->> 'temaNumero')::int
  from academia.mensajes r
  join lateral (
    select m.texto, m.alumno_id from academia.mensajes m
    where m.conversacion_id = r.conversacion_id and m.rol = 'alumno' and m.creado_at <= r.creado_at
    order by m.creado_at desc limit 1
  ) q on true
  join academia.personas p on p.id = r.alumno_id
  where r.rol = 'asistente' and r.creado_at >= p_desde
    and p.grupo_id = any(academia.alcance_metricas(p_grupos, p_como_dueno))
    and (case when p_solo_no_esta then r.estado = 'no_esta' else r.estado in ('ok', 'no_esta') end)
  order by r.creado_at desc
  limit p_limite
$$;

-- Alumnos activos de un alcance (para la regla de los 5).
create or replace function academia.metricas_activos(p_desde date, p_grupos uuid[], p_como_dueno boolean)
returns int language sql stable security definer set search_path = ''
as $$
  select count(distinct ac.persona_id)::int from academia.actividad ac
  join academia._alumnos_de(academia.alcance_metricas(p_grupos, p_como_dueno)) a on a.id = ac.persona_id
  where ac.fecha >= p_desde
$$;

-- Respuestas de tests, pregunta a pregunta, con su tema (sin alumno).
create or replace function academia._respuestas_test(p_desde date, p_grupos uuid[])
returns table (intento uuid, alumno uuid, grupo uuid, tema int, acierto boolean, nota numeric, modo text)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.alumno_id, p.grupo_id,
         (m.contenido -> 'preguntas' -> x.idx -> 'cita' ->> 'tema')::int,
         (i.respuestas ->> x.idx::text)::int is not distinct from (m.contenido -> 'preguntas' -> x.idx ->> 'correcta')::int,
         i.nota, i.modo
  from academia.intentos_test i
  join academia.materiales m on m.id = i.material_id
  join academia.personas p on p.id = i.alumno_id
  cross join lateral unnest(i.preguntas) as x(idx)
  where i.terminado_at is not null and i.terminado_at >= p_desde and p.grupo_id = any(p_grupos) and i.modo <> 'repaso'
$$;
revoke execute on function academia._respuestas_test(date, uuid[]) from public;

-- M2 · Dónde se atascan: temas con más dudas y más fallos en tests.
create or replace function academia.metricas_atascos(p_desde date, p_grupos uuid[], p_como_dueno boolean, p_minimo int)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_g uuid[] := academia.alcance_metricas(p_grupos, p_como_dueno);
begin
  if academia.metricas_activos(p_desde, v_g, p_como_dueno) < p_minimo then
    return jsonb_build_object('suficientes', false);
  end if;
  return jsonb_build_object('suficientes', true, 'temas', (
    select coalesce(jsonb_agg(x order by x.puntos desc), '[]') from (
      select t.numero as tema, coalesce(t.nombre_corto, t.nombre) as nombre,
             coalesce(d.n, 0) as dudas,
             case when coalesce(r.total, 0) >= 5 then round(100.0 * r.fallos / r.total) end as fallos_pct,
             coalesce(d.n, 0) + coalesce(r.fallos, 0) as puntos
      from academia.temas t
      left join (
        select (r.citas -> 0 ->> 'temaNumero')::int as tema, count(*) as n
        from academia.mensajes r join academia.personas p on p.id = r.alumno_id
        where r.rol = 'asistente' and r.creado_at >= p_desde and p.grupo_id = any(v_g) and r.estado = 'ok'
        group by 1
      ) d on d.tema = t.numero
      left join (
        select tema, count(*) as total, count(*) filter (where not acierto) as fallos
        from academia._respuestas_test(p_desde, v_g) group by tema
      ) r on r.tema = t.numero
      where t.version_actual_id is not null
        and t.oposicion_id in (select g.oposicion_id from academia.grupos g where g.id = any(v_g))
    ) x
  ));
end
$$;

-- M4 · Progreso del grupo: nota media y temas fuertes y flojos, por grupo.
-- Un grupo con menos de p_minimo alumnos con tests no se enseña.
create or replace function academia.metricas_progreso(p_desde date, p_grupos uuid[], p_como_dueno boolean, p_minimo int)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with r as (select * from academia._respuestas_test(p_desde, academia.alcance_metricas(p_grupos, p_como_dueno))),
  por_grupo as (
    select g.id, g.nombre,
      (select count(distinct alumno) from r where r.grupo = g.id) as alumnos,
      (select count(distinct intento) from r where r.grupo = g.id) as tests,
      (select round(avg(n)::numeric, 2) from (select distinct intento, nota as n from r where r.grupo = g.id) y) as nota
    from academia.grupos g where g.id = any(academia.alcance_metricas(p_grupos, p_como_dueno))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'grupo', pg.nombre,
    'suficientes', pg.alumnos >= p_minimo,
    'tests', case when pg.alumnos >= p_minimo then pg.tests end,
    'nota', case when pg.alumnos >= p_minimo then pg.nota end,
    'temas', case when pg.alumnos >= p_minimo then (
      select coalesce(jsonb_agg(jsonb_build_object('tema', t.tema, 'pct', t.pct) order by t.pct desc), '[]') from (
        select r.tema, round(100.0 * count(*) filter (where r.acierto) / count(*)) as pct
        from r where r.grupo = pg.id and r.tema is not null group by r.tema having count(*) >= 5
      ) t) end
  ) order by pg.nombre), '[]')
  from por_grupo pg
$$;

-- M5 · Material: formatos más creados y peor valorados.
create or replace function academia.metricas_material(p_desde date, p_grupos uuid[], p_como_dueno boolean, p_minimo int)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_g uuid[] := academia.alcance_metricas(p_grupos, p_como_dueno);
  v_creadores int;
begin
  select count(distinct m.propietario_id) into v_creadores
    from academia.materiales m join academia._alumnos_de(v_g) a on a.id = m.propietario_id where m.creado_at >= p_desde;
  if v_creadores < p_minimo then
    return jsonb_build_object('suficientes', false);
  end if;
  return jsonb_build_object('suficientes', true, 'formatos', (
    select coalesce(jsonb_agg(x order by x.creados desc), '[]') from (
      select m.formato, coalesce(m.estilo, '') as estilo, count(*) as creados,
             count(*) filter (where m.valoracion is not null) as valorados,
             count(*) filter (where m.valoracion = 'no_sirvio') as no_sirvio
      from academia.materiales m join academia._alumnos_de(v_g) a on a.id = m.propietario_id
      where m.creado_at >= p_desde and m.estado = 'listo'
      group by 1, 2
    ) x));
end
$$;

-- D3 · Consumo del mes de toda la academia (solo el dueño).
create or replace function academia.consumo_academia()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when academia.soy_dueno() then jsonb_build_object(
    'preguntas', (select count(*) from academia.uso where tipo = 'pregunta' and mes = academia.mes_madrid()),
    'materiales', (select count(*) from academia.uso where tipo = 'material' and mes = academia.mes_madrid()),
    'alumnos', (select count(*) from academia.personas where es_alumno and estado <> 'baja')
  ) end
$$;

revoke execute on function academia.alcance_metricas(uuid[], boolean), academia.metricas_uso(date, uuid[], boolean, int),
  academia.metricas_preguntas(date, uuid[], boolean, boolean, int), academia.metricas_activos(date, uuid[], boolean),
  academia.metricas_atascos(date, uuid[], boolean, int), academia.metricas_progreso(date, uuid[], boolean, int),
  academia.metricas_material(date, uuid[], boolean, int), academia.consumo_academia() from public;
grant execute on function academia.alcance_metricas(uuid[], boolean), academia.metricas_uso(date, uuid[], boolean, int),
  academia.metricas_preguntas(date, uuid[], boolean, boolean, int), academia.metricas_activos(date, uuid[], boolean),
  academia.metricas_atascos(date, uuid[], boolean, int), academia.metricas_progreso(date, uuid[], boolean, int),
  academia.metricas_material(date, uuid[], boolean, int), academia.consumo_academia() to app_usuario, app_soporte;
