#!/usr/bin/env node
// Genera UNA sola vez los trozos pregrabados de voz-trozos.js (números y piezas de las
// frases del copiloto) para cada género y personalidad, con el MISMO voice_id que usa
// scripts/gen-voces-elevenlabs.js: así una frase armada nunca mezcla dos voces.
// Salta los que ya existen (re-correrlo no gasta) y escribe voces-el/trozos/manifest.json
// solo con las voces que quedaron COMPLETAS (la app no usa una voz a medias).
//   node scripts/gen-voz-trozos.js --contar           -> cuenta caracteres, no llama a la API
//   node scripts/gen-voz-trozos.js --solo=cercano     -> solo "El de siempre"/"La de siempre"
//   node scripts/gen-voz-trozos.js                    -> todas las personalidades
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');

const BASE = path.dirname(__dirname);
const OUT = path.join(BASE, 'voces-el', 'trozos');

// Catálogo REAL de trozos (no una copia que se pueda desincronizar).
const ctx = { window: {}, fetch: () => ({ then: () => ({ then: () => ({ catch: () => {} }) }) }), Math, String, parseInt, isNaN, Object };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(BASE, 'voz-trozos.js'), 'utf8'), ctx);
const FRASES = ctx.VT_FRASES;

// Voces por personalidad: el mismo objeto VOZ del generador principal.
const src = fs.readFileSync(path.join(__dirname, 'gen-voces-elevenlabs.js'), 'utf8');
const ini = src.indexOf('const VOZ = {');
let prof = 0, fin = -1;
for (let i = src.indexOf('{', ini); i < src.length; i++) {
  if (src[i] === '{') prof++;
  else if (src[i] === '}' && --prof === 0) { fin = i + 1; break; }
}
const VOZ = vm.runInNewContext('(' + src.slice(src.indexOf('{', ini), fin) + ')');

const solo = (process.argv.find((a) => a.startsWith('--solo=')) || '').split('=')[1];
const arqs = Object.keys(VOZ.l).filter((a) => !solo || a === solo);

function tts(voiceId, text, dest) {
  const key = fs.readFileSync(path.join(BASE, 'MI-ELEVENLABS.txt'), 'utf8').trim();
  return new Promise((resolve) => {
    const body = JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8 } });
    const req = https.request({
      hostname: 'api.elevenlabs.io', path: '/v1/text-to-speech/' + voiceId, method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode === 200) { fs.writeFileSync(dest, buf); resolve({ ok: true }); }
        else resolve({ ok: false, code: res.statusCode, body: buf.toString('utf8').slice(0, 300) });
      });
    });
    req.on('error', (e) => resolve({ ok: false, code: 0, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, code: 0, body: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

const dir = (g, a) => path.join(OUT, g, a);
const completa = (g, a) => Object.keys(FRASES).every((k) => fs.existsSync(path.join(dir(g, a), k + '.mp3')));

(async () => {
  const pend = [];
  for (const g of ['l', 'c']) for (const a of arqs) for (const k of Object.keys(FRASES)) {
    const dest = path.join(dir(g, a), k + '.mp3');
    if (!fs.existsSync(dest)) pend.push({ g, a, k, dest, text: FRASES[k] });
  }
  const chars = pend.reduce((n, p) => n + p.text.length, 0);
  console.log(Object.keys(FRASES).length + ' trozos x ' + arqs.length + ' personalidades x 2 géneros: '
    + pend.length + ' audios por generar, ' + chars + ' caracteres de ElevenLabs.');
  if (process.argv.includes('--contar')) return;
  let fallas = 0;
  for (const p of pend) {
    fs.mkdirSync(dir(p.g, p.a), { recursive: true });
    const r = await tts(VOZ[p.g][p.a], p.text, p.dest);
    if (!r.ok) { fallas++; console.log('FALLA ' + p.g + '/' + p.a + '/' + p.k + ' ' + r.code + ' ' + r.body); if (r.code === 401 || r.code === 402) break; }
  }
  const voces = { l: [], c: [] };
  for (const g of ['l', 'c']) for (const a of Object.keys(VOZ[g])) if (fs.existsSync(dir(g, a)) && completa(g, a)) voces[g].push(a);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ claves: Object.keys(FRASES), voces }, null, 0));
  console.log('Voces completas -> l: ' + voces.l.join(', ') + ' | c: ' + voces.c.join(', '));
  process.exit(fallas ? 1 : 0);
})();
