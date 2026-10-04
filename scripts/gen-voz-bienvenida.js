#!/usr/bin/env node
// Genera UNA sola vez los mp3 de la bienvenida de Pistero/Pistera y del mapa de huellas
// (texto aprobado por Inty 2026-10-04, ver COORDINACION-IA/BIENVENIDA-TEXTO-APROBADO-2026-10-04.md).
// Voz "El de siempre" / "La de siempre" (arquetipo cercano), mismos voice_id y ajustes que
// scripts/gen-voces-elevenlabs.js. Una frase por archivo para que el texto aparezca en
// pantalla justo cuando empieza su audio. Salta los que ya existen: re-correrlo no gasta.
// Sin números en el audio (N° de ciclista/Fundador va solo en pantalla).
//   node scripts/gen-voz-bienvenida.js          -> genera lo que falte
//   node scripts/gen-voz-bienvenida.js --contar -> solo cuenta caracteres, sin llamar a la API
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = path.dirname(__dirname);
const OUT = path.join(BASE, 'voces-el', 'bienvenida');

const VOZ = { l: '452WrNT9o8dphaYW5YGU', c: '2rigMbVWLdqtBSCahJFX' }; // Abel / Tatiana (cercano)

const FRASES = {
  b1: 'Llegaste justo a tiempo.',
  b2: 'Desde hoy eres parte de algo que nunca se había hecho.',
  b3: 'Aquí no venimos a contar kilómetros: venimos a cambiar las cosas.',
  b4: 'Tu voz, tus rutas, tus ideas van a marcar el camino de miles que vienen detrás.',
  b5: 'Esto recién empieza, y tú estás aquí desde el principio.',
  b6: 'Vamos a dejar una huella que nadie podrá borrar.',
  b7: 'Bienvenido a Libre Pedal.',
  h1: 'Tu huella de Fundador quedó marcada para siempre.',
  h2: 'Tu huella quedó marcada.'
};
// Pistera saluda en femenino solo donde el texto lo pide.
const FRASES_C = Object.assign({}, FRASES, { b7: 'Bienvenida a Libre Pedal.' });

function tts(voiceId, text, dest) {
  const key = fs.readFileSync(path.join(BASE, 'MI-ELEVENLABS.txt'), 'utf8').trim();
  return new Promise((resolve) => {
    const body = JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.8 }
    });
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: '/v1/text-to-speech/' + voiceId,
      method: 'POST',
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

(async () => {
  const pend = [];
  for (const g of Object.keys(VOZ)) {
    const fr = g === 'c' ? FRASES_C : FRASES;
    for (const id of Object.keys(fr)) {
      const dest = path.join(OUT, g + '-' + id + '.mp3');
      if (!fs.existsSync(dest)) pend.push({ g, id, text: fr[id], dest });
    }
  }
  const chars = pend.reduce((n, p) => n + p.text.length, 0);
  console.log(pend.length + ' audios por generar, ' + chars + ' caracteres de ElevenLabs.');
  if (process.argv.includes('--contar') || !pend.length) return;
  fs.mkdirSync(OUT, { recursive: true });
  let fallas = 0;
  for (const p of pend) {
    const r = await tts(VOZ[p.g], p.text, p.dest);
    console.log((r.ok ? 'OK   ' : 'FALLA ') + p.g + '-' + p.id + (r.ok ? '' : ' ' + r.code + ' ' + r.body));
    if (!r.ok) fallas++;
  }
  process.exit(fallas ? 1 : 0);
})();
