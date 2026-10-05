"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";

const HORAS = ["menos-2", "2-4", "4-6", "mas-6"];
const DIFICULTAD = ["arrancar", "memorizar", "entender", "nervios"];

export async function guardarPerfil(d: { comoLlamar: string; repite: boolean | null; horasDia: string | null; dificultad: string | null }) {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  const nombre = d.comoLlamar.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!nombre) return { ok: false };
  await conSesion(
    s,
    (tx) => tx`
      update perfiles set como_llamar = ${nombre}, repite = ${d.repite},
        horas_dia = ${HORAS.includes(d.horasDia ?? "") ? d.horasDia : null},
        dificultad = ${DIFICULTAD.includes(d.dificultad ?? "") ? d.dificultad : null}
      where alumno_id = ${s.persona.id}`,
  );
  revalidatePath("/estudio", "layout");
  return { ok: true };
}

export async function corregirNota(id: string, texto: string) {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  const limpio = texto.replace(/\s+/g, " ").trim().slice(0, 300);
  if (!limpio) return { ok: false };
  await conSesion(s, (tx) => tx`update memoria_notas set texto = ${limpio}, origen = 'alumno', actualizada_at = now() where id = ${id}`);
  revalidatePath("/estudio/lo-que-se-de-ti");
  return { ok: true };
}

export async function borrarNota(id: string) {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  await conSesion(s, (tx) => tx`delete from memoria_notas where id = ${id}`);
  revalidatePath("/estudio/lo-que-se-de-ti");
  return { ok: true };
}

export async function borrarTodasLasNotas() {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  await conSesion(s, (tx) => tx`delete from memoria_notas where alumno_id = ${s.persona.id}`);
  revalidatePath("/estudio/lo-que-se-de-ti");
  return { ok: true };
}
