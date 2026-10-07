// Inty 2026-10-07: "habíamos quedado en que ya no iba en bicicleta Pistero" y "sin mascota en el sobrevuelo".
// El sobrevuelo de siempre (sobrevuelo-viaje.js, el respaldo cuando el 3D no abre) se reproduce con un mapa de mentira y
// se revisa lo que de verdad pone en el mapa: el ROSTRO del personaje, nunca la bici ni el cuerpo pedaleando, y sin
// sonido de mascota. Y en el 3D, la mascota apagada.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const marcadores = [], sonidos = [];
const el = { querySelector: () => null, classList: { add() {}, remove() {}, toggle() {} }, style: {} };
const ctx = { console, Math, JSON, Object, Array, String, Number, RegExp, isFinite, Date, cu: null, us: {},
  localStorage: { getItem: () => JSON.stringify({ mascota: 'quiltro' }), setItem: () => {} },
  document: { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, body: { classList: { contains: () => false } }, documentElement: {} },
  window: { addEventListener() {}, matchMedia: () => ({ matches: false }) }, setTimeout, clearTimeout,
  getComputedStyle: () => ({ getPropertyValue: () => '#fc4c02' }), requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 0 },
  pistSonar: (...a) => sonidos.push(a.join(':')), h() {}, actividadTipo: 'ciclismo' };
ctx.mp = { getContainer: () => ({ clientHeight: 700 }), fitBounds() {}, flyTo() {}, easeTo() {}, jumpTo() {}, getZoom: () => 15, getBearing: () => 0, getPitch: () => 0 };
ctx.mlPolyline = () => ({ addTo() { return this; }, getBounds: () => ({ pad() { return this; } }), remove() {} });
ctx.mlMarker = (ll, o) => { marcadores.push(o.icon.html); return { addTo() { return this; }, _ml: { getElement: () => el }, setLatLng() {}, remove() {} }; };
vm.createContext(ctx);
for (const f of ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js', 'pistero-bici.js', 'pistero-bici-atras.js', 'sobrevuelo-viaje.js']) {
  vm.runInContext(readFileSync(join(raiz, f), 'utf8'), ctx, { filename: f });
}
ctx._pistOpts = () => ({ mascota: 'quiltro', biciTipo: 'ruta' });
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// ruta de 60 puntos con subida y bajada
const pts = []; let lat = -39.81, lon = -73.24, t = 0, alt = 10;
for (let i = 0; i < 60; i++) { lat += 0.0004; lon += 0.0005 * (i < 30 ? 1 : -0.3); alt += i < 30 ? 4 : -4; t += 15000; pts.push([lat, lon, t, alt]); }
ctx.__pts = pts;
vm.runInContext("reproducirSobrevuelo(__pts,'ciclismo')", ctx);

const html = marcadores[0] || '';
ok(marcadores.length === 1, 'pone un marcador de Pistero en el mapa');
ok(html.includes('sbv-rostro'), 'Pistero va como ROSTRO (círculo con anillo, como en el 3D)');
ok(!html.includes('sbv-cuerpo') && !html.includes('sbv-cabeza'), 'sin cuerpo de espaldas pedaleando');
const bici = vm.runInContext("_pistBiciSVG(_pistOpts(),{expr:'feliz'})", ctx), firma = bici.slice(0, bici.indexOf('>') + 1);
if (process.env.VER) console.log('firma bici:', firma, '| marcador:', html.slice(0, 260));
ok(firma.length > 10 && !html.includes(firma), 'sin bici (el SVG de la bici no está en el marcador)');
ok(!sonidos.some((s) => /^mascota/.test(s)), 'sin sonido de mascota al partir: ' + sonidos.join(','));
vm.runInContext('detenerSobrevuelo()', ctx);

const s3 = readFileSync(join(raiz, 'sobrevuelo-3d.js'), 'utf8');
ok(/var SB3_MASCOTA=false;/.test(s3) && /var conM=SB3_MASCOTA&&/.test(s3), '3D: mascota apagada en el primer plano');
ok(/var MASC=\{on:false/.test(s3), '3D: pudú que corre al lado apagado');
ok(/window\.sb3CaraPersonaje=/.test(s3), '3D: entrega la cara del personaje elegido al sobrevuelo de siempre');

console.log(`${n - f} pasaron, ${f} fallaron`);
process.exit(f ? 1 : 0);
