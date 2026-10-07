// Voces que se pisan NAVEGANDO (reporte repetido de Inty; 2026-10-07: "las voces se pisan navegando, no quiero errores").
// Corre el motor de voz REAL (voz-elevenlabs.js + voz-motor.js) en un navegador simulado con reloj virtual:
// audios que tardan en cargar (señal débil pedaleando), que fallan, que se cortan, y frases que llegan en
// cualquier momento con cualquier prioridad. Regla única: NUNCA pueden sonar dos voces a la vez.
// El simulador imita al navegador real donde importa:
//  - pause() sobre un audio cuyo play() aún no arrancó RECHAZA esa promesa con AbortError (Chrome/Android WebView)
//  - speechSynthesis.cancel() dispara onerror('interrupted') en la frase cortada, de forma asíncrona
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_EL = readFileSync(join(raiz, 'voz-elevenlabs.js'), 'utf8');
const SRC = readFileSync(join(raiz, 'voz-motor.js'), 'utf8');
let ok = 0, fail = 0;
const t = (n, c, extra) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n + (extra ? '\n    ' + extra : '')); } };

function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const tick = () => new Promise((r) => setImmediate(r));

// Un "teléfono" nuevo con el motor de voz cargado. red(url) → {lat: ms de carga, dur: ms de audio, error: bool}
async function telefono(red) {
  let ahora = 0, sig = 1; const timers = new Map();
  const setT = (fn, ms) => { const id = sig++; timers.set(id, { at: ahora + Math.max(0, ms || 0), fn }); return id; };
  const clrT = (id) => { timers.delete(id); };
  const suena = new Set(), pisadas = [], escuchado = [];
  const empezar = (quien) => { suena.add(quien); escuchado.push({ t: ahora, que: quien.etiqueta }); if (suena.size > 1) pisadas.push({ t: ahora, a_la_vez: [...suena].map((x) => x.etiqueta) }); };
  class AudioFalso {
    constructor(url) { this.src = url || ''; this.paused = true; this.duration = NaN; this.playbackRate = 1; this.etiqueta = decodeURIComponent(this.src).replace(/^.*[?&](eltts|gtts|edgetts|aztts)=/, '$1:').slice(0, 40); this.preload = ''; this.volume = 1; }
    play() {
      if (!this.src) return Promise.resolve();
      this.paused = false; this._ini = false;
      const r = red(this.src);
      const p = new Promise((res, rej) => { this._res = res; this._rej = rej; });
      this._carga = setT(() => {
        if (this.paused) return;
        if (r.error) { this.paused = true; const e = new Error('no carga'); e.name = 'NotSupportedError'; this._rej(e); if (this.onerror) this.onerror(e); return; }
        this.duration = r.dur / 1000; if (this.onloadedmetadata) this.onloadedmetadata();
        this._ini = true; this._res(); if (this.onplaying) this.onplaying(); empezar(this);
        this._fin = setT(() => { if (this.paused) return; this.paused = true; suena.delete(this); if (this.onended) this.onended(); }, r.dur / (this.playbackRate || 1));
      }, r.lat);
      return p;
    }
    pause() {
      if (this.paused) return; this.paused = true; clrT(this._carga); clrT(this._fin); suena.delete(this);
      if (!this._ini) { const e = new Error('The play() request was interrupted by a call to pause()'); e.name = 'AbortError'; this._rej(e); }
    }
    addEventListener() {} removeEventListener() {}
  }
  const tts = {
    actual: null,
    speak(u) { if (this.actual) this.cancel(); this.actual = u; u.etiqueta = 'nativa:' + u.text.slice(0, 30); empezar(u);
      u._fin = setT(() => { if (this.actual !== u) return; this.actual = null; suena.delete(u); if (u.onend) u.onend({}); }, u.text.length * 70); },
    cancel() { const u = this.actual; if (!u) return; this.actual = null; suena.delete(u); clrT(u._fin); setT(() => { if (u.onerror) u.onerror({ error: 'interrupted' }); }, 0); },
    getVoices: () => [], onvoiceschanged: null,
  };
  const el = () => ({ classList: { add() {}, remove() {}, contains: () => false, toggle() {} }, style: {}, appendChild() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [] });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} }, Math, JSON, Object, Array, String, Number, RegExp, Date, Promise, Error, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, AbortController,
    setTimeout: setT, clearTimeout: clrT, setInterval: () => 0, clearInterval() {},
    Audio: AudioFalso, SpeechSynthesisUtterance: function (x) { this.text = x; },
    speechSynthesis: tts, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { onLine: true, vibrate() {} }, location: { search: '', href: '' },
    fetch: () => Promise.reject(new Error('sin red en la prueba')),
    document: { hidden: false, getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, createElement: el, body: el(), addEventListener() {} },
    // lo que en la app definen otros archivos (pistero-personalidad.js, index.html)
    PERSONALIDAD_PROSODIA: { cercano: { rate: '0%', pitch: '0%' } }, pisteroPersonalidad: 'cercano', _rateArq: () => 1,
    paisFrases: () => 'cl', IA_URL: 'https://ia.test', micOn: false, vozActiva: true, vozPref: null, us: {},
  };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC_EL, ctx, { filename: 'voz-elevenlabs.js' });
  vm.runInContext(SRC, ctx, { filename: 'voz-motor.js' });
  await tick();
  const correrHasta = async (fin) => {
    for (;;) {
      await tick();
      let prox = null; for (const [id, x] of timers) if (x.at <= fin && (!prox || x.at < prox[1].at || (x.at === prox[1].at && id < prox[0]))) prox = [id, x];
      if (!prox) { ahora = fin; await tick(); return; }
      timers.delete(prox[0]); ahora = prox[1].at; try { prox[1].fn(); } catch (e) { /* un error de un callback no detiene el teléfono */ }
    }
  };
  const ev = (code) => vm.runInContext(code, ctx);
  return { ctx, ev, correrHasta, pisadas, escuchado, ahora: () => ahora, suena };
}

