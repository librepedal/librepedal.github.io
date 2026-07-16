# 📓 Bitácora de cambios — Libre Pedal

Registro de qué se hizo, por versión. La IA que edite: **agrega tu entrada arriba**, con fecha, versión y quién.

---

## v6.87 — 2026-07-16 — Claude (sesión 1, "botones que no funcionan")

Inty: *"tenemos botones que no funcionan… revisa todo"*. Barrido completo y
seguro (sin disparar acciones tipo SOS/enviar): auditoría de existencia de
funciones + prueba de cobertura de clic (`elementFromPoint`) en las 15 vistas
a 375×812 y 1280×720. Dos bugs reales:

1. **Los botones 👍/🚫 de confirmar reporte no hacían nada** salvo para el
   autor. `firestore.rules` solo permitía `update` al dueño → el modelo Waze
   (que OTROS confirmen) fallaba en silencio. Nueva regla: cualquier
   `signedIn()` puede hacer update SI el diff solo toca
   `confirmadoPor/desmentidoPor/lastConfirm`. **Requiere que Inty RE-PUBLIQUE
   `firestore.rules`.**
2. **La fila de entrada del chat (micrófono+enviar) se iba debajo de la
   pantalla** en Pistero y Social. `.cc` usaba `height:calc(100vh - 210px)`
   (número mágico que no reservaba la barra inferior ni el alto real del
   encabezado). Fix: `.cc`/`#pisteroMsgs` a flex-fill + las dos vistas de chat
   acotadas con `height:calc(100dvh - 130px)`. Verificado a 375×812 y 1280×720:
   input sobre la barra y accesible, sin scroll de página.

Descartado (no eran bugs): las 116 funciones de los 329 botones existen todas;
el resto de "problemas" del barrido eran falsos positivos (chips en tiras de
scroll horizontal, o botones que se alcanzan con scroll normal).

**OJO para testear en local:** el service worker es network-first para HTML,
pero si quedó un SW viejo registrado puede servir index.html cacheado y
"comerse" los cambios de CSS. Si al probar en local no ves un cambio,
desregistra el SW + borra caches (`caches.keys().then(...)`) y recarga. En
producción no pasa (network-first + auto-heal por version.txt).

Deploy: librepedal.cl/version.txt → 6.87 en vivo + push a GitHub.

---

## (operación, sin versión) — 2026-07-16 — Claude (sesión 1, cierre de la fuga de correos)

Inty: *"publiquemos"* (la sesión 2 se quedó sin créditos, me pasó el control).
Se cerró por fin la fuga de correos que estaba "código listo, falta deploy"
desde el 2026-07-14 (el código ya había subido en v6.86).

1. Respaldo completo de Firestore ANTES de tocar nada →
   `LibrePedal-Backups/firestore-2026-07-16-12-22-02` (todas las colecciones,
   incluida `users` con los correos). Reversible.
2. `node scripts/migrate-email-privado.js` en dry-run (mostrando solo el
   resumen, sin volcar correos): 28 users, 21 con correo público, 0 migrados.
3. `--escribir`: 21 correos movidos de `/users` (mundial) a `/usersPrivate`
   (dueño+admin), 0 errores. Verificado con el Admin SDK: `users con email
   público = 0`, `usersPrivate con email = 21`.

**Pendiente de Inty (ninguna IA lo toca, regla del proyecto):** publicar
`firestore.rules` en la Console (bloque `usersPrivate`). Hasta entonces los
registros NUEVOS no guardan correo y el export admin no lo lee — pero la fuga
en sí ya está cerrada. Link directo:
`https://console.firebase.google.com/project/librepedal-cb983/firestore/rules`

---

## v6.86 — 2026-07-16 — Claude (sesión 1, reportes estilo Waze + páginas Nocturno Pro)

Inty: *"reportar y no se quita hasta que alguien diga que no hay nadie, igual
que Waze"* + *"termina de embellecer la app con las nuevas páginas como
quedamos"*.

**Reportes que no caducan por reloj (modelo Waze):**
- Confirmación comunitaria en cada reporte: 👍 "Sigue ahí" / 🚫 "Ya no está",
  tanto en el popup del mapa como en la lista del Mapa Comunitario. Con
  **2 desmentidos** (`REPORTE_DESMENTIDO_UMBRAL`) el pin desaparece para
  todos. `arrayUnion` evita el doble voto del mismo usuario (mismo patrón
  que las rodadas). +2 Darma solo la 1ª vez (guardado contra farmeo).
- El pin ya **no se quita por tiempo** — solo cuando la comunidad lo baja.
  La vigencia por categoría queda SOLO para el aviso proactivo de voz
  (Pistero no grita un control de hace 3 h), y cada "sigue ahí" reinicia ese
  reloj (`_reporteEdadMs` usa `lastConfirm` sobre `ts`).
- `reporteVisible()` centraliza la regla; aplicada en el mapa, la lista, el
  aviso proactivo y la consulta "¿hay peligros en mi ruta?".
- **Botón flotante 📍 REPORTAR** sobre el mapa (estilo Waze), a mano. Se
  quitó el "Reportar" redundante de la fila (Inty: "sin redundancia de
  botones"); el FAB queda como único primario naranja y la fila pasa a 3
  columnas neutras.

**Embellecer páginas (Fase 3 Nocturno Pro):**
- `.section-info`: el `h4` deja de gritar naranja (era contexto, no acción)
  → texto claro `#eaf1fb`; eliminada la regla vieja naranja duplicada.
- `.cd`: tarjeta translúcida gris (`#fff`/0.08 + borde `#222`) → `#0f1728` +
  hairline, igual que el resto del sistema (Diario, Ajustes, Respaldo…).
- `.cm` y la tarjeta negra suelta de Recomendaciones → sistema de tarjetas.
- Burbujas de Pistero en su chat: borde naranja → **cian** (su color de
  identidad Nocturno Pro; tú=naranja acción, Pistero=cian).

**Verificado** (el sandbox NO deja tomar screenshots esta sesión — problema
de infraestructura del panel Browser, no del código): sin errores de consola;
estilos computados confirmados en vivo (`.section-info` `#0f1728` + h4 claro,
`.cd` `#0f1728`, FAB naranja 58×58, fila del mapa 0 botones naranjas);
`reporteVisible` da true/true/false para 0/1/2 desmentidos; la UI de
confirmación renderiza (botones + conteos "✔ 3 confirman · ✖ 1 dice que no")
y un reporte con 2 desmentidos desaparece de la lista. **Falta que Inty lo
mire a ojo en la ruta.**

⚠️ **Aviso de seguridad para el próximo deploy:** el snippet de carpeta
limpia de `LEEME.md` NO excluye `librepedal-release.keystore` (la clave de
firma de Play Store) — apareció en el `ls` de la carpeta limpia y lo saqué a
mano antes de deployar. **Agregar `*.keystore`/`*.jks` a la lista de
exclusión del snippet** (no lo toqué ahora por la regla de no editar LEEME a
mitad de sesión). Deploy hecho a Cloudflare Pages (librepedal.cl/version.txt
→ 6.86 en vivo) + push a GitHub.

---

## v6.76 — 2026-07-15 — Claude (sesión 2, voz de Pistero: variedad real por arquetipo)

Inty: "retómalo y lo subes igual" — pidió terminar lo que sesión 1 dejó a
medias (ver entrada de rescate justo abajo) y publicarlo.

**Antes de escribir código verifiqué un supuesto de sesión 1** (búsqueda
web a la documentación de Azure): `es-CL` tiene exactamente **2** voces
neuronales, Catalina y Lorenzo — no existe una tercera voz chilena que
pedir por nombre. El plan de `?v=ShortName` (pedir una voz distinta por
arquetipo) no puede dar variedad real sin salirse del acento chileno
(usar voces de México/Argentina/España, etc.), y eso choca con una
decisión ya tomada en el proyecto: "TODO Pistero suena chileno" (v6.69).
No tomé esa decisión de marca por mi cuenta — usé la vía que sí es segura
y queda dentro del mismo acento: **prosodia** (velocidad/tono) sobre las
mismas 2 voces de siempre.

- `worker-ia/worker.js`: nuevos parámetros `rate`/`pitch` en `/aztts`
  (formato SSML `+N%`/`-N%`, validados con regex estricto — cualquier otra
  cosa se ignora sin romper nada), envueltos en `<prosody>` dentro del
  `<voice>`. Probado en vivo contra el Worker desplegado: con prosodia
  (200, MP3 real de 24KB), sin parámetros (200, igual que antes — mismo
  comportamiento que ya usaban los demás llamados), y con valores
  maliciosos tipo `DROP TABLE`/`<script>` (200, se ignoran solos).
- `index.html`: mapa `PERSONALIDAD_PROSODIA` con los 13 arquetipos
  (Entrenador más rápido/agudo, Sabio más lento/grave, Relator bien
  arriba, Sensible más suave, etc.), conectado en `_vozAzureRuntime()`.

**⚠️ Limitación real de esta sesión, para que quede claro:** no hay
reproducción de audio en este sandbox — no pude ESCUCHAR el resultado.
Verifiqué que el pipeline funciona técnicamente (HTTP 200, MP3 válido,
prosodia bien inyectada en el SSML) pero los porcentajes de cada arquetipo
son una elección conservadora a ciego, no una elegida de oído. **Alguien
tiene que escuchar los 13 arquetipos en la app real y ajustar los números
en `PERSONALIDAD_PROSODIA` (línea ~1552 de `index.html`) si algo suena
forzado o plano** — no lo di por terminado, lo di por "listo para probar
de oído".

---

## Rescate — 2026-07-15 — Claude (sesión 2, Worker de voz sin commitear)

Inty avisó "Pistero fue editado en la otra cuenta, hay varias
modificaciones". Encontré `worker-ia/worker.js` modificado localmente sin
commitear (sesión 1 no alcanzó a subirlo): agrega soporte para
`?v=NombreDeVozNeural` en `/aztts`, para poder pedir una voz neuronal
específica en vez de solo elegir por género. Compatible hacia atrás — sin
el parámetro sigue igual que antes.

**No estaba conectado desde `index.html`** (no hay ningún lugar que mande
`?v=`) — es la mitad de un cambio, la otra mitad (elegir qué voz usa cada
arquetipo) sigue pendiente, seguramente lo que sesión 1 iba a hacer
después. Con permiso de Inty: comité el código (`9993fee`) y **desplegué
el Worker a producción** (`npx wrangler deploy` con `MI-CLOUDFLARE-IA.txt`)
para que la capacidad esté lista y no se pierda. No toqué `index.html` —
eso es territorio de sesión 1 (qué voz asignarle a cada arquetipo).

## v6.72 — 2026-07-14 — Claude (sesión 2, simplificación de interfaz — fusión Viajes/Rutas + rename SOS)

Pedido de Inty: "debemos simplificar la aplicación... hay muchos botones,
hay cosas que están duplicadas... sin perder la calidad de la parte
visual." Primer lote de 4 tareas identificadas en la auditoría; esta
versión cierra 2 de las 4 (#87 y #89 en el tracker de tareas).

**#87 — Fusión de "Mis viajes" (`v-trips`) y "Rutas" (`v-routes`), dos
pantallas que hacían casi lo mismo:** `v-routes` era una vista aparte,
accesible SOLO desde un ícono duplicado en la esfera ("📋 Rutas"), con:
importar GPX, "Ver todas en el mapa" (con su propio Leaflet), "Combinar
todas en una", y un botón de Bitácora que usaba `cv('diario')` a secas (sin
`sincronizarDiarioNube()`, a diferencia de `v-trips`). Se movieron las 3
acciones únicas de `v-routes` a `v-trips` (bajo "Tus rutas grabadas"), se
corrigió el botón de Bitácora de `v-trips` para usar `openDiario()` (bug
real encontrado de paso: antes no sincronizaba con la nube al abrir desde
ahí), se eliminó el ícono `{i:'📋',t:'Rutas',v:'routes'}` de `esferaItems`,
se redirigieron las 2 referencias a `cv('routes')` que quedaban (comando de
voz "rutas", `showAllRoutesOnMap()`) y el alias de voz `PISTERO_ALIAS`
(rutas/historial) a `'trips'`, y se borró la sección `<section
id="v-routes">` completa. Verificado: 0 IDs duplicados, 0 referencias
colgantes a `v-routes`/`cv('routes')`, `node --check` sobre el bloque de
script sin errores, y probado en navegador real (`cv('trips')` muestra los
5 botones esperados incluido el importador GPX y el mapa combinado).

**#89 — El botón SOS del dashboard decía "🆘 SOS · Compartir mi ubicación",
casi el mismo texto que "📡 Compartir ubicación en vivo" del seguimiento en
vivo (dos funciones muy distintas: SOS es un mensaje único a contactos de
emergencia por WhatsApp; "en vivo" es un link de tracking continuo).**
Renombrado a "🆘 Enviar SOS a mis contactos" — ya no comparte la frase
"compartir ubicación" con el otro botón. Verificado en navegador.

**#88 y #90 quedan PENDIENTES, a propósito — no es olvido:** al revisar el
código antes de tocar `es-bottom` (la fila de KM/Avisos/Mic/Mi puesto/Viajes
que flota sobre la esfera) encontré una nota de una decisión de diseño
YA CERRADA (línea ~278 de `PENDIENTES.md`, del rediseño v6.09): "la Esfera
ahora es el destino real de 'ir a Inicio' en TODA la app" y `es-bottom`
existe como HUD de números en vivo, no como lista de navegación — muestra
datos (km reales, tu puesto real) que los íconos de la esfera NO muestran
por sí solos. Borrarlo a secas quitaría información útil, no solo un botón
duplicado. Igual pasa con los accesos a Stats/Logros en `v-customize`
(Perfil): sirven a quien está navegando por el menú clásico sin pasar por
la esfera. Antes de tocar cualquiera de las dos cosas, mejor que Inty
confirme si quiere que ese HUD/esos accesos se reduzcan igual (perdiendo el
vistazo rápido) o si esto ya cuenta como "no duplicado" porque cumple un rol
distinto. Quedan documentados en el tracker de tareas como pendientes,
no bloqueados.

**Pendiente de la versión anterior, sigue sin tocar:** revisar botones
sobredimensionados (pedido explícito de Inty, "los botones son muy grandes
en alguna ocasión") — no alcanzó en este lote, no se evaluó código
todavía.

---

## v6.71 — 2026-07-14 — Claude (sesión 2, Pistero invisible en el video — causa real encontrada)

Pedido de Inty (probando lo de v6.64): "Pistero en bici en el video no
funcionó bien, se supone que debería ir en la punta de la línea que se
traza y debe verse como un ciclista no como una imagen plana."

**Causa raíz real:** el marcador de Pistero (v6.64) era un `Marker` de
MapLibre — un `<div>` HTML posicionado por CSS encima del mapa. Pero
`#video-canvas-out` (el `<canvas>` que compone la barra de estadísticas Y
que es la fuente real de `captureStream()` para el video grabado) se dibuja
ENCIMA de `#video-map` con `ctx.drawImage(mc,...)`, donde `mc` es SOLO el
canvas WebGL del mapa — eso NO incluye elementos HTML superpuestos como un
Marker. Resultado: Pistero quedaba 100% tapado, tanto en la vista previa
como en el archivo descargado. Nunca se vio, en ningún momento — no era un
problema de posición ni de arte, era que literalmente no estaba en la
imagen que se ve/graba.

**Fix real:** se dejó de usar `maplibregl.Marker` por completo. Ahora
Pistero se dibuja DIRECTO en `videoCompositeCtx` (el mismo canvas de
salida), cada cuadro, en la posición de pantalla que da
`videoMap.project([lon,lat])` — el mismo pipeline que sí se ve y se graba.
Sigue estando en la punta exacta de la línea que se traza (mismo lon/lat
que maneja la cámara). De paso se mejoró el arte: antes eran casi puros
trazos delgados (se habría visto como alambre, no como un cuerpo sólido);
ahora el torso del ciclista es una forma RELLENA, más el color de marca en
el marco de la bici y una sombra en el suelo para que se sienta apoyado en
el terreno, no pegado encima como una calcomanía.

**Verificación real hecha — mucho más sólida que la de v6.64:** a diferencia
del mapa/marcador anterior (que dependía del render loop de MapLibre,
congelado en este sandbox por `document.hidden`), este dibujo es Canvas 2D
puro + carga de imagen, que SÍ funciona en este entorno. Confirmado con
pruebas reales: la imagen carga (240×150px), se dibuja sin error, el píxel
central cambia de verdad respecto al fondo (RGB real distinto, no
transparente), y — la prueba más concluyente — el ANCHO del perfil
horizontal de la silueta cambia de 70px (de lado, sin rotar) a 40px
(rotada 90°) exactamente como corresponde a un ícono que gira de verdad
según el rumbo, no uno pegado estático.

**Sobre el otro reporte de Inty (voz de arquetipo que no cambia):**
investigado, NO es un bug de código — es una confusión de UX real: el
sistema de voz chilena (lo que hace sonar distinto cada arquetipo) está
detrás del toggle **"Voz mejorada"** en ⚙️ Ajustes (`vozMejorada`, default
OFF), una pantalla DISTINTA de donde se eligen los arquetipos (Perfil →
Preferencias). Sin ese toggle prendido, `_reproducirVoz()` cae directo a
`_vozNativaOWeb()` (la voz nativa del navegador) sin importar qué
arquetipo esté elegido — línea 1916: `if(vozMejorada && navigator.onLine)`.
No se tocó nada de esto (es sistema de voz de sesión 1) — se le explicó a
Inty dónde está el toggle. **Ojo para sesión 1:** vale la pena considerar
si "Voz mejorada" debería venir ON por defecto ahora que es una función
estable, o si el selector de arquetipo debería mencionar/enlazar a este
toggle para que no quede escondido en otra pantalla.

---

## v6.70 — 2026-07-14 — Claude (sesión 2, arquetipos invisibles + pantalla de personaje ocupaba mucho espacio)

Pedido de Inty (probando lo nuevo de voz de sesión 1): "no veo en la app los
arquetipos y los iconos de personaje y skins ocupan mucho espacio."

**Causa raíz #1 — arquetipos "invisibles":** la pantalla de personaje tiene
11 pestañas (Casco, Color, Piel, Peinado, Ojos, Labios, Vello facial,
Lentes, Pañuelo, Accesorios, Preferencias) en una fila con scroll horizontal
y **sin barra de scroll visible** (`scrollbar-width:none`). "Preferencias"
—donde viven Personalidad/Arquetipos y Actividad— era la ÚLTIMA de las 11,
así que en un celular quedaba fuera de pantalla sin ninguna señal de que
había más pestañas para el lado. Fix: se movió "Preferencias" a la
**segunda posición** (justo después de Casco), y se agregó un degradado en
el borde derecho de la fila de pestañas (`mask-image`) que insinúa
visualmente "hay más para el lado" — sin necesitar JS, funciona sin importar
en qué pestaña estés parado.

**Causa raíz #2 — "ocupan mucho espacio":** `#personalidadGrid` (los 13
arquetipos) era el ÚNICO contenedor de esa pestaña sin ninguna clase de
grilla (todos los demás — estilos, fondos, actividad — usan
`.accessory-grid`). Sin grilla, cada tarjeta de personalidad heredaba
`min-height:96px` de `.custom-option` (pensado para tarjetas con ícono
grande) y se apilaba una debajo de otra en una sola columna — más de 1000px
de scroll solo para elegir personalidad. Fix: nueva clase `.personalidad-grid`
(2 columnas, sin la altura mínima de 96px — estas son tarjetas de puro
texto). Clase aparte de `.accessory-grid` a propósito, para no tocar el
tamaño de columna de las otras grillas de esa misma pestaña.

**Ojo para sesión 1:** este cambio es SOLO de layout/CSS de la pantalla de
personaje — no se tocó `PERSONALIDADES`, ningún arquetipo de voz, ni código
de `/aztts`. Los 13 arquetipos actuales de sesión 1 siguen intactos, solo se
ven más chico y en la pestaña correcta.

**Verificación real hecha:** en navegador (viewport móvil 375px), llamando
`_tabPersonalizar('prefs')` directo y midiendo el DOM real: confirmado que
la pestaña "prefs" ahora es la 2ª de 11 (antes 11ª), que se activa
correctamente al tocarla, que `#personalidadGrid` mide `display:grid` con
2 columnas de 173.5px reales, que 2 tarjetas de arquetipos caen en la MISMA
fila (confirmando 2 columnas de verdad, no una coincidencia visual), y que
la altura de cada tarjeta bajó de 96px+ a **56px** — una reducción real de
espacio de ~68% para esa sección.

---

## v6.66 — 2026-07-14 — Claude (sesión 1, Voces chilenas por arquetipo: Pistero/Pistera)

Inty aprobó las voces chilenas de Azure ("ya hermoso están bien las voces") y pidió que si
la voz es mujer, el guía se llame **Pistera**. También pidió un arquetipo **"Chileno puro" (El Compadre)**.

- **Catálogo pre-generado (Azure es-CL, GRATIS):** 69 frases fijas grabadas UNA vez en voz chilena
  real — Lorenzo (Pistero) y Catalina (Pistera) — con modulación SSML por arquetipo (entrenador
  enérgico, sabio pausado, sensible suave, etc.). Script: `scripts/gen-voces.py`. Servidas desde
  `voces/` + `voces/manifest.json` (frase→id). 138 archivos, 0 fallos.
- **App:** al hablar una frase fija con "Voz mejorada" ON, suena `voces/{genero}{id}.mp3` (chileno);
  si no hay archivo → MeloTTS; si falla → nativa. Selector **Guía: Pistero/Pistera** en Ajustes (`toggleGenero`, `lp_genero`).
- **Arquetipo El Compadre** (chileno puro, buena onda, "ya po/cachái/la raja") en PERSONALIDADES +
  FRASES_ARQ (subida/rápido/lento) + Worker TONOS. Frases ORIGINALES (no clips de terceros, por derechos).
- **Verificado en navegador:** manifest carga 69 frases; frase compadre → l037.mp3 (200 OK, se descarga y suena); fallback intacto.
- **Azure es temporal:** solo se usó para generar. Recordar a Inty borrar la suscripción (ver memoria [[librepedal-azure-tts-temporal]]).

**Pendiente:** feature Carabineros en el mapa (aviso a 3 km motorizados + frase "buenos días buenas
tardes" del chistoso, toma torpe por elegir); pre-generar más frases (saludos/llegada/bajada); enviar preferencias al Worker.

---

## v6.65 — 2026-07-14 — Claude (sesión 1, Voz neuronal española + Pistero proactivo)

Pedido de Inty: voz "más humana, más real" — la voz nativa/web sonaba robótica, y la
muestra inicial de MeloTTS "hablaba como un gringo tratando de hablar español". Decidió
ir con **el modelo gratis** (MeloTTS por el Worker), no premium.

**Backend (Worker `librepedal-ia`):**
- Ruta nueva `GET IA_URL/?tts=<texto>` → `{audio: base64 WAV, via}` con MeloTTS (`@cf/myshell-ai/melotts`), gratis.
- **El acento gringo era por el idioma:** sin `lang`, MeloTTS usa fonética inglesa. El campo
  es `lang` pero en **MAYÚSCULA** (`"ES"`); `"es"` minúscula da 8002. Averiguado por sondeo
  empírico (los tokens no leen la API de esquemas). Reintenta ES x2 (el 8002/3043 es
  transitorio) y como último recurso genera sin lang antes de dejar a Pistero mudo. Commits `dc5e5a2`, `dfc3f11`.
- `personalidad()`: regla 8 de **PROACTIVIDAD** (se adelanta a riesgos/oportunidades) + soporta `u.preferencias`. Commit `9dc9368`.

**App (`index.html`):**
- Botón **"🪄 Voz mejorada"** en Ajustes (`toggleVozNeural`, persistido en `lp_vozneural`).
  ON + red → Pistero habla con la voz neuronal española; si el fetch falla/tarda >6s → cae
  solo a la voz nativa (`_vozNativaOWeb`). Recalibra boca/ducking/timers con la duración REAL
  del audio (`onloadedmetadata`) para no pisarse. `pararVoz` detiene también el audio neural. Commit `b844e59`.
- **Verificado en navegador real:** funciones OK, toggle flip `lp_vozneural`, fetch CORS `via=ES`, WAV decodifica a 2.92s reproducibles.

**Nota de costo (por si escala a 5.000 usuarios):** frases fijas se pueden pre-generar 1 vez
(gratis, cabe en capa gratuita) y el chat en vivo queda en MeloTTS gratis → ≈US$0/mes. Voz
premium emotiva (ElevenLabs/Azure es-CL) solo tendría sentido como feature de pago autofinanciada.

**Pendiente futuro:** la app aún no envía `u.preferencias` (falta plumbing en index.html);
variedad de voces por arquetipo necesitaría voz premium (MeloTTS tiene un solo timbre).

---

## v6.64 — 2026-07-14 — Claude (sesión 2, Video 3D de ruta: mapa vectorial + edificios 3D + Pistero en bici)

Pedido de Inty: "el mapa le falta calidad... tiene a ponerse negro en algunas
partes... me gustaría que tuviera más cuerpo, que las casas y edificios se
vean 3D... me gustaría que se viera a Pistero recorriendo en bicicleta."

**Causa raíz del mapa negro:** el video usaba tiles RASTER de OpenTopoMap
(imágenes PNG por tile). Un vuelo de cámara rápido pide muchísimos tiles muy
seguido — más de lo que esa capa aguanta a ese ritmo — y un estilo raster
puro no tiene ningún color de fondo definido: si un tile no llega a tiempo,
se ve negro puro, sin nada detrás. Además, el vuelo arrancaba con un
`setTimeout` fijo de 400ms sin esperar a que el mapa terminara de cargar la
vista inicial.

**Fix:** el mapa del video ahora usa el MISMO proveedor que ya usa con éxito
el mapa principal de la app — `https://tiles.openfreemap.org/styles/liberty`
(OpenFreeMap, vectorial, gratis y sin cuenta, ya integrado en `LP_ESTILO_CALLES`
desde antes). Dos beneficios de una sola vez: (1) todo estilo vectorial trae
un color de fondo definido — un tile que tarda ya no se ve negro, se ve el
fondo del estilo; (2) el estilo `liberty` ya trae de fábrica una capa
`building-3d` (`fill-extrusion` con la altura REAL de cada edificio desde
OpenStreetMap, no una textura plana) — confirmado revisando el JSON del
estilo antes de usarlo. El terreno (Mapterhorn) se mantiene igual que antes.
También se cambió el arranque del vuelo de un `setTimeout` fijo a
`videoMap.once('idle', ...)` — espera a que calles/edificios/terreno
terminen de pintar la vista inicial antes de empezar a volar.

**Pistero en bici:** nuevo marcador HTML (`_riderMarkerVideoSVG()`, ícono
chico vista de lado, colores de marca) que sigue el mismo lat/lon que
maneja la cámara en cada frame, con `rotationAlignment:'map'` para que gire
según el rumbo real de la ruta (`videoBearing - 90`, porque el ícono se
dibujó mirando al este por defecto).

**Verificación real hecha:** `node --check`, 0 errores. En navegador:
confirmado que el estilo carga con las capas `building`/`building-3d`
presentes (`getStyle().layers`), que el SVG del marcador es válido y
parseable, y que la fórmula de rotación (`bearing-90`) calza con la
convención documentada de MapLibre para `rotationAlignment:'map'`
razonando los 4 casos cardinales (0°→-90°, 90°→0°, 180°→90°, 270°→180°),
verificado sin errores de consola en cada paso.

**No verificado — honesto:** el render final en píxeles (¿realmente ya no
se ve negro? ¿los edificios se ven bien en 3D? ¿Pistero se ve bien y gira
para el lado correcto?) NO se pudo confirmar en este sandbox — la pestaña
de vista previa queda con `document.hidden=true`, lo mismo que ya bloqueaba
las animaciones WAAPI del prototipo de Pistero esta sesión, y acá también
congela el render loop interno de MapLibre (el mapa nunca termina de
disparar su evento `load` real). Falta que Inty grabe un video de prueba en
su teléfono y confirme cómo se ve. Si Pistero queda mirando para el lado
contrario al que avanza, el arreglo es trivial (sumar 180 más al offset).

---

## v6.63 — 2026-07-14 — Claude (sesión 2, rediseño tarjeta "Mis Rutas")

Pedido de Inty: "los botones están mal no se ve bien, hay mucho texto."

**Antes:** cada ruta grabada mostraba 6 botones con texto en una sola fila
apretada junto a la info ("Ver", "📈 Perfil", "🎬 Video", "🏁 Segmento", "📤
GPX", "Borrar") — en pantallas de celular esto se veía saturado, con texto
compitiendo por espacio horizontal.

**Ahora:** la tarjeta completa es el botón "Ver" (toque directo abre la ruta
en el mapa, patrón común en apps móviles), y debajo queda una fila de 5
íconos circulares compactos (📈🎬🏁📤🗑️) sin texto, con `title` para el
tooltip de escritorio. `.route-item-actions` corta la propagación del click
(`event.stopPropagation()`) para que tocar un ícono no dispare también el
"Ver" de la tarjeta. Se creó una clase nueva `.route-icon-btn` en vez de
reusar `.route-btn` — esa sigue con texto en otros lugares (SOS, agregar
amigo) y no debía volverse circular ahí.

**Verificación real hecha:** en navegador (viewport móvil 375px), con datos
simulados incluyendo una ruta con bitácora (hospedaje + notas). Confirmado
por medición real del DOM: tarjeta 355px de ancho (sin desbordar el
viewport), fila de acciones 329px con los 5 íconos en una sola línea sin
necesitar salto (`flex-wrap` de respaldo si algún celular es más angosto),
0 apariciones de texto "Ver"/"Borrar" en el contenido. Confirmado que tocar
un ícono de acción NO dispara también el "Ver" de la tarjeta (mockeando
`showSingleRoute`/`verPerfilElevacion` y verificando cuál se llamó).

---

## v6.62 — 2026-07-14 — Claude (sesión 2, fix real de la caída: lecturas redundantes de Firestore)

Causa raíz de la cuota agotada, confirmada con datos reales de Firebase
Console que compartió Inty: **170K lecturas vs 2.900 escrituras el día del
pico (58:1), y 68K lecturas vs 117 escrituras el mismo día de hoy (581:1).**
Una proporción así de desbalanceada no la explica el crecimiento de
usuarios — es la huella de código que lee lo mismo una y otra vez sin que
corresponda a una acción real.

**El patrón, encontrado en 8 lugares distintos:** `getNombreUsuario(userId)`
hace un `.get()` COMPLETO a `/users/{userId}` — una lectura nueva — cada vez
que se llama. Pero en 8 listeners (`subscribeToUsers`, el mismo listener
duplicado en el mapa de navegación, `subscribeToChat`,
`subscribeToRouteAlerts`, `subscribeToComments`, `loadRepairTips`,
`renderHostelsLista`, `loadRecommendations`) se llamaba `getNombreUsuario`
por cada documento del resultado, aunque el nombre YA viniera en el mismo
documento que se acababa de leer (`nombre:nombreUsuario` se guarda desde
siempre en `chat`, `routeAlerts`, `guiComments`, `repairTips`, `hostels`,
`recommendations`, y `users` al registrarse). Con varios usuarios moviéndose
a la vez con el mapa abierto, cada actualización de posición de CUALQUIERA
hacía que TODOS los demás listeners activos volvieran a leer el nombre de
cada usuario visible — el peor caso posible es exactamente un evento
grupal con muchos ciclistas juntos (como la cicletada de Lago Ranco),
donde esto puede agotar la cuota diaria completa en minutos.

**Fix:** las 8 llamadas se reemplazaron por leer `data.nombre` directo del
documento ya obtenido (con `||data.user` o `||doc.id` de respaldo para
documentos viejos que no tengan el campo, sin romper nada). Además,
`subscribeToUsers()` y su duplicado en el mapa de navegación ahora tienen
`.limit(150)` — antes no tenían techo, así que la consulta crecía sin
control a medida que crece la base de usuarios. `getNombreUsuario()` en sí
NO se tocó — sigue existiendo para los 3 usos legítimos donde el nombre no
viene en los datos ya cargados (abrir chat con un amigo, lista de amigos,
solicitudes de amistad) — esos no están en un listener de alta frecuencia,
se disparan solo cuando el usuario navega a esas pantallas a propósito.

**Verificación real hecha:** `node --check` sobre `index.html`, 0 errores
(encontró y corrigió en el camino un bug propio: al convertir un `for` en
`.forEach()` en el listener del mapa de navegación quedó un `onSnapshot(...)`
sin cerrar — el cierre de llaves original no calzaba con la nueva forma).
Grep exhaustivo confirmando que las 8 colecciones fuente sí guardan `nombre`
en el documento (revisando cada función que escribe: `reg()`, `em()`,
`addRouteAlert()`, `addComment()`, `addRepairTip()`, `addHostel()`,
`addRecommendation()`). Pruebas aisladas en Node (sin necesitar Firestore,
que sigue con la cuota agotada) simulando snapshots reales: confirmado que
`subscribeToComments` filtra correctamente votos/comentarios vacíos y usa
`data.user` como respaldo en un documento legado sin `nombre`; confirmado
que `loadRecommendations` filtra títulos `TEST-*`, arma el HTML con el
nombre correcto, y preserva el estado "me gusta" — ambas con salida
verificada carácter por carácter.

**No verificado (honesto):** el comportamiento en vivo contra Firestore real
(los `onSnapshot` reales, los marcadores en el mapa con Leaflet/MapLibre)
sigue bloqueado por la cuota agotada — apenas resetee o Inty decida sobre
Blaze, hay que abrir la app real y confirmar que el mapa de ciclistas, el
chat, y las demás listas siguen mostrando los nombres correctos.

---

## 🚨 2026-07-14 — Cuota de Firestore agotada (proyecto entero, no solo admin)

Al intentar respaldar `users` antes de migrar (ver entrada siguiente), el
Admin SDK devolvió `RESOURCE_EXHAUSTED: Quota exceeded` incluso en la
lectura de UN solo documento. Para descartar que fuera un problema de las
credenciales del service account, se probó directo contra la API pública de
Firestore sin ninguna autenticación (`curl
https://firestore.googleapis.com/v1/projects/librepedal-cb983/databases/(default)/documents/meta/contadores`)
— **mismo error, 429 RESOURCE_EXHAUSTED.** Eso confirma que no es un
problema de mis credenciales: es la cuota del proyecto completo agotada, lo
que significa que la app real estaba fallando para CUALQUIER usuario
(ranking, chat, GPS, reportes, todo). Causa casi segura: plan gratuito
Spark, tope diario fijo. Avisado a Inty de inmediato (interrumpe la tarea en
curso porque afecta usuarios reales ahora mismo, no solo a mí). Ninguna
acción de facturación tomada — eso es exclusivamente de Inty. Detalle y
opciones en `PENDIENTES.md`, sección 🔴 más urgente.

---

## Código listo (sin deploy) — 2026-07-14 — Claude (sesión 2, fix email expuesto: usersPrivate)

Continuación del ítem de seguridad más urgente pendiente en el proyecto:
Inty decidió el enfoque (doc privado aparte) vía pregunta directa. Se
implementó el fix completo a nivel de código, pero **NO se desplegó ni se
migraron datos** — bloqueado por la cuota de Firestore agotada (entrada de
arriba). No tenía sentido desplegar código a medias sin poder verificarlo
contra Firestore real ni correr la migración.

**Cambios de código:**
- `firestore.rules`: nueva colección `usersPrivate/{id}` — `allow read: if
  signedIn() && (request.auth.uid == id || isAdmin())`, `allow write:` solo
  el dueño. El id del documento es el mismo `cu` que ya usa `/users/{id}`.
- `reg()`: ya NO escribe `email` en `/users/{cu}` (público) — lo escribe
  aparte en `/usersPrivate/{cu}`.
- `mostrarTodosRegistrados()` y `exportarUsuariosAdmin()` (las dos vistas de
  admin que mostraban el correo): actualizadas para leerlo desde
  `usersPrivate` vía un helper nuevo `_mapaEmailsPrivados()` (trae toda la
  colección y cruza por id de documento), en vez de `d.email` del doc
  público.
- `scripts/migrate-email-privado.js` (nuevo): migra los usuarios YA
  registrados — copia `email` a `usersPrivate` y lo borra de `users`. Corre
  en modo DRY RUN por defecto (no escribe nada, solo informa qué haría);
  `--escribir` para aplicarlo de verdad. Idempotente (seguro de correr más
  de una vez).

**Verificación real hecha:** `node --check` sobre `index.html` y sobre el
script de migración, 0 errores. Grep exhaustivo confirmando que no quedó
ningún otro punto de lectura/escritura de `email` sobre el documento público
(antes de este cambio había 2 lugares que lo leían de ahí, no 1 —
`exportarUsuariosAdmin` y `mostrarTodosRegistrados`, ambas corregidas).

**Lo que falta, en orden, apenas haya cuota:**
1. `node scripts/backup-firestore.js` (respaldo completo real, no solo de
   email) — ya se intentó, falló por la cuota, hay que reintentarlo.
2. `node scripts/migrate-email-privado.js` (dry run) y revisar el resumen.
3. `node scripts/migrate-email-privado.js --escribir` (migración real).
4. Inty publica el `firestore.rules` actualizado (bloque `usersPrivate`
   nuevo) en Firebase Console — igual que la vez pasada.
5. Deploy del código (`index.html`/`version.txt`/`sw.js`).
Los pasos 3, 4 y 5 deben quedar juntos en la misma ventana de tiempo para no
dejar un hueco donde un registro nuevo no logre guardar su correo en
ningún lado (mientras el código nuevo ya no escribe en `users` pero las
reglas de `usersPrivate` todavía no están publicadas).

---

## v6.61 — 2026-07-14 — Claude (sesión 2, avisos de pendiente/ritmo por modo + rutero vs cicloviajero)

Pedido de Inty: "esto debe quedar adaptado para ciclistas, caminantes y
motorizados... no es lo mismo un rutero que un cicloviajero, el cicloviajero
anda en otras velocidades por el peso que carga y el tipo de bici."

**Causa raíz: los umbrales de pendiente eran fijos, sin importar el modo.**
`comentarPendiente()` entraba en "subida"/"bajada" con un 4%/-4% fijo (y
salía con 2%/-2%), `avisarPendienteAnticipada()` avisaba desde 5%/-5%, y
`_pendienteActualTexto()` desde 4%/-4% — ni uno de los tres miraba
`actividadTipo`. Un caminante (que tolera pendientes mucho más pronunciadas
sin esfuerzo real) recibía la misma sensibilidad que alguien motorizado (que
casi no nota una pendiente normal), y un cicloviajero cargado con alforjas
recibía la misma sensibilidad que un rutero liviano — a pesar de que el
mismo % de pendiente se siente completamente distinto según el peso que se
carga.

**Fix:** nueva `_umbralPendiente()` (análoga a la ya existente
`_ritmoUmbrales()`) con un valor por modo: trekking 8%, ciclismo 4%, mtb 5%,
moto 12%. Los tres puntos de aviso (`comentarPendiente`,
`avisarPendienteAnticipada`, `_pendienteActualTexto`) ahora la usan en vez de
números fijos.

**Rutero vs cicloviajero — nuevo, dentro del modo "ciclismo":** en vez de
crear un `actividadTipo` nuevo (que habría tocado OSRM, tema visual y todo
el sistema de `ACTIVIDADES`, con mucho más riesgo/alcance del necesario), se
agregó una preferencia liviana `cicloCargado` (Preferencias → Actividad →
nueva caja "🎒 ¿Cómo andas en bici?", solo visible en modo ciclismo).
Activada, baja el umbral de pendiente a 3% (un cicloviajero cargado siente
un 3% en las piernas) y el ritmo lento/normal de 8/16 km/h a 6/12 km/h (el
peso extra hace más lento el ritmo "normal" real). Se guarda en localStorage
y se sube al perfil igual que el resto de preferencias.

**Bug real encontrado y corregido en la propia verificación:** la primera
versión declaraba `let cicloCargado` DESPUÉS del auto-arranque de la esfera
(`_aplicarTemaActividad(); renderModoRegistro(); ...`), pero ese arranque ya
llamaba a `_actualizarBtnCicloCargado()`, que lee `cicloCargado` — "cannot
access 'cicloCargado' before initialization" (temporal dead zone),
reventando la carga inicial de la app. Se detectó al abrir la app en el
navegador (no solo con `node --check`, que no ve este tipo de error de
orden de ejecución) y se corrigió moviendo la declaración antes del
auto-arranque.

**Verificación real:** confirmado que `_umbralPendiente()`/`_ritmoUmbrales()`
devuelven los valores correctos por modo y con/sin `cicloCargado`; que el
toggle rutero/cicloviajero se guarda en localStorage y cambia el estado
visual; que la caja se muestra solo en modo ciclismo (oculta en trekking);
y con datos reales de un buffer de posiciones (pendiente real calculada:
3.45%) que la MISMA pendiente dispara "subida" para el cicloviajero cargado
(umbral 3%) pero se queda en "plano" para el rutero (umbral 4%) — exactamente
la diferenciación pedida.

---

## v6.60 — 2026-07-14 — Claude (sesión 2, perfil de elevación afinado con DEM real)

Pedido de Inty, con referencias: MOP/GEOMOP (visor oficial de Vialidad),
mapas topográficos de curvas de nivel, y Komoot ("quiero que sea lo más
exacto"). Investigación honesta primero: ninguna de esas tres fuentes tiene
una API pública gratuita apta para esto — MOP/GEOMOP y los mapas
topográficos son visores para mirar con los ojos, no servicios de consulta
programática por lote, y Komoot no publica API pública. Sirven como
referencia de qué tan preciso debería verse el resultado, no como fuente de
datos integrable.

**Causa raíz real del desnivel impreciso:** `calcularDesnivel()` (perfil de
rutas grabadas, "Mis Rutas") usa solo la altitud que reporta el GPS del
celular. Eso no es solo ruido — puede venir sistemáticamente desviada varios
metros, y un promedio móvil no corrige un sesgo sistemático, solo jitter.

**Fix:** se agregó `_muestrearParaDEM()` + `_elevacionDEM()` +
`calcularDesnivelDEM()`, que reusan el MISMO DEM (Copernicus, vía Open-Meteo)
que ya usa con éxito `avisarPendienteAnticipada()` en esta misma app —
gratis, sin llave, ya probado en producción. `verPerfilElevacion()` ahora:
1) pinta de inmediato el perfil basado en GPS (si existe) para que no se
sienta lento, 2) en paralelo pide el perfil real por DEM (por lotes de 100
puntos, hasta 480 muestras — alcanza rutas largas de cicloturismo), 3) al
llegar lo reemplaza en pantalla, y 4) lo cachea (local + Firestore) para no
volver a pedirlo. Si el celular no reportó altitud en absoluto (antes
mostraba "sin datos"), ahora igual puede mostrar el perfil vía DEM con solo
lat/lon. Sin red disponible, cae con gracia a lo que ya había (o al mensaje
de "sin datos" si tampoco hay eso).

