import type { Metadata } from "next";
import { PocosDatos } from "@/componentes/metricas/Piezas";
import { PaginaMetrica } from "@/componentes/metricas/Pagina";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { contextoMetricas, datosProgreso, nombresTemas } from "@/servidor/metricas";
import { T, t } from "@/textos";

export const metadata: Metadata = { title: T.metricas.progreso.titulo };

// M4 · Progreso del grupo. Siempre sumado, nunca por alumno.
export default async function MetricasProgreso({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { s, papel } = await exigirGestion("formador", "dueno");
  const sp = await searchParams;
  const { c, grupos, temas } = await conSesion(s, async (tx) => {
    const c = await contextoMetricas(tx, papel, sp);
    return { c, grupos: await datosProgreso(tx, c), temas: await nombresTemas(tx) };
  });
  const P = T.metricas.progreso;
  const hay = grupos.some((g) => g.suficientes);
  return (
    <PaginaMetrica titulo={P.titulo} subtitulo={P.subtitulo} seccion="progreso" c={c}>
      {!hay && grupos.every((g) => !g.tests) ? <p className="texto-2" style={{ marginBottom: 16 }}>{P.vacio}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {grupos.map((g) => (
          <section key={g.grupo} className="tarjeta plana pila hueco-16">
            <h2 className="titulo-seccion" style={{ fontSize: 26 }}>
              {g.grupo}
            </h2>
            {!g.suficientes ? (
              <PocosDatos />
            ) : (
              <>
                <div className="kpi" style={{ border: 0, padding: 0 }}>
                  <div className="n cifras">{g.nota === null ? "—" : String(g.nota).replace(".", ",")}</div>
                  <div className="t">
                    {P.notaMedia} · {t(P.tests, { n: g.tests ?? 0 })}
                  </div>
                </div>
                {(["fuertes", "flojos"] as const).map((k) => {
                  const lista = (g.temas ?? []).filter((x) => (k === "fuertes" ? x.pct >= 70 : x.pct < 60));
                  return (
                    <div key={k} className="pila hueco-8">
                      <span className="antetitulo">{P[k]}</span>
                      {lista.length === 0 ? (
                        <span className="texto-3" style={{ fontSize: 14 }}>
                          —
                        </span>
                      ) : (
                        lista.map((x) => (
                          <div key={x.tema} className="fila separar">
                            <span>
                              Tema {x.tema} · {temas.get(x.tema) ?? ""}
                            </span>
                            <span className={`pastilla ${k === "fuertes" ? "bien" : "atencion"}`}>{x.pct} %</span>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </section>
        ))}
      </div>
    </PaginaMetrica>
  );
}
