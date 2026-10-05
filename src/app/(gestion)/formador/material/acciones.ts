"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirSesion, prohibirEnSoporte } from "@/servidor/sesion";

export async function guardarCompartir(materialId: string, grupoIds: string[]) {
  const s = await exigirSesion("formador");
  prohibirEnSoporte(s);
  await conSesion(s, async (tx) => {
    const m = await tx`select id from materiales where id = ${materialId} and propietario_id = ${s.persona.id} and es_de_formador`;
    if (!m[0]) return;
    await tx`delete from material_compartido where material_id = ${materialId} and not (grupo_id = any(${grupoIds}::uuid[]))`;
    for (const g of grupoIds) {
      await tx`
        insert into material_compartido (material_id, grupo_id, compartido_por) values (${materialId}, ${g}, ${s.persona.id})
        on conflict do nothing`;
    }
  });
  revalidatePath("/formador/material");
  return { ok: true };
}
