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

## v5 (2026-10-07) — problemas de render (Inty: "siguen habiendo problemas de render")
- **Causa raíz encontrada en MapLibre 4.7.1:** `easeTo`/`fitBounds` con terreno llaman `_prepareElevation`
  (`_elevationFreeze=true`) y solo descongelan si se pasó `freezeElevation`. Tras la vista general con `fitBounds`
  la altura del mapa quedaba congelada: la cámara no seguía el relieve (Pistero subía/bajaba en pantalla; en
  "Calles" la cámara quedaba a 0 m, pegada al suelo). Arreglo: vista general con `cameraForBounds` + `jumpTo`
  y animación propia; defensa por cuadro. Medido: altura del mapa = terreno en todo el recorrido (sat y calles).
  **Al integrar en la app: no usar fitBounds/easeTo/flyTo con terreno sin `freezeElevation`.**
- Encuadre con el tamaño real: Pistero queda en la zona libre entre la barra y el panel (antes, en pantallas bajas
  el panel tapaba la huella y Pistero chocaba con el título). Panel compacto si la altura < 700 px.
- Cambiar Satélite/Calles con el sobrevuelo andando ya no rompe la animación (antes: error setData y se congelaba).
- Relieve sombreado con fuente propia (`dem-sombra`), como pide MapLibre.

## v6 (2026-10-07) — Pistero como ROSTRO (Inty: "ya no anda en bicicleta, aparece como un rostro mostrando las caras")
- Marcador = la cara de Pistero (`_pistoDe` + agotado/adrenalina/orgulloso) en un círculo con anillo del color
  neón de la pendiente; el anillo **late** (1,15 s en plano → 0,42 s en la subida más dura); gota de sudor con
  esfuerzo fuerte; se mece y se inclina en las curvas; caras con fundido cruzado; hilo de luz al punto exacto.
- La viñeta ya no repite la cara (está en el mapa): solo texto con barra del color del estado.
- Se mantiene la secuencia de tomas y el rastro neón (aprobados).

