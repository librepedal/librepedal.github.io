// Km honestos (Inty 2026-10-15): "no podemos estar entregando datos falsos". Recorridos simulados
// con la lógica REAL de km-viaje.js: posiciones espaciadas, subida lenta, caminata, temblor quieto.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lee = (f) => readFileSync(join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
const SRC = lee('km-viaje.js'), GPS = lee('motor-gps.js'), NAVF = lee('funciones-mapa-viajes.js'), RUTAS = lee('rutas.js'), HTML = lee('index.html'), SW = lee('sw.js'), NAV = lee('motor-navegacion.js');
let ok = 0, fail = 0;
const t = (n, c, extra) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n + (extra ? '\n    ' + extra : '')); } };

const almacen = {}; let actualizados = [];
const K = new Function('rutasLocales', 'rutasLocalesSet', 'renderRutas', 'db',
  SRC + '\nreturn {kmTrazado, kmASumar, crearContadorKm, corregirKmRutasLocales};')(
  () => almacen.rutas, (a) => { almacen.rutas = a; }, () => {},
  { collection: () => ({ doc: (id) => ({ update: (d) => { actualizados.push([id, d]); return Promise.resolve(); } }) }) });

// Un recorrido real: ~12,4 km de Camping Los Castaños hacia Parque Inglés, en bajadas y subidas.
const BASE = { lat: -35.30, lon: -71.20 };
const aLL = (e, n) => ({ lat: BASE.lat + n / 111320, lon: BASE.lon + e / (111320 * Math.cos(BASE.lat * Math.PI / 180)) });
function recorrido({ kmTotal, kmh, cadaSeg, ruido = 0, semilla = 3, acc = 8 }) {
  let s = semilla; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const pts = []; const pasoM = kmh / 3.6 * cadaSeg; const n = Math.round(kmTotal * 1000 / pasoM);
  for (let i = 0; i <= n; i++) {
    const d = i * pasoM, e = d * 0.8 + Math.sin(d / 400) * 150, nn = d * 0.6; // camino que serpentea
    pts.push(Object.assign(aLL(e + rnd() * 2 * ruido, nn + rnd() * 2 * ruido), { t: 1e12 + i * cadaSeg * 1000, acc }));
  }
  return pts;
}
// largo real del camino (sin ruido): suma directa entre puntos consecutivos
const hav = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const s = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)); };
const largoReal = (pts) => { let k = 0; for (let i = 1; i < pts.length; i++) k += hav(pts[i - 1], pts[i]); return k; };
// Simula el contador en vivo como lo usa ug(): un tramo por cada posición que llega, y fin() al detener.
function contar(pts) { const c = K.crearContadorKm(); let km = 0; pts.forEach(p => { km += c.tramo(p, false); }); return km + c.fin(); }
// Lo que hacía antes: solo si la ventana de 12 s daba velocidad >= 6 km/h.
function contarAntes(pts, kmh) {
  let km = 0;
  for (let i = 1; i < pts.length; i++) {
    const win = pts.slice(0, i + 1).filter(p => pts[i].t - p.t <= 12000);
    const sp = win.length >= 2 ? kmh : 0;
    if (sp >= 6) km += K.kmTrazado([Object.assign({}, pts[i - 1], { t: 0 }), Object.assign({}, pts[i], { t: 1e9 })]) || 0;
  }
  return km;
}

