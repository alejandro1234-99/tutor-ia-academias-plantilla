// Los iconos del diseño (ronda 1), trazo de 1,6 px.

const TRAZOS = {
  preguntar: <path d="M4.5 5.5h15v10.5H10l-5.5 4z" />,
  crear: (
    <>
      <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
      <path d="M18.5 16v4M16.5 18h4" />
    </>
  ),
  biblioteca: <path d="M5 4.5h3.5v15H5zM10.5 4.5H14v15h-3.5zM16 5.6l3.2-.8 3 14.5-3.2.8" />,
  repasar: (
    <>
      <rect x="3.5" y="7" width="13" height="13" rx="2" />
      <path d="M8 3.5h10.5a2 2 0 0 1 2 2V16" />
    </>
  ),
  progreso: <path d="M5 19.5v-7M12 19.5V5M19 19.5v-10" />,
  historial: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 8.9" />
      <path d="M4.5 4.5v4.4h4.4M12 8v4.2l2.8 1.8" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  enviar: <path d="M12 19V5.5M6 11.5l6-6 6 6" />,
  flechaDerecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  izquierda: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  derecha: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  cerrar: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  bien: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  puntos: (
    <>
      <circle cx="5.5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18.5" cy="12" r="1.2" />
    </>
  ),
  lupa: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  carpeta: <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  recargar: <path d="M19.5 11.5a7.5 7.5 0 1 0-2.2 5.5M19.5 5v6.5H13" />,
  persona: (
    <>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5.5 19.5c1.2-3.2 3.7-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
  meGusta: <path d="M7.5 11v9h-3v-9zM7.5 11l3.8-6.8c1.6 0 2.6 1.1 2.3 2.7l-.6 3.6H18a2 2 0 0 1 2 2.3l-1.1 5.9A2.2 2.2 0 0 1 16.7 20H7.5" />,
  noMeGusta: <path d="M7.5 13V4h-3v9zM7.5 13l3.8 6.8c1.6 0 2.6-1.1 2.3-2.7l-.6-3.6H18a2 2 0 0 0 2-2.3l-1.1-5.9A2.2 2.2 0 0 0 16.7 4H7.5" />,
  bandera: <path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11" />,
  documento: (
    <>
      <path d="M6.5 3.5h8l4 4v13h-12z" />
      <path d="M9.5 11h6M9.5 14.5h6M9.5 18h3.5" />
    </>
  ),
  arbol: (
    <>
      <rect x="9" y="3.5" width="6" height="4" rx="1" />
      <rect x="3.5" y="16.5" width="6" height="4" rx="1" />
      <rect x="14.5" y="16.5" width="6" height="4" rx="1" />
      <path d="M12 7.5v4.5M6.5 16.5V12h11v4.5" />
    </>
  ),
  presentacion: (
    <>
      <rect x="3.5" y="4.5" width="17" height="11.5" rx="1.5" />
      <path d="M12 16v4M8.5 20h7" />
    </>
  ),
  test: <path d="M10 6.5h10M10 12h10M10 17.5h10M3.8 6.3l1.2 1.2 2.2-2.4M3.8 11.8l1.2 1.2 2.2-2.4M4 17.5h3" />,
  simulacro: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 10v3.5l2 1.5M9.5 3.5h5" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  candado: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  luna: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  atencion: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4.5M12 17.2v.2" />
    </>
  ),
  sinConexion: (
    <path d="M3.5 3.5l17 17M8.8 16.2a4.6 4.6 0 0 1 6.4 0M5.2 12.6a9.6 9.6 0 0 1 4.3-2.4M18.8 12.6a9.7 9.7 0 0 0-2.3-1.6M2 9a14 14 0 0 1 4.2-2.6M22 9a14.3 14.3 0 0 0-8.5-3.4M12 19.8v.2" />
  ),
  ojo: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  girar: <path d="M7 7.5h12M15.5 4l3.5 3.5-3.5 3.5M17 16.5H5M8.5 13L5 16.5 8.5 20" />,
  descargar: <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />,
  subir: <path d="M12 16V5M7 9.5l5-5 5 5M5 19.5h14" />,
  lapiz: <path d="M4.5 19.5l1-4L15.8 5.2a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.5 18.5z" />,
  papelera: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7" />,
  correo: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  grafica: <path d="M4 19.5h16M6.5 16l4-5 3.5 3 5-7" />,
  grupo: (
    <>
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="10" r="2.5" />
      <path d="M3.5 19c.9-2.8 3-4.3 5.5-4.3s4.6 1.5 5.5 4.3M15 14.8c2.3 0 4.2 1.4 5 4" />
    </>
  ),
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  salir: <path d="M14 5.5h4.5v13H14M10.5 8L6.5 12l4 4M6.5 12h9" />,
  ayuda: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.7M12 16.8v.2" />
    </>
  ),
  bandeja: (
    <>
      <path d="M4 13.5l2-8h12l2 8v5H4z" />
      <path d="M4 13.5h4.5l1 2h5l1-2H20" />
    </>
  ),
  llama: <path d="M12 21c-3.6 0-6-2.4-6-5.7 0-2.9 2-4.6 3.3-6.5.8 1.3 1.4 2 2.3 2.5.2-2.6 1.4-5 3.4-6.8.2 2.6 3 4.8 3 9.3 0 4.1-2.5 7.2-6 7.2z" />,
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({
  nombre,
  tam = 20,
  grosor = 1.6,
  className,
  titulo,
}: {
  nombre: NombreIcono;
  tam?: number;
  grosor?: number;
  className?: string;
  titulo?: string;
}) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true}
      role={titulo ? "img" : undefined}
      className={className}
      style={{ flexShrink: 0 }}
    >
      {titulo ? <title>{titulo}</title> : null}
      {TRAZOS[nombre]}
    </svg>
  );
}
