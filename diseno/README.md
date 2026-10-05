# Diseño

El diseño oficial de la app, hecho en Claude Design. **Se construye
literalmente así:** mismos colores, letras, tamaños, espacios y textos.

| Ronda | Qué tiene | Original en Claude Design |
|---|---|---|
| `ronda-1/` | Sistema visual, prueba de marca blanca y las pantallas clave del alumno (A3, A4, A6, A9, A10, A11), en móvil y ordenador, oscuro y claro | El proyecto de Claude Design de quien lo diseñó (privado). Si rediseñas, crea el tuyo con [PROMPT-CLAUDE-DESIGN.md](../PROMPT-CLAUDE-DESIGN.md) |

## Qué hay en cada ronda

| Carpeta | Para qué |
|---|---|
| `originales/` | Los archivos tal cual salieron de Claude Design. **No se tocan.** Solo se abren dentro de Claude Design. |
| `pantallas/` | Las mismas pantallas convertidas en páginas normales, para verlas en cualquier navegador. |
| `index.html` | La lista de todas las pantallas, con enlace a cada una. |

## Si el diseño cambia en Claude Design

Se vuelven a descargar los archivos a `originales/` y se regeneran las páginas:

```
node diseno/convertir.mjs diseno/ronda-1
```
