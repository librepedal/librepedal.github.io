/* Libre Pedal — Efectos visuales de clima (integrado 2026-08-14)
   Ver COORDINACION-IA/SPEC-CLIMA-FX-2026-08-14.md: explica qué está validado por Inty
   y por qué se ve como se ve (no rediseñar sin releerlo). Motor de dibujo sin cambios
   respecto al prototipo — lo único tocado acá es el z-index (ver abajo) y el nombre de
   archivo/ubicación (movido de COORDINACION-IA/ a la raíz para poder cargarse en la app).

   Overlay de canvas fijo, pointer-events:none (nunca bloquea la UI real). Expone una sola
   función pública: climaFxSetMode('lluvia'|'nieve'|'neblina'|'nubes'|'sol'|'off').
   El enganche a clima real vive en index.html (vigilarClima() + _climaFxInicial()).

   z-index=5500 (antes 5 — quedaba tapado por #auth, z-index 5000, el bug documentado en
   el SPEC). Elegido para quedar POR ENCIMA de todas las pantallas/vistas normales,
   incluida #auth (5000, pedido explícito de Inty: el clima debe verse desde el login) y
   los diálogos genéricos .lp-dialog (4500, incluye confirmaciones/SOS — quedan con una
   capa muy sutil de clima encima, aceptable porque pointer-events:none nunca bloquea el
   toque y la intensidad del efecto ya está bajada a propósito). Por DEBAJO de las capas
   realmente críticas: loading-overlay/saver (6000), tutorial (7000+), pantallas de error
   fatal (9999) y la hoja de acciones inferior (99990) — esas nunca deben verse tapadas.
   Decisión documentada acá para que quien la revise no tenga que re-derivarla. */
(function(){
'use strict';

/* 25-ago-2026: antes, con prefers-reduced-motion activo, esto no montaba nada — el
   clima quedaba invisible para cualquier dispositivo con esa preferencia (frecuente en
   Android por ahorro de batería, no solo por sensibilidad real al movimiento). Ahora en
   ese caso se sigue dibujando el clima real, pero como UN solo frame quieto por cambio
   de modo (sin requestAnimationFrame de por medio) — nadie se queda sin ver el clima, y
   igual no hay ninguna animación continua para quien de verdad la necesita evitar. */
var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

var canvas=document.createElement('canvas');
canvas.id='climaFxCanvas';
canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:5500;pointer-events:none;';
document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(canvas); });
if(document.body) document.body.appendChild(canvas);

var ctx=canvas.getContext('2d'),W,H,DPR,mode='off';
var streaks=[],runners=[],splashes=[],motes=[],birds=[],wisps=[],flakes=[],clouds=[],shimmer=[],meat=null,t=0,meatTimer=0,spawnTick=0;
var COLS=18,ROWS=34,accum=new Float32Array(COLS*ROWS);
var accumCanvas=document.createElement('canvas');accumCanvas.width=COLS;accumCanvas.height=ROWS;var actx=accumCanvas.getContext('2d');var accumImg=actx.createImageData(COLS,ROWS);
var spots=[],spotsCanvas=document.createElement('canvas'),sctx=spotsCanvas.getContext('2d'),spotsDirty=true,spotCap=110;
var frostSegs=[],frostMaxGen=1,frostLevel=0,frostUnlocked=-1,frostDirty=true;
var frostCanvas=document.createElement('canvas'),fctx=frostCanvas.getContext('2d');
var fogP=[];

function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=canvas.width=Math.round(window.innerWidth*DPR);H=canvas.height=Math.round(window.innerHeight*DPR);spotsDirty=true;frostDirty=true;if(reducedMotion&&mode!=='off')drawFrame();}
window.addEventListener('resize',resize);
resize();

