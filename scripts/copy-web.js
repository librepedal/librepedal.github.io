/* Copia los archivos web al directorio www/ que Capacitor empaqueta en el APK.
   El service worker (sw.js) NO se copia: en una app nativa no hace falta y puede
   interferir con la caché del WebView. La web (GitHub Pages) lo sigue usando. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

fs.mkdirSync(www, { recursive: true });

const files = ['index.html', 'como-funciona.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'version.txt'];
files.forEach(function (f) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(www, f));
    console.log('copiado:', f);
  } else {
    console.log('(no existe, omitido):', f);
  }
});
console.log('www/ listo para Capacitor.');
