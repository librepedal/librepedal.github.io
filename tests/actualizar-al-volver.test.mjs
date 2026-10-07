// Inty 2026-10-07: el scroll del Perfil "se expande y se contrae". Su video (15:58) mostraba el código de ANTES de la
// 8.810 (lista de la tienda con scroll propio), que ya estaba publicada desde las 15:20: la app de Play seguía con el
// código viejo en memoria. Causas: (1) la versión se revisaba solo al abrir la app desde cero, nunca al volver desde
// segundo plano; (2) el freno "una recarga por visita" vivía en sessionStorage, que en la app dura lo que el proceso
// (días), así que tras una actualización automática no volvía a actualizarse. Se corre el código real de index.html.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');
const i0 = html.indexOf("const APP_VERSION='"), i1 = html.indexOf('async function forzarActualizacion(){');
const codigo = html.slice(i0, i1).replace(/^const APP_VERSION=/, 'var APP_VERSION=');
const APP = (codigo.match(/APP_VERSION='([^']+)'/) || [])[1];
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

function app({ remota, sesion = {}, viaje = false }) {
  const st = { ahora: 1_000_000_000, recargas: 0, pedidos: 0, oyentes: {}, vis: 'visible', borradas: [] };
  const ses = Object.assign({}, sesion), loc = {};
  const ctx = {
    console, Math, JSON, Object, Array, String, Number, RegExp, Promise, setTimeout, clearTimeout,
    Date: { now: () => st.ahora },
    AbortController,
    sessionStorage: { getItem: (k) => (k in ses ? ses[k] : null), setItem: (k, v) => { ses[k] = String(v); } },
    localStorage: { getItem: (k) => (k in loc ? loc[k] : null), setItem: (k, v) => { loc[k] = String(v); }, removeItem: (k) => { delete loc[k]; } },
    fetch: (url) => { if (/version\.txt/.test(url)) st.pedidos++; return Promise.resolve({ text: () => Promise.resolve(st.remota) }); },
    navigator: {}, caches: { keys: () => Promise.resolve(['librepedal-v1', 'librepedal-tiles']), delete: (k) => { st.borradas.push(k); return Promise.resolve(true); } },
    location: { reload: () => { st.recargas++; } },
    document: { get visibilityState() { return st.vis; }, addEventListener: (ev, fn) => { (st.oyentes[ev] = st.oyentes[ev] || []).push(fn); } },
    ig: viaje,
  };
  ctx.window = ctx; st.remota = remota;
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx, { filename: 'index.html (auto-reparación)' });
  st.ir = async (ms) => { st.vis = 'hidden'; (st.oyentes.visibilitychange || []).forEach((fn) => fn()); st.ahora += ms; st.vis = 'visible'; (st.oyentes.visibilitychange || []).forEach((fn) => fn()); await new Promise((r) => setTimeout(r, 20)); };
  st.ctx = ctx;
  return st;
}
const espera = () => new Promise((r) => setTimeout(r, 20));

ok(APP && codigo.includes('_lpRevisarVersion'), 'se encontró el código de auto-reparación en index.html');

// 1) al día: abrir y volver no recarga nada
let A = app({ remota: APP }); await espera();
ok(A.recargas === 0 && A.pedidos === 1, 'al abrir, al día: revisa una vez y no recarga');
A.remota = String(+APP + 0.001); await A.ir(10_000);
ok(A.recargas === 0 && A.pedidos === 1, 'volver tras 10 s (elegir foto, login de Google): no revisa');

// 2) se publica una versión mientras la app está en segundo plano → al volver se actualiza
await A.ir(5 * 60_000);
ok(A.pedidos === 2, 'volver tras 5 min: revisa la versión');
ok(A.recargas === 1, 'hay versión nueva: recarga sola (antes seguía con el código viejo)');
ok(!A.borradas.includes('librepedal-tiles') && A.borradas.includes('librepedal-v1'), 'borra el caché de la app pero NO los mapas sin señal');

// 3) el freno viejo de sessionStorage ('1' de una recarga de hace horas) ya no la deja pegada
const B = app({ remota: APP, sesion: { lp_reload_visita: '1' } }); await espera();
B.remota = String(+APP + 0.002); await B.ir(10 * 60_000);
ok(B.recargas === 1, 'con una recarga automática de hace horas, igual se actualiza al volver');

// 4) frenos que se mantienen
const C = app({ remota: APP, viaje: true }); await espera();
C.remota = String(+APP + 0.003); await C.ir(5 * 60_000);
ok(C.recargas === 0 && C.ctx.__lpActualizacionPendiente === true, 'en pleno viaje no recarga: queda pendiente para el final');
const D = app({ remota: APP }); await espera();
D.ctx._lpMarcarRecargaEstaVisita(); D.remota = String(+APP + 0.004); D.ahora += 40_000;
await D.ir(31_000);
ok(D.recargas === 1, 'pasados 45 s de la última recarga, sí vuelve a poder actualizarse');
const E = app({ remota: APP }); await espera();
E.ctx._lpMarcarRecargaEstaVisita(); E.remota = String(+APP + 0.005); await E.ir(31_000);
ok(E.recargas === 0, 'recién recargada (menos de 45 s): no se recarga dos veces seguidas');
const G = app({ remota: APP }); await espera();
G.remota = String(+APP + 0.006); await G.ir(61_000); const p1 = G.pedidos; await G.ir(31_000);
ok(p1 === 2 && G.pedidos === p1, 'como máximo una revisión por minuto');

console.log(`${n - f} pasaron, ${f} fallaron`);
process.exit(f ? 1 : 0);
