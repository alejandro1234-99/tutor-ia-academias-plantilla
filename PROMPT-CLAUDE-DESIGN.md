# Prompt para Claude Design

**Cómo usarlo:**

1. Busca dos o tres capturas de webs que te gusten (saaspo.com para el panel
   de la academia, awwwards.com para lo que ve el alumno) y guárdalas en
   `referencias/` (lee `referencias/README.md`).
2. En Claude Design, adjunta esas capturas.
3. Copia **todo lo que hay entre las dos líneas de corte** y pégalo.
4. Cuando apruebes la primera ronda, pega los mensajes de las rondas 2, 3 y 4
   que están al final de este archivo, de uno en uno.

✂ ─────────────────────────── cortar desde aquí ───────────────────────────

# Diseño de un asistente de estudio con IA para academias de oposiciones

Eres el diseñador de producto. Necesito que diseñes todas las pantallas de una
app web. Todavía no hay nada construido: tu diseño será la guía para
construirla. Todo en **español de España**.

## 1. Qué es, en pocas líneas

Un asistente de estudio con IA que montamos a medida para cada **academia de
oposiciones**, con el temario y la marca de esa academia. Los alumnos le
preguntan dudas a cualquier hora y el asistente **responde solo con el temario
de su academia, citando siempre el tema y la página**. También crean su propio
material de estudio (resúmenes, esquemas, presentaciones, tarjetas y tests) y
lo tienen todo guardado y ordenado. La academia ve qué no se entiende y qué
alumnos se están descolgando, **pero nunca lo que pregunta un alumno concreto**.

**Quién lo usa:**

- **El alumno**, un opositor que estudia 3 o 4 horas al día durante meses,
  casi siempre desde el móvil y muchas veces de noche. Necesita calma,
  confianza y poder leer mucho rato sin cansarse.
- **El formador** (el profesor), que sube el temario, da de alta a los alumnos,
  prepara material para clase y contesta las dudas que el asistente no supo
  resolver.
- **El dueño de la academia**, que mira los datos de toda la academia y
  gestiona su equipo. Puede ser a la vez formador.
- **Nosotros, el equipo técnico**, con un panel pequeño de soporte.

## 2. Lo que te pido en esta primera ronda

Vamos por rondas. **En esta primera ronda, solo esto:**

1. **El sistema visual:** colores, tipografía, espaciado, botones, campos,
   pestañas, avisos, la «cita» del temario y el menú. En modo oscuro y claro.
2. **La prueba de marca blanca:** la misma pantalla del chat vestida con las
   dos academias de ejemplo (sección 4), para ver que cambiar de academia es
   cambiar solo los colores, el logo y el nombre del asistente.
3. **Cinco pantallas clave del alumno, en móvil (390 px de ancho) y en
   ordenador (1440 px):**
   - A3 · Preguntar (el chat), con una conversación de ejemplo con citas.
   - A4 · Visor del temario.
   - A6 · Crear material.
   - A11 · Mi biblioteca, llena y vacía.
   - A9 y A10 · Hacer un test y ver el resultado.

Las demás pantallas vienen en las rondas siguientes, pero te las describo todas
abajo para que el sistema visual sirva para todas desde el principio.

## 3. Dirección visual

**Referencia:** te adjunto dos capturas de obsidian.md. No se copia la web. Se
coge su carácter:

- Fondo **casi negro** (`#08080A`) y texto **blanco roto y cálido**
  (`#E7E5E4`). Nunca blanco puro sobre negro puro.
- **Muchísimo aire.** El espacio vacío es el protagonista.
- **Titulares con serif fino** (Instrument Serif, de Google Fonts) y **texto
  normal en Inter**.
- **Listas como filas separadas por una línea fina de 1 px**, no como tarjetas
  con sombra.
- **Botones en forma de pastilla**, con los bordes completamente redondeados.
- **Casi monocromo.** El color se reserva para lo importante.

