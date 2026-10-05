"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { crearVersion, ErrorTemario, LIMITE_MB_PDF } from "@/servidor/temario";

async function personal() {
  const s = await exigirSesion();
  prohibirEnSoporte(s);
  if (!s.papeles.includes("formador") && !s.papeles.includes("dueno")) throw new Error("No encontrado");
  return s;
}

export async function empezarSubida(d: {
  oposicionId: string;
  temaId: string | null;
  numero: number | null;
  nombre: string | null;
  nombreCorto: string | null;
  archivoNombre: string;
  archivoBytes: number;
  paginas: number;
}): Promise<{ versionId?: string; error?: string }> {
  const s = await personal();
  if (d.archivoBytes > LIMITE_MB_PDF * 1024 * 1024) return { error: `El PDF pesa más de ${LIMITE_MB_PDF} MB.` };
  try {
    const r = await conSesion(s, (tx) =>
      crearVersion(tx, {
        temaId: d.temaId,
        nuevoTema: d.temaId ? null : { oposicionId: d.oposicionId, numero: Number(d.numero), nombre: String(d.nombre ?? ""), nombreCorto: d.nombreCorto },
        archivoNombre: d.archivoNombre,
        archivoBytes: d.archivoBytes,
        paginas: d.paginas,
        personaId: s.persona.id,
        personaNombre: s.persona.nombre,
      }),
    );
    return { versionId: r.versionId };
  } catch (e) {
    return { error: e instanceof ErrorTemario ? e.message : "No se ha podido empezar la subida. ¿Tienes permiso sobre esta oposición?" };
  }
}

export async function editarNota(id: string, texto: string) {
  const s = await personal();
  const limpio = texto.trim().slice(0, 4000);
  if (!limpio) return { ok: false };
  await conSesion(s, (tx) => tx`update notas_formador set texto = ${limpio}, editada_at = now(), embedding = null where id = ${id}`);
  revalidatePath("/formador/temario", "layout");
  return { ok: true };
}

export async function retirarNota(id: string) {
  const s = await personal();
  await conSesion(s, (tx) => tx`update notas_formador set retirada_at = now() where id = ${id}`);
  revalidatePath("/formador/temario", "layout");
  return { ok: true };
}
