// Pioneros (2026-10-04): distintivo de los testers del comienzo + Premium gratis.
// Corre la lógica REAL de pioneros.js y revisa las conexiones con la app y las reglas.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
const SRC = leer('pioneros.js');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

const ctx = { console, String, JSON, Promise };
vm.createContext(ctx);
vm.runInContext(SRC, ctx);

// El id de cuenta debe salir IGUAL que en worker-auth (cuDeEmail sobre el correo en minúsculas).
const W = leer('worker-auth/worker.js');
debe('worker-auth sigue usando la misma transformación', W.includes("return String(email).replace(/[^a-zA-Z0-9]/g, '_');") && W.includes('body.email.trim().toLowerCase()'));
debe('el admin real sale igual que ADMIN_ID', ctx.pioCuDeEmail('IntyRivera.A@Gmail.com') === 'intyrivera_a_gmail_com');
debe('espacios alrededor no cambian el id', ctx.pioCuDeEmail('  ana.perez@mail.cl ') === 'ana_perez_mail_cl');
debe('texto que no es correo se rechaza', ctx.pioCuDeEmail('hola') === null && ctx.pioCuDeEmail('') === null);

const lista = ctx.pioCorreosDeTexto('ana@mail.cl, BETO@mail.cl\n<carla@x.com>; ana@mail.cl  basura');
debe('saca correos de un texto pegado', lista.length === 3);
debe('sin duplicados y en minúsculas', JSON.stringify(Array.from(lista)) === JSON.stringify(['ana@mail.cl', 'beto@mail.cl', 'carla@x.com']));

// El correo NO se guarda: solo el id del documento.
debe('el doc de Pionero no guarda el correo', /b\.set\(db\.collection\('pioneros'\)\.doc\(pioCuDeEmail\(e\)\), \{ desde: FV\.serverTimestamp\(\) \}\)/.test(SRC));
debe('solo el admin marca desde la app', SRC.includes('cu !== ADMIN_ID'));

// Premium gratis para siempre.
const VM = leer('voz-motor.js');
const esPrem = VM.slice(VM.indexOf('function _esPremium(){'), VM.indexOf('}', VM.indexOf('function _esPremium(){')) + 1);
debe('Pionero cuenta como Premium', esPrem.includes('_lpPionero') && esPrem.indexOf('_lpPionero') < esPrem.indexOf('us.premium'));

// Conexiones.
const IDX = leer('index.html');
debe('index.html carga pioneros.js', IDX.includes('<script src="pioneros.js"></script>'));
debe('Panel Admin tiene la carga de correos', IDX.includes('id="pioCorreos"') && IDX.includes('onclick="pioAdminMarcar()"'));
debe('sw.js lo guarda para usar sin red', leer('sw.js').includes("'./pioneros.js'"));
debe('el login carga el estado de Pionero', leer('auth-sesion.js').includes('pioCargarMiEstado()'));
debe('el perfil muestra el distintivo', leer('gamificacion-ranking.js').includes('pioInsigniaPerfil(userId)'));
const BH = leer('bienvenida-huella.js');
debe('la bienvenida muestra Pionero por encima de Fundador', BH.includes("(pio ? '<em>Pionero</em>' : (yo.fundador ?"));
debe('el mapa tiene marca propia de Pioneros', BH.includes('z.np > 0') && BH.includes('bh-lp'));
debe('hay voz pregrabada para la huella de Pionero', leer('scripts/gen-voz-bienvenida.js').includes("h3: 'Tu huella de Pionero quedó marcada para siempre.'"));

// Reglas.
const R = leer('firestore.rules');
debe('solo el admin escribe pioneros', /match \/pioneros\/\{id\}[\s\S]*?allow write: if isAdmin\(\);/.test(R));
debe('nadie se pone Pionero en su huella', R.includes("request.resource.data.get('pionero', false) == esPionero()"));
debe('el contador de Pioneros del mapa no se infla', R.includes('npSube(0)') && R.includes("npSube(resource.data.get('np', 0))"));

console.log(`  pioneros: ${ok} OK` + (fail ? `, ${fail} FALLAS` : ''));
process.exit(fail ? 1 : 0);
