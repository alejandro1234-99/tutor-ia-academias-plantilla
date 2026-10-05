# EMPEZAR AQUÍ

Léeme si no te acuerdas de nada. Si es la primera vez que abres el proyecto,
no empieces aquí: empieza por [INSTALAR.md](INSTALAR.md).

---

## 1. Cómo vuelvo a abrir este proyecto

Como si fuera la primera vez y no recordaras nada:

1. **Abre VS Code.**
2. **Abre la carpeta del proyecto.** Menú `Archivo` → `Abrir carpeta`, y elige
   la carpeta donde lo instalaste (por ejemplo, `Documentos/Proyectos/` y el
   nombre que le diste).
3. **Abre el panel de Claude.** Es el icono de Claude (la chispa) en la barra
   de iconos del borde izquierdo.
4. **Escríbele.** Ya está. Al abrir el proyecto, Claude lee `CLAUDE.md` solo, así
   que no hace falta repetirle cómo tiene que hablarte.

### Si quieres retomar la conversación de otro día

En el panel de Claude, arriba, hay un **icono de historial**. Púlsalo y elige la
conversación de la fecha que quieras. Se conservan, pero solo salen las de la
carpeta que tienes abierta.

---

## 2. Qué frase le escribo para retomar donde lo dejamos

Copia y pega esto tal cual:

> **Retomamos el proyecto. Lee CLAUDE.md y EMPEZAR-AQUI.md, dime en cinco
> líneas qué está montado y qué falta, y espera a que yo te diga el siguiente
> paso. Háblame según las normas de CLAUDE.md.**

Funciona incluso en una conversación nueva y en blanco.

### Y si te pierdes a mitad

Escribe solo: **`para`**

Claude tiene la orden de detenerse y resumirte en tres líneas dónde estáis, qué
está hecho y cuál es el siguiente paso.

---

## 3. Qué se guarda solo y qué tienes que guardar tú

### Se guarda solo (no tienes que hacer nada)

| Qué | Dónde |
|---|---|
| Las conversaciones con Claude | En el historial del panel |
| La copia del proyecto en internet | En GitHub, cada vez que se sube un cambio |
| La web publicada | En Vercel, se rehace sola en cada cambio |
| La base de datos | En Supabase, con copias de seguridad diarias (en los planes de pago) |

### Tienes que guardarlo TÚ (nadie más lo hace)

| Qué | Cómo |
|---|---|
| **Los archivos que edites a mano** | `Ctrl + S` (o `Cmd + S` en Mac) en VS Code. Si no guardas, Claude no ve tus cambios |
| **Las contraseñas de tus cuentas** | GitHub, Supabase, Vercel, Anthropic. En un gestor de contraseñas, no en un papel |
| **El archivo `.env.local`** | Es el único archivo importante que NO está en internet, a propósito. Si cambias de ordenador, se pierde. Guarda una copia en tu gestor de contraseñas |

---

## 4. Las direcciones que te importan

Apúntalas aquí cuando las tengas (Claude te las da durante la instalación):

| Qué | Dirección |
|---|---|
| **Tu web** | https://…vercel.app |
| **Tu código (privado)** | https://github.com/… |
| **Tu base de datos** | https://supabase.com/dashboard/project/… |

---

## 5. Cómo ver la app en tu ordenador

Antes de publicar nada, la app se prueba en tu ordenador, con personas
inventadas. Para verla:

1. **Pídele a Claude que la arranque:** «arranca la app en modo pruebas».
2. **Ábrela en tu navegador:** http://localhost:3000
3. **Entra como quien quieras.** Escribe uno de estos correos en la pantalla de
   entrar:
   - `diego@example.com` o `lucia@example.com`: alumnos.
   - `andres@example.com`: formador.
   - `elena@example.com`: dueña (y formadora).
   - `nerea@example.com`: alumna que entra por primera vez.
4. **Recoge el enlace para entrar** en el buzón de pruebas:
   http://localhost:3000/pruebas/buzon. Ahí salen todos los correos que la app
   habría enviado, porque en las pruebas no salen a internet.

En http://localhost:3000/pruebas hay un panel con interruptores para probar
cosas sin esperar días (hacer fallar la IA, dejar a un alumno sin preguntas,
adelantar su reloj…). Ese panel y el buzón **no existen** en la web de verdad.

---

## 6. Lo que NUNCA debes hacer

- **No borres la carpeta oculta `.git`.** Ahí vive todo el historial del
  proyecto. Si desaparece, no se recupera.
- **No pegues el contenido de `.env.local`** en un chat, un correo, un grupo de
  WhatsApp ni una captura de pantalla. Son las llaves de los datos de tus
  clientes.
- **No trabajes directamente sobre lo que está publicado.** Los cambios se
  prueban aparte primero.

Si crees que se te han escapado las claves: cámbialas. En Supabase, `Project
Settings` → `Database` → `Reset database password`; en Anthropic,
`console.anthropic.com` → `API Keys`, borras la vieja y creas otra. Después
pones las nuevas en `.env.local` y en Vercel. Ante la duda, **cambia primero y
pregunta después**.
