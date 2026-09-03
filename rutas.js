/* ===== RUTAS: guardado GARANTIZADO en el celular (localStorage) + respaldo en la nube ===== */
function _rutasKey(){ return 'lp_rutas_'+(cu||'anon'); }
function rutasLocales(){ try{ return JSON.parse(localStorage.getItem(_rutasKey()))||[]; }catch(e){ return []; } }
function rutasLocalesSet(arr){ try{ localStorage.setItem(_rutasKey(), JSON.stringify(arr.slice(-120))); }catch(e){} }
// Cuenta única de "viajes completados" que TODA la app debe usar (esfera, resumen de
// Inicio, Estadísticas). Antes cada pantalla tenía su propia cuenta a mano: la esfera
// sumaba rutasLocales()+trips de la nube, pero Inicio y Estadísticas solo contaban los
// trips de la nube -- así un ciclista que sale a pedalear con "Iniciar navegación"
// directo (sin pasar por el planificador, que es como sale la mayoría) veía 6 viajes en
// la esfera y 0 en las otras dos pantallas, mismo usuario, misma carga de página. Un
// solo lugar para esta cuenta evita que un cuarto contador futuro repita el mismo hueco.
function _totalViajesCompletos(){ return rutasLocales().length + trips.filter(function(t){return t.status==='completed';}).length; }
function guardarRutaLocalObj(data){ const arr=rutasLocales(); const i=arr.findIndex(function(r){return r.localId===data.localId;}); if(i>=0){ arr[i]=Object.assign(arr[i],data); } else { arr.push(data); } rutasLocalesSet(arr); return arr; }
/* Respaldo best-effort en Firebase; enlaza firebaseId a la ruta local para no duplicar. */
function _subirRutaNube(localId, fb){ try{ fb.authUid=window.lpUID||null; const it=rutasLocales().find(function(r){return r.localId===localId;}); const fid=it&&it.firebaseId; if(fid){ db.collection('routes').doc(fid).update(fb).catch(function(){}); } else { db.collection('routes').add(fb).then(function(ref){ const a=rutasLocales(); const x=a.find(function(r){return r.localId===localId;}); if(x){ x.firebaseId=ref.id; rutasLocalesSet(a); } }).catch(function(){}); } }catch(e){} }
// Adjunta hospedaje/notas a una ruta YA guardada (localId). Busca el registro FRESCO
// (no uno viejo capturado antes) porque _subirRutaNube recién le agrega el firebaseId
// de forma asíncrona — para cuando el usuario terminó de contestar el diálogo de
// hospedaje ya suele haber llegado, pero si no llegó todavía, igual queda guardado
// local (garantizado) y se sube a la nube en el próximo guardado de esa ruta.
function _agregarDatosBitacora(localId, hospedaje, notas){
  if(!hospedaje && !notas) return;
  const arr=rutasLocales(); const r=arr.find(function(x){return x.localId===localId;});
  if(!r) return;
  if(hospedaje) r.hospedaje=hospedaje;
  if(notas) r.notasDelDia=notas;
  rutasLocalesSet(arr);
  if(r.firebaseId){ const patch={}; if(hospedaje) patch.hospedaje=hospedaje; if(notas) patch.notasDelDia=notas; db.collection('routes').doc(r.firebaseId).update(patch).catch(function(){}); }
}
// Junta todo lo que el usuario escribió HOY en su Diario (estado + meta + lo más
// difícil + reflexión) en un solo texto, para adjuntarlo a la bitácora del viaje.
function _notasDelDiaDeHoy(){
  try{
    const d=JSON.parse(localStorage.getItem(diarioHoyKey()));
    if(!d) return null;
    const partes=[];
    if(d.estado) partes.push(d.estado);
    if(d.meta) partes.push('Meta: '+d.meta);
    if(d.complejo) partes.push('Lo más difícil: '+d.complejo);
    if(d.reflexion) partes.push(d.reflexion);
    return partes.length?partes.join(' — '):null;
  }catch(e){ return null; }
}
// "Guardar la bitácora de mi viaje": a diferencia del guardado rápido y silencioso
// (autoGuardarRuta), esto junta TODO sobre el viaje en un solo registro — la ruta,
// dónde te hospedaste (pregunta en el momento, se puede omitir) y lo que ya
// escribiste hoy en el Diario. Antes no existía ningún vínculo entre estas 3 cosas:
// la ruta se guardaba sola, el hospedaje no tenía dónde quedar, y el Diario era
// independiente por fecha del calendario, sin relación con un viaje puntual.
async function guardarBitacoraViaje(){
  const navActivo=document.getElementById('nav-screen').classList.contains('active');
  let saved=null;
  if(navActivo){
    if(currentTrip){ h('Este es un viaje planificado — por ahora solo puedo agregar hospedaje y notas a viajes rápidos, así que lo guardo como siempre.'); finishTrip(); return; }
    if(!await lpConfirmar('¿Terminar y guardar tu bitácora de este viaje?')) return;
    if(gpsWatchId){ navigator.geolocation.clearWatch(gpsWatchId); gpsWatchId=null; }
    navGuardado=true;
    saved=await guardarRutaNavegada();
  } else if(ig){
    saved=await autoGuardarRuta(true,false);
  } else {
    h('Todavía no tienes un viaje en curso para guardar. Activa el GPS o empieza a navegar primero.');
    return;
  }
  if(!saved){ h('No pude guardar la ruta — parece que no hay suficientes puntos grabados todavía.'); if(navActivo) setTimeout(endNavigation,500); return; }
  const hospedaje=await lpPedirTexto('¿Dónde te hospedaste esta noche? (déjalo en blanco si no aplica)','ej: Hostal La Bicicleta, Pucón');
  const notas=_notasDelDiaDeHoy();
  _agregarDatosBitacora(saved.localId, hospedaje, notas);
  const partes=['tu ruta']; if(hospedaje) partes.push('dónde te hospedaste'); if(notas) partes.push('lo que escribiste hoy en tu diario');
  const listaPartes=partes.length>1 ? (partes.slice(0,-1).join(', ')+' y '+partes[partes.length-1]) : partes[0];
  h('Guardé '+listaPartes+' en tu bitácora de viaje. Buen descanso.');
  if(navActivo) setTimeout(endNavigation,1200);
}
// Nombre real de un lugar a partir de sus coordenadas (reverse geocoding, con caché
// por coordenada redondeada para no repetir la misma consulta). Timeout corto: si
// Nominatim no contesta rápido, sigue con un nombre genérico en vez de trabar el
// guardado de la ruta.
const _cacheNombreLugar={};
async function nombreDeLugar(lat,lon){
  const key=lat.toFixed(3)+','+lon.toFixed(3);
  if(_cacheNombreLugar[key]) return _cacheNombreLugar[key];
  try{
    const ctrl=new AbortController(); const to=setTimeout(function(){ ctrl.abort(); },4000);
    const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=json&accept-language=es&zoom=12&lat='+lat+'&lon='+lon,{signal:ctrl.signal});
    clearTimeout(to);
    const j=await r.json(); const a=j.address||{};
    const nombre=a.city||a.town||a.village||a.municipality||a.county||a.state||'punto sin nombre';
    _cacheNombreLugar[key]=nombre;
    return nombre;
  }catch(e){ return 'punto sin nombre'; }
}
function saveRouteToHistory(route){ if(!cu||!route||route.length<2) return; const localId='l'+route[0].t; const data={localId:localId,user:cu,nombre:nombreUsuario,points:route.slice(),startTime:route[0].t,endTime:route[route.length-1].t,distance:us.di,calories:us.c,savedAt:Date.now()}; guardarRutaLocalObj(data); renderRutas(); _subirRutaNube(localId,{user:cu,nombre:nombreUsuario,points:data.points,startTime:data.startTime,endTime:data.endTime,distance:us.di,calories:us.c,savedAt:firebase.firestore.FieldValue.serverTimestamp()}); }
// Auto-guardado: SIEMPRE queda en el celular (sí o sí); la nube es respaldo. El id estable
// es el timestamp del 1er punto, así se ACTUALIZA la misma ruta y no se duplica.
// El nombre "Origen → Destino" solo se calcula (pide geocoding real) en los guardados
// de CIERRE de ruta (esCheckpoint=false): al apagar el GPS, cerrarse por inactividad,
// o pedirlo por voz. Los guardados de paso (cada vez que te detienes un momento
// mientras sigues pedaleando) no lo tocan — si no, "el destino" cambiaría en cada
// semáforo y Nominatim recibiría una consulta por cada parada del viaje.
async function autoGuardarRuta(conVoz, esCheckpoint){
  if(!cu || currentRoute.length<2) return;
  const _miSegmento=currentRoute; // referencia vigente al entrar -- ver el guard de más abajo
  const pts=currentRoute.slice(), localId='l'+pts[0].t;
  const data={localId:localId,user:cu,nombre:nombreUsuario,points:pts,startTime:pts[0].t,endTime:pts[pts.length-1].t,distance:us.di,calories:us.c,savedAt:Date.now()};
  const fb={user:cu,nombre:nombreUsuario,points:pts,startTime:data.startTime,endTime:data.endTime,distance:us.di,calories:us.c,savedAt:firebase.firestore.FieldValue.serverTimestamp()};
  if(!esCheckpoint){
    const origenNombre=await nombreDeLugar(pts[0].lat,pts[0].lon);
    const destinoNombre=await nombreDeLugar(pts[pts.length-1].lat,pts[pts.length-1].lon);
    data.nombreRuta=fb.nombreRuta=origenNombre+' → '+destinoNombre;
  }
  guardarRutaLocalObj(data); renderRutas();
  // Bug real (2026-08-31): con esCheckpoint=false lo de arriba espera dos reverse-geocodings
  // (hasta ~8s). finalizarRutaPorInactividad() no espera esta promesa: resetea
  // currentRoute=[]/puntosGuardados=0 de inmediato para el próximo segmento, que puede
  // empezar a sumar puntos GPS nuevos MIENTRAS este await seguía pendiente. Escribir acá sin
  // más dejaba puntosGuardados con el largo del segmento NUEVO (no 0), debilitando su propio
  // checkpoint hasta que lo superara de nuevo. Solo se toca si currentRoute sigue siendo el
  // mismo array con el que se entró a esta función.
  if(currentRoute===_miSegmento) puntosGuardados=currentRoute.length;
  _subirRutaNube(localId,fb);
  revisarRetosCumplidos();
  /* guardado silencioso */
  return data;
}
// Si llevas UMBRAL_INACTIVIDAD_RUTA quieto, la ruta actual se da por TERMINADA: se
// guarda tal cual quedó y se limpia el trazo, para que el próximo pedaleo arranque
// una ruta nueva en vez de seguir sumando al mismo trazo interminable del día.
function finalizarRutaPorInactividad(){
  if(!ig || rutaSegCerrada || currentRoute.length<2) return;
  if(Date.now()-ultimoMovimientoTime<UMBRAL_INACTIVIDAD_RUTA) return;
  const distSeg=Math.max(0,us.di-rutaSegDistIni);
  autoGuardarRuta(false,false);
  rutaSegCerrada=true; rutaSegDistIni=us.di;
  currentRoute=[]; puntosGuardados=0; spAnterior=0;
  if(crl && mp){ mp.removeLayer(crl); crl=mlPolyline([],{color:'#ffd700',weight:3,opacity:0.95}).addTo(mp); }
  if(distSeg>=0.1) h("Como llevas un rato quieto, guardé tu ruta: "+distSeg.toFixed(2)+" km. Cuando sigas pedaleando, empiezo una ruta nueva.");
}
setInterval(finalizarRutaPorInactividad,60000);
function renderRutas(){
  const targets=document.querySelectorAll('.js-rutas-list'); if(!targets.length) return;
  const arr=rutasLocales().slice().sort(function(a,b){return (b.savedAt||0)-(a.savedAt||0);}).slice(0,60);
  let html;
  if(arr.length===0){ html='<p style="color:#888;padding:8px">Aún no tienes rutas grabadas. Escribe un destino en Inicio y sal a pedalear — apenas termines, tu ruta va a aparecer aquí con perfil de elevación y video.</p>'; }
  else{
    html='';
    arr.forEach(function(d){ const date=new Date(d.startTime).toLocaleString(); const dist=(d.distance||0).toFixed(2); const cal=Math.round(d.calories||0); const nube=d.firebaseId?'<i class="fas fa-cloud"></i> en la nube':'<i class="fas fa-mobile-screen"></i> en tu celular'; const titulo=d.nombreRuta?escapeHTML(d.nombreRuta):date; const sub=d.nombreRuta?(date+' · '):''; const bitacora=(d.hospedaje?'<div style="margin-top:3px;font-size:0.72rem;color:#9fb3c8"><i class="fas fa-house"></i> '+escapeHTML(d.hospedaje)+'</div>':'')+(d.notasDelDia?'<div style="margin-top:2px;font-size:0.72rem;color:#9fb3c8;font-style:italic"><i class="fas fa-book"></i> '+escapeHTML(d.notasDelDia)+'</div>':''); html+='<div class="route-history-item" onclick="showSingleRoute(\''+d.localId+'\')"><div class="route-item-info"><strong>'+titulo+'</strong><p style="margin:3px 0 0 0;font-size:0.75rem;color:#aaa">'+sub+dist+' km · '+cal+' cal · '+nube+'</p>'+bitacora+'</div><div class="route-item-actions" onclick="event.stopPropagation()"><button class="route-icon-btn" title="Perfil de elevación" onclick="verPerfilElevacion(\''+d.localId+'\')"><i class="fas fa-chart-line"></i> </button><button class="route-icon-btn" title="Video 3D" onclick="abrirVideoRuta(\''+d.localId+'\')"><i class="fas fa-clapperboard"></i> </button><button class="route-icon-btn" title="Crear segmento" onclick="crearSegmentoDesdeRuta(\''+d.localId+'\')"><i class="fas fa-flag-checkered"></i> </button><button class="route-icon-btn" title="Ver el sobrevuelo del viaje" onclick="verSobrevueloRuta(\''+d.localId+'\')"><i class="fas fa-helicopter"></i> </button><button class="route-icon-btn" title="Compartir este viaje" onclick="compartirViaje(\''+d.localId+'\')"><i class="fas fa-comment"></i> </button><button class="route-icon-btn" title="Exportar GPX" onclick="exportarRutaGPX(\''+d.localId+'\')"><i class="fas fa-share-from-square"></i> </button><button class="route-icon-btn delete" title="Borrar ruta" onclick="deleteRoute(\''+d.localId+'\')"><i class="fas fa-trash-can"></i> </button></div></div>'; });
  }
  targets.forEach(function(c){ c.innerHTML=html; });
}
// Muestra al toque lo local (garantizado) y fusiona rutas viejas que estén SOLO en la nube.
function loadRoutesList(){ if(!cu) return; renderRutas();
  try{ db.collection('routes').where('user','==',cu).limit(100).get().then(function(snapshot){ const arr=rutasLocales(); let changed=false;
    snapshot.forEach(function(doc){ const d=doc.data(); const dup=arr.some(function(r){ return r.firebaseId===doc.id || r.startTime===d.startTime; }); if(!dup){ arr.push({localId:'fb'+doc.id,firebaseId:doc.id,user:cu,nombre:d.nombre,points:d.points||[],startTime:d.startTime,endTime:d.endTime,distance:d.distance||0,calories:d.calories||0,savedAt:(d.savedAt&&d.savedAt.seconds?d.savedAt.seconds*1000:(d.startTime||Date.now()))}); changed=true; } });
    if(changed){ rutasLocalesSet(arr); renderRutas(); }
  }).catch(function(){}); }catch(e){}
}
function _rutaPorId(id){ return rutasLocales().find(function(x){return x.localId===id;}); }
function showSingleRoute(id){ const r=_rutaPorId(id); function pintar(points){ if(!points||!points.length){ h("Esta ruta no tiene puntos guardados."); return; } cv('map'); setTimeout(function(){ if(crl) mp.removeLayer(crl); crl=mlPolyline(points,{color:'#ffd700',weight:3,opacity:0.95}).addTo(mp); mp.fitBounds(crl.getBounds(),{padding:[50,50]}); h("Aquí está tu ruta."); },300); } if(r&&r.points&&r.points.length){ pintar(r.points.map(function(p){return [p.lat,p.lon];})); return; } db.collection('routes').doc(id).get().then(function(doc){ if(doc.exists){ pintar((doc.data().points||[]).map(function(p){return [p.lat,p.lon];})); } }).catch(function(){ h("No pude abrir esa ruta."); }); }
async function deleteRoute(id){ if(!await lpConfirmar("¿Eliminar esta ruta?")) return; const it=_rutaPorId(id); rutasLocalesSet(rutasLocales().filter(function(x){return x.localId!==id;})); if(it&&it.firebaseId){ db.collection('routes').doc(it.firebaseId).delete().catch(function(){}); } else if(!it){ db.collection('routes').doc(id).delete().catch(function(){}); } renderRutas(); h("Ruta eliminada."); }

