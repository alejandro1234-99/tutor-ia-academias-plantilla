// Comprobación del archivo de configuración de la academia.
// Lo usan el comprobador de la publicación (scripts/comprobar-configuracion.mjs)
// y la propia app al arrancar. Los mensajes van en español llano, porque los
// lee quien monta la academia.

import { parse, printParseErrorCode } from "jsonc-parser";

const HEX = /^#[0-9A-Fa-f]{6}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Las líneas obligatorias, con el tipo que tienen que tener. */
const LINEAS = [
  ["nombre", "texto"],
  ["nombreCorto", "texto"],
  ["logo", "texto"],
  ["icono", "texto"],
  ["colorPrincipal", "color"],
  ["colorAcento", "color"],
  ["asistente.nombre", "texto"],
  ["oposiciones", "lista"],
  ["web.direccion", "texto"],
  ["correo.remitente", "correo"],
  ["correo.nombreRemitente", "texto"],
  ["correo.ayudaAlumnos", "correo"],
  ["limites.preguntasAlDia", "numero"],
  ["limites.materialesAlMes", "numero"],
  ["limites.materialesFormadorAlMes", "numero"],
  ["limites.topeAcademiaPreguntasMes", "numero"],
  ["limites.topeAcademiaMaterialesMes", "numero"],
  ["limites.alumnosIncluidos", "numero"],
  ["limites.paginasVisorPorHora", "numero"],
  ["avisos.diasParaRecordatorio", "numero"],
  ["avisos.diasParaRiesgo", "numero"],
  ["privacidad.minimoAlumnosParaSumar", "numero"],
  ["legal.razonSocial", "texto"],
  ["legal.cif", "texto"],
  ["legal.direccion", "texto"],
  ["legal.correoPrivacidad", "correo"],
  ["legal.edadMinima", "numero"],
  ["pie.funcionaCon", "texto"],
  ["idioma", "texto"],
  ["servicioPausado", "si-no"],
  ["interruptores", "objeto"],
];

const CLAVES_COLOR = [
  "brand", "onBrand", "ink", "brandSoft", "brandLine",
  "accent", "accentInk", "accentSoft", "onAccent", "logo",
];

