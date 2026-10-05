import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { config } from "@/configuracion";
import { Chat } from "@/componentes/alumno/Chat";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { aMensajeVista, datosChat } from "@/servidor/chat-datos";
import { T } from "@/textos";
import type { Modo } from "@/tipos/chat";

export const metadata: Metadata = { title: T.menuAlumno.preguntar };

// A3 · Preguntar (conversación guardada). Si no es del alumno, la base de
// datos no la devuelve: «no encontrado».
export default async function PaginaConversacion({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSesion("alumno");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await conSesion(s, async (tx) => {
    const c = await tx`select id, titulo, modo from conversaciones where id = ${id}`;
    if (c.length === 0) return null;
    const mensajes = await tx`select * from mensajes where conversacion_id = ${id} order by creado_at`;
    return { c: c[0], mensajes: mensajes.map((m) => aMensajeVista(m as Record<string, unknown>)), d: await datosChat(tx, s.persona.id) };
  });
  if (!r) notFound();
  return (
    <Chat
      key={id}
      conversacionId={id}
      titulo={r.c.titulo as string}
      mensajesIniciales={r.mensajes}
      modoInicial={(r.c.modo as Modo) ?? "resolver"}
      quedanInicial={r.d.quedan}
      limiteInicial={r.d.limite}
      asistente={config.asistente.nombre}
      nombre={r.d.nombre}
      oposicion={r.d.oposicion}
      ejemplos={r.d.ejemplos}
      sugerencia={null}
    />
  );
}