**La diferencia con la referencia:** en Obsidian se leen tres frases; aquí un
opositor lee tres horas al día durante nueve meses. Por eso:

- **Las zonas de lectura larga** (respuestas del chat, resúmenes, visor del
  temario) van en **Inter, a 17 px como mínimo en móvil, con interlineado
  amplio**, nunca en serif fino.
- **Hay modo claro** (fondo `#FBFAF8`, texto `#16160F`), que el alumno elige.
  Diseña las dos versiones.
- **Contraste suficiente** para leer sin esfuerzo: como mínimo el nivel AA de
  las normas de accesibilidad en todo el texto.

**El color de la academia:** cada academia tiene dos colores, el principal y el
de acento. Úsalos como **variables**, no fijos: botones principales, enlaces,
la cita, el elemento activo del menú y los gráficos. Todo lo demás, neutro.
**Cuidado:** algunos colores de marca se leen mal sobre fondo negro (el azul
petróleo) o sobre fondo blanco (el amarillo). Propón cómo se ajusta cada color
a cada modo para que se lea bien, sin dejar de ser reconocible.

**Solo nuestra marca, discreta:** un «Funciona con [nuestra marca]» pequeño al
pie. Nada más nuestro a la vista del alumno.

## 4. Las dos academias de ejemplo

Diseña con datos inventados, **nunca con una academia real**.

| | Academia Temario Claro | Academia Vanguardia |
|---|---|---|
| Oposición | Auxiliar Administrativo del Estado | Policía Nacional |
| Nombre del asistente | **Clara** | **Vega** |
| Color principal | Azul petróleo `#0F4C5C` | Azul marino `#1B2A4A` |
| Color de acento | Amarillo `#F2C14E` | Rojo `#C8102E` |
| Logo | Invéntate uno sencillo, tipográfico | Invéntate uno sencillo, tipográfico |
| Dirección web | estudio.temarioclaro.es | estudio.academiavanguardia.es |

**Todas las pantallas se diseñan con Temario Claro.** Vanguardia solo sirve
para demostrar la marca blanca.

**Temario de Temario Claro:**

- Tema 1 · La Constitución Española de 1978.
- Tema 2 · Ley 39/2015, del Procedimiento Administrativo Común.
- Tema 3 · Ley 40/2015, de Régimen Jurídico del Sector Público.

**Equipo:** una dueña (Elena Robles), un formador (Andrés Molina), dos grupos
(«Mañanas» y «Tardes») y diez alumnos. Dos llevan más de 7 días sin entrar:
Pablo Serrano (9 días) y Marta Gil (12 días). La alumna de los ejemplos se
llama **Lucía**.

## 5. Reglas de contenido

- **Textos reales, nunca «Lorem ipsum».** Usa contenido verdadero del temario.
  Por ejemplo:
  - *Moción de censura:* la propone al menos una décima parte de los Diputados,
    incluye un candidato a la Presidencia del Gobierno y se aprueba por mayoría
    absoluta del Congreso (Constitución, art. 113).
  - *Silencio administrativo en procedimientos iniciados a solicitud del
    interesado* (Ley 39/2015, art. 24).
  - *Plazo del recurso de alzada:* un mes si el acto es expreso (Ley 39/2015,
    art. 122).
- **Los números de página son inventados** (es una maqueta), pero tienen que
  parecer reales.
- **Tono:** cercano y de tú, directo, sin paternalismo («¡Muy buena
  pregunta!» nunca). Primero la respuesta, después el detalle.
- **Nada de jerga técnica** en ningún texto de la interfaz. Nunca «error 500»,
  «token» ni «sesión expirada»: siempre una frase normal que dice qué ha
  pasado y qué hacer.

## 6. Piezas que se repiten (diséñalas con cuidado)

