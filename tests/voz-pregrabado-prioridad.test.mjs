// Prioridad de la voz pregrabada (voces-el/) sobre la generación en vivo por ElevenLabs.
// Por qué existe (2026-09-03, pedido real de Inty: analizar el costo de voz y resolverlo
// de raíz): medido el catálogo real, generar en vivo TODO lo que ya está pregrabado
// (FRASES_ARQ + FRASES_SISTEMA, ~26.564+ caracteres) cada vez que el caché de Cloudflare
// expira (24h, Cache-Control: max-age=86400 en worker-ia/worker.js) proyecta gastar
// varias veces el presupuesto MENSUAL completo de voz -- ver el análisis con números en
// COORDINACION-IA/EN-USO.md. Antes (commit 2026-08-16) se bajó la prioridad del
// pregrabado a "respaldo" por un bug real: el catálogo de ENTONCES no cubría el banco
// genérico (poolPais), así que esas frases sonaban con Azure/voz nativa mientras las
// de FRASES_ARQ sonaban con el pregrabado -- mezcla de timbre a mitad de conversación.
// Esto NO se reintroduce ahora: scripts/gen-voces-elevenlabs.js genera cada mp3 de
// voces-el/ con el voice_id EXACTO del arquetipo de esa frase (mismo mapa VOZ_ARQ que usa
// el worker en vivo) -- pregrabado y en vivo usan la MISMA voz para el mismo arquetipo,
// así que preferir el pregrabado cuando existe no cambia qué se escucha, solo si se paga.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_MOTOR = readFileSync(join(raiz, 'voz-motor.js'), 'utf8');
const SRC_EL = readFileSync(join(raiz, 'voz-elevenlabs.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// Extrae _reproducirVoz(item){...} balanceando llaves (ignora strings/comentarios).
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

const REPRODUCIR = bloque(SRC_MOTOR, 'function _reproducirVoz(item){');

function correr(overrides) {
  const o = Object.assign({
    vozMejorada: true,
    VOCES_MANIFEST_EL: { map: {} },
    VOCES_MANIFEST: { map: {} },
    itemTexto: 'Hola, esto es una prueba.',
  }, overrides || {});
  const llamadas = [];
  const _vozArchivoEL = (item, durEst, id, miGen) => llamadas.push({ fn: 'archivoEL', id });
  const _vozElevenRuntime = (item, durEst, miGen, yaProboAzure, respaldo) => llamadas.push({ fn: 'enVivo', respaldo });
  let vozGen = 0, vozHablando = false, vozPrioActual = 0, vozTimerFin = null;
  const PRIO_VOZ = { AMBIENTE: 1, INFO: 2, NAV: 3, SEGURIDAD: 4 };
  const _durEstVoz = () => 2000;
  const mostrarBocadillo = () => {};
  const _pisteroHabla = () => {};

  const _vozSiguiente = () => {};
  const fn = new Function(
    'vozMejorada', 'VOCES_MANIFEST_EL', 'VOCES_MANIFEST', '_vozArchivoEL', '_vozElevenRuntime',
    'vozGen', 'vozHablando', 'vozPrioActual', 'vozTimerFin', 'PRIO_VOZ', '_durEstVoz',
    'mostrarBocadillo', '_pisteroHabla', '_vozSiguiente', 'setTimeout', 'clearTimeout',
    REPRODUCIR + '\nreturn _reproducirVoz;'
  );
  const _reproducirVoz = fn(
    o.vozMejorada, o.VOCES_MANIFEST_EL, o.VOCES_MANIFEST, _vozArchivoEL, _vozElevenRuntime,
    vozGen, vozHablando, vozPrioActual, vozTimerFin, PRIO_VOZ, _durEstVoz,
    mostrarBocadillo, _pisteroHabla, _vozSiguiente, setTimeout, clearTimeout
  );
  _reproducirVoz({ t: o.itemTexto, limpio: o.itemTexto, prio: PRIO_VOZ.INFO });
  return llamadas;
}

// --- La frase SÍ está en el catálogo pregrabado: debe usarlo, NO llamar en vivo ---
{
  const llamadas = correr({ VOCES_MANIFEST_EL: { map: { 'Hola, esto es una prueba.': 'abc123' } } });
  t('con pregrabado disponible: usa _vozArchivoEL, no _vozElevenRuntime', llamadas.length === 1 && llamadas[0].fn === 'archivoEL');
  t('le pasa el id correcto del manifest', llamadas[0].id === 'abc123');
}

// --- La frase NO está pregrabada (motivacional, por modo, etc.): sigue yendo en vivo, sin cambio ---
{
  const llamadas = correr({ VOCES_MANIFEST_EL: { map: {} } });
  t('sin pregrabado: sigue yendo a _vozElevenRuntime como antes', llamadas.length === 1 && llamadas[0].fn === 'enVivo');
}

// --- Sin manifest cargado todavía (fetch aún no resolvió): no debe reventar, va en vivo ---
{
  const llamadas = correr({ VOCES_MANIFEST_EL: null });
  t('manifest null (aún cargando): no revienta, cae a en vivo', llamadas.length === 1 && llamadas[0].fn === 'enVivo');
}

// --- El fallback de _vozArchivoEL ya NO apunta a Azure (muerto) ---
t('_vozArchivoEL ya no cae a _vozAzureRuntime en su fallback', !/fallback[\s\S]{0,120}_vozAzureRuntime/.test(SRC_EL));
t('_vozArchivoEL cae a _vozElevenRuntime si el pregrabado falla', /fallback[\s\S]{0,200}_vozElevenRuntime/.test(SRC_EL));
t('ese reintento en vivo no vuelve a rebotar a Azure (yaProboAzure=true)', /_vozElevenRuntime\(item, durEst, miGen, true, \{\}\)/.test(SRC_EL));

console.log(`  voz-pregrabado-prioridad.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
