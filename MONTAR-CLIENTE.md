# MONTAR-CLIENTE · Cómo montar una academia nueva en un día

Guía paso a paso para dejar funcionando el asistente de una academia nueva. El
qué y el porqué están en [SOLUCION.md](SOLUCION.md). Aquí va solo el cómo.

Cada paso lleva el botón, la orden o el archivo exactos, y los tiempos que se
midieron en el ensayo con Vanguardia, la segunda academia de ejemplo.

**No hace falta saber programar para seguirla.** Abre el proyecto en VS Code y
dile a Claude: «Vamos a montar la academia <nombre> siguiendo MONTAR-CLIENTE.md.
Ve paso a paso y espera a que te diga "sigue"». Las órdenes (las líneas en
`gris`) las lanza Claude en la terminal de VS Code; tú solo das los datos y
pulsas los botones de las webs que te diga.

**Antes de tu primera academia, instala la plantilla** con
[INSTALAR.md](INSTALAR.md) y pruébala en tu ordenador. Esa instalación es tu
**proyecto base**: de él sale una copia para cada academia.

**Se ensaya primero con Academia Vanguardia** (Policía Nacional, asistente
«Vega», azul marino `#1B2A4A` y rojo `#C8102E`). Si con Vanguardia sale en un
día, sale con cualquiera.

---

## Antes del día: lo que hay que tener en la mano

Sin esto no se empieza. Se pide a la academia con una semana de antelación.

| # | Qué | Quién lo da | Hecho |
|---|---|---|---|
| 1 | **Contrato firmado**, con el contrato de encargo de tratamiento de datos y la garantía de que tiene derecho a usar su temario | La academia | ☐ |
| 2 | **Factura de implantación** emitida (lo que hayas pactado; orientativo, 750 € sin IVA) | Nosotros | ☐ |
| 3 | **Datos legales:** razón social, CIF, dirección y correo para temas de privacidad | La academia | ☐ |
| 4 | **Marca:** logotipo (mejor en SVG o PNG grande con fondo transparente), los dos colores y el nombre que quiere para el asistente | La academia | ☐ |
| 5 | **Dirección web:** el subdominio que quiere (por ejemplo, `estudio.suacademia.com`) y acceso a quien gestiona su dominio | La academia | ☐ |
| 6 | **Correo de avisos:** la dirección desde la que saldrán (por ejemplo, `avisos@suacademia.com`) | La academia | ☐ |
| 7 | **Oposiciones** que prepara y, para cada una, cuánto resta un fallo en el examen real y cuánto tiempo hay | La academia | ☐ |
| 8 | **Temario en PDF con texto**, un PDF por tema, con el nombre del tema | La academia | ☐ |
| 9 | **Las 50 dudas más típicas** de sus alumnos, con la respuesta correcta y dónde está en el temario | El formador | ☐ |
| 10 | **Equipo:** nombre y correo del dueño y de cada formador, y qué grupos lleva cada uno | La academia | ☐ |
| 11 | **Alumnos:** una hoja de cálculo con nombre, correo y grupo | La academia | ☐ |
| 12 | **Una hora con el formador** reservada para el final del día | La academia | ☐ |

**Comprobación rápida del temario antes del día:** abrir cada PDF y probar a
seleccionar una frase con el ratón. Si no se puede, es un PDF escaneado y no
sirve. Hay que pedir la versión con texto.

---

## El día: seis pasos

Tiempos orientativos para una academia con una oposición y unas 1.000 páginas.

### Paso 1 · Clonar el proyecto (30 minutos)

**Qué se hace:** una copia nueva del proyecto base, solo para esta academia.

1. Copiar tu proyecto base en una carpeta nueva con el nombre de la academia,
   dejándolo enlazado a la base para que los arreglos futuros le lleguen con un
   solo paso, y crear su repositorio privado en GitHub:

   ```
   git clone https://github.com/<tu-usuario>/<tu-proyecto-base>.git tutor-ia-<academia>
   cd tutor-ia-<academia>
   git remote rename origin base
   gh repo create <tu-usuario>/tutor-ia-<academia> --private --source=. --push
   npm ci
   ```

   Más adelante, para traer los arreglos de la base: `git pull base main`.
