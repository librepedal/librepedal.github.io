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

// ===== XSS cero clic: rodadas / recommendations / hostels editables por cualquiera =====
console.log('XSS rodadas');
const XSS = "x'+alert(1)+'<img src=x onerror=alert(1)>";
await escribir(ADMIN, 'rodadas/rd1', { titulo: 'Salida', fecha: Date.now() + 86400000, creadoPor: A, asistentes: [A], user: A, authUid: A, ruta: { nombreRuta: 'R', distance: 10, subida: 120 } });
ok(!(await escribir(tAnon, 'rodadas/rd1', { ruta: { nombreRuta: 'R', distance: 10, subida: XSS } }, { actualizar: true })), 'ataque: anónimo mete HTML en ruta.subida de una rodada ajena → rechazado');
ok(!(await escribir(tX, 'rodadas/rd1', { creadoPor: XSS }, { actualizar: true })), 'ataque: reescribir creadoPor ajeno → rechazado');
ok(!(await escribir(tX, 'rodadas/rd1', { fecha: 1 }, { actualizar: true })), 'ataque: clavar la rodada arriba con fecha:1 → rechazado');
ok(!(await escribir(tX, 'rodadas/rd1', { asistentes: [A, X, B] }, { actualizar: true })), 'ataque: anotar a otro como asistente → rechazado');
ok(!(await escribir(tX, 'rodadas/rd1', { asistentes: [] }, { actualizar: true })), 'ataque: sacar a otros de la lista → rechazado');
ok(await escribir(tX, 'rodadas/rd1', { asistentes: [A, X] }, { actualizar: true }), 'legítimo: anotarse (arrayUnion(cu))');
ok(await escribir(tX, 'rodadas/rd1', { asistentes: [A] }, { actualizar: true }), 'legítimo: borrarse (arrayRemove(cu))');
ok(!(await escribir(tX, "rodadas/x'onerror", { titulo: 'a', fecha: 1, creadoPor: X, asistentes: [X], user: X }, { crear: true })), 'ataque: id de documento con comillas → rechazado');
ok(!(await escribir(tX, 'rodadas/rd2', { titulo: 'a', fecha: 1, creadoPor: X, asistentes: [X], user: X, id: XSS }, { crear: true })), 'ataque: campo `id` falso en los datos → rechazado');
ok(!(await escribir(tX, 'rodadas/rd3', { titulo: 'a', fecha: 1, creadoPor: X, asistentes: [X], user: X, ruta: { nombreRuta: 'R', distance: 1, subida: XSS } }, { crear: true })), 'ataque: crear con subida como texto → rechazado');
ok(await escribir(tX, 'rodadas/rd4', { titulo: 'Salida', desc: '', puntoEncuentro: 'Plaza', fecha: Date.now() + 86400000, creadoPor: X, nombreCreador: 'X', asistentes: [X], authUid: X, ruta: { nombreRuta: 'R', distance: 12.5, subida: null } }, { crear: true, ahora: ['ts'] }), 'legítimo: crear una rodada como la app');

