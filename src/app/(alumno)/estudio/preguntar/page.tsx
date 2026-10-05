import type { Metadata } from "next";
import { after } from "next/server";
import { config } from "@/configuracion";
import { Chat } from "@/componentes/alumno/Chat";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { datosChat } from "@/servidor/chat-datos";
import { procesarMemoriaPendiente } from "@/servidor/ia/memoria";
import { T } from "@/textos";
import type { Modo } from "@/tipos/chat";

export const metadata: Metadata = { title: T.menuAlumno.preguntar };

// A3 · Preguntar (conversación nueva)
export default async function PaginaPreguntar({ searchParams }: { searchParams: Promise<{ q?: string; modo?: string }> }) {
  const s = await exigirSesion("alumno");
  const { q, modo } = await searchParams;
  const d = await conSesion(s, (tx) => datosChat(tx, s.persona.id));
  // Las conversaciones que llevan un rato paradas pasan a la memoria.
  if (!s.soporte) after(() => procesarMemoriaPendiente(s.persona.id));
  const modoPregunta = (["resolver", "guiado", "examinador"] as Modo[]).find((m) => m === modo) ?? null;
  return (
    <Chat
      conversacionId={null}
      titulo={T.chat.tituloNueva}
      mensajesIniciales={[]}
      modoInicial={modoPregunta ?? "resolver"}
      quedanInicial={d.quedan}
      limiteInicial={d.limite}
      asistente={config.asistente.nombre}
      nombre={d.nombre}
      oposicion={d.oposicion}
      ejemplos={d.ejemplos}
      sugerencia={d.sugerencia}
      preguntaInicial={q?.slice(0, 500) ?? null}
      modoPregunta={modoPregunta}
    />
  );
}
