# BRIEF — Lenguaje visual PRO: íconos y botones (LibrePedal)

**Pedido de Inty (2026-07-30):** excelencia y sobriedad. Fuera los emojis de juguete como
íconos de interfaz; un solo set profesional (**Font Awesome 6.4**, ya cargado) y botones
consistentes. Ejecutar en **UNA pasada** (no de a uno), verificando por código antes de
desplegar. Deploy = editar `index.html` → `git push` a `origin` → el Action publica a
librepedal.cl. Subir versión en 3 lugares (APP_VERSION + version.txt + sw.js CACHE).

## Alcance
- **index.html** (único archivo). Inventario real: **194 emojis únicos, 667 usos.**
- Ya hecho de referencia (v7.72): la pantalla **Perfil** ya migró a íconos FA + acordeón.
  Usar ese estilo como patrón.

## Regla de oro
1. **Íconos de UI (botones, títulos, chips, badges) → Font Awesome 6.4** (`<i class="fas fa-X"></i>`).
2. **NO tocar** los emojis que son *contenido/voz*, no interfaz:
   - Caras de personalidad de Pistero dentro de sus frases habladas: 😏 🤪 😅 😄 😆 🙌 🧘 👋 (van en el texto que él dice; son su tono, no un ícono).
   - **Banderas de país** para idioma/región: 🇨🇱 🇦🇷 🇧🇴 🇵🇪 … (semánticas; FA free no tiene banderas buenas — dejar por ahora o migrar a un set de banderas SVG aparte).
   - Emojis dentro de strings que Pistero *pronuncia* por voz (no se ven como ícono).
3. Regla práctica: si el emoji está en un `<button>`, `<summary>`, `<h3/h4>`, chip o badge → se reemplaza. Si está dentro de un string de diálogo/`h('…')` → se deja.

## Mapa emoji → Font Awesome (los de UI; cubre el grueso)
| emoji | FA (`fas fa-…`) | emoji | FA |
|---|---|---|---|
| 📍 | location-dot | 🔧 🛠 | wrench / screwdriver-wrench |
| 🚴 🚵 🚲 | person-biking / bicycle | 🏆 | trophy |
| 🏁 | flag-checkered | 🥇 🥈 🥉 🏅 🎖 | medal / award |
| 🧭 | compass | 🔋 | battery-half |
| 🗺 | map | 🔒 | lock |
| ← → ⬅ ➡ ⬆ ⬇ ↗ ↘ ↔ | arrow-left/right/up/down (y variantes) | 🚨 | tower-broadcast |
| ✕ ✖ ✖️ | xmark | 📤 📲 | share-from-square / arrow-up-from-bracket |
| ⚠ | triangle-exclamation | 📥 ⬇ | download |
| ✓ ✅ ✔ | check / circle-check | 🛣 | road |
| ✨ 🌟 ⭐ ★ | wand-magic-sparkles / star | 📡 🛰 | satellite-dish / satellite |
| 🎯 | bullseye | ⚡ | bolt |
| 🎙 🗣 | microphone-lines / comment-dots | 📸 📷 | camera |
| 🎒 | bag-shopping | 🤝 | handshake |
| 🌎 🌍 🌐 | earth-americas / globe | 💬 | comment |
| ⏸ ⏺ ⏹ ⏭ ⏮ | pause/circle/stop/forward-step/backward-step | 🎓 | graduation-cap |
| 🔊 🔉 🔈 | volume-high/low/off | 📋 | clipboard |
| ⚙ | gear | 👥 | users |
| 🛑 ✋ | hand | 💪 | dumbbell |
| 📻 | radio | 📈 📊 | chart-line / chart-column |
| 🔄 🔁 🔀 | arrows-rotate / repeat / shuffle | ⏱ ⏳ | stopwatch / hourglass-half |
| 🆘 🩹 | kit-medical / bandage | 📓 📖 📄 | book / file-lines |
| 🏪 🏨 🏠 🏡 | store / hotel / house | 💡 | lightbulb |
| 🏕 ⛺ | campground / tent | 🎬 | clapperboard |
| ☰ | bars | 📁 | folder |
| ❤ 🧡 | heart | 🏔 🏞 🌄 🌅 | mountain |
| 🔍 🔎 | magnifying-glass | 🏛 | landmark |
| 💧 | droplet | 👮 | user-shield |
| 🔔 | bell | 👻 | ghost |
| 🎵 🎸 | music / guitar | ➕ | plus |
| 💰 | coins | 💾 | floppy-disk |
| ☁ 🌤 ☔ | cloud / cloud-sun / umbrella | 📰 | newspaper |
| 🏍 🚗 🚙 🚑 🚁 | motorcycle / car / ambulance / helicopter | 🗑 | trash |
| 🍜 🍔 | bowl-food / burger | 👉 👀 👍 | hand-point-right / eye / thumbs-up |
| 🪖 | helmet-safety | 🕶 | glasses |
| 🎨 | palette | 👁 | eye |
| 🌱 | seedling | 💎 | gem |
| 👑 | crown | 🏙 | city |
| 🚀 | rocket | 🔱 | trident |
| 📞 | phone | 🌳 | tree |
| 🎁 | gift | ✍ | pen |
| 🧪 | flask | 📶 | signal |
| 🔌 | plug | ⛓ | link |
| 🔥 🎉 | fire / party-horn | 🚫 | ban |

