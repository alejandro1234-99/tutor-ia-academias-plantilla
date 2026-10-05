import "server-only";
import { comoSistema, type Tx } from "./bd";
import { huellas, hayHuellas, MODELO_HUELLAS, vectorSql } from "./ia/huellas";
import { textoParaHuella, trocearPagina, type PaginaLeida } from "@/temario/procesar";

// El temario en el servidor: versiones, páginas, trozos y huellas.
// Sustituir un tema crea una versión nueva; mientras se procesa, el
// asistente sigue usando la anterior (SOLUCION.md, 11.1).

export const LIMITE_MB_PDF = 50;
export const LIMITE_PAGINAS_ACADEMIA = 3000;

export type NuevaVersion = {
  temaId?: string | null;
  nuevoTema?: { oposicionId: string; numero: number; nombre: string; nombreCorto?: string | null } | null;
  archivoNombre: string;
  archivoBytes: number;
  paginas: number;
  personaId: string | null;
  personaNombre: string;
};

export class ErrorTemario extends Error {}

/** Páginas del temario vigente de toda la academia (sin contar un tema). */
export async function paginasEnUso(tx: Tx, salvoTema?: string | null): Promise<number> {
  const filas = await tx`
    select coalesce(sum(v.paginas), 0)::int as n
    from academia.temas t join academia.tema_versiones v on v.id = t.version_actual_id
    where ${salvoTema ?? null}::uuid is null or t.id <> ${salvoTema ?? null}::uuid`;
  return Number(filas[0].n);
}

export async function crearVersion(tx: Tx, d: NuevaVersion): Promise<{ versionId: string; temaId: string }> {
  if (d.archivoBytes > LIMITE_MB_PDF * 1024 * 1024) {
    throw new ErrorTemario(`El PDF pesa más de ${LIMITE_MB_PDF} MB. Divídelo en dos temas o comprímelo.`);
  }
  let temaId = d.temaId ?? null;
  if (!temaId && d.nuevoTema) {
    const existe = await tx`select id from temas where oposicion_id = ${d.nuevoTema.oposicionId} and numero = ${d.nuevoTema.numero}`;
    if (existe.length > 0) throw new ErrorTemario(`Ya hay un tema ${d.nuevoTema.numero} en esta oposición. Elige «Sustituir».`);
    const t = await tx`
      insert into temas (oposicion_id, numero, nombre, nombre_corto)
      values (${d.nuevoTema.oposicionId}, ${d.nuevoTema.numero}, ${d.nuevoTema.nombre.trim()}, ${d.nuevoTema.nombreCorto?.trim() || null})
      returning id`;
    temaId = t[0].id as string;
  }
  if (!temaId) throw new ErrorTemario("Elige el tema.");
  const enUso = await paginasEnUso(tx, temaId);
  if (enUso + d.paginas > LIMITE_PAGINAS_ACADEMIA) {
    throw new ErrorTemario(
      `Con este PDF el temario pasaría de ${LIMITE_PAGINAS_ACADEMIA} páginas (ahora hay ${enUso}). Escríbenos desde Ayuda para ampliarlo.`,
    );
  }
  const v = await tx`
    insert into tema_versiones (tema_id, version, archivo_nombre, archivo_bytes, paginas, estado, paso, subida_por, subida_por_nombre)
    values (
      ${temaId},
      (select coalesce(max(version), 0) + 1 from tema_versiones where tema_id = ${temaId}),
      ${d.archivoNombre.slice(0, 200)}, ${d.archivoBytes}, ${d.paginas}, 'subiendo', 'Subiendo el PDF', ${d.personaId}, ${d.personaNombre}
    )
    returning id`;
  return { versionId: v[0].id as string, temaId };
}

export async function guardarParteArchivo(tx: Tx, versionId: string, parte: number, datos: Uint8Array): Promise<void> {
  await tx`
    insert into archivos_pdf (version_id, parte, datos) values (${versionId}, ${parte}, ${datos})
    on conflict (version_id, parte) do update set datos = excluded.datos`;
}

