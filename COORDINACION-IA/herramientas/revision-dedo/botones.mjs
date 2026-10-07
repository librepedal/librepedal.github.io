// Toca CADA botón de cada pantalla (dedo real) y anota qué pasó. Producción bloqueada; ventanas de confirmación se CANCELAN
// (nada se borra ni se envía); tel:/sms:/mailto: y ventanas externas se bloquean. Sesión de prueba solo en este navegador.
// Uso: node COORDINACION-IA/herramientas/revision-dedo/botones.mjs <carpeta del repo> [vistas...]  → botones-<carpeta>.json
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const raiz = path.resolve(process.argv[2]);
const VISTAS = process.argv.length > 3 ? process.argv.slice(3) : ['dash', 'customize', 'chat', 'pistero', 'trips', 'ajustes', 'stats', 'diario', 'rec', 'novedades', 'mac', 'gui', 'musica', 'newtrip'];
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
const puerto = 6000 + Math.floor(Math.random() * 300);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(raiz, p); if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(puerto);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const salida = [];
let ctx, p, cdp, errs = [], red = [], dialogos = [];
async function abrir() {
  if (ctx) await ctx.close();
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', isMobile: true, hasTouch: true, permissions: [] });
  await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith(`http://localhost:${puerto}`) || /unpkg|cdnjs|gstatic\.com\/firebasejs|fonts\.g|tile|openfreemap|arcgis|mapterhorn/.test(u)) return r.continue(); red.push(new URL(u).host); return r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('lp_voz', 'off'); window.open = function (u) { window.__abrio = (window.__abrio || []).concat(String(u)); return null; }; } catch (e) {} });
  p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error' && !/net::|Failed to load|ERR_|status of 4|status of 5|Could not reach Cloud Firestore|@firebase/.test(m.text())) errs.push('console: ' + m.text().slice(0, 140)); });
  p.on('dialog', async (d) => { dialogos.push(d.type() + ': ' + d.message().slice(0, 70)); try { await d.dismiss(); } catch (e) {} });
  p.on('popup', async (w) => { dialogos.push('ventana externa: ' + w.url().slice(0, 60)); try { await w.close(); } catch (e) {} });
  cdp = await ctx.newCDPSession(p);
  await p.goto(`http://localhost:${puerto}/index.html`); await p.waitForTimeout(4500);
  await p.evaluate(() => { document.documentElement.classList.remove('lp-sin-sesion'); const a = document.getElementById('auth'); if (a) a.style.display = 'none'; try { cu = 'prueba-local'; } catch (e) {} });
}
const estado = () => p.evaluate(() => {
  const vis = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 40 && r.height > 40; };
  const capas = [...document.querySelectorAll('body *')].filter((e) => { const cs = getComputedStyle(e); return (cs.position === 'fixed') && +cs.zIndex >= 100 && vis(e) && !e.closest('nav,header'); }).map((e) => e.id || (typeof e.className === 'string' ? e.className.split(' ')[0] : e.tagName));
  const vista = document.querySelector('main > .view.on, .view.on'); const burb = document.getElementById('pisteroBubble');
  const abiertas = vista ? [...vista.querySelectorAll('details')].filter((d) => d.open).length : 0; const texto = vista ? vista.innerText.length : 0; return { texto, abiertas, vista: vista ? vista.id : '-', capas: [...new Set(capas)].sort(), html: (vista ? vista.innerHTML.length : 0), bocadillo: burb && burb.classList.contains('show') ? burb.textContent.trim().slice(0, 80) : '', abrio: window.__abrio || [], url: location.hash };
});
await abrir();
try {
  for (const v of VISTAS) {
    await abrir();
    const ir = async () => { await p.evaluate(async (v) => { try { cv(v); } catch (e) {} await new Promise((r) => setTimeout(r, 400)); document.querySelectorAll('#v-' + v + ' details').forEach((d) => { if (!d.classList.contains('pgrupo')) d.open = true; }); const vista = document.getElementById('v-' + v); const enCerrado = (e) => { const d = e.closest('details'); return !!(d && !d.open && !e.closest('summary')); }; if (vista) [...vista.querySelectorAll('button,a[href],[onclick],[role=button],summary,input[type=checkbox],input[type=radio],select')].filter((e) => !enCerrado(e) && e.offsetParent && e.getBoundingClientRect().width > 4).forEach((e, i) => { e.dataset.audit = 'b' + i; }); window.__abrio = []; const bb = document.getElementById('pisteroBubble'); if (bb) bb.classList.remove('show'); }, v); await p.waitForTimeout(300); };
    await ir();
    const lista = await p.evaluate((v) => {
      const vista = document.getElementById('v-' + v); if (!vista || !vista.classList.contains('on')) return null;
      const enCerrado = (e) => { const d = e.closest('details'); return !!(d && !d.open && !e.closest('summary')); };
      return [...vista.querySelectorAll('button,a[href],[onclick],[role=button],summary,input[type=checkbox],input[type=radio],select')].filter((e) => !enCerrado(e) && e.offsetParent && e.getBoundingClientRect().width > 4)
        .map((e, i) => { e.dataset.audit = 'b' + i; return { id: 'b' + i, txt: ((e.getAttribute('aria-label') || e.title || e.textContent || e.value || e.id || e.tagName) + '').replace(/\s+/g, ' ').trim().slice(0, 40), onclick: (e.getAttribute('onclick') || e.getAttribute('href') || '').slice(0, 90), tag: e.tagName.toLowerCase() }; });
    }, v);
    if (!lista) { salida.push({ v, error: 'no abrió' }); continue; }
    for (const bt of lista) {
      if (/SOS|sos\(|enviarSOS|emergencia/i.test(bt.txt + bt.onclick)) { salida.push({ v, ...bt, resultado: 'NO SE TOCÓ (SOS: se revisa en el código)' }); continue; }
      await ir();
      const antes = await estado(); errs = []; red = []; dialogos = [];
      const pos = await p.evaluate((id) => { const e = document.querySelector('[data-audit="' + id + '"]'); if (!e) return null; document.documentElement.style.scrollBehavior='auto'; document.body.style.scrollBehavior='auto'; const m=document.querySelector('main'); if(m) m.style.scrollBehavior='auto'; e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); const x = r.left + Math.min(r.width / 2, 30), y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return { x, y, tapado: top && top !== e && !e.contains(top) ? (top.id || top.className || top.tagName).toString().slice(0, 30) + ' [y=' + Math.round(y) + ' scroll=' + document.scrollingElement.scrollTop + ' hdr=' + Math.round(document.querySelector('header').getBoundingClientRect().bottom) + ' hdrPos=' + getComputedStyle(document.querySelector('header')).position + ']' : null }; }, bt.id);
      if (!pos) { salida.push({ v, ...bt, resultado: 'desapareció antes de tocarlo' }); continue; }
      await p.waitForTimeout(150);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pos.x, y: pos.y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(900);
      let des; try { des = await estado(); } catch (e) { des = null; }
      const cambios = [];
      if (!des) cambios.push('la página se recargó o cambió de dirección');
      else {
        if (des.vista !== antes.vista) cambios.push('va a ' + des.vista);
        const nuevas = des.capas.filter((c) => !antes.capas.includes(c)); if (nuevas.length) cambios.push('abre ' + nuevas.join(','));
        if (Math.abs(des.html - antes.html) > 20) cambios.push('cambia el contenido'); if (Math.abs(des.texto - antes.texto) > 5 && Math.abs(des.html - antes.html) <= 20) cambios.push('cambia el texto visible'); if (des.abiertas !== antes.abiertas) cambios.push(des.abiertas > antes.abiertas ? 'abre sección' : 'cierra sección');
        if (des.bocadillo) cambios.push('Pistero: "' + des.bocadillo + '"');
        if (des.abrio.length) cambios.push('abre enlace ' + des.abrio.join(' ').slice(0, 60));
        if (des.url !== antes.url) cambios.push('url ' + des.url);
      }
      if (dialogos.length) cambios.push('pregunta: ' + dialogos.join(' | '));
      if (red.length) cambios.push('intenta red: ' + [...new Set(red)].join(','));
      salida.push({ v, ...bt, tapadoPor: pos.tapado, resultado: cambios.join(' · ') || 'NADA VISIBLE', errores: errs.slice(0, 3) });
      if (!des || errs.length || dialogos.length || /va a |abre |url |Grabar|Iniciar|navegaci/i.test(cambios.join(' ') + bt.txt)) await abrir(); // vuelve a un estado limpio (p. ej. 'Grabar un paseo' deja el mapa al frente)
    }
    fs.writeFileSync(`botones-${path.basename(raiz)}.json`, JSON.stringify(salida, null, 1));
  }
} finally { await b.close(); srv.close(); }
fs.writeFileSync(`botones-${path.basename(raiz)}.json`, JSON.stringify(salida, null, 1));
console.log('listo', salida.length, 'botones');
