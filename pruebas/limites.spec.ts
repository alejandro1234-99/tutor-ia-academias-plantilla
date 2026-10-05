import { expect, test } from "@playwright/test";
import { bd, entrarComo, personaId, reponerUso } from "./ayuda";

// Capa 1.5 · Límites de uso, fallos y «Mis conversaciones».

test.beforeEach(async () => {
  await reponerUso("lucia");
  await bd`insert into academia.ajustes (clave, valor) values ('pruebas.fallo_ia', 'false') on conflict (clave) do update set valor = 'false'`;
});
test.afterAll(async () => {
  await bd`update academia.ajustes set valor = 'false' where clave = 'pruebas.fallo_ia'`;
  await reponerUso("lucia");
});

test("si la IA falla, lo dice claro, ofrece reintentar y no gasta pregunta", async ({ page }) => {
  await entrarComo(page, "lucia");
  await expect(page.getByText("Te quedan 25 preguntas hoy")).toBeVisible();
  await bd`update academia.ajustes set valor = 'true' where clave = 'pruebas.fallo_ia'`;
  await page.getByLabel("Tu pregunta").fill("¿Qué mayoría hace falta para aprobar una moción de censura?");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByText(/no ha podido contestar ahora.*no se ha gastado ninguna pregunta/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Te quedan 25 preguntas hoy")).toBeVisible();
  await bd`update academia.ajustes set valor = 'false' where clave = 'pruebas.fallo_ia'`;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("link", { name: /art\. 113 · página 23/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Te quedan 24 preguntas hoy")).toBeVisible();
});

test("con 24 preguntas gastadas, la 25 funciona y la 26 dice cuándo vuelve a tener", async ({ page }) => {
  const id = await personaId("lucia");
  for (let i = 0; i < 24; i++) await bd`insert into academia.uso (persona_id, tipo, subtipo, modelo) values (${id}, 'pregunta', 'pruebas', 'pruebas')`;
  await entrarComo(page, "lucia");
  await expect(page.getByText("Te queda 1 pregunta hoy")).toBeVisible();
  await page.getByLabel("Tu pregunta").fill("¿Qué mayoría hace falta para aprobar una moción de censura?");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByRole("link", { name: /art\. 113/ })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Tu pregunta").fill("¿Y la cuestión de confianza?");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByText("Has usado tus 25 preguntas de hoy. Mañana a las 00:00 vuelves a tener 25.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Tu pregunta")).toBeDisabled();
});

test("sin conexión: avisa y lo envía al volver", async ({ page, context }) => {
  await entrarComo(page, "lucia");
  await context.setOffline(true);
  await page.getByLabel("Tu pregunta").fill("¿Qué mayoría hace falta para aprobar una moción de censura?");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByText("Sin conexión. Tu mensaje se enviará al volver.")).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("link", { name: /art\. 113/ })).toBeVisible({ timeout: 30_000 });
});

test("Mis conversaciones: buscar, renombrar y borrar de verdad", async ({ page }) => {
  await entrarComo(page, "lucia");
  await page.getByLabel("Tu pregunta").fill("¿Qué mayoría hace falta para aprobar una moción de censura?");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByRole("link", { name: /art\. 113/ })).toBeVisible({ timeout: 30_000 });
  const id = page.url().split("/").pop()!;
  await page.goto("/estudio/conversaciones?q=moción");
  const fila = page.locator(".elemento-biblio", { has: page.locator(`a[href="/estudio/preguntar/${id}"]`) });
  await expect(fila).toBeVisible();
  page.on("dialog", (d) => (d.type() === "confirm" ? d.accept() : d.dismiss()));
  await fila.locator("summary").click();
  await fila.getByRole("button", { name: "Renombrar" }).click();
  await page.getByLabel("Nuevo nombre").fill("Repaso moción");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("link", { name: "Repaso moción" })).toBeVisible();
  const fila2 = page.locator(".elemento-biblio", { hasText: "Repaso moción" });
  await fila2.locator("summary").click();
  await fila2.getByRole("button", { name: "Borrar" }).click();
  await expect(page.getByRole("link", { name: "Repaso moción" })).toHaveCount(0);
  expect((await bd`select count(*)::int as n from academia.mensajes where conversacion_id = ${id}`)[0].n).toBe(0);
});
