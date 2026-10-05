import type { Metadata } from "next";
import { Marca } from "@/componentes/Marca";
import { T, t } from "@/textos";
import { accionConfirmar } from "../acciones";

export const metadata: Metadata = { title: T.entrar.confirmarBoton };

// Página intermedia del enlace del correo: hay que pulsar «Entrar».
// Así, los revisores automáticos de algunos correos de empresa, que «abren»
// los enlaces antes que la persona, no gastan el enlace de un solo uso.
export default async function PaginaConfirmar({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token = "" } = await searchParams;
  return (
    <main className="centrado">
      <div className="caja-entrar">
        <Marca grande />
        <div className="pila hueco-12">
          <h1>{T.entrar.confirmarTitulo}</h1>
          <p>{t(T.entrar.confirmarTexto)}</p>
        </div>
        <form action={accionConfirmar}>
          <input type="hidden" name="t" value={token} />
          <button type="submit" className="boton boton-principal boton-grande boton-ancho">
            {T.entrar.confirmarBoton}
          </button>
        </form>
      </div>
    </main>
  );
}
