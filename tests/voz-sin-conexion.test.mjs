// Aviso único para instalar la voz en español sin conexión — lógica REAL de voz-sin-conexion.js.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'voz-sin-conexion.js'), 'utf8');
const HTML = readFileSync(join(raiz, 'index.html'), 'utf8');
const SW = readFileSync(join(raiz, 'sw.js'), 'utf8');
const NAV = readFileSync(join(raiz, 'motor-navegacion.js'), 'utf8');
const MAPA = readFileSync(join(raiz, 'funciones-mapa-viajes.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

// Carga el módulo entero con un navegador mínimo; plugin = el TextToSpeech nativo (o null en la web).
function cargar({ plugin = null, voces = [], ua = 'Mozilla/5.0 (Linux; Android 14)', guardado = null } = {}) {
  const almacen = { lp_voz_sin_conexion_aviso: guardado };
  const dialogo = { abierto: false, msg: '', ok: '', no: '' };
  const els = {
    lpDialog: { classList: { add: () => { dialogo.abierto = true; }, remove: () => { dialogo.abierto = false; } } },
    lpDialogMsg: { set innerText(v) { dialogo.msg = v; } },
    lpDialogInput: { style: {} },
    lpDialogBtnOk: { style: {}, set innerText(v) { dialogo.ok = v; } },
    lpDialogBtnCancel: { style: {}, set innerText(v) { dialogo.no = v; } },
  };
  const ventana = {
    Capacitor: plugin ? { getPlatform: () => 'android' } : undefined,
    speechSynthesis: { getVoices: () => voces, addEventListener() {} },
  };
  const fn = new Function('window', 'navigator', 'document', 'localStorage', 'lpPlugin', 'Capacitor', 'speechSynthesis', '_lpDialogCerrar', 'lpAviso',
    SRC + '\nreturn {vozScDebeAvisar, vozScHayEspanolLocal, vozEspanolSinConexion, revisarVozSinConexion, VOZ_SC_REPETIR_MS};');
  const api = fn(ventana, { userAgent: ua }, { getElementById: (id) => els[id] },
    { getItem: (k) => almacen[k], setItem: (k, v) => { almacen[k] = v; } },
    () => plugin, ventana.Capacitor, ventana.speechSynthesis, () => { dialogo.abierto = false; }, () => {});
  return { api, dialogo, almacen, els };
}

const DIA = 86400000;
{
  const { api } = cargar();
  t('si la tiene: no avisa', api.vozScDebeAvisar(true, true, 0, 1e12) === false);
  t('si no se pudo saber: no molesta', api.vozScDebeAvisar(null, true, 0, 1e12) === false);
  t('si falta en Android: avisa', api.vozScDebeAvisar(false, true, 0, 1e12) === true);
  t('en computador/iPhone: no avisa (los pasos son de Android)', api.vozScDebeAvisar(false, false, 0, 1e12) === false);
  t('avisado hace 3 días: no repite', api.vozScDebeAvisar(false, true, 1e12, 1e12 + 3 * DIA) === false);
  t('avisado hace 8 días y sigue faltando: repite', api.vozScDebeAvisar(false, true, 1e12, 1e12 + 8 * DIA) === true);
  t('se repite cada 7 días', api.VOZ_SC_REPETIR_MS === 7 * DIA);
  t('voz es-CL local: sirve', api.vozScHayEspanolLocal([{ lang: 'es-CL', localService: true }]) === true);
  t('voz es_US (guion bajo): sirve', api.vozScHayEspanolLocal([{ lang: 'es_US' }]) === true);
  t('voz en español solo por red: no sirve sin señal', api.vozScHayEspanolLocal([{ lang: 'es-ES', localService: false }]) === false);
  t('solo inglés: falta', api.vozScHayEspanolLocal([{ lang: 'en-US', localService: true }]) === false);
  t('"estonio" (et) no se confunde con español', api.vozScHayEspanolLocal([{ lang: 'et-EE', localService: true }]) === false);
}

// ---- App de Play: pregunta a Android por cada variante de español ----
{
  const pedidas = [];
  const plugin = { isLanguageSupported: async ({ lang }) => { pedidas.push(lang); return { supported: lang === 'es-ES' }; }, openInstall: async () => {} };
  const { api } = cargar({ plugin });
  t('app: con es-ES descargado, la tiene', (await api.vozEspanolSinConexion()) === true);
  t('app: prueba primero es-CL', pedidas[0] === 'es-CL');
}
{
  const plugin = { isLanguageSupported: async () => ({ supported: false }), openInstall: async () => {} };
  const { api } = cargar({ plugin });
  t('app: ninguna variante descargada → falta', (await api.vozEspanolSinConexion()) === false);
}
{
  const plugin = { isLanguageSupported: async () => { throw new Error('motor no listo'); }, openInstall: async () => {} };
  const { api } = cargar({ plugin });
  t('app: si el motor no responde, "no se sabe" (no avisa por error)', (await api.vozEspanolSinConexion()) === null);
}

// ---- Flujo completo: aviso único con botón directo ----
{
  let abrio = 0;
  const plugin = { isLanguageSupported: async () => ({ supported: false }), openInstall: async () => { abrio++; } };
  const { api, dialogo, almacen, els } = cargar({ plugin });
  await api.revisarVozSinConexion();
  t('app sin voz: se abre el aviso', dialogo.abierto === true);
  t('el aviso explica para qué sirve y trae los pasos', /sin señal/.test(dialogo.msg) && /Instalar datos de voz/.test(dialogo.msg));
  t('en la app el botón abre la instalación', dialogo.ok === 'Abrir instalación de voz' && dialogo.no === 'Ahora no');
  els.lpDialogBtnOk.onclick();
  t('tocar el botón llama a openInstall', abrio === 1);
  t('queda anotado cuándo se avisó', Number(almacen.lp_voz_sin_conexion_aviso) > 0);
  dialogo.abierto = false;
  await api.revisarVozSinConexion();
  t('la segunda vez (mismo día) no vuelve a aparecer', dialogo.abierto === false);
}
{
  const plugin = { isLanguageSupported: async () => ({ supported: true }), openInstall: async () => {} };
  const { api, dialogo } = cargar({ plugin });
  await api.revisarVozSinConexion();
  t('app con voz: no aparece nada', dialogo.abierto === false);
}
// ---- Web en Android: pasos escritos, sin botón de instalar ----
{
  const { api, dialogo } = cargar({ voces: [{ lang: 'en-US', localService: true }] });
  await api.revisarVozSinConexion();
  t('web Android sin voz española: aviso con pasos', dialogo.abierto === true && /Texto a voz/.test(dialogo.msg));
  t('web: el botón dice "Entendido" (no hay cómo abrir la pantalla)', dialogo.ok === 'Entendido');
}
{
  const { api, dialogo } = cargar({ voces: [{ lang: 'en-US', localService: true }], ua: 'Mozilla/5.0 (Windows NT 10.0)' });
  await api.revisarVozSinConexion();
  t('computador: nunca avisa', dialogo.abierto === false);
}

// ---- Enganches ----
t('se revisa al calcular la ruta de navegación', /revisarVozSinConexion\(\)/.test(NAV));
t('se revisa al descargar el mapa de la ruta', /async function descargarMapaRuta\(\)[\s\S]{0,400}revisarVozSinConexion\(\)/.test(MAPA));
t('index.html carga voz-sin-conexion.js', /<script src="voz-sin-conexion\.js"><\/script>/.test(HTML));
t('sw.js lo precachea', /'\.\/voz-sin-conexion\.js'/.test(SW));

console.log('  voz-sin-conexion.test.mjs: ' + ok + ' OK' + (fail ? ', ' + fail + ' FALLAN' : ''));
process.exit(fail ? 1 : 0);