// ---------- 1) el caso exacto de navegar con señal débil ----------
// Frase A en vivo tarda 15 s en cargar (> 12 s de espera del motor): el motor la abandona. Si el aviso tardío
// (AbortError) de A dispara su respaldo, A suena DESPUÉS, encima de lo que venga.
{
  const lento = new Set(['Gira a la derecha en 200 metros']);
  const T = await telefono((url) => {
    const u = decodeURIComponent(url);
    if ([...lento].some((x) => u.includes(x)) && u.includes('eltts=')) return { lat: 15000, dur: 2500 };
    return { lat: 400, dur: 2500 };
  });
  T.ev("h('Gira a la derecha en 200 metros', PRIO_VOZ.NAV)");
  await T.correrHasta(13000);
  T.ev("h('Vas a 18 kilómetros por hora', PRIO_VOZ.INFO)");
  await T.correrHasta(40000);
  t('señal débil: la frase abandonada no vuelve a sonar encima de la siguiente', T.pisadas.length === 0, JSON.stringify(T.pisadas));
}
// misma idea, con la cola ya cargada cuando el motor abandona la frase lenta
{
  const T = await telefono((url) => (decodeURIComponent(url).includes('eltts=Primera') ? { lat: 14000, dur: 2000 } : { lat: 300, dur: 2000 }));
  T.ev("h('Primera frase', PRIO_VOZ.NAV); h('Segunda frase', PRIO_VOZ.NAV)");
  await T.correrHasta(40000);
  t('señal débil con cola: nunca dos voces a la vez', T.pisadas.length === 0, JSON.stringify(T.pisadas));
}
// la voz en vivo falla y cae a la nativa; luego algo corta la nativa (onerror 'interrupted' llega tarde)
{
  const T = await telefono(() => ({ error: true }));
  T.ev("h('Uno uno uno uno', PRIO_VOZ.INFO)");
  await T.correrHasta(500);
  T.ev("h('Peligro, auto detenido adelante', PRIO_VOZ.SEGURIDAD)");
  await T.correrHasta(3000);
  T.ev("h('Dos dos dos', PRIO_VOZ.INFO)");
  await T.correrHasta(30000);
  t('nativa cortada: su "interrupted" tardío no adelanta la cola ni deja dos voces', T.pisadas.length === 0, JSON.stringify(T.pisadas));
}

// ---------- 2) navegación simulada: 800 viajes con red al azar, por los 4 caminos de voz ----------
// 0 = voz en vivo (ElevenLabs) · 1 = con frases pregrabadas (voces-el/) · 2 = voz gratis (Google, premium activo)
// 3 = voz mejorada apagada (solo la del navegador/teléfono)
const VIAJES = Number(process.env.VIAJES || 800);
let viajesConPisadas = 0, ejemplo = null, totalFrases = 0, escuchadas = 0;
for (let semilla = 1; semilla <= VIAJES; semilla++) {
  const R = mulberry(semilla);
  const T = await telefono(() => {
    const x = R();
    if (x < 0.08) return { error: true, lat: 200 + R() * 4000 };
    const lat = x < 0.7 ? 150 + R() * 1500 : x < 0.9 ? 1500 + R() * 8000 : 9000 + R() * 16000; // 10 %: señal muy débil
    return { lat, dur: 1200 + R() * 5000 };
  });
  const camino = semilla % 4;
  if (camino === 1) T.ev("VOCES_MANIFEST_EL={map:{}}; for(let i=0;i<25;i+=2) VOCES_MANIFEST_EL.map['Frase '+i]=i;");
  if (camino === 2) T.ev('GATE_PREMIUM_ACTIVO=true');
  if (camino === 3) T.ev('vozMejorada=false');
  const P = ['AMBIENTE', 'INFO', 'INFO', 'NAV', 'NAV', 'SEGURIDAD'];
  let tt = 0;
  for (let i = 0; i < 25; i++) {
    tt += R() < 0.3 ? R() * 800 : 500 + R() * 9000; // a veces dos avisos casi juntos
    await T.correrHasta(tt);
    const pr = P[Math.floor(R() * P.length)];
    if (R() < 0.04) T.ev('pararVoz()'); // el usuario apaga/corta la voz
    const txt = camino === 1 && i % 2 === 0 ? 'Frase ' + i : `Frase ${i} ${'x'.repeat(5 + Math.floor(R() * 60))}`;
    T.ev(`h(${JSON.stringify(txt)}, PRIO_VOZ.${pr})`); totalFrases++;
  }
  await T.correrHasta(tt + 120000);
  escuchadas += T.escuchado.length;
  if (T.pisadas.length) { viajesConPisadas++; if (!ejemplo) ejemplo = { semilla, camino, primera: T.pisadas[0] }; }
  const quieto = T.ev('vozHablando') === false && T.suena.size === 0;
  if (!quieto) t('viaje ' + semilla + ': al final el motor queda en silencio (no pegado)', false);
}
t(VIAJES + ' viajes con señal al azar (4 caminos de voz): ninguna voz encima de otra', viajesConPisadas === 0,
  viajesConPisadas + ' viajes con voces encima; ej.: ' + JSON.stringify(ejemplo));
t('el motor sigue hablando (no se calló de más para evitar choques): ' + escuchadas + ' de ' + totalFrases, escuchadas > totalFrases * 0.4);

console.log(`  ${ok}/${ok + fail} pruebas de voces sin pisarse`);
process.exit(fail ? 1 : 0);
