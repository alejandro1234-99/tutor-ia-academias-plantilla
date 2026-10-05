import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exigirSesion, GALLETA_PAPEL, type Papel, type Sesion } from "./sesion";

export type PapelGestion = "formador" | "dueno" | "tecnico";

/** El papel con el que se está usando la parte de gestión (selector de papel). */
export async function papelGestion(s: Sesion): Promise<PapelGestion | null> {
  const elegido = (await cookies()).get(GALLETA_PAPEL)?.value as Papel | undefined;
  const posibles = s.papeles.filter((p): p is PapelGestion => p !== "alumno");
  if (s.soporte) return "dueno";
  if (elegido && elegido !== "alumno" && posibles.includes(elegido)) return elegido;
  return posibles[0] ?? null;
}

/** Exige uno de los papeles de gestión indicados. */
export async function exigirGestion(...papeles: PapelGestion[]): Promise<{ s: Sesion; papel: PapelGestion }> {
  const s = await exigirSesion();
  const papel = await papelGestion(s);
  if (!papel) redirect("/");
  if (papeles.length && !papeles.includes(papel)) {
    const otro = papeles.find((p) => s.papeles.includes(p) || (s.soporte && p === "dueno"));
    if (!otro) redirect("/");
    return { s, papel: otro };
  }
  return { s, papel };
}
