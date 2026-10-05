# PUBLICAR · El asistente en internet para una academia, cuenta a cuenta

Esta guía cuenta, pantalla a pantalla, cómo se deja el asistente funcionando
en internet para una academia de verdad: qué cuentas hay que abrir, a nombre
de quién, cuánto cuesta cada una y qué se pulsa en cada web hasta que la
academia lo abre en su propia dirección (por ejemplo,
`estudio.suacademia.com`) y a sus alumnos les llegan los correos.

**Cuándo se usa:** cuando una academia ya te ha dicho que sí.
**Antes:** haber hecho [INSTALAR.md](INSTALAR.md), con la app funcionando en
tu ordenador.
**Después:** los pasos 3 a 6 de [MONTAR-CLIENTE.md](MONTAR-CLIENTE.md) (su
configuración, su equipo, su temario y sus alumnos), sobre lo que montes aquí.

**Tiempo:**

- **Parte A, tus cuentas:** una tarde, **una sola vez**. Valen para todas tus
  academias.
- **Parte B, cada academia:** hora y media de trabajo, más la espera de que la
  academia toque su dominio (de 15 minutos a 2 días). Por eso el mensaje del
  paso B6 se manda lo antes posible.

No hace falta saber programar. Abre tu proyecto en VS Code y dile a Claude:
«Vamos a seguir PUBLICAR.md para la academia <nombre>. Ve paso a paso y espera
a que te diga "sigue"».

> Precios y pantallas comprobados en las webs oficiales el 5 de octubre de
> 2026. Los proveedores cambian a veces el nombre de un botón: si no lo
> encuentras, dile a Claude qué ves en pantalla.

---

## Para Claude: cómo seguir esta guía

- Sigue los pasos **en orden**, uno cada vez. Antes de cada paso, di en una
  línea qué vas a hacer, cuánto tarda y qué puede salir mal. Al terminarlo,
  espera a que el usuario escriba «sigue».
- Habla según las normas de `CLAUDE.md`: español llano, sin jerga, respuestas
  cortas.
- **Las claves nunca pasan por el chat.** Cuando haga falta una, dile al
  usuario en qué archivo y en qué línea pegarla, o en qué recuadro de qué web.
  Tú compruebas que la línea no está vacía, sin enseñarla.
- Los pasos de las webs (Supabase, Vercel, Anthropic, Resend, Voyage) los hace
  la persona. Si no encuentra un botón, pídele que te diga qué ve en pantalla y
  guíale con eso. No inventes rutas.
- **Avisa del coste antes de cada alta de pago** y espera a que diga «sí».
- **Nunca lances `npm run db:datos-prueba` con la base de datos de una
  academia.** Llena su base de personas y temario inventados.
- Cada paso acaba con **«Cómo sé que está bien»**. No pases al siguiente hasta
  comprobarlo tú y que el usuario lo haya visto con sus ojos.

---

## 1. Las piezas, explicadas como una tienda

El asistente funciona con seis piezas. Si lo piensas como una tienda:

1. **Vercel es el local.** Es donde está abierta la web, la que el alumno
   abre en el móvil o en el ordenador. La ejecuta en París.
2. **Supabase es el almacén.** La base de datos: los PDF del temario, los
   alumnos, sus conversaciones y su progreso. Está en París.
3. **Anthropic es el dependiente que contesta.** La inteligencia artificial
   (Claude) que lee el trozo de temario que toca y responde citando la página.
4. **Resend es el cartero.** Manda los correos: el enlace para entrar, las
   invitaciones y los avisos.
5. **Voyage es el que entiende lo que quieres decir** aunque no uses las
   palabras exactas del temario. Es opcional: sin él, el asistente acierta la
   página en 46 de 50 dudas típicas.
6. **El dominio de la academia es la dirección de la puerta.**
   `estudio.suacademia.com` en vez de una dirección rara de Vercel. El dominio
   es de la academia; tú solo le pides que añada unas líneas.

Y una séptima que ya tienes: **GitHub, el cuaderno** donde se guarda el
proyecto. Vercel lee de ahí: cada vez que guardas un cambio en GitHub, la web
se actualiza sola.

---

## 2. ¿Hace falta un servidor propio (un VPS)? No

Un VPS es un ordenador alquilado en internet que gestionas tú. Esta guía no lo
usa, a propósito. En un VPS la app es tuya de arriba abajo: tienes que poner
delante un programa que la proteja de ataques, renovar los certificados del
candado (duran 90 días y pronto 45), instalar los parches del sistema y
reiniciar cuando lo piden, montar y probar tus copias de seguridad, y
actualizar la app el mismo día que sale un fallo grave. En agosto de 2026 salió
uno que permitía tomar el control del servidor: las webs en Vercel quedaron
protegidas sin tocar nada, y las de servidores propios tuvieron que
actualizarse a toda prisa.

