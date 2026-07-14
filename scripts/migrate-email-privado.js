// Migración única — Libre Pedal (2026-07-14)
// Mueve el campo `email` de /users/{id} (público, lectura abierta a
// propósito para Ranking/perfiles) a /usersPrivate/{id} (solo dueño+admin,
// ver firestore.rules). Cierra el hueco real: cualquiera con la config
// pública de Firebase podía leer el correo de TODA la comunidad sin ser
// admin ni estar logueado.
//
// Seguridad del proceso:
//  - Por defecto corre en modo DRY RUN (no escribe nada, solo informa).
//  - Para escribir de verdad: node scripts/migrate-email-privado.js --escribir
//  - Idempotente: si un usuario ya tiene su email en usersPrivate, no lo
//    vuelve a escribir; si /users/{id} ya no tiene email, no intenta borrarlo.
//  - Requiere que YA se haya corrido `node scripts/backup-firestore.js` antes
//    (respaldo real de toda la colección `users`, no solo de este campo).
//
// Uso:  node scripts/migrate-email-privado.js            (dry run, no toca nada)
//       node scripts/migrate-email-privado.js --escribir  (migra de verdad)

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const KEY_PATH = path.join(__dirname, '..', 'firebase-service-account.json');
const ESCRIBIR = process.argv.includes('--escribir');

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    console.error('No encuentro la llave en ' + KEY_PATH);
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('Proyecto: ' + serviceAccount.project_id);
  console.log('Modo: ' + (ESCRIBIR ? 'ESCRIBIENDO DE VERDAD' : 'DRY RUN (no escribe nada)'));
  console.log('');

  const usersSnap = await db.collection('users').get();
  console.log('Usuarios encontrados en /users: ' + usersSnap.size);

  let conEmailPublico = 0, yaMigrados = 0, aMigrar = 0, sinEmail = 0, errores = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (!data.email) { sinEmail++; continue; }
    conEmailPublico++;

    let yaTienePrivado = false;
    try {
      const privDoc = await db.collection('usersPrivate').doc(doc.id).get();
      yaTienePrivado = privDoc.exists && !!privDoc.data().email;
    } catch (e) { /* si falla la lectura, se trata como "no migrado" y se reintenta */ }

    if (yaTienePrivado) { yaMigrados++; continue; }

    aMigrar++;
    if (ESCRIBIR) {
      try {
        await db.collection('usersPrivate').doc(doc.id).set({ email: data.email }, { merge: true });
        await db.collection('users').doc(doc.id).update({ email: require('firebase-admin/firestore').FieldValue.delete() });
      } catch (e) {
        errores++;
        console.log('  ERROR con ' + doc.id + ': ' + e.message);
      }
    } else {
      console.log('  migraría: ' + doc.id + ' (' + data.email + ')');
    }
  }

  console.log('');
  console.log('Resumen:');
  console.log('  con email en /users (público):     ' + conEmailPublico);
  console.log('  sin email (nada que migrar):        ' + sinEmail);
  console.log('  ya tenían usersPrivate:              ' + yaMigrados);
  console.log('  ' + (ESCRIBIR ? 'migrados ahora:' : 'PENDIENTES de migrar:') + '                     ' + aMigrar);
  if (ESCRIBIR) console.log('  errores:                             ' + errores);
  if (!ESCRIBIR && aMigrar > 0) {
    console.log('');
    console.log('Esto fue un DRY RUN — no se escribió nada. Para migrar de verdad:');
    console.log('  node scripts/migrate-email-privado.js --escribir');
  }
  process.exit(errores > 0 ? 1 : 0);
}

main().catch(function (e) { console.error('Error general:', e); process.exit(1); });