/* ===== PERFIL DE ELEVACIÓN: usa la altitud que reporta el GPS del celular (gratis,
   sin servicios externos). Es más ruidosa que un DEM profesional, por eso se suaviza
   con un promedio móvil antes de sumar subida/bajada — si no, cualquier salto de
   altitud del GPS (común, hasta parado) infla el desnivel con metros que no existen. */
function calcularDesnivel(points){
  const validos=(points||[]).filter(function(p){return p.alt!=null && !isNaN(p.alt);});
  if(validos.length<5) return null;
  // Promedio móvil (ventana 5) para suavizar el ruido típico del GPS en altitud.
  const suavizado=validos.map(function(p,i,arr){
    const ini=Math.max(0,i-2), fin=Math.min(arr.length,i+3), tramo=arr.slice(ini,fin);
    return tramo.reduce(function(s,x){return s+x.alt;},0)/tramo.length;
  });
  let subida=0, bajada=0, distAcum=0;
  const perfil=[{dist:0,alt:suavizado[0]}];
  for(let i=1;i<validos.length;i++){
    const d=calculateDistance(validos[i-1].lat,validos[i-1].lon,validos[i].lat,validos[i].lon);
    distAcum+=d;
    const delta=suavizado[i]-suavizado[i-1];
    if(delta>1.5) subida+=delta; else if(delta<-1.5) bajada+=-delta;
    perfil.push({dist:distAcum,alt:suavizado[i]});
  }
  return {subida:Math.round(subida), bajada:Math.round(bajada), altMax:Math.round(Math.max.apply(null,suavizado)), altMin:Math.round(Math.min.apply(null,suavizado)), perfil:perfil};
}

