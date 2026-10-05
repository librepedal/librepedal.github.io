// Bloqueos de Premium (decisión de Inty, 2026-10-05): chat con límite diario, sobrevuelo 3D
// como adelanto y un solo viaje multi-destino sin terminar. Se prueba el código REAL:
//  - worker-ia/worker.js importado tal cual, con Google (llaves de firma), Firestore y la
//    Cache API simulados en memoria -- nunca los reales.
//  - _puedeGuardarOtroViaje() extraída de funciones-mapa-viajes.js y ejecutada.
// Además: ningún aviso que se ve DENTRO de la app dice dónde ni cuánto pagar (en Chile la
// política de pagos de Google Play no permite llevar al usuario a pagar fuera de Play).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateKeyPairSync, createSign } from 'node:crypto';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// ---------- simulaciones ----------
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'llave-prueba', alg: 'RS256', use: 'sig' };
const otraLlave = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function idToken(sub, { proveedor = 'custom', exp = Math.floor(Date.now() / 1000) + 3600, aud = 'librepedal-cb983', llave = privateKey } = {}) {
  const h = b64({ alg: 'RS256', kid: 'llave-prueba', typ: 'JWT' });
  const p = b64({ iss: 'https://securetoken.google.com/' + aud, aud, sub, iat: Math.floor(Date.now() / 1000) - 10, exp, firebase: { sign_in_provider: proveedor } });
  const s = createSign('RSA-SHA256').update(h + '.' + p).sign(llave).toString('base64url');
  return h + '.' + p + '.' + s;
}
let premiumDe = {}; // uid -> expira (ms) si es premium
let llamadasModelo = 0;
const cacheMem = new Map();
globalThis.caches = { default: {
  async match(req) { const v = cacheMem.get(typeof req === 'string' ? req : req.url); return v === undefined ? undefined : new Response(v); },
  async put(req, res) { cacheMem.set(typeof req === 'string' ? req : req.url, await res.text()); },
} };
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.startsWith('https://www.googleapis.com/service_accounts/v1/jwk/securetoken')) return new Response(JSON.stringify({ keys: [jwk] }));
  const m = url.match(/documents\/users\/([^?]+)\?mask\.fieldPaths=premium$/);
  if (m) {
    const exp = premiumDe[m[1]];
    if (exp === undefined) return new Response(JSON.stringify({ name: 'x', fields: {} }));
    return new Response(JSON.stringify({ fields: { premium: { mapValue: { fields: { activo: { booleanValue: true }, expira: { integerValue: String(exp) } } } } } }));
  }
  throw new Error('fetch inesperado: ' + url);
};
const { default: worker } = await import('../worker-ia/worker.js');
const envBase = { AI: { run: async () => { llamadasModelo++; return { response: 'Hola, compa.' }; } } };
const ctx = { waitUntil() {} };
let ipN = 0;
async function chat(env, extra = {}, ip) {
  const res = await worker.fetch(new Request('https://ia.prueba/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip || ('10.0.0.' + (++ipN)) },
    body: JSON.stringify({ mensaje: '¿Cómo cambio una cámara?', usuario: { nombre: 'Ana' }, ...extra }),
  }), env, ctx);
  return res.json();
}
const reiniciar = () => { cacheMem.clear(); premiumDe = {}; llamadasModelo = 0; };

console.log('premium: bloqueos (chat, sobrevuelo, viajes)');

{ // 1. Sin CHAT_GRATIS_POR_DIA (así está hasta el 1/11): nadie tiene límite
  reiniciar();
  const tok = idToken('ana_gmail_com');
  let cortes = 0;
  for (let i = 0; i < 15; i++) if ((await chat(envBase, { idToken: tok }, '1.1.1.1')).limite) cortes++;
  t('límite apagado: 15 mensajes seguidos sin corte', cortes === 0 && llamadasModelo === 15);
}

const env10 = { ...envBase, CHAT_GRATIS_POR_DIA: '10' };
{ // 2. Encendido: el mensaje 11 del día se corta, y sin llamar al modelo
  reiniciar();
  const tok = idToken('ana_gmail_com');
  const r = [];
  for (let i = 0; i < 11; i++) r.push(await chat(env10, { idToken: tok }, '2.2.2.' + i));
  t('10 mensajes gratis responden', r.slice(0, 10).every((x) => !x.limite && x.respuesta === 'Hola, compa.'));
  t('el 11 se corta con el aviso en personaje', r[10].limite === true && /Mañana seguimos/.test(r[10].respuesta));
  t('el corte no gasta modelo', llamadasModelo === 10);
  t('el límite va por cuenta, no por IP (11 IPs distintas igual se cortó)', r[10].limite === true);
  const otra = await chat(env10, { idToken: idToken('beto_gmail_com') }, '2.2.2.0');
  t('otra cuenta en la misma IP tiene su propio cupo', !otra.limite);
}

{ // 3. Premium vigente: sin límite. Premium vencido: con límite
  reiniciar();
  premiumDe.ana_gmail_com = Date.now() + 5 * 864e5;
  const tok = idToken('ana_gmail_com');
  let cortes = 0;
  for (let i = 0; i < 14; i++) if ((await chat(env10, { idToken: tok })).limite) cortes++;
  t('Premium vigente: 14 mensajes sin corte', cortes === 0);
  reiniciar();
  premiumDe.ana_gmail_com = Date.now() - 1000;
  let cortes2 = 0;
  for (let i = 0; i < 12; i++) if ((await chat(env10, { idToken: tok })).limite) cortes2++;
  t('Premium vencido: se corta desde el 11', cortes2 === 2);
}

