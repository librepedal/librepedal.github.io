// Inty 2026-10-07: el anillo y el halo que late alrededor de la cara "eso nunca lo pedí" → fuera también del sobrevuelo 3D.
// Y el sobrevuelo de siempre (respaldo) ya no sigue el GPS crudo: va por la línea pegada al camino del 3D (guardada en
// el teléfono o pegada en el momento), conservando las horas y alturas del GPS. Si no hay línea, el GPS como antes.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// ---------- 1) 3D: la cara sin anillo ni halo ----------
const s3 = readFileSync(join(raiz, 'sobrevuelo-3d.js'), 'utf8');
const s3css = s3 + readFileSync(join(raiz, 'sobrevuelo-3d-vista.js'), 'utf8');   // los estilos viven en sobrevuelo-3d-vista.js desde 2026-10-08
const rostroHTML = (s3.match(/function crearRostro\(\)\{[\s\S]*?el\.innerHTML='([^']*)'/) || [])[1] || '';
ok(rostroHTML.includes('cm-caras'), '3D: el rostro sigue teniendo su cara');
ok(!/cm-anillo|cm-halo/.test(rostroHTML), '3D: el rostro no lleva anillo ni halo');
ok(!/\.cm-anillo\{|\.cm-halo\{|sb3Late/.test(s3css),'3D: sin estilos de anillo ni del halo que late');
const carasCSS = (s3css.match(/#sb3 \.cm-caras\{[^}]*\}/) || [''])[0];
ok(carasCSS && !/clip-path|border-radius/.test(carasCSS), '3D: la cara completa, sin recorte en círculo: ' + carasCSS);

// ---------- 2) línea pegada con las horas y alturas del GPS ----------
const guardado = {};
const ctx3 = { console, Math, JSON, Object, Array, String, Number, RegExp, isFinite, Date, Promise, setTimeout, clearTimeout,
  performance: { now: () => Date.now() }, location: { search: '' }, navigator: {},
  localStorage: { getItem: (k) => guardado[k] || null, setItem: (k, v) => { guardado[k] = v; } }, matchMedia: () => ({ matches: false }),
  document: { getElementById: () => null, createElement: () => ({ getContext: () => null }), addEventListener() {}, removeEventListener() {}, querySelector: () => null },
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} } };
vm.createContext(ctx3);
for (const m of ['sobrevuelo-3d-vista.js', 'sobrevuelo-3d-pegada.js', 'sobrevuelo-video.js']) vm.runInContext(readFileSync(join(raiz, m), 'utf8'), ctx3, { filename: m });
vm.runInContext(s3, ctx3, { filename: 'sobrevuelo-3d.js' });
const T = ctx3.window.__sb3test;

// calle recta este-oeste en lat -39.8; el GPS va zigzagueando ±15 m a su lado, con horas y subida
const LAT = -39.8, crudo = [];
for (let i = 0; i <= 40; i++) crudo.push([LAT + (i % 2 ? 1 : -1) * 0.000135, -73.25 + i * 0.0003, 1000 + i * 10000, 10 + i * 2]);
const calle = []; for (let i = 0; i <= 41; i++) calle.push([-73.25 + i * 0.0003 * 40 / 41, LAT]);   // [lon,lat]
const r = T.sobreLaPegada(crudo, calle);
ok(Array.isArray(r) && r.length === calle.length, 'devuelve un punto por cada punto de la línea pegada');
ok(r && r.every((p) => Math.abs(p[0] - LAT) < 1e-9), 'todos los puntos quedan en la calle (no en el zigzag del GPS)');
ok(r && r[0][2] === crudo[0][2] && Math.abs(r[r.length - 1][2] - crudo[40][2]) < 1, 'la hora de partida y de llegada son las del GPS');
ok(r && r.every((p, i) => i === 0 || p[2] >= r[i - 1][2]), 'las horas avanzan siempre (velocidad y pausas reales)');
ok(r && r[0][3] === 10 && Math.abs(r[r.length - 1][3] - 90) < 1, 'conserva la altura del GPS (pendientes y reacciones)');
ok(T.sobreLaPegada(crudo, calle.slice(0, 8)) === null, 'si el largo no cuadra (menos de la mitad), usa el GPS');
ok(T.sobreLaPegada(crudo.map((p) => [p[0], p[1]]), calle).every((p) => p[2] === undefined), 'sin horas en el GPS no inventa horas');

// guardada en el teléfono (lp_sbv3_pegadas) → se usa al tiro
guardado.lp_sbv3_pegadas = JSON.stringify({ r1: { c: calle, m: 'valhalla', f: 1 } });
const conGuardada = await ctx3.window.sb3PegadaPara('r1', crudo, 3000);
ok(conGuardada && conGuardada.length === calle.length && conGuardada.every((p) => Math.abs(p[0] - LAT) < 1e-9), 'usa la línea pegada guardada del 3D');
// sin guardada y sin red → null a tiempo (el respaldo arranca con el GPS)
const t0 = Date.now(); const sinRed = await ctx3.window.sb3PegadaPara('otra', crudo, 1500);
ok(sinRed === null && Date.now() - t0 < 2500, 'sin línea guardada y sin red: vuelve sin línea y a tiempo (' + (Date.now() - t0) + ' ms)');

// ---------- 3) el respaldo la usa, y nunca deja de arrancar ----------
const usado = [];
const ctxV = { console, Math, JSON, Object, Array, String, Number, RegExp, isFinite, Date, Promise, setTimeout, clearTimeout,
  localStorage: { getItem: () => null, setItem() {} },
  document: { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, body: { classList: { contains: () => false } }, documentElement: {} },
  window: { addEventListener() {}, matchMedia: () => ({ matches: false }) }, h() {} };
vm.createContext(ctxV);
vm.runInContext(readFileSync(join(raiz, 'sobrevuelo-viaje.js'), 'utf8'), ctxV, { filename: 'sobrevuelo-viaje.js' });
const llamar = (pegada) => new Promise((res) => { ctxV.window.sb3PegadaPara = pegada; ctxV.__fin = res; vm.runInContext("_sbvConPegada('r1',__crudo,__fin)", Object.assign(ctxV, { __crudo: crudo })); });
ok((await llamar(() => Promise.resolve(r))) === r, 'respaldo: va por la línea pegada cuando la hay');
ok((await llamar(() => Promise.resolve(null))) === crudo, 'respaldo: sin línea, el GPS como antes');
ok((await llamar(() => Promise.reject(new Error('x')))) === crudo, 'respaldo: si falla, arranca igual con el GPS');
ok((await llamar(() => { throw new Error('x'); })) === crudo, 'respaldo: si revienta, arranca igual con el GPS');
ok((await llamar(undefined)) === crudo, 'respaldo: sin el 3D cargado, el GPS como antes');
const src = readFileSync(join(raiz, 'sobrevuelo-viaje.js'), 'utf8');
ok((src.match(/var deSiempre=function\(\)\{[^\n]*_sbvConPegada\(/g) || []).length === 2, 'respaldo: al terminar el viaje y desde el historial');

console.log(`${n - f} pasaron, ${f} fallaron`);
process.exit(f ? 1 : 0);