function cellAt(x,y){var cx=Math.min(COLS-1,Math.max(0,Math.floor(x/W*COLS)));var cy=Math.min(ROWS-1,Math.max(0,Math.floor(y/H*ROWS)));return cy*COLS+cx;}
function wipeAt(p){
var ccx=p.x/W*COLS,ccy=p.y/H*ROWS,rad=2.1;
for(var gy=0;gy<ROWS;gy++)for(var gx=0;gx<COLS;gx++){var dx=gx+.5-ccx,dy=gy+.5-ccy,d=Math.sqrt(dx*dx+dy*dy);if(d<rad){var idx=gy*COLS+gx;accum[idx]=Math.max(0,accum[idx]-(1-d/rad)*0.7);}}
var wr=30*DPR,before=spots.length;
spots=spots.filter(function(sp){var dx=sp.x-p.x,dy=sp.y-p.y;return Math.sqrt(dx*dx+dy*dy)>wr;});
if(spots.length!==before)spotsDirty=true;
var wr2=34*DPR,beforeF=frostSegs.length;
frostSegs=frostSegs.filter(function(s){var mx=(s.x1+s.x2)/2,my=(s.y1+s.y2)/2,dx=mx-p.x,dy=my-p.y;return Math.sqrt(dx*dx+dy*dy)>wr2;});
if(frostSegs.length!==beforeF)frostDirty=true;
var wr3=38*DPR;
for(var wi=0;wi<wisps.length;wi++){var w=wisps[wi];
w.puffs=w.puffs.filter(function(pp){var px=w.x+pp.dx,py=w.y+pp.dy;var dx=px-p.x,dy=py-p.y;return Math.sqrt(dx*dx+dy*dy)>wr3;});}
}
// Escucha en document (no en el canvas: pointer-events:none), así el gesto de limpiar
// convive con el scroll/tap normal de la app real sin bloquear nada.
var dragging=false;
function toCanvasPos(e){var cx=(e.touches?e.touches[0].clientX:e.clientX),cy=(e.touches?e.touches[0].clientY:e.clientY);return{x:cx*DPR,y:cy*DPR};}
document.addEventListener('pointerdown',function(e){dragging=true;wipeAt(toCanvasPos(e));},{passive:true});
document.addEventListener('pointermove',function(e){if(!dragging)return;wipeAt(toCanvasPos(e));},{passive:true});
document.addEventListener('pointerup',function(){dragging=false;},{passive:true});

/* Viento constante: lluvia real casi nunca cae perfectamente vertical (referencia:
   fotografía de lluvia con obturador rápido, gotas en vidrio de auto/tren siempre
   arrastradas hacia un lado). Un solo valor compartido, no por partícula, para que
   todo el aguacero se incline igual — si cada gota tuviera su propio ángulo se vería
   como ruido random, no como viento real. */
var windGust=0.55+Math.random()*0.3;
function mkStreak(fresh,layer){var d=layer===0?{sp:[15,24],ln:[28,46],w:[1,1.5],op:[.14,.26]}:{sp:[6,11],ln:[12,20],w:[.5,.8],op:[.06,.13]};var sp=d.sp[0]+Math.random()*(d.sp[1]-d.sp[0]);var tint=0.9+Math.random()*0.2;return{x:Math.random()*W,y:fresh?Math.random()*H:-40*DPR,len:(d.ln[0]+Math.random()*(d.ln[1]-d.ln[0]))*DPR,speed:sp*DPR,drift:(0.35+Math.random()*0.3)*DPR,op:d.op[0]+Math.random()*(d.op[1]-d.op[0]),w:(d.w[0]+Math.random()*(d.w[1]-d.w[0]))*DPR,layer:layer,tint:tint};}
/* Gotas en vidrio real: no serpentean con un seno limpio, meandran por la rugosidad
   microscópica de la superficie (empujón aleatorio ocasional, no oscilación regular) y
   SOLO empiezan a correr al superar un peso crítico (referencia: Physics of raindrops
   on windows). rMasa acumula "peso" absorbido de otras gotas -> crece y acelera más. */
function mkRunner(){return{x:Math.random()*W,y:-10,r:(2.2+Math.random()*3.4)*DPR,vy:0,trail:[],resting:40+Math.random()*160,meandro:0,meandroObjetivo:(Math.random()-0.5)*0.5};}
function mkFlake(fresh){return{x:Math.random()*W,y:fresh?Math.random()*H:-14*DPR,r:(1.2+Math.random()*3.2)*DPR,sp:(0.45+Math.random()*1.2)*DPR,sway:1+Math.random()*2,ph:Math.random()*6.28,rot:Math.random()*6.28,vrot:(Math.random()-.5)*.02,big:Math.random()<0.22,op:.45+Math.random()*.5};}
function mkFogP(depth){var r=(depth===0?46+Math.random()*54:20+Math.random()*30)*DPR;return{x:Math.random()*W,y:H*(0.3+Math.random()*0.8),r:r,vx:(Math.random()-0.5)*(depth===0?0.14:0.26)*DPR,ph:Math.random()*6.28,op:(depth===0?.02+Math.random()*.02:.026+Math.random()*.024),blur:depth===0?9:4,depth:depth};}
function mkWisp(fresh){var len=(80+Math.random()*100)*DPR,n=6+Math.floor(Math.random()*4),puffs=[];
for(var i=0;i<n;i++){var tpos=n===1?0.5:i/(n-1);var bell=Math.sin(tpos*Math.PI);puffs.push({dx:(tpos-0.5)*len,dy:(Math.random()-0.5)*9*DPR,r:(9+bell*20+Math.random()*7)*DPR});}
return{x:fresh?Math.random()*W:-len,y:H*(0.12+Math.random()*0.82),len:len,puffs:puffs,vx:(0.09+Math.random()*0.16)*DPR,op:0.055+Math.random()*0.05,ph:Math.random()*6.28,blur:5+Math.random()*4};}
function mkCloud(fresh){var s=0.55+Math.random()*1.5;var lobes=[];var n=4+Math.floor(Math.random()*4);for(var i=0;i<n;i++){var ang=(i/n)*6.28+Math.random()*0.6;var rr=18+Math.random()*22;lobes.push({dx:Math.cos(ang)*rr*(0.5+Math.random()*0.7),dy:Math.sin(ang)*rr*0.32*(0.4+Math.random()*0.6)-Math.random()*6,r:12+Math.random()*20});}
lobes.push({dx:0,dy:0,r:16+Math.random()*10});
return{x:fresh?Math.random()*W:-160*DPR*s,y:H*(0.04+Math.random()*0.24),s:s,sp:(0.09+Math.random()*0.16)*DPR,op:.13+Math.random()*.12,ph:Math.random()*6.28,lobes:lobes,puff:0.8+Math.random()*0.3};}

