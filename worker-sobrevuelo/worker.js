// Libre Pedal — pega la ruta de un viaje al camino UNA vez y la guarda (para el sobrevuelo 3D).
//
// Por qué existe (2026-10-07, Inty: "hazlo con un worker que lo guarde una vez por ruta"): el sobrevuelo 3D
// (sobrevuelo-3d.js) dibuja la ruta pegada al camino real con Valhalla `trace_route`. Llamarlo directo desde cada
// teléfono usa el servidor de DEMOSTRACIÓN de FOSSGIS (uso justo, con límite de tasa): con muchos usuarios se corta.
// Este worker hace el pedido una sola vez por ruta y guarda el resultado; las siguientes veces (otro teléfono, la app
// reinstalada) lo entrega desde la caché sin volver a molestar a Valhalla.
//
// Privacidad: la clave es un SHA-256 de los puntos (solo quien ya tiene esa misma ruta puede pedirla), el resultado
// expira en 180 días y el worker no registra coordenadas en ningún log.
//
// Cómo pega (lecciones del prototipo, ver COORDINACION-IA/mapa-navegacion/sobrevuelo-3d/README.md):
// - Valhalla responde 200 con SOLO un pedazo de la ruta si un punto salta lejos del camino: se pide por tramos de
//   ~120 puntos y se valida el largo de cada tramo (±10 %); el tramo que no cuadra queda con los puntos limpios.
// - El cliente manda la ruta ya limpia de saltos y con 1 punto cada ≥40 m (así funciona bien Valhalla).

const VALHALLA = 'https://valhalla1.openstreetmap.de/trace_route';
const ORIGENES_OK = ['https://librepedal.cl', 'https://www.librepedal.cl', 'https://librepedal-web.pages.dev'];
const PREFIJO = 'sbv:';                  // comparte el KV de worker-auth/proximidad con prefijo propio
const TTL_RUTA = 180 * 24 * 3600;        // 180 días
const MAX_PUNTOS = 6000;                 // ~240 km a 40 m
const TRAMO = 120;
// Límites de rutas NUEVAS (las guardadas no cuentan), decididos por Inty el 2026-10-07: 20 por conexión al día
// (los celulares comparten IP: 2 dejaría fuera a vecinos de la misma compañía) y 300 en total al día.
// Un solo registro por día (sbv:dia:AAAA-MM-DD) guarda el total y la cuenta de cada IP (como hash): así cada ruta nueva
// gasta 2 escrituras de KV (contador + ruta) y no 3. KV gratis = 1.000 escrituras/día compartidas con worker-auth.
// Es aproximado (KV no es transaccional y acepta 1 escritura/s por clave); si KV falla, deja pasar.
const MAX_NUEVAS_POR_IP_DIA = 20;
const MAX_NUEVAS_DIA = 300;

