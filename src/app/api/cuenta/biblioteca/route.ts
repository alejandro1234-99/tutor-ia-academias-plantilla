import { config } from "@/configuracion";
import { conSesion, obtenerSesion } from "@/servidor/sesion";
import { listarMateriales } from "@/servidor/materiales";
import { pdfBiblioteca } from "@/servidor/pdf";
import { permitir } from "@/servidor/limites-peticiones";

export const maxDuration = 60;

// Mi cuenta · Descargar toda mi biblioteca (un PDF con todo su material).
export async function GET() {
  const s = await obtenerSesion();
  if (!s || !s.papeles.includes("alumno")) return new Response("No encontrado", { status: 404 });
  if (!(await permitir(`biblioteca:${s.persona.id}`, 5, 3600))) return new Response("Espera un rato", { status: 429 });
  const materiales = await conSesion(s, (tx) => listarMateriales(tx, s.persona.id));
  const pdf = await pdfBiblioteca(materiales, `Mi biblioteca · ${config.nombreCorto}`);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mi-biblioteca.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
