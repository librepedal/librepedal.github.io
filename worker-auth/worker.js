// Libre Pedal — emisor de tokens personalizados de Firebase.
// Reemplaza el auth anónimo (uid aleatorio, distinto por dispositivo) por un uid
// ESTABLE = tu propio `cu` (derivado del correo), igual en cualquier celular.
// Con esto, Firestore por fin puede verificar "¿es el dueño de verdad?" comparando
// request.auth.uid contra el campo `user` que YA se guarda en cada documento desde
// siempre — no hace falta re-escribir datos viejos, quedan protegidos también.
//
// SEGURIDAD (2026-08-14): este archivo estaba desincronizado del worker real en
// producción — la versión vieja emitía un token válido para CUALQUIER `cu` que se le
// mandara, sin pedir contraseña ni verificar nada (hueco crítico: suplantación de
// cualquier cuenta, incluida admin — ver tarea #6 del hub de coordinación). El worker
// EN VIVO ya tenía el fix real desde antes, solo nunca se comiteó acá. Este archivo
// ahora es un calco exacto (des-empaquetado) de lo que corre hoy en Cloudflare,
// obtenido leyendo el script desplegado por la API — no reinventado.
//
// Ahora el cliente manda `idToken` (el ID token real que entrega Firebase Auth tras
// el login por link mágico al correo — ver `enviarLinkMagico` en index.html). Este
// Worker lo verifica de verdad contra las llaves públicas de Google (firma RS256,
// issuer/audience del proyecto real, `email_verified===true`) ANTES de derivar el
// `cu` y firmar el token personalizado. Sin un idToken real y verificado, no hay
// token — ya no se puede pedir uno a nombre de otra persona.
//
// Secretos requeridos (wrangler secret put, nunca en el código):
//   FIREBASE_CLIENT_EMAIL     — el client_email de la cuenta de servicio.
//   FIREBASE_PRIVATE_KEY_B64  — el private_key en base64 (una sola línea: "wrangler
//                                secret put" trunca valores multilínea leídos por
//                                stdin, así que la PEM real —con sus saltos de
//                                línea— viaja codificada y se decodifica acá).

import { SignJWT, importPKCS8, jwtVerify, importX509, decodeProtectedHeader } from 'jose';

const PROJECT = 'librepedal-cb983';
const ISS = 'https://securetoken.google.com/' + PROJECT;
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
// La cuenta admin real (ver isAdmin() en firestore.rules: uid == cuDeEmail(ADMIN_EMAIL)).
const ADMIN_EMAIL = 'intyrivera.a@gmail.com';

// Comparación de largo constante: no filtrar el código a fuerza de medir tiempos.
function codigosIguales(a, b) {
  let iguales = a.length === b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) iguales = false;
  }
  return iguales;
}

function cuDeEmail(email) {
  return String(email).replace(/[^a-zA-Z0-9]/g, '_');
}

// Contador+ventana sobre KV. FALLA ABIERTA a propósito en las dos funciones: si KV falla
// por lo que sea, se deja pasar el intento en vez de romper el login de gente real -- un
// límite que a veces no limita es aceptable, un login que a veces no deja entrar no lo es.
async function leerContador(env, clave) {
  if (!env.RATE_LIMIT_AUTH) return 0;
  try {
    const raw = await env.RATE_LIMIT_AUTH.get(clave);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (Date.now() - data.inicio > VENTANA_LIMITE_MS) return 0;
    return data.cuenta;
  } catch (e) {
    return 0;
  }
}
async function incrementarContador(env, clave) {
  if (!env.RATE_LIMIT_AUTH) return;
  try {
    const ahora = Date.now();
    const raw = await env.RATE_LIMIT_AUTH.get(clave);
    let data = raw ? JSON.parse(raw) : null;
    if (!data || ahora - data.inicio > VENTANA_LIMITE_MS) data = { inicio: ahora, cuenta: 0 };
    data.cuenta++;
    await env.RATE_LIMIT_AUTH.put(clave, JSON.stringify(data), { expirationTtl: Math.ceil(VENTANA_LIMITE_MS / 1000) + 20 });
  } catch (e) { /* KV caído: no romper el login por esto */ }
}

const VENTANA_LIMITE_MS = 10 * 60 * 1000; // 10 minutos
const MAX_POR_IP = 5;    // por dirección de origen -- frena un script/una IP insistiendo.
const MAX_POR_CORREO = 5; // por correo objetivo -- frena insistir contra UNA persona aunque
                           // el ataque venga rotando de IP en IP (el límite por IP solo no alcanza para eso).

