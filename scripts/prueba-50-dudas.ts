// PRUEBA DE LAS 50 DUDAS TÍPICAS (PLAN.md, capa 6.3; MONTAR-CLIENTE.md, paso 5)
//
//   npm run prueba:50-dudas                     → con la IA de verdad (cuesta unos 2 €: ~3 céntimos por pregunta)
//   npm run prueba:50-dudas -- --solo-busqueda  → solo el buscador, gratis
//   npm run prueba:50-dudas -- --solo 3,24      → solo esas dudas
//
//   npm run prueba:50-dudas -- --correo prueba@suacademia.com
//     → con ese alumno de prueba (si no, el primer alumno activo)
//
// Lee datos-de-prueba/50-dudas-<academia>.csv y
// datos-de-prueba/5-preguntas-fuera-del-temario-<academia>.csv (si no existe,
// la de Temario Claro), con las mismas columnas que las de Temario Claro.
//
// Hace cada duda como un alumno, por el mismo camino que el chat:
// buscar en el temario y responder. No guarda nada en su cuenta. Rellena las columnas de la hoja:
// ¿Responde bien? · ¿Cita el tema correcto? · ¿Cita la página correcta? ·
// ¿Se inventa algo?, y las 5 preguntas de fuera del temario.
// El resultado se guarda en datos-de-prueba/resultados/.

import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { comoPersona, comoSistema } from "@/servidor/bd";
import { buscarTemario } from "@/servidor/buscar";
import { huellaConsulta } from "@/servidor/ia/huellas";
import { prepararConsulta, responder } from "@/servidor/ia/chat";
import { anthropic, iaSimulada, MODELO_RAPIDO } from "@/servidor/ia/modelos";
import { contextoAlumno } from "@/servidor/alumno";
import { config } from "@/configuracion";
import type { Cita } from "@/tipos/chat";

const soloBusqueda = process.argv.includes("--solo-busqueda");
// --sin-ampliar → sin las palabras de la ley que prepara la IA rápida (para comparar).
const sinAmpliar = process.argv.includes("--sin-ampliar");
const raiz = process.cwd();
const carpeta = path.join(raiz, "datos-de-prueba");

function leerCsv(archivo: string): string[][] {
  const texto = fs.readFileSync(archivo, "utf8").replace(/^﻿/, "");
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") {
      fila.push(celda);
      celda = "";
    } else if (c === "\n") {
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else if (c !== "\r") celda += c;
  }
  if (celda || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}

const Juicio = z.object({
  respondeBien: z.boolean().describe("true si la respuesta del asistente dice lo mismo que la respuesta correcta (aunque con otras palabras)"),
  seInventa: z.boolean().describe("true si la respuesta afirma algo que no está en la respuesta correcta ni en la frase del temario y que es falso o no se puede comprobar"),
  motivo: z.string(),
});

async function juzgar(pregunta: string, correcta: string, frase: string, respuesta: string) {
  if (iaSimulada() || !process.env.ANTHROPIC_API_KEY) {
    const clave = (frase.toLowerCase().match(/[a-záéíóúñ]{5,}/g) ?? []).slice(0, 6);
    const r = respuesta.toLowerCase();
    const bien = clave.filter((w) => r.includes(w)).length >= Math.min(3, clave.length);
    return { respondeBien: bien, seInventa: false, motivo: "juicio aproximado (sin IA)" };
  }
  const formato = zodOutputFormat(Juicio);
  const r = await anthropic().messages.create({
    model: MODELO_RAPIDO,
    max_tokens: 400,
    system: "Eres un examinador estricto de oposiciones. Compara la respuesta de un asistente con la respuesta correcta y la frase literal del temario.",
    output_config: { format: { type: formato.type, schema: formato.schema } },
    messages: [
      {
        role: "user",
        content: `PREGUNTA: ${pregunta}\nRESPUESTA CORRECTA: ${correcta}\nFRASE LITERAL DEL TEMARIO: ${frase}\nRESPUESTA DEL ASISTENTE: ${respuesta}`,
      },
    ],
  });
  const t = r.content.find((b) => b.type === "text");
  return formato.parse(t && t.type === "text" ? t.text : "{}") as z.infer<typeof Juicio>;
}

