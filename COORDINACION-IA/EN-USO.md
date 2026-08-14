# 🔒 Quién está editando `index.html` AHORA MISMO

Este archivo es un **candado, no un historial** — se sobreescribe, no se
acumula. Sirve para que las dos sesiones de Claude que trabajan en este
mismo repo (en la misma carpeta local, no en copias separadas) no editen
`index.html` al mismo tiempo sin saberlo.

**REGLA OBLIGATORIA, para AMBAS sesiones, sin excepción:**

1. **Antes de editar `index.html` (o cualquier archivo que la otra sesión
   también podría tocar), lee este archivo.**
   - Si dice `LIBRE` → puedes editar. Sigue al paso 2.
   - Si dice `OCUPADO` con una hora de **menos de 45 minutos** → NO edites
     todavía. Espera, o trabaja en algo que no choque (otro archivo, o algo
     de tu propio territorio que no dependa de lo que la otra sesión está
     tocando).
   - Si dice `OCUPADO` con una hora de **más de 45 minutos** → probablemente
     esa sesión terminó y se le olvidó liberar el candado (pasa). Es seguro
     asumir que quedó abandonado: edita, y al terminar deja el candado en
     `LIBRE` con tu propio sello.
2. **Apenas empieces a editar, actualiza este archivo** con tu sesión, la
   hora actual, y una frase corta de qué vas a tocar. Así, si la otra sesión
   se pone a trabajar 2 minutos después que tú, ve el candado puesto.
3. **Apenas termines de commitear (push incluido), vuelve a poner `LIBRE`.**
   No dejes el candado puesto "por si vuelvo más tarde" — eso bloquea a la
   otra sesión sin necesidad.
4. Si vas a hacer una sesión LARGA (más de 45 min de trabajo seguido),
   actualiza la hora del candado cada tanto para que no parezca abandonado.

---

## Historial reciente (más nuevo abajo)

LIBRE — sesión Thunderobot (Kpone), 2026-08-07. Sincronicé `index.html`/`sw.js`/`version.txt`
con lo que YA estaba corriendo en producción (v8.36) — este repo estaba pegado en v7.50 desde
el 29-jul, sin commits del trabajo directo a Cloudflare de las sesiones siguientes (login con
Google, rediseño de mapa v7.50→v8.x, etc. — todo eso ya estaba en producción, solo faltaba en
git). Además apliqué 2 fixes reales encima, ya probados y desplegados:
· El botón "Entrar con Google" usaba el widget nuevo de Google (GIS/FedCM) → daba
  `origin_mismatch` sin importar la config de Cloud Console/Firebase (ambas estaban bien).
  Desactivado: ahora usa directo el botón blanco de respaldo (`_entrarConGoogle`, ya existía).
· `_entrarConGoogle` intentaba `signInWithPopup` primero → se colgaba para siempre en Chrome
  (Cross-Origin-Opener-Policy de accounts.google.com bloquea el postMessage de vuelta sin
  rechazar la promesa, así que nunca caía al catch/fallback). Cambiado a `signInWithRedirect`
  directo, sin popup — probado end-to-end, entra bien.
Motivo de este push: Inty pidió que los celulares con la app YA INSTALADA (apk viejo, no
recibe estos cambios por la web) también reciban el arreglo — necesita que este commit
dispare `build-apk.yml` para tener un .apk nuevo para reinstalar. NO toqué nada de Android
nativo/capacitor.config, ni el keystore (sigue pendiente, ver PENDIENTES.md), ni ningún otro
archivo. Si tocas `index.html` de nuevo, ya deberías partir de v8.36, no de v7.50.

📋 **Thunderobot: lee `ESTADO-SESION-LENOVO-2026-07-21.md`** — te puse al día de TODO
(APK resuelto y pusheado, Capone ya tiene el asistente de avisos, el Thunder no ejecuta por
SSH, y el motor de voz elegido). — sesión Lenovo.

---

LIBRE — sesión Thunderobot, 2026-08-08. v8.45 commiteada y pusheada (00c36a7), ya en
producción (librepedal.cl confirmado sirviendo v8.45). Pedido de Inty tras publicar en
Play Store (testing cerrado) y probar la app real:
· Aviso de Pistero al partir, ahora por MODO de actividad (antes era el mismo texto
  siempre — "revisa presión de neumáticos, frenos, cadena y luces"). Busca el setTimeout
  de 6500ms dentro del IIFE de arranque (`start:function(silencioso){...}`, cerca de
  donde estaba `subscribeToRouteAlerts` antes de que lo sacáramos):
  - ciclismo/mtb/cicloviaje (default): "Antes de salir: revisa tu bici."
  - trekking: "Recuerda llevar fuego, ese fuego que llevas dentro."
  - moto: "¿Hace cuánto que no revisas los niveles de agua y aceite?" — PERO NO cada
    viaje (Inty: "se siente spam"). Es aleatorio (25% por viaje) forzado a salir al
    menos 1 vez cada 30 días vía localStorage `lp_aviso_niveles_<cu>`.
· Sección "Barba y bigote" del selector de personaje SACADA de la UI ("no quedan bien" —
  Inty). Dejé `_bigoteSVG()` y los datos de bigotes intactos (no borrados) por si algún
  personaje ya guardado tenía uno elegido — no rompe nada, solo no se puede elegir uno
  nuevo.
