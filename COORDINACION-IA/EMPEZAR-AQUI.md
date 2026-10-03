# 🚀 EMPEZAR AQUÍ — cualquier cuenta Claude que retome LibrePedal

Punto de entrada único. **Actualizado 2026-10-03** (sesión en el computador `LAPTOP-PIC7DDFN`
de Inty, cuenta `intyrivera.a`). Todo lo de abajo está **verificado contra git y producción
ese día**, no copiado de notas viejas. Si lees esto mucho después, re-verifica con el latido.

> ⚠️ `PENDIENTES.md`, `BITACORA.md` y el resto de esta carpeta tienen MUCHO historial de
> julio/agosto ya resuelto. Úsalos como archivo histórico, no como estado actual.

## 1) Sincroniza SIEMPRE primero (latido)
```bash
git fetch origin && git checkout main && git pull --ff-only origin main
git log --oneline -6 origin/main
curl -s https://librepedal.cl/version.txt     # debe coincidir con version.txt de main
```
Reglas completas en `../CLAUDE.md`: nunca commit directo a `main`; una rama por tarea;
publicar = merge a `main` (deploy automático); nada a `main` sin tests verdes + ✓ de Inty.

## 2) Estado actual (verificado 2026-10-03)
- **Producción = `main` = v8.800** (`0dddf21`, 2026-09-27). `librepedal.cl/version.txt` → `8.800`.
- **Deploy automático FUNCIONA** (`deploy-cloudflare.yml`, último OK 2026-09-27). El aviso
  viejo de "token de Cloudflare roto" (2026-08-15) ya NO aplica. Igual: tras cada merge,
  confirmar con el `curl` de arriba — el job queda verde aunque falte el secreto.
- **App Android:** Capacitor 8.5.2, API 36 (exigencia de Google antes del 1-nov-2026) — ya en
  `main`. Último `.aab` firmado: workflow "Construir AAB firmado" OK el 2026-09-24. La app
  carga `https://librepedal.cl` en vivo (`server.url` en `capacitor.config.json`), así que
  **todo cambio web llega a la app sin pasar por Play**. Solo permisos/plugins/ícono/API
  requieren un `.aab` nuevo.
- **CI verde:** tests + escaneo de secretos.
- **Dependabot** (activado 2026-09-27) abrió 6 PRs de actualización (actions/* y `jose` en
  `worker-auth`) — pendientes de revisar.
- El caché de `sw.js` (`librepedal-vNNNN`) lo reescribe `deploy-seguro.sh` desde `APP_VERSION`
  en cada deploy: que el archivo del repo diga un número viejo es normal.

## 3) Ramas remotas (revisadas 2026-10-03)
De ~40 ramas remotas, **31 ya están 100% contenidas en `main`** (se pueden borrar sin perder
nada). Solo estas tienen commits que NO están en `main`:

| Rama | Qué tiene | Estado / sugerencia |
|---|---|---|
| `fix/perfil-volver-modal-roto` | Botón "Volver" muerto en el modal de perfil + deep link `?perfil=` | Deep link ya en `main`. El botón Volver se rescató en **`fix/perfil-volver-customize`** (rama nueva, 2026-10-03). Borrar la vieja tras mergear. |
| `google-signin-nativo` | Google Sign-In nativo (saca link mágico) | Muy atrasada (377 commits). El login actual es por código. Decidir con Inty si sigue vigente. |
| `wip/modo-conduccion-resena` | Modo conducción + reseña de la app (WIP) | Parte ya está en `main` (`resena-app.js`). Revisar qué falta. |
| `feature/testers-kv-migracion` / `fix/auth-idtoken-gate-testers` | `worker-auth`: lista de testers en KV + gate de idToken | Tocan el Worker de auth (despliegue aparte con wrangler). Revisar con cuidado. |
| `feature/pistero-escena-cinematica` | Escena al hablar Pistero (35 líneas) | UI sin mockup aprobado → no mergear sin ✓ de Inty. |
| `assets/capas-transparentes-*`, `assets/panoletas-piloto-*` | PNG de diseño de Pistero | Solo assets de diseño, "sin aprobar". |
| `reconcile` | `.gitignore` viejo | Obsoleta: `main` ya tiene un `.gitignore` más completo. Borrar. |

## 4) Pendientes reales (los que siguen abiertos de verdad)
- **Necesitan el teléfono de Inty:** umbrales de caídas con caída real; micrófono nativo;
  apertura en frío sin señal (modo avión).
- **Errores de Sentry sin revisar** (lista en `PENDIENTES.md`, sección Sentry): permisos de
  Firebase, MapLibre `isStyleLoaded`, `obtenerFraseUnica`. Requiere `MI-SENTRY.txt`
  (no está en el laptop `LAPTOP-PIC7DDFN`).
- **Progreso de Retos multi-dispositivo** (`calcularProgresoReto` solo suma rutas locales).
- **Idea de producto guardada** (no ejecutar): bitácora física impresa con precio.

## 5) Máquinas
- `LAPTOP-PIC7DDFN` (desde 2026-10-03): clon en `C:\Users\flgan\librepedal`, Git + Node
  instalados ese día. **Sin** archivos `MI-*.txt` (tokens) — no hace falta para cambiar la
  app; el deploy lo hace CI.

— Verifica, toma una tarea, trabaja en rama. 🚴
