// Armario: cada tarjeta muestra SOLO la pieza (pistero-piezas.js), nunca otro Pistero completo.
// Pedido de Inty (2026-10-05): "si el usuario quiere elegir lentes, sale solo lentes; se van montando en
// el Pistero que está al lado de Sorpréndeme. Y así con todo lo demás." El único Pistero completo es el
// grande de arriba. Excepciones a propósito (se entienden solo con el personaje): traje, auto/moto, dorsal
// y la handbike (se dibuja con su ciclista).
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
for (const f of ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js', 'pistero-tienda.js', 'pistero-bici.js', 'pistero-piezas.js']) {
  vm.runInContext(readFileSync(join(raiz, f), 'utf8'), ctx, { filename: f });
}
const J = (s) => vm.runInContext(s, ctx);
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };
const limpio = (s) => s.startsWith('<svg') && s.endsWith('</svg>') && !/NaN|undefined/.test(s) && (s.match(/</g) || []).length === (s.match(/>/g) || []).length;
// un Pistero completo siempre trae sus ojos (clase lp-eye o el par de elipses de ojos con brillo) y su boca
const tieneCara = (s) => /class="lp-eye/.test(s) || /<path d="M43 73 Q50 79 57 73"/.test(s);

const EXCEPCION = { traje: 1, motorTipo: 1 };
const grupos = J(`(function(){ var out=[]; PIST_TABS.forEach(function(T){ T.g.forEach(function(g){ var G=_ptGrupo(g.k); if(G&&!G.chip) out.push({k:g.k, ids:G.l().map(function(it){return it.id;})}); }); }); return out; })()`);
let total = 0;
for (const g of grupos) {
  if (EXCEPCION[g.k]) continue;
  for (const id of g.ids) {
    if (g.k === 'biciExtra' && id === 'dorsal') continue;
    if (g.k === 'biciTipo' && id === 'handbike') continue;
    const s = J(`_ptPiezaSVG(${JSON.stringify(g.k)},${JSON.stringify(id)},Object.assign({},_pistOpts(),{${JSON.stringify(g.k)}:${JSON.stringify(id)}}))`);
    total++;
    ok(s && limpio(s), g.k + ':' + id + ' dibuja una miniatura válida');
    ok(!tieneCara(s), g.k + ':' + id + ' muestra solo la pieza (sin otro Pistero)');
  }
}
// las excepciones devuelven '' para que la tarjeta use el dibujo con personaje
ok(J(`_ptPiezaSVG('traje','equipo',_pistOpts())`) === '', 'traje usa el dibujo con personaje');
ok(J(`_ptPiezaSVG('biciExtra','dorsal',_pistOpts())`) === '', 'dorsal usa el dibujo con personaje');
// la bici sin ciclista no trae cabeza ni cuerpo, y con ciclista sí (la opción no rompe el dibujo normal)
ok(!tieneCara(J(`_pistBiciSVG({biciTipo:'ruta'},{pedal:false,sinJinete:true})`)), 'bici sin ciclista: sin cabeza');
ok(tieneCara(J(`_pistBiciSVG({biciTipo:'ruta'},{pedal:false})`)), 'bici normal: con su ciclista');
// la tarjeta de la tienda usa la pieza sola
ok(!tieneCara(J(`_ptCard(_ptGrupo('lentes'),{id:'radar',n:'Radar'},_pistOpts(),'')`)), 'tarjeta de lentes sin Pistero completo');

console.log(f ? '\n' + (n - f) + ' OK, ' + f + ' FALLA(S)' : '\n' + n + ' pasaron (' + total + ' miniaturas), 0 fallaron');
process.exit(f ? 1 : 0);
