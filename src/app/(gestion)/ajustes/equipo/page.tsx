import type { Metadata } from "next";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { T } from "@/textos";
import { Equipo } from "./Equipo";

export const metadata: Metadata = { title: T.ajustes.equipo.titulo };

// D1 · Equipo
export default async function PaginaEquipo() {
  const { s } = await exigirGestion("dueno");
  const d = await conSesion(s, async (tx) => ({
    grupos: await tx`select id, nombre from grupos where not archivado order by nombre`,
    personas: await tx`
      select p.id, p.nombre, p.correo, p.es_dueno, p.es_formador, p.estado,
             coalesce((select array_agg(fg.grupo_id) from formador_grupos fg where fg.formador_id = p.id), '{}') as grupos
      from personas p where (p.es_formador or p.es_dueno) and p.estado <> 'baja' order by p.es_dueno desc, p.nombre`,
  }));
  return (
    <main className="pagina media">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{T.ajustes.equipo.titulo}</h1>
          <p className="subtitulo">{T.ajustes.equipo.subtitulo}</p>
        </div>
      </div>
      <Equipo
        yo={s.persona.id}
        soloLectura={!!s.soporte}
        grupos={d.grupos.map((g) => ({ id: g.id as string, nombre: g.nombre as string }))}
        personas={d.personas.map((p) => ({
          id: p.id as string,
          nombre: p.nombre as string,
          correo: p.correo as string,
          esDueno: p.esDueno as boolean,
          esFormador: p.esFormador as boolean,
          pendiente: p.estado === "invitada",
          grupos: p.grupos as string[],
        }))}
      />
    </main>
  );
}
