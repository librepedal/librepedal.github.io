#!/usr/bin/env node
// Verifica si una URL de YouTube es alcanzable SIN sesión de Google, antes de pegarla en
// cualquier formulario de envío externo (Play Console, App Store, etc).
//
// Nace directo del rechazo #17 de Play Console de LibrePedal (11-sept-2026): el video de
// la declaración de permisos estaba en PRIVADO y nadie lo detectó porque nadie lo abrió
// sin sesión antes de enviar -- se infirió la causa del rechazo en vez de verificarla.
// Ver memoria: librepedal-play-rechazo-17-video-privado.
//
// Usa el endpoint oEmbed público de YouTube (sin API key, sin cuota):
//   https://www.youtube.com/oembed?url=<url>&format=json
// LIMITACIÓN HONESTA (no inventar certeza que no existe): oEmbed devuelve 200 tanto para
// videos PÚBLICOS como NO LISTADOS -- ambos son "accesibles por link directo". Solo
// distingue accesible (público o no listado) vs PRIVADO/borrado/inexistente (falla).
// Si Play/la política exige "Público" y no solo "accesible", ese matiz (público vs no
// listado) solo se confirma mirando el campo de privacidad en YouTube Studio a mano --
// este script NO reemplaza ese paso, solo atrapa el error más caro (video privado).
//
// Uso: node verificar-video-publico.mjs <url1> [url2] [...]
// Exit code 0 = todas accesibles. Exit code 1 = al menos una falló (revisar salida).

const urls = process.argv.slice(2);

if (urls.length === 0) {
  console.error('Uso: node verificar-video-publico.mjs <url-youtube> [otra-url ...]');
  process.exit(2);
}

let huboFalla = false;

for (const url of urls) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  try {
    const res = await fetch(oembedUrl, { redirect: 'follow' });
    if (res.status === 200) {
      const data = await res.json();
      console.log(`OK   ${url}`);
      console.log(`     título: "${data.title}" · autor: ${data.author_name}`);
      console.log(`     (accesible sin sesión -- puede ser público O no listado; confirmar "Público" a mano en YouTube Studio si la política lo exige)`);
    } else if (res.status === 401 || res.status === 403) {
      console.log(`FALLA ${url}`);
      console.log(`     HTTP ${res.status}: video PRIVADO o restringido. NO enviar esta URL a ningún formulario de revisión.`);
      huboFalla = true;
    } else if (res.status === 404) {
      console.log(`FALLA ${url}`);
      console.log(`     HTTP 404: video borrado o URL incorrecta.`);
      huboFalla = true;
    } else {
      console.log(`FALLA ${url}`);
      console.log(`     HTTP ${res.status} inesperado -- revisar a mano.`);
      huboFalla = true;
    }
  } catch (err) {
    console.log(`FALLA ${url}`);
    console.log(`     error de red: ${err.message}`);
    huboFalla = true;
  }
  console.log('');
}

process.exit(huboFalla ? 1 : 0);
