# Sobrevuelo 3D — prototipo de propuesta (2026-10-06)

**No es código de la app.** Demo para que Inty apruebe la dirección antes de tocar `sobrevuelo-viaje.js`.

Ver: `node servir.mjs` → http://localhost:5178/COORDINACION-IA/mapa-navegacion/sobrevuelo-3d/ (tamaño teléfono).
Botón **Hoy / Propuesta** compara lo de `main` con lo propuesto.

## Por qué la línea "se desfasa" hoy (causas encontradas en el código)
1. **Pistero anclado por el centro.** `mlMarker()` (mapa-render.js) crea `new maplibregl.Marker({element})`
   sin `anchor` → MapLibre usa `'center'` (doc. MarkerOptions). La caja `.sbv-rider.atras` mide 80×88 px y
   las ruedas están al 96 % de alto → Pistero queda ~40 px corrido de la línea. Arreglo: `anchor:'bottom'`, `offset:[0,4]`.
2. **La línea es el GPS crudo.** `reproducirSobrevuelo` dibuja `coords` tal cual (solo saca saltos > 22 m/s
   con `_sbvLimpiar`). El GPS del teléfono deriva 5–15 m y salta 30–80 m entre árboles/cerros → la línea
   zigzaguea fuera del camino. Arreglo: pegarla al camino (map matching).

## Pegado al camino (map matching) — probado con Valhalla `trace_route`, bicicleta
- Traza simulada sobre el camino real Futrono→Llifén (OSRM bici): desvío medio 6,2 m, p95 15,9 m, máx 78,9 m.
- Pegada: largo 21,35 km vs camino 21,34 km; desvío máx 4,3 m.
- **Trampa encontrada:** con todos los puntos (cada 3 s) Valhalla responde 200 pero devuelve solo 1,5 km de 21.
  Hay que limpiar saltos (> 12 m/s) y mandar 1 punto cada ≥ 40 m, y SIEMPRE comparar el largo devuelto
  con el grabado (si no cuadra ±5 %, usar la traza limpia).
- Servidor: `valhalla1.openstreetmap.de` es demo de FOSSGIS con uso justo (límite de tasa). Para producción:
  decisión pendiente de Inty (Valhalla propio, o worker que llame una vez por ruta y guarde el resultado).

## Relieve real
- DEM Mapterhorn (terrarium, z12 ≈ 15 m/px), el mismo que ya usa el "Video 3D" de `rutas.js`.
- La altura del perfil sale del DEM (no del GPS del teléfono, que salta ±10 m), suavizada ±60 m (2 pasadas);
  pendiente en ventana ±100 m.

## Archivos
- `gen-datos.mjs` genera `ruta-osrm.json` → `traza-gps.json` (simulada, semilla fija) → `traza-pegada.json`.
- `medir.mjs` mide desvío contra el camino real. `servir.mjs` servidor estático.
- `index.html` + `sobrevuelo-3d.js` la demo (usa el Pistero real: pistero-*.js de la raíz).

## v2 (2026-10-07) — pedido de Inty: huella neón, tomas variadas, caras según la ruta y mascota
- **Huella neón** (técnica "firefly" de John Nelson / Mapbox): 2 halos anchos y difuminados del color de la
  pendiente (paleta eléctrica) + núcleo casi blanco; base satelital oscurecida (brillo máx. 0,5). Los halos
  respiran (~1,6 s) y titilan, más fuerte en subida; chispa bajo las ruedas; un destello blanco recorre lo
  pedaleado cada 2,4 s.
- **Director de tomas** (`planear()`): lee subidas/bajadas/cima y arma el plan: aérea al partir, persecución,
  aérea y paralelo bajo alternados en el plano, en subida cámara detrás y luego **lateral** (se ve la cara),
  en bajada baja y cerca, en la cima se detiene y **gira alrededor**. Transiciones suaves (dolly).
- **Pistero de costado** en las tomas laterales (bici real `_pistBiciSVG` con su cara); de espaldas gira la
  cabeza a la cámara cuando cambia la cara. Sentido en pantalla calculado proyectando el avance (no por ángulo).
