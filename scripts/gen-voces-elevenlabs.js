#!/usr/bin/env node
// Genera el catalogo de voces ElevenLabs para los 12 arquetipos VIVOS de Pistero/Pistera
// (los mismos ids que PERSONALIDADES en index.html, no los viejos de gen-voces.py/Azure).
// Lee FRASES_ARQ directo de index.html (fuente de verdad real, evita catalogos
// desincronizados). Sale a voces-el/ con su propio manifest.json — NO toca voces/
// (catalogo Azure viejo, se deja intacto como respaldo).
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const BASE = path.dirname(__dirname);
const KEY = fs.readFileSync(path.join(BASE, 'MI-ELEVENLABS.txt'), 'utf8').trim();
const OUT = path.join(BASE, 'voces-el');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// picaro/sensible/directo/relator son arquetipos VIEJOS que ya no existen en PERSONALIDADES
// (quedaron huérfanos en FRASES_ARQ desde el rename del 2026-07-21) -> se excluyen a
// propósito: nadie puede elegirlos, generarles audio sería gastar plata en algo inalcanzable.
const VOZ = {
  l: { // Pistero (masculino)
    cercano:    '452WrNT9o8dphaYW5YGU', // Abel (voz base, "el de siempre")
    compadre:   '0cheeVA5B3Cv6DGq65cT', // Alejandro
    entrenador: 'qRUgOhnxGASxirG4fKjv', // David
    roquero:    '4XUsiqPDK4UACIM2BILe', // JC (reasignado de "relator")
    profe:      '57D8YIbQSuE3REDPO6Vm', // Horacio (reasignado de "guía")
    solitario:  '94zOad0g7T7K4oa7zhDq', // Mauricio (reasignado de "sensible")
    loco:       'tomkxGQGz4b1kE0EM722', // Mario (reasignado de "pícaro")
    cicletero:  'j7XQZUnVCfhpa94EsaJS', // Dipemo (reasignado de "directo")
    sabio:      '9TcPbUAhHnAV8mzFDAWU', // El Faraón
    relajado:   'dF1Qg3iMRirscWEMtEKb', // Diego Cárdenas
    aventurero: 'kKcRoM4gR6HLJt6Zupbs', // Mat Oyarzo
    maternal:   'yytxkT3pNVMWDHn3KXrY', // Rodrigo
    seductor:   'P6PQtQGB3yM21Aj1vGJ2', // Luis - Raspy, Seductive, Expressive (es-AR)
    otaku:      '4GeB1bS2GAHAsGRM0eeU', // Cesar Rodriguez - Young and Energetic (es-AR)
  },
  c: { // Pistera (femenino)
    cercano:    '2rigMbVWLdqtBSCahJFX', // Tatiana Martin (voz base, "la de siempre")
    compadre:   'Fd38GRHtJllY0CuguAy9', // Victoria
    entrenador: 'rEVYTKPqwSMhytFPayIb', // Sandra
    roquero:    'nbcvT3C2tyOd2OsRAtUf', // Maya
    profe:      '86V9x9hrQds83qf7zaGn', // Marcela
    solitario:  '9EU0h6CVtEDS6vriwwq5', // Verónica
    loco:       'qWWAqFomnJ99VwQLREfT', // Kate
    cicletero:  'x5IDPSl4ZUbhosMmVFTk', // Lumina
    sabio:      'eBthAb30UYbt2nojGXeA', // Regina
    relajado:   '2Lb1en5ujrODDIqmp7F3', // Jhenny
    aventurero: '9oPKasc15pfAbMr7N6Gs', // Valeria
    maternal:   'ajOR9IDAaubDK5qtLUqQ', // Daniela
    seductor:   'LudcwvHIZaqQOcQfVZSY', // Clara - Elegant, Sultry and Soft (es-ES)
    otaku:      'iFhPOZcajR7W3sDL39qJ', // Blackie - Girlish, Cute, and Cheerful (es-AR, anime)
  }
};
const LIVE_ARQ = Object.keys(VOZ.l);

function limpia(txt) {
  return txt.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
}

