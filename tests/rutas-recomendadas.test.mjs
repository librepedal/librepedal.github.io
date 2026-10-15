// Rutas recomendadas desde GPX — lógica REAL de rutas-recomendadas.js.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'rutas-recomendadas.js'), 'utf8');
const HTML = readFileSync(join(raiz, 'index.html'), 'utf8');
const SW = readFileSync(join(raiz, 'sw.js'), 'utf8');
const FSR = readFileSync(join(raiz, 'firestore.rules'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

const puro = SRC.slice(0, SRC.indexOf('/* ---------- Nube'));
const R = new Function(puro + '\nreturn {_rrecDistM, rrecRecortarPuntas, rrecSimplificar, rrecLimpiarPunto, rrecResumen, rrecCelda, rrecCeldasVecinas, rrecArmarDocumento, RREC_MAX_PUNTOS, RREC_COLOR};')();

// Línea recta hacia el norte, un punto cada ~11 m (1e-4 grados de latitud).
const linea = (n, alt) => Array.from({ length: n }, (_, i) => ({ lat: -40.0 + i * 1e-4, lon: -72.0, alt: alt ? alt(i) : undefined }));

// ---- Distancia ----
t('1e-4° de latitud ≈ 11 m', Math.abs(R._rrecDistM({ lat: 0, lon: 0 }, { lat: 1e-4, lon: 0 }) - 11.1) < 0.2);

// ---- Recorte de privacidad ----
{
  const pts = linea(500); // ~5,5 km
  const rec = R.rrecRecortarPuntas(pts, 200);
  const comidoIni = R._rrecDistM(pts[0], rec[0]);
  const comidoFin = R._rrecDistM(rec[rec.length - 1], pts[pts.length - 1]);
  t('se come al menos 200 m del inicio', comidoIni >= 200 && comidoIni < 215);
  t('y al menos 200 m del final', comidoFin >= 200 && comidoFin < 215);
  t('el punto de partida real NO queda publicado', rec[0].lat !== pts[0].lat);
  t('ruta más corta que 400 m: queda vacía', R.rrecRecortarPuntas(linea(30), 200).length === 0);
  t('sin puntos no revienta', R.rrecRecortarPuntas(null, 200).length === 0);
}

// ---- Simplificar ----
{
  const pts = linea(5000);
  const s = R.rrecSimplificar(pts, 1500);
  t('deja como máximo 1500 puntos', s.length === 1500);
  t('conserva el primero y el último', s[0] === pts[0] && s[s.length - 1] === pts[pts.length - 1]);
  t('si ya son pocos, no toca nada', R.rrecSimplificar(linea(10), 1500).length === 10);
}

// ---- Punto limpio ----
{
  const p = R.rrecLimpiarPunto({ lat: -40.1234567, lon: -72.7654321, alt: 123.6, speed: 9, t: 5 });
  t('lat/lon a 5 decimales', p.lat === -40.12346 && p.lon === -72.76543);
  t('altura redondeada', p.alt === 124);
  t('no se cuela ni velocidad ni hora', !('speed' in p) && !('t' in p));
  t('sin altura no inventa una', !('alt' in R.rrecLimpiarPunto({ lat: 1, lon: 2 })));
}

// ---- Resumen ----
{
  const r = R.rrecResumen(linea(101, (i) => i % 2 ? 10 : 0)); // ~1,1 km, sube 10 m cincuenta veces
  t('distancia en km', Math.abs(r.distance - 1.11) < 0.02);
  t('subida acumulada', r.subida === 500);
  t('caja que la contiene', r.bbox.s === -40 && Math.abs(r.bbox.n - (-39.99)) < 1e-9);
}

// ---- Celdas para buscar cerca ----
t('celda de 1°', R.rrecCelda(-40.3, -72.6) === '-41_-73');
t('9 celdas vecinas (cabe en un where in de Firestore)', R.rrecCeldasVecinas(-40.3, -72.6).length === 9);
t('incluye la propia', R.rrecCeldasVecinas(-40.3, -72.6).includes('-41_-73'));

// ---- Documento completo ----
{
  const d = R.rrecArmarDocumento(linea(3000, (i) => i), '  Lago Ranco por la costa  ', 'Linda');
  t('arma sin error', !d.error);
  t('nombre limpio', d.nombre === 'Lago Ranco por la costa');
  t('respeta el tope de puntos', d.puntos.length <= R.RREC_MAX_PUNTOS);
  t('el inicio publicado ya viene recortado', d.inicio.lat > -40.0 + 0.0017);
  t('celda calculada desde el inicio publicado', d.celda === R.rrecCelda(d.inicio.lat, d.inicio.lon));
  t('distancia > 30 km', d.distance > 30);
  t('GPX vacío: error claro', !!R.rrecArmarDocumento([], 'x').error);
  t('ruta de 600 m: muy corta', /muy corta/.test(R.rrecArmarDocumento(linea(55), 'x').error || ''));
  t('nombre larguísimo se corta a 100', R.rrecArmarDocumento(linea(3000), 'x'.repeat(300)).nombre.length === 100);
}

// ---- Color propio ----
t('color violeta, distinto del naranjo (#fc4c02) y del dorado (#ffd700)', R.RREC_COLOR === '#a855f7');

// ---- Descarga sale de lo publicado ----
t('el GPX descargable usa los puntos publicados (r.puntos)', /_gpxDeRuta\(r\.puntos/.test(SRC));

// ---- Cargado y con reglas ----
t('index.html carga rutas-recomendadas.js', /<script src="rutas-recomendadas\.js"><\/script>/.test(HTML));
t('sw.js lo precachea', /'\.\/rutas-recomendadas\.js'/.test(SW));
t('firestore.rules tiene match /rutasRecomendadas', /match \/rutasRecomendadas\/\{id\}/.test(FSR));
const bloque = FSR.slice(FSR.indexOf('match /rutasRecomendadas/'), FSR.indexOf('}', FSR.indexOf('allow delete', FSR.indexOf('match /rutasRecomendadas/'))));
t('crear exige cuenta real y ser el autor', /signedInReal\(\)/.test(bloque) && /autor == request\.auth\.uid/.test(bloque));
t('tope de 1500 puntos en la regla', /size\(\) <= 1500/.test(bloque));

// ---- Pantalla (maqueta aprobada 2026-10-15) ----
const MAPA = readFileSync(join(raiz, 'mapa-render.js'), 'utf8');
const NAV = readFileSync(join(raiz, 'motor-navegacion.js'), 'utf8');
const CSS = readFileSync(join(raiz, 'estilos.css'), 'utf8');
t('el mapa carga las recomendadas al iniciar', /mp\.once\('load'[^\n]*rrecCargarEnMapa\(\)/.test(MAPA));
t('al cambiar la capa del mapa se vuelven a dibujar', /rrecRepintar\(\)/.test(MAPA));
t('importar un GPX ofrece recomendarla', /rrecOfrecerPublicar\(points, nombre\)/.test(NAV));
t('nunca publica sin un sí explícito (lpConfirmar antes de rrecPublicar)', (() => {
  const i = SRC.indexOf('async function rrecOfrecerPublicar'); const b = SRC.slice(i, SRC.indexOf('\n}\n', i));
  return b.indexOf('lpConfirmar(') > -1 && b.indexOf('lpConfirmar(') < b.indexOf('rrecPublicar(');
})());
t('la tarjeta trae Pedalearla y Bajar GPX', /Pedalearla/.test(SRC) && /Bajar GPX/.test(SRC));
t('solo el autor ve "Quitar"', /esMia=\(typeof cu!=='undefined' && cu && r\.autor===cu\)/.test(SRC));
t('el inicio de la ruta se puede tocar (blanco fácil con el dedo)', /rrec-inicio/.test(SRC) && /\.rrec-inicio\{/.test(CSS));
t('Rutas trae "Recomendar una ruta tuya"', /Recomendar una ruta tuya/.test(HTML) && /onclick="rrecSubirGPX\(\)"/.test(HTML));
t('el violeta de la tarjeta es el mismo de la línea', /\.ab\.rrec-pri\{background:#a855f7/.test(CSS));

console.log('  rutas-recomendadas.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
