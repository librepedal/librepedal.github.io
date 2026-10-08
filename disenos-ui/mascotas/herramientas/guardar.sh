#!/bin/sh
# Copia una captura de Claude in Chrome (por nombre de archivo) a una ruta corta y la recorta con recortar.ps1.
# Uso: sh guardar.sh <archivo-blob.jpg> <nombre-gemini> <nombre-galeria> [X Y W H]
f=$(find /c/Users/flgan/.claude/projects -name "$1" 2>/dev/null | head -1)
[ -z "$f" ] && { echo "no encontré $1"; exit 1; }
mkdir -p "$TEMP/cap" && cp "$f" "$TEMP/cap/$2.jpg"
X=${4:-128}; Y=${5:-7}; W=${6:-1024}; H=${7:-572}
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$(dirname "$0")/recortar.ps1")" -Captura "$(cygpath -w "$TEMP/cap/$2.jpg")" -Nombre "$2" -Galeria "$3" -X $X -Y $Y -W $W -H $H
