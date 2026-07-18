// Test de la LÓGICA de prioridad de voz de Pistero.
// Objetivo: que los avisos NO se pisen. Regla: un aviso más importante
// interrumpe a uno menos importante; uno igual o menos importante espera en cola;
// lo ambiental (bromas) se descarta si hay algo sonando.
// Corre con: node tests/voz-prioridad.test.mjs   (sin dependencias)
//
// Esta es la MISMA lógica que se inyecta en index.html (función decidirVoz).
// Vive acá como fuente de verdad testeada.

// Niveles (mayor = más importante)
export const PRIO = { AMBIENTE: 1, INFO: 2, NAV: 3, SEGURIDAD: 4 };

// Decide qué hacer con una frase nueva dado lo que suena ahora.
// actualPrio: prioridad de lo que está sonando, o 0/null si no hay nada.
// Devuelve: 'interrumpe' (cortar lo actual y hablar ya) | 'encola' (esperar turno) | 'descarta' (no hablar).
export function decidirVoz(actualPrio, nuevaPrio) {
  const suena = actualPrio && actualPrio > 0;
  if (!suena) return 'interrumpe';               // no hay nada sonando -> habla ya
  if (nuevaPrio === PRIO.AMBIENTE) return 'descarta'; // ambiental nunca espera ni pisa
  if (nuevaPrio > actualPrio) return 'interrumpe';    // más importante -> corta e impone
  return 'encola';                               // igual o menos importante -> espera turno
}

// ---------------- Tests ----------------
let pass = 0, fail = 0;
function eq(desc, got, exp) {
  if (got === exp) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, '-> esperaba', exp, 'obtuvo', got); }
}

console.log('Prioridad de voz:');
// Nada sonando: siempre habla
eq('silencio + navegación -> habla', decidirVoz(0, PRIO.NAV), 'interrumpe');
eq('silencio + ambiente -> habla', decidirVoz(0, PRIO.AMBIENTE), 'interrumpe');

// EL BUG QUE REPORTÓ INTY: navegación pisaba TODO. Ahora seguridad NO se pisa.
eq('SEGURIDAD sonando + navegación -> navegación espera (no pisa la seguridad)', decidirVoz(PRIO.SEGURIDAD, PRIO.NAV), 'encola');
eq('SEGURIDAD sonando + info -> info espera', decidirVoz(PRIO.SEGURIDAD, PRIO.INFO), 'encola');

// Navegación interrumpe lo menos importante (un giro sí debe cortar una anécdota)
eq('info sonando + navegación -> navegación corta la info', decidirVoz(PRIO.INFO, PRIO.NAV), 'interrumpe');
eq('ambiente sonando + navegación -> navegación corta', decidirVoz(PRIO.AMBIENTE, PRIO.NAV), 'interrumpe');

// Dos avisos del MISMO nivel NO se pisan: el segundo espera
eq('navegación sonando + otra navegación -> espera (no se pisan dos giros)', decidirVoz(PRIO.NAV, PRIO.NAV), 'encola');
eq('info sonando + otra info -> espera', decidirVoz(PRIO.INFO, PRIO.INFO), 'encola');

// Seguridad interrumpe cualquier cosa
eq('navegación sonando + SEGURIDAD -> corta todo (una caída manda)', decidirVoz(PRIO.NAV, PRIO.SEGURIDAD), 'interrumpe');
eq('info sonando + SEGURIDAD -> corta', decidirVoz(PRIO.INFO, PRIO.SEGURIDAD), 'interrumpe');

// Ambiental se descarta si hay algo sonando (no molesta ni espera)
eq('info sonando + ambiente -> se descarta', decidirVoz(PRIO.INFO, PRIO.AMBIENTE), 'descarta');
eq('navegación sonando + ambiente -> se descarta', decidirVoz(PRIO.NAV, PRIO.AMBIENTE), 'descarta');

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
