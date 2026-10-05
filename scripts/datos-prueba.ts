// Carga los DATOS DE PRUEBA en la base de datos (nunca en la de un cliente).
//
//   npm run db:datos-prueba                 → academia, personas y temario
//   npm run db:datos-prueba -- --sin-temario
//   npm run db:datos-prueba -- --actividad  → además, 90 días de actividad inventada
//
// Academia Temario Claro (SOLUCION.md, sección 4, y PLAN.md):
//   Elena Robles  · dueña y formadora de «Tardes»
//   Andrés Molina · formador de «Mañanas»
//   Lucía, Pablo Serrano (9 días sin entrar) y 3 más en «Mañanas»
//   Marta Gil (12 días sin entrar) y 4 más en «Tardes»
//   Nerea Blanco, en «Tardes», sin estrenar (para probar la primera vez)
//
// Correos: si en .env.local está CORREO_PRUEBAS_BASE=tucorreo@dominio.com,
// cada persona usa tucorreo+lucia@dominio.com (todos te llegan a ti). Si no,
// usan @example.com, que no llega a nadie (se ven en el buzón de pruebas).

import fs from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { config } from "@/configuracion";
import { comoSistema } from "@/servidor/bd";
import { crearVersion, guardarPaginas, guardarParteArchivo, indexarYTerminar } from "@/servidor/temario";
import { analizarPaginas, leerPaginasCrudas } from "@/temario/procesar";

const args = new Set(process.argv.slice(2));
const raiz = process.cwd();

function correoDe(alias: string): string {
  const base = process.env.CORREO_PRUEBAS_BASE?.trim();
  if (base && base.includes("@")) {
    const [usuario, dominio] = base.split("@");
    return `${usuario}+${alias}@${dominio}`;
  }
  return `${alias}@example.com`;
}

type PersonaPrueba = {
  alias: string;
  nombre: string;
  llamar?: string;
  alumno?: boolean;
  formador?: boolean;
  dueno?: boolean;
  grupo?: string;
  diasSinEntrar?: number;
  sinEstrenar?: boolean;
  formadorDe?: string[];
};

const TEMARIO_CLARO = {
  grupos: ["Mañanas", "Tardes"],
  personas: [
    { alias: "elena", nombre: "Elena Robles", dueno: true, formador: true, formadorDe: ["Tardes"] },
    { alias: "andres", nombre: "Andrés Molina", formador: true, formadorDe: ["Mañanas"] },
    { alias: "lucia", nombre: "Lucía Fernández Ortega", llamar: "Lucía", alumno: true, grupo: "Mañanas", diasSinEntrar: 0 },
    { alias: "pablo", nombre: "Pablo Serrano", llamar: "Pablo", alumno: true, grupo: "Mañanas", diasSinEntrar: 9 },
    { alias: "sara", nombre: "Sara Núñez Rey", llamar: "Sara", alumno: true, grupo: "Mañanas", diasSinEntrar: 1 },
    { alias: "diego", nombre: "Diego Campos Luna", llamar: "Diego", alumno: true, grupo: "Mañanas", diasSinEntrar: 2 },
    { alias: "laura", nombre: "Laura Méndez Gil", llamar: "Laura", alumno: true, grupo: "Mañanas", diasSinEntrar: 3 },
    { alias: "marta", nombre: "Marta Gil", llamar: "Marta", alumno: true, grupo: "Tardes", diasSinEntrar: 12 },
    { alias: "hugo", nombre: "Hugo Ramos Díaz", llamar: "Hugo", alumno: true, grupo: "Tardes", diasSinEntrar: 1 },
    { alias: "paula", nombre: "Paula Vidal Soto", llamar: "Paula", alumno: true, grupo: "Tardes", diasSinEntrar: 2 },
    { alias: "ivan", nombre: "Iván Soto Pardo", llamar: "Iván", alumno: true, grupo: "Tardes", diasSinEntrar: 4 },
    { alias: "nerea", nombre: "Nerea Blanco Ruiz", alumno: true, grupo: "Tardes", sinEstrenar: true },
  ] as PersonaPrueba[],
  temario: [
    { numero: 1, nombre: "La Constitución Española de 1978", corto: "Constitución Española", archivo: "tema-1-constitucion-espanola.pdf" },
    { numero: 2, nombre: "Ley 39/2015, del Procedimiento Administrativo Común", corto: "Ley 39/2015", archivo: "tema-2-ley-39-2015-procedimiento-administrativo-comun.pdf" },
    { numero: 3, nombre: "Ley 40/2015, de Régimen Jurídico del Sector Público", corto: "Ley 40/2015", archivo: "tema-3-ley-40-2015-regimen-juridico-sector-publico.pdf" },
  ],
  carpetaTemario: "datos-de-prueba/temario-temario-claro",
};

