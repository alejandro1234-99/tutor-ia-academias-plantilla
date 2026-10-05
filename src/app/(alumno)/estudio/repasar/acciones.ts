"use server";

import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { paraManana, responderFallada, responderTarjeta } from "@/servidor/repaso";

export async function marcarTarjeta(materialId: string, indice: number, sabia: boolean) {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  await conSesion(s, (tx) => responderTarjeta(tx, s.persona.id, materialId, indice, sabia));
}

export async function marcarPregunta(materialId: string, indice: number, acierto: boolean) {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  await conSesion(s, (tx) => responderFallada(tx, s.persona.id, materialId, indice, acierto));
}

export async function cuantasManana(): Promise<number> {
  const s = await exigirSesion("alumno");
  return conSesion(s, (tx) => paraManana(tx, s.persona.id));
}
