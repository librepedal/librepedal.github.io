// Entregar archivos (entregar-archivo.js, lpEntregarArchivo): la app NO puede decir "exportado/descargado"
// si el archivo no se entregó. Bug real (2026-10-05): en la app de Android un <a download> con blob: no
// hace nada y la app igual confirmaba (GPX, respaldo de datos, resumen anual, video, CSV admin).
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = readFileSync(join(raiz, 'entregar-archivo.js'), 'utf8');
const MN = readFileSync(join(raiz, 'motor-navegacion.js'), 'utf8').replace(/\r\n/g, '\n');
const iG = MN.indexOf('function _descargarGPX('), fG = MN.indexOf('\n}\n', iG);
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };
ok(iG >= 0, '_descargarGPX existe');

function escenario({ nativo, plugins, cancelar }) {
  const reg = { avisos: [], compartido: null, escrito: null, clic: 0, descarga: null };
  const FS = { writeFile: async (o) => { reg.escrito = o; return { uri: 'file:///cache/' + o.path }; } };
  const SH = { share: async (o) => { if (cancelar) throw new Error('Share canceled'); reg.compartido = o; } };
  class FR { readAsDataURL(b) { this.result = 'data:x;base64,QUJD'; setTimeout(() => this.onload(), 0); } }
  const ctx = {
    console: { warn() {} }, Blob: class { constructor(p, o) { this.p = p; this.type = o && o.type; } }, setTimeout, FileReader: FR,
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    document: { createElement: () => ({ click() { reg.clic++; }, set download(v) { reg.descarga = v; } }), body: { appendChild() {}, removeChild() {} } },
    lpAviso: (t) => reg.avisos.push(t),
    lpPlugin: (nm) => (plugins ? ({ Filesystem: FS, Share: SH })[nm] : null),
    window: {}
  };
  if (nativo) { ctx.window.Capacitor = { isNativePlatform: () => true }; ctx.Capacitor = ctx.window.Capacitor; }
  vm.createContext(ctx); vm.runInContext(LIB, ctx); vm.runInContext(MN.slice(iG, fG + 2), ctx);
  return { ctx, reg };
}
const corre = async (opts, expr) => { const e = escenario(opts); const r = await vm.runInContext(expr, e.ctx); return { r, reg: e.reg }; };

const web = await corre({ nativo: false }, '_descargarGPX("<gpx/>","Mi ruta")');
ok(web.r === true && web.reg.clic === 1 && web.reg.descarga === 'Mi_ruta.gpx', 'navegador: descarga el GPX y confirma');
const app = await corre({ nativo: true, plugins: true }, '_descargarGPX("<gpx/>","Mi ruta")');
ok(app.r === true && app.reg.escrito.path === 'Mi_ruta.gpx' && app.reg.escrito.encoding === 'utf8' && app.reg.compartido.files[0].endsWith('Mi_ruta.gpx'), 'app: guarda el GPX como texto y abre Compartir');
const bin = await corre({ nativo: true, plugins: true }, 'lpEntregarArchivo(new Blob(["x"],{type:"image/png"}),"libre-pedal-2026.png","image/png")');
ok(bin.r === true && bin.reg.escrito.data === 'QUJD' && !bin.reg.escrito.encoding, 'app: imagen/video se guarda en base64');
const vieja = await corre({ nativo: true, plugins: false }, '_descargarGPX("<gpx/>","Mi ruta")');
ok(vieja.r === false && vieja.reg.avisos.length === 1 && /no puede guardar archivos/.test(vieja.reg.avisos[0]) && vieja.reg.clic === 0, 'app sin plugins: no finge, avisa la verdad');
const cancela = await corre({ nativo: true, plugins: true, cancelar: true }, '_descargarGPX("<gpx/>","Mi ruta")');
ok(cancela.r === false && cancela.reg.avisos.length === 0, 'cerrar Compartir: no confirma ni muestra error');

// ningún archivo de la app vuelve a descargar con <a download> por su cuenta (solo entregar-archivo.js)
const otros = readdirSync(raiz).filter((x) => x.endsWith('.js') && x !== 'entregar-archivo.js').filter((x) => /\.download\s*=/.test(readFileSync(join(raiz, x), 'utf8')));
ok(otros.length === 0, 'nadie más usa <a download> (lo hacían: ' + otros.join(', ') + ')');
// los mensajes de éxito dependen del resultado
ok(/if\(await _descargarGPX\(/.test(MN) && /_descargarGPX\(_gpxDeRuta\(pts,nombre\), nombre\)\.then\(function\(ok\)\{ if\(ok\)/.test(MN), 'GPX: "exportada" solo si se entregó');
const FMV = readFileSync(join(raiz, 'funciones-mapa-viajes.js'), 'utf8');
ok(/then\(function\(entregado\)\{ if\(entregado\) h\('Respaldo listo/.test(FMV), 'respaldo: "listo" solo si se entregó');
ok(/if\(entregado\) h\('Descargado: /.test(FMV), 'CSV admin: "descargado" solo si se entregó');
ok(/entregado\?'¡Video listo!/.test(readFileSync(join(raiz, 'rutas.js'), 'utf8')), 'video: "listo" solo si se entregó');
const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
ok(pkg.dependencies['@capacitor/filesystem'] && pkg.dependencies['@capacitor/share'], 'package.json trae @capacitor/filesystem y @capacitor/share');

console.log(f ? '\n' + (n - f) + ' OK, ' + f + ' FALLA(S)' : '\n' + n + ' pasaron, 0 fallaron');
process.exit(f ? 1 : 0);
