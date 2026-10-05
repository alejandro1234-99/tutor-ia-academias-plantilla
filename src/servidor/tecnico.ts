import "server-only";
import { redirect } from "next/navigation";
import { exigirSesion, type Sesion } from "./sesion";

/** Solo nosotros (correo en CORREOS_TECNICOS), y nunca desde el modo soporte. */
export async function exigirTecnico(): Promise<Sesion> {
  const s = await exigirSesion();
  if (!s.esTecnico || s.soporte) redirect("/");
  return s;
}

export const DOLAR_A_EURO = Number(process.env.DOLAR_A_EURO || 0.9);