Con Vercel y Supabase ese trabajo lo hace el proveedor. Para una academia sin
equipo técnico, unos 45 $ al mes salen más baratos que una sola caída de un
servidor que nadie vigila.

---

## 3. A nombre de quién va cada cuenta

**Recomendado: las cuentas son tuyas**, porque tú eres el proveedor. Es lo que
encaja con el precio orientativo (750 € de alta y 299 € al mes): la cuota
incluye las herramientas y la IA, tú pagas a los proveedores y le pasas una
factura a la academia. La academia no tiene que entender nada de esto.

- **Una cuenta de cada servicio para todas tus academias.** Dentro, **un
  proyecto por academia**: su base de datos, su web, su clave de IA. Nunca dos
  academias en la misma base de datos ni en la misma web.
- **Lo único que es de la academia es su dominio** (y, claro, su temario y sus
  datos). Tú le pides que añada unos registros; no necesitas su contraseña.
- **Usa el correo de tu negocio** para abrir todas las cuentas, no uno
  personal, y el mismo en todas.
- **Activa la verificación en dos pasos** en cada una y guarda las
  contraseñas en un gestor (1Password, Bitwarden o el del navegador). Quien
  entre en tu Supabase entra en los datos de todas tus academias.

**La otra opción: las cuentas a nombre de la academia.** Ella paga a los
proveedores y a ti te invita como miembro. Tiene sentido con una academia
grande que quiere control y tiene a alguien técnico. Entonces la cuota baja,
porque ya no incluye las herramientas. Los pasos de esta guía son los mismos;
solo cambia quién paga.

**Lo legal:** la academia es la responsable de los datos de sus alumnos y tú
los tratas por encargo suyo. Va en el contrato de encargo de tratamiento
(MONTAR-CLIENTE.md, «Antes del día»). Al final de esta guía tienes [qué guarda
cada proveedor y dónde](#qué-guarda-cada-proveedor-y-dónde-para-el-contrato),
para ponerlo en ese contrato.

---

## 4. Cuánto cuesta

Precios en dólares, sin IVA, a 5 de octubre de 2026. Compruébalos al
contratar.

**Lo que pagas una vez al mes, tengas una academia o diez:**

| Servicio | Plan | Precio | Por qué ese plan |
|---|---|---|---|
| **Vercel** | Pro | 20 $/mes | El gratis (Hobby) **prohíbe usarlo para un cliente que paga**. Sus normas lo dicen tal cual: cobrar por hacer o alojar la web es uso comercial |
| **Supabase** | Pro | 25 $/mes | Incluye la primera academia. El gratis no hace copias de seguridad, se pausa si nadie entra en una semana y se bloquea al llegar a 500 MB, que con los PDF del temario se alcanzan pronto |
| **Resend** | Gratis, y Pro cuando haga falta | 0 $, o 20 $/mes | El gratis manda 100 correos al día y 3.000 al mes, con 3 dominios. Pasa a Pro (50.000 al mes, sin tope diario, 10 dominios) cuando una academia invite a más de 100 alumnos el mismo día o tengas más de 3 academias |
| **Voyage** (opcional) | Con tarjeta | 0 $ al principio | Los primeros 200 millones de tokens son gratis, de sobra para varias academias. La tarjeta hace falta para quitar el límite de 3 búsquedas por minuto y para que no entrene con tus datos |

**Lo que pagas por cada academia:**

| Qué | Cuánto |
|---|---|
| Su base de datos en Supabase | La primera, incluida en los 25 $. **Cada una más, unos 10 $/mes** |
| Espacio, si pasa de 8 GB | 0,125 $ por GB al mes. Un temario normal cabe de sobra |
| **La IA (Anthropic)** | Pago por uso. Con 50 alumnos, **unos 85 $/mes** con uso normal y **unos 172 $/mes** si llegan al tope (la sección 7 de [SOLUCION.md](SOLUCION.md) tiene las cuentas) |

**Ejemplos:**

- **Una academia:** 20 + 25 = 45 $ de herramientas, más unos 85 $ de IA. Unos
  130 $ al mes (unos 117 €). Con Resend Pro, 150 $.
- **Tres academias:** 20 + 25 + 20 (Resend Pro) + 2 × 10 = 85 $ de
  herramientas, más 3 × 85 $ de IA. Unos 340 $ al mes, unos 113 $ por
  academia.

---

## 5. Lo que necesitas de la academia para esta guía

Pídelo el primer día, junto con lo de «Antes del día» de MONTAR-CLIENTE.md:

1. **Quién gestiona su dominio.** Su nombre y su correo. Suele ser la empresa
   que les hizo la web o su informático. Si no lo saben, mira en el contrato
   de su web o pregunta a quien les cobra el dominio cada año.
2. **El subdominio para el asistente.** Te recomendamos
   `estudio.suacademia.com`: los alumnos lo entienden y no toca nada de lo que
   ya tienen.
3. **El nombre con el que salen los correos.** Por ejemplo, «Academia
   Vanguardia». La dirección será `avisos@estudio.suacademia.com` (lo explica
   el paso B5).

---

# Parte A · Tus cuentas (una sola vez)

## Paso A1 · Vercel, con el plan Pro (15 minutos)

**Lo hace la persona:**

1. Entra en https://vercel.com/signup con **«Continue with GitHub»** y la
   cuenta de GitHub donde guardas tus proyectos.
2. Si te pregunta para qué la vas a usar, elige el uso comercial o **Pro**. Si
   ya tenías una cuenta gratis (Hobby), pásala a Pro desde **Settings** →
   **Billing**. Si no ves la opción, abre el selector de equipos de arriba a
   la izquierda y crea un equipo nuevo con el plan Pro.
3. Pon la tarjeta. Son 20 $ al mes con 20 $ de uso incluidos, de sobra para
   varias academias.
4. Activa la verificación en dos pasos en los ajustes de tu cuenta.

**Cómo sé que está bien:** arriba a la izquierda, al lado del nombre de tu
equipo, pone **Pro**.

**Qué puede salir mal:** que importes el proyecto en el equipo equivocado. El
selector de arriba a la izquierda dice en qué equipo estás: tiene que ser el
Pro.

## Paso A2 · Supabase, una organización con el plan Pro (10 minutos)

En Supabase, una **organización** es como tu empresa y cada **proyecto** es
la base de datos de una academia. El plan se paga por organización.

**Lo hace la persona:**

1. Entra en https://supabase.com/dashboard con **«Continue with GitHub»**.
2. Si ya tienes una organización de pruebas de INSTALAR.md, crea **otra**
   solo para clientes, con el nombre de tu marca. Así las pruebas y las
   academias no se mezclan.
3. Elige el plan **Pro** y pon la tarjeta: 25 $ al mes, con la primera
   academia incluida.
4. **El tope de gasto (Spend Cap).** Viene encendido: con él nunca pagas de
   más, pero si una academia llega a 8 GB su base de datos se queda en solo
   lectura. Déjalo encendido al empezar y revisa el tamaño cada mes (Parte C).
5. Activa la verificación en dos pasos en tu cuenta.

**Cómo sé que está bien:** en la página de la organización pone el plan
**Pro**.

## Paso A3 · Anthropic, la IA: saldo, recarga y tope (15 minutos)

La consola de Anthropic está ahora en https://platform.claude.com (la
dirección antigua, console.anthropic.com, te lleva ahí).

