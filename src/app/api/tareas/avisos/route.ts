import { NextResponse, type NextRequest } from "next/server";
import { revisarAvisos } from "@/servidor/tareas";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// La revisión diaria de avisos (la lanza Vercel cada día con CRON_SECRET).
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const informe = await revisarAvisos(false);
  return NextResponse.json({ ok: true, informe });
}
