"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import type { Filtros, Opciones } from "@/servidor/metricas";

// Filtros de las métricas, en una fila arriba, y el botón de exportar.
export function FiltrosMetricas({ filtros, opciones, esDueno, seccion }: { filtros: Filtros; opciones: Opciones; esDueno: boolean; seccion: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const M = T.metricas;
  const cambiar = (clave: string, valor: string) => {
    const u = new URLSearchParams();
    const f = { periodo: String(filtros.dias), oposicion: filtros.oposicion ?? "", grupo: filtros.grupo ?? "", formador: filtros.formador ?? "", [clave]: valor };
    for (const [k, v] of Object.entries(f)) if (v) u.set(k, v);
    router.push(`${ruta}?${u.toString()}`);
  };
  const qs = new URLSearchParams({ seccion, periodo: String(filtros.dias), ...(filtros.oposicion ? { oposicion: filtros.oposicion } : {}), ...(filtros.grupo ? { grupo: filtros.grupo } : {}), ...(filtros.formador ? { formador: filtros.formador } : {}) });
  return (
    <div className="fila separar envolver hueco-16" style={{ marginBottom: 32 }}>
      <div className="filtros">
        <div className="campo">
          <label htmlFor="f-periodo">{M.periodo}</label>
          <select id="f-periodo" value={filtros.dias} onChange={(e) => cambiar("periodo", e.target.value)}>
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                {t(M.dias, { n: d })}
              </option>
            ))}
          </select>
        </div>
        {esDueno && opciones.oposiciones.length > 1 ? (
          <div className="campo">
            <label htmlFor="f-oposicion">{M.oposicion}</label>
            <select id="f-oposicion" value={filtros.oposicion ?? ""} onChange={(e) => cambiar("oposicion", e.target.value)}>
              <option value="">{M.todas}</option>
              {opciones.oposiciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {opciones.grupos.length > 1 ? (
          <div className="campo">
            <label htmlFor="f-grupo">{M.grupo}</label>
            <select id="f-grupo" value={filtros.grupo ?? ""} onChange={(e) => cambiar("grupo", e.target.value)}>
              <option value="">{M.todos}</option>
              {opciones.grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {esDueno && opciones.formadores.length > 0 ? (
          <div className="campo">
            <label htmlFor="f-formador">{M.formador}</label>
            <select id="f-formador" value={filtros.formador ?? ""} onChange={(e) => cambiar("formador", e.target.value)}>
              <option value="">{M.todos}</option>
              {opciones.formadores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      <a href={`/api/metricas/exportar?${qs.toString()}`} className="boton boton-peq">
        <Icono nombre="descargar" tam={16} />
        {M.exportar}
      </a>
    </div>
  );
}