**Lo hace la persona:**

1. Entra con el correo de tu negocio. Si te pide crear una organización, ponle
   el nombre de tu marca.
2. **Saldo:** **Settings** → **Billing** → **Buy credits**. Empieza con 20 o
   30 €. Los créditos caducan al año.
3. **Recarga automática:** en la misma página, sección **Auto-reload** →
   **Edit**. Actívala para que recargue (por ejemplo, 50 $) cuando el saldo
   baje de 20 $. Sin esto, el día que se acabe el saldo el asistente deja de
   contestar a todos los alumnos.
4. **Tope de la organización:** en **Settings** → **Billing**, sección **Spend
   limits**, pon un tope mensual algo por encima de la suma de tus academias.
   Es la red de seguridad final.
5. Activa la verificación en dos pasos.

**Cómo sé que está bien:** en **Billing** ves el saldo y la recarga
automática encendida.

**Bueno saberlo:**

- Las cuentas nuevas empiezan con un tope de gasto mensual que sube solo con
  el historial (el primer nivel completo deja hasta 500 $ al mes). Si con
  varias academias te acercas, pide subir de nivel en la página de límites
  (**Rate limits**).
- Anthropic no usa lo que le mandas para entrenar su IA, y lo borra a los 30
  días.

## Paso A4 · Resend, el correo (5 minutos)

**Lo hace la persona:**

1. Entra en https://resend.com y crea la cuenta con el correo de tu negocio.
2. Empieza con el plan gratis. Pasa a Pro (20 $ al mes) desde los ajustes de
   facturación cuando lo diga la tabla del apartado 4.
3. Activa la verificación en dos pasos.

Los dominios y las claves se crean luego, uno por academia (pasos B5 y B7).

## Paso A5 · Voyage, la búsqueda por significado (opcional, 10 minutos)

Mejora un poco la búsqueda en el temario. Si no quieres poner otra tarjeta,
sáltate este paso y deja `VOYAGE_API_KEY` vacía: todo funciona igual.

**Lo hace la persona:**

1. Entra en https://dashboard.voyageai.com y crea la cuenta.
2. **Pon un método de pago** en **Organization** → **Billing** → **Payment
   methods**. Sigue siendo gratis (200 millones de tokens) y quita el límite de
   3 búsquedas por minuto, que con alumnos de verdad hace que las respuestas
   tarden.
3. **Imprescindible:** en **Organization** → **Terms of Service**, cambia el
   interruptor de **Opted In** a **Opted Out**. Por defecto Voyage guarda los
   textos que le mandas (el temario y las preguntas) y los usa para entrenar.
   Con **Opted Out** no guarda nada. No se puede deshacer desde el panel, y no
   hace falta.
