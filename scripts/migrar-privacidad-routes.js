// Migración retroactiva de privacidad para /routes (hub #201, 2026-09-04).
//
// El fix en rutas.js (commit 28995f2) protege lo que se sube DE AHORA EN ADELANTE, pero
// los documentos /routes que YA existían en producción antes de ese commit siguen con
// `points` completo -- el track GPS exacto, sin redondear -- expuesto en una colección
// pública. Este script cierra ese hueco retroactivamente:
//
//   1. Recorre TODOS los documentos de /routes que tengan `points` (el campo crudo).
//   2. Si ese id no tiene ya un documento en /routesTrack, le guarda ahí el track exacto
//      (misma forma que _subirRutaNube en rutas.js: {user, authUid, points}) -- así el
//      dueño no pierde nada, solo deja de ser público.
//   3. En /routes: agrega `pointsPub` (calculado con la MISMA _puntosPublicos de
//      rutas.js, copiada literal acá para no depender del navegador) y borra `points`.
//
// Por defecto corre en DRY-RUN (no escribe nada, solo cuenta y muestra 3 ejemplos).
// Para aplicar de verdad: node scripts/migrar-privacidad-routes.js --aplicar
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');

const APLICAR = process.argv.includes('--aplicar');

const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
// El Admin SDK, a diferencia del SDK de navegador, rechaza `undefined` en un campo (p.ej.
// puntos GPS viejos sin `speed`/`alt`) -- el SDK de cliente lo tolera omitiendo el campo,
// así que esto nunca había hecho falta hasta este script server-side.
db.settings({ ignoreUndefinedProperties: true });

// Copia literal de _puntosPublicos() en rutas.js -- no se importa desde ahí porque ese
// archivo es código de navegador (usa `db`/`cu` globales), no un módulo Node.
function _puntosPublicos(pts) {
  if (!pts || pts.length < 3) return [];
  const RECORTE = Math.min(3, Math.floor(pts.length / 4));
  const medio = RECORTE > 0 ? pts.slice(RECORTE, pts.length - RECORTE) : pts;
  const base = (medio && medio.length) ? medio : pts;
  return base.map(function (p) {
    return { t: p.t, lat: Math.round(p.lat * 1000) / 1000, lon: Math.round(p.lon * 1000) / 1000, speed: p.speed, alt: p.alt };
  });
}

async function main() {
  console.log(APLICAR ? '=== APLICANDO (escribe en producción) ===' : '=== DRY-RUN (no escribe nada) ===');

  const snap = await db.collection('routes').get();
  console.log(`Documentos totales en /routes: ${snap.size}`);

  const conPointsCrudo = snap.docs.filter(d => Array.isArray(d.data().points) && d.data().points.length > 0);
  console.log(`Documentos con "points" crudo (a migrar): ${conPointsCrudo.length}`);

  if (!conPointsCrudo.length) { console.log('Nada que migrar.'); return; }

  let creadosTrack = 0, yaTeniaTrack = 0, sinPuntosSuficientes = 0;
  const ejemplos = [];

  for (const doc of conPointsCrudo) {
    const id = doc.id;
    const data = doc.data();
    const pts = data.points;
    const pointsPub = _puntosPublicos(pts);

    const trackDoc = await db.collection('routesTrack').doc(id).get();
    const necesitaTrack = !(trackDoc.exists && Array.isArray(trackDoc.data().points) && trackDoc.data().points.length);

    if (ejemplos.length < 3) {
      ejemplos.push({ id, puntosOriginales: pts.length, puntosPublicos: pointsPub.length, necesitaTrack });
    }

    if (pointsPub.length === 0) sinPuntosSuficientes++;

    if (APLICAR) {
      if (necesitaTrack) {
        await db.collection('routesTrack').doc(id).set({ user: data.user || null, authUid: data.authUid || null, points: pts }, { merge: true });
        creadosTrack++;
      } else {
        yaTeniaTrack++;
      }
      const update = { pointsPub, points: FieldValue.delete() };
      await db.collection('routes').doc(id).update(update);
    } else {
      if (necesitaTrack) creadosTrack++; else yaTeniaTrack++;
    }
  }

  console.log('\n--- Ejemplos (primeros 3) ---');
  ejemplos.forEach(e => console.log(`  ${e.id}: ${e.puntosOriginales} puntos -> ${e.puntosPublicos} públicos, ${e.necesitaTrack ? 'CREA /routesTrack nuevo' : 'ya tenía /routesTrack'}`));

  console.log('\n--- Resumen ---');
  console.log(`Documentos migrados: ${conPointsCrudo.length}`);
  console.log(`  -> /routesTrack creado nuevo: ${creadosTrack}`);
  console.log(`  -> /routesTrack ya existía (no se tocó): ${yaTeniaTrack}`);
  console.log(`  -> quedaron con pointsPub vacío (menos de 3 puntos originales): ${sinPuntosSuficientes}`);
  console.log(APLICAR ? '\nAPLICADO. points crudo borrado de /routes en todos los documentos de arriba.' : '\nDRY-RUN: no se escribió nada. Corré con --aplicar para ejecutar de verdad.');
}

main().then(() => process.exit(0)).catch(e => { console.error('ERROR:', e); process.exit(1); });
