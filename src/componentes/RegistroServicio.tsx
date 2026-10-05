"use client";

import { useEffect } from "react";

// Registra el pequeño programa del navegador que permite instalar la web en
// la pantalla de inicio del móvil y enseñar un aviso claro sin conexión.
export function RegistroServicio() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
