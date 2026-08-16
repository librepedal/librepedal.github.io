# 🔬 Prompt maestro de CALIDAD — Libre Pedal

Escrito por Claude a pedido explícito de Inty (2026-07-13), en el momento en que
la app está por mostrarse a la élite del ciclismo chileno para que la
promocione. Esto no es el documento de visión de producto (ese es
`VISION-MAESTRA.md`); es el protocolo de **cómo se trabaja** en este código,
sesión tras sesión, para que lo que se publique nunca decepcione a nadie que
lo pruebe por primera vez.

**Toda IA que trabaje en este repo (Claude, Gemini, cualquier otra) debe leer
este documento antes de tocar código, y seguirlo sin excepción.** No es una
sugerencia de estilo: es la vara con la que Inty va a medir cada entrega.

---

## 0. Por qué existe esto

Inty lo dijo con estas palabras: *"quiero que esto funcione al 1000 por
ciento... y mejor."* No es una exageración retórica — es el estándar. La app
va a estar frente a ciclistas de verdad, algunos de alto rendimiento, que la
van a probar una vez y decidir en minutos si vale la pena recomendarla. No hay
una segunda primera impresión. Cada bug que un usuario real encuentre en ese
momento no es "un detalle a pulir después": es una oportunidad perdida de que
la élite del ciclismo chileno confíe en esto.

---

## 1. Principios no negociables

1. **Causa raíz, nunca parche.** Si algo falla, se investiga HASTA encontrar
   por qué falla de verdad (leer el código relevante, no asumir) — no se tapa
   el síntoma con un `try/catch` silencioso ni con un valor por defecto que
   esconde el problema. Ejemplo real de esta sesión: el bug de velocidad
   (70 km/h real mostrado como 100+) no se "arregló" limitando el número
   mostrado — se encontró que el cálculo ignoraba `coords.speed` del chip GPS
   y se corrigió la fuente.
