-- =====================================================================
--  ESTRUCTURA DE LA BASE DE DATOS · tutor-ia-academias
--
--  Todo vive en el esquema «academia», que Supabase NO publica en su API
--  automática: la única puerta de entrada es la web, desde el servidor.
--
--  Protección en la propia base de datos (SOLUCION.md, secciones 18 y 19):
--  cada petición de una persona se ejecuta con el papel «app_usuario» y con
--  su identificador en app.persona_id. Las políticas de cada tabla deciden
--  qué filas puede ver o cambiar. Aunque alguien manipulara la página, la
--  base de datos no le daría lo que no le toca.
--
--  «app_soporte» es el papel del modo soporte: solo puede leer.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists academia;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_usuario') then
    create role app_usuario nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_soporte') then
    create role app_soporte nologin noinherit;
  end if;
end $$;
grant app_usuario to current_user;
grant app_soporte to current_user;

grant usage on schema academia to app_usuario, app_soporte;
grant usage on schema extensions to app_usuario, app_soporte;

set search_path = academia, extensions, public;

-- ---------------------------------------------------------------------
--  Utilidades
-- ---------------------------------------------------------------------

-- Quitar acentos, para que «mocion» encuentre «moción».
create or replace function academia.sin_acentos(t text)
returns text language sql immutable parallel safe strict
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, t) $$;

create or replace function academia.hoy_madrid()
returns date language sql stable
as $$ select (now() at time zone 'Europe/Madrid')::date $$;

create or replace function academia.mes_madrid()
returns text language sql stable
as $$ select to_char(now() at time zone 'Europe/Madrid', 'YYYY-MM') $$;

-- Quién está haciendo la petición.
create or replace function academia.yo()
returns uuid language sql stable
as $$ select nullif(current_setting('app.persona_id', true), '')::uuid $$;

-- ---------------------------------------------------------------------
--  La academia: oposiciones, grupos y personas
-- ---------------------------------------------------------------------

create table academia.oposiciones (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  nombre text not null,
  resta_por_fallo numeric(6,4) not null default 0.3333 check (resta_por_fallo between 0 and 1),
  segundos_por_pregunta int not null default 60 check (segundos_por_pregunta >= 10),
  orden int not null default 0,
  creada_at timestamptz not null default now()
);

create table academia.grupos (
  id uuid primary key default gen_random_uuid(),
  oposicion_id uuid not null references academia.oposiciones(id),
  nombre text not null,
  archivado boolean not null default false,
  creado_at timestamptz not null default now()
);
create index grupos_oposicion_idx on academia.grupos (oposicion_id);
create unique index grupos_nombre_unico on academia.grupos (oposicion_id, lower(nombre)) where not archivado;

create table academia.personas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(nombre) between 1 and 120),
  correo extensions.citext not null unique check (correo ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  es_alumno boolean not null default false,
  es_formador boolean not null default false,
  es_dueno boolean not null default false,
  grupo_id uuid references academia.grupos(id),
  estado text not null default 'invitada' check (estado in ('invitada', 'activa', 'baja')),
  invitada_at timestamptz,
  invitada_por uuid references academia.personas(id) on delete set null,
  invitacion_aceptada_at timestamptz,
  ultimo_acceso_at timestamptz,
  baja_at timestamptz,
  borrar_desde timestamptz,
  limite_preguntas_dia int check (limite_preguntas_dia >= 0),
  limite_materiales_mes int check (limite_materiales_mes >= 0),
  creada_at timestamptz not null default now(),
  constraint alumno_con_grupo check (not es_alumno or grupo_id is not null or estado = 'baja')
);
create index personas_grupo_idx on academia.personas (grupo_id);
create index personas_invitada_por_idx on academia.personas (invitada_por);

create table academia.formador_grupos (
  formador_id uuid not null references academia.personas(id) on delete cascade,
  grupo_id uuid not null references academia.grupos(id) on delete cascade,
  primary key (formador_id, grupo_id)
);
create index formador_grupos_grupo_idx on academia.formador_grupos (grupo_id);

-- Preferencias de cada persona (modo claro u oscuro, recordatorio).
create table academia.preferencias (
  persona_id uuid primary key references academia.personas(id) on delete cascade,
  tema_visual text not null default 'auto' check (tema_visual in ('auto', 'oscuro', 'claro')),
  recordatorio boolean not null default true,
  avisos_formador boolean not null default true
);

-- Funciones de ayuda para las políticas. Leen «personas» saltándose sus
-- propias políticas (security definer), y siempre a partir de yo().
create or replace function academia.soy_dueno()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from academia.personas p where p.id = academia.yo() and p.es_dueno and p.estado <> 'baja') $$;

create or replace function academia.soy_formador()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from academia.personas p where p.id = academia.yo() and p.es_formador and p.estado <> 'baja') $$;

create or replace function academia.soy_personal()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from academia.personas p where p.id = academia.yo() and (p.es_formador or p.es_dueno) and p.estado <> 'baja') $$;

create or replace function academia.mis_grupos()
returns uuid[] language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(fg.grupo_id), '{}')
  from academia.formador_grupos fg
  join academia.personas p on p.id = fg.formador_id
  where fg.formador_id = academia.yo() and p.es_formador and p.estado <> 'baja'
