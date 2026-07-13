/* Prepara android/app/build.gradle para generar un .aab de RELEASE firmado,
   listo para subir a Google Play. Corre DESPUÉS de "npx cap add android" (o
   "npx cap sync android"), igual que patch-android.js.

   Dos cosas:
   1) versionCode/versionName: Capacitor los deja fijos en 1/"1.0" — Play Store
      exige que cada subida tenga un versionCode MAYOR al anterior, así que se
      derivan de version.txt (fuente de verdad de todo el proyecto) de forma
      determinística: "6.52" -> versionCode 652, versionName "6.52". Mientras
      la versión del proyecto siga subiendo, el versionCode también sube solo.
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

// ===== 1) versionCode/versionName desde version.txt =====
const versionTxtPath = path.join(__dirname, '..', 'version.txt');
const version = fs.readFileSync(versionTxtPath, 'utf8').trim(); // ej "6.52"
const partes = version.split('.').map(function (n) { return parseInt(n, 10) || 0; });
// "6.52" -> 6*1000 + 52 = 6052. Dos dígitos de "hueco" para el minor: alcanza
// hasta 6.999 antes de necesitar más dígitos, de sobra para este proyecto.
const versionCode = partes[0] * 1000 + (partes[1] || 0);

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
