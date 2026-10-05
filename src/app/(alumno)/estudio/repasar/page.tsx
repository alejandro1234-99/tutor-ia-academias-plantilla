import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/componentes/Icono";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { anadirTarjetas, paraHoy } from "@/servidor/repaso";
import { T, t } from "@/textos";
import { SesionRepaso } from "./SesionRepaso";

export const metadata: Metadata = { title: T.repasar.titulo };

// A12 · Repasar hoy
export default async function PaginaRepasar({ searchParams }: { searchParams: Promise<{ material?: string }> }) {
  const s = await exigirSesion("alumno");
  const { material } = await searchParams;
  const elementos = await conSesion(s, async (tx) => {
    if (material && /^[0-9a-f-]{36}$/i.test(material) && !s.soporte) await anadirTarjetas(tx, s.persona.id, material);
    return paraHoy(tx, s.persona.id);
  });
  const tarjetas = elementos.filter((e) => e.tipo === "tarjeta").length;
  const preguntas = elementos.length - tarjetas;
  return (
    <main className="pagina estrecha">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{T.repasar.titulo}</h1>
          <p className="subtitulo">
            {elementos.length ? [tarjetas ? t(T.repasar.tarjetasHoy, { n: tarjetas }) : null, preguntas ? t(T.repasar.preguntasHoy, { n: preguntas }) : null].filter(Boolean).join(" · ") : T.repasar.subtitulo}
          </p>
        </div>
      </div>
      {elementos.length === 0 ? (
        <div className="vacio">
          <span className="circulo">
            <Icono nombre="repasar" tam={30} />
          </span>
          <h2>{T.repasar.vacio}</h2>
          <p>{T.repasar.vacioTexto}</p>
          <Link href="/estudio/crear" className="boton boton-principal">
            <Icono nombre="crear" tam={18} />
            {T.repasar.crearTarjetas}
          </Link>
        </div>
      ) : (
        <SesionRepaso elementos={elementos} />
      )}
      <p className="texto-3" style={{ fontSize: 13, marginTop: 28, textAlign: "center" }}>
        {T.repasar.noCuenta}
      </p>
    </main>
  );
}
