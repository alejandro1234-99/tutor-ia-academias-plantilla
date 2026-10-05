import type { Metadata } from "next";
import { Ayuda } from "@/componentes/gestion/Ayuda";
import { exigirGestion } from "@/servidor/gestion";
import { T } from "@/textos";

export const metadata: Metadata = { title: T.ayuda.titulo };

export default async function PaginaAyuda() {
  const { s } = await exigirGestion("formador", "dueno");
  return <Ayuda soloLectura={!!s.soporte} />;
}
