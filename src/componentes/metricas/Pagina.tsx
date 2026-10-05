import { FiltrosMetricas } from "./Filtros";
import { CabeceraMetrica } from "./Piezas";
import type { Contexto } from "@/servidor/metricas";
import { T } from "@/textos";

export function PaginaMetrica({ titulo, subtitulo, seccion, c, children }: { titulo: string; subtitulo?: string; seccion: string; c: Contexto; children: React.ReactNode }) {
  return (
    <main className="pagina">
      <CabeceraMetrica titulo={titulo} subtitulo={subtitulo} alcance={c.esDueno ? T.metricas.alcanceDueno : T.metricas.alcanceFormador} />
      <FiltrosMetricas filtros={c.filtros} opciones={c.opciones} esDueno={c.esDueno} seccion={seccion} />
      {children}
    </main>
  );
}
