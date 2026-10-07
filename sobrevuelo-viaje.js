/* ================= SOBREVUELO DEL VIAJE (v7.28) =================
   Función NUEVA y 100% ADITIVA: al terminar una ruta (o desde el historial),
   un icono que RECORRE el trazado en el mapa MapLibre `mp`, animando un
   marcador a lo largo de las coordenadas con requestAnimationFrame. El icono
   se adapta al modo actual (_modoIconHTML(actividadTipo): ciclismo/mtb/trekking/moto).
   NO toca GPS (toggleGPS se ENVUELVE sin editar su cuerpo), ni auth, ni reportes,
   ni el guardado. Todo cae en try/catch para no poder romper el núcleo. */
var _sbvRAF=null,_sbvMarker=null,_sbvLine=null,_sbvSonido=null,_sbvNeon=null;
// ===== Huella neón (2026-10-07, Inty: "quiero que el camino brille como lo habíamos acordado") =====
// La misma del sobrevuelo 3D (sobrevuelo-3d.js, "firefly"): lo pedaleado brilla con el color de la pendiente
// (sb3Neon.colorPend) en 2 halos anchos y difuminados + un núcleo casi blanco; el tramo actual late.
var _SBV_NEON_CAPAS=['sbvn-hecho-g3','sbvn-hecho-g2','sbvn-hecho','sbvn-cabeza-g3','sbvn-cabeza-g2','sbvn-cabeza'];
function _sbvNeonQuitar(){ if(!mp) return; _SBV_NEON_CAPAS.forEach(function(l){ try{ if(mp.getLayer(l)) mp.removeLayer(l); }catch(e){} });
  ['sbvn-tramos','sbvn-cabeza'].forEach(function(s){ try{ if(mp.getSource(s)) mp.removeSource(s); }catch(e){} }); }
