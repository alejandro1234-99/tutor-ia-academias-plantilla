import "server-only";
import { T, t } from "@/textos";
import { comoSistema } from "./bd";
import { enviarCorreo, plantilla, urlWeb } from "./correo";
import { correosTecnicos, crearSesion, datosPeticion, huella, tokenAleatorio } from "./sesion";
import { LIMITES, permitir } from "./limites-peticiones";

// Entrar con un enlace por correo, sin contraseña (SOLUCION.md, 8.1):
//  - Solo entran los invitados. A un correo no invitado se le enseña el
//    mismo mensaje, y no se le manda nada.
//  - El enlace caduca a la hora y sirve una sola vez.
//  - Como mucho, 5 enlaces por hora por correo.

export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ResultadoPedir = { ok: true } | { ok: false; motivo: "correo" | "demasiados" };

export async function pedirEnlace(correoEscrito: string): Promise<ResultadoPedir> {
  const correo = correoEscrito.trim().toLowerCase();
  if (!CORREO_VALIDO.test(correo)) return { ok: false, motivo: "correo" };
  const { ip } = await datosPeticion();
  if (!(await permitir(`enlace:${correo}`, LIMITES.enlacesPorHora, 3600))) return { ok: false, motivo: "demasiados" };
  if (ip && !(await permitir(`enlace-ip:${ip}`, LIMITES.enlacesPorHoraIp, 3600))) return { ok: false, motivo: "demasiados" };

  const esTecnico = correosTecnicos().includes(correo);
  const persona = await comoSistema(async (tx) => {
    if (esTecnico) {
      await tx`
        insert into personas (nombre, correo, estado) values ('Soporte técnico', ${correo}, 'activa')
        on conflict (correo) do nothing`;
    }
    const filas = await tx`
      select id, nombre, correo from personas
      where correo = ${correo} and estado <> 'baja'
        and (es_alumno or es_formador or es_dueno or ${esTecnico})`;
    return filas[0] as { id: string; nombre: string; correo: string } | undefined;
  });

  // Mismo resultado para todos: nadie puede averiguar quién es alumno.
  if (!persona) return { ok: true };

  const token = tokenAleatorio();
  await comoSistema(
    (tx) => tx`
      insert into enlaces_entrada (token_hash, persona_id, expira_at, ip)
      values (${huella(token)}, ${persona.id}, now() + interval '1 hour', ${ip})`,
  );
  const url = `${urlWeb()}/entrar/confirmar?t=${encodeURIComponent(token)}`;
  const c = T.correos.enlace;
  const { html, texto } = plantilla({
    titulo: c.titulo,
    bloques: [{ tipo: "parrafo", texto: c.texto }],
    boton: { texto: c.boton, url },
  });
  await enviarCorreo({ para: persona.correo, personaId: persona.id, tipo: "enlace", asunto: t(c.asunto), html, texto });
  return { ok: true };
}

/** Comprueba el enlace, lo gasta y crea la sesión. */
export async function confirmarEnlace(token: string): Promise<{ ok: boolean }> {
  if (!token || token.length > 200) return { ok: false };
  return comoSistema(async (tx) => {
    const filas = await tx`
      update enlaces_entrada set usado_at = now()
      where token_hash = ${huella(token)} and usado_at is null and expira_at > now()
      returning persona_id`;
    if (filas.length === 0) return { ok: false };
    const personaId = filas[0].personaId as string;
    const p = await tx`select estado from personas where id = ${personaId}`;
    if (p.length === 0 || p[0].estado === "baja") return { ok: false };
    await tx`
      update personas set estado = 'activa', invitacion_aceptada_at = coalesce(invitacion_aceptada_at, now()), ultimo_acceso_at = now()
      where id = ${personaId}`;
    await tx`insert into actividad (persona_id, fecha) values (${personaId}, hoy_madrid()) on conflict do nothing`;
    await crearSesion(tx, personaId);
    return { ok: true };
  });
}

