-- Guardar de nuevo una parte del PDF (si se reintenta la subida) necesita
-- poder actualizarla.
grant update on academia.archivos_pdf to app_usuario;

-- Al guardar de nuevo una página, el personal borra sus trozos por número
-- de página. Los alumnos siguen sin poder leer los trozos (no tienen política).
grant select on academia.trozos to app_usuario;