/* ===== PERFIL AFINADO CON DEM REAL (2026-07-14, pedido de Inty con
   referencias: MOP/GEOMOP, mapas topográficos de curvas de nivel, Komoot).
   Ninguna de esas tres es integrable como API gratuita por lotes: MOP/GEOMOP
   y los mapas topográficos son visores para mirar, no servicios de consulta
   programática, y Komoot no publica API pública — sirven como referencia de
   qué tan preciso debería verse el resultado, no como fuente de datos. Se usa
   en cambio el mismo DEM (Copernicus, vía Open-Meteo) que YA usa con éxito
   avisarPendienteAnticipada() más abajo — gratis, sin llave, probado en esta
   app — para corregir el sesgo real de la altitud del GPS del celular (no es
   solo ruido: puede venir sistemáticamente desviada varios metros, y el
   promedio móvil de calcularDesnivel() no arregla eso). Se recalcula solo al
   ABRIR el perfil (no en cada ruta grabada) y el resultado se cachea. */
function _muestrearParaDEM(points, maxSamples){
  const validos=(points||[]).filter(function(p){return p.lat!=null && p.lon!=null;});
  if(validos.length<2) return [];
  let total=0; const acum=[0];
  for(let i=1;i<validos.length;i++){ total+=calculateDistance(validos[i-1].lat,validos[i-1].lon,validos[i].lat,validos[i].lon); acum.push(total); }
  const step=Math.max(25, total/((maxSamples-1)||1));
  const out=[]; let next=0;
  for(let i=0;i<validos.length;i++){ if(acum[i]>=next-1){ out.push(validos[i]); next+=step; } }
  if(out[out.length-1]!==validos[validos.length-1]) out.push(validos[validos.length-1]);
  return out;
}
async function _elevacionDEM(points){
  const muestras=_muestrearParaDEM(points, 480); // varias tandas de a 100: alcanza para rutas largas de cicloturismo
  if(muestras.length<3) return null;
  const LOTE=100, conElevacion=[];
  for(let i=0;i<muestras.length;i+=LOTE){
    const tanda=muestras.slice(i,i+LOTE);
    const lats=tanda.map(function(p){return p.lat.toFixed(5);}).join(',');
    const lons=tanda.map(function(p){return p.lon.toFixed(5);}).join(',');
    const r=await _fetchT('https://api.open-meteo.com/v1/elevation?latitude='+lats+'&longitude='+lons, 12000);
    const j=await r.json(); const ele=(j&&j.elevation)||[];
    if(ele.length!==tanda.length) return null; // respuesta rara: mejor no mezclar datos a medias
    for(let k=0;k<tanda.length;k++) conElevacion.push({lat:tanda[k].lat, lon:tanda[k].lon, alt:ele[k]});
  }
  return conElevacion;
}
async function calcularDesnivelDEM(points){
  try{ const conElevacion=await _elevacionDEM(points); return conElevacion ? calcularDesnivel(conElevacion) : null; }
  catch(e){ return null; }
}