function mkSpotPts(r){var n=7+Math.floor(Math.random()*3),pts=[];for(var i=0;i<n;i++){var ang=(i/n)*6.28;var rr=r*(0.72+Math.random()*0.45);pts.push({x:Math.cos(ang)*rr,y:Math.sin(ang)*rr*(0.85+Math.random()*0.3)});}return pts;}
function mkSpot(){var r=(1.3+Math.pow(Math.random(),1.7)*5.2)*DPR;var yw=Math.pow(Math.random(),0.55);return{x:Math.random()*W,y:yw*H,r:r,pts:mkSpotPts(r),op:0.5+Math.random()*0.45};}
function seedSpots(){spots=[];var n=Math.min(spotCap,Math.max(60,Math.floor((W*H)/(11000*DPR*DPR))));for(var i=0;i<n;i++)spots.push(mkSpot());spotsDirty=true;}
function drawSpotShape(g2,sp){var pts=sp.pts,x=sp.x,y=sp.y;
g2.save();g2.beginPath();
for(var i=0;i<pts.length;i++){var p=pts[i];if(i===0){g2.moveTo(x+p.x,y+p.y);}else{var prev=pts[i-1];g2.quadraticCurveTo(x+prev.x,y+prev.y,x+(prev.x+p.x)/2,y+(prev.y+p.y)/2);}}
var last=pts[pts.length-1],first=pts[0];g2.quadraticCurveTo(x+last.x,y+last.y,x+(last.x+first.x)/2,y+(last.y+first.y)/2);
g2.closePath();
var rg=g2.createRadialGradient(x-sp.r*0.25,y-sp.r*0.3,sp.r*0.05,x,y,sp.r*1.05);
rg.addColorStop(0,'rgba(222,238,255,'+(0.4*sp.op)+')');
rg.addColorStop(0.5,'rgba(150,185,225,'+(0.26*sp.op)+')');
rg.addColorStop(0.85,'rgba(70,100,140,'+(0.22*sp.op)+')');
rg.addColorStop(1,'rgba(22,34,54,'+(0.32*sp.op)+')');
g2.fillStyle=rg;g2.fill();
g2.lineWidth=Math.max(0.4,sp.r*0.09);g2.strokeStyle='rgba(18,28,46,'+(0.28*sp.op)+')';g2.stroke();
g2.restore();
g2.save();g2.beginPath();g2.ellipse(x-sp.r*0.3,y-sp.r*0.32,sp.r*0.24,sp.r*0.15,-0.5,0,6.28);g2.fillStyle='rgba(255,255,255,'+(0.7*sp.op)+')';g2.fill();g2.restore();
}
function renderSpots(){spotsCanvas.width=W;spotsCanvas.height=H;sctx.filter='blur('+(0.5*DPR)+'px)';for(var i=0;i<spots.length;i++)drawSpotShape(sctx,spots[i]);sctx.filter='none';spotsDirty=false;}

function genFrostBranch(x,y,angle,len,depth,gen){
if(depth<=0||len<2*DPR)return;
var x2=x+Math.cos(angle)*len,y2=y+Math.sin(angle)*len;
frostSegs.push({x1:x,y1:y,x2:x2,y2:y2,gen:gen,w:Math.max(0.35*DPR,len*0.05)});
var nb=1+(Math.random()<0.75?1:0)+((depth>4&&Math.random()<0.25)?1:0);
for(var i=0;i<nb;i++){var da=(Math.random()-0.5)*1.15;genFrostBranch(x2,y2,angle+da,len*(0.6+Math.random()*0.2),depth-1,gen+1);}
}
function seedFrost(){
frostSegs=[];frostLevel=0;frostUnlocked=-1;
var seeds=[[0,0,0.85],[W,0,2.3],[0,H,-0.7],[W,H,3.9],[W*0.5,-2*DPR,1.62],[-2*DPR,H*0.5,0.05],[W+2*DPR,H*0.5,3.1],[W*0.5,H+2*DPR,-1.57]];
for(var i=0;i<seeds.length;i++)genFrostBranch(seeds[i][0],seeds[i][1],seeds[i][2],(24+Math.random()*16)*DPR,6,0);
frostMaxGen=0;for(var j=0;j<frostSegs.length;j++)if(frostSegs[j].gen>frostMaxGen)frostMaxGen=frostSegs[j].gen;
frostDirty=true;
}
function renderFrost(){
frostCanvas.width=W;frostCanvas.height=H;fctx.lineCap='round';
for(var i=0;i<frostSegs.length;i++){var s=frostSegs[i];if(s.gen>frostUnlocked)continue;
var fade=1-(s.gen/(frostMaxGen+1))*0.35;
fctx.strokeStyle='rgba(200,222,240,'+(0.28*fade)+')';fctx.lineWidth=s.w*1.9;
fctx.beginPath();fctx.moveTo(s.x1,s.y1);fctx.lineTo(s.x2,s.y2);fctx.stroke();
fctx.strokeStyle='rgba(255,255,255,'+(0.5*fade)+')';fctx.lineWidth=Math.max(0.4,s.w*0.55);
fctx.beginPath();fctx.moveTo(s.x1,s.y1);fctx.lineTo(s.x2,s.y2);fctx.stroke();}
frostDirty=false;
}

