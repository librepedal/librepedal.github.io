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

const VIDA_S = 24 * 60 * 60; // 24h "blando": pasado esto, el dato se considera viejo y se
// refresca -- pero se sigue SIRVIENDO mientras se refresca (ver stale-while-revalidate
// abajo), nunca se bloquea a nadie esperando la lectura pesada de Firestore.
const VIDA_S_DURA = 3 * VIDA_S; // 72h: TTL real del Cache API -- el margen entre el TTL
// blando y este da varios días de gracia si el refresco en segundo plano falla seguido
// (ej. Firestore sin cuota), antes de que la Cache API borre el dato y quede vacío.

const CLAVE_CACHE = new Request('https://cache.interno.librepedal/mapa');
// Auditoría 2026-09-22 (cache stampede): el candado de refresco es su PROPIA entrada de
// Cache API con TTL corto -- si ya hay uno puesto, ninguna otra request en la misma PoP
// dispara otra lectura de 6000 documentos en paralelo mientras la primera termina.
const CLAVE_REFRESCANDO = new Request('https://cache.interno.librepedal/mapa-refrescando');
const VIDA_CANDADO_S = 120; // más que de sobra para que termine leerTodo(max:6000)

const json = (obj, status, cacheControl) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...(cacheControl ? { 'cache-control': cacheControl } : {}) },
});

async function _leerYCachear(env, cache) {
  if (!env.FIREBASE_SA) return null;
  const r = await leerTodo(env, 'recommendations', { max: 6000 });
  if (r.error) return null;

  const puntos = (r.docs || [])
    .filter((d) => d.lat && d.lon)
    .map((d) => ({
      id: d._id, lat: d.lat, lon: d.lon, cat: d.cat, user: d.user,
      title: d.title, desc: (typeof d.desc === 'string' ? d.desc.slice(0, 200) : ''),
      tsMs: (d.ts ? (Date.parse(d.ts) || 0) : 0),
    }));

  const resp = json({ puntos, medido: new Date().toISOString() }, 200, `public, max-age=${VIDA_S_DURA}`);
  try { await cache.put(CLAVE_CACHE, resp.clone()); } catch (e) {}
  return resp;
}

export async function onRequestGet({ env, waitUntil }) {
  const cache = caches.default;
  const previa = await cache.match(CLAVE_CACHE);

  if (previa) {
    let stale = true;
    try { stale = (Date.now() - Date.parse((await previa.clone().json()).medido || 0)) > VIDA_S * 1000; } catch (e) {}
    if (!stale) return previa;
    // Stale pero todavía dentro del TTL duro: se sirve YA (nadie espera la lectura
    // pesada) y se dispara el refresco en segundo plano -- salvo que otra request ya
    // esté refrescando ahora mismo (candado).
    const yaRefrescando = await cache.match(CLAVE_REFRESCANDO);
    if (!yaRefrescando) {
      try { await cache.put(CLAVE_REFRESCANDO, new Response('1', { headers: { 'cache-control': `max-age=${VIDA_CANDADO_S}` } })); } catch (e) {}
      waitUntil(_leerYCachear(env, cache).catch(() => {}));
    }
    return previa;
  }

  // Sin nada cacheado todavía (primera vez en esta PoP, o recién desplegado): no hay dato
  // stale que servir, así que sí toca esperar la lectura -- pero igual respeta el candado
  // para no apilar varias lecturas de 6000 documentos si varias requests llegan juntas
  // en este arranque en frío.
  const yaRefrescando = await cache.match(CLAVE_REFRESCANDO);
  if (yaRefrescando) {
    await new Promise((res) => setTimeout(res, 400));
    const reintento = await cache.match(CLAVE_CACHE);
    if (reintento) return reintento;
  }
  try { await cache.put(CLAVE_REFRESCANDO, new Response('1', { headers: { 'cache-control': `max-age=${VIDA_CANDADO_S}` } })); } catch (e) {}
  const fresco = await _leerYCachear(env, cache);
  if (fresco) return fresco;
  return json({ error: env.FIREBASE_SA ? 'error' : 'sin credencial' }, env.FIREBASE_SA ? 200 : 503);
}
