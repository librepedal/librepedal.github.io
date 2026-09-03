// ===== Esfera de aplicaciones 3D (lanzador) =====
// La esfera COMPLEMENTA la barra inferior, no la repite: solo secciones que no están
// en la barra (antes duplicaba Inicio/Mapa/Social/Perfil y desmenuzaba Logros/Ranking/
// Tienda/Comunidad en 4 íconos que también vivían juntos en "Logros y comunidad").
// De paso ganan acceso global cosas que antes estaban enterradas: Bitácora (estaba a
// 3 toques), Música, Novedades y Ajustes.
// Íconos PROPIOS (antes eran emojis del sistema, "como de WhatsApp" — pedido de Inty).
// Set ciclista y consistente: mismo trazo, misma caja, heredan el color con currentColor.
// Ajustes NO es un engranaje genérico: es un PLATO de bicicleta (corona, brazos, eje).
const _ICO=function(d){return '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';};
const esferaItems=[
 // Las dos acciones más importantes de un app de ciclismo (empezar a pedalear, ver
 // el mapa) faltaban en la esfera — que desde v6.09 ES el destino real de "Inicio"
 // en toda la app. Sin esto, había que salir con "☰ Menú clásico" para llegar a lo
 // más básico. Van primero, antes que Ajustes/Música/Novedades. Hallazgo real de
 // Inty, revisando la esfera con el mismo criterio del protocolo de excelencia.
 // REDISEÑO Pantalla 01 (mockup "Rediseño propuesto"): la esfera pasa de 12 a 5 — solo lo
 // que se toca PEDALEANDO. El 77% de los íconos medía <48px girando; con 5 se agrandan solos
 // y se elimina la duplicación (4 de 12 ya estaban en header/Inicio). Lo que sale NO se pierde:
 // sigue en "☰ Menú clásico" y en sus pestañas (Mis viajes/Bitácora/Stats/Logros, Guía, Novedades,
 // Ajustes). Criterio: Ley de Hick + menos-es-más. Antes: 12 · Ahora: 5.
 {i:_ICO('<circle cx="12" cy="12" r="9"/><path d="M10 8.3l6.2 3.7-6.2 3.7z" fill="currentColor" stroke="none"/>'),t:'Viaje rápido',v:'dash'},
 {i:_ICO('<path d="M12 21s7-7.2 7-12.4A7 7 0 1 0 5 8.6C5 13.8 12 21 12 21z"/><circle cx="12" cy="8.5" r="2.2"/>'),t:'Mapa',v:'map'},
 {i:_ICO('<path d="M15.4 3.6a4.2 4.2 0 0 0-5.5 5.5l-6 6a1.6 1.6 0 0 0 0 2.3l1.7 1.7a1.6 1.6 0 0 0 2.3 0l6-6a4.2 4.2 0 0 0 5.5-5.5l-2.9 2.9-2.6-2.6z"/>'),t:'Taller',v:'mac'},
 {i:_ICO('<circle cx="6.5" cy="17.5" r="2.6"/><circle cx="17" cy="15.4" r="2.6"/><path d="M9.1 17.5V6.6l10.5-2.1v10.9"/><path d="M9.1 10.2l10.5-2.1"/>'),t:'Música',v:'musica'},
 {i:_ICO('<path d="M12 3.4L21 19.4H3z"/><path d="M12 9.4v4.2M12 17h.01"/>'),t:'SOS',fn:'enviarSOS'}
];
let esEls=[], esRotX=-0.2, esRotY=0, esVelX=0, esVelY=0.004, esDrag=false, esLast=null, esMoved=0, esRAF=null, esBound=false, esCanvas=null, esPairs=[];
// Logo real en el nucleo de la esfera (reemplaza la bola de plasma blanca/cian de antes).
let _esLogoImg=null, _esLogoReady=false;
function _esLogoCargar(){ if(_esLogoImg) return; _esLogoImg=new Image(); _esLogoImg.onload=function(){ _esLogoReady=true; }; _esLogoImg.src='logo.jpg'; }
_esLogoCargar();
let esAudioCtx=null, esIntroStart=0;
var esEstilo=parseInt(localStorage.getItem('lp_estilo')||'1')||1; // var a propósito: seleccionarEstilo()/renderEstilos() (fuera de este archivo) lo leen y escriben
let esStarsList=null, esComets=[], esExplosions=[], esNextComet=0, esNextExplosion=0, esToques=[];
var esFondoModo=parseInt(localStorage.getItem('lp_fondo_esfera')||'1')||1; // var a propósito: seleccionarFondoEsfera()/renderFondosEsfera() (fuera de este archivo) lo leen y escriben. 1=postales de Chile (gratis), 2=espacial (Darma)
// Nota: se sacaron a propósito los que resultaron ser collage/montaje/mapa/señalética
// en vez de una foto real y completa (Torres del Paine, Chiloé, Desierto de Atacama, Ruta 9).
const ES_POSTALES_TITULOS=['Carretera Austral','Valparaíso','Valle de la Luna (Chile)','Cuesta Lo Prado','Volcán Villarrica','Lago General Carrera','Ruta 5 (Chile)','Ruta 68 (Chile)','Paso Los Libertadores','Cuesta Barriga','Valle Nevado','Parque Nacional Conguillío','Laguna San Rafael','Cajón del Maipo','Paso Pehuenche','San Pedro de Atacama','Pucón','Volcán Osorno','Puerto Varas','Isla de Pascua','Coyhaique','Ancud','Iquique'];
let esPostUrls=[], esPostOrden=[], esPostOrdenPos=0, esPostTimer=null, esPostLoading=false, esPostActiveLayer='A', esPostUltimoIdx=-1;
function esBarajarPostales(){
  esPostOrden=esPostUrls.map(function(_,i){return i;});
  for(let i=esPostOrden.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const tmp=esPostOrden[i]; esPostOrden[i]=esPostOrden[j]; esPostOrden[j]=tmp; }
  // evita que la primera de la vuelta nueva sea la misma que la ultima que se mostro (si no, se ve como una repetida)
  if(esPostOrden.length>1 && esPostOrden[0]===esPostUltimoIdx){ const tmp=esPostOrden[0]; esPostOrden[0]=esPostOrden[1]; esPostOrden[1]=tmp; }
  esPostOrdenPos=0;
}
async function esCargarPostales(){
  if(esPostUrls.length || esPostLoading) return;
  esPostLoading=true;
  try{
    const results=await Promise.all(ES_POSTALES_TITULOS.map(async function(t){
      try{
        const r=await fetch('https://es.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(t)+'?redirect=true');
        const j=await r.json();
        const src=(j.originalimage&&j.originalimage.source)||(j.thumbnail&&j.thumbnail.source)||'';
        return src?src.replace(/\/\d+px-([^\/]+)$/,'/1280px-$1'):null;
      }catch(e){ return null; }
    }));
    esPostUrls=results.filter(Boolean);
  }catch(e){}
  esPostLoading=false;
}
function esSiguientePostal(){
  if(!esPostUrls.length) return;
  if(!esPostOrden.length || esPostOrdenPos>=esPostOrden.length) esBarajarPostales(); // baraja de nuevo cuando se muestran todas: random real, sin repetir antes de agotarlas
  const idx=esPostOrden[esPostOrdenPos]; esPostUltimoIdx=idx;
  const url=esPostUrls[idx]; esPostOrdenPos++;
  const nextId=esPostActiveLayer==='A'?'esPostB':'esPostA', prevId=esPostActiveLayer==='A'?'esPostA':'esPostB';
  const showEl=document.getElementById(nextId), hideEl=document.getElementById(prevId);
  if(!showEl) return;
  const im=new Image();
  im.onload=function(){ showEl.style.backgroundImage='url("'+url+'")'; showEl.classList.add('on'); if(hideEl) hideEl.classList.remove('on'); esPostActiveLayer=(esPostActiveLayer==='A'?'B':'A'); };
  im.src=url;
}
function esIniciarPostales(){
  const cont=document.getElementById('esPostales'); if(cont) cont.classList.add('on');
  esCargarPostales().then(function(){ esSiguientePostal(); clearInterval(esPostTimer); esPostTimer=setInterval(esSiguientePostal,3000); });
}
function esDetenerPostales(){ clearInterval(esPostTimer); esPostTimer=null; const cont=document.getElementById('esPostales'); if(cont) cont.classList.remove('on'); }
function esAplicarFondoModo(){
  const stars=document.getElementById('esStars');
  if(esFondoModo===2){ esDetenerPostales(); if(stars) stars.classList.add('on'); }
  else { if(stars) stars.classList.remove('on'); esIniciarPostales(); }
}
function esInitStars(w,h){
  esStarsList=[];
  const layers=[{n:40,speed:0.15,size:[0.5,1.1],alpha:0.5},{n:26,speed:0.35,size:[1,1.8],alpha:0.75},{n:14,speed:0.7,size:[1.6,2.6],alpha:1}];
  layers.forEach(function(l){ for(let i=0;i<l.n;i++){ esStarsList.push({x:Math.random()*w,y:Math.random()*h,r:l.size[0]+Math.random()*(l.size[1]-l.size[0]),speed:l.speed,alpha:l.alpha,phase:Math.random()*6.28}); } });
}
function esSpawnCometa(w,h){ const left=Math.random()<0.5; esComets.push({x:left?-20:w+20, y:Math.random()*h*0.5, vx:left?5.5:-5.5, vy:2.2}); }
function esSpawnExplosion(w,h){
  const x=w*(0.2+Math.random()*0.6), y=h*(0.1+Math.random()*0.35), parts=[], n=16;
  for(let i=0;i<n;i++){ const ang=6.2832*(i/n)+Math.random()*0.3, spd=0.8+Math.random()*1.6; parts.push({vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd}); }
  esExplosions.push({x:x,y:y,life:0,parts:parts});
}
function esDrawBackground(ctx,w,h){
  if(!esStarsList) esInitStars(w,h);
  const now=Date.now();
  if(now>esNextComet){ esSpawnCometa(w,h); esNextComet=now+20000+Math.random()*10000; }
  if(now>esNextExplosion){ esSpawnExplosion(w,h); esNextExplosion=now+60000+Math.random()*60000; }
  ctx.clearRect(0,0,w,h);
  esStarsList.forEach(function(s){ s.x-=s.speed; if(s.x<-3) s.x=w+3; const tw=0.6+0.4*Math.sin(now/700+s.phase); ctx.globalAlpha=s.alpha*tw; ctx.fillStyle='#dff6ff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,6.2832); ctx.fill(); });
  ctx.globalAlpha=1;
  esComets=esComets.filter(function(c){
    c.x+=c.vx; c.y+=c.vy;
    const speed=Math.hypot(c.vx,c.vy)||1, dirx=c.vx/speed, diry=c.vy/speed, tailLen=90;
    const tx=c.x-dirx*tailLen, ty=c.y-diry*tailLen;
    ctx.lineCap='round';
    const halo=ctx.createLinearGradient(c.x,c.y,tx,ty);
    halo.addColorStop(0,'rgba(190,230,255,0.35)'); halo.addColorStop(1,'rgba(190,230,255,0)');
    ctx.strokeStyle=halo; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(c.x,c.y); ctx.lineTo(tx,ty); ctx.stroke();
    const core=ctx.createLinearGradient(c.x,c.y,tx,ty);
    core.addColorStop(0,'rgba(255,255,255,0.95)'); core.addColorStop(0.3,'rgba(200,240,255,0.55)'); core.addColorStop(1,'rgba(200,240,255,0)');
    ctx.strokeStyle=core; ctx.lineWidth=2.2; ctx.beginPath(); ctx.moveTo(c.x,c.y); ctx.lineTo(tx,ty); ctx.stroke();
    const headG=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,7);
    headG.addColorStop(0,'rgba(255,255,255,1)'); headG.addColorStop(0.4,'rgba(200,240,255,0.8)'); headG.addColorStop(1,'rgba(200,240,255,0)');
    ctx.fillStyle=headG; ctx.beginPath(); ctx.arc(c.x,c.y,7,0,6.2832); ctx.fill();
    return c.x>-tailLen-20 && c.x<w+tailLen+20 && c.y>-tailLen-20 && c.y<h+tailLen+20;
  });
  esExplosions=esExplosions.filter(function(ex){
    ex.life++; const f=ex.life/60; if(f>=1) return false; const fade=1-f;
    ex.parts.forEach(function(p){ const px=ex.x+p.vx*ex.life, py=ex.y+p.vy*ex.life; ctx.fillStyle='rgba(255,'+Math.round(150+90*fade)+',70,'+fade+')'; ctx.beginPath(); ctx.arc(px,py,1.8*fade+0.4,0,6.2832); ctx.fill(); });
    ctx.strokeStyle='rgba(255,200,120,'+(fade*0.6)+')'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(ex.x,ex.y,30*f,0,6.2832); ctx.stroke();
    return true;
  });
}
/* ===== MOTOR DE AUDIO ATMOSFÉRICO =====
   Reverberación compartida (ConvolverNode con respuesta sintética): TODO pasa por
   este "espacio" y suena cinematográfico/futurista en vez de chiptune 8-bits. */
function _ac(){ esAudioCtx = esAudioCtx || new (window.AudioContext||window.webkitAudioContext)(); if(esAudioCtx.state==='suspended'){ try{ esAudioCtx.resume(); }catch(e){} } return esAudioCtx; }
let _lpVerb=null;
function _reverb(){
  if(_lpVerb) return _lpVerb;
  const ac=_ac(), sr=ac.sampleRate, len=Math.floor(sr*2.8);
  const buf=ac.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){ const d=buf.getChannelData(ch); for(let i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3); } }
  const conv=ac.createConvolver(); conv.buffer=buf;
  const wet=ac.createGain(); wet.gain.value=0.8; conv.connect(wet); wet.connect(ac.destination);
  _lpVerb=conv; return _lpVerb;
}
/* Arranque cálido y ORGÁNICO en Do mayor: sub suave que respira → pad tibio (sine/triangle,
   nada de sawtooth metálico) que se eleva → latido grave redondo (sin click) → notas de arpa
   suaves. Reverb grande + eco, volumen contenido. */