- **Caras según la ruta**: las 10 de la app + 3 nuevas armadas sobre su misma cara: `agotado` (boca abierta,
  gotas, vapor), `adrenalina` (líneas de viento) y `orgulloso` (estrellas). El cansancio se acumula
  (más subido en el día → peor cara). Frases que rotan (sin repetir).
- **Primer plano**: viñeta de cómic con la cara grande y el dato real (pendiente, desnivel, cima, llegada).
- **Mascota**: pudú cría de `feature/mascotas` (arte Gemini; corriendo = pendiente de revisión de Inty).
  Corre al lado, se queda atrás en subida, se adelanta en bajada, salta en la cima; sale en la viñeta de cima.

### Hallazgo para la app real (verificar al integrar)
`estilos.css` tiene `.sbv-rider{position:relative}` y es el elemento RAÍZ del marcador: eso pisa el
`position:absolute` de `.maplibregl-marker`. En la demo, un marcador así quedó 88 px corrido (apilado debajo
del anterior). En la app puede sumar al desfase si hay otros marcadores antes. Arreglo: no dar `position` al
raíz del marcador (o `.maplibregl-marker.sbv-rider{position:absolute}`). También: `opacityWhenCovered:'1'`
para que un cerro no deje a Pistero transparente.

## v3 (2026-10-07) — mascota elegida + 12 errores corregidos
- **Mascota = la que eligió el usuario** (`opts.mascota`). Las del Taller (quiltro, perro negro, gato) van en el
  canasto: de costado se ven en la bici real; de espaldas, asomadas junto al manubrio. Las nuevas de
  `feature/mascotas` corren al lado (hoy solo el pudú tiene arte de carrera). Selector solo en la demo.
- Errores corregidos: nota tapada por la viñeta · viñetas que repetían datos de pantalla (ahora dicen lo que
  NO se ve: "quedan 240 m de cuesta", "en 1 h 25 min", "lo más alto del viaje") · texto fijo (Futrono, 21,4 km)
  · tomas de 0,5–1,5 s (mínimo ~3 s; las de subida/bajada mandan) · 16 viñetas → máx. 7, sin repetir cara
  seguida · cara que saltaba (histéresis + "preocupado" solo si ve venir la cuesta) · "¡Llegamos!" que podía no
  salir · repetir arrastraba cara/cansancio · salto brusco espaldas↔costado · pudú que parpadeaba en la cima ·
  demasiada interfaz al reproducir · 404 del ícono.

## v4 (2026-10-07) — cámara profesional (pedido de Inty: "siempre hacia donde se dirige", "transiciones, no kindergarten")
- Por ahora **sin mascota** (Inty): queda el código, el selector parte en "Sin mascota".
- **Cámara siempre hacia adelante**: máx. 40° fuera del avance y siempre del **lado del valle** (`ladoBajo()` compara
  el relieve a 120/250/400 m a cada lado, suavizado ±400 m). Nunca mira contra la ladera.
- **Línea de vista con el relieve** (`pitchSeguro()`): ubica la cámara real de MapLibre (distancia por fov 36,87°)
  y revisa 12 puntos entre la cámara y Pistero contra el DEM; si el cerro se cruza, baja la inclinación (eleva la
  cámara) antes de que tape. Exageración 1,2 (con 1,35 el DEM de 30 m se estiraba).
- **Cambios de plano de 2,8 s** con curva smootherstep, pedidos ~1,4 s antes del evento (llegan justo); zoom en
  rango 14,9–16,3; rumbo con giro máx. 35°/s; velocidad que acelera y frena suave (también en la cima).
- **Introducción**: al dar play baja desde la vista general hasta Pistero en 2,8 s antes de partir.
- **Viñetas sobrias**: tarjeta oscura translúcida con anillo de color del estado; fundido + 10 px, sin rebote ni temblor.
- MapLibre reescribe `style.opacity` de los marcadores en cada cuadro (oclusión): para esconder uno, `visibility`.