## v7 (2026-10-07) — MODO LIVIANO (por defecto; `?completo` = como antes). Inty: "que no se corte, copia a los mejores"
Referencias: Mapbox precarga los mosaicos de una animación antes de correrla (`preloadOnly`, "evita el efecto
bloque/flash gris"); MapTiler `TilePreloader.preloadForLinearPath`; los reproductores de video cargan por delante
y frenan si la red se atrasa; Mapbox recomienda menos capas y fuentes separadas para lo que cambia cada cuadro.
- **Precarga del recorrido de la cámara**: mosaicos por anillos de distancia (cerca zoom de la toma, al horizonte
  zooms menores); 6 descargas a la vez; quedan en la caché HTTP (Esri max-age 1 día, OpenFreeMap/Mapterhorn
  cacheables, todos con CORS). Al dar play: "Preparando el vuelo · N %" (primeros ~1,3 km, máx. 8 s) mientras corre
  la introducción; después carga 3 km por delante cada 0,4 s y **si se atrasa, el vuelo frena suave** (no corta).
- **Menos trabajo de GPU/CPU**: mapa dibujado a máx. 1,5× (teléfono 3× → 4 veces menos píxeles), tope 30 cuadros/s,
  caché de 600 mosaicos, destello en 1 capa (antes 2), perfil de altura pre-dibujado (antes ~1.800 polígonos por
  cuadro), latido del rostro con transform/opacity (antes animaba una sombra difuminada → repintado).
- Probado: 15 s en Chrome sin GPU, precarga 8 % → 49 % → vuelo, sin errores. Falta probar en GPU real (panel/teléfono).

## v8 (2026-10-07) — expresiones acordes a lo que pasa + preparado para todos los personajes
- **Contrato de expresiones** (`EXPRESIONES-PERSONAJES.md`): 12 estados, cuándo los pide la ruta y respaldo si falta.
  En código: `PERSONAJES[id]={tiene(estado), cara(estado)}`; hoy está Pistero; listo para conectar el Pistero nuevo
  (orbe, feature/armario-piezas) y las mascotas (feature/mascotas) cuando tengan su arte (no se dibujan a mano).
- **Cara según la ruta** (ya no la impone la viñeta): partida y llegada contento, cima orgulloso, cansado desde 3,5 %,
  enojado/agotado en lo duro o con mucho subido en el día, guiño al terminar una cuesta, adrenalina/emocionado en bajada.
- **Causa raíz corregida**: en tramos que cambian rápido (bajada −4 → −12 → −4 % en 3 s) la cara alternaba entre dos
  estados y la espera de estabilidad se reiniciaba siempre → nunca cambiaba. Ahora por familias (bajada / subida):
  dentro de la familia la espera no se reinicia y el cambio toma 0,3 s; a ×2/×4 la espera se acorta.
- Probado recorriendo la ruta completa con reloj simulado (ventana mínima, sin dibujar casi nada) a ×1 y ×2.

## v9 (2026-10-07) — más cine y cierre (Inty: "sigue mejorando el sobrevuelo")
- **Rostro según la toma**: más grande en tomas cerradas (primer plano), más chico en la aérea y en la vista general.
- **Revelación en la cima**: la pausa dura 4,2 s; la cámara se abre 40° hacia el valle, se aleja 1,35 niveles y sube,
  mostrando todo lo conquistado, y vuelve.
- **Resumen del viaje** al terminar (como el cierre de Relive/Strava): la ruta completa iluminada sobre una tarjeta con
  distancia, tiempo, metros subidos, km subiendo y los hitos (subida más dura, lo más empinado, mejor bajada, cima con su
  km). Reemplaza los datos del panel (no se repiten).
- **Arreglo de encuadre**: `cameraForBounds` devuelve un centro que YA descuenta los márgenes; se aplicaban dos veces y la
  ruta quedaba corrida hacia arriba (también en la vista inicial). Además se calcula con la cámara a nivel.
- Regla aprendida (2 veces hoy): nunca agregar un comentario `//` al final de una línea que tiene más código: usar `/* */`.

## v10 (2026-10-07) — "Tu ruta" (GPX propio) y duración como Relive
- **Duración**: ~5 s/km pero acotada a 45–80 s (antes 100 km = 8 min). La anticipación de las tomas usa la velocidad real del vuelo.
- **Tu ruta**: botón para cargar un GPX (la app ya exporta GPX desde el historial). Se procesa en el navegador:
  limpieza de saltos por velocidad (si hay horas) + **quita "pinchazos"** (puntos que se salen >22 m de la línea entre
  vecinos; sirve sin horas) → muestra cada 40 m → **pegado al camino por tramos de ~120 puntos** con Valhalla (2 pedidos a
  la vez); cada tramo se valida (largo ±10 %) y si falla, solo ese tramo usa la traza limpia. Avisa "pegada al camino",
  "pegada en N/M tramos" o "GPS limpio". Solo se envía la lista de puntos (sin nombre ni horas) al servidor de FOSSGIS.
- Probado con 2 GPX de prueba (en `pruebas/`, datos sintéticos sobre caminos reales OSM): Valdivia→Niebla con horas
  (17,6 km pegada vs 17,5 km del camino) y Futrono sin horas (21,4 km vs 21,39 km).
- Arreglos encontrados al probar: sin horas `limpiarHoy` dividía por 0 y dejaba 1 punto; el archivo se perdía si se
  limpiaba el selector antes de leerlo; comparar largos contra el GPS crudo (con zigzag) daba falso "no cuadra".

## v11 (2026-10-07) — velocidad y pausas reales + sonido
- **Velocidad real** (si la ruta trae horas): las horas de la traza se llevan a la línea pegada por fracción de distancia;
  velocidad en ventana ±250 m (con ±80 m un salto del GPS daba un falso pico). El panel muestra "Velocidad" en vez de
  altura (la altura ya está en el perfil). Cara: adrenalina >38 km/h, emocionado >28 km/h en plano.
- **Pausas reales**: se quedó dentro de 30 m por 60 s o más (un teléfono parado igual graba cada pocos segundos: buscar
  "huecos" de tiempo no las encuentra). Siempre se muestran: el vuelo se detiene, cara "pensando" y viñeta
  "Pausa para respirar · 4 min".
- Momento "¡Volando! N km/h, lo más rápido del viaje" (si ≥30 km/h). Resumen: "Lo más rápido" y "Pausas".
- **Sonido con el motor de la app** (`pistero-sonidos.js`, sintetizado, compresor + volumen .14): viento continuo que
  sube con la velocidad, latido grave en subidas duras al ritmo del anillo, timbre al partir y llegar, fanfarria en la
  cima, ráfaga en bajada/volando. Botón de parlante dibujado a medida; preferencia guardada (`lp_sbv_sonido`).
- Probado con `pruebas/prueba-pausa-y-velocidad.gpx` (sintético: pausa de 4 min en el km 8,3 y tramo a 40 km/h en el km 13).
  Sonido verificado por las llamadas (timbre, viento, fanfarria, viento, timbre), no escuchado.

## v12 (2026-10-07) — luz real del momento del viaje + compartir como imagen
- **Luz real**: posición del sol (NOAA/Meeus aprox.; validado: ocaso Valdivia 5-oct = 20:03) a media ruta y en su
  centro → día / luz de mañana-tarde / hora dorada / crepúsculo / noche: colores de cielo, brillo y tono del satélite.
  De día, **sombras del relieve desde donde estaba el sol** (hillshade con el azimut real). Subtítulo: "salida 10:00 · día".
- **Compartir mi viaje**: tarjeta 1080×1350 (formato de historia/Instagram, como las de Strava): foto del mapa con la
  ruta neón, logo real (`logo-transparent.png`), rostro del Pistero elegido, nombre (la letra se achica para que entre
  completo), fecha y luz, 4 datos y 3 hitos, librepedal.cl. Web Share con archivo en el teléfono; si no, descarga PNG.
- Causas raíz encontradas al probar: la foto del mapa salía negra sin `preserveDrawingBuffer`; y el lienzo 2D acelerado
  por GPU perdía lo dibujado al exportar en el Chrome de prueba → lienzo `willReadFrequently` (en memoria).

## v13 (2026-10-07) — robustez y rendimiento
- **Ruta larga (101 km, prueba sintética)**: lista en ~15 s, 17/18 tramos pegados. Las tomas se miden en TIEMPO de
  vuelo (mín. ~3,5 s; normales ~6 s): antes eran 112 cambios en 80 s. Una toma de evento corta pide tiempo a cualquier
  vecina que tenga de sobra; solo se funde si no hay otra opción.
- **Bucle infinito arreglado** en la fusión de tomas: por decimales flotantes quitaba trocitos para siempre (umbral 1 m
  + tope de vueltas con aviso en consola).
- **Rendimiento** (perfilado con el Profiler de Chrome): 13,6 → 4,2 ms de cómputo por cuadro en 101 km. Causas: el perfil
  se redibujaba entero en modo completo (~8.400 polígonos por cuadro), MapLibre leía píxeles de la GPU para ver si el
  relieve tapaba cada marcador (se apaga: nuestros marcadores se ven siempre), y el sonido despertaba el audio en cada
  cuadro. Tramos de neón de máx. 60 puntos; línea de vista cada 2 cuadros.
- **Pausa al salir de la app** (batería y calor), **tocar el mapa pausa/sigue**, **movimiento reducido** (sistema): una
  sola toma tranquila, sin giro en la cima ni temblores.
