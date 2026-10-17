// Auditoría 2026-10-17 (XSS): datos de otros usuarios (ids de documento, campos editables, ?perfil=)
// entraban crudos -- o con escapeHTML, que ahí NO sirve -- dentro de onclick="f('...')".
// 1) jsArg(): el valor llega INTACTO a la función y nunca cierra el string ni el atributo.
// 2) Guardia: ningún onclick de los archivos que pintan datos de Firestore interpola un string sin jsArg.
// 3) ?perfil= solo acepta ids de cuenta reales.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };

// ---- 1. jsArg real (sacado de suscripciones-comunidad.js) ----
const fuente = leer('suscripciones-comunidad.js');
const def = fuente.split('\n').filter((l) => /^function (jsArg|escapeHTML)\(/.test(l)).join('\n');
const ctx = {}; vm.createContext(ctx); vm.runInContext(def, ctx);
ok(typeof ctx.jsArg === 'function', 'jsArg está definido en suscripciones-comunidad.js');

// Decodifica entidades como lo hace el parser HTML con el valor de un atributo.
const decodificar = (s) => s.replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  const t = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()];
  if (t) return t; return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
});
const PAYLOADS = [
  "abc123", "x');alert(1);('", "x\\');alert(1);//", '"><img src=x onerror=alert(1)>', "&#39;);alert(1);('",
  "</script><script>alert(1)</script>", "línea\nnueva", "a`b${alert(1)}`", "  ", "x\\", "O'Higgins & Co. <3",
];
for (const p of PAYLOADS) {
  const html = '<button onclick="f(\'' + ctx.jsArg(p) + '\',\'segundo\')">';
  const m = html.match(/onclick="([^"]*)"/);
  ok(m && html.indexOf('"', html.indexOf('onclick="') + 9) === html.indexOf('">'), 'el atributo no se corta antes de tiempo: ' + JSON.stringify(p));
  const cuerpo = decodificar(m[1]);
  const llamado = []; let alerto = false;
  const sb = { f: (...a) => llamado.push(a), alert: () => { alerto = true; } };
  vm.createContext(sb);
  try { vm.runInContext(cuerpo, sb); } catch (e) { ok(false, 'el onclick lanzó error con ' + JSON.stringify(p) + ': ' + e.message); continue; }
  ok(!alerto, 'no se ejecuta código inyectado: ' + JSON.stringify(p));
  ok(llamado.length === 1 && llamado[0][0] === p && llamado[0][1] === 'segundo', 'la función recibe el valor intacto: ' + JSON.stringify(p));
}
// Contraejemplo: el escapeHTML de antes dentro de onclick SÍ dejaba pasar la inyección.
{
  const p = "x');alert(1);('";
  const cuerpo = decodificar(('<b onclick="f(\'' + ctx.escapeHTML(p) + '\')">').match(/onclick="([^"]*)"/)[1]);
  let alerto = false; const sb = { f: () => {}, alert: () => { alerto = true; } }; vm.createContext(sb);
  try { vm.runInContext(cuerpo, sb); } catch (e) {}
  ok(alerto, 'control: con escapeHTML dentro de onclick la inyección funcionaba (confirma el hallazgo)');
}

// ---- 2. guardia estática ----
const ARCHIVOS = ['social.js', 'rodadas.js', 'funciones-mapa-viajes.js', 'gamificacion-comunidad.js', 'gamificacion-ranking.js',
  'novedades.js', 'perfil-comunidad.js', 'pistero-apariencia.js', 'recomendacion-rutas.js', 'reportes.js',
  'rutas-recomendadas.js', 'rutas.js', 'segmentos.js'];
const BS = String.fromCharCode(92);
const PAT = new RegExp(BS + BS + "''\\+(.+?)\\+'" + BS + BS + "'", 'g');
for (const a of ARCHIVOS) {
  const lineas = leer(a).split('\n'); let crudos = [];
  lineas.forEach((l, i) => {
    let m; PAT.lastIndex = 0;
    while ((m = PAT.exec(l))) {
      const antes = l.slice(0, m.index); const at = antes.search(/on(click|change|input)="[^"]*$/);
      if (at < 0) continue;
      if (!/^jsArg\(/.test(m[1])) crudos.push((i + 1) + ': ' + m[1].slice(0, 50));
    }
  });
  ok(crudos.length === 0, a + ': todo string dentro de on*="..." pasa por jsArg' + (crudos.length ? ' -- crudos: ' + crudos.join(' | ') : ''));
}
ok(!/escapeHTML\([^)]*\)\.replace\(\/'\/g/.test(leer('reportes.js')), 'reportes.js: sin el escape casero viejo dentro del onclick');
for (const [a, re] of [['funciones-mapa-viajes.js', /irAlPuntoYNavegar\('\+data\.lat/], ['reportes.js', /irAlPuntoYNavegar\('\+r\.lat/], ['mapa-render.js', /irAlPuntoYNavegar\('\+lat/]])
  ok(!re.test(leer(a)), a + ': lat/lon pasan por Number() antes del onclick');
ok(/Math\.round\(Number\(r\.ruta\.subida\)/.test(leer('rodadas.js')), 'rodadas.js: subida pasa por Number()');
ok(/Math\.round\(Number\(darma\)\)/.test(leer('gamificacion-ranking.js')), 'perfil: darma pasa por Number()');
for (const a of ['rodadas.js', 'recomendacion-rutas.js', 'rutas-recomendadas.js', 'segmentos.js', 'gamificacion-comunidad.js', 'funciones-mapa-viajes.js'])
  ok(!/Object\.assign\(\{id:(d|doc)\.id\}/.test(leer(a)), a + ': el id real del documento gana sobre un campo `id` en los datos');

// ---- 3. ?perfil= ----
const vin = leer('auth-vinculo.js');
ok(/\/\^\[A-Za-z0-9_\]\{1,128\}\$\/\.test\(_pid\)/.test(vin), 'auth-vinculo.js valida ?perfil= antes de abrir el perfil');
const valido = /^[A-Za-z0-9_]{1,128}$/;
ok(valido.test('juan_perez_gmail_com') && !valido.test("x');alert(1);('") && !valido.test('a<b'), 'el patrón acepta ids reales y rechaza inyecciones');

console.log(`xss en onclick: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
