# 🎡 Animación NUEVA — rueda de oro del login (para RETOMAR)

Inty pidió dejar TODO esto consolidado para retomar. Es la nueva animación del logo/rueda
en la pantalla de login. **Estado: EN PROGRESO, NO mergeada — Inty dice que "se ve mal a
tamaño real" → falta SIMPLIFICARLA.**

## Dónde está todo
- **Rama:** `origin/wip/rueda-oro-necesita-simplificarse` (1 commit: "wip(rueda): NO MERGEAR
  TAL CUAL - Inty dice que se ve mal a tamaño real").
- **Toca:** `index.html` y `bienvenida.html` (la rueda SVG + su animación).
- **Asset nuevo:** `logo-transparent-gold.png` (logo dorado; ya en la rama).
- **Banco de alternativas de animación:** `COORDINACION-IA/ANIMACIONES-LOGO.md` (opciones
  A "Giro suave", B "Rodando", etc., listas para reusar).

## Qué cambió (vs producción)
1. **Movimiento:** de `lpSpin` (giro parejo 7s lineal) → **`lpCoast`** (gira rápido y
   desacelera como rueda que va frenando: `0→400→760→980→1060→1080°` en 6s cubic-bezier).
2. **Render de la rueda SVG:** de colores planos → **degradados dorados** (`lpGold` radial,
   `lpTire` neumático, `lpRimLight` brillo de aro) + drop-shadows/glow.
3. **Imagen:** `logo-transparent.png` → **`logo-transparent-gold.png`**.

## El problema (feedback de Inty)
**"Se ve mal a tamaño real."** El logo se renderiza en `.lp-logo-wrap` (~210×210 px). A ese
tamaño chico, los degradados finos + el glow + el coasting quedan **recargados/sucios** —
lo que se ve lindo en grande no lee bien en chico.

## Qué hacer para retomar (simplificar)
Método de Inty: **mockup → ✓ de Inty → aplicar** (no codear directo). Ideas para simplificar,
probando SIEMPRE al tamaño real (~210px) y en el teléfono:
- **Menos degradados:** reducir los stops de `lpGold`/`lpTire` (2-3 máx) o volver a oro plano
  con un solo highlight; a 210px los degradados de 5 stops se emplastan.
- **Menos glow/sombras:** quitar o bajar mucho los `drop-shadow` (a tamaño chico ensucian).
- **Movimiento más sobrio:** o dejar el giro simple (`lpSpin`), o un coasting más suave (menos
  vueltas), o usar una de las guardadas en `ANIMACIONES-LOGO.md` (A "Giro suave" es candidata).
- **Regla:** que se vea nítido y elegante A 210px, no a 600px. Mockup primero, Inty aprueba,
  y recién ahí a `index.html` + `bienvenida.html` (mismo cambio en ambos).

## Cómo cerrarlo (protocolo)
1. Mockup del logo animado a tamaño real → Inty da ✓.
2. Aplicar en rama (rebasar `wip/rueda-oro...` sobre main actual, o rama nueva).
3. `node tests/run.mjs` 13/13 + probar en navegador Y teléfono al tamaño real.
4. Subir versión (3 lugares) + merge a main → deploy.

## Estado
- Rama wip pusheada (el trabajo NO se pierde). Producción sigue con la animación
  "Revelado" (`lpReveal`) actual, intacta. Nada roto.

— Consolidado por Opus, 2026-08-14, a pedido de Inty. Reclamable por cualquier cuenta.
