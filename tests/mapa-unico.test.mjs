// Un solo mapa — etapa 1 (maqueta aprobada por Inty 2026-10-15): buscar y dejar puntos.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lee = (f) => readFileSync(join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
const MU = lee('mapa-unico.js'), HTML = lee('index.html'), SW = lee('sw.js'), REP = lee('reportes.js');
const RENDER = lee('mapa-render.js'), ESF = lee('esfera.js'), CSS = lee('estilos.css');
let ok = 0, fail = 0;
const t = (n, c, extra) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n + (extra ? '\n    ' + extra : '')); } };

function bloque(src, desde) {
  const i = src.indexOf(desde); let prof = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') prof++; else if (src[k] === '}' && --prof === 0) return src.slice(i, k + 1); }
}
const P = new Function(bloque(MU, 'function muPuedePublicar(') + '\n' + bloque(MU, 'function muTextoDistancia(') + '\nreturn {muPuedePublicar, muTextoDistancia};')();

// ---- Quién puede dejar puntos (las reglas exigen cuenta real) ----
t('sin sesión: no', P.muPuedePublicar(null) === false);
t('sesión anónima: no (se ofrece entrar con Google)', P.muPuedePublicar({ isAnonymous: true }) === false);
t('cuenta real: sí', P.muPuedePublicar({ isAnonymous: false }) === true);
t('distancia: "donde estás"', P.muTextoDistancia(20) === 'donde estás');
t('distancia: metros', P.muTextoDistancia(347) === 'a 350 m de ti');
t('distancia: km con coma', P.muTextoDistancia(1234) === 'a 1,2 km de ti');

// ---- Los seis tipos de la maqueta, con su categoría real ----
const tipos = [...MU.matchAll(/\{k:'(\w+)',\s*l:'([^']+)'/g)].map(m => [m[1], m[2]]);
t('seis tipos en la hoja', tipos.length === 6, JSON.stringify(tipos));
t('existe "Punto de interés" (antes no había)', tipos.some(([k, l]) => k === 'interes' && l === 'Punto de interés'));
t('existe "Agua"', tipos.some(([k, l]) => k === 'agua' && l === 'Agua'));
['interes', 'agua', 'mirador', 'util', 'critico', 'policia'].forEach(k =>
  t('la categoría ' + k + ' existe en REPORTE_CATS', new RegExp('\\b' + k + ':\\{g:').test(REP)));
t('Peligro trae subtipos (hoyo/objeto/animal...)', /k:'critico'[^\n]*subs:\['critico','objeto','animal','accidente','taco'\]/.test(MU));

// ---- Flujo ----
t('mantener apretado abre "Ir aquí / Dejar un punto aquí"', /map\.on\('contextmenu', function\(e\)\{[^}]*muAbrirMenu/.test(MU));
t('respaldo táctil de 550 ms para WebView sin contextmenu', /MU_LARGO_MS=550/.test(MU) && /map\.on\('touchstart'/.test(MU));
t('moverse o hacer zoom cancela el mantener apretado', /\['touchend','touchcancel','dragstart','zoomstart'\]/.test(MU));
t('la hoja NO se cierra sola (sin setTimeout que la cierre)', !/setTimeout\(\s*muCerrar/.test(MU));
t('el clic que llega al soltar no la cierra', /Date\.now\(\)-_muAbiertoEn<700/.test(MU));
t('el pin se puede arrastrar para afinar', /draggable:true/.test(MU) && /on\('dragend'/.test(MU));
t('sin cuenta: ofrece entrar con Google en vez del error técnico', /_entrarConGoogle\(\)/.test(MU));
t('publica en el pin, no en el GPS', /publicarPuntoMapa\(_muSub, nota\.trim\(\), lugar\)/.test(MU));
t('"+" deja el punto donde estás', /onclick="muDejarPuntoAqui\(\)"/.test(HTML));
t('mapa-render engancha el mapa único (ya no el popup de solo "Navegar aquí")', /muEnganchar\(mp\)/.test(RENDER) && !/Punto elegido/.test(RENDER));
t('error de permisos con mensaje claro', /tu cuenta no tiene permiso para dejar puntos/.test(REP));

// ---- Pantalla ----
t('el buscador vive en el Mapa (mismo #quick-dest)', /class="mapa-unico"[\s\S]{0,600}id="quick-dest"/.test(HTML));
t('Enter en el buscador inicia el viaje', /onkeydown="if\(event\.key==='Enter'\)\{event\.preventDefault\(\);startQuickTrip\(\);\}"/.test(HTML));
t('hay un solo #quick-dest en la app', (HTML.match(/id="quick-dest"/g) || []).length === 1);
t('sale el mapa chico "No lo encuentro"', !/id="punto-mapa-viaje"/.test(HTML));
t('"Grabar un paseo" en el mapa', /id="muGrabar"/.test(HTML));
t('esfera: "Viaje rápido" sale, entra "Grabar"', !/t:'Viaje rápido'/.test(ESF) && /t:'Grabar',fn:'muGrabar'/.test(ESF));
t('estilos del mapa único', /\.mu-hoja\{/.test(CSS) && /\.mu-cat\[aria-pressed="true"\]/.test(CSS));
t('index.html carga mapa-unico.js', /<script src="mapa-unico\.js"><\/script>/.test(HTML));
t('sw.js lo precachea', /'\.\/mapa-unico\.js'/.test(SW));

console.log('  mapa-unico.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