function sonidoArco(){
  try{
    const ac=_ac(), t0=ac.currentTime, verb=_reverb();
    // Master con compresor suave, volumen contenido
    const comp=ac.createDynamicsCompressor();
    comp.threshold.value=-20; comp.knee.value=26; comp.ratio.value=2.5; comp.attack.value=0.01; comp.release.value=0.3;
    const master=ac.createGain(); master.gain.value=0.42;
    master.connect(comp); comp.connect(ac.destination); comp.connect(verb);
    // Eco/delay suave (más espacio, menos golpe)
    const delay=ac.createDelay(1.0); delay.delayTime.value=0.36;
    const fb=ac.createGain(); fb.gain.value=0.28; const echo=ac.createGain(); echo.gain.value=0.4;
    delay.connect(fb); fb.connect(delay); delay.connect(echo); echo.connect(master); echo.connect(verb);
    // 1) Sub suave que respira (cimiento cálido, sin retumbe fuerte)
    const sub=ac.createOscillator(); sub.type='sine'; sub.frequency.setValueAtTime(49.00,t0); sub.frequency.linearRampToValueAtTime(65.41,t0+1.1);
    const subg=ac.createGain(); subg.gain.setValueAtTime(0.0001,t0); subg.gain.linearRampToValueAtTime(0.10,t0+1.0); subg.gain.exponentialRampToValueAtTime(0.0001,t0+3.0);
    sub.connect(subg); subg.connect(master); sub.start(t0); sub.stop(t0+3.1);
    // 2) Pad TIBIO (Do mayor) — sine + triangle + un armónico suave, filtro cálido (no brilla metálico)
    const padLP=ac.createBiquadFilter(); padLP.type='lowpass'; padLP.frequency.setValueAtTime(320,t0); padLP.frequency.exponentialRampToValueAtTime(2200,t0+1.3); padLP.Q.value=0.5;
    padLP.connect(master); padLP.connect(delay); padLP.connect(verb);
    [130.81,196.00,261.63,329.63,392.00].forEach(function(f){
      const o=ac.createOscillator(); o.type='sine'; o.frequency.value=f;              // fundamental cálido
      const oc=ac.createOscillator(); oc.type='triangle'; oc.frequency.value=f;        // cuerpo suave
      const oh=ac.createOscillator(); oh.type='sine'; oh.frequency.value=f*2.001;       // armónico natural sutil
      const g=ac.createGain(); g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(0.035,t0+1.0); g.gain.setValueAtTime(0.035,t0+1.4); g.gain.exponentialRampToValueAtTime(0.0001,t0+2.9);
      const gc=ac.createGain(); gc.gain.value=0.5; const gh=ac.createGain(); gh.gain.value=0.12;
      o.connect(g); oc.connect(gc); gc.connect(g); oh.connect(gh); gh.connect(g); g.connect(padLP);
      o.start(t0); o.stop(t0+3.0); oc.start(t0); oc.stop(t0+3.0); oh.start(t0); oh.stop(t0+3.0);
    });
    // 3) Latido grave redondo (SIN click metálico) — un solo golpe cálido en el clímax
    function latido(at,fA,fB,vol){
      const o=ac.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(fA,at); o.frequency.exponentialRampToValueAtTime(fB,at+0.22);
      const g=ac.createGain(); g.gain.setValueAtTime(0.0001,at); g.gain.exponentialRampToValueAtTime(vol,at+0.04); g.gain.exponentialRampToValueAtTime(0.0001,at+0.7);
      o.connect(g); g.connect(master); o.start(at); o.stop(at+0.75);
    }
    latido(t0+0.55,90,49,0.16);   // latido suave
    latido(t0+1.05,110,55,0.22);  // segundo latido (el clímax, cálido)
    // 4) Notas de arpa suaves (Do mayor, registro medio — nada agudo/cristal), con eco
    [261.63,329.63,392.00,523.25].forEach(function(f,i){
      const at=t0+1.05+i*0.11;
      const o=ac.createOscillator(); o.type='sine'; o.frequency.value=f;
      const o2=ac.createOscillator(); o2.type='triangle'; o2.frequency.value=f; const g2=ac.createGain(); g2.gain.value=0.25;
      const g=ac.createGain(); g.gain.setValueAtTime(0.0001,at); g.gain.exponentialRampToValueAtTime(0.045,at+0.02); g.gain.exponentialRampToValueAtTime(0.0001,at+1.6);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master); g.connect(delay); g.connect(verb);
      o.start(at); o.stop(at+1.7); o2.start(at); o2.stop(at+1.7);
    });
  }catch(e){}
}
/* Tap futurista sutil: cada interacción "responde" con un toque de luz sonora + reverb */
let _lpTapLast=0;
function sonidoTap(fr){
  try{
    const now=Date.now(); if(now-_lpTapLast<40) return; _lpTapLast=now;
    const ac=_ac(), t0=ac.currentTime, verb=_reverb();
    const o=ac.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(fr||1180,t0); o.frequency.exponentialRampToValueAtTime((fr||1180)*0.62,t0+0.09);
    const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(0.05,t0+0.007); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.17);
    const send=ac.createGain(); send.gain.value=0.22;
    o.connect(g); g.connect(ac.destination); g.connect(send); send.connect(verb);
    o.start(t0); o.stop(t0+0.19);
  }catch(e){}
}
/* Swipe atmosférico al girar la esfera (reemplaza los clics 8-bits de la "cadena") */
// Desbloqueo del audio al primer gesto + sonido táctil global (acción → reacción en toda la app)
document.addEventListener('pointerdown', function _unlockAudio(){
  document.removeEventListener('pointerdown', _unlockAudio);
  try{ _ac(); }catch(e){}
});
document.addEventListener('click', function(e){
  const el=e.target.closest('button, .nb, .ab, .bg, .es-ind, .es-icon, .gtt, .music-btn, .route-btn, .rec-btn, .helmet-option');
  if(!el || el.disabled) return;
  sonidoTap();
  if(navigator.vibrate){ try{ navigator.vibrate(7); }catch(_){} }
}, true);
function construirEsfera(){
  const wrap=document.getElementById('esferaWrap'); if(!wrap) return; wrap.innerHTML='';
  const n=esferaItems.length;
  esEls=esferaItems.map(function(it,i){
    // ANILLO (tras el rediseño 12->5): en círculo parejo (no esfera 3D dispersa), para que
    // los pocos íconos se vean grandes, del mismo tamaño y alrededor del logo — nunca encima.
    const ang=-Math.PI/2 + (i/n)*Math.PI*2;
    const x=Math.cos(ang), y=Math.sin(ang), z=0;
    const el=document.createElement('div'); el.className='es-icon';
    el.innerHTML='<div class="es-ico">'+it.i+'</div><div class="es-lbl">'+it.t+'</div>';
    el.addEventListener('click',function(){ if(esMoved>12) return; cerrarEsfera(); if(it.v) cv(it.v); else if(it.fn && typeof window[it.fn]==='function') window[it.fn](); });
    wrap.appendChild(el);
    return {el:el,x:x,y:y,z:z};
  });
  esCanvas=document.createElement('canvas'); esCanvas.id='esCanvas'; wrap.insertBefore(esCanvas, wrap.firstChild);
  esPairs=[]; const seen={};
  for(let a=0;a<esEls.length;a++){ const d=[]; for(let b=0;b<esEls.length;b++){ if(a===b) continue; const dx=esEls[a].x-esEls[b].x,dy=esEls[a].y-esEls[b].y,dz=esEls[a].z-esEls[b].z; d.push([dx*dx+dy*dy+dz*dz,b]); } d.sort(function(p,q){return p[0]-q[0];}); for(let k=0;k<2;k++){ const b=d[k][1], key=a<b?a+'_'+b:b+'_'+a; if(!seen[key]){ seen[key]=1; esPairs.push([a,b]); } } }
}
function esRayo(ctx,x1,y1,x2,y2,seed,dep,col){
  ctx.lineJoin='round'; ctx.lineCap='round';
  if(esEstilo===3){ // Tentáculos de plasma (curvas suaves multicolor)
    const mx=(x1+x2)/2,my=(y1+y2)/2; let nx=-(y2-y1),ny=(x2-x1); const len=Math.hypot(nx,ny)||1; nx/=len;ny/=len;
    const wob=Math.sin(seed*1.1+Date.now()/500)*26*dep, cxp=mx+nx*wob, cyp=my+ny*wob;
    function cv(){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(cxp,cyp,x2,y2); }
    cv(); ctx.strokeStyle=col; ctx.globalAlpha=dep*0.28; ctx.lineWidth=dep*8; ctx.stroke();
    cv(); ctx.strokeStyle=col; ctx.globalAlpha=dep*0.75; ctx.lineWidth=dep*2.8; ctx.stroke();
    cv(); ctx.strokeStyle='rgba(255,255,255,'+(dep*0.65).toFixed(2)+')'; ctx.globalAlpha=1; ctx.lineWidth=Math.max(0.6,dep*0.9); ctx.stroke();
    return;
  }
  const azul = (esEstilo===2); if(azul) col='#3aa0ff';
  const dist=Math.hypot(x2-x1,y2-y1); const segs=Math.max(azul?8:6,Math.floor(dist/(azul?10:15)));
  const dx=(x2-x1)/segs, dy=(y2-y1)/segs; let nx=-(y2-y1), ny=(x2-x1); const len=Math.hypot(nx,ny)||1; nx/=len; ny/=len;
  const pts=[{x:x1,y:y1}];
  for(let s=1;s<segs;s++){ const noise=(Math.sin(seed*3.1+s*1.7)+(azul?0:Math.sin(seed*7.3+s*0.9))+(Math.random()-0.5)*(azul?2.2:1.6))*0.5; const amp=Math.sin(Math.PI*s/segs)*(azul?22:16)*dep; pts.push({x:x1+dx*s+nx*noise*amp, y:y1+dy*s+ny*noise*amp}); }
  pts.push({x:x2,y:y2});
  function trazo(){ ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); }
  trazo(); ctx.strokeStyle=col; ctx.globalAlpha=dep*(azul?0.25:0.2); ctx.lineWidth=dep*(azul?9:6.5); ctx.stroke();
  trazo(); ctx.strokeStyle=col; ctx.globalAlpha=dep*(azul?0.6:0.55); ctx.lineWidth=dep*(azul?4:2.6); ctx.stroke();
  trazo(); ctx.strokeStyle='rgba(255,255,255,'+(dep*(azul?1:0.92)).toFixed(2)+')'; ctx.globalAlpha=1; ctx.lineWidth=Math.max(azul?1:0.8,dep*(azul?1.8:1)); ctx.stroke();
  const nb=azul?2:1; for(let b=0;b<nb;b++){ if(Math.random()<(azul?0.5:0.28)){ const bi=1+Math.floor(Math.random()*(pts.length-2)); const p=pts[bi]; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+(Math.random()-0.5)*(azul?34:24)*dep,p.y+(Math.random()-0.5)*(azul?34:24)*dep); ctx.strokeStyle=col; ctx.globalAlpha=dep*(azul?0.6:0.5); ctx.lineWidth=dep*(azul?1.4:0.9); ctx.stroke(); } }
}
function esLoop(){
  const wrap=document.getElementById('esferaWrap'); if(!wrap){ esRAF=null; return; }
  const starsEl=document.getElementById('esStars');
  if(starsEl && esFondoModo===2){
    const sw=window.innerWidth, sh=window.innerHeight;
    if(starsEl.width!==sw||starsEl.height!==sh){ starsEl.width=sw; starsEl.height=sh; esStarsList=null; }
    esDrawBackground(starsEl.getContext('2d'), sw, sh);
  }
  let intro=esIntroStart?Math.min(1,(Date.now()-esIntroStart)/950):1; intro=1-Math.pow(1-intro,3);
  const W=wrap.clientWidth,H=wrap.clientHeight, R=Math.min(W,H)*0.4*intro, cx=W/2, cy=H/2;
  if(!esDrag){ esRotY+=esVelY; esRotX+=esVelX; esVelX*=0.94; }
  const sY=Math.sin(esRotY),cY=Math.cos(esRotY),sX=Math.sin(esRotX),cX=Math.cos(esRotX);
  const proj=[]; const ring=esEls.length<=7; const RR=Math.min(W,H)*0.38*intro; const nR=esEls.length;
  esEls.forEach(function(p,i){
    let sx,sy,sc;
    if(ring){
      // Anillo parejo que gira suave con esRotY (o con el dedo). Todos del mismo tamaño, alrededor del logo.
      const ang=-Math.PI/2 + (i/nR)*Math.PI*2 + esRotY;
      sx=cx+Math.cos(ang)*RR; sy=cy+Math.sin(ang)*RR*0.92; sc=1;
      proj[i]={sx:sx,sy:sy,sc:sc};
      p.el.style.transform='translate(-50%,-50%) translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px) scale(1)';
      p.el.style.opacity=Math.min(1,intro*1.4).toFixed(2); p.el.style.zIndex=60;
    } else {
      let x=p.x*cY - p.z*sY, z=p.x*sY + p.z*cY, y=p.y;
      let y2=y*cX - z*sX, z2=y*sX + z*cX;
      sc=(z2+1.7)/2.7; sx=cx+x*R; sy=cy+y2*R;
      proj[i]={sx:sx,sy:sy,sc:sc};
      p.el.style.transform='translate(-50%,-50%) translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px) scale('+sc.toFixed(3)+')';
      p.el.style.opacity=((0.3+sc*0.7)*Math.min(1,intro*1.4)).toFixed(2); p.el.style.zIndex=Math.round(sc*100);
    }
  });
  if(esCanvas){
    if(esCanvas.width!==W||esCanvas.height!==H){ esCanvas.width=W; esCanvas.height=H; }
    const ctx=esCanvas.getContext('2d'); ctx.clearRect(0,0,W,H); const now=Date.now()/300; ctx.lineCap='round';
    // 1) Rayo al tocar: solo aparece al tocar la pantalla, desde el punto de contacto hasta el núcleo
    const nowMs=Date.now();
    esToques=esToques.filter(function(t){
      const age=nowMs-t.t, dur=380; if(age>dur) return false;
      const fade=1-(age/dur);
      esRayo(ctx,t.x,t.y,cx,cy,t.t*0.01,fade,'#fc4c02');
      return true;
    });
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    // 2) Núcleo: aura morada de fondo (igual que antes) + el logo real en el centro, respiración lenta y suave
    const pulso=1+Math.sin(now*0.4)*0.06, cr=42*pulso;
    let g2=ctx.createRadialGradient(cx,cy,0,cx,cy,cr*1.75);
    g2.addColorStop(0,'rgba(190,0,255,0.42)'); g2.addColorStop(0.5,'rgba(120,0,255,0.16)'); g2.addColorStop(1,'rgba(120,0,255,0)');
    ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(cx,cy,cr*1.75,0,6.2832); ctx.fill();
    if(_esLogoReady){
      // Aura propia que respira junto con el logo (reemplaza el anillo blanco fijo)
      const auraPulso=(pulso-1)/0.06; // -1..1 según la respiración
      const auraR=cr*(1.25+auraPulso*0.12), auraOp=0.3+Math.max(0,auraPulso)*0.25;
      const auraG=ctx.createRadialGradient(cx,cy,cr*0.85,cx,cy,auraR);
      auraG.addColorStop(0,'rgba(252,76,2,'+auraOp.toFixed(2)+')'); auraG.addColorStop(1,'rgba(252,76,2,0)');
      ctx.fillStyle=auraG; ctx.beginPath(); ctx.arc(cx,cy,auraR,0,6.2832); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(cx,cy,cr,0,6.2832); ctx.clip();
      ctx.globalCompositeOperation='screen'; // el negro del logo se vuelve transparente: sin disco negro sobre la postal
      // recorta al cuadrado central Y le quita el margen negro + anillo blanco propios del logo
      const iw=_esLogoImg.naturalWidth||1251, ih=_esLogoImg.naturalHeight||1280;
      const side=Math.min(iw,ih), baseX=(iw-side)/2, baseY=(ih-side)/2;
      const inset=side*0.22, cropSide=side-inset*2; // más zoom = deja fuera el anillo blanco
      ctx.drawImage(_esLogoImg,baseX+inset,baseY+inset,cropSide,cropSide,cx-cr,cy-cr,cr*2,cr*2);
      ctx.restore();
    } else {
      let g=ctx.createRadialGradient(cx,cy,0,cx,cy,cr);
      g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.2,'rgba(130,245,255,0.95)'); g.addColorStop(0.5,'rgba(0,150,255,0.55)'); g.addColorStop(0.8,'rgba(150,60,255,0.28)'); g.addColorStop(1,'rgba(120,0,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,cr,0,6.2832); ctx.fill();
    }
  }
  esRAF=requestAnimationFrame(esLoop);
}
function _esXY(e){ const t=e.touches&&e.touches[0]; return {x:t?t.clientX:e.clientX, y:t?t.clientY:e.clientY}; }
function _esStart(e){ esDrag=true; esMoved=0; esLast=_esXY(e); sonidoCadenaIniciar(); }
function _esMove(e){ if(!esDrag) return; const p=_esXY(e), dx=p.x-esLast.x, dy=p.y-esLast.y; const mov=Math.abs(dx)+Math.abs(dy); esMoved+=mov; esRotY+=dx*0.006; esRotX-=dy*0.006; esVelY=dx*0.0005; esVelX=-dy*0.0005; esLast=p; cadenaVel(Math.max(0.12,Math.min(1,mov/38))); }
function _esEnd(){ esDrag=false; sonidoCadenaDetener(); }
function _esTap(e){
  if(esMoved>12) return; // fue un arrastre, no un toque
  const wrap=document.getElementById('esferaWrap'); if(!wrap) return;
  const p=_esXY(e), r=wrap.getBoundingClientRect();
  esToques.push({x:p.x-r.left, y:p.y-r.top, t:Date.now()});
}
function _pintarLunaEsfera(){
  try{
    var el=document.getElementById("esLuna"); if(!el) return;
    var h=new Date().getHours(); if(!(h>=19||h<7)){ el.style.opacity=0; return; }
    var SIN=29.530588853, REF=Date.UTC(2000,0,6,18,14);
    var f=((new Date().getTime()-REF)/864e5 % SIN)/SIN; if(f<0) f+=1;
    var s=50, r=s/2*0.86, cx=s/2, cy=s/2, t=f*2*Math.PI, rx=r*Math.cos(t), wax=f<0.5, sO=wax?1:0, sI=(rx>0)?(1-sO):sO;
    var top=cx+","+(cy-r), bot=cx+","+(cy+r);
    var lit="M "+top+" A "+r+","+r+" 0 0 "+sO+" "+bot+" A "+Math.abs(rx).toFixed(2)+","+r+" 0 0 "+sI+" "+top+" Z";
    el.innerHTML='<svg width="'+s+'" height="'+s+'" viewBox="0 0 '+s+' '+s+'"><defs><radialGradient id="lnG" cx="38%" cy="34%" r="72%"><stop offset="0%" stop-color="#fdfdf5"/><stop offset="55%" stop-color="#e9edf4"/><stop offset="100%" stop-color="#b9c2d4"/></radialGradient><clipPath id="lnC"><path d="'+lit+'"/></clipPath></defs><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#141a26"/><path d="'+lit+'" fill="url(#lnG)"/><g clip-path="url(#lnC)" opacity="0.5" fill="#9aa4b8"><ellipse cx="'+(cx-r*0.18)+'" cy="'+(cy-r*0.22)+'" rx="'+(r*0.2)+'" ry="'+(r*0.16)+'"/><ellipse cx="'+(cx-r*0.02)+'" cy="'+(cy+r*0.05)+'" rx="'+(r*0.26)+'" ry="'+(r*0.2)+'"/><ellipse cx="'+(cx+r*0.3)+'" cy="'+(cy+r*0.18)+'" rx="'+(r*0.14)+'" ry="'+(r*0.12)+'"/></g></svg>';
    el.title="Luna";
    el.style.opacity=0.92;
  }catch(e){}
}
function abrirEsfera(){
  const sc=document.getElementById('esferaScreen'); if(!sc) return; sc.classList.add('on');
  if(!esEls.length) construirEsfera();
  if(!esBound){ const w=document.getElementById('esferaWrap');
    w.addEventListener('mousedown',_esStart); window.addEventListener('mousemove',_esMove); window.addEventListener('mouseup',_esEnd);
    w.addEventListener('touchstart',_esStart,{passive:true}); w.addEventListener('touchmove',_esMove,{passive:true}); w.addEventListener('touchend',_esEnd);
    w.addEventListener('click',_esTap);
    esBound=true;
  }
  esIntroStart=Date.now();
  const fl=document.getElementById('esFlash'); if(fl){ fl.classList.remove('boom'); void fl.offsetWidth; fl.classList.add('boom'); }
  sonidoArco();
  esAplicarFondoModo(); _pintarLunaEsfera();
  const k=document.getElementById('esKm'); if(k) k.innerText=(us.di||0).toFixed(1);
  // Antes solo contaba viajes PLANIFICADOS completados — para la mayoría, que sale a
  // pedalear con "Iniciar navegación" directo (sin pasar por el planificador), este
  // número siempre marcaba 0 aunque llevara varias rutas grabadas de verdad.
  const v=document.getElementById('esViajes'); if(v) v.innerText=_totalViajesCompletos();
  actualizarMiPuesto();
  if(!esRAF) esLoop();
}
function cerrarEsfera(){ const sc=document.getElementById('esferaScreen'); if(sc) sc.classList.remove('on'); if(esRAF){ cancelAnimationFrame(esRAF); esRAF=null; } esDetenerPostales(); }
