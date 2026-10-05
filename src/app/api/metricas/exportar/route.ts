import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { config } from "@/configuracion";
import { papelGestion } from "@/servidor/gestion";
import { conSesion, obtenerSesion } from "@/servidor/sesion";
import { contextoMetricas, datosDudas, datosMaterial, datosProgreso, datosRiesgo, datosUso, nombresTemas } from "@/servidor/metricas";
import { permitir } from "@/servidor/limites-peticiones";
import { T } from "@/textos";
import { tipoMaterial, type Formato } from "@/tipos/material";

export const maxDuration = 60;

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Exportar a Excel: los mismos datos que la pantalla, con los mismos filtros
// y la misma regla de los 5 alumnos. Nunca lo que preguntó un alumno concreto.
export async function GET(req: NextRequest) {
  const s = await obtenerSesion();
  if (!s) return new Response("No encontrado", { status: 404 });
  const papel = await papelGestion(s);
  if (papel !== "formador" && papel !== "dueno") return new Response("No encontrado", { status: 404 });
  if (!(await permitir(`exportar:${s.persona.id}`, 20, 60))) return new Response("Espera un minuto", { status: 429 });
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const seccion = sp.seccion ?? "uso";
  const M = T.metricas;

  const libro = new ExcelJS.Workbook();
  libro.creator = config.nombre;
  const hoja = libro.addWorksheet("Métricas");
  const pocos = [M.pocos];

  await conSesion(s, async (tx) => {
    const c = await contextoMetricas(tx, papel, sp);
    const grupos = c.opciones.grupos.filter((g) => !c.grupos || c.grupos.includes(g.id)).map((g) => g.nombre).join(", ");
    hoja.addRow([config.nombre]).font = { bold: true, size: 14 };
    hoja.addRow([`${M.periodo}: últimos ${c.filtros.dias} días · ${c.esDueno ? M.alcanceDueno : M.alcanceFormador}${grupos ? ` · ${grupos}` : ""}`]);
    hoja.addRow([]);

    if (seccion === "uso") {
      const d = await datosUso(tx, c);
      hoja.addRow([M.uso.titulo]).font = { bold: true };
      if (!d.suficientes) hoja.addRow(pocos);
      else {
        hoja.addRow([M.uso.activos, d.activos]);
        hoja.addRow([M.uso.preguntas, d.preguntas]);
        hoja.addRow([M.uso.materiales, d.materiales]);
        hoja.addRow([]);
        hoja.addRow([M.uso.horas]).font = { bold: true };
        hoja.addRow(["Día", ...Array.from({ length: 24 }, (_, h) => `${h}h`)]).font = { bold: true };
        for (let dia = 1; dia <= 7; dia++) {
          hoja.addRow([DIAS[dia - 1], ...Array.from({ length: 24 }, (_, h) => d.mapa?.find((x) => x.dia === dia && x.hora === h)?.n ?? 0)]);
        }
      }
    } else if (seccion === "dudas") {
      const d = await datosDudas(tx, c);
      const temas = await nombresTemas(tx);
      if (!d.suficientes) hoja.addRow(pocos);
      else {
        for (const [titulo, lista] of [
          [M.dudas.frecuentes, d.frecuentes],
          [M.dudas.falta, d.falta],
        ] as const) {
          hoja.addRow([titulo]).font = { bold: true };
          hoja.addRow(["Asunto", "Tema", "Dudas", "Alumnos"]).font = { bold: true };
          for (const a of lista) hoja.addRow([a.asunto, a.tema ? `Tema ${a.tema} · ${temas.get(a.tema) ?? ""}` : "", a.dudas, a.alumnos]);
          hoja.addRow([]);
        }
        hoja.addRow([M.dudas.atascos]).font = { bold: true };
        if (!d.atascos.suficientes) hoja.addRow(pocos);
        else {
          hoja.addRow(["Tema", "Dudas", "% fallos en tests"]).font = { bold: true };
          for (const x of d.atascos.temas ?? []) hoja.addRow([`Tema ${x.tema} · ${x.nombre}`, x.dudas, x.fallosPct ?? ""]);
        }
      }
    } else if (seccion === "riesgo") {
      const lista = await datosRiesgo(tx, c);
      hoja.addRow([M.riesgo.titulo]).font = { bold: true };
      hoja.addRow([M.riesgo.columnas.nombre, M.riesgo.columnas.grupo, M.riesgo.columnas.dias, M.riesgo.columnas.correo]).font = { bold: true };
      for (const a of lista) hoja.addRow([a.nombre, a.grupo, a.dias ?? M.riesgo.nunca, a.correo]);
    } else if (seccion === "progreso") {
      const grupos = await datosProgreso(tx, c);
      const temas = await nombresTemas(tx);
      hoja.addRow([M.progreso.titulo]).font = { bold: true };
      hoja.addRow(["Grupo", "Tests", M.progreso.notaMedia, "Tema", "% aciertos"]).font = { bold: true };
      for (const g of grupos) {
        if (!g.suficientes) hoja.addRow([g.grupo, M.faltan]);
        else if (!(g.temas ?? []).length) hoja.addRow([g.grupo, g.tests, g.nota]);
        else for (const x of g.temas!) hoja.addRow([g.grupo, g.tests, g.nota, `Tema ${x.tema} · ${temas.get(x.tema) ?? ""}`, x.pct]);
      }
    } else if (seccion === "material") {
      const d = await datosMaterial(tx, c);
      hoja.addRow([M.material.titulo]).font = { bold: true };
      if (!d.suficientes) hoja.addRow(pocos);
      else {
        hoja.addRow(["Formato", "Creados", "Valorados", "No me sirvió"]).font = { bold: true };
        for (const f of d.formatos ?? []) hoja.addRow([tipoMaterial(f.formato as Formato, f.estilo || null), f.creados, f.valorados, f.noSirvio]);
      }
    }
  });
  hoja.columns.forEach((col) => (col.width = 22));
  const buffer = await libro.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="metricas-${seccion}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
