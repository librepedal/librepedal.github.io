// Test de la "Foto del viaje" (foto-viaje.js, diseño aprobado por Inty 2026-10-16).
// Corre con: node tests/foto-viaje.test.mjs   (sin dependencias)
//
// Por qué importa: la imagen sale de la app y queda en el muro de otra persona. Un dato inventado
// (un 0 de desnivel sin altitud, una velocidad con las paradas, un "NaN") es exactamente lo que la
// auditoría "sin datos falsos" del 2026-10-15 sacó del resto de la app. Y el diseño es el aprobado:
// mapa pequeño + bloque de datos con altimetría, con foto opcional.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lee = (f) => readFileSync(join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
const src = lee('foto-viaje.js');
const F = new Function(src + '; return { _fvStats, _fvDatos, _fvHoras, _fvPuntos, _fvPerfil, _fvEncajar, _fvLineas };')();

let pass = 0, fail = 0;
function ok(desc, cond, detalle) {
  if (cond) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, detalle ? '-> ' + detalle : ''); }
}

// 10 km al norte, un punto cada 30 s a 20 km/h, con una parada de 20 min a la mitad.
const t0 = Date.UTC(2026, 9, 16, 12, 0, 0);
const pts = []; let t = t0, lat = -40.0;
const dLat = (20 / 3600 * 30) / 111.195;
for (let i = 0; i <= 60; i++) { pts.push({ lat, lon: -72.0, t, alt: 100 + i }); lat += dLat; t += 30000; if (i === 30) t += 20 * 60000; }
const ruta = { points: pts, distance: 10, startTime: pts[0].t, endTime: pts[pts.length - 1].t };

console.log('TIEMPO EN MOVIMIENTO (sin las paradas):');
let st = F._fvStats(ruta);
ok('30 min en movimiento (la parada de 20 min no cuenta)', Math.abs(st.movMs - 30 * 60000) < 60000, st.movMs / 60000);
ok('usa la distancia guardada de la ruta', st.km === 10, st.km);
ok('formato h:mm', F._fvHoras(78 * 60000) === '1:18' && F._fvHoras(5 * 60000) === '0:05', F._fvHoras(78 * 60000));

console.log('\nDESNIVEL Y ALTIMETRÍA SOLO CON ALTITUD REAL:');
const perfil = F._fvPerfil({ perfil: [{ dist: 0, alt: 80 }, { dist: 5, alt: 150 }, { dist: 10, alt: 120 }], subida: 74.6 });
ok('el perfil se arma con mín, máx y subida redondeada', perfil && perfil.altMin === 80 && perfil.altMax === 150 && perfil.subida === 75, JSON.stringify(perfil));
const conAlt = F._fvDatos(st, perfil);
ok('con perfil: Distancia, En movimiento y Desnivel +', conAlt.map(d => d.l).join('|') === 'Distancia|En movimiento|Desnivel +', conAlt.map(d => d.l).join('|'));
ok('el desnivel es el del perfil', conAlt[2].v === '75');
const sinAlt = F._fvDatos(st, null);
ok('sin perfil: no hay desnivel (nunca un 0 inventado)', !sinAlt.some(d => /desnivel/i.test(d.l)), JSON.stringify(sinAlt));
ok('sin perfil: en su lugar la velocidad en movimiento', sinAlt.some(d => d.l === 'Vel. media'));
ok('perfil vacío o roto -> null', F._fvPerfil(null) === null && F._fvPerfil({ perfil: [{ dist: 0, alt: 1 }] }) === null && F._fvPerfil({ perfil: [{ dist: 0, alt: NaN }, { dist: 1, alt: NaN }, { dist: 2, alt: NaN }] }) === null);

