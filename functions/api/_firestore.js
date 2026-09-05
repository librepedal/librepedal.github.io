// Lector de Firestore, SOLO LECTURA a propósito -- ver mapa.js para el porqué.
//
// La cuenta de servicio de Firebase tiene permiso de administrador sobre la base de datos
// de Libre Pedal: podría escribir y borrar datos de usuarios reales. Acá no se expone
// ninguna función que escriba. Si algún día hace falta escribir, que sea una decisión
// explícita y no algo que quedó disponible "por si acaso".
//
// Se firma el JWT a mano con WebCrypto porque en Cloudflare Pages Functions no corre el
// SDK de firebase-admin (necesita Node). Son 20 líneas y evita una dependencia entera.
// Puerto directo de la versión que corría en Capone (asistente-inty/functions/api/_firestore.js)
// -- misma lógica, pero sin caché del token en KV: acá el token se vuelve a firmar en cada
// cold miss del Cache API de mapa.js (una vez cada 24h por nodo de borde), así que no vale
// la pena la complejidad de guardarlo aparte.

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlTexto = (s) => btoa(unescape(encodeURIComponent(s)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// La clave privada viene en PEM; WebCrypto la quiere en binario.
function pemABinario(pem) {
  const limpio = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(limpio);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function token(env) {
  const sa = JSON.parse(env.FIREBASE_SA);
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64urlTexto(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = b64urlTexto(JSON.stringify({
    iss: sa.client_email,
    // Solo datastore: sin acceso a Storage, Auth ni nada más de la cuenta.
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: ahora + 3600, iat: ahora,
  }));
  const clave = await crypto.subtle.importKey('pkcs8', pemABinario(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', clave,
    new TextEncoder().encode(cabecera + '.' + cuerpo));

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: cabecera + '.' + cuerpo + '.' + b64url(firma),
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Google no dio token');
  return d.access_token;
}

const proyecto = (env) => JSON.parse(env.FIREBASE_SA).project_id;

// Firestore devuelve los valores envueltos por tipo ({stringValue:...}); acá se desenvuelven.
function valor(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o = {}; for (const k in (v.mapValue.fields || {})) o[k] = valor(v.mapValue.fields[k]); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valor);
  return null;
}
const campos = (doc) => {
  const o = { _id: (doc.name || '').split('/').pop() };
  for (const k in (doc.fields || {})) o[k] = valor(doc.fields[k]);
  return o;
};

// Lee una colección COMPLETA en una sola consulta. Existe solo para respuestas que se
// cachean horas enteras y se sirven iguales a TODO el que las pida (ver mapa.js) -- nunca
// para algo que se dispare en cada visita, que es justo el patrón que agotó la cuota de
// Libre Pedal en agosto. A Firestore no le cuesta caro devolver miles de documentos en UNA
// consulta; lo que cuesta caro es pedirla muchas veces.
export async function leerTodo(env, coleccion, { max = 6000 } = {}) {
  const tk = await token(env);
  const q = { from: [{ collectionId: coleccion }], limit: max };
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${proyecto(env)}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + tk, 'content-type': 'application/json' },
    body: JSON.stringify({ structuredQuery: q }),
  });
  if (!r.ok) return { error: r.status === 429 ? 'cuota' : 'http ' + r.status };
  const d = await r.json();
  return { docs: (Array.isArray(d) ? d : []).filter((x) => x && x.document).map((x) => campos(x.document)) };
}

// Cuenta documentos SIN leerlos: una lectura en vez de N. Con la cuota justa, esto es la
// diferencia entre que el panel de analítica funcione y que tumbe lo que le queda al día.
export async function contar(env, coleccion) {
  const tk = await token(env);
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${proyecto(env)}/databases/(default)/documents:runAggregationQuery`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + tk, 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: coleccion }] },
        aggregations: [{ alias: 'n', count: {} }],
      },
    }),
  });
  if (!r.ok) return { error: r.status === 429 ? 'cuota' : 'http ' + r.status };
  const d = await r.json();
  const fila = Array.isArray(d) ? d.find((x) => x && x.result) : null;
  return { n: fila ? Number(fila.result.aggregateFields.n.integerValue) : 0 };
}

// Lee una colección con tope. NUNCA sin tope: es justo el patrón que agotó la cuota de
// Libre Pedal y no se va a repetir desde acá.
export async function leer(env, coleccion, { max = 100, orden = null } = {}) {
  const tk = await token(env);
  const q = { from: [{ collectionId: coleccion }], limit: Math.min(max, 300) };
  if (orden) q.orderBy = [{ field: { fieldPath: orden.campo }, direction: orden.desc ? 'DESCENDING' : 'ASCENDING' }];
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${proyecto(env)}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + tk, 'content-type': 'application/json' },
    body: JSON.stringify({ structuredQuery: q }),
  });
  if (!r.ok) return { error: r.status === 429 ? 'cuota' : 'http ' + r.status };
  const d = await r.json();
  return { docs: (Array.isArray(d) ? d : []).filter((x) => x && x.document).map((x) => campos(x.document)) };
}
