import "server-only";
import postgres from "postgres";

// La conexión con la base de datos. Solo existe en el servidor.
//
// Toda petición de una persona pasa por comoPersona(): abre una transacción,
// apunta quién es (app.persona_id) y baja al papel «app_usuario» (o
// «app_soporte», que solo puede leer). A partir de ahí, las políticas de la
// base de datos deciden qué filas ve. comoSistema() es para lo que hace el
// propio servidor (entrar con el enlace, tareas programadas...).

type Sql = postgres.Sql<Record<string, never>>;
export type Tx = postgres.TransactionSql<Record<string, never>>;

declare global {
  var __bdTutor: Sql | undefined;
}

function crear(): Sql {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL: la dirección de la base de datos no está en los secretos.");
  }
  return postgres(url, {
    prepare: false, // el repartidor de conexiones de Supabase no admite consultas preparadas
    max: Number(process.env.BD_CONEXIONES || 8),
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
    transform: postgres.camel,
    types: {
      // Las fechas sin hora («date») se devuelven como texto AAAA-MM-DD.
      fecha: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    } as never,
  }) as unknown as Sql;
}

export function bd(): Sql {
  if (!globalThis.__bdTutor) globalThis.__bdTutor = crear();
  return globalThis.__bdTutor;
}

const RUTA = "academia, extensions, public";

/** Ejecuta fn como la persona indicada, con las políticas de la base de datos. */
export async function comoPersona<T>(
  personaId: string,
  fn: (tx: Tx) => Promise<T>,
  opciones: { soloLectura?: boolean } = {},
): Promise<T> {
  return (await bd().begin(async (tx) => {
    await tx`select set_config('app.persona_id', ${personaId}, true), set_config('search_path', ${RUTA}, true)`;
    await tx.unsafe(opciones.soloLectura ? "set local role app_soporte" : "set local role app_usuario");
    return fn(tx);
  })) as T;
}

/** Ejecuta fn con permisos del servidor (sin políticas). Usar con cuidado. */
export async function comoSistema<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await bd().begin(async (tx) => {
    await tx`select set_config('search_path', ${RUTA}, true)`;
    return fn(tx);
  })) as T;
}
