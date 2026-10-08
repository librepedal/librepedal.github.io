// Worker de acceso (worker-auth/worker.js) con la app ABIERTA (Inty, 2026-10-08: "quiero que la aplicación quede
// libre para cualquier usuario que descargue la aplicación", para mostrarla en un evento al día siguiente).
// - "Entrar con Google": cualquier correo verificado por Google entra (antes: solo los de TESTERS_PERMITIDOS → 403)
// - CODIGO_EVENTO + correo: solo para correos SIN cuenta (users/{cu} no existe en Firestore); la primera entrada
//   deja la marca en KV y con ella se puede volver a entrar; una cuenta ajena nunca (testers, Google, admin)
// - si no se puede comprobar Firestore: no entra (falla cerrada)
// - el código de tester y el de admin siguen igual que antes
// Sin red: Google (llaves, OAuth) y Firestore simulados; 'jose' se reemplaza por un equivalente con node:crypto
// (el CI corre `npm test` sin instalar dependencias) que firma y verifica RS256 de verdad.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'node:crypto';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// ---------- 'jose' mínimo sobre node:crypto (solo lo que usa el worker) ----------
const JOSE = `
import crypto from 'node:crypto';
const b64u = (s) => Buffer.from(s).toString('base64url');
export async function importPKCS8(pem) { return crypto.createPrivateKey(pem); }
export async function importX509(pem) { try { return new crypto.X509Certificate(pem).publicKey; } catch (e) { return crypto.createPublicKey(pem); } }
export function decodeProtectedHeader(t) { return JSON.parse(Buffer.from(String(t).split('.')[0], 'base64url').toString()); }
export async function jwtVerify(t, key, o) {
  const [h, p, s] = String(t).split('.');
  if (!crypto.verify('sha256', Buffer.from(h + '.' + p), key, Buffer.from(s || '', 'base64url'))) throw new Error('firma inválida');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (o && o.issuer && payload.iss !== o.issuer) throw new Error('iss');
  if (o && o.audience && payload.aud !== o.audience) throw new Error('aud');
  if (payload.exp && payload.exp < Date.now() / 1000) throw new Error('exp');
  return { payload };
}
export class SignJWT {
  constructor(p) { this.p = { ...p }; this.h = {}; }
  setProtectedHeader(h) { this.h = h; return this; }
  setIssuedAt(t) { this.p.iat = t; return this; }
  setIssuer(v) { this.p.iss = v; return this; }
  setSubject(v) { this.p.sub = v; return this; }
  setAudience(v) { this.p.aud = v; return this; }
  setExpirationTime(v) { this.p.exp = v; return this; }
  async sign(k) { const d = b64u(JSON.stringify(this.h)) + '.' + b64u(JSON.stringify(this.p)); return d + '.' + crypto.sign('sha256', Buffer.from(d), k).toString('base64url'); }
}`;
const joseURL = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(JOSE);
let src = readFileSync(join(raiz, 'worker-auth', 'worker.js'), 'utf8');
const antes = src;
src = src.replace(/from 'jose';/, 'from "' + joseURL + '";');
ok(src !== antes, 'el worker importa jose como se esperaba');
const W = (await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(src))).default;
const J = await import(joseURL);

// ---------- llaves: "Google" (firma los idToken) y la cuenta de servicio (firma los tokens propios) ----------
const pem = (k, t) => k.export({ type: t, format: 'pem' });
const google = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const servicio = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PROJECT = 'librepedal-cb983';
async function idToken(email, verificado = true) {
  const now = Math.floor(Date.now() / 1000);
  return new J.SignJWT({ email, email_verified: verificado })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer('https://securetoken.google.com/' + PROJECT)
    .setAudience(PROJECT).setIssuedAt(now).setExpirationTime(now + 3600).sign(google.privateKey);
}
const uidDe = (token) => { const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  return crypto.verify('sha256', Buffer.from(token.split('.').slice(0, 2).join('.')), servicio.publicKey, Buffer.from(token.split('.')[2], 'base64url')) ? p.uid : 'FIRMA-MALA'; };

