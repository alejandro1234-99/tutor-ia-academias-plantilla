// Comprueba el archivo de configuración de la academia antes de publicar.
// Si falta una línea obligatoria o un color está mal escrito, para la
// publicación y dice en español qué línea falla.
//
// Qué academia se usa: la variable ACADEMIA (por defecto, temario-claro),
// que es el nombre de una carpeta dentro de academias/.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  interpretarTexto,
  problemasDeConfiguracion,
  calcularColores,
} from "../src/configuracion/validar.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const academia = (process.env.ACADEMIA || "temario-claro").trim();
const carpeta = path.join(raiz, "academias", academia);
const archivo = path.join(carpeta, "configuracion.jsonc");
const relativo = path.relative(raiz, archivo);

function parar(lineas) {
  const rojo = "\x1b[31m", fin = "\x1b[0m";
  console.error(`\n${rojo}════════════════════════════════════════════════════════════`);
  console.error(" LA CONFIGURACIÓN DE LA ACADEMIA TIENE PROBLEMAS");
  console.error(" La web no se publica hasta que se arreglen.");
  console.error(`════════════════════════════════════════════════════════════${fin}`);
  console.error(` Archivo: ${relativo}\n`);
  for (const l of lineas) console.error(`${rojo} ✗ ${l}${fin}`);
  console.error("");
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(academia)) {
  parar([`El nombre de academia «${academia}» no es válido. Usa el nombre de una carpeta de academias/.`]);
}
if (!fs.existsSync(archivo)) {
  parar([`No existe la carpeta de la academia «${academia}». Crea academias/${academia}/configuracion.jsonc.`]);
}

let datos;
try {
  datos = interpretarTexto(fs.readFileSync(archivo, "utf8"), relativo);
} catch (e) {
  parar([e.message]);
}

const problemas = problemasDeConfiguracion(datos);
const logo = typeof datos.logo === "string" ? path.join(carpeta, datos.logo) : null;
const icono = typeof datos.icono === "string" ? path.join(carpeta, datos.icono) : null;
if (logo && !fs.existsSync(logo)) problemas.push(`La línea «logo» dice «${datos.logo}», pero ese archivo no está en academias/${academia}/.`);
if (logo && fs.existsSync(logo) && !logo.endsWith(".svg")) problemas.push("La línea «logo» tiene que ser un archivo .svg.");
if (icono && !fs.existsSync(icono)) problemas.push(`La línea «icono» dice «${datos.icono}», pero ese archivo no está en academias/${academia}/.`);
if (icono && fs.existsSync(icono) && !icono.endsWith(".png")) problemas.push("La línea «icono» tiene que ser un archivo .png.");
if (problemas.length > 0) parar(problemas);

const colores = datos.coloresAjustados ?? calcularColores(datos.colorPrincipal, datos.colorAcento);
const logoSvg = fs.readFileSync(logo, "utf8")
  .replace(/<\?xml[^>]*>/g, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .trim();
if (/<script|\son\w+\s*=|javascript:|<foreignObject/i.test(logoSvg)) {
  parar(["El logo tiene código que se podría ejecutar (script, on...=, javascript:). Usa un SVG solo de dibujo."]);
}

const generada = {
  academia,
  ...datos,
  colores,
  logoSvg,
  // El icono, para ponerlo en los PDF que se descargan.
  iconoBase64: fs.readFileSync(icono).toString("base64"),
};

const destinoConfig = path.join(raiz, "src", "configuracion", "generada.json");
fs.writeFileSync(destinoConfig, JSON.stringify(generada, null, 2) + "\n");

const publica = path.join(raiz, "public", "academia");
fs.mkdirSync(publica, { recursive: true });
fs.copyFileSync(icono, path.join(publica, "icono.png"));
fs.copyFileSync(logo, path.join(publica, "logo.svg"));

// El lector de PDF del navegador (para que el formador suba el temario).
const lectorPdf = path.join(raiz, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
if (fs.existsSync(lectorPdf)) fs.copyFileSync(lectorPdf, path.join(raiz, "public", "pdf.worker.min.mjs"));

console.log(`✓ Configuración de «${datos.nombre}» comprobada (academias/${academia}).`);
