// Mantención preventiva: los 3 arreglos del 2026-08-24, contra el código REAL del
// index.html (se extrae, no se reimplementa — si alguien cambia la función, esto lo evalúa).
//   1. Neumáticos (umbralKm:null) tienen que poder vencer por TIEMPO, incluso para
//      usuarios que ya abrieron Taller antes del arreglo (migración de fecha:null).
//   2. La mantención tiene que viajar a la nube sin poder tumbar la escritura de los km.
//   3. Al restaurar, gana el registro más avanzado — jamás se pisa lo bueno con lo pobre.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

// Recorta un bloque balanceando llaves, ignorando strings y comentarios de línea.
function bloque(desde) {
  const i = HTML.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré en index.html -> ' + desde); process.exit(1); }
  let prof = 0, q = null;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) {
    const c = HTML[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && HTML[k + 1] === '/') { k = HTML.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return HTML.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

const SRC = bloque('const MANT_ITEMS=') + '\n'
          + bloque('function _mantData(){') + '\n'
          + bloque('function _mantProgreso(key, data){') + '\n'
          + bloque('function _mantParaNube(){');
const api = new Function('us', SRC + '\nreturn {_mantData:_mantData,_mantProgreso:_mantProgreso,_mantParaNube:_mantParaNube,MANT_ITEMS:MANT_ITEMS};');

const MES = 1000 * 60 * 60 * 24 * 30.44;

// ---- 1) Neumáticos: 100% por tiempo, nunca por km ----
{
  const us = { mantKm: 0 };
  const a = api(us);
  a._mantData();
  debe('usuario nuevo: neumáticos arrancan CON fecha (si no, nunca cuentan)', !!us.mant.neumaticos.fecha);
  debe('usuario nuevo: neumáticos recién puestos no están vencidos', !a._mantProgreso('neumaticos').vencido);

  // 24 meses + 1 día de antigüedad -> vencido, aunque el usuario no haya pedaleado NADA.
  us.mant.neumaticos.fecha = new Date(Date.now() - (24 * MES + 86400000)).toISOString();
  debe('neumáticos vencen por tiempo a los 24 meses con 0 km recorridos', a._mantProgreso('neumaticos').vencido);
  debe('...y eso pasa con umbralKm null (no aporta km al porcentaje)', a.MANT_ITEMS.neumaticos.umbralKm === null);
}

// ---- 1b) MIGRACIÓN: quien ya abrió Taller antes del arreglo tenía fecha:null ----
{
  const us = { mantKm: 0, mant: { neumaticos: { kmBase: 0, fecha: null, umbralKm: null, umbralMeses: 24, historial: [], avisado: false } } };
  const a = api(us);
  a._mantData();
  debe('usuario ANTIGUO con fecha:null recibe una fecha (si no, el aviso jamás se dispara)', !!us.mant.neumaticos.fecha);
  debe('la migración no le inventa historial', us.mant.neumaticos.historial.length === 0);
}

// ---- 1c) La migración NO debe pisar una fecha real ya guardada ----
{
  const real = new Date(Date.now() - 5 * MES).toISOString();
  const us = { mantKm: 0, mant: { cadena: { kmBase: 900, fecha: real, umbralKm: 2500, umbralMeses: 12, historial: [{ fecha: real, km: 900, costo: 12000, nota: 'taller' }], avisado: false } } };
  const a = api(us);
  a._mantData();
  debe('la migración respeta la fecha real del usuario', us.mant.cadena.fecha === real);
  debe('la migración respeta kmBase', us.mant.cadena.kmBase === 900);
  debe('la migración respeta el historial', us.mant.cadena.historial.length === 1);
  debe('la migración re-sincroniza el umbral desde MANT_ITEMS', us.mant.cadena.umbralKm === a.MANT_ITEMS.cadena.umbralKm);
}

// ---- 2) Subida a la nube: ni un undefined/NaN, o se cae también la escritura de los km ----
{
  const us = { mantKm: 1234.5, mant: { cadena: { kmBase: 100, fecha: new Date().toISOString(), umbralKm: 2500, umbralMeses: 12, avisado: false,
    historial: [{ fecha: new Date().toISOString(), km: 100, costo: undefined, nota: undefined },
                { fecha: new Date().toISOString(), km: NaN, costo: NaN, nota: 5 }] } } };
  const payload = api(us)._mantParaNube();
  const sucio = [];
  (function hurga(o, ruta) {
    if (o === null) return;
    if (typeof o === 'undefined') { sucio.push(ruta + ' = undefined'); return; }
    if (typeof o === 'number' && !isFinite(o)) { sucio.push(ruta + ' = ' + o); return; }
    if (typeof o === 'object') for (const k in o) hurga(o[k], ruta + '.' + k);
  })(payload, 'mant');
  debe('la carga a Firestore no lleva undefined ni NaN: ' + sucio.join(', '), sucio.length === 0);
  debe('la nota basura (número) se descarta, no se sube cruda', payload.cadena.historial[1].nota === null);
  debe('los umbrales NO se suben (mandan MANT_ITEMS, no la nube)', payload.cadena.umbralKm === undefined);

  const largo = api({ mantKm: 0, mant: { cadena: { kmBase: 0, fecha: null,
    historial: Array.from({ length: 50 }, () => ({ fecha: new Date().toISOString(), km: 1, costo: null, nota: null })) } } })._mantParaNube();
  debe('el historial se recorta a 30 entradas como máximo', largo.cadena.historial.length === 30);
}

// ---- 3) Restauración: gana el más avanzado, nunca se pierde lo del usuario ----
{
  // El corte deja abierto el `if(nube.mant ...){` (lo que sigue en el index.html es solo
  // la re-fijación de umbrales desde MANT_ITEMS, que acá no aplica): se cierra a mano.
  const RESTORE = HTML.slice(HTML.indexOf('const kmMantNube='), HTML.indexOf('// los umbrales los vuelve a fijar _mantData()')) + '\n}\n';
  const correr = new Function('us', 'nube', SRC + '\nlet restaurado=false;\n' + RESTORE + '\nreturn restaurado;');
  const f = (n) => Array.from({ length: n }, (_, i) => ({ fecha: new Date(2026, 0, i + 1).toISOString(), km: 10, costo: null, nota: null }));

  // (a) teléfono nuevo, vacío: la nube tiene que repoblarlo
  {
    const us = { mantKm: 0, mant: {} };
    correr(us, { mantKm: 800, mant: { cadena: { kmBase: 500, fecha: '2026-06-01T00:00:00.000Z', avisado: false, historial: f(3) } } });
    debe('teléfono nuevo: se restaura mantKm desde la nube', us.mantKm === 800);
    debe('teléfono nuevo: se restaura el historial completo', us.mant.cadena.historial.length === 3);
  }

  // (b) EL CASO QUE NO SE PUEDE ROMPER: el teléfono sabe más que la nube
  {
    const us = { mantKm: 2000, mant: { cadena: { kmBase: 1500, fecha: '2026-08-01T00:00:00.000Z', avisado: false, historial: f(7) } } };
    correr(us, { mantKm: 800, mant: { cadena: { kmBase: 500, fecha: '2026-06-01T00:00:00.000Z', avisado: false, historial: f(3) } } });
    debe('la nube vieja NO borra los km de mantención del teléfono', us.mantKm === 2000);
    debe('la nube vieja NO borra el historial del teléfono', us.mant.cadena.historial.length === 7);
    debe('la nube vieja NO retrocede el kmBase', us.mant.cadena.kmBase === 1500);
  }

  // (c) coherencia: kmBase, fecha e historial se escriben JUNTOS, no mezclados
  {
    const us = { mantKm: 0, mant: { cadena: { kmBase: 1500, fecha: '2026-08-01T00:00:00.000Z', avisado: false, historial: f(2) } } };
    correr(us, { mantKm: 0, mant: { cadena: { kmBase: 500, fecha: '2026-06-01T00:00:00.000Z', avisado: false, historial: f(9) } } });
    debe('gana la nube por tener más cambios registrados', us.mant.cadena.historial.length === 9);
    debe('...y se lleva SU kmBase, no el del teléfono', us.mant.cadena.kmBase === 500);
    debe('...y SU fecha, no la del teléfono', us.mant.cadena.fecha === '2026-06-01T00:00:00.000Z');
  }

  // (d) empate de historial: desempata el kmBase más alto
  {
    const us = { mantKm: 0, mant: { cadena: { kmBase: 100, fecha: '2026-01-01T00:00:00.000Z', avisado: false, historial: f(2) } } };
    correr(us, { mantKm: 0, mant: { cadena: { kmBase: 900, fecha: '2026-01-01T00:00:00.000Z', avisado: false, historial: f(2) } } });
    debe('con igual historial, gana el kmBase más alto', us.mant.cadena.kmBase === 900);
  }
}

// ---- 4) El desgaste por clima no puede depender de la voz ----
{
  debe('vigilarClima ya no corta antes de aplicar el clima cuando la voz está apagada',
       !HTML.includes("if(!vozActiva && !window.climaFxSetMode) return;"));
  const m = HTML.match(/function vigilarClima\(lat,lon\)\{[\s\S]{0,2500}?_climaFxAplicar\(w\);/);
  debe('vigilarClima sigue llegando a _climaFxAplicar()', !!m);
  debe('el freno real de la API (15 min) sigue en pie', !!(m && m[0].includes('CLIMA_MIN_ENTRE_CHEQUEOS')));
  debe('el aviso HABLADO sigue apagado si la voz está apagada',
       HTML.includes("if(!vozActiva) return; // el resto de la funcion es solo para el AVISO hablado"));
}

// ---- 5) El guard de au() no puede dejar Taller en blanco ----
// renderMantencion() se volvio condicional a que Taller este visible (para no reconstruir
// 5 tarjetas en cada punto de GPS). Eso esta bien, PERO au() corre al iniciar la app con
// Inicio a la vista: si nadie renderiza al ABRIR Taller, la lista sale vacia para quien no
// va pedaleando. Estos asserts son justo los que faltaban cuando se introdujo el guard.
// Se mira la funcion cv() ENTERA (llaves balanceadas, no una ventana de caracteres: cv()
// vive en una sola linea kilometrica y un regex por tamano se rompe al primer retoque).
{
  debe('au() renderiza Taller solo si esta visible (ahorro de bateria)',
       /if\(typeof renderMantencion==='function'\)\{[^\n]*v-mac[^\n]*\}/.test(HTML));

  // Se borran los comentarios /* */ ANTES de mirar: el comentario que explica este mismo
  // arreglo menciona `renderMantencion()`, así que sin esto el test pasaba por leerse a sí
  // mismo aunque la llamada real no estuviera (lo cazó una prueba de mutación).
  // Solo bloques /* */, no `//`: cv() vive en una sola línea y un `https://` cualquiera
  // se llevaría por delante todo lo que viene después.
  const CV = bloque('function cv(id, _esVolver){').replace(/\/\*[\s\S]*?\*\//g, '');
  debe("cv() abre la vista 'mac'", CV.includes("id==='mac'"));
  debe('abrir Taller renderiza la lista (si no, sale vacia sin GPS)', CV.includes('renderMantencion()'));
}

// ---- 6) ORDEN: no subir la mantencion antes de haber leido la nube ----
// Es la trampa que ya costo kilometros el 2026-07-20, y con la mantencion muerde mas
// fuerte: `historial` es un ARRAY y Firestore con {merge:true} REEMPLAZA arrays enteros.
// Telefono nuevo -> us.mant vacio -> salta un logro en los primeros 4 segundos ->
// _ganarDarma() -> sincronizarStats() sube historiales VACIOS y borra los de la nube ->
// cuando sincronizarAlEntrar() corre, ya no queda nada que restaurar.
{
  const SS = bloque('async function sincronizarStats()');
  debe('sincronizarStats arma el payload en una variable, no inline',
       /const datos=\{/.test(SS));
  debe('la mantencion solo se agrega si ya se leyo la nube',
       /if\(_mantListoParaSubir\)\{[\s\S]*?datos\.mant=_mantParaNube\(\)/.test(SS));
  debe('los km y el Darma SIGUEN subiendo siempre (son numeros, los protege gana-el-mayor)',
       /const datos=\{km:us\.di\|\|0[\s\S]*?darma:us\.d\|\|0/.test(SS));
  debe('la bandera arranca cerrada', /let _mantListoParaSubir=false;/.test(HTML));

  const SAE = bloque('function sincronizarAlEntrar()');
  debe('la compuerta se abre DESPUES de leer la nube y ANTES de subir',
       SAE.indexOf('_mantListoParaSubir=true;') < SAE.indexOf('sincronizarStats();') &&
       SAE.indexOf('_mantListoParaSubir=true;') > SAE.indexOf("collection('users').doc(cu).get()"));
  debe('si la lectura falla, la compuerta igual se abre (si no, esa cuenta nunca sincroniza)',
       (SAE.match(/_mantListoParaSubir=true;/g) || []).length === 2);
}

// ---- 7) Un guard por feature: clima != efectos != desgaste != voz ----
// vigilarClima() alimenta TRES cosas independientes: el aviso hablado, los efectos visuales
// y el factor de desgaste de la mantencion. Cada vez que un solo guard sirvio a varias, una
// quedo rota en silencio. Aca se fija el orden correcto de una vez.
{
  const VC = bloque('async function vigilarClima(lat,lon){');
  const iChequeo = VC.indexOf('CLIMA_MIN_ENTRE_CHEQUEOS');
  const iAplicar = VC.indexOf('_climaFxAplicar(w);');
  const iVoz     = VC.indexOf('if(!vozActiva) return;');
  const iAviso   = VC.indexOf('CLIMA_MIN_ENTRE_AVISOS');
  debe('el freno de CONSULTA a la API sigue primero (es el que limita el trafico)',
       iChequeo >= 0 && iChequeo < iAplicar);
  debe('el clima se APLICA antes de cualquier chequeo de voz (efectos + desgaste)',
       iAplicar >= 0 && iVoz >= 0 && iAplicar < iVoz);
  debe('el freno de AVISO quedo DESPUES de aplicar el clima, no antes',
       iAviso >= 0 && iAviso > iAplicar);
  debe('...y despues del chequeo de voz: solo frena al que habla', iAviso > iVoz);
  debe('el freno de aviso ya no mira vozActiva (esa condicion ahora esta arriba)',
       !/if\(vozActiva && _climaBase && [^\n]*CLIMA_MIN_ENTRE_AVISOS/.test(VC));
}

console.log('  mantencion.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
