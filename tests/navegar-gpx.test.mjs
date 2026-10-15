// Navegar una ruta GPX solo por voz — lógica REAL de navegar-gpx.js + el motor de giros real
// (checkNavigationSteps de motor-navegacion.js) recorriendo rutas simuladas.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lee = (f) => readFileSync(join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
const SRC = lee('navegar-gpx.js'), NAV = lee('motor-navegacion.js'), RUTAS = lee('rutas.js');
const RREC = lee('rutas-recomendadas.js'), HTML = lee('index.html'), SW = lee('sw.js');

let ok = 0, fail = 0;
const t = (n, c, extra) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n + (extra ? '\n    ' + extra : '')); } };

const puro = SRC.slice(0, SRC.indexOf('/* ---------- Red'));
const G = new Function(puro + '\nreturn {gpxnDist, gpxnRumbo, gpxnNorm, gpxnSimplificar, gpxnRemuestrear, gpxnDetectarGiros, gpxnTextoGiro, gpxnPerfil, gpxnPasos, gpxnPosicionEnRuta, gpxnLadoRelativo, gpxnTextoFuera, gpxnEnriquecer, gpxnUnir};')();

// Rutas en metros locales (este, norte) alrededor de Llifén.
const BASE = { lat: -40.2, lon: -72.26 };
const aLL = (e, n, alt) => ({ lat: BASE.lat + n / 111320, lon: BASE.lon + e / (111320 * Math.cos(BASE.lat * Math.PI / 180)), alt });
// Une tramos rectos con un punto cada `cada` metros.
function ruta(vertices, cada = 5, ruido = 0, semilla = 7) {
  let s = semilla; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const out = [];
  for (let k = 1; k < vertices.length; k++) {
    const [e0, n0] = vertices[k - 1], [e1, n1] = vertices[k];
    const L = Math.hypot(e1 - e0, n1 - n0), pasos = Math.max(1, Math.round(L / cada));
    for (let i = (k === 1 ? 0 : 1); i <= pasos; i++) {
      const f = i / pasos; out.push(aLL(e0 + (e1 - e0) * f + rnd() * 2 * ruido, n0 + (n1 - n0) * f + rnd() * 2 * ruido));
    }
  }
  return out;
}
const giros = (r) => r.pasos.filter(p => p.maneuver.type === 'turn' || p.maneuver.type === 'fork');

// ---- Básicos de geometría ----
t('rumbo norte = 0°', Math.round(G.gpxnRumbo(aLL(0, 0), aLL(0, 100))) === 0);
t('rumbo este = 90°', Math.round(G.gpxnRumbo(aLL(0, 0), aLL(100, 0))) === 90);
t('norm: 270° = -90° (izquierda)', G.gpxnNorm(270) === -90);

