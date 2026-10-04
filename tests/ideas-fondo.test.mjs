// Ideas para el fondo (ideas-fondo.js + firestore.rules): ideas repetidas se agrupan
// por `clave`, el voto exige suscripción REAL y la regla de Firestore lo respalda.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Date, String, Math, us: null, cu: null };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(raiz, 'ideas-fondo.js'), 'utf8'), ctx);
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

const K = vm.runInContext('_ideaClave', ctx);
ok(K('Más ciclovías seguras en Santiago!!') === K('ciclovias en santiago, seguras'), 'misma idea escrita distinto = misma clave');
ok(K('Talleres gratis de reparación') === K('un taller gratis para reparación'), 'plural/singular y palabras vacías no cambian la clave');
ok(K('reforestar cerros') !== K('ciclovías en Santiago'), 'ideas distintas = claves distintas');
ok(K('x'.repeat(500) + ' ' + 'y'.repeat(500)).length <= 120, 'la clave cabe en el límite de la regla (120)');

const S = () => vm.runInContext('_tieneSuscripcionActiva()', ctx);
ctx.us = { premium: null }; ok(!S(), 'sin premium no vota');
ctx.us = { premium: { activo: true, expira: Date.now() + 86400000 } }; ok(S(), 'premium activo vota');
ctx.us = { premium: { activo: true, expira: Date.now() - 1000 } }; ok(!S(), 'premium vencido no vota');

const tarjeta = vm.runInContext('_ideaFondoTarjetaHTML()', ctx);
ok(/suscripción activa/.test(tarjeta) && /sin suscripciones no hay fondo/.test(tarjeta), 'la tarjeta deja claro que el voto depende de la suscripción');
ok(/Opcional/.test(tarjeta), 'la tarjeta se presenta como opcional (no invasiva)');

const reglas = readFileSync(join(raiz, 'firestore.rules'), 'utf8');
const bloque = (c) => { const i = reglas.indexOf('match /' + c + '/{id}'); return i < 0 ? '' : reglas.slice(i, reglas.indexOf('\n    }', i)); };
ok(/id == request\.auth\.uid/.test(bloque('ideasFondo')) && /signedInReal\(\)/.test(bloque('ideasFondo')), 'ideasFondo: una idea por usuario real');
ok(/texto\.size\(\) <= 280/.test(bloque('ideasFondo')) && /hasOnly/.test(bloque('ideasFondo')), 'ideasFondo: tamaño y campos acotados');
ok(/suscripcionActiva\(\)/.test(bloque('votosFondo')) && /id == request\.auth\.uid/.test(bloque('votosFondo')), 'votosFondo: un voto por suscriptor, validado en el servidor');
ok(/premium/.test(reglas.slice(reglas.indexOf('function suscripcionActiva'), reglas.indexOf('match /votosFondo'))), 'suscripcionActiva() lee users.premium');

console.log(f ? `  ${f}/${n} FALLARON` : `  ✓ ideas para el fondo: ${n} chequeos OK`);
process.exit(f ? 1 : 0);
