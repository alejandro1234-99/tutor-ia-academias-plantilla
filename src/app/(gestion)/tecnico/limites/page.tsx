import type { Metadata } from "next";
import { config } from "@/configuracion";
import { comoSistema } from "@/servidor/bd";
import { exigirTecnico } from "@/servidor/tecnico";
import { T } from "@/textos";
import { Limites } from "./Limites";

export const metadata: Metadata = { title: T.tecnico.limites.titulo };

// X3 · Límites y cuentas
export default async function PaginaLimites() {
  await exigirTecnico();
  const ajustes = await comoSistema((tx) => tx`select clave, valor from ajustes where clave like 'limites.%'`);
  const actual: Record<string, number | null> = {};
  for (const a of ajustes) actual[a.clave as string] = a.valor as number;
  const porDefecto: Record<string, number> = {
    "limites.preguntasAlDia": config.limites.preguntasAlDia,
    "limites.materialesAlMes": config.limites.materialesAlMes,
    "limites.materialesFormadorAlMes": config.limites.materialesFormadorAlMes,
    "limites.topeAcademiaPreguntasMes": config.limites.topeAcademiaPreguntasMes,
    "limites.topeAcademiaMaterialesMes": config.limites.topeAcademiaMaterialesMes,
    "limites.alumnosIncluidos": config.limites.alumnosIncluidos,
  };
  return (
    <main className="pagina media">
      <h1 className="titulo-pagina" style={{ marginBottom: 32 }}>
        {T.tecnico.limites.titulo}
      </h1>
      <Limites actual={actual} porDefecto={porDefecto} />
    </main>
  );
}
