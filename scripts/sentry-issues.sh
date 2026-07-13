#!/usr/bin/env bash
# Lee los errores REALES que Sentry capturó de los usuarios, para que Claude los arregle.
# Necesita el archivo MI-SENTRY.txt en la raíz del proyecto con estas 3 líneas:
#   TOKEN=...      (Auth Token de Sentry con permisos project:read + event:read)
#   ORG=...        (slug de tu organización en Sentry, ej: libre-pedal)
#   PROJECT=...    (slug del proyecto, ej: libre-pedal o javascript)
#
# Cómo crear el token: sentry.io -> Settings -> Account -> Auth Tokens -> Create New Token
# (permisos project:read y event:read). Es solo lectura: no puede borrar ni cambiar nada.

set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
F="$DIR/MI-SENTRY.txt"
[ -f "$F" ] || { echo "Falta MI-SENTRY.txt (TOKEN, ORG, PROJECT). Ver instrucciones arriba."; exit 1; }
TOKEN=$(grep '^TOKEN=' "$F" | cut -d= -f2- | tr -d '\r\n ')
ORG=$(grep '^ORG=' "$F" | cut -d= -f2- | tr -d '\r\n ')
PROJECT=$(grep '^PROJECT=' "$F" | cut -d= -f2- | tr -d '\r\n ')

echo "=== Errores sin resolver (últimos 14 días) — Libre Pedal ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://sentry.io/api/0/projects/$ORG/$PROJECT/issues/?query=is:unresolved&statsPeriod=14d&limit=30" \
| python -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('Respuesta inesperada. Revisa TOKEN/ORG/PROJECT en MI-SENTRY.txt.'); sys.exit(0)
if isinstance(d, dict) and d.get('detail'):
    print('Sentry:', d['detail']); sys.exit(0)
if not d:
    print('Sin errores sin resolver. Todo limpio.'); sys.exit(0)
for i in d:
    veces = i.get('count', '?')
    users = (i.get('userCount') or 0)
    title = i.get('title', '')
    culprit = i.get('culprit') or ''
    last = (i.get('lastSeen') or '')[:16].replace('T', ' ')
    print(f\"[{veces}x · {users} usuarios · {last}] {title}\")
    if culprit: print(f'    en: {culprit}')
"