async function preguntar(alumnoId: string, pregunta: string) {
  const inicio = Date.now();
  // Igual que el chat: primero se prepara la consulta y luego se busca.
  // Igual que el chat: la huella de la pregunta a la vez que se prepara la consulta.
  const huellaPregunta = huellaConsulta(pregunta);
  const { consulta, terminos } = sinAmpliar ? { consulta: pregunta, terminos: null } : await prepararConsulta(pregunta, []);
  const resultados = await comoPersona(alumnoId, (tx) =>
    buscarTemario(tx, consulta, { limite: Number(process.env.TROZOS || 8), extra: terminos, huella: consulta === pregunta ? huellaPregunta : undefined }),
  );
  if (soloBusqueda) return { resultados, texto: "", citas: [] as Cita[], estado: "ok", ms: Date.now() - inicio };
  const contexto = await comoPersona(alumnoId, (tx) => contextoAlumno(tx, alumnoId));
  let texto = "";
  const citas: Cita[] = [];
  let estado = "error";
  let ms: number | null = null;
  try {
    for await (const ev of responder({ pregunta, modo: "resolver", historial: [], contexto, resultados, signal: new AbortController().signal })) {
      if (ev.t === "texto") {
        // Como en el chat: desde que el alumno pregunta (preparar y buscar incluidos).
        if (ms === null) ms = Date.now() - inicio;
        texto += ev.v;
      } else if (ev.t === "cita") citas.push(ev.cita);
      else estado = ev.estado;
    }
  } catch (e) {
    texto = `(error: ${(e as Error).message})`;
  }
  return { resultados, texto, citas, estado, ms };
}

const temaDe = (s: string) => Number(s.match(/Tema\s+(\d+)/)?.[1] ?? 0);

const iCorreo = process.argv.indexOf("--correo");
const correoPrueba = iCorreo > 0 ? process.argv[iCorreo + 1]?.trim().toLowerCase() : null;
const alumno = correoPrueba
  ? await comoSistema((tx) => tx`select id from personas where es_alumno and estado <> 'baja' and correo = ${correoPrueba}`)
  : await comoSistema((tx) => tx`select id from personas where es_alumno and estado = 'activa' order by creada_at limit 1`);
if (!alumno[0]) {
  console.error(correoPrueba ? `No hay ningún alumno con el correo ${correoPrueba}.` : "No hay ningún alumno activo en esta base de datos.");
  process.exit(1);
}
const archivo = (base: string, alternativa: string) => {
  const propio = path.join(carpeta, `${base}-${config.academia}.csv`);
  return fs.existsSync(propio) ? propio : path.join(carpeta, alternativa);
};
const alumnoId = alumno[0].id as string;
// --solo 3,24 → solo esas dudas (para comprobar un arreglo sin pagar las 50).
const iSolo = process.argv.indexOf("--solo");
const solo = iSolo > 0 ? new Set(process.argv[iSolo + 1].split(",").map((x) => x.trim())) : null;
const dudas = leerCsv(archivo("50-dudas", "50-dudas-temario-claro.csv")).slice(1).filter((f) => f[0] && (!solo || solo.has(f[0])));
const fuera = leerCsv(archivo("5-preguntas-fuera-del-temario", "5-preguntas-fuera-del-temario.csv")).slice(1).filter((f) => f[0]);

console.log(`${soloBusqueda ? "Solo el buscador" : iaSimulada() ? "IA SIMULADA (no mide la calidad real)" : "IA de verdad"} · ${dudas.length} dudas y ${fuera.length} de fuera del temario`);
if (!soloBusqueda && !iaSimulada()) console.log("Coste aproximado: 2 € (unos 3 céntimos por pregunta).");

