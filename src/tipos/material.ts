// El material que crea la IA, formato por formato (SOLUCION.md, sección 9).
// Lo comparten el servidor (que lo genera y lo guarda) y las pantallas.
import { z } from "zod";

export type Formato = "resumen" | "esquema" | "presentacion" | "tarjetas" | "test" | "simulacro";
export type Estilo = "esquema" | "cornell" | "ejecutivo";
export type Dificultad = "facil" | "medio" | "oposicion";

export const CitaMaterial = z.object({
  tema: z.number().int().describe("Número del tema"),
  pagina: z.number().int().describe("Número de página tal como aparece en el temario ([[Página N]])"),
  articulo: z.string().nullable().describe("El artículo o disposición, por ejemplo «113» o «disposición adicional primera». null si no hay"),
});
export type CitaMaterial = z.infer<typeof CitaMaterial>;

const Base = {
  suficiente: z.boolean().describe("false si el temario elegido no tiene información suficiente para este formato"),
  motivo: z.string().describe("Si no es suficiente, por qué, en una frase para el alumno. Si lo es, cadena vacía"),
  titulo: z.string().describe("Título corto y claro del material, en español"),
};

export const ResumenEsquema = z.object({
  ...Base,
  bloques: z.array(
    z.object({
      titulo: z.string(),
      puntos: z.array(z.object({ texto: z.string().describe("Lo esencial. Pon en **negrita** lo memorizable"), subpuntos: z.array(z.string()) })),
      cita: CitaMaterial,
    }),
  ),
});

export const ResumenCornell = z.object({
  ...Base,
  filas: z.array(
    z.object({
      pregunta: z.string().describe("Pregunta clave (columna izquierda)"),
      notas: z.array(z.string()).describe("Notas que la responden (columna derecha). **Negrita** en lo memorizable"),
      cita: CitaMaterial,
    }),
  ),
  resumen: z.string().describe("Resumen final de 4 a 6 frases (zona de abajo)"),
});

export const ResumenEjecutivo = z.object({
  ...Base,
  apartados: z.array(z.object({ titulo: z.string(), texto: z.string().describe("Prosa corta, 2-4 frases"), cita: CitaMaterial })),
});

export const Mapa = z.object({
  ...Base,
  ramas: z.array(
    z.object({
      texto: z.string(),
      cita: CitaMaterial,
      hijos: z.array(
        z.object({
          texto: z.string(),
          cita: CitaMaterial,
          hijos: z.array(z.object({ texto: z.string(), cita: CitaMaterial })),
        }),
      ),
    }),
  ),
});

export const Presentacion = z.object({
  ...Base,
  diapositivas: z.array(z.object({ titulo: z.string(), ideas: z.array(z.string()).describe("De 3 a 5 ideas cortas"), cita: CitaMaterial })),
});

export const Tarjetas = z.object({
  ...Base,
  tarjetas: z.array(
    z.object({
      pregunta: z.string(),
      respuesta: z.string().describe("Respuesta corta y exacta"),
      dato: z.string().describe("En modo literal: el dato exacto que hay que saberse (plazo, fecha, artículo, número), muy corto. Si no, cadena vacía"),
      asunto: z.string().describe("Asunto en pocas palabras, por ejemplo «la moción de censura»"),
      cita: CitaMaterial,
    }),
  ),
});

export const Test = z.object({
  ...Base,
  preguntas: z.array(
    z.object({
      enunciado: z.string(),
      opciones: z.array(z.string()).describe("Exactamente 4 opciones, sin letras delante"),
      correcta: z.number().int().describe("Índice de la opción correcta: 0, 1, 2 o 3"),
      justificacion: z.string().describe("Por qué es la correcta, en 1-2 frases, con lo que dice el temario"),
      asunto: z.string().describe("Asunto en pocas palabras, por ejemplo «el recurso de alzada»"),
      cita: CitaMaterial,
    }),
  ),
});

export type ContenidoResumenEsquema = z.infer<typeof ResumenEsquema>;
export type ContenidoCornell = z.infer<typeof ResumenCornell>;
export type ContenidoEjecutivo = z.infer<typeof ResumenEjecutivo>;
export type ContenidoMapa = z.infer<typeof Mapa>;
export type ContenidoPresentacion = z.infer<typeof Presentacion>;
export type ContenidoTarjetas = z.infer<typeof Tarjetas>;
export type ContenidoTest = z.infer<typeof Test>;
export type Contenido =
  | ContenidoResumenEsquema
  | ContenidoCornell
  | ContenidoEjecutivo
  | ContenidoMapa
  | ContenidoPresentacion
  | ContenidoTarjetas
  | ContenidoTest;

export type OpcionesMaterial = {
  estilo?: Estilo;
  diapositivas?: number;
  numero?: number;
  literal?: boolean;
  dificultad?: Dificultad;
};

export function esquemaDe(formato: Formato, estilo?: Estilo | null) {
  if (formato === "resumen") return estilo === "cornell" ? ResumenCornell : estilo === "ejecutivo" ? ResumenEjecutivo : ResumenEsquema;
  if (formato === "esquema") return Mapa;
  if (formato === "presentacion") return Presentacion;
  if (formato === "tarjetas") return Tarjetas;
  return Test;
}

export const NOMBRE_FORMATO: Record<Formato, string> = {
  resumen: "Resumen",
  esquema: "Esquema",
  presentacion: "Presentación",
  tarjetas: "Tarjetas de repaso",
  test: "Test de práctica",
  simulacro: "Simulacro",
};

export const NOMBRE_ESTILO: Record<Estilo, string> = {
  esquema: "Resumen en esquema",
  cornell: "Resumen Cornell",
  ejecutivo: "Resumen ejecutivo",
};

export function tipoMaterial(formato: Formato, estilo?: string | null): string {
  if (formato === "resumen" && estilo && estilo in NOMBRE_ESTILO) return NOMBRE_ESTILO[estilo as Estilo];
  return NOMBRE_FORMATO[formato];
}
