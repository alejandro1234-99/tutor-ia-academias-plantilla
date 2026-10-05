import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// La IA de Anthropic. La clave vive solo en el servidor (ANTHROPIC_API_KEY)
// y nunca llega al navegador.
//
//  - Sonnet 5: responder dudas y crear material.
//  - Haiku 4.5: tareas sencillas (preparar la búsqueda, la memoria, agrupar
//    dudas, poner título a las conversaciones).

export const MODELO_PRINCIPAL = process.env.MODELO_PRINCIPAL || "claude-sonnet-5";
export const MODELO_RAPIDO = process.env.MODELO_RAPIDO || "claude-haiku-4-5";

// Precios por millón de tokens (septiembre de 2026), en dólares.
const PRECIOS: Record<string, { entrada: number; salida: number }> = {
  "claude-sonnet-5": { entrada: 2, salida: 10 },
  "claude-haiku-4-5": { entrada: 1, salida: 5 },
};

export type Consumo = {
  modelo: string;
  tokensEntrada: number;
  tokensSalida: number;
  tokensCache: number;
  costeUsd: number;
};

export function calcularConsumo(modelo: string, u: Partial<Anthropic.Usage> | undefined | null): Consumo {
  const p = PRECIOS[modelo] ?? PRECIOS["claude-sonnet-5"];
  const entrada = u?.input_tokens ?? 0;
  const salida = u?.output_tokens ?? 0;
  const leidos = u?.cache_read_input_tokens ?? 0;
  const escritos = u?.cache_creation_input_tokens ?? 0;
  const coste = (entrada * p.entrada + escritos * p.entrada * 1.25 + leidos * p.entrada * 0.1 + salida * p.salida) / 1_000_000;
  return { modelo, tokensEntrada: entrada + escritos + leidos, tokensSalida: salida, tokensCache: leidos, costeUsd: coste };
}

export function sumarConsumos(a: Consumo, b: Consumo): Consumo {
  return {
    modelo: a.modelo,
    tokensEntrada: a.tokensEntrada + b.tokensEntrada,
    tokensSalida: a.tokensSalida + b.tokensSalida,
    tokensCache: a.tokensCache + b.tokensCache,
    costeUsd: a.costeUsd + b.costeUsd,
  };
}

let cliente: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!cliente) {
    cliente = new Anthropic({ maxRetries: 1, timeout: 120_000 });
  }
  return cliente;
}

/**
 * IA simulada, SOLO para probar en este servidor cuando no hay una clave
 * válida: contesta copiando trozos reales del temario, con su cita. Nunca
 * se usa en la web publicada.
 */
export function iaSimulada(): boolean {
  return process.env.IA_SIMULADA === "1" && (process.env.NODE_ENV !== "production" || process.env.MODO_PRUEBAS === "1");
}

/** Interruptor de pruebas: hacer fallar la IA a propósito (capa 1.5). */
export async function falloForzado(): Promise<boolean> {
  if (process.env.MODO_PRUEBAS !== "1") return false;
  const { comoSistema } = await import("../bd");
  const filas = await comoSistema((tx) => tx`select valor from ajustes where clave = 'pruebas.fallo_ia'`);
  return filas.length > 0 && filas[0].valor === true;
}
