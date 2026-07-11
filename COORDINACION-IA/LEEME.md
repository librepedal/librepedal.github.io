# 🤝 Coordinación entre IAs — Libre Pedal

Este proyecto lo trabajan **dos IAs en paralelo**: **Claude** (Anthropic) y **Gemini**.
Lee esto ANTES de tocar el código para no romper ni duplicar el trabajo del otro.

**Última actualización:** 2026-07-11 · **Versión viva:** v5.94

---

## 🗺️ Qué es y dónde vive

- **App:** un solo archivo `index.html` (~5.100 líneas). Todo el HTML/CSS/JS va ahí.
- **Web en vivo:** https://librepedal.cl (y www) → Cloudflare Pages, proyecto **`librepedal`**.
- **App instalada (APK):** carga `https://librepedal.github.io` (GitHub Pages del mismo repo) dentro de un **WebView de Android** (Capacitor, appId `cl.librepedal.app`).
- **Cerebro IA de Pistero:** Cloudflare Worker `https://librepedal-ia.librepedal.workers.dev` (POST `{mensaje,usuario,hospedajes,historial}` → `{respuesta,modelo}`).
- **Landing de comunidad:** https://librepedal-web.pages.dev (proyecto Pages `librepedal-web`, archivo fuente `scratchpad`/ artifact — NO es la app).
- **Backend:** Firebase/Firestore (proyecto librepedal-cb983).

## 🔢 Sistema de versión (OBLIGATORIO en cada cambio)
Tres lugares deben coincidir SIEMPRE:
1. `const APP_VERSION='X.YZ'` (≈ línea 875 de index.html)
2. `version.txt` (mismo número, sin salto de línea)
3. `<span id="lpVerMostrada">X.YZ</span>` en el footer

Sube el número en cada cambio (la app se auto-repara comparando con `version.txt`). Cada versión = un commit `vX.YZ: descripción`.

## 🚀 Cómo se publica (IMPORTANTE — la web NO es git-connected)
- **Web (librepedal.cl):** deploy DIRECTO por wrangler, NO por push:
  ```
  wrangler pages deploy <CARPETA_LIMPIA> --project-name=librepedal --branch=main
  ```
- **APK / GitHub Pages:** `git push origin main` (dispara el workflow `build-apk.yml` y actualiza github.io).
- **Flujo correcto en cada cambio:** subir versión → `git commit` + `git push` (durabilidad + APK) **Y** `wrangler pages deploy` (web en vivo). Si solo haces push, la web NO se actualiza.

## 🔐 SEGURIDAD — no repitas la fuga
- **NUNCA** deployes ni subas la **carpeta completa**. Contiene `MI-CLOUDFLARE.txt`, `MI-CLOUDFLARE-IA.txt`, `MI-TOKEN-NETLIFY.txt` (tokens). Están en `.gitignore`, pero **wrangler los sube igual** si deployas la carpeta entera.
- Deploya SIEMPRE desde una **carpeta limpia** con solo archivos web. Snippet listo:
  ```bash
  SRC=.; CLEAN=../lp-deploy
  rm -rf "$CLEAN"; mkdir -p "$CLEAN"; cp -r "$SRC"/* "$CLEAN"/
  rm -f "$CLEAN"/MI-*.txt "$CLEAN"/firestore.rules "$CLEAN"/REGLAS-FIREBASE.txt \
        "$CLEAN"/*.md "$CLEAN"/package.json "$CLEAN"/capacitor.config.json
  rm -rf "$CLEAN"/scripts "$CLEAN"/concepts "$CLEAN"/COORDINACION-IA
  wrangler pages deploy "$CLEAN" --project-name=librepedal --branch=main
  ```
- (2026-07-11, corregido) Lo de arriba era una **falsa alarma**: `librepedal.cl/MI-*.txt` devuelve HTTP 200
  pero el contenido es el `index.html` completo (fallback SPA por defecto de Cloudflare Pages para rutas que
  no existen), no los tokens. Confirmado comparando tamaños de respuesta y probando con una ruta inventada
  cualquiera — da exactamente lo mismo. Los tokens reales nunca estuvieron en el contenido servido. Sigue
  siendo buena práctica deployar desde carpeta limpia (como dice el snippet de arriba) y no hace daño, pero
  no hay urgencia de rotar tokens por este motivo específico (ver PENDIENTES).
- Esta carpeta `COORDINACION-IA/` NO debe servirse en la web: exclúyela del deploy (ya está en el snippet).

## 🤝 Reglas para no pisarse
1. **Haz `git pull` antes de editar** y `push` apenas termines, para no divergir.
2. Ediciones **pequeñas y enfocadas**; no reescribas funciones enteras del otro sin necesidad.
3. **No revertir** cambios del otro sin avisar en `BITACORA.md`.
4. Anota lo que haces en `BITACORA.md` y actualiza `PENDIENTES.md`.
5. Sube SIEMPRE la versión (evita el bucle de auto-reparación).

## 📂 Archivos de esta carpeta
- `LEEME.md` — esto (reglas y estado).
- `BITACORA.md` — registro de cambios por fecha/versión.
- `PENDIENTES.md` — tareas por hacer y de quién es cada una.
