"use client";

import { useState, useTransition } from "react";
import { T } from "@/textos";
import { guardarCompartir } from "../acciones";

export function Compartir({ materialId, grupos, compartido }: { materialId: string; grupos: { id: string; nombre: string }[]; compartido: string[] }) {
  const [elegidos, setElegidos] = useState(compartido);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const M = T.materialClase;
  return (
    <section className="tarjeta pila hueco-12" style={{ marginTop: 24 }}>
      <h2 className="antetitulo">{M.compartir}</h2>
      <div className="fila hueco-16 envolver">
        {grupos.map((g) => (
          <label key={g.id} className="casilla">
            <input
              type="checkbox"
              checked={elegidos.includes(g.id)}
              onChange={(e) => setElegidos(e.target.checked ? [...elegidos, g.id] : elegidos.filter((x) => x !== g.id))}
            />
            <span>{g.nombre}</span>
          </label>
        ))}
      </div>
      <div className="fila hueco-12">
        <button
          type="button"
          className="boton boton-principal boton-peq"
          disabled={pendiente}
          onClick={() =>
            empezar(async () => {
              await guardarCompartir(materialId, elegidos);
              setAviso(M.compartidoOk);
            })
          }
        >
          {M.guardarCompartir}
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
