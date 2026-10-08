# Otros ciclistas en tu viaje — plan técnico (2026-10-08)

> **Estado: DISEÑO, esperando el OK de Inty. No hay código en la app.** Rama `design/otros-ciclistas-viaje`.
> Maqueta + panel de referencias (privado de Inty): https://claude.ai/artifact/6RwkWVNuHGS9EG7CVAK6UH
> Fuentes de la maqueta: `disenos-ui/otros-ciclistas-viaje/` (`node armar.cjs` rearma `maqueta.html`).

Pedido de Inty (2026-10-08): "si hay más usuarios en la ruta y en el viaje grabado se puede identificar que lo va
rebasando o que el otro lo rebasa, que aparezcan en el mapa".

## 1. Hallazgo que cambió el enfoque
- La posición en vivo (`posiciones/{cu}` en RTDB, la que lee `_rtdSubscribeToUsers`) se publica **redondeada a 0,01° (~1 km)**
  a propósito, por privacidad (`motor-gps.js:448`, `suscripciones-comunidad.js:12`) y solo cuando te mueves ≥ 50 m. Con eso
  **no se puede** saber quién pasó a quién. Publicar la posición exacta reabriría el agujero que se cerró en septiembre
  (ver `worker-proximidad/worker.js`, cabecera).
- Lo que sí existe: el track exacto de cada ruta grabada, con la hora de cada punto, en `routesTrack/{id}` (solo el dueño
  lo lee; `firestore.rules`). `/routes/{id}` (público) guarda `startTime`, `endTime`, `distance` y `pointsPub` difuminado.

## 2. Decisiones de Inty (2026-10-08)
1. **Cómo se detecta:** cruce **al terminar el viaje**, en el servidor (como Strava Flyby). Nada en vivo.
2. **Qué se ve del otro** (sobrevuelo y video que se publica en redes): **solo su Pistero, sin nombre ni foto. Nunca si
   estaba en modo fantasma.**

Pendiente de su OK (en la maqueta, sección "Falta tu OK"):
- Aprobar el diseño visual.
- "Aparecer en viajes de otros": activado de entrada con aviso (recomendado) o apagado hasta que cada uno lo active.

