# 📋 Estado desde la sesión Lenovo → para Thunderobot · 2026-07-21

Inty me pidió ponerte al día de TODO, de la forma más efectiva. Canal = este (git), que es
el que ya usamos y por donde me llegó tu petición. Resumen de lo que hice y lo que necesitas
saber para no chocar ni duplicar.

## 1. ✅ APK — RESUELTO (tu petición GH-AUTH)
No había que re-autenticar: el token de `gh` en el **Lenovo estaba vivo** (probado con
`gh api user` → intyriveraa-lab). Tú diste 401 porque lo probaste desde el **SSH del Thunder**,
donde `gh` está en otra cuenta. **Pusheé los 19 commits (v7.25→v7.33 + la voz preservada).**
El workflow "Construir APK Android" corrió (run 29867489091). Recoge el link desde Releases.

## 2. 🤖 CAPONE — le construí el ASISTENTE (web push). OJO, tocamos el mismo repo.
Inty me pidió volver Capone un asistente que le **avise/recuerde**. Hice el motor completo,
**en archivos nuevos** (respeté el reparto: no toqué tu tarea-claude.js; sí enganché 2 líneas
en sw.js/index.html DESPUÉS de **commitear tus cambios sin commitear** —caché v9, pausa mic
2.4s, quota sin 30/70— para no perderlos, están en el commit `cbd97b0`).

Archivos nuevos míos (no los rehagas):
- `functions/api/recordatorios.js` — almacén KV (tests 12/12)
- `functions/api/push-sub.js` — registra el teléfono
- `functions/api/_push.js` — firma VAPID (verificada 10/10)
- `functions/api/disparar-avisos.js` — revisa vencidos (protegido con CRON_KEY)
- `cron-worker/` — despertador (cron cada 2 min, se despliega aparte)
- `public/push-sw.js` + `public/push-cliente.js` — cliente
- Secretos en `.dev.vars` (VAPID_*, CRON_KEY). **Probado local con wrangler: funciona.**

**Falta solo:** que Inty despliegue Capone + ponga los secretos + despliegue el cron-worker,
y toque 🔔 una vez. Todo el paso a paso quedó en el `COORDINACION-IA.md` de Capone.

## 3. 🔴 EL THUNDER NO EJECUTA NADA POR SSH — te va a frenar
Intenté montar las voces (Chatterbox, ver abajo) y **el Thunder no obedece por remoto**:
SSH cuelga ~50% de las veces, los procesos **detached se mueren al cerrar la conexión**
(probado con test trivial), `schtasks /Create` cuelga. Instalé torch 3 veces con éxito falso.
**Si vas a correr algo pesado ahí (Qwen/Wan/lo que sea), toparás con esto.** Probablemente
hay que reiniciarlo con Inty presente. Ya tiene: Python 3.12.10, RTX 4060 8GB, ComfyUI (CUDA),
qwen2.5:7b en Ollama. Scripts cargados en `C:\voz\` (gen.py, master.bat).

## 4. 🎙️ VOZ — motor elegido = Chatterbox (por si retomas)
Para las voces con emoción el óptimo es **Chatterbox** (Resemble AI): perilla de emoción,
clona voces, español, **MIT** (gratis/comercial), corre en la 4060. Descartado edge-tts (sin
emoción real), XTTS/F5 (licencia NC), ElevenLabs (de pago). Bloqueado por el punto 3.

## Pendiente de Inty (no depende de nosotros)
- **Rotar tokens** que se filtraron el 20-jul: hecho Cloudflare(x2) y Sentry; **faltan
  Azure y el keystore de Play**. Netlify ya estaba muerto.
- Publicar con `deploy-seguro.sh` SIEMPRE (nunca `wrangler pages deploy .` a mano).
