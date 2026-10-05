import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { config } from "@/configuracion";
import { Marca } from "@/componentes/Marca";
import { conSesion, exigirSesion } from "@/servidor/sesion";
import { oposicionDe, perfilDe } from "@/servidor/alumno";
import { T } from "@/textos";
import { PasosPrimeraVez } from "./PasosPrimeraVez";

export const metadata: Metadata = { title: T.primeraVez.tituloPrivacidad };

// A1 y A2 · La primera vez: privacidad y aviso de IA, y el perfil de un minuto.
export default async function PrimeraVez() {
  const s = await exigirSesion("alumno");
  const { perfil, op } = await conSesion(s, async (tx) => ({ perfil: await perfilDe(tx, s.persona.id), op: await oposicionDe(tx, s.persona.id) }));
  if (perfil?.completadoAt) redirect("/estudio/preguntar");
  return (
    <main className="centrado" style={{ justifyContent: "flex-start", paddingTop: 32 }}>
      <div className="caja-entrar" style={{ maxWidth: 560 }}>
        <Marca grande />
        <PasosPrimeraVez
          asistente={config.asistente.nombre}
          edadMinima={config.legal.edadMinima}
          oposicion={op?.nombre ?? ""}
          nombreSugerido={s.persona.nombre.split(" ")[0]}
        />
      </div>
    </main>
  );
}
