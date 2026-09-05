// Freno anti-ráfaga por IP (_limiteIP en worker-ia/worker.js), movido de KV a la Cache
// API el 2026-09-04. Por qué existe este test: hasta ahora este freno vivía en el KV
// VOZ_CUOTA y se disparaba en TODA síntesis de voz sin excepción -- era la mayor fuente
// de escrituras repetidas y llevó al límite gratis diario de Cloudflare KV varias veces
// esta semana (alertas reales: 28-ago, 30-ago x2, 2-sep, "50% reached"). La Cache API no
// cuenta contra ese límite. Este test verifica que el comportamiento (dejar pasar hasta
// REQS_POR_MIN por minuto, después bloquear) sigue siendo el mismo con el nuevo backend.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'worker-ia', 'worker.js'), 'utf8');

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

const FN = bloque('async function _limiteIP(env, ip) {');

t('ya NO usa env.VOZ_CUOTA (se movió a Cache API)', !FN.includes('VOZ_CUOTA'));
t('sigue usando caches.default (Cache API)', FN.includes('caches.default'));

// Mock de la Cache API real de Cloudflare Workers: un Map en memoria simula el
// almacenamiento por key (misma URL sintética que arma _limiteIP), con match/put async.
function mockCaches() {
  const store = new Map();
  return {
    default: {
      match: async (req) => store.has(req.url) ? store.get(req.url).clone() : undefined,
      put: async (req, resp) => { store.set(req.url, resp.clone()); },
    },
  };
}

function construir(REQS_POR_MIN, caches, DateMock) {
  return new Function('REQS_POR_MIN', 'caches', 'Request', 'Response', 'Date',
    FN + '\nreturn _limiteIP;'
  )(REQS_POR_MIN, caches, Request, Response, DateMock || Date);
}

// --- Caso básico: deja pasar hasta el tope, después bloquea ---
{
  const _limiteIP = construir(3, mockCaches());
  t('1ra llamada de una IP nueva: permite', await _limiteIP({}, '1.2.3.4') === true);
  t('2da llamada, todavía bajo el tope (3/min): permite', await _limiteIP({}, '1.2.3.4') === true);
  t('3ra llamada, completa el cupo: permite', await _limiteIP({}, '1.2.3.4') === true);
  t('4ta llamada, se pasó del tope: bloquea', await _limiteIP({}, '1.2.3.4') === false);
  t('5ta llamada, sigue bloqueada', await _limiteIP({}, '1.2.3.4') === false);
}

// --- Dos IPs distintas no se pisan entre sí ---
{
  const _limiteIP = construir(2, mockCaches());
  t('IP A: 1ra y 2da pasan', (await _limiteIP({}, '9.9.9.1') === true) && (await _limiteIP({}, '9.9.9.1') === true));
  t('IP A: 3ra se bloquea', await _limiteIP({}, '9.9.9.1') === false);
  t('IP B nueva: NO hereda el bloqueo de la IP A', await _limiteIP({}, '9.9.9.2') === true);
}

// --- Minutos distintos: la ventana resetea sola (misma idea que el TTL de 90s del KV viejo) ---
{
  const caches = mockCaches();
  const enMinuto = (ms) => construir(1, caches, { now: () => ms });
  t('minuto 0: 1ra pasa', await enMinuto(0)({}, '7.7.7.7') === true);
  t('mismo minuto 0: 2da se bloquea (ya usó su cupo de 1/min)', await enMinuto(30000)({}, '7.7.7.7') === false);
  t('minuto siguiente (60000ms después): resetea, vuelve a permitir', await enMinuto(60000)({}, '7.7.7.7') === true);
}

// --- Sin IP: no hay nada que frenar (mismo criterio que el código viejo) ---
{
  const _limiteIP = construir(1, mockCaches());
  t('sin IP (null): permite sin tocar el cache', await _limiteIP({}, null) === true);
  t('sin IP (undefined): permite', await _limiteIP({}, undefined) === true);
}

// --- Si la Cache API falla, no se bloquea la voz por un problema nuestro (fail-open) ---
{
  const cachesRotas = { default: { match: async () => { throw new Error('boom'); }, put: async () => {} } };
  const _limiteIP = construir(1, cachesRotas);
  t('Cache API rota: falla ABIERTO, no bloquea voz', await _limiteIP({}, '1.1.1.1') === true);
}

console.log(`  voz-limite-ip-cache-api.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
