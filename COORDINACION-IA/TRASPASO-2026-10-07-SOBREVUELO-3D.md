# Traspaso 2026-10-07 — Sobrevuelo 3D (rama `feature/sobrevuelo-3d`)

Para cualquier cuenta de Claude que retome. **Todavía es un prototipo: no toca la app** (`sobrevuelo-viaje.js` de `main`
sigue igual). Todo está en `COORDINACION-IA/mapa-navegacion/sobrevuelo-3d/` (leer su `README.md`, versiones v1 → v13).

## Cómo verlo
```bash
cd COORDINACION-IA/mapa-navegacion/sobrevuelo-3d && node servir.mjs
# abrir http://localhost:5178/COORDINACION-IA/mapa-navegacion/sobrevuelo-3d/  (tamaño teléfono)
```
Parámetros: `?p=pistero|ciber|orbe|slime|vinilo` (personaje), `?completo` (sin modo liviano). Botón "Tu ruta" carga un GPX
(hay GPX sintéticos de prueba en `pruebas/`).

## Qué aprobó Inty (en sus palabras)
- Línea pegada al camino y huella neón: "el iluminado se ve una joya".
- Cámara "siempre hacia donde se dirige" (nunca contra la ladera) y transiciones suaves: "bien, bien, bien".
- Pistero como **rostro** (sin bici) que gesticula según la ruta; "las expresiones tienen que ser acordes a todo lo que pasa".
- "Adaptarlo a todos los personajes": hechos Pistero actual, Cyberpunk, Orbe, Slime, Androide (12 caras cada uno,
  `EXPRESIONES-PERSONAJES.md`). Vidrio espera OK de forma; **mascotas: por ahora no** (Inty).

## Reglas aprendidas en esta sesión (aplican al integrar)
1. Con terreno 3D, **no usar `fitBounds`/`easeTo`/`flyTo` sin `freezeElevation`** (MapLibre 4.7.1 congela la altura y la
   cámara deja de seguir el relieve). Usar `cameraForBounds` + `jumpTo` (y no volver a aplicar el padding: el centro ya lo descuenta).
2. El elemento raíz de un marcador **no lleva `position`** (pisa el `position:absolute` de MapLibre). En la app,
   `.sbv-rider{position:relative}` puede estar corriendo a Pistero de la línea → revisar al integrar.
3. Valhalla `trace_route` devuelve 200 con solo un pedazo de la ruta: limpiar saltos/pinchazos, 1 punto cada 40 m,
   pegar por tramos y validar el largo de cada tramo.
4. Nunca un comentario `//` al final de una línea con más código en parches (pasó 3 veces): usar `/* */`.
5. **Cuidar el computador de Inty**: nada de renders largos sin GPU (se recalentó). Pruebas cortas y cerrar los Chrome de prueba.

## Pendiente (en orden)
1. Inty prueba en su teléfono y con un GPX suyo (Historial → Exportar GPX → "Tu ruta").
2. Decidir dónde se pega al camino en producción (Valhalla propio o un worker que llame una vez por ruta y guarde el resultado;
   el servidor de FOSSGIS es de demostración, uso justo).
3. Integrar en la app (rama aparte, mockup ya visto; nada a `main` sin ✓ de Inty).
4. Vidrio (cuando apruebe `vidrio4-compacto.jpg`) y mascotas (cuando Inty las quiera de vuelta).
