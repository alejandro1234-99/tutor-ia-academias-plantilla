"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { comoSistema } from "@/servidor/bd";
import { exigirTecnico } from "@/servidor/tecnico";
import { avisarModoSoporte } from "@/servidor/avisos";
import { GALLETA_SESION, huella } from "@/servidor/sesion";

export async function entrarSoporte() {
  const s = await exigirTecnico();
  const token = (await cookies()).get(GALLETA_SESION)?.value;
  if (!token) redirect("/entrar");
  await comoSistema(async (tx) => {
    const e = await tx`insert into soporte_entradas (tecnico_correo) values (${s.persona.correo}) returning id`;
    await tx`update sesiones set soporte_entrada_id = ${e[0].id} where id_hash = ${huella(token)}`;
  });
  after(() => avisarModoSoporte(s.persona.correo));
  redirect("/metricas/uso");
}

const CLAVES = [
  "limites.preguntasAlDia",
  "limites.materialesAlMes",
  "limites.materialesFormadorAlMes",
  "limites.topeAcademiaPreguntasMes",
  "limites.topeAcademiaMaterialesMes",
  "limites.alumnosIncluidos",
];

export async function guardarLimitesAcademia(valores: Record<string, number | null>) {
  await exigirTecnico();
  await comoSistema(async (tx) => {
    for (const k of CLAVES) {
      const v = valores[k];
      if (v === null || v === undefined || Number.isNaN(v)) await tx`delete from ajustes where clave = ${k}`;
      else if (v >= 0 && v <= 1_000_000) {
        await tx`insert into ajustes (clave, valor) values (${k}, ${tx.json(Math.round(v))}) on conflict (clave) do update set valor = excluded.valor, cambiado_at = now()`;
      }
    }
  });
  revalidatePath("/tecnico/limites");
  return { ok: true };
}

export async function guardarLimitesPersona(correo: string, preguntas: number | null, materiales: number | null) {
  await exigirTecnico();
  const f = await comoSistema(
    (tx) => tx`update personas set limite_preguntas_dia = ${preguntas}, limite_materiales_mes = ${materiales} where correo = ${correo.trim().toLowerCase()} returning id`,
  );
  revalidatePath("/tecnico/limites");
  return { ok: f.length > 0 };
}

export async function darDeBajaCuenta(correo: string) {
  await exigirTecnico();
  const f = await comoSistema(async (tx) => {
    const r = await tx`update personas set estado = 'baja', baja_at = now(), borrar_desde = now() + interval '30 days' where correo = ${correo.trim().toLowerCase()} and not es_dueno returning id`;
    if (r[0]) await tx`update sesiones set cerrada_at = now() where persona_id = ${r[0].id} and cerrada_at is null`;
    return r;
  });
  revalidatePath("/tecnico/limites");
  return { ok: f.length > 0 };
}
