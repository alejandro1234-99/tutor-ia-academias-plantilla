"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";

// A7 · Creando… Barra de progreso con lo que está haciendo. Se puede salir.
export function EsperaMaterial({ id, progresoInicial, pasoInicial }: { id: string; progresoInicial: number; pasoInicial: string | null }) {
  const router = useRouter();
  const [progreso, setProgreso] = useState(progresoInicial);
  const [paso, setPaso] = useState(pasoInicial);

  useEffect(() => {
    let vivo = true;
    const mirar = async () => {
      try {
        const r = await fetch(`/api/material/${id}/estado`, { cache: "no-store" });
        const j = await r.json();
        if (!vivo) return;
        if (j.estado && j.estado !== "creando") {
          router.refresh();
          return;
        }
        setProgreso(j.progreso ?? 0);
        setPaso(j.paso ?? null);
      } catch {}
      if (vivo) setTimeout(mirar, 1800);
    };
    const id0 = setTimeout(mirar, 1200);
    return () => {
      vivo = false;
      clearTimeout(id0);
    };
  }, [id, router]);

  const pasos = [
    { texto: T.material.leyendo, hecho: progreso >= 20 },
    { texto: T.material.buscando, hecho: progreso >= 25 },
    { texto: paso && progreso >= 25 ? paso : "…", hecho: false },
  ];
  return (
    <div className="creando" role="status" aria-live="polite">
      <div className="fila separar">
        <strong>{T.material.creandoTitulo}</strong>
        <span className="texto-3 cifras" style={{ fontSize: 13 }}>
          {progreso} %
        </span>
      </div>
      <div className="barra-progreso">
        <span style={{ width: `${Math.max(4, progreso)}%` }} />
      </div>
      <div className="pila hueco-8">
        {pasos.map((p, i) => (
          <span key={i} className={`paso-creando${p.hecho ? " hecho" : ""}`}>
            {p.hecho ? <Icono nombre="bien" tam={16} /> : <span className="girando" />}
            {p.texto}
          </span>
        ))}
      </div>
      <span className="texto-3" style={{ fontSize: 13 }}>
        {T.material.puedesSalir}
      </span>
    </div>
  );
}
