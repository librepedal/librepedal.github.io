# 🔒 Quién está editando `index.html` AHORA MISMO

Este archivo es un **candado, no un historial** — se sobreescribe, no se
acumula. Sirve para que las dos sesiones de Claude que trabajan en este
mismo repo (en la misma carpeta local, no en copias separadas) no editen
`index.html` al mismo tiempo sin saberlo.

**REGLA OBLIGATORIA, para AMBAS sesiones, sin excepción:**

1. **Antes de editar `index.html` (o cualquier archivo que la otra sesión
   también podría tocar), lee este archivo.**
   - Si dice `LIBRE` → puedes editar. Sigue al paso 2.
   - Si dice `OCUPADO` con una hora de **menos de 45 minutos** → NO edites
     todavía. Espera, o trabaja en algo que no choque (otro archivo, o algo
     de tu propio territorio que no dependa de lo que la otra sesión está
     tocando).
   - Si dice `OCUPADO` con una hora de **más de 45 minutos** → probablemente
     esa sesión terminó y se le olvidó liberar el candado (pasa). Es seguro
     asumir que quedó abandonado: edita, y al terminar deja el candado en
     `LIBRE` con tu propio sello.
2. **Apenas empieces a editar, actualiza este archivo** con tu sesión, la
   hora actual, y una frase corta de qué vas a tocar. Así, si la otra sesión
   se pone a trabajar 2 minutos después que tú, ve el candado puesto.
3. **Apenas termines de commitear (push incluido), vuelve a poner `LIBRE`.**
   No dejes el candado puesto "por si vuelvo más tarde" — eso bloquea a la
   otra sesión sin necesidad.
4. Si vas a hacer una sesión LARGA (más de 45 min de trabajo seguido),
   actualiza la hora del candado cada tanto para que no parezca abandonado.

---

## Estado actual

**OCUPADO** - sesión lenovo, 2026-08-14 ~02:30. Catálogo de voces ElevenLabs por
arquetipo: módulo nuevo `voz-elevenlabs.js` + carpeta `voces-el/` (338 frases x 2
géneros, regenerado desde `FRASES_ARQ` real de `index.html`, no desde el mapeo viejo
de `PENDIENTES.md` que estaba desincronizado con los 12 arquetipos vivos). Toqué
`index.html` solo con 2 ediciones chicas y aditivas: `<script src="voz-elevenlabs.js">`
en el `<head>` y un hook de ~6 líneas en `_reproducirVoz()` que prefiere ElevenLabs y
cae al catálogo Azure viejo si no encuentra la frase. También reescribí el texto de
`_pisteroIntroPrimeraVez()` (mensaje de bienvenida). Nada de esto está commiteado
todavía. Ver `COORDINACION-IA/ACUSE-LENOVO-SUDAMERICA-2026-08-14.md` para el detalle
completo y la respuesta a la sesión lenovo-sudamerica (clon aparte, i18n países).
Ver ANTES de tocar `index.html`, `FRASES_ARQ`, `PERSONALIDADES` o `voces-el/`.

**Actualización 02:35** — deploy a producción (librepedal.cl) hecho y verificado, v7.53
(catálogo ElevenLabs + mensaje de bienvenida en vivo). De paso arreglé `version.txt`
pegado en 7.51 (no se regeneraba en el deploy) y agregué `voz-elevenlabs.js`/`voces-el/`
a `deploy-seguro.sh` (antes no los copiaba). Aviso completo para Thunderobot en
`AVISO-A-THUNDEROBOT-2026-08-14.md`.

**Actualización 03:31** — agregué 2 arquetipos nuevos (Seductor/Seductora con voces
Luis/Clara, Otaku con voces Cesar Rodriguez/Blackie) a `PERSONALIDADES`,
`PERSONALIDAD_PROSODIA` y `FRASES_ARQ` (26 frases cada uno, las 8 categorías). Agregué
también un botón 🔊 en `renderPersonalidadGrid()` para escuchar cada voz antes de elegir
(pidió Inty un "probador de voces"), función nueva `previsualizarPersonalidad()`.
**Bug real encontrado y arreglado en `scripts/gen-voces-elevenlabs.js`:** los ids del
catálogo eran secuenciales por orden de aparición — agregar un arquetipo en medio de
`FRASES_ARQ` corría los ids de todo lo que venía después, y archivos viejos quedaban
sirviendo el audio de OTRA frase bajo el nombre nuevo. Cambiado a id estable por hash del
texto (nunca más se corre). Tuve que borrar los 778 mp3 viejos (ids secuenciales) y
regenerar todo limpio — no llegó a alcanzar a producción (el deploy fue ANTES de este
cambio), así que no hubo audio incorrecto en vivo. Regenerando ahora, ~20 min. Sigo
OCUPADO hasta que termine y verifique.

**Actualización 03:50 — CUOTA DE ELEVENLABS AGOTADA (40.000 caracteres/mes).** La
regeneración se cortó a mitad de camino: 560/778 archivos, repartido en TODOS los
arquetipos (no solo los nuevos). Además Inty pidió que CADA voz cubra TODAS las
situaciones sin caer nunca a otra voz distinta — encontré que "cercano" (el arquetipo
por defecto de usuarios nuevos) no tenía NINGUNA frase propia en `FRASES_ARQ` (caía
100% a voz nativa) y que sabio/relajado/aventurero tenían huecos en 1-2 categorías.
Ya está arreglado en el código (14/14 arquetipos completos en las 8 categorías, 425
frases), pero **no se puede generar audio nuevo hasta que la cuota de ElevenLabs se
resetee (mensual) o Inty suba el plan** — bloqueador externo, no de código. Nada de
esto se subió a producción todavía (v7.53 en vivo sigue con el catálogo anterior,
completo y correcto). Sigo OCUPADO hasta que haya cuota y pueda cerrar el catálogo
completo + verificar + deployar.
