import { redirect } from "next/navigation";
import { ArmazonAlumno } from "@/componentes/alumno/ArmazonAlumno";
import { SelectorPapel } from "@/componentes/SelectorPapel";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { oposicionDe, perfilDe } from "@/servidor/alumno";

export default async function LayoutEstudio({ children }: { children: React.ReactNode }) {
  const s = await exigirSesion("alumno");
  const { perfil, op } = await conSesion(s, async (tx) => ({
    perfil: await perfilDe(tx, s.persona.id),
    op: await oposicionDe(tx, s.persona.id),
  }));
  // La primera vez: aviso de privacidad y perfil de un minuto.
  if (!perfil?.completadoAt) redirect("/primera-vez");
  return (
    <ArmazonAlumno
      nombre={perfil.comoLlamar || s.persona.nombre}
      oposicion={op?.nombre ?? ""}
      selector={<SelectorPapel papeles={s.papeles} actual="alumno" />}
    >
      {children}
    </ArmazonAlumno>
  );
}
