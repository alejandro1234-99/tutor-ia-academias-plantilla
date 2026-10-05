import { NextResponse, type NextRequest } from "next/server";
import generada from "@/configuracion/generada.json";

// Si la academia está pausada (configuración: servicioPausado), todas las
// páginas llevan a «El servicio está pausado». El panel técnico sigue
// abierto para nosotros.
export function proxy(req: NextRequest) {
  // La página que se está viendo (para el registro del modo soporte).
  const cabeceras = new Headers(req.headers);
  cabeceras.set("x-ruta", req.nextUrl.pathname);
  if (!(generada as { servicioPausado?: boolean }).servicioPausado) return NextResponse.next({ request: { headers: cabeceras } });
  const ruta = req.nextUrl.pathname;
  if (ruta === "/pausado" || ruta.startsWith("/tecnico") || ruta.startsWith("/entrar")) return NextResponse.next({ request: { headers: cabeceras } });
  const url = req.nextUrl.clone();
  url.pathname = "/pausado";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|academia/|api/tareas|favicon|sw\\.js|pdf\\.worker|sin-conexion\\.html|manifest\\.webmanifest).*)"],
};