- **La cita del temario.** Es la pieza más importante del producto, porque es
  lo que hace que el alumno se fíe. Va debajo de cada afirmación o bloque:
  `↳ Tema 1 · Constitución Española · art. 113 · página 23`. Se puede pulsar,
  y al pulsarla abre esa página. Tiene una variante para las notas del
  formador: `↳ Nota del formador · Tema 2 · 3 oct 2026`.
- **La respuesta del asistente**, con tres botones pequeños debajo: «Me
  sirvió», «No me sirvió» y «Avisar de un error».
- **La respuesta del formador** dentro del chat, claramente distinta de la del
  asistente: «Respuesta de tu formador».
- **El selector de modo del chat:** Resolver dudas · Aprendizaje guiado ·
  Examinador.
- **El aviso fijo de IA**, bajo el chat: «Clara es un asistente con
  inteligencia artificial. Comprueba siempre la cita».
- **El contador de uso**, discreto: «Te quedan 18 preguntas hoy».
- **El aviso de límite alcanzado:** «Has usado tus 25 preguntas de hoy. Mañana
  a las 00:00 vuelves a tener 25. Mientras, puedes repasar tus tarjetas».
- **La etiqueta «Temario actualizado»** en un material antiguo, con el botón
  «Volver a crear».
- **La tarjeta de repaso**, que se gira al tocarla.
- **La pregunta de test** de 4 opciones, cómoda de pulsar con el pulgar.
- **La barra de progreso** de «Creando tu material…» con lo que está haciendo.
- **El bloque de métrica con pocos datos:** «Faltan alumnos para mostrar este
  dato sin identificar a nadie».
- **La barra de consumo**, que se pone amarilla al 80 % y roja al 100 %.
- **La banda de modo soporte**, fija arriba y roja: «Modo soporte · solo
  lectura».
- **El selector de papel**, para quien es dueño y formador a la vez.

## 7. Estados que toda pantalla tiene que tener

- **Vacía la primera vez:** nunca un hueco en blanco. Siempre una frase que
  explica qué va a aparecer ahí y un botón con el siguiente paso. Te digo el
  texto de cada una en la lista de pantallas.
- **Cargando.**
- **Algo ha fallado:** mensaje claro y botón «Reintentar». Si el fallo es
  nuestro, la frase dice «no se ha gastado ninguna pregunta».
- **Sin conexión:** «Sin conexión. Tu mensaje se enviará al volver».

## 8. Cómo se navega

- **Alumno (móvil primero):** barra inferior con 5 secciones: Preguntar ·
  Crear · Biblioteca · Repasar · Progreso. Arriba, el logo de la academia y un
  icono de perfil que lleva a «Lo que sé de ti» y «Mi cuenta». En ordenador,
  el menú pasa a una columna a la izquierda.
- **Formador y dueño:** trabajan más en el ordenador (suben PDF y miran
  tablas), pero todo tiene que funcionar en el móvil. Menú lateral en
  ordenador y menú desplegable en móvil.
  - Formador: Temario · Alumnos · Material para clase · Dudas · Métricas ·
    Ayuda.
  - Dueño: Métricas · Equipo · Oposiciones y grupos · Consumo · Ayuda. Si
    también es formador, ve además la parte del formador y cambia de una a
    otra con el selector de papel.
- **Equipo técnico:** tres pantallas sencillas, sin la marca de la academia.

## 9. Todas las pantallas

### Comunes

| # | Pantalla | Qué se ve | Vacía la primera vez |
|---|---|---|---|
| C1 | **Entrar** | Logo de la academia, un campo para el correo y el botón «Enviarme el enlace». No hay contraseña | — |
| C2 | **Revisa tu correo** | «Te hemos enviado un enlace a lucia@…». Botón para reenviar, activo a los 60 segundos | — |
| C3 | **Enlace caducado** | «Este enlace ya no sirve. Pide uno nuevo» y el botón | — |
| C4 | **Textos legales** | Aviso de privacidad y condiciones, con los datos de la academia. Pensado para leer | — |
| C5 | **Algo ha fallado** | Mensaje claro, «Reintentar» y «Volver al inicio» | — |
| C6 | **Servicio pausado** | «El servicio está pausado. Habla con tu academia» | — |

