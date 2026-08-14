# SPEC — Efectos visuales de clima en pantalla (prototipo, listo para integrar con ajustes)

**Estado:** prototipo iterado y aprobado por Inty en varias rondas de feedback directo
(ver historial abajo). Código base ya extraído a módulo real y **verificado que carga y
renderiza sin errores sobre el `index.html` real** (ver sección "Verificación técnica").
**NO está enganchado a `index.html` todavía** — falta lo listado en "Qué falta".
**Prioridad:** por debajo del lanzamiento de mañana (`TAREA-LANZAMIENTO-2026-08-15.md`).
No tocar `index.html` para esto hasta que el lanzamiento esté fuera, salvo que Inty diga
lo contrario — es una feature nueva, no un fix, y la regla de oro del lanzamiento es
"cero errores colaterales".

**Archivo:** `COORDINACION-IA/clima-fx-prototipo.js` — módulo standalone, IIFE, sin
dependencias. Se probó pegado encima del `index.html` real (servidor estático local) y
funciona; falta moverlo/adaptarlo para vivir donde corresponda (mismo patrón que
`voz-elevenlabs.js`/`perfil-comunidad.js`: archivo aparte en la raíz, cargado con
`<script src="...">`, agregado a la lista de `deploy-seguro.sh`).

---

## Qué es

Overlay de canvas fijo sobre toda la app (no una pantalla suelta) que dibuja el clima
real encima de la interfaz: lluvia con gotas que resbalan por el "vidrio", nieve con
escarcha que crece en los bordes, niebla, nubes, y ondas de calor ascendentes en
temperatura extrema. El usuario puede pasar el dedo por la pantalla para limpiar
localmente la acumulación (gotas/escarcha/niebla), como limpiar un vidrio empañado.

Pedido original de Inty (textual, resumido): *"quiero un recurso que quede en la
pantalla de la app si está lloviendo... ultra realista... debe tener movimiento...
esto tiene que ser inmersivo... aplicado a todas las pantallas, no solo una... el
usuario cuando pasa el dedo puede desempañar la pantalla."*

## Las 6 acciones (según condición de clima)
`lluvia` · `nieve` · `neblina` · `nubes` · `sol` (calor/ondas de calor) · `off` (sin efecto)

## Historial de iteración (por qué se ve como se ve — no rehacer sin releer esto)
Todo lo siguiente es feedback textual de Inty sobre versiones anteriores, ya resuelto:
- **Lluvia:** el primer intento (líneas + una elipse con blur) fue rechazado
  ("puras rayas no define el trabajo" / "parece de kindergarten"). Se rediseñó dos veces
  más hasta llegar a: campo denso de decenas de manchas irregulares (no círculos
  perfectos) más densas hacia abajo, cada una con borde oscuro tipo menisco + brillo
  duro + brillo difuso (simula refracción), más un puñado de gotas grandes con forma de
  lágrima que sí resbalan y van absorbiendo a las chicas de su camino. **Basado en una
  foto real que Inty mandó** de gotas en vidrio — no en una idea genérica de "gota".
- **Nieve:** el primer intento (copos cayendo + niebla genérica) se reemplazó por
  **escarcha que crece en ramas fractales desde los bordes de la pantalla** (generador
  recursivo, crece de a poco con el tiempo), porque las referencias reales de "nieve en
  vidrio" son eso, no copos — la nieve cayendo se mantuvo como capa secundaria.
- **Niebla:** blobs redondos → filamentos alargados (varias manchas encadenadas en una
  línea horizontal), porque las referencias reales de niebla son "fine, feather-like
  filaments", no manchas. **Bug real encontrado y corregido:** el gesto de limpiar no
  hacía nada en este modo (no estaba conectado a las partículas de niebla).
- **Nubes:** gris plano → cada nube tiene sombra (gris-azulada, abajo-derecha) y luz
  (blanco cálido, arriba-izquierda) recortadas a su propia forma, más forma orgánica
  (lóbulos aleatorios por nube, ninguna nube repite silueta).
- **Calor:** el primer intento (unas líneas horizontales tenues a la deriva) se juzgó
  "descuidado". Rediseñado a **columnas verticales** de ondulación que nacen abajo, se
  desvanecen arriba (gradiente), con doble frecuencia de onda — el lenguaje visual
  estándar de "calor ascendiendo", no franjas horizontales.
- **Acumulación (gotas/nieve) sin verse en grilla:** el primer método (un círculo con
  blur por celda) dejaba ver el patrón de la grilla subyacente. Se cambió a pintar los
  valores en un canvas chico y escalarlo al tamaño real dejando que el navegador
  interpole entre celdas (misma técnica que un mapa de calor suave) — elimina el patrón
  de raíz.
