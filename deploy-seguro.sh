#!/usr/bin/env bash
# Deploy de Libre Pedal — LA ÚNICA forma correcta de publicar.
#
# Por qué existe: el 2026-07-20 se publicó con `wrangler pages deploy .` desde la carpeta
# del proyecto. Wrangler subió TAMBIÉN los MI-*.txt (tokens de Cloudflare, Sentry, Azure,
# Netlify y los datos del keystore de Play Store), que quedaron públicos en librepedal.cl.
# El .gitignore no protege de esto: wrangler no lo mira. Ya había pasado el 2026-07-11.
#
# Este script arma una carpeta LIMPIA con solo los activos web, verifica que no se cuele
# ningún secreto, y recién ahí publica. Si detecta un secreto, aborta.
set -euo pipefail

# ── Guardián anti-trampa de coordinación ─────────────────────────────────────
# El deploy REAL lo hace SIEMPRE GitHub Actions al hacer push/merge a main
# (.github/workflows/deploy-cloudflare.yml). Desplegar a mano desde una máquina deja
# producción ADELANTE de git (pasó: una cuenta subió 8.35→8.50 sin pushear, y otra
# tuvo que rescatarlo de producción). Para que NO vuelva a pasar, este script se niega
# a correr fuera de CI. Publicar = mergear tu rama a main. Ver CLAUDE.md.
if [ -z "${GITHUB_ACTIONS:-}" ] && [ "${1:-}" != "--forzar-local" ]; then
  echo "✋ Deploy a mano BLOQUEADO (a propósito)."
  echo "   El deploy es AUTOMÁTICO: mergeá tu rama a main y GitHub Actions publica (~40s)."
  echo "   Así producción nunca queda adelante de git. Ver CLAUDE.md."
  echo "   (Emergencia real, publicar a mano: bash deploy-seguro.sh --forzar-local)"
  exit 1
fi
# Si se forzó local, saca el flag para no confundir al resto del script.
[ "${1:-}" = "--forzar-local" ] && shift || true

SRC="$(cd "$(dirname "$0")" && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

echo "→ armando carpeta limpia..."
cd "$SRC"
for f in *.html *.js *.css manifest.json puntos-osm.json version.txt _headers _redirects robots.txt favicon.ico; do
  [ -f "$f" ] && cp "$f" "$OUT/"
done
# `*.js` cubre sw.js + los modulos nuevos que carga index.html (voz-elevenlabs.js,
# perfil-comunidad.js). El codigo de Workers NO va: vive en worker-auth/ y worker-ia/
# (subcarpetas), no en la raiz, asi que este glob no lo toca.
# `*.css` (2026-09-02): estilos.css, el primer CSS que vive suelto en la raiz --
# antes todo el CSS estaba inline en index.html, asi que este glob nunca lo habia
# necesitado. El control de completitud de mas abajo lo habria detectado igual
# (referenciado en index.html, ausente en la carpeta limpia) y abortado el deploy,
# pero mejor cubrirlo directo en vez de depender solo de ese control.
# `voces` lleva las voces pregeneradas y la detectó el control de completitud de más abajo
# cuando se me quedó fuera. `demo-voces` y `resources` son material público del sitio.
# `iconos-modo` (2026-08-22): los 5 PNG de "¿Cómo te mueves?". El control de completitud
# de más abajo NO la habría detectado si faltara: la ruta se arma en JS por concatenación
# ('iconos-modo/'+id+'.png'), así que el regex de esa sección nunca ve la ruta completa
# como un literal. Por eso esta carpeta va explícita acá y no solo confiada a ese control.
# NO van: worker-ia / worker-auth (código de Workers), scripts, tests, concepts,
# prototipos, android, COORDINACION-IA. Nada de eso lo sirve el navegador.
# `.well-known` (2026-08-15): Android App Links necesita `assetlinks.json` servido en
# `/.well-known/assetlinks.json` — al ser carpeta oculta (empieza con punto) no la agarra
# ningún glob de arriba, así que va explícita.
for d in icons img images assets fonts sonidos audio functions voces voces-el demo-voces resources iconos-modo .well-known; do
  [ -d "$d" ] && cp -r "$d" "$OUT/"
done
cp *.png *.jpg *.jpeg *.svg *.webp *.mp3 *.ogg *.mp4 "$OUT/" 2>/dev/null || true

# version.txt SE GENERA desde APP_VERSION, no se copia y ya. index.html siempre dijo
# "el deploy la genera desde aquí", pero era mentira: solo la copiaba, así que bastaba
# olvidarse de editar version.txt a mano para que quedaran distintas. Cuando eso pasa,
# el auto-reparador de index.html cree que hay una versión nueva, desregistra el
# Service Worker, borra cachés y recarga la página EN CADA visita nueva. Pasó de
# verdad el 2026-08-16 (version.txt=8.70 contra APP_VERSION=8.744, varias horas en
# producción). Generándola acá, es imposible que se vuelvan a desincronizar.
_VER="$(grep -oE "APP_VERSION='[0-9][0-9.]*'" "$SRC/index.html" | head -1 | grep -oE "[0-9][0-9.]*")"
if [ -z "$_VER" ]; then
  echo "✗ ABORTADO: no pude leer APP_VERSION de index.html (¿cambió el formato?)."; exit 1
fi
printf '%s' "$_VER" > "$OUT/version.txt"
echo "  ✓ version.txt generada desde APP_VERSION = $_VER"

