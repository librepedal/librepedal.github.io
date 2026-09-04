// Bug real rescatado de una rama vieja (commit 247f6c7, 2026-08-15): compartirPerfilComunidad()
// genera un link `?perfil=<id>` (Web Share API / portapapeles), pero nada en el arranque de
// la app leía ese parámetro -- quien abría el link solo veía la app normal, nunca el perfil
// compartido. El fix original tocaba `index.html` directo, que ya no existe así tras el
// refactor de 23 dominios -- se rescató a mano en auth-vinculo.js (window.onload actual),
// confirmando primero que el bug seguía vivo (sin match de URLSearchParams para 'perfil' en
// todo el proyecto) antes de portarlo.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(raiz, 'auth-vinculo.js'), 'utf8');

let ok = 0, fail = 0;
const t = (n, c) => { if (c) ok++; else { fail++; console.log('  FALLA: ' + n); } };

function bloque(desde) {
  const i = SRC.indexOf(desde);
  if (i < 0) { console.log('  FALLA: no encontré "' + desde + '" (¿cambió el archivo?)'); process.exit(1); }
  let prof = 0, q = null;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) {
    const c = SRC[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && SRC[k + 1] === '/') { k = SRC.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return SRC.slice(i, k + 1);
  }
  console.log('  FALLA: no pude balancear -> ' + desde); process.exit(1);
}

const ONLOAD = bloque('window.onload = async function(){');
const iSesionIf = ONLOAD.indexOf('if(sesion){');
const iElse = ONLOAD.lastIndexOf('} else {');
const ramaSesion = ONLOAD.slice(iSesionIf, iElse);

t('la lectura de ?perfil= vive DENTRO de la rama logueada (sesion), no antes ni en el else',
  ramaSesion.includes("URLSearchParams(location.search).get('perfil')"));
t('llama a verPerfilUsuario con el id leído', ramaSesion.includes('verPerfilUsuario(_pid)'));
t('limpia el parámetro de la URL después de abrir el perfil (no queda pegado en el historial)',
  /verPerfilUsuario\(_pid\);\s*history\.replaceState/.test(ramaSesion));
t('está envuelto en try/catch (un fallo acá no debe tumbar el resto del arranque)',
  /try\{\s*const _pid=new URLSearchParams[\s\S]{0,300}\}catch\(e\)\{\}/.test(ramaSesion));
t('NO se agregó en la rama sin sesión (el modal quedaría tapado por la pantalla de login, z-index)',
  !ONLOAD.slice(iElse).includes("get('perfil')"));

console.log(`  perfil-compartido-link.test.mjs: ${ok} OK${fail ? ', ' + fail + ' FALLAN' : ''}`);
process.exit(fail ? 1 : 0);
