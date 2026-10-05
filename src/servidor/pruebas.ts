import "server-only";

// La dirección de pruebas: nunca en la web publicada (producción).
export function entornoPruebas(): boolean {
  return process.env.MODO_PRUEBAS === "1" && process.env.VERCEL_ENV !== "production";
}