// ---- El caso de Inty: pantalla apagada, una posición cada 25 s ----
{
  const pts = recorrido({ kmTotal: 12.4, kmh: 16, cadaSeg: 25 });
  const real = largoReal(pts), ahora = contar(pts), antes = contarAntes(pts, 16);
  t('posiciones cada 25 s: ANTES se perdía casi todo (<10 %)', antes < real * 0.1, `antes ${antes.toFixed(2)} de ${real.toFixed(2)}`);
  t('posiciones cada 25 s: AHORA cuenta ≥97 % del recorrido', ahora >= real * 0.97 && ahora <= real * 1.01, `${ahora.toFixed(2)} de ${real.toFixed(2)}`);
}
// ---- Subida lenta en bici cargada (5 km/h), posiciones cada 2 s ----
{
  const pts = recorrido({ kmTotal: 3, kmh: 5, cadaSeg: 2 });
  const real = largoReal(pts), ahora = contar(pts), antes = contarAntes(pts, 5);
  t('subida a 5 km/h: ANTES 0 km (umbral de 6)', antes === 0, antes.toFixed(2));
  t('subida a 5 km/h: AHORA ≥95 %', ahora >= real * 0.95 && ahora <= real * 1.01, `${ahora.toFixed(2)} de ${real.toFixed(2)}`);
}
// ---- Caminata (trekking, 4 km/h) ----
{
  const pts = recorrido({ kmTotal: 2, kmh: 4, cadaSeg: 3 });
  t('caminando a 4 km/h: cuenta ≥95 %', contar(pts) >= largoReal(pts) * 0.95);
}
// ---- Bici normal, posiciones cada segundo con ruido: no infla ----
for (const ruido of [5, 15]) {
  const pts = recorrido({ kmTotal: 10, kmh: 20, cadaSeg: 1, ruido, acc: ruido });
  const limpio = largoReal(recorrido({ kmTotal: 10, kmh: 20, cadaSeg: 1 }));
  const k = contar(pts);
  t(`20 km/h con ruido de ±${ruido} m: entre 97 % y 103 % del real`, k >= limpio * 0.97 && k <= limpio * 1.03, `${k.toFixed(2)} de ${limpio.toFixed(2)}`);
}
// ---- Quieto horas en el camping con el GPS prendido: casi cero ----
function quieto(h, cada, amp, semilla = 11) {
  let s = semilla; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const q = []; for (let i = 0; i < h * 3600 / cada; i++) q.push(Object.assign(aLL(rnd() * 2 * amp, rnd() * 2 * amp), { t: 1e12 + i * cada * 1000, acc: amp })); return q;
}
for (const [h, cada, amp] of [[7, 5, 25], [7, 1, 10], [7, 20, 40]]) {
  const q = quieto(h, cada, amp);
  t(`${h} h quieto, temblor ±${amp} m cada ${cada} s: el contador no suma (<0,1 km)`, contar(q) < 0.1, contar(q).toFixed(3));
  t(`${h} h quieto, temblor ±${amp} m: el trazado tampoco (<0,1 km)`, K.kmTrazado(q) < 0.1, K.kmTrazado(q).toFixed(3));
}
// ---- Hueco de pantalla apagada: se cuenta la recta ----
{
  const c = K.crearContadorKm();
  c.tramo(Object.assign(aLL(0, 0), { t: 0 }));
  const k = c.tramo(Object.assign(aLL(0, 3000), { t: 30 * 60000 }), true); // 3 km en 30 min, después de un hueco
  t('hueco: suma la recta (3 km)', Math.abs(k - 3) < 0.01, k);
}
// ---- Salto imposible ----
t('kmASumar: salto de 1 km en 2 s (glitch) no suma', K.kmASumar({ km: 1, dtMs: 2000, sp: 0, maxKmh: 90 }) === 0);
t('kmASumar: con la ventana confirmando, suma como antes', K.kmASumar({ km: 0.02, dtMs: 1000, sp: 18, maxKmh: 90 }) === 0.02);
t('kmASumar: 200 m en 30 s sin ventana (espaciado) sí suma', K.kmASumar({ km: 0.2, dtMs: 30000, sp: 0, precision: 15, maxKmh: 90 }) === 0.2);
t('kmASumar: 25 m con precisión de 40 m no suma (puede ser error del GPS)', K.kmASumar({ km: 0.025, dtMs: 5000, sp: 0, precision: 40, maxKmh: 90 }) === 0);

// ---- Corregir rutas ya guardadas ----
{
  // rutas VIEJAS: sus puntos no traen la precisión del GPS (acc), como las guardadas antes del arreglo
  const sinAcc = (a) => a.map(p => ({ lat: p.lat, lon: p.lon, t: p.t }));
  const pts = sinAcc(recorrido({ kmTotal: 12.4, kmh: 16, cadaSeg: 25 }));
  const camping = sinAcc(quieto(7, 20, 40, 5));
  const rango = (a) => ({ startTime: a[0].t, endTime: a[a.length - 1].t });
  almacen.rutas = [
    Object.assign({ localId: 'l1', firebaseId: 'F1', distance: 0.27, points: pts }, rango(pts)),          // la del Parque Inglés
    Object.assign({ localId: 'l2', firebaseId: 'F2', distance: 5.0, points: sinAcc(recorrido({ kmTotal: 5, kmh: 18, cadaSeg: 2 })) }, rango(pts)), // bien
    { localId: 'imp', distance: 30, points: pts, importada: true },                                        // importada: no se toca
    Object.assign({ localId: 'l4', firebaseId: 'F4', distance: 0.5, points: camping }, rango(camping)),    // 7 h en el camping con mala señal
  ];
  actualizados = [];
  const n = K.corregirKmRutasLocales();
  const r1 = almacen.rutas[0];
  t('corrige la ruta corta (0,27 → ~12 km)', n === 1 && r1.distance > 11.5 && r1.distanciaAntes === 0.27, JSON.stringify({ n, d: r1.distance }));
  t('y su copia en la nube', actualizados.length === 1 && actualizados[0][0] === 'F1');
  t('no toca la ruta que ya estaba bien', almacen.rutas[1].distance === 5.0);
  t('no toca rutas importadas de GPX', almacen.rutas[2].distance === 30);
  t('7 h quieto con mala señal: NO se "corrige" con temblor (prudente con rutas viejas)', almacen.rutas[3].distance === 0.5, almacen.rutas[3].distance);
  t('una sola vez: la segunda pasada no cambia nada', K.corregirKmRutasLocales() === 0);
}

