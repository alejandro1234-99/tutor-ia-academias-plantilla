"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { enviarRespuestaFormador } from "@/servidor/avisos";
import { indexarNotas } from "@/servidor/temario";

async function formador() {
  const s = await exigirSesion("formador");
  prohibirEnSoporte(s);
  return s;
}

export async function contestarDuda(d: { id: string; texto: string; guardarNota: boolean; temaId: string | null }): Promise<{ error?: string }> {
  const s = await formador();
  const texto = d.texto.trim().slice(0, 4000);
  if (!texto) return { error: "Escribe la respuesta." };
  if (d.guardarNota && !d.temaId) return { error: "Elige el tema donde guardar la nota." };
  try {
    await conSesion(s, (tx) => tx`select academia.contestar_duda(${d.id}, ${texto}, ${d.guardarNota}, ${d.temaId})`);
  } catch (e) {
    return { error: /tema/i.test((e as Error).message) ? "Elige el tema donde guardar la nota." : "No se ha podido enviar." };
  }
  after(async () => {
    await enviarRespuestaFormador(d.id);
    if (d.guardarNota) await indexarNotas();
  });
  revalidatePath("/formador/dudas");
  redirect("/formador/dudas");
}

export async function marcarResuelta(id: string) {
  const s = await formador();
  await conSesion(s, (tx) => tx`update dudas set estado = 'resuelta', contestada_por = ${s.persona.id}, contestada_por_nombre = ${s.persona.nombre}, contestada_at = now() where id = ${id} and estado = 'pendiente'`);
  revalidatePath("/formador/dudas");
  redirect("/formador/dudas");
}
