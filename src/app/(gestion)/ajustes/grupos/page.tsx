import type { Metadata } from "next";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { T } from "@/textos";
import { Grupos } from "./Grupos";

export const metadata: Metadata = { title: T.ajustes.grupos.titulo };

// D2 · Oposiciones y grupos
export default async function PaginaGrupos() {
  const { s } = await exigirGestion("dueno");
  const d = await conSesion(s, async (tx) => ({
    oposiciones: await tx`select id, nombre, resta_por_fallo, segundos_por_pregunta from oposiciones order by orden`,
    grupos: await tx`
      select g.id, g.nombre, g.oposicion_id, g.archivado,
             (select count(*)::int from personas p where p.grupo_id = g.id and p.es_alumno and p.estado <> 'baja') as alumnos,
             (select coalesce(string_agg(p.nombre, ', ' order by p.nombre), '') from formador_grupos fg join personas p on p.id = fg.formador_id
              where fg.grupo_id = g.id and p.estado <> 'baja') as formadores
      from grupos g order by g.archivado, g.nombre`,
  }));
  return (
    <main className="pagina media">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{T.ajustes.grupos.titulo}</h1>
          <p className="subtitulo">{T.ajustes.grupos.subtitulo}</p>
        </div>
      </div>
      <Grupos
        soloLectura={!!s.soporte}
        oposiciones={d.oposiciones.map((o) => ({ id: o.id as string, nombre: o.nombre as string, resta: Number(o.restaPorFallo), segundos: Number(o.segundosPorPregunta) }))}
        grupos={d.grupos.map((g) => ({
          id: g.id as string,
          nombre: g.nombre as string,
          oposicionId: g.oposicionId as string,
          archivado: g.archivado as boolean,
          alumnos: Number(g.alumnos),
          formadores: g.formadores as string,
        }))}
      />
      <p className="texto-3" style={{ fontSize: 13, marginTop: 24 }}>
        {T.ajustes.grupos.nuevaOposicion}
      </p>
    </main>
  );
}
