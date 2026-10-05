import "server-only";
import { NextResponse } from "next/server";
import { obtenerSesion, type Sesion } from "./sesion";

/** Para las direcciones del servidor que solo usa el personal (formador o dueño). */
export async function sesionPersonal(): Promise<Sesion | NextResponse> {
  const s = await obtenerSesion();
  if (!s) return NextResponse.json({ error: "No encontrado" }, { status: 401 });
  if (s.soporte) return NextResponse.json({ error: "Estás en modo soporte: solo lectura." }, { status: 403 });
  if (!s.papeles.includes("formador") && !s.papeles.includes("dueno")) return NextResponse.json({ error: "No encontrado" }, { status: 403 });
  return s;
}

export const UUID = /^[0-9a-f-]{36}$/i;
