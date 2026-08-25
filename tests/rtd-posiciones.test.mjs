// Posición en vivo movida a Realtime Database (2026-08-25): era el mayor consumidor
// recurrente de lecturas de Firestore (subscribeToUsers se re-dispara con cada movimiento
// de CUALQUIER ciclista visible, multiplicado por cuánta gente lo tiene abierto). RTD tiene
// cuota TOTALMENTE separada (datos transferidos, no lecturas), así que sacar esto de
// Firestore libera la mayor parte de la cuota compartida para todo lo demás.
// Se prueba el COMPORTAMIENTO real: qué se escribe, qué se borra, cómo se transforma lo que
// llega de RTD para que _renderMainMapUsers/_renderNavMapUsers (que esperan la forma de un
// snapshot de Firestore) no necesiten cambiar ni una línea.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

function bloque(desde) {
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
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

const SRC = bloque('function _rtdPublicarPosicion(lat, lon)') + '\n' +
  bloque('function _rtdOcultarPosicion()') + '\n' +
  bloque('function _rtdSubscribeToUsers(callback)');

// Mock de rtdb que registra cada operación con la ruta exacta y la cadena de métodos usada.
// orderByChild/limitToLast devuelven EL MISMO objeto (self), no uno nuevo: así toda la
// cadena .ref(x).orderByChild(y).limitToLast(z).on(...) opera sobre el objeto que queda
// cacheado en refs[path], y el test puede disparar su _handler después.
function montar(opts = {}) {
  // 'in' distingue "pasado explícitamente como undefined" de "no pasado" -- un
  // destructuring con default normal pisaría el undefined explícito del caso 3.
  const cuActual = 'cuActual' in opts ? opts.cuActual : 'inty123';
  const nombreUsuario = 'nombreUsuario' in opts ? opts.nombreUsuario : 'Inty';
  const selectedSkin = 'selectedSkin' in opts ? opts.selectedSkin : 'azul';
  const selectedHelmet = 'selectedHelmet' in opts ? opts.selectedHelmet : 'giro';

  const llamadas = { sets: [], removes: [], cadenaLectura: [] };
  function ref(path) {
    const self = {
      path,
      set: (data) => { llamadas.sets.push({ path, data }); return Promise.resolve(); },
      remove: () => { llamadas.removes.push({ path }); return Promise.resolve(); },
      orderByChild: (campo) => { llamadas.cadenaLectura.push('orderByChild(' + campo + ')'); return self; },
      limitToLast: (n) => { llamadas.cadenaLectura.push('limitToLast(' + n + ')'); return self; },
      on: (evento, handler, errHandler) => { self._handler = handler; self._err = errHandler; },
      off: () => { self._handler = null; },
    };
    return self;
  }
  const refs = {};
  const rtdb = { ref: (path) => { if (!refs[path]) refs[path] = ref(path); return refs[path]; } };
  const fn = new Function('rtdb', 'cu', 'nombreUsuario', 'selectedSkin', 'selectedHelmet',
    SRC + '\nreturn {_rtdPublicarPosicion, _rtdOcultarPosicion, _rtdSubscribeToUsers};');
  const api = fn(rtdb, cuActual, nombreUsuario, selectedSkin, selectedHelmet);
  return { api, llamadas, refs };
}

// ---- 1) Publicar posición: escribe TODO lo que el marcador necesita para pintarse ----
{
  const { api, llamadas } = montar();
  api._rtdPublicarPosicion(-33.45, -70.66);
  debe('escribió exactamente una vez', llamadas.sets.length === 1);
  const s = llamadas.sets[0];
  debe('en la ruta del propio usuario', s.path === 'posiciones/inty123');
  debe('lat/lon correctos', s.data.lat === -33.45 && s.data.lon === -70.66);
  debe('visible:true', s.data.visible === true);
  debe('trae timestamp numérico (Date.now(), no un objeto)', typeof s.data.ts === 'number' && s.data.ts > 0);
  debe('trae nombre/skin/helmet para pintar el marcador sin ir a buscar más', s.data.nombre === 'Inty' && s.data.skin === 'azul' && s.data.helmet === 'giro');
}

// ---- 2) Sin usuario logueado, no escribe nada (no revienta con cu=null) ----
{
  const { api, llamadas } = montar({ cuActual: null });
  api._rtdPublicarPosicion(-33, -70);
  debe('sin cu, no se escribe nada', llamadas.sets.length === 0);
}

// ---- 3) Valores por defecto si nombre/skin/helmet no están definidos todavía ----
{
  const { api, llamadas } = montar({ nombreUsuario: undefined, selectedSkin: undefined, selectedHelmet: undefined });
  api._rtdPublicarPosicion(1, 2);
  const s = llamadas.sets[0];
  debe('nombre cae a "Ciclista" si no hay nombreUsuario (RTD rechaza undefined)', s.data.nombre === 'Ciclista');
  debe('skin/helmet caen a string vacío, nunca undefined', s.data.skin === '' && s.data.helmet === '');
}

// ---- 4) Ocultar posición: BORRA el nodo, no lo deja con visible:false colgado ----
{
  const { api, llamadas } = montar();
  api._rtdOcultarPosicion();
  debe('llamó a remove(), no a set()', llamadas.removes.length === 1 && llamadas.sets.length === 0);
  debe('en la ruta del propio usuario', llamadas.removes[0].path === 'posiciones/inty123');
}

// ---- 5) Sin usuario logueado, ocultar tampoco hace nada ----
{
  const { api, llamadas } = montar({ cuActual: null });
  api._rtdOcultarPosicion();
  debe('sin cu, no se borra nada', llamadas.removes.length === 0);
}

// ---- 6) Suscripción: pide ordenado por ts, limitado a 150 (mismo tope que tenía Firestore) ----
{
  const { api, llamadas, refs } = montar();
  api._rtdSubscribeToUsers(() => {});
  debe('lee de la ruta compartida "posiciones"', 'posiciones' in refs);
  debe('ordena por ts', llamadas.cadenaLectura.includes('orderByChild(ts)'));
  debe('tope de 150, igual que el subscribeToUsers de Firestore que reemplaza', llamadas.cadenaLectura.includes('limitToLast(150)'));
}

// ---- 7) Transforma {uid:data} en [{id,data()}] -- la forma que espera _renderMainMapUsers ----
{
  const { api, refs } = montar();
  let recibido = null;
  api._rtdSubscribeToUsers((docs) => { recibido = docs; });
  const ref = refs['posiciones'];
  ref._handler({ val: () => ({ inty123: { lat: 1, lon: 2, nombre: 'Inty' }, otro456: { lat: 3, lon: 4, nombre: 'Otro' } }) });

  debe('devuelve un array (no un objeto suelto)', Array.isArray(recibido));
  debe('un elemento por cada uid', recibido.length === 2);
  const mio = recibido.find((d) => d.id === 'inty123');
  debe('cada elemento trae .id = el uid', !!mio);
  debe('cada elemento trae .data() como función, igual que Firestore', typeof mio.data === 'function');
  debe('data() devuelve los datos reales de ese uid', mio.data().lat === 1 && mio.data().nombre === 'Inty');
}

// ---- 8) Snapshot vacío (nadie visible todavía): no revienta, entrega array vacío ----
{
  const { api, refs } = montar();
  let recibido = 'sin-llamar';
  api._rtdSubscribeToUsers((docs) => { recibido = docs; });
  refs['posiciones']._handler({ val: () => null });
  debe('con RTD vacío, entrega [] en vez de reventar', Array.isArray(recibido) && recibido.length === 0);
}

// ---- 9) El unsub que devuelve corta la escucha (off), no queda colgado para siempre ----
{
  const { api, refs } = montar();
  const unsub = api._rtdSubscribeToUsers(() => {});
  const ref = refs['posiciones'];
  debe('quedó un handler activo tras suscribirse', ref._handler !== null && ref._handler !== undefined);
  unsub();
  debe('unsub() apaga el handler (off)', ref._handler === null);
}

console.log(`\n${ok} ok, ${fail} fallas — rtd-posiciones.test.mjs`);
if (fail > 0) process.exit(1);
