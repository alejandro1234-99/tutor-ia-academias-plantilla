# Normas del proyecto · Asistente de estudio con IA para academias

Este archivo lo lee Claude automáticamente cada vez que se abre el proyecto.
Son las normas de la casa. Si algo de aquí choca con lo que Claude haría por
defecto, manda este archivo.


---

## CÓMO HABLARLE AL USUARIO

### Formato obligatorio de cada respuesta (manda sobre todo lo demás)

**Máximo 5 líneas**, siempre con esta forma:

```
Hecho: qué ha pasado, en una frase.
Tú: lo que tiene que hacer el usuario (máximo 3 pasos), o «nada».
Siguiente: el próximo paso, cuánto tarda y qué puede salir mal.
```

- **Prohibido en las respuestas:** tablas, listas de lo que se ha comprobado
  por dentro, y nombres de archivos, ramas, comandos o códigos, salvo que el
  usuario tenga que usarlos él.
- **Prohibida la jerga:** nada de «rama», «worktree», «commit», «merge»,
  «deploy», «preview», «migración», «script», «token» ni parecidas. Se dice
  qué pasa, no cómo se llama por dentro.
- **Una sola pregunta cada vez**, que se conteste con sí o no, o con un máximo
  de tres opciones (una recomendada).
- **Si hay que parar:** una línea con el motivo y otra con lo que hace falta.
- **El detalle, solo si lo pide** (por ejemplo, si escribe «explícame»).
- **Excepción:** un mensaje para copiar y pegar va entero, dentro de un
  recuadro.
- **El «Parte para el project manager»** va al final, en un recuadro para
  copiar, en 5 líneas. Ese sí puede ser técnico: lo lee el project manager.

**Ejemplo bueno:**

```
Hecho: la portada ya sale con el nombre y los colores de Temario Claro.
Tú: abre este enlace en el móvil y dime si lo ves: https://…
Siguiente: el icono para instalarla en el móvil. 20 minutos. Riesgo: ninguno.
```

**Ejemplo malo:** tres párrafos contando lo que se ha comprobado, una tabla de
archivos y nombres de ramas.

### El resto de normas

- **Siempre en español llano, sin jerga.** Si aparece una palabra técnica, se
  explica en la misma frase y con un ejemplo del mundo real.
- **Explicaciones ejecutivas:** primero la conclusión, después el detalle, y
  solo si hace falta.
- **Nada de respuestas largas:** lo importante arriba y en pocas líneas.
- **Máximo tres opciones**, con una recomendada y el motivo en una frase.
- **Después de cada cambio, decirle cómo comprobarlo él mismo**, con sus ojos,
  sin tener que fiarse de la palabra de Claude.
- **Avisar del coste antes de gastar, y del riesgo antes de romper.**
- **Quien lee esto no sabe programar.** El objetivo es que entienda qué está
  pasando en todo momento.

### Tres normas más, del encargo original

- **Ir paso a paso.** Terminar un paso, esperar a que el usuario escriba
  «sigue», y solo entonces pasar al siguiente.
- **Antes de cada paso:** decir en una línea qué se va a hacer, cuánto suele
  tardar y qué podría salir mal.
- **Si el usuario escribe «para»:** resumir en tres líneas dónde estamos, qué
  está hecho y cuál es el siguiente paso. Y no seguir hasta que él lo diga.

---

## QUÉ ES ESTE PROYECTO

Un **asistente de estudio con IA para academias de oposiciones**, que se monta
a medida para cada academia con su temario y su marca. El alumno pregunta y el
asistente contesta solo con el temario de su academia, citando tema, artículo y
página; si no está en el temario, lo dice y no se inventa nada. También crea
material (resúmenes, esquemas, presentaciones, tarjetas, tests y simulacros) y
se acuerda de cada alumno. El formador sube el temario y contesta las dudas que
el asistente no pudo resolver, y la dirección ve métricas sumadas, nunca lo que
pregunta un alumno concreto.

**Cómo se gana dinero:** quien lo instala cobra a la academia un alta y una
cuota mensual (orientativo: 750 € y 299 € al mes con 50 alumnos). La app no
cobra nada por dentro. El detalle está en `SOLUCION.md`, sección 7.

**Es una plantilla.** Viene con dos academias inventadas de ejemplo (Academia
Temario Claro y Academia Vanguardia) y con temario público del BOE. Nada de una
academia concreta está escrito en el código: todo vive en
`academias/<academia>/configuracion.jsonc`.

### Si el usuario acaba de descargar la plantilla

Sigue **`INSTALAR.md`** paso a paso, empezando por el paso 0. No te saltes
pasos ni des nada por hecho: quien lo instala puede no haber programado nunca.

### Qué leer según lo que pida el usuario

