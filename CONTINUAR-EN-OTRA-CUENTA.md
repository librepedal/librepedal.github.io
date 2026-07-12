# Prompt de continuidad — Libre Pedal

Pega esto tal cual al abrir la nueva conversación de Claude.

---

Estoy construyendo **Libre Pedal**, una app web (PWA) + app nativa Android para cicloviajeros, nacida en Chile con la meta de ser **la mejor app del mundo para ciclistas/cicloviajeros**. El proyecto está en `C:\Users\intyr\Downloads\LibrePedal` (repo git local, todo commiteado y limpio).

## Qué es y cómo funciona
- Un solo archivo principal: `index.html` (todo: HTML+CSS+JS, sin build step, ~280KB).
- `sw.js` = service worker (offline). `version.txt` = versión visible en la app (debe coincidir con `APP_VERSION` dentro de `index.html`).
- Personaje/asistente: **Pistero**, habla por voz (SpeechRecognition + TTS), con humor chileno.
- Lanzador principal: una **esfera de apps 3D** (`abrirEsfera()`) tipo DNA launcher, con fondo de postales de Chile (rotan cada 3s) o un fondo espacial desbloqueable con Darma (moneda interna).
- Navegación real: geocodifica con Nominatim, rutea con OSRM (perfil ciclista), clima real con Open-Meteo por cada parada del viaje.
- Gamificación: Darma, logros, ranking, tienda de skins/cascos/accesorios.
- Comunidad: reportes en el mapa, CicloGuía (hostales/recomendaciones), "Te doy alojo", chat, diario personal, **votación de comunidad + sorteo que se desbloquea a los 5.000 usuarios**.
- App nativa Android via Capacitor (GPS en segundo plano, TTS nativo), compilada en la nube con GitHub Actions (`.github/workflows/build-apk.yml`).

## Cómo se despliega (producción real)
Sitio en vivo: **https://librepedal.pages.dev** (Cloudflare Pages, cuenta con token en `MI-CLOUDFLARE.txt`, NO subir ese archivo a git, ya está en `.gitignore`).

Proceso de deploy (repetir cada vez que se sube una versión):
```bash
# 1. Bump version.txt, APP_VERSION en index.html, y CACHE en sw.js (todos +1)
# 2. Copiar SOLO estos archivos a una carpeta limpia (NUNCA la carpeta completa, tiene tokens):
#    index.html sw.js manifest.json icon-192.png icon-512.png version.txt como-funciona.html _headers logo.jpg
#    (además: seguir.html privacidad.html terminos.html bienvenida.html logo-transparent.png)
#    (si agregas un archivo nuevo referenciado en index.html, agrégalo TAMBIÉN aquí y al
#    array CORE en sw.js — si no, queda roto en producción aunque funcione en local)
# 3. Deploy:
source <(cat MI-CLOUDFLARE.txt)   # exporta TOKEN y ACCOUNT_ID
export CLOUDFLARE_API_TOKEN="$TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
npx --yes wrangler pages deploy <carpeta_limpia> --project-name=librepedal --commit-dirty=true
# 4. Verificar: curl -s https://librepedal.pages.dev/version.txt
# 5. git add + commit (nunca --amend, siempre commit nuevo)
```
Netlify (`MI-TOKEN-NETLIFY.txt`) está roto (sin permiso de deploy) — usar Cloudflare, no Netlify.

## Estado actual: v5.46, todo commiteado, pusheado a GitHub y en producción (Cloudflare Pages)

