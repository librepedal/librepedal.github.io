/* Prototipo del sobrevuelo 3D (propuesta 2026-10-06). NO es código de la app todavía.
   Muestra lado a lado "Hoy" (lo que hace sobrevuelo-viaje.js en main) y la "Propuesta":
   1) la línea va PEGADA al camino (traza limpiada + Valhalla trace_route, ver gen-datos.mjs)
   2) Pistero apoya las ruedas sobre la línea (anchor 'bottom'; hoy queda centrado = corrido)
   3) relieve 3D real (DEM Mapterhorn, el mismo que ya usa el "Video 3D" de rutas.js), cielo y
      niebla; la línea se colorea por pendiente y el perfil de altura avanza con Pistero. */
(function(){
var DEM_TJ='https://tiles.mapterhorn.com/tilejson.json', DEM_TILE='https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
var SAT={version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'© Esri, Maxar, Earthstar Geographics'}},layers:[{id:'sat',type:'raster',source:'sat',paint:{'raster-saturation':-.08,'raster-contrast':.06}}]};
var CALLES='https://tiles.openfreemap.org/styles/liberty';
var R=6371000, rad=Math.PI/180;
function hav(a,b){ var dLa=(b[1]-a[1])*rad, dLo=(b[0]-a[0])*rad, s=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dLo/2)*Math.sin(dLo/2); return 2*R*Math.asin(Math.min(1,Math.sqrt(s))); }
function rumbo(a,b){ var y=Math.sin((b[0]-a[0])*rad)*Math.cos(b[1]*rad), x=Math.cos(a[1]*rad)*Math.sin(b[1]*rad)-Math.sin(a[1]*rad)*Math.cos(b[1]*rad)*Math.cos((b[0]-a[0])*rad); return (Math.atan2(y,x)/rad+360)%360; }
function giro(de,a){ return ((a-de+540)%360)-180; }
function $(id){ return document.getElementById(id); }
function fmt(n,d){ return n.toFixed(d).replace('.',','); }

// ---------- datos ----------
function linea(coords){ var cum=[0]; for(var i=1;i<coords.length;i++) cum.push(cum[i-1]+hav(coords[i-1],coords[i])); return {c:coords,cum:cum,total:cum[cum.length-1]}; }
function densificar(c,paso){ var out=[c[0]]; for(var i=1;i<c.length;i++){ var d=hav(c[i-1],c[i]), k=Math.max(1,Math.ceil(d/paso)); for(var j=1;j<=k;j++) out.push([c[i-1][0]+(c[i][0]-c[i-1][0])*j/k, c[i-1][1]+(c[i][1]-c[i-1][1])*j/k]); } return out; }
function enD(L,d){ var c=L.c, cum=L.cum, k=L._k||1; if(cum[k-1]>d) k=1; while(k<c.length-1 && cum[k]<d) k++; L._k=k; var f=Math.min(1,Math.max(0,(d-cum[k-1])/Math.max(1e-9,cum[k]-cum[k-1]))); return {p:[c[k-1][0]+(c[k][0]-c[k-1][0])*f, c[k-1][1]+(c[k][1]-c[k-1][1])*f], i:k-1, f:f}; }
// limpieza que hace HOY la app (_sbvLimpiar: fuera saltos > 22 m/s)
function limpiarHoy(pts){ var out=[]; pts.forEach(function(p){ var u=out[out.length-1]; if(u && hav([u.lon,u.lat],[p.lon,p.lat])/((p.t-u.t)/1000)>22) return; out.push(p); }); return out; }

