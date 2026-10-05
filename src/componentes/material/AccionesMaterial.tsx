"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";
import {
  borrarMaterial,
  moverMaterial,
  regenerarMaterial,
  reintentarMaterial,
  renombrarMaterial,
  valorarMaterial,
} from "@/servidor/acciones/material";

export function AccionesMaterial({
  id,
  titulo,
  esMio,
  estado,
  carpetaId,
  carpetas,
  actualizado,
  valoracion: valoracionInicial,
  alBorrar,
}: {
  id: string;
  titulo: string;
  esMio: boolean;
  estado: "creando" | "listo" | "error";
  carpetaId: string | null;
  carpetas: { id: string; nombre: string }[];
  actualizado: boolean;
  valoracion: "sirvio" | "no_sirvio" | null;
  alBorrar: string;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(titulo);
  const [aviso, setAviso] = useState<string | null>(null);
  const [valoracion, setValoracion] = useState(valoracionInicial);
  const M = T.material;

  const regenerar = () => {
    if (!confirm(M.regenerarConfirmar)) return;
    empezar(async () => {
      const r = await regenerarMaterial(id);
      if (r.limite) setAviso(T.crear.limiteAlumno.replace("{n}", String(r.limite.limite)).replace("{cuando}", r.limite.vuelve));
      router.refresh();
    });
  };

  if (estado === "error" && esMio) {
    return (
      <div className="aviso error" role="alert">
        <span className="icono-aviso">
          <Icono nombre="atencion" />
        </span>
        <span className="texto-aviso">
          <strong>{M.errorTitulo}.</strong> {M.errorTexto}
        </span>
        <button
          type="button"
          className="boton boton-mini"
          disabled={pendiente}
          onClick={() =>
            empezar(async () => {
              await reintentarMaterial(id);
              router.refresh();
            })
          }
        >
          <Icono nombre="recargar" tam={15} />
          {T.comun.reintentar}
        </button>
      </div>
    );
  }
  if (estado !== "listo") return null;

  return (
    <div className="pila hueco-12">
      {actualizado ? (
        <div className="aviso atencion">
          <span className="icono-aviso">
            <Icono nombre="recargar" />
          </span>
          <span className="texto-aviso">{M.actualizadoTexto}</span>
          {esMio ? (
            <button type="button" className="boton boton-mini" onClick={regenerar} disabled={pendiente}>
              {M.volverACrear}
            </button>
          ) : null}
        </div>
      ) : null}
      {editando ? (
        <form
          className="fila hueco-8"
          onSubmit={(e) => {
            e.preventDefault();
            empezar(async () => {
              await renombrarMaterial(id, nombre);
              setEditando(false);
              router.refresh();
            });
          }}
        >
          <label htmlFor="nombre-material" className="solo-lector">
            {M.renombrar}
          </label>
          <input id="nombre-material" className="entrada" style={{ height: 44 }} value={nombre} maxLength={120} autoFocus onChange={(e) => setNombre(e.target.value)} />
          <button className="boton boton-principal boton-peq">{T.comun.guardar}</button>
          <button type="button" className="boton boton-peq" onClick={() => setEditando(false)}>
            {T.comun.cancelar}
          </button>
        </form>
      ) : (
        <div className="fila hueco-8 envolver">
          <a href={`/api/material/${id}/pdf`} className="boton boton-peq">
            <Icono nombre="descargar" tam={16} />
            {M.descargar}
          </a>
          {esMio ? (
            <>
              <button type="button" className="boton boton-peq" onClick={() => setEditando(true)}>
                <Icono nombre="lapiz" tam={16} />
                {M.renombrar}
              </button>
              <label className="boton boton-peq" style={{ gap: 6 }}>
                <Icono nombre="carpeta" tam={16} />
                <span className="solo-lector">{M.mover}</span>
                <select
                  aria-label={M.mover}
                  value={carpetaId ?? ""}
                  onChange={(e) =>
                    empezar(async () => {
                      await moverMaterial(id, e.target.value || null);
                      router.refresh();
                    })
                  }
                  style={{ border: 0, background: "transparent", fontSize: 14, fontWeight: 500, color: "inherit", outline: "none" }}
                >
                  <option value="">{M.sinCarpeta}</option>
                  {carpetas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="boton boton-peq" onClick={regenerar} disabled={pendiente}>
                <Icono nombre="recargar" tam={16} />
                {M.regenerar}
              </button>
              <button
                type="button"
                className="boton boton-peq boton-peligro"
                disabled={pendiente}
                onClick={() => {
                  if (!confirm(M.borrarConfirmar)) return;
                  empezar(async () => {
                    await borrarMaterial(id);
                    router.push(alBorrar);
                  });
                }}
              >
                <Icono nombre="papelera" tam={16} />
                {M.borrar}
              </button>
            </>
          ) : null}
        </div>
      )}
      {aviso ? <p className="error-campo">{aviso}</p> : null}
      {esMio ? (
        <div className="valorar">
          <span className="texto-2" style={{ fontSize: 14 }}>
            {M.sirvio}
          </span>
          {(["sirvio", "no_sirvio"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={valoracion === v}
              onClick={() =>
                empezar(async () => {
                  const nuevo = valoracion === v ? null : v;
                  setValoracion(nuevo);
                  await valorarMaterial(id, nuevo);
                })
              }
            >
              <Icono nombre={v === "sirvio" ? "meGusta" : "noMeGusta"} tam={17} />
              <span>{v === "sirvio" ? T.chat.meSirvio : T.chat.noMeSirvio}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
