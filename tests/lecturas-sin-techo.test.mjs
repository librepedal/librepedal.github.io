// GUARDIÁN: ninguna lectura de Firestore puede quedar sin techo.
//
// Este es el test que de verdad blinda. Los otros arreglan lo que ya pasó; este impide que
// vuelva a pasar, sin depender de que alguien se acuerde.
//
// Contexto: el 2026-08-23 la cuota gratis de Firestore (50.000 lecturas al día PARA TODO EL
// PROYECTO) se agotó y la app quedó sin base de datos para los 51 testers de la prueba
// cerrada. Causa: lecturas de colecciones ENTERAS, sin filtro ni límite. No molestan
// mientras la colección es chica — y un día se llevan la cuota de todos.
//
// Regla: toda lectura tiene que estar acotada por AL MENOS UNA de estas vías:
//   .limit(n)   -> techo explícito
//   .where(...) -> filtrada (normalmente por usuario o por fecha)
//   .doc(id)    -> un solo documento
//   .count()    -> agregación: cuesta 1 lectura por cada 1.000 documentos, no una por documento
//
// Si agregás una lectura nueva y este test falla: NO la mandes a la lista de excepciones sin
// más. Preguntate primero cuánto cuesta esa pantalla cuando la colección tenga 10.000
// documentos. Casi siempre la respuesta correcta es .limit() o .count().
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Este guardián escanea TODO el código en busca de lecturas de Firestore sin techo -- así
// que tiene que leer TODOS los archivos que salieron de index.html al separarlo por dominio
// (2026-09), no solo index.html. Si agregás un archivo nuevo con `db.collection(...)`,
// sumalo a esta lista o el guardián deja de verlo.
const raizProyecto = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVOS_JS = ['index.html', 'esfera.js', 'seguridad-sensores.js', 'clima-datos.js', 'voz-motor.js', 'reportes.js', 'rutas.js', 'mapa-render.js', 'auth.js', 'auth-vinculo.js', 'auth-sesion.js', 'gamificacion-darma.js', 'gamificacion-logros.js', 'gamificacion-ranking.js', 'gamificacion-retos.js', 'gamificacion-comunidad.js', 'novedades.js', 'social.js', 'segmentos.js', 'rodadas.js', 'blindaje-firestore.js', 'pistero-personalizacion-datos.js', 'app-estado-global.js', 'pistero-tipo-actividad.js', 'pistero-personalidad.js', 'pistero-vocabulario-modo.js', 'pistero-apariencia.js', 'pistero-frases-pais.js', 'pistero-chat-ia.js', 'funciones-mapa-viajes.js', 'motor-navegacion.js', 'motor-gps.js', 'motor-gps-velocidad.js', 'mantencion-preventiva.js', 'pistero-conversacion.js', 'pwa-wakelock.js', 'avisos-viaje.js', 'pwa-instalacion.js', 'sobrevuelo-viaje.js', 'abanico-reporte.js', 'prevuelo-intro-pistero.js', 'recomendacion-rutas.js', 'sos-comunitario.js', 'pistero-ciclistas-cerca.js', 'dialogos-genericos.js', 'idioma-de-la-ruta.js', 'planificador-presupuesto.js', 'ubicacion-carga.js', 'sonido-cadena.js'];
const CRUDO = ARCHIVOS_JS.map((f) => readFileSync(join(raizProyecto, f), 'utf8')).join('\n');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