console.log('\nRUTAS RARAS NO ROMPEN LA IMAGEN:');
st = F._fvStats({ points: [{ lat: -40, lon: -72 }, { lat: -40.01, lon: -72 }] });
ok('sin horas: sin tiempo (no NaN)', st.movMs === 0);
ok('la distancia sale de los puntos si la ruta no la trae', st.km > 1 && st.km < 1.2, st.km);
ok('solo Distancia cuando no hay más datos', F._fvDatos(st, null).length === 1);
ok('ningún texto con NaN/undefined', !JSON.stringify(F._fvDatos(F._fvStats({ points: [] }), null)).match(/NaN|undefined/));
ok('puntos con lng (formato de Leaflet) también sirven', F._fvPuntos([{ lat: 1, lng: 2 }])[0].lon === 2);
ok('puntos inválidos se descartan', F._fvPuntos([{ lat: 'x', lon: 1 }, { lat: 95, lon: 1 }]).length === 0);
const salto = { points: [{ lat: -40, lon: -72, t: t0 }, { lat: -39, lon: -72, t: t0 + 60000 }] };
ok('un salto imposible del GPS no cuenta como movimiento', F._fvStats(salto).movMs === 0);
ok('decimales con coma', F._fvDatos(F._fvStats(ruta), null)[0].v === '10,0');

console.log('\nEL TRAZO SIN MAPA (sin señal) CABE EN LA TARJETA:');
const xy = F._fvEncajar(F._fvPuntos(pts), 64, 190, 952, 800, 100);
ok('todos los puntos dentro con margen', xy.every(p => p[0] >= 163.9 && p[0] <= 916.1 && p[1] >= 289.9 && p[1] <= 890.1));

console.log('\nNOMBRES LARGOS NO SE SALEN:');
const ctx = { measureText: (s) => ({ width: s.length * 30 }) };
const l = F._fvLineas(ctx, 'San Clemente → Camping Los Castaños por el camino viejo del lago', 600, 2);
ok('se corta en 2 líneas con "…"', l.length === 2 && l[1].endsWith('…') && l.every(x => x.length * 30 <= 600 + 30), JSON.stringify(l));

console.log('\nDISEÑO APROBADO Y BOTONES:');
ok('mapa con relieve: OpenFreeMap + DEM Terrarium', /tiles\.openfreemap\.org\/styles\/dark/.test(src) && /elevation-tiles-prod\/terrarium/.test(src) && /hillshade/.test(src));
ok('MapLibre se carga con verificación de integridad', /FV_ML_SRI = 'sha384-/.test(src) && /s\.integrity = FV_ML_SRI/.test(src));
ok('sin señal: la tarjeta cae al trazo solo (nunca queda vacía)', /_fvEncajar\(puntos/.test(src) && /setTimeout\(function\(\)\{ fin\(null\); \}, 15000\)/.test(src));
ok('la foto es opcional: "Solo el mapa" la quita', /Solo el mapa/.test(src) && /_fv\.foto = null/.test(src));
ok('altimetría con máx. y mín.', /'máx\. ' \+ mx/.test(src) && /'mín\. ' \+ mn/.test(src));
const rutas = lee('rutas.js');
ok('Mis rutas: Compartir abre la hoja (foto, sobrevuelo, mensaje)', /onclick="fvHojaCompartir\(/.test(rutas) && /data-a="foto"/.test(src) && /data-a="vuelo"/.test(src) && /data-a="texto"/.test(src));
ok('el GPX conserva su propio botón (compartir es compartir)', !/data-a="gpx"/.test(src) && /title="Descargar GPX \(llevar tu ruta a otra app\)"/.test(rutas));
ok('ya no hay cámara suelta en la fila de Mis rutas', !/onclick="fvAbrir\(/.test(rutas));
ok('al terminar un viaje: "Foto del viaje" en el resumen', /fvDesdeResumen\(\)/.test(lee('gamificacion-logros.js')));
ok('el archivo está en el caché de la app', /'\.\/foto-viaje\.js'/.test(lee('sw.js')) && /<script src="foto-viaje\.js"><\/script>/.test(lee('index.html')));

console.log(`\n${pass} OK, ${fail} FALLA(S)`);
process.exit(fail ? 1 : 0);