· Icono de Darma cambiado de `fa-wand-magic-sparkles` (genérico) a `fa-dharmachakra`
  (rueda del dharma real) — en el badge de perfil (~línea 1315) y en el botón "Tienda de
  Darma" (~línea 5984).

v8.46 (commit e866e6e), en producción: fix del bug del globo duplicado. Analicé el video
con ffmpeg (extraje frames, no hay screenshot tool disponible) — la causa real es
`preguntarPistero()` (~línea 3414) sin candado contra doble envío: en Android el botón
"enviar" del teclado a veces dispara el keypress dos veces (bug conocido de WebView +
Gboard) o el dedo toca el ✈️ justo cuando el Enter ya mandó el mensaje, y como no había
ningún guard, el mismo texto se mandaba dos veces → dos globos naranjos (usuario)
seguidos = "otro globo a la derecha". Agregué `preguntarPistero._enCurso` (flag en la
función misma) que ignora llamadas mientras ya hay una en curso; se limpia en un
`finally` que envuelve TODO el cuerpo (los `return` tempranos por consulta/reporte
también lo liberan bien). Validé sintaxis de todos los `<script>` con `node -e` antes de
desplegar — sin errores.

v8.47 (commit 5c3cc6a), en producción: "actualizar el tutorial" resuelto. Le pregunté a
Inty (con AskUserQuestion) para no adivinar — confirmó: el tutorial GUIADO in-app (los
17 pasos con spotlight), y específicamente que el paso de Pistero (índice 4) muestre el
chat real en vez de solo apuntar al botón de abajo. Cambios en `tutorialSteps` (~10033):
el paso 4 ahora es `{view:'pistero', sel:'#pisteroInput', d:'...'}` en vez de apuntar a
`nav .nb:nth-child(3)`. Y en `renderTutorial()` (~10105) agregué un caso especial: si
`s.view==='pistero'` llama `abrirPistero()` en vez de `cv(s.view)` — así el chat queda
con su saludo real inicializado (no la sección en blanco sin historial), igual que
cuando el usuario lo abre por su cuenta desde el nav.

---

**OCUPADO → LIBRE (cerrado 2026-08-14)** — sesión lenovo. Esta rama local llevaba desde
el 29-jul sin sincronizar con `lab/main` (nunca se hizo `git pull` antes de seguir
commiteando) — mientras yo trabajaba todo el día en el catálogo de voces, Thunderobot ya
tenía 16 commits reales en el remoto (v8.36→v8.47: login Google, tutorial, fix de globo
duplicado, build Android para el deadline de Google Play 30-ago-2026) que mi copia local
nunca tuvo. Lo descubrí recién al final, con `git fetch`. **Nada se perdió**: hice merge
(`git merge lab/main`) resolviendo conflictos a mano en `index.html`/`sw.js`/`version.txt`/
este archivo — mis cambios de voz no tocaban las mismas funciones que las de Thunderobot,
así que el merge fue limpio en el fondo.

Lo que agregué (top de lo de Thunderobot, ya en v8.47):
· `voz-elevenlabs.js` (módulo aparte) + `voces-el/` — catálogo de voces ElevenLabs, una
  voz distinta por cada uno de los 14 arquetipos vivos de `PERSONALIDADES` (incluye
  "cercano", que no tenía NINGUNA frase propia y por eso siempre caía a voz nativa —
  arreglado). 2 arquetipos nuevos: Seductor/Seductora (Luis/Clara) y Otaku (Cesar
  Rodriguez/Blackie). Mensaje de bienvenida de Pistero/Pistera reescrito.
· `deploy-seguro.sh` corregido: antes no copiaba `voz-elevenlabs.js` ni `voces-el/` al
  paquete de deploy — el catálogo nunca hubiera llegado a producción sin esto.
· Botón probador de voces (`previsualizarPersonalidad`) en la selección de personalidad.
· Bug real encontrado y arreglado en `scripts/gen-voces-elevenlabs.js`: los ids del
  catálogo eran secuenciales por orden de aparición en `FRASES_ARQ` — agregar un
  arquetipo nuevo corría los ids de todo lo que venía después, y un archivo viejo podía
  quedar sirviendo el audio de OTRA frase bajo el nombre nuevo. Cambiado a id estable por
  hash del texto del `.mp3` (nunca más se corre, sin importar qué se agregue después).
· **PENDIENTE — cuota de ElevenLabs agotada (40.000 caracteres/mes) a mitad de la
  regeneración**: 560/850 mp3 generados. El resto cae automáticamente a voz nativa (no
  rompe nada, solo suena distinto en esas frases puntuales) hasta que la cuota se
  resetee o Inty suba el plan.

v8.48: deploy en curso con todo lo anterior fusionado. Candado liberado — **LIBRE**.

**v8.49 (cierre, 2026-08-14 ~04:00) — catálogo de voces ElevenLabs 100% completo.**
Inty subió el plan de ElevenLabs; se generaron los 368 archivos que faltaban (0
fallos) más 40 frases de sistema nuevas (GPS, SOS, sensores, clima, manos libres,
etc. — antes cadan a voz nativa por no estar en `FRASES_ARQ`). Total: 466 frases
únicas x 2 géneros = 930 mp3, verificado sin huecos. Deploy hecho y confirmado en
producción (`librepedal.cl` sirviendo v8.49, manifest con 466 frases). Candado
**LIBRE**.
