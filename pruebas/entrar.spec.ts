import { expect, test } from "@playwright/test";
import { correo, entrarComo, ultimoEnlace, ultimoIdBuzon } from "./ayuda";

// Capa 1.2 · Entrar con enlace y cada papel en su parte.

test("un alumno invitado entra con el enlace, sin contraseña", async ({ page }) => {
  await entrarComo(page, "lucia");
  await expect(page).toHaveURL(/\/estudio\/preguntar/);
  await expect(page.getByRole("heading", { name: "Hola, Lucía." })).toBeVisible();
});

test("un correo no invitado ve el mismo mensaje y no recibe nada", async ({ page }) => {
  const antes = await ultimoIdBuzon();
  await page.goto("/entrar");
  await page.getByLabel("Tu correo").fill("nadie-invitado@example.com");
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
  expect(await ultimoEnlace("nadie-invitado@example.com", antes)).toBeNull();
});

test("el enlace solo sirve una vez", async ({ page, context }) => {
  const para = correo("sara");
  const antes = await ultimoIdBuzon();
  await page.goto("/entrar");
  await page.getByLabel("Tu correo").fill(para);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  const enlace = new URL((await ultimoEnlace(para, antes))!);
  await page.goto(enlace.pathname + enlace.search);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/estudio/);
  await context.clearCookies();
  await page.goto(enlace.pathname + enlace.search);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Este enlace ya no sirve" })).toBeVisible();
});

test("falta la @: lo dice en español", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Tu correo").fill("lucia.correo.es");
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByText("Falta la @. Revisa el correo y vuelve a probar.")).toBeVisible();
});
