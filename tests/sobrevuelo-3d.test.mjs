// Sobrevuelo 3D (sobrevuelo-3d.js): la lógica que decide qué se ve, sin navegador ni mapa.
// Limpieza del GPS, sol, caras según la ruta, pausas y velocidad reales, plan de tomas y momentos.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const nada = () => null;
const ctx = { console, Math, JSON, Object, Array, String, Number, RegExp, isFinite, Date, Promise, setTimeout, clearTimeout,
  performance: { now: () => Date.now() }, location: { search: '' }, navigator: {},
  localStorage: { getItem: nada, setItem() {} }, matchMedia: () => ({ matches: false }),
  document: { getElementById: nada, createElement: () => ({ getContext: nada }), addEventListener() {}, removeEventListener() {}, querySelector: nada },
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} } };
vm.createContext(ctx);
for (const m of ['sobrevuelo-3d-vista.js', 'sobrevuelo-3d-pegada.js', 'sobrevuelo-video.js']) vm.runInContext(readFileSync(join(raiz, m), 'utf8'), ctx, { filename: m });
vm.runInContext(readFileSync(join(raiz, 'sobrevuelo-3d.js'), 'utf8'), ctx, { filename: 'sobrevuelo-3d.js' });
const T = ctx.window.__sb3test;
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

ok(T && typeof ctx.window.abrirSobrevuelo3D === 'function', 'carga sin navegador y expone abrirSobrevuelo3D');

// 1) puntos corruptos fuera (un punto sin lat/lon ya rompió el Video 3D en producción)
const P = T.sb3Puntos([{ lat: -40, lon: -72, t: 1 }, { lat: NaN, lon: -72 }, { lat: 0, lon: 0 }, { lat: 120, lon: 1 }, null, [-40.1, -72.1, 5]]);
ok(P.length === 2 && P[1].lat === -40.1 && P[1].t === 5, 'sb3Puntos filtra NaN, 0,0, fuera de rango y null; acepta objetos y arreglos');

// 2) pinchazos del GPS: un punto que se sale 40 m de la línea entre sus vecinos se va; los demás quedan
const linea = []; for (let i = 0; i < 20; i++) linea.push({ lat: -40, lon: -72 + i * 0.0002, t: 0 });
linea[10] = { lat: -40 + 40 / 110540, lon: linea[10].lon, t: 0 };
const L2 = T.sinPinchazos(linea);
ok(L2.length === 19 && !L2.some(p => p.lat !== -40), 'sinPinchazos saca el salto de 40 m y conserva el resto');

// 3) sol: ocaso en Valdivia el 5-oct-2026 cerca de las 20:03 (hora de Chile, UTC-3)
let t = Date.parse('2026-10-05T21:00:00Z'); while (T.solPos(t, -39.84, -73.32).alt > -0.833) t += 60000;
const hora = new Date(t - 3 * 3600000).toISOString().slice(11, 16);
ok(hora >= '19:58' && hora <= '20:08', 'ocaso calculado ' + hora + ' (esperado ~20:03)');
ok(T.luzDe(-10).n === 'noche' && T.luzDe(40).n === 'día' && T.luzDe(3).n === 'hora dorada', 'luz según la altura del sol');

// 4) caras según lo que pasa en la ruta
const C = T.caraSegun;
ok(C(0.1, 30, 0, 'feliz', {}) === 'agotado', 'cuesta dura con +25 m subidos → agotado');
ok(C(0.1, 5, 0, 'feliz', {}) === 'enojado', 'cuesta dura recién empezando → aprieta');
ok(C(0.05, 0, 0, 'feliz', {}) === 'cansado', '5 % → cansado');
ok(C(-0.09, 0, 0, 'feliz', {}) === 'adrenalina', 'bajada fuerte → adrenalina');
ok(C(0, 0, 0, 'feliz', { pausa: true }) === 'pensando', 'pausa real → pensando');
ok(C(0.06, 40, 0, 'feliz', { faltan: 80 }) === 'contento', 'llegando, aunque suba → contento');
ok(C(0, 0, 0, 'feliz', { vel: 42 }) === 'adrenalina', 'velocidad real alta en plano → adrenalina');
ok(C(0, 0, 0.08, 'feliz', {}) === 'preocupado', 've venir una cuesta → preocupado');
ok(C(0.03, 0, 0, 'cansado', {}) === 'cansado' && C(0.03, 0, 0, 'feliz', {}) === 'feliz', 'histéresis: 3 % mantiene cansado pero no lo activa');

