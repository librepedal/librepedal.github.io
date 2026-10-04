# Auditoría Play Store de LibrePedal — 2026-10-04

Hecha desde el **equipo de emergencia** (usuario `flgan`) por pedido de Inty, contra `origin/main`
del 2026-10-03 y la checklist `CHECKLIST-ENVIO-PLAY-STORE.md`. **No se cambió nada de código por
esto**: son hallazgos para que la cuenta que tome LibrePedal los resuelva antes del próximo envío.

## 🔴 Pueden causar rechazo

1. **Video de permisos en PRIVADO.** `node scripts/verificar-video-publico.mjs "https://youtube.com/shorts/xFtAN9x-ofU"`
   → `HTTP 403: video PRIVADO` (misma causa del rechazo #17). Desde el 23-sep ya no hay
   `ACCESS_BACKGROUND_LOCATION`, pero `FOREGROUND_SERVICE_LOCATION` sigue y su declaración en Play
   Console también pide video. **Inty:** pasarlo a Público en YouTube Studio; después revisar en
   Play Console qué video quedó en cada declaración y borrar la de ubicación en 2.º plano si sigue.
2. **No existe "eliminar cuenta" dentro de la app** (política de eliminación de cuentas). `git grep`
   sin resultados (ni UI, ni `user.delete()`, ni worker). Además `privacidad.html` línea 100 dice
   *"o usa la opción de eliminar cuenta dentro de la app"*: promete algo que no existe.
   → Botón en el perfil que borre usuario + datos de Firestore (mockup primero, regla de diseño).
3. **Contenido de usuarios sin denunciar ni bloquear** (política UGC). Hay mensajes directos
   (`social.js`, colección `dm`), `guiComments`, `recommendations`, `rodadas`, `frasesComunidad`,
   perfiles públicos. Los términos sí prohíben contenido ofensivo, pero falta: botón **denunciar**
   contenido/usuario y botón **bloquear** usuario (obligatorio con chat entre personas).
4. **Sorteo de la comunidad sin bases** (`gamificacion-comunidad.js`, botón "Anotarme al sorteo").
   Play exige bases oficiales + aviso de que Google no patrocina. El texto "los premios se entregan
   cuando el proyecto tenga los fondos… sin fecha comprometida" puede leerse como engañoso.
   → Inty decide: ocultarlo en la versión de Play o redactar bases.

## ✅ Verificado OK

targetSdk/compileSdk 36 (Capacitor 8.5.2) · sin `ACCESS_BACKGROUND_LOCATION` · sin
`SCHEDULE_EXACT_ALARM`/`RECEIVE_BOOT_COMPLETED` · aviso destacado con opción de declinar ·
RECORD_AUDIO solo al usar la voz · POST_NOTIFICATIONS pedido · privacidad y términos en vivo (200)
y enlazados en la app · la 8.802 (rama `fix/google-signin-nativo-cap8`) tiene los mismos permisos que main.

## ⚪ Solo verificable en Play Console (con Inty)

Datos de acceso con cuenta demo (rechazo #18; el correo debe estar en `TESTERS_PERMITIDOS`) ·
video en la declaración de servicio en primer plano · Seguridad de los datos (ubicación, correo,
nombre, mensajes, lo que va a la IA y a la voz) + URL de borrado · clasificación de contenido
("usuarios interactúan", "comparte ubicación": `liveTracking`) · estado de la revisión de la 8.802.

## Otra app: +Pewes (la "app de escalada")

Repo `intyriveraa-lab/pequepedia`. Su traspaso completo está en ese repo:
`docs/TRASPASO-2026-10-04.md`. Usa a LibrePedal como modelo de cumplimiento de Play.
