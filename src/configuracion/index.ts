// La configuración de la academia, ya comprobada. Sale de
// academias/<academia>/configuracion.jsonc a través de
// scripts/comprobar-configuracion.mjs, que genera generada.json antes de
// arrancar o publicar la web. Nada de una academia concreta se escribe en
// el código: todo se lee de aquí.

import generada from "./generada.json";
import { problemasDeConfiguracion } from "./validar.mjs";

export type ColoresModo = {
  brand: string; onBrand: string; ink: string; brandSoft: string; brandLine: string;
  accent: string; accentInk: string; accentSoft: string; onAccent: string; logo: string;
};

export type OposicionConfig = {
  clave: string;
  nombre: string;
  simulacro: { restaPorFallo: number; segundosPorPregunta: number };
  preguntasDeEjemplo?: string[];
};

export type Configuracion = {
  academia: string;
  nombre: string;
  nombreCorto: string;
  logo: string;
  icono: string;
  logoSvg: string;
  iconoBase64: string;
  colorPrincipal: string;
  colorAcento: string;
  colores: { oscuro: ColoresModo; claro: ColoresModo };
  asistente: { nombre: string };
  oposiciones: OposicionConfig[];
  web: { direccion: string };
  correo: { remitente: string; nombreRemitente: string; ayudaAlumnos: string };
  limites: {
    preguntasAlDia: number;
    materialesAlMes: number;
    materialesFormadorAlMes: number;
    topeAcademiaPreguntasMes: number;
    topeAcademiaMaterialesMes: number;
    alumnosIncluidos: number;
    paginasVisorPorHora: number;
  };
  avisos: { diasParaRecordatorio: number; diasParaRiesgo: number };
  privacidad: { minimoAlumnosParaSumar: number };
  legal: { razonSocial: string; cif: string; direccion: string; correoPrivacidad: string; edadMinima: number };
  pie: { funcionaCon: string };
  idioma: string;
  servicioPausado: boolean;
  interruptores: Record<string, boolean>;
};

const problemas = problemasDeConfiguracion(generada);
if (problemas.length > 0) {
  throw new Error(
    "La configuración de la academia tiene problemas y la app no puede arrancar:\n- " + problemas.join("\n- "),
  );
}

export const config = generada as unknown as Configuracion;

/** Variables de color de la academia, para escribir en <head>. */
export function cssDeMarca(): string {
  const bloque = (c: ColoresModo) =>
    `--brand:${c.brand};--on-brand:${c.onBrand};--ink:${c.ink};--brand-soft:${c.brandSoft};--brand-line:${c.brandLine};` +
    `--accent:${c.accent};--accent-ink:${c.accentInk};--accent-soft:${c.accentSoft};--on-accent:${c.onAccent};--logo:${c.logo};`;
  const oscuro = bloque(config.colores.oscuro);
  const claro = bloque(config.colores.claro);
  return (
    `:root,html[data-tema="oscuro"]{${oscuro}}` +
    `html[data-tema="claro"]{${claro}}` +
    `@media (prefers-color-scheme: light){html[data-tema="auto"]{${claro}}}`
  );
}

/** Sustituye {asistente}, {academia}... en un texto. */
export function conMarca(texto: string, extra: Record<string, string | number> = {}): string {
  const valores: Record<string, string | number> = {
    asistente: config.asistente.nombre,
    academia: config.nombre,
    academiaCorto: config.nombreCorto,
    ...extra,
  };
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in valores ? String(valores[k]) : m));
}