$$;

create or replace function academia.mi_grupo()
returns uuid language sql stable security definer set search_path = ''
as $$ select p.grupo_id from academia.personas p where p.id = academia.yo() and p.es_alumno and p.estado <> 'baja' $$;

create or replace function academia.mi_oposicion()
returns uuid language sql stable security definer set search_path = ''
as $$
  select g.oposicion_id from academia.personas p join academia.grupos g on g.id = p.grupo_id
  where p.id = academia.yo() and p.es_alumno and p.estado <> 'baja'
$$;

-- Oposiciones que puede gestionar el personal: el dueño, todas; el
-- formador, las de sus grupos.
create or replace function academia.mis_oposiciones_gestion()
returns uuid[] language sql stable security definer set search_path = ''
as $$
  select case when academia.soy_dueno()
    then (select coalesce(array_agg(o.id), '{}') from academia.oposiciones o)
    else (select coalesce(array_agg(distinct g.oposicion_id), '{}') from academia.grupos g where g.id = any(academia.mis_grupos()))
  end
$$;

revoke execute on function academia.soy_dueno(), academia.soy_formador(), academia.soy_personal(),
  academia.mis_grupos(), academia.mi_grupo(), academia.mi_oposicion(), academia.mis_oposiciones_gestion() from public;
grant execute on function academia.soy_dueno(), academia.soy_formador(), academia.soy_personal(),
  academia.mis_grupos(), academia.mi_grupo(), academia.mi_oposicion(), academia.mis_oposiciones_gestion() to app_usuario, app_soporte;

-- ---------------------------------------------------------------------
--  Temario: temas, versiones, páginas y trozos para buscar
-- ---------------------------------------------------------------------

create table academia.temas (
  id uuid primary key default gen_random_uuid(),
  oposicion_id uuid not null references academia.oposiciones(id),
  numero int not null check (numero between 1 and 999),
  nombre text not null check (length(nombre) between 1 and 200),
  nombre_corto text check (length(nombre_corto) <= 60),
  version_actual_id uuid,
  creado_at timestamptz not null default now(),
  unique (oposicion_id, numero)
);

create table academia.tema_versiones (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null references academia.temas(id) on delete cascade,
  version int not null,
  archivo_nombre text not null,
  archivo_bytes int not null default 0,
  paginas int not null default 0,
  palabras int not null default 0,
  estado text not null default 'subiendo' check (estado in ('subiendo', 'procesando', 'lista', 'error', 'sustituida')),
  progreso int not null default 0 check (progreso between 0 and 100),
  paso text,
  error text,
  modelo_busqueda text,
  subida_por uuid references academia.personas(id) on delete set null,
  subida_por_nombre text,
  subida_at timestamptz not null default now(),
  lista_at timestamptz,
  unique (tema_id, version)
);
create index tema_versiones_tema_idx on academia.tema_versiones (tema_id);
create index tema_versiones_subida_por_idx on academia.tema_versiones (subida_por);
alter table academia.temas add constraint temas_version_actual_fk
  foreign key (version_actual_id) references academia.tema_versiones(id) on delete set null;
create index temas_version_actual_idx on academia.temas (version_actual_id);

-- El PDF original, en partes de hasta 3 MB (para no depender de otro servicio).
create table academia.archivos_pdf (
  version_id uuid not null references academia.tema_versiones(id) on delete cascade,
  parte int not null,
  datos bytea not null,
  primary key (version_id, parte)
);

-- El texto de cada página, tal como sale en el PDF, partido en párrafos.
create table academia.paginas (
  version_id uuid not null references academia.tema_versiones(id) on delete cascade,
  numero int not null,
  numero_impreso int,
  texto text not null default '',
  parrafos jsonb not null default '[]',
  es_indice boolean not null default false,
  primary key (version_id, numero)
);

-- Los trozos de unas 400 palabras, con su tema y su página: de aquí salen
-- las citas. La búsqueda usa las palabras exactas y el significado.
create table academia.trozos (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references academia.tema_versiones(id) on delete cascade,
  tema_id uuid not null references academia.temas(id) on delete cascade,
  pagina int not null,
  pagina_impresa int,
  orden int not null,
  parrafo_desde int not null,
  parrafo_hasta int not null,
  parrafos jsonb not null default '[]',
  articulos text[] not null default '{}',
  texto text not null,
  es_indice boolean not null default false,
  embedding extensions.vector(1024),
  fts tsvector generated always as (to_tsvector('spanish'::regconfig, academia.sin_acentos(texto))) stored
);
create index trozos_version_idx on academia.trozos (version_id);
create index trozos_tema_idx on academia.trozos (tema_id);
create index trozos_fts_idx on academia.trozos using gin (fts);
create index trozos_embedding_idx on academia.trozos using hnsw (embedding extensions.vector_cosine_ops);

