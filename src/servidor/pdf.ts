import "server-only";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, type RGB } from "pdf-lib";
import { config } from "@/configuracion";
import type { MaterialVista } from "./materiales";
import {
  tipoMaterial,
  type CitaMaterial,
  type ContenidoCornell,
  type ContenidoEjecutivo,
  type ContenidoMapa,
  type ContenidoPresentacion,
  type ContenidoResumenEsquema,
  type ContenidoTarjetas,
  type ContenidoTest,
} from "@/tipos/material";

// El material en PDF, con el logo y los colores de la academia (SOLUCION.md,
// sección 9). Se genera dentro de la propia web, sin servicios aparte.

function hexARgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const TINTA = rgb(0.086, 0.086, 0.059);
const GRIS = rgb(0.34, 0.33, 0.31);
const LINEA = rgb(0.9, 0.886, 0.855);

// Las letras estándar del PDF no tienen algunos signos: se cambian por otros.
function apto(t: string): string {
  return t
    .replace(/↳/g, "›")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[^\x20-\x7E¡-ÿ\n]/g, "");
}

type Trozo = { texto: string; negrita: boolean };
function trozos(texto: string): Trozo[] {
  return apto(texto)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p) => (p.startsWith("**") && p.endsWith("**") ? { texto: p.slice(2, -2), negrita: true } : { texto: p, negrita: false }));
}

class Documento {
  doc!: PDFDocument;
  normal!: PDFFont;
  negrita!: PDFFont;
  serif!: PDFFont;
  icono: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  pagina!: PDFPage;
  y = 0;
  ancho = 595.28;
  alto = 841.89;
  margen = 56;
  marca = hexARgb(config.colorPrincipal);
  titulo = "";

  static async crear(titulo: string) {
    const d = new Documento();
    d.doc = await PDFDocument.create();
    d.doc.setTitle(apto(titulo));
    d.doc.setAuthor(config.nombre);
    d.doc.setCreator(config.nombre);
    d.normal = await d.doc.embedFont(StandardFonts.Helvetica);
    d.negrita = await d.doc.embedFont(StandardFonts.HelveticaBold);
    d.serif = await d.doc.embedFont(StandardFonts.TimesRoman);
    try {
      d.icono = await d.doc.embedPng(Buffer.from(config.iconoBase64, "base64"));
    } catch {
      d.icono = null;
    }
    d.titulo = titulo;
    return d;
  }

  nuevaPagina(horizontal = false) {
    this.ancho = horizontal ? 841.89 : 595.28;
    this.alto = horizontal ? 595.28 : 841.89;
    this.pagina = this.doc.addPage([this.ancho, this.alto]);
    // Cabecera con el color y el icono de la academia.
    this.pagina.drawRectangle({ x: 0, y: this.alto - 44, width: this.ancho, height: 44, color: this.marca });
    if (this.icono) this.pagina.drawImage(this.icono, { x: this.margen, y: this.alto - 34, width: 24, height: 24 });
    this.pagina.drawText(apto(config.nombre), { x: this.margen + (this.icono ? 34 : 0), y: this.alto - 27, size: 11, font: this.negrita, color: rgb(1, 1, 1) });
    this.y = this.alto - 44 - 36;
  }

  sitio(necesario: number) {
    if (this.y - necesario < this.margen + 20) this.nuevaPagina();
  }

  /** Escribe un párrafo con negritas, ajustando las líneas al ancho. */
  parrafo(texto: string, o: { tam?: number; x?: number; ancho?: number; color?: RGB; negrita?: boolean; interlinea?: number; fuente?: PDFFont } = {}) {
    const tam = o.tam ?? 11;
    const x = o.x ?? this.margen;
    const ancho = o.ancho ?? this.ancho - this.margen - x;
    const inter = o.interlinea ?? tam * 1.45;
    const palabras: Trozo[] = [];
    for (const t of trozos(texto)) for (const w of t.texto.split(/(\s+)/)) if (w) palabras.push({ texto: w, negrita: t.negrita || !!o.negrita });
    let linea: Trozo[] = [];
    let anchoLinea = 0;
    const fuente = (t: Trozo) => (o.fuente ? o.fuente : t.negrita ? this.negrita : this.normal);
    const pintar = () => {
      this.sitio(inter);
      let cx = x;
      for (const t of linea) {
        this.pagina.drawText(t.texto, { x: cx, y: this.y - tam, size: tam, font: fuente(t), color: o.color ?? TINTA });
        cx += fuente(t).widthOfTextAtSize(t.texto, tam);
      }
      this.y -= inter;
      linea = [];
      anchoLinea = 0;
    };
    for (const p of palabras) {
      if (p.texto.includes("\n")) {
        pintar();
        continue;
      }
      const w = fuente(p).widthOfTextAtSize(p.texto, tam);
      if (anchoLinea + w > ancho && linea.length && p.texto.trim()) pintar();
      if (!linea.length && !p.texto.trim()) continue;
      linea.push(p);
      anchoLinea += w;
    }
    if (linea.length) pintar();
  }

