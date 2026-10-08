/* ===== VIDEO DEL SOBREVUELO PARA REDES (2026-10-08) — separado de sobrevuelo-3d.js (gate de 1000 líneas) =====
   ==================== VIDEO PARA REDES (Inty 2026-10-08, maqueta aprobada: disenos-ui/sobrevuelo-video/) ====================
   "debería ser solamente el sobrevuelo para descargar y compartir": reemplaza al Video 3D de rutas.js.
   El sobrevuelo se graba cuadro a cuadro con reloj simulado (como SB3DBG._paso): el mapa a 1080x1920 reales (contenedor
   360x640 CSS con pixelRatio 3) y encima, en el MISMO canvas, todo lo que en la pantalla es HTML (Pistero, el cartel del
   momento, los 4 datos, el perfil, la marca): un marcador DOM no sale en el canvas del mapa (eso dejaba a Pistero fuera
   del Video 3D el 2026-07-14). MP4 H.264 con WebCodecs + mp4-muxer (mp4-muxer.js, local): Instagram no acepta WebM.
   Zonas libres (Ignite Social Media, jul. 2025): nada importante en los 220 px de arriba ni en los 420 de abajo (Reels),
   ni en los 120 de la derecha (TikTok).
   Cómo se conecta: sobrevuelo-3d.js llama SB3Video.sync({...}) con el estado del vuelo (mapa, D, prog, Pistero…) antes de
   cada llamada (función V() de allá), así este archivo nunca lee un estado viejo. La grabación misma (el bucle que mueve
   el vuelo cuadro a cuadro) se queda allá porque cambia el estado del vuelo. */
