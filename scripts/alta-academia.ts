// ALTA DE UNA ACADEMIA NUEVA (MONTAR-CLIENTE.md, paso 4)
//
//   npm run alta:academia -- --nombre "Elena Robles" --correo elena@suacademia.com
//   npm run alta:academia -- --nombre "Elena Robles" --correo elena@suacademia.com --tambien-formadora
//
// Crea en la base de datos las oposiciones de la configuración de la academia
// (o las pone al día si ya estaban) y la cuenta de la dirección, y le manda el
// correo para entrar. Los grupos y los formadores los crea después la
// dirección desde «Ajustes». Se puede lanzar dos veces sin duplicar nada.

import { config } from "@/configuracion";
import { comoSistema } from "@/servidor/bd";
import { enviarInvitacion } from "@/servidor/avisos";

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function valor(nombre: string): string | null {
  const i = process.argv.indexOf(nombre);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1].trim() : null;
}

const nombre = valor("--nombre");
const correo = valor("--correo")?.toLowerCase() ?? null;
const formadora = process.argv.includes("--tambien-formadora") || process.argv.includes("--tambien-formador");

if (!nombre || !correo || !CORREO_VALIDO.test(correo)) {
  console.error('Falta el nombre o el correo, o el correo está mal escrito. Ejemplo:\n  npm run alta:academia -- --nombre "Elena Robles" --correo elena@suacademia.com');
  process.exit(1);
}

const r = await comoSistema(async (tx) => {
  let orden = 0;
  for (const o of config.oposiciones) {
    await tx`
      insert into oposiciones (clave, nombre, resta_por_fallo, segundos_por_pregunta, orden)
      values (${o.clave}, ${o.nombre}, ${o.simulacro.restaPorFallo}, ${o.simulacro.segundosPorPregunta}, ${orden++})
      on conflict (clave) do update set nombre = excluded.nombre, orden = excluded.orden`;
  }
  const ya = await tx`select id, es_alumno from personas where correo = ${correo}`;
  if (ya[0]?.esAlumno) return { error: "Ese correo es de un alumno. La dirección necesita otro correo." };
  const f = ya[0]
    ? await tx`update personas set es_dueno = true, es_formador = es_formador or ${formadora}, estado = case when estado = 'baja' then 'invitada' else estado end, baja_at = null, borrar_desde = null where id = ${ya[0].id} returning id`
    : await tx`insert into personas (nombre, correo, es_dueno, es_formador, estado, invitada_at) values (${nombre.slice(0, 120)}, ${correo}, true, ${formadora}, 'invitada', now()) returning id`;
  return { id: f[0].id as string, nueva: !ya[0] };
});

if ("error" in r) {
  console.error(r.error);
  process.exit(1);
}
const enviado = await enviarInvitacion(r.id);
console.log(`✓ ${config.nombre}: ${config.oposiciones.length} ${config.oposiciones.length === 1 ? "oposición" : "oposiciones"} y la cuenta de la dirección (${correo}${formadora ? ", también formadora" : ""}) ${r.nueva ? "creada" : "puesta al día"}.`);
console.log(enviado ? "✓ Le hemos mandado el correo para entrar." : "✗ No se ha podido mandar el correo: revisa el correo de avisos. Puede entrar igualmente escribiendo su correo en /entrar.");
process.exit(0);
