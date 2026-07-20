// Test de la vigilancia del clima en ruta.
// Corre con: node tests/clima.test.mjs   (sin dependencias)
//
// Pedido por Inty (2026-07-20): que la app siga mirando el clima durante el viaje y,
// si CAMBIA respecto a lo ya pronosticado, avise con anticipación.
//
// Antes solo había un aviso de lluvia que sonaba UNA vez por viaje y no recordaba el
// pronóstico anterior: si el tiempo empeoraba después, la app se quedaba muda.
//
// Lo delicado acá no es detectar cambios: es NO hablar de más. Una voz que comenta cada
// variación de 5% se vuelve ruido y el ciclista la apaga — y apagada no avisa ni la
// tormenta. Por eso la mitad de estos casos verifican SILENCIO.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

const fuente = html.match(/function _cambioClimaRelevante\(base, actual\)\{[\s\S]*?\n\}/);
if (!fuente) {
  console.log('✗ No pude extraer _cambioClimaRelevante desde index.html');
  console.log('  (si le cambiaron el nombre este test quedaría verde sin probar nada: falla a propósito)');
  process.exit(1);
}
const cambio = new Function(fuente[0] + '; return _cambioClimaRelevante;')();

let pass = 0, fail = 0;
function eq(desc, got, exp) {
  if (got === exp) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, '-> esperaba', exp, 'y dio', got); }
}
const tipo = r => r ? r.tipo : 'silencio';
// clima base de referencia: día tranquilo
const base = { lluvia: 10, viento: 8, temp: 18, codigo: 1 };

console.log('AVISA CUANDO DE VERDAD CAMBIA:');
eq('la lluvia salta de 10% a 70% -> avisa que empeoró',
   tipo(cambio(base, { ...base, lluvia: 70 })), 'empeora');
eq('se levanta viento de 8 a 30 km/h -> avisa',
   tipo(cambio(base, { ...base, viento: 30 })), 'viento');
eq('la temperatura cae 7 grados -> avisa (mojado y con frío es donde uno se complica)',
   tipo(cambio(base, { ...base, temp: 11 })), 'frio');
eq('el pronóstico se despeja de 70% a 10% -> también lo dice, es buena noticia',
   tipo(cambio({ ...base, lluvia: 70 }, { ...base, lluvia: 10 })), 'mejora');

console.log('\nLA TORMENTA MANDA SOBRE TODO:');
eq('código de tormenta -> avisa aunque nada más haya cambiado',
   tipo(cambio(base, { ...base, codigo: 95 })), 'tormenta');
eq('la tormenta se avisa con la severidad más alta',
   cambio(base, { ...base, codigo: 99 }).severidad, 3);

console.log('\nSE CALLA CUANDO NO VALE LA PENA (esto es la mitad del trabajo):');
eq('nada cambió -> silencio', tipo(cambio(base, { ...base })), 'silencio');
eq('la lluvia sube solo 15 puntos -> silencio, no alcanza',
   tipo(cambio(base, { ...base, lluvia: 25 })), 'silencio');
eq('sube mucho pero queda en 45% -> silencio, todavía no es para alarmar',
   tipo(cambio({ ...base, lluvia: 5 }, { ...base, lluvia: 45 })), 'silencio');
eq('el viento sube 20 pero queda en 22 km/h -> silencio, es brisa',
   tipo(cambio({ ...base, viento: 2 }, { ...base, viento: 22 })), 'silencio');
eq('la temperatura baja 3 grados -> silencio',
   tipo(cambio(base, { ...base, temp: 15 })), 'silencio');
eq('la lluvia baja pero sigue en 50% -> silencio, no es para celebrar todavía',
   tipo(cambio({ ...base, lluvia: 85 }, { ...base, lluvia: 50 })), 'silencio');

console.log('\nCON DATOS INCOMPLETOS NO INVENTA:');
eq('sin foto previa -> silencio', tipo(cambio(null, base)), 'silencio');
eq('sin lectura actual -> silencio', tipo(cambio(base, null)), 'silencio');
eq('lluvia desconocida (null) -> no la considera',
   tipo(cambio({ ...base, lluvia: null }, { ...base, lluvia: 90 })), 'silencio');
eq('valores basura (NaN) -> silencio',
   tipo(cambio(base, { lluvia: NaN, viento: NaN, temp: NaN, codigo: NaN })), 'silencio');

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
