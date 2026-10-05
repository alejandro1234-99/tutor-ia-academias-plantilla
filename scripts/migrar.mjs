// Aplica a la base de datos los cambios de estructura de db/migraciones,
// en orden y una sola vez cada uno. Se puede lanzar cuantas veces se
// quiera: lo ya aplicado no se repite.
//
// Necesita DATABASE_URL (en .env.local o en las variables de Vercel).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!url) {
  console.error("Falta DATABASE_URL: la dirección de la base de datos (en .env.local).");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
const carpeta = path.join(raiz, "db", "migraciones");
const archivos = fs.readdirSync(carpeta).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

try {
  await sql`create schema if not exists academia`;
  await sql`create table if not exists academia.migraciones (nombre text primary key, aplicada_at timestamptz not null default now())`;
  const hechas = new Set((await sql`select nombre from academia.migraciones`).map((r) => r.nombre));
  let aplicadas = 0;
  for (const archivo of archivos) {
    if (hechas.has(archivo)) continue;
    const texto = fs.readFileSync(path.join(carpeta, archivo), "utf8");
    process.stdout.write(`→ ${archivo} ... `);
    await sql.begin(async (tx) => {
      await tx.unsafe(texto);
      await tx`insert into academia.migraciones (nombre) values (${archivo})`;
    });
    console.log("hecho");
    aplicadas++;
  }
  console.log(aplicadas ? `✓ ${aplicadas} cambio(s) aplicados.` : "✓ La base de datos ya estaba al día.");
} catch (e) {
  console.error("\n✗ No se ha podido aplicar:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
