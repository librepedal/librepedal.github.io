// Test: el NOMBRE que ve el usuario coincide con el COLOR que se pinta.
// Corre con: node tests/colores-honestos.test.mjs   (sin dependencias)
//
// Por qué existe: se encontraron en producción dos opciones mintiendo sobre su
// color — el casco "Cian" pintaba naranja (#fc4c02) y los ojos "Café" pintaban
// azul marino (#16203a). Son el casco y los ojos POR DEFECTO, o sea lo primero
// que ve un ciclista nuevo al crear su personaje.
//
// A diferencia de los otros tests, este LEE index.html en vez de reimplementar
// la lógica: el error no estaba en una función, estaba en los datos del catálogo.
// Reimplementarlo acá no serviría de nada — el hex malo seguiría en la app.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');

// hex -> tono (0-360), saturación y luminosidad en %
function hsl(hex) {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255,
        g = parseInt(m.slice(2, 4), 16) / 255,
        b = parseInt(m.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let h = 0;
  if (d) h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return { h: Math.round(h), s: Math.round((d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))) * 100), l: Math.round(l * 100) };
}

// Tono que le corresponde a cada palabra en español. Los rangos son anchos a
// propósito: la idea es cazar un color derechamente equivocado (cian que es
// naranja), no discutir si un verde esmeralda tira para el azulado.
const TONO_ESPERADO = {
  rojo: [[345, 360], [0, 14]], naranja: [[15, 44]], amarillo: [[45, 69]],
  verde: [[70, 168]], cian: [[166, 200]], celeste: [[180, 220]], azul: [[200, 262]],
  morado: [[258, 320]], violeta: [[258, 320]], lila: [[258, 320]],
  rosado: [[318, 348]], rosa: [[318, 348]],
  cafe: [[15, 46]], miel: [[28, 58]], vino: [[328, 360], [0, 12]], coral: [[4, 26]],
};
// Los que no se juzgan por tono sino por qué tan claro/apagado son
const SIN_TONO = {
  negro: ({ l }) => l < 24,
  blanco: ({ l }) => l > 86,
  gris:  ({ s }) => s < 20,
  plateado: ({ s }) => s < 22,
};

const normalizar = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const familia = h => h < 15 || h >= 345 ? 'rojo' : h < 45 ? 'naranja' : h < 70 ? 'amarillo'
  : h < 166 ? 'verde' : h < 200 ? 'cian' : h < 262 ? 'azul' : h < 320 ? 'morado' : 'rosado';

// Entradas del catálogo:  {id:'x', name:'Nombre', ... c:'#hex'}  (o iris:'#hex')
const opciones = [...html.matchAll(/\{id:'([^']+)',\s*name:'([^']+)'[^}]*?(?:c|iris):'(#[0-9a-fA-F]{6})'/g)]
  .map(([, id, name, hex]) => ({ id, name, hex }));

let pass = 0, fail = 0;
function ok(desc, condicion, detalle) {
  if (condicion) { pass++; console.log('  ✓', desc); }
  else { fail++; console.log('  ✗', desc, '->', detalle); }
}

console.log('Nombre vs color real:');

// Red de seguridad: si alguien cambia el formato del catálogo y el regex deja de
// encontrar nada, el test pasaría en verde sin revisar NADA. Eso sería peor que
// no tenerlo.
ok(`se encontraron opciones con color en index.html (${opciones.length})`, opciones.length >= 20,
   `solo ${opciones.length} — ¿cambió el formato del catálogo?`);

for (const { id, name, hex } of opciones) {
  const n = normalizar(name);
  const c = hsl(hex);

  const acromatico = Object.keys(SIN_TONO).find(p => n.includes(p));
  if (acromatico) {
    ok(`${id} "${name}" ${hex}`, SIN_TONO[acromatico](c), `L=${c.l}% S=${c.s}% no da para "${name}"`);
    continue;
  }

  const palabra = Object.keys(TONO_ESPERADO).find(p => n.includes(p));
  if (!palabra) continue; // nombre sin color ("Natural", "Oscuros", "Trigueña") -> nada que verificar

  if (c.s < 12 && c.l > 12 && c.l < 88) {
    ok(`${id} "${name}" ${hex}`, false, `se llama "${name}" pero es casi gris (S=${c.s}%)`);
    continue;
  }
  const acierta = TONO_ESPERADO[palabra].some(([a, b]) => c.h >= a && c.h <= b);
  ok(`${id} "${name}" ${hex}`, acierta, `se llama "${name}" pero el tono real es ${c.h}° (${familia(c.h)})`);
}

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
