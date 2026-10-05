import "server-only";
import type { Tx } from "./bd";
import { huellaConsulta, vectorSql } from "./ia/huellas";

// Buscar en el temario los trozos que tocan (SOLUCION.md, 8.2): por
// palabras exactas («artículo 113») y por significado («¿qué pasa si me
// contestan tarde?»), las dos juntas, y se cogen los mejores.

export type Resultado = {
  tipo: "temario" | "nota";
  id: string;
  temaId: string;
  temaNumero: number;
  temaNombre: string;
  versionId: string | null;
  pagina: number | null;
  paginaImpresa: number | null;
  parrafoDesde: number | null;
  parrafos: { i: number; t: string; art: string | null }[];
  articulos: string[];
  texto: string;
  autorNombre: string | null;
  fecha: string | null;
  puntuacion: number;
};

/** «artículo 113», «art. 24», «arts. 112 y 113» → ["113", "24", "112"] */
export function articulosMencionados(texto: string): string[] {
  const res = new Set<string>();
  const re = /\bart(?:[íi]culos?|s?\.)\s*((?:\d+(?:\s?bis)?(?:\s*(?:,|y)\s*)?)+)/gi;
  for (const m of texto.matchAll(re)) {
    for (const n of m[1].match(/\d+(?:\s?bis)?/g) ?? []) res.add(n.replace(/\s+/g, " "));
  }
  return [...res];
}

/**
 * Busca los trozos que tocan. Con `extra` (las palabras con que lo diría la
 * ley, que prepara la IA rápida) hace dos búsquedas, una con la pregunta y
 * otra con la pregunta y esas palabras, y las mezcla: lo añadido encuentra
 * trozos que la pregunta sola no encuentra, sin quitarle peso a la pregunta.
 */
export async function buscarTemario(
  tx: Tx,
  consulta: string,
  opciones: {
    limite?: number;
    oposicionId?: string | null;
    temas?: string[] | null;
    extra?: string | null;
    /** La huella de la consulta, si ya se ha pedido antes (en paralelo con otra cosa). */
    huella?: Promise<number[] | null>;
  } = {},
): Promise<Resultado[]> {
  const limite = opciones.limite ?? 6;
  const huella = await (opciones.huella ?? huellaConsulta(consulta));
  const extra = opciones.extra?.trim();
  const base = await buscarUnaVez(tx, consulta, huella, extra ? limite * 2 : limite, opciones);
  if (!extra) return base;
  const ampliada = await buscarUnaVez(tx, `${consulta} ${extra}`, huella, limite * 2, opciones);
  const mezcla = new Map<string, { r: Resultado; s: number }>();
  for (const lista of [base, ampliada]) {
    lista
      .filter((r) => r.tipo === "temario")
      .forEach((r, i) => {
        const x = mezcla.get(r.id) ?? { r, s: 0 };
        x.s += 1 / (60 + i);
        mezcla.set(r.id, x);
      });
  }
  const temario = [...mezcla.values()]
    .sort((a, b) => b.s - a.s)
    .slice(0, limite)
    .map((x) => ({ ...x.r, puntuacion: x.s }));
  // Las notas del formador, solo si vienen a cuento de la pregunta tal cual.
  const notas = base.filter((r) => r.tipo === "nota");
  return [...temario, ...notas];
}

async function buscarUnaVez(
  tx: Tx,
  consulta: string,
  huella: number[] | null,
  limite: number,
  opciones: { oposicionId?: string | null; temas?: string[] | null },
): Promise<Resultado[]> {
  const filas = await tx`
    select * from academia.buscar_temario(
      ${consulta}, ${vectorSql(huella)}::extensions.vector, ${articulosMencionados(consulta)}::text[],
      ${limite}, ${opciones.oposicionId ?? null}::uuid, ${opciones.temas ?? null}::uuid[])`;
  return filas.map((f) => ({
    tipo: f.tipo as "temario" | "nota",
    id: f.id as string,
    temaId: f.temaId as string,
    temaNumero: Number(f.temaNumero),
    temaNombre: f.temaNombre as string,
    versionId: (f.versionId as string) ?? null,
    pagina: f.pagina === null ? null : Number(f.pagina),
    paginaImpresa: f.paginaImpresa === null ? null : Number(f.paginaImpresa),
    parrafoDesde: f.parrafoDesde === null ? null : Number(f.parrafoDesde),
    parrafos: (f.parrafos as Resultado["parrafos"]) ?? [],
    articulos: (f.articulos as string[]) ?? [],
    texto: f.texto as string,
    autorNombre: (f.autorNombre as string) ?? null,
    fecha: f.fecha ? new Date(f.fecha as string).toISOString() : null,
    puntuacion: Number(f.puntuacion),
  }));
}
