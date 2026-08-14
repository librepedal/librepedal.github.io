# BRIEF — Rediseño de Pistero (aspecto + animación) y bocadillos de pantalla

**Pedido de Inty (2026-07-30):** quiere VER varias opciones antes de decidir; siente que
la app aún "parece de años atrás". Dos frentes: (1) aspecto+animación de Pistero, (2) los
globos de texto (`.section-info`, 17 en total) que comen espacio en cada pestaña.
Delegado para producir la dirección que Inty elija.

## 1. Pistero — 3 direcciones (ya mostradas a Inty en mockup animado)
- **A · Orbe minimal:** casco + anillo que gira (lo actual, afinado). Sobrio, discreto.
- **B · Cara expresiva:** el casco parpadea y mueve la boca al hablar; respira en reposo.
  Más personalidad/"vivo". Implementable en SVG (SMIL/CSS) sin peso extra.
- **C · Orbe de onda (premium):** fluido reactivo estilo Siri/Kimi (blobs + ecualizador),
  casco como pequeño emblema al centro. El más moderno.

**DECISIÓN DE INTY (2026-07-30): Opción C (orbe de onda premium).** PERO el personaje del
centro hay que trabajarlo mucho más: el casco actual (`miniHelmetSVG`) "parece South Park"
— crudo, plano. Inty quiere calidad real usando la **RTX** (no otro vector plano). Así que
el emblema del centro del orbe C = **arte generado en la RTX** (ver abajo), no el SVG actual.
La identidad = casco de ciclista (naranja/gris), amable, NO robot (ver [[pistero-asistente-voz]]).

### Arte ilustrado en la RTX (delegar a Capone/ComfyUI cuando la GPU esté libre)
Generar 3-4 conceptos por estilo (Z-Image-Turbo 1024², método verificado en
`ESTADO-COMPARTIDO.md`). Prompts base (cascо naranja + gris, cara amable, ciclismo):
1. `flat vector mascot, friendly cyclist wearing an orange bike helmet, minimal modern app icon, clean geometric, dark UI background, centered, high contrast`
2. `soft 3D render, cute friendly cyclist helmet character, rounded, pixar-like, studio lighting, orange and slate palette, app assistant avatar`
3. `minimal duotone line icon of a cyclist helmet face, single weight strokes, premium, monochrome orange on dark`
4. `glassy translucent voice-assistant orb with a small cyclist helmet emblem inside, neon orange/blue waveform, futuristic, dark background`
Entregar los PNG a Inty como galería de opciones (R2 o carpeta), NO auto-aplicar.

## 2. Bocadillos `.section-info` — 3 soluciones (ya mostradas en mockup)
Hoy: caja con h4+párrafo arriba de 17 vistas → gasta alto, aire de app vieja.
- **A · Título + info bajo demanda:** solo el título (ícono FA + nombre) y un botón "i"
  chico que abre la descripción (tooltip/sheet) al tocar. Divulgación progresiva (Nielsen).
- **B · Coach-mark de 1ª vez:** el explicativo aparece una vez por pantalla (localStorage
  `lp_seen_<view>`), descartable con ✕; después, solo el título. Guía a nuevos, limpio a veteranos.
- **C · Barra superior fina:** el nombre de la pantalla va en un app-bar delgado (‹ atrás /
  título / ⋯), sin caja. Máximo contenido, estilo app moderna.

**DECISIÓN DE INTY (2026-07-30): Opción C (barra superior fina), sin caja.** Aplicar a las
17 vistas: app-bar delgado (‹ atrás / título con ícono FA / ⋯ opcional). Ahorra ~60-90px
por pantalla. El texto explicativo que valga la pena se mueve a un coach-mark de 1ª vez o al
"i" — pero la cabecera por defecto = barra fina.

## Ejecución (worker que lo tome, tras la elección de Inty)
- Candado `EN-USO.md`. Editar `index.html` CRLF-safe con anclas exactas.
- Pistero: implementar la variante elegida en el orbe (`#micBtn`) + donde se muestre su cara.
  Respetar reglas de [[pistero-asistente-voz]] (micro se pausa al hablar, etc.).
- Bocadillos: refactor de `.section-info` a la variante elegida, en las 17 vistas, con
  íconos FA (ver [[lenguaje-visual-pro]] / `BRIEF-ICONOS-BOTONES.md`).
- Verificar por código (parseo, sin IDs dup) + versión en 3 lugares + push (Action despliega).
- Inty verifica en su teléfono.
