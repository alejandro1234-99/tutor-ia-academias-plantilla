import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { analizarPaginas, leerPaginasCrudas, trocearPagina, pareceEscaneado } from "../src/temario/procesar";
const [archivo, ...ver] = process.argv.slice(2);
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(archivo)), verbosity: 0 }).promise;
const crudas = await leerPaginasCrudas(doc as never, 1, doc.numPages);
const pags = analizarPaginas(crudas);
console.log("paginas", pags.length, "escaneado", pareceEscaneado(pags), "indice:", pags.filter(p=>p.esIndice).map(p=>p.numero).join(","));
console.log("impresos:", pags.map(p=>p.numeroImpreso).join(","));
let trozos = 0;
for (const p of pags) { const t = trocearPagina(p); trozos += t.length; }
console.log("trozos", trozos);
for (const n of ver.map(Number)) {
  const p = pags[n-1];
  console.log(`\n--- pag ${n} (impresa ${p.numeroImpreso}) indice=${p.esIndice}`);
  p.parrafos.forEach((x,i)=>console.log(i, x.k, x.art, "|", x.t.slice(0,110)));
  for (const t of trocearPagina(p)) console.log("TROZO", t.orden, t.parrafoDesde, t.parrafoHasta, t.articulos.join("/"), (t.texto.match(/\S+/g)||[]).length, "palabras");
}