(function(){
var mapa=null, marcador=null, D=null, cajas=null, exprAct=null, prog=null, capa=null, GRAB=null, RUTA=null, fmt=null, colorPend=null, enD=null, $=null, cara=null, sb3Raiz=null;
function sync(s){ mapa=s.mapa; marcador=s.marcador; D=s.D; cajas=s.cajas; exprAct=s.exprAct; prog=s.prog; capa=s.capa; GRAB=s.GRAB; RUTA=s.RUTA; fmt=s.fmt; colorPend=s.colorPend; enD=s.enD; $=s.$; cara=s.cara; sb3Raiz=s.sb3Raiz; }
var VID_ARCHIVO=null;   // el último video hecho
var VID={W:1080,H:1920,K:3,FPS:30,ARR:230,IZQ:60,DER:120,ABA:420,CIERRE:4000,TOPE:55900,BPS:6000000};
var VID_TX='#e8edf6', VID_TX2='#9fb3c8', VID_NAR='#fc4c02', VID_NOCHE='#0a0f1d', VID_SURF='rgba(20,26,43,.86)', VID_BR='rgba(255,255,255,.10)', VID_F='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
var SB3_CODECS=['avc1.640028','avc1.4d0028','avc1.42e028','avc1.64002a','avc1.4d002a','avc1.42e02a'];   // H.264 High/Main/Base, nivel 4.0 (1080x1920 a 30 cps) y 4.2
// el vuelo de la pantalla dura 45–80 s; en el video: entrada 2,8 s + vuelo (~46 s) + paradas + cierre 4 s ≤ 60 s (TOPE corta lo que sobre)
function sb3VideoVel(durMs){ return Math.max(1,(durMs||0)/46000); }
// qué se hace con el video listo: 'app' (la app instalada no deja guardar ni compartir archivos), 'compartir' o 'descargar'
function sb3VideoSalida(file,nav,nativa){ if(nativa) return 'app'; try{ if(file&&nav&&typeof nav.share==='function'&&typeof nav.canShare==='function'&&nav.canShare({files:[file]})) return 'compartir'; }catch(e){} return 'descargar'; }
// primer códec que el teléfono sabe codificar (soporta(cfg) → Promise<bool>, = VideoEncoder.isConfigSupported)
function sb3ElegirCodec(soporta){ var i=0; function sig(){ if(i>=SB3_CODECS.length) return Promise.resolve(null);
  var cfg={codec:SB3_CODECS[i++],width:VID.W,height:VID.H,bitrate:VID.BPS,framerate:VID.FPS};
  return Promise.resolve().then(function(){ return soporta(cfg); }).then(function(r){ return r&&r.supported!==false&&r!==false?cfg:sig(); },sig); } return sig(); }
function vidDurTxt(ms){ var s=Math.round(ms/1000); return s>=55?'1 min':s+' s'; }
function vidEspera(ms){ return new Promise(function(ok){ setTimeout(ok,ms); }); }
function vidImg(src){ return new Promise(function(ok,mal){ var im=new Image(); im.onload=function(){ ok(im); }; im.onerror=function(){ mal(new Error('imagen')); }; im.src=src; }); }
function vidSvg(svg,w,h){ return vidImg('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(String(svg).replace(/<svg /,'<svg width="'+w+'" height="'+h+'" '))); }
function vidRR(c,x,y,w,h,r){ c.beginPath(); if(c.roundRect) c.roundRect(x,y,w,h,r); else c.rect(x,y,w,h); }
function vidTxt(c,t,x,y,size,peso,color,al){ c.font=peso+' '+size+'px '+VID_F; c.fillStyle=color; c.textAlign=al||'left'; c.fillText(t,x,y); c.textAlign='left'; }
function vidFecha(){ var t=RUTA.inicio; return t>0?new Date(t).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}):''; }
function vidLimpio(t){ var x=String(t||''); return x.replace(/\s+/g,' ').trim(); }
// zona libre del cuadro del video (en px del contenedor de 360x640): entre la cabecera con el cartel y los datos de abajo
function vidZonaLibre(){ var K=VID.K, arriba=Math.round((VID.ARR+320)/K), abajo=Math.round((VID.ABA+190+170+24)/K), H=VID.H/K; return {H:H,arriba:arriba,abajo:abajo,libre:Math.max(120,H-arriba-abajo)}; }
function vidLoadMuxer(){ if(window.Mp4Muxer) return Promise.resolve(window.Mp4Muxer);
  return new Promise(function(ok,mal){ var s=document.createElement('script'); s.src='mp4-muxer.js';
    s.onload=function(){ if(window.Mp4Muxer) ok(window.Mp4Muxer); else mal(new Error('No se pudo cargar el armador de video.')); };
    s.onerror=function(){ mal(new Error('No se pudo cargar el armador de video. Revisa la conexión e inténtalo de nuevo.')); }; document.head.appendChild(s); }); }
// el mapa ya dibujado con TODOS sus mosaicos (o lo que alcanzó a llegar en maxMs: sin red, sigue con lo que hay)
function vidEsperarMapa(maxMs){ var t0=Date.now();
  function dibuja(){ try{ if(typeof mapa.redraw==='function') mapa.redraw(); else mapa.triggerRepaint(); }catch(e){} }
  return (function mirar(){ dibuja(); var listo=false; try{ listo=mapa.areTilesLoaded(); }catch(e){ listo=true; }
    if(listo||Date.now()-t0>maxMs){ dibuja(); return Promise.resolve(); } return vidEspera(30).then(mirar); })(); }
// encuadre de todo el viaje en la zona libre del cuadro (para la entrada y el cierre), sin congelar la altura (ver encuadrar)
function vidCamaraTodo(bear){ var N=D.nuevo, b=N.c.reduce(function(b,p){ return [[Math.min(b[0][0],p[0]),Math.min(b[0][1],p[1])],[Math.max(b[1][0],p[0]),Math.max(b[1][1],p[1])]]; },[[180,90],[-180,-90]]);
  var c0=mapa.getCenter(), z0=mapa.getZoom(), p0=mapa.getPitch(), b0=mapa.getBearing(), pd0=mapa.getPadding(), C=null;
  try{ mapa.jumpTo({pitch:0,bearing:bear,padding:{top:0,bottom:0,left:0,right:0}}); C=mapa.cameraForBounds(b,{padding:{top:150,bottom:265,left:30,right:50},bearing:bear}); }catch(e){}
  mapa.jumpTo({center:c0,zoom:z0,pitch:p0,bearing:b0,padding:pd0});
  return C?{c:[C.center.lng,C.center.lat],z:C.zoom-.3,pitch:35,b:bear,pad:{top:0,bottom:0,left:0,right:0}}:null; }
// capas fijas (se dibujan una vez): viñeta, cabeceras y el perfil apagado/encendido
function vidCapas(logo){ var W=VID.W, H=VID.H, mk=function(){ var c=document.createElement('canvas'); c.width=W; c.height=H; return c; }, L={};
  var vi=mk(), c=vi.getContext('2d'), g=c.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgba(10,15,29,.88)'); g.addColorStop(.2,'rgba(10,15,29,.15)'); g.addColorStop(.5,'rgba(10,15,29,0)'); g.addColorStop(.62,'rgba(10,15,29,.25)'); g.addColorStop(.78,'rgba(10,15,29,.9)'); g.addColorStop(1,'rgba(10,15,29,.97)');
  c.fillStyle=g; c.fillRect(0,0,W,H); L.vineta=vi;
  var cab=function(sub){ var cv=document.createElement('canvas'); cv.width=W; cv.height=VID.ARR+140; var x=cv.getContext('2d');
    if(logo) x.drawImage(logo,VID.IZQ-14,VID.ARR-16,150,150);
    var tit=RUTA.nombre||'Mi viaje', fz=60; do{ x.font='800 '+fz+'px '+VID_F; fz-=2; }while(fz>34 && x.measureText(tit).width>W-VID.IZQ-VID.DER-150);
    x.fillStyle=VID_TX; x.fillText(tit,VID.IZQ+150,VID.ARR+62,W-VID.IZQ-VID.DER-150); vidTxt(x,sub,VID.IZQ+152,VID.ARR+108,32,600,VID_TX2); return cv; };
  var f=vidFecha(), km=fmt(D.nuevo.total/1000,1)+' km';
  L.cabVuelo=cab((f?f+' · ':'')+km); L.cabFin=cab('Así fue tu viaje'+(f?' · '+f:''));
  L.perfil=vidPerfilBase(VID.W-VID.IZQ-VID.DER,190); L.perfilFin=vidPerfilBase(VID.W-VID.IZQ-VID.DER,170);
  return L; }
function vidPerfilBase(w,h){ var N=D.nuevo, lo=N.min-8, hi=N.max+12, top=44, bot=h-40, X=function(d){ return d/N.total*w; }, Y=function(v){ return bot-(v-lo)/(hi-lo)*(bot-top); };
  var capa=document.createElement('canvas'); capa.width=w; capa.height=h; var cc=capa.getContext('2d');
  for(var i=1;i<N.c.length;i++){ var x0=Math.floor(X(N.cum[i-1])), x1=Math.ceil(X(N.cum[i]))+.5; cc.fillStyle=colorPend(N.pend[i]); cc.beginPath(); cc.moveTo(x0,bot); cc.lineTo(x0,Y(N.alt[i-1])); cc.lineTo(x1,Y(N.alt[i])); cc.lineTo(x1,bot); cc.closePath(); cc.fill(); }
  var linea=function(c,alfa,ancho,brillo){ c.save(); c.beginPath(); N.alt.forEach(function(v,k){ var xx=X(N.cum[k]), yy=Y(v); if(k) c.lineTo(xx,yy); else c.moveTo(xx,yy); }); if(brillo){ c.shadowColor='#7dd3fc'; c.shadowBlur=18; } c.strokeStyle=alfa; c.lineWidth=ancho; c.stroke(); c.restore(); };
  var apag=document.createElement('canvas'); apag.width=w; apag.height=h; var a=apag.getContext('2d'); a.globalAlpha=.22; a.drawImage(capa,0,0); a.globalAlpha=1; linea(a,'rgba(255,255,255,.45)',2.5,false);
  var enc=document.createElement('canvas'); enc.width=w; enc.height=h; var e=enc.getContext('2d'); e.globalAlpha=.85; e.drawImage(capa,0,0); e.globalAlpha=1; linea(e,'#fff',5,true);
  return {w:w,h:h,top:top,bot:bot,X:X,Y:Y,apag:apag,enc:enc}; }
function vidPerfil(c,P,x,y,pr){ var N=D.nuevo, w=P.w, h=P.h, pd=pr*N.total;
  c.save(); vidRR(c,x,y,w,h,28); c.fillStyle='rgba(15,21,36,.86)'; c.fill(); c.strokeStyle=VID_BR; c.lineWidth=2; c.stroke(); c.clip();
  c.drawImage(P.apag,x,y); var xp=Math.max(0,Math.min(w,P.X(pd))); if(xp>0) c.drawImage(P.enc,0,0,xp,h,x,y,xp,h);
  N.momentos.forEach(function(m){ var q=enD(N,m.d); c.fillStyle=m.d<=pd?'#ffd700':'rgba(255,215,0,.45)'; c.beginPath(); c.arc(x+P.X(m.d),y+P.Y(N.alt[q.i])-18,7,0,7); c.fill(); });
  var q=enD(N,pd), hh=N.alt[q.i]+(N.alt[Math.min(N.alt.length-1,q.i+1)]-N.alt[q.i])*q.f, px=x+Math.max(16,Math.min(w-16,P.X(pd))), py=y+P.Y(hh);   /* el punto no se corta en los bordes */
  c.strokeStyle='rgba(255,255,255,.5)'; c.setLineDash([8,8]); c.lineWidth=2; c.beginPath(); c.moveTo(px,y+P.top-10); c.lineTo(px,y+P.bot); c.stroke(); c.setLineDash([]);
  c.save(); c.shadowColor=VID_NAR; c.shadowBlur=24; c.fillStyle=VID_NAR; c.strokeStyle='#fff'; c.lineWidth=5; c.beginPath(); c.arc(px,py,13,0,7); c.fill(); c.stroke(); c.restore();
  vidTxt(c,Math.round(N.max)+' m',x+20,y+34,24,600,VID_TX2); vidTxt(c,Math.round(N.min)+' m',x+20,y+h-12,24,600,VID_TX2); vidTxt(c,fmt(N.total/1000,1)+' km',x+w-20,y+h-12,24,600,VID_TX2,'right');
  c.restore(); }
function vidCuadros4(c,datos,ty,alfa){ var tw=(VID.W-VID.IZQ-VID.DER-3*16)/4; c.save(); c.globalAlpha=alfa;
  datos.forEach(function(d,i){ var x=VID.IZQ+i*(tw+16); vidRR(c,x,ty,tw,170,28); c.fillStyle=VID_SURF; c.fill(); c.strokeStyle=VID_BR; c.lineWidth=2; c.stroke();
    vidTxt(c,d[0],x+22,ty+48,24,700,VID_TX2); var fz=58; do{ c.font='800 '+fz+'px '+VID_F; fz-=2; }while(fz>30 && c.measureText(d[1]).width+(d[2]?c.measureText(d[2]).width*.5+8:0)>tw-40);
    c.fillStyle=VID_TX; c.fillText(d[1],x+22,ty+126); if(d[2]){ var nw=c.measureText(d[1]).width; vidTxt(c,d[2],x+26+nw,ty+126,28,700,VID_TX2); } });
  c.restore(); }
function vidDato(id){ var el=$(id); if(!el) return ['','']; var u=el.querySelector('i'); return [vidLimpio(el.firstChild?el.firstChild.textContent:''),u?vidLimpio(u.textContent):'']; }
function vidMarca(c,alfa){ c.save(); c.globalAlpha=alfa; vidTxt(c,'librepedal.cl',VID.IZQ,VID.H-VID.ABA+64,34,800,VID_NAR);
  vidTxt(c,capa==='sat'?'Imágenes © Esri, Maxar, Earthstar Geographics · relieve © Mapterhorn':'© OpenFreeMap © OpenStreetMap · relieve © Mapterhorn',VID.IZQ,VID.H-VID.ABA+108,20,600,'rgba(159,179,200,.75)'); c.restore(); }
// la cara de Pistero (misma que en pantalla), con fundido de 0,4 s al cambiar como .cm-c
function vidCara(ex){ var G=GRAB; if(!G.caras[ex]) G.caras[ex]=vidSvg(cara(ex),64*VID.K*2,54*VID.K*2).catch(function(){ return null; }); return G.caras[ex]; }
function vidPistero(c,alfa){ var G=GRAB; if(!marcador||!cajas||!cajas.el) return Promise.resolve();
  var ex=cajas.expr||exprAct||'feliz';
  if(G.cara.ex!==ex){ G.cara={ex:ex,ant:G.cara.img,img:null,t:G.T}; }
  return vidCara(ex).then(function(im){ G.cara.img=im; var K=VID.K, ll=marcador.getLngLat(), p=mapa.project([ll.lng,ll.lat]), sx=p.x*K, sy=p.y*K;
    if(!isFinite(sx)||!isFinite(sy)) return;
    var col=(cajas.el.style.getPropertyValue('--c')||'#39ff88').trim(), tf=(cajas.inn&&cajas.inn.style.transform)||'';
    var dy=+((/translateY\((-?[\d.]+)px\)/.exec(tf)||[])[1]||0), rot=+((/rotate\((-?[\d.]+)deg\)/.exec(tf)||[])[1]||0), k=+((/scale\(([\d.]+)\)/.exec(tf)||[])[1]||1);
    c.save(); c.globalAlpha=alfa;
    // pin (no se mece; .cm-pin: 3x20 px, de blanco abajo al color de la pendiente)
    var gp=c.createLinearGradient(0,sy-20*K,0,sy); gp.addColorStop(0,col); gp.addColorStop(.55,col); gp.addColorStop(1,'#fff');
    c.save(); c.fillStyle=gp; c.shadowColor=col; c.shadowBlur=8*K; c.fillRect(sx-1.5*K,sy-20*K,3*K,20*K); c.restore();
    // .cm-in: 66x66 con origen abajo al centro (18 px sobre la punta), se mece/inclina/escala igual que en pantalla
    c.translate(sx,sy-18*K); c.translate(0,dy*K); c.rotate(rot*Math.PI/180); c.scale(k,k);
    c.shadowColor='rgba(0,0,0,.55)'; c.shadowBlur=4*K; c.shadowOffsetY=3*K;
    var f=Math.min(1,(G.T-G.cara.t)/400), dib=function(img,a,s){ if(!img) return; c.save(); c.globalAlpha=alfa*a; c.translate(0,-27*K); c.scale(s,s);   /* centro de .cm-caras: 27 px sobre el origen de .cm-in */ c.drawImage(img,-32*K,-27*K,64*K,54*K); c.restore(); };
    if(f<1) dib(G.cara.ant,1-f,1); dib(im,G.cara.ant?f:1,.96+.04*f);
    c.restore(); }); }
// el hito "▲ 175 m" de la cima (.hito), si está a la vista
function vidHito(c,alfa){ var N=D.nuevo; if(!D.cimaM) return; var el=D.cimaM.getElement(); if(!el||el.style.visibility==='hidden') return;
  var K=VID.K, p=mapa.project(N.c[N.imax]), t=vidLimpio(el.textContent); if(!isFinite(p.x)) return;
  c.save(); c.globalAlpha=alfa; c.font='800 '+(11*K)+'px '+VID_F; var w=c.measureText(t).width+14*K, h=19*K, x=p.x*K-w/2, y=p.y*K-4*K-h;
  vidRR(c,x,y,w,h,8*K); c.shadowColor='rgba(255,215,0,.6)'; c.shadowBlur=12*K; c.fillStyle='#ffd700'; c.fill(); c.shadowBlur=0; c.fillStyle=VID_NOCHE; c.fillText(t,x+7*K,y+14*K); c.restore(); }
// el cartel del momento (#sb3-pp): aparece/desaparece en 0,45 s como en pantalla
function vidCartel(c,alfa){ var G=GRAB, pp=$('pp'); if(!pp) return; var on=pp.classList.contains('on');
  if(on!==G.pp.on){ G.pp={on:on,t:G.T}; } var a=on?Math.min(1,(G.T-G.pp.t)/450):Math.max(0,1-(G.T-G.pp.t)/450); if(a<=0) return;
  var t1=vidLimpio(pp.querySelector('.pp-txt').textContent), t2=vidLimpio(pp.querySelector('.pp-sub').textContent), ring=(getComputedStyle(pp).getPropertyValue('--ring')||'#39ff88').trim()||'#39ff88';
  c.save(); c.globalAlpha=alfa*a; c.translate(0,(1-a)*-30);
  c.font='800 52px '+VID_F; var w1=c.measureText(t1).width; c.font='600 32px '+VID_F; var bw=Math.min(VID.W-VID.IZQ-VID.DER,Math.max(w1,c.measureText(t2).width)+80), by=VID.ARR+170, bh=t2?140:100;
  c.save(); vidRR(c,VID.IZQ,by,bw,bh,36); c.fillStyle='rgba(10,15,29,.80)'; c.shadowColor='rgba(0,0,0,.35)'; c.shadowBlur=40; c.fill(); c.restore();
  vidRR(c,VID.IZQ,by,bw,bh,36); c.strokeStyle=VID_BR; c.lineWidth=2; c.stroke(); c.save(); vidRR(c,VID.IZQ,by,bw,bh,36); c.clip(); c.fillStyle=ring; c.fillRect(VID.IZQ,by,9,bh); c.restore();
  vidTxt(c,t1,VID.IZQ+40,by+64,52,800,VID_TX); if(t2) vidTxt(c,t2,VID.IZQ+40,by+108,32,600,VID_TX2); c.restore(); }
function vidCierre(c,alfa){ var G=GRAB, R=D.nuevo.resumen; if(alfa<=0) return Promise.resolve();
  c.save(); c.globalAlpha=alfa; c.drawImage(G.L.cabFin,0,0); c.restore();
  var dur=R.dur?(Math.floor(R.dur/3600000)?[Math.floor(R.dur/3600000)+' h '+(Math.round(R.dur/60000)%60),'min']:[String(Math.round(R.dur/60000)),'min']):['–',''];
  var ty=VID.H-VID.ABA-170-170-24;
  vidCuadros4(c,[['DISTANCIA',fmt(R.dist/1000,1),'km'],['TIEMPO',dur[0],dur[1]],['SUBISTE','+'+Math.round(R.sub),'m'],['MÁS ALTO',String(Math.round(R.altMax)),'m']],ty,alfa);
  c.save(); c.globalAlpha=alfa; vidPerfil(c,G.L.perfilFin,VID.IZQ,VID.H-VID.ABA-170,1); c.restore();
  // Pistero orgulloso con el globo "¡Llegamos!", sobre los datos (como el cierre de Relive: el avatar celebra)
  return vidCara('orgulloso').then(function(im){ if(!im) return; var fx=VID.W-VID.DER-240, fy=ty-232, s=.85+.15*Math.min(1,alfa*1.2);
    c.save(); c.globalAlpha=alfa; c.save(); c.translate(fx+120,fy+202); c.scale(s,s); c.shadowColor='rgba(0,0,0,.55)'; c.shadowBlur=16; c.shadowOffsetY=10; c.drawImage(im,-120,-202,240,202); c.restore();
      c.font='800 50px '+VID_F; var gw=c.measureText('¡Llegamos!').width+64; vidRR(c,fx-gw+20,fy+30,gw,96,48); c.fillStyle=VID_TX; c.fill();
      c.beginPath(); c.moveTo(fx+4,fy+66); c.lineTo(fx+40,fy+84); c.lineTo(fx+4,fy+104); c.closePath(); c.fill(); vidTxt(c,'¡Llegamos!',fx-gw+52,fy+96,50,800,VID_NOCHE); c.restore(); }); }
// un cuadro completo: mapa + capas. tc = ms dentro del cierre (null durante el vuelo)
function vidComponer(tc){ var G=GRAB, c=G.ctx, mc=mapa.getCanvas(), W=VID.W, H=VID.H;
  c.globalAlpha=1; c.fillStyle=VID_NOCHE; c.fillRect(0,0,W,H);
  var k=Math.max(W/mc.width,H/mc.height); c.drawImage(mc,(W-mc.width*k)/2,(H-mc.height*k)/2,mc.width*k,mc.height*k);
  c.drawImage(G.L.vineta,0,0);
  var aV=tc==null?1:Math.max(0,1-tc/500), aF=tc==null?0:Math.max(0,Math.min(1,(tc-700)/600));
  if(aV>0){ c.save(); c.globalAlpha=aV; c.drawImage(G.L.cabVuelo,0,0); c.restore();
    vidHito(c,aV); vidCartel(c,aV);
    var lAlt=$('lAlt'), d1=vidDato('dKm'), d2=vidDato('dAlt'), d3=vidDato('dPend'), d4=vidDato('dSub');
    vidCuadros4(c,[['RECORRIDO',d1[0],d1[1]],[(lAlt?lAlt.textContent:'Altura').toUpperCase(),d2[0],d2[1]],['PENDIENTE',d3[0],d3[1]],['SUBIDO',d4[0],d4[1]]],VID.H-VID.ABA-190-170-24,aV);
    c.save(); c.globalAlpha=aV; vidPerfil(c,G.L.perfil,VID.IZQ,VID.H-VID.ABA-190,prog); c.restore(); }
  vidMarca(c,1);
  return vidPistero(c,aV).then(function(){ return vidCierre(c,aF); }); }

// ---------- la tarjeta de abajo (crear → listo / descargado / app / error), maqueta aprobada ----------
var VID_ICONO='<svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true"><rect x="1.2" y="1.2" width="13.6" height="15.6" rx="3" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="9" r="3.2" fill="currentColor"/></svg>';
var VID_ICONO_COMP='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
function vidTarjeta(estado,x){ var raiz=sb3Raiz(), t=$('vid'); x=x||{};
  if(!t){ t=document.createElement('div'); t.id='sb3-vid'; t.className='vid'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); if(raiz.appendChild) raiz.appendChild(t); }
  var cerrar='<button class="btn vel vid-ancho" id="sb3-vidCerrar">Cerrar</button>';
  if(estado==='creando') t.innerHTML='<div class="vid-fila"><canvas class="vid-mini" id="sb3-vidMini" width="168" height="299"></canvas><div class="vid-txt"><b id="sb3-vidPct">Creando tu video · 0 %</b><small>Se dibuja cuadro a cuadro mientras lo ves. Deja la pantalla encendida.</small></div></div><div class="vid-barra"><i id="sb3-vidBarra"></i></div><button class="btn vel vid-ancho" id="sb3-vidCancelar">Cancelar</button>';
  else if(estado==='compartir') t.innerHTML='<div class="vid-txt"><b>Tu video está listo</b><small>'+vidDurTxt(x.ms)+' · vertical para Reels, TikTok e Historias</small></div><button class="btn play vid-ancho" id="sb3-vidCompartir">'+VID_ICONO_COMP+'Compartir video</button><small class="vid-nota">Se abre el menú del teléfono: Instagram, TikTok, WhatsApp…</small>'+cerrar;
  else if(estado==='descargar') t.innerHTML='<div class="vid-txt"><b>Tu video está listo</b><small>'+vidDurTxt(x.ms)+' · vertical para Reels, TikTok e Historias. Se guardó en la carpeta Descargas.</small></div>'+cerrar;
  else if(estado==='app') t.innerHTML='<div class="vid-txt"><b>En la app todavía no se puede guardar el video</b><small>Abre librepedal.cl en Chrome para crearlo y compartirlo en Instagram, WhatsApp o TikTok.</small></div>'+cerrar;
  else if(estado==='app-imagen') t.innerHTML='<div class="vid-txt"><b>En la app todavía no se puede compartir la imagen</b><small>Abre librepedal.cl en Chrome para compartirla en Instagram, WhatsApp o TikTok.</small></div>'+cerrar;
  else t.innerHTML='<div class="vid-txt"><b>No se pudo crear el video</b><small>'+String(x.msg||'Inténtalo de nuevo.').replace(/[<>&]/g,'')+'</small></div>'+cerrar;
  raiz.classList.add('vid-on');
  var bc=$('vidCerrar'); if(bc) bc.onclick=function(){ t.remove(); raiz.classList.remove('vid-on'); };
  var bx=$('vidCancelar'); if(bx) bx.onclick=function(){ if(GRAB){ GRAB.cancel=true; bx.disabled=true; bx.textContent='Cancelando…'; } };
  var bs=$('vidCompartir'); if(bs) bs.onclick=sb3CompartirVideo;
  return t; }
function vidAvance(pct){ var G=GRAB; var b=$('vidBarra'), p=$('vidPct'); if(b) b.style.width=pct.toFixed(1)+'%'; if(p) p.textContent='Creando tu video · '+Math.floor(pct)+' %';
  var m=$('vidMini'); if(m&&G&&G.cv){ try{ m.getContext('2d').drawImage(G.cv,0,0,m.width,m.height); }catch(e){} } }
function sb3CompartirVideo(){ if(!VID_ARCHIVO||!navigator.share) return;
  navigator.share({files:[VID_ARCHIVO],title:RUTA.nombre||'Mi viaje en Libre Pedal',text:'Mi viaje en Libre Pedal https://librepedal.cl'}).catch(function(e){
    if(e&&e.name==='AbortError') return;   // cerró el menú de compartir: no es un error
    console.warn('[sobrevuelo] compartir video', e); if(typeof lpAviso==='function') lpAviso('No se pudo compartir el video. Inténtalo de nuevo.'); }); }
function vidDescargar(file){ var url=URL.createObjectURL(file), a=document.createElement('a'); a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); },4000); }
function vidNombre(){ return 'libre-pedal-'+(String(RUTA.nombre||'viaje').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'viaje')+'.mp4'; }
window.SB3Video={sync:sync, archivo:function(){ return VID_ARCHIVO; }, ponArchivo:function(f){ VID_ARCHIVO=f; }, VID:VID, VID_ICONO:VID_ICONO, sb3VideoVel:sb3VideoVel, sb3VideoSalida:sb3VideoSalida, sb3ElegirCodec:sb3ElegirCodec, vidDurTxt:vidDurTxt, vidEspera:vidEspera, vidZonaLibre:vidZonaLibre, vidLoadMuxer:vidLoadMuxer, vidEsperarMapa:vidEsperarMapa, vidCamaraTodo:vidCamaraTodo, vidCapas:vidCapas, vidCara:vidCara, vidComponer:vidComponer, vidTarjeta:vidTarjeta, vidAvance:vidAvance, vidDescargar:vidDescargar, vidNombre:vidNombre};
})();
