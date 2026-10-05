import { expect, test } from "@playwright/test";
import { bd, correo, entrarComo, personaId } from "./ayuda";

// Capa 5.3 · Los correos automáticos (la revisión se lanza a mano desde el panel de pruebas).

async function lanzar(page: import("@playwright/test").Page) {
  await page.goto("/pruebas");
  await page.getByRole("button", { name: "Lanzar la revisión de avisos" }).click();
  await expect(page.locator("pre")).toContainText("Revisión de avisos lanzada", { timeout: 60_000 });
}

test("recordatorio a los 5 días: uno solo; si lo ha desactivado, ninguno", async ({ page }) => {
  const marta = await personaId("marta");
  const hugo = await personaId("hugo");
  await bd`delete from academia.avisos_enviados where clave like 'recordatorio:%'`;
  await bd`update academia.personas set ultimo_acceso_at = now() - interval '5 days 2 hours' where id in (${marta}, ${hugo})`;
  await bd`insert into academia.preferencias (persona_id, recordatorio) values (${hugo}, false) on conflict (persona_id) do update set recordatorio = false`;
  const cuenta = async (alias: string) => (await bd`select count(*)::int as n from academia.buzon_pruebas where para = ${correo(alias)} and asunto like '%te echa de menos'`)[0].n;
  const antesM = await cuenta("marta");
  const antesH = await cuenta("hugo");
  await lanzar(page);
  expect(await cuenta("marta")).toBe(antesM + 1);
  const de = (await bd`select de from academia.buzon_pruebas where para = ${correo("marta")} order by id desc limit 1`)[0].de;
  expect(de).toContain("Academia Temario Claro");
  await lanzar(page);
  expect(await cuenta("marta")).toBe(antesM + 1);
  expect(await cuenta("hugo")).toBe(antesH);
  await bd`update academia.personas set ultimo_acceso_at = now() - interval '12 days' where id = ${marta}`;
  await bd`update academia.personas set ultimo_acceso_at = now() - interval '1 day' where id = ${hugo}`;
  await bd`update academia.preferencias set recordatorio = true where persona_id = ${hugo}`;
});

test("dudas pendientes: un único correo al día al formador", async ({ page }) => {
  const andres = await personaId("andres");
  const lucia = await personaId("lucia");
  const grupo = (await bd`select grupo_id from academia.personas where id = ${lucia}`)[0].grupo_id;
  await bd`delete from academia.avisos_enviados where clave like 'dudas:%'`;
  await bd`insert into academia.dudas (tipo, alumno_id, grupo_id, pregunta) values ('sin_respuesta', ${lucia}, ${grupo}, 'Pregunta de prueba para el aviso')`;
  const cuenta = async () => (await bd`select count(*)::int as n from academia.buzon_pruebas where para = ${correo("andres")} and asunto like 'Tienes % dud% sin contestar'`)[0].n;
  const antes = await cuenta();
  await lanzar(page);
  expect(await cuenta()).toBe(antes + 1);
  await lanzar(page);
  expect(await cuenta()).toBe(antes + 1);
  await bd`update academia.dudas set estado = 'resuelta' where pregunta = 'Pregunta de prueba para el aviso'`;
  expect(andres).toBeTruthy();
});

test("la academia llega al 80 % del tope y la dueña recibe el aviso", async ({ page }) => {
  await bd`delete from academia.avisos_enviados where clave like 'tope%'`;
  const cuenta = async () => (await bd`select count(*)::int as n from academia.buzon_pruebas where para = ${correo("elena")} and asunto like '%80 %%'`)[0].n;
  const antes = await cuenta();
  await page.goto("/pruebas");
  await page.getByRole("button", { name: "Poner el consumo de la academia al 80 %" }).click();
  await expect(page.locator("pre")).toContainText("80 %");
  await lanzar(page);
  expect(await cuenta()).toBe(antes + 1);
  await bd`delete from academia.uso where subtipo = 'pruebas-consumo'`;
});

test("borrar mis datos: al volver a entrar empieza de cero", async ({ page, context }) => {
  const id = await personaId("laura");
  await entrarComo(page, "laura");
  await page.getByLabel("Tu pregunta").fill("¿Qué mayoría hace falta para aprobar una moción de censura?");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByRole("link", { name: /art\. 113/ })).toBeVisible({ timeout: 30_000 });
  await page.goto("/estudio/cuenta");
  const datos = await page.request.get("/api/cuenta/datos");
  expect(datos.status()).toBe(200);
  expect(JSON.stringify(await datos.json())).toContain("moción de censura");
  await page.getByRole("button", { name: "Borrar mis datos" }).click();
  await page.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
  await page.getByRole("button", { name: "Borrar todos mis datos" }).click();
  await page.waitForURL(/\/primera-vez/);
  expect((await bd`select count(*)::int as n from academia.conversaciones where alumno_id = ${id}`)[0].n).toBe(0);
  await context.clearCookies();
  await entrarComo(page, "laura");
  await expect(page).toHaveURL(/\/primera-vez/);
  // Deja a Laura como estaba para otras pruebas.
  await bd`insert into academia.perfiles (alumno_id, privacidad_aceptada_at, edad_confirmada, como_llamar, completado_at) values (${id}, now(), true, 'Laura', now()) on conflict (alumno_id) do nothing`;
});

test("modo soporte: solo lectura, queda registrado y la dueña recibe el aviso", async ({ page }) => {
  await bd`insert into academia.personas (nombre, correo, estado) values ('Soporte técnico', 'tecnico@example.com', 'activa') on conflict (correo) do nothing`;
  await entrarComo(page, "tecnico");
  await expect(page).toHaveURL(/\/tecnico\/coste/);
  await expect(page.getByText("Coste de IA este mes")).toBeVisible();
  const antes = (await bd`select count(*)::int as n from academia.buzon_pruebas where para = ${correo("elena")} and asunto like 'Hemos entrado en modo soporte%'`)[0].n;
  await page.goto("/tecnico/soporte");
  await page.getByRole("button", { name: "Entrar en modo soporte" }).click();
  await expect(page.getByText("Modo soporte · solo lectura")).toBeVisible();
  await page.goto("/ajustes/grupos");
  await expect(page.getByRole("button", { name: "Crear grupo" })).toHaveCount(0);
  await expect.poll(async () => (await bd`select count(*)::int as n from academia.buzon_pruebas where para = ${correo("elena")} and asunto like 'Hemos entrado en modo soporte%'`)[0].n).toBe(antes + 1);
  await page.goto("/ajustes/consumo");
  await expect(page.getByText("tecnico@example.com").first()).toBeVisible();
  await page.getByRole("button", { name: "Salir del modo soporte" }).click();
  await expect(page).toHaveURL(/\/tecnico\/soporte/);
});
