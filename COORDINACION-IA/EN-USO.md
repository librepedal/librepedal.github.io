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

## Estado actual

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


```
🔴 SESIÓN DEL LENOVO (2026-07-21): LEE `PETICION-GH-AUTH.md` — Inty pidió que corras `gh auth login`
para re-autenticar GitHub y generar el APK. Solo tú puedes (necesita terminal real + su navegador). Luego
`git push lab main` (dispara el build) y deja "GH AUTH LISTO + PUSHEADO". Thunderobot recoge el link.

LIBRE — sesión 1 (Capone/Thunderobot), 2026-07-21. DESPLEGUÉ a librepedal.cl:
· v7.25: logo.jpg escalado (hack mix-blend) → LOGO OFICIAL (logo-transparent.png) QUIETO al
  centro de una RUEDA de radios finos naranjos GIRANDO con relieve (SPEC Pantalla 1, solo lo visual).
· v7.26: iconos de modo A MEDIDA (const MODO_SVG ~línea 1665): bici Lucide (ciclismo/mtb), huellas
  (trekking), auto (moto) — reemplazan los emoji en renderActividadGrid/renderModoRegistro/
  renderModoRapidoEsfera. Validado con vm (0 errores de sintaxis).
· v7.27: `solicitarPermisosEsenciales()` (~línea 3487) YA NO arranca el GPS ni pide el micrófono al
  ABRIR (queja real de Inty: "grababa/espiaba desde el inicio"). Ahora arranca solo por acción del
  usuario. Sigue llamándose en los 2 sitios de arranque (~3170 y ~3345) pero es no-op a propósito.
· v7.28: SOBREVUELO con bici al terminar ruta y desde el historial (botón 🚁). Funciones nuevas al
  final del script (~9345): reproducirSobrevuelo/_ofrecerSobrevueloFin/verSobrevueloRuta; toggleGPS
  ENVUELTO (original intacto). Auditado: mlMarker.setLatLng, getBounds/pad, localId='l'+t — todo OK.
· v7.29: ABANICO de reporte. #fabReportar (onclick→abrirAbanicoReporte) despliega 4 opciones animadas
  (Peligro/Control/Servicio/Mirador); cada una abre reportarEnRuta + seleccionarCatReporte(cat). NO
  edité el sistema de reportes. Actualicé el selector del tutorial a #fabReportar.
· v7.30: PRE-VUELO de Pistero (_prevueloPistero) reemplaza los "GPS activado" secos en toggleGPS
  (~3533/3540): "Antes de salir, revisa la bici. [clima real via climaDeZona]. ¡A rodar!" (chileno).
SPEC Pantalla 2 COMPLETA: #1 GPS-al-decidir (v7.27), #2 sobrevuelo (v7.28), #3 abanico (v7.29),
#4 pre-vuelo (v7.30), + modo-se-repliega en la Esfera (v7.31, renderModoRapidoEsfera ~1706 con chip
"Vas en X · Cambiar" + _modoEsferaAbierto). SPEC Pantalla 1: logo (v7.25) + iconos de modo (v7.26).
TODO el SPEC aprobado quedó APLICADO Y DESPLEGADO (v7.25→v7.31).
· v7.32: INTRO de Pistero/Pistera la 1ª vez por usuario (_pisteroIntroPrimeraVez, al final del script;
  gancho en el flujo de reg ~3362; usa pisteroGenero l/c; flag lp_intro_pistero_<cu> + Firestore
  introPistero; no se repite). + LANDING nueva bienvenida.html: enfocada en comunidad/visión (las 4
  causas), PISTERO OCULTO a propósito (sorpresa en ruta; saqué el "copiloto/voz" y la tarjeta de
  Pistero), menos explícita (4 pilares + teaser "hecha para descubrirse"), CTA de descarga (→index.html
  por ahora; el .apk real necesita re-auth de GitHub), contador de comunidad EN VIVO (Firebase). Preview
  aprobado por Inty ("vamos con la página"). NOTA: analíticas de admin YA EXISTÍAN (verAnaliticasAdmin,
  colección usage) — pendiente potenciarlas a dashboard visual.
· v7.33: pie de comunidad con redes reales (Instagram @libre_pedal + Facebook share/18wTofCbr1) en el
  ingreso (index.html, fin del form auth) Y en el footer de la landing. LANDING renovada (feedback Inty):
  quité "usuarios falsos"/"seguridad"/"bicis para quien no tiene"/"gratis sin letra chica"; reencuadre
  "5.000 suscritos → la comunidad decide qué hacer con los FONDOS"; causas ahora = sorteo de accesorios,
  reforestar, apoyo a deportistas; sección PRECIOS (7 días gratis · primeros 300 con descuento 6 meses ·
  luego $3.000 CLP/mes); sección AUSPICIADORES (Bodega Chumpeco Llifén, Libre Pedal Taller Linares,
  Hospedaje Futrono, Refugio Oasis Llifén, La Ruca del Ciclista Hornopirén/Constitución/Talca) + bloque
  "sé parte" (inversionistas/aportes → CTA a redes). PENDIENTE: APK descargable (necesita re-auth GitHub;
  token vencido) y dashboard de admin visual.
PENDIENTE (necesita decisión de Inty, NO aplicar a ciegas): (a) pie de comunidad en el ingreso
(librepedal.cl/quiénes-somos/redes) — faltan los handles reales de IG/TikTok/YT/FB; (b) auth con
contraseña+sexo que pide la SPEC — la app NO usa password (correo+personaje), hay que decidir antes.
NO toqué auth/campos ni el sistema de reportes. La SPEC pide
contraseña+sexo pero la app real NO usa password (login por correo+personaje); eso hay que
RECONCILIAR antes, no aplicar a ciegas. Antes preservé tus cambios de voz (commit 0a4e735).
Versión subida en los 3 lugares (APP_VERSION, version.txt, sw.js CACHE=v725). Candado LIBRE.

---

OCUPADO — sesión 2 (Opus 4.8), 2026-07-21. Trabajando en: VOZ (Inty me reasignó las
voces). Toco SOLO el bloque PERSONALIDAD_PROSODIA (~línea 1770) y la voz nativa de
fallback (~2200). Es un cambio chico y quirúrgico. Sesión 1: sigues con el rediseño de UI;
si necesitas index.html avísame y suelto en minutos. NO toco nada de tus pantallas.

📩 SESIÓN 1: LEE `PETICION-A-SESION-1-2026-07-21.md`. Inty pidió que dejes todo corriendo
y que dejes escrito ahí "el método que estamos usando ahora último" — no está en el repo y
la sesión 2 no puede leer tu conversación con él ni tus mockups de claude.ai/code/artifact.


Inty decidió seguir con el rumbo de la sesión 1 (la SPEC + el orden que están armando).
La sesión 2 se detuvo y NO va a tocar index.html. El candado queda libre para ti.

Última sesión: 2 (Opus 4.8), 2026-07-21 04:xx — v7.21 a v7.24 COMMITEADAS Y PUSHEADAS
(commit 934b159) y desplegadas en producción. Tests 12/12 verdes.

MEA CULPA, para que no se repita: trabajé toda la sesión SIN leer este candado y SIN
tomarlo. No hubo choque de puro suerte (la sesión 1 estuvo en documentos, no en
index.html), pero llegué a tener CUATRO versiones sin commitear mientras la sesión 1
dejaba una SPEC aprobada que yo no había leído. Eso es exactamente lo que este archivo
existe para evitar.

Lo que toqué en index.html (por si la sesión 1 vuelve sobre esto):
- CSS .view (padding-bottom para la barra inferior) y #map (alto real, ya no 280px fijos)
- REPORTE_CATS reagrupado en 4 grupos + categoría nueva `taller`; el pan 🥖 fuera
- PERSONALIDADES: etiquetas sin el prefijo "Pistero"
- Bloques NUEVOS: CANAL DE RODADA, AVISO DE CICLISTA ADELANTE, COLABORADORES
- Eliminado código muerto: addRouteAlert, subscribeToRouteAlerts, div #route-alerts
- liveTracking ahora publica `modo`
- El comando de voz del taller (regex) ampliado

PENDIENTE Y SIN EMPEZAR: la SPEC-REDISENO-INICIO-MAPA-2026-07-20.md que dejó la sesión 1
está APROBADA por Inty y NO está aplicada. Mis cambios de mapa de hoy pueden chocar con
ella: hay que reconciliar antes de implementarla, no aplicarla encima a ciegas.


---

## Por qué existe esto (no lo borres)

Pedido explícito de Inty (2026-07-13): "quiero que desde ahora haya una
coordinación sin fallas" entre las dos cuentas de Claude que trabajan en
paralelo sobre este mismo repo, de forma **permanente** — no solo para hoy.
Antes de esto, ya hubo un caso real: sesión 2 dejó 72 líneas de cambios sin
commitear y sesión 1 tuvo que rescatarlas a mano (commit `3da21e4`) para que
no se perdieran. Este candado existe para que esa clase de susto no dependa
de que alguien se acuerde de mirar `git status` a tiempo — un archivo que se
lee ANTES de tocar nada es más difícil de olvidar que una regla de memoria.

**Por qué un archivo y no otra cosa:** las dos sesiones comparten la MISMA
carpeta en el MISMO disco (no son clones separados) — así que un archivo de
texto es un candado real y barato: cualquiera de las dos sesiones lo puede
leer y escribir al instante, sin depender de que git termine de sincronizar.

Ver también `PENDIENTES.md` (protocolo completo y reparto de territorio) y
`BITACORA.md` (historial de qué se hizo, por versión).
