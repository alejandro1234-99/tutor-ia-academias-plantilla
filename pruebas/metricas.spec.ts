import { expect, test } from "@playwright/test";
import { bd, correo, entrarComo } from "./ayuda";

// Etapa 5 · Métricas y avisos.

test("Andrés solo ve «Mañanas» y no puede elegir «Tardes»", async ({ page }) => {
  await entrarComo(page, "andres");
  await page.goto("/metricas/uso");
  await expect(page.getByText("Solo tus grupos")).toBeVisible();
  await expect(page.locator("#f-grupo")).toHaveCount(0);
  await expect(page.getByText("Tardes")).toHaveCount(0);
});

test("Elena ve alumnos en riesgo: exactamente Pablo (9 días) y Marta (12)", async ({ page }) => {
  // Deja las fechas como en los datos de prueba (otras pruebas entran como estos alumnos).
  await bd`update academia.personas set ultimo_acceso_at = now() - interval '1 day' where es_alumno and estado = 'activa' and correo not in (${correo("pablo")}, ${correo("marta")})`;
  await bd`update academia.personas set ultimo_acceso_at = now() - interval '9 days 2 hours', estado = 'activa' where correo = ${correo("pablo")}`;
  await bd`update academia.personas set ultimo_acceso_at = now() - interval '12 days 2 hours' where correo = ${correo("marta")}`;
  await entrarComo(page, "elena");
  await page.goto("/papel/dueno");
  await page.goto("/metricas/riesgo");
  const filas = page.locator("table tbody tr");
  await expect(filas).toHaveCount(2);
  await expect(filas.nth(0)).toContainText("Marta Gil");
  await expect(filas.nth(0)).toContainText("12 días sin entrar");
  await expect(filas.nth(1)).toContainText("Pablo Serrano");
  await expect(filas.nth(1)).toContainText("9 días sin entrar");
});

test("un grupo con menos de 5 alumnos activos no enseña los datos; el Excel sale con los mismos filtros", async ({ page }) => {
  // Un grupo pequeño, con 2 alumnos activos.
  const op = (await bd`select id from academia.oposiciones order by orden limit 1`)[0].id;
  await bd`delete from academia.personas where correo like 'pequeno%@example.com'`;
  await bd`delete from academia.grupos where nombre = 'Grupo pequeño de prueba'`;
  const g = (await bd`insert into academia.grupos (oposicion_id, nombre) values (${op}, 'Grupo pequeño de prueba') returning id`)[0].id;
  for (const n of [1, 2]) {
    const p = (await bd`insert into academia.personas (nombre, correo, es_alumno, grupo_id, estado, ultimo_acceso_at) values (${"Pequeño " + n}, ${"pequeno" + n + "@example.com"}, true, ${g}, 'activa', now()) returning id`)[0].id;
    await bd`insert into academia.actividad (persona_id, fecha) values (${p}, academia.hoy_madrid())`;
  }
  await entrarComo(page, "elena");
  await page.goto("/papel/dueno");
  await page.goto(`/metricas/uso?periodo=30&grupo=${g}`);
  await expect(page.getByText("No hay suficientes alumnos para mostrar este dato sin identificar a nadie.")).toBeVisible();
  const r = await page.request.get(`/api/metricas/exportar?seccion=uso&periodo=30&grupo=${g}`);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("spreadsheetml");
  await bd`delete from academia.personas where correo like 'pequeno%@example.com'`;
  await bd`delete from academia.grupos where id = ${g}`;
});

test("con 90 días, la dueña ve uso, dudas agrupadas y el progreso sin nombres", async ({ page }) => {
  await entrarComo(page, "elena");
  await page.goto("/papel/dueno");
  await page.goto("/metricas/uso?periodo=90");
  await expect(page.getByText("Alumnos activos")).toBeVisible();
  await expect(page.getByRole("img", { name: "Preguntas por día de la semana y hora" })).toBeVisible();
  await page.goto("/metricas/progreso?periodo=90");
  const html = await page.content();
  for (const nombre of ["Lucía", "Pablo", "Marta Gil", "Sara Núñez"]) expect(html).not.toContain(nombre);
  await page.goto("/ajustes/consumo");
  await expect(page.getByRole("meter", { name: "Preguntas del mes" })).toBeVisible();
});
