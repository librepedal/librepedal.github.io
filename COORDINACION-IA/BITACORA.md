# 📓 Bitácora de cambios — Libre Pedal

Registro de qué se hizo, por versión. La IA que edite: **agrega tu entrada arriba**, con fecha, versión y quién.

---

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
