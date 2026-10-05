// Lentes de Pistero: revisión con MEDIDAS (no a ojo) sobre la geometría real de la cara.
// Existe porque los lentes anteriores dejaban asomar los ojos y caían hacia los lados (Inty,
// 2026-10-04/05). Cada forma de _LENTE_FORMA (pistero-armario.js) debe:
//   1. tapar ambos ojos completos con margen (ojos (40,63)/(60,63), rx 6.2, ry 7.6),
//   2. no subir al casco (el casco termina en y=54),
//   3. no salir de la cara (Pistero no tiene orejas: nada de patillas),
//   4. no tapar la sonrisa (sobre la boca, x 43-57, el lente termina antes de y=72),
//   5. tener el borde superior que SUBE hacia afuera (nunca caído: se ve triste).
// Además: todo id del catálogo dibuja algo, y los ids viejos se convierten a un modelo nuevo.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, JSON, Object, Array, String, Number, RegExp, cu: null,
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { addEventListener() {}, querySelectorAll: () => [], getElementById: () => null, body: { classList: { contains: () => false } } },
  window: { addEventListener() {} }, setTimeout, clearTimeout };
vm.createContext(ctx);
for (const f of ['pistero-personalizacion-datos.js', 'pistero-armario.js', 'pistero-apariencia.js']) {
  vm.runInContext(readFileSync(join(raiz, f), 'utf8'), ctx, { filename: f });
}
const FORMAS = vm.runInContext('_LENTE_FORMA', ctx);
const CATALOGO = vm.runInContext('PIST_LENTES', ctx);
const VIEJOS = vm.runInContext('PIST_LENTES_VIEJOS', ctx);

let fallos = 0, total = 0;
function ok(cond, msg) { total++; if (!cond) { fallos++; console.log('  ✗ ' + msg); } }

// path absoluto (M L C Q Z) -> polígonos
function aPoligonos(d) {
  const t = d.match(/[MLCQZ]|-?\d+(?:\.\d+)?/g), polys = []; let cur = null, p = [0, 0], i = 0;
  const n = () => parseFloat(t[i++]);
  while (i < t.length) {
    const c = t[i++];
    if (c === 'M') { p = [n(), n()]; cur = [p]; polys.push(cur); }
    else if (c === 'L') { p = [n(), n()]; cur.push(p); }
    else if (c === 'Q') { const c1 = [n(), n()], e = [n(), n()]; for (let k = 1; k <= 12; k++) { const s = k / 12, a = 1 - s; cur.push([a * a * p[0] + 2 * a * s * c1[0] + s * s * e[0], a * a * p[1] + 2 * a * s * c1[1] + s * s * e[1]]); } p = e; }
    else if (c === 'C') { const c1 = [n(), n()], c2 = [n(), n()], e = [n(), n()]; for (let k = 1; k <= 16; k++) { const s = k / 16, a = 1 - s; cur.push([a ** 3 * p[0] + 3 * a * a * s * c1[0] + 3 * a * s * s * c2[0] + s ** 3 * e[0], a ** 3 * p[1] + 3 * a * a * s * c1[1] + 3 * a * s * s * c2[1] + s ** 3 * e[1]]); } p = e; }
  }
  return polys;
}
function dentro(pt, polys) { let c = 0; for (const P of polys) for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const [xa, ya] = P[a], [xb, yb] = P[b]; if ((ya > pt[1]) !== (yb > pt[1]) && pt[0] < (xb - xa) * (pt[1] - ya) / (yb - ya) + xa) c++; } return c % 2 === 1; }

const OJOS = [[40, 63], [60, 63]], RX = 6.2, RY = 7.6, MARGEN = 0.9;
console.log('Forma de cada lente sobre la cara real:');
for (const [id, d] of Object.entries(FORMAS)) {
  const polys = aPoligonos(d), pts = polys.flat();
  let tapa = true;
  for (const [cx, cy] of OJOS) for (let k = 0; k < 72; k++) { const a = k * Math.PI / 36; if (!dentro([cx + (RX + MARGEN) * Math.cos(a), cy + (RY + MARGEN) * Math.sin(a)], polys)) tapa = false; }
  ok(tapa, id + ': tapa ambos ojos con margen');
  const minY = Math.min(...pts.map(q => q[1])), minX = Math.min(...pts.map(q => q[0])), maxX = Math.max(...pts.map(q => q[0]));
  ok(minY >= 53.9, id + ': no sube al casco (y mínima ' + minY.toFixed(2) + ')');
  ok(minX >= 20 && maxX <= 80, id + ': no sale de la cara (x ' + minX.toFixed(1) + '-' + maxX.toFixed(1) + ')');
  const bajo = Math.max(...pts.filter(q => q[0] > 43 && q[0] < 57).map(q => q[1]));
  ok(bajo <= 72, id + ': no tapa la sonrisa (y ' + bajo.toFixed(2) + ')');
  const yCentro = Math.min(...pts.filter(q => Math.abs(q[0] - 50) < 1.2).map(q => q[1]));
  ok(minY < yCentro - 0.8, id + ': borde superior sube hacia afuera');
}
// todos los ids del catálogo dibujan algo; los viejos se convierten y también dibujan
for (const it of CATALOGO) { if (!it.id) continue; const s = ctx._lentesSVG(it.id); ok(s.length > 200 && !/undefined|NaN/.test(s), 'catálogo: ' + it.id + ' dibuja'); ok(FORMAS[it.id], 'catálogo: ' + it.id + ' tiene forma medida'); }
for (const [viejo, nuevo] of Object.entries(VIEJOS)) { ok(CATALOGO.some(it => it.id === nuevo), 'id viejo ' + viejo + ' -> ' + nuevo + ' existe'); ok(ctx._lentesSVG(viejo).length > 200, 'id viejo ' + viejo + ' sigue dibujando'); ok(ctx._pistNormal({ lentes: viejo }).lentes === nuevo, 'id viejo ' + viejo + ' se guarda como ' + nuevo); }
// sin patillas: ningún trazo del lente sale de la cara
for (const it of CATALOGO) { if (!it.id) continue; const xs = (ctx._lentesSVG(it.id).match(/ d="[^"]*"/g) || []).join(' ').match(/-?\d+(?:\.\d+)?/g).map(Number).filter((v, k, a) => k % 2 === 0); ok(Math.min(...xs) >= 20 && Math.max(...xs) <= 80, it.id + ': sin patillas fuera de la cara'); }

console.log(fallos ? '\n' + (total - fallos) + ' OK, ' + fallos + ' FALLA(S)' : '\n' + total + ' pasaron, 0 fallaron');
process.exit(fallos ? 1 : 0);
