import { after, type NextRequest } from "next/server";
import { T, t } from "@/textos";
import { conSesion, obtenerSesion } from "@/servidor/sesion";
import { comoPersona, comoSistema } from "@/servidor/bd";
import { permitir, LIMITES } from "@/servidor/limites-peticiones";
import { estadoPreguntas } from "@/servidor/limites";
import { contextoAlumno, oposicionDe } from "@/servidor/alumno";
import { buscarTemario } from "@/servidor/buscar";
import { huellaConsulta } from "@/servidor/ia/huellas";
import { ErrorIA, prepararConsulta, responder, tituloConversacion, type TurnoPrevio } from "@/servidor/ia/chat";
import { falloForzado, type Consumo } from "@/servidor/ia/modelos";
import { procesarMemoriaPendiente } from "@/servidor/ia/memoria";
import type { Cita, EventoChat, Modo } from "@/tipos/chat";

export const maxDuration = 120;

// Trozos del temario que se le pasan a la IA en cada pregunta (medido con las
// 50 dudas típicas: con 8, el buscador trae la página correcta en 46 de 50
// solo por palabras; con la búsqueda por significado, más).
const TROZOS_POR_PREGUNTA = 8;

const MODOS: Modo[] = ["resolver", "guiado", "examinador"];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
}

