import type { Metadata } from "next";
import { Icono } from "@/componentes/Icono";
import { comoSistema } from "@/servidor/bd";
import { exigirTecnico } from "@/servidor/tecnico";
import { T } from "@/textos";
import { entrarSoporte } from "../acciones";

export const metadata: Metadata = { title: T.tecnico.soporte.titulo };

// X2 · Modo soporte
export default async function PaginaSoporte() {
  await exigirTecnico();
  const registro = await comoSistema((tx) => tx`select tecnico_correo, empezada_at, terminada_at, pantallas from soporte_entradas order by empezada_at desc limit 30`);
  const S = T.tecnico.soporte;
  return (
    <main className="pagina media">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{S.titulo}</h1>
          <p className="subtitulo">{S.subtitulo}</p>
        </div>
      </div>
      <form action={entrarSoporte} className="pila hueco-12" style={{ marginBottom: 40 }}>
        <button className="boton boton-principal boton-grande" style={{ alignSelf: "flex-start" }}>
          <Icono nombre="ojo" tam={18} />
          {S.entrar}
        </button>
        <span className="texto-3" style={{ fontSize: 13 }}>
          {S.noVe}
        </span>
      </form>
      <section className="pila hueco-8">
        <h2 className="antetitulo">{S.registro}</h2>
        {registro.map((r, i) => (
          <div key={i} className="elemento-biblio">
            <div className="pila rellenar hueco-4">
              <span className="titulo">{r.tecnicoCorreo as string}</span>
              <span className="meta">
                {new Date(r.empezadaAt as string).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {(r.pantallas as string[]).length} pantallas
                {r.terminadaAt ? "" : " · en curso"}
              </span>
              <span className="meta" style={{ fontSize: 12 }}>
                {[...new Set(r.pantallas as string[])].slice(0, 12).join(" · ")}
              </span>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
