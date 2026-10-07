/* Prototipo del sobrevuelo 3D (propuesta 2026-10-06/07). NO es código de la app todavía.
   "Hoy" = lo que hace sobrevuelo-viaje.js en main. "Propuesta":
   1) línea PEGADA al camino (traza limpiada + Valhalla trace_route, ver gen-datos.mjs)
   2) Pistero con las ruedas sobre la línea (anchor 'bottom'; hoy queda centrado = corrido)
   3) relieve 3D real (DEM Mapterhorn, el mismo del "Video 3D" de rutas.js) y perfil de altura
   4) HUELLA NEÓN (técnica "firefly"): halos difuminados del color de la pendiente + núcleo
      blanco; respira, chispa bajo las ruedas y un destello que corre por lo pedaleado
   5) DIRECTOR DE TOMAS: aérea, persecución, lateral, contrapicado en bajada y giro en la cima,
      elegidas según lo que da la ruta; primeros planos de la cara de Pistero
   6) CARAS según la ruta (aprieta, cansado, agotado, adrenalina, feliz, orgulloso…)
   7) MASCOTA: el pudú (arte de feature/mascotas) corre a su lado, se queda atrás en las
      subidas, se adelanta en las bajadas y salta en la cima. */
(function(){
var RUTA={nombre:'Futrono → Llifén'};
var LIVIANO=!/[?&]completo/.test(location.search);
// --- precarga del recorrido de la cámara (como preloadOnly de Mapbox, que MapLibre no trae) ---
// Se piden por adelantado los mosaicos que la cámara va a necesitar (satélite o calles); quedan en la caché
// del navegador (Esri: max-age 1 día; OpenFreeMap y Mapterhorn también cacheables, con CORS) y MapLibre los
// toma de ahí al instante. Como un reproductor de video: carga ~3 km por delante y, si la red se atrasa,
// el vuelo frena suave en vez de mostrar el mapa cortado.
var PRE={hechos:{}, cola:[], activos:0, max:6, pendientes:{}, total:0, listos:0};
function tileXY(c,z){ var n=Math.pow(2,z), s2=Math.sin(c[1]*rad); return [Math.floor((c[0]+180)/360*n), Math.floor((0.5-Math.log((1+s2)/(1-s2))/(4*Math.PI))*n)]; }
function plantillaTiles(){ if(capa==='sat') return {url:SAT.sources.sat.tiles[0], d256:1, zmax:19};
  var src=mapa&&mapa.getSource('openmaptiles'); return (src&&src.tiles&&src.tiles[0])?{url:src.tiles[0], d256:0, zmax:14}:null; }
function tilesTramo(d0,d1){
  var N=D.nuevo, T=plantillaTiles(); if(!T||!N) return;
  // anillos según la distancia a la cámara: cerca el zoom de la toma, lejos (hacia el horizonte) zooms menores
  var ANILLOS=[[-250,500,320,0],[500,1600,750,-1],[1600,4500,1800,-2],[4500,9000,3600,-3]];
  for(var d=Math.max(0,d0); d<=Math.min(N.total,d1); d+=120){
    var p=enD(N,d).p, b=rumboEn(N,d), zc=Math.round(TOMAS[tomaEn(N,d).t].z)+T.d256;
    ANILLOS.forEach(function(A){ var z=Math.min(T.zmax,zc+A[3]), tam=40075016*Math.cos(p[1]*rad)/Math.pow(2,z), paso=Math.max(80,tam/2);
      for(var f=A[0]; f<=A[1]; f+=paso) for(var l=-A[2]; l<=A[2]; l+=paso){ var q=mover(mover(p,b,f),(b+90)%360,l), t=tileXY(q,z), u=T.url.replace('{z}',z).replace('{x}',t[0]).replace('{y}',t[1]);
        if(!PRE.hechos[u]){ PRE.hechos[u]=1; PRE.pendientes[u]=d; PRE.cola.push(u); PRE.total++; } } });
  }
  bombear();
}
function bombear(){ while(PRE.activos<PRE.max && PRE.cola.length){ (function(u){ PRE.activos++;
  fetch(u,{mode:'cors',credentials:'omit'}).catch(function(){}).then(function(){ PRE.activos--; PRE.listos++; delete PRE.pendientes[u]; bombear(); }); })(PRE.cola.shift()); } }
// ¿quedan mosaicos sin llegar para el tramo hasta d? (cuántos)
function faltanHasta(d){ var n=0; for(var u in PRE.pendientes) if(PRE.pendientes[u]<=d) n++; return n; }
var cargaInicial=null, ultPre=0, ultimoPinto=null; // demo: en la app = r.nombreRuta
var LADO_SVG=1; // _pistBiciSVG dibuja la bici mirando a la derecha
var DEM_TILE='https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
var SAT={version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'© Esri, Maxar, Earthstar Geographics'}},layers:[{id:'sat',type:'raster',source:'sat',paint:{'raster-saturation':-.08,'raster-contrast':.06}}]};
var CALLES='https://tiles.openfreemap.org/styles/liberty';
var R=6371000, rad=Math.PI/180, reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function hav(a,b){ var dLa=(b[1]-a[1])*rad, dLo=(b[0]-a[0])*rad, s=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dLo/2)*Math.sin(dLo/2); return 2*R*Math.asin(Math.min(1,Math.sqrt(s))); }
function rumbo(a,b){ var y=Math.sin((b[0]-a[0])*rad)*Math.cos(b[1]*rad), x=Math.cos(a[1]*rad)*Math.sin(b[1]*rad)-Math.sin(a[1]*rad)*Math.cos(b[1]*rad)*Math.cos((b[0]-a[0])*rad); return (Math.atan2(y,x)/rad+360)%360; }
function giro(de,a){ return ((a-de+540)%360)-180; }
function mover(p,brg,m){ var b=brg*rad; return [p[0]+Math.sin(b)*m/(111320*Math.cos(p[1]*rad)), p[1]+Math.cos(b)*m/110540]; }
function $(id){ return document.getElementById(id); }
function fmt(n,d){ return n.toFixed(d).replace('.',','); }
function suave(a,b,dt,tau){ return a+(b-a)*(1-Math.exp(-dt/tau)); }

// ---------- datos ----------
function linea(coords){ var cum=[0]; for(var i=1;i<coords.length;i++) cum.push(cum[i-1]+hav(coords[i-1],coords[i])); return {c:coords,cum:cum,total:cum[cum.length-1]}; }
function densificar(c,paso){ var out=[c[0]]; for(var i=1;i<c.length;i++){ var d=hav(c[i-1],c[i]), k=Math.max(1,Math.ceil(d/paso)); for(var j=1;j<=k;j++) out.push([c[i-1][0]+(c[i][0]-c[i-1][0])*j/k, c[i-1][1]+(c[i][1]-c[i-1][1])*j/k]); } return out; }
function enD(L,d){ var c=L.c, cum=L.cum, k=1, lo=1, hi=c.length-1; d=Math.max(0,Math.min(L.total,d)); while(lo<hi){ var m=(lo+hi)>>1; if(cum[m]<d) lo=m+1; else hi=m; } k=lo; var f=Math.min(1,Math.max(0,(d-cum[k-1])/Math.max(1e-9,cum[k]-cum[k-1]))); return {p:[c[k-1][0]+(c[k][0]-c[k-1][0])*f, c[k-1][1]+(c[k][1]-c[k-1][1])*f], i:k-1, f:f}; }
function rumboEn(L,d){ return rumbo(enD(L,d-40).p,enD(L,d+160).p); }
// limpieza que hace HOY la app (_sbvLimpiar: fuera saltos > 22 m/s)
function limpiarHoy(pts){ var out=[]; pts.forEach(function(p){ var u=out[out.length-1]; if(u && p.t>u.t && hav([u.lon,u.lat],[p.lon,p.lat])/((p.t-u.t)/1000)>22) return; out.push(p); }); return out; } /* sin horas no se filtra (antes dividía por 0 y se quedaba con 1 punto) */