// ---------- relieve real: tiles terrarium de Mapterhorn decodificados en un canvas ----------
var demCache={};
function demTile(z,x,y){ var k=z+'/'+x+'/'+y; if(!demCache[k]) demCache[k]=fetch(DEM_TILE.replace('{z}',z).replace('{x}',x).replace('{y}',y)).then(function(r){ if(!r.ok) throw new Error('DEM '+r.status); return r.blob(); }).then(createImageBitmap).then(function(bm){ var cv=document.createElement('canvas'); cv.width=bm.width; cv.height=bm.height; var cx=cv.getContext('2d',{willReadFrequently:true}); cx.drawImage(bm,0,0); return {w:bm.width,d:cx.getImageData(0,0,bm.width,bm.height).data}; }); return demCache[k]; }
function alturas(coords){
  var Z=12, n=Math.pow(2,Z), pos=coords.map(function(c){ var x=(c[0]+180)/360*n, s=Math.sin(c[1]*rad), y=(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n; return {tx:Math.floor(x),ty:Math.floor(y),fx:x-Math.floor(x),fy:y-Math.floor(y)}; });
  var claves={}; pos.forEach(function(p){ claves[p.tx+','+p.ty]=1; });
  return Promise.all(Object.keys(claves).map(function(k){ var t=k.split(','); return demTile(Z,+t[0],+t[1]).then(function(T){ claves[k]=T; }); })).then(function(){
    return pos.map(function(p){ var T=claves[p.tx+','+p.ty], w=T.w, X=p.fx*w-.5, Y=p.fy*w-.5, x0=Math.max(0,Math.min(w-2,Math.floor(X))), y0=Math.max(0,Math.min(w-2,Math.floor(Y))), ax=Math.min(1,Math.max(0,X-x0)), ay=Math.min(1,Math.max(0,Y-y0));
      function e(x,y){ var i=(y*w+x)*4; return T.d[i]*256+T.d[i+1]+T.d[i+2]/256-32768; }
      return (e(x0,y0)*(1-ax)+e(x0+1,y0)*ax)*(1-ay)+(e(x0,y0+1)*(1-ax)+e(x0+1,y0+1)*ax)*ay; });
  });
}
function suavizar(v,cum,m){ return v.map(function(_,k){ var s=0,c=0,q; for(q=k;q>=0&&cum[k]-cum[q]<=m;q--){ s+=v[q]; c++; } for(q=k+1;q<v.length&&cum[q]-cum[k]<=m;q++){ s+=v[q]; c++; } return s/c; }); }
function pendientes(alt,cum,m){ return alt.map(function(_,k){ var a=k,b=k; while(a>0&&cum[k]-cum[a]<m) a--; while(b<alt.length-1&&cum[b]-cum[k]<m) b++; return cum[b]>cum[a]?(alt[b]-alt[a])/(cum[b]-cum[a]):0; }); }
function colorPend(g){ return g<-0.03?'#38bdf8':g<0.03?'#22c55e':g<0.06?'#facc15':g<0.09?'#f97316':'#dc2626'; }

// ---------- estado ----------
var mapa, modo='nuevo', capa='sat', D={}, marcador=null, rig=null, cajas={}, opts=(typeof _pistOpts==='function')?_pistOpts():{}, veh=(typeof _pistVehiculo==='function')?_pistVehiculo(opts,'ciclismo'):'';
var prog=0, corriendo=false, ultimo=null, velX=1, camB=null, incl=0, Zc=null;

Promise.all([fetch('traza-gps.json').then(function(r){return r.json();}), fetch('traza-pegada.json').then(function(r){return r.json();})]).then(function(r){
  var crudo=limpiarHoy(r[0]);
  D.hoy=linea(crudo.map(function(p){ return [p.lon,p.lat]; }));
  D.nuevo=linea(densificar(r[1],12));
  return alturas(D.nuevo.c).then(function(a){
    var N=D.nuevo; N.alt=suavizar(suavizar(a,N.cum,60),N.cum,60); N.pend=pendientes(N.alt,N.cum,100);
    var sub=0, ref=N.alt[0]; N.sub=N.alt.map(function(h){ if(h>ref+2){ sub+=h-ref; ref=h; } else if(h<ref-2) ref=h; return sub; });
    N.min=Math.min.apply(null,N.alt); N.max=Math.max.apply(null,N.alt);
    N.imax=N.alt.indexOf(N.max);
    // la línea "Hoy" no tiene altura confiable (la del GPS del teléfono salta ±10 m): se le da la del camino más cercano solo para el panel
    iniciar();
  });
}).catch(function(e){ $('cargando').textContent='No se pudo cargar: '+e.message; console.error(e); });

function iniciar(){
  mapa=new maplibregl.Map({container:'mapa',style:SAT,center:D.nuevo.c[0],zoom:12,pitch:0,maxPitch:80,attributionControl:{compact:true}});
  mapa.on('style.load',montarCapas); window._demo=mapa; window._ir=function(p){ prog=p; camB=null; Zc=null; pintar(0,performance.now(),true); };
  mapa.once('load',function(){ $('cargando').style.display='none'; encuadrar(0); dibujarPerfil(); });
  $('modo').onclick=function(e){ var m=e.target.dataset.m; if(!m||m===modo) return; modo=m; marcarSeg('modo','m',m); reiniciar(); };
  $('capa').onclick=function(e){ var c=e.target.dataset.c; if(!c||c===capa) return; capa=c; marcarSeg('capa','c',c); mapa.setStyle(c==='sat'?SAT:CALLES,{diff:false}); };
  $('play').onclick=function(){ if(prog>=1) prog=0; corriendo=!corriendo; actualizarBoton(); if(corriendo){ ultimo=null; if(prog===0) arrancar(); else requestAnimationFrame(frame); } };
  $('vel').onclick=function(){ velX=velX===1?2:velX===2?4:1; this.textContent='×'+velX; };
  var pf=$('perfil'), arrastrando=false;
  function irA(ev){ var r=pf.getBoundingClientRect(); prog=Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width)); if(!corriendo){ pintar(0,performance.now(),true); } }
  pf.addEventListener('pointerdown',function(ev){ arrastrando=true; pf.setPointerCapture(ev.pointerId); irA(ev); });
  pf.addEventListener('pointermove',function(ev){ if(arrastrando) irA(ev); });
  pf.addEventListener('pointerup',function(){ arrastrando=false; });
  window.addEventListener('resize',dibujarPerfil);
  nota();
}
function marcarSeg(id,k,v){ [].forEach.call($(id).children,function(b){ b.classList.toggle('on',b.dataset[k]===v); }); }
function actualizarBoton(){ document.body.classList.toggle('corriendo',corriendo); $('play').textContent=corriendo?'❚❚ Pausa':(prog>=1?'↺ Ver de nuevo':'▶ '+(prog>0?'Seguir':'Ver sobrevuelo')); }
function nota(){ $('nota').innerHTML=modo==='hoy'
  ? '<b>Así funciona hoy.</b> La línea es el GPS tal cual se graba (aquí con el error típico de un teléfono, simulado): zigzaguea y se sale del camino. Pistero va anclado por el <b>centro</b>, así que flota corrido de la línea. Mapa plano, sin relieve.'
  : '<b>Propuesta.</b> Línea pegada al camino real, Pistero con las ruedas <b>sobre</b> la línea, relieve 3D real y la línea pintada por pendiente. El perfil de abajo avanza con él: tócalo para saltar.'; }

