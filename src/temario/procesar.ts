// Lectura del temario: del PDF a páginas, párrafos y trozos con su cita.
//
// Este archivo funciona igual en el navegador (el formador sube el PDF y se
// lee allí mismo) y en el servidor (datos de prueba). No depende de nada
// más que del texto que devuelve pdf.js.
//
// Qué hace:
//  1. Junta los pedacitos de texto de cada página en líneas y párrafos.
//  2. Quita la cabecera y el pie que se repiten en todas las páginas
//     («BOLETÍN OFICIAL DEL ESTADO», «Página 23»), y de ahí saca el número
//     de página impreso, que es el que se cita.
//  3. Marca las páginas de índice (las de «Artículo 5 . . . . . 16»), para
//     que el asistente no cite el índice en lugar del artículo.
//  4. Sigue el artículo en el que está cada párrafo, aunque cambie de página.
//  5. Parte cada página en trozos de unas 400 palabras, con su tema, su
//     página y sus artículos: de ahí salen las citas.

export type TipoParrafo = "normal" | "art" | "enc";
export type Parrafo = { t: string; k: TipoParrafo; art: string | null };

export type PaginaLeida = {
  numero: number; // hoja del PDF, desde 1
  numeroImpreso: number | null;
  parrafos: Parrafo[];
  esIndice: boolean;
  caracteres: number;
};

export type TrozoLeido = {
  pagina: number;
  paginaImpresa: number | null;
  orden: number;
  parrafoDesde: number;
  parrafoHasta: number;
  parrafos: { i: number; t: string; art: string | null }[];
  articulos: string[];
  texto: string;
  esIndice: boolean;
};

type Elemento = { str: string; x: number; y: number; alto: number; eol: boolean };
type Linea = { texto: string; x: number; y: number; alto: number };
export type PaginaCruda = { numero: number; alto: number; lineas: Linea[] };

// ---------------------------------------------------------------------
//  1. De los pedacitos de pdf.js a líneas
// ---------------------------------------------------------------------

type ItemPdf = { str?: string; transform?: number[]; height?: number; hasEOL?: boolean; width?: number };

export function lineasDeElementos(items: ItemPdf[]): Linea[] {
  const elementos: Elemento[] = [];
  for (const it of items) {
    if (typeof it.str !== "string" || !it.transform) continue;
    elementos.push({ str: it.str, x: it.transform[4], y: it.transform[5], alto: it.height || 0, eol: !!it.hasEOL });
  }
  // Agrupar por altura (y), de arriba abajo, y de izquierda a derecha.
  const ordenados = elementos.filter((e) => e.str.length > 0).sort((a, b) => b.y - a.y || a.x - b.x);
  const lineas: { y: number; items: Elemento[] }[] = [];
  for (const e of ordenados) {
    const l = lineas.find((l) => Math.abs(l.y - e.y) < 2.5);
    if (l) l.items.push(e);
    else lineas.push({ y: e.y, items: [e] });
  }
  return lineas
    .map((l) => {
      const items = l.items.sort((a, b) => a.x - b.x);
      let texto = "";
      for (const it of items) {
        if (texto && !texto.endsWith(" ") && !it.str.startsWith(" ")) {
          texto += " ";
        }
        texto += it.str;
      }
      texto = texto.replace(/\s+/g, " ").trim();
      const conTexto = items.filter((i) => i.str.trim());
      return {
        texto,
        x: conTexto.length ? conTexto[0].x : items[0].x,
        y: l.y,
        alto: Math.max(...items.map((i) => i.alto)),
      };
    })
    .filter((l) => l.texto.length > 0);
}

/** Lee las páginas [desde, hasta] de un documento de pdf.js. */
export async function leerPaginasCrudas(
  doc: { numPages: number; getPage: (n: number) => Promise<unknown> },
  desde: number,
  hasta: number,
): Promise<PaginaCruda[]> {
  const res: PaginaCruda[] = [];
  for (let n = desde; n <= Math.min(hasta, doc.numPages); n++) {
    const pagina = (await doc.getPage(n)) as {
      getTextContent: () => Promise<{ items: ItemPdf[] }>;
      getViewport: (o: { scale: number }) => { height: number };
      cleanup?: () => void;
    };
    const tc = await pagina.getTextContent();
    res.push({ numero: n, alto: pagina.getViewport({ scale: 1 }).height, lineas: lineasDeElementos(tc.items) });
    pagina.cleanup?.();
  }
  return res;
}

// ---------------------------------------------------------------------
//  2 y 3. Cabecera, pie, número impreso e índice
// ---------------------------------------------------------------------

