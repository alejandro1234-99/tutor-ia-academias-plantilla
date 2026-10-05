import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icono } from "@/componentes/Icono";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { fechaCorta } from "@/servidor/materiales";
import { T, t } from "@/textos";
import { NotaFormador } from "./NotaFormador";

export const metadata: Metadata = { title: T.temario.titulo };

// Un tema: su historial de versiones y sus notas del formador.
export default async function PaginaTema({ params }: { params: Promise<{ tema: string }> }) {
  const { s } = await exigirGestion("formador", "dueno");
  const { tema } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(tema)) notFound();
  const d = await conSesion(s, async (tx) => {
    const x = await tx`select id, numero, nombre, version_actual_id from temas where id = ${tema}`;
    if (!x[0]) return null;
    return {
      tema: x[0],
      versiones: await tx`select id, version, archivo_nombre, paginas, estado, subida_at, subida_por_nombre, error from tema_versiones where tema_id = ${tema} order by version desc`,
      notas: await tx`select id, autor_nombre, pregunta, texto, creada_at, editada_at, retirada_at from notas_formador where tema_id = ${tema} order by creada_at desc`,
    };
  });
  if (!d) notFound();
  const S = T.temario;
  return (
    <main className="pagina media">
      <Link href="/formador/temario" className="boton boton-texto" style={{ paddingLeft: 0, marginBottom: 16 }}>
        <Icono nombre="izquierda" tam={16} />
        {S.volverTemario}
      </Link>
      <h1 className="titulo-seccion" style={{ fontSize: 40, marginBottom: 32 }}>
        Tema {d.tema.numero as number} · {d.tema.nombre as string}
      </h1>
      <section className="pila hueco-8" style={{ marginBottom: 40 }}>
        <h2 className="antetitulo">{S.versiones}</h2>
        {d.versiones.map((v) => (
          <div key={v.id as string} className="elemento-biblio">
            <div className="pila rellenar hueco-4">
              <span className="titulo">
                {t(S.version, { n: v.version as number })} · {v.archivoNombre as string}
              </span>
              <span className="meta">
                {v.paginas as number} páginas · {fechaCorta(new Date(v.subidaAt as string).toISOString())} · {(v.subidaPorNombre as string) ?? "—"}
              </span>
            </div>
            <span className={`pastilla ${v.id === d.tema.versionActualId ? "bien" : v.estado === "error" ? "error" : ""}`}>
              {S.estados[v.estado as keyof typeof S.estados]?.replace(" {pct} %", "") ?? v.estado}
            </span>
            {v.estado === "lista" || v.estado === "sustituida" ? (
              <Link href={`/formador/temario/ver/${v.id}/1`} className="boton boton-mini">
                {S.ver}
              </Link>
            ) : null}
          </div>
        ))}
      </section>
      <section className="pila hueco-8">
        <h2 className="antetitulo">{S.notas}</h2>
        {d.notas.length === 0 ? (
          <p className="texto-2">{S.sinNotas}</p>
        ) : (
          d.notas.map((n) => (
            <NotaFormador
              key={n.id as string}
              id={n.id as string}
              pregunta={n.pregunta as string}
              texto={n.texto as string}
              autor={n.autorNombre as string}
              fecha={fechaCorta(new Date((n.editadaAt ?? n.creadaAt) as string).toISOString())}
              retirada={!!n.retiradaAt}
              soloLectura={!!s.soporte}
            />
          ))
        )}
      </section>
    </main>
  );
}
