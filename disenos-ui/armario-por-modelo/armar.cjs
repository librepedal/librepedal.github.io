// Arma maqueta.html desde maqueta-plantilla.html (node armar.cjs, desde esta carpeta).
//   Modelos por capas y Casco vivo: los mismos de la pieza 1 (../elige-tu-pistero/fuentes).
//   Clásico: el código real de la app (pistero-personalizacion-datos.js, pistero-armario.js, pistero-apariencia.js),
//   así sus colores y piezas salen idénticos a los de la app.
const fs = require('fs'), F = __dirname + '/../elige-tu-pistero/fuentes/', R = __dirname + '/../../';
const pausa = "function __rafVisible(el,f){ if(el.isConnected && !document.hidden) requestAnimationFrame(f); else setTimeout(function(){ __rafVisible(el,function(){ requestAnimationFrame(f); }); },250); }\n";
const libs = pausa + ['ciber', 'orbe', 'slime', 'vinilo'].map((m) => fs.readFileSync(F + 'lib-' + m + '.js', 'utf8').replace(/requestAnimationFrame\(cuadro\)/g, '__rafVisible(el,cuadro)')).join('\n') + '\n' + fs.readFileSync(F + 'lib-frente.js', 'utf8') + '\n' + 'var PIEZAS_IMG = ' + JSON.stringify({ orbeVisera: 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/gemini/orbe-visera-v1.jpg').toString('base64'), slimeFruta: 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/gemini/slime-fruta-v2.jpg').toString('base64'), viniloAntena: 'data:image/png;base64,' + fs.readFileSync(__dirname + '/gemini/vinilo-antena.png').toString('base64') }) + ';\n' + fs.readFileSync(__dirname + '/piezas-vector.js', 'utf8');
const app = ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js'].map((f) => fs.readFileSync(R + f, 'utf8')).join('\n;\n').replace(/<\/script/gi, '<\\/script');
const img = {}, th = {};
for (const m of ['ciber', 'orbe', 'slime', 'vinilo']) { img[m] = JSON.parse(fs.readFileSync(F + 'img-' + m + '.json', 'utf8')); th[m] = 'data:image/jpeg;base64,' + fs.readFileSync(F + 'th-' + m + '.jpg').toString('base64'); }
const maq = fs.readFileSync(__dirname + '/maqueta-plantilla.html', 'utf8').replace('{{LIBS}}', () => libs).replace('{{APP}}', () => app).replace('{{IMGS}}', () => JSON.stringify(img)).replace('{{THUMBS}}', () => JSON.stringify(th));
fs.writeFileSync(__dirname + '/maqueta.html', maq);
console.log('listo: maqueta.html (' + Math.round(maq.length / 1024) + ' KB)');
