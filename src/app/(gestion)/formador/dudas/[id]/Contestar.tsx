"use client";

import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";
import { contestarDuda, marcarResuelta } from "../acciones";

export function Contestar({ id, temaId, temas }: { id: string; temaId: string | null; temas: { id: string; numero: number; nombre: string }[] }) {
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState(false);
  const [tema, setTema] = useState(temaId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const D = T.dudas;
  return (
    <form
      className="pila hueco-16"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        empezar(async () => {
          const r = await contestarDuda({ id, texto, guardarNota: nota, temaId: tema || null });
          if (r?.error) setError(r.error);
        });
      }}
    >
      <div className="campo">
        <label htmlFor="respuesta">{D.tuRespuesta}</label>
        <textarea id="respuesta" value={texto} maxLength={4000} onChange={(e) => setTexto(e.target.value)} required />
        <span className="ayuda-campo">{D.tuRespuestaAyuda}</span>
      </div>
      <label className="casilla">
        <input type="checkbox" checked={nota} onChange={(e) => setNota(e.target.checked)} />
        <span className="pila">
          <span>{D.guardarNota}</span>
          <span className="ayuda-campo">{D.guardarNotaAyuda}</span>
        </span>
      </label>
      {nota ? (
        <div className="campo">
          <label htmlFor="tema-nota">{D.eligeTema}</label>
          <select id="tema-nota" value={tema} onChange={(e) => setTema(e.target.value)}>
            <option value="">—</option>
            {temas.map((x) => (
              <option key={x.id} value={x.id}>
                Tema {x.numero} · {x.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {error ? (
        <span className="error-campo" role="alert">
          <Icono nombre="atencion" tam={15} />
          {error}
        </span>
      ) : null}
      <div className="fila hueco-12 envolver">
        <button className="boton boton-principal" disabled={pendiente || !texto.trim()}>
          <Icono nombre="enviar" tam={18} />
          {D.enviar}
        </button>
        <button type="button" className="boton" disabled={pendiente} title={D.resueltaAyuda} onClick={() => empezar(() => marcarResuelta(id))}>
          <Icono nombre="bien" tam={18} />
          {D.resuelta}
        </button>
      </div>
    </form>
  );
}
