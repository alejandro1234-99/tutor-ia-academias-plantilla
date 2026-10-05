import { NextResponse, type NextRequest } from "next/server";
import { comoSistema } from "@/servidor/bd";
import { obtenerSesion } from "@/servidor/sesion";
import { permitir } from "@/servidor/limites-peticiones";

// Apunta los errores que ve la gente (pantalla «Algo ha fallado»), para
// enterarnos antes de que nos avisen.
export async function POST(req: NextRequest) {
  const s = await obtenerSesion().catch(() => null);
  const clave = s ? `error:${s.persona.id}` : `error:${req.headers.get("x-forwarded-for") || "anonimo"}`;
  if (!(await permitir(clave, 20, 3600))) return NextResponse.json({ ok: false });
  const cuerpo = (await req.json().catch(() => ({}))) as { digest?: string; pagina?: string };
  const detalle = `Pantalla de error en ${String(cuerpo.pagina || "?").slice(0, 200)} (${String(cuerpo.digest || "").slice(0, 60)})`;
  await comoSistema((tx) => tx`insert into errores (tipo, detalle, persona_id) values ('pantalla', ${detalle}, ${s?.persona.id ?? null})`);
  return NextResponse.json({ ok: true });
}
