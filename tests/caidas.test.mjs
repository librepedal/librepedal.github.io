// Test de la decisión más delicada de toda la app: tras un golpe fuerte,
// ¿la persona quedó quieta (caída) o siguió andando (bache)?
// Corre con: node tests/caidas.test.mjs   (sin dependencias)
//
// Por qué existe: hasta v7.02 esa decisión se tomaba leyendo el NÚMERO DE VELOCIDAD
// QUE SE VE EN PANTALLA, y eso fallaba en las dos direcciones:
//
//   1. FALSO NEGATIVO (grave): la velocidad viene de una ventana de 10-15s de
//      posiciones GPS, así que a los 3s de chocar a 30 km/h todavía marcaba ~30.
//      El sistema creía que seguías andando y NO avisaba una caída real.
//   2. FALSO POSITIVO: sin señal GPS el texto es "--", que parseFloat convertía
//      en 0 -> creía que estabas quieto y disparaba la alarma sin motivo.
//
// Ahora manda el acelerómetro, que no tiene retardo. Este test extrae la función
// REAL desde index.html (no una copia) para que no puedan divergir.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

// Saca del index la constante y la función tal cual están en producción.
const umbral = html.match(/const CRASH_MOV_QUIETO\s*=\s*([\d.]+)/);
const fuente = html.match(/function _decidirQuietudCaida\(muestrasMov, velocidadGps\)\{[\s\S]*?\n\}/);
if (!umbral || !fuente) {
  console.log('✗ No pude extraer _decidirQuietudCaida / CRASH_MOV_QUIETO de index.html');
  console.log('  (¿les cambiaron el nombre? este test quedaría verde sin probar nada, así que falla a propósito)');
  process.exit(1);
}
const CRASH_MOV_QUIETO = parseFloat(umbral[1]);
const decidir = new Function('CRASH_MOV_QUIETO', fuente[0] + '; return _decidirQuietudCaida;')(CRASH_MOV_QUIETO);

let pass = 0, fail = 0;
function eq(desc, got, exp) {
  if (got === exp) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, '-> esperaba', exp, 'y dio', got); }
}
const repetir = (v, n) => Array.from({ length: n }, () => v);

console.log(`Umbral de quietud en uso: ${CRASH_MOV_QUIETO} g\n`);

console.log('EL ACELERÓMETRO MANDA:');
eq('quieto en el suelo tras el golpe -> CAÍDA',
   decidir(repetir(0.03, 40), 0), 'caida');
eq('CAÍDA REAL A VELOCIDAD: quieto aunque el GPS siga marcando 30 km/h (el bug que se arregló)',
   decidir(repetir(0.04, 40), 30), 'caida');
eq('siguió pedaleando tras un bache -> NO es caída',
   decidir(repetir(0.8, 40), 0), 'siguemoviendose');
eq('un solo movimiento fuerte entre muchos quietos -> NO es caída (se mira el máximo)',
   decidir([0.02, 0.03, 0.02, 0.9, 0.02, 0.03], 0), 'siguemoviendose');
eq('movimiento justo en el límite -> se considera quieto',
   decidir(repetir(CRASH_MOV_QUIETO, 10), 0), 'caida');
eq('movimiento apenas sobre el límite -> se movió',
   decidir(repetir(CRASH_MOV_QUIETO + 0.01, 10), 0), 'siguemoviendose');

console.log('\nSIN ACELERÓMETRO ÚTIL, SE CAE AL GPS:');
eq('pocas muestras + GPS detenido -> CAÍDA',
   decidir([0.02, 0.02], 0), 'caida');
eq('pocas muestras + GPS con velocidad -> no es caída',
   decidir([0.02, 0.02], 25), 'siguemoviendose');
eq('sin muestras y sin GPS (velocidad desconocida) -> SIN DATOS, y avisa igual',
   decidir([], null), 'sindatos');
eq('GPS sin señal ya NO se confunde con estar detenido',
   decidir([], undefined), 'sindatos');
eq('velocidad basura (NaN) -> sin datos, no se asume quieto',
   decidir([], NaN), 'sindatos');

console.log('\nBORDES:');
eq('justo bajo el mínimo de muestras (4) usa GPS',
   decidir(repetir(0.9, 4), 0), 'caida');
eq('justo en el mínimo de muestras (5) ya usa el acelerómetro',
   decidir(repetir(0.9, 5), 0), 'siguemoviendose');

// ---- Filtro de "¿venías andando?" ----
// Nació de un caso REAL: a una amiga de Inty se le cayó el teléfono al suelo con la
// app abierta y saltó la alerta. Después del impacto, un teléfono en el piso y un
// ciclista tirado se ven idénticos (golpe + quietud); lo único que los separa es que
// el ciclista venía en movimiento.
const umbralVel = html.match(/const CRASH_VEL_MINIMA\s*=\s*([\d.]+)/);
const fuenteVel = html.match(/function _impactoEsDeCiclista\(velPrevia\)\{[\s\S]*?\n\}/);
if (!umbralVel || !fuenteVel) {
  console.log('\n✗ No pude extraer _impactoEsDeCiclista / CRASH_VEL_MINIMA de index.html');
  process.exit(1);
}
const CRASH_VEL_MINIMA = parseFloat(umbralVel[1]);
const esDeCiclista = new Function('CRASH_VEL_MINIMA', fuenteVel[0] + '; return _impactoEsDeCiclista;')(CRASH_VEL_MINIMA);

console.log(`\n¿VENÍA ANDANDO? (umbral: ${CRASH_VEL_MINIMA} km/h)`);
eq('TELÉFONO QUE SE CAE AL SUELO estando detenido -> se ignora (caso real 2026-07-20)',
   esDeCiclista(0), false);
eq('teléfono que se cae mientras caminas (3 km/h) -> se ignora',
   esDeCiclista(3), false);
eq('ciclista a 25 km/h -> sí se evalúa como caída',
   esDeCiclista(25), true);
eq('ciclista lento pero andando (justo en el umbral) -> sí se evalúa',
   esDeCiclista(CRASH_VEL_MINIMA), true);
eq('justo bajo el umbral -> se ignora',
   esDeCiclista(CRASH_VEL_MINIMA - 0.1), false);
eq('sin señal GPS (null) -> NO se filtra: mejor alarma de más que caída perdida',
   esDeCiclista(null), true);
eq('velocidad basura (NaN) -> tampoco se filtra',
   esDeCiclista(NaN), true);

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
