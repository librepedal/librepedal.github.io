# 📓 Bitácora de cambios — Libre Pedal

Registro de qué se hizo, por versión. La IA que edite: **agrega tu entrada arriba**, con fecha, versión y quién.

---

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
