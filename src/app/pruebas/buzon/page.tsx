import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { comoSistema } from "@/servidor/bd";
import { entornoPruebas } from "@/servidor/pruebas";

export const metadata: Metadata = { title: "Buzón de pruebas" };
export const dynamic = "force-dynamic";

// Buzón de pruebas: los correos que ha «enviado» la app en la dirección de
// pruebas. En la web publicada esta página no existe.
export default async function BuzonPruebas({ searchParams }: { searchParams: Promise<{ para?: string }> }) {
  if (!entornoPruebas()) notFound();
  const { para = "" } = await searchParams;
  const correos = await comoSistema(
    (tx) => tx`
      select id, para, de, asunto, html, creado_at from buzon_pruebas
      where ${para} = '' or para ilike ${"%" + para + "%"}
      order by id desc limit 30`,
  );
  return (
    <main className="pagina media">
      <h1 className="titulo-pagina">Buzón de pruebas</h1>
      <p className="subtitulo" style={{ margin: "12px 0 24px" }}>
        Solo existe en la dirección de pruebas. Aquí se ven los correos que la app habría enviado.
      </p>
      <form className="fila hueco-10" style={{ marginBottom: 24 }}>
        <input className="entrada" name="para" defaultValue={para} placeholder="Filtrar por destinatario" style={{ maxWidth: 360 }} />
        <button className="boton">Filtrar</button>
      </form>
      <div className="pila hueco-16">
        {correos.map((c) => (
          <details key={c.id as number} className="tarjeta" data-para={c.para as string}>
            <summary style={{ cursor: "pointer" }}>
              <strong>{c.asunto as string}</strong>
              <span className="texto-3" style={{ display: "block", fontSize: 13 }}>
                Para {c.para as string} · De {c.de as string} · {new Date(c.creadoAt as string).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
              </span>
            </summary>
            <iframe title={c.asunto as string} srcDoc={c.html as string} sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" style={{ width: "100%", height: 560, border: 0, marginTop: 12, borderRadius: 12, background: "#fff" }} />
          </details>
        ))}
        {correos.length === 0 ? <p className="texto-2">No hay correos.</p> : null}
      </div>
    </main>
  );
}
