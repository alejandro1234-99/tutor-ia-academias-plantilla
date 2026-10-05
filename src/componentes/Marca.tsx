import { config } from "@/configuracion";

// El logotipo de la academia (de la configuración), en línea para que tome
// los colores del modo claro u oscuro.
export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span
      className={grande ? "marca grande" : "marca"}
      aria-label={config.nombre}
      role="img"
      dangerouslySetInnerHTML={{ __html: config.logoSvg }}
    />
  );
}

export function PieFuncionaCon() {
  return <div className="pie-marca">{config.pie.funcionaCon}</div>;
}
