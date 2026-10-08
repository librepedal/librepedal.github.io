// Captura una página con Chrome headless vía CDP (sin dependencias): node cdp-captura.mjs <url> <salida.png> <ancho> <alto> <dpr>
import { spawn } from 'node:child_process'; import fs from 'node:fs';
const [url, salida, W = '390', H = '693', DPR = '2.7692'] = process.argv.slice(2);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9333', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--hide-scrollbars', `--window-size=${W},${H}`, '--user-data-dir=' + process.env.TEMP + '/cdp-prof-lp', 'about:blank'], { stdio: 'ignore' });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ws; for (let i = 0; i < 40; i++) { try { const l = await (await fetch('http://127.0.0.1:9333/json')).json(); const p = l.find((t) => t.type === 'page'); if (p) { ws = p.webSocketDebuggerUrl; break; } } catch {} await esperar(250); }
const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
let id = 0; const pend = {}; sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } });
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
await cmd('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: +DPR, mobile: true });
await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Page.navigate', { url });
let titulo = ''; for (let i = 0; i < Number(process.env.VUELTAS||240); i++) { const r = await cmd('Runtime.evaluate', { expression: 'document.title' }); titulo = r.result.result.value || ''; if (titulo.startsWith('OK')) break; await esperar(500); }
await esperar(Number(process.env.EXTRA||1500)); const dbg=await cmd("Runtime.evaluate",{expression:"JSON.stringify({p:typeof map!==\"undefined\"&&map.getPitch(),z:typeof map!==\"undefined\"&&map.getZoom(),pos:(document.getElementById(\"pos\")||{}).textContent,gl:!!document.createElement(\"canvas\").getContext(\"webgl2\")})"}); console.log(dbg.result.result.value);
const shot = await cmd('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(salida, Buffer.from(shot.result.data, 'base64'));
console.log(titulo); sock.close(); chrome.kill(); process.exit(0);
