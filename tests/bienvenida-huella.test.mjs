// Bienvenida + "Dejar mi huella" + Mapa de huellas (2026-10-04, aprobado por Inty).
// Corre la lógica REAL de bienvenida-huella.js (no se reimplementa) y revisa que las
// piezas que la conectan con la app y con Firestore estén en su lugar.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
const SRC = leer('bienvenida-huella.js');

let ok = 0, fail = 0;
const debe = (nombre, cond) => { if (cond) ok++; else { fail++; console.log('  FALLA: ' + nombre); } };

const ctx = { console, Date, Math, String, JSON, Promise, setTimeout, LP_FUNDADORES_CUPO: 1000 };
vm.createContext(ctx);
vm.runInContext(SRC, ctx);

// Texto aprobado palabra por palabra.
const APROBADO = 'Llegaste justo a tiempo. Desde hoy eres parte de algo que nunca se había hecho. Aquí no venimos a contar kilómetros: venimos a cambiar las cosas. Tu voz, tus rutas, tus ideas van a marcar el camino de miles que vienen detrás. Esto recién empieza, y tú estás aquí desde el principio. Vamos a dejar una huella que nadie podrá borrar. Bienvenido a Libre Pedal.';
debe('texto de bienvenida = el aprobado', ctx.bhFrases('l').join(' ') === APROBADO);
debe('Pistera dice "Bienvenida"', ctx.bhFrases('c')[6] === 'Bienvenida a Libre Pedal.');
debe('no menciona Chile, plata ni Premium', !/chile|premium|\$|fondo/i.test(APROBADO));

// Fundador: primeros 1.000 (promesa ya en producción) O primer año desde el 24-sep-2026.
const ANTES = Date.UTC(2027, 0, 1), DESPUES = Date.UTC(2028, 0, 1);
debe('N° 5 es Fundador', ctx.bhEsFundador(5, DESPUES));
debe('N° 1000 es Fundador aunque llegue después del año', ctx.bhEsFundador(1000, DESPUES));
debe('N° 5000 dentro del primer año es Fundador', ctx.bhEsFundador(5000, ANTES));
debe('N° 1001 después del año NO es Fundador', !ctx.bhEsFundador(1001, DESPUES));
debe('el límite es el 24-sep-2027', ctx.bhEsFundador(2000, Date.UTC(2027, 8, 24, 2)) && !ctx.bhEsFundador(2000, Date.UTC(2027, 8, 24, 4)));

// Zona: misma comuna escrita distinto = misma huella en el mapa.
debe('Futrono = futrono = FUTRONO', ctx.bhZonaId('cl', 'Futrono') === ctx.bhZonaId('CL', ' FUTRONO '));
debe('tildes no separan zonas', ctx.bhZonaId('cl', 'Valparaíso') === ctx.bhZonaId('cl', 'Valparaiso'));
debe('países distintos no se mezclan', ctx.bhZonaId('cl', 'Santa Cruz') !== ctx.bhZonaId('bo', 'Santa Cruz'));
debe('sin comuna no hay zona', ctx.bhZonaId('cl', '  ') === null);
debe('id de zona cabe en la regla (<=70)', ctx.bhZonaId('cl', 'x'.repeat(200)).length <= 70);

// Idea: 8 a 280 letras, máximo 2 por cuenta.
debe('idea muy corta no vale', !ctx.bhIdeaValida('hola'));
debe('idea normal vale', ctx.bhIdeaValida('Un bebedero en la ruta a Lago Ranco'));
debe('idea de 281 no vale', !ctx.bhIdeaValida('a'.repeat(281)));
debe('primera idea = slot 1', ctx.bhSiguienteSlot([]) === 1);
debe('segunda idea = slot 2', ctx.bhSiguienteSlot([1]) === 2);
debe('tercera idea no existe', ctx.bhSiguienteSlot([1, 2]) === null);

// Privacidad: el mapa solo recibe la zona redondeada a ~10 km.
debe('coordenadas redondeadas a 0,1°', ctx.bhRedondear(-40.13456) === -40.1 && ctx.bhRedondear(-72.38) === -72.4);

// Voz: solo pregrabada, nunca ElevenLabs en vivo (para no gastar).
debe('usa voces-el/bienvenida pregrabadas', SRC.includes("'voces-el/bienvenida/'"));
debe('no llama a ElevenLabs en vivo', !/_vozElevenRuntime|api\.elevenlabs|xi-api-key/.test(SRC));
const GEN = leer('scripts/gen-voz-bienvenida.js');
debe('el generador tiene las mismas 7 frases', ctx.bhFrases('l').every((f) => GEN.includes("'" + f + "'")));

// Conexiones con la app.
const IDX = leer('index.html'), SW = leer('sw.js'), AUTH = leer('auth-sesion.js');
debe('index.html carga el módulo', IDX.includes('<script src="bienvenida-huella.js"></script>'));
debe('sw.js lo guarda para usar sin red', SW.includes("'./bienvenida-huella.js'"));
debe('el login pasa por la bienvenida', AUTH.includes('bhIniciar(nombre,_seguirTrasBienvenida)'));
debe('Comunidad abre el mapa de huellas', IDX.includes('onclick="bhAbrirMapa()"'));

// Reglas de Firestore.
const R = leer('firestore.rules');
debe('regla de huellas privadas', /match \/huellas\/\{id\}[\s\S]*?allow read: if signedIn\(\) && \(esMiHuella\(id\) \|\| isAdmin\(\)\)/.test(R));
debe('las huellas no se editan', /match \/huellas\/\{id\}[\s\S]*?allow update: if false;/.test(R));
debe('Fundador no se pone a mano', R.includes('request.resource.data.fundador == false || fundadorPosible()'));
debe('el contador sube de a 1 y solo con la primera huella', R.includes('request.resource.data.n == resource.data.n + 1') && R.includes('existsAfter(h)'));
debe('obras del fondo solo las escribe el admin', /match \/obrasFondo\/\{id\}[\s\S]*?allow write: if isAdmin\(\);/.test(R));

console.log(`  bienvenida-huella: ${ok} OK` + (fail ? `, ${fail} FALLAS` : ''));
process.exit(fail ? 1 : 0);