-- Notas del formador: respuestas que el asistente también usa y cita.
create table academia.notas_formador (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null references academia.temas(id) on delete cascade,
  autor_id uuid references academia.personas(id) on delete set null,
  autor_nombre text not null,
  pregunta text not null default '',
  texto text not null check (length(texto) between 1 and 4000),
  creada_at timestamptz not null default now(),
  editada_at timestamptz,
  retirada_at timestamptz,
  embedding extensions.vector(1024),
  fts tsvector generated always as (to_tsvector('spanish'::regconfig, academia.sin_acentos(pregunta || ' ' || texto))) stored
);
create index notas_formador_tema_idx on academia.notas_formador (tema_id);
create index notas_formador_autor_idx on academia.notas_formador (autor_id);
create index notas_formador_fts_idx on academia.notas_formador using gin (fts);

-- ---------------------------------------------------------------------
--  El alumno: perfil, memoria, conversaciones
-- ---------------------------------------------------------------------

create table academia.perfiles (
  alumno_id uuid primary key references academia.personas(id) on delete cascade,
  privacidad_aceptada_at timestamptz,
  edad_confirmada boolean not null default false,
  como_llamar text check (length(como_llamar) <= 60),
  oposicion_confirmada boolean not null default false,
  repite boolean,
  horas_dia text check (horas_dia in ('menos-2', '2-4', '4-6', 'mas-6')),
  dificultad text check (dificultad in ('arrancar', 'memorizar', 'entender', 'nervios')),
  completado_at timestamptz,
  bienvenida_enviada_at timestamptz
);

create table academia.memoria_notas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references academia.personas(id) on delete cascade,
  tipo text not null check (tipo in ('cuesta', 'domina', 'fallo_test', 'preferencia')),
  texto text not null check (length(texto) between 1 and 400),
  origen text not null default 'chat' check (origen in ('chat', 'test', 'alumno')),
  asunto text check (length(asunto) <= 120),
  tema_id uuid references academia.temas(id) on delete set null,
  creada_at timestamptz not null default now(),
  actualizada_at timestamptz not null default now()
);
create index memoria_notas_alumno_idx on academia.memoria_notas (alumno_id);
create index memoria_notas_tema_idx on academia.memoria_notas (tema_id);

create table academia.conversaciones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references academia.personas(id) on delete cascade,
  titulo text not null default 'Nueva conversación',
  titulo_manual boolean not null default false,
  modo text not null default 'resolver' check (modo in ('resolver', 'guiado', 'examinador')),
  creada_at timestamptz not null default now(),
  actualizada_at timestamptz not null default now(),
  memoria_procesada_at timestamptz
);
create index conversaciones_alumno_idx on academia.conversaciones (alumno_id, actualizada_at desc);

create table academia.mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references academia.conversaciones(id) on delete cascade,
  alumno_id uuid not null references academia.personas(id) on delete cascade,
  rol text not null check (rol in ('alumno', 'asistente', 'formador')),
  texto text not null default '',
  citas jsonb not null default '[]',
  estado text not null default 'ok' check (estado in ('ok', 'cortado', 'error', 'no_esta', 'escribiendo')),
  modo text check (modo in ('resolver', 'guiado', 'examinador')),
  valoracion text check (valoracion in ('sirvio', 'no_sirvio')),
  error_avisado_at timestamptz,
  enviada_formador_at timestamptz,
  rechazada_formador_at timestamptz,
  autor_nombre text,
  nota_id uuid references academia.notas_formador(id) on delete set null,
  meta jsonb not null default '{}',
  creado_at timestamptz not null default now()
);
create index mensajes_conversacion_idx on academia.mensajes (conversacion_id, creado_at);
create index mensajes_alumno_idx on academia.mensajes (alumno_id, creado_at);
create index mensajes_nota_idx on academia.mensajes (nota_id);
create index mensajes_texto_trgm_idx on academia.mensajes using gin (academia.sin_acentos(lower(texto)) extensions.gin_trgm_ops);

-- La bandeja de dudas del formador. El formador NUNCA ve de qué alumno es:
-- la columna alumno_id no se puede leer (ver los permisos más abajo).
create table academia.dudas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('sin_respuesta', 'error', 'no_sirvio')),
  alumno_id uuid references academia.personas(id) on delete set null,
  grupo_id uuid not null references academia.grupos(id),
  tema_id uuid references academia.temas(id) on delete set null,
  conversacion_id uuid references academia.conversaciones(id) on delete cascade,
  mensaje_id uuid references academia.mensajes(id) on delete cascade,
  pregunta text not null,
  respuesta_asistente text not null default '',
  comentario text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'contestada', 'resuelta')),
  respuesta text,
  contestada_por uuid references academia.personas(id) on delete set null,
  contestada_por_nombre text,
  contestada_at timestamptz,
  nota_id uuid references academia.notas_formador(id) on delete set null,
  creada_at timestamptz not null default now()
);
create index dudas_grupo_idx on academia.dudas (grupo_id, estado, creada_at desc);
create index dudas_alumno_idx on academia.dudas (alumno_id);
create index dudas_tema_idx on academia.dudas (tema_id);
create index dudas_conversacion_idx on academia.dudas (conversacion_id);
create index dudas_mensaje_idx on academia.dudas (mensaje_id);
create index dudas_contestada_por_idx on academia.dudas (contestada_por);
create index dudas_nota_idx on academia.dudas (nota_id);

