"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Icono } from "@/componentes/Icono";
import { Parrafo, parrafosConPosicion } from "@/componentes/TextoRico";
import { VisorPagina } from "@/componentes/VisorPagina";
import { T, t } from "@/textos";
import { claveCita, textoCita, type Cita, type EventoChat, type Limite, type MensajeVista, type Modo } from "@/tipos/chat";
import { avisarError, pasarAlFormador, valorarRespuesta } from "@/app/(alumno)/estudio/preguntar/acciones";

type Props = {
  conversacionId: string | null;
  titulo: string;
  mensajesIniciales: MensajeVista[];
  modoInicial: Modo;
  quedanInicial: number;
  limiteInicial: Limite | null;
  asistente: string;
  nombre: string | null;
  oposicion: string;
  ejemplos: string[];
  sugerencia: { asunto: string } | null;
  preguntaInicial?: string | null;
  modoPregunta?: Modo | null;
};

const MODOS: Modo[] = ["resolver", "guiado", "examinador"];

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
}

function horaRelativa(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoy.toDateString()) return `${T.comun.hoy}, ${hora}`;
  const ayer = new Date(hoy.getTime() - 86400000);
  if (d.toDateString() === ayer.toDateString()) return `${T.comun.ayer}, ${hora}`;
  return `${fechaCorta(iso)}, ${hora}`;
}

function urlVisor(c: Extract<Cita, { tipo: "temario" }>, vuelta: string) {
  return `/estudio/temario/${c.versionId}/${c.pagina}?p=${c.parrafos.join(",")}&vuelta=${encodeURIComponent(vuelta)}`;
}

function ChipCita({
  cita,
  activa,
  alAbrir,
  vuelta,
}: {
  cita: Cita;
  activa: boolean;
  alAbrir: (c: Extract<Cita, { tipo: "temario" }>) => void;
  vuelta: string;
}) {
  if (cita.tipo === "nota") {
    return (
      <span className="cita nota">
        <span aria-hidden="true">↳</span>
        <span>{textoCita(cita, fechaCorta)}</span>
      </span>
    );
  }
  return (
    <Link
      href={urlVisor(cita, vuelta)}
      className="cita"
      aria-current={activa ? "true" : undefined}
      onClick={(e) => {
        if (window.matchMedia("(min-width: 1024px)").matches) {
          e.preventDefault();
          alAbrir(cita);
        }
      }}
    >
      <span aria-hidden="true">↳</span>
      <span>{textoCita(cita)}</span>
    </Link>
  );
}

/** Reparte las citas entre los párrafos de la respuesta. */
function bloques(m: MensajeVista) {
  const ps = parrafosConPosicion(m.texto);
  const res = ps.map((p) => ({ ...p, citas: [] as Cita[] }));
  const sueltas: Cita[] = [];
  for (const c of m.citas) {
    const fin = (c.hasta ?? m.texto.length) - 1;
    let destino = res.findIndex((p) => fin >= p.desde && fin <= p.hasta);
    if (destino === -1) destino = res.findIndex((p) => (c.desde ?? 0) <= p.hasta);
    if (destino === -1) sueltas.push(c);
    else if (!res[destino].citas.some((x) => claveCita(x) === claveCita(c))) res[destino].citas.push(c);
  }
  if (sueltas.length && res.length) {
    const ultimo = res[res.length - 1];
    for (const c of sueltas) if (!ultimo.citas.some((x) => claveCita(x) === claveCita(c))) ultimo.citas.push(c);
  }
  return res;
}