// ---------- relieve real: tiles terrarium de Mapterhorn decodificados en un canvas ----------
var demCache={}, DEMS={}, EXAG=1.2; // 1,2: con 1,35 las laderas del DEM de 30 m se estiraban y se veían defectos
// precarga las tiles alrededor de la ruta para poder preguntar la altura de cualquier punto sin esperar
function demPrecargar(coords){ var Z=12, n=4096, lo1=1e9,lo2=-1e9,la1=1e9,la2=-1e9; coords.forEach(function(c){ lo1=Math.min(lo1,c[0]); lo2=Math.max(lo2,c[0]); la1=Math.min(la1,c[1]); la2=Math.max(la2,c[1]); });
  var tx=function(lo){ return Math.floor((lo+180)/360*n); }, ty=function(la){ var s=Math.sin(la*rad); return Math.floor((0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n); };
  var M=0.03, ps=[]; for(var x=tx(lo1-M);x<=tx(lo2+M);x++) for(var y=ty(la2+M);y<=ty(la1-M);y++) (function(x,y){ ps.push(demTile(Z,x,y).then(function(T){ DEMS[x+','+y]=T; }).catch(function(){})); })(x,y);
  return Promise.all(ps); }
function elevAt(c){ var n=4096, X=(c[0]+180)/360*n, s=Math.sin(c[1]*rad), Y=(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n, T=DEMS[Math.floor(X)+','+Math.floor(Y)]; if(!T) return null;
  var w=T.w, px=(X-Math.floor(X))*w-.5, py=(Y-Math.floor(Y))*w-.5, x0=Math.max(0,Math.min(w-2,Math.floor(px))), y0=Math.max(0,Math.min(w-2,Math.floor(py))), ax=Math.min(1,Math.max(0,px-x0)), ay=Math.min(1,Math.max(0,py-y0));
  var e=function(x,y){ var i=(y*w+x)*4; return T.d[i]*256+T.d[i+1]+T.d[i+2]/256-32768; };
  return (e(x0,y0)*(1-ax)+e(x0+1,y0)*ax)*(1-ay)+(e(x0,y0+1)*(1-ax)+e(x0+1,y0+1)*ax)*ay; }
// de qué lado de la ruta está el valle (más bajo): ahí va la cámara, para no quedar mirando contra la ladera.
// +1 = valle a la izquierda (la cámara se corre a la izquierda y mira un poco a la derecha), -1 = a la derecha
function ladoBajo(N){ var raw=new Array(N.c.length).fill(0);
  for(var i=0;i<N.c.length;i+=4){ var b=rumbo(N.c[Math.max(0,i-4)],N.c[Math.min(N.c.length-1,i+4)]), eL=0, eR=0, k=0;
    [120,250,400].forEach(function(m){ var l=elevAt(mover(N.c[i],(b+270)%360,m)), r2=elevAt(mover(N.c[i],(b+90)%360,m)); if(l!==null&&r2!==null){ eL+=l; eR+=r2; k++; } });
    var v=k?(eR-eL)/k:0; for(var j=i;j<Math.min(N.c.length,i+4);j++) raw[j]=v; }
  // suavizado ±400 m para que no cambie de lado a cada rato
  N.bajo=raw.map(function(_,i){ var s=0, a=i, b=i; while(a>0&&N.cum[i]-N.cum[a]<400) a--; while(b<raw.length-1&&N.cum[b]-N.cum[i]<400) b++; for(var q=a;q<=b;q++) s+=raw[q]; return s>=0?1:-1; }); }
// la cámara de MapLibre está a cameraToCenterDistance px del centro (fov 36,87°); con eso se ubica en el mundo
// y se revisa que ni ella ni la línea de vista a Pistero atraviesen el cerro. Devuelve la inclinación segura.
function pitchSeguro(p,bear,z,deseado){
  var H=mapa.getContainer().clientHeight, mpp=40075016.686*Math.cos(p[1]*rad)/(512*Math.pow(2,z)), dist=0.5/Math.tan(0.6435/2)*H*mpp, e0=elevAt(p);
  if(e0===null) return deseado; e0*=EXAG;
  for(var pt=deseado; pt>=30; pt-=3){
    var hz=dist*Math.sin(pt*rad), alt=e0+dist*Math.cos(pt*rad), cp=mover(p,(bear+180)%360,hz), ec=elevAt(cp), ok=ec===null||alt>ec*EXAG+35;
    for(var k=1;ok&&k<12;k++){ var f=k/12, q=[cp[0]+(p[0]-cp[0])*f, cp[1]+(p[1]-cp[1])*f], eq=elevAt(q); if(eq!==null && eq*EXAG+8>alt+(e0+2-alt)*f) ok=false; }
    if(ok) return pt; }
  return 30; }
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
// paleta neón (eléctrica): plano verde lima, 3-6 % amarillo, 6-9 % naranjo, +9 % rojo-fucsia, bajada cian
function colorPend(g){ return g<-0.03?'#22d3ff':g<0.03?'#39ff88':g<0.06?'#ffe14d':g<0.09?'#ff8a1f':'#ff2d6f'; }
function neon(hex,k){ var n=parseInt(hex.slice(1),16), f=function(v){ return Math.round(v+(255-v)*k); }; return 'rgb('+f(n>>16&255)+','+f(n>>8&255)+','+f(n&255)+')'; }

// ---------- lectura de la ruta: subidas, bajadas, cima → momentos y plan de tomas ----------
function tramosDe(N,cond,minLargo){ var out=[], a=-1; for(var i=0;i<N.c.length;i++){ var ok=cond(N.pend[i]); if(ok&&a<0) a=i; if((!ok||i===N.c.length-1)&&a>=0){ var b=ok?i:i-1; if(N.cum[b]-N.cum[a]>=minLargo) out.push({a:a,b:b,d0:N.cum[a],d1:N.cum[b],gan:N.alt[b]-N.alt[a]}); a=-1; } } return out; }
function durTxt(ms){ var m=Math.round(ms/60000), h=Math.floor(m/60); return h?h+' h '+(m%60)+' min':m+' min'; }
function planear(N){
  var T=N.total, subidas=tramosDe(N,function(g){ return g>0.035; },150), bajadas=tramosDe(N,function(g){ return g<-0.035; },150);
  subidas.forEach(function(s){ var im=s.a; for(var i=s.a;i<=s.b;i++) if(N.pend[i]>N.pend[im]) im=i; s.dura=N.cum[im]; s.gmax=N.pend[im]; });
  // 1) tomas por tramo: la de cada evento dura lo necesario para que la cámara alcance a asentarse
  var P=[], lado=1, k=0; function toma(d0,d1,t,x){ P.push(Object.assign({d0:Math.max(0,d0),d1:Math.min(T,d1),t:t},x||{})); }
  // largos de toma medidos en TIEMPO de vuelo (en 100 km a 80 s, 900 m eran 0,7 s por toma): m/s del vuelo
  var mps=T/durVuelo()*1000, U=function(seg){ return seg*mps; }, BASE=Math.max(900,U(6)), INI=Math.max(600,U(3.5));
  for(var d=INI; d<T; d+=BASE){ k++; toma(d,d+BASE,k%3===0?'aerea':k%3===2?'paralelo':'persecucion',{lado:(lado=-lado),base:true}); }
  subidas.forEach(function(s,ix){ if(s.gan<8) return; toma(s.d0-Math.max(150,U(1)),s.d0+Math.max(420,U(2.5)),'subida'); toma(s.d0+Math.max(420,U(2.5)),Math.max(s.d1,s.d0+Math.max(1000,U(6))),'lateral',{lado:ix%2?1:-1}); });
  bajadas.forEach(function(b){ if(-b.gan<8) return; toma(b.d0-60,Math.max(b.d1,b.d0+Math.max(650,U(4))),'bajada'); });
  toma(0,INI,'aerea');
  // 2) secuencia final: se recorre cada 25 m y se funden las tomas de menos de 550 m (~3 s a ×1) con la anterior
  var seq=[], MIN=Math.max(550,U(3.5));
  var PASO=Math.max(25,mps*.1);
  for(var x=0; x<T; x+=PASO){ var e=null,b=null; P.forEach(function(p){ if(x>=p.d0&&x<p.d1){ if(p.base) b=p; else e=p; } }); var t=e||b||{t:'persecucion',lado:1}, u=seq[seq.length-1];
    if(u && u.t===t.t && (u.lado||1)===(t.lado||1)) u.d1=x+PASO; else seq.push({t:t.t,lado:t.lado||1,ev:!!e,d0:x,d1:x+PASO}); }
  // las tomas de evento mandan: una normal corta se funde con la vecina; nunca se pierde una subida/bajada
  var corta=function(q){ return q.d1-q.d0<MIN-1; }, cambio=true;
  var vueltas=0; while(cambio){ cambio=false; if(++vueltas>4000){ console.warn('[sobrevuelo] fusión de tomas sin terminar', seq.length); break; }
    for(var j=0;j<seq.length;j++){ var q=seq[j]; if(!corta(q)) continue;
      var A=seq[j-1], B=seq[j+1];
      if(!q.ev){ if(A){ A.d1=q.d1; } else if(B){ B.d0=q.d0; } else continue; seq.splice(j,1); cambio=true; break; }
      if(A && A.d1-A.d0>MIN+1){   /* puede ceder cualquier vecina que tenga tiempo de sobra (también una de evento) */
         var falta=Math.min(MIN-(q.d1-q.d0),A.d1-A.d0-MIN); if(falta>1){   /* >1 m: con decimales flotantes quedaba quitando trocitos para siempre */ q.d0-=falta; A.d1-=falta; cambio=true; break; } }
      if(B && B.d1-B.d0>MIN+1){ var f2=Math.min(MIN-(q.d1-q.d0),B.d1-B.d0-MIN); if(f2>1){ q.d1+=f2; B.d0+=f2; cambio=true; break; } }
      if(A){ A.d1=q.d1; seq.splice(j,1); cambio=true; break; }   // dos eventos pegados: queda el primero
    }
    for(var j2=1;j2<seq.length;j2++) if(seq[j2].t===seq[j2-1].t && seq[j2].lado===seq[j2-1].lado){ seq[j2-1].d1=seq[j2].d1; seq.splice(j2,1); j2--; }
  }
  // 3) momentos (primeros planos): candidatos con prioridad; máx. 7 y separados ~1/9 del viaje.
  //    El texto dice lo que la pantalla NO muestra (pendiente y altura ya están en los datos de abajo).
  var C=[], FS=[['cansado','¡Uf, cómo sube!'],['enojado','¡Aprieta, aprieta!'],['cansado','Piernas, no me fallen'],['enojado','¡Vamos que se puede!']],
      FA=['¡No doy más!','Me falta el aire…','Un pedal más… y otro'], FB=[['adrenalina','¡Bajadaaa!'],['emocionado','¡Wiiii!'],['sorprendido','¡Qué velocidad!']];
  var falta=function(m){ return m<40?'¡ya casi arriba!':'quedan '+(m>=1000?fmt(m/1000,1)+' km':Math.round(m/10)*10+' m')+' de cuesta'; };
  subidas.forEach(function(s){ if(s.gan<8) return; var dura=s.gmax>.08||N.sub[s.b]>160; C.push({d:s.dura,pri:5+Math.min(4,s.gan/15),dura:dura,txt:'',sub:falta(s.d1-s.dura),dur:2200,tipo:'sube'}); });
  bajadas.forEach(function(b){ if(-b.gan<10) return; C.push({d:b.d0+60,pri:4+Math.min(3,-b.gan/20),txt:'',sub:'por '+(b.d1-b.d0>=1000?fmt((b.d1-b.d0)/1000,1)+' km':Math.round((b.d1-b.d0)/10)*10+' m'),dur:1900,tipo:'baja'}); });
  if(N.vel){ var iv=0; for(var q=0;q<N.vel.length;q++) if(N.vel[q]>N.vel[iv]) iv=q; if(N.vel[iv]>=30) C.push({d:N.cum[iv],pri:7.5,expr:'adrenalina',txt:'¡Volando!',sub:Math.round(N.vel[iv])+' km/h, lo más rápido del viaje',dur:1900}); N.vMax={v:N.vel[iv],d:N.cum[iv]}; }
  C.push({d:30,pri:9,expr:'contento',txt:'¡Partimos!',sub:fmt(T/1000,1)+' km y +'+Math.round(N.sub[N.sub.length-1])+' m por delante',dur:2000});
  C.push({d:N.cum[N.imax],pri:10,expr:'orgulloso',txt:'¡Cima!',sub:'lo más alto del viaje',dur:4200,cima:true,pose:'puno'});
  C.push({d:T,pri:10,expr:'contento',txt:'¡Llegamos!',sub:D.dur?'en '+durTxt(D.dur):'',dur:2600,pose:'brazos',fin:true});
  C.sort(function(a,b){ return b.pri-a.pri; });
  var hueco=T/9, M=[]; C.forEach(function(c){ if(M.length<7 && M.every(function(m){ return Math.abs(m.d-c.d)>=hueco; })) M.push(c); });
  // las pausas reales se muestran SIEMPRE (con su parada), aunque haya otro momento cerca
  (N.pausas||[]).forEach(function(p){ M.push({d:p.d,pri:9,expr:'pensando',txt:'Pausa para respirar',sub:durTxt(p.dur),dur:2400,pausa:true}); });
  M.sort(function(a,b){ return a.d-b.d; });
  // frases y caras sin repetir; el cansancio se acumula (cuesta dura o mucho subido → agotado)
  var ns=0, na=0, nb=0, prev='';
  M.forEach(function(m){
    if(m.tipo==='sube'){ var f=m.dura?['agotado',FA[na++%FA.length]]:FS[ns++%FS.length]; if(f[0]===prev) f=FS[ns++%FS.length]; m.expr=f[0]; m.txt=f[1]; }
    if(m.tipo==='baja'){ var g=FB[nb++%FB.length]; if(g[0]===prev) g=FB[nb++%FB.length]; m.expr=g[0]; m.txt=g[1]; }
    prev=m.expr; });
  // resumen: lo que el viaje deja (sin repetir lo que ya se vio en el panel durante el vuelo)
  var sMax=null; subidas.forEach(function(x){ if(!sMax||x.gan>sMax.gan) sMax=x; });
  var bMax=null; bajadas.forEach(function(x){ if(!bMax||x.gan<bMax.gan) bMax=x; });
  var iP=0; for(var ip=0;ip<N.pend.length;ip++) if(N.pend[ip]>N.pend[iP]) iP=ip;
  var kmSube=0; for(var ik=1;ik<N.c.length;ik++) if(N.pend[ik]>0.03) kmSube+=N.cum[ik]-N.cum[ik-1];
  N.resumen={dist:T, dur:D.dur||0, sub:N.sub[N.sub.length-1], altMax:N.max, pendMax:N.pend[iP], dPendMax:N.cum[iP], kmSube:kmSube,
    sMax:sMax&&{gan:sMax.gan,d0:sMax.d0,d1:sMax.d1}, bMax:bMax&&{gan:bMax.gan,d0:bMax.d0}, dCima:N.cum[N.imax]};
  N.plan=P; N.seq=seq; N.momentos=M; N.subidas=subidas; N.bajadas=bajadas;
}
// la toma vigente: las de eventos ganan a las de base
function tomaEn(N,d){ for(var i=0;i<N.seq.length;i++) if(d<N.seq[i].d1) return N.seq[i]; return N.seq[N.seq.length-1]; }
// parámetros de cada toma: giro de la cámara respecto del avance, zoom, inclinación y altura de Pistero en pantalla
var TOMAS={  // off = giro de la cámara respecto del avance (siempre hacia el valle) · y = altura de Pistero en la zona libre
  persecucion:{off:0,z:15.8,pitch:64,y:.66},
  aerea:{off:12,z:14.9,pitch:54,y:.6},
  paralelo:{off:28,z:16.1,pitch:64,y:.66},  // tres cuartos: se ve el costado y hacia dónde va
  subida:{off:0,z:16.2,pitch:58,y:.7},      // detrás y un poco alta: se ve la cuesta delante
  lateral:{off:36,z:16.3,pitch:64,y:.66},   // tres cuartos cerrado en la subida
  bajada:{off:14,z:16.2,pitch:66,y:.64},
  cima:{off:0,z:15.6,pitch:58,y:.62}
};
var TRANS=reduce?4200:2800; // ms de cada cambio de plano (curva suave de entrada y salida)
// zona libre del mapa (entre la barra de arriba y el panel de abajo) y dónde va Pistero dentro de ella (0 = arriba, 1 = abajo)
function zonaLibre(){ var H=mapa.getContainer().clientHeight, pn=document.querySelector('.panel'), br=document.querySelector('.barra');
  var abajo=pn?Math.round(pn.getBoundingClientRect().height)-8:200, arriba=br?Math.round(br.getBoundingClientRect().bottom)+8:70; return {H:H,arriba:arriba,abajo:abajo,libre:Math.max(120,H-arriba-abajo)}; }
// padding para que el punto quede a la fracción y de la zona libre (MapLibre centra el punto en el área con padding)
function paddingPara(y){ var Z=zonaLibre(), py=Z.arriba+Z.libre*y, top=Math.max(0,Math.round(2*py-(Z.H-Z.abajo))); return {top:top,bottom:Z.abajo,left:0,right:0}; }
function suaveS(x){ x=Math.max(0,Math.min(1,x)); return x*x*x*(x*(x*6-15)+10); } // smootherstep

// ---------- caras: las 10 de la app + 3 nuevas armadas sobre su misma cara ----------
// ===== Personajes: el sobrevuelo pide un ESTADO y el personaje entrega su cara para ese estado =====
// Lista completa y qué pasa en la ruta para cada uno: EXPRESIONES-PERSONAJES.md. Un personaje = {id, cara(estado)}.
// Si a un personaje le falta un estado, se usa el más cercano de RESPALDO (nunca queda sin cara).
var ESTADOS=['feliz','contento','guino','preocupado','cansado','enojado','agotado','emocionado','adrenalina','sorprendido','orgulloso','pensando'];
var RESPALDO={agotado:'cansado',enojado:'cansado',adrenalina:'emocionado',orgulloso:'contento',guino:'feliz',sorprendido:'emocionado',preocupado:'pensando',pensando:'feliz',contento:'feliz',cansado:'feliz',emocionado:'feliz'};
var PERSONAJES={ pistero:{id:'pistero', tiene:function(e){ return true; }, cara:function(e){ return caraPistero(e); }} };
PERSONAJES.ciber={id:'ciber', nombre:'Pistero Cyberpunk', capas:true, tiene:function(e){ return ESTADOS.indexOf(e)>=0; },
  crear:function(host){ return crearCiberCapas(host,'personajes/ciber-capa-casco.jpg','personajes/ciber-capa-cabeza.jpg').then(function(api){
    api.svg.setAttribute('viewBox','458 104 460 460'); return api; }); }};   // encuadre: casco + visor + boca dentro del círculo
PERSONAJES.orbe={id:'orbe', nombre:'Pistero Orbe', capas:true, tiene:function(e){ return ESTADOS.indexOf(e)>=0; },
  crear:function(host){ return crearOrbeCapas(host,'personajes/capa-casco.jpg','personajes/capa-orbe.jpg').then(function(api){
    api.svg.setAttribute('viewBox','212 318 600 600'); return api; }); }};   // encuadre: casco con su franja + orbe con la cara de luz
PERSONAJES.slime={id:'slime', nombre:'Pistero Slime', capas:true, tiene:function(e){ return ESTADOS.indexOf(e)>=0; },
  crear:function(host){ return crearSlimeCapas(host,'personajes/slime-capa-casco.jpg','personajes/slime-capa-cuerpo.jpg').then(function(api){
    api.svg.setAttribute('viewBox','463 150 450 450'); return api; }); }};
PERSONAJES.vinilo={id:'vinilo', nombre:'Pistero Androide', capas:true, tiene:function(e){ return ESTADOS.indexOf(e)>=0; },
  crear:function(host){ return crearViniloCapas(host,'personajes/vinilo-capa-casco.jpg','personajes/vinilo-capa-cabeza.jpg').then(function(api){
    api.svg.setAttribute('viewBox','463 170 450 450'); return api; }); }};
// siguen (desde sus ramas): Vidrio (feature/armario-piezas) y cada mascota (feature/mascotas)
var personaje=PERSONAJES[(new URLSearchParams(location.search)).get('p')||'ciber']||PERSONAJES.pistero;
function cara(expr){ var e=expr, n=0; while(!personaje.tiene(e) && RESPALDO[e] && n++<4) e=RESPALDO[e]; return personaje.cara(e); }
function caraPistero(expr){
  if(typeof _pistoDe!=='function') return '';
  function mas(base,extra){ var s=_pistoDe(opts,base); return s.replace(/<\/svg>\s*$/,extra+'</svg>'); }
  var gota=function(x,y,s){ return '<path d="M'+x+' '+y+' q'+(2.6*s)+' '+(4.6*s)+' 0 '+(7.4*s)+' q'+(-2.6*s)+' '+(-2.8*s)+' 0 '+(-7.4*s)+'z" fill="#7fd0ff" stroke="#3b9fd6" stroke-width=".6"/>'; };
  if(expr==='agotado') return mas('cansado','<ellipse cx="30" cy="71" rx="7" ry="4" fill="#ff6b81" opacity=".55"/><ellipse cx="70" cy="71" rx="7" ry="4" fill="#ff6b81" opacity=".55"/><ellipse cx="50" cy="75" rx="5.2" ry="4.6" fill="#5a2f1a"/><path d="M46.5 77 Q50 82.5 53.5 77 Z" fill="#ff7a90"/>'+gota(20,52,1)+gota(83,49,.8)+'<path d="M16 40 q-4 -3 -2 -8 M86 36 q4 -3 2 -8" stroke="#94a3b8" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
  if(expr==='adrenalina') return mas('emocionado','<ellipse cx="30" cy="71" rx="6.5" ry="3.6" fill="#ff6b81" opacity=".5"/><ellipse cx="70" cy="71" rx="6.5" ry="3.6" fill="#ff6b81" opacity=".5"/><g stroke="#e0f2fe" stroke-width="2" stroke-linecap="round" opacity=".95"><path d="M2 56 L13 56"/><path d="M0 64 L11 64"/><path d="M3 72 L12 72"/><path d="M88 56 L99 56"/><path d="M89 64 L100 64"/></g>');
  if(expr==='orgulloso') return mas('contento','<g fill="#ffd700" stroke="#b45309" stroke-width=".6"><path d="M12 30 l2 5 5 .6 -4 3 1.3 5 -4.3 -2.8 -4.3 2.8 1.3 -5 -4 -3 5 -.6z"/><path d="M87 24 l1.5 3.8 3.8 .4 -3 2.3 1 3.8 -3.3 -2.1 -3.3 2.1 1 -3.8 -3 -2.3 3.8 -.4z"/></g>');
  return _pistoDe(opts,expr);
}
// qué cara pone según lo que da la ruta (pendiente, cuánto lleva subido en esta cuesta, bajada)
function caraSegun(g,ganCuesta,gAdelante,act,x){
  x=x||{};
  if(x.faltan!=null && x.faltan<120) return 'contento';                                // llegando: alegría aunque el final suba
  if(x.cima) return 'orgulloso';
  if(x.pausa) return 'pensando';                                                        // parado: respira y mira alrededor
  if(x.vel!=null && x.vel>38 && g<0.02) return 'adrenalina';                          // velocidad real alta
  if(x.vel!=null && x.vel>28 && g<0.02 && g>-0.035) return 'emocionado';                                                      // en la cima (lo más alto del viaje)
  if(x.recorrido!=null && x.recorrido<250) return 'contento';                         // partiendo
  // bandas con histéresis: para entrar a un estado hay que pasar el umbral; para salir, bajar de uno menor
  var sube=act==='cansado'||act==='enojado'||act==='agotado', baja=act==='emocionado'||act==='adrenalina';
  if(g>(sube?0.07:0.085)) return ganCuesta>25||x.subidoDia>220?'agotado':'enojado';   // aprieta; tarde en el día, ya no da más
  if(g>(sube?0.025:0.035)) return ganCuesta>45||x.subidoDia>260?'agotado':'cansado';   // un 3,5 % sostenido en bici ya cansa
  if(g<(baja?-0.05:-0.07)) return 'adrenalina';   // (las curvas NO compiten aquí: alternaban con la adrenalina y la cara no cambiaba)
  if(g<(baja?-0.02:-0.035)) return 'emocionado';
  if(x.curva>55) return 'sorprendido';                                                // curva cerrada en plano
  if(gAdelante>0.06 && g<0.02) return 'preocupado';                                   // ve venir la cuesta
  if(x.faltan!=null && x.faltan<600) return 'contento';                               // ya se ve la llegada
  if(x.trasCuesta) return 'guino';                                                    // recién terminó una cuesta: respira y sonríe
  return 'feliz';
}

// ---------- estado ----------
var mapa, modo='nuevo', capa='sat', D={}, marcador=null, rig=null, cajas={}, opts=(typeof _pistOpts==='function')?_pistOpts():{}, veh=(typeof _pistVehiculo==='function')?_pistVehiculo(opts,'ciclismo'):'';
var huboCuesta=0, ritmoAct=0, intro=null, espTot=1, prog=0, corriendo=false, ultimo=null, velX=1, incl=0, cam=null, espera=0, sigM=0, ppHasta=0, exprAct='feliz', exprCand=null, vista='atras', caraHasta=0, poseTemp=null, poseHasta=0, ganCuesta=0, ultAlt=null;
var MASC={on:true, F:{}, d:0, fase:0, mk:null, cv:null, ultCuadro:''};
// mascota = la que eligió el usuario (opts.mascota). Las de la app (quiltro, perro negro, gato) van en el
// canasto: se ven en la bici de costado y, de espaldas, asomadas junto al manubrio. Las nuevas de
// feature/mascotas (pudú…) corren al lado; solo el pudú tiene arte de carrera todavía.
var MASC_CORREN={pudu:'Pudú (nueva)'};
function mascotaElegida(){ return opts.mascota||''; }
function mascotaCanasto(){ var id=mascotaElegida(); return (typeof PIST_MASCOTA!=='undefined' && PIST_MASCOTA.some(function(m){ return m.id===id && id; }))?id:''; }
function mascotaSVG(id){ return typeof _bMascota==='function'?'<svg viewBox="-9 -16 20 18" xmlns="http://www.w3.org/2000/svg">'+_bMascota(id,[0,0],true)+'</svg>':''; }

// prepara todo lo que el vuelo necesita a partir de los puntos grabados (crudo) y la línea pegada al camino
// ~5 s por km, pero acotado a 45–80 s (Relive deja sus videos en torno a un minuto); un viaje de 100 km ya no dura 8 min
// ---------- sonido ----------
// viento continuo que sube con la velocidad · latido grave en las subidas duras (al ritmo del anillo) · timbre al partir
// y al llegar · fanfarria en la cima · ráfaga en la bajada y al ir volando. Todo por _psOut() (compresor + volumen .14).
var SON={on:(function(){ try{ return localStorage.getItem('lp_sbv_sonido')!=='0'; }catch(e){ return true; } })(), viento:null, proxLatido:0};
function sonidoListo(){ return SON.on && typeof _psAC==='function' && typeof _psSilencio==='function' && !_psSilencio(); }
function vientoIniciar(){ if(!sonidoListo()||SON.viento) return; try{ var ac=_psAC(), n=ac.sampleRate*2, b=ac.createBuffer(1,n,ac.sampleRate), dd=b.getChannelData(0);
  for(var i=0;i<n;i++) dd[i]=Math.random()*2-1; var src=ac.createBufferSource(); src.buffer=b; src.loop=true;
  var bq=ac.createBiquadFilter(); bq.type='bandpass'; bq.frequency.value=500; bq.Q.value=.7; var g=ac.createGain(); g.gain.value=.0001;
  src.connect(bq); bq.connect(g); g.connect(_psOut()); src.start(); SON.viento={src:src,bq:bq,g:g}; }catch(e){ console.warn('[sobrevuelo] viento', e); } }
function vientoParar(){ if(!SON.viento) return; try{ var ac=_psAC(), v=SON.viento; v.g.gain.setTargetAtTime(.0001,ac.currentTime,.25); setTimeout(function(){ try{ v.src.stop(); }catch(e){} },900); }catch(e){} SON.viento=null; }
function sonidoCuadro(ts,gp,vReal){
  if(!sonidoListo()){ if(SON.viento) vientoParar(); return; }
  if(!SON.viento) vientoIniciar(); if(!SON.viento) return;
  var ac=_psAC(), rapidez=vReal!=null?Math.min(1,vReal/45):Math.min(1,Math.max(0,(ritmoAct-.6)/1.1)), quieto=espera>0||ritmoAct<.08;
  SON.viento.g.gain.setTargetAtTime(quieto?.0001:.03+.17*rapidez*rapidez,ac.currentTime,.4);
  SON.viento.bq.frequency.setTargetAtTime(380+1100*rapidez,ac.currentTime,.4);
  // latido en la subida dura, al mismo ritmo que el anillo del rostro (1,15 s → 0,42 s)
  var esf=Math.max(0,Math.min(1,(gp||0)/.1));
  if(esf>.45 && !quieto && ts>=SON.proxLatido){ var t0=ac.currentTime+.01; _psTono(62,t0,.13,{v:.22}); _psTono(56,t0+.17,.11,{v:.14}); SON.proxLatido=ts+(1150-esf*730); }
}
function sonarMomento(m){ if(!sonidoListo()||typeof pistSonarNombre!=='function') return;
  if(m.d<100||m.fin) pistSonarNombre('timbre'); else if(m.cima) pistSonarNombre('fanfarria'); else if(m.expr==='adrenalina') pistSonarNombre('viento'); }
function horaLuz(){ if(!D.sol) return ''; var h2=new Date(D.sol.salida).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}); return ' · salida '+h2+' · '+D.luz.n; }
function durVuelo(){ return Math.max(45000,Math.min(80000,D.nuevo.total/1000*5000)); }
// Lleva las horas de la traza grabada a la línea pegada al camino (por fracción de distancia) y saca la velocidad
// (ventana ±80 m) y las pausas reales (más de 45 s casi sin moverse). Sin horas: N.vel=null y no hay pausas.
function tiemposReales(N,crudo){
  N.vel=null; N.pausas=[]; var L=limpiarHoy(crudo); if(L.length<3||!L.every(function(p){ return p.t>0; })) return;
  var cc=[0]; for(var i=1;i<L.length;i++) cc.push(cc[i-1]+hav([L[i-1].lon,L[i-1].lat],[L[i].lon,L[i].lat]));
  var k=N.total/Math.max(1,cc[cc.length-1]), j=1, t=[];
  for(i=0;i<N.c.length;i++){ var dc=N.cum[i]/k; while(j<L.length-1&&cc[j]<dc) j++; var f=Math.max(0,Math.min(1,(dc-cc[j-1])/Math.max(1e-6,cc[j]-cc[j-1]))); t.push(L[j-1].t+(L[j].t-L[j-1].t)*f); }
  N.t=t; N.vel=N.c.map(function(_,i2){ var a=i2,b=i2; while(a>0&&N.cum[i2]-N.cum[a]<250) a--; while(b<N.c.length-1&&N.cum[b]-N.cum[i2]<250) b++;   /* ±250 m: un salto del GPS no hace un falso pico */ var dt=(t[b]-t[a])/1000; return dt>0?Math.min(90,(N.cum[b]-N.cum[a])/dt*3.6):0; });
  // pausas: pasos de la traza con mucho tiempo y poca distancia (se juntan si están seguidas)
  // pausa = se quedó dentro de un círculo de 30 m por 60 s o más (el teléfono parado igual graba puntos cada pocos segundos)
  for(i=0;i<L.length-1;i++){ var j2=i+1; while(j2<L.length&&hav([L[i].lon,L[i].lat],[L[j2].lon,L[j2].lat])<30) j2++; var dur=L[j2-1].t-L[i].t;
    if(dur>=60000){ N.pausas.push({d:cc[i]*k,dur:dur}); i=j2-1; } }
}
// posición del sol (algoritmo aproximado de la NOAA/Meeus, error < 1°): altura y azimut en grados
function solPos(ms,lat,lon){ var rd=Math.PI/180, d=ms/86400000-10957.5, g=(357.529+0.98560028*d)*rd, q=280.459+0.98564736*d,
  L=(q+1.915*Math.sin(g)+0.020*Math.sin(2*g))*rd, e=(23.439-0.00000036*d)*rd, ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)), dec=Math.asin(Math.sin(e)*Math.sin(L)),
  gmst=(18.697374558+24.06570982441908*d)%24, H=((gmst*15+lon)*rd-ra), la=lat*rd,
  alt=Math.asin(Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(H)), az=Math.atan2(-Math.sin(H),Math.tan(dec)*Math.cos(la)-Math.sin(la)*Math.cos(H));
  return {alt:alt/rd, az:((az/rd)+360)%360}; }
