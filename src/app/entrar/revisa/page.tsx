import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/componentes/Marca";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { Reenviar } from "./Reenviar";

export const metadata: Metadata = { title: T.entrar.revisaTitulo };

// C2 · Revisa tu correo
export default async function PaginaRevisa({ searchParams }: { searchParams: Promise<{ correo?: string }> }) {
  const { correo = "" } = await searchParams;
  return (
    <main className="centrado">
      <div className="caja-entrar">
        <Marca grande />
        <div className="vacio" style={{ padding: 0, alignItems: "flex-start", textAlign: "left" }}>
          <span className="circulo">
            <Icono nombre="correo" tam={30} />
          </span>
        </div>
        <div className="pila hueco-12">
          <h1>{T.entrar.revisaTitulo}</h1>
          <p>{t(T.entrar.revisaTexto, { correo })}</p>
          <p className="texto-3" style={{ fontSize: 15 }}>{T.entrar.revisaPista}</p>
        </div>
        <div className="pila hueco-12">
          <Reenviar correo={correo} />
          <Link href="/entrar" className="boton boton-texto" style={{ alignSelf: "flex-start" }}>
            {T.entrar.otroCorreo}
          </Link>
        </div>
      </div>
    </main>
  );
}
