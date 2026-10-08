// Inty, 2026-10-08: "el mapa no se estaba adecuando bien a la ruta", "corté un viaje y cuando apagué la pantalla,
// hasta ahí llegó el viaje" y "si el usuario se aleja o hace zoom, tiene que volver a donde está, a los 5 segundos".
// Prueba el COMPORTAMIENTO con el código real (vm + reloj falso), no que exista un texto:
//  1. stop() + start() seguidos (lo que hace calculateAndStartNavigation) dejan el GPS nativo corriendo.
//  2. Grabando, cada fix ya no hace fitBounds del trazado entero (eso alejaba el mapa sin parar).
//  3. Mapa principal: un gesto tuyo lo suelta; 5 s sin tocar -> vuelve a ti y te muestra; los movimientos del
//     propio código (sin originalEvent) no cuentan como gesto.
//  4. Mapa de navegación: el toque suelta el seguimiento y a los 5 s vuelve solo, a zoom de pedaleo.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

function bloque(txt, desde) {
  const i = txt.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré -> ' + desde); process.exit(1); }
  let prof = 0;
  for (let k = txt.indexOf('{', i); k < txt.length; k++) {
    if (txt[k] === '{') prof++;
    else if (txt[k] === '}' && --prof === 0) return txt.slice(i, k + 1);
  }
  process.exit(1);
}
// Reloj falso: setTimeout/Date.now controlados para no esperar 5 s de verdad.
function reloj() {
  const r = { ahora: 1000000, tareas: [] , id: 0 };
  r.setTimeout = (fn, ms) => { const t = { id: ++r.id, en: r.ahora + ms, fn }; r.tareas.push(t); return t.id; };
  r.clearTimeout = (id) => { r.tareas = r.tareas.filter((t) => t.id !== id); };
  r.avanzar = (ms) => { const fin = r.ahora + ms; for (;;) { r.tareas.sort((a, b) => a.en - b.en); const t = r.tareas[0]; if (!t || t.en > fin) break; r.tareas.shift(); r.ahora = t.en; t.fn(); } r.ahora = fin; };
  r.Date = { now: () => r.ahora };
  return r;
}

// ---------- 1. GPS nativo: stop() + start() sin esperar ----------
{
  const gps = leer('motor-gps.js');
  const ini = gps.indexOf('const lpBackgroundGeo');
  const codigo = gps.slice(ini, gps.indexOf('})();', ini) + 5);
  let sig = 0; const vivos = new Set();
  const plugin = {
    addWatcher: async () => { const id = 'w' + (++sig); vivos.add(id); return id; },
    removeWatcher: ({ id }) => new Promise((res) => setTimeout(() => { vivos.delete(id); res(); }, 30)), // Android tarda
  };
  const ctx = vm.createContext({ lpPlugin: () => plugin, lpAsegurarUbicacion: async () => true, console, setTimeout, window: {} });
  vm.runInContext(codigo + '\nthis.bg=lpBackgroundGeo;', ctx);
  const bg = ctx.bg;
  await bg.start();
  // Igual que calculateAndStartNavigation() antes del arreglo: stop() sin await y start() al tiro.
  bg.stop(); const arrancó = await bg.start(() => {});
  await new Promise((r) => setTimeout(r, 80));
  debe('stop()+start() seguidos: start crea un watcher nuevo', arrancó === true && sig === 2);
  debe('stop()+start() seguidos: queda exactamente un watcher vivo (el nuevo)', vivos.size === 1 && vivos.has('w2'));
  await bg.stop(); await new Promise((r) => setTimeout(r, 50));
  debe('stop() final apaga el watcher nuevo', vivos.size === 0);
  const nav = leer('motor-navegacion.js');
  debe('la navegación espera el stop() antes de arrancar su GPS', /await lpBackgroundGeo\.stop\(\)/.test(nav));
}

// ---------- 2. Grabando: sin fitBounds por fix ----------
{
  const ug = bloque(leer('motor-gps.js'), 'function ug(p)').split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n'); // sin líneas de comentario
  debe('ug() ya no hace fitBounds del trazado en cada fix', !/fitBounds/.test(ug));
  debe('ug() le pasa cada fix al seguimiento del mapa', /_mpSeguirCiclista\(la,lo\)/.test(ug));
}