// 5) ruta sintética de 8 km: plano · subida de 60 m · bajada · plano, con una pausa de 2 min
const coords = []; for (let i = 0; i <= 800; i++) coords.push([-72 + i * 0.000128, -40]);
const N = T.linea(T.densificar(coords, 12));
N.alt = N.cum.map(d => d < 2500 ? 100 : d < 4000 ? 100 + (d - 2500) * 0.04 : d < 5500 ? 160 - (d - 4000) * 0.04 : 100);
N.pend = N.cum.map(d => d < 2500 ? 0 : d < 4000 ? 0.04 : d < 5500 ? -0.04 : 0);
let sub = 0; N.sub = N.alt.map((h, i) => (sub += Math.max(0, h - (i ? N.alt[i - 1] : h))));
N.min = Math.min(...N.alt); N.max = Math.max(...N.alt); N.imax = N.alt.indexOf(N.max); N.hayCima = true; N.bajo = N.c.map(() => 1);
const crudo = []; let tt = Date.parse('2026-10-05T15:00:00Z');
N.c.forEach((c, i) => { if (i === 300) for (let k = 0; k < 8; k++) { tt += 15000; crudo.push({ lat: c[1], lon: c[0], t: tt }); } tt += 3000; crudo.push({ lat: c[1], lon: c[0], t: tt }); });
T.setD({ nuevo: N, dur: tt - crudo[0].t });
T.tiemposReales(N, crudo);
ok(N.pausas.length === 1 && Math.abs(N.pausas[0].dur - 120000) <= 6000, 'detecta la pausa de 2 min (dur ' + Math.round(N.pausas[0] && N.pausas[0].dur / 1000) + ' s)');
ok(N.vel && N.vel[600] > 10 && N.vel[600] < 20, 'velocidad real en marcha ~14 km/h (' + Math.round(N.vel[600]) + ')');
ok(T.durVuelo() === 45000, 'una ruta de 8 km dura el mínimo (45 s)');
const t0 = Date.now(); T.planear(N); const ms = Date.now() - t0;
ok(ms < 1000, 'el plan se arma rápido y sin colgarse (' + ms + ' ms)');
const M = N.momentos;
ok(M[0].txt === '¡Partimos!' && M[M.length - 1].txt === '¡Llegamos!', 'parte con ¡Partimos! y termina con ¡Llegamos!');
ok(M.some(m => m.pausa) && M.some(m => m.cima), 'incluye la pausa real y la cima');
ok(M.every(m => isFinite(m.d)), 'todos los momentos tienen un lugar válido');
ok(M.length <= 9, 'pocos momentos, sin saturar (' + M.length + ')');
const seq = N.seq, mps = N.total / T.durVuelo() * 1000;
ok(seq[0].d0 === 0 && Math.abs(seq[seq.length - 1].d1 - N.total) < mps * 0.2, 'las tomas cubren todo el viaje');
ok(seq.every(q => q.d1 - q.d0 >= Math.max(550, 3.5 * mps) - 1 - mps * 0.1), 'ninguna toma dura menos de ~3,5 s de vuelo');

// 6) ruta larga: 100 km dura el máximo (80 s) y el plan no se cuelga (antes: bucle infinito por decimales)
const largo = []; for (let i = 0; i <= 2000; i++) largo.push([-72 + i * 0.000587, -40 + Math.sin(i / 90) * 0.01]);
const NL = T.linea(T.densificar(largo, 12));
NL.alt = NL.cum.map(d => 100 + 60 * Math.sin(d / 7000)); NL.pend = NL.cum.map(d => 60 / 7000 * Math.cos(d / 7000));
let sl = 0; NL.sub = NL.alt.map((h, i) => (sl += Math.max(0, h - (i ? NL.alt[i - 1] : h))));
NL.min = 40; NL.max = 160; NL.imax = NL.alt.indexOf(Math.max(...NL.alt)); NL.hayCima = true; NL.bajo = NL.c.map(() => 1);
T.setD({ nuevo: NL, dur: 0 });
ok(Math.abs(T.durVuelo() - 80000) < 1, '100 km duran 80 s (' + (NL.total / 1000).toFixed(0) + ' km)');
const t1 = Date.now(); T.planear(NL); const ms2 = Date.now() - t1;
ok(ms2 < 2000 && NL.seq.length >= 8 && NL.seq.length <= 30, 'plan de ruta larga en ' + ms2 + ' ms con ' + NL.seq.length + ' tomas');

console.log(`sobrevuelo-3d.test.mjs: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
