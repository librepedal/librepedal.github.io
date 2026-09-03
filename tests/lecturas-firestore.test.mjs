// Costo de ABRIR la app, en lecturas de Firestore. Contra el index.html REAL.
//
// Por que existe este test: el 2026-08-23 la consola de Firebase marco 73.000 lecturas
// contra 210 escrituras, con maximo 4 conexiones simultaneas. El gasto no venia de tener
// muchos usuarios: venia de que al INICIAR SESION se enganchaban 11 listeners de golpe,
// cada uno leyendo su coleccion entera (reportes 200, users 150, chat 100, novedades 60,
// guiComments 50, hostels 50, recommendations 50, repairTips 20...). ~700 documentos por
// apertura. El plan gratis da 50.000 lecturas al dia PARA TODO EL PROYECTO, asi que ~70
// aperturas dejaban la app sin base de datos — por eso ya habia reventado con 48 usuarios.
//
// Este test le pone techo a eso. Si alguien vuelve a colgar un listener pesado del
// arranque, falla aca y no en produccion con los testers adentro.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Las 2 ramas de arranque (registro nuevo y sesión que vuelve) viven en auth-vinculo.js y
// auth-sesion.js desde que se separaron de index.html -- se concatenan para no perder cobertura.
const raizProyecto = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = ['index.html', 'auth-vinculo.js', 'auth-sesion.js']
  .map((f) => readFileSync(join(raizProyecto, f), 'utf8')).join('\n');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

// Las dos ramas de arranque (registro nuevo y sesion que vuelve) tienen que ser iguales:
// si se aligera una sola, la mitad de los usuarios sigue pagando el precio viejo.
const arranques = [...HTML.matchAll(/await im\(\); au\(\); rm\(MG\); fg\('todos'\);([\s\S]{0,1400}?)getCurrentLocation\(\);/g)]
  .map(m => m[1]);
debe('se encontraron las DOS ramas de arranque', arranques.length === 2);

// Lo caro: listeners de colecciones compartidas, que leen documentos de TODOS.
const CAROS = {
  subscribeToReportes: 'reportes (limit 200)',
  subscribeToChat: 'chat (limit 100)',
  subscribeToNovedades: 'novedades (limit 60)',
  subscribeToComments: 'guiComments (limit 50)',
  loadHostels: 'hostels 50 + initVotosHostels = guiComments limit(500)',
  loadRecommendations: 'recommendations (limit 50)',
  loadRepairTips: 'repairTips (limit 20)',
};
arranques.forEach((bloque, i) => {
  Object.keys(CAROS).forEach(fn => {
    debe(`arranque #${i + 1} NO llama a ${fn}() — ${CAROS[fn]}`,
         !new RegExp('(^|[^a-zA-Z_])' + fn + '\\(\\)').test(bloque));
  });
});

// Lo que SI tiene que seguir al arranque, y por que. Diferirlos rompe cosas:
const EAGER = {
  subscribeToFriendRequests: 'pinta #solicBadge y #esAvisos, visibles fuera de su pantalla',
  loadTrips: 'la global `trips` alimenta el contador de Inicio (au) y los logros',
};
arranques.forEach((bloque, i) => {
  Object.keys(EAGER).forEach(fn => {
    debe(`arranque #${i + 1} SIGUE llamando a ${fn}() — ${EAGER[fn]}`,
         new RegExp('(^|[^a-zA-Z_])' + fn + '\\(\\)').test(bloque));
  });
});

// Cada pantalla engancha lo suyo al abrirse. Sin esto, diferir = la pantalla queda vacia.
const PANTALLAS = [
  ['chat', 'subscribeToChat'],
  ['novedades', 'subscribeToNovedades'],
  ['rec', 'loadRecommendations'],
  ['gui', 'subscribeToComments'],
  ['map', 'subscribeToReportes'],
  ['mac', 'loadRepairTips'],
];
PANTALLAS.forEach(([vista, fn]) => {
  debe(`abrir '${vista}' engancha ${fn}`,
       new RegExp("id==='" + vista + "'\\)\\s*_subUnaVez\\('[A-Za-z]+', *" + fn).test(HTML));
});

// Los reportes son los unicos que hacen falta SIN abrir su pantalla: avisan del ripio
// antes de salir y de peligros mientras pedaleas. Tienen que engancharse por 3 vias.
{
  const enNav = /_subUnaVez\('reportes', subscribeToReportes\);\s*\n\s*navGuardado=false;/.test(HTML);
  debe('los reportes se enganchan al iniciar navegacion', enNav);
  const enGrabar = (HTML.match(/tripStartTime=Date\.now\(\); _iniciarCronometroDash\(\);\s*\n\s*_subUnaVez\('reportes'/g) || []).length;
  debe('los reportes se enganchan al empezar a grabar, en los DOS caminos de toggleGPS (nativo y web)',
       enGrabar === 2);
}

// El helper: una vez por sesion, y si falla no deja la pantalla muerta para siempre.
{
  const h = HTML.match(/function _subUnaVez\(clave, fn\)\{[\s\S]{0,400}?\n\}/);
  debe('existe _subUnaVez', !!h);
  debe('no vuelve a suscribir si ya se hizo', !!(h && h[0].includes('if(_subsHechas[clave]) return;')));
  debe('si el listener revienta, se permite reintentar (no queda muerto)',
       !!(h && /catch\(e\)\{ _subsHechas\[clave\]=false;/.test(h[0])));
}

// "Te doy alojo" quedo OCULTO (commit 8f2d678) pero seguia cargando ~550 documentos en
// CADA apertura. Ahora solo carga desde el unico lugar que puede abrirlo.
{
  // Corte por indice, no por regex: un `[\s\S]{0,200}?\n` perezoso se detiene en el primer
  // salto de linea (el de la llave de apertura) y nunca llega al cuerpo — falso negativo.
  const i = HTML.indexOf('async function abrirTeDoyAlojo(){');
  debe('existe abrirTeDoyAlojo()', i >= 0);
  debe('loadHostels solo se carga al abrir "Te doy alojo"',
       i >= 0 && HTML.slice(i, i + 260).includes("_subUnaVez('hostels', loadHostels)"));
}

console.log('  lecturas-firestore.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
