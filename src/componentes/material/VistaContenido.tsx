"use client";

import Link from "next/link";
import { useState } from "react";
import { EnLinea } from "@/componentes/TextoRico";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { etiquetaArticulo } from "@/tipos/chat";
import type {
  CitaMaterial,
  Contenido,
  ContenidoCornell,
  ContenidoEjecutivo,
  ContenidoMapa,
  ContenidoPresentacion,
  ContenidoResumenEsquema,
  ContenidoTarjetas,
  Formato,
} from "@/tipos/material";

export type CitaCompleta = CitaMaterial & { versionId?: string; paginaPdf?: number; parrafos?: number[] };
type Temas = { numero: number; nombre: string }[];

export function textoCitaMaterial(c: CitaCompleta, temas: Temas): string {
  const tema = temas.find((x) => x.numero === c.tema);
  const partes = [`Tema ${c.tema}`];
  if (tema) partes.push(tema.nombre);
  const art = etiquetaArticulo(c.articulo);
  if (art) partes.push(art);
  partes.push(`página ${c.pagina}`);
  return partes.join(" · ");
}

export function ChipCitaMaterial({ cita, temas, vuelta }: { cita: CitaCompleta; temas: Temas; vuelta: string }) {
  if (!cita) return null;
  const texto = textoCitaMaterial(cita, temas);
  if (!cita.versionId || !cita.paginaPdf) {
    return (
      <span className="cita">
        <span aria-hidden="true">↳</span>
        <span>{texto}</span>
      </span>
    );
  }
  return (
    <Link
      className="cita"
      href={`/estudio/temario/${cita.versionId}/${cita.paginaPdf}?p=${(cita.parrafos ?? []).join(",")}&vuelta=${encodeURIComponent(vuelta)}`}
    >
      <span aria-hidden="true">↳</span>
      <span>{texto}</span>
    </Link>
  );
}

