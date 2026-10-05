"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { conSesion, exigirSesion, GALLETA_TEMA, prohibirEnSoporte } from "@/servidor/sesion";

export async function guardarPreferencia(campo: "recordatorio" | "avisos_formador" | "tema_visual", valor: boolean | string) {
  const s = await exigirSesion();
  prohibirEnSoporte(s);
  await conSesion(s, async (tx) => {
    await tx`insert into preferencias (persona_id) values (${s.persona.id}) on conflict do nothing`;
    if (campo === "recordatorio") await tx`update preferencias set recordatorio = ${!!valor} where persona_id = ${s.persona.id}`;
    if (campo === "avisos_formador") await tx`update preferencias set avisos_formador = ${!!valor} where persona_id = ${s.persona.id}`;
    if (campo === "tema_visual" && ["auto", "oscuro", "claro"].includes(String(valor))) {
      await tx`update preferencias set tema_visual = ${String(valor)} where persona_id = ${s.persona.id}`;
    }
  });
  if (campo === "tema_visual") {
    (await cookies()).set(GALLETA_TEMA, String(valor), { path: "/", sameSite: "lax", maxAge: 365 * 24 * 3600 });
  }
  return { ok: true };
}

/**
 * Borrar mis datos (RGPD): al momento y de verdad. La cuenta sigue abierta
 * (la academia le tiene invitado) y empieza de cero, con la pantalla de
 * privacidad. Los contadores de consumo de la academia se quedan, sin su nombre.
 */
export async function borrarMisDatos(confirmacion: string) {
  const s = await exigirSesion("alumno");
  prohibirEnSoporte(s);
  if (confirmacion.trim().toUpperCase() !== "BORRAR") return { ok: false };
  const id = s.persona.id;
  await conSesion(s, async (tx) => {
    await tx`delete from conversaciones where alumno_id = ${id}`;
    await tx`delete from materiales where propietario_id = ${id}`;
    await tx`delete from carpetas where alumno_id = ${id}`;
    await tx`delete from memoria_notas where alumno_id = ${id}`;
    await tx`delete from intentos_test where alumno_id = ${id}`;
    await tx`delete from tarjetas_repaso where alumno_id = ${id}`;
    await tx`delete from preguntas_falladas where alumno_id = ${id}`;
    await tx`delete from actividad where persona_id = ${id}`;
    await tx`select academia.anonimizar_mi_uso()`;
    await tx`delete from perfiles where alumno_id = ${id}`;
    await tx`delete from preferencias where persona_id = ${id}`;
  });
  redirect("/primera-vez");
}
