// Comprueba que nada de una academia concreta está escrito en el código
// (SOLUCION.md, sección 20.4): busca el nombre, el asistente y el color de
// cada academia fuera de academias/ y de los datos de prueba.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignorar = [
  "node_modules", ".next", ".git", "academias", "datos-de-prueba", "diseno", "docs", "referencias", "test-results", "playwright-report",
  "public/academia", "public/pdf.worker.min.mjs", "src/configuracion/generada.json", "package-lock.json", ".claude", ".env.local",
];
// Datos de prueba (personas, temario de ejemplo y pruebas del robot): se permiten.
const datosPrueba = ["scripts/datos-prueba.ts", "scripts/prueba-50-dudas.ts", "pruebas/"];

const buscar = [];
for (const a of fs.readdirSync(path.join(raiz, "academias"))) {
  const f = path.join(raiz, "academias", a, "configuracion.jsonc");
  if (!fs.existsSync(f)) continue;
  const c = parse(fs.readFileSync(f, "utf8"));
  buscar.push(c.nombre, c.nombreCorto, c.asistente?.nombre, c.colorPrincipal, c.colorAcento);
}
const terminos = [...new Set(buscar.filter(Boolean))];

const hallazgos = [];
function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(raiz, p);
    if (ignorar.some((i) => rel === i || rel.startsWith(i + "/"))) continue;
    if (e.isDirectory()) recorrer(p);
    else if (/\.(ts|tsx|mjs|js|json|css|sql|html)$/.test(e.name)) {
      const texto = fs.readFileSync(p, "utf8");
      for (const t of terminos) {
        const re = new RegExp(`(^|[^\\p{L}])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "giu");
        if (re.test(texto)) hallazgos.push({ archivo: rel, termino: t, prueba: datosPrueba.some((d) => rel.startsWith(d)) });
      }
    }
  }
}
recorrer(raiz);
const fuera = hallazgos.filter((h) => !h.prueba);
console.log(`Buscado: ${terminos.join(" · ")}`);
for (const h of hallazgos.filter((h) => h.prueba)) console.log(`  (datos de prueba) ${h.archivo}: ${h.termino}`);
if (fuera.length) {
  for (const h of fuera) console.log(`✗ ${h.archivo}: «${h.termino}»`);
  process.exit(1);
}
console.log("✓ Nada de ninguna academia está escrito en el código.");