**Verificación real:** llamada real (no mockeada) a Open-Meteo con
coordenadas reales de la Ruta 60-CH, con una altitud GPS con ruido inyectado
a propósito (salto imposible de 200m). Resultado: versión GPS calculó +170m
de subida falsa; versión DEM (topografía real) calculó +16m — la diferencia
que se buscaba corregir. Probado también el flujo completo del modal:
pintado instantáneo con GPS, reemplazo en pantalla tras ~2s con el dato DEM,
caché en localStorage confirmada, segunda apertura instantánea (0.2ms, sin
red). Se encontró y corrigió un bug real en la primera pasada: el aviso
"Afinando con datos topográficos…" quedaba pegado en pantalla después de
terminar, porque `pintar()` lo agregaba siempre sin condición — ahora es un
parámetro explícito, solo aparece en el pintado intermedio.

---

## Seguridad — 2026-07-14 — firestore.rules PUBLICADO (Inty, no una IA)

Inty publicó `firestore.rules` en Firebase Console (proyecto `librepedal-cb983`),
cerrando el hueco de privacidad real que llevaba varias versiones documentado
como el ítem más urgente pendiente: la colección `diarios` en producción
permitía que cualquier usuario logueado leyera, sobrescribiera o borrara el
diario personal (reflexiones privadas) de OTRO usuario, con ID de documento
predecible. El fix (`isOwnerByCu()` en vez de `isOwnerOrLegacy()`, que NO
servía para esta colección) ya estaba listo en el repo hace tiempo — solo
faltaba publicarlo, y eso es intencionalmente tarea exclusiva de Inty (cambio
de control de acceso sobre producción, ninguna IA lo hace por su cuenta). No
requiere deploy de la app ni cambia versión — es un cambio en Firebase, no en
`index.html`.

---

## v6.59 — 2026-07-13 — Claude (sesión 1, CORRIGE mismatch de versión + frases por arquetipo en vivo)
Arreglo de un error MÍO: al hacer v6.55 offline, sesión 2 ya había avanzado a 6.58 en la carpeta compartida;
mi sed de APP_VERSION (buscaba 6.54) falló, pero mi `printf version.txt` sí corrió → dejó version.txt=6.55
con APP_VERSION=6.58 (mismatch que rompe la auto-actualización) y lo pusheé sin querer. Detectado al leer el
lockstep. Corregido: los 3 (APP_VERSION/version.txt/sw.js) + footer a **6.59** consistentes. El FRASES_ARQ
(frases en ruta por arquetipo, de v6.55) queda sobre la base 6.58 de sesión 2, ahora sí bien versionado y
DESPLEGADO. Respeté el candado `EN-USO.md` (estaba LIBRE, lo puse OCUPADO y lo libero al terminar).
## v6.55 — 2026-07-13 — Claude (sesión 1, frases EN RUTA por arquetipo) ⚠️ ESCRITO OFFLINE, PENDIENTE DEPLOY
Internet caído (git push/deploy/API no responden). Se hizo TODO lo posible sin red: código local + `node`.
**Continuación de v6.54:** los arquetipos ya cambiaban el CHAT; ahora también cambian las FRASES EN RUTA.
- `FRASES_ARQ` (nuevo): frases con el sabor de cada arquetipo para subida/rápido/lento (los momentos donde
  más se siente la personalidad). Cubre entrenador, picaro, sabio, relajado, sensible, maternal, directo,
  relator, aventurero (los más distintos). El que no tenga banco para una categoría cae a las genéricas.
- `obtenerFraseUnica(categoria)` ahora prefiere `FRASES_ARQ[cat][pisteroPersonalidad]` si existe; si no,
  `poolPais(categoria)` de siempre. 100% ADITIVO — el comportamiento actual es el fallback, sin riesgo.
  Repeticiones rastreadas por pool separado (`categoria@arquetipo`) para no confundir índices.
**Verificado OFFLINE:** llaves balanceadas (0); simulación en Node de la selección → picaro/sabio sacan SU
frase, y cercano/directo-sin-banco caen a la genérica correctamente.
**⚠️ PENDIENTE cuando vuelva internet:** (1) `wrangler pages deploy` + `git push`; (2) probar en navegador
que la frase cambia al cambiar de personalidad. NO está en vivo todavía — el commit es local, listo para subir.
## v6.58 — 2026-07-13 — Claude (sesión 2, chips de modo en la esfera + gentilicio moto)

Reporte de Inty: "arregla los botones de modos arriba de la esfera están muy
pequeños y no se diferencian, el modo auto no puede ser modo viajero debe
ser motorizado."

**1. Chips de modo (fila de 4 íconos arriba de la esfera) — causa raíz: todos
se veían exactamente igual** (círculo gris de 38px, mismo borde blanco tenue,
solo cambiaba el emoji) y con 🚴 (ciclismo) vs 🚵 (MTB) a ese tamaño el emoji
casi ni se distinguía. Se rediseñó `renderModoRapidoEsfera()` y el CSS
`.es-modo-chip`:
- Tamaño del ícono: 38px → 48px.
- Cada modo ahora usa SU PROPIO color (el mismo `color.p` que ya existía en
  `ACTIVIDADES` y tiñe el resto de la app) como borde/relleno del chip —
  naranja (ciclismo), verde (MTB), café (trekking), azul (auto) — así se
  diferencian de un vistazo aunque el emoji sea parecido, no solo cuando
  están seleccionados.
- Se agregó una etiqueta corta de texto bajo cada ícono (`corto`, campo nuevo
  en `ACTIVIDADES`: "Ruta"/"MTB"/"Trek"/"Auto") para que no dependa solo del
  emoji.
- El seleccionado ahora se ve claramente distinto: opacidad completa, fondo
  teñido con su color, halo/glow y un leve zoom — antes solo cambiaba el
  borde y era sutil.

**2. "Modo auto no puede ser modo viajero, debe ser motorizado"** — el campo
`gentilicio` de `ACTIVIDADES` para `moto` decía `'viajero'` (usado en la
frase de Pistero "ahora te acompaño como viajero"). Se corrigió a
`'motorizado'`. De paso se corrigió también `verbo` ('viajando' →
'conduciendo', mismo campo, consistente con el cambio) y el label visible
('🏍️ Moto / Auto (viaje)' → '🏍️ Moto / Auto (motorizado)').

**Verificación real hecha:** servidor estático local + Browser pane.
Confirmado por inspección de estilos computados que los 4 chips renderizan a
48×48px con `border-color`/fondo correctos por modo (naranja `#fc4c02`,
verde `#5c8a3a`, café `#b5651d`, azul `#2563eb`), que el chip seleccionado
tiene opacidad 1 y los demás 0.5, y que `elegirActividad('moto')` mueve la
selección correctamente al chip "Auto". Confirmado que
`ACTIVIDADES.find(a=>a.id==='moto').gentilicio === 'motorizado'`. No se pudo
tomar captura de pantalla real en este sandbox (herramienta de screenshot
sin funcionar, limitación ya documentada en versiones anteriores) — queda
pendiente que Inty lo vea en su teléfono.

---

## v6.57 — 2026-07-13 — Claude (sesión 2, Pistero: ciclistas cerca, panorama por la zona, historia/mito del lugar)

Pedido de Inty: "sigamos ampliando, por ejemplo pistero busca ciclistas
cerca, algún panorama que hacer por esta zona, cuéntame otra historia de
este lugar, pueden ser mitos, leyendas, cómo se llama este lugar antes de,
cosas por el estilo que sea un cabrón con conocimiento."

**1. "Busca ciclistas cerca" — ya existía el disparador de voz pero no hacía
nada útil**, solo abría el radar en el mapa sin decir nada. Se agregó
`usuariosCercanosData` (array global nuevo, poblado en `subscribeToUsers()`
junto al array de marcadores existente `sm`, porque los marcadores de
Leaflet no exponen datos consultables limpios) y `_pisteroCiclistasCerca()`:
calcula distancia real con `calculateDistance()` (la misma función que usa
toda la app) a cada ciclista visible, filtra a 50km, ordena por cercanía y
dice los 3 más cercanos con nombre y distancia — o lo dice honestamente si
no hay nadie cerca, en vez de quedarse callado.

**2. "Algún panorama por esta zona" — no existía.** Se reusa `reportesData`
(la misma fuente que ya alimenta el aviso proactivo de peligros en
`avisarReportesCercanos()`) filtrando por categorías con sentido de
panorama (mirador, dato útil/picada, alojamiento — `CATS_PANORAMA`), a 25km,
ordenado por cercanía. Si no hay nada marcado por la comunidad en la zona,
lo dice honesto e invita a reportarlo, sin inventar nada.

**3. "Cuéntame una historia / mito / leyenda de este lugar" — ya existía
`contarAnecdotaDelLugar()` pero era SOLO automática** (dispara una vez por
zona al llegar) y no tenía ningún gatillo de voz. Se creó
`_pisteroHistoriaLugar(pedirMito)`, que reusa el mismo patrón ya probado en
producción (geosearch de Wikipedia en español + summary API, con el mismo
principio de "sin dato real cerca, mejor callar que inventar"). Si Inty pide
específicamente mito/leyenda, prioriza un resultado cuyo TÍTULO lo sugiera
(Wikipedia no permite filtrar geosearch por contenido) y si no encuentra
ninguno así, lo avisa honesto en vez de fingir que encontró un mito.

**Verificación real hecha:** las 3 frases nuevas quedaron enrutadas en
`handleVoiceCommand` con regex nuevas. Se armó un set de 11 frases de prueba
(9 positivas + 2 de control negativo: "llevame a santiago", "cuánto me
falta") y se verificaron los regex de forma standalone en Node (independiente
del cierre léxico de la app — ver limitación abajo), con 11/11 correctos,
incluyendo un caso real que el primer borrador del regex de historia NO
cubría ("cuéntame una leyenda de por aquí") y que se corrigió antes de dar
por terminado. Los cuerpos de `_pisteroCiclistasCerca()` y
`_pisteroPanoramaCerca()` se verificaron por revisión manual línea a línea
(no por ejecución dinámica — ver limitación abajo), confirmando que reusan
exactamente el mismo patrón cálculo-de-distancia/filtro/orden que
`avisarReportesCercanos()`, ya en producción, y que las claves de
`REPORTE_CATS` (`.e`, `.l`) usadas existen tal como se referencian.

**Limitación real de este sandbox, documentada honestamente:** el código de
la app vive dentro de un IIFE (`(function(){...})()`, línea ~1799) —
`currentUserLocation`, `reportesData`, `usuariosCercanosData`, `h()`, etc. son
privados a ese cierre. Intentar simular datos vía `window.currentUserLocation
= ...` desde fuera (como se hizo para probar `_pisteroDecirClima` antes) NO
llega a la variable real: crea una propiedad de `window` sin relación con el
binding léxico interno, y las funciones reales nunca la ven (mismo tipo de
problema, a nivel de arquitectura, que causó el incidente real de Firestore
documentado en v6.4x — pero esta vez detectado ANTES de escribir nada mal,
no después). No hay forma de mockear el estado interno desde fuera sin tocar
el código fuente; por eso la verificación de estas dos funciones fue manual
en vez de dinámica. Queda pendiente probarlas con datos reales en el
teléfono de Inty.

---

## v6.56 — 2026-07-13 — Claude (sesión 2, Pistero se quedaba callado con charla casual, y el clima no entendía día/lugar)

Dos reportes reales de Inty: "le pregunté a Pistero cómo estaba y se quedó
callado, ¿qué clase de amigo hace eso?" y "le pregunté por el clima de mañana
en X y no respondió."

**1. "Cómo estás" — causa raíz encontrada: la frase estaba LITERAL en la lista
de palabras que la app descarta como ruido** (`stop`, al final de
`handleVoiceCommand`), tratada exactamente igual que "hola" u "ok" sueltos —
sin ninguna respuesta real. No era un bug de que algo fallara, era que ni
siquiera se la tomaba como una pregunta de verdad. Se sacó de esa lista y se
creó `FAQ_CHARLA` (nuevo, antes de `FAQ_APP`/`FAQ_CICLISMO` en
`responderPreguntaGeneral`, que ya corre bien temprano en el enrutador de
voz): "cómo estás/andas", agradecimientos, despedidas, cariño, risas, y
saludos — cada categoría con VARIAS respuestas al azar (no siempre la misma,
para no sonar a grabación), con la personalidad de siempre.

**2. Clima con día y lugar específico — no existía.** `_pisteroDecirClima()`
solo sabía el clima de AHORA en la ubicación ACTUAL; ignoraba por completo
"mañana"/"pasado mañana" y cualquier lugar mencionado ("en Valparaíso"). La
API que ya se usaba (`climaDeZona`) YA traía el pronóstico de 3 días
completo — solo faltaba usarlo. Ahora detecta el día (hoy/mañana/pasado
mañana) y, si mencionas un lugar, lo geocodifica con el mismo buscador que
usa toda la app (`geocodeDestino`) y trae el pronóstico de ESE lugar, no del
tuyo. Con cuidado de no confundir "en la tarde/noche" con un lugar real.

**Verificación real en navegador:** charla casual probada con las frases
exactas reportadas más variantes ("como estas", "como andas", "gracias
crack", "chao nos vemos", "hola", "te quiero pistero") — todas responden, con
personalidad, sin repetir siempre lo mismo. Encontré y corregí un bug propio
en la prueba: el patrón de despedida estaba anclado exacto (`^...$`) y no
reconocía "chao nos vemos" (dos despedidas juntas), corregido a búsqueda de
palabra. El clima se probó con **datos reales de Open-Meteo**, no
simulados: "cómo está el clima" (19° nublado, hoy, tu zona), "clima mañana"
(sin lugar, pronóstico real de mañana), "el clima de mañana en Valparaíso"
(geocodificó Valparaíso de verdad, trajo SU pronóstico), "clima en Viña del
Mar pasado mañana" (geocodificó Viña del Mar, día correcto, con el aviso de
lluvia cuando correspondía).

**Coordinación:** marqué el candado en `EN-USO.md` antes de tocar
`handleVoiceCommand` (zona compartida con sesión 1), sin commits nuevos de
ellos mientras trabajé — se libera al terminar esta entrada.

**Versión:** APP_VERSION, version.txt y footer → 6.56. `sw.js` CACHE → v656.

---

## v6.55 — 2026-07-13 — Claude (sesión 2, cronómetro completo: pausa manual en GPS libre + vueltas + reinicio)

