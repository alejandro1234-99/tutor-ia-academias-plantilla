import { NextResponse, type NextRequest } from "next/server";
import { conSesion, obtenerSesion } from "@/servidor/sesion";

// Cómo va la creación de un material (para la barra de progreso).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await obtenerSesion();
  if (!s) return NextResponse.json({}, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({}, { status: 404 });
  const f = await conSesion(s, (tx) => tx`select estado, progreso, paso from materiales where id = ${id}`);
  if (!f[0]) return NextResponse.json({}, { status: 404 });
  return NextResponse.json(f[0], { headers: { "Cache-Control": "no-store" } });
}
