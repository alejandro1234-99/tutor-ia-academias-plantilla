import "server-only";
import { config } from "@/configuracion";
import { T, t } from "@/textos";
import { comoPersona, comoSistema, type Tx } from "./bd";
import { enviarCorreo, plantilla, urlWeb } from "./correo";
import { procesarMemoriaPendiente } from "./ia/memoria";
import { completarHuellas, indexarNotas } from "./temario";

// Las tareas que se hacen solas (SOLUCION.md, sección 15 y 18): se lanzan
// una vez al día (o a mano, en la dirección de pruebas).

type Informe = Record<string, number>;

function madrid() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const semana = `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, "0")}-${String(lunes.getDate()).padStart(2, "0")}`;
  return { hora: d.getHours(), diaSemana: d.getDay(), fecha, semana, mes: fecha.slice(0, 7) };
}

/** Apunta un aviso; devuelve false si ya se había enviado (para no repetir). */
async function primeraVez(tx: Tx, clave: string): Promise<boolean> {
  const f = await tx`insert into avisos_enviados (clave) values (${clave}) on conflict do nothing returning clave`;
  return f.length > 0;
}

async function recordatorios(inf: Informe) {
  const dias = config.avisos.diasParaRecordatorio;
  const alumnos = await comoSistema(
    (tx) => tx`
      select p.id, p.correo, (p.ultimo_acceso_at at time zone 'Europe/Madrid')::date as desde,
             (academia.hoy_madrid() - (p.ultimo_acceso_at at time zone 'Europe/Madrid')::date) as dias
      from personas p left join preferencias pr on pr.persona_id = p.id
      where p.es_alumno and p.estado = 'activa' and p.ultimo_acceso_at is not null
        and p.ultimo_acceso_at < now() - ${dias + " days"}::interval
        and coalesce(pr.recordatorio, true)`,
  );
  for (const a of alumnos) {
    // Uno solo hasta que vuelva: la clave lleva el día de su último acceso.
    const nuevo = await comoSistema((tx) => primeraVez(tx, `recordatorio:${a.id}:${a.desde}`));
    if (!nuevo) continue;
    const c = T.correos.recordatorio;
    const { html, texto } = plantilla({
      titulo: t(c.titulo),
      bloques: [{ tipo: "parrafo", texto: t(c.texto, { dias: Number(a.dias) }) }],
      boton: { texto: c.boton, url: `${urlWeb()}/estudio/repasar` },
      pieExtra: T.correos.pieDesactivar,
    });
    await enviarCorreo({ para: a.correo as string, personaId: a.id as string, tipo: "recordatorio", asunto: t(c.asunto), html, texto });
    inf.recordatorios = (inf.recordatorios ?? 0) + 1;
  }
}

async function dudasPendientes(inf: Informe, fecha: string) {
  const formadores = await comoSistema(
    (tx) => tx`
      select p.id, p.correo, count(d.id)::int as n
      from personas p
      join formador_grupos fg on fg.formador_id = p.id
      join dudas d on d.grupo_id = fg.grupo_id and d.estado = 'pendiente'
      left join preferencias pr on pr.persona_id = p.id
      where p.es_formador and p.estado <> 'baja' and coalesce(pr.avisos_formador, true)
      group by p.id, p.correo`,
  );
  for (const f of formadores) {
    if (!(await comoSistema((tx) => primeraVez(tx, `dudas:${f.id}:${fecha}`)))) continue;
    const c = T.correos.dudasPendientes;
    const { html, texto } = plantilla({
      titulo: c.titulo,
      bloques: [{ tipo: "parrafo", texto: t(c.texto, { n: f.n as number }) }],
      boton: { texto: c.boton, url: `${urlWeb()}/formador/dudas` },
      pieExtra: T.correos.pieDesactivar,
    });
    await enviarCorreo({ para: f.correo as string, personaId: f.id as string, tipo: "dudas_pendientes", asunto: t(c.asunto, { n: f.n as number }), html, texto });
    inf.dudas = (inf.dudas ?? 0) + 1;
  }
}