function seedRain(){streaks=[];for(var i=0;i<10;i++)streaks.push(mkStreak(true,0));for(var i2=0;i2<14;i2++)streaks.push(mkStreak(true,1));runners=[];for(var j=0;j<6;j++){var r=mkRunner();r.y=Math.random()*H;runners.push(r);}splashes=[];accum.fill(0);seedSpots();frostSegs=[];}
function seedSnow(){flakes=[];for(var i=0;i<40;i++)flakes.push(mkFlake(true));fogP=[];for(var f=0;f<7;f++)fogP.push(mkFogP(0));accum.fill(0);spots=[];seedFrost();}
function seedFog(){wisps=[];for(var i=0;i<16;i++)wisps.push(mkWisp(true));}
function seedClouds(){clouds=[];for(var i=0;i<5;i++)clouds.push(mkCloud(true));}
function seedSun(){motes=[];for(var i=0;i<14;i++)motes.push({x:Math.random()*W,y:Math.random()*H,r:(1+Math.random()*2)*DPR,sp:0.15+Math.random()*0.3,ph:Math.random()*6.28,op:0.13+Math.random()*0.2});birds=[];for(var b=0;b<2;b++)birds.push({x:-20-Math.random()*80,y:H*(0.12+Math.random()*0.18),sp:(0.35+Math.random()*0.25)*DPR,ph:Math.random()*6.28,scale:0.7+Math.random()*0.5});
shimmer=[];var nCols=10;for(var s2=0;s2<nCols;s2++){shimmer.push({x:((s2+0.5)/nCols)*W+(Math.random()-0.5)*14*DPR,baseY:H*(0.66+Math.random()*0.2),h:H*(0.24+Math.random()*0.18),ph:Math.random()*6.28,amp:(2.2+Math.random()*3.2)*DPR,freq:0.1+Math.random()*0.05,speed:1.4+Math.random()*1.3,w:(1.1+Math.random()*0.9)*DPR});}
meat=null;meatTimer=50+Math.random()*70;}

function stepAccum(rate,cap){for(var i=0;i<accum.length;i++)accum[i]=Math.min(cap,accum[i]+rate);}
function paintAccum(r,g,b,mult){var d=accumImg.data;for(var i=0;i<accum.length;i++){var v=accum[i];var o=i*4;d[o]=r;d[o+1]=g;d[o+2]=b;d[o+3]=Math.max(0,Math.min(255,Math.round(v*mult)));}actx.putImageData(accumImg,0,0);}
function drawAccumWet(){paintAccum(150,180,220,34);ctx.save();ctx.imageSmoothingEnabled=true;if(ctx.imageSmoothingQuality)ctx.imageSmoothingQuality='high';ctx.filter='blur('+(4.5*DPR)+'px)';ctx.drawImage(accumCanvas,0,0,W,H);ctx.restore();}

