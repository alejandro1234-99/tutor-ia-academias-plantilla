import { ArmazonGestion } from "@/componentes/gestion/ArmazonGestion";
import { exigirGestion } from "@/servidor/gestion";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { s, papel } = await exigirGestion("dueno");
  return (
    <ArmazonGestion s={s} papel={papel}>
      {children}
    </ArmazonGestion>
  );
}
