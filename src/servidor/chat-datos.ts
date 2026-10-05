import "server-only";
import { config } from "@/configuracion";
import type { Tx } from "./bd";
import { estadoPreguntas } from "./limites";
import { oposicionDe, perfilDe } from "./alumno";
import type { Cita, MensajeVista, Modo } from "@/tipos/chat";

// Lo que necesita la pantalla del chat al abrirse.
export async function datosChat(tx: Tx, alumnoId: string) {
  const [perfil, op, lim] = await Promise.all([perfilDe(tx, alumnoId), oposicionDe(tx, alumnoId), estadoPreguntas(tx, alumnoId)]);
  const configOp = config.oposiciones.find((o) => o.clave === op?.clave);
  const sug = await tx`
    select asunto from memoria_notas where alumno_id = ${alumnoId} and tipo in ('cuesta', 'fallo_test') and asunto is not null
    order by actualizada_at desc limit 1`;
  return {
    nombre: perfil?.comoLlamar ?? null,
    oposicion: op?.nombre ?? "",
    ejemplos: configOp?.preguntasDeEjemplo ?? [],
    quedan: lim.quedan,
    limite: lim.bloqueo,
    sugerencia: sug[0] ? { asunto: sug[0].asunto as string } : null,
  };
}

export function aMensajeVista(m: Record<string, unknown>): MensajeVista {
  return {
    id: m.id as string,
    rol: m.rol as MensajeVista["rol"],
    texto: (m.texto as string) ?? "",
    citas: (m.citas as Cita[]) ?? [],
    estado: m.estado as MensajeVista["estado"],
    modo: (m.modo as Modo) ?? null,
    valoracion: (m.valoracion as MensajeVista["valoracion"]) ?? null,
    errorAvisado: !!m.errorAvisadoAt,
    enviadaFormador: !!m.enviadaFormadorAt,
    rechazadaFormador: !!m.rechazadaFormadorAt,
    autorNombre: (m.autorNombre as string) ?? null,
    creadoAt: new Date(m.creadoAt as string).toISOString(),
  };
}
