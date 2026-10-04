// Taller v2 (2026-10-04): reglas reales de documentos, odómetro, intervalos del manual,
// gasto anual, notificaciones y respaldo en la nube -- contra el código REAL (se extrae,
// no se reimplementa), igual que mantencion.test.mjs / mantencion-vehiculo.test.mjs.
// Fuentes de las reglas que se verifican acá:
//  - Revisión Técnica por último dígito de patente: calendario MTT (9 ene, 0 feb, 1 abr,
//    2 may, 3 jun, 4 jul, 5 ago, 6 sep, 7 oct, 8 nov).
//  - Permiso de Circulación y SOAP: 31 de marzo; 2ª cuota del Permiso: 31 de agosto
//    (ChileAtiende, ficha 9611).
//  - Auto nuevo: primera Revisión Técnica a más tardar a los 48 meses del CHI (Decreto 104).
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_ALL = ['mantencion-preventiva.js', 'mantencion-vehiculo.js', 'taller-avisos.js', 'gamificacion-logros.js']
  .map((f) => readFileSync(join(raiz, f), 'utf8')).join('\n');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

function bloque(desde) {
  const i = SRC_ALL.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré -> ' + desde); process.exit(1); }
  let prof = 0, q = null;
  for (let k = SRC_ALL.indexOf('{', i); k < SRC_ALL.length; k++) {
    const c = SRC_ALL[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && SRC_ALL[k + 1] === '/') { k = SRC_ALL.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return SRC_ALL.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

const PIEZAS = [
  'const MANT_ITEMS=', 'function _mantData(){', 'function _mantProgreso(key, data){',
  'const VEH_ITEMS=', 'function _vehData(){', 'function _vehProgreso(key, data){', 'function _vehCfg(){',
  'function _vehItemsVisibles(){', 'function _vehSetOdometro(valor){', 'function _gastoAnio(data){', 'function _vehEnUso(){',
  'const DOC_ITEMS=', 'function _docData(){', 'function _docEstado(key, data){', 'const RT_MES_POR_DIGITO=',
  'function _isoFecha(anio, mes, dia){', 'function _ultimoDiaMes(anio, mes){', 'function _docCalcVence(key, cfg, hecho, hoy){',
  'function _docRecalcular(forzar){', 'function _docRevisarAvisos(){',
  'function _tallerNotifBiciActiva(){', 'function _tallerNotifVehActiva(){', 'function _tallerFechaAviso(fechaISO, diasAntes){',
  'function _tallerFechaVenceTiempo(fechaUltimo, meses){', 'function _tallerNotificacionesFuturas(ahora){', 'function _tallerFechaTxt(iso){',
  'function _tallerPendientes(){', 'function _vehCfgParaNube(){', 'function _vehParaNube(){', 'function _docParaNube(){'
].map(bloque).join('\n');

const api = new Function('us', 'actividadTipo', 'localStorage', 'h',
  'const TALLER_NOTIF_ID_MIN=7100, TALLER_NOTIF_ID_MAX=7989; const TALLER_HORA_AVISO=10;\n' + PIEZAS +
  '\nreturn {_mantData,_mantProgreso,_vehData,_vehProgreso,_vehCfg,_vehItemsVisibles,_vehSetOdometro,_gastoAnio,_docData,_docEstado,_docCalcVence,_docRecalcular,_docRevisarAvisos,_tallerNotificacionesFuturas,_tallerPendientes,_vehCfgParaNube,_vehParaNube,_docParaNube,VEH_ITEMS,MANT_ITEMS,DOC_ITEMS};');
const lsVacio = { getItem: () => null, setItem: () => {} };
const crear = (us, modo) => { const dichos = []; const a = api(us, modo || 'ciclismo', lsVacio, (m) => dichos.push(m)); a.dichos = dichos; return a; };
const D = (s) => new Date(s + 'T09:00:00');

// ---- 1) Revisión Técnica: cada dígito cae en su mes del calendario MTT ----
{
  const a = crear({});
  const esperado = { 9: '2026-01-31', 0: '2026-02-28', 1: '2026-04-30', 2: '2026-05-31', 3: '2026-06-30', 4: '2026-07-31', 5: '2026-08-31', 6: '2026-09-30', 7: '2026-10-31', 8: '2026-11-30' };
  Object.keys(esperado).forEach((dig) => {
    const v = a._docCalcVence('revisionTecnica', { digito: Number(dig) }, null, D('2026-01-01'));
    debe('patente termina en ' + dig + ' -> vence ' + esperado[dig] + ' (dio ' + v + ')', v === esperado[dig]);
  });
  debe('sin dígito y sin auto nuevo: no inventa fecha', a._docCalcVence('revisionTecnica', { digito: null }, null, D('2026-05-01')) === null);
}
// ---- 2) Revisión Técnica: ciclos, "ya la hice" y el margen de 31 días ----
{
  const a = crear({});
  debe('dígito 3 (junio) visto en octubre: pasó hace >31 días -> el del año siguiente',
    a._docCalcVence('revisionTecnica', { digito: 3 }, null, D('2026-10-04')) === '2027-06-30');
  debe('dígito 6 (septiembre) visto el 4 de octubre: pasó hace 4 días -> se muestra (vencido, puede corregirlo)',
    a._docCalcVence('revisionTecnica', { digito: 6 }, null, D('2026-10-04')) === '2026-09-30');
  debe('dígito 7 (octubre) marcado como hecho -> octubre del año siguiente',
    a._docCalcVence('revisionTecnica', { digito: 7 }, '2026-10-31', D('2026-10-04')) === '2027-10-31');
}
// ---- 3) Permiso y SOAP: 31 de marzo; 2ª cuota: 31 de agosto solo si paga en cuotas ----
{
  const a = crear({});
  ['permisoCirculacion', 'soap'].forEach((k) => {
    debe(k + ' visto en octubre -> 31 de marzo siguiente', a._docCalcVence(k, {}, null, D('2026-10-04')) === '2027-03-31');
    debe(k + ' visto en febrero -> 31 de marzo de ese año', a._docCalcVence(k, {}, null, D('2027-02-10')) === '2027-03-31');
    debe(k + ' el 15 de abril sin pagar -> sigue mostrando el 31 de marzo (vencido)', a._docCalcVence(k, {}, null, D('2027-04-15')) === '2027-03-31');
    debe(k + ' pagado -> 31 de marzo del año siguiente', a._docCalcVence(k, {}, '2027-03-31', D('2027-04-15')) === '2028-03-31');
  });
  debe('2ª cuota sin pago en cuotas: no existe', a._docCalcVence('permisoCuota2', { cuotas: false }, null, D('2026-10-04')) === null);
  debe('2ª cuota configurada en octubre: no grita "vencida" por el 31 de agosto pasado',
    a._docCalcVence('permisoCuota2', { cuotas: true }, null, D('2026-10-04')) === '2027-08-31');
  debe('2ª cuota vista en agosto -> 31 de agosto de ese año', a._docCalcVence('permisoCuota2', { cuotas: true }, null, D('2027-08-05')) === '2027-08-31');
}
// ---- 4) Auto nuevo: a más tardar 48 meses del CHI (Decreto 104); después, por dígito ----
{
  const a = crear({});
  debe('CHI 15-01-2026 -> primera revisión a más tardar el 15-01-2030',
    a._docCalcVence('revisionTecnica', { nuevo: true, chiFecha: '2026-01-15', digito: 2 }, null, D('2026-10-04')) === '2030-01-15');
  debe('tras hacer la primera, pasa al calendario del dígito',
    a._docCalcVence('revisionTecnica', { nuevo: true, chiFecha: '2026-01-15', digito: 2 }, '2030-01-15', D('2030-02-01')) === '2030-05-31');
}
// ---- 5) Odómetro real: corre todo sin perder lo que llevaba cada ítem ----
{
  const us = { vehKm: 1200 };
  const a = crear(us, 'moto');
  a._vehData();
  us.veh.aceite.kmBase = 200;                       // lleva 1.000 km desde el cambio
  const antes = a._vehProgreso('aceite').km;
  debe('setOdometro acepta un valor válido', a._vehSetOdometro(84250) === true);
  debe('us.vehKm pasa a ser el odómetro', us.vehKm === 84250);
  debe('el aceite conserva los 1.000 km que llevaba', a._vehProgreso('aceite').km === antes && antes === 1000);
  debe('queda registrada la fecha del odómetro', typeof us.vehCfg.odoFecha === 'string');
  debe('rechaza un odómetro negativo', a._vehSetOdometro(-5) === false && us.vehKm === 84250);
  debe('rechaza basura', a._vehSetOdometro('abc') === false);
}
// ---- 6) Intervalo del manual del usuario manda sobre el de fábrica, y se puede quitar ----
{
  const us = { vehKm: 0 };
  const a = crear(us);
  a._vehData(); us.veh.aceite.umbralKmUser = 5000; us.veh.aceite.umbralMesesUser = 6; a._vehData();
  debe('aceite usa 5.000 km del manual', us.veh.aceite.umbralKm === 5000 && us.veh.aceite.umbralMeses === 6);
  us.veh.aceite.umbralKmUser = null; us.veh.aceite.umbralMesesUser = null; a._vehData();
  debe('sin ajuste vuelve a 10.000 km / 12 meses', us.veh.aceite.umbralKm === 10000 && us.veh.aceite.umbralMeses === 12);
}
// ---- 7) Cadena de moto solo para motos ----
{
  const us = {}; const a = crear(us);
  a._vehCfg();
  debe('auto: no muestra la cadena de moto', a._vehItemsVisibles().indexOf('cadenaMoto') === -1);
  us.vehCfg.tipo = 'moto';
  debe('moto: sí muestra la cadena (lubricar cada 500 km)', a._vehItemsVisibles().indexOf('cadenaMoto') !== -1 && a.VEH_ITEMS.cadenaMoto.umbralKm === 500);
}
// ---- 8) Gasto anual: solo el año en curso, solo costos válidos ----
{
  const a = crear({});
  const anio = new Date().getFullYear();
  const data = {
    aceite: { historial: [{ fecha: anio + '-03-10T12:00:00Z', costo: 45000 }, { fecha: (anio - 1) + '-11-10T12:00:00Z', costo: 10000 }] },
    frenos: { historial: [{ fecha: anio + '-06-01T12:00:00Z', costo: 18990 }, { fecha: anio + '-07-01T12:00:00Z', costo: NaN }, { fecha: anio + '-07-02T12:00:00Z', costo: null }] }
  };
  debe('suma 45.000 + 18.990 = 63.990 (ignora el año pasado, NaN y null)', a._gastoAnio(data) === 63990);
  debe('sin historial: 0', a._gastoAnio({}) === 0);
}
// ---- 9) Notificaciones programadas: 30, 7 y 0 días, a las 10:00, solo futuras ----
{
  const us = { vehCfg: { tipo: 'auto', digito: null, notif: true, cuotas: false } };
  const a = crear(us, 'ciclismo');
  a._docData();
  const v = new Date(Date.now() + 40 * 86400000);
  const venceISO = v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
  us.doc.revisionTecnica.vence = venceISO; us.doc.revisionTecnica.manual = true;
  const lista = a._tallerNotificacionesFuturas(new Date());
  const rt = lista.filter((n) => /Revisión Técnica/.test(n.title));
  debe('Revisión Técnica a 40 días: 3 avisos (30, 7 y el día)', rt.length === 3);
  debe('todos a las 10:00', rt.every((n) => n.at.getHours() === 10 && n.at.getMinutes() === 0));
  const dias = rt.map((n) => Math.round((new Date(venceISO + 'T10:00:00') - n.at) / 86400000)).sort((x, y) => x - y);
  debe('a 0, 7 y 30 días del vencimiento (dio ' + dias.join(',') + ')', dias.join(',') === '0,7,30');
  debe('ningún aviso en el pasado', lista.every((n) => n.at.getTime() > Date.now()));
  debe('ids únicos y en el rango del Taller', new Set(lista.map((n) => n.id)).size === lista.length && lista.every((n) => n.id >= 7100 && n.id <= 7899));
  debe('textos con concordancia: "Agéndala" para la Revisión Técnica', rt.some((n) => /Agéndala/.test(n.body)));
  us.vehCfg.notif = false;
  debe('con avisos del vehículo apagados: no programa documentos', a._tallerNotificacionesFuturas(new Date()).filter((n) => /Revisión Técnica|Permiso|SOAP/.test(n.title)).length === 0);
}
// ---- 10) Avisos dentro de la app: concordancia de género y sin estar en modo Motorizado ----
{
  const us = { vehCfg: { tipo: 'auto', notif: true } };
  const a = crear(us, 'ciclismo');                  // pedaleando: igual debe avisar del auto
  a._docData();
  const ayer = new Date(Date.now() - 86400000);
  us.doc.permisoCirculacion.vence = ayer.toISOString().slice(0, 10); us.doc.permisoCirculacion.manual = true;
  a._docRevisarAvisos();
  const m = a.dichos.join(' | ');
  debe('avisa el Permiso vencido aunque hoy ande en bici', /Permiso de Circulación/.test(m));
  debe('"VENCIDO" (masculino) para el Permiso, no "VENCIDA" (dijo: ' + m + ')', /VENCIDO/.test(m) && !/Circulación está VENCIDA/.test(m));
  a.dichos.length = 0; a._docRevisarAvisos();
  debe('no repite el mismo aviso', a.dichos.length === 0);
}
// ---- 11) Recuadro de Inicio: junta bici + vehículo ----
{
  const us = { mantKm: 1500, vehCfg: { tipo: 'auto', notif: true }, vehKm: 9000 };
  const a = crear(us, 'ciclismo');
  a._mantData(); a._vehData();
  // Un ítem recién creado empieza a contar desde el odómetro actual (no inventa desgaste);
  // acá se simula un aceite cambiado a los 0 km, que ya lleva 9.000.
  us.veh.aceite.kmBase = 0;
  debe('ítem nuevo arranca contando desde el odómetro actual (no inventa desgaste)', a._vehProgreso('frenos').km === 0);
  const p = a._tallerPendientes();
  debe('cadena con 1.500 km (recordatorio cada 1.000) aparece pendiente', p.some((x) => x.sec === 'bici' && /Cadena/.test(x.t)));
  debe('aceite con 9.000/10.000 km aparece "pronto"', p.some((x) => x.sec === 'veh' && /Aceite/.test(x.t) && /pronto/.test(x.t)));
}
// ---- 12) Respaldo en la nube: nada undefined/NaN en los campos nuevos ----
{
  const us = { vehCfg: { tipo: 'moto', digito: 7.5, nuevo: true, chiFecha: 'basura', cuotas: 1, notif: undefined, odoFecha: '2026-10-04T10:00:00Z' },
               veh: { aceite: { kmBase: 1, fecha: '2026-01-01', umbralKmUser: NaN, umbralMesesUser: 6, historial: [] } },
               doc: { soap: { vence: '2027-03-31', hecho: '2026-03-31', manual: 'x' } } };
  const a = crear(us);
  const c = a._vehCfgParaNube(), v = a._vehParaNube(), d = a._docParaNube();
  const sucio = [];
  (function hurga(o, r) { if (o === null) return; if (typeof o === 'undefined') { sucio.push(r); return; } if (typeof o === 'number' && !isFinite(o)) { sucio.push(r); return; } if (typeof o === 'object') for (const k in o) hurga(o[k], r + '.' + k); })({ c, v, d }, 'raiz');
  debe('sin undefined/NaN: ' + sucio.join(', '), sucio.length === 0);
  debe('dígito inválido (7.5) se sube como null', c.digito === null);
  debe('fecha CHI basura se sube como null', c.chiFecha === null);
  debe('intervalo NaN se sube como null y el válido se conserva', v.aceite.umbralKmUser === null && v.aceite.umbralMesesUser === 6);
  debe('"ya lo pagué" viaja a la nube', d.soap.hecho === '2026-03-31' && d.soap.manual === true);
}
// ---- 13) Restaurar desde la nube: nunca pisar, rescatar lo que falta ----
{
  const RESTAURAR = bloque('function _restaurarDesdeNube(nube){');
  const correr = new Function('us', 'nube', PIEZAS.replace(/function _docRevisarAvisos[\s\S]*?\n\}/, '') + '\nfunction _mantData(){}\n' + RESTAURAR.slice(RESTAURAR.indexOf('{') + 1, -1));
  const us = { vehKm: 100, veh: { aceite: { kmBase: 50, fecha: '2026-05-01', historial: [{}, {}] } }, doc: { soap: { vence: '2027-03-31', hecho: null } } };
  correr(us, { vehKm: 0, veh: { aceite: { kmBase: 10, fecha: '2026-01-01', historial: [{}], umbralKmUser: 5000 } },
               doc: { soap: { vence: '2027-03-31', hecho: '2026-03-31' } },
               vehCfg: { tipo: 'moto', digito: 4, notif: true } });
  debe('el intervalo del manual se rescata aunque el teléfono gane el registro', us.veh.aceite.umbralKmUser === 5000 && us.veh.aceite.historial.length === 2);
  debe('"ya lo pagué" más nuevo de la nube se rescata', us.doc.soap.hecho === '2026-03-31');
  debe('teléfono sin configuración: se rescata la de la nube', us.vehCfg && us.vehCfg.tipo === 'moto' && us.vehCfg.digito === 4);
  const us2 = { vehCfg: { tipo: 'auto', digito: 1 } };
  correr(us2, { vehCfg: { tipo: 'moto', digito: 9 } });
  debe('configuración ya existente en el teléfono NO se pisa', us2.vehCfg.tipo === 'auto' && us2.vehCfg.digito === 1);
}

console.log('  taller-v2.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
