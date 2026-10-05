import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/componentes/Icono";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { T, t } from "@/textos";
import { AccionesAlumno } from "./AccionesAlumno";

export const metadata: Metadata = { title: T.alumnos.titulo };

function ultimoAcceso(fecha: string | null): string {
  if (!fecha) return T.alumnos.nunca;
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  if (dias <= 0) return T.alumnos.hoy;
  if (dias === 1) return T.alumnos.ayer;
  return t(T.alumnos.haceDias, { n: dias });
}

// F3 · Alumnos. SIN ninguna columna de preguntas, notas ni progreso.
export default async function PaginaAlumnos({ searchParams }: { searchParams: Promise<{ grupo?: string }> }) {
  const { s } = await exigirGestion("formador", "dueno");
  const { grupo } = await searchParams;
  const d = await conSesion(s, async (tx) => {
    const grupos = await tx`
      select id, nombre from grupos where not archivado and (academia.soy_dueno() or id = any(academia.mis_grupos())) order by nombre`;
    const alumnos = await tx`
      select p.id, p.nombre, p.correo, p.grupo_id, g.nombre as grupo, p.ultimo_acceso_at, p.invitacion_aceptada_at, p.estado
      from personas p left join grupos g on g.id = p.grupo_id
      where p.es_alumno and (academia.soy_dueno() or p.grupo_id = any(academia.mis_grupos()))
      order by p.estado = 'baja', g.nombre, p.nombre`;
    return { grupos, alumnos };
  });
  const filtro = grupo && d.grupos.some((g) => g.id === grupo) ? grupo : null;
  const lista = d.alumnos.filter((a) => !filtro || a.grupoId === filtro);
  const A = T.alumnos;
  return (
    <main className="pagina">
      <div className="cabecera-pagina">
        <h1 className="titulo-pagina">{A.titulo}</h1>
        {s.soporte ? null : (
          <Link href="/formador/alumnos/invitar" className="boton boton-principal">
            <Icono nombre="mas" tam={18} />
            {A.invitar}
          </Link>
        )}
      </div>
      {d.grupos.length > 1 ? (
        <nav className="pestanas" style={{ marginBottom: 24 }}>
          <Link href="/formador/alumnos" className="pestana" aria-current={!filtro ? "page" : undefined}>
            {A.todos} <span className="cuenta">{d.alumnos.length}</span>
          </Link>
          {d.grupos.map((g) => (
            <Link key={g.id as string} href={`/formador/alumnos?grupo=${g.id}`} className="pestana" aria-current={filtro === g.id ? "page" : undefined}>
              {g.nombre as string} <span className="cuenta">{d.alumnos.filter((a) => a.grupoId === g.id).length}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      {d.grupos.length === 0 ? (
        <div className="aviso atencion">
          <span className="texto-aviso">{A.sinGrupos}</span>
        </div>
      ) : lista.length === 0 ? (
        <div className="vacio">
          <span className="circulo">
            <Icono nombre="grupo" tam={30} />
          </span>
          <h2>{A.vacio}</h2>
          <p>{A.vacioTexto}</p>
          <div className="fila hueco-10 envolver" style={{ justifyContent: "center" }}>
            <Link href="/formador/alumnos/invitar" className="boton boton-principal">
              {A.uno}
            </Link>
            <Link href="/formador/alumnos/invitar?modo=lista" className="boton">
              {A.lista}
            </Link>
          </div>
          <a href="/api/alumnos/plantilla">{A.plantilla}</a>
        </div>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>{A.columnas.nombre}</th>
                <th>{A.columnas.correo}</th>
                <th>{A.columnas.grupo}</th>
                <th>{A.columnas.acceso}</th>
                <th>{A.columnas.invitacion}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id as string} style={{ opacity: a.estado === "baja" ? 0.55 : 1 }}>
                  <td className="principal">{a.nombre as string}</td>
                  <td>{a.correo as string}</td>
                  <td>{(a.grupo as string) ?? "—"}</td>
                  <td className="cifras">{a.estado === "baja" ? "—" : ultimoAcceso(a.ultimoAccesoAt ? String(a.ultimoAccesoAt) : null)}</td>
                  <td>
                    <span className={`pastilla ${a.estado === "baja" ? "error" : a.invitacionAceptadaAt ? "bien" : ""}`}>
                      {a.estado === "baja" ? A.baja : a.invitacionAceptadaAt ? A.aceptada : A.pendiente}
                    </span>
                  </td>
                  <td>
                    {s.soporte ? null : (
                      <AccionesAlumno
                        id={a.id as string}
                        nombre={a.nombre as string}
                        grupoId={(a.grupoId as string) ?? ""}
                        grupos={d.grupos.map((g) => ({ id: g.id as string, nombre: g.nombre as string }))}
                        baja={a.estado === "baja"}
                        aceptada={!!a.invitacionAceptadaAt}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="texto-3 fila hueco-8" style={{ fontSize: 13, marginTop: 24 }}>
        <Icono nombre="candado" tam={15} />
        {A.noVe}
      </p>
    </main>
  );
}
