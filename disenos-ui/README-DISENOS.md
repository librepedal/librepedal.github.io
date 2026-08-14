# 🎨 Diseños de interfaz — dos modelos elegibles (guardado 2026-08-14)

Aprobado por Inty. Base: **v8.51** (Fase A del pulido ya en código; ver
`../COORDINACION-IA/SPEC-PULIDO-UI-2026-08-14.md`).

## Los dos modelos (el usuario elige el que más le guste)
- **`modelo-a-solido.html`** — Modelo A "Sólido". Botones con superficie sólida + profundidad
  sutil (realce interior + sombra). Es la Fase A ya aplicada a `index.html` (CSS exacto).
- **`modelo-b-cristal.html`** — Modelo B "Cristal". Botones y **contenedores en vidrio**
  (transparencias, `backdrop-filter`) sobre el fondo. Darma en vidrio dorado.
- **`mockup-pulido-completo.html`** — el pre-diseño completo (botones, insignias, logros,
  lenguaje de íconos línea/Lucide, lote de navegación). Referencia del sistema.

## ⚠️ ALCANCE: esto va a TODA LA APP (pedido explícito de Inty 2026-08-14)
No es solo las pantallas de muestra. El tema debe reestilizar **todas** las superficies:
botones, tarjetas (`.hero-viaje`, etc.), modales, la esfera de apps, chips, overlays del
mapa, nav, formularios — todo consistente.

**Cómo se implementa (arquitectura):**
- Un ajuste por usuario `lp_tema_ui` = `solido` | `cristal`, guardado en localStorage +
  Firestore (como los demás ajustes).
- Se aplica poniendo una clase en `<body>`: `body.tema-solido` / `body.tema-cristal`.
- **Todo el CSS de componentes se escribe respetando esa clase** (variables/tokens por
  tema), no valores sueltos. Así el switch es instantáneo y pareja en toda la app.
- Selector en Perfil/Ajustes (Sólido ↔ Cristal), con preview.

## Comportamientos nuevos (van en AMBOS modelos)
- **Logros ocultos**: los no conseguidos salen como "?" ("Logro por descubrir"). Se revelan
  al desbloquear. (PENDIENTE afinar con Inty: misterio total vs. dar una pista de categoría;
  si el "casi listo" muestra progreso o no.)
- **Pistero anuncia**: al desbloquear un logro, Pistero lo dice con una frase (voz + burbuja).
  (PENDIENTE afinar: tono; frase a medida por logro (24) vs. genérica; con brillo/festejo o no.)

## Estado / pendientes
- Fase A (pulido sólido) en código v8.51, commit local, SIN pushear (Inty lo revisa) y SIN
  desplegar (falta MI-CLOUDFLARE.txt + arreglo de deploy-seguro.sh).
- Fase B: migración de íconos a línea (Lucide) — 395 usos / 152 únicos, por lotes con preview.
- Tema Cristal + selector app-wide: NO implementado aún (este README fija el diseño).
- Afinar comportamiento de logros ocultos + frase de Pistero (preguntas arriba).
