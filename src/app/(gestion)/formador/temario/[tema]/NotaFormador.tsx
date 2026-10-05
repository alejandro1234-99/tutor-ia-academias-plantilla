"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { T } from "@/textos";
import { editarNota, retirarNota } from "../acciones";

export function NotaFormador(p: { id: string; pregunta: string; texto: string; autor: string; fecha: string; retirada: boolean; soloLectura: boolean }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(p.texto);
  const [pendiente, empezar] = useTransition();
  const S = T.temario;
  return (
    <div className="tarjeta pila hueco-10" style={{ opacity: p.retirada ? 0.6 : 1 }}>
      {p.pregunta ? <span className="texto-2" style={{ fontSize: 14 }}>«{p.pregunta}»</span> : null}
      {editando ? (
        <textarea className="entrada" value={texto} maxLength={4000} onChange={(e) => setTexto(e.target.value)} />
      ) : (
        <p style={{ fontSize: 16, lineHeight: 1.6 }}>{p.texto}</p>
      )}
      <div className="fila separar envolver hueco-8">
        <span className="texto-3" style={{ fontSize: 13 }}>
          {p.autor} · {p.fecha} {p.retirada ? `· ${S.retirada}` : ""}
        </span>
        {p.soloLectura || p.retirada ? null : editando ? (
          <span className="fila hueco-8">
            <button
              type="button"
              className="boton boton-principal boton-mini"
              disabled={pendiente}
              onClick={() =>
                empezar(async () => {
                  await editarNota(p.id, texto);
                  setEditando(false);
                  router.refresh();
                })
              }
            >
              {T.comun.guardar}
            </button>
            <button type="button" className="boton boton-mini" onClick={() => setEditando(false)}>
              {T.comun.cancelar}
            </button>
          </span>
        ) : (
          <span className="fila hueco-8">
            <button type="button" className="boton boton-mini" onClick={() => setEditando(true)}>
              {S.editar}
            </button>
            <button
              type="button"
              className="boton boton-mini boton-peligro"
              disabled={pendiente}
              onClick={() => {
                if (!confirm(S.retirarConfirmar)) return;
                empezar(async () => {
                  await retirarNota(p.id);
                  router.refresh();
                });
              }}
            >
              {S.retirar}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
