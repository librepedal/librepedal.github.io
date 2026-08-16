# Estado del login con Google — 2026-08-16 (madrugada)

Documento de traspaso. Si sos una sesión nueva, esto es TODO lo que necesitás
saber para continuar sin releer la conversación anterior.

> ## 🎯 RESPUESTA a la duda del versionCode (2026-08-16 ~11:10, sesión cuenta `lab`)
> La otra sesión pidió confirmar el versionCode porque no tenía `bundletool`. Acá sí
> hay, así que queda resuelto:
>
> - **El AAB bueno EXISTE en el disco de Inty y es el `29780948`.** Está en
>   `Downloads/AAB-listo-play-store/LibrePedal-AAB-release/ESTE-ES-EL-BUENO-29780948.aab`
>   (5.157.860 bytes). Verificado adentro: plugin `FirebaseAuthentication` ✓,
>   `providers:["google.com"]` ✓, recurso `default_web_client_id` ✓.
> - El AAB que la otra sesión descargó (`LIBREPEDAL-AAB-MAIN-VERIFICADO/...`) **no
>   está en esta máquina** — cada sesión tiene su propio disco. Igual sirve: se
>   compiló desde `3df82d1`, que es más nuevo. Si se prefiere ese, primero hay que
>   leerle el versionCode.
>
> ### ⚠️ ARCHIVO TRAMPA en la misma carpeta
> `Downloads/AAB-listo-play-store/LibrePedal-AAB-release/app-release.aab` (5.155.858
> bytes, del 16-ago 03:51) **NO sirve**: es el `29780748`. Tiene el plugin pero le
> falta `providers` en `capacitor.config.json` — es exactamente el que hacía crashear
> con `GoogleAuthProviderHandler.signIn(...) on a null object reference`. Además Play
> ya lo rechazó por número repetido. Pesa casi igual que el bueno (2 KB de
> diferencia), así que **por tamaño no se distinguen**: hay que leer el versionCode.
>
> **Moraleja para las dos cuentas:** el tamaño del archivo NO alcanza como prueba.
> Verificar siempre `capacitor.plugins.json` + `capacitor.config.json` + versionCode.

