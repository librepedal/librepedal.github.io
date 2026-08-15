# 🚀 EMPEZAR AQUÍ — cualquier cuenta Claude que retome LibrePedal

Punto de entrada único. Léelo y en 2 minutos sabes el estado y qué hacer. Actualizado
2026-08-15 por la cuenta Claude Code (sesión de la tarde/noche). Meta de Inty: dejar
LibrePedal al 100% + **AAB final** para Play, e ir a **toda Sudamérica**.

## 0) 🔴 ANTES QUE NADA: el deploy automático está ROTO (token Cloudflare)
`CLOUDFLARE_API_TOKEN` empezó a fallar hoy 2026-08-15 (~22:58 UTC) con `Authentication
error [code: 10000]` — probado con 2 reintentos del mismo job, no es pasajero. **Tus merges
a `main` van a pasar los tests pero NO van a llegar a producción** hasta que Inty regenere
el token en Cloudflare (*My Profile → API Tokens*, permisos `Account → Cloudflare Pages →
Edit` + `User→User Details→Read` + `User→Memberships→Read`) y lo actualice en GitHub →
Settings → Secrets and variables → Actions → `CLOUDFLARE_API_TOKEN`. Detalle completo en
`BITACORA.md` (entrada 🔴 CRÍTICO, arriba de todo). **Después de mergear algo, SIEMPRE
revisa la pestaña Actions** — no asumas que llegó a producción solo porque el merge/tests
salieron verdes.

## 1) Sincroniza SIEMPRE primero (latido)
```bash
git fetch origin && git checkout main && git pull --ff-only origin main
```
Reglas completas en `../CLAUDE.md` (auto-cargado): nunca commit directo a main; una rama
por tarea; deploy = merge a main (automático, salvo el punto 0); NO deploy manual; tests
13/13 antes de mergear.

## 1-bis) ⚠️ LEE ANTES de tocar Worker/Cloudflare/ElevenLabs
`LECCIONES-APRENDIDAS-2026-08-14.md` — evita repetir el vía crucis (cuenta CF correcta,
bug de `wrangler login` en Windows → usar token, redeploy tras `secret put`, validar
ElevenLabs con TTS no con /v1/user, etc.). **Ahorra horas.**

## 2) Estado actual (verificado)
- **`main` @ `8a9a312`, v8.70.** Última versión confirmada EN VIVO antes del corte del
  token: `f625424` (v8.70 también — el commit de después, `8a9a312`, quedó en git pero sin
  desplegar, ver punto 0). Tests 13/13.
- Hoy (2026-08-15) se cerraron: login/magic-link (reenvío real, mensaje de cuota Firebase,
  Android App Links, correo primero/Google secundario), timeouts de voz de Pistero,
  tutorial ya no arranca forzado, y landing+login con logo/video/sonido nuevo + sin
  plata/cifras de usuarios + misterio (detalle en `BITACORA.md` v8.70). La animación
  "rueda de oro" (P2 de ayer) quedó **resuelta de otra forma**: un video real
  (`logo-presentacion.mp4`) reemplazó esa idea en login y las 2 landings — la rama
  `wip/rueda-oro-necesita-simplificarse` ya se borró, no queda nada pendiente ahí.
- Consolidado en origin (sin mergear aún): `feature/i18n-sudamerica` (expansión).

## 3) La ÚNICA decisión que Inty debe dar (destraba mucho)
**¿Aprueba el rebranding pan-latino de Sudamérica?** Con su sí → se puede mergear la
expansión. Sin eso → queda en su rama, sin riesgo.

## 4) Qué hacer — por prioridad (toma una, márcala EN-CURSO, trabaja en rama)
| # | Tarea | Doc detallado |
|---|-------|---------------|
| **P0** | **Token de Cloudflare** (ver punto 0) — bloquea TODO deploy, es lo primero que hay que destrabar con Inty. | `BITACORA.md` (entrada 🔴 CRÍTICO) |
| **P0** | **AAB final** para Play (keystore YA existe en `Downloads/KEYSTORE-LIBREPEDAL-RESPALDO`; cargar 4 secretos → correr workflow "Construir AAB firmado"). **La ÚLTIMA cuenta lo sube, con Inty (admin).** | `HANDOFF-FINAL-2026-08-14.md` |
| **P0/P1** | **Expansión Sudamérica** (5 tareas T-SA: merge i18n, POIs por país, selector país, branding, rules) | `EXPANSION-SUDAMERICA-2026-08-14.md` |
| **P1/P2** | **Backlog general** (21 tareas: perf, PWA, accesibilidad, código, seguridad) | `BACKLOG-MEJORAS-2026-08-14.md` |
| **P1** | **Voz clon local** (indistinguible, listo; espera ✓ de Inty para generar banco ampliado) | `VOZ-CLON-LOCAL-2026-08-14.md` |
| **P1** | **Probar en teléfono real** el logo/video/sonido nuevo de login+landing (solo probado en dev server local hasta ahora) | `BITACORA.md` (entrada v8.70) |
| **P2** | **Tema Cristal**: falta verificar en teléfono + afinar si algo se ve mal (botones/Darma ya en vidrio) | `SPEC-TEMAS-APP-WIDE-2026-08-14.md` |

## 5) Auditoría CEO (contexto de por qué cada tarea)
`AUDITORIA-CEO-2026-08-14.md` — revisión de toda la app por área, priorizada.

## 6) Cómo NO chocar entre cuentas
- Una rama por tarea = tu candado. Marca la tarea EN-CURSO en su doc/backlog (commit corto a
  main), pushea tu rama seguido. Latido cada ~5 min. Deja nota de qué tomaste.
- Zonas calientes de `index.html`: voz dinámica (~2785), superficies del tema, íconos. Coordinar.

## 7) Orden recomendado para cerrar todo
1. Destrabar el token de Cloudflare con Inty (punto 0) — sin esto nada nuevo llega a producción.
2. Inty aprueba pan-latino → mergear `feature/i18n-sudamerica` (T-SA1, resolver 1 conflicto de voz).
3. T-SA3/T-SA4 (país/branding) + T-SA2 (POIs por país) + T-SA5 (rules).
4. Verificar tema Cristal y el logo/sonido nuevo en teléfono; con ✓ de Inty, banco de voz ampliado.
5. **Recién con todo en orden y probado: AAB final** (última cuenta + Inty).

— Todo está escrito. Nada que re-derivar. A trabajar. 🚴