**Sesión 2026-07-08 (continuación)**: firestore.rules real (por-colección, no las abiertas de emergencia) ya quedó publicada en la consola de Firebase — votación de comunidad, sorteo, amigos, mensajes privados, diario y "te doy alojo" ya escriben de verdad (antes daban permission-denied en escritura). **Sentry conectado y probado en vivo** (org `librepedal-gs` en Sentry, proyecto `javascript`, Loader Script en el `<head>` de index.html — confirmado que manda eventos reales al endpoint de ingesta). Además: arreglado el bug de "combinar rutas" que dibujaba una línea recta uniendo rutas de lugares distintos (ahora cada ruta es su propia polilínea), agregado acceso visible a "Mis Rutas" (antes solo se llegaba por voz), el radar de "Ciclistas" ahora centra primero en la ubicación real del usuario en vez de hacer zoom out al mundo entero, agregada una capa de mapa topográfico (OpenTopoMap) alternable para ver caminos rurales/senderos que el estilo de calles no dibuja, ajustada la votación de comunidad (se sacó "mapear rutas" y "refugios", se agregó "apoyo a deportistas ciclistas", se aclaró que el sorteo es 2 veces al año una vez desbloqueado a los 5.000 usuarios suscritos), y eliminado `sonidoSwipe()` (código muerto).

**Pendiente de la cuenta de Google del usuario (urgente, no lo puedo hacer yo)**: activar verificación en 2 pasos (MFA) antes del **11 de julio de 2026** o pierde acceso a la consola de Firebase.

---

## Estado anterior: v5.40

