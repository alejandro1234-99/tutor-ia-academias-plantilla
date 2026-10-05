import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { comoSistema } from "@/servidor/bd";
import { entornoPruebas } from "@/servidor/pruebas";
import { Palancas } from "./Palancas";

export const metadata: Metadata = { title: "Panel de pruebas" };
export const dynamic = "force-dynamic";

// Panel de pruebas: solo existe en la dirección de pruebas.
export default async function PanelPruebas() {
  if (!entornoPruebas()) notFound();
  const fallo = await comoSistema((tx) => tx`select valor from ajustes where clave = 'pruebas.fallo_ia'`);
  return (
    <main className="pagina estrecha">
      <h1 className="titulo-pagina">Panel de pruebas</h1>
      <p className="subtitulo" style={{ margin: "12px 0 28px" }}>
        Solo existe en la dirección de pruebas. Sirve para las pruebas de dos minutos de cada capa. <a href="/pruebas/buzon">Buzón de pruebas</a>
      </p>
      <Palancas falloIA={fallo[0]?.valor === true} />
    </main>
  );
}
