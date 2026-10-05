// Programa mínimo del navegador: permite instalar la web como una app y,
// si no hay conexión al abrir una página, enseña un aviso claro en vez de
// una pantalla en blanco. No guarda datos de nadie.
const PAGINA_SIN_CONEXION = "/sin-conexion.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("base-v1").then((c) => c.addAll([PAGINA_SIN_CONEXION, "/academia/icono.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(PAGINA_SIN_CONEXION)));
});
