// Caché de los puntos del mapa. Se prueba el COMPORTAMIENTO con el código real.
//
// Por qué existe: la caché se agregó para dejar de leer la colección `recommendations`
// entera en cada apertura del mapa. Pero esos documentos pueden traer `foto`, que es una
// imagen en base64 (previewFoto usa readAsDataURL). Guardar eso en localStorage —~5 MB
// para TODA la app— rompía dos cosas:
//   1. la escritura fallaba y la caché no servía de nada, en silencio;
//   2. peor: al llenar el almacenamiento se caían las OTRAS escrituras, incluida gd(), que
//      es la que guarda los kilómetros y las rutas del usuario. Y gd() tiene su propio
//      catch silencioso, así que esa pérdida habría sido invisible.
// Regla dura del proyecto: nunca perder datos del usuario. Este test la defiende.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// La caché de puntos del mapa vive en mapa-render.js desde que se separó de index.html.
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'mapa-render.js'), 'utf8');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

// --- recortar el código real ---
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

const SRC = CONSTS + '\n' + bloque('function _mapPointNube(') + '\n' +
            bloque('function _mapPointsCacheGuardar()') + '\n' + bloque('function _mapPointsCacheLeer()');

function montar({ limite = 5_000_000 } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      let usado = 0; store.forEach((val) => { usado += val.length; });
      if (usado + v.length > limite) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      store.set(k, v);
    },
    removeItem: (k) => store.delete(k),
  };
  const fn = new Function('localStorage', 'mapPointsDataRef',
    'let mapPointsData = mapPointsDataRef;\n' + SRC +
    '\nreturn {guardar:_mapPointsCacheGuardar, leer:_mapPointsCacheLeer, slim:_mapPointNube, set:(v)=>{mapPointsData=v;}};');
  const datos = [];
  return { api: fn(localStorage, datos), store, datos, localStorage };
}

const FOTO = 'data:image/jpeg;base64,' + 'A'.repeat(120000); // ~120 KB, como una foto comprimida real
const punto = (i, extra = {}) => Object.assign({
  id: 'p' + i, lat: -33 - i / 1000, lon: -71, cat: 'agua', user: 'osm-data',
  title: 'Punto ' + i, desc: 'x'.repeat(400), tsMs: 1000 + i,
  likes: 3, likedBy: ['a', 'b'], ratedBy: { a: 5 }, ratingSum: 5, votes: 1, nombre: 'Fulano', authUid: 'uid',
}, extra);

// ---- 1) LO CRÍTICO: la foto en base64 no puede llegar a localStorage ----
{
  const { api, store } = montar();
  const datos = [punto(1, { foto: FOTO }), punto(2, { foto: FOTO })];
  api.set(datos);
  api.guardar();
  const guardado = store.get('lp_mappoints_v1') || '';
  debe('se guardó algo', guardado.length > 0);
  debe('la foto en base64 NO se guarda (reventaba localStorage)', !guardado.includes('base64'));
  debe('el tamaño queda en el orden de los bytes, no de los megas', guardado.length < 5000);
  debe('tampoco se guardan likedBy/ratedBy (no los usa el mapa)',
       !guardado.includes('likedBy') && !guardado.includes('ratedBy'));
}

// ---- 2) Pero sí lo que el mapa necesita para pintar ----
{
  const { api } = montar();
  const d = api.slim(punto(7, { foto: FOTO }));
  ['id', 'lat', 'lon', 'cat', 'user', 'title', 'desc', 'tsMs'].forEach((c) => {
    debe(`se conserva '${c}' (lo usa _renderizarPuntosVisibles)`, d[c] !== undefined);
  });
  debe('la foto se descarta', d.foto === undefined);
  debe('la descripción se acota para el globo', d.desc.length === 200);
}

// ---- 3) Si no entra, se descarta la caché ENTERA en vez de dejar el disco al borde ----
// Es el punto que protege los km del usuario: gd() escribe en el mismo localStorage.
{
  const { api, store, localStorage } = montar({ limite: 200000 });
  localStorage.setItem('lp_u_intyrivera', JSON.stringify({ di: 1234.5, d: 900 })); // los datos del usuario
  api.set(Array.from({ length: 6000 }, (_, i) => punto(i)));
  api.guardar();
  debe('con la caché muy grande, NO se escribe nada', !store.has('lp_mappoints_v1'));
  debe('y los kilómetros del usuario siguen intactos', JSON.parse(store.get('lp_u_intyrivera')).di === 1234.5);
}

