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

**Pasos para destrabar el AAB (Inty + cuenta que ayude):**
1. Localizar el keystore de release y sus 3 contraseñas/alias (ver `PENDIENTES.md`; estaba
   marcado como pendiente). Si NO existe todavía, hay que **crearlo UNA vez** con `keytool`
   (`keytool -genkey -v -keystore librepedal-release.keystore -alias librepedal -keyalg RSA
   -keysize 2048 -validity 10000`) y **guardarlo a buen recaudo** (si se pierde, no se puede
   volver a actualizar la app en Play — es irreemplazable).
2. Inty agrega los 4 secretos en **GitHub → Settings → Secrets and variables → Actions**
   (`ANDROID_KEYSTORE_BASE64` = `base64 -w0 librepedal-release.keystore`).
3. Lanzar el workflow "Construir AAB firmado" desde Actions. Baja el artefacto
   `LibrePedal-AAB-release` (.aab) y súbelo a Play Console (prueba cerrada).
4. `versionCode`/`versionName` salen solos de `version.txt` (vía `scripts/patch-android-signing.js`).
   Asegurar que `version.txt` (hoy 8.54) sea mayor que el último subido a Play.

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
