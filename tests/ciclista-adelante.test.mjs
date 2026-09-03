// Aviso de ciclista adelante para el que va motorizado.
// Lógica replicada del bloque "AVISO DE CICLISTA ADELANTE" de index.html.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// El bloque "AVISO DE CICLISTA ADELANTE" vive en motor-navegacion.js desde que se
// separó de index.html (2026-09).
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'motor-navegacion.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// --- El código está y las constantes son las que este test asume ---
t('el bloque existe', /AVISO DE CICLISTA ADELANTE/.test(HTML));
t('solo se activa en modo moto', /actividadTipo!=='moto'\) return/.test(HTML));
t('descarta a otros motorizados', /x\.modo==='moto'\) return/.test(HTML));
t('no se avisa de sí mismo', /d\.id===liveTrackId\) return/.test(HTML));
t('el aviso es de prioridad SEGURIDAD', /PRIO_VOZ\.SEGURIDAD\)/.test(HTML));
t('el aviso recuerda el metro y medio', /metro y medio/.test(HTML));
t('el aviso NO exige que el ciclista tenga la app', !/si el ciclista (no )?(tiene|usa) la app/i.test(HTML));

const C = { SEG: 25, MIN: 150, MAX: 800, ARCO: 50 };
t('SEG=25', new RegExp('CICLISTA_AVISO_SEG=' + C.SEG).test(HTML));
t('MIN=150', new RegExp('CICLISTA_AVISO_MIN_M=' + C.MIN).test(HTML));
t('MAX=800', new RegExp('CICLISTA_AVISO_MAX_M=' + C.MAX).test(HTML));
t('ARCO=50', new RegExp('CICLISTA_AVISO_ARCO=' + C.ARCO).test(HTML));

// --- Distancia de aviso según velocidad ---
const metros = v => Math.max(C.MIN, Math.min(C.MAX, (v || 0) / 3.6 * C.SEG));
t('parado usa el mínimo', metros(0) === 150);
t('a 20 km/h usa el mínimo (139m < 150)', metros(20) === 150);
t('a 60 km/h avisa a ~417 m', Math.round(metros(60)) === 417);
t('a 100 km/h avisa a ~694 m', Math.round(metros(100)) === 694);
t('a 200 km/h se topa en 800 m', metros(200) === 800);
t('nunca avisa más lejos que el máximo', metros(500) <= C.MAX);

// --- ¿Va adelante? ---
const adelante = (mio, alCiclista) => {
  if (mio === null || mio === undefined) return true;
  const d = Math.abs(((alCiclista - mio + 540) % 360) - 180);
  return d <= C.ARCO;
};
t('justo al frente: avisa', adelante(0, 0) === true);
t('20° a la derecha: avisa', adelante(0, 20) === true);
t('20° a la izquierda: avisa', adelante(0, 340) === true);
t('en el borde del arco (50°): avisa', adelante(0, 50) === true);
t('60° al costado: NO avisa', adelante(0, 60) === false);
t('justo atrás: NO avisa (ya lo pasé)', adelante(0, 180) === false);
t('a 90°, cruzando: NO avisa', adelante(0, 90) === false);
t('cruce del norte (350->10): avisa', adelante(350, 10) === true);
t('cruce del norte (10->350): avisa', adelante(10, 350) === true);
t('sin rumbo confiable: avisa igual (mejor de más)', adelante(null, 123) === true);

// --- Antirepetición ---
const REPETIR = 180000;
const puede = (ahora, ult) => (ahora - (ult || 0)) >= REPETIR;
t('el bloqueo es de 3 minutos', /CICLISTA_AVISO_REPETIR_MS=180000/.test(HTML));
t('no repite al mismo ciclista al toque', puede(5000, 1000) === false);
t('a los 3 min puede repetir', puede(185000, 1000) === true);
// Ojo: con marcas de reloj REALES (Date.now() ≈ 1.7e12) un ciclista nunca visto tiene
// último-aviso 0, así que la resta es enorme y siempre pasa. La versión anterior de este
// caso usaba tiempos falsos de 4 dígitos y por eso "fallaba" — el equivocado era el test.
t('primer encuentro siempre avisa', puede(Date.now(), 0) === true);
t('avisa de uno por vez', /return; \/\/ uno por vez/.test(HTML));

console.log('  ciclista-adelante.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
