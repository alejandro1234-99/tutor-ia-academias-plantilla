import "server-only";
import ExcelJS from "exceljs";
import type { Tx } from "./bd";
import { CORREO_VALIDO } from "./entrar";

// Invitar alumnos de uno en uno o con una lista (SOLUCION.md, 11.2). Una
// lista con errores no invita a nadie hasta que se corrige.

export type FilaLista = { fila: number; nombre: string; correo: string; grupo: string; grupoId: string | null; errores: string[] };

export async function leerLista(nombreArchivo: string, datos: ArrayBuffer): Promise<{ nombre: string; correo: string; grupo: string }[] | null> {
  const filas: string[][] = [];
  const cabecera = new Uint8Array(datos.slice(0, 2));
  const esExcel = /\.xlsx$/i.test(nombreArchivo) || (cabecera[0] === 0x50 && cabecera[1] === 0x4b); // «PK»: un .xlsx es un zip
  if (!esExcel) {
    const texto = new TextDecoder("utf-8").decode(datos).replace(/^﻿/, "");
    const sep = texto.split("\n")[0].includes(";") ? ";" : ",";
    for (const linea of texto.split(/\r?\n/)) {
      if (!linea.trim()) continue;
      const celdas: string[] = [];
      let actual = "";
      let comillas = false;
      for (const c of linea) {
        if (c === '"') comillas = !comillas;
        else if (c === sep && !comillas) {
          celdas.push(actual);
          actual = "";
        } else actual += c;
      }
      celdas.push(actual);
      filas.push(celdas.map((x) => x.trim()));
    }
  } else {
    try {
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(datos);
      const hoja = libro.worksheets[0];
      hoja?.eachRow({ includeEmpty: false }, (row) => {
        const valores = (row.values as unknown[]).slice(1).map((v) => {
          if (v && typeof v === "object" && "text" in (v as object)) return String((v as { text: string }).text);
          if (v && typeof v === "object" && "hyperlink" in (v as object)) return String((v as { hyperlink: string }).hyperlink).replace(/^mailto:/, "");
          return v === null || v === undefined ? "" : String(v);
        });
        filas.push(valores.map((x) => x.trim()));
      });
    } catch {
      return null;
    }
  }
  if (filas.length === 0) return [];
  const cab = filas[0].map((x) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const iN = cab.findIndex((x) => x.startsWith("nombre"));
  const iC = cab.findIndex((x) => x.startsWith("correo") || x.startsWith("email") || x.startsWith("e-mail"));
  const iG = cab.findIndex((x) => x.startsWith("grupo"));
  if (iN < 0 || iC < 0 || iG < 0) return [];
  return filas.slice(1).filter((f) => f.some((x) => x)).map((f) => ({ nombre: f[iN] ?? "", correo: (f[iC] ?? "").toLowerCase(), grupo: f[iG] ?? "" }));
}

export async function validarLista(tx: Tx, filas: { nombre: string; correo: string; grupo: string }[], textos: Record<string, string>): Promise<FilaLista[]> {
  const grupos = await tx`
    select id, nombre from grupos
    where not archivado and (academia.soy_dueno() or id = any(academia.mis_grupos()))`;
  const correos = filas.map((f) => f.correo.trim().toLowerCase());
  const existentes = new Set(
    (await tx`select lower(correo::text) as c from personas where lower(correo::text) = any(${correos}::text[])`).map((x) => x.c as string),
  );
  const vistos = new Map<string, number>();
  return filas.map((f, i) => {
    const errores: string[] = [];
    const correo = f.correo.trim().toLowerCase();
    const grupo = grupos.find((g) => String(g.nombre).toLowerCase() === f.grupo.trim().toLowerCase());
    if (!f.nombre.trim()) errores.push(textos.nombre);
    if (!CORREO_VALIDO.test(correo)) errores.push(textos.correo);
    else if (vistos.has(correo)) errores.push(textos.repetido);
    else if (existentes.has(correo)) errores.push(textos.yaExiste);
    if (!grupo) errores.push(textos.grupo.replace("{grupo}", f.grupo || "—"));
    vistos.set(correo, i);
    return { fila: i + 2, nombre: f.nombre.trim(), correo, grupo: f.grupo.trim(), grupoId: (grupo?.id as string) ?? null, errores };
  });
}

/** Da de alta a los alumnos (con las políticas: solo en los grupos propios). */
export async function darDeAlta(tx: Tx, invitador: string, filas: { nombre: string; correo: string; grupoId: string }[]): Promise<string[]> {
  const ids: string[] = [];
  for (const f of filas) {
    const r = await tx`
      insert into personas (nombre, correo, es_alumno, grupo_id, estado, invitada_at, invitada_por)
      values (${f.nombre.slice(0, 120)}, ${f.correo}, true, ${f.grupoId}, 'invitada', now(), ${invitador})
      returning id`;
    ids.push(r[0].id as string);
  }
  return ids;
}
