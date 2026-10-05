// Tipos que comparten el servidor y la pantalla del chat.

export type Modo = "resolver" | "guiado" | "examinador";

export type Cita =
  | {
      tipo: "temario";
      temaId: string;
      temaNumero: number;
      temaNombre: string;
      versionId: string;
      pagina: number; // hoja del PDF
      paginaImpresa: number | null; // la que se cita
      articulo: string | null;
      parrafos: number[]; // párrafos de la página que hay que resaltar
      desde?: number; // posición en el texto de la respuesta
      hasta?: number;
    }
  | {
      tipo: "nota";
      temaId: string;
      temaNumero: number;
      temaNombre?: string;
      notaId: string;
      autorNombre?: string | null;
      fecha: string;
      desde?: number;
      hasta?: number;
    };

export type EstadoMensaje = "ok" | "cortado" | "error" | "no_esta" | "escribiendo";

export type MensajeVista = {
  id: string;
  rol: "alumno" | "asistente" | "formador";
  texto: string;
  citas: Cita[];
  estado: EstadoMensaje;
  modo: Modo | null;
  valoracion: "sirvio" | "no_sirvio" | null;
  errorAvisado: boolean;
  enviadaFormador: boolean;
  rechazadaFormador: boolean;
  autorNombre: string | null;
  creadoAt: string;
};

/** Lo que el servidor manda al navegador mientras se escribe la respuesta. */
export type EventoChat =
  | { t: "inicio"; conversacionId: string; mensajeAlumnoId: string; mensajeId: string }
  | { t: "texto"; v: string }
  | { t: "cita"; cita: Cita }
  | { t: "fin"; estado: EstadoMensaje; quedan: number; texto: string; citas: Cita[] }
  | { t: "error"; mensaje: string };

export type Limite = {
  tipo: "preguntas" | "materiales";
  motivo: "alumno" | "academia";
  usados: number;
  limite: number;
  vuelve: string; // texto: «Mañana a las 00:00» o la fecha
};

export function etiquetaArticulo(art: string | null | undefined): string | null {
  if (!art) return null;
  return /^\d/.test(art) ? `art. ${art}` : art;
}

/** «Tema 1 · Constitución Española · art. 113 · página 23» */
export function textoCita(c: Cita, fechaCorta?: (iso: string) => string): string {
  if (c.tipo === "nota") {
    return `Nota del formador · Tema ${c.temaNumero}${fechaCorta ? " · " + fechaCorta(c.fecha) : ""}`;
  }
  const partes = [`Tema ${c.temaNumero}`, c.temaNombre];
  const art = etiquetaArticulo(c.articulo);
  if (art) partes.push(art);
  partes.push(`página ${c.paginaImpresa ?? c.pagina}`);
  return partes.join(" · ");
}

export function claveCita(c: Cita): string {
  return c.tipo === "nota" ? `n:${c.notaId}` : `t:${c.versionId}:${c.pagina}:${c.articulo ?? ""}`;
}
