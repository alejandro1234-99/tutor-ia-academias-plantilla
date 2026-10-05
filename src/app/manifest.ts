import type { MetadataRoute } from "next";
import { config } from "@/configuracion";

// La ficha para instalar la web en la pantalla de inicio del móvil, con el
// nombre y el icono de la academia.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.nombre,
    short_name: config.nombreCorto,
    description: config.nombre,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080A",
    theme_color: config.colorPrincipal,
    lang: config.idioma,
    icons: [
      { src: "/academia/icono.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/academia/icono.png", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };
}
