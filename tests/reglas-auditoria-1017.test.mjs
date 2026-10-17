// Auditoría de seguridad 2026-10-17: cierres críticos de firestore.rules + el cliente que depende de ellos.
// La prueba REAL (ataques ejecutados en el emulador) es tests/emulador/reglas-ataques.mjs; esta
// solo cuida en CI (sin Java ni emulador) que nadie deshaga los cierres sin darse cuenta.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = readFileSync(join(raiz, 'firestore.rules'), 'utf8');
const SOCIAL = readFileSync(join(raiz, 'social.js'), 'utf8');
const WORKER = readFileSync(join(raiz, 'worker-auth', 'worker.js'), 'utf8');
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };
const bloque = (col) => { const i = R.indexOf('match /' + col + '/'); return i < 0 ? '' : R.slice(i, R.indexOf('\n    }', i)); };

ok(/request\.auth\.token\.get\('adm', false\) == true/.test(R.slice(R.indexOf('function isAdmin()'), R.indexOf('function isAdmin()') + 400)), '#3 isAdmin() exige el claim adm, no solo el uid');
ok(/claimsDe\(/.test(WORKER) && /adm: true/.test(WORKER), '#3 worker-auth emite claims.adm solo para el admin');
ok((WORKER.match(/correoEsDuenoDelCu\(env/g) || []).length >= 2, '#3 worker-auth comprueba el dueño del cu en el login con Google y con código');

const am = bloque('amistades');
ok(/solicitudAceptadaEntre\(/.test(am) && /hasOnly\(\['a', 'b', 'req'\]\)/.test(am), '#1 /amistades exige una solicitud aceptada (req)');
const fr = bloque('friendRequests');
ok(/status == 'pending'/.test(fr) && /get\('to', ''\) == request\.auth\.uid/.test(fr) && !/allow update: if signedIn\(\);/.test(fr), '#1 friendRequests: nace pending y solo el destinatario responde');
ok(/_asegurarAmistadEspejo\(fromUser, reqId\)/.test(SOCIAL) && /\{a:a,b:b,req:req\}/.test(SOCIAL), '#1 social.js manda req al crear la amistad');

ok(!/allow read: if true;/.test(bloque('trips')), '#2 /trips ya no es de lectura pública');
const rep = bloque('reportes');
ok(/signedInReal\(\) && \(/.test(rep) && /votoSoloAgregaMiUid\('desmentidoPor'\)/.test(rep) && /lastConfirm == request\.time/.test(rep), '#4 reportes: el voto agrega solo tu uid y lastConfirm = hora del servidor');
ok(/aprobada == false/.test(bloque('frasesComunidad')), '#7 frasesComunidad nace sin aprobar');
const sos = bloque('sosAlertas');
ok(/hasOnly\(\['clat', 'clon', 'ts'\]\)/.test(sos) && /ts == request\.time/.test(sos), '#8 sosAlertas: solo clat/clon/ts y ts = hora del servidor');

console.log(`reglas auditoría 2026-10-17: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