2. **Mismo patrón de bug, en TODO el código, no solo donde se reportó.**
   Cuando se encuentra una clase de error (ej. "esta función nunca sincroniza
   a Firestore", "este cálculo no valida NaN"), se busca ese MISMO patrón en
   el resto del archivo antes de dar por cerrado el trabajo. El bug del
   ranking (v6.52) se encontró así: no bastaba con arreglar dónde alguien lo
   notó, había que preguntarse "¿qué otros caminos tienen el mismo hueco?".
3. **Nunca declarar "listo" sin probarlo de verdad.** Ni "debería funcionar"
   ni "esto lo arregla" — se verifica con evidencia concreta (ver sección 4)
   antes de decir que algo está terminado.
4. **Sin atajos visuales ni de UX.** Si la app hace algo (una animación, un
   personaje, una transición), se hace con el mismo cuidado que le pondría
   una app profesional del rubro — Strava, Komoot, Google Maps — no la versión
   más fácil de programar. Esto ya es una exigencia previa de Inty y sigue
   vigente con más razón ahora.
5. **Honestidad radical sobre lo que NO se pudo probar.** Este entorno no
   tiene un teléfono real, ni GPS real, ni el plugin nativo del APK
   corriendo de verdad. Cuando algo se verificó solo con simulación en
   navegador (mockeando `SpeechRecognition`, posiciones GPS falsas, etc.), se
   dice explícitamente — nunca se da la impresión de "probado en dispositivo
   real" si no lo fue.
6. **Nunca tocar datos de producción sin un mock verdadero.** Ya pasó en esta
   sesión (v6.49): un intento de mockear Firestore mal hecho (`window.db=...`
   en vez de reasignar la variable léxica `db`) escribió un documento de
   prueba falso en la base de datos real. Se detectó y se corrigió al toque,
   pero la lección queda: antes de probar cualquier función que escribe a
   `db`, confirmar que el mock realmente intercepta (probarlo con algo
   inofensivo primero, o revisar el resultado inmediatamente después).

---

## 2. Protocolo antes de tocar código

1. **Leer antes de asumir.** Nunca se edita una función sin haberla leído
   completa primero, ni se asume el nombre/firma de otra función sin
   confirmarlo con Grep. El código de Libre Pedal tiene patrones sutiles
   (ej. `normalizar()` cambia la longitud del string al sacar tildes, `db` es
   una variable léxica no una propiedad de `window`) que solo se descubren
   leyendo.
2. **Buscar si ya existe algo parecido.** Antes de construir una función
   nueva, grep por el concepto — varias veces en este proyecto ya existía una
   pieza reusable (`geocodeDestino`, `_fetchT`, `calculateDistance`,
   `lpConfirmar`) que evitó duplicar lógica.
3. **Entender el "por qué" detrás del código existente**, no solo el "qué".
   Los comentarios de este archivo casi siempre explican una decisión no
   obvia (ej. por qué el piso de velocidad es 6 y no 4, por qué `dtMs>20000`
   re-ancla en vez de seguir comparando). No deshacer esas decisiones sin
   entender primero por qué están.

---

## 3. Protocolo de implementación

1. Cambios quirúrgicos: tocar lo mínimo necesario para resolver el problema
   real, sin refactors de paso ni abstracciones que nadie pidió.
2. Comentarios solo donde el POR QUÉ no es obvio — nunca describiendo el QUÉ
   (eso ya lo dice el código bien nombrado).
3. Nombres y strings de cara al usuario, en el tono de Pistero (chileno,
   cercano, con gracia) — nunca un mensaje de error genérico tipo "Error al
   procesar la solicitud".
4. Todo dato mostrado al usuario que provenga de una fuente externa
   (Nominatim, OSM, reportes de otros usuarios) pasa por `escapeHTML()`.
5. Toda escritura a Firestore que dependa de un valor leído previamente
   (contadores, arrays, mapas) usa operaciones atómicas
   (`FieldValue.increment`/`arrayUnion`/`arrayRemove`/rutas de punto), nunca
   "leo todo, modifico en el cliente, escribo todo de vuelta" — eso ya causó
   pérdida de datos por carreras de escritura antes en este proyecto.

---

## 4. Protocolo de verificación (obligatorio antes de decir "listo")

1. **Sintaxis**: `node --check` vía `new Function()` sobre cada bloque
   `<script>` del HTML. Cero errores, sin excepción.
2. **Navegador real** (Browser pane): para todo cambio observable en la UI o
   en la lógica de la app.
   - Simular la interacción REAL (clicks, eventos de voz, fixes de GPS
     falsos), no solo llamar la función y mirar que no tire una excepción.
   - Probar el camino feliz Y los casos límite: sin conexión, sin GPS, con
     `coords.speed` null, con datos vencidos, con el usuario tocando dos
     cosas casi al mismo tiempo (doble-submit).
   - Cuando el cambio toca algo que ya funcionaba, reverificar EXPLÍCITAMENTE
     que lo viejo sigue funcionando igual (no asumir que no se rompió nada).
3. **Nunca simular con datos que puedan tocar producción sin confirmarlo.**
   Si una prueba en el navegador corre contra la app real (no un servidor de
   pruebas), verificar primero que cualquier mock de red/Firestore
   efectivamente intercepta antes de ejecutar la prueba completa.
4. Reportar la verificación con evidencia concreta (qué se probó, qué
   resultado dio), no con la palabra "verificado" sola.

---

## 5. Protocolo de despliegue

Sin cambios respecto al que ya se sigue en este proyecto — se reafirma:

1. Bump de versión en lockstep: `APP_VERSION` (index.html), `version.txt`,
   `sw.js` (`CACHE`). Los tres deben coincidir siempre.
2. Entrada nueva en `BITACORA.md`, arriba de todo, con: qué se reportó/pidió,
   causa raíz encontrada (no solo el síntoma), qué se cambió, y la evidencia
   concreta de verificación (no "probado", sino QUÉ se probó y qué dio).
3. Deploy a Cloudflare Pages, verificar en vivo (`curl` a `version.txt` con
   cache-busting, reintentando si el edge todavía no propagó).
4. Commit + push a GitHub con mensaje que explique el "por qué", no solo el
   "qué".
5. Nunca tocar `firestore.rules`, `MI-CLOUDFLARE.txt` ni ningún archivo de
   credenciales — esos solo los publica Inty.

---

## 6. Autocrítica antes de reportar terminado

Antes de decir "esto está listo", repasar con ojo crítico:

1. **¿Qué pasaría si el usuario hace lo contrario de lo que probé?** (toca
   dos veces rápido, pierde señal a mitad de camino, cambia de modo de
   actividad a mitad de viaje, gira la pantalla, la apaga).
2. **¿Este cambio pudo romper algo que ya andaba bien?** Repasar los otros
   lugares que llaman a la misma función/variable que se tocó.
3. **¿Hay otro lugar del código con el mismo problema que acabo de
   arreglar?** (ver Principio #2 de la sección 1).
4. **Si Inty lo prueba ahora mismo en su teléfono, ¿qué es lo primero que
   podría salir mal?** Pensar como usuario nuevo, no como quien escribió el
   código.

---

## 7. Postura ante un error encontrado por Inty (o por un usuario real)

Cuando algo falla en producción y Inty lo reporta:

1. Nunca a la defensiva, nunca minimizar. Se investiga la causa raíz de
   verdad, aunque tome tiempo.
2. Se explica QUÉ pasó y POR QUÉ, en términos claros, antes de mostrar la
   solución — Inty tiene que poder confiar en que se entendió el problema
   real, no que se tapó el síntoma.
3. Se aplica el Principio #2: ese mismo patrón de bug se busca en el resto
   del código antes de cerrar el tema.
4. Se documenta en `BITACORA.md` con la misma honestidad: qué se rompió, por
   qué no se detectó antes, qué se aprendió.

---

## Cómo se usa este documento

- Se lee (o al menos se repasa esta sección de principios) al empezar
  cualquier sesión de trabajo en Libre Pedal, no solo la primera vez.
- No reemplaza `LEEME.md` (protocolo operativo: versión sincronizada, deploy,
  coordinación entre IAs) ni `VISION-MAESTRA.md` (hacia dónde va el
  producto) — los tres se complementan.
- Si algo en este documento choca con una instrucción puntual de Inty en el
  momento, manda la instrucción puntual — pero se le hace notar la tensión
  en vez de resolverla en silencio.
