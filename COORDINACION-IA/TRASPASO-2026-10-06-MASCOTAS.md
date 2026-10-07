# Traspaso 2026-10-06: mascotas virtuales (rama `feature/mascotas`)

Para la cuenta de Claude que retome. Lee este archivo entero y después `disenos-ui/mascotas/DECISIONES.md`, que tiene todas las decisiones de Inty y las cifras.
Nada de esto está en `main` ni en la app. Son diseños y prototipos para aprobar.

## 1) Qué es
Mascota tipo Pou: el usuario la adopta de cría, la alimenta y la cuida, y crece según lo que pedalea. Tiene **sección propia** y además **acompaña** a Pistero en el viaje, en el canasto o corriendo al lado. Inty pidió que sea **ultra tierna**, que **nunca muera** y que **el descuido se note**.

## 2) Páginas para mostrarle a Inty (artifacts privados de su cuenta)
| Qué | Enlace | Fuente |
|---|---|---|
| Referencias reales (fotos de los animales y apps del rubro) | https://claude.ai/artifact/XawF6aucQVpwD7gsAajHhw | `referencias.src.html` + `ref/` |
| Galería de las 42 imágenes | https://claude.ai/artifact/PAqhhvDHFbZMJNNv9cUmpR | `galeria.src.html` + `galeria-img/` |
| Prototipo de la lógica (pudú jugable + simulador de días) | https://claude.ai/artifact/Mc6BYH7B4JqaGKi1VpWQ4o | `prototipo.src.html` |
| Mockup en viaje con el Pistero real (corre al lado o va en el canasto) | https://claude.ai/artifact/39CfGQpZNdb8NkiY6zTbs2 | `mockup-viaje.src.html` (se arma con `node herramientas/armar-mockup.js` desde `disenos-ui/mascotas/`) |

Las páginas `.html` publicadas llevan las imágenes en base64 y se arman desde los `.src.html`: en el `.src` se reemplaza `{{IMG}}` (y en el mockup también `{{SCRIPTS}}`). Para republicar en la misma URL, pasa la URL como `url` a la herramienta Artifact.

## 3) Estado
- **Animales:** pudú, zorro culpeo, huillín, ranita de Darwin, güiña y Yorkshire. Todos en estilo 3D suave mate generado con Gemini, a partir de los rasgos reales del animal.
- **Aprobado por Inty:** el estilo (A, 3D suave), el pudú cría (`gemini/pudu-cria-v8-ojos-grandes.png`) y el pudú joven (`gemini/pudu-joven-v2.png`).
- **Hecho y pendiente de revisión:** de cada animal, cría, joven y adulto de frente; cría con hambre y descuidada; cría sentada (canasto) y corriendo. Del pudú hay un segundo cuadro del galope (`pudu-cria-corriendo2.png`).
- **Prototipo de lógica** (las cifras están en DECISIONES): ya probado con simulación. Se corrigió que crecía con el cariño en 0.
- **Mockup en viaje:** usa el `_pistBiciSVG` real. El pudú entra al canasto por el gancho `_bMascota` de `pistero-bici.js` (en el mockup se agrega `pudu` a `PIST_MASCOTA` y se envuelve `_bMascota`). Corriendo, alterna los 2 cuadros con saltito, inclinación y sombra, al ritmo de la velocidad.
- **Respuesta de Inty al mockup:** "no está mal", pero lo quiere más fluido y con más cosas que hacer (ver pendiente 0).