function montarCapas(){
  var m=mapa, N=D.nuevo, H=D.hoy;
  if(!m.getSource('dem')) m.addSource('dem',{type:'raster-dem',tiles:[DEM_TILE],encoding:'terrarium',tileSize:512,maxzoom:12,attribution:'© Mapterhorn'});
  if(modo==='nuevo'){
    m.setTerrain({source:'dem',exaggeration:1.35});
    try{ m.setSky({'sky-color':'#7db7e8','horizon-color':'#dfe9f2','fog-color':'#e9eef3','sky-horizon-blend':.6,'horizon-fog-blend':.45,'fog-ground-blend':.2}); }catch(e){}
    if(capa==='calles' && !m.getLayer('relieve')){ var antes; m.getStyle().layers.some(function(l){ if(l.type==='symbol'){ antes=l.id; return true; } }); m.addLayer({id:'relieve',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':.5,'hillshade-shadow-color':'#5b4a3a'}},antes); }
  } else { m.setTerrain(null); }
  // con relieve los símbolos se dibujan SOBRE las líneas: los escudos de ruta (T-551) tapaban el trazado
  m.getStyle().layers.forEach(function(l){ if(l.type==='symbol' && /shield|oneway/.test(l.id)) m.setLayoutProperty(l.id,'visibility','none'); });
  // "Hoy": la línea cruda, igual que mlPolyline (halo oscuro + color de acento)
  m.addSource('hoy',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:H.c}}});
  m.addLayer({id:'hoy-halo',type:'line',source:'hoy',layout:{'line-cap':'round','line-join':'round',visibility:modo==='hoy'?'visible':'none'},paint:{'line-color':'#0a0f1d','line-width':9,'line-opacity':.6}});
  m.addLayer({id:'hoy',type:'line',source:'hoy',layout:{'line-cap':'round','line-join':'round',visibility:modo==='hoy'?'visible':'none'},paint:{'line-color':'#fc4c02','line-width':5,'line-opacity':.95}});
  // "Propuesta": la ruta completa (tenue) + tramos seguidos del mismo color de pendiente; lo
  // recorrido brilla. Tramos agrupados: uno de 12 m solo se perdía al alejar (geojson-vt lo simplifica)
  N.run=[]; var feats=[], i0=0; for(var i=1;i<=N.c.length;i++){ if(i===N.c.length || colorPend(N.pend[i])!==colorPend(N.pend[i0+1])){ feats.push({type:'Feature',properties:{a:i0,b:i-1,col:colorPend(N.pend[i0+1])},geometry:{type:'LineString',coordinates:N.c.slice(i0,i)}}); for(var k=i0;k<i-1;k++) N.run[k]=i0; i0=i-1; } }
  m.addSource('ruta',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:N.c}}});
  m.addSource('tramos',{type:'geojson',data:{type:'FeatureCollection',features:feats}});
  m.addSource('cabeza',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[N.c[0],N.c[0]]}}});
  var vis=modo==='nuevo'?'visible':'none';
  m.addLayer({id:'falta-halo',type:'line',source:'ruta',layout:{'line-cap':'round','line-join':'round',visibility:vis},paint:{'line-color':'#0a0f1d','line-width':['interpolate',['linear'],['zoom'],10,4,15,9],'line-opacity':.45}});
  m.addLayer({id:'falta',type:'line',source:'ruta',layout:{'line-cap':'round','line-join':'round',visibility:vis},paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],10,2,15,4],'line-opacity':.75}});
  m.addLayer({id:'hecho',type:'line',source:'tramos',filter:['<=',['get','b'],0],layout:{'line-cap':'round','line-join':'round',visibility:vis},paint:{'line-color':['get','col'],'line-width':['interpolate',['linear'],['zoom'],10,3.5,15,7]}});
  m.addLayer({id:'cabeza',type:'line',source:'cabeza',layout:{'line-cap':'round',visibility:vis},paint:{'line-color':colorPend(N.pend[0]),'line-width':['interpolate',['linear'],['zoom'],10,3.5,15,7]}});
  if(modo==='nuevo'){
    var cima=document.createElement('div'); cima.innerHTML='<div style="font:800 11px system-ui;color:#0a0f1d;background:#ffd700;border-radius:8px;padding:3px 7px;box-shadow:0 2px 6px rgba(0,0,0,.45);white-space:nowrap">▲ '+Math.round(N.max)+' m</div>';
    if(D.cimaM) D.cimaM.remove(); D.cimaM=new maplibregl.Marker({element:cima.firstChild,anchor:'bottom',offset:[0,-4]}).setLngLat(N.c[N.imax]).addTo(m);
  } else if(D.cimaM){ D.cimaM.remove(); D.cimaM=null; }
  N._ini=null; crearMarcador(); pintar(0,performance.now());
}
function reiniciar(){ corriendo=false; prog=0; camB=null; Zc=null; actualizarBoton(); nota(); mapa.setStyle(capa==='sat'?SAT:CALLES,{diff:false}); mapa.once('idle',function(){ encuadrar(600); }); dibujarPerfil(); }
function encuadrar(ms){ var c=D[modo].c, b=c.reduce(function(b,p){ return [[Math.min(b[0][0],p[0]),Math.min(b[0][1],p[1])],[Math.max(b[1][0],p[0]),Math.max(b[1][1],p[1])]]; },[[180,90],[-180,-90]]); mapa.fitBounds(b,{padding:{top:90,bottom:230,left:30,right:30},pitch:modo==='nuevo'?30:0,bearing:0,duration:ms}); }