// luz según la altura del sol: día · hora dorada · crepúsculo · noche (de noche el neón resalta aún más)
function luzDe(alt){
  if(alt==null||alt>25) return {n:'día',sky:'#5f8fc4',hor:'#c9d8e6',fog:'#aebfd0',brillo:.5,sat:-.45,hue:0};
  if(alt>6) return {n:'luz de tarde/mañana',sky:'#6a86c0',hor:'#f1c99a',fog:'#d9b48f',brillo:.46,sat:-.3,hue:-8};
  if(alt>-1) return {n:'hora dorada',sky:'#7a6fb0',hor:'#ffb36b',fog:'#e39a6a',brillo:.4,sat:-.2,hue:-14};
  if(alt>-7) return {n:'crepúsculo',sky:'#2b2f63',hor:'#c06b6b',fog:'#3c3456',brillo:.3,sat:-.4,hue:-6};
  return {n:'noche',sky:'#070b1c',hor:'#1b2550',fog:'#0b1028',brillo:.2,sat:-.6,hue:0};
}
function prepararRuta(crudo, pegada){
  D.hoy=linea(limpiarHoy(crudo).map(function(p){ return [p.lon,p.lat]; }));
  D.dur=(crudo[crudo.length-1].t&&crudo[0].t)?crudo[crudo.length-1].t-crudo[0].t:0; /* duración real (horas de los puntos), 0 si no hay */
  D.nuevo=linea(densificar(pegada,12));
  return alturas(D.nuevo.c).then(function(a){
    var N=D.nuevo; N.alt=suavizar(suavizar(a,N.cum,60),N.cum,60); N.pend=pendientes(N.alt,N.cum,100);
    var sub=0, ref=N.alt[0]; N.sub=N.alt.map(function(h){ if(h>ref+2){ sub+=h-ref; ref=h; } else if(h<ref-2) ref=h; return sub; });
    N.min=Math.min.apply(null,N.alt); N.max=Math.max.apply(null,N.alt); N.imax=N.alt.indexOf(N.max);
    tiemposReales(N,crudo);
    D.sol=null; if(crudo[0]&&crudo[0].t>0){ var tm=crudo[0].t+(D.dur||0)/2, cen=N.c[Math.floor(N.c.length/2)]; D.sol=solPos(tm,cen[1],cen[0]); D.sol.salida=crudo[0].t; }
    D.luz=luzDe(D.sol?D.sol.alt:null);
    return demPrecargar(N.c).then(function(){ ladoBajo(N); planear(N); });
  });
}
Promise.all([fetch('traza-gps.json').then(function(r){return r.json();}), fetch('traza-pegada.json').then(function(r){return r.json();}), cargarMascota()]).then(function(r){
  return prepararRuta(r[0],r[1]).then(iniciar);
}).catch(function(e){ $('cargando').textContent='No se pudo cargar: '+e.message; console.error(e); });

