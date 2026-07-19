// Test del clasificador del blindaje de listeners Firestore (index.html, parche a
// onSnapshot). Un error de "permiso denegado" del arranque (carrera auth anon->token)
// es BENIGNO -> se re-engancha el listener solo, no se reporta. Cualquier otro error
// es REAL -> se reporta a Sentry. Este test blinda esa decisión.
// Corre con: node tests/firestore-blindaje.test.mjs   (sin dependencias)

// MISMA lógica que el parche en index.html (fuente de verdad testeada).
export function esBenigno(err) {
  return !!(err && (err.code === 'permission-denied'
    || /insufficient permissions|Missing or insufficient/i.test(String(err.message || err))));
}

let pass = 0, fail = 0;
function eq(desc, got, exp) {
  if (got === exp) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, '-> esperaba', exp, 'obtuvo', got); }
}

console.log('Blindaje Firestore — clasificador de errores:');
// BENIGNOS (carrera de auth del arranque) -> re-enganchar, NO reportar
eq('code permission-denied -> benigno', esBenigno({ code: 'permission-denied' }), true);
eq('mensaje "Missing or insufficient permissions" -> benigno', esBenigno({ message: 'Missing or insufficient permissions.' }), true);
eq('FirebaseError con ese texto -> benigno', esBenigno(new Error('FirebaseError: Missing or insufficient permissions.')), true);

// REALES (hay que reportarlos, no ocultarlos)
eq('code unavailable (red caida real) -> NO benigno', esBenigno({ code: 'unavailable' }), false);
eq('error de codigo cualquiera -> NO benigno', esBenigno({ message: 'Cannot read properties of undefined' }), false);
eq('null -> NO benigno', esBenigno(null), false);
eq('undefined -> NO benigno', esBenigno(undefined), false);

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
