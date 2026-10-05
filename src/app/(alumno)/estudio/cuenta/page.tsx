import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/configuracion";
import { Icono } from "@/componentes/Icono";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { T, t } from "@/textos";
import { AjustesCuenta, BorrarDatos } from "./Ajustes";

export const metadata: Metadata = { title: T.cuenta.titulo };

// A15 · Mi cuenta
export default async function PaginaCuenta() {
  const s = await exigirSesion("alumno");
  const pref = await conSesion(s, async (tx) => (await tx`select tema_visual, recordatorio, avisos_formador from preferencias where persona_id = ${s.persona.id}`)[0]);
  const C = T.cuenta;
  return (
    <main className="pagina estrecha">
      <div className="cabecera-pagina">
        <div className="pila hueco-4">
          <h1 className="titulo-pagina">{C.titulo}</h1>
          <p className="subtitulo">
            {s.persona.nombre} · {s.persona.correo}
          </p>
        </div>
      </div>
      <div className="pila hueco-24">
        <Link href="/estudio/lo-que-se-de-ti" className="tarjeta fila separar" style={{ color: "var(--text)", textDecoration: "none" }}>
          <span className="fila hueco-12">
            <Icono nombre="persona" />
            <strong>{C.loQueSe}</strong>
          </span>
          <Icono nombre="derecha" />
        </Link>
        <AjustesCuenta
          recordatorio={pref?.recordatorio ?? true}
          avisosFormador={pref?.avisosFormador ?? true}
          tema={(pref?.temaVisual as string) ?? "auto"}
          dias={config.avisos.diasParaRecordatorio}
        />
        <section className="tarjeta pila hueco-16">
          <h2 className="antetitulo">{C.misDatos}</h2>
          <a href="/api/cuenta/biblioteca" className="fila separar" style={{ color: "var(--text)" }}>
            <span className="pila">
              <strong>{C.descargarBiblioteca}</strong>
              <span className="texto-2" style={{ fontSize: 14 }}>
                {C.descargarBibliotecaAyuda}
              </span>
            </span>
            <Icono nombre="descargar" />
          </a>
          <hr className="linea-sep" />
          <a href="/api/cuenta/datos" className="fila separar" style={{ color: "var(--text)" }}>
            <span className="pila">
              <strong>{C.copiaDatos}</strong>
              <span className="texto-2" style={{ fontSize: 14 }}>
                {C.copiaDatosAyuda}
              </span>
            </span>
            <Icono nombre="descargar" />
          </a>
          <hr className="linea-sep" />
          <BorrarDatos ayuda={t(C.borrarDatosAyuda)} />
        </section>
        <section className="tarjeta pila hueco-8">
          <h2 className="antetitulo">{C.ayuda}</h2>
          <p>
            {C.ayudaTexto} <a href={`mailto:${config.correo.ayudaAlumnos}`}>{config.correo.ayudaAlumnos}</a>
          </p>
          <Link href="/legal" style={{ fontSize: 14 }}>
            {C.legal}
          </Link>
        </section>
        <form action="/salir" method="post">
          <button type="submit" className="boton boton-ancho">
            <Icono nombre="salir" tam={18} />
            {C.salir}
          </button>
        </form>
      </div>
    </main>
  );
}
