import "server-only";
import { config } from "@/configuracion";
import type { Tx } from "./bd";
import { permitir } from "./limites-peticiones";
import type { Parrafo } from "@/temario/procesar";

export type PaginaVisor = {
  versionId: string;
  temaId: string;
  temaNumero: number;
  temaNombre: string;
  pagina: number;
  total: number;
  numeroImpreso: number | null;
  parrafos: Parrafo[];
  esIndice: boolean;
};

/**
 * Una página del temario para el visor. La base de datos solo la da si es
 * del temario de la oposición del alumno (o de una que gestiona el
 * formador). Para el alumno hay un límite de páginas por hora, para que
 * nadie copie el temario página a página.
 */
export async function paginaVisor(
  tx: Tx,
  personaId: string,
  esAlumno: boolean,
  versionId: string,
  numero: number,
): Promise<{ ok: true; pagina: PaginaVisor } | { ok: false; motivo: "no" | "limite" }> {
  if (!/^[0-9a-f-]{36}$/i.test(versionId) || !Number.isInteger(numero) || numero < 1) return { ok: false, motivo: "no" };
  const f = await tx`
    select p.numero, p.numero_impreso, p.parrafos, p.es_indice, v.id as version_id, v.paginas as total,
           t.id as tema_id, t.numero as tema_numero, coalesce(t.nombre_corto, t.nombre) as tema_nombre
    from paginas p join tema_versiones v on v.id = p.version_id join temas t on t.id = v.tema_id
    where p.version_id = ${versionId} and p.numero = ${numero}`;
  if (f.length === 0) return { ok: false, motivo: "no" };
  if (esAlumno && !(await permitir(`visor:${personaId}`, config.limites.paginasVisorPorHora, 3600))) {
    return { ok: false, motivo: "limite" };
  }
  const r = f[0];
  return {
    ok: true,
    pagina: {
      versionId: r.versionId as string,
      temaId: r.temaId as string,
      temaNumero: Number(r.temaNumero),
      temaNombre: r.temaNombre as string,
      pagina: Number(r.numero),
      total: Number(r.total),
      numeroImpreso: r.numeroImpreso === null ? null : Number(r.numeroImpreso),
      parrafos: r.parrafos as Parrafo[],
      esIndice: r.esIndice as boolean,
    },
  };
}
