import "server-only";
import { config } from "@/configuracion";
import { T, t } from "@/textos";
import { comoSistema } from "./bd";

// Los correos salen con el nombre de la academia como remitente
// (configuración: correo.nombreRemitente y correo.remitente).
//
// Cómo se envían:
//  - Con RESEND_API_KEY en los secretos, por Resend (el servicio de correo).
//  - En la dirección de pruebas (MODO_PRUEBAS=1), además se guardan en el
//    buzón de pruebas, para verlos en /pruebas/buzon sin esperar al correo.

export function urlWeb(): string {
  const u = process.env.URL_WEB || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return u.replace(/\/$/, "");
}

export function modoPruebas(): boolean {
  return process.env.MODO_PRUEBAS === "1";
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type Bloque = { tipo: "parrafo"; texto: string } | { tipo: "lista"; items: string[] } | { tipo: "cifra"; etiqueta: string; valor: string };

/** La plantilla común, con el color, el icono y el nombre de la academia. */
export function plantilla(opciones: {
  titulo: string;
  bloques: Bloque[];
  boton?: { texto: string; url: string };
  nota?: string;
  pieExtra?: string;
}): { html: string; texto: string } {
  const color = config.colorPrincipal;
  const icono = `${urlWeb()}/academia/icono.png`;
  const cuerpo = opciones.bloques
    .map((b) => {
      if (b.tipo === "parrafo") return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#16160F">${escapar(b.texto)}</p>`;
      if (b.tipo === "lista")
        return `<ol style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.6;color:#16160F">${b.items
          .map((i) => `<li style="margin:0 0 10px">${escapar(i)}</li>`)
          .join("")}</ol>`;
      return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 8px"><tr><td style="font-size:15px;color:#57534E;padding:6px 0">${escapar(b.etiqueta)}</td><td style="font-size:18px;font-weight:600;color:#16160F;text-align:right;padding:6px 0">${escapar(b.valor)}</td></tr></table>`;
    })
    .join("");
  const boton = opciones.boton
    ? `<p style="margin:24px 0"><a href="${escapar(opciones.boton.url)}" style="display:inline-block;background:${color};color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:600;padding:14px 26px;border-radius:999px">${escapar(opciones.boton.texto)}</a></p>`
    : "";
  const nota = opciones.nota ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#57534E">${escapar(opciones.nota)}</p>` : "";
  const pie = [t(T.correos.pie), opciones.pieExtra].filter(Boolean).map((p) => escapar(p!)).join("<br>");
  const html = `<!doctype html><html lang="${config.idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapar(opciones.titulo)}</title></head>
<body style="margin:0;background:#F3F1EC;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:32px 16px">
<table role="presentation" style="max-width:560px;margin:0 auto;width:100%;background:#FFFFFF;border-radius:18px;border-collapse:separate;overflow:hidden">
<tr><td style="background:${color};padding:18px 28px"><table role="presentation"><tr>
<td style="vertical-align:middle"><img src="${icono}" width="32" height="32" alt="" style="display:block;border-radius:8px"></td>
<td style="vertical-align:middle;padding-left:12px;color:#FFFFFF;font-size:17px;font-weight:600">${escapar(config.nombre)}</td>
</tr></table></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.15;color:#16160F">${escapar(opciones.titulo)}</h1>
${cuerpo}${boton}${nota}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #E6E2DA;font-size:12px;line-height:1.5;color:#6B665F">${pie}</td></tr>
</table></td></tr></table></body></html>`;
  const texto = [
    opciones.titulo,
    "",
    ...opciones.bloques.map((b) =>
      b.tipo === "parrafo" ? b.texto : b.tipo === "lista" ? b.items.map((i, n) => `${n + 1}. ${i}`).join("\n") : `${b.etiqueta}: ${b.valor}`,
    ),
    opciones.boton ? `\n${opciones.boton.texto}: ${opciones.boton.url}` : "",
    opciones.nota ? `\n${opciones.nota}` : "",
    "\n—\n" + t(T.correos.pie),
  ].join("\n");
  return { html, texto };
}

export async function enviarCorreo(opciones: {
  para: string;
  personaId?: string | null;
  tipo: string;
  asunto: string;
  html: string;
  texto: string;
}): Promise<boolean> {
  const remitente = process.env.CORREO_REMITENTE || config.correo.remitente;
  const de = `"${config.correo.nombreRemitente.replace(/"/g, "")}" <${remitente}>`;
  let ok = true;
  let error: string | null = null;
  let proveedorId: string | null = null;

  if (modoPruebas()) {
    await comoSistema(
      (tx) => tx`insert into buzon_pruebas (para, de, asunto, html, texto) values (${opciones.para}, ${de}, ${opciones.asunto}, ${opciones.html}, ${opciones.texto})`,
    );
  }

  const clave = process.env.RESEND_API_KEY;
  const soloBuzon = modoPruebas() && /@example\.(com|org|net)$/i.test(opciones.para);
  if (clave && !soloBuzon) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: de, to: [opciones.para], subject: opciones.asunto, html: opciones.html, text: opciones.texto }),
        signal: AbortSignal.timeout(15000),
      });
      const cuerpo = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
      ok = r.ok;
      proveedorId = cuerpo.id ?? null;
      if (!r.ok) error = cuerpo.message || `Resend respondió ${r.status}`;
    } catch (e) {
      ok = false;
      error = (e as Error).message;
    }
  } else if (!modoPruebas()) {
    ok = false;
    error = "No hay servicio de correo configurado (falta RESEND_API_KEY).";
  }

  await comoSistema(async (tx) => {
    await tx`
      insert into correos_enviados (persona_id, destinatario, tipo, asunto, ok, error, proveedor_id)
      values ((select id from personas where id = ${opciones.personaId ?? null}::uuid), ${opciones.para}, ${opciones.tipo}, ${opciones.asunto}, ${ok}, ${error}, ${proveedorId})`;
    if (!ok) {
      await tx`insert into errores (tipo, detalle, persona_id) values ('correo', ${`${opciones.tipo}: ${error}`}, (select id from personas where id = ${opciones.personaId ?? null}::uuid))`;
    }
  });
  return ok;
}
