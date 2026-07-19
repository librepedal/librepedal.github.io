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
Última sesión: 1, 2026-07-19 — BLINDAJE listeners Firestore (top Sentry, 12 ev iOS):
parche global a onSnapshot (~línea 1236) que le da manejador de error a los listeners
sin onError -> ignora el permiso-denegado benigno del arranque (carrera auth) + re-
engancha solo + reporta errores reales; unsub envoltorio sin fugas. NO toca reglas ni
auth. Verificado con Firestore real (chat entrega datos + unsub OK; diarios permiso-
denegado manejado sin crash; cero errores consola). Test: firestore-blindaje.test.mjs.
npm test verde 2/2. FALTA: confirmar en iPhone Safari (necesita el tel de Inty) + deploy.
OJO: si tocas onSnapshot o el flujo de auth (~línea 1219-1236), lee este parche antes.

--- candado anterior ---
LIBRE
Última sesión: 1, 2026-07-19 — fix crash Sentry mlPolyline.addTo (map undefined ->
guard no-op; issues Sentry 7607413878/7611377185). Verificado en navegador (addTo
undefined/null no crashea, addTo(map valido) sigue dibujando, cero errores). FALTA
deploy. NOTA: el frame()/lat (10 ev) se revisó — YA estaba bien arreglado en v6.98,
los eventos son de clientes con SW viejo cacheado; NO tocar. Antes: monté red de
tests + CI (npm test / GitHub Actions) — ver TECNOLOGIA-A-FAVOR.md.

--- candado anterior ---
LIBRE
Última sesión: 1 (voz), 2026-07-19 — fix crash real de Sentry en obtenerFraseUnica:
claves de arquetipo (categoria@arqId) no venían pre-inicializadas en frasesUsadas ->
.push() de undefined crasheaba la 1a vez que se usaba una frase de arquetipo. Ahora
se inicializa a [] antes del push. Verificado en navegador (reproduje el crash exacto
'reading push' con la lógica vieja + la función arreglada devuelve frase y no crashea).
FALTA: deploy. Sentry issues 7611282094 / 7613232824 deberían dejar de aparecer.

--- candado anterior ---
LIBRE
Última sesión: 1 (voz), 2026-07-18 — voz chilena ENCENDIDA por defecto (arregla
"volvió la voz antigua"): antes vozMejorada arrancaba off y al limpiar localStorage
caía a la nativa gringa. Ahora default on salvo que el usuario la apague. Worker de
voz chilena verificado vivo (devuelve MP3). Verificado en navegador. FALTA: oír en
teléfono real + DEPLOY. (Antes en esta misma sesión: bus de PRIORIDAD de voz,
commit 5bab3fd, avisos ya no se pisan.)

--- candado anterior ---
LIBRE
Última sesión: 1 (voz), 2026-07-18 — bus de audio con PRIORIDAD (commit 5bab3fd):
los avisos ya no se pisan (queja real de Inty). 4 niveles ambiente<info<navegación
<seguridad, función decidirVoz + _cortarActual (interrumpe sin borrar la cola) +
_vozSiguiente saca el de más prioridad. Caída/SOS → hUrgente. Verificado con
tests/voz-prioridad.test.mjs (12/12) y en la app en vivo (cero errores de consola).
FALTA: confirmar el feel final en teléfono real + DEPLOY (no desplegado aún).
También rescaté antes cambios sin commitear (commit 45c6ae9: fix zoom móvil 16px +
botón planificador) que estaban sueltos y se podían perder.
OJO sesión 2: si tocas navegación, `hCorta` ahora es prioridad NAV (no corta todo);
usa `hUrgente()` para seguridad y `hAmbiente()` para relleno.

--- candado anterior ---
LIBRE
Última sesión: 2 — v7.00, dos quejas UX reales de Inty:
(1) avisos de voz al abrir la app ("estoy grabando tu viaje" y revisión
de la bici) se disparaban con el auto-arranque silencioso del GPS al
loguearse, no con un viaje real → parámetro `silencioso` agregado a
toggleGPS/lpWakeLock.enable/lpSalud.start (verificado en navegador).
(2) sonido de cadena "genérico y muy fuerte" → cadenaClick(): agregada
resonancia grave (cuerpo mecánico) + compensación de volumen (bp1+bp2 se
sumaban antes de aplicar v; -31.3% verificado numéricamente).
v7.00 deployado (librepedal.cl + www → 7.00 verificado por curl) y
pusheado. Sigue el protocolo.
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
