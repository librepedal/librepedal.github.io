// /api/analitica — quién está usando Libre Pedal y quién no. Privado, solo para Inty.
//
// SEPARADO DE CAPONE el 2026-09-05: hasta ahora esto vivía en asistente-inty
// (functions/api/librepedal.js), otro proyecto de Cloudflare -- el asistente de Inty,
// no la app. Esa dirección (Capone leyendo datos de LibrePedal) nunca fue un riesgo de
// producción para LibrePedal, pero dejaba a dos proyectos separados compartiendo la misma
// credencial de administrador de Firestore sin necesidad real. Ahora vive acá, gatillado
// por su propio código de dueño (OWNER_CODE, propio de este proyecto -- no el mismo que
// usa Capone para lo suyo).
//
// CUIDADO CON LA CUOTA. La cuota gratuita de Firestore de Libre Pedal ya se agotó una vez
// con solo 48 usuarios, y cuando eso pasa la app se les rompe a los testers EN SILENCIO.
// Este endpoint es un invitado en esa base de datos, así que:
//   · cuenta con count() en vez de leer documentos donde se puede;
//   · TODA lectura lleva tope;
//   · el resultado se cachea 30 minutos en el borde (Cache API), para que abrir el panel
//     diez veces cueste una.
import { contar, leer } from './_firestore.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '');
const esDueno = (env, code) => {
  const c = norm(code);
  return !!(c && env.OWNER_CODE && c === norm(env.OWNER_CODE));
};

const CLAVE_CACHE = new Request('https://cache.interno.librepedal/analitica');
const VIDA_S = 30 * 60; // media hora

const dias = (iso) => {
  if (!iso) return null;
  const t = typeof iso === 'string' ? Date.parse(iso) : Number(iso);
  if (!t || Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
};

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  if (!esDueno(env, url.searchParams.get('k'))) return json({ error: 'sin identidad' }, 401);
  if (!env.FIREBASE_SA) return json({ error: 'Falta la credencial de Firebase (FIREBASE_SA).' }, 503);

  const cache = caches.default;
  const forzar = !!url.searchParams.get('fresco');
  if (!forzar) {
    const previa = await cache.match(CLAVE_CACHE);
    if (previa) return json({ ...(await previa.json()), cacheado: true });
  }

  // 1) Conteos: una lectura cada uno, no N.
  const [usuarios, rutas] = await Promise.all([contar(env, 'users'), contar(env, 'routes')]);
  if (usuarios.error === 'cuota' || rutas.error === 'cuota') {
    return json({
      error: 'cuota',
      mensaje: 'La cuota diaria de Firestore de Libre Pedal está agotada. Se reinicia sola, o se destraba activando el plan Blaze. Mientras tanto la app también les falla a los usuarios.',
    });
  }

  // 2) Las rutas traen quién las hizo y cuándo: de ahí sale la actividad real.
  const r = await leer(env, 'routes', { max: 300 });
  if (r.error === 'cuota') return json({ error: 'cuota', mensaje: 'Se agotó la cuota a mitad de la consulta.' });

  const porUsuario = {};
  for (const ruta of (r.docs || [])) {
    const quien = ruta.userId || ruta.uid || ruta.user || ruta.owner || '(sin dueño)';
    const cuando = ruta.createdAt || ruta.fecha || ruta.date || null;
    const km = Number(ruta.km || ruta.distancia || ruta.distance || 0) || 0;
    const u = porUsuario[quien] || (porUsuario[quien] = { rutas: 0, km: 0, ultima: null });
    u.rutas++; u.km += km;
    if (cuando && (!u.ultima || cuando > u.ultima)) u.ultima = cuando;
  }

  // 3) Los usuarios registrados, para ver quiénes NO aparecen arriba.
  const us = await leer(env, 'users', { max: 300 });
  const registrados = us.docs || [];

  // 4) Analítica de uso real (pantallas, tiempo, funciones) — colección `usage`. NO fatal
  //    si falla: es la parte más nueva y menos probada, así que si se cae el resto del
  //    panel (registrados/rutas/embudo) sigue funcionando igual.
  let analitica = null;
  try {
    const ua = await leer(env, 'usage', { max: 500 });
    if (!ua.error) {
      const pantalla = {}, tiempo = {}, funcion = {}, voz = {};
      let activosHoy = 0, activos7d = 0;
      const ahoraMs = Date.now();
      for (const d of (ua.docs || [])) {
        const uu = d.ultimoUso ? Date.parse(d.ultimoUso) : 0;
        if (uu && (ahoraMs - uu) < 86400000) activosHoy++;
        if (uu && (ahoraMs - uu) < 7 * 86400000) activos7d++;
        for (const [grupo, dst] of [['pantalla', pantalla], ['tiempo', tiempo], ['funcion', funcion], ['voz', voz]]) {
          if (d[grupo] && typeof d[grupo] === 'object') {
            for (const k in d[grupo]) dst[k] = (dst[k] || 0) + (Number(d[grupo][k]) || 0);
          }
        }
      }
      const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([nombre, valor]) => ({ nombre, valor }));
      analitica = {
        usuariosConActividad: (ua.docs || []).length,
        activosHoy, activos7d,
        pantallas: top(pantalla),
        tiempoMinPorPantalla: top(Object.fromEntries(Object.entries(tiempo).map(([k, v]) => [k, Math.round(v / 60)]))),
        funciones: top(funcion),
        voz: top(voz),
      };
    }
  } catch (e) {}

  const gente = registrados.map((u) => {
    const act = porUsuario[u._id] || { rutas: 0, km: 0, ultima: null };
    const d = dias(act.ultima);
    return {
      id: u._id,
      nombre: u.nombre || u.name || u.displayName || '(sin nombre)',
      registrado: u.createdAt || null,
      diasDesdeRegistro: dias(u.createdAt),
      rutas: act.rutas,
      km: Math.round(act.km * 10) / 10,
      diasSinRodar: d,
      // La clasificación de siempre: quién usa la app y quién no.
      estado: act.rutas === 0 ? 'nunca rodó' : (d !== null && d <= 7 ? 'activo' : (d !== null && d <= 30 ? 'tibio' : 'dormido')),
    };
  }).sort((a, b) => b.rutas - a.rutas);

  const cuenta = (e) => gente.filter((x) => x.estado === e).length;
  const datos = {
    medido: new Date().toISOString(),
    totales: {
      registrados: usuarios.n,
      rutas: rutas.n,
      // Honestidad: si hay más de 300, esto es una muestra y se dice.
      muestraCompleta: registrados.length >= usuarios.n && (r.docs || []).length >= rutas.n,
    },
    embudo: {
      activos: cuenta('activo'),
      tibios: cuenta('tibio'),
      dormidos: cuenta('dormido'),
      nuncaRodaron: cuenta('nunca rodó'),
    },
    gente: gente.slice(0, 120),
    analitica,
  };

  try {
    await cache.put(CLAVE_CACHE, new Response(JSON.stringify(datos), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `max-age=${VIDA_S}` },
    }));
  } catch (e) {}
  return json(datos);
}
