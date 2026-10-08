// Recorta UNA vez las capas de Gemini de cada modelo de Pistero y las guarda en pistero-modelos/img/.
// Usa la MISMA función de recorte de cada modelo (corre en Chrome sin ventana), así el resultado es idéntico al que
// el teléfono calculaba al abrir cada modelo; en la app ya no se recorta nada (era un tirón al aparecer).
// Uso:  node herramientas/pistero-modelos/recortar.mjs        (requiere `npm i --no-save playwright-core` y Chrome)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ORIG = 'herramientas/pistero-modelos/originales/';
const SALIDA = path.join(raiz, 'pistero-modelos/img');
// modelo: [función que arma el modelo, capa que se recorta como casco, otra capa (recortada o tal cual)]
const MODELOS = {
  ciber: ['crearCiberCapas', 'ciber-capa-casco.jpg', 'ciber-capa-cabeza.jpg'],
  orbe: ['crearOrbeCapas', 'capa-casco.jpg', 'capa-orbe.jpg'],
  slime: ['crearSlimeCapas', 'slime-capa-casco.jpg', 'slime-capa-cuerpo.jpg'],
  vinilo: ['crearViniloCapas', 'vinilo-capa-casco.jpg', 'vinilo-capa-cabeza.jpg'],
};
const tipos = { '.js': 'text/javascript', '.jpg': 'image/jpeg', '.html': 'text/html' };
const srv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(raiz) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const base = `http://localhost:${srv.address().port}/`;
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
fs.mkdirSync(SALIDA, { recursive: true });
try {
  const p = await b.newPage(); await p.goto(base + 'pistero-modelos/ciber-capas.js');
  for (const [id, [fn, casco, otra]] of Object.entries(MODELOS)) {
    await p.setContent('<div id="m" style="width:300px;height:300px"></div>');
    await p.addScriptTag({ url: base + `pistero-modelos/${id}-capas.js` });
    // se envuelve la función de recorte del modelo para guardar lo que devuelve, con el nombre de la capa de entrada
    const hechas = await p.evaluate(async ([fn, a, c]) => { const out = {};
      for (const n of ['_recortarCiber', '_recortarVerde', '_recortarFondo', '_recortarCapa']) { if (typeof window[n] !== 'function') continue; const orig = window[n];
        window[n] = function (url) { return orig.apply(this, arguments).then((r) => { out[url.split('/').pop()] = r; return r; }); }; }
      await window[fn](document.getElementById('m'), a, c); return out; }, [fn, base + ORIG + casco, base + ORIG + otra]);
    for (const [orig, dataUrl] of Object.entries(hechas)) { const nombre = orig.replace('.jpg', '.png');
      fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(dataUrl.split(',')[1], 'base64')); console.log(id, orig, '->', nombre); }
    if (!hechas[casco]) throw new Error(id + ': no se recortó el casco');
  }
} finally { await b.close(); srv.close(); }
