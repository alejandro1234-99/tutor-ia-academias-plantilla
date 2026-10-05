import type { Metadata } from "next";
import { PocosDatos } from "@/componentes/metricas/Piezas";
import { PaginaMetrica } from "@/componentes/metricas/Pagina";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { contextoMetricas, datosMaterial } from "@/servidor/metricas";
import { T, t } from "@/textos";
import { tipoMaterial, type Formato } from "@/tipos/material";

export const metadata: Metadata = { title: T.metricas.material.titulo };

// M5 · Material: formatos más creados y peor valorados.
export default async function MetricasMaterial({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { s, papel } = await exigirGestion("formador", "dueno");
  const sp = await searchParams;
  const { c, d } = await conSesion(s, async (tx) => {
    const c = await contextoMetricas(tx, papel, sp);
    return { c, d: await datosMaterial(tx, c) };
  });
  const M = T.metricas.material;
  const formatos = d.formatos ?? [];
  const valorados = formatos.filter((f) => f.valorados > 0).sort((a, b) => b.noSirvio / b.valorados - a.noSirvio / a.valorados);
  return (
    <PaginaMetrica titulo={M.titulo} seccion="material" c={c}>
      {!d.suficientes ? (
        <PocosDatos texto={T.metricas.pocos} />
      ) : formatos.length === 0 ? (
        <p className="texto-2">{M.vacio}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          <section className="tarjeta plana pila hueco-8">
            <h2 className="antetitulo">{M.masCreados}</h2>
            {formatos.map((f) => (
              <div key={f.formato + f.estilo} className="fila separar" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <span>{tipoMaterial(f.formato as Formato, f.estilo || null)}</span>
                <span className="texto-2 cifras">{t(M.creados, { n: f.creados })}</span>
              </div>
            ))}
          </section>
          <section className="tarjeta plana pila hueco-8">
            <h2 className="antetitulo">{M.peorValorados}</h2>
            {valorados.length === 0 ? (
              <p className="texto-2">{M.sinValoraciones}</p>
            ) : (
              valorados.map((f) => (
                <div key={f.formato + f.estilo} className="fila separar" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span>{tipoMaterial(f.formato as Formato, f.estilo || null)}</span>
                  <span className="texto-2 cifras" style={{ fontSize: 14 }}>
                    {t(M.valoracion, { pct: Math.round((f.noSirvio / f.valorados) * 100), n: f.valorados })}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </PaginaMetrica>
  );
}