4. Crea la clave en **API keys** → **Create new secret key**, con el nombre de
   tu marca. Una clave vale para todas tus academias. Guárdala en tu gestor de
   contraseñas.

**Cómo sé que está bien:** en **Terms of Service** pone **Opted Out**.

---

# Parte B · Cada academia nueva

En los ejemplos, la academia es «Academia Vanguardia», su carpeta es
`vanguardia` y su dominio `vanguardia.es`. Cámbialos por los de la tuya.

## Paso B1 · Su copia del proyecto (10 minutos)

Es el **paso 1 de [MONTAR-CLIENTE.md](MONTAR-CLIENTE.md)**: una copia de tu
proyecto base, con su propio repositorio **privado** en GitHub. Hazlo y vuelve
aquí.

**Lo hace Claude:** crear el archivo de secretos de esta copia, vacío:

```
cp .env.example .env.local
```

## Paso B2 · Su base de datos en Supabase (20 minutos)

**Lo hace la persona:**

1. En https://supabase.com/dashboard, elige arriba tu organización **de
   clientes** (la Pro del paso A2).
2. Pulsa **«New project»** y rellena:
   - **Project name:** `tutor-ia-vanguardia`.
   - **Database Password:** pulsa **«Generate a password»** y guárdala ahora
     mismo en tu gestor de contraseñas, con el nombre de la academia. Si la
     escribes tú, usa solo letras y números: los símbolos como `@`, `#` o `/`
     estropean la dirección de conexión.
   - **Region:** **«West EU (Paris)»**. Si te deja elegir entre una zona
     general («Europe») y una región concreta, elige la concreta. La general
     puede acabar en Londres o en Zúrich, que no son de la Unión Europea, y los
     datos de los alumnos tienen que quedarse en ella.
   - **Compute size** (si aparece): el más pequeño, **Micro**. Lo cubre el
     plan.
   - Lo demás, como viene.
3. Pulsa **«Create new project»** y espera a que termine (unos 2 minutos).
4. Pulsa el botón **«Connect»** de arriba y elige **«Transaction pooler»**.
   Copia la dirección. Empieza por `postgresql://postgres.` y acaba en
   `:6543/postgres`.
5. Abre `.env.local` en VS Code y pégala en la línea `DATABASE_URL=`. Cambia
   `[YOUR-PASSWORD]` por la contraseña del punto 2, **sin los corchetes**.
   Guarda con `Ctrl + S` (`Cmd + S` en Mac).

**Lo hace Claude:** preparar la base de datos con la estructura del producto.

```
npm run db:migrar
```

**Nunca** `npm run db:datos-prueba` aquí: es la base de datos de verdad de la
academia.

**Cómo sé que está bien:**

- La orden termina con «✓ 9 cambio(s) aplicados».
- En Supabase, **Table Editor**, al elegir el esquema `academia`, salen las
  tablas (vacías).
- En **Database** → **Backups** aparece la sección de copias diarias. La
  primera copia sale al día siguiente.
- En los ajustes del proyecto, la región dice **Paris** (`eu-west-3`).

**Qué puede salir mal:**

- «password authentication failed»: la contraseña está mal copiada, o se
  quedaron los corchetes.
- Pone **Free** en vez de Pro: has creado el proyecto en la organización de
  pruebas. Bórralo y créalo en la de clientes.
- Cualquier otro error: pégaselo a Claude tal cual.

## Paso B3 · Su clave de IA, con su propio tope (10 minutos)

Cada academia tiene su **espacio de trabajo** (workspace) en Anthropic. Así
ves lo que gasta cada una y le pones un tope para que nunca cueste más de lo
que cobras.

**Lo hace la persona:**

1. En https://platform.claude.com, ve a **Settings** → **Workspaces** →
   **Create workspace**. Nombre: `vanguardia`. Pulsa **Create**.
2. Entra en el workspace, pestaña **Spend limits**, y pon un tope mensual.
   Con 50 alumnos y los límites de la app, la IA no pasa de unos 175 $ al mes
   aunque la usen a tope. **Pon 200 $ de tope** y un aviso a 150 $. (Al
   workspace que viene por defecto no se le puede poner tope: por eso cada
   academia va en el suyo.)
3. Ve a **Settings** → **API keys** → **Create key**:
   - **Nombre:** `tutor-ia-vanguardia`.
   - **Workspace:** `vanguardia`.
   - Si te deja elegir a quién va unida, mejor una **cuenta de servicio** que
     tú mismo: así la clave no se rompe si algún día cambia quién lleva la
     cuenta.
4. Copia la clave. Empieza por `sk-ant-` y **solo se ve una vez**. Pégala en
   `.env.local`, en la línea `ANTHROPIC_API_KEY=`, y guarda.