console.log('XSS recommendations');
await escribir(ADMIN, 'recommendations/rc1', { user: A, title: 'Café', lat: -33.4, lon: -70.6, likes: 1, likedBy: [A], ratingSum: 4, votes: 1, ratedBy: { [A]: 4 } });
ok(!(await escribir(tAnon, 'recommendations/rc1', { lat: XSS }, { actualizar: true })), 'ataque: anónimo pone texto en lat (entraba a un onclick) → rechazado');
ok(!(await escribir(tX, 'recommendations/rc1', { lat: XSS }, { actualizar: true })), 'ataque: usuario cambia lat de una recomendación ajena → rechazado');
ok(!(await escribir(tX, 'recommendations/rc1', { likes: 9999 }, { actualizar: true })), 'ataque: inflar likes → rechazado');
ok(await escribir(tX, 'recommendations/rc1', { likes: 2, likedBy: [A, X] }, { actualizar: true }), 'legítimo: "me gusta"');
ok(await escribir(tX, 'recommendations/rc1', { likes: 1, likedBy: [A] }, { actualizar: true }), 'legítimo: quitar el "me gusta"');
ok(!(await escribir(tX, 'recommendations/rc1', { likes: 2, likedBy: [A, B] }, { actualizar: true })), 'ataque: "me gusta" a nombre de otro → rechazado');
ok(await escribir(tX, 'recommendations/rc1', { ratedBy: { [A]: 4, [X]: 5 }, votes: 2, ratingSum: 9 }, { actualizar: true }), 'legítimo: valorar 5 estrellas');
ok(await escribir(tX, 'recommendations/rc1', { ratedBy: { [A]: 4, [X]: 3 }, votes: 2, ratingSum: 7 }, { actualizar: true }), 'legítimo: cambiar mi valoración a 3');
ok(!(await escribir(tX, 'recommendations/rc1', { ratedBy: { [A]: 4, [X]: 1000 }, votes: 2, ratingSum: 1004 }, { actualizar: true })), 'ataque: valoración de 1000 estrellas → rechazado');
ok(!(await escribir(tX, 'recommendations/rc1', { ratedBy: { [A]: 1, [X]: 3 }, votes: 2, ratingSum: 4 }, { actualizar: true })), 'ataque: cambiar la valoración de otro → rechazado');
ok(!(await escribir(tX, 'recommendations/rc2', { user: X, title: 'a', lat: XSS, lon: 1, likes: 0, likedBy: [], ratingSum: 0, votes: 0, ratedBy: {} }, { crear: true })), 'ataque: crear con lat como texto → rechazado');
ok(!(await escribir(tX, 'recommendations/rc3', { user: X, title: 'a', likes: 500, likedBy: [], ratingSum: 0, votes: 0, ratedBy: {} }, { crear: true })), 'ataque: crear con 500 likes → rechazado');
ok(await escribir(tX, 'recommendations/rc4', { user: X, nombre: 'X', title: 'Café', cat: 'cafe', desc: 'rico', lat: -33.4, lon: -70.6, likes: 0, likedBy: [], ratingSum: 0, votes: 0, ratedBy: {}, authUid: X }, { crear: true, ahora: ['ts'] }), 'legítimo: crear una recomendación como la app');

console.log('XSS hostels');
await escribir(ADMIN, 'hostels/h1', { user: A, name: 'Casa', lat: -33.4, lon: -70.6 });
ok(!(await escribir(tAnon, 'hostels/h1', { id: XSS }, { actualizar: true })), 'ataque: anónimo mete un `id` falso en un alojamiento → rechazado');
ok(!(await escribir(tX, 'hostels/h1', { lat: 'texto' }, { actualizar: true })), 'ataque: lat como texto (vaciaba la lista para todos) → rechazado');
ok(!(await escribir(tA, 'hostels/h1', { name: 'Casa 2' }, { actualizar: true })), 'nadie actualiza hostels (la app no lo hace; los votos van a guiComments)');
ok(!(await escribir(tX, 'hostels/h2', { user: X, name: 'a', lat: XSS }, { crear: true })), 'ataque: crear con lat como texto → rechazado');
ok(await escribir(tX, 'hostels/h3', { user: X, nombre: 'X', tipo: 'casa', name: 'Casa', location: 'Viña', desc: '', ratingSum: 0, votes: 0, ratedBy: {}, lat: -33, lon: -71, authUid: X }, { crear: true, ahora: ['ts'] }), 'legítimo: crear un alojamiento como la app');

// ===== #10 /users: perfiles viejos sin authUid editables por cualquiera =====
console.log('#10 users');
await escribir(ADMIN, `users/${B}`, { nombre: 'Beto', km: 10, darma: 5 }); // perfil viejo, sin authUid
ok(!(await escribir(tAnon, `users/${B}`, { nombre: 'hackeado' }, { actualizar: true })), 'ataque: anónimo reescribe un perfil viejo sin authUid → rechazado');
ok(!(await escribir(tX, `users/${B}`, { authUid: X }, { actualizar: true })), 'ataque: ponerse como dueño de un perfil ajeno (dejaba fuera al dueño) → rechazado');
ok(await escribir(tB, `users/${B}`, { bio: 'hola', lat: -33.4, lon: -70.6, visible: true }, { actualizar: true }), 'legítimo: el dueño actualiza su perfil (set merge de la app)');
await escribir(ADMIN, `users/${A}`, { nombre: 'Ana', authUid: null });
ok(await escribir(tA, `users/${A}`, { bio: 'ya puedo' }, { actualizar: true }), 'arreglo: el dueño de un perfil con authUid:null ya puede actualizarlo');

