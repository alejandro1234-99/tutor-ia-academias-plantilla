"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { asignarGrupos, invitarFormador, marcarmeFormador, quitarFormador } from "../acciones";

type Persona = { id: string; nombre: string; correo: string; esDueno: boolean; esFormador: boolean; pendiente: boolean; grupos: string[] };

function Fila({ p, yo, grupos, soloLectura }: { p: Persona; yo: string; grupos: { id: string; nombre: string }[]; soloLectura: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState(p.grupos);
  const [pendiente, empezar] = useTransition();
  const E = T.ajustes.equipo;
  const esYo = p.id === yo;
  const cambiado = sel.length !== p.grupos.length || sel.some((x) => !p.grupos.includes(x));
  return (
    <div className="tarjeta pila hueco-12">
      <div className="fila separar envolver hueco-8">
        <span className="pila">
          <strong>
            {p.nombre} {esYo ? <span className="pastilla marca">{E.tu}</span> : null}
          </strong>
          <span className="texto-2" style={{ fontSize: 14 }}>
            {p.correo}
            {p.pendiente ? ` · ${T.alumnos.pendiente}` : ""}
          </span>
        </span>
        {soloLectura || esYo || p.esDueno ? null : (
          <button
            type="button"
            className="boton boton-mini boton-peligro"
            disabled={pendiente}
            onClick={() => {
              if (!confirm(t(E.quitarConfirmar, { nombre: p.nombre }))) return;
              empezar(async () => {
                await quitarFormador(p.id);
                router.refresh();
              });
            }}
          >
            {E.quitar}
          </button>
        )}
      </div>
      {esYo ? (
        <label className="casilla">
          <input
            type="checkbox"
            checked={p.esFormador}
            disabled={soloLectura || pendiente}
            onChange={(e) =>
              empezar(async () => {
                await marcarmeFormador(e.target.checked);
                router.refresh();
              })
            }
          />
          <span className="pila">
            <span>{E.yoFormador}</span>
            <span className="ayuda-campo">{E.yoFormadorAyuda}</span>
          </span>
        </label>
      ) : null}
      {p.esFormador ? (
        <div className="pila hueco-8">
          <span className="etiqueta">{E.grupos}</span>
          <div className="fila hueco-16 envolver">
            {grupos.map((g) => (
              <label key={g.id} className="casilla">
                <input type="checkbox" disabled={soloLectura} checked={sel.includes(g.id)} onChange={(e) => setSel(e.target.checked ? [...sel, g.id] : sel.filter((x) => x !== g.id))} />
                <span>{g.nombre}</span>
              </label>
            ))}
          </div>
          {cambiado && !soloLectura ? (
            <button
              type="button"
              className="boton boton-principal boton-mini"
              style={{ alignSelf: "flex-start" }}
              disabled={pendiente}
              onClick={() =>
                empezar(async () => {
                  await asignarGrupos(p.id, sel);
                  router.refresh();
                })
              }
            >
              {E.guardar}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Equipo({ yo, grupos, personas, soloLectura }: { yo: string; grupos: { id: string; nombre: string }[]; personas: Persona[]; soloLectura: boolean }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [aviso, setAviso] = useState<{ tipo: "bien" | "error"; texto: string } | null>(null);
  const [pendiente, empezar] = useTransition();
  const E = T.ajustes.equipo;
  return (
    <div className="pila hueco-24">
      {personas.length <= 1 ? <p className="texto-2">{E.vacio}</p> : null}
      {personas.map((p) => (
        <Fila key={p.id} p={p} yo={yo} grupos={grupos} soloLectura={soloLectura} />
      ))}
      {soloLectura ? null : (
        <form
          className="tarjeta pila hueco-16"
          onSubmit={(e) => {
            e.preventDefault();
            setAviso(null);
            empezar(async () => {
              const r = await invitarFormador({ nombre, correo, grupoIds: sel });
              if (r.error) setAviso({ tipo: "error", texto: r.error });
              else {
                setAviso({ tipo: "bien", texto: E.invitado });
                setNombre("");
                setCorreo("");
                setSel([]);
                router.refresh();
              }
            });
          }}
        >
          <h2 className="antetitulo">{E.invitar}</h2>
          <div className="campo">
            <label htmlFor="f-nombre">{E.nombre}</label>
            <input id="f-nombre" type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f-correo">{E.correo}</label>
            <input id="f-correo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div className="pila hueco-8">
            <span className="etiqueta">{E.grupos}</span>
            <div className="fila hueco-16 envolver">
              {grupos.map((g) => (
                <label key={g.id} className="casilla">
                  <input type="checkbox" checked={sel.includes(g.id)} onChange={(e) => setSel(e.target.checked ? [...sel, g.id] : sel.filter((x) => x !== g.id))} />
                  <span>{g.nombre}</span>
                </label>
              ))}
            </div>
          </div>
          {aviso ? (
            <div className={`aviso ${aviso.tipo}`} role="status">
              <span className="texto-aviso">{aviso.texto}</span>
            </div>
          ) : null}
          <button className="boton boton-principal" style={{ alignSelf: "flex-start" }} disabled={pendiente}>
            <Icono nombre="correo" tam={18} />
            {E.invitar}
          </button>
        </form>
      )}
    </div>
  );
}
