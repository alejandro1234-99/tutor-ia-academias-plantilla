"use client";

import Link from "next/link";
import { useEffect } from "react";
import { T } from "@/textos";

// C5 · Algo ha fallado. Mensaje claro, sin códigos raros.
export default function PantallaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digest: error.digest, pagina: location.pathname }),
    }).catch(() => {});
  }, [error]);
  return (
    <main className="centrado">
      <div className="caja-entrar">
        <div className="pila hueco-12">
          <h1>{T.error.titulo}</h1>
          <p>{T.error.texto}</p>
        </div>
        <div className="pila hueco-10">
          <button type="button" className="boton boton-principal boton-grande boton-ancho" onClick={() => reset()}>
            {T.error.reintentar}
          </button>
          <Link href="/" className="boton boton-ancho">
            {T.error.inicio}
          </Link>
        </div>
      </div>
    </main>
  );
}
