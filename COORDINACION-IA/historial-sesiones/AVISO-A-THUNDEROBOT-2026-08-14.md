# 📣 Aviso para Thunderobot — deploy de voces ElevenLabs (2026-08-14)

**De:** sesión lenovo · **Para:** sesión Thunderobot (o quien retome ese rol)

No encontré actividad tuya reciente en el repo (tu último commit fue el 29-jul, planificador
Desde-Hasta v7.51) ni un candado fresco en `EN-USO.md` — dejo esto para cuando vuelvas a
esta carpeta, por si tu sesión sigue viva en otra máquina en paralelo.

## Qué cambié (ya está en `main`, local Y publicado en librepedal.cl)

1. **`voz-elevenlabs.js`** (módulo nuevo, aparte de `index.html`) + carpeta **`voces-el/`**
   (676 mp3 + manifest.json): catálogo de voces ElevenLabs, una voz distinta por cada uno
   de los 12 arquetipos vivos de `PERSONALIDADES`. El catálogo Azure viejo (`voces/`) queda
   intacto como respaldo — no lo toqué.
2. Reescribí `_pisteroIntroPrimeraVez()` (mensaje de bienvenida).
3. **`deploy-seguro.sh` actualizado**: le agregué `voz-elevenlabs.js` y `voces-el/` a la
   lista de archivos/carpetas que copia. Si tenías el script viejo en la cabeza, ojo — sin
   este cambio el deploy NO publica el catálogo nuevo (se probó, se detectó, se arregló).
4. **Encontré y arreglé un bug real:** `version.txt` estaba pegado en `7.51` (no se estaba
   regenerando en el deploy, aunque `APP_VERSION` en `index.html` decía otra cosa). Es
   exactamente el bug del incidente v5.9 (bucle de recarga) que ya se había arreglado una
   vez — la regla "nunca escribir version.txt a mano, siempre generarlo de APP_VERSION" se
   había dejado de cumplir en algún punto. Lo regeneré (`grep APP_VERSION` → `printf`) y
   quedó en `7.53`, verificado en producción.
5. Sé que dejaste el CI (`deploy-cloudflare.yml`) para auto-deployar en cada push a `main`
   sin depender de una sesión corriendo `deploy-seguro.sh` a mano. Yo desplegué a mano hoy
   (dos veces, la segunda para el fix de `version.txt`) porque Inty pidió verlo en vivo ya.
   Si haces push ahora, el CI va a re-deployar con el `deploy-seguro.sh` actualizado (ya
   incluye `voces-el/`) — no debería haber sorpresas, pero avisado queda.

## Lo que NO toqué (por si esperas encontrarlo intacto)
`worker-ia/worker.js`, todo lo de Mapa/GPS/reportes (tu territorio según
`ACUERDO-SESIONES-2026-07-21.md`), `PERSONALIDADES`/`PERSONALIDAD_PROSODIA` (agregué
lectura, no cambié las 12 existentes).

## Pendiente mío, en curso
Arquetipo nuevo "Seductor/Seductora" (voces Luis/Clara de ElevenLabs) — todavía no tiene
banco de frases ni está en `PERSONALIDADES`. Si lo tomas tú antes que yo, revisa el candado
de `EN-USO.md` primero.

Detalle técnico completo del mapeo de voces en `scripts/gen-voces-elevenlabs.js` y en
`ACUSE-LENOVO-SUDAMERICA-2026-08-14.md` (coordinación con la sesión que expande LibrePedal
a Sudamérica, clon aparte, no debería chocar contigo tampoco).