Hecho hasta ahora (sesiones del 2026-07-06 al 2026-07-08): esfera 3D con fondo de postales/espacial y **logo real de Libre Pedal en el núcleo** (sin anillo blanco, aura que respira al ritmo del latido), tutorial corregido y sincronizado exacto con la voz, rueda de carga con textura real, clima real por cada parada de la ruta Y al poner un destino (antes de salir), calculadora de gastos que auto-calcula los km reales de la ruta (OSRM), GPS nativo conectado a la navegación turn-by-turn, `authUid` real de Firebase Auth guardado en paralelo (aditivo), Comunidad con votación real + sorteo transparente al llegar a 5.000, Planificador por presupuesto, sección "Libre Pedal Pro" honesta, **mapa offline real** (botón "Descargar mapa de la ruta", cache de mosaicos independiente que sobrevive a actualizaciones), **persistencia offline de Firestore activada** (crítico: antes se podían perder viajes grabados sin señal), ritmo lento/normal/rápido **adaptativo a la ruta** (ya no umbrales fijos: se adapta solo a subidas/bajadas), ciclistas ficticios eliminados del mapa, exportación de usuarios (admin) simplificada a solo Nombre+Email, **sonido de cadena rehecho** (trinquete de piñón libre realista, velocidad variable, coast al soltar), **motor de audio atmosférico con reverb compartido**, **sonido táctil global** (sonidoTap + vibración corta en casi todos los botones), **rebranding cyan→naranja** (#fc4c02, a tono con el logo real) en toda la app, botones con gradientes y feedback táctil `:active`, **anécdotas 100% reales vía Wikipedia geolocalizada** (si no hay dato real cercano, Pistero se queda callado, nada inventado), bromas del camino ahora también suenan durante la navegación turn-by-turn (antes solo en GPS libre), **GPS automático sin botón manual** (se quitó el botón 📍 GPS del dashboard; modo fantasma es el único control de privacidad; la app pide permiso de GPS y micrófono apenas inicias sesión), **rutas con guardado local-first** (`localStorage` primero — garantizado —, Firebase como respaldo best-effort; sobrevive sin señal), **cierre automático de ruta por inactividad** (tras 12 min sin moverte la ruta actual se guarda y se da por terminada; al seguir pedaleando arranca una ruta nueva, en vez de un solo trazo interminable de todo el día), y **arreglo del cálculo de velocidad para GPS nativo** (el plugin en 2° plano manda fixes por distancia cada 8m, no por tiempo; con poco movimiento no juntaba los 4 puntos que pedía la ventana de 10s y la velocidad quedaba pegada en 0 — por eso no sonaban las bromas de lento/normal/rápido; ahora hace fallback a 2 puntos).

**Workflow de compilación del APK restaurado** (2026-07-06): se había desactivado por completo en algún punto (quedó un placeholder "no-op" en `build-apk.yml`). Se restauró el flujo completo. Link de descarga directo y fijo (se actualiza solo en cada push a main):
**https://github.com/librepedal/librepedal.github.io/releases/download/latest-apk/app-debug.apk**

**Aviso de sesión (2026-07-08)**: la red local tuvo un corte intermitente de HTTPS hacia GitHub específicamente (Cloudflare sí respondía) — se resolvió solo tras reintentar. Si vuelve a pasar y no hay Docker Desktop abierto (ver nota de Docker más abajo), probablemente sea solo intermitencia de red, reintentar con más tiempo antes de asumir que algo está mal configurado.

## Pendiente — en orden de prioridad (así lo dejamos acordado)

1. **Seguir probando en celulares reales con varios ciclistas** (gratis, lo más urgente). El usuario ya probó una vez y encontramos bugs reales que en el navegador de escritorio no se notaban (desfase de scroll/voz en el tutorial, ya corregido en v5.18; bug de velocidad con GPS nativo, corregido en v5.40). Va a seguir pasándole la app a más ciclistas.
2. ~~Pegar firestore.rules~~ y ~~Sentry~~ — **ya hechos** (sesión 2026-07-08, ver arriba).
3. **Voz offline de verdad**: SE INVESTIGÓ (2026-07-06) y se decidió NO hacerla por ahora. El plugin obvio (`@capacitor-community/speech-recognition`) se revisó a nivel de código fuente real y NO activa el modo on-device de Android — instalarlo no habría resuelto nada, sigue dependiendo de internet igual que hoy. La alternativa real (motor Vosk embebido) implica +40-50MB de APK, peor precisión y un plugin nativo desde cero — el usuario prefirió no pagar ese costo. En su lugar se implementó un fallback honesto: si el reconocimiento de voz falla por falta de señal, la app te lleva directo a escribir el destino a mano (v5.20). No re-investigar esto sin que cambien las circunstancias (ej. si aparece un plugin Capacitor que sí exponga on-device recognition).
4. **Reemplazar Nominatim/OSRM públicos** por algo con SLA (LocationIQ/Geoapify para geocoding, GraphHopper/OpenRouteService o self-host para ruteo) — recién cuando tengamos ~100-200 usuarios activos regulares, hoy los servicios públicos gratuitos alcanzan pero no escalan.
5. **Migrar identidad completa a `auth.uid`** (hoy es aditivo, falta terminar la migración para reglas de Firestore realmente por-dueño).
6. **Distribución real**: Google Play (US$25 único) y evaluar iOS (Apple US$99/año + necesita Mac o CI tipo Codemagic) — hoy solo hay APK sideload.
7. **Monetización real** (Stripe/Mercado Pago) cuando se decida activar Pro de verdad.
8. **Multi-idioma**: el usuario preguntó y confirmó que hoy la app (incluido el tutorial) está solo en español — queda marcado como pendiente a futuro, no se aborda por ahora.

## Cómo prefiero trabajar (importante)
- Modo autónomo: actuar de punta a punta, avisar pero no pedir permiso para cambios de código — **excepto** pagos, cuentas de terceros, acciones irreversibles o decisiones de negocio reales, ahí sí hay que consultarme primero.
- Antes de cambios de diseño/estética grandes, mostrar una referencia visual o pre-diseño para aprobar antes de aplicar.
- Siempre verificar en el navegador (preview) antes de dar algo por terminado, y avisar si algo no se pudo probar (ej. dispositivo real).
- Ir acumulando cambios verificados y desplegar cuando se junten varios, no uno por uno innecesariamente.
- Prefiero la opción profesional/permanente sobre el atajo, siempre que siga siendo gratis (evitar pagar salvo que ya lo hayamos hablado y decidido).
