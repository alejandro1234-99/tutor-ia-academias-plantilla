import { es } from "./es";
import { conMarca } from "@/configuracion";

// El idioma de la app sale de la configuración. De momento, solo español.
export const T = es;

// Cuando un número vale 1, la palabra que le sigue va en singular
// («1 duda», no «1 dudas»; «te queda 1 pregunta»).
const SINGULAR: Record<string, string> = {
  preguntas: "pregunta",
  dudas: "duda",
  alumnos: "alumno",
  filas: "fila",
  materiales: "material",
  tarjetas: "tarjeta",
  días: "día",
  tests: "test",
  pantallas: "pantalla",
  páginas: "página",
  notas: "nota",
  diapositivas: "diapositiva",
  pendientes: "pendiente",
  falladas: "fallada",
  listos: "listo",
};

function singulares(texto: string, valores: Record<string, string | number>): string {
  return texto.replace(/(quedan )?\{(\w+)\} (\p{L}+)( \p{L}+)?/gu, (m, quedan: string | undefined, k: string, w1: string, w2: string | undefined) => {
    if (Number(valores[k]) !== 1) return m;
    const segunda = w2 ? " " + (SINGULAR[w2.trim()] ?? w2.trim()) : "";
    return `${quedan ? "queda " : ""}{${k}} ${SINGULAR[w1] ?? w1}${segunda}`;
  });
}

/** Rellena un texto: {asistente}, {academia} y los valores que se pasen. */
export function t(texto: string, valores: Record<string, string | number> = {}): string {
  return conMarca(singulares(texto, valores), valores);
}