-- ---------------------------------------------------------------------
--  Material, biblioteca, tests y repaso
-- ---------------------------------------------------------------------

create table academia.carpetas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references academia.personas(id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 80),
  creada_at timestamptz not null default now()
);
create index carpetas_alumno_idx on academia.carpetas (alumno_id);

create table academia.materiales (
  id uuid primary key default gen_random_uuid(),
  propietario_id uuid not null references academia.personas(id) on delete cascade,
  es_de_formador boolean not null default false,
  formato text not null check (formato in ('resumen', 'esquema', 'presentacion', 'tarjetas', 'test', 'simulacro')),
  estilo text,
  titulo text not null default '',
  tema_ids uuid[] not null,
  version_ids uuid[] not null default '{}',
  opciones jsonb not null default '{}',
  contenido jsonb,
  estado text not null default 'creando' check (estado in ('creando', 'listo', 'error')),
  progreso int not null default 0,
  paso text,
  error text,
  carpeta_id uuid references academia.carpetas(id) on delete set null,
  valoracion text check (valoracion in ('sirvio', 'no_sirvio')),
  intentos int not null default 0,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);
create index materiales_propietario_idx on academia.materiales (propietario_id, creado_at desc);
create index materiales_carpeta_idx on academia.materiales (carpeta_id);

create table academia.material_compartido (
  material_id uuid not null references academia.materiales(id) on delete cascade,
  grupo_id uuid not null references academia.grupos(id) on delete cascade,
  compartido_por uuid references academia.personas(id) on delete set null,
  compartido_at timestamptz not null default now(),
  primary key (material_id, grupo_id)
);
create index material_compartido_grupo_idx on academia.material_compartido (grupo_id);
create index material_compartido_por_idx on academia.material_compartido (compartido_por);

create table academia.tarjetas_repaso (
  alumno_id uuid not null references academia.personas(id) on delete cascade,
  material_id uuid not null references academia.materiales(id) on delete cascade,
  indice int not null,
  proxima date not null,
  intervalo int not null default 0,
  facilidad numeric(4,2) not null default 2.5,
  repeticiones int not null default 0,
  ultima_respuesta text check (ultima_respuesta in ('la_sabia', 'no_la_sabia')),
  ultima_at timestamptz,
  primary key (alumno_id, material_id, indice)
);
create index tarjetas_repaso_material_idx on academia.tarjetas_repaso (material_id);
create index tarjetas_repaso_proxima_idx on academia.tarjetas_repaso (alumno_id, proxima);

create table academia.intentos_test (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references academia.personas(id) on delete cascade,
  material_id uuid not null references academia.materiales(id) on delete cascade,
  modo text not null check (modo in ('practica', 'simulacro', 'repaso')),
  preguntas int[] not null,
  respuestas jsonb not null default '{}',
  aciertos int,
  fallos int,
  en_blanco int,
  nota numeric(5,2),
  nota_sin_penalizacion numeric(5,2),
  resta_por_fallo numeric(6,4) not null default 0,
  segundos_limite int,
  empezado_at timestamptz not null default now(),
  terminado_at timestamptz
);
create index intentos_test_alumno_idx on academia.intentos_test (alumno_id, empezado_at desc);
create index intentos_test_material_idx on academia.intentos_test (material_id);

create table academia.preguntas_falladas (
  alumno_id uuid not null references academia.personas(id) on delete cascade,
  material_id uuid not null references academia.materiales(id) on delete cascade,
  indice int not null,
  fallada_at timestamptz not null default now(),
  proxima date not null,
  resuelta_at timestamptz,
  primary key (alumno_id, material_id, indice)
);
create index preguntas_falladas_material_idx on academia.preguntas_falladas (material_id);

-- ---------------------------------------------------------------------
--  Uso, consumo y actividad
-- ---------------------------------------------------------------------

create table academia.uso (
  id bigint generated always as identity primary key,
  persona_id uuid references academia.personas(id) on delete set null,
  grupo_id uuid references academia.grupos(id) on delete set null,
  tipo text not null check (tipo in ('pregunta', 'material', 'interno')),
  subtipo text,
  creado_at timestamptz not null default now(),
  fecha date not null default academia.hoy_madrid(),
  mes text not null default academia.mes_madrid(),
  modelo text,
  tokens_entrada int not null default 0,
  tokens_salida int not null default 0,
  tokens_cache int not null default 0,
  coste_usd numeric(12,6) not null default 0,
  ms_primera_letra int
);
create index uso_persona_fecha_idx on academia.uso (persona_id, fecha);
create index uso_mes_idx on academia.uso (mes, tipo);
create index uso_grupo_idx on academia.uso (grupo_id);

create table academia.actividad (
  persona_id uuid not null references academia.personas(id) on delete cascade,
  fecha date not null,
  primary key (persona_id, fecha)
);

create table academia.accesos (
  id bigint generated always as identity primary key,
  persona_id uuid references academia.personas(id) on delete cascade,
  at timestamptz not null default now(),
  ip text,
  ciudad text,
  pais text,
  agente text
);
create index accesos_persona_idx on academia.accesos (persona_id, at desc);

-- ---------------------------------------------------------------------
--  Entrar: enlaces y sesiones (solo el servidor)
-- ---------------------------------------------------------------------