- **Invasividad:** intensidad/opacidad de niebla y acumulación bajada varias veces —
  Inty pidió explícitamente que la interfaz real se vea clara la mayoría del tiempo y
  que sólo se note "el exceso", no un velo constante.

**Regla que quedó fijada para todo trabajo visual futuro** (no sólo esto):
`workflow-referencias-reales-antes-de-disenar` — buscar fotos/referencias reales ANTES
de programar un efecto, no diseñar desde la idea genérica de memoria.

## Verificación técnica (hecha hoy, 2026-08-14)
Sobre un servidor estático local sirviendo el `index.html` real (sin backend, se ve la
pantalla de login):
1. `node --check clima-fx-prototipo.js` → sin errores de sintaxis.
2. Inyectado en vivo sobre el `index.html` real → **sin errores de consola propios**
   (los 2 errores de COOP/Firestore que aparecen son preexistentes de la app, no de
   este módulo).
3. Canvas se monta, tamaño correcto (`viewport × devicePixelRatio`).
4. Motor de dibujo confirmado funcionando (muestreo de píxeles: el canvas completo
   queda con contenido dibujado en modo `lluvia`).
5. `pointer-events:none` confirmado real: `document.elementFromPoint()` sobre el botón
   "Entrar con Google" devuelve el botón real, no el canvas — los clics/toques de la
   app SIGUEN funcionando con el overlay encima. El gesto de limpiar escucha en
   `document`, no en el canvas, por la misma razón (no bloquear scroll/tap).
6. Respeta `prefers-reduced-motion: reduce` (no monta nada si el sistema operativo lo
   pide) — confirmado que el guard funciona (se activó solo durante la prueba porque el
   navegador de prueba trae esa preferencia).

## 🔴 Problema real encontrado (no cosmético, hay que resolverlo al integrar)
**El canvas queda TAPADO por overlays reales de la app.** `#auth` (pantalla de login)
usa `z-index: 5000`; el canvas del clima usa `z-index: 5`. Confirmado con
`getComputedStyle` en vivo. Esto significa que mientras esté visible cualquier overlay
de la app con z-index alto (login, y probablemente modales — no se revisaron todos),
el efecto de clima queda invisible detrás, aunque siga dibujando (verificado que sí
sigue dibujando, sólo que tapado).

**No adiviné un número de z-index nuevo** porque no alcancé a relevar toda la escala de
z-index real de `index.html` (modales, menú, burbuja de Pistero, etc.) — hacerlo a
ciegas es la forma de "arreglar" esto rompiendo otra cosa. **Quien integre esto debe:**
1. `grep -n "z-index" index.html` y armar la escala real completa.
2. Decidir dónde entra el clima: probablemente por ENCIMA del contenido normal de cada
   vista, pero por DEBAJO de modales/diálogos críticos (SOS, confirmaciones) — así un
   modal nunca queda tapado por lluvia. Puede necesitar un valor único bien elegido, o
   dos capas (una baja para contenido normal, ninguna para modales).

## Qué falta para integrar de verdad (ninguno de estos pasos se hizo)
1. **Resolver el z-index** (arriba) contra la escala real de `index.html`.
2. **Enganchar a clima real.** Este módulo expone una sola función pública:
   `window.climaFxSetMode('lluvia'|'nieve'|'neblina'|'nubes'|'sol'|'off')`. Falta ubicar
   dónde vive hoy la lectura de clima actual (integración Open-Meteo ya existente en la
   app — no se relevó en esta sesión cuál función/variable es) y llamar a
   `climaFxSetMode()` cuando cambie la condición. Mapeo sugerido código
   Open-Meteo → modo: lluvia/llovizna → `lluvia`; nieve → `nieve`; niebla → `neblina`;
   nublado → `nubes`; despejado + temperatura sobre un umbral (¿30°C? a definir con
   Inty, mencionó "cuando sube mucho la temperatura") → `sol`; resto → `off`.
3. **Mover/renombrar el archivo** al lugar final (ej. raíz junto a `voz-elevenlabs.js`)
   y agregar `<script src="clima-fx.js" defer></script>` a `index.html`.
4. **Agregar a `deploy-seguro.sh`** — ya cubierto automáticamente si el archivo termina
   en `.js` en la raíz (el glob `*.js` ya lo generaliza, ver commit reciente), pero
   confirmarlo con un dry-run antes de deployar.
5. **Probar en teléfono real** — todo lo de arriba se verificó en navegador de
   escritorio contra un servidor estático, no en dispositivo móvil real ni con sesión
   logueada real ni con datos de clima reales.
6. **Definir umbral exacto de "sol" (calor extremo)** con Inty — hoy sólo existe el
   modo, no la regla de cuándo se activa.

## Qué NO se tocó
`index.html` no fue modificado por esta tarea — el módulo vive standalone en
`COORDINACION-IA/` a propósito, para no arriesgar nada antes del lanzamiento de mañana.
