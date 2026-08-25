// Caché del mapa: ESTÁTICO (OSM) → COMPARTIDO (Capone) → Firestore. Se prueba el
// COMPORTAMIENTO con el código real.
//
// Por qué existe: un teléfono sin caché local (instalación nueva, o caché vencida a los 7
// días) le pedía a Firestore la colección `recommendations` completa (~4.000 documentos).
// Con 51 testers eso agotó la cuota gratis dos veces la misma noche del 2026-08-24.
// Primer arreglo (24-ago): caché compartida vía Capone. Segundo arreglo (25-ago): de esos
// 4.029 puntos, 4.028 son sembrados de OpenStreetMap y casi no cambian — ahora viven
// EMPAQUETADOS con la app en puntos-osm.json, mismo origen, cero red externa. Capone queda
// de respaldo solo si el archivo estático falla; Firestore queda de último respaldo si
// ambos fallan. El mapa NUNCA debe quedar peor que antes de cualquiera de estos cambios.
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

const CONSTS = ['MAPPOINTS_CACHE_KEY', 'MAPPOINTS_REFRESCO_TOTAL_MS', 'MAPPOINTS_CACHE_MAX', 'MAPPOINTS_CACHE_MAX_BYTES']
  .map((n) => {
    const m = HTML.match(new RegExp('const ' + n + '\\s*=\\s*([^;]+);'));
    if (!m) { console.log('  FALLA: falta la constante ' + n); process.exit(1); }
    return 'const ' + n + ' = ' + m[1] + ';';
  }).join('\n');

const URL_M = HTML.match(/const MAPA_CACHE_COMPARTIDO_URL\s*=\s*([^;]+);/);
if (!URL_M) { console.log('  FALLA: falta MAPA_CACHE_COMPARTIDO_URL'); process.exit(1); }

const SRC = CONSTS + '\nconst MAPA_CACHE_COMPARTIDO_URL = ' + URL_M[1] + ';\n' +
  bloque('function _mapPointNube(') + '\n' +
  bloque('function _mapPointsCacheGuardar()') + '\n' +
  bloque('function _mapPointsCacheLeer()') + '\n' +
  bloque('function _mapPointsSemillaEstatica(') + '\n' +
  bloque('function _mapPointsSemillaCompartida(') + '\n' +
  bloque('function subscribeToMapPoints()');

function crearDbMock(registro) {
  function hacerQuery(filtros) {
    return {
      where: (campo, op, valor) => hacerQuery(filtros.concat([[campo, op, valor]])),
      onSnapshot: (aplicar, err) => {
        registro.suscripciones.push({ filtros, aplicar, err });
        return () => { registro.unsubLlamado = true; };
      },
    };
  }
  return { collection: (nombre) => { registro.colecciones.push(nombre); return hacerQuery([]); } };
}

