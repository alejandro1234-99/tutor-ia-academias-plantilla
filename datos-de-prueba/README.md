# Material de prueba

Esta carpeta guarda lo que las capas necesitan para probar la app: el temario
de la academia de ejemplo, un PDF que no se puede leer, alumnos inventados y
las dudas típicas con su respuesta.

- **Todo es público o inventado.** Los PDF son leyes del BOE, que se pueden
  copiar libremente. Los alumnos no existen, y sus correos acaban en
  `@example.com`, una dirección reservada para ejemplos: nunca llega a nadie.
- **No sale en la web publicada.** La web solo publica la página principal y
  la maqueta. Esta carpeta se queda fuera.
- Preparado el 24 de septiembre de 2026 (tarea P8 de PLAN.md).

---

## Qué hay y quién lo usa

| Archivo | Qué es | Capa que lo usa |
|---|---|---|
| `temario-temario-claro/tema-1-constitucion-espanola.pdf` | Tema 1: la Constitución Española. 39 páginas | 1.3, 1.4, 6.3 |
| `temario-temario-claro/tema-2-ley-39-2015-procedimiento-administrativo-comun.pdf` | Tema 2: la Ley 39/2015 del Procedimiento Administrativo Común. 73 páginas | 1.3, 1.4, 6.3 |
| `temario-temario-claro/tema-3-ley-40-2015-regimen-juridico-sector-publico.pdf` | Tema 3: la Ley 40/2015 de Régimen Jurídico del Sector Público. 123 páginas | 1.3, 1.4, 6.3 |
| `pdf-escaneado-de-prueba.pdf` | Las 5 primeras páginas del tema 1 convertidas en foto. No tiene ni una letra que se pueda seleccionar | 1.3 |
| `tema-2-ley-39-2015-procedimiento-administrativo-comun-version-2.pdf` | Una «versión 2» del tema 2, para sustituir la primera | 3.2 |
| `alumnos-de-prueba.xlsx` (y `.csv`) | 10 alumnos inventados, con nombre, correo y grupo. **Un correo está mal escrito a propósito** | 4.1 |
| `alumnos-de-prueba-corregida.xlsx` (y `.csv`) | La misma lista con el correo ya corregido | 4.1 |
| `50-dudas-temario-claro.xlsx` | Las 50 dudas típicas, con su respuesta, tema, artículo y página. En una segunda pestaña, 5 preguntas que no están en el temario | 1.4, 6.3 |
| `50-dudas-temario-claro.csv` y `5-preguntas-fuera-del-temario.csv` | Lo mismo que el Excel, en texto sencillo, para que lo pueda leer un programa | 1.4, 6.3 |

Para abrir las listas, usa siempre los archivos `.xlsx`, que se abren bien
en Excel o en Google Sheets. Los `.csv` son la misma información para
programas.

---

## Cada cosa, con detalle

### El temario de Temario Claro

Son los textos consolidados del BOE, es decir, la ley con todos sus cambios ya
metidos, descargados el 24 de septiembre de 2026:

- Tema 1: [BOE-A-1978-31229](https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229)
- Tema 2: [BOE-A-2015-10565](https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565)
- Tema 3: [BOE-A-2015-10566](https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566)

Tres cosas que conviene saber:

- **El número impreso abajo («Página 23») coincide siempre con el número de
  hoja del PDF.** Está comprobado en las 235 páginas. La duda 5 de SOLUCION.md
  no da problemas con estos PDF.
- **El artículo 113, el de la moción de censura, está en la página 23 del
  tema 1**, como dice el plan.
- **Los temas 2 y 3 empiezan con varias páginas de índice** que repiten los
  nombres de los artículos. Al buscar en el temario (capa 1.4), hay que evitar
  que el asistente cite el índice en lugar del artículo.

El BOE actualiza estos textos cuando cambia la ley. Si se vuelven a descargar,
las páginas pueden moverse. **Usa estos archivos**, que son con los que se
comprobaron las 50 dudas.

