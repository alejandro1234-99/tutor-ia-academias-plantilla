import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";

export function PocosDatos({ texto = T.metricas.faltan }: { texto?: string }) {
  return (
    <div className="pocos-datos" role="status">
      <Icono nombre="ojo" tam={18} />
      <span>{texto}</span>
    </div>
  );
}

export function CabeceraMetrica({ titulo, subtitulo, alcance }: { titulo: string; subtitulo?: string; alcance: string }) {
  return (
    <div className="cabecera-pagina" style={{ marginBottom: 20 }}>
      <div className="pila hueco-8">
        <span className="pastilla marca" style={{ alignSelf: "flex-start" }}>
          {alcance}
        </span>
        <h1 className="titulo-pagina">{titulo}</h1>
        {subtitulo ? <p className="subtitulo">{subtitulo}</p> : null}
      </div>
    </div>
  );
}

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const DIAS_LARGOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Mapa de a qué horas estudian: un solo tono (el de la marca), más oscuro
// cuantas más preguntas. Cada celda dice su dato al pasar por encima.
export function MapaHoras({ celdas }: { celdas: { dia: number; hora: number; n: number }[] }) {
  const max = Math.max(1, ...celdas.map((c) => c.n));
  const lado = 22;
  const hueco = 3;
  const izq = 26;
  const arriba = 18;
  const ancho = izq + 24 * (lado + hueco);
  const alto = arriba + 7 * (lado + hueco);
  const valor = (d: number, h: number) => celdas.find((c) => c.dia === d && c.hora === h)?.n ?? 0;
  return (
    <figure style={{ margin: 0, overflowX: "auto" }}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} width={ancho} role="img" aria-label="Preguntas por día de la semana y hora" style={{ display: "block", maxWidth: "100%" }}>
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={izq + h * (lado + hueco) + lado / 2} y={12} fontSize={10} fill="var(--text-3)" textAnchor="middle">
            {h}h
          </text>
        ))}
        {DIAS.map((d, i) => (
          <text key={d} x={0} y={arriba + i * (lado + hueco) + lado * 0.7} fontSize={11} fill="var(--text-3)">
            {d}
          </text>
        ))}
        {DIAS.map((_, i) =>
          Array.from({ length: 24 }, (_, h) => {
            const n = valor(i + 1, h);
            return (
              <rect
                key={`${i}-${h}`}
                x={izq + h * (lado + hueco)}
                y={arriba + i * (lado + hueco)}
                width={lado}
                height={lado}
                rx={4}
                fill={n ? "var(--ink)" : "var(--surface-2)"}
                fillOpacity={n ? 0.12 + 0.88 * (n / max) : 1}
              >
                <title>{`${DIAS_LARGOS[i]}, ${h}:00 · ${n} preguntas`}</title>
              </rect>
            );
          }),
        )}
      </svg>
      <div className="solo-lector">
        <table>
          <caption>Preguntas por día y hora</caption>
          <tbody>
            {celdas.map((c) => (
              <tr key={`${c.dia}-${c.hora}`}>
                <td>{DIAS_LARGOS[c.dia - 1]}</td>
                <td>{c.hora}:00</td>
                <td>{c.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export function BarraConsumo({ etiqueta, usado, tope }: { etiqueta: string; usado: number; tope: number }) {
  const pct = tope ? Math.round((usado / tope) * 100) : 0;
  const clase = pct >= 100 ? "al100" : pct >= 80 ? "al80" : "";
  return (
    <div className="pila hueco-8">
      <div className="fila separar" style={{ fontSize: 15 }}>
        <strong>{etiqueta}</strong>
        <span className="fila hueco-12 cifras">
          {pct >= 100 ? (
            <span style={{ color: "var(--err)", fontWeight: 600, fontSize: 13 }}>{T.ajustes.consumo.al100}</span>
          ) : pct >= 80 ? (
            <span style={{ color: "var(--warn)", fontWeight: 600, fontSize: 13 }}>{T.ajustes.consumo.al80.replace("{pct}", String(pct))}</span>
          ) : null}
          <span className="texto-2">{T.ajustes.consumo.de.replace("{usado}", usado.toLocaleString("es-ES")).replace("{tope}", tope.toLocaleString("es-ES"))}</span>
        </span>
      </div>
      <div className={`barra-consumo ${clase}`} role="meter" aria-valuemin={0} aria-valuemax={tope} aria-valuenow={usado} aria-label={etiqueta}>
        <span style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
