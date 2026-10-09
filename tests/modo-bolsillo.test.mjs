// Modo bolsillo en la navegación (2026-10-09). Inty: "la app no está dando indicaciones con la pantalla apagada,
// soluciónalo ya". Con la pantalla apagada la app instalada deja de recibir el GPS (arreglo de raíz: versión nueva en
// Play Store); lo que funciona hoy es dejarla en negro (#saver) con la pantalla encendida. Este modo estaba escondido
// en Perfil > Rendimiento: ahora hay un botón en la navegación, un aviso único y el negro muestra los datos de la
// navegación (antes se quedaba en 0 navegando).
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// DOM mínimo
function el(id, cls) { const e = { id, children: [], style: {}, _cls: new Set((cls || '').split(' ').filter(Boolean)), innerText: '', innerHTML: '', attrs: {},
  classList: { contains: (c) => e._cls.has(c), add: (c) => e._cls.add(c), remove: (c) => e._cls.delete(c), toggle: (c) => (e._cls.has(c) ? (e._cls.delete(c), false) : (e._cls.add(c), true)) },
  appendChild(c) { this.children.push(c); dom[c.id] = c; return c; }, setAttribute(k, v) { this.attrs[k] = v; } }; return e; }
const dom = { 'nav-screen': el('nav-screen'), saver: el('saver'), navSpeed: el('navSpeed'), navDistTotal: el('navDistTotal'), saverSpd: el('saverSpd'), saverKm: el('saverKm') };
const almacen = {}, avisos = []; let intervalo = null, timeouts = [];
const ctx = {
  document: { readyState: 'complete', head: { appendChild() {} }, getElementById: (id) => dom[id] || null, createElement: (t) => el(''), addEventListener() {} },
  localStorage: { getItem: (k) => almacen[k] || null, setItem: (k, v) => { almacen[k] = v; } },
  setTimeout: (fn) => { timeouts.push(fn); }, setInterval: (fn) => { intervalo = fn; },
  MutationObserver: class { constructor(fn) { ctx.__mo = fn; } observe() {} },
  lpAviso: (t) => avisos.push(t), toggleSaver: () => dom.saver.classList.toggle('on'),
};
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(leer('modo-bolsillo.js'), ctx, { filename: 'modo-bolsillo.js' });

const b = dom.btnNavBolsillo;
ok(b && b.className === 'nav-bolsillo-btn', 'hay un botón de modo bolsillo dentro de la navegación');
ok(b && /no apag|pantalla en negro/i.test(b.attrs['aria-label'] || ''), 'el botón dice qué hace (lectores de pantalla)');
b.onclick({ stopPropagation() {} });
ok(dom.saver.classList.contains('on'), 'tocarlo deja la pantalla en negro (el mismo #saver de Ahorro pantalla: GPS y voz siguen)');

// el negro muestra los datos de la navegación
dom['nav-screen'].classList.add('active'); dom.navSpeed.innerText = '23'; dom.navDistTotal.innerText = '4.7';
intervalo();
ok(dom.saverSpd.innerText === '23' && dom.saverKm.innerText === '4.7', 'en negro y navegando muestra la velocidad y los km de la navegación (antes 0)');

// aviso único al empezar a navegar
ctx.__mo(); timeouts.forEach((t) => t()); timeouts = [];
ctx.__mo(); timeouts.forEach((t) => t());
ok(avisos.length === 1 && /no apagues la pantalla con el botón de encendido/i.test(avisos[0]), 'al navegar avisa UNA vez que no se apague con el botón de encendido');

// cableado
const html = leer('index.html');
ok(html.includes('<script src="modo-bolsillo.js"></script>'), 'index.html carga modo-bolsillo.js');
ok(leer('sw.js').includes("'./modo-bolsillo.js'"), 'sw.js lo guarda para usar sin señal');
ok(/Modo bolsillo · Pistero te sigue guiando/.test(html) && /No apagues con el botón de encendido/.test(html), 'el modo negro explica que Pistero sigue y que no se apague con el botón');

console.log(`modo bolsillo: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
