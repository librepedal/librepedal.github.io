/* ================= SOBREVUELO DEL VIAJE (v7.28) =================
   Función NUEVA y 100% ADITIVA: al terminar una ruta (o desde el historial),
   un icono que RECORRE el trazado en el mapa MapLibre `mp`, animando un
   marcador a lo largo de las coordenadas con requestAnimationFrame. El icono
   se adapta al modo actual (_modoIconHTML(actividadTipo): ciclismo/mtb/trekking/moto).
   NO toca GPS (toggleGPS se ENVUELVE sin editar su cuerpo), ni auth, ni reportes,
   ni el guardado. Todo cae en try/catch para no poder romper el núcleo. */
var _sbvRAF=null,_sbvMarker=null,_sbvLine=null;
function _sbvHaversine(a,b){ var R=6371000,d=Math.PI/180; var dLat=(b[0]-a[0])*d,dLon=(b[1]-a[1])*d,la1=a[0]*d,la2=b[0]*d; var s=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)*Math.sin(dLon/2); return 2*R*Math.asin(Math.min(1,Math.sqrt(s))); }
function detenerSobrevuelo(){
  if(_sbvRAF){ try{ cancelAnimationFrame(_sbvRAF); }catch(e){} _sbvRAF=null; }
  if(_sbvMarker){ try{ _sbvMarker.remove(); }catch(e){} _sbvMarker=null; }
  if(_sbvLine){ try{ if(mp) mp.removeLayer(_sbvLine); }catch(e){} _sbvLine=null; }
}
// Anima un icono del modo actual recorriendo `coords` ([ [lat,lon], ... ]) sobre `mp`.
// Encuadra toda la ruta (la cámara la enmarca) y desplaza el marcador a velocidad
// uniforme por distancia real (no salta en tramos con puntos separados). onEnd()
// se llama al terminar (lo usa la oferta de fin de ruta para reaparecer sus botones).
function reproducirSobrevuelo(coords, modo, onEnd){
  try{
    if(!mp){ if(typeof h==='function') h('El mapa todavía no está listo, prueba de nuevo en un momento.'); if(onEnd)onEnd(); return; }
    coords=(coords||[]).filter(function(c){ return c && isFinite(c[0]) && isFinite(c[1]); });
    if(coords.length<2){ if(typeof h==='function') h('No hay suficiente recorrido para el sobrevuelo.'); if(onEnd)onEnd(); return; }
    detenerSobrevuelo();
    var accent=(getComputedStyle(document.documentElement).getPropertyValue('--p')||'').trim()||'#fc4c02';
    _sbvLine=mlPolyline(coords,{color:accent,weight:5,opacity:0.95}).addTo(mp);
    var cum=[0],total=0,i;
    for(i=1;i<coords.length;i++){ total+=_sbvHaversine(coords[i-1],coords[i]); cum.push(total); }
    if(total<=0){ if(typeof h==='function') h('El recorrido es demasiado corto para animarlo.'); detenerSobrevuelo(); if(onEnd)onEnd(); return; }
    // La carita de Pistero (nuevo, expresivo) se mueve por la ruta, sonriendo. Sin circulo; sombra fina para contraste.
    var svg=((typeof _pistoNuevo==='function')?_pistoNuevo('feliz'):_pisteroExprSVG('feliz')).replace('<svg ','<svg width="44" height="37" ');
    var iconHtml='<div style="width:44px;height:37px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))">'+svg+'</div>';
    _sbvMarker=mlMarker([coords[0][0],coords[0][1]],{icon:{html:iconHtml}}).addTo(mp);
    try{ mp.fitBounds(_sbvLine.getBounds().pad(0.18)); }catch(e){}
    var dur=Math.min(20000,Math.max(7000,coords.length*80)),start=null,seg=1;
    function frame(ts){
      if(start===null) start=ts;
      var t=(ts-start)/dur; if(t>1)t=1;
      var target=t*total;
      while(seg<coords.length && cum[seg]<target) seg++;
      var a=coords[seg-1], b=coords[Math.min(seg,coords.length-1)];
      var segLen=(cum[seg]!=null?cum[seg]:total)-cum[seg-1];
      var f=segLen>0?(target-cum[seg-1])/segLen:0;
      var lat=a[0]+(b[0]-a[0])*f, lon=a[1]+(b[1]-a[1])*f;
      if(_sbvMarker) _sbvMarker.setLatLng([lat,lon]);
      if(t<1){ _sbvRAF=requestAnimationFrame(frame); }
      else { _sbvRAF=null; try{ mp.fitBounds(_sbvLine.getBounds().pad(0.18)); }catch(e){} setTimeout(function(){ detenerSobrevuelo(); if(onEnd)onEnd(); },1400); }
    }
    if(typeof h==='function') h('Aquí va el sobrevuelo de tu viaje.');
    _sbvRAF=requestAnimationFrame(frame);
  }catch(err){ try{ if(window.Sentry) Sentry.captureException(err); }catch(_e){} detenerSobrevuelo(); if(onEnd)onEnd(); }
}
// Borrado de la ruta recién guardada (botón "Descartar" de la oferta de fin de ruta).
// Reutiliza exactamente el mismo criterio que deleteRoute (local garantizado + nube si
// ya tiene firebaseId). Reintenta la nube a los 4s por si el alta asíncrona demoró.
function _sbvDescartar(localId){
  try{
    var arr=rutasLocales(), it=arr.find(function(x){return x.localId===localId;});
    rutasLocalesSet(arr.filter(function(x){return x.localId!==localId;}));
    if(it&&it.firebaseId){ try{ db.collection('routes').doc(it.firebaseId).delete().catch(function(){}); }catch(e){} }
    else { setTimeout(function(){ try{ var x=rutasLocales().find(function(r){return r.localId===localId;}); if(x&&x.firebaseId){ db.collection('routes').doc(x.firebaseId).delete().catch(function(){}); } }catch(e){} },4000); }
    renderRutas();
  }catch(e){}
  try{ if(crl&&mp){ mp.removeLayer(crl); crl=mlPolyline([],{color:'#ffd700',weight:3,opacity:0.95}).addTo(mp); } }catch(e){}
}
// Hoja inferior con los 3 botones que pide la SPEC: Ver sobrevuelo · Guardar · Descartar.
function _sbvOverlay(){
  var o=document.getElementById('lpSbvOverlay');
  if(o) return o;
  o=document.createElement('div');
  o.id='lpSbvOverlay';
  o.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99990;display:none;padding:16px 16px calc(16px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(10,15,29,0) 0%,rgba(10,15,29,.90) 24%,rgba(10,15,29,.98) 100%)';
  o.innerHTML='<div style="max-width:520px;margin:0 auto"><div id="lpSbvTitulo" style="color:#fff;font-weight:700;font-size:1rem;text-align:center;margin-bottom:10px">¿Ver el sobrevuelo de tu viaje?</div><div style="display:flex;gap:8px"><button id="lpSbvVer" type="button" style="flex:2;padding:13px;border:none;border-radius:12px;font-weight:700;font-size:.9rem;color:#0a0f1d;background:var(--p);cursor:pointer">Ver sobrevuelo</button><button id="lpSbvGuardar" type="button" style="flex:1;padding:13px;border:none;border-radius:12px;font-weight:700;font-size:.85rem;color:#fff;background:#10b981;cursor:pointer">Guardar ruta</button><button id="lpSbvDescartar" type="button" style="flex:1;padding:13px;border:1px solid rgba(226,84,74,.6);border-radius:12px;font-weight:700;font-size:.85rem;color:#e2544a;background:rgba(226,84,74,.08);cursor:pointer">Descartar</button></div></div>';
  document.body.appendChild(o);
  return o;
}
// Oferta al TERMINAR la ruta. `coords` ya viene normalizado a [[lat,lon],...]; la ruta
// YA fue auto-guardada por el flujo existente (no lo tocamos): "Guardar" solo la deja,
// "Descartar" borra esa misma ruta recién creada (localId).
function _ofrecerSobrevueloFin(coords, modo, localId){
  try{
    if(!coords||coords.length<2) return;
    var o=_sbvOverlay();
    var tit=document.getElementById('lpSbvTitulo'); if(tit) tit.textContent='¿Ver el sobrevuelo de tu viaje?';
    o.style.display='block';
    document.getElementById('lpSbvVer').onclick=function(){
      o.style.display='none';
      if(typeof cv==='function') cv('map');
      setTimeout(function(){ reproducirSobrevuelo(coords, modo, function(){ o.style.display='block'; }); },320);
    };
    document.getElementById('lpSbvGuardar').onclick=function(){ o.style.display='none'; if(typeof h==='function') h('Listo, guardé tu ruta.'); };
    document.getElementById('lpSbvDescartar').onclick=function(){ o.style.display='none'; _sbvDescartar(localId); if(typeof h==='function') h('Descarté esta ruta.'); };
  }catch(e){ try{ if(window.Sentry) Sentry.captureException(e); }catch(_e){} }
}
// Reproducir el sobrevuelo de una ruta YA guardada (botón del historial). Usa el modo
// guardado si existe, si no el modo actual.
function verSobrevueloRuta(id){
  try{
    var r=(typeof _rutaPorId==='function')?_rutaPorId(id):rutasLocales().find(function(x){return x.localId===id;});
    var pts=(r&&r.points&&r.points.length)?r.points:null;
    if(!pts){ if(typeof h==='function') h('Esta ruta no tiene puntos guardados para el sobrevuelo.'); return; }
    var coords=pts.map(function(p){ return [p.lat,p.lon]; });
    var modo=(r&&r.modo)?r.modo:actividadTipo;
    if(typeof cv==='function') cv('map');
    setTimeout(function(){ reproducirSobrevuelo(coords, modo); },340);
  }catch(e){ try{ if(window.Sentry) Sentry.captureException(e); }catch(_e){} }
}
// ENVOLTORIO (no edición) de toggleGPS: cuando el usuario DETIENE el GPS libre y hay
// recorrido grabado, ofrece el sobrevuelo. El toggleGPS original SIEMPRE corre primero
// e intacto; lo aditivo va después, en try/catch, así jamás puede afectar al GPS.
(function(){
  if(typeof toggleGPS!=='function') return;
  var _origToggleGPS=toggleGPS;
  toggleGPS=function(){
    var eraGrabando=(typeof ig!=='undefined') && ig;
    var r=_origToggleGPS.apply(this,arguments);
    try{
      if(eraGrabando && typeof ig!=='undefined' && !ig && Array.isArray(currentRoute) && currentRoute.length>1){
        var coords=currentRoute.map(function(p){ return [p.lat,p.lon]; });
        var localId='l'+currentRoute[0].t;
        _ofrecerSobrevueloFin(coords, (typeof actividadTipo!=='undefined'?actividadTipo:'ciclismo'), localId);
      }
    }catch(e){ try{ if(window.Sentry) Sentry.captureException(e); }catch(_e){} }
    return r;
  };
})();
/* =============== FIN SOBREVUELO DEL VIAJE =============== */
