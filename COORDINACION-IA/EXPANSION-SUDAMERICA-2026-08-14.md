# 🌎 EXPANSIÓN SUDAMÉRICA — orden de trabajo (delegable, 2026-08-14)

Inty decidió: **vamos con toda Sudamérica.** Delegar a la(s) otra(s) cuenta(s) (Capone /
la otra cuenta Cloud) vía esta carpeta. Todo en ramas, tests 13/13, `main` = producción.
Evaluado por Opus; aquí el estado real y las tareas.

## Estado actual (medido)
- **Rama `origin/feature/i18n-sudamerica`** (ya consolidada en origin) trae: i18n marca
  pan-latino, Pistero adaptativo por país, **voces por país** (Chile=Azure es-CL / resto=
  ElevenLabs neutro), **jerga regional** (AR, CO, PE, VE, EC, UY, BO, PY) en `frasesFlavor`,
  y **proxy ElevenLabs `?eltts=` en `worker-ia`**. Tests 12/12 en su base.
- **Mapas: YA sirven en toda Sudamérica** — el mapa centra en el GPS real del usuario y usa
  tiles globales (OSM/openfreemap). NO hay que tocar el motor de mapas.
- **Talleres**: usan OSM/Overpass (global) → funcionan fuera de Chile.

## ⚠️ Lo que FALTA para Sudamérica (no está en ninguna rama)
1. **Puntos referenciales amarrados a Chile.** En `index.html` (~línea 4570) hay una lista
   hardcodeada de zonas de **Santiago** (`Barrio Meiggs`, `Estación Central`, lat/lon fijas,
   `ciudad:'Santiago'`). Para Sudamérica: hacerla **por país/ciudad** (o dinámica por la
   ubicación del usuario) — que no asuma Santiago para un ciclista en Lima o Bogotá.

## Tareas (reclamables — pon tu cuenta + rama al tomarlas)
- **T-SA1 (P0) — ✅✅ MERGEADO A PRODUCCIÓN (v8.56, vivo en librepedal.cl).** Marca LibrePedal
  intacta; descriptor pan-latino vivo; i18n+voz+jerga por país en producción. **FALTA SOLO:
  desplegar el Worker `worker-ia`** (`cd worker-ia && npx wrangler deploy` + API key ElevenLabs
  como secreto del Worker) para que la voz premium por país (no-Chile→ElevenLabs) funcione;
  mientras tanto degrada seguro a voz nativa. Historia previa:
  Opus ya mergeó `feature/i18n-sudamerica` sobre main v8.55, resolvió el conflicto de voz
  (sin `navigator.onLine` + ruteo por país `_cl ? Azure : Eleven`), verificado: **0 conflictos,
  tests 13/13, banco 930 mp3 intacto, branding pan-latino ("cicloturismo latinoamericano"),
  worker `?eltts=` integrado.** FALTA SOLO: (1) **✓ de Inty** a la marca pan-latino; (2) merge
  de `feature/sudamerica-integrada` → main (deploy web auto); (3) **desplegar el Worker
  `worker-ia` aparte** (`cd worker-ia && npx wrangler deploy`, revisar `wrangler.toml` + que
  la API key ElevenLabs esté como secreto del Worker). Con eso, parità 100% por país.
- **T-SA2 (revisado) — Zonas rojas: NO fabricar.** Los "puntos referenciales" (línea ~4569,
  `ZONAS_ROJAS`) son datos de SEGURIDAD reales (CIPER/prensa) de Chile. ⚠️ **PROHIBIDO
  inventar zonas de peligro para otros países** (regla de Inty: seguridad = dato real o nada).
  La app YA degrada seguro fuera de Chile (chequeo por distancia → sin avisos falsos) y se
  llena con reportes REALES de la comunidad. Acción: **dejarlo así**. Si algún día hay data
  real verificada por país, agregarla con su fuente; nunca generada por IA. NO es un bug.
- **T-SA3 (P1) — Selector de país completo.** Owner: LIBRE. Verificar que el `<select>` de país
  (index.html ~741, hoy incluye 🇨🇱) liste todos los países objetivo y que Nominatim use el
  `countrycodes` correcto (ya existe el hook, ~línea 6811).
- **T-SA4 (P2) — Branding pan-latino.** Owner: LIBRE. Verificar que la rama i18n cambie los
  meta ("app del ciclismo chileno", "Hecho en Chile", og:url) a algo pan-latino, sin romper
  el dominio `.cl` (sigue siendo el host). Coordinar con Inty el nombre/marca.
- **T-SA5 (P1) — firestore.rules pan-latino.** Owner: LIBRE. Resolver el hold de
  `PAUSA-FIRESTORE-RULES` (colecciones i18n/país/`frasesFlavor`) y publicar UN solo archivo.

## Orden sugerido
Inty aprueba marca → T-SA1 (merge i18n) → T-SA3/T-SA4 (país/branding) → T-SA2 (POIs) →
T-SA5 (rules) → recién ahí el **AAB final** (ver `HANDOFF-FINAL-2026-08-14.md`).

## Cómo delegar/coordinar
Cada cuenta toma una T-SA, la marca EN-CURSO aquí (commit corto a main), trabaja en su rama,
pushea, y avisa. Latido cada 5 min (CLAUDE.md). Nada a main sin validar + ✓ de Inty.

— Opus, 2026-08-14. Producción en v8.55, estable.
