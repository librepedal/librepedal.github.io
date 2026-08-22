# Demo — Ciclistas por Escala

Herramienta interactiva para calibrar cómo se ven los ciclistas en el mapa
principal (`index.html`) según el zoom: tamaño, agrupamiento en tarjetas de
grupo, y a qué escala aparecen agua/miradores/alertas. Usa exactamente la
misma lógica (`_riderScaleParaZoom`, `_celdaClusterParaZoom`,
`_escalaVisibleKm`, `riderClusterHTML`) que el mapa real, con datos de prueba
en vez de tu login/Firestore, para poder ver el resultado sin arriesgar nada
en producción.

Nace de la conversación con Inty del 2026-08-21/22 (rama
`feature/mapa-ciclistas-zoom-cluster` de `index.html`, luego mergeada a
`main` — ver `BITACORA.md` / historial de esa rama para el detalle completo).

## Cómo verla

**Opción rápida — ya publicada:** pedile a Inty el link del Artifact (queda
guardado en su cuenta de claude.ai, lo puede reabrir desde `/artifacts` en
Claude Code o desde la galería en claude.ai/code/artifacts). Si no lo
encuentra, se reconstruye con la opción de abajo y se vuelve a publicar.

**Reconstruirla localmente:**
```bash
cd COORDINACION-IA/mapa-navegacion/demo-escala-ciclistas
node build.js
```
Genera `ciclistas-escala-demo.html` (no se versiona, se regenera siempre;
descarga maplibre-gl.js fresco de unpkg, ~1MB final). Abrilo directo en el
navegador — es 100% autocontenido, no necesita servidor ni login.

**Para volver a publicarla como Artifact** (Claude Code): usar la
herramienta Artifact con `ciclistas-escala-demo.html` como `file_path`. Si
es una actualización de la que ya existe, pasar la misma `url` para que
quede en el mismo link.

## Qué tiene

- Mapa MapLibre real (mismo motor que `index.html`), con el mundo entero
  dibujado (`world.geojson`, 179 países) y Chile resaltado con borde naranja.
- 5 botones de escala con **zoom fijo** (no `fitBounds`): Mundo (zoom 0),
  Continente (zoom 3), País (zoom 5.5), Regional (zoom 8.8), Escala calle
  (zoom 12) — fijo a propósito, porque con `fitBounds` el zoom resultante
  dependía del tamaño de pantalla y podía caer en un escalón distinto al que
  decía el botón (bug real, encontrado y corregido el 2026-08-22).
- Panel de control (ícono de sliders, arriba a la izquierda): tamaño y
  agrupamiento por escala, radio de POI, tarjeta de grupo, botón "Asignar"
  que imprime los valores listos para copiar a `index.html`.
- "Sembrar usuarios de prueba": por país (179 opciones + "todo el mundo" al
  azar), por continente (6 continentes, calculados por región/subregión real
  — ver `world-zones.json`), o "Sembrar N por país" en los 179 países a la
  vez para una prueba de carga real (17.900 ciclistas con N=100, sembrado en
  ~10ms).

## Valores finales ya aplicados en `index.html` (2026-08-22)

```
_riderScaleParaZoom   (mundo/continente/país/regional/ciudad): [0.51, 0.56, 0.62, 0.80, 0.92]
_celdaClusterParaZoom (mundo/continente/país/regional):        [154, 110, 66, 48]
umbral POI (km):        30
blink máx (s):           5.4
tarjeta de grupo:        2 cascos visibles antes del "+N", 16px cada uno
```

El escalón "continente" (0.56 / 110px) está corregido a mano: el valor que
Inty había asignado con el panel (0.35 / 50px) hacía que el ciclista se
achicara al pasar de Mundo a Continente antes de volver a crecer — se ajustó
para que las dos curvas (tamaño y agrupamiento) sean monótonas, sin ese
"rebote". Si se vuelve a calibrar con el panel, tené esto en cuenta: nada
impide que el panel deje curvas no-monótonas otra vez, es una elección de
diseño que hay que revisar a ojo, el código no la valida sola.

## Archivos de esta carpeta

- `demo-template.html` — el código fuente real (CSS+HTML+JS), con dos
  placeholders (`/*__MAPLIBRE_JS__*/`, `/*__WORLD_GEOJSON__*/`,
  `/*__WORLD_ZONES__*/`) que `build.js` rellena.
- `build.js` — arma el HTML final. Node puro, sin dependencias npm.
- `world.geojson` — 179 países (fuente:
  `johan/world.geo.json` en GitHub, con Rusia y Fiyi corregidos a mano por
  un bug de cruce de antimeridiano en el geojson original).
- `world-zones.json` — por cada país: `label`, `center`, `halfLon`/`halfLat`
  (bounding box real, no un círculo parejo) y `continent` (una de
  `america_sur`, `america_norte`, `europa`, `africa`, `asia`, `oceania`,
  calculado cruzando `world.geojson` con region/subregión reales, no a
  mano). Chile además tiene `cities` (ver `CHILE_CIUDADES` en el template):
  sus 15 ciudades reales, en vez de un bounding box, porque Chile es muy
  angosto y un bbox tira usuarios sembrados al mar.

## Bugs reales que costó encontrar acá (para no repetirlos)

- **Markers fuera de posición sin `maplibre-gl.css`**: el demo no carga esa
  hoja externa (autocontenido, sin red). Sin ella, `.maplibregl-marker`
  pierde su `position:absolute` y el marker queda en flujo normal del
  documento en vez de en el punto que le puso `setLngLat`. Se declara a
  mano en el CSS del template.
- **`fitBounds` no es confiable para "en qué escalón cae"**: el zoom
  resultante depende del tamaño de pantalla. Con zoom fijo por preset se
  garantiza que cada botón cae siempre en el mismo escalón de
  `_riderScaleParaZoom`/`_celdaClusterParaZoom`.
- **Un zoom fijo "seguro" en desktop puede no mostrar nada en mobile**: el
  primer intento de "Mundo" (zoom 1, centro `[10,15]`) no mostraba ningún
  ciclista en una ventana angosta tipo celular — el mundo entero no entraba
  en pantalla a ese zoom y Sudamérica quedaba fuera de los límites
  visibles. Bajado a zoom 0 para que el planeta completo entre incluso en
  pantallas angostas.
