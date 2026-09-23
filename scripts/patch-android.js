/* Inserta en el AndroidManifest los permisos nativos que necesita Libre Pedal
   para funcionar con la PANTALLA APAGADA en segundo plano:
   - Ubicación (fina, gruesa y en background)
   - Foreground Service (+ tipo location, Android 14+)
   - WakeLock (mantener el proceso vivo)
   - Ignorar optimización de batería (Xiaomi/Samsung/etc no maten la app)
   - Micrófono (el propio @capacitor-community/speech-recognition YA lo declara en
     su AndroidManifest.xml -- esta entrada es redundante pero inofensiva, Gradle
     la deduplica en el merge; se deja por si el merge de ese plugin cambiara)
   El Foreground Service en sí lo aporta el plugin background-geolocation. */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  console.error('No se encontró AndroidManifest.xml. ¿Corriste "npx cap add android" antes?');
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, 'utf8');

// ===== App Links (2026-08-15) =====
// Sin esto, cualquier link a librepedal.cl (el link mágico de login por correo,
// links compartidos, etc.) abre el navegador del teléfono en vez de la app
// instalada -- y como el navegador y la app instalada NO comparten sesión/storage
// (son contextos separados de Android), el login que se completa en el navegador
// nunca lo ve la app. Con este intent-filter + `.well-known/assetlinks.json`
// (verificación del lado del servidor, ver deploy-seguro.sh) Android verifica la
// asociación al instalar y desde ahí cualquier link a librepedal.cl abre DIRECTO
// en la app. `autoVerify="true"` es lo que dispara esa verificación automática.
const appLinksFilter = `        <intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="https" android:host="librepedal.cl" />
            <data android:scheme="https" android:host="www.librepedal.cl" />
        </intent-filter>
`;
if (xml.indexOf('android:host="librepedal.cl"') === -1) {
  const activityRe = /(<activity\b[^>]*android:name="\.MainActivity"[^>]*>)([\s\S]*?)(<\/activity>)/;
  if (activityRe.test(xml)) {
    xml = xml.replace(activityRe, function (_m, abre, adentro, cierra) {
      return abre + adentro + appLinksFilter + cierra;
    });
    console.log('App Links (intent-filter) agregado a MainActivity para librepedal.cl');
  } else {
    console.error('No se encontró la etiqueta <activity> de MainActivity — no se pudo agregar App Links.');
    process.exit(1);
  }
} else {
  console.log('App Links ya estaba presente.');
}

// Auditoría 2026-09-10 (misma ronda del fix de Prominent Disclosure): REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
// y RECEIVE_BOOT_COMPLETED estaban acá pero NUNCA se usan en ningún lado — ni en el código propio
// (`grep -rn` sin resultados) ni los necesita el plugin de background-geolocation (su propio
// AndroidManifest.xml en node_modules no los declara). Son permisos "muertos": riesgo real sin
// ningún beneficio (Google puede cuestionar cualquier permiso declarado sin uso real), sacados.
const permisos = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.WAKE_LOCK',
  'android.permission.RECORD_AUDIO'
];

let bloque = '';
permisos.forEach(function (p) {
  if (xml.indexOf(p) === -1) {
    bloque += '    <uses-permission android:name="' + p + '" />\n';
  }
});

if (bloque) {
  // Insertar los permisos justo después de la etiqueta <manifest ...>
  xml = xml.replace(/(<manifest[^>]*>\s*)/, '$1\n' + bloque);
  fs.writeFileSync(manifestPath, xml);
  console.log('Permisos nativos agregados al AndroidManifest:\n' + bloque);
} else {
  console.log('Los permisos ya estaban presentes.');
}

// Auditoría de cumplimiento Play Store 2026-09-23 (pedido de Inty: "mil por ciento de
// certeza de que estamos cumpliendo con todo" antes de cualquier envío): hasta acá este
// script parchaba MainActivity.onCreate() para pedir RECORD_AUDIO apenas arrancaba la
// app -- el MISMO patrón exacto ("permiso sin ningún aviso, antes de que cargue nada de
// JS") que causó el rechazo real "Missing Prominent Disclosure" del 10-sept-2026 para
// ubicación. Se rastreó la cadena completa antes de sacarlo, no se asumió:
//   1) Ningún código de la app llama getUserMedia() en ningún lado (grep sin resultados)
//      -- el comentario original que justificaba esto ("el WebView niega el micrófono en
//      silencio si no se pidió antes") describe un mecanismo que esta app ni siquiera usa.
//   2) Aunque lo usara: BridgeWebChromeClient.onPermissionRequest() (código fuente real
//      revisado en node_modules/@capacitor/android, confirmado igual en Capacitor 6.2.1
//      -actual en esta rama- y en 8.5.2 -la de la migración pendiente en PR #3-) YA
//      dispara el diálogo nativo de permiso on-demand cuando getUserMedia() lo pide.
//   3) El camino real de esta app (_micNativoEscuchar() en motor-navegacion.js) usa el
//      plugin nativo @capacitor-community/speech-recognition, que declara
//      @Permission(RECORD_AUDIO) -- Capacitor le da automáticamente su propio
//      requestPermissions() genérico, y el JS YA lo llama explícitamente
//      (SR.requestPermissions()) justo antes de SR.start(), en el momento real en que el
//      usuario toca el botón de micrófono. Verificado contra el código fuente real del
//      plugin instalado (v6.0.1 y v7.0.1), no supuesto.
//   4) Probado de punta a punta con `npx cap add android` + este script + inspección real
//      del AndroidManifest.xml/MainActivity.java resultantes, y con un build real de CI
//      (rama de prueba combinada con la migración Capacitor 8) -- el permiso sigue
//      declarado (vía el manifest del propio plugin) y MainActivity queda igual al
//      default que genera Capacitor.
// Con los 4 puntos confirmados: el pedido en MainActivity no protegía nada, solo agregaba
// el mismo riesgo de cumplimiento que ya costó un rechazo. MainActivity.java queda sin
// tocar (el que genera `cap add android` por defecto ya es correcto tal cual).
