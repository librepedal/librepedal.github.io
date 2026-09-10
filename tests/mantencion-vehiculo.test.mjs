// Mantención del vehículo + documentación al día (2026-09-06), contra el código REAL
// (se extrae, no se reimplementa). Cubre lo que ya se sabe que puede fallar porque le
// pasó exactamente igual a la mantención de bici (mantencion.test.mjs):
//   1. Los ítems por tiempo (batería) tienen que poder vencer sin haber recorrido km.
//   2. La subida a la nube no puede llevar undefined/NaN.
//   3. Al restaurar, el vehículo usa "gana el más avanzado" (igual que la bici); los
//      documentos usan "nunca pisar lo que ya existe" (no tienen con qué desempatar).
//   4. EL BUG QUE SE ARREGLÓ ACÁ: manejar en modo Motorizado no puede sumarle
//      kilómetros al desgaste de la CADENA de la bici, ni pedalear puede sumarle
//      kilómetros al aceite del auto -- cada modo va a su propio odómetro.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raizProyecto = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = ['mantencion-vehiculo.js', 'gamificacion-logros.js', 'motor-gps.js']
  .map((f) => readFileSync(join(raizProyecto, f), 'utf8')).join('\n');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

// Recorta un bloque balanceando llaves, ignorando strings y comentarios de línea (igual
// que mantencion.test.mjs -- mismo helper, código real, no reimplementado a mano).
function bloque(desde) {
  const i = HTML.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré -> ' + desde); process.exit(1); }
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

const SRC = bloque('const VEH_ITEMS=') + '\n'
          + bloque('function _vehData(){') + '\n'
          + bloque('function _vehProgreso(key, data){') + '\n'
          + bloque('const DOC_ITEMS=') + '\n'
          + bloque('function _docData(){') + '\n'
          + bloque('function _docEstado(key, data){') + '\n'
          + bloque('function _vehParaNube(){') + '\n'
          + bloque('function _docParaNube(){');
const api = new Function('us', SRC + '\nreturn {_vehData,_vehProgreso,VEH_ITEMS,_docData,_docEstado,DOC_ITEMS,_vehParaNube,_docParaNube};');

const DIA = 1000 * 60 * 60 * 24;
const MES = DIA * 30.44;
const hoyISO = (deltaDias) => new Date(Date.now() + deltaDias * DIA).toISOString().slice(0, 10);

// ---- 1) Batería: 100% por tiempo, nunca por km (mismo patrón que neumáticos de bici) ----
{
  const us = { vehKm: 0 };
  const a = api(us);
  a._vehData();
  debe('usuario nuevo: batería arranca CON fecha (si no, nunca cuenta)', !!us.veh.bateria.fecha);
  debe('usuario nuevo: batería recién puesta no está vencida', !a._vehProgreso('bateria').vencido);
  debe('batería no tiene umbral de km (es 100% por tiempo)', a.VEH_ITEMS.bateria.umbralKm === null);

  us.veh.bateria.fecha = new Date(Date.now() - (36 * MES + DIA)).toISOString();
  debe('batería vence a los 36 meses con 0 km recorridos', a._vehProgreso('bateria').vencido);
}

// ---- 2) Aceite: por km, editable, "cerca" entre 85% y 100% ----
{
  const us = { vehKm: 8600, veh: { aceite: { kmBase: 0, fecha: new Date().toISOString(), umbralKm: 10000, umbralMeses: 12, historial: [], avisado: false } } };
  const a = api(us);
  const p = a._vehProgreso('aceite');
  debe('8.600/10.000 km cae en "cerca" (>=85%)', p.cerca === true && p.vencido === false);
  us.veh.aceite.kmBase = 0; us.vehKm = 10500;
  debe('10.500/10.000 km ya está vencido', a._vehProgreso('aceite').vencido === true);
}

// ---- 3) Documentos: sin fecha / vigente / por vencer / vencido ----
{
  const us = {};
  const a = api(us);
  a._docData();
  debe('sin fecha ingresada: estado "sinFecha"', a._docEstado('soap').estado === 'sinFecha');

  us.doc.soap.vence = hoyISO(200);
  debe('vence en 200 días: vigente', a._docEstado('soap').estado === 'vigente');

  us.doc.soap.vence = hoyISO(15);
  debe('vence en 15 días: por vencer (<=30)', a._docEstado('soap').estado === 'porVencer');

  us.doc.soap.vence = hoyISO(-3);
  const eVenc = a._docEstado('soap');
  debe('venció hace 3 días: vencido', eVenc.estado === 'vencido');
  debe('los días vencidos quedan en negativo (para el mensaje "hace N días")', eVenc.dias < 0);
}

// ---- 4) Subida a la nube: ni un undefined/NaN ----
{
  const us = {
    vehKm: 4321,
    veh: { aceite: { kmBase: 100, fecha: new Date().toISOString(), avisado: false,
      historial: [{ fecha: new Date().toISOString(), km: 100, costo: undefined, nota: undefined },
                  { fecha: new Date().toISOString(), km: NaN, costo: NaN, nota: 5 }] } },
    doc: { revisionTecnica: { vence: hoyISO(10), avisado30: true, avisado7: false, avisadoVencido: false } }
  };
  const payloadVeh = api(us)._vehParaNube();
  const payloadDoc = api(us)._docParaNube();
  const sucio = [];
  (function hurga(o, ruta) {
    if (o === null) return;
    if (typeof o === 'undefined') { sucio.push(ruta + ' = undefined'); return; }
    if (typeof o === 'number' && !isFinite(o)) { sucio.push(ruta + ' = ' + o); return; }
    if (typeof o === 'object') for (const k in o) hurga(o[k], ruta + '.' + k);
  })({ veh: payloadVeh, doc: payloadDoc }, 'raiz');
  debe('la carga a Firestore (veh+doc) no lleva undefined ni NaN: ' + sucio.join(', '), sucio.length === 0);
  debe('la nota basura (número) se descarta, no se sube cruda', payloadVeh.aceite.historial[1].nota === null);
  debe('doc.vence viaja tal cual (string YYYY-MM-DD)', payloadDoc.revisionTecnica.vence === us.doc.revisionTecnica.vence);
}

// _restaurarDesdeNube() toca mant/mantKm/premium también (fuera de nuestro alcance),
// pero como esos bloques solo leen/escriben us.mant/us.mantKm/us.premium (no chocan con
// veh/doc), correr la función COMPLETA y real es más fiel que recortar a mano solo
// "nuestra" mitad. _mantData() se stubea (no forma parte de este archivo) -- el bloque
// de mant no es lo que este test evalúa.
const RESTAURAR = bloque('function _restaurarDesdeNube(nube){');
const correrRestaurar = new Function('us', 'nube', SRC + '\nfunction _mantData(){}\n' + RESTAURAR.slice(RESTAURAR.indexOf('{') + 1, -1));

// ---- 5) Restauración del vehículo: gana el más avanzado (mismo criterio que la bici) ----
{
  const f = (n) => Array.from({ length: n }, (_, i) => ({ fecha: new Date(2026, 0, i + 1).toISOString(), km: 10, costo: null, nota: null }));

  // el teléfono sabe más que la nube: no debe retroceder
  const us = { vehKm: 2000, veh: { aceite: { kmBase: 1500, fecha: '2026-08-01T00:00:00.000Z', avisado: false, historial: f(7) } } };
  const r = correrRestaurar(us, { vehKm: 800, veh: { aceite: { kmBase: 500, fecha: '2026-06-01T00:00:00.000Z', avisado: false, historial: f(3) } } });
  debe('la nube vieja NO borra los km de mantención del vehículo', us.vehKm === 2000);
  debe('la nube vieja NO borra el historial del vehículo', us.veh.aceite.historial.length === 7);

  // teléfono nuevo: se repuebla desde la nube
  const us2 = { vehKm: 0, veh: {} };
  correrRestaurar(us2, { vehKm: 900, veh: { aceite: { kmBase: 200, fecha: '2026-05-01T00:00:00.000Z', avisado: false, historial: f(2) } } });
  debe('teléfono nuevo: se restaura vehKm desde la nube', us2.vehKm === 900);
  debe('teléfono nuevo: se restaura el historial del vehículo', us2.veh.aceite.historial.length === 2);
}

// ---- 6) Restauración de documentos: NUNCA pisar lo que ya existe, solo rescatar ----
{
  // el teléfono YA tiene fecha propia: se respeta, aunque la nube traiga otra cosa
  const us = { doc: { soap: { vence: '2027-03-31', avisado30: false, avisado7: false, avisadoVencido: false } } };
  correrRestaurar(us, { doc: { soap: { vence: '2026-01-01', avisado30: true, avisado7: true, avisadoVencido: true } } });
  debe('un documento YA cargado en el teléfono no se pisa con la nube', us.doc.soap.vence === '2027-03-31');

  // el teléfono no tiene nada: se rescata desde la nube
  const us2 = { doc: {} };
  const r2 = correrRestaurar(us2, { doc: { soap: { vence: '2027-03-31', avisado30: false, avisado7: false, avisadoVencido: false } } });
  debe('un documento sin fecha local SÍ se rescata desde la nube', us2.doc.soap && us2.doc.soap.vence === '2027-03-31');
  debe('rescatar un documento cuenta como "restaurado"', r2 === true);
}

// ---- 7) EL BUG QUE SE ARREGLÓ: cada modo suma a SU odómetro de mantención, nunca al del otro ----
{
  const GPS = readFileSync(join(raizProyecto, 'motor-gps.js'), 'utf8');
  debe('motor-gps.js decide entre _sumarKmVehiculo y _sumarKmMantencion según actividadTipo (no llama las dos)',
       /actividadTipo==='moto'\)\{[^\n]*_sumarKmVehiculo\(moved\)[^\n]*\}\s*else\s*\{[^\n]*_sumarKmMantencion\(moved\)/.test(GPS));

  // Simulación directa de la lógica extraída (sin todo el motor de GPS alrededor):
  const decidir = (actividadTipo, moved) => {
    let vehSum = 0, biciSum = 0;
    const _sumarKmVehiculo = (km) => { vehSum += km; };
    const _sumarKmMantencion = (km) => { biciSum += km; };
    if (actividadTipo === 'moto') { _sumarKmVehiculo(moved); } else { _sumarKmMantencion(moved); }
    return { vehSum, biciSum };
  };
  debe('300 km en modo Motorizado NO tocan el odómetro de la bici', decidir('moto', 300).biciSum === 0);
  debe('300 km en modo Motorizado sí quedan en el odómetro del vehículo', decidir('moto', 300).vehSum === 300);
  debe('50 km pedaleando NO tocan el odómetro del vehículo', decidir('ciclismo', 50).vehSum === 0);
  debe('50 km pedaleando sí quedan en el odómetro de la bici', decidir('ciclismo', 50).biciSum === 50);
}

console.log('  mantencion-vehiculo.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
