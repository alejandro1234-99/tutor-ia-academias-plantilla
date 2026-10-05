import type { Metadata } from "next";
import { CrearMaterial } from "@/componentes/CrearMaterial";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion, prohibirEnSoporte } from "@/servidor/sesion";
import { estadoMateriales } from "@/servidor/limites";
import { temasDe } from "@/servidor/alumno";
import { T } from "@/textos";

export const metadata: Metadata = { title: T.materialClase.crear };
export const maxDuration = 300;

export default async function CrearParaClase() {
  const { s } = await exigirGestion("formador");
  prohibirEnSoporte(s);
  const d = await conSesion(s, async (tx) => {
    const op = await tx`select id, resta_por_fallo, segundos_por_pregunta from oposiciones where id = any(academia.mis_oposiciones_gestion()) order by orden limit 1`;
    const temas = op[0] ? await temasDe(tx, op[0].id as string) : [];
    const lim = await estadoMateriales(tx, s.persona.id, true);
    return { op: op[0], temas, lim };
  });
  return (
    <main className="pagina">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{T.materialClase.crear}</h1>
          <p className="subtitulo">{T.materialClase.subtitulo}</p>
        </div>
      </div>
      <CrearMaterial
        temas={d.temas.map((x) => ({ id: x.id, numero: x.numero, nombre: x.nombre, paginas: x.paginas }))}
        quedan={d.lim.quedan}
        limite={d.lim.bloqueo}
        regla={{ resta: Number(d.op?.restaPorFallo ?? 1 / 3), segundos: Number(d.op?.segundosPorPregunta ?? 60) }}
        paraClase
        destino="/formador/material"
      />
    </main>
  );
}
