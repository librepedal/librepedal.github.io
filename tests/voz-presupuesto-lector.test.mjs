// Tope MENSUAL propio para la herramienta "leer respuestas largas de Claude a Inty"
// (worker-ia/worker.js, PROTOCOLO-DE-TRABAJO-INTY.md §9, 2026-08-27).
//
// Por qué existe: el endpoint /eltts ya tenía un tope mensual (MAX_CHARS_MES) para la voz
// de Pistero con los ciclistas reales. Esta herramienta nueva es un uso PERSONAL de Inty,
// sin relación con la app -- si compartiera el mismo balde, un mes en que Inty la usa mucho
// podría dejar a Pistero mudo para usuarios reales sin aviso, el mismo patrón de falla
// silenciosa que ya pasó con Firestore y con la voz antes. Este test prueba el
// comportamiento real extraído de worker-ia/worker.js: presupuesto SEPARADO, mismo criterio
// de fallar-abierto que el resto del worker.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SRC_FILE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'worker-ia', 'worker.js'), 'utf8');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

function bloque(desde) {
  const i = SRC_FILE.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré -> ' + desde); process.exit(1); }
  let prof = 0, q = null;
  for (let k = SRC_FILE.indexOf('{', i); k < SRC_FILE.length; k++) {
    const c = SRC_FILE[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && SRC_FILE[k + 1] === '/') { k = SRC_FILE.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return SRC_FILE.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

const MAX_M = SRC_FILE.match(/const MAX_CHARS_MES_LECTOR\s*=\s*(\d+)/);
if (!MAX_M) { console.log('  FALLA: falta MAX_CHARS_MES_LECTOR'); process.exit(1); }
const MAX_CHARS_MES_LECTOR = Number(MAX_M[1]);

const SRC = 'const MAX_CHARS_MES_LECTOR = ' + MAX_CHARS_MES_LECTOR + ';\n' + bloque('async function _presupuestoMensualLector(env, chars)');

function montarKV(inicial = {}) {
  const store = new Map(Object.entries(inicial));
  return { kv: { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => { store.set(k, v); } }, store };
}
function montar() {
  const fn = new Function('Date', SRC + '\nreturn _presupuestoMensualLector;');
  return fn(Date);
}

// ---- 1) Primera llamada del mes, bajo el tope: permite y guarda bajo su propia clave ----
{
  const { kv, store } = montarKV();
  const f = montar();
  const permitido = await f({ VOZ_CUOTA: kv }, 400);
  debe('permite la primera llamada bajo el tope', permitido === true);
  const mes = new Date().toISOString().slice(0, 7);
  debe('guarda bajo clave PROPIA (presupuesto-mes-lector), no la de Pistero', store.get('presupuesto-mes-lector:' + mes) === '400');
  debe('no toca la clave de Pistero', !store.has('presupuesto-mes:' + mes));
}

// ---- 2) Rechaza al pasarse del tope, sin contar lo rechazado ----
{
  const mes = new Date().toISOString().slice(0, 7);
  const { kv, store } = montarKV({ ['presupuesto-mes-lector:' + mes]: String(MAX_CHARS_MES_LECTOR - 50) });
  const f = montar();
  const resultado = await f({ VOZ_CUOTA: kv }, 200);
  debe('rechaza cuando se pasaría del tope del lector', resultado === false);
  debe('no queda contado el intento rechazado', store.get('presupuesto-mes-lector:' + mes) === String(MAX_CHARS_MES_LECTOR - 50));
}

// ---- 3) El tope del lector es bien más chico que el de Pistero (uso personal, no de la app) ----
{
  const MAX_PISTERO = Number((SRC_FILE.match(/const MAX_CHARS_MES\s*=\s*(\d+)/) || [])[1]);
  debe('el tope del lector es menor que el de Pistero (no compite por el mismo volumen)', MAX_CHARS_MES_LECTOR < MAX_PISTERO);
}

// ---- 4) Sin KV / KV que falla: falla abierto, mismo criterio que el resto del worker ----
{
  const f = montar();
  debe('sin VOZ_CUOTA no bloquea', await f({}, 999999) === true);
  const kvQueFalla = { get: async () => { throw new Error('KV caído'); }, put: async () => { throw new Error('KV caído'); } };
  debe('KV que falla no bloquea', await f({ VOZ_CUOTA: kvQueFalla }, 999999) === true);
}

// ---- 5) El endpoint /eltts elige el presupuesto según ?lector=1 (rama esLector) ----
{
  const bloqueHandler = bloque('const elText = url.searchParams.get("eltts")');
  debe('la rama esLector existe en el handler de /eltts', /esLector/.test(bloqueHandler));
  debe('cuando es lector, llama a _presupuestoMensualLector (no al de Pistero)', /if\s*\(esLector\)\s*\{[\s\S]*_presupuestoMensualLector/.test(bloqueHandler));
  debe('cuando NO es lector, sigue llamando a _presupuestoMensual (comportamiento de Pistero intacto)', /else\s*\{[\s\S]*_presupuestoMensual\(env/.test(bloqueHandler));
}

// ---- 6) El lector pide un mp3 más liviano (32kbps) -- Pistero sigue en 128kbps ----
// Motivo: el lector embebe el audio como base64 en una página estática (16MB de tope
// total), a diferencia de Pistero que solo lo reproduce en la app -- sin esto, unas
// pocas respuestas largas llenarían la página entera.
{
  const bloqueHandler = bloque('const elText = url.searchParams.get("eltts")');
  debe('define un formato de salida más liviano cuando esLector', /esLector\s*\?\s*"mp3_22050_32"\s*:\s*"mp3_44100_128"/.test(bloqueHandler));
  debe('el formato se manda a ElevenLabs como output_format en la URL', /output_format=["'`]\s*\+\s*formatoSalida/.test(bloqueHandler));
}

console.log(`\n${ok} ok, ${fail} fallas — voz-presupuesto-lector.test.mjs`);
if (fail > 0) process.exit(1);
