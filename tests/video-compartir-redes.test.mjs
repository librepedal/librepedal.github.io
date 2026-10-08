// Video 3D de la ruta (rutas.js) para redes + GPX solo como portabilidad. Inty, 2026-10-08:
// - "está exportando el archivo GPX... y además está publicando en la competencia" (el botón con ícono de compartir
//   exportaba GPX con "Súbela a Strava...") → compartir es compartir; el GPX va en su propio botón de descarga, sin nombres ajenos.
// - "no sé si se descarga el video, no sé dónde se descarga... debería dar la opción también de compartir"
//   → al terminar de grabar: botón "Compartir video" si el teléfono comparte archivos; si no, descarga diciendo dónde;
//   en la app instalada (donde la descarga no hace nada) se dice la verdad.
// - "son formatos diferentes que admite TikTok y Instagram" → el video sale SIEMPRE vertical 9:16 a 1080x1920 (MP4
//   primero), con el mapa cubriendo el cuadro y Pistero en la punta de la línea también después del recorte.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };
const rutas = leer('rutas.js'), index = leer('index.html'), como = leer('como-funciona.html');

// ---------- 1. GPX = portabilidad, sin parecer "compartir" ni nombrar a la competencia ----------
// Inty 2026-10-08 (después): "el archivo es para que la gente, si quiere migrar los datos que tiene en nuestra app, pueda
// hacerlo... y si quiere cambiarse de la competencia a Libre Pedal, tenga la opción de subir sus datos". Vuelve, bien rotulado.
const motor = leer('motor-navegacion.js');
ok(/title="Descargar GPX \(llevar tu ruta a otra app\)" onclick="exportarRutaGPX\([^)]*\)"><i class="fas fa-download">/.test(rutas), 'Mis rutas: botón "Descargar GPX" con ícono de descarga');
ok(index.includes("onclick=\"exportarDatosGPX()\"><i class=\"fas fa-download\"></i> Descargar ruta actual (GPX)"), "Estadísticas: \"Descargar ruta actual (GPX)\"");
ok(/title="Compartir este viaje"[^>]*><i class="fas fa-share-from-square">/.test(rutas), 'Mis rutas: el ícono de compartir está SOLO en el botón que comparte');
ok((rutas.match(/fa-share-from-square/g) || []).length === 1, 'el ícono de compartir no se usa en otro botón de Mis rutas');
ok(index.includes("Importar ruta desde otra app (archivo GPX)"), "importar GPX desde otra app sigue");
ok(/Descargar GPX/.test(como), 'cómo funciona explica la descarga GPX');
const visible = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '');
ok(!/strava|komoot|wikiloc/i.test(visible(index)) && !/strava|komoot|wikiloc/i.test(visible(como)), 'ningún texto visible nombra a Strava, Komoot o Wikiloc');
ok(!/Súbela a Strava/.test(motor) && /GPX_LISTO/.test(motor), 'el aviso al descargar no nombra a la competencia');
{ // en la app instalada no anuncia una descarga que no ocurre
  const i = motor.indexOf('const GPX_LISTO'), j = motor.indexOf('function exportarDatosGPX');
  const reg = { avisos: [], descargas: 0 };
  const mk = (nativa) => { const c = { Blob, URL: { createObjectURL: () => 'b', revokeObjectURL() {} }, setTimeout() {}, lpAviso: (m) => reg.avisos.push(m),
    window: nativa ? { Capacitor: { isNativePlatform: () => true } } : {},
    document: { createElement: () => ({ click() { reg.descargas++; } }), body: { appendChild() {}, removeChild() {} } } };
    vm.createContext(c); vm.runInContext(motor.slice(i, j).replace('const GPX_LISTO', 'var GPX_LISTO') + '\nthis.d=_descargarGPX;', c); return c; };
  ok(mk(true).d('<gpx/>', 'r') === false && reg.descargas === 0 && /Chrome/.test(reg.avisos[0] || ''), 'app instalada: no finge descargar, dice cómo');
  ok(mk(false).d('<gpx/>', 'r') === true && reg.descargas === 1, 'navegador: descarga el .gpx');
}

// ---------- 2. Botones del video ----------
ok(/id="btnCompartirVideo"[^>]*display:none[^>]*onclick="compartirVideoRuta\(\)"/.test(index), 'existe el botón "Compartir video", oculto al inicio');
ok(!/Grabar y descargar/.test(index + rutas), 'el botón ya no promete "descargar" (dice "Grabar video")');