function extraerFrasesArq(html) {
  const marker = 'const FRASES_ARQ={';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('No se encontro FRASES_ARQ en index.html');
  let i = start + 'const FRASES_ARQ='.length, depth = 0, started = false, end = -1;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (c === '{') { depth++; started = true; }
    else if (c === '}') { depth--; if (started && depth === 0) { end = j + 1; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + html.slice(i, end) + ')');
}

function synth(voiceId, texto, dest) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      text: texto,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.8 }
    });
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: '/v1/text-to-speech/' + voiceId,
      method: 'POST',
      headers: {
        'xi-api-key': KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode === 200) {
          fs.writeFileSync(dest, buf);
          resolve({ ok: true });
        } else {
          resolve({ ok: false, code: res.statusCode, body: buf.toString('utf8').slice(0, 300) });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, code: 0, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, code: 0, body: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

async function synthConReintento(voiceId, texto, dest, log) {
  for (let intento = 1; intento <= 4; intento++) {
    const r = await synth(voiceId, texto, dest);
    if (r.ok) return true;
    if (r.code === 401) { log('AUTH ERROR (llave sin permiso o vencida): ' + r.body); return false; }
    if (r.code === 429 || r.code === 0) { await new Promise((res) => setTimeout(res, 4000 * intento)); continue; }
    if (r.code === 422 && /quota|credits/i.test(r.body)) { log('QUOTA AGOTADA: ' + r.body); return 'quota'; }
    log('ERROR ' + r.code + ' -> ' + r.body);
    return false;
  }
  return false;
}

// Frases de SISTEMA: mensajes fijos que Pistero dice todo el tiempo sin importar el
// arquetipo elegido (pausar/reanudar viaje, GPS, SOS, sensores, clima, voz/mic, etc.)
// Pedido de Inty (2026-08-14): "lo que mas se pregunte" no deberia caer a voz nativa
// solo por no ser parte de FRASES_ARQ. Sacadas literal del codigo (h('...'), hCorta('...'),
// hUrgente('...')) — deben calzar EXACTO con el texto real o el manifest no las va a
// encontrar en runtime. Usan la voz BASE (Abel/Tatiana), igual que el mensaje de
// bienvenida: no tienen sabor de arquetipo, son universales.
const FRASES_SISTEMA = [
  'Viaje en pausa. Cuando quieras seguir, toca Reanudar.',
  'Seguimos pedaleando.',
  'Listo, así te hablo de ahora en adelante.',
  'Cronómetro reiniciado. La distancia y el recorrido siguen intactos.',
  '¡Llegamos! Lo lograste. Que descanses esas piernas.',
  'Vas navegando. Para terminar el viaje usa el botón Terminar, así no se pierde tu ruta.',
  'Te desviaste del camino, dame un segundo que te recalculo.',
  'Por esta zona no tengo un camino claro marcado. Sigue no más, cualquier cosa te aviso.',
  'Vas más rápido que tu promedio de siempre, ¡buen ritmo!',
  'Vas más lento que tu ritmo habitual. Tranquilo, disfruta el camino.',
  'Manos libres activado. Dime "Pistero" y lo que necesites, sin tocar nada. Para callarme, di "cállate". Mantengo la pantalla encendida mientras te escucho; si la apagas a mano, dejo de oírte. Se apaga solo tras 12 min sin hablarme.',
  'Manos libres desactivado.',
  'Apagué el micrófono de manos libres porque llevabas rato sin usarlo, para cuidarte la batería. Actívalo de nuevo cuando quieras.',
  '¿A dónde vamos? Toca el micrófono y dime solo el lugar.',
  'No te escuché bien. Toca el micrófono y dime tu destino de nuevo.',
  'Detecté un golpe fuerte. Toca "Estoy bien" si estás bien, o preparo el SOS.',
  'Qué bueno que estás bien. Sigo grabando tu ruta.',
  'Ubicando tu posicion para el SOS, un segundo...',
  'Listo: avisamos a los ciclistas de tu zona, sin tu ubicacion exacta ni tu nombre. Si estas en peligro, llama tambien al 133.',
  'Alerta lista. Toca a quién quieres avisar.',
  'Pulsómetro conectado.',
  'Potenciómetro conectado.',
  'Sensores Bluetooth desconectados.',
  'Necesito tu ubicación para buscar la historia de este lugar — activa el GPS y pregúntame de nuevo.',
  'Dame un segundo, busco algo interesante de por aquí...',
  'Necesito saber dónde estás para el clima — activa el GPS, o dime el lugar, y pregúntame de nuevo.',
  'No pude traer el clima ahora mismo, prueba de nuevo en un rato.',
  'El mapa todavía no está listo, prueba de nuevo en un momento.',
  'Aquí va el sobrevuelo de tu viaje.',
  'Listo, guardé tu ruta.',
  'Ruta exportada en GPX. Súbela a Strava, Komoot o Wikiloc.',
  'Copié tu viaje al portapapeles. Pégalo donde quieras.',
  'No pude guardar la ruta — parece que no hay suficientes puntos grabados todavía.',
  'Todavía no tienes un viaje en curso para guardar. Activa el GPS o empieza a navegar primero.',
  'La voz solo funciona desde la página publicada.',
  'En la app escríbeme la pregunta aquí abajo; la voz funciona en Chrome.',
  'Se nota que bajaste harto el ritmo respecto a como arrancaste. Si puedes, date un respiro corto, toma agua y sigue con calma.',
  'Aquí está la esfera de aplicaciones.',
  'Activa el GPS para empezar a grabar tu ruta.',
  'Dejé de compartir tu ubicación en vivo. Ese link ya no sirve — la próxima vez que compartas te doy uno nuevo.',
];

async function main() {
  const html = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
  const FRASES_ARQ = extraerFrasesArq(html);

  // ID estable por CONTENIDO (hash de la frase), no por posición en la iteración.
  // Antes era un contador secuencial (nid++): agregar un arquetipo nuevo en medio de
  // FRASES_ARQ corria los ids de TODAS las frases que venian despues, y el chequeo de
  // "ya existe, no regenerar" (por nombre de archivo) las daba por buenas aunque el
  // audio de esa ruta fuera en realidad el de OTRA frase. Con hash, la MISMA frase
  // siempre cae en el MISMO archivo sin importar que se agregue/saque texto en otro lado.
  function idFor(fr) { return crypto.createHash('sha1').update(fr).digest('hex').slice(0, 10); }

  const manifest = {};
  const tareas = [];
  for (const cat of Object.keys(FRASES_ARQ)) {
    for (const arq of Object.keys(FRASES_ARQ[cat])) {
      if (!LIVE_ARQ.includes(arq)) continue; // salta huerfanos (picaro/sensible/directo/relator)
      const frases = FRASES_ARQ[cat][arq];
      for (const fr of frases) {
        if (manifest[fr]) continue; // frase repetida entre categorias (no deberia pasar, por si acaso)
        const fid = idFor(fr);
        manifest[fr] = fid;
        tareas.push({ fid, texto: limpia(fr), arq });
      }
    }
  }
  for (const fr of FRASES_SISTEMA) {
    if (manifest[fr]) continue;
    const fid = idFor(fr);
    manifest[fr] = fid;
    tareas.push({ fid, texto: limpia(fr), arq: 'cercano' }); // voz base, sin sabor de arquetipo
  }

  const logPath = path.join(OUT, 'gen.log');
  const log = (s) => { const line = '[' + new Date().toISOString() + '] ' + s; console.log(line); fs.appendFileSync(logPath, line + '\n'); };

  log('Frases a generar: ' + tareas.length + ' x 2 generos = ' + (tareas.length * 2) + ' archivos');

  let ok = 0, fallo = 0, saltado = 0;
  for (const genero of ['l', 'c']) {
    for (const t of tareas) {
      const dest = path.join(OUT, genero + t.fid + '.mp3');
      if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) { saltado++; continue; } // resumible
      const voiceId = VOZ[genero][t.arq];
      const r = await synthConReintento(voiceId, t.texto, dest, log);
      if (r === 'quota') { log('DETENIDO por cuota agotada en ' + genero + t.fid); ok_write(); process.exit(2); }
      if (r) { ok++; } else { fallo++; }
      log((r ? 'OK  ' : 'FAIL') + ' ' + genero + t.fid + ' [' + t.arq + '] ' + t.texto.slice(0, 50));
      await new Promise((res) => setTimeout(res, 350));
    }
  }
  function ok_write() {
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ voces: ['l', 'c'], map: manifest }, null, 0), 'utf8');
  }
  ok_write();
  log('LISTO. ok=' + ok + ' fallo=' + fallo + ' saltado=' + saltado + ' frases=' + Object.keys(manifest).length + ' -> voces-el/manifest.json');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
