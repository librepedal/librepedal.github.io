# 🔴 TRASPASO 2026-10-04 (tarde) — LEER PRIMERO

Escrito por la cuenta Claude de la máquina **flgan** al cerrar la sesión de Pistero. Inty pidió
"deja todo listo para que lo vea otra cuenta, porque hay varios errores". Aquí está todo.

## 1. Qué está en producción ahora
- `librepedal.cl` = **8.805**, `main` @ `f5c2e0d` (publicado por Inty a mano: el modo automático de Claude
  Code bloquea a Claude empujar a `main`, ver §5).
- Entró a producción la rama `feature/pistero-v2-armario` completa (24 commits), con el trabajo de las DOS cuentas:
  armario v2 + tienda (16 pestañas, rarezas, precios, cobro APAGADO `TIENDA_COBRO_ACTIVO=false`), Taller
  (bici, pintura, ruedas, carga, traje, estela, mascotas, inclusión), sonidos, bici de Pistero, sobrevuelo en
  primera persona (Pistero de espaldas, gira la cabeza y reacciona a subidas/bajadas/velocidad/curvas/pausas,
  esqueleto animado), su Pistero en toda la app y en el mapa (otros ciclistas con su `pistOpts`).
- Verificado en el sitio en vivo (archivos servidos): `pistero-tienda.js`, `pistero-bici.js`,
  `pistero-bici-atras.js`, `pistero-sonidos.js` presentes; `sw.js` caché `librepedal-v8805`; suite 46/46.

## 2. Errores que reportó Inty (en su teléfono, después de publicar)
| # | Error | Diagnóstico | Qué hacer |
|---|---|---|---|
| E1 | "No están las skins nuevas ni todo lo que se hizo" | El SITIO sí las tiene (verificado archivo por archivo). El teléfono seguía con la versión guardada. La auto-actualización por `version.txt` + SW necesita cerrar la app del todo y abrirla 1-2 veces (y no actualiza con un viaje en curso). | **Confirmar en el teléfono** que Perfil muestra la tienda nueva tras cerrar/abrir. Si NO aparece después de 2 aperturas → bug real del mecanismo de actualización (`index.html` ~l.1045-1090 y `pwa-wakelock.js`): investigar. |
| E2 | "Le está dando el mensaje antiguo de bienvenida" | La bienvenida nueva está en `feature/bienvenida-fondo` (**sin mergear**). Su propio doc dice que NO está lista (ver §3). | Terminar esa rama (la máquina con `MI-ELEVENLABS.txt`). |
| E3 | "Entró con Google pero se demoró un montón" | En la app de Play el login con Google va por la web (página de Google → vuelta → canje de token en `librepedal-auth` → `signInWithCustomToken` → carga de perfil). El login NATIVO (rápido) está en `fix/google-signin-a-main` y necesita **un AAB nuevo en Play** (plugin `@capacitor-firebase/authentication`), no solo merge. | Medir dónde se va el tiempo (`_lpDbg` en `auth.js` deja marcas) y/o sacar el AAB con el login nativo. Revisar también la espera de 4 s en `Promise.race([window.__lpRedirectListo, …4000])` (`auth.js` ~l.320). |

## 3. Ramas pendientes (revisadas una por una contra `main` con `git cherry`)
| Rama | Estado | Acción |
|---|---|---|
| `fix/integrar-pendientes` (514def9) | ✅ **Lista**: parlante "Escuchar voz" centrado + versión **8.806** (3 lugares). Tests 46/46. | Inty publica: `git -C C:/Users/flgan/librepedal push origin 514def9:main` |
| `feature/bienvenida-fondo` (10 commits) | ❌ Falta: generar voces (`node scripts/gen-voz-bienvenida.js`, 18 mp3, necesita `MI-ELEVENLABS.txt`), **publicar `firestore.rules` en la consola**, probar en teléfono, subir versión. Ver `BIENVENIDA-TEXTO-APROBADO-2026-10-04.md` (en esa rama). | Terminar y probar. **Ojo:** al mergear, rebasar sobre `main` actual (cambió mucho: 8.805/8.806). |
| `fix/pistero-copiloto` (3) | ❌ Su doc dice que espera las voces pregrabadas antes de publicar. 19 archivos (motor-gps, navegación, chat IA…): revisar conflictos con `main` actual. | Terminar junto con las voces. |
| `fix/google-signin-a-main` (3, versión 8.804) | ❌ Necesita AAB nuevo. Su número de versión (8.804) quedó viejo: al mergear, usar la siguiente a la de `main`. | Workflow "Construir AAB firmado" + Play. |
| `fix/perfil-volver-customize` | ✅ Ya estaba en `main` (cherry-pick vacío). | Se puede borrar. |
| `fix/pistero-solo-app` | ✅ El `worker-ia/worker.js` es idéntico a `main`. | Se puede borrar. |
| `deploy/pistero-sobre-prod` | Salió de un `main` viejo; el filtro ya está en `main`. ⚠️ Confirmar que el **worker desplegado** en Cloudflare = `worker-ia/worker.js` de `main` (el worker NO se despliega con el merge). | Verificar y borrar. |
| `feature/ideas-fondo` | ⏸️ Aparcada (Inty dijo que ese pedido fue un error). | No mergear sin preguntarle. |
| `feature/sobrevuelo-camara` | ✅ Ya integrada en `main` (vía la rama de Pistero). | Se puede borrar. |
| `feature/compartir-redes`, `docs/*` | Solo diseños/documentos. | — |

## 4. Para retomar (orden recomendado)
1. Pedirle a Inty que **confirme E1** en el teléfono (cerrar/abrir 2 veces → Perfil). Si sigue viejo → es bug, va primero.
2. Que Inty publique `fix/integrar-pendientes` (8.806). Verificar `version.txt`.
3. Medir y atacar **E3** (login lento) en el flujo web mientras llega el AAB nativo.
4. Terminar `feature/bienvenida-fondo` (E2) y `fix/pistero-copiloto` en la máquina que tiene la clave de ElevenLabs.
5. Probar el **sobrevuelo con una ruta REAL** grabada en el teléfono (solo se probó con rutas sintéticas, incluido ruido de GPS simulado).

## 5. Cosas que conviene saber
- **Claude no puede publicar a `main` en esta máquina**: el clasificador del modo automático bloquea `git push` a
  `main` (producción) y también que Claude se agregue el permiso. Inty publica con el comando de PowerShell
  (`git -C C:/Users/flgan/librepedal push origin <commit>:main`) o agrega `"Bash(git push origin *:main)"` en
  `.claude/settings.local.json`.
- La carpeta `C:\Users\flgan\librepedal` la comparten varias sesiones (estaba en `feature/compartir-redes`); para no
  pisar, esta sesión trabajó en un worktree aparte. La carpeta `C:\Users\flgan\librepedal-bici` tiene
  `feature/pistero-v2-armario` y quedó **atrás** de `main`: hacer `git pull` antes de seguir.
- `tests/iconos-lucide.test.mjs` fallaba solo en Windows (CRLF); arreglado → suite 46/46 en cualquier máquina.
- Detalle técnico de Pistero v2 / sobrevuelo: `HANDOFF-PISTERO-V2-2026-10-04.md`.
