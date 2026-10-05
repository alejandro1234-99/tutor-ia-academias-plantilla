import { after, NextResponse, type NextRequest } from "next/server";
import { sesionPersonal, UUID } from "@/servidor/api-gestion";
import { conSesion } from "@/servidor/sesion";
import { indexarYTerminar } from "@/servidor/temario";
import { enviarTemarioProcesado } from "@/servidor/avisos";

export const maxDuration = 300;

// Ya están todas las páginas: se prepara la búsqueda en segundo plano y,
// al acabar, el tema se pone en uso y le llega un correo al formador.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ version: string }> }) {
  const s = await sesionPersonal();
  if (s instanceof NextResponse) return s;
  const { version } = await ctx.params;
  if (!UUID.test(version)) return NextResponse.json({ error: "Petición no válida" }, { status: 400 });
  const ok = await conSesion(s, async (tx) => {
    const f = await tx`
      update tema_versiones set estado = 'procesando', progreso = greatest(progreso, 50), paso = 'Preparando la búsqueda'
      where id = ${version} and estado in ('subiendo', 'procesando', 'error') returning id`;
    return f.length > 0;
  });
  if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  after(async () => {
    await indexarYTerminar(version);
    await enviarTemarioProcesado(version);
  });
  return NextResponse.json({ ok: true });
}
