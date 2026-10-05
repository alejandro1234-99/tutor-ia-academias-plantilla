import generada from "@/configuracion/generada.json";

// El logotipo, para pantallas del navegador (sin cargar la comprobación de
// la configuración). El SVG viene de nuestra configuración, comprobado al publicar.
export function Marca({ grande = false }: { grande?: boolean }) {
  return <span className={grande ? "marca grande" : "marca"} role="img" aria-label={generada.nombre} dangerouslySetInnerHTML={{ __html: generada.logoSvg }} />;
}
