import type { Metadata } from "next";
import { config } from "@/configuracion";
import { BarraConsumo } from "@/componentes/metricas/Piezas";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { T, t } from "@/textos";

export const metadata: Metadata = { title: T.ajustes.consumo.titulo };

// D3 · Consumo
export default async function PaginaConsumo() {
  const { s } = await exigirGestion("dueno");
  const d = await conSesion(s, async (tx) => {
    const c = (await tx`select academia.consumo_academia() as c`)[0].c as { preguntas: number; materiales: number; alumnos: number };
    const ajuste = async (k: string, def: number) => {
      const v = (await tx`select academia.ajuste(${k}) as v`)[0].v;
      return typeof v === "number" ? v : def;
    };
    return {
      c,
      topeP: await ajuste("limites.topeAcademiaPreguntasMes", config.limites.topeAcademiaPreguntasMes),
      topeM: await ajuste("limites.topeAcademiaMaterialesMes", config.limites.topeAcademiaMaterialesMes),
      incluidos: await ajuste("limites.alumnosIncluidos", config.limites.alumnosIncluidos),
      soporte: await tx`select tecnico_correo, empezada_at, terminada_at, cardinality(pantallas) as n from soporte_entradas order by empezada_at desc limit 50`,
    };
  });
  const C = T.ajustes.consumo;
  return (
    <main className="pagina media">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{C.titulo}</h1>
          <p className="subtitulo">{C.subtitulo}</p>
        </div>
      </div>
      <section className="tarjeta pila hueco-24" style={{ marginBottom: 32 }}>
        <BarraConsumo etiqueta={C.preguntas} usado={Number(d.c?.preguntas ?? 0)} tope={d.topeP} />
        <BarraConsumo etiqueta={C.materiales} usado={Number(d.c?.materiales ?? 0)} tope={d.topeM} />
        <BarraConsumo etiqueta={C.alumnos} usado={Number(d.c?.alumnos ?? 0)} tope={d.incluidos} />
      </section>
      <section className="pila hueco-8">
        <h2 className="antetitulo">{C.soporte}</h2>
        <p className="texto-2" style={{ fontSize: 14 }}>
          {C.soporteAyuda}
        </p>
        {d.soporte.length === 0 ? (
          <p className="texto-2">{C.soporteVacio}</p>
        ) : (
          d.soporte.map((e, i) => (
            <div key={i} className="elemento-biblio">
              <div className="pila rellenar hueco-4">
                <span className="titulo">{e.tecnicoCorreo as string}</span>
                <span className="meta">
                  {new Date(e.empezadaAt as string).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "long", timeStyle: "short" })} ·{" "}
                  {t(C.pantallas, { n: Number(e.n) })}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
