// Tienda de Pistero (pistero-tienda.js): rarezas apuntan a piezas que existen, lo de
// identidad y seguridad es SIEMPRE gratis, precios razonables, y con el cobro activo
// nunca se guarda (ni se "equipa") algo que el usuario no tiene.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const guardado = {};
const ctx = { console, Math, JSON, Object, Array, String, Number, RegExp, cu: null, us: { armario: [] }, nombreUsuario: '',
  localStorage: { getItem: (k) => guardado[k] || null, setItem: (k, v) => { guardado[k] = String(v); } },
  document: { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, body: { classList: { contains: () => false } } },
  window: { addEventListener() {} }, setTimeout, clearTimeout };
vm.createContext(ctx);
for (const f of ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js', 'pistero-tienda.js']) {
  vm.runInContext(readFileSync(join(raiz, f), 'utf8'), ctx, { filename: f });
}
const J = (s) => vm.runInContext(s, ctx);
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// 1) cada rareza apunta a una pieza real del catálogo
const TIER = J('PIST_TIER');
let total = 0, gratis = 0;
for (const k of Object.keys(TIER)) {
  const G = J(`PIST_GRUPOS.find(function(G){return G.k==='${k}';})`);
  ok(G, 'hay grupo para ' + k);
  const ids = G.l().map((x) => x.id);
  for (const id of Object.keys(TIER[k])) { ok(ids.includes(id), k + ': la rareza apunta a una pieza que existe (' + id + ')'); ok('rel'.includes(TIER[k][id]), k + ':' + id + ' rareza válida'); }
  ids.filter(Boolean).forEach((id) => { total++; if (J(`_ptTier('${k}','${id}')`) === 'c') gratis++; });
}
ok(gratis / total >= 0.35, `al menos un tercio de lo vendible es gratis (${gratis}/${total})`);

// 2) identidad y seguridad SIEMPRE gratis
for (const k of ['piel', 'pelo', 'ojosCol', 'pest', 'labios']) ok(!TIER[k], k + ' no se vende (identidad)');
for (const c of ['#4a3222', '#1c130c', '#d0a63a', '#6b7280']) ok(J(`_ptTier('peloCol','${c}')`) === 'c', 'color de pelo natural ' + c + ' gratis');
for (const g of ['luzroja', 'reflectante', 'visera']) ok(J(`_ptTier('gadget','${g}')`) === 'c', g + ' (seguridad) gratis');

// 3) precios razonables y formateados
const R = J('PIST_RAREZA');
ok(R.c.clp === 0 && R.r.clp > 0 && R.r.clp < R.e.clp && R.e.clp < R.l.clp, 'precios crecen con la rareza');
ok(Object.keys(R).every((k) => R[k].clp <= 1000), 'regla de Inty: ningún precio pasa de $1.000');
ok(J("_ptPrecio('l')") === '$990' && J("_ptPrecio('c')") === 'Gratis', 'precio en pesos y Gratis para lo común');

// 4) con el cobro activo: probar no guarda, y nunca se guarda lo que no se tiene
J('TIENDA_COBRO_ACTIVO=true');
ok(!J("_ptTiene('acc','corona')") && J("_ptTiene('acc','luz')"), 'sin comprar: legendario bloqueado, común (luz) libre');
J("_ptElegir('acc','corona')");
ok(J('_pistOpts().acc') === '' && J('_ptPrueba && _ptPrueba.id') === 'corona', 'tocar algo no comprado lo PRUEBA sin guardarlo');
ok(J("_ptOpts().acc") === 'corona', 'la prueba se ve en el Pistero de arriba');
J("_pistSet('acc','corona')");
ok(J('_pistOpts().acc') === '', 'aunque se llame _pistSet directo, no se guarda algo no comprado');
ctx.us.armario = ['acc:corona'];
J("_pistSet('acc','corona')");
ok(J('_pistOpts().acc') === 'corona', 'comprado (us.armario) sí se guarda');
J('TIENDA_COBRO_ACTIVO=false');
ok(J("_ptTiene('acabado','neon')"), 'mientras no hay cobro, todo se puede usar (lanzamiento)');

console.log(f ? `  ${f}/${n} FALLARON` : `  ✓ tienda de Pistero: ${n} chequeos OK (${gratis}/${total} piezas gratis)`);
process.exit(f ? 1 : 0);
