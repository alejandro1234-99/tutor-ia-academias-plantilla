import { expect, test } from "@playwright/test";
import { bd, correo, entrarComo, personaId, reponerUso, ultimoEnlace, ultimoIdBuzon } from "./ayuda";

// Etapa 4 · La parte del formador.

test.afterAll(async () => {
  // Deja la base de pruebas como estaba: fuera los alumnos de la lista y Pablo otra vez activo.
  await bd`delete from academia.personas where correo like '%@example.com' and correo not in (select correo from academia.personas where correo ~ '^(elena|andres|lucia|pablo|sara|diego|laura|marta|hugo|paula|ivan|nerea)@')`;
  await bd`update academia.personas set estado = 'activa', baja_at = null, borrar_desde = null where correo = ${correo("pablo")}`;
});

test("Andrés solo ve a los alumnos de «Mañanas», sin datos de preguntas ni notas", async ({ page }) => {
  await entrarComo(page, "andres");
  await page.goto("/formador/alumnos");
  const filas = page.locator("table tbody tr");
  await expect(filas).toHaveCount(5);
  for (const t of await filas.allTextContents()) expect(t).toContain("Mañanas");
  await expect(page.getByText("Tardes")).toHaveCount(0);
  const cabecera = (await page.locator("table thead").textContent()) ?? "";
  expect(cabecera).not.toMatch(/nota|pregunta|progreso/i);
});

