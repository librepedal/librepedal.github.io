# Checklist obligatoria antes de cualquier envío a Play Console

> Instalado 2026-09-22, pedido directo de Inty tras 3 rechazos seguidos (envíos #17, #18,
> y el rechazo previo "Missing Prominent Disclosure"). Versión de `P09-envio-tiendas-app.md`
> del repo `fabrica-contenido-ia`, aplicada específicamente a LibrePedal con los IDs y
> herramientas reales de este proyecto. Leer también `P09` y `P10` en ese repo para el
> porqué completo — esto es la versión operativa, corta, para usar en el momento del envío.

## Antes de tocar nada: leer, no inferir

- Play Console → **policy-center** → abrir el issue real y leer "Ver más información
  sobre este problema". **NUNCA** dar por buena una causa de rechazo inferida desde
  `EN-USO.md`, memoria, o suposición — el rechazo #17 (video privado) se dio por
  "Missing Prominent Disclosure" durante días hasta que alguien leyó el detalle real.
- Revisar la **campana de notificaciones** de Play Console.
- Confirmar la **cuenta de Google activa**: Play Console = `inty405@gmail.com`
  (`/u/0/` en el perfil de Chrome "librepedal", pero el índice puede variar en otros
  perfiles — ver `librepedal-cuentas-google-por-servicio` en memoria). Si algo "no
  existe", probar antes con la cuenta/índice correcto que asumir que se perdió.
- Link directo a la pista activa (Alpha): `https://play.google.com/console/u/0/developers/7214985752909042364/app/4976151700640409134/tracks/4698956180064664289`

## Los 4 ítems que YA causaron un rechazo real — verificar SIEMPRE

1. **Cada video de declaración de permisos es accesible y PÚBLICO.**
   ```bash
   node scripts/verificar-video-publico.mjs "<url-del-video>"
   ```
   Si devuelve `FALLA` con HTTP 401/403 → el video está privado, **no enviar**. El
   script NO distingue "público" de "no listado" (ambos dan 200 en oEmbed) — si la
   política exige "Público" estricto, confirmarlo a mano en YouTube Studio.
   Además, abrir el video completo en el **navegador integrado**
   (`mcp__Claude_Browser__`, sin sesión de Google) y confirmar que muestra los 4
   elementos que Google exige por escrito: función en acción, uso en 2do plano, aviso
   destacado propio, diálogo nativo del sistema. La extensión Claude in Chrome **no
   sirve** para esto — usa la sesión propia del dueño.
   *(Causa real del rechazo #17, 11-sept-2026: `youtube.com/shorts/xFtAN9x-ofU` estaba
   en privado.)*

2. **"Datos de acceso" / "Sign in details" tiene una cuenta demo/invitado cargada.**
   Contenido de la app → Datos de acceso (o desde la ficha de la versión). Si la app no
   necesita login, declararlo explícito en ese campo — nunca dejarlo vacío.
   *(Causa real del rechazo del envío #18, 22-sept-2026: "Login credentials are
   missing" — Google ni pudo revisar el resto de la app.)*

3. **Aviso destacado (prominent disclosure) antes del diálogo nativo**, si se usa
   `ACCESS_BACKGROUND_LOCATION` o cualquier permiso sensible. Verificar en el flujo
   real de la app, no en el código.
   *(Causa real del rechazo previo, 10-sept-2026: "Missing Prominent Disclosure".)*

4. **Ningún envío/edición mientras un envío anterior siga "En revisión".** Reenviar
   reinicia el plazo completo de revisión (Google lo confirmó por escrito en el ticket
   de soporte del envío #18).

## Después de enviar

Registrar en `COORDINACION-IA/BITACORA.md` (o `EN-USO.md` si aplica): qué build, qué se
verificó de esta lista, y el ID del envío. No alcanza con "ya lo mandé".

## Gate automático de código (complementario, ya activo en este repo)

`.claude/settings.json` de este repo instala un hook que bloquea automáticamente:
archivos de código >1000 líneas, y código en falso (TODO de implementación pendiente,
stubs, catch vacíos) recién escrito y sin commitear. No reemplaza esta checklist — ataca
un problema distinto (calidad de código, no verificación de envíos). Detalle completo:
`protocolos/P10-gate-automatico-codigo.md` del repo `fabrica-contenido-ia`.

**Pendiente de verificar en vivo:** este hook se probó en pipe-test y en el repo
`fabrica-contenido-ia` con cwd real, pero todavía NO se confirmó disparando en una
sesión de Claude Code abierta directamente en este repo (LibrePedal). La primera sesión
que abra con cwd en esta carpeta y toque un archivo de código: confirmar que el hook
dispara (editar algo grande a propósito y ver que bloquea) y borrar esta nota.
