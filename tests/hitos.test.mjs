// Hitos de km + reseteo de contadores entre viajes.
// Replica la lógica EXACTA insertada en index.html (bloque "Auditoria 2026-07-20" del
// hito motivacional). Si alguien cambia esos umbrales en el HTML, este archivo hay que
// actualizarlo a mano: por eso el test verifica primero que el bloque siga ahí.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');

let ok = 0, fail = 0;
function t(nombre, cond) {
  if (cond) { ok++; } else { fail++; console.log('  FALLA: ' + nombre); }
}

// --- 0. El código sigue en el HTML (si no, el resto del archivo miente) ---
t('el bloque del hito existe en index.html', HTML.includes("obtenerFraseUnica('motivacional')"));
t('el reseteo por retroceso existe', HTML.includes('kmUltimaFrase=0; _ultimoHitoKm=0;'));
t('_ultimoHitoKm está declarado', /let _ultimoHitoKm=0/.test(HTML));
t('el banco motivacional sigue poblado', /motivacional:\["/.test(HTML));

// --- Simulador del bloque real ---
function nuevoViaje() { return { kmUltimaFrase: 0, _ultimoHitoKm: 0, dichas: [] }; }
function avanzar(s, di) {
  if (di + 0.05 < s.kmUltimaFrase || di < s._ultimoHitoKm * 10) { s.kmUltimaFrase = 0; s._ultimoHitoKm = 0; }
  const hito = Math.floor(di / 10);
  if (hito > 0 && hito > s._ultimoHitoKm) { s._ultimoHitoKm = hito; s.dichas.push(hito * 10); }
  return s;
}

// --- 1. Se celebra cada decena, una sola vez ---
let s = nuevoViaje();
[0, 3.2, 9.9, 10.0, 12.5, 19.8, 20.1, 25, 30].forEach(d => avanzar(s, d));
t('celebra 10, 20 y 30', JSON.stringify(s.dichas) === '[10,20,30]');

s = nuevoViaje();
for (let d = 0; d <= 10.5; d += 0.1) avanzar(s, d);
t('no repite el mismo hito aunque pasen muchos puntos GPS', s.dichas.filter(x => x === 10).length === 1);

// --- 2. Un viaje corto nunca dispara ---
s = nuevoViaje();
[1, 4, 8, 9.99].forEach(d => avanzar(s, d));
t('viaje de menos de 10 km no dice nada', s.dichas.length === 0);

// --- 3. Salto grande (GPS recuperado tras túnel): no inventa hitos intermedios ---
s = nuevoViaje();
avanzar(s, 2); avanzar(s, 34);
t('salto de 2 a 34 km celebra solo el 30', JSON.stringify(s.dichas) === '[30]');

// --- 4. El bug real: viaje nuevo tras uno largo ---
s = nuevoViaje();
[10, 20, 30, 42].forEach(d => avanzar(s, d));
// 42 km cruzan CUATRO decenas: 10, 20, 30 y 40 (la expectativa original decía 3 y estaba mal).
t('primer viaje largo celebró 10/20/30/40', JSON.stringify(s.dichas) === '[10,20,30,40]');
avanzar(s, 0.3); // arranca viaje nuevo
t('viaje nuevo resetea el hito', s._ultimoHitoKm === 0);
t('viaje nuevo resetea kmUltimaFrase (Pistero vuelve a hablar)', s.kmUltimaFrase === 0);
avanzar(s, 11);
t('el viaje nuevo vuelve a celebrar los 10 km', s.dichas[s.dichas.length - 1] === 10);

// --- 5. El margen de 0.05 no confunde ruido de GPS con viaje nuevo ---
s = nuevoViaje();
avanzar(s, 12); s.kmUltimaFrase = 12;
avanzar(s, 11.98); // retroceso mínimo: ruido, NO viaje nuevo
t('ruido de GPS de 20 m no cuenta como viaje nuevo', s._ultimoHitoKm === 1);

console.log('  hitos.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
