// Resumen de viaje (_mostrarResumenViaje, index.html): pantalla de cierre al
// terminar de pedalear -- pedido de Inty 2026-08-26, "hoy terminar la ruta queda
// mudo". Prueba el comportamiento real extraído de index.html: guarda de viaje
// trivial, cálculo de km/min/velocidad, pluralización de logros, y que los
// acumuladores (_logrosDelViaje/_kmEsteViaje) se vacían después de mostrarse.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

// _mostrarResumenViaje() vive en gamificacion-logros.js desde que se separó de index.html.
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'gamificacion-logros.js'), 'utf8');

function bloque(desde) {
  const i = HTML.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré -> ' + desde); process.exit(1); }
  let prof = 0, q = null;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) {
    const c = HTML[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return HTML.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

// LECCIONES_VIAJE es un array literal (no un bloque {}): bloque() balancea llaves, así
// que no sirve para extraerlo tal cual (encontraría el primer {t:'...'} del array, no el
// array entero). _siguienteLeccionViaje() sí es extraíble y es lo que de verdad hay que
// probar (el mecanismo de avance/persistencia); se le da un array de prueba propio.
const SRC = 'var _logrosDelViaje=[], _kmEsteViaje=0, tripStartTime=0, cu=null;\n'
  + 'var LECCIONES_VIAJE=[{t:"lección de prueba uno"},{t:"lección de prueba dos"}];\n'
  + 'var _lsMem={};\n'
  + 'var localStorage={ getItem:function(k){ return Object.prototype.hasOwnProperty.call(_lsMem,k)?_lsMem[k]:null; }, setItem:function(k,v){ _lsMem[k]=String(v); } };\n'
  + 'function escapeHTML(s){ return String(s).replace(/[&<>"\']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;","\'":"&#39;"}[c]; }); }\n'
  + bloque('function _siguienteLeccionViaje()')
  + bloque('function _mostrarResumenViaje()');

function montarDOM() {
  const elementos = {};
  function crearElemento() {
    return { _clases: new Set(), innerHTML: '', appendChild() {}, classList: { add(c) { this._c().add(c); }, contains(c) { return this._c().has(c); }, _c: () => elementos.__self._clases }, set className(v) {}, get className() { return [...this._clases].join(' '); } };
  }
  const modal = { id: 'resumenViajeModal', innerHTML: '', _clases: new Set(), classList: null, appendChild() {} };
  modal.classList = { add: (c) => modal._clases.add(c), contains: (c) => modal._clases.has(c) };
  const rvContenido = { innerHTML: '' };
  const document = {
    _modalCreado: false,
    getElementById(id) {
      if (id === 'resumenViajeModal') return this._modalCreado ? modal : null;
      if (id === 'rvContenido') return rvContenido;
      return null;
    },
    createElement() { this._modalCreado = true; return modal; },
    body: { appendChild() {} },
  };
  return { document, modal, rvContenido };
}

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

function correr(setup) {
  const { document, modal, rvContenido } = montarDOM();
  const ctx = { document, requestAnimationFrame: (fn) => fn(), setTimeout: (fn) => fn(), console, Math, Date };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  if (setup) setup(ctx);
  ctx._mostrarResumenViaje();
  return { ctx, rvContenido };
}

// Viaje trivial (se tocó el botón sin pedalear, sin logros): no debería mostrar nada.
{
  const { ctx, rvContenido } = correr((c) => { c._kmEsteViaje = 0.01; c._logrosDelViaje = []; });
  debe('un viaje trivial (sin km ni logros) no arma ningún resumen', rvContenido.innerHTML === '');
}

// Viaje real con km y duración: calcula minutos y velocidad media correctamente.
{
  const { ctx, rvContenido } = correr((c) => {
    c._kmEsteViaje = 14.7;
    c.tripStartTime = Date.now() - 32 * 60000; // 32 minutos atrás
    c._logrosDelViaje = [];
  });
  debe('calcula los km del viaje (con coma, como el resto de la app)', />14,7</.test(rvContenido.innerHTML));
  debe('calcula los minutos del viaje (~32)', />32</.test(rvContenido.innerHTML));
  debe('calcula la velocidad media (14,7 km / 32 min ≈ 27,6 km/h)', />27,6</.test(rvContenido.innerHTML));
}

// Un solo logro nuevo: singular correcto, una medalla.
{
  const { ctx, rvContenido } = correr((c) => {
    c._kmEsteViaje = 5;
    c.tripStartTime = Date.now() - 10 * 60000;
    c._logrosDelViaje = [{ e: '<i class="fas fa-compass"></i>', t: 'Primer viaje' }];
  });
  debe('singular correcto para 1 logro nuevo', /¡1 logro nuevo!/.test(rvContenido.innerHTML));
  debe('muestra el nombre del logro', /Primer viaje/.test(rvContenido.innerHTML));
}

// Varios logros: plural correcto, una medalla por cada uno.
{
  const { ctx, rvContenido } = correr((c) => {
    c._kmEsteViaje = 20;
    c.tripStartTime = Date.now() - 60 * 60000;
    c._logrosDelViaje = [
      { e: '<i class="fas fa-compass"></i>', t: 'Primer viaje' },
      { e: '<i class="fas fa-medal"></i>', t: 'Colaborador' },
    ];
  });
  debe('plural correcto para varios logros nuevos', /¡2 logros nuevos!/.test(rvContenido.innerHTML));
  debe('cuenta 2 medallas', (rvContenido.innerHTML.match(/rv-medalla-ic-wrap/g) || []).length === 2);
}

// Se vacían los acumuladores después de mostrarse (no debería duplicar el resumen del próximo viaje).
{
  const { ctx } = correr((c) => {
    c._kmEsteViaje = 8;
    c.tripStartTime = Date.now() - 15 * 60000;
    c._logrosDelViaje = [{ e: '<i class="fas fa-compass"></i>', t: 'Primer viaje' }];
  });
  debe('vacía _logrosDelViaje después de mostrar el resumen', ctx._logrosDelViaje.length === 0);
  debe('vacía _kmEsteViaje después de mostrar el resumen', ctx._kmEsteViaje === 0);
}

// Lecciones progresivas (pedido de Inty, 2026-10-17): una función nueva por viaje, nunca
// repetida, y solo si hay cuenta (cu). Reusa el mismo ctx entre llamadas para probar que
// SÍ avanza de una lección a la siguiente (localStorage persiste dentro del mismo VM).
{
  const { ctx, rvContenido } = correr((c) => { c.cu = 'tester1'; c._kmEsteViaje = 5; c.tripStartTime = Date.now() - 10 * 60000; c._logrosDelViaje = []; });
  debe('primer viaje con cuenta: muestra la lección 1', /lección de prueba uno/.test(rvContenido.innerHTML));

  ctx._kmEsteViaje = 6; ctx.tripStartTime = Date.now() - 10 * 60000; ctx._logrosDelViaje = [];
  ctx._mostrarResumenViaje();
  debe('segundo viaje, misma cuenta: avanza a la lección 2 (no repite la 1)', /lección de prueba dos/.test(rvContenido.innerHTML) && !/lección de prueba uno/.test(rvContenido.innerHTML));

  ctx._kmEsteViaje = 7; ctx.tripStartTime = Date.now() - 10 * 60000; ctx._logrosDelViaje = [];
  ctx._mostrarResumenViaje();
  debe('tercer viaje, ya sin lecciones: no revienta ni repite nada', !/lección de prueba/.test(rvContenido.innerHTML));
}

// Sin cuenta (cu=null, ej. antes de iniciar sesión): nunca debería intentar mostrar una lección.
{
  const { rvContenido } = correr((c) => { c.cu = null; c._kmEsteViaje = 5; c.tripStartTime = Date.now() - 10 * 60000; c._logrosDelViaje = []; });
  debe('sin cuenta: no se muestra ninguna lección', !/lección de prueba/.test(rvContenido.innerHTML));
}

console.log(`\n${ok} ok, ${fail} fallas — resumen-viaje.test.mjs`);
if (fail > 0) process.exit(1);