### Parte 1 · El alumno

| # | Pantalla | Qué se ve | Vacía la primera vez |
|---|---|---|---|
| A1 | **Privacidad y aviso de IA** (solo la primera vez) | En cinco líneas: **lo que ve tu academia** (cuándo entras y datos de todos sumados, sin nombres) y **lo que no ve nunca** (lo que preguntas, tus notas de test ni lo que Clara sabe de ti). Aviso de que habla con una IA. Casilla «Tengo 14 años o más, o permiso de mis padres». Botón «Entendido» | — |
| A2 | **Perfil de un minuto** (solo la primera vez) | Cinco preguntas, una por pantalla, con barra de avance: cómo quieres que te llame · qué oposición preparas (ya marcada) · ¿primera vez o repites? · horas de estudio al día · qué te cuesta más: arrancar, memorizar leyes, entender textos técnicos o los nervios del examen | — |
| A3 | **Preguntar (chat)** | Selector de modo arriba. Conversación con citas bajo cada respuesta, botones de valorar y de avisar. Campo para escribir. Aviso fijo de IA. Contador de preguntas. Acceso a «Mis conversaciones». **Muestra también** una respuesta de «no está en el temario»: «Eso no aparece en el temario de tu academia, así que no te lo puedo contestar con seguridad. ¿Quieres que se lo pase a tu formador? Verá tu pregunta, pero no tu nombre», con botones Sí / No | Saludo de Clara con el nombre del alumno y tres preguntas de ejemplo de su temario, para pulsar |
| A4 | **Visor del temario** | La página citada, con el trozo usado resaltado. Flechas para ver la anterior y la siguiente. Cerrar. **Sin botón de descargar ni de imprimir** | — |
| A5 | **Mis conversaciones** | Lista por fecha con título y primera línea. Buscador. Renombrar y borrar | «Aún no tienes conversaciones. Tu primera pregunta aparecerá aquí» y botón «Preguntar» |
| A6 | **Crear material** | Paso 1: elegir tema o temas (hasta 3). Paso 2: formato (resumen, esquema, presentación, tarjetas, test, simulacro). Paso 3: las opciones de ese formato (ver sección 10). Botón «Crear». Contador «Te quedan 14 materiales este mes» | Los temas de su oposición, listos para elegir |
| A7 | **Creando…** | Barra de progreso con lo que está haciendo («Leyendo el tema 2…», «Escribiendo…»). «Puedes salir: te lo guardamos en tu biblioteca» | — |
| A8 | **Ver material** | El material con sus citas que se pueden pulsar. Botones: Descargar PDF, Renombrar, Mover a carpeta, Volver a generar. Etiqueta «Temario actualizado» cuando toque | — |
| A9 | **Hacer test o simulacro** | Una pregunta por pantalla, 4 opciones, avance («7 de 20»). En simulacro: reloj visible y opción «Dejar en blanco» | — |
| A10 | **Resultado del test** | Nota grande. En simulacro, con y sin penalización («6,33 con penalización · 7 sin penalización»). Cada pregunta con la respuesta correcta, su justificación y su cita. Botón «Repasar mis fallos». Nota pequeña: «Esta nota solo la ves tú» | — |
| A11 | **Mi biblioteca** | Pestañas: Resúmenes · Esquemas · Presentaciones · Tarjetas · Tests · **De mi academia**. Filtro por tema, buscador y carpetas propias. Cada material con su tipo, su tema, su fecha y la etiqueta «Temario actualizado» si toca | «Tu biblioteca está vacía. Todo lo que crees se guarda aquí solo» y botón «Crear mi primer material». En «De mi academia»: «Tu formador aún no ha compartido material» |
| A12 | **Repasar hoy** | «Hoy te tocan 24 tarjetas». Tarjeta que se gira. Botones «La sabía» / «No la sabía». Después, las preguntas que falló en los tests. Al terminar: «Mañana te tocan 11» | «Hoy no tienes nada que repasar. Crea tarjetas o haz un test y aquí aparecerá lo que te toca» |
| A13 | **Mi progreso** | Racha de días seguidos, tests hechos, gráfica de cómo evoluciona la nota, temas flojos y temas fuertes. «Solo lo ves tú» | «Haz tu primer test y aquí verás cómo avanzas». Racha en 1 el primer día |
| A14 | **Lo que sé de ti** | Explicación de una línea: «Son notas que Clara toma para ayudarte, como un profesor particular. Puedes corregirlas y borrarlas». Su perfil y la lista de notas en frases normales («Confundes la moción de censura con la cuestión de confianza»). Corregir y borrar en cada una. «Borrar todo» | Solo el perfil y «Iré apuntando lo que te cuesta y lo que dominas a medida que estudiemos» |
| A15 | **Mi cuenta** | Recordatorio por correo (sí/no), modo claro u oscuro, Descargar mi biblioteca, Ver o borrar mis datos, correo de la academia para pedir ayuda, Cerrar sesión | — |

