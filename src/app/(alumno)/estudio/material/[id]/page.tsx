import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { config } from "@/configuracion";
import { Icono } from "@/componentes/Icono";
import { AccionesMaterial } from "@/componentes/material/AccionesMaterial";
import { EsperaMaterial } from "@/componentes/material/EsperaMaterial";
import { VistaContenido } from "@/componentes/material/VistaContenido";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { fechaCorta, unMaterial } from "@/servidor/materiales";
import { T, t } from "@/textos";
import { tipoMaterial, type ContenidoTest } from "@/tipos/material";

export const metadata: Metadata = { title: T.menuAlumno.biblioteca };
export const maxDuration = 300;

// A7 · Creando… y A8 · Ver material
export default async function PaginaMaterial({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSesion("alumno");
  const { id } = await params;
  const d = await conSesion(s, async (tx) => {
    const m = await unMaterial(tx, s.persona.id, id);
    if (!m) return null;
    const carpetas = await tx`select id, nombre from carpetas order by nombre`;
    const intentos =
      m.formato === "test" || m.formato === "simulacro"
        ? await tx`select id, modo, nota, nota_sin_penalizacion, aciertos, fallos, en_blanco, terminado_at from intentos_test
                   where material_id = ${id} and terminado_at is not null order by terminado_at desc limit 10`
        : [];
    return { m, carpetas: carpetas.map((c) => ({ id: c.id as string, nombre: c.nombre as string })), intentos };
  });
  if (!d) notFound();
  const { m } = d;
  const vuelta = `/estudio/material/${m.id}`;
  const contenido = m.contenido as (ContenidoTest & { suficiente?: boolean; motivo?: string }) | null;
  const esTest = m.formato === "test" || m.formato === "simulacro";

  return (
    <main className="pagina media">
      <Link href="/estudio/biblioteca" className="boton boton-texto" style={{ paddingLeft: 0, marginBottom: 16 }}>
        <Icono nombre="izquierda" tam={16} />
        {T.biblioteca.titulo}
      </Link>
      <div className="pila hueco-8" style={{ marginBottom: 24 }}>
        <span className="texto-2" style={{ fontSize: 14 }}>
          {tipoMaterial(m.formato, m.estilo)} · {m.temas.map((x) => `Tema ${x.numero}`).join(", ")} · {fechaCorta(m.creadoAt)}
          {!m.esMio ? ` · ${T.material.deMiAcademia}` : ""}
        </span>
        <h1 className="titulo-seccion" style={{ fontSize: 40 }}>
          {m.estado === "creando" ? T.material.creandoTitulo : m.titulo}
        </h1>
        {m.actualizado ? (
          <span className="pastilla atencion" style={{ alignSelf: "flex-start" }}>
            <Icono nombre="recargar" tam={14} />
            {T.material.actualizado}
          </span>
        ) : null}
      </div>

      {m.estado === "creando" ? <EsperaMaterial id={m.id} progresoInicial={m.progreso} pasoInicial={m.paso} /> : null}

      <AccionesMaterial
        id={m.id}
        titulo={m.titulo}
        esMio={m.esMio}
        estado={m.estado}
        carpetaId={m.carpetaId}
        carpetas={d.carpetas}
        actualizado={m.actualizado}
        valoracion={m.valoracion}
        alBorrar="/estudio/biblioteca"
      />

      {m.estado === "listo" && contenido ? (
        <div className="material" style={{ marginTop: 32 }}>
          {contenido.suficiente === false ? (
            <div className="aviso atencion">
              <span className="icono-aviso">
                <Icono nombre="atencion" />
              </span>
              <span className="texto-aviso">
                <strong>{T.material.insuficiente}.</strong> {contenido.motivo}
              </span>
            </div>
          ) : esTest ? (
            <div className="pila hueco-24">
              <div className="tarjeta pila hueco-16">
                <span className="texto-2">{t(T.material.preguntasN, { n: contenido.preguntas.length })}</span>
                <Link href={`/test/${m.id}`} className="boton boton-principal boton-grande" style={{ alignSelf: "flex-start" }}>
                  <Icono nombre={m.formato === "simulacro" ? "simulacro" : "test"} tam={18} />
                  {m.formato === "simulacro" ? T.material.empezarSimulacro : T.material.empezarTest}
                </Link>
              </div>
              <section className="pila hueco-8">
                <h2 className="antetitulo">{T.material.intentos}</h2>
                {d.intentos.length === 0 ? (
                  <p className="texto-2">{T.material.sinIntentos}</p>
                ) : (
                  d.intentos.map((i) => (
                    <Link key={i.id as string} href={`/test/${m.id}/resultado/${i.id}`} className="elemento-biblio" style={{ textDecoration: "none" }}>
                      <span className="pila rellenar">
                        <span className="titulo">{String(Number(i.nota).toFixed(2)).replace(".", ",")}</span>
                        <span className="meta">
                          {i.aciertos as number} {T.test.aciertos} · {i.fallos as number} {T.test.fallos} · {i.enBlanco as number} {T.test.enBlanco} ·{" "}
                          {fechaCorta(new Date(i.terminadoAt as string).toISOString())}
                        </span>
                      </span>
                      <Icono nombre="derecha" />
                    </Link>
                  ))
                )}
              </section>
            </div>
          ) : (
            <>
              {m.formato === "tarjetas" ? (
                <Link href={`/estudio/repasar?material=${m.id}`} className="boton boton-principal" style={{ alignSelf: "flex-start" }}>
                  <Icono nombre="repasar" tam={18} />
                  {T.material.repasarTarjetas}
                </Link>
              ) : null}
              <VistaContenido
                formato={m.formato}
                estilo={m.estilo}
                contenido={m.contenido!}
                temas={m.temas}
                literal={!!m.opciones.literal}
                logoSvg={config.logoSvg}
                vuelta={vuelta}
              />
            </>
          )}
        </div>
      ) : null}
    </main>
  );
}
