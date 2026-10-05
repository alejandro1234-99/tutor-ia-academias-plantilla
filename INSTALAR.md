# INSTALAR · De cero a tu asistente de estudio funcionando

Esta guía la sigue **Claude Code contigo**. Tú no tienes que saber programar:
Claude lanza las órdenes y tú haces lo que solo puede hacer una persona (crear
cuentas, pulsar botones en webs y pegar claves en un archivo).

**Al terminar tendrás:** tu copia privada de la plantilla en GitHub, una base
de datos en París, la app funcionando en tu ordenador con una academia de
ejemplo y, si quieres, publicada en internet.

**Tiempo:** de 1 a 2 horas la primera vez, casi todo creando cuentas.

---

## Para Claude: cómo seguir esta guía

- Sigue los pasos **en orden**, uno cada vez. Antes de cada paso, di en una
  línea qué vas a hacer, cuánto tarda y qué puede salir mal. Al terminarlo,
  espera a que el usuario escriba «sigue».
- Habla según las normas de `CLAUDE.md`: español llano, sin jerga, respuestas
  cortas.
- **Las claves nunca pasan por el chat.** Cuando haga falta una, dile al
  usuario que abra `.env.local` en VS Code, en qué línea la pega y que guarde
  con `Ctrl + S` (`Cmd + S` en Mac). Tú compruebas que la línea no está vacía,
  sin enseñarla.
- Cada paso acaba con **«Cómo sé que está bien»**. No pases al siguiente hasta
  comprobarlo tú y que el usuario lo haya visto con sus ojos.
- Si algo falla, explica qué ha pasado en una frase y propón el arreglo. No
  sigas adelante con un paso a medias.

---

## Lo que vas a necesitar

| Cuenta | Para qué | Cuánto cuesta |
|---|---|---|
| **Claude, plan Pro o superior** | Usar Claude Code, que es quien instala todo | La suscripción de Claude |
| **GitHub** | Guardar tu copia del proyecto | Gratis |
| **Supabase** | La base de datos | Gratis para probar. Para una academia de verdad, plan Pro (unos 25 $ al mes, con copias de seguridad diarias) |
| **Anthropic (console.anthropic.com)** | La inteligencia artificial del asistente | Pago por uso: unos 3 céntimos por pregunta y de 11 a 18 céntimos por material. Para probar bastan 5 € |
| **Vercel** | Publicar la web | Gratis para probar. Para cobrar a una academia, plan Pro (20 $ al mes, sirve para todas) |
| **Resend** | Mandar los correos para entrar | Gratis hasta 3.000 correos al mes. Necesita un dominio propio para escribir a alumnos de verdad |
| **Voyage AI** (opcional) | La búsqueda por significado en el temario | Gratis los primeros 200 millones de tokens, pero pide tarjeta para quitar el límite de 3 búsquedas por minuto |

**Para probarlo en tu ordenador solo hacen falta las cuatro primeras.** Y si
quieres verlo sin gastar nada en IA, hay una IA de prueba (paso 3).

Usa el mismo correo en todas. Crea GitHub primero: Vercel y Supabase se abren
con «Continue with GitHub».

---

## Paso 0 · Preparar el ordenador (15 minutos)

**Lo hace la persona, una sola vez:**

1. Instala **VS Code**: https://code.visualstudio.com/download. En Windows,
   instalador «User» y marca «Agregar a PATH».
2. En VS Code, abre Extensiones (`Ctrl + Shift + X` o `Cmd + Shift + X`),
   busca **«Claude Code»** (de Anthropic), instálala y entra con tu cuenta de
   Claude.
3. Crea una carpeta **«Proyectos»** dentro de Documentos y ábrela en VS Code
   (`Archivo` → `Abrir carpeta`).
