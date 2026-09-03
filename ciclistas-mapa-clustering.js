function gd(){ if(!cu) return; try{ localStorage.setItem('lp_u_'+cu,JSON.stringify(us)); localStorage.setItem('lp_j_'+cu,JSON.stringify(uj)); localStorage.setItem('lp_r_'+cu,JSON.stringify(rh)); }catch(e){ /* almacenamiento lleno o modo privado: no debe cortar la función que llamó a gd() */ } }
async function getNombreUsuario(userId){ if(userId===cu) return nombreUsuario; try{ const doc=await db.collection('users').doc(userId).get(); if(doc.exists && doc.data().nombre) return doc.data().nombre; }catch(e){} return userId; }
// usuariosCercanosData: mismo dato que los markers "sm" pero en crudo (lat/lon/nombre
// planos) — se guarda aparte porque un marker de MapLibre no expone bien el nombre
// para calcular "cuántos ciclistas cerca" por voz sin tener que parsear el popup HTML.
let usuariosCercanosData=[];
// 2026-07-14: quitado el await getNombreUsuario(doc.id) por usuario (una lectura
// EXTRA a Firestore por cada ciclista visible, en CADA disparo del listener — con
// varios usuarios moviéndose a la vez esto multiplicaba las lecturas de forma
// descontrolada: 170K lecturas vs solo 2.9K escrituras el día que se cayó la app,
// confirmado en Firebase Console). El nombre YA viene en el mismo documento
// (reg() lo guarda como campo `nombre`) — no hace falta pedirlo de nuevo. También
// se agrega .limit(150): sin tope, la consulta crece sin control con más usuarios.
// 2026-08-20: el mapa principal y el mapa de navegación usaban DOS suscripciones
// Firestore separadas pero con la MISMA consulta (users, visible==true, limit 150) —
// cada actualización de posición se pagaba dos veces en lecturas. Ahora hay UNA sola
// suscripción (acá abajo); ambos mapas se pintan desde el mismo snapshot en memoria.
let _lastUsersSnapshotDocs=null;
// Tamaño de los cascos en el mapa principal según el zoom (pedido de Inty,
// 2026-08-21): a escala país/mundo se veían todos igual de grandes que a escala
// calle, amontonados. Ajusta la var CSS --rider-scale (usada por .helmet-pin svg).
// Valores calibrados en vivo por Inty con el panel de control del demo
// (COORDINACION-IA/mapa-navegacion). El valor de "continente" quedó ajustado a
// mano (0.35->0.56 en tamaño, 50->110px en agrupamiento): el que había asignado
// Inty hacía que el ciclista se achicara al pasar de mundo a continente y volviera
// a crecer después — visualmente se veía como que "encogía", así que se corrigió
// para que crezca parejo en todos los escalones (mundo 0.51 -> continente 0.56 ->
// país 0.62 -> regional 0.80 -> ciudad 0.92).
function _riderScaleParaZoom(zoom){ if(zoom<2) return 0.51; if(zoom<4) return 0.56; if(zoom<7) return 0.62; if(zoom<10) return 0.80; if(zoom<13) return 1; return 1.15; }
// Celda de agrupamiento (en píxeles de pantalla) para juntar ciclistas cercanos en
// una tarjeta de grupo en vez de superponer cascos idénticos. 0 = sin agrupar
// (zoom de calle, donde cada ciclista ya se ve suficientemente separado).
function _celdaClusterParaZoom(zoom){ if(zoom<2) return 154; if(zoom<4) return 110; if(zoom<7) return 66; if(zoom<10) return 48; return 0; }
// Tope del delay aleatorio de parpadeo (para que los ciclistas no parpadeen todos
// a la vez, ver .lp-parpadeo) y tamaño de la tarjeta de grupo — mismos valores
// calibrados en vivo.
const RIDER_BLINK_MAX_S=5.4;
const RIDER_STACK_MAX=2;
const RIDER_STACK_AV_PX=16;
function _miniHelmetSVG_cluster(col){
  // Ojos con brillo blanco (igual que el personaje completo, eO() más abajo): sin
  // esto, dos círculos oscuros lisos sobre la sombra del casco (también oscura) se
  // leen como agujeros de máscara, no como ojos. Reporte real de Inty, 2026-08-22.
  return '<svg viewBox="0 0 100 84" xmlns="http://www.w3.org/2000/svg">'
    +'<path d="M16 50 Q16 78 50 80 Q84 78 84 50 Z" fill="#f4c9a0"/>'
    +'<path d="M12 54 A38 36 0 0 1 88 54 Z" fill="'+col+'"/>'
    +'<path d="M12 54 Q50 63 88 54 L88 50 Q50 58 12 50 Z" fill="rgba(0,0,0,0.22)"/>'
    +'<ellipse cx="40" cy="63" rx="6.2" ry="7.6" fill="#16203a"/><circle cx="37.8" cy="60" r="2.5" fill="#fff"/>'
    +'<ellipse cx="60" cy="63" rx="6.2" ry="7.6" fill="#16203a"/><circle cx="57.8" cy="60" r="2.5" fill="#fff"/>'
    +'</svg>';
}
// Tarjeta de grupo: pila de cascos reales (jersey de cada ciclista) en vez de un
// número pelado — pedido de Inty tras ver la primera versión ("no quiero mostrar
// grupos de ciclistas esa manera"). RIDER_STACK_MAX cascos visibles, el resto en
// una píldora "+N".
function riderClusterHTML(grupo){
  const shown=grupo.slice(0, RIDER_STACK_MAX);
  const extra=grupo.length-shown.length;
  const avatares=shown.map(function(u,i){ return '<span class="rc-av" style="width:'+RIDER_STACK_AV_PX+'px;height:'+Math.round(RIDER_STACK_AV_PX*0.73)+'px;margin-left:'+(i===0?0:-Math.round(RIDER_STACK_AV_PX*0.42))+'px;z-index:'+(RIDER_STACK_MAX-i)+'">'+_miniHelmetSVG_cluster(u.jersey||'#00aaff')+'</span>'; }).join('');
  const mas=extra>0?('<span class="rc-more">+'+extra+'</span>'):'';
  return '<div class="rider-cluster"><span class="rc-stack">'+avatares+'</span>'+mas+'</div>';
}
function _actualizarVisibilidadCiclistas(){
  if(!mp) return;
  document.documentElement.style.setProperty('--rider-scale', _riderScaleParaZoom(mp.getZoom()));
  if(_lastUsersSnapshotDocs) _renderMainMapUsers(_lastUsersSnapshotDocs);
  if(typeof renderReporteMarkers==='function') renderReporteMarkers();
  if(typeof _dibujarZonasRojas==='function') _dibujarZonasRojas();
}
function _pintarUnCiclista(u){ const marker=mlMarker([u.lat,u.lon],{icon:{html:riderMarkerHTML(u.helmet,u.jersey,false)}}).addTo(mp).bindPopup(_lpPopupCiclista(u.nombre,u.helmet,u.id)); sm.push(marker); }
function _renderMainMapUsers(docs){
  if(!mp) return;
  sm.forEach(function(m){mp.removeLayer(m);}); sm=[]; usuariosCercanosData=[];
  const vivos=[];
  docs.forEach(function(doc){
    const data=doc.data();
    if(data.lat&&data.lon&&doc.id!==cu){
      const nombre=data.nombre||doc.id;
      usuariosCercanosData.push({id:doc.id,nombre:nombre,lat:data.lat,lon:data.lon});
      vivos.push({id:doc.id,nombre:nombre,lat:data.lat,lon:data.lon,helmet:data.helmet||'giro',jersey:data.skin?skinColor(data.skin):'#ff6600'});
    }
  });
  const celda=_celdaClusterParaZoom(mp.getZoom());
  if(celda<=0 || vivos.length<2){ vivos.forEach(_pintarUnCiclista); return; }
  const buckets={};
  vivos.forEach(function(u){ const p=mp.project([u.lon,u.lat]); const key=Math.round(p.x/celda)+'_'+Math.round(p.y/celda); (buckets[key]=buckets[key]||[]).push(u); });
  Object.keys(buckets).forEach(function(k){
    const grupo=buckets[k];
    if(grupo.length===1){ _pintarUnCiclista(grupo[0]); return; }
    const lat=grupo.reduce(function(s,u){return s+u.lat;},0)/grupo.length, lon=grupo.reduce(function(s,u){return s+u.lon;},0)/grupo.length;
    const marker=mlMarker([lat,lon],{icon:{html:riderClusterHTML(grupo)}}).addTo(mp);
    const el=marker._ml&&marker._ml.getElement();
    if(el) el.addEventListener('click', function(){ mp.flyTo({center:[lon,lat], zoom:Math.min(mp.getZoom()+3,15)}); });
    sm.push(marker);
  });
}
function _renderNavMapUsers(docs){ if(!navMap) return; navUserMarkers.forEach(function(m){ navMap.removeLayer(m); }); navUserMarkers=[]; docs.forEach(function(doc){ const data=doc.data(); if(data.lat&&data.lon&&doc.id!==cu){ const nombre=data.nombre||doc.id; const jersey=data.skin?skinColor(data.skin):'#ff6600'; const marker=L.marker([data.lat,data.lon],{icon:L.divIcon({className:'',html:riderMarkerHTML(data.helmet||'giro',jersey,false),iconSize:[44,30],iconAnchor:[22,15]})}).addTo(navMap).bindPopup(_lpPopupCiclista(nombre,data.helmet||'giro',doc.id)); navUserMarkers.push(marker); } }); }