  cita(c: CitaMaterial | undefined, temas: { numero: number; nombre: string }[], x = this.margen) {
    if (!c) return;
    const tema = temas.find((t) => t.numero === c.tema);
    const art = c.articulo ? (/^\d/.test(c.articulo) ? `art. ${c.articulo}` : c.articulo) : null;
    const texto = ["› Tema " + c.tema, tema?.nombre, art, `página ${c.pagina}`].filter(Boolean).join(" · ");
    this.parrafo(texto, { tam: 9, x, color: this.marca });
    this.y -= 4;
  }

  espacio(n: number) {
    this.y -= n;
  }

  async terminar(): Promise<Uint8Array> {
    const paginas = this.doc.getPages();
    paginas.forEach((p, i) => {
      const { width } = p.getSize();
      p.drawLine({ start: { x: this.margen, y: 40 }, end: { x: width - this.margen, y: 40 }, thickness: 0.5, color: LINEA });
      p.drawText(apto(`${this.titulo}`).slice(0, 90), { x: this.margen, y: 26, size: 8, font: this.normal, color: GRIS });
      const num = `${i + 1} / ${paginas.length}`;
      p.drawText(num, { x: width - this.margen - this.normal.widthOfTextAtSize(num, 8), y: 26, size: 8, font: this.normal, color: GRIS });
      const pie = apto(config.pie.funcionaCon);
      p.drawText(pie, { x: width / 2 - this.normal.widthOfTextAtSize(pie, 7) / 2, y: 14, size: 7, font: this.normal, color: GRIS });
    });
    return this.doc.save();
  }
}

function portada(d: Documento, m: MaterialVista) {
  d.nuevaPagina();
  d.parrafo(`${tipoMaterial(m.formato, m.estilo)} · ${m.temas.map((t) => `Tema ${t.numero} · ${t.nombre}`).join(" / ")}`, { tam: 10, color: GRIS });
  d.espacio(6);
  d.parrafo(m.titulo, { tam: 24, fuente: d.serif, interlinea: 28 });
  d.espacio(14);
}

