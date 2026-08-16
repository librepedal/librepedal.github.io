# 🧭 Auditoría CEO — LibrePedal (2026-08-14, noche)

Hecha por la cuenta Opus con autonomía de Inty. Objetivo: encontrar qué mejorar en TODAS
las áreas, priorizado, con dueño, para repartir el trabajo. Datos reales medidos sobre el
código (no opiniones). **Regla: nada sin validar toca `main`. Lanzamiento mañana 18:00.**

Prioridades: **P0 = bloquea el lanzamiento** · **P1 = alto impacto** · **P2 = mejora de fondo**.

---

## P0 — Launch-crítico (mañana 18:00)
1. **AAB listo** para la prueba cerrada de Play Store. Dueño: **otra cuenta**. Verificar
   `build-aab-release.yml`, versionCode/versionName, keystore (ver PENDIENTES.md). Dejarlo
   a un botón de Inty. No publicar a Play sin él.
2. **firestore.rules: resolver el hold** (`PAUSA-FIRESTORE-RULES-2026-08-14.md`). Las reglas
   son UN archivo para todo el proyecto Firebase; si dos sesiones publican por separado, una
   pisa a la otra. **Acción:** confirmar con Inty si Sudamérica usa el MISMO proyecto
   (`librepedal-cb983`) o uno aparte; fusionar en un solo `firestore.rules`; publicar una vez.
   Dueño: **otra cuenta** (lo dejó en hold) + confirmación de Inty.
3. **Sanidad de versión**: `APP_VERSION` == `version.txt` == `sw.js` cache. Hoy las 3 = 8.51 ✅.
   Mantener en cada release.

## P1 — Alto impacto
4. **Rendimiento de carga (móvil).** `index.html` = **947 KB, 10.664 líneas, sin build/minify**
   + **8 scripts de CDN** (Firebase x3, MapLibre, Leaflet, jsPDF, Sentry, Google GSI) que son
   render-blocking y frágiles offline. Mejoras: `defer`/`async` en los no críticos (jsPDF,
   Sentry), cargar MapLibre/Leaflet solo cuando se abre el mapa (lazy), y un paso de minify en
   el deploy (hoy se sirve el HTML crudo). Dueño: **Opus** (no toca botones/íconos).
5. **PWA offline real.** El SW cachea local, pero las libs pesadas vienen de CDN → **sin señal
   la app se rompe** (mapa, auth, pdf). Precachear/verificar fallback de esas libs, o
   self-hostearlas. Dueño: **Opus**.
6. **Voz — calidad consistente.** Hoy solo las 466 frases fijas suenan premium (ElevenLabs);
   lo dinámico cae a voz nativa (robótica). **En curso:** clon local (Chatterbox MIT, RTX 4060)
   ya funciona en español → pre-generar banco ampliado (números, calles, 24 logros, saludos)
   como mp3 estáticos, gratis. Dueño: **Opus** (genera mp3) + **otra cuenta** (cablea en app).
7. **UX — una acción primaria por pantalla + íconos a medida.** Migración de emojis→Font
   Awesome (194 emojis/667 usos) en curso. Dueño: **otra cuenta**. Tema Sólido/Cristal
   (acabado app-wide) dueño: **Opus**.

## P2 — Mejora de fondo (post-lanzamiento)
8. **Accesibilidad floja.** Solo **12 `aria-*`, 0 `role=`** en toda la app (imgs con `alt` ✅).
   273 `onclick` inline en vez de botones semánticos con foco. Plan: roles/aria en nav,
   modales y controles; foco visible; contraste AA en el tema oscuro. Dueño: **Opus** (junto al tema).
9. **Salud del código.** Monolito de 10.6k líneas. Ya se empezó a modularizar (`voz-elevenlabs.js`,
   `perfil-comunidad.js`) — seguir sacando módulos. **137 TODO/FIXME** en el archivo: triar y
   cerrar/registrar. 428 `try/catch` (defensivo, bien). 0 `console.log` (limpio ✅).
10. **Firestore — lecturas públicas.** Varias colecciones con `allow read: if true`. Escrituras
    sí están protegidas (signedIn + uid ✅). Revisar que ninguna colección con `read:true`
    exponga datos personales (email, ubicación exacta, etc.). Dueño: **otra cuenta** (dueña de rules).
11. **Observabilidad.** Sentry ya cargado. Verificar que capture errores reales en producción y
    revisar el panel tras el lanzamiento.

---

## Reparto sugerido (encaja con `REPARTO-NOCHE-2026-08-14.md`)
- **Otra cuenta:** P0 (AAB, rules) + P1#7 (íconos/botones) + P1#6 (cablear voz) + P2#10 (rules read).
- **Opus:** P1#4/#5 (rendimiento/PWA) + P1#6 (generar voz) + P1#7 (tema) + P2#8 (a11y) + P2#9 (modularizar).

## Cómo se prueba cada cambio (obligatorio antes de merge)
`node tests/run.mjs` → 12/12 verde · carga en navegador · si toca UI, teléfono de Inty ·
versión en los 3 lugares · merge a main solo cuando está validado.

— Opus, 2026-08-14 (noche). Se actualiza a medida que avanzamos.
