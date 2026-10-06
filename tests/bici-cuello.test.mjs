// Pieza de cuello sobre la bici (2026-10-06). Inty: "cuando eliges la bicicleta, el cuello se le despega del cuerpo".
// Causa: buff/pañoleta/bufanda/maillot/corbatín/collar están dibujados para el Pistero SIN cuerpo (bajo el mentón,
// y = 74..84 del viewBox de la cabeza); sobre la bici quedaban flotando delante de la cara. Ahora la cabeza de la
// bici va sin esa pieza y _bCuelloPieza la dibuja sobre el cuello real, animada con los mismos cuadros del cuerpo.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, JSON, Object, Array, String, Number, RegExp, isFinite, Date, cu: null, us: { armario: [] }, nombreUsuario: '',
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, body: { classList: { contains: () => false } } },
  window: { addEventListener() {} }, setTimeout: () => 0, clearTimeout() {} };
vm.createContext(ctx);
for (const f of ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js', 'pistero-bici.js']) {
  vm.runInContext(readFileSync(join(raiz, f), 'utf8'), ctx, { filename: f });
}
const J = (s) => vm.runInContext(s, ctx);
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// la cabeza va en un <svg> anidado con viewBox 0 0 100 84; ahí NO debe quedar la pieza de cuello
const cabezaDe = (svg) => { const i = svg.indexOf('viewBox="0 0 100 84"'); const j = svg.indexOf('</svg>', i); return svg.slice(i, j); };
const COL = '#16a34a';
const piezas = J(`PIST_CUELLO.map(function(c){return c.id;}).filter(Boolean)`);
const bicis = J(`PIST_BICI.map(function(b){return b.id;})`);
for (const c of piezas) {
  for (const b of bicis) {
    const svg = J(`_pistBiciSVG(Object.assign({},PIST_DEF,{biciTipo:'${b}',cuello:'${c}',pano:'${COL}'}),{pedal:true})`);
    ok(!/NaN|undefined/.test(svg), `${c}/${b}: SVG sin NaN/undefined`);
    ok(!cabezaDe(svg).includes(COL), `${c}/${b}: la cabeza no trae la pieza de cuello (flotaba delante de la cara)`);
    ok(svg.includes(COL), `${c}/${b}: la pieza se dibuja sobre el cuerpo`);
    // se anima con el cuerpo: los caminos de la pieza tienen <animate attributeName="d">
    const trozo = svg.slice(svg.indexOf(COL) - 400, svg.indexOf(COL) + 2000);
    ok(/attributeName="d"/.test(trozo), `${c}/${b}: la pieza se mueve con la pedalada`);
  }
}
// Sin pieza de cuello no se agrega nada
ok(J(`_bCuelloPieza({cuello:''},[[0,0]],[[0,-5]],false,1)`) === '', 'sin cuello no dibuja nada');
// Quieto (pedal:false) también sale y sin animación
const quieto = J(`_pistBiciSVG(Object.assign({},PIST_DEF,{biciTipo:'ruta',cuello:'buff',pano:'${COL}'}),{pedal:false})`);
ok(quieto.includes(COL) && !cabezaDe(quieto).includes(COL), 'quieto: buff sobre el cuerpo, no en la cabeza');

console.log(f ? `  ${f}/${n} chequeos FALLARON` : `  ✓ cuello sobre la bici: ${n} chequeos OK (${piezas.length} piezas × ${bicis.length} bicis)`);
process.exit(f ? 1 : 0);
