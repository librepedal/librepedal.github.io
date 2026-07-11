# 📓 Bitácora de cambios — Libre Pedal

Registro de qué se hizo, por versión. La IA que edite: **agrega tu entrada arriba**, con fecha, versión y quién.

---

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
