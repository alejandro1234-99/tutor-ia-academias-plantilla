// Gráfica de la nota de los tests a lo largo del tiempo (una sola serie:
// sin leyenda, el título la nombra). Línea de 2 px, puntos de 8 px con su
// dato al pasar por encima, cuadrícula discreta. Debajo, la misma
// información en una tabla para lectores de pantalla.

export function GraficaNotas({ puntos }: { puntos: { fecha: string; nota: number; etiqueta: string }[] }) {
  const ancho = 640;
  const alto = 220;
  const m = { izq: 34, der: 16, arr: 14, aba: 30 };
  const w = ancho - m.izq - m.der;
  const h = alto - m.arr - m.aba;
  const x = (i: number) => m.izq + (puntos.length <= 1 ? w / 2 : (i / (puntos.length - 1)) * w);
  const y = (n: number) => m.arr + h - (Math.max(0, Math.min(10, n)) / 10) * h;
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.nota).toFixed(1)}`).join(" ");
  const coma = (n: number) => n.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" role="img" aria-label="Evolución de tus notas en los tests" style={{ display: "block", overflow: "visible" }}>
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={m.izq} x2={ancho - m.der} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={m.izq - 8} y={y(v) + 4} textAnchor="end" fontSize={12} fill="var(--text-3)">
              {v}
            </text>
          </g>
        ))}
        <line x1={m.izq} x2={ancho - m.der} y1={y(5)} y2={y(5)} stroke="var(--line-strong)" strokeDasharray="3 4" strokeWidth={1} />
        {puntos.length > 1 ? <path d={linea} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {puntos.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.nota)} r={14} fill="transparent">
              <title>{`${p.etiqueta}: ${coma(p.nota)}`}</title>
            </circle>
            <circle cx={x(i)} cy={y(p.nota)} r={4} fill="var(--ink)" stroke="var(--bg)" strokeWidth={2} pointerEvents="none" />
          </g>
        ))}
        {puntos.length ? (
          <>
            <text x={x(0)} y={alto - 8} fontSize={12} fill="var(--text-3)" textAnchor={puntos.length > 1 ? "start" : "middle"}>
              {puntos[0].fecha}
            </text>
            {puntos.length > 1 ? (
              <text x={x(puntos.length - 1)} y={alto - 8} fontSize={12} fill="var(--text-3)" textAnchor="end">
                {puntos[puntos.length - 1].fecha}
              </text>
            ) : null}
            <text x={x(puntos.length - 1) + 8} y={y(puntos[puntos.length - 1].nota) - 10} fontSize={13} fontWeight={600} fill="var(--text)" textAnchor="end">
              {coma(puntos[puntos.length - 1].nota)}
            </text>
          </>
        ) : null}
      </svg>
      <div className="solo-lector">
        <table>
          <caption>Notas de tus tests</caption>
          <tbody>
            {puntos.map((p, i) => (
              <tr key={i}>
                <td>{p.etiqueta}</td>
                <td>{coma(p.nota)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
