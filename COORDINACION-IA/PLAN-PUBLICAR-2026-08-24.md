# Plan para publicar — mañana 2026-08-24

_Escrito la noche del domingo 23-ago por la sesión Lenovo. Todo lo de abajo está listo y
probado; falta el visto bueno de Inty y una verificación que **solo se puede hacer con la
cuota de Firestore recuperada** (se reinicia ~03:00 hora de Chile)._

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
