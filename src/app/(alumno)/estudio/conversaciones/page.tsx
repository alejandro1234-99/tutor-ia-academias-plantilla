import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/componentes/Icono";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { T, t } from "@/textos";
import { AccionesConversacion } from "./AccionesConversacion";

export const metadata: Metadata = { title: T.conversaciones.titulo };

function grupoFecha(d: Date): string {
  const hoy = new Date();
  const dias = Math.floor((new Date(hoy.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return "Esta semana";
  if (dias < 31) return "Este mes";
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

// A5 · Mis conversaciones
export default async function PaginaConversaciones({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await exigirSesion("alumno");
  const { q = "" } = await searchParams;
  const busqueda = q.trim().slice(0, 100);
  const filas = await conSesion(s, (tx) =>
    busqueda
      ? tx`
          select c.id, c.titulo, c.actualizada_at, (select count(*)::int from mensajes m where m.conversacion_id = c.id) as n
          from conversaciones c
          where academia.sin_acentos(lower(c.titulo)) like ${"%" + busqueda.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "%"}
             or exists (select 1 from mensajes m where m.conversacion_id = c.id
                        and academia.sin_acentos(lower(m.texto)) like ${"%" + busqueda.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "%"})
          order by c.actualizada_at desc limit 100`
      : tx`
          select c.id, c.titulo, c.actualizada_at, (select count(*)::int from mensajes m where m.conversacion_id = c.id) as n
          from conversaciones c order by c.actualizada_at desc limit 100`,
  );
  const grupos = new Map<string, typeof filas>();
  for (const f of filas) {
    const g = grupoFecha(new Date(f.actualizadaAt as string));
    if (!grupos.has(g)) grupos.set(g, [] as unknown as typeof filas);
    grupos.get(g)!.push(f);
  }
  return (
    <main className="pagina estrecha">
      <div className="cabecera-pagina">
        <h1 className="titulo-pagina">{T.conversaciones.titulo}</h1>
        <Link href="/estudio/preguntar" className="boton boton-principal">
          <Icono nombre="mas" tam={18} />
          {T.chat.nueva}
        </Link>
      </div>
      <form className="buscador" role="search" style={{ marginBottom: 24 }}>
        <Icono nombre="lupa" />
        <label htmlFor="q" className="solo-lector">
          {T.conversaciones.buscar}
        </label>
        <input id="q" name="q" type="search" defaultValue={busqueda} placeholder={T.conversaciones.buscar} />
      </form>
      {filas.length === 0 ? (
        busqueda ? (
          <p className="texto-2">{t(T.conversaciones.sinResultados, { q: busqueda })}</p>
        ) : (
          <div className="vacio">
            <span className="circulo">
              <Icono nombre="preguntar" tam={30} />
            </span>
            <h2>{T.conversaciones.vacio}</h2>
            <p>{T.conversaciones.vacioTexto}</p>
            <Link href="/estudio/preguntar" className="boton boton-principal">
              {T.conversaciones.preguntar}
            </Link>
          </div>
        )
      ) : (
        [...grupos.entries()].map(([g, lista]) => (
          <section key={g} style={{ marginBottom: 28 }}>
            <h2 className="antetitulo" style={{ marginBottom: 4 }}>
              {g}
            </h2>
            {lista.map((c) => (
              <div key={c.id as string} className="elemento-biblio">
                <div className="pila rellenar hueco-4">
                  <Link href={`/estudio/preguntar/${c.id}`} className="titulo">
                    {c.titulo as string}
                  </Link>
                  <span className="meta">
                    {new Date(c.actualizadaAt as string).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {t(T.conversaciones.mensajes, { n: c.n as number })}
                  </span>
                </div>
                <AccionesConversacion id={c.id as string} titulo={c.titulo as string} />
              </div>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
