// Memoria de comportamiento de Pistero (pistero-memoria.js) — perfil que aprende
// observando lo que el ciclista HACE (hora de salida, paradas, esfuerzo en subida) y
// la señal de "cuándo lo mandan a callar", 100% local (localStorage). Prueba el
// comportamiento real del código, extraído del archivo real, no una reimplementación.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'pistero-memoria.js'), 'utf8');

function montarLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _store: store,
  };
}

// new Date() y Date.now() son dos caminos independientes del spec -- pisotear solo
// Date.now no basta (registrarInicioViaje usa `new Date().getHours()`). Reemplaza la
// clase Date entera dentro del sandbox para que ambos caminos usen el reloj falso.
function crearRelojFalso(inicialMs) {
  let actual = inicialMs;
  class FakeDate extends Date {
    constructor(...args) { if (args.length === 0) super(actual); else super(...args); }
    static now() { return actual; }
  }
  return { FakeDate, avanzar: (ms) => { actual += ms; } };
}

function montarEntorno(cuVal, RelojDate, MathObj) {
  const window = {};
  const localStorage = montarLocalStorage();
  const ctx = { window, localStorage, cu: cuVal, Date: RelojDate || Date, Math: MathObj || Math, JSON, console };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { window, localStorage };
}
// Math.random controlado -- necesario desde el fix del "candado eterno" (ver más
// abajo): categoriaPermitida() ahora es probabilística cuando una categoría está
// suprimida (probing), así que sin fijar el dado el test sería flaky.
function mathConRandom(valorFijo) { return Object.assign(Object.create(Math), { random: () => valorFijo }); }

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };
const leer = (localStorage, cuVal) => { const r = localStorage.getItem('lp_perfilaprendido_' + cuVal); return r ? JSON.parse(r) : null; };

// ===== Categorías: aprender de ser callado =====
{
  const { window } = montarEntorno('u1');
  debe('sin muestra suficiente, la categoría está permitida (no inventa supresión)', window.PisteroMemoria.categoriaPermitida('subida') === true);
}
{
  const { window } = montarEntorno('u2', null, mathConRandom(0.5)); // 0.5 >= 1/6: nunca cae en el probing
  const M = window.PisteroMemoria;
  for (let i = 0; i < 5; i++) { M.registrarOferta('subida'); if (i < 2) M.registrarSilencio(); }
  debe('se suprime con 5+ ofertas y 40%+ de silencios', M.categoriaPermitida('subida') === false);
}
{
  // Bug real encontrado 2026-09-03 (reporte de Inty: "de hace rato no escucho
  // alguna broma"): antes, una vez suprimida, la categoría quedaba muda PARA
  // SIEMPRE -- obtenerFraseUnica() corta antes de llamar registrarOferta(), así
  // que el historial nunca volvía a recibir muestras y categoriaPermitida()
  // seguía dando false eternamente, contradiciendo la promesa del propio
  // comentario ("no es un castigo permanente... se recupera sola con el
  // tiempo"). Con PROBING_SUPRIMIDA, 1 de cada 6 veces se deja pasar igual --
  // forzamos Math.random a 0 (siempre "gana" el probing) para probarlo.
  const { window } = montarEntorno('u2b', null, mathConRandom(0));
  const M = window.PisteroMemoria;
  for (let i = 0; i < 5; i++) { M.registrarOferta('subida'); if (i < 2) M.registrarSilencio(); }
  debe('la supresión NO es eterna: el probing la deja pasar de vez en cuando', M.categoriaPermitida('subida') === true);
}
{
  // Y si en esos intentos de probing el usuario YA NO la calla, la muestra entra
  // "limpia" al historial y la tasa de silencio baja sola -- así se cumple de
  // verdad "se recupera con el tiempo", no solo de palabra en el comentario.
  const { window } = montarEntorno('u2c');
  const M = window.PisteroMemoria;
  for (let i = 0; i < 5; i++) { M.registrarOferta('subida'); if (i < 2) M.registrarSilencio(); } // 2/5 = 40%: suprimida
  for (let i = 0; i < 3; i++) M.registrarOferta('subida'); // 3 ofertas limpias más (simula probes sin rechazo)
  debe('tras varias ofertas limpias, la tasa baja y se vuelve a permitir del todo', M.categoriaPermitida('subida') === true);
}
{
  const { window } = montarEntorno('u3');
  const M = window.PisteroMemoria;
  for (let i = 0; i < 5; i++) M.registrarOferta('bajada');
  M.registrarSilencio(); // 1/5 = 20%, bajo el umbral de 40%
  debe('NO se suprime con tasa de silencio baja', M.categoriaPermitida('bajada') === true);
}
{
  const reloj = crearRelojFalso(1000000);
  const { window, localStorage } = montarEntorno('u4', reloj.FakeDate);
  const M = window.PisteroMemoria;
  for (let i = 0; i < 5; i++) { M.registrarOferta('parado'); reloj.avanzar(1000); }
  reloj.avanzar(20000); // fuera de la ventana de correlación (12s) -> no es reacción a esa oferta
  M.registrarSilencio();
  debe('un silencio fuera de la ventana de correlación no se cuenta', leer(localStorage, 'u4').categorias.parado.silencios === 0);
}
{
  const { window } = montarEntorno('u5', null, mathConRandom(0.5)); // 0.5 >= 1/6: fuera del probing
  const M = window.PisteroMemoria;
  // Categorías separadas: silenciar "profunda" no debe afectar a "ciudad".
  for (let i = 0; i < 5; i++) { M.registrarOferta('profunda'); M.registrarSilencio(); }
  for (let i = 0; i < 5; i++) M.registrarOferta('ciudad');
  debe('la supresión es por categoría, no global', M.categoriaPermitida('profunda') === false && M.categoriaPermitida('ciudad') === true);
}