// ===== "Usa tu ruta": GPX propio → limpieza → pegado al camino → relieve → vuelo =====
// El archivo se lee en el navegador. Para pegarla al camino se envía SOLO la lista de puntos (sin nombre ni horas) al
// servidor de demostración de Valhalla (FOSSGIS); si falla o devuelve un largo que no cuadra, se usa la traza limpia.
function leerGPX(texto){
  var x=new DOMParser().parseFromString(texto,'application/xml'), nodos=[].slice.call(x.getElementsByTagName('trkpt')); if(!nodos.length) nodos=[].slice.call(x.getElementsByTagName('rtept'));
  var pts=nodos.map(function(n){ var t=n.getElementsByTagName('time')[0]; return {lat:+n.getAttribute('lat'), lon:+n.getAttribute('lon'), t:t?Date.parse(t.textContent):0}; }).filter(function(p){ return isFinite(p.lat)&&isFinite(p.lon); });
  var nm=x.getElementsByTagName('name')[0]; return {pts:pts, nombre:nm?nm.textContent.trim():''};
}
function largoPts(p){ var s2=0; for(var i=1;i<p.length;i++) s2+=hav([p[i-1].lon,p[i-1].lat],[p[i].lon,p[i].lat]); return s2; }
// quita "pinchazos": un punto que se sale más de 22 m de la línea entre sus vecinos (sirve aunque no haya horas)
function sinPinchazos(p){ var out=p.slice(), cambio=true, vuelta=0;
  while(cambio && vuelta++<3){ cambio=false; for(var i=1;i<out.length-1;i++){ var a2=out[i-1], b2=out[i+1], m={lat:(a2.lat+b2.lat)/2, lon:(a2.lon+b2.lon)/2};
    if(hav([out[i].lon,out[i].lat],[m.lon,m.lat])>22 && hav([a2.lon,a2.lat],[b2.lon,b2.lat])<120){ out.splice(i,1); i--; cambio=true; } } }
  return out; }
var VALHALLA='https://valhalla1.openstreetmap.de/trace_route';
function decPoly6(z){ var i=0,la=0,lo=0,o=[]; while(i<z.length){ for(var k=0;k<2;k++){ var sh=0,res=0,b; do{ b=z.charCodeAt(i++)-63; res|=(b&31)<<sh; sh+=5; }while(b>=32); var v=(res&1)?~(res>>1):(res>>1); if(k) lo+=v; else la+=v; } o.push([lo/1e6,la/1e6]); } return o; }
// un tramo: si Valhalla responde con un pedazo (trampa conocida) o falla, ese tramo usa la traza limpia
function pegarTramo(tr){
  var Lg=largoPts(tr), propio=tr.map(function(p){ return [p.lon,p.lat]; });
  return fetch(VALHALLA,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shape:tr.map(function(p){ return {lat:p.lat,lon:p.lon}; }),costing:'bicycle',shape_match:'map_snap',trace_options:{search_radius:50,gps_accuracy:12}})})
  .then(function(r2){ return r2.json(); }).then(function(j){ if(!j.trip) return {c:propio,ok:false};
    var c=[]; j.trip.legs.forEach(function(l,ix){ var d2=decPoly6(l.shape); c=c.concat(ix?d2.slice(1):d2); });
    return Math.abs(linea(c).total-Lg)/Lg<=.1?{c:c,ok:true}:{c:propio,ok:false}; })
  .catch(function(){ return {c:propio,ok:false}; });
}
function pegarAlCamino(pts){
  var conT=pts.every(function(p){ return p.t>0; });
  var limpio=[]; pts.forEach(function(p){ var u=limpio[limpio.length-1]; if(u&&conT&&p.t>u.t&&hav([u.lon,u.lat],[p.lon,p.lat])/((p.t-u.t)/1000)>12) return; limpio.push(p); });
  limpio=sinPinchazos(limpio);
  var muestra=[]; limpio.forEach(function(p){ var u=muestra[muestra.length-1]; if(!u||hav([u.lon,u.lat],[p.lon,p.lat])>=40) muestra.push(p); });
  if(muestra.length<3) return Promise.resolve({coords:limpio.map(function(p){ return [p.lon,p.lat]; }),metodo:'gps',motivo:'pocos puntos'});
  // tramos de ~120 puntos (~5 km) que se tocan en un punto; de a 2 pedidos a la vez (uso justo del servidor de demostración)
  var tramos=[]; for(var i=0;i<muestra.length-1;i+=119) tramos.push(muestra.slice(i,Math.min(muestra.length,i+120)));
  var res=new Array(tramos.length), sig=0;
  function trabajador(){ if(sig>=tramos.length) return Promise.resolve(); var k=sig++; return pegarTramo(tramos[k]).then(function(x){ res[k]=x; return trabajador(); }); }
  return Promise.all([trabajador(),trabajador()]).then(function(){
    var c=[], buenos=0; res.forEach(function(x,k){ if(x.ok) buenos++; c=c.concat(k?x.c.slice(1):x.c); });
    var parte=buenos/res.length; if(parte<1) console.info('[sobrevuelo] tramos pegados al camino: '+buenos+' de '+res.length);
    return {coords:c, metodo:parte===1?'valhalla':(parte>0?'parcial':'gps'), motivo:buenos+'/'+res.length};
  });
}
function usarGPX(file,listo){
  var sub=$('titSub'); corriendo=false; actualizarBoton();
  file.text().then(function(txt){ if(listo) listo(); var g=leerGPX(txt); if(g.pts.length<10) throw new Error('El archivo no trae una ruta con puntos');
    sub.textContent='Pegando tu ruta al camino…';
    return pegarAlCamino(g.pts).then(function(res){ sub.textContent='Calculando el relieve…';
      return prepararRuta(g.pts,res.coords).then(function(){
        RUTA.nombre=g.nombre||file.name.replace(/\.gpx$/i,''); RUTA.metodo=res.metodo;
        prog=0; perfilCache=null; PRE.hechos={}; PRE.cola=[]; PRE.pendientes={}; PRE.total=0; PRE.listos=0;
        $('tit').textContent=RUTA.nombre;
        sub.textContent=fmt(D.nuevo.total/1000,1)+' km'+horaLuz()+' · '+(res.metodo==='valhalla'?'pegada al camino':res.metodo==='parcial'?'pegada al camino en '+res.motivo+' tramos':'GPS limpio (no se pudo pegar al camino)');
        reiniciar(); }); }); })
  .catch(function(e){ sub.textContent='No se pudo usar ese archivo: '+e.message; console.error(e); });
}

