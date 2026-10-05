import Link from "next/link";
import { BandaSoporte } from "@/componentes/BandaSoporte";
import { Icono } from "@/componentes/Icono";
import { Marca, PieFuncionaCon } from "@/componentes/Marca";
import { SelectorPapel } from "@/componentes/SelectorPapel";
import { conSesion, type Sesion } from "@/servidor/sesion";
import type { PapelGestion } from "@/servidor/gestion";
import { T } from "@/textos";
import { CajonGestion, MenuLateralGestion, type GrupoMenu } from "./MenuGestion";

async function grupos(s: Sesion, papel: PapelGestion): Promise<GrupoMenu[]> {
  const M = T.menuGestion;
  const metricas: GrupoMenu = {
    titulo: M.parteMetricas,
    enlaces: [
      { href: "/metricas/uso", texto: M.uso, icono: "grafica" },
      { href: "/metricas/dudas", texto: M.dudasAtascos, icono: "info" },
      { href: "/metricas/riesgo", texto: M.riesgo, icono: "atencion" },
      { href: "/metricas/progreso", texto: M.progresoGrupo, icono: "progreso" },
      { href: "/metricas/material", texto: M.materialMetricas, icono: "documento" },
    ],
  };
  if (papel === "tecnico") {
    return [
      {
        titulo: M.parteTecnico,
        enlaces: [
          { href: "/tecnico/coste", texto: M.coste, icono: "grafica" },
          { href: "/tecnico/soporte", texto: M.soporte, icono: "ojo" },
          { href: "/tecnico/limites", texto: M.limites, icono: "ajustes" },
        ],
      },
    ];
  }
  if (papel === "dueno") {
    return [
      metricas,
      {
        titulo: M.parteAjustes,
        enlaces: [
          { href: "/ajustes/equipo", texto: M.equipo, icono: "grupo" },
          { href: "/ajustes/grupos", texto: M.grupos, icono: "carpeta" },
          { href: "/ajustes/consumo", texto: M.consumo, icono: "progreso" },
          { href: "/ajustes/ayuda", texto: M.ayuda, icono: "ayuda" },
        ],
      },
    ];
  }
  const pendientes = await conSesion(s, async (tx) => {
    const f = await tx`select count(*)::int as n from dudas where estado = 'pendiente' and grupo_id = any(academia.mis_grupos())`;
    return Number(f[0]?.n ?? 0);
  });
  return [
    {
      titulo: M.parteFormador,
      enlaces: [
        { href: "/formador/temario", texto: M.temario, icono: "documento" },
        { href: "/formador/alumnos", texto: M.alumnos, icono: "grupo" },
        { href: "/formador/material", texto: M.material, icono: "crear" },
        { href: "/formador/dudas", texto: M.dudas, icono: "bandeja", globo: pendientes || undefined },
        { href: "/formador/ayuda", texto: M.ayuda, icono: "ayuda" },
      ],
    },
    metricas,
  ];
}

export async function ArmazonGestion({ s, papel, children }: { s: Sesion; papel: PapelGestion; children: React.ReactNode }) {
  const g = await grupos(s, papel);
  const inicial = (s.persona.nombre.trim()[0] || "·").toUpperCase();
  const selector = s.soporte ? null : <SelectorPapel papeles={s.papeles} actual={papel} />;
  const persona = (
    <div className="pila hueco-8">
      <div className="persona-menu">
        <span className="inicial">{inicial}</span>
        <span className="pila" style={{ minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{s.soporte ? s.soporte.tecnicoCorreo : s.persona.nombre}</span>
          <span className="texto-3" style={{ fontSize: 12 }}>
            {T.papeles[papel]}
          </span>
        </span>
      </div>
      {s.soporte ? null : (
        <form action="/salir" method="post">
          <button type="submit" className="enlace-menu" style={{ width: "100%", border: 0, background: "transparent" }}>
            <Icono nombre="salir" />
            <span>{T.entrar.salir}</span>
          </button>
        </form>
      )}
      <PieFuncionaCon />
    </div>
  );
  return (
    <>
      <BandaSoporte />
      <div className="armazon">
        <aside className="menu-lateral" style={{ overflowY: "auto" }}>
          <div className="marca-menu" style={{ paddingBottom: 24 }}>
            <Link href="/" aria-label={T.comun.irAlInicio}>
              <Marca grande />
            </Link>
          </div>
          {selector}
          <MenuLateralGestion grupos={g} />
          <div className="relleno" />
          {persona}
        </aside>
        <div className="contenido">
          <header className="cabecera-movil" style={{ borderBottom: "1px solid var(--line)" }}>
            <Link href="/" aria-label={T.comun.irAlInicio}>
              <Marca />
            </Link>
            <CajonGestion grupos={g} cabecera={<span className="antetitulo">{T.papeles[papel]}</span>} pie={<div className="pila hueco-12">{selector}{persona}</div>} />
          </header>
          {children}
        </div>
      </div>
    </>
  );
}
