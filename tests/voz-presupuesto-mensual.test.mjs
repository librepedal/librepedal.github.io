// Tope MENSUAL de caracteres para la voz de ElevenLabs (worker-ia/worker.js).
//
// Por qué existe: el worker ya tenía un tope DIARIO (120.000 caracteres) como freno anti-abuso,
// pero nada que proteja el acumulado del MES. Con el plan real (~US$20-22/mes, ~100-121k
// caracteres/mes), 120.000 en un solo día es casi TODO el plan — si el tope diario se
// disparara un par de veces en el mes, Pistero se quedaba sin caracteres y caía a la voz
// robótica en silencio para todos, el mismo patrón de falla silenciosa que la cuota de
// Firestore. Este test prueba el comportamiento real del código, extraído de worker-ia/worker.js.
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

const MAX_M = SRC_FILE.match(/const MAX_CHARS_MES\s*=\s*(\d+)/);
if (!MAX_M) { console.log('  FALLA: falta MAX_CHARS_MES'); process.exit(1); }
const MAX_CHARS_MES = Number(MAX_M[1]);

const SRC = 'const MAX_CHARS_MES = ' + MAX_CHARS_MES + ';\n' + bloque('async function _presupuestoMensual(env, chars)');

function montarKV(inicial = {}) {
  const store = new Map(Object.entries(inicial));
  const puts = [];
  return {
    kv: {
      get: async (k) => (store.has(k) ? store.get(k) : null),
      put: async (k, v, opts) => { store.set(k, v); puts.push({ k, v, opts }); },
    },
    store, puts,
  };
}

function montar({ kv } = {}) {
  const fn = new Function('Date', SRC + '\nreturn _presupuestoMensual;');
  return fn(Date);
}

// ---- 1) Primera llamada del mes, bien por debajo del tope: permite y guarda el acumulado ----
{
  const { kv, store } = montarKV();
  const _presupuestoMensual = montar();
  const ok1 = await _presupuestoMensual({ VOZ_CUOTA: kv }, 500);
  debe('permite la primera llamada, bien bajo el tope', ok1 === true);
  const mes = new Date().toISOString().slice(0, 7);
  debe('guardó el acumulado bajo la clave del mes actual', store.get('presupuesto-mes:' + mes) === '500');
}

// ---- 2) Acumula entre llamadas del mismo mes (no resetea cada vez) ----
{
  const { kv, store } = montarKV();
  const _presupuestoMensual = montar();
  await _presupuestoMensual({ VOZ_CUOTA: kv }, 1000);
  await _presupuestoMensual({ VOZ_CUOTA: kv }, 2000);
  const mes = new Date().toISOString().slice(0, 7);
  debe('el acumulado suma entre llamadas, no se pisa', store.get('presupuesto-mes:' + mes) === '3000');
}

// ---- 3) Si el acumulado + esta llamada supera el tope: RECHAZA, y no queda contado ----
{
  const mes = new Date().toISOString().slice(0, 7);
  const { kv, store } = montarKV({ ['presupuesto-mes:' + mes]: String(MAX_CHARS_MES - 100) });
  const _presupuestoMensual = montar();
  const resultado = await _presupuestoMensual({ VOZ_CUOTA: kv }, 500); // 500 > los 100 que quedan
  debe('rechaza cuando se pasaría del tope mensual', resultado === false);
  debe('NO queda contado el intento rechazado (no se suma lo que no se sirvió)',
       store.get('presupuesto-mes:' + mes) === String(MAX_CHARS_MES - 100));
}

// ---- 4) Justo en el límite (ni un caracter más): pasa ----
{
  const mes = new Date().toISOString().slice(0, 7);
  const { kv, store } = montarKV({ ['presupuesto-mes:' + mes]: String(MAX_CHARS_MES - 500) });
  const _presupuestoMensual = montar();
  const resultado = await _presupuestoMensual({ VOZ_CUOTA: kv }, 500); // exacto al borde
  debe('llegar EXACTO al tope se permite (no es off-by-one)', resultado === true);
  debe('queda en el tope exacto', store.get('presupuesto-mes:' + mes) === String(MAX_CHARS_MES));
}

// ---- 5) El tope mensual es coherente con un plan real de ~100-121k/mes: nunca mayor ----
{
  debe('MAX_CHARS_MES no excede un plan Creator típico (~121.000/mes)', MAX_CHARS_MES <= 121000);
  debe('MAX_CHARS_MES deja margen real (no está pegado al límite del plan)', MAX_CHARS_MES <= 110000);
}

// ---- 6) Sin VOZ_CUOTA configurado (KV no disponible): no bloquea por un problema nuestro ----
{
  const _presupuestoMensual = montar();
  const resultado = await _presupuestoMensual({}, 999999);
  debe('sin KV, no se bloquea la voz (falla abierto, no cerrado)', resultado === true);
}

// ---- 7) Si el KV explota (excepción): tampoco bloquea, mismo criterio que el resto del worker ----
{
  const kvQueFalla = { get: async () => { throw new Error('KV caído'); }, put: async () => { throw new Error('KV caído'); } };
  const _presupuestoMensual = montar();
  const resultado = await _presupuestoMensual({ VOZ_CUOTA: kvQueFalla }, 999999);
  debe('un KV que falla no deja a Pistero mudo', resultado === true);
}

console.log(`\n${ok} ok, ${fail} fallas — voz-presupuesto-mensual.test.mjs`);
if (fail > 0) process.exit(1);
