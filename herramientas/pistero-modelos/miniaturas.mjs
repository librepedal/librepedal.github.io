// Genera las miniaturas FIJAS de los modelos por capas (pistero-modelos/img/mini-<id>-<estado>.png), con fondo
// transparente, desde el modelo real. Las usan los lugares chicos de la app (chip de usuario, barra de abajo, título
// de "Pregúntale a Pistero", tarjetas de "Elige tu Pistero"): ahí una animación por capas no se nota y cuesta batería.
// El Clásico y el Casco vivo son SVG: no necesitan miniatura.
// Uso: node herramientas/pistero-modelos/miniaturas.mjs   (playwright-core + Chrome instalado)
//   PLAYWRIGHT_CORE=<ruta a node_modules/playwright-core> si no está en este repo.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pw = process.env.PLAYWRIGHT_CORE ? await import(pathToFileURL(path.join(process.env.PLAYWRIGHT_CORE, 'index.mjs')).href) : await import('playwright-core');
const { chromium } = pw;
const tipos = { '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.html': 'text/html; charset=utf-8', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const base = `http://localhost:${srv.address().port}/`;
const MODELOS = ['ciber', 'orbe', 'slime', 'vinilo'];
const ESTADOS = ['reposo', 'feliz', 'hablar'];
const LADO = 192; // px de la miniatura (se ve a 28-60 px: alcanza para pantallas de densidad 3x)
const b = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const errs = [];
try {
  const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + 'herramientas/pistero-modelos/comparar.html');
  await p.addStyleTag({ content: `html,body{background:transparent!important}.c{width:${LADO}px;height:${LADO}px}` });
  for (const id of MODELOS) {
    for (const est of ESTADOS) {
      await p.evaluate(async ([id, est]) => {
        document.body.innerHTML = ''; const A = document.createElement('div'); A.className = 'c'; A.id = 'm'; document.body.appendChild(A);
        const api = await PistModelos.crear(A, id); api.poner(est);
      }, [id, est]);
      await p.waitForTimeout(1800); // que la animación llegue a la pose del estado
      const dest = path.join(raiz, 'pistero-modelos', 'img', `mini-${id}-${est}.png`);
      await (await p.$('#m')).screenshot({ path: dest, omitBackground: true });
      console.log('ok', path.relative(raiz, dest), fs.statSync(dest).size, 'bytes');
    }
  }
  if (errs.length) { console.error('errores en la página:', errs); process.exitCode = 1; }
} finally { await b.close(); srv.close(); }
