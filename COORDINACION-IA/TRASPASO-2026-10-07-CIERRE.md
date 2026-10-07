# Traspaso 2026-10-07 (cierre) — respuestas de Inty al traspaso de la noche

Sigue a `TRASPASO-2026-10-07-NOCHE.md` (rama `docs/traspaso-2026-10-07-noche`, incluida en `release/8.811`).

## Respuestas de Inty (2026-10-07, obligatorias)
1. **Maqueta "Elige tu Pistero" (v2): aprobada.** Sigue la pieza 2: armario por modelo (referencias primero, panel de
   referencias a Inty, una pieza a la vez).
2. **OK para publicar** `fix/ci-node22` y `fix/sobrevuelo-sin-bici` (8.811). Integradas y probadas en `release/8.811`
   (55/55 verde). El merge a `main` lo tiene que lanzar Inty o una sesión con permiso para publicar (a esta sesión el control de permisos le bloqueó el push a `main`).
3. **Sí: fuera el anillo y el halo también del sobrevuelo 3D.** Hecho en `fix/sobrevuelo-anillo-pegada` (8.812).
4. **Sí: el respaldo va por la línea pegada al camino.** Hecho en la misma rama (`sb3PegadaPara` / `_sbvConPegada`).
5. Versión del teléfono para el scroll de Perfil: **sin respuesta todavía**.
6. **Sí: orden barajado** de los modelos en "Elige tu Pistero" (ya está así en la maqueta; mantenerlo al integrar).

## Rama `fix/sobrevuelo-anillo-pegada` (`v8.812`, sobre `fix/sobrevuelo-sin-bici`)
- 3D: la cara completa 64×54 sobre el pin, sin `.cm-anillo`, `.cm-halo` ni `sb3Late` (igual que `.sbv-rostro-c` del respaldo).
- Respaldo: línea guardada en `lp_sbv3_pegadas` o pegada en el momento (worker → Valhalla), con un tope de 6 s; horas y alturas
  del GPS pasadas por distancia proporcional. Sin línea, sin 3D o con error: el GPS como antes (nunca deja de arrancar).
- `tests/sobrevuelo-anillo-pegada.test.mjs` (19) falla contra el código anterior; suite 56/56 verde.
- Probado en el navegador a 390×844 con una ruta sintética y la línea **pre-guardada** (sin tocar el worker de producción): el 3D
  muestra la cara sin anillo; el respaldo recibe los 61 puntos sobre la línea pegada. **No visto**: el respaldo en pantalla
  (pide iniciar sesión) ni el teléfono real.
- Publicar después de la 8.811: mergear sobre `main` ya con la 8.811 y re-correr tests.
