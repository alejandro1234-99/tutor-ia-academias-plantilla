"use client";

import { useState, useTransition } from "react";
import { T, t } from "@/textos";
import { darDeBajaCuenta, guardarLimitesAcademia, guardarLimitesPersona } from "../acciones";

const NOMBRES: Record<string, string> = {
  "limites.preguntasAlDia": "Preguntas al día por alumno",
  "limites.materialesAlMes": "Materiales al mes por alumno",
  "limites.materialesFormadorAlMes": "Materiales al mes por formador",
  "limites.topeAcademiaPreguntasMes": "Tope de preguntas al mes de la academia",
  "limites.topeAcademiaMaterialesMes": "Tope de materiales al mes de la academia",
  "limites.alumnosIncluidos": "Alumnos incluidos en la cuota",
};

export function Limites({ actual, porDefecto }: { actual: Record<string, number | null>; porDefecto: Record<string, number> }) {
  const [valores, setValores] = useState<Record<string, string>>(Object.fromEntries(Object.keys(porDefecto).map((k) => [k, actual[k] === undefined || actual[k] === null ? "" : String(actual[k])])));
  const [correo, setCorreo] = useState("");
  const [preguntas, setPreguntas] = useState("");
  const [materiales, setMateriales] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [aviso2, setAviso2] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const L = T.tecnico.limites;
  return (
    <div className="pila hueco-32">
      <section className="tarjeta pila hueco-16">
        <h2 className="antetitulo">{L.academia}</h2>
        {Object.keys(porDefecto).map((k) => (
          <div key={k} className="campo">
            <label htmlFor={k}>{NOMBRES[k]}</label>
            <input id={k} type="number" min={0} placeholder={t(L.porDefecto, { n: porDefecto[k] })} value={valores[k]} onChange={(e) => setValores({ ...valores, [k]: e.target.value })} />
          </div>
        ))}
        <button
          type="button"
          className="boton boton-principal"
          style={{ alignSelf: "flex-start" }}
          disabled={pendiente}
          onClick={() =>
            empezar(async () => {
              await guardarLimitesAcademia(Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, v === "" ? null : Number(v)])));
              setAviso(L.guardado);
            })
          }
        >
          {L.guardar}
        </button>
        {aviso ? <span className="texto-2">{aviso}</span> : null}
      </section>
      <section className="tarjeta pila hueco-16">
        <h2 className="antetitulo">{L.alumno}</h2>
        <div className="campo">
          <label htmlFor="correo-limite">{L.buscar}</label>
          <input id="correo-limite" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="p-limite">{L.preguntasDia}</label>
          <input id="p-limite" type="number" min={0} value={preguntas} onChange={(e) => setPreguntas(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="m-limite">{L.materialesMes}</label>
          <input id="m-limite" type="number" min={0} value={materiales} onChange={(e) => setMateriales(e.target.value)} />
        </div>
        <div className="fila hueco-10 envolver">
          <button
            type="button"
            className="boton boton-principal"
            disabled={pendiente || !correo}
            onClick={() =>
              empezar(async () => {
                const r = await guardarLimitesPersona(correo, preguntas === "" ? null : Number(preguntas), materiales === "" ? null : Number(materiales));
                setAviso2(r.ok ? L.guardado : L.noEncontrada);
              })
            }
          >
            {L.guardar}
          </button>
          <button
            type="button"
            className="boton boton-peligro"
            disabled={pendiente || !correo}
            onClick={() => {
              if (!confirm(`${L.baja}: ${correo}?`)) return;
              empezar(async () => {
                const r = await darDeBajaCuenta(correo);
                setAviso2(r.ok ? L.guardado : L.noEncontrada);
              });
            }}
          >
            {L.baja}
          </button>
        </div>
        {aviso2 ? <span className="texto-2">{aviso2}</span> : null}
      </section>
    </div>
  );
}
