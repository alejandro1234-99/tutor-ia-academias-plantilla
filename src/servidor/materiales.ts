import "server-only";
import type { Tx } from "./bd";
import type { Contenido, Formato } from "@/tipos/material";

// Lectura del material para las pantallas (con las políticas de la base de
// datos: cada alumno ve lo suyo y lo que su formador ha compartido con su grupo).

export type MaterialVista = {
  id: string;
  propietarioId: string;
  esMio: boolean;
  esDeFormador: boolean;
  formato: Formato;
  estilo: string | null;
  titulo: string;
  temaIds: string[];
  temas: { id: string; numero: number; nombre: string }[];
  opciones: Record<string, unknown>;
  contenido: Contenido | null;
  estado: "creando" | "listo" | "error";
  progreso: number;
  paso: string | null;
  carpetaId: string | null;
  valoracion: "sirvio" | "no_sirvio" | null;
  actualizado: boolean; // «temario actualizado»: hecho con una versión anterior
  creadoAt: string;
};

export async function listarMateriales(
  tx: Tx,
  personaId: string,
  filtro: { deAcademia?: boolean; formatos?: string[] | null; carpetaId?: string | null; temaIds?: string[] | null; q?: string | null } = {},
): Promise<MaterialVista[]> {
  const q = filtro.q?.trim() ? `%${filtro.q.trim().toLowerCase()}%` : null;
  const filas = await tx`
    select m.*,
      exists (
        select 1 from unnest(m.tema_ids) with ordinality as x(tema_id, i)
        join temas t on t.id = x.tema_id
        where m.estado = 'listo' and cardinality(m.version_ids) > 0
          and t.version_actual_id is distinct from m.version_ids[x.i]
      ) as desactualizado
    from materiales m
    where ${filtro.deAcademia ? tx`m.propietario_id <> ${personaId} and m.es_de_formador` : tx`m.propietario_id = ${personaId}`}
      and (${filtro.formatos ?? null}::text[] is null or m.formato = any(${filtro.formatos ?? null}::text[]))
      and (${filtro.carpetaId ?? null}::uuid is null or m.carpeta_id = ${filtro.carpetaId ?? null}::uuid)
      and (${filtro.temaIds ?? null}::uuid[] is null or m.tema_ids && ${filtro.temaIds ?? null}::uuid[])
      and (${q}::text is null or lower(m.titulo) like ${q})
    order by m.creado_at desc
    limit 300`;
  const temas = await tx`select id, numero, coalesce(nombre_corto, nombre) as nombre from temas`;
  const porId = new Map(temas.map((t) => [t.id as string, { id: t.id as string, numero: Number(t.numero), nombre: t.nombre as string }]));
  return filas.map((m) => aVista(m, personaId, porId));
}

export function aVista(
  m: Record<string, unknown>,
  personaId: string,
  temas: Map<string, { id: string; numero: number; nombre: string }>,
): MaterialVista {
  const temaIds = (m.temaIds as string[]) ?? [];
  return {
    id: m.id as string,
    propietarioId: m.propietarioId as string,
    esMio: m.propietarioId === personaId,
    esDeFormador: m.esDeFormador as boolean,
    formato: m.formato as Formato,
    estilo: (m.estilo as string) ?? null,
    titulo: (m.titulo as string) || "…",
    temaIds,
    temas: temaIds.map((id) => temas.get(id)).filter((x): x is { id: string; numero: number; nombre: string } => !!x).sort((a, b) => a.numero - b.numero),
    opciones: (m.opciones as Record<string, unknown>) ?? {},
    contenido: (m.contenido as Contenido) ?? null,
    estado: m.estado as MaterialVista["estado"],
    progreso: Number(m.progreso ?? 0),
    paso: (m.paso as string) ?? null,
    carpetaId: (m.carpetaId as string) ?? null,
    valoracion: (m.valoracion as MaterialVista["valoracion"]) ?? null,
    actualizado: !!m.desactualizado,
    creadoAt: new Date(m.creadoAt as string).toISOString(),
  };
}

export async function unMaterial(tx: Tx, personaId: string, id: string): Promise<MaterialVista | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const f = await tx`
    select m.*,
      exists (
        select 1 from unnest(m.tema_ids) with ordinality as x(tema_id, i)
        join temas t on t.id = x.tema_id
        where m.estado = 'listo' and cardinality(m.version_ids) > 0
          and t.version_actual_id is distinct from m.version_ids[x.i]
      ) as desactualizado
    from materiales m where m.id = ${id}`;
  if (!f[0]) return null;
  const temas = await tx`select id, numero, coalesce(nombre_corto, nombre) as nombre from temas`;
  const porId = new Map(temas.map((t) => [t.id as string, { id: t.id as string, numero: Number(t.numero), nombre: t.nombre as string }]));
  return aVista(f[0], personaId, porId);
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" }).replace(".", "");
}