### Parte 2 · El formador

| # | Pantalla | Qué se ve | Vacía la primera vez |
|---|---|---|---|
| F1 | **Temario** | Por oposición, lista de temas: nombre, páginas, versión, fecha de actualización y quién la subió. Botones «Subir tema» y «Sustituir». Historial de versiones | «Aún no hay temario. Sube el PDF del primer tema para que Clara pueda empezar a contestar» y botón. Aviso arriba: «Clara no contestará hasta que haya temario» |
| F2 | **Subir o sustituir tema** | Elegir oposición y tema, arrastrar el PDF. Progreso del procesado («unos minutos, te avisamos al terminar»). Aviso si está escaneado: «Este PDF parece escaneado y Clara no podrá leerlo. Súbelo en versión con texto». Aviso si pasa de 50 MB | — |
| F3 | **Alumnos** | Tabla por grupo: nombre, correo, grupo, último acceso, invitación aceptada o no. Botones: Invitar, Cambiar de grupo, Dar de baja, Reenviar invitación. **No hay ninguna columna de notas, preguntas ni progreso individual** | «Aún no hay alumnos. Invítalos uno a uno o sube una lista», con los dos botones y «Descargar plantilla de lista» |
| F4 | **Invitar alumnos** | Formulario de uno (nombre, correo, grupo) o subida de lista. Vista previa de la lista con las filas con error en rojo y por qué, **antes** de enviar | — |
| F5 | **Material para clase** | Crear igual que el alumno + elegir con qué grupos compartirlo. Lista de lo compartido, con «Dejar de compartir» | «Aún no has compartido material. Lo que compartas aparecerá a tus alumnos en "De mi academia"» |
| F6 | **Dudas** | Bandeja con pestañas y número de pendientes: **Sin respuesta** · **Errores avisados** · **No le sirvió**. Cada aviso: la pregunta, la respuesta del asistente, el tema y la fecha. **Nunca el nombre del alumno** | «No hay dudas pendientes. Cuando Clara no sepa algo o un alumno avise de un error, aparecerá aquí» |
| F7 | **Contestar duda** | La pregunta, la respuesta de Clara y el tema. Campo para contestar. Casilla «Guardar también como nota del formador en este tema: Clara la usará a partir de ahora». Botones «Enviar al alumno» y «Marcar como resuelta sin contestar» | — |
| F8 | **Ayuda** | Preguntas frecuentes y formulario para escribir al equipo técnico. «Respondemos en menos de 24 horas laborables» | — |

### Parte 3 · Métricas (formador y dueño)

Arriba en todas: filtro de periodo (7 · 30 · 90 días) y, **solo para el
dueño**, filtros de oposición, grupo y formador. Botón «Exportar a Excel». El
formador solo ve sus grupos; el dueño, toda la academia. **Todo son datos
sumados de varios alumnos**, excepto la lista de alumnos en riesgo.

