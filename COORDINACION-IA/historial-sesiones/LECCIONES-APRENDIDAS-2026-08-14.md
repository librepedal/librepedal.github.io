# 🧠 Lecciones aprendidas — para que NINGUNA cuenta vuelva a iterar (2026-08-14)

Pedido de Inty: dejar lo aprendido para todos, para no repetir el vía crucis. Esto es lo
que costó iteraciones hoy. **Léelo antes de tocar el Worker, Cloudflare o ElevenLabs.**

## ☁️ Cloudflare — el Worker `librepedal-ia`
1. **Vive en la cuenta `024bc85be759cbf54b131202a0a1d183` = `Intyrivera@gmail.com`.**
   `inty405@gmail.com` (567086…) NO tiene acceso. Si wrangler dice "Worker does not exist on
   your account", estás en la cuenta equivocada.
2. **`wrangler login` tiene un BUG en Windows** (crashea al cerrar: `Assertion failed ... async.c`)
   y **NO guarda el token**. NO pierdas tiempo con login. **Usa un API TOKEN:**
   - Crear en https://dash.cloudflare.com/profile/api-tokens (cuenta 024bc): permiso
     **Account · Workers Scripts · Edit** (+ Account Settings · Read). Guardar en
     `Downloads/MI-CLOUDFLARE-IA.txt`.
   - Deploy: `CLOUDFLARE_API_TOKEN=$(cat MI-CLOUDFLARE-IA.txt) CLOUDFLARE_ACCOUNT_ID=024bc85be759cbf54b131202a0a1d183 npx wrangler deploy`
3. **El token de Pages NO despliega Workers.** Son permisos distintos. (`librepedal-ci-pages`
   solo sirve para la web, no para el worker.)
4. **`worker-ia/wrangler.toml` debe decir `name = "librepedal-ia"`** (así lo llama la app en
   `IA_URL`). La rama i18n lo había renombrado a `-sudamerica` → habría creado un worker
   fantasma que la app NO usa. Ya está corregido; no lo vuelvas a renombrar.
5. **⚠️ EL GRANDE: tras `wrangler secret put`, HAY QUE `wrangler deploy` (redeploy).** Si no,
   las instancias vivas del worker siguen con el secreto viejo cacheado → 401 aunque el
   secreto nuevo esté bien. Setear secreto + REDEPLOY = obligatorio.

## 🎙️ ElevenLabs
6. **Una key puede dar 401 en `/v1/user` pero FUNCIONAR en TTS** (keys restringidas a Text-to-
   Speech no tienen scope de user). **NO valides con `/v1/user`; valida con el endpoint TTS:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     "https://api.elevenlabs.io/v1/text-to-speech/k8cFOyAg7B9qwBlDDNTC" \
     -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
     -d '{"text":"hola","model_id":"eleven_multilingual_v2"}'
   ```
   200 = sirve. 401 "Invalid API key" = key mala. Las keys viejas `peru`/`pistero` salen
   OCULTAS en la lista → crear una nueva si no la tienes guardada.
7. Cuenta: **"INTY's Workspace", Plan Creator** (activo, ~109k créditos). Voces/modelo tienen
   default en el worker (Miguel G / Ninoska / `eleven_multilingual_v2`) → **solo falta la key.**

## 🔀 Git / merges
8. **El diff crudo miente en merges de ramas viejas.** La rama i18n mostraba −485 líneas
   (los 930 mp3 de `voces-el/`) porque forkeó ANTES de ese banco. El merge 3-way NO los borra
   (son adds del lado de main). No te asustes con las "deleciones" — verifica con el merge real.
9. **Deploy web = automático al mergear a `main`.** NUNCA a mano (`deploy-seguro.sh` bloqueado).
   Deploy del Worker = `wrangler deploy` (aparte, manual, con el token de 024bc).

## 🗂️ Coordinación (lo que funciona)
10. Punto de entrada: `EMPEZAR-AQUI.md`. Reglas: `CLAUDE.md` (ramas, latido 5 min, nada a main
    sin validar + ✓ de Inty). Cada tarea reclamable en su doc; marca EN-CURSO para no duplicar.

## ✅ Estado al escribir esto
Producción **v8.56**: tema Sólido/Cristal + íconos FA + taller GPS + **Sudamérica completa
(i18n/jerga/marca) + voz premium por país (worker desplegado y probado 200 OK)**. Falta el
**AAB final** (keystore en `Downloads/KEYSTORE-LIBREPEDAL-RESPALDO`, faltan 4 secretos en
GitHub, tu admin) y la **animación rueda-oro** (ver `ANIMACION-RUEDA-ORO-2026-08-14.md`).

— Opus, 2026-08-14.
