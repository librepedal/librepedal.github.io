# Traspaso 2026-10-07 — Sobrevuelo 3D integrado en la app (rama `feature/sobrevuelo-3d-app`)

Integra el prototipo aprobado (rama `feature/sobrevuelo-3d`, ver `TRASPASO-2026-10-07-SOBREVUELO-3D.md` allá) en la app.
**No está en `main`.** Inty pidió "sin romper nada": el cambio es aditivo.

## Qué cambia
- **Nuevo** `sobrevuelo-3d.js`: pantalla propia con su propio mapa (se crea al abrir y se destruye al cerrar). Estilos solo
  bajo `#sb3`, ids con prefijo `sb3-`, keyframes `sb3*`: no pisa nada de `estilos.css`.
- `sobrevuelo-viaje.js` (12 líneas): "Ver sobrevuelo" del historial y la oferta al terminar la ruta llaman primero a
  `abrirSobrevuelo3D(...)`. **Si devuelve false o falla al preparar → el sobrevuelo de siempre, sin cambios.**
- `index.html` (+1 script) y `sw.js` (+1 archivo en la caché).
- **Nuevo** `tests/sobrevuelo-3d.test.mjs` (26 pruebas): puntos corruptos, pinchazos, sol, caras, pausas, velocidad, plan
  de tomas/momentos, ruta larga sin colgarse. Suite completa: 48/48.

## Datos
- La línea pegada al camino se guarda en **su propia llave** `lp_sbv3_pegadas` (1 punto cada 25 m, máx. 10 rutas), NO
  dentro de `lp_rutas_*`: así nunca le quita espacio al guardado de rutas (rutasLocalesSet falla en silencio si no hay espacio).
- No escribe en Firestore ni en ningún servidor propio.

## Probado (2026-10-07, Chrome a 390×844, Firebase/Sentry/workers bloqueados: no se tocó producción)
Abre desde el historial con una ruta de prueba sintética (21,4 km), vuela, muestra el resumen, cierra dejando el mapa de la
app intacto; con una ruta de 5 puntos usa el sobrevuelo de siempre; la pegada queda en su llave y las rutas intactas.

## Worker que pega cada ruta UNA vez (`worker-sobrevuelo/`, decidido por Inty el 2026-10-07)
- `librepedal-sobrevuelo.librepedal.workers.dev`, POST `{puntos:[[lat,lon],...]}` (la muestra limpia del cliente, ≥40 m).
- Clave `sbv:ruta:<sha256 de los puntos a 5 decimales>` → la línea pegada, 180 días. Misma ruta desde otro teléfono o
  tras reinstalar = caché, cero pedidos a Valhalla. Si todo falla, NO se guarda (se reintenta después).
- Pide a Valhalla por tramos de 120 (de a 2) y valida el largo de cada tramo (±10 %): la trampa del "200 con un pedazo".
- Límites (Inty, 2026-10-07): 20 rutas NUEVAS por conexión al día y 300 en total al día, en un solo registro `sbv:dia:<fecha>` (IP como hash); lo guardado no cuenta. Cada ruta nueva = 2 escrituras de KV (máx. 600/día). CORS solo librepedal.cl/www/Pages.
  Sin logs de coordenadas. Usa el mismo KV `RATE_LIMIT_AUTH` que auth/proximidad, con prefijo propio `sbv:`
  (ojo cuota gratis de KV: 1.000 escrituras/día compartidas; cada ruta nueva usa 2).
- Cliente (`sobrevuelo-3d.js`, `sb3PorWorker`): primero el worker (45 s máx.); si no está publicado, falla, 429 o
  responde algo inválido → Valhalla directo como antes; si eso también falla → GPS limpio. Encima sigue la copia local
  `lp_sbv3_pegadas` (el mismo teléfono ni siquiera llama al worker).
- Pruebas: `tests/worker-sobrevuelo.test.mjs` (58, sin red: Valhalla y KV simulados, incluye el cliente contra el worker).
  Se comprobó que fallan al quitar: la validación de largo, el no-guardar-fallos y el chequeo de tipos (un `null` pasaba
  como latitud 0 — error real encontrado por las pruebas y corregido en worker y cliente).
- **Sin publicar.** `wrangler deploy --dry-run` OK (6 KB, KV enlazado). No probado: el worker real en Cloudflare.
  Publicar (con OK de Inty y su sesión de Cloudflare): `cd worker-sobrevuelo && npx --yes wrangler@4 deploy`, y probar con
  `curl -X POST ... -H "Origin: https://librepedal.cl"` una ruta de prueba (no de un usuario).

## Antes de publicar (decisiones de Inty + pasos del release)
1. **Publicar el worker** (arriba). Mientras no esté, la app funciona igual (pega directo como antes).
2. Probar en el teléfono de Inty (y en la app de Play).
3. Subir versión en los 3 lugares (APP_VERSION, version.txt, caché de sw.js) — obligatorio porque sw.js cambió.
4. Los Pistero nuevos (Cyberpunk, Orbe, Slime, Androide) se conectan cuando lleguen a `main` (código listo en `feature/sobrevuelo-3d`).
