import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/componentes/Marca";
import { T } from "@/textos";

export const metadata: Metadata = { title: T.entrar.caducadoTitulo };

// C3 · Enlace caducado
export default function PaginaCaducado() {
  return (
    <main className="centrado">
      <div className="caja-entrar">
        <Marca grande />
        <div className="pila hueco-12">
          <h1>{T.entrar.caducadoTitulo}</h1>
          <p>{T.entrar.caducadoTexto}</p>
        </div>
        <Link href="/entrar" className="boton boton-principal boton-grande boton-ancho">
          {T.entrar.pedirOtro}
        </Link>
      </div>
    </main>
  );
}
