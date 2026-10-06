// Armario de Pistero v2 (pistero-armario.js + _pisteroExprSVG de pistero-apariencia.js):
// todo el catálogo dibuja SVG válido, lo guardado con la versión vieja sigue
// funcionando y lo que llega de Firestore (de OTRO usuario) no puede inyectar marcado.
// Corre el código real de ambos archivos en un sandbox, no una reimplementación.
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

let fallos = 0, total = 0;
function ok(cond, msg) { total++; if (!cond) { fallos++; console.log('  ✗ ' + msg); } }

function svgValido(s, donde) {
  ok(s.startsWith('<svg viewBox="0 0 100 84"') && s.endsWith('</svg>'), donde + ': envoltorio SVG');
  ok(!/undefined|NaN/.test(s), donde + ': sin undefined/NaN');
  ok((s.match(/</g) || []).length === (s.match(/>/g) || []).length, donde + ': < y > balanceados');
}

// 1) Cada opción de cada lista dibuja bien (en todas las expresiones para el pelo).
const listas = { casco: 'PIST_CASCO', diseno: 'PIST_DISENO', disenoCol: 'PIST_ACENTO', piel: 'PIST_PIEL',
  pelo: 'PIST_PELO', peloCol: 'PIST_PELO_COL', lentes: 'PIST_LENTES', lentesCol: 'PIST_LENTES_COL',
  ojosCol: 'PIST_OJOS_COL', pest: 'PIST_PEST', labios: 'PIST_LABIOS', marca: 'PIST_MARCA', bigote: 'PIST_BIGOTE',
  acc: 'PIST_ACC', gadget: 'PIST_GADGET', aro: 'PIST_ARO', cuello: 'PIST_CUELLO', pano: 'PIST_PANO',
  acabado: 'PIST_ACABADO', accCol: 'PIST_PIEZA_COL', gadgetCol: 'PIST_PIEZA_COL', marcoCol: 'PIST_PIEZA_COL', aroCol: 'PIST_ARO_COL', biciTipo: 'PIST_BICI', biciCol: 'PIST_BICI_COL' };
let opciones = 0;
for (const [k, nombre] of Object.entries(listas)) {
  const l = ctx[nombre] || vm.runInContext(nombre, ctx);
  ok(Array.isArray(l) && l.length > 0, nombre + ' existe');
  const ids = new Set();
  for (const it of l) {
    ok(!ids.has(it.id), nombre + ': id repetido ' + it.id); ids.add(it.id);
    ok(typeof it.n === 'string' && it.n.length > 0, nombre + ': nombre visible para ' + it.id);
    const o = { [k]: it.id }; if (k === 'pano') o.cuello = 'buff';
    if (k === 'accCol') o.acc = 'gato'; if (k === 'gadgetCol') o.gadget = 'visera'; if (k === 'marcoCol') o.lentes = 'redondas'; if (k === 'aroCol') o.aro = 'argolla';
    svgValido(vm.runInContext('_pistoDe', ctx)(o, 'feliz'), k + '=' + it.id);
    opciones++;
  }
}
ok(opciones >= 180, 'el armario tiene al menos 180 opciones (tiene ' + opciones + ')');
for (const e of ['feliz', 'hablando', 'hablando_enojado', 'contento', 'guino', 'sorprendido', 'pensando', 'enojado', 'cansado', 'preocupado', 'dormido', 'escuchando']) {
  svgValido(vm.runInContext('_pistoDe', ctx)({ pelo: 'trenzas', labios: '#c81d3a', ojosCol: '#1d4ed8', cuello: 'maillot', pano: '#dc2626' }, e), 'expresión ' + e);
}