// ---------- mascota: pudú cría (Gemini, rama feature/mascotas); fondo azul fuera con relleno desde los bordes (mismo sinFondo del mockup) ----------
function sinFondo(src){ return new Promise(function(res,rej){ var im=new Image(); im.onerror=rej; im.onload=function(){
  var c=document.createElement('canvas'); c.width=im.width; c.height=im.height; var g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(im,0,0);
  var d=g.getImageData(0,0,c.width,c.height), p=d.data, W=c.width, H=c.height;
  var fondo=function(i){ var r=p[i],gg=p[i+1],b=p[i+2],l=(r+gg+b)/3; return (b>r+12&&b>gg-4&&l<125)||l<28; };
  var vis=new Uint8Array(W*H), st=[], x, y, k; for(x=0;x<W;x++) st.push(x,(H-1)*W+x); for(y=0;y<H;y++) st.push(y*W,y*W+W-1);
  while(st.length){ k=st.pop(); if(vis[k]) continue; vis[k]=1; if(!fondo(k*4)) continue; p[k*4+3]=0; x=k%W; y=(k/W)|0; if(x>0) st.push(k-1); if(x<W-1) st.push(k+1); if(y>0) st.push(k-W); if(y<H-1) st.push(k+W); }
  for(k=0;k<W*H;k++){ if(!p[k*4+3]) continue; x=k%W; y=(k/W)|0; var n=0; if(x>0&&!p[(k-1)*4+3]) n++; if(x<W-1&&!p[(k+1)*4+3]) n++; if(y>0&&!p[(k-W)*4+3]) n++; if(y<H-1&&!p[(k+W)*4+3]) n++; if(n) p[k*4+3]=255-n*55; }
  g.putImageData(d,0,0); var x0=W,y0=H,x1=0,y1=0; for(y=0;y<H;y++) for(x=0;x<W;x++) if(p[(y*W+x)*4+3]>40){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  var o=document.createElement('canvas'); o.width=x1-x0+1; o.height=y1-y0+1; o.getContext('2d').drawImage(c,x0,y0,o.width,o.height,0,0,o.width,o.height); res(o); }; im.src=src; }); }
function cargarMascota(){ return Promise.all(['pudu-cria-corriendo','pudu-cria-corriendo2','pudu-cria-sentado','pudu-cria-v8-ojos-grandes'].map(function(n){ return sinFondo('mascota/'+n+'.png'); })).then(function(f){ MASC.F={A:f[0],B:f[1],S:f[2],cara:f[3]}; }).catch(function(e){ console.warn('mascota', e); MASC.on=false; }); }

function precargarInicio(){ if(modo!=='nuevo'||!LIVIANO) return; var d=prog*D.nuevo.total; tilesTramo(d-200,d+2600); cargaInicial={t0:performance.now(),hasta:d+1300}; cargaInicial.f0=Math.max(1,faltanHasta(cargaInicial.hasta)); }
function arrancarIntro(){ var c=mapa.getCenter(); intro={t:0,dur:2800,de:{c:[c.lng,c.lat],z:mapa.getZoom(),pitch:mapa.getPitch(),b:mapa.getBearing()}}; }
function kmTxt(m){ return fmt(m/1000,1)+' km'; }
function mostrarResumen(){ var R=D.nuevo.resumen, el=$('resumen'); if(!R||!el) return; var yaFin=document.body.classList.contains('fin');
  var fila=function(a,b){ return '<div class="rs-dato"><small>'+a+'</small><b>'+b+'</b></div>'; };
  var hitos=[];
  if(R.sMax) hitos.push(['La subida más dura','+'+Math.round(R.sMax.gan)+' m entre el km '+fmt(R.sMax.d0/1000,1)+' y el '+fmt(R.sMax.d1/1000,1),'sube']);
  hitos.push(['Lo más empinado',fmt(R.pendMax*100,0)+' % en el km '+fmt(R.dPendMax/1000,1),'empina']);
  if(R.bMax) hitos.push(['La mejor bajada','−'+Math.round(-R.bMax.gan)+' m desde el km '+fmt(R.bMax.d0/1000,1),'baja']);
  hitos.push(['La cima',Math.round(R.altMax)+' m en el km '+fmt(R.dCima/1000,1),'cima']);
  var N2=D.nuevo; if(N2.vMax&&N2.vMax.v>=15) hitos.push(['Lo más rápido',Math.round(N2.vMax.v)+' km/h en el km '+fmt(N2.vMax.d/1000,1),'baja']);
  if(N2.pausas&&N2.pausas.length){ var tp=N2.pausas.reduce(function(a2,b2){ return a2+b2.dur; },0); hitos.push(['Pausas',N2.pausas.length+' ('+durTxt(tp)+' en total)','cima']); }
  el.innerHTML='<div class="rs-tit"><b>'+RUTA.nombre+'</b><span>Así fue tu viaje</span></div>'
    +'<div class="rs-grid">'+fila('Distancia',kmTxt(R.dist))+fila('Tiempo',R.dur?durTxt(R.dur):'–')+fila('Subiste','+'+Math.round(R.sub)+' m')+fila('Subiendo',kmTxt(R.kmSube))+'</div>'
    +'<ul class="rs-hitos">'+hitos.map(function(h){ return '<li class="'+h[2]+'"><span>'+h[0]+'</span><b>'+h[1]+'</b></li>'; }).join('')+'</ul>';
  if(cajas&&cajas.inn){ cajas.k=.8; cajas.inn.style.transform='scale(.8)'; }   // en la vista general el rostro va chico
  el.innerHTML+='<button class="btn play rs-comp" id="compartir">Compartir mi viaje</button>';
  $('compartir').onclick=compartirViaje;
  document.body.classList.add('fin'); if(!yaFin) setTimeout(function(){ encuadrar(1400); },60); }   // reencuadra sobre la tarjeta
function cargarImg(src){ return new Promise(function(ok,mal){ var im=new Image(); im.onload=function(){ ok(im); }; im.onerror=mal; im.src=src; }); }
function fotoMapa(){ return new Promise(function(ok){ mapa.once('render',function(){ try{ ok(mapa.getCanvas().toDataURL('image/jpeg',.92)); }catch(e){ console.warn('[sobrevuelo] foto del mapa', e); ok(null); } }); mapa.triggerRepaint(); }); }
function svgDelRostro(){ var x;
  if(personaje.capas && cajas.host && cajas.host.querySelector('svg')){ x=cajas.host.querySelector('svg').cloneNode(true); x.setAttribute('xmlns','http://www.w3.org/2000/svg'); x.setAttribute('width','400'); x.setAttribute('height','400'); return new XMLSerializer().serializeToString(x); }
  return cara('orgulloso').replace('<svg ','<svg width="400" height="336" '); }
function tarjetaCompartir(){
  var R=D.nuevo.resumen, W=1080, H=1350, rs=$('resumen'), Hc=mapa.getContainer().clientHeight;
  return Promise.all([fotoMapa(), cargarImg('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgDelRostro())).catch(function(){ return null; }), cargarImg('../../../logo-transparent.png').catch(function(){ return null; })]).then(function(r){
    var cv=document.createElement('canvas'); cv.width=W; cv.height=H; var c=cv.getContext('2d',{willReadFrequently:true}); /* lienzo en memoria: el acelerado por GPU perdía lo dibujado al exportar */
    c.fillStyle='#0a0f1d'; c.fillRect(0,0,W,H);
    var dibujarMapa=function(img){ var cvM=mapa.getCanvas(), sh=cvM.height*Math.max(.3,(rs?rs.getBoundingClientRect().top:Hc*.5)/Hc), sw=cvM.width, k=Math.max(W/sw,820/sh), dw=sw*k, dh=sh*k;
      c.save(); c.beginPath(); c.rect(0,0,W,820); c.clip(); c.drawImage(img,0,0,sw,sh,(W-dw)/2,(820-dh)/2,dw,dh); c.restore();
      var gr=c.createLinearGradient(0,560,0,830); gr.addColorStop(0,'rgba(10,15,29,0)'); gr.addColorStop(1,'#0a0f1d'); c.fillStyle=gr; c.fillRect(0,560,W,270); };
    var seguir=r[0]?cargarImg(r[0]).then(dibujarMapa):Promise.resolve();
    return seguir.then(function(){
      // logo real de la app (arriba a la izquierda) y rostro del Pistero elegido (arriba a la derecha)
      if(r[2]){ c.save(); c.shadowColor='rgba(0,0,0,.6)'; c.shadowBlur=18; c.drawImage(r[2],28,24,170,170); c.restore(); }
      if(r[1]){ var cx=930, cy=130, rr=96; c.save(); c.beginPath(); c.arc(cx,cy,rr,0,7); c.fillStyle='#0f1524'; c.fill(); c.clip(); if(personaje.capas) c.drawImage(r[1],cx-rr,cy-rr,rr*2,rr*2); else { var ih=r[1].height/r[1].width; c.drawImage(r[1],cx-rr*1.15,cy-rr*1.15*ih+rr*.22,rr*2.3,rr*2.3*ih); } c.restore();
        c.save(); c.beginPath(); c.arc(cx,cy,rr,0,7); c.lineWidth=8; c.strokeStyle='#ffd700'; c.shadowColor='#ffd700'; c.shadowBlur=26; c.stroke(); c.restore(); }
      c.fillStyle='#e8edf6'; var fz=60; do{ c.font='800 '+fz+'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif'; fz-=2; }while(fz>34 && c.measureText(RUTA.nombre).width>W-112); c.fillText(RUTA.nombre,56,890,W-112); /* el nombre entra completo: baja la letra en vez de cortarlo */
      var fecha=D.sol?new Date(D.sol.salida).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})+horaLuz().replace(' · salida',' ·'):'';
      c.fillStyle='#9fb3c8'; c.font='600 30px system-ui,sans-serif'; c.fillText(fecha||'Mi viaje en Libre Pedal',56,936);
      var datos=[['DISTANCIA',fmt(R.dist/1000,1)+' km'],['TIEMPO',R.dur?durTxt(R.dur):'–'],['SUBISTE','+'+Math.round(R.sub)+' m'],['MÁS ALTO',Math.round(R.altMax)+' m']];
      datos.forEach(function(d2,k){ var x=56+k*248; c.fillStyle='#141a2b'; c.beginPath(); c.roundRect(x,972,232,128,22); c.fill(); c.strokeStyle='rgba(255,255,255,.09)'; c.lineWidth=2; c.stroke();
        c.fillStyle='#9fb3c8'; c.font='700 22px system-ui,sans-serif'; c.fillText(d2[0],x+22,1014); c.fillStyle='#e8edf6'; c.font='800 40px system-ui,sans-serif'; c.fillText(d2[1],x+22,1072); });
      var hitos=[]; if(R.sMax) hitos.push(['#ff8a1f','La subida más dura','+'+Math.round(R.sMax.gan)+' m · km '+fmt(R.sMax.d0/1000,1)]);
      hitos.push(['#ff2d6f','Lo más empinado',fmt(R.pendMax*100,0)+' % · km '+fmt(R.dPendMax/1000,1)]);
      if(D.nuevo.vMax&&D.nuevo.vMax.v>=15) hitos.push(['#22d3ff','Lo más rápido',Math.round(D.nuevo.vMax.v)+' km/h']); else if(R.bMax) hitos.push(['#22d3ff','La mejor bajada','−'+Math.round(-R.bMax.gan)+' m']);
      hitos.slice(0,3).forEach(function(h3,k){ var y=1128+k*56; c.fillStyle=h3[0]; c.fillRect(56,y,8,44); c.fillStyle='#9fb3c8'; c.font='600 30px system-ui,sans-serif'; c.fillText(h3[1],84,y+33);
        c.fillStyle='#e8edf6'; c.font='800 30px system-ui,sans-serif'; c.textAlign='right'; c.fillText(h3[2],W-56,y+33); c.textAlign='left'; });
      c.fillStyle='#fc4c02'; c.font='800 26px system-ui,sans-serif'; c.textAlign='center'; c.fillText('librepedal.cl',W/2,H-18); c.textAlign='left';
      return new Promise(function(ok){ cv.toBlob(ok,'image/png'); });
    }); });
}
function compartirViaje(){ var b=$('compartir'); if(b){ b.disabled=true; b.textContent='Preparando la imagen…'; }
  tarjetaCompartir().then(function(blob){ var nom='libre-pedal-'+RUTA.nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.png', file=new File([blob],nom,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})) return navigator.share({files:[file],title:RUTA.nombre,text:'Mi viaje en Libre Pedal'}).catch(function(){});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(a.href); },4000); })
  .catch(function(e){ console.warn('[sobrevuelo] compartir', e); }).then(function(){ if(b){ b.disabled=false; b.textContent='Compartir mi viaje'; } }); }
function reiniciarEstado(){ document.body.classList.remove('fin'); intro=null; ritmoAct=0; huboCuesta=0; cam=null; espera=0; sigM=0; MASC.d=0; ganCuesta=0; ultAlt=null; exprAct='feliz'; exprCand=null; caraHasta=0; poseTemp=null; ppHasta=0; incl=0; var pp=$('pp'); if(pp) pp.classList.remove('on'); document.body.classList.remove('pp-on'); }
function iniciar(){
  mapa=new maplibregl.Map({container:'mapa',style:SAT,center:D.nuevo.c[0],zoom:12,pitch:0,maxPitch:85,attributionControl:{compact:true},pixelRatio:LIVIANO?Math.min(window.devicePixelRatio||1,1.5):(window.devicePixelRatio||1),maxTileCacheSize:LIVIANO?600:null,preserveDrawingBuffer:true}); /* para poder sacar la foto del mapa al compartir (si no, sale negra) */
  mapa.on('style.load',montarCapas); window._demo=mapa;
  window._ir=function(p){ reiniciarEstado(); prog=p; while(sigM<D.nuevo.momentos.length && D.nuevo.momentos[sigM].d<p*D[modo].total) sigM++; MASC.d=p*D[modo].total; pintar(16,performance.now(),true); };
  window._ver=function(ix,avance){ var N=D.nuevo, m=N.momentos[ix]; window._ir(Math.min(1,(m.d+1)/N.total)); var ts=performance.now(); primerPlano(m,ts); exprAct=m.expr; caraHasta=ts+5000; if(m.cima){ espTot=2800; espera=2800*(1-(avance||0)); } cam=null; pintar(16,ts,true); };
  window._fin=function(){ window._ir(1); mostrarResumen(); };
  window._tarjeta=function(){ return tarjetaCompartir().then(function(b){ return new Promise(function(ok){ var fr=new FileReader(); fr.onload=function(){ ok(fr.result); }; fr.readAsDataURL(b); }); }); };
  window._dbgN=function(){ var N=D.nuevo; return JSON.stringify({pausas:N.pausas,vMax:N.vMax,conT:!!N.t}); };
  window._cara=function(e){ exprAct=e; rostroCara(e); };
  window._tomas=function(){ return D.nuevo.seq.map(function(p){ return p.t+' '+Math.round(p.d0)+'-'+Math.round(p.d1); }).concat(D.nuevo.momentos.map(function(m){ return 'cara '+m.expr+' @'+Math.round(m.d)+' '+m.txt; })); };
  mapa.once('load',function(){ $('cargando').style.display='none'; encuadrar(0); dibujarPerfil(); });
  $('modo').onclick=function(e){ var m=e.target.dataset.m; if(!m||m===modo) return; modo=m; marcarSeg('modo','m',m); reiniciar(); };
  $('capa').onclick=function(e){ var c=e.target.dataset.c; if(!c||c===capa) return; capa=c; marcarSeg('capa','c',c); mapa.setStyle(c==='sat'?SAT:CALLES,{diff:false}); };
  $('play').onclick=function(){ if(prog>=1){ prog=0; reiniciarEstado(); } corriendo=!corriendo; actualizarBoton(); if(corriendo){ ultimo=null; ultimoPinto=null; precargarInicio(); if(prog===0 && modo==='nuevo') arrancarIntro(); requestAnimationFrame(frame); } };
  var sm=$('mascota'); if(sm){ var lst=(typeof PIST_MASCOTA!=='undefined'?PIST_MASCOTA:[]).map(function(m){ return [m.id,m.n]; }).concat([['pudu',MASC_CORREN.pudu]]); sm.innerHTML=lst.map(function(o){ return '<option value="'+o[0]+'">'+o[1]+'</option>'; }).join(''); sm.value=opts.mascota||''; /* Inty 2026-10-07: por ahora sin mascota (queda lista para después) */ opts.mascota=sm.value; sm.onchange=function(){ opts.mascota=sm.value; if(mapa) montarDeNuevo(); }; }
  var sp=$('personaje'); if(sp){ sp.innerHTML=Object.keys(PERSONAJES).map(function(k){ return '<option value="'+k+'">'+(PERSONAJES[k].nombre||'Pistero')+'</option>'; }).join(''); sp.value=personaje.id;
    sp.onchange=function(){ personaje=PERSONAJES[sp.value]; if(mapa&&modo==='nuevo'){ crearMarcador(); pintar(16,performance.now(),false); } }; }
  // pausa sola si la app pasa a segundo plano (batería y calor); tocar el mapa pausa o sigue
  document.addEventListener('visibilitychange',function(){ if(document.hidden && corriendo){ corriendo=false; actualizarBoton(); } });
  mapa.on('click',function(){ if(modo==='nuevo' && !document.body.classList.contains('fin')) $('play').click(); });
  $('gpx').onchange=function(){ var inp=this; if(inp.files&&inp.files[0]) usarGPX(inp.files[0],function(){ inp.value=''; }); };   /* se limpia DESPUÉS de leer (antes se perdía el archivo) */
  var bs=$('sonido'); if(bs){ var pintaS=function(){ bs.setAttribute('aria-pressed',SON.on); bs.classList.toggle('mudo',!SON.on); bs.title=SON.on?'Sonido: sí':'Sonido: no'; }; pintaS();
    bs.onclick=function(){ SON.on=!SON.on; try{ localStorage.setItem('lp_sbv_sonido',SON.on?'1':'0'); }catch(e){} if(!SON.on) vientoParar(); pintaS(); }; }
  $('vel').onclick=function(){ velX=velX===1?2:velX===2?4:1; this.textContent='×'+velX; };
  var pf=$('perfil'), arrastrando=false;
  function irA(ev){ var r=pf.getBoundingClientRect(); window._ir(Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width))); }
  pf.addEventListener('pointerdown',function(ev){ arrastrando=true; pf.setPointerCapture(ev.pointerId); irA(ev); });
  pf.addEventListener('pointermove',function(ev){ if(arrastrando) irA(ev); });
  pf.addEventListener('pointerup',function(){ arrastrando=false; });
  window.addEventListener('resize',dibujarPerfil);
  nota();
  $('tit').textContent=RUTA.nombre; $('titSub').textContent=fmt(D.nuevo.total/1000,1)+' km'+horaLuz()+' · ruta de demostración (camino real OSM, GPS simulado)';
}
function marcarSeg(id,k,v){ [].forEach.call($(id).children,function(b){ b.classList.toggle('on',b.dataset[k]===v); }); }
function actualizarCarga(){ var b=$('play'); if(!b) return; if(cargaInicial){ var f=faltanHasta(cargaInicial.hasta), tot=Math.max(1,PRE.total); b.textContent='Preparando el vuelo · '+Math.round(100*Math.max(0,1-f/cargaInicial.f0))+' %'; } else actualizarBoton(); }
function actualizarBoton(){ if(!corriendo) vientoParar(); document.body.classList.toggle('corriendo',corriendo); $('play').textContent=corriendo?'❚❚ Pausa':(prog>=1?'↺ Repetir':'▶ '+(prog>0?'Seguir':'Ver sobrevuelo')); }
function nota(){ $('nota').innerHTML=modo==='hoy'
  ? '<b>Así funciona hoy.</b> La línea es el GPS tal cual se graba (aquí con el error típico de un teléfono, simulado): zigzaguea y se sale del camino. Pistero va anclado por el <b>centro</b>, así que flota corrido de la línea. Mapa plano, sin relieve.'
  : '<b>Propuesta.</b> Huella neón pegada al camino, relieve real, tomas que cambian según la ruta (aérea, lateral, bajada, giro en la cima), y primeros planos de Pistero.'; }

