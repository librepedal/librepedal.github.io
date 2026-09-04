// El "plan B" de voz cuando ElevenLabs falla (reporte real de Inty, 2026-09-04:
// "recuerdo que tenía un plan B para cuando se cayeran las voces"). Antes de este fix, ese
// plan B era Azure -- pero Azure lleva semanas muerto (clave expirada, 401 siempre), así
// que ese paso era un salto inútil que terminaba cayendo igual a la voz nativa robótica.
// Ahora el respaldo real es Edge TTS (gratis, sin clave, ya construido para el tier
// free): si ElevenLabs falla por lo que sea -- presupuesto agotado, red, error del
// worker -- CUALQUIER usuario, premium incluido, cae a una voz decente en vez de la
// robótica de una vez.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'voz-motor.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// Extrae _vozElevenRuntime(...){...} balanceando llaves (ignora strings/comentarios).
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

t('el fallback ya NO menciona _vozAzureRuntime en absoluto (Azure esta muerto, ver comentario)',
  !bloque(SRC, 'function _vozElevenRuntime(').includes('_vozAzureRuntime'));
t('_vozAzureRuntime sigue definida (no se borra, por si Azure algun dia vuelve) pero sin llamadas activas',
  /function _vozAzureRuntime\(/.test(SRC) && (SRC.match(/_vozAzureRuntime\(/g) || []).length === 1);

const ELEVEN = bloque(SRC, 'function _vozElevenRuntime(');

function correrFallback(overrides) {
  const o = Object.assign({ idEL: null, idAz: null }, overrides || {});
  const llamadas = [];
  const _vozArchivoEL = (item, durEst, id) => llamadas.push({ fn: 'archivoEL', id });
  const _vozArchivo = (item, durEst, id) => llamadas.push({ fn: 'archivo', id });
  const _vozEdgeRuntime = () => llamadas.push({ fn: 'edge' });
  const _vozNativaOWeb = () => llamadas.push({ fn: 'nativa' });
  let vozGen = 1, vozTimerFin = null, vozNeuralAudio = null, pisteroGenero = 'l';
  // Audio falso: dispara onerror de inmediato, como si ElevenLabs fallara (red/503/etc).
  function AudioFalso() {
    this.onerror = null; this.onloadedmetadata = null; this.onplaying = null; this.onended = null;
    this.play = () => { setTimeout(() => { if (this.onerror) this.onerror(); }, 0); return { catch: () => {} }; };
  }
  const IA_URL = 'https://librepedal-ia.librepedal.workers.dev';
  const _vozELid = () => 'voz123';
  const _velArq = () => 1;
  const _pisteroHabla = () => {};
  const _durEstVoz = () => 2000;

  const fn = new Function(
    'Audio', '_vozArchivoEL', '_vozArchivo', '_vozEdgeRuntime', '_vozNativaOWeb',
    'vozGen', 'vozTimerFin', '_vozNeuralAudio', 'pisteroGenero', 'IA_URL', '_vozELid', '_velArq', '_pisteroHabla',
    ELEVEN + '\nreturn _vozElevenRuntime;'
  );
  const _vozElevenRuntime = fn(
    AudioFalso, _vozArchivoEL, _vozArchivo, _vozEdgeRuntime, _vozNativaOWeb,
    vozGen, vozTimerFin, vozNeuralAudio, pisteroGenero, IA_URL, _vozELid, _velArq, _pisteroHabla
  );
  _vozElevenRuntime({ t: 'hola', limpio: 'hola' }, 2000, vozGen, false, { idEL: o.idEL, idAz: o.idAz });
  return llamadas;
}

// --- ElevenLabs falla, sin pregrabado disponible: debe caer a Edge TTS, no a Azure ni a nativa directo ---
{
  const llamadas = await new Promise((resolve) => {
    const r = correrFallback({});
    setTimeout(() => resolve(r), 20); // el onerror del Audio falso dispara async (setTimeout 0)
  });
  t('sin pregrabado: el fallback real llama a _vozEdgeRuntime', llamadas.some((x) => x.fn === 'edge'));
  t('NO salta directo a la voz nativa (Edge TTS es el paso intermedio real ahora)', !llamadas.some((x) => x.fn === 'nativa'));
}

// --- Si hay pregrabado disponible, sigue ganando el pregrabado (no cambia esa prioridad) ---
{
  const llamadas = await new Promise((resolve) => {
    const r = correrFallback({ idEL: 'abc123' });
    setTimeout(() => resolve(r), 20);
  });
  t('con pregrabado EL disponible: sigue usando el pregrabado antes que Edge TTS', llamadas.some((x) => x.fn === 'archivoEL' && x.id === 'abc123'));
}

console.log(`  voz-plan-b-edge.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
