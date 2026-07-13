# 🤝 Coordinación entre IAs — Libre Pedal

Este proyecto lo trabajan **varias IAs en paralelo** (hoy: dos sesiones de Claude;
en el pasado, Gemini). Lee esto ANTES de tocar el código para no romper ni duplicar
el trabajo de otra sesión — sea cual sea el modelo que la esté corriendo.

**Última actualización:** 2026-07-13 · **Versión viva:** v6.42

📌 **`VISION-MAESTRA.md`** en esta misma carpeta es el norte del producto completo
(prompt maestro de Inty) con auditoría real de qué existe y qué falta — leerlo antes
de proponer módulos nuevos grandes.

---

## 🧭 EL PROTOCOLO DE TRABAJO (léelo si sos una sesión nueva, de cualquier modelo)

Esto es lo que Inty pide, palabra por palabra, y lo que ya viene funcionando bien
en las últimas ~30 versiones — no es opcional, es el estilo de trabajo de este
proyecto. Si te acaban de sumar a este repo (Claude, Gemini, Qwen, Kimi, o
cualquier otro agente con acceso a archivos/terminal/navegador), seguí esto:

1. **Barrido función por función, no arreglos sueltos.** Se recorre la app una
   función/sección a la vez (ver la lista de funciones ya barridas más abajo),
   se cierra completa, y recién ahí se pasa a la siguiente. No dejar una función
   "a medias" para saltar a otra más entretenida.

2. **Buscar VARIANTES reales de uso, no solo el caso feliz.** Para cada función:
   pensar en las distintas formas en que una persona real la usaría (frases
   distintas si es un comando de voz, valores negativos/vacíos/al límite si es
   un formulario, dos pestañas a la vez si es un guardado, etc.), no solo probar
   el ejemplo obvio. La mayoría de los bugs reales de este proyecto salieron de
   acá: una regex demasiado angosta, un campo sin `Math.max(0,...)`, un
   `isOwnerOrLegacy()` que resultó ser un no-op para una colección que nunca
   tuvo el campo `authUid`.

3. **Verificar de VERDAD, no "debería funcionar".** Antes de dar algo por
   arreglado: `node --check` para sintaxis, y siempre que se pueda, ejecutar la
   función real en el navegador (Browser pane) con datos de prueba —
   interceptando `fetch`/`db.collection` cuando hace falta simular Firestore —
   y leer el resultado real, no asumirlo. Si de verdad no se puede probar (ej.
   sensores de un teléfono real, GPS en movimiento, una prueba de caída física),
   decirlo explícitamente en la bitácora en vez de fingir que se probó. Sesión 1
   hizo esto bien en v6.37: encontró un hueco real en la detección de caídas y
   **no lo tocó a ciegas** porque tocar seguridad sin poder probar con un
   teléfono real puede empeorarlo — lo dejó anotado en vez de arriesgar.

4. **Cada cambio = versión + deploy + commit + bitácora, siempre los 4.** Ver
   "Sistema de versión" y "Cómo se publica" más abajo. Nunca dejar un cambio sin
   subir la versión o sin desplegar — la mitad de un arreglo es peor que nada,
   porque otra sesión (o Inty) cree que ya está en producción y no lo es.

5. **Documentar CON evidencia, no solo "lo revisé".** Cada entrada de
   `BITACORA.md` debería poder responder: ¿qué se rompía exactamente?, ¿con qué
   frase/dato/condición se reproduce?, ¿cómo se confirmó que el fix funciona?
   Copiar el resultado real de la prueba (aunque sea resumido) vale más que
   "verificado ✅".

6. **Los límites de acceso son del proyecto, no de una sesión.** Ninguna IA
   publica `firestore.rules` en Firebase Console (cambio de control de acceso
   en producción — solo Inty, siempre). Ninguna IA paga nada. Ver
   "🔐 SEGURIDAD" y "🛡️ PROTEGIDO" más abajo para el resto.

**Barrido — estado (actualízalo si seguís de acá):** #1 GPS y navegación, #2
Inicio/Esfera, #3 Mis viajes/Rutas, #4 Diario/Bitácora, #5 Comunidad, #6 Social,
#7 Pistero IA — cerrados. #8 SOS y detección de caídas — cerrado salvo el hallazgo
de seguridad de arriba (necesita teléfono real). #9 Gamificación (Logros, Ranking,
Retos, Wrapped, Tienda de Darma) — cerrado en v6.38 (ver detalle en BITACORA).
Después de #9, sin numeración formal pero mismo criterio, sesión 2 cerró en
orden: **Personalización de personaje** (v6.39: piel/ojos/labios/vello/peinado/
pañoleta nuevos, boca al hablar rehecha, UI por pestañas), **Música** (v6.40:
ducking al arrancar + fuga de blobs), **Novedades + CicloGuía** (v6.41: link
`javascript:` bloqueado, doble-tap en comentarios), **Ajustes** (v6.42: fuga de
wake lock en Ahorro pantalla). Además, fuera de la numeración: escalabilidad de
lecturas Firestore (`count()`) y creación de contenido de comunidad (guards
anti-doble-tap) ya revisados. **Quedan: Admin, base/PWA.**

