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
#    index.html sw.js manifest.json icon.svg version.txt como-funciona.html _headers
# 3. Deploy:
source <(cat MI-CLOUDFLARE.txt)   # exporta TOKEN y ACCOUNT_ID
export CLOUDFLARE_API_TOKEN="$TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
npx --yes wrangler pages deploy <carpeta_limpia> --project-name=librepedal --commit-dirty=true
# 4. Verificar: curl -s https://librepedal.pages.dev/version.txt
# 5. git add + commit (nunca --amend, siempre commit nuevo)
```
Netlify (`MI-TOKEN-NETLIFY.txt`) está roto (sin permiso de deploy) — usar Cloudflare, no Netlify.

## Estado actual: v5.16, todo commiteado y en producción

Hecho recientemente (sesión del 2026-07-06): esfera 3D con fondo de postales/espacial, tutorial corregido (ya no tapa elementos, texto por paso, se muestra solo el aviso de volumen que desaparece solo), sonido de apertura cálido (acorde en Sol con eco, antes era un zap eléctrico "8-bit"), rueda de carga con textura real, clima real por cada parada de la ruta (no solo la última), calculadora de gastos que auto-calcula los km reales de la ruta (OSRM), GPS nativo conectado a la navegación turn-by-turn (antes solo usaba la API web que se corta con pantalla apagada), `authUid` real de Firebase Auth guardado en paralelo al id legado por email (aditivo, no rompe nada), Comunidad con votación real + sorteo transparente al llegar a 5.000, Planificador por presupuesto (usa datos reales de hostales/recomendaciones de la comunidad), sección "Libre Pedal Pro" honesta (marcada "muy pronto", sin pasarela de pago aún), y **mapa offline real**: botón "Descargar mapa de la ruta" que precachea los mosaicos de la ruta calculada (zoom 13-16) para andar sin señal — el cache de mosaicos (`librepedal-tiles`) ahora es independiente del cache de la app y sobrevive a las actualizaciones de versión (antes se borraba todo con cada deploy, un bug real que afectaba justo el caso de uso de cicloturismo).

## Pendiente — en orden de prioridad (así lo dejamos acordado)

1. **Probar en un celular real, ahora con varios ciclistas** (gratis, lo más urgente). El usuario va a pasarle la app a varios ciclistas para que la prueben en condiciones reales — nunca se ha verificado GPS con pantalla apagada, voz nativa, el APK, ni el mapa offline recién agregado, en un dispositivo real.
2. **Pegar `firestore.rules` actualizado en la consola de Firebase** — sin esto, la votación de comunidad y el sorteo fallan con permission-denied (el resto de la app funciona igual). El archivo ya está listo en el repo.
3. **Sentry** (monitoreo de errores) — gratis hasta 5.000 errores/mes. Requiere crear la cuenta (email) — no lo pude hacer yo mismo, necesita que el usuario la cree.
4. **Voz offline de verdad** (sin depender de internet) — sigue pendiente, es trabajo de desarrollo nativo (Android) más grande, no se alcanzó a hacer en esta sesión.
5. **Reemplazar Nominatim/OSRM públicos** por algo con SLA (LocationIQ/Geoapify para geocoding, GraphHopper/OpenRouteService o self-host para ruteo) — recién cuando tengamos ~100-200 usuarios activos regulares, hoy los servicios públicos gratuitos alcanzan pero no escalan.
6. **Migrar identidad completa a `auth.uid`** (hoy es aditivo, falta terminar la migración para reglas de Firestore realmente por-dueño).
7. **Distribución real**: Google Play (US$25 único) y evaluar iOS (Apple US$99/año + necesita Mac o CI tipo Codemagic) — hoy solo hay APK sideload.
8. **Monetización real** (Stripe/Mercado Pago) cuando se decida activar Pro de verdad.

## Cómo prefiero trabajar (importante)
- Modo autónomo: actuar de punta a punta, avisar pero no pedir permiso para cambios de código — **excepto** pagos, cuentas de terceros, acciones irreversibles o decisiones de negocio reales, ahí sí hay que consultarme primero.
- Antes de cambios de diseño/estética grandes, mostrar una referencia visual o pre-diseño para aprobar antes de aplicar.
- Siempre verificar en el navegador (preview) antes de dar algo por terminado, y avisar si algo no se pudo probar (ej. dispositivo real).
- Ir acumulando cambios verificados y desplegar cuando se junten varios, no uno por uno innecesariamente.
- Prefiero la opción profesional/permanente sobre el atajo, siempre que siga siendo gratis (evitar pagar salvo que ya lo hayamos hablado y decidido).
