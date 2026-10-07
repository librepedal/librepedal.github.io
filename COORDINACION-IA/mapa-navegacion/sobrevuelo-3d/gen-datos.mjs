// Genera los datos de la demo del sobrevuelo 3D (NO son datos de usuarios):
// 1) camino real Futrono -> Llifén (OSRM bici, OSM) = ruta-osrm.json
// 2) traza "grabada" simulada: se recorre ese camino cada 3 s y se le suma el error típico
//    del GPS de un teléfono (deriva correlacionada ~8 m + algunos saltos de 25-45 m)
// 3) la misma traza pegada al camino con Valhalla trace_route (bicicleta)
import fs from 'node:fs';
const ruta = JSON.parse(fs.readFileSync(new URL('./ruta-osrm.json', import.meta.url))).routes[0].geometry.coordinates; // [lon,lat]
let seed = 20261006; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const R = 6371000, rad = Math.PI / 180;
const dist = (a, b) => { const dLa = (b[1] - a[1]) * rad, dLo = (b[0] - a[0]) * rad; const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
const cum = [0]; for (let i = 1; i < ruta.length; i++) cum.push(cum[i - 1] + dist(ruta[i - 1], ruta[i]));
const total = cum.at(-1);
const enD = d => { let k = 1; while (k < ruta.length - 1 && cum[k] < d) k++; const f = (d - cum[k - 1]) / Math.max(1e-9, cum[k] - cum[k - 1]); return [ruta[k - 1][0] + (ruta[k][0] - ruta[k - 1][0]) * f, ruta[k - 1][1] + (ruta[k][1] - ruta[k - 1][1]) * f]; };
const pts = []; let d = 0, t = Date.UTC(2026, 9, 4, 13, 0, 0), ex = 0, ey = 0;
while (d < total) {
  const p = enD(d);
  ex = ex * 0.93 + gauss() * 2.6; ey = ey * 0.93 + gauss() * 2.6; // deriva (AR1, ~7-9 m)
  let jx = 0, jy = 0; if (rnd() < 0.025) { jx = gauss() * 30; jy = gauss() * 30; } // salto por árboles/cerro
  const mLat = 1 / 111320, mLon = 1 / (111320 * Math.cos(p[1] * rad));
  pts.push({ lat: +(p[1] + (ey + jy) * mLat).toFixed(6), lon: +(p[0] + (ex + jx) * mLon).toFixed(6), t });
  const v = 4.2 + gauss() * 0.6; d += Math.max(2, v) * 3; t += 3000; // ~15 km/h, un punto cada 3 s
}
fs.writeFileSync(new URL('./traza-gps.json', import.meta.url), JSON.stringify(pts));
console.log('traza grabada:', pts.length, 'puntos,', (total / 1000).toFixed(1), 'km');
// Valhalla: pega la traza al camino. OJO (probado 2026-10-06): con TODOS los puntos (cada 3 s)
// trace_route devuelve 200 pero solo ~1,5 km de 21 km, sin avisar. Funciona limpiando saltos
// (> 12 m/s) y mandando un punto cada >= 40 m. La app debe comparar el largo devuelto con el
// grabado y, si no cuadra, quedarse con la traza limpia (nunca mostrar una ruta cortada).
const rad2=Math.PI/180, dm=(a,b)=>Math.hypot((b.lon-a.lon)*111320*Math.cos(a.lat*rad2),(b.lat-a.lat)*110540);
const limpio=[]; for(const p of pts){ const u=limpio.at(-1); if(u&&dm(u,p)/((p.t-u.t)/1000)>12) continue; limpio.push(p); }
const muestra=[]; for(const p of limpio){ const u=muestra.at(-1); if(!u||dm(u,p)>=40) muestra.push(p); }
const body={shape:muestra.map(p=>({lat:p.lat,lon:p.lon})),costing:'bicycle',shape_match:'map_snap',trace_options:{search_radius:35,gps_accuracy:10}};
const r = await fetch('https://valhalla1.openstreetmap.de/trace_route', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const j = await r.json();
if (!j.trip) { console.error('Valhalla falló', r.status, JSON.stringify(j).slice(0, 400)); process.exit(1); }
const dec = s => { let i = 0, lat = 0, lon = 0, out = []; while (i < s.length) { for (const k of [0, 1]) { let sh = 0, res = 0, b; do { b = s.charCodeAt(i++) - 63; res |= (b & 31) << sh; sh += 5; } while (b >= 32); const v = (res & 1) ? ~(res >> 1) : (res >> 1); if (k) lon += v; else lat += v; } out.push([lon / 1e6, lat / 1e6]); } return out; };
const match = j.trip.legs.flatMap((l, i) => { const c = dec(l.shape); return i ? c.slice(1) : c; });
fs.writeFileSync(new URL('./traza-pegada.json', import.meta.url), JSON.stringify(match));
console.log('traza pegada:', match.length, 'puntos,', j.trip.summary.length, 'km (camino real', (total/1000).toFixed(2), 'km)');
