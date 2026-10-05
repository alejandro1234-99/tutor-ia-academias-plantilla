"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { oposicionDe } from "@/servidor/alumno";
import type { Tx } from "@/servidor/bd";
import type { Cita } from "@/tipos/chat";

// Lo que hace el alumno sobre una respuesta: valorarla, avisar de un error
// o pasar al formador lo que no estaba en el temario. Al formador le llega
// la pregunta y la respuesta, NUNCA el nombre del alumno.

async function datosMensaje(tx: Tx, mensajeId: string) {
  const m = await tx`
    select m.id, m.conversacion_id, m.texto, m.citas, m.estado,
           (select a.texto from mensajes a where a.conversacion_id = m.conversacion_id and a.rol = 'alumno' and a.creado_at < m.creado_at
            order by a.creado_at desc limit 1) as pregunta
    from mensajes m where m.id = ${mensajeId} and m.rol = 'asistente'`;
  return m[0] as { id: string; conversacionId: string; texto: string; citas: Cita[]; estado: string; pregunta: string | null } | undefined;
}

async function crearDuda(
  tx: Tx,
  alumnoId: string,
  tipo: "sin_respuesta" | "error" | "no_sirvio",
  m: NonNullable<Awaited<ReturnType<typeof datosMensaje>>>,
  comentario: string | null,
) {
  const op = await oposicionDe(tx, alumnoId);
  if (!op) return;
  const temaId = m.citas.find((c) => c.temaId)?.temaId ?? null;
  // Sin «returning»: el alumno no puede leer la bandeja, solo enviar.
  await tx`
    insert into dudas (tipo, alumno_id, grupo_id, tema_id, conversacion_id, mensaje_id, pregunta, respuesta_asistente, comentario)
    values (${tipo}, ${alumnoId}, ${op.grupoId}, ${temaId}, ${m.conversacionId}, ${m.id}, ${m.pregunta ?? ""}, ${m.texto}, ${comentario})`;
}

export async function valorarRespuesta(mensajeId: string, valoracion: "sirvio" | "no_sirvio" | null): Promise<{ ok: boolean }> {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  return conSesion(s, async (tx) => {
    const m = await datosMensaje(tx, mensajeId);
    if (!m) return { ok: false };
    const antes = await tx`select valoracion from mensajes where id = ${mensajeId}`;
    await tx`update mensajes set valoracion = ${valoracion} where id = ${mensajeId}`;
    if (valoracion === "no_sirvio" && antes[0]?.valoracion !== "no_sirvio") {
      await crearDuda(tx, s.persona.id, "no_sirvio", m, null);
    }
    return { ok: true };
  });
}

export async function avisarError(mensajeId: string, comentario: string): Promise<{ ok: boolean }> {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  return conSesion(s, async (tx) => {
    const m = await datosMensaje(tx, mensajeId);
    if (!m) return { ok: false };
    const ya = await tx`select error_avisado_at from mensajes where id = ${mensajeId}`;
    if (ya[0]?.errorAvisadoAt) return { ok: true };
    await tx`update mensajes set error_avisado_at = now() where id = ${mensajeId}`;
    await crearDuda(tx, s.persona.id, "error", m, comentario.trim().slice(0, 1000) || null);
    return { ok: true };
  });
}

export async function pasarAlFormador(mensajeId: string, si: boolean): Promise<{ ok: boolean }> {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  return conSesion(s, async (tx) => {
    const m = await datosMensaje(tx, mensajeId);
    if (!m || m.estado !== "no_esta") return { ok: false };
    const ya = await tx`select enviada_formador_at, rechazada_formador_at from mensajes where id = ${mensajeId}`;
    if (ya[0]?.enviadaFormadorAt || ya[0]?.rechazadaFormadorAt) return { ok: true };
    if (si) {
      await tx`update mensajes set enviada_formador_at = now() where id = ${mensajeId}`;
      await crearDuda(tx, s.persona.id, "sin_respuesta", m, null);
    } else {
      await tx`update mensajes set rechazada_formador_at = now() where id = ${mensajeId}`;
    }
    return { ok: true };
  });
}

export async function renombrarConversacion(id: string, titulo: string): Promise<{ ok: boolean }> {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  const limpio = titulo.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!limpio) return { ok: false };
  await conSesion(s, (tx) => tx`update conversaciones set titulo = ${limpio}, titulo_manual = true where id = ${id}`);
  revalidatePath("/estudio/conversaciones");
  return { ok: true };
}

export async function borrarConversacion(id: string): Promise<{ ok: boolean }> {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  // Borrado de verdad: la conversación, sus mensajes y las dudas que salieron de ella.
  await conSesion(s, (tx) => tx`delete from conversaciones where id = ${id}`);
  revalidatePath("/estudio/conversaciones");
  return { ok: true };
}
