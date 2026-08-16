# 🎯 HANDOFF FINAL — para cualquier cuenta Claude que retome (2026-08-14)

Escrito por la cuenta **Opus** antes de quedarse sin crédito. Objetivo de Inty: dejar
LibrePedal **funcionando al 100%** con TODAS las mejoras recientes, y armar el **AAB final**
para la prueba cerrada de Google Play (lanzamiento 2026-08-14 18:00). **Lee esto + `CLAUDE.md`
+ `BACKLOG-MEJORAS-2026-08-14.md` + `AUDITORIA-CEO-2026-08-14.md` antes de tocar nada.**

## ✅ Estado actual (verificado)
- **Producción: v8.54 EN VIVO** en librepedal.cl. Tests 13/13 verdes. Todo integrado:
  - Tema **Sólido/Cristal** app-wide (Opus): selector en Perfil→Preferencias→"Estilo de
    interfaz" + superficies en vidrio (tarjetas, hero, stats, chips, nav, menús, modales).
    Default = Sólido = app de siempre. Rama: `feature/temas-app-wide` (ya mergeada).
  - **Íconos → Font Awesome** (otra cuenta, 430 usos). Rama `feature/iconos-botones`.
  - **Taller más cercano con GPS real** (otra cuenta). Rama `feature/taller-derivacion`.
- Coordinación blindada: `CLAUDE.md` (ley + latido), deploy manual bloqueado, deploy = merge a main.

## 🔴 P0 — AAB (LAUNCH-CRÍTICO, HOY 18:00). ESTÁ BLOQUEADO.
El workflow **`.github/workflows/build-aab-release.yml`** ("Construir AAB firmado") existe y
está bien (Capacitor → API 36 → firma → sube el .aab como artefacto). Se lanza a mano desde
**GitHub → Actions → "Construir AAB firmado (Google Play)" → Run workflow**.

**PERO faltan los 4 secretos del keystore.** `gh secret list` solo muestra los de Cloudflare.
El build fallará sin estos (necesita **admin** = Inty para agregarlos):
- `ANDROID_KEYSTORE_BASE64`  (el .keystore en base64)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

