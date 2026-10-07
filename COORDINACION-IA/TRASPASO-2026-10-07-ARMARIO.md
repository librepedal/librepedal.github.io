# Traspaso 2026-10-07 (cierre del día) — 8.812 publicada, armario por modelo en curso

Para la cuenta que retome. Reemplaza a `TRASPASO-2026-10-07-NOCHE.md` y `TRASPASO-2026-10-07-CIERRE.md` (quedan como historia).
Reglas de siempre: `METODO-DE-TRABAJO-INTY.md`, CLAUDE.md global (puntos 0–10). **Nunca cambiar de rama en
`C:\Users\flgan\librepedal`** (carpeta compartida): worktree propio.

## 0) ⚠️ Antes de tocar Gemini en Chrome: revisar la CUENTA
El 2026-10-07 había **dos Chrome conectados** a Claude in Chrome. Uno ("Browser 2", deviceId `d9b28d66…`) tiene abierta la
cuenta de Google de **otra persona ("Nataly Díaz Muñoz")**: el chat de Pistero no existe ahí. No se usó (se cerró la pestaña sin
enviar nada). Inty abrió otro Chrome ("Browser 1", deviceId `b0354928…`) **sin revisar todavía qué cuenta tiene**.
**Regla:** antes de escribir en Gemini, abrir https://gemini.google.com/app/33df4033dcc9687b y comprobar que carga el chat de los
modelos de Pistero (si redirige a `/app` vacío, es otra cuenta: parar y avisar a Inty). Nunca usar la cuenta de otra persona.

## 1) Publicado hoy
| Versión | Qué trae | Estado |
|---|---|---|
| **8.811** | CI con Node 22; sobrevuelo de respaldo sin bici (rostro sin anillo, camino que brilla) | En producción |
| **8.812** | (a) **La app se actualiza al volver desde segundo plano** (era la causa del "scroll que se expande y se contrae" en Perfil: el teléfono de Inty seguía con código anterior a la 8.810); freno de recargas por 45 s en vez de por sesión. (b) **Avisos del mapa**: los peligros vencen del mapa según su vigencia (desde el último "sigue ahí"), **1** "ya no está" los quita para todos, y tarjeta **"¿Sigue ahí?"** al pasar a < 150 m. (c) Sobrevuelo 3D sin anillo/halo y respaldo por la línea pegada al camino. | En producción (librepedal.cl/version.txt = 8.812). Inty iba a probar en el teléfono: **preguntarle cómo le fue** (cerrar la app del todo una vez para tomar la 8.812). |

Pruebas nuevas: `tests/actualizar-al-volver.test.mjs`, `tests/avisos-vencen.test.mjs`, `tests/sobrevuelo-anillo-pegada.test.mjs` (58/58 verde).
CI y APK de la 8.812: **no se pudieron revisar** (el control de permisos bloqueó `gh run list`): mirar https://github.com/librepedal/librepedal.github.io/actions.

Inty autorizó (CLAUDE.md global, punto 10): **si no hay error, publicar sin preguntar** (salvo plata, diseños sin aprobar, datos).

### Vista previa (no es producción)
Rama `prueba/8.812` → https://prueba.librepedal.pages.dev (workflow `deploy-prueba.yml` + `LP_PAGES_BRANCH` en `deploy-seguro.sh`,
**solo en esa rama**, no en main). Usa la misma Firebase que producción. El login puede fallar ahí (dominio no autorizado: no probado).
Sirve para que Inty pruebe antes de publicar: empujar a una rama `prueba/*`. Borrar si no se usa.

## 2) "Elige tu Pistero" → pieza 2: ARMARIO POR MODELO (en curso)
Rama **`design/armario-por-modelo`** (carpeta `disenos-ui/armario-por-modelo/`). Nada de esto está en la app todavía.
- Referencias (aprobadas): https://claude.ai/artifact/CGhU1DovAsA7R2UcgAHjGg — Rocket League (calcomanías propias de cada auto),
  Fortnite (estilos), Brawl Stars (skins por personaje).
- **Maqueta tocable**: https://claude.ai/artifact/Vo5uvdEcq1MAMNJ9dq86Ne — `node armar.cjs` regenera `maqueta.html` (usa los modelos de
  `../elige-tu-pistero/fuentes` y el código real de la app para el Clásico: `pistero-personalizacion-datos.js`, `pistero-armario.js`,
  `pistero-apariencia.js`).
- **Decisiones de Inty** (obligatorias): fuera del armario las 6 pestañas de la bici (Bici, Pintura, Ruedas, Carga, Traje, Estela: ya no
  se ven en ningún lado; su código se guarda); el Clásico conserva sus piezas humanas dentro de "Piezas propias"; tres pestañas iguales
  para los 6 modelos: **Estilos / Piezas propias / Para todos**; "Para todos" = fondo de la tarjeta (Noche, Huella, Pendiente, Satélite);
  **3 piezas propias por modelo** (15). Cambios de piezas aprobados: Orbe "Anillo" → "Estela de luz"; Slime "Algo tragado" → "Fruta
  adentro"; Casco vivo "Luz trasera" → "Luz frontal y direccionales".