| # | Pantalla | Qué se ve | Vacía la primera vez |
|---|---|---|---|
| M1 | **Uso** | Alumnos activos, preguntas hechas, material creado (con su evolución) y un mapa de **a qué horas estudian** (días de la semana × horas) | «Aún no hay actividad. Los datos aparecerán en cuanto tus alumnos empiecen a usar a Clara» |
| M2 | **Dudas y atascos** | **Dudas más frecuentes** por tema y semana, redactadas como asunto, nunca como frase literal de un alumno («Plazos del recurso de alzada · 23 dudas de 11 alumnos»). **Dónde se atascan:** temas ordenados por dudas y fallos en test. **Lo que falta en el temario:** lo que Clara no supo responder («Ley 19/2013 de Transparencia · 8 dudas») | Igual que M1. Bloques con menos de 5 alumnos: «Faltan alumnos para mostrar este dato sin identificar a nadie» |
| M3 | **Alumnos en riesgo** | Los que llevan 7 días o más sin entrar: nombre, grupo, días sin entrar. Es el único sitio con nombres, porque solo dice quién entra y cuándo | «Ningún alumno lleva más de 7 días sin entrar» |
| M4 | **Progreso del grupo** | Nota media de los tests por grupo y temas fuertes y flojos del grupo. Nunca por alumno | «Aún no hay tests suficientes para mostrar el progreso del grupo» |
| M5 | **Material** | Formatos más creados y peor valorados | «Aún no se ha creado material» |

### Ajustes de la academia (solo el dueño)

| # | Pantalla | Qué se ve | Vacía la primera vez |
|---|---|---|---|
| D1 | **Equipo** | Formadores con los grupos que lleva cada uno. Invitar, asignar grupos, quitar. Marcarse también como formador | Solo la dueña: «Invita a tus formadores para que suban el temario y den de alta a los alumnos» |
| D2 | **Oposiciones y grupos** | Cada oposición con su regla de simulacro (cuánto resta un fallo, tiempo por pregunta), editable. Sus grupos, con número de alumnos y formadores. Crear, renombrar y archivar grupos | Las oposiciones sin grupos: «Crea tu primer grupo» |
| D3 | **Consumo** | Barras del mes: preguntas (2.140 de 5.000) y materiales (180 de 500) de toda la academia. Alumnos (43 de 50 incluidos). Registro de las veces que el equipo técnico ha entrado en modo soporte | Barras a cero |
| D4 | **Ayuda** | Igual que F8 | — |

**La marca no se cambia desde aquí**: no diseñes ninguna pantalla para cambiar
el logo ni los colores.

### Panel del equipo técnico (sin la marca de la academia)

| # | Pantalla | Qué se ve |
|---|---|---|
| X1 | **Coste y uso** | Coste de IA del mes en euros (preguntas y material), uso frente a límites y errores recientes |
| X2 | **Modo soporte** | Botón «Entrar como la dueña, solo lectura» y registro de entradas. Muestra también cómo se ve la app de la academia con la banda roja fija de «Modo soporte · solo lectura» |
| X3 | **Límites y cuentas** | Cambiar los límites de la academia o de un alumno. Dar de baja cuentas |

## 10. El material que crea la IA

Cada formato tiene su propio aspecto, siempre con citas y con la marca de la
academia (también en el PDF descargado).

