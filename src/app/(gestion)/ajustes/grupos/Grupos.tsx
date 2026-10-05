"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { archivarGrupo, crearGrupo, guardarRegla, renombrarGrupo } from "../acciones";

type Oposicion = { id: string; nombre: string; resta: number; segundos: number };
type Grupo = { id: string; nombre: string; oposicionId: string; archivado: boolean; alumnos: number; formadores: string };

function Regla({ o, soloLectura }: { o: Oposicion; soloLectura: boolean }) {
  const [resta, setResta] = useState(String(o.resta));
  const [segundos, setSegundos] = useState(o.segundos);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const G = T.ajustes.grupos;
  return (
    <div className="pila hueco-12">
      <span className="antetitulo">{G.regla}</span>
      <div className="filtros">
        <div className="campo">
          <label htmlFor={`resta-${o.id}`}>{G.resta}</label>
          <select id={`resta-${o.id}`} value={resta} disabled={soloLectura} onChange={(e) => setResta(e.target.value)}>
            {Object.entries(G.restas).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor={`seg-${o.id}`}>{G.segundos}</label>
          <input id={`seg-${o.id}`} type="number" min={10} max={600} value={segundos} disabled={soloLectura} onChange={(e) => setSegundos(Number(e.target.value))} style={{ height: 44, width: 140 }} />
        </div>
        {soloLectura ? null : (
          <button
            type="button"
            className="boton boton-peq"
            disabled={pendiente}
            onClick={() =>
              empezar(async () => {
                const r = await guardarRegla(o.id, Number(resta), segundos);
                setAviso(r.ok ? T.comun.guardado : T.comun.errorGenerico);
              })
            }
          >
            {G.guardarRegla}
          </button>
        )}
        {aviso ? <span className="texto-2" style={{ fontSize: 14 }}>{aviso}</span> : null}
      </div>
    </div>
  );
}

export function Grupos({ oposiciones, grupos, soloLectura }: { oposiciones: Oposicion[]; grupos: Grupo[]; soloLectura: boolean }) {
  const router = useRouter();
  const [nuevo, setNuevo] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const G = T.ajustes.grupos;
  return (
    <div className="pila hueco-32">
      {oposiciones.map((o) => {
        const suyos = grupos.filter((g) => g.oposicionId === o.id);
        return (
          <section key={o.id} className="tarjeta pila hueco-20">
            <h2 className="titulo-seccion">{o.nombre}</h2>
            <Regla o={o} soloLectura={soloLectura} />
            <hr className="linea-sep" />
            {suyos.length === 0 ? <p className="texto-2">{G.vacio}</p> : null}
            {suyos.map((g) => (
              <div key={g.id} className="fila separar envolver hueco-8" style={{ opacity: g.archivado ? 0.55 : 1, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
                <span className="pila">
                  <strong>
                    {g.nombre} {g.archivado ? <span className="pastilla">{G.archivado}</span> : null}
                  </strong>
                  <span className="texto-2" style={{ fontSize: 14 }}>
                    {t(G.alumnos, { n: g.alumnos })} · {g.formadores ? t(G.formadores, { nombres: g.formadores }) : G.sinFormadores}
                  </span>
                </span>
                {soloLectura ? null : (
                  <span className="fila hueco-8">
                    <button
                      type="button"
                      className="boton boton-mini"
                      onClick={() => {
                        const n = prompt(G.renombrar, g.nombre);
                        if (!n) return;
                        empezar(async () => {
                          await renombrarGrupo(g.id, n);
                          router.refresh();
                        });
                      }}
                    >
                      {G.renombrar}
                    </button>
                    <button
                      type="button"
                      className="boton boton-mini"
                      disabled={pendiente}
                      onClick={() => {
                        if (!g.archivado && !confirm(t(G.archivarConfirmar, { nombre: g.nombre }))) return;
                        empezar(async () => {
                          await archivarGrupo(g.id, !g.archivado);
                          router.refresh();
                        });
                      }}
                    >
                      {g.archivado ? G.desarchivar : G.archivar}
                    </button>
                  </span>
                )}
              </div>
            ))}
            {soloLectura ? null : (
              <form
                className="fila hueco-8 envolver"
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  empezar(async () => {
                    const r = await crearGrupo(o.id, nuevo[o.id] ?? "");
                    if (!r.ok) setError(r.error ?? T.comun.errorGenerico);
                    else {
                      setNuevo({ ...nuevo, [o.id]: "" });
                      router.refresh();
                    }
                  });
                }}
              >
                <label htmlFor={`nuevo-${o.id}`} className="solo-lector">
                  {G.nombreGrupo}
                </label>
                <input id={`nuevo-${o.id}`} className="entrada" style={{ height: 44, maxWidth: 280 }} placeholder={G.nombreGrupo} value={nuevo[o.id] ?? ""} onChange={(e) => setNuevo({ ...nuevo, [o.id]: e.target.value })} />
                <button className="boton boton-principal boton-peq" disabled={pendiente}>
                  <Icono nombre="mas" tam={16} />
                  {G.nuevoGrupo}
                </button>
                {error ? <span className="error-campo">{error}</span> : null}
              </form>
            )}
          </section>
        );
      })}
    </div>
  );
}
