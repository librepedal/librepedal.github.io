// Tope de charla por viaje (Inty 2026-10-15): giros, pendientes y seguridad siempre; todo lo
// demás máximo 3 frases de punto A a punto B, repartidas y sin repetir. Lógica REAL de voz-motor.js.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lee = (f) => readFileSync(join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
const VOZ = lee('voz-motor.js');
let ok = 0, fail = 0;
const t = (n, c, extra) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n + (extra ? '\n    ' + extra : '')); } };

function bloque(src, desde) {
  const i = src.indexOf(desde); let prof = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') prof++; else if (src[k] === '}' && --prof === 0) return src.slice(i, k + 1); }
}
const consts = VOZ.slice(VOZ.indexOf('const CHARLA_MAX_VIAJE'), VOZ.indexOf('\n', VOZ.indexOf('const CHARLA_MAX_VIAJE')));

// ---- La regla pura ----
{
  const permitida = new Function(consts + '\n' + bloque(VOZ, 'function charlaPermitida(') + '\nreturn charlaPermitida;')();
  const est = () => ({ dichas: 0, ultima: 0, textos: new Set() });
  // Navegando una ruta de 40 km: 25 %, 50 %, 75 %
  t('ruta 40 km, km 5: todavía no', permitida(est(), { texto: 'a', ahora: 0, inicio: 0, kmHechos: 5, kmRuta: 40 }) === false);
  t('ruta 40 km, km 10 (25 %): la primera sí', permitida(est(), { texto: 'a', ahora: 0, inicio: 0, kmHechos: 10, kmRuta: 40 }) === true);
  t('segunda recién al 50 % (km 20)', permitida({ dichas: 1, ultima: 1, textos: new Set(['a']) }, { texto: 'b', ahora: 0, inicio: 0, kmHechos: 15, kmRuta: 40 }) === false
    && permitida({ dichas: 1, ultima: 1, textos: new Set(['a']) }, { texto: 'b', ahora: 0, inicio: 0, kmHechos: 20, kmRuta: 40 }) === true);
  t('después de 3, nunca más (aunque falte ruta)', permitida({ dichas: 3, ultima: 1, textos: new Set() }, { texto: 'z', ahora: 0, inicio: 0, kmHechos: 39, kmRuta: 40 }) === false);
  t('una frase ya dicha en este viaje no se repite', permitida({ dichas: 1, ultima: 1, textos: new Set(['Toma agua']) }, { texto: 'Toma agua', ahora: 0, inicio: 0, kmHechos: 39, kmRuta: 40 }) === false);
  // Grabando (sin ruta): primera a los 10 min, después cada 15
  const M = 60000;
  t('grabando, minuto 5: no', permitida(est(), { texto: 'a', ahora: 5 * M, inicio: 0, kmHechos: 2, kmRuta: 0 }) === false);
  t('grabando, minuto 10: la primera sí', permitida(est(), { texto: 'a', ahora: 10 * M, inicio: 0, kmHechos: 3, kmRuta: 0 }) === true);
  t('grabando: la segunda no antes de 15 min de la primera', permitida({ dichas: 1, ultima: 10 * M, textos: new Set() }, { texto: 'b', ahora: 20 * M, inicio: 0, kmHechos: 6, kmRuta: 0 }) === false
    && permitida({ dichas: 1, ultima: 10 * M, textos: new Set() }, { texto: 'b', ahora: 25 * M, inicio: 0, kmHechos: 8, kmRuta: 0 }) === true);
}

