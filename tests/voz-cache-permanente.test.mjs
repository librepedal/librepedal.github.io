// Caché PERMANENTE de audio en KV (worker-ia/worker.js), 2026-09-03.
// Por qué existe: el análisis de costo real (ver COORDINACION-IA/EN-USO.md) mostró que
// el caché de Cloudflare (Cache API) dura solo 24h (Cache-Control: max-age=86400) --
// con el catálogo real de Pistero (miles de combinaciones únicas de texto+voz), eso
// significa que el catálogo se "recalienta" (se vuelve a pagar) todos los días con el
// uso agregado de los usuarios, proyectando un gasto varias veces mayor al presupuesto
// MENSUAL completo. La solución no es pre-generar todo de antemano (se paga por
// combinaciones que tal vez nadie pide) sino hacer que el caché no expire: se usa el
// mismo KV (VOZ_CUOTA) ya vinculado al worker, sin `expirationTtl` -- la primera vez
// que se pide una combinación exacta de texto+voz+parámetros se paga, nunca más.
// Este test verifica la ESTRUCTURA real del código (extraído, no reimplementado):
// Node no puede ejecutar el runtime de Cloudflare Workers (crypto.subtle en top-level
// await, KV, Cache API) sin mockear todo el entorno, así que se sigue el mismo patrón
// que tests/ciclista-adelante.test.mjs para verificar el worker.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER = readFileSync(join(raiz, 'worker-ia', 'worker.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

t('existe la función de clave de caché permanente', /async function _claveCachePermanente/.test(WORKER));
t('la clave del caché depende de voz+modelo+parámetros, no solo del texto (dos voces distintas no comparten audio)',
  /_claveCachePermanente\(texto, voiceId, modelo, stab, style, vel\)/.test(WORKER));
t('usa SHA-1 real (Web Crypto, disponible en el runtime de Workers)', /crypto\.subtle\.digest\("SHA-1"/.test(WORKER));

// --- El chequeo de KV va ANTES del gasto (no debe contar contra el presupuesto si ya está cacheado) ---
const iBloqueEltts = WORKER.indexOf('const elText = url.searchParams.get("eltts")');
const iCacheGet = WORKER.indexOf('await env.VOZ_CUOTA.get(cacheKeyKV', iBloqueEltts);
const iPresupuestoDiario = WORKER.indexOf('_presupuestoDiario(env, String(elText).length)', iBloqueEltts);
t('el chequeo de caché permanente existe en el bloque eltts', iBloqueEltts > 0 && iCacheGet > iBloqueEltts);
t('el chequeo de caché va ANTES de tocar el presupuesto diario (un hit no debe gastar cuota)',
  iCacheGet > 0 && iPresupuestoDiario > 0 && iCacheGet < iPresupuestoDiario);

// --- Un hit de caché responde SIN llamar a ElevenLabs ---
const bloqueHit = WORKER.slice(iCacheGet, WORKER.indexOf('if (!(await _presupuestoDiario', iBloqueEltts));
t('un hit de KV responde directo (return), sin seguir al fetch de ElevenLabs', /return respCache;/.test(bloqueHit));
t('un hit de KV también alimenta el caché rápido de 24h (Cache API)', /cache\.put\(request, respCache\.clone\(\)\)/.test(bloqueHit));

// --- Si KV falla, no rompe el flujo (sigue generando en vivo normalmente) ---
const bloqueConTry = WORKER.slice(WORKER.lastIndexOf('try {', iCacheGet), iCacheGet + 600);
t('el chequeo de KV está envuelto en try/catch (si KV falla, no bloquea la voz)',
  /try \{[\s\S]{0,60}const cachedBuf = await env\.VOZ_CUOTA\.get[\s\S]{0,500}catch \(e\) \{\}/.test(bloqueConTry));

// --- Tras generar con éxito, se guarda en KV SIN expirationTtl (permanente, a diferencia
//     de los otros usos de KV en este archivo, que sí tienen TTL de cuota/rate-limit) ---
const iPutKV = WORKER.indexOf('env.VOZ_CUOTA.put(cacheKeyKV, buf)');
t('tras generar, se guarda en KV el audio nuevo', iPutKV > 0);
const lineaPut = WORKER.slice(iPutKV - 5, iPutKV + 80);
t('el guardado NO tiene expirationTtl (permanente, no expira como el resto de las cuotas)',
  !/expirationTtl/.test(lineaPut));
t('el guardado no bloquea la respuesta al usuario (ctx.waitUntil, no await)',
  /ctx\.waitUntil\(env\.VOZ_CUOTA\.put\(cacheKeyKV, buf\)/.test(WORKER));

console.log(`  voz-cache-permanente.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
