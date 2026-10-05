import { notFound } from "next/navigation";
import { VisorPagina } from "@/componentes/VisorPagina";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { paginaVisor } from "@/servidor/visor";

// El visor para el formador (para comprobar que el temario se ha leído bien).
export default async function VerTemario({ params }: { params: Promise<{ version: string; pagina: string }> }) {
  const { s } = await exigirGestion("formador", "dueno");
  const { version, pagina } = await params;
  const r = await conSesion(s, (tx) => paginaVisor(tx, s.persona.id, false, version, Number(pagina)));
  if (!r.ok) notFound();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", background: "var(--paper)" }}>
      <VisorPagina versionId={version} pagina={Number(pagina)} resaltar={[]} inicial={r.pagina} hrefCerrar="/formador/temario" />
    </div>
  );
}
