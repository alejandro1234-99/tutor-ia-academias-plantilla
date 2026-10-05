import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sesionPersonal, UUID } from "@/servidor/api-gestion";
import { conSesion } from "@/servidor/sesion";
import { ErrorTemario, guardarPaginas } from "@/servidor/temario";
import { comoSistema } from "@/servidor/bd";

export const maxDuration = 60;

const Pagina = z.object({
  numero: z.number().int().min(1).max(5000),
  numeroImpreso: z.number().int().min(0).max(100000).nullable(),
  parrafos: z
    .array(z.object({ t: z.string().max(20000), k: z.enum(["normal", "art", "enc"]), art: z.string().max(120).nullable() }))
    .max(400),
  esIndice: z.boolean(),
  caracteres: z.number().int().min(0),
});
const Cuerpo = z.object({ paginas: z.array(Pagina).min(1).max(40) });

// Una tanda de páginas ya leídas en el navegador del formador.
export async function POST(req: NextRequest, ctx: { params: Promise<{ version: string }> }) {
  const s = await sesionPersonal();
  if (s instanceof NextResponse) return s;
  const { version } = await ctx.params;
  if (!UUID.test(version)) return NextResponse.json({ error: "Petición no válida" }, { status: 400 });
  const r = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!r.success) return NextResponse.json({ error: "Las páginas no tienen el formato esperado." }, { status: 400 });
  try {
    await conSesion(s, (tx) => guardarPaginas(tx, version, r.data.paginas));
  } catch (e) {
    if (!(e instanceof ErrorTemario)) {
      await comoSistema((tx) => tx`insert into errores (tipo, detalle, persona_id) values ('temario', ${`paginas ${version}: ${(e as Error).message}`.slice(0, 1000)}, ${s.persona.id})`);
    }
    return NextResponse.json({ error: e instanceof ErrorTemario ? e.message : "No se han podido guardar las páginas. Vuelve a intentarlo." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
