# ✅ Pendientes — Libre Pedal

Marca con `[x]` lo hecho y anótalo en `BITACORA.md`. Actualizado **2026-07-20**,
versión actual del proyecto: **v7.14** (en vivo en librepedal.cl).

---

## 📌 ESTADO AL 2026-07-20 — leer antes de tomar cualquier tarea

Sesión larga con Inty. **14 versiones (v7.02 → v7.14), todas desplegadas y
verificadas.** Detalle completo en `BITACORA.md`; acá solo lo que cambia el trabajo
de quien entre después:

**Resuelto hoy (no volver a tomarlo):**
- Detección de caídas: no avisaba una caída a velocidad, y saltaba con el teléfono
  caído al suelo. Arreglado y con 20 tests.
- Avisos de pendiente: miraban dos puntos sueltos y mentían en bajada. Arreglado.
- El botón atrás del teléfono cerraba la app. Arreglado.
- La voz vieja se colaba al bajar la señal. Arreglado.
- **16 de 29 usuarios eran INVISIBLES en el ranking** (Firestore excluye del
  `orderBy` los documentos sin el campo). Arreglado y se auto-repara solo.
- Ranking separado por disciplina: los km en auto ya no compiten con los pedaleados.
- Los arquetipos de Pistero pasaron a ser **tipos de ciclista** (12, con femenino).
- Compartir el viaje recién terminado. Nueva landing en `/landing`.

**Doctrina nueva y OBLIGATORIA:** `VISION-MAESTRA.md` tiene ahora dos doctrinas
—cómo la app se adapta al modo de viaje, y cómo Pistero sorprende sin invadir—
acordadas con Inty. **Leerlas antes de tocar interfaz o voz.**

**Red de tests:** 8 archivos, se corren con `npm test`. Varios **leen `index.html`
directo** en vez de reimplementar la lógica, porque los bugs estaban en los datos.
Si un test no puede fallar, no sirve: los nuevos fallan a propósito si les cambian
el nombre a las funciones que auditan.

**Lo que necesita a Inty (nadie más puede):** los 4 secretos de firma en GitHub
para el `.aab`, las capturas reales para la ficha de Play Store, y probar en un
Android de verdad los umbrales de caídas.

---

## 🧩 Simplificación de interfaz pedida por Inty (2026-07-14) — EN CURSO

Inty: "debemos simplificar la aplicación... hay muchos botones, hay cosas
que están duplicadas... sin perder la calidad de la parte visual... los
botones son muy grandes en alguna ocasión." Ver detalle completo en la
entrada **v6.72** de `BITACORA.md`.

- [x] Fusionar "Mis viajes"/"Rutas" (dos pantallas casi iguales) en una sola
  (`v-trips`), de paso arreglado un bug real (Bitácora sin sincronizar).
- [x] **RESUELTO (v6.91).** Reducir accesos duplicados a Stats/Logros: en
  `v-customize` (Perfil) quedaban 2 botones + el badge de Darma clickeable
  arriba de todo, antes del contenido real de la pantalla. Se sacaron los 2
  botones (Logros y Estadísticas ya viven solo en la Esfera) y el badge de
  Darma pasó a ser solo dato (sin onclick), mismo criterio que el es-bottom.
  De paso se corrigió un paso del tutorial guiado que apuntaba al botón
  borrado.
- [x] Renombrar "Compartir ubicación" del SOS vs. seguimiento en vivo (ya no
  comparten texto).
- [x] **RESUELTO (v6.75, sesión 1).** Inty confirmó "sin redundancia... la
  navegación debe seguir la misma lógica" y delegó la decisión. NO se borró el
  HUD (se conserva el valor de v6.09): se separó por tipo — km / mi puesto /
  viajes pasaron a DATO puro (`<div class="es-dato">`, sin onclick), y 🔔 Avisos
  (notificación) + 🎤 Mic (acción) siguen accionables. Para ir a Stats/Logros/
  Viajes hay UN solo camino: la Esfera.
- [x] **RESUELTO (revisado v6.90, sin cambios necesarios).** Botones
  sobredimensionados: el CSS base (`.ab`, `.bg`) usa `min-height:44px` —
  exactamente el estándar de accesibilidad táctil de Apple/Google, no es
  "grande". Se revisó todo el archivo buscando overrides inline con padding
  o font-size excesivos: solo apareció el botón "Estoy bien" de la alerta de
  caída, que a propósito es grande (acción de emergencia, no debe fallar el
  toque). No se encontró ninguna otra instancia real.

## 🔍 Encontrado en el protocolo de excelencia (2026-07-17), sin arreglar — riesgo de hacerlo mal

