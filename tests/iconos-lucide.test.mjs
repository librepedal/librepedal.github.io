// Migración de íconos Font Awesome -> Lucide (iconos-lucide.js). Prueba la lógica
// real extraída del archivo real: qué clase FA se detecta por elemento, que las
// marcas (fab) nunca se tocan, y que el diccionario generado tiene SVGs bien
// formados (sin comas colgando ni comillas rotas del proceso de generación).
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'iconos-lucide.js'), 'utf8');

// El archivo real es una IIFE que arranca sola al cargar (busca document.body).
// Para probar nombreIconoDe()/migrar() de forma aislada, se ejecuta en un sandbox
// con un document mínimo (sin body, así la IIFE no dispara el MutationObserver real)
// y se exponen las funciones internas reemplazando el final del archivo.
const SRC_EXPUESTO = SRC.replace(
  /if\(document\.body\) arrancar\(\); else document\.addEventListener\('DOMContentLoaded', arrancar\);\n\}\)\(\);/,
  "if(document.body) arrancar(); else document.addEventListener('DOMContentLoaded', arrancar);\nwindow.__test={nombreIconoDe:nombreIconoDe, migrar:migrar, ICONOS_LUCIDE:ICONOS_LUCIDE, inyectarEstiloSupresion:inyectarEstiloSupresion};\n})();"
);

function montarEntorno() {
  const head = { hijos: [], appendChild(el) { this.hijos.push(el); } };
  const elementosPorId = {};
  const document = {
    body: null,
    head,
    addEventListener() {},
    querySelectorAll: () => [],
    getElementById: (id) => elementosPorId[id] || null,
    createElement: () => ({ id: '', textContent: '' }),
  };
  const window = { document };
  const ctx = { window, document, MutationObserver: class { observe() {} }, console };
  vm.createContext(ctx);
  vm.runInContext(SRC_EXPUESTO, ctx);
  ctx.window.__test._elementosPorId = elementosPorId;
  ctx.window.__test._head = head;
  return ctx.window.__test;
}

function elementoFalso(className) {
  return { className, dataset: {}, innerHTML: '' };
}

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

const T = montarEntorno();

debe('extrae la clase fa-X real de un ícono normal', T.nombreIconoDe(elementoFalso('fas fa-trophy')) === 'fa-trophy');
debe('ignora modificadores como fa-fw/fa-spin, toma el nombre real', T.nombreIconoDe(elementoFalso('fas fa-spin fa-gear fa-fw')) === 'fa-gear');
debe('las marcas (fab) nunca se tocan -- Lucide no tiene logos', T.nombreIconoDe(elementoFalso('fab fa-spotify')) === null);
debe('un elemento sin clase fa- no es un ícono', T.nombreIconoDe(elementoFalso('btn primary')) === null);

{
  const el = elementoFalso('fas fa-trophy');
  T.migrar(el);
  debe('migra un ícono mapeado: queda marcado y con SVG real adentro', el.dataset.lucide === 'fa-trophy' && /<svg/.test(el.innerHTML) && /<path/.test(el.innerHTML));
}
{
  const el = elementoFalso('fas fa-dharmachakra'); // deliberadamente sin mapeo (símbolo real, se deja Font Awesome)
  T.migrar(el);
  debe('un ícono sin mapeo se deja intacto, no rompe nada', el.dataset.lucide === undefined && el.innerHTML === '');
}
{
  const el = elementoFalso('fas fa-trophy');
  T.migrar(el);
  const primeraVez = el.innerHTML;
  T.migrar(el); // reprocesar el mismo elemento, mismo ícono
  debe('no reprocesa un ícono ya migrado al mismo nombre (evita trabajo repetido)', el.innerHTML === primeraVez);
}

// Bug real capturado por Inty en producción (26-ago, pantalla Social): Font
// Awesome dibuja su glifo con ::before, que un innerHTML nunca toca -- el ícono
// viejo quedaba pegado ENCIMA del SVG nuevo (dos íconos superpuestos por fila).
// inyectarEstiloSupresion() agrega la regla que lo apaga solo para lo migrado.
{
  const T2 = montarEntorno();
  T2.inyectarEstiloSupresion();
  const estilo = T2._head.hijos[0];
  debe('inyecta un <style> con la regla que apaga el ::before de lo migrado', T2._head.hijos.length === 1 && estilo.id === 'lucideSupresionFA' && /\[data-lucide\]::before\s*\{\s*content:\s*none\s*!important/.test(estilo.textContent));
}
{
  const T3 = montarEntorno();
  T3.inyectarEstiloSupresion();
  T3._elementosPorId['lucideSupresionFA'] = T3._head.hijos[0]; // simula que el <style> ya quedó en el documento
  T3.inyectarEstiloSupresion(); // segunda llamada, no debería duplicar
  debe('no inyecta el <style> dos veces si ya existe', T3._head.hijos.length === 1);
}

// Integridad del diccionario generado: cada valor debe ser SVG bien formado (tags
// balanceados, termina en '/>' o en una etiqueta de cierre), sin quedar cortado a
// mitad de un atributo por el escapado de comillas del generador.
{
  const entradas = Object.entries(T.ICONOS_LUCIDE);
  const rotos = entradas.filter(([, svg]) => {
    const abre = (svg.match(/</g) || []).length;
    const cierraAuto = (svg.match(/\/>/g) || []).length;
    return abre === 0 || abre !== cierraAuto || /undefined|\[object/.test(svg);
  });
  debe('el diccionario tiene ' + entradas.length + ' íconos, todos con SVG bien formado', entradas.length > 100 && rotos.length === 0);
}

console.log(`\n${ok} ok, ${fail} fallas — iconos-lucide.test.mjs`);
if (fail > 0) process.exit(1);
