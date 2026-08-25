// Blindaje de Firestore: se prueba el COMPORTAMIENTO, no que el texto esté escrito.
// Se extrae el bloque real del index.html y se corre contra un SDK falso que imita la
// forma del compat 9.22 (Query / CollectionReference / DocumentReference).
//
// Por qué existe: la cuota gratis de Firestore se agotó y la app quedó sin base de datos
// para los 51 testers... y nadie se enteró, porque hay 278 `catch(e){}` silenciosos y solo
// 14 reportan a Sentry. Se descubrió sondeando la API con curl. El blindaje intercepta en
// UN punto (el prototipo del SDK) antes de que el error llegue a esos catch.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

// --- recortar el bloque real ---
const INI = '/* ===== BLINDAJE DE FIRESTORE (2026-08-23) ===== */'.replace(' */', '');
const i = HTML.indexOf('var lpFirestoreEstado =');
const j = HTML.indexOf('})();', HTML.indexOf('_instalarBlindajeFirestore'));
if (i < 0 || j < 0) { console.log('  FALLA: no encontré el bloque del blindaje en index.html'); process.exit(1); }
const SRC = HTML.slice(i, j + 5);
debe('el bloque del blindaje se pudo extraer', SRC.includes('_instalarBlindajeFirestore'));

// --- SDK falso, con la forma del compat 9.22 ---
function montarEntorno({ getFalla = null, snapSize = 0 } = {}) {
  function Query() {}
  Query.prototype.get = function () {
    return getFalla ? Promise.reject(getFalla) : Promise.resolve({ size: snapSize });
  };
  Query.prototype.onSnapshot = function (...args) { this._args = args; return () => {}; };
  function CollectionReference() {}
  CollectionReference.prototype = Object.create(Query.prototype);
  CollectionReference.prototype.constructor = CollectionReference;
  CollectionReference.prototype.get = Query.prototype.get;
  CollectionReference.prototype.onSnapshot = Query.prototype.onSnapshot;
  function DocumentReference() {}
  DocumentReference.prototype.get = function () {
    return getFalla ? Promise.reject(getFalla) : Promise.resolve({ exists: true });
  };

  const avisos = [], sentry = [];
  const env = {
    firebase: { firestore: { Query, CollectionReference, DocumentReference } },
    console: { table() {}, log() {} },
    lpAviso: (m) => avisos.push(m),
    window: { Sentry: {
      captureException: (e, ctx) => sentry.push({ tipo: 'exception', e, ctx }),
      captureMessage: (m, ctx) => sentry.push({ tipo: 'message', m, ctx }),
    } },
    avisos, sentry, Query, CollectionReference, DocumentReference,
  };
  // El bloque usa `window`, `firebase`, `lpAviso`, `console`. Se inyectan como parámetros.
  const fn = new Function('firebase', 'window', 'lpAviso', 'console',
    SRC + '\nreturn {estado:lpFirestoreEstado, lpLecturas:lpLecturas};');
  env.api = fn(env.firebase, env.window, env.lpAviso, env.console);
  return env;
}

const ERR_CUOTA = Object.assign(new Error('Quota exceeded.'), { code: 'resource-exhausted' });
const ERR_OTRO = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });

// ---- 1) La cuota agotada se detecta, se avisa al usuario y se reporta a Sentry ----
{
  const env = montarEntorno({ getFalla: ERR_CUOTA });
  let relanzo = false;
  await new env.Query().get().catch((e) => { relanzo = (e === ERR_CUOTA); });
  debe('el error SIGUE propagándose (no se cambia el comportamiento existente)', relanzo);
  debe('queda marcada la cuota agotada', env.api.estado.cuotaAgotada === true);
  debe('se le avisa al usuario (si no, solo ve pantallas vacías)', env.avisos.length === 1);
  debe('el aviso NO dice que se perdieron datos', /telefono|teléfono/i.test(env.avisos[0] || ''));
  debe('se reporta a Sentry (para enterarnos sin depender del usuario)', env.sentry.length === 1);
  debe('el reporte va etiquetado como cuota', (env.sentry[0] || {}).ctx?.tags?.motivo === 'cuota-agotada');

  // Segunda falla: no debe spamear al usuario ni a Sentry.
  await new env.Query().get().catch(() => {});
  await new env.DocumentReference().get().catch(() => {});
  debe('avisa UNA sola vez por sesión, aunque falle muchas veces', env.avisos.length === 1);
  debe('reporta a Sentry UNA sola vez', env.sentry.length === 1);
}

// ---- 2) Un error que NO es de cuota no debe disparar la alarma ----
{
  const env = montarEntorno({ getFalla: ERR_OTRO });
  await new env.Query().get().catch(() => {});
  debe('permission-denied NO se confunde con cuota agotada', env.api.estado.cuotaAgotada === false);
  debe('permission-denied no molesta al usuario', env.avisos.length === 0);
}

// ---- 3) El contador de lecturas: sin él no hay forma de medir el costo de una pantalla ----
{
  const env = montarEntorno({ snapSize: 7 });
  await new env.Query().get();
  await new env.Query().get();
  debe('cuenta los documentos de cada get()', env.api.estado.total === 14);

  await new env.DocumentReference().get();
  debe('un documento suelto cuenta como 1', env.api.estado.total === 15);
}

