# Traspaso 2026-10-08 tarde — app abierta para el evento (8.814 → 8.817) y lo que quedó pendiente

Escrito por la cuenta que trabajó el 2026-10-08 (sesión "retomar lo que dejó la otra cuenta"), a pedido de Inty:
"deja esto y lo que estás haciendo para que lo retome otra cuenta".

**Contexto:** el **2026-10-09** Inty muestra Libre Pedal a ~30 personas en un evento (sin publicidad en internet). Pidió
que la app "quede libre para cualquier usuario que la descargue". Después del evento quedará abierta para todo el mundo, y
con los datos de uso del evento decidirá qué pagar (Firebase Blaze, etc.).

**Play Store:** la app está en **PRODUCCIÓN, pública** (ficha con "Instalar", 10+ descargas; Inty recibió el correo de
aprobación). Los documentos del repo que dicen "Alpha / prueba cerrada" están desactualizados. La app instalada carga
`https://librepedal.cl` (`capacitor.config.json` → `server.url`), así que todo merge a `main` le llega sin revisión de Google.

## Publicado hoy (todo en `main`, verificado en vivo con `version.txt`)

| Versión | Qué | Rama |
|---|---|---|
| 8.814 | App abierta: "Entrar con Google" acepta cualquier correo verificado; código del evento `LIBREPEDAL` (acepta "LIBRE PEDAL", minúsculas, guiones) solo para correos SIN cuenta; límite por IP 5 → 60 (todo un evento entra por el mismo Wi-Fi). Login dice "Entrar con código". | `feature/abrir-app` |
| 8.815 | Video 3D (claqueta en Mis rutas): sale siempre 1080x1920 (9:16, MP4 primero) y al terminar "Compartir video" (share de archivo); si no se puede, descarga y dice "Descargas"; en la app instalada (WebView) dice la verdad. | `fix/sin-gpx-competencia` |
| 8.816 | GPX como **portabilidad** (Inty: "para que la gente pueda migrar sus datos a otra app, o traerlos"): botón propio "Descargar GPX (llevar tu ruta a otra app)" con ícono de descarga, "Descargar ruta actual (GPX)" en Estadísticas, "Importar ruta desde otra app". Sin nombrar Strava/Komoot/Wikiloc en nada visible. | `fix/gpx-portabilidad` |
| 8.817 | Nombre editable en Perfil (lápiz junto al nombre bajo Pistero, como WhatsApp/Strava, 2–25 caracteres). Se guarda en `users/{cu}` con `nombreElegido:true`; `auth-sesion.js` ya no lo pisa con el nombre de Google al volver a entrar. **Inty lo probó en su teléfono: funciona.** Estilos en `perfil-nombre.css` (estilos.css pasa de 1000 líneas, el gate lo bloquea). | `design/nombre-perfil` |

Tests nuevos: `tests/worker-auth-abierto.test.mjs` (36), `tests/video-compartir-redes.test.mjs` (31),
`tests/nombre-perfil.test.mjs` (20). Suite: 62/62 verde.

## Worker de acceso (`worker-auth/`, desplegado A MANO con wrangler — no lo despliega el CI)

- Versión en vivo: `c695c35b` (la del código con espacios). Secreto nuevo: `CODIGO_EVENTO` = `LIBREPEDAL`.
- Código del evento: solo correos sin `users/{cu}` en Firestore (lo consulta por REST con la cuenta de servicio) y sin estar
  en `TESTERS_PERMITIDOS`; marca `evento:<correo>` en el KV `RATE_LIMIT_AUTH` para volver a entrar. Falla cerrada.
- Los testers (todos los correos de Inty lo son) **no** entran con el código del evento: es a propósito.
- Para cerrar el código después del evento: `npx wrangler secret delete CODIGO_EVENTO` en `worker-auth/`.
- Pendiente no probado en vivo: que un correo con cuenta sea rechazado (sin permiso para leer producción; la prueba local
  sí lo cubre). Inty sí vio un 403 con su correo de tester (correcto).