## 🌐 ¿Se puede sumar a Qwen, Kimi u otro modelo con este mismo protocolo?

Sí, con una condición: ese otro asistente necesita tener el mismo tipo de acceso
que tiene esta sesión de Claude — leer/escribir archivos de este repo, correr
comandos de terminal (`node --check`, `git`, `wrangler`), y probar en un
navegador real. Eso depende de CÓMO Inty lo abra (ej. un CLI/agente de código con
esas herramientas), no de qué tan bueno sea el modelo — un chat normal de Qwen o
Kimi sin acceso a archivos no puede tocar este repo, por más que se le pase este
documento. Ninguna IA (incluida esta) puede "invocar" o coordinarse en vivo con
otro proveedor de IA por su cuenta — no hay una conexión directa entre modelos.
Si Inty quiere sumar otro asistente: abrirlo con acceso a esta carpeta y pegarle
como primer mensaje "lee COORDINACION-IA/LEEME.md completo antes de tocar nada" —
con eso alcanza para que seas cual seas, sigas el mismo protocolo.

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
- **NUNCA** deployes ni subas la **carpeta completa**. Contiene `MI-CLOUDFLARE.txt`, `MI-CLOUDFLARE-IA.txt`, `MI-TOKEN-NETLIFY.txt` (tokens) y **`firebase-service-account.json`** (clave privada de Admin SDK — acceso TOTAL a Firestore/Auth, mucho más grave que los tokens de arriba). Todos están en `.gitignore`, pero **wrangler los sube igual** si deployas la carpeta entera.
- ⚠️ (2026-07-13) Casi se filtra `firebase-service-account.json` en un deploy de sesión 2: el snippet de abajo no lo tenía en la lista de exclusión (no existía cuando se escribió el snippet). Se detectó ANTES de correr `wrangler pages deploy` revisando el listado de la carpeta limpia — no llegó a publicarse. El snippet de abajo ya quedó corregido para excluirlo siempre. **Antes de correr `wrangler pages deploy`, mirá el `ls` de la carpeta limpia una vez más** — no asumas que el snippet de hoy cubre archivos que se agreguen mañana.
- Deploya SIEMPRE desde una **carpeta limpia** con solo archivos web. Snippet listo:
  ```bash
  SRC=.; CLEAN=../lp-deploy
  rm -rf "$CLEAN"; mkdir -p "$CLEAN"; cp -r "$SRC"/* "$CLEAN"/
  rm -f "$CLEAN"/MI-*.txt "$CLEAN"/firestore.rules "$CLEAN"/REGLAS-FIREBASE.txt \
        "$CLEAN"/*.md "$CLEAN"/package.json "$CLEAN"/capacitor.config.json \
        "$CLEAN"/firebase-service-account.json
  rm -rf "$CLEAN"/scripts "$CLEAN"/concepts "$CLEAN"/COORDINACION-IA "$CLEAN"/node_modules \
         "$CLEAN"/worker-auth "$CLEAN"/worker-ia "$CLEAN"/.wrangler
  ls "$CLEAN"   # revisar a ojo antes de deployar — ningún .json de credenciales, ningún MI-*.txt
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

## 🛡️ PROTEGIDO — funciones ya resueltas que NO se deben romper
Inty reporta que "cosas ya solucionadas" se rompen entre versiones. Antes de commitear, verifica
que estas siguen intactas (si tocas algo cerca, PRUÉBALO). No borrar ni "simplificar" sin avisar:
- **Rastreo con pantalla apagada** → módulo `lpBackgroundGeo` (usa `BackgroundGeolocation.addWatcher` con notificación) + `lpWakeLock`. Se llama en `toggleGPS` y `calculateAndStartNavigation`. OBLIGATORIO en el APK. (El APK debe traer el plugin — ver PENDIENTES.)
- **Anti recálculo falso** → `verificarDesviacion` mide contra TODA la ruta (`rutaLatLngs`) con `_distPuntoASegmento`, NO solo el paso actual.
- **Freno anti-loop del recálculo rural** (cooldown 22s / 4 fixes / backoff 3min).
- **Pausa manual** (`viajePausaManual` / `togglePausaViaje`) que congela km/tiempo.
- **Variantes fonéticas** en `geocodeDestino` (voz "Kiman"→"Quimán").
- **Chat Pistero** `v-pistero` (actúa/te conoce/chips) y el mic nativo wireado.
- **Video 3D** estable (mira adelantada + topográfico) y **frases/bromas** (`bromasDelCamino`).
Regla de oro: si vas a cambiar una de estas, primero léela completa y deja la mejora, no el reemplazo.

## 📂 Archivos de esta carpeta
- `LEEME.md` — esto (reglas y estado).
- `BITACORA.md` — registro de cambios por fecha/versión.
- `PENDIENTES.md` — tareas por hacer y de quién es cada una.
