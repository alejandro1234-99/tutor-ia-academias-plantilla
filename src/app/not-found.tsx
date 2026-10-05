import Link from "next/link";
import { T } from "@/textos";

export default function NoEncontrado() {
  return (
    <main className="centrado">
      <div className="caja-entrar">
        <div className="pila hueco-12">
          <h1>{T.comun.noEncontrado}</h1>
          <p>{T.comun.noEncontradoTexto}</p>
        </div>
        <Link href="/" className="boton boton-principal boton-grande boton-ancho">
          {T.comun.irAlInicio}
        </Link>
      </div>
    </main>
  );
}
