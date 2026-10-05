import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { comoSistema } from "@/servidor/bd";
import { GALLETA_SESION, huella } from "@/servidor/sesion";

// Salir del modo soporte.
export async function POST(req: NextRequest) {
  const token = (await cookies()).get(GALLETA_SESION)?.value;
  if (token) {
    await comoSistema(async (tx) => {
      const s = await tx`select soporte_entrada_id from sesiones where id_hash = ${huella(token)}`;
      if (s[0]?.soporteEntradaId) {
        await tx`update soporte_entradas set terminada_at = now() where id = ${s[0].soporteEntradaId}`;
        await tx`update sesiones set soporte_entrada_id = null where id_hash = ${huella(token)}`;
      }
    });
  }
  return NextResponse.redirect(new URL("/tecnico/soporte", req.url), 303);
}
