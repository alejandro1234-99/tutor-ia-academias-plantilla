"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";
import { borrarConversacion, renombrarConversacion } from "../preguntar/acciones";

export function AccionesConversacion({ id, titulo }: { id: string; titulo: string }) {
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(titulo);
  const [pendiente, empezar] = useTransition();

  if (editando) {
    return (
      <form
        className="fila hueco-8"
        onSubmit={(e) => {
          e.preventDefault();
          empezar(async () => {
            await renombrarConversacion(id, nombre);
            setEditando(false);
            router.refresh();
          });
        }}
      >
        <label htmlFor={`n-${id}`} className="solo-lector">
          {T.conversaciones.nuevoNombre}
        </label>
        <input id={`n-${id}`} className="entrada" style={{ height: 40 }} value={nombre} maxLength={80} autoFocus onChange={(e) => setNombre(e.target.value)} />
        <button className="boton boton-principal boton-peq" disabled={pendiente}>
          {T.comun.guardar}
        </button>
        <button type="button" className="boton boton-peq" onClick={() => setEditando(false)}>
          {T.comun.cancelar}
        </button>
      </form>
    );
  }
  return (
    <details className="menu-acciones" ref={menu}>
      <summary className="boton-icono" aria-label={T.comun.acciones}>
        <Icono nombre="puntos" />
      </summary>
      <div className="lista">
        <button
          type="button"
          onClick={() => {
            menu.current?.removeAttribute("open");
            setEditando(true);
          }}
        >
          <Icono nombre="lapiz" tam={17} />
          {T.conversaciones.renombrar}
        </button>
        <button
          type="button"
          className="peligro"
          disabled={pendiente}
          onClick={() => {
            if (!confirm(T.conversaciones.borrarConfirmar)) return;
            empezar(async () => {
              await borrarConversacion(id);
              router.refresh();
            });
          }}
        >
          <Icono nombre="papelera" tam={17} />
          {T.conversaciones.borrar}
        </button>
      </div>
    </details>
  );
}
