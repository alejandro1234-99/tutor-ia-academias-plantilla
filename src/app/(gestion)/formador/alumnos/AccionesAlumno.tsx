"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { cambiarGrupo, darDeBaja, reactivar, reenviarInvitacion } from "./acciones";

export function AccionesAlumno({
  id,
  nombre,
  grupoId,
  grupos,
  baja,
  aceptada,
}: {
  id: string;
  nombre: string;
  grupoId: string;
  grupos: { id: string; nombre: string }[];
  baja: boolean;
  aceptada: boolean;
}) {
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const A = T.alumnos;
  const hacer = (fn: () => Promise<unknown>, texto?: string) =>
    empezar(async () => {
      await fn();
      menu.current?.removeAttribute("open");
      if (texto) setAviso(texto);
      router.refresh();
    });
  return (
    <div className="fila hueco-8">
      {aviso ? (
        <span className="texto-2" style={{ fontSize: 13 }} role="status">
          {aviso}
        </span>
      ) : null}
      <details className="menu-acciones" ref={menu}>
        <summary className="boton-icono" aria-label={`${T.comun.acciones}: ${nombre}`}>
          <Icono nombre="puntos" />
        </summary>
        <div className="lista">
          {baja ? (
            <button type="button" disabled={pendiente} onClick={() => hacer(() => reactivar(id))}>
              <Icono nombre="recargar" tam={16} />
              {A.reactivar}
            </button>
          ) : (
            <>
              {grupos.length > 1 ? (
                <label className="pila hueco-4" style={{ padding: "6px 12px" }}>
                  <span className="texto-3" style={{ fontSize: 12 }}>
                    {A.cambiarGrupo}
                  </span>
                  <select className="entrada" style={{ height: 36, padding: "0 10px" }} value={grupoId} disabled={pendiente} onChange={(e) => hacer(() => cambiarGrupo(id, e.target.value))}>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {!aceptada ? (
                <button type="button" disabled={pendiente} onClick={() => hacer(() => reenviarInvitacion(id), A.reenviada)}>
                  <Icono nombre="correo" tam={16} />
                  {A.reenviar}
                </button>
              ) : null}
              <button
                type="button"
                className="peligro"
                disabled={pendiente}
                onClick={() => {
                  if (!confirm(t(A.bajaConfirmar, { nombre }))) return;
                  hacer(() => darDeBaja(id));
                }}
              >
                <Icono nombre="papelera" tam={16} />
                {A.darDeBaja}
              </button>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
