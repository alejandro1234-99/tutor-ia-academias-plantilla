"use server";

import { redirect } from "next/navigation";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { terminarIntento, type Respuestas } from "@/servidor/tests";

export async function terminarTest(materialId: string, intentoId: string, respuestas: Respuestas): Promise<void> {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  await conSesion(s, (tx) => terminarIntento(tx, s.persona.id, intentoId, respuestas));
  redirect(`/test/${materialId}/resultado/${intentoId}`);
}
