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

```
LIBRE
Última sesión: 2 — protocolo de excelencia, 5 casos aplicados (ver
BITÁCORA v6.91-v6.95): (1) cerró tarea #88. (2) desnivel en "elige tu
ruta". (3) avisos de la comunidad por ruta candidata (Waze). (4) rodadas
con ruta adjunta (Strava Clubs). (5) superficie del camino (ripio/
tierra) reportada por la comunidad, también en "elige tu ruta" — de
paso se encontró que superficie quedaba silenciosamente excluida del
aviso de peligros por no tener vigencia definida, y se resolvió con una
búsqueda aparte. v6.95 deployado (librepedal.cl → 6.95) y pusheado,
todo verificado en navegador. Sigue el protocolo — candidato siguiente:
revisar el flujo de "Ver todas en el mapa"/combinar rutas, o Segmentos.
```

---

## Por qué existe esto (no lo borres)

Pedido explícito de Inty (2026-07-13): "quiero que desde ahora haya una
coordinación sin fallas" entre las dos cuentas de Claude que trabajan en
paralelo sobre este mismo repo, de forma **permanente** — no solo para hoy.
Antes de esto, ya hubo un caso real: sesión 2 dejó 72 líneas de cambios sin
commitear y sesión 1 tuvo que rescatarlas a mano (commit `3da21e4`) para que
no se perdieran. Este candado existe para que esa clase de susto no dependa
de que alguien se acuerde de mirar `git status` a tiempo — un archivo que se
lee ANTES de tocar nada es más difícil de olvidar que una regla de memoria.

**Por qué un archivo y no otra cosa:** las dos sesiones comparten la MISMA
carpeta en el MISMO disco (no son clones separados) — así que un archivo de
texto es un candado real y barato: cualquiera de las dos sesiones lo puede
leer y escribir al instante, sin depender de que git termine de sincronizar.

Ver también `PENDIENTES.md` (protocolo completo y reparto de territorio) y
`BITACORA.md` (historial de qué se hizo, por versión).
