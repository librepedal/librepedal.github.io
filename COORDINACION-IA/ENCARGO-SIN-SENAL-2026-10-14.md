# LibrePedal · Encargo "sin señal" (para aplicar cuando esté el repo)

Orden: 1 → 2 → 3 → 4 → 5. Hacer y probar uno a la vez.

## 1. Giros nunca esperan a internet (chico)
- En la cola de voz de Pistero, marcar frases como `prioridad: 'giro' | 'seguridad' | 'normal'`.
- Para `giro` y `seguridad`: pedir la voz en vivo con timeout de **2 s** (AbortController).
  Si no llega → hablar de inmediato con la voz del teléfono (speechSynthesis / TTS nativo, `es-CL` o `es`).
- Para `normal` se mantiene el timeout actual (12 s), pero nunca debe bloquear una frase `giro` que venga detrás:
  un giro nuevo interrumpe y salta la cola.
- Probar: modo avión → giro se oye con voz del teléfono. Red lenta (DevTools "Slow 3G" o 1 rayita real) → giro se oye en ≤ 2 s.

## 2. Aviso "Sin señal" (chico)
- Si el recálculo falla por red, Pistero dice **una sola vez**:
  "Sin señal: sigue la línea del mapa, recalculo apenas vuelva."
- Al volver la señal, recalcular y resetear el aviso.

## 3. Aviso para instalar voz española sin conexión (chico)
- Al tocar "Descargar ruta", si la voz del teléfono no está disponible offline, mostrar un aviso único:
  Ajustes → Texto a voz → Google → Instalar datos de voz → Español.
- Guardar en localStorage que ya se mostró.

## 4. Mapa de navegación a OpenFreeMap (mediano)
- Cambiar la fuente de mosaicos de la navegación (hoy tile.openstreetmap.org) al mismo estilo OpenFreeMap del mapa principal.
- "Descargar mapa de la ruta" pasa a descargar desde OpenFreeMap (mismos 4 niveles de zoom).
- Motivo: la política de OSM prohíbe botones de "descargar para usar sin conexión" y bloquea sin aviso.

## 5. "Descargar ruta" baja también las voces (mediano)
- Al descargar: generar todas las frases de giro de la ruta con la voz de Pistero y guardarlas (Cache Storage / IndexedDB).
- En ruta: si la frase existe guardada, reproducir la guardada; si no, seguir la lógica del punto 1.
