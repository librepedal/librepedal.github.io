/* ===== EL VEHÍCULO DE PISTERO v2 (2026-10-04, Inty: "la bici está genérica"; "hay que diferenciar
   el tipo de ciclista: montaña, ruta, cicloviajeros, motos y autos; preocúpate harto de la estética
   del movimiento y de las extremidades, de los accesorios y de las bicicletas") =====
   Reemplazo directo de pistero-bici.js: misma firma _pistBiciSVG(opts,cfg), mismo viewBox.
   Tipos (o.biciTipo):
     ruta       aro perfil alto, manubrio de ruta con manetas, caramagiola, ciclocomputador; postura aero (más aún con cfg.rapido)
     mtb        tacos, horquilla con suspensión, frenos de disco, tija telescópica, mochila de hidratación, short holgado
     cicloviaje alforjas delanteras y traseras, carpa enrollada en la parrilla, bolso de manubrio, banderín que flamea, dos caramagiolas
     urbana     cuadro abierto, canasto, parrilla con reflectante, guardabarros, cubrecadena, luz, jeans y mochila
     bmx        rayos gruesos de color, manubrio alto con protector, pegs, polerón
     playera    cruiser de doble tubo, neumáticos balón con banda blanca, timbre, asiento con resortes
     moto       moto aventurera: estanque del color elegido, maleta lateral y top case, parabrisas; piloto con chaqueta y botas
     auto       auto chico con Pistero al volante y SU bici en el portabicis del techo
   MOVIMIENTO (16 cuadros por vuelta, SMIL, sin JS por frame):
     - el tobillo trabaja: punta abajo atrás, talón al frente (el pie no se desliza plano)
     - piernas con muslo y pantorrilla; brazos con codo que absorbe el vaivén del torso
     - cadera, torso y cabeza se mecen con cada pedalada; moto/auto rebotan con la suspensión
   Ids únicos por dibujo (clipPath del auto): varias en la misma página no chocan. */

// catálogo (PIST_BICI / PIST_BICI_COL) en pistero-armario.js