// ---------- Pistero (el mismo de la app: de espaldas, esqueleto animado) ----------
function crearMarcador(){
  if(marcador) marcador.remove();
  var A=_pistAtrasSVG(opts,{vehiculo:veh,cadencia:.68}); rig=(typeof _pistAtrasRig==='function')?_pistAtrasRig(opts,veh):null;
  var div=document.createElement('div');
  div.innerHTML='<div class="sbv-rider atras">'+(modo==='nuevo'?'<div class="sbv-sombra"></div>':'')+'<div class="sbv-bici"><div class="sbv-incl"><div class="sbv-cuerpo">'+(rig?rig.svg:A.svg)+'</div><div class="sbv-cabeza" style="left:'+A.cab.l+'%;top:'+A.cab.t+'%;width:'+A.cab.w+'%;height:'+A.cab.h+'%">'+(typeof _pistNucaSVG==='function'?_pistNucaSVG(opts):'')+'</div></div></div></div>';
  var el=div.firstChild;
  // HOY: maplibregl.Marker({element}) => anchor 'center' por defecto (doc. MapLibre MarkerOptions)
  // PROPUESTA: anchor 'bottom' y bajar 4 % de la caja (las ruedas tocan el suelo en y=96 %)
  marcador=new maplibregl.Marker(modo==='nuevo'?{element:el,anchor:'bottom',offset:[0,Math.round(88*.04)]}:{element:el}).setLngLat(D[modo].c[0]).addTo(mapa);
  cajas={incl:el.querySelector('.sbv-incl'),cabeza:el.querySelector('.sbv-cabeza'),cuerpo:el.querySelector('.sbv-cuerpo')};
  cajas.cabTop=parseFloat(cajas.cabeza.style.top)||3.5;
  if(rig) rig.bind(cajas.cuerpo);
}

