"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { conSesion, exigirSesion, prohibirEnSoporte, type Sesion } from "@/servidor/sesion";
import { estadoMateriales } from "@/servidor/limites";
import { generarMaterial } from "@/servidor/ia/material";
import type { Estilo, Formato, OpcionesMaterial } from "@/tipos/material";
import type { Limite } from "@/tipos/chat";

// Acciones sobre el material: crear, volver a generar, renombrar, mover,
// borrar, valorar y carpetas. Las usan el alumno y el formador.

const FORMATOS: Formato[] = ["resumen", "esquema", "presentacion", "tarjetas", "test", "simulacro"];
const ESTILOS: Estilo[] = ["esquema", "cornell", "ejecutivo"];

async function sesionCreadora(): Promise<Sesion> {
  const s = await exigirSesion();
  prohibirEnSoporte(s);
  if (!s.papeles.includes("alumno") && !s.papeles.includes("formador")) throw new Error("No puedes crear material.");
  return s;
}

export type ResultadoCrear = { id?: string; limite?: Limite; error?: string };

export async function crearMaterial(datos: {
  temaIds: string[];
  formato: Formato;
  estilo?: Estilo | null;
  opciones?: OpcionesMaterial;
  paraClase?: boolean;
}): Promise<ResultadoCrear> {
  const s = await sesionCreadora();
  const deFormador = !!datos.paraClase && s.papeles.includes("formador");
  if (!deFormador && !s.papeles.includes("alumno")) return { error: "No puedes crear material." };
  const temaIds = [...new Set(datos.temaIds)].slice(0, 3);
  if (temaIds.length === 0 || !FORMATOS.includes(datos.formato)) return { error: "Elige tema y formato." };
  const o = datos.opciones ?? {};
  const opciones: OpcionesMaterial = {
    diapositivas: datos.formato === "presentacion" ? Math.min(20, Math.max(10, Number(o.diapositivas) || 12)) : undefined,
    numero:
      datos.formato === "tarjetas"
        ? Math.min(60, Math.max(20, Number(o.numero) || 30))
        : datos.formato === "test" || datos.formato === "simulacro"
          ? [10, 20, 30, 50].includes(Number(o.numero)) ? Number(o.numero) : 20
          : undefined,
    literal: datos.formato === "tarjetas" ? !!o.literal : undefined,
    dificultad: datos.formato === "test" ? (["facil", "medio", "oposicion"].includes(String(o.dificultad)) ? o.dificultad : "medio") : datos.formato === "simulacro" ? "oposicion" : undefined,
  };
  const estilo: Estilo | null = datos.formato === "resumen" ? (ESTILOS.includes(datos.estilo as Estilo) ? (datos.estilo as Estilo) : "esquema") : null;

  const r = await conSesion(s, async (tx) => {
    const lim = await estadoMateriales(tx, s.persona.id, deFormador);
    if (lim.bloqueo) return { limite: lim.bloqueo } as ResultadoCrear;
    const visibles = await tx`select id from temas where id = any(${temaIds}::uuid[]) and version_actual_id is not null`;
    if (visibles.length !== temaIds.length) return { error: "Alguno de esos temas no está disponible." } as ResultadoCrear;
    const f = await tx`
      insert into materiales (propietario_id, es_de_formador, formato, estilo, tema_ids, opciones)
      values (${s.persona.id}, ${deFormador}, ${datos.formato}, ${estilo}, ${temaIds}::uuid[], ${tx.json(opciones as never)})
      returning id`;
    return { id: f[0].id as string } as ResultadoCrear;
  });
  if (r.id) {
    const id = r.id;
    after(() => generarMaterial(id));
  }
  return r;
}

export async function regenerarMaterial(id: string): Promise<ResultadoCrear> {
  const s = await sesionCreadora();
  const r = await conSesion(s, async (tx) => {
    const m = await tx`select id, es_de_formador from materiales where id = ${id} and propietario_id = ${s.persona.id}`;
    if (!m[0]) return { error: "No encontrado" } as ResultadoCrear;
    const lim = await estadoMateriales(tx, s.persona.id, m[0].esDeFormador as boolean);
    if (lim.bloqueo) return { limite: lim.bloqueo } as ResultadoCrear;
    await tx`update materiales set estado = 'creando', progreso = 0, paso = null, error = null, intentos = intentos + 1, actualizado_at = now() where id = ${id}`;
    return { id } as ResultadoCrear;
  });
  if (r.id) after(() => generarMaterial(id));
  return r;
}

/** Reintentar tras un fallo nuestro: no cuenta como material nuevo. */
export async function reintentarMaterial(id: string): Promise<ResultadoCrear> {
  const s = await sesionCreadora();
  const ok = await conSesion(s, async (tx) => {
    const f = await tx`update materiales set estado = 'creando', progreso = 0, paso = null, error = null where id = ${id} and estado = 'error' returning id`;
    return f.length > 0;
  });
  if (ok) after(() => generarMaterial(id));
  return ok ? { id } : { error: "No encontrado" };
}

export async function renombrarMaterial(id: string, titulo: string) {
  const s = await sesionCreadora();
  const limpio = titulo.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!limpio) return { ok: false };
  await conSesion(s, (tx) => tx`update materiales set titulo = ${limpio} where id = ${id}`);
  revalidatePath("/estudio/biblioteca");
  return { ok: true };
}

export async function moverMaterial(id: string, carpetaId: string | null) {
  const s = await sesionCreadora();
  await conSesion(s, async (tx) => {
    if (carpetaId) {
      const c = await tx`select id from carpetas where id = ${carpetaId}`;
      if (!c[0]) return;
    }
    await tx`update materiales set carpeta_id = ${carpetaId} where id = ${id}`;
  });
  revalidatePath("/estudio/biblioteca");
  return { ok: true };
}

export async function borrarMaterial(id: string) {
  const s = await sesionCreadora();
  await conSesion(s, (tx) => tx`delete from materiales where id = ${id}`);
  revalidatePath("/estudio/biblioteca");
  return { ok: true };
}

export async function valorarMaterial(id: string, valoracion: "sirvio" | "no_sirvio" | null) {
  const s = await sesionCreadora();
  await conSesion(s, (tx) => tx`update materiales set valoracion = ${valoracion} where id = ${id}`);
  return { ok: true };
}

export async function crearCarpeta(nombre: string) {
  const s = await sesionCreadora();
  const limpio = nombre.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!limpio) return { ok: false };
  const f = await conSesion(s, (tx) => tx`insert into carpetas (alumno_id, nombre) values (${s.persona.id}, ${limpio}) returning id`);
  revalidatePath("/estudio/biblioteca");
  return { ok: true, id: f[0].id as string };
}

export async function renombrarCarpeta(id: string, nombre: string) {
  const s = await sesionCreadora();
  const limpio = nombre.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!limpio) return { ok: false };
  await conSesion(s, (tx) => tx`update carpetas set nombre = ${limpio} where id = ${id}`);
  revalidatePath("/estudio/biblioteca");
  return { ok: true };
}

export async function borrarCarpeta(id: string) {
  const s = await sesionCreadora();
  await conSesion(s, (tx) => tx`delete from carpetas where id = ${id}`);
  revalidatePath("/estudio/biblioteca");
  return { ok: true };
}
