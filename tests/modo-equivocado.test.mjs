// Detección de "modo equivocado" -- ambas direcciones.
// Por qué existe: reporte real de un tester (120 km Victoria->Los Ángeles en bici, usó
// "Viaje rápido" sin fijarse en qué modo quedó seleccionado) que pedaleó horas enteras
// con el modo en "moto" puesto -- Pistero le repitió tips para CONDUCTORES ("la ciclovía
// no es estacionamiento... se la provocaste tú") sin que tuvieran ningún sentido para
// alguien que ES el ciclista, no un auto cerca de uno. La función original (2026-07-14,
// caso "voy en auto y la app dice que ando en bici") solo cubría UNA dirección -- ver
// modo-equivocado.js (separado de motor-navegacion.js el 2026-10-09).
// 2026-10-09, Inty: "no reconoce que el ciclista después de una gran velocidad sigue en bicicleta" -- una bajada
// larga a más de 50 km/h lo pasaba a vehículo (y en vehículo no hay subidas, bajadas ni consejos de bici). Casos al final.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(raiz, 'modo-equivocado.js'), 'utf8');

const i = src.indexOf('let _velAltaDesde=0');
if (i < 0) { console.log('  FALLA: no pude extraer el bloque (¿cambió el archivo?)'); process.exit(1); }
const bloque = src.slice(i);

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// Cada corrida arma su propio reloj simulado y su propia instancia de las funciones
// (las variables de racha, _movBiciDesde/_velAltaDesde, son de módulo -- no deben
// filtrarse entre pruebas distintas). El modo cambia de verdad al elegirlo, como en la app.
// pendiente: función que da la pendiente actual en % (o nada: "no se sabe").
function nuevoEntorno(modoInicial, pendiente) {
  let tiempoSim = 1000000000;
  let modoElegido = null, avisos = [];
  const DateM = { now: () => tiempoSim };
  const fn = new Function('modoIni', 'alElegir', 'h', 'Date', 'calcularPendienteActual', 'pendienteHistory',
    'let actividadTipo=modoIni; const elegirActividad=(id)=>{ actividadTipo=id; alElegir(id); };\n' + bloque
    + '\nreturn { _detectarModoEquivocado, _detectarModoEquivocadoInverso };');
  const api = fn(modoInicial, (id) => { modoElegido = id; }, (msg) => { avisos.push(msg); }, DateM, pendiente ? () => pendiente() : undefined, []);
  return {
    api,
    avanzar: (seg) => { tiempoSim += seg * 1000; },
    modoElegido: () => modoElegido,
    avisos: () => avisos,
  };
}

// --- Caso real: modo moto, velocidad de ciclista sostenida ---
{
  const e = nuevoEntorno('moto');
  for (let x = 0; x < 25 * 60; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(20); }
  t('25 min sostenidos a 20km/h en modo moto -> se corrige a ciclismo', e.modoElegido() === 'ciclismo');
  t('avisa UNA vez, explicando el porqué y cómo revertirlo', e.avisos().length === 1 && /cámbialo en tu perfil/.test(e.avisos()[0]));
}

// --- No debe molestar a un motorizado real ---
{
  // taco denso (18km/h) 15 min, después acelera (60km/h, reinicia la racha), vuelve a
  // taco otros 10 min -- nunca llega a 20 min SEGUIDOS sin tocar el techo motorizado.
  const e = nuevoEntorno('moto');
  for (let x = 0; x < 15 * 60; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(18); }
  e.avanzar(5); e.api._detectarModoEquivocado(60);
  for (let x = 0; x < 10 * 60; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(18); }
  t('auto en tráfico que en algún punto acelera -> NUNCA cambia', e.modoElegido() === null);
}
{
  // detenido (sp=0) 30 min seguidos: nunca está en rango de ciclista, no debe acumular nada.
  const e = nuevoEntorno('moto');
  for (let x = 0; x < 30 * 60; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(0); }
  t('auto detenido 30 min en un taco largo -> NUNCA cambia', e.modoElegido() === null);
}
{
  // justo en el techo inequívoco (45km/h exacto): no debe contar como evidencia de bici,
  // debe resetear la racha igual que superarlo.
  const e = nuevoEntorno('moto');
  for (let x = 0; x < 15 * 60; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(20); }
  e.avanzar(5); e.api._detectarModoEquivocado(45); // en el borde: resetea
  for (let x = 0; x < 15 * 60; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(20); } // no alcanza 20 min desde acá
  t('un pico en el borde del techo (45km/h) reinicia la racha', e.modoElegido() === null);
}

// --- No debe activarse en absoluto si ya está en el modo correcto ---
{
  const e = nuevoEntorno('ciclismo');
  for (let x = 0; x < 40 * 60; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(20); }
  t('ya en modo ciclismo: la lógica inversa ni se evalúa (y la directa tampoco dispara sin ir rápido)', e.modoElegido() === null);
}

// --- El caso ORIGINAL (2026-07-14, la otra dirección) sigue intacto (ahora pide 3 min) ---
{
  const e = nuevoEntorno('ciclismo');
  for (let x = 0; x < 200; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(82); } // 82 km/h sostenidos 3+ min, como el reporte real
  t('82 km/h sostenidos en modo ciclismo -> se corrige a moto (caso original, sin regresión)', e.modoElegido() === 'moto');
}

// --- 2026-10-09: una bajada rápida NO es ir en vehículo ---
{
  const e = nuevoEntorno('ciclismo', () => -6); // bajando al 6 %
  for (let x = 0; x < 5 * 60; x += 2) { e.avanzar(2); e.api._detectarModoEquivocado(65); }
  t('5 min a 65 km/h EN BAJADA en bici -> sigue en bici (antes pasaba a vehículo al minuto)', e.modoElegido() === null);
}
{
  const e = nuevoEntorno('ciclismo');
  for (let x = 0; x < 90; x += 2) { e.avanzar(2); e.api._detectarModoEquivocado(58); }
  t('minuto y medio a 58 km/h (sin saber la pendiente) -> todavía no cambia (pide 3 min)', e.modoElegido() === null);
}
{
  // pantalla apagada: una lectura rápida, 6 minutos sin lecturas, otra lectura rápida
  const e = nuevoEntorno('ciclismo');
  e.avanzar(2); e.api._detectarModoEquivocado(62); e.avanzar(360); e.api._detectarModoEquivocado(62); e.avanzar(2); e.api._detectarModoEquivocado(62);
  t('dos lecturas rápidas separadas por la pantalla apagada -> no cuenta como racha', e.modoElegido() === null);
}
{
  // el cambio lo hizo la app sola (plano a 70 km/h 3+ min) y después sigues pedaleando: vuelve a bici en 5 min
  const e = nuevoEntorno('ciclismo', () => 0);
  for (let x = 0; x < 200; x += 2) { e.avanzar(2); e.api._detectarModoEquivocado(70); }
  t('en plano a 70 km/h 3+ min -> pasa a vehículo', e.modoElegido() === 'moto');
  for (let x = 0; x < 6 * 60; x += 5) { e.avanzar(5); e.api._detectarModoEquivocado(22); }
  t('si el cambio fue automático y sigues pedaleando, vuelve a bici en 5 min (no 20)', e.modoElegido() === 'ciclismo');
}

console.log(`  modo-equivocado.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