create table academia.enlaces_entrada (
  token_hash text primary key,
  persona_id uuid not null references academia.personas(id) on delete cascade,
  creado_at timestamptz not null default now(),
  expira_at timestamptz not null,
  usado_at timestamptz,
  ip text
);
create index enlaces_entrada_persona_idx on academia.enlaces_entrada (persona_id, creado_at desc);

create table academia.sesiones (
  id_hash text primary key,
  persona_id uuid not null references academia.personas(id) on delete cascade,
  creada_at timestamptz not null default now(),
  ultima_at timestamptz not null default now(),
  expira_at timestamptz not null,
  ip text,
  ciudad text,
  agente text,
  soporte_entrada_id uuid,
  cerrada_at timestamptz
);
create index sesiones_persona_idx on academia.sesiones (persona_id);

create table academia.limites_peticiones (
  clave text not null,
  ventana timestamptz not null,
  cuenta int not null default 0,
  primary key (clave, ventana)
);

-- ---------------------------------------------------------------------
--  Registro, soporte y sistema (solo el servidor)
-- ---------------------------------------------------------------------

create table academia.correos_enviados (
  id bigint generated always as identity primary key,
  persona_id uuid references academia.personas(id) on delete set null,
  destinatario text not null,
  tipo text not null,
  asunto text not null,
  enviado_at timestamptz not null default now(),
  ok boolean not null default true,
  error text,
  proveedor_id text
);
create index correos_enviados_persona_idx on academia.correos_enviados (persona_id);
create index correos_enviados_fecha_idx on academia.correos_enviados (enviado_at desc);

-- Buzón de pruebas: solo se usa en la dirección de pruebas.
create table academia.buzon_pruebas (
  id bigint generated always as identity primary key,
  para text not null,
  de text not null,
  asunto text not null,
  html text not null,
  texto text not null,
  creado_at timestamptz not null default now()
);

create table academia.soporte_entradas (
  id uuid primary key default gen_random_uuid(),
  tecnico_correo text not null,
  empezada_at timestamptz not null default now(),
  terminada_at timestamptz,
  pantallas text[] not null default '{}'
);

create table academia.solicitudes_ayuda (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references academia.personas(id) on delete set null,
  nombre text not null,
  correo text not null,
  papel text not null,
  pagina text,
  mensaje text not null check (length(mensaje) between 1 and 5000),
  creada_at timestamptz not null default now()
);
create index solicitudes_ayuda_persona_idx on academia.solicitudes_ayuda (persona_id);

create table academia.errores (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  tipo text not null,
  detalle text,
  persona_id uuid references academia.personas(id) on delete set null
);
create index errores_at_idx on academia.errores (at desc);
create index errores_persona_idx on academia.errores (persona_id);

create table academia.avisos_enviados (
  clave text primary key,
  enviado_at timestamptz not null default now()
);

create table academia.ajustes (
  clave text primary key,
  valor jsonb not null,
  cambiado_at timestamptz not null default now()
);

create table academia.resumenes_ia (
  clave text primary key,
  contenido jsonb not null,
  generado_at timestamptz not null default now()
);

-- =====================================================================
--  PERMISOS Y POLÍTICAS
-- =====================================================================

alter table academia.oposiciones enable row level security;
alter table academia.grupos enable row level security;
alter table academia.personas enable row level security;
alter table academia.formador_grupos enable row level security;
alter table academia.preferencias enable row level security;
alter table academia.temas enable row level security;
alter table academia.tema_versiones enable row level security;
alter table academia.archivos_pdf enable row level security;
alter table academia.paginas enable row level security;
alter table academia.trozos enable row level security;
alter table academia.notas_formador enable row level security;
alter table academia.perfiles enable row level security;
alter table academia.memoria_notas enable row level security;
alter table academia.conversaciones enable row level security;
alter table academia.mensajes enable row level security;
alter table academia.dudas enable row level security;
alter table academia.carpetas enable row level security;
alter table academia.materiales enable row level security;
alter table academia.material_compartido enable row level security;
alter table academia.tarjetas_repaso enable row level security;
alter table academia.intentos_test enable row level security;
alter table academia.preguntas_falladas enable row level security;
alter table academia.uso enable row level security;
alter table academia.actividad enable row level security;
alter table academia.accesos enable row level security;
alter table academia.enlaces_entrada enable row level security;
alter table academia.sesiones enable row level security;
alter table academia.limites_peticiones enable row level security;
alter table academia.correos_enviados enable row level security;
alter table academia.buzon_pruebas enable row level security;
alter table academia.soporte_entradas enable row level security;
alter table academia.solicitudes_ayuda enable row level security;
alter table academia.errores enable row level security;
alter table academia.avisos_enviados enable row level security;
alter table academia.ajustes enable row level security;
alter table academia.resumenes_ia enable row level security;
-- Las tablas sin ninguna política ni permiso (enlaces, sesiones, registro...)
-- solo las puede tocar el servidor.

