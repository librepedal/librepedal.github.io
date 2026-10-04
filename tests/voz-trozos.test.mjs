// Voz por trozos pregrabados (2026-10-04, pedido de Inty: no gastar ElevenLabs en vivo).
// Corre la lógica REAL de voz-trozos.js y comprueba que TODA frase que puede decir el
// copiloto (pistero-copiloto.js + clima) se arma con trozos y suena bien en castellano.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

const ctx = { window: {}, fetch: () => ({ then: () => ({ then: () => ({ catch: () => {} }) }) }), Math, String, parseInt, isNaN, Object, Date, parseFloat, console };
vm.createContext(ctx);
vm.runInContext(leer('voz-trozos.js'), ctx);
vm.runInContext(leer('pistero-copiloto.js'), ctx);

// Lo que se oiría: los textos de los trozos en orden ({vivo} = nombre de lugar en vivo).
const suena = (frase) => {
  const p = ctx.vtPlan(frase);
  return p ? Array.from(p).map((s) => (s.c ? ctx.VT_FRASES[s.c] : '[' + s.vivo + ']')).join(' ') : null;
};

// --- Números en castellano ---
debe('22 km', suena('22 km. Buen ritmo.') === 'veintidós kilómetros. Buen ritmo.');
debe('21 km: apócope', suena('21 km. Vas bien.') === 'veintiún kilómetros. Vas bien.');
debe('31 km: "treinta y un"', suena('Quedan 31 km.') === 'Quedan treinta y un kilómetros.');
debe('1 km: singular', suena('Quedan 1 km.') === 'Quedan un kilómetro.');
debe('6,4 km: con coma', suena('Quedan 6,4 km.') === 'Quedan seis coma cuatro kilómetros.');
debe('1,5 km: sin apócope', suena('Quedan 1,5 km.') === 'Quedan uno coma cinco kilómetros.');
debe('101: "ciento un"', suena('Quedan 101 km.') === 'Quedan ciento un kilómetros.');
debe('100: "cien"', suena('Quedan 100 km.') === 'Quedan cien kilómetros.');
debe('mil metros', suena('Subida, 1000 metros.') === 'Subida, mil metros.');
debe('2500 metros', suena('Subida fuerte, 2500 metros.') === 'Subida fuerte, dos mil quinientos metros.');
debe('45: "cuarenta y cinco"', ctx.vtNumero(45, '').map((k) => ctx.VT_FRASES[k]).join(' ') === 'cuarenta y cinco');

// --- Las frases aprobadas del viaje de ejemplo ---
debe('salida con lugar en vivo', suena('22 km a Llifén. Vamos.') === 'veintidós kilómetros a [Llifén.] Vamos.');
debe('llegada 1:18', suena('Llegaste. 22 km en 1:18.') === 'Llegaste. veintidós kilómetros en una hora dieciocho minutos.');
debe('llegada con récord', suena('Llegaste. 22 km en 1:18. Tu viaje más largo.') === 'Llegaste. veintidós kilómetros en una hora dieciocho minutos. Tu viaje más largo.');
debe('llegada 2:00', suena('Llegaste. 40 km en 2:00.') === 'Llegaste. cuarenta kilómetros en dos horas.');
debe('llegada 1:01', suena('Llegaste. 30 km en 1:01.') === 'Llegaste. treinta kilómetros en una hora un minuto.');
debe('llegada en minutos', suena('Llegaste. 6,4 km en 25 minutos.') === 'Llegaste. seis coma cuatro kilómetros en veinticinco minutos.');
debe('subida muy fuerte', suena('Subida muy fuerte: 10%, 500 metros.') === 'Subida muy fuerte: diez por ciento, quinientos metros.');
debe('bajada fuerte', suena('Bajada fuerte: 9%.') === 'Bajada fuerte: nueve por ciento.');
debe('viento en contra', suena('Viento en contra, 25 kilómetros por hora.') === 'Viento en contra, veinticinco kilómetros por hora.');
debe('temperatura bajo cero', suena('Bajó la temperatura: -2 grados.') === 'Bajó la temperatura: menos dos grados.');
debe('frase fija entera', ctx.vtPlan('Dos tercios. Queda poco.').length === 1);
debe('frase desconocida: no se arma (va por el camino de siempre)', ctx.vtPlan('Dato de por aquí: algo de Wikipedia.') === null);