## 4) Pendientes (en orden)
0. **LO PRIMERO: movimiento.** Inty vio el mockup en viaje: "no está mal, pero hay que mejorar esos movimientos, que sea más fluido y que haga otras cosas, no quiero monotonía". Plan propuesto:
   - **Fluidez:** galope de 6 a 8 cuadros (Gemini, mismo chat y misma cámara; recortar y alinear por la base), con interpolación y velocidad variable (acelera, frena).
   - **Variedad:** un repertorio de acciones que aparecen al azar cada pocos segundos o ante eventos del viaje: saltito de alegría, mirar a Pistero, olfatear el camino, adelantarse y esperar, quedarse atrás y alcanzar, trotar lento en subida, detenerse al frenar, celebrar al llegar, asomarse en el canasto a mirar el paisaje y dormirse en el canasto si está cansado. Cada acción necesita sus propios cuadros.
   - **Hecho (2026-10-06, 2.ª cuenta):** panel de acciones para que Inty elija → https://claude.ai/artifact/TjWPRCuacaeGaULvXnXDTC (`acciones.src.html`). Siguiente: con su elección, arreglar el galope (dos vuelos) en el mockup y pedir a Gemini solo los cuadros de las acciones elegidas.
   - **Inty eligió las 14.** Hecho: motor orgánico en `mockup-viaje.src.html` (galope rotatorio de 4 cuadros con fundido corto, aceleración limitada, ruta automática con llano/bajada/subida/semáforo, una acción espontánea cada 8–15 s sin repetir, brote cada km, celebración cada 5 km, objetos del camino: tronco con musgo, chilco, brote). Publicado: https://claude.ai/artifact/WkxksRS8N8f5dg7pQG2DN7
   - **Arte completo del pudú cría (12 cuadros, PNG transparente desde los originales):** empuje, estirado, aterriza, recogido, sentado, olfatea, dospatas, ladra, come, mira, asoma, duerme. "Come" se hizo en un chat NUEVO de Gemini (https://gemini.google.com/app/dbf1d982f47df86e) con `olfatea` como referencia: el chat viejo rechazaba todo con "third-party content providers". Para adjuntar la referencia sin el selector de archivos: crear un `<input type=file>` propio en la página, cargarle el archivo con la herramienta file_upload de Claude in Chrome y disparar un evento `paste` con ese archivo en `rich-textarea .ql-editor`.
   - **Originales** (`originales/`): dospatas, mira, ladra (2752×1536, botón de Gemini) y duerme, empuje, aterriza, olfatea (1376×768, el tamaño real que genera Gemini; el botón entrega la misma imagen ampliada al doble). Sus PNG transparentes ya salen de ahí. Asoma también. Cómo bajarlas cuando Chrome no tiene foco (no recibe clics ni descargas automáticas): armar en la pestaña de Gemini un panel con las imágenes `…=s0-rj` (crear elementos con createElement: Gemini exige TrustedHTML) y que Inty haga clic derecho → Guardar imagen como. Llegan como `watermarked_img_*.jpg` en Descargas.
   - Los enlaces `rd-gg` de las imágenes vencen en minutos: tomar el `src` del chat justo antes de abrirlo.
   - `transparente.js` también vacía los huecos de fondo encerrados (entre las patas) y no infla el color de los píxeles casi transparentes.
   - Prompts que funcionan: "Edit my previous image of my original baby pudu character: keep everything identical (character, colors, camera, side view facing right, size, background) but change only the pose: …". Con "Same running baby pudu…" y con "standing up on its two hind legs… nibbling a leaf" Gemini respondió "third-party content providers"; funcionó "New pose based on real pudu behavior: it rears up on its hind hooves to reach high leaves…".
   - Captura desde Claude in Chrome: escribir con `document.execCommand('insertText')` en `rich-textarea .ql-editor` y clic en `button.send-button` (el teclado simulado no llega cuando Chrome no está al frente). La imagen: recargar el chat, abrir el `src` `googleusercontent` con `=s1024`, `screenshot` a escala 1 con `save_to_disk` (el `zoom` se cae por tiempo) y `sh herramientas/guardar.sh <archivo-blob.jpg> pudu-cria-<pose> pudu-<pose>`. Luego `transparente.js gemini/pudu-cria-<pose>.png transparentes/pudu-<pose>.png 800`. Ojo: la captura es JPG comprimido; para la app conviene bajar el original a resolución completa (pedirle OK a Inty para descargar).
   - Ladrido: no hay grabación libre del pudú (Commons solo tiene la pronunciación de la palabra; Freesound, nada). Queda mudo; no usar el de otro animal.
   - Antes de pedir el arte: referencias reales de animación de mascotas acompañantes (videos de pudú corriendo, juegos con mascota que sigue al jugador) y mostrarle a Inty la lista de acciones para que elija.
1. Que Inty revise el mockup en viaje, la galería y el prototipo. Anotar lo que apruebe en DECISIONES.
2. El galope final necesita de 4 a 6 cuadros por animal (ahora son 2, solo del pudú).
3. Arte que falta: joven y adulto sentados y corriendo (24 imágenes); hambre y descuido de joven y adulto si Inty los quiere; estado "durmiendo" y "contento" de cada animal.
4. Mockup de la sección "Mi mascota" dentro de la app real (junto a Pistero, en la barra de abajo) → OK de Inty → programar: guardado (Firestore, igual que Pistero), contar km y días reales desde los viajes, y el deterioro.
5. Integrar en la tienda del Taller: hoy `PIST_MASCOTA` tiene quiltro, perro negro y gato vectoriales. Decidir con Inty si las mascotas nuevas los reemplazan.

## 5) Cómo producir con Gemini (Claude in Chrome, cuenta de Inty)
- Chats, uno por animal (sigue en el mismo chat para mantener el personaje): pudú https://gemini.google.com/app/561d61dffa5c74ee · zorro …/9a757d23ff2664e3 · huillín …/d4692b115f4d37cc · ranita …/f5db212b7138b336 · güiña …/5095ab076b39ad68 · Yorkshire …/524c49bd6b6b8ee0
- Escribir los prompts en inglés y cortos. Pedir siempre "original … character" (si se nombra Pou, lo rechaza por derechos), "no accessories" (si no, le pone casco), "Plain navy blue background" y "same camera".
- Para la ternura: "HUGE eyes … sparkle highlights, set low", cabeza casi del tamaño del cuerpo y rubor. Para el descuido: pelo apelmazado, polvo y ojeras, pero "still an adorable baby, not old-looking" (si no, sale viejo y feo).
- **Cómo capturar la imagen:** después de generarla, recarga el chat (si no, la imagen es `blob:`). Toma el `src` `googleusercontent.com/gg…` de la última `model-response`, cambia el final por `=s1024`, haz `location.href` a esa URL en la misma pestaña y luego `zoom` a la imagen (`getBoundingClientRect`) con `save_to_disk`. Copia el archivo de `tool-results` a `gemini/`.
- La pestaña se traba si Chrome está minimizado (ventana de 0×0): pídele a Inty que la restaure. Una `screenshot` chica antes de leer el DOM "despierta" la pestaña.
- `fetch` desde Gemini hacia localhost está bloqueado. No uses el receptor.

## 6) Herramientas (`disenos-ui/mascotas/herramientas/`)
- `lamina.ps1`: arma `gemini/lamina-mascotas.png`; con `-Poses` arma `lamina-poses.png`.
- `armar-mockup.js`: arma `mockup-viaje.html` con los 4 scripts reales de Pistero y las imágenes.
- El fondo azul se quita en el navegador con relleno desde los bordes (`sinFondo` en el prototipo y el mockup). Los bordes quedan algo toscos: para la app conviene un recorte mejor.

## 7) Reglas de Inty que aplican (además de CLAUDE.md global)
Una pieza a la vez, mostrada y aprobada; si Inty dice "sigue de corrido", avanzar y mostrar el lote. Cada pieza basada en el animal real (nada genérico). Ultra tiernas. Verificar en grande y a tamaño de teléfono antes de mostrar. Nada a `main` sin su OK.
