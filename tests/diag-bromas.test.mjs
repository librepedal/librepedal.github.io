// Diagnóstico hablado de "por qué no suena ninguna broma".
// Por qué existe (2026-09-03): reporte real de Inty, textual: "de hace rato no
// escucho alguna broma". No hay forma de pedirle que abra devtools en el celular
// sin cable+compu, así que la respuesta tiene que llegar por voz/texto dentro de
// la propia app -- ver _pisteroExplicarBromas() en pistero-diag.js y la entrada
// nueva en FAQ_APP (pistero-conversacion.js). Este test cubre dos cosas
// independientes: que la FRASE REAL se reconozca, y que la RESPUESTA priorice
// bien entre las 3 causas reales que investigué (categoría auto-suprimida por
// pistero-memoria.js, voz apagada, cola de voz ocupada) antes de asumir que "no
// hay nada raro, solo falta tiempo/distancia".
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIAG = readFileSync(join(raiz, 'pistero-diag.js'), 'utf8');
const CONV = readFileSync(join(raiz, 'pistero-conversacion.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// --- El router ahora acepta respuestas-función en FAQ_APP, no solo strings ---
t('responderPreguntaGeneral soporta a como función (no solo string fijo)',
  /typeof a===['"]function['"]/.test(CONV));

// --- El regex real de detección, probado contra la frase TEXTUAL del reporte ---
const bloqueRegex = CONV.match(/\{r:(\/.+?\/),\s*a:function\(\)\{ if\(typeof _pisteroExplicarBromas/);
if (!bloqueRegex) { console.log('  FALLA: no encontré la entrada nueva en FAQ_APP (¿cambió el archivo?)'); process.exit(1); }
// eslint-disable-next-line no-eval
const REGEX_BROMAS = eval(bloqueRegex[1]);
const normalizar = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

t('frase real del reporte: "de hace rato no escucho alguna broma"',
  REGEX_BROMAS.test(normalizar('de hace rato no escucho alguna broma')));
t('variante: "hace rato no escucho ninguna broma"',
  REGEX_BROMAS.test(normalizar('hace rato no escucho ninguna broma')));
t('variante: "por qué no me cuentas bromas"',
  REGEX_BROMAS.test(normalizar('por qué no me cuentas bromas')));
t('variante: "dejaste de contar chistes"',
  REGEX_BROMAS.test(normalizar('dejaste de contar chistes')));
t('variante: "no me dices ninguna talla"',
  REGEX_BROMAS.test(normalizar('no me dices ninguna talla')));
t('NO se confunde con el comando real de silencio ("cállate")',
  !REGEX_BROMAS.test(normalizar('cállate')));
t('NO se confunde con una pregunta de clima',
  !REGEX_BROMAS.test(normalizar('qué clima hace hoy')));

// --- La respuesta hablada: priorización real, ejecutando la función de verdad ---
function nuevoEntorno(o) {
  o = Object.assign({
    _charlaMult: () => 1, vozActiva: true, pisteroCharla: 'normal', actividadTipo: 'ciclismo',
    vozHablando: false, vozOcupada: () => false, vozCola: [], vozPrioActual: 0,
    zonaActual: 'carretera', lastFraseParadoTime: 0, tFraseCiudad: 0, kmUltimaFrase: 0,
    us: { di: 0 }, categorias: {},
  }, o || {});
  const dichos = [];
  const h = (msg) => dichos.push(msg);
  const win = { PisteroMemoria: { debugCategorias: () => o.categorias } };
  const fn = new Function(
    '_charlaMult', 'vozActiva', 'pisteroCharla', 'actividadTipo', 'vozHablando', 'vozOcupada',
    'vozCola', 'vozPrioActual', 'zonaActual', 'lastFraseParadoTime', 'tFraseCiudad', 'kmUltimaFrase',
    'us', 'window', 'h', 'console',
    DIAG + '\nreturn { pisteroDiagBromas, _pisteroExplicarBromas };'
  );
  const consoleMudo = { log: () => {} };
  const api = fn(o._charlaMult, o.vozActiva, o.pisteroCharla, o.actividadTipo, o.vozHablando, o.vozOcupada,
    o.vozCola, o.vozPrioActual, o.zonaActual, o.lastFraseParadoTime, o.tFraseCiudad, o.kmUltimaFrase,
    o.us, win, h, consoleMudo);
  return { api, dichos };
}

// Caso 1: categoría auto-suprimida por pistero-memoria -- debe ganarle a todo lo demás.
{
  const e = nuevoEntorno({ categorias: {
    parado: { ofertas: 8, silencios: 4, tasa: 0.5, permitida: false },
    ciudad: { ofertas: 6, silencios: 1, tasa: 0.17, permitida: true },
  } });
  e.api._pisteroExplicarBromas();
  t('categoría suprimida: lo dice y explica que no es fijo', e.dichos.length === 1 && /cuando estás detenido/.test(e.dichos[0]) && /no es fijo/i.test(e.dichos[0]));
  t('categoría PERMITIDA no se menciona como suprimida', !/en la ciudad/.test(e.dichos[0]));
}

// Caso 2: nada suprimido, pero la voz está apagada -- debe decir eso, no "no hay nada raro".
{
  const e = nuevoEntorno({ vozActiva: false });
  e.api._pisteroExplicarBromas();
  t('voz apagada: lo dice claro', /voz apagada/.test(e.dichos[0]));
}

// Caso 3: nada suprimido, voz activa, pero ocupado ahora mismo (cola con algo esperando).
{
  const e = nuevoEntorno({ vozCola: [{ t: 'x', prio: 1 }] });
  e.api._pisteroExplicarBromas();
  t('cola ocupada: dice que hay algo esperando turno, no que "no hay nada raro"', /esperando turno/.test(e.dichos[0]));
}

// Caso 4: todo limpio, en carretera -- calcula cuánto falta de verdad.
{
  const e = nuevoEntorno({ zonaActual: 'carretera', kmUltimaFrase: 0, us: { di: 0.5 } }); // faltan 1km de 1.5
  e.api._pisteroExplicarBromas();
  t('caso normal en carretera: reporta el cálculo real, no un genérico', /en carretera me faltan/.test(e.dichos[0]) && /km/.test(e.dichos[0]));
}

// Caso 5: todo limpio, en ciudad -- usa el throttle de ciudad, no el de carretera.
{
  const e = nuevoEntorno({ zonaActual: 'ciudad', tFraseCiudad: Date.now() });
  e.api._pisteroExplicarBromas();
  t('caso normal en ciudad: usa el conteo de ciudad', /en ciudad me faltan/.test(e.dichos[0]));
}

console.log(`  diag-bromas.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