function drawDroplet(rn){
var x=rn.x,y=rn.y,r=rn.r;
ctx.save();
ctx.beginPath();
ctx.moveTo(x,y-r*1.15);
ctx.bezierCurveTo(x+r*0.9,y-r*0.35,x+r*0.82,y+r*0.55,x,y+r*0.98);
ctx.bezierCurveTo(x-r*0.82,y+r*0.55,x-r*0.9,y-r*0.35,x,y-r*1.15);
ctx.closePath();
var bodyG=ctx.createRadialGradient(x-r*0.18,y-r*0.05,r*0.04,x,y+r*0.1,r*1.15);
bodyG.addColorStop(0,'rgba(228,242,255,.5)');
bodyG.addColorStop(0.4,'rgba(160,195,232,.36)');
bodyG.addColorStop(0.78,'rgba(78,108,150,.28)');
bodyG.addColorStop(1,'rgba(32,48,76,.4)');
ctx.fillStyle=bodyG;ctx.fill();
ctx.lineWidth=Math.max(0.55,r*0.075);
ctx.strokeStyle='rgba(24,38,62,.32)';
ctx.stroke();
ctx.restore();
ctx.save();
ctx.beginPath();ctx.ellipse(x-r*0.26,y-r*0.5,r*0.15,r*0.22,-0.4,0,6.28);
ctx.fillStyle='rgba(255,255,255,.9)';ctx.fill();
ctx.restore();
ctx.save();
var soft=ctx.createRadialGradient(x+r*0.2,y+r*0.4,0,x+r*0.2,y+r*0.4,r*0.6);
soft.addColorStop(0,'rgba(205,226,255,.32)');soft.addColorStop(1,'rgba(205,226,255,0)');
ctx.fillStyle=soft;ctx.beginPath();ctx.arc(x+r*0.2,y+r*0.4,r*0.6,0,6.28);ctx.fill();
ctx.restore();
ctx.save();
ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=Math.max(0.5,r*0.055);
ctx.beginPath();ctx.ellipse(x,y+r*0.1,r*0.66,r*0.85,0,Math.PI*0.12,Math.PI*0.82);ctx.stroke();
ctx.restore();
}
function drawDropletTrail(rn){
if(rn.trail.length<2)return;
ctx.save();ctx.lineCap='round';
for(var tI=1;tI<rn.trail.length;tI++){var pt=rn.trail[tI],prev=rn.trail[tI-1],fade=tI/rn.trail.length;
ctx.strokeStyle='rgba(150,180,220,'+(0.1*fade)+')';ctx.lineWidth=rn.r*(0.5+0.3*fade);
ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(pt.x,pt.y);ctx.stroke();
ctx.strokeStyle='rgba(255,255,255,'+(0.15*fade)+')';ctx.lineWidth=rn.r*0.16;
ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(pt.x,pt.y);ctx.stroke();}
ctx.restore();
}