// ---- 3b) El caso que de verdad importa: la escritura CABRÍA, pero es demasiado grande ----
// Un navegador real tiene ~5 MB, así que una caché de 2 MB entra sin error... y se come el
// espacio que necesitan gd() y las rutas. Por eso el tope propio (1,5 MB) tiene que cortar
// ANTES, no esperar a que localStorage se queje. Sin este caso, el test pasaba igual aunque
// se quitara el tope — lo descubrió una prueba de mutación.
{
  const { api, store } = montar({ limite: 5_000_000 }); // navegador normal: la escritura entraría
  api.set(Array.from({ length: 6000 }, (_, i) => punto(i))); // ~2 MB ya recortados
  api.guardar();
  const escrito = store.get('lp_mappoints_v1');
  debe('una caché de ~2 MB NO se escribe, aunque localStorage la aceptaría',
       !escrito || escrito.length <= 1500000);
  debe('queda espacio libre para los datos del usuario', (escrito || '').length < 2000000);
}

// ---- 4) Si localStorage tira QuotaExceeded, se limpia lo propio y la app sigue ----
{
  const { api, store, localStorage } = montar({ limite: 100 });
  store.set('lp_mappoints_v1', 'basura vieja');
  localStorage.setItem = () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
  let reventó = false;
  api.set([punto(1)]);
  try { api.guardar(); } catch (e) { reventó = true; }
  debe('un almacenamiento lleno no tumba la app', !reventó);
  debe('y libera su propio espacio en vez de ocuparlo al pedo', !store.has('lp_mappoints_v1'));
}

// ---- 5) Lectura: caché fresca sirve, caché vieja fuerza refresco completo ----
{
  const { api, store } = montar();
  api.set([punto(1), punto(2)]);
  api.guardar();
  debe('una caché recién escrita se lee', (api.leer() || {}).puntos?.length === 2);

  const c = JSON.parse(store.get('lp_mappoints_v1'));
  c.ultimaSync = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 días
  store.set('lp_mappoints_v1', JSON.stringify(c));
  debe('una caché de más de 7 días se descarta (los likes no mueven el ts)', api.leer() === null);

  store.set('lp_mappoints_v1', '{esto no es json');
  debe('una caché corrupta no tumba la app, solo se ignora', api.leer() === null);

  store.delete('lp_mappoints_v1');
  debe('sin caché devuelve null (primera vez)', api.leer() === null);
}

// ---- 6) El maxTs es lo que hace incremental la consulta siguiente ----
{
  const { api, store } = montar();
  api.set([punto(1), punto(2), punto(3)]);
  api.guardar();
  debe('se guarda el ts más nuevo, para pedir solo lo posterior',
       JSON.parse(store.get('lp_mappoints_v1')).maxTs === 1003);
}

// ---- 7) Los handlers del mapa: el caso "arranco a navegar sin abrir el mapa" ----
// subscribeToMapPoints() tambien se llama desde avisarPuntosCercanos(), en pleno viaje y
// posiblemente con mp === null. Antes quedaba pointsUnsub seteado y los handlers sin poner;
// al abrir despues el mapa, el `return` temprano cortaba antes de engancharlos y los puntos
// no se volvian a dibujar al mover ni al hacer zoom en TODA la sesion.
{
  const fn = bloque('function subscribeToMapPoints()');
  const iHandlers = fn.indexOf("mp.on('moveend'");
  const iReturn = fn.indexOf('if(pointsUnsub) return;');
  debe('subscribeToMapPoints engancha moveend/zoomend', iHandlers >= 0);
  debe('los engancha ANTES del return temprano (si no, quedan sin poner para siempre)',
       iHandlers >= 0 && iReturn >= 0 && iHandlers < iReturn);
  debe('y solo una vez, aunque la funcion se llame varias veces',
       /subscribeToMapPoints\._handlers=true;/.test(fn));
  debe('protegido por si el mapa todavia no existe', /if\(mp && !subscribeToMapPoints\._handlers\)/.test(fn));
  debe('no quedo el bloque viejo duplicando el enganche',
       (fn.match(/mp\.on\('moveend'/g) || []).length === 1);
}

console.log('  cache-mappoints.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
