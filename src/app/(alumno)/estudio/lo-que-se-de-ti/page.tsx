import type { Metadata } from "next";
import { config } from "@/configuracion";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { perfilDe } from "@/servidor/alumno";
import { T, t } from "@/textos";
import { EditorPerfil, NotasMemoria } from "./Editores";

export const metadata: Metadata = { title: T.loQueSe.titulo };

// A14 · Lo que sé de ti
export default async function PaginaLoQueSe() {
  const s = await exigirSesion("alumno");
  const d = await conSesion(s, async (tx) => ({
    perfil: await perfilDe(tx, s.persona.id),
    notas: await tx`select id, tipo, texto from memoria_notas where alumno_id = ${s.persona.id} order by actualizada_at desc`,
  }));
  return (
    <main className="pagina estrecha">
      <div className="cabecera-pagina">
        <div className="pila">
          <h1 className="titulo-pagina">{T.loQueSe.titulo}</h1>
          <p className="subtitulo">{t(T.loQueSe.subtitulo, { asistente: config.asistente.nombre })}</p>
        </div>
      </div>
      <EditorPerfil
        inicial={{
          comoLlamar: d.perfil?.comoLlamar ?? "",
          repite: d.perfil?.repite ?? null,
          horasDia: d.perfil?.horasDia ?? null,
          dificultad: d.perfil?.dificultad ?? null,
        }}
      />
      <NotasMemoria notas={d.notas.map((n) => ({ id: n.id as string, tipo: n.tipo as string, texto: n.texto as string }))} />
    </main>
  );
}
