import type { Metadata } from "next";
import { PocosDatos } from "@/componentes/metricas/Piezas";
import { PaginaMetrica } from "@/componentes/metricas/Pagina";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { contextoMetricas, datosDudas, nombresTemas, type Asunto } from "@/servidor/metricas";
import { T, t } from "@/textos";

export const metadata: Metadata = { title: T.metricas.dudas.titulo };
export const maxDuration = 60;

function ListaAsuntos({ asuntos, temas }: { asuntos: Asunto[]; temas: Map<number, string> }) {
  const D = T.metricas.dudas;
  if (asuntos.length === 0) return <p className="texto-2">{D.vacio}</p>;
  return (
    <div>
      {asuntos.slice(0, 15).map((a, i) => (
        <div key={i} className="elemento-biblio">
          <div className="pila rellenar hueco-4">
            <span className="titulo">{a.asunto}</span>
            <span className="meta">
              {a.tema ? `Tema ${a.tema} · ${temas.get(a.tema) ?? ""} · ` : ""}
              {t(D.asunto, { n: a.dudas, m: a.alumnos })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// M2 · Dudas y atascos. Los asuntos los redacta la IA: nunca la frase de un alumno.
export default async function MetricasDudas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { s, papel } = await exigirGestion("formador", "dueno");
  const sp = await searchParams;
  const { c, d, temas } = await conSesion(s, async (tx) => {
    const c = await contextoMetricas(tx, papel, sp);
    return { c, d: await datosDudas(tx, c), temas: await nombresTemas(tx) };
  });
  const D = T.metricas.dudas;
  return (
    <PaginaMetrica titulo={D.titulo} seccion="dudas" c={c}>
      {!d.suficientes ? (
        <PocosDatos texto={T.metricas.pocos} />
      ) : (
        <div className="pila hueco-32">
          <section className="pila hueco-8">
            <h2 className="titulo-seccion" style={{ fontSize: 26 }}>
              {D.frecuentes}
            </h2>
            <p className="texto-2" style={{ fontSize: 14 }}>
              {D.frecuentesAyuda}
            </p>
            <ListaAsuntos asuntos={d.frecuentes} temas={temas} />
          </section>
          <section className="pila hueco-8">
            <h2 className="titulo-seccion" style={{ fontSize: 26 }}>
              {D.atascos}
            </h2>
            <p className="texto-2" style={{ fontSize: 14 }}>
              {D.atascosAyuda}
            </p>
            {!d.atascos.suficientes ? (
              <PocosDatos />
            ) : (
              (d.atascos.temas ?? []).map((x) => (
                <div key={x.tema} className="elemento-biblio">
                  <div className="pila rellenar hueco-4">
                    <span className="titulo">
                      Tema {x.tema} · {x.nombre}
                    </span>
                    <span className="meta">
                      {t(D.dudasTema, { n: x.dudas })}
                      {x.fallosPct !== null && x.fallosPct !== undefined ? ` · ${t(D.fallosTema, { pct: x.fallosPct })}` : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </section>
          <section className="pila hueco-8">
            <h2 className="titulo-seccion" style={{ fontSize: 26 }}>
              {D.falta}
            </h2>
            <p className="texto-2" style={{ fontSize: 14 }}>
              {D.faltaAyuda}
            </p>
            <ListaAsuntos asuntos={d.falta} temas={temas} />
          </section>
        </div>
      )}
    </PaginaMetrica>
  );
}
