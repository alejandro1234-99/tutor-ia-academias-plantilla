import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Cita, Modo } from "@/tipos/chat";
import type { Resultado } from "../buscar";
import { anthropic, calcularConsumo, iaSimulada, MODELO_PRINCIPAL, MODELO_RAPIDO, type Consumo } from "./modelos";
import {
  INSTRUCCIONES_CONSULTA,
  INSTRUCCIONES_TITULO,
  instruccionesChat,
  MARCA_NO_ESTA,
  textoContexto,
  type ContextoAlumno,
} from "./instrucciones";
import { responderSimulado } from "./simulada";

// El chat: busca, le pasa a la IA solo los trozos que tocan (cada uno con
// su tema y su página) y va enviando la respuesta mientras se escribe, con
// la cita de cada bloque.

export type TurnoPrevio = { rol: "alumno" | "asistente" | "formador"; texto: string; estado: string };

export type EventoInterno =
  | { t: "texto"; v: string }
  | { t: "cita"; cita: Cita }
  | { t: "fin"; estado: "ok" | "no_esta" | "cortado"; consumo: Consumo; msPrimeraLetra: number | null };

export class ErrorIA extends Error {
  constructor(
    mensaje: string,
    public motivo: "sin_respuesta" | "tardanza" | "fallo",
  ) {
    super(mensaje);
  }
}