4. Abre el panel de Claude (la chispa del borde izquierdo) y pega el prompt de
   instalación del [README](README.md#instalarlo-con-claude).

**Lo hace Claude:** comprobar que el ordenador tiene lo necesario e instalar
lo que falte, pidiendo permiso antes de cada cosa:

- **Git.** Comprueba con `git --version`. Si falta: en Mac, `xcode-select
  --install`; en Windows, `winget install --id Git.Git -e`.
- **Node.js 22 o más nuevo.** Comprueba con `node --version`. Si falta o es
  más viejo: en Mac, el instalador de https://nodejs.org (versión LTS); en
  Windows, `winget install OpenJS.NodeJS.LTS`. Después hay que cerrar y volver
  a abrir VS Code.
- **GitHub CLI (`gh`)** y la sesión iniciada. Comprueba con `gh auth status`.
  Si falta: en Mac, `brew install gh` (o el instalador de https://cli.github.com);
  en Windows, `winget install GitHub.cli`. Para entrar: `gh auth login`, elegir
  GitHub.com, HTTPS y «Login with a web browser». Claude le enseña al usuario
  el código de un solo uso para pegarlo en el navegador.

**Cómo sé que está bien:** `git --version`, `node --version` (22 o más) y
`gh auth status` responden sin error.

---

## Paso 1 · Tu copia de la plantilla (5 minutos)

**Lo hace Claude:**

1. Crear la copia privada del usuario a partir de la plantilla y descargarla
   en la carpeta Proyectos. Pregunta antes el nombre (por defecto,
   `tutor-ia-academias`):

   ```
   gh repo create tutor-ia-academias --template alejandro1234-99/tutor-ia-academias-plantilla --private --clone
   ```

2. Entrar en la carpeta e instalar las piezas del proyecto:

   ```
   cd tutor-ia-academias
   npm ci
   ```

3. Decirle al usuario que abra **esa carpeta** en VS Code (`Archivo` → `Abrir
   carpeta` → `tutor-ia-academias`) y que, en una conversación nueva de Claude,
   escriba:

   > **Sigue INSTALAR.md desde el paso 2.**

   Así Claude carga las normas del proyecto (`CLAUDE.md`).

**Cómo sé que está bien:** en https://github.com aparece el repositorio nuevo,
marcado como «Private», y la carpeta tiene los archivos `README.md`,
`INSTALAR.md` y `SOLUCION.md`.

**Qué puede salir mal:** que `npm ci` tarde varios minutos la primera vez.
Es normal.

---

## Paso 2 · La base de datos en Supabase (15 minutos)

**Lo hace la persona:**

1. Entra en https://supabase.com/dashboard con «Continue with GitHub».
2. Pulsa **«New project»**:
   - **Name:** el del proyecto, por ejemplo `tutor-ia-academias`.
   - **Database Password:** pulsa «Generate a password» y **guárdala en tu
     gestor de contraseñas**. La vas a necesitar ahora mismo.
   - **Region:** **«West EU (Paris)»**. Siempre en la Unión Europea, porque
     guardas datos de alumnos.
3. Espera a que el proyecto termine de crearse (unos 2 minutos).
4. Pulsa el botón **«Connect»** de arriba, pestaña **«Connection String»**,
   y copia la dirección de **«Transaction pooler»**. Empieza por
   `postgresql://postgres.` y acaba en `:6543/postgres`.

**Lo hace Claude:** crear el archivo de secretos a partir de la plantilla, sin
rellenar nada:

```
cp .env.example .env.local
```

**Lo hace la persona:** abre `.env.local` en VS Code y pega la dirección en la
línea `DATABASE_URL=`. Cambia `[YOUR-PASSWORD]` por la contraseña del punto 2
(sin los corchetes). Guarda.

**Lo hace Claude:** preparar la base de datos con la estructura del producto.

```
npm run db:migrar
```

**Cómo sé que está bien:** la orden termina con «✓ 9 cambio(s) aplicados». Si
se repite, dice «La base de datos ya estaba al día». En Supabase, en «Table
Editor», al elegir el esquema `academia` salen las tablas.

**Qué puede salir mal:** «password authentication failed» quiere decir que la
contraseña de la dirección está mal escrita (o se quedaron los corchetes).

---

## Paso 3 · Las claves y los ajustes (10 minutos)

**Lo hace la persona, si quiere la IA de verdad (recomendado):**

1. Entra en https://console.anthropic.com, ve a **Billing** y carga 5 €.
2. Ve a **API Keys** → **Create Key**, ponle de nombre el del proyecto y
   cópiala. Solo se ve una vez.
3. Pégala en `.env.local`, en la línea `ANTHROPIC_API_KEY=`. Guarda.

**Si prefiere probar sin gastar nada:** deja `ANTHROPIC_API_KEY` vacía y Claude
pondrá `IA_SIMULADA=1`. La IA de prueba copia el párrafo del temario que toca:
sirve para ver todas las pantallas, pero no contesta como la de verdad.

**Lo hace Claude:** rellenar el resto de líneas de `.env.local` para la copia
de pruebas (estas no son secretas):

| Línea | Valor para probar en el ordenador |
|---|---|
| `ACADEMIA` | `temario-claro` |
| `URL_WEB` | `http://localhost:3000` |
| `CORREOS_TECNICOS` | el correo del usuario (le da el panel técnico) |
| `CRON_SECRET` | una contraseña larga inventada: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MODO_PRUEBAS` | `1` (enciende el buzón y el panel de pruebas) |
| `IA_SIMULADA` | `1` solo si no hay clave de Anthropic; si la hay, vacío |

`VOYAGE_API_KEY`, `RESEND_API_KEY` y `CORREO_REMITENTE` se quedan vacías por
ahora: en el ordenador no hacen falta.

**Cómo sé que está bien:** `npm run comprobar:configuracion` dice «✓ Configuración
de «Academia Temario Claro» comprobada».

---

## Paso 4 · La academia de ejemplo, funcionando en tu ordenador (10 minutos)

**Lo hace Claude:**

1. Cargar la academia de ejemplo: 12 personas inventadas y tres temas del BOE
   (Constitución, Ley 39/2015 y Ley 40/2015, 235 páginas en total).

   ```
   npm run db:datos-prueba
   ```

2. Arrancar la app y dejarla encendida:

   ```
   npm run dev
   ```

**Lo hace la persona:**

1. Abre http://localhost:3000 en el navegador. Sale la pantalla de entrar de
   la **Academia Temario Claro**.
2. Escribe `diego@example.com` y pulsa el botón. Ningún correo sale a
   internet: abre http://localhost:3000/pruebas/buzon, pulsa el enlace del
   correo y luego «Entrar».
3. Pregúntale a **Clara**, el asistente: «¿Qué mayoría hace falta para aprobar
   una moción de censura?». La respuesta trae debajo de qué tema, artículo y
   página sale. Pulsa la cita: se abre la página del temario con el párrafo
   resaltado.
4. Pregúntale algo que no está en el temario, por ejemplo «¿Cuánto cobra un
   auxiliar administrativo?». Tiene que decir que no está en el temario, sin
   inventar.
5. Prueba **Crear material**: un esquema del tema 1.
6. Sal y entra como `andres@example.com` (formador) y como `elena@example.com`
   (dueña): verás el temario, la bandeja de dudas y las métricas.

**Cómo sé que está bien:** las seis cosas de arriba funcionan. Con esto ya
tienes una demo para enseñar a una academia: grábala en 3 minutos (una duda con
su página, una pregunta que no está y el panel de la dirección).

**Qué puede salir mal:** si la respuesta tarda mucho o falla, revisa la clave
de Anthropic y que tenga saldo. El panel http://localhost:3000/pruebas deja
probar cosas sin esperar días.

---

## Paso 5 · Tu marca (5 minutos)

En el pie de todas las pantallas sale «Funciona con [nuestra marca]». Es tu
firma como proveedor.

**Lo hace Claude:** preguntar el nombre de la marca del usuario y cambiar la
línea `"funcionaCon"` en `academias/temario-claro/configuracion.jsonc` y en
`academias/vanguardia/configuracion.jsonc`. Después, guardar el cambio en Git
con el mensaje «Mi marca en el pie» y subirlo a GitHub.

**Cómo sé que está bien:** al recargar http://localhost:3000, el pie dice
«Funciona con» y el nombre de tu marca.

---

## Paso 6 · Publicarla en internet (opcional, 20 minutos)

Para enseñar la demo basta con tu ordenador. Publicarla tiene sentido cuando
vayas a montarla para una academia, porque para que los correos lleguen a
personas de verdad hace falta un dominio y Resend. **Para una academia real,
sigue [MONTAR-CLIENTE.md](MONTAR-CLIENTE.md)**, que incluye este paso con su
dominio.

Si aun así quieres una dirección de prueba en internet:

**Lo hace la persona:**

1. Entra en https://vercel.com con «Continue with GitHub».
2. **Add New** → **Project** → elige tu repositorio `tutor-ia-academias` →
   **Import**.
3. Antes de pulsar «Deploy», abre **Environment Variables** y añade, una a
   una, las mismas líneas de tu `.env.local` **salvo `MODO_PRUEBAS` e
   `IA_SIMULADA`**, con `URL_WEB` cambiada por la dirección que te dé Vercel
   (la puedes corregir después en Settings → Environment Variables).
4. Pulsa **Deploy**.

**Cómo sé que está bien:** la dirección que da Vercel abre la pantalla de
entrar de Temario Claro.

**Qué puede salir mal:** sin `RESEND_API_KEY` y un dominio verificado en
Resend, el enlace para entrar no llega a nadie. Es lo esperado: los correos se
montan con el dominio de la academia (MONTAR-CLIENTE.md, paso 2).

---

## Y después

| Quiero… | Qué hago |
|---|---|
| Enseñársela a una academia | Graba la demo de 3 minutos del paso 4 y pide 15 minutos al dueño |
| Montársela a una academia que ha dicho que sí | [MONTAR-CLIENTE.md](MONTAR-CLIENTE.md), con Claude, paso a paso |
| Entender qué hace cada pantalla | [SOLUCION.md](SOLUCION.md) y las capturas de [docs/pantallas](docs/pantallas/index.html) |
| Cambiar o añadir algo al producto | Primero lo escribes en SOLUCION.md con Claude, después se construye |
| Retomar otro día | [EMPEZAR-AQUI.md](EMPEZAR-AQUI.md) |
