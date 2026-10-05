"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icono, type NombreIcono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import type { Limite } from "@/tipos/chat";
import type { Dificultad, Estilo, Formato } from "@/tipos/material";
import { crearMaterial } from "@/servidor/acciones/material";

export type TemaCrear = { id: string; numero: number; nombre: string; paginas: number };

const FORMATOS: { f: Formato; icono: NombreIcono }[] = [
  { f: "resumen", icono: "documento" },
  { f: "esquema", icono: "arbol" },
  { f: "presentacion", icono: "presentacion" },
  { f: "tarjetas", icono: "repasar" },
  { f: "test", icono: "test" },
  { f: "simulacro", icono: "simulacro" },
];
const ESTILOS: Estilo[] = ["esquema", "cornell", "ejecutivo"];

function MiniaturaEstilo({ estilo }: { estilo: Estilo }) {
  const caja = { width: 56, height: 70, borderRadius: 6, border: "1px solid var(--line-strong)", background: "var(--surface-2)", flexShrink: 0, position: "relative" as const, overflow: "hidden" };
  if (estilo === "cornell")
    return (
      <span style={caja} aria-hidden="true">
        <span style={{ position: "absolute", left: 18, top: 0, bottom: 18, borderLeft: "1px solid var(--line-strong)" }} />
        <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 18, background: "var(--accent-soft)" }} />
      </span>
    );
  const lineas = estilo === "esquema" ? [20, 30, 28, 34, 26] : [36, 36, 30, 36, 24];
  return (
    <span style={{ ...caja, display: "flex", flexDirection: "column", gap: 5, padding: 9 }} aria-hidden="true">
      {lineas.map((w, i) => (
        <span key={i} style={{ height: 3, width: w, marginLeft: estilo === "esquema" && i % 2 ? 8 : 0, background: "var(--text-3)", borderRadius: 2, opacity: 0.8 }} />
      ))}
    </span>
  );
}

