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
var RUTA={nombre:'Futrono → Llifén'}; // demo: en la app = r.nombreRuta
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
function limpiarHoy(pts){ var out=[]; pts.forEach(function(p){ var u=out[out.length-1]; if(u && hav([u.lon,u.lat],[p.lon,p.lat])/((p.t-u.t)/1000)>22) return; out.push(p); }); return out; }

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
  for(var d=600; d<T; d+=900){ k++; toma(d,d+900,k%3===0?'aerea':k%3===2?'paralelo':'persecucion',{lado:(lado=-lado),base:true}); }
  subidas.forEach(function(s,ix){ if(s.gan<8) return; toma(s.d0-150,s.d0+420,'subida'); toma(s.d0+420,Math.max(s.d1,s.d0+1000),'lateral',{lado:ix%2?1:-1}); });
  bajadas.forEach(function(b){ if(-b.gan<8) return; toma(b.d0-60,Math.max(b.d1,b.d0+650),'bajada'); });
  toma(0,600,'aerea');
  // 2) secuencia final: se recorre cada 25 m y se funden las tomas de menos de 550 m (~3 s a ×1) con la anterior
  var seq=[], MIN=550;
  for(var x=0; x<T; x+=25){ var e=null,b=null; P.forEach(function(p){ if(x>=p.d0&&x<p.d1){ if(p.base) b=p; else e=p; } }); var t=e||b||{t:'persecucion',lado:1}, u=seq[seq.length-1];
    if(u && u.t===t.t && (u.lado||1)===(t.lado||1)) u.d1=x+25; else seq.push({t:t.t,lado:t.lado||1,ev:!!e,d0:x,d1:x+25}); }
  // las tomas de evento mandan: una normal corta se funde con la vecina; nunca se pierde una subida/bajada
  var corta=function(q){ return q.d1-q.d0<MIN; }, cambio=true;
  while(cambio){ cambio=false;
    for(var j=0;j<seq.length;j++){ var q=seq[j]; if(!corta(q)) continue;
      var A=seq[j-1], B=seq[j+1];
      if(!q.ev){ if(A){ A.d1=q.d1; } else if(B){ B.d0=q.d0; } else continue; seq.splice(j,1); cambio=true; break; }
      if(A && !A.ev && A.d1-A.d0>MIN){ var falta=Math.min(MIN-(q.d1-q.d0),A.d1-A.d0-MIN); if(falta>0){ q.d0-=falta; A.d1-=falta; cambio=true; break; } }
      if(B && !B.ev && B.d1-B.d0>MIN){ var f2=Math.min(MIN-(q.d1-q.d0),B.d1-B.d0-MIN); if(f2>0){ q.d1+=f2; B.d0+=f2; cambio=true; break; } }
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
  C.push({d:30,pri:9,expr:'contento',txt:'¡Partimos!',sub:fmt(T/1000,1)+' km y +'+Math.round(N.sub[N.sub.length-1])+' m por delante',dur:2000});
  C.push({d:N.cum[N.imax],pri:10,expr:'orgulloso',txt:'¡Cima!',sub:'lo más alto del viaje',dur:2800,cima:true,pose:'puno'});
  C.push({d:T,pri:10,expr:'contento',txt:'¡Llegamos!',sub:D.dur?'en '+durTxt(D.dur):'',dur:2600,pose:'brazos',fin:true});
  C.sort(function(a,b){ return b.pri-a.pri; });
  var hueco=T/9, M=[]; C.forEach(function(c){ if(M.length<7 && M.every(function(m){ return Math.abs(m.d-c.d)>=hueco; })) M.push(c); });
  M.sort(function(a,b){ return a.d-b.d; });
  // frases y caras sin repetir; el cansancio se acumula (cuesta dura o mucho subido → agotado)
  var ns=0, na=0, nb=0, prev='';
  M.forEach(function(m){
    if(m.tipo==='sube'){ var f=m.dura?['agotado',FA[na++%FA.length]]:FS[ns++%FS.length]; if(f[0]===prev) f=FS[ns++%FS.length]; m.expr=f[0]; m.txt=f[1]; }
    if(m.tipo==='baja'){ var g=FB[nb++%FB.length]; if(g[0]===prev) g=FB[nb++%FB.length]; m.expr=g[0]; m.txt=g[1]; }
    prev=m.expr; });
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
var TRANS=2800; // ms de cada cambio de plano (curva suave de entrada y salida)
// zona libre del mapa (entre la barra de arriba y el panel de abajo) y dónde va Pistero dentro de ella (0 = arriba, 1 = abajo)
function zonaLibre(){ var H=mapa.getContainer().clientHeight, pn=document.querySelector('.panel'), br=document.querySelector('.barra');
  var abajo=pn?Math.round(pn.getBoundingClientRect().height)-8:200, arriba=br?Math.round(br.getBoundingClientRect().bottom)+8:70; return {H:H,arriba:arriba,abajo:abajo,libre:Math.max(120,H-arriba-abajo)}; }
// padding para que el punto quede a la fracción y de la zona libre (MapLibre centra el punto en el área con padding)
function paddingPara(y){ var Z=zonaLibre(), py=Z.arriba+Z.libre*y, top=Math.max(0,Math.round(2*py-(Z.H-Z.abajo))); return {top:top,bottom:Z.abajo,left:0,right:0}; }
function suaveS(x){ x=Math.max(0,Math.min(1,x)); return x*x*x*(x*(x*6-15)+10); } // smootherstep

// ---------- caras: las 10 de la app + 3 nuevas armadas sobre su misma cara ----------
function cara(expr){
  if(typeof _pistoDe!=='function') return '';
  function mas(base,extra){ var s=_pistoDe(opts,base); return s.replace(/<\/svg>\s*$/,extra+'</svg>'); }
  var gota=function(x,y,s){ return '<path d="M'+x+' '+y+' q'+(2.6*s)+' '+(4.6*s)+' 0 '+(7.4*s)+' q'+(-2.6*s)+' '+(-2.8*s)+' 0 '+(-7.4*s)+'z" fill="#7fd0ff" stroke="#3b9fd6" stroke-width=".6"/>'; };
  if(expr==='agotado') return mas('cansado','<ellipse cx="30" cy="71" rx="7" ry="4" fill="#ff6b81" opacity=".55"/><ellipse cx="70" cy="71" rx="7" ry="4" fill="#ff6b81" opacity=".55"/><ellipse cx="50" cy="75" rx="5.2" ry="4.6" fill="#5a2f1a"/><path d="M46.5 77 Q50 82.5 53.5 77 Z" fill="#ff7a90"/>'+gota(20,52,1)+gota(83,49,.8)+'<path d="M16 40 q-4 -3 -2 -8 M86 36 q4 -3 2 -8" stroke="#94a3b8" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
  if(expr==='adrenalina') return mas('emocionado','<ellipse cx="30" cy="71" rx="6.5" ry="3.6" fill="#ff6b81" opacity=".5"/><ellipse cx="70" cy="71" rx="6.5" ry="3.6" fill="#ff6b81" opacity=".5"/><g stroke="#e0f2fe" stroke-width="2" stroke-linecap="round" opacity=".95"><path d="M2 56 L13 56"/><path d="M0 64 L11 64"/><path d="M3 72 L12 72"/><path d="M88 56 L99 56"/><path d="M89 64 L100 64"/></g>');
  if(expr==='orgulloso') return mas('contento','<g fill="#ffd700" stroke="#b45309" stroke-width=".6"><path d="M12 30 l2 5 5 .6 -4 3 1.3 5 -4.3 -2.8 -4.3 2.8 1.3 -5 -4 -3 5 -.6z"/><path d="M87 24 l1.5 3.8 3.8 .4 -3 2.3 1 3.8 -3.3 -2.1 -3.3 2.1 1 -3.8 -3 -2.3 3.8 -.4z"/></g>');
  return _pistoDe(opts,expr);
}
// qué cara pone según lo que da la ruta (pendiente, cuánto lleva subido en esta cuesta, bajada)
function caraSegun(g,ganCuesta,gAdelante,act){
  // bandas con histéresis: para entrar a un estado hay que pasar el umbral; para salir, bajar de uno menor
  var sube=act==='cansado'||act==='enojado'||act==='agotado', baja=act==='emocionado'||act==='adrenalina';
  if(g>(sube?0.07:0.085)) return ganCuesta>25?'agotado':'enojado';
  if(g>(sube?0.03:0.045)) return ganCuesta>45?'agotado':'cansado';
  if(g<(baja?-0.05:-0.07)) return 'adrenalina';
  if(g<(baja?-0.02:-0.035)) return 'emocionado';
  if(gAdelante>0.06 && g<0.02) return 'preocupado';          // ve venir la cuesta
  return 'feliz';
}

// ---------- estado ----------
var mapa, modo='nuevo', capa='sat', D={}, marcador=null, rig=null, cajas={}, opts=(typeof _pistOpts==='function')?_pistOpts():{}, veh=(typeof _pistVehiculo==='function')?_pistVehiculo(opts,'ciclismo'):'';
var ritmoAct=0, intro=null, espTot=1, prog=0, corriendo=false, ultimo=null, velX=1, incl=0, cam=null, espera=0, sigM=0, ppHasta=0, exprAct='feliz', exprCand=null, vista='atras', caraHasta=0, poseTemp=null, poseHasta=0, ganCuesta=0, ultAlt=null;
var MASC={on:true, F:{}, d:0, fase:0, mk:null, cv:null, ultCuadro:''};
// mascota = la que eligió el usuario (opts.mascota). Las de la app (quiltro, perro negro, gato) van en el
// canasto: se ven en la bici de costado y, de espaldas, asomadas junto al manubrio. Las nuevas de
// feature/mascotas (pudú…) corren al lado; solo el pudú tiene arte de carrera todavía.
var MASC_CORREN={pudu:'Pudú (nueva)'};
function mascotaElegida(){ return opts.mascota||''; }
function mascotaCanasto(){ var id=mascotaElegida(); return (typeof PIST_MASCOTA!=='undefined' && PIST_MASCOTA.some(function(m){ return m.id===id && id; }))?id:''; }
function mascotaSVG(id){ return typeof _bMascota==='function'?'<svg viewBox="-9 -16 20 18" xmlns="http://www.w3.org/2000/svg">'+_bMascota(id,[0,0],true)+'</svg>':''; }

Promise.all([fetch('traza-gps.json').then(function(r){return r.json();}), fetch('traza-pegada.json').then(function(r){return r.json();}), cargarMascota()]).then(function(r){
  D.hoy=linea(limpiarHoy(r[0]).map(function(p){ return [p.lon,p.lat]; }));
  D.dur=r[0][r[0].length-1].t-r[0][0].t; // duración real del viaje (horas de los puntos)
  D.nuevo=linea(densificar(r[1],12));
  return alturas(D.nuevo.c).then(function(a){
    var N=D.nuevo; N.alt=suavizar(suavizar(a,N.cum,60),N.cum,60); N.pend=pendientes(N.alt,N.cum,100);
    var sub=0, ref=N.alt[0]; N.sub=N.alt.map(function(h){ if(h>ref+2){ sub+=h-ref; ref=h; } else if(h<ref-2) ref=h; return sub; });
    N.min=Math.min.apply(null,N.alt); N.max=Math.max.apply(null,N.alt); N.imax=N.alt.indexOf(N.max);
    return demPrecargar(N.c).then(function(){ ladoBajo(N); planear(N); iniciar(); });
  });
}).catch(function(e){ $('cargando').textContent='No se pudo cargar: '+e.message; console.error(e); });

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

function arrancarIntro(){ var c=mapa.getCenter(); intro={t:0,dur:2800,de:{c:[c.lng,c.lat],z:mapa.getZoom(),pitch:mapa.getPitch(),b:mapa.getBearing()}}; }
function reiniciarEstado(){ intro=null; ritmoAct=0; cam=null; espera=0; sigM=0; MASC.d=0; ganCuesta=0; ultAlt=null; exprAct='feliz'; exprCand=null; caraHasta=0; poseTemp=null; ppHasta=0; incl=0; var pp=$('pp'); if(pp) pp.classList.remove('on'); document.body.classList.remove('pp-on'); }
function iniciar(){
  mapa=new maplibregl.Map({container:'mapa',style:SAT,center:D.nuevo.c[0],zoom:12,pitch:0,maxPitch:85,attributionControl:{compact:true}});
  mapa.on('style.load',montarCapas); window._demo=mapa;
  window._ir=function(p){ reiniciarEstado(); prog=p; while(sigM<D.nuevo.momentos.length && D.nuevo.momentos[sigM].d<p*D[modo].total) sigM++; MASC.d=p*D[modo].total; pintar(16,performance.now(),true); };
  window._ver=function(ix,avance){ var N=D.nuevo, m=N.momentos[ix]; window._ir(Math.min(1,(m.d+1)/N.total)); var ts=performance.now(); primerPlano(m,ts); exprAct=m.expr; caraHasta=ts+5000; if(m.cima){ espTot=2800; espera=2800*(1-(avance||0)); } cam=null; pintar(16,ts,true); };
  window._tomas=function(){ return D.nuevo.seq.map(function(p){ return p.t+' '+Math.round(p.d0)+'-'+Math.round(p.d1); }).concat(D.nuevo.momentos.map(function(m){ return 'cara '+m.expr+' @'+Math.round(m.d)+' '+m.txt; })); };
  mapa.once('load',function(){ $('cargando').style.display='none'; encuadrar(0); dibujarPerfil(); });
  $('modo').onclick=function(e){ var m=e.target.dataset.m; if(!m||m===modo) return; modo=m; marcarSeg('modo','m',m); reiniciar(); };
  $('capa').onclick=function(e){ var c=e.target.dataset.c; if(!c||c===capa) return; capa=c; marcarSeg('capa','c',c); mapa.setStyle(c==='sat'?SAT:CALLES,{diff:false}); };
  $('play').onclick=function(){ if(prog>=1){ prog=0; reiniciarEstado(); } corriendo=!corriendo; actualizarBoton(); if(corriendo){ ultimo=null; if(prog===0 && modo==='nuevo') arrancarIntro(); requestAnimationFrame(frame); } };
  var sm=$('mascota'); if(sm){ var lst=(typeof PIST_MASCOTA!=='undefined'?PIST_MASCOTA:[]).map(function(m){ return [m.id,m.n]; }).concat([['pudu',MASC_CORREN.pudu]]); sm.innerHTML=lst.map(function(o){ return '<option value="'+o[0]+'">'+o[1]+'</option>'; }).join(''); sm.value=opts.mascota||''; /* Inty 2026-10-07: por ahora sin mascota (queda lista para después) */ opts.mascota=sm.value; sm.onchange=function(){ opts.mascota=sm.value; if(mapa) montarDeNuevo(); }; }
  $('vel').onclick=function(){ velX=velX===1?2:velX===2?4:1; this.textContent='×'+velX; };
  var pf=$('perfil'), arrastrando=false;
  function irA(ev){ var r=pf.getBoundingClientRect(); window._ir(Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width))); }
  pf.addEventListener('pointerdown',function(ev){ arrastrando=true; pf.setPointerCapture(ev.pointerId); irA(ev); });
  pf.addEventListener('pointermove',function(ev){ if(arrastrando) irA(ev); });
  pf.addEventListener('pointerup',function(){ arrastrando=false; });
  window.addEventListener('resize',dibujarPerfil);
  nota();
  $('tit').textContent=RUTA.nombre; $('titSub').textContent=fmt(D.nuevo.total/1000,1)+' km · ruta de demostración (camino real OSM, GPS simulado)';
}
function marcarSeg(id,k,v){ [].forEach.call($(id).children,function(b){ b.classList.toggle('on',b.dataset[k]===v); }); }
function actualizarBoton(){ document.body.classList.toggle('corriendo',corriendo); $('play').textContent=corriendo?'❚❚ Pausa':(prog>=1?'↺ Ver de nuevo':'▶ '+(prog>0?'Seguir':'Ver sobrevuelo')); }
function nota(){ $('nota').innerHTML=modo==='hoy'
  ? '<b>Así funciona hoy.</b> La línea es el GPS tal cual se graba (aquí con el error típico de un teléfono, simulado): zigzaguea y se sale del camino. Pistero va anclado por el <b>centro</b>, así que flota corrido de la línea. Mapa plano, sin relieve.'
  : '<b>Propuesta.</b> Huella neón pegada al camino, relieve real, tomas que cambian según la ruta (aérea, lateral, bajada, giro en la cima), y primeros planos de Pistero.'; }

function montarCapas(){
  var m=mapa, N=D.nuevo, H=D.hoy, vis=modo==='nuevo'?'visible':'none';
  if(!m.getSource('dem')) m.addSource('dem',{type:'raster-dem',tiles:[DEM_TILE],encoding:'terrarium',tileSize:512,maxzoom:12,attribution:'© Mapterhorn'});
  if(modo==='nuevo'){
    m.setTerrain({source:'dem',exaggeration:EXAG});
    try{ m.setSky({'sky-color':'#5f8fc4','horizon-color':'#c9d8e6','fog-color':'#aebfd0','sky-horizon-blend':.6,'horizon-fog-blend':.45,'fog-ground-blend':.25}); }catch(e){}
    if(capa==='calles' && !m.getLayer('relieve')){ var antes; m.getStyle().layers.some(function(l){ if(l.type==='symbol'){ antes=l.id; return true; } }); if(!m.getSource('dem-sombra')) m.addSource('dem-sombra',{type:'raster-dem',tiles:[DEM_TILE],encoding:'terrarium',tileSize:512,maxzoom:12}); m.addLayer({id:'relieve',type:'hillshade',source:'dem-sombra',paint:{'hillshade-exaggeration':.5,'hillshade-shadow-color':'#5b4a3a'}},antes); }
    // fondo apagado para que el neón destaque (la técnica "firefly" pide base oscura y desaturada)
    if(m.getLayer('sat')){ m.setPaintProperty('sat','raster-brightness-max',.5); m.setPaintProperty('sat','raster-saturation',-.45); }
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
  m.addLayer({id:'pulso-g',type:'line',source:'pulso',layout:LJ,paint:{'line-gradient':G(.6),'line-width':Wz(12,30),'line-blur':Wz(6,15)}});
  m.addLayer({id:'pulso',type:'line',source:'pulso',layout:LJ,paint:{'line-gradient':G(1),'line-width':Wz(2,5)}});
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
  var Z=zonaLibre(), pad={top:Z.arriba+10,bottom:Z.abajo+10,left:24,right:24}, C=mapa.cameraForBounds(b,{padding:pad});
  if(!C) return; var T={c:[C.center.lng,C.center.lat],z:C.zoom-(modo==='nuevo'?.25:0),pitch:modo==='nuevo'?30:0,b:0,pad:pad};
  var c0=mapa.getCenter(), F={c:[c0.lng,c0.lat],z:mapa.getZoom(),pitch:mapa.getPitch(),b:mapa.getBearing(),pad:mapa.getPadding()};
  cancelAnimationFrame(encuadreRAF); var t0=null;
  (function paso(ts){ if(t0===null) t0=ts; var e=ms>0?suaveS((ts-t0)/ms):1, L=function(a,b){ return a+(b-a)*e; };
    mapa.jumpTo({center:[L(F.c[0],T.c[0]),L(F.c[1],T.c[1])],zoom:L(F.z,T.z),pitch:L(F.pitch,T.pitch),bearing:(F.b+giro(F.b,T.b)*e+360)%360,padding:{top:L(F.pad.top,T.pad.top),bottom:L(F.pad.bottom,T.pad.bottom),left:L(F.pad.left,T.pad.left),right:L(F.pad.right,T.pad.right)}});
    if(e<1 && !corriendo) encuadreRAF=requestAnimationFrame(paso); })(performance.now());
}

// ---------- Pistero: de espaldas (esqueleto animado) o de costado (con su cara) según la cámara ----------
function crearMarcador(){
  if(marcador) marcador.remove();
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
  pp.querySelector('.pp-cara').innerHTML=cara(m.expr);
  pp.querySelector('.pp-txt').textContent=m.txt; pp.querySelector('.pp-sub').textContent=m.sub||'';
  var pm=pp.querySelector('.pp-masc'); pm.innerHTML=''; var conM=(m.cima||m.fin||m.d<100); if(conM && mascotaCanasto()) pm.innerHTML='<div class="pp-masc-svg">'+mascotaSVG(mascotaCanasto())+'</div>'; else if(conM && mascotaElegida()==='pudu' && MASC.F.cara){ var F=MASC.F.cara, hh=Math.round(F.height*.9), c=document.createElement('canvas'); c.width=F.width; c.height=hh; c.getContext('2d').drawImage(F,0,0,F.width,hh,0,0,F.width,hh); pm.appendChild(c); }
  pp.className='pp on '+m.expr; void pp.offsetWidth; document.body.classList.add('pp-on');
  ppHasta=ts+m.dur/Math.min(2,velX);
  if(m.pose){ poseTemp=m.pose; poseHasta=ppHasta; }
}

// ---------- animación ----------
function frame(ts){
  if(!corriendo) return;
  var dt=ultimo===null?16:Math.min(100,ts-ultimo); ultimo=ts;
  var L=D[modo], d=prog*L.total, g=0;
  if(modo==='nuevo') g=L.pend[enD(L,d).i]||0;
  if(intro){ intro.t+=dt; if(intro.t>=intro.dur) intro=null; }
  else if(espera>0){ espera-=dt; ritmoAct=0; }
  else {
    // ~5 s por km (como hoy), más lento subiendo y más rápido bajando; frena un poco antes de cada momento
    var ritmo=Math.max(.45,Math.min(1.7,1-g*6));
    if(modo==='nuevo' && L.momentos[sigM]){ var falta=L.momentos[sigM].d-d; if(falta<120 && L.momentos[sigM].cima) ritmo*=Math.max(.05,falta/120); }
    ritmoAct=suave(ritmoAct,ritmo,dt,700);
    prog=Math.min(1,prog+dt/(L.total/1000*5000)*ritmoAct*velX);
  }
  if(modo==='nuevo'){ var m=L.momentos[sigM], dd=prog*L.total;
    if(m && espera<=0 && dd>=m.d-1){ primerPlano(m,ts); if(m.cima||m.fin){ espera=m.dur/Math.min(2,velX); espTot=espera; } sigM++; } }
  pintar(dt,ts,true);
  if(prog>=1 && espera<=0){ corriendo=false; actualizarBoton(); setTimeout(function(){ encuadrar(1800); },900); return; }
  if(!window._manual) requestAnimationFrame(frame);
}
// modo grabación (solo para hacer el video cuadro a cuadro): avanza dt ms de reloj simulado
window._paso=function(dt){ window._manual=true; window._T=(window._T||0)+dt; if(!corriendo){ corriendo=true; ultimo=window._T-dt; if(prog===0 && modo==='nuevo') arrancarIntro(); actualizarBoton(); } frame(window._T); return {prog:prog,corriendo:corriendo}; };
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
    $('dAlt').innerHTML=Math.round(h)+'<i>m</i>'; $('dPend').innerHTML=(gp>=0?'':'−')+fmt(Math.abs(gp*100),1)+'<i>%</i>'; $('dSub').innerHTML=Math.round(N.sub[i])+'<i>m</i>';
    // cuánto lleva subido en esta cuesta (para pasar de cansado a agotado)
    if(ultAlt===null) ultAlt=h; if(gp>0.03) ganCuesta+=Math.max(0,h-ultAlt); else if(gp<0.01) ganCuesta=Math.max(0,ganCuesta-Math.abs(h-ultAlt)*2-dt*.004); ultAlt=h;
    // ---- director de tomas ----
    // la toma se pide ~1,4 s más adelante: la transición queda centrada en el punto del evento
    var adel=1.4*(1000/5)*velX*(ritmoAct||1), T=tomaEn(N,Math.min(N.total,d+adel)), bajo=N.bajo[Math.min(N.c.length-1,enD(N,d+adel).i)]||1;
    var clave=(espera>0?'cima':T.t)+'|'+bajo, P=TOMAS[espera>0?'cima':T.t];
    var meta={off:P.off*bajo,z:P.z,pitch:P.pitch,y:P.y};
    if(!cam||!mover&&!corriendo){ cam={off:meta.off,z:meta.z,pitch:meta.pitch,y:meta.y,b:brg,clave:clave,de:null,hacia:meta,t:TRANS}; }
    if(cam.clave!==clave){ cam.de={off:cam.off,z:cam.z,pitchT:cam.pT||cam.pitch,y:cam.y}; cam.hacia=meta; cam.t=0; cam.clave=clave; }
    cam.t+=dt; var e=suaveS(cam.t/TRANS), A=cam.de||{off:meta.off,z:meta.z,pitchT:meta.pitch,y:meta.y}, Bm=cam.hacia;
    if(espera>0){ var k2=1-espera/espTot; Bm=Object.assign({},Bm,{off:suaveS(Math.sin(k2*Math.PI))*40*bajo}); }   // en la cima: se abre 40° hacia el valle y vuelve
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
    var ex=caraSegun(gp,ganCuesta,N.pend[Math.min(N.pend.length-1,i+14)],exprAct);
    if(ts<ppHasta){ var pp=$('pp'); ex=(pp&&pp.classList[2])||ex; }
    if(ex!==exprAct){ if(!exprCand||exprCand.e!==ex) exprCand={e:ex,t:ts}; else if(ts-exprCand.t>1200){ exprAct=ex; exprCand=null; caraHasta=ts+1700; } }
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
function dibujarPerfil(){
  var cv=$('cv'), N=D.nuevo; if(!N||!N.alt) return;
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
