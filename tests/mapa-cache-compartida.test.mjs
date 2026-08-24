// Caché COMPARTIDA del mapa (Capone) — se prueba el COMPORTAMIENTO con el código real.
//
// Por qué existe: un teléfono sin caché local (instalación nueva, o caché vencida a los 7
// días) le pedía a Firestore la colección `recommendations` completa (~4.000 documentos).
// Con 51 testers eso agotó la cuota gratis dos veces la misma noche del 2026-08-24. La
// caché compartida (/api/mapa-librepedal en Capone) hace esa lectura pesada UNA vez para
// todos; este archivo prueba que el teléfono la use bien y, sobre todo, que si esa caché
// falla por lo que sea, el mapa NUNCA quede peor que antes de este cambio (fallback al
// full-read directo a Firestore de siempre).
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

function montar({ fetchImpl, setTimeoutImpl, clearTimeoutImpl } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const registro = { colecciones: [], suscripciones: [], unsubLlamado: false, renders: 0 };
  const db = crearDbMock(registro);
  const firebase = { firestore: { Timestamp: { fromMillis: (ms) => ({ __ts: ms }) } } };
  const CATEGORIAS_AVISO = { agua: true, mirador: true };
  const fn = new Function(
    'localStorage', 'fetch', 'setTimeout', 'clearTimeout', 'db', 'firebase', 'mp', 'CATEGORIAS_AVISO',
    '_renderizarPuntosVisiblesThrottled', '_renderizarPuntosVisibles', '_mapPointsAplicar',
    'let mapPointsData=[], puntosAvisoRelevantes=[], pointsUnsub=null;\n' + SRC +
    '\nreturn { subscribeToMapPoints, semilla:_mapPointsSemillaCompartida,' +
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

// ---- 1) Sin caché local, Capone responde bien: siembra y sigue INCREMENTAL, no full-read ----
{
  const puntos = [puntoNube(1), puntoNube(2), puntoNube(3)];
  const { api, registro, store } = montar({
    fetchImpl: async (url) => {
      debe('pide la URL de la caché compartida', url.includes('mapa-librepedal'));
      return { ok: true, json: async () => ({ puntos }) };
    },
  });
  api.subscribeToMapPoints();
  await espera(20);
  debe('terminó suscrito a recommendations (una sola vez)', registro.colecciones.filter((c) => c === 'recommendations').length === 1);
  debe('la suscripción final es INCREMENTAL (trae filtro ts>), no la colección entera',
       registro.suscripciones.length === 1 && registro.suscripciones[0].filtros.length === 1 &&
       registro.suscripciones[0].filtros[0][0] === 'ts');
  debe('mapPointsData quedó sembrado con los puntos de Capone', api.getMapPointsData().length === 3);
  debe('la caché local quedó escrita (sembrada) para la próxima apertura', store.has('lp_mappoints_v1'));
  debe('quedó con un unsub real (no colgado en el placeholder)', typeof api.getPointsUnsub() === 'function');
}

// ---- 2) Sin caché local, Capone falla (network error): NUNCA peor que antes — full read ----
{
  const { api, registro } = montar({ fetchImpl: async () => { throw new Error('sin red'); } });
  api.subscribeToMapPoints();
  await espera(20);
  debe('cae al camino de siempre: se suscribe a recommendations', registro.colecciones.includes('recommendations'));
  debe('SIN filtro (full read, igual que antes de este cambio)',
       registro.suscripciones.length === 1 && registro.suscripciones[0].filtros.length === 0);
}

// ---- 3) Sin caché local, Capone responde pero con error HTTP (503, cuota, etc.) ----
{
  const { api, registro } = montar({ fetchImpl: async () => ({ ok: false }) });
  api.subscribeToMapPoints();
  await espera(20);
  debe('un ok:false también cae al full read de siempre',
       registro.suscripciones.length === 1 && registro.suscripciones[0].filtros.length === 0);
}

// ---- 4) Sin caché local, Capone responde pero vacío/corrupto (sin .puntos) ----
{
  const { api, registro } = montar({ fetchImpl: async () => ({ ok: true, json: async () => ({ error: 'cuota' }) }) });
  api.subscribeToMapPoints();
  await espera(20);
  debe('una respuesta sin .puntos también cae al full read', registro.suscripciones[0].filtros.length === 0);
}

// ---- 5) Sin caché local, Capone nunca contesta: no se cuelga esperando, corta a los 4s ----
{
  let venció;
  const { api, registro } = montar({
    fetchImpl: () => new Promise(() => {}), // nunca resuelve
    setTimeoutImpl: (fn, ms) => { venció = ms; fn(); return 1; }, // dispara el vencimiento YA, no hay que esperar 4s reales
    clearTimeoutImpl: () => {},
  });
  api.subscribeToMapPoints();
  await espera(20);
  debe('el plazo de espera es razonable (unos segundos, no minutos)', venció >= 1000 && venció <= 10000);
  debe('vencido el plazo, sigue con el full read de siempre', registro.suscripciones[0].filtros.length === 0);
}

// ---- 6) Si YA hay caché local, ni se intenta pedir la compartida (no hace falta) ----
{
  let fetchLlamado = false;
  const { api, store, registro } = montar({ fetchImpl: async () => { fetchLlamado = true; return { ok: true, json: async () => ({ puntos: [] }) }; } });
  store.set('lp_mappoints_v1', JSON.stringify({ ultimaSync: Date.now(), maxTs: 5000, puntos: [puntoNube(9)] }));
  api.subscribeToMapPoints();
  await espera(20);
  debe('con caché local vigente, NO llama a la caché compartida', !fetchLlamado);
  debe('usa directo la incremental de siempre', registro.suscripciones[0].filtros.length === 1);
}

// ---- 7) Reentrada: llamar dos veces mientras el fetch está pendiente no duplica nada ----
{
  let llamadasFetch = 0;
  const { api, registro } = montar({
    fetchImpl: async () => { llamadasFetch++; await espera(15); return { ok: true, json: async () => ({ puntos: [puntoNube(1)] }) }; },
  });
  api.subscribeToMapPoints();
  api.subscribeToMapPoints(); // en pleno vuelo del fetch de arriba
  await espera(40);
  debe('el fetch a la caché compartida se pide UNA sola vez, no dos', llamadasFetch === 1);
  debe('y termina con una sola suscripción a recommendations', registro.suscripciones.length === 1);
}

console.log(`\n${ok} ok, ${fail} fallas — mapa-cache-compartida.test.mjs`);
if (fail > 0) process.exit(1);
