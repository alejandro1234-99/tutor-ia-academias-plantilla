import "server-only";
import { T, t } from "@/textos";
import { comoSistema } from "./bd";
import { enviarCorreo, plantilla, urlWeb } from "./correo";

// Los avisos por correo que salen al momento (SOLUCION.md, sección 15).
// Los que salen solos a una hora están en tareas.ts.

async function persona(id: string) {
  const f = await comoSistema((tx) => tx`select id, nombre, correo, es_alumno, es_formador, es_dueno, estado from personas where id = ${id}`);
  return f[0] as { id: string; nombre: string; correo: string; esAlumno: boolean; esFormador: boolean; esDueno: boolean; estado: string } | undefined;
}

export async function enviarBienvenida(personaId: string): Promise<void> {
  const p = await persona(personaId);
  if (!p) return;
  const c = T.correos.bienvenida;
  const { html, texto } = plantilla({
    titulo: c.titulo,
    bloques: [{ tipo: "lista", items: [t(c.consejo1), t(c.consejo2), t(c.consejo3)] }],
    boton: { texto: c.boton, url: `${urlWeb()}/estudio/preguntar` },
  });
  await enviarCorreo({ para: p.correo, personaId: p.id, tipo: "bienvenida", asunto: t(c.asunto), html, texto });
}

export async function enviarInvitacion(personaId: string): Promise<boolean> {
  const p = await persona(personaId);
  if (!p || p.estado === "baja") return false;
  const c = p.esAlumno ? T.correos.invitacion : p.esDueno ? T.correos.invitacionDireccion : T.correos.invitacionFormador;
  const nombre = p.nombre.split(" ")[0];
  const { html, texto } = plantilla({
    titulo: t(c.titulo, { nombre }),
    bloques: [{ tipo: "parrafo", texto: t(c.texto) }],
    boton: { texto: c.boton, url: `${urlWeb()}/entrar` },
    nota: t(T.correos.invitacion.nota),
  });
  const ok = await enviarCorreo({ para: p.correo, personaId: p.id, tipo: "invitacion", asunto: t(c.asunto), html, texto });
  await comoSistema((tx) => tx`update personas set invitada_at = now() where id = ${p.id}`);
  return ok;
}

/** Al alumno le llega que su formador ha contestado (sin que el formador sepa quién es). */
export async function enviarRespuestaFormador(dudaId: string): Promise<void> {
  const f = await comoSistema(
    (tx) => tx`
      select p.id, p.correo, d.conversacion_id, coalesce(pr.avisos_formador, true) as quiere
      from dudas d join personas p on p.id = d.alumno_id left join preferencias pr on pr.persona_id = p.id
      where d.id = ${dudaId} and p.estado <> 'baja'`,
  );
  const a = f[0];
  if (!a || !a.quiere) return;
  const c = T.correos.respuestaFormador;
  const { html, texto } = plantilla({
    titulo: c.titulo,
    bloques: [{ tipo: "parrafo", texto: t(c.texto) }],
    boton: { texto: c.boton, url: `${urlWeb()}/estudio/preguntar/${a.conversacionId}` },
    pieExtra: T.correos.pieDesactivar,
  });
  await enviarCorreo({ para: a.correo as string, personaId: a.id as string, tipo: "respuesta_formador", asunto: t(c.asunto), html, texto });
}

export async function enviarTemarioProcesado(versionId: string): Promise<void> {
  const f = await comoSistema(
    (tx) => tx`
      select v.estado, v.error, v.paginas, t.numero, t.nombre, p.id as persona_id, p.correo
      from tema_versiones v join temas t on t.id = v.tema_id left join personas p on p.id = v.subida_por
      where v.id = ${versionId}`,
  );
  const v = f[0];
  if (!v?.correo) return;
  const c = T.correos.temarioProcesado;
  const tema = `Tema ${v.numero} · ${v.nombre}`;
  const ok = v.estado === "lista";
  const { html, texto } = plantilla({
    titulo: c.titulo,
    bloques: [{ tipo: "parrafo", texto: ok ? t(c.texto, { tema, paginas: v.paginas as number }) : t(c.textoError, { tema, motivo: (v.error as string) ?? "" }) }],
    boton: { texto: c.boton, url: `${urlWeb()}/formador/temario` },
  });
  await enviarCorreo({ para: v.correo as string, personaId: v.personaId as string, tipo: "temario_procesado", asunto: t(c.asunto, { tema }), html, texto });
}

export async function avisarModoSoporte(tecnicoCorreo: string): Promise<void> {
  const duenos = await comoSistema((tx) => tx`select id, correo from personas where es_dueno and estado <> 'baja'`);
  const c = T.correos.soporte;
  const fecha = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "long", timeStyle: "short" });
  for (const d of duenos) {
    const { html, texto } = plantilla({
      titulo: c.titulo,
      bloques: [{ tipo: "parrafo", texto: t(c.texto, { tecnico: tecnicoCorreo, fecha }) }],
      boton: { texto: c.boton, url: `${urlWeb()}/ajustes/consumo` },
    });
    await enviarCorreo({ para: d.correo as string, personaId: d.id as string, tipo: "modo_soporte", asunto: t(c.asunto), html, texto });
  }
}

