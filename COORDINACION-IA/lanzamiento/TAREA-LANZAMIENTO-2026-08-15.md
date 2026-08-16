# TAREA CERRADA — Lanzamiento (v8.51) — verificado en vivo 2026-08-14

**Para:** cualquier sesion/cuenta de Claude que trabaje este repo.
**Cerrada:** 2026-08-14 por la sesion Claude Code (cuenta lenovo), verificacion directa.
**Estado:** ✅ v8.51 ya esta en produccion. No queda nada pendiente de esta tarea.

---

## Por que se cierra (verificado ahora mismo, no supuesto)
```bash
curl -s https://librepedal.cl/version.txt   # -> 8.51
grep APP_VERSION index.html                 # -> 8.51 (main)
gh secret list --repo librepedal/librepedal.github.io
# -> CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN presentes
```
`main` y produccion coinciden. El CI de deploy (que otra entrada de esta tarea reporto
roto por secrets faltantes) ya fue reparado antes de hoy y quedo confirmado funcionando.

## ⚠️ Si vas a desplegar algo DESPUES de esto, lee esto primero
Las instrucciones viejas de esta tarea (mas abajo, tachadas) decian "corre
`bash deploy-seguro.sh` a mano con tu token". **Eso ya NO aplica.** Con el `CLAUDE.md`
nuevo (raiz del repo, léelo — reglas de coordinacion obligatorias entre las 2 cuentas):

- El deploy es **automatico**: se dispara solo al mergear una rama a `main`
  (`.github/workflows/deploy-cloudflare.yml`).
- `deploy-seguro.sh` ahora **bloquea la corrida manual a proposito** (guardian anti-trampa
  agregado hoy, commit `217d569`) — si lo corres a mano fuera de CI, sale `exit 1` con un
  mensaje explicando por que. Es intencional, no un bug.
- Para publicar algo nuevo: trabaja en una rama (`feature/...`), pushea, consigue el ✓ de
  Inty, y recien ahi mergea a `main`. El merge mismo dispara el deploy (~40s). Ver
  `CLAUDE.md` para el flujo completo.

## ~~Instrucciones viejas (ya no aplican, quedan solo como registro historico)~~
~~Desplegar la version de lanzamiento v8.51 (pulido de UI) a produccion... solo falta el
token de Cloudflare + correr el script `deploy-seguro.sh` a mano...~~ — superadas por el
hallazgo de que el CI ya estaba arreglado y por el nuevo guardian anti-deploy-manual.

---
### Bitacora de esta tarea
- [x] 2026-08-14, sesion Claude Code (lenovo): verificado en vivo que v8.51 == produccion,
      CI con secrets OK. Tarea cerrada, sin trabajo pendiente. Nota agregada sobre el
      nuevo guardian de `deploy-seguro.sh` para que nadie se sorprenda con el `exit 1`.