**Cómo sé que está bien:** en **Workspaces** aparece `vanguardia` con su tope,
y la clave aparece dentro de ese workspace.

## Paso B4 · Su web en Vercel, con la dirección provisional (25 minutos)

Primero se publica con una dirección de Vercel (`tutor-ia-vanguardia.vercel.app`).
La dirección de la academia llega en los pasos B5 a B7.

**Lo hace Claude:** rellenar en `.env.local` las líneas que no son secretas, y
preparar la lista para Vercel:

| Línea | Qué va | De dónde sale |
|---|---|---|
| `ACADEMIA` | El nombre de su carpeta en `academias/`, por ejemplo `vanguardia` | Paso 3 de MONTAR-CLIENTE.md. Si aún no la has hecho, pon de momento `temario-claro` y cámbiala después |
| `URL_WEB` | De momento, `https://tutor-ia-vanguardia.vercel.app` | Se cambia en el paso B7 |
| `DATABASE_URL` | La dirección de Supabase con la contraseña | Paso B2 |
| `ANTHROPIC_API_KEY` | La clave de su workspace | Paso B3 |
| `VOYAGE_API_KEY` | Tu clave de Voyage, o nada | Paso A5 |
| `CORREO_REMITENTE` | `avisos@estudio.vanguardia.es` | Paso B5 |
| `CORREOS_TECNICOS` | Tu correo (y el de tu equipo, separados por comas) | Te da el panel técnico de esta academia |
| `CRON_SECRET` | Una contraseña larga inventada, **distinta en cada academia** | Claude la genera: `openssl rand -hex 32` |

`RESEND_API_KEY` todavía no: llega en el paso B7.

**Nunca en la web de una academia:** `MODO_PRUEBAS`, `IA_SIMULADA` ni
`CORREO_PRUEBAS_BASE`. Son solo para tu ordenador.

**Lo hace la persona:**

1. En https://vercel.com, comprueba arriba a la izquierda que estás en tu
   equipo **Pro**.
2. Pulsa **«Add New…»** → **«Project»**.
3. En la lista de repositorios de GitHub, busca `tutor-ia-vanguardia` y pulsa
   **«Import»**. Si no sale, pulsa el enlace para ajustar los permisos de
   GitHub (dice algo como «Adjust GitHub App Permissions») y dale acceso a ese
   repositorio.
4. En la pantalla de configuración:
   - **Project Name:** `tutor-ia-vanguardia`.
   - **Framework Preset:** tiene que poner **Next.js** (sale solo).
   - **Root Directory** y **Build and Output Settings:** no los toques.
   - **Environment Variables:** despliégalo y añade las líneas de la tabla de
     arriba, una a una (nombre a la izquierda, valor a la derecha). Vercel
     también deja pegar varias líneas de golpe en el primer recuadro: si
     Claude te prepara las líneas, pégalas ahí y revisa que se han repartido
     bien.
5. Pulsa **«Deploy»** y espera (de 2 a 4 minutos). Al terminar sale una
   pantalla de enhorabuena con la miniatura de la web.

**Lo comprueba la persona, en el proyecto de Vercel:**

1. **Settings** → **Functions**: la región (**Function Region**) es **Paris,
   France (cdg1)**. Sale sola, porque el proyecto ya lo dice. Y **Fluid
   Compute** está activado: hace falta para crear materiales, que pueden tardar
   varios minutos.
2. **Settings** → **Cron Jobs**: hay una tarea, `/api/tareas/avisos`, que se
   lanza cada día a las 8:00 de la hora universal (las 10:00 en Madrid en
   verano y las 9:00 en invierno). Es la que manda los avisos de cada mañana.

**Cómo sé que está bien:** la dirección `https://tutor-ia-vanguardia.vercel.app`
abre la pantalla de entrar, con la marca de la academia (o la de ejemplo, si
aún no has hecho su configuración).

**Qué puede salir mal:**

- **Sale en rojo y no publica.** Abre **Build Logs**, copia las últimas líneas
  en rojo y pégaselas a Claude. Lo más habitual: el archivo de configuración de
  la academia tiene una línea mal, y el mensaje dice cuál.
- **La web abre pero da error.** Casi siempre es `DATABASE_URL`: revisa la
  contraseña en **Settings** → **Environment Variables**, guarda y vuelve a
  publicar (paso B7, punto 6).
- **No subas al repositorio de la academia nada que no esté probado.** Cada
  cambio que llega a GitHub se publica solo en su web. Los cambios se prueban
  antes en tu ordenador.

## Paso B5 · Preparar su dirección y su correo (15 minutos)

Ahora se le dice a Vercel y a Resend cuál será la dirección de la academia.
Los dos te darán unos **registros**: líneas que hay que añadir en el dominio
de la academia para demostrar que es suyo. Las copias y, en el paso B6, se las
mandas a quien lleva su dominio en un solo mensaje.