// ---- Esquina en L: un giro a la derecha, justo en la esquina ----
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 600], [600, 600]]), 'La Esquina');
  const g = giros(r);
  t('L: un solo giro', g.length === 1, JSON.stringify(g.map(x => x.instruction)));
  t('L: es a la derecha', g[0] && g[0].instruction === 'Gira a la derecha');
  const loc = g[0] && { lat: g[0].maneuver.location[1], lon: g[0].maneuver.location[0] };
  t('L: ubicado en la esquina (±20 m)', loc && G.gpxnDist(loc, aLL(0, 600)) <= 20, loc && G.gpxnDist(loc, aLL(0, 600)));
  t('L: empieza con "Comienza la ruta"', r.pasos[0].maneuver.type === 'depart' && /Comienza la ruta La Esquina/.test(r.pasos[0].instruction));
  t('L: termina con la llegada', r.pasos[r.pasos.length - 1].maneuver.type === 'arrive');
  const suma = r.pasos.reduce((s, p) => s + p.distance, 0);
  t('L: los tramos suman el largo total (≈1,2 km)', Math.abs(suma - r.distancia) < 1 && Math.abs(r.distancia - 1200) < 15);
  t('L: pasos en orden y numerados', r.pasos.every((p, i) => p.index === i && (i === 0 || p.dRuta >= r.pasos[i - 1].dRuta)));
}
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 600], [-600, 600]]));
  t('L al revés: gira a la izquierda', giros(r).length === 1 && giros(r)[0].instruction === 'Gira a la izquierda');
}
// ---- Temblor del GPS en una recta: cero giros ----
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 1500]], 4, 3));
  t('recta con temblor de ±3 m: ningún giro inventado', giros(r).length === 0, JSON.stringify(giros(r).map(x => x.instruction)));
}
// ---- Curva suave de camino de cerro (radio 300 m, 90°): no es un giro ----
{
  const pts = [];
  for (let a = 0; a <= 90; a += 1) { const rad = a * Math.PI / 180; pts.push(aLL(300 - 300 * Math.cos(rad), 300 * Math.sin(rad))); }
  // la curva termina mirando al este y sigue derecho al este (sin giro al final)
  const r = G.gpxnPasos(pts.concat(ruta([[300, 300], [800, 300]]).slice(1)));
  t('curva suave de radio 300 m: no se anuncia como giro', giros(r).length === 0, JSON.stringify(giros(r).map(x => x.instruction)));
}
// ---- Curva cerrada (horquilla de 150°) ----
{
  const ang = 150 * Math.PI / 180;
  const r = G.gpxnPasos(ruta([[0, 0], [0, 500], [500 * Math.sin(ang), 500 + 500 * Math.cos(ang)]]));
  t('horquilla de 150°: "Curva cerrada a la derecha"', giros(r).length === 1 && giros(r)[0].instruction === 'Curva cerrada a la derecha', JSON.stringify(giros(r).map(x => x.instruction)));
}
// ---- Ida y vuelta por el mismo camino ----
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 700], [0, 0]]));
  t('ida y vuelta: "Da media vuelta"', giros(r).length === 1 && /^Da media vuelta/.test(giros(r)[0].instruction), JSON.stringify(giros(r).map(x => x.instruction)));
}
// ---- Cruce desfasado: derecha y a los 30 m izquierda = una sola frase ----
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 500], [30, 500], [30, 1000]]));
  t('cruce desfasado: una frase "Gira a la derecha y enseguida a la izquierda"', giros(r).length === 1 && giros(r)[0].instruction === 'Gira a la derecha y enseguida a la izquierda', JSON.stringify(giros(r).map(x => x.instruction)));
}
// ---- Ruta muy corta / vacía ----
t('ruta de 100 m: error claro', /muy corta/.test(G.gpxnPasos(ruta([[0, 0], [0, 100]])).error || ''));
t('sin puntos: error claro', !!G.gpxnPasos([]).error);

// ---- Perfil de alturas para subidas y bajadas ----
{
  const pts = ruta([[0, 0], [0, 1000]]).map((p, i, a) => Object.assign(p, { alt: 100 + 60 * i / (a.length - 1) }));
  const r = G.gpxnPasos(pts);
  t('con alturas: hay perfil', r.perfil.length > 10);
  t('perfil cada ~40 m (≥3 puntos en 180 m, lo que pide el aviso de pendiente)', r.perfil[3].d - r.perfil[0].d <= 160);
  t('perfil sube de ~100 a ~160 m', r.perfil[0].ele < 110 && r.perfil[r.perfil.length - 1].ele > 150);
  const sin = G.gpxnPasos(ruta([[0, 0], [0, 1000]]));
  t('sin alturas: perfil vacío (lo pide el motor a Open-Meteo)', sin.perfil.length === 0);
}

