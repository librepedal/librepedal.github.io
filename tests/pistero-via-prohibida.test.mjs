// Filtro de servidor: Pistero (chat IA) no debe recomendar autopistas/vías donde bicis
// o peatones no pueden circular. Por qué existe (hub #199, 2026-09-04, reporte real de
// Tundra): la regla 9 del prompt ya prohibía esto explícitamente, pero el modelo
// gratis (Llama 3.3 70b) igual recomendó la Ruta 68 a un ciclista real preguntando la
// ruta más segura Santiago-Valparaíso. Mismo patrón que esFugaDePrompt (blindaje
// anti-prompt-injection, mismo día): la instrucción de texto sola no alcanza con un
// modelo abierto/gratis -- hace falta un filtro de servidor que no dependa de que el
// modelo obedezca.
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
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return SRC.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

const LISTA = SRC.slice(SRC.indexOf('const VIAS_PROHIBIDAS_BICI'), SRC.indexOf(';', SRC.indexOf('const VIAS_PROHIBIDAS_BICI')) + 1);
const FN = bloque('function recomiendaViaProhibida(');

const fn = new Function(LISTA + '\n' + FN + '\nreturn recomiendaViaProhibida;')();

// --- El caso real reportado: ciclista pregunta ruta, el modelo recomienda Ruta 68 sin advertir ---
t('ciclista (actividad=ciclismo): recomendar la Ruta 68 sin advertencia -> SE BLOQUEA',
  fn('La ruta más rápida es por la Ruta 68, mantén una velocidad prudente y respeta los límites.', 'ciclismo') === true);
t('sin actividad especificada (default ciclista): mismo bloqueo', fn('Toma la Ruta 68 hasta Valparaíso.', undefined) === true);
t('MTB: mismo bloqueo (tampoco va motorizado)', fn('La Costanera Norte te deja directo.', 'mtb') === true);
t('trekking (a pie): mismo bloqueo', fn('Puedes ir por la Autopista Central.', 'trekking') === true);

// --- En moto/auto SÍ es una recomendación válida ---
t('moto: NO se bloquea (esas vías son normales en moto/auto)',
  fn('La ruta más rápida es por la Ruta 68, mantén una velocidad prudente.', 'moto') === false);

// --- SIEMPRE se bloquea si menciona el nombre, incluso si el propio texto "advierte" ---
// (2026-09-04, probado en vivo: el modelo puede redactar la advertencia lejos de la
// mención específica -- "evita vías prohibidas... toma la Ruta 68, pero no la autopista,
// sino la paralela" -- técnicamente matizado, pero ambiguo para un lector rápido. En
// seguridad física un falso positivo sale más barato que un falso negativo).
t('aunque el texto SÍ diga que está prohibida: se bloquea igual (ambiguo es riesgoso)',
  fn('La Ruta 68 está prohibida para bicicletas, mejor toma la ruta paralela.', 'ciclismo') === true);
t('caso real reproducido en producción: advertencia genérica lejos de la mención específica -> se bloquea',
  fn('Evita vías donde esté prohibido el tránsito de bicicletas. Una buena opción es tomar la Ruta 68, pero no la autopista concesionada, sino la ruta paralela.', 'ciclismo') === true);

// --- Sin mencionar ninguna vía prohibida: no hay nada que bloquear ---
t('respuesta normal sin autopistas: no se toca', fn('Sigue por la ruta costera, es hermosa y segura.', 'ciclismo') === false);

console.log(`  pistero-via-prohibida.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