/** Guarda una tanda de páginas ya leídas y sus trozos. */
export async function guardarPaginas(tx: Tx, versionId: string, paginas: PaginaLeida[]): Promise<void> {
  const v = await tx`
    select v.tema_id, v.paginas as total from tema_versiones v where v.id = ${versionId} and v.estado in ('subiendo', 'procesando')`;
  if (v.length === 0) throw new ErrorTemario("Esta subida ya no está en curso.");
  const temaId = v[0].temaId as string;
  const total = Number(v[0].total) || 1;
  for (const p of paginas) {
    await tx`delete from paginas where version_id = ${versionId} and numero = ${p.numero}`;
    await tx`delete from trozos where version_id = ${versionId} and pagina = ${p.numero}`;
    await tx`
      insert into paginas (version_id, numero, numero_impreso, texto, parrafos, es_indice)
      values (${versionId}, ${p.numero}, ${p.numeroImpreso}, ${p.parrafos.map((x) => x.t).join("\n")}, ${tx.json(p.parrafos)}, ${p.esIndice})`;
    const trozos = trocearPagina(p, p.numero * 100);
    for (const t of trozos) {
      await tx`
        insert into trozos (version_id, tema_id, pagina, pagina_impresa, orden, parrafo_desde, parrafo_hasta, parrafos, articulos, texto, es_indice)
        values (${versionId}, ${temaId}, ${t.pagina}, ${t.paginaImpresa}, ${t.orden}, ${t.parrafoDesde}, ${t.parrafoHasta},
                ${tx.json(t.parrafos)}, ${t.articulos}, ${t.texto}, ${t.esIndice})`;
    }
  }
  const hechas = await tx`select count(*)::int as n from paginas where version_id = ${versionId}`;
  const progreso = Math.min(50, Math.round((Number(hechas[0].n) / total) * 50));
  await tx`
    update tema_versiones set estado = 'procesando', progreso = ${progreso}, paso = 'Leyendo el PDF página a página'
    where id = ${versionId}`;
}

/**
 * Calcula las huellas de significado de los trozos que aún no la tienen y,
 * al acabar, pone la versión en uso. Se ejecuta en segundo plano.
 */
export async function indexarYTerminar(versionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const info = await comoSistema(async (tx) => {
      const v = await tx`
        select v.id, v.tema_id, v.paginas, t.numero, t.nombre, coalesce(t.nombre_corto, t.nombre) as corto
        from tema_versiones v join temas t on t.id = v.tema_id where v.id = ${versionId}`;
      const n = await tx`select count(*)::int as n, sum(length(texto))::int as letras from paginas where version_id = ${versionId}`;
      return { v: v[0], paginasGuardadas: Number(n[0].n), letras: Number(n[0].letras || 0) };
    });
    if (!info.v) return { ok: false, error: "no encontrado" };
    if (info.paginasGuardadas < Number(info.v.paginas)) {
      throw new ErrorTemario("Faltan páginas por subir. Vuelve a subir el PDF.");
    }
    if (info.letras / Math.max(1, info.paginasGuardadas) < 60) {
      throw new ErrorTemario("Este PDF parece escaneado y el asistente no podrá leerlo. Súbelo en versión con texto.");
    }
    const tema = { numero: Number(info.v.numero), nombre: String(info.v.nombre) };

    if (hayHuellas()) {
      for (;;) {
        const pendientes = await comoSistema(
          (tx) => tx`select id, pagina, pagina_impresa, orden, parrafo_desde, parrafo_hasta, parrafos, articulos, texto, es_indice
                     from trozos where version_id = ${versionId} and embedding is null and not es_indice
                     order by orden limit 96`,
        );
        if (pendientes.length === 0) break;
        const textos = pendientes.map((t) =>
          textoParaHuella(
            {
              pagina: t.pagina as number,
              paginaImpresa: t.paginaImpresa as number | null,
              orden: t.orden as number,
              parrafoDesde: t.parrafoDesde as number,
              parrafoHasta: t.parrafoHasta as number,
              parrafos: t.parrafos as never,
              articulos: t.articulos as string[],
              texto: t.texto as string,
              esIndice: t.esIndice as boolean,
            },
            tema,
          ),
        );
        const h = await huellas(textos, "document");
        await comoSistema(async (tx) => {
          for (let i = 0; i < pendientes.length; i++) {
            await tx`update trozos set embedding = ${vectorSql(h ? h[i] : null)}::extensions.vector where id = ${pendientes[i].id}`;
          }
          const q = await tx`
            select count(*) filter (where embedding is not null or es_indice)::int as hechos, count(*)::int as total
            from trozos where version_id = ${versionId}`;
          const pct = 50 + Math.round((Number(q[0].hechos) / Math.max(1, Number(q[0].total))) * 49);
          await tx`update tema_versiones set progreso = ${pct}, paso = 'Preparando la búsqueda por significado' where id = ${versionId}`;
        });
      }
    }

    await comoSistema(async (tx) => {
      const v = await tx`select tema_id from tema_versiones where id = ${versionId}`;
      const temaId = v[0].temaId as string;
      await tx`update tema_versiones set estado = 'sustituida' where tema_id = ${temaId} and id <> ${versionId} and estado = 'lista'`;
      await tx`
        update tema_versiones set estado = 'lista', progreso = 100, paso = null, lista_at = now(),
               palabras = (select coalesce(sum(array_length(regexp_split_to_array(texto, '\\s+'), 1)), 0) from paginas where version_id = ${versionId}),
               modelo_busqueda = ${hayHuellas() ? MODELO_HUELLAS : null}
        where id = ${versionId}`;
      await tx`update temas set version_actual_id = ${versionId} where id = ${temaId}`;
    });
    return { ok: true };
  } catch (e) {
    const motivo = e instanceof ErrorTemario ? e.message : "No se ha podido procesar el PDF. Vuelve a intentarlo.";
    await comoSistema(async (tx) => {
      await tx`update tema_versiones set estado = 'error', error = ${motivo}, paso = null where id = ${versionId}`;
      await tx`insert into errores (tipo, detalle) values ('temario', ${`${versionId}: ${(e as Error).message}`.slice(0, 1000)})`;
    });
    return { ok: false, error: motivo };
  }
}

