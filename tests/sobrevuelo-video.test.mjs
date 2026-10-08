// Video del sobrevuelo para redes (sobrevuelo-video.js) y "Compartir mi viaje" en la app instalada. Inty, 2026-10-08:
// - "en mi app que tengo de play store ... no sé si está publicando en redes el botón": dentro de la app instalada
//   (WebView de Android) no existe navigator.share (MDN: share() → WebView Android "No") y la descarga de un blob no hace
//   nada, así que "Compartir mi viaje" fallaba EN SILENCIO. Ahora dice la verdad: "abre librepedal.cl en Chrome".
// - El video se crea en Chrome (MP4 vertical 1080x1920) y se comparte con el menú del teléfono; si no se puede, se descarga.
// - El nombre del archivo no rompe las tildes ("Futrono → Llifén" → libre-pedal-futrono-llifen.mp4, no "llife-n").
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// ---------- 1) el módulo de video carga solo y expone lo que usa el sobrevuelo ----------
const ctx = { console, setTimeout, clearTimeout, Promise, window: {} };
vm.createContext(ctx);
vm.runInContext(leer('sobrevuelo-video.js'), ctx, { filename: 'sobrevuelo-video.js' });
const V = ctx.window.SB3Video;
ok(V && typeof V.sync === 'function' && typeof V.vidComponer === 'function' && typeof V.vidTarjeta === 'function', 'sobrevuelo-video.js expone SB3Video');
ok(V.VID.W === 1080 && V.VID.H === 1920, 'el video es vertical 1080x1920 (Reels, TikTok, Historias)');

// ---------- 2) qué se hace con el video listo ----------
const archivo = { name: 'x.mp4' };
const navComparte = { share() {}, canShare: () => true }, navNo = { share() {}, canShare: () => false };
ok(V.sb3VideoSalida(archivo, navComparte, true) === 'app', 'en la app instalada: aviso (ahí no se puede guardar ni compartir)');
ok(V.sb3VideoSalida(archivo, navComparte, false) === 'compartir', 'Chrome que comparte archivos: botón Compartir video');
ok(V.sb3VideoSalida(archivo, navNo, false) === 'descargar', 'si no puede compartir archivos: se descarga');
ok(V.sb3VideoSalida(archivo, {}, false) === 'descargar', 'sin navigator.share: se descarga');

// ---------- 3) el nombre del archivo con tildes ----------
V.sync({ RUTA: { nombre: 'Futrono → Llifén' } });
ok(V.vidNombre() === 'libre-pedal-futrono-llifen.mp4', 'nombre sin tildes rotas: ' + V.vidNombre());
V.sync({ RUTA: { nombre: '' } });
ok(V.vidNombre() === 'libre-pedal-viaje.mp4', 'sin nombre: libre-pedal-viaje.mp4');

// ---------- 4) el códec: el primero que el teléfono sabe codificar ----------
const cfg = await V.sb3ElegirCodec((c) => Promise.resolve({ supported: c.codec === 'avc1.42e028' }));
ok(cfg && cfg.codec === 'avc1.42e028' && cfg.width === 1080 && cfg.height === 1920, 'elige el primer H.264 que el teléfono soporta');
ok((await V.sb3ElegirCodec(() => Promise.resolve({ supported: false }))) === null, 'si no soporta ninguno: null (se muestra el error)');

// ---------- 5) la app instalada no falla en silencio ----------
const s3 = leer('sobrevuelo-3d.js'), sv = leer('sobrevuelo-video.js');
ok(/function compartirViaje\(\)\{ if\(sb3EsAppNativa\(\)\)\{ V\(\)\.vidTarjeta\('app-imagen'\); return; \}/.test(s3), '"Compartir mi viaje" en la app instalada avisa en vez de fallar en silencio');
ok(/estado==='app-imagen'[^\n]*Abre librepedal\.cl en Chrome/.test(sv), 'el aviso de la imagen dice qué hacer: abrir librepedal.cl en Chrome');
ok(/estado==='app'\)[^\n]*Abre librepedal\.cl en Chrome/.test(sv), 'el aviso del video dice qué hacer: abrir librepedal.cl en Chrome');
ok(!/sí se comparte desde aquí/.test(sv), 'ningún aviso promete que la imagen se comparte desde la app (no es cierto)');
ok(/if\(sb3EsAppNativa\(\)\)\{ V\(\)\.vidTarjeta\('app'\); return; \}/.test(s3), 'en la app instalada el video no se empieza a grabar (no gasta batería para nada)');

// ---------- 6) los módulos nuevos se cargan antes del sobrevuelo y quedan offline ----------
const html = leer('index.html'), sw = leer('sw.js');
const pos = (s, x) => s.indexOf(x);
for (const m of ['sobrevuelo-3d-vista.js', 'sobrevuelo-3d-pegada.js', 'sobrevuelo-video.js']) {
  ok(pos(html, `<script src="${m}"></script>`) > 0 && pos(html, `<script src="${m}"></script>`) < pos(html, '<script src="sobrevuelo-3d.js"></script>'), `index.html carga ${m} antes de sobrevuelo-3d.js`);
  ok(sw.includes(`'./${m}'`), `sw.js guarda ${m} para usar sin señal`);
}

console.log(`video del sobrevuelo para redes: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
