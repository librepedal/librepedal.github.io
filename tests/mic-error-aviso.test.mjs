// "Preguntar hablando" (navegador): si el reconocimiento de voz falla, Pistero dice qué pasó (revisión de botones
// 2026-10-07: antes el botón dejaba de parpadear y no decía nada). Códigos: Web Speech API, SpeechRecognitionErrorEvent.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'pistero-chat-ia.js'), 'utf8');
let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

const i = SRC.indexOf('function _micErrorAviso(');
t('existe _micErrorAviso', i >= 0);
let prof = 0, fin = -1;
for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') prof++; else if (SRC[k] === '}' && --prof === 0) { fin = k + 1; break; } }
const dichos = []; let noEntendi = 0;
const fn = new Function('h', '_vozNoEntendi', SRC.slice(i, fin) + '\nreturn _micErrorAviso;')((x) => dichos.push(x), () => noEntendi++);
const caso = (cod) => { dichos.length = 0; noEntendi = 0; fn(cod); return dichos[0] || (noEntendi ? 'NO_ENTENDI' : ''); };
t('permiso negado → pide permiso del micrófono', /permiso del micrófono/.test(caso('not-allowed')));
t('servicio no permitido → pide permiso', /permiso del micrófono/.test(caso('service-not-allowed')));
t('sin micrófono → lo dice', /micrófono/.test(caso('audio-capture')));
t('sin red → lo dice', /señal/.test(caso('network')));
t('silencio → "no te entendí"', caso('no-speech') === 'NO_ENTENDI');
t('falla al arrancar → "no te entendí"', caso('start') === 'NO_ENTENDI');
t('cortado por nosotros (aborted) → callado', caso('aborted') === '');
t('onerror y el catch de start() llaman al aviso', /onerror=function\(ev\)\{[^\n]*_micErrorAviso\(ev&&ev\.error\)/.test(SRC) && /_micErrorAviso\('start'\)/.test(SRC));

console.log(`  mic-error-aviso.test.mjs: ${ok} OK` + (fail ? `, ${fail} FALLA(S)` : ''));
process.exit(fail ? 1 : 0);
