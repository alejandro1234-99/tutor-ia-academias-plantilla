import type { Metadata } from "next";
import { config } from "@/configuracion";
import { PaginaMetrica } from "@/componentes/metricas/Pagina";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { contextoMetricas, datosRiesgo } from "@/servidor/metricas";
import { T, t } from "@/textos";

export const metadata: Metadata = { title: T.metricas.riesgo.titulo };

// M3 · Alumnos en riesgo: el único dato con nombre (solo quién entra y cuándo).
export default async function MetricasRiesgo({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { s, papel } = await exigirGestion("formador", "dueno");
  const sp = await searchParams;
  const { c, lista } = await conSesion(s, async (tx) => {
    const c = await contextoMetricas(tx, papel, sp);
    return { c, lista: await datosRiesgo(tx, c) };
  });
  const R = T.metricas.riesgo;
  const n = config.avisos.diasParaRiesgo;
  return (
    <PaginaMetrica titulo={R.titulo} subtitulo={t(R.subtitulo, { n })} seccion="riesgo" c={c}>
      {lista.length === 0 ? (
        <p className="texto-2">{t(R.vacio, { n })}</p>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>{R.columnas.nombre}</th>
                <th>{R.columnas.grupo}</th>
                <th>{R.columnas.dias}</th>
                <th>{R.columnas.correo}</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id}>
                  <td className="principal">{a.nombre}</td>
                  <td>{a.grupo}</td>
                  <td>
                    <span className={`pastilla ${a.dias === null || a.dias >= n * 2 ? "error" : "atencion"}`}>{a.dias === null ? R.nunca : t(R.dias, { n: a.dias })}</span>
                  </td>
                  <td>
                    <a href={`mailto:${a.correo}`}>{a.correo}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PaginaMetrica>
  );
}
