// Libre Pedal — "hay un ciclista cerca" para quien va motorizado, SIN exponer la
// posicion ni el nombre de nadie a quien pregunta.
//
// Por que existe (2026-09-03): motor-navegacion.js le avisaba "ciclista adelante" a
// quien iba en modo moto leyendo DIRECTO la coleccion liveTracking de Firestore desde el
// cliente (where('activo','==',true)). Eso exigia que firestore.rules dejara esa
// coleccion LISTABLE por cualquiera -- hallazgo real de privacidad: sin haber recibido
// ningun link, cualquiera podia enumerar en vivo la posicion y nombre de todo el que
// comparte ubicacion. Se cerro esa lectura publica (ver firestore.rules,
// commit 9387ca9) y la alerta quedo apagada porque no hay forma de resolver esto con
// reglas de cliente sin volver a abrir el mismo hueco.
//
// Este worker es la pieza que faltaba: corre con credenciales de SERVIDOR (la Service
// Account de Firebase, que no esta sujeta a firestore.rules), calcula la distancia el
// mismo, y le devuelve a quien pregunta SOLO un si/no + una distancia redondeada -- nunca
// lat/lon/nombre de un tercero. El cliente que llama tampoco necesita saber quien esta
// cerca, solo que hay alguien y que tan lejos.

// OJO: 'datastore.readonly' NO es un scope valido para la API de Firestore (solo
// existe para el Datastore clasico) -- da 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT aunque
// el JWT y el access_token se obtengan bien. Confirmado en vivo, 2026-09-03.
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CORS_ORIGEN = 'https://librepedal.cl';

function corsHeaders(origen) {
  const ok = origen === CORS_ORIGEN || origen === 'https://librepedal.pages.dev';
  return {
    'Access-Control-Allow-Origin': ok ? origen : CORS_ORIGEN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function base64url(bytes) {
  let bin = '';
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDeTexto(texto) {
  return base64url(new TextEncoder().encode(texto));
}

// PEM -> CryptoKey importable por Web Crypto (el runtime de Workers no tiene las APIs
// de Node que usan las librerias tipicas de Service Account -- esto es RS256 a mano).
async function _importarPrivateKey(pem) {
  const cuerpo = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(cuerpo), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

// Cache en memoria del "isolate" del worker -- Cloudflare puede reusar la misma
// instancia entre requests, asi que no pedimos un access_token nuevo cada vez (Google
// los da con 1h de vida). Si el isolate se recicla, se pide uno nuevo sin problema.
let _tokenCache = { valor: null, expira: 0 };

async function _obtenerAccessToken(env) {
  if (_tokenCache.valor && Date.now() < _tokenCache.expira - 60000) return _tokenCache.valor;
  const ahora = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: FIRESTORE_SCOPE,
    aud: TOKEN_URL,
    exp: ahora + 3600,
    iat: ahora,
  };
  const base = base64urlDeTexto(JSON.stringify(header)) + '.' + base64urlDeTexto(JSON.stringify(claims));
  const clave = await _importarPrivateKey(env.FIREBASE_PRIVATE_KEY);
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', clave, new TextEncoder().encode(base));
  const jwt = base + '.' + base64url(firma);

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt,
  });
  if (!r.ok) throw new Error('No se pudo autenticar contra Google (' + r.status + '): ' + (await r.text()).slice(0, 200));
  const data = await r.json();
  _tokenCache = { valor: data.access_token, expira: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

// Lee SOLO los campos que necesita (lat/lon/modo/id) -- nunca los reenvia, se quedan
// en el servidor, se usan aca mismo para calcular y se descartan.
async function _leerCiclistasActivos(env) {
  const token = await _obtenerAccessToken(env);
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    env.FIREBASE_PROJECT_ID +
    '/databases/(default)/documents:runQuery';
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'liveTracking' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'activo' },
          op: 'EQUAL',
          value: { booleanValue: true },
        },
      },
    },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Firestore respondio ' + r.status + ': ' + (await r.text()).slice(0, 300));
  const filas = await r.json();
  const out = [];
  for (const fila of filas) {
    const doc = fila && fila.document;
    if (!doc || !doc.fields) continue;
    const f = doc.fields;
    const lat = f.lat && f.lat.doubleValue != null ? f.lat.doubleValue : f.lat && f.lat.integerValue != null ? Number(f.lat.integerValue) : null;
    const lon = f.lon && f.lon.doubleValue != null ? f.lon.doubleValue : f.lon && f.lon.integerValue != null ? Number(f.lon.integerValue) : null;
    const modo = f.modo && f.modo.stringValue;
    const id = doc.name.split('/').pop();
    if (lat == null || lon == null) continue;
    out.push({ id, lat, lon, modo: modo || 'ciclismo' });
  }
  return out;
}

