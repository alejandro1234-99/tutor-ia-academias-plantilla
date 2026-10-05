import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/componentes/Icono";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { oposicionDe, temasDe } from "@/servidor/alumno";
import { fechaCorta, listarMateriales, type MaterialVista } from "@/servidor/materiales";
import { T } from "@/textos";
import { tipoMaterial } from "@/tipos/material";
import { MenuCarpeta, NuevaCarpeta } from "./Carpetas";

export const metadata: Metadata = { title: T.biblioteca.titulo };

const PESTANAS = {
  resumenes: ["resumen"],
  esquemas: ["esquema"],
  presentaciones: ["presentacion"],
  tarjetas: ["tarjetas"],
  tests: ["test", "simulacro"],
  academia: null,
} as const;
type Pestana = keyof typeof PESTANAS;

function url(p: { tab: Pestana; carpeta?: string | null; temas?: string[]; q?: string }) {
  const u = new URLSearchParams();
  u.set("tab", p.tab);
  if (p.carpeta) u.set("carpeta", p.carpeta);
  if (p.temas?.length) u.set("temas", p.temas.join(","));
  if (p.q) u.set("q", p.q);
  return `/estudio/biblioteca?${u.toString()}`;
}

// A11 · Mi biblioteca
export default async function PaginaBiblioteca({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; carpeta?: string; temas?: string; q?: string; tipo?: string }>;
}) {
  const s = await exigirSesion("alumno");
  const sp = await searchParams;
  const tab: Pestana = sp.tab && sp.tab in PESTANAS ? (sp.tab as Pestana) : sp.tipo === "test" ? "tests" : "resumenes";
  const carpeta = sp.carpeta && /^[0-9a-f-]{36}$/i.test(sp.carpeta) ? sp.carpeta : null;
  const temasFiltro = (sp.temas ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  const q = (sp.q ?? "").trim().slice(0, 80);

  const d = await conSesion(s, async (tx) => {
    const op = await oposicionDe(tx, s.persona.id);
    const temas = op ? await temasDe(tx, op.id) : [];
    const todos = await listarMateriales(tx, s.persona.id);
    const academia = (await listarMateriales(tx, s.persona.id, { deAcademia: true })).filter((m) => m.estado === "listo");
    const carpetas = await tx`select id, nombre from carpetas order by nombre`;
    return { temas, todos, academia, carpetas: carpetas.map((c) => ({ id: c.id as string, nombre: c.nombre as string })) };
  });

  const deLaPestana = (t: Pestana, lista: MaterialVista[]) =>
    t === "academia" ? d.academia : lista.filter((m) => (PESTANAS[t] as readonly string[]).includes(m.formato));
  const filtrar = (lista: MaterialVista[]) =>
    lista.filter(
      (m) =>
        (!carpeta || m.carpetaId === carpeta) &&
        (temasFiltro.length === 0 || m.temaIds.some((x) => temasFiltro.includes(x))) &&
        (!q || m.titulo.toLowerCase().includes(q.toLowerCase())),
    );
  const visibles = filtrar(deLaPestana(tab, d.todos));
  const vacia = d.todos.length === 0 && tab !== "academia";
  const B = T.biblioteca;

  return (
    <main className="pagina">
      <div className="cabecera-pagina">
        <h1 className="titulo-pagina">{B.titulo}</h1>
        <form className="buscador" role="search" style={{ width: "100%", maxWidth: 340 }}>
          <Icono nombre="lupa" />
          <input type="hidden" name="tab" value={tab} />
          {carpeta ? <input type="hidden" name="carpeta" value={carpeta} /> : null}
          <label htmlFor="q" className="solo-lector">
            {B.buscar}
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder={B.buscar} />
        </form>
      </div>

      <nav className="pestanas" aria-label={B.titulo} style={{ marginBottom: 28 }}>
        {(Object.keys(PESTANAS) as Pestana[]).map((p) => {
          const n = deLaPestana(p, d.todos).length;
          return (
            <Link key={p} href={url({ tab: p, carpeta, temas: temasFiltro, q })} className="pestana" aria-current={tab === p ? "page" : undefined}>
              {B.pestanas[p]}
              {n > 0 ? <span className="cuenta">{n}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="biblio">
        <aside className="lateral-biblio pila hueco-24">
          <section className="pila hueco-4">
            <h2 className="antetitulo" style={{ padding: "0 12px 8px" }}>
              {B.carpetas}
            </h2>
            <Link href={url({ tab, temas: temasFiltro, q })} className="carpeta-enlace" aria-current={!carpeta ? "true" : undefined}>
              <Icono nombre="carpeta" tam={17} />
              {B.todo}
              <span className="n">{deLaPestana(tab, d.todos).length}</span>
            </Link>
            {d.carpetas.map((c) => (
              <div key={c.id} className="fila">
                <Link href={url({ tab, carpeta: c.id, temas: temasFiltro, q })} className="carpeta-enlace rellenar" aria-current={carpeta === c.id ? "true" : undefined}>
                  <Icono nombre="carpeta" tam={17} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</span>
                  <span className="n">{deLaPestana(tab, d.todos).filter((m) => m.carpetaId === c.id).length}</span>
                </Link>
                <MenuCarpeta id={c.id} nombre={c.nombre} />
              </div>
            ))}
            <NuevaCarpeta />
          </section>
          {d.temas.length ? (
            <section className="pila hueco-4">
              <h2 className="antetitulo" style={{ padding: "0 12px 8px" }}>
                {B.filtrarTema}
              </h2>
              {d.temas.map((x) => {
                const activo = temasFiltro.includes(x.id);
                const nuevos = activo ? temasFiltro.filter((y) => y !== x.id) : [...temasFiltro, x.id];
                return (
                  <Link key={x.id} href={url({ tab, carpeta, temas: nuevos, q })} className="casilla" style={{ padding: "8px 12px", color: "var(--text-2)", textDecoration: "none" }} aria-pressed={activo}>
                    <input type="checkbox" readOnly checked={activo} tabIndex={-1} aria-hidden="true" />
                    <span>
                      Tema {x.numero} · {x.nombreCorto}
                    </span>
                  </Link>
                );
              })}
            </section>
          ) : null}
        </aside>

        <section>
          {vacia ? (
            <div className="vacio">
              <span className="circulo">
                <Icono nombre="biblioteca" tam={30} />
              </span>
              <h2>{B.vacio}</h2>
              <p>{B.vacioTexto}</p>
              <Link href="/estudio/crear" className="boton boton-principal">
                <Icono nombre="crear" tam={18} />
                {B.crearPrimero}
              </Link>
            </div>
          ) : tab === "academia" && d.academia.length === 0 ? (
            <div className="vacio">
              <span className="circulo">
                <Icono nombre="persona" tam={30} />
              </span>
              <h2>{B.academiaVacio}</h2>
              <p>{B.academiaVacioTexto}</p>
              <Link href="/estudio/crear" className="boton boton-principal">
                <Icono nombre="crear" tam={18} />
                {B.crearMaterial}
              </Link>
            </div>
          ) : visibles.length === 0 ? (
            <p className="texto-2" style={{ padding: "24px 0" }}>
              {B.sinResultados}
            </p>
          ) : (
            <>
              <div className="tabla-envoltura solo-ordenador">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>{B.columnas.material}</th>
                      <th>{B.columnas.tipo}</th>
                      <th>{B.columnas.tema}</th>
                      <th>{B.columnas.creado}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((m) => (
                      <tr key={m.id}>
                        <td className="principal" style={{ maxWidth: 320 }}>
                          <div className="pila hueco-4">
                            <Link href={`/estudio/material/${m.id}`} style={{ color: "var(--text)", fontSize: 17 }}>
                              {m.estado === "creando" ? B.creando : m.titulo}
                            </Link>
                            {m.carpetaId ? (
                              <span className="texto-3 fila hueco-4" style={{ fontSize: 13, fontWeight: 400 }}>
                                <Icono nombre="carpeta" tam={14} />
                                {d.carpetas.find((c) => c.id === m.carpetaId)?.nombre}
                              </span>
                            ) : null}
                            {m.estado === "error" ? <span className="pastilla error" style={{ alignSelf: "flex-start" }}>{B.fallo}</span> : null}
                            {m.actualizado ? (
                              <span className="fila hueco-8">
                                <span className="pastilla atencion">
                                  <Icono nombre="recargar" tam={14} />
                                  {T.material.actualizado}
                                </span>
                                {m.esMio ? (
                                  <Link href={`/estudio/material/${m.id}`} style={{ fontSize: 13 }}>
                                    {T.material.volverACrear}
                                  </Link>
                                ) : null}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>{tipoMaterial(m.formato, m.estilo)}</td>
                        <td>{m.temas.map((x) => `Tema ${x.numero}`).join(", ")}</td>
                        <td className="cifras">{fechaCorta(m.creadoAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="solo-movil">
                {visibles.map((m) => (
                  <div key={m.id} className="elemento-biblio">
                    <div className="pila rellenar hueco-4">
                      <span className="meta">
                        {tipoMaterial(m.formato, m.estilo)} · {m.temas.map((x) => `Tema ${x.numero}`).join(", ")}
                      </span>
                      <Link href={`/estudio/material/${m.id}`} className="titulo">
                        {m.estado === "creando" ? B.creando : m.titulo}
                      </Link>
                      <span className="meta">{fechaCorta(m.creadoAt)}</span>
                      {m.actualizado ? (
                        <span className="pastilla atencion" style={{ alignSelf: "flex-start" }}>
                          <Icono nombre="recargar" tam={14} />
                          {T.material.actualizado}
                        </span>
                      ) : null}
                      {m.estado === "error" ? <span className="pastilla error" style={{ alignSelf: "flex-start" }}>{B.fallo}</span> : null}
                    </div>
                    <Icono nombre="derecha" />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
