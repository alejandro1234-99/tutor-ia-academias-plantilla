import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { cookies } from "next/headers";
import { config, cssDeMarca } from "@/configuracion";
import { GALLETA_TEMA } from "@/servidor/sesion";
import { RegistroServicio } from "@/componentes/RegistroServicio";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fuente-inter", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--fuente-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: config.nombreCorto, template: `%s · ${config.nombreCorto}` },
  description: config.nombre,
  applicationName: config.nombreCorto,
  appleWebApp: { capable: true, title: config.nombreCorto, statusBarStyle: "black-translucent" },
  icons: { icon: "/academia/icono.png", apple: "/academia/icono.png" },
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080A" },
    { media: "(prefers-color-scheme: light)", color: "#FBFAF8" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = (await cookies()).get(GALLETA_TEMA)?.value;
  const dataTema = tema === "oscuro" || tema === "claro" ? tema : "auto";
  return (
    <html lang={config.idioma} data-tema={dataTema} className={`${inter.variable} ${serif.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssDeMarca() }} />
      </head>
      <body>
        {children}
        <RegistroServicio />
      </body>
    </html>
  );
}
