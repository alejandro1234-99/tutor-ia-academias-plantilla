import "server-only";
import type { CitaMaterial, Contenido, Estilo, Formato, OpcionesMaterial } from "@/tipos/material";
import type { TemaTexto } from "./material";

// MATERIAL SIMULADO · SOLO PARA PROBAR EN ESTE SERVIDOR (IA_SIMULADA=1).
// Monta cada formato con frases reales del temario, sin IA, para probar
// pantallas, biblioteca, tests, repaso y descargas. Nunca en la web publicada.

type Pieza = { tema: number; pagina: number; articulo: string | null; texto: string };

function piezas(temas: TemaTexto[]): Pieza[] {
  const res: Pieza[] = [];
  for (const t of temas) {
    for (const p of t.paginas) {
      for (const x of p.parrafos) {
        if (x.k === "normal" && x.t.length > 80 && x.art && /^\d/.test(x.art)) {
          res.push({ tema: t.numero, pagina: p.impresa ?? p.numero, articulo: x.art, texto: x.t.replace(/^\d+\.\s/, "") });
        }
      }
    }
  }
  return res;
}

function repartir<T>(lista: T[], n: number): T[] {
  if (lista.length <= n) return lista;
  const paso = lista.length / n;
  return Array.from({ length: n }, (_, i) => lista[Math.floor(i * paso)]);
}

const cita = (p: Pieza): CitaMaterial => ({ tema: p.tema, pagina: p.pagina, articulo: p.articulo });
const corto = (s: string, n = 14) => s.split(/\s+/).slice(0, n).join(" ") + (s.split(/\s+/).length > n ? "…" : "");
const DATO = /\b(\d+ (?:días|meses|años|horas)|(?:un|dos|tres|cinco|diez|quince|treinta) (?:días|meses|años)|mayoría (?:absoluta|simple)|tres quintos|dos tercios)\b/i;

export function materialSimulado(formato: Formato, estilo: Estilo | null, o: OpcionesMaterial, temas: TemaTexto[]): Contenido {
  const todas = piezas(temas);
  const titulo = `${temas.map((t) => t.nombre).join(" y ")}`;
  if (todas.length < 4) {
    return { suficiente: false, motivo: "Este tema no tiene suficiente información para este formato.", titulo, bloques: [] } as Contenido;
  }
  switch (formato) {
    case "resumen": {
      const sel = repartir(todas, 10);
      if (estilo === "cornell") {
        return {
          suficiente: true,
          motivo: "",
          titulo: `Cornell · ${titulo}`,
          filas: sel.map((p) => ({ pregunta: `¿Qué dice el art. ${p.articulo}?`, notas: [corto(p.texto, 30)], cita: cita(p) })),
          resumen: sel.slice(0, 4).map((p) => corto(p.texto, 16)).join(" "),
        };
      }
      if (estilo === "ejecutivo") {
        return { suficiente: true, motivo: "", titulo: `Ejecutivo · ${titulo}`, apartados: sel.slice(0, 6).map((p) => ({ titulo: `Artículo ${p.articulo}`, texto: corto(p.texto, 40), cita: cita(p) })) };
      }
      return {
        suficiente: true,
        motivo: "",
        titulo: `Esquema · ${titulo}`,
        bloques: sel.map((p) => ({ titulo: `Artículo ${p.articulo}`, puntos: [{ texto: corto(p.texto, 24), subpuntos: [] }], cita: cita(p) })),
      };
    }
    case "esquema": {
      const sel = repartir(todas, 15);
      const ramas = [0, 5, 10].map((i) => ({
        texto: `Artículo ${sel[i]?.articulo ?? ""}`,
        cita: cita(sel[i] ?? sel[0]),
        hijos: sel.slice(i, i + 5).map((p) => ({ texto: corto(p.texto, 10), cita: cita(p), hijos: [{ texto: corto(p.texto, 6), cita: cita(p) }] })),
      }));
      return { suficiente: true, motivo: "", titulo: `Esquema de ${titulo}`, ramas };
    }
    case "presentacion": {
      const n = o.diapositivas ?? 10;
      const sel = repartir(todas, n);
      return {
        suficiente: true,
        motivo: "",
        titulo,
        diapositivas: sel.map((p) => ({ titulo: `Artículo ${p.articulo}`, ideas: p.texto.split(/[.;]\s/).slice(0, 4).map((x) => corto(x, 12)).filter(Boolean), cita: cita(p) })),
      };
    }
    case "tarjetas": {
      const n = o.numero ?? 20;
      const base = o.literal ? todas.filter((p) => DATO.test(p.texto)) : todas;
      const sel = repartir(base.length >= 4 ? base : todas, n);
      return {
        suficiente: true,
        motivo: "",
        titulo: `Tarjetas · ${titulo}`,
        tarjetas: sel.map((p) => {
          const dato = p.texto.match(DATO)?.[0] ?? `Art. ${p.articulo}`;
          return {
            pregunta: o.literal ? `Completa: ${p.texto.replace(DATO, "____").split(/\s+/).slice(0, 18).join(" ")}…` : `¿Qué establece el artículo ${p.articulo}?`,
            respuesta: corto(p.texto, 22),
            dato: o.literal ? dato : "",
            asunto: `el artículo ${p.articulo}`,
            cita: cita(p),
          };
        }),
      };
    }
    case "test":
    case "simulacro": {
      const n = o.numero ?? 10;
      const sel = repartir(todas, n);
      return {
        suficiente: true,
        motivo: "",
        titulo: `${formato === "simulacro" ? "Simulacro" : "Test"} · ${titulo}`,
        preguntas: sel.map((p, i) => {
          const correcta = i % 4;
          const buena = corto(p.texto, 12);
          const malas = todas.filter((x) => x !== p).slice(i, i + 3).map((x) => corto(x.texto, 12));
          const opciones = [...malas];
          opciones.splice(correcta, 0, buena);
          return {
            enunciado: `Según el artículo ${p.articulo}, ¿cuál de estas afirmaciones es correcta?`,
            opciones: opciones.slice(0, 4),
            correcta,
            justificacion: `El artículo ${p.articulo} dice: «${corto(p.texto, 20)}».`,
            asunto: `el artículo ${p.articulo}`,
            cita: cita(p),
          };
        }),
      };
    }
  }
}