## 3. Referencias estudiadas (panel en la maqueta)
- **Strava Flyby**: compara actividades después, reproduce en mapa + línea de tiempo, muestra quién pasó a quién. Interruptor
  "Todos / Nadie"; solo aparecen actividades públicas sin hora oculta. Problema real: mostraba nombre, foto y ruta completa
  → caso de una ciclista seguida hasta su casa (Total Women's Cycling). [soporte Strava](https://support.strava.com/en-us/articles/15401996-how-do-flyby-privacy-controls-work-on-strava)
- **Garmin GroupTrack**: en vivo, solo contactos, ≤ 40 km; el otro es un círculo con letra, distinto de tu flecha. [manual Edge 1030](https://www8.garmin.com/manuals/webhelp/edge1030/EN-US/GUID-0C183A1A-233D-4C26-ABEA-8DFBF6E2A57A.html)
- **Relive**: "momentos" como globos sobre la línea 3D + perfil abajo; amigos solo si los etiquetas.

## 4. Diseño (lo que muestra la maqueta)
- **Sobrevuelo 3D** (`sobrevuelo-3d.js`):
  - El otro = marcador propio `otro-mk`: su cara de Pistero (`_pistoDe(opts)`) en círculo de 46 px (el tuyo mide 66),
    **aro blanco siempre** (el tuyo usa el color de la pendiente: verde/amarillo/naranja/rosado/celeste; un color en el otro
    se confundiría). Pin de 16 px, `anchor:'bottom'`. Se dibuja solo mientras ande a ≤ ~1,1 km de ti (±3 min del cruce).
  - Lado a lado (|Δ| < 45 m): su burbuja se abre 46 px hacia un lado con un pin inclinado, para que no tape tu cara.
  - **Toma de cruce** nueva en el director de tomas (`planear()`): cámara baja y lateral (pitch 66, zoom ~16,9, rumbo de la
    ruta ± 40°) centrada entre los dos, en cámara lenta (~×0,35) durante ~4 s.
  - **Tarjeta** "Te pasó un ciclista · km 4,6 · por tu izquierda" / "Pasaste a un ciclista · km 9,0 · en plena subida": dos
    caras, la de quien queda adelante encima y a la derecha. Mismo lugar y estilo que la tarjeta `pp` de los momentos.
  - **Regla encontrada al probar:** nunca dos tarjetas a la vez. En la maqueta el momento "¡No doy más!" (km 9) salió encima
    del cruce. El cruce manda; el momento de Pistero espera a que termine la toma (o se salta si ya pasó su tramo). La cara
    de Pistero sí sigue cambiando según la cuesta.
  - **Marca en el perfil**: glifo propio (punto lleno = tú, anillo = el otro, curva punteada = por dónde pasó), blanco, en
    una píldora oscura arriba del perfil, en el km del cruce. Tocarla lleva el vuelo a ese km.
  - **Resumen** ("Así fue tu viaje"): filas nuevas `Te pasó un ciclista · km 4,6` / `Pasaste a un ciclista · km 9,0` con el
    glifo, borde blanco, en la misma lista `rs-hitos`.
- **Video 3D** (`rutas.js`, `_dibujarCompositeVideo`): el otro con la misma receta que tu cara (13 % del ancho) al 80 % y aro
  blanco; franja del cruce arriba de la barra inferior (16 % del alto), ~4 s. Sin cruces, el video queda igual que hoy.
- **Privacidad** (menú del perfil, junto a `#ghostBtn`, `index.html:350`): interruptor "Aparecer en viajes de otros".
  Simétrico como Strava: apagado = no apareces y tampoco ves cruces. El modo fantasma manda: si en algún momento del viaje
  estuviste en fantasma, ese viaje no participa.

## 5. Arquitectura
```
guardas la ruta (igual que hoy: /routes + /routesTrack)
   └─ cliente → POST worker-cruces {routeId}  + Firebase ID token
        ├─ verifica el token y que la ruta sea del que llama
        ├─ candidatos: /routes where startTime >= miInicio-6h and startTime <= miFin   (1 rango, 1 índice simple)
        │     → en memoria: endTime >= miInicio, participa==true, user != yo, bbox de pointsPub cruza mi bbox (+200 m)
        ├─ lee /routesTrack de cada candidato (cuenta de servicio; nunca se devuelve)
        ├─ detecta cruces (sección 6)
        └─ escribe /routesCruces/{miRouteId} y /routesCruces/{suRouteId} (los dos lados; el que guardó primero los ve al
           abrir su sobrevuelo) — idempotente: id del cruce = hash(par de rutas, km redondeado)
sobrevuelo / video: leen /routesCruces/{routeId} (solo el dueño) y dibujan. Sin red extra durante el vuelo.
```
- Worker nuevo `worker-cruces/` con la misma cuenta de servicio y patrón que `worker-proximidad` (JWT RS256 a mano, token en
  caché del isolate). CORS solo librepedal.cl / Pages. Sin logs de coordenadas.
- Campos nuevos en `/routes/{id}` al guardar: `participa` (bool) = interruptor activo **y** sin modo fantasma durante la
  grabación (se marca si `toggleGhost()` se activa mientras `gpsPoints` crece). Público, pero es solo un booleano.
- `/routesCruces/{routeId}`: `read: if dueño de la ruta`; `write: if false` (solo el worker).
- Documento de cruce (lo único que el cliente recibe):
  ```
  { id, tipo:'te-paso'|'lo-pasaste', km, d:metrosDesdeTuPartida, lado:'izq'|'der', pendiente,
    pistero:{modelo, casco, piel, lentes, ...}   // del /users/{uid}.pistOpts del otro
    serie:[[seg, metrosSobreTuRuta], ...] }      // ±180 s cada 2 s, el otro PROYECTADO sobre tu línea
  ```
  Nunca: uid, nombre, foto, lat/lon del otro, su inicio o su fin. La serie está en metros sobre **tu** ruta: aunque alguien
  la extrajera, solo dice dónde iba alguien en un camino que tú ya recorriste.

## 6. Detección (en el worker)
1. Recortar ambos tracks a la ventana de tiempo común; descartar puntos con salto > 22 m/s (mismo filtro que `limpiarHoy`).
2. Para cada punto del otro (remuestreado cada 2 s): proyectarlo sobre mi polilínea → `sB(t)` y distancia lateral. Válido si
   lateral ≤ 30 m y rumbo parecido (diferencia < 60°): mismo sentido.
3. `sA(t)` = mi avance por tiempo (interpolado). `Δ(t) = sB − sA`.
4. Cruce = cambio de signo de Δ con histéresis: |Δ| ≥ 15 m antes y después, dentro de 90 s, ambos moviéndose (> 5 km/h).
5. Ruido y casos borde:
   - **Rodar juntos** (≥ 5 min a < 30 m): no son adelantamientos; se descartan (v2: "Rodaste con un ciclista").
   - Semáforo / pausa: si alguno está detenido, el cambio de signo no cuenta.
   - Ida y vuelta de GPS: máximo 1 cruce por par cada 2 km.
   - Sentido contrario: ignorado en v1.
6. `km`, `pendiente` (de mi perfil) y `lado` (signo del producto cruz rumbo × vector lateral) para la tarjeta.

## 7. Pruebas antes de publicar (protocolo de Inty)
`tests/cruces.test.mjs`, sin red (Firestore y token simulados, como `tests/worker-sobrevuelo.test.mjs`):
- Detecta "te pasó" y "lo pasaste" con tracks sintéticos sobre la traza Futrono → Llifén (`traza-pegada.json`), con ruido GPS
  ±10 m y relojes desfasados.
- Sin falsos positivos: rodar juntos 10 min, semáforo, sentido contrario, rutas paralelas a 60 m.
- Privacidad: la respuesta y `/routesCruces` nunca contienen lat/lon, uid ni nombre del otro; `participa:false` y modo
  fantasma quedan fuera; el que apagó el interruptor tampoco recibe cruces.
- Reintentos y simultaneidad: la misma ruta enviada 2 veces → sin duplicados; los dos guardan a la vez → cada uno 1 cruce.
- Mutación: comprobar que las pruebas fallan al quitar la histéresis, el filtro de rumbo y el filtro de privacidad.
- Cliente: tarjetas en cola (nunca dos a la vez), marcadores que aparecen/desaparecen por ventana, video sin cruces = igual.
- Navegador a 390×844 y video 1080×1920 revisados a ojo; nunca con datos de producción (rutas sintéticas).

## 8. Costos
- Por ruta guardada: 1 consulta (decenas de docs de `/routes` en la ventana de ±6 h; con pocos usuarios, casi 0) + 1 lectura de
  `/routesTrack` por candidato que cruza el bbox + 2 escrituras por cruce. Lejos del límite gratis de 50.000 lecturas/día.
- Índice de Firestore: `routes.startTime` (simple, ya existe automático).

## 9. Abierto / a verificar al programar
- Los viajes con navegación se guardan en `/trips` (`gpsData.points`) y no siempre en `/routes`: confirmar qué viajes llegan
  al sobrevuelo y si v1 cubre ambos.
- El estado `ghostMode` durante la grabación hoy no se registra por viaje: agregar la marca.
- La tarjeta en la app usa el lugar de `pp` (top 66 px); en el prototipo quedó más abajo por el título en dos líneas.
- Los modelos nuevos (Cyberpunk, Orbe, Slime, Androide): el otro debería verse con su modelo cuando esos lleguen a `main`.

## 10. Cómo se hizo la maqueta (para repetirla)
- Prototipo real del sobrevuelo (`origin/feature/sobrevuelo-3d`, `COORDINACION-IA/mapa-navegacion/sobrevuelo-3d/`) + la capa
  `disenos-ui/otros-ciclistas-viaje/fuentes/otros-ciclistas.js` (marcadores, tarjeta, marcas del perfil, toma de cruce).
  Se carga con `<script src="otros-ciclistas.js">` después de `sobrevuelo-3d.js`; `_prep()`, `_irA(metros, cruce, lado)`.
- Fondo del Video 3D: `fuentes/video-mapa.html` (réplica del mapa de `rutas.js`) capturado con `fuentes/cdp-captura.mjs`
  (Chrome sin pantalla; salió sin inclinación, anotado en la maqueta).
- Caras: `fuentes/caras.json`, generadas con `_pistoDe` de `pistero-apariencia.js`.
