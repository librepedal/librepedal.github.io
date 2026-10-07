// 9 botones que publican en Firestore quedaban TRABADOS y mudos sin señal (add() no responde hasta llegar al servidor):
// reportar peligro, punto en el mapa, alojamiento (x2), truco de reparación, comentario, frase, reto, rodada.
// Se corre cada función REAL con una base que nunca responde y con una que responde al tiro. (Revisión de botones 2026-10-07)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
let ok = 0, fail = 0;
const t = (n, c, extra) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n + (extra ? ' → ' + extra : '')); } };
function bloque(src, desde) { const i = src.indexOf(desde); if (i < 0) throw new Error('no está: ' + desde); let p = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') p++; else if (src[k] === '}' && --p === 0) return src.slice(i, k + 1); } }
const HELPER = bloque(leer('dialogos-genericos.js'), 'function lpEscrituraConTope(');

const CASOS = [
  ['funciones-mapa-viajes.js', 'agregarPOI', '_agregandoPOI'], ['funciones-mapa-viajes.js', 'publicarAlojo', '_publicandoAlojo'],
  ['funciones-mapa-viajes.js', 'addRepairTip', '_agregandoRepairTip'], ['funciones-mapa-viajes.js', 'addHostel', '_agregandoHostel'],
  ['funciones-mapa-viajes.js', 'addComment', '_agregandoComentarioGuia'], ['gamificacion-comunidad.js', 'enviarFraseComunidad', '_enviandoFrase'],
  ['gamificacion-retos.js', 'crearReto', '_creandoReto'], ['reportes.js', 'enviarReporte', '_enviandoReporte'], ['rodadas.js', 'crearRodada', '_creandoRodada'],
];
const futuro = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16);
function elemento(id) {
  const valores = { retoMeta: '50', retoDias: '7', rodadaFecha: futuro, rodadaRutaSel: '', repSuperficieTipo: 'ripio', 'hostel-type': 'hostel' };
  return { id, value: id in valores ? valores[id] : 'Texto de prueba', style: {}, innerText: '', classList: { add() {}, remove() {}, contains: () => false }, remove() {} };
}
async function correr(file, nombre, candado, add) {
  const dichos = [], avisos = [], timers = [];
  const vars = { cu: 'u1', ADMIN_ID: 'u1', nombreUsuario: 'Ana', poiCatSel: 'peligro', poiManualCoords: { lat: -40, lon: -72 }, reporteCatSel: 'peligro',
    currentUserLocation: { lat: -40, lon: -72 }, us: { la: -40, lo: -72 }, reporteMapaCoords: null, hostelCoords: null, fotosPendientes: {}, mp: null, poiManualMarker: null };
  vars[candado] = false;
  const stub = new Proxy(function () { return stub; }, { get: (o, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : stub), apply: () => stub });
  const especiales = {
    h: (x) => dichos.push(x), lpAviso: (x) => avisos.push(x), console, Promise, Date, Math, JSON, Number, parseFloat, parseInt, isNaN, String, Object, Array, encodeURIComponent,
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout() {},
    fetch: () => Promise.reject(new Error('sin red')), window: { lpUID: 'x' },
    document: { getElementById: elemento, querySelector: () => null, querySelectorAll: () => [] },
    db: { collection: () => ({ add }) }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 0 } } },
    rutasLocales: () => [], lpEscrituraConTope: null,
  };
  const ambito = new Proxy({}, { has: () => true, get: (o, k) => (k in especiales ? especiales[k] : k in vars ? vars[k] : k === Symbol.unscopables ? undefined : stub), set: (o, k, v) => { if (k in especiales) especiales[k] = v; else vars[k] = v; return true; } });
  const src = leer(file);
  const fn = new Function('ambito', 'with(ambito){ ' + HELPER + '\nlpEscrituraConTope=lpEscrituraConTope;\n' + bloque(src, 'async function ' + nombre + '(') + '\nreturn ' + nombre + '(); }');
  const p = fn(ambito);
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
  const tope = timers.find((x) => x.ms === 8000 || x.ms == null);
  if (tope) { tope.f(); for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); }
  await Promise.race([p, new Promise((r) => setImmediate(r))]);
  return { dichos, avisos, candado: vars[candado] };
}
for (const [file, nombre, candado] of CASOS) {
  const sin = await correr(file, nombre, candado, () => new Promise(() => {}));
  t(nombre + ' sin señal: avisa que quedó guardado', sin.dichos.some((d) => /Sin señal ahora: .*quedó guardad/.test(d)), JSON.stringify(sin));
  t(nombre + ' sin señal: el botón queda libre', sin.candado === false);
  const con = await correr(file, nombre, candado, () => Promise.resolve({ id: 'x' }));
  t(nombre + ' con señal: mensaje de siempre', con.dichos.length > 0 && !con.dichos.some((d) => /Sin señal/.test(d)), JSON.stringify(con));
  const mal = await correr(file, nombre, candado, () => Promise.reject(Object.assign(new Error('permission-denied'), { code: 'permission-denied' })));
  t(nombre + ' si Firestore rechaza: avisa el error', mal.avisos.length > 0 && mal.candado === false, JSON.stringify(mal));
}
console.log(`  publicar-sin-senal.test.mjs: ${ok} OK` + (fail ? `, ${fail} FALLA(S)` : ''));
process.exit(fail ? 1 : 0);
