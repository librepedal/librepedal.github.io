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
| `fix/perfil-volver-modal-roto` | Botón "Volver" muerto en el modal de perfil + deep link `?perfil=` | ✅ **Resuelto**: el Volver entró a `main` en v8.801 (PR #21, 2026-10-03); el deep link ya estaba. Borrar. |
| `google-signin-nativo` | Google Sign-In nativo (saca link mágico) | **Superada**: `main` ya trae la vía nativa (`auth.js`, `lpPlugin('FirebaseAuthentication')`) + ingreso por código. Lo distinto que queda en la rama es la versión vieja de agosto. Borrar. |
| `wip/modo-conduccion-resena` | Modo conducción + reseña de la app (WIP) | **Superada**: `main` ya tiene `modo-auto` (14 usos), `.nav-lap-row`, la UI de reseña (`resena-app.js`) y la regla `resenasApp` en `firestore.rules`. Borrar. |
| `fix/auth-idtoken-gate-testers` | `worker-auth`: gate de testers en la vía idToken | **Superada**: el mismo chequeo ya está en `main` (`worker-auth/worker.js`, bloque `if (!env.TESTERS_PERMITIDOS)` de la vía idToken). Borrar. |
| `feature/testers-kv-migracion` | `worker-auth`: lista de testers en KV en vez de secreto plano | **Único trabajo vivo de valor.** NO está en `main`. Permite que Inty agregue testers desde el dashboard de Cloudflare sin re-pegar la lista. Necesita: confirmar que el namespace KV `7936d9…` existe y tiene los correos cargados, y desplegar el Worker a mano (`wrangler deploy` en `worker-auth/`, no lo hace el CI). Solo vale si la app sigue en prueba cerrada. |
| `feature/pistero-escena-cinematica` | Escena al hablar Pistero (35 líneas CSS/HTML) | **No mergear así.** Oscurece y desenfoca TODA la pantalla (velo + `backdrop-filter`) cada vez que Pistero habla, también durante la navegación → tapa el mapa mientras se pedalea. Si se retoma: excluir `#nav-screen` activo o sacar el velo. Sin mockup aprobado. |
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
