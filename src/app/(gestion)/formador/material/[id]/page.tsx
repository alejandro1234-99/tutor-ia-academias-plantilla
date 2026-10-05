import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { config } from "@/configuracion";
import { Icono } from "@/componentes/Icono";
import { AccionesMaterial } from "@/componentes/material/AccionesMaterial";
import { EsperaMaterial } from "@/componentes/material/EsperaMaterial";
import { VistaContenido } from "@/componentes/material/VistaContenido";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { unMaterial } from "@/servidor/materiales";
import { T } from "@/textos";
import { tipoMaterial, type ContenidoTest } from "@/tipos/material";
import { Compartir } from "./Compartir";

export const metadata: Metadata = { title: T.materialClase.titulo };
export const maxDuration = 300;

export default async function MaterialClase({ params }: { params: Promise<{ id: string }> }) {
  const { s } = await exigirGestion("formador");
  const { id } = await params;
  const d = await conSesion(s, async (tx) => {
    const m = await unMaterial(tx, s.persona.id, id);
    if (!m || !m.esDeFormador) return null;
    const grupos = await tx`select id, nombre from grupos where not archivado and id = any(academia.mis_grupos()) order by nombre`;
    const compartido = await tx`select grupo_id from material_compartido where material_id = ${id}`;
    return { m, grupos, compartido: compartido.map((c) => c.grupoId as string) };
  });
  if (!d) notFound();
  const { m } = d;
  const letras = ["A", "B", "C", "D"];
  return (
    <main className="pagina media">
      <Link href="/formador/material" className="boton boton-texto" style={{ paddingLeft: 0, marginBottom: 16 }}>
        <Icono nombre="izquierda" tam={16} />
        {T.materialClase.titulo}
      </Link>
      <span className="texto-2" style={{ fontSize: 14 }}>
        {tipoMaterial(m.formato, m.estilo)} · {m.temas.map((x) => `Tema ${x.numero}`).join(", ")}
      </span>
      <h1 className="titulo-seccion" style={{ fontSize: 40, margin: "8px 0 24px" }}>
        {m.estado === "creando" ? T.material.creandoTitulo : m.titulo}
      </h1>
      {m.estado === "creando" ? <EsperaMaterial id={m.id} progresoInicial={m.progreso} pasoInicial={m.paso} /> : null}
      <AccionesMaterial id={m.id} titulo={m.titulo} esMio={!s.soporte} estado={m.estado} carpetaId={null} carpetas={[]} actualizado={m.actualizado} valoracion={m.valoracion} alBorrar="/formador/material" />
      {m.estado === "listo" && !s.soporte ? (
        <Compartir materialId={m.id} grupos={d.grupos.map((g) => ({ id: g.id as string, nombre: g.nombre as string }))} compartido={d.compartido} />
      ) : null}
      {m.estado === "listo" && m.contenido ? (
        <div className="material" style={{ marginTop: 32 }}>
          {m.formato === "test" || m.formato === "simulacro" ? (
            (m.contenido as ContenidoTest).preguntas.map((q, i) => (
              <article key={i} className="pila hueco-8" style={{ paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
                <h3>
                  {i + 1}. {q.enunciado}
                </h3>
                <ul>
                  {q.opciones.map((o, j) => (
                    <li key={j} style={{ fontWeight: j === q.correcta ? 600 : 400 }}>
                      {letras[j]}) {o} {j === q.correcta ? "✓" : ""}
                    </li>
                  ))}
                </ul>
                <p className="texto-2" style={{ fontSize: 15 }}>
                  {q.justificacion}
                </p>
              </article>
            ))
          ) : (
            <VistaContenido formato={m.formato} estilo={m.estilo} contenido={m.contenido} temas={m.temas} literal={!!m.opciones.literal} logoSvg={config.logoSvg} vuelta={`/formador/material/${m.id}`} />
          )}
        </div>
      ) : null}
    </main>
  );
}
