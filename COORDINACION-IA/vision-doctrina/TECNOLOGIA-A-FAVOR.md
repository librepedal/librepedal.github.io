# 🛡️ Toda la tecnologia a favor — defensa automatica anti-regresiones

Pedido de Inty (2026-07-19): "quiero una solucion real a que hacemos cosas y eso
crea errores en otra zona del proyecto" + "quiero toda la tecnologia a mi favor".

## El problema raiz (por que un cambio rompe otra zona)
1. TODO vive en un `index.html` de ~8.000 lineas con estado global compartido
   (`cv`, `ig`, `us`, `vozCola`, `frasesUsadas`...). Cambiar una funcion/variable
   puede romper CUALQUIER parte que la usaba — sin fronteras, todo conectado.
2. No habia red automatica: cambias X y NADA avisa que se rompio Y. Te enteras por
   Sentry (usuario sufriendo) o por Inty.
3. Dos sesiones editando el mismo archivo, sin tipos.

## La solucion: 5 capas de defensa automatica (que la maquina cace, no Inty)
Escribes codigo -> linter caza patron malo -> tipos cazan la forma incorrecta ->
tests cazan la regresion -> CI bloquea deploy roto -> Sentry caza lo que se escape.

| Capa | Que hace | Estado |
|---|---|---|
| **1. Tests automaticos** | Atrapan regresiones en cada cambio, en cualquier zona | ✅ MONTADO (ver abajo) |
| **2. CI (GitHub Actions)** | Corre los tests solo en cada push; marca rojo si algo se rompe | ✅ MONTADO (`.github/workflows/tests.yml`) |
| **3. Sentry** | Vigila errores reales de usuarios 24/7 | ✅ ya existia (`MI-SENTRY.txt`) |
| **4. Chequeo de tipos** (JSDoc + `tsc --checkJs`) | Caza los "undefined"/forma incorrecta antes de produccion | ⬜ pendiente |
| **5. Linter** (ESLint) | Caza patrones peligrosos al escribir | ⬜ pendiente |
| **La cura de fondo: modularizar** | Partir el monolito en modulos con fronteras -> un cambio no puede romper otra zona | ⬜ incremental, protegido por la Capa 1 |

## Como usar la red de tests (AMBAS sesiones, obligatorio de ahora en adelante)
- **Antes de dar algo por "listo": corre `npm test`.** Si esta rojo, no se entrega.
- **Cada bug que arregles -> agrega su test** en `tests/*.test.mjs`, para que NO vuelva.
- Los tests corren solos en cada push (CI). Un push que rompe algo queda en rojo en GitHub.

## Estructura
- `tests/run.mjs` — corre todos los `tests/*.test.mjs` (exit != 0 = fallo).
- `tests/voz-prioridad.test.mjs` — primer test (prioridad de voz, 12 checks).
- `package.json` -> `npm test`.
- `.github/workflows/tests.yml` — CI.

## Proximas piezas (en orden)
1. Mas tests unitarios de logica pura (cada fix futuro).
2. Smoke test E2E que carga el `index.html` real (Playwright) y verifica los flujos
   criticos -> ese prueba el codigo REAL, no copias. Es la pieza mas potente.
3. `tsc --checkJs` + JSDoc en las funciones mas fragiles.
4. ESLint.
5. Modularizar (la cura de fondo), un modulo a la vez, protegido por los tests.