- [ ] **Progreso de Retos multi-dispositivo.** `calcularProgresoReto()` solo
  suma `rutasLocales()` (rutas guardadas en ESTE celular) — si alguien
  cambia de teléfono o reinstala, su progreso de un reto activo se ve en
  cero aunque haya pedaleado los km reales (que sí están respaldados en la
  nube, colección `routes`). Arreglarlo bien requiere sumar nube + local SIN
  contar la misma ruta dos veces (una ruta puede existir local Y en la nube
  a la vez, vinculada por `firebaseId` — pero no siempre está vinculada de
  inmediato). El riesgo de un fix apurado es peor que el bug actual:
  duplicar kilómetros y dar por cumplido un reto que no se cumplió de
  verdad. Encontrado por Claude sesión 2 revisando `calcularProgresoReto`
  (línea ~6799 de `index.html`) — no tocado a propósito, para hacerlo bien
  con más tiempo/testing real, no a las apuradas.

## 🩺 Monitoreo real con Sentry (2026-07-18) — nuevo, para ambas sesiones

Inty conectó un token de API de Sentry — vive en `MI-SENTRY.txt` (gitignored,
en la raíz del proyecto, mismo patrón que `MI-CLOUDFLARE.txt`). Con eso
cualquier sesión puede consultar y resolver errores REALES de producción por
API (no hace falta que Inty entre a Sentry y pegue capturas). Org
`librepedal-gs`, proyecto `javascript` (id `4511700418494464`).

Ejemplo de consulta (bash):
```
TOKEN=$(grep "^TOKEN=" MI-SENTRY.txt | cut -d= -f2)
curl -s -H "Authorization: Bearer $TOKEN" "https://librepedal-gs.sentry.io/api/0/organizations/librepedal-gs/issues/?project=4511700418494464&query=is%3Aunresolved&statsPeriod=14d&limit=50"
```
Ojo: para distinguir un error real de un artefacto de pruebas (localhost,
sandbox), revisa el tag `url` del evento — si dice `localhost` o
`127.0.0.1`, es de una sesión de Claude probando, no un usuario real.

**Ya corregido (v6.98):** bug real en `frame()` (video 3D) — puntos de ruta
con lat/lon corrupto rompían la animación. Ver entrada v6.98 en BITACORA.

**Quedan sin revisar** (reales, confirmar con la API antes de tocar código):
- `obtenerFraseUnica` — `Cannot read properties of undefined (reading 'push')`, 7 eventos (issues `7611282094` y `7613232824`)
- `FirebaseError: Missing or insufficient permissions` — 10 eventos, sin breadcrumbs, posible relación con la ventana de carrera anon→token personalizado ya documentada arriba (issue `7608893099`)
- MapLibre `isStyleLoaded` undefined — 2 issues relacionadas, posible carrera al cambiar de capa de mapa o abrir un mapa antes de que cargue (issues `7611377185`, `7607413878`)
- `"Can't find variable: cv"` — solo 1 evento pero raro si es real, `cv()` es la función de navegación central (issue `7607169932`)
- MapLibre `"Source mlline_1 cannot be removed while layer... is using it"` — orden de remove entre layer/source (issue `7601335978`)
- Varios `FetchEvent.respondWith` / IndexedDB / ServiceWorker storage — probablemente hipo de red o cupo de almacenamiento del dispositivo, baja prioridad salvo que se repitan mucho más

## 🤝 ACUERDO DE COORDINACIÓN sesión 1 ↔ sesión 2 — PERMANENTE (actualizado 2026-07-13 por sesión 2)

**Pedido explícito de Inty: "quiero que desde ahora haya una coordinación sin
fallas... esa indicación la tienes que hacer que se acaben los créditos de
esta cuenta y la otra cuenta de Claude debe hacer lo mismo."** Esto no es una
regla de una sesión — rige para TODA sesión futura de cualquiera de las dos
cuentas, hasta nuevo aviso. Toda IA que abra este proyecto: lee esto ANTES de
tocar `index.html`, no solo la primera vez.

**¿Por qué no "uno edita, el otro revisa"?** Se evaluó y se descartó a
propósito: ustedes dos usan cada cuenta cuando les acomoda, no en paralelo
sincronizado — un modelo editor/revisor en tiempo real no aplica acá, y
además reduce el rendimiento a la mitad (una sesión queda esperando a la
otra). Lo que sí funciona con dos sesiones asíncronas compartiendo la misma
carpeta es: **candado de archivo + territorio dividido + commits chicos y
frecuentes.** Ninguna de las tres reglas por sí sola alcanza — juntas sí.

**Lo que pasó y no debe repetirse:** el protocolo git (pull/push) NO protege
contra dos IAs editando `index.html` al mismo tiempo — el que guarda último
pisa al otro. El 2026-07-13 sesión 2 dejó 72 líneas sin commitear (manos
libres + fix km + ruta por voz) y sesión 1, antes de tocar nada, las
**rescató** (commit `3da21e4`, con crédito a sesión 2) para no perderlas. No
fue un desastre esa vez, pero fue suerte de que alguien mirara a tiempo.