-- Oposiciones: las ve cualquiera de la academia; la regla del simulacro la
-- cambia el dueño.
grant select on academia.oposiciones to app_usuario, app_soporte;
grant update (resta_por_fallo, segundos_por_pregunta) on academia.oposiciones to app_usuario;
create policy oposiciones_ver on academia.oposiciones for select to app_usuario, app_soporte
  using ((select academia.yo()) is not null);
create policy oposiciones_cambiar on academia.oposiciones for update to app_usuario
  using ((select academia.soy_dueno())) with check ((select academia.soy_dueno()));

-- Grupos
grant select on academia.grupos to app_usuario, app_soporte;
grant insert (oposicion_id, nombre), update (nombre, archivado) on academia.grupos to app_usuario;
create policy grupos_ver on academia.grupos for select to app_usuario, app_soporte
  using ((select academia.soy_dueno()) or id = any((select academia.mis_grupos())::uuid[]) or id = (select academia.mi_grupo()));
create policy grupos_crear on academia.grupos for insert to app_usuario
  with check ((select academia.soy_dueno()));
create policy grupos_cambiar on academia.grupos for update to app_usuario
  using ((select academia.soy_dueno())) with check ((select academia.soy_dueno()));

-- Personas
grant select on academia.personas to app_usuario, app_soporte;
grant insert (nombre, correo, es_alumno, es_formador, grupo_id, estado, invitada_at, invitada_por) on academia.personas to app_usuario;
grant update (nombre, grupo_id, estado, baja_at, borrar_desde, invitada_at, es_formador) on academia.personas to app_usuario;
create policy personas_ver on academia.personas for select to app_usuario, app_soporte
  using (
    id = (select academia.yo())
    or (select academia.soy_dueno())
    or (es_alumno and grupo_id = any((select academia.mis_grupos())::uuid[]))
  );
-- Invitar: el formador, alumnos a sus grupos; el dueño, alumnos y formadores.
create policy personas_invitar on academia.personas for insert to app_usuario
  with check (
    not es_dueno and (
      (select academia.soy_dueno())
      or (es_alumno and not es_formador and grupo_id = any((select academia.mis_grupos())::uuid[]))
    )
  );
-- Cambiar de grupo, reenviar, dar de baja: sobre alumnos de sus grupos y
-- solo hacia sus grupos. El dueño, sobre todos menos él mismo.
create policy personas_gestionar on academia.personas for update to app_usuario
  using (
    ((select academia.soy_dueno()) and id <> (select academia.yo()))
    or (es_alumno and grupo_id = any((select academia.mis_grupos())::uuid[]))
    or (id = (select academia.yo()) and (select academia.soy_dueno()))
  )
  with check (
    (select academia.soy_dueno())
    or (es_alumno and not es_formador and grupo_id = any((select academia.mis_grupos())::uuid[]))
  );

-- Formador ↔ grupos: lo decide el dueño.
grant select on academia.formador_grupos to app_usuario, app_soporte;
grant insert, delete on academia.formador_grupos to app_usuario;
create policy formador_grupos_ver on academia.formador_grupos for select to app_usuario, app_soporte
  using ((select academia.soy_dueno()) or formador_id = (select academia.yo()));
create policy formador_grupos_crear on academia.formador_grupos for insert to app_usuario
  with check ((select academia.soy_dueno()));
create policy formador_grupos_quitar on academia.formador_grupos for delete to app_usuario
  using ((select academia.soy_dueno()));

-- Preferencias: cada uno las suyas.
grant select, insert, update on academia.preferencias to app_usuario;
grant select on academia.preferencias to app_soporte;
create policy preferencias_propias on academia.preferencias for all to app_usuario
  using (persona_id = (select academia.yo())) with check (persona_id = (select academia.yo()));
create policy preferencias_soporte on academia.preferencias for select to app_soporte
  using (persona_id = (select academia.yo()));

-- Temas y versiones: el personal, las oposiciones que gestiona; el alumno,
-- solo los de su oposición.
grant select on academia.temas, academia.tema_versiones to app_usuario, app_soporte;
grant insert, update on academia.temas to app_usuario;
grant insert, update on academia.tema_versiones to app_usuario;
create policy temas_ver on academia.temas for select to app_usuario, app_soporte
  using (oposicion_id = any((select academia.mis_oposiciones_gestion())::uuid[]) or oposicion_id = (select academia.mi_oposicion()));
create policy temas_gestionar on academia.temas for insert to app_usuario
  with check (oposicion_id = any((select academia.mis_oposiciones_gestion())::uuid[]));
create policy temas_cambiar on academia.temas for update to app_usuario
  using (oposicion_id = any((select academia.mis_oposiciones_gestion())::uuid[]))
  with check (oposicion_id = any((select academia.mis_oposiciones_gestion())::uuid[]));

create or replace function academia.tema_visible(p_tema uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from academia.temas t where t.id = p_tema and (
      t.oposicion_id = any(academia.mis_oposiciones_gestion()) or t.oposicion_id = academia.mi_oposicion()
    )
  )
$$;
create or replace function academia.tema_gestionable(p_tema uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from academia.temas t where t.id = p_tema and t.oposicion_id = any(academia.mis_oposiciones_gestion())) $$;
revoke execute on function academia.tema_visible(uuid), academia.tema_gestionable(uuid) from public;
grant execute on function academia.tema_visible(uuid), academia.tema_gestionable(uuid) to app_usuario, app_soporte;