**Por qué `avisos@estudio.vanguardia.es` y no `avisos@vanguardia.es`:** Resend
recomienda mandar desde un subdominio. Si algún día algo sale mal con los
correos del asistente, el correo normal de la academia no se resiente. Y así
todo vive en `estudio`: la web y los correos.

**Lo hace la persona, en Vercel:**

1. En el proyecto, **Settings** → **Domains** → **«Add Domain»**.
2. Escribe `estudio.vanguardia.es` y confirma. Si pregunta por redirigir
   `www`, di que no: es un subdominio.
3. Sale como **«Invalid Configuration»**: es normal, falta el registro. Debajo
   aparece el registro que hace falta: **tipo CNAME**, **nombre `estudio`** y
   un **valor propio de tu proyecto**, del estilo `d1d4fc829fe7bc7c.vercel-dns-017.com`.
   Cópialo **tal cual sale**: no vale uno genérico.

**Lo hace la persona, en Resend:**

1. **Domains** → **«Add Domain»**.
2. Escribe `estudio.vanguardia.es`.
3. **Region:** **Ireland (eu-west-1)**, la más cercana a los alumnos. No se
   puede cambiar luego sin borrar el dominio y repetir los registros.
4. Las opciones avanzadas, como vienen.
5. Pulsa para añadirlo. En la pestaña **Records** salen los registros. Lo
   normal son tres: un **MX** y un **TXT** con nombre `send.estudio`, y un
   **TXT** con nombre `resend._domainkey.estudio`. En dominios nuevos, Resend a
   veces pide **CNAME** en su lugar. Copia **exactamente** los que te salgan,
   con su tipo, su nombre, su valor y, en el MX, su prioridad.

**Lo hace Claude:** juntar en el mensaje del paso B6 el registro de Vercel, los
de Resend y este de DMARC, que ayuda a que los correos no acaben en el correo
basura:

| Tipo | Nombre | Valor |
|---|---|---|
| TXT | `_dmarc.estudio` | `v=DMARC1; p=none;` |

**Cómo sé que está bien:** tienes copiados el registro de Vercel y todos los de
Resend, cada uno con tipo, nombre y valor.

## Paso B6 · El mensaje a quien lleva su dominio (5 minutos, y esperar)

**Lo hace la persona:** mandar este mensaje a la persona del apartado 5, con
copia a la academia. Claude rellena los registros.

```
Hola, [nombre]:

Estamos poniendo en marcha el asistente de estudio de [academia] en
https://estudio.[dominio]. Para que la web funcione y los correos lleguen a
los alumnos, necesitamos que añadáis estos registros en la zona DNS de
[dominio]. No hay que tocar nada de lo que ya tenéis: son registros nuevos,
todos dentro de «estudio».

[tipo]  [nombre]  [valor]  [prioridad, solo en el MX]
...

Tres detalles:
1. Si vuestro panel añade el dominio solo al final, en el nombre basta con la
   parte de delante: «estudio», «send.estudio», etc.
2. Si usáis Cloudflare, dejad estos registros sin proxy (la nube en gris).
3. Si ya hubiera algún registro con el nombre «estudio», avisadnos antes de
   tocarlo.

Cuando estén puestos, decídnoslo y lo comprobamos desde nuestro lado.

Muchas gracias,
[tu nombre]
```

**Si la academia te dice que lo hagas tú** y te da acceso a su panel, Claude
te guía. Dónde se añaden los registros en los paneles más habituales:

- **IONOS:** **Dominios y SSL** → engranaje del dominio → **DNS** → **Añadir
  registro**. En el nombre, solo la parte de delante.
- **GoDaddy:** tus dominios → el dominio → pestaña **DNS** → **Añadir nuevo
  registro**. En el nombre, solo la parte de delante.
- **Hostinger:** **Dominios** → el dominio → **DNS / Nameservers** → elegir el
  tipo, rellenar y **Add Record**. En el nombre, solo la parte de delante.
- **Cloudflare:** el dominio → **DNS** → **Records** → **Add record**. En el
  nombre, solo la parte de delante, y **sin proxy (nube gris)**.
- **DonDominio:** área de cliente → **Dominios** → el dominio → pestaña **Zona
  DNS** → añadir una entrada nueva.
- **Arsys:** área de cliente → panel del dominio → **Entradas DNS** → **Añadir
  entrada DNS**. **Aquí es al revés: el nombre va completo**
  (`estudio.vanguardia.es`).

**Lo que más falla:**

1. **El nombre escrito entero en un panel que ya añade el dominio.** El
   registro acaba siendo `estudio.vanguardia.es.vanguardia.es` y nunca se
   verifica. Si pasa, se borra y se vuelve a crear solo con `estudio`.
2. **Ya había algo en `estudio`.** Un CNAME no puede convivir con otros
   registros en el mismo nombre. Si `estudio` ya se usa, se elige otro
   subdominio (por ejemplo, `asistente`) y se repite el paso B5.
3. **Dos MX con la misma prioridad.** Si el panel se queja, pon 20 o 30 en el
   de Resend.
