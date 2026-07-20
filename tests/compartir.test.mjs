// Test del texto con que se comparte un viaje.
// Corre con: node tests/compartir.test.mjs   (sin dependencias)
//
// Por qué importa tanto un texto: cada viaje compartido es la app llegando gratis a
// alguien que no la conoce. Si el mensaje sale mal armado —un "undefined", un número con
// ocho decimales, o sin el link— se pierde esa llegada y encima queda en el muro de
// alguien. Es marketing, no un string cualquiera.
//
// Extrae la función REAL desde index.html para que no puedan divergir.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

const fuente = html.match(/function _frasePresumir\(km\)\{[\s\S]*?\n\}/);
if (!fuente) {
  console.log('✗ No pude extraer _frasePresumir desde index.html (¿le cambiaron el nombre?)');
  process.exit(1);
}
const frase = new Function(fuente[0] + '; return _frasePresumir;')();

let pass = 0, fail = 0;
function ok(desc, cond, detalle) {
  if (cond) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, detalle ? '-> ' + detalle : ''); }
}

console.log('LA FRASE SE AJUSTA AL ESFUERZO REAL:');
ok('100 km celebra el hito', /100 kil/i.test(frase(100)), frase(100));
ok('120 km también entra en el hito de los 100', /100 kil/i.test(frase(120)), frase(120));
ok('60 km reconoce la jornada larga', /jornada/i.test(frase(60)), frase(60));
ok('30 km habla de una salida redonda', /redonda/i.test(frase(30)), frase(30));
ok('12 km no exagera: "cortita"', /cortita/i.test(frase(12)), frase(12));
ok('3 km se queda humilde', /un rato/i.test(frase(3)), frase(3));

console.log('\nNUNCA DEVUELVE ALGO ROTO (esto es lo que protege el muro de la gente):');
for (const v of [0, 0.4, 9.9, 10, 29.9, 30, 59.9, 60, 99.9, 100, 999]) {
  const f = frase(v);
  ok(`${v} km -> frase válida`, typeof f === 'string' && f.length > 5 && !/undefined|NaN/.test(f), f);
}

console.log('\nLOS BORDES CAEN DEL LADO CORRECTO:');
ok('99.9 km todavía NO dice 100', !/100 kil/i.test(frase(99.9)), frase(99.9));
ok('exactamente 100 km sí lo dice', /100 kil/i.test(frase(100)), frase(100));
ok('exactamente 10 km ya no es "un rato"', !/un rato/i.test(frase(10)), frase(10));

console.log('\nEL MENSAJE LLEVA EL LINK (si no, no sirve de nada):');
const fn = html.match(/function compartirViaje\(id\)\{[\s\S]*?\n\}/);
ok('compartirViaje incluye librepedal.cl', !!fn && /librepedal\.cl/.test(fn[0]));
ok('usa el compartir nativo del teléfono', !!fn && /navigator\.share/.test(fn[0]));
ok('tiene salida alternativa si no hay compartir nativo', !!fn && /clipboard/.test(fn[0]));

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
