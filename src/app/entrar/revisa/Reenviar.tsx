"use client";

import { useEffect, useState, useTransition } from "react";
import { T, t } from "@/textos";
import { accionReenviar } from "../acciones";

// Botón para reenviar el enlace, que se activa a los 60 segundos.
export function Reenviar({ correo }: { correo: string }) {
  const [quedan, setQuedan] = useState(60);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  useEffect(() => {
    if (quedan <= 0) return;
    const id = setTimeout(() => setQuedan((q) => q - 1), 1000);
    return () => clearTimeout(id);
  }, [quedan]);

  return (
    <div className="pila hueco-8">
      <button
        type="button"
        className="boton boton-ancho"
        disabled={quedan > 0 || pendiente || !correo}
        onClick={() =>
          empezar(async () => {
            const r = await accionReenviar(correo);
            setMensaje(r.ok ? T.entrar.reenviado : r.error || T.comun.errorGenerico);
            setQuedan(60);
          })
        }
      >
        {quedan > 0 ? t(T.entrar.reenviarEn, { n: quedan }) : T.entrar.reenviar}
      </button>
      {mensaje ? (
        <p role="status" className="texto-2" style={{ fontSize: 14 }}>
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
