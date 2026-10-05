"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { enviarBienvenida } from "@/servidor/avisos";

const HORAS = ["menos-2", "2-4", "4-6", "mas-6"];
const DIFICULTAD = ["arrancar", "memorizar", "entender", "nervios"];

export type Respuestas = {
  edad: boolean;
  comoLlamar: string;
  oposicionConfirmada: boolean;
  repite: boolean | null;
  horasDia: string | null;
  dificultad: string | null;
};

export async function guardarPrimeraVez(r: Respuestas): Promise<{ error?: string }> {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  const nombre = r.comoLlamar.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!r.edad) return { error: "edad" };
  if (!nombre) return { error: "nombre" };
  const horas = HORAS.includes(r.horasDia ?? "") ? r.horasDia : null;
  const dificultad = DIFICULTAD.includes(r.dificultad ?? "") ? r.dificultad : null;
  const enviar = await conSesion(s, async (tx) => {
    const f = await tx`
      insert into perfiles (alumno_id, privacidad_aceptada_at, edad_confirmada, como_llamar, oposicion_confirmada, repite, horas_dia, dificultad, completado_at)
      values (${s.persona.id}, now(), true, ${nombre}, ${r.oposicionConfirmada}, ${r.repite}, ${horas}, ${dificultad}, now())
      on conflict (alumno_id) do update set privacidad_aceptada_at = now(), edad_confirmada = true, como_llamar = excluded.como_llamar,
        oposicion_confirmada = excluded.oposicion_confirmada, repite = excluded.repite, horas_dia = excluded.horas_dia,
        dificultad = excluded.dificultad, completado_at = now()
      returning bienvenida_enviada_at`;
    await tx`insert into preferencias (persona_id) values (${s.persona.id}) on conflict do nothing`;
    if (!f[0].bienvenidaEnviadaAt) {
      await tx`update perfiles set bienvenida_enviada_at = now() where alumno_id = ${s.persona.id}`;
      return true;
    }
    return false;
  });
  if (enviar) after(() => enviarBienvenida(s.persona.id));
  redirect("/estudio/preguntar");
}
