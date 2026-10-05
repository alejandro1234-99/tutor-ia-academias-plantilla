"use server";

import { redirect } from "next/navigation";
import { T } from "@/textos";
import { confirmarEnlace, pedirEnlace } from "@/servidor/entrar";
import { cerrarSesion } from "@/servidor/sesion";

export type EstadoEntrar = { error?: string; correo?: string };

export async function accionPedirEnlace(_previo: EstadoEntrar, datos: FormData): Promise<EstadoEntrar> {
  const correo = String(datos.get("correo") || "");
  if (!correo.includes("@")) return { error: T.entrar.faltaArroba, correo };
  const r = await pedirEnlace(correo);
  if (!r.ok) return { error: r.motivo === "correo" ? T.entrar.correoMal : T.entrar.demasiados, correo };
  redirect(`/entrar/revisa?correo=${encodeURIComponent(correo.trim().toLowerCase())}`);
}

export async function accionReenviar(correo: string): Promise<{ ok: boolean; error?: string }> {
  const r = await pedirEnlace(correo);
  if (!r.ok) return { ok: false, error: r.motivo === "correo" ? T.entrar.correoMal : T.entrar.demasiados };
  return { ok: true };
}

export async function accionConfirmar(datos: FormData): Promise<void> {
  const token = String(datos.get("t") || "");
  const r = await confirmarEnlace(token);
  redirect(r.ok ? "/" : "/entrar/caducado");
}

export async function accionSalir(): Promise<void> {
  await cerrarSesion();
  redirect("/entrar");
}