// Geometría de bicis (viewBox 0 0 124 108). r = radio de rueda, tw = grosor de neumático.
// rw/fw ruedas · bb pedalier · st unión tubo superior/sillín · ht/hb tubo de dirección · sd sillín
// hip cadera · sh hombro · head centro de la cabeza (la mano sale del manubrio)
var _BICI_G={
  ruta:      {r:15.5,tw:2.6,rw:[30,88],fw:[94,88],bb:[60,90],st:[52,62],ht:[84,60],hb:[87,70],sd:[49,55.5],hip:[50,52],sh:[70,41],head:[76,27],inc:10},
  mtb:       {r:15.5,tw:4.4,rw:[30,88],fw:[94,88],bb:[60,91],st:[53,66],ht:[85,58],hb:[88,70],sd:[50,59.5],hip:[51,56],sh:[67,40],head:[71,26],inc:6},
  cicloviaje:{r:15.5,tw:3.4,rw:[29,88],fw:[95,88],bb:[60,90],st:[51,62],ht:[85,57],hb:[88,68],sd:[48,55.5],hip:[49,52],sh:[63,37],head:[67,23],inc:4},
  urbana:    {r:15.5,tw:3.2,rw:[30,88],fw:[94,88],bb:[60,90],st:[50,62],ht:[84,56],hb:[87,68],sd:[47,55.5],hip:[48,52],sh:[56,33],head:[60,19],inc:0},
  bmx:       {r:12,  tw:3.8,rw:[36,92],fw:[88,92],bb:[60,93],st:[55,74],ht:[83,66],hb:[85,76],sd:[52,70.5],hip:[53,64],sh:[63,45],head:[66,31],inc:4},
  playera:   {r:15.5,tw:5.4,rw:[30,88],fw:[95,88],bb:[58,90],st:[48,62],ht:[86,58],hb:[88,68],sd:[46,55.5],hip:[46,51],sh:[53,33],head:[57,19],inc:-3}
};
// ropa por tipo: hasta = cuánto del muslo cubre (0..1; 2 = pierna completa); ap = holgura; calzado
var _BICI_ROPA={
  ruta:      {pierna:'#111827',hasta:.72,ap:0,  calcetin:'#f8fafc',zap:'#f8fafc',suela:'#111827',extra:'franja'},
  mtb:       {pierna:'#3f4a3a',hasta:.94,ap:.7,calcetin:'#1f2937',zap:'#374151',suela:'#111827',extra:'hidra'},
  cicloviaje:{pierna:'#8a7556',hasta:.86,ap:.5, calcetin:'',       zap:'',       suela:'#3f3a33',extra:'buff',sandalia:1},
  urbana:    {pierna:'#2f5592',hasta:2,  ap:.4, calcetin:'',       zap:'#f8fafc',suela:'#94a3b8',extra:'mochila'},
  bmx:       {pierna:'#1f2937',hasta:2,  ap:.6, calcetin:'',       zap:'#dc2626',suela:'#f8fafc',extra:'capucha'},
  playera:   {pierna:'#0ea5e9',hasta:.62,ap:.7,calcetin:'',       zap:'',       suela:'#7c5a2e',extra:'flores',sandalia:1}
};
var _biciUid=0;
function _bP(p){ return p[0].toFixed(1)+' '+p[1].toFixed(1); }
function _bC(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }
function _bL(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]; }
function _bAng(a,b){ return Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI; }
function _bRot(v,g){ g=g*Math.PI/180; return [v[0]*Math.cos(g)-v[1]*Math.sin(g),v[0]*Math.sin(g)+v[1]*Math.cos(g)]; }
// articulación de dos segmentos de largo L entre A y B; elegir(k1,k2) decide hacia dónde dobla
function _bIK(A,B,L,elegir){
  var dx=B[0]-A[0], dy=B[1]-A[1], d=Math.min(Math.sqrt(dx*dx+dy*dy),2*L-0.01), base=Math.atan2(dy,dx), a=Math.acos(d/(2*L));
  return elegir([A[0]+L*Math.cos(base-a),A[1]+L*Math.sin(base-a)],[A[0]+L*Math.cos(base+a),A[1]+L*Math.sin(base+a)]);
}
function _biciRodilla(H,P,L){ return _bIK(H,P,L,function(a,b){ return a[0]>b[0]?a:b; }); }
function _bCodo(S,H,L){ return _bIK(S,H,L,function(a,b){ return a[1]>b[1]?a:b; }); }
// cápsula ahusada A(ra) → B(rb); estructura fija → se puede animar 'd'
function _bCap(A,B,ra,rb){
  var dx=B[0]-A[0], dy=B[1]-A[1], d=Math.sqrt(dx*dx+dy*dy)||1, nx=-dy/d, ny=dx/d;
  return 'M'+_bP([A[0]+nx*ra,A[1]+ny*ra])+' L'+_bP([B[0]+nx*rb,B[1]+ny*rb])+' A'+rb+' '+rb+' 0 0 0 '+_bP([B[0]-nx*rb,B[1]-ny*rb])
    +' L'+_bP([A[0]-nx*ra,A[1]-ny*ra])+' A'+ra+' '+ra+' 0 0 0 '+_bP([A[0]+nx*ra,A[1]+ny*ra])+' Z';
}
// extremidad con músculo: como la cápsula pero con panza en el punto t; lado +1/-1 = qué costado abulta más
// (pantorrilla atrás de la canilla, cuádriceps arriba del muslo, espalda redonda del torso)
function _bLimb(A,B,ra,rm,rb,lado,t){
  var dx=B[0]-A[0], dy=B[1]-A[1], d=Math.sqrt(dx*dx+dy*dy)||1, nx=-dy/d, ny=dx/d, M=_bL(A,B,t||.4);
  var k1=rm*(lado>0?1.28:1), k2=rm*(lado<0?1.28:1);
  return 'M'+_bP([A[0]+nx*ra,A[1]+ny*ra])+' Q'+_bP([M[0]+nx*k1,M[1]+ny*k1])+' '+_bP([B[0]+nx*rb,B[1]+ny*rb])
    +' A'+rb+' '+rb+' 0 0 0 '+_bP([B[0]-nx*rb,B[1]-ny*rb])
    +' Q'+_bP([M[0]-nx*k2,M[1]-ny*k2])+' '+_bP([A[0]-nx*ra,A[1]-ny*ra])+' A'+ra+' '+ra+' 0 0 0 '+_bP([A[0]+nx*ra,A[1]+ny*ra])+' Z';
}
function _bArc(c,R,a1,a2){
  function p(a){ a=a*Math.PI/180; return [c[0]+R*Math.cos(a),c[1]+R*Math.sin(a)]; }
  return 'M'+_bP(p(a1))+' A'+R+' '+R+' 0 '+((a2-a1)>180?1:0)+' 1 '+_bP(p(a2));
}
// tubo con contorno oscuro + color + brillo
function _bTubo(d,w,col,osc,cla){
  return '<path d="'+d+'" fill="none" stroke="'+osc+'" stroke-width="'+(w+1.5).toFixed(1)+'" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<path d="'+d+'" fill="none" stroke="'+cla+'" stroke-width="'+(w*.32).toFixed(2)+'" stroke-linecap="round" stroke-linejoin="round" opacity=".75" transform="translate(-.35 -.55)"/>';
}
// path animado: vals = un 'd' por cuadro; cierra el ciclo repitiendo el primero
function _bAP(vals,fill,anim,dur,extra){
  return '<path d="'+vals[0]+'" fill="'+fill+'"'+(extra||'')+'>'+(anim?'<animate attributeName="d" values="'+vals.concat([vals[0]]).join(';')+'" dur="'+dur+'s" repeatCount="indefinite"/>':'')+'</path>';
}
function _bAT(tipo,vals,anim,dur){
  return anim?'<animateTransform attributeName="transform" type="'+tipo+'" values="'+vals.concat([vals[0]]).join(';')+'" dur="'+dur+'s" repeatCount="indefinite"/>':'';
}
function _bGira(c,anim,dur){ return anim?'<animateTransform attributeName="transform" type="rotate" from="0 '+c[0]+' '+c[1]+'" to="360 '+c[0]+' '+c[1]+'" dur="'+dur+'s" repeatCount="indefinite"/>':''; }
// humo del escape (moto/auto): 3 bocanadas que salen hacia atrás, crecen y se desvanecen
function _bHumo(p,anim){
  if(!anim) return '';
  var s='';
  for(var i=0;i<3;i++) s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="1.2" fill="#cbd5e1" opacity="0">'
    +'<animate attributeName="cx" values="'+p[0]+';'+(p[0]-12)+'" dur="1.2s" begin="'+(i*.4)+'s" repeatCount="indefinite"/>'
    +'<animate attributeName="cy" values="'+p[1]+';'+(p[1]-5)+'" dur="1.2s" begin="'+(i*.4)+'s" repeatCount="indefinite"/>'
    +'<animate attributeName="r" values="1.2;3.6" dur="1.2s" begin="'+(i*.4)+'s" repeatCount="indefinite"/>'
    +'<animate attributeName="opacity" values=".55;0" dur="1.2s" begin="'+(i*.4)+'s" repeatCount="indefinite"/></circle>';
  return s;
}
function _biciRueda(c,G,tipo,anim,dur,col){
  var r=G.r, tw=G.tw, rr=r-tw/2, s='', sp='', i, a;
  s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="none" stroke="#151a23" stroke-width="'+tw+'"/>';
  if(tipo==='mtb') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r+tw/2).toFixed(1)+'" fill="none" stroke="#151a23" stroke-width="1.7" stroke-dasharray="1.4 1.2"/>';
  if(tipo==='bmx'||tipo==='cicloviaje') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r+tw/2-.2).toFixed(1)+'" fill="none" stroke="#151a23" stroke-width="1.1" stroke-dasharray="1 1.2"/>';
  if(tipo==='playera') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr+1.1).toFixed(1)+'" fill="none" stroke="#f5ead4" stroke-width="1.5"/>';
  if(tipo==='cicloviaje'||tipo==='urbana') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr+.7).toFixed(1)+'" fill="none" stroke="#9ca3af" stroke-width=".5" opacity=".8"/>';
  if(tipo==='ruta') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr-2).toFixed(1)+'" fill="none" stroke="#1f2937" stroke-width="4"/>';
  else s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr-.8).toFixed(1)+'" fill="none" stroke="'+(tipo==='bmx'?col:'#cbd5e1')+'" stroke-width="1.5"/>';
  var g='';
  if(tipo==='bmx'){
    for(i=0;i<5;i++){ a=i*2*Math.PI/5-Math.PI/2; g+='<path d="M'+_bP(c)+' L'+_bP([c[0]+Math.cos(a)*(rr-1.4),c[1]+Math.sin(a)*(rr-1.4)])+'" stroke="'+col+'" stroke-width="2.2" stroke-linecap="round"/>'; }
  } else {
    var ri=(tipo==='ruta'?rr-4:rr-1.5), n=(tipo==='cicloviaje'?20:16);
    for(i=0;i<n;i++){ a=i*2*Math.PI/n; var o=(i%2?.35:-.35);
      sp+='M'+_bP([c[0]+Math.cos(a+o)*1.6,c[1]+Math.sin(a+o)*1.6])+' L'+_bP([c[0]+Math.cos(a)*ri,c[1]+Math.sin(a)*ri])+' '; }
    g+='<path d="'+sp+'" stroke="#d6dde6" stroke-width=".45"/>';
    if(tipo==='ruta') g+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr-2).toFixed(1)+'" fill="none" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="7 '+(Math.PI*(rr-2)-7).toFixed(1)+'"/>';
  }
  g+='<circle cx="'+(c[0]+rr-1.2).toFixed(1)+'" cy="'+c[1]+'" r=".7" fill="#9ca3af"/>';
  s+='<g>'+g+_bGira(c,anim,dur)+'</g>';
  if(tipo==='mtb') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="4.4" fill="none" stroke="#b6bcc6" stroke-width="1.5"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="4.4" fill="none" stroke="#6b7280" stroke-width=".6" stroke-dasharray=".8 1.4"/>';
  s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(tipo==='bmx'?2.6:1.9)+'" fill="#6b7280" stroke="#374151" stroke-width=".6"/>';
  return s;
}
// datos comunes del Pistero (colores de piel/polera, cabeza)
function _bPersona(o){
  var piel=(PIST_PIEL.find(function(p){return p.id===o.piel;})||PIST_PIEL[0]).c;
  var polera=(o.cuello==='maillot'&&o.pano)?o.pano:(o.disenoCol&&o.disenoCol!=='#ffffff'?o.disenoCol:'#fc4c02');
  return {piel:piel,pielS:_lpShade(piel,-.2),polera:polera,poleraS:_lpShade(polera,-.3)};
}
function _bCabeza(o,expr,c,hw){
  return _pistoDe(o,expr||'feliz').replace('<svg viewBox="0 0 100 84"','<svg x="'+(c[0]-hw/2).toFixed(1)+'" y="'+(c[1]-hw*0.6).toFixed(1)+'" width="'+hw+'" height="'+(hw*0.84).toFixed(1)+'" viewBox="0 0 100 84"');
}
// calzado con el origen en la planta (bajo el metatarso): así gira sobre el pedal/pedalín
function _bZapato(R,c,piel){
  if(R.sandalia) return '<path d="M-4.4 -.6 Q-4.6 -3 -1.8 -3.2 L1.4 -2.6 Q3.8 -2 3.4 -.4 Z" fill="'+c(piel)+'"/><path d="M-4.8 .4 L4 .4" stroke="'+c(R.suela)+'" stroke-width="1.3" stroke-linecap="round"/>'
    +'<path d="M-.6 -3 L.4 .2 M-3.4 -2.4 L-2.8 .2" stroke="'+c(R.suela)+'" stroke-width=".8"/>';
  if(R.bota) return '<path d="M-4.6 .2 L-4.6 -6 Q-4.4 -7 -2.2 -7 L-.8 -7 L-.6 -3 L2.4 -2.4 Q4.6 -1.8 4.4 .2 Z" fill="'+c(R.bota)+'" stroke="#000" stroke-width=".4"/><path d="M-4.8 .5 L4.6 .5" stroke="#000" stroke-width="1.3" stroke-linecap="round"/>';
  return '<path d="M-4.8 -.4 Q-5 -3 -2 -3.2 L1.4 -2.4 Q4.2 -1.6 3.8 .4 Z" fill="'+c(R.zap)+'" stroke="'+c(R.suela)+'" stroke-width=".5"/><path d="M-5 .5 L4 .5" stroke="'+c(R.suela)+'" stroke-width="1.3" stroke-linecap="round"/>';
}

