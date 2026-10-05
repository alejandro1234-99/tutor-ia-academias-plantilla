import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/configuracion";
import { Icono } from "@/componentes/Icono";
import { ProgresoVersion } from "@/componentes/gestion/ProgresoVersion";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { LIMITE_PAGINAS_ACADEMIA } from "@/servidor/temario";
import { fechaCorta } from "@/servidor/materiales";
import { T, t } from "@/textos";

export const metadata: Metadata = { title: T.temario.titulo };

// F1 · Temario
export default async function PaginaTemario() {
  const { s } = await exigirGestion("formador", "dueno");
  const d = await conSesion(s, async (tx) => {
    const oposiciones = await tx`select id, nombre from oposiciones where id = any(academia.mis_oposiciones_gestion()) order by orden`;
    const temas = await tx`
      select t.id, t.oposicion_id, t.numero, t.nombre, coalesce(t.nombre_corto, t.nombre) as corto,
             v.id as version_id, v.version, v.paginas, v.subida_at, v.lista_at, v.subida_por_nombre, v.estado,
             (select row_to_json(u) from (select id, estado, progreso, error, version from tema_versiones w
                where w.tema_id = t.id and w.estado in ('subiendo', 'procesando', 'error') and w.subida_at > coalesce(v.subida_at, 'epoch')
                order by w.subida_at desc limit 1) u) as en_curso,
             (select count(*)::int from notas_formador n where n.tema_id = t.id and n.retirada_at is null) as notas
      from temas t left join tema_versiones v on v.id = t.version_actual_id
      where t.oposicion_id = any(academia.mis_oposiciones_gestion())
      order by t.numero`;
    const total = await tx`
      select coalesce(sum(v.paginas), 0)::int as n from temas t join tema_versiones v on v.id = t.version_actual_id`;
    return { oposiciones, temas, total: Number(total[0].n) };
  });
  const T2 = T.temario;
  const hayListo = d.temas.some((x) => x.versionId);
  return (
    <main className="pagina">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{T2.titulo}</h1>
          <p className="subtitulo">{t(T2.subtitulo, { asistente: config.asistente.nombre })}</p>
        </div>
        {s.soporte ? null : (
          <Link href="/formador/temario/subir" className="boton boton-principal">
            <Icono nombre="subir" tam={18} />
            {T2.subir}
          </Link>
        )}
      </div>
      {!hayListo ? (
        <div className="aviso atencion" style={{ marginBottom: 24 }}>
          <span className="icono-aviso">
            <Icono nombre="atencion" />
          </span>
          <span className="texto-aviso">{T2.avisoSinTemario}</span>
        </div>
      ) : null}
      {d.oposiciones.map((o) => {
        const temas = d.temas.filter((x) => x.oposicionId === o.id);
        return (
          <section key={o.id as string} className="pila hueco-16" style={{ marginBottom: 40 }}>
            <h2 className="titulo-seccion">{o.nombre as string}</h2>
            {temas.length === 0 ? (
              <div className="vacio">
                <span className="circulo">
                  <Icono nombre="documento" tam={30} />
                </span>
                <h2>{T2.vacio}</h2>
                <p>{T2.vacioTexto}</p>
                {s.soporte ? null : (
                  <Link href="/formador/temario/subir" className="boton boton-principal">
                    {T2.subir}
                  </Link>
                )}
              </div>
            ) : (
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>{T2.columnas.tema}</th>
                      <th>{T2.columnas.paginas}</th>
                      <th>{T2.columnas.version}</th>
                      <th>{T2.columnas.actualizado}</th>
                      <th>{T2.columnas.por}</th>
                      <th>{T2.columnas.estado}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {temas.map((x) => {
                      const enCurso = x.enCurso as { id: string; estado: string; progreso: number; error: string | null; version: number } | null;
                      return (
                        <tr key={x.id as string}>
                          <td className="principal">
                            <Link href={`/formador/temario/${x.id}`} style={{ color: "var(--text)" }}>
                              Tema {x.numero as number} · {x.nombre as string}
                            </Link>
                            {(x.notas as number) > 0 ? (
                              <span className="texto-3" style={{ display: "block", fontSize: 13, fontWeight: 400 }}>
                                {x.notas as number} {(x.notas as number) === 1 ? T2.nota.toLowerCase() : T2.notas.toLowerCase()}
                              </span>
                            ) : null}
                          </td>
                          <td className="cifras">{x.paginas ?? "—"}</td>
                          <td className="cifras">{x.version ? t(T2.version, { n: x.version as number }) : "—"}</td>
                          <td className="cifras">{x.listaAt ? fechaCorta(new Date(x.listaAt as string).toISOString()) : "—"}</td>
                          <td>{(x.subidaPorNombre as string) ?? "—"}</td>
                          <td>
                            {enCurso ? (
                              enCurso.estado === "error" ? (
                                <span className="pastilla error" title={enCurso.error ?? ""}>
                                  {T2.estados.error}: {enCurso.error}
                                </span>
                              ) : (
                                <ProgresoVersion versionId={enCurso.id} inicial={enCurso.progreso} />
                              )
                            ) : x.versionId ? (
                              <span className="pastilla bien">{T2.estados.lista}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {x.versionId ? (
                              <Link href={`/formador/temario/ver/${x.versionId}/1`} className="boton boton-mini" style={{ marginRight: 8 }}>
                                {T2.ver}
                              </Link>
                            ) : null}
                            {s.soporte ? null : (
                              <Link href={`/formador/temario/subir?tema=${x.id}`} className="boton boton-mini">
                                {T2.sustituir}
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
      <p className="texto-3" style={{ fontSize: 13 }}>
        {t(T2.total, { n: d.total, max: LIMITE_PAGINAS_ACADEMIA })}
      </p>
    </main>
  );
}
