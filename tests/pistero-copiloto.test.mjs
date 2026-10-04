// Pistero en ruta (2026-10-04, aprobado por Inty: "breve y directo"). Reemplaza a
// bromas-espaciado-ruta.test.mjs y hitos.test.mjs: ya no hay bromas cada X km ni hito
// cada 10 km. Corre la lógica REAL de pistero-copiloto.js y de bromasDelCamino()
// (motor-gps.js) simulando viajes completos, como cada punto de GPS real.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
const COP = leer('pistero-copiloto.js');
const GPS = leer('motor-gps.js');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

const ini = GPS.indexOf('function bromasDelCamino(');
const fin = GPS.indexOf('/* ===== PENDIENTE EN VIVO');
if (ini < 0 || fin < 0) { console.log('  FALLA: no encontré bromasDelCamino en motor-gps.js'); process.exit(1); }

// Arma un "teléfono" con el módulo real y simula un viaje punto a punto.
function viaje(kmRecorridos, kmRutaTotal, charla, paso = 0.1) {
  const dichos = [];
  const ctx = {
    console, Math, String, Date, parseFloat,
    pisteroCharla: charla || 'normal', vozActiva: true, vozCola: [], cu: 'test',
    vozOcupada: () => false, h: (t) => dichos.push(t), _kmEsteViaje: 0,
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } }
  };
  vm.createContext(ctx);
  vm.runInContext(COP, ctx);
  vm.runInContext(GPS.slice(ini, fin), ctx);
  for (let km = 0; km <= kmRecorridos + 1e-9; km += paso) {
    ctx._kmEsteViaje = km;
    ctx.bromasDelCamino(20, kmRutaTotal);
  }
  return { dichos, ctx };
}

// --- El viaje de ejemplo aprobado: Futrono -> Llifén, 22 km con destino ---
const ej = viaje(22, 22);
debe('22 km con destino: 2 frases intermedias', ej.dichos.length === 2);
debe('a un tercio dice "Un tercio. Buen ritmo."', ej.dichos[0] === 'Un tercio. Buen ritmo.');
debe('a dos tercios dice "Dos tercios. Queda poco."', ej.dichos[1] === 'Dos tercios. Queda poco.');
debe('salida aprobada', ej.ctx.copSalidaTexto(22, 'Llifén, Futrono, Los Ríos') === '22 km a Llifén. Vamos.');
debe('llegada aprobada', ej.ctx.copLlegadaTexto(22, 78 * 60000, false) === 'Llegaste. 22 km en 1:18.');
debe('récord aprobado', ej.ctx.copLlegadaTexto(22, 78 * 60000, true) === 'Llegaste. 22 km en 1:18. Tu viaje más largo.');
debe('llegada corta en minutos', ej.ctx.copLlegadaTexto(6.4, 25 * 60000, false) === 'Llegaste. 6,4 km en 25 minutos.');

// --- Total de compañía: 4 por viaje (salida + 2 + llegada), más en viajes largos ---
debe('120 km Normal: 4 intermedias (6 en total)', viaje(120, 120).dichos.length === 4);
debe('80 km Normal: 3 intermedias (5 en total)', viaje(80, 80).dichos.length === 3);
debe('nunca más de 6 en total', viaje(400, 400).dichos.length === 4);
debe('Hablador: 4 intermedias (6 en total)', viaje(22, 22, 'hablador').dichos.length === 4);
debe('Callado: ninguna intermedia', viaje(120, 120, 'callado').dichos.length === 0);

// --- Sin destino (solo grabar): 5 km y 15 km; si se alarga, 45 y 75 ---
const libre = viaje(30, 0);
debe('sin destino, 30 km: 2 frases', libre.dichos.length === 2);
debe('a los 5 km', libre.dichos[0] === '5 km. Buen ritmo.');
debe('a los 15 km', libre.dichos[1] === '15 km. Vas bien.');
debe('sin destino, 90 km: 4 frases', viaje(90, 0).dichos.length === 4);
debe('sin destino Callado: nada', viaje(90, 0, 'callado').dichos.length === 0);

// --- Señal perdida: si salta varios puntos de golpe, dice UNA sola ---
const salto = viaje(22, 22, 'normal', 20);
debe('salto de GPS: una sola frase', salto.dichos.length === 1);

// --- Viaje nuevo: los contadores se reinician solos ---
{
  const v = viaje(22, 22);
  const antes = v.dichos.length;
  for (let km = 0; km <= 22; km += 0.1) { v.ctx._kmEsteViaje = km; v.ctx.bromasDelCamino(20, 22); }
  debe('segundo viaje vuelve a acompañar', v.dichos.length === antes + 2);
}

// --- Voz ocupada: no se pierde la frase, se dice en el próximo punto ---
{
  const v = viaje(0, 22);
  let ocupada = true;
  v.ctx.vozOcupada = () => ocupada;
  for (let km = 0; km <= 8; km += 0.1) { v.ctx._kmEsteViaje = km; v.ctx.bromasDelCamino(20, 22); }
  ocupada = false;
  v.ctx._kmEsteViaje = 8.1; v.ctx.bromasDelCamino(20, 22);
  debe('si estaba hablando, la dice después', v.dichos[0] === 'Un tercio. Buen ritmo.');
}

// --- Copiloto: breve, informa, sin consejo ---
const c = ej.ctx;
debe('subida fuerte', c.copPendienteTexto('subida', 6.2, 820) === 'Subida fuerte, 800 metros.');
debe('subida muy fuerte con %', c.copPendienteTexto('subida', 10.4, 480) === 'Subida muy fuerte: 10%, 500 metros.');
debe('subida suave', c.copPendienteTexto('subida', 3, 300) === 'Subida, 300 metros.');
debe('bajada larga', c.copPendienteTexto('bajada', -4, 900) === 'Bajada larga.');
debe('bajada corta y suave: no dice nada', c.copPendienteTexto('bajada', -3, 200) === null);
debe('dato cultural cada 10 km (Hablador 5)', c.copKmEntreDatos('normal') === 10 && c.copKmEntreDatos('hablador') === 5);

// --- Lo que se fue: sermones, ciudad, bromas por km, hito cada 10 km ---
const RUTA = GPS.slice(ini, fin) + leer('motor-navegacion.js') + leer('clima-datos.js') + COP;
debe('no queda "ojo con los frenos" ni "baja un cambio"', !/ojo con la velocidad y los frenos|Baja un cambio y dosifica|no pelees con él|abrígate antes/i.test(RUTA));
debe('bromasDelCamino ya no usa el banco de ciudad ni de velocidad', !/obtenerFraseUnica\('ciudad'\)|obtenerFrasePorVelocidad/.test(GPS.slice(ini, fin)));
debe('ya no hay hito cada 10 km', !GPS.slice(ini, fin).includes("obtenerFraseUnica('motivacional')"));
debe('la llegada vieja se reemplazó', !leer('motor-navegacion.js').includes('Que descanses esas piernas'));
debe('el módulo se carga en la app', leer('index.html').includes('<script src="pistero-copiloto.js"></script>') && leer('sw.js').includes("'./pistero-copiloto.js'"));

console.log(`  pistero-copiloto: ${ok} OK` + (fail ? `, ${fail} FALLAS` : ''));
process.exit(fail ? 1 : 0);
