import { headers } from "next/headers";
import { comoSistema } from "@/servidor/bd";
import { obtenerSesion } from "@/servidor/sesion";
import { Icono } from "@/componentes/Icono";
import { T } from "@/textos";

// Banda roja fija arriba en modo soporte. No se puede cerrar.
export async function BandaSoporte() {
  const s = await obtenerSesion();
  if (!s?.soporte) return null;
  // Queda apuntada cada pantalla que miramos en modo soporte.
  const ruta = (await headers()).get("x-ruta")?.slice(0, 200) ?? "?";
  await comoSistema((tx) => tx`update soporte_entradas set pantallas = array_append(pantallas, ${ruta}) where id = ${s.soporte!.entradaId}`);
  return (
    <div className="banda-soporte" role="status">
      <Icono nombre="ojo" tam={18} />
      <span>{T.soporte.banda}</span>
      <form action="/tecnico/soporte/salir" method="post">
        <button type="submit">{T.soporte.salir}</button>
      </form>
    </div>
  );
}
