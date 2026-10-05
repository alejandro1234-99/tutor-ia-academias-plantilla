"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { comoSistema } from "@/servidor/bd";
import { enviarInvitacion } from "@/servidor/avisos";
import { CORREO_VALIDO } from "@/servidor/entrar";

async function dueno() {
  const s = await exigirSesion("dueno");
  prohibirEnSoporte(s);
  return s;
}

export async function invitarFormador(d: { nombre: string; correo: string; grupoIds: string[] }): Promise<{ error?: string; ok?: boolean }> {
  const s = await dueno();
  const correo = d.correo.trim().toLowerCase();
  if (!d.nombre.trim()) return { error: "Falta el nombre." };
  if (!CORREO_VALIDO.test(correo)) return { error: "Correo mal escrito." };
  const r = await conSesion(s, async (tx) => {
    const ya = await tx`select id, es_formador from personas where correo = ${correo}`;
    if (ya[0]) return { error: "Ya está dado de alta." };
    const f = await tx`
      insert into personas (nombre, correo, es_formador, estado, invitada_at, invitada_por)
      values (${d.nombre.trim().slice(0, 120)}, ${correo}, true, 'invitada', now(), ${s.persona.id}) returning id`;
    for (const g of d.grupoIds) await tx`insert into formador_grupos (formador_id, grupo_id) values (${f[0].id}, ${g}) on conflict do nothing`;
    return { id: f[0].id as string };
  });
  if ("error" in r) return { error: r.error };
  after(() => enviarInvitacion(r.id!).then(() => {}));
  revalidatePath("/ajustes/equipo");
  return { ok: true };
}

export async function asignarGrupos(formadorId: string, grupoIds: string[]) {
  const s = await dueno();
  await conSesion(s, async (tx) => {
    await tx`delete from formador_grupos where formador_id = ${formadorId} and not (grupo_id = any(${grupoIds}::uuid[]))`;
    for (const g of grupoIds) await tx`insert into formador_grupos (formador_id, grupo_id) values (${formadorId}, ${g}) on conflict do nothing`;
  });
  revalidatePath("/ajustes/equipo");
  return { ok: true };
}

export async function quitarFormador(formadorId: string) {
  const s = await dueno();
  if (formadorId === s.persona.id) return { ok: false };
  await conSesion(s, async (tx) => {
    await tx`delete from formador_grupos where formador_id = ${formadorId}`;
    await tx`update personas set estado = 'baja', baja_at = now(), borrar_desde = now() + interval '30 days' where id = ${formadorId} and not es_dueno`;
  });
  await comoSistema((tx) => tx`update sesiones set cerrada_at = now() where persona_id = ${formadorId} and cerrada_at is null`);
  revalidatePath("/ajustes/equipo");
  return { ok: true };
}

export async function marcarmeFormador(si: boolean) {
  const s = await dueno();
  await conSesion(s, (tx) => tx`update personas set es_formador = ${si} where id = ${s.persona.id}`);
  revalidatePath("/ajustes/equipo");
  return { ok: true };
}

export async function guardarRegla(oposicionId: string, resta: number, segundos: number) {
  const s = await dueno();
  if (![0, 0.25, 0.3333, 0.5].includes(resta) || segundos < 10 || segundos > 600) return { ok: false };
  await conSesion(s, (tx) => tx`update oposiciones set resta_por_fallo = ${resta}, segundos_por_pregunta = ${Math.round(segundos)} where id = ${oposicionId}`);
  revalidatePath("/ajustes/grupos");
  return { ok: true };
}

export async function crearGrupo(oposicionId: string, nombre: string) {
  const s = await dueno();
  const limpio = nombre.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!limpio) return { ok: false, error: "Escribe el nombre del grupo." };
  try {
    await conSesion(s, (tx) => tx`insert into grupos (oposicion_id, nombre) values (${oposicionId}, ${limpio})`);
  } catch {
    return { ok: false, error: "Ya hay un grupo con ese nombre." };
  }
  revalidatePath("/ajustes/grupos");
  return { ok: true };
}

export async function renombrarGrupo(id: string, nombre: string) {
  const s = await dueno();
  const limpio = nombre.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!limpio) return { ok: false };
  try {
    await conSesion(s, (tx) => tx`update grupos set nombre = ${limpio} where id = ${id}`);
  } catch {
    return { ok: false };
  }
  revalidatePath("/ajustes/grupos");
  return { ok: true };
}

export async function archivarGrupo(id: string, archivar: boolean) {
  const s = await dueno();
  await conSesion(s, (tx) => tx`update grupos set archivado = ${archivar} where id = ${id}`);
  revalidatePath("/ajustes/grupos");
  return { ok: true };
}
