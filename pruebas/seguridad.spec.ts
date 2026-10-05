import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { bd, entrarComo, personaId } from "./ayuda";

// Capa 6.3 · Revisión de seguridad: papel por papel, nadie puede pedir a la
// base de datos lo que no le toca (aunque manipule la página), y las claves
// no llegan al navegador.

/** Ejecuta una consulta como una persona, con las políticas de la base de datos. */
async function como<T>(alias: string, fn: (tx: typeof bd) => Promise<T>, soporte = false): Promise<T> {
  const id = await personaId(alias);
  return (await bd.begin(async (tx) => {
    await tx`select set_config('app.persona_id', ${id}, true), set_config('search_path', 'academia, extensions, public', true)`;
    await tx.unsafe(soporte ? "set local role app_soporte" : "set local role app_usuario");
    return fn(tx as unknown as typeof bd);
  })) as T;
}

async function falla(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "no falló";
  } catch (e) {
    return (e as Error).message;
  }
}

test("un alumno solo ve lo suyo: nada de otros alumnos", async () => {
  const lucia = await personaId("lucia");
  const r = await como("pablo", async (tx) => ({
    conversaciones: (await tx`select count(*)::int as n from conversaciones where alumno_id = ${lucia}`)[0].n,
    mensajes: (await tx`select count(*)::int as n from mensajes where alumno_id = ${lucia}`)[0].n,
    memoria: (await tx`select count(*)::int as n from memoria_notas where alumno_id = ${lucia}`)[0].n,
    tests: (await tx`select count(*)::int as n from intentos_test where alumno_id = ${lucia}`)[0].n,
    materiales: (await tx`select count(*)::int as n from materiales where propietario_id = ${lucia}`)[0].n,
    perfiles: (await tx`select count(*)::int as n from perfiles where alumno_id = ${lucia}`)[0].n,
    personas: (await tx`select count(*)::int as n from personas`)[0].n,
    trozos: (await tx`select count(*)::int as n from trozos`)[0].n,
    dudas: (await tx`select count(*)::int as n from dudas`)[0].n,
    metricas: (await tx`select academia.metricas_uso(academia.hoy_madrid() - 90, null, true, 5) as d`)[0].d,
  }));
  expect(r).toEqual({ conversaciones: 0, mensajes: 0, memoria: 0, tests: 0, materiales: 0, perfiles: 0, personas: 1, trozos: 0, dudas: 0, metricas: { suficientes: false, alumnos: 0 } });
  // Y no puede escribir en lo de otro.
  const n = await como("pablo", async (tx) => (await tx`update conversaciones set titulo = 'x' where alumno_id = ${lucia} returning id`).length);
  expect(n).toBe(0);
  expect(await falla(como("pablo", (tx) => tx`insert into memoria_notas (alumno_id, tipo, texto) values (${lucia}, 'cuesta', 'x')`))).toMatch(/row-level security/);
  expect(await falla(como("pablo", (tx) => tx`update personas set es_dueno = true where id = ${lucia}`))).toMatch(/permission denied|row-level/);
});

test("el formador no ve lo que pregunta un alumno, ni sus notas, ni su memoria, ni de quién es una duda", async () => {
  const r = await como("andres", async (tx) => ({
    mensajes: (await tx`select count(*)::int as n from mensajes`)[0].n,
    conversaciones: (await tx`select count(*)::int as n from conversaciones`)[0].n,
    memoria: (await tx`select count(*)::int as n from memoria_notas`)[0].n,
    tests: (await tx`select count(*)::int as n from intentos_test`)[0].n,
    perfiles: (await tx`select count(*)::int as n from perfiles`)[0].n,
    tardes: (await tx`select count(*)::int as n from personas p join grupos g on g.id = p.grupo_id where g.nombre = 'Tardes'`)[0].n,
  }));
  expect(r).toEqual({ mensajes: 0, conversaciones: 0, memoria: 0, tests: 0, perfiles: 0, tardes: 0 });
  expect(await falla(como("andres", (tx) => tx`select alumno_id from dudas`))).toMatch(/permission denied/);
  expect(await falla(como("andres", (tx) => tx`select academia.metricas_preguntas(academia.hoy_madrid() - 90, null, true, false, 5)`))).toBe("no falló");
});

test("la dueña tampoco: ni preguntas, ni notas, ni memoria de nadie", async () => {
  const r = await como("elena", async (tx) => ({
    mensajes: (await tx`select count(*)::int as n from mensajes`)[0].n,
    memoria: (await tx`select count(*)::int as n from memoria_notas`)[0].n,
    tests: (await tx`select count(*)::int as n from intentos_test`)[0].n,
    perfiles: (await tx`select count(*)::int as n from perfiles`)[0].n,
  }));
  expect(r).toEqual({ mensajes: 0, memoria: 0, tests: 0, perfiles: 0 });
});

test("en modo soporte no se puede cambiar nada (la base de datos lo impide)", async () => {
  expect(await falla(como("elena", (tx) => tx`insert into grupos (oposicion_id, nombre) select id, 'x' from oposiciones limit 1`, true))).toMatch(/permission denied/);
  expect(await falla(como("elena", (tx) => tx`update personas set nombre = 'x'`, true))).toMatch(/permission denied/);
});

test("un alumno pide por la web la conversación de otro: «no encontrado»", async ({ page }) => {
  const lucia = await personaId("lucia");
  const c = await bd`select id from academia.conversaciones where alumno_id = ${lucia} limit 1`;
  test.skip(c.length === 0, "Lucía aún no tiene conversaciones");
  await entrarComo(page, "hugo");
  await page.goto(`/estudio/preguntar/${c[0].id}`);
  await expect(page.getByRole("heading", { name: "No encontrado" })).toBeVisible();
  const r = await page.request.get(`/api/material/${(await bd`select id from academia.materiales where propietario_id = ${lucia} limit 1`)[0]?.id ?? "00000000-0000-0000-0000-000000000000"}/pdf`);
  expect(r.status()).toBe(404);
});

test("la clave de la IA no está en lo que descarga el navegador", async ({ page }) => {
  await entrarComo(page, "lucia");
  const textos: string[] = [];
  page.on("response", async (r) => {
    if (/\.(js|css|html)(\?|$)/.test(r.url()) || r.request().resourceType() === "document") textos.push(await r.text().catch(() => ""));
  });
  for (const ruta of ["/estudio/preguntar", "/estudio/crear", "/estudio/biblioteca"]) await page.goto(ruta);
  const todo = textos.join("\n");
  expect(todo).not.toMatch(/sk-ant-/);
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const clave of ["ANTHROPIC_API_KEY", "VOYAGE_API_KEY", "RESEND_API_KEY", "DATABASE_URL", "CRON_SECRET"]) {
    const valor = env.match(new RegExp(`^${clave}=(.+)$`, "m"))?.[1]?.trim();
    if (valor && valor.length > 8) expect(todo.includes(valor), `${clave} aparece en el navegador`).toBe(false);
  }
});