- Plan con la referencia real de cada pieza: `disenos-ui/armario-por-modelo/PIEZAS.md`.

### Estado de las 15 piezas
| Modelo | Pieza | Estado |
|---|---|---|
| Slime | Burbujas | ✅ vector (Inty: "está bien") |
| Slime | Gotitas | ✅ vector **rehecha** tras "están genéricas": textura de la gelatina + sombreado medido, hilo espeso que nace bajo el borde, domo que tiembla y se reabsorbe. **Falta su OK de la versión nueva.** `revision-gotitas.png` |
| Orbe | Chispas | ✅ vector (bengala) |
| Orbe | Estela de luz | ⚠️ hecha pero **casi no se ve**: el Orbe solo sube ~25/1024 al celebrar. **Decisión pendiente de Inty**: (1) cambiarla por "destello al hablar" (recomendado), (2) dejarla para el sobrevuelo, (3) darle vaivén al Orbe (cambia la animación aprobada). |
| Androide | Ojo de otro color | ✅ vector: lente con otro tratamiento (verdeazulado + destellos violeta/verde). `revision-ojo-androide.png` |
| Casco vivo | Cejas / Calcomanías reflectantes / Luz frontal y direccionales | ✅ vector dentro de su SVG. `revision-casco-vivo.png`. Pregunta abierta: ¿agrandar las direccionales (casi no se ven a 124 px)? |
| Orbe | Visera | ⏳ Gemini |
| Slime | Fruta adentro | ⏳ Gemini |
| Androide | Antena con resorte, Calcomanías reflectantes | ⏳ Gemini (+ rebote / destello en vector) |
| Cyberpunk | Cables de luz, Grafitis del casco, Visor partido | ⏳ Gemini |

Las 7 de Gemini necesitan: Chrome con **la cuenta de Inty** (ver punto 0) y **OK de Inty para descargar** las imágenes (una por pieza).
Método de producción (TRASPASO-2026-10-06-PISTERO-MODELOS.md §4–5): la pieza sola sobre verde croma #00FF00, **misma cámara y
encuadre** que las capas del modelo (Orbe 1024×1024; Slime, Androide y Cyberpunk 1376×768), recortar en el navegador y ponerla como capa.
Investigar cómo es la pieza real **antes** del prompt (referencias en PIEZAS.md). Una pieza a la vez, mostrada y aprobada.

### Cómo se hicieron las piezas vector (para seguir igual)
- `disenos-ui/armario-por-modelo/piezas-vector.js`: `PIEZAS_VECTOR[modelo][pieza](elModelo) → {quitar, estado?}` se agrega al SVG que
  arma cada `crearXCapas` sin tocar su código; las del Casco vivo son `{svg(expr,color,u)}` y se insertan en su SVG al redibujar.
- Medidas sacadas de las libs y de las imágenes (alfa > 128): no inventar posiciones.
- **Revisar en grande** (el panel del navegador de la app frena las animaciones y las pausa si está oculto):
  1. `window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16)` y
     `Object.defineProperty(document,'hidden',{configurable:true,get:()=>false})` en la página.
  2. Congelar una fase: `__PZ.slime.gotitas._revisar(t,'der')`.
  3. Serializar el `<svg>` del modelo a una imagen grande (XMLSerializer → Blob → Image → canvas), recortar y mandarla a un receptor
     local (un `http.createServer` de 5 líneas que guarda el PNG) para mirarla con Read. Mirar también a 124 px (tamaño de la tarjeta).
- Errores que se repitieron hoy y hay que cuidar: piezas demasiado chicas para la tarjeta de 124 px; comentarios `//` que se tragan
  código en la misma línea; escapes de regex que se pierden al editar con `node -e` (preferir Edit).

## 3) Pendientes con Inty (en orden)
1. Cómo le fue con la 8.812 en el teléfono (scroll de Perfil, avisos, "¿Sigue ahí?").
2. OK de las gotitas nuevas del Slime.
3. Decisión de la estela del Orbe y de las direccionales del Casco vivo.
4. Cuenta de Gemini (punto 0) + OK de descargas → las 7 piezas de Gemini.
5. Después de las 15 piezas: integrar el armario en la app (rama nueva desde main; con OK de la maqueta) y la pieza 3 (entrega de la mascota).

## 4) Limpieza (cuando ya no sirvan)
Worktrees de esta sesión: `librepedal-r8811`, `librepedal-r8812`, `librepedal-salto`, `librepedal-anillo`, `librepedal-avisos`,
`librepedal-prueba`, `librepedal-traspaso2` (todos mergeados salvo `prueba/8.812`) y `librepedal-armario2` (**en uso**: `design/armario-por-modelo`).

## 5) CIBER STAK
Sin cambios. F29 de octubre vence el 20-11-2026.