4. **Cambiar los «servidores de nombres» del dominio.** No hace falta y es
   peligroso: si se hace sin copiar antes lo que había, a la academia deja de
   llegarle el correo. Solo se añaden registros.

Mientras esperas, sigue con MONTAR-CLIENTE.md desde el paso 3 usando la
dirección provisional de Vercel.

## Paso B7 · Cuando el dominio está listo (20 minutos)

Los registros suelen funcionar en 15 minutos, pero pueden tardar hasta 2 días.

**Lo hace la persona:**

1. **Vercel**, **Settings** → **Domains**: `estudio.vanguardia.es` pone
   **«Valid Configuration»**. El candado (el certificado) lo pone Vercel solo,
   en unos minutos.
2. **Resend**, **Domains**: el dominio pone **«Verified»**. Si a las 72 horas
   no lo pone, revisa los registros con Claude y pulsa **«Restart
   verification»**.
3. **La clave de correo de esta academia.** En Resend, **API Keys** →
   **«Create API Key»**:
   - **Name:** `tutor-ia-vanguardia`.
   - **Permission:** **Sending access** (solo enviar).
   - **Domain:** `estudio.vanguardia.es` (así solo sirve para esta academia).
   - Cópiala: solo se ve una vez.
4. **En Vercel**, **Settings** → **Environment Variables**:
   - Añade `RESEND_API_KEY` con la clave del punto 3.
   - Cambia `URL_WEB` por `https://estudio.vanguardia.es`.
   - Guarda.
5. Pega también las dos en tu `.env.local`, para que tu copia esté igual.
6. **Vuelve a publicar**, porque los cambios en las variables solo cuentan en
   la siguiente publicación: **Deployments** → la de arriba → los tres puntos
   (**⋯**) → **Redeploy**.

**Cómo sé que está bien:**

1. `https://estudio.vanguardia.es` abre con candado y con la marca de la
   academia.
2. Escribe tu correo (el de `CORREOS_TECNICOS`) en la pantalla de entrar. Te
   llega el correo **a la bandeja de entrada, no al correo basura**, con el
   nombre de la academia como remitente, y el enlace te lleva a
   `estudio.vanguardia.es`.

**Qué puede salir mal:**

- **El correo no llega.** Mira en Resend, **Emails**: si sale como enviado,
  revisa el correo basura; si no aparece, falta `RESEND_API_KEY` o no se volvió
  a publicar.
- **El enlace del correo lleva a la dirección de Vercel.** `URL_WEB` sigue con
  la antigua o no se volvió a publicar.
- **El correo llega al correo basura.** Falta algún registro de Resend o el de
  DMARC. Resend ofrece https://dns.email para ver qué registros ya se ven.

## Paso B8 · La lista antes de seguir

No sigas con MONTAR-CLIENTE.md (o no invites a nadie) hasta tener todo esto
marcado, **visto en el navegador**:

- ☐ La web abre en `https://estudio.<dominio>` con candado.
- ☐ El correo para entrar llega a la bandeja de entrada, con el nombre de la
  academia.
- ☐ Supabase: el proyecto está en la organización Pro, en **Paris**, y aparece
  la sección de copias diarias.
- ☐ Vercel: el equipo es Pro, la región es **Paris (cdg1)**, **Fluid Compute**
  activado y la tarea diaria en **Cron Jobs**.
- ☐ Vercel: no existen las variables `MODO_PRUEBAS`, `IA_SIMULADA` ni
  `CORREO_PRUEBAS_BASE`.
- ☐ Anthropic: la clave está en el workspace de la academia, con su tope.
- ☐ Resend: el dominio, verificado y en Irlanda; la clave, solo para enviar y
  solo para ese dominio.
- ☐ Voyage (si la usas): **Opted Out**.
- ☐ Ninguna clave en GitHub. Claude lo comprueba con `git grep -n -E
  "sk-ant-|re_[A-Za-z0-9]{20}|postgresql://"` en la copia de la academia: no
  debe salir nada.
- ☐ Verificación en dos pasos en todas tus cuentas.
- ☐ Las contraseñas y claves de esta academia, guardadas en tu gestor con su
  nombre.

Y ahora, **MONTAR-CLIENTE.md desde el paso 3**: su configuración, su equipo,
su temario y sus alumnos. Si los alumnos son más de 100, invítalos en varios
días o pasa antes Resend a Pro.

---

# Parte C · Cada mes, 20 minutos

1. **Lo que gasta cada academia en IA:** en Anthropic, **Workspaces** (y en tu
   panel técnico de la app). Si una se acerca a su tope, habla con ella antes
   de que se le corte.
2. **El saldo de Anthropic y la recarga automática**, en **Billing**.
3. **El tamaño de cada base de datos:** en Supabase, el informe de la base de
   datos de cada proyecto (**Reports** → **Database**). Con el tope de gasto
   encendido, a los 8 GB se queda en solo lectura: antes de llegar, apaga el
   tope en la facturación de la organización y asume 0,125 $ por GB de más.
