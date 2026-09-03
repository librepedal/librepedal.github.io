// Aviso de ciclista adelante para el que va motorizado.
// 2026-09-03: la lógica se partió en dos piezas reales (hallazgo de privacidad, ver
// firestore.rules commit 9387ca9 -- la query pública a liveTracking dejaba que
// CUALQUIERA, con o sin cuenta, sin haber recibido ningún link, enumerara en vivo la
// posición y nombre de todo el que comparte ubicación):
//   - motor-navegacion.js (cliente): decide CUÁNDO consultar (throttle) y CUÁNTO avisar
//     (distancia/hora), pero ya no tiene lat/lon de ningún tercero.
//   - worker-proximidad/worker.js (servidor, credenciales de administrador): lee
//     liveTracking, calcula distancia + si está adelante, y devuelve SOLO un booleano +
//     una distancia redondeada -- nunca la posición ni el nombre de nadie.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIENTE = readFileSync(join(RAIZ, 'motor-navegacion.js'), 'utf8');
const WORKER = readFileSync(join(RAIZ, 'worker-proximidad', 'worker.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// --- El cliente ya no tiene forma de leer datos de terceros ---
t('el bloque existe en el cliente', /AVISO DE CICLISTA ADELANTE/.test(CLIENTE));
t('el aviso es de prioridad SEGURIDAD', /PRIO_VOZ\.SEGURIDAD\)/.test(CLIENTE));
t('el cliente ya no hace NINGUNA query (.where) sobre liveTracking -- el único uso que queda es escribir/actualizar el propio link de "seguir mi viaje" (get individual, sigue público a propósito, ver firestore.rules)',
  !/liveTracking'\)\s*\.where/.test(CLIENTE));
t('el cliente consulta al worker-proximidad, no a Firestore directo',
  /CICLISTA_PROXIMIDAD_URL\s*=\s*'https:\/\/librepedal-proximidad\.librepedal\.workers\.dev'/.test(CLIENTE));
t('el cliente manda lat/lon/rumbo/radioM al worker (el worker calcula, el cliente no)',
  /body:JSON\.stringify\(\{lat:miLat, lon:miLon, rumbo:miRumbo, radioM:_metrosAvisoCiclista\(velKmh\)\}\)/.test(CLIENTE));
t('el cliente solo actúa sobre data.hayCerca / data.distanciaAprox, nunca lat/lon/nombre',
  /data\.hayCerca/.test(CLIENTE) && !/data\.(lat|lon|nombre)\b/.test(CLIENTE));
t('el aviso recuerda el metro y medio', /metro y medio/.test(CLIENTE));
t('el aviso NO exige que el ciclista tenga la app', !/si el ciclista (no )?(tiene|usa) la app/i.test(CLIENTE));
t('hay un throttle real antes de golpear al worker (no un fetch por cada fix de GPS)',
  /CICLISTA_PROXIMIDAD_CONSULTA_MIN_MS/.test(CLIENTE) && /ahora-_ultimaConsultaProximidad < CICLISTA_PROXIMIDAD_CONSULTA_MIN_MS\) return/.test(CLIENTE));

// --- El worker: SÍ tiene lat/lon (es su trabajo, con credenciales de servidor), pero
//   nunca las devuelve en la respuesta ---
t('el worker existe y lee liveTracking con credenciales de servicio', /liveTracking/.test(WORKER) && /FIREBASE_PRIVATE_KEY/.test(WORKER));
t('el worker NUNCA incluye lat/lon/nombre como CAMPO en la respuesta al cliente (solo hayCerca/distanciaAprox)',
  /hayCerca:\s*(true|false)/.test(WORKER) && !/JSON\.stringify\([^)]*\b(lat|lon|nombre)\s*:/.test(WORKER));
t('el scope de Firestore es el correcto (datastore, NO datastore.readonly -- da 403 real)',
  /auth\/datastore'/.test(WORKER) && !/auth\/datastore\.readonly/.test(WORKER));
t('un motorizado no le avisa a otro motorizado', /modo === 'moto'\) continue/.test(WORKER));
t('el radio nunca pasa de 800m aunque el cliente pida más', /Math\.min\(Number\(body\.radioM\) \|\| 800, 800\)/.test(WORKER));
t('se queda con el MÁS cercano entre los que califican, no con cualquiera en orden arbitrario',
  /if \(!masCerca \|\| m < masCerca\) masCerca = m;/.test(WORKER));

// --- Constantes: SEG/MIN/MAX siguen en el cliente (definen radioM); ARCO se movió al
//   worker (necesita lat/lon reales para calcular rumbo, que el cliente ya no tiene) ---
const C = { SEG: 25, MIN: 150, MAX: 800, ARCO: 50 };
t('SEG=25 (cliente)', new RegExp('CICLISTA_AVISO_SEG=' + C.SEG).test(CLIENTE));
t('MIN=150 (cliente)', new RegExp('CICLISTA_AVISO_MIN_M=' + C.MIN).test(CLIENTE));
t('MAX=800 (cliente)', new RegExp('CICLISTA_AVISO_MAX_M=' + C.MAX).test(CLIENTE));
t('ARCO=50 (worker, ya no en el cliente)', new RegExp('CICLISTA_AVISO_ARCO = ' + C.ARCO).test(WORKER));

// --- Distancia de aviso según velocidad (fórmula pura, cliente decide el radio a pedir) ---
const metros = v => Math.max(C.MIN, Math.min(C.MAX, (v || 0) / 3.6 * C.SEG));
t('parado usa el mínimo', metros(0) === 150);
t('a 20 km/h usa el mínimo (139m < 150)', metros(20) === 150);
t('a 60 km/h avisa a ~417 m', Math.round(metros(60)) === 417);
t('a 100 km/h avisa a ~694 m', Math.round(metros(100)) === 694);
t('a 200 km/h se topa en 800 m', metros(200) === 800);
t('nunca avisa más lejos que el máximo', metros(500) <= C.MAX);

// --- ¿Va adelante? (fórmula pura, vive ahora en el worker) ---
const adelante = (mio, alCiclista) => {
  if (mio === null || mio === undefined) return true;
  const d = Math.abs(((alCiclista - mio + 540) % 360) - 180);
  return d <= C.ARCO;
};
t('justo al frente: avisa', adelante(0, 0) === true);
t('20° a la derecha: avisa', adelante(0, 20) === true);
t('20° a la izquierda: avisa', adelante(0, 340) === true);
t('en el borde del arco (50°): avisa', adelante(0, 50) === true);
t('60° al costado: NO avisa', adelante(0, 60) === false);
t('justo atrás: NO avisa (ya lo pasé)', adelante(0, 180) === false);
t('a 90°, cruzando: NO avisa', adelante(0, 90) === false);
t('cruce del norte (350->10): avisa', adelante(350, 10) === true);
t('cruce del norte (10->350): avisa', adelante(10, 350) === true);
t('sin rumbo confiable: avisa igual (mejor de más)', adelante(null, 123) === true);
t('la fórmula del test está de verdad en el worker (no solo en la cabeza de quien escribió el test)',
  /const d = Math\.abs\(\(\(\(rumboAlCiclista - rumboMio \+ 540\) % 360\) - 180\)\);/.test(WORKER));

// --- Antirepetición: sin ID de por medio (el worker nunca devuelve quién), el bloqueo
//   pasó de "no le repitas a ESTE ciclista" a "no avises de nuevo tan pronto", global ---
const REPETIR = 180000;
const puede = (ahora, ult) => (ahora - (ult || 0)) >= REPETIR;
t('el bloqueo sigue siendo de 3 minutos (cliente)', /CICLISTA_AVISO_REPETIR_MS=180000/.test(CLIENTE));
t('el anti-repetición es global ahora, no por id (nunca hubo id que guardar)',
  /_ultimoAvisoCiclista=Date\.now\(\)/.test(CLIENTE) && !/_ciclistaAvisado\[/.test(CLIENTE));
t('no repite al toque', puede(5000, 1000) === false);
t('a los 3 min puede repetir', puede(185000, 1000) === true);
t('primer encuentro siempre avisa', puede(Date.now(), 0) === true);

console.log('  ciclista-adelante.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