function _svgPerfilElevacion(d){
  const W=320, H=110, PAD=6;
  const distTotal=d.perfil[d.perfil.length-1].dist||1;
  const altSpan=Math.max(1,d.altMax-d.altMin);
  const pts=d.perfil.map(function(p){
    const x=PAD+(p.dist/distTotal)*(W-PAD*2);
    const y=H-PAD-((p.alt-d.altMin)/altSpan)*(H-PAD*2);
    return x.toFixed(1)+','+y.toFixed(1);
  });
  const linea=pts.join(' ');
  const relleno='M'+PAD+','+(H-PAD)+' L'+pts.join(' L')+' L'+(W-PAD)+','+(H-PAD)+' Z';
  return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:110px;display:block">'
    +'<path d="'+relleno+'" fill="rgba(255,215,0,0.14)"/>'
    +'<polyline points="'+linea+'" fill="none" stroke="#ffd700" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
    +'</svg>';
}
function verPerfilElevacion(id){
  function pintar(d, refinando){
    document.getElementById('modalTitle').innerHTML='<i class="fas fa-chart-line"></i> Perfil de elevación';
    const c=document.getElementById('modalContent');
    if(!d){ c.innerHTML='<p style="color:#888;text-align:center;padding:20px 0">Esta ruta no tiene datos de altitud (se grabó antes de esta función, tu celular no reporta altitud, y no hay conexión para buscarla en un mapa topográfico).</p>'; document.getElementById('userModal').classList.add('on'); return; }
    c.innerHTML=_svgPerfilElevacion(d)
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">'
      +'<div class="stat-card"><div class="stat-value" style="color:#10b981">+'+d.subida+'m</div><div class="stat-label">Subida</div></div>'
      +'<div class="stat-card"><div class="stat-value" style="color:#ff6b6b">-'+d.bajada+'m</div><div class="stat-label">Bajada</div></div>'
      +'<div class="stat-card"><div class="stat-value">'+d.altMax+'m</div><div class="stat-label">Altura máx.</div></div>'
      +'<div class="stat-card"><div class="stat-value">'+d.altMin+'m</div><div class="stat-label">Altura mín.</div></div>'
      +'</div>'
      +(refinando ? '<p id="elevRefinando" style="color:#7c93a8;font-size:0.68rem;text-align:center;margin:8px 0 0"><i class="fas fa-satellite-dish"></i> Afinando con datos topográficos reales…</p>' : '');
    document.getElementById('userModal').classList.add('on');
  }
  function pintarCargando(){
    document.getElementById('modalTitle').innerHTML='<i class="fas fa-chart-line"></i> Perfil de elevación';
    document.getElementById('modalContent').innerHTML='<p style="color:#888;text-align:center;padding:20px 0">Buscando la altitud real de esta ruta…</p>';
    document.getElementById('userModal').classList.add('on');
  }
  function sigueAbierto(){
    const modal=document.getElementById('userModal'), t=document.getElementById('modalTitle');
    return modal && modal.classList.contains('on') && t && t.innerText.indexOf('elevaci')!==-1;
  }
  async function conPuntos(points, firebaseId, cache){
    if(cache && cache.perfil && cache.perfil.length){ pintar(cache); return; }
    const dGps=calcularDesnivel(points);
    if(dGps){ pintar(dGps, true); } else { pintarCargando(); }

    const dDem=await calcularDesnivelDEM(points);
    const aviso=document.getElementById('elevRefinando'); if(aviso) aviso.remove();
    if(!sigueAbierto()) return; // el usuario ya cerró el modal o navegó a otra pantalla
    if(!dDem){ if(!dGps) pintar(null); return; }
    pintar(dDem);

    const r=_rutaPorId(id);
    if(r){ const arr=rutasLocales(); const x=arr.find(function(y){return y.localId===r.localId;}); if(x){ x.elevDEM=dDem; rutasLocalesSet(arr); } }
    if(firebaseId){ db.collection('routes').doc(firebaseId).update({elevDEM:dDem}).catch(function(){}); }
  }
  const r=_rutaPorId(id);
  if(r&&r.points&&r.points.length){ conPuntos(r.points, r.firebaseId, r.elevDEM); return; }
  db.collection('routes').doc(id).get().then(function(doc){ if(doc.exists){ const dd=doc.data(); conPuntos(dd.points||[], id, dd.elevDEM); } else { h("No pude abrir esa ruta."); } }).catch(function(){ h("No pude abrir esa ruta."); });
}

