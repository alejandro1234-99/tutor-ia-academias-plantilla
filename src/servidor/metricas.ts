import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { config } from "@/configuracion";
import { comoSistema, type Tx } from "./bd";
import type { PapelGestion } from "./gestion";
import { anthropic, calcularConsumo, iaSimulada, MODELO_RAPIDO } from "./ia/modelos";
import { raices } from "./ia/simulada";

// Métricas (SOLUCION.md, sección 12). Filtros: periodo (7, 30 o 90 días) y,
// para el dueño, oposición, grupo y formador. El formador solo ve sus grupos.

export type Filtros = { dias: 7 | 30 | 90; oposicion: string | null; grupo: string | null; formador: string | null };
export type Opciones = { oposiciones: { id: string; nombre: string }[]; grupos: { id: string; nombre: string; oposicionId: string }[]; formadores: { id: string; nombre: string }[] };

const UUID = /^[0-9a-f-]{36}$/i;

export function leerFiltros(sp: Record<string, string | undefined>): Filtros {
  const d = Number(sp.periodo);
  return {
    dias: d === 7 || d === 90 ? d : 30,
    oposicion: sp.oposicion && UUID.test(sp.oposicion) ? sp.oposicion : null,
    grupo: sp.grupo && UUID.test(sp.grupo) ? sp.grupo : null,
    formador: sp.formador && UUID.test(sp.formador) ? sp.formador : null,
  };
}

export function consulta(f: Filtros): string {
  const u = new URLSearchParams();
  u.set("periodo", String(f.dias));
  if (f.oposicion) u.set("oposicion", f.oposicion);
  if (f.grupo) u.set("grupo", f.grupo);
  if (f.formador) u.set("formador", f.formador);
  return u.toString();
}

export async function opcionesFiltro(tx: Tx, papel: PapelGestion): Promise<Opciones> {
  const dueno = papel === "dueno";
  const grupos = dueno
    ? await tx`select id, nombre, oposicion_id from grupos where not archivado order by nombre`
    : await tx`select id, nombre, oposicion_id from grupos where not archivado and id = any(academia.mis_grupos()) order by nombre`;
  return {
    oposiciones: dueno ? (await tx`select id, nombre from oposiciones order by orden`).map((o) => ({ id: o.id as string, nombre: o.nombre as string })) : [],
    grupos: grupos.map((g) => ({ id: g.id as string, nombre: g.nombre as string, oposicionId: g.oposicionId as string })),
    formadores: dueno
      ? (await tx`select id, nombre from personas where es_formador and estado <> 'baja' order by nombre`).map((p) => ({ id: p.id as string, nombre: p.nombre as string }))
      : [],
  };
}

/** Los grupos que piden los filtros (luego la base de datos los recorta al alcance de cada uno). */
export async function gruposFiltrados(tx: Tx, f: Filtros, o: Opciones): Promise<string[] | null> {
  let grupos = o.grupos;
  if (f.oposicion) grupos = grupos.filter((g) => g.oposicionId === f.oposicion);
  if (f.grupo) grupos = grupos.filter((g) => g.id === f.grupo);
  if (f.formador) {
    const suyos = (await tx`select grupo_id from formador_grupos where formador_id = ${f.formador}`).map((x) => x.grupoId as string);
    grupos = grupos.filter((g) => suyos.includes(g.id));
  }
  return grupos.map((g) => g.id);
}

