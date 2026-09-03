// Espaciado de las "bromas del camino" según el largo de la ruta trazada.
// Por qué existe (2026-09-03, reporte real de Inty): "no quiero que esté bromeando
// todo el tiempo, hay que considerar la cantidad de frases según los km que se
// recorran... eso se identifica cuando se traza un viaje del punto A al punto B".
// Antes, bromasDelCamino() usaba un intervalo FIJO de 1.5 km en carretera sin
// importar el largo del viaje -- en una ruta real de 120 km (Victoria->Los Ángeles,
// reporte de un tester) eso permitía hasta 80 disparos posibles, sensación de charla
// constante. Ahora, cuando SE CONOCE el total de la ruta (navegación a un destino
// trazado con OSRM, routeTotalDistance -- ver funciones-mapa-viajes.js), el intervalo
// se deriva de BROMAS_OBJETIVO_RUTA para que el número de bromas de toda la ruta sea
// razonable sin importar qué tan larga sea. En GPS libre (sin destino, no se sabe
// cuánto se va a andar) el intervalo sigue siendo el de siempre.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'motor-gps.js'), 'utf8');

const i = SRC.indexOf('const BROMAS_OBJETIVO_RUTA=10;');
const fin = SRC.indexOf('/* ===== PENDIENTE EN VIVO');
if (i < 0 || fin < 0) { console.log('  FALLA: no pude extraer el bloque (¿cambió el archivo?)'); process.exit(1); }
const bloque = SRC.slice(i, fin);

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// Simula recorrer `kmTotales` km en pasos de `pasoKm`, llamando bromasDelCamino en
// cada paso (como cada fix de GPS real), y cuenta cuántas veces habló Pistero.
function contarBromasEnRecorrido(kmTotales, kmRutaTotal, pasoKm) {
  pasoKm = pasoKm || 0.2;
  const dichos = [];
  const us = { di: 0 };
  const h = (msg) => dichos.push(msg);
  // El bloque real usa estado de módulo (lastFraseParadoTime/tFraseCiudad/kmUltimaFrase/
  // _ultimoHitoKm) que en motor-gps.js vive fuera de la función -- se declara aquí mismo,
  // dentro del cuerpo de la función wrapper, para que persista entre llamadas igual que
  // en producción, sin tener que pasarlo como parámetro.
  const fn = new Function(
    'vozActiva', 'vozOcupada', 'vozCola', '_charlaMult', 'zonaActual',
    'us', 'h', 'obtenerFraseUnica', 'obtenerFrasePorVelocidad',
    'let lastFraseParadoTime=0, tFraseCiudad=0, kmUltimaFrase=0, _ultimoHitoKm=0;\n' + bloque + '\nreturn bromasDelCamino;'
  );
  const vozCola = [];
  const bromasDelCamino = fn(
    true, () => false, vozCola, () => 1, 'carretera',
    us, h,
    (cat) => 'frase:' + cat, // obtenerFraseUnica(categoria) -- se usa para 'profunda' Y 'motivacional'
    () => 'frase:ritmo'      // obtenerFrasePorVelocidad(sp)
  );
  for (let km = 0; km < kmTotales; km += pasoKm) {
    us.di = km;
    bromasDelCamino(20, kmRutaTotal); // 20 km/h, en carretera, siempre en movimiento
  }
  // Cuenta SOLO las bromas de ritmo (carretera), no los hitos de cada 10 km
  // ("motivacional"): ese es un contador de logro aparte, no tocado por este fix.
  return dichos.filter((m) => !m.includes('motivacional')).length;
}

// --- Sin ruta trazada (GPS libre): el intervalo fijo de 1.5 km de siempre ---
{
  const n = contarBromasEnRecorrido(15, undefined);
  // 15 km / 1.5 km = 10 disparos posibles (+/-1 por el paso de muestreo)
  t('GPS libre (sin ruta trazada): sigue el intervalo fijo de 1.5 km, ~10 en 15 km', n >= 9 && n <= 11);
}

// --- El caso real que motivó el fix: ruta larga trazada (120 km) ---
{
  const n = contarBromasEnRecorrido(120, 120, 0.5);
  // intervalo = max(1.5, 120/10) = 12 km -> ~10 disparos en toda la ruta, NO ~80
  t('ruta larga trazada (120 km): se espacia a ~10 bromas en TODA la ruta, no ~80', n >= 9 && n <= 11);
}

// --- Ruta corta trazada: el mínimo de 1.5 km sigue mandando, no se ve perjudicada ---
{
  const n = contarBromasEnRecorrido(5, 5);
  // intervalo = max(1.5, 5/10=0.5) = 1.5 km -> mismo resultado que sin ruta trazada
  t('ruta corta trazada (5 km): el mínimo de 1.5 km domina, no queda casi muda', n >= 2 && n <= 4);
}

// --- Ruta mediana: el espaciado crece proporcional al largo, no de golpe ---
{
  const corta = contarBromasEnRecorrido(40, 40, 0.5);
  const larga = contarBromasEnRecorrido(200, 200, 1);
  // intervalo(40km)=max(1.5,4)=4km -> ~10 bromas; intervalo(200km)=max(1.5,20)=20km -> ~10 bromas
  // en ambos casos el TOTAL de bromas para la ruta completa se mantiene acotado (~10),
  // no crece sin límite con el largo del viaje.
  t('el total de bromas para la ruta completa no crece sin límite con el largo del viaje',
    corta >= 9 && corta <= 11 && larga >= 9 && larga <= 11);
}

// --- kmRutaTotal no toca el criterio de "parado" (sigue siendo por tiempo) ---
{
  const dichos = [];
  const us = { di: 0 };
  const h = (msg) => dichos.push(msg);
  const fn = new Function(
    'vozActiva', 'vozOcupada', 'vozCola', '_charlaMult', 'zonaActual',
    'us', 'h', 'obtenerFraseUnica', 'obtenerFrasePorVelocidad', 'Date',
    'let lastFraseParadoTime=0, tFraseCiudad=0, kmUltimaFrase=0, _ultimoHitoKm=0;\n' + bloque + '\nreturn bromasDelCamino;'
  );
  let tiempoSim = 1000000;
  const DateM = { now: () => tiempoSim };
  const bromasDelCamino = fn(true, () => false, [], () => 1, 'carretera', us, h, () => 'x', () => 'x', DateM);
  bromasDelCamino(0, 120); // parado, con una ruta larga trazada -- no debería importarle kmRutaTotal
  t('parado (sp=0): no habla de inmediato (throttle de 20 min, no afectado por kmRutaTotal)', dichos.length === 0);
  tiempoSim += 1200000 + 1000; // pasan los 20 min
  bromasDelCamino(0, 120);
  t('parado: sigue funcionando por tiempo, kmRutaTotal no lo altera', dichos.length === 1);
}

console.log(`  bromas-espaciado-ruta.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