**EL KEYSTORE EXISTE** (ya NO hay que crearlo): `C:\Users\intyr\Downloads\KEYSTORE-LIBREPEDAL-RESPALDO\`
contiene `librepedal-release.keystore` + `MI-KEYSTORE-PLAYSTORE.txt` (alias + contraseñas).
Hay un AAB VIEJO en `Downloads\LIBREPEDAL-AAB-API36\app-release.aab` (8-ago, API 36) — **NO
sirve, es pre-v8.5x**; hay que **rehacer el AAB con el main actual (v8.55)** para que incluya
íconos + taller + tema + voz.

**Pasos para el AAB final (Inty tiene admin; la ÚLTIMA cuenta lo sube, NO Opus):**
1. Inty agrega en **GitHub → Settings → Secrets and variables → Actions** los 4 secretos,
   tomando alias/contraseñas de `MI-KEYSTORE-PLAYSTORE.txt`:
   - `ANDROID_KEYSTORE_BASE64` = salida de `base64 -w0 librepedal-release.keystore`
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
2. GitHub → Actions → **"Construir AAB firmado (Google Play)" → Run workflow** (sobre `main`).
3. Descargar el artefacto `LibrePedal-AAB-release` (.aab) y subirlo a **Play Console** (prueba
   cerrada). `versionCode`/`versionName` salen de `version.txt` (hoy **8.55**) vía
   `scripts/patch-android-signing.js`; debe ser mayor que el último subido a Play.
4. Alternativa local (si no se quieren cargar secretos): construir el .aab en una máquina con
   Android SDK + JDK 17 usando ese keystore. La vía CI (pasos 1-3) es más simple.

## 🌎 CONSOLIDACIÓN — clon Sudamérica (i18n) — ⚠️ NO mergeado, requiere ✓ de Inty
El clon `C:\Users\intyr\Downloads\LibrePedal-Sudamerica` (rama `i18n-sudamerica-prep`, remoto
`upstream-NO-PUSH`) tenía trabajo de expansión: **i18n marca pan-latino, Pistero adaptativo
por país, ruteo de voz por país (Chile=Azure es-CL / resto=ElevenLabs neutro), proxy
ElevenLabs `?eltts=` en worker-ia**. Opus lo **consolidó/subió** a origin como
**`feature/i18n-sudamerica`** (visible para todos). **NO se mergeó a main** porque:
- Es una divergencia grande (forkeó de un main viejo; +169/−485 líneas en index.html) que
  incluye **rebranding pan-latino** → decisión de marca de Inty, no automática.
- El único conflicto (index.html ~línea 2785, lógica de voz dinámica) hay que resolverlo
  PENSADO: conservar el fix de main (sin el candado `navigator.onLine`) **y** sumar el ruteo
  por país de Sudamérica (Chile→`_vozAzureRuntime`, resto→`_vozElevenRuntime`). NO reintroducir
  `navigator.onLine`.
- Además `feature/i18n-sudamerica` toca `worker-ia` (deploy aparte del Worker) → verificar.
**Acción para la última cuenta + Inty:** decidir si el pan-latino entra a esta release o
después; si entra, resolver el conflicto como se indica, verificar tests 13/13 y worker, y
mergear. Si NO entra ahora, queda en su rama sin riesgo.

## 🟡 P1/P2 — Mejoras pendientes (subir TODO lo que se pueda antes del AAB)
Trabajar en ramas, tests 13/13, merge a main (deploy auto). Detalle en `BACKLOG-MEJORAS-2026-08-14.md`:
- **Tema Cristal — 2º lote**: falta revestir **botones (.ab/.bg)** y la **insignia Darma**
  en vidrio (Opus los dejó fuera por riesgo de contraste sin ver en teléfono). Los botones
  `.ab` ya tienen texto claro (#dfe7ff) → un fondo glass mantiene legibilidad. Darma: usar
  vidrio dorado con texto claro (#ffe9a8), no el texto oscuro actual.
- **Íconos/visual pendientes**: revisar que NO queden emojis de UI sin migrar (la otra cuenta
  hizo el grueso; barrer pantalla por pantalla, T21 del backlog).
- **Rendimiento/PWA** (T01-T04): defer/async CDN, lazy-load mapa, minify en deploy, offline.
- **Accesibilidad** (T08-T10): role/aria, foco, contraste.
- **firestore.rules** (T14): resolver el hold de `PAUSA-FIRESTORE-RULES` antes de publicar reglas.

## 🎙️ Voz — clon local LISTO (espera ✓ de Inty)
`VOZ-CLON-LOCAL-2026-08-14.md`: clon indistinguible (0.89 vs techo real 0.78), en
`C:\Users\intyr\lp-voz-clon` (venv 3.11 + Chatterbox MIT). Params default óptimos. Si Inty
aprueba de oído (se le mandaron 3 mp3) → generar banco ampliado (T06) y cablearlo (T07).

## 🔀 Cómo subir todo (flujo, de CLAUDE.md)
```bash
git fetch origin && git checkout main && git pull --ff-only origin main
git checkout -b feature/mi-mejora
# ...trabajar... node tests/run.mjs  (13/13) ...
git checkout main && git pull --ff-only origin main && git merge feature/mi-mejora && git push
# deploy automático ~50s. Verificar: curl -s https://librepedal.cl/version.txt
```
Subir versión en 3 lugares (APP_VERSION + version.txt + sw.js) en cada release.

## Orden sugerido para la cuenta que retome
1. **Destrabar el AAB** (P0, con Inty por los secretos) — es lo del deadline.
2. Cerrar el 2º lote del tema (botones/Darma) + barrer emojis de UI restantes.
3. Perf/PWA/a11y según alcance el tiempo.
4. Con ✓ de Inty a la voz: banco ampliado.

— Opus, 2026-08-14. Producción en v8.54. Nada roto. Todo reclamable.
