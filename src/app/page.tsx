import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GALLETA_PAPEL, inicioDePapel, obtenerSesion, type Papel } from "@/servidor/sesion";

// La portada: cada persona va a la parte que le toca según su papel.
export default async function Inicio() {
  const s = await obtenerSesion();
  if (!s) redirect("/entrar");
  if (s.soporte) redirect("/metricas");
  const elegido = (await cookies()).get(GALLETA_PAPEL)?.value as Papel | undefined;
  const papel = elegido && s.papeles.includes(elegido) ? elegido : s.papeles[0];
  if (!papel) redirect("/salir");
  redirect(inicioDePapel(papel));
}
