import "server-only";
import type { Tx } from "./bd";
import type { ContextoAlumno } from "./ia/instrucciones";

// Datos del alumno que se usan en varias pantallas. Todo se lee con las
// políticas de la base de datos: cada alumno solo puede leer lo suyo.

export type Perfil = {
  privacidadAceptadaAt: Date | null;
  edadConfirmada: boolean;
  comoLlamar: string | null;
  oposicionConfirmada: boolean;
  repite: boolean | null;
  horasDia: string | null;
  dificultad: string | null;
  completadoAt: Date | null;
  bienvenidaEnviadaAt: Date | null;
};

export async function perfilDe(tx: Tx, alumnoId: string): Promise<Perfil | null> {
  const f = await tx`select * from perfiles where alumno_id = ${alumnoId}`;
  return (f[0] as unknown as Perfil) ?? null;
}

export async function contextoAlumno(tx: Tx, alumnoId: string): Promise<ContextoAlumno> {
  const p = await perfilDe(tx, alumnoId);
  const notas = await tx`
    select tipo, texto from memoria_notas where alumno_id = ${alumnoId}
    order by case tipo when 'cuesta' then 0 when 'fallo_test' then 1 when 'preferencia' then 2 else 3 end, actualizada_at desc
    limit 14`;
  return {
    comoLlamar: p?.comoLlamar ?? null,
    repite: p?.repite ?? null,
    horasDia: p?.horasDia ?? null,
    dificultad: p?.dificultad ?? null,
    notas: notas.map((n) => ({ tipo: n.tipo as string, texto: n.texto as string })),
  };
}

export type OposicionAlumno = {
  id: string;
  clave: string;
  nombre: string;
  restaPorFallo: number;
  segundosPorPregunta: number;
  grupoId: string;
  grupoNombre: string;
};

export async function oposicionDe(tx: Tx, alumnoId: string): Promise<OposicionAlumno | null> {
  const f = await tx`
    select o.id, o.clave, o.nombre, o.resta_por_fallo, o.segundos_por_pregunta, g.id as grupo_id, g.nombre as grupo_nombre
    from personas p join grupos g on g.id = p.grupo_id join oposiciones o on o.id = g.oposicion_id
    where p.id = ${alumnoId}`;
  if (!f[0]) return null;
  return {
    id: f[0].id as string,
    clave: f[0].clave as string,
    nombre: f[0].nombre as string,
    restaPorFallo: Number(f[0].restaPorFallo),
    segundosPorPregunta: Number(f[0].segundosPorPregunta),
    grupoId: f[0].grupoId as string,
    grupoNombre: f[0].grupoNombre as string,
  };
}

export type TemaVista = {
  id: string;
  numero: number;
  nombre: string;
  nombreCorto: string;
  versionId: string | null;
  paginas: number;
};

/** Los temas vigentes de una oposición (los que ve el alumno). */
export async function temasDe(tx: Tx, oposicionId: string): Promise<TemaVista[]> {
  const f = await tx`
    select t.id, t.numero, t.nombre, coalesce(t.nombre_corto, t.nombre) as nombre_corto, t.version_actual_id, coalesce(v.paginas, 0) as paginas
    from temas t left join tema_versiones v on v.id = t.version_actual_id
    where t.oposicion_id = ${oposicionId} and t.version_actual_id is not null
    order by t.numero`;
  return f.map((t) => ({
    id: t.id as string,
    numero: Number(t.numero),
    nombre: t.nombre as string,
    nombreCorto: t.nombreCorto as string,
    versionId: (t.versionActualId as string) ?? null,
    paginas: Number(t.paginas),
  }));
}
