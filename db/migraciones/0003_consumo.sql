-- =====================================================================
--  CONSUMO DE LA ACADEMIA Y AJUSTES
--  El alumno solo ve su propio contador; el total de la academia (para el
--  tope del mes) se consulta con estas funciones, que no enseñan nada de
--  nadie en concreto.
-- =====================================================================

set search_path = academia, extensions, public;

-- Preguntas o materiales usados este mes por toda la academia.
create or replace function academia.uso_academia_mes(p_tipo text)
returns int language sql stable security definer set search_path = ''
as $$
  select count(*)::int from academia.uso u
  where u.tipo = p_tipo and u.mes = academia.mes_madrid() and academia.yo() is not null
$$;
revoke execute on function academia.uso_academia_mes(text) from public;
grant execute on function academia.uso_academia_mes(text) to app_usuario, app_soporte;

-- Materiales creados este mes por la persona (incluye los del formador).
create or replace function academia.mis_materiales_mes()
returns int language sql stable security definer set search_path = ''
as $$
  select count(*)::int from academia.uso u
  where u.tipo = 'material' and u.mes = academia.mes_madrid() and u.persona_id = academia.yo()
$$;
revoke execute on function academia.mis_materiales_mes() from public;
grant execute on function academia.mis_materiales_mes() to app_usuario, app_soporte;

-- Ajustes que puede cambiar el panel técnico (límites de la academia).
-- Se leen desde el servidor; aquí solo una lectura segura para la app.
create or replace function academia.ajuste(p_clave text)
returns jsonb language sql stable security definer set search_path = ''
as $$ select a.valor from academia.ajustes a where a.clave = p_clave and p_clave like 'limites.%' $$;
revoke execute on function academia.ajuste(text) from public;
grant execute on function academia.ajuste(text) to app_usuario, app_soporte;
