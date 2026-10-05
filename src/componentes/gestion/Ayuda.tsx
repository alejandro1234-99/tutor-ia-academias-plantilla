import { T } from "@/textos";
import { FormularioAyuda } from "./FormularioAyuda";

// F8 y D4 · Ayuda: preguntas frecuentes y un formulario que nos llega a nosotros.
export function Ayuda({ soloLectura }: { soloLectura: boolean }) {
  const A = T.ayuda;
  return (
    <main className="pagina estrecha">
      <h1 className="titulo-pagina" style={{ marginBottom: 32 }}>
        {A.titulo}
      </h1>
      <section className="pila hueco-8" style={{ marginBottom: 40 }}>
        <h2 className="antetitulo">{A.faq}</h2>
        {A.preguntas.map(([p, r]) => (
          <details key={p} className="tarjeta plana" style={{ padding: "14px 18px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 500 }}>{p}</summary>
            <p className="texto-2" style={{ marginTop: 10, lineHeight: 1.6 }}>
              {r}
            </p>
          </details>
        ))}
      </section>
      <section className="pila hueco-12">
        <h2 className="antetitulo">{A.escribenos}</h2>
        <p className="texto-2">{A.escribenosTexto}</p>
        {soloLectura ? null : <FormularioAyuda />}
      </section>
    </main>
  );
}