Reporte real de Inty tras probar en su teléfono: "aún falta un cronómetro."
Investigando, el cronómetro YA existía (GPS libre y navegación a destino),
pero le faltaban dos cosas concretas que Inty pidió al preguntarle:

**1. Pausa manual solo existía en navegación a destino, no en GPS libre**
(el modo que más se usa, según el propio comentario del código). `togglePausaViaje()`
solo tenía un botón conectado (`btnPausaViaje`, en `#nav-screen`). Ahora un
mismo botón vive en ambas pantallas (`btnPausaDash` nuevo en el dashboard) y
la función actualiza los dos botones y los dos badges de pausa a la vez — no
importa desde cuál pantalla la tocaste.

**2. Sistema de vueltas (lap) — no existía, nuevo de cero.** `marcarVuelta()`
registra el tiempo transcurrido desde la última vuelta (o desde el inicio si
es la primera) en `vueltasRegistradas`, sin depender de segmentos
predefinidos en el mapa — sirve para comparar tramos o hacer series. `verVueltas()`
muestra la lista completa en el modal genérico de la app. Se resetea al
iniciar cada viaje nuevo (mismo patrón que el resto del estado de viaje).

**3. Reinicio manual del cronómetro** (`reiniciarCronometro()`, con
confirmación): pone el tiempo en cero sin tocar distancia ni el track — para
cuando terminas un calentamiento y quieres arrancar a cronometrar el entreno
de verdad sin apagar y prender el GPS entero.

Los tres controles (⏸️ Pausar, 🏁 Vuelta, 📋 Ver vueltas, 🔄 Reiniciar) están
ahora disponibles tanto en el dashboard (GPS libre) como en la pantalla de
navegación a destino.

**Verificación real en navegador:** simulé un viaje con vueltas marcadas en
momentos distintos (confirmé tiempos parciales y totales correctos); probé
`togglePausaViaje()` confirmando que actualiza AMBOS botones en las dos
direcciones (pausar/reanudar); probé `verVueltas()` (el modal muestra la
lista con los datos correctos) y `reiniciarCronometro()` completo, incluida
la confirmación (`lpConfirmar`), verificando que el tiempo y las vueltas se
resetean pero la distancia queda intacta.

**Nota de coordinación:** esta sesión trabajó en paralelo con "sesión 1" (otra
cuenta Claude, ver acuerdo arriba en `PENDIENTES.md`) sobre el mismo
`index.html`. Antes de tocar nada, verifiqué `git status`/`git log` — confirmé
que mi trabajo de la ronda anterior (manos libres en nav, fix de km parado,
ruta alternativa por voz) ya había sido rescatado y commiteado por sesión 1
(`3da21e4`, con crédito correcto), y que no había conflicto con su trabajo de
voz/personalidad (v6.53 analytics, v6.54 doce arquetipos). Revisé también que
no quedaran funciones duplicadas a nivel global por el trabajo concurrente —
ninguna encontrada (las 4 coincidencias de nombre eran funciones locales
anidadas en scopes distintos, no conflictos reales).

**Versión:** APP_VERSION, version.txt y footer → 6.55. `sw.js` CACHE → v655.

---

## Infra Android — 2026-07-13 — Claude (sesión 2, pipeline de .aab firmado para Google Play)

Inty confirmó que Google ya aprobó la cuenta de desarrollador. Con eso
desbloqueado, faltaba lo último técnico para poder subir la app a Play Store:
un build de RELEASE firmado (`.aab`) — el pipeline existente
(`build-apk.yml`) solo generaba un `.apk` de debug sin firmar, útil para
sideload pero que Play Console rechaza.

**Qué se hizo:**
1. Generado el keystore de release real (`librepedal-release.keystore`, RSA
   2048, válido hasta 2053-11-28 — más que la vida útil esperada de la app,
   siguiendo la recomendación de Google). **Nunca se sube al repo** (agregado
   a `.gitignore`: `*.keystore`, `*.jks`, `MI-KEYSTORE-PLAYSTORE.txt`).
2. `scripts/patch-android-signing.js` (nuevo): tras `npx cap add android`,
   inyecta el `signingConfig` en `android/app/build.gradle` leyendo el
   keystore y las contraseñas desde variables de ENTORNO (nunca hardcodeadas
   en el archivo generado ni en el repo) — y de paso deriva `versionCode`/
   `versionName` de `version.txt` (ej. "6.52" → versionCode 6052), así cada
   build de release ya trae automáticamente un código mayor al anterior
   (Play Store lo exige) sin que nadie tenga que acordarse de subirlo a mano.
3. `.github/workflows/build-aab-release.yml` (nuevo, separado de
   `build-apk.yml`): se lanza a mano desde GitHub (`workflow_dispatch`), no
   en cada push — un release firmado no debe generarse solo porque alguien
   subió un cambio cualquiera. Decodifica el keystore desde un secret en
   base64, corre `./gradlew bundleRelease`, y borra el keystore del runner
   apenas termina (no debe quedar ni como artefacto descargable).
4. `MI-KEYSTORE-PLAYSTORE.txt` (nuevo, local, gitignored): instrucciones para
   Inty — cómo respaldar el keystore, los 4 secrets exactos que hay que
   agregar en GitHub y sus valores, y advertencia explícita de que perder
   esta llave significa no poder actualizar la app nunca más en Play Store.

**Verificación real (no solo "debería funcionar"):** se corrió el pipeline
COMPLETO en local con el keystore real — `npm install`, `cap add android`,
`patch-android-signing.js`, y `./gradlew bundleRelease` con las 4 variables
de entorno reales. Resultado: `BUILD SUCCESSFUL in 2m 2s`, generó
`app-release.aab` (3.4 MB). Se verificó la firma de forma independiente con
`jarsigner -verify -certs`: confirmó "The signer certificate will expire on
2053-11-28", coincide exacto con la fecha del keystore generado — prueba
directa de que el `.aab` quedó firmado con la clave correcta, no solo de que
el build no tiró error. El workflow de CI usa exactamente los mismos pasos;
falta la confirmación final corriéndolo en GitHub Actions (necesita que Inty
agregue los 4 secrets primero).

**Pendiente de Inty:** agregar los secrets en GitHub (valores en
`MI-KEYSTORE-PLAYSTORE.txt`), respaldar el keystore en un lugar seguro fuera
de este computador, y lanzar el workflow una vez para la confirmación final.

---

## v6.54 — 2026-07-13 — Claude (sesión 1, +6 arquetipos de personalidad = 12)
Inty pidió mínimo 10 personalidades "tal cual la gente" (sensibles, sin bromas, motivadores, zen, distintos).
Descubrí que sesión 2 YA tenía la infraestructura: Worker `TONOS[u.personalidad]` (6) + selector
"🎭 Personalidad de Pistero" (`PERSONALIDADES`/`elegirPersonalidad`) + persistencia + envío en el payload.
Protocolo (no duplicar, extender): agregué 6 arquetipos a AMBOS lados (mismo id): sensible (empático sin
bromas), directo (serio al grano), sabio (reflexivo), relator (épico deportivo), picaro (competitivo/te pica),
maternal (protector). Total 12. + `trackEvent('voz', id)` al elegir → la analytics (v6.53) mide cuál gusta
más (para decidir premium). Worker redeployado (TOKEN_IA; el token Pages no despliega Workers).
**Evidencia:** POST real al Worker con 2 arquetipos nuevos → tonos claramente distintos: "directo" responde
técnico y al grano ("0,5 L por hora"); "picaro" tutea y pica ("Che Inty... si vas a darle con todo, 3 litros").
node --check worker.js OK, llaves index 0, 12 TONOS. No probado el selector en navegador (herramienta caída).

## v6.53 — 2026-07-13 — Claude (sesión 1, base de ANALYTICS + rescate de sesión 2)
**Pedido de Inty:** medir qué usa el usuario, dónde pasa tiempo, su relación con la app, y verlo en su
panel de admin — para después dejar en premium las voces/arquetipos/funciones más exitosas.
**Antes: rescate.** El working tree tenía 72 líneas sin commitear de sesión 2 (otra cuenta Claude, sin
créditos/GitHub) — manos libres, fix de kilometraje (ruido GPS parado sumaba 0,3 km, ahora exige sp>0),
ruta alternativa por voz. Verificadas sanas (llaves 0, funciones completas) y commiteadas/pusheadas con su
crédito (commit 3da21e4) para no perderlas antes de tocar el archivo.
**Analytics (nuevo):**
- `trackEvent(grupo,clave,cuanto)` + buffer en memoria + flush cada 25s / en `visibilitychange` (hidden) /
  `pagehide`. Escritura **atómica** a `usage/{cu}` con `FieldValue.increment` en objeto ANIDADO + `{merge:true}`
  (no dotted-keys, que en `.set()` no anidan) — barato y sin carreras (Principio del protocolo maestro).
- `_trackPantalla(id)` enganchado en `cv()`: cuenta visitas por pantalla y acumula el TIEMPO en cada una.
- Eventos de función: voz (`handleVoiceCommand`), navegación (`calculateAndStartNavigation`), chat Pistero.
- `verAnaliticasAdmin()` (solo ADMIN_ID) + botón "📊 Analíticas de uso" en el panel admin: agrega todos los
  docs `usage` y muestra rankings de pantallas, tiempo (min), funciones, voz + activos 7 días.
**Verificación:** `node`/llaves balanceadas (0), trackEvent 6 usos, 3 eventos de función, flush atómico, y los
elementos de modal (modalTitle/modalContent/userModal) existen. NO probado en navegador (herramienta caída) —
honestidad radical (Principio #5): la lógica y sintaxis están verificadas; falta ver los datos reales fluir.
Firebase Analytics (GA4) recomendado aparte para retención/embudos (gratis) — anotado en PENDIENTES.

## v6.52 — 2026-07-13 — Claude (sesión 2, mapas libres estilo Google Maps + dos bugs reales de datos: km perdidos del ranking y ruta perdida con pantalla apagada)

Pedido grande de Inty con varias partes, dos de ellas bugs reales con evidencia
concreta de otros usuarios.

**1. BUG REAL: "un amigo lleva varios km y no se reflejan en el Top 100."**
Causa raíz: el campo `km` en Firestore (`users/{uid}.km`, lo único que lee la
consulta del ranking) solo se actualizaba desde `sincronizarStats()`, y esa
función SOLO se llamaba en eventos sueltos de Darma (desbloquear tienda,
récord de segmento, etc.) o al apagar el GPS libre manualmente. Alguien que
solo navega de un punto a otro (`calculateAndStartNavigation`/`finishTrip`/
`endNavigation`) podía terminar viajes enteros — acumulando distancia real y
correcta en su perfil local — sin que ese número LLEGARA JAMÁS a la nube.
Localmente todo se veía bien (por eso no era obvio); en el ranking, invisible
o desactualizado. Arreglado en dos capas: (a) sync automático cada ~60s
mientras hay distancia acumulándose, agregado directo en `au()` (el punto
central por el que pasan TANTO el GPS libre COMO la navegación a destino, así
no hay ningún camino que se escape), y (b) una llamada final de red de
seguridad en `endNavigation()` (el único punto de salida de cualquier
navegación) para los viajes cortos que terminan antes del primer sync de 60s.

**2. BUG REAL: "se apagó la pantalla, se encendió, y la ruta ya no estaba
— tocó volver a ponerla a mano."** Causa: los navegadores móviles (Chrome
sobre todo) pueden "descartar" una pestaña en segundo plano con la pantalla
apagada para liberar memoria, borrando TODO el estado que vivía solo en
variables de JavaScript (destino, geometría de la ruta, progreso). El
WakeLock evita que la pantalla se apague SOLA por inactividad, pero no evita
que el usuario la apague a mano con el botón físico — ahí no hay wake lock
que valga, y ese es justo el escenario que describió Inty. No se puede
evitar que el navegador descarte la pestaña (esa decisión es del sistema, no
de la app), así que la solución es sobrevivirlo: se guarda en localStorage
(throttleado, cada fix de `_navPosUpdate`) lo esencial del viaje activo
—destino, distancia y track ya recorridos, el id del trip si existía uno—, y
al arrancar la app de nuevo (sesión guardada o login), si hay un registro
reciente (menos de 3 horas) lo retoma SOLO, sin preguntar nada (preguntar
obligaría a tocar la pantalla justo manejando o pedaleando, que es lo que
motivó todo el pedido), recalculando la ruta desde la posición actual pero
restaurando el odómetro y el track ya hecho — no arranca de cero. Se limpia
solo al terminar un viaje de forma normal (`endNavigation`).

**3. Mapas libres, como Google Maps.** El mapa de navegación se re-centraba
solo en CADA fix de GPS (cada 1-2 segundos), peleando con cualquier intento
de moverlo a mano — apenas soltabas el dedo, el próximo fix lo tironeaba de
vuelta. Ahora sigue tu posición sola mientras no lo tocas (como siempre), pero
apenas lo arrastras se suelta del seguimiento automático para que explores
libremente, y aparece un botón flotante 🎯 para retomarlo cuando quieras. Se
agregó el mismo botón 🎯 en el Mapa Global (comunidad), que ahí no tenía
ningún seguimiento automático que soltar, solo hacía falta la forma rápida de
volver a tu posición.

**4. Alternativas de ruta, como Google Maps.** Se agregó `alternatives=true`
al pedido a OSRM; si devuelve más de un camino razonable, aparece un selector
simple (reutiliza el modal genérico de la app) con distancia y tiempo de cada
opción ANTES de arrancar a navegar. Con una sola ruta (lo normal en
cicloturismo rural) no aparece nada — cero fricción extra para el caso de
siempre. El recálculo automático por desviación de ruta (cuando te sales del
camino a mitad de viaje) sigue sin alternativas a propósito: interrumpir con
un selector en pleno recálculo automático sería muy molesto.

**5. Accesos directos de modo en la esfera.** El modo de actividad
(ciclismo/MTB/trekking/moto) solo se podía cambiar desde Preferencias, muy
escondido para algo que se usa seguido (quien anda a veces en bici y a veces
en auto lo cambia bastante más que una vez). Fila compacta de 4 íconos justo
debajo del título en la pantalla de la esfera, sin invadir el gesto de girar
la esfera con el dedo (el hueco entre íconos no bloquea el toque, solo cada
ícono es clicable).

**Verificación:** sintaxis con `node --check` (0 errores); en navegador:
simulé el escenario exacto del bug de velocidad — no, de km — probé que
`_guardarEstadoNavParaReanudar`/`_intentarReanudarNavegacion` guardan,
restauran (destino, distancia acumulada, track, trip id) y expiran (>3h)
correctamente, y que `endNavigation` limpia el registro al terminar normal;
probé que arrastrar el mapa de navegación suelta el auto-seguimiento y el
botón 🎯 lo retoma; probé el selector de alternativas de ruta completo
(2 opciones simuladas, elección de la segunda, resolución correcta); probé
`_mapaRecentrar()` con `currentUserLocation` mockeado; probé los 4 chips de
modo en la esfera (selección visual correcta, cambia `actividadTipo` real,
no bloquea el área vacía del gesto de girar).

**Versión:** APP_VERSION, version.txt y footer → 6.52. `sw.js` CACHE → v652.

---

## v6.51 — 2026-07-13 — Claude (sesión 2, rigor en la velocidad: reporte real de 70 km/h mostrado como más de 100)

Reporte concreto y verificable de Inty: le contaron que iban en auto a 70 km/h
reales y la app marcaba más de 100. Pidió rigurosidad en el tema.

**Causa raíz encontrada:** la velocidad en pantalla (`#spd` en GPS libre,
`#navSpeed` navegando) se calculaba EXCLUSIVAMENTE comparando posiciones GPS
consecutivas (`velocidadVentana()`, centroide de los últimos ~10-15s) e
ignoraba por completo `coords.speed` — la velocidad que el propio chip GPS mide
por efecto Doppler, mucho más precisa que restar posiciones, sobre todo a
velocidad de auto: el margen de error normal de un fix GPS (5-20 m) pesa poco
al pedalear despacio, pero pesa mucho sobre una ventana corta cuando ya vas
rápido — ahí es donde un poco de ruido de posición infla el promedio muy por
encima de la velocidad real. Además, esa ventana de 2-4 puntos no tenía
ninguna protección contra un solo fix con rebote de señal (multipath, típico
en autopista/túneles/cañones urbanos), que podía colarse y corromper el
promedio completo.

**Fix (dos capas):**
1. **Se prioriza `coords.speed`** (Doppler del chip GPS) para el NÚMERO exacto
   una vez que el método por posición ya confirmó que hay movimiento real
   (`_velocidadHardware()` + `_velMaxPlausibleKmh()` como techo de seguridad).
   El método por posición sigue siendo la fuente de verdad para decidir SI te
   estás moviendo (protege contra la "velocidad fantasma" estando parado en
   casa, un bug ya resuelto antes que no se quería reabrir) — solo cambia CUÁL
   número se muestra una vez que ya se confirmó movimiento real. Si el
   dispositivo no entrega `coords.speed` (pasa en algunos navegadores/chips),
   se cae de vuelta al método por posición de siempre, sin cambios.
2. **Filtro de saltos implausibles** (`_filtrarSaltoVentana`) antes de que un
   punto entre a la ventana de posición: si el salto desde el último punto
   aceptado implica una velocidad imposible para el modo actual, se descarta
   —mismo principio que ya protegía el kilometraje acumulado
   (`_saltoEsPlausible`), ahora también protege la velocidad en pantalla.

**Verificación en navegador (simulando fixes de GPS, no un dispositivo real):**
70 km/h reales (`coords.speed`=19.44 m/s) con ruido de posición superpuesto
que antes habría inflado el promedio — ahora muestra 70 exacto, no más de
100; parado en casa con `coords.speed` reportando ruido fantasma (2.5 m/s) sin
desplazamiento real de posición — sigue mostrando 0 (protección intacta); sin
`coords.speed` disponible (null) — cae correctamente al respaldo por posición;
un fix con salto imposible (2 km en 1 segundo) intercalado entre fixes
normales — se descarta del historial y no corrompe la velocidad mostrada.

**Versión:** APP_VERSION, version.txt y footer → 6.51. `sw.js` CACHE → v651.

---

## v6.50 — 2026-07-13 — Claude (sesión 2, consulta de peligros en una ruta: "¿hay policías en mi ruta a X?")

Pedido de Inty, con ejemplo concreto: sale en auto y le pregunta a Pistero
"dime si hay policías en mi ruta de A hasta B", y Pistero debe saber dónde
buscar información real y contestar si hay o no hay.

**Aclaración honesta primero (importante):** no existe ninguna fuente de datos
policiales en vivo, ni pública ni gratuita, en ningún país — ni siquiera Waze
"sabe" dónde está la policía por magia, lo sabe porque millones de usuarios se
lo reportan en tiempo real. Acá funciona igual: la única fuente real y honesta
es el mapa comunitario que la propia app ya construye con los reportes de otros
ciclistas/viajeros (`reportes`, ampliado en v6.49). Pistero nunca inventa ni
"cree" que hay o no hay algo — responde según lo que la comunidad reportó, y
si no hay nada, lo dice explícitamente en vez de sonar como que garantiza que
está despejado.