const libro = new ExcelJS.Workbook();
const hoja = libro.addWorksheet("50 dudas");
hoja.addRow(["Nº", "Tema", "Pregunta", "Página esperada", "¿El buscador trae la página?", "¿Trae la frase exacta?", "Respuesta del asistente", "Citas", "¿Responde bien?", "¿Cita el tema correcto?", "¿Cita la página correcta?", "¿Se inventa algo?", "Motivo", "Primera letra (s)"]).font = { bold: true };
let bien = 0, tema = 0, pagina = 0, inventa = 0, busca = 0, frases = 0;
const normal = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim();
const tiempos: number[] = [];
// PAUSA_MS=21000 → espera entre dudas (cuenta de Voyage sin método de pago: 3 por minuto).
const pausa = Number(process.env.PAUSA_MS || 0);
for (const f of dudas) {
  if (pausa) await new Promise((r) => setTimeout(r, pausa));
  const [n, temaTxt, pregunta, correcta, , paginaTxt, frase, notas] = f;
  const esperadoTema = temaDe(temaTxt);
  const esperadaPag = Number(paginaTxt);
  const alternativas = [esperadaPag, ...((notas ?? "").match(/p[áa]gina\s+(\d+)/gi) ?? []).map((x) => Number(x.replace(/\D/g, "")))];
  const r = await preguntar(alumnoId, pregunta);
  const buscaOk = r.resultados.some((x) => x.temaNumero === esperadoTema && alternativas.includes(x.paginaImpresa ?? x.pagina ?? -1));
  if (buscaOk) busca++;
  const trozoFrase = normal(frase).replace(/^«|»$/g, "").slice(0, 45);
  const fraseOk = trozoFrase.length > 10 && r.resultados.some((x) => normal(String(x.texto)).includes(trozoFrase));
  if (fraseOk) frases++;
  let fila: (string | number)[];
  if (soloBusqueda) {
    fila = [n, temaTxt, pregunta, esperadaPag, buscaOk ? "Sí" : "No", fraseOk ? "Sí" : "No"];
  } else {
    const temaOk = r.citas.some((c) => c.temaNumero === esperadoTema);
    const pagOk = r.citas.some((c) => c.tipo === "temario" && c.temaNumero === esperadoTema && alternativas.includes(c.paginaImpresa ?? c.pagina));
    const juicio = r.estado === "ok" ? await juzgar(pregunta, correcta, frase, r.texto) : { respondeBien: false, seInventa: false, motivo: `estado: ${r.estado}` };
    if (juicio.respondeBien) bien++;
    if (temaOk) tema++;
    if (pagOk) pagina++;
    if (juicio.seInventa) inventa++;
    if (r.ms !== null && r.ms !== undefined) tiempos.push(r.ms);
    fila = [
      n, temaTxt, pregunta, esperadaPag, buscaOk ? "Sí" : "No", fraseOk ? "Sí" : "No", r.texto,
      r.citas.map((c) => (c.tipo === "nota" ? `Nota T${c.temaNumero}` : `T${c.temaNumero} p${c.paginaImpresa ?? c.pagina}${c.articulo ? " art " + c.articulo : ""}`)).join(" · "),
      juicio.respondeBien ? "Sí" : "No", temaOk ? "Sí" : "No", pagOk ? "Sí" : "No", juicio.seInventa ? "Sí" : "No", juicio.motivo,
      r.ms ? (r.ms / 1000).toFixed(1) : "",
    ];
  }
  hoja.addRow(fila);
  process.stdout.write(fraseOk ? "·" : buscaOk ? "p" : "x");
}
console.log("");

const hoja2 = libro.addWorksheet("5 de fuera del temario");
hoja2.addRow(["Nº", "Pregunta", "¿Dice que no está en el temario?", "¿Se inventa algo?", "Respuesta"]).font = { bold: true };
let noEsta = 0;
if (!soloBusqueda && !solo) {
  for (const f of fuera) {
    const [n, pregunta] = f;
    const r = await preguntar(alumnoId, pregunta);
    const ok = r.estado === "no_esta";
    if (ok) noEsta++;
    hoja2.addRow([n, pregunta, ok ? "Sí" : "No", ok ? "No" : r.texto ? "Revisar" : "No", r.texto]);
  }
}

const p90 = tiempos.length ? tiempos.sort((a, b) => a - b)[Math.floor(tiempos.length * 0.9) - 1] ?? tiempos.at(-1)! : null;
const resumen = soloBusqueda
  ? [
      `El buscador trae la página correcta entre los ${process.env.TROZOS || 8} trozos en ${busca} de ${dudas.length} dudas.`,
      `Y el trozo con la frase exacta del temario en ${frases} de ${dudas.length}.`,
    ]
  : [
      `Responden bien: ${bien} de ${dudas.length} (hace falta 47).`,
      `Citan el tema correcto: ${tema} · la página correcta: ${pagina}.`,
      `Se inventan algo: ${inventa} (hace falta 0).`,
      `El buscador trae la página correcta en ${busca} de ${dudas.length}, y el trozo con la frase exacta en ${frases}.`,
      `Fuera del temario: dice que no está en ${noEsta} de ${fuera.length}.`,
      p90 !== null ? `Primera letra: ${(p90 / 1000).toFixed(1)} s en 9 de cada 10 (hace falta menos de 3 s).` : "",
    ].filter(Boolean);
const hoja3 = libro.addWorksheet("Resumen");
for (const l of resumen) hoja3.addRow([l]);
fs.mkdirSync(path.join(carpeta, "resultados"), { recursive: true });
const destino = path.join(carpeta, "resultados", `50-dudas-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}${soloBusqueda ? "-buscador" : iaSimulada() ? "-simulada" : ""}.xlsx`);
await libro.xlsx.writeFile(destino);
console.log(resumen.join("\n"));
console.log(`Hoja: ${path.relative(raiz, destino)}`);
process.exit(0);