create policy versiones_ver on academia.tema_versiones for select to app_usuario, app_soporte
  using ((select academia.tema_visible(tema_id)));
create policy versiones_subir on academia.tema_versiones for insert to app_usuario
  with check ((select academia.tema_gestionable(tema_id)));
create policy versiones_cambiar on academia.tema_versiones for update to app_usuario
  using ((select academia.tema_gestionable(tema_id))) with check ((select academia.tema_gestionable(tema_id)));

create or replace function academia.version_gestionable(p_version uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from academia.tema_versiones v join academia.temas t on t.id = v.tema_id
    where v.id = p_version and t.oposicion_id = any(academia.mis_oposiciones_gestion()))
$$;
create or replace function academia.version_visible(p_version uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from academia.tema_versiones v join academia.temas t on t.id = v.tema_id
    where v.id = p_version and (t.oposicion_id = any(academia.mis_oposiciones_gestion()) or t.oposicion_id = academia.mi_oposicion()))
$$;
revoke execute on function academia.version_gestionable(uuid), academia.version_visible(uuid) from public;
grant execute on function academia.version_gestionable(uuid), academia.version_visible(uuid) to app_usuario, app_soporte;

-- El PDF original: solo el personal.
grant select, insert, delete on academia.archivos_pdf to app_usuario;
create policy archivos_personal on academia.archivos_pdf for all to app_usuario
  using ((select academia.version_gestionable(version_id))) with check ((select academia.version_gestionable(version_id)));

-- Páginas: el alumno las ve de una en una en el visor (el límite por hora
-- lo pone el servidor), solo de su oposición.
grant select, insert, delete on academia.paginas to app_usuario;
grant select on academia.paginas to app_soporte;
create policy paginas_ver on academia.paginas for select to app_usuario, app_soporte
  using ((select academia.version_visible(version_id)));
create policy paginas_escribir on academia.paginas for insert to app_usuario
  with check ((select academia.version_gestionable(version_id)));
create policy paginas_borrar on academia.paginas for delete to app_usuario
  using ((select academia.version_gestionable(version_id)));

-- Trozos: nadie los lee directamente; los usa el buscador. El personal los
-- escribe al procesar el temario.
grant insert, update, delete on academia.trozos to app_usuario;
grant select (id, version_id) on academia.trozos to app_usuario;
create policy trozos_escribir on academia.trozos for insert to app_usuario
  with check ((select academia.version_gestionable(version_id)));
create policy trozos_cambiar on academia.trozos for update to app_usuario
  using ((select academia.version_gestionable(version_id))) with check ((select academia.version_gestionable(version_id)));
create policy trozos_borrar on academia.trozos for delete to app_usuario
  using ((select academia.version_gestionable(version_id)));
create policy trozos_ver_personal on academia.trozos for select to app_usuario
  using ((select academia.version_gestionable(version_id)));

-- Notas del formador: las ve y gestiona el personal. El asistente las usa a
-- través del buscador.
grant select, insert, update on academia.notas_formador to app_usuario;
grant select on academia.notas_formador to app_soporte;
create policy notas_ver on academia.notas_formador for select to app_usuario, app_soporte
  using ((select academia.tema_gestionable(tema_id)));
create policy notas_crear on academia.notas_formador for insert to app_usuario
  with check ((select academia.soy_formador()) and (select academia.tema_gestionable(tema_id)) and autor_id = (select academia.yo()));
create policy notas_cambiar on academia.notas_formador for update to app_usuario
  using ((select academia.soy_formador()) and (select academia.tema_gestionable(tema_id)))
  with check ((select academia.tema_gestionable(tema_id)));

-- Lo privado del alumno: solo él. Ni el formador, ni el dueño, ni nosotros.
grant select, insert, update, delete on academia.perfiles, academia.memoria_notas, academia.conversaciones,
  academia.mensajes, academia.carpetas, academia.tarjetas_repaso, academia.intentos_test,
  academia.preguntas_falladas to app_usuario;

create policy perfiles_propios on academia.perfiles for all to app_usuario
  using (alumno_id = (select academia.yo())) with check (alumno_id = (select academia.yo()));
create policy memoria_propia on academia.memoria_notas for all to app_usuario
  using (alumno_id = (select academia.yo())) with check (alumno_id = (select academia.yo()));
create policy conversaciones_propias on academia.conversaciones for all to app_usuario
  using (alumno_id = (select academia.yo())) with check (alumno_id = (select academia.yo()));
create policy mensajes_propios on academia.mensajes for all to app_usuario
  using (alumno_id = (select academia.yo()))
  with check (alumno_id = (select academia.yo()) and rol <> 'formador');
create policy carpetas_propias on academia.carpetas for all to app_usuario
  using (alumno_id = (select academia.yo())) with check (alumno_id = (select academia.yo()));
create policy tarjetas_propias on academia.tarjetas_repaso for all to app_usuario
  using (alumno_id = (select academia.yo())) with check (alumno_id = (select academia.yo()));
create policy intentos_propios on academia.intentos_test for all to app_usuario
  using (alumno_id = (select academia.yo())) with check (alumno_id = (select academia.yo()));