// 2) Compatibilidad con lo guardado antes de v2.
const N = vm.runInContext('_pistNormal', ctx);
const viejo = N({ casco: 'azul', pelo: 'mono', pano: '#ec4899' });
ok(viejo.pelo === 'cola', 'el moño viejo pasa a "cola al lado"');
ok(viejo.cuello === 'panoleta' && viejo.pano === '#ec4899', 'pañoleta vieja se conserva con su color');
ok(N({}).diseno === 'franja', 'sin diseño guardado = la franja de siempre');
ok(N({ diseno: '' }).diseno === '', 'casco liso elegido se respeta');
ok(N({ casco: undefined, piel: undefined }).casco === 'azul', 'campos undefined de Firestore no pisan el default');

// 2b) Color y acabado independientes; cualquier color libre se acepta y se dibuja.
ok(viejo.acabado === '', 'casco azul viejo queda brillante');
ok(N({ casco: 'cromo' }).acabado === 'metal', 'el cromo guardado antes conserva su acabado metálico');
ok(N({ casco: 'rojo', acabado: 'carbono' }).acabado === 'carbono', 'acabado elegido aparte se respeta');
const libre = N({ casco: '#0f766e', accCol: '#123abc', marcoCol: '#ABCDEF', aroCol: '#d1d5db' });
ok(libre.casco === '#0f766e' && libre.accCol === '#123abc' && libre.marcoCol === '#ABCDEF', 'colores libres #rrggbb se aceptan');
const svgLibre = vm.runInContext('_pistoDe', ctx)({ casco: '#0f766e', diseno: '', acc: 'gato', accCol: '#123abc', lentes: 'redondas', marcoCol: '#abcdef' });
ok(svgLibre.includes('#0f766e') && svgLibre.includes('#123abc') && svgLibre.includes('#abcdef'), 'casco, accesorio y marco usan cada uno su color');
for (const ac of ['', 'mate', 'metal', 'perla', 'carbono', 'neon']) svgValido(vm.runInContext('_pistoDe', ctx)({ casco: '#334155', acabado: ac }), 'acabado ' + (ac || 'brillante') + ' con color libre');
ok(N({ accCol: 'red' }).accCol === '' && N({ casco: '#12' }).casco === 'azul', 'colores mal formados vuelven al default');

// 3) Datos de otro usuario (Firestore) no inyectan marcado en el SVG.
const malo = N({ peloCol: '"/><image href=x onerror=alert(1)>', casco: '<script>', pano: 'red" onload="x', acc: 'x"y', diseno: 'zz' });
ok(malo.peloCol === '#4a3222' && malo.casco === 'azul' && malo.pano === '' && malo.acc === '' && malo.diseno === 'franja', 'valores fuera del catálogo vuelven al default');
const svgMalo = vm.runInContext('_pistoDe', ctx)({ peloCol: '"/><image href=x onerror=alert(1)>', pelo: 'largo', cuello: 'buff', pano: '"><script>' }, 'feliz');
ok(!/onerror|<script|<image/.test(svgMalo), 'el SVG final no contiene marcado inyectado');

// 4) Los ids de <defs> no chocan entre miniaturas (son únicos por dibujo).
const a = vm.runInContext('_pistoDe', ctx)({ casco: 'atardecer' }), b = vm.runInContext('_pistoDe', ctx)({ casco: 'atardecer' });
ok(a.match(/id="g(\d+)"/)[1] !== b.match(/id="g(\d+)"/)[1], 'gradientes con id único por dibujo');

// 5) (2026-10-06) Casco y estela 'Arcoíris' se quitaron: quien los tenía guardados vuelve al default.
const sinArco = vm.runInContext('_pistNormal', ctx)({ casco: 'arcoiris', estela: 'arcoiris' });
ok(sinArco.casco === 'azul' && sinArco.estela === '', 'casco y estela arcoíris guardados vuelven al default');

console.log(fallos ? `  ${fallos}/${total} chequeos FALLARON` : `  ✓ armario de Pistero: ${total} chequeos OK (${opciones} opciones)`);
process.exit(fallos ? 1 : 0);
