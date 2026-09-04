// Voz gratis para el tier free (worker-ia/worker.js), 2026-09-03.
// Por qué existe: decisión de producto de Inty tras medir el costo real de ElevenLabs
// (~US$0,51/usuario/mes en agosto) -- el tier free necesita sonar bien (no robótico) pero
// SIN ese costo. La vía elegida (confirmada por Inty: "dos voces, masculina/femenina") es
// Microsoft Edge TTS: gratis, sin key, sin restricción de ToS con este proyecto (a
// diferencia de clonar el output de ElevenLabs en otro motor, que SÍ viola su Prohibited
// Use Policy -- ver el hallazgo de esa conversación). Voces reales confirmadas en
// es-CL: LorenzoNeural (masculina) / CatalinaNeural (femenina) -- mismos nombres que ya
// usa Pistero/Pistera en la app, coincidencia útil.
// Protocolo portado de github.com/DIYgod/cloudflare-edge-tts (probado funcionando en el
// runtime real de Cloudflare Workers), no reinventado de memoria -- Microsoft no publica
// este protocolo oficialmente y cambia detalles sin avisar.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER = readFileSync(join(raiz, 'worker-ia', 'worker.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

t('las dos voces son las reales de Microsoft en español chileno',
  /EDGE_VOZ = \{ l: "es-CL-LorenzoNeural", c: "es-CL-CatalinaNeural" \}/.test(WORKER));
t('usa el endpoint real de sintesis de Microsoft (no inventado)',
  /https:\/\/speech\.platform\.bing\.com\/consumer\/speech\/synthesize\/readaloud\/edge\/v1/.test(WORKER));
t('el token de cliente confiable es el real y estable usado por implementaciones probadas',
  /EDGE_TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4"/.test(WORKER));

// --- El endpoint existe y con el nombre esperado ---
const iEndpoint = WORKER.indexOf('const edgeText = url.searchParams.get("edgetts")');
t('existe el endpoint ?edgetts=', iEndpoint > 0);

const bloqueEndpoint = WORKER.slice(iEndpoint, WORKER.indexOf('// ===== GEOCODING'));
t('respeta el limite por IP (mismo anti-abuso que el resto del worker)',
  /_limiteIP\(env, clientIP\)/.test(bloqueEndpoint));
t('NO toca el presupuesto de caracteres de ElevenLabs (es gratis, no debe contar contra ese candado)',
  !/_presupuestoDiario|_presupuestoMensual\(/.test(bloqueEndpoint));
t('default de genero es "l" (Lorenzo) si no se especifica, igual que el resto de la app',
  /gEdge = \(url\.searchParams\.get\("g"\) === "c"\) \? "c" : "l"/.test(bloqueEndpoint));

// --- Reusa el MISMO caché permanente en KV que la voz paga (no reinventa uno nuevo) ---
t('usa _claveCachePermanente (el mismo mecanismo que ya protege el gasto de ElevenLabs)',
  /_claveCachePermanente\(tEdge, voiceName, "edge-tts"/.test(bloqueEndpoint));
t('un hit de cache responde sin llamar a Microsoft (return directo)',
  /return respCache;/.test(bloqueEndpoint));
t('tras generar, se guarda en KV para la proxima vez (aunque ya sea gratis, evita depender de Microsoft en cada repeticion)',
  /env\.VOZ_CUOTA\.put\(cacheKeyEdge, buf\)/.test(bloqueEndpoint));

// --- La conexión sigue el protocolo real: WebSocket upgrade vía fetch (patrón nativo de
//     Cloudflare Workers, no window.WebSocket que no existe en el runtime de Workers) ---
t('usa fetch() con Upgrade:websocket (patrón correcto para Workers, no "new WebSocket()")',
  /Upgrade: "websocket"/.test(WORKER) && !/new WebSocket\(/.test(WORKER));
t('verifica el status 101 + .webSocket antes de usarlo (no asume que la conexión funcionó)',
  /resp\.status !== 101 \|\| !resp\.webSocket/.test(WORKER));
t('acepta la conexión explícitamente (ws.accept(), requerido por el runtime de Workers)',
  /ws\.accept\(\)/.test(WORKER));

// --- Manda los DOS mensajes que exige el protocolo real: speech.config antes que el ssml ---
const iSynth = WORKER.indexOf('async function _edgeSynth');
const bloqueSynth = WORKER.slice(iSynth, WORKER.indexOf('export default'));
const iConfig = bloqueSynth.indexOf('ws.send(speechConfig)');
const iSsml = bloqueSynth.indexOf('ws.send(ssml)');
t('manda speech.config ANTES que el ssml (el orden importa en el protocolo real)',
  iConfig > 0 && iSsml > 0 && iConfig < iSsml);
t('el SSML escapa el texto (evita romper el XML con caracteres especiales del usuario)',
  /_edgeEscapeXml\(text\)/.test(bloqueSynth));

// --- Cierra la conexión al recibir turn.end, no la deja colgada ---
t('cierra el WebSocket al recibir turn.end (no lo deja abierto indefinidamente)',
  /Path:turn\.end/.test(bloqueSynth) && /ws\.close\(\)/.test(bloqueSynth));
t('tiene un timeout real (no espera para siempre si Microsoft no responde)',
  /setTimeout\(\(\) => \{ try \{ ws\.close\(\); \} catch \(e\) \{\} reject\(new Error\("edge_timeout"\)\); \}, 15000\)/.test(bloqueSynth));

console.log(`  voz-edge-tts-free.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