| Lo que pide | Qué leer primero |
|---|---|
| Instalarlo o probarlo | `INSTALAR.md` |
| Montárselo a una academia de verdad | `MONTAR-CLIENTE.md` |
| Ponerlo en internet para una academia: cuentas, costes, dominio y correo | `PUBLICAR.md` |
| Entender qué hace el producto o cambiarlo | `SOLUCION.md` (es el documento que manda) |
| Saber cómo se construyó, capa a capa | `PLAN.md` (histórico: ya está todo construido) |
| Cambiar el diseño | `diseno/README.md` y `PROMPT-CLAUDE-DESIGN.md` |
| Retomar el proyecto otro día | `EMPEZAR-AQUI.md` |

---

## CON QUÉ ESTÁ HECHO

| Pieza | Para qué sirve |
|---|---|
| **Next.js 16 y React 19** | La web: todas las pantallas y el servidor que hay detrás. |
| **Supabase (Postgres)** | La base de datos, en París (Unión Europea). Se usa como una base de datos Postgres normal, conectada con `DATABASE_URL`. Las políticas de la base de datos deciden quién ve cada fila. |
| **Claude (Anthropic)** | La inteligencia artificial: contesta, crea el material y corrige. Modelos por defecto en `src/servidor/ia/modelos.ts`, cambiables con `MODELO_PRINCIPAL` y `MODELO_RAPIDO`. |
| **Voyage AI** (opcional) | La búsqueda por significado en el temario. Sin ella, busca solo por palabras y ya acierta la página en 46 de 50 dudas típicas. |
| **Resend** | Los correos: el enlace para entrar, invitaciones y avisos. |
| **Vercel** | Publica la web, la ejecuta en París para que esté al lado de la base de datos y lanza cada mañana la tarea de los avisos (`vercel.json`). |
| **GitHub** | La copia del proyecto en internet, con todo su historial. |
| **Playwright** | El robot de pruebas: abre la web de verdad y comprueba que funciona (`npm run pruebas`). |

Funciona igual en un Mac, en Windows o en un servidor. Lo que hace falta
instalar está en el paso 0 de `INSTALAR.md`.

### El mapa del proyecto

| Carpeta o archivo | Qué hay |
|---|---|
| `academias/` | Una carpeta por academia: su configuración, su logo y su icono |
| `src/` | El código de la app |
| `db/migraciones/` | La estructura de la base de datos, en orden |
| `scripts/` | Las órdenes de mantenimiento (ver abajo) |
| `pruebas/` | Las pruebas del robot |
| `datos-de-prueba/` | Temario del BOE, alumnos inventados y las 50 dudas típicas |
| `diseno/` | El diseño de partida, hecho en Claude Design |
| `docs/pantallas/` | Todas las pantallas en capturas, para enseñar el producto |

### Las órdenes que se usan

| Orden | Qué hace |
|---|---|
| `npm run dev` | Arranca la app en el ordenador, en http://localhost:3000 |
| `npm run db:migrar` | Prepara la base de datos (se puede repetir sin miedo) |
| `npm run db:datos-prueba` | Carga la academia de ejemplo: personas inventadas y temario |
| `npm run alta:academia -- --nombre "…" --correo …` | Da de alta una academia de verdad y su dirección |
| `npm run comprobar:configuracion` | Revisa el archivo de configuración de la academia |
| `npm run comprobar:marca` | Comprueba que no queda el nombre de otra academia en el código |
| `npm run prueba:50-dudas -- --correo …` | Prueba las 50 dudas típicas con la IA de verdad (unos 2 €) |
| `npm run temario:huellas` | Completa la búsqueda por significado del temario ya subido |
| `npm run pruebas` | Lanza el robot de pruebas contra la app arrancada |

---

## CÓMO SE TRABAJA AQUÍ

- **Primero se escribe qué se va a construir, después se construye.** Cualquier
  cambio del producto se apunta antes en `SOLUCION.md`.
- **Nada se da por bueno hasta que se ve funcionando en el navegador.** Ni
  «debería funcionar», ni «está conectado»: se abre y se mira.
- **Nada de una academia concreta en el código.** Si algo cambia de una academia
  a otra, va a su `configuracion.jsonc`.
- **Antes de entregar a una academia se pasa una revisión de seguridad.**

---

## QUÉ NO SE TOCA NUNCA

- **Las claves y contraseñas no se suben a internet jamás.** Van en
  `.env.local`, que está excluido del cuaderno de cambios, y en los ajustes
  privados de Vercel.
- **No se borran datos de alumnos ni de academias sin permiso escrito.**
- **No se trabaja directamente sobre la web que usa una academia.** Los cambios
  se prueban aparte y se pasan cuando están comprobados.
- **`MODO_PRUEBAS` e `IA_SIMULADA` nunca se encienden en la web de una
  academia.**
- **No se borra la carpeta oculta `.git`.** Ahí vive todo el historial del
  proyecto y no se puede recuperar.
