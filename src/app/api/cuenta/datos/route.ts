import { config } from "@/configuracion";
import { conSesion, obtenerSesion } from "@/servidor/sesion";
import { permitir } from "@/servidor/limites-peticiones";

// Mi cuenta · Pedir una copia de mis datos (RGPD). Se genera al momento,
// con todo lo que guardamos de la persona, leído con sus propios permisos.
export async function GET() {
  const s = await obtenerSesion();
  if (!s || !s.papeles.includes("alumno")) return new Response("No encontrado", { status: 404 });
  if (!(await permitir(`datos:${s.persona.id}`, 5, 3600))) return new Response("Espera un rato", { status: 429 });
  const id = s.persona.id;
  const datos = await conSesion(s, async (tx) => ({
    academia: config.legal.razonSocial,
    generado: new Date().toISOString(),
    persona: (await tx`select nombre, correo, estado, creada_at, invitacion_aceptada_at, ultimo_acceso_at from personas where id = ${id}`)[0],
    preferencias: (await tx`select tema_visual, recordatorio, avisos_formador from preferencias where persona_id = ${id}`)[0] ?? null,
    perfil: (await tx`select * from perfiles where alumno_id = ${id}`)[0] ?? null,
    memoria: await tx`select tipo, texto, origen, creada_at, actualizada_at from memoria_notas where alumno_id = ${id}`,
    conversaciones: await tx`
      select c.titulo, c.modo, c.creada_at,
        (select coalesce(json_agg(json_build_object('rol', m.rol, 'texto', m.texto, 'citas', m.citas, 'fecha', m.creado_at, 'valoracion', m.valoracion) order by m.creado_at), '[]')
         from mensajes m where m.conversacion_id = c.id) as mensajes
      from conversaciones c where c.alumno_id = ${id} order by c.creada_at`,
    carpetas: await tx`select nombre, creada_at from carpetas where alumno_id = ${id}`,
    materiales: await tx`select titulo, formato, estilo, opciones, contenido, creado_at from materiales where propietario_id = ${id}`,
    tests: await tx`select modo, respuestas, aciertos, fallos, en_blanco, nota, nota_sin_penalizacion, empezado_at, terminado_at from intentos_test where alumno_id = ${id}`,
    repaso: await tx`select material_id, indice, proxima, ultima_respuesta from tarjetas_repaso where alumno_id = ${id}`,
    diasDeEstudio: await tx`select fecha from actividad where persona_id = ${id} order by fecha`,
    consumo: await tx`select tipo, fecha from uso where persona_id = ${id} and tipo <> 'interno' order by fecha`,
  }));
  return new Response(JSON.stringify(datos, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mis-datos.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
