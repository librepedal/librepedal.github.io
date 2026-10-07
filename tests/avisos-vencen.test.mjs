// Inty 2026-10-07: "hay avisos en el mapa que están como de adorno, no avisan nada" y "si había un aviso de policía y
// no está, ¿cómo doy aviso para que desaparezca?". Decidió: (1) un peligro desaparece del mapa cuando vence (desde el
// último "sigue ahí"); (2) UN "ya no está" lo quita para todos; (3) al pasar un peligro, "¿Sigue ahí?" con dos botones.
// Se corre el reportes.js real con un mapa, un DOM y un Firestore de mentira.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

const marcadores = [], votos = [], elems = {};
function elemento(id) {
  const e = { id, innerHTML: '', style: { setProperty() {} }, _cls: new Set(), offsetWidth: 1, onclick: null, botones: {},
    classList: { add: (c) => e._cls.add(c), remove: (c) => e._cls.delete(c), contains: (c) => e._cls.has(c) },
    setAttribute() {}, querySelector: (s) => (e.botones[s] = e.botones[s] || { onclick: null }) };
  return e;
}
const ctx = {
  console, Math, JSON, Object, Array, String, Number, RegExp, Set, Promise, isFinite, Date,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  window: { lpUID: 'yo' }, cu: 'yo', vozActiva: false, vozCola: [], vozOcupada: () => false, actividadTipo: 'ciclismo',
  h() {}, mostrarBocadillo() {}, lpAviso() {}, au() {}, _ganarDarma() {}, escapeHTML: (s) => String(s),
  _esCiclistaConfiable: () => true, LP_KM_CONFIANZA: 10,
  calculateDistance: (a, b, c, d) => { const R = 6371000, r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r; return Math.sqrt(x * x + y * y) * R; },
  mp: { removeLayer() {}, closePopup() {} }, _escalaVisibleKm: () => 5, lpBadgeHTML: () => '<i></i>',
  mlMarker: (ll) => { const m = { ll, addTo() { return m; }, bindPopup() { return m; } }; marcadores.push(m); return m; },
  document: { getElementById: (id) => elems[id] || null, createElement: () => elemento('lpRepSigue'), body: { appendChild: (e) => { elems[e.id] = e; } } },
  db: { collection: () => ({ doc: (id) => ({ update: (u) => { votos.push([id, Object.keys(u).join('+')]); return Promise.resolve(); } }) }) },
  firebase: { firestore: { FieldValue: { arrayUnion: (x) => x, serverTimestamp: () => 'ts' } } },
};
vm.createContext(ctx);
vm.runInContext(readFileSync(join(raiz, 'reportes.js'), 'utf8') + '\n;this.__T={get data(){return reportesData;},set data(v){reportesData=v;},get rel(){return reportesAvisoRelevantes;},render:renderReporteMarkers,revisar:_repRevisarVencidos};', ctx, { filename: 'reportes.js' });
const T = ctx.__T;
ctx.reporteMarkers = []; vm.runInContext('reporteMarkers=[];', ctx);
const hace = (min) => ({ seconds: Math.floor(Date.now() / 1000) - min * 60 });
const P = { lat: -39.814, lon: -73.245 };

// ---------- 1) vencen del mapa ----------
const vis = (r) => vm.runInContext('reporteVisible', ctx)(r);
ok(vis({ cat: 'policia', ts: hace(60) }), 'control policial de hace 1 h: se ve');
ok(!vis({ cat: 'policia', ts: hace(4 * 60) }), 'control policial de hace 4 h: ya no está en el mapa (antes quedaba de adorno)');
ok(vis({ cat: 'policia', ts: hace(5 * 60), lastConfirm: hace(30) }), 'confirmado hace 30 min ("sigue ahí"): vuelve a contar y se ve');
ok(!vis({ cat: 'taco', ts: hace(3 * 60) }) && vis({ cat: 'objeto', ts: hace(24 * 60) }), 'cada peligro vence a su ritmo (taco 2 h, objeto 48 h)');
ok(vis({ cat: 'util', ts: hace(60 * 24 * 300) }) && vis({ cat: 'mirador', ts: hace(60 * 24 * 300) }), 'los puntos útiles y miradores no vencen');
ok(vis({ cat: 'policia' }), 'recién publicado (sin hora del servidor todavía): se ve');
ok(!vis({ cat: 'util', ts: hace(5), desmentidoPor: ['otro'] }), 'UN "ya no está" lo quita para todos');