**Puntos de estado de color** (🔴 🟢 🟡 🟤): no usar emoji — usar un `<span>` con
`background` (CSS) o `fa-circle` coloreado por clase. Consistente con badges.

**Sin FA claro (dejar el emoji o decidir con Inty):** 🧉 (mate), 🪨 (roca), 🐢 🐕 (animales,
suelen ser contenido), 💯, 🕳 (hoyo). No forzar un ícono malo.

## Botones — sistema único
Hoy: `.ab` (42, primario), `.ab sec` (86, secundario), `.bg` (7, grande), `.pchip` (5,
chips de Pistero), `.route-btn` (3), `.gps-btn` (1), `.fab`/`.es-*` (flotantes/esfera).
El núcleo YA es `.ab` / `.ab sec` — el problema es el ruido: **estilos inline ad-hoc**
por botón y **labels con emoji**. Plan:
1. Canonizar: **primario** = `.ab`, **secundario** = `.ab sec`, **peligro** = `.ab danger`
   (crear), **grande/CTA** = `.bg`, **chip** = `.pchip`, **ícono flotante** = `.fab`.
   `.route-btn`/`.gps-btn` → migrar a `.ab sec` (o `.ab danger` los destructivos).
2. **Todo botón lleva su ícono FA a la izquierda** (`<i class="fas fa-…"></i> Texto`),
   nunca emoji. Un solo patrón de espaciado (gap del ícono por CSS, no inline).
3. Quitar `style="..."` repetidos: mover a clases utilitarias (`.mt8`, `.flex1`, etc.)
   o al CSS del componente. Menos inline = más consistente y menos peso.
4. Respetar el canon UX ya acordado (menos es más; Fitts para tamaño táctil ≥44px).

## Ejecución (para el worker que lo tome)
1. Tomar el candado `COORDINACION-IA/EN-USO.md`.
2. Editar con script Node **CRLF-safe** (el archivo es CRLF): normalizar `\r\n`→`\n`,
   editar, restaurar. Usar anclas exactas; abortar si un ancla no matchea (no adivinar).
3. Reemplazos por lotes desde este mapa, saltando los strings de diálogo (KEEP).
4. **Verificar por código antes de desplegar:** parsear los `<script>` (0 errores),
   ningún `id` de grid/elemento duplicado, y que no quedó ningún emoji en `<button>`/
   `<summary>`/títulos (grep). Recién ahí subir versión + `git push`.
5. Inty verifica en su teléfono (cerrar/reabrir por la caché del SW).

## Referencia
Inventario completo (emoji · conteo) generado 2026-07-30 — 194 únicos / 667 usos. El
grueso de UI está mapeado arriba; el resto sigue las reglas por categoría (flechas,
medallas, clima, media-controles, edificios, etc.).
