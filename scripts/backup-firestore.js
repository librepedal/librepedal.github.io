// Respaldo de Firestore — Libre Pedal
// Lee TODAS las colecciones reales de la app (ver firestore.rules para la lista
// vigente) y las guarda como JSON en LibrePedal-Backups/firestore-<fecha>/.
// Gratis: solo hace lecturas normales con el Admin SDK, no usa Cloud Storage
// ni necesita el plan de pago (Blaze) de Firebase.
//
// Uso:  node scripts/backup-firestore.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const KEY_PATH = path.join(__dirname, '..', 'firebase-service-account.json');
const OUT_ROOT = path.join(__dirname, '..', '..', 'LibrePedal-Backups');

const COLECCIONES_SIMPLES = [
  'users', 'chat', 'reportes', 'routeAlerts', 'guiComments', 'recommendations',
  'hostels', 'repairTips', 'routes', 'trips', 'friendRequests', 'diarios',
  'alojo', 'votacionComunidad', 'sorteoComunidad', 'frasesComunidad',
  'novedades', 'liveTracking', 'segmentos', 'segmentoTiempos', 'retos', 'rodadas'
];

function serializable(data) {
  // Los Timestamp de Firestore no son JSON-serializables directo; los pasamos a ISO.
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v.toDate === 'function') { out[k] = v.toDate().toISOString(); }
    else { out[k] = v; }
  }
  return out;
}

async function respaldarColeccion(db, nombre) {
  const snap = await db.collection(nombre).get();
  const docs = {};
  snap.forEach(function (doc) { docs[doc.id] = serializable(doc.data()); });
  return docs;
}

async function respaldarMensajesDM(db) {
  // dm/{conversationId}/messages/{msgId} — subcolección, hay que recorrerla aparte.
  const convSnap = await db.collection('dm').get();
  const out = {};
  for (const conv of convSnap.docs) {
    const msgsSnap = await db.collection('dm').doc(conv.id).collection('messages').get();
    const msgs = {};
    msgsSnap.forEach(function (m) { msgs[m.id] = serializable(m.data()); });
    out[conv.id] = msgs;
  }
  return out;
}

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    console.error('No encuentro la llave en ' + KEY_PATH);
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const outDir = path.join(OUT_ROOT, 'firestore-' + stamp);
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Respaldando proyecto: ' + serviceAccount.project_id);
  console.log('Destino: ' + outDir + '\n');

  const resumen = [];

  for (const col of COLECCIONES_SIMPLES) {
    try {
      const docs = await respaldarColeccion(db, col);
      const n = Object.keys(docs).length;
      fs.writeFileSync(path.join(outDir, col + '.json'), JSON.stringify(docs, null, 2));
      resumen.push({ coleccion: col, documentos: n });
      console.log('  ' + col.padEnd(20) + n + ' documentos');
    } catch (e) {
      resumen.push({ coleccion: col, error: e.message });
      console.log('  ' + col.padEnd(20) + 'ERROR: ' + e.message);
    }
  }

  try {
    const dm = await respaldarMensajesDM(db);
    const nConv = Object.keys(dm).length;
    const nMsgs = Object.values(dm).reduce(function (s, m) { return s + Object.keys(m).length; }, 0);
    fs.writeFileSync(path.join(outDir, 'dm.json'), JSON.stringify(dm, null, 2));
    resumen.push({ coleccion: 'dm/messages', conversaciones: nConv, mensajes: nMsgs });
    console.log('  ' + 'dm/messages'.padEnd(20) + nConv + ' conversaciones, ' + nMsgs + ' mensajes');
  } catch (e) {
    resumen.push({ coleccion: 'dm/messages', error: e.message });
    console.log('  ' + 'dm/messages'.padEnd(20) + 'ERROR: ' + e.message);
  }

  fs.writeFileSync(path.join(outDir, '_resumen.json'), JSON.stringify({ fecha: new Date().toISOString(), proyecto: serviceAccount.project_id, resumen: resumen }, null, 2));

  console.log('\nListo. Respaldo en: ' + outDir);
  process.exit(0);
}

main().catch(function (e) { console.error('Error general:', e); process.exit(1); });
