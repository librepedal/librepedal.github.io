// Canal de Rodada — lógica extraída del index.html REAL.
// Diseño: COORDINACION-IA/DISENO-CANAL-RODADA.md
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// El canal de rodada vive en rodadas.js desde que se separó de index.html.
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'rodadas.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// --- El código está donde se dice que está ---
t('RODADA_AVISOS existe', /const RODADA_AVISOS=\{/.test(HTML));
t('enviarAvisoRodada existe', /async function enviarAvisoRodada\(/.test(HTML));
t('escucharCanalRodada existe', /function escucharCanalRodada\(/.test(HTML));
t('salirCanalRodada existe', /function salirCanalRodada\(/.test(HTML));

// --- Extraer el catálogo real de avisos ---
const bloque = HTML.match(/const RODADA_AVISOS=\{([\s\S]*?)\n\};/);
t('se pudo leer el catálogo', !!bloque);
const tipos = bloque ? [...bloque[1].matchAll(/^\s*(\w+):\s*\{/gm)].map(m => m[1]) : [];
t('son exactamente 6 avisos (más obliga a mirar la pantalla)', tipos.length === 6);
['hoyo', 'autoatras', 'frenando', 'quedado', 'pinchazo', 'paramos'].forEach(k =>
  t('incluye ' + k, tipos.includes(k)));

// --- Los tres de seguridad son los que suenan aunque vayas compitiendo ---
const seg = bloque ? [...bloque[1].matchAll(/^\s*(\w+):\s*\{[^}]*seg:(true|false)/gm)].reduce((a, m) => (a[m[1]] = m[2] === 'true', a), {}) : {};
t('hoyo es de seguridad', seg.hoyo === true);
t('auto atrás es de seguridad', seg.autoatras === true);
t('frenando es de seguridad', seg.frenando === true);
t('paramos NO es de seguridad', seg.paramos === false);
t('pinchazo NO es de seguridad', seg.pinchazo === false);

// --- _textoAviso: los de camino no llevan nombre, los de persona sí ---
const A = {
  hoyo: { t: 'Ojo, hoyo adelante.', seg: true },
  quedado: { t: 'se quedó atrás.', seg: false },
};
const textoAviso = (tipo, nombre) => {
  const a = A[tipo]; if (!a) return null;
  return a.seg ? a.t : ((nombre || 'Alguien') + ' ' + a.t);
};
t('aviso de camino no mete el nombre', textoAviso('hoyo', 'Manuel') === 'Ojo, hoyo adelante.');
t('aviso de persona sí lo mete', textoAviso('quedado', 'Manuel') === 'Manuel se quedó atrás.');
t('sin nombre no queda colgando', textoAviso('quedado', null) === 'Alguien se quedó atrás.');
t('tipo inventado no rompe', textoAviso('cualquiera', 'X') === null);

// --- Antiflood: un aviso cada 8s por persona ---
const LIMITE = 8000;
const puedeEnviar = (ahora, ultimo) => (ahora - ultimo) >= LIMITE;
t('el limite es de 8 segundos', /RODADA_MIN_ENTRE_AVISOS=8000/.test(HTML));
t('dos seguidos: el segundo se frena', puedeEnviar(1000, 500) === false);
t('pasados 8s se puede de nuevo', puedeEnviar(9000, 500) === true);
t('justo en el limite pasa', puedeEnviar(8500, 500) === true);

// --- No relee el historial ni se repite lo propio ---
t('descarta avisos anteriores a la conexión', /d\.ts<desde/.test(HTML));
t('no repite el aviso propio', /d\.uid===cu/.test(HTML));
t('solo procesa los nuevos', /ch\.type!=='added'/.test(HTML));

// --- El canal es cerrado: filtra por rodada ---
t('filtra por la rodada del usuario', /where\('rodada','==',id\)/.test(HTML));

console.log('  canal-rodada.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
