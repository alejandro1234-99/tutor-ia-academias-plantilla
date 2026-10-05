import { NextResponse, type NextRequest } from "next/server";
import { GALLETA_PAPEL, inicioDePapel, obtenerSesion, type Papel } from "@/servidor/sesion";

// El selector de papel (para quien es dueño y formador a la vez).
export async function GET(req: NextRequest, ctx: { params: Promise<{ papel: string }> }) {
  const { papel } = await ctx.params;
  const s = await obtenerSesion();
  if (!s) return NextResponse.redirect(new URL("/entrar", req.url));
  if (!s.papeles.includes(papel as Papel)) return NextResponse.redirect(new URL("/", req.url));
  const r = NextResponse.redirect(new URL(inicioDePapel(papel as Papel), req.url));
  r.cookies.set(GALLETA_PAPEL, papel, { path: "/", sameSite: "lax", maxAge: 365 * 24 * 3600 });
  return r;
}