function leer(obj, ruta) {
  return ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function describir(tipo) {
  return {
    texto: "un texto entre comillas",
    color: "un color escrito así: #1A2B3C",
    lista: "una lista entre corchetes [ ]",
    correo: "una dirección de correo",
    numero: "un número",
    "si-no": "true o false",
    objeto: "un bloque entre llaves { }",
  }[tipo];
}

function comprobarTipo(valor, tipo) {
  switch (tipo) {
    case "texto": return typeof valor === "string" && valor.trim() !== "";
    case "color": return typeof valor === "string" && HEX.test(valor);
    case "lista": return Array.isArray(valor) && valor.length > 0;
    case "correo": return typeof valor === "string" && CORREO.test(valor);
    case "numero": return typeof valor === "number" && Number.isFinite(valor) && valor >= 0;
    case "si-no": return typeof valor === "boolean";
    case "objeto": return valor !== null && typeof valor === "object" && !Array.isArray(valor);
    default: return false;
  }
}

/** Convierte el texto del archivo en un objeto. Lanza un error en español. */
export function interpretarTexto(texto, nombreArchivo) {
  const errores = [];
  const datos = parse(texto, errores, { allowTrailingComma: true });
  if (errores.length > 0) {
    const e = errores[0];
    const linea = texto.slice(0, e.offset).split("\n").length;
    throw new Error(
      `El archivo ${nombreArchivo} está mal escrito cerca de la línea ${linea} ` +
        `(${printParseErrorCode(e.error)}). Revisa comas, comillas y llaves.`,
    );
  }
  return datos;
}

/**
 * Comprueba la configuración. Devuelve la lista de problemas en español
 * (vacía si está bien).
 */
export function problemasDeConfiguracion(datos) {
  const problemas = [];
  if (datos == null || typeof datos !== "object") {
    return ["El archivo de configuración está vacío."];
  }
  for (const [ruta, tipo] of LINEAS) {
    const valor = leer(datos, ruta);
    if (valor === undefined) {
      problemas.push(`Falta la línea obligatoria «${ruta}».`);
    } else if (!comprobarTipo(valor, tipo)) {
      problemas.push(`La línea «${ruta}» tiene que ser ${describir(tipo)}. Ahora pone: ${JSON.stringify(valor)}.`);
    }
  }
  if (Array.isArray(datos.oposiciones)) {
    const claves = new Set();
    datos.oposiciones.forEach((o, i) => {
      const donde = `oposiciones, la número ${i + 1}`;
      if (!o || typeof o !== "object") {
        problemas.push(`En «${donde}» falta el bloque de la oposición.`);
        return;
      }
      if (typeof o.clave !== "string" || !/^[a-z0-9-]+$/.test(o.clave)) {
        problemas.push(`En «${donde}», la línea «clave» tiene que ser un texto en minúsculas, sin espacios ni acentos (por ejemplo: auxiliar-administrativo-estado).`);
      } else if (claves.has(o.clave)) {
        problemas.push(`En «${donde}», la clave «${o.clave}» está repetida.`);
      } else {
        claves.add(o.clave);
      }
      if (typeof o.nombre !== "string" || !o.nombre.trim()) {
        problemas.push(`En «${donde}» falta la línea «nombre».`);
      }
      const s = o.simulacro;
      if (!s || typeof s.restaPorFallo !== "number" || s.restaPorFallo < 0 || s.restaPorFallo > 1) {
        problemas.push(`En «${donde}», la línea «simulacro.restaPorFallo» tiene que ser un número entre 0 y 1 (un tercio es 0.3333).`);
      }
      if (!s || typeof s.segundosPorPregunta !== "number" || s.segundosPorPregunta < 10) {
        problemas.push(`En «${donde}», la línea «simulacro.segundosPorPregunta» tiene que ser un número de segundos (por ejemplo, 60).`);
      }
      if (o.preguntasDeEjemplo !== undefined &&
        (!Array.isArray(o.preguntasDeEjemplo) || o.preguntasDeEjemplo.some((p) => typeof p !== "string"))) {
        problemas.push(`En «${donde}», la línea «preguntasDeEjemplo» tiene que ser una lista de textos.`);
      }
    });
  }
  const ajustados = datos.coloresAjustados;
  if (ajustados !== undefined) {
    for (const modo of ["oscuro", "claro"]) {
      const bloque = ajustados?.[modo];
      if (!bloque || typeof bloque !== "object") {
        problemas.push(`En «coloresAjustados» falta el bloque «${modo}».`);
        continue;
      }
      for (const c of CLAVES_COLOR) {
        const v = bloque[c];
        const valido = typeof v === "string" && (HEX.test(v) || /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(v));
        if (!valido) {
          problemas.push(`La línea «coloresAjustados.${modo}.${c}» tiene que ser un color como #1A2B3C o rgba(26,43,60,.2).`);
        }
      }
    }
  }
  return problemas;
}

// ---------------------------------------------------------------------
//  Colores por modo, calculados a partir de los dos colores de la academia
//  cuando la configuración no trae el ajuste fino.
// ---------------------------------------------------------------------

function aRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function aHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function mezclar(a, b, t) {
  const x = aRgb(a), y = aRgb(b);
  return aHex(x.map((v, i) => v * (1 - t) + y[i] * t));
}
function luminancia(hex) {
  const c = aRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contraste(a, b) {
  const l1 = luminancia(a), l2 = luminancia(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function aHsl(hex) {
  const [r, g, b] = aRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function deHsl([h, s, l]) {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return aHex([f(0), f(8), f(4)]);
}
// Aclara u oscurece el color (manteniendo su tono) hasta llegar al contraste.
function hastaContraste(color, fondo, objetivo, hacia) {
  const [h, s, l] = aHsl(color);
  const subir = hacia === "#FFFFFF";
  let c = color;
  for (let paso = 0; paso <= 100 && contraste(c, fondo) < objetivo; paso++) {
    const nl = subir ? l + (1 - l) * (paso / 100) : l * (1 - paso / 100);
    c = deHsl([h, subir ? Math.min(s, 0.55) : s, nl]);
  }
  return c;
}
function rgba(hex, alfa) {
  const [r, g, b] = aRgb(hex);
  return `rgba(${r},${g},${b},${alfa})`;
}

const FONDO_OSCURO = "#08080A";
const FONDO_CLARO = "#FBFAF8";
const TEXTO_OSCURO = "#16160F";

export function calcularColores(principal, acento) {
  const claroBrand = hastaContraste(principal, FONDO_CLARO, 4.5, "#000000");
  const claroAccentInk = hastaContraste(acento, FONDO_CLARO, 4.5, "#000000");
  const oscuroBrand = hastaContraste(principal, FONDO_OSCURO, 7.5, "#FFFFFF");
  const oscuroInk = hastaContraste(principal, FONDO_OSCURO, 9, "#FFFFFF");
  const oscuroAccentInk = hastaContraste(acento, FONDO_OSCURO, 6, "#FFFFFF");
  const sobre = (c) => (contraste(c, "#FFFFFF") >= contraste(c, TEXTO_OSCURO) ? "#FFFFFF" : TEXTO_OSCURO);
  const acentoLuminoso = luminancia(acento) > 0.4;
  return {
    oscuro: {
      brand: oscuroBrand,
      onBrand: mezclar(principal, "#000000", 0.6),
      ink: oscuroInk,
      brandSoft: mezclar(FONDO_OSCURO, principal, 0.48),
      brandLine: mezclar(principal, "#34343A", 0.2),
      accent: acento,
      accentInk: oscuroAccentInk,
      accentSoft: rgba(oscuroAccentInk, 0.23),
      onAccent: sobre(acento),
      logo: oscuroBrand,
    },
    claro: {
      brand: claroBrand,
      onBrand: sobre(claroBrand),
      ink: claroBrand,
      brandSoft: mezclar(principal, "#FFFFFF", 0.89),
      brandLine: mezclar(principal, "#FFFFFF", 0.74),
      accent: acento,
      accentInk: claroAccentInk,
      accentSoft: rgba(acento, acentoLuminoso ? 0.45 : 0.13),
      onAccent: sobre(acento),
      logo: claroBrand,
    },
  };
}
