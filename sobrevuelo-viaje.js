/* ================= SOBREVUELO DEL VIAJE (v7.28) =================
   Función NUEVA y 100% ADITIVA: al terminar una ruta (o desde el historial),
   un icono que RECORRE el trazado en el mapa MapLibre `mp`, animando un
   marcador a lo largo de las coordenadas con requestAnimationFrame. El icono
   se adapta al modo actual (_modoIconHTML(actividadTipo): ciclismo/mtb/trekking/moto).
   NO toca GPS (toggleGPS se ENVUELVE sin editar su cuerpo), ni auth, ni reportes,
   ni el guardado. Todo cae en try/catch para no poder romper el núcleo. */
var _sbvRAF=null,_sbvMarker=null,_sbvLine=null,_sbvSonido=null;
function _sbvHaversine(a,b){ var R=6371000,d=Math.PI/180; var dLat=(b[0]-a[0])*d,dLon=(b[1]-a[1])*d,la1=a[0]*d,la2=b[0]*d; var s=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)*Math.sin(dLon/2); return 2*R*Math.asin(Math.min(1,Math.sqrt(s))); }
function detenerSobrevuelo(){
  if(_sbvSonido){ try{ _sbvSonido.parar(); }catch(e){ console.warn('[sobrevuelo] sonido', e); } _sbvSonido=null; }
  if(_sbvRAF){ try{ cancelAnimationFrame(_sbvRAF); }catch(e){} _sbvRAF=null; }
  if(_sbvMarker){ try{ _sbvMarker.remove(); }catch(e){} _sbvMarker=null; }
  if(_sbvLine){ try{ if(mp) mp.removeLayer(_sbvLine); }catch(e){} _sbvLine=null; }
  try{ if(mp && mp.getPitch && (mp.getPitch()>0 || mp.getBearing()!==0)) mp.easeTo({pitch:0,bearing:0,padding:{top:0,bottom:0,left:0,right:0},duration:600}); }catch(e){ console.warn('[sobrevuelo] restaurar mapa', e); }
}
// ===== Sobrevuelo v2 (2026-10-04): Pistero EN SU BICI recorre la ruta y reacciona =====
// Cada punto guardado trae lat, lon, t (hora) y alt (altura, puede venir null). Con eso
// se buscan los momentos del viaje: subidas, bajadas, velocidad máxima, la cima y las
// pausas. En cada momento Pistero se detiene un instante y aparece un globo de cómic
// con su cara (el gesto que corresponde) y un texto corto con el dato real.
// coords: [[lat,lon], ...] o [[lat,lon,t,alt], ...] (lo segundo da los momentos).
function _sbvAnalizar(coords){
  var n=coords.length, cum=[0], i, j;
  for(i=1;i<n;i++) cum.push(cum[i-1]+_sbvHaversine(coords[i-1],coords[i]));
  var total=cum[n-1], ev=[];
  var km=function(m){ return (m/1000).toFixed(m<10000?1:0).replace('.',','); };
  ev.push({d:0,pri:9,expr:'contento',txt:'¡Partimos!'});
  // velocidad (km/h) con ventana de ±2 puntos; sin hora no hay velocidad
  var vel=[], tieneT=coords.every(function(c){ return isFinite(c[2]); });
  if(tieneT) for(i=0;i<n;i++){ var a=Math.max(0,i-2), b=Math.min(n-1,i+2), dt=(coords[b][2]-coords[a][2])/1000; vel.push(dt>0?Math.min(90,(cum[b]-cum[a])/dt*3.6):0); }
  if(vel.length){
    var iv=0; for(i=1;i<n;i++) if(vel[i]>vel[iv]) iv=i;
    if(vel[iv]>=15) ev.push({d:cum[iv],pri:7,expr:'sorprendido',txt:'¡Volando! '+Math.round(vel[iv])+' km/h',rapido:true});
    // pausas: más de 90 s casi sin moverse
    for(i=1;i<n;i++){ var pdt=(coords[i][2]-coords[i-1][2])/1000; if(pdt>=90 && cum[i]-cum[i-1]<30) ev.push({d:cum[i],pri:4,expr:'pensando',txt:'Pausa para respirar ('+Math.round(pdt/60)+' min)'}); }
  }
  // altura suavizada y pendiente cada ~100 m
  var alt=coords.map(function(c){ return isFinite(c[3])?c[3]:null; }), conAlt=alt.filter(function(x){return x!==null;}).length;
  if(conAlt>=Math.max(5,n*0.6)){
    var as=alt.map(function(_,k){ var s=0,c=0; for(var q=Math.max(0,k-2);q<=Math.min(n-1,k+2);q++){ if(alt[q]!==null){ s+=alt[q]; c++; } } return c?s/c:null; });
    var tramo=null;
    function cerrar(fin){ if(!tramo) return; var largo=cum[fin]-cum[tramo.i]; if(largo>=120){ var dif=Math.round(Math.abs(as[fin]-as[tramo.i])); if(dif>=6) ev.push(tramo.up?{d:cum[tramo.i]+largo*.35,pri:6,expr:'cansado',pose:'pie',txt:'¡Uf, qué subida! +'+dif+' m'}:{d:cum[tramo.i]+largo*.35,pri:5,expr:'emocionado',txt:'¡Bajadaaa! −'+dif+' m'}); } tramo=null; }
    for(i=0;i<n;i++){
      if(as[i]===null) continue;
      for(j=i+1;j<n && cum[j]-cum[i]<100;j++){}
      if(j>=n||as[j]===null) break;
      var g=(as[j]-as[i])/Math.max(1,cum[j]-cum[i]), up=g>0.04, down=g<-0.04;
      if(tramo && ((tramo.up&&!up)||(!tramo.up&&!down))) cerrar(i);
      if(!tramo && (up||down)) tramo={i:i,up:up};
    }
    cerrar(n-1);
    var imax=0, imin=0; for(i=0;i<n;i++){ if(as[i]!==null&&(as[imax]===null||as[i]>as[imax])) imax=i; if(as[i]!==null&&(as[imin]===null||as[i]<as[imin])) imin=i; }
    if(as[imax]-as[imin]>=25 && imax>0 && imax<n-1) ev.push({d:cum[imax],pri:8,expr:'contento',pose:'sinmanos',txt:'¡Cima! '+Math.round(alt[imax]!==null?alt[imax]:as[imax])+' m'});
  }
  if(ev.length<3 && total>800) ev.push({d:total/2,pri:3,expr:'guino',txt:'¡Vamos por la mitad!'});
  ev.push({d:total,pri:9,expr:'guino',pose:'caballito',txt:'¡Llegamos! '+km(total)+' km'});
  // sin amontonar: se deja el más importante dentro de cada ~9 % del recorrido; máx. 7
  ev.sort(function(a,b){ return b.pri-a.pri; });
  var hueco=total*0.09, ok=[];
  ev.forEach(function(e){ if(ok.length<7 && ok.every(function(x){ return Math.abs(x.d-e.d)>=hueco || (x.pri===9&&e.pri===9&&x.d!==e.d); })) ok.push(e); });
  ok.sort(function(a,b){ return a.d-b.d; });
  return {cum:cum,total:total,eventos:ok};
}
// rumbo (0 = norte, sentido horario) de a hacia b, en grados
function _sbvRumbo(a,b){ var d=Math.PI/180, y=Math.sin((b[1]-a[1])*d)*Math.cos(b[0]*d), x=Math.cos(a[0]*d)*Math.sin(b[0]*d)-Math.sin(a[0]*d)*Math.cos(b[0]*d)*Math.cos((b[1]-a[1])*d); return (Math.atan2(y,x)/d+360)%360; }
function _sbvGiro(de,a){ return ((a-de+540)%360)-180; }
function _sbvMarcadorHTML(svg){ return '<div class="sbv-rider"><div class="sbv-globo"><span class="sbv-cara"></span><span class="sbv-txt"></span></div><div class="sbv-bici">'+svg+'</div></div>'; }
// Anima a Pistero en su bici recorriendo `coords` sobre `mp`. Encuadra toda la ruta y
// avanza a velocidad uniforme por distancia real; se detiene un instante en cada
// momento del viaje para mostrar el globo. onEnd() al terminar (lo usa la oferta de fin
// de ruta para reaparecer sus botones).
function reproducirSobrevuelo(coords, modo, onEnd){
  try{
    if(!mp){ if(typeof h==='function') h('El mapa todavía no está listo, prueba de nuevo en un momento.'); if(onEnd)onEnd(); return; }
    coords=(coords||[]).filter(function(c){ return c && isFinite(c[0]) && isFinite(c[1]); });
    if(coords.length<2){ if(typeof h==='function') h('No hay suficiente recorrido para el sobrevuelo.'); if(onEnd)onEnd(); return; }
    detenerSobrevuelo();
    var accent=(getComputedStyle(document.documentElement).getPropertyValue('--p')||'').trim()||'#fc4c02';
    _sbvLine=mlPolyline(coords,{color:accent,weight:5,opacity:0.95}).addTo(mp);
    var A=_sbvAnalizar(coords), cum=A.cum, total=A.total, eventos=A.eventos.slice();
    if(total<=0){ if(typeof h==='function') h('El recorrido es demasiado corto para animarlo.'); detenerSobrevuelo(); if(onEnd)onEnd(); return; }
    var opts=(typeof _pistOpts==='function')?_pistOpts():{};
    var conBici=(typeof _pistBiciSVG==='function');
    // vehículo según el modo del viaje (auto/moto en Motorizado, MTB, cicloviaje…) y pose según el momento
    var veh=(typeof _pistVehiculo==='function')?_pistVehiculo(opts,modo||(typeof actividadTipo!=='undefined'?actividadTipo:'')):'';
    // sonido: cadena (bici) o motor (auto/moto) mientras avanza; la mascota saluda al partir
    _sbvSonido=(typeof pistSonidoViaje==='function')?pistSonidoViaje(veh):null;
    if(opts.mascota && typeof pistSonar==='function') pistSonar('mascota',opts.mascota);
    function bici(expr,rapido,pose){ return conBici?_pistBiciSVG(opts,{expr:expr||'feliz',rapido:!!rapido,cadencia:rapido?0.5:0.85,pose:pose||'',vehiculo:veh}):((typeof _pistoNuevo==='function')?_pistoNuevo(expr||'feliz'):''); }
    _sbvMarker=mlMarker([coords[0][0],coords[0][1]],{icon:{html:_sbvMarcadorHTML(bici('feliz'))}}).addTo(mp);
    var el=(_sbvMarker._ml&&_sbvMarker._ml.getElement)?_sbvMarker._ml.getElement():null;
    var cajaBici=el&&el.querySelector('.sbv-bici'), globo=el&&el.querySelector('.sbv-globo');
    // Cámara en primera persona: sigue a Pistero de cerca, inclinada y girando hacia donde
    // avanza (con más camino visible adelante). Con movimiento reducido: vista general.
    var primera=!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var Z=total>40000?14.6:(total>15000?15.4:16.2), PITCH=58, camB=null, intro=primera?2200:0;
    function puntoEn(d){ var k=1; while(k<coords.length-1 && cum[k]<d) k++; var q=coords[k-1], r=coords[k], L=cum[k]-cum[k-1], ff=L>0?Math.min(1,Math.max(0,(d-cum[k-1])/L)):0; return [q[0]+(r[0]-q[0])*ff, q[1]+(r[1]-q[1])*ff]; }
    function rumboEn(d){ return _sbvRumbo(puntoEn(Math.max(0,d-25)), puntoEn(Math.min(total,d+70))); }
    var altoMapa=(mp.getContainer&&mp.getContainer().clientHeight)||400, PAD={top:Math.round(altoMapa*0.32),bottom:0,left:0,right:0};
    if(primera){ camB=rumboEn(0); try{ mp.fitBounds(_sbvLine.getBounds().pad(0.22),{duration:0}); mp.flyTo({center:[coords[0][1],coords[0][0]],zoom:Z,pitch:PITCH,bearing:camB,padding:PAD,duration:intro-200,essential:true}); }catch(e){ console.warn('[sobrevuelo] cámara', e); } }
    else { try{ mp.fitBounds(_sbvLine.getBounds().pad(0.22)); }catch(e){ console.warn('[sobrevuelo] encuadre', e); } }
    var dur=primera?Math.min(60000,Math.max(15000,total/1000*5000)):Math.min(22000,Math.max(8000,coords.length*80)), PAUSA=1500, prog=0, ultimo=null, espera=0, seg=1, mirando=1, sigEv=0, globoHasta=0;
    function mostrarGlobo(e,ts){
      if(!globo) return;
      var cara=globo.querySelector('.sbv-cara'), txt=globo.querySelector('.sbv-txt');
      if(cara && typeof _pistoDe==='function') cara.innerHTML=_pistoDe(opts,e.expr);
      if(txt) txt.textContent=e.txt;
      globo.classList.remove('on'); void globo.offsetWidth; globo.classList.add('on');
      if(cajaBici) cajaBici.innerHTML=bici(e.expr,e.rapido,e.pose);
      if(_sbvSonido) _sbvSonido.momento(e);
      globoHasta=ts+PAUSA+900;
    }
    function frame(ts){
      if(ultimo===null) ultimo=ts;
      var dt=ts-ultimo; ultimo=ts;
      if(intro>0){ intro-=dt; } else if(espera>0){ espera-=dt; } else { prog+=dt/dur; }
      if(prog>1) prog=1;
      var target=prog*total;
      if(sigEv<eventos.length && target>=eventos[sigEv].d){ target=eventos[sigEv].d; prog=target/total; mostrarGlobo(eventos[sigEv],ts); espera=PAUSA; sigEv++; }
      if(globo && globoHasta && ts>globoHasta){ globo.classList.remove('on'); globoHasta=0; if(cajaBici) cajaBici.innerHTML=bici('feliz'); }
      while(seg<coords.length-1 && cum[seg]<target) seg++;
      var a=coords[seg-1], b=coords[seg];
      var segLen=cum[seg]-cum[seg-1], f=segLen>0?Math.min(1,Math.max(0,(target-cum[seg-1])/segLen)):0;
      var lat=a[0]+(b[0]-a[0])*f, lon=a[1]+(b[1]-a[1])*f;
      if(_sbvMarker) _sbvMarker.setLatLng([lat,lon]);
      if(primera && intro<=0){ var rb=rumboEn(target); camB=(camB===null)?rb:(camB+_sbvGiro(camB,rb)*Math.min(1,dt/450)+360)%360; try{ mp.jumpTo({center:[lon,lat],zoom:Z,pitch:PITCH,bearing:camB,padding:PAD}); }catch(e){ console.warn('[sobrevuelo] cámara', e); } }
      // mira hacia donde avanza (solo cambia si el giro es claro, para no "temblar")
      var dl=primera?0:b[1]-a[1]; if(Math.abs(dl)>1e-6){ var m=dl>0?1:-1; if(m!==mirando && cajaBici){ mirando=m; cajaBici.style.transform='scaleX('+m+')'; } }
      if(prog<1 || espera>0){ _sbvRAF=requestAnimationFrame(frame); }
      else { _sbvRAF=null; try{ mp.fitBounds(_sbvLine.getBounds().pad(0.22),{pitch:0,bearing:0,padding:20,duration:1400}); }catch(e){ console.warn('[sobrevuelo] encuadre final', e); } setTimeout(function(){ detenerSobrevuelo(); if(onEnd)onEnd(); },1800); }
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
    var coords=pts.map(function(p){ return [p.lat,p.lon,p.t,p.alt]; });
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
        var coords=currentRoute.map(function(p){ return [p.lat,p.lon,p.t,p.alt]; });
        var localId='l'+currentRoute[0].t;
        _ofrecerSobrevueloFin(coords, (typeof actividadTipo!=='undefined'?actividadTipo:'ciclismo'), localId);
      }
    }catch(e){ try{ if(window.Sentry) Sentry.captureException(e); }catch(_e){} }
    return r;
  };
})();
/* =============== FIN SOBREVUELO DEL VIAJE =============== */