test("lista de 10 alumnos con un correo mal escrito: marca la fila y no invita a nadie; corregida, invita a los 10", async ({ page }) => {
  // La lista tiene alumnos de «Mañanas» y de «Tardes»: la sube Elena, la dueña.
  await entrarComo(page, "elena");
  await page.goto("/papel/formador");
  await page.goto("/formador/alumnos/invitar?modo=lista");
  await page.getByLabel(/Sube la lista/).setInputFiles("datos-de-prueba/alumnos-de-prueba.csv");
  const mala = page.locator("tr.con-error");
  await expect(mala).toHaveCount(1, { timeout: 15_000 });
  await expect(mala).toContainText("ruben.morales.example.com");
  await expect(mala).toContainText("Correo mal escrito");
  await expect(page.getByRole("button", { name: /Invitar a 10 alumnos/ })).toBeDisabled();
  expect((await bd`select count(*)::int as n from academia.personas where correo = 'javier.ortega@example.com'`)[0].n).toBe(0);
  await page.getByLabel(/Sube la lista/).setInputFiles("datos-de-prueba/alumnos-de-prueba-corregida.csv");
  await expect(page.getByText("10 alumnos listos para invitar")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Invitar a 10 alumnos" }).click();
  await expect(page.getByText("Se han enviado 10 invitaciones.")).toBeVisible();
  await expect.poll(async () => (await bd`select count(*)::int as n from academia.buzon_pruebas where para = 'ruben.morales@example.com' and de like '%Academia Temario Claro%'`)[0].n).toBeGreaterThan(0);
  await bd`delete from academia.personas where correo in ('marta.gil@example.com','javier.ortega@example.com','nuria.castano@example.com','ruben.morales@example.com','irene.delgado@example.com','sergio.navarro@example.com','carmen.ortiz@example.com','daniel.herrera@example.com','alba.iglesias@example.com','oscar.prieto@example.com')`;
});

test("Andrés no puede invitar a un grupo que no es suyo", async ({ page }) => {
  await entrarComo(page, "andres");
  await page.goto("/formador/alumnos/invitar?modo=lista");
  const csv = "Nombre,Correo,Grupo\nAlguien De Tardes,tardes.prueba@example.com,Tardes\n";
  await page.getByLabel(/Sube la lista/).setInputFiles({ name: "lista.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator("tr.con-error")).toContainText("no es tuyo");
});

test("Andrés invita la lista corregida de su grupo y a Pablo le da de baja: ya no puede entrar", async ({ page, context }) => {
  await entrarComo(page, "andres");
  await page.goto("/formador/alumnos/invitar?modo=lista");
  const csv = "Nombre,Correo,Grupo\nJavier Ortega Lara,javier.ortega@example.com,Mañanas\nNuria Castaño Vidal,nuria.castano@example.com,Mañanas\n";
  await page.getByLabel(/Sube la lista/).setInputFiles({ name: "lista.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText("2 alumnos listos para invitar")).toBeVisible();
  await page.getByRole("button", { name: "Invitar a 2 alumnos" }).click();
  await expect(page.getByText("Se han enviado 2 invitaciones.")).toBeVisible();
  await expect.poll(async () => (await bd`select count(*)::int as n from academia.buzon_pruebas where para = 'javier.ortega@example.com' and de like '%Temario Claro%'`)[0].n).toBeGreaterThan(0);
  // Baja de Pablo.
  await page.goto("/formador/alumnos");
  const fila = page.locator("tr", { hasText: "Pablo Serrano" });
  page.on("dialog", (d) => d.accept());
  await fila.getByRole("group").or(fila.locator("summary")).first().click();
  await fila.getByRole("button", { name: "Dar de baja" }).click();
  await expect(fila).toContainText("De baja");
  await context.clearCookies();
  const antes = await ultimoIdBuzon();
  await page.goto("/entrar");
  await page.getByLabel("Tu correo").fill(correo("pablo"));
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
  expect(await ultimoEnlace(correo("pablo"), antes)).toBeNull();
});

test("la duda llega sin nombre; al contestarla con nota, al alumno le aparece y otro alumno recibe la cita de la nota", async ({ page, context }) => {
  await bd`delete from academia.notas_formador`;
  await reponerUso("lucia");
  await reponerUso("sara");
  await entrarComo(page, "lucia");
  const campo = page.getByLabel("Tu pregunta");
  await campo.fill("¿Cuánto se cobra por cada trienio?");
  await campo.press("Enter");
  await expect(page.getByText("No está en el temario")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Sí", exact: true }).click();
  await expect(page.getByText("Enviada a tu formador.")).toBeVisible();
  const conversacion = page.url();
  await context.clearCookies();

  await entrarComo(page, "andres");
  await page.goto("/formador/dudas");
  const duda = page.getByRole("link", { name: /trienio/ }).first();
  await expect(duda).toBeVisible();
  expect(await page.content()).not.toContain("Lucía");
  await duda.click();
  await page.getByLabel("Tu respuesta").fill("Los trienios se cobran según el grupo del funcionario: cada trienio suma una cantidad fija al mes que fija la ley de presupuestos de cada año.");
  await page.getByLabel("Guardar como nota del formador en este tema").check();
  await page.getByLabel("Elige el tema").selectOption({ label: "Tema 2 · Ley 39/2015" });
  await page.getByRole("button", { name: "Enviar respuesta" }).click();
  await page.waitForURL(/\/formador\/dudas$/);
  await context.clearCookies();

  await entrarComo(page, "lucia");
  await page.goto(conversacion);
  await expect(page.getByText("Respuesta de tu formador")).toBeVisible();
  await expect(page.getByText(/Nota del formador · Tema 2/)).toBeVisible();
  await expect.poll(async () => (await bd`select count(*)::int as n from academia.buzon_pruebas where para = ${correo("lucia")} and asunto like 'Tu formador ha contestado%'`)[0].n).toBeGreaterThan(0);
  await context.clearCookies();

  await entrarComo(page, "sara");
  await page.getByLabel("Tu pregunta").fill("¿Cuánto se cobra por cada trienio?");
  await page.getByLabel("Tu pregunta").press("Enter");
  await expect(page.getByText(/Nota del formador · Tema 2/)).toBeVisible({ timeout: 30_000 });
});

test("el formador comparte un test con «Mañanas»: Lucía lo ve en «De mi academia» y Marta no", async ({ page, context }) => {
  await bd`delete from academia.uso where tipo = 'material' and persona_id = ${await personaId("andres")}`;
  await entrarComo(page, "andres");
  await page.goto("/formador/material/crear");
  await page.locator(".opcion-tema").filter({ hasText: "Tema 1 ·" }).first().locator("input").check();
  await page.getByRole("radio", { name: /^Test de práctica/ }).first().check();
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.locator(".solo-ordenador").getByRole("button", { name: /^Crear/ }).click();
  await page.waitForURL(/\/formador\/material\/[0-9a-f-]{36}/);
  await expect(page.getByText("Compartir con")).toBeVisible({ timeout: 40_000 });
  await page.getByLabel("Mañanas").check();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Guardado.")).toBeVisible();
  const titulo = (await page.locator("h1").textContent())!.trim();
  await context.clearCookies();
  await entrarComo(page, "lucia");
  await page.goto("/estudio/biblioteca?tab=academia");
  await expect(page.getByText(titulo).first()).toBeVisible();
  await context.clearCookies();
  await entrarComo(page, "marta");
  await page.goto("/estudio/biblioteca?tab=academia");
  await expect(page.getByText("Tu formador aún no ha compartido material")).toBeVisible();
});
