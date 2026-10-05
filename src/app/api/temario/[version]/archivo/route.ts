import { NextResponse, type NextRequest } from "next/server";
import { sesionPersonal, UUID } from "@/servidor/api-gestion";
import { conSesion } from "@/servidor/sesion";
import { guardarParteArchivo } from "@/servidor/temario";
import { comoSistema } from "@/servidor/bd";

// Una parte (hasta 3 MB) del PDF original, para guardarlo en el historial.
export async function POST(req: NextRequest, ctx: { params: Promise<{ version: string }> }) {
  const s = await sesionPersonal();
  if (s instanceof NextResponse) return s;
  const { version } = await ctx.params;
  const parte = Number(req.nextUrl.searchParams.get("parte"));
  if (!UUID.test(version) || !Number.isInteger(parte) || parte < 0 || parte > 30) return NextResponse.json({ error: "Petición no válida" }, { status: 400 });
  const datos = new Uint8Array(await req.arrayBuffer());
  if (datos.length === 0 || datos.length > 3.5 * 1024 * 1024) return NextResponse.json({ error: "Parte demasiado grande" }, { status: 413 });
  try {
    await conSesion(s, (tx) => guardarParteArchivo(tx, version, parte, datos));
  } catch (e) {
    await comoSistema((tx) => tx`insert into errores (tipo, detalle, persona_id) values ('temario', ${`archivo ${version}: ${(e as Error).message}`.slice(0, 1000)}, ${s.persona.id})`);
    return NextResponse.json({ error: "No se ha podido guardar el PDF. Vuelve a intentarlo." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
