import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/componentes/Icono";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { T } from "@/textos";
import { Invitar } from "./Invitar";

export const metadata: Metadata = { title: T.alumnos.invitarTitulo };

// F4 · Invitar alumnos
export default async function PaginaInvitar({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const { s } = await exigirGestion("formador", "dueno");
  prohibirEnSoporte(s);
  const { modo } = await searchParams;
  const grupos = await conSesion(
    s,
    (tx) => tx`select id, nombre from grupos where not archivado and (academia.soy_dueno() or id = any(academia.mis_grupos())) order by nombre`,
  );
  return (
    <main className="pagina media">
      <Link href="/formador/alumnos" className="boton boton-texto" style={{ paddingLeft: 0, marginBottom: 16 }}>
        <Icono nombre="izquierda" tam={16} />
        {T.alumnos.titulo}
      </Link>
      <h1 className="titulo-pagina" style={{ marginBottom: 32 }}>
        {T.alumnos.invitarTitulo}
      </h1>
      <Invitar grupos={grupos.map((g) => ({ id: g.id as string, nombre: g.nombre as string }))} modoInicial={modo === "lista" ? "lista" : "uno"} />
    </main>
  );
}
