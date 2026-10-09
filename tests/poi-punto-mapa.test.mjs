// Punto de interés marcado en el mapa (Bitácora). Inty, 2026-10-09: "falta un botón para agregar punto de interés una
// vez que se elige en el mapa, cuando no se encuentra en el mapa... falta botón para designar el punto requerido".
// Al tocar el mini mapa solo aparecía el marcador: no había nada que confirmar. Ahora: "Usar este punto" al marcar →
// el mapa se cierra, queda "Punto elegido en el mapa · Cambiar" y se baja a la categoría. Corre el código REAL.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

const src = leer('funciones-mapa-viajes.js');
const corte = src.indexOf('// Elegir un destino de navegación tocando el mapa');
const POI = src.slice(src.indexOf('let poiMapaManual=null'), corte);
const html = leer('index.html');

const dom = {}; const el = (id, display) => (dom[id] = { id, style: { display: display ?? '' }, innerText: '', scrollIntoView() { dom.__bajo = id; } });
el('poi-mapa-manual', 'none'); el('btnPoiMapaManual'); el('poiMapaManualEstado'); el('btnPoiUsarPunto', 'none'); el('poiPuntoElegido', 'none'); el('poi-cats'); el('poi-mapa-manual-inner');
let alClick = null; const avisos = [];
const ctx = {
  document: { getElementById: (id) => dom[id] || null }, setTimeout: () => {}, currentUserLocation: { lat: -40.1, lon: -72.4 }, us: {}, LP_ESTILO_CALLES: '', lpAviso: (t) => avisos.push(t),
  maplibregl: { Map: class { constructor() {} addControl() {} on(ev, fn) { if (ev === 'click') alClick = fn; } resize() {} }, NavigationControl: class {}, GeolocateControl: class {},
    Marker: class { setLngLat() { return this; } addTo() { return this; } remove() {} } },
};
vm.createContext(ctx);
vm.runInContext(POI + '\n;this.api={togglePoiMapaManual,usarPuntoPoiMarcado,coords:()=>poiManualCoords};', ctx);
const api = ctx.api;

api.togglePoiMapaManual();
ok(dom['poi-mapa-manual'].style.display === 'block', 'abre el mini mapa');
ok(dom.btnPoiUsarPunto.style.display === 'none', 'sin punto marcado no hay "Usar este punto"');
api.usarPuntoPoiMarcado();
ok(avisos.length === 1, 'si se toca "Usar" sin marcar, pide tocar el mapa');
alClick({ lngLat: { lat: -40.2, lng: -72.3 } });
ok(dom.btnPoiUsarPunto.style.display === 'block', 'al marcar aparece "Usar este punto" (antes no había botón)');
ok(/Usar este punto/.test(dom.poiMapaManualEstado.innerText), 'el texto dice qué hacer después de marcar');
api.usarPuntoPoiMarcado();
ok(dom['poi-mapa-manual'].style.display === 'none' && dom.poiPuntoElegido.style.display === 'block' && dom.btnPoiMapaManual.style.display === 'none', 'al usarlo: se cierra el mapa y queda "Punto elegido en el mapa · Cambiar"');
ok(dom.__bajo === 'poi-cats', 'baja a elegir la categoría');
ok(api.coords() && api.coords().lat === -40.2, 'el punto queda guardado para compartir');
api.togglePoiMapaManual();   // "Cambiar"
ok(dom['poi-mapa-manual'].style.display === 'block' && dom.btnPoiUsarPunto.style.display === 'block' && dom.poiPuntoElegido.style.display === 'none', '"Cambiar" reabre el mapa con el punto y su botón');
api.togglePoiMapaManual();   // "Cerrar mapa" con un punto marcado = usarlo
ok(dom.poiPuntoElegido.style.display === 'block', 'cerrar el mapa con un punto marcado lo deja elegido (no se pierde)');

ok(/id="btnPoiUsarPunto"[^>]*onclick="usarPuntoPoiMarcado\(\)"[^>]*>[^<]*<i[^>]*><\/i> Usar este punto/.test(html), 'index.html tiene el botón "Usar este punto"');
ok(/id="poiPuntoElegido"[^>]*onclick="togglePoiMapaManual\(\)"/.test(html), 'index.html tiene "Punto elegido en el mapa · Cambiar"');

console.log(`punto de interés en el mapa: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