// Misma formula que calculateDistance() en motor-navegacion.js -- metros entre 2 puntos.
function _distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371,
    dLat = ((lat2 - lat1) * Math.PI) / 180,
    dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
}

// Portadas tal cual de rutas.js (_bearingEntrePuntos) y motor-navegacion.js (_vaAdelante):
// el filtro de "esta adelante, no cruzando ni ya pasado" necesitaba lat/lon reales para
// calcular el rumbo, asi que tiene que vivir aca -- el cliente ya no recibe lat/lon de
// nadie para calcularlo el mismo. CICLISTA_AVISO_ARCO=50 es el mismo valor de siempre.
const CICLISTA_AVISO_ARCO = 50;
function _bearing(a, b) {
  const toRad = Math.PI / 180,
    toDeg = 180 / Math.PI;
  const lat1 = a.lat * toRad,
    lat2 = b.lat * toRad,
    dLon = (b.lon - a.lon) * toRad;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * toDeg + 360) % 360);
}
function _vaAdelante(rumboMio, rumboAlCiclista) {
  if (rumboMio == null) return true; // sin rumbo confiable, mejor avisar
  const d = Math.abs((((rumboAlCiclista - rumboMio + 540) % 360) - 180));
  return d <= CICLISTA_AVISO_ARCO;
}

export default {
  async fetch(request, env) {
    const origen = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origen) });
    if (request.method !== 'POST')
      return new Response(JSON.stringify({ error: 'usa POST' }), { status: 405, headers: corsHeaders(origen) });

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'body invalido' }), { status: 400, headers: corsHeaders(origen) });
    }
    const lat = Number(body.lat),
      lon = Number(body.lon),
      // 800m: mismo techo que CICLISTA_AVISO_MAX_M en motor-navegacion.js -- no tiene
      // sentido buscar mas lejos de lo que la alerta real usaria.
      radioM = Math.min(Number(body.radioM) || 800, 800),
      rumbo = body.rumbo == null || body.rumbo === '' ? null : Number(body.rumbo);
    if (!isFinite(lat) || !isFinite(lon))
      return new Response(JSON.stringify({ error: 'lat/lon invalidos' }), { status: 400, headers: corsHeaders(origen) });

    try {
      const activos = await _leerCiclistasActivos(env);
      let masCerca = null;
      for (const c of activos) {
        if (c.modo === 'moto') continue; // un auto no le avisa a otro
        const m = _distanciaMetros(lat, lon, c.lat, c.lon);
        if (m > radioM) continue;
        if (!_vaAdelante(rumbo, _bearing({ lat, lon }, c))) continue; // no cruzando ni ya pasado
        if (!masCerca || m < masCerca) masCerca = m;
      }
      const resp =
        masCerca == null
          ? { hayCerca: false }
          : { hayCerca: true, distanciaAprox: Math.round(masCerca / 10) * 10 }; // redondeado, nunca el punto exacto
      return new Response(JSON.stringify(resp), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origen) },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'no se pudo calcular ahora' }), {
        status: 502,
        headers: corsHeaders(origen),
      });
    }
  },
};
