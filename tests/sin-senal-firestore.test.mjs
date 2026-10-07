// Sin señal, Firestore no responde nunca a set()/add() (la promesa espera al servidor). Revisión de botones 2026-10-07:
// "Enviar" reseña quedaba congelado y "Compartir ubicación en vivo" no mostraba nada. Ahora, tope de 8 s y aviso honesto.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };
function bloque(src, desde) {
  const i = src.indexOf(desde); if (i < 0) throw new Error('no está: ' + desde);
  let prof = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') prof++; else if (src[k] === '}' && --prof === 0) return src.slice(i, k + 1); }
}
// reloj virtual
function reloj() { let ahora = 0; const ts = []; return { setTimeout: (f, ms) => { ts.push({ at: ahora + ms, f }); return ts.length; }, async avanzar(ms) { const fin = ahora + ms; for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); for (;;) { ts.sort((a, b) => a.at - b.at); const x = ts[0]; if (!x || x.at > fin) break; ts.shift(); ahora = x.at; x.f(); await new Promise((r) => setImmediate(r)); } ahora = fin; await new Promise((r) => setImmediate(r)); } }; }
const nunca = () => new Promise(() => {});

// --- reseña ---
{
  const R = readFileSync(join(raiz, 'resena-app.js'), 'utf8');
  for (const [nombre, add, esperado] of [['sin señal', nunca, /no hay señal.*se envía sola/], ['con señal', () => Promise.resolve({}), /Gracias por tu opinión/]]) {
    const rl = reloj(), dichos = [], avisos = [];
    const ctx = { setTimeout: rl.setTimeout, Promise, h: (x) => dichos.push(x), lpAviso: (x) => avisos.push(x), cu: 'u1', nombreUsuario: 'Ana', window: {},
      document: { getElementById: (id) => (id === 'resenaComentario' ? { value: ' hola ' } : null) },
      db: { collection: () => ({ add }) }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 0 } } } };
    vm.createContext(ctx);
    vm.runInContext(R, ctx);
    vm.runInContext('_resenaEstrellas=4; enviarResenaApp();', ctx);
    await rl.avanzar(8100);
    t('reseña ' + nombre + ': dice ' + esperado, esperado.test(dichos.join(' ')));
    t('reseña ' + nombre + ': el botón queda libre', vm.runInContext('_enviandoResena', ctx) === false);
  }
}
// --- ubicación en vivo ---
{
  const S = readFileSync(join(raiz, 'seguridad-sensores.js'), 'utf8');
  const fn = bloque(S, 'async function toggleSeguimientoVivo(');
  for (const [nombre, set, sinSenal] of [['sin señal', nunca, true], ['con señal', () => Promise.resolve(), false]]) {
    const rl = reloj(), avisos = [], escrituras = []; let link = null;
    const ctx = { setTimeout: rl.setTimeout, Promise, Date, Math, cu: 'u1', nombreUsuario: 'Ana', us: { la: -40, lo: -72 }, currentUserLocation: null, actividadTipo: 'ciclismo',
      liveTrackActivo: false, liveTrackId: null, liveTrackUltimoEnvio: 0, window: { lpUID: 'x' }, location: { origin: 'https://librepedal.cl', pathname: '/' },
      lpAviso: (x) => avisos.push(x), h() {}, _actualizarBtnSeguimientoVivo() {}, mostrarLinkSeguimientoVivo: (u) => { link = u; },
      db: { collection: () => ({ doc: () => ({ set: (d) => { escrituras.push(['set', d.activo]); return set(); }, update: (d) => { escrituras.push(['update', d.activo]); return Promise.resolve(); } }) }) },
      firebase: { firestore: { FieldValue: { serverTimestamp: () => 0 } } } };
    vm.createContext(ctx);
    vm.runInContext('var liveTrackActivo=false, liveTrackId=null, liveTrackUltimoEnvio=0;\n' + fn + '\ntoggleSeguimientoVivo();', ctx);
    await rl.avanzar(8100);
    if (sinSenal) {
      t('en vivo sin señal: avisa', avisos.some((a) => /Sin señal/.test(a)));
      t('en vivo sin señal: no queda activo ni muestra link', vm.runInContext('liveTrackActivo', ctx) === false && link === null);
      t('en vivo sin señal: anula lo pendiente (activo:false después del set)', JSON.stringify(escrituras) === JSON.stringify([['set', true], ['update', false]]));
    } else {
      t('en vivo con señal: muestra el link', /seguir\.html\?id=/.test(link || '') && vm.runInContext('liveTrackActivo', ctx) === true && !avisos.length);
    }
  }
}
console.log(`  sin-senal-firestore.test.mjs: ${ok} OK` + (fail ? `, ${fail} FALLA(S)` : ''));
process.exit(fail ? 1 : 0);