export function CrearMaterial({
  temas,
  quedan,
  limite: limiteInicial,
  regla,
  paraClase = false,
  destino,
}: {
  temas: TemaCrear[];
  quedan: number;
  limite: Limite | null;
  regla: { resta: number; segundos: number };
  paraClase?: boolean;
  destino: string;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [elegidos, setElegidos] = useState<string[]>(temas.length === 1 ? [temas[0].id] : []);
  const [formato, setFormato] = useState<Formato>("resumen");
  const [estilo, setEstilo] = useState<Estilo>("cornell");
  const [diapositivas, setDiapositivas] = useState(12);
  const [numTarjetas, setNumTarjetas] = useState(40);
  const [literal, setLiteral] = useState(false);
  const [numPreguntas, setNumPreguntas] = useState(20);
  const [dificultad, setDificultad] = useState<Dificultad>("oposicion");
  const [error, setError] = useState<string | null>(null);
  const [limite, setLimite] = useState<Limite | null>(limiteInicial);
  const [creando, empezar] = useTransition();
  const C = T.crear;

  if (temas.length === 0) {
    return (
      <div className="aviso atencion">
        <span className="icono-aviso">
          <Icono nombre="atencion" />
        </span>
        <span className="texto-aviso">{C.sinTemario}</span>
      </div>
    );
  }

  const nombresTemas = temas
    .filter((x) => elegidos.includes(x.id))
    .sort((a, b) => a.numero - b.numero)
    .map((x) => `Tema ${x.numero}`);
  const temasTexto = nombresTemas.length > 1 ? `${nombresTemas.slice(0, -1).join(", ")} y ${nombresTemas.at(-1)}` : (nombresTemas[0] ?? "—");
  const nombreFormato = formato === "resumen" ? `Resumen ${C.estilos[estilo][0] === "En esquema" ? "en esquema" : C.estilos[estilo][0]}` : C.formatos[formato][0];

  const alternar = (id: string) => {
    setError(null);
    setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : e.length >= 3 ? (setError(C.maxTemas), e) : [...e, id]));
  };

  const crear = () => {
    if (elegidos.length === 0) return setError(C.faltaTema);
    setError(null);
    empezar(async () => {
      const r = await crearMaterial({
        temaIds: elegidos,
        formato,
        estilo: formato === "resumen" ? estilo : null,
        opciones: { diapositivas, numero: formato === "tarjetas" ? numTarjetas : numPreguntas, literal, dificultad },
        paraClase,
      });
      if (r.limite) setLimite(r.limite);
      else if (r.error) setError(r.error);
      else if (r.id) router.push(`${destino}/${r.id}`);
    });
  };

  const textoLimite = limite
    ? limite.motivo === "academia"
      ? t(C.limiteAcademia, { cuando: limite.vuelve })
      : t(C.limiteAlumno, { n: limite.limite, cuando: limite.vuelve })
    : null;

  const columnaTemas = (
    <section className="pila">
      <span className="antetitulo solo-ordenador">{t(C.paso, { n: 1 })}</span>
      <h2 className="titulo-seccion solo-ordenador">{C.temas}</h2>
      <span className="texto-2 solo-ordenador" style={{ fontSize: 14, marginBottom: 18 }}>
        {C.temasAyuda}
      </span>
      <div style={{ borderTop: "1px solid var(--line)" }}>
        {temas.map((x) => (
          <label key={x.id} className="opcion-tema">
            <input type="checkbox" checked={elegidos.includes(x.id)} onChange={() => alternar(x.id)} />
            <span className="pila">
              <span className="texto-2" style={{ fontSize: 13 }}>
                {t(C.temaPaginas, { n: x.numero, p: x.paginas })}
              </span>
              <span style={{ fontSize: 16 }}>{x.nombre}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );

  const columnaFormato = (
    <section className="pila">
      <span className="antetitulo solo-ordenador">{t(C.paso, { n: 2 })}</span>
      <h2 className="titulo-seccion solo-ordenador">{C.formato}</h2>
      <span className="texto-2 solo-ordenador" style={{ fontSize: 14, marginBottom: 18 }}>
        {C.formatoAyuda}
      </span>
      <div className="pila hueco-10" role="radiogroup" aria-label={C.formato}>
        {FORMATOS.map(({ f, icono }) => (
          <label key={f} className="opcion-formato">
            <input type="radio" name="formato" checked={formato === f} onChange={() => setFormato(f)} />
            <Icono nombre={icono} />
            <span className="pila">
              <span className="nombre">{C.formatos[f][0]}</span>
              <span className="desc">{C.formatos[f][1]}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );

  const columnaOpciones = (
    <section className="pila hueco-16">
      <div className="pila solo-ordenador">
        <span className="antetitulo">{t(C.paso, { n: 3 })}</span>
        <h2 className="titulo-seccion">{formato === "resumen" ? C.estiloResumen : C.opciones}</h2>
        <span className="texto-2" style={{ fontSize: 14 }}>
          {C.estiloAyuda}
        </span>
      </div>
      {formato === "resumen" ? (
        <div className="pila hueco-10" role="radiogroup" aria-label={C.estiloResumen}>
          {ESTILOS.map((e) => (
            <label key={e} className="opcion-formato" style={{ alignItems: "flex-start" }}>
              <input type="radio" name="estilo" checked={estilo === e} onChange={() => setEstilo(e)} style={{ marginTop: 26 }} />
              <MiniaturaEstilo estilo={e} />
              <span className="pila">
                <span className="nombre">{C.estilos[e][0]}</span>
                <span className="desc">{C.estilos[e][1]}</span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
      {formato === "esquema" ? <p className="texto-2">{C.formatos.esquema[1]}.</p> : null}
      {formato === "presentacion" ? (
        <div className="pila hueco-10">
          <div className="fila separar">
            <label htmlFor="diapos" style={{ fontSize: 17, fontWeight: 500 }}>
              {C.diapositivas}
            </label>
            <span className="serif" style={{ fontSize: 36 }}>
              {diapositivas}
            </span>
          </div>
          <input id="diapos" className="deslizador" type="range" min={10} max={20} value={diapositivas} onChange={(e) => setDiapositivas(Number(e.target.value))} />
          <div className="fila separar texto-3" style={{ fontSize: 14 }}>
            <span>10</span>
            <span>20</span>
          </div>
        </div>
      ) : null}
      {formato === "tarjetas" ? (
        <>
          <div className="pila hueco-10">
            <div className="fila separar">
              <label htmlFor="ntarjetas" style={{ fontSize: 17, fontWeight: 500 }}>
                {C.tarjetas}
              </label>
              <span className="serif" style={{ fontSize: 36 }}>
                {numTarjetas}
              </span>
            </div>
            <input id="ntarjetas" className="deslizador" type="range" min={20} max={60} step={5} value={numTarjetas} onChange={(e) => setNumTarjetas(Number(e.target.value))} />
            <div className="fila separar texto-3" style={{ fontSize: 14 }}>
              <span>20</span>
              <span>60</span>
            </div>
          </div>
          <label className="tarjeta fila hueco-16" style={{ cursor: "pointer" }}>
            <span className="pila rellenar hueco-4">
              <strong style={{ fontSize: 16 }}>{C.modoLiteral}</strong>
              <span className="texto-2" style={{ fontSize: 14, lineHeight: 1.5 }}>
                {C.modoLiteralAyuda}
              </span>
            </span>
            <input type="checkbox" className="interruptor" checked={literal} onChange={(e) => setLiteral(e.target.checked)} aria-label={C.modoLiteral} />
          </label>
        </>
      ) : null}
      {formato === "test" || formato === "simulacro" ? (
        <div className="pila hueco-16">
          <div className="pila hueco-8">
            <span className="etiqueta">{C.preguntas}</span>
            <div className="fila hueco-8 envolver" role="radiogroup" aria-label={C.preguntas}>
              {[10, 20, 30, 50].map((n) => (
                <button key={n} type="button" className="chip-filtro" aria-pressed={numPreguntas === n} onClick={() => setNumPreguntas(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {formato === "test" ? (
            <div className="pila hueco-8">
              <span className="etiqueta">{C.dificultad}</span>
              <div className="fila hueco-8 envolver" role="radiogroup" aria-label={C.dificultad}>
                {(["facil", "medio", "oposicion"] as Dificultad[]).map((d) => (
                  <button key={d} type="button" className="chip-filtro" aria-pressed={dificultad === d} onClick={() => setDificultad(d)}>
                    {C.dificultades[d]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="texto-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
              {t(C.simulacroRegla, {
                min: Math.round((numPreguntas * regla.segundos) / 60),
                seg: regla.segundos,
                resta: Math.abs(regla.resta - 1 / 3) < 0.001 ? "un tercio" : String(regla.resta).replace(".", ","),
              })}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );

  const botonCrear = (
    <button type="button" className="boton boton-principal boton-grande" onClick={crear} disabled={creando || !!limite || elegidos.length === 0} style={{ minWidth: 160 }}>
      <Icono nombre="crear" tam={18} />
      {creando ? T.comun.cargando : formato === "tarjetas" ? t(C.botonTarjetas, { n: numTarjetas }) : C.boton}
    </button>
  );
  const contador = quedan === 1 ? C.quedaUno : t(C.quedan, { n: quedan });

  return (
    <>
      {textoLimite ? (
        <div className="limite" role="status" style={{ marginBottom: 24 }}>
          <div className="cabeza">
            <Icono nombre="reloj" />
            <span>{T.chat.limiteTitulo}</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55 }}>{textoLimite}</p>
        </div>
      ) : null}

      {/* Ordenador: los tres pasos a la vez */}
      <div className="solo-ordenador">
        <div className="pasos-crear">
          {columnaTemas}
          {columnaFormato}
          {columnaOpciones}
        </div>
      </div>

      {/* Móvil: paso a paso */}
      <div className="solo-movil pila hueco-16">
        {paso > 1 ? (
          <div style={{ borderTop: "1px solid var(--line)" }}>
            <div className="fila separar" style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <span className="pila">
                <span className="texto-3" style={{ fontSize: 13 }}>
                  {C.temas}
                </span>
                <span>{temasTexto}</span>
              </span>
              <button type="button" className="boton-texto boton" style={{ height: 36 }} onClick={() => setPaso(1)}>
                {C.cambiar}
              </button>
            </div>
            {paso > 2 ? (
              <div className="fila separar" style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <span className="pila">
                  <span className="texto-3" style={{ fontSize: 13 }}>
                    {C.formato}
                  </span>
                  <span>{C.formatos[formato][0]}</span>
                </span>
                <button type="button" className="boton-texto boton" style={{ height: 36 }} onClick={() => setPaso(2)}>
                  {C.cambiar}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="progreso-pasos" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= paso ? "hecho" : ""} />
          ))}
        </div>
        <div className="fila separar">
          <strong style={{ fontSize: 15 }}>{t(C.pasoDe, { n: paso, que: paso === 1 ? C.eligeTemas : paso === 2 ? C.eligeFormato : C.ajusta })}</strong>
          {paso === 1 ? <span className="texto-3" style={{ fontSize: 14 }}>{C.temasAyuda}</span> : null}
        </div>
        {paso === 1 ? columnaTemas : paso === 2 ? columnaFormato : columnaOpciones}
      </div>

      {error ? (
        <p className="error-campo" role="alert" style={{ marginTop: 16 }}>
          <Icono nombre="atencion" tam={15} />
          {error}
        </p>
      ) : null}

      <div className="barra-crear">
        <div className="pila solo-ordenador">
          <strong>{t(C.resumenEleccion, { formato: nombreFormato, temas: temasTexto })}</strong>
          <span className="texto-2" style={{ fontSize: 14 }}>
            {contador}
          </span>
        </div>
        <div className="solo-ordenador">{botonCrear}</div>
        <div className="solo-movil pila hueco-8" style={{ width: "100%" }}>
          {paso < 3 ? (
            <button
              type="button"
              className="boton boton-principal boton-grande boton-ancho"
              onClick={() => {
                if (paso === 1 && elegidos.length === 0) return setError(C.faltaTema);
                setError(null);
                setPaso(paso + 1);
              }}
            >
              {paso === 1 ? C.siguienteFormato : C.siguienteOpciones}
              <Icono nombre="flechaDerecha" tam={18} />
            </button>
          ) : (
            <div className="pila">{botonCrear}</div>
          )}
          <span className="texto-2" style={{ fontSize: 14, textAlign: "center" }}>
            {contador}
          </span>
        </div>
      </div>
    </>
  );
}