// ===== #6 /dm: escribir en la conversación de otros dos =====
console.log('#6 dm');
const conv = [A, B].sort().join('__');
ok(!(await escribir(tX, `dm/${conv}/messages/m1`, { from: X, text: 'soy tu amigo', authUid: X }, { crear: true })), 'ataque: un tercero escribe en la conversación de A y B → rechazado');
ok(!(await escribir(tA, `dm/${conv}/messages/m2`, { from: B, text: 'mensaje falso de B' }, { crear: true })), 'ataque: A escribe haciéndose pasar por B → rechazado');
ok(!(await escribir(tA, `dm/${conv}/messages/m3`, { text: 'sin from', authUid: A }, { crear: true })), 'ataque: mensaje sin `from` → rechazado');
ok(await escribir(tA, `dm/${conv}/messages/m4`, { from: A, nombre: 'Ana', text: 'hola Beto', authUid: A }, { crear: true, ahora: ['ts'] }), 'legítimo: A le escribe a B (como la app)');
ok(!(await borrar(tB, `dm/${conv}/messages/m4`)), 'B no borra el mensaje de A');

// ===== #12 /chat: publicar a nombre de otro =====
console.log('#12 chat');
ok(!(await escribir(tX, 'chat/c1', { a: A, nombre: 'Ana', t: 'mensaje falso' }, { crear: true })), 'ataque: publicar en el chat con el autor de otra persona → rechazado');
ok(!(await escribir(tX, 'chat/c2', { nombre: 'X', t: 'sin autor' }, { crear: true })), 'ataque: mensaje sin autor → rechazado');
ok(await escribir(tX, 'chat/c3', { a: X, nombre: 'X', t: 'hola a todos', h: '20:00' }, { crear: true, ahora: ['ts'] }), 'legítimo: publicar en el chat (como la app)');

// ===== #9 /direccionesGeo: envenenar la caché de direcciones =====
console.log('#9 direccionesGeo');
await escribir(ADMIN, 'direccionesGeo/hospital-van-buren', { q: 'hospital van buren', lat: -33.04, lon: -71.62, name: 'Hospital', origen: 'geocoder', creadoPor: A });
ok(!(await escribir(tAnon, 'direccionesGeo/hospital-van-buren', { lat: -33.9, lon: -71.9, creadoPor: 'anonimo123' }, { actualizar: true })), 'ataque: anónimo cambia las coordenadas del hospital → rechazado');
ok(!(await escribir(tX, 'direccionesGeo/hospital-van-buren', { lat: -33.9, lon: -71.9, creadoPor: X }, { actualizar: true })), 'ataque: otro usuario sobrescribe una dirección ajena → rechazado');
ok(!(await escribir(tX, 'direccionesGeo/terminal', { q: 'terminal', lat: -33, lon: -71, creadoPor: A }, { crear: true })), 'ataque: guardar una dirección a nombre de otro → rechazado');
ok(await escribir(tX, 'direccionesGeo/plaza-sotomayor', { q: 'plaza sotomayor', lat: -33.038, lon: -71.628, name: 'Plaza Sotomayor', origen: 'geocoder', creadoPor: X }, { crear: true, ahora: ['creadoEn'] }), 'legítimo: guardar una dirección nueva (como la app)');
ok(await escribir(tX, 'direccionesGeo/plaza-sotomayor', { lat: -33.0381, creadoPor: X }, { actualizar: true }), 'legítimo: quien la creó la corrige');

console.log(`\nreglas en emulador: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