// ---------- red simulada ----------
const RED = { firestore: [], oauth: 0, cuentas: new Set(), firestoreFalla: false };
globalThis.fetch = async (url, init) => {
  url = String(url);
  if (url.includes('securetoken@system.gserviceaccount.com')) return new Response(JSON.stringify({ k1: pem(google.publicKey, 'spki') }));
  if (url === 'https://oauth2.googleapis.com/token') {
    RED.oauth++;
    const a = new URLSearchParams(init.body).get('assertion');
    const ok = crypto.verify('sha256', Buffer.from(a.split('.').slice(0, 2).join('.')), servicio.publicKey, Buffer.from(a.split('.')[2], 'base64url'));
    return ok ? new Response(JSON.stringify({ access_token: 'tok-servicio' })) : new Response('{}', { status: 400 });
  }
  const m = url.match(/^https:\/\/firestore\.googleapis\.com\/v1\/projects\/librepedal-cb983\/databases\/\(default\)\/documents\/users\/([^?]+)/);
  if (m) {
    RED.firestore.push(decodeURIComponent(m[1]));
    if ((init.headers || {}).Authorization !== 'Bearer tok-servicio') return new Response('{}', { status: 403 });
    if (RED.firestoreFalla) return new Response('{}', { status: 500 });
    return new Response('{}', { status: RED.cuentas.has(decodeURIComponent(m[1])) ? 200 : 404 });
  }
  throw new Error('fetch inesperado: ' + url);
};
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }

let ipN = 0;
function env(extra) {
  return Object.assign({
    FIREBASE_CLIENT_EMAIL: 'sa@librepedal-cb983.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY_B64: Buffer.from(pem(servicio.privateKey, 'pkcs8')).toString('base64'),
    CODIGO_TESTER: 'TESTER123', CODIGO_ADMIN: 'ADMIN999', CODIGO_EVENTO: 'EVENTO2026',
    TESTERS_PERMITIDOS: 'tester@gmail.com, otra@gmail.com', RATE_LIMIT_AUTH: kv()
  }, extra || {});
}
async function pedir(e, body, ip) {
  const r = await W.fetch(new Request('https://librepedal-auth.librepedal.workers.dev', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://librepedal.cl', 'CF-Connecting-IP': ip || ('10.0.0.' + (++ipN)) },
    body: JSON.stringify(body) }), e);
  return { status: r.status, data: await r.json() };
}

// ---------- 1. Entrar con Google: cualquiera con correo verificado ----------
{
  const e = env();
  let r = await pedir(e, { idToken: await idToken('nueva.persona@gmail.com') });
  ok(r.status === 200 && r.data.token, 'Google: un correo que NO es tester entra (antes 403 "no está en la lista de testers")');
  ok(r.data.cu === 'nueva_persona_gmail_com' && uidDe(r.data.token) === 'nueva_persona_gmail_com', 'Google: el token va firmado por la cuenta de servicio con uid = cu');
  r = await pedir(env({ TESTERS_PERMITIDOS: undefined }), { idToken: await idToken('x@gmail.com') });
  ok(r.status === 200 && r.data.token, 'Google: entra aunque no exista la lista de testers');
  r = await pedir(e, { idToken: await idToken('tester@gmail.com') });
  ok(r.status === 200 && r.data.cu === 'tester_gmail_com', 'Google: los testers siguen entrando');
  r = await pedir(e, { idToken: await idToken('sinverificar@gmail.com', false) });
  ok(r.status === 401 && !r.data.token, 'Google: correo sin verificar → 401');
  const otra = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const falso = await new J.SignJWT({ email: 'x@gmail.com', email_verified: true }).setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer('https://securetoken.google.com/' + PROJECT).setAudience(PROJECT).setExpirationTime(now + 3600).sign(otra.privateKey);
  r = await pedir(e, { idToken: falso });
  ok(r.status === 401 && !r.data.token, 'Google: idToken firmado por otra llave → 401');
  ok(RED.firestore.length === 0, 'Google no consulta Firestore');
}

