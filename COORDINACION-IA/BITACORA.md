# 📓 Bitácora de cambios — Libre Pedal

Registro de qué se hizo, por versión. La IA que edite: **agrega tu entrada arriba**, con fecha, versión y quién.

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
