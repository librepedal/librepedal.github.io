// /api/mapa — caché compartida de los puntos del mapa de Libre Pedal, propia.
//
// Nace de la crisis de cuota de Firestore del 2026-08-24: cada teléfono SIN caché local
// (instalación nueva, o caché vencida a los 7 días) le pedía a Firestore la colección
// `recommendations` completa (~4.000 documentos) — con 51 testers eso solo, sumado a lo
// demás, agotó la cuota gratis DOS veces la misma noche. Este endpoint hace esa lectura
// pesada UNA sola vez por ventana de caché y la sirve igual a cualquiera que la pida.
//
// SEPARADO DE CAPONE el 2026-09-05: hasta ahora esto vivía en asistente-inty (otro
// proyecto de Cloudflare, otra app -- el asistente de Inty), y el teléfono de cada
// ciclista dependía de ESE proyecto para pintar el mapa. Si Capone se caía o le rotaban
// un secreto, el mapa de LibrePedal se rompía para usuarios reales sin ninguna razón
// relacionada con LibrePedal. Ahora vive acá, mismo origen que librepedal.cl, cero
// dependencia cruzada. Usa la Cache API de borde (no KV): no hace falta ningún binding
// nuevo en el proyecto de Cloudflare, solo el secreto FIREBASE_SA.
//
// Público a propósito (sin código de dueño) -- lo llama el teléfono de cualquier tester.
// index.html/mapa-render.js (_mapPointsSemillaCompartida) lo usa solo para SEMBRAR el
// caché del teléfono cuando no hay uno local; después sigue con la consulta incremental
// directa a Firestore de siempre (`where('ts','>',...)`), que ya es barata.
import { leerTodo } from './_firestore.js';

const VIDA_S = 24 * 60 * 60; // 24h: los puntos nuevos de la comunidad tardan como mucho un
// día en propagarse a las cachés nuevas -- aceptable en prueba cerrada, y mantiene el costo
// de esta lectura pesada en un techo diario, no por visita.

const CLAVE_CACHE = new Request('https://cache.interno.librepedal/mapa');

const json = (obj, status, cacheControl) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...(cacheControl ? { 'cache-control': cacheControl } : {}) },
});

export async function onRequestGet({ env }) {
  const cache = caches.default;
  const previa = await cache.match(CLAVE_CACHE);
  if (previa) return previa;

  if (!env.FIREBASE_SA) return json({ error: 'sin credencial' }, 503);

  const r = await leerTodo(env, 'recommendations', { max: 6000 });
  if (r.error) return json({ error: r.error }, 200);

  const puntos = (r.docs || [])
    .filter((d) => d.lat && d.lon)
    .map((d) => ({
      id: d._id, lat: d.lat, lon: d.lon, cat: d.cat, user: d.user,
      title: d.title, desc: (typeof d.desc === 'string' ? d.desc.slice(0, 200) : ''),
      tsMs: (d.ts ? (Date.parse(d.ts) || 0) : 0),
    }));

  const resp = json({ puntos, medido: new Date().toISOString() }, 200, `public, max-age=${VIDA_S}`);
  try { await cache.put(CLAVE_CACHE, resp.clone()); } catch (e) {}
  return resp;
}
