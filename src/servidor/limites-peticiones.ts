import "server-only";
import { comoSistema } from "./bd";

// Freno de peticiones, para que nadie pueda saturar el sistema
// (SOLUCION.md, sección 19.8): por ejemplo, 10 peticiones por minuto por
// persona o 5 enlaces de entrada por hora por correo.

/** Suma una petición y dice si está dentro del límite. */
export async function permitir(clave: string, maximo: number, ventanaSegundos: number): Promise<boolean> {
  const filas = await comoSistema(
    (tx) => tx`
      insert into limites_peticiones (clave, ventana, cuenta)
      values (${clave}, to_timestamp(floor(extract(epoch from now()) / ${ventanaSegundos}) * ${ventanaSegundos}), 1)
      on conflict (clave, ventana) do update set cuenta = limites_peticiones.cuenta + 1
      returning cuenta`,
  );
  return Number(filas[0].cuenta) <= maximo;
}

export const LIMITES = {
  peticionesPorMinuto: 10,
  enlacesPorHora: 5,
  enlacesPorHoraIp: 30,
};
