// "Sensores Bluetooth" solo se muestra donde hay Bluetooth web (2026-10-07, Inty: "ocúltalos en la app por ahora").
// La app de Play corre en el WebView de Android, que NO tiene Bluetooth web (MDN browser-compat-data:
// webview_android version_added:false): ahí "Conectar pulsómetro/potenciómetro" nunca podían conectar nada.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'seguridad-sensores.js'), 'utf8');
const HTML = readFileSync(join(raiz, 'index.html'), 'utf8');
let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// el bloque envuelve el título y los 3 botones
const i = HTML.indexOf('<div id="bloqueSensoresBLE">'), j = HTML.indexOf('Ayúdanos a crecer');
const bloque = i >= 0 && j > i ? HTML.slice(i, j) : '';
t('index.html: el bloque bloqueSensoresBLE existe', i >= 0);
t('el bloque contiene título y los 3 botones (conectar x2, desconectar)', /Sensores Bluetooth/.test(bloque) && /conectarPulsometro\(\)/.test(bloque) && /conectarPotenciometro\(\)/.test(bloque) && /desconectarBluetooth\(\)/.test(bloque));
t('el bloque cierra antes de "Ayúdanos a crecer" (no se lleva la reseña)', (bloque.match(/<div\b/g) || []).length === (bloque.match(/<\/div>/g) || []).length);

function correr(conBT) {
  const el = { style: { display: 'x' } };
  const ctx = { console, setTimeout, clearTimeout, Math, JSON, Date, Promise,
    navigator: conBT ? { bluetooth: {} } : {},
    document: { readyState: 'complete', getElementById: (id) => (id === 'bloqueSensoresBLE' ? el : null), addEventListener() {} },
    window: {}, localStorage: { getItem: () => null, setItem() {} } };
  ctx.window = ctx; vm.createContext(ctx);
  try { vm.runInContext(SRC, ctx); } catch (e) { /* otras partes del archivo pueden pedir cosas de la app; lo que importa ya corrió */ }
  if (el.style.display === 'x') vm.runInContext('_bleMostrarBloque()', ctx);
  return el.style.display;
}
t('sin Bluetooth web (app de Play / WebView) → oculto', correr(false) === 'none');
t('con Bluetooth web (Chrome en Android) → visible', correr(true) === '');

console.log(`  ble-oculto-sin-bluetooth.test.mjs: ${ok} OK` + (fail ? `, ${fail} FALLA(S)` : ''));
process.exit(fail ? 1 : 0);
