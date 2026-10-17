// Test de la pantalla de ingreso sin código de invitación (2026-10-16, pedido de Inty).
// Corre con: node tests/login-sin-codigo.test.mjs   (sin dependencias)
//
// Por qué importa: la app instalada carga librepedal.cl, así que esta misma pantalla la ven
// tres públicos distintos. Si la app vieja (sin el plugin nativo de Google) se queda solo con
// "Entrar con Google", nadie con esa versión puede entrar. Si la web o la app nueva siguen
// mostrando el código, la invitación nunca se fue.
//
// Extrae las funciones REALES desde auth.js para que no puedan divergir.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const auth = readFileSync(join(raiz, 'auth.js'), 'utf8');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

const fModo = auth.match(/function _lpModoLogin\(\)\{[\s\S]*?\n\}/);
const fAplicar = auth.match(/function _lpAplicarModoLogin\(\)\{[\s\S]*?\n\}/);
if (!fModo || !fAplicar) {
  console.log('✗ No pude extraer _lpModoLogin/_lpAplicarModoLogin desde auth.js');
  process.exit(1);
}

let pass = 0, fail = 0;
function ok(desc, cond, detalle) {
  if (cond) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, detalle ? '-> ' + detalle : ''); }
}

const IDS = ['cajaCodigoTester', 'sepGoogle', 'gbtn', 'gbtnFallback', 'avisoActualizarApp'];
function escenario(capacitor) {
  const els = {};
  for (const id of IDS) els[id] = { style: { display: '' } };
  const window = { Capacitor: capacitor };
  const document = { getElementById: (id) => els[id] || null };
  const fns = new Function('window', 'document',
    fModo[0] + '\n' + fAplicar[0] + '\nreturn { modo: _lpModoLogin, aplicar: _lpAplicarModoLogin };')(window, document);
  const modo = fns.aplicar();
  const d = (id) => els[id].style.display;
  return { modo, d };
}

console.log('NAVEGADOR (librepedal.cl en Chrome):');
let e = escenario(undefined);
ok('modo web', e.modo === 'web', e.modo);
ok('sin caja de código', e.d('cajaCodigoTester') === 'none');
ok('botón de Google visible', e.d('gbtnFallback') === 'flex');
ok('sin aviso de actualizar', e.d('avisoActualizarApp') === 'none');

console.log('\nAPP NUEVA (con el plugin nativo de Google):');
e = escenario({ isNativePlatform: () => true, isPluginAvailable: (n) => n === 'FirebaseAuthentication' });
ok('modo nativo', e.modo === 'nativo', e.modo);
ok('sin caja de código', e.d('cajaCodigoTester') === 'none');
ok('botón de Google visible', e.d('gbtnFallback') === 'flex');

console.log('\nAPP VIEJA (sin el plugin: Google no puede funcionar en el WebView):');
// registerPlugin devolvería un proxy igual: por eso se decide con isPluginAvailable.
e = escenario({ isNativePlatform: () => true, isPluginAvailable: () => false, registerPlugin: () => ({}) });
ok('modo viejo', e.modo === 'viejo', e.modo);
ok('la caja del código sigue (nadie queda afuera)', e.d('cajaCodigoTester') === 'block');
ok('sin botón de Google que no funcionaría', e.d('gbtnFallback') === 'none');
ok('aviso para actualizar desde Play Store', e.d('avisoActualizarApp') === 'block');

console.log('\nEL HTML TIENE LO QUE EL CÓDIGO ESPERA:');
for (const id of IDS) ok(`existe #${id}`, html.includes(`id="${id}"`));
ok('el aviso enlaza a la ficha real de Play', /play\.google\.com\/store\/apps\/details\?id=cl\.librepedal\.app/.test(html));
ok('_entrarConGoogle decide con _lpModoLogin, no con lpPlugin', /async function _entrarConGoogle\(\)\{\s*if\(_lpModoLogin\(\)==='nativo'\)/.test(auth));

console.log(`\n${pass} OK, ${fail} FALLA(S)`);
process.exit(fail ? 1 : 0);
