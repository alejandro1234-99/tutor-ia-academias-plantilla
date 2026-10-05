import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { comoPersona, type Tx } from "../bd";
import { anthropic, calcularConsumo, iaSimulada, MODELO_RAPIDO } from "./modelos";
import { raices } from "./simulada";

// La memoria del asistente sobre cada alumno (SOLUCION.md, sección 10).
// No se reentrena ninguna IA: son notas en frases normales, guardadas en la
// base de datos, como las que tomaría un profesor en una libreta. Las apunta
// Haiku al terminar una conversación y después de cada test, nunca en mitad
// de una respuesta. El alumno las ve, corrige y borra en «Lo que sé de ti».

const MINUTOS_INACTIVIDAD = 20;

const Cambios = z.object({
  nuevas: z
    .array(
      z.object({
        tipo: z.enum(["cuesta", "domina", "preferencia"]),
        texto: z.string().describe("Frase corta y concreta, en español, en tercera persona. Ej.: «Confunde la moción de censura con la cuestión de confianza»"),
        asunto: z.string().describe("El asunto en pocas palabras, para proponerle repasarlo. Ej.: «la moción de censura»"),
      }),
    )
    .describe("Notas nuevas. Como mucho 3. Solo lo que se ha visto con claridad en esta conversación."),
  quitar: z.array(z.string()).describe("Identificadores de notas existentes que esta conversación demuestra que ya no son verdad (por ejemplo, ahora lo domina)."),
});

const INSTRUCCIONES = `Eres el cuaderno de notas de un profesor particular de oposiciones. Lees una conversación entre un alumno y su asistente de estudio y apuntas, en frases normales, lo importante para ayudarle mejor la próxima vez:
- «cuesta»: lo que le cuesta o confunde (sobre todo si en modo examinador ha fallado una pregunta).
- «domina»: lo que ha demostrado que sabe bien (por ejemplo, ha acertado varias preguntas seguidas de un asunto).
- «preferencia»: cómo prefiere que le expliquen (con ejemplos, directo, etc.), solo si lo dice o se nota claramente.
Reglas: frases cortas y concretas, sobre el temario, sin juicios personales, sin datos personales (ni nombres, ni correos, ni salud, ni nada privado). No repitas notas que ya existen. Si no hay nada claro que apuntar, no apuntes nada.`;

export async function procesarConversacion(alumnoId: string, conversacionId: string): Promise<void> {
  await comoPersona(alumnoId, async (tx) => {
    const c = await tx`select id, memoria_procesada_at from conversaciones where id = ${conversacionId}`;
    if (!c[0]) return;
    const mensajes = await tx`
      select rol, texto, estado, modo from mensajes
      where conversacion_id = ${conversacionId} and (${c[0].memoriaProcesadaAt ?? null}::timestamptz is null or creado_at > ${c[0].memoriaProcesadaAt ?? null}::timestamptz)
      order by creado_at`;
    const utiles = mensajes.filter((m) => m.texto && m.estado !== "error");
    if (utiles.filter((m) => m.rol === "alumno").length === 0) {
      await tx`update conversaciones set memoria_procesada_at = now() where id = ${conversacionId}`;
      return;
    }
    const existentes = await tx`select id, tipo, texto from memoria_notas where alumno_id = ${alumnoId} order by actualizada_at desc limit 40`;

    let cambios: z.infer<typeof Cambios>;
    if (iaSimulada() || !process.env.ANTHROPIC_API_KEY) {
      cambios = cambiosSimulados(utiles as never);
    } else {
      const transcripcion = utiles
        .map((m) => `${m.rol === "alumno" ? "ALUMNO" : m.rol === "formador" ? "FORMADOR" : "ASISTENTE"} (${m.modo ?? "resolver"}): ${String(m.texto).slice(0, 1500)}`)
        .join("\n\n");
      const notas = existentes.map((n) => `- [${n.id}] (${n.tipo}) ${n.texto}`).join("\n") || "(ninguna)";
      const formato = zodOutputFormat(Cambios);
      const r = await anthropic().messages.create({
        model: MODELO_RAPIDO,
        max_tokens: 800,
        system: INSTRUCCIONES,
        output_config: { format: { type: formato.type, schema: formato.schema } },
        messages: [{ role: "user", content: `NOTAS QUE YA EXISTEN:\n${notas}\n\nCONVERSACIÓN:\n${transcripcion}` }],
      });
      const texto = r.content.find((b) => b.type === "text");
      cambios = formato.parse(texto && texto.type === "text" ? texto.text : "{}") as z.infer<typeof Cambios>;
      const consumo = calcularConsumo(MODELO_RAPIDO, r.usage);
      await tx`insert into uso (persona_id, tipo, subtipo, modelo, tokens_entrada, tokens_salida, coste_usd)
               values (${alumnoId}, 'interno', 'memoria', ${consumo.modelo}, ${consumo.tokensEntrada}, ${consumo.tokensSalida}, ${consumo.costeUsd})`;
    }
    await aplicarCambios(tx, alumnoId, cambios, "chat");
    await tx`update conversaciones set memoria_procesada_at = now() where id = ${conversacionId}`;
  });
}