const VANGUARDIA = {
  grupos: ["Promoción 2026"],
  personas: [
    { alias: "vg-rocio", nombre: "Rocío Aranda", dueno: true, formador: true, formadorDe: ["Promoción 2026"] },
    { alias: "vg-javier", nombre: "Javier Prieto", llamar: "Javier", alumno: true, grupo: "Promoción 2026", diasSinEntrar: 0 },
    { alias: "vg-ana", nombre: "Ana Beltrán", llamar: "Ana", alumno: true, grupo: "Promoción 2026", diasSinEntrar: 1 },
  ] as PersonaPrueba[],
  temario: [
    { numero: 1, nombre: "Ley Orgánica 2/1986, de Fuerzas y Cuerpos de Seguridad", corto: "LO 2/1986", archivo: "tema-1-lo-2-1986-fuerzas-cuerpos-seguridad.pdf" },
    { numero: 2, nombre: "Ley Orgánica 9/2015, de Régimen de Personal de la Policía Nacional", corto: "LO 9/2015", archivo: "tema-2-lo-9-2015-personal-policia-nacional.pdf" },
  ],
  carpetaTemario: "datos-de-prueba/temario-vanguardia",
};

const datos = config.academia === "vanguardia" ? VANGUARDIA : TEMARIO_CLARO;

async function oposiciones() {
  await comoSistema(async (tx) => {
    let orden = 0;
    for (const o of config.oposiciones) {
      await tx`
        insert into oposiciones (clave, nombre, resta_por_fallo, segundos_por_pregunta, orden)
        values (${o.clave}, ${o.nombre}, ${o.simulacro.restaPorFallo}, ${o.simulacro.segundosPorPregunta}, ${orden++})
        on conflict (clave) do update set nombre = excluded.nombre, orden = excluded.orden`;
    }
  });
}

async function personas() {
  await comoSistema(async (tx) => {
    const op = await tx`select id from oposiciones order by orden limit 1`;
    const oposicionId = op[0].id as string;
    const grupos = new Map<string, string>();
    for (const g of datos.grupos) {
      const f = await tx`select id from grupos where lower(nombre) = lower(${g}) and not archivado`;
      const id = f.length
        ? (f[0].id as string)
        : ((await tx`insert into grupos (oposicion_id, nombre) values (${oposicionId}, ${g}) returning id`)[0].id as string);
      grupos.set(g, id);
    }
    for (const p of datos.personas) {
      const correo = correoDe(p.alias);
      const grupoId = p.grupo ? grupos.get(p.grupo)! : null;
      const diasAtras = p.diasSinEntrar ?? 0;
      const f = await tx`
        insert into personas (nombre, correo, es_alumno, es_formador, es_dueno, grupo_id, estado, invitada_at, invitacion_aceptada_at, ultimo_acceso_at, creada_at)
        values (${p.nombre}, ${correo}, ${!!p.alumno}, ${!!p.formador}, ${!!p.dueno}, ${grupoId},
                ${p.sinEstrenar ? "invitada" : "activa"}, now() - interval '40 days',
                ${p.sinEstrenar ? null : tx`now() - interval '39 days'`},
                ${p.sinEstrenar ? null : tx`now() - ${diasAtras + " days"}::interval - interval '2 hours'`},
                now() - interval '40 days')
        on conflict (correo) do update set nombre = excluded.nombre, es_alumno = excluded.es_alumno, es_formador = excluded.es_formador,
          es_dueno = excluded.es_dueno, grupo_id = excluded.grupo_id, estado = excluded.estado,
          ultimo_acceso_at = excluded.ultimo_acceso_at, invitacion_aceptada_at = excluded.invitacion_aceptada_at
        returning id`;
      const id = f[0].id as string;
      await tx`insert into preferencias (persona_id) values (${id}) on conflict do nothing`;
      for (const g of p.formadorDe ?? []) {
        await tx`insert into formador_grupos (formador_id, grupo_id) values (${id}, ${grupos.get(g)!}) on conflict do nothing`;
      }
      if (p.alumno) {
        if (p.sinEstrenar) {
          await tx`delete from perfiles where alumno_id = ${id}`;
        } else {
          await tx`
            insert into perfiles (alumno_id, privacidad_aceptada_at, edad_confirmada, como_llamar, oposicion_confirmada, repite, horas_dia, dificultad, completado_at, bienvenida_enviada_at)
            values (${id}, now() - interval '39 days', true, ${p.llamar ?? p.nombre.split(" ")[0]}, true, false, '2-4', 'memorizar', now() - interval '39 days', now() - interval '39 days')
            on conflict (alumno_id) do nothing`;
        }
        if (!p.sinEstrenar) {
          await tx`insert into actividad (persona_id, fecha) values (${id}, hoy_madrid() - ${diasAtras}::int) on conflict do nothing`;
        }
      }
      console.log(`  · ${p.nombre.padEnd(26)} ${correo}`);
    }
  });
}

