"use client";

import { useState, useTransition } from "react";
import { adelantarUnDia, consumoAcademia, diasSinEntrar, gastarPreguntas, interruptorFalloIA, lanzarAvisos, racha } from "./acciones";

export function Palancas({ falloIA }: { falloIA: boolean }) {
  const [correo, setCorreo] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [, empezar] = useTransition();
  const hacer = (texto: string, fn: () => Promise<unknown>) =>
    empezar(async () => {
      const r = await fn();
      setLog((l) => [`${new Date().toLocaleTimeString("es-ES")} · ${texto}${r && typeof r === "object" ? " → " + JSON.stringify(r) : ""}`, ...l]);
    });
  return (
    <div className="pila hueco-20">
      <label className="tarjeta fila separar">
        <span>Hacer fallar la IA a propósito (capa 1.5)</span>
        <input type="checkbox" className="interruptor" defaultChecked={falloIA} onChange={(e) => hacer(`Fallo de IA ${e.target.checked ? "encendido" : "apagado"}`, () => interruptorFalloIA(e.target.checked))} />
      </label>
      <div className="tarjeta pila hueco-12">
        <div className="campo">
          <label htmlFor="correo-prueba">Correo de la persona de prueba</label>
          <input id="correo-prueba" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="lucia@…" />
        </div>
        <div className="fila hueco-8 envolver">
          <button className="boton boton-peq" onClick={() => hacer("24 preguntas gastadas hoy", () => gastarPreguntas(correo, 24))}>
            Dejarle con 24 preguntas gastadas hoy
          </button>
          <button className="boton boton-peq" onClick={() => hacer("Reloj adelantado un día", () => adelantarUnDia(correo))}>
            Adelantar su reloj un día
          </button>
          <button className="boton boton-peq" onClick={() => hacer("5 días sin entrar", () => diasSinEntrar(correo, 5))}>
            Dejarle 5 días sin entrar
          </button>
          <button className="boton boton-peq" onClick={() => hacer("Racha de 3 días", () => racha(correo, 3, false))}>
            Racha de 3 días seguidos
          </button>
          <button className="boton boton-peq" onClick={() => hacer("Racha con un día perdido", () => racha(correo, 3, true))}>
            Quitarle un día en medio
          </button>
        </div>
      </div>
      <div className="fila hueco-8 envolver">
        <button className="boton boton-peq" onClick={() => hacer("Consumo de la academia al 80 %", () => consumoAcademia(80))}>
          Poner el consumo de la academia al 80 %
        </button>
        <button className="boton boton-principal boton-peq" onClick={() => hacer("Revisión de avisos lanzada", () => lanzarAvisos())}>
          Lanzar la revisión de avisos
        </button>
      </div>
      <pre className="tarjeta" style={{ fontSize: 12, whiteSpace: "pre-wrap", minHeight: 80 }}>{log.join("\n")}</pre>
    </div>
  );
}
