import { expect, test } from "@playwright/test";
import { bd, correo, entrarComo, personaId, reponerUso } from "./ayuda";

// Capa 2.1 (primera vez, perfil y modos) y 2.2 (memoria).

test("la primera vez: privacidad, IA, edad y cinco preguntas; la segunda ya no; saluda con su nombre", async ({ page, context }) => {
  const id = await personaId("nerea");
  await bd`delete from academia.perfiles where alumno_id = ${id}`;
  await bd`update academia.personas set estado = 'invitada', invitacion_aceptada_at = null where id = ${id}`;
  await reponerUso("nerea");
  const bienvenidas = async () => (await bd`select count(*)::int as n from academia.buzon_pruebas where para = ${correo("nerea")} and asunto like 'Bienvenido%'`)[0].n;
  const antes = await bienvenidas();
  await entrarComo(page, "nerea");
  await expect(page).toHaveURL(/\/primera-vez/);
  await expect(page.getByText("Lo que no ve nunca")).toBeVisible();
  await expect(page.getByText(/asistente con inteligencia artificial/).first()).toBeVisible();
  await page.getByRole("button", { name: "Entendido" }).click();
  await expect(page.getByText("Marca la casilla para seguir.")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Entendido" }).click();
  await page.getByLabel("¿Cómo quieres que te llame?").fill("Lucía");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("Auxiliar Administrativo del Estado")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByText("Repito").click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByText("De 2 a 4 horas").click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByText("Memorizar leyes").click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByRole("heading", { name: "Hola, Lucía." })).toBeVisible();
  await expect.poll(bienvenidas).toBe(antes + 1);
  await context.clearCookies();
  await entrarComo(page, "nerea");
  await expect(page).toHaveURL(/\/estudio\/preguntar/);
});

test("cambiar el nombre en «Lo que sé de ti» cambia el saludo", async ({ page }) => {
  await entrarComo(page, "sara");
  await page.goto("/estudio/lo-que-se-de-ti");
  await page.getByLabel("Cómo quieres que te llame").fill("Sarita");
  await page.getByRole("button", { name: "Guardar el perfil" }).click();
  await expect(page.getByText(/Perfil guardado/)).toBeVisible();
  await page.goto("/estudio/preguntar");
  await expect(page.getByRole("heading", { name: "Hola, Sarita." })).toBeVisible();
  await page.goto("/estudio/lo-que-se-de-ti");
  await page.getByLabel("Cómo quieres que te llame").fill("Sara");
  await page.getByRole("button", { name: "Guardar el perfil" }).click();
});

test("la memoria apunta lo que falla en modo examinador, lo propone al abrir el chat y se borra de verdad", async ({ page }) => {
  const id = await personaId("diego");
  await bd`delete from academia.memoria_notas where alumno_id = ${id}`;
  await bd`delete from academia.conversaciones where alumno_id = ${id}`;
  await reponerUso("diego");
  await entrarComo(page, "diego");
  await page.getByRole("button", { name: "Examinador" }).first().click();
  await page.getByLabel("Tu pregunta").fill("Pregúntame sobre la moción de censura");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByText(/Pregunta:/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Me sirvió", exact: true })).toBeVisible();
  await page.getByLabel("Tu pregunta").fill("Con mayoría simple del Senado");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByText(/Vamos a comprobarlo/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Me sirvió", exact: true }).nth(1)).toBeVisible();
  // Al empezar otra conversación, la anterior pasa a la memoria.
  await page.getByRole("button", { name: "Nueva conversación" }).click();
  await page.getByLabel("Tu pregunta").fill("¿Cuál es la forma política del Estado?");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect.poll(async () => (await bd`select count(*)::int as n from academia.memoria_notas where alumno_id = ${id}`)[0].n, { timeout: 20_000 }).toBeGreaterThan(0);
  await page.goto("/estudio/lo-que-se-de-ti");
  await expect(page.getByText(/moción de censura/).first()).toBeVisible();
  await page.goto("/estudio/preguntar");
  await expect(page.getByText(/La última vez te costó la moción de censura/)).toBeVisible();
  await page.goto("/estudio/lo-que-se-de-ti");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar todo" }).click();
  await expect(page.getByText("Iré apuntando lo que te cuesta")).toBeVisible();
  expect((await bd`select count(*)::int as n from academia.memoria_notas where alumno_id = ${id}`)[0].n).toBe(0);
});