2. Un repositorio por academia, siempre **privado**: lleva su configuración y,
   con el tiempo, sus ajustes a medida.
3. Comprobar que la copia no trae ningún dato de otra academia: ni
   configuración, ni secretos, ni temario. En `academias/` solo se deja la
   carpeta de ejemplo que se vaya a copiar en el paso 3; las demás se borran
   (`git rm -r academias/<otra>`). El archivo `.env.local` no viene en la
   copia: se crea a partir de `.env.example`.

**Tiempo medido en el ensayo:** 26 segundos (copiar e instalar).

**Cómo sé que está bien:** en GitHub aparece el repositorio nuevo, privado, y
el archivo de configuración tiene todavía los valores de ejemplo.

**Qué puede salir mal:** que se copie por error el archivo de secretos de otra
academia. Ese archivo nunca se sube a GitHub, así que no debería pasar, pero se
comprueba igual.

### Paso 2 · Crear su base de datos y su web (45 minutos)

**Qué se hace:** un almacén de datos y una dirección web solo para esta academia.

**El detalle, pantalla a pantalla, está en [PUBLICAR.md](PUBLICAR.md)** (pasos
B2 a B8): las cuentas que hacen falta y a nombre de quién, lo que cuestan, qué
se pulsa en cada web y el mensaje para quien lleva el dominio de la academia.
Aquí queda el resumen.

1. **Supabase:** crear un proyecto nuevo **en la región de París (Unión
   Europea)**, «West EU (Paris)». Nunca en otra región. Apuntar la contraseña
   de la base de datos en el gestor de contraseñas.
2. Preparar su base de datos con la estructura del producto (tablas, permisos
   y buscador), que viene lista en el proyecto base:
   - En Supabase, botón **«Connect»** → **«Transaction pooler»**: copiar la
     dirección, cambiar `[YOUR-PASSWORD]` por la contraseña y pegarla en
     `.env.local` como `DATABASE_URL=`.
   - Lanzar `npm run db:migrar`. Se puede repetir sin miedo: lo ya hecho no se
     repite. **Tiempo medido:** 2 segundos.
3. Comprobar que las **copias de seguridad diarias** están activadas.
4. **Vercel:** crear un proyecto nuevo conectado al repositorio del paso 1.
5. Poner los **secretos** de esta academia en Vercel, en Settings → Environment
   Variables. La lista completa, con qué es cada uno, está en `.env.example`:
   `ACADEMIA`, `URL_WEB`, `DATABASE_URL`, `ANTHROPIC_API_KEY`,
   `VOYAGE_API_KEY`, `RESEND_API_KEY`, `CORREO_REMITENTE`, `CORREOS_TECNICOS` y
   `CRON_SECRET`. **Nunca** en el código ni en GitHub. `MODO_PRUEBAS` e
   `IA_SIMULADA` **no** se ponen en la web de verdad.
6. **Dirección web:** añadir en Vercel el subdominio de la academia y pedirle
   a quien gestiona su dominio que añada el registro que Vercel indique.
7. **Correo:** dar de alta el dominio de la academia en el servicio de correo y
   pedir que añadan los registros que indique. Sin esto, los correos acaban en
   la carpeta de correo basura.

**Cómo sé que está bien:** en Supabase el proyecto pone «París». Al abrir la
dirección web sale la pantalla de entrada (todavía con la marca de ejemplo). El
servicio de correo marca el dominio como verificado.

**Qué puede salir mal:** los cambios en el dominio pueden tardar desde minutos
hasta unas horas en funcionar. Por eso se piden a primera hora. Mientras tanto,
se sigue con la dirección provisional que da Vercel.

### Paso 3 · Rellenar la configuración (30 minutos)

**Qué se hace:** escribir en el archivo de configuración todo lo propio de la
academia. Cada línea tiene al lado su explicación. La lista completa está en la
sección 6 de [SOLUCION.md](SOLUCION.md).

0. Copiar la carpeta de ejemplo con el nombre de la academia
   (`cp -r academias/temario-claro academias/<academia>`) y poner
   `ACADEMIA=<academia>` en `.env.local` y en Vercel. Dentro de la carpeta
   están `configuracion.jsonc`, `logo.svg` e `icono.png` (cuadrado, 512 × 512).