async function escribirMaterial(d: Documento, m: MaterialVista) {
  const c = m.contenido as unknown;
  const temas = m.temas;
  if (m.formato === "presentacion") {
    const p = c as ContenidoPresentacion;
    p.diapositivas.forEach((s, i) => {
      d.nuevaPagina(true);
      d.pagina.drawRectangle({ x: 0, y: 0, width: 10, height: d.alto - 44, color: d.marca });
      d.y = d.alto - 44 - 56;
      d.parrafo(s.titulo, { tam: 30, fuente: d.serif, interlinea: 34, x: 70 });
      d.espacio(18);
      for (const idea of s.ideas) {
        d.parrafo(`•  ${idea}`, { tam: 17, x: 76, interlinea: 26 });
        d.espacio(6);
      }
      d.y = 70;
      d.cita(s.cita, temas, 70);
      const n = `${i + 1} / ${p.diapositivas.length}`;
      d.pagina.drawText(n, { x: d.ancho - 56 - d.normal.widthOfTextAtSize(n, 10), y: 70 - 10, size: 10, font: d.normal, color: GRIS });
    });
    return;
  }
  portada(d, m);
  if (m.formato === "resumen" && m.estilo === "cornell") {
    const x = c as ContenidoCornell;
    for (const f of x.filas) {
      d.sitio(60);
      const inicio = d.y;
      d.parrafo(f.pregunta, { negrita: true, ancho: 160, tam: 11 });
      const trasPregunta = d.y;
      d.y = inicio;
      for (const n of f.notas) d.parrafo(`•  ${n}`, { x: d.margen + 180, tam: 11 });
      d.cita(f.cita, temas, d.margen + 180);
      d.y = Math.min(d.y, trasPregunta) - 8;
      d.pagina.drawLine({ start: { x: d.margen, y: d.y + 4 }, end: { x: d.ancho - d.margen, y: d.y + 4 }, thickness: 0.5, color: LINEA });
      d.espacio(8);
    }
    d.espacio(8);
    d.parrafo("Resumen", { negrita: true, tam: 12 });
    d.parrafo(x.resumen, { tam: 11 });
    return;
  }
  if (m.formato === "resumen" && m.estilo === "ejecutivo") {
    const x = c as ContenidoEjecutivo;
    for (const a of x.apartados) {
      d.sitio(50);
      d.parrafo(a.titulo, { negrita: true, tam: 13 });
      d.parrafo(a.texto, { tam: 11 });
      d.cita(a.cita, temas);
      d.espacio(8);
    }
    return;
  }
  if (m.formato === "resumen") {
    const x = c as ContenidoResumenEsquema;
    for (const b of x.bloques) {
      d.sitio(50);
      d.parrafo(b.titulo, { negrita: true, tam: 13 });
      for (const p of b.puntos) {
        d.parrafo(`•  ${p.texto}`, { tam: 11, x: d.margen + 8 });
        for (const sp of p.subpuntos ?? []) d.parrafo(`–  ${sp}`, { tam: 10.5, x: d.margen + 26 });
      }
      d.cita(b.cita, temas);
      d.espacio(8);
    }
    return;
  }
  if (m.formato === "esquema") {
    const x = c as ContenidoMapa;
    for (const r of x.ramas) {
      d.sitio(40);
      d.parrafo(r.texto, { negrita: true, tam: 13 });
      d.cita(r.cita, temas);
      for (const h of r.hijos) {
        d.parrafo(`•  ${h.texto}`, { tam: 11, x: d.margen + 14 });
        for (const n of h.hijos ?? []) d.parrafo(`–  ${n.texto}`, { tam: 10.5, x: d.margen + 32 });
      }
      d.espacio(10);
    }
    return;
  }
  if (m.formato === "tarjetas") {
    const x = c as ContenidoTarjetas;
    x.tarjetas.forEach((t, i) => {
      d.sitio(60);
      d.parrafo(`${i + 1}. ${t.pregunta}`, { negrita: true, tam: 11 });
      if (t.dato) d.parrafo(t.dato, { tam: 16, fuente: d.serif, x: d.margen + 14 });
      d.parrafo(t.respuesta, { tam: 11, x: d.margen + 14 });
      d.cita(t.cita, temas, d.margen + 14);
      d.espacio(6);
    });
    return;
  }
  if (m.formato === "test" || m.formato === "simulacro") {
    const x = c as ContenidoTest;
    const letras = ["A", "B", "C", "D"];
    x.preguntas.forEach((q, i) => {
      d.sitio(80);
      d.parrafo(`${i + 1}. ${q.enunciado}`, { negrita: true, tam: 11 });
      q.opciones.forEach((o, j) => d.parrafo(`${letras[j]})  ${o}`, { tam: 11, x: d.margen + 14 }));
      d.espacio(8);
    });
    d.nuevaPagina();
    d.parrafo("Soluciones", { tam: 20, fuente: d.serif });
    d.espacio(10);
    x.preguntas.forEach((q, i) => {
      d.sitio(50);
      d.parrafo(`${i + 1}. ${letras[q.correcta]}) ${q.opciones[q.correcta]}`, { negrita: true, tam: 10.5 });
      d.parrafo(q.justificacion, { tam: 10, color: GRIS });
      d.cita(q.cita, temas);
      d.espacio(4);
    });
  }
}

export async function pdfMaterial(m: MaterialVista): Promise<Uint8Array> {
  const d = await Documento.crear(m.titulo);
  await escribirMaterial(d, m);
  return d.terminar();
}

/** Toda la biblioteca en un solo PDF (Mi cuenta). */
export async function pdfBiblioteca(materiales: MaterialVista[], titulo: string): Promise<Uint8Array> {
  const d = await Documento.crear(titulo);
  if (materiales.length === 0) {
    d.nuevaPagina();
    d.parrafo(titulo, { tam: 24, fuente: d.serif });
    d.parrafo("Tu biblioteca está vacía.", { tam: 12, color: GRIS });
  }
  for (const m of materiales) {
    if (m.estado !== "listo" || !m.contenido || (m.contenido as { suficiente?: boolean }).suficiente === false) continue;
    await escribirMaterial(d, m);
  }
  return d.terminar();
}

export function nombreArchivo(titulo: string): string {
  return (
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "material"
  );
}