### El PDF escaneado

Es como si alguien hubiera pasado el tema 1 por un escáner: cada página es una
foto. Sirve para la prueba de la capa 1.3: al subirlo, la app tiene que avisar
de que no se puede leer.

**Compruébalo tú:** ábrelo e intenta seleccionar una frase con el ratón. No se
puede.

### La versión 2 del tema 2

Es el mismo PDF del tema 2 con dos cambios que se ven a simple vista:

- una **franja amarilla arriba de cada página**: «Versión 2 · actualizada el
  24/09/2026 · material de prueba de Academia Temario Claro»;
- una **hoja de cambios al final**, así que tiene 74 páginas en lugar de 73.

**El texto de la ley no cambia**, y las páginas 1 a 73 tienen la misma
numeración. Así, las citas siguen valiendo. Sirve para la prueba de la capa
3.2: el formador sustituye el tema 2 y el material hecho con la versión
anterior sale con la etiqueta «temario actualizado».

### Los 10 alumnos

Cinco del grupo «Mañanas» y cinco del grupo «Tardes». El correo mal escrito es
el de **Rubén Morales Sáez**: `ruben.morales.example.com`, **sin la @**. La
app tiene que marcar esa fila en rojo y no invitar a nadie hasta que se
corrija.

- **No están Lucía ni Pablo**, porque ya los crea la capa 1.2 y saldrían
  repetidos.
- **Los correos `@example.com` no llegan a ningún sitio.** Para ver llegar una
  invitación de verdad (paso 3 de la prueba de la capa 4.1), habrá que usar
  una dirección que sí exista.

### Las 50 dudas y las 5 de fuera

Son 17 dudas del tema 1, 17 del tema 2 y 16 del tema 3, escritas como las
haría un alumno. Incluyen las que usa el plan: la moción de censura (artículo
113, página 23), el silencio administrativo y la encomienda de gestión, que
solo sale en el tema 3.

**Cómo se comprobó cada una:** la columna «Frase exacta del PDF» copia las
palabras del BOE que demuestran la respuesta. Para cada duda se comprobó que:

1. esa frase está en la página que dice la hoja;
2. esa página cae dentro del artículo que dice la hoja;
3. la frase no aparece en ninguna otra página de los tres temas.

Las 50 pasaron las tres comprobaciones. En dos dudas, un texto parecido se
repite en otro sitio. Está avisado en la columna «Notas», para que no cuente
como fallo si el asistente cita el otro sitio.

Las últimas cuatro columnas («¿Responde bien?», «¿Cita el tema correcto?»,
«¿Cita la página correcta?» y «¿Se inventa algo?») están vacías. Las rellena
la capa 6.3 al hacer la prueba, igual que en el paso 5 de MONTAR-CLIENTE.md.

**Las 5 preguntas de fuera del temario** tratan de las pruebas físicas de
Policía Nacional, el Mundial de 2010, el IVA, los días de asuntos propios y la
nota de corte. Se buscaron sus palabras clave en los tres PDF y no aparecen
ninguna vez. La hoja dice qué palabras se buscaron.

---

## Pendiente

- **El temario de Academia Vanguardia** (duda 20 de SOLUCION.md), para la
  capa 6.4. La propuesta son dos leyes públicas del BOE que entran en la
  oposición de Policía Nacional: la **Ley Orgánica 2/1986, de Fuerzas y
  Cuerpos de Seguridad**
  ([BOE-A-1986-6859](https://www.boe.es/buscar/act.php?id=BOE-A-1986-6859)),
  y la **Ley Orgánica 9/2015, de Régimen de Personal de la Policía Nacional**
  ([BOE-A-2015-8468](https://www.boe.es/buscar/act.php?id=BOE-A-2015-8468)).
  Se descargan cuando el usuario dé el visto bueno.