function _sbvNeonCrear(coords,pend){
  try{
    if(!mp || !mp.addSource) return null;
    _sbvNeonQuitar();
    var K=window.sb3Neon, col=function(g){ return K?K.colorPend(g==null?0:g):'#fc4c02'; }, neo=function(c){ return K?K.neon(c,.72):'#ffe0d1'; };
    var c=coords.map(function(p){ return [p[1],p[0]]; }), run=[], feats=[], i0=0; pend=pend||[];
    for(var i=1;i<=c.length;i++){ if(i===c.length || col(pend[i])!==col(pend[i0+1]) || i-i0>=60){ var cc=col(pend[i0+1]); feats.push({type:'Feature',properties:{b:i-1,col:cc,neo:neo(cc)},geometry:{type:'LineString',coordinates:c.slice(i0,i)}}); for(var k=i0;k<i-1;k++) run[k]=i0; i0=i-1; } }
    mp.addSource('sbvn-tramos',{type:'geojson',data:{type:'FeatureCollection',features:feats}});
    mp.addSource('sbvn-cabeza',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[c[0],c[0]]}}});
    var Wz=function(a,b){ return ['interpolate',['linear'],['zoom'],10,a,15,b]; }, LJ={'line-cap':'round','line-join':'round'};
    function capas(id,src,filtro,co,nucleo){ var f=filtro?{filter:filtro}:{};
      mp.addLayer(Object.assign({id:id+'-g3',type:'line',source:src,layout:LJ,paint:{'line-color':co,'line-width':Wz(18,64),'line-blur':Wz(10,40),'line-opacity':.45}},f));
      mp.addLayer(Object.assign({id:id+'-g2',type:'line',source:src,layout:LJ,paint:{'line-color':co,'line-width':Wz(7,20),'line-blur':Wz(3,9),'line-opacity':.95}},f));
      mp.addLayer(Object.assign({id:id,type:'line',source:src,layout:LJ,paint:{'line-color':nucleo,'line-width':Wz(2,4.6)}},f)); }
    var c0=col(pend[1]); capas('sbvn-hecho','sbvn-tramos',['<=',['get','b'],0],['get','col'],['get','neo']); capas('sbvn-cabeza','sbvn-cabeza',null,c0,neo(c0));
    var ini0=-1, reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    return { mover:function(i,p,ts){ try{
      var ini=run[i]!==undefined?run[i]:i;
      if(ini!==ini0){ var cc=col(pend[ini+1]); ['sbvn-hecho','sbvn-hecho-g2','sbvn-hecho-g3'].forEach(function(l){ mp.setFilter(l,['<=',['get','b'],ini]); });
        mp.setPaintProperty('sbvn-cabeza-g3','line-color',cc); mp.setPaintProperty('sbvn-cabeza-g2','line-color',cc); mp.setPaintProperty('sbvn-cabeza','line-color',neo(cc)); ini0=ini; }
      mp.getSource('sbvn-cabeza').setData({type:'Feature',geometry:{type:'LineString',coordinates:c.slice(ini,i+1).concat([p])}});
      var t=ts/1000, lat=reduce?.5:.5+.5*Math.sin(t*3.9), tit=reduce?1:(.9+.1*Math.sin(t*23)*Math.sin(t*7.3));
      mp.setPaintProperty('sbvn-hecho-g3','line-opacity',(.3+.2*lat)*tit); mp.setPaintProperty('sbvn-cabeza-g3','line-opacity',(.45+.3*lat)*tit);
    }catch(e){} } };
  }catch(e){ console.warn('[sobrevuelo] huella neón', e); _sbvNeonQuitar(); return null; }
}
function _sbvHaversine(a,b){ var R=6371000,d=Math.PI/180; var dLat=(b[0]-a[0])*d,dLon=(b[1]-a[1])*d,la1=a[0]*d,la2=b[0]*d; var s=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)*Math.sin(dLon/2); return 2*R*Math.asin(Math.min(1,Math.sqrt(s))); }
function detenerSobrevuelo(){
  if(_sbvSonido){ try{ _sbvSonido.parar(); }catch(e){ console.warn('[sobrevuelo] sonido', e); } _sbvSonido=null; }
  if(_sbvRAF){ try{ cancelAnimationFrame(_sbvRAF); }catch(e){} _sbvRAF=null; }
  if(_sbvMarker){ try{ _sbvMarker.remove(); }catch(e){} _sbvMarker=null; }
  if(_sbvLine){ try{ if(mp) mp.removeLayer(_sbvLine); }catch(e){} _sbvLine=null; }
  if(_sbvNeon){ _sbvNeonQuitar(); _sbvNeon=null; }
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
  // ventana de al menos 20 s centrada en el punto: un salto del GPS entre dos puntos
  // seguidos (muy común en el teléfono) no se convierte en un falso "¡Volando! 80 km/h"
  if(tieneT) for(i=0;i<n;i++){ var a=i, b=i; while(coords[b][2]-coords[a][2]<20000 && (a>0||b<n-1)){ if(a>0) a--; if(b<n-1 && coords[b][2]-coords[a][2]<20000) b++; } var dt=(coords[b][2]-coords[a][2])/1000; vel.push(dt>0?Math.min(90,Math.min(cum[b]-cum[a],_sbvHaversine(coords[a],coords[b])*1.15)/dt*3.6):0); }
  if(vel.length){
    var iv=0; for(i=1;i<n;i++) if(vel[i]>vel[iv]) iv=i;
    // "¡Volando!" solo cuando de verdad es rápido; si no, la máxima solo si se nota sobre el
    // ritmo normal del viaje (a ritmo parejo no hay globo de velocidad)
    var vm_=0,nv_=0; vel.forEach(function(v){ if(v>2){ vm_+=v; nv_++; } }); vm_=nv_?vm_/nv_:0;
    if(vel[iv]>=28) ev.push({d:cum[iv],pri:7,expr:'sorprendido',txt:'¡Volando! '+Math.round(vel[iv])+' km/h',rapido:true});
    else if(vel[iv]>=15 && vel[iv]>=vm_*1.35) ev.push({d:cum[iv],pri:6,expr:'contento',txt:'Máxima: '+Math.round(vel[iv])+' km/h'});
    // pausas: más de 90 s casi sin moverse
    for(i=1;i<n;i++){ var pdt=(coords[i][2]-coords[i-1][2])/1000; if(pdt>=90 && cum[i]-cum[i-1]<30) ev.push({d:cum[i],pri:4,expr:'pensando',txt:'Pausa para respirar ('+Math.round(pdt/60)+' min)'}); }
  }
  // altura suavizada y pendiente cada ~100 m
  var alt=coords.map(function(c){ return isFinite(c[3])?c[3]:null; }), conAlt=alt.filter(function(x){return x!==null;}).length;
  if(conAlt>=Math.max(5,n*0.6)){
    // altura promediada en ±75 m de recorrido: la del GPS del teléfono salta ±5-10 m en
    // plano; con una ventana corta eso parecía subida/bajada (Pistero "¡Ufff!" en lo plano)
    var as=alt.map(function(_,k){ var s=0,c=0,q; for(q=k;q>=0 && cum[k]-cum[q]<=75;q--){ if(alt[q]!==null){ s+=alt[q]; c++; } } for(q=k+1;q<n && cum[q]-cum[k]<=75;q++){ if(alt[q]!==null){ s+=alt[q]; c++; } } return c?s/c:null; });
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
  // pendiente por punto (±50 m) con la altura suavizada; null si la ruta no trae altura
  var pend=null;
  if(typeof as!=='undefined' && as){ pend=[]; for(i=0;i<n;i++){ var i0=i, i1=i; while(i0>0 && cum[i]-cum[i0]<75) i0--; while(i1<n-1 && cum[i1]-cum[i]<75) i1++; pend.push((as[i0]!==null&&as[i1]!==null&&cum[i1]>cum[i0])?(as[i1]-as[i0])/(cum[i1]-cum[i0]):null); } }
  return {cum:cum,total:total,eventos:ok,vel:vel.length?vel:null,pend:pend};
}
// Saca los "saltos" del GPS: puntos que implican una velocidad imposible para el vehículo
// desde el último punto bueno (bici > 80 km/h; auto/moto > 160 km/h). Sin hora no filtra.
function _sbvLimpiar(coords,modo){
  var lim=(modo==='moto')?45:22, out=[];
  for(var i=0;i<coords.length;i++){ var c=coords[i], u=out[out.length-1];
    if(u && isFinite(c[2]) && isFinite(u[2]) && c[2]>u[2] && _sbvHaversine(u,c)/((c[2]-u[2])/1000)>lim) continue;
    out.push(c); }
  return out.length>=2?out:coords;
}
// rumbo (0 = norte, sentido horario) de a hacia b, en grados
function _sbvRumbo(a,b){ var d=Math.PI/180, y=Math.sin((b[1]-a[1])*d)*Math.cos(b[0]*d), x=Math.cos(a[0]*d)*Math.sin(b[0]*d)-Math.sin(a[0]*d)*Math.cos(b[0]*d)*Math.cos((b[1]-a[1])*d); return (Math.atan2(y,x)/d+360)%360; }
function _sbvGiro(de,a){ return ((a-de+540)%360)-180; }
function _sbvMarcadorAtrasHTML(A){ return '<div class="sbv-rider atras"><div class="sbv-globo"><span class="sbv-cara"></span><span class="sbv-txt"></span></div><div class="sbv-bici"><div class="sbv-incl"><div class="sbv-cuerpo">'+A.svg+'</div><div class="sbv-cabeza" style="left:'+A.cab.l+'%;top:'+A.cab.t+'%;width:'+A.cab.w+'%;height:'+A.cab.h+'%"></div></div></div></div>'; }
function _sbvMarcadorHTML(svg){ return '<div class="sbv-rider"><div class="sbv-globo"><span class="sbv-cara"></span><span class="sbv-txt"></span></div><div class="sbv-bici">'+svg+'</div></div>'; }
// Anima a Pistero en su bici recorriendo `coords` sobre `mp`. Encuadra toda la ruta y
// avanza a velocidad uniforme por distancia real; se detiene un instante en cada
// momento del viaje para mostrar el globo. onEnd() al terminar (lo usa la oferta de fin
// de ruta para reaparecer sus botones).
function reproducirSobrevuelo(coords, modo, onEnd){
  try{
    if(!mp){ if(typeof h==='function') h('El mapa todavía no está listo, prueba de nuevo en un momento.'); if(onEnd)onEnd(); return; }
    coords=(coords||[]).filter(function(c){ return c && isFinite(c[0]) && isFinite(c[1]); });
    coords=_sbvLimpiar(coords,modo);
    if(coords.length<2){ if(typeof h==='function') h('No hay suficiente recorrido para el sobrevuelo.'); if(onEnd)onEnd(); return; }
    detenerSobrevuelo();
    var accent=(getComputedStyle(document.documentElement).getPropertyValue('--p')||'').trim()||'#fc4c02';
    _sbvLine=mlPolyline(coords,{color:accent,weight:3,opacity:0.45}).addTo(mp);
    var A=_sbvAnalizar(coords), cum=A.cum, total=A.total, eventos=A.eventos.slice();
    _sbvNeon=_sbvNeonCrear(coords,A.pend);
    if(total<=0){ if(typeof h==='function') h('El recorrido es demasiado corto para animarlo.'); detenerSobrevuelo(); if(onEnd)onEnd(); return; }
    var opts=(typeof _pistOpts==='function')?_pistOpts():{};
    var conBici=(typeof _pistBiciSVG==='function');
    // vehículo según el modo del viaje (auto/moto en Motorizado, MTB, cicloviaje…) y pose según el momento
    var veh=(typeof _pistVehiculo==='function')?_pistVehiculo(opts,modo||(typeof actividadTipo!=='undefined'?actividadTipo:'')):'';
    // sonido: cadena (bici) o motor (auto/moto) mientras avanza; la mascota saluda al partir
    _sbvSonido=(typeof pistSonidoViaje==='function')?pistSonidoViaje(veh):null;
    // Inty 2026-10-07: sin mascota en el sobrevuelo (será un regalo tras el primer viaje)
    // Inty 2026-10-07: Pistero ya NO va en bici. Va como rostro, igual que en el sobrevuelo 3D (sb3CaraPersonaje = el
    // personaje que eligió el usuario). Solo si sobrevuelo-3d.js no cargó, la cara de siempre.
    function caraDe(expr){ var s=(typeof window.sb3CaraPersonaje==='function')?window.sb3CaraPersonaje(expr||'feliz'):''; return s||((typeof _pistoDe==='function')?_pistoDe(opts,expr||'feliz'):''); }
    function rostro(expr){ return '<div class="sbv-rostro"><div class="sbv-rostro-c">'+caraDe(expr)+'</div><div class="sbv-rostro-pin"></div></div>'; }
    function bici(expr,rapido,pose){ return rostro(expr); }
    // en primera persona Pistero va DE ESPALDAS hacia donde avanza la ruta (cámara detrás)
    var primera=!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var deEspaldas=false; // antes: Pistero de espaldas pedaleando (_pistAtrasSVG). Ahora siempre rostro de frente.
    function cuerpo(G){ return _pistAtrasSVG(opts,{vehiculo:veh,cadencia:G.cad,rapido:G.rapido,pose:G.pose||''}); }
    // esqueleto animado (movimiento orgánico) para las bicis; moto/auto usan el dibujo fijo
    var rig=(deEspaldas && typeof _pistAtrasRig==='function')?_pistAtrasRig(opts,veh):null, rigSt={cad:.68,pose:'',sway:0,rapido:0};
    function marcadorAtras(){ var A=cuerpo({cad:.68,rapido:0,pose:''}); if(rig) A={svg:rig.svg,cab:A.cab}; return _sbvMarcadorAtrasHTML(A); }
    _sbvMarker=mlMarker([coords[0][0],coords[0][1]],{icon:{html:deEspaldas?marcadorAtras():_sbvMarcadorHTML(bici('feliz'))}}).addTo(mp);
    var el=(_sbvMarker._ml&&_sbvMarker._ml.getElement)?_sbvMarker._ml.getElement():null;
    var cajaBici=el&&el.querySelector('.sbv-bici'), globo=el&&el.querySelector('.sbv-globo'), cajaCuerpo=el&&el.querySelector('.sbv-cuerpo'), cajaCabeza=el&&el.querySelector('.sbv-cabeza'), cajaIncl=el&&el.querySelector('.sbv-incl');
    if(rig && cajaCuerpo){ rig.bind(cajaCuerpo); if(cajaBici) cajaBici.classList.add('con-rig'); }
    var cabTop0=cajaCabeza?parseFloat(cajaCabeza.style.top)||3.5:3.5;
    // Pistero mira al camino (se le ve la nuca) y GIRA la cabeza hacia la cámara cuando pasa
    // algo; pone su gesto un rato y vuelve a mirar adelante. La pedalada no se reinicia.
    var girarT=null, caraVisible='';
    function cabeza(html){ if(!cajaCabeza) return; cajaCabeza.classList.add('girando'); setTimeout(function(){ cajaCabeza.innerHTML=html; cajaCabeza.classList.remove('girando'); },140); }
    function girar(expr,ms){
      if(!cajaCabeza || typeof _pistoDe!=='function') return;
      clearTimeout(girarT); if(caraVisible!==expr){ cabeza(_pistoDe(opts,expr)); caraVisible=expr; }
      girarT=setTimeout(function(){ caraVisible=''; cabeza(typeof _pistNucaSVG==='function'?_pistNucaSVG(opts):_pistoDe(opts,'feliz')); },ms);
    }
    // ===== Reacciones según lo que pasa en el trayecto =====
    // base  = postura que corresponde al tramo (de pie en subida, agachado en bajada o a
    //         alta velocidad, pie en el suelo detenido) + pedalada y balanceo.
    // reacción = gesto puntual cuando CAMBIA la situación: gira la cabeza con su cara, a
    //         veces una pose (secarse el sudor, puño en alto…) y un globito corto que NO
    //         detiene el avance. Mínimo 2,5 s entre reacciones y cada tipo con su espera.
    var base=null, gNuevo=null, cuerpoKey='', poseTemp=null, poseTempHasta=0, ultReac=-1e9, ultTipo={}, sit={}, sitPrevSube=false, incl=0;
    function pintarCuerpo(G){ var P=Object.assign({},G); if(poseTemp) P.pose=poseTemp;
      if(rig){ rigSt={cad:P.cad,pose:P.pose||'',sway:G.sway&&!poseTemp,rapido:P.rapido}; return; }
      var k=P.cad+'|'+P.rapido+'|'+(P.pose||''); if(cajaCuerpo && k!==cuerpoKey){ cajaCuerpo.innerHTML=cuerpo(P).svg; cuerpoKey=k; } if(cajaBici){ cajaBici.classList.toggle('esfuerzo',!!G.sway && !poseTemp); cajaBici.style.setProperty('--cad',(G.cad||.9)+'s'); } }
    function miniGlobo(expr,txt,ts,ms){
      if(!globo||!txt) return;
      var cara=globo.querySelector('.sbv-cara'), t=globo.querySelector('.sbv-txt');
      if(cara && typeof _pistoDe==='function') cara.innerHTML=caraDe(expr);
      if(t) t.textContent=txt;
      globo.classList.remove('on'); void globo.offsetWidth; globo.classList.add('on','mini');
      globoHasta=ts+ms;
    }
    function reaccionar(tipo,expr,txt,pose,ms,ts,enfriar){
      if(ts-ultReac<2500 || (ultTipo[tipo] && ts-ultTipo[tipo]<enfriar)) return false;
      ultReac=ts; ultTipo[tipo]=ts; girar(expr,ms); if(!deEspaldas && cajaBici) cajaBici.innerHTML=bici(expr);
      if(pose){ poseTemp=pose; poseTempHasta=ts+ms; if(base) pintarCuerpo(base); }
      miniGlobo(expr,txt,ts,ms);
      return true;
    }
    if(deEspaldas){ if(cajaCabeza) cajaCabeza.innerHTML=(typeof _pistNucaSVG==='function')?_pistNucaSVG(opts):''; base={expr:'feliz',cad:.68,sway:0,rapido:0,pose:''}; pintarCuerpo(base); }
    // Cámara en primera persona: sigue a Pistero de cerca, inclinada y girando hacia donde
    // avanza (con más camino visible adelante). Con movimiento reducido: vista general.
    var Z=total>40000?14.6:(total>15000?15.4:16.2), PITCH=58, camB=null, intro=primera?2200:0;
    function puntoEn(d){ var k=1; while(k<coords.length-1 && cum[k]<d) k++; var q=coords[k-1], r=coords[k], L=cum[k]-cum[k-1], ff=L>0?Math.min(1,Math.max(0,(d-cum[k-1])/L)):0; return [q[0]+(r[0]-q[0])*ff, q[1]+(r[1]-q[1])*ff]; }
    function rumboEn(d){ return _sbvRumbo(puntoEn(Math.max(0,d-25)), puntoEn(Math.min(total,d+70))); }
    var altoMapa=(mp.getContainer&&mp.getContainer().clientHeight)||400, PAD={top:Math.round(altoMapa*0.32),bottom:0,left:0,right:0};
    if(primera){ camB=rumboEn(0); try{ mp.fitBounds(_sbvLine.getBounds().pad(0.22),{duration:0}); mp.flyTo({center:[coords[0][1],coords[0][0]],zoom:Z,pitch:PITCH,bearing:camB,padding:PAD,duration:intro-200,essential:true}); }catch(e){ console.warn('[sobrevuelo] cámara', e); } }
    else { try{ mp.fitBounds(_sbvLine.getBounds().pad(0.22)); }catch(e){ console.warn('[sobrevuelo] encuadre', e); } }
    var vMedia=0; if(A.vel){ var sv=0,nv=0; A.vel.forEach(function(v){ if(v>2){ sv+=v; nv++; } }); vMedia=nv?sv/nv:0; }
    var ritmo=0.2, Zc=null;
    var dur0=primera?Math.min(60000,Math.max(15000,total/1000*5000)):Math.min(22000,Math.max(8000,coords.length*80));
    // el ritmo cambia por tramo (lento subiendo, rápido bajando): se compensa para que el
    // recorrido completo dure lo previsto (~5 s/km), no más
    var lento=1; if(primera && A.vel && vMedia>0){ var acum=0; for(var q=1;q<coords.length;q++){ var rq=Math.max(.55,Math.min(1.7,(A.vel[q]||vMedia)/vMedia)); acum+=(cum[q]-cum[q-1])/rq; } lento=acum/total; }
    var dur=dur0/lento, PAUSA=1500, prog=0, ultimo=null, espera=0, seg=1, mirando=1, sigEv=0, globoHasta=0;
    function mostrarGlobo(e,ts){
      if(!globo) return;
      var cara=globo.querySelector('.sbv-cara'), txt=globo.querySelector('.sbv-txt');
      if(cara && typeof _pistoDe==='function') cara.innerHTML=caraDe(e.expr);
      if(txt) txt.textContent=e.txt;
      globo.classList.remove('on'); void globo.offsetWidth; globo.classList.add('on');
      if(deEspaldas){
        globo.classList.remove('mini'); girar(e.expr,PAUSA+900); ultReac=ts;
        var pe=/^¡Cima/.test(e.txt)?'puno':/^¡Llegamos/.test(e.txt)?'brazos':/^Pausa/.test(e.txt)?'suelo':/^¡Partimos/.test(e.txt)?'puno':null;
        if(pe){ poseTemp=pe; poseTempHasta=ts+PAUSA+900; if(base) pintarCuerpo(base); }
      }
      else if(cajaBici) cajaBici.innerHTML=bici(e.expr,e.rapido,e.pose);
      if(_sbvSonido) _sbvSonido.momento(e);
      globoHasta=ts+PAUSA+900;
    }
    function frame(ts){
      if(ultimo===null) ultimo=ts;
      var dt=ts-ultimo; ultimo=ts;
      if(intro>0){ intro-=dt; } else if(espera>0){ espera-=dt; ritmo=0.15; } else {
        var rT=1; if(A.vel && vMedia>0){ var vv=A.vel[seg]; rT=Math.max(.55,Math.min(1.7,(vv||vMedia)/vMedia)); }
        var falta=(sigEv<eventos.length)?eventos[sigEv].d-prog*total:1e9; if(falta<70) rT*=Math.max(.25,falta/70);
        ritmo+=(rT-ritmo)*(1-Math.exp(-dt/500)); prog+=dt/dur*ritmo;
      }
      if(prog>1) prog=1;
      var target=prog*total;
      if(sigEv<eventos.length && target>=eventos[sigEv].d){ target=eventos[sigEv].d; prog=target/total; mostrarGlobo(eventos[sigEv],ts); espera=PAUSA; sigEv++; }
      if(globo && globoHasta && ts>globoHasta){ globo.classList.remove('on','mini'); globoHasta=0; if(!deEspaldas && cajaBici) cajaBici.innerHTML=bici('feliz'); }
      while(seg<coords.length-1 && cum[seg]<target) seg++;
      var a=coords[seg-1], b=coords[seg];
      var segLen=cum[seg]-cum[seg-1], f=segLen>0?Math.min(1,Math.max(0,(target-cum[seg-1])/segLen)):0;
      var lat=a[0]+(b[0]-a[0])*f, lon=a[1]+(b[1]-a[1])*f;
      if(_sbvMarker) _sbvMarker.setLatLng([lat,lon]);
      if(_sbvNeon) _sbvNeon.mover(seg-1,[lon,lat],ts);
      if(intro<=0 && typeof _pistGestoEsfuerzo==='function'){
        var gp=A.pend?A.pend[seg]:null, vp=A.vel?A.vel[seg]:null, G=_pistGestoEsfuerzo(gp,vp);
        if(poseTemp && ts>poseTempHasta){ poseTemp=null; }
        var kG=G.cad+'|'+G.rapido+'|'+G.pose;
        if(!base || kG!==(base.cad+'|'+base.rapido+'|'+base.pose)){ if(!gNuevo||gNuevo.k!==kG) gNuevo={k:kG,t:ts}; else if(ts-gNuevo.t>400){ base=G; gNuevo=null; } }
        if(deEspaldas && base) pintarCuerpo(base);
        // se inclina hacia el lado de la curva
        var giro=_sbvGiro(rumboEn(target),rumboEn(Math.min(total,target+45)));
        incl+=(Math.max(-14,Math.min(14,giro*0.22))-incl)*Math.min(1,dt/300);
        var rr=rig?rig.update(rigSt,dt):{sway:0,cabezaDy:0,cabezaRot:0};
        if(cajaIncl) cajaIncl.style.transform='rotate('+(incl+rr.sway).toFixed(2)+'deg)';
        if(rig && cajaCabeza){ cajaCabeza.style.top=(cabTop0+rr.cabezaDy/110*100).toFixed(2)+'%'; cajaCabeza.style.rotate=rr.cabezaRot.toFixed(2)+'deg'; }
        if(!globoHasta && espera<=0){
          var sube=gp!==null&&gp>0.045, dura=gp!==null&&gp>0.09, baja=gp!==null&&gp<-0.05, rap=vp!==null&&vp>35, llano=!sube&&!baja&&!rap;
          // cada situación queda "pendiente" hasta que se pueda mostrar (si coincidió con un
          // globo o con otra reacción, sale apenas haya espacio mientras siga pasando)
          var hecho=false;
          function una(flag,activo,fn){ if(!activo){ sit[flag]=false; return; } if(hecho||sit[flag]) return; if(fn()){ sit[flag]=true; hecho=true; } }
          var curva=Math.abs(giro)>40;
          una('sube',sube,function(){ return reaccionar('subida','cansado','¡A subir!',null,2000,ts,6000); });
          una('dura',dura,function(){ return reaccionar('dura','enojado','¡Ufff!',null,2000,ts,6000); });
          una('baja',baja,function(){ return reaccionar('bajada','emocionado','¡Wiii!',null,1800,ts,6000); });
          una('rap',rap,function(){ return reaccionar('rapido','sorprendido','¡Volando!',null,1800,ts,8000); });
          una('curva',curva,function(){ return reaccionar('curva','sorprendido','¡Ojo, curva!',null,1500,ts,5000); });
          una('fin',!sube && sitPrevSube && gp!==null && gp<0.02,function(){ return reaccionar('finSubida','guino','¡Listo!',null,1800,ts,6000); });
          if(!hecho && sube && ts-ultReac>6000) hecho=reaccionar('seca','cansado','','seca',1700,ts,6000);
          if(!hecho && llano && ts-ultReac>12000) reaccionar('silba','guino','♪',null,1500,ts,12000);
          if(sube) sitPrevSube=true; else if(gp!==null && gp<0.02) sitPrevSube=false;
        }
      }
      if(primera && intro<=0){ var rb=rumboEn(target); camB=(camB===null)?rb:(camB+_sbvGiro(camB,rb)*Math.min(1,dt/450)+360)%360; var zT=Z+((A.vel&&A.vel[seg]>32)?-.45:0)+((A.pend&&A.pend[seg]>.045)?.2:0); Zc=(Zc===null)?Z:Zc+(zT-Zc)*(1-Math.exp(-dt/1400)); try{ mp.jumpTo({center:[lon,lat],zoom:Zc,pitch:PITCH,bearing:camB,padding:PAD}); }catch(e){ console.warn('[sobrevuelo] cámara', e); } }
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
// Inty 2026-10-07: el de siempre también va por la línea pegada al camino (la del 3D, sb3PegadaPara en sobrevuelo-3d.js);
// si no hay (sin 3D cargado, sin red, se pasa del tope), la traza del GPS como antes. Nunca deja de arrancar.
function _sbvConPegada(id,coords,fn){
  var hecho=false, ir=function(c){ if(hecho) return; hecho=true; fn(c&&c.length>=2?c:coords); };
  try{
    if(typeof window.sb3PegadaPara!=='function') return ir(null);
    var aviso=setTimeout(function(){ if(!hecho && typeof h==='function') h('Pegando tu ruta al camino…'); },700);
    window.sb3PegadaPara(id,coords,6000).then(function(c){ clearTimeout(aviso); ir(c); },function(){ clearTimeout(aviso); ir(null); });
  }catch(e){ ir(null); }
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
      var deSiempre=function(){ if(typeof cv==='function') cv('map'); _sbvConPegada(localId,coords,function(c){ setTimeout(function(){ reproducirSobrevuelo(c, modo, function(){ o.style.display='block'; }); },320); }); };
      // 2026-10-07: primero el sobrevuelo 3D (sobrevuelo-3d.js); si no se puede, el de siempre, igual que antes
      if(typeof abrirSobrevuelo3D==='function' && abrirSobrevuelo3D(coords,{id:localId,nombre:'Tu viaje de hoy',respaldo:deSiempre},function(){ o.style.display='block'; })) return;
      deSiempre();
    };
    document.getElementById('lpSbvGuardar').onclick=function(){ o.style.display='none'; if(typeof h==='function') h('Listo, guardé tu ruta.'); };
    document.getElementById('lpSbvDescartar').onclick=function(){ o.style.display='none'; _sbvDescartar(localId); if(typeof h==='function') h('Descarté esta ruta.'); };
  }catch(e){ try{ if(window.Sentry) Sentry.captureException(e); }catch(_e){} }
}
// Reproducir el sobrevuelo de una ruta YA guardada (botón del historial). Usa el modo
// guardado si existe, si no el modo actual.
// nombre para el sobrevuelo 3D: el que le puso el ciclista o "Viaje del 4 de octubre"
function _sbvNombreRuta(r){ if(r&&r.nombreRuta) return r.nombreRuta; try{ return 'Viaje del '+new Date(r.startTime).toLocaleDateString('es-CL',{day:'numeric',month:'long'}); }catch(e){ return 'Tu viaje'; } }
function verSobrevueloRuta(id){
  try{
    var r=(typeof _rutaPorId==='function')?_rutaPorId(id):rutasLocales().find(function(x){return x.localId===id;});
    var pts=(r&&r.points&&r.points.length)?r.points:null;
    if(!pts){ if(typeof h==='function') h('Esta ruta no tiene puntos guardados para el sobrevuelo.'); return; }
    var coords=pts.map(function(p){ return [p.lat,p.lon,p.t,p.alt]; });
    var modo=(r&&r.modo)?r.modo:actividadTipo;
    var deSiempre=function(){ if(typeof cv==='function') cv('map'); _sbvConPegada(id,coords,function(c){ setTimeout(function(){ reproducirSobrevuelo(c, modo); },340); }); };
    // 2026-10-07: primero el sobrevuelo 3D (sobrevuelo-3d.js); si no se puede (sin WebGL, pocos puntos), el de siempre
    if(typeof abrirSobrevuelo3D==='function' && abrirSobrevuelo3D(pts,{id:id,nombre:_sbvNombreRuta(r),respaldo:deSiempre})) return;
    deSiempre();
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
