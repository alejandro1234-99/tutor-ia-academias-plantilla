import { Fragment } from "react";

// Texto con **negritas** y listas, sin HTML: todo se pinta como texto, así
// que nada de lo que escriba la IA puede inyectar código en la página.

export function EnLinea({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

const VINETA = /^\s*[-•*]\s+/;
const NUMERO = /^\s*\d+[.)]\s+/;

/**
 * Un párrafo: texto normal, una lista, o las dos cosas seguidas
 * («Te propongo esto:» y debajo la lista, sin línea en blanco en medio).
 */
export function Parrafo({ texto, className }: { texto: string; className?: string }) {
  const lineas = texto.split("\n").filter((l) => l.trim());
  const primeraLista = lineas.findIndex((l) => VINETA.test(l) || NUMERO.test(l));
  if (primeraLista > 0 && lineas.slice(primeraLista).every((l) => VINETA.test(l) || NUMERO.test(l))) {
    return (
      <>
        <Parrafo texto={lineas.slice(0, primeraLista).join("\n")} className={className} />
        <Parrafo texto={lineas.slice(primeraLista).join("\n")} className={className} />
      </>
    );
  }
  const esLista = lineas.length > 0 && lineas.every((l) => VINETA.test(l));
  const esNumerada = lineas.length > 1 && lineas.every((l) => NUMERO.test(l));
  if (esLista || esNumerada) {
    const Tag = esNumerada ? "ol" : "ul";
    return (
      <Tag className={className}>
        {lineas.map((l, i) => (
          <li key={i}>
            <EnLinea texto={l.replace(/^\s*([-•*]|\d+[.)])\s+/, "")} />
          </li>
        ))}
      </Tag>
    );
  }
  return (
    <p className={className}>
      {lineas.map((l, i) => (
        <Fragment key={i}>
          {i > 0 ? <br /> : null}
          <EnLinea texto={l} />
        </Fragment>
      ))}
    </p>
  );
}

/** Divide un texto en párrafos (separados por una línea en blanco), con su posición. */
export function parrafosConPosicion(texto: string): { texto: string; desde: number; hasta: number }[] {
  const res: { texto: string; desde: number; hasta: number }[] = [];
  const re = /\n\s*\n/g;
  let inicio = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    res.push({ texto: texto.slice(inicio, m.index), desde: inicio, hasta: m.index });
    inicio = m.index + m[0].length;
  }
  res.push({ texto: texto.slice(inicio), desde: inicio, hasta: texto.length });
  return res.filter((p) => p.texto.trim());
}
