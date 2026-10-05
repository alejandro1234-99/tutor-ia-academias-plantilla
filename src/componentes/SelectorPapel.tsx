import { T } from "@/textos";
import type { Papel } from "@/servidor/sesion";

// Para quien tiene varios papeles (por ejemplo, dueña y formadora a la vez).
// Va arriba del menú lateral.
export function SelectorPapel({ papeles, actual }: { papeles: Papel[]; actual: Papel }) {
  if (papeles.length < 2) return null;
  return (
    <div className="selector" role="group" aria-label={T.papeles.selector} style={{ marginBottom: 20 }}>
      {papeles.map((p) => (
        <a key={p} href={`/papel/${p}`} aria-current={p === actual ? "page" : undefined} style={{ padding: "0 10px" }}>
          {T.papeles[p]}
        </a>
      ))}
    </div>
  );
}
