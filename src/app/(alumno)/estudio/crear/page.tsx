import type { Metadata } from "next";
import { CrearMaterial } from "@/componentes/CrearMaterial";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { oposicionDe, temasDe } from "@/servidor/alumno";
import { estadoMateriales } from "@/servidor/limites";
import { T } from "@/textos";

export const metadata: Metadata = { title: T.crear.titulo };
export const maxDuration = 300;

// A6 · Crear material
export default async function PaginaCrear() {
  const s = await exigirSesion("alumno");
  const d = await conSesion(s, async (tx) => {
    const op = await oposicionDe(tx, s.persona.id);
    const temas = op ? await temasDe(tx, op.id) : [];
    const lim = await estadoMateriales(tx, s.persona.id, false);
    return { op, temas, lim };
  });
  return (
    <main className="pagina">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{T.crear.titulo}</h1>
          <p className="subtitulo solo-ordenador">{T.crear.subtitulo}</p>
        </div>
      </div>
      <CrearMaterial
        temas={d.temas.map((x) => ({ id: x.id, numero: x.numero, nombre: x.nombre, paginas: x.paginas }))}
        quedan={d.lim.quedan}
        limite={d.lim.bloqueo}
        regla={{ resta: d.op?.restaPorFallo ?? 1 / 3, segundos: d.op?.segundosPorPregunta ?? 60 }}
        destino="/estudio/material"
      />
    </main>
  );
}
