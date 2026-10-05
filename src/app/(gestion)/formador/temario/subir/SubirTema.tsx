"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icono } from "@/componentes/Icono";
import { T, t } from "@/textos";
import { analizarPaginas, leerPaginasCrudas, pareceEscaneado, type PaginaCruda } from "@/temario/procesar";
import { empezarSubida } from "../acciones";

type Tema = { id: string; oposicionId: string; numero: number; nombre: string };
type Fase = "eligiendo" | "leyendo" | "subiendo" | "paginas" | "terminando";

const MB = 50;
const PARTE = 3 * 1024 * 1024;

// F2 · Subir o sustituir tema. El PDF se lee aquí, en el navegador; al
// servidor se mandan el PDF (para el historial) y el texto de cada página.
export function SubirTema({
  oposiciones,
  temas,
  temaInicial,
  asistente,
}: {
  oposiciones: { id: string; nombre: string }[];
  temas: Tema[];
  temaInicial: string | null;
  asistente: string;
}) {
  const router = useRouter();
  const inicial = temas.find((x) => x.id === temaInicial) ?? null;
  const [oposicionId, setOposicionId] = useState(inicial?.oposicionId ?? oposiciones[0]?.id ?? "");
  const [temaId, setTemaId] = useState<string>(inicial?.id ?? "nuevo");
  const deOposicion = temas.filter((x) => x.oposicionId === oposicionId);
  const siguiente = Math.max(0, ...deOposicion.map((x) => x.numero)) + 1;
  const [numero, setNumero] = useState(siguiente);
  const [nombre, setNombre] = useState("");
  const [nombreCorto, setNombreCorto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fase, setFase] = useState<Fase>("eligiendo");
  const [paso, setPaso] = useState("");
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const S = T.temario;

  const elegir = (f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setError(S.noPdf);
    if (f.size > MB * 1024 * 1024) return setError(t(S.grande, { mb: MB }));
    setArchivo(f);
  };

  const subir = async () => {
    if (!archivo) return;
    if (temaId === "nuevo" && (!numero || !nombre.trim())) return setError(S.faltanDatos);
    setError(null);
    try {
      setFase("leyendo");
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const bytes = new Uint8Array(await archivo.arrayBuffer());
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      const crudas: PaginaCruda[] = [];
      for (let n = 1; n <= doc.numPages; n += 10) {
        setPaso(t(S.leyendo, { n: Math.min(n + 9, doc.numPages), total: doc.numPages }));
        setPct(Math.round((n / doc.numPages) * 30));
        crudas.push(...(await leerPaginasCrudas(doc as never, n, n + 9)));
      }
      const paginas = analizarPaginas(crudas);
      if (pareceEscaneado(paginas)) {
        setFase("eligiendo");
        setError(S.escaneado);
        return;
      }

      setFase("subiendo");
      setPaso(S.subiendoArchivo);
      const r = await empezarSubida({
        oposicionId,
        temaId: temaId === "nuevo" ? null : temaId,
        numero: temaId === "nuevo" ? numero : null,
        nombre: temaId === "nuevo" ? nombre : null,
        nombreCorto: temaId === "nuevo" ? nombreCorto || null : null,
        archivoNombre: archivo.name,
        archivoBytes: archivo.size,
        paginas: doc.numPages,
      });
      if (r.error || !r.versionId) {
        setFase("eligiendo");
        setError(r.error ?? T.comun.errorGenerico);
        return;
      }
      const v = r.versionId;
      for (let i = 0, n = 0; i < bytes.length; i += PARTE, n++) {
        const res = await fetch(`/api/temario/${v}/archivo?parte=${n}`, { method: "POST", body: bytes.slice(i, i + PARTE) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || T.comun.errorGenerico);
        setPct(30 + Math.round(((i + PARTE) / bytes.length) * 20));
      }

      setFase("paginas");
      for (let i = 0; i < paginas.length; i += 25) {
        setPaso(t(S.guardandoPaginas, { n: Math.min(i + 25, paginas.length), total: paginas.length }));
        const res = await fetch(`/api/temario/${v}/paginas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paginas: paginas.slice(i, i + 25) }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || T.comun.errorGenerico);
        setPct(50 + Math.round(((i + 25) / paginas.length) * 40));
      }

      setFase("terminando");
      setPaso(S.procesando);
      const fin = await fetch(`/api/temario/${v}/terminar`, { method: "POST" });
      if (!fin.ok) throw new Error((await fin.json().catch(() => ({}))).error || T.comun.errorGenerico);
      setPct(100);
      router.push("/formador/temario");
      router.refresh();
    } catch (e) {
      setFase("eligiendo");
      setError((e as Error).message || T.comun.errorGenerico);
    }
  };

  const ocupado = fase !== "eligiendo";
  return (
    <div className="pila hueco-24" style={{ maxWidth: 640 }}>
      {oposiciones.length > 1 ? (
        <div className="campo">
          <label htmlFor="oposicion">{S.oposicion}</label>
          <select id="oposicion" value={oposicionId} disabled={ocupado} onChange={(e) => setOposicionId(e.target.value)}>
            {oposiciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="campo">
        <label htmlFor="tema">{S.queTema}</label>
        <select id="tema" value={temaId} disabled={ocupado} onChange={(e) => setTemaId(e.target.value)}>
          <option value="nuevo">{S.temaNuevo}</option>
          {deOposicion.map((x) => (
            <option key={x.id} value={x.id}>
              {t(S.temaExistente, { n: x.numero, nombre: x.nombre })}
            </option>
          ))}
        </select>
        {temaId !== "nuevo" ? <span className="ayuda-campo">{S.mientras}</span> : null}
      </div>

      {temaId === "nuevo" ? (
        <div className="pila hueco-16">
          <div className="campo" style={{ maxWidth: 200 }}>
            <label htmlFor="numero">{S.numero}</label>
            <input id="numero" type="number" min={1} max={999} value={numero} disabled={ocupado} onChange={(e) => setNumero(Number(e.target.value))} />
          </div>
          <div className="campo">
            <label htmlFor="nombre">{S.nombre}</label>
            <input id="nombre" type="text" maxLength={200} placeholder={S.nombreEjemplo} value={nombre} disabled={ocupado} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="corto">{S.nombreCorto}</label>
            <input id="corto" type="text" maxLength={60} placeholder={S.nombreCortoEjemplo} value={nombreCorto} disabled={ocupado} onChange={(e) => setNombreCorto(e.target.value)} />
          </div>
        </div>
      ) : null}

      <div className="campo">
        <span className="etiqueta">{S.archivo}</span>
        <label
          className="tarjeta pila hueco-8"
          style={{
            alignItems: "center",
            textAlign: "center",
            padding: 32,
            borderStyle: "dashed",
            borderColor: arrastrando ? "var(--brand)" : "var(--line-strong)",
            cursor: ocupado ? "default" : "pointer",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            if (!ocupado) elegir(e.dataTransfer.files?.[0]);
          }}
        >
          <Icono nombre="subir" tam={28} />
          <strong>{archivo ? archivo.name : S.arrastra}</strong>
          <span className="texto-3" style={{ fontSize: 13 }}>
            {archivo ? `${(archivo.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : t(S.soloPdf, { mb: MB })}
          </span>
          <input type="file" accept="application/pdf,.pdf" className="solo-lector" disabled={ocupado} onChange={(e) => elegir(e.target.files?.[0])} aria-label={S.archivo} />
        </label>
      </div>

      {error ? (
        <div className="aviso error" role="alert">
          <span className="icono-aviso">
            <Icono nombre="atencion" />
          </span>
          <span className="texto-aviso">{error}</span>
        </div>
      ) : null}

      {ocupado ? (
        <div className="creando" role="status" aria-live="polite">
          <div className="fila separar">
            <strong>{paso}</strong>
            <span className="texto-3 cifras" style={{ fontSize: 13 }}>
              {pct} %
            </span>
          </div>
          <div className="barra-progreso">
            <span style={{ width: `${Math.max(3, pct)}%` }} />
          </div>
          {fase === "terminando" ? <span className="texto-3" style={{ fontSize: 13 }}>{t(S.listo, { asistente })}</span> : null}
        </div>
      ) : (
        <button type="button" className="boton boton-principal boton-grande" style={{ alignSelf: "flex-start" }} disabled={!archivo} onClick={subir}>
          <Icono nombre="subir" tam={18} />
          {S.empezar}
        </button>
      )}
    </div>
  );
}