/** Huellas de significado de las notas del formador nuevas o editadas. */
export async function indexarNotas(): Promise<void> {
  if (!hayHuellas()) return;
  const pendientes = await comoSistema(
    (tx) => tx`select n.id, n.pregunta, n.texto, t.numero, coalesce(t.nombre_corto, t.nombre) as nombre
               from notas_formador n join temas t on t.id = n.tema_id
               where n.embedding is null and n.retirada_at is null limit 50`,
  );
  if (pendientes.length === 0) return;
  try {
    const h = await huellas(
      pendientes.map((n) => `Nota del formador · Tema ${n.numero} · ${n.nombre}\n${n.pregunta}\n${n.texto}`),
      "document",
    );
    if (!h) return;
    await comoSistema(async (tx) => {
      for (let i = 0; i < pendientes.length; i++) {
        await tx`update notas_formador set embedding = ${vectorSql(h[i])}::extensions.vector where id = ${pendientes[i].id}`;
      }
    });
  } catch {
    // Sin huella, la nota se sigue encontrando por palabras.
  }
}

/**
 * Pone la huella de significado a los trozos del temario vigente que no la
 * tienen: temas subidos antes de tener la clave de Voyage, o si Voyage falló
 * al subirlos. Lo lanza la tarea diaria y `npm run temario:huellas`.
 * Devuelve cuántos trozos ha completado.
 */
export async function completarHuellas(maximo = 5000, opciones: { lote?: number; esperarLimite?: boolean } = {}): Promise<number> {
  if (!hayHuellas()) return 0;
  const lote = opciones.lote ?? 96;
  let hechos = 0;
  let esperas = 0;
  while (hechos < maximo) {
    const pendientes = await comoSistema(
      (tx) => tx`select tr.id, tr.pagina, tr.pagina_impresa, tr.orden, tr.parrafo_desde, tr.parrafo_hasta, tr.parrafos,
                        tr.articulos, tr.texto, tr.es_indice, t.numero, coalesce(t.nombre_corto, t.nombre) as nombre
                 from trozos tr join temas t on t.version_actual_id = tr.version_id
                 where tr.embedding is null and not tr.es_indice
                 order by tr.version_id, tr.orden limit ${lote}`,
    );
    if (pendientes.length === 0) break;
    let h: number[][] | null;
    try {
      h = await huellas(
      pendientes.map((t) =>
        textoParaHuella(
          {
            pagina: t.pagina as number,
            paginaImpresa: t.paginaImpresa as number | null,
            orden: t.orden as number,
            parrafoDesde: t.parrafoDesde as number,
            parrafoHasta: t.parrafoHasta as number,
            parrafos: t.parrafos as never,
            articulos: t.articulos as string[],
            texto: t.texto as string,
            esIndice: t.esIndice as boolean,
          },
          { numero: Number(t.numero), nombre: String(t.nombre) },
        ),
      ),
      "document",
    );
    } catch (e) {
      // Cuenta de Voyage sin método de pago: 3 peticiones y 10.000 tokens por
      // minuto. Si se pide, se espera un minuto y se sigue.
      if (opciones.esperarLimite && /\b429\b/.test((e as Error).message) && esperas < 500) {
        esperas++;
        await new Promise((r) => setTimeout(r, 65_000));
        continue;
      }
      throw e;
    }
    if (!h) break;
    const huellasLote = h;
    await comoSistema(async (tx) => {
      for (let i = 0; i < pendientes.length; i++) {
        await tx`update trozos set embedding = ${vectorSql(huellasLote[i])}::extensions.vector where id = ${pendientes[i].id}`;
      }
    });
    hechos += pendientes.length;
    if (opciones.esperarLimite) console.log(`  ${hechos} trozos…`);
  }
  await comoSistema(
    (tx) => tx`
      update tema_versiones v set modelo_busqueda = ${MODELO_HUELLAS}
      where v.id in (select version_actual_id from temas where version_actual_id is not null)
        and v.modelo_busqueda is null
        and not exists (select 1 from trozos tr where tr.version_id = v.id and tr.embedding is null and not tr.es_indice)`,
  );
  return hechos;
}
