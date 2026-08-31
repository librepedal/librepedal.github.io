// Oficio, trueque y voluntariado (perfil de comunidad): sección nueva pedida por
// Inty 2026-08-31 — "un espacio que se desbloquea con darma y tiempo en la app".
// Se extrae el bloque REAL de perfil-comunidad.js (mismo criterio que
// blindaje-firestore.test.mjs: probar el comportamiento, no que el texto esté
// escrito) y se corre contra mocks mínimos de mesesDesdeRegistro/us/escapeHTML.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = readFileSync(join(raiz, 'perfil-comunidad.js'), 'utf8');
const HTML = readFileSync(join(raiz, 'index.html'), 'utf8');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

// --- recortar el bloque real de perfil-comunidad.js ---
const i = JS.indexOf('const TRUEQUE_MESES_MIN');
const j = JS.indexOf('async function _cargarPerfilPrivado');
if (i < 0 || j < 0) { console.log('  FALLA: no encontré el bloque de trueque en perfil-comunidad.js'); process.exit(1); }
const SRC = JS.slice(i, j);
debe('el bloque se pudo extraer', SRC.includes('_truequeDesbloqueado') && SRC.includes('guardarTruequeComunidad'));

// --- escapeHTML real de index.html (no una reimplementación aparte) ---
const escStart = HTML.indexOf('function escapeHTML(s){');
const escLine = escStart >= 0 ? HTML.slice(escStart, HTML.indexOf('\n', escStart)) : '';
debe('escapeHTML real encontrado en index.html', escStart >= 0 && escLine.trim().endsWith('}'));
const escapeHTML = new Function('s', escLine.slice(escLine.indexOf('{') + 1, escLine.lastIndexOf('}')));

// --- entorno falso mínimo ---
function montar({ meses = 0, darma = 0 } = {}) {
  const guardados = [];
  const window = {};
  const fakeDoc = { set: (data, opts) => { guardados.push({ data, opts }); return Promise.resolve(); } };
  const db = { collection: () => ({ doc: () => fakeDoc }) };
  const valores = { oficioInput: '', truequeInput: '', voluntariadoInput: '' };
  const document = { getElementById: (id) => (id in valores ? { value: valores[id] } : null) };
  const mensajes = [];
  const h = (m) => mensajes.push(m);
  const fn = new Function('window', 'document', 'db', 'cu', 'h', 'escapeHTML', 'mesesDesdeRegistro', 'us',
    SRC + '\nreturn Object.assign({}, window, {_truequeDesbloqueado, _htmlTruequeLocked, _htmlTruequeForm, _htmlTruequeView});');
  const api = fn(window, document, db, 'tester123', h, escapeHTML, () => meses, { d: darma });
  return { api, guardados, mensajes, valores };
}

// --- 1. umbral exacto: 6 meses Y 50 Darma, ambos hacen falta ---
debe('bloqueado con 0 meses y 0 darma', montar({ meses: 0, darma: 0 }).api._truequeDesbloqueado() === false);
debe('bloqueado con 6 meses pero solo 49 darma', montar({ meses: 6, darma: 49 }).api._truequeDesbloqueado() === false);
debe('bloqueado con 50 darma pero solo 5 meses', montar({ meses: 5, darma: 50 }).api._truequeDesbloqueado() === false);
debe('desbloqueado justo en el umbral (6 meses, 50 darma)', montar({ meses: 6, darma: 50 }).api._truequeDesbloqueado() === true);
debe('desbloqueado por encima del umbral', montar({ meses: 20, darma: 500 }).api._truequeDesbloqueado() === true);

// --- 2. el mensaje de bloqueo solo menciona lo que de verdad falta ---
let m = montar({ meses: 0, darma: 0 }).api._htmlTruequeLocked();
debe('sin nada aún: menciona meses y Darma', m.includes('6 meses') && m.includes('50 Darma'));
m = montar({ meses: 6, darma: 10 }).api._htmlTruequeLocked();
let deficit = m.includes('Te falta') ? m.slice(m.indexOf('Te falta')) : '';
debe('meses cumplidos: NO vuelve a pedir meses', !/mes/.test(deficit));
debe('meses cumplidos: sí pide el Darma que falta', deficit.includes('40 Darma'));
m = montar({ meses: 2, darma: 50 }).api._htmlTruequeLocked();
deficit = m.includes('Te falta') ? m.slice(m.indexOf('Te falta')) : '';
debe('darma cumplido: pide solo los meses que faltan', deficit.includes('4 meses') && !/Darma/.test(deficit));

// --- 3. el que edita su propio perfil ve el formulario con lo que ya guardó ---
const form = montar({ meses: 12, darma: 100 }).api._htmlTruequeForm({ oficio: 'Mecánico', trueque: 'Reparo frenos', voluntariado: '' });
debe('el formulario precarga el oficio guardado', form.includes('value="Mecánico"'));
debe('el formulario precarga el trueque guardado', form.includes('Reparo frenos'));
debe('el formulario tiene el botón de guardar', form.includes('guardarTruequeComunidad()'));

// --- 4. XSS: un oficio/trueque con HTML no debe ejecutarse al mostrarlo a otro ciclista ---
const view = montar().api._htmlTruequeView({ oficio: '<img src=x onerror=alert(1)>', trueque: '', voluntariado: '' });
debe('el oficio ajeno se escapa (no hay <img> crudo)', !view.includes('<img'));
debe('el oficio ajeno se muestra escapado', view.includes('&lt;img'));

// --- 5. perfil ajeno sin nada cargado: mensaje neutro, no un candado (el candado es solo para el dueño) ---
const vacio = montar().api._htmlTruequeView({});
debe('perfil ajeno vacío no menciona candado/bloqueo', !/lock|bloquea/i.test(vacio));
debe('perfil ajeno vacío tiene mensaje neutro', vacio.includes('todavía no compartió'));

// --- 6. guardar: recorta a los máximos y no guarda si no está desbloqueado ---
let sesion = montar({ meses: 0, darma: 0 });
await sesion.api.guardarTruequeComunidad();
debe('NO guarda si el usuario todavía no desbloqueó la sección', sesion.guardados.length === 0);

sesion = montar({ meses: 6, darma: 50 });
sesion.valores.oficioInput = '  Guía de montaña  ';
sesion.valores.truequeInput = 'x'.repeat(400);
sesion.valores.voluntariadoInput = 'Primeros auxilios';
await sesion.api.guardarTruequeComunidad();
debe('guarda cuando está desbloqueado', sesion.guardados.length === 1);
debe('recorta espacios del oficio', sesion.guardados[0].data.oficio === 'Guía de montaña');
debe('el trueque no supera los 300 caracteres', sesion.guardados[0].data.trueque.length === 300);
debe('usa merge:true (no pisa el resto del doc del usuario)', sesion.guardados[0].opts && sesion.guardados[0].opts.merge === true);

console.log(`  ${ok} OK, ${fail} FALLA(S)`);
process.exit(fail ? 1 : 0);