function montarCapas(){
  var m=mapa, N=D.nuevo, H=D.hoy, vis=modo==='nuevo'?'visible':'none';
  if(!m.getSource('dem')) m.addSource('dem',{type:'raster-dem',tiles:[DEM_TILE],encoding:'terrarium',tileSize:512,maxzoom:12,attribution:'© Mapterhorn'});
  if(modo==='nuevo'){
    m.setTerrain({source:'dem',exaggeration:EXAG});
    var LZ=D.luz||luzDe(null); try{ m.setSky({'sky-color':LZ.sky,'horizon-color':LZ.hor,'fog-color':LZ.fog,'sky-horizon-blend':.6,'horizon-fog-blend':.45,'fog-ground-blend':.25}); }catch(e){}
    // sombras del relieve desde donde estaba el sol (solo si era de día)
    if(D.sol&&D.sol.alt>0){ var somb={'hillshade-illumination-direction':D.sol.az,'hillshade-illumination-anchor':'map','hillshade-exaggeration':Math.min(.6,.25+(30-Math.min(30,D.sol.alt))/60),'hillshade-shadow-color':'#000','hillshade-highlight-color':'#fff6e0','hillshade-accent-color':'#000'};
      if(!m.getSource('dem-sombra')) m.addSource('dem-sombra',{type:'raster-dem',tiles:[DEM_TILE],encoding:'terrarium',tileSize:512,maxzoom:12});
      if(capa==='sat' && !m.getLayer('sol')) m.addLayer({id:'sol',type:'hillshade',source:'dem-sombra',paint:somb}); }
    if(capa==='calles' && !m.getLayer('relieve')){ var antes; m.getStyle().layers.some(function(l){ if(l.type==='symbol'){ antes=l.id; return true; } }); if(!m.getSource('dem-sombra')) m.addSource('dem-sombra',{type:'raster-dem',tiles:[DEM_TILE],encoding:'terrarium',tileSize:512,maxzoom:12}); m.addLayer({id:'relieve',type:'hillshade',source:'dem-sombra',paint:{'hillshade-exaggeration':.5,'hillshade-shadow-color':'#5b4a3a'}},antes); }
    // fondo apagado para que el neón destaque (la técnica "firefly" pide base oscura y desaturada)
    if(m.getLayer('sat')){ m.setPaintProperty('sat','raster-brightness-max',LZ.brillo); m.setPaintProperty('sat','raster-saturation',LZ.sat); m.setPaintProperty('sat','raster-hue-rotate',LZ.hue); }
    if(m.getLayer('relieve')&&D.sol&&D.sol.alt>0){ m.setPaintProperty('relieve','hillshade-illumination-direction',D.sol.az); m.setPaintProperty('relieve','hillshade-illumination-anchor','map'); }
  } else { m.setTerrain(null); }
  // con relieve los símbolos se dibujan SOBRE las líneas: los escudos de ruta (T-551) tapaban el trazado
  m.getStyle().layers.forEach(function(l){ if(l.type==='symbol' && /shield|oneway/.test(l.id)) m.setLayoutProperty(l.id,'visibility','none'); });
  // "Hoy": la línea cruda, igual que mlPolyline (halo oscuro + color de acento)
  m.addSource('hoy',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:H.c}}});
  var vh=modo==='hoy'?'visible':'none';
  m.addLayer({id:'hoy-halo',type:'line',source:'hoy',layout:{'line-cap':'round','line-join':'round',visibility:vh},paint:{'line-color':'#0a0f1d','line-width':9,'line-opacity':.6}});
  m.addLayer({id:'hoy',type:'line',source:'hoy',layout:{'line-cap':'round','line-join':'round',visibility:vh},paint:{'line-color':'#fc4c02','line-width':5,'line-opacity':.95}});
  // "Propuesta": tramos seguidos del mismo color de pendiente (uno de 12 m solo se perdía al alejar)
  N.run=[]; var feats=[], i0=0; for(var i=1;i<=N.c.length;i++){ if(i===N.c.length || colorPend(N.pend[i])!==colorPend(N.pend[i0+1])){ var cc=colorPend(N.pend[i0+1]); feats.push({type:'Feature',properties:{a:i0,b:i-1,col:cc,neo:neon(cc,.72)},geometry:{type:'LineString',coordinates:N.c.slice(i0,i)}}); for(var k=i0;k<i-1;k++) N.run[k]=i0; i0=i-1; } }
  m.addSource('ruta',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:N.c}}});
  m.addSource('tramos',{type:'geojson',data:{type:'FeatureCollection',features:feats}});
  m.addSource('cabeza',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[N.c[0],N.c[0]]}}});
  var Wz=function(a,b){ return ['interpolate',['linear'],['zoom'],10,a,15,b]; }, LJ={'line-cap':'round','line-join':'round',visibility:vis}, F0=['<=',['get','b'],0];
  // lo que falta: hilo tenue (el camino que viene)
  m.addLayer({id:'falta-halo',type:'line',source:'ruta',layout:LJ,paint:{'line-color':'#0a0f1d','line-width':Wz(4,8),'line-opacity':.35}});
  m.addLayer({id:'falta',type:'line',source:'ruta',layout:LJ,paint:{'line-color':'#dbe7f5','line-width':Wz(1.3,2.6),'line-opacity':.5,'line-dasharray':[2,1.5]}});
  // HUELLA NEÓN (firefly, John Nelson/Mapbox): 2 halos anchos y difuminados + núcleo casi blanco
  function neonCapas(id,src,filtro,col,nucleo){
    var f=filtro?{filter:filtro}:{};
    m.addLayer(Object.assign({id:id+'-g3',type:'line',source:src,layout:LJ,paint:{'line-color':col,'line-width':Wz(18,64),'line-blur':Wz(10,40),'line-opacity':.45}},f));
    m.addLayer(Object.assign({id:id+'-g2',type:'line',source:src,layout:LJ,paint:{'line-color':col,'line-width':Wz(7,20),'line-blur':Wz(3,9),'line-opacity':.95}},f));
    m.addLayer(Object.assign({id:id,type:'line',source:src,layout:LJ,paint:{'line-color':nucleo,'line-width':Wz(2,4.6)}},f));
  }
  var c0=colorPend(N.pend[1]);
  neonCapas('hecho','tramos',F0,['get','col'],['get','neo']);
  neonCapas('cabeza','cabeza',null,c0,neon(c0,.72));
  // destello: pulso de luz blanca que corre por lo pedaleado hasta Pistero
  m.addSource('pulso',{type:'geojson',lineMetrics:true,data:{type:'Feature',geometry:{type:'LineString',coordinates:[N.c[0],N.c[1]]}}});
  var G=function(a){ return ['interpolate',['linear'],['line-progress'],0,'rgba(255,255,255,0)',.75,'rgba(255,255,255,'+(a*.55)+')',1,'rgba(255,255,255,'+a+')']; };
  if(!LIVIANO) m.addLayer({id:'pulso-g',type:'line',source:'pulso',layout:LJ,paint:{'line-gradient':G(.6),'line-width':Wz(12,30),'line-blur':Wz(6,15)}});
  m.addLayer({id:'pulso',type:'line',source:'pulso',layout:LJ,paint:LIVIANO?{'line-gradient':G(1),'line-width':Wz(4,10),'line-blur':Wz(2,5)}:{'line-gradient':G(1),'line-width':Wz(2,5)}});
  // chispa bajo las ruedas: brillo tendido en el suelo que late
  m.addSource('chispa',{type:'geojson',data:{type:'Point',coordinates:N.c[0]}});
  m.addLayer({id:'chispa-g',type:'circle',source:'chispa',layout:{visibility:vis},paint:{'circle-color':c0,'circle-radius':Wz(12,34),'circle-blur':1,'circle-opacity':.8,'circle-pitch-alignment':'map'}});
  m.addLayer({id:'chispa',type:'circle',source:'chispa',layout:{visibility:vis},paint:{'circle-color':'#ffffff','circle-radius':Wz(3,7),'circle-blur':.7,'circle-pitch-alignment':'map'}});
  if(modo==='nuevo'){
    var cima=document.createElement('div'); cima.innerHTML='<div class="hito">▲ '+Math.round(N.max)+' m</div>';
    if(D.cimaM) D.cimaM.remove(); D.cimaM=new maplibregl.Marker({element:cima.firstChild,anchor:'bottom',offset:[0,-4]}).setLngLat(N.c[N.imax]).addTo(m);
  } else if(D.cimaM){ D.cimaM.remove(); D.cimaM=null; }
  N._ini=null; crearMarcador(); crearMascota(); pintar(16,performance.now());
}
function montarDeNuevo(){ crearMarcador(); crearMascota(); pintar(16,performance.now(),false); }
function reiniciar(){ corriendo=false; prog=0; reiniciarEstado(); actualizarBoton(); nota(); mapa.setStyle(capa==='sat'?SAT:CALLES,{diff:false}); mapa.once('idle',function(){ encuadrar(600); }); dibujarPerfil(); }
// Vista general SIN fitBounds/easeTo: en MapLibre 4.7.1 easeTo llama _prepareElevation (congela la altura del
// terreno, _elevationFreeze=true) y solo la descongela si se pasó freezeElevation. Quedaba congelada para siempre y
// la cámara no seguía la altura real del camino (Pistero se iba arriba/abajo, en "Calles" la cámara quedaba en 0 m).
// cameraForBounds + jumpTo no congela; la animación es propia (curva suave).
var encuadreRAF=null;
function encuadrar(ms){ var c=D[modo].c, b=c.reduce(function(b,p){ return [[Math.min(b[0][0],p[0]),Math.min(b[0][1],p[1])],[Math.max(b[1][0],p[0]),Math.max(b[1][1],p[1])]]; },[[180,90],[-180,-90]]);
  var Z=zonaLibre(), pad={top:Z.arriba+44,bottom:Z.abajo+10,left:44,right:44}; /* margen para que el rostro (≈60 px) no quede cortado en los extremos */
  // con el resumen abierto, la ruta va en el espacio libre sobre la tarjeta
  var rs=document.body.classList.contains('fin')&&$('resumen'); if(rs){ pad.bottom=Math.max(pad.bottom,Math.round(Z.H-rs.getBoundingClientRect().top)+12); }
  // cameraForBounds calcula con la inclinación ACTUAL: si la cámara venía inclinada (64°) el zoom salía muy lejano.
  // Se calcula con la cámara a nivel y se vuelve a donde estaba antes de animar.
  var c00=mapa.getCenter(), z00=mapa.getZoom(), p00=mapa.getPitch(), b00=mapa.getBearing(), pd00=mapa.getPadding();
  var pFin=0; /* resumen: vista cenital (encaja exacto, como el mapa de actividad de Strava) */ mapa.jumpTo({pitch:pFin,bearing:0,padding:{top:0,bottom:0,left:0,right:0}}); var C=mapa.cameraForBounds(b,{padding:pad});
  mapa.jumpTo({center:c00,zoom:z00,pitch:p00,bearing:b00,padding:pd00});
  if(!C) return; var T={c:[C.center.lng,C.center.lat],z:C.zoom,pitch:pFin,b:0,pad:{top:0,bottom:0,left:0,right:0}}; /* el centro de cameraForBounds YA descuenta los márgenes: aplicarlos de nuevo corría la ruta hacia arriba */
  var c0=mapa.getCenter(), F={c:[c0.lng,c0.lat],z:mapa.getZoom(),pitch:mapa.getPitch(),b:mapa.getBearing(),pad:mapa.getPadding()};
  cancelAnimationFrame(encuadreRAF); var t0=null;
  (function paso(ts){ if(t0===null) t0=ts; var e=ms>0?suaveS((ts-t0)/ms):1, L=function(a,b){ return a+(b-a)*e; };
    mapa.jumpTo({center:[L(F.c[0],T.c[0]),L(F.c[1],T.c[1])],zoom:L(F.z,T.z),pitch:L(F.pitch,T.pitch),bearing:(F.b+giro(F.b,T.b)*e+360)%360,padding:{top:L(F.pad.top,T.pad.top),bottom:L(F.pad.bottom,T.pad.bottom),left:L(F.pad.left,T.pad.left),right:L(F.pad.right,T.pad.right)}});
    if(e<1 && !corriendo) encuadreRAF=requestAnimationFrame(paso); })(performance.now());
}

// ---------- Pistero: de espaldas (esqueleto animado) o de costado (con su cara) según la cámara ----------
function crearRostro(){
  var el=document.createElement('div'); el.className='cara-mk';
  el.innerHTML='<div class="cm-pin"></div><div class="cm-in"><div class="cm-halo"></div><div class="cm-anillo"></div><div class="cm-caras"><div class="cm-c on"></div><div class="cm-c"></div></div><div class="cm-gota"></div></div>';
  var capas=el.querySelectorAll('.cm-c');
  if(personaje.capas){ el.classList.add('modelo'); var host=document.createElement('div'); host.className='cm-modelo'; el.querySelector('.cm-caras').appendChild(host);
    personaje.crear(host).then(function(api){ if(cajas.host===host){ cajas.api=api; api.estadoRuta(cajas.expr||'feliz'); } }); }
  else capas[0].innerHTML=cara('feliz');
  marcador=new maplibregl.Marker({element:el,anchor:'bottom',opacityWhenCovered:'1'}).setLngLat(D.nuevo.c[0]).addTo(mapa);
  cajas={el:el,inn:el.querySelector('.cm-in'),capas:capas,act:0,expr:'feliz',bob:0,host:el.querySelector('.cm-modelo'),api:null};
}
// cambia de cara con fundido cruzado (dos capas: la nueva aparece encima mientras la anterior se apaga)
function rostroCara(ex){ if(cajas.expr===ex) return; if(personaje.capas){ var e=ex,n=0; while(!personaje.tiene(e)&&RESPALDO[e]&&n++<4) e=RESPALDO[e]; cajas.expr=ex; cajas.el.dataset.expr=ex; if(cajas.api) cajas.api.estadoRuta(e); return; } var sig=1-cajas.act, A=cajas.capas[cajas.act], B=cajas.capas[sig]; B.innerHTML=cara(ex); B.classList.add('on'); A.classList.remove('on'); cajas.act=sig; cajas.expr=ex; cajas.el.dataset.expr=ex; }
function crearMarcador(){
  if(marcador) marcador.remove();
  if(modo==='nuevo'){ crearRostro(); return; }
  var A=_pistAtrasSVG(opts,{vehiculo:veh,cadencia:.68}); rig=(typeof _pistAtrasRig==='function')?_pistAtrasRig(opts,veh):null;
  var div=document.createElement('div');
  div.innerHTML='<div class="sbv-rider atras">'+(modo==='nuevo'?'<div class="sbv-sombra"></div>':'')+'<div class="sbv-bici"><div class="sbv-incl"><div class="sbv-cuerpo">'+(rig?rig.svg:A.svg)+'</div><div class="sbv-cabeza" style="left:'+A.cab.l+'%;top:'+A.cab.t+'%;width:'+A.cab.w+'%;height:'+A.cab.h+'%">'+(typeof _pistNucaSVG==='function'?_pistNucaSVG(opts):'')+'</div></div></div><div class="sbv-asoma"></div><div class="sbv-lado"></div></div>';
  var el=div.firstChild;
  // HOY: maplibregl.Marker({element}) => anchor 'center' por defecto (doc. MapLibre MarkerOptions)
  // PROPUESTA: anchor 'bottom' y bajar 4 % de la caja (las ruedas tocan el suelo en y=96 %)
  marcador=new maplibregl.Marker(modo==='nuevo'?{element:el,anchor:'bottom',offset:[0,Math.round(88*.04)],opacityWhenCovered:'1'}:{element:el}).setLngLat(D[modo].c[0]).addTo(mapa);
  var mc=mascotaCanasto(); if(modo==='nuevo' && mc) el.querySelector('.sbv-asoma').innerHTML=mascotaSVG(mc);
  cajas={el:el,bici:el.querySelector('.sbv-bici'),incl:el.querySelector('.sbv-incl'),cabeza:el.querySelector('.sbv-cabeza'),cuerpo:el.querySelector('.sbv-cuerpo'),lado:el.querySelector('.sbv-lado'),ladoKey:''};
  cajas.cabTop=parseFloat(cajas.cabeza.style.top)||3.5;
  if(rig) rig.bind(cajas.cuerpo);
  vista='atras'; el.classList.remove('de-lado');
}
function crearMascota(){
  if(MASC.mk){ MASC.mk.remove(); MASC.mk=null; }
  if(!MASC.on || modo!=='nuevo' || !MASC.F.A || mascotaElegida()!=='pudu') return;
  var el=document.createElement('div'); el.className='masc'; el.innerHTML='<div class="masc-sombra"></div><canvas></canvas>';
  MASC.cv=el.querySelector('canvas'); MASC.som=el.querySelector('.masc-sombra'); MASC.ultCuadro='';
  MASC.mk=new maplibregl.Marker({element:el,anchor:'bottom',opacityWhenCovered:'1'}).setLngLat(D.nuevo.c[0]).addTo(mapa);
}
function dibujarCuadro(k){ if(MASC.ultCuadro===k) return; var s=MASC.F[k], c=MASC.cv; c.width=s.width; c.height=s.height; c.getContext('2d').drawImage(s,0,0); MASC.ultCuadro=k; }

// ---------- primer plano (cara grande de Pistero con el dato del momento) ----------
function primerPlano(m,ts){
  var pp=$('pp'); if(!pp) return;
  pp.querySelector('.pp-cara').innerHTML='';
  pp.querySelector('.pp-txt').textContent=m.txt; pp.querySelector('.pp-sub').textContent=m.sub||'';
  var pm=pp.querySelector('.pp-masc'); pm.innerHTML=''; var conM=(m.cima||m.fin||m.d<100); if(conM && mascotaCanasto()) pm.innerHTML='<div class="pp-masc-svg">'+mascotaSVG(mascotaCanasto())+'</div>'; else if(conM && mascotaElegida()==='pudu' && MASC.F.cara){ var F=MASC.F.cara, hh=Math.round(F.height*.9), c=document.createElement('canvas'); c.width=F.width; c.height=hh; c.getContext('2d').drawImage(F,0,0,F.width,hh,0,0,F.width,hh); pm.appendChild(c); }
  pp.className='pp on '+m.expr; void pp.offsetWidth; document.body.classList.add('pp-on');
  ppHasta=ts+m.dur/Math.min(2,velX);
  if(m.pose){ poseTemp=m.pose; poseHasta=ppHasta; }
}

