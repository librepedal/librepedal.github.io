// Test de los datos de la "Foto del viaje" (foto-viaje.js, 2026-10-16).
// Corre con: node tests/foto-viaje.test.mjs   (sin dependencias)
//
// Por qué importa: la imagen sale de la app y queda en el muro de otra persona. Un dato inventado
// (un 0 de desnivel sin altitud, una velocidad con las paradas, un "NaN") es exactamente lo que la
// auditoría "sin datos falsos" del 2026-10-15 sacó del resto de la app.
//
// Evalúa foto-viaje.js REAL (solo define funciones; no toca el DOM al cargar).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(raiz, 'foto-viaje.js'), 'utf8');
const F = new Function(src + '; return { _fvStats, _fvDatos, _fvDur, _fvEncuadre, _fvMerc, _fvPuntos };')();

let pass = 0, fail = 0;
function ok(desc, cond, detalle) {
  if (cond) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, detalle ? '-> ' + detalle : ''); }
}

// Ruta sintética: 10 km hacia el norte, un punto cada 30 s a 20 km/h, con una parada de 20 min a la mitad.
const t0 = Date.UTC(2026, 9, 16, 12, 0, 0);
const pts = []; let t = t0, lat = -40.0;
const dLat = (20 / 3600 * 30) / 111.195; // ~166 m cada 30 s
for (let i = 0; i <= 60; i++) { pts.push({ lat, lon: -72.0, t, alt: 100 + i }); lat += dLat; t += 30000; if (i === 30) t += 20 * 60000; }
const ruta = { points: pts, distance: 10, startTime: pts[0].t, endTime: pts[pts.length - 1].t, nombreRuta: 'Futrono → Llifén' };

console.log('TIEMPO EN MOVIMIENTO (sin las paradas):');
let st = F._fvStats(ruta);
ok('30 min en movimiento (la parada de 20 min no cuenta)', Math.abs(st.movMs - 30 * 60000) < 60000, st.movMs / 60000);
ok('velocidad en movimiento ~20 km/h', Math.abs(st.velMov - 20) < 1, st.velMov);
ok('usa la distancia guardada de la ruta', st.km === 10, st.km);

console.log('\nDESNIVEL SOLO SI HAY ALTITUD REAL:');
ok('sube 60 m (de 100 a 160)', st.desnivel === 60, st.desnivel);
const sinAlt = { ...ruta, points: pts.map(({ alt, ...p }) => p) };
st = F._fvStats(sinAlt);
ok('sin altitud: no hay dato (null), nunca un 0 inventado', st.desnivel === null, st.desnivel);
ok('y no aparece en la imagen', !F._fvDatos(st).some(d => /desnivel/i.test(d.l)));
const ruido = { ...ruta, points: pts.map((p, i) => ({ ...p, alt: 100 + (i % 2 ? 2 : 0) })) };
ok('el temblor del GPS (±2 m) no suma desnivel', F._fvStats(ruido).desnivel === 0, F._fvStats(ruido).desnivel);

console.log('\nRUTAS RARAS NO ROMPEN LA IMAGEN:');
st = F._fvStats({ points: [{ lat: -40, lon: -72 }, { lat: -40.01, lon: -72 }] });
ok('sin horas: sin tiempo ni velocidad (no NaN)', st.movMs === 0 && st.velMov === 0);
ok('la distancia sale de los puntos si la ruta no la trae', st.km > 1 && st.km < 1.2, st.km);
const datos = F._fvDatos(st);
ok('solo Distancia cuando no hay más datos', datos.length === 1 && datos[0].l === 'Distancia', JSON.stringify(datos));
ok('ningún texto con NaN/undefined', !JSON.stringify(F._fvDatos(F._fvStats({ points: [] }))).match(/NaN|undefined/));
ok('puntos con lng (formato de Leaflet) también sirven', F._fvPuntos([{ lat: 1, lng: 2 }])[0].lon === 2);
ok('puntos inválidos se descartan', F._fvPuntos([{ lat: 'x', lon: 1 }, { lat: 95, lon: 1 }]).length === 0);
const salto = { points: [{ lat: -40, lon: -72, t: t0 }, { lat: -39, lon: -72, t: t0 + 60000 }] }; // 111 km en 1 min
ok('un salto imposible del GPS no cuenta como movimiento', F._fvStats(salto).movMs === 0);

console.log('\nFORMATO:');
ok('menos de 1 hora en minutos', F._fvDur(45 * 60000) === '45 min', F._fvDur(45 * 60000));
ok('más de 1 hora con h y min', F._fvDur(125 * 60000) === '2 h 05 min', F._fvDur(125 * 60000));
ok('decimales con coma', F._fvDatos(F._fvStats(ruta))[0].v === '10,0', F._fvDatos(F._fvStats(ruta))[0].v);

console.log('\nEL MAPA ENCUADRA TODA LA RUTA:');
const P = F._fvPuntos(pts), e = F._fvEncuadre(P, 520, 520, 60);
const xy = P.map(p => { const m = F._fvMerc(p.lat, p.lon, e.z); return { x: m.x - e.cx + 260, y: m.y - e.cy + 260 }; });
ok('todos los puntos dentro del recuadro con margen', xy.every(p => p.x >= 60 && p.x <= 460 && p.y >= 60 && p.y <= 460), 'z=' + e.z);
ok('con el mayor acercamiento posible (un zoom más ya no cabe)', (() => {
  const z = e.z + 1; let a = Infinity, b = -Infinity;
  P.forEach(p => { const m = F._fvMerc(p.lat, p.lon, z); a = Math.min(a, m.y); b = Math.max(b, m.y); });
  return b - a > 400 || e.z === 17;
})());

console.log(`\n${pass} OK, ${fail} FALLA(S)`);
process.exit(fail ? 1 : 0);
