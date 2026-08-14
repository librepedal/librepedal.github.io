# 🚀 EMPEZAR AQUÍ — cualquier cuenta Claude que retome LibrePedal

Punto de entrada único. Léelo y en 2 minutos sabes el estado y qué hacer. Actualizado
2026-08-14 por la cuenta Opus (antes de quedarse sin crédito). Meta de Inty: dejar
LibrePedal al 100% + **AAB final** para Play, e ir a **toda Sudamérica**.

## 1) Sincroniza SIEMPRE primero (latido)
```bash
git fetch origin && git checkout main && git pull --ff-only origin main
```
Reglas completas en `../CLAUDE.md` (auto-cargado): nunca commit directo a main; una rama
por tarea; deploy = merge a main (automático); NO deploy manual; tests 13/13 antes de mergear.

## 2) Estado actual (verificado)
- **Producción: v8.55 EN VIVO**, estable, cero errores. Tests 13/13.
- Ya en `main`: tema Sólido/Cristal + íconos Font Awesome + taller GPS + voces por arquetipo.
- Consolidado en origin (sin mergear aún): `feature/i18n-sudamerica` (expansión).

## 3) La ÚNICA decisión que Inty debe dar (destraba mucho)
**¿Aprueba el rebranding pan-latino de Sudamérica?** Con su sí → se puede mergear la
expansión. Sin eso → queda en su rama, sin riesgo.

## 4) Qué hacer — por prioridad (toma una, márcala EN-CURSO, trabaja en rama)
| # | Tarea | Doc detallado |
|---|-------|---------------|
| **P0** | **AAB final** para Play (keystore YA existe en `Downloads/KEYSTORE-LIBREPEDAL-RESPALDO`; cargar 4 secretos → correr workflow "Construir AAB firmado" sobre v8.55). **La ÚLTIMA cuenta lo sube, con Inty (admin).** | `HANDOFF-FINAL-2026-08-14.md` |
| **P0/P1** | **Expansión Sudamérica** (5 tareas T-SA: merge i18n, POIs por país, selector país, branding, rules) | `EXPANSION-SUDAMERICA-2026-08-14.md` |
| **P1/P2** | **Backlog general** (21 tareas: perf, PWA, accesibilidad, código, seguridad) | `BACKLOG-MEJORAS-2026-08-14.md` |
| **P1** | **Voz clon local** (indistinguible, listo; espera ✓ de Inty para generar banco ampliado) | `VOZ-CLON-LOCAL-2026-08-14.md` |
| **P2** | **Tema Cristal**: falta verificar en teléfono + afinar si algo se ve mal (botones/Darma ya en vidrio) | `SPEC-TEMAS-APP-WIDE-2026-08-14.md` |

## 5) Auditoría CEO (contexto de por qué cada tarea)
`AUDITORIA-CEO-2026-08-14.md` — revisión de toda la app por área, priorizada.

## 6) Cómo NO chocar entre cuentas
- Una rama por tarea = tu candado. Marca la tarea EN-CURSO en su doc/backlog (commit corto a
  main), pushea tu rama seguido. Latido cada ~5 min. Deja nota de qué tomaste.
- Zonas calientes de `index.html`: voz dinámica (~2785), superficies del tema, íconos. Coordinar.

## 7) Orden recomendado para cerrar todo
1. Inty aprueba pan-latino → mergear `feature/i18n-sudamerica` (T-SA1, resolver 1 conflicto de voz).
2. T-SA3/T-SA4 (país/branding) + T-SA2 (POIs por país) + T-SA5 (rules).
3. Verificar tema Cristal en teléfono; con ✓ de Inty, banco de voz ampliado.
4. **Recién con todo en orden y probado: AAB final** (última cuenta + Inty).

— Todo está escrito. Nada que re-derivar. Producción intacta en v8.55. A trabajar. 🚴