// ---------- animación ----------
function frame(ts){
  if(!corriendo) return;
  if(LIVIANO && !window._manual && ultimoPinto!==null && ts-ultimoPinto<31){ requestAnimationFrame(frame); return; }
  ultimoPinto=ts;
  var dt=ultimo===null?16:Math.min(100,ts-ultimo); ultimo=ts;
  var esperaCarga=false;
  if(LIVIANO && modo==='nuevo'){
    var dAct=prog*D[modo].total;
    if(cargaInicial){ var f0=faltanHasta(cargaInicial.hasta); esperaCarga=f0>0 && performance.now()-cargaInicial.t0<8000;
      if(!esperaCarga) cargaInicial=null; actualizarCarga(); }
    if(ts-ultPre>400){ ultPre=ts; tilesTramo(dAct,dAct+3000); }
  }
  var L=D[modo], d=prog*L.total, g=0;
  if(modo==='nuevo') g=L.pend[enD(L,d).i]||0;
  if(intro){ intro.t+=dt; if(intro.t>=intro.dur) intro=null; }
  else if(esperaCarga){ ritmoAct=0; }
  else if(espera>0){ espera-=dt; ritmoAct=0; }
  else {
    // ~5 s por km (como hoy), más lento subiendo y más rápido bajando; frena un poco antes de cada momento
    var ritmo=Math.max(.45,Math.min(1.7,1-g*6));
    if(modo==='nuevo' && L.momentos[sigM]){ var falta=L.momentos[sigM].d-d; if(falta<120 && L.momentos[sigM].cima) ritmo*=Math.max(.05,falta/120); }
    if(LIVIANO && modo==='nuevo' && faltanHasta(d+350)>0) ritmo*=.35;   // la red viene atrasada: frena suave (no se ve el mapa cortado)
    ritmoAct=suave(ritmoAct,ritmo,dt,700);
    prog=Math.min(1,prog+dt/durVuelo()*ritmoAct*velX);
  }
  if(modo==='nuevo'){ var m=L.momentos[sigM], dd=prog*L.total;
    if(m && espera<=0 && dd>=m.d-1){ primerPlano(m,ts); if(m.cima||m.fin||m.pausa){ espera=(m.pausa?1600:m.dur)/Math.min(2,velX); espTot=espera; } sonarMomento(m); sigM++; } }
  pintar(dt,ts,true);
  if(modo==='nuevo'){ var iS=enD(D.nuevo,prog*D.nuevo.total).i; sonidoCuadro(ts,D.nuevo.pend[iS],D.nuevo.vel?D.nuevo.vel[iS]:null); }
  if(prog>=1 && espera<=0){ vientoParar(); corriendo=false; actualizarBoton(); setTimeout(function(){ if(modo==='nuevo') mostrarResumen(); else encuadrar(1800); },900); return; }
  if(!window._manual) requestAnimationFrame(frame);
}
// modo grabación (solo para hacer el video cuadro a cuadro): avanza dt ms de reloj simulado
window._paso=function(dt){ window._manual=true; window._T=(window._T||0)+dt; if(!corriendo){ corriendo=true; ultimo=window._T-dt; precargarInicio(); if(prog===0 && modo==='nuevo') arrancarIntro(); actualizarBoton(); } frame(window._T); return {prog:prog,corriendo:corriendo}; };
window._velX=function(v){ velX=v; };
function capasListas(){ return !!(mapa && mapa.getSource('cabeza') && mapa.getSource('pulso') && mapa.getSource('chispa')); }
function pintar(dt,ts,mover){
  var L=D[modo], d=prog*L.total, q=enD(L,d), p=q.p, brg=rumboEn(L,d);
  marcador.setLngLat(p);
  var gp=null, vp=18, N=L, H=mapa.getContainer().clientHeight;
  var listo=capasListas();
  if(modo==='nuevo'){
    var i=q.i, h=N.alt[i]+(N.alt[i+1]-N.alt[i])*q.f; gp=N.pend[i];
    if(!listo){ marcador.setLngLat(p); $('dKm').innerHTML=fmt(d/1000,1)+'<i>km</i>'; dibujarPerfil(); return; }
    // ---- huella neón ----
    var ini=N.run[i]!==undefined?N.run[i]:i;
    if(N._ini!==ini){ var F=['<=',['get','b'],ini], cc=colorPend(N.pend[ini+1]); ['hecho','hecho-g2','hecho-g3'].forEach(function(l){ mapa.setFilter(l,F); }); mapa.setPaintProperty('cabeza-g3','line-color',cc); mapa.setPaintProperty('cabeza-g2','line-color',cc); mapa.setPaintProperty('cabeza','line-color',neon(cc,.72)); mapa.setPaintProperty('chispa-g','circle-color',cc); N._ini=ini; }
    mapa.getSource('cabeza').setData({type:'Feature',geometry:{type:'LineString',coordinates:N.c.slice(ini,i+1).concat([p])}});
    mapa.getSource('chispa').setData({type:'Point',coordinates:p});
    var t=ts/1000, lat=.5+.5*Math.sin(t*3.9), tit=reduce?1:(.9+.1*Math.sin(t*23)*Math.sin(t*7.3)), esf=Math.min(1,Math.max(0,gp/.08));
    mapa.setPaintProperty('hecho-g3','line-opacity',(.3+.2*lat+.15*esf)*tit); mapa.setPaintProperty('hecho','line-opacity',.85+.15*tit);
    mapa.setPaintProperty('cabeza-g3','line-opacity',(.45+.3*lat+.2*esf)*tit);
    mapa.setPaintProperty('chispa-g','circle-opacity',(.5+.45*lat)*tit);
    // el destello corre por lo pedaleado cada 2,4 s (de la partida hacia Pistero), ~6 % de lo hecho
    var seg=[p,p];
    if(d>200 && !reduce){ var fase=(t%2.4)/2.4, largo=Math.max(150,Math.min(900,d*.06)), fin=Math.min(d,fase*(d+largo)), a0=Math.max(0,fin-largo);
      if(fin-a0>5){ var pa=enD(N,a0); seg=[pa.p]; for(var j=pa.i+1;j<N.c.length && N.cum[j]<fin;j++) seg.push(N.c[j]); seg.push(enD(N,fin).p); } }
    if(seg.length<2||seg[0]===seg[1]) seg=[p,mover2(p,brg)];
    mapa.getSource('pulso').setData({type:'Feature',geometry:{type:'LineString',coordinates:seg}});
    if(N.vel){ $('lAlt').textContent='Velocidad'; $('dAlt').innerHTML=Math.round(N.vel[i])+'<i>km/h</i>'; } else { $('lAlt').textContent='Altura'; $('dAlt').innerHTML=Math.round(h)+'<i>m</i>'; } $('dPend').innerHTML=(gp>=0?'':'−')+fmt(Math.abs(gp*100),1)+'<i>%</i>'; $('dSub').innerHTML=Math.round(N.sub[i])+'<i>m</i>';
    // cuánto lleva subido en esta cuesta (para pasar de cansado a agotado)
    if(ultAlt===null) ultAlt=h; if(gp>0.03) ganCuesta+=Math.max(0,h-ultAlt); else if(gp<0.01) ganCuesta=Math.max(0,ganCuesta-Math.abs(h-ultAlt)*2-dt*.004); ultAlt=h;
    // ---- director de tomas ----
    // la toma se pide ~1,4 s más adelante: la transición queda centrada en el punto del evento
    var adel=1.4*(N.total/durVuelo()*1000)*velX*(ritmoAct||1), T=tomaEn(N,Math.min(N.total,d+adel)), bajo=N.bajo[Math.min(N.c.length-1,enD(N,d+adel).i)]||1;
    var clave=(espera>0?'cima':T.t)+'|'+bajo, P=TOMAS[espera>0?'cima':T.t];
    var meta={off:reduce?0:P.off*bajo,z:reduce?15.6:P.z,pitch:reduce?55:P.pitch,y:P.y};   /* movimiento reducido: una sola toma tranquila */
    if(!cam||!mover&&!corriendo){ cam={off:meta.off,z:meta.z,pitch:meta.pitch,y:meta.y,b:brg,clave:clave,de:null,hacia:meta,t:TRANS}; }
    if(cam.clave!==clave){ cam.de={off:cam.off,z:cam.z,pitchT:cam.pT||cam.pitch,y:cam.y}; cam.hacia=meta; cam.t=0; cam.clave=clave; }
    cam.t+=dt; var e=suaveS(cam.t/TRANS), A=cam.de||{off:meta.off,z:meta.z,pitchT:meta.pitch,y:meta.y}, Bm=cam.hacia;
    if(espera>0 && !reduce){ var k2=1-espera/espTot, ola=suaveS(Math.sin(k2*Math.PI)); Bm=Object.assign({},Bm,{off:ola*40*bajo, z:Bm.z-1.35*ola, pitch:Bm.pitch-8*ola}); }   // cima: se abre hacia el valle, se aleja para mostrarlo todo y vuelve   // en la cima: se abre 40° hacia el valle y vuelve
    cam.off=A.off+giro(A.off,Bm.off)*e; cam.z=A.z+(Bm.z-A.z)*e; cam.y=A.y+(Bm.y-A.y)*e; cam.pT=A.pitchT+(Bm.pitch-A.pitchT)*e; P={pitch:cam.pT};
    // giro del rumbo pausado: máx. 35°/s, así no "tironea" en las curvas
    var gb=giro(cam.b,brg)*(1-Math.exp(-dt/1100)), mx=35*dt/1000; cam.b=(cam.b+Math.max(-mx,Math.min(mx,gb))+360)%360;
    // inclinación: la de la toma, pero nunca tanta como para que el cerro tape (baja rápido, sube lento)
    var bear=(cam.b+cam.off+360)%360, pS=Math.min(P.pitch,pitchSeguro(p,bear,cam.z,P.pitch));
    cam.pitch=suave(cam.pitch,pS,dt,pS<cam.pitch?350:1500);
    var J={center:p,zoom:cam.z,pitch:cam.pitch,bearing:bear,padding:paddingPara(cam.y)};
    if(intro){ var f=Math.min(1,intro.t/intro.dur), e=f<.5?4*f*f*f:1-Math.pow(-2*f+2,3)/2, F=intro.de;
      J={center:[F.c[0]+(p[0]-F.c[0])*e, F.c[1]+(p[1]-F.c[1])*e], zoom:F.z+(J.zoom-F.z)*e, pitch:F.pitch+(J.pitch-F.pitch)*e, bearing:(F.b+giro(F.b,J.bearing)*e+360)%360, padding:{top:Math.round(J.padding.top*e),bottom:Math.round(J.padding.bottom*e),left:0,right:0}}; }
    if(mapa._elevationFreeze && !mapa.isMoving()) mapa._elevationFreeze=false; // ver nota en encuadrar()
    if(mover) mapa.jumpTo(J);
    // ---- cara según la ruta (cambia solo si se mantiene ~0,6 s) ----
    var curvaAd=Math.abs(giro(rumboEn(N,d+20),rumboEn(N,d+140)));
    if(ganCuesta>15) huboCuesta=ts; var trasCuesta=gp<0.02 && ts-huboCuesta<4000 && huboCuesta>0;
    var vReal=N.vel?N.vel[i]:null, enPausa=(N.pausas||[]).some(function(pz){ return Math.abs(pz.d-d)<70; });
    var ex=caraSegun(gp,ganCuesta,N.pend[Math.min(N.pend.length-1,i+14)],exprAct,{vel:vReal,pausa:enPausa,curva:curvaAd,faltan:N.total-d,subidoDia:N.sub[i],trasCuesta:trasCuesta,cima:Math.abs(d-N.cum[N.imax])<150,recorrido:d});
    // familias: dentro de la misma (bajada / subida) la espera NO se reinicia y el cambio es rápido (0,3 s);
    // antes, en una bajada que pasa de −4 % a −12 % y vuelve en 3 s, la cara alternaba y nunca cambiaba
    var fam=function(e){ return /emocionado|adrenalina|sorprendido/.test(e)?'baja':/cansado|enojado|agotado/.test(e)?'sube':e; };
    if(ex!==exprAct){
      if(!exprCand||fam(exprCand.e)!==fam(ex)) exprCand={e:ex,t:ts}; else exprCand.e=ex;
      var esp=fam(ex)===fam(exprAct)?300:Math.max(300,1000/velX);
      if(ts-exprCand.t>esp){ exprAct=exprCand.e; exprCand=null; caraHasta=ts+1700; }
    } else exprCand=null;
    if(D.cimaM) D.cimaM.getElement().style.visibility=Math.abs(d-N.cum[N.imax])<260?'hidden':'visible';
    // ---- mascota ----
    pintarMascota(dt,ts,d,gp,brg);
  } else {
    $('dAlt').innerHTML='–<i>m</i>'; $('dPend').innerHTML='–<i>%</i>'; $('dSub').innerHTML='–<i>m</i>';
    cam=cam||{b:brg}; cam.b=(cam.b+giro(cam.b,brg)*Math.min(1,dt/450)+360)%360;
    if(mover) mapa.jumpTo({center:p,zoom:16.2,pitch:58,bearing:cam.b,padding:paddingPara(.6)});
  }
  if(ts>ppHasta){ var pp2=$('pp'); if(pp2 && pp2.classList.contains('on')){ pp2.classList.remove('on'); document.body.classList.remove('pp-on'); } }
  if(poseTemp && ts>poseHasta) poseTemp=null;
  $('dKm').innerHTML=fmt(d/1000,1)+'<i>km</i>';
  pintarPistero(dt,ts,d,gp,vp,brg);
  dibujarPerfil();
}
function mover2(p,brg){ return mover(p,brg,1); }
function haciaDerecha(p,brg){ try{ var a=mapa.project(p), b=mapa.project(mover(p,brg,25)); return b.x>=a.x; }catch(e){ return true; } }
function pintarPistero(dt,ts,d,gp,vp,brg){
  if(modo==='nuevo' && cajas.capas){
    // la cara que toca (la del momento si hay viñeta); color del anillo = color neón de la pendiente
    rostroCara(exprAct);
    var col=colorPend(gp||0), esf=Math.max(0,Math.min(1,(gp||0)/.1));
    cajas.el.style.setProperty('--c',col);
    // pulso: 1,15 s en plano → 0,42 s en la subida más dura (late más rápido con el esfuerzo)
    cajas.el.style.setProperty('--lat',(1.15-esf*.73).toFixed(2)+'s');
    cajas.el.classList.toggle('suda',esf>.45);
    // se mece (más en la subida) y se inclina hacia el lado de la curva
    var L=D[modo], gi=giro(rumboEn(L,d-10),rumboEn(L,d+45));
    incl+=(Math.max(-12,Math.min(12,gi*.2))-incl)*Math.min(1,dt/350);
    cajas.bob+=dt/1000*(1.6+esf*2.2);
    var dy=reduce?0:Math.sin(cajas.bob*Math.PI*2)*(1.5+esf*2.5), rot=incl+(reduce?0:Math.sin(cajas.bob*Math.PI)*esf*4);
    var kz=cam?Math.max(.8,Math.min(1.28,.8+(cam.z-14.9)*.34)):1; cajas.k=cajas.k?cajas.k+(kz-cajas.k)*Math.min(1,dt/500):kz;   // tamaño según la toma (suave)
    cajas.inn.style.transform='translateY('+dy.toFixed(1)+'px) rotate('+rot.toFixed(1)+'deg) scale('+cajas.k.toFixed(3)+')';
    return;
  }
  var L=D[modo], G=(typeof _pistGestoEsfuerzo==='function')?_pistGestoEsfuerzo(gp,vp):{cad:.68,rapido:0,pose:''};
  if(poseTemp) G=Object.assign({},G,{pose:poseTemp,cad:0});
  // ¿la cámara lo ve de espaldas o de costado? (ángulo entre la cámara y el avance)
  var camB=modo==='nuevo'&&cam?(cam.b+cam.off):brg, rel=giro(brg,camB), nueva=(modo==='nuevo'&&Math.abs(rel)>48)?'lado':'atras';
  if(nueva!==vista){ vista=nueva; var el=cajas.el; el.classList.add('girando'); setTimeout(function(){ el.classList.toggle('de-lado',vista==='lado'); el.classList.remove('girando'); },120); cajas.ladoKey=''; }
  if(vista==='lado'){
    // de costado: la bici real de la app (_pistBiciSVG) con la cara que toca; mira hacia donde avanza en pantalla
    var ex=exprAct, key=ex+'|'+G.pose+'|'+G.rapido+'|'+(G.cad>0);
    if(cajas.ladoKey!==key && typeof _pistBiciSVG==='function'){ var exB=/agotado/.test(ex)?'cansado':/adrenalina/.test(ex)?'emocionado':/orgulloso/.test(ex)?'contento':ex; cajas.lado.innerHTML=_pistBiciSVG(opts,{expr:exB,rapido:!!G.rapido,cadencia:G.cad>0?Math.max(.35,G.cad*.8):.9,pose:G.pose==='puno'||G.pose==='brazos'?'sinmanos':G.pose==='pie'?'pie':'',vehiculo:veh}); cajas.ladoKey=key; }
    cajas.lado.style.transform='scaleX('+(haciaDerecha(enD(L,d).p,brg)?1:-1)*LADO_SVG+')';
    return;
  }
  // de espaldas: esqueleto animado + gira la cabeza hacia la cámara cuando cambia la cara
  var gi=giro(rumboEn(L,d-10),rumboEn(L,d+45));
  incl+=(Math.max(-14,Math.min(14,gi*.22))-incl)*Math.min(1,dt/300);
  var rr=rig?rig.update({cad:G.cad,pose:G.pose||'',sway:G.sway,rapido:G.rapido},dt):{sway:0,cabezaDy:0,cabezaRot:0};
  cajas.incl.style.transform='rotate('+(incl+rr.sway).toFixed(2)+'deg)';
  if(rig){ cajas.cabeza.style.top=(cajas.cabTop+rr.cabezaDy/110*100).toFixed(2)+'%'; cajas.cabeza.style.rotate=rr.cabezaRot.toFixed(2)+'deg'; }
  var quiere=(modo==='nuevo' && ts<caraHasta)?'cara:'+exprAct:'nuca';
  if(cajas.cabKey!==quiere){ cajas.cabKey=quiere; var cb=cajas.cabeza; cb.classList.add('girando'); setTimeout(function(){ cb.innerHTML=quiere==='nuca'?(typeof _pistNucaSVG==='function'?_pistNucaSVG(opts):''):cara(exprAct); cb.classList.remove('girando'); },140); }
}
// el pudú corre al lado: se queda atrás subiendo, se adelanta bajando, salta en la cima y en la llegada
function pintarMascota(dt,ts,d,gp,brg){
  if(!MASC.mk) return;
  var objetivo=d+(gp>0.06?-9:gp>0.035?-5:gp<-0.05?9:gp<-0.03?5:2.5);
  if(espera>0||poseTemp) objetivo=d+3;
  MASC.d=(MASC.d===0&&d>5)?objetivo:suave(MASC.d||0,objetivo,dt,700);
  // va en el mismo punto que Pistero y se separa en pantalla: al costado y un poco hacia la cámara;
  // adelante/atrás según el terreno (se queda atrás subiendo, se adelanta bajando)
  var p=enD(D.nuevo,d).p, a=mapa.project(p), b2=mapa.project(mover(p,brg,25)), vx=b2.x-a.x, vy=b2.y-a.y, L2=Math.hypot(vx,vy)||1; vx/=L2; vy/=L2;
  var nx=-vy, ny=vx; if(ny<0){ nx=-nx; ny=-ny; }                  // perpendicular que apunta hacia abajo de la pantalla (hacia la cámara)
  if(Math.abs(ny)<.3 && nx<0){ nx=-nx; ny=-ny; }                  // con la cámara detrás: a la derecha
  var deLado=Math.abs(ny)>.6;                                     // toma de costado: corre por delante de la bici, en primer plano
  var lon=(MASC.d-d)*6-(deLado?34:0);                              // ±9 m de diferencia → ±54 px; de costado, medio cuerpo atrás
  var de=deLado?38:40;
  MASC.mk.setLngLat(p); MASC.mk.setOffset([Math.round(nx*de+vx*lon), Math.round(ny*de+vy*lon)]);
  var vel=gp>0.06?.55:gp<-0.05?1.5:1, celebra=espera>0||poseTemp==='puno'||poseTemp==='brazos';
  MASC.fase=(MASC.fase+dt/1000/Math.max(.22,.42/vel))%1;
  var enAire=MASC.fase<.5; dibujarCuadro(celebra?'S':enAire?'A':'B');
  var alto=celebra?Math.abs(Math.sin(MASC.fase*Math.PI))*10:(enAire?Math.sin(MASC.fase*2*Math.PI)*7:0), rot=celebra?0:(enAire?-4+MASC.fase*6:3-(MASC.fase-.5)*4);
  var camB=cam?(cam.b+cam.off):brg, rel=giro(brg,camB), flip=vx>=0?1:-1;   // el arte del pudú mira a la derecha
  // de costado se ve de perfil; con la cámara detrás se gira en perspectiva (se va alejando)
  var ry=Math.abs(rel)>48?0:(rel>0?-1:1)*(62-Math.abs(rel)*.6);
  MASC.cv.style.transform='perspective(240px) rotateY('+ry.toFixed(1)+'deg) translateY('+(-alto).toFixed(1)+'px) rotate('+rot.toFixed(1)+'deg) scaleX('+flip+')';
  MASC.som.style.transform='scale('+(1-alto/26).toFixed(2)+')';
}

