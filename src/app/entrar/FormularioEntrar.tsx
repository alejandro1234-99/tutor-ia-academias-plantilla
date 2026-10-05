"use client";

import { useActionState } from "react";
import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";
import { accionPedirEnlace, type EstadoEntrar } from "./acciones";

export function FormularioEntrar() {
  const [estado, accion, enviando] = useActionState<EstadoEntrar, FormData>(accionPedirEnlace, {});
  return (
    <form action={accion} className="pila hueco-20" noValidate>
      <div className="campo">
        <label htmlFor="correo">{T.entrar.etiquetaCorreo}</label>
        <input
          id="correo"
          name="correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder={T.entrar.ejemploCorreo}
          defaultValue={estado.correo}
          aria-invalid={estado.error ? true : undefined}
          aria-describedby={estado.error ? "error-correo" : undefined}
        />
        {estado.error ? (
          <span id="error-correo" className="error-campo" role="alert">
            <Icono nombre="atencion" tam={15} />
            {estado.error}
          </span>
        ) : null}
      </div>
      <button type="submit" className="boton boton-principal boton-grande boton-ancho" disabled={enviando}>
        {enviando ? T.comun.cargando : T.entrar.boton}
      </button>
    </form>
  );
}
