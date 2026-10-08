# Mascotas virtuales (tipo Pou) — decisiones de Inty

Panel de referencias: https://claude.ai/artifact/XawF6aucQVpwD7gsAajHhw (fuente: `referencias.src.html`, fotos en `ref/`).

## Qué es
Mascota que el usuario adopta de bebé, alimenta y cuida; crece según lo que pedalea (como Pou, con el crecimiento del compañero de Pokémon GO).

## Decidido (2026-10-06)
- Animales: pudú, zorro culpeo, huillín (nutria), ranita de Darwin, **güiña** (gato) y **Yorkshire terrier** (perro).
- Crece por **kilómetros y por días pedaleados** (las dos cosas).
- **Nunca muere**, pero el descuido **se tiene que notar** (deterioro visible: pelaje opaco, ojeras, decaído).
- Se parte por el **pudú**. Una mascota a la vez, mostrada y aprobada.
- Arte: Gemini (cuenta de Inty) a partir de fotos reales; Claude recorta, vectoriza o anima.

- Dónde vive: **sección propia** (cuidarla: comer, cariño, dormir) y además es **acompañante versátil**: va en la bici con Pistero (canasto) **o corriendo al lado** (el usuario elige). Por eso cada etapa necesita: de frente (su sección) + de perfil sentada (canasto) + de perfil corriendo (ciclo de carrera).

## Arte aprobado
- **Pudú cría ✅** (Inty, 2026-10-06: "queda"): `gemini/pudu-cria-v8-ojos-grandes.png`. Chat de Gemini del pudú: https://gemini.google.com/app/561d61dffa5c74ee (seguir ahí las etapas para que sea el mismo personaje).
- **Pudú joven ✅** (Inty: "queda"): `gemini/pudu-joven-v2.png`.
- Resto hecho "de corrido" (Inty: "sigue de corrido, ya tienes la pauta"), **pendiente de revisión de Inty**. Lámina: `gemini/lamina-mascotas.png` (se regenera con `herramientas/lamina.ps1`). Archivos `gemini/<animal>-{cria,joven,adulto,cria-hambre,cria-descuidado}.png`.
- Chats de Gemini por animal: zorro https://gemini.google.com/app/9a757d23ff2664e3 · huillín https://gemini.google.com/app/d4692b115f4d37cc · ranita https://gemini.google.com/app/f5db212b7138b336 · güiña https://gemini.google.com/app/5095ab076b39ad68 · Yorkshire https://gemini.google.com/app/524c49bd6b6b8ee0
- Poses de acompañante (crías), pendientes de revisión: `gemini/<animal>-cria-{sentado,corriendo}.png`, de perfil mirando a la DERECHA (sentido de avance de la bici). Lámina: `gemini/lamina-poses.png` (`lamina.ps1 -Poses`). El renacuajo no corre: "corriendo" = nadando en el aire con burbujitas.
- Datos reales usados: cría de ranita = renacuajo (el macho los cría en el saco vocal); pudú macho con cuernos cortos sin ramas (5–9 cm); Yorkshire nace negro y fuego y de adulto pasa a azul acero y dorado.
- Captura: abrir la URL `/gg/` de la imagen en la misma pestaña (`=s1024`) y hacer zoom 0,39–894,538 (1341×749). Si la imagen sale como `blob:`, recargar el chat. Una captura de pantalla "despierta" la pestaña oculta antes de leer el DOM.

## Prototipo de lógica (propuesta, pendiente de OK de Inty)
https://claude.ai/artifact/Mc6BYH7B4JqaGKi1VpWQ4o · fuente `prototipo.src.html` (se arma con las jpg de `galeria-img/`). Galería: https://claude.ai/artifact/PAqhhvDHFbZMJNNv9cUmpR
- Barras: pancita, cariño, energía (0–100, nunca bajo 0). Por día: pancita −20, cariño −15.
- Comida solo pedaleando (comida real del pudú): 1 brote/km (+10), helecho cada 5 km (+20), avellana si salida ≥10 km (+35 y +10 cariño).
- Crece por km Y días: joven 25 km + 5 días; adulto 120 km + 20 días. Km con hambre cuentan la mitad; para el salto necesita pancita y cariño ≥35 y no estar descuidado.
- Estados: hambre (pancita <35); descuidado (3 días sin pedalear, o pancita y cariño <15) → sucio hasta bañarlo.
- Acompañar: canasto −1 energía/km; corriendo −3/km y +1 cariño/km; con energía <15 se va al canasto. Dormir = 100 al día siguiente. Caricias: máx. 5/día (+8).
- Falta arte: hambre/descuidado de joven y adulto, durmiendo.

## Pendiente de decidir
- **Regla de Inty:** "el impacto visual aquí es muy importante": deben ser **ultra tiernas y adorables** (esquema bebé: cabeza casi del tamaño del cuerpo, ojos grandes y bajos con brillos, mejillas con rubor, hocico chico, patas cortas y gorditas), sin perder los rasgos reales del animal.
- (resuelto) Estilo: **A, figura 3D suave mate** (Inty, 2026-10-06), para todas.
- Etapas exactas y cifras (km/días por etapa).

