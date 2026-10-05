"use client";

import { useState, useTransition } from "react";
import { T } from "@/textos";
import { enviarAyuda } from "@/servidor/acciones/ayuda";

export function FormularioAyuda() {
  const [mensaje, setMensaje] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [pendiente, empezar] = useTransition();
  if (enviado) return <div className="aviso bien" role="status"><span className="texto-aviso">{T.ayuda.enviado}</span></div>;
  return (
    <form
      className="pila hueco-12"
      onSubmit={(e) => {
        e.preventDefault();
        // La página desde la que se escribe: la anterior a Ayuda.
        const pagina = document.referrer ? new URL(document.referrer).pathname : location.pathname;
        empezar(async () => {
          const r = await enviarAyuda(mensaje, pagina);
          if (r.ok) setEnviado(true);
        });
      }}
    >
      <div className="campo">
        <label htmlFor="mensaje">{T.ayuda.mensaje}</label>
        <textarea id="mensaje" required maxLength={5000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
      </div>
      <button className="boton boton-principal" style={{ alignSelf: "flex-start" }} disabled={pendiente || !mensaje.trim()}>
        {T.ayuda.enviar}
      </button>
    </form>
  );
}