// ---------- 2. Código del evento ----------
{
  const e = env();
  RED.cuentas = new Set(['ya_existe_gmail_com', 'a_b_gmail_com']);
  RED.firestore = [];
  let r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'Nuevo@Gmail.com ' });
  ok(r.status === 200 && r.data.token && uidDe(r.data.token) === 'nuevo_gmail_com', 'evento: correo nuevo entra, uid = cu del correo en minúsculas');
  ok(e.RATE_LIMIT_AUTH.m.has('evento:nuevo@gmail.com'), 'evento: queda la marca en KV');
  ok(RED.firestore.join() === 'nuevo_gmail_com', 'evento: consultó users/nuevo_gmail_com');
  r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'nuevo@gmail.com' });
  ok(r.status === 200 && r.data.token, 'evento: la misma persona vuelve a entrar (otro teléfono / cerró sesión)');
  ok(RED.firestore.length === 1, 'evento: con la marca ya no consulta Firestore (su doc ya existe y no debe bloquearla)');

  RED.firestore = [];
  r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'ya.existe@gmail.com' });
  ok(r.status === 403 && !r.data.token && /ya tiene cuenta/.test(r.data.error), 'evento: correo con cuenta (doc en Firestore) → 403 sin token');
  ok(!e.RATE_LIMIT_AUTH.m.has('evento:ya.existe@gmail.com'), 'evento: rechazado no deja marca');
  r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'a.b@gmail.com' });
  ok(r.status === 403 && !r.data.token, 'evento: a.b@ choca con la cuenta a_b (mismo cu) → 403');
  r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'tester@gmail.com' });
  ok(r.status === 403 && !r.data.token, 'evento: correo de tester → 403 (aunque no tenga doc)');
  r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'intyrivera.a@gmail.com' });
  ok(r.status === 401 && !r.data.token, 'evento: el correo admin no entra con el código del evento');

  RED.firestoreFalla = true;
  r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'otro.nuevo@gmail.com' });
  ok(r.status === 503 && !r.data.token, 'evento: Firestore falla → 503 sin token (falla cerrada)');
  ok(!e.RATE_LIMIT_AUTH.m.has('evento:otro.nuevo@gmail.com'), 'evento: sin comprobar no deja marca');
  RED.firestoreFalla = false;
  r = await pedir(env({ RATE_LIMIT_AUTH: undefined }), { modo: 'codigo', codigo: 'EVENTO2026', email: 'sin.kv@gmail.com' });
  ok(r.status === 503 && !r.data.token, 'evento: sin KV no entra (no podría recordar la marca)');
  r = await pedir(env({ CODIGO_EVENTO: undefined }), { modo: 'codigo', codigo: 'EVENTO2026', email: 'z@gmail.com' });
  ok(r.status === 401 && !r.data.token, 'evento: sin el secreto CODIGO_EVENTO, el código no sirve');
  r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2025', email: 'z@gmail.com' });
  ok(r.status === 401 && !r.data.token, 'evento: código equivocado → 401');
  ok(RED.oauth === 1, 'el token OAuth de la cuenta de servicio se pide una vez y se reutiliza (' + RED.oauth + ')');
}

// ---------- 3. Lo de antes sigue igual ----------
{
  const e = env();
  let r = await pedir(e, { modo: 'codigo', codigo: 'TESTER123', email: 'tester@gmail.com' });
  ok(r.status === 200 && uidDe(r.data.token) === 'tester_gmail_com', 'tester: código de tester + su correo entra');
  r = await pedir(e, { modo: 'codigo', codigo: 'TESTER123', email: 'nadie@gmail.com' });
  ok(r.status === 403 && !r.data.token, 'tester: código de tester con correo fuera de la lista → 403');
  r = await pedir(e, { modo: 'codigo', codigo: 'TESTER123', email: 'intyrivera.a@gmail.com' });
  ok(r.status === 401 && !r.data.token, 'admin: el código de tester no sirve para el admin');
  r = await pedir(e, { modo: 'codigo', codigo: 'ADMIN999', email: 'intyrivera.a@gmail.com' });
  ok(r.status === 200 && uidDe(r.data.token) === 'intyrivera_a_gmail_com', 'admin: con CODIGO_ADMIN entra');
  r = await pedir(env({ CODIGO_TESTER: undefined, TESTERS_PERMITIDOS: undefined, CODIGO_EVENTO: undefined }), { modo: 'codigo', codigo: 'X', email: 'a@b.cl' });
  ok(r.status === 403 && /no está habilitado/.test(r.data.error), 'sin ningún código configurado → 403 "no está habilitado"');
  // límite por correo: 5 intentos fallidos y el 6º ni se evalúa
  const e2 = env();
  for (let i = 0; i < 5; i++) await pedir(e2, { modo: 'codigo', codigo: 'MAL' + i, email: 'victima@gmail.com' });
  r = await pedir(e2, { modo: 'codigo', codigo: 'EVENTO2026', email: 'victima@gmail.com' });
  ok(r.status === 429 && !r.data.token, 'límite por correo: tras 5 fallos, ni el código correcto pasa (429)');
}

// ---------- 4. Evento: todo el salón entra desde el MISMO Wi-Fi (una IP) ----------
{
  const e = env();
  let entraron = 0;
  for (let i = 0; i < 40; i++) {
    const r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'asistente' + i + '@gmail.com' }, '200.1.1.1');
    if (r.status === 200 && r.data.token) entraron++;
  }
  ok(entraron === 40, 'misma IP: entran 40 personas seguidas (antes, con 5 por IP, solo 5): ' + entraron);
  let bloqueado = false;
  for (let i = 0; i < 40 && !bloqueado; i++) {
    const r = await pedir(e, { modo: 'codigo', codigo: 'MAL' + i, email: 'x' + i + '@gmail.com' }, '200.1.1.1');
    if (r.status === 429) bloqueado = true;
  }
  ok(bloqueado, 'misma IP: un script que sigue probando termina frenado (429)');
}

console.log(`worker-auth abierto: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