1. Nombre, nombre corto, logo, icono, los dos colores y el nombre del asistente.
2. Las oposiciones, con su regla de simulacro (cuánto resta un fallo y el
   tiempo por pregunta).
3. La dirección web y el correo de avisos, con el nombre que verá el alumno.
4. Los límites: 25 preguntas al día y 20 materiales al mes por alumno, tope de
   la academia y 50 alumnos incluidos (o lo pactado en el contrato).
5. Los datos legales.
6. Los interruptores de funciones a medida, si los hay.
7. Comprobar con `npm run comprobar:configuracion` (dice qué línea falla, si
   falla alguna) y con `npm run comprobar:marca` (que no quede el nombre ni los
   colores de otra academia escritos en el código).
8. Guardar, hacer la foto en Git con el mensaje «Configuración de <academia>» y
   publicar.

**Tiempo medido en el ensayo:** al momento. Lo que lleva tiempo es elegir los
colores y preparar el logo.

**Cómo sé que está bien:**

- La web muestra **el logo, los colores y el nombre del asistente de la
  academia** en la pantalla de entrada.
- Los textos legales llevan la razón social y el CIF de la academia.
- Buscar el nombre de la academia de ejemplo: no debe aparecer en ningún sitio.

**Qué puede salir mal:** si falta una línea obligatoria o un color está mal
escrito, la app no arranca y dice qué línea falla. Se corrige y se vuelve a
publicar.

### Paso 4 · Crear la cuenta del dueño y de los formadores (15 minutos)

1. Dar de alta al dueño. La misma orden crea las oposiciones de la
   configuración y le manda el correo para entrar:

   ```
   npm run alta:academia -- --nombre "Nombre Apellido" --correo dueno@suacademia.com
   ```

   Si también da clase, se añade `--tambien-formadora` al final.
2. Entrar en modo soporte (panel técnico → Modo soporte) y comprobar que el
   dueño ve la parte de ajustes.
3. El dueño, con nosotros al teléfono, crea los grupos de cada oposición en
   **Ajustes → Oposiciones y grupos** (el modo soporte es solo para mirar).
4. El dueño invita a los formadores y les asigna sus grupos en **Ajustes →
   Equipo**.

**Cómo sé que está bien:** al dueño y a los formadores les llega el correo de
invitación **con el nombre de la academia como remitente**, y pueden entrar
desde el móvil.

**Qué puede salir mal:** que el correo llegue a la carpeta de correo basura. En
ese caso, el paso 2.7 no se completó bien.

### Paso 5 · Subir el temario y probar las 50 dudas (3 a 4 horas)

**Este es el paso que más tiempo lleva y el más importante.** Aquí se comprueba
que el asistente no se inventa nada con el temario de esta academia.

1. Entrar como formador y subir los PDF, tema por tema, con su nombre.
2. Esperar a que cada tema termine de procesarse (llega un aviso). Si alguno
   sale como escaneado, apartarlo y pedir la versión con texto.
3. Comprobar en la pantalla de temario que las páginas de cada tema cuadran con
   el PDF.
4. Invitar a un **alumno de prueba** (Alumnos → Invitar alumnos), entrar con él
   una vez y hacer las **50 dudas típicas**. No hace falta hacerlas a mano: la
   academia las da en una hoja con las mismas columnas que
   `datos-de-prueba/50-dudas-temario-claro.csv`, se guarda como
   `datos-de-prueba/50-dudas-<academia>.csv`, y se lanza:

   ```
   npm run prueba:50-dudas -- --correo prueba@suacademia.com
   ```

   Hace cada duda por el mismo camino que el chat, las corrige con otra IA y
   deja en `datos-de-prueba/resultados/` una hoja con estas columnas:

   | Duda | ¿Responde bien? | ¿Cita el tema correcto? | ¿Cita la página correcta? | ¿Se inventa algo? |
   |---|---|---|---|---|

   **Coste:** unos 2 € (unos 3 céntimos por pregunta). **Tiempo:** media hora.
   Las respuestas que la IA correctora marque como mal se revisan a mano.
   Para probar solo el buscador, gratis: añadir `--solo-busqueda`.