// ---- 4) onSnapshot: cuenta, y le pone manejador de error al que no lo trae ----
{
  const env = montarEntorno();
  const q = new env.Query();
  let recibido = null;
  q.onSnapshot(function (snap) { recibido = snap; });
  debe('a un onSnapshot SIN manejador de error se le inyecta uno', q._args.length === 2 && typeof q._args[1] === 'function');

  q._args[0]({ size: 40 });
  debe('el onNext original sigue recibiendo su snapshot', recibido && recibido.size === 40);
  debe('cuenta los documentos que entrega el listener', env.api.estado.total === 40);

  q._args[1](ERR_CUOTA);
  debe('el manejador inyectado detecta la cuota agotada', env.api.estado.cuotaAgotada === true);
}

// ---- 5) onSnapshot con manejador propio: se respeta, no se pisa ----
{
  const env = montarEntorno();
  const q = new env.Query();
  let mio = null;
  q.onSnapshot(function () {}, function (e) { mio = e; });
  debe('no se agregan argumentos de más si ya traía manejador', q._args.length === 2);
  q._args[1](ERR_CUOTA);
  debe('el manejador propio SIGUE recibiendo el error', mio === ERR_CUOTA);
  debe('y el blindaje igual lo registra', env.api.estado.cuotaAgotada === true);
}

// ---- 7) Modo ahorro: el tope de SESION protege contra un bug real sin limitar uso normal ----
{
  const env = montarEntorno({ snapSize: 100 });
  for (let i = 0; i < 8; i++) await new env.Query().get(); // 800 documentos, justo en el tope
  debe('con 800 (el tope) el modo ahorro NO se activa todavía (es ">" estricto)', env.api.estado.modoAhorro === false);
  await new env.Query().get(); // 900: ahora sí lo cruza
  debe('al superar el tope se activa el modo ahorro', env.api.estado.modoAhorro === true);
  debe('se avisa al usuario UNA vez', env.avisos.filter((a) => /usó más datos/.test(a)).length === 1);
  debe('se reporta a Sentry como mensaje (no hay excepción real que capturar)',
       env.sentry.some((s) => s.tipo === 'message' && /modo-ahorro/.test(s.m || '')));

  // No debe spamear: seguir leyendo no dispara un segundo aviso.
  await new env.Query().get();
  debe('el aviso de modo ahorro no se repite', env.avisos.filter((a) => /usó más datos/.test(a)).length === 1);
}

// ---- 7b) Con modo ahorro activo, un listener NUEVO a una colección no esencial no se abre ----
{
  const env = montarEntorno({ snapSize: 900 });
  await new env.Query().get(); // activa el modo ahorro
  debe('modo ahorro activo', env.api.estado.modoAhorro === true);

  const antes = env.api.estado.total;
  const q = new env.Query();
  const unsub = q.onSnapshot(function () {}, function () {});
  debe('NO llega a suscribirse de verdad (el mock nunca guarda _args)', q._args === undefined);
  debe('devuelve igual una función de unsub (nadie revienta al llamarla)', typeof unsub === 'function');
  unsub(); // no debe tirar

  debe('no sumó lecturas: nunca se disparó ningún snapshot', env.api.estado.total === antes);
}

// ---- 7c) Con modo ahorro activo, sosAlertas es la EXCEPCIÓN: sigue funcionando ----
{
  const env = montarEntorno({ snapSize: 900 });
  await new env.Query().get(); // activa el modo ahorro

  const q = new env.Query();
  q.path = 'sosAlertas'; // el extractor nombreDe() mira ref.path si no hay _query
  const before = env.api.estado.total;
  q.onSnapshot(function (snap) {});
  debe('sosAlertas SÍ llega a suscribirse (seguridad, nunca se pausa)', q._args !== undefined);
}

// ---- 7d) Un listener que YA estaba abierto ANTES del modo ahorro sigue vivo ----
{
  const env = montarEntorno({ snapSize: 10 });
  const q = new env.Query();
  let recibido = 0;
  q.onSnapshot(function (snap) { recibido++; });
  debe('el listener se abrió normal, antes del modo ahorro', q._args !== undefined);

  for (let i = 0; i < 90; i++) await new env.Query().get(); // 900 documentos: activa el modo ahorro
  debe('modo ahorro ya activo', env.api.estado.modoAhorro === true);

  q._args[0]({ size: 3 }); // el listener viejo sigue entregando datos
  debe('un listener ya abierto ANTES del modo ahorro sigue recibiendo actualizaciones', recibido === 1);
}

// ---- 8) Nada de esto puede tumbar la app si el SDK cambia de forma ----
{
  let reventó = false;
  try {
    const fn = new Function('firebase', 'window', 'lpAviso', 'console', SRC);
    fn({}, { Sentry: null }, () => {}, { table() {}, log() {} }); // firestore inexistente
  } catch (e) { reventó = true; }
  debe('si el SDK no tiene la forma esperada, no revienta: simplemente no se instala', !reventó);
}

console.log('  blindaje-firestore.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
