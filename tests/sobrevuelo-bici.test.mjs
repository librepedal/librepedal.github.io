// Bici de Pistero (pistero-bici.js) + momentos del sobrevuelo (sobrevuelo-viaje.js):
// cada bici dibuja SVG válido y pedalea (animado), y el análisis del viaje encuentra
// subidas, cima, bajadas, pausas y velocidad con datos reales, sin amontonar globos.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, JSON, Object, Array, String, Number, RegExp, isFinite, Date, cu: null, us: {},
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, body: { classList: { contains: () => false } } },
  window: { addEventListener() {} }, setTimeout, clearTimeout };
vm.createContext(ctx);
for (const f of ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js', 'pistero-bici.js', 'sobrevuelo-viaje.js']) {
  vm.runInContext(readFileSync(join(raiz, f), 'utf8'), ctx, { filename: f });
}
const J = (s) => vm.runInContext(s, ctx);
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// 1) bicis
for (const t of J('PIST_BICI').map((b) => b.id)) {
  const s = J(`_pistBiciSVG({biciTipo:'${t}',casco:'rojo',pelo:'largo'},{expr:'contento'})`);
  ok(s.startsWith('<svg') && s.endsWith('</svg>') && !/undefined|NaN/.test(s), t + ': SVG válido');
  ok((s.match(/<animate/g) || []).length >= 6, t + ': pedalea (piernas, bielas y ruedas animadas)');
  ok(s.includes('viewBox="0 0 100 84"'), t + ': lleva la cabeza del Pistero del usuario');
}
ok(!J(`_pistBiciSVG({},{pedal:false})`).includes('<animate'), 'en la tienda (pedal:false) la bici queda quieta');
ok(J(`_pistBiciSVG({biciCol:'#123456'})`).includes('#123456'), 'color de bici elegido se usa');
ok(J(`_pistNormal({biciTipo:'<x>'}).biciTipo`) === 'ruta' && J(`_pistNormal({biciCol:'red'}).biciCol`) === '', 'bici fuera de catálogo vuelve al default');

// 2) momentos del viaje (ruta inventada: plano, subida, bajada rápida, pausa, plano)
const pts = []; let lat = -39.81, lon = -73.24, t = 0, alt = 10;
const add = (k, dlat, dlon, dalt, dt) => { for (let i = 0; i < k; i++) { lat += dlat; lon += dlon; alt += dalt; t += dt; pts.push([lat, lon, t, alt]); } };
add(15, 0.0004, 0.0006, 0, 15000); add(30, 0.0005, 0.0002, 5, 25000); add(25, -0.0002, 0.0009, -6, 5000); t += 240000; add(1, 1e-5, 1e-5, 0, 1000); add(20, -0.0006, -0.0003, 0, 14000);
ctx.__pts = pts;
const A = J('_sbvAnalizar(__pts)'), txt = A.eventos.map((e) => e.txt).join(' | ');
ok(/^¡Partimos!/.test(A.eventos[0].txt) && /^¡Llegamos!/.test(A.eventos[A.eventos.length - 1].txt), 'empieza con ¡Partimos! y termina con ¡Llegamos!: ' + txt);
ok(/subida! \+1\d\d m/.test(txt), 'detecta la subida con su desnivel real');
ok(/Cima! 1\d\d m/.test(txt), 'detecta la cima');
ok(/Bajadaaa! −1\d\d m/.test(txt), 'detecta la bajada');
ok(/Pausa para respirar \(4 min\)/.test(txt), 'detecta la pausa de 4 minutos');
ok(A.eventos.length <= 7, 'máximo 7 globos');
for (let i = 1; i < A.eventos.length; i++) ok(A.eventos[i].d >= A.eventos[i - 1].d, 'globos en orden de recorrido');
const caras = J('Object.keys({feliz:1,contento:1,guino:1,sorprendido:1,pensando:1,cansado:1,emocionado:1})');
ok(A.eventos.every((e) => caras.includes(e.expr)), 'cada globo usa un gesto que Pistero tiene');
// sin hora ni altura (rutas viejas): igual hay globos de inicio, mitad y fin
ctx.__pts2 = pts.map((p) => [p[0], p[1]]);
const B = J('_sbvAnalizar(__pts2)');
ok(B.eventos.length >= 2 && B.eventos.every((e) => !/subida|Cima|Pausa|Volando/.test(e.txt)), 'sin datos de hora/altura no inventa momentos');

console.log(f ? `  ${f}/${n} FALLARON` : `  ✓ bici y sobrevuelo: ${n} chequeos OK`);
process.exit(f ? 1 : 0);
