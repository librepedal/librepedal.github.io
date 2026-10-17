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
const RED = { firestore: [], oauth: 0, cuentas: new Set(), firestoreFalla: false, privados: new Map(), privConsultas: 0 };
globalThis.fetch = async (url, init) => {
  url = String(url);
  if (url.includes('securetoken@system.gserviceaccount.com')) return new Response(JSON.stringify({ k1: pem(google.publicKey, 'spki') }));
  if (url === 'https://oauth2.googleapis.com/token') {
    RED.oauth++;
    const a = new URLSearchParams(init.body).get('assertion');
    const ok = crypto.verify('sha256', Buffer.from(a.split('.').slice(0, 2).join('.')), servicio.publicKey, Buffer.from(a.split('.')[2], 'base64url'));
    return ok ? new Response(JSON.stringify({ access_token: 'tok-servicio' })) : new Response('{}', { status: 400 });
  }
  const mp = url.match(/^https:\/\/firestore\.googleapis\.com\/v1\/projects\/librepedal-cb983\/databases\/\(default\)\/documents\/usersPrivate\/([^?]+)/);
  if (mp) {
    RED.privConsultas++;
    if ((init.headers || {}).Authorization !== 'Bearer tok-servicio') return new Response('{}', { status: 403 });
    if (RED.firestoreFalla) return new Response('{}', { status: 500 });
    const correo = RED.privados.get(decodeURIComponent(mp[1]));
    return correo ? new Response(JSON.stringify({ fields: { email: { stringValue: correo } } })) : new Response('{}', { status: 404 });
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
  ok(RED.firestore.length === 0, 'Google no consulta users/ (solo usersPrivate, para saber quién es el dueño del cu)');
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
  for (const escrito of ['EVENTO 2026', 'evento-2026', ' Evento2026 ']) {
    r = await pedir(e, { modo: 'codigo', codigo: escrito, email: 'dictado' + escrito.length + escrito.charCodeAt(1) + '@gmail.com' });
    ok(r.status === 200 && r.data.token, 'evento: el código escrito "' + escrito + '" (con espacio, guion o minúsculas) entra');
  }
  r = await pedir(e, { modo: 'codigo', codigo: 'TESTER 123', email: 'tester@gmail.com' });
  ok(r.status === 401 && !r.data.token, 'tester: su código NO se normaliza (sigue exacto)');
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

// ---------- 5. Auditoría 2026-10-17: suplantación con el código compartido + correo ajeno ----------
// Hallazgo real: CODIGO_TESTER es UN SOLO código para todo el grupo -- antes de este fix,
// código + el correo de CUALQUIER tester real daba un token válido COMO esa persona, sin
// pedirle ninguna prueba de serlo. Lo mismo, en un caso más angosto, con el código del evento
// y la marca en KV: una vez "fichado" un correo, servía para siempre, incluso después de que
// la persona real se registrara de verdad.
{
  // 5a. Mientras nadie demostró ser dueño de su cuenta de verdad, el código sigue funcionando
  // IGUAL que siempre (cero regresión para quien nunca hizo login verificado).
  let r = await pedir(env(), { modo: 'codigo', codigo: 'TESTER123', email: 'otra@gmail.com' });
  ok(r.status === 200 && uidDe(r.data.token) === 'otra_gmail_com', 'antes de verificar: el código de tester sigue entrando como antes (sin regresión)');

  // 5b. El ataque real: "otra@gmail.com" nunca pidió nada -- alguien con el código compartido
  // (filtrado, adivinado, o un tester malicioso) entra COMO ella sabiendo solo su correo público.
  const eAtaque = env();
  r = await pedir(eAtaque, { modo: 'codigo', codigo: 'TESTER123', email: 'otra@gmail.com' });
  ok(r.status === 200 && uidDe(r.data.token) === 'otra_gmail_com', 'ataque (antes del fix de fondo): código + correo ajeno = token válido como esa persona -- confirma que el hueco existía');

  // 5c. Ahora "otra@gmail.com" entra de verdad por Google (el único camino que prueba quién es).
  const eReal = env();
  r = await pedir(eReal, { idToken: await idToken('otra@gmail.com') });
  ok(r.status === 200 && uidDe(r.data.token) === 'otra_gmail_com', 'la dueña real entra por Google');
  ok(eReal.RATE_LIMIT_AUTH.m.has('verificado:otra_gmail_com'), 'Google deja la marca "verificado" en KV para esa cuenta');

  // 5d. EL FIX: con esa cuenta ya marcada como verificada, el código compartido (tester o
  // evento) YA NO SIRVE para ella NUNCA MÁS -- cierra la suplantación de 5b para siempre.
  r = await pedir(eReal, { modo: 'codigo', codigo: 'TESTER123', email: 'otra@gmail.com' });
  ok(r.status === 403 && !r.data.token && /ya inició sesión/.test(r.data.error), 'FIX: tras verificar por Google, el código de tester queda bloqueado para esa cuenta (403)');
  r = await pedir(eReal, { modo: 'codigo', codigo: 'EVENTO2026', email: 'otra@gmail.com' });
  ok(r.status === 403 && !r.data.token && /ya inició sesión/.test(r.data.error), 'FIX: tampoco el código de evento sirve tras verificar (cierra el mismo hueco por ese camino)');

  // 5e. Variante del hallazgo 2: alguien "ficha" un correo nuevo con el código del evento,
  // y DESPUÉS la persona real se registra de verdad con Google -- antes, el fichador seguía
  // entrando para siempre por la marca 'evento:' en KV, aunque la cuenta ya tuviera dueña real.
  const eFichado = env();
  r = await pedir(eFichado, { modo: 'codigo', codigo: 'EVENTO2026', email: 'fichada@gmail.com' });
  ok(r.status === 200 && r.data.token, 'alguien ficha un correo nuevo con el código del evento');
  r = await pedir(eFichado, { idToken: await idToken('fichada@gmail.com') });
  ok(r.status === 200 && r.data.token, 'la dueña real llega después y se registra de verdad con Google (mismo cu)');
  r = await pedir(eFichado, { modo: 'codigo', codigo: 'EVENTO2026', email: 'fichada@gmail.com' });
  ok(r.status === 403 && !r.data.token, 'FIX: el fichador ya NO puede seguir entrando con el código del evento tras eso (antes, la marca en KV se lo permitía para siempre)');

  // 5f. Falla cerrada: sin KV no se puede comprobar "verificado", así que el código no entra
  // (igual criterio que el resto de los chequeos de impersonación de este archivo).
  r = await pedir(env({ RATE_LIMIT_AUTH: undefined }), { modo: 'codigo', codigo: 'TESTER123', email: 'otra@gmail.com' });
  ok(r.status === 503 && !r.data.token, 'sin KV, el código no entra (no se puede descartar una suplantación) -- falla cerrada');

  // 5g. El admin no se toca por este cambio: sigue exigiendo SU código propio, nunca el compartido.
  r = await pedir(env(), { idToken: await idToken('intyrivera.a@gmail.com') });
  ok(r.status === 200 && r.data.token, 'admin verificado por Google también queda marcado, sin romper nada');
  r = await pedir(env(), { modo: 'codigo', codigo: 'ADMIN999', email: 'intyrivera.a@gmail.com' });
  ok(r.status === 200 && uidDe(r.data.token) === 'intyrivera_a_gmail_com', 'admin: CODIGO_ADMIN (propio, no el compartido) sigue funcionando igual');
}

// ---------- 6. Auditoría 2026-10-17 (#3): dos correos distintos, el mismo cu ----------
// cuDeEmail cambia todo lo que no es letra/número por '_': 'intyrivera@a-gmail.com' da el cu
// del admin real (intyrivera.a@gmail.com). Con un dominio propio y el correo verificado por
// Google, antes se recibía un token como el admin (o como cualquier persona con punto en su correo).
{
  const claimsDeToken = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).claims || null;
  RED.privados = new Map([['intyrivera_a_gmail_com', 'intyrivera.a@gmail.com'], ['juan_perez_gmail_com', 'Juan.Perez@gmail.com']]);

  // 6a. El ataque contra el admin: correo verificado de OTRO dominio que produce su mismo cu.
  const e = env();
  let r = await pedir(e, { idToken: await idToken('intyrivera@a-gmail.com') });
  ok(r.status === 403 && !r.data.token && /choca con otra cuenta/.test(r.data.error), 'FIX #3: un correo que choca con el cu del admin NO recibe token (403)');
  ok(!e.RATE_LIMIT_AUTH.m.has('verificado:intyrivera_a_gmail_com') && !e.RATE_LIMIT_AUTH.m.has('dueno:intyrivera_a_gmail_com'), 'FIX #3: el intento rechazado no deja marcas sobre la cuenta ajena');

  // 6b. El admin real sigue entrando, y su token trae el claim adm (lo exige isAdmin()).
  r = await pedir(e, { idToken: await idToken('intyrivera.a@gmail.com') });
  ok(r.status === 200 && uidDe(r.data.token) === 'intyrivera_a_gmail_com', 'el admin real entra por Google');
  ok(claimsDeToken(r.data.token) && claimsDeToken(r.data.token).adm === true, 'el token del admin trae claims.adm = true');
  ok(e.RATE_LIMIT_AUTH.m.get('dueno:intyrivera_a_gmail_com') === 'intyrivera.a@gmail.com', 'el cu del admin queda atado a su correo');
  r = await pedir(e, { modo: 'codigo', codigo: 'ADMIN999', email: 'intyrivera.a@gmail.com' });
  ok(r.status === 200 && claimsDeToken(r.data.token) && claimsDeToken(r.data.token).adm === true, 'con CODIGO_ADMIN también trae claims.adm');

  // 6c. Nadie más recibe el claim admin.
  r = await pedir(e, { idToken: await idToken('cualquiera@gmail.com') });
  ok(r.status === 200 && claimsDeToken(r.data.token) === null, 'un usuario normal no recibe claims');

  // 6d. El mismo ataque contra un usuario normal con punto en el correo (dueño en usersPrivate,
  // guardado con mayúsculas: se compara sin distinguirlas).
  r = await pedir(e, { idToken: await idToken('juan@perez-gmail.com') });
  ok(r.status === 403 && !r.data.token, 'FIX #3: juan@perez-gmail.com no entra a la cuenta de juan.perez@gmail.com');
  r = await pedir(e, { idToken: await idToken('juan.perez@gmail.com') });
  ok(r.status === 200 && uidDe(r.data.token) === 'juan_perez_gmail_com', 'el dueño real (mismo correo, otras mayúsculas en usersPrivate) entra');

  // 6e. Cuenta sin usersPrivate: el primer correo la ata, y otro que choca ya no entra.
  r = await pedir(e, { idToken: await idToken('ana.diaz@gmail.com') });
  ok(r.status === 200 && e.RATE_LIMIT_AUTH.m.get('dueno:ana_diaz_gmail_com') === 'ana.diaz@gmail.com', 'cuenta nueva: el primer correo queda como dueño');
  const consultas = RED.privConsultas;
  r = await pedir(e, { idToken: await idToken('ana.diaz@gmail.com') });
  ok(r.status === 200 && RED.privConsultas === consultas, 'con la atadura en KV ya no se consulta Firestore');
  r = await pedir(e, { idToken: await idToken('ana@diaz-gmail.com') });
  ok(r.status === 403 && !r.data.token, 'FIX #3: un correo que choca con una cuenta ya atada no entra');

  // 6f. Por código (tester/evento) rige lo mismo.
  r = await pedir(e, { modo: 'codigo', codigo: 'EVENTO2026', email: 'ana@diaz-gmail.com' });
  ok(r.status === 403 && !r.data.token, 'FIX #3: el código del evento tampoco sirve con un correo que choca');
  const e2 = env({ TESTERS_PERMITIDOS: 'tester@gmail.com, tester-gmail@com' });
  r = await pedir(e2, { modo: 'codigo', codigo: 'TESTER123', email: 'tester@gmail.com' });
  ok(r.status === 200, 'tester: entra y ata su cu');
  r = await pedir(e2, { modo: 'codigo', codigo: 'TESTER123', email: 'tester-gmail@com' });
  ok(r.status === 403 && !r.data.token, 'FIX #3: otro tester con un correo que choca no entra a esa cuenta');

  // 6g. Falla cerrada: si no se puede leer usersPrivate, no se emite token.
  RED.firestoreFalla = true;
  r = await pedir(env(), { idToken: await idToken('nadie.aun@gmail.com') });
  ok(r.status === 503 && !r.data.token, 'Firestore caído y sin atadura previa → 503 sin token');
  RED.firestoreFalla = false;
  r = await pedir(env({ RATE_LIMIT_AUTH: undefined }), { idToken: await idToken('x@gmail.com') });
  ok(r.status === 503 && !r.data.token, 'sin KV no se emite token (no se puede comprobar el dueño)');
  RED.privados = new Map();
}

console.log(`worker-auth abierto: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
