import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { oposicionDe } from "@/servidor/alumno";
import { unMaterial } from "@/servidor/materiales";
import { empezarIntento } from "@/servidor/tests";
import { T } from "@/textos";
import { NOMBRE_FORMATO, type ContenidoTest } from "@/tipos/material";
import { HacerTest } from "./HacerTest";

export const metadata: Metadata = { title: NOMBRE_FORMATO.test };

const DIFICULTAD: Record<string, string> = { facil: "Fácil", medio: "Nivel medio", oposicion: "Nivel oposición" };

// A9 · Hacer test o simulacro. Las respuestas correctas NO se mandan al
// navegador hasta terminar.
export default async function PaginaTest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ repaso?: string }> }) {
  const s = await exigirSesion("alumno");
  const { id } = await params;
  const { repaso } = await searchParams;
  const d = await conSesion(s, async (tx) => {
    const m = await unMaterial(tx, s.persona.id, id);
    if (!m || m.estado !== "listo" || (m.formato !== "test" && m.formato !== "simulacro")) return null;
    const c = m.contenido as ContenidoTest;
    if (!c?.suficiente || !c.preguntas.length) return null;
    const op = await oposicionDe(tx, s.persona.id);
    let indices = c.preguntas.map((_, i) => i);
    let modo: "practica" | "simulacro" | "repaso" = m.formato === "simulacro" ? "simulacro" : "practica";
    if (repaso && /^[0-9a-f-]{36}$/i.test(repaso)) {
      const i = await tx`select preguntas, respuestas from intentos_test where id = ${repaso} and material_id = ${id}`;
      if (i[0]) {
        const r = i[0].respuestas as Record<string, number | null>;
        indices = (i[0].preguntas as number[]).filter((p) => r[String(p)] !== c.preguntas[p]?.correcta);
        modo = "repaso";
      }
    }
    const resta = modo === "simulacro" ? (op?.restaPorFallo ?? 1 / 3) : 0;
    const segundos = modo === "simulacro" ? indices.length * (op?.segundosPorPregunta ?? 60) : null;
    const intentoId = s.soporte ? "soporte" : await empezarIntento(tx, s.persona.id, id, modo, indices, resta, segundos);
    return { m, c, indices, modo, resta, segundos, intentoId };
  });
  if (!d) notFound();
  const temas = d.m.temas.map((x) => x.numero);
  const temasTexto = temas.length > 1 ? `Temas ${temas.slice(0, -1).join(", ")} y ${temas.at(-1)}` : `Tema ${temas[0]}`;
  const cabecera =
    d.modo === "simulacro"
      ? `Simulacro · ${temasTexto}`
      : `${d.modo === "repaso" ? T.test.repasarFallos : NOMBRE_FORMATO.test} · ${temasTexto}${d.modo === "practica" ? ` · ${DIFICULTAD[String(d.m.opciones.dificultad ?? "medio")]}` : ""}`;
  return (
    <HacerTest
      materialId={id}
      intentoId={d.intentoId}
      cabecera={cabecera}
      modo={d.modo}
      resta={d.resta}
      segundos={d.segundos}
      preguntas={d.indices.map((i) => ({ indice: i, enunciado: d.c.preguntas[i].enunciado, opciones: d.c.preguntas[i].opciones }))}
    />
  );
}
