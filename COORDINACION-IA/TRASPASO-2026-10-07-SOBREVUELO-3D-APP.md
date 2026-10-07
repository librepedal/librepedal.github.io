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

## Antes de publicar (decisiones de Inty + pasos del release)
1. **Pegado al camino en producción**: hoy usa el servidor de demostración de Valhalla (FOSSGIS, uso justo). Decidir:
   Valhalla propio, o un worker que lo pida una vez por ruta y guarde el resultado. Sin eso, con muchos usuarios puede
   cortarse (igual hay respaldo: se ve con el GPS limpio).
2. Probar en el teléfono de Inty (y en la app de Play).
3. Subir versión en los 3 lugares (APP_VERSION, version.txt, caché de sw.js) — obligatorio porque sw.js cambió.
4. Los Pistero nuevos (Cyberpunk, Orbe, Slime, Androide) se conectan cuando lleguen a `main` (código listo en `feature/sobrevuelo-3d`).
