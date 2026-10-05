import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/configuracion";
import { Icono } from "@/componentes/Icono";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { T } from "@/textos";
import { SubirTema } from "./SubirTema";

export const metadata: Metadata = { title: T.temario.subirTitulo };

// F2 · Subir o sustituir tema
export default async function PaginaSubir({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { s } = await exigirGestion("formador", "dueno");
  prohibirEnSoporte(s);
  const { tema } = await searchParams;
  const d = await conSesion(s, async (tx) => ({
    oposiciones: await tx`select id, nombre from oposiciones where id = any(academia.mis_oposiciones_gestion()) order by orden`,
    temas: await tx`select id, oposicion_id, numero, nombre from temas where oposicion_id = any(academia.mis_oposiciones_gestion()) order by numero`,
  }));
  return (
    <main className="pagina">
      <Link href="/formador/temario" className="boton boton-texto" style={{ paddingLeft: 0, marginBottom: 16 }}>
        <Icono nombre="izquierda" tam={16} />
        {T.temario.volverTemario}
      </Link>
      <h1 className="titulo-pagina" style={{ marginBottom: 32 }}>
        {T.temario.subirTitulo}
      </h1>
      <SubirTema
        oposiciones={d.oposiciones.map((o) => ({ id: o.id as string, nombre: o.nombre as string }))}
        temas={d.temas.map((x) => ({ id: x.id as string, oposicionId: x.oposicionId as string, numero: Number(x.numero), nombre: x.nombre as string }))}
        temaInicial={tema ?? null}
        asistente={config.asistente.nombre}
      />
    </main>
  );
}
