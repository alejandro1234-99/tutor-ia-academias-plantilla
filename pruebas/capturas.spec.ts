import { test } from "@playwright/test";
import { bd, entrarComo, reponerUso } from "./ayuda";

// Capturas para comparar con el diseño (no comprueban nada). Se guardan en
// test-results/capturas. Solo se lanzan a mano: CAPTURAS=1 npx playwright test capturas
const dir = "test-results/capturas";
test.skip(!process.env.CAPTURAS, "solo a mano");
test.use({ colorScheme: "dark" });

const PAGINAS: [string, string | (() => Promise<string>)][] = [
  ["A3-vacio", "/estudio/preguntar"],
  ["A6-crear", "/estudio/crear"],
  ["A11-biblioteca", "/estudio/biblioteca?tab=resumenes"],
  ["A8-cornell", async () => `/estudio/material/${(await bd`select id from academia.materiales where estilo='cornell' and estado='listo' order by creado_at desc limit 1`)[0]?.id}`],
  ["A8-tarjetas", async () => `/estudio/material/${(await bd`select id from academia.materiales where formato='tarjetas' and estado='listo' order by creado_at desc limit 1`)[0]?.id}`],
  ["A10-resultado", async () => { const i = (await bd`select id, material_id from academia.intentos_test where terminado_at is not null order by terminado_at desc limit 1`)[0]; return `/test/${i?.material_id}/resultado/${i?.id}`; }],
  ["A12-repasar", "/estudio/repasar"],
  ["A13-progreso", "/estudio/progreso"],
  ["A14-lo-que-se", "/estudio/lo-que-se-de-ti"],
  ["A15-cuenta", "/estudio/cuenta"],
  ["A5-conversaciones", "/estudio/conversaciones"],
];

for (const movil of [false, true]) {
  test(`capturas alumno ${movil ? "móvil @movil" : "ordenador"}`, async ({ page }) => {
    await reponerUso("lucia");
    await entrarComo(page, "lucia");
    for (const [nombre, ruta] of PAGINAS) {
      const url = typeof ruta === "string" ? ruta : await ruta();
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `${dir}/${nombre}${movil ? "-movil" : ""}.png`, fullPage: !movil });
    }
  });
}
