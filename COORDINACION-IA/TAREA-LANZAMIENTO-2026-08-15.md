# TAREA ABIERTA — Desplegar el LANZAMIENTO (v8.51) — la toma CUALQUIER cuenta

**Para:** cualquier sesion/cuenta de Claude que trabaje este repo.
**Creada:** 2026-08-14 por la sesion Claude Code (cuenta de hoy).
**Urgencia:** ALTA — **Inty lanza Libre Pedal el 2026-08-15 (manana).**

---

## La tarea, en una linea
Desplegar la version de lanzamiento **v8.51** (pulido de UI) a produccion. Todo esta
listo y verificado; **solo falta el token de Cloudflare + correr el script.**

## Quien la puede tomar
Cualquier cuenta que tenga **`MI-CLOUDFLARE.txt`** (el token de Cloudflare Pages). Esta
maquina/cuenta NO lo tiene, por eso queda como tarea abierta. Si lo tienes, es tuya:
tomala, deja "OCUPADO" en `EN-USO.md`, despliega, y confirma aqui abajo.

## Que YA esta listo (no rehacer)
- **Codigo de lanzamiento = v8.51** (pulido Fase A: botones, insignia Darma moneda, logros
  medalla). En GitHub (main). Base v8.50 traida de produccion (catch-up commit 9ff1b18).
- **Verificado SIN errores colaterales**: `node validate.js index.html` = 0 errores; cargado
  en navegador (localhost) = la app arma toda su UI, sin SyntaxError ni "X is not defined";
  version viva confirmada 8.51 por JS; sin IDs duplicados; CRLF preservado.
- **`deploy-seguro.sh` arreglado y probado en seco** (dry run): copia `*.js`
  (voz-elevenlabs.js, perfil-comunidad.js) + `voces-el/`; bundle de 2387 archivos; controles
  de secretos y completitud OK; no se cuela ni `MI-*`, ni `disenos-ui`, ni worker code.

## Pasos para tomar la tarea
```bash
cd C:\Users\intyr\Downloads\LibrePedal   # o tu copia
git pull                                  # trae v8.51 + el deploy-seguro.sh arreglado
# poner tu token en MI-CLOUDFLARE.txt (una linea con el token; ACCOUNT_ID tiene fallback en el script)
bash deploy-seguro.sh                      # arma bundle limpio, publica, y verifica que los secretos NO queden publicos
curl -s https://librepedal.cl/version.txt  # debe decir 8.51
```
Si `MI-CLOUDFLARE.txt` no existe/expiro: generar token nuevo en Cloudflare (My Profile ->
API Tokens -> Create Token -> permiso "Cloudflare Pages: Edit").

## Al terminar
- Confirma el resultado en este archivo y en `EN-USO.md` (deja el candado LIBRE).
- Anota en `BITACORA.md`.
- Avisa que la version viva quedo en 8.51 para que Inty la pruebe en el telefono.

## Regla de oro (Inty)
CERO errores colaterales. Si algo no calza al desplegar, PARA y avisa aqui — no fuerces.
Y de aca en adelante: **pushea a git cada version** (no solo desplegar), para no divergir.

---
### Bitacora de esta tarea (quien la toma escribe aqui)
- [ ] (pendiente de tomar)
