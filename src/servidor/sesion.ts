import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { comoPersona, comoSistema, type Tx } from "./bd";

// Las sesiones: al pulsar el enlace del correo se crea una sesión, que vive
// en una galleta (cookie) protegida del navegador. En la base de datos solo
// se guarda su huella, nunca la galleta en sí.

export const GALLETA_SESION = "sesion";
export const GALLETA_PAPEL = "papel";
export const GALLETA_TEMA = "tema";
const DIAS_SESION = 30;

export type Papel = "alumno" | "formador" | "dueno" | "tecnico";

export type Persona = {
  id: string;
  nombre: string;
  correo: string;
  esAlumno: boolean;
  esFormador: boolean;
  esDueno: boolean;
  grupoId: string | null;
  estado: "invitada" | "activa" | "baja";
};

export type Sesion = {
  idHash: string;
  persona: Persona;
  papeles: Papel[];
  esTecnico: boolean;
  /** Si estamos en modo soporte: la persona es el dueño, en solo lectura. */
  soporte: null | { entradaId: string; tecnicoCorreo: string; tecnicoId: string };
};

export function huella(texto: string): string {
  return createHash("sha256").update(texto).digest("hex");
}

export function tokenAleatorio(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function correosTecnicos(): string[] {
  return (process.env.CORREOS_TECNICOS || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

export async function datosPeticion() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
  const ciudad = h.get("x-vercel-ip-city") ? decodeURIComponent(h.get("x-vercel-ip-city")!) : null;
  const pais = h.get("x-vercel-ip-country") || null;
  const agente = h.get("user-agent")?.slice(0, 300) || null;
  return { ip, ciudad, pais, agente };
}

/** Crea la sesión de una persona y guarda la galleta. */
export async function crearSesion(tx: Tx, personaId: string): Promise<void> {
  const token = tokenAleatorio();
  const { ip, ciudad, pais, agente } = await datosPeticion();
  await tx`
    insert into sesiones (id_hash, persona_id, expira_at, ip, ciudad, agente)
    values (${huella(token)}, ${personaId}, now() + ${DIAS_SESION + " days"}::interval, ${ip}, ${ciudad}, ${agente})`;
  await tx`insert into accesos (persona_id, ip, ciudad, pais, agente) values (${personaId}, ${ip}, ${ciudad}, ${pais}, ${agente})`;
  const c = await cookies();
  c.set(GALLETA_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DIAS_SESION * 24 * 3600,
  });
}

function papelesDe(p: Persona, esTecnico: boolean): Papel[] {
  const papeles: Papel[] = [];
  if (p.esDueno) papeles.push("dueno");
  if (p.esFormador) papeles.push("formador");
  if (p.esAlumno) papeles.push("alumno");
  if (esTecnico) papeles.push("tecnico");
  return papeles;
}

/** La sesión de quien hace la petición, o null. Una vez por petición. */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const c = await cookies();
  const token = c.get(GALLETA_SESION)?.value;
  if (!token) return null;
  const idHash = huella(token);
  return comoSistema(async (tx) => {
    const filas = await tx`
      select s.id_hash, s.ultima_at, s.soporte_entrada_id,
             p.id, p.nombre, p.correo, p.es_alumno, p.es_formador, p.es_dueno, p.grupo_id, p.estado,
             p.ultimo_acceso_at
      from sesiones s join personas p on p.id = s.persona_id
      where s.id_hash = ${idHash} and s.cerrada_at is null and s.expira_at > now()`;
    if (filas.length === 0) return null;
    const f = filas[0] as Record<string, unknown>;
    const tecnico = f as { correo: string };
    const esTecnico = correosTecnicos().includes(String(tecnico.correo).toLowerCase());
    if (f.estado === "baja" && !esTecnico) return null;
    const personaReal: Persona = {
      id: f.id as string,
      nombre: f.nombre as string,
      correo: f.correo as string,
      esAlumno: f.esAlumno as boolean,
      esFormador: f.esFormador as boolean,
      esDueno: f.esDueno as boolean,
      grupoId: (f.grupoId as string) ?? null,
      estado: f.estado as Persona["estado"],
    };

    // Apuntar el acceso (como mucho una vez cada 5 minutos) y el día de estudio.
    const ultima = f.ultimaAt as Date;
    if (Date.now() - new Date(ultima).getTime() > 5 * 60 * 1000) {
      await tx`update sesiones set ultima_at = now() where id_hash = ${idHash}`;
    }
    const ultimoAcceso = f.ultimoAccesoAt as Date | null;
    if (!ultimoAcceso || Date.now() - new Date(ultimoAcceso).getTime() > 5 * 60 * 1000) {
      await tx`update personas set ultimo_acceso_at = now() where id = ${personaReal.id}`;
      await tx`insert into actividad (persona_id, fecha) values (${personaReal.id}, hoy_madrid()) on conflict do nothing`;
    }

    // Modo soporte: vemos la academia como el dueño, en solo lectura.
    if (esTecnico && f.soporteEntradaId) {
      const duenos = await tx`
        select id, nombre, correo, es_alumno, es_formador, es_dueno, grupo_id, estado
        from personas where es_dueno and estado <> 'baja' order by creada_at limit 1`;
      if (duenos.length > 0) {
        const d = duenos[0] as unknown as Persona;
        return {
          idHash,
          persona: d,
          papeles: papelesDe({ ...d, esAlumno: false }, false),
          esTecnico: true,
          soporte: { entradaId: f.soporteEntradaId as string, tecnicoCorreo: personaReal.correo, tecnicoId: personaReal.id },
        };
      }
    }
    return { idHash, persona: personaReal, papeles: papelesDe(personaReal, esTecnico), esTecnico, soporte: null };
  });
});

/** Exige sesión (y un papel, si se indica). Si no, manda a entrar. */
export async function exigirSesion(papel?: Papel): Promise<Sesion> {
  const s = await obtenerSesion();
  if (!s) redirect("/entrar");
  if (papel && !s.papeles.includes(papel)) redirect("/");
  return s;
}

/** Ejecuta fn como la persona de la sesión (en modo soporte, solo lectura). */
export async function conSesion<T>(s: Sesion, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return comoPersona(s.persona.id, fn, { soloLectura: !!s.soporte });
}

/** Para acciones que cambian algo: en modo soporte no se puede. */
export function prohibirEnSoporte(s: Sesion) {
  if (s.soporte) {
    throw new Error("Estás en modo soporte: solo lectura. No se puede cambiar nada.");
  }
}

export async function cerrarSesion(): Promise<void> {
  const c = await cookies();
  const token = c.get(GALLETA_SESION)?.value;
  if (token) {
    await comoSistema((tx) => tx`update sesiones set cerrada_at = now() where id_hash = ${huella(token)}`);
  }
  c.delete(GALLETA_SESION);
  c.delete(GALLETA_PAPEL);
}

/** La parte de la app a la que va cada papel. */
export function inicioDePapel(p: Papel): string {
  return { alumno: "/estudio/preguntar", formador: "/formador/temario", dueno: "/metricas/uso", tecnico: "/tecnico/coste" }[p];
}
