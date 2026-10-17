# Traspaso — Libre Pedal (2026-10-17, sesión Lenovo se quedó sin créditos)

Pega esto tal cual al abrir la nueva conversación de Claude. Repo: `C:\Users\intyr\Downloads\LibrePedal`, rama `main`, todo commiteado y pusheado hasta este punto.

## Lo más urgente — auditoría de seguridad en curso, NO está terminada

Inty pidió una auditoría de seguridad exhaustiva de todo el proyecto ("no confío en Claude, demasiados errores... revisar línea por línea, ningún hueco"). Se lanzaron 5 subagentes en paralelo con criterio máximo (modelo opus) para revisar: (1) firestore.rules, (2) worker-auth.js/login, (3) worker-ia.js + Cloudflare Pages Functions + GitHub Actions, (4) XSS/secretos del lado cliente, (5) cadena de suministro/CI. **La sesión se quedó sin créditos antes de que los 5 terminaran de reportar — SOLO el de login (#2) alcanzó a reportar y se actuó sobre él. Los otros 4 (reglas de Firestore, Workers, XSS/cliente, supply-chain) quedaron SIN LEER sus resultados.** Si esos agentes siguen corriendo en segundo plano de la sesión vieja, sus resultados no son recuperables desde una cuenta nueva — **hay que relanzar esas 4 auditorías de cero** (o decidir si ya no hace falta). Usar el mismo criterio: subagentes con modelo opus, exigir cita de archivo y línea para cada hallazgo, escenario de ataque concreto, distinguir CONFIRMADO de sospecha.

## Hallazgo CRÍTICO ya arreglado y mergeado (verificar que esté desplegado en vivo)

**worker-auth/worker.js**: con `CODIGO_TESTER` (compartido a los ~51 testers) + el correo de CUALQUIER tester de la lista `TESTERS_PERMITIDOS`, se emitía un token válido COMO esa persona, sin ninguna prueba de serlo — toma de cuenta completa entre testers. Variante con `CODIGO_EVENTO`: quien "fichaba" un correo sin cuenta podía seguir entrando con el código para siempre, incluso después de que la persona real se registrara con Google.

**Fix mergeado a main** (PR #37, commit con el mensaje "fix(auth): CRÍTICO"): cuando una cuenta prueba ser su dueña de verdad (Google o enlace mágico), queda marcada `verificado:<cu>` en KV (`RATE_LIMIT_AUTH`). Desde ahí ningún código compartido sirve para esa cuenta. 12 tests nuevos en `tests/worker-auth-abierto.test.mjs` reproducen el ataque real antes del fix y confirman que queda bloqueado. 81/81 tests en verde.

**PENDIENTE DE VERIFICAR**: el merge disparó el deploy automático de `worker-auth` (`.github/workflows/deploy-worker-auth.yml`, corre solo si cambia `worker-auth/**`) — confirmar que terminó bien (`gh run list --branch main`) y probar en vivo que el login normal (Google/enlace) sigue funcionando para una cuenta real.

**PENDIENTE DE DECISIÓN DE INTY, no lo hice solo**: rotar `CODIGO_TESTER` por un valor largo y aleatorio nuevo (`wrangler secret put CODIGO_TESTER` en `worker-auth/`, con el token de `MI-CLOUDFLARE.txt`). La memoria del proyecto registra el valor histórico `PEDAL26` — si sigue vigente, es corto y adivinable. El fix de arriba cierra la suplantación estructuralmente incluso con un código débil, pero rotarlo es buena higiene aparte. Requiere que Inty redistribuya el código nuevo a los testers reales — por eso no se hizo sin preguntarle, afecta acceso de gente real ahora mismo.

## Todo lo demás hecho y verificado en vivo esta sesión (ya en producción, no repetir)

- Tutorial guiado: nunca se disparaba automático (bug desde agosto); ahora arranca con tour de solo el mapa en el primer login. Dos selectores rotos corregidos.
- Onboarding progresivo: Social/Pistero/Perfil bloqueados en el nav hasta el primer viaje real (candado visual), nunca bloquea a cuentas con km ya reales.
- El Pistero elegido en "Elige tu Pistero" ahora se ve en todo el mapa (propio y de otros ciclistas, en vivo y navegando), popup de ciclista y preview de la Tienda.
- Tienda simplificada a solo color de casco (flag reversible `PIST_TABS_SOLO_CASCO`).
- Ícono de Rodada más claro (people-group en vez de walkie-talkie).
- Top 100 real: faltaba la categoría "Cicloviaje" (la actividad insignia de la app) en `MODOS_QUE_COMPITEN` — confirmado contra Firestore real.
- Bienvenida duplicada eliminada (había dos modales de bienvenida compitiendo por la pantalla).
- **Service Worker desatascado**: `CACHE` en sw.js y `version.txt` llevaban 9 deploys sin subir de versión — nada de lo anterior le llegaba a nadie con la app ya abierta. Ahora en v8825.
- **librepedal.cl ya NO es la app navegable para cualquiera**: `functions/_middleware.js` enruta por User-Agent — un navegador normal ve `landing.html` (la cara pública), la app funcional solo se sirve al WebView de la app instalada. Para probar la app real en un navegador: `https://librepedal.cl/?app=1` (deja cookie 30 días). Esto fue pedido explícito de Inty ("para eso está Play Store"), no requirió AAB nuevo.
- Botón "Dejar mi huella" ahora tiene acceso persistente en Comunidad (antes solo se podía abrir una vez, en la bienvenida de cuenta nueva).
- Auditoría de "¿nos atacaron?": revisados Sentry (sin patrones de ataque), KV de rate-limit (sin bloqueos activos, solo 14 entradas históricas normales), 452 documentos públicos de Firestore (sin inyección), 87 usuarios (sin stats infladas, sin ráfagas de registro tipo bot). Sin evidencia de ataque pasado, con la salvedad de que no hay acceso a logs de request crudos de Cloudflare.

## Cómo seguir

1. Confirmar que el deploy de worker-auth terminó bien y probar login real.
2. Preguntarle a Inty si rotar CODIGO_TESTER ahora o después.
3. Relanzar las 4 auditorías de seguridad que quedaron pendientes (reglas de Firestore, Workers/Functions/CI, XSS/cliente, supply-chain) — Inty las pidió explícitamente y no están hechas.
4. Seguir el protocolo de trabajo de siempre: rama por cambio, `npm test` en verde antes de cualquier PR, CI verde antes de mergear, verificar en producción real después de cada deploy (no dar nada por hecho sin comprobarlo).

## Contexto emocional importante

Inty llegó a decir explícitamente "no confío en Claude, demasiados errores" en esta sesión — viene de una noche muy larga arreglando muchas cosas. Trabajar con máximo rigor, citar archivo/línea en cada hallazgo, nunca afirmar algo sin haberlo verificado contra el código o los datos reales, y ser honesto sobre los límites de lo que se pudo o no verificar.