export function Chat(props: Props) {
  const [conversacionId, setConversacionId] = useState(props.conversacionId);
  const [titulo, setTitulo] = useState(props.titulo);
  const [mensajes, setMensajes] = useState<MensajeVista[]>(props.mensajesIniciales);
  const [modo, setModo] = useState<Modo>(props.modoInicial);
  const [quedan, setQuedan] = useState(props.quedanInicial);
  const [limite, setLimite] = useState<Limite | null>(props.limiteInicial);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [visor, setVisor] = useState<Extract<Cita, { tipo: "temario" }> | null>(null);
  const pendiente = useRef<{ pregunta: string; modo: Modo } | null>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const convRef = useRef(conversacionId);
  convRef.current = conversacionId;
  const vuelta = conversacionId ? `/estudio/preguntar/${conversacionId}` : "/estudio/preguntar";

  useEffect(() => {
    fondo.current?.scrollIntoView({ block: "end" });
  }, [mensajes]);

  const enviar = useCallback(
    async (pregunta: string, modoEnvio: Modo, reintentarMensajeId?: string) => {
      if (!pregunta.trim() || enviando) return;
      setAviso(null);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        pendiente.current = { pregunta, modo: modoEnvio };
        setSinConexion(true);
        setMensajes((ms) =>
          ms.some((m) => m.id === "pendiente")
            ? ms
            : [...ms, { id: "pendiente", rol: "alumno", texto: pregunta, citas: [], estado: "escribiendo", modo: modoEnvio, valoracion: null, errorAvisado: false, enviadaFormador: false, rechazadaFormador: false, autorNombre: null, creadoAt: new Date().toISOString() }],
        );
        return;
      }
      setEnviando(true);
      const idTemporal = `tmp-${Date.now()}`;
      const idRespuesta = `resp-${Date.now()}`;
      const base = { citas: [], valoracion: null, errorAvisado: false, enviadaFormador: false, rechazadaFormador: false, autorNombre: null, creadoAt: new Date().toISOString() };
      setMensajes((ms) => {
        let lista = ms.filter((m) => m.id !== "pendiente");
        if (reintentarMensajeId) {
          const i = lista.findIndex((m) => m.id === reintentarMensajeId);
          lista = lista.filter((m, j) => !(j > i && m.rol === "asistente" && (m.estado === "error" || m.estado === "cortado")));
        } else {
          lista = [...lista, { ...base, id: idTemporal, rol: "alumno", texto: pregunta, estado: "ok", modo: modoEnvio }];
        }
        return [...lista, { ...base, id: idRespuesta, rol: "asistente", texto: "", estado: "escribiendo", modo: modoEnvio }];
      });

      const actualizar = (fn: (m: MensajeVista) => MensajeVista) =>
        setMensajes((ms) => ms.map((m) => (m.id === idRespuesta ? fn(m) : m)));

      let empezado = false;
      let idFinal = idRespuesta;
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversacionId: convRef.current, pregunta, modo: modoEnvio, reintentarMensajeId }),
        });
        const tipo = r.headers.get("content-type") || "";
        if (!tipo.includes("ndjson")) {
          const j = await r.json().catch(() => ({}));
          setMensajes((ms) => ms.filter((m) => m.id !== idRespuesta && (reintentarMensajeId || m.id !== idTemporal)));
          if (j.limite) {
            setLimite(j.limite as Limite);
            setQuedan(0);
          } else {
            setAviso(j.error || T.comun.errorGenerico);
            if (!reintentarMensajeId) setTexto(pregunta);
          }
          return;
        }
        const lector = r.body!.getReader();
        const decodificador = new TextDecoder();
        let resto = "";
        for (;;) {
          const { value, done } = await lector.read();
          if (done) break;
          resto += decodificador.decode(value, { stream: true });
          const lineas = resto.split("\n");
          resto = lineas.pop() ?? "";
          for (const linea of lineas) {
            if (!linea.trim()) continue;
            const ev = JSON.parse(linea) as EventoChat;
            if (ev.t === "inicio") {
              empezado = true;
              if (!convRef.current) {
                convRef.current = ev.conversacionId;
                setConversacionId(ev.conversacionId);
                setTitulo(pregunta.length > 48 ? pregunta.slice(0, 46) + "…" : pregunta);
                window.history.replaceState(null, "", `/estudio/preguntar/${ev.conversacionId}`);
              }
              idFinal = ev.mensajeId;
              setMensajes((ms) => ms.map((m) => (m.id === idTemporal ? { ...m, id: ev.mensajeAlumnoId } : m)));
            } else if (ev.t === "texto") {
              actualizar((m) => ({ ...m, texto: m.texto + ev.v }));
            } else if (ev.t === "cita") {
              actualizar((m) => ({ ...m, citas: [...m.citas, ev.cita] }));
            } else if (ev.t === "fin") {
              actualizar((m) => ({ ...m, id: idFinal, texto: ev.texto, citas: ev.citas, estado: ev.estado }));
              setQuedan(ev.quedan);
            } else if (ev.t === "error") {
              actualizar((m) => ({ ...m, id: idFinal, texto: "", citas: [], estado: "error" }));
            }
          }
        }
        // Si el servidor no llegó a cerrar la respuesta, se ha cortado.
        setMensajes((ms) => ms.map((m) => (m.id === idRespuesta && m.estado === "escribiendo" ? { ...m, estado: m.texto ? "cortado" : "error" } : m)));
      } catch {
        if (!empezado) {
          // Sin conexión: la pregunta se envía sola al volver.
          setMensajes((ms) => ms.filter((m) => m.id !== idRespuesta && m.id !== idTemporal));
          pendiente.current = { pregunta, modo: modoEnvio };
          setSinConexion(true);
          setMensajes((ms) => [
            ...ms,
            { ...base, id: "pendiente", rol: "alumno", texto: pregunta, estado: "escribiendo", modo: modoEnvio },
          ]);
        } else {
          setMensajes((ms) => ms.map((m) => (m.id === idRespuesta ? { ...m, estado: m.texto ? "cortado" : "error" } : m)));
        }
      } finally {
        setEnviando(false);
      }
    },
    [enviando],
  );

  // Pregunta que llega por la dirección (por ejemplo, desde una sugerencia).
  const inicialEnviada = useRef(false);
  useEffect(() => {
    if (props.preguntaInicial && !inicialEnviada.current && mensajes.length === 0) {
      inicialEnviada.current = true;
      const m = props.modoPregunta ?? modo;
      setModo(m);
      void enviar(props.preguntaInicial, m);
    }
  }, [props.preguntaInicial, props.modoPregunta, mensajes.length, modo, enviar]);

  useEffect(() => {
    const alVolver = () => {
      setSinConexion(false);
      const p = pendiente.current;
      if (p) {
        pendiente.current = null;
        setMensajes((ms) => ms.filter((m) => m.id !== "pendiente"));
        void enviar(p.pregunta, p.modo);
      }
    };
    const alIrse = () => setSinConexion(true);
    window.addEventListener("online", alVolver);
    window.addEventListener("offline", alIrse);
    return () => {
      window.removeEventListener("online", alVolver);
      window.removeEventListener("offline", alIrse);
    };
  }, [enviar]);

  const alEnviar = () => {
    const p = texto.trim();
    // Mientras termina la respuesta anterior, lo escrito se queda en el campo.
    if (!p || enviando) return;
    setTexto("");
    void enviar(p, modo);
    campo.current?.focus();
  };

  const vacio = mensajes.length === 0;
  const selector = (
    <div className="selector modo" role="group" aria-label={T.chat.modoGrupo}>
      {MODOS.map((m) => (
        <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)} title={T.chat.modoAyuda[m]}>
          {T.chat.modos[m]}
        </button>
      ))}
    </div>
  );

  const bloqueado = !!limite;

  return (
    <div className="fila" style={{ alignItems: "stretch", minHeight: "100dvh" }}>
      <div className="pila rellenar" style={{ minHeight: "100dvh" }}>
        <header className="chat-cabecera">
          <span className="titulo-chat">{conversacionId ? titulo : T.chat.tituloNueva}</span>
          {visor ? null : selector}
          <div className="acciones">
            {visor ? null : (
              <Link href="/estudio/conversaciones" className="boton boton-peq" style={{ borderColor: "var(--line)", color: "var(--text-2)" }}>
                <Icono nombre="historial" tam={17} />
                <span>{T.chat.conversaciones}</span>
              </Link>
            )}
            <button
              type="button"
              className="boton-icono con-borde"
              aria-label={T.chat.nueva}
              title={T.chat.nueva}
              onClick={() => {
                // Siempre una conversación nueva de verdad (la anterior pasa a la memoria).
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa a propósito
                window.location.assign("/estudio/preguntar");
              }}
            >
              <Icono nombre="mas" tam={18} />
            </button>
          </div>
        </header>
        <div className="modo-movil">{selector}</div>

        <div className="chat-cuerpo">
          <div className="chat-columna" aria-live="polite">
            {vacio ? (
              <div className="pila hueco-24">
                <div className="saludo pila hueco-12">
                  <h1>{props.nombre ? t(T.chat.saludo, { nombre: props.nombre }) : T.chat.saludoSinNombre}</h1>
                  <p>{t(T.chat.presentacion, { oposicion: props.oposicion })}</p>
                </div>
                {props.sugerencia ? (
                  <div className="aviso info">
                    <span className="icono-aviso">
                      <Icono nombre="repasar" />
                    </span>
                    <span className="texto-aviso">{t(T.chat.sugerenciaMemoria, { asunto: props.sugerencia.asunto })}</span>
                    <button
                      type="button"
                      className="boton boton-mini"
                      onClick={() => {
                        setModo("examinador");
                        void enviar(`Pregúntame sobre ${props.sugerencia!.asunto}`, "examinador");
                      }}
                    >
                      {T.comun.si}
                    </button>
                  </div>
                ) : null}
                {props.ejemplos.length ? (
                  <div className="pila">
                    <div style={{ paddingBottom: 4 }} className="antetitulo">
                      {T.chat.pruebaCon}
                    </div>
                    <div className="lista-ejemplos">
                      {props.ejemplos.map((e) => (
                        <button key={e} type="button" onClick={() => void enviar(e, modo)} disabled={bloqueado}>
                          <span style={{ flex: 1 }}>{e}</span>
                          <Icono nombre="flechaDerecha" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              mensajes.map((m) =>
                m.rol === "alumno" ? (
                  <div key={m.id} className={`burbuja-alumno${m.id === "pendiente" ? " pendiente" : ""}`}>
                    {m.texto}
                  </div>
                ) : m.rol === "formador" ? (
                  <RespuestaFormador key={m.id} m={m} />
                ) : (
                  <Respuesta
                    key={m.id}
                    m={m}
                    asistente={props.asistente}
                    visor={visor}
                    alAbrir={setVisor}
                    vuelta={vuelta}
                    alReintentar={() => {
                      const i = mensajes.findIndex((x) => x.id === m.id);
                      const previa = [...mensajes.slice(0, i)].reverse().find((x) => x.rol === "alumno");
                      if (previa) void enviar(previa.texto, m.modo ?? modo, previa.id.startsWith("tmp-") ? undefined : previa.id);
                    }}
                  />
                ),
              )
            )}
            {limite ? <AvisoLimite limite={limite} /> : null}
            <div ref={fondo} />
          </div>
        </div>

        <div className="chat-pie">
          <div className="compositor">
            {sinConexion ? (
              <div className="aviso" role="status">
                <span className="icono-aviso">
                  <Icono nombre="sinConexion" />
                </span>
                <span className="texto-aviso">{T.chat.sinConexion}</span>
              </div>
            ) : null}
            {aviso ? (
              <div className="aviso error" role="alert">
                <span className="icono-aviso">
                  <Icono nombre="atencion" />
                </span>
                <span className="texto-aviso">{aviso}</span>
              </div>
            ) : null}
            <form
              className="caja"
              onSubmit={(e) => {
                e.preventDefault();
                alEnviar();
              }}
            >
              <label htmlFor="pregunta" className="solo-lector">
                {T.chat.tuPregunta}
              </label>
              <textarea
                id="pregunta"
                ref={campo}
                rows={1}
                value={texto}
                maxLength={2000}
                disabled={bloqueado}
                placeholder={t(T.chat.placeholder)}
                onChange={(e) => {
                  setTexto(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(180, e.target.scrollHeight) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    alEnviar();
                  }
                }}
              />
              <button type="submit" className="enviar" aria-label={T.chat.enviar} disabled={!texto.trim() || enviando || bloqueado}>
                <Icono nombre="enviar" />
              </button>
            </form>
            <div className="notas">
              <span>{t(T.marca.aviso)}</span>
              <span className="quedan">{quedan === 1 ? T.chat.quedaUna : t(T.chat.quedan, { n: quedan })}</span>
            </div>
          </div>
        </div>
      </div>

      {visor ? (
        <aside className="solo-ordenador" style={{ width: 692, flexShrink: 0, borderLeft: "1px solid var(--line)", height: "100dvh", position: "sticky", top: 0, overflowY: "auto" }}>
          <VisorPagina
            key={`${visor.versionId}-${visor.pagina}-${visor.parrafos.join(",")}`}
            versionId={visor.versionId}
            pagina={visor.pagina}
            resaltar={visor.parrafos}
            alCerrar={() => setVisor(null)}
          />
        </aside>
      ) : null}
    </div>
  );
}

function Quien({ asistente }: { asistente: string }) {
  return (
    <div className="quien">
      <span className="avatar">{asistente[0]}</span>
      <span className="nombre">{asistente}</span>
      <span className="etiqueta-ia">{T.comun.ia}</span>
    </div>
  );
}

function Respuesta({
  m,
  asistente,
  visor,
  alAbrir,
  alReintentar,
  vuelta,
}: {
  m: MensajeVista;
  asistente: string;
  visor: Extract<Cita, { tipo: "temario" }> | null;
  alAbrir: (c: Extract<Cita, { tipo: "temario" }>) => void;
  alReintentar: () => void;
  vuelta: string;
}) {
  const [valoracion, setValoracion] = useState(m.valoracion);
  const [avisado, setAvisado] = useState(m.errorAvisado);
  const [enviada, setEnviada] = useState<null | boolean>(m.enviadaFormador ? true : m.rechazadaFormador ? false : null);
  const [dialogo, setDialogo] = useState(false);
  const [comentario, setComentario] = useState("");
  const [, empezar] = useTransition();
  const real = !m.id.startsWith("resp-") && !m.id.startsWith("tmp-");

  if (m.estado === "error") {
    return (
      <div className="respuesta">
        <Quien asistente={asistente} />
        <div className="aviso error" role="alert">
          <span className="icono-aviso">
            <Icono nombre="atencion" />
          </span>
          <span className="texto-aviso">{t(T.chat.falloIA)}</span>
          <button type="button" className="boton boton-mini" onClick={alReintentar}>
            <Icono nombre="recargar" tam={15} />
            {T.comun.reintentar}
          </button>
        </div>
      </div>
    );
  }

  if (m.estado === "no_esta") {
    return (
      <div className="respuesta">
        <Quien asistente={asistente} />
        <div className="no-esta">
          <div className="cabeza">
            <Icono nombre="info" tam={17} />
            <span>{T.chat.noEstaCabeza}</span>
          </div>
          <p className="texto-respuesta">{enviada === null ? T.chat.noEstaTexto : T.chat.noEstaSinOferta}</p>
          {enviada === null ? (
            <div className="fila hueco-10">
              <button
                type="button"
                className="boton boton-principal boton-peq"
                style={{ minWidth: 88, height: 44 }}
                disabled={!real}
                onClick={() =>
                  empezar(async () => {
                    const r = await pasarAlFormador(m.id, true);
                    if (r.ok) setEnviada(true);
                  })
                }
              >
                {T.comun.si}
              </button>
              <button
                type="button"
                className="boton boton-peq"
                style={{ minWidth: 88, height: 44 }}
                disabled={!real}
                onClick={() =>
                  empezar(async () => {
                    const r = await pasarAlFormador(m.id, false);
                    if (r.ok) setEnviada(false);
                  })
                }
              >
                {T.comun.no}
              </button>
            </div>
          ) : enviada ? (
            <div className="enviada" role="status">
              <Icono nombre="bien" tam={18} />
              <span>{T.chat.enviadaFormador}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const partes = bloques(m);
  const escribiendo = m.estado === "escribiendo";
  return (
    <div className="respuesta">
      <Quien asistente={asistente} />
      {escribiendo && !m.texto ? (
        <p className="texto-3 cursor-escribiendo" style={{ fontSize: 15 }}>
          {t(T.chat.escribiendo)}
        </p>
      ) : null}
      {partes.map((p, i) => (
        <div key={i} className="bloque-respuesta">
          <div className={`texto-respuesta${escribiendo && i === partes.length - 1 ? " cursor-escribiendo" : ""}`}>
            <Parrafo texto={p.texto} />
          </div>
          {p.citas.length ? (
            <div className="citas">
              {p.citas.map((c) => (
                <ChipCita
                  key={claveCita(c)}
                  cita={c}
                  vuelta={vuelta}
                  activa={!!visor && c.tipo === "temario" && claveCita(c) === claveCita(visor)}
                  alAbrir={alAbrir}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
      {m.estado === "cortado" ? (
        <div className="aviso atencion" role="status">
          <span className="icono-aviso">
            <Icono nombre="atencion" />
          </span>
          <span className="texto-aviso">{T.chat.cortada}</span>
          <button type="button" className="boton boton-mini" onClick={alReintentar}>
            <Icono nombre="recargar" tam={15} />
            {T.comun.reintentar}
          </button>
        </div>
      ) : null}
      {!escribiendo && real && m.texto ? (
        <div className="valorar">
          <button
            type="button"
            className="solo-icono-movil"
            aria-pressed={valoracion === "sirvio"}
            onClick={() =>
              empezar(async () => {
                const v = valoracion === "sirvio" ? null : "sirvio";
                setValoracion(v);
                await valorarRespuesta(m.id, v);
              })
            }
          >
            <Icono nombre="meGusta" tam={17} />
            <span>{T.chat.meSirvio}</span>
          </button>
          <button
            type="button"
            className="solo-icono-movil"
            aria-pressed={valoracion === "no_sirvio"}
            onClick={() =>
              empezar(async () => {
                const v = valoracion === "no_sirvio" ? null : "no_sirvio";
                setValoracion(v);
                await valorarRespuesta(m.id, v);
              })
            }
          >
            <Icono nombre="noMeGusta" tam={17} />
            <span>{T.chat.noMeSirvio}</span>
          </button>
          <button type="button" aria-pressed={avisado} disabled={avisado} onClick={() => setDialogo(true)}>
            <Icono nombre="bandera" tam={17} />
            <span>{avisado ? T.chat.errorAvisado : T.chat.avisarError}</span>
          </button>
        </div>
      ) : null}
      {dialogo ? (
        <div className="tarjeta pila hueco-12" role="dialog" aria-label={T.chat.avisarErrorTitulo}>
          <strong>{T.chat.avisarErrorTitulo}</strong>
          <span className="ayuda-campo">{T.chat.avisarErrorAyuda}</span>
          <textarea className="entrada" value={comentario} maxLength={1000} onChange={(e) => setComentario(e.target.value)} />
          <div className="fila hueco-10">
            <button
              type="button"
              className="boton boton-principal boton-peq"
              onClick={() =>
                empezar(async () => {
                  const r = await avisarError(m.id, comentario);
                  if (r.ok) {
                    setAvisado(true);
                    setDialogo(false);
                  }
                })
              }
            >
              {T.chat.avisarErrorEnviar}
            </button>
            <button type="button" className="boton boton-peq" onClick={() => setDialogo(false)}>
              {T.comun.cancelar}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RespuestaFormador({ m }: { m: MensajeVista }) {
  const iniciales = (m.autorNombre ?? "F")
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
  return (
    <div className="tarjeta-formador">
      <div className="fila hueco-10">
        <span className="inicial">{iniciales}</span>
        <span className="pila">
          <strong style={{ fontSize: 14 }}>{T.chat.respuestaFormador}</strong>
          <span className="texto-3" style={{ fontSize: 13 }}>
            {m.autorNombre} · {horaRelativa(m.creadoAt)}
          </span>
        </span>
      </div>
      <div className="texto-respuesta">
        <Parrafo texto={m.texto} />
      </div>
      {m.citas.map((c) => (
        <span key={claveCita(c)} className="cita nota">
          <span aria-hidden="true">↳</span>
          <span>{textoCita(c, fechaCorta)}</span>
        </span>
      ))}
    </div>
  );
}

function AvisoLimite({ limite }: { limite: Limite }) {
  const texto =
    limite.motivo === "academia"
      ? t(T.chat.limiteAcademia, { cuando: limite.vuelve })
      : t(T.chat.limiteAlumno, { n: limite.limite });
  return (
    <div className="limite" role="status">
      <div className="cabeza">
        <Icono nombre="reloj" />
        <span>{T.chat.limiteTitulo}</span>
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.55 }}>{texto}</p>
      <div className="fila hueco-10 envolver">
        <Link href="/estudio/repasar" className="boton boton-principal boton-peq">
          <Icono nombre="repasar" tam={16} />
          {T.chat.repasarTarjetas}
        </Link>
        <Link href="/estudio/biblioteca?tipo=test" className="boton boton-peq">
          {T.chat.irATests}
        </Link>
      </div>
    </div>
  );
}
