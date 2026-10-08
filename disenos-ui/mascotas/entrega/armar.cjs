// Arma referencias.html (panel de referencias de la pieza 3) desde cabecera.html (estilos de la pieza 1) + cuerpo.html + ref/*.jpg.
//   node armar.cjs, desde esta carpeta.
const fs = require('fs');
const html = (fs.readFileSync(__dirname + '/cabecera.html', 'utf8') + fs.readFileSync(__dirname + '/cuerpo.html', 'utf8'))
  .replace(/\{\{img:([\w-]+)\}\}/g, (x, n) => 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/ref/' + n + '.jpg').toString('base64'));
fs.writeFileSync(__dirname + '/referencias.html', html);
console.log('listo: referencias.html (' + Math.round(html.length / 1024) + ' KB)');
