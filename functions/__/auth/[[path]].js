// Proxy de /__/auth/* hacia el auth handler real de Firebase (firebaseapp.com),
// pero servido bajo el dominio propio (librepedal.cl). Esto hace que, desde el
// punto de vista del navegador, el intercambio de login con Google sea de
// "primera parte" en vez de cruzar a un dominio de terceros — evita que el
// bloqueo de cookies/almacenamiento de terceros corte la sesión a mitad de
// camino (visto en producción: getRedirectResult() siempre volvía vacío).
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = new URL(url.pathname + url.search, 'https://librepedal-cb983.firebaseapp.com');
  const proxied = new Request(target.toString(), context.request);
  proxied.headers.set('Host', 'librepedal-cb983.firebaseapp.com');
  const resp = await fetch(proxied, { redirect: 'manual' });
  const headers = new Headers(resp.headers);
  // Si el handler intenta redirigir de vuelta a *.firebaseapp.com, lo reescribimos
  // para que la vuelta también quede en nuestro dominio.
  const loc = headers.get('Location');
  if (loc && loc.includes('librepedal-cb983.firebaseapp.com')) {
    headers.set('Location', loc.replace('https://librepedal-cb983.firebaseapp.com', 'https://librepedal.cl'));
  }
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}