function _pistBiciSVG(opts, cfg){
  cfg=cfg||{}; var o=_pistNormal(opts), tipo=o.biciTipo||'ruta';
  if(tipo==='moto') return _pistMotoSVG(o,cfg);
  if(tipo==='auto') return _pistAutoSVG(o,cfg);
  var G=_BICI_G[tipo]||_BICI_G.ruta, R=_BICI_ROPA[tipo]||_BICI_ROPA.ruta, Y=_bPersona(o);
  var col=o.biciCol||_lpColCasco(o.casco), osc=_lpShade(col,-.45), cla=_lpShade(col,.5);
  var anim=cfg.pedal!==false, dur=cfg.cadencia||0.9, rc=7, N=16, s='';
  var aero=(cfg.rapido&&(tipo==='ruta'||tipo==='mtb'))?1:0;
  var SH=[G.sh[0]+aero*3,G.sh[1]+aero*4], HEAD=[G.head[0]+aero*4,G.head[1]+aero*4.5];
  // pelvis: el glúteo se asienta SOBRE el sillín (lo aplasta un poco) y de ahí salen el muslo y el torso
  var GL=[G.hip[0]-1.8,G.sd[1]-2.4-4.2+1.6], HIP=[GL[0]+1.8,GL[1]-.8];

  // ---- manubrio: define dónde va la mano ----
  var ht=G.ht, bar='', barExtra='', S, hand;
  if(tipo==='ruta'||tipo==='cicloviaje'){ S=[ht[0]+4.5,ht[1]-2.6]; hand=aero?[S[0]+5,S[1]+5.4]:[S[0]+4,S[1]-1.2];
    bar='M'+_bP(S)+' L'+_bP([S[0]+3.6,S[1]])+' Q'+_bP([S[0]+8,S[1]+.6])+' '+_bP([S[0]+7.2,S[1]+5])+' Q'+_bP([S[0]+6.4,S[1]+9.4])+' '+_bP([S[0]+2,S[1]+8.6]);
    barExtra='<path d="M'+_bP([S[0]+2.6,S[1]-.4])+' q1.6 -2.4 3.4 -.4 l-.4 1.6 Z" fill="#111827"/><path d="M'+_bP([S[0]+5.4,S[1]+.6])+' q1.6 3 .2 6" fill="none" stroke="#374151" stroke-width="1" stroke-linecap="round"/>';
    if(tipo==='ruta') barExtra+='<rect x="'+(S[0]-1.6).toFixed(1)+'" y="'+(S[1]-2.6).toFixed(1)+'" width="3.4" height="2" rx=".5" fill="#111827" stroke="#64748b" stroke-width=".4"/>'; }
  else if(tipo==='mtb'){ S=[ht[0]+3,ht[1]-4]; hand=[S[0]+1.2,S[1]-2.6];
    bar='M'+_bP(S)+' L'+_bP([S[0]+1,S[1]-2.6]);
    barExtra='<path d="'+_bCap([S[0]-1.2,S[1]-2.2],[S[0]+3.6,S[1]-3],1.6,1.6)+'" fill="#111827"/><path d="M'+_bP([S[0]+2,S[1]-2])+' l3.4 1.6" stroke="#374151" stroke-width="1" stroke-linecap="round"/>'; }
  else if(tipo==='urbana'){ S=[ht[0]+1,ht[1]-8]; hand=[ht[0]-4.2,ht[1]-8.8];
    bar='M'+_bP(ht)+' L'+_bP(S)+' Q'+_bP([ht[0]-1,ht[1]-10.5])+' '+_bP([ht[0]-5,ht[1]-9]);
    barExtra='<path d="'+_bCap([ht[0]-2.4,ht[1]-9.4],[ht[0]-6,ht[1]-8.6],1.5,1.5)+'" fill="#7c5a2e"/>'; }
  else if(tipo==='bmx'){ S=[ht[0]-1,ht[1]-17]; hand=[ht[0]-2.4,ht[1]-17.2];
    bar='M'+_bP(ht)+' L'+_bP(S)+' M'+_bP([ht[0]-3,ht[1]-10])+' L'+_bP([ht[0]+3,ht[1]-10]);
    barExtra='<path d="'+_bCap([ht[0]-3.2,ht[1]-10],[ht[0]+3.2,ht[1]-10],1.9,1.9)+'" fill="'+col+'" stroke="'+osc+'" stroke-width=".6"/>'
      +'<path d="'+_bCap([ht[0]-4.6,ht[1]-17.2],[ht[0]+.6,ht[1]-17.6],1.7,1.7)+'" fill="#111827"/>'; }
  else { S=[ht[0]+1.4,ht[1]-6.5]; hand=[ht[0]-7,ht[1]-11.4];
    bar='M'+_bP(ht)+' L'+_bP(S)+' Q'+_bP([ht[0]+.4,ht[1]-12])+' '+_bP([ht[0]-8.6,ht[1]-11.4]);
    barExtra='<path d="'+_bCap([ht[0]-5.6,ht[1]-11.6],[ht[0]-9.6,ht[1]-11.3],1.6,1.6)+'" fill="#f5ead4" stroke="#c9b78f" stroke-width=".4"/>'
      +'<circle cx="'+(ht[0]-1.4).toFixed(1)+'" cy="'+(ht[1]-12.6).toFixed(1)+'" r="1.6" fill="#facc15" stroke="#a16207" stroke-width=".5"/>'; }

  // ---- cuerpo: 16 poses por vuelta de biela ----
  // largo de pierna: que en el punto más bajo quede apenas flectada (como un ciclista bien ajustado)
  function pedal(t){ return [G.bb[0]+rc*Math.cos(t),G.bb[1]+rc*Math.sin(t)]; }
  function tobillo(t){ var P=pedal(t), fa=8+12*Math.sin(t-Math.PI/4), v=_bRot([-2,-2.6],fa); return {P:P,fa:fa,T:[P[0]+v[0],P[1]+v[1]]}; }
  var dmax=0, k; for(k=0;k<N;k++){ var tt=tobillo(k*2*Math.PI/N).T; dmax=Math.max(dmax,Math.hypot(tt[0]-HIP[0],tt[1]-HIP[1])); }
  var L=dmax/2+.9, La=Math.max(Math.hypot(hand[0]-SH[0],hand[1]-SH[1])/2+1.6,11), ap=R.ap;
  var F=[];
  for(k=0;k<N;k++){
    var th=k*2*Math.PI/N, bob=Math.sin(2*th-.6)*.5, f={};
    f.hip=[HIP[0],HIP[1]+bob*.25]; f.gl=_bC([0,bob*.25]); f.ta=[GL[0]+.6,GL[1]-2.2+bob*.25]; f.sh=[SH[0]+bob*.25,SH[1]+bob]; f.head=[bob*.3,bob*1.15];
    [['n',th],['f',th+Math.PI]].forEach(function(pp){
      var x=pp[0], A=tobillo(pp[1]), K=_biciRodilla(f.hip,A.T,L);
      f[x+'mus']=_bLimb(f.hip,K,4.3,3.9,3,-1,.4); f[x+'can']=_bLimb(K,A.T,3,3,1.9,1,.32);
      if(R.hasta<=1) f[x+'ropa']=_bLimb(f.hip,_bL(f.hip,K,R.hasta),4.7+ap,4.25+ap,4.65-1.3*R.hasta+ap*.6,-1,.42);
      else { f[x+'ropa']=_bLimb(f.hip,K,4.7+ap,4.25+ap,3.3+ap*.5,-1,.4); f[x+'ropa2']=_bLimb(K,A.T,3.3+ap*.5,3.2+ap*.5,2.5+ap*.4,1,.32); }
      if(R.calcetin) f[x+'cal']=_bCap(_bL(K,A.T,.7),A.T,2.3,2.1);
      f[x+'pie']=_bC(A.P); f[x+'rot']=A.fa.toFixed(1);
    });
    [['n',hand,f.sh],['f',[hand[0]-1.4,hand[1]-.8],[f.sh[0]-1.6,f.sh[1]+.6]]].forEach(function(pp){
      var x=pp[0], H=pp[1], Sh=pp[2], E=_bCodo(Sh,H,La);
      f[x+'bra']=_bLimb(Sh,E,3,2.9,2.4,1,.4); f[x+'ant']=_bLimb(E,H,2.5,2.5,2,1,.32); f[x+'man']=_bLimb(Sh,_bL(Sh,E,.55),3.7,3.6,3.2,1,.5);
    });
    f.torso=_bLimb(f.ta,f.sh,5.6,6.1,5.4,-1,.56);
    f.cuello=_bCap(f.sh,_bL(f.sh,[HEAD[0]+f.head[0],HEAD[1]+f.head[1]],.35),2.6,2.5);
    f.esp=_bC([bob*.2,bob*.65]);
    F.push(f);
  }
  function col_(x){ return F.map(function(f){ return f[x]; }); }
  function pierna(x){
    var c=x==='n'?function(v){return v;}:function(v){return _lpShade(v,-.28);};
    var t=_bAP(col_(x+'mus'),c(Y.piel),anim,dur)+_bAP(col_(x+'can'),c(Y.piel),anim,dur)+_bAP(col_(x+'ropa'),c(R.pierna),anim,dur);
    if(F[0][x+'ropa2']) t+=_bAP(col_(x+'ropa2'),c(R.pierna),anim,dur);
    if(F[0][x+'cal']) t+=_bAP(col_(x+'cal'),c(R.calcetin),anim,dur);
    // el pie viaja con el pedal (translate) y gira con el tobillo (rotate)
    t+='<g transform="translate('+F[0][x+'pie']+')">'+_bAT('translate',col_(x+'pie'),anim,dur)+'<g transform="rotate('+F[0][x+'rot']+')">'+_bAT('rotate',col_(x+'rot'),anim,dur)+_bZapato(R,c,Y.piel)+'</g></g>';
    return t;
  }
  function brazo(x){
    var cp=x==='n'?Y.piel:Y.pielS, cpo=x==='n'?Y.polera:Y.poleraS, H=x==='n'?hand:[hand[0]-1.4,hand[1]-.8];
    return _bAP(col_(x+'bra'),cp,anim,dur)+_bAP(col_(x+'ant'),cp,anim,dur)+_bAP(col_(x+'man'),cpo,anim,dur)
      +'<circle cx="'+H[0].toFixed(1)+'" cy="'+H[1].toFixed(1)+'" r="2.5" fill="'+(x==='n'?'#1f2937':'#111827')+'"/>';
  }

  // ---- sombra + líneas de velocidad ----
  var rw=G.rw, fw=G.fw, bb=G.bb, st=G.st, hb=G.hb, sd=G.sd;
  s+='<ellipse cx="62" cy="'+(rw[1]+G.r+2)+'" rx="46" ry="3.2" fill="rgba(0,0,0,.28)"/>';
  if(cfg.rapido) s+='<g stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"><path d="M2 58 L16 58"/><path d="M6 68 L22 68"/><path d="M0 78 L12 78"/></g>';

  s+=pierna('f')+brazo('f');

  // ---- detrás de las ruedas: parrillas, alforjas del lado lejano ----
  if(tipo==='urbana'){
    var pr=[rw[0]-11,rw[1]-G.r-3.4], pf=[rw[0]+8,rw[1]-G.r-3.4];
    s+='<path d="M'+_bP(pr)+' L'+_bP(pf)+' M'+_bP([rw[0]-6,pr[1]])+' L'+_bP(rw)+' M'+_bP([rw[0]+4,pr[1]])+' L'+_bP(rw)+' M'+_bP(pf)+' L'+_bP([st[0]-1,st[1]+3])+'" fill="none" stroke="#475569" stroke-width="1.3" stroke-linecap="round"/>'
      +'<rect x="'+(pr[0]-1.6).toFixed(1)+'" y="'+(pr[1]-.4).toFixed(1)+'" width="2.6" height="3" rx=".6" fill="#ef4444" stroke="#991b1b" stroke-width=".4"/>';
  }
  if(tipo==='cicloviaje'){
    var rk=rw[1]-G.r-3.6;
    s+='<path d="M'+(rw[0]-12)+' '+rk+' L'+(rw[0]+10)+' '+rk+' M'+(rw[0]-7)+' '+rk+' L'+_bP(rw)+' M'+(rw[0]+5)+' '+rk+' L'+_bP(rw)+' M'+(rw[0]+10)+' '+rk+' L'+_bP([st[0]-1,st[1]+3])+'" fill="none" stroke="#374151" stroke-width="1.4" stroke-linecap="round"/>';
    // alforjas del lado lejano (asoman detrás)
    s+='<rect x="'+(rw[0]-13)+'" y="'+(rk-1)+'" width="16" height="15" rx="3" fill="'+_lpShade('#b45309',-.3)+'"/>';
    s+='<rect x="'+(fw[0]-1)+'" y="'+(fw[1]-12)+'" width="10" height="11" rx="2.4" fill="'+_lpShade('#b45309',-.3)+'"/>';
  }

  // ---- ruedas ----
  s+=_biciRueda(rw,G,tipo,anim,dur*.75,col)+_biciRueda(fw,G,tipo,anim,dur*.75,col);
  if(tipo==='bmx') s+='<path d="'+_bCap([rw[0]-3,rw[1]],[rw[0]+3,rw[1]],1.5,1.5)+'" fill="#cbd5e1" stroke="#64748b" stroke-width=".5"/><path d="'+_bCap([fw[0]-3,fw[1]],[fw[0]+3,fw[1]],1.5,1.5)+'" fill="#cbd5e1" stroke="#64748b" stroke-width=".5"/>';
  if(tipo==='urbana'||tipo==='playera'||tipo==='cicloviaje'){
    var fc=tipo==='playera'?col:'#1f2937', fco=tipo==='playera'?osc:'#0b0f17';
    s+=_bTubo(_bArc(rw,G.r+G.tw/2+1.6,170,320),1.8,fc,fco,tipo==='playera'?cla:'#475569')+_bTubo(_bArc(fw,G.r+G.tw/2+1.6,215,365),1.8,fc,fco,tipo==='playera'?cla:'#475569');
  }

  // ---- transmisión ----
  var conCambio=(tipo==='ruta'||tipo==='mtb'||tipo==='cicloviaje'), plato=(tipo==='bmx'?5:6), pin=(tipo==='bmx'?2.4:3.2);
  s+='<circle cx="'+rw[0]+'" cy="'+rw[1]+'" r="'+pin+'" fill="none" stroke="#9ca3af" stroke-width="1.6"/>';
  var abajo=conCambio?[rw[0]+1.4,rw[1]+7.4]:[rw[0],rw[1]+pin];
  s+='<path d="M'+_bP([bb[0],bb[1]-plato])+' L'+_bP([rw[0],rw[1]-pin])+' M'+_bP([bb[0],bb[1]+plato])+' L'+_bP(abajo)+'" fill="none" stroke="#4b5563" stroke-width="1.15" stroke-dasharray="1.2 .7">'
    +(anim?'<animate attributeName="stroke-dashoffset" values="0;-3.8" dur="'+(dur/2)+'s" repeatCount="indefinite"/>':'')+'</path>';
  if(conCambio) s+='<path d="M'+_bP(rw)+' L'+_bP([rw[0]+2.2,rw[1]+3.4])+' L'+_bP(abajo)+'" fill="none" stroke="#374151" stroke-width="1.4" stroke-linecap="round"/><circle cx="'+(rw[0]+2.2)+'" cy="'+(rw[1]+3.4)+'" r="1.1" fill="#9ca3af"/><circle cx="'+abajo[0]+'" cy="'+abajo[1]+'" r="1.1" fill="#9ca3af"/>';

  // ---- cuadro ----
  var ss=_bL(st,bb,.08), tubos;
  if(tipo==='ruta') tubos=[['M'+_bP(st)+' L'+_bP(ht),2.8],['M'+_bP(hb)+' L'+_bP(bb),3.8],['M'+_bP(bb)+' L'+_bP(st),3],['M'+_bP(bb)+' L'+_bP(rw),2.2],['M'+_bP(ss)+' L'+_bP(rw),1.9]];
  else if(tipo==='mtb') tubos=[['M'+_bP(st)+' L'+_bP(ht),3.4],['M'+_bP(hb)+' L'+_bP(bb),4.6],['M'+_bP(bb)+' L'+_bP(st),3.4],['M'+_bP(bb)+' L'+_bP(rw),2.6],['M'+_bP(ss)+' L'+_bP(rw),2.2]];
  else if(tipo==='cicloviaje') tubos=[['M'+_bP(st)+' L'+_bP(ht),2.7],['M'+_bP(hb)+' L'+_bP(bb),3],['M'+_bP(bb)+' L'+_bP(st),2.7],['M'+_bP(bb)+' L'+_bP(rw),2.2],['M'+_bP(ss)+' L'+_bP(rw),2]];
  else if(tipo==='urbana') tubos=[['M'+_bP(hb)+' Q'+_bP([66,91])+' '+_bP([bb[0]+1.5,bb[1]-1.5]),3.8],['M'+_bP(ht)+' Q'+_bP([64,68])+' '+_bP(_bL(st,bb,.5)),2.6],['M'+_bP(bb)+' L'+_bP(st),3.2],['M'+_bP(bb)+' L'+_bP(rw),2.4],['M'+_bP(ss)+' L'+_bP(rw),2.2]];
  else if(tipo==='bmx') tubos=[['M'+_bP(st)+' L'+_bP(ht),4.2],['M'+_bP(hb)+' L'+_bP(bb),4.6],['M'+_bP(bb)+' L'+_bP(st),3.8],['M'+_bP(bb)+' L'+_bP(rw),3],['M'+_bP(st)+' L'+_bP(rw),2.6]];
  else tubos=[['M'+_bP(ht)+' Q'+_bP([70,60])+' '+_bP([55,70])+' Q'+_bP([51,74])+' '+_bP([bb[0]-1,bb[1]-2]),3.6],['M'+_bP(hb)+' Q'+_bP([72,78])+' '+_bP([bb[0]+1,bb[1]-1]),3.6],['M'+_bP(bb)+' L'+_bP(st),3.4],['M'+_bP(bb)+' L'+_bP(rw),2.6],['M'+_bP(ss)+' L'+_bP(rw),2.6]];
  tubos.forEach(function(t){ s+='<path d="'+t[0]+'" fill="none" stroke="'+osc+'" stroke-width="'+(t[1]+1.5).toFixed(1)+'" stroke-linecap="round" stroke-linejoin="round"/>'; });
  tubos.forEach(function(t){ s+='<path d="'+t[0]+'" fill="none" stroke="'+col+'" stroke-width="'+t[1]+'" stroke-linecap="round" stroke-linejoin="round"/>'; });
  tubos.forEach(function(t){ s+='<path d="'+t[0]+'" fill="none" stroke="'+cla+'" stroke-width="'+(t[1]*.32).toFixed(2)+'" stroke-linecap="round" opacity=".75" transform="translate(-.35 -.55)"/>'; });
  if(tipo==='ruta'||tipo==='mtb'||tipo==='bmx'){ var w0=tubos[1][1];
    s+='<path d="M'+_bP(_bL(hb,bb,.14))+' L'+_bP(_bL(hb,bb,.28))+'" stroke="#f8fafc" stroke-width="'+(w0-1.4).toFixed(1)+'"/>'
      +'<path d="M'+_bP(_bL(hb,bb,.31))+' L'+_bP(_bL(hb,bb,.34))+'" stroke="#f8fafc" stroke-width="'+(w0-1.4).toFixed(1)+'" opacity=".85"/>'; }
  // caramagiolas (cicloviaje lleva dos)
  function botella(t,cTapa){ var bc=_bL(hb,bb,t), ba=_bAng(hb,bb);
    return '<g transform="translate('+_bC(bc)+') rotate('+(ba+180).toFixed(1)+')"><rect x="-4.6" y="-4.6" width="9.2" height="3.4" rx="1.4" fill="#e2e8f0" stroke="#64748b" stroke-width=".5"/><rect x="4.2" y="-4" width="1.6" height="2.2" rx=".4" fill="'+cTapa+'"/><path d="M-1.6 -4.6 L-1.6 -1.2" stroke="#64748b" stroke-width=".6"/></g>'; }
  if(tipo==='ruta'||tipo==='mtb') s+=botella(.54,col);
  if(tipo==='cicloviaje') s+=botella(.4,'#0d9488')+botella(.72,'#0d9488');
  if(tipo==='urbana') s+='<path d="M'+_bP([bb[0]+3,bb[1]-7])+' L'+_bP([rw[0]+4,rw[1]-4.6])+' Q'+_bP([rw[0]+1,rw[1]-4.6])+' '+_bP([rw[0]+2,rw[1]-1])+' L'+_bP([bb[0]+2,bb[1]-1])+' Z" fill="#1f2937" stroke="#0b0f17" stroke-width=".5"/>';
  // tubo de dirección + horquilla
  s+=_bTubo('M'+_bP(ht)+' L'+_bP(hb),3.6,col,osc,cla)+'<path d="M'+_bP([ht[0]-.4,ht[1]-1.4])+' L'+_bP([ht[0]+.2,ht[1]+.6])+'" stroke="#111827" stroke-width="4.4" stroke-linecap="round"/>';
  if(tipo==='mtb'){ var mid=_bL(hb,fw,.45);
    s+='<path d="M'+_bP(hb)+' L'+_bP(_bL(hb,fw,.55))+'" stroke="#e5e7eb" stroke-width="2.6" stroke-linecap="round"/><path d="M'+_bP(mid)+' L'+_bP(fw)+'" stroke="#111827" stroke-width="4.2" stroke-linecap="round"/>'
      +'<path d="'+_bCap([hb[0]-2.4,hb[1]+.4],[hb[0]+2.6,hb[1]+1],1.6,1.6)+'" fill="#111827"/>'; }
  else s+=_bTubo('M'+_bP(hb)+' Q'+_bP([hb[0]+(tipo==='ruta'?5:4),(hb[1]+fw[1])/2+2])+' '+_bP(fw),tipo==='bmx'?3:2.3,tipo==='playera'?col:osc,'#0b0f17',tipo==='playera'?cla:col);

  // ---- cicloviaje: parrilla delantera, alforjas, carpa, banderín, bolso de manubrio ----
  if(tipo==='cicloviaje'){
    var rk2=rw[1]-G.r-3.6, alf='#b45309', alfO='#78350f';
    // carpa enrollada sobre la parrilla, con correas
    s+='<path d="'+_bCap([rw[0]-11,rk2-3.4],[rw[0]+8,rk2-3.4],3.4,3.4)+'" fill="#15803d" stroke="#14532d" stroke-width=".6"/>'
      +'<path d="M'+(rw[0]-5)+' '+(rk2-6.8)+' l0 6.8 M'+(rw[0]+3)+' '+(rk2-6.8)+' l0 6.8" stroke="#111827" stroke-width="1"/>'
      +'<ellipse cx="'+(rw[0]-14.2)+'" cy="'+(rk2-3.4)+'" rx="1.2" ry="3.4" fill="#166534"/>';
    // banderín en mástil flexible, flamea
    var mx=rw[0]-12, my=rk2-1, top=my-30;
    var fl=['M'+mx+' '+top+' Q'+(mx-5)+' '+(top+1)+' '+(mx-10)+' '+(top+3)+' L'+mx+' '+(top+6)+' Z','M'+mx+' '+top+' Q'+(mx-5)+' '+(top+3)+' '+(mx-10)+' '+(top+2)+' L'+mx+' '+(top+6)+' Z','M'+mx+' '+top+' Q'+(mx-5)+' '+(top-1)+' '+(mx-10)+' '+(top+4)+' L'+mx+' '+(top+6)+' Z'];
    s+='<path d="M'+mx+' '+my+' L'+mx+' '+top+'" stroke="#e5e7eb" stroke-width=".8"/>'+_bAP(fl,'#f97316',anim,.8);
    // alforja trasera (lado cercano): bolsillo, cierre enrollable, hebillas, reflectante
    s+='<rect x="'+(rw[0]-14)+'" y="'+rk2+'" width="17" height="16" rx="3.2" fill="'+alf+'" stroke="'+alfO+'" stroke-width=".8"/>'
      +'<path d="M'+(rw[0]-14)+' '+(rk2+4)+' l17 0" stroke="'+alfO+'" stroke-width=".8"/>'
      +'<path d="M'+(rw[0]-10)+' '+(rk2+4)+' l0 5 M'+(rw[0]-1)+' '+(rk2+4)+' l0 5" stroke="#111827" stroke-width="1"/>'
      +'<rect x="'+(rw[0]-12)+'" y="'+(rk2+9)+'" width="13" height="5" rx="1.4" fill="'+_lpShade(alf,-.12)+'" stroke="'+alfO+'" stroke-width=".5"/>'
      +'<rect x="'+(rw[0]-13.4)+'" y="'+(rk2+6.6)+'" width="2.2" height="1.1" fill="#e5e7eb"/>';
    // parrilla delantera baja + alforja chica
    s+='<path d="M'+_bP(_bL(hb,fw,.35))+' L'+(fw[0]+4)+' '+(fw[1]-12)+' L'+_bP(fw)+'" fill="none" stroke="#374151" stroke-width="1.2"/>'
      +'<rect x="'+(fw[0]-4)+'" y="'+(fw[1]-13)+'" width="11" height="12" rx="2.6" fill="'+alf+'" stroke="'+alfO+'" stroke-width=".8"/>'
      +'<path d="M'+(fw[0]-4)+' '+(fw[1]-9.6)+' l11 0" stroke="'+alfO+'" stroke-width=".7"/><path d="M'+(fw[0]+1.5)+' '+(fw[1]-9.6)+' l0 4" stroke="#111827" stroke-width=".9"/>';
  }

  // ---- tija + sillín ----
  var conResorte=(tipo==='playera');
  s+='<path d="M'+_bP(st)+' L'+_bP([sd[0]+.6,sd[1]+(conResorte?3.4:1.4)])+'" stroke="'+(tipo==='mtb'?'#111827':'#9ca3af')+'" stroke-width="2.2" stroke-linecap="round"/>';
  if(tipo==='mtb') s+='<path d="M'+_bP(_bL(st,sd,.5))+' L'+_bP(_bL(st,sd,.62))+'" stroke="#cbd5e1" stroke-width="2.4"/>';
  if(conResorte) s+='<path d="M'+_bP([sd[0]-3,sd[1]+1.6])+' l0 2.4 M'+_bP([sd[0]+3.6,sd[1]+1.6])+' l0 2.4" stroke="#9ca3af" stroke-width="1.4" stroke-dasharray=".6 .5"/>';
  if(tipo==='ruta'||tipo==='mtb') s+='<path d="M'+_bP([sd[0]-6,sd[1]-.2])+' Q'+_bP([sd[0]-6.4,sd[1]-2.6])+' '+_bP([sd[0]-2,sd[1]-2.4])+' L'+_bP([sd[0]+7,sd[1]-1.2])+' Q'+_bP([sd[0]+8.2,sd[1]-.2])+' '+_bP([sd[0]+6.4,sd[1]+.6])+' Z" fill="#111827" stroke="#334155" stroke-width=".4"/>';
  else s+='<path d="M'+_bP([sd[0]-5.6,sd[1]+1.6])+' Q'+_bP([sd[0]-6.6,sd[1]-2.8])+' '+_bP([sd[0]-1,sd[1]-2.6])+' L'+_bP([sd[0]+5.4,sd[1]-1.6])+' Q'+_bP([sd[0]+6.6,sd[1]+.4])+' '+_bP([sd[0]+4,sd[1]+1.6])+' Z" fill="'+(tipo==='playera'?'#7c5a2e':(tipo==='cicloviaje'?'#78350f':'#1f2937'))+'" stroke="#0b0f17" stroke-width=".5"/>';

  // ---- manubrio ----
  s+='<path d="M'+_bP(ht)+' L'+_bP(S)+'" stroke="#374151" stroke-width="2.4" stroke-linecap="round"/>';
  s+='<path d="'+bar+'" fill="none" stroke="'+(tipo==='bmx'?'#cbd5e1':'#1f2937')+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'+barExtra;
  if(tipo==='cicloviaje') s+='<rect x="'+(S[0]+1)+'" y="'+(S[1]+.8)+'" width="9" height="7" rx="1.8" fill="#0f766e" stroke="#134e4a" stroke-width=".7"/><rect x="'+(S[0]+2.2)+'" y="'+(S[1]+1.6)+'" width="6.6" height="2.6" rx=".6" fill="rgba(226,232,240,.7)"/>';
  if(tipo==='urbana'){ var bx=ht[0]+2.4, by=ht[1]-7.6;
    s+='<path d="M'+bx+' '+by+' l12 0 l-1.6 9.4 l-8.8 0 Z" fill="#c08a4d" stroke="#7c5a2e" stroke-width=".8" stroke-linejoin="round"/>'
      +'<path d="M'+(bx+.6)+' '+(by+3)+' l10.8 0 M'+(bx+1.1)+' '+(by+6)+' l9.8 0 M'+(bx+4)+' '+by+' l.2 9.4 M'+(bx+8)+' '+by+' l-.3 9.4" stroke="#7c5a2e" stroke-width=".55"/>'
      +'<path d="M'+(bx-.8)+' '+(by+.2)+' l13.6 0" stroke="#7c5a2e" stroke-width="1.3" stroke-linecap="round"/>'
      +'<path d="M'+(bx+3)+' '+(by+10.6)+' l4.4 0 l1 2.4 l-6.4 0 Z" fill="#fde68a" stroke="#a16207" stroke-width=".5"/>'; }

  // ---- bielas + plato ----
  s+='<g><circle cx="'+bb[0]+'" cy="'+bb[1]+'" r="'+plato+'" fill="none" stroke="#6b7280" stroke-width="1.7" stroke-dasharray=".9 .7"/><circle cx="'+bb[0]+'" cy="'+bb[1]+'" r="'+(plato-1.6)+'" fill="none" stroke="#9ca3af" stroke-width="1.1"/>'
    +'<path d="M'+_bP(bb)+' l'+rc+' 0 M'+_bP(bb)+' l-'+rc+' 0" stroke="#374151" stroke-width="2" stroke-linecap="round"/>'+_bGira(bb,anim,dur)+'</g><circle cx="'+bb[0]+'" cy="'+bb[1]+'" r="1.4" fill="#111827"/>';

  // ---- torso + accesorio de espalda (se mecen con el cuerpo) ----
  var hip=HIP, shp=SH, ta=_bAng(hip,shp), td=Math.hypot(shp[0]-hip[0],shp[1]-hip[1]), bn=[(shp[1]-hip[1])/td,-(shp[0]-hip[0])/td];
  var esp='';
  if(R.extra==='mochila'||R.extra==='hidra'){ var m=_bL(hip,shp,R.extra==='hidra'?.6:.55), mo=R.extra==='hidra'?4.6:5.6, mc=[m[0]+bn[0]*mo,m[1]+bn[1]*mo];
    esp+='<g transform="translate('+_bC(mc)+') rotate('+ta.toFixed(1)+')">'+(R.extra==='hidra'
      ?'<rect x="-5.4" y="-3" width="10.8" height="6" rx="2.6" fill="#334155" stroke="#0f172a" stroke-width=".6"/><path d="M-3 0 L3 0" stroke="#f97316" stroke-width="1"/>'
      :'<rect x="-6.8" y="-4" width="13.6" height="8" rx="2.6" fill="'+osc+'" stroke="#0b0f17" stroke-width=".6"/><rect x="-4" y="-5.2" width="6" height="2.6" rx="1" fill="'+col+'" stroke="#0b0f17" stroke-width=".5"/>')+'</g>'; }
  s+='<g transform="translate('+F[0].esp+')">'+_bAT('translate',col_('esp'),anim,dur)+esp+'</g>';
  // glúteo (con el color del short/pantalón) y encima el torso: la polera cae sobre la pretina
  s+='<g transform="translate('+F[0].gl+')">'+_bAT('translate',col_('gl'),anim,dur)+'<ellipse cx="'+GL[0].toFixed(1)+'" cy="'+GL[1].toFixed(1)+'" rx="5.6" ry="4.3" fill="'+R.pierna+'" transform="rotate(12 '+_bP(GL)+')"/>'
    +'<path d="'+_bArc(GL,3.4,195,265)+'" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1.2" stroke-linecap="round"/></g>';
  s+=_bAP(col_('torso'),Y.polera,anim,dur);
  var det='';
  det+='<path d="M'+_bP([hip[0]+bn[0]*4.4,hip[1]+bn[1]*4.4])+' L'+_bP([shp[0]+bn[0]*3.8,shp[1]+bn[1]*3.8])+'" stroke="rgba(255,255,255,.22)" stroke-width="2.2" stroke-linecap="round"/>';
  if(R.extra==='franja') det+='<path d="M'+_bP(_bL(hip,shp,.12))+' L'+_bP(_bL(shp,hip,.1))+'" stroke="#f8fafc" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>'
    +'<path d="'+_bCap([hip[0]+bn[0]*3+(shp[0]-hip[0])*.1,hip[1]+bn[1]*3+(shp[1]-hip[1])*.1],[hip[0]+bn[0]*3.4+(shp[0]-hip[0])*.32,hip[1]+bn[1]*3.4+(shp[1]-hip[1])*.32],1.3,1.2)+'" fill="'+Y.poleraS+'" opacity=".8"/>';
  if(R.extra==='mochila'||R.extra==='hidra') det+='<path d="M'+_bP([shp[0]+bn[0]*2,shp[1]+bn[1]*2-1])+' Q'+_bP(_bL(hip,shp,.6))+' '+_bP([hip[0]+(shp[0]-hip[0])*.25,hip[1]+(shp[1]-hip[1])*.25+1.6])+'" fill="none" stroke="'+(R.extra==='hidra'?'#0f172a':osc)+'" stroke-width="1.3" stroke-linecap="round"/>';
  if(R.extra==='capucha') det+='<path d="'+_bCap([shp[0]+bn[0]*3.6,shp[1]+bn[1]*3.6],[shp[0]+bn[0]*4.4-(shp[0]-hip[0])*.28,shp[1]+bn[1]*4.4-(shp[1]-hip[1])*.28],3.2,2.6)+'" fill="'+Y.poleraS+'"/>'
    +'<path d="M'+_bP(_bL(hip,shp,.82))+' l1.2 4" stroke="#f8fafc" stroke-width=".7" stroke-linecap="round"/>';
  if(R.extra==='flores') [[.3,-2],[.55,1.8],[.78,-1.2],[.45,-3.6]].forEach(function(q){ var p=_bL(hip,shp,q[0]); p=[p[0]+bn[0]*q[1],p[1]+bn[1]*q[1]];
    det+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="1.3" fill="#fef3c7" opacity=".9"/><circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r=".5" fill="#f59e0b"/>'; });
  if(R.extra==='buff') det+='<path d="'+_bCap(_bL(hip,shp,.9),[shp[0]+(shp[0]-hip[0])*.05,shp[1]+(shp[1]-hip[1])*.05],3.4,3.2)+'" fill="#0d9488"/><path d="M'+_bP(_bL(hip,shp,.9))+' l1.6 1.4" stroke="#f2b705" stroke-width=".8"/>'
    +'<path d="M'+_bP(_bL(hip,shp,.3))+' l3 -1.4" stroke="'+Y.poleraS+'" stroke-width="1.4" stroke-linecap="round"/>';
  s+='<g transform="translate('+F[0].esp+')">'+_bAT('translate',col_('esp'),anim,dur)+det+'</g>';
  s+=_bAP(col_('cuello'),Y.pielS,anim,dur);

  s+=pierna('n')+brazo('n');

  // ---- cabeza: el Pistero del usuario (se mece con el cuerpo; inclinada según la postura) ----
  var inc=G.inc+aero*8, cab=_bCabeza(o,cfg.expr,HEAD,52);
  var hv=F.map(function(f){ return _bC(f.head); });
  s+='<g transform="translate('+hv[0]+')">'+_bAT('translate',hv,anim,dur)+(inc?'<g transform="rotate('+inc+' '+_bP(HEAD)+')">'+cab+'</g>':cab)+'</g>';
  return '<svg viewBox="-4 -14 132 124" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}

/* ===== MOTO: aventurera, piloto con chaqueta, botas y rodillas apretando el estanque ===== */
function _pistMotoSVG(o,cfg){
  var anim=cfg.pedal!==false, Y=_bPersona(o), col=o.biciCol||_lpColCasco(o.casco), osc=_lpShade(col,-.45), cla=_lpShade(col,.5), s='', v='';
  var rw=[28,89], fw=[99,89], r=16, N=8, dur=.8, rv=cfg.rapido?.3:.42;
  var hip=[48,52], sh=[59,34], hand=[80,43], head=[63,20], knee=[67,59], peg=[59,77];
  s+='<ellipse cx="63" cy="'+(rw[1]+r+2)+'" rx="50" ry="3.4" fill="rgba(0,0,0,.3)"/>';
  if(cfg.rapido) s+='<g stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"><path d="M0 50 L14 50"/><path d="M4 62 L20 62"/><path d="M-2 74 L10 74"/></g>';
  function rueda(c){
    var t='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="none" stroke="#151a23" stroke-width="5.4"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r+2.4)+'" fill="none" stroke="#151a23" stroke-width="1.6" stroke-dasharray="1.6 1.2"/>'
      +'<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r-3.4)+'" fill="none" stroke="#9ca3af" stroke-width="1.6"/>', sp='';
    for(var i=0;i<18;i++){ var a=i*Math.PI/9; sp+='M'+_bP([c[0]+Math.cos(a+.3)*2.6,c[1]+Math.sin(a+.3)*2.6])+' L'+_bP([c[0]+Math.cos(a)*(r-4),c[1]+Math.sin(a)*(r-4)])+' '; }
    t+='<g><path d="'+sp+'" stroke="#cbd5e1" stroke-width=".5"/>'+_bGira(c,anim,rv)+'</g>';
    t+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="6.2" fill="none" stroke="#b6bcc6" stroke-width="1.8"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="6.2" fill="none" stroke="#6b7280" stroke-width=".7" stroke-dasharray="1 1.6"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="2.6" fill="#4b5563" stroke="#1f2937" stroke-width=".6"/>';
    return t;
  }
  // todo lo que va sobre la suspensión rebota junto (v); las ruedas no
  // brazo y pierna lejanos
  var Ef=_bCodo([sh[0]-1.6,sh[1]+.6],[hand[0]-1.6,hand[1]-.6],13.5);
  v+='<path d="'+_bLimb([sh[0]-1.6,sh[1]+.6],Ef,3.6,3.5,3,1,.4)+'" fill="'+_lpShade(Y.polera,-.38)+'"/><path d="'+_bLimb(Ef,[hand[0]-1.6,hand[1]-.6],3,3,2.6,1,.35)+'" fill="'+_lpShade(Y.polera,-.38)+'"/>';
  v+='<path d="'+_bLimb(hip,[knee[0]-2,knee[1]+.6],5.6,5.4,4.2,-1,.45)+'" fill="#0b0f17"/><path d="'+_bLimb([knee[0]-2,knee[1]+.6],[peg[0]-2,peg[1]],4,3.8,3,1,.35)+'" fill="#0b0f17"/>';
  // basculante + amortiguador + escape
  v+=_bTubo('M54 80 L'+_bP(rw),3,'#374151','#111827','#6b7280')+'<path d="M53 70 L41 82" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/><path d="M53 70 L45 78" stroke="#111827" stroke-width="3.4" stroke-linecap="round"/>';
  v+='<path d="M73 80 Q62 92 47 80 L33 73" fill="none" stroke="#9ca3af" stroke-width="2.6" stroke-linecap="round"/><path d="'+_bCap([46,78],[27,70],3.2,3.4)+'" fill="#cbd5e1" stroke="#64748b" stroke-width=".7"/><circle cx="25.6" cy="69.4" r="1.6" fill="#1f2937"/>';
  // maleta lateral y top case (aluminio)
  v+='<rect x="15" y="58" width="24" height="19" rx="2.4" fill="#c7ccd4" stroke="#64748b" stroke-width=".9"/><path d="M15 63 L39 63" stroke="#64748b" stroke-width=".8"/><rect x="24" y="60" width="6" height="1.6" rx=".6" fill="#374151"/><path d="M17 72 L37 72" stroke="'+col+'" stroke-width="1.6"/>';
  v+='<rect x="12" y="41" width="17" height="12" rx="2.6" fill="#c7ccd4" stroke="#64748b" stroke-width=".9"/><path d="M12 45 L29 45" stroke="#64748b" stroke-width=".7"/><rect x="13.4" y="47.6" width="3" height="1.6" fill="#ef4444"/>';
  // motor
  v+='<path d="M50 69 L72 66 Q77 72 76 81 L58 88 Q50 86 48 80 Z" fill="#374151" stroke="#111827" stroke-width=".8"/>'
    +'<path d="M66 64 L76 62 L78 72 L68 74 Z" fill="#4b5563" stroke="#111827" stroke-width=".7"/><path d="M67 66.5 L77 64.5 M67.6 69 L77.6 67 M68.2 71.5 L78 69.6" stroke="#9ca3af" stroke-width=".7"/>'
    +'<circle cx="58" cy="79" r="4" fill="#6b7280" stroke="#111827" stroke-width=".7"/><circle cx="58" cy="79" r="1.6" fill="#9ca3af"/>';
  // chasis
  v+='<path d="M85 46 L60 64 L54 80" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  // cola + asiento
  v+='<path d="M40 56 L18 51 Q16 54 18 57 L40 64 Z" fill="'+col+'" stroke="'+osc+'" stroke-width=".8"/><path d="M19 52.4 L16.4 52.4 L16.6 56" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>';
  v+='<path d="M36 56.5 Q47 53 62 56.5 L62 61 L38 61 Z" fill="#1f2937" stroke="#0b0f17" stroke-width=".7"/>';
  // horquilla (barras doradas) + guardabarros + estanque
  v+='<path d="M86 44 L92.5 70" stroke="#facc15" stroke-width="3" stroke-linecap="round"/><path d="M91.5 66 L'+_bP(fw)+'" stroke="#111827" stroke-width="4.4" stroke-linecap="round"/>';
  v+=_bTubo(_bArc(fw,r+4,212,322),2.2,col,osc,cla);
  v+='<path d="M58 57 Q62 47 75 47.5 L85 51 Q86 61 77 66 L60 66 Z" fill="'+col+'" stroke="'+osc+'" stroke-width="1"/>'
    +'<path d="M63 52 Q68 49.4 76 50" fill="none" stroke="'+cla+'" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>'
    +'<path d="M62 61 L80 57" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round"/><path d="M63 63.6 L79 60" stroke="'+osc+'" stroke-width="1" stroke-linecap="round"/>';
  // glúteo apoyado en el asiento (la chaqueta termina en la cintura, así asoma)
  v+='<ellipse cx="45.4" cy="52.6" rx="6.6" ry="4.5" fill="#1f2937" transform="rotate(8 45.4 52.6)"/><path d="'+_bArc([45.4,52.6],3.6,195,265)+'" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1.2" stroke-linecap="round"/>';
  // pierna cercana: rodilla contra el estanque, bota en el pedalín
  v+='<path d="'+_bLimb(hip,knee,5.4,4.9,4.2,-1,.42)+'" fill="#1f2937"/><path d="'+_bLimb(knee,[peg[0]+.4,peg[1]-2],4.4,4.2,3.2,1,.35)+'" fill="#1f2937"/>'
    +'<path d="M62 64 l3.6 1.6" stroke="#64748b" stroke-width="1" stroke-linecap="round"/>'
    +'<g transform="translate('+_bC(peg)+') rotate(-6)">'+_bZapato({bota:'#111827'},function(x){return x;},Y.piel)+'</g><path d="M56 78.6 L64 78.6" stroke="#9ca3af" stroke-width="1.6" stroke-linecap="round"/>';
  // parabrisas + foco + manubrio + espejo
  v+='<path d="M86 45 L83 29 Q86 27.6 89 29 L92.6 45 Z" fill="rgba(186,230,253,.5)" stroke="#94a3b8" stroke-width=".8"/>'
    +'<path d="M84 44 Q91 40 95 47 Q95 55 88 55 Z" fill="'+col+'" stroke="'+osc+'" stroke-width=".8"/><circle cx="92" cy="49.6" r="2.8" fill="#fde68a" stroke="#a16207" stroke-width=".6"/>'
    +'<path d="M85 45 L80 42" stroke="#1f2937" stroke-width="2.4" stroke-linecap="round"/><path d="M82 43 L79 33" stroke="#4b5563" stroke-width=".8"/><ellipse cx="78.6" cy="32" rx="2.4" ry="1.6" fill="#1f2937"/>';
  // torso con chaqueta: hombreras, franja reflectante, cuello alto
  var bn=[(sh[1]-hip[1]),-(sh[0]-hip[0])], bl=Math.hypot(bn[0],bn[1]); bn=[bn[0]/bl,bn[1]/bl];
  v+='<path d="'+_bLimb([49.4,47.4],sh,6.4,6.8,6.2,-1,.55)+'" fill="'+Y.polera+'"/>'
    +'<path d="'+_bCap(_bL(hip,sh,.78),sh,5.4,5.6)+'" fill="'+Y.poleraS+'"/>'
    +'<path d="M'+_bP(_bL(hip,sh,.38))+' L'+_bP([_bL(hip,sh,.38)[0]+5,_bL(hip,sh,.38)[1]+1.6])+'" stroke="#e5e7eb" stroke-width="1.6" stroke-linecap="round"/>'
    +'<path d="M'+_bP([hip[0]+bn[0]*5,hip[1]+bn[1]*5])+' L'+_bP([sh[0]+bn[0]*4.6,sh[1]+bn[1]*4.6])+'" stroke="rgba(255,255,255,.2)" stroke-width="2.4" stroke-linecap="round"/>'
    +'<path d="'+_bCap(sh,_bL(sh,head,.32),3.4,3.2)+'" fill="#1f2937"/>';
  // brazo cercano con guante de moto
  var E=_bCodo(sh,hand,13.5);
  v+='<path d="'+_bLimb(sh,E,4,3.9,3.4,1,.4)+'" fill="'+Y.polera+'"/><path d="'+_bLimb(E,hand,3.4,3.3,3,1,.35)+'" fill="'+Y.polera+'"/>'
    +'<path d="'+_bCap(_bL(E,hand,.7),hand,3.4,3.2)+'" fill="#111827"/><path d="'+_bCap([hand[0]-.4,hand[1]-1],[hand[0]+2.6,hand[1]+.4],1.6,1.4)+'" fill="#111827"/>';
  // cabeza
  var cab=_bCabeza(o,cfg.expr,head,52);
  v+='<g transform="rotate(4 '+_bP(head)+')">'+cab+'</g>';
  // rebote de suspensión: el conjunto sube y baja; la cabeza un poco más
  var bv=[]; for(var k=0;k<N;k++){ bv.push('0,'+(Math.sin(k*2*Math.PI/N)*.55+Math.sin(k*4*Math.PI/N)*.25).toFixed(2)); }
  s+=rueda(rw)+rueda(fw);
  s+='<g>'+_bAT('translate',bv,anim,dur)+v+'</g>';
  s+=_bHumo([24,69],anim);
  return '<svg viewBox="-4 -14 132 124" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}

/* ===== AUTO: chico y redondo, Pistero al volante, SU bici en el portabicis del techo ===== */
function _pistAutoSVG(o,cfg){
  var anim=cfg.pedal!==false, Y=_bPersona(o), col=o.biciCol||_lpColCasco(o.casco), osc=_lpShade(col,-.45), cla=_lpShade(col,.5), s='', v='';
  var rw=[30,92], fw=[96,92], r=12, uid='pa'+(++_biciUid);
  s+='<ellipse cx="63" cy="'+(rw[1]+r+1.6)+'" rx="54" ry="3.4" fill="rgba(0,0,0,.3)"/>';
  if(cfg.rapido) s+='<g stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"><path d="M-4 52 L6 52"/><path d="M-2 66 L4 66"/></g>';
  var cuerpo='M8 89 L8 73 Q8 64 16 62.4 L28 60.6 L36 30 Q38 24 46 24 L74 24 Q80 24 84 30 L96 57.6 L111 63 Q118 65.4 118 73 L118 89 Q118 94 114 94 L110 94 A14 14 0 0 0 82 94 L44 94 A14 14 0 0 0 16 94 L12 94 Q8 94 8 89 Z';
  var vDel='M58 28.6 L74 28.6 Q78.6 28.6 80.4 32.6 L91 57 L58 57 Z', vTra='M40.4 32 Q41.6 28.6 45.6 28.6 L54 28.6 L54 57 L32.6 57 Z';
  // portabicis + SU bici en el techo (silueta del tipo elegido en ciclismo: siempre de ruta acá)
  var bc=Y.polera, bo=_lpShade(bc,-.4);
  v+='<path d="M40 24 L40 19.6 M80 24 L80 19.6 M36 19.6 L84 19.6" stroke="#374151" stroke-width="1.6" stroke-linecap="round"/>';
  v+='<circle cx="48" cy="12" r="6.6" fill="none" stroke="#151a23" stroke-width="1.6"/><circle cx="72" cy="12" r="6.6" fill="none" stroke="#151a23" stroke-width="1.6"/>'
    +'<path d="M48 12 L56 12.6 L62 5.6 L54.6 5.6 Z M62 5.6 L72 12 M56 12.6 L54 4 M52.4 4 L56 4 M62 5.6 L61.4 2.6 L64 2.4" fill="none" stroke="'+bo+'" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>'
    +'<path d="M48 12 L56 12.6 L62 5.6 L54.6 5.6 Z M62 5.6 L72 12 M56 12.6 L54 4 M52.4 4 L56 4 M62 5.6 L61.4 2.6 L64 2.4" fill="none" stroke="'+bc+'" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>'
    +'<path d="M48 19.6 L48 18.4 M72 19.6 L72 18.4" stroke="#374151" stroke-width="1.6"/>';
  // carrocería
  v+='<path d="'+cuerpo+'" fill="'+col+'" stroke="'+osc+'" stroke-width="1.2" stroke-linejoin="round"/>';
  v+='<path d="M14 66 Q60 60 112 66" fill="none" stroke="'+cla+'" stroke-width="1.6" opacity=".6"/>';
  // interior: Pistero al volante (recortado a la ventana)
  v+='<clipPath id="'+uid+'"><path d="'+vDel+'"/></clipPath>';
  v+='<path d="'+vDel+'" fill="#1e293b"/><path d="'+vTra+'" fill="#1e293b"/><path d="M42 40 Q44 36 50 37 L50 57 L40 57 Z" fill="#334155"/>';
  var head=[64.6,46.6], cab=_bCabeza(o,cfg.expr,head,32), hv=[];
  for(var k=0;k<8;k++) hv.push('0,'+(Math.sin(k*Math.PI/4)*.5+Math.sin(k*Math.PI/2)*.2).toFixed(2));
  v+='<g clip-path="url(#'+uid+')"><path d="'+_bLimb([63,70],[64,54],6.4,6.6,5.8,-1,.5)+'" fill="'+Y.polera+'"/>'
    +'<path d="M84 46 L80 58" stroke="#111827" stroke-width="1.6"/><ellipse cx="84.6" cy="50" rx="1.8" ry="5.8" fill="none" stroke="#111827" stroke-width="2" transform="rotate(-20 84.6 50)"/>'
    +'<path d="'+_bLimb([67,55],[75.4,57],2.8,2.8,2.4,1,.4)+'" fill="'+Y.polera+'"/><path d="'+_bLimb([75.4,57],[83.4,47.4],2.4,2.4,2,1,.4)+'" fill="'+Y.piel+'"/><circle cx="83.4" cy="47.4" r="2.1" fill="'+Y.pielS+'"/>'
    +'<g>'+_bAT('translate',hv,anim,.9)+cab+'</g></g>';
  // vidrios: reflejo
  v+='<path d="'+vDel+'" fill="rgba(186,230,253,.12)" stroke="#0f172a" stroke-width="1"/><path d="'+vTra+'" fill="rgba(186,230,253,.18)" stroke="#0f172a" stroke-width="1"/>'
    +'<path d="M77 31 L86 52" stroke="rgba(255,255,255,.35)" stroke-width="1.6" stroke-linecap="round"/><path d="M45 31 L38 50" stroke="rgba(255,255,255,.3)" stroke-width="1.4" stroke-linecap="round"/>';
  // puertas, manilla, espejo, focos, parachoques
  v+='<path d="M56 30 L56 92 M86 60 L84 92" stroke="'+osc+'" stroke-width=".9" fill="none"/><rect x="60" y="62.6" width="5.6" height="1.6" rx=".8" fill="'+osc+'"/><rect x="38" y="62.6" width="5" height="1.6" rx=".8" fill="'+osc+'"/>'
    +'<path d="M88 55 L94 53.6 L95 57.6 L89 58.6 Z" fill="'+col+'" stroke="'+osc+'" stroke-width=".8"/>'
    +'<path d="M111 66 Q116.6 67 116.8 72 L110 71 Z" fill="#fde68a" stroke="#a16207" stroke-width=".6"/><path d="M8.6 68 L12.6 67.4 L12.6 74 L8.4 74 Z" fill="#ef4444" stroke="#991b1b" stroke-width=".6"/>'
    +'<path d="M8 84 L18 84 M108 84 L118 84" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/><path d="M44 89 L82 89" stroke="'+osc+'" stroke-width="1.6"/>';
  function rueda(c){
    var t='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="#151a23"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="7.4" fill="#cbd5e1" stroke="#6b7280" stroke-width=".8"/>', g='';
    for(var i=0;i<5;i++){ var a=i*2*Math.PI/5; g+='<circle cx="'+(c[0]+Math.cos(a)*4.4).toFixed(1)+'" cy="'+(c[1]+Math.sin(a)*4.4).toFixed(1)+'" r="1.5" fill="#6b7280"/>'; }
    return t+'<g>'+g+_bGira(c,anim,.4)+'</g><circle cx="'+c[0]+'" cy="'+c[1]+'" r="1.8" fill="#374151"/>';
  }
  var bv=[]; for(k=0;k<8;k++) bv.push('0,'+(Math.sin(k*Math.PI/4)*.6).toFixed(2));
  s+=rueda(rw)+rueda(fw)+'<g>'+_bAT('translate',bv,anim,.7)+v+'</g>'+_bHumo([6,90],anim);
  return '<svg viewBox="-4 -14 132 124" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}
