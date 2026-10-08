// Compara cada modelo por capas armado como en la app (capas ya recortadas, .webp) contra el de antes (originales de Gemini
// recortados en el momento): misma pose ("dormir"), captura de cada uno y PSNR con ffmpeg. También mide cuánto tarda en aparecer.
// Uso: node herramientas/pistero-modelos/comparar.mjs   (playwright-core + Chrome; ffmpeg-static para el PSNR)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process'; import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'pm-'));
const tipos = { '.js': 'text/javascript', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.html': 'text/html; charset=utf-8' };
const srv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const base = `http://localhost:${srv.address().port}/`;
const O = { ciber: ['crearCiberCapas', 'ciber-capa-casco', 'ciber-capa-cabeza'], orbe: ['crearOrbeCapas', 'capa-casco', 'capa-orbe'], slime: ['crearSlimeCapas', 'slime-capa-casco', 'slime-capa-cuerpo'], vinilo: ['crearViniloCapas', 'vinilo-capa-casco', 'vinilo-capa-cabeza'] };
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const out = {}, errs = [];
try {
  for (const lado of ['app', 'antes']) {
    const p = await b.newPage({ viewport: { width: 1100, height: 700 } }); p.on('pageerror', (e) => errs.push(lado + ': ' + e.message));
    await p.goto(base + 'herramientas/pistero-modelos/comparar.html');
    for (const [id, [fn, c1, c2]] of Object.entries(O)) {
      const ms = await p.evaluate(async ([lado, id, fn, c1, c2, base]) => {
        const A = document.createElement('div'); A.className = 'c'; A.id = 'a-' + id; document.body.appendChild(A); const t0 = performance.now();
        if (lado === 'app') { const api = await PistModelos.crear(A, id); api.poner('dormir'); }
        else { if (typeof window[fn] !== 'function') { const s = document.createElement('script'); s.src = base + 'pistero-modelos/' + id + '-capas.js'; await new Promise((ok) => { s.onload = ok; document.head.appendChild(s); }); }
          const o = base + 'herramientas/pistero-modelos/originales/'; const a = await window[fn](A, o + c1 + '.jpg', o + c2 + '.jpg'); a.estado('dormir'); }
        return Math.round(performance.now() - t0); }, [lado, id, fn, c1, c2, base]);
      (out[id] ||= {})[lado + 'Ms'] = ms;
    }
    await p.waitForTimeout(2500);
    for (const id of Object.keys(O)) await (await p.$('#a-' + id)).screenshot({ path: path.join(tmp, `${lado}-${id}.png`) });
    await p.close();
  }
  const ff = createRequire(import.meta.url)('ffmpeg-static');
  for (const id of Object.keys(O)) { const r = spawnSync(ff, ['-i', path.join(tmp, `app-${id}.png`), '-i', path.join(tmp, `antes-${id}.png`), '-lavfi', 'psnr', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    out[id].psnr = +((r.match(/average:([\d.]+|inf)/) || [])[1] || 0); }
  console.log(JSON.stringify(out), 'capturas en', tmp, 'errores', JSON.stringify(errs));
} finally { await b.close(); srv.close(); }