create policy falladas_propias on academia.preguntas_falladas for all to app_usuario
  using (alumno_id = (select academia.yo())) with check (alumno_id = (select academia.yo()));

-- Dudas: el alumno las crea (sin poder leerlas después); el formador de su
-- grupo las lee SIN la columna del alumno.
grant insert (tipo, alumno_id, grupo_id, tema_id, conversacion_id, mensaje_id, pregunta, respuesta_asistente, comentario)
  on academia.dudas to app_usuario;
grant select (id, tipo, grupo_id, tema_id, pregunta, respuesta_asistente, comentario, estado, respuesta,
  contestada_por, contestada_por_nombre, contestada_at, nota_id, creada_at) on academia.dudas to app_usuario, app_soporte;
grant update (estado, respuesta, contestada_por, contestada_por_nombre, contestada_at, nota_id, tema_id) on academia.dudas to app_usuario;
create policy dudas_enviar on academia.dudas for insert to app_usuario
  with check (alumno_id = (select academia.yo()) and grupo_id = (select academia.mi_grupo()));
create policy dudas_ver on academia.dudas for select to app_usuario, app_soporte
  using (grupo_id = any((select academia.mis_grupos())::uuid[]));
create policy dudas_contestar on academia.dudas for update to app_usuario
  using (grupo_id = any((select academia.mis_grupos())::uuid[])) with check (grupo_id = any((select academia.mis_grupos())::uuid[]));

-- Material: el propio; el compartido con su grupo; el personal ve el
-- material para clase de la academia.
grant select, insert, update, delete on academia.materiales to app_usuario;
grant select on academia.materiales to app_soporte;
create or replace function academia.material_compartido_conmigo(p_material uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from academia.material_compartido mc where mc.material_id = p_material and mc.grupo_id = academia.mi_grupo())
$$;
revoke execute on function academia.material_compartido_conmigo(uuid) from public;
grant execute on function academia.material_compartido_conmigo(uuid) to app_usuario, app_soporte;
create policy materiales_ver on academia.materiales for select to app_usuario
  using (
    propietario_id = (select academia.yo())
    or (select academia.material_compartido_conmigo(id))
    or (es_de_formador and (select academia.soy_personal()))
  );
create policy materiales_ver_soporte on academia.materiales for select to app_soporte
  using (es_de_formador);
create policy materiales_crear on academia.materiales for insert to app_usuario
  with check (propietario_id = (select academia.yo()) and (not es_de_formador or (select academia.soy_personal())));
create policy materiales_cambiar on academia.materiales for update to app_usuario
  using (propietario_id = (select academia.yo())) with check (propietario_id = (select academia.yo()));
create policy materiales_borrar on academia.materiales for delete to app_usuario
  using (propietario_id = (select academia.yo()));

grant select, insert, delete on academia.material_compartido to app_usuario;
grant select on academia.material_compartido to app_soporte;
create policy compartido_ver on academia.material_compartido for select to app_usuario, app_soporte
  using (grupo_id = (select academia.mi_grupo()) or grupo_id = any((select academia.mis_grupos())::uuid[]) or (select academia.soy_dueno()));
create or replace function academia.material_mio(p_material uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from academia.materiales m where m.id = p_material and m.propietario_id = academia.yo() and m.es_de_formador) $$;
revoke execute on function academia.material_mio(uuid) from public;
grant execute on function academia.material_mio(uuid) to app_usuario;
create policy compartido_crear on academia.material_compartido for insert to app_usuario
  with check ((select academia.material_mio(material_id)) and grupo_id = any((select academia.mis_grupos())::uuid[]));
create policy compartido_quitar on academia.material_compartido for delete to app_usuario
  using ((select academia.material_mio(material_id)));

-- Uso: cada uno ve el suyo (su contador). Los totales, por las funciones.
grant select, insert on academia.uso to app_usuario;
grant update (persona_id) on academia.uso to app_usuario;
create policy uso_propio on academia.uso for select to app_usuario using (persona_id = (select academia.yo()));
create policy uso_apuntar on academia.uso for insert to app_usuario with check (persona_id = (select academia.yo()));
create policy uso_anonimizar on academia.uso for update to app_usuario
  using (persona_id = (select academia.yo())) with check (persona_id is null);

-- Actividad: la propia (para la racha). Los datos sumados, por funciones.
grant select, insert, delete on academia.actividad to app_usuario;
create policy actividad_propia on academia.actividad for all to app_usuario
  using (persona_id = (select academia.yo())) with check (persona_id = (select academia.yo()));

-- Registro de entradas en modo soporte: lo ve el dueño.
grant select on academia.soporte_entradas to app_usuario, app_soporte;
create policy soporte_ver_dueno on academia.soporte_entradas for select to app_usuario, app_soporte
  using ((select academia.soy_dueno()));

-- Ayuda: el personal escribe.
grant insert (persona_id, nombre, correo, papel, pagina, mensaje) on academia.solicitudes_ayuda to app_usuario;
create policy ayuda_escribir on academia.solicitudes_ayuda for insert to app_usuario
  with check (persona_id = (select academia.yo()) and (select academia.soy_personal()));
