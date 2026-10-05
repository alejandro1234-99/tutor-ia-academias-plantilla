"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icono, type NombreIcono } from "@/componentes/Icono";
import { T } from "@/textos";

export type GrupoMenu = { titulo: string; enlaces: { href: string; texto: string; icono: NombreIcono; globo?: number }[] };

function Enlaces({ grupos }: { grupos: GrupoMenu[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones" className="pila">
      {grupos.map((g) => (
        <div key={g.titulo} className="pila hueco-4">
          <div className="grupo-menu antetitulo">{g.titulo}</div>
          {g.enlaces.map((e) => (
            <Link key={e.href} href={e.href} className="enlace-menu" aria-current={ruta === e.href || ruta.startsWith(e.href + "/") ? "page" : undefined}>
              <Icono nombre={e.icono} />
              <span>{e.texto}</span>
              {e.globo ? <span className="globo cifras">{e.globo}</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function MenuLateralGestion({ grupos }: { grupos: GrupoMenu[] }) {
  return <Enlaces grupos={grupos} />;
}

export function CajonGestion({ grupos, cabecera, pie }: { grupos: GrupoMenu[]; cabecera: React.ReactNode; pie: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className="boton-icono" aria-label={T.menuGestion.menu} aria-expanded={abierto} onClick={() => setAbierto(true)}>
        <Icono nombre="menu" tam={24} />
      </button>
      {abierto ? (
        <>
          <div className="cajon-fondo" onClick={() => setAbierto(false)} />
          <div
            className="cajon"
            role="dialog"
            aria-label={T.menuGestion.menu}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setAbierto(false);
            }}
          >
            <div className="fila separar" style={{ marginBottom: 16 }}>
              {cabecera}
              <button type="button" className="boton-icono" aria-label={T.comun.cerrar} onClick={() => setAbierto(false)}>
                <Icono nombre="cerrar" tam={22} />
              </button>
            </div>
            <Enlaces grupos={grupos} />
            <div className="relleno" style={{ flex: 1 }} />
            {pie}
          </div>
        </>
      ) : null}
    </>
  );
}