/** Título corto para la lista de conversaciones. */
export async function tituloConversacion(pregunta: string): Promise<{ titulo: string; consumo: Consumo | null }> {
  const corto = pregunta.replace(/\s+/g, " ").trim().replace(/^¿/, "").replace(/\?$/, "");
  if (iaSimulada() || !process.env.ANTHROPIC_API_KEY) {
    return { titulo: corto.length > 48 ? corto.slice(0, 46) + "…" : corto, consumo: null };
  }
  try {
    const r = await anthropic().messages.create({
      model: MODELO_RAPIDO,
      max_tokens: 30,
      system: INSTRUCCIONES_TITULO,
      messages: [{ role: "user", content: pregunta.slice(0, 1000) }],
    });
    const t = r.content.find((b) => b.type === "text");
    const titulo = (t && t.type === "text" ? t.text : corto).replace(/["«»\n.]/g, "").trim().slice(0, 60);
    return { titulo: titulo || corto.slice(0, 46), consumo: calcularConsumo(MODELO_RAPIDO, r.usage) };
  } catch {
    return { titulo: corto.slice(0, 46), consumo: null };
  }
}

/**
 * Prepara la búsqueda: la pregunta completada con la conversación (si es de
 * seguimiento) y, aparte, las palabras con que lo diría el texto de la ley,
 * para que el buscador por palabras encuentre el trozo aunque el alumno lo
 * diga de otra forma («enviar» → «cursar»). Ver buscarTemario.
 */
export async function prepararConsulta(
  pregunta: string,
  historial: TurnoPrevio[],
): Promise<{ consulta: string; terminos: string | null; consumo: Consumo | null }> {
  const previos = historial.filter((h) => h.texto.trim()).slice(-4);
  if (iaSimulada() || !process.env.ANTHROPIC_API_KEY) {
    const extra = previos.length ? " " + previos.filter((p) => p.rol === "alumno").slice(-1).map((p) => p.texto).join(" ") : "";
    return { consulta: pregunta + extra, terminos: null, consumo: null };
  }
  try {
    const conversacion = previos
      .map((h) => `${h.rol === "alumno" ? "Alumno" : h.rol === "formador" ? "Formador" : "Asistente"}: ${h.texto.slice(0, 700)}`)
      .join("\n");
    const r = await anthropic().messages.create(
      {
        model: MODELO_RAPIDO,
        max_tokens: previos.length ? 120 : 70,
        temperature: 0,
        system: INSTRUCCIONES_CONSULTA,
        messages: [{ role: "user", content: `${conversacion ? conversacion + "\n\n" : ""}Última pregunta del alumno: ${pregunta}` }],
      },
      // Si tarda, se busca sin ella: cada segundo aquí es un segundo más de espera para el alumno.
      { timeout: 2000, maxRetries: 0 },
    );
    const t = r.content.find((b) => b.type === "text");
    const texto = t && t.type === "text" ? t.text : "";
    const autonoma = texto.match(/PREGUNTA:\s*(.+)/i)?.[1]?.trim().slice(0, 300);
    const palabras = texto.match(/PALABRAS:\s*(.+)/i)?.[1]?.trim().slice(0, 300);
    // La pregunta tal cual se usa si no hay conversación previa: es lo más fiable.
    const consulta = previos.length && autonoma ? autonoma : pregunta;
    return { consulta, terminos: palabras || null, consumo: calcularConsumo(MODELO_RAPIDO, r.usage) };
  } catch {
    return { consulta: pregunta, terminos: null, consumo: null };
  }
}

function etiquetaTitulo(r: Resultado): string {
  if (r.tipo === "nota") {
    return `Nota del formador · Tema ${r.temaNumero} · ${r.temaNombre}`;
  }
  const arts = r.articulos.filter(Boolean).slice(0, 4).map((a) => (/^\d/.test(a) ? `art. ${a}` : a));
  return `Tema ${r.temaNumero} · ${r.temaNombre}${arts.length ? " · " + arts.join(", ") : ""} · página ${r.paginaImpresa ?? r.pagina}`;
}

/** Cada trozo como un resultado de búsqueda, párrafo a párrafo (para citar fino). */
function bloquesBusqueda(resultados: Resultado[]): Anthropic.SearchResultBlockParam[] {
  return resultados.map((r) => ({
    type: "search_result" as const,
    source: `${r.tipo}:${r.id}`,
    title: etiquetaTitulo(r),
    content:
      r.tipo === "nota" || r.parrafos.length === 0
        ? [{ type: "text" as const, text: r.texto }]
        : r.parrafos.map((p) => ({ type: "text" as const, text: p.t })),
    citations: { enabled: true },
  }));
}

/** De una cita de la IA a nuestra cita (tema, artículo, página y párrafos). */
export function citaDeResultado(r: Resultado, desdeBloque: number, hastaBloque: number): Cita {
  if (r.tipo === "nota") {
    return { tipo: "nota", temaId: r.temaId, temaNumero: r.temaNumero, temaNombre: r.temaNombre, notaId: r.id, autorNombre: r.autorNombre, fecha: r.fecha ?? new Date().toISOString() };
  }
  const sel = r.parrafos.slice(desdeBloque, Math.max(desdeBloque + 1, hastaBloque));
  const articulo = sel.find((p) => p.art)?.art ?? r.articulos[0] ?? null;
  return {
    tipo: "temario",
    temaId: r.temaId,
    temaNumero: r.temaNumero,
    temaNombre: r.temaNombre,
    versionId: r.versionId!,
    pagina: r.pagina!,
    paginaImpresa: r.paginaImpresa,
    articulo,
    parrafos: sel.map((p) => p.i),
  };
}

function mensajesPrevios(historial: TurnoPrevio[]): Anthropic.MessageParam[] {
  const res: Anthropic.MessageParam[] = [];
  for (const h of historial.slice(-12)) {
    if (h.estado === "error" || !h.texto.trim()) continue;
    if (h.rol === "alumno") res.push({ role: "user", content: h.texto });
    else if (h.rol === "formador") res.push({ role: "assistant", content: `[Respuesta del formador de la academia] ${h.texto}` });
    else if (h.estado === "no_esta") res.push({ role: "assistant", content: "(Eso no aparecía en el temario.)" });
    else res.push({ role: "assistant", content: h.texto });
  }
  while (res.length && res[0].role !== "user") res.shift();
  return res;
}

// Va al final de cada mensaje, justo antes de contestar: es la norma que más
// cuesta cumplir cuando el buscador no ha traído el trozo bueno.
const RECORDATORIO = `<recordatorio>Salvo que el alumno solo salude o dé las gracias: contesta únicamente con lo que dicen los resultados de este mensaje, y cada dato con su cita (también los consejos para memorizar). El dato que pide, ya en la primera frase; cifras, condiciones y excepciones, con las palabras exactas del temario. Si el dato exacto que pide no está en ellos, tu respuesta entera es ${MARCA_NO_ESTA}: no digas que no lo encuentras, no lo completes con lo que sepas («suele ser…») y no contestes otra cosa parecida.</recordatorio>`;

export async function* responder(entrada: {
  pregunta: string;
  modo: Modo;
  historial: TurnoPrevio[];
  contexto: ContextoAlumno;
  resultados: Resultado[];
  signal: AbortSignal;
}): AsyncGenerator<EventoInterno> {
  if (iaSimulada()) {
    yield* responderSimulado(entrada);
    return;
  }
  const inicio = Date.now();
  let msPrimeraLetra: number | null = null;

  const contenido: Anthropic.ContentBlockParam[] = [];
  if (entrada.resultados.length) contenido.push(...bloquesBusqueda(entrada.resultados));
  else contenido.push({ type: "text", text: "(El buscador no ha encontrado nada del temario para esta pregunta.)" });
  contenido.push({
    type: "text",
    text: `<contexto_del_alumno>\n${textoContexto(entrada.contexto, entrada.modo)}\n</contexto_del_alumno>\n\n<mensaje_del_alumno>\n${entrada.pregunta}\n</mensaje_del_alumno>\n\n${RECORDATORIO}`,
  });

  const mensajes: Anthropic.MessageParam[] = [...mensajesPrevios(entrada.historial), { role: "user", content: contenido }];

  // Si en 30 segundos no ha empezado a contestar, se corta.
  const control = new AbortController();
  const cortarPorTardanza = setTimeout(() => control.abort(new ErrorIA("tardanza", "tardanza")), 30_000);
  const cortarTotal = setTimeout(() => control.abort(new ErrorIA("tardanza", "tardanza")), 120_000);
  entrada.signal.addEventListener("abort", () => control.abort(entrada.signal.reason));

  let stream;
  try {
    stream = anthropic().messages.stream(
      {
        model: MODELO_PRINCIPAL,
        max_tokens: 2500,
        thinking: { type: "disabled" },
        system: [{ type: "text", text: instruccionesChat(), cache_control: { type: "ephemeral" } }],
        messages: mensajes,
      },
      { signal: control.signal, maxRetries: 1 },
    );
  } catch (e) {
    clearTimeout(cortarPorTardanza);
    clearTimeout(cortarTotal);
    throw new ErrorIA((e as Error).message, "fallo");
  }

  let texto = ""; // lo que ya se ha enviado al alumno
  let colchon = ""; // primeras letras, para detectar «no está en el temario»
  let decidido = false;
  let noEsta = false;
  let inicioBloque = 0;
  let citasBloque: Cita[] = [];
  let estado: "ok" | "cortado" = "ok";

  try {
    for await (const ev of stream) {
      if (ev.type === "content_block_start" && ev.content_block.type === "text") {
        inicioBloque = texto.length + colchon.length;
        citasBloque = [];
      } else if (ev.type === "content_block_delta") {
        if (ev.delta.type === "text_delta") {
          if (msPrimeraLetra === null) {
            msPrimeraLetra = Date.now() - inicio;
            clearTimeout(cortarPorTardanza);
          }
          if (noEsta) continue;
          if (!decidido) {
            colchon += ev.delta.text;
            const limpio = colchon.trimStart();
            if (limpio.startsWith(MARCA_NO_ESTA) || (limpio.length < MARCA_NO_ESTA.length && MARCA_NO_ESTA.startsWith(limpio))) {
              if (limpio.startsWith(MARCA_NO_ESTA)) {
                noEsta = true;
                decidido = true;
              }
              continue;
            }
            decidido = true;
            const v = colchon.trimStart();
            colchon = "";
            texto += v;
            yield { t: "texto", v };
          } else {
            texto += ev.delta.text;
            yield { t: "texto", v: ev.delta.text };
          }
        } else if (ev.delta.type === "citations_delta") {
          const c = ev.delta.citation;
          if (c.type === "search_result_location") {
            const r = entrada.resultados[c.search_result_index];
            if (r) citasBloque.push(citaDeResultado(r, c.start_block_index, c.end_block_index));
          }
        }
      } else if (ev.type === "content_block_stop") {
        if (!noEsta && citasBloque.length) {
          const fin = texto.length;
          for (const c of citasBloque) yield { t: "cita", cita: { ...c, desde: inicioBloque, hasta: fin } };
        }
        citasBloque = [];
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "max_tokens") estado = "cortado";
    if (final.stop_reason === "refusal") noEsta = true;
    if (!decidido && colchon.trim() && !noEsta) {
      texto += colchon;
      yield { t: "texto", v: colchon };
    }
    yield {
      t: "fin",
      estado: noEsta ? "no_esta" : estado,
      consumo: calcularConsumo(MODELO_PRINCIPAL, final.usage),
      msPrimeraLetra,
    };
  } catch (e) {
    const motivo = control.signal.reason instanceof ErrorIA ? control.signal.reason.motivo : "fallo";
    if (texto.length > 0) {
      // Se ha cortado a mitad: lo escrito se queda, con el aviso.
      yield { t: "fin", estado: "cortado", consumo: calcularConsumo(MODELO_PRINCIPAL, null), msPrimeraLetra };
      return;
    }
    throw new ErrorIA((e as Error).message, motivo === "tardanza" ? "tardanza" : "fallo");
  } finally {
    clearTimeout(cortarPorTardanza);
    clearTimeout(cortarTotal);
  }
}