// Sin esto el test se lee a sí mismo: los comentarios que EXPLICAN una lectura vieja
// contienen el patrón que estamos buscando, y daban falso positivo. Se conservan los saltos
// de línea para no perder la numeración.
function sinComentarios(txt) {
  return txt
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))   // bloques /* */
    .split('\n')
    .map((l) => (/^\s*\/\//.test(l) ? '' : l.replace(/([^:'"])\/\/.*$/, '$1'))) // línea entera, y al final (sin romper https://)
    .join('\n');
}

const HTML = sinComentarios(CRUDO);
const LINEAS = HTML.split('\n');

function funcionDe(idx) {
  for (let j = idx; j >= 0; j--) {
    const m = LINEAS[j].match(/^\s*(?:async\s+)?function\s+([A-Za-z_0-9]+)/);
    if (m) return m[1];
  }
  return '<top>';
}

// Excepciones justificadas. Cada una lleva el motivo escrito: si mañana deja de ser cierto,
// se nota al leerlo.
const EXCEPCIONES = {
  mostrarComunidad:
    'Respaldo dentro del catch, solo si count() no está disponible. El camino normal usa ' +
    'count() por opción + un doc propio.',
};

// ---- 1) lecturas encadenadas: collection('x').…get() / .onSnapshot() ----
const sinTecho = [];
LINEAS.forEach((linea, i) => {
  const re = /collection\('([A-Za-z]+)'\)((?:\.[A-Za-z]+\([^()]*(?:\([^()]*\))?[^()]*\))*?)\.(get|onSnapshot)\(/g;
  let m;
  while ((m = re.exec(linea))) {
    const [, coleccion, cadena, tipo] = m;
    if (!/\.limit\(|\.where\(|\.doc\(|\.count\(/.test(cadena)) {
      sinTecho.push({ coleccion, tipo, linea: i + 1, fn: funcionDe(i) });
    }
  }
});
const noJustificadas = sinTecho.filter((r) => !EXCEPCIONES[r.fn]);
debe(
  'ninguna lectura encadenada sin techo, fuera de las excepciones justificadas' +
    (noJustificadas.length
      ? '\n' + noJustificadas.map((r) => `           -> L${r.linea}  ${r.fn}()  lee '${r.coleccion}' entera (${r.tipo})`).join('\n')
      : ''),
  noJustificadas.length === 0
);

// Una excepción que ya no corresponde a nada vuelve mentira la lista y deja de proteger.
Object.keys(EXCEPCIONES).forEach((fn) => {
  debe(`la excepción '${fn}' sigue correspondiendo a una lectura real (si no, sacala de la lista)`,
       sinTecho.some((r) => r.fn === fn));
});

// ---- 2) el agujero: partir la cadena en dos statements evade el chequeo de arriba ----
// `const q = db.collection('x');  …  q.get()` no matchea el patrón encadenado. Se listan las
// referencias guardadas en variable para que ninguna pase sin que alguien la haya mirado.
const REFS_REVISADAS = {
  recommendations:
    'subscribeToMapPoints: primera carga del conjunto base. Después va por caché local + ' +
    'consulta incremental where("ts",">",…), así que se paga una vez cada 7 días y no en ' +
    'cada apertura del mapa.',
};
const refsEnVariable = [];
LINEAS.forEach((linea, i) => {
  const m = linea.match(/=\s*db\.collection\('([A-Za-z]+)'\)\s*;/);
  if (m) refsEnVariable.push({ coleccion: m[1], linea: i + 1, fn: funcionDe(i) });
});
const refsSinRevisar = refsEnVariable.filter((r) => !REFS_REVISADAS[r.coleccion]);
debe(
  'toda referencia a una colección guardada en variable está revisada' +
    (refsSinRevisar.length
      ? '\n' + refsSinRevisar.map((r) => `           -> L${r.linea}  ${r.fn}()  guarda '${r.coleccion}' sin acotar`).join('\n')
      : ''),
  refsSinRevisar.length === 0
);

// ---- 3) los puntos del mapa: que el patrón bueno siga en pie ----
// Es la lectura más cara que hubo (colección entera, listener en vivo, en cada apertura del
// mapa). Acá se afirma el patrón CORRECTO, en vez de tolerar el incorrecto.
{
  const i = HTML.indexOf('function subscribeToMapPoints()');
  const cuerpo = i >= 0 ? HTML.slice(i, i + 1400) : '';
  debe('subscribeToMapPoints existe', i >= 0);
  debe('los puntos del mapa se leen de la caché local antes de tocar la red', cuerpo.includes('_mapPointsCacheLeer()'));
  debe('y solo se piden a Firestore los posteriores a la última sincronización',
       /where\('ts','>'/.test(cuerpo));
  debe('la caché se refresca entera cada tanto (los likes no mueven el ts)',
       HTML.includes('MAPPOINTS_REFRESCO_TOTAL_MS'));
}

// ---- 4) los listeners en vivo son lo más caro: leen al enganchar Y en cada cambio ----
const listenersSinTecho = sinTecho.filter((r) => r.tipo === 'onSnapshot');
debe(
  'ningún listener en vivo lee una colección entera' +
    (listenersSinTecho.length ? ' -> ' + listenersSinTecho.map((r) => `L${r.linea} ${r.fn}`).join(', ') : ''),
  listenersSinTecho.length === 0
);

// ---- 5) el blindaje de tiempo de ejecución, para cuando la cuota igual se agote ----
debe('el blindaje de cuota sigue instalado', HTML.includes('_instalarBlindajeFirestore'));
debe('el contador de lecturas sigue disponible para medir', HTML.includes('function lpLecturas()'));

console.log(`  lecturas-sin-techo.test.mjs: ${ok} OK` + (fail ? `, ${fail} FALLAN` : '') +
            `  (${sinTecho.length} encadenadas sin techo, ${refsEnVariable.length} en variable)`);
process.exit(fail ? 1 : 0);
