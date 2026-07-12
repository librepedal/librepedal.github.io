// Libre Pedal — emisor de tokens personalizados de Firebase.
// Reemplaza el auth anónimo (uid aleatorio, distinto por dispositivo) por un uid
// ESTABLE = tu propio `cu` (derivado del correo), igual en cualquier celular.
// Con esto, Firestore por fin puede verificar "¿es el dueño de verdad?" comparando
// request.auth.uid contra el campo `user` que YA se guarda en cada documento desde
// siempre — no hace falta re-escribir datos viejos, quedan protegidos también.
//
// No agrega ningún riesgo nuevo: hoy cualquiera puede escribir en `users/{cu}` con
// el `cu` que quiera con solo estar autenticado anónimamente (las reglas no lo
// impiden) — este Worker mantiene el mismo modelo de confianza (el correo nunca
// se verifica en esta app), solo lo hace ESTABLE en vez de aleatorio por sesión.
//
// Secretos requeridos (wrangler secret put, nunca en el código):
//   FIREBASE_CLIENT_EMAIL     — el client_email de la cuenta de servicio.
//   FIREBASE_PRIVATE_KEY_B64  — el private_key en base64 (una sola línea: "wrangler
//                                secret put" trunca valores multilínea leídos por
//                                stdin, así que la PEM real —con sus saltos de
//                                línea— viaja codificada y se decodifica acá).

import { SignJWT, importPKCS8 } from 'jose';

const CU_OK = /^[a-zA-Z0-9_]{1,128}$/;
const AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'usa POST' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });

    let body = null;
    try { body = await request.json(); } catch (e) {}
    const cu = body && typeof body.cu === 'string' ? body.cu.trim() : '';
    if (!CU_OK.test(cu)) {
      return new Response(JSON.stringify({ error: 'cu invalido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    try {
      const privateKeyPem = atob(env.FIREBASE_PRIVATE_KEY_B64 || '');
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
      return new Response(JSON.stringify({ token: token }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'no se pudo emitir el token', detalle: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  }
};