4. **Los correos:** en Resend, que los rebotes (direcciones que no existen)
   vayan por debajo del 4 %. Si suben, Resend pausa los envíos. Suelen ser
   correos mal escritos en la lista de alumnos.
5. **Los arreglos de tu proyecto base:** cuando lo mejores, llévalo a cada
   academia con `git pull base main` desde su carpeta, pruébalo en tu
   ordenador y súbelo. Vercel lo publica solo.
6. **Los modelos de IA:** Anthropic retira modelos antiguos y avisa por correo
   con al menos 60 días. Hoy la app usa Sonnet 5 para responder y Haiku 4.5
   para las tareas pequeñas. Anthropic ya ha dicho que retirará Haiku 4.5, no
   antes del 15 de octubre de 2026, aunque todavía no ha puesto fecha. Cuando llegue el
   aviso, se cambia en Vercel (`MODELO_PRINCIPAL` o `MODELO_RAPIDO`) por el
   modelo que Anthropic indique como sustituto y se vuelve a publicar. Claude
   te ayuda a probarlo antes.
7. **Las copias de seguridad:** Supabase guarda las de los últimos 7 días. Si
   alguien borra algo por error, en **Database** → **Backups** se restaura la
   del día anterior. Mientras se restaura, la web de esa academia no funciona,
   y se pierde lo hecho desde esa copia: avísala antes.

---

## Si algo falla en una web que ya funciona

| Lo que ves | Lo que suele ser | Qué haces |
|---|---|---|
| El asistente no contesta a nadie | Sin saldo en Anthropic, o la academia llegó a su tope | **Billing** y el **Spend limit** de su workspace |
| Va muy lento al contestar | Voyage sin tarjeta (3 búsquedas por minuto) | Pon la tarjeta (paso A5) o quita `VOYAGE_API_KEY` en Vercel y vuelve a publicar |
| No llegan los correos a nadie | Resend llegó a 100 correos en el día, o pausó los envíos | **Emails** en Resend. Pasa a Pro o espera al día siguiente |
| No se puede subir temario ni guardar nada | La base de datos llegó a 8 GB con el tope de gasto | Apaga el tope de gasto en Supabase (Parte C, punto 3) |
| La web entera da error | Supabase o Vercel tienen una avería, o una variable mal | https://status.supabase.com, https://www.vercel-status.com y los registros de **Logs** en Vercel |
| Se te ha escapado una clave | Cualquiera que la tenga puede gastar a tu nombre o entrar en los datos | Cámbiala primero y pregunta después. Crea otra en su web, borra la vieja, pon la nueva en Vercel y en `.env.local` y vuelve a publicar |

---

## Si una academia deja el servicio

1. Lo que diga el contrato. Por defecto, la sección 18 de
   [SOLUCION.md](SOLUCION.md): los datos se guardan 30 días después de la baja.
2. En Vercel, quita su dominio (**Settings** → **Domains**) para que la
   dirección deje de abrir.
3. Si pide sus datos, Claude le prepara una copia antes de borrar nada.
4. A los 30 días, y con su confirmación por escrito: borra su proyecto de
   Supabase (en los ajustes generales del proyecto, abajo del todo), su
   proyecto de Vercel (igual), su workspace y su clave en Anthropic, y su
   dominio y su clave en Resend.
5. Pídele a quien lleva su dominio que quite los registros de `estudio`.

---

## Qué guarda cada proveedor y dónde (para el contrato)

Para el contrato de encargo de tratamiento. **No es asesoramiento legal:**
revísalo con un profesional.

| Proveedor | Qué recibe | Dónde | Su acuerdo de datos |
|---|---|---|---|
| **Supabase** | Todo: temario, alumnos, conversaciones | **París (UE)**. Supabase avisa de que elegir región no basta por sí solo para cumplir el RGPD | Se acepta con sus condiciones |
| **Vercel** | Las peticiones a la web mientras pasan | Las funciones, en **París**; la empresa trata registros y panel en EE. UU. | Solo en el plan **Pro** |
| **Anthropic** | La pregunta del alumno y los trozos de temario que tocan | **No hay opción de procesarlo en la UE** en su servicio directo. No lo usa para entrenar y lo borra en 30 días | Se acepta con sus condiciones comerciales |
| **Resend** | Nombre y correo del alumno y el contenido de cada correo | Envía desde **Irlanda**, pero guarda los datos de la cuenta y los registros en **EE. UU.** | Firmado de antemano, en **Settings** → **Documents** |
| **Voyage** | Los trozos de temario y las preguntas, para buscar | **EE. UU.** Con **Opted Out** no guarda nada | Se acepta con sus condiciones |

Lo que se puede decir con verdad a una academia: **la base de datos está en
París y nadie entrena una IA con sus datos.** No se puede decir que todo se
queda en Europa.
