import type { Metadata } from "next";
import Link from "next/link";
import { GraficaNotas } from "@/componentes/GraficaNotas";
import { Icono } from "@/componentes/Icono";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { T, t } from "@/textos";
import type { ContenidoTest } from "@/tipos/material";

export const metadata: Metadata = { title: T.progreso.titulo };

// A13 · Mi progreso. Solo lo ve el alumno (protegido en la base de datos).
export default async function PaginaProgreso() {
  const s = await exigirSesion("alumno");
  const d = await conSesion(s, async (tx) => {
    const racha = await tx`
      with dias as (select fecha from actividad where persona_id = ${s.persona.id}),
      seguidos as (
        select fecha, fecha - (row_number() over (order by fecha))::int as grupo from dias
      )
      select count(*)::int as n from seguidos
      where grupo = (select grupo from seguidos where fecha = (select max(fecha) from dias))
        and (select max(fecha) from dias) >= academia.hoy_madrid() - 1`;
    const intentos = await tx`
      select i.nota, i.terminado_at, i.preguntas, i.respuestas, i.modo, m.contenido, m.tema_ids
      from intentos_test i join materiales m on m.id = i.material_id
      where i.terminado_at is not null and i.modo <> 'repaso' order by i.terminado_at`;
    const tarjetas = await tx`
      select r.ultima_respuesta, m.tema_ids from tarjetas_repaso r join materiales m on m.id = r.material_id
      where r.ultima_respuesta is not null`;
    const temas = await tx`select id, numero, coalesce(nombre_corto, nombre) as nombre from temas`;
    return { racha: Number(racha[0]?.n ?? 0), intentos, tarjetas, temas };
  });

  // Aciertos por tema, con tests y tarjetas.
  const porTema = new Map<number, { bien: number; total: number }>();
  const sumar = (tema: number, bien: boolean) => {
    const x = porTema.get(tema) ?? { bien: 0, total: 0 };
    x.total++;
    if (bien) x.bien++;
    porTema.set(tema, x);
  };
  for (const i of d.intentos) {
    const c = i.contenido as ContenidoTest;
    const r = i.respuestas as Record<string, number | null>;
    for (const p of i.preguntas as number[]) {
      const q = c?.preguntas?.[p];
      if (q && r[String(p)] !== null && r[String(p)] !== undefined) sumar(q.cita.tema, r[String(p)] === q.correcta);
    }
  }
  for (const x of d.tarjetas) {
    for (const id of x.temaIds as string[]) {
      const tema = d.temas.find((y) => y.id === id);
      if (tema) sumar(Number(tema.numero), x.ultimaRespuesta === "la_sabia");
    }
  }
  const nombre = (n: number) => d.temas.find((x) => Number(x.numero) === n)?.nombre ?? "";
  const lista = [...porTema.entries()].filter(([, v]) => v.total >= 3).map(([n, v]) => ({ n, pct: Math.round((v.bien / v.total) * 100) }));
  const flojos = lista.filter((x) => x.pct < 60).sort((a, b) => a.pct - b.pct);
  const fuertes = lista.filter((x) => x.pct >= 80).sort((a, b) => b.pct - a.pct);
  const notas = d.intentos.map((i) => ({
    nota: Number(i.nota),
    fecha: new Date(i.terminadoAt as string).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" }).replace(".", ""),
    etiqueta: new Date(i.terminadoAt as string).toLocaleString("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }),
  }));
  const media = notas.length ? notas.reduce((s, n) => s + n.nota, 0) / notas.length : null;
  const P = T.progreso;

  return (
    <main className="pagina media">
      <div className="cabecera-pagina">
        <h1 className="titulo-pagina">{P.titulo}</h1>
      </div>
      <div className="kpis" style={{ marginBottom: 32 }}>
        <div className="kpi">
          <div className="n cifras fila hueco-8">
            {Math.max(1, d.racha)}
            <span style={{ color: "var(--accent)", display: "flex" }}>
              <Icono nombre="llama" tam={28} />
            </span>
          </div>
          <div className="t">{P.racha}</div>
        </div>
        <div className="kpi">
          <div className="n cifras">{notas.length}</div>
          <div className="t">{P.tests}</div>
        </div>
        <div className="kpi">
          <div className="n cifras">{media === null ? "—" : media.toFixed(2).replace(/\.?0+$/, "").replace(".", ",")}</div>
          <div className="t">{P.notaMedia}</div>
        </div>
      </div>

      <section className="tarjeta plana pila hueco-16" style={{ marginBottom: 32 }}>
        <h2 className="titulo-seccion" style={{ fontSize: 26 }}>
          {P.grafica}
        </h2>
        {notas.length ? (
          <GraficaNotas puntos={notas.slice(-20)} />
        ) : (
          <div className="pila hueco-12">
            <p className="texto-2">{P.graficaVacia}</p>
            <Link href="/estudio/crear" className="boton boton-principal" style={{ alignSelf: "flex-start" }}>
              <Icono nombre="test" tam={18} />
              {T.crear.formatos.test[0]}
            </Link>
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        {[
          { titulo: P.flojos, lista: flojos, clase: "atencion" },
          { titulo: P.fuertes, lista: fuertes, clase: "bien" },
        ].map((b) => (
          <section key={b.titulo} className="tarjeta plana pila hueco-12">
            <h2 className="antetitulo">{b.titulo}</h2>
            {b.lista.length === 0 ? (
              <p className="texto-2" style={{ fontSize: 15 }}>
                {P.sinDatos}
              </p>
            ) : (
              b.lista.map((x) => (
                <div key={x.n} className="fila separar hueco-12">
                  <span>
                    Tema {x.n} · {nombre(x.n)}
                  </span>
                  <span className={`pastilla ${b.clase}`}>{t(P.aciertosTema, { pct: x.pct })}</span>
                </div>
              ))
            )}
          </section>
        ))}
      </div>
      <p className="texto-3 fila hueco-8" style={{ fontSize: 13, marginTop: 28 }}>
        <Icono nombre="candado" tam={15} />
        {P.soloTu}
      </p>
    </main>
  );
}
