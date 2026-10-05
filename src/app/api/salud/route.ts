import { NextResponse } from "next/server";
import { comoSistema } from "@/servidor/bd";

// Para el vigilante externo: responde «ok» si la web y la base de datos funcionan.
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await comoSistema((tx) => tx`select 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