// ===== Hora de salida =====
{
  const reloj = crearRelojFalso(new Date('2026-08-25T08:00:00').getTime());
  const { window } = montarEntorno('u6', reloj.FakeDate);
  const M = window.PisteroMemoria;
  for (let i = 0; i < 5; i++) { M.registrarInicioViaje(); reloj.avanzar(86400000); } // 5 mañanas seguidas
  debe('con 5+ salidas consistentes, reporta el patrón horario', /mañana/.test(M.resumenTexto()));
}
{
  const { window } = montarEntorno('u7');
  const M = window.PisteroMemoria;
  M.registrarInicioViaje(); M.registrarInicioViaje(); // solo 2, bajo el mínimo de 5
  debe('sin viajes suficientes, no reporta hora de salida', !/mañana|tarde|noche/.test(M.resumenTexto()));
}

// ===== Paradas =====
{
  const reloj = crearRelojFalso(1000000);
  const { window, localStorage } = montarEntorno('u8', reloj.FakeDate);
  const M = window.PisteroMemoria;
  M.registrarParada(0, 15); // empieza a parar
  reloj.avanzar(5 * 60000); // 5 minutos parado
  M.registrarParada(12, 0); // vuelve a moverse
  debe('mide la duración real de la parada', Math.abs(leer(localStorage, 'u8').viajesParada[0] - 5) < 0.05);
}
{
  const reloj = crearRelojFalso(1000000);
  const { window, localStorage } = montarEntorno('u9', reloj.FakeDate);
  const M = window.PisteroMemoria;
  M.registrarParada(0, 15);
  reloj.avanzar(2000); // 2 segundos: ruido de GPS, no una parada real
  M.registrarParada(12, 0);
  reloj.avanzar(60 * 60000); // 1 hora: "olvido" de cerrar el viaje, no una parada real
  M.registrarParada(0, 15);
  reloj.avanzar(60 * 60000);
  M.registrarParada(12, 0);
  const guardado = leer(localStorage, 'u9');
  debe('descarta paradas de ruido de GPS y de "olvido" de horas', !guardado || (guardado.viajesParada || []).length === 0);
}

// ===== Esfuerzo en subida =====
{
  const { window, localStorage } = montarEntorno('u10');
  const M = window.PisteroMemoria;
  M.registrarEsfuerzoSubida(14, 2); // pendiente <4%: no es una subida de verdad
  const guardado = leer(localStorage, 'u10');
  debe('ignora pendientes suaves (<4%), no son subida real', !guardado || (guardado.subida || []).length === 0);
}
{
  const reloj = crearRelojFalso(1000000);
  const { window, localStorage } = montarEntorno('u11', reloj.FakeDate);
  const M = window.PisteroMemoria;
  M.registrarEsfuerzoSubida(10, 6);
  M.registrarEsfuerzoSubida(11, 6); // a menos de 15s de la anterior: se descarta
  reloj.avanzar(16000);
  M.registrarEsfuerzoSubida(9, 7);
  debe('no satura: 1 muestra de subida cada 15s como mínimo', leer(localStorage, 'u11').subida.length === 2);
}
{
  const reloj = crearRelojFalso(1000000);
  const { window } = montarEntorno('u12', reloj.FakeDate);
  const M = window.PisteroMemoria;
  for (let i = 0; i < 8; i++) { M.registrarEsfuerzoSubida(10, 6); reloj.avanzar(16000); }
  debe('con 8+ muestras de subida, reporta el promedio real', /subidas exigentes/.test(M.resumenTexto()));
}

console.log(`\n${ok} ok, ${fail} fallas — pistero-memoria.test.mjs`);
if (fail > 0) process.exit(1);