function drawRain(){
ctx.clearRect(0,0,W,H);
stepAccum(0.0009,0.34);
drawAccumWet();
ctx.lineCap='round';
for(var i=0;i<streaks.length;i++){var d=streaks[i];var dx0=d.drift*2+windGust*d.len*0.55;var gr=ctx.createLinearGradient(d.x,d.y-d.len,d.x-dx0,d.y);var b=Math.round(200*d.tint),c=Math.round(222*d.tint);gr.addColorStop(0,'rgba('+b+','+c+',255,0)');gr.addColorStop(0.55,'rgba('+b+','+c+',255,'+d.op+')');gr.addColorStop(1,'rgba(225,238,255,'+(d.op*0.7)+')');ctx.strokeStyle=gr;ctx.lineWidth=d.w;ctx.beginPath();ctx.moveTo(d.x,d.y-d.len);ctx.lineTo(d.x-dx0,d.y);ctx.stroke();
d.y+=d.speed;d.x-=d.drift*0.3+windGust*d.speed*0.4;if(d.y-d.len>H||d.x<-60*DPR)Object.assign(d,mkStreak(false,d.layer));}

spawnTick++;
if(spawnTick%5===0&&spots.length<spotCap&&Math.random()<0.7){spots.push(mkSpot());spotsDirty=true;}
if(spotsDirty)renderSpots();
ctx.drawImage(spotsCanvas,0,0);

for(var k=0;k<runners.length;k++){var rn=runners[k];
if(rn.resting>0)rn.resting--;else{
rn.vy=Math.min(rn.vy+0.15*DPR*(1+rn.r/(6*DPR)),3.4*DPR+windGust*DPR);rn.y+=rn.vy;
// Meandro real: empujón aleatorio ocasional hacia un objetivo, no oscilación regular.
if(Math.random()<0.02)rn.meandroObjetivo=(Math.random()-0.5)*0.7;
rn.meandro+=(rn.meandroObjetivo-rn.meandro)*0.04;
rn.x+=rn.meandro*DPR+windGust*0.18*DPR;
rn.trail.push({x:rn.x,y:rn.y});if(rn.trail.length>18)rn.trail.shift();accum[cellAt(rn.x,rn.y)]=Math.min(0.4,accum[cellAt(rn.x,rn.y)]+0.004);
// Absorbe gotas estáticas a su paso -> gana masa real (crece y por eso acelera más arriba).
var absorbidas=0;spots=spots.filter(function(sp){var dx=sp.x-rn.x,dy=sp.y-rn.y;var cerca=Math.sqrt(dx*dx+dy*dy)<=rn.r*1.25;if(cerca)absorbidas++;return!cerca;});
if(absorbidas>0){rn.r=Math.min(rn.r+absorbidas*0.5*DPR,9*DPR);spotsDirty=true;}}
drawDropletTrail(rn);
drawDroplet(rn);
if(rn.y>H+20||(rn.vy>=3.3*DPR&&Math.random()<0.012)){
var nSplash=3+Math.floor(rn.r/(2*DPR));
for(var sm=0;sm<nSplash;sm++){var ang=-1.57+(Math.random()-0.5)*2.4;var spd=(0.8+Math.random()*1.6)*DPR;splashes.push({x:rn.x,y:Math.min(rn.y,H-4),r:0.4*DPR,op:0.5+Math.random()*0.3,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd*1.4,mote:true});}
splashes.push({x:rn.x,y:Math.min(rn.y,H-4),r:1,op:0.42});
Object.assign(rn,mkRunner());}}
for(var s=splashes.length-1;s>=0;s--){var sp=splashes[s];
if(sp.mote){ctx.fillStyle='rgba(215,232,255,'+sp.op+')';ctx.beginPath();ctx.arc(sp.x,sp.y,sp.r,0,6.28);ctx.fill();sp.x+=sp.vx;sp.y+=sp.vy;sp.vy+=0.08*DPR;sp.op-=0.035;}
else{ctx.strokeStyle='rgba(210,228,255,'+sp.op+')';ctx.lineWidth=1*DPR;ctx.beginPath();ctx.arc(sp.x,sp.y,sp.r*DPR,0,6.28);ctx.stroke();sp.r+=0.6;sp.op-=0.02;}
if(sp.op<=0)splashes.splice(s,1);}
}
function drawFlake(f){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);ctx.globalAlpha=f.op;
if(f.big){ctx.strokeStyle='#fff';ctx.lineWidth=0.55*DPR;ctx.lineCap='round';for(var a=0;a<3;a++){ctx.save();ctx.rotate(a*2.094);ctx.beginPath();ctx.moveTo(0,-f.r*1.8);ctx.lineTo(0,f.r*1.8);ctx.moveTo(0,-f.r*1.1);ctx.lineTo(f.r*.55,-f.r*1.6);ctx.moveTo(0,-f.r*1.1);ctx.lineTo(-f.r*.55,-f.r*1.6);ctx.moveTo(0,f.r*1.1);ctx.lineTo(f.r*.55,f.r*1.6);ctx.moveTo(0,f.r*1.1);ctx.lineTo(-f.r*.55,f.r*1.6);ctx.stroke();ctx.restore();}}
else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,f.r,0,6.28);ctx.fill();}
ctx.restore();}
function drawSnow(){
ctx.clearRect(0,0,W,H);
stepAccum(0.0006,0.22);
ctx.filter='blur('+(6*DPR)+'px)';
for(var h=0;h<fogP.length;h++){var fp=fogP[h];fp.x+=fp.vx;if(fp.x<-fp.r)fp.x=W+fp.r;if(fp.x>W+fp.r)fp.x=-fp.r;var g=ctx.createRadialGradient(fp.x,fp.y,0,fp.x,fp.y,fp.r);g.addColorStop(0,'rgba(210,220,235,'+fp.op+')');g.addColorStop(1,'rgba(210,220,235,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(fp.x,fp.y,fp.r,0,6.28);ctx.fill();}
ctx.filter='none';
if(frostLevel<frostMaxGen+1){frostLevel+=0.014;var nu=Math.min(frostMaxGen,Math.floor(frostLevel));if(nu!==frostUnlocked){frostUnlocked=nu;frostDirty=true;}}
if(frostDirty)renderFrost();
ctx.drawImage(frostCanvas,0,0);
for(var i=0;i<flakes.length;i++){var f=flakes[i];drawFlake(f);
f.y+=f.sp;f.x+=Math.sin(t*0.6+f.ph)*f.sway*0.16;f.rot+=f.vrot;if(f.y>H+10)Object.assign(f,mkFlake(false));}
}
function drawFog(){
ctx.clearRect(0,0,W,H);
var groups={};for(var i=0;i<wisps.length;i++){var w=wisps[i];var bk=Math.round(w.blur);(groups[bk]=groups[bk]||[]).push(w);}
Object.keys(groups).forEach(function(bl){ctx.filter='blur('+(bl*DPR)+'px)';groups[bl].forEach(function(w){
w.x+=w.vx;if(w.x-w.len>W)Object.assign(w,mkWisp(false));
var wob=Math.sin(t*0.35+w.ph)*5*DPR;
for(var i2=0;i2<w.puffs.length;i2++){var p=w.puffs[i2];var cx=w.x+p.dx,cy=w.y+p.dy+wob;
var g=ctx.createRadialGradient(cx,cy,0,cx,cy,p.r);
g.addColorStop(0,'rgba(200,209,224,'+w.op+')');g.addColorStop(1,'rgba(200,209,224,0)');
ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,p.r,0,6.28);ctx.fill();}
});});
ctx.filter='none';
spawnTick++;
if(spawnTick%40===0){for(var wj=0;wj<wisps.length;wj++){if(wisps[wj].puffs.length<3&&Math.random()<0.3)Object.assign(wisps[wj],mkWisp(false));}}
}
function drawCloudShape(c){
ctx.save();ctx.filter='blur('+(3*DPR)+'px)';
for(var i=0;i<c.lobes.length;i++){var l=c.lobes[i];var cx=c.x+l.dx*c.s*DPR,cy=c.y+l.dy*c.s*DPR,r=l.r*c.s*DPR;
var g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(232,236,242,'+(c.op*c.puff)+')');g.addColorStop(1,'rgba(232,236,242,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,cy,r,r*0.72,0,0,6.28);ctx.fill();
ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,r,r*0.72,0,0,6.28);ctx.clip();
var shadow=ctx.createRadialGradient(cx+r*0.4,cy+r*0.32,0,cx+r*0.4,cy+r*0.32,r*1.0);
shadow.addColorStop(0,'rgba(118,130,152,'+(c.op*c.puff*0.6)+')');shadow.addColorStop(1,'rgba(118,130,152,0)');
ctx.fillStyle=shadow;ctx.fillRect(cx-r*1.3,cy-r*1.3,r*2.6,r*2.6);
var hi=ctx.createRadialGradient(cx-r*0.38,cy-r*0.4,0,cx-r*0.38,cy-r*0.4,r*0.85);
hi.addColorStop(0,'rgba(255,252,244,'+(c.op*c.puff*0.7)+')');hi.addColorStop(1,'rgba(255,252,244,0)');
ctx.fillStyle=hi;ctx.fillRect(cx-r*1.3,cy-r*1.3,r*2.6,r*2.6);
ctx.restore();}
ctx.restore();
}
function drawClouds(){ctx.clearRect(0,0,W,H);
for(var i=0;i<clouds.length;i++){var c=clouds[i];c.x+=c.sp;if(c.x>W+160*c.s*DPR)Object.assign(c,mkCloud(false));drawCloudShape(c);}}
function drawMeat(x,y,rot,op,scale){
scale=scale||1;var s=13*DPR*scale;
ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=op;
ctx.fillStyle='#efe3c8';
ctx.beginPath();
ctx.moveTo(-0.11*s,0.32*s);
ctx.quadraticCurveTo(-0.14*s,0.65*s,-0.15*s,0.85*s);
ctx.quadraticCurveTo(-0.16*s,1.0*s,0,1.08*s);
ctx.quadraticCurveTo(0.16*s,1.0*s,0.15*s,0.85*s);
ctx.quadraticCurveTo(0.14*s,0.65*s,0.11*s,0.32*s);
ctx.closePath();ctx.fill();
ctx.fillStyle='rgba(110,95,68,.4)';
ctx.beginPath();ctx.ellipse(0,1.02*s,0.13*s,0.09*s,0,0,6.28);ctx.fill();
ctx.beginPath();
ctx.moveTo(0,-s);
ctx.bezierCurveTo(0.5*s,-0.98*s,0.72*s,-0.55*s,0.6*s,-0.05*s);
ctx.bezierCurveTo(0.5*s,0.28*s,0.28*s,0.4*s,0.13*s,0.42*s);
ctx.bezierCurveTo(-0.13*s,0.42*s,-0.3*s,0.28*s,-0.5*s,0.0*s);
ctx.bezierCurveTo(-0.68*s,-0.5*s,-0.5*s,-0.95*s,0,-s);
ctx.closePath();
var mg=ctx.createLinearGradient(-0.5*s,-0.9*s,0.4*s,0.35*s);
mg.addColorStop(0,'#c9702f');mg.addColorStop(0.45,'#a4501f');mg.addColorStop(1,'#6e3313');
ctx.fillStyle=mg;ctx.fill();
ctx.save();ctx.clip();
ctx.strokeStyle='rgba(50,20,8,.4)';ctx.lineWidth=Math.max(0.4,0.05*s);ctx.lineCap='round';
ctx.beginPath();ctx.moveTo(-0.35*s,-0.55*s);ctx.lineTo(0.15*s,-0.15*s);ctx.stroke();
ctx.beginPath();ctx.moveTo(-0.15*s,-0.75*s);ctx.lineTo(0.4*s,-0.3*s);ctx.stroke();
ctx.beginPath();ctx.moveTo(-0.45*s,-0.15*s);ctx.lineTo(0.05*s,0.25*s);ctx.stroke();
var hi=ctx.createRadialGradient(-0.2*s,-0.65*s,0,-0.2*s,-0.65*s,0.35*s);
hi.addColorStop(0,'rgba(255,220,160,.55)');hi.addColorStop(1,'rgba(255,220,160,0)');
ctx.fillStyle=hi;ctx.beginPath();ctx.arc(-0.2*s,-0.65*s,0.35*s,0,6.28);ctx.fill();
ctx.restore();
ctx.strokeStyle='rgba(45,18,6,.5)';ctx.lineWidth=Math.max(0.5,0.035*s);ctx.stroke();
ctx.restore();
}
function drawSun(){
ctx.clearRect(0,0,W,H);t+=0.02;
var gh=ctx.createLinearGradient(0,H*0.6,0,H);
gh.addColorStop(0,'rgba(255,195,125,0)');gh.addColorStop(0.6,'rgba(255,200,130,.04)');gh.addColorStop(1,'rgba(255,205,140,.09)');
ctx.fillStyle=gh;ctx.fillRect(0,H*0.6,W,H*0.4);

ctx.save();ctx.filter='blur('+(1*DPR)+'px)';ctx.lineCap='round';
for(var s2=0;s2<shimmer.length;s2++){var sh=shimmer[s2];
var grad=ctx.createLinearGradient(sh.x,sh.baseY,sh.x,sh.baseY-sh.h);
grad.addColorStop(0,'rgba(255,212,160,.32)');grad.addColorStop(0.7,'rgba(255,224,190,.14)');grad.addColorStop(1,'rgba(255,230,205,0)');
ctx.strokeStyle=grad;ctx.lineWidth=sh.w;
ctx.beginPath();
for(var yy=0;yy<=sh.h;yy+=4*DPR){var prog=yy/sh.h;var xx=sh.x+Math.sin(prog*7+t*sh.speed+sh.ph)*sh.amp*prog;var py=sh.baseY-yy;if(yy===0)ctx.moveTo(xx,py);else ctx.lineTo(xx,py);}
ctx.stroke();}
ctx.restore();

for(var i=0;i<motes.length;i++){var m=motes[i];var yy2=m.y+Math.sin(t*m.sp+m.ph)*8*DPR,xx2=m.x+Math.cos(t*m.sp*.7+m.ph)*5*DPR;ctx.fillStyle='rgba(255,230,190,'+m.op+')';ctx.beginPath();ctx.arc(xx2,yy2,m.r,0,6.28);ctx.fill();}
ctx.strokeStyle='rgba(20,26,40,.55)';for(var b=0;b<birds.length;b++){var bd=birds[b];bd.x+=bd.sp;var by=bd.y+Math.sin(t*2+bd.ph)*3*DPR;if(bd.x>W+30)bd.x=-30-Math.random()*40;ctx.lineWidth=1.3*DPR*bd.scale;ctx.beginPath();var wf=Math.sin(t*9+bd.ph)*4*DPR*bd.scale;ctx.moveTo(bd.x-6*DPR*bd.scale,by-wf);ctx.quadraticCurveTo(bd.x,by+2*DPR*bd.scale,bd.x+6*DPR*bd.scale,by-wf);ctx.stroke();}
meatTimer--;if(!meat&&meatTimer<=0){meat={x:26*DPR+Math.random()*(W-52*DPR),y:-26*DPR,vy:1.5*DPR,rot:(Math.random()-0.5)*0.4,vr:(Math.random()-0.5)*0.05,scale:1.3+Math.random()*0.5};}
if(meat){meat.y+=meat.vy;meat.rot+=meat.vr;var op=meat.y>H-34*DPR?Math.max(0,1-(meat.y-(H-34*DPR))/(34*DPR)):1;drawMeat(meat.x,meat.y,meat.rot,op,meat.scale);if(meat.y>H+28*DPR){meat=null;meatTimer=110+Math.random()*180;}}
}
function drawFrame(){if(mode==='lluvia')drawRain();else if(mode==='nieve')drawSnow();else if(mode==='neblina')drawFog();else if(mode==='nubes')drawClouds();else if(mode==='sol')drawSun();else ctx.clearRect(0,0,W,H);}
function loop(){if(reducedMotion)return;drawFrame();requestAnimationFrame(loop);}

