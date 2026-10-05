import "server-only";
import { config } from "@/configuracion";
import type { Tx } from "./bd";
import type { Limite } from "@/tipos/chat";

// Límites de uso (SOLUCION.md, sección 7): preguntas al día y materiales al
// mes por persona, y el tope del mes de toda la academia. Lo que falla por
// culpa nuestra no se apunta, así que no cuenta.

async function ajusteNumero(tx: Tx, clave: string, porDefecto: number): Promise<number> {
  const f = await tx`select academia.ajuste(${clave}) as v`;
  const v = f[0]?.v;
  return typeof v === "number" ? v : porDefecto;
}

export type EstadoLimite = {
  usados: number;
  limite: number;
  quedan: number;
  academiaUsados: number;
  academiaTope: number;
  bloqueo: Limite | null;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function primeroDelMesQueViene(): string {
  const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const m = (ahora.getMonth() + 1) % 12;
  return `el 1 de ${MESES[m]}`;
}

export async function estadoPreguntas(tx: Tx, personaId: string): Promise<EstadoLimite> {
  const f = await tx`
    select p.limite_preguntas_dia,
           (select count(*)::int from academia.uso u where u.persona_id = p.id and u.tipo = 'pregunta' and u.fecha = academia.hoy_madrid()) as usadas,
           academia.uso_academia_mes('pregunta') as academia
    from academia.personas p where p.id = ${personaId}`;
  const limite = (f[0]?.limitePreguntasDia as number | null) ?? (await ajusteNumero(tx, "limites.preguntasAlDia", config.limites.preguntasAlDia));
  const tope = await ajusteNumero(tx, "limites.topeAcademiaPreguntasMes", config.limites.topeAcademiaPreguntasMes);
  const usados = Number(f[0]?.usadas ?? 0);
  const academiaUsados = Number(f[0]?.academia ?? 0);
  let bloqueo: Limite | null = null;
  if (academiaUsados >= tope) {
    bloqueo = { tipo: "preguntas", motivo: "academia", usados: academiaUsados, limite: tope, vuelve: primeroDelMesQueViene() };
  } else if (usados >= limite) {
    bloqueo = { tipo: "preguntas", motivo: "alumno", usados, limite, vuelve: "mañana a las 00:00" };
  }
  return { usados, limite, quedan: Math.max(0, limite - usados), academiaUsados, academiaTope: tope, bloqueo };
}

export async function estadoMateriales(tx: Tx, personaId: string, esFormador: boolean): Promise<EstadoLimite> {
  const f = await tx`
    select p.limite_materiales_mes, academia.mis_materiales_mes() as usados, academia.uso_academia_mes('material') as academia
    from academia.personas p where p.id = ${personaId}`;
  const porDefecto = esFormador ? config.limites.materialesFormadorAlMes : config.limites.materialesAlMes;
  const clave = esFormador ? "limites.materialesFormadorAlMes" : "limites.materialesAlMes";
  const limite = (f[0]?.limiteMaterialesMes as number | null) ?? (await ajusteNumero(tx, clave, porDefecto));
  const tope = await ajusteNumero(tx, "limites.topeAcademiaMaterialesMes", config.limites.topeAcademiaMaterialesMes);
  const usados = Number(f[0]?.usados ?? 0);
  const academiaUsados = Number(f[0]?.academia ?? 0);
  let bloqueo: Limite | null = null;
  if (academiaUsados >= tope) {
    bloqueo = { tipo: "materiales", motivo: "academia", usados: academiaUsados, limite: tope, vuelve: primeroDelMesQueViene() };
  } else if (usados >= limite) {
    bloqueo = { tipo: "materiales", motivo: "alumno", usados, limite, vuelve: primeroDelMesQueViene() };
  }
  return { usados, limite, quedan: Math.max(0, limite - usados), academiaUsados, academiaTope: tope, bloqueo };
}