> ## ✅ ACTUALIZADO (2026-08-16 ~09:07, sesión Claude Code) — AAB nuevo real, generado por CI
> El `29780948` de abajo no estaba guardado en ningún disco (se verificó "en la
> máquina" de otra sesión, pero esa máquina no es esta). En vez de asumirlo,
> disparé `build-aab-release.yml` sobre `main` (commit `3df82d1`, que ya incluye el
> fix `55be810` de providers) y verifiqué el binario resultante yo misma:
> - `capacitor.plugins.json` incluye `FirebaseAuthentication` ✓
> - `capacitor.config.json` compilado incluye `providers:["google.com"]` ✓
> - 5.158.336 bytes (~5,16 MB, coincide con el tamaño "bueno")
>
> Descargado en `Downloads/LIBREPEDAL-AAB-MAIN-VERIFICADO/LibrePedal-AAB-release/app-release.aab`.
> Run de CI: https://github.com/librepedal/librepedal.github.io/actions/runs/31938079199
> (versionCode exacto sin confirmar — no hay `bundletool` en este entorno para leerlo
> del binario; version.txt = 8.70. Antes de subirlo, comparar el versionCode que
> Play Console lea de este archivo contra el `29780948`/`29780919` ya mencionados
> abajo, para no subir uno más viejo por error).
>
> Sigue pendiente exactamente lo mismo que decía este documento: **solo Inty puede
> subirlo a Play Console** (pista Alpha, link abajo) — ninguna sesión de Claude tiene
> ni puede tener credenciales de Play Developer.

## El problema que se estaba resolviendo

El login por link mágico (correo) se quedó sin cupo de Firebase cuando 51 testers
pidieron el enlace casi al mismo tiempo (`auth/quota-exceeded`). Inty decidió
reemplazarlo por **login nativo con Google** (selector de cuentas de Android),
que no depende de correos ni de cupos.

## Qué está HECHO y verificado

Todo esto ya está en `main`, pusheado a los dos remotos:

1. **Plugin nativo** `@capacitor-firebase/authentication` en `package.json`.
2. **`google-services.json`** en la raíz (paquete `cl.librepedal.app`, con las
   DOS huellas SHA-1 — la de la clave de carga y la de firma de Play — más el
   web client que el plugin necesita).
3. **`capacitor.config.json`** con `"providers": ["google.com"]`. Sin esto el
   handler de Google queda `null` y la app crashea al tocar el botón.
4. **Workflow** `build-aab-release.yml` copia `google-services.json` a
   `android/app/` antes de compilar.
5. **`index.html`**: `_entrarConGoogle()` detecta el plugin nativo con
   `lpPlugin('FirebaseAuthentication')` y, si está, usa `_entrarConGoogleNativo()`.
   Si no está (instalaciones viejas, web), cae al camino web de siempre.
6. **`_lpAvisoLogin()`**: los errores del login usan `window.alert()` porque
   `lpAviso()` → `mostrarBocadillo()` se niega a mostrar nada fuera de las vistas
   `v-pistero`/`v-map`, así que en la pantalla de login los errores quedaban MUDOS.

**AAB verificado listo: versionCode `29780948`.** Se verificó abriendo el propio
binario (no el log de CI):
- `capacitor.plugins.json` incluye `FirebaseAuthentication` ✓
- `capacitor.config.json` incluye `providers: ["google.com"]` ✓
- recurso `default_web_client_id` existe (google-services.json se procesó) ✓
- pesa 5,1 MB (los builds rotos pesaban 4,5 MB — la diferencia ES el plugin)

## Lo ÚNICO que falta

Subir ese AAB (`29780948`) a la pista **Alpha** (prueba cerrada, la de los 51
testers) y publicarlo. Después: actualizar la app en el teléfono desde Play Store
y tocar "Entrar con Google" — debería abrir el selector de cuentas de Android.

Link de la pista Alpha:
`https://play.google.com/console/u/0/developers/7214985752909042364/app/4976151700640409134/tracks/4698956180064664289`

**OJO:** la versión `29780919`, que ya está publicada en Alpha desde las 7:18 del
16-ago, es una de las ROTAS (sin plugin). Los 51 testers la tienen. Por eso urge
publicar la 29780948 encima.

## Los tres errores que costaron toda la noche (no repetirlos)

1. **El trabajo nativo vivía en la rama `google-signin-nativo`, pero los AAB se
   compilaban desde `main`.** Tres builds seguidos salieron sin el plugin. El log
   de CI decía "Found 4 Capacitor plugins" porque ese log era de la rama.
   → **Verificar el ARTEFACTO, no el log.**
2. **Los errores del login eran invisibles** (ver punto 6 arriba), así que
   "no pasa nada" parecía un misterio cuando en realidad había un error concreto.
3. **Se descartaron dos veces las capturas de Inty como "build viejo"** cuando
   mostraban exactamente el dato que resolvía el caso (la lista de plugins sin
   Firebase). Él reportaba bien.

## Qué NO hacer

- **No mergear la rama `google-signin-nativo` completa a `main`.** Esa rama
  elimina el link mágico del login. Mientras haya testers con builds viejos (sin
  plugin nativo), el link mágico es su única forma de entrar. Se saca recién
  cuando todos estén actualizados.
- **No usar más la pista "Prueba interna".** Se creó anoche solo para probar.
  Todo va a Alpha. No interfiere con la prueba cerrada ni con pasar a abierta,
  pero no sirve para los 51.
- **No mandarle a Inty un AAB sin haberlo abierto y verificado adentro.** Cada
  AAB malo le cuesta una subida, una revisión de Google y una reinstalación.

## Cómo verificar un AAB antes de mandarlo

```bash
# plugins nativos realmente registrados
unzip -p app-release.aab base/assets/capacitor.plugins.json

# config que quedó compilada
unzip -p app-release.aab base/assets/capacitor.config.json

# versionCode y que google-services.json se haya procesado
java -jar bundletool.jar dump manifest --bundle=app-release.aab
java -jar bundletool.jar dump resources --bundle=app-release.aab | grep default_web_client_id
```