// ---------- perfil de altura (pintado por pendiente, avanza con Pistero; lo recorrido brilla) ----------
var perfilCache=null;
function perfilBase(W,H,dpr,encendido){ var N=D.nuevo, cv=document.createElement('canvas'); cv.width=W*dpr; cv.height=H*dpr; var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  var lo=N.min-8, hi=N.max+12, top=16, bot=H-14, X=function(d){ return d/N.total*W; }, Y=function(h){ return bot-(h-lo)/(hi-lo)*(bot-top); };
  c.globalAlpha=encendido?.8:.2; for(var i=1;i<N.c.length;i++){ var x0=X(N.cum[i-1]), x1=X(N.cum[i]); c.fillStyle=colorPend(N.pend[i]); c.beginPath(); c.moveTo(x0,bot); c.lineTo(x0,Y(N.alt[i-1])); c.lineTo(x1,Y(N.alt[i])); c.lineTo(x1,bot); c.closePath(); c.fill(); }
  c.globalAlpha=1; c.beginPath(); N.alt.forEach(function(h,k){ var x=X(N.cum[k]), y=Y(h); if(k) c.lineTo(x,y); else c.moveTo(x,y); });
  if(encendido){ c.save(); c.shadowColor='#7dd3fc'; c.shadowBlur=10; c.strokeStyle='#fff'; c.lineWidth=2; c.stroke(); c.restore(); } else { c.strokeStyle='rgba(255,255,255,.5)'; c.lineWidth=1.2; c.stroke(); }
  return cv; }
function dibujarPerfil(){
  var cv=$('cv'), N=D.nuevo; if(!N||!N.alt) return;
  if(LIVIANO && modo==='nuevo'){ var dpr0=window.devicePixelRatio||1, W0=cv.clientWidth, H0=cv.clientHeight, k0=W0+'x'+H0+'@'+dpr0;
    if(!perfilCache||perfilCache.k!==k0){ perfilCache={k:k0,apag:perfilBase(W0,H0,dpr0,false),enc:perfilBase(W0,H0,dpr0,true)}; }
    if(cv.width!==W0*dpr0){ cv.width=W0*dpr0; cv.height=H0*dpr0; }
    var c0=cv.getContext('2d'); c0.setTransform(1,0,0,1,0,0); c0.clearRect(0,0,cv.width,cv.height); c0.drawImage(perfilCache.apag,0,0);
    var px=Math.round(prog*W0*dpr0); if(px>0) c0.drawImage(perfilCache.enc,0,0,px,cv.height,0,0,px,cv.height);
    c0.setTransform(dpr0,0,0,dpr0,0,0);
    var lo0=N.min-8, hi0=N.max+12, top0=16, bot0=H0-14, X0=function(d){ return d/N.total*W0; }, Y0=function(h){ return bot0-(h-lo0)/(hi0-lo0)*(bot0-top0); }, pd0=prog*N.total;
    c0.fillStyle='#9fb3c8'; c0.font='600 10px system-ui'; c0.fillText(Math.round(N.max)+' m',4,11); c0.fillText(Math.round(N.min)+' m',4,H0-3); c0.textAlign='right'; c0.fillText(fmt(N.total/1000,1)+' km',W0-4,H0-3); c0.textAlign='left';
    N.momentos.forEach(function(m){ var kk=enD(N,m.d); c0.fillStyle=m.d<=pd0?'#ffd700':'rgba(255,215,0,.45)'; c0.beginPath(); c0.arc(X0(m.d),Y0(N.alt[kk.i])-7,2.6,0,7); c0.fill(); });
    var q0=enD(N,pd0), h0=N.alt[q0.i]+(N.alt[q0.i+1]-N.alt[q0.i])*q0.f, x0=X0(pd0), y0=Y0(h0);
    c0.strokeStyle='rgba(255,255,255,.5)'; c0.setLineDash([3,3]); c0.beginPath(); c0.moveTo(x0,top0-6); c0.lineTo(x0,bot0); c0.stroke(); c0.setLineDash([]);
    c0.fillStyle='#fc4c02'; c0.strokeStyle='#fff'; c0.lineWidth=2; c0.beginPath(); c0.arc(x0,y0,5,0,7); c0.fill(); c0.stroke();
    return; }
  var dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight; if(cv.width!==W*dpr){ cv.width=W*dpr; cv.height=H*dpr; }
  var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
  var lo=N.min-8, hi=N.max+12, top=16, bot=H-14, X=function(d){ return d/N.total*W; }, Y=function(h){ return bot-(h-lo)/(hi-lo)*(bot-top); };
  var pd=prog*N.total;
  for(var i=1;i<N.c.length;i++){ var x0=X(N.cum[i-1]), x1=X(N.cum[i]); c.fillStyle=colorPend(N.pend[i]); c.globalAlpha=(N.cum[i]<=pd?.8:.2); c.beginPath(); c.moveTo(x0,bot); c.lineTo(x0,Y(N.alt[i-1])); c.lineTo(x1,Y(N.alt[i])); c.lineTo(x1,bot); c.closePath(); c.fill(); }
  c.globalAlpha=1; c.strokeStyle='rgba(255,255,255,.5)'; c.lineWidth=1.2; c.beginPath(); N.alt.forEach(function(h,k){ var x=X(N.cum[k]), y=Y(h); if(k) c.lineTo(x,y); else c.moveTo(x,y); }); c.stroke();
  c.fillStyle='#9fb3c8'; c.font='600 10px system-ui'; c.fillText(Math.round(N.max)+' m',4,11); c.fillText(Math.round(N.min)+' m',4,H-3); c.textAlign='right'; c.fillText(fmt(N.total/1000,1)+' km',W-4,H-3); c.textAlign='left';
  if(modo==='hoy'){ c.fillStyle='rgba(10,15,29,.72)'; c.fillRect(0,0,W,H); c.fillStyle='#e8edf6'; c.font='700 12px system-ui'; c.textAlign='center'; c.fillText('Hoy el sobrevuelo no muestra la altura',W/2,H/2+4); c.textAlign='left'; return; }
  if(pd>0){ c.save(); c.shadowColor='#7dd3fc'; c.shadowBlur=10; c.strokeStyle='#fff'; c.lineWidth=2; c.beginPath(); for(var k=0;k<N.c.length && N.cum[k]<=pd;k++){ var xx=X(N.cum[k]), yy=Y(N.alt[k]); if(k) c.lineTo(xx,yy); else c.moveTo(xx,yy); } c.stroke(); c.restore(); }
  // momentos marcados en el perfil
  N.momentos.forEach(function(m){ var kk=enD(N,m.d), x=X(m.d), y=Y(N.alt[kk.i]); c.fillStyle=m.d<=pd?'#ffd700':'rgba(255,215,0,.45)'; c.beginPath(); c.arc(x,y-7,2.6,0,7); c.fill(); });
  var q=enD(N,pd), h=N.alt[q.i]+(N.alt[q.i+1]-N.alt[q.i])*q.f, x=X(pd), y=Y(h);
  c.strokeStyle='rgba(255,255,255,.5)'; c.setLineDash([3,3]); c.beginPath(); c.moveTo(x,top-6); c.lineTo(x,bot); c.stroke(); c.setLineDash([]);
  c.save(); c.shadowColor='#fc4c02'; c.shadowBlur=12; c.fillStyle='#fc4c02'; c.strokeStyle='#fff'; c.lineWidth=2; c.beginPath(); c.arc(x,y,5,0,7); c.fill(); c.stroke(); c.restore();
}
})();