// ---- Dónde estoy respecto de la línea ----
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 600], [600, 600]]));
  const p = G.gpxnPosicionEnRuta(aLL(30, 300).lat, aLL(30, 300).lon, r.latlngs, r.cum);
  t('a 30 m del camino: distancia ≈30', Math.abs(p.dist - 30) < 3, p.dist);
  t('y avance ≈300 m', Math.abs(p.dRuta - 300) < 15, p.dRuta);
  const iv = G.gpxnPasos(ruta([[0, 0], [0, 700], [0, 0]]));
  const q = aLL(2, 300);
  const enIda = G.gpxnPosicionEnRuta(q.lat, q.lon, iv.latlngs, iv.cum, 0, 600);
  const enVuelta = G.gpxnPosicionEnRuta(q.lat, q.lon, iv.latlngs, iv.cum, 800, 2000);
  t('ida y vuelta: yendo, se ubica en la ida (≈300 m)', Math.abs(enIda.dRuta - 300) < 20, enIda.dRuta);
  t('ida y vuelta: volviendo, se ubica en la vuelta (≈1100 m), no en la ida', Math.abs(enVuelta.dRuta - 1100) < 20, enVuelta.dRuta);
}
t('vas al norte, la ruta al este: "derecha"', G.gpxnLadoRelativo(0, 90) === 'derecha');
t('vas al norte, la ruta al oeste: "izquierda"', G.gpxnLadoRelativo(0, 270) === 'izquierda');
t('vas al norte, la ruta al sur: "atras"', G.gpxnLadoRelativo(0, 180) === 'atras');
t('texto: "Está a 80 metros, hacia tu derecha."', G.gpxnTextoFuera(83, 'derecha') === 'Te saliste de la ruta. Está a 80 metros, hacia tu derecha.');
t('texto: kilómetros con coma', /1,3 kilómetros/.test(G.gpxnTextoFuera(1320, 'izquierda')));
t('texto: te pasaste', /^Te pasaste/.test(G.gpxnTextoFuera(120, 'atras')));

// ---- Nombres de calles (OSRM) ----
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 600], [600, 600], [600, 1200]]));
  const [g1, g2] = giros(r);
  const esq1 = { lat: g1.maneuver.location[1], lon: g1.maneuver.location[0] };
  const fork = aLL(1, 300);
  G.gpxnEnriquecer(r, [Object.assign({ type: 'turn', modifier: 'right', name: 'Camino a Llifén' }, esq1), Object.assign({ type: 'fork', modifier: 'slight left', name: '' }, fork)], () => true);
  const g = giros(r);
  t('con señal: el giro con cruce lleva el nombre', g.some(x => x.instruction === 'Gira a la derecha por Camino a Llifén'), JSON.stringify(g.map(x => x.instruction)));
  t('con señal: donde OSRM no ve cruce, es una curva', g.some(x => x.instruction === 'Curva a la izquierda'), JSON.stringify(g.map(x => x.instruction)));
  t('con señal: agrega la bifurcación suave que la forma no delata', g.some(x => /bifurcación, mantente a la izquierda/.test(x.instruction)));
  t('los pasos siguen en orden tras agregar', r.pasos.every((p, i) => p.index === i && (i === 0 || p.dRuta >= r.pasos[i - 1].dRuta)));
}
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 600], [600, 600]]));
  G.gpxnEnriquecer(r, [Object.assign({ type: 'turn', modifier: 'left', name: 'X' }, aLL(300, 2000))], () => false);
  t('zona que OSRM no alcanzó a ver: el giro queda como estaba (no se vuelve "curva")', giros(r)[0].instruction === 'Gira a la derecha');
  G.gpxnEnriquecer(r, [Object.assign({ type: 'turn', modifier: 'left', name: '' }, aLL(200, 300))], () => true);
  t('un cruce de OSRM lejos de la línea (200 m) no se agrega', giros(r).length === 1);
}
// ---- Tramo hasta el inicio + ruta ----
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 600], [600, 600]]), 'Lago');
  const acc = { distancia: 400, duracion: 90, latlngs: [[0, 0], [1, 1]], cum: [0, 400],
    pasos: [{ instruction: 'Comienza el recorrido', maneuver: { type: 'depart', location: [0, 0] }, dRuta: 0 }, { instruction: 'Gira a la izquierda', maneuver: { type: 'turn', location: [0, 0] }, dRuta: 200 }, { instruction: 'Has llegado a tu destino', maneuver: { type: 'arrive', location: [0, 0] }, dRuta: 400 }] };
  const u = G.gpxnUnir(acc, r);
  t('unir: no dice "llegaste a tu destino" en el inicio', !u.pasos.some(p => p.instruction === 'Has llegado a tu destino'));
  t('unir: avisa que empieza la ruta', u.pasos.some(p => /^Llegaste al inicio de Lago/.test(p.instruction)));
  t('unir: la ruta queda desplazada 400 m', u.pasos.find(p => /Gira a la derecha/.test(p.instruction)).dRuta > 400 + 500);
  t('unir: distancia total', Math.abs(u.distancia - (400 + r.distancia)) < 1);
}

