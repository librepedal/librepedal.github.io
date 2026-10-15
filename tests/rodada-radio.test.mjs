// Radio de rodada — la Punta y la Cola hablan, todo el grupo escucha.
// Se prueba la lógica REAL de rodada-radio.js (no una copia): orden del pelotón, roles
// automáticos con histéresis, árbitro, huecos, rezagados y qué mensajes se reproducen.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
// \r\n → \n: en Windows git puede dejar los archivos con CRLF, y las búsquedas de fin de función usan '\n}\n'.
const SRC = readFileSync(join(raiz, 'rodada-radio.js'), 'utf8').replace(/\r\n/g, '\n');
const RULES = JSON.parse(readFileSync(join(raiz, 'database.rules.json'), 'utf8'));
const HTML = readFileSync(join(raiz, 'index.html'), 'utf8');
const SW = readFileSync(join(raiz, 'sw.js'), 'utf8');
const FSR = readFileSync(join(raiz, 'firestore.rules'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// Constantes + lógica pura (todo lo que va antes del bloque de estado) + radioDebeReproducir.
const puro = SRC.slice(0, SRC.indexOf('/* ---------- Estado y conexión'));
const iDeb = SRC.indexOf('function radioDebeReproducir(');
const finDeb = SRC.indexOf('\n}\n', iDeb) + 2;
const fn = new Function(puro + '\n' + SRC.slice(iDeb, finDeb) +
  '\nreturn {radioOrdenarPeloton, radioProponerRoles, radioDecidirRoles, radioElegirArbitro, radioHuecos, radioDetrasDeCola, radioFrasesCambio, radioDebeReproducir};');
const R = fn();

const AHORA = 1_000_000;
const m = (avance, tipo = 'bici', hace = 0, nombre) => ({ avance, tipo, ts: AHORA - hace, nombre });

// ---- Orden del pelotón ----
{
  const ord = R.radioOrdenarPeloton({ a: m(100), b: m(900), c: m(500), d: m(2000, 'bici', 70000) }, AHORA);
  t('ordena de más adelante a más atrás', ord.map(x => x.uid).join() === 'b,c,a');
  t('el que lleva >60 s sin señal no cuenta', !ord.some(x => x.uid === 'd'));
  t('sala vacía no revienta', R.radioOrdenarPeloton(null, AHORA).length === 0);
}

// ---- Propuesta de roles ----
{
  const ord = R.radioOrdenarPeloton({ a: m(100), b: m(900), c: m(500) }, AHORA);
  const p = R.radioProponerRoles(ord);
  t('sin auto: Punta = el de más adelante', p.punta === 'b');
  t('sin auto: Cola = el último ciclista', p.cola === 'a');
  const ord2 = R.radioOrdenarPeloton({ a: m(100), b: m(900), auto: m(50, 'auto') }, AHORA);
  t('con auto: la Cola es el auto', R.radioProponerRoles(ord2).cola === 'auto');
  const ord3 = R.radioOrdenarPeloton({ a: m(100), auto: m(5000, 'auto') }, AHORA);
  t('el auto nunca es Punta aunque vaya adelante', R.radioProponerRoles(ord3).punta === 'a');
  const solo = R.radioOrdenarPeloton({ a: m(100) }, AHORA);
  t('un solo ciclista: es Punta y no hay Cola', R.radioProponerRoles(solo).punta === 'a' && R.radioProponerRoles(solo).cola === null);
}

// ---- Histéresis: no se pasa el rol a cada rato ----
{
  const actual = { punta: 'a', cola: 'c' };
  // b pasa a a por solo 20 m: no cambia
  let ord = R.radioOrdenarPeloton({ a: m(1000), b: m(1020), c: m(100) }, AHORA);
  let r = R.radioDecidirRoles(actual, ord, {}, AHORA);
  t('ventaja < 50 m: la Punta no cambia', r.roles.punta === 'a');
  t('y no queda candidato pendiente', !r.pendiente.punta);
  // b pasa por 80 m: queda pendiente, todavía no cambia
  ord = R.radioOrdenarPeloton({ a: m(1000), b: m(1080), c: m(100) }, AHORA);
  r = R.radioDecidirRoles(actual, ord, {}, AHORA);
  t('ventaja de 80 m recién empezada: aún no cambia', r.roles.punta === 'a');
  t('queda b como candidato pendiente', r.pendiente.punta && r.pendiente.punta.uid === 'b');
  // 20 s después sigue adelante: aún no
  const r2 = R.radioDecidirRoles(actual, ord, r.pendiente, AHORA + 20000);
  t('a los 20 s todavía no cambia', r2.roles.punta === 'a');
  // 30 s después: cambia
  const r3 = R.radioDecidirRoles(actual, ord, r2.pendiente, AHORA + 30000);
  t('sostenido 30 s: b es la nueva Punta', r3.roles.punta === 'b');
  // si a recupera antes de los 30 s, se anula
  const ordVuelve = R.radioOrdenarPeloton({ a: m(1100), b: m(1080), c: m(100) }, AHORA);
  const r4 = R.radioDecidirRoles(actual, ordVuelve, r.pendiente, AHORA + 15000);
  t('si el de la Punta recupera, se anula el cambio', r4.roles.punta === 'a' && !r4.pendiente.punta);
}

// ---- Cambios inmediatos ----
{
  // la Punta actual se quedó sin señal
  const ord = R.radioOrdenarPeloton({ a: m(1000, 'bici', 90000), b: m(900), c: m(100) }, AHORA);
  const r = R.radioDecidirRoles({ punta: 'a', cola: 'c' }, ord, {}, AHORA);
  t('Punta sin señal: pasa de inmediato al siguiente', r.roles.punta === 'b');
  // entra un auto: es Cola al tiro
  const ord2 = R.radioOrdenarPeloton({ a: m(1000), c: m(100), auto: m(80, 'auto') }, AHORA);
  const r2 = R.radioDecidirRoles({ punta: 'a', cola: 'c' }, ord2, {}, AHORA);
  t('llega el auto: la Cola es el auto de inmediato', r2.roles.cola === 'auto');
  // sala recién creada
  const r3 = R.radioDecidirRoles({}, ord2, {}, AHORA);
  t('sala nueva: asigna los dos roles altiro', r3.roles.punta === 'a' && r3.roles.cola === 'auto');
  // nunca la misma persona en los dos roles
  const ord4 = R.radioOrdenarPeloton({ a: m(1000) }, AHORA);
  const r4 = R.radioDecidirRoles({ punta: 'a', cola: 'a' }, ord4, {}, AHORA);
  t('nunca la misma persona es Punta y Cola', r4.roles.punta !== r4.roles.cola);
}

// ---- Árbitro: todos llegan al mismo sin hablarse ----
{
  const ord = R.radioOrdenarPeloton({ zeta: m(10), beta: m(20), alfa: m(30) }, AHORA);
  t('el creador con señal es el árbitro', R.radioElegirArbitro('zeta', ord) === 'zeta');
  t('creador sin señal: el de uid menor', R.radioElegirArbitro('otro', ord) === 'alfa');
  t('sin nadie: null', R.radioElegirArbitro('x', []) === null);
}

// ---- Grupo cortado y rezagados ----
{
  const ord = R.radioOrdenarPeloton({ a: m(3000), b: m(2900), c: m(1500), auto: m(1000, 'auto') }, AHORA);
  const hu = R.radioHuecos(ord);
  t('detecta el hueco de 1,4 km entre b y c', hu.length === 1 && hu[0].adelante.uid === 'b' && hu[0].atras.uid === 'c');
  t('100 m no es hueco', !hu.some(x => x.adelante.uid === 'a'));
  const ord2 = R.radioOrdenarPeloton({ a: m(3000), b: m(500), auto: m(1000, 'auto') }, AHORA);
  t('el que va detrás del auto se detecta', R.radioDetrasDeCola(ord2, 'auto').map(x => x.uid).join() === 'b');
  t('si la Cola es un ciclista, nadie va detrás', R.radioDetrasDeCola(ord, 'c').length === 0);
}

// ---- Frases al cambiar de rol ----
{
  const f1 = R.radioFrasesCambio({ punta: 'a' }, { punta: 'yo' }, 'yo', {});
  t('al nuevo se le avisa que su radio se oye', f1.length === 1 && /Ahora eres la Punta/.test(f1[0]));
  const f2 = R.radioFrasesCambio({ punta: 'yo' }, { punta: 'b' }, 'yo', {});
  t('al anterior se le avisa que ya no', /Ya no eres la Punta/.test(f2[0]));
  const f3 = R.radioFrasesCambio({ punta: 'a' }, { punta: 'b' }, 'yo', { b: 'Juan' });
  t('al resto: "Nueva punta: Juan."', f3[0] === 'Nueva punta: Juan.');
  t('sin cambios, silencio', R.radioFrasesCambio({ punta: 'a', cola: 'c' }, { punta: 'a', cola: 'c' }, 'yo', {}).length === 0);
}

// ---- Qué mensajes se reproducen ----
{
  const msg = (o) => Object.assign({ de: 'punta1', rol: 'punta', audio: 'data:audio/webm;base64,AAA', ts: AHORA }, o);
  t('mensaje de la Punta: se escucha', R.radioDebeReproducir(msg(), 'yo', AHORA - 1000, AHORA) === true);
  t('mensaje de la Cola: se escucha', R.radioDebeReproducir(msg({ rol: 'cola' }), 'yo', AHORA - 1000, AHORA) === true);
  t('el propio no se repite', R.radioDebeReproducir(msg({ de: 'yo' }), 'yo', AHORA - 1000, AHORA) === false);
  t('de antes de entrar no se relee', R.radioDebeReproducir(msg({ ts: AHORA - 5000 }), 'yo', AHORA - 1000, AHORA) === false);
  t('vencido (>10 min) no suena', R.radioDebeReproducir(msg({ ts: AHORA - 11 * 60000 }), 'yo', 0, AHORA) === false);
  t('rol inventado no suena', R.radioDebeReproducir(msg({ rol: 'oyente' }), 'yo', 0, AHORA) === false);
  t('sin audio no revienta', R.radioDebeReproducir({ de: 'x', ts: AHORA }, 'yo', 0, AHORA) === false);
}

// ---- Topes ----
t('máximo 20 s por mensaje', /const RADIO_MAX_MS=20000;/.test(SRC));
t('margen de 50 m', /const ROL_MARGEN_M=50;/.test(SRC));
t('sostenido 30 s', /const ROL_SOSTENIDO_MS=30000;/.test(SRC));
t('sin señal 60 s', /const ROL_SIN_SENAL_MS=60000;/.test(SRC));
t('Pistero primero: la radio espera si vozHablando', /_radioPisteroOcupado\(\)/.test(SRC) && /vozHablando/.test(SRC));
t('la radio se pausa si Pistero arranca a mitad', /a\.pause\(\)/.test(SRC.slice(SRC.indexOf('_radioVigia=setInterval'))));

// ---- Reglas de Realtime Database ----
const rr = RULES.rules.rodadaRadio && RULES.rules.rodadaRadio.$rodada;
t('existen reglas para rodadaRadio', !!rr);
if (rr) {
  t('solo los miembros leen la sala', /miembros'\)\.child\(auth\.uid\)\.exists\(\)/.test(rr['.read']));
  t('cada uno escribe solo su posición', rr.miembros.$uid['.write'] === 'auth != null && auth.uid === $uid');
  t('mensaje: solo si eres la Punta o la Cola en ese momento', /child\('roles'\)\.child\(newData\.child\('rol'\)\.val\(\)\)\.val\(\) === auth\.uid/.test(rr.msgs.$msg['.validate']));
  t('mensaje: tope de tamaño igual al del cliente', /length <= 120000/.test(rr.msgs.$msg.audio['.validate']) && /RADIO_MAX_CHARS=120000/.test(SRC));
  t('mensaje: no se edita, solo se crea o lo borra su autor', /!data\.exists\(\)/.test(rr.msgs.$msg['.write']) && /!newData\.exists\(\)/.test(rr.msgs.$msg['.write']));
  t('índices para las consultas por ts y de', JSON.stringify(rr.msgs['.indexOn']) === '["ts","de"]');
}

// ---- Cargado en la app y disponible sin señal ----
t('index.html carga rodada-radio.js', /<script src="rodada-radio\.js"><\/script>/.test(HTML));
t('sw.js lo precachea', /'\.\/rodada-radio\.js'/.test(SW));

// ---- El canal de avisos de un toque ya tiene regla (antes Firestore negaba todo) ----
t('firestore.rules tiene match /rodadaAvisos', /match \/rodadaAvisos\/\{id\}/.test(FSR));
t('rodadaAvisos: escribir exige estar inscrito', /esAsistente\(request\.resource\.data\.rodada\)/.test(FSR));

// ---- Pantalla (maqueta aprobada 2026-10-15): filas del pelotón ----
const UI = readFileSync(join(raiz, 'rodada-radio-ui.js'), 'utf8').replace(/\r\n/g, '\n');
const ROD = readFileSync(join(raiz, 'rodadas.js'), 'utf8');
{
  const iF = UI.indexOf('function radioFilasPeloton('); const fF = UI.indexOf('\n}\n', iF) + 2;
  const F = new Function('radioHuecos', UI.slice(UI.indexOf('const RR_FILAS_MAX'), UI.indexOf('\n', UI.indexOf('const RR_FILAS_MAX'))) + '\n' + UI.slice(iF, fF) + '\nreturn radioFilasPeloton;')(R.radioHuecos);
  const muchos = {}; for (let i = 0; i < 18; i++) muchos['c' + String(i).padStart(2, '0')] = m(12400 - i * 30);
  muchos.manuel = m(11000); muchos.auto = m(10800, 'auto');
  const ord = R.radioOrdenarPeloton(muchos, AHORA);
  const filas = F(ord, { punta: 'c00', cola: 'auto' }, 'c00');
  const nombres = filas.filter(f => f.tipo === 'm');
  t('20 en la sala: se ven pocas filas (≤ 7)', filas.length <= 7);
  t('la Punta va primero y marcada', nombres[0].uid === 'c00' && nombres[0].punta);
  t('la Cola (auto) va al final y marcada', nombres[nombres.length - 1].uid === 'auto' && nombres[nombres.length - 1].cola && nombres[nombres.length - 1].auto);
  t('el medio se resume en "+N ciclistas"', filas.some(f => f.tipo === 'grupo' && f.cuantos === ord.length - 4));
  t('el hueco de 890 m (último del grupo → Manuel) se marca como 900 m', filas.some(f => f.tipo === 'hueco' && f.metros === 900));
  const iH = filas.findIndex(f => f.tipo === 'hueco');
  t('la marca va justo antes de Manuel (el primero que quedó atrás), no arriba', filas[iH + 1] && filas[iH + 1].uid === 'manuel');
  const yoMedio = F(ord, { punta: 'c00', cola: 'auto' }, 'c09');
  t('si estás en el medio, igual te ves', yoMedio.some(f => f.tipo === 'm' && f.uid === 'c09' && f.yo));
  const pocos = F(R.radioOrdenarPeloton({ a: m(300), b: m(200), c: m(100) }, AHORA), { punta: 'a', cola: 'c' }, 'b');
  t('con pocos se ven todos, sin resumen', pocos.length === 3 && !pocos.some(f => f.tipo === 'grupo'));
}
t('el botón apagado dice por qué (no hay botones que no respondan)', /Solo hablan la Punta y la Cola/.test(UI) && /b\.disabled=!habla/.test(UI));
t('si se suelta antes de abrir el micrófono, se corta al abrir', /if\(ok && !apretado\) radioTerminarDeHablar\(\)/.test(UI));
t('botón del audífono: Media Session + tecla multimedia', /mediaSession\.setActionHandler/.test(UI) && /MediaPlayPause/.test(UI));
t('audífono: un toque graba, otro envía', /if\(_radioRecorder\)\{ radioTerminarDeHablar\(\)/.test(UI));
t('si deja de ser Punta/Cola se apaga el audífono', /if\(!habla\) radioAudifono\(false, true\)/.test(UI));
t('la rodada ofrece "Entrar a la radio" a los confirmados el día', /Entrar a la radio de la rodada/.test(ROD) && /voy && typeof radioEntrarDesdeRodada/.test(ROD));
t('al volver a abrir la app, se reengancha sola', /radioReanudar\(\)/.test(ROD));
t('index.html tiene el panel y carga la pantalla', /id="rrPanel"/.test(HTML) && /<script src="rodada-radio-ui\.js"><\/script>/.test(HTML));
t('sw.js precachea la pantalla', /'\.\/rodada-radio-ui\.js'/.test(SW));

console.log('  rodada-radio.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