/* ===== VIDEO 3D DE LA RUTA (estilo Relive): vuelo de cámara sobre terreno 3D real
   (MapLibre GL + Mapterhorn, gratis y sin cuenta) con overlay de stats, grabado con
   MediaRecorder y descargado como archivo de video listo para compartir. ===== */
let videoVueloMs=18000, videoBearing=0;
let videoMap=null, videoRouteData=null, videoRafId=null, videoRecorder=null, videoChunks=[], videoCompositeCtx=null, videoStream=null, videoStopTimeoutId=null;
function _lerpAng(a,b,k){ let d=((b-a+540)%360)-180; return (a+d*k+360)%360; }
function abrirVideoRuta(id){
  const r=_rutaPorId(id);
  function conPuntos(pts, meta){
    if(!pts||pts.length<2){ h("Esta ruta no tiene suficientes puntos para el video."); return; }
    // Por si ya había un video abierto/grabando de otra ruta: corta todo antes de empezar de nuevo.
    if(videoRafId){ cancelAnimationFrame(videoRafId); videoRafId=null; }
    if(videoRecorder&&videoRecorder.state==='recording'){ try{ videoRecorder.stop(); }catch(e){} }
    videoRouteData={points:pts, distance:meta.distance||0, calories:meta.calories||0};
    // Duración del vuelo proporcional a la ruta (para que se vea TODO el viaje sin apuro).
    videoVueloMs=Math.round(Math.max(14000,Math.min(34000,((meta.distance||3)*2400)+6000)));
    document.getElementById('video-screen').classList.add('active');
    document.getElementById('video-status').innerText='Preparando el vuelo 3D...';
    document.getElementById('videoProgressFill').style.width='0%';
    document.getElementById('btnReplayVideo').style.display='none';
    document.getElementById('btnGrabarVideo').disabled=false; document.getElementById('btnGrabarVideo').innerHTML='<i class="fas fa-video"></i> Grabar y descargar';
    setTimeout(initVideoMap,50);
  }
  if(r&&r.points&&r.points.length){ conPuntos(r.points, r); return; }
  db.collection('routes').doc(id).get().then(function(doc){ if(doc.exists){ const d=doc.data(); conPuntos(d.points||[], d); } else { h("No pude abrir esa ruta."); } }).catch(function(){ h("No pude abrir esa ruta."); });
}
// SVG chico de Pistero en bici, vista de lado, mirando hacia +x (derecha) por
// defecto — el marcador lo rota según el rumbo real de la ruta. Trazos
// gruesos y colores de marca a propósito: en el video queda del tamaño de un
// ícono, no de un personaje grande, así que el detalle fino se pierde y lo
// que se ve es la silueta.
// 2026-07-14: Pistero NO se veía en el video — causa real: era un marcador
// HTML/CSS de MapLibre, pero #video-canvas-out (el canvas que compone la
// barra de stats Y que es lo que de verdad se graba) se dibuja ENCIMA de
// #video-map con drawImage(mc,...) — eso copia SOLO el canvas WebGL del
// mapa, nunca los elementos HTML superpuestos como un Marker. El marcador
// quedaba 100% tapado, tanto en la vista previa como en el archivo grabado.
// Fix real: dejar de usar un Marker de MapLibre y dibujar a Pistero DIRECTO
// en el mismo canvas de composición, cada cuadro, en la posición de pantalla
// que da videoMap.project() — así queda en el mismo pipeline que sí se ve y
// se graba. De paso, colores fijos (sin var(--p)) porque una imagen rasterizada
// aparte no hereda las variables CSS de la página.
function _riderCanvasSVG(){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40">'
    +'<circle cx="13" cy="27" r="8.6" fill="#161616" stroke="#e8e8e8" stroke-width="1.4"/>'
    +'<circle cx="13" cy="27" r="4.2" fill="none" stroke="#666" stroke-width="1"/>'
    +'<circle cx="49" cy="27" r="8.6" fill="#161616" stroke="#e8e8e8" stroke-width="1.4"/>'
    +'<circle cx="49" cy="27" r="4.2" fill="none" stroke="#666" stroke-width="1"/>'
    +'<path d="M13 27 L28 13 L32 27 M28 13 L45 15 M32 27 L49 27" stroke="#fc4c02" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<circle cx="32" cy="27" r="3.4" fill="#20344a"/>'
    +'<path d="M26 16 Q21 4 34 1.5 Q43 0.5 41 9 Q35 6.5 30 14 Q28 15.5 26 16 Z" fill="#20344a"/>'
    +'<path d="M27 16 L32 27" stroke="#20344a" stroke-width="4" stroke-linecap="round"/>'
    +'<path d="M36 6 L45 15" stroke="#20344a" stroke-width="3.2" stroke-linecap="round"/>'
    +'<circle cx="42" cy="3.5" r="5.2" fill="#161616"/>'
    +'<path d="M37.5 3 Q42 -1.5 47 2" stroke="#fc4c02" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
    +'<circle cx="44.5" cy="4" r="1.5" fill="#f0c39a"/>'
    +'</svg>';
}
let videoRiderImg=null;
function _cargarRiderImg(){
  // Carita de Pistero (con la personalización actual del usuario) en vez del
  // ciclista genérico. Se reconstruye siempre para reflejar cambios de look.
  var svg=(typeof _pistoNuevo==='function')?_pistoNuevo('feliz'):_pisteroExprSVG('feliz');
  svg=svg.replace('<svg ','<svg width="200" height="168" ');
  const img=new Image();
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  videoRiderImg=img;
  return img;
}
function initVideoMap(){
  if(videoMap){ try{ videoMap.remove(); }catch(e){} videoMap=null; }
  _cargarRiderImg();
  const pts=videoRouteData.points, start=pts[0];
  // 2026-07-14: antes usaba tiles raster de OpenTopoMap para el mapa del video —
  // un vuelo rápido pide MUCHOS tiles muy seguido, y esa capa no aguantaba el
  // ritmo (tiles que no llegan a tiempo = negro, sin nada de respaldo detrás).
  // Ahora usa el MISMO proveedor vectorial que ya usa el mapa principal de la
  // app (OpenFreeMap, gratis y sin cuenta) — trae SIEMPRE un color de fondo
  // definido (nunca queda negro aunque un tile tarde) y de fábrica incluye
  // edificios en 3D real (fill-extrusion con la altura real de cada edificio,
  // no una textura plana). El terreno (Mapterhorn) se agrega igual que antes.
  videoMap=new maplibregl.Map({
    container:'video-map',
    style:'https://tiles.openfreemap.org/styles/liberty',
    center:[start.lon,start.lat],
    zoom:14, pitch:65, bearing:0,
    interactive:false
  });
  videoMap.on('load',function(){
    videoMap.addSource('terreno',{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json'});
    try{ videoMap.setTerrain({source:'terreno',exaggeration:1.4}); }catch(e){}
    videoMap.addSource('ruta-recorrida',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[]}}});
    videoMap.addLayer({id:'ruta-recorrida-line',type:'line',source:'ruta-recorrida',paint:{'line-color':'#fc4c02','line-width':5,'line-opacity':0.95}});
    const out=document.getElementById('video-canvas-out'), mc=videoMap.getCanvas();
    out.width=mc.width; out.height=mc.height; videoCompositeCtx=out.getContext('2d');
    // Espera a que el estilo (calles, edificios, terreno) termine de pintar la
    // vista inicial ANTES de arrancar el vuelo — antes arrancaba con un
    // setTimeout fijo de 400ms sin importar si ya había algo que mostrar, y
    // los primeros frames del video salían en negro/a medio cargar.
    videoMap.once('idle',function(){ setTimeout(iniciarVueloRuta,250); });
  });
}
function _bearingEntrePuntos(a,b){ const toRad=Math.PI/180, toDeg=180/Math.PI; const lat1=a.lat*toRad, lat2=b.lat*toRad, dLon=(b.lon-a.lon)*toRad; const y=Math.sin(dLon)*Math.cos(lat2); const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon); return (Math.atan2(y,x)*toDeg+360)%360; }
function iniciarVueloRuta(){
  // Bug real reportado por Sentry en producción (Chrome Mobile, librepedal.cl):
  // "Cannot read properties of undefined (reading 'lat')" dentro de frame() — un
  // punto de la ruta grabada venía sin lat/lon válidos (dato de GPS corrupto que
  // igual se guardó), y frame() no lo esperaba. Se filtra UNA vez acá, así el resto
  // de la función (frame(), el trazo que se va dibujando, el cálculo de rumbo) nunca
  // tiene que lidiar con puntos malos — mismo criterio que ya usa ug() con el GPS en vivo.
  const ptsCrudos=videoRouteData&&videoRouteData.points;
  const pts=(ptsCrudos||[]).filter(function(p){ return p && Number.isFinite(p.lat) && Number.isFinite(p.lon); });
  if(!videoMap||pts.length<2) return;
  if(videoRafId){ cancelAnimationFrame(videoRafId); videoRafId=null; }
  document.getElementById('btnReplayVideo').style.display='none';
  document.getElementById('video-status').innerText='Volando sobre tu recorrido...';
  const t0=performance.now(), total=pts.length;
  const _la0=Math.min(total-1, Math.max(2,Math.round(total*0.04)));
  videoBearing=_bearingEntrePuntos(pts[0], pts[_la0]);   // rumbo inicial estable
  function frame(now){
    const progreso=Math.min(1,(now-t0)/videoVueloMs);
    const idxF=progreso*(total-1), i=Math.floor(idxF), frac=idxF-i;
    const a=pts[i], b=pts[Math.min(i+1,total-1)];
    const lat=a.lat+(b.lat-a.lat)*frac, lon=a.lon+(b.lon-a.lon)*frac;
    // Mirar hacia un punto ADELANTADO (no al vecino inmediato) y suavizar el giro:
    // así la cámara no vibra con el ruido del GPS entre puntos consecutivos.
    const jLA=Math.min(total-1, i+Math.max(2,Math.round(total*0.045)));
    const tgtB=_bearingEntrePuntos({lat:lat,lon:lon}, pts[jLA]);
    videoBearing=_lerpAng(videoBearing, tgtB, 0.05);
    videoMap.jumpTo({center:[lon,lat], zoom:15.4, pitch:64, bearing:videoBearing});
    const recorridos=pts.slice(0,i+1).map(function(p){return [p.lon,p.lat];}); recorridos.push([lon,lat]);
    const src=videoMap.getSource('ruta-recorrida'); if(src) src.setData({type:'Feature',geometry:{type:'LineString',coordinates:recorridos}});
    _dibujarCompositeVideo(progreso, lon, lat, videoBearing);
    document.getElementById('videoProgressFill').style.width=(progreso*100)+'%';
    if(progreso<1){ videoRafId=requestAnimationFrame(frame); }
    else { videoRafId=null; document.getElementById('video-status').innerText='¡Listo! Repítelo o graba el video.'; document.getElementById('btnReplayVideo').style.display=''; }
  }
  videoRafId=requestAnimationFrame(frame);
}
function _dibujarCompositeVideo(progreso, lon, lat, bearingDeg){
  if(!videoCompositeCtx||!videoMap) return;
  const out=document.getElementById('video-canvas-out'), mc=videoMap.getCanvas();
  if(out.width!==mc.width||out.height!==mc.height){ out.width=mc.width; out.height=mc.height; }
  const ctx=videoCompositeCtx, d=videoRouteData;
  ctx.clearRect(0,0,out.width,out.height);
  ctx.drawImage(mc,0,0,out.width,out.height);
  // Pistero en su bici, en la PUNTA de la línea que se traza (misma coordenada
  // que maneja la cámara): se dibuja acá, DENTRO del mismo canvas que se graba,
  // en vez de un Marker HTML aparte (ver nota arriba, esa era la causa real de
  // que no se viera). videoMap.project() da la posición en pantalla real,
  // considerando el pitch/zoom/bearing actual de la cámara 3D.
  if(lon!=null && lat!=null && videoRiderImg && videoRiderImg.complete && videoRiderImg.naturalWidth){
    try{
      const p=videoMap.project([lon,lat]);
      // project() da coordenadas en píxeles CSS del contenedor; el canvas de
      // composición está a la resolución REAL del canvas del mapa (CSS * DPR).
      // Sin esta corrección, en un celular con DPR 2-3 la carita caía arriba-
      // izquierda en vez de sobre la línea del recorrido (bug reportado).
      const _cw=(videoMap.getContainer()&&videoMap.getContainer().clientWidth)||out.width;
      const _dpr=out.width/_cw;
      const w=out.width*0.13, h=w*(84/100);
      ctx.save();
      ctx.translate(p.x*_dpr, p.y*_dpr);
      ctx.fillStyle='rgba(0,0,0,0.30)';
      ctx.beginPath(); ctx.ellipse(0, h*0.42, w*0.34, h*0.11, 0, 0, Math.PI*2); ctx.fill();
      // Una carita NO se inclina con el rumbo: se dibuja siempre derecha, apoyada
      // sobre el punto (base de la cara justo en la línea).
      ctx.drawImage(videoRiderImg, -w/2, -h*0.62, w, h);
      ctx.restore();
    }catch(e){ /* si project() falla en algún borde del vuelo, se salta ese cuadro no más */ }
  }
  const barH=out.height*0.16, pad=out.width*0.045, fs=out.width*0.028;
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,out.height-barH,out.width,barH);
  ctx.fillStyle='#fc4c02'; ctx.font='700 '+fs+'px system-ui,sans-serif'; ctx.textAlign='left'; ctx.fillText('Libre Pedal', pad, out.height-barH*0.62);
  ctx.fillStyle='#fff'; ctx.font='800 '+(fs*1.6)+'px system-ui,sans-serif'; ctx.fillText(((d.distance||0)*progreso).toFixed(2)+' km', pad, out.height-barH*0.2);
  if(d.calories){ ctx.textAlign='right'; ctx.font='600 '+fs+'px system-ui,sans-serif'; ctx.fillText(Math.round((d.calories||0)*progreso)+' cal', out.width-pad, out.height-barH*0.2); }
}
function grabarVideoRuta(){
  if(!videoMap){ return; }
  const out=document.getElementById('video-canvas-out');
  try{
    const stream=out.captureStream(30);
    videoStream=stream;
    videoChunks=[];
    // MP4/H.264 PRIMERO: es el único formato que las galerías de Android, WhatsApp e
    // iOS muestran con miniatura y reproducen sin drama. Antes esto grababa siempre en
    // WebM/VP9 — se descargaba bien, pero en el celular quedaba como un archivo sin
    // vista previa que muchas apps ni reconocían como video. MP4 solo lo soportan
    // Chrome/WebView de Android relativamente nuevos (API 29+); si no está disponible,
    // cae a WebM igual (mejor un video que se ve raro en algún lado que ninguno).
    const mimeCandidatos=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9','video/webm'];
    let mime='video/webm';
    for(let i=0;i<mimeCandidatos.length;i++){ if(window.MediaRecorder&&MediaRecorder.isTypeSupported(mimeCandidatos[i])){ mime=mimeCandidatos[i]; break; } }
    const extension=mime.indexOf('mp4')!==-1?'mp4':'webm';
    // "recorder" local (no solo la variable global videoRecorder): así, si el usuario
    // cierra y empieza OTRA grabación antes de que se cumplan los 18.6s, el timeout de
    // abajo nunca puede cortar la grabación nueva por error — solo conoce la suya.
    const recorder=new MediaRecorder(stream,{mimeType:mime, videoBitsPerSecond:4000000});
    videoRecorder=recorder;
    recorder.ondataavailable=function(e){ if(e.data&&e.data.size>0) videoChunks.push(e.data); };
    recorder.onstop=function(){
      const blob=new Blob(videoChunks,{type:mime.split(';')[0]});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='libre-pedal-ruta.'+extension; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); },4000);
      document.getElementById('video-status').innerText='¡Video descargado! Ya lo puedes compartir.';
      document.getElementById('btnGrabarVideo').disabled=false; document.getElementById('btnGrabarVideo').innerHTML='<i class="fas fa-video"></i> Grabar y descargar';
      if(videoStream){ videoStream.getTracks().forEach(function(t){ t.stop(); }); videoStream=null; }
    };
    document.getElementById('btnGrabarVideo').disabled=true; document.getElementById('btnGrabarVideo').innerHTML='<i class="fas fa-video"></i> Grabando...';
    document.getElementById('btnReplayVideo').style.display='none';
    recorder.start();
    iniciarVueloRuta();
    videoStopTimeoutId=setTimeout(function(){ if(recorder.state==='recording') recorder.stop(); videoStopTimeoutId=null; },videoVueloMs+600);
  }catch(e){ lpAviso('Tu navegador no pudo grabar el video. Prueba desde Chrome o la app instalada.'); document.getElementById('btnGrabarVideo').disabled=false; document.getElementById('btnGrabarVideo').innerHTML='<i class="fas fa-video"></i> Grabar y descargar'; }
}
function cerrarVideoRuta(){
  if(videoRafId){ cancelAnimationFrame(videoRafId); videoRafId=null; }
  if(videoStopTimeoutId){ clearTimeout(videoStopTimeoutId); videoStopTimeoutId=null; }
  if(videoRecorder&&videoRecorder.state==='recording'){ try{ videoRecorder.stop(); }catch(e){} }
  if(videoStream){ try{ videoStream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} videoStream=null; }
  if(videoMap){ try{ videoMap.remove(); }catch(e){} videoMap=null; }
  document.getElementById('video-screen').classList.remove('active');
}
function showAllRoutesOnMap(){ const arr=rutasLocales().filter(function(d){return d.points&&d.points.length;}); if(!arr.length){ h("No tienes rutas todavía."); return; } cv('trips'); setTimeout(function(){ const mc=document.getElementById('map-routes-all'); if(mc) mc.style.display='block'; if(!mapAllRoutes){ mapAllRoutes=L.map('map-all-routes').setView([20,0],2); L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapAllRoutes); } mapAllRoutes.eachLayer(function(layer){ if(layer instanceof L.Polyline) mapAllRoutes.removeLayer(layer); }); const colors=['#fc4c02','#ff0055','#ffd700','#2ecc71','#9b59b6','#ff6600','#00ff88']; let ci=0; const allB=[]; arr.forEach(function(d){ const points=d.points.map(function(p){return [p.lat,p.lon];}); const pl=L.polyline(points,{color:colors[ci%colors.length],weight:4,opacity:0.8}).addTo(mapAllRoutes); pl.bindPopup('<b>'+new Date(d.startTime).toLocaleDateString()+'</b><br>'+(d.distance||0).toFixed(2)+' km'); allB.push.apply(allB,points); ci++; }); if(allB.length>0) mapAllRoutes.fitBounds(L.latLngBounds(allB),{padding:[50,50]}); mapAllRoutes.invalidateSize(); h(arr.length+" rutas en el mapa."); },300); }
