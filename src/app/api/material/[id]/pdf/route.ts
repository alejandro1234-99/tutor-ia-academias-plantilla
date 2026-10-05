import type { NextRequest } from "next/server";
import { conSesion, obtenerSesion } from "@/servidor/sesion";
import { unMaterial } from "@/servidor/materiales";
import { nombreArchivo, pdfMaterial } from "@/servidor/pdf";
import { permitir } from "@/servidor/limites-peticiones";

// Descargar un material en PDF, con la marca de la academia.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await obtenerSesion();
  if (!s) return new Response("No encontrado", { status: 404 });
  if (!(await permitir(`pdf:${s.persona.id}`, 30, 60))) return new Response("Espera un minuto", { status: 429 });
  const { id } = await ctx.params;
  const m = await conSesion(s, (tx) => unMaterial(tx, s.persona.id, id));
  if (!m || m.estado !== "listo" || !m.contenido) return new Response("No encontrado", { status: 404 });
  const pdf = await pdfMaterial(m);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo(m.titulo)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