// ---- Un viaje entero simulado: lo que de verdad suena ----
{
  let ahora = 0; const dichos = [];
  const nav = { classList: { contains: () => true } };
  const ctx = { tripStartTime: 1, totalDistance: 0, routeTotalDistance: 40, ig: false };
  const fn = new Function('document', 'Date', 'ctxT', 'h', 'hAmbiente', 'vozOcupada', 'vozCola',
    'let tripStartTime, totalDistance, routeTotalDistance, ig; const sync=()=>{tripStartTime=ctxT.tripStartTime; totalDistance=ctxT.totalDistance; routeTotalDistance=ctxT.routeTotalDistance; ig=ctxT.ig;};\n' +
    consts + '\nlet _charla={viaje:null, dichas:0, ultima:0, textos:new Set()};\n' +
    bloque(VOZ, 'function charlaPermitida(') + '\n' + bloque(VOZ, 'function _enViaje(') + '\n' + bloque(VOZ, 'function hCharla(') +
    '\nreturn function(t,a){ sync(); return hCharla(t,a); };');
  const hCharla = fn({ getElementById: () => nav }, { now: () => ahora }, ctx, (x) => dichos.push(x), (x) => dichos.push(x), () => false, []);
  // Como hoy: agua cada 5 km, una broma cada 1,5 km, viento, ritmo... en una ruta de 40 km
  for (let km = 0; km <= 40; km += 0.5) {
    ctx.totalDistance = km; ahora = km * 200000;
    if (km % 5 === 0 && km > 0) hCharla('Llevas ' + km + ' kilómetros. Toma agua.');
    if (km % 1.5 === 0) hCharla('Broma número ' + km, true);
    if (km % 7 === 0) hCharla('Viento en contra.');
  }
  t('ruta de 40 km con todos los generadores de hoy: solo 3 frases de charla', dichos.length === 3, JSON.stringify(dichos));
  t('repartidas: ninguna antes del km 10', dichos.every(d => !/ 0 kil| 5 kil|número [0-9](\.|$)/.test(d)));
  // viaje nuevo: cupo nuevo
  ctx.tripStartTime = 2; ctx.totalDistance = 15; ahora += 1;
  t('viaje nuevo: vuelve a tener cupo', hCharla('Otra frase del viaje 2') === true);
  // fuera de viaje: habla como siempre
  nav.classList.contains = () => false; ctx.ig = false;
  const antes = dichos.length; for (let i = 0; i < 5; i++) hCharla('Fuera de viaje ' + i);
  t('fuera de un viaje no hay tope', dichos.length === antes + 5);
}

// ---- Qué pasa por el tope y qué NO ----
const FUENTES = {
  'motor-gps.js': [/hCharla\(_fr\); lastFraseParadoTime/, /hCharla\(_fr\); tFraseCiudad/, /hCharla\(_fr\); kmUltimaFrase/, /hCharla\(\(_hito\*10\)/],
  'avisos-viaje.js': [/hCharla\(tip, true\)/, /hCharla\(r\.msg\)/],
  'pistero-chat-ia.js': [/hCharla\(intros\[/],
  'motor-navegacion.js': [/hCharla\("Llevas /, /hCharla\("Vas en /, /hCharla\('Vas más rápido/, /hCharla\('Vas más lento/],
  'clima-datos.js': [/hCharla\('Viento en contra/, /hCharla\(cambio\.texto\)/, /hCharla\('Ojo, viene probabilidad alta de lluvia/, /hCharla\('Se nota que bajaste/],
  'mapa-render.js': [/hCharla\(FRASES_AVISO\[tipo\]/],
  'segmentos.js': [/hCharla\('Entraste al segmento/],
};
for (const [f, res] of Object.entries(FUENTES)) { const s = lee(f); res.forEach(r => t(f + ' pasa por el tope: ' + r.source.slice(0, 40), r.test(s))); }
const NAV = lee('motor-navegacion.js'), GPS = lee('motor-gps.js');
t('los giros NO pasan por el tope (hCorta en showStepInstruction)', /hCorta\(step\.instruction\)/.test(NAV));
t('los avisos de subida/bajada anticipados NO pasan por el tope', /h\('Ojo, se viene una subida'/.test(NAV) && /h\('Prepárate: viene una bajada'/.test(NAV));
t('la subida/bajada en vivo NO pasa por el tope', /const _fr=obtenerFraseUnica\('subida'\); if\(_fr\)\{ h\(_fr\)/.test(GPS));
t('la tormenta sigue siendo urgente (no pasa por el tope)', /hUrgente\(cambio\.texto\)/.test(lee('clima-datos.js')));
t('el Pistero travieso no se asoma en pleno viaje', /_enViaje\(\)\)\{ prox\(\); return; \}/.test(VOZ));

console.log('  pistero-tope-charla.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
