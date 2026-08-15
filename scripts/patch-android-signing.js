/* Prepara android/app/build.gradle para generar un .aab de RELEASE firmado,
   listo para subir a Google Play. Corre DESPUÉS de "npx cap add android" (o
   "npx cap sync android"), igual que patch-android.js.

   Dos cosas:
   1) versionCode/versionName: Capacitor los deja fijos en 1/"1.0" — Play Store
      exige que cada subida tenga un versionCode MAYOR al anterior. versionName
      sigue viniendo de version.txt (fuente de verdad legible, ej "8.63"), pero
      el versionCode YA NO se deriva de ahí (ver "2026-08-15" abajo).
   1-bis) 2026-08-15 — el esquema viejo (versionCode = major*1000+minor, ej
      "8.62"->8062) chocó DOS VECES con "ya se usó ese código" (v8.44 hace
      semanas, y hoy con 8043/8061/8062): Play Console recuerda TODO codigo
      subido alguna vez para esta app -- incluidos intentos de sesiones/repos
      viejos que ya no estan en este git -- y ese historial no es consultable
      desde aca. Un rango de solo miles (0-9999) choca facil con años de
      pruebas. Ahora el versionCode sale de MINUTOS DESDE EPOCH UNIX
      (Date.now()/60000): siempre crece con el reloj real, nunca se repite, y
      hoy da ~29 millones -- lejísimos de cualquier código viejo en el rango
      6000-9000, con margen para más de 3000 años antes de tocar el límite de
      Play (2.100.000.000). Sacrifica que el versionCode ya no sea "leible"
      (antes decía la version a simple vista) -- versionName sigue siendo la
      fuente humana real, se muestra en Play Console al lado del codigo.
   2) signingConfig: lee la ruta del keystore y las contraseñas de variables de
      ENTORNO (nunca de un archivo commiteado) — en CI (GitHub Actions) esas
      variables se exportan desde los secrets del repo justo antes de correr
      "./gradlew bundleRelease". Localmente, alguien podría exportarlas a mano
      para probar, pero el keystore real (MI-KEYSTORE-PLAYSTORE.txt) nunca se
      sube al repo (ver .gitignore). */
const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) {
  console.error('No se encontró android/app/build.gradle. ¿Corriste "npx cap add android" antes?');
  process.exit(1);
}
let gradle = fs.readFileSync(gradlePath, 'utf8');

// ===== 1) versionName desde version.txt (legible) + versionCode desde reloj (nunca choca) =====
const versionTxtPath = path.join(__dirname, '..', 'version.txt');
const version = fs.readFileSync(versionTxtPath, 'utf8').trim(); // ej "8.63" -- solo para versionName
const versionCode = Math.floor(Date.now() / 60000); // minutos desde epoch Unix -- ver nota 1-bis arriba

gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode ' + versionCode);
gradle = gradle.replace(/versionName\s+"[^"]*"/, 'versionName "' + version + '"');

// ===== 2) signingConfig, leyendo de variables de entorno =====
if (gradle.indexOf('signingConfigs {') === -1) {
  const signingBlock = `    signingConfigs {
        release {
            def ksPathEnv = System.getenv("ANDROID_KEYSTORE_PATH")
            if (ksPathEnv != null) {
                storeFile file(ksPathEnv)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
`;
  // Se inserta como primer hijo del bloque "android {" (antes de "namespace").
  gradle = gradle.replace(/(android\s*\{\s*\n)/, '$1' + signingBlock);

  // El buildType "release" ya existe (minifyEnabled/proguardFiles) — se le
  // agrega la firma sin tocar lo que ya tenía.
  gradle = gradle.replace(
    /(release\s*\{\s*\n\s*minifyEnabled[^\n]*\n)/,
    '$1            signingConfig signingConfigs.release\n'
  );
}

fs.writeFileSync(gradlePath, gradle);
console.log('android/app/build.gradle listo para release firmado: versionCode=' + versionCode + ' versionName="' + version + '"');