// ---------- animación ----------
function arrancar(){ var L=D[modo]; camB=rumbo(enD(L,0).p,enD(L,Math.min(L.total,150)).p); requestAnimationFrame(frame); }
function frame(ts){
  if(!corriendo) return;
  var dt=ultimo===null?16:Math.min(100,ts-ultimo); ultimo=ts;
  var L=D[modo], g=0;
  if(modo==='nuevo'){ var k=enD(L,prog*L.total).i; g=L.pend[k]||0; }
  // ~5 s por km (como hoy) pero más lento en subida y más rápido en bajada
  var ritmo=Math.max(.45,Math.min(1.6,1-g*6));
  prog=Math.min(1,prog+dt/(L.total/1000*5000)*ritmo*velX);
  pintar(dt,ts);
  if(prog>=1){ corriendo=false; actualizarBoton(); encuadrar(1600); return; }
  requestAnimationFrame(frame);
}
function pintar(dt,ts,mover){ mover=mover||corriendo;
  var L=D[modo], d=prog*L.total, q=enD(L,d), p=q.p;
  marcador.setLngLat(p);
  var b=rumbo(enD(L,Math.max(0,d-30)).p,enD(L,Math.min(L.total,d+140)).p);
  camB=camB===null?b:(camB+giro(camB,b)*Math.min(1,(dt||16)/700)+360)%360;
  var gp=null, vp=18;
  if(modo==='nuevo'){
    var N=L, i=q.i, h=N.alt[i]+(N.alt[i+1]-N.alt[i])*q.f; gp=N.pend[i];
    var ini=N.run[i]!==undefined?N.run[i]:i;
    if(N._ini!==ini){ mapa.setFilter('hecho',['<=',['get','b'],ini]); mapa.setPaintProperty('cabeza','line-color',colorPend(N.pend[ini+1])); N._ini=ini; }
    mapa.getSource('cabeza').setData({type:'Feature',geometry:{type:'LineString',coordinates:N.c.slice(ini,i+1).concat([p])}});
    $('dAlt').innerHTML=Math.round(h)+'<i>m</i>'; $('dPend').innerHTML=(gp>=0?'':'−')+fmt(Math.abs(gp*100),1)+'<i>%</i>'; $('dSub').innerHTML=Math.round(N.sub[i])+'<i>m</i>';
    var zT=15.1+(gp>.05?.25:0)-(gp<-.04?.3:0); Zc=Zc===null?zT:Zc+(zT-Zc)*(1-Math.exp(-(dt||16)/1400));
    if(mover) mapa.jumpTo({center:p,zoom:Zc,pitch:66,bearing:camB,padding:{top:Math.round(mapa.getContainer().clientHeight*.30),bottom:200,left:0,right:0}});
  } else {
    $('dAlt').innerHTML='–<i>m</i>'; $('dPend').innerHTML='–<i>%</i>'; $('dSub').innerHTML='–<i>m</i>';
    if(mover) mapa.jumpTo({center:p,zoom:16.2,pitch:58,bearing:camB,padding:{top:Math.round(mapa.getContainer().clientHeight*.32),bottom:0,left:0,right:0}});
  }
  $('dKm').innerHTML=fmt(d/1000,1)+'<i>km</i>';
  // cuerpo: postura según pendiente (mismo _pistGestoEsfuerzo de la app) + inclinación en curva
  var G=(typeof _pistGestoEsfuerzo==='function')?_pistGestoEsfuerzo(gp,vp):{cad:.68,rapido:0,pose:''};
  var gi=giro(rumbo(enD(L,Math.max(0,d-20)).p,enD(L,d+25).p),rumbo(enD(L,d+25).p,enD(L,Math.min(L.total,d+70)).p));
  incl+=(Math.max(-14,Math.min(14,gi*.22))-incl)*Math.min(1,(dt||16)/300);
  var rr=rig?rig.update({cad:G.cad,pose:G.pose||'',sway:G.sway,rapido:G.rapido},dt||16):{sway:0,cabezaDy:0,cabezaRot:0};
  cajas.incl.style.transform='rotate('+(incl+rr.sway).toFixed(2)+'deg)';
  if(rig){ cajas.cabeza.style.top=(cajas.cabTop+rr.cabezaDy/110*100).toFixed(2)+'%'; cajas.cabeza.style.rotate=rr.cabezaRot.toFixed(2)+'deg'; }
  dibujarPerfil();
}

