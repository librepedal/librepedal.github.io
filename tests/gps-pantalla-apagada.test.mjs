// Pantalla apagada grabando (2026-10-08). Inty: "cuando vuelve el mapa genera una línea recta desde el punto donde se
// apaga la pantalla" y "el sobrevuelo llega hasta donde uno apaga el teléfono y no sigue registrando la ruta".
// En la app instalada el GPS nativo deja de llegar a la página con la pantalla apagada (puente nuevo de Capacitor; el
// arreglo de raíz es android.useLegacyBridge en capacitor.config.json, que va en una versión nueva de la app). Al volver:
//   1. el cierre por inactividad (12 min sin moverte) cerraba la ruta JUSTO donde se apagó la pantalla → no debe;
//   2. el primer punto quedaba unido con una RECTA y esos km no se sumaban → se rellena por el camino y se suman;
//   3. si de verdad estabas parado (vuelves en el mismo lugar), la ruta SÍ se cierra como siempre.
// Corre el ug() REAL de motor-gps.js y finalizarRutaPorInactividad() REAL de rutas.js con un reloj simulado.
// LP_SRC=<carpeta> corre la misma prueba contra otro código (para comprobar que detecta el error original).
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = process.env.LP_SRC || join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => { try { return readFileSync(join(raiz, f), 'utf8'); } catch (e) { return ''; } };
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// recorta un bloque balanceando llaves (ignora strings y comentarios de línea), como mantencion-vehiculo.test.mjs
function bloque(src, desde) {
  const i = src.indexOf(desde); if (i < 0) return '';
  let prof = 0, q = null;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k); continue; }
    if (c === '{') prof++; else if (c === '}' && --prof === 0) return src.slice(i, k + 1);
  }
  return '';
}
const gps = leer('motor-gps.js'), rutas = leer('rutas.js'), vel = leer('motor-gps-velocidad.js');
const linea = (src, re) => (src.match(re) || [''])[0];
const SRC = [
  leer('gps-hueco.js'),
  vel, bloque(leer('motor-navegacion.js'), 'function calculateDistance('),
  bloque(gps, 'function _saltoEsPlausible('), bloque(gps, 'function _velocidadHardware('), bloque(gps, 'function _velMaxPlausibleKmh('),
  bloque(gps, 'function _filtrarSaltoVentana('), bloque(gps, 'function _sumarKmViaje('), bloque(gps, 'function _frasesTrasHueco('), bloque(gps, 'function _rellenarHueco('),
  bloque(gps, 'function ug('),
  'var UMBRAL_INACTIVIDAD_RUTA=12*60*1000; var ultimoMovimientoTime=0, rutaSegCerrada=true, rutaSegDistIni=0;',
  bloque(rutas, 'function finalizarRutaPorInactividad('),
  linea(rutas, /var _rutaEsperaGPSTrasFondo=false;/), linea(rutas, /if\(typeof document!=='undefined' && document\.addEventListener\) document\.addEventListener\('visibilitychange'[^\n]*/),
].join('\n');

function simular() {
  let ahora = 1_760_000_000_000;
  const oyentes = {};
  const FakeDate = class extends Date { constructor(...a) { super(...(a.length ? a : [ahora])); } static now() { return ahora; } };
  const llamadas = { osrm: 0, setLatLngs: 0, hablo: [] };
  const ctx = {
    console, Math, JSON, Number, Promise, Array, Object, String, isFinite, Date: FakeDate, setTimeout, clearTimeout,
    document: { hidden: false, getElementById: () => ({ innerText: '', style: {} }), addEventListener: (t, fn) => { (oyentes[t] = oyentes[t] || []).push(fn); } },
    fetch: (url) => { llamadas.osrm++; return Promise.resolve({ ok: true, json: () => Promise.resolve(ctx.__osrm(url)) }); },
    ig: true, us: { di: 0, c: 0, la: null, lo: null }, currentRoute: [], posHistory: [], pendienteHistory: [], lastFixTime: 0, spAnterior: 0,
    maxSpeed: 0, speedReadings: [], puntosGuardados: 0, segmentosCargados: true, _kmEsteViaje: 0, ghostMode: true, cu: null, lastPos: null, mp: { removeLayer() {} }, mlPolyline: () => ({ addTo() { return this; }, addLatLng() {}, setLatLngs() {} }),
    actividadTipo: 'ciclismo', kmUltimaFrase: 0, _ultimoHitoKm: 0,
    crl: { pts: [], addLatLng(ll) { this.pts.push(ll); }, setLatLngs(l) { llamadas.setLatLngs++; this.pts = l.slice(); } },
    h: (t) => llamadas.hablo.push(t), _osrmPerfil: () => 'cycling',
  };
  ctx.window = ctx;
  // todo lo demás que ug() llama (voz, segmentos, clima, marcador…) no es parte de esta prueba: se deja mudo
  const mudo = new Proxy({}, { has: () => true, get: (t, k) => (k in ctx ? ctx[k] : (k === Symbol.unscopables ? undefined : (() => {}))), set: (t, k, v) => { ctx[k] = v; return true; } });
  vm.createContext(ctx);
  ctx.__mudo = mudo;
  vm.runInContext('with(__mudo){\n' + SRC + '\n__api={ug:ug,fin:finalizarRutaPorInactividad};}', ctx);
  const api = ctx.__api;
  const fix = (lat, lon) => api.ug({ coords: { latitude: lat, longitude: lon, accuracy: 8, speed: 5, altitude: 100 } });
  const ocultar = (h) => { ctx.document.hidden = h; (oyentes.visibilitychange || []).forEach((fn) => fn()); };
  const avanzar = (ms) => { ahora += ms; };
  return { ctx, api, fix, ocultar, avanzar, llamadas, get ahora() { return ahora; } };
}
const espera = () => new Promise((r) => setTimeout(r, 30));

// ---------- 1) sigues pedaleando con la pantalla apagada ----------
{
  const S = simular();
  // 5 min pedaleando hacia el norte a ~27 km/h (un punto cada 2 s, 15 m cada uno: el filtro de ruido descarta menos de 12 m)
  let lat = -40.15, lon = -72.40;
  for (let i = 0; i < 150; i++) { lat += 0.000135; S.fix(lat, lon); S.avanzar(2000); }
  const antes = S.ctx.currentRoute.length, kmAntes = S.ctx.us.di;
  ok(antes > 100 && kmAntes > 1.2, `antes de apagar se graba normal (${antes} puntos, ${kmAntes.toFixed(2)} km)`);
  S.ocultar(true);
  // 15 min con la pantalla apagada: no llega nada; el revisor de inactividad corre cada minuto
  for (let m = 0; m < 15; m++) { S.avanzar(60000); S.api.fin(); }
  S.ocultar(false); S.avanzar(20000); S.api.fin();
  ok(S.ctx.currentRoute.length === antes, 'al volver, la ruta NO se cierra donde se apagó la pantalla (antes se cerraba)');
  // el camino real entre el último punto y el nuevo (3 km al norte) tiene una curva: OSRM la devuelve
  const a = S.ctx.currentRoute[S.ctx.currentRoute.length - 1], bLat = a.lat + 0.027, bLon = a.lon;
  S.ctx.__osrm = () => ({ routes: [{ distance: 3400, geometry: { coordinates: [[a.lon, a.lat], [a.lon + 0.004, a.lat + 0.009], [a.lon + 0.005, a.lat + 0.018], [bLon, bLat]] } }] });
  S.fix(bLat, bLon);
  const recta = 3.0; // ~0.027° de latitud
  ok(S.ctx.us.di - kmAntes > recta * 0.95, `el tramo con la pantalla apagada suma km (sumó ${(S.ctx.us.di - kmAntes).toFixed(2)} km; antes 0)`);
  await espera();
  const r = S.ctx.currentRoute, i = r.indexOf(a);
  ok(S.llamadas.osrm === 1, 'pide el camino una sola vez');
  ok(Math.abs(S.ctx.kmUltimaFrase - S.ctx.us.di) < 1e-9 && S.ctx._ultimoHitoKm === Math.floor(S.ctx.us.di / 10), 'los km del hueco no disparan una ráfaga de frases (el contador parte desde aquí)');
  ok(r.length === antes + 3 && r[i + 1].est && r[i + 2].est && !r[i + 3].est, 'el hueco se rellena con los puntos del camino (marcados como estimados), no con una recta');
  ok(r[i + 1].t > a.t && r[i + 2].t > r[i + 1].t && r[i + 3].t > r[i + 2].t, 'los puntos del camino llevan tiempos en orden (el sobrevuelo los recorre bien)');
  ok(S.llamadas.setLatLngs === 1 && S.ctx.crl.pts.length === r.length, 'la línea del mapa se redibuja con el camino');
  ok(Math.abs((S.ctx.us.di - kmAntes) - 3.4) < 0.05, `los km del hueco son los del camino (${(S.ctx.us.di - kmAntes).toFixed(2)} de 3,40)`);
  // y sigue grabando normal después
  for (let k = 0; k < 10; k++) { S.avanzar(2000); S.fix(bLat + 0.000135 * (k + 1), bLon); }
  ok(S.ctx.currentRoute.length === antes + 3 + 10, 'después del hueco sigue grabando en la misma ruta');
}

// ---------- 2) sin red al volver: queda la recta, pero los km se suman igual ----------
{
  const S = simular();
  let lat = -40.15, lon = -72.40;
  for (let i = 0; i < 60; i++) { lat += 0.000135; S.fix(lat, lon); S.avanzar(2000); }
  const kmAntes = S.ctx.us.di, antes = S.ctx.currentRoute.length;
  S.ocultar(true); S.avanzar(10 * 60000); S.ocultar(false);
  S.ctx.fetch = () => Promise.reject(new Error('sin red'));
  S.fix(lat + 0.018, lon);
  await espera();
  ok(S.ctx.currentRoute.length === antes + 1, 'sin red: no inventa puntos (queda la recta, como antes)');
  ok(S.ctx.us.di - kmAntes > 1.9, `sin red: los km en línea recta sí se suman (${(S.ctx.us.di - kmAntes).toFixed(2)} km)`);
}

// ---------- 3) estabas parado de verdad: la ruta se cierra como siempre ----------
{
  const S = simular();
  let lat = -40.15, lon = -72.40;
  for (let i = 0; i < 60; i++) { lat += 0.000135; S.fix(lat, lon); S.avanzar(2000); }
  S.ocultar(true); S.avanzar(20 * 60000); S.api.fin(); S.ocultar(false);
  const antes = S.ctx.currentRoute.length;
  S.fix(lat + 0.00002, lon); // mismo lugar
  S.avanzar(60000); S.api.fin();
  ok(antes > 50 && S.ctx.currentRoute.length === 0, 'parado de verdad: al llegar la ubicación nueva en el mismo lugar, la ruta se guarda y se cierra');
  ok(S.llamadas.osrm === 0, 'parado: no pide ningún camino');
}

// ---------- 4) la app nativa: el arreglo de raíz queda en la configuración ----------
const cfg = JSON.parse(leer('capacitor.config.json') || '{}');
ok(cfg.android && cfg.android.useLegacyBridge === true, 'capacitor.config.json: android.useLegacyBridge=true (README del plugin: las ubicaciones no se detienen en segundo plano)');
const html = leer('index.html');
ok(html.indexOf('<script src="gps-hueco.js"></script>') > 0 && html.indexOf('<script src="gps-hueco.js"></script>') < html.indexOf('<script src="motor-gps.js"></script>'), 'index.html carga gps-hueco.js antes de motor-gps.js');
ok(leer('sw.js').includes("'./gps-hueco.js'"), 'sw.js guarda gps-hueco.js para usar sin señal');

console.log(`pantalla apagada grabando: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
