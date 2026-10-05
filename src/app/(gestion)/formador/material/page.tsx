import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/componentes/Icono";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { fechaCorta, listarMateriales } from "@/servidor/materiales";
import { T } from "@/textos";
import { tipoMaterial } from "@/tipos/material";

export const metadata: Metadata = { title: T.materialClase.titulo };

// F5 · Material para clase
export default async function PaginaMaterialClase() {
  const { s } = await exigirGestion("formador");
  const d = await conSesion(s, async (tx) => ({
    materiales: (await listarMateriales(tx, s.persona.id)).filter((m) => m.esDeFormador),
    compartidos: await tx`select mc.material_id, g.nombre from material_compartido mc join grupos g on g.id = mc.grupo_id`,
  }));
  const M = T.materialClase;
  return (
    <main className="pagina">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{M.titulo}</h1>
          <p className="subtitulo">{M.subtitulo}</p>
        </div>
        {s.soporte ? null : (
          <Link href="/formador/material/crear" className="boton boton-principal">
            <Icono nombre="crear" tam={18} />
            {M.crear}
          </Link>
        )}
      </div>
      {d.materiales.length === 0 ? (
        <div className="vacio">
          <span className="circulo">
            <Icono nombre="crear" tam={30} />
          </span>
          <h2>{M.vacio}</h2>
          <p>{M.vacioTexto}</p>
        </div>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>{T.biblioteca.columnas.material}</th>
                <th>{T.biblioteca.columnas.tipo}</th>
                <th>{T.biblioteca.columnas.tema}</th>
                <th>{M.compartidoCon}</th>
                <th>{T.biblioteca.columnas.creado}</th>
              </tr>
            </thead>
            <tbody>
              {d.materiales.map((m) => {
                const grupos = d.compartidos.filter((c) => c.materialId === m.id).map((c) => c.nombre as string);
                return (
                  <tr key={m.id}>
                    <td className="principal">
                      <Link href={`/formador/material/${m.id}`} style={{ color: "var(--text)" }}>
                        {m.estado === "creando" ? T.biblioteca.creando : m.titulo}
                      </Link>
                    </td>
                    <td>{tipoMaterial(m.formato, m.estilo)}</td>
                    <td>{m.temas.map((x) => `Tema ${x.numero}`).join(", ")}</td>
                    <td>{grupos.length ? grupos.join(", ") : <span className="texto-3">{M.noCompartido}</span>}</td>
                    <td className="cifras">{fechaCorta(m.creadoAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