/* Fondo desenfocado: la referencia real (fotografía de lluvia en vidrio, guía técnica de
   Codrops) coincide en que sin esto el efecto se ve "pegado encima" en vez de fotográfico
   -- el ojo espera que lo que está detrás de las gotas quede fuera de foco. backdrop-filter
   desenfoca la app real detrás del canvas (no el dibujo del canvas mismo); costo bajo
   porque es un valor CSS fijo por cambio de modo, no algo que se anime cada frame -- mismo
   mecanismo que ya usa el tema Cristal en #auth en esta misma app.*/
var BLUR_POR_MODO={lluvia:'1.6px',nieve:'1.1px'};
function aplicarDesenfoqueFondo(m){
var b=BLUR_POR_MODO[m];
canvas.style.backdropFilter=b?'blur('+b+')':'';
canvas.style.webkitBackdropFilter=b?'blur('+b+')':'';
}

var validModes={lluvia:1,nieve:1,neblina:1,nubes:1,sol:1,off:1};
window.climaFxSetMode=function(m){
if(!validModes[m]||m===mode)return;
mode=m;
aplicarDesenfoqueFondo(m);
if(m==='lluvia')seedRain();else if(m==='nieve')seedSnow();else if(m==='neblina')seedFog();else if(m==='nubes')seedClouds();else if(m==='sol')seedSun();
if(reducedMotion)drawFrame();
};

loop();
})();
