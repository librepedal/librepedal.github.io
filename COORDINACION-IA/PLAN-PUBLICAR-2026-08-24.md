# Plan para publicar — mañana 2026-08-24

_Escrito la noche del domingo 23-ago por la sesión Lenovo._

> ## ✅ ACTUALIZACIÓN 2026-08-24 ~05:00 — YA SE PROBÓ EN VIVO, CON DATOS REALES
> Con la cuota ya recuperada y permiso explícito de Inty, se probó la rama completa contra
> Firestore de producción real (referrer `localhost:8935` autorizado temporalmente en la
> API key de Firebase, cuenta de prueba `intyrivera@gmail.com` — una de las 3 de siempre).
> El **Paso 1** del plan de abajo ya no hace falta como bloqueo: esto es más fuerte que
> medir con la app cerrada, es la app real funcionando.
>
> **Resultados, con números:**
> - Arrancar la app (login + Inicio): **78 documentos** leídos (antes: ~1.100).
> - Abrir el mapa la PRIMERA vez: **4.029 puntos reales** en `recommendations` — confirma
>   que el "~4.000 puntos" del comentario original era exacto, no exagerado.
> - Abrir el mapa la SEGUNDA vez (cache + consulta incremental): **0 lecturas nuevas**,
>   los 4.029 puntos se restauran al instante desde `localStorage`.
> - Taller: se pinta solo con abrirlo (5.261 caracteres de HTML), sin depender de GPS.
>   Neumáticos ya tiene fecha propia (migración funcionando).
> - **No se perdió ningún dato real** — verificado con lecturas `{source:'server'}` (sin
>   caché) antes y después de cada escritura.
>
> **Y se encontró + arregló UN bug más gracias a esta prueba** (commit `eb3ed47`, ya
> pusheado): el login por código de tester nunca pasaba por `sincronizarAlEntrar()`, así
> que en la PRIMERA sesión de cualquier cuenta no se restauraba nada desde la nube — y la
> escritura de esa función subía `km` sin haber leído la nube primero. En una cuenta
> EXISTENTE con km real desde otro dispositivo, un primer login en un dispositivo nuevo lo
> podía pisar con 0. Arreglado: ahora restaura primero (reusando la misma lectura que ya
> hacía para las cosméticas, sin costo extra) y recién después escribe.
>
> **Con esto, el Paso 1 de abajo es opcional** (se puede seguir haciendo por costumbre,
> pero ya no es la única forma de confirmar que el arreglo sirve). Los Pasos 2 y 3 siguen
> en pie tal cual — falta el mergeo real y la medición en producción, que es distinta de
> probar en local aunque use el mismo Firestore.

---

> **Antes que nada:** mergear a `main` **ES publicar**. `deploy-cloudflare.yml` despliega solo
> en ~40 s, y `capacitor.config.json` apunta a `server.url: https://librepedal.cl`, así que la
> app de Play Store **no corre el código del AAB: carga la web en vivo**. Le llega a los 51
> testers al instante. No hay ensayo posible.

---

## Los 3 pasos, en este orden

### Paso 1 — Medir ANTES de tocar nada (2 minutos)

Con la app **cerrada por todos**, abrir:

```
https://console.firebase.google.com/u/0/project/librepedal-cb983/firestore/usage
```

**Qué mirar y qué significa:**

| Lo que ves | Qué significa |
|---|---|
| Contador cerca de cero y plano | ✅ Nada consume con la app cerrada. Confirmado que era el costo por apertura |
| Sube solo, sin nadie usando | ⚠️ Hay algo en bucle. **No publicar**, avisar y buscamos eso primero |

**Anotar el número de lecturas.** Es la línea base del paso 3.

> Ojo: la consola dibuja las horas con la zona del navegador. El reloj de este PC estaba en
> huso europeo y se corrigió a Santiago — **cerrar y reabrir Chrome** para que el gráfico
> muestre horas de Chile.

### Paso 2 — Publicar

```bash
git checkout main && git pull && git merge --no-ff fix/bugs-revision-2026-08-24 && git push origin main && git push lab main
```

GitHub Actions publica solo en ~40 s. Verificar que `https://librepedal.cl/version.txt`
devuelva **8.770**.

### Paso 3 — Medir DESPUÉS (la prueba de que sirvió)

1. Abrir `https://librepedal.cl` **una sola vez**, entrar y quedarse en Inicio.
2. En la consola del navegador (F12), escribir: **`lpLecturas()`**
3. Sale el desglose de documentos leídos por colección, más el total.

**Qué esperar:**

| | Antes | Después |
|---|---|---|
| Abrir la app y quedarse en Inicio | ~1.100 documentos | **decenas** |
| Abrir el mapa por primera vez | toda la colección `recommendations` | igual la primera vez, **casi cero** a partir de la segunda (caché) |
| Abrir Chat / Novedades / Taller | ya estaban leídos al arrancar | se leen recién ahí, una vez |

Si el total de abrir la app pasa de ~200 documentos, algo no quedó bien: avisar y lo miro.

---

## Qué se publica

| Área | Qué |
|---|---|
| Bugs | Los 6 de la revisión (4 de Tundra + 2 que faltaban) |
| Regresión | El guard de `au()` dejaba **la lista de Taller vacía** al abrirla sin GPS |
| Pérdida de datos | La mantención pisaba el historial de la nube al arrancar; la caché de puntos podía llenar `localStorage` y tumbar `gd()` (los km del usuario) |
| Rendimiento | Abrir la app pasa de ~1.100 lecturas a decenas |
| Blindaje | La app avisa si la cuota se agota (antes fallaba en silencio) + `lpLecturas()` para medir |
| Guardián | Un test que falla si alguien vuelve a escribir una lectura sin techo |
| Versión | `APP_VERSION`, `sw.js` y `version.txt` los tres en **8.770** |

**Tests: 18/18.** Todo lo importante verificado por mutación (se reintroduce el bug a
propósito y se comprueba que el test falla).

---

## Lo que NO entra

- **`wip/modo-conduccion-resena`** — Modo conducción + Reseña de la app. Es función nueva y no
  corresponde meterla en plena prueba cerrada. Después.

---

## Pendientes que quedan anotados

1. **Tundra** — `collection('usage').get()` del panel admin ya tiene `limit(500)`, pero
   conviene paginarlo de verdad cuando esa colección crezca.
2. **Tundra** — confirmar si `showReportesOnNavMap()` lee de la global `reportesData`. Si es
   así, hay que agregar `_subUnaVez('reportes', subscribeToReportes);` al principio de
   `viewCompletedTrip`, porque la pantalla de Viajes ya no engancha ese listener.
3. **Preexistente, decisión de Inty** — `revisarRodadasProximas()` y `revisarRetosCumplidos()`
   solo corren en el arranque de **registro nuevo**, no en el de **sesión que vuelve**. Está al
   revés de lo lógico (un recién registrado no tiene retos que revisar). No lo cambié porque
   agregarlo al arranque contradice el trabajo de rendimiento: hay que decidir si van ahí o
   se disparan al abrir la pantalla que corresponde.
4. **De fondo** — el plan gratis de Firestore da 50.000 lecturas al día para **todo el
   proyecto**. Con el arreglo alcanza para mucho más, pero conviene mirar el panel de uso
   cada tanto a medida que entren usuarios.