const normalizar = (s: string) => s.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
const PUNTOS_INDICE = /(\.\s?){5,}\s*\d*\s*$/;
const NUMERO_PAGINA = /^(?:p[áa]g(?:ina)?\.?\s*)?(\d{1,4})(?:\s*(?:de|\/)\s*\d{1,4})?$/i;

// Cabecera y pie: la franja de arriba y la de abajo de la hoja. Un encabezado
// de artículo nunca se toma por cabecera.
function enMargen(l: Linea, alto: number): boolean {
  if (ART.test(l.texto) || DISPOSICION.test(l.texto)) return false;
  return l.y > alto * 0.92 || l.y < alto * 0.07;
}

function repetidas(paginas: PaginaCruda[]): Set<string> {
  const cuenta = new Map<string, number>();
  for (const p of paginas) {
    const vistas = new Set<string>();
    for (const l of p.lineas) {
      const cerca = enMargen(l, p.alto);
      if (!cerca) continue;
      const n = normalizar(l.texto);
      if (!vistas.has(n)) {
        vistas.add(n);
        cuenta.set(n, (cuenta.get(n) || 0) + 1);
      }
    }
  }
  const minimo = Math.max(2, Math.ceil(paginas.length * 0.3));
  return new Set([...cuenta.entries()].filter(([, c]) => c >= minimo).map(([n]) => n));
}

// ---------------------------------------------------------------------
//  4. Párrafos y artículos
// ---------------------------------------------------------------------

const ART = /^(?:Art[íi]culo|Art\.)\s+(\d+(?:\s?(?:bis|ter|quater|quinquies))?)\b\.?/i;
const DISPOSICION = /^Disposici[óo]n\s+(adicional|transitoria|derogatoria|final)(?:\s+([a-záéíóúñ]+))?/i;
const ENCABEZADO = /^(T[ÍI]TULO|CAP[ÍI]TULO|SECCI[ÓO]N|Secci[óo]n\s+\d|LIBRO|PRE[ÁA]MBULO|[ÍI]NDICE|ANEXO|Pre[áa]mbulo$)/;
const NUMERADO = /^(\d{1,3}\.|[a-zñ]\)|\d{1,3}\.ª|[IVXL]+\.)\s/;

function etiquetaArticulo(texto: string): string | null {
  const a = texto.match(ART);
  if (a) return a[1].replace(/\s+/g, " ").toLowerCase();
  const d = texto.match(DISPOSICION);
  if (d) return `disposición ${d[1].toLowerCase()}${d[2] ? " " + d[2].toLowerCase() : ""}`;
  return null;
}

function unir(a: string, b: string): string {
  if (/[a-záéíóúñ]-$/i.test(a) && /^[a-záéíóúñ]/.test(b)) return a.slice(0, -1) + b;
  return a + " " + b;
}