// fetchPorUrl: { estatico: respuesta|fn, compartido: respuesta|fn } — cada entrada puede ser
// una respuesta fija o una función async(url) para casos con timing/errores.
function montar({ fetchPorUrl = {}, setTimeoutImpl, clearTimeoutImpl } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const registro = { colecciones: [], suscripciones: [], unsubLlamado: false, renders: 0, llamadasEstatico: 0, llamadasCompartido: 0 };
  const db = crearDbMock(registro);
  const firebase = { firestore: { Timestamp: { fromMillis: (ms) => ({ __ts: ms }) } } };
  const CATEGORIAS_AVISO = { agua: true, mirador: true };
  const fetchImpl = async (url) => {
    const esEstatico = url === 'puntos-osm.json';
    if (esEstatico) registro.llamadasEstatico++; else registro.llamadasCompartido++;
    const resp = esEstatico ? fetchPorUrl.estatico : fetchPorUrl.compartido;
    if (typeof resp === 'function') return resp(url);
    if (resp === undefined) return { ok: false }; // por defecto, sin mock: falla limpio
    return resp;
  };
  const fn = new Function(
    'localStorage', 'fetch', 'setTimeout', 'clearTimeout', 'db', 'firebase', 'mp', 'CATEGORIAS_AVISO',
    '_renderizarPuntosVisiblesThrottled', '_renderizarPuntosVisibles', '_mapPointsAplicar',
    'let mapPointsData=[], puntosAvisoRelevantes=[], pointsUnsub=null;\n' + SRC +
    '\nreturn { subscribeToMapPoints, semillaEstatica:_mapPointsSemillaEstatica, semillaCompartida:_mapPointsSemillaCompartida,' +
    ' getMapPointsData:()=>mapPointsData, getPointsUnsub:()=>pointsUnsub };'
  );
  const api = fn(
    localStorage, fetchImpl, setTimeoutImpl || setTimeout, clearTimeoutImpl || clearTimeout,
    db, firebase, null, CATEGORIAS_AVISO,
    () => {}, () => { registro.renders++; }, () => {}
  );
  return { api, store, registro };
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const puntoNube = (i) => ({ id: 'p' + i, lat: -33, lon: -71, cat: 'agua', user: 'osm-data', title: 'P' + i, desc: '', tsMs: 1000 + i });
const okJson = (obj) => ({ ok: true, json: async () => obj });

// ---- 1) Sin caché local, el archivo ESTÁTICO responde bien: siembra desde ahí, ni toca Capone ----
{
  const puntos = [puntoNube(1), puntoNube(2), puntoNube(3)];
  const { api, registro, store } = montar({ fetchPorUrl: { estatico: okJson({ puntos }) } });
  api.subscribeToMapPoints();
  await espera(20);
  debe('pide el archivo estático primero', registro.llamadasEstatico === 1);
  debe('nunca llama a la caché compartida de Capone si el estático funcionó', registro.llamadasCompartido === 0);
  debe('terminó suscrito a recommendations (una sola vez)', registro.colecciones.filter((c) => c === 'recommendations').length === 1);
  debe('la suscripción final es INCREMENTAL (trae filtro ts>), no la colección entera',
       registro.suscripciones.length === 1 && registro.suscripciones[0].filtros.length === 1 &&
       registro.suscripciones[0].filtros[0][0] === 'ts');
  debe('mapPointsData quedó sembrado con los puntos del estático', api.getMapPointsData().length === 3);
  debe('la caché local quedó escrita (sembrada) para la próxima apertura', store.has('lp_mappoints_v1'));
  debe('quedó con un unsub real (no colgado en el placeholder)', typeof api.getPointsUnsub() === 'function');
}

// ---- 2) Estático falla (404, sin ese archivo en el build), Capone responde bien: siembra desde Capone ----
{
  const puntos = [puntoNube(1)];
  const { api, registro } = montar({ fetchPorUrl: { estatico: { ok: false }, compartido: okJson({ puntos }) } });
  api.subscribeToMapPoints();
  await espera(20);
  debe('intentó el estático primero', registro.llamadasEstatico === 1);
  debe('cayó a Capone porque el estático falló', registro.llamadasCompartido === 1);
  debe('terminó incremental con los datos de Capone', api.getMapPointsData().length === 1 &&
       registro.suscripciones[0].filtros.length === 1);
}

// ---- 3) Estático Y Capone fallan: NUNCA peor que antes de cualquiera de los dos cambios — full read ----
{
  const { api, registro } = montar({ fetchPorUrl: { estatico: { ok: false }, compartido: { ok: false } } });
  api.subscribeToMapPoints();
  await espera(20);
  debe('probó los dos respaldos', registro.llamadasEstatico === 1 && registro.llamadasCompartido === 1);
  debe('cae al camino original: se suscribe a recommendations SIN filtro (full read)',
       registro.colecciones.includes('recommendations') &&
       registro.suscripciones.length === 1 && registro.suscripciones[0].filtros.length === 0);
}

// ---- 4) Estático con error de red (throw): se comporta igual que un ok:false, prueba con Capone ----
{
  const { api, registro } = montar({ fetchPorUrl: { estatico: async () => { throw new Error('sin red'); }, compartido: okJson({ puntos: [puntoNube(1)] }) } });
  api.subscribeToMapPoints();
  await espera(20);
  debe('un throw en el estático no tumba nada, cae a Capone', registro.llamadasCompartido === 1);
  debe('y Capone lo resuelve bien', api.getMapPointsData().length === 1);
}

// ---- 5) Si YA hay caché local, no se intenta NINGÚN respaldo (ni estático ni Capone) ----
{
  const { api, store, registro } = montar({ fetchPorUrl: { estatico: okJson({ puntos: [] }), compartido: okJson({ puntos: [] }) } });
  store.set('lp_mappoints_v1', JSON.stringify({ ultimaSync: Date.now(), maxTs: 5000, puntos: [puntoNube(9)] }));
  api.subscribeToMapPoints();
  await espera(20);
  debe('con caché local vigente, no llama al estático', registro.llamadasEstatico === 0);
  debe('ni a la caché compartida', registro.llamadasCompartido === 0);
  debe('usa directo la incremental de siempre', registro.suscripciones[0].filtros.length === 1);
}

// ---- 6) Reentrada: llamar dos veces mientras el fetch está pendiente no duplica nada ----
{
  const { api, registro } = montar({
    fetchPorUrl: { estatico: async () => { await espera(15); return okJson({ puntos: [puntoNube(1)] }); } },
  });
  api.subscribeToMapPoints();
  api.subscribeToMapPoints(); // en pleno vuelo del fetch de arriba
  await espera(40);
  debe('el fetch al estático se pide UNA sola vez, no dos', registro.llamadasEstatico === 1);
  debe('y termina con una sola suscripción a recommendations', registro.suscripciones.length === 1);
}

// ---- 7) El respaldo de Capone (probado a fondo antes) sigue teniendo su propio timeout de 4s ----
{
  let venció;
  const { api, registro } = montar({
    fetchPorUrl: {
      estatico: { ok: false },
      compartido: () => new Promise(() => {}), // nunca resuelve
    },
    setTimeoutImpl: (fn, ms) => { venció = ms; fn(); return 1; }, // dispara el vencimiento YA
    clearTimeoutImpl: () => {},
  });
  api.subscribeToMapPoints();
  await espera(20);
  debe('el plazo de espera de Capone es razonable (unos segundos, no minutos)', venció >= 1000 && venció <= 10000);
  debe('vencido el plazo, sigue con el full read de siempre', registro.suscripciones[0].filtros.length === 0);
}

console.log(`\n${ok} ok, ${fail} fallas — mapa-cache-compartida.test.mjs`);
if (fail > 0) process.exit(1);
