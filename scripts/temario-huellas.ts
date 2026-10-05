// PREPARAR LA BÚSQUEDA POR SIGNIFICADO DEL TEMARIO YA SUBIDO
//
//   npm run temario:huellas
//
// Pone la huella de Voyage a los trozos del temario vigente que no la
// tienen (temas subidos antes de tener la clave) y a las notas del
// formador. Se puede lanzar las veces que se quiera. Necesita VOYAGE_API_KEY.

import { completarHuellas, indexarNotas } from "@/servidor/temario";
import { hayHuellas } from "@/servidor/ia/huellas";

if (!hayHuellas()) {
  console.error("Falta VOYAGE_API_KEY en .env.local: sin ella el buscador solo busca por palabras.");
  process.exit(1);
}
const inicio = Date.now();
// Lotes pequeños y paciencia: funciona también con los límites de una cuenta
// de Voyage sin método de pago (entonces tarda unos 30 minutos por academia).
const n = await completarHuellas(100_000, { lote: 12, esperarLimite: true });
await indexarNotas();
console.log(`✓ ${n} trozos del temario con huella de significado (${((Date.now() - inicio) / 1000).toFixed(0)} s).`);
process.exit(0);
