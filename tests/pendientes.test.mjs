// Test de los avisos de subida y bajada de Pistero.
// Corre con: node tests/pendientes.test.mjs   (sin dependencias)
//
// Por qué existe — falla reportada EN RUTA el 2026-07-20, andando en auto:
// "en la bajada dio una instrucción de que más adelante venía una subida y no era
//  así, venía una recta".
//
// Tres causas encontradas:
//   1. La pendiente se calculaba entre DOS PUNTOS (dónde estás y uno 180 m más allá),
//      sin mirar nada de lo que hay en medio. Un tramo que baja y vuelve a subir un
//      poco daba "subida" aunque lo que venía fuera plano.
//   2. Los 180 m eran fijos: en bici son ~30 s de aviso, pero en auto a 60 km/h son
//      10 s — el aviso llega cuando ya pasaste.
//   3. El perfil se muestrea con 480 puntos en TODA la ruta: en un viaje largo queda
//      un punto cada ~200 m, o sea que no hay resolución para opinar de 180 m.
//
// Como el bug vivía en los datos y su forma, el test extrae la función REAL desde
// index.html en vez de reimplementarla.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

const fnTerreno = html.match(/function _analizarTerrenoAdelante\(perfil, iNow, metros, umbral, minDesnivel\)\{[\s\S]*?\n\}/);
const fnMetros = html.match(/function _metrosAMirar\(velKmh\)\{[\s\S]*?\n\}/);
const minDes = html.match(/const PEND_MIN_DESNIVEL\s*=\s*([\d.]+)/);
if (!fnTerreno || !fnMetros || !minDes) {
  console.log('✗ No pude extraer las funciones de pendiente desde index.html');
  console.log('  (si les cambiaron el nombre, este test quedaría verde sin probar nada: falla a propósito)');
  process.exit(1);
}
const analizar = new Function(fnTerreno[0] + '; return _analizarTerrenoAdelante;')();
const metrosAMirar = new Function(fnMetros[0] + '; return _metrosAMirar;')();
const MIN_DESNIVEL = parseFloat(minDes[1]);

let pass = 0, fail = 0;
function eq(desc, got, exp) {
  if (got === exp) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, '-> esperaba', exp, 'y dio', got); }
}
// Construye un perfil con puntos cada `paso` metros a partir de una lista de alturas.
const perfil = (alturas, paso = 40) => alturas.map((ele, i) => ({ d: i * paso, ele }));

console.log(`Umbral de desnivel mínimo: ${MIN_DESNIVEL} m\n`);

console.log('EL CASO REPORTADO EN RUTA:');
// Vas bajando fuerte y después el camino se aplana (una recta). Los DOS EXTREMOS
// mirados solos daban un neto hacia arriba engañoso; la forma real es bajada + plano.
const bajadaLuegoRecta = perfil([100, 94, 90, 88, 88, 88, 88, 89]);
eq('bajada seguida de recta -> NO se anuncia una subida',
   analizar(bajadaLuegoRecta, 0, 300, 4, MIN_DESNIVEL).tipo !== 'subida', true);

console.log('\nTERRENO QUE SÍ HAY QUE AVISAR:');
eq('subida sostenida -> subida',
   analizar(perfil([100, 104, 108, 113, 118, 123]), 0, 300, 4, MIN_DESNIVEL).tipo, 'subida');
eq('bajada sostenida -> bajada',
   analizar(perfil([120, 116, 111, 106, 101, 96]), 0, 300, 4, MIN_DESNIVEL).tipo, 'bajada');

console.log('\nLO QUE NO SE DEBE AVISAR:');
eq('sube y baja parecido (ondulado) -> plano, no es una subida',
   analizar(perfil([100, 106, 100, 106, 100, 106]), 0, 300, 4, MIN_DESNIVEL).tipo, 'plano');
eq('desnivel mínimo (ruido del mapa de elevación) -> plano',
   analizar(perfil([100, 100.6, 101, 101.4, 102, 102.5]), 0, 300, 4, MIN_DESNIVEL).tipo, 'plano');
eq('terreno llano de verdad -> plano',
   analizar(perfil([100, 100, 100, 100, 100, 100]), 0, 300, 4, MIN_DESNIVEL).tipo, 'plano');

console.log('\nSIN RESOLUCIÓN NO SE OPINA (viaje largo, un punto cada ~200 m):');
const gruesa = [{ d: 0, ele: 100 }, { d: 210, ele: 118 }];
eq('solo 1 tramo en la ventana -> no se anuncia nada',
   analizar(gruesa, 0, 300, 4, MIN_DESNIVEL).tipo, 'plano');
eq('...y queda marcado como falta de resolución, no como terreno llano',
   analizar(gruesa, 0, 300, 4, MIN_DESNIVEL).sinResolucion, true);

console.log('\nCUÁNTO MIRAR ADELANTE SEGÚN LA VELOCIDAD:');
eq('detenido o sin dato -> mínimo de 180 m', metrosAMirar(null), 180);
eq('bici a 18 km/h -> 180 m (unos 35 s)', Math.round(metrosAMirar(18)), 180);
eq('auto a 60 km/h mira mucho más lejos que en bici', metrosAMirar(60) > metrosAMirar(18), true);
eq('auto a 60 km/h -> ~583 m', Math.round(metrosAMirar(60)), 583);
eq('a 120 km/h se topa con el techo de 600 m', metrosAMirar(120), 600);

console.log('\nBORDES:');
eq('perfil vacío -> null', analizar([], 0, 300, 4, MIN_DESNIVEL), null);
eq('parado en el último punto -> null',
   analizar(perfil([100, 101, 102]), 2, 300, 4, MIN_DESNIVEL), null);

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