function cors(origen) {
  return {
    'Access-Control-Allow-Origin': ORIGENES_OK.includes(origen) ? origen : ORIGENES_OK[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin',
  };
}
const responder = (obj, status, origen) => new Response(JSON.stringify(obj), { status, headers: cors(origen) });

export function hav(a, b) { // a,b = [lon,lat]
  const r = Math.PI / 180, dLa = (b[1] - a[1]) * r, dLo = (b[0] - a[0]) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLo / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(s)));
}
const largo = (c) => { let s = 0; for (let i = 1; i < c.length; i++) s += hav(c[i - 1], c[i]); return s; };
export function decPoly6(z) {
  let i = 0, la = 0, lo = 0; const o = [];
  while (i < z.length) { for (let k = 0; k < 2; k++) { let sh = 0, res = 0, b; do { b = z.charCodeAt(i++) - 63; res |= (b & 31) << sh; sh += 5; } while (b >= 32); const v = (res & 1) ? ~(res >> 1) : (res >> 1); if (k) lo += v; else la += v; } o.push([lo / 1e6, la / 1e6]); }
  return o;
}
async function claveDe(pts) { // pts = [[lat,lon],...] ya redondeados
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(pts)));
  return PREFIJO + 'ruta:' + [...new Uint8Array(dig)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
// devuelve null si puede pegar, o el motivo si no. FALLA ABIERTA: si KV falla, se deja pasar (igual que worker-proximidad)
async function bajoLimite(env, ip, ahora = Date.now()) {
  if (!env.RATE_LIMIT_AUTH) return null;
  try {
    const dia = new Date(ahora - 4 * 3600 * 1000).toISOString().slice(0, 10); // día de Chile (aprox. UTC-4)
    const clave = PREFIJO + 'dia:' + dia, raw = await env.RATE_LIMIT_AUTH.get(clave);
    const d = raw ? JSON.parse(raw) : { total: 0, ips: {} };
    const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dia + '|' + ip)); // la IP no se guarda tal cual
    const h = [...new Uint8Array(dig)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
    if (d.total >= MAX_NUEVAS_DIA) return 'tope del día';
    if ((d.ips[h] || 0) >= MAX_NUEVAS_POR_IP_DIA) return 'límite de la conexión';
    d.total++; d.ips[h] = (d.ips[h] || 0) + 1;
    await env.RATE_LIMIT_AUTH.put(clave, JSON.stringify(d), { expirationTtl: 2 * 24 * 3600 });
    return null;
  } catch (e) { return null; }
}
async function pegarTramo(tr) { // tr = [[lat,lon],...]
  const propio = tr.map((p) => [p[1], p[0]]), Lg = largo(propio);
  try {
    const r = await fetch(VALHALLA, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shape: tr.map((p) => ({ lat: p[0], lon: p[1] })), costing: 'bicycle', shape_match: 'map_snap', trace_options: { search_radius: 50, gps_accuracy: 12 } }) });
    if (!r.ok) return { c: propio, ok: false };
    const j = await r.json();
    if (!j.trip || !j.trip.legs) return { c: propio, ok: false };
    let c = []; j.trip.legs.forEach((l, ix) => { const d = decPoly6(l.shape); c = c.concat(ix ? d.slice(1) : d); });
    return Lg > 0 && Math.abs(largo(c) - Lg) / Lg <= 0.1 ? { c, ok: true } : { c: propio, ok: false };
  } catch (e) { return { c: propio, ok: false }; }
}
export async function pegar(pts) {
  const tramos = []; for (let i = 0; i < pts.length - 1; i += TRAMO - 1) tramos.push(pts.slice(i, Math.min(pts.length, i + TRAMO)));
  const res = new Array(tramos.length); let sig = 0;
  const trabajador = async () => { while (sig < tramos.length) { const k = sig++; res[k] = await pegarTramo(tramos[k]); } };
  await Promise.all([trabajador(), trabajador()]); // de a 2 pedidos: uso justo del servidor de demostración
  let c = [], buenos = 0; res.forEach((x, k) => { if (x.ok) buenos++; c = c.concat(k ? x.c.slice(1) : x.c); });
  // compacto: 1 punto cada ≥25 m y 5 decimales (~1 m)
  const out = [c[0]]; for (let i = 1; i < c.length; i++) if (hav(out[out.length - 1], c[i]) >= 25 || i === c.length - 1) out.push(c[i]);
  return { c: out.map((p) => [+p[0].toFixed(5), +p[1].toFixed(5)]), m: buenos === res.length ? 'valhalla' : buenos > 0 ? 'parcial' : 'gps', t: buenos + '/' + res.length };
}

export default {
  async fetch(request, env) {
    const origen = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origen) });
    if (request.method !== 'POST') return responder({ error: 'usa POST' }, 405, origen);
    let body;
    try { body = await request.json(); } catch (e) { return responder({ error: 'body inválido' }, 400, origen); }
    const crudos = Array.isArray(body && body.puntos) ? body.puntos : null;
    if (!crudos || crudos.length < 3) return responder({ error: 'faltan puntos' }, 400, origen);
    if (crudos.length > MAX_PUNTOS) return responder({ error: 'ruta demasiado larga' }, 413, origen);
    const pts = [];
    for (const p of crudos) {
      const la = Array.isArray(p) ? p[0] : NaN, lo = Array.isArray(p) ? p[1] : NaN; // solo números: Number(null) daría 0
      if (typeof la !== 'number' || typeof lo !== 'number' || !isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return responder({ error: 'punto inválido' }, 400, origen);
      pts.push([+la.toFixed(5), +lo.toFixed(5)]);
    }
    const clave = await claveDe(pts);
    // 1) ya pegada → caché (sin escribir nada, sin llamar a Valhalla)
    try { const g = env.RATE_LIMIT_AUTH && (await env.RATE_LIMIT_AUTH.get(clave)); if (g) return responder({ ...JSON.parse(g), cache: true }, 200, origen); } catch (e) { /* sigue sin caché */ }
    // 2) nueva → límite por IP, pegar y guardar (las fallidas del todo no se guardan: se reintenta otro día)
    const ip = request.headers.get('CF-Connecting-IP') || 'desconocida';
    const lim = await bajoLimite(env, ip);
    if (lim) return responder({ error: 'demasiadas rutas nuevas hoy (' + lim + ')' }, 429, origen);
    const r = await pegar(pts);
    if (r.m !== 'gps') { try { await env.RATE_LIMIT_AUTH.put(clave, JSON.stringify(r), { expirationTtl: TTL_RUTA }); } catch (e) { /* sin guardar: igual se entrega */ } }
    return responder({ ...r, cache: false }, 200, origen);
  },
};
