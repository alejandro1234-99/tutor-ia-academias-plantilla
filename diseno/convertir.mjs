// Convierte las pantallas de Claude Design (.dc.html) en páginas HTML normales,
// que se abren en cualquier navegador sin el editor de Claude Design.
//
// No cambia el diseño: copia sus estilos y su contenido tal cual. Solo resuelve
// lo que el editor resolvía por su cuenta (modo oscuro/claro, qué academia se
// muestra y qué trozos se enseñan), usando los valores que trae cada pantalla.
//
// Uso:  node diseno/convertir.mjs diseno/ronda-1

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ronda = process.argv[2];
if (!ronda) {
  console.error('Falta la carpeta. Ejemplo: node diseno/convertir.mjs diseno/ronda-1');
  process.exit(1);
}
const dirOriginales = path.join(ronda, 'originales');
const dirPantallas = path.join(ronda, 'pantallas');
fs.mkdirSync(dirPantallas, { recursive: true });

const lienzo = JSON.parse(fs.readFileSync(path.join(dirOriginales, 'canvas.json'), 'utf8'));

function entre(texto, abre, cierra) {
  const i = texto.indexOf(abre);
  const j = texto.indexOf(cierra, i + abre.length);
  if (i < 0 || j < 0) throw new Error(`No encuentro ${abre} … ${cierra}`);
  return texto.slice(i + abre.length, j);
}

// Ejecuta la lógica de la pantalla con sus valores por defecto, como hace el editor.
function valores(fuente) {
  const props = JSON.parse(fuente.match(/data-props='([^']*)'/)[1]);
  const porDefecto = {};
  for (const [clave, def] of Object.entries(props)) {
    if (!clave.startsWith('$') && def && 'default' in def) porDefecto[clave] = def.default;
  }
  const codigo = fuente.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
  const Component = vm.runInNewContext(
    `class DCLogic { constructor() { this.props = {}; } }\n${codigo}\nComponent`, {});
  const c = new Component();
  c.props = porDefecto;
  return { vals: c.renderVals(), preview: props.$preview };
}

function buscar(vals, expr) {
  expr = expr.trim();
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  return expr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), vals);
}

function convertir(nombre) {
  const fuente = fs.readFileSync(path.join(dirOriginales, nombre), 'utf8');
  const { vals, preview } = valores(fuente);
  const titulo = entre(fuente, '<title>', '</title>');
  const cabeza = entre(fuente, '<helmet>', '</helmet>');
  let cuerpo = entre(fuente, '</helmet>', '</x-dc>');

  // <sc-if value="{{x}}">…</sc-if>: se deja el contenido si x es verdadero, si no se quita.
  // Se resuelven de dentro hacia fuera por si hay unos dentro de otros.
  const scIf = /<sc-if\b[^>]*?\bvalue="\{\{([^}]*)\}\}"[^>]*>((?:(?!<sc-if\b)[\s\S])*?)<\/sc-if>/;
  while (scIf.test(cuerpo)) {
    cuerpo = cuerpo.replace(scIf, (_, expr, dentro) => (buscar(vals, expr) ? dentro : ''));
  }
  // {{hueco}}: se sustituye por su valor.
  cuerpo = cuerpo.replace(/\{\{([^}]*)\}\}/g, (_, expr) => {
    const v = buscar(vals, expr);
    if (v === undefined) throw new Error(`${nombre}: no sé qué poner en {{${expr}}}`);
    return String(v);
  });
  // Los enlaces entre pantallas apuntan a las copias convertidas.
  cuerpo = cuerpo.replace(/href="([^"#]+)\.dc\.html"/g, 'href="$1.html"');

  if (/\{\{|<sc-|<dc-|<x-/.test(cuerpo)) throw new Error(`${nombre}: queda algo sin convertir`);

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${titulo}</title>
${cabeza.trim()}
</head>
<body>${cuerpo}</body>
</html>
`;
  const salida = nombre.replace(/\.dc\.html$/, '.html');
  fs.writeFileSync(path.join(dirPantallas, salida), html);
  return { salida, titulo: lienzo.boards[nombre]?.title ?? titulo, preview };
}

// Índice: las pantallas agrupadas como en el lienzo (cada grupo bajo su título).
const titulos = Object.values(lienzo.notes ?? {})
  .filter((n) => n.kind === 'title1')
  .sort((a, b) => a.y - b.y);
const grupos = titulos.map((t) => ({ texto: t.text, y: t.y, pantallas: [] }));

const nombres = Object.keys(lienzo.boards).sort((a, b) => {
  const A = lienzo.boards[a], B = lienzo.boards[b];
  return A.y - B.y || A.x - B.x;
});
for (const nombre of nombres) {
  const r = convertir(nombre);
  const y = lienzo.boards[nombre].y;
  const grupo = [...grupos].reverse().find((g) => g.y < y) ?? grupos[0];
  grupo.pantallas.push({ ...r, w: lienzo.boards[nombre].w, h: lienzo.boards[nombre].h });
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const indice = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(lienzo.title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&amp;family=Inter:wght@400;500;600&amp;display=swap">
<style>
:root{--bg:#08080A;--surface:#111114;--line:#232328;--text:#E7E5E4;--text-2:#A8A29E;--text-3:#8C8781;--ink:#86C6D4}
body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:880px;margin:0 auto;padding:48px 16px 80px}
h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:44px;line-height:1.1;margin:0 0 8px}
h2{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin:40px 0 8px}
p{color:var(--text-2);margin:0;line-height:1.6}
ul{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
li{border-bottom:1px solid var(--line)}
a{display:flex;justify-content:space-between;gap:16px;padding:14px 4px;color:var(--text);text-decoration:none}
a:hover{color:var(--ink)}
a span{color:var(--text-3);font-size:14px;white-space:nowrap;font-variant-numeric:tabular-nums}
</style>
</head>
<body>
<main>
<h1>${esc(lienzo.title)}</h1>
<p>Las ${nombres.length} pantallas del diseño, tal cual salieron de Claude Design. Pulsa una para verla a tamaño real.</p>
${grupos.filter((g) => g.pantallas.length).map((g) => `<h2>${esc(g.texto)}</h2>
<ul>
${g.pantallas.map((p) => `<li><a href="pantallas/${p.salida}">${esc(p.titulo)}<span>${p.w} × ${p.h}</span></a></li>`).join('\n')}
</ul>`).join('\n')}
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(ronda, 'index.html'), indice);
console.log(`Hecho: ${nombres.length} pantallas en ${dirPantallas} y el índice en ${path.join(ronda, 'index.html')}`);
