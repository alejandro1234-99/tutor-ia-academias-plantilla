"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { comoSistema } from "@/servidor/bd";
import { darDeAlta, leerLista, validarLista, type FilaLista } from "@/servidor/alumnos";
import { enviarInvitacion } from "@/servidor/avisos";
import { T } from "@/textos";

async function personal() {
  const s = await exigirSesion();
  prohibirEnSoporte(s);
  if (!s.papeles.includes("formador") && !s.papeles.includes("dueno")) throw new Error("No encontrado");
  return s;
}

export async function invitarUno(d: { nombre: string; correo: string; grupoId: string }): Promise<{ ok?: boolean; error?: string }> {
  const s = await personal();
  const r = await conSesion(s, async (tx) => {
    const g = await tx`select nombre from grupos where id = ${d.grupoId}`;
    const [fila] = await validarLista(tx, [{ nombre: d.nombre, correo: d.correo, grupo: String(g[0]?.nombre ?? "") }], T.alumnos.errores);
    if (fila.errores.length) return { error: fila.errores.join(". ") };
    const ids = await darDeAlta(tx, s.persona.id, [{ nombre: fila.nombre, correo: fila.correo, grupoId: fila.grupoId! }]);
    return { ids };
  });
  if ("error" in r) return { error: r.error };
  after(async () => {
    for (const id of r.ids) await enviarInvitacion(id);
  });
  revalidatePath("/formador/alumnos");
  return { ok: true };
}

export async function revisarLista(datos: FormData): Promise<{ filas?: FilaLista[]; error?: string }> {
  const s = await personal();
  const archivo = datos.get("lista");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: T.alumnos.vacioLista };
  if (archivo.size > 2 * 1024 * 1024) return { error: T.alumnos.ilegible };
  const filas = await leerLista(archivo.name, await archivo.arrayBuffer());
  if (filas === null) return { error: T.alumnos.ilegible };
  if (filas.length === 0) return { error: T.alumnos.vacioLista };
  if (filas.length > 500) return { error: "Como mucho 500 alumnos por lista." };
  return { filas: await conSesion(s, (tx) => validarLista(tx, filas, T.alumnos.errores)) };
}

export async function invitarLista(filas: { nombre: string; correo: string; grupo: string }[]): Promise<{ n?: number; error?: string; filas?: FilaLista[] }> {
  const s = await personal();
  const r = await conSesion(s, async (tx) => {
    const revisadas = await validarLista(tx, filas.slice(0, 500), T.alumnos.errores);
    if (revisadas.some((f) => f.errores.length)) return { filas: revisadas };
    return { ids: await darDeAlta(tx, s.persona.id, revisadas.map((f) => ({ nombre: f.nombre, correo: f.correo, grupoId: f.grupoId! }))) };
  });
  if ("filas" in r) return { filas: r.filas, error: T.alumnos.filasMal.replace("{n}", String(r.filas!.filter((f) => f.errores.length).length)) };
  after(async () => {
    for (const id of r.ids!) await enviarInvitacion(id);
  });
  revalidatePath("/formador/alumnos");
  return { n: r.ids!.length };
}

export async function cambiarGrupo(personaId: string, grupoId: string) {
  const s = await personal();
  await conSesion(s, (tx) => tx`update personas set grupo_id = ${grupoId} where id = ${personaId} and es_alumno`);
  revalidatePath("/formador/alumnos");
  return { ok: true };
}

export async function reenviarInvitacion(personaId: string) {
  const s = await personal();
  const visible = await conSesion(s, (tx) => tx`select id from personas where id = ${personaId} and estado <> 'baja'`);
  if (!visible[0]) return { ok: false };
  const ok = await enviarInvitacion(personaId);
  return { ok };
}

/** Dar de baja: deja de poder entrar al momento; sus datos se borran a los 30 días. */
export async function darDeBaja(personaId: string) {
  const s = await personal();
  const f = await conSesion(
    s,
    (tx) => tx`
      update personas set estado = 'baja', baja_at = now(), borrar_desde = now() + interval '30 days'
      where id = ${personaId} and id <> ${s.persona.id} returning id`,
  );
  if (f[0]) await comoSistema((tx) => tx`update sesiones set cerrada_at = now() where persona_id = ${personaId} and cerrada_at is null`);
  revalidatePath("/formador/alumnos");
  return { ok: !!f[0] };
}

export async function reactivar(personaId: string) {
  const s = await personal();
  await conSesion(
    s,
    (tx) => tx`update personas set estado = case when invitacion_aceptada_at is null then 'invitada' else 'activa' end, baja_at = null, borrar_desde = null where id = ${personaId}`,
  );
  revalidatePath("/formador/alumnos");
  return { ok: true };
}
