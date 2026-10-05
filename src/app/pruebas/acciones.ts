"use server";

import { revalidatePath } from "next/cache";
import { comoSistema } from "@/servidor/bd";
import { entornoPruebas } from "@/servidor/pruebas";
import { revisarAvisos } from "@/servidor/tareas";

// Palancas de la dirección de pruebas (PLAN.md: «yo enciendo un interruptor…»).
// En la web publicada no existen.

function comprobar() {
  if (!entornoPruebas()) throw new Error("Solo en la dirección de pruebas.");
}

async function idDe(correo: string): Promise<string | null> {
  const f = await comoSistema((tx) => tx`select id from personas where correo = ${correo.trim().toLowerCase()}`);
  return (f[0]?.id as string) ?? null;
}

export async function interruptorFalloIA(encender: boolean) {
  comprobar();
  await comoSistema((tx) => tx`insert into ajustes (clave, valor) values ('pruebas.fallo_ia', ${tx.json(encender)}) on conflict (clave) do update set valor = excluded.valor`);
  revalidatePath("/pruebas");
}

export async function gastarPreguntas(correo: string, n: number) {
  comprobar();
  const id = await idDe(correo);
  if (!id) return { ok: false };
  await comoSistema(async (tx) => {
    await tx`delete from uso where persona_id = ${id} and tipo = 'pregunta' and fecha = academia.hoy_madrid()`;
    for (let i = 0; i < n; i++) await tx`insert into uso (persona_id, tipo, subtipo, modelo) values (${id}, 'pregunta', 'pruebas', 'pruebas')`;
  });
  return { ok: true };
}

export async function adelantarUnDia(correo: string) {
  comprobar();
  const id = await idDe(correo);
  if (!id) return { ok: false };
  // «Adelantar el reloj» de una persona = mover sus fechas un día atrás.
  await comoSistema(async (tx) => {
    await tx`update tarjetas_repaso set proxima = proxima - 1 where alumno_id = ${id}`;
    await tx`update preguntas_falladas set proxima = proxima - 1, fallada_at = fallada_at - interval '1 day' where alumno_id = ${id}`;
  });
  return { ok: true };
}

export async function diasSinEntrar(correo: string, dias: number) {
  comprobar();
  const id = await idDe(correo);
  if (!id) return { ok: false };
  await comoSistema(async (tx) => {
    await tx`update personas set ultimo_acceso_at = now() - ${dias + " days"}::interval - interval '1 hour' where id = ${id}`;
    await tx`update sesiones set cerrada_at = now() where persona_id = ${id} and cerrada_at is null`;
  });
  return { ok: true };
}

export async function racha(correo: string, dias: number, hueco: boolean) {
  comprobar();
  const id = await idDe(correo);
  if (!id) return { ok: false };
  await comoSistema(async (tx) => {
    await tx`delete from actividad where persona_id = ${id}`;
    for (let d = 0; d < dias; d++) {
      if (hueco && d === 1) continue;
      await tx`insert into actividad (persona_id, fecha) values (${id}, academia.hoy_madrid() - ${d}::int) on conflict do nothing`;
    }
  });
  return { ok: true };
}

export async function consumoAcademia(pct: number) {
  comprobar();
  await comoSistema(async (tx) => {
    await tx`delete from uso where subtipo = 'pruebas-consumo'`;
    const tope = Number((await tx`select valor from ajustes where clave = 'limites.topeAcademiaPreguntasMes'`)[0]?.valor ?? 0) || 5000;
    const ya = Number((await tx`select count(*)::int as n from uso where tipo = 'pregunta' and mes = academia.mes_madrid()`)[0].n);
    const faltan = Math.max(0, Math.ceil((tope * pct) / 100) - ya);
    await tx`insert into uso (tipo, subtipo, modelo) select 'pregunta', 'pruebas-consumo', 'pruebas' from generate_series(1, ${faltan})`;
  });
  return { ok: true };
}

export async function lanzarAvisos() {
  comprobar();
  return revisarAvisos(true);
}
