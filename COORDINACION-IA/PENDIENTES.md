# ✅ Pendientes — Libre Pedal

Marca con `[x]` lo hecho y anótalo en `BITACORA.md`. Actualizado 2026-07-11.

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

## 🤖 Para GEMINI (build del APK — Claude no puede compilar el APK)
- [ ] **URGENTE — Rastreo con pantalla apagada (Inty dice que se rompió).** El código web está intacto (`lpBackgroundGeo`), pero SOLO funciona si el APK trae el plugin nativo. Verifica que el build incluya `@capacitor-community/background-geolocation`, que `npx cap sync android` corrió, y que el `AndroidManifest.xml` tenga `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE` y `FOREGROUND_SERVICE_LOCATION`. Si un rebuild reciente lo dejó fuera, ESA es la regresión. Inty puede confirmarlo en la app con **Ajustes → 📡 Probar GPS** (dice si el plugin está o no).
- [ ] **Micrófono nativo en la app.** El código web (v5.92) ya llama al plugin `SpeechRecognition`. Falta meterlo al APK:
  1. `npm install @capacitor-community/speech-recognition`
  2. `npx cap sync android`
  3. En `AndroidManifest.xml`: `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
  4. Reconstruir el APK (`build-apk.yml`).
  - Con eso el mic queda andando dentro de la app (hoy solo funciona en Chrome).

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
- [ ] Falta: capturas de pantalla reales de la app (necesita login + navegar unas pantallas, no se hizo
  para no ensuciar Firestore de producción con una cuenta de prueba). Y por supuesto, la cuenta de
  desarrollador de Google Play misma (USD 25, pago único — le corresponde a Inty, ninguna IA puede pagarlo).

## 🧠 IA de Pistero (mejoras, opcional)
- [ ] Pulir el estilo del chat `v-pistero` (Claude puede).
- [ ] Cuando el plugin de voz esté en el APK, probar `pisteroPorVoz()` end-to-end.
- [ ] Enriquecer el contexto del Worker (más campos del usuario si sirven).

## 🎤 Estado del micrófono (referencia)
- Chrome (web): **funciona**.
- App instalada (WebView): **no**, hasta que Gemini agregue el plugin (arriba). El código ya está preparado; el fallback manda a escribir mientras tanto.
