import type { Metadata } from "next";
import { config } from "@/configuracion";
import { BarraConsumo } from "@/componentes/metricas/Piezas";
import { comoSistema } from "@/servidor/bd";
import { DOLAR_A_EURO, exigirTecnico } from "@/servidor/tecnico";
import { T, t } from "@/textos";

export const metadata: Metadata = { title: T.tecnico.coste.titulo };

const euros = (usd: number) => (usd * DOLAR_A_EURO).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

// X1 · Coste y uso
export default async function PaginaCoste() {
  await exigirTecnico();
  const d = await comoSistema(async (tx) => {
    const coste = await tx`select tipo, count(*)::int as n, coalesce(sum(coste_usd), 0)::float as usd from uso where mes = mes_madrid() and subtipo is distinct from 'inventado' group by tipo`;
    const lat = await tx`
      select percentile_cont(0.5) within group (order by ms_primera_letra) as p50, percentile_cont(0.9) within group (order by ms_primera_letra) as p90, count(*)::int as n
      from uso where tipo = 'pregunta' and ms_primera_letra is not null and creado_at > now() - interval '30 days'`;
    const errores = await tx`select at, tipo, detalle from errores order by at desc limit 20`;
    const correos = await tx`select count(*)::int as n, count(*) filter (where not ok)::int as fallidos from correos_enviados where enviado_at > date_trunc('month', now())`;
    const totales = await tx`select tipo, count(*)::int as n from uso where mes = mes_madrid() and tipo in ('pregunta', 'material') group by tipo`;
    const ajuste = async (k: string, def: number) => {
      const v = (await tx`select valor from ajustes where clave = ${k}`)[0]?.valor;
      return typeof v === "number" ? v : def;
    };
    return {
      coste,
      lat: lat[0],
      errores,
      correos: correos[0],
      totales,
      topeP: await ajuste("limites.topeAcademiaPreguntasMes", config.limites.topeAcademiaPreguntasMes),
      topeM: await ajuste("limites.topeAcademiaMaterialesMes", config.limites.topeAcademiaMaterialesMes),
    };
  });
  const C = T.tecnico.coste;
  const total = d.coste.reduce((s, x) => s + Number(x.usd), 0);
  const por = (tipo: string) => d.coste.find((x) => x.tipo === tipo);
  const n = (tipo: string) => Number(d.totales.find((x) => x.tipo === tipo)?.n ?? 0);
  return (
    <main className="pagina media">
      <h1 className="titulo-pagina" style={{ marginBottom: 32 }}>
        {C.titulo}
      </h1>
      <div className="kpis" style={{ marginBottom: 32 }}>
        <div className="kpi">
          <div className="n cifras">{euros(total)}</div>
          <div className="t">{C.costeMes}</div>
        </div>
        <div className="kpi">
          <div className="n cifras">{euros(Number(por("pregunta")?.usd ?? 0))}</div>
          <div className="t">{C.preguntas}</div>
        </div>
        <div className="kpi">
          <div className="n cifras">{euros(Number(por("material")?.usd ?? 0))}</div>
          <div className="t">{C.materiales}</div>
        </div>
        <div className="kpi">
          <div className="n cifras">{euros(Number(por("interno")?.usd ?? 0))}</div>
          <div className="t">{C.interno}</div>
        </div>
      </div>
      <section className="tarjeta pila hueco-20" style={{ marginBottom: 32 }}>
        <BarraConsumo etiqueta={T.ajustes.consumo.preguntas} usado={n("pregunta")} tope={d.topeP} />
        <BarraConsumo etiqueta={T.ajustes.consumo.materiales} usado={n("material")} tope={d.topeM} />
        <div className="fila separar">
          <span>{C.velocidad}</span>
          <strong className="cifras">
            {d.lat?.n ? t(C.velocidadTexto, { p90: (Number(d.lat.p90) / 1000).toFixed(1).replace(".", ","), p50: (Number(d.lat.p50) / 1000).toFixed(1).replace(".", ",") }) : "—"}
          </strong>
        </div>
        <div className="fila separar">
          <span>{C.correos}</span>
          <strong className="cifras">
            {d.correos.n} {d.correos.fallidos ? `(${d.correos.fallidos} fallidos)` : ""}
          </strong>
        </div>
      </section>
      <section className="pila hueco-8">
        <h2 className="antetitulo">{C.errores}</h2>
        {d.errores.length === 0 ? (
          <p className="texto-2">{C.sinErrores}</p>
        ) : (
          d.errores.map((e, i) => (
            <div key={i} className="elemento-biblio">
              <div className="pila rellenar hueco-4">
                <span className="meta">
                  {new Date(e.at as string).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {e.tipo as string}
                </span>
                <span style={{ fontSize: 14, overflowWrap: "anywhere" }}>{(e.detalle as string) ?? ""}</span>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