/** Convierte las páginas crudas en páginas con párrafos, índice y artículo. */
export function analizarPaginas(crudas: PaginaCruda[], articuloInicial: string | null = null): PaginaLeida[] {
  const fijas = repetidas(crudas);
  let articulo = articuloInicial;
  const resultado: PaginaLeida[] = [];

  for (const p of crudas) {
    let numeroImpreso: number | null = null;
    const cuerpo: Linea[] = [];
    for (const l of p.lineas) {
      const cerca = enMargen(l, p.alto);
      const m = l.texto.match(NUMERO_PAGINA);
      if (cerca && m && numeroImpreso === null) {
        numeroImpreso = Number(m[1]);
        continue;
      }
      if (cerca && fijas.has(normalizar(l.texto))) continue;
      cuerpo.push(l);
    }

    const conPuntos = cuerpo.filter((l) => PUNTOS_INDICE.test(l.texto)).length;
    const esIndice = cuerpo.length > 0 && conPuntos / cuerpo.length >= 0.3;

    // Margen izquierdo habitual y separación habitual entre líneas.
    const xs = cuerpo.map((l) => Math.round(l.x));
    const moda = new Map<number, number>();
    for (const x of xs) moda.set(x, (moda.get(x) || 0) + 1);
    const margen = [...moda.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
    const saltos = cuerpo.slice(1).map((l, i) => cuerpo[i].y - l.y).filter((d) => d > 0).sort((a, b) => a - b);
    const saltoTipico = saltos.length ? saltos[Math.floor(saltos.length / 2)] : 12;

    const parrafos: Parrafo[] = [];
    const articuloAntesDePagina = articulo;
    let actual: { t: string; k: TipoParrafo } | null = null;
    let anterior: Linea | null = null;
    const cerrar = () => {
      if (actual && actual.t.trim()) {
        const t = actual.t.replace(/\s+/g, " ").trim();
        if (actual.k === "art") {
          articulo = etiquetaArticulo(t) ?? articulo;
        } else if (actual.k === "enc") {
          if (/^PRE[ÁA]MBULO/i.test(t)) articulo = "preámbulo";
          else if (!/^[ÍI]NDICE/i.test(t)) articulo = null;
        }
        parrafos.push({ t, k: actual.k, art: articulo });
      }
      actual = null;
    };

    for (const l of cuerpo) {
      const texto = esIndice ? l.texto.replace(/(\.\s?){5,}/g, " … ") : l.texto;
      const esArt = ART.test(texto) || DISPOSICION.test(texto);
      const esEnc = !esArt && ENCABEZADO.test(texto);
      const sangrado = Math.round(l.x) > margen + 6;
      const hueco = anterior ? anterior.y - l.y > saltoTipico * 1.6 : false;
      const previo = actual as { t: string; k: TipoParrafo } | null;
      const numerado = NUMERADO.test(texto);
      // Un título partido en dos líneas («Artículo 65. Especialidades ... de
      // responsabilidad» + «patrimonial.») se une en un solo párrafo.
      const sigueTitulo =
        !!previo && previo.k !== "normal" && !/[.:]$/.test(previo.t) && !esArt && !esEnc && !numerado && !hueco;
      const nuevo =
        !previo ||
        esIndice ||
        esArt ||
        esEnc ||
        (!sigueTitulo && (previo.k !== "normal" || sangrado || hueco || (numerado && /[.:;]$/.test(previo.t))));
      if (nuevo) {
        cerrar();
        actual = { t: texto, k: esArt ? "art" : esEnc ? "enc" : "normal" };
      } else {
        actual!.t = unir(actual!.t, texto);
      }
      anterior = l;
    }
    cerrar();
    // El índice repite los nombres de los artículos: no cambia el artículo en curso.
    if (esIndice) {
      articulo = articuloAntesDePagina;
      for (const x of parrafos) x.art = null;
    }

    resultado.push({
      numero: p.numero,
      numeroImpreso,
      parrafos,
      esIndice,
      caracteres: parrafos.reduce((s, x) => s + x.t.length, 0),
    });
  }
  return resultado;
}

/** ¿Parece escaneado? (casi sin letras que se puedan seleccionar) */
export function pareceEscaneado(paginas: { caracteres: number }[]): boolean {
  if (paginas.length === 0) return true;
  const media = paginas.reduce((s, p) => s + p.caracteres, 0) / paginas.length;
  return media < 60;
}

// ---------------------------------------------------------------------
//  5. Trozos de unas 400 palabras, sin salir de la página
// ---------------------------------------------------------------------

const palabras = (s: string) => (s.match(/\S+/g) || []).length;

export function trocearPagina(p: PaginaLeida, ordenInicial = 0, objetivo = 400): TrozoLeido[] {
  const trozos: TrozoLeido[] = [];
  let desde = 0;
  let orden = ordenInicial;
  while (desde < p.parrafos.length) {
    let hasta = desde;
    let cuenta = palabras(p.parrafos[desde].t);
    while (hasta + 1 < p.parrafos.length && cuenta + palabras(p.parrafos[hasta + 1].t) <= objetivo * 1.15) {
      hasta++;
      cuenta += palabras(p.parrafos[hasta].t);
    }
    const sel = p.parrafos.slice(desde, hasta + 1).map((x, j) => ({ i: desde + j, t: x.t, art: x.art }));
    const articulos = [...new Set(sel.map((x) => x.art).filter((a): a is string => !!a))];
    trozos.push({
      pagina: p.numero,
      paginaImpresa: p.numeroImpreso,
      orden: orden++,
      parrafoDesde: desde,
      parrafoHasta: hasta,
      parrafos: sel,
      articulos,
      texto: sel.map((x) => x.t).join("\n"),
      esIndice: p.esIndice,
    });
    if (hasta + 1 >= p.parrafos.length) break;
    // Un poco de solape: el siguiente trozo repite el último párrafo si es corto.
    const ultimo = p.parrafos[hasta];
    desde = hasta > desde && palabras(ultimo.t) < 60 ? hasta : hasta + 1;
  }
  return trozos;
}

/** Texto que se usa para la huella de significado: con su contexto. */
export function textoParaHuella(trozo: TrozoLeido, tema: { numero: number; nombre: string }): string {
  const art = trozo.articulos.length ? ` · ${trozo.articulos.map(etiquetaCita).join(", ")}` : "";
  return `Tema ${tema.numero} · ${tema.nombre}${art}\n${trozo.texto}`;
}

/** «113» → «art. 113»; «disposición adicional primera» se queda igual. */
export function etiquetaCita(art: string): string {
  return /^\d/.test(art) ? `art. ${art}` : art;
}
