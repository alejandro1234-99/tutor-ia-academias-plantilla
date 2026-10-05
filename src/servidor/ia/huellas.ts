import "server-only";

// Huellas para buscar por significado (Voyage AI). Convierten un texto en
// una lista de números: dos textos que dicen lo mismo con otras palabras
// tienen huellas parecidas. Sin clave de Voyage, la búsqueda sigue
// funcionando solo por palabras exactas.

export const MODELO_HUELLAS = process.env.MODELO_HUELLAS || "voyage-3.5";
const LOTE = 96;

export function hayHuellas(): boolean {
  return !!process.env.VOYAGE_API_KEY;
}

export async function huellas(textos: string[], tipo: "document" | "query"): Promise<number[][] | null> {
  const clave = process.env.VOYAGE_API_KEY;
  if (!clave || textos.length === 0) return null;
  const resultado: number[][] = [];
  for (let i = 0; i < textos.length; i += LOTE) {
    const lote = textos.slice(i, i + LOTE);
    let intento = 0;
    for (;;) {
      const r = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: lote, model: MODELO_HUELLAS, input_type: tipo, output_dimension: 1024 }),
        signal: AbortSignal.timeout(tipo === "query" ? 8000 : 60000),
      });
      if (r.status === 429 && intento < 4) {
        intento++;
        await new Promise((res) => setTimeout(res, 1500 * intento));
        continue;
      }
      if (!r.ok) {
        throw new Error(`Voyage respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
      }
      const j = (await r.json()) as { data: { embedding: number[]; index: number }[] };
      for (const d of j.data.sort((a, b) => a.index - b.index)) resultado.push(d.embedding);
      break;
    }
  }
  return resultado;
}

/** Huella de una pregunta; si falla, se busca solo por palabras. */
export async function huellaConsulta(texto: string): Promise<number[] | null> {
  try {
    const h = await huellas([texto], "query");
    return h ? h[0] : null;
  } catch {
    return null;
  }
}

export function vectorSql(v: number[] | null): string | null {
  return v ? `[${v.join(",")}]` : null;
}