## ⚠️ Play Console: ficha a medias (NO enviar a ciegas)

- Cuenta de Play Console: **inty405@gmail.com**. En el Chrome "Browser 1" (Claude in Chrome) está; en el otro no.
- Se cambió en la descripción completa la línea
  `- Exporta tus rutas en formato GPX para usarlas en Strava, Komoot u otras apps.` por
  `- Tus rutas son tuyas: descárgalas en formato GPX para llevarlas a otra app, o importa las que traes de otra.`
  Quedó **guardada como borrador** ("Cambios en borrador" en Ficha predeterminada). **No está publicada.**
- En "Descripción general de la publicación" el único cambio pendiente que aparece es **"Prueba cerrada – Alpha:
  29851067 (8.802) Iniciar lanzamiento completo"** (viejo). El borrador de la ficha NO aparece en la lista. "Guardar para
  más adelante" sobre la Alpha no persistió al recargar. **No tocar "Enviar 1 cambio a revisión"** mientras solo liste la
  Alpha 8.802 (mandaría una versión vieja a los testers). Averiguar (documentación oficial de Play Console sobre
  publicación administrada desactivada y borradores de ficha) cómo enviar SOLO la ficha, y hacerlo con OK de Inty.

## Sesiones abiertas en paralelo (worktrees propios, nada publicado)

- **"Un solo vuelo: video del sobrevuelo y fuera Video 3D"** — Inty: "debería ser solamente el sobrevuelo para descargar y
  compartir". Plan: grabar el sobrevuelo (`sobrevuelo-3d.js`) como video 9:16 compartible y recién entonces quitar el Video
  3D. Estado: **cuadros del video listos, esperando OK de Inty.** Hasta aprobarlo, el Video 3D NO se quita.
- **"Ciclistas cercanos en el sobrevuelo y el video"** — anotar durante el viaje quién pasó cerca / adelantamientos y
  mostrarlos en el sobrevuelo. Decisión de privacidad de Inty: **"solo pistero por ahora"** (sin nombre; nunca en modo
  fantasma). Estado: diseñando (maqueta primero).

## Pendientes (en orden)

1. Ficha de Play (arriba).
2. Después del evento: revisar los datos de uso del evento (qué se mide hoy y qué falta) — Inty lo quiere para decidir pagos.
3. Enlace al correo (login sin contraseña): el DNS de librepedal.cl YA tiene DKIM de Brevo (`brevo1/brevo2._domainkey`),
   DMARC y `brevo-code`; el bloque está oculto en `index.html` (`#bloqueLinkMagico`). Probar enviando un correo real (con OK
   de Inty) y, si llega, volver a mostrarlo y apagar el código del evento.
4. Firebase plan gratis = 50.000 lecturas/día (~600 aperturas). Para el público: plan Blaze + alerta de gasto (lo activa
   Inty; mueve plata).
5. Compartir archivos (video, imagen del sobrevuelo, GPX) **dentro de la app instalada**: el WebView de Android no
   descarga blobs ni (probablemente) tiene `navigator.share`. Arreglo real: plugin nativo (`@capacitor/share` +
   filesystem) en un AAB nuevo → revisión de Play. Hasta entonces la app lo dice y manda a Chrome.
6. Elección del nombre al **primer ingreso** (hoy solo en Perfil). Maqueta antes.
7. Sigue vigente lo de antes: "Elige tu Pistero" fases B–D (`COORDINACION-IA/PLAN-ELIGE-PISTERO-APP.md` en
   `feature/elige-pistero-app`), bienvenida (`feature/bienvenida-fondo`, faltan voces/reglas/prueba real), mascotas (solo
   diseño en `feature/mascotas`).

## Dónde está el trabajo local

Worktree `C:\Users\flgan\librepedal-abrir` (en la máquina flgan), sin cambios sin commitear. Memoria del proyecto:
`app-abierta-evento.md`.