// Sin esto, alguien con un código filtrado podía scriptear miles de intentos por minuto
// contra distintos correos, o insistir sin parar contra UNA persona puntual (ver
// MAX_POR_CORREO). Pedido explícito de Inty (2026-09-09): "que a una persona no la puedan
// intentar tantas veces". Cuenta TODO intento (éxito o no) -- protege contra volumen, no
// distingue si acertó.
async function bajoLimitePorIP(env, ip) {
  const clave = 'rl:ip:' + ip;
  const ok = (await leerContador(env, clave)) < MAX_POR_IP;
  await incrementarContador(env, clave);
  return ok;
}
// Solo LEE el contador de fallos de ese correo (no incrementa) -- se usa como gate antes
// de evaluar el código. El incremento real pasa en registrarIntentoFallido(), y solo ante
// un código incorrecto: un éxito (aunque venga después de un par de intentos fallidos) no
// debe dejar a la cuenta bloqueada.
async function bajoLimitePorCorreo(env, email) {
  return (await leerContador(env, 'rl:email:' + email)) < MAX_POR_CORREO;
}
async function registrarIntentoFallido(env, email) {
  await incrementarContador(env, 'rl:email:' + email);
}

// Cache de 1h de las llaves públicas de Google (JWKS) — no hay que pedirlas en cada request.
let _certs = { at: 0, data: null };
async function googleCerts() {
  const now = Date.now();
  if (_certs.data && now - _certs.at < 3600000) return _certs.data;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new Error('no se pudieron leer las llaves de Google');
  const data = await r.json();
  _certs = { at: now, data };
  return data;
}

// Verifica un ID token real de Firebase Auth: firma contra la llave pública del `kid`
// del header, issuer/audience del proyecto real, y exige correo verificado.
async function verificarIdToken(idToken) {
  const hdr = decodeProtectedHeader(idToken);
  if (!hdr || hdr.alg !== 'RS256' || !hdr.kid) throw new Error('cabecera inválida');
  const certs = await googleCerts();
  const pem = certs[hdr.kid];
  if (!pem) throw new Error('kid desconocido');
  const key = await importX509(pem, 'RS256');
  const { payload } = await jwtVerify(idToken, key, { issuer: ISS, audience: PROJECT });
  if (!payload.email) throw new Error('el token no trae correo');
  if (payload.email_verified !== true) throw new Error('correo no verificado');
  return payload;
}

// Orígenes reales de la app (mismo patrón ya usado en worker-ia): CORS no frena un
// script/curl (eso lo hace el límite por IP de arriba), pero sí evita que este Worker se
// pueda llamar desde JS de una página ajena usando la sesión de un visitante inocente.
const ORIGENES_OK = ['https://librepedal.cl', 'https://www.librepedal.cl', 'https://librepedal-web.pages.dev'];

