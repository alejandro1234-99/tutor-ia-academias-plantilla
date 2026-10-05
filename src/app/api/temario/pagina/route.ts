import { NextResponse, type NextRequest } from "next/server";
import { conSesion, obtenerSesion } from "@/servidor/sesion";
import { paginaVisor } from "@/servidor/visor";
import { T } from "@/textos";

// Una página del temario para el visor (nunca el PDF entero).
export async function GET(req: NextRequest) {
  const s = await obtenerSesion();
  if (!s) return NextResponse.json({ error: T.comun.noEncontrado }, { status: 401 });
  const v = req.nextUrl.searchParams.get("v") || "";
  const n = Number(req.nextUrl.searchParams.get("n") || "0");
  const esAlumno = !s.papeles.includes("formador") && !s.papeles.includes("dueno");
  const r = await conSesion(s, (tx) => paginaVisor(tx, s.persona.id, esAlumno, v, n));
  if (!r.ok) {
    return NextResponse.json(
      { error: r.motivo === "limite" ? T.visor.demasiadas : T.visor.noDisponible, motivo: r.motivo },
      { status: r.motivo === "limite" ? 429 : 404 },
    );
  }
  return NextResponse.json(r.pagina, { headers: { "Cache-Control": "private, no-store" } });
}
