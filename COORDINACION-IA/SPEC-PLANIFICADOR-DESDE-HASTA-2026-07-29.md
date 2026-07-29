# 🧭 SPEC — Planificador de rutas "Desde → Hasta" (feature nueva)

**Origen:** sesión Thunderobot, 2026-07-29. Feedback de Inty (#8 del QC del mapa): *"Planifica mi
viaje debería dar la opción de poner punto de inicio y de término solo."*
**App:** v7.50 · `index.html`. **Ejecuta:** sesión que despliega + **prueba en teléfono real** (protocolo).
**Filosofía (Inty):** menos es más, práctico, elegante, **copiar lo que ya funciona**.

## Estado actual (por qué es feature, no bug)
- "🗺️ Planifica mi viaje" (chip ~línea 1098) hoy SOLO hace `pisteroSugerencia('Planifícame un viaje
  de 2 días...')` → le pregunta a Pistero (IA) y responde **en texto**. **No existe** planificador de mapa.
- **PERO la infraestructura YA está en la app** (esto es clave — se reutiliza, no se inventa):
  - **OSRM** con perfiles `cycling`/`foot`/`driving` vía `osrmPerfil()` (~línea 1683/1799). Responde 200. Sin API key nueva.
  - **`geocodeDestino`** (~línea 2227) para buscar un lugar por nombre.
  - Mapa principal `map` (objeto ~2690, maplibre), marcadores `new maplibregl.Marker({color})...` (patrón ya usado en `reportarEnRuta`), estilo `LP_ESTILO_CALLES` (~4493), colores clima Open-Meteo.

## Principio de diseño
Copiar el flujo de **Komoot / Google "Cómo llegar"**: **Desde → Hasta**, todo **sobre el mapa principal**,
reutilizando OSRM + geocode. Sin turn-by-turn (eso es v2). Simple: 2 puntos, 1 ruta, km + tiempo.

## Diseño multidisciplinario (una mirada por disciplina)

### 🎨 UX / Diseño
- Panel simple encima del mapa (no un modal con otro mapa):
  - **Desde:** default **"📍 Mi ubicación"** (GPS). Cambiable (tocar mapa / buscar).
  - **Hasta:** "Tocar el mapa" o buscar por nombre.
  - Botón **"Trazar ruta"**.
- Al trazar: dibuja la ruta en el **mapa principal**, muestra **km + tiempo estimado** (perfil ciclista),
  y CTA **"Empezar"** (engancha el registro/seguimiento existente) o **"Guardar"**.
- Pines claros: **Desde = verde**, **Hasta = naranja `#fc4c02`**, línea de ruta naranja. Tap targets grandes.
- **"Agregar parada" = secundario, oculto por defecto** (menos es más).

### 💻 Frontend / Dev (anclas de código)
- **Entrada:** NO mezclar con el chip de Pistero. Dejar "Planifica mi viaje" (plan narrado por IA) como
  está, y agregar una entrada aparte **"🧭 Trazar ruta"** que abre el planificador de mapa. Son dos cosas
  distintas (plan en texto vs ruta real) — no confundirlas.
- **Puntos:** marcadores en el mapa principal (patrón de `reportarEnRuta`): `new maplibregl.Marker({color})
  .setLngLat([lon,lat]).addTo(mapPrincipal)`. Desde por GPS (`currentUserLocation`), Hasta por click en el
  mapa (`map.on('click', …)`) o `geocodeDestino`.
- **Ruta:** **reutilizar la llamada OSRM existente** (perfil `osrmPerfil()`): request con coords Desde/Hasta,
  tomar `geometry` (dibujar como source/layer de línea en maplibre), `distance` (km) y `duration` (tiempo).
- **Buscar:** `geocodeDestino` (~2227) ya existe.

### 🗺️ Routing / Datos
- **OSRM** (osrm.org, perfil cycling) — ya en uso, 200 OK, sin key. Reutilizar tal cual.
- **Geocode** vía `geocodeDestino` (Nominatim probable). Reutilizar.
- Ojo producción: el server demo de OSRM tiene límites; si el volumen crece, self-host o proveedor. Para v1 sirve.

### ✅ QA / prueba en teléfono (OBLIGATORIO antes de cerrar)
- En teléfono real: GPS como Desde, tap preciso para Hasta, la ruta se dibuja, km/tiempo correctos.
- **Variantes reales** (protocolo): Hasta muy lejos, mismo punto Desde=Hasta, sin señal GPS (pedir Desde
  manual), **OSRM caído** → degradar con gracia (línea recta + distancia aproximada + aviso, no romper).

### 🔒 Seguridad / límites
- No tocar `firestore.rules` ni control de acceso (solo Inty). No pagar nada.

## Orden de trabajo
1. Entrada "🧭 Trazar ruta" (sin romper el chip de Pistero).
2. Fijar **Desde** (GPS default) y **Hasta** (tap/buscar) con pines en el mapa principal.
3. **Trazar ruta** con OSRM (reusar `osrmPerfil()`) + mostrar km/tiempo.
4. Conectar con "Empezar ruta" (registro existente) / Guardar.
5. Degradación con gracia si OSRM/geocode fallan.

**v1 NO incluye** (menos es más): turn-by-turn, paradas múltiples visibles, perfil de elevación. Solo
**Desde → Hasta → ruta + km + tiempo**. Lo demás, v2.

— Sesión Thunderobot, 2026-07-29. El rediseño del mapa (v7.50) quedó cerrado; este es el próximo proyecto.
