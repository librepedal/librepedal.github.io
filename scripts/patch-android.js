/* Inserta en el AndroidManifest los permisos nativos que necesita Libre Pedal
   para funcionar con la PANTALLA APAGADA en segundo plano:
   - Ubicación (fina, gruesa y en background)
   - Foreground Service (+ tipo location, Android 14+)
   - WakeLock (mantener el proceso vivo)
   - Ignorar optimización de batería (Xiaomi/Samsung/etc no maten la app)
   - Micrófono (para el reconocimiento de voz: sin esto en el manifiesto, Android
     NUNCA deja pedir permiso de mic aunque la app lo solicite desde JS)
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

const permisos = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.WAKE_LOCK',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
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

/* Declarar el permiso en el manifest NO alcanza: en Android 6+ hay que pedirlo
   en tiempo de ejecución (el diálogo del sistema "Permitir que Libre Pedal
   acceda al micrófono/ubicación") o la app nunca lo muestra. El WebView de
   Capacitor solo AUTO-OTORGA el micrófono a getUserMedia() si el permiso
   nativo YA fue concedido antes — si nadie lo pidió nunca, getUserMedia()
   simplemente falla en silencio (sin diálogo visible). Por eso hay que
   pedirlo explícitamente apenas arranca la app, en MainActivity. */
function encontrarMainActivity(dir) {
  for (const nombre of fs.readdirSync(dir)) {
    const p = path.join(dir, nombre);
    if (fs.statSync(p).isDirectory()) {
      const enc = encontrarMainActivity(p);
      if (enc) return enc;
    } else if (nombre === 'MainActivity.java') {
      return p;
    }
  }
  return null;
}

const javaRoot = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java');
const mainActivityPath = fs.existsSync(javaRoot) ? encontrarMainActivity(javaRoot) : null;

// Nota Google Sign-In nativo (2026-08-16): el classpath de google-services y el
// "apply plugin" ya los inyecta solo @capacitor-firebase/authentication al hacer
// `cap add android` (verificado contra un build real) — solo falta que el
// workflow copie google-services.json a android/app/ antes de compilar.

if (mainActivityPath) {
  const original = fs.readFileSync(mainActivityPath, 'utf8');
  const paqueteMatch = original.match(/^package\s+([\w.]+);/m);
  const paquete = paqueteMatch ? paqueteMatch[1] : 'cl.librepedal.app';

  const nuevoContenido = `package ${paquete};

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Pide de una vez los permisos que Android exige mostrar con diálogo propio
    // (no basta con declararlos en el manifest). Sin esto, el WebView niega el
    // micrófono en silencio y el usuario nunca ve un cuadro para permitirlo.
    String[] permisos = {
      Manifest.permission.RECORD_AUDIO,
      Manifest.permission.ACCESS_FINE_LOCATION,
      Manifest.permission.ACCESS_COARSE_LOCATION
    };
    List<String> faltantes = new ArrayList<>();
    for (String p : permisos) {
      if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
        faltantes.add(p);
      }
    }
    if (!faltantes.isEmpty()) {
      ActivityCompat.requestPermissions(this, faltantes.toArray(new String[0]), 1001);
    }
  }
}
`;
  fs.writeFileSync(mainActivityPath, nuevoContenido);
  console.log('MainActivity parchada para pedir permisos de micrófono/ubicación al arrancar: ' + mainActivityPath);
} else {
  console.error('No se encontró MainActivity.java bajo android/app/src/main/java — no se pudo agregar el pedido de permisos.');
  process.exit(1);
}
