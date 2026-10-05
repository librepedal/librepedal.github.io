// Sección Premium de landing.html (2026-10-05). Cada caso es una regla que, si se rompe,
// cuesta plata o la cuenta de Play:
//  - Dentro de la app de Play (Capacitor) NUNCA se muestra: en Chile la política de pagos de
//    Google no permite llevar al usuario a otro medio de pago (Chile no está en los programas
//    de enlaces externos de 2026).
//  - Antes del 2026-11-01 no se muestra: el modelo de emisión de boletas declarado al SII
//    rige desde ese día.
//  - Los precios que ve la gente son los mismos que cobra el worker.
// Se ejecuta la lógica REAL (el <script id="lp-premium-logica"> de la landing), no una copia.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(raiz, 'landing.html'), 'utf8');
const WORKER = readFileSync(join(raiz, 'worker-pagos', 'worker.js'), 'utf8');
const TOML = readFileSync(join(raiz, 'worker-pagos', 'wrangler.toml'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

const m = HTML.match(/<script id="lp-premium-logica">([\s\S]*?)<\/script>/);
if (!m) { console.log('  FALLA: no encontré <script id="lp-premium-logica"> en landing.html'); process.exit(1); }
// document de mentira sin la sección: el cableado del DOM sale temprano y queda solo la lógica.
const LP = new Function('window', 'document', 'location', m[1] + '\nreturn LP_PREMIUM;')(
  {}, { getElementById: () => null }, { search: '' });

const ANTES = Date.parse('2026-10-31T23:59:00-03:00');
const DESDE = Date.parse('2026-11-01T00:00:00-03:00');
const nav = (search = '') => ({ location: { search } });

console.log('landing: sección Premium');
t('fecha de encendido = 2026-11-01 00:00 Chile', LP.ACTIVA_DESDE === DESDE);
t('navegador, antes del 1/11: oculta', LP.visible(nav(), ANTES) === false);
t('navegador, desde el 1/11: visible', LP.visible(nav(), DESDE) === true);
t('navegador con ?premium=ver antes del 1/11: visible (para revisarla)', LP.visible(nav('?premium=ver'), ANTES) === true);

const capacitor = { location: { search: '?premium=ver' }, Capacitor: { isNativePlatform: () => true } };
t('app de Play (Capacitor nativo): oculta aunque sea después del 1/11', LP.visible({ ...capacitor, location: { search: '' } }, DESDE + 1e10) === false);
t('app de Play: ?premium=ver tampoco la muestra', LP.visible(capacitor, DESDE) === false);
t('app de Play (solo androidBridge): oculta', LP.visible({ location: { search: '' }, androidBridge: {} }, DESDE) === false);
t('Capacitor web (no nativo): se comporta como navegador', LP.visible({ location: { search: '' }, Capacitor: { isNativePlatform: () => false } }, DESDE) === true);
t('si revisar Capacitor revienta, se oculta (falla cerrada)', LP.visible({ location: { search: '' }, get Capacitor() { throw new Error('x'); } }, DESDE) === false);

t('la sección parte oculta en el HTML (sin JS no aparece)', /<section class="modos" id="premium" hidden>/.test(HTML));

for (const c of ['cuenta_inexistente', 'amigo_sin_cuenta']) {
  t(`error ${c}: dice que no se cobró nada`, /No se te cobró nada/.test(LP.mensajeError(c, 'a@b.cl', 'c@d.cl')));
}
t('error desconocido o de red: dice que no se cobró nada', /No se te cobró nada/.test(LP.mensajeError('error_interno')) && /No se te cobró nada/.test(LP.mensajeError(undefined)));
t('vuelta pagado: mensaje de éxito', LP.mensajeVuelta('pagado').ok === true);
t('vuelta rechazado: mensaje de error y sin cobro', LP.mensajeVuelta('rechazado').ok === false && /No se te cobró nada/.test(LP.mensajeVuelta('rechazado').texto));
t('vuelta sin parámetro: nada', LP.mensajeVuelta(null) === null);
t('validación de correo', LP.esEmail('ana@gmail.com') && !LP.esEmail('ana@') && !LP.esEmail(''));

// Precios: lo que ve la gente = lo que cobra el worker (default y wrangler.toml).
const wInd = WORKER.match(/PREMIUM_INDIVIDUAL \|\| (\d+)/)[1], wDuo = WORKER.match(/PREMIUM_DUO \|\| (\d+)/)[1];
const tInd = TOML.match(/PREMIUM_INDIVIDUAL = "(\d+)"/)[1], tDuo = TOML.match(/PREMIUM_DUO = "(\d+)"/)[1];
const fmt = (n) => '$' + Number(n).toLocaleString('es-CL');
t('precio individual igual en worker y wrangler', wInd === tInd);
t('precio dúo igual en worker y wrangler', wDuo === tDuo);
t(`la landing muestra ${fmt(tInd)} individual`, HTML.includes(`<b>${fmt(tInd)}</b>`) && HTML.includes(`Pagar ${fmt(tInd)}`));
t(`la landing muestra ${fmt(tDuo)} dúo`, HTML.includes(`<b>${fmt(tDuo)}</b>`) && HTML.includes(`Pagar ${fmt(tDuo)}`));

const publicUrl = TOML.match(/PUBLIC_URL = "([^"]+)"/)[1];
t('la landing llama al mismo worker que declara wrangler.toml', LP.WORKER === publicUrl);
t('Flow devuelve a la landing (donde se muestra el resultado)', /APP_RETURN_URL = "https:\/\/librepedal\.cl\/landing\.html"/.test(TOML));
t('ya no promete "sin cuentas premium"', !/Sin cuentas premium ni funciones bloqueadas/.test(HTML));
t('la landing solo redirige a Flow (no a cualquier url)', /\^https:\\\/\\\/\(www\|sandbox\)\\\.flow\\\.cl\\\//.test(m[1]));

console.log(`  ${ok} OK, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