**REGLAS OBLIGATORIAS para no chocar (ambas sesiones, todas las veces):**
1. **Lee `COORDINACION-IA/EN-USO.md` ANTES de tocar `index.html`.** Es un
   candado real: dice quién está editando ahora mismo (o `LIBRE`). Si está
   ocupado por la otra sesión hace menos de 45 min, espera o trabaja en otra
   cosa. Al empezar a editar, marca tu candado; al terminar de commitear
   (push incluido), vuelve a dejarlo en `LIBRE`. Instrucciones completas ahí.
2. **`git status` ANTES de editar, igual — el candado no reemplaza esto,
   lo complementa.** Si hay cambios sin commitear que no son tuyos, no
   edites: rescátalos con un commit (crédito al otro) o espera.
3. **Comitea seguido, no dejes diffs grandes sin subir.** Un cambio a medias
   sin commitear es una bomba para la otra sesión — y deja el candado de
   `EN-USO.md` puesto más tiempo del necesario.
4. **Divídanse el frente para no tocar las mismas funciones a la vez**
   (ver reparto de territorio abajo) — reduce cuánto necesitan el candado.
5. Nunca deployar/commitear la carpeta completa (tokens `MI-*.txt`) — carpeta
   limpia siempre.

**Reparto actual de trabajo:**
- **Sesión 1 (Claude, esta):** VOZ y PERSONALIDAD — arquetipos de Pistero (10+ personalidades: sensible,
  sin bromas, motivador, zen, etc.), bancos de frases por arquetipo/modo, y la voz más humana (TTS
  neuronal por el Worker `librepedal-ia`). + La **base de analytics** (v6.53) ya está — instrumenta con
  `trackEvent('voz', arquetipo)` cualquier cosa nueva de voz para medir cuál gusta.
- **Sesión 2 (otra cuenta Claude):** su barrido/navegación + manos libres + fix km + ruta por voz (ya
  rescatado). Sigan con lo suyo; si van a tocar `handleVoiceCommand` o `personalidad()` del Worker,
  avisen en la bitácora primero porque sesión 1 está trabajando ahí.

**Lo que hizo sesión 1 hoy (para que sesión 2 sepa):**
- v6.53: base de ANALYTICS (qué usan, dónde pasan tiempo) + botón "📊 Analíticas de uso" en panel admin.
- Rescató el trabajo sin commitear de sesión 2.
- Próximo: 10+ arquetipos de personalidad de voz, cada uno etiquetado para la analytics.

**Lo que hizo sesión 2 hoy (para que sesión 1 sepa):**
- v6.55: cronómetro completo — pausa manual ahora también en GPS libre (antes solo
  en navegación a destino), sistema de vueltas/lap (`marcarVuelta()`, `verVueltas()`),
  reinicio manual del tiempo sin perder distancia/track (`reiniciarCronometro()`).
- Verificó que el rescate de sesión 1 (commit `3da21e4`) quedó íntegro, incluida una
  corrección que hice DESPUÉS de dejar el archivo sin commitear (negación en la
  elección de ruta por voz: "no la más rápida, quiero la alternativa").
- No tocó `handleVoiceCommand` ni `personalidad()` del Worker en esta ronda — lo
  dejo para cuando esté libre. Diagnostiqué (sin implementar, para no chocar con la
  voz de sesión 1) el pedido de Inty de "escuchar con la pantalla apagada": el GPS
  ya lo resuelve con un servicio nativo en primer plano; la voz NO tiene ese mismo
  mecanismo hoy (vive en el WebView, se pausa con la pantalla apagada). Requiere un
  servicio nativo Android dedicado (o una librería de wake-word tipo Picovoice) — es
  trabajo grande, no algo para meter apurados. Queda pendiente decidir cómo abordarlo
  sin pisarse con el trabajo de voz/personalidad de sesión 1.
- v6.56: Pistero ya responde charla casual ("cómo estás", agradecimientos,
  despedidas, etc. — antes se quedaba callado, causa raíz: esas frases
  estaban literal en la lista `stop` de "ruido a ignorar") y el clima ahora
  entiende día ("mañana", "pasado mañana") y lugar mencionado ("en X").
- v6.57: 3 comandos de voz nuevos — "busca ciclistas cerca" (con distancia
  real, antes no hacía nada útil), "algún panorama por esta zona" (reusa
  `reportesData`, la misma fuente del aviso de peligros), y "cuéntame una
  historia/mito/leyenda de este lugar" (voz nueva sobre la función
  automática que ya existía, `contarAnecdotaDelLugar`/Wikipedia). Detalle y
  limitaciones de verificación en `BITACORA.md`. **Ojo para sesión 1:** no
  toqué `handleVoiceCommand` más allá de agregar 3 líneas de rutas nuevas al
  final del bloque de comandos generales — si tú también agregaste rutas ahí,
  revisa que no se hayan pisado los `return` al mezclar.


