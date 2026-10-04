# Traspaso 2026-10-04 (noche) — botón de Google probado, ícono de voces, y lo que viene

Escrito por la sesión "Libre Pedal avance y pendientes" (Claude, máquina de Inty) al pedirle
Inty que deje todo listo para que lo retome otra cuenta. **Reemplaza a `HANDOFF-2026-10-04.md`
donde se contradigan** (ese archivo quedó desactualizado en varios puntos, ver §1).

Reglas de siempre: nada a `main` sin tests + prueba en el teléfono + ✓ de Inty. Una rama por
tarea. Nada de UI sin mockup aprobado.

## 1. Estado real verificado hoy (corrige notas viejas)

- **Producción web:** `librepedal.cl/version.txt` = **8.803** (Taller v2 + Pistero solo-app ya en `main`).
- **Play Store producción:** **8.800** (29837901), publicada el 24-sep (envío #19). Políticas:
  "No se encontraron problemas". Contenido de la app: 12 declaraciones completas.
  - El video de permisos cargado en Play es `youtube.com/shorts/xXM77Q9waTY` (accesible). El
    `xFtAN9x-ofU` privado que citan auditorías viejas **ya no se usa**.
  - La 8.802 **nunca se envió a revisión**: está en Alpha esperando. `HANDOFF-2026-10-04.md`
    decía "en revisión": era falso.
- **Prueba interna (Play):** publicada hoy la **8.802 (29851067)**, testers = listas "interna" y
  "google error" (inty405, intyrivera, intyrivera.a). Enlace de tester:
  `https://play.google.com/apps/internaltest/4701537688803405264`.
- **Botón "Entrar con Google" nativo: FUNCIONA** en el teléfono real de Inty (Vivo V2520,
  Android 16), instalado desde Play (prueba interna): abre el selector de cuentas y entra.
  - Faltaba la huella SHA-1 **de la firma de Play** en Firebase (`librepedal-cb983`, app
    Android `cl.librepedal.app`): **agregada hoy** `BF:19:CE:35:95:CC:AB:8F:F3:98:BD:3F:50:C3:2C:9B:82:FE:99:9B`.
    La SHA-256 de Play (`85:E9:50:9F:…:4D:DD`) NO se agregó (opcional).
  - Firebase solo es accesible con la cuenta **intyrivera@gmail.com** (inty405 no tiene permiso).
  - `google-services.json` del repo todavía no trae esa huella (no hace falta para funcionar).

## 2. Ramas pusheadas, sin mergear

| Rama | Qué tiene | Próximo paso |
|---|---|---|
| `fix/google-signin-a-main` | Los 2 commits de `fix/google-signin-nativo-cap8` (plugin `@capacitor-firebase/authentication`, `rgcfaIncludeGoogle`, `google-services.json` en `patch-android.js`, mensaje "sin cuenta de Google") sobre `main` actual. Versión **8.804**. Tests 41/42 (falla solo `iconos-lucide`, preexistente con Node 24) | Con ✓ de Inty: merge a `main`, compilar AAB con `build-aab-release.yml` y subir a producción (escalonado). Sin esto, el próximo AAB desde `main` **pierde** el login de Google |
| `fix/icono-voz-arquetipos` | Parlante "Escuchar voz" de los arquetipos centrado (heredaba `.custom-option svg{height:44px}`). Verificado con captura antes/después | Juntar con la próxima versión web |
| `feature/pistero-v2-armario` | De OTRA sesión ("Pistero mejorado con accesorios y skins"), versión 8.805 | Espera ✓ de Inty. **Ojo con las versiones**: 8.804 y 8.805 chocan; el que mergee segundo re-numera |
| `docs/traspaso-2026-10-04-noche` | Este archivo + el mockup de §3 | Mergear cuando Inty quiera |

Ramas ya absorbidas en `main` y borrables: `feat/taller-v2`, `fix/taller-detalles`,
`fix/pistero-solo-app`, `fix/perfil-volver-customize`, `deploy/pistero-sobre-prod`.

## 3. Decidido hoy con Inty (listo para programar)

Mockup (aprobado por partes durante la sesión; confirmar ✓ final antes de codear):
https://claude.ai/artifact/PERMGFMBiBHjppboQ6A4oe — fuente en
`disenos-ui/bandeja-y-bienvenida/mockup.html`. El Pistero del mockup es el SVG REAL
(`_pisteroExprSVG` de `pistero-apariencia.js`), no uno dibujado a mano (Inty rechazó el dibujado).

### 3.1 Bienvenida de Pistero (una sola vez por cuenta)
- Texto elegido (opción B). **No mencionar "Chile"** (la app va a toda Sudamérica):
  > ¡Qué bueno que llegaste! Bienvenido a Libre Pedal, la comunidad ciclista. No hicimos esta app solo para contar kilómetros: la hicimos para que juntos dejemos una huella en nuestras rutas, nuestros pueblos y nuestra gente. Parte de lo que se junta va a un fondo, y la comunidad decide en qué se usa. ¿Qué cambiarías tú? Deja tu idea.
- Pistero lo dice en voz alta con la voz "El de siempre" y lo muestra en una hoja con su cara.
- Botones: **"Dejar mi idea"** (principal → pantalla del fondo), **"Vamos a rodar"**, y un
  enlace chico "¿Dudas? Ayuda y contacto".
- Marcar en la nube (doc del usuario) que ya se mostró, para no repetirlo en otro teléfono.
- Hoy la app dice saludos aleatorios (`saludoBienvenida` en `app-estado-global.js`,
  `_pisteroIntroPrimeraVez` en `prevuelo-intro-pistero.js`): la bienvenida nueva NUNCA se programó.

### 3.2 Fondo de la comunidad (reemplaza la votación fija de `gamificacion-comunidad.js`)
- **Todos** pueden dejar ideas: máx. **2 por cuenta**, **privadas** (nunca se publica el texto).
- Sin ideas predefinidas: se retiran las 4 opciones fijas (reforestar/seguridad/bicis/deportistas).
  Los votos viejos en `votacionComunidad` quedan guardados pero no se muestran ni cuentan.
- Las ideas que dicen lo mismo se **agrupan** (IA) y las **5 más repetidas** se muestran **en vivo**
  con un **título neutro** (no el texto del usuario → evita problemas de contenido de usuarios en Play).
- **Votan solo los suscritos Premium**: 1 voto por cuenta, cambiable mientras esté abierta. Al no
  suscrito que toca "Votar", Pistero dice: "Tu idea ya está sumada. Votar es para los suscritos: tu
  suscripción alimenta el fondo, por eso tu voto decide en qué se usa." + "Suscribirme y votar" /
  "Ahora no". Sin urgencias falsas ni contadores (política de Play).
- **Fondo por país**: el **10% de lo neto de Premium** de cada país va al fondo de ese país; ideas,
  top 5 y votos también por país; monto en moneda local; la pantalla muestra
  "Fondo de tu país · AAAA" con el monto acumulado (hoy $0: Premium aún no cobra).
- **Cierre anual el 31 de diciembre**: se invierte en la idea más votada y se muestra en qué se usó.
  Si no alcanza, se acumula al año siguiente. Las ideas parten de cero cada año.
- Estas reglas van también en `terminos.html` (y revisar el texto del sorteo, que Play puede ver
  como engañoso: ver `AUDITORIA-PLAY-2026-10-04.md` en la rama `docs/auditoria-play-2026-10-04`).
- No publicar ninguna meta de usuarios o ingresos: lo público es solo la regla del 10%.
- Pendiente de contabilidad (no bloquea programar): ejecutar el fondo como compras con factura
  (bicis, talleres, materiales vía clubes/fundaciones locales), no como donación en dinero, por el
  riesgo de "gasto rechazado". Primer cierre real: 31-dic-2027.
- Ideas de modelo de datos (propuesta, no implementada): `ideasFondo/{anio}_{uid}_{1|2}`
  {pais, texto, ts}; `fondoTop/{anio}_{pais}` {opciones:[{id,titulo,cuenta}], actualizado} lo
  escribe el agente; `votosFondo/{anio}_{pais}_{uid}` {opcion} con regla que exija premium leído
  de un doc que solo escribe el servidor; `fondo/{anio}_{pais}` {monto, moneda}.

### 3.3 Centro de ayuda ("Ayuda y contacto") con respuestas listas
- Buscador que filtra un **catálogo de respuestas dentro de la app** (instantáneo, sin internet):
  cada respuesta = pasos cortos + botón que abre la pantalla exacta + "¿Se resolvió? Sí / No,
  escribir" (si no, el mensaje al equipo sale con la pregunta ya escrita).
- Primeras 10 (de la tabla del mockup): revisión técnica → Mi vehículo; permiso y SOAP → Taller;
  mantención de la bici → Taller; voz/personalidad de Pistero → Pistero; Pistero habla mucho/poco →
  Ajustes; contactos SOS → SOS; planificar ruta → Mapa; mis viajes → Mis viajes; no puedo entrar →
  cómo entrar; borrar mi cuenta → escribir al equipo (lo atiende una persona).
- Navegación interna: `cv('mac')` = Taller (ver `_tallerAbrir()` en `taller-avisos.js`),
  `cv('map')`, `cv('trips')`, `cv('ajustes')`, `cv('customize')`, `cv('dash')`… (`cv()` en
  `motor-navegacion.js`).
- "Escribir al equipo": temas (Duda de uso / Algo no funciona / Idea / Mi cuenta o pagos), adjunta
  versión de la app y modelo de teléfono. WhatsApp **+56 9 7747 2250** solo como opción secundaria
  con el número a la vista.
- "Mis mensajes": hilo por consulta con estado "Respondido" / "Lo revisa el equipo"; las respuestas
  del agente también traen botón de atajo.

### 3.4 Bandeja + agente (para que Inty no responda cada mensaje)
- Todo a una bandeja en Firestore (p. ej. `soporte`): mensajes de "Escribir al equipo", reseñas con
  comentario (`resenasApp`) y correos a `contacto@librepedal.cl` (Cloudflare Email Routing → Email
  Worker → Firestore).
- Agente cada ~15 min (cron del worker, usando la IA que ya usa `worker-ia`, Workers AI, sin costo
  extra): clasifica; **responde solo dudas de uso y errores conocidos**, con atajo del mismo catálogo.
  **Pagos, borrar cuenta, quejas y denuncias NO los responde**: los deja en un **resumen diario** a
  Inty con borrador. Las preguntas que se repiten se suman al catálogo.
- El mismo agente agrupa las ideas del fondo y escribe el top 5 por país.
- Los mensajes privados entre usuarios (`dm`, `chat`) NO entran a la bandeja.

### 3.5 Pistero en ruta (Inty: "la precaución vial es invasiva y se equivoca")
Problema encontrado: el banco `ciudad` (`pistero-frases-pais.js`: "Respeta el semáforo", peatón,
casco, puertas de autos…) se dispara cuando `zonaActual==='ciudad'` (`motor-gps.js`,
`bromasDelCamino`), y la detección por reverse-geocoding confunde pueblos rurales con ciudad →
"semáforo" en el campo. Además el banco `rapido` y varios arquetipos sermonean ("Frena un poco",
"Cuidado en las curvas", "no es una carrera").

Recomendación entregada a Inty (pidió la recomendación; confirmar el último punto):
1. **Copiloto, siempre y fuera del tope**: subidas y bajadas anticipadas con % y distancia
   (`avisarPendienteAnticipada`), curvas cerradas solo al navegar con destino (OSRM, `motor-navegacion.js`
   ~510), mal clima solo si empeora de verdad (`_cambioClimaRelevante`), viento en contra
   (`_avisarVientoEnContra`). Tono informativo, sin sermón ("Ojo con la velocidad y los frenos" fuera).
2. **Copiloto cultural, fuera del tope**: dato real de Wikipedia al entrar a un lugar nuevo
   (`contarAnecdotaDelLugar` en `pistero-chat-ia.js`), una vez por lugar, **máx. 1 cada 10 km**.
3. **Compañía: exactamente 4 por viaje** (ánimo/ritmo/humor/hitos): salida, ~1/3, ~2/3 o hito,
   llegada. Sin destino: salida, 5 km, 15 km, al terminar. Reemplaza `BROMAS_OBJETIVO_RUTA=10`
   (actualizar `tests/bromas-espaciado-ruta.test.mjs`).
4. **Se eliminan**: todo el banco `ciudad` y las frases de sermón vial en todos los bancos.
5. **Sin confirmar por Inty**: que "Pistero habla" (Ajustes) controle solo la compañía:
   Callado 0 / Normal 4 / Hablador 6, con los avisos de copiloto siempre activos.

### 3.6 Otros pendientes de la planificación del 2-oct
- Pantalla de **borde a borde** (targetSdk 36): revisar en el teléfono que SOS, menú y mapa no
  queden bajo las barras; márgenes CSS `env(safe-area-inset-*)` + `viewport-fit=cover` si hace falta.
- Optimización R8: después de Premium, primero en prueba cerrada.

## 4. Orden sugerido para quien retome
1. Pedir a Inty el ✓ final del mockup (§3) y la confirmación de §3.5 punto 5.
2. `fix/pistero-copiloto` (§3.5): lógica pura + tests; no necesita mockup.
3. `feature/bienvenida-fondo` (§3.1 + §3.2, primero el lado app; el agrupado puede empezar con un
   conteo simple hasta tener el agente).
4. `feature/centro-ayuda` (§3.3).
5. Bandeja + agente en el worker (§3.4).
6. Borde a borde (§3.6).
7. Con ✓ de Inty: mergear `fix/google-signin-a-main` + `fix/icono-voz-arquetipos` (+ lo que esté
   listo), subir versión en los 3 lugares, AAB y producción escalonada.

## 5. Datos útiles
- Teléfono de Inty conectado por USB en la máquina "flgan": `adb` en
  `C:\Users\flgan\tools\android-sdk\platform-tools\adb.exe`; Java en `C:\Users\flgan\tools\jdk21`.
- Play Console: cuenta inty405@gmail.com, app `4976151700640409134`, developer `7214985752909042364`.
- Libre Pedal quedó instalada en el teléfono desde la prueba interna (8.802) y con sesión iniciada.
