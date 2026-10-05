import "server-only";
import type { Tx } from "./bd";
import type { ContenidoTarjetas, ContenidoTest, CitaMaterial } from "@/tipos/material";

// «Repasar hoy» (SOLUCION.md, 8.5): repetición espaciada, la misma idea que
// Anki. Si la sabes, tarda más en volver; si fallas, vuelve pronto. Repasar
// no usa la IA, así que no gasta ningún límite.

export type ElementoRepaso =
  | {
      tipo: "tarjeta";
      materialId: string;
      indice: number;
      pregunta: string;
      respuesta: string;
      dato: string;
      literal: boolean;
      cita: CitaMaterial & { versionId?: string; paginaPdf?: number; parrafos?: number[] };
      temas: { numero: number; nombre: string }[];
    }
  | {
      tipo: "pregunta";
      materialId: string;
      indice: number;
      enunciado: string;
      opciones: string[];
      correcta: number;
      justificacion: string;
      cita: CitaMaterial & { versionId?: string; paginaPdf?: number; parrafos?: number[] };
      temas: { numero: number; nombre: string }[];
    };

export async function paraHoy(tx: Tx, alumnoId: string): Promise<ElementoRepaso[]> {
  const temas = await tx`select id, numero, coalesce(nombre_corto, nombre) as nombre from temas`;
  const nombreTemas = (ids: string[]) =>
    ids.map((id) => temas.find((t) => t.id === id)).filter(Boolean).map((t) => ({ numero: Number(t!.numero), nombre: t!.nombre as string }));
  const tarjetas = await tx`
    select r.material_id, r.indice, m.contenido, m.opciones, m.tema_ids
    from tarjetas_repaso r join materiales m on m.id = r.material_id
    where r.alumno_id = ${alumnoId} and r.proxima <= academia.hoy_madrid() and m.estado = 'listo'
    order by r.proxima, r.material_id, r.indice limit 200`;
  const falladas = await tx`
    select f.material_id, f.indice, m.contenido, m.tema_ids
    from preguntas_falladas f join materiales m on m.id = f.material_id
    where f.alumno_id = ${alumnoId} and f.resuelta_at is null and f.proxima <= academia.hoy_madrid() and m.estado = 'listo'
    order by f.fallada_at limit 100`;
  const res: ElementoRepaso[] = [];
  for (const t of tarjetas) {
    const x = (t.contenido as ContenidoTarjetas)?.tarjetas?.[t.indice as number];
    if (!x) continue;
    res.push({
      tipo: "tarjeta",
      materialId: t.materialId as string,
      indice: t.indice as number,
      pregunta: x.pregunta,
      respuesta: x.respuesta,
      dato: x.dato,
      literal: !!(t.opciones as { literal?: boolean })?.literal,
      cita: x.cita,
      temas: nombreTemas(t.temaIds as string[]),
    });
  }
  for (const f of falladas) {
    const q = (f.contenido as ContenidoTest)?.preguntas?.[f.indice as number];
    if (!q) continue;
    res.push({
      tipo: "pregunta",
      materialId: f.materialId as string,
      indice: f.indice as number,
      enunciado: q.enunciado,
      opciones: q.opciones,
      correcta: q.correcta,
      justificacion: q.justificacion,
      cita: q.cita,
      temas: nombreTemas(f.temaIds as string[]),
    });
  }
  return res;
}

export async function paraManana(tx: Tx, alumnoId: string): Promise<number> {
  const f = await tx`
    select (select count(*) from tarjetas_repaso where alumno_id = ${alumnoId} and proxima = academia.hoy_madrid() + 1)
         + (select count(*) from preguntas_falladas where alumno_id = ${alumnoId} and resuelta_at is null and proxima = academia.hoy_madrid() + 1) as n`;
  return Number(f[0].n);
}

/** La sabía / No la sabía. */
export async function responderTarjeta(tx: Tx, alumnoId: string, materialId: string, indice: number, sabia: boolean) {
  const f = await tx`select intervalo, facilidad, repeticiones from tarjetas_repaso where alumno_id = ${alumnoId} and material_id = ${materialId} and indice = ${indice}`;
  if (!f[0]) return;
  let intervalo = Number(f[0].intervalo);
  let facilidad = Number(f[0].facilidad);
  let repeticiones = Number(f[0].repeticiones);
  if (sabia) {
    repeticiones += 1;
    intervalo = repeticiones === 1 ? 3 : repeticiones === 2 ? 7 : Math.round(Math.max(intervalo, 1) * facilidad);
    facilidad = Math.min(3, facilidad + 0.05);
  } else {
    repeticiones = 0;
    intervalo = 1;
    facilidad = Math.max(1.3, facilidad - 0.2);
  }
  await tx`
    update tarjetas_repaso set intervalo = ${intervalo}, facilidad = ${facilidad}, repeticiones = ${repeticiones},
      proxima = academia.hoy_madrid() + ${intervalo}::int, ultima_respuesta = ${sabia ? "la_sabia" : "no_la_sabia"}, ultima_at = now()
    where alumno_id = ${alumnoId} and material_id = ${materialId} and indice = ${indice}`;
}

export async function responderFallada(tx: Tx, alumnoId: string, materialId: string, indice: number, acierto: boolean) {
  if (acierto) {
    await tx`update preguntas_falladas set resuelta_at = now() where alumno_id = ${alumnoId} and material_id = ${materialId} and indice = ${indice}`;
  } else {
    await tx`update preguntas_falladas set proxima = academia.hoy_madrid() + 1, fallada_at = now() where alumno_id = ${alumnoId} and material_id = ${materialId} and indice = ${indice}`;
  }
}

/** Añade al repaso unas tarjetas (por ejemplo, las que ha compartido el formador). */
export async function anadirTarjetas(tx: Tx, alumnoId: string, materialId: string): Promise<void> {
  const m = await tx`select contenido from materiales where id = ${materialId} and formato = 'tarjetas' and estado = 'listo'`;
  const n = (m[0]?.contenido as ContenidoTarjetas | undefined)?.tarjetas?.length ?? 0;
  if (!n) return;
  await tx`
    insert into tarjetas_repaso (alumno_id, material_id, indice, proxima)
    select ${alumnoId}, ${materialId}, g, academia.hoy_madrid() from generate_series(0, ${n - 1}) g
    on conflict do nothing`;
}