T.data = [{ id: 'a', cat: 'policia', lat: P.lat, lon: P.lon, ts: hace(60) }, { id: 'b', cat: 'policia', lat: P.lat, lon: P.lon, ts: hace(300) }, { id: 'c', cat: 'util', lat: P.lat, lon: P.lon, ts: hace(99999) }];
marcadores.length = 0; T.revisar(true);
ok(marcadores.length === 2, 'en el mapa: el control vigente y el punto útil, no el vencido (' + marcadores.length + ')');
ok(T.rel.length === 1 && T.rel[0].id === 'a', 'Pistero avisa por voz solo el vigente');

// ---------- 2) "ya no está" desde el mapa: sale al tiro ----------
await vm.runInContext("confirmarReporte('a',false)", ctx);
ok(votos.some((v) => v[0] === 'a' && /desmentidoPor/.test(v[1])), 'se guarda el "ya no está" en Firestore');
marcadores.length = 0; T.render();
ok(marcadores.length === 1 && T.rel.length === 0, 'desaparece del mapa y de los avisos sin esperar al servidor');

// ---------- 3) "¿Sigue ahí?" al pasar ----------
const pasar = (r) => { // se acerca desde 600 m, pasa a 30 m y se aleja 200 m
  for (const dLat of [-0.0054, -0.003, -0.001, -0.00027, 0, 0.0005, 0.0018]) vm.runInContext('avisarReportesCercanos', ctx)(r.lat + dLat, r.lon, 20);
};
const nuevo = (extra) => Object.assign({ id: 'p' + Math.random(), cat: 'policia', lat: P.lat, lon: P.lon, ts: hace(20) }, extra || {});
let r = nuevo(); T.data = [r]; T.revisar(true); delete elems.lpRepSigue; pasar(r);
const card = elems.lpRepSigue;
ok(card && card.classList.contains('on'), 'después de pasar el control aparece "¿Sigue ahí?"');
ok(card && /¿Sigue ahí\?/.test(card.innerHTML) && /Control policial/.test(card.innerHTML), 'dice qué aviso es: ' + (card ? card.innerHTML.slice(0, 120) : ''));
ok(card && /Sigue ahí/.test(card.innerHTML) && /Ya no está/.test(card.innerHTML), 'con los dos botones');
votos.length = 0; card.botones['.rs-no'].onclick(); await new Promise((s) => setImmediate(s));
ok(votos.length === 1 && /desmentidoPor/.test(votos[0][1]) && !card.classList.contains('on'), '"Ya no está" en la tarjeta: vota y se cierra');
card.classList.remove('on'); pasar(r);
ok(!card.classList.contains('on'), 'no vuelve a preguntar por el mismo aviso');

const noPregunta = (extra, ctxExtra, msg) => { const x = nuevo(extra); T.data = [x]; T.revisar(true); Object.assign(ctx, ctxExtra || {}); card.classList.remove('on'); pasar(x); ok(!card.classList.contains('on'), msg); };
noPregunta({ authUid: 'yo' }, null, 'al autor no le pregunta');
noPregunta({ confirmadoPor: ['yo'] }, null, 'a quien ya votó no le pregunta');
noPregunta(null, { _esCiclistaConfiable: () => false }, 'a quien aún no tiene 10 km no le pregunta (su voto no contaría)');
ctx._esCiclistaConfiable = () => true;
const lejos = nuevo(); T.data = [lejos]; T.revisar(true); card.classList.remove('on');
for (const dLon of [-0.006, -0.004, -0.003, -0.004, -0.006]) vm.runInContext('avisarReportesCercanos', ctx)(lejos.lat, lejos.lon + dLon, 20);
ok(!card.classList.contains('on'), 'si pasa lejos (a ~250 m) no pregunta');

console.log(`${n - f} pasaron, ${f} fallaron`);
process.exit(f ? 1 : 0);
