// Prueba de punta a punta del video del sobrevuelo en Chrome sin ventana (no depende de que el navegador esté a la vista:
// con la ventana oculta requestAnimationFrame se detiene y el mapa no carga). Sin Firebase: usa arnes.html.
// Uso:  node disenos-ui/sobrevuelo-video/servir-guardar.mjs 5180   (en otra terminal)
//       node disenos-ui/sobrevuelo-video/probar-video.mjs [salida.mp4]
// Abre el sobrevuelo con la ruta de prueba Futrono → Llifén, va al resumen, toca "Crear video para redes", espera el MP4,
// lo guarda en disenos-ui/sobrevuelo-video/ y saca capturas de cada estado (creando, listo).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = process.argv[2] || 'video-prueba.mp4';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const perfil = mkdtempSync(join(tmpdir(), 'lp-video-'));
const puerto = 9333;
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + puerto, '--user-data-dir=' + perfil, '--window-size=390,844',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
async function conectar() {
  for (let k = 0; k < 50; k++) { try { const l = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json(); const p = l.find((x) => x.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) {} await espera(200); }
  throw new Error('Chrome no respondió');
}
function cdp(method, params = {}) { return new Promise((ok, mal) => { const i = ++id; pend.set(i, { ok, mal }); ws.send(JSON.stringify({ id: i, method, params })); }); }
async function ev(expr, ms = 60000) {
  const r = await Promise.race([cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }), espera(ms).then(() => ({ timeout: true }))]);
  if (r.timeout) throw new Error('tiempo agotado: ' + expr.slice(0, 80));
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}
async function foto(nombre) { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(aqui, nombre), Buffer.from(r.data, 'base64')); }
try {
  ws = new WebSocket(await conectar());
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.mal(new Error(d.error.message)) : p.ok(d.result); } else if (d.method === 'Runtime.consoleAPICalled' && /warn|error/.test(d.params.type)) console.log('  [consola]', d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300)); });
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp('Page.navigate', { url: 'http://localhost:5180/disenos-ui/sobrevuelo-video/arnes' });
  const t0 = Date.now();
  await ev(`(async()=>{ for(let i=0;i<240;i++){ const c=document.getElementById('sb3-cargando'); if(c&&c.style.display==='none'&&document.querySelector('#sb3 .cara-mk')) return true; await new Promise(r=>setTimeout(r,500)); } throw new Error('el sobrevuelo no cargó'); })()`, 130000);
  console.log('sobrevuelo abierto en', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await ev(`(async()=>{ __sb3test.dbg._fin(); await new Promise(r=>setTimeout(r,2500)); return document.getElementById('sb3-video').textContent; })()`);
  await foto('estado-resumen.png');
  const t1 = Date.now();
  await ev(`(document.getElementById('sb3-video').click(), true)`);
  await espera(6000); await foto('estado-creando.png');
  console.log('  avance:', await ev(`document.getElementById('sb3-vidPct')&&document.getElementById('sb3-vidPct').textContent`));
  const fin = await ev(`(async()=>{ for(let i=0;i<1800;i++){ const v=document.getElementById('sb3-vid'); if(v&&!document.getElementById('sb3-vidPct')) return v.innerText; await new Promise(r=>setTimeout(r,500)); } throw new Error('no terminó en 15 min'); })()`, 16 * 60000);
  console.log('terminó en', ((Date.now() - t1) / 1000).toFixed(1), 's →', fin.replace(/\s+/g, ' '));
  await foto('estado-listo.png');
  const r = await ev(`(async()=>{ const f=__sb3test.videoArchivo(); if(!f) return 'sin archivo'; const t=await (await fetch('/guardar?nombre=${salida}',{method:'POST',body:f})).text(); return f.name+' '+f.type+' '+f.size+' → '+t; })()`);
  console.log('archivo:', r);
} catch (e) { console.error('FALLÓ:', e.message); process.exitCode = 1; }
finally { try { ws && ws.close(); } catch (e) {} ch.kill(); }