export function desde(f: Filtros): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  d.setDate(d.getDate() - f.dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const MINIMO = config.privacidad.minimoAlumnosParaSumar;

// ---------------------------------------------------------------------
//  Dudas agrupadas por asunto (redactadas por la IA, nunca la frase de un
//  alumno). Se guardan un rato para no pagar la IA en cada visita.
// ---------------------------------------------------------------------

export type Asunto = { asunto: string; tema: number | null; dudas: number; alumnos: number };

const Agrupado = z.object({
  asuntos: z.array(
    z.object({
      asunto: z.string().describe("El asunto redactado por ti, corto y general, como un epígrafe. Nunca copies la frase de un alumno. Ej.: «Plazos del recurso de alzada»"),
      preguntas: z.array(z.number().int()).describe("Números de las preguntas que tratan de ese asunto"),
    }),
  ),
});

export async function agruparPreguntas(filas: { texto: string; alumno: string; tema: number | null }[], clave: string): Promise<Asunto[]> {
  if (filas.length === 0) return [];
  const huella = createHash("sha256").update(clave + "|" + filas.map((f) => f.texto).join("\n")).digest("hex");
  const cache = await comoSistema((tx) => tx`select contenido from resumenes_ia where clave = ${huella} and generado_at > now() - interval '6 hours'`);
  if (cache[0]) return cache[0].contenido as Asunto[];

  let grupos: { asunto: string; preguntas: number[] }[];
  if (iaSimulada() || !process.env.ANTHROPIC_API_KEY) {
    // Sin IA: por la palabra más repetida (solo para probar).
    const porPalabra = new Map<string, number[]>();
    filas.forEach((f, i) => {
      const w = raices(f.texto).find((x) => x.length >= 5) ?? "otros";
      porPalabra.set(w, [...(porPalabra.get(w) ?? []), i]);
    });
    grupos = [...porPalabra.entries()].map(([w, preguntas]) => ({ asunto: w === "otros" ? "Otros asuntos" : `Asuntos sobre «${w}…»`, preguntas }));
  } else {
    const formato = zodOutputFormat(Agrupado);
    const r = await anthropic().messages.create({
      model: MODELO_RAPIDO,
      max_tokens: 4000,
      system:
        "Agrupas las preguntas que hacen los alumnos de una academia de oposiciones en asuntos de estudio. Redacta cada asunto tú, corto y general (como un epígrafe del temario). Nunca copies ni parafrasees de cerca la frase de un alumno, ni incluyas nada personal. Entre 3 y 15 asuntos; lo que no encaje, en «Otros asuntos».",
      output_config: { format: { type: formato.type, schema: formato.schema } },
      messages: [{ role: "user", content: filas.map((f, i) => `${i}. ${f.texto.slice(0, 300)}`).join("\n") }],
    });
    const t = r.content.find((b) => b.type === "text");
    grupos = (formato.parse(t && t.type === "text" ? t.text : '{"asuntos":[]}') as z.infer<typeof Agrupado>).asuntos;
    const c = calcularConsumo(MODELO_RAPIDO, r.usage);
    await comoSistema(
      (tx) => tx`insert into uso (tipo, subtipo, modelo, tokens_entrada, tokens_salida, coste_usd) values ('interno', 'agrupar', ${c.modelo}, ${c.tokensEntrada}, ${c.tokensSalida}, ${c.costeUsd})`,
    );
  }

  const asuntos: Asunto[] = grupos
    .map((g) => {
      const sel = g.preguntas.filter((i) => i >= 0 && i < filas.length).map((i) => filas[i]);
      const temas = sel.map((s) => s.tema).filter((x): x is number => x !== null);
      const tema = temas.length ? temas.sort((a, b) => temas.filter((x) => x === b).length - temas.filter((x) => x === a).length)[0] : null;
      return { asunto: g.asunto, tema, dudas: sel.length, alumnos: new Set(sel.map((s) => s.alumno)).size };
    })
    .filter((a) => a.dudas > 0)
    .sort((a, b) => b.dudas - a.dudas);
  await comoSistema(
    (tx) => tx`insert into resumenes_ia (clave, contenido) values (${huella}, ${tx.json(asuntos as never)})
               on conflict (clave) do update set contenido = excluded.contenido, generado_at = now()`,
  );
  return asuntos;
}

// ---------------------------------------------------------------------
//  Los datos de cada sección (los usan la pantalla y el Excel, así que
//  salen siempre iguales).
// ---------------------------------------------------------------------

export type Contexto = { filtros: Filtros; opciones: Opciones; grupos: string[] | null; desde: string; esDueno: boolean };

export async function contextoMetricas(tx: Tx, papel: PapelGestion, sp: Record<string, string | undefined>): Promise<Contexto> {
  const filtros = leerFiltros(sp);
  const opciones = await opcionesFiltro(tx, papel);
  const grupos = await gruposFiltrados(tx, filtros, opciones);
  return { filtros, opciones, grupos, desde: desde(filtros), esDueno: papel === "dueno" };
}

export type DatosUso = { suficientes: boolean; alumnos: number; activos?: number; preguntas?: number; materiales?: number; mapa?: { dia: number; hora: number; n: number }[] };

export async function datosUso(tx: Tx, c: Contexto): Promise<DatosUso> {
  const f = await tx`select academia.metricas_uso(${c.desde}::date, ${c.grupos}::uuid[], ${c.esDueno}, ${MINIMO}) as d`;
  return f[0].d as DatosUso;
}

export async function datosDudas(tx: Tx, c: Contexto) {
  const activos = Number((await tx`select academia.metricas_activos(${c.desde}::date, ${c.grupos}::uuid[], ${c.esDueno}) as n`)[0].n);
  if (activos < MINIMO) return { suficientes: false as const };
  const preguntas = await tx`select * from academia.metricas_preguntas(${c.desde}::date, ${c.grupos}::uuid[], ${c.esDueno}, false, 400)`;
  const noEsta = await tx`select * from academia.metricas_preguntas(${c.desde}::date, ${c.grupos}::uuid[], ${c.esDueno}, true, 200)`;
  const atascos = (await tx`select academia.metricas_atascos(${c.desde}::date, ${c.grupos}::uuid[], ${c.esDueno}, ${MINIMO}) as d`)[0].d as {
    suficientes: boolean;
    temas?: { tema: number; nombre: string; dudas: number; fallosPct: number | null }[];
  };
  const clave = `${c.esDueno}|${consulta(c.filtros)}`;
  const aFilas = (x: typeof preguntas) => x.map((p) => ({ texto: p.texto as string, alumno: p.alumno as string, tema: p.tema === null ? null : Number(p.tema) }));
  return {
    suficientes: true as const,
    frecuentes: await agruparPreguntas(aFilas(preguntas), "frecuentes|" + clave),
    falta: await agruparPreguntas(aFilas(noEsta), "falta|" + clave),
    atascos,
  };
}

export type Riesgo = { id: string; nombre: string; correo: string; grupo: string; dias: number | null };

export async function datosRiesgo(tx: Tx, c: Contexto): Promise<Riesgo[]> {
  const f = await tx`
    select p.id, p.nombre, p.correo, g.nombre as grupo,
           case when p.ultimo_acceso_at is null then null
                else (academia.hoy_madrid() - (p.ultimo_acceso_at at time zone 'Europe/Madrid')::date) end as dias
    from personas p join grupos g on g.id = p.grupo_id
    where p.es_alumno and p.estado = 'activa'
      and p.grupo_id = any(academia.alcance_metricas(${c.grupos}::uuid[], ${c.esDueno}))
      and (p.ultimo_acceso_at is null or p.ultimo_acceso_at < now() - ${config.avisos.diasParaRiesgo + " days"}::interval)
    order by p.ultimo_acceso_at nulls first`;
  return f.map((r) => ({ id: r.id as string, nombre: r.nombre as string, correo: r.correo as string, grupo: r.grupo as string, dias: r.dias === null ? null : Number(r.dias) }));
}

export type ProgresoGrupo = { grupo: string; suficientes: boolean; tests: number | null; nota: number | null; temas: { tema: number; pct: number }[] | null };

export async function datosProgreso(tx: Tx, c: Contexto): Promise<ProgresoGrupo[]> {
  const f = await tx`select academia.metricas_progreso(${c.desde}::date, ${c.grupos}::uuid[], ${c.esDueno}, ${MINIMO}) as d`;
  return f[0].d as ProgresoGrupo[];
}

export async function datosMaterial(tx: Tx, c: Contexto) {
  const f = await tx`select academia.metricas_material(${c.desde}::date, ${c.grupos}::uuid[], ${c.esDueno}, ${MINIMO}) as d`;
  return f[0].d as { suficientes: boolean; formatos?: { formato: string; estilo: string; creados: number; valorados: number; noSirvio: number }[] };
}

export async function nombresTemas(tx: Tx): Promise<Map<number, string>> {
  const f = await tx`select numero, coalesce(nombre_corto, nombre) as nombre from temas where version_actual_id is not null`;
  return new Map(f.map((x) => [Number(x.numero), x.nombre as string]));
}