**Cómo funciona:** nueva función `consultarPeligrosEnRuta(categoria, destino)`:
geocodifica el destino (reusando `geocodeDestino`, el mismo buscador de toda la
app), calcula la ruta real con OSRM desde tu posición actual (respetando el
perfil de tu modo de actividad — auto/moto usa perfil de manejo, no de bici),
y revisa los reportes de esa categoría dentro de su vigencia (ver v6.49) que
caigan a menos de 600 m de cualquier punto del trazado. Si ya estás navegando
y no das un destino nuevo, usa la ruta que ya tienes activa ("¿hay taco en mi
ruta?"). Contesta con cuántos reportes hay, hace cuánto y en qué comuna
aproximada — o, si no hay nada, aclara que eso es lo que la comunidad marcó,
no una garantía.

**Diferenciar PREGUNTA de AVISO** fue la parte más delicada: "hay pacos en mi
ruta a Valparaíso" y "hay pacos en el camino" comparten casi las mismas
palabras, pero la primera es una pregunta (hay que consultar) y la segunda es
un aviso (hay que publicarlo, como ya hace v6.49). Se resolvió exigiendo que la
consulta tenga un destino explícito ("...hasta/hacia/a X") O una frase de
pregunta inequívoca ("sabes si hay", "dime si hay", "avísame si hay"...) — sin
ninguna de las dos, se trata como aviso normal (el comportamiento de siempre,
sin regresión). Conectado en los mismos dos canales que los avisos: voz
(`handleVoiceCommand`) y texto (`preguntarPistero`), verificado con el ejemplo
literal de Inty ("hey pistero dime si hay policías en mi ruta de a hasta
Valparaíso") antes de dar por bueno el diseño.

**Bug encontrado y corregido durante la propia verificación:** el chequeo de
cercanía entre la ruta y los reportes saltaba de 3 en 3 los puntos del trazado
(pensado para el aviso proactivo por GPS, que sí corre en cada fix y necesita
ser barato). Acá es una consulta puntual bajo pedido, no hace falta ahorrar —
y saltar puntos podía dejar huecos de cobertura en tramos rectos con pocos
vértices OSRM. Se sacó el salteo: ahora revisa el trazado completo.

**Verificación:** sintaxis con `node --check` (0 errores); en navegador:
detección correcta de consulta-vs-aviso en los 6 casos probados (incluido el
ejemplo literal de Inty); flujo completo con geocodificación y ruta REALES
(Santiago→Valparaíso, perfil de manejo) contra reportes de prueba en memoria —
encontró el reporte vigente cercano, ignoró el vencido, respondió
honestamente "no tengo reportes" para una categoría sin datos, y manejó bien
un destino inexistente; la variante "en tu ruta" (sin destino, navegación
activa) también verificada tras corregir el bug de cobertura.

**Versión:** APP_VERSION, version.txt y footer → 6.50. `sw.js` CACHE → v650.

---

## v6.49 — 2026-07-13 — Claude (sesión 2, reportes de peligro por voz/texto + más vocabulario por modo)

Pedido de Inty: ampliar más las bromas por modo, y agregar reporte de peligros
(pacos, animales muertos, objetos en la vía, tacos, accidentes) por voz Y por
escrito, con Pistero avisando proactivamente — "siempre un paso adelante... con
gracia y picardia, mucha simpatía".

**1. Cinco categorías nuevas en el mapa comunitario** (`REPORTE_CATS`): control
policial, animal en la vía, objeto en la vía, taco/congestión, accidente. Ya
aparecen automáticamente en el formulario escrito "Reportar en Ruta" (no hubo
que tocar esa UI, itera las categorías dinámicamente).

**2. Reporte rápido por VOZ Y por TEXTO, sin formulario.** Nueva tabla
`REPORTE_VOZ` con un patrón de habla chilena natural por categoría ("pacos",
"tombos", "carabineros"... / "animal atropellado"... / "piedra en la vía"...
/ "taco", "congestión"... / "accidente", "choque", "atropello"...). Se conectó
en dos puntos: `handleVoiceCommand` (voz, cualquiera de los 3 caminos: mic
normal, manos libres, chat de Pistero por voz) y `preguntarPistero()` (texto
escrito en el chat) — mismo detector (`_detectarReporteVoz`), sin duplicar
lógica. Al detectar, NO se le pasa la frase a la IA ni se abre ningún
formulario: se publica directo en el mapa comunitario (`reportarPorVozRapido`)
y Pistero confirma con una frase corta y con gracia (ej. "Anotado, ojo con los
pacos. Gracias por el dato, colega." / "Marcado con prioridad. Ojalá estén
todos bien..."), la misma personalidad de siempre.

**3. Pistero avisa PROACTIVAMENTE al acercarte a un peligro reportado**, no
solo cuando alguien pregunta. Mismo patrón que el aviso de agua/miradores que
ya existía (`avisarPuntosCercanos`), pero para reportes de peligro
(`avisarReportesCercanos`), con una diferencia clave: cada categoría vence a su
propio ritmo (`REPORTE_VIGENCIA_MS`) — un taco de hace 3 horas ya no sirve
(vence a las 2h), pero un objeto tirado en la vía puede seguir siendo relevante
2 días después. Un reporte vencido nunca se anuncia. Conectado tanto al GPS
libre (`ug()`) como a la navegación a destino (`_navPosUpdate`), y el set de
"ya avisado en este viaje" se resetea al iniciar cada viaje nuevo (mismo
patrón que los avisos de puntos de interés).

**4. Más variedad de bromas por modo** (pedido explícito: "seamos versátiles y
entretenidos, esa es nuestra marca"). Las categorías de MTB/trekking/moto que
quedaron un poco escuetas en v6.48 (algunas con solo 3-6 frases) ahora tienen
6-10 frases cada una, mismo tono y gracia, con vocabulario que sigue aplicando
con sentido a lo que se está haciendo en cada modo (sendero técnico para MTB,
mochila/rodillas para trekking, motor/bencina para moto).

**Nota de proceso — un error propio, encontrado y corregido antes de
desplegar:** al verificar `reportarPorVozRapido()` en el navegador, intenté
simular Firestore reasignando `window.db` a un mock; como `db` es una variable
`let` de módulo (no una propiedad de `window`), la reasignación no interceptó
nada y la función usó la base de datos REAL de producción, publicando un
reporte de prueba falso en la colección `reportes` (categoría "policía",
usuario ficticio "Testeador"). Lo detecté de inmediato revisando los últimos
documentos de la colección, confirmé el ID (`vWGt2Ie8cX78Pj87O5DD`) y lo
eliminé antes de seguir — verificado que ya no existe. De paso encontré (sin
tocar) que ya había un documento de prueba antiguo ajeno a esta sesión
("prueba de auditoria", usuario "qa_test") en la misma colección — no es de
esta sesión, queda anotado por si Inty quiere limpiarlo.

**Verificación:** sintaxis con `node --check` (0 errores); en navegador:
detección correcta de las 5 categorías desde frases naturales variadas
(incluida una conjugación que fallaba al principio — "atropellaron" no
calzaba con el regex original que solo cubría "atropelló/atropello/atropellado",
corregido a un patrón de raíz más amplio y reverificado); frases sin relación
(clima, destino) NO disparan ningún reporte; el aviso proactivo respeta la
vigencia por categoría (un reporte vencido no se anuncia, uno vigente y cercano
sí, y no se repite dos veces en el mismo viaje); las 10 categorías (5 antiguas
+ 5 nuevas) aparecen correctas en el formulario escrito; los tres modos
(mtb/trekking/moto) cargan sus pools ampliados sin categorías vacías.

**Versión:** APP_VERSION, version.txt y footer → 6.49. `sw.js` CACHE → v649.

---

## v6.48 — 2026-07-13 — Claude (sesión 2, manos libres + vocabulario por modo de actividad)

Los dos pendientes que quedaron anotados en v6.47.

**1. Manos libres (escucha continua).** Pedido explícito y con urgencia de
seguridad: "si vas en bicicleta o manejando no hay tiempo para estar apretando
el botón del micrófono, no tiene lógica". Hasta ahora los tres caminos de voz de
la app (mic principal, chat de Pistero, plugin nativo del APK) eran los tres
`continuous=false` — push-to-talk puro, cero escucha continua.

Se agregó un modo "Manos libres" (toggle nuevo en Ajustes, `#btnManosLibres`,
persistido en `localStorage.lp_manos_libres`) que activa un `SpeechRecognition`
con `continuous=true` que se reinicia solo cada vez que el navegador lo corta
(el navegador corta la escucha continua cada cierto rato incluso con esa opción
activada — es una limitación conocida de la Web Speech API, no un bug propio).
Con el modo activo, Pistero NO responde a cualquier cosa que se diga cerca del
teléfono — solo actúa cuando lo llaman por su nombre ("Pistero, ..."), para no
interrumpir una conversación normal entre ciclistas. La única excepción es la
orden de callarse ("cállate"/"silencio"/etc.), que funciona SIEMPRE, sin
necesitar el nombre antes, porque es la orden más urgente y no puede tener
fricción. Para el APK instalado (plugin nativo, que no soporta un modo
continuo real) se simula reiniciando la captura de a una apenas termina la
anterior.

Coordinación: el micrófono del dispositivo solo admite una captura a la vez,
así que el modo continuo se pausa automáticamente (`_pausarManosLibres()`)
cada vez que se usa el botón de mic normal o el mic del chat de Pistero, y se
reanuda solo (`_reanudarManosLibres()`) al terminar esa captura puntual — antes
de este cambio, dos instancias de `SpeechRecognition` intentando usar el mic al
mismo tiempo se habrían peleado por el micrófono.

**Verificación:** sintaxis con `node --check` (0 errores); en navegador, con
`SpeechRecognition` mockeado, confirmé: extracción correcta del comando después
de "Pistero" (con coma, con dos puntos, sin nada, y con muletillas antes como
"oye pistero..."); frases sin la palabra "Pistero" se ignoran sin disparar nada;
"cállate"/"silencio" funcionan con y sin el nombre antes; el auto-reinicio tras
un corte del navegador crea una nueva instancia sola (sin intervención); pausa
y reanudación al usar el mic normal funcionan y dejan el estado consistente; el
botón de Ajustes refleja ON/OFF correctamente en ambas direcciones.

**2. Vocabulario específico por modo de actividad.** Las frases aleatorias de
Pistero (ritmo lento/normal/rápido, parado, subidas, bajadas, motivacionales,
zona urbana, reflexiones profundas) eran 100% de ciclismo ("pedaleas", "cadena",
"bicicleta") sin importar el modo elegido — sin sentido si el modo activo era
trekking o moto/auto. Se agregó `FRASES_POR_MODO` con sets completos y propios
para `mtb`, `trekking` y `moto` (mismo tono chileno y la misma gracia de
siempre, pero con vocabulario de sendero técnico, caminata y ruta en auto/moto
según corresponda); el modo `ciclismo` sigue usando el sistema de frases por
país que ya existía, sin cambios. `poolPais()` ahora consulta primero
`actividadTipo` antes de la lógica de país.

De paso, encontré y arreglé un bug asociado: los umbrales de "vas lento/normal/
rápido" estaban fijos en 8/16 km/h (calibrados para bici) sin importar el modo
— en moto, cualquier velocidad real de ruta (40-100 km/h) siempre calificaba
como "extremadamente rápido", y caminando, cualquier paso normal (4-5 km/h)
siempre calificaba como "lento". Se agregó `_ritmoUmbrales()` con umbrales
propios por modo (trekking 3/7, mtb 6/14, moto 20/90 km/h; ciclismo mantiene
8/16 sin cambios) y se aplicó en los tres puntos que usaban el umbral fijo.

**Verificación:** sintaxis con `node --check` (0 errores); en navegador,
confirmé que cada modo devuelve su propio set completo (9 categorías, todas con
contenido, ninguna vacía) y que los umbrales por modo son los esperados.

**Versión:** APP_VERSION, version.txt y footer → 6.48. `sw.js` CACHE → v648.
Desplegado a librepedal.cl y confirmado en vivo (`version.txt` → 6.48).

---

## v6.47 — 2026-07-13 — Claude (sesión 2, popup del mapa invisible + "cómo está el clima" armaba un viaje falso)

Dos reportes directos de Inty, los dos reales:

**1. "Recuadro blanco sin información" al ver a otro ciclista en el mapa.** Ningún
popup del mapa (ni los de MapLibre ni los de Leaflet, esta app usa ambos según la
pantalla) fijaba un color de texto propio — heredaban el `color:#fff` del `body`.
El fondo del popup es blanco por defecto de la propia librería: texto blanco sobre
fondo blanco, invisible. Solo se alcanzaba a ver el link naranja (que sí tenía
color inline), por eso no se veía TOTALMENTE vacío, solo sin la info principal
(nombre del ciclista, título del punto, etc). Arreglado con una sola regla CSS
global (`.maplibregl-popup-content,.leaflet-popup-content{color:#1a1a2e}`) en vez
de parchar cada popup uno por uno — corrige TODOS los popups actuales y futuros
de una vez.

**2. "Cómo voy a ver el clima" / "cómo está el clima" armaban un viaje falso a un
lugar llamado literalmente "el clima" (o la IA general "no sabía" responder).**
El enrutador de voz no tenía ningún manejador para clima — frases con "voy a" o
"como" caían en el regex genérico de destino/pregunta antes de llegar a algo que
supiera qué hacer. Se agregó un manejador de clima BIEN AL PRINCIPIO del enrutador
(antes del regex de destino), que responde con datos reales de Open-Meteo (la
misma API que ya usa el resumen de ruta), no con lo que la IA general "cree" que
hace el clima ahí. Cuidado especial: "cuánto tiempo me falta" NO debe activar
clima (es sobre duración, no clima) — el patrón exige "clima"/"temperatura"/
"va a llover"/"cómo está o anda el tiempo" explícitos, no un "tiempo" suelto.

**Verificación real en el navegador:** las 5 frases reportadas/plausibles
("como voy a ver el clima", "como esta el clima", "que clima hace", "va a
llover", "cual es la temperatura") activan el clima y NUNCA abren la pantalla de
viajes; probado de punta a punta con fetch real a Open-Meteo (respondió "14
grados y nublado", datos reales de Santiago en el momento de la prueba); y
confirmé que "cuánto tiempo me falta", "llévame a Santiago" y "cómo llego a
Valparaíso" siguen funcionando exactamente igual que antes (sin falsos positivos
nuevos).

**Versión:** APP_VERSION, version.txt y footer → 6.47. `sw.js` CACHE → v647.
Desplegado a librepedal.cl y confirmado en vivo.

Pendiente del mismo pedido de Inty (viene en camino, no cabía en esta versión):
vocabulario específico por modo de actividad (cicloturismo/ruteros/MTB/auto no
deberían decir las mismas frases), y escucha continua tipo manos-libres (pidió
no tener que apretar el botón del micrófono mientras pedalea o maneja).

---

## v6.46 — 2026-07-13 — Claude (sesión 2, el "modo" de actividad pasa a primera plana)

Pedido de Inty: el modo (ciclismo/MTB/trekking/moto) estaba escondido dentro de
Perfil → Preferencias — casi nadie lo encontraba, todos arrancaban en "Ciclismo
de ruta" sin saber que había otros. Pidió que fuera una elección visible desde
el inicio, en el registro, que la app se "acomode a ese estilo", y que se pueda
cambiar siempre.

**Lo que se hizo:**
- Nuevo selector de modo (mismo estilo visual que los demás selectores de la
  app) **arriba de todo en la pantalla de registro**, antes que nombre/correo —
  literalmente lo primero que se elige.
- **La app entera adopta el tono del modo elegido**, no solo un cambio
  cosmético local: `var(--p)`/`var(--g)` (color principal y de acento) se usan
  116 y 57 veces respectivamente en toda la hoja de estilos, así que
  redefinirlas en `:root` alcanza para teñir botones, acentos y bordes de TODA
  la app de una sola vez. Colores pensados para cada modo, no una rotación de
  matiz genérica: Ciclismo mantiene el naranja de siempre (cero cambio para
  quien no toca esto), MTB un verde musgo/ámbar tierra, Trekking terracota/
  salvia, Moto azul carretera/ámbar. Se aplica al cargar la página (antes de
  loguearse también) y al toque apenas se elige — sin recargar.
- Se puede cambiar cuando quieras desde Perfil → Preferencias, como antes —
  ahí sigue confirmando por voz; en el registro el cambio es silencioso (no
  tiene sentido que Pistero "hable" en medio de un formulario que aún no se
  envía).
- **De paso, encontré y arreglé el mismo bug de v6.38** pero para estos dos
  campos: `reg()` restauraba piel/ojos/labios/vello/peinado/pañuelo al volver
  desde un teléfono nuevo, pero NO restauraba `actividad` ni `personalidad` —
  se perdían, pisadas por los valores por defecto de este dispositivo. Ahora sí
  se restauran, con el mismo cuidado que el resto.

**Verificación real en el navegador:** confirmé que el selector de registro
muestra las 4 opciones; que elegir "MTB" cambia `--p`/`--g` al toque (verde
musgo `#5c8a3a`); que registrarse con "MTB" elegido guarda `actividad:'mtb'`
en Firestore; que un usuario con `actividad:'trekking'` ya guardado en la nube,
al registrarse en un dispositivo nuevo SIN tocar el selector (que queda en el
default 'ciclismo'), termina con `actividadTipo:'trekking'` restaurado y el
tema correcto aplicado (`#b5651d`) — no pisado; y que cambiar el modo después,
desde Preferencias, también actualiza el tema en vivo y sigue confirmando por
voz como antes.

**Versión:** APP_VERSION, version.txt y footer → 6.46. `sw.js` CACHE → v646.
Desplegado a librepedal.cl y confirmado en vivo.

---

## v6.45 — 2026-07-13 — Claude (sesión 2, "la app arranca dos veces" — reporte directo de Inty)

Inty abrió la web recién desplegada (tras una racha de 7 despliegues seguidos hoy,
v6.38→v6.44) y vio la pantalla recargarse sola dos veces. Investigué en vivo:
reproducir la carrera exacta de temporización no es posible desde este sandbox
(depende de en qué momento el CDN de Cloudflare propaga cada nodo edge), pero
encontré la causa raíz real leyendo el mecanismo de auto-actualización con lupa.

**El problema:** el listener de `controllerchange` del Service Worker recargaba la
página de forma **incondicional** apenas un SW nuevo tomaba control — sin nunca
verificar si de verdad hacía falta. Con una racha de varios despliegues seguidos
(exactamente lo que pasó hoy), el SW puede activarse por razones que NO significan
"hay una versión más nueva para ti": una reinstalación redundante del mismo
`sw.js`, o que dos pestañas/cargas sucesivas aterricen en nodos del CDN con
propagación desincronizada por unos segundos. En esos casos el listener recargaba
igual, sin razón real — eso es justo lo que se siente como "la app arranca dos
veces": una recarga de verdad (por versión distinta) y encima otra recarga
"fantasma" (por la reactivación del SW, sin que la versión hubiera cambiado).

**Arreglo:** antes de recargar, el listener ahora vuelve a preguntarle a
`version.txt` (igual que hace el mecanismo de auto-reparación, la otra mitad de
este sistema) si la versión realmente cambió. Si ya estás al día, no recarga nada.
Si de verdad hay una versión distinta, recarga como antes. El freno de
`sessionStorage` compartido con el otro mecanismo (`_lpYaRecargoEstaVisita`) se
mantiene intacto como protección adicional.

**Verificación:** no se pudo reproducir la condición de carrera real del CDN en
este entorno, así que extraje la lógica exacta del listener a un script Node
aislado con mocks de `fetch`/`location.reload`, y probé los 4 casos que importan:
(1) versión ya correcta → 0 recargas; (2) versión distinta → 1 recarga y marca el
freno; (3) `version.txt` no responde → recarga igual (conservador, como antes);
(4) dos `controllerchange` casi simultáneos con versión correcta → ninguno
recarga, sin condición de carrera entre ellos. Los 4 casos se comportaron
exactamente como se esperaba.

**Versión:** APP_VERSION, version.txt y footer → 6.45. `sw.js` CACHE → v645.
Desplegado a librepedal.cl y confirmado en vivo. Este despliegue en particular
debería ser el que finalmente deje de sentirse como "arranca dos veces", una vez
que el propio CDN termine de propagar esta versión a todos sus nodos.

---

## v6.44 — 2026-07-13 — Claude (sesión 2, cierre de la segunda vuelta: Pistero IA, Diario, Rutas, Inicio)

Terminé de barrer las 4 áreas que faltaban de la segunda vuelta:

- **Pistero IA**: revisé `preguntarPistero`/`_pisteroObedecer`/`_pisteroBurbuja` —
  ya está bien protegido (`escapeHTML` en ambos lados del chat, historial
  acotado a 40 mensajes, el input se limpia antes de mandar así que un
  doble-tap no duplica el request). Sin cambios de código.
- **Diario/Bitácora**: revisé `guardarBitacoraViaje` (la función combinada
  ruta+hospedaje+diario) — ya maneja bien los casos de viaje planificado vs
  rápido, confirma antes de terminar, y no guarda si no hay suficientes puntos.
  Sin cambios de código.
- **Mis viajes/Rutas**: comprobé que el contador de viajes de la Esfera
  (`rutasLocales().length + trips completados`) no duplica un mismo viaje —
  `finishTrip()` guarda en `trips` (planificado) O en `rutasLocales` (rápido),
  nunca los dos para el mismo viaje. Sin cambios de código.
- **Inicio/Esfera**: revisé el manejo de eventos táctiles/mouse del lanzador
  3D — el flag `esBound` ya evita registrar los listeners de arrastre dos
  veces, y `esRAF` evita loops de animación duplicados. Sin cambios de código.

**Encontré 2 huecos reales, y los dos me los dejé YO mismo en v6.39** (al
agregar piel/ojos/labios/vello/peinado/pañoleta nunca actualicé lo que ya
existía para referirse a "casco/personalizar"):

**1. La respuesta de Pistero a "¿qué cascos hay?"** solo mencionaba cascos,
colores y accesorios — nada de las 6 categorías nuevas. Actualizada para
mencionarlas todas.

**2. El comando de voz para abrir Personalizar** (`personaliz|perfil|casco|
personaje|mi avatar`) no reconocía NADA de vocabulario nuevo — decir "cambia
mi peinado" o "ponme barba" no hacía nada. Ampliado con cuidado: "peinado",
"barba", "bigote", "vello facial", "pañoleta/pañuelo" van sueltos (specific,
sin riesgo real de falso positivo en este dominio), pero "ojos", "piel" y
"labios" SOLO cuentan si vienen con una frase que de verdad pide cambiarlos
("color de ojos", "cambia mi pelo") — sueltos quedan afuera a propósito,
porque un ciclista real los usa también para quejarse ("me duelen los ojos",
"se me quemó la piel", "tengo los labios partidos") y esas frases no deberían
mandarte a Personalizar.

**Verificación:** probé las 2 regex con 13 frases reales que SÍ deberían
activar Personalizar y 6 frases realistas que NO deberían (quejas de cansancio/
dolor/clima) — las 19 se comportaron como se esperaba, corrido en Node con el
mismo motor (V8) que usa el navegador. El navegador de este sandbox estuvo
temporalmente caído durante esta parte (infraestructura del entorno, no algo
de la app — reintenté varias veces) así que esta vez la verificación de
regex/lógica se hizo en Node en vez de en vivo en el navegador; el resto
(sintaxis completa del archivo con `node --check` vía `new Function()`, y el
despliegue con verificación de `version.txt` en producción) sí se hizo igual
que siempre.

**Versión:** APP_VERSION, version.txt y footer → 6.44. `sw.js` CACHE → v644.
Desplegado a librepedal.cl y confirmado en vivo.

**Con esto termina la segunda vuelta completa del barrido** (autocrítica de
v6.39-6.42 sin fallas nuevas, 3 condiciones de carrera reales en Comunidad
v6.43, y estos 2 huecos de vocabulario/contenido en v6.44). Las 16 secciones
de la app ya pasaron por dos pasadas meticulosas.

---

## v6.43 — 2026-07-13 — Claude (sesión 2, segunda vuelta del barrido: 3 condiciones de carrera reales en Comunidad)

Inty pidió una segunda vuelta meticulosa, con autocrítica. Primero re-verifiqué
mis propios cambios de v6.39-6.42 con pruebas dirigidas (condición de carrera en
el ducking de música, escape de atributo en Novedades, consistencia del wake
lock, doble-llamada a la animación de habla, restauración combinada de v6.38+v6.39
en `reg()`, colisión de clases CSS, correspondencia pestaña↔panel↔grid) — **todo
pasó, sin fallas nuevas**. Evidencia completa en el historial de esta sesión.

Después seguí barriendo Comunidad/Social buscando el patrón "leer un array o
mapa completo, modificarlo en el cliente, reescribirlo entero" — y encontré
**3 condiciones de carrera reales**, las tres reproducidas con pruebas
concurrentes ANTES de arreglarlas (no se asumió el bug, se demostró):

**1. `toggleAsistenciaRodada()`** — dos personas confirmando asistencia a una
rodada casi al mismo tiempo: la que escribía último pisaba a la otra sin
avisar. Reproducido: con el código viejo, `userB` desaparecía de la lista de
asistentes aunque había confirmado antes que `userC`. Arreglado con
`FieldValue.arrayUnion`/`arrayRemove` (atómico en el servidor, no depende de
qué haya leído el cliente).

**2. `likeRecommendation()`** — mismo problema con "me gusta" en recomendaciones
de CicloGuía: dos likes casi simultáneos, uno se perdía (tanto el contador
`likes` como la entrada en `likedBy`). Arreglado igual: `arrayUnion`/
`arrayRemove` para `likedBy` + `FieldValue.increment()` para el contador.

**3. `valorar()`** (estrellas en recomendaciones) — mismo problema con
`ratingSum`/`votes`/`ratedBy`. Arreglado con `increment()` para los números y
una escritura de **solo esa clave** del mapa (`'ratedBy.'+clave`, dot-path),
que Firestore aplica de forma atómica sin tocar los votos de nadie más
—confirmé que `claveVoto()` ya sanitiza puntos y caracteres especiales, así
que el dot-path nunca se malinterpreta como un path anidado accidental.

Revisé aparte que `hostels` (calificaciones) YA estaba libre de este problema
desde antes — usa un doc-por-voto (`guiComments` con `type:'voto'`), un diseño
sin contención por construcción. Revisé también Social (solicitudes de
amistad) — solo hace `set` de un campo string único (`status`), sin arrays/
contadores compartidos, sin riesgo.

**Verificación real:** para cada uno de los 3 fixes, simulé 2 escrituras
concurrentes con latencia realista (40-60ms) contra un mock que reproduce
fielmente cómo Firestore aplica `arrayUnion`/`arrayRemove`/`increment`/
dot-path (inspeccioné la forma real de los sentinels del SDK cargado en vez de
adivinar). Con el código VIEJO reproduje la pérdida de datos; con el código
NUEVO confirmé que ambas escrituras concurrentes quedan reflejadas correctamente,
en los 3 casos, incluyendo un caso mixto (uno confirma mientras otro cancela al
mismo tiempo en rodadas).

**Versión:** APP_VERSION, version.txt y footer → 6.43. `sw.js` CACHE → v643.
Desplegado a librepedal.cl y confirmado en vivo.

---

## v6.42 — 2026-07-13 — Claude (sesión 2, barrido: Ajustes)

**Fuga real de batería en "🔋 Ahorro pantalla".** El botón está siempre
disponible en Ajustes, sin depender de que el GPS esté corriendo. `toggleSaver()`
pedía el wake lock de pantalla (`lpWakeLock.enable()`) al activarse, pero al
salir (tocar la pantalla para volver) NUNCA lo soltaba — solo `toggleGPS`/
`endNavigation` lo hacían. Si alguien usaba "Ahorro pantalla" SIN tener el GPS
corriendo (perfectamente posible: el botón no lo exige), el teléfono se quedaba
sin poder apagar la pantalla solo nunca más en esa sesión — justo lo contrario
de lo que promete un modo "ahorro".

Arreglo cuidadoso (esto toca `lpWakeLock`, que está en la lista de PROTEGIDO de
`LEEME.md` — se leyó completo el módulo antes de tocar nada, y el cambio es
aditivo, no reemplaza nada): al salir de "Ahorro pantalla", si ni el GPS libre
(`ig`) ni la navegación (`#nav-screen.active`) siguen corriendo, se suelta el
wake lock. Si cualquiera de los dos sigue activo, no se toca — son ellos quienes
lo necesitan y ya lo sueltan cuando corresponde.

**Verificación real en el navegador:** mockeado `lpWakeLock.enable/disable` para
capturar llamadas, probados los 2 casos reales — (a) Ahorro pantalla solo, sin
GPS: ON→OFF pide y suelta el lock correctamente; (b) Ahorro pantalla con GPS
libre activo: ON→OFF pide pero NO suelta (GPS sigue necesitándolo). Revisado de
paso el resto de Ajustes (voz, GPS ahorro, detección de caídas, Bluetooth) —
todos ya estaban sólidos de barridos anteriores, sin cambios necesarios.

Nota técnica: el servidor de pruebas local se cayó a mitad de la verificación
(el `preview` de este sandbox, no algo de la app) y hubo que reiniciarlo — quedó
documentado por si se repite.

**Versión:** APP_VERSION, version.txt y footer → 6.42. `sw.js` CACHE → v642.
Desplegado a librepedal.cl y confirmado en vivo.

Barrido — sigue: Admin, base/PWA. Con esto, el recorrido por TODAS las secciones
listadas en el LEEME queda cerrado salvo esas dos.

---

## v6.41 — 2026-07-13 — Claude (sesión 2, barrido: Novedades + CicloGuía)

**Novedades:** `n.link` (el botón "Ver más →") se renderizaba con
`href="'+encodeURI(n.link)+'"` sin validar el esquema. `encodeURI` NO toca los
dos puntos ni las letras, así que un link `javascript:...` guardado en el
documento se habría renderizado como un enlace clicable ejecutable — que
cualquiera que abriera Novedades y tocara "Ver más" habría disparado. Hoy la
escritura en `novedades` ya está bien cerrada en las reglas (`isAdmin()`, no
"cualquier signedIn()" como antes de una corrección previa), así que el único
que podría meter un link así es la propia cuenta admin — pero por las dudas
(fat-finger al pegar un link, o una cuenta admin comprometida más adelante) se
agregó `_linkSeguro()`: exige `http://` o `https://` al empezar, tanto al
publicar (`publicarNovedad`, rechaza con aviso si no cumple) como al mostrar
(`renderNovedadesList`, defensa en profundidad por si un dato viejo no pasó por
ahí). Probado con 10 casos reales (incluyendo `javascript:`, `JavaScript:`
con mayúsculas mezcladas, `data:`, `vbscript:`, vacío, null) — todos los
peligrosos rechazados, los `http(s)` reales aceptados, y confirmado con un
render real que un link malicioso ya NO produce un `href="javascript:..."` en
el DOM.

**CicloGuía:** `addComment()` no tenía guarda anti-doble-tap (sí la tienen
`addHostel`/`addRepairTip`, que ya estaban bien desde antes) — un doble toque
podía duplicar el comentario. Agregada la misma guarda (`_agregandoComentarioGuia`)
y manejo de error, mismo patrón que el resto del proyecto. Verificado disparando
dos llamadas casi simultáneas: solo 1 documento se crea.

**Versión:** APP_VERSION, version.txt y footer → 6.41. `sw.js` CACHE → v641.
Desplegado a librepedal.cl y confirmado en vivo.

Barrido — sigue: Taller MacGyver (revisado de pasada, `addRepairTip` ya estaba
sólido), Ajustes, Admin, base/PWA.

---

## v6.40 — 2026-07-13 — Claude (sesión 2, barrido: Música)

Revisé el módulo `lpMusic` (radios gratis + música propia + auto-ducking cuando
Pistero habla). Encontré y arreglé 2 cosas reales, buscando variantes de uso real
en vez del solo caso feliz:

**1. Música a todo volumen si arrancas a reproducir justo mientras Pistero está
hablando.** `duck()` solo baja el volumen de audio YA sonando (`if(audio.paused)
return;`). Si abrías la pantalla de Música y le dabas play justo cuando Pistero
seguía con el saludo (algo que pasa fácil: son los primeros segundos después de
entrar), la música arrancaba al 100% y recién bajaba cuando Pistero volviera a
hablar la próxima vez. Arreglado: `play()` ahora revisa si el body tiene la clase
`pistero-hablando` ANTES de arrancar el audio, y si es así arranca directo al 5%
(mismo nivel que `duck()`), sin el golpe de volumen inicial.

**2. Fuga de memoria con "tu música" (📁).** Cada archivo cargado crea un blob URL
(`URL.createObjectURL`) que nunca se liberaba. Si cargabas tus canciones, después
volvías a radios y cargabas otro grupo de archivos, las URLs viejas quedaban vivas
en memoria para siempre — sesiones largas (justamente el caso de uso típico:
alguien pedaleando varias horas) iban acumulando fugas. Arreglado: se revocan las
URLs de la lista anterior antes de reemplazarla, tanto al cargar archivos nuevos
como al volver a radios.

**Verificación:** no se pudo probar reproducción real de audio en este entorno
(sandbox sin salida de red para streaming), así que extraje la lógica exacta de
`play()` y de la revocación a un script Node aislado con mocks de `audio`/`document`/
`URL`, y confirmé ambos casos: (a) volumen arranca en 0.05 cuando `pistero-hablando`
está activo y en 1 cuando no, (b) las URLs viejas se revocan en el orden correcto
al cambiar de lista. `node --check` limpio, sin errores de consola al cargar la app.

**Versión:** APP_VERSION, version.txt y footer → 6.40. `sw.js` CACHE → v640.
Desplegado a librepedal.cl y confirmado en vivo.

Barrido — sigue: Novedades, Taller/Guía (si existe como sección propia), Ajustes,
Admin, base/PWA.

---

## v6.39 — 2026-07-13 — Claude (sesión 2, animación de habla + personalización con variedad real)

Inty pidió dos cosas directas: (1) la animación de "hablar" del personaje se veía
mal — "un chiste" para una app de este nivel — y (2) "Crea tu perfil" ocupa mucho
espacio para tan poca variedad; pidió variedad real (cascos, lentes, pañoletas,
rostro, barba, bigote, ojos, labios) pensando también en personajes femeninos.

**1. Boca al hablar, rehecha de fondo.** Antes era un único `<path>` de sonrisa
estirado con `scaleY` vía CSS `@keyframes` a ritmo perfectamente parejo (0.18s
lineal) — se veía plano y robótico. Ahora (`_bocaFrames`, `_bocaAplicar`,
`_bocaIniciarCiclo` en index.html) cicla por JS entre 6 formas de boca reales
(cerrada, apenas abierta, media redonda, ancha, redonda grande, fruncida) con
selección aleatoria PONDERADA (favorece formas chicas, como el habla real) y
timing IRREGULAR entre cuadros (65-160ms, no un intervalo fijo) — eso es lo que
distingue una boca hablando de una animación mecánica. Verificado ejecutando la
función real en el navegador: capturé 14 cuadros durante 3s de "habla" simulada y
confirmé formas distintas en secuencia irregular, más el reset correcto a la
sonrisa de reposo al terminar.

**2. Personalización de personaje, ampliada de verdad — 6 categorías nuevas:**
Piel (6 tonos), Ojos (8: color + forma almendrada + pestañas), Labios (6 colores),
Vello facial (7: bigotes y barbas de varios estilos), Peinado (9: rapado, cortos,
rulos, cola, trenzas, pelo largo — varios colores), Pañoleta/cuello (6). Además
Lentes pasó de 6 a 10 opciones y Accesorios del casco de 4 a 9 (luces LED,
banderín, cinta reflectante, corona, orejas). Los tonos de piel y los colores base
de ojos quedan SIEMPRE gratis a propósito — representar tu identidad no debería
tener precio; solo lo cosmético extra (formas, pestañas, otros colores/estilos)
cuesta Darma, igual que el resto de la tienda.

Cada categoría nueva tiene un valor por defecto que reproduce EXACTO el look
anterior (piel clara #f4c9a0, ojos café #16203a, labios café #7a4a2a, sin vello,
sin peinado, sin pañoleta) — cero cambio visual para quien no toque nada nuevo.

**3. "Crea tu perfil" ya no es una lista larga — es por pestañas.** Antes eran 8
secciones apiladas siempre visibles (mucho scroll para elegir cosas chicas). Ahora
(`.tabs-personalizar`, `_tabPersonalizar()`) se ve UNA categoría a la vez, con el
personaje siempre fijo arriba — 11 pestañas: Casco, Color, Piel, Peinado, Ojos,
Labios, Vello facial, Lentes, Pañuelo, Accesorios, y Preferencias (agrupa Estilo de
energía/Fondo de esfera/Actividad/Personalidad de Pistero, que no son apariencia
del personaje y no deberían competir por el mismo espacio).

**4. Cuidado con colisiones de ID.** `PRECIOS`/`getDesbloqueados()` son un mapa
plano compartido por TODAS las categorías — usar el mismo id en dos categorías
(ej. "azul" en color de casco Y en pañoleta) haría que comprar una desbloqueara
la otra gratis. Antes de escribir código verifiqué programáticamente que los 87
ids de todas las categorías son únicos, y que cada clave de `PRECIOS` apunta a un
id real que existe en alguna categoría (sin huérfanas, sin duplicadas).

**Verificación real en el navegador** (no solo lectura de código): con `db`
mockeado, logueé un usuario de prueba, abrí las 11 pestañas y confirmé que cada
grid renderiza el número esperado de opciones (18 cascos, 8 ojos, 9 peinados, 7
vello, 6 labios, 6 pañuelo, 6 piel); confirmé que seleccionar un color de ojos
gratis se aplica al toque (el iris cambia en el SVG real) y que seleccionar un
ítem bloqueado NO cambia el personaje (abre la tienda en su lugar); compré
`barbaCompleta` (40 Darma, saldo bajó de 500 a 460 exacto), se desbloqueó y se
aplicó, y la tienda lista las 5 categorías nuevas; compré `labioRojo` y confirmé
que la boca en reposo Y la boca "hablando" respetan el color elegido (vuelve al
rojo del personaje al dejar de hablar, no a un café genérico).

**Persistencia:** las 6 selecciones nuevas se guardan en localStorage
(`lp_piel_`, `lp_ojos_`, etc.), se sincronizan a Firestore en `saveCustomization()`
y se restauran/preservan en `reg()` con el mismo cuidado anti-borrado que ya tenía
`unlocked` (v6.38) — un teléfono nuevo no te hace perder lo que compraste ni tu
apariencia. También se agregaron a `exportarMisDatos()`/`importarMisDatos()`
(antes esa copia de respaldo ni siquiera incluía los accesorios/extras del casco,
un hueco que quedaba de antes).

**Versión:** APP_VERSION, version.txt y footer → 6.39. `sw.js` CACHE → v639.
Desplegado a librepedal.cl y confirmado en vivo (`version.txt` → 6.39).

---

## v6.38 — 2026-07-13 — Claude (sesión 2, barrido #9: Gamificación — Darma y personalización no sobrevivían a un teléfono nuevo)

Retomé el barrido en **Gamificación** (Logros, Ranking, Retos, Wrapped, Tienda de
Darma). La mayoría ya estaba sólido (retos con guardas anti-doble-tap y validación
de negativos de una pasada anterior, ranking/logros con la navegación "volver" ya
arreglada). Encontré y corregí 3 cosas reales:

**1. `ap()` era código muerto — eliminada.** Función "agregar punto al mapa" que
nunca se llama desde ningún botón (`grep -n '\bap\b'` solo la encontraba en su
propia definición) ni existían los elementos `#np`/`#cp` que leía. Además tenía el
mismo bug de "otorgar Darma antes de confirmar el guardado, sin guarda anti-doble-tap"
que este proyecto ya sabía corregir (ver el comentario en `agregarPOI`/reportes:
"evita duplicar el documento y el Darma con doble-tap"). Al estar inalcanzable no
afectaba a nadie, pero quedaba como trampa para quien la reconectara copiando el
patrón equivocado. Eliminada completa.

**2. `comprarItem()` no respaldaba en la nube lo que pagabas con Darma.** Los
ítems desbloqueados con Darma (cascos, skins, lentes, accesorios premium) solo se
guardaban en `localStorage` (`lp_unlocked_<usuario>`). Si cambiabas de teléfono o
reinstalabas, tu saldo de Darma SÍ volvía (ya gastado, vía `sincronizarStats()`)
pero el ítem que compraste con esa plata, no — perdías lo pagado. Se agregó un
`db.collection('users').doc(cu).set({unlocked: FieldValue.arrayUnion(id)}, {merge:true})`
en cada compra, mismo patrón aditivo (arrayUnion, no sobrescribe) que ya usa el
resto del proyecto para evitar condiciones de carrera entre dispositivos.

**3. Más grave: `reg()` (login/registro) SOBRESCRIBÍA en Firestore el casco, skin,
lente y accesorios ya guardados en la nube con los valores por defecto de este
dispositivo, cada vez que alguien volvía a entrar en un teléfono nuevo o después de
reinstalar.** La causa: `selectedHelmet/selectedLens/selectedSkin/selectedExtras`
arrancan en 'giro'/'none'/'cyan'/[] en cualquier pestaña nueva (línea ~1231), y
`reg()` los escribía en Firestore con `.set(...,{merge:true})` sin haber leído antes
lo que ya existía — el `merge:true` no salva nada acá porque el campo `helmet` sí
viaja en el payload, así que pisa el valor anterior igual. Resultado real: un
ciclista que compró un casco premium con Darma, y después perdió la sesión local o
cambió de celular, no solo no lo veía de vuelta — el próximo login BORRABA el
registro en la nube de que alguna vez lo tuvo.

Arreglo: `reg()` ahora lee el doc existente (`_prevDoc`, que ya se pedía para saber
si es usuario nuevo) ANTES de escribir nada, y si existe, usa su `helmet/lens/skin/
extras/unlocked` en vez de los valores por defecto de este dispositivo — y hace
unión (no reemplazo) del array `unlocked` con lo que este dispositivo ya tenía
localmente, para no perder tampoco compras hechas antes de este fix (docs viejos
sin campo `unlocked`).

**Verificación real en el navegador** (no solo lectura de código):
- `comprarItem()`: mockeado `db.collection` para capturar escrituras; confirmado
  que descuenta Darma, agrega el id a `localStorage`, y manda
  `{unlocked: FieldValue.arrayUnion('amarillo')}` con `merge:true` a `users/<cu>`.
- `reg()`: mockeado un doc de Firestore existente con
  `{helmet:'kask',lens:'aviator',skin:'negro',extras:['calco'],unlocked:[...]}`
  simulando "cuenta vieja, teléfono nuevo", y ejecutado `reg()` real (con DOM/inputs
  mockeados) de punta a punta. Confirmado: `selectedHelmet/Lens/Skin/Extras`
  terminan en los valores de la nube (no en los por defecto), `getDesbloqueados()`
  local queda con el array completo, y la escritura final a Firestore **reescribe
  esos mismos valores** en vez de pisarlos con defaults. También probé el caso
  "usuario nuevo de verdad" (sin doc previo) y "mismo dispositivo con doc viejo sin
  campo `unlocked`" — ambos se comportan bien (sin crash, sin perder nada local).
- `firestore.rules`: no necesitó cambios — la regla de `users/{id}` valida
  `nombre/email/helmet/skin` por longitud, no toca `extras`/`unlocked`.
- `node --check` (vía `new Function()` sobre cada bloque `<script>`) sin errores.

**Versión:** APP_VERSION, version.txt y footer → 6.38. `sw.js` CACHE → v638.

Barrido — sigue: Personalización (lo que queda además de Tienda/Darma, ya cubierto
acá), Música, Novedades, Taller/Guía, Ajustes, Admin, base/PWA.

---

## v6.34 + Worker IA — 2026-07-13 — Claude (sesión 2, Pistero "pedaleando vs detenido" + auditoría de audio ducking)
Inty pegó dos specs largas (personalidad de un compañero de viaje IA + arquitectura
de audio ducking estilo Android nativo) y pidió "busca la mejor manera de
implementar todo esto". Antes de tocar nada, audité qué de eso YA estaba hecho
(para no reconstruir trabajo de sesiones anteriores) contra el código real:

**Ya implementado, verificado, sin cambios:**
- Memoria conversacional: `pisteroHistorial` (últimos 12 turnos) se manda siempre
  al Worker como parte de los `messages`, así que la conversación ya es continua.
- Ducking de la música PROPIA de la app (`lpMusic`): fade suave al hablar (250ms a
  5%) y al terminar (700ms a 100%), restaura DE INMEDIATO si el usuario interrumpe
  (`pararVoz()` → `_pisteroCalla()`), y ya es consciente de la cola de voces (cada
  frase nueva en cola re-arma el mismo timeout, así nunca sube el volumen a medias
  de una respuesta larga). Esto ya cumplía gran parte del spec de audio.
- Tono seleccionable, alias de vistas en lenguaje natural, sistema de acciones
  anti-invasivo: todo ya construido en sesiones previas.

**Hueco real y honesto que hay que decir de frente**: el AudioFocus nativo de
Android para bajarle el volumen a Spotify/YouTube Music (apps EXTERNAS) NO es
alcanzable desde esta arquitectura (WebView/Capacitor con plugins de la
comunidad) sin escribir un plugin nativo propio en Kotlin/Java — es un
desarrollo real, no una función de índole cotidiana. No se implementó (no se
puede fingir que funciona), queda anotado como pendiente de decisión futura si
alguna vez se justifica esa inversión de tiempo.

**Sí implementado — Pistero ahora responde distinto si vas pedaleando o
detenido**, tal como pedía el spec de personalidad ("durante el pedaleo,
respuestas cortas; detenido, puede profundizar"):
- `index.html`: `_pisteroContexto()` ahora calcula `enMovimiento` (mismo patrón
  que ya usaba la detección de caídas: lee `navSpeed` en navegación o `spd` en
  GPS libre, exige velocidad real ≥3 km/h, no solo "GPS prendido").
- `worker-ia/worker.js`: la Regla 1 del prompt de sistema ahora es condicional —
  pedaleando: 1-2 frases, corto, prioriza seguridad; detenido: largo natural
  según lo que la pregunta merezca, "como lo haría un guía real conversando, no
  una ficha de datos". Se agregó también instrucción explícita de variar la
  extensión y la forma de partir las respuestas (no la misma estructura
  siempre), y se reforzó la identidad ("guía de viaje experimentado, no un
  amigo cualquiera ni un profesor").

Verificado de dos formas: (1) `personalidad()` ejecutada aislada en Node con
`enMovimiento:true` y `false`, confirmando el texto de la Regla 1 correcto en
ambos casos; (2) el Worker YA DESPLEGADO en producción, probado con `curl` real
— pedaleando devolvió 2 frases cortas, detenido devolvió una respuesta más
larga y conversacional, confirmando que el cambio de prompt sí afecta el
comportamiento real del modelo, no solo el texto del prompt.

Deploy: Worker `librepedal-ia` desplegado (usa `MI-CLOUDFLARE-IA.txt`, variable
`TOKEN_IA`, no `TOKEN` — ojo con el nombre si otra sesión lo vuelve a desplegar).
`librepedal.cl/version.txt` → `6.34` confirmado en vivo.

## v6.33 — 2026-07-13 — Claude (sesión 2, barrido #7: Pistero IA)
Función #7 del barrido completo (chat conversacional, comandos de voz, FAQ,
sistema de acciones `[ACCION:...]`, personalidades). Esta función ya tenía un
nivel de pulido notable de sesiones anteriores — sistema anti-invasivo bien
pensado (solo auto-ejecuta acciones si TU mensaje sonaba a orden, si no ofrece
un botón), alias de vistas en lenguaje natural, todo el texto de la IA
escapado con `escapeHTML()`. FAQ_APP/FAQ_CICLISMO revisadas: regexes
específicas de varias palabras, sin patrones sueltos que pudieran comerse
otros comandos (la clase de bug de la función #1).

**1 bug real: sin timeout en la llamada al Worker de IA.** `preguntarPistero()`
usaba `fetch()` plano — si el Worker se colgaba (aceptaba la conexión pero
nunca contestaba, no lo mismo que "caído"), la burbuja "Pistero está
pensando…" quedaba pegada PARA SIEMPRE: el `catch` nunca se disparaba porque
la promesa nunca se rechazaba sola. La app ya tenía `_fetchT(url, ms)` (fetch
con `AbortController`+timeout) usado en geocoding/elevación, pero solo servía
para GET sin opciones. Se extendió con un 3er parámetro opcional `opts` (se
combina con la señal de abort) sin romper a los 4 llamadores existentes —
verificado que siguen mandando exactamente lo mismo que antes. `preguntarPistero`
ahora usa `_fetchT(IA_URL, 25000, {method:'POST',...})`.

Verificado con un Worker simulado que nunca responde (no solo leído): esperé
los 25 segundos reales del timeout — antes de fijarlo la burbuja se habría
quedado pegada para siempre, ahora corta y muestra "Se me cortó la señal.
Inténtalo de nuevo en un ratito." como ya estaba pensado para errores de red.

Deploy: `librepedal.cl/version.txt` → `6.33` confirmado en vivo.

## v6.32 — 2026-07-13 — Claude (sesión 2, barrido #6: Social)
Función #6 del barrido completo (amigos, mensajes privados, chat). El chat 1-a-1
(`abrirChatAmigo`) ya tenía "← Volver a amigos" bien hecho desde antes — buen
precedente a seguir. `sendFriendRequest` ya revisa duplicados antes de crear.

**1 instancia del mismo bug de navegación de v6.31**: "Ciclistas en la
comunidad" (buscar gente nueva para agregar, se abre desde Amigos → "Buscar
ciclistas"/"Agregar más") no tenía "← Volver a amigos" — mismo patrón que
Comunidad, reusando el mismo sistema `_modalVolverA`/`_btnVolverModal()`.

**Caso con 4 entradas distintas — `verPerfilUsuario()`**: se llama desde Amigos,
Ranking, y 2 popups del mapa (radar de ciclistas / navegación activa). Los 2
primeros SÍ necesitan volver (a Amigos o a Ranking respectivamente); los 2 del
mapa NO tienen una "pantalla padre" del modal — ahí la "✕" ya te deja de vuelta
en el mapa correctamente, un botón "Volver" habría sido confuso. Se agregó un
segundo parámetro opcional (`verPerfilUsuario(id, volverA)`) — Amigos pasa
`'showFriendsList'`, Ranking pasa `'mostrarRanking'`, los 2 popups del mapa no
pasan nada (mismo patrón ya usado para `mostrarTienda()` en v6.31).

Verificado en el navegador con la secuencia completa: Amigos → Buscar
ciclistas → Volver → Amigos; y perfil abierto desde Amigos (con botón) vs
desde el mapa (sin botón), ambos casos correctos.

Deploy: `librepedal.cl/version.txt` → `6.32` confirmado en vivo.

## v6.31 — 2026-07-13 — Claude (sesión 2, navegación de Comunidad + votación abierta)
Inty: "si veo un apartado (ej. records) y vuelvo atrás, me lleva a Inicio y tengo
que volver a entrar a Comunidad para ver los otros ítems". Confirmado con el
código: `mostrarLogrosComunidad()` (el menú Logros/Comunidad) y sus 8 pantallas
hijas (Ranking, Segmentos, Retos, Resumen Anual, Rutas recomendadas, Tienda,
Comunidad/vota, y la tabla de líderes de un segmento) viven TODAS dentro del
mismo `userModal`, reemplazando el contenido sin dejar rastro — no usan `cv()`
(el sistema de vistas con su propia pila de historial, ya sólido, revisado en la
función #2). La única salida era la "✕", que cierra TODO el modal de una vez.

**Corregido**: nuevo `_modalVolverA` (nombre de función a la que vuelve) +
`_btnVolverModal()` (botón "← Volver" reusable). Cada pantalla hija fija su
padre antes de dibujarse. Caso especial: `mostrarTienda()` se abre desde 2
lugares distintos (el menú Logros, y al tocar un ítem bloqueado en
Personalizar) — ahora recibe un parámetro (`mostrarTienda(true)` solo desde
Logros) para mostrar "Volver" únicamente cuando corresponde; desde
Personalizar la "✕" ya te deja en el lugar correcto, un botón "Volver a Logros"
ahí habría sido confuso (nunca estuviste en Logros). Verificado en el
navegador con la secuencia real: Logros → Ranking → tocar "Volver" → vuelve al
menú Logros (no a Inicio).

**Segundo pedido, mismo mensaje**: "activar la sección de votación, eso le da a
la gente participación, luego cuando seamos 5.000 ya tendremos los votos y se
hará la que diga la comunidad". Se sacó el bloqueo de `votarComunidad()` (antes
exigía 5.000 usuarios para poder votar) — ahora se puede votar desde ya, y el
texto se reformuló: la meta de 5.000 pasa de "desbloquea el botón de votar" a
"ejecutamos lo que ya haya decidido la comunidad con los votos juntados hasta
ahí". El sorteo NO se tocó, sigue gateado a 5.000 como estaba (no se pidió
cambiarlo, y ahí sí tiene sentido por la promesa de "una vez cada 6 meses,
justo y transparente"). Verificado votando con un total simulado de 42
usuarios (muy por debajo de 5.000) — el voto se registra correctamente.

Deploy: `librepedal.cl/version.txt` → `6.31` confirmado en vivo.

## v6.30 — 2026-07-13 — Claude (sesión 2, barrido #5: Comunidad) — ⚠️ hallazgo de escalabilidad real
Función #5 del barrido completo (reportes en el mapa, CicloGuía, alojo, votación,
retos, rodadas). La mayoría verificada sólida — pero encontré el mismo tipo de
riesgo real del que hablamos antes ("cuándo puede colapsar la app").

**Verificado sin bugs**: reportes/alojo/repairTips/hostels/recommendations/
guiComments/trips ya tienen `authUid` en cada escritura, así que NO caen en la
misma trampa que tenía el diario (el "grandfather" de `isOwnerOrLegacy()` que da
por dueño a cualquiera si el campo no existe) — se revisaron uno por uno contra
el código real, no de memoria. El sistema de estrellas/votos (hostels,
recommendations) maneja bien el recálculo de promedio y el re-voto. Rodadas ya
filtra las fechas pasadas al mostrar la lista (no hacía falta más validación ahí).

**Hallazgo real — lectura carísima de Firestore**: `mostrarComunidad()` (se abre
cada vez que alguien entra a la pantalla de Comunidad) y `votarComunidad()`
leían la colección `users` COMPLETA solo para contar cuántos usuarios hay y
compararlo con la meta de 5.000. Con el proyecto acercándose a usuarios reales,
esto significa miles de lecturas de Firestore **por un solo clic** — contra un
cupo gratis de 50.000 lecturas/día para TODA la app. Abrir Comunidad unas pocas
veces en un día con la comunidad cerca de la meta agotaría el cupo del día para
todos los usuarios a la vez.

**Corregido**: nuevo contador liviano (`meta/contadores.totalUsuarios`),
incrementado en `reg()` SOLO cuando el usuario es realmente nuevo (se verifica
que el documento no existía antes — no en cada login/re-registro). Ambas
funciones ahora leen 1 solo documento en vez de la colección entera. Se
consideró usar `.count()` (agregación nativa de Firestore, aún más barata) pero
el bundle `firebase-firestore-compat.js` cargado en la app no lo expone —
confirmado probándolo en vivo, no asumido.

**Trade-off aceptado, no oculto**: cualquier `signedIn()` puede escribir el
contador (mismo nivel de confianza que otros contadores comunitarios de la app,
ej. likes) — en el peor caso alguien lo infla y la votación se activa antes de
tiempo. No es dato sensible, y agregar protección extra (ej. incrementar solo vía
Cloud Function) requeriría el plan pago Blaze, así que no se hizo.

Verificado en el navegador con red real interceptada (no solo lectura de código):
confirmado que ni `mostrarComunidad()` ni `votarComunidad()` tocan la colección
`users` después del fix, que el contador incrementa correctamente, y que
`votarComunidad()` corta ANTES de intentar escribir el voto cuando faltan
suscritos. Nota aparte: el navegador de pruebas local sirvió una versión vieja
del archivo cacheada por el propio servidor de desarrollo (no relacionado con la
app) — se resolvió con un parámetro anti-caché en la URL, dejado como referencia
para la próxima sesión si vuelve a pasar.

Deploy: `librepedal.cl/version.txt` → `6.30` confirmado en vivo. Firestore rules
(archivo del repo, NO publicado) con la colección `meta` nueva.

## v6.29 — 2026-07-12 — Claude (sesión 2, bitácora opt-in)
Inty: "este espacio es para quien lo quiera usar, debería preguntar si desea esta
opción, no toda la gente tiene el hábito de hacer una bitácora". Confirmado con
Inty el mecanismo exacto antes de construir: un toggle en Ajustes, apagado por
defecto, que NO le quita la función a quien la pida por voz explícitamente.

**Nuevo: 🎒 "Bitácora de viajes" en Ajustes** (`bitacoraViajesOn`, `localStorage`
`lp_bitacora_viajes`, OFF por defecto):
- El comando de voz explícito "guarda mi bitácora" sigue funcionando SIEMPRE,
  esté el toggle prendido o no — si alguien lo pide directamente, no hay razón
  para negárselo.
- Con el toggle en OFF (default): el guardado genérico ("guarda mi viaje", sin
  decir "bitácora") sigue siendo el rápido y silencioso de siempre — nadie ve
  la pregunta de hospedaje sin haberla pedido.
- Con el toggle en ON: hasta el guardado genérico ofrece el flujo completo
  (pregunta hospedaje + junta el Diario del día) — es lo que promete el texto
  de Ajustes al activarlo.

**Nota de verificación**: el navegador de pruebas (Browser pane) volvió a caer
con el mismo error de infraestructura de la sesión anterior ("modelo
temporalmente no disponible") justo en este cambio — no se pudo confirmar en
vivo con el DOM real. Sí se verificó: sintaxis del `<script>` extraído con
`node --check` (limpia) y revisión manual línea por línea de la lógica nueva
(orden de los `if` en `handleVoiceCommand`, que el chequeo del toggle está
DESPUÉS del patrón específico de "bitácora" para no interferir con ese). Vale
la pena una prueba real cuando el navegador de pruebas vuelva a funcionar.

Deploy: `librepedal.cl/version.txt` → `6.29` confirmado en vivo (código).

**Verificación pendiente completada (2026-07-13, misma sesión, otra continuación):**
el Browser pane volvió a funcionar — probado en vivo con el DOM real los 4 casos
(toggle OFF/ON × comando genérico/explícito "bitácora"), todos correctos, y el
botón de Ajustes (`toggleBitacoraViajes`) cambia texto/color y persiste en
`localStorage` como corresponde. Sin hallazgos nuevos, queda cerrado de verdad.

## v6.28 — 2026-07-12 — Claude (sesión 2, feature nueva: "guardar bitácora de viaje")
Inty pidió: cuando el usuario pide guardar la bitácora de viaje, la IA debe guardar
la ruta, dónde se hospedó y todo lo que escribió sobre ese viaje — junto. Antes NO
existía ningún vínculo entre esas 3 cosas: la ruta se guardaba sola (sin lugar para
hospedaje), "Te doy alojo" es para OFRECER tu casa a otros (no para registrar dónde
TÚ dormiste), y el Diario es independiente por fecha del calendario, sin relación
con un viaje puntual. Confirmado con Inty el diseño antes de construir (2 preguntas):
preguntar el hospedaje en el momento (no solo juntar lo que ya exista), y usar la
entrada del Diario del día tal cual (no un campo de notas aparte por viaje).

**Nuevo comando de voz "guarda la bitácora de mi viaje"** (variantes: "guárdame la
bitácora", etc. — chequeado ANTES que el patrón genérico de "guarda...viaje" para
que no se lo coma primero) → `guardarBitacoraViaje()`:
1. Guarda la ruta como siempre (GPS libre vía `autoGuardarRuta`, o navegación activa
   vía `guardarRutaNavegada` — ambas funciones ahora devuelven el registro guardado,
   antes no devolvían nada).
2. Pregunta "¿Dónde te hospedaste esta noche?" con el diálogo temático
   (`lpPedirTexto`, se puede omitir en blanco).
3. Junta lo que ya escribiste HOY en el Diario (estado + meta + lo más difícil +
   reflexión) en un solo texto.
4. Todo junto (`hospedaje`, `notasDelDia`) queda en el mismo registro de la ruta —
   local siempre, y a la nube si el `firebaseId` ya llegó (si no, queda local
   igual, se sube en el próximo guardado de esa ruta).
5. Ahora visible en el historial de rutas (`renderRutas`) con 🏠/📓, escapado con
   `escapeHTML()`.

Viajes planificados (con `currentTrip` de Firestore, no el camino rápido común) NO
quedan con hospedaje/notas todavía — se avisa honestamente y se guardan como
siempre, sin fingir que quedó completo.

**Reglas de Firestore** (archivo del repo, NO publicado — ver "🔴 LO MÁS URGENTE"):
`routes` ahora valida largo de `hospedaje` (200) y `notasDelDia` (3000) con
`strOk()`, igual que el resto de campos de texto libre en otras colecciones.

Verificado end-to-end en el navegador: comando de voz enruta bien (no choca con
"guarda mi viaje" genérico), flujo completo con hospedaje+diario+ruta junto,
mensaje final con gramática correcta en 1 y 2+ ítems, escape de HTML confirmado
con un payload malicioso en el campo de hospedaje.

Deploy: `librepedal.cl/version.txt` → `6.28` confirmado en vivo.

## v6.27 — 2026-07-12 — Claude (sesión 2, barrido #4: Diario / Bitácora) — ⚠️ hallazgo serio
Función #4 del barrido completo. Esta pasada encontró el hallazgo más serio de
todo el barrido hasta ahora.

**1) Fecha en UTC en vez de local (mismo bug ya conocido, nadie lo aplicó acá):**
`diarioHoyKey()` y `guardarDiario()` usaban `new Date().toISOString().slice(0,10)`
— UTC, no la hora de Chile. Escribir en el diario de noche podía guardar la
entrada bajo la fecha de MAÑANA; al día siguiente, una entrada nueva
sobrescribía esa en silencio (mismo tipo de bug que ya se había corregido para
el aviso de lluvia, pero nadie lo replicó en el diario). Nuevo helper
`_fechaLocalYMD()` (usa `getFullYear/getMonth/getDate` locales) usado en ambos
lugares. Verificado que ya no usa `toISOString` en ninguno de los dos.

**2) `importarMisDatos()` (restaurar respaldo) podía perder una entrada de HOY**
al restaurar un respaldo viejo con la misma fecha — sobrescribía siempre, sin
comparar `local_ts` como sí hace `sincronizarDiarioNube()`. Corregido para que
gane la más nueva. Verificado con una prueba real: entrada de hoy + respaldo
viejo con la misma fecha → se conserva la de hoy.

**3) XSS en el historial del diario**: `renderDiarioHistorial()` insertaba
meta/complejo/reflexión directo en `innerHTML` sin `escapeHTML()`. Corregido y
verificado con un payload real (`<img onerror=...>`, `<script>`) — ahora sale
como texto escapado.

**4) ⚠️ HALLAZGO SERIO — control de acceso real en `firestore.rules`:** la
colección `diarios` en producción tiene `allow read/create/update/delete: if
signedIn()` — CUALQUIER usuario logueado puede leer, sobrescribir o borrar el
diario (reflexiones privadas) de CUALQUIER OTRO usuario, con el ID de
documento predecible (`{cu}_{fecha}`). Combinado con el punto 3 (antes de este
fix), esto era una vía real de XSS almacenado, no solo teórica: alguien podría
escribir contenido malicioso en el diario de otro usuario (adivinando su
`cu`), y ese contenido se ejecutaría cuando la víctima abriera su propio
diario. **Corregido en el archivo `firestore.rules` del repo** (no publicado
— eso es tarea exclusiva de Inty, ver "🔴 LO MÁS URGENTE" en `PENDIENTES.md`):
- `isOwnerOrLegacy()` NO sirve para esta colección — su "grandfather" da por
  dueño a cualquiera cuando falta el campo `authUid`, y los diarios NUNCA lo
  tienen (usan `user`), así que habría quedado siempre abierto igual. Se usa
  `isOwnerByCu()` solo.
- En `create` se exige además `request.resource.data.user ==
  request.auth.uid`, para que nadie pueda "adelantarse" y crear el documento
  de otro usuario con contenido propio antes de que ese usuario escriba el
  suyo (ese hueco sí existe todavía en `users`/`routes`/`trips` con el patrón
  viejo, pero ahí el impacto es menor — perfil público/rutas, no un diario
  privado; queda anotado para revisar en una pasada futura si hace falta).
- **Sigue sin publicarse en producción** — el hueco de acceso sigue abierto
  hasta que Inty lo publique desde Firebase Console.

Deploy: `librepedal.cl/version.txt` → `6.27` confirmado en vivo (código de la
app). `firestore.rules` quedó commiteado en el repo, NO publicado en Firebase.

## v6.26 — 2026-07-12 — Claude (sesión 2, barrido #3: Mis viajes / Rutas)
Función #3 del barrido completo (historial de rutas, perfil de elevación,
planificador por presupuesto, calculadora de gastos, video de ruta).

**Verificado sin bugs**: `calcularDesnivel` (perfil de elevación) ya filtraba bien
los puntos sin altitud y exigía un mínimo de 5 válidos antes de calcular; el
dedupe entre rutas locales y de la nube (`loadRoutesList`) usa `startTime` como
clave además de `firebaseId`, y se confirmó que ambos lados escriben el mismo
número plano (no hay descalce Timestamp-vs-número que rompiera la comparación).

**2 bugs reales de validación numérica, misma familia**: tanto el
"Planificador por presupuesto" (`buscarPlanPresupuesto`) como la "Calculadora de
gastos" del viaje activo (`calcularGastos`) aceptaban números **negativos** en
presupuesto/km/comida/alojamiento sin ningún clamp — un usuario que escribe
"-5000" (a propósito o sin querer) veía resultados sin sentido como "-$1.000
/noche". Los inputs HTML ya tenían `min="0"`, pero eso no bloquea escribir un
negativo a mano, solo afecta las flechitas del spinner. Corregido con
`Math.max(0, ...)` en los 4 campos (presupuesto, km, comida, noche),
consistente con cómo ya se protegía "días" (`Math.max(1,...)`) desde antes.

Deploy: `librepedal.cl/version.txt` → `6.26` confirmado en vivo.

## v6.25 — 2026-07-12 — Claude (sesión 2, barrido #2: Inicio / Esfera de apps)
Función #2 del barrido completo. A diferencia de la #1 (GPS/navegación, con muchos
bugs de comandos de voz), esta función resultó sólida en su núcleo — reviso y dejo
constancia de lo verificado, no solo de lo corregido.

**Verificado sin bugs** (con pruebas reales en el navegador, DOM real):
- Los 11 íconos de la esfera (`esferaItems`) — cada uno probado, ningún enlace roto
  ni función con nombre mal escrito.
- `cv()`/`volverAtras()` — pila de historial de navegación probada con una secuencia
  real de 4 vistas + reintentos: no duplica al reabrir la misma vista, retrocede en
  el orden correcto, no se rompe al llegar al final de la pila.
- Fondo espacial de la esfera (cosmético con Darma) — sí exige el desbloqueo real
  antes de activarse, no hay forma de saltárselo.
- Contador "Viajes" de la esfera — confirmé que NO duplica cuenta entre viaje rápido
  (`startQuickTrip`, guarda en `rutasLocales()`) y viaje planificado (`trips` de
  Firestore): son caminos de guardado distintos y mutuamente excluyentes.

**1 bug real encontrado y corregido — XSS en las sugerencias de destino:**
`sugerirDestino()` insertaba el nombre del lugar (`display_name` de Nominatim/
OpenStreetMap, una fuente externa editable por cualquiera) directo en
`innerHTML`, sin `escapeHTML()` — inconsistente con el resto de la app, que sí lo
hace en todos lados (rutas, chat, comunidad). También el mensaje "Sin resultados
para 'X'" insertaba lo que el usuario escribió sin escapar. Probado con un
`display_name` malicioso (`<img src=x onerror=alert(1)>`) simulando la respuesta
de Nominatim: antes se habría insertado como HTML real, ahora sale como texto
escapado, confirmado en el navegador con la respuesta real interceptada.

Deploy: `librepedal.cl/version.txt` → `6.25` confirmado en vivo.

## v6.24 — 2026-07-12 — Claude (sesión 2, barrido #1: ampliar vocabulario de Pistero)
Inty pidió ampliar el vocabulario: "hay muchas formas de referirse a un mismo tema,
cuando se le pida a Pistero debe reconocer todo". Pasada completa por
`handleVoiceCommand` agregando sinónimos/variantes chilenas naturales a cada
comando, todo verificado en el navegador (no solo agregado a ciegas).

**2 hallazgos de seguridad, los más importantes de esta pasada:**
- **Decir solo "¡ayuda!" abría el TUTORIAL en vez de disparar el SOS.** El
  tutorial tenía "ayuda" sin anclar y se revisaba antes de tener nada más
  específico. Ahora "ayuda" sola (anclada, sin nada más) dispara `enviarSOS()`
  — que además ya estaba bien diseñado: no manda nada solo, abre una pantalla
  de "a quién avisar" (WhatsApp), así que ampliar sus gatillos no tiene riesgo
  de sobre-alertar. "necesito ayuda con la app" sigue yendo al tutorial (se
  probó explícitamente que NO dispara el SOS por accidente).
- **"estoy herido", "me caí", "no puedo levantarme", "necesito una ambulancia"
  armaban un viaje falso** en vez de activar la emergencia — mismo bug de toda
  la función, pero en el peor lugar posible.

**Resto de variantes agregadas y verificadas** (mapa: "dónde estoy"/"mi
ubicación"; amigos: "solicitudes de amistad"; guardar: "termina/finaliza/acaba
el viaje"; destino: "trázame la ruta a…", "parte para…", "arranca hacia…";
esfera: "menú principal"; inicio: "home"; taller: "se me pinchó la rueda";
guía: "dónde puedo acampar" — este último necesitó una segunda vuelta porque
"dónde acampar" (sin "puedo" de por medio) tampoco calzaba, mismo patrón de bug
otra vez, mismo fix de tolerancia de espacio; stats: "cómo voy"; voz: "quiero
que hables").

Verificado que nada de esto rompió destinos reales (Cuesta Barriga, ruta 68) ni
comandos ya arreglados (cállate, pendiente).

Deploy: `librepedal.cl/version.txt` → `6.24` confirmado en vivo.

## v6.23 — 2026-07-12 — Claude (sesión 2, barrido #1: cierre de handleVoiceCommand)
Última pasada de variantes sobre `handleVoiceCommand` antes de cerrar la función #1
del barrido completo.

**2 bugs más encontrados y corregidos:**
- **"guárdame el viaje" / "guarda esta ruta" no guardaban nada** — el patrón viejo
  `(guarda|guardar|graba|grabar)( el| la| mi)? (viaje|ruta)` exigía que el artículo
  fuera EXACTAMENTE "el"/"la"/"mi" pegado al verbo. "guárdame" (con el "me" pegado)
  y "esta ruta" (con "esta", no en la lista) no calzaban con nada — la orden de
  guardar el viaje, la más importante de toda esta función, se perdía en silencio
  (con el fix de mapa/rutas de v6.22 ahora abrían una vista en vez de guardar, que
  es mejor pero sigue sin ser lo que se pidió). Regex nueva: `(guarda|guardar|graba|
  grabar)(me)?\b.{0,20}\b(viaje|ruta)` — acepta el sufijo "me" y hasta 20 caracteres
  de por medio en vez de una lista fija de artículos.
- **"cuánto" se comía cualquier pregunta con esa palabra** — `/cuanto|kilometro|
  distancia/` respondía SIEMPRE con el resumen de km/calorías totales, aunque
  preguntaras "cuánto me falta" o "cuánto se demora la bajada" (nada que ver).
  Acotado a que la pregunta sea realmente sobre distancia/kilómetros; el resto cae
  ahora a la IA de Pistero, que sí puede intentar responder algo relevante.

Con esto, `handleVoiceCommand` (silencio, guardar, continuar/trackear, mapa,
rutas, viajes, guía/hospedaje, pendiente/subida/bajada, distancia, SOS, tutorial)
quedó probado variante por variante contra el código real en el navegador, no
solo el caso feliz. **Función #1 (GPS y navegación) — CERRADA.**

Deploy: `librepedal.cl/version.txt` → `6.23` confirmado en vivo.

## v6.22 — 2026-07-12 — Claude (sesión 2, barrido #1: metodología "buscar variantes")
Inty aclaró el método para todo el barrido: pendiente/bajada (v6.21) era solo UN
EJEMPLO — para cada función hay que buscar variantes de frases/uso reales,
cuestionar si funciona bien, y mejorarla si hay forma. Apliqué esto a
`handleVoiceCommand` completo, probando ~25 frases naturales reales (no solo el
caso feliz) contra el código de verdad en el navegador.

**Encontrados y corregidos 7 bugs más de la MISMA clase** (frase natural no
calzaba con un patrón `^...$` anclado exacto → caía en el comando genérico de
"arma un viaje a lo que dijiste" → intentaba navegar a un destino falso):
- "muéstrame el mapa", "ábreme el mapa" → ahora abren el mapa (antes intentaban
  viajar a un lugar llamado "muéstrame el mapa").
- "muéstrame mis rutas" → ahora abre Rutas.
- "muéstrame mis viajes" → ahora abre Mis viajes.
- "muéstrame la guía", "busco un hostal" → ahora abren la CicloGuía.
- **"cállate por favor", "silencio porfa", "no hables más"** → el más grave de
  los 7: en vez de callarse, Pistero intentaba armar un viaje. Es justo el
  comando que más urge que funcione bien (silenciar la voz mientras vas
  pedaleando, con las manos ocupadas). Corregido.

**Cómo se arregló sin romper nada**: se sacó el anclado `^...$` de esos patrones
(mapa/rutas/viajes/guía ya funcionaban así de sin-anclar en chat/taller/stats, se
igualaron al mismo estilo). Para el comando de silencio se separó en dos partes:
"para"/"ya" se dejaron ANCLADOS a propósito (son palabras demasiado comunes en
frases normales — "¿cuánto para llegar?" — buscarlas sueltas en cualquier parte
habría silenciado la voz por accidente todo el tiempo), y "cállate"/"silencio"/
"no hables más"/"deja de hablar" se dejaron sin anclar (son frases distintivas,
sin ese riesgo).

**Verificado que NO se rompieron destinos reales** con la misma prueba: "llévame
a la Cuesta Barriga", "vamos a la ruta 68" (contiene literalmente la palabra
"ruta", el caso de colisión más riesgoso), "Valparaíso", "Puerto Varas" — los
4 siguen armando el viaje correcto, porque el patrón de destino con verbo
("llévame a...", "voy a...") se revisa ANTES y ya se queda con la frase.

Deploy: `librepedal.cl/version.txt` → `6.22` confirmado en vivo. Sigue el barrido
función por función — esta metodología (probar variantes reales, no solo el
caso feliz, en el navegador de verdad) aplica a TODAS las funciones que vengan.

## v6.21 — 2026-07-12 — Claude (sesión 2, barrido #1 continuación: comando de voz "pendiente"/"bajada")
Inty preguntó específicamente qué pasaba con la llamada de voz de "pendiente" y
"bajada". Probé `handleVoiceCommand()` en el navegador de verdad (no de memoria) y
confirmé un bug real: decir "bajada", "pendiente" o "subida" sueltas por voz las
trataba como si fueran el NOMBRE DE UN LUGAR — armaba un viaje hacia un destino
literal "bajada"/"pendiente"/"subida" (que fallaría el geocode), en vez de contestar
sobre el terreno actual.

**Corregido**: nueva función `_pendienteActualTexto()` que responde con el dato
REAL — usa el mismo perfil de elevación pre-cargado que ya usa el aviso anticipado
(`avisarPendienteAnticipada`, v6.05) si hay una navegación con destino activa, y si
no, cae al detector reactivo `zonaPendienteActual` (GPS libre). Nuevo comando en
`handleVoiceCommand` con regex **anclada** (`^...$`) a propósito: intercepta solo
frases cortas de consulta ("pendiente", "hay una bajada", "cómo está la subida"),
NO cualquier frase que contenga esas palabras — así "llévame a la Cuesta Barriga"
(lugar real, está en el propio listado de postales de la app) sigue funcionando
como destino, sin choque.

Verificado en el navegador con 10+ frases reales (bajada/pendiente/subida sueltas,
con artículo, preguntas naturales, y destinos reales de 1 y 2 palabras) — todas se
enrutan donde corresponde. También probada la rama con perfil de ruta cargado
(subida/bajada/plano simulados con datos de elevación reales) — responde correcto
en los 3 casos.

Deploy: `librepedal.cl/version.txt` → `6.21` confirmado en vivo.

## v6.20 — 2026-07-12 — Claude (sesión 2, barrido función por función #1: GPS y navegación)
Inty pidió un barrido de TODA la app, función por función, cerrando cada una antes de
pasar a la siguiente. Empezamos por el núcleo: GPS y navegación (GPS libre,
cronómetro, auto-pausa, navegación turn-by-turn, recálculo de ruta, detección de
caídas, sensores Bluetooth, ahorro de batería GPS).

**Revisado y verificado sin cambios** (código correcto, no se tocó):
- Detección de caídas: umbral de 3.5g razonable, doble chequeo de quietud (1.5s+3s)
  para no confundir un bache con una caída, alarma sonora+vibración, y el SOS respeta
  que WhatsApp exige un toque del usuario (no intenta mandar el mensaje solo, sería
  imposible y engañoso prometerlo).
- Sensores Bluetooth (pulsómetro/potenciómetro): parseo correcto del formato GATT
  estándar (flags de 8/16 bits en heart_rate, offset correcto en cycling_power),
  reconexión automática con reintentos si el sensor se corta.
- Recálculo de ruta al desviarte: ya tenía cooldown + backoff + tope de intentos
  seguidos de una sesión anterior — sigue bien.

**Bug real encontrado y corregido — Ahorro de GPS no se aplicaba en vivo en la
versión web:** `toggleAhorroGPS()` solo reiniciaba el GPS con la nueva precisión
cuando había plugin nativo (`lpBackgroundGeo`). En el navegador/PWA (el camino MÁS
usado hoy, ver estado del micrófono) el `watchPosition` del navegador se queda
con las opciones viejas hasta que apagas y prendes el GPS de nuevo — el botón
cambiaba, Pistero decía "cambié la precisión", pero en los hechos no pasaba nada
hasta reiniciar. Corregido: ahora corta el watch viejo y abre uno nuevo con las
opciones correctas, tanto en GPS libre como en navegación activa. De paso,
la función anónima del callback de navegación (duplicada en dos lugares) quedó
como función nombrada `_navGeoCallback` para poder reusarla aquí sin repetir código.
Verificado en el navegador interceptando `watchPosition`/`clearWatch` para
confirmar que se llama con las opciones y el callback correctos, en ambos modos.

Deploy: `librepedal.cl/version.txt` → `6.20` confirmado en vivo.

## (sin bump de versión web) — 2026-07-12 — Claude (sesión 2, plugin de mic nativo)
Inty: "revisar el código y avanzamos". Después de la auditoría de v6.19, seguí con
el ítem más accionable que quedaba en `PENDIENTES.md`: el micrófono nativo en el
APK instalado (el único hueco real que quedaba del pendiente de "Gemini").

**`@capacitor-community/speech-recognition` agregado a `package.json`**, fijado en
`^6.0.1` — **no** `latest` (que es `^7.0.1` y pide Capacitor 7; este proyecto usa
Capacitor `^6.1.2`, así que instalar la última versión a ciegas habría roto el
build). Verifiqué contra la documentación real de la v6.0.1 (vía `unpkg`/registry
de npm, no de memoria) antes de tocar nada — la API (`requestPermissions()`,
`start({language,maxResults,partialResults,popup})` → `Promise<{matches:[...]}>`)
coincide exactamente con lo que `_micNativoEscuchar()` en `index.html` ya llamaba
desde antes, así que no hizo falta cambiar una sola línea de `index.html`. El
README confirma que en Android "no further action required" más allá del permiso
`RECORD_AUDIO`, que `scripts/patch-android.js` ya inyecta y pide en runtime desde
antes. `package.json` ya estaba en los `paths:` de `build-apk.yml`, así que el
push dispara el build solo.

No toqué `index.html`/`version.txt`/`sw.js` — este cambio es 100% nativo (Android),
no hay nada distinto en la PWA web, así que no tenía sentido subir `APP_VERSION`.
El número de versión visible en la app seguirá en 6.19 hasta el próximo cambio web
real; el APK sí llevará este plugin nuevo en su próximo build automático.

**Pendiente real que queda:** ninguna IA tiene un teléfono Android a mano para
confirmar que el plugin compila y que el reconocimiento de voz funciona de
verdad dentro del WebView instalado (la teoría/documentación dice que sí, pero
"funciona en la doc" y "funciona en el dispositivo" no son lo mismo). Cuando
alguien lo instale y pruebe, actualizar `PENDIENTES.md`.

## v6.19 — 2026-07-12 — Claude (sesión 2, revisión de código de la otra sesión)
Inty pidió "dale" a exportar GPX (ya lo había hecho la otra sesión, v6.15/v6.16) y
"revisar el código y avanzamos". Auditoría real (no solo leer BITACORA) de lo que
la otra sesión construyó en v6.15-v6.18: GPX export/import y respaldo/restauración
de datos completo.

**Bug real encontrado y corregido en `importarMisDatos()`** (restaurar respaldo,
v6.18): al restaurar el perfil, el casco (`selectedHelmet`) sí se guardaba en
`localStorage`, pero el **skin y el lente NO** — se quedaban solo en la variable
en memoria. Como el login (`window.onload`) relee casco/skin/lente de
`localStorage` en cada carga, un usuario que restaurara su respaldo y luego
recargara la app (ej. después de reinstalar) recuperaba el casco pero perdía el
skin y el lente otra vez — "restaurar tu perfil" quedaba incompleto en silencio.
Tampoco se llamaba a `initCustomization()`, así que ni siquiera se veía el cambio
en la sesión actual sin navegar manualmente a Personalizar. Arreglado: los 3 ahora
se guardan en `localStorage` y se refresca la vista.

**Resto de lo auditado (GPX export/import, `exportarMisDatos`, dedupe de rutas
por `localId`, merge de estadísticas por el máximo) — verificado en el navegador
de verdad, no solo leído:**
- `_gpxDeRuta`: XML válido (parseado de vuelta con `DOMParser` sin error), incluye
  `<ele>`/`<time>`, y el nombre de la ruta se escapa (`escapeHTML`) antes de ir al
  XML — probé con un nombre `<script>alert(1)</script>` y salió como texto, no
  como tag.
- `importarGPX`: subí un GPX sintético estilo Strava (`<trkpt>` con ele+time) vía
  `File`+`DataTransfer` reales (no mock) → quedó en `rutasLocales()` con el nombre,
  distancia y puntos correctos.
- `lpConfirmar`/`lpAviso`/cronómetro (v6.14): confirmado que siguen funcionando
  después de que la otra sesión tocó el archivo — modal abre, resuelve la Promise,
  cierra; cronómetro tickea y se detiene bien.

**Además:** `sw.js` `CACHE` se había quedado en `v614` durante TODO el rango
v6.15-v6.18 de la otra sesión — el bug recurrente de desincronía de versión que
ya habíamos peleado antes. Corregido a `v619` junto con `APP_VERSION`/`version.txt`.

Deploy: Cloudflare Pages (`librepedal.cl/version.txt` → `6.19` confirmado en vivo).
Nota de proceso: la verificación en navegador esta vez SÍ se pudo completar
end-to-end con `javascript_tool` (la caída de herramientas de la respuesta
anterior era temporal, del lado de la infraestructura, no de la app).

## v6.14 — 2026-07-12 — Claude (sesión 2, continuación)
**Cronómetro visible en GPS libre + reemplazo de los 77 diálogos nativos del
navegador (alert/confirm/prompt) por diálogos con el tema de la app.** Inty
notó que faltaba un cronómetro, y pidió resolver "lo genérico" de la app.

**1. Cronómetro en GPS libre** (`index.html`): existía `navTime` en la
navegación turn-by-turn, pero el modo "GPS libre" (el más usado, sin destino
fijo) no mostraba ningún tiempo mientras se pedaleaba. Se agregó `#dashCrono`
en el dashboard, tickeando cada segundo de verdad (`setInterval`, no atado a
la llegada de un fix GPS) y reusando `tripStartTime`/`tiempoActivoMs()` —el
mismo mecanismo de auto-pausa que ya tenía la navegación—, así que respeta
las paradas sin más código nuevo. Arranca en `toggleGPS()` (ambas rutas:
background-geo y `watchPosition`) y se apaga tanto al detener el GPS como al
empezar una navegación a destino (`_detenerGpsLibreSiActivo()`, que antes
apagaba el GPS libre "por debajo" sin pasar por `toggleGPS()` — sin este
segundo punto de apagado el cronómetro se habría quedado tickeando fantasma).

**2. Diálogos nativos → temáticos**: 68 `alert()`, 7 `confirm()` y 2 `prompt()`
(3 llamadas) rompían la identidad visual — aparecen sin el tema oscuro/naranja
de la marca, genéricos del navegador. Nuevo sistema (`lpAviso`, `lpConfirmar`,
`lpPedirTexto`) cerca de `closeModal()`: `lpAviso` usa el bocadillo de Pistero
(`mostrarBocadillo`, ya existía); `lpConfirmar`/`lpPedirTexto` son un modal
propio nuevo (`#lpDialog`, con el borde naranja y fondo oscuro de siempre) que
devuelven una `Promise`, así que los call sites quedaron casi idénticos
(`if(await lpConfirmar(...))` en vez de `if(confirm(...))`) — las funciones
que no eran `async` se marcaron `async` (todas se llaman solo desde `onclick`,
verificado antes de tocar cada una, sin nada que dependa de un valor de
retorno síncrono).

**Reemplazo de `alert(` → `lpAviso(` hecho con un script (texto exacto,
case-sensitive) en vez de a mano en 68 sitios — se verificó antes que no
había colisión con identificadores como `showAlert(`/`addRouteAlert(`
(mayúscula distinta, no matchean) y después que no quedó ningún `lpAviso`
pegado a una letra (corrupción de nombre). Los 7 `confirm()` y 2 `prompt()`
sí se revisaron uno por uno a mano (contexto real, no todos eran igual de
simples: `irAlPuntoYNavegar` tenía el `confirm` dentro de un `setTimeout`
no-async, `finishTrip`/`eliminarNovedad`/`rechazarFrase` ya eran async).

**Verificación**: `node --check` sobre el `<script>` extraído confirma sintaxis
válida; grep confirma cero `alert(`/`confirm(`/`prompt(` nativos restantes
(salvo el comentario que los menciona) y ninguna función duplicada. La
verificación EN VIVO en el navegador (Browser pane) no se pudo completar esta
vez: `javascript_tool` y `computer` devolvieron error de "modelo
temporalmente no disponible" / timeout en cada intento — parece una caída
puntual de la infraestructura de esas herramientas, no algo de la app (el
`get_page_text` y `read_page`, que sí funcionaron, mostraron la app cargando
y renderizando bien). **Queda pendiente una prueba real rápida** (abrir GPS
libre y ver que el cronómetro corra; disparar algún `lpAviso`/`lpConfirmar`
real, ej. borrar una ruta) — deploy ya está en producción, es de bajo riesgo
si algo se ve raro con avisar.

Deploy: Cloudflare Pages (`librepedal.cl/version.txt` → `6.14` confirmado en
vivo) + push a `main` (dispara rebuild del APK con el mismo pipeline
verificado en v6.13).

## v6.13 — 2026-07-12 — Claude (sesión 2)
**Fix real del ícono de la app, de raíz, en los 3 lugares donde estaba mal — no
solo el archivo que se veía, sino el pipeline que lo genera.** Inty reportó que el
ícono de la app no tenía el logo de Libre Pedal.

**Causa raíz encontrada (no era solo "cambiar un archivo"):**
1. `icon.svg` (usado por el manifest de la PWA) era un dibujo genérico de una
   bicicleta/casco hecho a mano — NUNCA fue el logo real de la marca. Se ve en
   cualquier "agregar a inicio" desde el navegador.
2. `.github/workflows/build-apk.yml` hace `npx cap add android` en CADA build
   (la carpeta `android/` no se versiona) y **nunca tuvo un paso que generara un
   ícono nativo personalizado** — el APK instalado mostraba el ícono GENÉRICO DE
   CAPACITOR (ni siquiera el bike genérico), porque nada en el pipeline lo
   sobreescribía. Esto se perdía en cada build, aunque alguien lo hubiera
   arreglado a mano una vez.
3. `apple-touch-icon` apuntaba a un `.svg` — Safari de iOS ignora SVG en ese tag
   (solo acepta PNG/JPEG), así que en iPhone ese ícono nunca funcionó, quedaba
   en blanco.

**Arreglado:**
- `icon-192.png` / `icon-512.png` generados a partir de `play-icon-512.png` (el
  logo real, ya verificado antes) — reemplazan a `icon.svg` en `manifest.json`,
  favicon/apple-touch-icon de `index.html`, favicon de `bienvenida.html`, `CORE`
  de `sw.js`, y la lista de `scripts/copy-web.js`. `icon.svg` eliminado (nada lo
  usa ya).
- Nuevo `resources/icon.png` (1024×1024) y `resources/splash.png` +
  `splash-dark.png` (2732×2732, fondo `#0a0f1d` real de la app con el logo
  centrado — el splash por defecto de `@capacitor/assets` sale con fondo BLANCO
  si no le das uno propio, se veía fuera de marca).
- `build-apk.yml`: nuevo paso `npx @capacitor/assets generate --android` entre
  "Agregar plataforma Android" e "Inyectar permisos nativos" — genera TODAS las
  densidades de ícono (`mipmap-*`, normal y redondo) y splash (claro/oscuro,
  retrato/paisaje) en cada build, de ahora en adelante siempre con el logo real.
  `paths:` del workflow actualizado para disparar rebuild si cambian los
  archivos de ícono/resources.

Verificación: probado LOCAL antes de tocar el pipeline de CI — corrí
`npx cap add android` + `npx @capacitor/assets generate --android` de verdad en
este equipo (no solo escrito, corrido de verdad) y revisé visualmente el ícono cuadrado, el
redondo, y el splash resultante — los 3 con el logo y colores correctos. La
carpeta `android/` de prueba se borró después (se regenera sola en cada build,
está en `.gitignore`, no hacía falta conservarla). Sintaxis de `index.html` y
`manifest.json` verificada tras los cambios.

---

## v6.12 — 2026-07-12 — Claude (sesión 2)
**Respaldo real de la base de datos + migración de auth anónima a tokens
personalizados.** Inty pidió "respaldar todo el proyecto" y luego "vamos por la
recomendación" para hacerlo gratis; generó una Firebase service account key y
pidió hacer también la migración de seguridad completa con la misma llave.

**Respaldo (ya ejecutado, no solo preparado):**
- `scripts/backup-firestore.js` — lee las 22 colecciones reales de la app (más
  la subcolección `dm/{conv}/messages`) con el Admin SDK y las guarda como JSON.
  100% gratis: son lecturas normales, sin Cloud Storage ni plan Blaze.
- Corrido de verdad: `LibrePedal-Backups/firestore-2026-07-12-12-56-23/` (1.6 MB,
  26 usuarios, 4.034 recomendaciones/POI, 32 rutas, y el resto de las colecciones
  con datos reales de producción). Reusable para respaldos futuros.
- Además quedó el respaldo de código de la sesión anterior (`.bundle` de git +
  `.tar.gz` de archivos) en la misma carpeta.

**Migración de auth (implementada, probada end-to-end, y en vivo):**
- Nuevo Worker aislado `librepedal-auth` (repo: `worker-auth/`) — SOLO emite
  tokens personalizados de Firebase, nada más. Aislado a propósito del Worker de
  IA para no exponer la service account key a nada que no la necesite.
- Usa `jose` (WebCrypto, compatible con el runtime de Workers) para firmar el
  JWT con RS256 siguiendo el formato oficial de Firebase — no usa `firebase-admin`
  (es de Node, no corre en Workers).
- ⚠️ Nota técnica para la próxima vez que alguien haga esto: `wrangler secret put`
  TRUNCA valores multilínea leídos por stdin — la private key hay que subirla en
  base64 (una sola línea) y decodificarla adentro del Worker con `atob()`, no como
  texto plano con `\n` literales.
- Verificado en 2 niveles: (1) el JWT que emite el Worker tiene los claims
  correctos (`uid`, `iss`, `sub`, `aud`, `exp`); (2) probado contra la API REAL de
  Firebase (`accounts:signInWithCustomToken`) — la aceptó y devolvió una sesión
  válida con el `uid` exacto pedido. Probado también en el navegador real: antes
  `firebase.auth().currentUser.uid` era aleatorio, después de llamar a la función
  nueva pasó a ser exactamente el `cu` pedido.
- Cliente (`index.html`): nueva `_actualizarAuthConTokenPersonalizado(cu)`,
  llamada en el login que restaura sesión (`window.onload`) y en el registro
  nuevo (`reg()`), justo después de fijar `cu`. Si el Worker no responde (sin
  señal, caído), la sesión anónima que ya arrancó sola al abrir la app sigue
  funcionando exactamente igual que siempre — no bloquea ni rompe el login.
- `firestore.rules`: nueva `isOwnerByCu()` (compara `request.auth.uid` contra el
  campo `user`, que YA vive en cada documento desde siempre) — a diferencia del
  `authUid` de v6.11, esto protege TAMBIÉN los documentos viejos, sin re-escribir
  nada, apenas el usuario recargue la app una vez. Nueva `isAdmin()` real
  (`request.auth.uid == 'intyrivera_a_gmail_com'`) — por fin `novedades`, `retos`
  y aprobar/rechazar `frasesComunidad` son admin-only DE VERDAD (antes cualquier
  `signedIn()` podía publicar/editar eso llamando la API directo; la UI solo lo
  ocultaba). También `users.update` ahora exige dueño real (antes cualquiera
  autenticado podía sobrescribir el perfil de otro con solo saber su `cu`).

**IMPORTANTE — pendiente de Inty, no de una IA (igual que en v6.11, sigue sin
publicarse)**: `firestore.rules` está listo en el repo pero las reglas de
Firestore se publican a mano en Firebase Console. Nota extra esta vez: apenas
publique las reglas nuevas, Inty debe recargar la app UNA vez antes de usar el
panel de admin (para que su sesión suba del auth anónimo al token personalizado
y `isAdmin()` lo reconozca) — si no, sus propias acciones de admin quedarían
bloqueadas hasta que recargue.

Verificación: sintaxis de `index.html` (0 errores), `firestore.rules` (llaves y
paréntesis balanceados fuera de comentarios). Worker `librepedal-auth` probado en
vivo (JWT válido + aceptado por Firebase real + probado en navegador real). Script
de respaldo corrido de verdad contra producción, no solo escrito.

---

## v6.11 — 2026-07-12 — Claude (sesión 2)
**Cierra parte del hueco de seguridad de Firestore que se anotó como limitación
conocida en la sesión anterior**: cualquier usuario autenticado (aunque fuera anónimo)
podía editar/borrar contenido de OTRO usuario en la mayoría de las colecciones,
porque las reglas solo exigían `signedIn()`, sin verificar dueño real.

**Causa de fondo (sigue sin resolverse del todo, ver abajo)**: la app usa Auth
ANÓNIMA de Firebase — el `uid` de cada sesión es aleatorio y no tiene relación con
el `cu` propio de la app (derivado del correo). Las reglas no podían comparar
"¿es el dueño?" porque no había ningún campo guardado que lo permitiera verificar.

**Arreglo de esta versión (real, pero parcial a propósito):**
- Cliente: se agregó `authUid` (el uid real de Firebase Auth, ya se leía en
  `window.lpUID` desde antes solo para `users`) a las 15 escrituras de contenido
  comunitario: `reportes` (x2), `guiComments`, `hostels`, `repairTips`, `routes`,
  `trips`, `alojo`, `recommendations` (x2), `rodadas`, `segmentoTiempos`,
  `friendRequests`, `dm/messages`, `frasesComunidad`.
- `firestore.rules`: nueva función `isOwnerOrLegacy()` — exige que el `authUid`
  guardado en el documento coincida con `request.auth.uid` para `update`/`delete`,
  EXCEPTO en documentos de antes de este cambio (sin el campo, se dejan pasar
  igual que siempre — grandfather clause, cero riesgo de romper datos viejos).
  Aplicado a `reportes`, `guiComments`, `repairTips`, `routes`, `trips`, `alojo`,
  `dm/messages`, `segmentoTiempos` (update+delete), y a `recommendations`,
  `hostels`, `friendRequests`, `rodadas` (solo delete — dejé `update` abierto en
  estas 4 porque tienen actualizaciones LEGÍTIMAS de otros usuarios: likes,
  calificaciones, aceptar/rechazar solicitud, marcar asistencia — verifiqué cada
  caso leyendo el código antes de tocar la regla, para no romper esas funciones).
- Revisé cada colección buscando funciones de `.delete()`/`.update()` reales antes
  de restringir nada — varias (reportes, guiComments, hostels, repairTips,
  recommendations, alojo, segmentoTiempos, rodadas) no tenían NINGUNA función de
  borrado en toda la app, así que restringirlas no arriesga romper nada existente.
- `REGLAS-FIREBASE.txt` (archivo obsoleto de 2026-07 temprano que recomendaba
  `allow read, write: if true` — base totalmente abierta) corregido para apuntar
  al `firestore.rules` real, con advertencia de que ya no se debe usar.

**Lo que ESTO NO arregla (documentado en el propio `firestore.rules`, ver el
comentario "LIMITACIÓN CONOCIDA" al inicio del archivo):**
- El `authUid` es de la SESIÓN anónima actual — si el mismo usuario cambia de
  celular o borra datos de la app, su próxima sesión tiene un uid distinto y ya no
  coincide con el de sus documentos viejos (aunque sí sigue protegido contra que
  OTROS lo toquen, que era el riesgo real).
- No resuelve la suplantación de admin: `frasesComunidad` (aprobar/rechazar),
  `novedades` y `retos` (crear/editar) siguen abiertas a cualquier `signedIn()` en
  las reglas — el panel de administración solo las oculta en la UI, pero alguien
  llamando la API de Firestore directo podría publicar "Novedades" falsas o
  aprobar sus propias frases. No hay forma de verificar "es EL admin" con un uid
  anónimo aleatorio.
- El arreglo completo y permanente para AMBOS puntos es migrar de auth anónima a
  tokens personalizados de Firebase atados al `cu` real — requiere una Firebase
  service account key (gratis, la genera Inty desde la consola) para que un Worker
  los emita. Quedó explicado a Inty en el chat; su decisión si y cuándo hacerlo.

**IMPORTANTE — pendiente de Inty, no de una IA**: `firestore.rules` está
actualizado en este repo, pero las reglas de Firestore se publican pegándolas en
Firebase Console (Firestore Database → Reglas → Publicar). Es un cambio de
control de acceso sobre la base de datos de producción — ninguna IA lo publica
por su cuenta aunque tenga permiso total, por diseño. El código de la app
(`index.html`, ya en vivo) ya guarda `authUid` en cada escritura desde ahora, así
que cuando Inty publique las reglas nuevas, todo lo escrito desde este momento en
adelante ya queda protegido sin más pasos.

Verificación: sintaxis de `index.html` (0 errores). `firestore.rules` revisado a
mano (llaves y paréntesis balanceados fuera de comentarios, confirmado con un
script). Los 15 sitios de escritura confirmados con `authUid` presente por grep.
No se probó contra Firestore real (habría creado documentos de prueba en
producción) — la revisión fue por lectura de código + verificación mecánica.

---

## v6.10 — 2026-07-12 — Claude (sesión 2, autónoma, de madrugada)
**Segunda auditoría pedida por Inty ("auditoría sobre auditoría"), antes de irse a
dormir, con permiso total y sin supervisión.** Primero reverifiqué que los 15 fixes
de la QA v6.03 y todos los cambios de v6.04-v6.09 siguieran intactos (cero
regresiones — Inty había notado que bugs ya corregidos volvían a aparecer). Todo
confirmado presente y correcto.

Después lancé 3 agentes en paralelo cazando específicamente el patrón de bug que
Inty pidió: "algo no está donde debería estar porque no lee de donde corresponde".
- **Agente 1 (cableado de navegación)**: encontró **1 bug real, y es mío, de la
  MISMA sesión de hoy**: al agregar el botón "← Atrás" en el header le puse la
  clase `es-globe` (para heredar el estilo) — pero eso hizo que `document.
  querySelector('.es-globe')` (usado por el spotlight del tutorial, paso 2 "Tu
  Esfera") ahora encontrara el botón Atrás PRIMERO (oculto, tamaño 0) en vez del
  botón 🌐 real. El anillo de luz no se veía donde correspondía. Corregido: el
  botón 🌐 ahora tiene `id="btnEsferaHeader"` propio, y el tutorial apunta a ese id
  en vez de a la clase compartida. Reverifiqué LOS 17 PASOS del tutorial uno por
  uno (no solo el que falló) — todos resuelven a un elemento real y visible.
- **Agente 2 (datos escritos en un lugar, leídos en otro)**: reportó 2 candidatos
  (`repairTips` sin lectura, `guiComments` de texto sin lectura). Los investigué a
  fondo YO MISMO antes de tocar nada — **ambos eran falsos positivos**:
  `loadRepairTips()` sí existe y sí se llama en el login (línea ~1964 y ~2070), y
  `subscribeToComments()` sí lee `guiComments` y sí filtra los votos aparte. El
  agente no las encontró en su búsqueda pero SÍ existen. No se tocó nada — verificar
  antes de "corregir" evitó romper algo que ya funcionaba.
- **Agente 3 (botones que llaman funciones inexistentes)**: revisó los ~220
  `onclick`/`onchange`/`oninput` del archivo contra las funciones declaradas.
  **Cero encontrados.** Esta capa está sana.
- **Sub-navegación ("pestañas")**: confirmado que el nuevo botón "← Atrás" (v6.09)
  funciona para navegación de varios niveles real (probado dash→chat→perfil→atrás→
  atrás en el navegador). El chat de un amigo específico ya tenía su propio "←
  Volver a amigos"; las categorías de Guía/Novedades/Hostales ya tienen "Todos"
  como reset. No hacía falta agregar nada ahí.

**Lección para la próxima ronda (de ambas sesiones)**: antes de reusar una clase CSS
existente en un elemento nuevo, revisar si algún `querySelector` en JS (spotlight del
tutorial, principalmente) depende de que esa clase sea única. Es fácil de repetir.

Verificación: sintaxis de `index.html` (0 errores). Los 17 pasos del tutorial
probados uno por uno en el navegador tras el fix (todos `found:true, visible:true`).

---

## v6.09 — 2026-07-12 — Claude (sesión 2)
**Rediseño de navegación pedido por Inty: la Esfera es ahora el "Inicio" permanente,
Mis viajes muestra lo que de verdad grabaste, y Pistero puede llevarte gráficamente a
cualquier función de la app cuando le preguntas cómo usarla.**

- **La Esfera es el Inicio siempre** (pedido explícito: "es lo que le da una
  diferencia"). Antes solo se abría sola al iniciar sesión; ahora TODO lo que antes
  llevaba a `v-dash` directo (botón "Inicio" de la barra inferior, los 5 botones
  "← Volver a Inicio" repartidos por la app, y el comando de voz "vamos al inicio")
  reabre la Esfera. `v-dash` (el panel con el buscador de destino) sigue existiendo
  intacto — se llega ahí con "☰ Menú clásico" dentro de la Esfera, o queda debajo
  cuando la Esfera se cierra.
- **Bug real: "llevo varios viajes y no aparece ninguno en Mis viajes".** Causa: la
  vista `v-trips` solo leía la colección `trips` (planificador multi-destino), pero
  quien sale a pedalear con "Iniciar navegación" directo (el camino normal, sin pasar
  por el planificador) graba su recorrido en OTRO lugar (`routes` + localStorage) que
  `v-trips` nunca mostraba — solo tenía un botón cruzado a una vista aparte
  ("Historial de rutas"). Ahora `renderRutas()` pinta en los dos contenedores
  (`v-routes` Y `v-trips`, clase compartida `.js-rutas-list`) — tus recorridos
  aparecen directo en "Mis viajes", sin un clic extra a otra pantalla.
- **"No veo mi puesto del Top 100 en la Esfera"**: `actualizarMiPuesto()` solo
  actualizaba el indicador de Estadísticas (adentro de Perfil) — en la pantalla de
  inicio real (la Esfera) nunca se veía. Ahora actualiza los dos a la vez.
- **Espacio liberado en la Esfera**: "Avisos" y "Mensajes" eran dos botones que
  llevaban al mismo lugar en el fondo (Social ya tiene amigos+solicitudes+chat
  juntos) — se fusionaron en uno ("🔔 Avisos", con badge real de solicitudes
  pendientes, antes esos badges eran decorativos y nunca se actualizaban). El slot
  liberado ahora muestra "Mi puesto" (rango real en el ranking).
- **Botón "← Atrás" universal**: nuevo historial de vistas en `cv()` (pila, tope 15).
  Antes solo había botones de "volver" a destinos fijos y a veces ninguno. Ahora una
  flecha en el header (visible solo si hay a dónde volver) regresa a la pantalla
  ANTERIOR real, no siempre a Inicio — probado con navegación de varios niveles
  (dash→chat→customize→atrás→atrás). "Inicio" limpia el historial (punto de
  reinicio, no tiene sentido "volver" desde ahí a una sesión de navegación vieja).
- **Pistero "te enseña" llevándote de verdad a la pantalla**: pedido de Inty — que
  conozca la app al 100% y, en vez de solo describir en texto cómo usar algo, te
  LLEVE ahí gráficamente. Nueva etiqueta `[ACCION:mostrar|clave]` (16 claves: esfera,
  sos, destino, microfono, pistero, velocidad, darma, logros, musica, ajustes, mapa,
  reportar, ciclistas, social, taller, perfil) reutiliza el spotlight REAL del
  tutorial inicial (`tutSpotlight`/`tutorialSteps`) sobre un solo paso, en vez de
  correr el tutorial completo desde cero. Gateado igual que las demás órdenes: si el
  pedido es explícito ("cómo mando un SOS", "dónde está X") se ejecuta directo; si no,
  queda como botón opcional. Probado en vivo: "cómo mando un sos" → resalta el botón
  real de SOS; mención de pasada sin pedir ayuda → queda como botón, no invasivo.
  System prompt del Worker actualizado con la descripción 100% real de la app de hoy
  (Esfera como inicio, Mis viajes unificado, botón Atrás) y la nueva orden.

Verificación: sintaxis de `index.html` (0 errores) y `worker.js` (`node --check`, OK).
Navegación probada end-to-end en navegador (Esfera abre/cierra, historial de varios
niveles, Mis viajes muestra rutas grabadas de un usuario de prueba sin datos, badges
de rango/avisos). Worker probado en vivo con `curl` para el nuevo `[ACCION:mostrar]`.

---

## v6.08 — 2026-07-11 — Claude (sesión 2)
**4 bugs reales que Inty reportó de uso real: la IA arma un viaje con cualquier
pregunta, desplazamiento fantasma de GPS, comandos que se pisan, y Pistero
respondiendo con "código" + limitado solo a ciclismo.** Diagnostiqué cada uno leyendo
el código (no adiviné) antes de tocar nada.

**CRÍTICO — dos GPS watchers vivos a la vez ("desplazamiento fantasma" + "comandos que
se pisan"):** si "GPS libre" (`ig`) estaba grabando cuando el usuario pedía un destino
(por voz o escrito), `calculateAndStartNavigation()` abría SU PROPIO watcher de
posición (`gpsWatchId` → `_navPosUpdate()`) sin apagar el watcher de GPS libre
(`gw` → `ug()`). Quedaban DOS pipelines procesando el mismo GPS real al mismo tiempo:
cada fix se contaba dos veces (kilometraje doblado = "fantasma") y cada aviso de voz
(pendiente, clima, fatiga, frases del camino) se disparaba dos veces desde dos
funciones distintas = frases pisándose entre sí. Nueva `_detenerGpsLibreSiActivo()`:
apaga el watcher de GPS libre (guardando lo ya grabado) ANTES de que la navegación
abra el suyo — igual que el botón manual "Detener GPS".

**ALTO — cualquier pregunta se armaba como viaje:** en `handleVoiceCommand`, el regex
de destino tenía "busca"/"encuentra" con el complemento de lugar (" la dirección de",
" ruta a", " lugar") como OPCIONAL. Cualquier frase que arrancara con "busca..." o
"encuentra..." (muy común en el habla normal: "búscame información sobre...",
"encuentra un consejo para...") se armaba como viaje a un destino inexistente, fallaba
el geocode, y el ciclista veía "no encontré ese destino" — lo que reportó como "tira la
talla y manda a escribir". Ahora ese complemento es obligatorio; sin él, la frase sigue
al enrutador de preguntas/órdenes (que manda todo a la IA de Pistero, que si además
obedece o responde, es lo correcto).

**ALTO — Pistero respondía con "código":** cuando el modelo pedía una herramienta
(`[BUSCAR:...]`/`[CLIMA:...]`) y la segunda pasada al modelo fallaba (timeout, modelo
caído), el Worker devolvía el texto de la PRIMERA pasada, que trae la etiqueta cruda
sin limpiar — el ciclista veía literalmente `[BUSCAR: historia de tal lugar]` en vez de
una respuesta. Corregido en `worker.js`: si la segunda pasada falla, se devuelve el
resultado de la herramienta directo (mejor que el texto crudo); y se agregó una
limpieza final de red de seguridad que borra cualquier etiqueta de herramienta que se
haya colado, pase lo que pase. Mismo parche defensivo también del lado del cliente
(`preguntarPistero`) por si acaso.

**MEDIO — Pistero limitado solo a ciclismo:** la regla 6 del prompt le ordenaba
"reencauzar con amabilidad" cualquier pregunta ajena al ciclismo — literalmente le
prohibía responder de otros temas. Inty pidió que tenga una base de conocimiento
amplia y responda de todo. Reescrita: ahora responde cualquier pregunta (usa
[BUSCAR:...] si no sabe con certeza en vez de inventar), solo evita temas ilegales o
peligrosos. Verificado en vivo: "cuál es la capital de Francia" ya responde bien (antes
la habría rechazado).

**Memoria de conversación ampliada:** el historial de Pistero vivía en 16 mensajes
(8 turnos) en localStorage y mandaba solo los últimos 6 al Worker. Subido a 40
guardados / 12 enviados por consulta / 20 mostrados al reabrir el chat — recuerda más
de la conversación sin disparar el límite de tokens del modelo (cada mensaje sigue
acotado a 800 caracteres server-side). Una memoria de perfil persistente más profunda
(preferencias explícitas, no solo historial de chat) sigue pendiente y es un cambio de
arquitectura más grande — no se tocó, queda para decidir alcance con Inty.

**Investigado y sin evidencia de bug real:** Inty reportó "la app no está iniciando
bien". Cargué la app en un navegador limpio (servidor local) y revisé consola, red y
contenido renderizado: cero errores, el dashboard cargó completo con datos reales. No
encontré una causa concreta distinta de los bugs de arriba (el GPS fantasma y los
comandos pisándose bien podrían sentirse como "arranca mal" si ocurren justo al
empezar un viaje). Si sigue pasando tras este release, falta un reporte más específico
(¿pantalla en blanco? ¿se cuelga? ¿en la app instalada o en el navegador?) para
diagnosticarlo con evidencia en vez de adivinar.

**Nuevo:** `worker-ia/wrangler.toml` — antes el deploy del Worker se hacía con curl y
un `metadata.json` ad-hoc que no estaba versionado (había que reconstruirlo cada vez
adivinando los bindings). Ahora es `npx wrangler deploy` desde `worker-ia/` con las
credenciales de `MI-CLOUDFLARE-IA.txt`, reproducible por cualquiera de las dos
sesiones. Confirmé el binding `AI` y `compatibility_date` exactos contra el Worker
real antes de escribirlo, para no cambiar nada de la config en producción.

Verificación: sintaxis de `index.html` (0 errores) y `worker.js` (`node --check`, OK).
Worker probado en vivo tras el deploy: pregunta general respondida (ya no redirige),
pregunta con búsqueda respondida sin dejar etiquetas crudas, acción no pedida quedó
como botón opcional (no se auto-ejecutó — el diseño "no invasivo" ya existente sigue
funcionando bien).

---

## fix rápido tras v6.07 — 2026-07-11 — Claude (sesión 2)
Sincronicé con el trabajo de mapas de la otra sesión (v6.04→v6.07: mapas nivel apps
grandes, mic que obedece todo, pendiente anticipada, autocrítica). Revisé código nuevo
(satélite/brújula/3D/pantalla completa/navegar-aquí en `im()`) — sólido, sin bugs
obvios; `toggleCapaMapa()` re-agrega bien las polilíneas tras `setStyle()`. Verifiqué
también que mis 15 fixes de la QA v6.03 siguen intactos (guards GPS, techo de voz,
lluvia local, doble-submit, maxlength) — cero regresiones.

Un solo desajuste real: `sw.js` seguía en `CACHE='librepedal-v603'` mientras
`APP_VERSION`/`version.txt` ya iban en v6.07 (4 releases sin bumpear el service
worker). Corregido a `librepedal-v607` y redesplegado. Nota para ambas sesiones: el
service worker es fácil de olvidar porque no está en el mismo archivo que
`APP_VERSION` — revisarlo en cada release, no solo `index.html`/`version.txt`.

(Nota de orden: las entradas v6.04-v6.07 de la otra sesión quedaron más abajo en este
archivo en vez de arriba de esta — es solo un tema de orden de lectura, no de
contenido; están completas y correctas.)

---

## v6.03 — 2026-07-11 — Claude (sesión 2)
**QA adversarial completa pre-lanzamiento.** Inty pidió actuar como alguien probando la
app para dar el OK de lanzamiento ("no quiero fallas... la app no debe presentar fallas
de ningún tipo"). Se lanzaron 3 agentes Explore en paralelo a auditar todo el código
como QA rompiendo cosas, no confirmando que funcionan. Encontraron bugs reales que el
uso normal no habría mostrado hasta fallar en producción. Los 15 se corrigieron y se
verificó sintaxis completa (0 errores) antes de este release.

**CRÍTICOS (podían corromper datos en silencio, sin ningún error visible):**
- **GPS null/NaN corrompía la distancia para siempre**: un fix con coordenadas
  `null`/`NaN` (señal muy débil) se sumaba igual al kilometraje porque JS convierte
  `null` a `0` en aritmética — sin excepción, sin aviso, imposible de notar sin probar
  a propósito. `ug()` y `_navPosUpdate()` ahora descartan el fix con
  `Number.isFinite()` antes de tocar cualquier cuenta.
- **Sin techo de velocidad plausible por salto de GPS**: un rebote de señal (salir de
  un túnel, error del chip) podía sumar un salto de posición imposible (cientos de
  km/h) al kilometraje total. Nuevo `_saltoEsPlausible(distancia, tiempo)`: descarta
  el salto si implica más de 90 km/h (200 en modo moto) — no se suma a la distancia,
  pero sí se re-ancla la posición para no arrastrar el error al siguiente fix.

**ALTOS:**
- `endNavigation()` no llamaba a `pararVoz()`: Pistero podía seguir hablando de un
  viaje que ya se cerró. Ahora es la primera línea de la función.
- El timeout de la cola de voz (`durEst`) tenía un techo de 14s sin importar el largo
  del texto. Para el TTS nativo (`lpTTS`, sin evento `onend`) ese timeout es el
  **único** mecanismo que avanza la cola — cualquier respuesta de Pistero IA de más de
  ~186 caracteres se cortaba a mitad de frase en la app instalada (no es un caso raro,
  es el camino normal de cualquier respuesta larga). Techo subido a 55s.
- **Lluvia proactiva con desfase horario**: `_avisoLluviaProactivo` comparaba
  `hourly.time` (hora LOCAL de Open-Meteo, `timezone=auto`) contra
  `new Date().toISOString()` (UTC) — ~4h de desfase en Chile/LatAm, rompiendo la
  predicción para el público objetivo. Ahora compara contra `current.time` (misma
  zona horaria que `hourly.time`, lo entrega la propia API).
- **Doble-submit duplicaba documentos y Darma**: `enviarReporte`, `agregarPOI`,
  `publicarAlojo`, `crearReto` y `addRepairTip` no tenían guarda contra doble-tap
  durante el `await` a Firestore. Cada uno tiene ahora una bandera de "en curso" que
  bloquea el reenvío hasta que termine (éxito o error).
- **Pantalla en blanco sin conexión**: `loadTrips()` y `loadHostels()` no tenían
  callback de error en su `onSnapshot` — si la primera carga ocurría sin señal, la
  lista quedaba en blanco para siempre sin ninguna explicación. Ahora muestran el
  mismo mensaje de "revisa tu conexión" que ya tenía `subscribeToNovedades()`.

**MEDIOS:**
- Falsos positivos de fatiga: si la referencia de ritmo se capturaba en una bajada
  rápida, una caída porcentual del 25% podía disparar el aviso de cansancio en un
  ritmo llano totalmente normal. Ahora exige además un piso absoluto de velocidad
  (10 km/h ciclismo/MTB, 2.5 km/h trekking) y se desactiva en modo moto (la velocidad
  de un vehículo no refleja el cansancio del conductor).
- `personalidad`/`actividad` solo vivían en localStorage, se perdían al cambiar de
  celular. Ahora se suben también al perfil en Firestore (`elegirPersonalidad`,
  `elegirActividad`, y el registro inicial).
- `subscribeToUsersOnNavMap()` creaba un listener de Firestore nuevo cada vez que
  arrancaba una navegación sin cerrar el anterior — fuga real en viajes con varios
  destinos o reinicios de navegación. Ahora guarda y cierra el listener previo antes
  de abrir uno nuevo, y también se cierra en `endNavigation()`.
- `crearReto()` validaba con `!metaKm`/`!dias`, que deja pasar números negativos (son
  "truthy" en JS). Ahora exige `>0` explícito, y re-verifica `ADMIN_ID` dentro de la
  función (antes solo lo ocultaba el botón).
- Formularios sin `maxlength`: se agregó a los ~20 campos de texto/textarea de toda la
  app (reportes, POI, alojamiento, retos, trucos, hospedajes, recomendaciones,
  comentarios, viajes, diario, registro).

**BAJOS (rematados de paso):**
- `viewNav` no tenía entradas para `diario`/`mac` — la barra inferior perdía el
  resaltado en esas pantallas.
- `cv(id)` no tenía guarda ante un id de vista inexistente — dejaba la pantalla
  completamente en blanco sin forma de recuperarse. Ahora avisa por consola y vuelve
  a Inicio.
- `_verificarFatiga` ahora tiene `try/catch` (igual que `_avisoLluviaProactivo`);
  `addRepairTip` ahora hace `.trim()` a los campos.

**Descartado tras verificar (no era un bug real):** un agente marcó como inconsistencia
que cambiar de actividad a mitad de navegación no recalcula la ruta. Se verificó que
`#nav-screen{position:fixed;inset:0;z-index:4000}` hace que Perfil sea físicamente
inalcanzable durante una navegación a destino fijo, y que el modo GPS-libre nunca
calcula ruta — el escenario no puede ocurrir por la UI real, no se tocó nada.

Verificación: sintaxis completa del `<script>` re-extraída y ejecutada con
`new Function()` tras cada tanda de cambios — 0 errores en el bloque final.

---

## v6.02 — 2026-07-11 — Claude (sesión 2)
**Personalidad seleccionable, predicción real (lluvia+cansancio) y escalabilidad a otros deportes.**
De la Visión Maestra: implementados los 3 módulos que Inty aprobó (⬜→✅), Visión
Artificial descartada explícitamente por Inty ("no va").

- **Personalidad de Pistero** (Perfil → 🎭): 6 tonos (cercano/aventurero/entrenador/
  relajado/humorístico/guía turístico). `elegirPersonalidad()`, guardado en
  localStorage, se manda al Worker (`usuario.personalidad`). Default "cercano" =
  comportamiento de siempre, cero regresión. Worker: dict `TONOS` ajusta el registro
  del system prompt sin cambiar la identidad de Pistero.
- **Escalabilidad a otros deportes** (Perfil → 🧭): 4 actividades (Ciclismo/MTB/
  Trekking/Moto-Auto). `elegirActividad()` cambia el **perfil real de OSRM**
  (cycling/foot/driving — verificado en vivo que los 3 responden 200 en
  router.project-osrm.org) en las 3 URLs de ruteo, y el lenguaje de Pistero se adapta
  (gentilicio + prohibición explícita de mencionar "pedalear/bicicleta" si no aplica).
  ⚠️ Primer intento el modelo IGNORÓ la instrucción de actividad (siguió hablando de
  pedalear en modo trekking) porque estaba enterrada al final del prompt — se
  solucionó moviéndola al INICIO del system prompt con máxima énfasis. Reverificado
  en vivo: trekking/moto ya no mencionan bicicleta, ciclismo default intacto.
- **Predicción real — lluvia proactiva**: `_avisoLluviaProactivo()` chequea el
  pronóstico HORARIO (nuevo: `climaDeZona` ahora pide `hourly=precipitation_probability`)
  cada ~20 min durante la navegación; si las próximas 2h superan 60% de probabilidad,
  avisa UNA vez por viaje, antes de que llueva (no solo "hoy hay X% de lluvia" al salir).
- **Predicción real — cansancio**: `_verificarFatiga()` compara tu ritmo de los
  primeros ~15 min (referencia "fresco") contra una ventana móvil de los últimos 15
  min; si cae ≥25% y llevas 40+ min activo, sugiere un respiro UNA vez por viaje.
- Todo con reset por viaje (mismo patrón que `puntosAvisados`), guards de cola de voz
  existentes, y sin tocar ninguna función que ya funcionaba.
- **Verificado**: Worker en vivo (6 escenarios: 2 tonos, trekking antes/después del
  fix, moto, control ciclismo), navegador (grids renderizan, OSRM cambia de perfil
  real y vuelve al default, fatiga detecta caída de 40% y no repite, lluvia detecta
  75% de probabilidad simulada y no repite), sintaxis OK, 0 errores de consola.

## v6.01 — 2026-07-11 — Claude (sesión 2)
**Fix: videos de ruta descargados no se veían.**
- `grabarVideoRuta()` grababa SIEMPRE en WebM/VP9 y lo descargaba como `.webm`. Ese
  formato no lo reproducen ni muestran con miniatura la mayoría de galerías de
  Android, WhatsApp ni iOS — el video se descargaba bien pero "no se veía" (justo lo
  reportado por Inty). Ahora prueba `MediaRecorder.isTypeSupported()` en este orden:
  MP4/H.264 (avc1) → MP4 genérico → WebM/VP9 → WebM genérico, y usa la extensión de
  archivo real según lo que quedó soportado. Probado en el navegador de este entorno:
  soporta MP4/avc1 y lo elige primero (antes hubiera ido directo a WebM).
- Nota para quien pruebe en el APK: confirmar que el WebView de Android también elige
  MP4 (API 29+ debería); si un dispositivo viejo cae a WebM, al menos ahora el archivo
  tiene la extensión correcta y no promete un formato que no es.
- Sincronizado `sw.js` (CACHE quedó en v96 pese a que la app ya iba en v6.00 — quedó
  desincronizado en algún push intermedio, ver nota abajo).

⚠️ **Recurrente**: el CACHE de `sw.js` se ha desincronizado de `APP_VERSION` varias
veces esta sesión (v81, v89, v96 quedaron pegados mientras la app subía de versión).
Sugerencia para ambas cuentas: agregar el bump de `sw.js` al mismo checklist/comando
que sube `APP_VERSION` y `version.txt`, no como paso aparte.

## v5.96 — 2026-07-11 — Claude (sesión 2)
**Pistero IA nivel 2: obedece órdenes, busca en la web, te conoce mejor — sin ser invasivo.**
- **Worker `librepedal-ia` REESCRITO y redesplegado vía API** (respaldo del original en scratchpad; el modo "anécdota de lugar" GET sigue intacto). Nuevo:
  - **Herramientas**: el modelo puede pedir `[BUSCAR: ...]` (Wikipedia es, gratis) o `[CLIMA: lugar]` (Open-Meteo geocoding+forecast) → el Worker resuelve y hace UNA segunda pasada con los resultados. Probado en vivo: historia de la Carretera Austral (busca y resume) y clima de Algarrobo mañana (datos reales).
  - **Órdenes**: `[ACCION:navegar|lugar]`, `[ACCION:abrir|vista]`, `[ACCION:gps]` al final de la respuesta. Sin etiqueta para SOS (a propósito: emergencias solo por botón físico).
  - **Contexto rico** en el system prompt: nivel, Darma, viajes completados, últimas rutas con nombre, vel. media, hora local + mapa completo de la app v5.95 (dónde está cada cosa) + regla explícita de NO ser invasivo (personalizar sin repetir datos porque sí ni recomendar lo no pedido).
- **Cliente (index.html)**: `_pisteroContexto()` (actividad real: últimas rutas nombradas, viajes, vel. media, hora), payload extendido; parser de `[ACCION:...]` (se quitan del texto mostrado/hablado); **`_pisteroObedecer()` con regla anti-invasivo**: si TU mensaje suena a orden (llévame/abre/graba...) se ejecuta al tiro, si fue idea del modelo queda como botón opcional.
- **Voz**: pregunta libre al micrófono que ningún comando reconoce → va a Pistero IA (antes se convertía en un destino por error: "cuánta agua..." armaba un viaje a "agua").
- Verificado: Worker en vivo (4 escenarios), parser/obedecer/contexto/ruteo de voz en navegador (7 casos), 0 errores de consola, sintaxis OK.

## v5.95 — 2026-07-11 — Claude (sesión 2)
**Navegación simplificada (aprobada por Inty vía `concepts/concepto-navegacion-simple.html`).**
Cero funciones eliminadas — solo se reubicaron accesos:
- **Barra inferior**: Inicio · Mapa · **🤖 Pistero** (nuevo, al centro — antes enterrado a 2+ toques) · Social · Perfil. Taller salió de la barra (queda en esfera + voz "taller" + chip de Pistero). `viewNav` remapeado (pistero:2, chat:3; mac/diario sin highlight, correcto).
- **Inicio adelgazado**: de ~11 acciones a 5 (destino+iniciar, elegir en mapa, GPS, "Mis viajes", SOS). Se movieron: badge Darma y "Logros y comunidad" → **Perfil**; "Compartir en vivo" (id `btnSeguimientoVivo` intacto) → **Ajustes**; Música y botón Pistero fuera (tienen hogar en esfera/barra).
- **Esfera**: de 15 íconos (9 duplicados) a 11 únicos — ahora COMPLEMENTA la barra en vez de repetirla. Logros/Ranking/Tienda/Comunidad colapsados en un solo 🏆 → `mostrarLogrosComunidad`. Ganaron acceso global: **Bitácora** (estaba a 3 toques), **Música**, **Novedades**, **Ajustes**.
- **Nomenclatura**: `v-trips` = "🗺️ Mis viajes" en todos lados (antes 3 nombres distintos); dentro agrupa planificador multi-destino + Historial + Bitácora.
- **Tutorial**: pasos de Darma/Logros reapuntados a Perfil, paso nuevo para Pistero en la barra. Verificado que TODOS los selectores del tutorial resuelven.
- **Verificación anti-regresión** (todo en navegador antes de desplegar): 15/15 vistas navegan con highlight correcto, esfera abre con 11 items válidos (cada `v:` es vista real, cada `fn:` función real), `darmaDash`/`btnSeguimientoVivo` únicos y funcionando en su nueva casa, `au()` corre OK, 0 errores de consola, 0 selectores de tutorial rotos.

## v5.94 — 2026-07-11 — Claude (otra sesión/cuenta, recién sumada a la coordinación)
**Corrección de la alerta de seguridad + dosificación de Darma + sincronía de versión.**
- **⚠️ Corrección sobre la "fuga de tokens" anotada en v5.90**: verifiqué en vivo y **no es una fuga real**.
  `MI-CLOUDFLARE.txt`, `MI-CLOUDFLARE-IA.txt`, `COORDINACION-IA/LEEME.md`, etc. devuelven HTTP 200, pero el
  **contenido** es el `index.html` completo (464.577 bytes, mismo tamaño que pedir `/index.html` directo) —
  es el fallback SPA por defecto de Cloudflare Pages (sirve `index.html` con 200 para cualquier ruta que no
  exista como archivo real). Lo confirmé además pidiendo una ruta inventada (`/esto-no-existe-123.txt`) y
  devuelve exactamente lo mismo. Los tokens **nunca estuvieron expuestos en el contenido**, solo el status
  code engañaba. No hace falta que Inty rote los tokens por este motivo específico (puede seguir siendo
  buena práctica rotarlos igual, pero no es urgente por una fuga que no existió). De todos modos re-desplegué
  desde carpeta limpia (mismo método ya documentado) sin costo, no cambia nada malo.
- **`sw.js` desincronizado**: `CACHE` había quedado en `librepedal-v89` mientras `APP_VERSION`/`version.txt`
  ya iban en 5.93 (arrastrado desde antes de que empezara esta carpeta de coordinación). Sincronizado.
- **Dosificación de Darma — segmento farmeable**: `_guardarTiempoSegmento()` daba **+10 Darma cada vez**
  que se pasaba por un segmento, sin límite ni cooldown — un tramo corto de ida y vuelta permitía farmear
  Darma casi sin esfuerzo, mucho más rápido que cualquier otra acción de la app (reportes +15, puntos +20,
  retos +30 por meta real). Ahora el Darma **solo se otorga si es récord personal o primera vez** en ese
  segmento; vueltas que no mejoran tu marca se siguen registrando (para la tabla de líderes / entrenamiento
  por series) pero no dan Darma. Revisé también el resto de otorgamientos de Darma (reportes, POIs, alojo,
  retos) — están bien, requieren esfuerzo real (formulario/contenido) cada vez, no los toqué.
- **Revisión del chat de Pistero (v5.91-93) y mic nativo (v5.92)**: repasé `preguntarPistero`, `pisteroPorVoz`,
  `_micNativoEscuchar`, `toggleMic`, `lpPlugin` — bien construidos, sin bugs de fondo. Confirma que el
  diagnóstico de v5.92 (WebView no soporta `webkitSpeechRecognition`) es correcto y el fix está completo del
  lado web; solo falta que el APK traiga el plugin (ver PENDIENTES, tarea de Gemini).

## v6.37 — 2026-07-13 — Claude (sesión 1, barrido #8: SOS y detección de caídas)
Siguiendo la numeración de sesión 2 (#1-#7 hechos). Barrido #8 = seguridad (SOS + caídas), lo más crítico.
**El grueso de la sección está SÓLIDO** (lo confirmo, no solo busco bugs):
- `enviarSOS`: con/sin GPS (usa última ubicación), con/sin contactos (WhatsApp o navigator.share). OK.
- Detección de caídas: impacto por acelerómetro + **doble chequeo de quietud** (1.5s y 3s) para filtrar
  baches; permiso iOS pedido bien (con gesto); alerta de 30s con vibración + alarma sonora + voz + botón
  "Estoy bien"; al llegar a 0 muestra botones de WhatsApp (honesto: WhatsApp exige un toque, no se puede
  auto-enviar desde web) + botón "Cerrar" que resetea `crashAlertaActiva`. Bien pensado.
**1 bug real corregido:** `agregarContactoSOS` no validaba teléfono duplicado ni limpiaba los campos →
doble-tap agregaba el contacto 2 veces. Ahora chequea duplicado + limpia inputs.
**⚠️ HALLAZGO IMPORTANTE que NO toqué (necesita prueba en dispositivo real):** el chequeo de quietud tras
el impacto usa la VELOCIDAD del GPS (`spd`/`navSpeed`), pero esa velocidad viene de una ventana de ~10-15s de
posiciones → LAGGEA. A los 3s post-impacto la velocidad mostrada puede seguir siendo la de ANTES del choque
(alta) → el chequeo cree que "sigues moviéndote" → NO alerta → **podría MISSEAR caídas reales a velocidad**.
El fix correcto es medir la quietud con el ACELERÓMETRO (movimiento bajo tras el impacto), no con la velocidad
GPS. NO lo cambié a ciegas: tocar lógica de seguridad sin poder hacer un drop-test real puede meter falsos
positivos (alarma en cada bache) o negativos. **Requiere validación con teléfono real (prueba de caída).**

## v6.36 — 2026-07-13 — Claude (sesión 1, barrido: creación de contenido de comunidad)
Adopté el protocolo de sesión 2 (variantes reales de uso, cuestionar cada función, no solo el caso feliz).
Función/sección: **crear contenido de comunidad** (hospedaje, POI, truco, reto, rodada, frase).
Comparé todas contra el patrón blindado de `agregarPOI` (trim + guard anti-doble-tap + await/try/catch/finally).
Ya estaban OK: `agregarPOI`, `addRepairTip`, `crearReto`, `enviarReporte`. **3 rezagos reales corregidos:**
- **`addHostel`** — no tenía NADA del patrón: (a) nombre/dirección con solo espacios pasaban la validación
  (`!name` es false con `" "`) → publicaba alojamiento en blanco; (b) doble-tap publicaba 2 veces; (c) el
  `db.add` no era await ni tenía catch → limpiaba el form y decía "publicado" aunque el guardado fallara
  (sin señal) → perdías lo escrito con falso éxito. Ahora async con trim + `_agregandoHostel` + await/catch/finally.
- **`crearRodada`** — (a) sin guard → doble-tap = 2 rodadas; (b) **aceptaba fecha en el PASADO** (solo validaba
  NaN) → podías crear una rodada "para ayer". Ahora chequea fecha futura (con 1h de gracia) + `_creandoRodada`.
- **`enviarFraseComunidad`** — sin guard anti-doble-tap → frase duplicada en revisión. Ahora `_enviandoFrase`.
Cómo no rompe nada: mismo patrón exacto ya probado en agregarPOI; validaciones son ADICIONALES (los caminos
felices siguen igual). Verificado: llaves balanceadas, 3 funciones con guard, 3 flags declarados.
Deploy: `librepedal.cl/version.txt` → 6.36.

## v6.35 — 2026-07-13 — Claude (sesión 1, barrido: escalabilidad Firestore con count())
Retomando el barrido de sesión 2 en un frente propio: **conteos que leían colecciones enteras**.
- **Ranking** (`updateRanking`/#N): leía TODOS los usuarios con más km que tú (`.get().size`) solo para un
  número → miles de lecturas. Ahora usa **agregación `count()`** (lee 0 documentos, resultado exacto), con
  fallback al método viejo si el SDK no la soporta (cero regresión).
- **Sorteo comunidad**: leía TODAS las entradas para el total + si participaste → ahora `count()` para el
  total + 1 doc directo (`.doc(cu)`) para tu participación, con fallback.
- Revisado XSS en secciones con contenido de usuario (Taller/CicloGuía/Recos): 0 hallazgos (ya escapado).
PENDIENTE (scale, no toqué por riesgo sin poder testear): `votacionComunidad` lee todos los votos para el
tally por opción (se podría hacer con 4 `count()` where opcion + 1 doc para tu voto, requiere índices+prueba)
y el `users where visible` del mapa (necesita geo-queries reales). Dejar para cuando se pueda testear Firestore.

## v6.18 — 2026-07-11 — Claude (RESTAURAR respaldo completo — traer tus datos)
Inty: si un usuario quiere traer sus datos a la app, esa opción debe estar lista y disponible.
- HUECO crítico: `importarMisDatos` (botón "Restaurar desde archivo" que ya existía) SOLO restauraba el
  diario → un usuario que cambia de teléfono perdía sus rutas aunque tuviera el respaldo. Ahora restaura
  **rutas** (merge sin duplicar por localId), **diario**, **perfil** (casco/skin/lente) y **estadísticas**
  (toma el mayor, nunca baja tu progreso). Verificado el ciclo export→restaurar.
- Junto con v6.17 (export ya incluye rutas), el ciclo de datos queda cerrado: exportar TODO en un teléfono
  y restaurarlo completo en otro.
- Recordatorio: para traer datos de OTRAS apps está el import de GPX (v6.16, Strava/Wikiloc/Komoot).

## v6.17 — 2026-07-11 — Claude (exportar DATOS completo — era must-have)
Inty: exportar mapas y datos es "sí o sí"; importar es solo gancho de publicidad.
- HUECO real encontrado: `exportarMisDatos()` (respaldo JSON) guardaba perfil, stats y diario pero
  **NO las rutas** → el backup estaba INCOMPLETO. Agregado `rutas: rutasLocales()` al objeto exportado.
  Ahora el respaldo trae rutas + diario + perfil + estadísticas. Botón y mensaje actualizados.
- Exportar mapas offline (`descargarMapaRuta`, tiles por SW) y GPX (activa + por ruta) ya existían.
Pendiente natural: poder RESTAURAR ese respaldo (import del JSON) para portabilidad total entre teléfonos.

## v6.16 — 2026-07-11 — Claude (IMPORTAR GPX = atraer usuarios de Strava/Wikiloc)
Corrección de dirección: el GPX de v6.15 era EXPORTAR (nuestras rutas → Strava), que sirve para que
NUESTROS usuarios compartan afuera. Pero el objetivo de Inty es lo contrario: atraer usuarios de
Strava/Wikiloc/Komoot A Libre Pedal → eso es IMPORTAR.
- Nuevo `importarGPX(input)`: lee un .gpx (tracks `<trkpt>` o rutas `<rtept>`) con `DOMParser` nativo,
  extrae lat/lon + elevación + tiempo, calcula la distancia y lo guarda como ruta en el historial
  (`rutasLocales`), lista para ver, ver perfil, hacerle video, re-exportar o pedalearla.
- Botón "📥 Importar ruta (GPX de Strava, Wikiloc o Komoot)" arriba en la pantalla de rutas + input file oculto.
- Verificado el parseo con un GPX estilo Strava (nombre, puntos, ele, time, distancia). El export (v6.15)
  se mantiene (algunos usuarios lo querrán). Sync directo con Strava (OAuth) sigue pendiente (alto esfuerzo).

## v6.15 — 2026-07-11 — Claude (GPX completo + exportar rutas guardadas)
Remate del GPX que la otra sesión dejó básico (solo lat/lon de la ruta activa):
- `_gpxDeRuta(pts,nombre)` genera GPX 1.1 con namespace + `<name>` + **`<ele>` (elevación)** + **`<time>`
  (timestamp ISO)** — lo que Strava/Komoot/Wikiloc necesitan para el perfil de altimetría y velocidad.
- `exportarDatosGPX` (ruta activa) ahora usa el GPX completo.
- Nuevo `exportarRutaGPX(id)` + **botón "📤 GPX" en cada ruta del historial** → exporta cualquier ruta
  guardada (local o de la nube), no solo la activa. Verificado: GPX válido con ele+time.
Nota: revisé el "diálogo nativo restante" que marcaba el grep — es la palabra confirm() DENTRO de un
comentario, no una llamada real. Los diálogos temáticos de la otra sesión están 100% completos.

## v6.07 — 2026-07-11 — Claude (mapas nivel apps grandes)
Pedido de Inty: que los mapas tengan todas las funciones de otras apps y se vean espectaculares.
En el mapa principal MapLibre (`im()`):
- **Capa Satélite** (`LP_ESTILO_SAT`, Esri World Imagery, gratis). El toggle `toggleCapaMapa` ahora
  cicla 3 capas: calles → topográfico → satélite (`_estiloDeCapa`, botón se actualiza). Verificado tile 200.
- **Brújula + rotación + tilt 3D**: `NavigationControl({showCompass:true, visualizePitch:true})` +
  `pitchWithRotate:true` → rotas con 2 dedos, inclinas para vista 3D, brújula vuelve al norte.
- **Pantalla completa** (`FullscreenControl`) y **barra de escala** (`ScaleControl`, métrica).
- **Mantén presionado (o clic derecho) → "Navegar aquí"**: `mp.on('contextmenu')` abre popup con botón que
  llama `irAlPuntoYNavegar` (confirma e inicia navegación). Como Google Maps.
Nota: el GeolocateControl (ubícame/seguir) ya estaba. El mapa de navegación es Leaflet turn-by-turn (aparte).

## v6.06 — 2026-07-11 — Claude (el micrófono OBEDECE todo, desde donde sea)
Pedido de Inty: sin importar dónde se toque el mic, debe OBEDECER lo que se pida (no solo
planear/marcar ruta); si no entiende, recomendar escribir con una broma sutil.
- **Mic del chat de Pistero** (`pisteroPorVoz`, nativo y web) ahora enruta por `handleVoiceCommand`
  igual que el mic principal → obedece navegar, abrir secciones, música, SOS, y preguntas→IA. Antes
  solo chateaba.
- **Fallback inteligente** en `handleVoiceCommand`: órdenes/preguntas libres o frases largas (≥5
  palabras) → IA de Pistero (que obedece o responde); lugares cortos → viaje directo; vacío/stopword →
  nuevo `_vozNoEntendi()` que recomienda escribir + **broma sutil** (4 variantes chilenas). Antes forzaba
  cualquier cosa como destino y decía escuetamente "no te entendí, ¿a dónde vas?".
- Verificado el enrutamiento con ejemplos ("cuánta agua tomar"→IA, "Pichilemu"→viaje, "ok"→broma).

## v6.05 — 2026-07-11 — Claude (mejora estrella: pendiente ANTICIPADA)
El fix REAL prometido para "las subidas/bajadas las toma muy encima": ahora en navegación
Pistero **lee el perfil de elevación de la ruta hacia adelante** y avisa ANTES de llegar,
sin depender del ruido de altitud del GPS.
- `_prefetchPerfilRuta()`: al calcular/recalcular la ruta, muestrea `rutaLatLngs` a ≤100 puntos
  por distancia acumulada y pide todas las elevaciones en **una** llamada por lotes a Open-Meteo
  (gratis). Guarda `rutaPerfil=[{d,ele,lat,lon}]`.
- `avisarPendienteAnticipada(lat,lon)`: ubica tu posición en el perfil, mira ~180 m adelante y si
  la grada ≥5% (subida) o ≤−5% (bajada) avisa con la distancia ("se viene una subida en los próximos
  X metros"). Dedup por segmento + cooldown 40s.
- En `_navPosUpdate`: si hay perfil usa el anticipado; si no cargó, cae al reactivo `comentarPendiente`
  (respaldo). El GPS libre (sin ruta) sigue con el reactivo. Reset en `endNavigation`.
- Verificado con datos reales (cordillera): al pie de la cuesta avisa "SUBIDA en 300m"; en plano NO
  inventa (−0.3% → silencio). Falta confirmar el "feel" en una rodada real.

## v6.04 — 2026-07-11 — Claude (AUTOCRÍTICA: corrijo trabajo propio)
Revisión crítica honesta de mis propios cambios de estos días. 3 correcciones:
1. **Quité la "red de seguridad global"** que puse en v6.00 (`window.error`/`unhandledrejection`→Sentry):
   era REDUNDANTE — el Loader Script de Sentry ya instala esos handlers (con stack trace + dedup); los
   míos solo DUPLICABAN reportes y no evitaban ningún crash. Las defensas que SÍ sirven quedan: `_lsJSON`
   (localStorage seguro) y `_fetchT` (timeouts de red).
2. **Revertí el tuning de pendientes de v5.98** que quedó demasiado sensible (`dist 24m` / umbral `3.2%`):
   con ruido de altitud ±5 m sobre 24 m salían pendientes falsas ~20% → avisos de subida/bajada fantasma en
   plano. Ahora robusto: `dist 35m`, entrada `4.0%`, salida `2.0%`, ventana 90m. El fix REAL para "avisar
   antes sin ruido" es el **perfil de elevación adelantado** (anticipatorio) — queda en PENDIENTES.
3. **Variantes fonéticas** de `geocodeDestino`: `slice(0,4)→slice(0,2)` para no saturar Nominatim (~1 req/seg).
   Sigue encontrando "Quimán".
Nota: `_lsJSON`, `_fetchT`, `verificarDesviacion` (ruta completa) y el resto siguen intactos y son sólidos.

## v6.00 — 2026-07-11 — Claude (blindaje de robustez)
**Que ninguna eventualidad rompa la app.** Ver `CONTINGENCIA.md` para el mapa completo.
- **Red de seguridad global:** `window.error` + `unhandledrejection` → Sentry, la app sigue andando (no había ninguna; era el hueco más grave).
- **Lectura segura de localStorage** (`_lsJSON`): datos corruptos ya no crashean el arranque. Se blindaron `us/uj/rh` en sus 2 ubicaciones (estaban con `JSON.parse` pelado → un dato corrupto = app no abre).
- **fetch con timeout** (`_fetchT`, 12–15s) en buscar destino (geocode) y ruteo (OSRM): sin señal ya no se cuelga para siempre; falla rápido con mensaje amable.
- **Mensajes amables** en fallos de ruta/geocode (antes mostraban "Error: aborted"): detecta AbortError/offline y explica "estás sin señal".
- SOS revisado: ya era robusto (WhatsApp/share, con o sin GPS) — NO se tocó.
- Nuevo doc `CONTINGENCIA.md` con el plan ante cada situación adversa.

## v5.99 — 2026-07-11 — Claude
**Pantalla apagada + botones del mapa + anti-regresiones.**
- **Rastreo con pantalla apagada:** revisado — el código web (`lpBackgroundGeo` + `lpWakeLock`) está
  INTACTO y correcto (el wake-lock ya se re-adquiere en `visibilitychange`). Si se rompió, es que el
  APK perdió el plugin nativo. Se agregó **`diagnosticoGPS()`** + botón "📡 Probar GPS" en Ajustes para
  confirmarlo en el teléfono, y se marcó como URGENTE para Gemini en PENDIENTES (plugin + permisos).
- **Botones +/− del mapa de navegación:** estaban tapados por la tarjeta de instrucciones (zoom Leaflet
  arriba-izq por defecto). CSS: `#nav-map .leaflet-top{top:150px}` + botones más grandes (38px) para tocar rodando.
- **Anti-regresiones:** sección "🛡️ PROTEGIDO" en `LEEME.md` con las funciones ya resueltas que NO se deben romper.

## v5.98 — 2026-07-11 — Claude (feedback de rodada real)
**1) Recálculo falso corregido (importante).** `verificarDesviacion` medía distancia SOLO al
`navSteps[currentStepIndex]`; si el índice de paso iba atrasado, creía que te salías estando en
plena carretera y recalculaba en falso. Ahora mide contra **TODA la ruta** (`rutaLatLngs`, guardada
al calcular/recalcular) con distancia **punto-a-segmento** (`_distPuntoASegmento`, verificada: 0m sobre
la línea, 111m a 0.001°). Se resetea en `endNavigation`.
**2) Subidas/bajadas más exactas y antes.** Ventana de pendiente 120→90m, distancia mínima para
confiar 35→24m (detecta antes), umbrales de entrada 4.5→3.2% y salida 2.5→1.8% (histéresis), y el
respaldo de altitud Open-Meteo pasa de cada 45s a cada 20s (más muestras cuando el GPS no da altitud).
OJO: es tuning sin poder probar en terreno — validar en la próxima rodada.
**3) Destino no encontrado → recomienda el mapa.** `startQuickTrip` y `startNavigation` ahora sugieren
escribir con más detalle o tocar 📍 "elegir en el mapa" (el de línea 3180 ya lo hacía).

## v5.97 — 2026-07-11 — Claude
**Fix: destinos por voz mal transcritos (K en vez de QU/C).** La voz escribía "Kiman" y
el buscador no encontraba nada (el lugar es **Quimán**, Futrono). `geocodeDestino` ahora,
si no encuentra tal cual, reintenta con **variantes fonéticas** (`_variantesFoneticas`):
k+e/i→qu, k→c, w→gu, etc. Solo se activa cuando la búsqueda directa falla (0 costo en el
caso normal). Verificado contra Nominatim real: "Kiman"→sin resultados, "Quiman"→Quimán ✓.
Arreglado en el punto central → sirve para voz, texto, chips y órdenes a Pistero.

## v5.93 — 2026-07-11 — Claude
**Capacidades de la IA avanzada de Pistero (para el lanzamiento).**
- **Chips de sugerencias** en `v-pistero` (Planifica mi viaje / Arregla mi bici / ¿Dónde alojo? / Ruta de hoy) → `pisteroSugerencia()`.
- **Pistero te conoce**: `pisteroHistorial` se guarda/carga en `localStorage['lp_pistero_'+cu]` (`_pisteroGuardar/_pisteroCargar`); al reabrir pinta lo último y saluda "de nuevo".
- **Pistero que ACTÚA**: `_pisteroPintarAcciones(msg)` detecta intención y agrega botones bajo la respuesta: 🧭 iniciar navegación a un lugar (`pisteroNavegar`→ quick-dest+startQuickTrip), 🏨 ver hospedajes (`cv('gui')`), 🗺️ abrir planificador (`cv('trips')`).
- Historial de contexto al Worker subido a 16 turnos.

## v5.92 — 2026-07-11 — Claude
**Micrófono nativo para la app + fallback claro.**
- `toggleMic()` y `pisteroPorVoz()` ahora usan el plugin nativo `SpeechRecognition`
  (`lpPlugin('SpeechRecognition')`) si el APK lo trae. Motivo: el **WebView de Android no
  soporta `webkitSpeechRecognition`**, por eso el micrófono no funcionaba en la app instalada
  (Pistero hablaba con el plugin TTS, pero no escuchaba).
- Nuevo helper `_micNativoEscuchar()` (usa `requestPermissions()` + `start({language:'es-CL',partialResults:false})` → lee `res.matches[0]`).
- Si no hay voz disponible, ya no falla en silencio: avisa y enfoca el campo de texto.
- En Chrome sigue igual (webkitSpeechRecognition).
- ⚠️ Falta que el APK incluya el plugin (tarea de Gemini, ver PENDIENTES). El código web ya está listo.

## v5.91 — 2026-07-11 — Claude
**Chat "Pregúntale a Pistero" (IA avanzada dentro de la app).**
- Nueva pantalla `<section id="v-pistero">` + botón "🤖 Pregúntale a Pistero" en el inicio (v-dash).
- Funciones nuevas: `abrirPistero()`, `preguntarPistero()`, `pisteroPorVoz()`, `_pisteroBurbuja()`, var `pisteroHistorial`.
- Manda al Worker `IA_URL`: `{mensaje, usuario:{nombre,pais,kmTotal(us.di),gustos(selectedHelmet)}, hospedajes: allHostels(≤12), historial}`.
- Responde por **texto y por voz** (`h()`). Recomienda los hospedajes de NUESTRA comunidad primero.
- Probado en vivo: OK (personaliza con el nombre, recomienda nuestro hostal, da consejo de mecánica).

## v5.90 — 2026-07-11 — Claude
**Video 3D estable + mapa topográfico + pausa + ubicación en todos los mapas + recálculo.**
- Video 3D (Relive): cámara con **mira adelantada** y giro **suavizado** (`_lerpAng`, `videoBearing`) → se quitó el temblor. Ahora sobre **mapa topográfico** (OpenTopoMap en vez de OSM calles). Duración **proporcional a la ruta** (`videoVueloMs`, antes 18s fijos).
- **Botón de Pausa/Reanudar manual** en la navegación (`togglePausaViaje()`, var `viajePausaManual`): congela km/tiempo/calorías, no recalcula ni cuenta el movimiento de la pausa. HTML junto a "Terminar".
- **Ubicación del usuario** (`GeolocateControl`) agregada a los mapas secundarios (`poiMapaManual`, `puntoMapaViaje`); el principal ya la tenía.
- **Recálculo de ruta** menos sensible: 70m/3fixes/15s → **95m/4fixes/22s** (`NAV_RECALC_COOLDOWN_MS`, `verificarDesviacion`).

## Seguridad — 2026-07-11 — Claude
- Se descubrió que los 3 tokens estaban **públicos** en `librepedal.cl/MI-*.txt` (deploys previos de la carpeta completa). Se **cerró la fuga** redeployando desde carpeta limpia. Pendiente: Inty rota los tokens.
- Se documentó el método de deploy (wrangler directo, carpeta limpia) en `LEEME.md`.

---
### (antes de esta sesión: v5.82–v5.89, por Gemini/Inty — ver `git log`)
