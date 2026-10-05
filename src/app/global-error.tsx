"use client";

// Si falla todo: «Estamos arreglando un problema, vuelve en unos minutos».
export default function ErrorGlobal() {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#08080A", color: "#E7E5E4", fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 34 }}>Estamos arreglando un problema</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#A8A29E" }}>Vuelve en unos minutos.</p>
          {/* Aquí la app entera ha fallado: se recarga la página completa a propósito. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ display: "inline-block", marginTop: 16, color: "#E7E5E4" }}>Volver a intentarlo</a>
        </main>
      </body>
    </html>
  );
}
