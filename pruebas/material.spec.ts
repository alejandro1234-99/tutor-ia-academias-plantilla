import { expect, test, type Page } from "@playwright/test";
import { bd, entrarComo, personaId, reponerUso } from "./ayuda";

// Etapa 3 · Crear material, biblioteca, tests, repaso y progreso.

async function reponerMateriales(alias: string) {
  const id = await personaId(alias);
  await bd`delete from academia.uso where persona_id = ${id} and tipo = 'material'`;
}

async function crear(page: Page, opciones: { temas: number[]; formato: string; estilo?: string; extra?: (p: Page) => Promise<void> }) {
  await page.goto("/estudio/crear");
  for (const n of opciones.temas) await page.locator(".opcion-tema").filter({ hasText: `Tema ${n} ·` }).first().locator("input").check();
  await page.getByRole("radio", { name: new RegExp(`^${opciones.formato}`) }).first().check();
  if (opciones.estilo) await page.getByRole("radio", { name: new RegExp(`^${opciones.estilo}`) }).first().check();
  if (opciones.extra) await opciones.extra(page);
  await page.locator(".solo-ordenador").getByRole("button", { name: /^Crear/ }).click();
  await page.waitForURL(/\/estudio\/material\/[0-9a-f-]{36}/);
  await expect(page.getByRole("button", { name: "Volver a generar" })).toBeVisible({ timeout: 40_000 });
}

test.beforeEach(async () => {
  await reponerUso("lucia");
  await reponerMateriales("lucia");
});

test("resumen Cornell del tema 2: tres zonas con citas del tema 2, y sale en la biblioteca", async ({ page }) => {
  await entrarComo(page, "lucia");
  await crear(page, { temas: [2], formato: "Resumen", estilo: "Cornell" });
  await expect(page.getByText("Preguntas clave")).toBeVisible();
  await expect(page.getByText("Notas", { exact: true })).toBeVisible();
  await expect(page.locator(".cornell .resumen")).toBeVisible();
  const citas = page.locator(".cita");
  expect(await citas.count()).toBeGreaterThan(3);
  for (const c of await citas.allTextContents()) expect(c).toContain("Tema 2");
  await page.goto("/estudio/biblioteca?tab=resumenes");
  await expect(page.locator("table").getByText("Resumen Cornell").first()).toBeVisible();
  // El PDF se descarga con la marca.
  const r = await page.request.get(`/api/material/${(await bd`select id from academia.materiales where estilo = 'cornell' order by creado_at desc limit 1`)[0].id}/pdf`);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("application/pdf");
});

test("un esquema aparece solo en Esquemas; el contador baja", async ({ page }) => {
  await entrarComo(page, "lucia");
  await page.goto("/estudio/crear");
  await expect(page.getByText("Te quedan 20 materiales este mes").first()).toBeVisible();
  await crear(page, { temas: [1], formato: "Esquema" });
  await expect(page.locator(".arbol details").first()).toBeVisible();
  await page.goto("/estudio/biblioteca?tab=esquemas");
  await expect(page.locator("table tbody tr")).toHaveCount(await bd`select count(*)::int as n from academia.materiales m join academia.personas p on p.id = m.propietario_id where p.correo like 'lucia%' and m.formato = 'esquema'`.then((f) => f[0].n));
  await page.goto("/estudio/crear");
  await expect(page.getByText("Te quedan 19 materiales este mes").first()).toBeVisible();
});

test("tarjetas en modo literal y repaso: la que no sabía vuelve, la que sabía no", async ({ page }) => {
  await entrarComo(page, "lucia");
  const lucia = await personaId("lucia");
  await bd`delete from academia.tarjetas_repaso where alumno_id = ${lucia}`;
  await bd`delete from academia.preguntas_falladas where alumno_id = ${lucia}`;
  await crear(page, {
    temas: [2],
    formato: "Tarjetas",
    extra: async (p) => {
      await p.getByRole("checkbox", { name: "Modo literal" }).check();
    },
  });
  await expect(page.locator(".tarjeta-repaso").first()).toBeVisible();
  await page.goto("/estudio/repasar");
  await page.locator(".tarjeta-repaso").click();
  await page.getByRole("button", { name: "No la sabía" }).click();
  await page.locator(".tarjeta-repaso").click();
  await page.getByRole("button", { name: "La sabía", exact: true }).click();
  await expect
    .poll(async () => {
      const f = await bd`select ultima_respuesta, proxima - academia.hoy_madrid() as dias from academia.tarjetas_repaso where alumno_id = ${lucia} and ultima_respuesta is not null order by ultima_at`;
      return f.map((x) => [x.ultima_respuesta, x.dias]);
    })
    .toEqual([
      ["no_la_sabia", 1],
      ["la_sabia", 3],
    ]);
});

test("simulacro de 10: 7 bien, 2 mal y 1 en blanco da 6,33 con penalización y 7 sin", async ({ page }) => {
  await entrarComo(page, "lucia");
  await crear(page, {
    temas: [1],
    formato: "Simulacro",
    extra: async (p) => {
      await p.getByRole("button", { name: "10", exact: true }).click();
    },
  });
  const id = page.url().split("/").pop()!;
  const m = await bd`select contenido from academia.materiales where id = ${id}`;
  const correctas: number[] = m[0].contenido.preguntas.map((q: { correcta: number }) => q.correcta);
  await page.getByRole("link", { name: "Empezar el simulacro" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  for (let i = 0; i < 10; i++) {
    if (i === 9) {
      await page.getByRole("button", { name: "Dejar en blanco" }).click();
      break;
    }
    const opcion = i < 7 ? correctas[i] : (correctas[i] + 1) % 4;
    await page.locator(".opcion-test").nth(opcion).click();
    await page.getByRole("button", { name: /Siguiente|Terminar/ }).click();
  }
  await page.waitForURL(/\/resultado\//);
  await expect(page.locator(".nota-grande")).toHaveText("6,33");
  await expect(page.getByText("sin penalización")).toBeVisible();
  await expect(page.getByText("Esta nota solo la ves tú.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Repasar mis fallos" })).toBeVisible();
  // Cada pregunta con su justificación y su cita.
  expect(await page.locator("article .cita").count()).toBe(10);
  // Los fallos van a la memoria y a «Repasar hoy» de mañana.
  const lucia = await personaId("lucia");
  const falladas = await bd`select count(*)::int as n from academia.preguntas_falladas where alumno_id = ${lucia} and resuelta_at is null and proxima = academia.hoy_madrid() + 1`;
  expect(falladas[0].n).toBeGreaterThanOrEqual(2);
  const notas = await bd`select count(*)::int as n from academia.memoria_notas where alumno_id = ${lucia} and origen = 'test'`;
  expect(notas[0].n).toBeGreaterThan(0);
  await page.goto("/estudio/progreso");
  await expect(page.getByRole("img", { name: "Evolución de tus notas en los tests" })).toBeVisible();
});
