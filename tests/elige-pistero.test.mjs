// Test de "Elige tu Pistero" (elige-pistero.js, 2026-10-16; maqueta aprobada disenos-ui/elige-tu-pistero/).
// Corre con: node tests/elige-pistero.test.mjs   (sin dependencias)
//
// Por qué importa: el modelo viaja en pistOpts (Firestore), lo escribe el cliente de cada usuario y se dibuja
// en el ranking y el perfil de OTROS. Un valor raro no puede romper el dibujo ni meterse en el SVG. Y la
// pantalla tiene que salir UNA vez por cuenta (también a quien ya usaba la app), nunca en cada inicio.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lee = (f) => readFileSync(join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
const SRC = lee('elige-pistero.js');

let pass = 0, fail = 0;
function ok(desc, cond, detalle) {
  if (cond) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, detalle ? '-> ' + detalle : ''); }
}

const window = { PM_BASE: 'pistero-modelos/' };
const PistModelos = { svgDe: (id, e) => '<svg data-casco="' + e + '"></svg>', porId: {} };
const _pistoDe = (o, e) => '<svg data-clasico="' + e + '"></svg>';
const document = { readyState: 'complete', getElementById: () => null, addEventListener: () => {} };
const E = new Function('window', 'PistModelos', '_pistoDe', 'document', SRC + '\nreturn { epModeloValido, epEstadoMini, _pistAvatar, EP_IDS };')(window, PistModelos, _pistoDe, document);

console.log('MODELO VÁLIDO O CLÁSICO:');
ok('los 6 modelos de la prueba', E.EP_IDS.join(',') === 'ciber,orbe,slime,vinilo,casco,clasico');
ok('un valor raro de Firestore -> clásico', E.epModeloValido('<script>') === 'clasico' && E.epModeloValido(undefined) === 'clasico' && E.epModeloValido('orbe') === 'orbe');

console.log('\nEL AVATAR DE CADA UNO:');
ok('clásico: el Pistero de siempre', /data-clasico="feliz"/.test(E._pistAvatar({ modelo: 'clasico' }, 'feliz')));
ok('sin modelo (cuentas viejas): el de siempre', /data-clasico/.test(E._pistAvatar({}, 'feliz')));
ok('casco vivo: su SVG', /data-casco/.test(E._pistAvatar({ modelo: 'casco' }, 'feliz')));
const orbe = E._pistAvatar({ modelo: 'orbe' }, 'contento');
ok('orbe: imagen fija del modelo real, dentro de un SVG (encaja donde iba el Clásico)', /^<svg [^>]*><image href="pistero-modelos\/img\/mini-orbe-hablar\.png"/.test(orbe), orbe);
ok('modelo raro: nunca entra al SVG', !/script/.test(E._pistAvatar({ modelo: '"><script>' }, 'feliz')));
ok('expresiones -> estados de la miniatura', E.epEstadoMini('emocionado') === 'feliz' && E.epEstadoMini('hablando') === 'hablar' && E.epEstadoMini('pensando') === 'reposo');

console.log('\nUNA VEZ POR CUENTA:');
ok('llave local por cuenta', /lp_pm_elegido_' \+ cu/.test(SRC));
ok('marca aparte en la nube (pmElegido), no el modelo normalizado', /pmElegido: id/.test(SRC) && /EP_IDS\.indexOf\(dd\.pmElegido\)/.test(SRC));
ok('después de la bienvenida, antes del saludo', /epIniciar\(function\(\)\{ _seguirTrasBienvenida\(rv\); \}\)/.test(lee('auth-sesion.js')));

console.log('\nEN TODA LA APP:');
ok('chip, barra y "Pregúntale a Pistero" usan el modelo', /_pistAvatar\(o,'feliz'\)/.test(lee('pistero-apariencia.js')));
ok('ranking y perfil de otros', /_pistAvatar\(\(d\.pistOpts/.test(lee('gamificacion-ranking.js')));
ok('_pistNormal solo deja modelos de la prueba', /indexOf\(r\.modelo\)<0\) r\.modelo='clasico'/.test(lee('pistero-armario.js')));
const html = lee('index.html');
ok('scripts cargados en orden (casco vivo y modelos antes de elige-pistero)', html.indexOf('pistero-modelos/casco-vivo.js') < html.indexOf('pistero-modelos/modelos.js') && html.indexOf('pistero-modelos/modelos.js') < html.indexOf('elige-pistero.js'));
ok('en el caché de la app', /'\.\/elige-pistero\.js'/.test(lee('sw.js')) && /'\.\/pistero-modelos\/modelos\.js'/.test(lee('sw.js')));
for (const id of ['ciber', 'orbe', 'slime', 'vinilo']) for (const e of ['reposo', 'feliz', 'hablar']) {
  let existe = true; try { readFileSync(join(raiz, 'pistero-modelos/img/mini-' + id + '-' + e + '.png')); } catch (_) { existe = false; }
  if (!existe) ok('miniatura ' + id + '-' + e, false);
}
ok('las 12 miniaturas existen', true);
ok('conteo de la prueba con regla propia (solo +1, sin datos personales)', /match \/pistModelosStats\/\{modelo\}/.test(lee('firestore.rules')));

console.log(`\n${pass} OK, ${fail} FALLA(S)`);
process.exit(fail ? 1 : 0);
