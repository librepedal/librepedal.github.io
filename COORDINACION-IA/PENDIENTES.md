# ✅ Pendientes — Libre Pedal

Marca con `[x]` lo hecho y anótalo en `BITACORA.md`. Actualizado 2026-07-12 (noche),
versión actual del proyecto: **v6.13**.

---

## 🔴 LO MÁS URGENTE — leer primero, cualquiera de las dos sesiones

- [ ] **Publicar `firestore.rules` en Firebase Console — sigue sin publicarse**
  (viene de v6.11 y v6.12, todavía pendiente). Sin esto, las protecciones de
  dueño real y admin real que YA están en el código del repo no están activas en
  producción. Es tarea de **Inty únicamente** (Firebase Console → proyecto
  `librepedal-cb983` → Firestore Database → Reglas → copiar TODO el contenido de
  `firestore.rules` → Publicar, 2 minutos). Ninguna IA lo hace por su cuenta a
  propósito (cambio de control de acceso sobre producción). Después de publicar,
  Inty debe recargar la app una vez para que su sesión suba a `isAdmin()`.
- [ ] **Google Play: cuenta de desarrollador ya pagada por Inty, en validación.**
  Cuando quede activa, falta: (1) capturas de pantalla reales de la app —
  ofrecido ayudar a tomarlas, no se ha hecho; (2) generar el build **.aab**
  firmado que pide Play Store (el pipeline actual (`build-apk.yml`) genera un
  `.apk` de debug, no un `.aab` de release firmado — son formatos y procesos
  distintos, falta armar ese paso). `PLAY-STORE-LISTING.md` ya tiene toda la
  ficha lista para copiar/pegar.
- [ ] **Capturas de pantalla para la ficha de Play Store** — nadie las ha
  generado todavía (se evitó ensuciar Firestore de producción con una cuenta de
  prueba). Pendiente de decidir cómo generarlas sin ese riesgo.

## ✅ Resuelto esta sesión (2026-07-12, no repetir el diagnóstico)

- **Ícono de la app instalada mostraba el genérico de Capacitor, no el logo de
  Libre Pedal (v6.13).** Causa real: `build-apk.yml` arma `android/` desde cero
  en cada build y NUNCA tuvo un paso que generara un ícono personalizado — se
  perdía en cada build aunque alguien lo arreglara a mano una vez. Ahora hay un
  paso `npx @capacitor/assets generate --android` usando `resources/icon.png` +
  `resources/splash.png`/`splash-dark.png` (con el fondo real de la app, no
  blanco). Ver entrada **v6.13** de `BITACORA.md`.
- **Revisado el código real de `scripts/patch-android.js` — el pendiente de
  "Gemini" sobre permisos de GPS en segundo plano y micrófono estaba
  DESACTUALIZADO.** Ese script YA inyecta correctamente en el
  `AndroidManifest.xml`: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`,
  `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `WAKE_LOCK`,
  `RECORD_AUDIO`, y ADEMÁS parcha `MainActivity.java` para pedir los permisos
  de verdad al arrancar (no basta con declararlos). `package.json` ya tiene
  `@capacitor-community/background-geolocation` como dependencia. **Lo único
  que sigue faltando de verdad es el plugin `@capacitor-community/speech-recognition`**
  (no está en `package.json` — sin él, pedir el permiso de micrófono no alcanza,
  falta el plugin que hace el reconocimiento de voz en sí). Ver sección
  actualizada más abajo.
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
- [ ] **Micrófono nativo en la app instalada — sigue faltando, esto sí es real.**
  Los PERMISOS ya están listos (`RECORD_AUDIO` inyectado + pedido al arrancar,
  `scripts/patch-android.js` ya lo hace), pero falta el PLUGIN en sí:
  1. Agregar `@capacitor-community/speech-recognition` a `package.json`
     (dependencies).
  2. Confirmar que la API del plugin coincide con lo que llama el código
     (`lpPlugin('SpeechRecognition')` en `index.html`, función
     `_micNativoEscuchar()`) — revisar la documentación del plugin antes de
     instalar a ciegas, puede que el nombre de los métodos no calce exacto.
  3. `npx cap sync android` (ya está en el flujo del build, se corre solo).
  4. Push a `main` — el build se dispara solo si el commit toca alguno de los
     `paths:` de `.github/workflows/build-apk.yml` (agregar `package.json` a la
     lista si no dispara).
  - Con eso el mic queda andando dentro de la app instalada (hoy solo
    funciona en Chrome/web).

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
- [x] Cuenta de desarrollador de Google Play: **ya pagada por Inty (USD 25) y en proceso de validación de
  datos por Google** (a 2026-07-12). Cuando quede validada, se puede crear la ficha y subir el primer build.
- [ ] Falta: capturas de pantalla reales de la app (necesita login + navegar unas pantallas, no se hizo
  para no ensuciar Firestore de producción con una cuenta de prueba).
- [ ] Falta: build firmado `.aab` de release — hoy el pipeline (`build-apk.yml`) solo genera un `.apk` debug
  sin firmar, que sirve para sideload pero NO para subir a Play Console (exige `.aab` firmado con keystore
  de release). Falta agregar un paso de firma (genera un keystore, guarda como secret de GitHub, firma en CI).
  Ver detalle en "🔴 LO MÁS URGENTE" arriba.

## 🧠 IA de Pistero (mejoras, opcional)
- [ ] Pulir el estilo del chat `v-pistero` (Claude puede).
- [ ] Cuando el plugin de voz esté en el APK, probar `pisteroPorVoz()` end-to-end.
- [ ] Enriquecer el contexto del Worker (más campos del usuario si sirven).

## 🎤 Estado del micrófono (referencia)
- Chrome (web): **funciona**.
- App instalada (WebView): **no**, hasta que Gemini agregue el plugin (arriba). El código ya está preparado; el fallback manda a escribir mientras tanto.