// ---- Lo recuperado llega al TOTAL de la cuenta (Inty 2026-10-16: "200 km que no se ven en el total") ----
{
  const us = { di: 100, dm: { ciclismo: 100 }, c: 0, mantKm: 0 };
  const guardado = {}; let subidas = 0, avisos = [];
  const mk = (listo) => new Function('rutasLocales', 'rutasLocalesSet', 'renderRutas', 'db', 'us', '_mantListoParaSubir', '_sumarKmMantencion', 'sincronizarStats', 'au', 'cu', 'localStorage', 'lpAviso', 'h', 'kcalPorKm',
    SRC + '\nreturn {sumarKmRecuperados, recuperarKmCortos};')(
    () => almacen.rutas, (a) => { almacen.rutas = a; }, () => {}, { collection: () => ({ doc: () => ({ update: () => Promise.resolve() }) }) },
    us, listo, (km) => { us.mantKm += km; }, () => { subidas++; }, () => {}, 'inty', { setItem: (k, v) => { guardado[k] = v; } }, (m) => avisos.push(m), () => {}, () => 30);
  // estado que dejó la 8.824: rutas ya corregidas (distanciaAntes) pero sin sumar al total
  almacen.rutas = [
    { localId: 'a', distance: 62.4, distanciaAntes: 3.1, points: [], modo: 'ciclismo' },
    { localId: 'b', distance: 81.0, distanciaAntes: 0.27, points: [] },
    { localId: 'c', distance: 5.0, points: [] },                                   // nunca se corrigió: no se toca
    { localId: 'd', distance: 30, distanciaAntes: 2, importada: true, points: [] }, // importada: no suma
  ];
  const antesDeLeerNube = mk(false).sumarKmRecuperados();
  t('no suma antes de leer la nube (la nube podría pisarlo)', antesDeLeerNube === 0 && us.di === 100, us.di);
  const F = mk(true);
  const km = F.sumarKmRecuperados();
  const esperado = (62.4 - 3.1) + (81.0 - 0.27);
  t('suma al total lo que se recuperó en cada ruta', Math.abs(km - esperado) < 1e-9 && Math.abs(us.di - (100 + esperado)) < 1e-9, us.di);
  t('y al desglose por disciplina (ranking)', Math.abs(us.dm.ciclismo - (100 + esperado)) < 1e-9, JSON.stringify(us.dm));
  t('y al odómetro de la mantención', Math.abs(us.mantKm - esperado) < 1e-9, us.mantKm);
  t('lo guarda en el teléfono y lo sube a la nube', !!guardado.lp_u_inty && subidas === 1);
  t('una sola vez por ruta', F.sumarKmRecuperados() === 0 && Math.abs(us.di - (100 + esperado)) < 1e-9);
  t('las importadas no suman', !almacen.rutas[3].kmSumadosAlTotal || us.di < 100 + esperado + 1);
  // una ruta que la 8.824 "corrigió" con temblor de una noche quieto: se rebaja antes de sumar
  let sq = 5; const rq = () => { sq = (sq * 16807) % 2147483647; return sq / 2147483647 - 0.5; };
  const noche = []; for (let i = 0; i < 12 * 180; i++) noche.push(Object.assign(aLL(rq() * 100, rq() * 100), { t: 1e12 + i * 20000 }));
  const diAntes = us.di;
  almacen.rutas.push({ localId: 'inflada', distance: 15.5, distanciaAntes: 0.4, points: noche });
  F.sumarKmRecuperados();
  const rInf = almacen.rutas.find(x => x.localId === 'inflada');
  t('ruta inflada por temblor: vuelve a su valor honesto y casi no suma', rInf.distance < 1 && us.di - diAntes < 0.6, JSON.stringify({ d: rInf.distance, sumo: us.di - diAntes }));
  // recuperarKmCortos avisa con los km
  almacen.rutas.push({ localId: 'e', distance: 40, distanciaAntes: 1, points: [] });
  const r = F.recuperarKmCortos();
  t('recuperarKmCortos avisa cuántos km volvieron', r.km === 39 && avisos.some(a => /Recuperé 39 kil/.test(a)), JSON.stringify(avisos));
}
// ---- Trazados viejos SIN precisión: las horas quieto con mala señal no suman (2026-10-16) ----
{
  let sd = 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647 - 0.5; };
  const quietoSinAcc = (h, cada, ruido, t0, e0 = 0, n0 = 0) => { const p = []; for (let i = 0; i < h * 3600 / cada; i++) p.push(Object.assign(aLL(e0 + rnd() * 2 * ruido, n0 + rnd() * 2 * ruido), { t: t0 + i * cada * 1000 })); return p; };
  const andarSinAcc = (km, kmh, cada, t0, e0, n0) => { const p = []; const paso = kmh / 3.6 * cada, n = Math.round(km * 1000 / paso); for (let i = 0; i <= n; i++) { const d = i * paso; p.push(Object.assign(aLL(e0 + d * 0.8, n0 + d * 0.6), { t: t0 + i * cada * 1000 })); } return p; };
  for (const r of [40, 60]) t(`12 h quieto con ±${r} m, sin precisión: casi nada (antes 15-41 km falsos)`, K.kmTrazado(quietoSinAcc(12, 20, r, 1e12)) < 1, K.kmTrazado(quietoSinAcc(12, 20, r, 1e12)).toFixed(2));
  // 3 días de 65 km con 2 noches de 12 h grabando en el camping
  let pts = [], tt = 1e12, e = 0, n = 0;
  for (let d = 0; d < 3; d++) { const a = andarSinAcc(65, 15, 25, tt, e, n); pts = pts.concat(a); tt = a[a.length - 1].t + 25000; e += 65000 * 0.8; n += 65000 * 0.6; if (d < 2) { const q = quietoSinAcc(12, 20, 40, tt, e, n); pts = pts.concat(q); tt = q[q.length - 1].t + 20000; } }
  const kt = K.kmTrazado(pts);
  t('viaje de 3 días con noches: ~195 km reales (±3 %)', Math.abs(kt - 195) / 195 < 0.03, kt.toFixed(1));
  almacen.rutas = [Object.assign({ localId: 'v3', distance: 4.2, points: pts }, { startTime: pts[0].t, endTime: pts[pts.length - 1].t })];
  K.corregirKmRutasLocales();
  t('y se corrige aunque el promedio con las noches sea bajo', Math.abs(almacen.rutas[0].distance - 195) / 195 < 0.03, almacen.rutas[0].distance);
}
// enganches: corre al leer la nube y al abrir Mis rutas
{
  const LOG = lee('gamificacion-logros.js'), SES = lee('auth-sesion.js');
  t('al terminar de leer la nube', /_mantListoParaSubir=true;\n\s*try\{ if\(typeof recuperarKmCortos==='function'\) recuperarKmCortos\(\); \}/.test(LOG));
  t('también en el login de cuenta nueva', /recuperarKmCortos/.test(SES));
  t('al abrir Mis rutas', /recuperarKmCortos\(\)/.test(RUTAS));
}

