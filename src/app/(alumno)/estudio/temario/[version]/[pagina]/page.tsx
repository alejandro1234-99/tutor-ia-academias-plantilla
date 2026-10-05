import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisorPagina } from "@/componentes/VisorPagina";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { paginaVisor } from "@/servidor/visor";
import { T } from "@/textos";

export const metadata: Metadata = { title: T.visor.titulo };

// A4 · Visor del temario a pantalla completa (móvil, o enlace directo).
export default async function PaginaVisorTemario({
  params,
  searchParams,
}: {
  params: Promise<{ version: string; pagina: string }>;
  searchParams: Promise<{ p?: string; vuelta?: string }>;
}) {
  const s = await exigirSesion("alumno");
  const { version, pagina } = await params;
  const { p = "", vuelta = "" } = await searchParams;
  const numero = Number(pagina);
  const r = await conSesion(s, (tx) => paginaVisor(tx, s.persona.id, true, version, numero));
  if (!r.ok && r.motivo === "no") notFound();
  const resaltar = p
    .split(",")
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x) && x >= 0);
  const volver = /^\/(estudio|test)\//.test(vuelta) ? vuelta : "/estudio/preguntar";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", background: "var(--paper)" }}>
      <VisorPagina versionId={version} pagina={numero} resaltar={resaltar} inicial={r.ok ? r.pagina : null} hrefCerrar={volver} />
    </div>
  );
}
