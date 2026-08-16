#!/usr/bin/env node
/**
 * Genera enlaces de acceso directo (magic links) SIN enviar ningún correo.
 *
 * Por qué existe (2026-08-16): la prueba cerrada tiene 51 testers esperando y el
 * login quedó bloqueado por dos lados a la vez —
 *   1. "Entrar con Google" no funciona en la app ya instalada (es config nativa,
 *      necesita un .aab nuevo subido a Play Console), y
 *   2. el envío de correo de Firebase responde OK pero el mail no llega
 *      (el traspaso a SMTP propio quedó a medias).
 *
 * Este script se salta los dos problemas: usa el Admin SDK para FABRICAR el mismo
 * enlace que mandaría el correo, y lo imprime. Inty se los pasa a los testers por
 * WhatsApp, que es por donde ya se comunica con ellos. El tester toca el enlace y
 * entra, sin contraseña y sin depender del correo.
 *
 * OJO — estos enlaces SON la credencial: quien tenga el enlace entra como ese
 * correo. Mandarlos SIEMPRE por privado, nunca a un grupo, y no publicarlos.
 *
 * Uso:
 *   node scripts/generar-enlaces-acceso.js correo1@x.com correo2@y.com
 *   node scripts/generar-enlaces-acceso.js --archivo testers.txt   (uno por línea)
 */
const fs = require('fs');
const path = require('path');
// firebase-admin 14 usa exports modulares: el require raíz ya NO trae `.credential`
// (por eso fallaba con "Cannot read properties of undefined (reading 'cert')").
// Por nombre de paquete, no por ruta absoluta: los subcaminos (`/app`, `/auth`) los
// resuelve el mapa "exports" del package.json, y ese mapa se saltea si se pide por
// ruta directa a la carpeta.
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const cuenta = require(path.join(__dirname, '..', 'firebase-service-account.json'));
initializeApp({ credential: cert(cuenta) });

// Mismos parámetros que usa la app al pedir el enlace por correo, para que la
// vuelta caiga en el mismo flujo de siempre y no en un camino distinto.
// El correo va en `?em=` dentro del continueUrl: el tester nunca pidió el enlace desde
// su teléfono, así que la app no lo tiene guardado y, sin esto, le saldría un prompt
// pidiéndole que lo escriba. Con `em` entra de un solo toque. El secreto del enlace es
// el `oobCode`, no el correo, así que esto no debilita nada.
function ajustesPara(correo) {
  return {
    url: 'https://librepedal.cl/?em=' + encodeURIComponent(correo),
    handleCodeInApp: true
  };
}

function leerCorreos(args) {
  const iArchivo = args.indexOf('--archivo');
  if (iArchivo !== -1) {
    const ruta = args[iArchivo + 1];
    if (!ruta) { console.error('Falta la ruta después de --archivo'); process.exit(1); }
    return fs.readFileSync(ruta, 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && l.indexOf('@') !== -1 && !l.startsWith('#'));
  }
  return args.filter(a => a.indexOf('@') !== -1);
}

(async function () {
  const correos = leerCorreos(process.argv.slice(2));
  if (!correos.length) {
    console.error('Uso: node scripts/generar-enlaces-acceso.js correo@ejemplo.com [...]');
    console.error('     node scripts/generar-enlaces-acceso.js --archivo testers.txt');
    process.exit(1);
  }

  let ok = 0, fallaron = 0;
  for (const correo of correos) {
    try {
      const enlace = await getAuth().generateSignInWithEmailLink(correo, ajustesPara(correo));
      console.log('\n=== ' + correo + ' ===');
      console.log(enlace);
      ok++;
    } catch (e) {
      console.log('\n=== ' + correo + ' ===');
      console.log('FALLÓ: ' + (e && (e.code || e.message)));
      fallaron++;
    }
  }
  console.log('\n---');
  console.log('generados: ' + ok + '   fallaron: ' + fallaron);
  console.log('Recordá: cada enlace es una credencial. Mandalos por privado, nunca a un grupo.');
  process.exit(0);
})();