// ---------- perfil de altura (pintado por pendiente, avanza con Pistero) ----------
function dibujarPerfil(){
  var cv=$('cv'), N=D.nuevo; if(!N||!N.alt) return;
  var dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight; if(cv.width!==W*dpr){ cv.width=W*dpr; cv.height=H*dpr; }
  var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
  var lo=N.min-8, hi=N.max+12, top=16, bot=H-14, X=function(d){ return d/N.total*W; }, Y=function(h){ return bot-(h-lo)/(hi-lo)*(bot-top); };
  var pd=prog*N.total;
  // relleno por columnas, color de la pendiente; lo que falta, apagado
  for(var i=1;i<N.c.length;i++){ var x0=X(N.cum[i-1]), x1=X(N.cum[i]); c.fillStyle=colorPend(N.pend[i]); c.globalAlpha=(N.cum[i]<=pd?.85:.22); c.beginPath(); c.moveTo(x0,bot); c.lineTo(x0,Y(N.alt[i-1])); c.lineTo(x1,Y(N.alt[i])); c.lineTo(x1,bot); c.closePath(); c.fill(); }
  c.globalAlpha=1; c.strokeStyle='rgba(255,255,255,.9)'; c.lineWidth=1.4; c.beginPath(); N.alt.forEach(function(h,k){ var x=X(N.cum[k]), y=Y(h); if(k) c.lineTo(x,y); else c.moveTo(x,y); }); c.stroke();
  c.fillStyle='#9fb3c8'; c.font='600 10px system-ui'; c.fillText(Math.round(N.max)+' m',4,11); c.fillText(Math.round(N.min)+' m',4,H-3); c.textAlign='right'; c.fillText(fmt(N.total/1000,1)+' km',W-4,H-3); c.textAlign='left';
  if(modo==='hoy'){ c.fillStyle='rgba(10,15,29,.72)'; c.fillRect(0,0,W,H); c.fillStyle='#e8edf6'; c.font='700 12px system-ui'; c.textAlign='center'; c.fillText('Hoy el sobrevuelo no muestra la altura',W/2,H/2+4); c.textAlign='left'; return; }
  var k=enD(N,pd), h=N.alt[k.i]+(N.alt[k.i+1]-N.alt[k.i])*k.f, x=X(pd), y=Y(h);
  c.strokeStyle='rgba(255,255,255,.5)'; c.setLineDash([3,3]); c.beginPath(); c.moveTo(x,top-6); c.lineTo(x,bot); c.stroke(); c.setLineDash([]);
  c.fillStyle='#fc4c02'; c.strokeStyle='#fff'; c.lineWidth=2; c.beginPath(); c.arc(x,y,5,0,7); c.fill(); c.stroke();
}
})();
