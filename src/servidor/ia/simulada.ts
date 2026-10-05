import "server-only";
import type { Cita, Modo } from "@/tipos/chat";
import type { Resultado } from "../buscar";
import type { EventoInterno, TurnoPrevio } from "./chat";
import type { ContextoAlumno } from "./instrucciones";

// IA SIMULADA · SOLO PARA PROBAR EN ESTE SERVIDOR (IA_SIMULADA=1).
// No piensa: copia el párrafo del temario que más palabras comparte con la
// pregunta y lo cita. Sirve para probar pantallas, citas, visor, límites y
// fallos sin gastar ni necesitar la clave. En la web publicada nunca se usa.

const VACIAS = new Set(
  "que cual cuales cuando como donde quien quienes cuanto cuanta cuantos cuantas para por con sin sobre entre desde hasta hace falta puede pueden tengo tiene tienen esta este estos estas ese esa eso una unos unas los las del al lo le les se su sus mas pero porque segun tras dime explica explicame significa oposicion temario".split(" "),
);

export function raices(texto: string): string[] {
  return (texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-zñ0-9]+/g) ?? [])
    .filter((w) => (w.length >= 4 || /^\d+$/.test(w)) && !VACIAS.has(w))
    .map((w) => w.replace(/(es|s)$/, "").slice(0, 7));
}

function mejorParrafo(pregunta: string, resultados: Resultado[]) {
  const q = [...new Set(raices(pregunta))];
  let mejor: { r: Resultado; bloque: number; puntos: number } | null = null;
  for (const r of resultados.slice(0, 4)) {
    const bloques = r.tipo === "nota" || r.parrafos.length === 0 ? [{ i: 0, t: r.texto, art: null }] : r.parrafos;
    bloques.forEach((p, b) => {
      if (p.t.length < 40) return;
      const w = new Set(raices(p.t));
      const puntos = q.filter((x) => w.has(x)).length;
      if (!mejor || puntos > mejor.puntos) mejor = { r, bloque: b, puntos };
    });
  }
  const cobertura = q.length ? (mejor ? (mejor as { puntos: number }).puntos : 0) / q.length : 0;
  return { mejor: mejor as { r: Resultado; bloque: number; puntos: number } | null, cobertura };
}

function negritas(t: string): string {
  return t.replace(/\b(mayoría (?:absoluta|simple)|tres quintos|dos tercios|\d+ (?:días|meses|años|horas)|(?:un|dos|tres|cinco|diez|quince|treinta) (?:días|meses|años))\b/gi, "**$1**");
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function* escribir(texto: string): AsyncGenerator<EventoInterno> {
  for (const trozo of texto.match(/\S+\s*/g) ?? []) {
    await espera(12);
    yield { t: "texto", v: trozo };
  }
}

export async function* responderSimulado(e: {
  pregunta: string;
  modo: Modo;
  historial: TurnoPrevio[];
  contexto: ContextoAlumno;
  resultados: Resultado[];
}): AsyncGenerator<EventoInterno> {
  const inicio = Date.now();
  await espera(250);
  const consumo = { modelo: "simulada", tokensEntrada: 0, tokensSalida: 0, tokensCache: 0, costeUsd: 0 };
  const p = e.pregunta.trim();

  if (/^(hola|buenas|gracias|muchas gracias|adi[oó]s|hasta luego)\b/i.test(p) && p.length < 40) {
    yield* escribir(`¡De nada${e.contexto.comoLlamar ? ", " + e.contexto.comoLlamar : ""}! Pregúntame lo que quieras del temario.`);
    yield { t: "fin", estado: "ok", consumo, msPrimeraLetra: Date.now() - inicio };
    return;
  }
  if (/ignora (tus|las) (normas|instrucciones)|olvida (tus|las) (normas|instrucciones)|sin el temario/i.test(p)) {
    yield { t: "fin", estado: "no_esta", consumo, msPrimeraLetra: Date.now() - inicio };
    return;
  }

  const pideExamen = /preg[uú]ntame|exam[ií]name|hazme (una|otra) pregunta|ponme a prueba/i.test(p);
  const ultimaPreguntaIA = [...e.historial].reverse().find((h) => h.rol === "asistente" && h.texto.includes("Pregunta:"));
  const { mejor, cobertura } = mejorParrafo(p, e.resultados);

  // Más de la mitad de las palabras de la pregunta tienen que estar en el párrafo.
  if (!mejor || (cobertura < 0.6 && !(e.modo === "examinador" && (pideExamen || ultimaPreguntaIA)))) {
    yield { t: "fin", estado: "no_esta", consumo, msPrimeraLetra: Date.now() - inicio };
    return;
  }

  const r = mejor.r;
  const bloque = r.tipo === "nota" ? { t: r.texto } : r.parrafos[mejor.bloque];
  const cita: Cita =
    r.tipo === "nota"
      ? { tipo: "nota", temaId: r.temaId, temaNumero: r.temaNumero, temaNombre: r.temaNombre, notaId: r.id, autorNombre: r.autorNombre, fecha: r.fecha ?? new Date().toISOString() }
      : {
          tipo: "temario",
          temaId: r.temaId,
          temaNumero: r.temaNumero,
          temaNombre: r.temaNombre,
          versionId: r.versionId!,
          pagina: r.pagina!,
          paginaImpresa: r.paginaImpresa,
          articulo: r.parrafos[mejor.bloque]?.art ?? r.articulos[0] ?? null,
          parrafos: [r.parrafos[mejor.bloque]?.i ?? 0],
        };

  let intro = "";
  let cuerpo = negritas(bloque.t.replace(/^\d+\.\s/, ""));
  if (e.modo === "guiado") {
    const primeras = bloque.t.split(/\s+/).slice(0, 10).join(" ");
    intro = "Antes de darte la respuesta, piénsalo un momento: ¿qué órgano o qué requisito crees que interviene aquí? Te dejo una pista del temario:\n\n";
    cuerpo = `«${primeras}…»`;
  } else if (e.modo === "examinador" && pideExamen) {
    const palabras = bloque.t.replace(/^\d+\.\s/, "").split(/\s+/);
    const corte = Math.max(6, Math.floor(palabras.length * 0.6));
    intro = "Vamos allá. ";
    cuerpo = `Pregunta: completa esta frase del temario: «${palabras.slice(0, corte).join(" ")}…»`;
  } else if (e.modo === "examinador") {
    intro = "Vamos a comprobarlo. Lo que dice el temario es esto:\n\n";
    cuerpo = cuerpo + "\n\nSi no coincidía con lo que has contestado, repásalo. ¿Te hago otra pregunta?";
  } else {
    intro = "Según el temario:\n\n";
  }

  let texto = "";
  for await (const ev of escribir(intro)) {
    if (ev.t === "texto") texto += ev.v;
    yield ev;
  }
  const desde = texto.length;
  for await (const ev of escribir(cuerpo)) {
    if (ev.t === "texto") texto += ev.v;
    yield ev;
  }
  yield { t: "cita", cita: { ...cita, desde, hasta: texto.length } };
  yield { t: "fin", estado: "ok", consumo, msPrimeraLetra: Date.now() - inicio };
}
