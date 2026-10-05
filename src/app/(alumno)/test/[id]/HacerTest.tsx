"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { Marca } from "@/componentes/MarcaCliente";
import { T, t } from "@/textos";
import { terminarTest } from "./acciones";

const LETRAS = ["A", "B", "C", "D"];

function reloj(s: number) {
  const m = Math.floor(Math.max(0, s) / 60);
  const ss = Math.max(0, s) % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function HacerTest({
  materialId,
  intentoId,
  cabecera,
  modo,
  resta,
  segundos,
  preguntas,
}: {
  materialId: string;
  intentoId: string;
  cabecera: string;
  modo: "practica" | "simulacro" | "repaso";
  resta: number;
  segundos: number | null;
  preguntas: { indice: number; enunciado: string; opciones: string[] }[];
}) {
  const [actual, setActual] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, number | null>>({});
  const [blancas, setBlancas] = useState<Set<number>>(new Set());
  const [quedan, setQuedan] = useState(segundos ?? 0);
  const [enviando, empezar] = useTransition();
  const enviado = useRef(false);
  const total = preguntas.length;
  const p = preguntas[actual];
  const respondidas = Object.values(respuestas).filter((x) => x !== null && x !== undefined).length;
  const esSimulacro = modo === "simulacro";

  const terminar = useCallback(
    (forzado = false, extra: Record<string, number | null> = {}, blancasExtra = 0) => {
      if (enviado.current) return;
      const todas = { ...respuestas, ...extra };
      const contestadas = Object.values(todas).filter((x) => x !== null && x !== undefined).length;
      // Las que se han dejado en blanco a propósito no cuentan como «sin contestar».
      const sin = total - contestadas - blancas.size - blancasExtra;
      if (!forzado && sin > 0 && !confirm(t(T.test.terminarConfirmar, { n: sin }))) return;
      enviado.current = true;
      const final: Record<string, number | null> = {};
      for (const q of preguntas) final[String(q.indice)] = todas[String(q.indice)] ?? null;
      empezar(async () => {
        await terminarTest(materialId, intentoId, final);
      });
    },
    [materialId, intentoId, preguntas, respuestas, blancas, total],
  );

  useEffect(() => {
    if (!esSimulacro || segundos === null) return;
    const inicio = Date.now();
    const id = setInterval(() => {
      const r = segundos - Math.floor((Date.now() - inicio) / 1000);
      setQuedan(r);
      if (r <= 0) {
        clearInterval(id);
        terminar(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [esSimulacro, segundos, terminar]);

  const elegir = (o: number) => {
    setRespuestas((r) => ({ ...r, [String(p.indice)]: o }));
    setBlancas((b) => {
      const n = new Set(b);
      n.delete(p.indice);
      return n;
    });
  };
  const siguiente = () => (actual < total - 1 ? setActual(actual + 1) : terminar());
  const elegida = respuestas[String(p.indice)];

  return (
    <div className="pila" style={{ minHeight: "100dvh" }}>
      <header className="fila separar" style={{ height: 76, padding: "0 20px 0 24px", borderBottom: "1px solid var(--line)", gap: 12 }}>
        <span className="solo-ordenador">
          <Marca />
        </span>
        <Link
          href={`/estudio/material/${materialId}`}
          className="boton-icono solo-movil"
          aria-label={T.test.salir}
          onClick={(e) => {
            if (!confirm(T.test.salirConfirmar)) e.preventDefault();
          }}
        >
          <Icono nombre="cerrar" tam={22} />
        </Link>
        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-2)", textAlign: "center" }}>{cabecera}</span>
        {esSimulacro ? (
          <span className={`reloj${quedan < 60 ? " poco" : ""}`} role="timer" aria-live="off">
            <Icono nombre="reloj" tam={17} />
            {reloj(quedan)}
          </span>
        ) : (
          <Link
            href={`/estudio/material/${materialId}`}
            className="boton boton-peq solo-ordenador"
            style={{ borderColor: "var(--line)" }}
            onClick={(e) => {
              if (!confirm(T.test.salirConfirmar)) e.preventDefault();
            }}
          >
            <Icono nombre="cerrar" tam={16} />
            {T.test.salir}
          </Link>
        )}
      </header>

      <main className="rellenar" style={{ width: "100%", maxWidth: 800, margin: "0 auto", padding: "56px 20px 32px" }}>
        <div className="pila hueco-10" style={{ marginBottom: 40 }}>
          <div className="fila separar" style={{ fontSize: 15 }}>
            <strong className="cifras">{t(T.test.deTotal, { n: actual + 1, total })}</strong>
            <span className="texto-2 cifras">
              {t(T.test.respondidas, { n: respondidas })}
              {esSimulacro ? ` · ${t(T.test.enBlancoN, { n: blancas.size })}` : ""}
            </span>
          </div>
          <div className="barra-progreso" style={{ height: 4 }}>
            <span style={{ width: `${((actual + 1) / total) * 100}%` }} />
          </div>
        </div>

        <h1 className="enunciado" style={{ marginBottom: 36 }}>
          {p.enunciado}
        </h1>
        <div className="pila hueco-12" role="radiogroup" aria-label={p.enunciado}>
          {p.opciones.map((o, i) => (
            <button key={i} type="button" className="opcion-test" aria-pressed={elegida === i} onClick={() => elegir(i)}>
              <span className="letra">{LETRAS[i]}</span>
              <span>{o}</span>
            </button>
          ))}
        </div>

        <div className="fila separar hueco-12" style={{ marginTop: 44 }}>
          {esSimulacro ? (
            <button
              type="button"
              className="boton"
              onClick={() => {
                setRespuestas((r) => ({ ...r, [String(p.indice)]: null }));
                const yaBlanca = blancas.has(p.indice);
                setBlancas((b) => new Set(b).add(p.indice));
                if (actual < total - 1) setActual(actual + 1);
                else terminar(false, { [String(p.indice)]: null }, yaBlanca ? 0 : 1);
              }}
            >
              {T.test.dejarEnBlanco}
            </button>
          ) : (
            <button type="button" className="boton" disabled={actual === 0} onClick={() => setActual(actual - 1)}>
              <Icono nombre="izquierda" tam={16} />
              {T.test.anterior}
            </button>
          )}
          <button type="button" className="boton boton-principal" style={{ minWidth: 180 }} disabled={enviando} onClick={siguiente}>
            {actual < total - 1 ? T.test.siguiente : T.test.terminar}
            <Icono nombre="flechaDerecha" tam={16} />
          </button>
        </div>
        {esSimulacro ? (
          <p className="texto-3" style={{ fontSize: 13, textAlign: "center", marginTop: 16 }}>
            {t(T.test.reglaSimulacro, { resta: Math.abs(resta - 1 / 3) < 0.001 ? "un tercio" : String(resta).replace(".", ",") })}
          </p>
        ) : null}
      </main>
    </div>
  );
}
