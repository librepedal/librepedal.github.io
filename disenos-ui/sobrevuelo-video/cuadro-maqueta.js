/* MAQUETA (no es código de la app): compone UN cuadro 1080x1920 del video del sobrevuelo a partir del sobrevuelo real
   abierto en arnes.html. Sirve para que Inty apruebe cómo se ve un fotograma antes de programar la grabación.
   Zonas seguras (Ignite Social Media, jul. 2025): Reels 220 px arriba / 420 abajo; TikTok 120 px a la derecha, 60 a la izquierda. */
(function(){
var W=1080, H=1920, ARR=230, IZQ=60, DER=120, ABA=420;
var NAR='#fc4c02', NOCHE='#0a0f1d', TX='#e8edf6', TX2='#9fb3c8', SURF='rgba(20,26,43,.86)', BR='rgba(255,255,255,.10)', ORO='#ffd700';
var FONT='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
function img(src){ return new Promise(function(ok,mal){ var i=new Image(); i.onload=function(){ ok(i); }; i.onerror=mal; i.src=src; }); }
function svgImg(svgEl,w,h){ var x=svgEl.cloneNode(true); x.setAttribute('xmlns','http://www.w3.org/2000/svg'); x.setAttribute('width',w); x.setAttribute('height',h); return img('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(x))); }
function rr(c,x,y,w,h,r){ c.beginPath(); c.roundRect(x,y,w,h,r); }
function txt(c,t,x,y,size,peso,color,al){ c.font=peso+' '+size+'px '+FONT; c.fillStyle=color; c.textAlign=al||'left'; c.fillText(t,x,y); c.textAlign='left'; }
function fmt(n,d){ return n.toFixed(d).replace('.',','); }
// el mapa del sobrevuelo a 1080x1920 reales: contenedor 360x640 CSS con pixelRatio 3
window.__encuadreFin=function(){ var m=__sb3test.dbg._demo, N=__sb3test.getD().nuevo, b=N.c.reduce(function(b,p){ return [[Math.min(b[0][0],p[0]),Math.min(b[0][1],p[1])],[Math.max(b[1][0],p[0]),Math.max(b[1][1],p[1])]]; },[[180,90],[-180,-90]]); m.fitBounds(b,{padding:{top:140,bottom:250,left:30,right:50},pitch:40,bearing:m.getBearing(),duration:0}); };
window.__mapaVideo=function(){ var m=__sb3test.dbg._demo, el=document.getElementById('sb3-mapa'); el.style.inset='auto'; el.style.left='0'; el.style.top='0'; el.style.width='360px'; el.style.height='640px'; m.setPixelRatio(3); m.resize(); return m.getCanvas().width+'x'+m.getCanvas().height; };
function perfil(c,x,y,w,h){ var N=__sb3test.getD().nuevo, prog=N._progMaqueta, cp=__sb3test.colorPend;
  var lo=N.min-8, hi=N.max+12, top=y+44, bot=y+h-40, X=function(d){ return x+d/N.total*w; }, Y=function(v){ return bot-(v-lo)/(hi-lo)*(bot-top); }, pd=prog*N.total;
  c.save(); rr(c,x,y,w,h,28); c.fillStyle='rgba(15,21,36,.86)'; c.fill(); c.strokeStyle=BR; c.lineWidth=2; c.stroke(); c.clip();
  var capa=document.createElement('canvas'); capa.width=W; capa.height=H; var cc=capa.getContext('2d'); for(var i=1;i<N.c.length;i++){ var x0=X(N.cum[i-1]), x1=X(N.cum[i]); cc.fillStyle=cp(N.pend[i]); cc.beginPath(); cc.moveTo(Math.floor(x0),bot); cc.lineTo(Math.floor(x0),Y(N.alt[i-1])); cc.lineTo(Math.ceil(x1)+.5,Y(N.alt[i])); cc.lineTo(Math.ceil(x1)+.5,bot); cc.closePath(); cc.fill(); } var xp0=X(pd); c.globalAlpha=.85; c.drawImage(capa,0,0,xp0,H,0,0,xp0,H); c.globalAlpha=.22; c.drawImage(capa,xp0,0,W-xp0,H,xp0,0,W-xp0,H); c.globalAlpha=1; c.beginPath(); N.alt.forEach(function(v,k){ var xx=X(N.cum[k]), yy=Y(v); if(k) c.lineTo(xx,yy); else c.moveTo(xx,yy); }); c.strokeStyle='rgba(255,255,255,.45)'; c.lineWidth=2.5; c.stroke();
  c.globalAlpha=1; c.beginPath(); for(var k=0;k<N.c.length && N.cum[k]<=pd;k++){ var xx=X(N.cum[k]), yy=Y(N.alt[k]); if(k) c.lineTo(xx,yy); else c.moveTo(xx,yy); }
  c.save(); c.shadowColor='#7dd3fc'; c.shadowBlur=18; c.strokeStyle='#fff'; c.lineWidth=5; c.stroke(); c.restore();
  N.momentos.forEach(function(m){ var q=Math.min(N.alt.length-1,Math.max(0,N.cum.findIndex(function(v){ return v>=m.d; }))); c.fillStyle=m.d<=pd?ORO:'rgba(255,215,0,.45)'; c.beginPath(); c.arc(X(m.d),Y(N.alt[q])-18,7,0,7); c.fill(); });
  var qi=Math.max(0,N.cum.findIndex(function(v){ return v>=pd; })), xp=X(pd), yp=Y(N.alt[qi]);
  c.strokeStyle='rgba(255,255,255,.5)'; c.setLineDash([8,8]); c.lineWidth=2; c.beginPath(); c.moveTo(xp,top-10); c.lineTo(xp,bot); c.stroke(); c.setLineDash([]);
  c.save(); c.shadowColor=NAR; c.shadowBlur=24; c.fillStyle=NAR; c.strokeStyle='#fff'; c.lineWidth=5; c.beginPath(); c.arc(xp,yp,13,0,7); c.fill(); c.stroke(); c.restore();
  txt(c,Math.round(N.max)+' m',x+20,y+34,24,600,TX2); txt(c,Math.round(N.min)+' m',x+20,y+h-12,24,600,TX2); txt(c,fmt(N.total/1000,1)+' km',x+w-20,y+h-12,24,600,TX2,'right');
  c.restore(); }
window.__cuadroMaqueta=async function(tipo){
  var m=__sb3test.dbg._demo, N=__sb3test.getD().nuevo, cv=document.createElement('canvas'); cv.width=W; cv.height=H; var c=cv.getContext('2d');
  var mc=m.getCanvas(), k=Math.max(W/mc.width,H/mc.height); c.fillStyle=NOCHE; c.fillRect(0,0,W,H);
  c.drawImage(mc,(W-mc.width*k)/2,(H-mc.height*k)/2,mc.width*k,mc.height*k);
  // viñeta arriba y abajo: el texto se lee sobre cualquier satélite
  var g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(10,15,29,.88)'); g.addColorStop(.2,'rgba(10,15,29,.15)'); g.addColorStop(.5,'rgba(10,15,29,0)'); g.addColorStop(.62,'rgba(10,15,29,.25)'); g.addColorStop(.78,'rgba(10,15,29,.9)'); g.addColorStop(1,'rgba(10,15,29,.97)');
  c.fillStyle=g; c.fillRect(0,0,W,H);
  var logo=await img('../../logo-transparent.png');
  var esc=W/360, cajaEl=document.querySelector('#sb3 .cara-mk');
  if(tipo!=='fin'){
    // Pistero en la punta de la huella: misma proporción que en la pantalla del sobrevuelo (68 px de 390 ≈ 17 % del ancho)
    var face=document.querySelector('#sb3 .cm-c.on svg'), rc=cajaEl.getBoundingClientRect(), r0=m.getContainer().getBoundingClientRect(), kk=2.6, px=(rc.left+rc.width/2-r0.left)*esc, py=(rc.bottom-r0.top)*esc;
    var col=getComputedStyle(cajaEl).getPropertyValue('--c').trim()||'#39ff88';
    c.save(); var gp=c.createLinearGradient(0,py-20*kk,0,py); gp.addColorStop(0,col); gp.addColorStop(.55,col); gp.addColorStop(1,'#fff'); c.fillStyle=gp; c.shadowColor=col; c.shadowBlur=16; c.fillRect(px-1.5*kk,py-20*kk,3*kk,20*kk); c.restore();
    if(face){ var fi=await svgImg(face,64*kk,54*kk); c.save(); c.shadowColor='rgba(0,0,0,.55)'; c.shadowBlur=10; c.shadowOffsetY=8; c.drawImage(fi,px-32*kk,py-(20+54-2)*kk,64*kk,54*kk); c.restore(); }
    // arriba: logo + nombre de la ruta + fecha
    c.drawImage(logo,IZQ-14,ARR-16,150,150);
    var tit=document.getElementById('sb3-tit').textContent, fz=60; do{ c.font='800 '+fz+'px '+FONT; fz-=2; }while(fz>36 && c.measureText(tit).width>W-IZQ-DER-150);
    c.fillStyle=TX; c.fillText(tit,IZQ+150,ARR+62);
    txt(c,'8 de octubre de 2026 · '+fmt(N.total/1000,1)+' km',IZQ+152,ARR+108,32,600,TX2);
    // el momento (mismo cartel del sobrevuelo: borde del color de la cara)
    var pp=document.getElementById('sb3-pp'), on=pp&&pp.classList.contains('on');
    if(on){ var t1=pp.querySelector('.pp-txt').textContent, t2=pp.querySelector('.pp-sub').textContent, ring=getComputedStyle(pp).getPropertyValue('--ring').trim()||'#39ff88';
      c.font='800 52px '+FONT; var w1=c.measureText(t1).width; c.font='600 32px '+FONT; var bw=Math.max(w1,c.measureText(t2).width)+80, by=ARR+170;
      c.save(); rr(c,IZQ,by,bw,140,36); c.fillStyle='rgba(10,15,29,.80)'; c.shadowColor='rgba(0,0,0,.35)'; c.shadowBlur=40; c.fill(); c.restore();
      rr(c,IZQ,by,bw,140,36); c.strokeStyle=BR; c.lineWidth=2; c.stroke(); c.save(); rr(c,IZQ,by,bw,140,36); c.clip(); c.fillStyle=ring; c.fillRect(IZQ,by,9,140); c.restore();
      txt(c,t1,IZQ+40,by+64,52,800,TX); txt(c,t2,IZQ+40,by+108,32,600,TX2); }
    // abajo (sobre la zona segura de 420 px): 4 datos + perfil, como el panel del sobrevuelo
    var datos=[['RECORRIDO','dKm'],[document.getElementById('sb3-lAlt').textContent.toUpperCase(),'dAlt'],['PENDIENTE','dPend'],['SUBIDO','dSub']];
    var tw=(W-IZQ-DER-3*16)/4, ty=H-ABA-190-170-24;
    datos.forEach(function(d,i){ var x=IZQ+i*(tw+16), el=document.getElementById('sb3-'+d[1]), u=el.querySelector('i'), num=el.firstChild.textContent, un=u?u.textContent:'';
      rr(c,x,ty,tw,170,28); c.fillStyle=SURF; c.fill(); c.strokeStyle=BR; c.lineWidth=2; c.stroke();
      txt(c,d[0],x+22,ty+48,24,700,TX2); c.font='800 58px '+FONT; c.fillStyle=TX; c.fillText(num,x+22,ty+126); var nw=c.measureText(num).width; txt(c,un,x+26+nw,ty+126,28,700,TX2); });
    N._progMaqueta=parseFloat(document.getElementById('sb3-dKm').firstChild.textContent.replace(',','.'))*1000/N.total; perfil(c,IZQ,H-ABA-190,W-IZQ-DER,190);
    txt(c,'librepedal.cl',IZQ,H-ABA+64,34,800,NAR);
  } else {
    // cierre (~4 s): arriba lo mismo que en el vuelo; al centro el viaje entero; abajo los datos del resumen y el perfil completo
    var R=N.resumen; c.drawImage(logo,IZQ-14,ARR-16,150,150);
    var tit2=document.getElementById('sb3-tit').textContent, fz2=60; do{ c.font='800 '+fz2+'px '+FONT; fz2-=2; }while(fz2>36 && c.measureText(tit2).width>W-IZQ-DER-150);
    c.fillStyle=TX; c.fillText(tit2,IZQ+150,ARR+62); txt(c,'Así fue tu viaje · 8 de octubre de 2026',IZQ+152,ARR+108,32,600,TX2);
    var dd=[['DISTANCIA',fmt(R.dist/1000,1)+' km'],['TIEMPO',R.dur?(Math.floor(R.dur/3600000)?Math.floor(R.dur/3600000)+' h '+Math.round(R.dur/60000)%60+' min':Math.round(R.dur/60000)+' min'):'–'],['SUBISTE','+'+Math.round(R.sub)+' m'],['MÁS ALTO',Math.round(R.altMax)+' m']];
    var tw=(W-IZQ-DER-3*16)/4, ty=H-ABA-170-170-24;
    // Pistero orgulloso con el globo de llegada, sobre los datos (como el cierre de Relive: el avatar celebra)
    var s2=window.sb3CaraPersonaje('orgulloso'); if(s2){ var f2=await img('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s2.replace('<svg ','<svg width="240" height="202" ')));
      var fx=W-DER-240, fy=ty-232; c.save(); c.shadowColor='rgba(0,0,0,.55)'; c.shadowBlur=16; c.shadowOffsetY=10; c.drawImage(f2,fx,fy,240,202); c.restore();
      c.font='800 50px '+FONT; var gw=c.measureText('¡Llegamos!').width+64; rr(c,fx-gw+20,fy+30,gw,96,48); c.fillStyle=TX; c.fill();
      c.beginPath(); c.moveTo(fx+4,fy+66); c.lineTo(fx+40,fy+84); c.lineTo(fx+4,fy+104); c.closePath(); c.fill(); txt(c,'¡Llegamos!',fx-gw+52,fy+96,50,800,NOCHE); }
    dd.forEach(function(d,i){ var x=IZQ+i*(tw+16); rr(c,x,ty,tw,170,28); c.fillStyle=SURF; c.fill(); c.strokeStyle=BR; c.lineWidth=2; c.stroke();
      txt(c,d[0],x+22,ty+48,24,700,TX2); var p=d[1].split(' '), un=p.length>1?p.pop():''; var num=p.join(' '); var fz3=58; do{ c.font='800 '+fz3+'px '+FONT; fz3-=2; }while(fz3>34 && c.measureText(num).width+c.measureText(un).width*.5>tw-40);
      c.fillStyle=TX; c.fillText(num,x+22,ty+126); var nw=c.measureText(num).width; txt(c,un,x+26+nw,ty+126,28,700,TX2); });
    N._progMaqueta=1; perfil(c,IZQ,H-ABA-170,W-IZQ-DER,170);
    txt(c,'librepedal.cl',IZQ,H-ABA+64,34,800,NAR);
  }
  return cv.toDataURL('image/png');
};
})();