5. Hacer **5 preguntas que no estén en el temario** y comprobar que dice que no
   lo sabe, sin inventar. Van en la misma prueba si existe
   `datos-de-prueba/5-preguntas-fuera-del-temario-<academia>.csv`.
6. Crear **un material de cada formato** de un tema y revisarlo por encima.
7. Borrar el alumno de prueba y todo lo que ha creado.

**Cómo sé que está bien:**

- **Al menos 47 de las 50 dudas** responden bien y citan tema y página correctos.
- **Ninguna** respuesta se inventa nada.
- Las 5 preguntas de fuera del temario reciben el «no está en el temario».

**Qué puede salir mal y qué se hace:**

- **Una duda falla porque el temario no lo trae:** es un hueco en el temario.
  Se apunta para la academia.
- **Una duda falla aunque el temario sí lo trae:** es un fallo nuestro de
  búsqueda. Se apunta y se revisa antes de invitar a los alumnos.
- **Algo se inventa:** **no se sigue.** No se invita a ningún alumno hasta
  entender por qué ha pasado y corregirlo.

### Paso 6 · Invitar a los alumnos y formar al formador (1 hora y media)

**Primero la formación del formador (1 hora, con él delante):**

1. Cómo subir y sustituir un tema, y qué pasa con el material de los alumnos
   cuando lo sustituye.
2. Cómo invitar alumnos con la lista, moverlos de grupo y darlos de baja.
3. Cómo crear material para clase y compartirlo.
4. Cómo funciona la bandeja de dudas y cuándo guardar una respuesta como «nota
   del formador».
5. Qué ve en las métricas y, sobre todo, **qué no ve nunca** de un alumno
   concreto, y por qué.
6. Cómo pedirnos ayuda.

**Después, con el formador, la invitación de los alumnos (30 minutos):**

1. Subir la hoja de cálculo de alumnos desde la parte del formador (Alumnos →
   Invitar alumnos → Con una lista). La plantilla vacía se descarga en esa
   misma pantalla, en «Descargar la plantilla de lista».
2. Revisar las filas marcadas en rojo (correos mal escritos, grupos que no
   existen), corregirlas y enviar.
3. Pedir al formador que entre él mismo con una cuenta de alumno de prueba
   desde su móvil, para que vea lo que verán sus alumnos.

**Cómo sé que está bien:** en la pantalla de alumnos aparecen todos con la
invitación enviada. A la media hora ya hay alguno que la ha aceptado.

---

## Después del día: la primera semana

| Cuándo | Qué | Hecho |
|---|---|---|
| Día siguiente | Mirar en el panel técnico cuántos alumnos han entrado y si hay errores | ☐ |
| Día siguiente | Revisar la bandeja de dudas con el formador | ☐ |
| Día 3 | Mandar un recordatorio a través del formador a los alumnos que no han aceptado la invitación | ☐ |
| Día 7 | Llamada de 20 minutos con el dueño: primeras métricas, dudas y lo que falta en el temario | ☐ |
| Día 7 | Comprobar en el panel técnico que el coste de IA va dentro de lo calculado | ☐ |
| Día 7 | Pasar la revisión de seguridad si no se hizo antes de entregar | ☐ |

---

## Lista final de entrega

No se da por entregada una academia hasta que todo esto está marcado, **visto en
el navegador**:

- ☐ La web abre en su dirección, con su logo, sus colores y el nombre de su
  asistente.
- ☐ En el móvil se puede instalar en la pantalla de inicio, con su icono.
- ☐ Los correos llegan con su nombre, a la bandeja de entrada y no al correo
  basura.
- ☐ 47 de 50 dudas típicas bien respondidas y citadas, y ninguna inventada.
- ☐ Las copias de seguridad diarias están activadas y la base de datos está en
  París.
- ☐ Ninguna clave está en el código ni en GitHub.
- ☐ Un alumno de esta academia no puede entrar en otra, ni al revés.
- ☐ El formador sabe subir temario, invitar alumnos y contestar dudas.
- ☐ El dueño sabe dónde ver sus métricas y su consumo.
- ☐ Revisión de seguridad pasada.
- ☐ Foto en Git con el mensaje «Entrega de <academia>».