async function resumenSemanal(inf: Informe, semana: string) {
  const destinatarios = await comoSistema(
    (tx) => tx`
      select p.id, p.correo, p.es_dueno from personas p left join preferencias pr on pr.persona_id = p.id
      where (p.es_dueno or (p.es_formador and coalesce(pr.avisos_formador, true))) and p.estado <> 'baja'`,
  );
  const hace7 = (() => {
    const d = new Date(Date.now() - 7 * 86400000);
    return d.toISOString().slice(0, 10);
  })();
  for (const p of destinatarios) {
    if (!(await comoSistema((tx) => primeraVez(tx, `semanal:${p.id}:${semana}`)))) continue;
    // Las cuentas se hacen con los permisos de quien recibe el resumen.
    const datos = await comoPersona(p.id as string, async (tx) => {
      const uso = (await tx`select academia.metricas_uso(${hace7}::date, null, ${p.esDueno as boolean}, ${config.privacidad.minimoAlumnosParaSumar}) as d`)[0].d as {
        suficientes: boolean;
        activos?: number;
        preguntas?: number;
        materiales?: number;
      };
      const riesgo = await tx`
        select count(*)::int as n from personas where es_alumno and estado = 'activa'
          and grupo_id = any(academia.alcance_metricas(null, ${p.esDueno as boolean}))
          and (ultimo_acceso_at is null or ultimo_acceso_at < now() - ${config.avisos.diasParaRiesgo + " days"}::interval)`;
      return { uso, riesgo: Number(riesgo[0].n) };
    });
    const c = T.correos.resumenSemanal;
    const bloques = datos.uso.suficientes
      ? [
          { tipo: "cifra" as const, etiqueta: c.activos, valor: String(datos.uso.activos) },
          { tipo: "cifra" as const, etiqueta: c.preguntas, valor: String(datos.uso.preguntas) },
          { tipo: "cifra" as const, etiqueta: c.materiales, valor: String(datos.uso.materiales) },
          { tipo: "cifra" as const, etiqueta: c.riesgo, valor: String(datos.riesgo) },
        ]
      : [{ tipo: "parrafo" as const, texto: c.pocosDatos }, { tipo: "cifra" as const, etiqueta: c.riesgo, valor: String(datos.riesgo) }];
    const { html, texto } = plantilla({ titulo: c.titulo, bloques, boton: { texto: c.boton, url: `${urlWeb()}/metricas/uso` } });
    await enviarCorreo({ para: p.correo as string, personaId: p.id as string, tipo: "resumen_semanal", asunto: t(c.asunto), html, texto });
    inf.semanal = (inf.semanal ?? 0) + 1;
  }
}

async function cercaDelLimite(inf: Informe, mes: string) {
  const d = await comoSistema(async (tx) => {
    const usos = await tx`select tipo, count(*)::int as n from uso where mes = ${mes} and tipo in ('pregunta', 'material') group by tipo`;
    const aj = await tx`select clave, valor from ajustes where clave in ('limites.topeAcademiaPreguntasMes', 'limites.topeAcademiaMaterialesMes')`;
    const duenos = await tx`select id, correo from personas where es_dueno and estado <> 'baja'`;
    return { usos, aj, duenos };
  });
  const tope = (k: string, def: number) => {
    const v = d.aj.find((a) => a.clave === k)?.valor;
    return typeof v === "number" ? v : def;
  };
  const casos = [
    { tipo: "pregunta", que: "preguntas", tope: tope("limites.topeAcademiaPreguntasMes", config.limites.topeAcademiaPreguntasMes) },
    { tipo: "material", que: "materiales", tope: tope("limites.topeAcademiaMaterialesMes", config.limites.topeAcademiaMaterialesMes) },
  ];
  for (const caso of casos) {
    const usado = Number(d.usos.find((u) => u.tipo === caso.tipo)?.n ?? 0);
    const pct = caso.tope ? (usado / caso.tope) * 100 : 0;
    for (const umbral of [80, 100]) {
      if (pct < umbral) continue;
      if (!(await comoSistema((tx) => primeraVez(tx, `tope${umbral}:${caso.tipo}:${mes}`)))) continue;
      const c = T.correos.cercaLimite;
      for (const du of d.duenos) {
        const { html, texto } = plantilla({
          titulo: c.titulo,
          bloques: [{ tipo: "parrafo", texto: t(c.texto, { usado: usado.toLocaleString("es-ES"), tope: caso.tope.toLocaleString("es-ES"), que: caso.que }) }],
          boton: { texto: c.boton, url: `${urlWeb()}/ajustes/consumo` },
        });
        await enviarCorreo({ para: du.correo as string, personaId: du.id as string, tipo: `tope_${umbral}`, asunto: t(c.asunto, { pct: umbral, que: caso.que }), html, texto });
      }
      inf.tope = (inf.tope ?? 0) + 1;
    }
  }
}