# El nombre de caché de sw.js (CACHE) también SE GENERA desde APP_VERSION, no se
# copia tal cual. Motivo real (26-ago-2026): quedó pegado en 'librepedal-v8770'
# durante ~15 versiones porque nadie lo tocaba a mano en cada deploy. Como
# iconos-lucide.js y el resto de los recursos propios se sirven cache-first (ver
# fetch() de sw.js), CUALQUIER visitante que ya había cargado la app quedaba
# sirviendo JS viejo PARA SIEMPRE, sin importar cuántos fixes se publicaran
# después -- el activate() de sw.js SÍ borra cualquier caché con nombre distinto
# al actual, pero eso nunca se disparaba porque el nombre nunca cambiaba.
# Generándolo acá, cada deploy fuerza un nombre nuevo y el propio sw.js limpia
# solo la caché vieja de cada visitante en su próxima visita.
_VERCACHE="$(echo "$_VER" | tr -d '.')"
sed -i "s/const CACHE = 'librepedal-v[0-9]*';/const CACHE = 'librepedal-v${_VERCACHE}';/" "$OUT/sw.js"
echo "  ✓ sw.js: caché renombrada a librepedal-v${_VERCACHE} (fuerza limpieza de la caché vieja en cada visitante)"

echo "→ control de secretos..."
if find "$OUT" \( -iname "MI-*" -o -iname "*.rules" -o -iname "*.keystore" -o -iname "*.jks" -o -iname ".env*" \) | grep -q .; then
  echo "✗ ABORTADO: hay archivos de credenciales en la carpeta de deploy."; exit 1
fi
# \b antes de TOKEN/API_KEY: sin esto, cualquier variable normal de JS que
# contenga "token" en camelCase (idToken, authToken, refreshToken...) hacía
# falso positivo -- "idToken=" matcheaba "TOKEN *=" como substring. Con \b
# sigue cachando el patrón real de los MI-*.txt (TOKEN=xxx al inicio de línea
# o tras espacio/comilla), pero ya no una variable de código legítima.
if grep -rliE "\bTOKEN *=|\bACCOUNT_ID *=|BEGIN .*PRIVATE KEY|\bAPI_KEY *=" "$OUT" >/dev/null 2>&1; then
  echo "✗ ABORTADO: hay contenido con pinta de credencial."; exit 1
fi
echo "  ✓ limpio ($(find "$OUT" -type f | wc -l) archivos)"

echo "→ control de completitud (que no falte nada que el sitio use)..."
# El escaneo saca CUALQUIER cosa con pinta de nombre de archivo, incluidas las que
# aparecen dentro de COMENTARIOS. El 2026-08-16 el deploy se cayó porque un comentario
# de index.html nombraba `scripts/generar-enlaces-acceso.js`: el control lo tomó como
# un recurso que la web necesita y abortó al no encontrarlo en la carpeta limpia —
# cuando en realidad `scripts/` NO se publica nunca, a propósito. Se filtran acá las
# carpetas que jamás van al deploy, así nombrarlas en un comentario deja de romper la
# publicación (le habría pasado igual a cualquiera que documentara una ruta interna).
cat "$SRC"/index.html "$SRC"/sw.js "$SRC"/manifest.json 2>/dev/null \
 | grep -oE "[A-Za-z0-9_./-]+\.(png|jpg|jpeg|svg|webp|mp3|ogg|mp4|js|css|json|html)" \
 | grep -v "^http" | sed 's|^\./||;s|^/||' \
 | grep -vE "^(scripts|worker-ia|worker-auth|android|tests|concepts|prototipos|node_modules|COORDINACION-IA|senuelos|señuelos)/" \
 | sort -u | while read -r r; do
    [ -z "$r" ] && continue
    if [ ! -e "$OUT/$r" ] && [ -e "$SRC/$r" ]; then echo "✗ ABORTADO: falta $r"; exit 1; fi
  done
echo "  ✓ completo"

TOK="$(grep -oE '[A-Za-z0-9_-]{35,}' "$SRC/MI-CLOUDFLARE.txt" | head -1)"
ACC="$(grep -oE 'ACCOUNT_ID *= *[a-f0-9]{32}' "$SRC/MI-CLOUDFLARE.txt" | grep -oE '[a-f0-9]{32}' | head -1)"
ACC="${ACC:-024bc85be759cbf54b131202a0a1d183}"

# Señuelos: archivos SIN contenido publicados en las rutas que quedaron expuestas el
# 2026-07-20, para desalojar la caché de borde (s-maxage 7 días) sin permiso de Zona:
# si la ruta existe como activo del deploy, Cloudflare la revalida; si NO existe, el
# borde sigue devolviendo lo viejo hasta que expire. Van DESPUÉS de los controles a
# propósito: se llaman MI-* y el control de secretos, con razón, los rechazaría.
if [ -d "$SRC/señuelos" ]; then
  cp "$SRC/señuelos"/* "$OUT/"
  echo "  ✓ señuelos puestos (desalojan la caché del incidente 2026-07-20)"
fi

echo "→ publicando..."
cd "$OUT"
CLOUDFLARE_API_TOKEN="$TOK" CLOUDFLARE_ACCOUNT_ID="$ACC" \
  npx wrangler pages deploy . --project-name=librepedal --branch=main --commit-dirty=true

echo "→ verificando que los secretos NO estén públicos..."
sleep 10
for f in MI-CLOUDFLARE.txt MI-SENTRY.txt MI-KEYSTORE-PLAYSTORE.txt; do
  b=$(curl -s --max-time 30 "https://librepedal.cl/$f" -o /dev/null -w "%{size_download}")
  if [ "$b" -lt 100000 ]; then echo "  ⚠ $f devuelve $b bytes (debería ser el fallback de ~785 KB). Revisar."; fi
done
echo "✓ listo"
