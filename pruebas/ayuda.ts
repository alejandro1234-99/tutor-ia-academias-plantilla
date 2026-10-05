import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

// Ayudas del robot de pruebas. Lee el buzón de pruebas directamente de la
// base de datos de pruebas (DATABASE_URL) para pulsar los enlaces de entrar.

export const bd = postgres(process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:54329/tutor", { prepare: false, max: 2, onnotice: () => {} });

export function correo(alias: string): string {
  const base = process.env.CORREO_PRUEBAS_BASE?.trim();
  if (base && base.includes("@")) {
    const [u, d] = base.split("@");
    return `${u}+${alias}@${d}`;
  }
  return `${alias}@example.com`;
}

export async function ultimoEnlace(para: string, despuesDe: number): Promise<string | null> {
  for (let i = 0; i < 40; i++) {
    const f = await bd`select texto from academia.buzon_pruebas where para = ${para} and id > ${despuesDe} order by id desc limit 1`;
    const m = f[0]?.texto?.match(/https?:\/\/\S+\/entrar\/confirmar\?t=[\w-]+/);
    if (m) return m[0];
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

export async function ultimoIdBuzon(): Promise<number> {
  const f = await bd`select coalesce(max(id), 0)::int as n from academia.buzon_pruebas`;
  return f[0].n;
}

/** Entra como una persona de prueba (pide el enlace y lo pulsa). */
export async function entrarComo(page: Page, alias: string): Promise<void> {
  const para = correo(alias);
  // El freno de 5 enlaces por hora también frena al robot: se repone.
  await bd`delete from academia.limites_peticiones where clave like 'enlace%'`;
  const antes = await ultimoIdBuzon();
  await page.goto("/entrar");
  await page.getByLabel("Tu correo").fill(para);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
  const enlace = await ultimoEnlace(para, antes);
  expect(enlace, `no ha llegado el enlace a ${para}`).toBeTruthy();
  const url = new URL(enlace!);
  await page.goto(url.pathname + url.search);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar") && u.pathname !== "/");
  await page.waitForLoadState("networkidle");
}

export async function personaId(alias: string): Promise<string> {
  const f = await bd`select id from academia.personas where correo = ${correo(alias)}`;
  return f[0].id;
}

/** Deja a una persona sin preguntas usadas hoy (para que las pruebas no se pisen). */
export async function reponerUso(alias: string): Promise<void> {
  const id = await personaId(alias);
  await bd`delete from academia.uso where persona_id = ${id} and fecha = academia.hoy_madrid() and subtipo is distinct from 'inventado'`;
  await bd`delete from academia.limites_peticiones where clave like ${"%" + id + "%"}`;
}
