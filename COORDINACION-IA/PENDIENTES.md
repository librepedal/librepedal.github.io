# ✅ Pendientes — Libre Pedal

Marca con `[x]` lo hecho y anótalo en `BITACORA.md`. Actualizado 2026-07-11.

---

## 🤖 Para GEMINI (build del APK — Claude no puede compilar el APK)
- [ ] **Micrófono nativo en la app.** El código web (v5.92) ya llama al plugin `SpeechRecognition`. Falta meterlo al APK:
  1. `npm install @capacitor-community/speech-recognition`
  2. `npx cap sync android`
  3. En `AndroidManifest.xml`: `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
  4. Reconstruir el APK (`build-apk.yml`).
  - Con eso el mic queda andando dentro de la app (hoy solo funciona en Chrome).

## 👤 Para INTY (son de tu cuenta, ninguna IA puede hacerlas)
- [ ] **ROTAR los 3 tokens** (estuvieron públicos): Cloudflare, Cloudflare-IA y Netlify.
  - Cloudflare/IA: dash.cloudflare.com → My Profile → API Tokens → el token → **Roll** → pegar el nuevo en `MI-CLOUDFLARE.txt` / `MI-CLOUDFLARE-IA.txt`.
  - Netlify: app.netlify.com → User settings → Applications → **Revoke** (ya no se usa).
- [ ] **Permiso DNS al token** (Zone:DNS Edit + Zone:Read) para poder: (a) poner la landing en `librepedal.cl` y (b) crear el correo `contacto@librepedal.cl` (Email Routing). Hoy el token solo tiene Pages/Workers.

## 🌐 Dominio / correo (bloqueado por el permiso DNS de arriba)
- [ ] Landing (`librepedal-web.pages.dev`) → puerta de entrada en `librepedal.cl`; app → `www.librepedal.cl`.
- [ ] Correo pro `contacto@librepedal.cl` (Email Routing → Gmail). Ya está puesto en `privacidad.html`/`terminos.html`.

## 📄 Play Store / legal
- [ ] Hostear/enlazar `privacidad.html` y `terminos.html` en URLs públicas (Play las exige). Ya están en la carpeta.
- [ ] Completar ficha (título/descap. en `PLAY-STORE-LISTING.md`), rating de contenido, data safety.

## 🧠 IA de Pistero (mejoras, opcional)
- [ ] Pulir el estilo del chat `v-pistero` (Claude puede).
- [ ] Cuando el plugin de voz esté en el APK, probar `pisteroPorVoz()` end-to-end.
- [ ] Enriquecer el contexto del Worker (más campos del usuario si sirven).

## 🎤 Estado del micrófono (referencia)
- Chrome (web): **funciona**.
- App instalada (WebView): **no**, hasta que Gemini agregue el plugin (arriba). El código ya está preparado; el fallback manda a escribir mientras tanto.