## Prompts del pudú (cortos: Gemini falla con prompts largos)
1. Cría, estilo A: `Baby pudu deer (Pudu puda, from southern Chile) as a cute virtual pet, like the Pou game. Newborn: reddish-brown fur, rows of small white spots on its back, big round ears, short legs, no antlers. Full body, sitting, facing the viewer. Soft 3D vinyl toy render. Plain navy blue background. No text.`
2. Cría, estilo B: mismo texto cambiando el estilo por `Flat 2D vector illustration, thick soft outlines, simple shapes.`
3. Con el estilo elegido: joven (manchas casi borradas) y adulto (sin manchas; macho con cuernos cortos y rectos).
4. Deterioro (misma pose y cámara): sano · con hambre · triste · descuidado (pelaje opaco y desordenado, ojeras, orejas caídas).

Lecciones con Gemini (chat de mascotas: https://gemini.google.com/app/0e72d9e974a918f9):
- Nombrar "Pou" (u otro juego) → rechaza por derechos de terceros. Decir "original virtual pet".
- Si no se prohíbe, le pone casco y pañuelo: pedir siempre "no accessories".
- Sin describir la anatomía real dibuja un cervatillo genérico de orejas enormes; con "realista" sale con cara de carpincho. Lo que funcionó (v3): rasgos reales del pudú + "bigger head, big glossy eyes" + de pie.
- Descarga: el canvas → localhost falla (Chrome bloquea red local); se guarda con zoom + save_to_disk (1062×593).

Datos reales: la cría nace con manchas blancas que pierde cerca de los 5 meses (CNN Chile, 2025-12-17).

## Movimiento (Inty, 2026-10-06)
- Mockup en viaje: "no está mal". Pide **más fluido** y que **haga otras cosas, sin monotonía**. Ver el plan en COORDINACION-IA/TRASPASO-2026-10-06-MASCOTAS.md, pendiente 0.
- Panel para elegir acciones: https://claude.ai/artifact/TjWPRCuacaeGaULvXnXDTC (fuente `acciones.src.html`, con las jpg `pudu-corriendo` y `pudu-sentado`). Son 14 acciones con su referencia y con lo que necesita cada una (arte de hoy o cuadros nuevos). **Esperando la elección de Inty.**
- **Inty eligió las 14 acciones** ("quiero todas, sigue de corrido, quiero que sea todo muy orgánico", 2026-10-06).
- **Fondo transparente** (Inty preguntó, 2026-10-06): sí, todo PNG transparente. `herramientas/transparente.js` quita el fondo de Gemini (superficie curva ajustada a los bordes, alfa suave en el pelaje, quita el azul del borde y la sombra del piso, deja solo la mancha del pudú) y escala por el ancho de la foto para que todos los cuadros queden a la misma escala. Salida en `transparentes/`. Necesita pngjs y jpeg-js instalados fuera del repo (`NODE_PATH`).
- Mockup en viaje nuevo (esta cuenta): https://claude.ai/artifact/WkxksRS8N8f5dg7pQG2DN7 (el de la otra cuenta no se puede abrir desde aquí).
- Corrección del galope: los ciervos chicos usan galope rotatorio, con DOS vuelos (patas estiradas y patas recogidas), según Biancardi y Minetti, J. Exp. Biol. 2012 (corzo). El mockup solo despega con las patas estiradas. Se arregla con las 2 imágenes de hoy: dos vuelos, velocidad suave y altura variable.

## Varios animales en el mockup de viaje (2026-10-07)
- Inty: "sigue con las otras mascotas". Se va de a un animal; cada uno con acciones sacadas de su comportamiento real, no copiadas del pudú.
- **Zorro culpeo hecho** (pendiente de revisión de Inty): 13 cuadros de Gemini en `transparentes/zorro-*.png` (versión liviana en `transparentes/mockup/`). Cambia "dos patas" por **escuchar un ruido en el pasto** (sin arbusto), el brote por **frutos de pimiento** (Schinus molle, el culpeo los come y dispersa sus semillas), salto juguetón propio y duerme enrollado en su cola.
- Galope del zorro: galope rotatorio con dos vuelos, como los perros y otros carnívoros corredores (Biancardi y Minetti, J. Exp. Biol. 2012).
- El mockup elige animal con `ANIMALES` en `mockup-viaje.src.html`; `cargarAnimal` carga los cuadros aparte y los cambia de una vez (antes, cambiar de animal mientras cargaba dejaba la página en blanco).
- **Huillín hecho** (2026-10-08, pendiente de revisión de Inty): 12 cuadros nuevos de Gemini en su chat (pedido: "Edit my original RUNNING baby huillin image… change only the pose: …"), originales en `gemini/huillin-cria-*.jpg`, transparentes en `transparentes/huillin-*.png`. Galope a saltos con el lomo arqueado (las patas delanteras son más cortas: otterjoy.com, locomoción de nutrias); "dos patas" = se para a vigilar; "tronco" = tobogán de guata (las nutrias se deslizan en barro y nieve como juego, Northeastern Naturalist 2005); come pancoras (*Aegla*, casi 100 % de su dieta según Oryx/Cambridge); chilla. Lleva `alto:64` porque corre bajo y largo.
- **Ranita de Darwin: la cría ya no es renacuajo** (Inty, 2026-10-08: eligió "ranita recién nacida"). En *Rhinoderma darwinii* el renacuajo se desarrolla entero dentro del saco vocal del papá y sale por su boca ya convertido en ranita (AmphibiaWeb 4322; EDGE of Existence), así que un renacuajo suelto no existe. Nueva cría: `gemini/rana-cria-v2.jpg` (de frente) y `gemini/rana-cria-sentado.jpg` (perfil). Acciones reales: se camufla como hoja seca, se hace la muerta panza arriba (guata negra con manchas blancas), silba como pájaro (saco vocal inflado), atrapa una mosquita con la lengua y salta troncos. Los 13 cuadros de viaje están hechos (2026-10-08) y la cría nueva ya está en la maqueta de la entrega. Pendiente: rehacer hambre y descuidado de la cría (siguen siendo renacuajo) y la lámina.
- **Güiña hecha** (2026-10-08, pendiente de revisión de Inty): 13 cuadros en `transparentes/guina-*.png` (originales `gemini/guina-cria-*.jpg`; "estirado" es la güiña corriendo original, de donde salen todas). Datos reales: el gato más chico de América, nocturno y trepador (cría en huecos de árboles muertos, centrodesarrollolocal.uc.cl), come sobre todo ratón colilargo (*Oligoryzomys longicaudatus*, Gayana/UdeC). Acciones: "dos patas" = **acecho** agazapado; frenazo = **se eriza** y bufa; comida = **colilargo** (dibujo propio: lomo café grisáceo, guata clara, cola más larga que el cuerpo), dibujado entero bajo sus patas, sin sangre: **revisar con Inty** si prefiere otra presa; duerme enroscada con la cola en la nariz. `alto:70` (más chica que el pudú). Arreglo común: si el cuadro de comer ya trae la comida (huillín, güiña: `comidaEnCuadro`), el dibujo suelto se esconde al llegar; antes se veían dos. Gemini: cuenta inty405 (`/u/0/`); si Chrome no está al frente la pestaña se congela y los cuadros viejos quedan como `blob:` (no se pueden bajar; rehacerlos al final del chat). La URL `rd-gg` hay que bajarla con curl en segundos; con `=s1376` en vez de `=s0` redirige mejor. Una de las imágenes traía la estrellita de Gemini abajo a la derecha: se tapó con el fondo antes de recortar.
- Falta: Yorkshire.
- Descarga de Gemini sin el botón: en la pestaña del chat, `location.href` = URL `/gg/…=s0` de la imagen, leer la URL `rd-gg` a la que redirige y bajarla con curl en seguida (vence en minutos).

## Pieza 3 de 3: entrega de la mascota (2026-10-07)
- Panel de referencias: https://claude.ai/artifact/2X4QuGeonYiadh2KiQRtmS (fuente `entrega/`: `cabecera.html` con los estilos del panel de la pieza 1, `cuerpo.html` y `ref/*.jpg`; `node entrega/armar.cjs` arma `entrega/referencias.html`).
- Referencias: Finch (elegir, nacer y ponerle nombre), Nintendogs (criadero: acariciar antes de elegir, nombre por voz, "Sorpréndeme"), Pokémon GO (huevo que nace caminando, guarda lugar y fecha; compañero con corazones cada 2 km, máx. 3 al día), Pikmin Bloom (adorno según el lugar, queda para después).
- Propuesta de 4 pantallas (regalo en el canasto, elegir entre las 6 vivas, nombre por voz, primera salida) y 4 preguntas. **Inty: "sí a todo" (2026-10-07)**: llega al terminar la primera salida; se puede cambiar de animal hasta la primera salida juntos; gratis en la prueba; nombre por voz o escrito.
- **Maqueta tocable:** https://claude.ai/artifact/76VUmBKnEJdTxwVCJM7zJE (fuente `entrega/maqueta-plantilla.html`, imágenes `entrega/img/`: crías de frente y sentadas sin fondo). Pistero en bici con el código real (`_pistBiciSVG`) y la cría entra al canasto por el mismo gancho `_bMascota` de la app. Gestos al tocarlas sacados de cada especie; datos reales en el globo de Pistero. Esperando su OK.
- `herramientas/transparente.js` (2026-10-07): el fondo ahora también se reconoce por el tono (es azul); antes el pelaje negro del Yorkshire, el pecho del huillín y el ojo de la ranita quedaban con hoyos.