// --- Barrido: TODO lo que el copiloto puede decir se puede armar ---
let sinPlan = [];
const prueba = (t) => { const p = ctx.vtPlan(t); if (!p || Array.from(p).some((s) => s.c && !(s.c in ctx.VT_FRASES))) sinPlan.push(t); };
for (const nivel of ['normal', 'hablador']) {
  for (const tot of [0, 3, 7, 12.5, 22, 48, 61, 99, 120, 250, 480]) {
    const pts = ctx.copPuntosIntermedios(tot, nivel);
    pts.forEach((km, i) => prueba(ctx.copTextoIntermedio(i, pts.length, tot, km)));
    if (tot) prueba(ctx.copSalidaTexto(tot, 'Pucón, Cautín'));
  }
}
prueba(ctx.copSalidaTexto(0, ''));
for (const km of [0.5, 1, 1.2, 9.9, 21, 33.3, 101, 250]) for (const min of [1, 9, 59, 60, 61, 78, 120, 600])
  for (const rec of [true, false]) prueba(ctx.copLlegadaTexto(km, min * 60000, rec));
for (const tipo of ['subida', 'bajada']) for (const g of [2, 4, 5, 7, 8, 12, 25]) for (const d of [80, 150, 420, 900, 1500, 3200]) {
  const t = ctx.copPendienteTexto(tipo, tipo === 'bajada' ? -g : g, d); if (t) prueba(t);
}
['Empieza una subida.', 'Tormenta cerca. Busca dónde parar.', 'Voy a hablar solo lo justo.', 'Buena, te acompaño más seguido.', 'Listo, ritmo normal.'].forEach(prueba);
for (const n of [0, 15, 30, 61, 99, 100]) { prueba('Sube la lluvia: ' + n + ' por ciento.'); prueba('Baja la lluvia: ' + n + ' por ciento.'); }
for (const n of [15, 25, 71, 140]) { prueba('Viento en contra, ' + n + ' kilómetros por hora.'); prueba('Se levantó viento: ' + n + ' kilómetros por hora.'); }
for (const n of [-12, -1, 0, 1, 7, 31]) prueba('Bajó la temperatura: ' + n + ' grados.');
debe('todo lo del copiloto se arma con trozos' + (sinPlan.length ? ' (faltan: ' + sinPlan.slice(0, 4).join(' | ') + ')' : ''), sinPlan.length === 0);

// --- Los textos del código real coinciden con las plantillas ---
const CLIMA = leer('clima-datos.js'), MG = leer('motor-gps.js'), AJ = leer('app-estado-global.js');
debe('clima usa los textos que se arman', CLIMA.includes("'Sube la lluvia: '") && CLIMA.includes("'Baja la lluvia: '") && CLIMA.includes("'Se levantó viento: '") && CLIMA.includes("'Bajó la temperatura: '") && CLIMA.includes("'Tormenta cerca. Busca dónde parar.'"));
debe('viento en contra usa el texto que se arma', CLIMA.includes("h('Viento en contra, '+Math.round(_climaBase.viento)+' kilómetros por hora.');"));
debe('subida sin perfil usa la frase grabada', MG.includes("h('Empieza una subida.')"));
debe('"Pistero habla" usa las frases grabadas', AJ.includes("'Voy a hablar solo lo justo.'") && AJ.includes("'Buena, te acompaño más seguido.'") && AJ.includes("'Listo, ritmo normal.'"));

// --- Conexión con el motor de voz y la app ---
const VM_ = leer('voz-motor.js');
debe('voz-motor prueba trozos antes de la voz en vivo', VM_.indexOf('vtPlanDisponible(item.t)') > 0 && VM_.indexOf('vtPlanDisponible(item.t)') < VM_.lastIndexOf('_vozElevenRuntime(item, durEst, miGen, false, { idEL:_idEL, idAz:_id });'));
debe('index.html carga voz-trozos.js', leer('index.html').includes('<script src="voz-trozos.js"></script>'));
debe('sw.js lo guarda', leer('sw.js').includes("'./voz-trozos.js'"));
debe('el generador lee el catálogo real', leer('scripts/gen-voz-trozos.js').includes("readFileSync(path.join(BASE, 'voz-trozos.js')"));

console.log(`  voz-trozos: ${ok} OK` + (fail ? `, ${fail} FALLAS` : ''));
process.exit(fail ? 1 : 0);
