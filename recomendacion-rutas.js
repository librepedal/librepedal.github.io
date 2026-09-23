/* ===== RECOMENDACIÓN DE RUTAS INTELIGENTE =====
   Heurística gratuita (sin IA de pago): mira tu propio historial — cuántos km
   sueles andar — y te sugiere rutas de otros ciclistas un poco más largas que tu
   promedio (10-35% más, la regla clásica de progresión: sumar sin pasarse). */
function _perfilCiclista(){
  const rutas=rutasLocales();
  if(!rutas.length) return null;
  const totalKm=rutas.reduce(function(s,r){return s+(r.distance||0);},0);
  return { avgKm:totalKm/rutas.length, totalViajes:rutas.length };
}
async function verRecomendacionRutas(){
  _modalVolverA=null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-compass"></i> Rutas para ti';
  const c=document.getElementById('modalContent');
  c.innerHTML=_btnVolverModal()+'<p style="color:#888">Analizando tu historial...</p>';
  document.getElementById('userModal').classList.add('on');
  const perfil=_perfilCiclista();
  if(!perfil){ c.innerHTML=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.85rem">Todavía no tienes viajes registrados. ¡Sal a pedalear y vuelve para tus recomendaciones!</p>'; return; }
  // Sin filtro de cercanía, esto podía sugerir una ruta preciosa... al otro lado del
  // país, solo porque calzaba con tu distancia habitual. Se descarta lo que esté a
  // más de 80km de donde estás — nadie maneja horas solo para ir a pedalear.
  const yo=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
  if(!yo){ c.innerHTML=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.85rem">Necesito tu ubicación para buscar rutas cerca tuyo. Activa el GPS e inténtalo de nuevo.</p>'; return; }
  try{
    const minKm=perfil.avgKm*1.1, maxKm=perfil.avgKm*1.35;
    const RADIO_CERCANIA_KM=80;
    // Auditoría 2026-09-22: antes esto pedía las 200 rutas de MAYOR distancia de TODA la
    // comunidad (orderBy('distance','desc').limit(200)) y recién ahí filtraba por
    // minKm/maxKm en el cliente -- con pocos ciclistas alcanzaba a incluir el rango de
    // cualquiera, pero a medida que la comunidad crece esos 200 documentos se llenan de
    // las rutas más largas que existen (maratonistas de ruta, viajes de varios días), y
    // el rango real de un ciclista promedio (avgKm*1.1 a avgKm*1.35, casi siempre bien
    // por debajo del tope de la comunidad) queda AFUERA de esos 200 -- "Rutas para ti"
    // sistemáticamente vacío para la mayoría, y cada vez peor con más usuarios. El rango
    // se pide directo con un filtro de Firestore sobre el mismo campo que ordena (no
    // necesita índice compuesto), así siempre trae rutas del rango que corresponde.
    const snap=await db.collection('routes').where('distance','>=',minKm).where('distance','<=',maxKm).orderBy('distance').limit(200).get();
    const candidatas=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());})
      .filter(function(r){
        // pointsPub (privacidad, hub #201): track difuminado -- recortado en las puntas y
        // redondeado, nunca el domicilio/destino real de otro ciclista. Fallback a .points
        // solo para rutas viejas guardadas antes de este fix.
        const pts=r.pointsPub||r.points;
        if(r.user===cu || !pts || !pts.length) return false;
        const p0=pts[0];
        if(p0.lat==null || p0.lon==null) return false;
        return calculateDistance(yo.lat, yo.lon, p0.lat, p0.lon)/1000 <= RADIO_CERCANIA_KM;
      })
      .slice(0,8);
    let html=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.85rem;margin-top:0">Tu promedio es <strong style="color:var(--g)">'+perfil.avgKm.toFixed(1)+' km</strong> en '+perfil.totalViajes+' viajes. Estas rutas de otros ciclistas cerca tuyo te ayudan a subir el nivel de a poco:</p>';
    if(!candidatas.length){ html+='<p style="color:#7d8ba0;font-size:0.82rem">Todavía no hay rutas de otros ciclistas en ese rango de distancia cerca tuyo. Vuelve más adelante.</p>'; }
    else { html+=candidatas.map(function(r){ const pts=r.pointsPub||r.points; const distCerca=(calculateDistance(yo.lat,yo.lon,pts[0].lat,pts[0].lon)/1000).toFixed(0); return '<div class="novedad-card"><h4>'+(r.distance||0).toFixed(1)+' km</h4><p>De '+escapeHTML(r.nombre||'un ciclista')+' · a '+distCerca+' km de ti</p><button class="ab sec" style="margin:0" onclick="closeModal();showSingleRoute(\''+r.id+'\')"><i class="fas fa-eye"></i> Ver en el mapa</button></div>'; }).join(''); }
    c.innerHTML=html;
  }catch(e){ c.innerHTML=_btnVolverModal()+'<p style="color:#888">No se pudieron cargar recomendaciones.</p>'; }
}
