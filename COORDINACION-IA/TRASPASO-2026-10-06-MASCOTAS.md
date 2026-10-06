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
- **La última pregunta de Inty fue ver el movimiento de correr.** Todavía no responde sobre el mockup.

## 4) Pendientes (en orden)
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