## 🚴 FECHA META: 3 de octubre de 2026 — Cicletada en Lago Ranco

La app tiene que estar publicada y pulida en Google Play para esa fecha
(Inty va a mostrarla ahí, conecta con el objetivo de que la promocione la
élite del ciclismo chileno). Ver plan de trabajo completo con fases y fechas
en la conversación del 2026-07-13. Resumen: (1) pruebas en dispositivo real
primero (GPS background, mic nativo, caídas, offline — nadie sin teléfono
puede confirmarlas); (2) cerrar seguridad/privacidad pendiente
(`firestore.rules` sigue sin publicarse, ver abajo); (3) capturas + ficha de
Play Store; (4) enviar a revisión con VARIAS SEMANAS de colchón antes del
evento, no solo días — cuenta nueva + permisos sensibles (ubicación en
segundo plano + micrófono) pueden gatillar revisión más lenta o un rechazo
que obligue a reenviar.

---

## 🔴 LO MÁS URGENTE — leer primero, cualquiera de las dos sesiones

- [x] **🚨 Cuota diaria de Firestore agotada — CAUSA RAÍZ ENCONTRADA Y
  CORREGIDA en v6.62 (2026-07-14).** No era el crecimiento de usuarios: Inty
  compartió el panel de Firebase Console (170K lecturas vs 2.900 escrituras
  en el pico, 58:1 — y 68K lecturas vs 117 escrituras ese mismo día, 581:1).
  Causa real: 8 listeners (`subscribeToUsers`, su duplicado en el mapa de
  navegación, chat, alertas de ruta, comentarios de guía, trucos de taller,
  alojamientos, recomendaciones) pedían el nombre de cada usuario con una
  lectura EXTRA (`getNombreUsuario`) aunque el nombre ya viniera en el mismo
  documento — con varios ciclistas moviéndose juntos (el peor caso: un
  evento como Lago Ranco), esto podía agotar la cuota diaria en minutos.
  Corregido: las 8 lecturas redundantes eliminadas, más `.limit(150)` en los
  dos listeners de usuarios que no tenían techo. Ver `BITACORA.md` para el
  detalle completo y lo que falta verificar en vivo (bloqueado por la misma
  cuota mientras no resetee). **Decisión de Inty (2026-07-14): por ahora
  seguir en el plan gratis Spark, sin activar Blaze.** No pagar nada sigue
  siendo la única restricción dura del proyecto. Con el bug de lecturas
  corregido en v6.62, el uso real debería bajar mucho y quedar dentro del
  tope gratis en el día a día — si la cuota se agota de nuevo, es señal de
  revisar primero si apareció otro patrón similar antes de pensar en pagar.
  El costo estimado en Blaze si algún día se reconsidera (~$2-17 USD/mes a
  5.000 usuarios, ver conversación del 2026-07-14) queda solo como
  referencia, no como plan activo.

- [x] **⚠️ Fuga de correos CERRADA (2026-07-16, sesión 1).** El correo ya no
  vive en `/users/{id}` (lectura pública). **Migración corrida y verificada:**
  respaldo completo antes (`LibrePedal-Backups/firestore-2026-07-16-12-22-02`),
  `node scripts/migrate-email-privado.js --escribir` movió los 21 correos que
  quedaban en `/users` → `/usersPrivate` (0 errores). Verificado con el Admin
  SDK: `users con email público = 0`, `usersPrivate con email = 21`. El código
  (`reg()` escribe en `/usersPrivate`, `_mapaEmailsPrivados()` lee de ahí) ya
  está en vivo desde v6.86.
  **Reglas PUBLICADAS por Inty (2026-07-16 12:37).** Verificado contra la API
  de Firebase Rules en vivo: el bloque `usersPrivate` está activo (read
  dueño+admin, write dueño). Con esto el ciclo queda 100% cerrado: fuga sellada,
  migración hecha, registros nuevos guardan correo y el export admin lo lee.
  **NADA pendiente en este ítem.**
