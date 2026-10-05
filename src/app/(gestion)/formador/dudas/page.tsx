import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/configuracion";
import { Icono } from "@/componentes/Icono";
import { exigirGestion } from "@/servidor/gestion";
import { conSesion } from "@/servidor/sesion";
import { fechaCorta } from "@/servidor/materiales";
import { T, t } from "@/textos";

export const metadata: Metadata = { title: T.dudas.titulo };

const TIPOS = ["sin_respuesta", "error", "no_sirvio"] as const;

// F6 · Dudas. La bandeja de los grupos del formador, sin el nombre del alumno
// (la base de datos ni siquiera deja leer de quién es).
export default async function PaginaDudas({ searchParams }: { searchParams: Promise<{ tipo?: string; todas?: string }> }) {
  const { s } = await exigirGestion("formador");
  const sp = await searchParams;
  const tipo = TIPOS.find((x) => x === sp.tipo) ?? "sin_respuesta";
  const todas = sp.todas === "1";
  const d = await conSesion(s, async (tx) => ({
    cuentas: await tx`select tipo, count(*)::int as n from dudas where estado = 'pendiente' group by tipo`,
    lista: await tx`
      select d.id, d.tipo, d.pregunta, d.respuesta_asistente, d.estado, d.creada_at, d.contestada_por_nombre, d.contestada_at,
             g.nombre as grupo, t.numero as tema_numero, coalesce(t.nombre_corto, t.nombre) as tema_nombre
      from dudas d join grupos g on g.id = d.grupo_id left join temas t on t.id = d.tema_id
      where d.tipo = ${tipo} and (${todas} or d.estado = 'pendiente')
      order by d.estado = 'pendiente' desc, d.creada_at desc limit 100`,
  }));
  const cuenta = (x: string) => Number(d.cuentas.find((c) => c.tipo === x)?.n ?? 0);
  const D = T.dudas;
  return (
    <main className="pagina media">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{D.titulo}</h1>
          <p className="subtitulo">{t(D.subtitulo, { asistente: config.asistente.nombre })}</p>
        </div>
      </div>
      <nav className="pestanas" style={{ marginBottom: 20 }}>
        {TIPOS.map((x) => (
          <Link key={x} href={`/formador/dudas?tipo=${x}${todas ? "&todas=1" : ""}`} className="pestana" aria-current={tipo === x ? "page" : undefined}>
            {D.pestanas[x]} {cuenta(x) ? <span className="cuenta">{cuenta(x)}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="fila separar" style={{ marginBottom: 12 }}>
        <span className="texto-2" style={{ fontSize: 14 }}>
          {t(D.pendientes, { n: cuenta(tipo) })}
        </span>
        <Link href={`/formador/dudas?tipo=${tipo}${todas ? "" : "&todas=1"}`} className="chip-filtro" aria-pressed={todas}>
          {D.verTodas}
        </Link>
      </div>
      {d.lista.length === 0 ? (
        <div className="vacio">
          <span className="circulo">
            <Icono nombre="bandeja" tam={30} />
          </span>
          <h2>{D.vacio}</h2>
          <p>{D.vacioTexto}</p>
        </div>
      ) : (
        d.lista.map((x) => (
          <Link key={x.id as string} href={`/formador/dudas/${x.id}`} className="elemento-biblio" style={{ textDecoration: "none" }}>
            <div className="pila rellenar hueco-4">
              <span className="meta">
                {x.temaNumero ? `Tema ${x.temaNumero} · ${x.temaNombre}` : D.sinTema} · {x.grupo as string} · {fechaCorta(new Date(x.creadaAt as string).toISOString())}
              </span>
              <span className="titulo">«{x.pregunta as string}»</span>
              {x.estado !== "pendiente" ? (
                <span className={`pastilla ${x.estado === "contestada" ? "bien" : ""}`} style={{ alignSelf: "flex-start" }}>
                  {x.estado === "contestada" ? D.contestada : D.marcadaResuelta}
                </span>
              ) : null}
            </div>
            <Icono nombre="derecha" />
          </Link>
        ))
      )}
    </main>
  );
}