export default {
  async fetch(request, env) {
    const origenReq = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGENES_OK.includes(origenReq) ? origenReq : ORIGENES_OK[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'usa POST' }, 405);

    const ip = request.headers.get('CF-Connecting-IP') || 'desconocida';
    if (!(await bajoLimitePorIP(env, ip))) {
      return json({ error: 'demasiados intentos, esperá unos minutos' }, 429);
    }

    let body = null;
    try { body = await request.json(); } catch (e) {}

    // ─── ENTRADA POR CÓDIGO DE TESTER (2026-08-16) ────────────────────────────
    // Por qué existe: durante la prueba cerrada el ingreso quedó bloqueado por los
    // dos lados a la vez — "Entrar con Google" no funciona en la app ya instalada
    // (es config nativa, necesita un .aab nuevo en Play) y el envío de correo no
    // entrega (el SMTP propio descarta los mensajes por falta de SPF/DKIM, y el
    // mailer de Firebase tiene un cupo diario ridículo que 3 pruebas agotan). Los
    // testers quedaron afuera sin ninguna vía. Esto les da una: un código único
    // que Inty reparte al grupo, y con el que cada uno entra con SU correo.
    //
    // FALLA CERRADA a propósito: sin los dos secretos puestos, esta rama no existe.
    // Desplegar el código no abre ningún agujero por sí solo.
    //   CODIGO_TESTER        — el código compartido (uno solo, largo y aleatorio).
    //   TESTERS_PERMITIDOS   — correos autorizados, separados por coma. Van como
    //                          SECRETO y no en el repo: este repo es PÚBLICO y son
    //                          datos personales de gente real.
    //
    // Es para la prueba cerrada; se quita cuando el login de Google esté arriba.
    if (body && body.modo === 'codigo') {
      if (!env.CODIGO_TESTER || !env.TESTERS_PERMITIDOS) {
        return json({ error: 'el ingreso por código no está habilitado' }, 403);
      }
      const codigo = typeof body.codigo === 'string' ? body.codigo.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!codigo || !email) return json({ error: 'falta el código o el correo' }, 400);

      // Seguridad 2026-09-09: CODIGO_TESTER es UNO SOLO compartido a todo el grupo de
      // testers -- probarlo con el correo de OTRO daba un token válido como esa persona,
      // sin más prueba que saber su correo público. Para la cuenta admin exacta (la única
      // con isAdmin()===true en firestore.rules), eso significaba compromiso total del
      // panel admin sabiendo solo el código público del grupo + el correo de Inty. Fix:
      // para ese correo exacto se exige un código DISTINTO (CODIGO_ADMIN, solo lo tiene
      // Inty) -- el código de tester normal ya NO sirve para entrar como admin. El resto
      // de los testers no cambia en NADA: mismo código compartido, mismo flujo de
      // siempre, cero impacto. La suplantación entre testers normales (no-admin) sigue
      // siendo un riesgo menor pendiente -- requiere código por persona, cambio más
      // grande que necesita coordinación para redistribuir códigos individuales.
      const esAdmin = email === ADMIN_EMAIL;
      if (esAdmin && !env.CODIGO_ADMIN) {
        return json({ error: 'el ingreso de administrador no está habilitado en este deploy' }, 403);
      }

      // Límite por correo (2026-09-09): además del límite por IP de arriba, esto frena
      // insistir contra UN correo puntual aunque el ataque venga rotando de IP en IP --
      // el límite por IP solo no alcanza para eso. Se chequea ANTES de comparar el código
      // (ni se evalúa el intento) y solo cuenta los que SALEN MAL: alguien que tipeó mal
      // el código un par de veces antes de acertar no queda penalizado.
      if (!(await bajoLimitePorCorreo(env, email))) {
        return json({ error: 'demasiados intentos con ese correo, esperá unos minutos' }, 429);
      }

      const esperado = String(esAdmin ? env.CODIGO_ADMIN : env.CODIGO_TESTER);
      if (!codigosIguales(codigo, esperado)) {
        await registrarIntentoFallido(env, email);
        return json({ error: 'código incorrecto' }, 401);
      }

      const permitidos = String(env.TESTERS_PERMITIDOS).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (permitidos.indexOf(email) === -1) {
        return json({ error: 'ese correo no está en la lista de testers de la prueba cerrada' }, 403);
      }
      if (!env.FIREBASE_PRIVATE_KEY_B64 || !env.FIREBASE_CLIENT_EMAIL) {
        return json({ error: 'este deploy no puede emitir tokens' }, 500);
      }
      try {
        const key = await importPKCS8(atob(env.FIREBASE_PRIVATE_KEY_B64), 'RS256');
        const now = Math.floor(Date.now() / 1000);
        const cu = cuDeEmail(email);
        const token = await new SignJWT({ uid: cu })
          .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
          .setIssuedAt(now)
          .setIssuer(env.FIREBASE_CLIENT_EMAIL)
          .setSubject(env.FIREBASE_CLIENT_EMAIL)
          .setAudience(AUD)
          .setExpirationTime(now + 3600)
          .sign(key);
        return json({ token, cu, email });
      } catch (e) {
        return json({ error: 'no se pudo emitir el token', detalle: String(e && e.message || e) }, 500);
      }
    }
    // ─── fin entrada por código ───────────────────────────────────────────────

    const idToken = body && typeof body.idToken === 'string' ? body.idToken.trim() : '';
    if (!idToken) return json({ error: 'falta idToken (inicia sesión con el link del correo)' }, 400);

    let payload;
    try {
      payload = await verificarIdToken(idToken);
    } catch (e) {
      return json({ error: 'identidad no verificada', detalle: String(e && e.message || e) }, 401);
    }
    const cu = cuDeEmail(payload.email);

    // Prueba cerrada: el idToken (Google) prueba QUIÉN es, pero no que esté invitado.
    // Mismo chequeo que el bloque modo:'codigo' de arriba. FALLA CERRADA a propósito:
    // sin el secreto puesto, esta vía queda bloqueada entera (igual que el otro modo),
    // no abierta a cualquier cuenta de Google verificada.
    if (!env.TESTERS_PERMITIDOS) {
      return json({ error: 'el ingreso con Google no está habilitado' }, 403);
    }
    const permitidos = String(env.TESTERS_PERMITIDOS).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (permitidos.indexOf(String(payload.email).toLowerCase()) === -1) {
      return json({ error: 'ese correo no está en la lista de testers de la prueba cerrada' }, 403);
    }

    if (!env.FIREBASE_PRIVATE_KEY_B64 || !env.FIREBASE_CLIENT_EMAIL) {
      // Deploy de staging sin la llave de firma: confirma la verificación pero no emite token.
      return json({ cu, email: payload.email, staging: true, note: 'verificado OK; sin llave de firma en este deploy' });
    }
    try {
      const privateKeyPem = atob(env.FIREBASE_PRIVATE_KEY_B64);
      const key = await importPKCS8(privateKeyPem, 'RS256');
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({ uid: cu })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuedAt(now)
        .setIssuer(env.FIREBASE_CLIENT_EMAIL)
        .setSubject(env.FIREBASE_CLIENT_EMAIL)
        .setAudience(AUD)
        .setExpirationTime(now + 3600)
        .sign(key);
      return json({ token, cu });
    } catch (e) {
      return json({ error: 'no se pudo emitir el token', detalle: String(e && e.message || e) }, 500);
    }
  }
};