- [x] **⚠️ Falla de seguridad en detección de caídas — RESUELTA (v7.03 + v7.04,
  2026-07-20).** El chequeo de "¿sigues quieto tras el impacto?" usaba la
  velocidad del GPS, que viene de una ventana de 10-15s y por lo tanto laggea: a
  los 3s de chocar a 30 km/h todavía marcaba 30 → el sistema concluía "sigue
  andando" y **NO avisaba una caída real a velocidad**, el escenario más
  peligroso. Fallaba también al revés: sin señal el texto es `--` y
  `parseFloat('--')||0` daba 0 → "está quieto" → alarma sin motivo.
  **Ahora la quietud la decide el acelerómetro** —que ya estaba conectado, es el
  que detecta el impacto— y el GPS quedó de respaldo, sin confundir "sin señal"
  con "detenido".
  **Falsa alarma REAL reportada (v7.04):** a una amiga de Inty se le cayó el
  teléfono al suelo con la app abierta y saltó la alerta. Tras el impacto, un
  teléfono en el piso y un ciclista tirado se ven idénticos; lo que los distingue
  es el ANTES. Bajo 5 km/h previos el golpe se ignora — y ahí el retardo del GPS
  juega A FAVOR: leída en el instante del golpe, esa cifra ES la velocidad previa.
  Verificado con `tests/caidas.test.mjs` (**20 casos**) y en navegador real.
  **Lo único que queda:** los dos umbrales (`CRASH_MOV_QUIETO = 0.22 g` y
  `CRASH_VEL_MINIMA = 5 km/h`) están elegidos por criterio, **no medidos con una
  caída real**. Si aparecen falsas alarmas, subir `CRASH_VEL_MINIMA`; si se pierde
  una caída real, bajarlo. Eso sí necesita el teléfono en la mano.

- [x] **Publicar `firestore.rules` en Firebase Console — PUBLICADO (confirmado
  por Inty, 2026-07-14).** Cerraba un hueco real en producción: cualquier
  usuario logueado podía leer, sobrescribir o borrar el diario personal de
  OTRO usuario (`diarios`, reflexiones privadas). El archivo del repo usa
  `isOwnerByCu()` para esa colección (no `isOwnerOrLegacy()` — esa NO servía
  ahí, ver comentario en `firestore.rules`). Lo publicó Inty directamente en
  Firebase Console, como corresponde (cambio de control de acceso sobre
  producción, ninguna IA lo toca por su cuenta). Recordar: si algo del panel
  de Admin se ve raro, es porque falta recargar la sesión una vez para que
  suba a `isAdmin()`.
- [x] **Google Play: cuenta de desarrollador APROBADA (2026-07-13, confirmado
  por Inty)** — ya no está "en validación", queda activa para publicar.
- [x] **Build .aab firmado de release — pipeline armado y VERIFICADO
  (2026-07-13).** Antes el pipeline (`build-apk.yml`) solo generaba un `.apk`
  de debug sin firmar, que sirve para sideload pero no para Play Console.
  Ahora existe `scripts/patch-android-signing.js` (inyecta el signingConfig
  en `android/app/build.gradle` leyendo el keystore/contraseñas desde
  variables de entorno — nunca hardcodeadas — y deriva `versionCode`/
  `versionName` de `version.txt`, así cada versión que sube el proyecto ya
  trae el número correcto sin tocar nada a mano) y el workflow
  `.github/workflows/build-aab-release.yml` (se lanza a mano desde GitHub,
  no en cada push). Se generó el keystore real (`librepedal-release.keystore`,
  válido hasta 2053, **NUNCA subido al repo**, ver `.gitignore`) y se probó el
  build COMPLETO en local: `BUILD SUCCESSFUL`, `.aab` de 3.4 MB, firma
  confirmada con `jarsigner -verify` (certificado coincide exacto). Todos los
  datos y las instrucciones paso a paso quedaron en `MI-KEYSTORE-PLAYSTORE.txt`
  (local, gitignored, solo en el computador de Inty).
