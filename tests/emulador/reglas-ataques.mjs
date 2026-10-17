// Ataques reales contra firestore.rules en el EMULADOR (auditoría de seguridad 2026-10-17).
// Los tests de tests/*.test.mjs revisan el TEXTO de las reglas; este corre la lógica de verdad:
// cada hallazgo confirmado tiene su ataque (debe ser rechazado) y el uso legítimo de la app
// (debe seguir funcionando). Sin dependencias: habla REST con el emulador.
//
// Correr (necesita Java 11+ y firebase-tools):
//   cd tests/emulador && npx firebase emulators:exec --only firestore --project demo-librepedal "node reglas-ataques.mjs"
const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
const P = 'demo-librepedal';
const BASE = `http://${HOST}/v1/projects/${P}/databases/(default)/documents`;
let n = 0, f = 0;
const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

// ---------- auth: el emulador acepta JWT sin firmar ----------
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function tok(uid, { proveedor = 'custom', claims = {} } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return b64u({ alg: 'none', typ: 'JWT' }) + '.' + b64u({
    iss: 'https://securetoken.google.com/' + P, aud: P, iat: now, exp: now + 3600, auth_time: now,
    sub: uid, user_id: uid, firebase: { sign_in_provider: proveedor }, ...claims
  }) + '.';
}
const ADMIN = 'owner'; // el emulador trata "Bearer owner" como Admin SDK (se salta las reglas)

// ---------- codificación de valores de Firestore REST ----------
function val(v) {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { mapValue: { fields: campos(v) } };
}
const campos = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)]));
const nombre = (ruta) => `projects/${P}/databases/(default)/documents/${ruta}`;

// Escribe con :commit. `ahora` = campos que van como serverTimestamp(). `campos` en update = solo esos.
async function escribir(quien, ruta, datos, { crear = false, actualizar = false, ahora = [] } = {}) {
  const w = { update: { name: nombre(ruta), fields: campos(datos) } };
  if (actualizar) { w.updateMask = { fieldPaths: Object.keys(datos) }; w.currentDocument = { exists: true }; }
  if (crear) w.currentDocument = { exists: false };
  if (ahora.length) w.updateTransforms = ahora.map((c) => ({ fieldPath: c, setToServerValue: 'REQUEST_TIME' }));
  const r = await fetch(`${BASE}:commit`, { method: 'POST', headers: cab(quien), body: JSON.stringify({ writes: [w] }) });
  return r.status === 200;
}
async function borrar(quien, ruta) {
  const r = await fetch(`${BASE}:commit`, { method: 'POST', headers: cab(quien), body: JSON.stringify({ writes: [{ delete: nombre(ruta) }] }) });
  return r.status === 200;
}
async function leer(quien, ruta) {
  const r = await fetch(`${BASE}/${ruta}`, { headers: cab(quien) });
  return r.status === 200;
}
async function consultar(quien, coleccion, filtros) {
  const where = filtros.length === 1 ? { fieldFilter: filtros[0] } : { compositeFilter: { op: 'AND', filters: filtros.map((x) => ({ fieldFilter: x })) } };
  const r = await fetch(`${BASE}:runQuery`, { method: 'POST', headers: cab(quien),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coleccion }], where } }) });
  return r.status === 200;
}
const igual = (campo, v) => ({ field: { fieldPath: campo }, op: 'EQUAL', value: val(v) });
function cab(quien) {
  const h = { 'Content-Type': 'application/json' };
  if (quien) h.Authorization = 'Bearer ' + quien;
  return h;
}

// ---------- reglas actuales al emulador y base limpia ----------
import { readFileSync } from 'node:fs';
const reglas = readFileSync(process.env.REGLAS || new URL('../../firestore.rules', import.meta.url), 'utf8');
const rr = await fetch(`http://${HOST}/emulator/v1/projects/${P}:securityRules`, { method: 'PUT',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }) });
if (rr.status !== 200) { console.log('las reglas NO compilan: ' + await rr.text()); process.exit(1); }
await fetch(`http://${HOST}/emulator/v1/projects/${P}/databases/(default)/documents`, { method: 'DELETE' });

const A = 'ana_gmail_com', B = 'beto_gmail_com', X = 'atacante_gmail_com';
const tA = tok(A), tB = tok(B), tX = tok(X), tAnon = tok('anonimo123', { proveedor: 'anonymous' });
const ADM = 'intyrivera_a_gmail_com';

