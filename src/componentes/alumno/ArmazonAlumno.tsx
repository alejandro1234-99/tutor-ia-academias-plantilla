import Link from "next/link";
import { Marca, PieFuncionaCon } from "@/componentes/Marca";
import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";
import { BarraInferiorAlumno, MenuLateralAlumno } from "./MenuAlumno";
import { BandaSoporte } from "@/componentes/BandaSoporte";

// La estructura de la parte del alumno: menú a la izquierda en el ordenador,
// cabecera y barra inferior de 5 secciones en el móvil.
export function ArmazonAlumno({
  nombre,
  oposicion,
  selector,
  children,
}: {
  nombre: string;
  oposicion: string;
  selector?: React.ReactNode;
  children: React.ReactNode;
}) {
  const inicial = (nombre.trim()[0] || "·").toUpperCase();
  return (
    <>
      <BandaSoporte />
      <div className="armazon">
        <aside className="menu-lateral">
          <div className="marca-menu">
            <Link href="/estudio/preguntar" aria-label={T.menuAlumno.preguntar}>
              <Marca grande />
            </Link>
          </div>
          {selector}
          <MenuLateralAlumno />
          <div className="relleno" />
          <Link href="/estudio/cuenta" className="persona-menu">
            <span className="inicial">{inicial}</span>
            <span className="pila" style={{ minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{nombre}</span>
              <span className="texto-3" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {oposicion}
              </span>
            </span>
          </Link>
          <PieFuncionaCon />
        </aside>
        <div className="contenido con-barra">
          <header className="cabecera-movil">
            <Link href="/estudio/preguntar" aria-label={T.menuAlumno.preguntar}>
              <Marca />
            </Link>
            <div className="fila hueco-4">
              <Link href="/estudio/conversaciones" className="boton-icono" aria-label={T.menuAlumno.conversaciones}>
                <Icono nombre="historial" tam={22} />
              </Link>
              <Link href="/estudio/cuenta" className="boton-icono" aria-label={T.menuAlumno.perfil}>
                <span className="inicial peq">{inicial}</span>
              </Link>
            </div>
          </header>
          {children}
        </div>
      </div>
      <BarraInferiorAlumno />
    </>
  );
}
