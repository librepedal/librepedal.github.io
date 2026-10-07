// Arma las dos páginas publicadas desde sus plantillas (node armar.cjs, desde esta carpeta).
//   maqueta.html     <- maqueta-plantilla.html + fuentes/ (modelos reales: libs y capas sacadas de las páginas
//                       *-capas-pub.html de feature/armario-piezas; caras del Clásico generadas con _pistoDe de la app)
//   referencias.html <- referencias-plantilla.html + referencias-img/
const fs = require('fs'), F = __dirname + '/fuentes/';
// cada animación se pausa mientras su modelo no está en pantalla (cada crearXCapas corre su requestAnimationFrame para siempre)
const pausa = "function __rafVisible(el,f){ if(el.isConnected && !document.hidden) requestAnimationFrame(f); else setTimeout(function(){ __rafVisible(el,function(){ requestAnimationFrame(f); }); },250); }\n";
const libs = pausa + ['ciber', 'orbe', 'slime', 'vinilo'].map((m) => fs.readFileSync(F + 'lib-' + m + '.js', 'utf8').replace(/requestAnimationFrame\(cuadro\)/g, '__rafVisible(el,cuadro)')).join('\n') + '\n' + fs.readFileSync(F + 'lib-frente.js', 'utf8');
const img = {}, th = {};
for (const m of ['ciber', 'orbe', 'slime', 'vinilo']) { img[m] = JSON.parse(fs.readFileSync(F + 'img-' + m + '.json', 'utf8')); th[m] = 'data:image/jpeg;base64,' + fs.readFileSync(F + 'th-' + m + '.jpg').toString('base64'); }
const maq = fs.readFileSync(__dirname + '/maqueta-plantilla.html', 'utf8').replace('{{LIBS}}', () => libs).replace('{{IMGS}}', () => JSON.stringify(img)).replace('{{THUMBS}}', () => JSON.stringify(th)).replace('{{CLASICO}}', () => fs.readFileSync(F + 'clasico.json', 'utf8'));
fs.writeFileSync(__dirname + '/maqueta.html', maq);
const ref = fs.readFileSync(__dirname + '/referencias-plantilla.html', 'utf8').replace(/\{\{img:([\w-]+)\}\}/g, (x, n) => 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/referencias-img/' + n + '.jpg').toString('base64'));
fs.writeFileSync(__dirname + '/referencias.html', ref);
console.log('listo: maqueta.html y referencias.html');
