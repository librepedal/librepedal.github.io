# 🔒 Quién está editando `index.html` AHORA MISMO

Este archivo es un **candado, no un historial** — se sobreescribe, no se
acumula. Sirve para que las dos sesiones de Claude que trabajan en este
mismo repo (en la misma carpeta local, no en copias separadas) no editen
`index.html` al mismo tiempo sin saberlo.

**REGLA OBLIGATORIA, para AMBAS sesiones, sin excepción:**

1. **Antes de editar `index.html` (o cualquier archivo que la otra sesión
   también podría tocar), lee este archivo.**
   - Si dice `LIBRE` → puedes editar. Sigue al paso 2.
   - Si dice `OCUPADO` con una hora de **menos de 45 minutos** → NO edites
     todavía. Espera, o trabaja en algo que no choque (otro archivo, o algo
     de tu propio territorio que no dependa de lo que la otra sesión está
     tocando).
   - Si dice `OCUPADO` con una hora de **más de 45 minutos** → probablemente
     esa sesión terminó y se le olvidó liberar el candado (pasa). Es seguro
     asumir que quedó abandonado: edita, y al terminar deja el candado en
     `LIBRE` con tu propio sello.
2. **Apenas empieces a editar, actualiza este archivo** con tu sesión, la
   hora actual, y una frase corta de qué vas a tocar. Así, si la otra sesión
   se pone a trabajar 2 minutos después que tú, ve el candado puesto.
3. **Apenas termines de commitear (push incluido), vuelve a poner `LIBRE`.**
   No dejes el candado puesto "por si vuelvo más tarde" — eso bloquea a la
   otra sesión sin necesidad.
4. Si vas a hacer una sesión LARGA (más de 45 min de trabajo seguido),
   actualiza la hora del candado cada tanto para que no parezca abandonado.

---

## Estado actual

**LIBRE** - sesion Claude Code (cuenta de hoy), 2026-08-14 03:5x. FASE A del SPEC-PULIDO-UI-2026-08-14 LISTA EN CODIGO (v8.51), sobre base v8.50 traida de produccion:
- Botones (.ab/.ab sec/.bg): profundidad sutil (realce interior + sombra), se hunden al :active, primario con brillo controlado. Solo CSS.
- Insignia Darma (.darma-badge): ahora moneda de metal (oro cepillado, numero tabular, dharmachakra fa en disco hundido). Solo CSS.
- Logros (mostrarLogros): filas planas -> MEDALLA (medallon circular .lg-* + arco de progreso naranja; oro+glow al desbloquear). CSS nuevo + render reescrito con clases.
- Version subida en los 3 lugares: APP_VERSION 8.51 / version.txt 8.51 / sw.js v851.
- Validado: node validate.js -> 3 bloques, 0 errores.
PENDIENTE: (1) Inty verifica en el telefono; (2) FASE B = migracion de iconos UI a linea (Lucide), 395 usos / 152 unicos, NO hecha (necesita verificacion en navegador); (3) deploy bloqueado: falta MI-CLOUDFLARE.txt en esta maquina y deploy-seguro.sh no copia voces-el ni los .js nuevos (traer arreglo de la otra cuenta).

(anterior) LIBRE - sesion Thunderobot, 2026-07-29 18:54. Planificador Desde-Hasta (v7.51), desplegado y verificado.

(anterior) LIBRE - sesion Thunderobot, 2026-07-29 18:54. Integre el planificador Desde-Hasta (v7.51). Desplegado y verificado. PENDIENTE: prueba en telefono real de Inty.
