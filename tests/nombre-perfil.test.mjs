// Nombre editable en el Perfil (Inty, 2026-10-08: "no sé en qué momento se identifica el usuario con algún nombre...
// habría que dar la opción"; "averiguar cómo se hace, como lo resuelven los demás, intuitivo y fácil").
// Como WhatsApp/Strava: lápiz junto al nombre, se edita ahí mismo, 2 a 25 caracteres, no vacío.
// - se guarda en el teléfono y en users/{cu} con nombreElegido:true
// - al volver a entrar con Google, el nombre elegido NO se pisa con el de la cuenta de Google (antes sí, siempre)
// - si la nube falla, se dice y se puede reintentar
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(raiz, f), 'utf8');
let f = 0, n = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('  ✗ ' + m); } };
const index = leer('index.html'), tienda = leer('pistero-tienda.js'), sesion = leer('auth-sesion.js'), sw = leer('sw.js');

// ---------- marcado ----------
ok(/<button type="button" class="pt-nombre" id="ptNombreBtn" onclick="_nombreEditar\(\)" aria-label="Cambiar tu nombre"><span class="character-name" id="customizeCharacterName">[^<]*<\/span><i class="fas fa-pen"><\/i><\/button>/.test(index), 'Perfil: el nombre bajo Pistero lleva su lápiz y abre la edición');
ok(/id="ptNombreEdit" hidden/.test(index) && /id="ptNombreInput" maxlength="25"/.test(index), 'panel de edición oculto al inicio, campo de máx. 25');
ok(/Tu nombre en Libre Pedal/.test(index) && /Así te ven los demás ciclistas/.test(index), 'explica para qué es el nombre');
ok(/href="perfil-nombre\.css"/.test(index) && /'\.\/perfil-nombre\.css'/.test(sw), 'estilos en su archivo, enlazado y en la caché offline');

