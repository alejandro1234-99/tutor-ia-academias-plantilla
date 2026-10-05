"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { T, t } from "@/textos";

// Barra de progreso del procesado de un PDF (se actualiza sola).
export function ProgresoVersion({ versionId, inicial }: { versionId: string; inicial: number }) {
  const router = useRouter();
  const [pct, setPct] = useState(inicial);
  useEffect(() => {
    let vivo = true;
    const mirar = async () => {
      try {
        const r = await fetch(`/api/temario/${versionId}/estado`, { cache: "no-store" });
        const j = await r.json();
        if (!vivo) return;
        if (j.estado === "lista" || j.estado === "error") return router.refresh();
        setPct(j.progreso ?? 0);
      } catch {}
      if (vivo) setTimeout(mirar, 2000);
    };
    const id = setTimeout(mirar, 1500);
    return () => {
      vivo = false;
      clearTimeout(id);
    };
  }, [versionId, router]);
  return (
    <span className="pila hueco-4" style={{ minWidth: 140 }}>
      <span className="texto-2" style={{ fontSize: 13 }}>
        {t(T.temario.estados.procesando, { pct })}
      </span>
      <span className="barra-progreso" style={{ height: 4 }}>
        <span style={{ width: `${Math.max(4, pct)}%` }} />
      </span>
    </span>
  );
}