- [ ] **Falta que Inty agregue los 4 secrets en GitHub** (ver
  `MI-KEYSTORE-PLAYSTORE.txt` para los valores exactos: `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) y
  lance el workflow una vez desde GitHub → Actions → "Construir AAB firmado
  (Google Play)" → Run workflow, para la confirmación final en el entorno
  real de CI (ya se probó en local con éxito, pero CI es un entorno distinto).
  Sobre todo: **respaldar el keystore en un lugar seguro fuera de este
  computador antes de seguir** — sin él, no se puede volver a firmar una
  actualización de esta app nunca más.
- [ ] Falta: capturas de pantalla reales de la app.
- [ ] Falta: crear la ficha en Play Console y subir el primer `.aab` — eso lo
  hace Inty directamente (es su cuenta de Google). `PLAY-STORE-LISTING.md` ya
  tiene toda la ficha lista para copiar/pegar.
- [ ] **Capturas de pantalla para la ficha de Play Store** — nadie las ha
  generado todavía (se evitó ensuciar Firestore de producción con una cuenta de
  prueba). Pendiente de decidir cómo generarlas sin ese riesgo.
- [ ] **Confirmar en un dispositivo Android real que el plugin de voz nativo
  (agregado recién, ver "Resuelto esta sesión") compila y funciona.** Ninguna
  IA tiene un teléfono a mano — es el único paso que falta para dar por
  cerrado el micrófono nativo en la app instalada.

## 🟡 A verificar (no urgente, necesita probarse en condiciones reales)

- [ ] **PWA offline: `sw.js` excluye a propósito los scripts de Firebase/MapLibre
  (`gstatic.com/firebasejs`, etc.) del cacheo del Service Worker** (barrido de
  base/PWA, v6.42 — sin cambios de código, solo revisado). Para el uso real más
  común (arrancas la ruta CON señal, la pierdes a mitad de camino) esto no
  importa: la pestaña sigue corriendo en memoria, nunca vuelve a pedir esos
  scripts. Pero si alguien cierra la app del todo y la vuelve a abrir estando
  YA sin señal (ej. a la mañana siguiente en una zona sin cobertura), esos
  scripts no están en la caché del Service Worker — dependen de que el caché
  HTTP normal del navegador todavía los tenga guardados de una visita anterior.
  No se tocó porque no se pudo probar con corte de red real en este entorno
  (sandbox sin control de conectividad) y cambiar la estrategia de caché a
  ciegas podría introducir problemas de versión SDK obsoleta. Si alguien puede
  probar en un teléfono real con modo avión: abrir la app fría (recién
  reinstalada o con caché borrada) sin señal y ver si carga.

## ✅ Resuelto esta sesión (2026-07-12, continuación — v6.14 a v6.19 + plugin de voz)

- **Cronómetro visible en GPS libre + reemplazo de 77 diálogos nativos
  (alert/confirm/prompt) por diálogos temáticos** (v6.14). Ver entrada v6.14 de
  `BITACORA.md`.
- **GPX export/import + respaldo/restauración completo de datos** (v6.15-v6.18,
  hecho por la otra sesión). Auditado con pruebas reales en el navegador
  (v6.19): se encontró y corrigió un bug real — `importarMisDatos()` no
  guardaba el skin ni el lente restaurados en `localStorage` (solo el casco),
  se perdían al recargar la app. También `sw.js` había quedado con
  `CACHE=v614` durante 4 versiones (desincronía, bug recurrente ya conocido).
  Ambos corregidos. Ver entrada v6.19 de `BITACORA.md`.
- **Plugin `@capacitor-community/speech-recognition` agregado a
  `package.json`** — esto es lo único que faltaba de verdad para el micrófono
  nativo (los permisos ya estaban listos desde antes, ver abajo). Se verificó
  la API real del plugin contra la documentación (no se instaló a ciegas):
  se fijó la versión en `^6.0.1` — **NO** `latest`/`^7.0.0`, porque la v7 del
  plugin requiere Capacitor 7 y este proyecto usa Capacitor `^6.1.2`
  (`peerDependencies` de la v6.0.1 confirma `@capacitor/core: ^6.0.0`, calce
  exacto). Los métodos que ya llama `index.html` (`requestPermissions()`,
  `start({language,maxResults,partialResults,popup})` → `{matches:[...]}`)
  coinciden exactamente con la API real de v6.0.1 — no hizo falta tocar
  `index.html`. El README del plugin confirma "no further action required" en
  Android más allá del permiso `RECORD_AUDIO`, que `scripts/patch-android.js`
  ya inyecta. Falta la confirmación en un dispositivo real (ver arriba).
- Revisado `scripts/patch-android.js`: GPS en segundo plano y permisos ya
  estaban bien resueltos desde antes (confirmado de nuevo, sigue vigente).
- Respaldo real de la base de datos y migración de auth a tokens personalizados
  (v6.12) — ver entrada correspondiente en `BITACORA.md`.

---

## ✅ CERRADO — Segunda auditoría autónoma (Claude sesión 2, v6.10, de madrugada)
Inty pidió "auditoría sobre auditoría" antes de dormir, con permiso total y sin
supervisión. Verificadas cero regresiones en TODO lo anterior (v6.03-v6.09). 3
agentes en paralelo cazando el patrón "no lee de donde corresponde" (el mismo tipo
de bug que "Mis viajes" en v6.09). Único bug real: una regresión propia de la MISMA
sesión (selector `.es-globe` ambiguo tras agregar el botón Atrás, rompía el
spotlight del tutorial paso 2). Corregido y verificado los 17 pasos del tutorial uno
por uno. Detalle completo en la entrada **v6.10** de `BITACORA.md`.
⚠️ Lección para ambas sesiones: si vas a poner una clase CSS existente en un elemento
NUEVO, revisa antes si algún `querySelector` de JS depende de que esa clase sea
única (el spotlight del tutorial es el caso más frágil para esto).

---

## ✅ CERRADO — Rediseño de navegación pedido por Inty (Claude sesión 2, v6.09)
Esfera como Inicio permanente, fix de "Mis viajes" vacío (rutas grabadas no
aparecían), Mi puesto visible en la Esfera, Avisos+Mensajes fusionados, botón
"← Atrás" universal, y Pistero puede llevarte gráficamente a cualquier función de la
app cuando le preguntas cómo usarla (`[ACCION:mostrar|clave]`). Detalle completo en
la entrada **v6.09** de `BITACORA.md`.
⚠️ Si vas a tocar `cv()`, `esferaItems`, `es-bottom` o los botones "Volver a Inicio":
la Esfera ahora es el destino real de "ir a Inicio" en TODA la app — no revertir a
que "Inicio" abra `v-dash` directo sin pasar por la Esfera.

---

## ✅ CERRADO — 4 bugs de uso real reportados por Inty (Claude sesión 2, v6.08)
GPS fantasma (doble watcher GPS-libre + navegación corriendo a la vez), voz que armaba
un viaje con cualquier pregunta ("busca"/"encuentra" sin complemento de lugar), Pistero
respondiendo con etiquetas `[BUSCAR:]` crudas ("código"), y Pistero limitado solo a
ciclismo (ahora responde de todo). Detalle completo en la entrada **v6.08** de
`BITACORA.md`. "La app no inicia bien" quedó investigado sin causa concreta distinta —
si persiste, falta un reporte más específico para diagnosticarlo con evidencia.

---

## ✅ CERRADO — QA adversarial pre-lanzamiento (Claude sesión 2, v6.03)
Inty pidió una pasada de calidad total antes de lanzar ("no quiero fallas... la app no
debe presentar fallas de ningún tipo"). 3 agentes Explore auditaron el código completo
como QA rompiendo cosas. Los 15 hallazgos (2 críticos, 5 altos, 5 medios, 3 bajos) se
corrigieron y verificaron — ver el detalle completo en la entrada **v6.03** de
`BITACORA.md`. Nada quedó pendiente de esa ronda.

---

## 🧭 Simplificación de navegación/UX — ✅ YA HECHO (v5.95)
Inty pidió simplificar toda la navegación ("hasta para mí se complica"). Auditoría UX completa hecha
(2026-07-11): 16 vistas, 4 sistemas de navegación solapados (barra 5 + esfera 15 + es-bottom 5 + botones
cruzados), Inicio con ~21 objetivos táctiles, Pistero/Rutas/Bitácora enterrados a 2-3 toques.
Concepto aprobado por Inty e IMPLEMENTADO COMPLETO en **v5.95** (ver BITÁCORA):
- [x] (a) Esfera sin duplicados (15→11 íconos únicos, +Bitácora/Música/Novedades/Ajustes con acceso global).
- [x] (b) Barra inferior: **Pistero al centro**, Taller a la esfera.
- [x] (c) Inicio adelgazado (~11→5 acciones; Darma/Logros→Perfil, Compartir en vivo→Ajustes).
- [x] (d) Nomenclatura unificada: `v-trips`="Mis viajes" (agrupa planificador+historial+bitácora).
- [ ] Falta: probar en dispositivo real (tutorial completo + esfera táctil) — cualquiera de las dos sesiones.
⚠️ Estructura nueva de navegación: antes de tocar `esferaItems`, `nav .nb`, `viewNav` o `v-dash`, leer la
entrada v5.95 de la BITÁCORA para no deshacer la reorganización.

---

## 🎯 FOCO ANTERIOR: pulir para el LANZAMIENTO — capacidades de la IA avanzada de Pistero
El chat de Pistero (`v-pistero`, v5.91) ya conversa. Ahora subirlo de nivel para el lanzamiento.
Candidatos (Inty prioriza; si Gemini toma uno, anótalo aquí para no chocar):
- [x] **A) Pistero que ACTÚA** — v5.93: botones de acción bajo la respuesta (navegar a un lugar, ver hospedajes, abrir planificador).
- [x] **B) Pistero te conoce** — v5.93: guarda/carga el historial en localStorage y saluda "de nuevo".
- [x] **C) Chips de sugerencias** — v5.93.
- [~] **D) Planificador con gastos** — v5.93 parcial: chip "Planifica mi viaje" + Pistero da gastos en texto + botón "Abrir planificador". FALTA: guardar el itinerario como "viaje" estructurado desde el chat.
- [ ] **E) Pulido del chat** — probar en dispositivo real (estilo/scroll/errores). El navegador de preview de Claude está inestable, no se pudo verificar visualmente.

---

## 🤖 Build del APK — actualizado 2026-07-12, ver también "🔴 LO MÁS URGENTE" arriba
- [x] **Rastreo con pantalla apagada** — revisado el código real de
  `scripts/patch-android.js` y `package.json`: el plugin
  `@capacitor-community/background-geolocation` SÍ está como dependencia, y el
  script SÍ inyecta `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`,
  `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` en el manifest, y pide los
  permisos al arrancar desde `MainActivity.java`. Por lectura de código esto ya
  está bien resuelto — falta solo la confirmación en un dispositivo real
  (**Ajustes → 📡 Probar GPS** en la app, o probar de verdad con pantalla
  apagada), nadie de las dos IAs puede confirmar eso sin un teléfono a mano.
- [x] **Micrófono nativo en la app instalada** — plugin
  `@capacitor-community/speech-recognition` agregado a `package.json`, fijado
  en `^6.0.1` (NO latest/`^7.0.0`, esa versión pide Capacitor 7 y el proyecto
  usa Capacitor 6). API verificada contra la documentación real de esa versión
  exacta: coincide 100% con lo que ya llamaba `_micNativoEscuchar()` en
  `index.html` (`requestPermissions()`, `start({...})` → `{matches:[...]}`) —
  no hizo falta tocar `index.html`. `package.json` ya está en los `paths:` de
  `build-apk.yml`, dispara el build solo. **Falta solo la confirmación en un
  dispositivo real** (instalar el APK nuevo y probar el mic) — nadie de las
  dos IAs puede confirmar eso sin un teléfono a mano.

## 👤 Para INTY (son de tu cuenta, ninguna IA puede hacerlas)
- [~] **ROTAR los 3 tokens**: la "fuga" que motivó esto era una falsa alarma (ver BITÁCORA v5.94 — era
  el fallback SPA de Cloudflare Pages, no los tokens reales expuestos). No es urgente por ese motivo. Sigue
  siendo buena práctica rotarlos alguna vez, a tu criterio, sin apuro.
- [x] **Permiso DNS/dominio** — resuelto por otra vía: el token de `MI-CLOUDFLARE-IA.txt` ya tenía permiso
  suficiente (`zone:read`, `worker:edit`) para conectar el dominio vía la API de Pages directamente (sin
  necesitar Zone:DNS:Edit). Los registros CNAME los agregó Inty a mano en el dashboard (2 minutos, guiado).

## 🌐 Dominio / correo — ✅ YA HECHO (v5.82-5.85, antes de que existiera esta carpeta de coordinación)
- [x] `librepedal.cl` y `www.librepedal.cl` conectados como dominio personalizado del proyecto Pages
  `librepedal` (agregado vía API con el token de `MI-CLOUDFLARE-IA.txt`). SSL activo, verificado en vivo.
- [x] `contacto@librepedal.cl` — Email Routing activo, reenvía a Gmail. Ya actualizado en `privacidad.html`
  y `terminos.html` (dejaron de decir "pendiente, lo definimos al activar el dominio").
- Nota: la landing de comunidad (`librepedal-web.pages.dev`, distinta de la app) NO se movió a `librepedal.cl`
  — hoy `librepedal.cl` sirve la APP directo (`index.html`). Si se quiere landing en la raíz y app aparte,
  es una decisión de arquitectura a conversar con Inty, no algo que haya que "des-bloquear".
- Sí existe una landing propia dentro de la app: `bienvenida.html` (`librepedal.cl/bienvenida.html`),
  landing interactiva con votación comunitaria en vivo (datos reales de Firestore, sin login).

## 📄 Play Store / legal — mayormente ✅ YA HECHO
- [x] `privacidad.html` y `terminos.html` ya están hosteados y públicos en `librepedal.cl/privacidad.html`
  y `librepedal.cl/terminos.html`, enlazados desde el registro y desde Ajustes en la app.
- [x] `PLAY-STORE-LISTING.md` ya tiene título, descripción corta/larga, categoría, guía de rating de
  contenido y de "Data safety". Assets gráficos ya generados: `play-icon-512.png` (512×512),
  `play-feature-graphic-1024x500.png` (con el logo real).
- [x] Cuenta de desarrollador de Google Play: **pagada por Inty (USD 25) y APROBADA por Google
  (confirmado 2026-07-13)** — ya se puede crear la ficha y subir el primer build.
- [ ] Falta: capturas de pantalla reales de la app (necesita login + navegar unas pantallas, no se hizo
  para no ensuciar Firestore de producción con una cuenta de prueba).
- [x] Build firmado `.aab` de release — pipeline armado y verificado en local (2026-07-13). Ver detalle
  en "🔴 LO MÁS URGENTE" arriba. Falta que Inty agregue los secrets en GitHub y confirme en CI.

## 🧠 IA de Pistero (mejoras, opcional)
- [ ] Pulir el estilo del chat `v-pistero` (Claude puede).
- [ ] Cuando el plugin de voz esté en el APK, probar `pisteroPorVoz()` end-to-end.
- [ ] Enriquecer el contexto del Worker (más campos del usuario si sirven).

## 🎤 Estado del micrófono (referencia)
- Chrome (web): **funciona**.
- App instalada (WebView): plugin agregado (ver "Build del APK" arriba), pendiente de confirmar en un
  APK compilado con esto y un teléfono real. Hasta esa confirmación, el fallback sigue mandando a
  escribir si algo falla.
