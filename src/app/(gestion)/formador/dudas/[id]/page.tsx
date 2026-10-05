import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icono } from "@/componentes/Icono";
import { Parrafo } from "@/componentes/TextoRico";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { fechaCorta } from "@/servidor/materiales";
import { T, t } from "@/textos";
import { Contestar } from "./Contestar";

export const metadata: Metadata = { title: T.dudas.contestar };

// F7 · Contestar duda
export default async function PaginaDuda({ params }: { params: Promise<{ id: string }> }) {
  const { s } = await exigirGestion("formador");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await conSesion(s, async (tx) => {
    const x = await tx`
      select d.id, d.tipo, d.pregunta, d.respuesta_asistente, d.comentario, d.estado, d.respuesta, d.creada_at,
             d.contestada_por_nombre, d.contestada_at, d.tema_id, g.nombre as grupo, g.oposicion_id,
             t.numero as tema_numero, coalesce(t.nombre_corto, t.nombre) as tema_nombre
      from dudas d join grupos g on g.id = d.grupo_id left join temas t on t.id = d.tema_id where d.id = ${id}`;
    if (!x[0]) return null;
    const temas = await tx`select id, numero, coalesce(nombre_corto, nombre) as nombre from temas where oposicion_id = ${x[0].oposicionId} order by numero`;
    return { x: x[0], temas };
  });
  if (!d) notFound();
  const D = T.dudas;
  const x = d.x;
  return (
    <main className="pagina estrecha">
      <Link href="/formador/dudas" className="boton boton-texto" style={{ paddingLeft: 0, marginBottom: 16 }}>
        <Icono nombre="izquierda" tam={16} />
        {D.volver}
      </Link>
      <span className="meta texto-3" style={{ fontSize: 14 }}>
        {D.pestanas[x.tipo as keyof typeof D.pestanas]} · {x.temaNumero ? `Tema ${x.temaNumero} · ${x.temaNombre}` : D.sinTema} · {x.grupo as string} ·{" "}
        {fechaCorta(new Date(x.creadaAt as string).toISOString())}
      </span>
      <section className="pila hueco-24" style={{ marginTop: 16 }}>
        <div className="pila hueco-8">
          <h2 className="antetitulo">{D.pregunta}</h2>
          <p className="burbuja-alumno" style={{ alignSelf: "flex-start" }}>
            {x.pregunta as string}
          </p>
        </div>
        <div className="pila hueco-8">
          <h2 className="antetitulo">{D.respuestaAsistente}</h2>
          <div className="texto-respuesta" style={{ fontSize: 16 }}>
            {x.respuestaAsistente ? <Parrafo texto={x.respuestaAsistente as string} /> : <p className="texto-2">{D.sinRespuestaAsistente}</p>}
          </div>
        </div>
        {x.comentario ? (
          <div className="pila hueco-8">
            <h2 className="antetitulo">{D.comentario}</h2>
            <p>{x.comentario as string}</p>
          </div>
        ) : null}
        {x.estado === "pendiente" ? (
          s.soporte ? null : (
            <Contestar id={id} temaId={(x.temaId as string) ?? null} temas={d.temas.map((y) => ({ id: y.id as string, numero: Number(y.numero), nombre: y.nombre as string }))} />
          )
        ) : (
          <div className="tarjeta-formador">
            <strong style={{ fontSize: 14 }}>{x.estado === "contestada" ? D.contestada : D.marcadaResuelta}</strong>
            <span className="texto-3" style={{ fontSize: 13 }}>
              {t(D.respondidaPor, { nombre: (x.contestadaPorNombre as string) ?? "—", fecha: x.contestadaAt ? fechaCorta(new Date(x.contestadaAt as string).toISOString()) : "—" })}
            </span>
            {x.respuesta ? <p style={{ fontSize: 16, lineHeight: 1.6 }}>{x.respuesta as string}</p> : null}
          </div>
        )}
      </section>
    </main>
  );
}
