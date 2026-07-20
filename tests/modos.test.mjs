// Test de la separación de kilómetros por disciplina.
// Corre con: node tests/modos.test.mjs   (sin dependencias)
//
// Por qué existe: hasta v7.12 el ranking hacía `orderBy('km')` sobre UN solo contador,
// bajo el título "los cicloviajeros con más kilómetros del mundo". Los kilómetros hechos
// EN AUTO competían con los pedaleados — un viaje de 300 km manejando le gana a casi
// cualquier ciclista real. Frente a la élite del ciclismo chileno, eso destruye la
// credibilidad del ranking completo.
//
// Nota de método: al probar esto en el navegador la primera vez, cambiar
// `window.actividadTipo` NO cambió nada, porque es una variable léxica y no una propiedad
// de window — la misma trampa que el prompt maestro documenta sobre `db`. La prueba
// mentía, no el código. Acá se inyecta el modo como parámetro para no repetir el error.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

const fnSumar = html.match(/function _sumarKmModo\(km\)\{[\s\S]*?\n\}/);
const mapa = html.match(/const MODOS_QUE_COMPITEN=\{[^}]*\};/);
const fnCompite = html.match(/function _modoCompite\(m\)\{[^}]*\}/);
if (!fnSumar || !mapa || !fnCompite) {
  console.log('✗ No pude extraer la lógica de modos desde index.html (¿le cambiaron el nombre?)');
  process.exit(1);
}
const compite = new Function(mapa[0] + fnCompite[0] + '; return {MODOS_QUE_COMPITEN, _modoCompite};')();
// `us` y `actividadTipo` son variables libres dentro de _sumarKmModo: se inyectan como parámetros.
const hacerSumador = (us, actividadTipo) => new Function('us', 'actividadTipo', fnSumar[0] + '; return _sumarKmModo;')(us, actividadTipo);

let pass = 0, fail = 0;
function eq(desc, got, exp) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, '-> esperaba', e, 'y dio', g); }
}

console.log('CADA DISCIPLINA SUMA EN LO SUYO:');
{
  const us = { dm: {} };
  hacerSumador(us, 'ciclismo')(12.5);
  hacerSumador(us, 'mtb')(8);
  hacerSumador(us, 'trekking')(4);
  hacerSumador(us, 'ciclismo')(2.5);
  eq('los km de ruta se suman entre ellos', us.dm.ciclismo, 15);
  eq('el MTB va aparte', us.dm.mtb, 8);
  eq('el trekking va aparte', us.dm.trekking, 4);
}

console.log('\nEL AUTO NO CONTAMINA (el bug que se arregló):');
{
  const us = { dm: {} };
  hacerSumador(us, 'ciclismo')(20);
  hacerSumador(us, 'moto')(300);
  eq('300 km en auto NO entran al contador de ciclismo', us.dm.ciclismo, 20);
  eq('pero sí quedan registrados en su propio modo', us.dm.moto, 300);
  eq('el vehículo NO compite en ningún ranking', compite._modoCompite('moto'), false);
  eq('la bici sí compite', compite._modoCompite('ciclismo'), true);
  eq('el MTB sí compite', compite._modoCompite('mtb'), true);
  eq('el trekking sí compite', compite._modoCompite('trekking'), true);
}

console.log('\nNO SE ENSUCIA CON DATOS MALOS:');
{
  const us = { dm: {} };
  const s = hacerSumador(us, 'ciclismo');
  s(10); s(-5); s(NaN); s(0); s(undefined); s(null);
  eq('negativos, NaN, cero y vacíos se ignoran', us.dm, { ciclismo: 10 });
}
{
  const us = {}; // usuario viejo, sin el campo dm todavía
  hacerSumador(us, 'ciclismo')(7);
  eq('un usuario sin desglose previo lo crea solo', us.dm, { ciclismo: 7 });
}
{
  const us = { dm: {} };
  hacerSumador(us, undefined)(5);
  eq('sin modo definido cae a ciclismo, no se pierde el km', us.dm, { ciclismo: 5 });
}

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
