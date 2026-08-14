# SPEC — Pulido fino de UI + lenguaje de íconos (aprobado por Inty 2026-08-14)

**Estado:** diseño APROBADO por Inty sobre mockup. Falta implementar en `index.html`.
**Mockup de referencia (aprobado):** https://claude.ai/code/artifact/466e780a-a05b-4f1b-8a47-2204f1f44a99
**Base:** v8.50 (repo ya al día tras el catch-up desde producción, commit 9ff1b18).
**Lee antes de codear:** `METODO-TRABAJO-DISENO.md`, `BRIEF-ICONOS-BOTONES.md`, `EN-USO.md` (candado), `LEEME.md` (protocolo técnico).

---

## Pedido de Inty (textual)
1. "Darle una reposadita a los botones para que se vean más bonitos."
2. "Las insignias de recompensa, los logros — todo eso necesita una remodelación fina, relevante, muy elegante."
3. "Busca símbolos de Darma real y lo trabajamos finamente." → símbolo real = **Dharmachakra**.
4. "Quiero que **cada ícono** de la app pase por un filtro detallista — sutileza y elegancia."

## Decisiones aprobadas (NO re-preguntar)
- **Lenguaje de íconos = LÍNEA FINA estilo Lucide** (libre, ya usado en los íconos de modo).
  Reemplaza el sólido pesado de Font Awesome en la UI. Trazo delgado, esquinas
  redondeadas, tamaño óptico consistente por contexto. Color apagado por defecto,
  **naranja (`--p`) solo en activo / acción principal**.
- **Darma = Dharmachakra** (8 rayos = Camino Óctuple, cubo central, aro). **Vector SVG**,
  NO imagen de difusión (ComfyUI/Recraft solo si algún día se quiere una moneda "hero"
  renderizada para splash/Play Store — es un asset aparte, no el ícono de UI).
- Paleta intacta: `--p:#fc4c02`, `--d:#0a0f1d`, `--g/oro:#ffd700`. Es pulido de
  terminación, no cambio de marca.

## Alcance por bloque (lo que se construye)

### 1. Botones (`.ab`, `.ab sec`, `.bg`)
- Profundidad sutil: realce interior de 1px arriba + sombra baja. Sin color nuevo.
- Presión táctil real: al `:active` se hunde (escala + sombra interior). Fitts ≥44px.
- Primario `.bg`: brillo controlado + barrido de luz al tocar (no chillón).
- Jerarquía: primario lleno · secundario relieve · **fantasma** (contorno) · **peligro**
  (`.ab danger`, rojo sobrio — crear).
- Ícono FA→Lucide a la izquierda, gap por CSS (no inline).

### 2. Insignias y recompensas
- **Darma**: de "rótulo amarillo" a **moneda de metal** — degradado oro cepillado,
  número grande y tabular, Dharmachakra en disco hundido, brillo lento que cruza.
- **Rangos** bronce→plata→oro con lenguaje de medalla (disco + anillo).
- **Candados** de tienda: píldora oscura con filo de oro; al desbloquear → naranja. Sin emoji.

### 3. Logros (`LOGROS`, `mostrarLogros()` ~línea 6044+ en v8.34; reubicar por ancla en v8.50)
- De fila plana → **medalla**: medallón circular con anillo metálico.
- **Progreso = arco** naranja alrededor del medallón (elimina la barra suelta).
- Desbloqueado: anillo cerrado + medallón en oro + late 1 vez. Check en chip de oro.
- Bloqueado: gris azulado apagado, ícono se mantiene (no candado genérico).
- Header con anillo global "X de 24".

### 4. Lenguaje de íconos (pasada completa)
- Migrar los íconos de UI de FA sólido → set de línea (Lucide). Inventario base:
  `BRIEF-ICONOS-BOTONES.md` (194 emojis únicos / 667 usos ya mapeados a FA; ahora FA→Lucide).
- **NO tocar** lo que ya marca ese brief como contenido/voz (caras de personalidad en
  frases habladas, banderas de país). Regla: si está en `<button>/<summary>/título/chip/
  badge` → migra; si está en un string de diálogo → se deja.
- Reservar oro/sólido solo donde es recompensa si hiciera falta contraste (a criterio,
  la dirección elegida fue línea pareja).

## Ejecución (protocolo técnico)
1. **Tomar el candado `EN-USO.md`** antes de tocar `index.html`. Coordinar con la otra
   cuenta: fue la que llevó 8.35→8.50 hoy; confirmar que no está editando en paralelo.
2. Editar CRLF-safe (el archivo es CRLF), anclas exactas, abortar si un ancla no matchea.
3. **Sugerencia de fases** (menos riesgo que una sola mega-edición):
   - **Fase A** (contenida, desplegable): botones + insignias + logros + Dharmachakra.
   - **Fase B** (pasada grande): migración de íconos UI a Lucide, por lotes con verificación.
4. Verificar por código antes de desplegar: `node validate.js index.html` (0 errores),
   sin `id` duplicados, ningún emoji en `<button>/<summary>/título`.
5. Subir versión en los 3 lugares (APP_VERSION + version.txt + sw.js CACHE).
6. Desplegar con `deploy-seguro.sh` — **OJO**: hoy no incluye `voces-el` ni los `.js`
   nuevos en su copia; hay que traer el arreglo de la otra cuenta o actualizarlo. Además
   falta `MI-CLOUDFLARE.txt` en esta máquina (solo hay un token "Workers" en scratchpad).
7. Inty verifica en su teléfono (cerrar/reabrir por caché del SW). Bitácora.