// Una pregunta al asistente. La respuesta se envía mientras se escribe
// (una línea JSON por evento).
export async function POST(req: NextRequest) {
  // La primera letra se mide desde que el alumno pulsa enviar: es la espera que nota.
  const inicioPeticion = Date.now();
  const s = await obtenerSesion();
  if (!s || !s.papeles.includes("alumno")) return json({ error: T.comun.noEncontrado }, 401);
  if (s.soporte) return json({ error: T.comun.soloLectura }, 403);
  const alumnoId = s.persona.id;

  if (!(await permitir(`chat:${alumnoId}`, LIMITES.peticionesPorMinuto, 60))) {
    return json({ error: T.comun.demasiadasPeticiones }, 429);
  }

  const cuerpo = (await req.json().catch(() => null)) as {
    conversacionId?: string | null;
    pregunta?: string;
    modo?: Modo;
    reintentarMensajeId?: string | null;
  } | null;
  const pregunta = String(cuerpo?.pregunta ?? "").trim();
  const modo: Modo = MODOS.includes(cuerpo?.modo as Modo) ? (cuerpo!.modo as Modo) : "resolver";
  if (!pregunta) return json({ error: T.comun.errorGenerico }, 400);
  if (pregunta.length > 2000) return json({ error: T.chat.demasiadoLargo }, 400);

  // Límites antes de gastar nada.
  const previo = await conSesion(s, async (tx) => {
    const lim = await estadoPreguntas(tx, alumnoId);
    if (lim.bloqueo) return { limite: lim.bloqueo };
    const op = await oposicionDe(tx, alumnoId);

    let conversacionId = cuerpo?.conversacionId ?? null;
    let nueva = false;
    if (conversacionId) {
      const c = await tx`select id from conversaciones where id = ${conversacionId}`;
      if (c.length === 0) return { noEncontrada: true };
      await tx`update conversaciones set modo = ${modo} where id = ${conversacionId}`;
    } else {
      const c = await tx`insert into conversaciones (alumno_id, modo) values (${alumnoId}, ${modo}) returning id`;
      conversacionId = c[0].id as string;
      nueva = true;
    }

    let mensajeAlumnoId: string;
    if (cuerpo?.reintentarMensajeId) {
      // Reintentar: se reutiliza la pregunta y se quita la respuesta fallida.
      const m = await tx`select id from mensajes where id = ${cuerpo.reintentarMensajeId} and conversacion_id = ${conversacionId} and rol = 'alumno'`;
      if (m.length === 0) return { noEncontrada: true };
      mensajeAlumnoId = m[0].id as string;
      await tx`
        delete from mensajes where conversacion_id = ${conversacionId} and rol = 'asistente'
          and estado in ('error', 'cortado') and creado_at >= (select creado_at from mensajes where id = ${mensajeAlumnoId})`;
    } else {
      const m = await tx`
        insert into mensajes (conversacion_id, alumno_id, rol, texto, modo) values (${conversacionId}, ${alumnoId}, 'alumno', ${pregunta}, ${modo})
        returning id`;
      mensajeAlumnoId = m[0].id as string;
    }
    const historial = await tx`
      select rol, texto, estado from mensajes
      where conversacion_id = ${conversacionId} and creado_at < (select creado_at from mensajes where id = ${mensajeAlumnoId})
      order by creado_at`;
    const contexto = await contextoAlumno(tx, alumnoId);
    return {
      conversacionId,
      nueva,
      mensajeAlumnoId,
      historial: historial as unknown as TurnoPrevio[],
      contexto,
      oposicionId: op?.id ?? null,
      grupoId: op?.grupoId ?? null,
      quedan: lim.quedan,
    };
  });

  if ("limite" in previo) return json({ limite: previo.limite });
  if ("noEncontrada" in previo) return json({ error: T.comun.noEncontrado }, 404);

  const { conversacionId, nueva, mensajeAlumnoId, historial, contexto, grupoId } = previo;
  const mensajeId = crypto.randomUUID();
  const codificador = new TextEncoder();

  const cuerpoRespuesta = new ReadableStream<Uint8Array>({
    async start(controlador) {
      const enviar = (e: EventoChat) => controlador.enqueue(codificador.encode(JSON.stringify(e) + "\n"));
      enviar({ t: "inicio", conversacionId, mensajeAlumnoId, mensajeId });
      let texto = "";
      const citas: Cita[] = [];
      let consumoExtra: Consumo | null = null;
      let msPrimeraLetra: number | null = null;
      try {
        if (await falloForzado()) throw new ErrorIA("Fallo forzado (interruptor de pruebas)", "fallo");
        // La huella de la pregunta se pide a la vez que se prepara la consulta:
        // si la consulta es la pregunta tal cual (lo normal), ya está lista.
        const huellaPregunta = huellaConsulta(pregunta);
        const { consulta, terminos, consumo } = await prepararConsulta(pregunta, historial);
        consumoExtra = consumo;
        const resultados = await comoPersona(alumnoId, (tx) =>
          buscarTemario(tx, consulta, { limite: TROZOS_POR_PREGUNTA, extra: terminos, huella: consulta === pregunta ? huellaPregunta : undefined }),
        );
        let fin: { estado: "ok" | "no_esta" | "cortado"; consumo: Consumo; msPrimeraLetra: number | null } | null = null;
        for await (const ev of responder({ pregunta, modo, historial, contexto, resultados, signal: req.signal })) {
          if (ev.t === "texto") {
            if (msPrimeraLetra === null) msPrimeraLetra = Date.now() - inicioPeticion;
            texto += ev.v;
            enviar(ev);
          } else if (ev.t === "cita") {
            citas.push(ev.cita);
            enviar(ev);
          } else {
            fin = ev;
          }
        }
        if (!fin) throw new ErrorIA("Sin final", "fallo");
        const cuenta = fin.estado === "ok" || fin.estado === "no_esta";
        const quedan = await comoPersona(alumnoId, async (tx) => {
          await tx`
            insert into mensajes (id, conversacion_id, alumno_id, rol, texto, citas, estado, modo, meta)
            values (${mensajeId}, ${conversacionId}, ${alumnoId}, 'asistente', ${fin!.estado === "no_esta" ? "" : texto},
                    ${tx.json(citas as never)}, ${fin!.estado}, ${modo},
                    ${tx.json({ msPrimeraLetra, consulta, terminos } as never)})`;
          await tx`update conversaciones set actualizada_at = now() where id = ${conversacionId}`;
          if (cuenta) {
            const c = fin!.consumo;
            const extra = consumoExtra;
            await tx`
              insert into uso (persona_id, grupo_id, tipo, subtipo, modelo, tokens_entrada, tokens_salida, tokens_cache, coste_usd, ms_primera_letra)
              values (${alumnoId}, ${grupoId}, 'pregunta', ${modo}, ${c.modelo}, ${c.tokensEntrada + (extra?.tokensEntrada ?? 0)},
                      ${c.tokensSalida + (extra?.tokensSalida ?? 0)}, ${c.tokensCache}, ${c.costeUsd + (extra?.costeUsd ?? 0)}, ${msPrimeraLetra})`;
          }
          const l = await estadoPreguntas(tx, alumnoId);
          return l.quedan;
        });
        enviar({ t: "fin", estado: fin.estado, quedan, texto: fin.estado === "no_esta" ? "" : texto, citas });
      } catch (e) {
        const motivo = e instanceof ErrorIA ? e.motivo : "fallo";
        await comoSistema(async (tx) => {
          await tx`insert into errores (tipo, detalle, persona_id) values ('ia', ${`${motivo}: ${(e as Error).message}`.slice(0, 1000)}, ${alumnoId})`;
        }).catch(() => {});
        await comoPersona(alumnoId, (tx) =>
          tx`insert into mensajes (id, conversacion_id, alumno_id, rol, texto, estado, modo)
             values (${mensajeId}, ${conversacionId}, ${alumnoId}, 'asistente', '', 'error', ${modo})`,
        ).catch(() => {});
        enviar({ t: "error", mensaje: t(T.chat.falloIA) });
      } finally {
        controlador.close();
      }
    },
  });

  // Después de contestar: título de la conversación y memoria de las anteriores.
  after(async () => {
    if (nueva) {
      const { titulo, consumo } = await tituloConversacion(pregunta);
      await comoPersona(alumnoId, async (tx) => {
        await tx`update conversaciones set titulo = ${titulo} where id = ${conversacionId} and not titulo_manual`;
        if (consumo) {
          await tx`insert into uso (persona_id, grupo_id, tipo, subtipo, modelo, tokens_entrada, tokens_salida, coste_usd)
                   values (${alumnoId}, ${grupoId}, 'interno', 'titulo', ${consumo.modelo}, ${consumo.tokensEntrada}, ${consumo.tokensSalida}, ${consumo.costeUsd})`;
        }
      });
      await procesarMemoriaPendiente(alumnoId, conversacionId);
    }
  });

  return new Response(cuerpoRespuesta, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
