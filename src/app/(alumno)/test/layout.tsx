import { redirect } from "next/navigation";
import { BandaSoporte } from "@/componentes/BandaSoporte";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { perfilDe } from "@/servidor/alumno";

// Tests y resultados: pantalla limpia, sin menú, para concentrarse.
export default async function LayoutTest({ children }: { children: React.ReactNode }) {
  const s = await exigirSesion("alumno");
  const perfil = await conSesion(s, (tx) => perfilDe(tx, s.persona.id));
  if (!perfil?.completadoAt) redirect("/primera-vez");
  return (
    <>
      <BandaSoporte />
      {children}
    </>
  );
}
