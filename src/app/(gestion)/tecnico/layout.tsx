import { ArmazonGestion } from "@/componentes/gestion/ArmazonGestion";
import { exigirTecnico } from "@/servidor/tecnico";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await exigirTecnico();
  return (
    <ArmazonGestion s={s} papel="tecnico">
      {children}
    </ArmazonGestion>
  );
}
