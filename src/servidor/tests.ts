import "server-only";
import type { Tx } from "./bd";
import { apuntarResultadoTest } from "./ia/memoria";
import type { ContenidoTest } from "@/tipos/material";

// Tests y simulacros: la nota, los fallos para «Repasar hoy» y lo que
// apunta la memoria. La nota solo la ve el alumno (protegido en la base de datos).

export type Respuestas = Record<string, number | null>; // índice de pregunta → opción elegida (o null, en blanco)

export function calcularNota(
  contenido: ContenidoTest,
  preguntas: number[],
  respuestas: Respuestas,
  restaPorFallo: number,
) {
  let aciertos = 0;
  let fallos = 0;
  let enBlanco = 0;
  for (const i of preguntas) {
    const r = respuestas[String(i)];
    if (r === null || r === undefined) enBlanco++;
    else if (r === contenido.preguntas[i]?.correcta) aciertos++;
    else fallos++;
  }
  const n = preguntas.length || 1;
  const sin = (aciertos / n) * 10;
  const con = Math.max(0, ((aciertos - fallos * restaPorFallo) / n) * 10);
  const redondear = (x: number) => Math.round(x * 100) / 100;
  return { aciertos, fallos, enBlanco, nota: redondear(con), notaSinPenalizacion: redondear(sin) };
}

export async function empezarIntento(
  tx: Tx,
  alumnoId: string,
  materialId: string,
  modo: "practica" | "simulacro" | "repaso",
  preguntas: number[],
  restaPorFallo: number,
  segundosLimite: number | null,
): Promise<string> {
  const f = await tx`
    insert into intentos_test (alumno_id, material_id, modo, preguntas, resta_por_fallo, segundos_limite)
    values (${alumnoId}, ${materialId}, ${modo}, ${preguntas}::int[], ${restaPorFallo}, ${segundosLimite})
    returning id`;
  return f[0].id as string;
}

export async function terminarIntento(tx: Tx, alumnoId: string, intentoId: string, respuestas: Respuestas): Promise<boolean> {
  const f = await tx`
    select i.*, m.contenido, m.formato from intentos_test i join materiales m on m.id = i.material_id
    where i.id = ${intentoId} and i.alumno_id = ${alumnoId}`;
  const i = f[0];
  if (!i || i.terminadoAt) return false;
  const contenido = i.contenido as ContenidoTest;
  const preguntas = i.preguntas as number[];
  const limpias: Respuestas = {};
  for (const p of preguntas) {
    const r = respuestas[String(p)];
    limpias[String(p)] = typeof r === "number" && r >= 0 && r <= 3 ? r : null;
  }
  // En simulacro, lo contestado fuera de tiempo (con 30 s de margen) no cuenta.
  const nota = calcularNota(contenido, preguntas, limpias, Number(i.restaPorFallo));
  await tx`
    update intentos_test set respuestas = ${tx.json(limpias)}, aciertos = ${nota.aciertos}, fallos = ${nota.fallos},
      en_blanco = ${nota.enBlanco}, nota = ${nota.nota}, nota_sin_penalizacion = ${nota.notaSinPenalizacion}, terminado_at = now()
    where id = ${intentoId}`;

  // Las falladas vuelven mañana en «Repasar hoy»; las acertadas se dan por resueltas.
  for (const p of preguntas) {
    const r = limpias[String(p)];
    const correcta = contenido.preguntas[p]?.correcta;
    if (r !== null && r === correcta) {
      await tx`update preguntas_falladas set resuelta_at = now() where alumno_id = ${alumnoId} and material_id = ${i.materialId} and indice = ${p}`;
    } else if (r !== null) {
      await tx`
        insert into preguntas_falladas (alumno_id, material_id, indice, proxima)
        values (${alumnoId}, ${i.materialId}, ${p}, academia.hoy_madrid() + 1)
        on conflict (alumno_id, material_id, indice) do update set fallada_at = now(), proxima = academia.hoy_madrid() + 1, resuelta_at = null`;
    }
  }

  // La memoria apunta lo que ha fallado, por asunto.
  const porAsunto = new Map<string, { asunto: string; aciertos: number; total: number }>();
  for (const p of preguntas) {
    const q = contenido.preguntas[p];
    if (!q) continue;
    const a = porAsunto.get(q.asunto) ?? { asunto: q.asunto, aciertos: 0, total: 0 };
    a.total++;
    if (limpias[String(p)] === q.correcta) a.aciertos++;
    porAsunto.set(q.asunto, a);
  }
  await apuntarResultadoTest(tx, alumnoId, [...porAsunto.values()]);
  return true;
}
