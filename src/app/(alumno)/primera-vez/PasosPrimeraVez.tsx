"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { guardarPrimeraVez, type Respuestas } from "./acciones";

const TOTAL = 5;

function Opciones<V extends string>({
  opciones,
  valor,
  alElegir,
  nombre,
}: {
  opciones: [V, string][];
  valor: V | null;
  alElegir: (v: V) => void;
  nombre: string;
}) {
  return (
    <div className="pila hueco-10" role="radiogroup">
      {opciones.map(([v, texto]) => (
        <label key={v} className="opcion-formato">
          <input type="radio" name={nombre} checked={valor === v} onChange={() => alElegir(v)} />
          <span className="nombre">{texto}</span>
        </label>
      ))}
    </div>
  );
}

export function PasosPrimeraVez({
  asistente,
  edadMinima,
  oposicion,
  nombreSugerido,
}: {
  asistente: string;
  edadMinima: number;
  oposicion: string;
  nombreSugerido: string;
}) {
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [r, setR] = useState<Respuestas>({
    edad: false,
    comoLlamar: nombreSugerido,
    oposicionConfirmada: true,
    repite: null,
    horasDia: null,
    dificultad: null,
  });
  const [enviando, empezar] = useTransition();
  const P = T.primeraVez;

  const seguir = () => {
    setError(null);
    if (paso === 0 && !r.edad) return setError(P.faltaEdad);
    if (paso === 1 && !r.comoLlamar.trim()) return setError(P.faltaNombre);
    if (paso === 3 && r.repite === null) return setError(P.faltaRespuesta);
    if (paso === 4 && !r.horasDia) return setError(P.faltaRespuesta);
    if (paso === 5) {
      if (!r.dificultad) return setError(P.faltaRespuesta);
      empezar(async () => {
        const res = await guardarPrimeraVez(r);
        if (res?.error) setError(T.comun.errorGenerico);
      });
      return;
    }
    setPaso(paso + 1);
  };

  if (paso === 0) {
    return (
      <div className="pila hueco-24">
        <h1>{P.tituloPrivacidad}</h1>
        <div className="tarjeta pila hueco-16">
          <div className="pila hueco-4">
            <strong>{P.queVe}</strong>
            <p className="texto-2">{P.queVeTexto}</p>
          </div>
          <div className="pila hueco-4">
            <strong>{P.queNoVe}</strong>
            <p className="texto-2">{t(P.queNoVeTexto, { asistente })}</p>
          </div>
        </div>
        <div className="aviso info">
          <span className="icono-aviso">
            <Icono nombre="info" />
          </span>
          <span className="texto-aviso">
            <strong>{P.ia}.</strong> {t(P.iaTexto, { asistente })}
          </span>
        </div>
        <p className="texto-2" style={{ fontSize: 15 }}>
          {t(P.borrar, { asistente })}
        </p>
        <label className="casilla">
          <input type="checkbox" checked={r.edad} onChange={(e) => setR({ ...r, edad: e.target.checked })} />
          <span>{t(P.edad, { edad: edadMinima })}</span>
        </label>
        {error ? (
          <span className="error-campo" role="alert">
            <Icono nombre="atencion" tam={15} />
            {error}
          </span>
        ) : null}
        <button type="button" className="boton boton-principal boton-grande boton-ancho" onClick={seguir}>
          {P.entendido}
        </button>
        <Link href="/legal" className="texto-2" style={{ fontSize: 14 }}>
          {P.legal}
        </Link>
      </div>
    );
  }

  return (
    <div className="pila hueco-24">
      <div className="pila hueco-10">
        <div className="progreso-pasos" aria-hidden="true">
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={i < paso ? "hecho" : ""} />
          ))}
        </div>
        <span className="texto-3" style={{ fontSize: 14, fontWeight: 600 }}>
          {t(P.paso, { n: paso, total: TOTAL })}
        </span>
      </div>

      {paso === 1 ? (
        <div className="pila hueco-16">
          <h1>{P.p1}</h1>
          <div className="campo">
            <label htmlFor="llamar" className="solo-lector">
              {P.p1}
            </label>
            <input
              id="llamar"
              type="text"
              autoFocus
              maxLength={40}
              placeholder={P.p1Ejemplo}
              value={r.comoLlamar}
              onChange={(e) => setR({ ...r, comoLlamar: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && seguir()}
            />
            <span className="ayuda-campo">{t(P.p1Ayuda, { asistente })}</span>
          </div>
        </div>
      ) : null}

      {paso === 2 ? (
        <div className="pila hueco-16">
          <h1>{P.p2}</h1>
          <label className="opcion-formato">
            <input type="radio" checked readOnly />
            <span className="nombre">{oposicion}</span>
          </label>
          <span className="ayuda-campo">{P.p2Ayuda}</span>
        </div>
      ) : null}

      {paso === 3 ? (
        <div className="pila hueco-16">
          <h1>{P.p3}</h1>
          <Opciones
            nombre="repite"
            opciones={[
              ["no", P.p3a],
              ["si", P.p3b],
            ]}
            valor={r.repite === null ? null : r.repite ? "si" : "no"}
            alElegir={(v) => setR({ ...r, repite: v === "si" })}
          />
        </div>
      ) : null}

      {paso === 4 ? (
        <div className="pila hueco-16">
          <h1>{P.p4}</h1>
          <Opciones
            nombre="horas"
            opciones={Object.entries(P.horas) as [string, string][]}
            valor={r.horasDia}
            alElegir={(v) => setR({ ...r, horasDia: v })}
          />
        </div>
      ) : null}

      {paso === 5 ? (
        <div className="pila hueco-16">
          <h1>{P.p5}</h1>
          <Opciones
            nombre="dificultad"
            opciones={Object.entries(P.dificultad) as [string, string][]}
            valor={r.dificultad}
            alElegir={(v) => setR({ ...r, dificultad: v })}
          />
        </div>
      ) : null}

      {error ? (
        <span className="error-campo" role="alert">
          <Icono nombre="atencion" tam={15} />
          {error}
        </span>
      ) : null}

      <div className="fila hueco-10">
        <button type="button" className="boton" onClick={() => setPaso(paso - 1)} disabled={enviando}>
          <Icono nombre="izquierda" tam={16} />
          {P.atras}
        </button>
        <button type="button" className="boton boton-principal rellenar" onClick={seguir} disabled={enviando}>
          {paso === 5 ? P.empezar : P.siguiente}
          <Icono nombre="flechaDerecha" tam={16} />
        </button>
      </div>
    </div>
  );
}