// ---------- lógica (funciones reales de pistero-tienda.js) ----------
const ini = tienda.indexOf('var NOMBRE_MAX');
ok(ini > 0, 'se encuentra la lógica del nombre');
function escenario(opts = {}) {
  const els = {
    ptNombreEdit: { hidden: true }, ptNombreInput: { value: '', focus() {}, setSelectionRange() {}, addEventListener() {} },
    ptNombreCont: { textContent: '' }, customizeCharacterName: { innerText: 'Viejo' }
  };
  const ayuda = { textContent: '', className: '' };
  const guardados = [], ls = {};
  const c = {
    console, String,
    document: { readyState: 'complete', getElementById: (id) => els[id] || null, querySelector: () => ayuda, addEventListener() {} },
    localStorage: { setItem: (k, v) => { ls[k] = v; } },
    window: {}, cu: 'cu' in opts ? opts.cu : 'ana_gmail_com', nombreUsuario: opts.nombre || 'Ana María Pérez González',
    db: { collection: (col) => ({ doc: (id) => ({ set: (data, o) => { guardados.push({ col, id, data, o }); return opts.falla ? Promise.reject(new Error('red')) : Promise.resolve(); } }) }) }
  };
  vm.createContext(c);
  vm.runInContext(tienda.slice(ini), c);
  return { c, els, ayuda, guardados, ls };
}
{
  const e = escenario();
  e.c._nombreEditar();
  ok(e.els.ptNombreEdit.hidden === false && e.els.ptNombreInput.value === 'Ana María Pérez González', 'tocar el lápiz abre la edición con el nombre actual');
  ok(e.els.ptNombreCont.textContent === '24/25', 'muestra el contador (24/25)');
  e.els.ptNombreInput.value = '  Ana   la <b>Ciclista</b>  ';
  e.c._nombreGuardar();
  ok(e.c.nombreUsuario === 'Ana la bCiclista/b', 'limpia espacios y < > (sin HTML en el nombre): "' + e.c.nombreUsuario + '"');
  ok(e.els.customizeCharacterName.innerText === e.c.nombreUsuario && e.els.ptNombreEdit.hidden === true, 'al guardar, el nombre cambia bajo Pistero y se cierra el panel');
  ok(e.ls['lp_nombre_ana_gmail_com'] === e.c.nombreUsuario, 'queda guardado en el teléfono');
  const g = e.guardados[0];
  ok(g && g.col === 'users' && g.id === 'ana_gmail_com' && g.data.nombre === e.c.nombreUsuario && g.data.nombreElegido === true && g.o.merge === true, 'se guarda en users/{cu} con nombreElegido:true (merge)');
}
{
  const e = escenario();
  e.c._nombreEditar(); e.els.ptNombreInput.value = ' a ';
  e.c._nombreGuardar();
  ok(e.guardados.length === 0 && e.ayuda.className === 'err' && /al menos 2/.test(e.ayuda.textContent) && e.els.ptNombreEdit.hidden === false, 'nombre de 1 letra o vacío: no guarda y lo explica');
  e.els.ptNombreInput.value = 'x'.repeat(40); e.c._nombreGuardar();
  ok(e.c.nombreUsuario.length === 25, 'nunca más de 25 caracteres');
}
{
  const e = escenario();
  e.c._nombreEditar(); e.els.ptNombreInput.value = 'Otro'; e.c._nombreCancelar();
  ok(e.els.ptNombreEdit.hidden === true && e.guardados.length === 0 && e.c.nombreUsuario === 'Ana María Pérez González', 'Cancelar no cambia nada');
}
{
  const e = escenario({ falla: true });
  e.c._nombreEditar(); e.els.ptNombreInput.value = 'Ana'; e.c._nombreGuardar();
  await new Promise((r) => setTimeout(r, 0));
  ok(e.els.ptNombreEdit.hidden === false && e.ayuda.className === 'err' && /no se pudo guardar en tu cuenta/.test(e.ayuda.textContent), 'si la nube falla, lo dice y deja reintentar');
}
{
  const e = escenario({ cu: null });
  e.c._nombreEditar(); e.els.ptNombreInput.value = 'Ana'; e.c._nombreGuardar();
  ok(e.guardados.length === 0 && /Entra a tu cuenta/.test(e.ayuda.textContent), 'sin sesión no intenta guardar');
}

// ---------- al volver a entrar, manda el nombre elegido ----------
const iS = sesion.indexOf('// 2026-10-08: si la persona eligió su nombre'), fS = sesion.indexOf('// Si ya existía cuenta en la nube');
ok(iS > 0 && fS > iS, 'auth-sesion.js respeta el nombre elegido al entrar');
function login(prev, nombreGoogle) {
  const ls = {};
  const c = { cu: 'ana_gmail_com', nombre: nombreGoogle, nombreUsuario: nombreGoogle, _prevData: prev, localStorage: { setItem: (k, v) => { ls[k] = v; } } };
  vm.createContext(c); vm.runInContext(sesion.slice(iS, fS), c);
  return { nombre: c.nombre, nombreUsuario: c.nombreUsuario, ls };
}
let r = login({ nombre: 'Anita', nombreElegido: true }, 'Ana María Pérez González');
ok(r.nombre === 'Anita' && r.nombreUsuario === 'Anita' && r.ls['lp_nombre_ana_gmail_com'] === 'Anita', 'entrar con Google NO pisa el nombre elegido (antes ponía el de Google)');
r = login({ nombre: 'Ana María Pérez González' }, 'Ana María Pérez González');
ok(r.nombre === 'Ana María Pérez González', 'quien nunca eligió nombre sigue como antes');
r = login(null, 'Nueva Persona');
ok(r.nombre === 'Nueva Persona', 'cuenta nueva: toma el nombre de Google como antes');

console.log(`nombre en el perfil: ${n - f}/${n} OK`);
process.exit(f ? 1 : 0);