// ---------- 3. Mapa principal ----------
try {
  const mr = leer('mapa-render.js');
  const codigo = mr.slice(mr.indexOf('const LP_VOLVER_MS'));
  const r = reloj();
  const oyentes = {}; const mov = [];
  const marcadores = [];
  const mp = {
    on: (ev, fn) => { (oyentes[ev] = oyentes[ev] || []).push(fn); },
    getZoom: () => mp.z, z: 11,
    easeTo: (o) => { mov.push(o); mp.z = o.zoom; },
  };
  const disparar = (ev, e) => (oyentes[ev] || []).forEach((f) => f(e));
  const ctx = vm.createContext({
    mp, setTimeout: r.setTimeout, clearTimeout: r.clearTimeout, Date: r.Date,
    document: { querySelector: () => null },
    ig: false, us: { la: null, lo: null }, currentUserLocation: { lat: -40.15, lon: -72.64 },
    riderMarkerHTML: () => '<i></i>', selectedHelmet: 'x', selectedSkin: 0, skinColor: () => '#fc9',
    mlMarker: (ll) => { const m = { ll, addTo() { marcadores.push(m); return m; }, setLatLng(x) { m.ll = x; }, remove() {} }; return m; },
  });
  vm.runInContext(codigo + '\n_mpVolverInstalar(mp);', ctx);
  disparar('dragstart', { originalEvent: {} });
  r.avanzar(4900);
  debe('no vuelve antes de 5 s', mov.length === 0);
  r.avanzar(200);
  debe('a los 5 s sin tocar vuelve a tu posición', mov.length === 1 && mov[0].center[0] === -72.64 && mov[0].center[1] === -40.15);
  debe('al volver te muestra (marcador en tu posición)', marcadores.length === 1 && marcadores[0].ll[0] === -40.15);
  // Seguir tocando reinicia la espera
  disparar('zoomstart', { originalEvent: {} }); r.avanzar(3000);
  disparar('dragstart', { originalEvent: {} }); r.avanzar(3000);
  debe('cada gesto nuevo reinicia los 5 s', mov.length === 1);
  r.avanzar(2100);
  debe('...y vuelve 5 s después del último gesto', mov.length === 2);
  // Movimiento del propio código: no cuenta
  disparar('zoomstart', {}); r.avanzar(6000);
  debe('un movimiento sin dedo (del código) no programa una vuelta', mov.length === 2);
  // Grabando: cada fix te sigue a zoom de pedaleo, salvo que estés tocando el mapa
  ctx.ig = true; mp.z = 12;
  vm.runInContext('_mpSeguirCiclista(-40.16,-72.64)', ctx);
  debe('grabando, el fix te sigue a zoom 16', mov.length === 3 && mov[2].zoom === 16 && mov[2].center[1] === -40.16);
  disparar('dragstart', { originalEvent: {} }); r.avanzar(1000);
  vm.runInContext('_mpSeguirCiclista(-40.17,-72.64)', ctx);
  debe('grabando, si lo estás moviendo el fix no te lo quita', mov.length === 3 && marcadores[0].ll[0] === -40.17);

} catch (e) { debe('mapa principal: ' + e.message, false); }

// ---------- 4. Mapa de navegación ----------
try {
  const nav = leer('motor-navegacion.js');
  const ini = nav.indexOf('function _navRecentrar');
  const codigo = nav.slice(ini, nav.indexOf('\n}', nav.indexOf('function _navSeguir')) + 2);
  const r = reloj();
  const vistas = [];
  const navMap = { z: 13, getZoom: () => navMap.z, setView: (c, z) => { vistas.push({ c, z }); navMap.z = z; }, panTo: (c) => vistas.push({ c, pan: true }) };
  const btn = { style: { display: 'none' } };
  const ctx = vm.createContext({
    navMap, helmetMarker: { getLatLng: () => [-40.2, -72.6] }, navAutoFollow: true,
    document: { getElementById: () => btn }, setTimeout: r.setTimeout, clearTimeout: r.clearTimeout, Date: r.Date,
  });
  vm.runInContext('var navAutoFollow=true; function _navDetenerAutoFollow(){ navAutoFollow=false; document.getElementById("x").style.display="flex"; }\n' + codigo + '\n_navInicioVista=Date.now();', ctx);
  vm.runInContext('_navSeguir(-40.2,-72.6)', ctx);
  debe('los primeros segundos deja ver la ruta completa', vistas.length === 0);
  r.avanzar(4500);
  vm.runInContext('_navSeguir(-40.2,-72.6)', ctx);
  debe('después baja a zoom de pedaleo y te sigue', vistas.length === 1 && vistas[0].z === 16);
  vm.runInContext('_navTocado()', ctx);
  debe('tocar el mapa suelta el seguimiento', vm.runInContext('navAutoFollow', ctx) === false && btn.style.display === 'flex');
  vm.runInContext('_navSeguir(-40.21,-72.6)', ctx);
  debe('suelto, el fix no mueve el mapa', vistas.length === 1);
  navMap.z = 12; r.avanzar(5000);
  debe('a los 5 s vuelve solo a ti, a zoom de pedaleo', vm.runInContext('navAutoFollow', ctx) === true && vistas.length === 2 && vistas[1].z === 16 && btn.style.display === 'none');
} catch (e) { debe('mapa de navegación: ' + e.message, false); }

console.log(fail ? `  ${ok} OK, ${fail} FALLAS` : `  mapa-vuelve-a-ti.test.mjs: ${ok} OK`);
process.exit(fail ? 1 : 0);
