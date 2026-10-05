import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icono } from "@/componentes/Icono";
import { Marca } from "@/componentes/Marca";
import { ChipCitaMaterial, type CitaCompleta } from "@/componentes/material/VistaContenido";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { unMaterial } from "@/servidor/materiales";
import { T, t } from "@/textos";
import type { ContenidoTest } from "@/tipos/material";

export const metadata: Metadata = { title: T.test.resultado };

const coma = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");

// A10 · Resultado del test
export default async function PaginaResultado({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; intento: string }>;
  searchParams: Promise<{ ver?: string }>;
}) {
  const s = await exigirSesion("alumno");
  const { id, intento } = await params;
  const { ver = "todas" } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(intento)) notFound();
  const d = await conSesion(s, async (tx) => {
    const i = await tx`select * from intentos_test where id = ${intento} and material_id = ${id} and terminado_at is not null`;
    if (!i[0]) return null;
    const m = await unMaterial(tx, s.persona.id, id);
    if (!m) return null;
    return { i: i[0], m };
  });
  if (!d) notFound();
  const c = d.m.contenido as ContenidoTest;
  const preguntas = d.i.preguntas as number[];
  const respuestas = d.i.respuestas as Record<string, number | null>;
  const simulacro = d.i.modo === "simulacro";
  const aciertos = Number(d.i.aciertos);
  const fallos = Number(d.i.fallos);
  const blancas = Number(d.i.enBlanco);
  const minutos = Math.max(1, Math.round((new Date(d.i.terminadoAt as string).getTime() - new Date(d.i.empezadoAt as string).getTime()) / 60000));
  const temas = d.m.temas.map((x) => x.numero);
  const temasTexto = temas.length > 1 ? `Temas ${temas.slice(0, -1).join(", ")} y ${temas.at(-1)}` : `Tema ${temas[0]}`;
  const estado = (p: number) => (respuestas[String(p)] === null || respuestas[String(p)] === undefined ? "blanca" : respuestas[String(p)] === c.preguntas[p].correcta ? "acertada" : "fallada");
  const lista = preguntas.filter((p) => ver === "todas" || (ver === "falladas" && estado(p) === "fallada") || (ver === "blanco" && estado(p) === "blanca"));
  const vuelta = `/test/${id}/resultado/${intento}`;

  return (
    <div className="pila" style={{ minHeight: "100dvh" }}>
      <header className="fila separar" style={{ height: 76, padding: "0 20px 0 24px", borderBottom: "1px solid var(--line)" }}>
        <Marca />
        <Link href="/estudio/biblioteca?tab=tests" className="boton boton-peq" style={{ borderColor: "var(--line)" }}>
          <Icono nombre="izquierda" tam={16} />
          {T.test.volverBiblioteca}
        </Link>
      </header>
      <main style={{ width: "100%", maxWidth: 1216, margin: "0 auto", padding: "56px 20px 80px", display: "grid", gridTemplateColumns: "minmax(0, 400px) minmax(0, 1fr)", gap: 96 }} className="resultado">
        <section className="pila hueco-16" style={{ alignSelf: "start", position: "sticky", top: 32 }}>
          <span className="texto-2" style={{ fontSize: 14 }}>
            {simulacro ? "Simulacro" : d.i.modo === "repaso" ? T.test.repasarFallos : "Test de práctica"} · {temasTexto} · {preguntas.length} preguntas · {minutos} min
          </span>
          <div className="pila hueco-4">
            <span className="nota-grande cifras">{coma(Number(d.i.nota))}</span>
            <span className="texto-2" style={{ fontSize: 17 }}>
              {simulacro ? (
                <>
                  {T.test.conPenalizacion} · <strong>{coma(Number(d.i.notaSinPenalizacion))}</strong> {T.test.sinPenalizacion}
                </>
              ) : (
                T.test.sobre10
              )}
            </span>
          </div>
          <div className="cifras-resultado">
            <div>
              <div className="n cifras">{aciertos}</div>
              <div className="t">{T.test.aciertos}</div>
            </div>
            <div>
              <div className="n cifras">{fallos}</div>
              <div className="t">{T.test.fallos}</div>
            </div>
            <div>
              <div className="n cifras">{blancas}</div>
              <div className="t">{T.test.enBlanco}</div>
            </div>
          </div>
          {fallos + blancas > 0 ? (
            <Link href={`/test/${id}?repaso=${intento}`} className="boton boton-principal boton-grande boton-ancho">
              <Icono nombre="repasar" tam={17} />
              {T.test.repasarFallos}
            </Link>
          ) : (
            <p className="texto-2">{T.test.sinFallos}</p>
          )}
          <span className="texto-3 fila hueco-8" style={{ fontSize: 13 }}>
            <Icono nombre="candado" tam={15} />
            {T.test.notaPrivada}
          </span>
        </section>

        <section className="pila">
          <div className="fila separar envolver hueco-12" style={{ marginBottom: 8 }}>
            <h2 className="titulo-seccion" style={{ fontSize: 38 }}>
              {T.test.correccion}
            </h2>
            <div className="fila hueco-8 envolver">
              <Link href={`${vuelta}`} className="chip-filtro" aria-pressed={ver === "todas"}>
                {T.test.todas}
              </Link>
              <Link href={`${vuelta}?ver=falladas`} className="chip-filtro" aria-pressed={ver === "falladas"}>
                {t(T.test.falladas, { n: fallos })}
              </Link>
              <Link href={`${vuelta}?ver=blanco`} className="chip-filtro" aria-pressed={ver === "blanco"}>
                {t(T.test.blancas, { n: blancas })}
              </Link>
            </div>
          </div>
          {lista.map((p) => {
            const q = c.preguntas[p];
            const e = estado(p);
            const r = respuestas[String(p)];
            return (
              <article key={p} className="pila hueco-10" style={{ padding: "22px 0", borderBottom: "1px solid var(--line)" }}>
                <div className="fila separar">
                  <span className="antetitulo">{t(T.test.pregunta, { n: preguntas.indexOf(p) + 1 })}</span>
                  <span className={`pastilla ${e === "acertada" ? "bien" : e === "fallada" ? "error" : ""}`}>
                    <Icono nombre={e === "acertada" ? "bien" : e === "fallada" ? "cerrar" : "puntos"} tam={14} />
                    {e === "acertada" ? T.test.acertada : e === "fallada" ? T.test.fallada : T.test.blanca}
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.45 }}>{q.enunciado}</h3>
                {r !== null && r !== undefined ? (
                  <span className="fila hueco-8" style={{ fontSize: 15, alignItems: "flex-start", color: e === "acertada" ? "var(--text)" : "var(--text-2)" }}>
                    <span style={{ color: e === "acertada" ? "var(--ok)" : "var(--err)", display: "flex" }}>
                      <Icono nombre={e === "acertada" ? "bien" : "cerrar"} tam={16} />
                    </span>
                    <span>
                      {T.test.tuRespuesta} {e === "acertada" ? <strong>{q.opciones[r]}</strong> : q.opciones[r]}
                    </span>
                  </span>
                ) : null}
                {e !== "acertada" ? (
                  <span className="fila hueco-8" style={{ fontSize: 15, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--ok)", display: "flex", marginTop: 3 }}>
                      <Icono nombre="bien" tam={16} />
                    </span>
                    <span>
                      {T.test.correcta} <strong>{q.opciones[q.correcta]}</strong>
                    </span>
                  </span>
                ) : null}
                <p className="texto-2" style={{ fontSize: 16, lineHeight: 1.65 }}>
                  {q.justificacion}
                </p>
                <ChipCitaMaterial cita={q.cita as CitaCompleta} temas={d.m.temas} vuelta={vuelta} />
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
