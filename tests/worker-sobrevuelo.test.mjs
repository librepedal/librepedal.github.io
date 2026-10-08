// Worker del sobrevuelo (worker-sobrevuelo/worker.js) + el cliente (sobrevuelo-3d.js) que lo usa.
// Inty (2026-10-07): "hazlo con un worker que lo guarde una vez por ruta". Se prueba sin red: Valhalla simulado y D1 sobre SQLite real (misma migración).
// - una ruta se pega UNA vez; la segunda vez sale de la caché sin llamar a Valhalla (también desde otro "teléfono")
// - la trampa de Valhalla (200 con solo un pedazo de la ruta) se detecta por tramo y no se guarda como buena
// - si todo falla no se guarda (se reintenta otro día); límite por IP solo para rutas nuevas; CORS; entradas malas
// - el cliente: worker primero; si el worker falla, responde mal o no está publicado → Valhalla directo, como antes
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { DatabaseSync } from 'node:sqlite';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(raiz, 'worker-sobrevuelo', 'worker.js'), 'utf8');
const W = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(src));
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// ---------- simulaciones ----------
function encPoly6(c) { // [[lon,lat]] → polyline6 (lo inverso de decPoly6)
  let s = '', pla = 0, plo = 0;
  const e = (v) => { v = v < 0 ? ~(v << 1) : v << 1; let o = ''; while (v >= 32) { o += String.fromCharCode((32 | (v & 31)) + 63); v >>= 5; } return o + String.fromCharCode(v + 63); };
  for (const [lo, la] of c) { const a = Math.round(la * 1e6), b = Math.round(lo * 1e6); s += e(a - pla) + e(b - plo); pla = a; plo = b; }
  return s;
}
// Valhalla simulado. modo: 'bien' (devuelve el tramo), 'pedazo' (solo la mitad: la trampa), 'error' (500)
const V = { llamadas: 0, modo: () => 'bien' };
function valhalla(body) {
  V.llamadas++;
  const shape = JSON.parse(body).shape, k = V.llamadas, m = V.modo(k, shape);
  if (m === 'error') return new Response('{}', { status: 500 });
  let c = shape.map((p) => [p.lon + 0.00002, p.lat]); // "pegado": corrido ~2 m
  if (m === 'pedazo') c = c.slice(0, Math.ceil(c.length / 2));
  return new Response(JSON.stringify({ trip: { legs: [{ shape: encPoly6(c) }] } }), { status: 200 });
}
// D1 simulado sobre SQLite REAL (node:sqlite) con la MISMA migración del worker. API como D1: prepare/bind/first/run/all;
// batch() es una transacción (BEGIN/COMMIT, ROLLBACK si una falla) y devuelve meta.changes por sentencia.
const MIGRACION = readFileSync(join(raiz, 'worker-sobrevuelo', 'migrations', '0001_inicial.sql'), 'utf8');
function d1() {
  const db = new DatabaseSync(':memory:'); db.exec(MIGRACION);
  const stats = { escrituras: 0 };
  class Sentencia {
    constructor(sql, args = []) { this.sql = sql; this.args = args; }
    bind(...a) { return new Sentencia(this.sql, a); }
    async first(col) { const r = db.prepare(this.sql).get(...this.args); if (!r) return null; return col ? r[col] : { ...r }; }
    async all() { return { success: true, results: db.prepare(this.sql).all(...this.args).map((r) => ({ ...r })), meta: {} }; }
    async run() { return this._run(); }
    _run() { const s = db.prepare(this.sql); if (/^\s*select/i.test(this.sql)) return { success: true, results: s.all(...this.args), meta: { changes: 0 } };
      const info = s.run(...this.args); stats.escrituras += Number(info.changes); return { success: true, results: [], meta: { changes: Number(info.changes) } }; }
  }
  return { db, stats, prepare: (sql) => new Sentencia(sql),
    async batch(lista) { db.exec('BEGIN'); try { const out = lista.map((s) => s._run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
}
const filas = (env, sql, ...a) => env.DB.db.prepare(sql).all(...a);
const uno = (env, sql, ...a) => Object.values(env.DB.db.prepare(sql).get(...a))[0];
globalThis.fetch = async (url, o) => { if (String(url).includes('valhalla')) return valhalla(o.body); throw new Error('red no permitida en la prueba: ' + url); };

// ruta de prueba: N puntos cada ~44 m hacia el este (lat, lon)
const ruta = (N, lat = -40.2) => Array.from({ length: N }, (_, i) => [lat, +(-72.3 + i * 0.0005).toFixed(5)]);
const pedir = (env, cuerpo, { ip = '1.1.1.1', origen = 'https://librepedal.cl', metodo = 'POST' } = {}) =>
  W.default.fetch(new Request('https://librepedal-sobrevuelo.librepedal.workers.dev', {
    method: metodo, headers: { 'Content-Type': 'application/json', Origin: origen, 'CF-Connecting-IP': ip },
    body: metodo === 'POST' ? (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)) : undefined,
  }), env);
const DIA = 86400000;

// 1) primera vez: pega por tramos de 120 (de a 2), guarda 180 días en D1
{
  const env = { DB: d1() }; V.llamadas = 0; V.modo = () => 'bien';
  const t0 = Date.now();
  const r = await pedir(env, { puntos: ruta(300) }), j = await r.json();
  ok(r.status === 200 && j.m === 'valhalla' && j.cache === false && j.t === '3/3', 'ruta nueva → pegada (3 tramos de 300 puntos) ' + JSON.stringify({ s: r.status, m: j.m, t: j.t }));
  ok(V.llamadas === 3, '3 pedidos a Valhalla (tramos de 120 que se tocan), fueron ' + V.llamadas);
  const g = filas(env, 'SELECT clave, metodo, creada, expira FROM rutas');
  ok(g.length === 1 && /^[0-9a-f]{64}$/.test(g[0].clave) && g[0].metodo === 'valhalla' && Math.abs(g[0].expira - g[0].creada - 180 * DIA) < 5 && g[0].creada >= t0,
    'se guarda en D1 (clave sha256, método, vence a los 180 días)');
  ok(j.c.length > 2 && j.c.every((p, i) => i === 0 || i === j.c.length - 1 || W.hav(j.c[i - 1], p) >= 25 - 1e-6), 'compacta: 1 punto cada ≥25 m');
  ok(Math.abs(j.c[0][0] - (-72.3 + 0.00002)) < 1e-5 && Math.abs(j.c[0][1] - -40.2) < 1e-5, 'entrega [lon,lat] de lo pegado');
  // 2) segunda vez (otro teléfono, otra IP): de lo guardado, CERO llamadas a Valhalla, cero escrituras, mismo resultado
  V.llamadas = 0; const esc = env.DB.stats.escrituras;
  const r2 = await pedir(env, { puntos: ruta(300) }, { ip: '2.2.2.2' }), j2 = await r2.json();
  ok(j2.cache === true && V.llamadas === 0 && JSON.stringify(j2.c) === JSON.stringify(j.c), 'misma ruta → de lo guardado, sin llamar a Valhalla');
  ok(env.DB.stats.escrituras === esc, 'leer lo guardado no escribe nada en D1 (ni gasta el límite de la conexión)');
  V.llamadas = 0;
  const casi = ruta(300).map(([a, b]) => [a + 0.000001, b - 0.000001]);
  const j3 = await (await pedir(env, { puntos: casi })).json();
  ok(j3.cache === true && V.llamadas === 0, 'diferencias bajo 1 m → misma ruta guardada');
  const j4 = await (await pedir(env, { puntos: ruta(300, -40.3) })).json();
  ok(j4.cache === false && V.llamadas === 3, 'otra ruta → se pega aparte');
}

// 3) la trampa de Valhalla: 200 con solo un pedazo → ese tramo queda con los puntos propios, resultado "parcial"
{
  const env = { DB: d1() }; V.llamadas = 0; V.modo = (k) => (k === 2 ? 'pedazo' : 'bien');
  const j = await (await pedir(env, { puntos: ruta(300) })).json();
  ok(j.m === 'parcial' && j.t === '2/3', 'tramo con respuesta a medias detectado → parcial 2/3 (' + j.m + ' ' + j.t + ')');
  const largoTotal = j.c.slice(1).reduce((s, p, i) => s + W.hav(j.c[i], p), 0);
  ok(largoTotal > 299 * 42 * 0.97, 'la línea no se corta donde Valhalla devolvió un pedazo (' + Math.round(largoTotal) + ' m)');
  ok(uno(env, "SELECT COUNT(*) FROM rutas WHERE metodo = 'parcial'") === 1, 'el parcial se guarda (es mejor que el GPS solo)');
}

// 4) todo falla → GPS limpio, NO se guarda; el siguiente pedido vuelve a intentar
{
  const env = { DB: d1() }; V.llamadas = 0; V.modo = () => 'error';
  const j = await (await pedir(env, { puntos: ruta(150) })).json();
  ok(j.m === 'gps' && j.t === '0/2' && j.c.length > 2, 'Valhalla caído → entrega la ruta limpia (gps 0/2)');
  ok(uno(env, 'SELECT COUNT(*) FROM rutas') === 0, 'un fallo total no se guarda');
  V.modo = () => 'bien'; V.llamadas = 0;
  const j2 = await (await pedir(env, { puntos: ruta(150) })).json();
  ok(j2.m === 'valhalla' && j2.cache === false && V.llamadas === 2, 'reintento después del fallo → ahora sí pegada');
  globalThis.fetch = async () => { throw new Error('sin red'); };
  const j3 = await (await pedir({ DB: d1() }, { puntos: ruta(50) })).json();
  ok(j3.m === 'gps', 'sin red hacia Valhalla → gps, sin caerse');
  globalThis.fetch = async () => new Response(JSON.stringify({ trip: { legs: [{ shape: '' }] } }));
  const j4 = await (await pedir({ DB: d1() }, { puntos: ruta(50) })).json();
  ok(j4.m === 'gps', 'respuesta vacía de Valhalla → gps');
  globalThis.fetch = async (url, o) => { if (String(url).includes('valhalla')) return valhalla(o.body); throw new Error('red no permitida: ' + url); };
}

// 5) límites de Inty (2026-10-07): 20 rutas NUEVAS por conexión al día y 300 en total al día; lo guardado no cuenta
{
  const env = { DB: d1() }; V.modo = () => 'bien';
  const guardada = ruta(5, -41);
  await pedir(env, { puntos: guardada }, { ip: '9.9.9.9' });
  let r;
  for (let i = 1; i <= 19; i++) r = await pedir(env, { puntos: ruta(5, -41 - i * 0.01) }, { ip: '9.9.9.9' });
  ok(r.status === 200, 'la ruta nueva n.º 20 de una conexión en el día → 200');
  r = await pedir(env, { puntos: ruta(5, -42) }, { ip: '9.9.9.9' });
  ok(r.status === 429 && /conexión/.test((await r.json()).error), 'la n.º 21 de la misma conexión → 429 (límite de la conexión)');
  const c = await pedir(env, { puntos: guardada }, { ip: '9.9.9.9' });
  ok(c.status === 200 && (await c.json()).cache === true, 'con el límite lleno, una ruta guardada igual se entrega');
  ok((await pedir(env, { puntos: ruta(5, -45) }, { ip: '8.8.8.8' })).status === 200, 'otra conexión no se ve afectada');
  const lim = filas(env, 'SELECT dia, ip, cuenta FROM limites ORDER BY cuenta DESC');
  ok(lim.length === 2 && lim[0].cuenta === 20 && lim[1].cuenta === 1 && lim.every((x) => /^[0-9a-f]{16}$/.test(x.ip)), 'cuenta exacta por conexión y la IP va como hash (no tal cual) ' + JSON.stringify(lim));
  const ahora = Date.now; Date.now = () => ahora() + DIA;
  ok((await pedir(env, { puntos: ruta(5, -43) }, { ip: '9.9.9.9' })).status === 200, 'al día siguiente la conexión vuelve a poder');
  Date.now = () => ahora() + 3 * DIA;
  await pedir(env, { puntos: ruta(5, -44) }, { ip: '7.7.7.7' });
  const corte = new Date(Date.now() - 2 * DIA - 4 * 3600000).toISOString().slice(0, 10);
  ok(uno(env, 'SELECT COUNT(*) FROM limites WHERE dia < ?', corte) === 0 && uno(env, 'SELECT COUNT(DISTINCT dia) FROM limites') === 2, 'los contadores de más de 2 días se borran solos al guardar (quedan el de hace 2 días y el de hoy)');
  Date.now = ahora;
}
{
  // tope total: 300 rutas nuevas al día entre todas las conexiones
  const env = { DB: d1() }; V.modo = () => 'bien'; V.llamadas = 0;
  let r, malas = 0;
  for (let i = 0; i < 300; i++) { r = await pedir(env, { puntos: ruta(5, -30 - i * 0.01) }, { ip: '10.0.' + Math.floor(i / 15) + '.' + (i % 15) }); if (r.status !== 200) malas++; }
  ok(malas === 0, 'las primeras 300 rutas nuevas del día pasan (' + malas + ' rechazadas)');
  const antes = V.llamadas;
  r = await pedir(env, { puntos: ruta(5, -60) }, { ip: '11.1.1.1' });
  ok(r.status === 429 && /tope/.test((await r.json()).error) && V.llamadas === antes, 'la n.º 301 del día → 429 (tope del día) sin llamar a Valhalla');
  r = await pedir(env, { puntos: ruta(5, -30) }, { ip: '11.1.1.1' });
  ok(r.status === 200 && (await r.json()).cache === true, 'con el tope lleno, lo guardado se sigue entregando');
  ok(uno(env, 'SELECT SUM(cuenta) FROM limites') === 300 && uno(env, 'SELECT COUNT(*) FROM rutas') === 300, 'el día queda en exactamente 300 rutas nuevas');
}
{
  // EXACTO aun con pedidos simultáneos (KV no lo era): 40 rutas nuevas a la vez desde una conexión → pasan 20
  const env = { DB: d1() }; V.modo = () => 'bien';
  const res = await Promise.all(Array.from({ length: 40 }, (_, i) => pedir(env, { puntos: ruta(5, -50 - i * 0.01) }, { ip: '5.5.5.5' })));
  const pasan = res.filter((x) => x.status === 200).length;
  ok(pasan === 20 && uno(env, 'SELECT cuenta FROM limites') === 20, '40 pedidos simultáneos de una conexión → pasan exactamente 20 (pasaron ' + pasan + ')');
}
{
  // vencimiento: una ruta guardada hace más de 180 días no se entrega y se borra al guardar otra
  const env = { DB: d1() }; V.modo = () => 'bien';
  await pedir(env, { puntos: ruta(5, -20) });
  env.DB.db.exec('UPDATE rutas SET expira = 1');
  V.llamadas = 0;
  const j = await (await pedir(env, { puntos: ruta(5, -20) })).json();
  ok(j.cache === false && V.llamadas === 1, 'ruta vencida → se vuelve a pegar (no se entrega lo vencido)');
  ok(uno(env, 'SELECT COUNT(*) FROM rutas') === 1 && uno(env, 'SELECT MIN(expira) FROM rutas') > Date.now(), 'lo vencido se reemplaza/borra al guardar');
}

// 6) entradas malas
{
  const env = { DB: d1() };
  ok((await pedir(env, null, { metodo: 'GET' })).status === 405, 'GET → 405');
  ok((await pedir(env, '{no es json')).status === 400, 'JSON roto → 400');
  ok((await pedir(env, { puntos: ruta(2) })).status === 400, 'menos de 3 puntos → 400');
  ok((await pedir(env, { otra: 1 })).status === 400, 'sin "puntos" → 400');
  ok((await pedir(env, { puntos: [[-40, -72], [NaN, -72], [-40, -72.1]] })).status === 400, 'punto NaN → 400');
  ok((await pedir(env, { puntos: [[-40, -72], [95, -72], [-40, -72.1]] })).status === 400, 'latitud fuera de rango → 400');
  ok((await pedir(env, { puntos: [[-40, -72], null, [-40, -72.1]] })).status === 400, 'punto null → 400');
  V.llamadas = 0;
  ok((await pedir(env, { puntos: ruta(6001) })).status === 413 && V.llamadas === 0, 'más de 6000 puntos → 413 sin llamar a Valhalla');
  ok(uno(env, 'SELECT COUNT(*) FROM rutas') === 0 && uno(env, 'SELECT COUNT(*) FROM limites') === 0, 'nada se guarda con entradas malas');
}

// 7) CORS
{
  const env = { DB: d1() };
  const pre = await pedir(env, null, { metodo: 'OPTIONS', origen: 'https://librepedal.cl' });
  ok(pre.status === 200 && pre.headers.get('Access-Control-Allow-Origin') === 'https://librepedal.cl' && /POST/.test(pre.headers.get('Access-Control-Allow-Methods')), 'preflight desde librepedal.cl');
  const ajeno = await pedir(env, { puntos: ruta(10) }, { origen: 'https://otro-sitio.com' });
  ok(ajeno.headers.get('Access-Control-Allow-Origin') === 'https://librepedal.cl', 'otro origen no recibe permiso CORS');
  const pages = await pedir(env, { puntos: ruta(10) }, { origen: 'https://librepedal-web.pages.dev' });
  ok(pages.headers.get('Access-Control-Allow-Origin') === 'https://librepedal-web.pages.dev', 'la vista previa de Pages sí');
}

// 8) D1 ausente o fallando: igual entrega (sin guardar) y no se cae
{
  V.modo = () => 'bien';
  const j = await (await pedir({}, { puntos: ruta(30) })).json();
  ok(j.m === 'valhalla', 'sin D1 → pega igual');
  const roto = { prepare() { throw new Error('d1 caído'); }, async batch() { throw new Error('d1 caído'); } };
  const r = await pedir({ DB: roto }, { puntos: ruta(30) });
  ok(r.status === 200 && (await r.json()).m === 'valhalla', 'D1 que falla → pega igual, 200');
  const env = { DB: d1() };
  const [a, b] = await Promise.all([pedir(env, { puntos: ruta(200) }, { ip: '3.3.3.3' }), pedir(env, { puntos: ruta(200) }, { ip: '4.4.4.4' })]);
  const ja = await a.json(), jb = await b.json();
  ok(JSON.stringify(ja.c) === JSON.stringify(jb.c) && ja.m === 'valhalla' && jb.m === 'valhalla' && uno(env, 'SELECT COUNT(*) FROM rutas') === 1, 'pedidos simultáneos de la misma ruta → mismo resultado y una sola fila');
}

// ---------- 9) el cliente (sobrevuelo-3d.js) contra el worker ----------
function cliente(fetchFn) {
  const nada = () => null;
  const ctx = { console: { ...console, info() {} }, Math, JSON, Object, Array, String, Number, RegExp, isFinite, Date, Promise, setTimeout, clearTimeout,
    fetch: fetchFn, AbortController, performance: { now: () => Date.now() }, location: { search: '' }, navigator: {},
    localStorage: { getItem: nada, setItem() {} }, matchMedia: () => ({ matches: false }),
    document: { getElementById: nada, createElement: () => ({ getContext: nada }), addEventListener() {}, removeEventListener() {}, querySelector: nada },
    window: { matchMedia: () => ({ matches: false }), addEventListener() {} } };
  vm.createContext(ctx);
  for (const m of ['sobrevuelo-3d-vista.js', 'sobrevuelo-3d-pegada.js', 'sobrevuelo-video.js']) vm.runInContext(readFileSync(join(raiz, m), 'utf8'), ctx, { filename: m });
  vm.runInContext(readFileSync(join(raiz, 'sobrevuelo-3d.js'), 'utf8'), ctx, { filename: 'sobrevuelo-3d.js' });
  return ctx.window.__sb3test;
}
// puntos del GPS como los guarda la app: cada ~11 m, con hora (4 m/s)
const gps = Array.from({ length: 1200 }, (_, i) => ({ lat: -40.2, lon: -72.3 + i * 0.000125, t: 1e12 + i * 2750 }));
{
  const env = { DB: d1() }; V.modo = () => 'bien';
  const log = [];
  const alWorker = async (url, o) => {
    log.push(String(url));
    if (String(url).startsWith('https://librepedal-sobrevuelo.librepedal.workers.dev')) return pedir(env, o.body, {});
    return valhalla(o.body);
  };
  const T = cliente(alWorker);
  ok(typeof T.pegarAlCamino === 'function', 'el cliente expone pegarAlCamino para probar');
  V.llamadas = 0;
  const r1 = await T.pegarAlCamino(gps);
  ok(r1.metodo === 'valhalla' && log[0].includes('librepedal-sobrevuelo') && log.length === 1, 'cliente → pide al worker (un solo pedido desde el teléfono)');
  ok(V.llamadas >= 2, 'el worker hizo los pedidos a Valhalla (' + V.llamadas + ')');
  ok(r1.coords.length > 10 && r1.coords.every((p) => Math.abs(p[1] + 40.2) < 1e-4), 'el cliente recibe la línea [lon,lat]');
  // otro teléfono, misma ruta: el worker responde de la caché (la limpieza y la muestra del cliente son estables)
  V.llamadas = 0; log.length = 0;
  const r2 = await cliente(alWorker).pegarAlCamino(gps);
  ok(/^guardada/.test(r2.motivo) && V.llamadas === 0, 'segundo teléfono → la ruta guardada, cero pedidos a Valhalla (' + r2.motivo + ')');
  ok(JSON.stringify(r2.coords) === JSON.stringify(r1.coords), 'misma línea en los dos teléfonos');
}
// el worker falla de distintas formas → Valhalla directo, como antes
for (const [nombre, falla] of [
  ['no publicado (sin red)', async () => { throw new TypeError('Failed to fetch'); }],
  ['500', async () => new Response('{}', { status: 500 })],
  ['429 límite', async () => new Response('{"error":"x"}', { status: 429 })],
  ['respuesta sin línea', async () => new Response(JSON.stringify({ c: [], m: 'valhalla' }))],
  ['método desconocido', async () => new Response(JSON.stringify({ c: [[-72, -40], [-72.1, -40]], m: 'raro' }))],
  ['coordenadas basura', async () => new Response(JSON.stringify({ c: [[-72, -40], ['x', null]], m: 'valhalla' }))],
  ['coordenada null', async () => new Response(JSON.stringify({ c: [[-72, -40], [null, -40]], m: 'valhalla' }))],
  ['JSON roto', async () => new Response('<html>')],
]) {
  V.llamadas = 0; V.modo = () => 'bien';
  const T = cliente(async (url, o) => (String(url).includes('librepedal-sobrevuelo') ? falla() : valhalla(o.body)));
  const r = await T.pegarAlCamino(gps);
  ok(r.metodo === 'valhalla' && V.llamadas >= 2, 'worker ' + nombre + ' → pega directo con Valhalla como antes');
}
// worker caído Y Valhalla caído → GPS limpio (el sobrevuelo igual se ve)
{
  V.modo = () => 'error';
  const T = cliente(async (url, o) => (String(url).includes('librepedal-sobrevuelo') ? new Response('', { status: 503 }) : valhalla(o.body)));
  const r = await T.pegarAlCamino(gps);
  ok(r.metodo === 'gps' && r.coords.length > 10, 'todo caído → línea del GPS limpio, sin error');
}

console.log(`  ${n - f}/${n} pruebas del worker del sobrevuelo OK`);
process.exit(f ? 1 : 0);
