// Arma maqueta.html desde plantilla.html (node armar.cjs, desde esta carpeta).
//   {{img:nombre}} -> img/nombre.(jpg|png) como data URI · {{CARAS}} -> fuentes/caras.json (caras generadas con _pistoDe de la app)
const fs = require('fs'), D = __dirname;
const img = (n) => { for (const [ext, tipo] of [['jpg', 'jpeg'], ['png', 'png']]) { const f = D + '/img/' + n + '.' + ext; if (fs.existsSync(f)) return 'data:image/' + tipo + ';base64,' + fs.readFileSync(f).toString('base64'); } throw new Error('falta img ' + n); };
const html = fs.readFileSync(D + '/plantilla.html', 'utf8').replace(/\{\{img:([\w-]+)\}\}/g, (x, n) => img(n)).replace('{{CARAS}}', () => fs.readFileSync(D + '/fuentes/caras.json', 'utf8'));
fs.writeFileSync(D + '/maqueta.html', html);
console.log('listo: maqueta.html', Math.round(html.length / 1024) + ' KB');
