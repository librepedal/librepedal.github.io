// functions/_middleware.js — librepedal.cl como cara pública, no como acceso directo a la app.
//
// 2026-10-17, pedido de Inty: "no necesitamos la app en la web, para eso está Play Store (y
// luego iOS)". librepedal.cl debe mostrar la landing (qué es Libre Pedal + futura tienda) a
// cualquier navegador normal -- un QR, un buscador, alguien curioso -- y dejar la app
// funcional SOLO para quien la abre desde la app instalada.
//
// El problema real: la app nativa YA tiene `server.url: https://librepedal.cl` grabado en el
// AAB que ya está publicado en Play Store (capacitor.config.json). No se puede mover el
// contenido de golpe sin romperle la app a cualquiera que ya la tenga instalada -- eso
// necesitaría un AAB nuevo + pasar la revisión de Google, que no es instantáneo (ver
// CONTINUAR-EN-OTRA-CUENTA.md / COORDINACION-IA para el resto de ese proceso).
//
// Solución sin AAB nuevo, ship inmediato: distinguir la petición. El WebView de Android (el
// que usa la app instalada) manda un User-Agent reconocible -- trae "; wv)" (marca explícita
// de WebView desde Android 8) o el patrón más viejo "Version/X.X Chrome/" que un Chrome de
// verdad nunca manda. Un navegador normal (de escritorio o celular) no trae ninguna de las dos.
//
// OJO, esto es una señal, NO una barrera de seguridad real: alguien que fuerce su User-Agent
// llega igual al código -- el código de esta app siempre fue público (ver auditoría de
// seguridad de esta sesión). El objetivo es solo que un visitante casual no caiga en la app
// funcional por error, no bloquear a un atacante decidido.
//
// Bypass explícito para pruebas/desarrollo: `?app=1` en la URL fuerza la app funcional y deja
// una cookie (30 días) para no repetirlo en cada visita mientras se prueba desde un navegador
// de escritorio normal.
//
// iOS (cuando exista, Inty ya lo tiene en el plan): WKWebView no deja una marca tan clara como
// Android en el User-Agent -- cuando se suba a iOS, revisar si hace falta mandar un header
// propio desde la app nativa en vez de confiar solo en esto.

const ES_WEBVIEW_ANDROID = /; wv\)|Version\/[\d.]+\s+Chrome\//;
const COOKIE_APP = 'lp_app';

function tieneCookieApp(request) {
  const cookie = request.headers.get('Cookie') || '';
  return new RegExp('(?:^|;\\s*)' + COOKIE_APP + '=1(?:;|$)').test(cookie);
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Solo nos metemos en la raíz (donde vive la decisión landing-vs-app). Todo lo demás
  // (assets, /api/*, terminos.html, etc.) sigue exactamente igual que siempre.
  if (url.pathname !== '/' && url.pathname !== '/index.html') return next();

  // Bypass manual (pruebas): ?app=1 fuerza la app y deja cookie para no repetirlo.
  if (url.searchParams.get('app') === '1') {
    const res = await next();
    const headers = new Headers(res.headers);
    headers.append('Set-Cookie', COOKIE_APP + '=1; Max-Age=2592000; Path=/; Secure; SameSite=Lax');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }

  const ua = request.headers.get('User-Agent') || '';
  const esApp = tieneCookieApp(request) || ES_WEBVIEW_ANDROID.test(ua);
  if (esApp) return next();

  // Navegador normal: landing, no la app funcional.
  // OJO: pedimos "/landing" (URL limpia), NO "/landing.html" -- Cloudflare Pages redirige
  // (308) automáticamente toda URL con extensión .html a su versión sin extensión, y
  // env.ASSETS.fetch() pasa por esa misma lógica (confirmado en vivo: /landing.html
  // devolvía el 308 en vez del contenido). Pedir la URL limpia de entrada se lo salta.
  return env.ASSETS.fetch(new Request(new URL('/landing', url), request));
}
