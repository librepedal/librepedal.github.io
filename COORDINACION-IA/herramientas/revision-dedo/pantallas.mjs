// Revisión con el DEDO (gestos táctiles reales de Chrome vía CDP), 390x844, todo desplegado.
// Por pantalla: ¿llega al final bajando con el dedo (en 3 columnas: izq/centro/der)? ¿dónde se traba y qué hay bajo el dedo?
// Al final: botones tapados por la barra/cara de Pistero, botones cortados a los lados, botones a los que no se llega.
// Uso: node COORDINACION-IA/herramientas/revision-dedo/pantallas.mjs <carpeta del repo> [vistas...]     Producción bloqueada (Firebase, workers, librepedal.cl).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const raiz = path.resolve(process.argv[2]);
const VISTAS = process.argv.length > 3 ? process.argv.slice(3) : ['dash', 'customize', 'chat', 'pistero', 'trips', 'ajustes', 'stats', 'diario', 'rec', 'novedades', 'mac', 'gui', 'musica', 'newtrip'];
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const puerto = 5400 + Math.floor(Math.random() * 400);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(raiz, p); if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(puerto);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const informe = [];
try {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block', hasTouch: true, isMobile: true });
  await ctx.route(/firestore\.googleapis|firebaseio\.com|identitytoolkit|securetoken|firebaseinstallations|firebaselogging|google-analytics|sentry|workers\.dev|librepedal\.cl/, (r) => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('lp_voz', 'off'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(`http://localhost:${puerto}/index.html`); await p.waitForTimeout(5000);
  // cierra lo que tape al inicio (tutorial, avisos) sin aceptar nada
  await p.evaluate(() => { document.querySelectorAll('#tutorialOverlay.on').forEach((e) => e.classList.remove('on')); });
  // sesión de PRUEBA solo en este navegador (sin Firebase): la app se ve como con cuenta, sin datos reales
  await p.evaluate(() => { try { document.documentElement.classList.remove('lp-sin-sesion'); document.getElementById('auth').style.display = 'none';
    ['logoutBtn', 'ghostBtn'].forEach((i) => { const e = document.getElementById(i); if (e) e.style.display = 'block'; });
    window.cu = 'prueba-local'; try { cu = 'prueba-local'; } catch (e) {} try { us = { d: 120, n: 'Novato', di: 35, c: 3, la: null, lo: null }; } catch (e) {} try { au(); } catch (e) {} } catch (e) {} });
  await p.waitForTimeout(800);
  const sy = () => p.evaluate(() => document.scrollingElement.scrollTop);
  for (const v of VISTAS) {
    const ok = await p.evaluate(async (v) => { try { cv(v); } catch (e) { return 'cv: ' + e.message; } await new Promise((r) => setTimeout(r, 600));
      const vista = document.getElementById('v-' + v); if (!vista || !vista.classList.contains('on')) return 'no abrió';
      vista.querySelectorAll('details').forEach((d) => { d.open = true; }); // TODO desplegado
      await new Promise((r) => setTimeout(r, 300)); document.scrollingElement.scrollTop = 0; return 'ok'; }, v);
    if (ok !== 'ok') { informe.push({ v, error: ok }); continue; }
    const res = { v, columnas: {} };
    for (const [col, x] of [['izq', 40], ['centro', 195], ['der', 350]]) {
      await p.evaluate(() => { document.scrollingElement.scrollTop = 0; }); await p.waitForTimeout(150);
      let antes = -1, quieto = 0, traba = null;
      for (let i = 0; i < 60 && quieto < 2; i++) {
        const y0 = await sy();
        // dedo real: apoya, arrastra hacia arriba en pasos, suelta
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 620 }] });
        for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 620 - k * 38 }] }); await p.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await p.waitForTimeout(120);
        const y1 = await sy();
        if (Math.abs(y1 - y0) < 2) { quieto++; if (!traba) traba = await p.evaluate(([x]) => { const el = document.elementFromPoint(x, 620); const c = []; for (let e = el; e && e !== document.body && c.length < 4; e = e.parentElement) c.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')); return c.join(' < '); }, [x]); }
        else { quieto = 0; traba = null; }
        antes = y1;
      }
      const max = await p.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
      res.columnas[col] = { llego: antes >= max - 2, y: Math.round(antes), max: Math.round(max), traba: antes >= max - 2 ? null : traba };
    }
    // al fondo (por la columna central): botones tapados / cortados / inalcanzables
    await p.evaluate(() => { document.scrollingElement.scrollTop = 1e7; }); await p.waitForTimeout(250);
    Object.assign(res, await p.evaluate((v) => {
      const vista = document.getElementById('v-' + v);
      const nav = document.querySelector('body > nav'), mic = document.getElementById('micBtn'), hdr = document.querySelector('header');
      const micVis = mic && mic.offsetParent && getComputedStyle(mic).display !== 'none' && getComputedStyle(mic).visibility !== 'hidden';
      const techoNav = nav ? nav.getBoundingClientRect().top : innerHeight;
      const mr = micVis ? mic.getBoundingClientRect() : null;
      const piso = hdr ? hdr.getBoundingClientRect().bottom : 0;
      const nombre = (el) => ((el.getAttribute('aria-label') || el.textContent || el.value || el.placeholder || el.id || el.tagName) + '').replace(/\s+/g, ' ').trim().slice(0, 26);
      const enCerrado=(e)=>{const d=e.closest("details");return !!(d&&!d.open&&!e.closest("summary"));}; const botones = [...vista.querySelectorAll('button,a[href],a[onclick],input:not([type=hidden]),textarea,select,[onclick],[role=button],label[for]')].filter((el) => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return !enCerrado(el) && r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && el.offsetParent !== null; });
      const tapados = [], cortados = [], inalcanzables = [];
      for (const el of botones) {
        const r = el.getBoundingClientRect();
        // ¿está dentro de un carrusel horizontal? entonces cortarse a los lados es normal
        let hor = false; for (let e = el.parentElement; e && e !== vista; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 4) { hor = true; break; } }
        if (!hor && (r.left < -1 || r.right > innerWidth + 1)) cortados.push(nombre(el) + ` (${Math.round(r.left)}..${Math.round(r.right)})`);
        if (r.top >= innerHeight) inalcanzables.push(nombre(el));
        else if (r.bottom > techoNav + 1 && r.top < innerHeight) tapados.push(nombre(el) + ' bajo la barra ' + Math.round(r.bottom - techoNav) + 'px');
        else if (mr && r.bottom > mr.top + 4 && r.top < mr.bottom && r.right > mr.left + 4 && r.left < mr.right - 4) tapados.push(nombre(el) + ' bajo la cara de Pistero');
      }
      const ultimo = botones.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
      return { botones: botones.length, tapados, cortados: [...new Set(cortados)].slice(0, 8), inalcanzables: inalcanzables.slice(0, 8), ultimo: ultimo ? nombre(ultimo) : '-', ultimoAbajo: ultimo ? Math.round(ultimo.getBoundingClientRect().bottom) : 0, techo: Math.round(Math.min(techoNav, mr ? mr.top : 9999)) };
    }, v));
    informe.push(res);
    if (process.env.FOTOS) await p.screenshot({ path: `revision-${path.basename(raiz)}-${v}.png` });
  }
  informe.push({ errores: errs });
} finally { await b.close(); srv.close(); }
console.log(JSON.stringify(informe, null, 1));
