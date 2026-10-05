"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { etiquetaArticulo } from "@/tipos/chat";
import type { PaginaVisor } from "@/servidor/visor";

async function pedirPagina(versionId: string, n: number): Promise<{ datos: PaginaVisor } | { error: string }> {
  try {
    const r = await fetch(`/api/temario/pagina?v=${versionId}&n=${n}`);
    const j = await r.json();
    return r.ok ? { datos: j as PaginaVisor } : { error: j.error || T.visor.noDisponible };
  } catch {
    return { error: T.comun.sinConexion };
  }
}

// A4 · Visor del temario: una página cada vez, con lo citado resaltado.
// Sin botón de descargar ni de imprimir.
export function VisorPagina({
  versionId,
  pagina: paginaInicial,
  resaltar,
  inicial,
  alCerrar,
  hrefCerrar,
}: {
  versionId: string;
  pagina: number;
  resaltar: number[];
  inicial?: PaginaVisor | null;
  alCerrar?: () => void;
  hrefCerrar?: string;
}) {
  const [numero, setNumero] = useState(paginaInicial);
  const [datos, setDatos] = useState<PaginaVisor | null>(inicial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(!inicial);
  const hoja = useRef<HTMLDivElement>(null);

  const cargar = useCallback(
    async (n: number) => {
      setCargando(true);
      setError(null);
      const r = await pedirPagina(versionId, n);
      if ("error" in r) setError(r.error);
      else {
        setDatos(r.datos);
        setNumero(n);
      }
      setCargando(false);
    },
    [versionId],
  );

  // Si no viene la página ya cargada, se pide. (Al cambiar de cita, el visor
  // se vuelve a montar con otra «key», así que no hace falta más.)
  useEffect(() => {
    if (inicial && inicial.versionId === versionId && inicial.pagina === paginaInicial) return;
    let vivo = true;
    (async () => {
      const r = await pedirPagina(versionId, paginaInicial);
      if (!vivo) return;
      if ("error" in r) setError(r.error);
      else {
        setDatos(r.datos);
        setNumero(paginaInicial);
      }
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [versionId, paginaInicial, inicial]);

  useEffect(() => {
    // Llevar a la vista lo resaltado.
    if (datos && numero === paginaInicial && resaltar.length) {
      hoja.current?.querySelector("[data-resaltado]")?.scrollIntoView({ block: "center" });
    } else {
      hoja.current?.scrollTo?.({ top: 0 });
    }
  }, [datos, numero, paginaInicial, resaltar]);

  const marcados = new Set(numero === paginaInicial ? resaltar : []);
  const arts = datos ? [...new Set(datos.parrafos.filter((_, i) => marcados.has(i)).map((p) => p.art).filter(Boolean))] : [];
  const impreso = datos?.numeroImpreso ?? numero;

  const cerrar = alCerrar ? (
    <button type="button" className="boton-icono" onClick={alCerrar} aria-label={T.visor.cerrar}>
      <Icono nombre="cerrar" tam={22} />
    </button>
  ) : hrefCerrar ? (
    <Link href={hrefCerrar} className="boton-icono" aria-label={T.visor.cerrar}>
      <Icono nombre="cerrar" tam={22} />
    </Link>
  ) : null;

  return (
    <section className="visor" aria-label={T.visor.titulo} onContextMenu={(e) => e.preventDefault()}>
      <header className="visor-cabecera">
        {cerrar}
        <div className="pila rellenar">
          <span className="titulo">{datos ? `Tema ${datos.temaNumero} · ${datos.temaNombre}` : T.visor.titulo}</span>
          <span className="sub">
            {t(T.visor.pagina, { n: impreso })}
            {datos ? ` · ${t(T.visor.paginaDe, { n: impreso, total: datos.total })}` : ""}
            {marcados.size && arts.length ? ` · ${arts.map((a) => etiquetaArticulo(a)).join(", ")} resaltado` : ""}
          </span>
        </div>
      </header>

      <div className="visor-hoja" ref={hoja} aria-busy={cargando}>
        {error ? (
          <div className="aviso atencion" role="alert">
            <span className="icono-aviso">
              <Icono nombre="atencion" />
            </span>
            <span className="texto-aviso">{error}</span>
          </div>
        ) : datos ? (
          <>
            <div className="ante">
              Tema {datos.temaNumero} · {datos.temaNombre}
            </div>
            {datos.esIndice ? <p className="parrafo menor">{T.visor.indice}</p> : null}
            {datos.parrafos.map((p, i) => {
              const clase = p.k === "enc" ? "parrafo encabezado" : p.k === "art" ? "parrafo titulo-art" : "parrafo";
              const contenido = marcados.has(i) ? <mark data-resaltado>{p.t}</mark> : p.t;
              return (
                <p key={i} className={clase}>
                  {contenido}
                </p>
              );
            })}
          </>
        ) : (
          <p className="texto-3">{T.comun.cargando}</p>
        )}
      </div>

      <footer className="visor-pie">
        <button type="button" className="boton boton-peq" disabled={!datos || numero <= 1 || cargando} onClick={() => cargar(numero - 1)}>
          <Icono nombre="izquierda" tam={16} />
          {t(T.visor.anterior, { n: Math.max(1, impreso - 1) })}
        </button>
        <span className="texto-3 cifras" style={{ fontSize: 14 }}>
          {datos ? t(T.visor.paginaDe, { n: impreso, total: datos.total }) : ""}
        </span>
        <button
          type="button"
          className="boton boton-peq"
          disabled={!datos || numero >= (datos?.total ?? 0) || cargando}
          onClick={() => cargar(numero + 1)}
        >
          {t(T.visor.siguiente, { n: impreso + 1 })}
          <Icono nombre="derecha" tam={16} />
        </button>
      </footer>
    </section>
  );
}
