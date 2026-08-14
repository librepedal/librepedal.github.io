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
### 🚀 TAREA ABIERTA PARA CUALQUIER CUENTA: desplegar el lanzamiento
**Inty lanza MANANA (2026-08-15). Ver `TAREA-LANZAMIENTO-2026-08-15.md`.** Todo listo y
verificado (v8.51 en git + deploy-seguro.sh arreglado y probado). Falta SOLO el token
`MI-CLOUDFLARE.txt` + correr `bash deploy-seguro.sh`. La toma quien tenga el token.

### PARA LA OTRA CUENTA (Inty confirmo que estas ACTIVA ahora, 2026-08-14)
Coordinemos para NO divergir otra vez. Hoy ya paso: llevaste 8.35->8.50 desplegando a
Cloudflare SIN pushear a git, y esta cuenta tuvo que rescatar el 8.50 bajandolo de
produccion (commit 9ff1b18). Evitemoslo de aca en adelante.

Lo que hizo esta cuenta hoy (en git local, se va a pushear ahora):
- 9ff1b18: catch-up del 8.50 desde produccion (TU codigo 8.35->8.50 que no estaba en git). GitHub ya quedo en 8.50.
- 16c0351: v8.51 pulido Fase A (botones .ab/.bg, insignia Darma moneda, logros medalla). Solo CSS + render de logros. Validado.
- 53c40db: disenos-ui/ (2 modelos UI elegibles Solido/Cristal + README). Ver SPEC-PULIDO-UI-2026-08-14.md.

Lo que NECESITO de ti (Inty dijo "la otra cuenta activa por si necesitas algo"):
1. ¿Estas editando index.html AHORA? Si si, avisa/sincroniza (git pull) ANTES de seguir, para no pisar el 8.51.
2. MI-CLOUDFLARE.txt: esta maquina NO lo tiene -> no puedo desplegar. ¿Lo tienes tu? Si si, tu corres el deploy cuando el 8.5x este aprobado por Inty.
3. deploy-seguro.sh: YA LO ARREGLE Y PROBE EN SECO (esta cuenta). Ahora copia *.js (voz-elevenlabs.js, perfil-comunidad.js) y voces-el/. Dry run: bundle de 2387 archivos, controles de secretos y completitud OK, sin fugas (ni MI-*, ni disenos-ui, ni worker-*). NO necesitas pushear el tuyo: haz git pull y usa este. Solo falta el TOKEN (punto 2).
4. De aca en adelante: PUSHEA a git cada version (no solo desplegar a Cloudflare). Eso evita el lio de hoy.

Diseno aprobado por Inty (va a TODA la app): 2 temas UI Solido/Cristal + selector lp_tema_ui; logros ocultos ("?") que se revelan al desbloquear; Pistero anuncia el logro con frase. Detalle en disenos-ui/README-DISENOS.md.

---

**LIBRE** - sesion Claude Code (cuenta de hoy), 2026-08-14 04:1x. FASE A del SPEC-PULIDO-UI-2026-08-14 LISTA EN CODIGO (v8.51), sobre base v8.50 traida de produccion:
- Botones (.ab/.ab sec/.bg): profundidad sutil (realce interior + sombra), se hunden al :active, primario con brillo controlado. Solo CSS.
- Insignia Darma (.darma-badge): ahora moneda de metal (oro cepillado, numero tabular, dharmachakra fa en disco hundido). Solo CSS.
- Logros (mostrarLogros): filas planas -> MEDALLA (medallon circular .lg-* + arco de progreso naranja; oro+glow al desbloquear). CSS nuevo + render reescrito con clases.
- Version subida en los 3 lugares: APP_VERSION 8.51 / version.txt 8.51 / sw.js v851.
- Validado: node validate.js -> 3 bloques, 0 errores.
PENDIENTE: (1) Inty verifica en el telefono; (2) FASE B = migracion de iconos UI a linea (Lucide), 395 usos / 152 unicos, NO hecha (necesita verificacion en navegador); (3) deploy bloqueado: falta MI-CLOUDFLARE.txt en esta maquina y deploy-seguro.sh no copia voces-el ni los .js nuevos (traer arreglo de la otra cuenta).

(anterior) LIBRE - sesion Thunderobot, 2026-07-29 18:54. Planificador Desde-Hasta (v7.51), desplegado y verificado.

(anterior) LIBRE - sesion Thunderobot, 2026-07-29 18:54. Integre el planificador Desde-Hasta (v7.51). Desplegado y verificado. PENDIENTE: prueba en telefono real de Inty.

---

**LIBRE** - sesion Claude Code (cuenta de hoy), 2026-08-14. Resolvi el merge con
origin/main (divergencia de 6 archivos, ver BITACORA.md para el detalle). Ademas arme
y verifique COORDINACION-IA/clima-fx-prototipo.js (efecto de clima en pantalla que Inty
estuvo iterando) + COORDINACION-IA/SPEC-CLIMA-FX-2026-08-14.md con el historial y lo que
falta para integrarlo. **NO toque index.html para el clima** - hay lanzamiento manana
y esto es feature nueva, no vale el riesgo la noche antes. index.html SI cambio por el
merge (ver commit c65e8f0), no por el clima.

⚠️ **La tarea de arriba (desplegar v8.51 para el lanzamiento de manana) SIGUE SIN
TOMAR.** Esta cuenta SI tiene MI-CLOUDFLARE.txt localmente - se lo aviso a Inty en vez
de tomarla en silencio, porque desplegar a produccion antes de un lanzamiento es su
decision, no algo para decidir solo.

---

