import type { Metadata } from "next";
import { Marca } from "@/componentes/Marca";
import { config } from "@/configuracion";
import { T } from "@/textos";

export const metadata: Metadata = { title: T.pausado.titulo };

// C6 · Servicio pausado (se enciende con «servicioPausado» en la configuración).
export default function PaginaPausado() {
  return (
    <main className="centrado">
      <div className="caja-entrar">
        <Marca grande />
        <div className="pila hueco-12">
          <h1>{T.pausado.titulo}</h1>
          <p>{T.pausado.texto}</p>
          <p className="texto-3" style={{ fontSize: 15 }}>
            <a href={`mailto:${config.correo.ayudaAlumnos}`}>{config.correo.ayudaAlumnos}</a>
          </p>
        </div>
      </div>
    </main>
  );
}