{ // 4. Tokens que NO valen: el límite cae a la IP (no regalan Premium ni cupo propio)
  reiniciar();
  premiumDe.ana_gmail_com = Date.now() + 864e5; // aunque ana sea Premium...
  const falsos = [
    ['firmado con otra llave', idToken('ana_gmail_com', { llave: otraLlave })],
    ['vencido', idToken('ana_gmail_com', { exp: Math.floor(Date.now() / 1000) - 60 })],
    ['de otro proyecto', idToken('ana_gmail_com', { aud: 'otro-proyecto' })],
    ['basura', 'no.es.token'],
  ];
  for (const [nombre, tok] of falsos) {
    cacheMem.clear();
    let cortes = 0;
    for (let i = 0; i < 11; i++) if ((await chat(env10, { idToken: tok }, '3.3.3.3')).limite) cortes++;
    t(`token ${nombre}: no da Premium, cuenta por IP y corta en el 11`, cortes === 1);
  }
  cacheMem.clear();
  let cortesAnon = 0;
  for (let i = 0; i < 11; i++) if ((await chat(env10, { idToken: idToken('anonimo123', { proveedor: 'anonymous' }) }, '4.4.4.4')).limite) cortesAnon++;
  t('sesión anónima: cuenta por IP', cortesAnon === 1);
  cacheMem.clear();
  let cortesSin = 0;
  for (let i = 0; i < 11; i++) if ((await chat(env10, {}, '5.5.5.5')).limite) cortesSin++;
  t('sin token: cuenta por IP', cortesSin === 1);
}

// ---------- la app manda el token ----------
const CHAT = leer('pistero-chat-ia.js');
t('el chat de la app manda el ID token de Firebase', /payload\.idToken=await Promise\.race\(\[_u\.getIdToken\(\)/.test(CHAT));
t('si el token tarda, no bloquea la pregunta (3 s y sigue)', /setTimeout\(function\(\)\{ r\(null\); \},3000\)/.test(CHAT));

// ---------- viajes multi-destino ----------
const VIAJES = leer('funciones-mapa-viajes.js');
const fn = VIAJES.match(/function _puedeGuardarOtroViaje\(\)\{[\s\S]*?\n\}/);
t('existe _puedeGuardarOtroViaje', !!fn);
const puede = (esPremium, lista) => new Function('_esPremium', 'trips', fn[0] + '\nreturn _puedeGuardarOtroViaje();')(() => esPremium, lista);
t('sin Premium y sin viajes: puede guardar', puede(false, []) === true);
t('sin Premium con uno pendiente: no puede', puede(false, [{ status: 'pending' }]) === false);
t('sin Premium con uno en curso: no puede', puede(false, [{ status: 'active' }]) === false);
t('sin Premium con solo completados: puede (son historial)', puede(false, [{ status: 'completed' }, { status: 'completed' }]) === true);
t('Premium con varios pendientes: puede', puede(true, [{ status: 'pending' }, { status: 'pending' }]) === true);
t('saveAndStartTrip revisa el límite antes de guardar', /if\(!_puedeGuardarOtroViaje\(\)\) return lpAviso\(/.test(VIAJES) && VIAJES.indexOf('_puedeGuardarOtroViaje()) return') < VIAJES.indexOf("db.collection('trips').add("));

// ---------- sobrevuelo ----------
const SBV = leer('sobrevuelo-viaje.js');
t('sobrevuelo: sin Premium recorta al primer 25 %', /vistaPrevia=\(typeof _esPremium==='function'\) && !_esPremium\(\)/.test(SBV) && /coords\.slice\(0, Math\.max\(2, Math\.ceil\(coords\.length\*0\.25\)\)\)/.test(SBV));
t('sobrevuelo: el recorte ocurre antes de dibujar la línea', SBV.indexOf('coords.length*0.25') < SBV.indexOf('_sbvLine=mlPolyline(coords'));

// ---------- avisos dentro de la app: sin dónde ni cuánto pagar ----------
const WIA = leer('worker-ia/worker.js');
const avisos = [
  ['chat', (WIA.match(/const MSJ_LIMITE_CHAT = "([^"]+)"/) || [])[1]],
  ['sobrevuelo', (SBV.match(/h\('(Ese fue un adelanto[^']+)'\)/) || [])[1]],
  ['viajes', (VIAJES.match(/lpAviso\("(Ya tienes un viaje planificado[^"]+)"\)/) || [])[1]],
];
for (const [donde, txt] of avisos) {
  t(`aviso de ${donde} existe`, !!txt);
  t(`aviso de ${donde}: sin link, sin precio, sin "pagar"`, !!txt && !/https?:|librepedal\.cl|\$|\bpag[ao]r?\b|compra|flow/i.test(txt));
}

// GATE: todo esto queda dormido hasta el 1/11 (lo enciende GATE_PREMIUM_ACTIVO)
t('GATE_PREMIUM_ACTIVO sigue en false en esta rama', /var GATE_PREMIUM_ACTIVO = false;/.test(leer('voz-motor.js')));

console.log(`  ${ok} OK, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
