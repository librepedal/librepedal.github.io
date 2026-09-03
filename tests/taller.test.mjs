// El comando de voz del Taller, extraído del index.html REAL (no reimplementado).
// Nace del reporte de Inty: "arréglame la bici no va".
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// handleVoiceCommand() (donde vive este patrón) se separó a pistero-conversacion.js
// en 2026-09.
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'pistero-conversacion.js'), 'utf8');

// Saca el regex tal cual está en el archivo: si alguien lo cambia, el test lo evalúa.
const m = HTML.match(/if\((\/taller\|arregl[^/]*\/)\.test\(t\)\)\{ cv\('mac'\)/);
if (!m) { console.log('  FALLA: no encontré el patrón del taller en index.html'); process.exit(1); }
const RE = new RegExp(m[1].slice(1, -1));

// normalizar() del index.html: minúsculas + sin tildes
const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

let ok = 0, fail = 0;
const debe = (frase, esperado) => {
  const r = RE.test(norm(frase));
  if (r === esperado) ok++;
  else { fail++; console.log(`  FALLA: "${frase}" -> ${r ? 'abre' : 'NO abre'} (se esperaba ${esperado ? 'abrir' : 'no abrir'})`); };
};

// --- Lo que Inty reportó roto ---
['arréglame la bici', 'arreglame la bici', 'arregla mi bici', 'arréglame la bicicleta'].forEach(f => debe(f, true));

// --- Síntomas: cómo habla alguien parado al lado de su bici ---
[
  'tengo un pinchazo', 'se me pinchó', 'se me ponchó la rueda', 'pinché',
  'se me soltó la cadena', 'se me cortó la cadena', 'se me salió la cadena',
  'la cadena está rota', 'tengo la rueda desinflada', 'se me rompió el freno',
  'el freno no funciona', 'la llanta está pinchada', 'se me quedó la bici',
  'necesito reparar la bici', 'hay que componer esto', 'no funciona mi bici',
].forEach(f => debe(f, true));

// --- Formas directas que ya funcionaban: no se rompen ---
['taller', 'llévame al taller', 'mecánica', 'necesito arreglar la bici'].forEach(f => debe(f, true));

// --- Lo que NO debe abrir el taller (evitar falsos positivos) ---
[
  'quiero ver el mapa', 'cuántos kilómetros llevo', 'pon música',
  'cómo está el clima', 'llévame a casa', 'quiero ver mis viajes',
].forEach(f => debe(f, false));

console.log('  taller.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
