import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Marca } from "@/componentes/Marca";
import { config } from "@/configuracion";
import { obtenerSesion } from "@/servidor/sesion";
import { T } from "@/textos";
import { FormularioEntrar } from "./FormularioEntrar";

export const metadata: Metadata = { title: T.entrar.boton };

// C1 · Entrar
export default async function PaginaEntrar() {
  if (await obtenerSesion()) redirect("/");
  return (
    <main className="centrado">
      <div className="caja-entrar">
        <Marca grande />
        <div className="pila hueco-12">
          <h1>{T.entrar.titulo}</h1>
          <p>{T.entrar.texto}</p>
        </div>
        <FormularioEntrar />
      </div>
      <p className="pie-suelto">{config.pie.funcionaCon}</p>
    </main>
  );
}