// ---------- 3. Qué pasa al terminar de grabar (funciones reales de rutas.js) ----------
const ini = rutas.indexOf('let videoArchivo=null;'), fin = rutas.indexOf('function grabarVideoRuta(){');
ok(ini > 0 && fin > ini, 'se encuentran _videoListo y compartirVideoRuta');
function escenario({ puedeCompartir, nativa }) {
  const btn = { style: { display: 'none' } };
  const reg = { descargas: [], compartido: null, avisos: [] };
  const ctx = {
    console, setTimeout: () => {}, Blob,
    File: class { constructor(partes, nombre, o) { this.name = nombre; this.type = o.type; } },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
    document: {
      getElementById: (id) => (id === 'btnCompartirVideo' ? btn : null),
      createElement: () => ({ click() { reg.descargas.push(this.download); } }),
      body: { appendChild() {}, removeChild() {} }
    },
    navigator: puedeCompartir ? { canShare: (d) => !!(d.files && d.files.length), share: (d) => { reg.compartido = d; return Promise.resolve(); } } : {},
    window: nativa ? { Capacitor: { isNativePlatform: () => true } } : {},
    lpAviso: (m) => reg.avisos.push(m)
  };
  vm.createContext(ctx);
  vm.runInContext(rutas.slice(ini, fin) + '\nthis._videoListo=_videoListo; this.compartirVideoRuta=compartirVideoRuta;', ctx);
  const msg = ctx._videoListo(new Blob(['x']), 'libre-pedal-ruta.mp4', 'video/mp4');
  return { msg, btn, reg, ctx };
}
{
  const e = escenario({ puedeCompartir: true, nativa: false });
  ok(e.btn.style.display === '' && /Compartir video/.test(e.msg) && /TikTok/.test(e.msg), 'teléfono que comparte archivos: aparece "Compartir video" y el aviso lo dice');
  ok(e.reg.descargas.length === 0, 'si se puede compartir, no descarga por su cuenta');
  e.ctx.compartirVideoRuta();
  ok(e.reg.compartido && e.reg.compartido.files[0].name === 'libre-pedal-ruta.mp4' && e.reg.compartido.files[0].type === 'video/mp4', 'al tocar "Compartir video" comparte el archivo MP4');
  ok(/librepedal\.cl/.test(e.reg.compartido.text), 'el texto compartido lleva librepedal.cl');
}
{
  const e = escenario({ puedeCompartir: false, nativa: false });
  ok(e.btn.style.display === 'none' && e.reg.descargas[0] === 'libre-pedal-ruta.mp4' && /Descargas/.test(e.msg), 'navegador sin compartir: descarga y dice que quedó en Descargas');
}
{
  const e = escenario({ puedeCompartir: false, nativa: true });
  ok(e.reg.descargas.length === 0 && e.btn.style.display === 'none' && /Chrome/.test(e.msg), 'app instalada sin compartir: no finge descargar, dice cómo hacerlo');
}

// ---------- 4. Formato 9:16 a 1080x1920 ----------
const iC = rutas.indexOf('const VIDEO_ANCHO'), fC = rutas.indexOf('function grabarVideoRuta(){') > rutas.indexOf('function _dibujarCompositeVideo') ? rutas.indexOf('\n}\n', rutas.indexOf('function _dibujarCompositeVideo')) : -1;
const finComp = rutas.indexOf('\n}', rutas.indexOf('function _dibujarCompositeVideo'));
ok(iC > 0 && finComp > iC, 'se encuentra el compositor del video');
ok(/'video\/mp4;codecs=avc1,mp4a\.40\.2','video\/mp4',/.test(rutas), 'graba en MP4 primero (Instagram no acepta WebM)');
function componer(mcW, mcH, cssW, proyeccion) {
  const llamadas = [];
  const out = { width: 300, height: 150 };
  const ctx = {
    clearRect() {}, fillRect() {}, beginPath() {}, ellipse() {}, fill() {}, fillText() {}, save() {}, restore() {},
    translate: (x, y) => llamadas.push(['translate', x, y]),
    drawImage: (img, x, y, w, h) => llamadas.push(['drawImage', img.nombre, x, y, w, h])
  };
  const c = {
    Math, Number,
    document: { getElementById: () => out },
    videoCompositeCtx: ctx, videoRouteData: { distance: 10, calories: 200 },
    videoRiderImg: { nombre: 'pistero', complete: true, naturalWidth: 100 },
    videoMap: { getCanvas: () => ({ nombre: 'mapa', width: mcW, height: mcH }), getContainer: () => ({ clientWidth: cssW }), project: () => proyeccion }
  };
  vm.createContext(c);
  vm.runInContext(rutas.slice(iC, finComp + 2).replace('const VIDEO_ANCHO', 'var VIDEO_ANCHO') + '\nthis.dib=_dibujarCompositeVideo;', c);
  c.dib(0.5, -73, -40, 0);
  return { out, llamadas };
}
for (const [mcW, mcH, css, nombre] of [[1080, 2400, 360, 'teléfono alargado 20:9'], [1920, 1080, 1920, 'computador apaisado'], [1080, 1920, 360, 'pantalla 9:16']]) {
  const r = componer(mcW, mcH, css, { x: css / 2, y: (mcH / (mcW / css)) / 2 });
  ok(r.out.width === 1080 && r.out.height === 1920, nombre + ': el video sale a 1080x1920');
  const m = r.llamadas.find((l) => l[0] === 'drawImage' && l[1] === 'mapa');
  const cubre = m && m[2] <= 0.001 && m[3] <= 0.001 && m[2] + m[4] >= 1079.99 && m[3] + m[5] >= 1919.99;
  const proporcion = m && Math.abs(m[4] / m[5] - mcW / mcH) < 1e-6;
  ok(cubre && proporcion, nombre + ': el mapa cubre todo el cuadro sin deformarse');
  const t = r.llamadas.find((l) => l[0] === 'translate');
  ok(t && Math.abs(t[1] - 540) < 0.5 && Math.abs(t[2] - 960) < 0.5, nombre + ': Pistero (centro del mapa) cae al centro del video también tras el recorte (' + (t && t[1].toFixed(1)) + ',' + (t && t[2].toFixed(1)) + ')');
}
ok(/#video-canvas-out\{[^}]*object-fit:cover/.test(leer('estilos.css')), 'en pantalla el cuadro 9:16 se ve sin deformar (object-fit:cover)');

console.log(`video y compartir en redes: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
