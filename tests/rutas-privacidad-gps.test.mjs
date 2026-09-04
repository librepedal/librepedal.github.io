// Privacidad del track GPS en /routes (hub #201, 2026-09-04).
//
// Por qué existe: /routes es una colección PÚBLICA (cualquier tester puede leer las
// rutas de otro, para "Rutas para ti" y el ranking). Hasta este fix, cada ruta subía
// `points` completo y SIN redondear -- el track exacto, punto a punto, de cada pedaleada
// de cada ciclista. Eso deja ver dónde vive y dónde trabaja cualquier tester con solo
// mirar dónde arranca y dónde termina cada ruta (los extremos son casi siempre casa u
// oficina). La decisión de Inty (30-ago) fue: /routes se queda pública pero solo con
// `pointsPub` (recortado en las puntas + redondeado a ~100m); el track EXACTO va a
// /routesTrack, colección ya protegida en firestore.rules para que solo el dueño la lea.
// Ese código se perdió en el refactor de 23 dominios y nunca se portó a rutas.js -- este
// test cubre la reimplementación completa: subida, lectura propia/ajena y borrado.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUTAS = readFileSync(join(raiz, 'rutas.js'), 'utf8');
const RECOM = readFileSync(join(raiz, 'recomendacion-rutas.js'), 'utf8');
const RANK = readFileSync(join(raiz, 'gamificacion-ranking.js'), 'utf8');
const NAV = readFileSync(join(raiz, 'motor-navegacion.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

function bloque(src, desde) {
  const i = src.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré "' + desde + '" (¿cambió el archivo?)'); process.exit(1); }
  let prof = 0, q = null;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return src.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

// --- _puntosPublicos(pts): la función pura que difumina el track ---
{
  const fn = new Function(bloque(RUTAS, 'function _puntosPublicos(pts){') + '\nreturn _puntosPublicos;')();

  t('menos de 3 puntos: no publica nada (muy poco para difuminar bien)', fn([{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }]).length === 0);
  t('vacío/null: no revienta, devuelve []', fn(null).length === 0 && fn([]).length === 0);

  // 20 puntos en línea recta, con coordenadas de sobra para notar el recorte.
  const pts = Array.from({ length: 20 }, (_, i) => ({ t: i, lat: -33.0123456 - i * 0.001, lon: -71.0123456 - i * 0.001, speed: 5, alt: 10 }));
  const pub = fn(pts);
  t('recorta 3 puntos de CADA punta (min(3, largo/4)) -- no expone el arranque ni el final real',
    pub.length === pts.length - 6 && pub[0].t === 3 && pub[pub.length - 1].t === 16);
  t('redondea lat/lon a 3 decimales (~100m) -- no el punto GPS exacto',
    pub[0].lat === Math.round(pts[3].lat * 1000) / 1000 && pub[0].lon === Math.round(pts[3].lon * 1000) / 1000);
  t('conserva velocidad y altitud (no son sensibles, sirven para el perfil)', pub[0].speed === 5 && pub[0].alt === 10);

  // Con muy pocos puntos (3), floor(3/4)=0: el recorte se desactiva solo -- si no, un
  // trayecto cortito quedaría sin ningún punto público (ni redondeado) en "Rutas para ti".
  const pocos = [{ lat: -33, lon: -71 }, { lat: -33.001, lon: -71.001 }, { lat: -33.002, lon: -71.002 }];
  t('con solo 3 puntos, el recorte se desactiva -- no se vacía la ruta', fn(pocos).length === 3);
  // Con 4-7 puntos, floor(n/4)=1: sí recorta 1 de cada punta.
  const seis = Array.from({ length: 6 }, (_, i) => ({ lat: -33 - i * 0.001, lon: -71 - i * 0.001 }));
  t('con 6 puntos, recorta 1 de cada punta (floor(6/4)=1) y quedan 4', fn(seis).length === 4);
}

// --- _traerPuntosRuta(id, cb): /routesTrack primero (dueño), fallback a /routes ---
{
  const BLOQUE = bloque(RUTAS, 'function _traerPuntosRuta(id, cb){');

  function correr({ trackExiste, trackPuntos, routesExiste, routesData, trackFalla, routesFalla }) {
    const trackDoc = { exists: !!trackExiste, data: () => ({ points: trackPuntos }) };
    const routesDoc = { exists: !!routesExiste, data: () => routesData };
    const db = {
      collection: (nombre) => ({
        doc: () => ({
          get: () => nombre === 'routesTrack'
            ? (trackFalla ? Promise.reject(new Error('permiso denegado')) : Promise.resolve(trackDoc))
            : (routesFalla ? Promise.reject(new Error('no existe')) : Promise.resolve(routesDoc)),
        }),
      }),
    };
    const fn = new Function('db', BLOQUE + '\nreturn _traerPuntosRuta;')(db);
    return new Promise((resolve) => fn('id1', (pts, doc) => resolve({ pts, doc })));
  }

  const dueño = await correr({ trackExiste: true, trackPuntos: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }], routesExiste: true, routesData: { nombre: 'x' } });
  t('dueño de la ruta: recibe el track COMPLETO desde /routesTrack', dueño.pts.length === 2 && dueño.doc.nombre === 'x');

  const ajenaSinPermiso = await correr({ trackFalla: true, routesExiste: true, routesData: { pointsPub: [{ lat: 9, lon: 9 }] } });
  t('ruta ajena (Firestore deniega /routesTrack en silencio): cae al pointsPub difuminado de /routes',
    ajenaSinPermiso.pts.length === 1 && ajenaSinPermiso.pts[0].lat === 9);

  const rutaVieja = await correr({ trackExiste: false, routesExiste: true, routesData: { points: [{ lat: 5, lon: 5 }] } });
  t('ruta vieja sin /routesTrack (de antes del fix): cae a .points si pointsPub no existe',
    rutaVieja.pts.length === 1 && rutaVieja.pts[0].lat === 5);

  const inexistente = await correr({ trackExiste: false, routesExiste: false });
  t('ruta que no existe en ningún lado: cb(null, null), no revienta', inexistente.pts === null && inexistente.doc === null);
}

// --- Lo que se SUBE a /routes tiene que ser SIEMPRE pointsPub, nunca el track crudo ---
{
  const guardar = bloque(RUTAS, 'function saveRouteToHistory(');
  t('saveRouteToHistory arma fb con pointsPub:_puntosPublicos(...) para /routes',
    /pointsPub\s*:\s*_puntosPublicos\(/.test(guardar));
  t('saveRouteToHistory NO sube "points:" crudo (sin Pub) al doc público', !/[^.]\bpoints\s*:\s*data\.points\b/.test(guardar));

  const auto = bloque(RUTAS, 'function autoGuardarRuta(');
  t('autoGuardarRuta arma fb con pointsPub:_puntosPublicos(...) para /routes',
    /pointsPub\s*:\s*_puntosPublicos\(/.test(auto));

  t('_subirRutaNube sube el track COMPLETO a /routesTrack (colección protegida, ver firestore.rules)',
    /collection\(['"]routesTrack['"]\)/.test(bloque(RUTAS, 'function _subirRutaNube(')));
}

// --- Borrar una ruta borra TAMBIÉN su track exacto (si no, queda huérfano en la nube) ---
{
  const del = bloque(RUTAS, 'async function deleteRoute(id){');
  const vecesRoutesTrack = (del.match(/collection\(['"]routesTrack['"]\)\.doc\([^)]*\)\.delete\(\)/g) || []).length;
  t('deleteRoute borra /routesTrack en los 2 caminos (ruta con firebaseId y ruta sin item local)', vecesRoutesTrack === 2);
}

// --- Rutas de OTROS ciclistas (recomendaciones y ranking): siempre pointsPub primero ---
{
  t('recomendacion-rutas.js: filtra y pinta con r.pointsPub||r.points, nunca r.points solo',
    (RECOM.match(/r\.pointsPub\s*\|\|\s*r\.points/g) || []).length >= 2);
  t('gamificacion-ranking.js (mostrarRutasDe, historial de OTRO ciclista): usa r.pointsPub||r.points',
    /r\.pointsPub\s*\|\|\s*r\.points/.test(RANK));
  t('motor-navegacion.js (exportarRutaGPX, fallback directo a Firestore): usa dd.pointsPub si no hay .points',
    /dd\.points\s*\|\|\s*dd\.pointsPub/.test(NAV) || /dd\.pointsPub\s*\|\|\s*dd\.points/.test(NAV));
}

console.log(`  rutas-privacidad-gps.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