// ---- Recorrido simulado con el motor de giros REAL (checkNavigationSteps) ----
function bloque(src, desde) {
  const i = src.indexOf(desde); let prof = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') prof++; else if (src[k] === '}' && --prof === 0) return src.slice(i, k + 1); }
}
{
  const r = G.gpxnPasos(ruta([[0, 0], [0, 600], [600, 600], [600, 1200]]), 'Prueba');
  const dichos = []; let llego = false;
  const el = { innerText: '' };
  const motor = new Function('navSteps', 'calculateDistance', 'formatDistance', 'document', 'showStepInstruction', 'showArrival',
    // _actualizarLlegada (hora de llegada en vivo, auditoría 2026-10-15) no es parte de esta prueba
    'let currentStepIndex=0, lastSpokenStep=-1, _navDistPrev=Infinity; const _actualizarLlegada=function(){};\n' + bloque(NAV, 'function checkNavigationSteps(') +
    '\nreturn {paso:checkNavigationSteps, set ls(v){lastSpokenStep=v;}, get idx(){return currentStepIndex;}};');
  let M;
  M = motor(r.pasos, (a, b, c, d) => G.gpxnDist({ lat: a, lon: b }, { lat: c, lon: d }), (m) => m + ' m', { getElementById: () => el },
    (i) => { dichos.push({ i, txt: r.pasos[i].instruction, pos: null }); M.ls = i; }, () => { llego = true; });
  const recorrido = ruta([[0, 0], [0, 600], [600, 600], [600, 1200]], 5); // 18 km/h ≈ 5 m por segundo
  let pos = 0;
  for (const p of recorrido) { const antes = dichos.length; M.paso(p.lat, p.lon, 18); if (dichos.length > antes) dichos[dichos.length - 1].pos = p; pos++; }
  const giroDichos = dichos.filter(d => /Gira|Curva/.test(d.txt));
  t('recorrido: Pistero dice los 2 giros', giroDichos.length === 2, JSON.stringify(dichos.map(d => d.txt)));
  const esquinas = [aLL(0, 600), aLL(600, 600)];
  const antici = giroDichos.map((d, k) => G.gpxnDist(d.pos, esquinas[k]));
  t('recorrido: cada giro se avisa ANTES de llegar (entre 40 y 100 m)', antici.length === 2 && antici.every(a => a >= 40 && a <= 100), JSON.stringify(antici.map(Math.round)));
  t('recorrido: primero derecha, después izquierda', giroDichos[0] && /derecha/.test(giroDichos[0].txt) && /izquierda/.test(giroDichos[1].txt));
  t('recorrido: al final, la llegada', llego);
}

// ---- Enganches en la app ----
t('calculateAndStartNavigation acepta la ruta GPX y no llama a OSRM con ella', /async function calculateAndStartNavigation\(startLat,startLon,destLat,destLon,destName,rutaGPX\)/.test(NAV) && /if\(rutaGPX\)\{\n\s*route=\{distance:rutaGPX\.distancia/.test(NAV));
t('usa los pasos del GPX', /navSteps=rutaGPX \? rutaGPX\.pasos :/.test(NAV));
t('el perfil del GPX alimenta los avisos de subida/bajada', /rutaPerfil=rutaGPX\.perfil/.test(NAV));
t('el modo GPX se activa después de cerrar una navegación anterior', NAV.indexOf('gpxnEmpezar(rutaGPX)') > NAV.indexOf("if(document.getElementById('nav-screen').classList.contains('active')) endNavigation();"));
t('desvío en modo GPX: guía a la línea, no recalcula', /navModoGPX && typeof gpxnVerificar==='function'\)\{ gpxnVerificar\(lat,lon\); return; \}/.test(NAV) && /navModoGPX\) return; \/\/ un GPX no se recalcula/.test(NAV));
t('terminar la navegación apaga el modo GPX', /function endNavigation\(\)\{[\s\S]{0,400}gpxnTerminar\(\)/.test(NAV));
t('"Pedalearla" navega la ruta por voz', /navegarRutaGPX\(r\.puntos/.test(RREC));
t('tus rutas: botón "Navegar por voz"', /navegarRutaLocal\(/.test(RUTAS));
t('index.html carga navegar-gpx.js', /<script src="navegar-gpx\.js"><\/script>/.test(HTML));
t('sw.js lo precachea', /'\.\/navegar-gpx\.js'/.test(SW));

console.log('  navegar-gpx.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
