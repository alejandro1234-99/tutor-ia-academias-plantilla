"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, type NombreIcono } from "@/componentes/Icono";
import { T } from "@/textos";

const SECCIONES: { href: string; icono: NombreIcono; texto: string }[] = [
  { href: "/estudio/preguntar", icono: "preguntar", texto: T.menuAlumno.preguntar },
  { href: "/estudio/crear", icono: "crear", texto: T.menuAlumno.crear },
  { href: "/estudio/biblioteca", icono: "biblioteca", texto: T.menuAlumno.biblioteca },
  { href: "/estudio/repasar", icono: "repasar", texto: T.menuAlumno.repasar },
  { href: "/estudio/progreso", icono: "progreso", texto: T.menuAlumno.progreso },
];

function activa(ruta: string, href: string) {
  if (href === "/estudio/preguntar") return ruta.startsWith("/estudio/preguntar") || ruta.startsWith("/estudio/conversaciones");
  if (href === "/estudio/biblioteca") return ruta.startsWith("/estudio/biblioteca") || ruta.startsWith("/estudio/material") || ruta.startsWith("/estudio/test");
  return ruta.startsWith(href);
}

export function MenuLateralAlumno() {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones">
      {SECCIONES.map((s) => (
        <Link key={s.href} href={s.href} className="enlace-menu" aria-current={activa(ruta, s.href) ? "page" : undefined}>
          <Icono nombre={s.icono} />
          <span>{s.texto}</span>
        </Link>
      ))}
    </nav>
  );
}

export function BarraInferiorAlumno() {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones" className="barra-inferior">
      {SECCIONES.map((s) => (
        <Link key={s.href} href={s.href} aria-current={activa(ruta, s.href) ? "page" : undefined}>
          <span className="icono-barra">
            <Icono nombre={s.icono} />
          </span>
          <span className="texto-barra">{s.texto}</span>
        </Link>
      ))}
    </nav>
  );
}
