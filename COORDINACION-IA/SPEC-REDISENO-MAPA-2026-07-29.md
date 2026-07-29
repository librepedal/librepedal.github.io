# 🗺️ SPEC — Rediseño de la pantalla del Mapa (control de calidad)

**Origen:** sesión Thunderobot, 2026-07-29. Feedback directo de Inty sobre la pantalla del mapa.
**App:** v7.46 · `index.html`. **Ejecuta:** la sesión que despliega (Lenovo), función por función,
verificando en el navegador antes de cerrar cada punto (protocolo: versión+deploy+commit+bitácora).
**Versión visual del spec (artifact):** rediseño con referencias a Google Maps / Waze / Strava / Komoot.

## Principio
Menos es más: **un solo mapa, un solo sistema de botones, un solo acento (naranja de marca)**.
El mapa manda; los controles se hacen pequeños. No copiar apps — adoptar lo que ya resuelven.

## Paleta / tokens (único acento + semánticos SOLO para reportes)
- Acento marca: `#E35A2B` (el ÚNICO acento de UI).
- Reporte Peligro `#D6453C` · Servicio `#2E7DC4` · Mirador `#2FA36B` (solo en esas categorías).
- Botón flotante estándar: círculo **52px**, sombra suave, **ícono de línea** (no emoji). Escala 8/12/16/24; separación por `gap`, nunca superpuestos.

## Hallazgos → arreglos (orden de trabajo)

### P1 · Mapa claro por defecto + quitar botón GPS  (máximo impacto, mínimo riesgo)
- **Mapa oscuro no ayuda:** abrir SIEMPRE en estilo claro/terreno legible (OSM estándar o tile outdoor). `btnCapaMapa` (🏔️) queda como alternador a satélite/noche, pero el default es claro. *(Ninguna app de rutas arranca en negro — Strava/Komoot/Google.)*
- **Botón GPS sobra:** `btnGPSLibre` (📍 GPS, ~línea 808) → ocultar como acción grande. Dejar solo la **insignia de señal** (pequeña, `gpsSignalBadge`) + el botón **recentrar** (🎯 `_mapaRecentrar`). Conservar la lógica `toggleGPS`, solo ocultar el botón. *(Google Maps no tiene on/off de GPS, solo “ubicarme”.)*

### P2 · Sistema de botones único
- Íconos de línea para los controles del mapa (extender el criterio de `MODO_SVG` a `fabReportar`, recentrar, capas). Nada de emoji en controles.
- **El naranja es el único acento.** Cualquier botón azul/verde “suelto” (de trabajo previo) → normalizar. Los colores semánticos solo en las 3 categorías de reporte.
- Tamaño FAB uniforme 52px; nada de botones de 70px ni mezcla con pastillas de texto.

### P2 · Controles ordenados (arreglar los que se pisan)
- Las **4 capas** (Ciclistas/Peligros/Servicios/Miradores, `capaCiclistas`/`capaPeligros`/`capaPuntos`/`capaMiradores`, ~línea 975+) → detrás de **un** botón “Capas” que abre una hoja compacta con toggles. Despeja el mapa. *(Google Maps · Layers.)*
- Abajo-derecha: columna de 2 FAB con `gap` — **recentrar** (arriba) y **Reportar** (abajo, naranja primario `fabReportar`).

### P2 · Reportar sobre el MISMO mapa (quitar el 2º mapa)
- `abrirAbanicoReporte → reportarEnRuta` (~línea 5108/9589) abre otro mapa para el punto. **Redundante.**
- Reportar sobre el mapa principal: por defecto **tu ubicación GPS**; si querés otro punto, un pin arrastrable sobre el mismo mapa. Eliminar la instancia de mapa secundaria. *(Waze reporta sobre el mismo mapa.)* Verificar bien en navegador (cambio de lógica).

### P3 · Voz de Pistero solo en pantalla (quitar el globo)
- Al hablar sale `pisteroBubble` (globo grande, ~líneas 468/623/2046) + el mismo texto en pantalla → duplicado y ruidoso.
- Dejar **solo el texto en pantalla**: franja fina con la transcripción en vivo mientras hablás; al terminar, la respuesta de Pistero como texto normal en la vista. Suprimir/atenuar el globo. *(Asistentes: transcripción compacta, sin globo gigante.)*

### P3 · “Planifica mi viaje” → Desde → Hasta
- `Planifica mi viaje` (~línea 1085) no ofrece de entrada fijar solo **inicio** y **término**.
- Modo directo **Desde → Hasta** (reusar `Origen → Destino`, ~3979): Desde = “Mi ubicación” por defecto; Hasta = tocar el mapa o buscar. Todo sobre el mapa principal. “Agregar parada” = opción secundaria. *(Komoot/Google “Cómo llegar”.)*

## Notas
- No tocar control de acceso / `firestore.rules` (solo Inty). Probar de verdad en el Browser pane antes de cerrar cada punto. El artifact visual acompaña este spec como referencia de estética.

---

## 🔩 Anclas de código exactas (v7.46, `index.html`) — para implementar sin adivinar

- **Acento real de la app = `#fc4c02`** (naranja Strava; ya usado en `#fabReportar`, ~línea 366). El rediseño se alinea a ESE naranja, no a otro. Cualquier "otro color" en botones de acción → normalizar a `#fc4c02`.
- **Lo "genérico" es la clase `.ab`** (~línea 236: `background:#131c2f`, azul oscuro, `border-radius:12px`, full-width). La usan casi todos los botones → se ven todos iguales y genéricos. Definir jerarquía: **primario** (naranja `#fc4c02`), **secundario** (tonal), **texto** (sin fondo). No todo `.ab`.
- **Botón GPS que sobra:** `#btnGPSLibre` (HTML ~línea 808) usa clase `.ab` (📍 GPS). Ocultar con `#btnGPSLibre{display:none}` — la lógica `toggleGPS` queda intacta (se llama en otros sitios, p.ej. sobrevuelo/pre-vuelo). Dejar solo `gpsSignalBadge` (insignia) + recentrar (`_mapaRecentrar`, 🎯).
- **FAB estándar ya correcto:** `#fabReportar` (~línea 366): 58px, círculo, `#fc4c02`. Usarlo como patrón del FAB (si se ve grande, bajar a ~52px). Íconos de línea, no emoji.
- **Mapa principal:** `L.map(...)` + `tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png')` (~línea 4379) = OSM estándar (CLARO). Si se percibe "negro": revisar (a) filtro CSS oscuro sobre `#map`, (b) el fondo del contenedor mientras cargan tiles. El default debe verse claro/legible; el oscuro solo como opción de `btnCapaMapa`.
- **2º mapa al reportar:** `reportarEnRuta` (~línea 5108/9589) instancia mapas propios (`l.Map(` ~5144/5577/5603). Reusar el mapa principal (por defecto ubicación GPS; pin arrastrable para otro punto). No crear instancia nueva.
- **Globo de voz:** `pisteroBubble` (~líneas 468/623/2046). Dejar solo texto en pantalla; suprimir/atenuar el globo, franja fina para la transcripción en vivo.
- **Planificar:** `Planifica mi viaje` (~línea 1085) + `Origen → Destino` (~línea 3979). Modo directo Desde(=Mi ubicación)→Hasta(tocar mapa/buscar), sobre el mapa principal.

**Sesión Thunderobot 2026-07-29:** yo (Thunderobot) NO edito `index.html` para no chocar con el candado; la implementación + deploy + prueba en dispositivo real la hace la sesión del Lenovo. Quedo disponible para QC del resultado en librepedal.cl.