| Formato | Opciones | Cómo se ve |
|---|---|---|
| **Resumen** | Estilo: en esquema, **Cornell** o ejecutivo | *En esquema:* puntos y subpuntos, lo que hay que memorizar en negrita. *Cornell:* página en tres zonas (preguntas clave a la izquierda, notas a la derecha y resumen abajo). *Ejecutivo:* una página de texto corto por apartados |
| **Esquema** | — | Mapa en forma de árbol que se abre y se cierra, de lo general a lo concreto, cada rama con su cita |
| **Presentación** | 10 a 20 diapositivas | Diapositivas con los colores y el logo de la academia: título, 3 a 5 ideas y la cita al pie. Descarga en PDF |
| **Tarjetas de repaso** | Número (20 a 60) y **modo literal** (solo artículos, plazos, fechas y leyes) | Pregunta delante, respuesta y cita detrás. En modo literal, el dato exacto muy destacado |
| **Test de práctica** | Número (10, 20, 30 o 50) y dificultad: fácil, medio o **nivel oposición** | Pantallas A9 y A10 |
| **Simulacro** | Número de preguntas y tiempo | Como el test, con reloj y con penalización: cada fallo resta un tercio. Las preguntas en blanco no restan |

Todo material se puede **volver a generar** si no convence.

## 11. Reglas que el diseño no puede romper

1. **Ninguna pantalla del formador ni del dueño muestra lo que pregunta un
   alumno concreto, su nota ni su memoria.** Ni en una tabla, ni en un detalle,
   ni al pasar el ratón por encima.
2. **Toda respuesta y todo material llevan su cita.** No diseñes ninguna
   respuesta sin cita, salvo la de «no está en el temario».
3. **El temario no se descarga.** El visor no tiene botón de descargar ni de
   imprimir.
4. **La marca que se ve es la de la academia**, nunca la nuestra (salvo el pie
   discreto).
5. **Siempre queda claro que es una IA.**

## 12. Lo que NO hay que diseñar

- Registro de academias ni página de venta.
- Pagos, precios ni planes dentro de la app.
- Pantalla para cambiar la marca.
- Chat entre alumnos, foros o videollamadas.
- Planificador o calendario de estudio.
- Exámenes oficiales de años anteriores.
- Otros idiomas (todo en español, pero sin textos metidos dentro de imágenes,
  para poder traducirlo más adelante).

## 13. Cómo quiero que me lo entregues

- Cada pantalla con su **número** (A3, F6…) y su nombre, para poder hablar de
  ellas sin confusión.
- En móvil (390 px) y ordenador (1440 px).
- Los estados vacíos junto a su pantalla llena.
- Una hoja del sistema visual con los colores como variables (neutros + los
  dos de la academia), la tipografía con sus tamaños, el espaciado y las
  piezas de la sección 6.
- Si algo de este encargo te parece mal resuelto para el usuario, dímelo y
  propón una alternativa, pero **no la apliques sin preguntarme**.

✂ ─────────────────────────── cortar hasta aquí ───────────────────────────

---

## Mensajes para las rondas siguientes

Pégalos de uno en uno, cuando hayas aprobado la ronda anterior.

**Ronda 2 · El resto del alumno**

> Aprobado el sistema visual y las pantallas clave. Ahora diseña el resto de la
> parte del alumno, en móvil y ordenador, con sus estados vacíos: A1, A2, A5,
> A7, A8 (un ejemplo de cada formato de la sección 10), A12, A13, A14 y A15.
> Incluye también el aviso de límite alcanzado dentro del chat y de Crear
> material.

**Ronda 3 · Formador y métricas**

> Ahora la parte del formador y las métricas, con el mismo sistema visual:
> F1 a F8 y M1 a M5. Primero en ordenador y después cómo se adapta al móvil.
> Enséñame las métricas dos veces: vistas por el formador (solo su grupo
> «Mañanas») y por la dueña (toda la academia, con sus filtros). Incluye en M2
> un bloque con el aviso de «Faltan alumnos para mostrar este dato».

**Ronda 4 · Dueño, equipo técnico y pantallas comunes**

> Por último: D1 a D4, X1 a X3 y C1 a C6. Incluye el selector de papel para
> quien es dueño y formador a la vez, la banda de modo soporte, y los estados
> de error y sin conexión aplicados al chat. Cierra con una hoja resumen de
> todas las pantallas numeradas.
