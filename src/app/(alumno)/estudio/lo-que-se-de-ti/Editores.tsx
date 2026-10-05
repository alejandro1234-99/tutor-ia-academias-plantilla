"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { borrarNota, borrarTodasLasNotas, corregirNota, guardarPerfil } from "./acciones";

type Perfil = { comoLlamar: string; repite: boolean | null; horasDia: string | null; dificultad: string | null };

export function EditorPerfil({ inicial }: { inicial: Perfil }) {
  const [p, setP] = useState(inicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const L = T.loQueSe;
  const PV = T.primeraVez;
  return (
    <section className="tarjeta pila hueco-16" style={{ marginBottom: 32 }}>
      <h2 className="antetitulo">{L.perfil}</h2>
      <div className="campo">
        <label htmlFor="llamar">{L.comoLlamar}</label>
        <input id="llamar" type="text" maxLength={40} value={p.comoLlamar} onChange={(e) => setP({ ...p, comoLlamar: e.target.value })} />
      </div>
      <div className="campo">
        <label htmlFor="repite">{L.repite}</label>
        <select id="repite" value={p.repite === null ? "" : p.repite ? "si" : "no"} onChange={(e) => setP({ ...p, repite: e.target.value === "" ? null : e.target.value === "si" })}>
          <option value="">—</option>
          <option value="no">{L.no}</option>
          <option value="si">{L.si}</option>
        </select>
      </div>
      <div className="campo">
        <label htmlFor="horas">{L.horas}</label>
        <select id="horas" value={p.horasDia ?? ""} onChange={(e) => setP({ ...p, horasDia: e.target.value || null })}>
          <option value="">—</option>
          {Object.entries(PV.horas).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="dificultad">{L.dificultad}</label>
        <select id="dificultad" value={p.dificultad ?? ""} onChange={(e) => setP({ ...p, dificultad: e.target.value || null })}>
          <option value="">—</option>
          {Object.entries(PV.dificultad).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="fila hueco-12 envolver">
        <button
          type="button"
          className="boton boton-principal"
          disabled={pendiente}
          onClick={() =>
            empezar(async () => {
              const r = await guardarPerfil(p);
              setAviso(r.ok ? t(L.perfilGuardado) : T.comun.errorGenerico);
            })
          }
        >
          {L.guardarPerfil}
        </button>
        {aviso ? (
          <span role="status" className="texto-2" style={{ fontSize: 14 }}>
            {aviso}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function Nota({ id, tipo, texto }: { id: string; tipo: string; texto: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(texto);
  const [pendiente, empezar] = useTransition();
  const L = T.loQueSe;
  return (
    <div className="elemento-biblio">
      <div className="pila rellenar hueco-4">
        <span className="meta">{L.tipos[tipo as keyof typeof L.tipos] ?? tipo}</span>
        {editando ? (
          <form
            className="fila hueco-8 envolver"
            onSubmit={(e) => {
              e.preventDefault();
              empezar(async () => {
                await corregirNota(id, valor);
                setEditando(false);
                router.refresh();
              });
            }}
          >
            <label htmlFor={`nota-${id}`} className="solo-lector">
              {L.corregir}
            </label>
            <input id={`nota-${id}`} className="entrada rellenar" style={{ height: 44 }} value={valor} maxLength={300} autoFocus onChange={(e) => setValor(e.target.value)} />
            <button className="boton boton-principal boton-peq" disabled={pendiente}>
              {T.comun.guardar}
            </button>
            <button type="button" className="boton boton-peq" onClick={() => setEditando(false)}>
              {T.comun.cancelar}
            </button>
          </form>
        ) : (
          <span style={{ fontSize: 17 }}>{texto}</span>
        )}
      </div>
      {editando ? null : (
        <div className="fila hueco-4">
          <button type="button" className="boton-icono" aria-label={`${L.corregir}: ${texto}`} onClick={() => setEditando(true)}>
            <Icono nombre="lapiz" tam={18} />
          </button>
          <button
            type="button"
            className="boton-icono"
            aria-label={`${L.borrar}: ${texto}`}
            disabled={pendiente}
            onClick={() =>
              empezar(async () => {
                await borrarNota(id);
                router.refresh();
              })
            }
          >
            <Icono nombre="papelera" tam={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export function NotasMemoria({ notas }: { notas: { id: string; tipo: string; texto: string }[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const L = T.loQueSe;
  return (
    <section className="pila">
      <div className="fila separar" style={{ marginBottom: 8 }}>
        <h2 className="antetitulo">{L.notas}</h2>
        {notas.length ? (
          <button
            type="button"
            className="boton boton-peq boton-peligro"
            disabled={pendiente}
            onClick={() => {
              if (!confirm(L.borrarTodoConfirmar)) return;
              empezar(async () => {
                await borrarTodasLasNotas();
                router.refresh();
              });
            }}
          >
            <Icono nombre="papelera" tam={16} />
            {L.borrarTodo}
          </button>
        ) : null}
      </div>
      {notas.length === 0 ? (
        <p className="texto-2" style={{ padding: "16px 0" }}>
          {L.vacio}
        </p>
      ) : (
        notas.map((n) => <Nota key={n.id} {...n} />)
      )}
    </section>
  );
}