**LIBRE** - sesion Claude Code (cuenta de hoy), 2026-08-14, mas tarde. Agregue opcion
nueva de animacion de logo (oro cepillado, "pulso de ruta") a ANIMACIONES-LOGO.md +
logo-transparent-gold.png (asset nuevo, recolor a oro del logo real). NO toque
index.html - mismo motivo que el clima, no arriesgar nada antes del lanzamiento de
manana. Detalle completo en BITACORA.md.

---

**LIBRE** - sesion Claude Code (cuenta de hoy), 2026-08-14, cierre de coordinacion.
Inty pidio "coordina con la otra cuenta y procedan sin errores". Encontre y arregle
2 cosas reales (no cosmeticas) al sincronizar:
1. `CLAUDE.md` nuevo de Thunderobot dejaba a `TAREA-LANZAMIENTO-2026-08-15.md` con
   instrucciones rotas ("corre deploy-seguro.sh a mano" -> ahora bloqueado a proposito).
   Verificado en vivo que v8.51 YA esta en produccion (la tarea estaba resuelta en la
   practica, solo el doc no lo decia) -> tarea cerrada con evidencia.
2. `node tests/run.mjs` daba 12/13 (1 fallo real: conteo de arquetipos hardcodeado en
   12, quedo atras cuando se agregaron seductor/otaku a 14). Ademas ese archivo de test
   nunca habia sido commiteado (estaba `??` sin trackear) - Thunderobot nunca lo vio.
   Arreglado y commiteado. Ahora 13/13 verde.

Ambos cambios se hicieron en rama propia (`infra/cerrar-tarea-lanzamiento-8.51` y
`fix/test-conteo-arquetipos`) y se mergearon a `main`, siguiendo el `CLAUDE.md` nuevo -
primeras ramas bajo esa regla. Candado **LIBRE**.

---

**LIBRE** - sesion Claude Code (cuenta lenovo), 2026-08-14, resumen de todo lo que
subi hoy despues de lo anterior (Inty pidio "actualiza tu avance con las otras
cuentas"):

- **v8.52**: primer+segundo lote de iconos emoji->Font Awesome en `index.html`
  (22 reemplazos verificados por contexto, no regex ciego).
- **v8.53**: Taller -> derivacion real al taller de bicicletas mas cercano.
  `_actualizarTallerCercano()` usa `currentUserLocation` (misma variable que el SOS)
  + Overpass/OpenStreetMap (gratis, sin key) para encontrar el taller real mas cercano
  con nombre y distancia; antes el boton era una busqueda de texto ciega sin GPS.
  Bug real encontrado y corregido en desarrollo (query Overpass mal formada, faltaba
  un `;`) antes de llegar a produccion.
- **Auditoria de errores real (Sentry conectado)**: cero errores nuevos en produccion
  en los ultimos 5 dias. Los mas frecuentes historicos (`subscribeToRouteAlerts` 170x,
  `_perfilAcordeon` 50x) ya no existen en el codigo actual - eran de versiones viejas,
  se resolvieron solas. No pude marcarlos resueltos en Sentry (el token de
  `MI-SENTRY.txt` es de solo lectura, 403 al intentar).
- **`bienvenida.html` al mismo estandar que `index.html`**: 21 iconos emoji->FA
  (Instagram/Facebook con iconos de marca reales) + titulo/meta/frase principal
  actualizados de "Hecho en Chile" a la marca pan-latina que Opus ya dejo viva hoy
  (v8.56, "cicloturismo latinoamericano") - reuse su texto ya aprobado, no invente
  uno nuevo. Verificado en vivo en `librepedal.cl/bienvenida.html` con captura real.
  Pendiente de Inty (no lo toque): las 3 menciones de "prueba 7 dias gratis" en esa
  pagina - no encontre ningun mecanismo real de prueba por tiempo en toda la app.

**Sobre la expansion a Sudamerica de Opus (v8.55/8.56, ya en produccion):** vi el
`EMPEZAR-AQUI.md` y `EXPANSION-SUDAMERICA-2026-08-14.md`. Queda delegado a esta
maquina desplegar el Worker `librepedal-ia` con el secret de ElevenLabs (tengo
`MI-CLOUDFLARE-IA.txt` y `MI-ELEVENLABS.txt`, confirmados que existen). **NO lo hice
todavia** - se lo pregunte a Inty directo (es un cambio de marca + un secreto nuevo
en produccion, no solo tecnico) y me pidio parar antes de que tomara una decision.
Sigue pendiente, sin tocar. Mientras tanto la voz premium fuera de Chile degrada
seguro a voz nativa (no rompe nada).

Todo commiteado en ramas propias + mergeado a `main` con tests 13/13 en cada paso.
Candado **LIBRE**.

---

**DELEGO ESTO** - sesion lenovo se queda sin credito, Inty pidio delegar en vez de
seguir yo. Rama `wip/rueda-oro-necesita-simplificarse` (pusheada, NO mergeada,
NO tocar main con esto sin que Inty vea el resultado primero):

Aplique el diseño "oro cepillado" ya aprobado (`ANIMACIONES-LOGO.md` opcion N) a las
2 ruedas del logo (`index.html` `.lp-wheel` del login, `bienvenida.html` `.wheel` de
la portada) para arreglar el contraste real que tenian (neumatico casi negro sobre
fondo casi negro). **Inty lo vio a tamaño real (no en el preview grande de ~280px
donde se habia aprobado) y dice que ambas quedaron mal** - "se ve recargado, como un
reloj de sol, el aro de luz y el trazo especular se juntan, se ve como un borron
dorado". Detalle completo + las 2 opciones que le ofreci (simplificar quitando el
aro de luz + trazo especular, o revertir completo) en el mensaje del commit de esa
rama. Quien lo tome: probar a tamaño REAL (no en preview grande) antes de mostrarle
a Inty de nuevo.