function ResumenEsquema({ c, temas, vuelta }: { c: ContenidoResumenEsquema; temas: Temas; vuelta: string }) {
  return (
    <div className="pila hueco-32">
      {c.bloques.map((b, i) => (
        <section key={i} className="pila hueco-10">
          <h3>{b.titulo}</h3>
          <ul>
            {b.puntos.map((p, j) => (
              <li key={j}>
                <EnLinea texto={p.texto} />
                {p.subpuntos?.length ? (
                  <ul>
                    {p.subpuntos.map((sp, k) => (
                      <li key={k}>
                        <EnLinea texto={sp} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          <ChipCitaMaterial cita={b.cita} temas={temas} vuelta={vuelta} />
        </section>
      ))}
    </div>
  );
}

function Cornell({ c, temas, vuelta }: { c: ContenidoCornell; temas: Temas; vuelta: string }) {
  return (
    <div className="cornell">
      <div className="preguntas">
        <div className="zona">{T.material.zonaPreguntas}</div>
      </div>
      <div className="notas">
        <div className="zona">{T.material.zonaNotas}</div>
      </div>
      {c.filas.map((f, i) => (
        <div key={i} style={{ display: "contents" }}>
          <div className="preguntas" style={{ borderTop: "1px solid var(--line)" }}>
            <strong style={{ fontSize: 16, lineHeight: 1.45 }}>{f.pregunta}</strong>
          </div>
          <div className="notas pila hueco-10" style={{ borderTop: "1px solid var(--line)" }}>
            <ul style={{ margin: 0 }}>
              {f.notas.map((n, j) => (
                <li key={j}>
                  <EnLinea texto={n} />
                </li>
              ))}
            </ul>
            <ChipCitaMaterial cita={f.cita} temas={temas} vuelta={vuelta} />
          </div>
        </div>
      ))}
      <div className="resumen">
        <div className="zona">{T.material.zonaResumen}</div>
        <p className="texto">
          <EnLinea texto={c.resumen} />
        </p>
      </div>
    </div>
  );
}

function Ejecutivo({ c, temas, vuelta }: { c: ContenidoEjecutivo; temas: Temas; vuelta: string }) {
  return (
    <div className="pila hueco-24">
      {c.apartados.map((a, i) => (
        <section key={i} className="pila hueco-8">
          <h3>{a.titulo}</h3>
          <p className="texto">
            <EnLinea texto={a.texto} />
          </p>
          <ChipCitaMaterial cita={a.cita} temas={temas} vuelta={vuelta} />
        </section>
      ))}
    </div>
  );
}

function Mapa({ c, temas, vuelta }: { c: ContenidoMapa; temas: Temas; vuelta: string }) {
  return (
    <div className="arbol pila hueco-8">
      {c.ramas.map((r, i) => (
        <details key={i} open={i === 0}>
          <summary>
            <span>{r.texto}</span>
          </summary>
          <div style={{ margin: "4px 0 10px 18px" }}>
            <ChipCitaMaterial cita={r.cita} temas={temas} vuelta={vuelta} />
          </div>
          {r.hijos.map((h, j) =>
            h.hijos?.length ? (
              <details key={j}>
                <summary>
                  <span>{h.texto}</span>
                </summary>
                {h.hijos.map((n, k) => (
                  <div key={k} className="hoja">
                    {n.texto}
                  </div>
                ))}
                <div style={{ margin: "6px 0 10px 18px" }}>
                  <ChipCitaMaterial cita={h.cita} temas={temas} vuelta={vuelta} />
                </div>
              </details>
            ) : (
              <div key={j} className="hoja">
                {h.texto}
              </div>
            ),
          )}
        </details>
      ))}
    </div>
  );
}

function Presentacion({ c, temas, logoSvg }: { c: ContenidoPresentacion; temas: Temas; logoSvg: string }) {
  const total = c.diapositivas.length;
  return (
    <div className="pila hueco-24">
      {c.diapositivas.map((d, i) => (
        <article key={i} className="diapositiva" aria-label={t(T.material.diapositiva, { n: i + 1, total })}>
          <span className="franja" />
          <h3>{d.titulo}</h3>
          <ul>
            {d.ideas.map((idea, j) => (
              <li key={j}>
                <EnLinea texto={idea} />
              </li>
            ))}
          </ul>
          <div className="pie-diapo">
            <span>↳ {textoCitaMaterial(d.cita, temas)}</span>
            <span className="fila hueco-12">
              <span className="marca" style={{ transform: "scale(.8)", transformOrigin: "right" }} dangerouslySetInnerHTML={{ __html: logoSvg }} />
              <span className="cifras">
                {i + 1}/{total}
              </span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function TarjetaGiratoria({
  pregunta,
  respuesta,
  dato,
  cita,
  temas,
  n,
  total,
  literal,
  vuelta,
}: {
  pregunta: string;
  respuesta: string;
  dato: string;
  cita: CitaCompleta;
  temas: Temas;
  n: number;
  total: number;
  literal: boolean;
  vuelta: string;
}) {
  const [girada, setGirada] = useState(false);
  return (
    <div className="pila hueco-8">
      <button type="button" className={`tarjeta-repaso${girada ? " girada" : ""}`} onClick={() => setGirada(!girada)} aria-pressed={girada}>
        <div className="giro">
          <div className="cara">
            <span className="antetitulo">{t(T.material.preguntaN, { n, total })}</span>
            <span className="pregunta-t">{pregunta}</span>
            <span className="texto-3 fila hueco-8" style={{ marginTop: "auto", fontSize: 13 }}>
              <Icono nombre="girar" tam={16} />
              {T.material.tocaGirar}
            </span>
          </div>
          <div className="cara detras">
            <span className="antetitulo">
              {T.material.respuesta}
              {literal ? ` · ${T.material.literal}` : ""}
            </span>
            {literal && dato ? <span className="dato">{dato}</span> : null}
            <span className={literal && dato ? "explica" : "pregunta-t"}>
              <EnLinea texto={respuesta} />
            </span>
            <span className="texto-3" style={{ marginTop: "auto", fontSize: 13, color: "var(--ink)" }}>
              ↳ {textoCitaMaterial(cita, temas)}
            </span>
          </div>
        </div>
      </button>
      {girada ? <ChipCitaMaterial cita={cita} temas={temas} vuelta={vuelta} /> : null}
    </div>
  );
}

function Tarjetas({ c, temas, literal, vuelta }: { c: ContenidoTarjetas; temas: Temas; literal: boolean; vuelta: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {c.tarjetas.map((x, i) => (
        <TarjetaGiratoria key={i} {...x} cita={x.cita} temas={temas} n={i + 1} total={c.tarjetas.length} literal={literal} vuelta={vuelta} />
      ))}
    </div>
  );
}

export function VistaContenido({
  formato,
  estilo,
  contenido,
  temas,
  literal,
  logoSvg,
  vuelta,
}: {
  formato: Formato;
  estilo: string | null;
  contenido: Contenido;
  temas: Temas;
  literal: boolean;
  logoSvg: string;
  vuelta: string;
}) {
  if (formato === "resumen") {
    if (estilo === "cornell") return <Cornell c={contenido as ContenidoCornell} temas={temas} vuelta={vuelta} />;
    if (estilo === "ejecutivo") return <Ejecutivo c={contenido as ContenidoEjecutivo} temas={temas} vuelta={vuelta} />;
    return <ResumenEsquema c={contenido as ContenidoResumenEsquema} temas={temas} vuelta={vuelta} />;
  }
  if (formato === "esquema") return <Mapa c={contenido as ContenidoMapa} temas={temas} vuelta={vuelta} />;
  if (formato === "presentacion") return <Presentacion c={contenido as ContenidoPresentacion} temas={temas} logoSvg={logoSvg} />;
  if (formato === "tarjetas") return <Tarjetas c={contenido as ContenidoTarjetas} temas={temas} literal={literal} vuelta={vuelta} />;
  return null;
}
