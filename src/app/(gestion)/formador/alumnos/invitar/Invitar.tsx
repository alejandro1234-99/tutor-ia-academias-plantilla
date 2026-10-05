"use client";

import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import type { FilaLista } from "@/servidor/alumnos";
import { invitarLista, invitarUno, revisarLista } from "../acciones";

export function Invitar({ grupos, modoInicial }: { grupos: { id: string; nombre: string }[]; modoInicial: "uno" | "lista" }) {
  const [modo, setModo] = useState(modoInicial);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? "");
  const [filas, setFilas] = useState<FilaLista[] | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "bien" | "error"; texto: string } | null>(null);
  const [pendiente, empezar] = useTransition();
  const A = T.alumnos;
  const malas = filas?.filter((f) => f.errores.length).length ?? 0;

  return (
    <div className="pila hueco-24">
      <div className="selector" role="group" style={{ alignSelf: "flex-start" }}>
        <button type="button" aria-pressed={modo === "uno"} onClick={() => setModo("uno")}>
          {A.uno}
        </button>
        <button type="button" aria-pressed={modo === "lista"} onClick={() => setModo("lista")}>
          {A.lista}
        </button>
      </div>

      {aviso ? (
        <div className={`aviso ${aviso.tipo}`} role="status">
          <span className="icono-aviso">
            <Icono nombre={aviso.tipo === "bien" ? "bien" : "atencion"} />
          </span>
          <span className="texto-aviso">{aviso.texto}</span>
        </div>
      ) : null}

      {modo === "uno" ? (
        <form
          className="pila hueco-16"
          style={{ maxWidth: 520 }}
          onSubmit={(e) => {
            e.preventDefault();
            setAviso(null);
            empezar(async () => {
              const r = await invitarUno({ nombre, correo, grupoId });
              if (r.error) setAviso({ tipo: "error", texto: r.error });
              else {
                setAviso({ tipo: "bien", texto: t(A.enviada, { correo }) });
                setNombre("");
                setCorreo("");
              }
            });
          }}
        >
          <div className="campo">
            <label htmlFor="nombre">{A.nombre}</label>
            <input id="nombre" type="text" required maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="correo">{A.correo}</label>
            <input id="correo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="grupo">{A.grupo}</label>
            <select id="grupo" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>
          <button className="boton boton-principal" style={{ alignSelf: "flex-start" }} disabled={pendiente}>
            <Icono nombre="correo" tam={18} />
            {A.enviar}
          </button>
        </form>
      ) : (
        <div className="pila hueco-16">
          <form
            className="pila hueco-12"
            onChange={(e) => {
              const form = e.currentTarget;
              setAviso(null);
              empezar(async () => {
                const r = await revisarLista(new FormData(form));
                if (r.error) {
                  setFilas(null);
                  setAviso({ tipo: "error", texto: r.error });
                } else setFilas(r.filas ?? null);
              });
            }}
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="lista" className="etiqueta">
              {A.subirLista}
            </label>
            <input id="lista" name="lista" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
            <a href="/api/alumnos/plantilla" style={{ fontSize: 14 }}>
              {A.plantilla}
            </a>
          </form>
          {filas ? (
            <section className="pila hueco-12">
              <h2 className="antetitulo">{A.vistaPrevia}</h2>
              <div className={`aviso ${malas ? "error" : "bien"}`}>
                <span className="texto-aviso">{malas ? t(A.filasMal, { n: malas }) : t(A.filasBien, { n: filas.length })}</span>
              </div>
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{A.nombre}</th>
                      <th>{A.correo}</th>
                      <th>{A.grupo}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.fila} className={f.errores.length ? "con-error" : ""}>
                        <td className="cifras">{f.fila}</td>
                        <td className="principal">{f.nombre || "—"}</td>
                        <td>{f.correo || "—"}</td>
                        <td>{f.grupo || "—"}</td>
                        <td style={{ color: "var(--err)", fontSize: 14 }}>{f.errores.join(". ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="boton boton-principal"
                style={{ alignSelf: "flex-start" }}
                disabled={pendiente || malas > 0 || filas.length === 0}
                onClick={() =>
                  empezar(async () => {
                    const r = await invitarLista(filas.map((f) => ({ nombre: f.nombre, correo: f.correo, grupo: f.grupo })));
                    if (r.filas) {
                      setFilas(r.filas);
                      setAviso({ tipo: "error", texto: r.error ?? T.comun.errorGenerico });
                    } else {
                      setFilas(null);
                      setAviso({ tipo: "bien", texto: t(A.enviadas, { n: r.n ?? 0 }) });
                    }
                  })
                }
              >
                <Icono nombre="correo" tam={18} />
                {t(A.enviarLista, { n: filas.length })}
              </button>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
