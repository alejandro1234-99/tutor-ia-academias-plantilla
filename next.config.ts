import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las páginas.
const cabeceras = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
};

export default nextConfig;
