// El listener de ciclistas cercanos (subscribeToUsers) es el más caro de la app: se
// re-dispara con cada movimiento de CUALQUIER ciclista visible, multiplicado por cuánta
// gente lo tiene abierto. Con la app en segundo plano (pantalla apagada, otra pestaña) nadie
// está mirando esos puntos — pagar esas lecturas ahí es puro desperdicio.
// Este test prueba el COMPORTAMIENTO real: al ocultarse el documento se desuscribe, al
// volver a mostrarse se re-suscribe — pero SOLO si de verdad había algo activo.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// subscribeToUsers/_rtdSubscribeToUsers viven en suscripcion-perezosa-rtd.js, y
// _renderMainMapUsers/_renderNavMapUsers en ciclistas-mapa-clustering.js, desde que
// se separaron de index.html (2026-09).
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = ['index.html', 'ciclistas-mapa-clustering.js', 'suscripcion-perezosa-rtd.js']
  .map((f) => readFileSync(join(raiz, f), 'utf8')).join('\n');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

function bloqueLlaves(desde) {
  const i = HTML.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré -> ' + desde); process.exit(1); }
  let prof = 0, q = null;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) {
    const c = HTML[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && HTML[k + 1] === '/') { k = HTML.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return HTML.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear llaves -> ' + desde); process.exit(1);
}
// document.addEventListener('visibilitychange', function(){ ... }); -- balancea PARÉNTESIS,
// no llaves, porque lo que nos interesa es la llamada completa, paréntesis de cierre incluido.
function bloqueParentesis(desde) {
  const i = HTML.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré -> ' + desde); process.exit(1); }
  let prof = 0, q = null;
  for (let k = HTML.indexOf('(', i); k < HTML.length; k++) {
    const c = HTML[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && HTML[k + 1] === '/') { k = HTML.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '(') prof++;
    else if (c === ')' && --prof === 0) return HTML.slice(i, k + 2); // +2: incluye el ';' final
  }
  console.log('  FALLA: no pude balancear paréntesis -> ' + desde); process.exit(1);
}

const SRC = "var ulp=null, ghostMode=false, cu=null;\n" +
  bloqueLlaves('function _rtdSubscribeToUsers(callback)') + '\n' +
  bloqueLlaves('function subscribeToUsers()') + '\n' +
  "var _lpUsersPausadoPorFondo = false;\n" +
  bloqueParentesis("document.addEventListener('visibilitychange'");

// new Function no tiene closure sobre el scope externo: los contadores y el registro de
// listeners se pasan COMO PARÁMETROS, no se capturan de afuera.
// El mock de rtdb solo necesita distinguir "hay un listener .on() activo" de "no hay" —
// no simula datos reales, eso ya lo prueba mapa-cache-compartida y compañía.
function montar() {
  const listeners = {};
  const registro = { activo: false };
  const document = { hidden: false, addEventListener: (ev, f) => { listeners[ev] = f; } };
  function refPos() {
    return {
      orderByChild: () => refPos(),
      limitToLast: () => refPos(),
      on: () => { registro.activo = true; },
      off: () => { registro.activo = false; },
    };
  }
  const rtdb = { ref: () => refPos() };
  const fn = new Function('document', 'rtdb', '_renderMainMapUsers', '_navMapUsersActive', '_renderNavMapUsers',
    SRC + '\nreturn {subscribeToUsers:(typeof subscribeToUsers==="function"?subscribeToUsers:null), getUlp:()=>ulp, setGhost:(v)=>{ghostMode=v;}};');
  const api = fn(document, rtdb, () => {}, false, () => {});
  return {
    subscribeToUsers: api.subscribeToUsers,
    getUlp: api.getUlp,
    setGhost: api.setGhost,
    disparar: (ev) => listeners[ev](),
    activos: () => (registro.activo ? 1 : 0),
    document,
  };
}

// ---- 1) Flujo completo: activo -> se oculta -> se desuscribe -> vuelve -> se re-suscribe ----
{
  const api = montar();
  api.subscribeToUsers();
  debe('el mapa arranca suscrito', api.activos() === 1 && api.getUlp() !== null);

  api.document.hidden = true;
  api.disparar('visibilitychange');
  debe('al ocultarse la app, se desuscribe', api.activos() === 0);
  debe('ulp queda en null (no colgado)', api.getUlp() === null);

  api.document.hidden = false;
  api.disparar('visibilitychange');
  debe('al volver a mostrarse, se re-suscribe SOLO porque estaba activo antes', api.activos() === 1);
}

// ---- 2) Si el mapa NUNCA se abrió, ocultar/mostrar la app no hace nada raro ----
{
  const api = montar();
  api.document.hidden = true;
  api.disparar('visibilitychange');
  api.document.hidden = false;
  api.disparar('visibilitychange');
  debe('sin haber abierto el mapa nunca, no se suscribe nada de la nada', api.activos() === 0);
}

// ---- 3) En modo fantasma, al volver de segundo plano NO se re-suscribe ----
{
  const api = montar();
  api.subscribeToUsers();
  api.document.hidden = true;
  api.disparar('visibilitychange'); // se pausa
  api.setGhost(true);               // el usuario activa modo fantasma mientras la app estaba en fondo
  api.document.hidden = false;
  api.disparar('visibilitychange');
  debe('modo fantasma activo: no se re-suscribe al volver del fondo', api.activos() === 0);
}

console.log(`\n${ok} ok, ${fail} fallas — pausa-en-fondo.test.mjs`);
if (fail > 0) process.exit(1);