// ===== #1 /amistades: fabricar una amistad para leer el perfil privado =====
console.log('#1 amistades / friendRequests');
await escribir(ADMIN, `perfilPrivado/${B}`, { fotos: ['f1'], relatos: [] });
await escribir(ADMIN, `friendRequests/reqAB`, { from: A, to: B, status: 'accepted', fromNombre: 'Ana' });
const [xa, xb] = [X, B].sort();
ok(!(await escribir(tX, `amistades/${xa}_${xb}`, { a: xa, b: xb }, { crear: true })), 'ataque: amistad sin solicitud → rechazada');
ok(!(await escribir(tX, `amistades/${xa}_${xb}`, { a: xa, b: xb, req: 'noexiste' }, { crear: true })), 'ataque: amistad con una solicitud que no existe → rechazada');
ok(!(await escribir(tX, `amistades/${xa}_${xb}`, { a: xa, b: xb, req: 'reqAB' }, { crear: true })), 'ataque: amistad usando la solicitud aceptada de OTRO par → rechazada');
ok(!(await leer(tX, `perfilPrivado/${B}`)), 'ataque: el atacante no lee el perfil privado de B');
ok(!(await escribir(tX, 'friendRequests/fx1', { from: X, to: B, status: 'accepted', fromNombre: 'X' }, { crear: true })), 'ataque: crear una solicitud que nace "accepted" → rechazada');
ok(!(await escribir(tX, 'friendRequests/fx2', { from: B, to: X, status: 'pending' }, { crear: true })), 'ataque: crear una solicitud a nombre de otro → rechazada');
ok(await escribir(tX, 'friendRequests/fx3', { from: X, to: B, status: 'pending', fromNombre: 'X', authUid: X }, { crear: true }), 'legítimo: enviar una solicitud pendiente');
ok(!(await escribir(tX, 'friendRequests/fx3', { status: 'accepted' }, { actualizar: true })), 'ataque: el REMITENTE se acepta su propia solicitud → rechazado');
ok(!(await escribir(tAnon, 'friendRequests/fx3', { status: 'accepted' }, { actualizar: true })), 'ataque: un anónimo acepta la solicitud → rechazado');
ok(!(await escribir(tB, 'friendRequests/fx3', { status: 'accepted', to: A }, { actualizar: true })), 'ataque: el destinatario cambia también `to` → rechazado');
await escribir(ADMIN, 'friendRequests/fx4', { from: X, to: A, status: 'pending' });
ok(!(await escribir(tX, `amistades/${[X, A].sort().join('_')}`, { a: [X, A].sort()[0], b: [X, A].sort()[1], req: 'fx4' }, { crear: true })), 'ataque: amistad con una solicitud todavía PENDIENTE → rechazada');
// flujo real: B acepta y crea el espejo con req (social.js acceptFriendRequest)
ok(await escribir(tB, 'friendRequests/fx3', { status: 'accepted' }, { actualizar: true }), 'legítimo: el destinatario acepta (solo status)');
ok(!(await escribir(tB, 'friendRequests/fx3', { status: 'rejected' }, { actualizar: true })), 'una solicitud ya respondida no se vuelve a cambiar');
ok(await escribir(tB, `amistades/${xa}_${xb}`, { a: xa, b: xb, req: 'fx3' }, { crear: true }), 'legítimo: con la solicitud aceptada, la amistad se crea');
ok(await leer(tX, `perfilPrivado/${B}`), 'legítimo: ahora X (amigo de verdad) ve el perfil privado de B');
ok(!(await escribir(tA, `amistades/${xa}_${xb}`, { a: xa, b: xb, req: 'fx3' })), 'un tercero no reescribe la amistad');
ok(!(await borrar(tA, `amistades/${xa}_${xb}`)), 'un tercero no borra la amistad');
ok(await borrar(tB, `amistades/${xa}_${xb}`), 'cualquiera de los dos puede deshacer la amistad');

// ===== #2 /trips: el track GPS exacto era público =====
console.log('#2 trips');
await escribir(ADMIN, 'trips/t1', { user: A, name: 'Casa-pega', status: 'completed', gpsData: { distance: 12, points: [{ lat: -33.4, lon: -70.6 }] } });
ok(!(await leer(null, 'trips/t1')), 'ataque: leer un viaje sin cuenta → rechazado');
ok(!(await consultar(null, 'trips', [igual('status', 'completed')])), 'ataque: listar todos los viajes terminados sin cuenta → rechazado');
ok(!(await consultar(tX, 'trips', [igual('status', 'completed')])), 'ataque: listar los viajes de todos con cuenta → rechazado');
ok(!(await leer(tX, 'trips/t1')), 'ataque: leer el viaje de otro → rechazado');
ok(await leer(tA, 'trips/t1'), 'legítimo: la dueña lee su viaje');
ok(await consultar(tA, 'trips', [igual('user', A)]), "legítimo: la consulta de la app where('user','==',cu) funciona");

// ===== #3 isAdmin: el uid solo ya no basta =====
console.log('#3 admin');
await escribir(ADMIN, 'frasesComunidad/f1', { user: A, texto: 'hola', aprobada: false });
ok(!(await escribir(tok(ADM), 'frasesComunidad/f1', { aprobada: true }, { actualizar: true })), 'ataque: token con el uid del admin pero SIN claim adm → no es admin');
ok(await escribir(tok(ADM, { claims: { adm: true } }), 'frasesComunidad/f1', { aprobada: true }, { actualizar: true }), 'legítimo: el admin real (uid + claim adm) aprueba frases');

