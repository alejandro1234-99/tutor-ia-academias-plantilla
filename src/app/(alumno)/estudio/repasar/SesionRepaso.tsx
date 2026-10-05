"use client";

import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { EnLinea } from "@/componentes/TextoRico";
import { ChipCitaMaterial, textoCitaMaterial } from "@/componentes/material/VistaContenido";
import { T, t } from "@/textos";
import type { ElementoRepaso } from "@/servidor/repaso";
import { cuantasManana, marcarPregunta, marcarTarjeta } from "./acciones";

const LETRAS = ["A", "B", "C", "D"];

export function SesionRepaso({ elementos }: { elementos: ElementoRepaso[] }) {
  const [cola, setCola] = useState(elementos);
  const [hechas, setHechas] = useState(0);
  const [girada, setGirada] = useState(false);
  const [elegida, setElegida] = useState<number | null>(null);
  const [comprobada, setComprobada] = useState(false);
  const [manana, setManana] = useState<number | null>(null);
  const [, empezar] = useTransition();
  const total = elementos.length;
  const e = cola[0];

  const avanzar = (repetir: boolean) => {
    setGirada(false);
    setElegida(null);
    setComprobada(false);
    setHechas((h) => h + (repetir ? 0 : 1));
    setCola((c) => {
      const resto = c.slice(1);
      const nueva = repetir ? [...resto, c[0]] : resto;
      if (nueva.length === 0) empezar(async () => setManana(await cuantasManana()));
      return nueva;
    });
  };

  if (!e) {
    return (
      <div className="vacio" role="status">
        <span className="circulo">
          <Icono nombre="bien" tam={30} />
        </span>
        <h2>{T.repasar.terminado}</h2>
        <p>{t(T.repasar.terminadoTexto, { n: total, m: manana ?? "…" })}</p>
      </div>
    );
  }

  const vuelta = "/estudio/repasar";
  if (e.tipo === "tarjeta") {
    return (
      <div className="pila hueco-16">
        <button type="button" className={`tarjeta-repaso${girada ? " girada" : ""}`} onClick={() => setGirada(!girada)} aria-pressed={girada} style={{ minHeight: 340 }}>
          <div className="giro" style={{ minHeight: 340 }}>
            <div className="cara">
              <span className="antetitulo">{t(T.material.preguntaN, { n: Math.min(hechas + 1, total), total })}</span>
              <span className="pregunta-t">{e.pregunta}</span>
              <span className="texto-3 fila hueco-8" style={{ marginTop: "auto", fontSize: 13 }}>
                <Icono nombre="girar" tam={16} />
                {T.material.tocaGirar}
              </span>
            </div>
            <div className="cara detras">
              <span className="antetitulo">
                {T.material.respuesta}
                {e.literal ? ` · ${T.material.literal}` : ""}
              </span>
              {e.literal && e.dato ? <span className="dato">{e.dato}</span> : null}
              <span className={e.literal && e.dato ? "explica" : "pregunta-t"}>
                <EnLinea texto={e.respuesta} />
              </span>
              <span style={{ marginTop: "auto", fontSize: 13, color: "var(--ink)" }}>↳ {textoCitaMaterial(e.cita, e.temas)}</span>
            </div>
          </div>
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            type="button"
            className="boton boton-grande"
            onClick={() => {
              empezar(() => marcarTarjeta(e.materialId, e.indice, false));
              avanzar(true);
            }}
          >
            {T.repasar.no_la_sabia}
          </button>
          <button
            type="button"
            className="boton boton-principal boton-grande"
            onClick={() => {
              empezar(() => marcarTarjeta(e.materialId, e.indice, true));
              avanzar(false);
            }}
          >
            {T.repasar.la_sabia}
          </button>
        </div>
      </div>
    );
  }

  const acierto = elegida === e.correcta;
  return (
    <div className="pila hueco-16">
      <span className="antetitulo">{T.repasar.preguntaFallada}</span>
      <h2 className="enunciado">{e.enunciado}</h2>
      <div className="pila hueco-12">
        {e.opciones.map((o, i) => (
          <button
            key={i}
            type="button"
            disabled={comprobada}
            className={`opcion-test${comprobada && i === e.correcta ? " correcta" : ""}${comprobada && i === elegida && !acierto ? " fallada" : ""}`}
            aria-pressed={elegida === i}
            onClick={() => setElegida(i)}
          >
            <span className="letra">{LETRAS[i]}</span>
            <span>{o}</span>
          </button>
        ))}
      </div>
      {comprobada ? (
        <div className={`aviso ${acierto ? "bien" : "atencion"}`} role="status">
          <span className="icono-aviso">
            <Icono nombre={acierto ? "bien" : "atencion"} />
          </span>
          <span className="texto-aviso">
            <strong>{acierto ? T.repasar.bien : T.repasar.mal}</strong> {e.justificacion}
          </span>
        </div>
      ) : null}
      {comprobada ? <ChipCitaMaterial cita={e.cita} temas={e.temas} vuelta={vuelta} /> : null}
      {comprobada ? (
        <button type="button" className="boton boton-principal boton-grande" onClick={() => avanzar(false)}>
          {T.repasar.siguiente}
          <Icono nombre="flechaDerecha" tam={18} />
        </button>
      ) : (
        <button
          type="button"
          className="boton boton-principal boton-grande"
          disabled={elegida === null}
          onClick={() => {
            setComprobada(true);
            empezar(() => marcarPregunta(e.materialId, e.indice, elegida === e.correcta));
          }}
        >
          {T.repasar.comprobar}
        </button>
      )}
    </div>
  );
}
