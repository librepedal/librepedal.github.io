// Gating free/premium de la voz (voz-motor.js), 2026-09-04 (actualizado 2026-09-05).
// Por qué existe: decisión de producto de Inty tras medir el costo real de ElevenLabs
// (~US$0,51/usuario/mes en agosto) -- el tier free usaba Microsoft Edge TTS (gratis, sin
// arquetipo); desde el 2026-09-05 el free es Google Chirp3-HD (gratis, CON arquetipo real
// -- ver _vozGoogleRuntime en voz-motor.js); Edge queda como respaldo si Google falla. El
// tier premium sigue con los 14 arquetipos de ElevenLabs de siempre.
// us.premium lo escribe SOLO el worker de verificación de compras (nunca el cliente,
// ver firestore.rules premiumSinTocar()), así que _esPremium() puede confiar en él tal
// cual llega de la nube.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'voz-motor.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

function bloque(desde) {
  const i = SRC.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré "' + desde + '" (¿cambió el archivo?)'); process.exit(1); }
  let prof = 0, q = null;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) {
    const c = SRC[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && SRC[k + 1] === '/') { k = SRC.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '/' && SRC[k + 1] === '*') { k = SRC.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return SRC.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

// --- _esPremium(): prueba la función real con distintos estados de us.premium ---
{
  // GATE_PREMIUM_ACTIVO se inyecta como literal (no como parámetro): es un `var` de
  // módulo que _esPremium() lee por closure, así que tiene que existir en el mismo
  // scope léxico del `new Function(...)`, no venir de afuera.
  const fn = (gate, us, Date) => new Function('us', 'Date',
    'var GATE_PREMIUM_ACTIVO=' + gate + ';\n' + bloque('function _esPremium(){') + '\nreturn _esPremium;'
  )(us, Date);

  // Estado REAL de hoy (GATE_PREMIUM_ACTIVO=false, ver comentario junto a la constante):
  // reporte real de Inty probando la app -- al activar el gating, TODOS los usuarios
  // (los 19 testers reales incluidos) cayeron a la voz free de golpe, porque nadie tenía
  // (ni podía tener) premium=true todavía. Mientras el gate esté apagado, es premium
  // pase lo que pase -- nadie pierde lo que ya tenía.
  t('gate APAGADO (hoy): premium=true aunque no exista el campo en absoluto', fn(false, {}, Date)() === true);
  t('gate APAGADO (hoy): premium=true aunque us.premium.activo sea false', fn(false, { premium: { activo: false } }, Date)() === true);

  // Comportamiento real cuando Inty active el gate (cambiar la constante a true) -- debe
  // seguir funcionando la lógica de siempre, sin tener que tocar nada más.
  t('gate ACTIVO: sin campo premium, NO es premium (default seguro)', fn(true, {}, Date)() === false);
  t('gate ACTIVO: premium.activo=false, NO es premium', fn(true, { premium: { activo: false } }, Date)() === false);
  t('gate ACTIVO: premium.activo=true sin fecha de expiración, SÍ es premium', fn(true, { premium: { activo: true } }, Date)() === true);
  {
    const DateFuturo = { now: () => 1000 };
    t('gate ACTIVO: premium.activo=true, expira en el futuro, SÍ es premium',
      fn(true, { premium: { activo: true, expira: 5000 } }, DateFuturo)() === true);
  }
  {
    const DatePasado = { now: () => 9999 };
    t('gate ACTIVO: premium.activo=true, YA expiró, NO es premium (vuelve a free solo)',
      fn(true, { premium: { activo: true, expira: 5000 } }, DatePasado)() === false);
  }
}

// --- El gating real en _reproducirVoz(): ejecuta la función completa con mocks ---
const REPRODUCIR = bloque('function _reproducirVoz(item){');

function correr(overrides) {
  const o = Object.assign({
    esPremium: () => true, vozMejorada: true,
    VOCES_MANIFEST_EL: { map: {} }, VOCES_MANIFEST: { map: {} },
  }, overrides || {});
  const llamadas = [];
  const _esPremium = o.esPremium;
  const _vozArchivoEL = () => llamadas.push({ fn: 'archivoEL' });
  const _vozElevenRuntime = () => llamadas.push({ fn: 'elevenEnVivo' });
  const _vozGoogleRuntime = () => llamadas.push({ fn: 'googleFree' });
  const _vozNativaOWeb = () => llamadas.push({ fn: 'nativa' });
  const _vozSiguiente = () => {};
  const PRIO_VOZ = { AMBIENTE: 1, INFO: 2, NAV: 3, SEGURIDAD: 4 };
  const fn = new Function(
    '_esPremium', 'vozMejorada', 'VOCES_MANIFEST_EL', 'VOCES_MANIFEST',
    '_vozArchivoEL', '_vozElevenRuntime', '_vozGoogleRuntime', '_vozNativaOWeb',
    'vozGen', 'vozHablando', 'vozPrioActual', 'vozTimerFin', 'PRIO_VOZ', '_durEstVoz',
    'mostrarBocadillo', '_pisteroHabla', '_vozSiguiente', 'setTimeout', 'clearTimeout',
    REPRODUCIR + '\nreturn _reproducirVoz;'
  );
  const _reproducirVoz = fn(
    _esPremium, o.vozMejorada, o.VOCES_MANIFEST_EL, o.VOCES_MANIFEST,
    _vozArchivoEL, _vozElevenRuntime, _vozGoogleRuntime, _vozNativaOWeb,
    0, false, 0, null, PRIO_VOZ, () => 2000,
    () => {}, () => {}, _vozSiguiente, setTimeout, clearTimeout
  );
  _reproducirVoz({ t: 'hola', limpio: 'hola', prio: PRIO_VOZ.INFO });
  return llamadas;
}

{
  const llamadas = correr({ esPremium: () => false });
  t('usuario FREE: va a Google (Chirp3-HD), nunca toca ElevenLabs', llamadas.length === 1 && llamadas[0].fn === 'googleFree');
}
{
  const llamadas = correr({ esPremium: () => true, VOCES_MANIFEST_EL: { map: {} } });
  t('usuario PREMIUM sin pregrabado: sigue yendo a ElevenLabs en vivo (comportamiento de siempre)',
    llamadas.length === 1 && llamadas[0].fn === 'elevenEnVivo');
}
{
  const llamadas = correr({ esPremium: () => true, VOCES_MANIFEST_EL: { map: { hola: 'abc' } } });
  t('usuario PREMIUM con pregrabado: usa el pregrabado (sigue igual que antes de este cambio)',
    llamadas.length === 1 && llamadas[0].fn === 'archivoEL');
}
{
  const llamadas = correr({ esPremium: () => false, vozMejorada: false });
  t('con la voz mejorada apagada (vozMejorada=false): free NO fuerza Edge TTS, respeta el toggle de siempre (va a la nativa)',
    llamadas.length === 1 && llamadas[0].fn === 'nativa');
}

console.log(`  voz-gating-premium.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
