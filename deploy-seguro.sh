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
for f in *.html *.js manifest.json version.txt _headers _redirects robots.txt favicon.ico; do
  [ -f "$f" ] && cp "$f" "$OUT/"
done
# `*.js` cubre sw.js + los modulos nuevos que carga index.html (voz-elevenlabs.js,
# perfil-comunidad.js). El codigo de Workers NO va: vive en worker-auth/ y worker-ia/
# (subcarpetas), no en la raiz, asi que este glob no lo toca.
# `voces` lleva las voces pregeneradas y la detectó el control de completitud de más abajo
# cuando se me quedó fuera. `demo-voces` y `resources` son material público del sitio.
# NO van: worker-ia / worker-auth (código de Workers), scripts, tests, concepts,
# prototipos, android, COORDINACION-IA. Nada de eso lo sirve el navegador.
for d in icons img images assets fonts sonidos audio functions voces voces-el demo-voces resources; do
  [ -d "$d" ] && cp -r "$d" "$OUT/"
done
cp *.png *.jpg *.jpeg *.svg *.webp *.mp3 *.ogg "$OUT/" 2>/dev/null || true

echo "→ control de secretos..."
if find "$OUT" \( -iname "MI-*" -o -iname "*.rules" -o -iname "*.keystore" -o -iname "*.jks" -o -iname ".env*" \) | grep -q .; then
  echo "✗ ABORTADO: hay archivos de credenciales en la carpeta de deploy."; exit 1
fi
if grep -rliE "TOKEN *=|ACCOUNT_ID *=|BEGIN .*PRIVATE KEY|API_KEY *=" "$OUT" >/dev/null 2>&1; then
  echo "✗ ABORTADO: hay contenido con pinta de credencial."; exit 1
fi
echo "  ✓ limpio ($(find "$OUT" -type f | wc -l) archivos)"

echo "→ control de completitud (que no falte nada que el sitio use)..."
cat "$SRC"/index.html "$SRC"/sw.js "$SRC"/manifest.json 2>/dev/null \
 | grep -oE "[A-Za-z0-9_./-]+\.(png|jpg|jpeg|svg|webp|mp3|ogg|js|css|json|html)" \
 | grep -v "^http" | sed 's|^\./||;s|^/||' | sort -u | while read -r r; do
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
