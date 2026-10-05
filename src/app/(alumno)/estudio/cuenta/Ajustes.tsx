"use client";

import { useState, useTransition } from "react";
import { T, t } from "@/textos";
import { borrarMisDatos, guardarPreferencia } from "./acciones";

export function AjustesCuenta({ recordatorio, avisosFormador, tema, dias }: { recordatorio: boolean; avisosFormador: boolean; tema: string; dias: number }) {
  const [r, setR] = useState(recordatorio);
  const [a, setA] = useState(avisosFormador);
  const [tm, setTm] = useState(tema);
  const [, empezar] = useTransition();
  const C = T.cuenta;
  return (
    <>
      <section className="tarjeta pila hueco-16">
        <h2 className="antetitulo">{C.avisos}</h2>
        <label className="fila separar hueco-16" style={{ cursor: "pointer" }}>
          <span>{t(C.recordatorio, { dias })}</span>
          <input
            type="checkbox"
            className="interruptor"
            checked={r}
            onChange={(e) => {
              setR(e.target.checked);
              empezar(() => guardarPreferencia("recordatorio", e.target.checked).then(() => {}));
            }}
          />
        </label>
        <label className="fila separar hueco-16" style={{ cursor: "pointer" }}>
          <span>{C.respuestas}</span>
          <input
            type="checkbox"
            className="interruptor"
            checked={a}
            onChange={(e) => {
              setA(e.target.checked);
              empezar(() => guardarPreferencia("avisos_formador", e.target.checked).then(() => {}));
            }}
          />
        </label>
      </section>
      <section className="tarjeta pila hueco-12">
        <h2 className="antetitulo">{C.apariencia}</h2>
        <div className="selector" role="group" aria-label={C.apariencia}>
          {(["auto", "oscuro", "claro"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={tm === v}
              onClick={() => {
                setTm(v);
                document.documentElement.dataset.tema = v;
                empezar(() => guardarPreferencia("tema_visual", v).then(() => {}));
              }}
            >
              {C.temas[v]}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

export function BorrarDatos({ ayuda }: { ayuda: string }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [pendiente, empezar] = useTransition();
  const C = T.cuenta;
  return (
    <div className="pila hueco-10">
      <div className="pila">
        <strong style={{ color: "var(--err)" }}>{C.borrarDatos}</strong>
        <span className="texto-2" style={{ fontSize: 14 }}>
          {ayuda}
        </span>
      </div>
      {abierto ? (
        <div className="pila hueco-10">
          <p className="texto-2" style={{ fontSize: 14 }}>
            {C.borrarDatosConfirmar}
          </p>
          <div className="campo">
            <label htmlFor="confirmar-borrado">{C.borrarDatosEscribe}</label>
            <input id="confirmar-borrado" type="text" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" />
          </div>
          <div className="fila hueco-10">
            <button
              type="button"
              className="boton boton-peligro"
              disabled={pendiente || texto.trim().toUpperCase() !== "BORRAR"}
              onClick={() => empezar(() => borrarMisDatos(texto).then(() => {}))}
            >
              {C.borrarDatosBoton}
            </button>
            <button type="button" className="boton" onClick={() => setAbierto(false)}>
              {T.comun.cancelar}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="boton boton-peligro boton-peq" style={{ alignSelf: "flex-start" }} onClick={() => setAbierto(true)}>
          {C.borrarDatos}
        </button>
      )}
    </div>
  );
}