async function aplicarCambios(tx: Tx, alumnoId: string, cambios: z.infer<typeof Cambios>, origen: "chat" | "test") {
  for (const id of cambios.quitar.slice(0, 5)) {
    if (/^[0-9a-f-]{36}$/.test(id)) await tx`delete from memoria_notas where id = ${id} and alumno_id = ${alumnoId}`;
  }
  for (const n of cambios.nuevas.slice(0, 3)) {
    const texto = n.texto.trim().slice(0, 300);
    if (!texto) continue;
    const ya = await tx`select id from memoria_notas where alumno_id = ${alumnoId} and lower(texto) = lower(${texto})`;
    if (ya.length) continue;
    await tx`
      insert into memoria_notas (alumno_id, tipo, texto, origen, asunto)
      values (${alumnoId}, ${n.tipo}, ${texto}, ${origen}, ${n.asunto.trim().slice(0, 100) || null})`;
  }
}

/**
 * Procesa las conversaciones que ya han terminado: las que llevan un rato
 * sin mensajes, o todas menos la actual cuando el alumno empieza otra.
 */
export async function procesarMemoriaPendiente(alumnoId: string, salvoConversacion?: string | null): Promise<void> {
  try {
    const pendientes = await comoPersona(
      alumnoId,
      (tx) => tx`
        select c.id from conversaciones c
        where c.alumno_id = ${alumnoId}
          and (${salvoConversacion ?? null}::uuid is null or c.id <> ${salvoConversacion ?? null}::uuid)
          and exists (select 1 from mensajes m where m.conversacion_id = c.id and m.rol = 'alumno'
                      and (c.memoria_procesada_at is null or m.creado_at > c.memoria_procesada_at))
          and (${salvoConversacion ?? null}::uuid is not null or c.actualizada_at < now() - ${MINUTOS_INACTIVIDAD + " minutes"}::interval)
        order by c.actualizada_at limit 3`,
    );
    for (const p of pendientes) await procesarConversacion(alumnoId, p.id as string);
  } catch {
    // La memoria nunca debe estropear lo que está haciendo el alumno.
  }
}

// ---------------------------------------------------------------------
//  Después de cada test: lo que ha fallado, por asunto (sin IA).
// ---------------------------------------------------------------------

export async function apuntarResultadoTest(
  tx: Tx,
  alumnoId: string,
  porAsunto: { asunto: string; aciertos: number; total: number }[],
): Promise<void> {
  for (const a of porAsunto) {
    if (!a.asunto) continue;
    const fallos = a.total - a.aciertos;
    await tx`delete from memoria_notas where alumno_id = ${alumnoId} and origen = 'test' and asunto = ${a.asunto}`;
    if (fallos > 0 && fallos / a.total >= 0.5) {
      await tx`
        insert into memoria_notas (alumno_id, tipo, texto, origen, asunto)
        values (${alumnoId}, 'fallo_test', ${`Falló ${fallos} de ${a.total} ${a.total === 1 ? "pregunta" : "preguntas"} sobre ${a.asunto}`}, 'test', ${a.asunto})`;
    } else if (fallos === 0 && a.total >= 3) {
      await tx`
        insert into memoria_notas (alumno_id, tipo, texto, origen, asunto)
        values (${alumnoId}, 'domina', ${`Acertó las ${a.total} preguntas sobre ${a.asunto}`}, 'test', ${a.asunto})`;
    }
  }
}

// IA simulada (solo pruebas locales): si en modo examinador el alumno
// contestó y el asistente le corrigió, apunta que le cuesta ese asunto.
function cambiosSimulados(mensajes: { rol: string; texto: string; modo: string | null }[]): z.infer<typeof Cambios> {
  const nuevas: z.infer<typeof Cambios>["nuevas"] = [];
  for (let i = 1; i < mensajes.length; i++) {
    const m = mensajes[i];
    if (m.rol === "asistente" && m.modo === "examinador" && /Vamos a comprobarlo/.test(m.texto)) {
      const pregunta = mensajes.slice(0, i).reverse().find((x) => x.rol === "asistente" && /Pregunta:/.test(x.texto));
      const pedido = mensajes.slice(0, i).reverse().find((x) => x.rol === "alumno" && /preg[uú]ntame sobre\s+(.+)/i.test(x.texto));
      const base = pregunta?.texto ?? m.texto;
      const clave = raices(base).find((w) => w.length >= 6) ?? "este asunto";
      const asunto = pedido ? pedido.texto.match(/preg[uú]ntame sobre\s+(.+?)[?.!]*$/i)![1] : `lo relacionado con «${clave}»`;
      nuevas.push({ tipo: "cuesta", texto: `Le cuesta ${asunto}`, asunto });
    }
  }
  return { nuevas: nuevas.slice(0, 1), quitar: [] };
}
