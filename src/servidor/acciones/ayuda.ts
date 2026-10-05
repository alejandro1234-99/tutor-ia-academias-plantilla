"use server";

import { conSesion, correosTecnicos, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { enviarCorreo, plantilla } from "@/servidor/correo";
import { config } from "@/configuracion";
import { permitir } from "@/servidor/limites-peticiones";

// El formulario de Ayuda del formador y del dueño: nos llega a nosotros con
// la página desde la que se escribe y la hora.
export async function enviarAyuda(mensaje: string, pagina: string): Promise<{ ok: boolean }> {
  const s = await exigirSesion();
  prohibirEnSoporte(s);
  if (!s.papeles.includes("formador") && !s.papeles.includes("dueno")) return { ok: false };
  if (!(await permitir(`ayuda:${s.persona.id}`, 10, 3600))) return { ok: false };
  const texto = mensaje.trim().slice(0, 5000);
  if (!texto) return { ok: false };
  const papel = s.papeles.includes("dueno") ? "dueno" : "formador";
  const pag = pagina.slice(0, 300);
  await conSesion(
    s,
    (tx) => tx`insert into solicitudes_ayuda (persona_id, nombre, correo, papel, pagina, mensaje)
               values (${s.persona.id}, ${s.persona.nombre}, ${s.persona.correo}, ${papel}, ${pag}, ${texto})`,
  );
  const hora = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "long", timeStyle: "short" });
  for (const para of correosTecnicos()) {
    const { html, texto: t } = plantilla({
      titulo: `Ayuda · ${config.nombre}`,
      bloques: [
        { tipo: "cifra", etiqueta: "Quién", valor: `${s.persona.nombre} (${papel})` },
        { tipo: "cifra", etiqueta: "Correo", valor: s.persona.correo },
        { tipo: "cifra", etiqueta: "Página", valor: pag || "—" },
        { tipo: "cifra", etiqueta: "Hora", valor: hora },
        { tipo: "parrafo", texto },
      ],
    });
    await enviarCorreo({ para, tipo: "ayuda", asunto: `Ayuda · ${config.nombreCorto} · ${s.persona.nombre}`, html, texto: t });
  }
  return { ok: true };
}
