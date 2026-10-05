"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";
import { borrarCarpeta, crearCarpeta, renombrarCarpeta } from "@/servidor/acciones/material";

export function NuevaCarpeta() {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [pendiente, empezar] = useTransition();
  if (!abierta) {
    return (
      <button type="button" className="carpeta-enlace" style={{ color: "var(--ink)" }} onClick={() => setAbierta(true)}>
        <Icono nombre="mas" tam={17} />
        {T.biblioteca.nuevaCarpeta}
      </button>
    );
  }
  return (
    <form
      className="pila hueco-8"
      style={{ padding: "6px 0" }}
      onSubmit={(e) => {
        e.preventDefault();
        empezar(async () => {
          await crearCarpeta(nombre);
          setNombre("");
          setAbierta(false);
          router.refresh();
        });
      }}
    >
      <label htmlFor="nueva-carpeta" className="solo-lector">
        {T.biblioteca.nombreCarpeta}
      </label>
      <input id="nueva-carpeta" className="entrada" style={{ height: 40 }} placeholder={T.biblioteca.nombreCarpeta} value={nombre} maxLength={80} autoFocus onChange={(e) => setNombre(e.target.value)} />
      <div className="fila hueco-8">
        <button className="boton boton-principal boton-mini" disabled={pendiente || !nombre.trim()}>
          {T.comun.guardar}
        </button>
        <button type="button" className="boton boton-mini" onClick={() => setAbierta(false)}>
          {T.comun.cancelar}
        </button>
      </div>
    </form>
  );
}

export function MenuCarpeta({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  return (
    <details className="menu-acciones">
      <summary className="boton-icono" style={{ width: 32, height: 32 }} aria-label={`${T.comun.acciones}: ${nombre}`}>
        <Icono nombre="puntos" tam={16} />
      </summary>
      <div className="lista">
        <button
          type="button"
          disabled={pendiente}
          onClick={() => {
            const nuevo = prompt(T.biblioteca.renombrarCarpeta, nombre);
            if (!nuevo) return;
            empezar(async () => {
              await renombrarCarpeta(id, nuevo);
              router.refresh();
            });
          }}
        >
          <Icono nombre="lapiz" tam={16} />
          {T.biblioteca.renombrarCarpeta}
        </button>
        <button
          type="button"
          className="peligro"
          disabled={pendiente}
          onClick={() => {
            if (!confirm(T.biblioteca.borrarCarpetaConfirmar)) return;
            empezar(async () => {
              await borrarCarpeta(id);
              router.push("/estudio/biblioteca");
            });
          }}
        >
          <Icono nombre="papelera" tam={16} />
          {T.biblioteca.borrarCarpeta}
        </button>
      </div>
    </details>
  );
}