async function temario() {
  const carpeta = path.join(raiz, datos.carpetaTemario);
  const oposicionId = (await comoSistema((tx) => tx`select id from oposiciones order by orden limit 1`))[0].id as string;
  const formador = (await comoSistema((tx) => tx`select id, nombre from personas where es_formador order by es_dueno, creada_at limit 1`))[0];
  for (const tema of datos.temario) {
    const archivo = path.join(carpeta, tema.archivo);
    if (!fs.existsSync(archivo)) {
      console.log(`  ! Falta ${path.relative(raiz, archivo)}: se salta el tema ${tema.numero}.`);
      continue;
    }
    const ya = await comoSistema(
      (tx) => tx`select t.id from temas t join tema_versiones v on v.id = t.version_actual_id
                 where t.oposicion_id = ${oposicionId} and t.numero = ${tema.numero} and v.estado = 'lista'`,
    );
    if (ya.length > 0) {
      console.log(`  · Tema ${tema.numero} ya estaba cargado.`);
      continue;
    }
    const bytes = new Uint8Array(fs.readFileSync(archivo));
    const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
    const paginas = analizarPaginas(await leerPaginasCrudas(doc as never, 1, doc.numPages));
    const existente = await comoSistema((tx) => tx`select id from temas where oposicion_id = ${oposicionId} and numero = ${tema.numero}`);
    const { versionId } = await comoSistema((tx) =>
      crearVersion(tx, {
        temaId: existente[0]?.id as string | undefined,
        nuevoTema: existente.length ? null : { oposicionId, numero: tema.numero, nombre: tema.nombre, nombreCorto: tema.corto },
        archivoNombre: tema.archivo,
        archivoBytes: bytes.length,
        paginas: doc.numPages,
        personaId: formador.id as string,
        personaNombre: formador.nombre as string,
      }),
    );
    const PARTE = 3 * 1024 * 1024;
    for (let i = 0, n = 0; i < bytes.length; i += PARTE, n++) {
      await comoSistema((tx) => guardarParteArchivo(tx, versionId, n, bytes.subarray(i, i + PARTE)));
    }
    for (let i = 0; i < paginas.length; i += 20) {
      await comoSistema((tx) => guardarPaginas(tx, versionId, paginas.slice(i, i + 20)));
    }
    const r = await indexarYTerminar(versionId);
    console.log(`  · Tema ${tema.numero}: ${doc.numPages} páginas → ${r.ok ? "listo" : "ERROR " + r.error}`);
  }
}

// 90 días de actividad inventada, para que las métricas tengan algo que
// enseñar (capa 5.1). Solo toca las tablas de uso y actividad.
async function actividad() {
  await comoSistema(async (tx) => {
    const alumnos = await tx`select id, grupo_id, ultimo_acceso_at from personas where es_alumno and estado = 'activa'`;
    await tx`delete from uso where subtipo = 'inventado'`;
    let n = 0;
    for (const a of alumnos) {
      const hasta = Math.max(1, Math.floor((Date.now() - new Date(a.ultimoAccesoAt as Date).getTime()) / 86400000));
      for (let d = 90; d >= hasta; d--) {
        // Cada alumno estudia unos 3 de cada 7 días, a su hora habitual.
        const semilla = (parseInt(String(a.id).slice(0, 6), 16) + d * 7) % 10;
        if (semilla > 4) continue;
        const hora = 9 + (parseInt(String(a.id).slice(6, 8), 16) % 12);
        await tx`insert into actividad (persona_id, fecha) values (${a.id}, hoy_madrid() - ${d}::int) on conflict do nothing`;
        const preguntas = 2 + (semilla % 5);
        for (let q = 0; q < preguntas; q++) {
          await tx`
            insert into uso (persona_id, grupo_id, tipo, subtipo, creado_at, fecha, mes, modelo, tokens_entrada, tokens_salida, coste_usd)
            values (${a.id}, ${a.grupoId}, 'pregunta', 'inventado',
                    (hoy_madrid() - ${d}::int + make_interval(hours => ${hora}, mins => ${q * 7}))::timestamp at time zone 'Europe/Madrid',
                    hoy_madrid() - ${d}::int, to_char(hoy_madrid() - ${d}::int, 'YYYY-MM'), 'claude-sonnet-5', 6500, 600, 0.019)`;
          n++;
        }
      }
    }
    console.log(`  · ${n} preguntas inventadas en 90 días.`);
  });
}

console.log(`Datos de prueba de «${config.nombre}»`);
await oposiciones();
console.log("Personas:");
await personas();
if (!args.has("--sin-temario")) {
  console.log("Temario:");
  await temario();
}
if (args.has("--actividad")) {
  console.log("Actividad:");
  await actividad();
}
console.log("✓ Hecho.");
process.exit(0);
