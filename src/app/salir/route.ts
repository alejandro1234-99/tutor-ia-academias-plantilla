import { NextResponse, type NextRequest } from "next/server";
import { cerrarSesion } from "@/servidor/sesion";

// Cerrar sesión (solo con POST, para que nadie pueda cerrarla con un enlace).
export async function POST(req: NextRequest) {
  await cerrarSesion();
  return NextResponse.redirect(new URL("/entrar", req.url), 303);
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/entrar", req.url));
}
