-- Borrar mis datos: los contadores de consumo de la academia se quedan,
-- pero sin el nombre de nadie. El alumno no puede hacerlo con sus permisos
-- (después ya no «vería» esas filas), así que lo hace esta función, que
-- solo toca las filas de quien la llama.
create or replace function academia.anonimizar_mi_uso()
returns void language sql volatile security definer set search_path = ''
as $$ update academia.uso set persona_id = null where persona_id = academia.yo() and academia.yo() is not null $$;
revoke execute on function academia.anonimizar_mi_uso() from public;
grant execute on function academia.anonimizar_mi_uso() to app_usuario;
