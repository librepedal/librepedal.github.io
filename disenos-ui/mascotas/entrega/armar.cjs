// Arma las páginas de la pieza 3 (node armar.cjs, desde esta carpeta).
//   referencias.html <- cabecera.html (estilos del panel de la pieza 1) + cuerpo.html + ref/*.jpg
//   maqueta.html     <- maqueta-plantilla.html + el código real de Pistero en bici (copia de lp-audit, igual que el
//                       mockup de viaje) + img/*.png (crías de frente y sentadas, sin fondo, con herramientas/transparente.js)
const fs = require('fs');
const html = (fs.readFileSync(__dirname + '/cabecera.html', 'utf8') + fs.readFileSync(__dirname + '/cuerpo.html', 'utf8'))
  .replace(/\{\{img:([\w-]+)\}\}/g, (x, n) => 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/ref/' + n + '.jpg').toString('base64'));
fs.writeFileSync(__dirname + '/referencias.html', html);
console.log('listo: referencias.html (' + Math.round(html.length / 1024) + ' KB)');

const R = 'C:/Users/flgan/lp-audit/';
const app = ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js', 'pistero-bici.js']
  .map((f) => '<script>/* ' + f + ' (copia de la app) */\n' + fs.readFileSync(R + f, 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>').join('\n');
const img = {};
for (const f of fs.readdirSync(__dirname + '/img')) if (f.endsWith('.png')) img[f.slice(0, -4)] = 'data:image/png;base64,' + fs.readFileSync(__dirname + '/img/' + f).toString('base64');
const maq = fs.readFileSync(__dirname + '/maqueta-plantilla.html', 'utf8').replace('{{APP}}', () => app).replace('{{IMG}}', () => JSON.stringify(img));
fs.writeFileSync(__dirname + '/maqueta.html', maq);
console.log('listo: maqueta.html (' + Math.round(maq.length / 1024) + ' KB)');