// ===== #4 /reportes: un anónimo borraba del mapa los avisos de peligro =====
console.log('#4 reportes');
await escribir(ADMIN, 'reportes/r1', { user: A, authUid: A, text: 'Hoyo grande', cat: 'peligro', confirmadoPor: [A], desmentidoPor: [], lastConfirm: new Date() });
ok(!(await escribir(tAnon, 'reportes/r1', { desmentidoPor: ['anonimo123'] }, { actualizar: true })), 'ataque: un anónimo desmiente (umbral 1 = lo borra del mapa) → rechazado');
ok(!(await escribir(tX, 'reportes/r1', { desmentidoPor: ['otro_uid'] }, { actualizar: true })), 'ataque: desmentir a nombre de otro → rechazado');
ok(!(await escribir(tX, 'reportes/r1', { desmentidoPor: [X, 'otro_uid'] }, { actualizar: true })), 'ataque: meter varios uids de golpe → rechazado');
ok(!(await escribir(tX, 'reportes/r1', { confirmadoPor: [] }, { actualizar: true })), 'ataque: vaciar confirmadoPor → rechazado');
ok(!(await escribir(tX, 'reportes/r1', { confirmadoPor: [A, X], lastConfirm: new Date('2099-01-01') }, { actualizar: true })), 'ataque: lastConfirm en el futuro (nunca vence) → rechazado');
ok(!(await escribir(tX, 'reportes/r1', { confirmadoPor: [A, X], lastConfirm: new Date('2001-01-01') }, { actualizar: true })), 'ataque: lastConfirm en el pasado (vence ya) → rechazado');
ok(await escribir(tX, 'reportes/r1', { confirmadoPor: [A, X] }, { actualizar: true, ahora: ['lastConfirm'] }), 'legítimo: "sigue ahí" (arrayUnion(uid) + serverTimestamp)');
ok(!(await escribir(tX, 'reportes/r1', { desmentidoPor: [X] }, { actualizar: true })), 'ataque: el mismo usuario confirma Y desmiente → rechazado');
ok(await escribir(tB, 'reportes/r1', { desmentidoPor: [B] }, { actualizar: true }), 'legítimo: "ya no está" (arrayUnion(uid))');
ok(!(await escribir(tB, 'reportes/r1', { desmentidoPor: [B, B] }, { actualizar: true })), 'ataque: votar dos veces → rechazado');

// ===== #7 /frasesComunidad: auto-aprobación =====
console.log('#7 frasesComunidad');
ok(!(await escribir(tX, 'frasesComunidad/fx', { user: X, nombre: 'X', texto: 'frase', aprobada: true }, { crear: true })), 'ataque: crear la frase ya aprobada → rechazada');
ok(!(await escribir(tX, 'frasesComunidad/fx', { user: X, nombre: 'X', texto: 'frase' }, { crear: true })), 'ataque: crear la frase sin el campo aprobada → rechazada');
ok(await escribir(tX, 'frasesComunidad/fx', { user: X, nombre: 'X', texto: 'frase', aprobada: false, authUid: X }, { crear: true, ahora: ['ts'] }), 'legítimo: proponer una frase (queda en revisión)');

// ===== #8 /sosAlertas: 15 alertas del año 2100 mataban el SOS para siempre =====
console.log('#8 sosAlertas');
ok(!(await escribir(tAnon, 'sosAlertas/s1', { clat: -33.45, clon: -70.65, ts: new Date('2100-01-01') }, { crear: true })), 'ataque: SOS con ts en el año 2100 → rechazado');
ok(!(await escribir(tAnon, 'sosAlertas/s2', { ts: 0 }, { crear: true, ahora: ['ts'] })), 'ataque: SOS sin coordenadas (le salía a todos) → rechazado');
ok(!(await escribir(tAnon, 'sosAlertas/s3', { clat: -33.45, clon: -70.65, basura: 'x'.repeat(5000) }, { crear: true, ahora: ['ts'] })), 'ataque: SOS con campos extra → rechazado');
ok(!(await escribir(tAnon, 'sosAlertas/s4', { clat: 999, clon: -70.65 }, { crear: true, ahora: ['ts'] })), 'ataque: coordenadas imposibles → rechazado');
ok(await escribir(tA, 'sosAlertas/s5', { clat: -33.45, clon: -70.65 }, { crear: true, ahora: ['ts'] }), 'legítimo: el SOS de la app (clat/clon + serverTimestamp)');
ok(await escribir(tAnon, 'sosAlertas/s6', { clat: -33.45, clon: -70.65 }, { crear: true, ahora: ['ts'] }), 'legítimo: también con sesión anónima (un SOS no debe fallar por el token)');
ok(!(await borrar(tA, 'sosAlertas/s5')), 'un usuario no borra alertas');
ok(await borrar(tok(ADM, { claims: { adm: true } }), 'sosAlertas/s6'), 'el admin puede limpiar alertas falsas');

console.log(`\nreglas en emulador: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
