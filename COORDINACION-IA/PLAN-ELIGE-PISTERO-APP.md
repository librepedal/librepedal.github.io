# Plan: "Elige tu Pistero" + armario por modelo dentro de la app (rama `feature/elige-pistero-app`)

Empezado el 2026-10-08. Diseños aprobados por Inty: maqueta "Elige tu Pistero" v2 (`disenos-ui/elige-tu-pistero/`,
https://claude.ai/artifact/Vy68jqzscPQ5uQT7jy9mmR) y armario por modelo con sus 15 piezas (rama `design/armario-por-modelo`,
`disenos-ui/armario-por-modelo/`). Decisiones: `TRASPASO-2026-10-07-ARMARIO.md` y `TRASPASO-2026-10-07-NOCHE.md`.

**Se publica todo junto (B + C + D):** si alguien elige al Orbe y la barra, Inicio o el armario siguen mostrando al Clásico,
la app queda incoherente. Hasta entonces, nada de esto se ve en producción.

## Fase A — hecha (`2b5d580`)
- `pistero-modelos/`: Cyberpunk, Orbe, Slime, Androide (copias de `feature/sobrevuelo-3d` = aprobado + 12 estados del
  sobrevuelo, único cambio `__pmRaf`), Casco vivo (`casco-vivo.js` = `pistero-frente.js`) y `modelos.js` (`PistModelos`).
- Capas recortadas una vez (`herramientas/pistero-modelos/recortar.mjs`) en WebP; `comparar.mjs` comprueba que se ven igual
  que antes y mide el tiempo de aparecer (85–380 ms → 7–30 ms en PC).

## Fase B — pantalla de elección (falta)
1. **Primera vez**: pantalla completa "Elige tu Pistero" (maqueta, pantalla 1) y confirmación "¡X ya es tu Pistero!"
   (pantalla 2). Se muestra una vez por cuenta, después del login y del modal de bienvenida (`auth-sesion.js` ~l.72,
   `lp_onboard_<cu>`), con la llave `lp_pm_elegido_<cu>`. Orden de la grilla: `PistModelos.orden()` (barajado, guardado).
2. **Armario** (`#v-customize`, arriba de `.pt-tienda` en `index.html` ~l.915): tarjeta "Tu Pistero" + "Cambiar modelo"
   (maqueta, pantalla 3).
3. **Guardar**: campo `modelo` en las opciones de Pistero (`_pistOpts`/`_pistGuardar` en `pistero-apariencia.js`; revisar que
   `_pistNormal` y `_ptLimpiar` no lo borren) y en el doc del usuario (`saveCustomization`) para otros teléfonos.
4. Miniaturas de las tarjetas: generar `pistero-modelos/img/mini-<id>.webp` desde el modelo real (como `th-*.jpg` de la maqueta).

## Fase C — armario por modelo (falta)
Pestañas iguales para los 6: **Estilos / Piezas propias / Para todos** (`disenos-ui/armario-por-modelo/maqueta-plantilla.html`,
`piezas-vector.js`, capas de Gemini en `disenos-ui/armario-por-modelo/gemini/`). El Clásico conserva su tienda actual dentro de
"Piezas propias". Fuera las 6 pestañas de la bici (su código se guarda). Las capas de las piezas de Gemini también se recortan una
vez (extender `recortar.mjs`).

## Fase D — el modelo elegido en toda la app (falta)
Puntos que dibujan a Pistero (buscados con grep el 2026-10-08):
- `_pintarMiPistero` (`pistero-apariencia.js` l.251) pinta todos los `.lp-mi-pistero`: chip de usuario (`index.html` l.347),
  "Pregúntale a Pistero" (l.712), barra de abajo (l.991).
- `_pistoDe(opts, expr)` / `_pistoNuevo(expr)`: tienda, ranking (`gamificacion-ranking.js`), Darma (`gamificacion-darma.js`),
  rutas (`rutas.js`), sobrevuelos. Propuesta: si `opts.modelo` es un modelo por capas, devolver una imagen fija de ese modelo con
  esa expresión (`pistero-modelos/img/<id>-<estado>.webp`, generadas desde el modelo real); el Clásico sigue igual.
- Sobrevuelo 3D: conectar `PERSONAJES` (`sobrevuelo-3d.js`) a los 4 modelos por capas con sus 12 caras (`'r:<estado>'`) y al Casco vivo.
- Marcador en el mapa para los demás (`riderMarkerHTML`, `ciclistas-mapa-clustering.js`): **pregunta abierta a Inty**.

## Fase E — medición de la prueba (falta; mostrar el diseño a Inty antes de programar)
Conteos por modelo, sin datos personales: primera elección, elegido hoy, días que se mantiene, probado y descartado, km con cada modelo.

## Preguntas abiertas a Inty
1. ¿Los demás ciclistas ven tu modelo en el mapa?
2. ¿A quienes ya usan la app se les muestra "Elige tu Pistero" una vez al actualizar? (recomendado: sí; sin eso la prueba casi no junta datos)
