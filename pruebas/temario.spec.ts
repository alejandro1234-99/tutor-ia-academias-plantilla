import { expect, test } from "@playwright/test";
import { bd, entrarComo, reponerUso } from "./ayuda";

// Capa 1.3 (subir el temario y leerlo) y 3.2 («temario actualizado»).

test("Andrés ve los tres temas con sus páginas, versión y quién los subió", async ({ page }) => {
  await entrarComo(page, "andres");
  await expect(page).toHaveURL(/\/formador\/temario/);
  const filas = page.locator("table tbody tr");
  await expect(filas).toHaveCount(3);
  await expect(filas.nth(0)).toContainText("39");
  await expect(filas.nth(1)).toContainText(/7[34]/);
  await expect(filas.nth(2)).toContainText("123");
  await expect(filas.nth(0)).toContainText("Listo");
});

test("un PDF escaneado: avisa de que no se puede leer", async ({ page }) => {
  await entrarComo(page, "andres");
  await page.goto("/formador/temario/subir");
  await page.getByLabel("Número del tema").fill("9");
  await page.getByLabel("Nombre del tema").fill("Prueba escaneada");
  await page.getByLabel("El PDF del tema").setInputFiles("datos-de-prueba/pdf-escaneado-de-prueba.pdf");
  await page.getByRole("button", { name: "Subir y procesar" }).click();
  await expect(page.getByText("Este PDF parece escaneado y el asistente no podrá leerlo. Súbelo en versión con texto.")).toBeVisible({ timeout: 30_000 });
  const t = await bd`select count(*)::int as n from academia.temas where numero = 9`;
  expect(t[0].n).toBe(0);
});

test("sustituir el tema 2: nueva versión en uso y el material viejo sale como «temario actualizado»", async ({ page, context }) => {
  const tema2 = (await bd`select t.id, v.version from academia.temas t join academia.tema_versiones v on v.id = t.version_actual_id where t.numero = 2`)[0];
  // Lucía crea un resumen del tema 2 con la versión que hay ahora.
  await reponerUso("lucia");
  await bd`delete from academia.uso where tipo = 'material' and persona_id = (select id from academia.personas where correo like 'lucia@%')`;
  await entrarComo(page, "lucia");
  await page.goto("/estudio/crear");
  await page.locator(".opcion-tema").filter({ hasText: "Tema 2 ·" }).first().locator("input").check();
  await page.getByRole("radio", { name: /^Resumen/ }).first().check();
  await page.locator(".solo-ordenador").getByRole("button", { name: /^Crear/ }).click();
  await page.waitForURL(/\/estudio\/material\/[0-9a-f-]{36}/);
  await expect(page.getByRole("button", { name: "Volver a generar" })).toBeVisible({ timeout: 40_000 });
  const material = page.url();
  await expect(page.getByText("Temario actualizado")).toHaveCount(0);
  await context.clearCookies();

  await entrarComo(page, "andres");
  await page.goto(`/formador/temario/subir?tema=${tema2.id}`);
  await page.getByLabel("El PDF del tema").setInputFiles("datos-de-prueba/tema-2-ley-39-2015-procedimiento-administrativo-comun-version-2.pdf");
  await page.getByRole("button", { name: "Subir y procesar" }).click();
  await page.waitForURL(/\/formador\/temario$/, { timeout: 60_000 });
  await expect(page.locator("table tbody tr").nth(1)).toContainText(`v${Number(tema2.version) + 1}`, { timeout: 60_000 });
  await expect(page.locator("table tbody tr").nth(1)).toContainText("74");
  const correo = await bd`select count(*)::int as n from academia.buzon_pruebas where asunto like 'Temario listo%' and para like 'andres%'`;
  expect(correo[0].n).toBeGreaterThan(0);
  await context.clearCookies();
  await entrarComo(page, "lucia");
  await page.goto(material);
  await expect(page.getByText("Temario actualizado").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a crear" })).toBeVisible();
});
