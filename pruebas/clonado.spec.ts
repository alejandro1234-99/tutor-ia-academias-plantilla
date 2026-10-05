import { expect, test } from "@playwright/test";
import postgres from "postgres";

// Capa 6.4 · Ensayo de clonado con Academia Vanguardia (otra copia, otra base
// de datos y otra dirección). Solo se lanza si Vanguardia está arrancada:
//   URL_VANGUARDIA=http://localhost:3100 BD_VANGUARDIA=postgres://…/tutor_vanguardia
const URL_VG = process.env.URL_VANGUARDIA;
const BD_VG = process.env.BD_VANGUARDIA;
test.skip(!URL_VG || !BD_VG, "Vanguardia no está arrancada");

const bdVg = BD_VG ? postgres(BD_VG, { prepare: false, max: 1 }) : null;

async function pedirEnlace(page: import("@playwright/test").Page, url: string, correo: string) {
  await page.goto(`${url}/entrar`);
  await page.getByLabel("Tu correo").fill(correo);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
}

test("Vanguardia: su nombre, su asistente «Vega», sus colores y su icono", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`${URL_VG}/entrar`);
  await expect(page).toHaveTitle(/Vanguardia/);
  await expect(page.getByRole("img", { name: "Academia Vanguardia" })).toBeVisible();
  const brand = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--brand").trim());
  expect(brand.toUpperCase()).toBe("#1B2A4A");
  const acento = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  expect(acento.toUpperCase()).toBe("#C8102E");
  const manifiesto = await (await page.request.get(`${URL_VG}/manifest.webmanifest`)).json();
  expect(manifiesto.name).toBe("Academia Vanguardia");
  // Entra un alumno de Vanguardia y le saluda «Vega».
  await bdVg!`delete from academia.limites_peticiones`;
  const antes = (await bdVg!`select coalesce(max(id),0)::int as n from academia.buzon_pruebas`)[0].n;
  await pedirEnlace(page, URL_VG!, "vg-javier@example.com");
  const correo = await bdVg!`select de, texto from academia.buzon_pruebas where id > ${antes} and para = 'vg-javier@example.com' order by id desc limit 1`;
  expect(correo[0].de).toContain("Academia Vanguardia");
  const enlace = new URL(correo[0].texto.match(/https?:\/\/\S+\/entrar\/confirmar\?t=[\w-]+/)[0]);
  await page.goto(`${URL_VG}${enlace.pathname}${enlace.search}`);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/Soy Vega/)).toBeVisible();
  await expect(page.getByPlaceholder("Pregúntale a Vega…")).toBeVisible();
});

test("un alumno de Temario Claro no puede entrar en Vanguardia, ni al revés", async ({ page }) => {
  const antesVg = (await bdVg!`select coalesce(max(id),0)::int as n from academia.buzon_pruebas`)[0].n;
  await pedirEnlace(page, URL_VG!, "lucia@example.com");
  expect((await bdVg!`select count(*)::int as n from academia.buzon_pruebas where id > ${antesVg}`)[0].n).toBe(0);
  const bdTc = postgres(process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:54329/tutor", { prepare: false, max: 1 });
  const antesTc = (await bdTc`select coalesce(max(id),0)::int as n from academia.buzon_pruebas`)[0].n;
  await pedirEnlace(page, "", "vg-javier@example.com");
  expect((await bdTc`select count(*)::int as n from academia.buzon_pruebas where id > ${antesTc}`)[0].n).toBe(0);
  await bdTc.end();
});
