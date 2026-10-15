// Auditoría "app al 100, sin datos falsos" (Inty 2026-10-15). Cada prueba es un error real que
// existió: si alguien lo reintroduce, este archivo falla.
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lee = (f) => readFileSync(join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
const JS = readdirSync(raiz).filter(f => f.endsWith('.js'));
let ok = 0, fail = 0;
const t = (n, c, extra) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n + (extra ? '\n    ' + extra : '')); } };
function bloque(src, desde) {
  const i = src.indexOf(desde); if (i < 0) return '';
  let prof = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') prof++; else if (src[k] === '}' && --prof === 0) return src.slice(i, k + 1); }
}
const ACT = lee('pistero-tipo-actividad.js'), NAV = lee('motor-navegacion.js');

// ---- 1) Rutas y tiempos con perfil real (el servidor de demo era siempre de auto) ----
{
  const base = ACT.slice(ACT.indexOf('const RUTEO_BASE'), ACT.indexOf('\n', ACT.indexOf('const RUTEO_BASE')));
  const url = new Function('_osrmPerfil', base + '\n' + bloque(ACT, 'function urlRuteo(') + '\nreturn urlRuteo;')(() => 'cycling');
  t('bici → servidor con perfil real de bici', url('route', '1,2;3,4', 'x=1') === 'https://routing.openstreetmap.de/routed-bike/route/v1/driving/1,2;3,4?x=1');
  t('a pie → perfil real a pie', url('route', '1,2;3,4', '', 'foot').startsWith('https://routing.openstreetmap.de/routed-foot/route/v1/'));
  t('auto → servidor de auto', url('route', '1,2;3,4', '', 'driving').startsWith('https://router.project-osrm.org/route/v1/driving/'));
  const conDemo = JS.filter(f => /router\.project-osrm\.org\/(route|match)\/v1\/'\s*\+\s*(_osrmPerfil|perfil)/.test(lee(f)));
  t('ningún archivo pide /cycling o /foot al servidor de demo (los ignora)', conDemo.length === 0, conDemo.join(', '));
}
// ---- 2) Hora de llegada que se recalcula con tu velocidad real ----
{
  const f = new Function(bloque(NAV, 'function llegadaEstimadaMin(') + '\nreturn llegadaEstimadaMin;')();
  t('al partir: con la velocidad de la ruta (30 km en 120 min → 10 km quedan = 40 min)', f(10, 0, 0, 30, 120) === 40);
  t('con 20 min y 4 km hechos (12 km/h): 6 km quedan = 30 min', f(6, 4, 20 * 60000, 30, 120) === 30);
  t('si te detienes mucho, la llegada se atrasa (vas a 6 km/h promedio)', f(6, 3, 30 * 60000, 30, 120) === 60);
  t('sin datos, no inventa', f(5, 0, 0, 0, 0) === null);
  t('se recalcula en cada paso de la navegación', /_actualizarLlegada\(rem\/1000\)/.test(NAV));
}
// ---- 3) Calorías por actividad ----
{
  const k = new Function('actividadTipo', ACT.slice(ACT.indexOf('const KCAL_POR_KM'), ACT.indexOf('\n', ACT.indexOf('const KCAL_POR_KM'))) + '\n' + bloque(ACT, 'function kcalPorKm(') + '\nreturn kcalPorKm;');
  t('en vehículo, 0 calorías', k('moto')() === 0);
  t('caminando cuenta más que en bici por km', k('trekking')() > k('ciclismo')());
  t('actividad desconocida: la de bici', k('xyz')() === 30);
  const conTreinta = ['motor-gps.js', 'motor-navegacion.js', 'funciones-mapa-viajes.js', 'rutas.js'].filter(f => /(km|dkm|_km|totalDistance|dist)\s*\*\s*30\b/.test(lee(f)));
  t('nadie calcula calorías con km × 30 fijo', conTreinta.length === 0, conTreinta.join(', '));
  t('navegar usa _sumarKmViaje (vehículo no gasta la cadena de la bici)', /if\(dkm>0\)\{ totalDistance\+=dkm; _sumarKmViaje\(dkm\); \}/.test(lee('funciones-mapa-viajes.js')));
}
// ---- 3b) Velocidad media histórica ----
{
  const us = {}; let actividadTipo = 'ciclismo';
  const F = new Function('us', 'gd', 'getAct', 'let actividadTipo; ' + bloque(NAV, 'function _actualizarVelocidadHistorica(').replace("typeof actividadTipo!=='undefined' && actividadTipo==='moto'", "getAct()==='moto'") + '\n' + bloque(NAV, 'function velMediaHistorica(') + '\nreturn {_actualizarVelocidadHistorica, velMediaHistorica};')(us, () => {}, () => actividadTipo);
  F._actualizarVelocidadHistorica(20, 3600000);            // 20 km en 1 h de bici
  actividadTipo = 'moto'; F._actualizarVelocidadHistorica(60, 3600000); actividadTipo = 'ciclismo'; // 60 km en auto: no cuenta
  F._actualizarVelocidadHistorica(10, 3600000);            // 10 km en 1 h
  t('promedio ponderado por km de tus viajes en bici (20 y 10 km/h → 16,7)', Math.abs(F.velMediaHistorica() - 16.667) < 0.01, F.velMediaHistorica());
  t('los km en auto no se mezclan', us.kmVelDist === 30);
  t('sin datos, no inventa un promedio', new Function('us', bloque(NAV, 'function velMediaHistorica(') + '\nreturn velMediaHistorica;')({})() === null);
  t('Estadísticas: Vel. media ya no promedia lecturas con paradas en 0', !/statAvgSpeed'\)\.innerText=speedReadings/.test(NAV));
  t('grabar un paseo también alimenta la velocidad media', /_actualizarVelocidadHistorica\(_kmEsteViaje, tiempoActivoMs\(\)\)/.test(lee('motor-gps.js')));
  t('a Pistero se le manda la media histórica real', /c\.velMediaKmh=\+_vm\.toFixed\(1\)/.test(lee('pistero-chat-ia.js')));
}
// ---- 3c) Logros, CO₂ y máxima: los km en auto no cuentan como pedaleados ----
{
  const LOG = lee('gamificacion-logros.js'), DAR = lee('gamificacion-darma.js');
  const k = (us) => new Function('us', bloque(LOG, 'function kmAPulso(') + '\nreturn kmAPulso();')(us);
  t('km a pulso = total menos lo hecho en vehículo', k({ di: 120, dm: { ciclismo: 70, moto: 50 } }) === 70);
  t('cuenta vieja sin detalle por modo: el total', k({ di: 30 }) === 30);
  t('ningún logro de km usa el total con auto (us.di)', !/val:function\(\)\{return us\.di;\}/.test(LOG));
  t('CO₂ evitado sin km manejando (Inicio y Estadísticas)', !/_co2Evitado\(us\.di\)/.test(DAR) && !/_co2Evitado\(us\.di\)/.test(NAV));
  t('velocidad máxima histórica sin el auto', /us\.vmax=sp/.test(lee('motor-gps.js')) && /actividadTipo!=='moto'\)\) us\.vmax=sp/.test(lee('motor-gps.js')));
}
// ---- 4) Compartir y guardar en la app instalada ----
{
  const SRC = lee('compartir-nativo.js');
  function app({ conPlugins = true, cancela = false } = {}) {
    const escritos = [], compartidos = [], avisos = [];
    const Plugins = conPlugins ? {
      Share: { share: async (o) => { if (cancela) throw new Error('Share canceled'); compartidos.push(o); } },
      Filesystem: { writeFile: async (o) => { escritos.push(o); return { uri: 'file:///cache/' + o.path }; } },
    } : {};
    const Capacitor = { isNativePlatform: () => true, isPluginAvailable: (n) => !!Plugins[n] };
    const navigator = {};
    class FR { readAsDataURL() { this.result = 'data:x;base64,QUJD'; this.onload(); } }
    const fn = new Function('window', 'navigator', 'Capacitor', 'lpPlugin', 'lpAviso', 'FileReader', 'File', 'document', 'URL',
      SRC + '\nreturn {lpGuardarArchivo, lpPuedeCompartirArchivos};');
    const api = fn({ Capacitor }, navigator, Capacitor, (n) => Plugins[n] || null, (m) => avisos.push(m), FR,
      class { constructor(b, n, o) { this.name = n; this.type = o && o.type; } }, {}, {});
    return { api, navigator, escritos, compartidos, avisos };
  }
  return_check: {
    const A = app();
    t('app: navigator.share existe (el WebView no lo trae)', typeof A.navigator.share === 'function');
    t('app: puede compartir archivos', A.api.lpPuedeCompartirArchivos() === true);
    await A.navigator.share({ title: 'SOS', text: 'Ayuda en -40.1,-72.2' });
    t('app: compartir texto (SOS, seguir en vivo) llega al menú de Android', A.compartidos.length === 1 && A.compartidos[0].text === 'Ayuda en -40.1,-72.2');
    const r = await A.api.lpGuardarArchivo({ type: 'application/gpx+xml' }, 'mi ruta.gpx', 'Mi ruta');
    t('app: guardar un GPX escribe el archivo y abre compartir/guardar', r === 'compartido' && A.escritos.length === 1 && /mi_ruta\.gpx$/.test(A.escritos[0].path) && A.compartidos[1].files[0].startsWith('file:///cache/'));
    const C = app({ cancela: true });
    let nombre = null; try { await C.navigator.share({ text: 'x' }); } catch (e) { nombre = e.name; }
    t('app: cerrar el menú es AbortError, como en la web (no se muestra error)', nombre === 'AbortError');
    const V = app({ conPlugins: false });
    const rv = await V.api.lpGuardarArchivo({ type: 'image/png' }, 'a.png');
    t('app vieja sin plugins: pide actualizar, no manda a Chrome', rv === 'actualizar' && /Play Store/.test(V.avisos[0]) && !/Chrome/.test(V.avisos[0]));
  }
  const pkg = JSON.parse(lee('package.json'));
  t('la app nativa trae los plugins de compartir y archivos', !!pkg.dependencies['@capacitor/share'] && !!pkg.dependencies['@capacitor/filesystem']);
  t('compartir-nativo.js se carga en index.html y se precachea', /<script src="compartir-nativo\.js"><\/script>/.test(lee('index.html')) && /'\.\/compartir-nativo\.js'/.test(lee('sw.js')));
  const aChrome = JS.filter(f => /abre librepedal\.cl en Chrome|Abre librepedal\.cl en Chrome|la voz funciona en Chrome|En Chrome la voz s[ií] funciona/.test(lee(f)));
  t('ningún mensaje manda al usuario de la app a Chrome', aChrome.length === 0, aChrome.join(', '));
}

console.log('  datos-reales.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