// ---- Enganches ----
t('grabar: el km ya no depende de la ventana (sp>0)', !/if\(us\.la && \(sp>0 \|\| _hueco\) && _saltoPosOK\)\{ _sumarKmViaje\(moved\); \}/.test(GPS) && /kmvContadorLibre\.tramo\(_ptKm, _huecoK\)/.test(GPS));
t('grabar: el contador parte de cero en cada paseo', /kmvContadorLibre\.reiniciar\(\)/.test(GPS));
t('navegar: tampoco depende de speed>0', /kmvContadorNav\.tramo\(\{lat:lat,lon:lon,t:_now\}, false\)/.test(NAVF));
t('navegar: el inicio es el ancla', /kmvContadorNav\.reiniciar\(\); kmvContadorNav\.tramo\(\{lat:startLat,lon:startLon/.test(NAV));
t('la ruta guardada lleva SUS km (no us.di de la cuenta)', !/distance:us\.di/.test(RUTAS) && /distance:_km/.test(RUTAS));
t('al cargar tus rutas se corrigen las viejas (y suman al total)', /recuperarKmCortos\(\)/.test(RUTAS) && /n=corregirKmRutasLocales\(\)/.test(SRC));
t('index.html carga km-viaje.js antes que motor-gps.js', HTML.indexOf('<script src="km-viaje.js">') > 0 && HTML.indexOf('<script src="km-viaje.js">') < HTML.indexOf('<script src="motor-gps.js">'));
t('sw.js lo precachea', /'\.\/km-viaje\.js'/.test(SW));

console.log('  km-viaje.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
