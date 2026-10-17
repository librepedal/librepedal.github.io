// functions/_middleware.js — librepedal.cl debe mostrar la landing a un navegador normal y
// la app funcional solo al WebView de la app instalada (pedido de Inty, 2026-10-17: "no
// necesitamos la app en la web, para eso está Play Store"). Sin red: simula next()/env.ASSETS
// como lo haría el runtime real de Cloudflare Pages Functions.
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const { onRequest } = await import(pathToFileURL(join(raiz, 'functions/_middleware.js')).href);

let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

const UA_WEBVIEW_MODERNO = 'Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36';
const UA_WEBVIEW_VIEJO = 'Mozilla/5.0 (Linux; Android 4.4; Nexus 5) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Mobile Safari/537.36';
const UA_CHROME_ANDROID_REAL = 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
const UA_CHROME_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const UA_SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function peticion(path, { ua = '', cookie = '' } = {}) {
  const headers = new Headers();
  if (ua) headers.set('User-Agent', ua);
  if (cookie) headers.set('Cookie', cookie);
  return new Request('https://librepedal.cl' + path, { headers });
}

async function correr(path, opts) {
  let siguioALaApp = false;
  const context = {
    request: peticion(path, opts),
    next: async () => { siguioALaApp = true; return new Response('<app real/>', { status: 200, headers: { 'content-type': 'text/html' } }); },
    env: { ASSETS: { fetch: async (req) => new Response('<landing/>', { status: 200, headers: { 'content-type': 'text/html', 'x-fetched': new URL(req.url).pathname } }) } },
  };
  const res = await onRequest(context);
  return { siguioALaApp, res, texto: await res.text() };
}

// 1) WebView real de Android (moderno y viejo) -> app, no landing
for (const [etq, ua] of [['moderno (; wv))', UA_WEBVIEW_MODERNO], ['viejo (Version/4.0 Chrome/)', UA_WEBVIEW_VIEJO]]) {
  const { siguioALaApp, texto } = await correr('/', { ua });
  ok(siguioALaApp && texto === '<app real/>', 'WebView Android ' + etq + ' llega a la app');
}

// 2) Navegadores reales (Chrome Android, Chrome escritorio, Safari iPhone) -> landing
for (const [etq, ua] of [['Chrome Android real', UA_CHROME_ANDROID_REAL], ['Chrome escritorio', UA_CHROME_DESKTOP], ['Safari iPhone', UA_SAFARI_IPHONE]]) {
  const { siguioALaApp, texto } = await correr('/', { ua });
  ok(!siguioALaApp && texto === '<landing/>', etq + ' ve la landing, no la app');
}

// 3) Sin User-Agent (curl, bot) -> landing (nunca se asume WebView por defecto)
{
  const { siguioALaApp } = await correr('/', {});
  ok(!siguioALaApp, 'sin User-Agent -> landing (no se asume app)');
}

// 4) ?app=1 fuerza la app y deja cookie de 30 días
{
  const { siguioALaApp, res } = await correr('/?app=1', { ua: UA_CHROME_DESKTOP });
  ok(siguioALaApp, '?app=1 fuerza la app aunque el User-Agent sea un navegador normal');
  const setCookie = res.headers.get('set-cookie') || '';
  ok(/lp_app=1/.test(setCookie) && /Max-Age=2592000/.test(setCookie), '?app=1 deja cookie lp_app por 30 días');
}

// 5) La cookie ya puesta basta en visitas siguientes, sin repetir ?app=1
{
  const { siguioALaApp } = await correr('/', { ua: UA_CHROME_DESKTOP, cookie: 'otracosa=x; lp_app=1; mas=y' });
  ok(siguioALaApp, 'cookie lp_app=1 ya puesta fuerza la app sin el query param');
}

// 6) index.html se trata igual que la raíz
{
  const { siguioALaApp } = await correr('/index.html', { ua: UA_WEBVIEW_MODERNO });
  ok(siguioALaApp, '/index.html con WebView también llega a la app');
}

// 7) Cualquier otra ruta (assets, API, páginas sueltas) nunca se toca -- pasa directo
for (const ruta of ['/estilos.css', '/api/mapa', '/terminos.html', '/sw.js']) {
  const { siguioALaApp } = await correr(ruta, { ua: UA_CHROME_DESKTOP }); // navegador normal, a propósito
  ok(siguioALaApp, ruta + ' pasa directo sin que la landing lo intercepte');
}

console.log(`\n${n - f} ok, ${f} fallas — landing-vs-app.test.mjs`);
if (f) process.exit(1);
