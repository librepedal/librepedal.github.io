/* Inserta en el AndroidManifest los permisos nativos que necesita Libre Pedal
   para funcionar con la PANTALLA APAGADA en segundo plano:
   - Ubicación (fina, gruesa y en background)
   - Foreground Service (+ tipo location, Android 14+)
   - WakeLock (mantener el proceso vivo)
   - Ignorar optimización de batería (Xiaomi/Samsung/etc no maten la app)
   El Foreground Service en sí lo aporta el plugin background-geolocation. */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  console.error('No se encontró AndroidManifest.xml. ¿Corriste "npx cap add android" antes?');
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, 'utf8');

const permisos = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.WAKE_LOCK',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED'
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