async function cuentasCompartidas(inf: Informe, fecha: string) {
  const sospechosas = await comoSistema(
    (tx) => tx`
      select p.id, p.nombre, p.correo, count(distinct s.ciudad)::int as n, string_agg(distinct s.ciudad, ', ') as ciudades
      from sesiones s join personas p on p.id = s.persona_id
      where s.cerrada_at is null and s.expira_at > now() and s.ultima_at > now() - interval '30 minutes' and s.ciudad is not null
      group by p.id, p.nombre, p.correo having count(distinct s.ciudad) >= 3`,
  );
  const duenos = sospechosas.length ? await comoSistema((tx) => tx`select id, correo from personas where es_dueno and estado <> 'baja'`) : [];
  for (const x of sospechosas) {
    if (!(await comoSistema((tx) => primeraVez(tx, `compartida:${x.id}:${fecha}`)))) continue;
    const c = T.correos.cuentaCompartida;
    for (const du of duenos) {
      const { html, texto } = plantilla({
        titulo: c.titulo,
        bloques: [{ tipo: "parrafo", texto: t(c.texto, { nombre: x.nombre as string, correo: x.correo as string, n: x.n as number, ciudades: x.ciudades as string }) }],
        boton: { texto: c.boton, url: `${urlWeb()}/formador/alumnos` },
      });
      await enviarCorreo({ para: du.correo as string, personaId: du.id as string, tipo: "cuenta_compartida", asunto: t(c.asunto), html, texto });
    }
    inf.compartidas = (inf.compartidas ?? 0) + 1;
  }
}

async function borradoYLimpieza(inf: Informe) {
  await comoSistema(async (tx) => {
    // Borrado de verdad a los 30 días de la baja (SOLUCION.md, sección 18).
    const b = await tx`delete from personas where estado = 'baja' and borrar_desde is not null and borrar_desde < now() and not es_dueno returning id`;
    inf.borrados = b.length;
    await tx`delete from limites_peticiones where ventana < now() - interval '1 day'`;
    await tx`delete from enlaces_entrada where creado_at < now() - interval '7 days'`;
    await tx`delete from sesiones where expira_at < now() - interval '1 day' or (cerrada_at is not null and cerrada_at < now() - interval '7 days')`;
    await tx`delete from correos_enviados where enviado_at < now() - interval '3 months'`;
    await tx`delete from accesos where at < now() - interval '1 year'`;
    await tx`delete from soporte_entradas where empezada_at < now() - interval '1 year'`;
    await tx`delete from solicitudes_ayuda where creada_at < now() - interval '1 year'`;
    await tx`delete from dudas where creada_at < now() - interval '1 year' and estado <> 'pendiente'`;
    await tx`delete from errores where at < now() - interval '90 days'`;
    await tx`delete from resumenes_ia where generado_at < now() - interval '7 days'`;
    await tx`delete from buzon_pruebas where creado_at < now() - interval '7 days'`;
    await tx`delete from avisos_enviados where enviado_at < now() - interval '400 days'`;
    // El detalle del consumo por alumno se guarda 3 meses; el total del mes, siempre.
    await tx`update uso set persona_id = null where creado_at < now() - interval '3 months' and persona_id is not null`;
  });
}

async function memoria(inf: Informe) {
  const alumnos = await comoSistema(
    (tx) => tx`
      select distinct c.alumno_id from conversaciones c
      where c.actualizada_at < now() - interval '20 minutes'
        and exists (select 1 from mensajes m where m.conversacion_id = c.id and m.rol = 'alumno' and (c.memoria_procesada_at is null or m.creado_at > c.memoria_procesada_at))
      limit 50`,
  );
  for (const a of alumnos) await procesarMemoriaPendiente(a.alumnoId as string);
  inf.memoria = alumnos.length;
}

/** La revisión de avisos. forzar=true lanza todo sin mirar la hora (pruebas). */
export async function revisarAvisos(forzar = false): Promise<Informe> {
  const inf: Informe = {};
  const m = madrid();
  await recordatorios(inf);
  if (forzar || m.hora >= 9) await dudasPendientes(inf, m.fecha);
  if (forzar || (m.diaSemana === 1 && m.hora >= 8)) await resumenSemanal(inf, m.semana);
  await cercaDelLimite(inf, m.mes);
  await cuentasCompartidas(inf, m.fecha);
  await borradoYLimpieza(inf);
  await memoria(inf);
  await indexarNotas();
  await completarHuellas(2000).catch(() => 0);
  return inf;
}
