import { NextResponse, type NextRequest } from "next/server";
import { sesionPersonal, UUID } from "@/servidor/api-gestion";
import { conSesion } from "@/servidor/sesion";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ version: string }> }) {
  const s = await sesionPersonal();
  if (s instanceof NextResponse) return s;
  const { version } = await ctx.params;
  if (!UUID.test(version)) return NextResponse.json({}, { status: 400 });
  const f = await conSesion(s, (tx) => tx`select estado, progreso, paso, error from tema_versiones where id = ${version}`);
  if (!f[0]) return NextResponse.json({}, { status: 404 });
  return NextResponse.json(f[0], { headers: { "Cache-Control": "no-store" } });
}
