// Ciclistas en el mismo punto (2026-10-09). Inty: "no se están mostrando en el mapa los demás ciclistas que se
// registraron con el código LIBREPEDAL". Las posiciones se publican redondeadas a ~1 km (privacidad), así que en un
// evento todos comparten la MISMA coordenada y con zoom >= 10 se dibujaban uno encima del otro (se veía uno solo).
// _abanicoCoincidentes los abre alrededor del punto. Corre la función REAL de ciclistas-mapa-clustering.js.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(raiz, 'ciclistas-mapa-clustering.js'), 'utf8');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

const i = src.indexOf('function _abanicoCoincidentes(');
ok(i >= 0, 'existe _abanicoCoincidentes');
const j = src.indexOf('\nfunction _renderMainMapUsers', i);
const abanico = new Function(src.slice(i, j) + '\nreturn _abanicoCoincidentes;')();
// proyección simple: 1 grado = 10.000 px (zoom alto)
const proy = (ll) => ({ x: ll[0] * 10000, y: -ll[1] * 10000 }), desp = (p) => ({ lng: p[0] / 10000, lat: -p[1] / 10000 });

const seis = ['ana', 'beto', 'caro', 'dani', 'eli', 'fran'].map((nombre, k) => ({ id: 'u' + k, nombre, lat: -40.15, lon: -72.40 }));
const r = abanico(seis, proy, desp);
const pos = new Set(r.map((u) => u.lat.toFixed(6) + ',' + u.lon.toFixed(6)));
ok(r.length === 6, 'no se pierde ningún ciclista');
ok(pos.size === 6, `los 6 que comparten coordenada quedan en 6 lugares distintos (antes 1): ${pos.size}`);
const dist = r.map((u) => Math.hypot(proy([u.lon, u.lat]).x - proy([-72.40, -40.15]).x, proy([u.lon, u.lat]).y - proy([-72.40, -40.15]).y));
ok(dist.every((d) => d > 20 && d <= 70), 'quedan alrededor del punto, a pocos píxeles (no agrega precisión a la posición)');
ok(r.map((u) => u.nombre).join() === 'ana,beto,caro,dani,eli,fran', 'cada uno conserva su nombre y su Pistero');
const solo = abanico([{ id: 'x', lat: -40.1, lon: -72.3 }, { id: 'y', lat: -40.2, lon: -72.5 }], proy, desp);
ok(solo[0].lat === -40.1 && solo[1].lon === -72.5, 'los que no coinciden con nadie quedan exactamente donde estaban');
ok(/_abanicoCoincidentes\(vivos,/.test(src), 'el mapa principal lo usa al dibujar con zoom alto');

console.log(`ciclistas en el mismo punto: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
