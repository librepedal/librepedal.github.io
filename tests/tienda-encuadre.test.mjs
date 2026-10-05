// Encuadre de las tarjetas de la tienda (2026-10-04, Inty: "unos Pisteros más grandes, otros más
// chicos, no caen bien en la tarjeta"). Todas las tarjetas usan uno de DOS encuadres fijos
// (retrato o bici), medidos en el navegador como la caja que contiene TODAS las piezas de su
// familia: así Pistero mide lo mismo en todas las pestañas y ninguna pieza se corta.
// Medido el 2026-10-04 (getBBox de todas las tarjetas): retrato -2.5 -1.2 105 91.2, bici -6.4 -4.1 124.4 114.5.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = readFileSync(join(raiz, 'pistero-tienda.js'), 'utf8');
const CSS = readFileSync(join(raiz, 'estilos.css'), 'utf8');
let ok = 0, fail = 0;
const debe = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

const m = T.match(/var PIST_ENCUADRE=\{retrato:'([^']+)', bici:'([^']+)'\}/);
debe('existen los dos encuadres fijos', !!m);
const contiene = (vb, caja) => { const [x, y, w, h] = vb.split(' ').map(Number); const [bx, by, bw, bh] = caja; return x <= bx && y <= by && x + w >= bx + bw && y + h >= by + bh; };
if (m) {
  debe('retrato contiene todas las piezas medidas', contiene(m[1], [-2.5, -1.2, 105, 91.2]));
  debe('bici contiene todas las piezas medidas', contiene(m[2], [-6.4, -4.1, 124.4, 114.5]));
}
debe('ya no hay recortes distintos por pestaña', !/PIST_ZOOM/.test(T) && !/G\.zoom/.test(T));
// 2026-10-05 (Inty): las tarjetas muestran SOLO la pieza (pistero-piezas.js, ver tests/pistero-piezas.test.mjs).
// Las que siguen usando al personaje (traje, auto/moto, dorsal) pasan por el encuadre común.
debe('las tarjetas con personaje pasan por el encuadre común', T.includes("pieza||_ptEncuadre(G.svg?G.svg(mix):_pistoDe(mix,'feliz'))"));
debe('la imagen de la tarjeta tiene alto fijo', /\.pt-card-img\{width:100%;height:68px;/.test(CSS));
console.log(`  tienda-encuadre: ${ok} OK` + (fail ? `, ${fail} FALLAS` : ''));
process.exit(fail ? 1 : 0);
