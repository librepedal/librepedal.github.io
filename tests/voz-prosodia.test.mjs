// Voz por arquetipo: cada tipo de Pistero debe tener SU prosodia, y sin claves muertas.
// Nace del bug del 2026-07-21: al renombrar los arquetipos a tipos de ciclista, el mapa
// PERSONALIDAD_PROSODIA quedó con nombres viejos y 5 arquetipos sin voz -> "suenan igual".
// Este test lo habría cazado; existe para que no vuelva a driftar.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// ids reales de los arquetipos (los de PERSONALIDADES, que llevan labelF)
const arqs = [...HTML.matchAll(/\{id:'([a-z]+)',\s*label:'[^']*',\s*labelF:/g)].map(m => m[1]);
// 12 originales + seductor/otaku agregados 2026-08-14 (catálogo ElevenLabs)
t('se leyeron los 14 arquetipos', arqs.length === 14);

// claves con prosodia
const bloque = HTML.match(/const PERSONALIDAD_PROSODIA=\{([\s\S]*?)\n\};/);
t('existe PERSONALIDAD_PROSODIA', !!bloque);
const claves = bloque ? [...bloque[1].matchAll(/(\w+):\s*\{rate/g)].map(m => m[1]) : [];

// 1. Cada arquetipo tiene SU entrada
arqs.forEach(a => t('el arquetipo "' + a + '" tiene voz propia', claves.includes(a)));

// 2. No hay claves muertas (nombres viejos que ya no son arquetipos)
claves.forEach(c => t('la clave "' + c + '" corresponde a un arquetipo real', arqs.includes(c)));

// 3. Calzan 1:1 (misma cantidad, sin sobrantes ni faltantes)
t('prosodia y arquetipos calzan 1:1', claves.length === arqs.length);

// 4. Las voces son DISTINTAS entre sí (si todas fueran +0/+0 sonarían igual otra vez)
const pares = bloque ? [...bloque[1].matchAll(/(\w+):\s*\{rate:'([+-]?\d+)%',\s*pitch:'([+-]?\d+)%'\}/g)]
  .map(m => m[2] + '/' + m[3]) : [];
const distintos = new Set(pares);
t('al menos 10 combinaciones rate/pitch distintas (no todos iguales)', distintos.size >= 10);

// 5. El default 'cercano' existe (es el fallback en el código)
t('cercano existe como fallback', claves.includes('cercano'));

// 6. Rango sano: nada tan extremo que suene roto
const fuera = pares.filter(p => { const [r, pi] = p.split('/').map(Number); return Math.abs(r) > 35 || Math.abs(pi) > 20; });
t('ninguna voz con valores extremos (rate<=35%, pitch<=20%)', fuera.length === 0);

console.log('  voz-prosodia.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
