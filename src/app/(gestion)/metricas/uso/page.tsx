import type { Metadata } from "next";
import { config } from "@/configuracion";
import { MapaHoras, PocosDatos } from "@/componentes/metricas/Piezas";
import { PaginaMetrica } from "@/componentes/metricas/Pagina";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { contextoMetricas, datosUso } from "@/servidor/metricas";
import { T, t } from "@/textos";

export const metadata: Metadata = { title: T.metricas.uso.titulo };

// M1 · Uso
export default async function MetricasUso({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { s, papel } = await exigirGestion("formador", "dueno");
  const sp = await searchParams;
  const { c, d } = await conSesion(s, async (tx) => {
    const c = await contextoMetricas(tx, papel, sp);
    return { c, d: await datosUso(tx, c) };
  });
  const U = T.metricas.uso;
  return (
    <PaginaMetrica titulo={U.titulo} seccion="uso" c={c}>
      {!d.suficientes ? (
        d.alumnos === 0 ? <p className="texto-2">{t(U.vacio, { asistente: config.asistente.nombre })}</p> : <PocosDatos texto={T.metricas.pocos} />
      ) : (
        <div className="pila hueco-32">
          <div className="kpis">
            <div className="kpi">
              <div className="n cifras">{d.activos}</div>
              <div className="t">{U.activos}</div>
            </div>
            <div className="kpi">
              <div className="n cifras">{d.preguntas?.toLocaleString("es-ES")}</div>
              <div className="t">{U.preguntas}</div>
            </div>
            <div className="kpi">
              <div className="n cifras">{d.materiales?.toLocaleString("es-ES")}</div>
              <div className="t">{U.materiales}</div>
            </div>
          </div>
          <section className="tarjeta plana pila hueco-12">
            <h2 className="titulo-seccion" style={{ fontSize: 26 }}>
              {U.horas}
            </h2>
            <p className="texto-2" style={{ fontSize: 14 }}>
              {U.horasAyuda}
            </p>
            <MapaHoras celdas={d.mapa ?? []} />
          </section>
        </div>
      )}
    </PaginaMetrica>
  );
}
