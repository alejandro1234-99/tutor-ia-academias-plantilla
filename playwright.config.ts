import { defineConfig, devices } from "@playwright/test";

// El robot de pruebas: abre la web de verdad y comprueba que funciona.
// Por defecto prueba la web local (npm run dev). Para probar otra dirección:
//   URL_PRUEBAS=https://... npm run pruebas
export default defineConfig({
  testDir: "./pruebas",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.URL_PRUEBAS || "http://localhost:3000",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
  },
  projects: [
    { name: "ordenador", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, grepInvert: /@movil/ },
    { name: "movil", use: { ...devices["Pixel 7"] }, grep: /@movil/ },
  ],
});
