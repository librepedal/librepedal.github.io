// Gating free/premium de la voz (voz-motor.js), 2026-09-04.
// Por qué existe: decisión de producto de Inty tras medir el costo real de ElevenLabs
// (~US$0,51/usuario/mes en agosto) -- el tier free usa Microsoft Edge TTS (gratis, sin
// arquetipo); el tier premium sigue con los 14 arquetipos de ElevenLabs de siempre.
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
  const bloquePremium = bloque('function _esPremium(){');
  const fn = new Function('us', 'Date', bloquePremium + '\nreturn _esPremium;');

  t('sin campo premium: NO es premium (default seguro)', fn({}, Date)() === false);
  t('premium.activo=false: NO es premium', fn({ premium: { activo: false } }, Date)() === false);
  t('premium.activo=true sin fecha de expiración: SÍ es premium', fn({ premium: { activo: true } }, Date)() === true);
  {
    const DateFuturo = { now: () => 1000 };
    t('premium.activo=true, expira en el futuro: SÍ es premium',
      fn({ premium: { activo: true, expira: 5000 } }, DateFuturo)() === true);
  }
  {
    const DatePasado = { now: () => 9999 };
    t('premium.activo=true, YA expiró: NO es premium (vuelve a free solo)',
      fn({ premium: { activo: true, expira: 5000 } }, DatePasado)() === false);
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
  const _vozEdgeRuntime = () => llamadas.push({ fn: 'edgeFree' });
  const _vozNativaOWeb = () => llamadas.push({ fn: 'nativa' });
  const _vozSiguiente = () => {};
  const PRIO_VOZ = { AMBIENTE: 1, INFO: 2, NAV: 3, SEGURIDAD: 4 };
  const fn = new Function(
    '_esPremium', 'vozMejorada', 'VOCES_MANIFEST_EL', 'VOCES_MANIFEST',
    '_vozArchivoEL', '_vozElevenRuntime', '_vozEdgeRuntime', '_vozNativaOWeb',
    'vozGen', 'vozHablando', 'vozPrioActual', 'vozTimerFin', 'PRIO_VOZ', '_durEstVoz',
    'mostrarBocadillo', '_pisteroHabla', '_vozSiguiente', 'setTimeout', 'clearTimeout',
    REPRODUCIR + '\nreturn _reproducirVoz;'
  );
  const _reproducirVoz = fn(
    _esPremium, o.vozMejorada, o.VOCES_MANIFEST_EL, o.VOCES_MANIFEST,
    _vozArchivoEL, _vozElevenRuntime, _vozEdgeRuntime, _vozNativaOWeb,
    0, false, 0, null, PRIO_VOZ, () => 2000,
    () => {}, () => {}, _vozSiguiente, setTimeout, clearTimeout
  );
  _reproducirVoz({ t: 'hola', limpio: 'hola', prio: PRIO_VOZ.INFO });
  return llamadas;
}

{
  const llamadas = correr({ esPremium: () => false });
  t('usuario FREE: va a Edge TTS, nunca toca ElevenLabs', llamadas.length === 1 && llamadas[0].fn === 'edgeFree');
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
