// Perfil como lo usa una persona, SOLO con el dedo: cada pestaña de la tienda → bajar hasta el final;
// abrir Preferencias tocándola → bajar hasta el final. ¿Llega? ¿Se ven completos los últimos botones?
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const raiz = path.resolve(process.argv[2]);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const puerto = 5800 + Math.floor(Math.random() * 100);
const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(raiz, p); if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(puerto);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = [];
try {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', isMobile: true, hasTouch: true });
  await ctx.route(/firestore\.googleapis|firebaseio\.com|identitytoolkit|securetoken|firebaseinstallations|google-analytics|sentry|workers\.dev|librepedal\.cl/, (r) => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('lp_voz', 'off'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(`http://localhost:${puerto}/index.html`); await p.waitForTimeout(4500);
  await p.evaluate(() => { document.documentElement.classList.remove('lp-sin-sesion'); document.getElementById('auth').style.display = 'none'; try { cv('customize'); } catch (e) {} });
  await p.waitForTimeout(700);
  const sy = () => p.evaluate(() => document.scrollingElement.scrollTop);
  const deslizar = async (x, dy) => { const y0 = dy < 0 ? 640 : 240; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] }); for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (dy * k) / 10 }] }); await p.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(140); };
  const tocar = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(500); };
  const hastaArriba = async () => { for (let i = 0; i < 40; i++) { const a = await sy(); await deslizar(195, 400); if ((await sy()) === a) break; } };
  const hastaAbajo = async (x) => { let quieto = 0; for (let i = 0; i < 50 && quieto < 2; i++) { const a = await sy(); await deslizar(x, -400); if (Math.abs((await sy()) - a) < 2) quieto++; else quieto = 0; } return { y: await sy(), max: await p.evaluate(() => document.scrollingElement.scrollHeight - innerHeight) }; };
  const fondo = (que) => p.evaluate((que) => {
    const v = document.getElementById('v-customize'), nav = document.querySelector('body > nav'), techo = nav.getBoundingClientRect().top;
    const enCerrado=(e)=>{const d=e.closest("details");return !!(d&&!d.open&&!e.closest("summary"));}; const bs = [...v.querySelectorAll('button,[onclick],input,select')].filter((e) => !enCerrado(e) && e.offsetParent && e.getBoundingClientRect().height > 4 && getComputedStyle(e).visibility !== 'hidden');
    const ult = bs.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
    const r = ult.getBoundingClientRect();
    const tapados = bs.filter((e) => { const q = e.getBoundingClientRect(); return q.bottom > techo + 1 && q.top < innerHeight; }).map((e) => (e.textContent || e.id).replace(/\s+/g, ' ').trim().slice(0, 24));
    return { que, ultimo: (ult.textContent || ult.id).replace(/\s+/g, ' ').trim().slice(0, 30), ultimoBorde: Math.round(r.bottom), techoBarra: Math.round(techo), completo: r.bottom <= techo + 1, tapados };
  }, que);
  // 1) cada pestaña de la tienda
  const pestanas = await p.evaluate(() => [...document.querySelectorAll('#v-customize .pt-tabs > *')].map((e) => e.textContent.trim()).filter(Boolean));
  for (let i = 0; i < pestanas.length; i++) {
    await hastaArriba();
    const pos = await p.evaluate((i) => { const t = document.querySelectorAll('#v-customize .pt-tabs > *')[i]; t.scrollIntoView({ inline: 'center', block: 'nearest' }); const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, i);
    await tocar(pos.x, pos.y);
    const r = {};
    for (const [c, x] of [['izq', 40], ['centro', 195], ['der', 350]]) { await hastaArriba(); r[c] = await hastaAbajo(x); }
    out.push({ pestana: pestanas[i], llega: Object.entries(r).map(([c, v]) => c + ':' + (v.y >= v.max - 2 ? 'ok' : 'TRABA ' + v.y + '/' + v.max)).join(' '), ...(await fondo('tienda ' + pestanas[i])) });
    if (process.env.FOTOS) await p.screenshot({ path: `perfil-${path.basename(raiz)}-${i}.png` });
  }
  // 2) Preferencias: bajar con el dedo hasta verla, tocarla, bajar hasta el final
  await hastaArriba(); let vista = null;
  for (let i = 0; i < 30; i++) { vista = await p.evaluate(() => { const d = [...document.querySelectorAll('#v-customize details.pgrupo')].find((d) => d.offsetParent && /Preferencias/.test(d.textContent)); if (!d) return null; const r = d.querySelector('summary').getBoundingClientRect(); return r.top > 80 && r.bottom < innerHeight - 120 ? { x: r.left + 60, y: r.top + r.height / 2 } : null; }); if (vista) break; await deslizar(195, -300); }
  if (!vista) out.push({ que: 'Preferencias', error: 'no se logra ver la fila Preferencias con el dedo' });
  else {
    await tocar(vista.x, vista.y);
    const abierta = await p.evaluate(() => { const d = [...document.querySelectorAll('#v-customize details.pgrupo')].find((d) => /Preferencias/.test(d.textContent)); return d.open + ' alto=' + d.clientHeight; });
    const r = await hastaAbajo(195);
    out.push({ que: 'Preferencias abierta (' + abierta + ')', llega: r.y >= r.max - 2 ? 'ok' : 'TRABA ' + r.y + '/' + r.max, ...(await fondo('Preferencias')) });
    if (process.env.FOTOS) await p.screenshot({ path: `perfil-${path.basename(raiz)}-pref.png` });
  }
  out.push({ errores: errs });
} finally { await b.close(); s.close(); }
console.log(JSON.stringify(out, null, 1));
