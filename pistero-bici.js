/* ===== EL VEHÍCULO DE PISTERO v2 (2026-10-04, Inty: "la bici está genérica"; "hay que diferenciar
   el tipo de ciclista: montaña, ruta, cicloviajeros, motos y autos; preocúpate harto de la estética
   del movimiento y de las extremidades, de los accesorios y de las bicicletas") =====
   Misma firma de siempre _pistBiciSVG(opts,cfg) y mismo viewBox. cfg: expr, pedal (false = quieto),
   rapido, cadencia, pose ('pie'|'sinmanos'|'caballito') y vehiculo (lo elige _pistVehiculo según el modo).
   Tipos (o.biciTipo):
     ruta       aro perfil alto, manubrio de ruta con manetas, caramagiola, ciclocomputador; postura aero (más aún con cfg.rapido)
     mtb        tacos, horquilla con suspensión, frenos de disco, tija telescópica, mochila de hidratación, short holgado
     cicloviaje alforjas delanteras y traseras, carpa enrollada en la parrilla, bolso de manubrio, banderín que flamea, dos caramagiolas
     urbana     cuadro abierto, canasto, parrilla con reflectante, guardabarros, cubrecadena, luz, jeans y mochila
     bmx        rayos gruesos de color, manubrio alto con protector, pegs, polerón
     playera    cruiser de doble tubo, neumáticos balón con banda blanca, timbre, asiento con resortes
     gravel     ruta con tacos chicos y costado café de fábrica
     triciclo   triciclo adaptado (inclusión, gratis): dos ruedas atrás, cuadro bajo, canasto trasero grande
     handbike   handbike (inclusión, gratis): se pedalea con los brazos, piernas estiradas en el apoyapiés
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
  playera:   {r:15.5,tw:5.4,rw:[30,88],fw:[95,88],bb:[58,90],st:[48,62],ht:[86,58],hb:[88,68],sd:[46,55.5],hip:[46,51],sh:[53,33],head:[57,19],inc:-3},
  gravel:    {r:15.5,tw:3.6,rw:[30,88],fw:[95,88],bb:[60,90],st:[52,62],ht:[85,58],hb:[88,69],sd:[49,55.5],hip:[50,52],sh:[68,39],head:[73,25],inc:7},
  // triciclo adaptado: dos ruedas atrás (la lejana asoma), cuadro muy bajo para subirse fácil
  triciclo:  {r:14,  tw:3.4,rw:[30,89],fw:[96,89],bb:[60,90],st:[48,64],ht:[86,58],hb:[88,70],sd:[45,57.5],hip:[46,54],sh:[54,35],head:[58,21],inc:0}
};
// ropa por tipo: hasta = cuánto del muslo cubre (0..1; 2 = pierna completa); ap = holgura; calzado
var _BICI_ROPA={
  ruta:      {pierna:'#111827',hasta:.72,ap:0,  calcetin:'#f8fafc',zap:'#f8fafc',suela:'#111827',extra:'franja'},
  mtb:       {pierna:'#3f4a3a',hasta:.94,ap:.7,calcetin:'#1f2937',zap:'#374151',suela:'#111827',extra:'hidra'},
  cicloviaje:{pierna:'#8a7556',hasta:.86,ap:.5, calcetin:'',       zap:'',       suela:'#3f3a33',extra:'buff',sandalia:1},
  urbana:    {pierna:'#2f5592',hasta:2,  ap:.4, calcetin:'',       zap:'#f8fafc',suela:'#94a3b8',extra:'mochila'},
  bmx:       {pierna:'#1f2937',hasta:2,  ap:.6, calcetin:'',       zap:'#dc2626',suela:'#f8fafc',extra:'capucha'},
  playera:   {pierna:'#0ea5e9',hasta:.62,ap:.7,calcetin:'',       zap:'',       suela:'#7c5a2e',extra:'flores',sandalia:1},
  gravel:    {pierna:'#1f2937',hasta:.78,ap:.2, calcetin:'#f59e0b',zap:'#4b5563',suela:'#111827',extra:''},
  triciclo:  {pierna:'#64748b',hasta:2,  ap:.5, calcetin:'',       zap:'#f8fafc',suela:'#94a3b8',extra:''}
};
// catálogos del Taller (PIST_BICI_SKIN, PIST_NEUM, PIST_TRAJE, …) en pistero-armario.js; precios en PIST_TIER (pistero-tienda.js)
// trajes: polera (null = la del Pistero), short, manga, patrón
var _BICI_TRAJE={
  equipo: {pol:null,     sh:'#111827',pat:'equipo'},
  retro:  {pol:null,     sh:'#1f2937',pat:'retro'},
  enduro: {pol:null,     sh:'#374151',pat:'enduro',holgado:1},
  chile:  {pol:'#d52b1e',sh:'#0039a6',pat:'chile'},
  montana:{pol:'#f8fafc',sh:'#111827',pat:'lunares'},
  lider:  {pol:'#facc15',sh:'#111827',pat:'lider'},
  campeon:{pol:'#f8fafc',sh:'#111827',pat:'arcoiris'},
  huaso:  {pol:'#7f1d1d',sh:'#1f2937',pat:'huaso'},
  pascuero:{pol:'#dc2626',sh:'#dc2626',pat:'pascuero'},
  heroe:  {pol:'#1d4ed8',sh:'#1d4ed8',pat:'heroe',capa:'#dc2626'},
  dino:   {pol:'#16a34a',sh:'#16a34a',pat:'dino',puas:'#15803d'}
};
// Solo valores del catálogo: estos campos vienen de Firestore (los escribe el cliente de
// otro usuario) y se insertan tal cual en el SVG — misma barrera que _pistNormal.
function _biciOpts(o,tipo){
  var C={biciSkin:PIST_BICI_SKIN,biciAcab:PIST_BICI_ACAB,biciNeum:PIST_NEUM,biciAros:PIST_AROS,biciCarga:PIST_CARGA,biciExtra:PIST_EXTRA,traje:PIST_TRAJE,mascota:PIST_MASCOTA,estela:PIST_ESTELA,bandera:PIST_BANDERA}, b={};
  for(var k in C){ var v=o&&o[k]; b[k]=C[k].some(function(it){return it.id===v;})?v:''; }
  // segundo color (bicolor): solo '#rrggbb'
  b.biciCol2=(o&&typeof o.biciCol2==='string'&&/^#[0-9a-fA-F]{6}$/.test(o.biciCol2))?o.biciCol2:'';
  if(b.biciCarga==='') b.biciCarga={cicloviaje:'alforjas',urbana:'canasto',triciclo:'nada'}[tipo]||'nada';
  if(b.biciExtra==='') b.biciExtra={cicloviaje:'banderin',urbana:'luces'}[tipo]||'nada';
  return b;
}
var _biciUid=0;
// Vehículos que sabe dibujar _pistBiciSVG (cfg.vehiculo solo acepta estos)
var _BICI_VEH=['ruta','mtb','cicloviaje','gravel','urbana','bmx','playera','triciclo','handbike','moto','auto'];
// Qué vehículo lleva Pistero según el MODO del viaje (pistero-tipo-actividad.js):
//   Motorizado → su auto o su moto (motorTipo) · MTB → montaña · Cicloviaje → cicloviaje
//   Ruta y Trekking → la bici que eligió. La handbike y el triciclo adaptado (inclusión)
//   se respetan SIEMPRE en los modos en bici: nadie pierde su vehículo por cambiar de modo.
function _pistVehiculo(o,modo){
  o=o||{}; var b=o.biciTipo||'ruta';
  if(modo==='moto') return (o.motorTipo==='moto')?'moto':'auto';
  if(b==='handbike'||b==='triciclo') return b;
  if(modo==='mtb') return 'mtb';
  if(modo==='cicloviaje') return (b==='gravel')?'gravel':'cicloviaje';
  return b;
}
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
var _NEUM_COL={'':'#151a23',cafe:'#151a23',blanca:'#151a23',rojo:'#b91c1c',neon:'#a3e635'};
function _biciRueda(c,G,tipo,anim,dur,col,B){
  B=B||{}; var r=G.r, tw=G.tw, rr=r-tw/2, s='', sp='', i, a, nc=_NEUM_COL[B.biciNeum||'']||'#151a23';
  // aro: de fábrica plata (ruta: perfil alto negro; BMX: color del cuadro)
  var aro={negro:'#111827',dorado:'#d4a017',cuadro:col}[B.biciAros]||(tipo==='bmx'?col:(tipo==='ruta'?'#1f2937':'#cbd5e1'));
  // sombra de contacto con el piso
  s+='<ellipse cx="'+c[0]+'" cy="'+(c[1]+r+.6).toFixed(1)+'" rx="'+(r*.55).toFixed(1)+'" ry="1.5" fill="rgba(0,0,0,.4)"/>';
  s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="none" stroke="'+nc+'" stroke-width="'+tw+'"/>';
  // volumen del neumático: sombra abajo-derecha, brillo arriba-izquierda
  s+='<path d="'+_bArc(c,r+tw*.18,-20,110)+'" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="'+(tw*.45).toFixed(2)+'"/><path d="'+_bArc(c,r+tw*.12,190,260)+'" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="'+(tw*.3).toFixed(2)+'" stroke-linecap="round"/>';
  if(tipo==='mtb') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r+tw/2).toFixed(1)+'" fill="none" stroke="'+nc+'" stroke-width="1.7" stroke-dasharray="1.4 1.2"/>';
  if(tipo==='bmx'||tipo==='cicloviaje'||tipo==='gravel') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r+tw/2-.2).toFixed(1)+'" fill="none" stroke="'+nc+'" stroke-width="1.1" stroke-dasharray="1 1.2"/>';
  if(B.biciNeum==='cafe'||(tipo==='gravel'&&!B.biciNeum)) s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr+tw*.22).toFixed(1)+'" fill="none" stroke="#a0703c" stroke-width="'+(tw*.45).toFixed(2)+'"/>';
  if(B.biciNeum==='blanca'||(tipo==='playera'&&!B.biciNeum)) s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr+Math.min(1.1,tw*.22)).toFixed(1)+'" fill="none" stroke="#f5ead4" stroke-width="'+Math.min(1.5,tw*.4).toFixed(2)+'"/>';
  if(tipo==='cicloviaje'||tipo==='urbana') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr+.7).toFixed(1)+'" fill="none" stroke="#9ca3af" stroke-width=".5" opacity=".8"/>';
  if(tipo==='ruta') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr-2).toFixed(1)+'" fill="none" stroke="'+aro+'" stroke-width="4"/>';
  else s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr-.8).toFixed(1)+'" fill="none" stroke="'+aro+'" stroke-width="1.5"/>';
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
  cfg=cfg||{}; var o=_pistNormal(opts), modelo=(_BICI_VEH.indexOf(cfg.vehiculo)>=0?cfg.vehiculo:'')||o.biciTipo||'ruta';
  if(modelo==='moto') return _pistMotoSVG(o,cfg);
  if(modelo==='auto') return _pistAutoSVG(o,cfg);
  if(modelo==='handbike') return _pistHandbikeSVG(o,cfg,opts);
  // modelos que se dibujan sobre la base de otro (tipo) + sus piezas propias (modelo)
  var tipo={gravel:'ruta',triciclo:'urbana'}[modelo]||modelo;
  var G=_BICI_G[modelo]||_BICI_G.ruta, R=Object.assign({},_BICI_ROPA[modelo]||_BICI_ROPA.ruta), Y=_bPersona(o), B=_biciOpts(opts,modelo);
  var col=o.biciCol||_lpColCasco(o.casco), osc=_lpShade(col,-.45), cla=_lpShade(col,.5), col2=B.biciCol2;
  // traje: cambia la polera y, si el tipo usa short, el short (los jeans/pantalones se quedan)
  var TJ=_BICI_TRAJE[B.traje]||null;
  if(TJ){ if(TJ.pol){ Y.polera=TJ.pol; Y.poleraS=_lpShade(TJ.pol,-.3); } if(R.hasta<=1){ R.pierna=TJ.sh; if(TJ.holgado){ R.hasta=.94; R.ap=.7; } } }
  // sombra/luz: cada volumen se pinta en su tono de sombra y encima, corrido arriba-izquierda,
  // una versión más chica en su tono normal → borde en sombra abajo-derecha (luz de arriba-izquierda)
  var LUZ=' transform="translate(-.5 -.6)"';
  function somb(c){ return _lpShade(c,-.24); }
  var anim=cfg.pedal!==false, dur=cfg.cadencia||0.9, rc=7, N=16, s='';
  var aero=(cfg.rapido&&(tipo==='ruta'||tipo==='mtb'))?1:0;
  var SH=[G.sh[0]+aero*3,G.sh[1]+aero*4], HEAD=[G.head[0]+aero*4,G.head[1]+aero*4.5];
  // pelvis: el glúteo se asienta SOBRE el sillín (lo aplasta un poco) y de ahí salen el muslo y el torso
  var pose=cfg.pose||'';
  var GL=[G.hip[0]-1.8,G.sd[1]-2.4-4.2+1.6]; if(pose==='pie') GL=[GL[0]+4,GL[1]-5.5];
  var HIP=[GL[0]+1.8,GL[1]-.8];
  if(pose==='sinmanos'){ SH=[HIP[0]+4,HIP[1]-19]; HEAD=[SH[0]+3,SH[1]-14]; }
  if(pose==='caballito'){ SH=[SH[0]-3,SH[1]+1]; HEAD=[HEAD[0]-3,HEAD[1]+1]; }

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

  // poses (las pide el sobrevuelo): 'pie' de pie en los pedales (subida) · 'sinmanos' brazos arriba (celebración) · 'caballito' (llegada)
  var handF=[hand[0]-1.4,hand[1]-.8];
  // sin manos: saluda hacia adelante a la altura del pecho y apoya la otra mano en el muslo (arriba la tapa la cabeza)
  if(pose==='sinmanos'){ hand=[SH[0]+15,SH[1]+1]; handF=[HIP[0]+7,HIP[1]+.6]; }
  // ---- cuerpo: 16 poses por vuelta de biela ----
  // largo de pierna: que en el punto más bajo quede apenas flectada (como un ciclista bien ajustado)
  function pedal(t){ return [G.bb[0]+rc*Math.cos(t),G.bb[1]+rc*Math.sin(t)]; }
  function tobillo(t){ var P=pedal(t), fa=8+12*Math.sin(t-Math.PI/4), v=_bRot([-2,-2.6],fa); return {P:P,fa:fa,T:[P[0]+v[0],P[1]+v[1]]}; }
  var dmax=0, k; for(k=0;k<N;k++){ var tt=tobillo(k*2*Math.PI/N).T; dmax=Math.max(dmax,Math.hypot(tt[0]-HIP[0],tt[1]-HIP[1])); }
  var L=dmax/2+.9, La=Math.max(Math.hypot(hand[0]-SH[0],hand[1]-SH[1])/2+1.6,11), ap=R.ap;
  var F=[];
  for(k=0;k<N;k++){
    var th=k*2*Math.PI/N, bob=Math.sin(2*th-.6)*(pose==='pie'?1.3:.5), f={};
    // par(): el volumen y su versión interior (para la luz)
    var par=function(key,A,B,ra,rm,rb,lado,t){ f[key]=_bLimb(A,B,ra,rm,rb,lado,t); f[key+'_i']=_bLimb(A,B,ra*.7,rm*.7,rb*.7,lado,t); };
    f.hip=[HIP[0],HIP[1]+bob*.25]; f.gl=_bC([0,bob*.25]); f.ta=[GL[0]+.6,GL[1]-2.2+bob*.25]; f.sh=[SH[0]+bob*.25,SH[1]+bob]; f.head=[bob*.3,bob*1.15];
    [['n',th],['f',th+Math.PI]].forEach(function(pp){
      var x=pp[0], A=tobillo(pp[1]), K=_biciRodilla(f.hip,A.T,L);
      par(x+'mus',f.hip,K,4.3,3.9,3,-1,.4); par(x+'can',K,A.T,3,3,1.9,1,.32);
      if(R.hasta<=1) par(x+'ropa',f.hip,_bL(f.hip,K,R.hasta),4.7+ap,4.25+ap,4.65-1.3*R.hasta+ap*.6,-1,.42);
      else { par(x+'ropa',f.hip,K,4.7+ap,4.25+ap,3.3+ap*.5,-1,.4); par(x+'ropa2',K,A.T,3.3+ap*.5,3.2+ap*.5,2.5+ap*.4,1,.32); }
      if(R.calcetin) f[x+'cal']=_bCap(_bL(K,A.T,.7),A.T,2.3,2.1);
      f[x+'pie']=_bC(A.P); f[x+'rot']=A.fa.toFixed(1);
    });
    [['n',hand,f.sh],['f',handF,[f.sh[0]-1.6,f.sh[1]+.6]]].forEach(function(pp){
      var x=pp[0], H=pp[1], Sh=pp[2], E=_bCodo(Sh,H,La);
      par(x+'bra',Sh,E,3,2.9,2.4,1,.4); par(x+'ant',E,H,2.5,2.5,2,1,.32); par(x+'man',Sh,_bL(Sh,E,.55),3.7,3.6,3.2,1,.5);
    });
    f.torso=_bLimb(f.ta,f.sh,5.6,6.1,5.4,-1,.56);
    f.cuello=_bCap(f.sh,_bL(f.sh,[HEAD[0]+f.head[0],HEAD[1]+f.head[1]],.35),2.6,2.5);
    f.esp=_bC([bob*.2,bob*.65]);
    F.push(f);
  }
  function col_(x){ return F.map(function(f){ return f[x]; }); }
  // volumen con luz: base en sombra + interior en su tono corrido hacia la luz
  function vol(key,c){ return _bAP(col_(key),somb(c),anim,dur)+_bAP(col_(key+'_i'),c,anim,dur,LUZ); }
  function pierna(x){
    var c=x==='n'?function(v){return v;}:function(v){return _lpShade(v,-.28);};
    var t=vol(x+'mus',c(Y.piel))+vol(x+'can',c(Y.piel))+vol(x+'ropa',c(R.pierna));
    if(F[0][x+'ropa2']) t+=vol(x+'ropa2',c(R.pierna));
    if(F[0][x+'cal']) t+=_bAP(col_(x+'cal'),c(R.calcetin),anim,dur);
    // el pie viaja con el pedal (translate) y gira con el tobillo (rotate)
    t+='<g transform="translate('+F[0][x+'pie']+')">'+_bAT('translate',col_(x+'pie'),anim,dur)+'<g transform="rotate('+F[0][x+'rot']+')">'+_bAT('rotate',col_(x+'rot'),anim,dur)+_bZapato(R,c,Y.piel)+'</g></g>';
    return t;
  }
  function brazo(x){
    var cp=x==='n'?Y.piel:Y.pielS, cpo=x==='n'?Y.polera:Y.poleraS, H=x==='n'?hand:handF;
    return vol(x+'bra',cp)+vol(x+'ant',cp)+vol(x+'man',cpo)
      +'<circle cx="'+H[0].toFixed(1)+'" cy="'+H[1].toFixed(1)+'" r="2.5" fill="'+(x==='n'?'#1f2937':'#111827')+'"/>';
  }

  // ---- sombra + líneas de velocidad ----
  var rw=G.rw, fw=G.fw, bb=G.bb, st=G.st, hb=G.hb, sd=G.sd;
  var sombraPiso='<ellipse cx="62" cy="'+(rw[1]+G.r+2)+'" rx="46" ry="3.2" fill="rgba(0,0,0,.28)"/>'; s+=sombraPiso;
  if(cfg.rapido) s+='<g stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"><path d="M2 58 L16 58"/><path d="M6 68 L22 68"/><path d="M0 78 L12 78"/></g>';

  s+=pierna('f')+brazo('f');

  // ---- detrás de las ruedas: parrillas, alforjas del lado lejano ----
  if(tipo==='urbana'){
    var pr=[rw[0]-11,rw[1]-G.r-3.4], pf=[rw[0]+8,rw[1]-G.r-3.4];
    s+='<path d="M'+_bP(pr)+' L'+_bP(pf)+' M'+_bP([rw[0]-6,pr[1]])+' L'+_bP(rw)+' M'+_bP([rw[0]+4,pr[1]])+' L'+_bP(rw)+' M'+_bP(pf)+' L'+_bP([st[0]-1,st[1]+3])+'" fill="none" stroke="#475569" stroke-width="1.3" stroke-linecap="round"/>'
      +'<rect x="'+(pr[0]-1.6).toFixed(1)+'" y="'+(pr[1]-.4).toFixed(1)+'" width="2.6" height="3" rx=".6" fill="#ef4444" stroke="#991b1b" stroke-width=".4"/>';
  }
  // parrilla trasera (la usan las alforjas y la caja de reparto) + alforjas del lado lejano
  var conParrilla=(B.biciCarga==='alforjas'||B.biciCarga==='caja'), rk=rw[1]-G.r-3.6;
  if(conParrilla&&tipo!=='urbana') s+='<path d="M'+(rw[0]-12)+' '+rk+' L'+(rw[0]+10)+' '+rk+' M'+(rw[0]-7)+' '+rk+' L'+_bP(rw)+' M'+(rw[0]+5)+' '+rk+' L'+_bP(rw)+' M'+(rw[0]+10)+' '+rk+' L'+_bP([st[0]-1,st[1]+3])+'" fill="none" stroke="#374151" stroke-width="1.4" stroke-linecap="round"/>';
  if(B.biciCarga==='alforjas') s+='<rect x="'+(rw[0]-13)+'" y="'+(rk-1)+'" width="16" height="15" rx="3" fill="'+_lpShade('#b45309',-.3)+'"/><rect x="'+(fw[0]-1)+'" y="'+(fw[1]-12)+'" width="10" height="11" rx="2.4" fill="'+_lpShade('#b45309',-.3)+'"/>';

  // ---- ruedas ----
  // triciclo: la rueda trasera del lado lejano asoma detrás (más oscura, sin sombra propia)
  s+=(modelo==='triciclo'?'<g opacity=".6">'+_biciRueda([rw[0]-4,rw[1]-1.6],G,'triciclo',anim,dur*.75,_lpShade(col,-.3),B)+'</g>':'')+_biciRueda(rw,G,modelo,anim,dur*.75,col,B)+_biciRueda(fw,G,modelo,anim,dur*.75,col,B);
  // estela: la lanza el neumático trasero (va delante de la rueda para que se vea salir)
  s+=_bEstela(B.estela,[rw[0]+2,rw[1]-5],anim);
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
  // pintura del cuadro: color/degradé/galaxia como "tinta" del trazo; patrones encima del mismo trazo
  var sk=B.biciSkin, ac=B.biciAcab, gid='bg'+(++_biciUid), tinta=col, defs='';
  if(sk==='degrade'){ defs='<linearGradient id="'+gid+'" gradientUnits="userSpaceOnUse" x1="'+rw[0]+'" y1="0" x2="'+fw[0]+'" y2="0"><stop offset="0" stop-color="'+Y.polera+'"/><stop offset="1" stop-color="'+col+'"/></linearGradient>'; tinta='url(#'+gid+')'; }
  if(sk==='galaxia'){ defs='<linearGradient id="'+gid+'" gradientUnits="userSpaceOnUse" x1="'+rw[0]+'" y1="'+ht[1]+'" x2="'+fw[0]+'" y2="'+bb[1]+'"><stop offset="0" stop-color="#1e1b4b"/><stop offset=".55" stop-color="#6d28d9"/><stop offset="1" stop-color="#db2777"/></linearGradient>'; tinta='url(#'+gid+')'; }
  if(sk==='camo') tinta='#556b2f';
  if(defs) s+='<defs>'+defs+'</defs>';
  var borde=(sk==='galaxia'?'#0f0a2e':(sk==='camo'?'#2d3a17':osc));
  function pase(fn){ tubos.forEach(function(t,i){ s+=fn(t[0],t[1],i); }); }
  pase(function(d,w){ return '<path d="'+d+'" fill="none" stroke="'+borde+'" stroke-width="'+(w+1.5).toFixed(1)+'" stroke-linecap="round" stroke-linejoin="round"/>'; });
  if(ac==='neon') pase(function(d,w){ return '<path d="'+d+'" fill="none" stroke="'+cla+'" stroke-width="'+(w+4).toFixed(1)+'" stroke-linecap="round" opacity=".22"/>'; });
  pase(function(d,w,i){ var c=tinta; if(col2&&!sk&&(i===0||i===4)) c=col2; if(sk==='chile') c=(i===1?'#d52b1e':(i===0?'#f8fafc':(i===2?'#0039a6':'#d52b1e')));
    return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>'; });
  if(sk==='camo'){ pase(function(d,w){ return '<path d="'+d+'" fill="none" stroke="#2f3b1c" stroke-width="'+(w*.8).toFixed(1)+'" stroke-dasharray="3.4 2.6 1.6 4"/><path d="'+d+'" fill="none" stroke="#a89f72" stroke-width="'+(w*.6).toFixed(1)+'" stroke-dasharray="1.8 5.2 2.4 3" stroke-dashoffset="2"/>'; }); }
  if(sk==='galaxia'){ pase(function(d,w){ return '<path d="'+d+'" fill="none" stroke="#fff" stroke-width=".55" stroke-dasharray=".1 3.3" stroke-linecap="round" opacity=".9"/>'; }); }
  if(sk==='chile'){ var ta0=tubos[0][0].match(/M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)/); if(ta0){ var A0=[+ta0[1],+ta0[2]], B0=[+ta0[3],+ta0[4]];
    s+='<path d="M'+_bP(_bL(A0,B0,.62))+' L'+_bP(B0)+'" stroke="#0039a6" stroke-width="'+tubos[0][1]+'" stroke-linecap="round"/><path d="'+_lpStar(_bL(A0,B0,.8)[0],_bL(A0,B0,.8)[1],1.3,.5)+'" fill="#fff"/>'; } }
  if(sk==='retro'){ [[_bL(st,bb,.08),_bL(st,bb,.3)],[_bL(hb,bb,.06),_bL(hb,bb,.24)]].forEach(function(z){ var w=tubos[2][1]-.4;
    ['#f8fafc','#dc2626','#1d4ed8'].forEach(function(c,i){ s+='<path d="M'+_bP(_bL(z[0],z[1],i/3))+' L'+_bP(_bL(z[0],z[1],(i+1)/3))+'" stroke="'+c+'" stroke-width="'+w.toFixed(1)+'"/>'; }); }); }
  if(sk==='llamas'){ var w1=tubos[1][1]; // llamas que salen del tubo de dirección por el diagonal
    s+='<path d="M'+_bP(_bL(hb,bb,.02))+' L'+_bP(_bL(hb,bb,.62))+'" stroke="#f97316" stroke-width="'+(w1-.6).toFixed(1)+'" stroke-dasharray="5 1.4 3 1.4 2 6" stroke-linecap="round"/>'
      +'<path d="M'+_bP(_bL(hb,bb,.02))+' L'+_bP(_bL(hb,bb,.45))+'" stroke="#facc15" stroke-width="'+(w1-1.8).toFixed(1)+'" stroke-dasharray="4 1.6 2.4 1.6 1.4 5" stroke-linecap="round"/>'
      +'<path d="M'+_bP(_bL(st,ht,.55))+' L'+_bP(_bL(st,ht,.98))+'" stroke="#f97316" stroke-width="'+(tubos[0][1]-.6).toFixed(1)+'" stroke-dasharray="1.4 3 2.4 1.4 4" stroke-linecap="round"/>'; }
  if(ac==='carbono') pase(function(d,w){ return '<path d="'+d+'" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="'+(w*.7).toFixed(1)+'" stroke-dasharray=".6 .6"/>'; });
  if(ac==='mate') pase(function(d,w){ return '<path d="'+d+'" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="'+w+'" stroke-linecap="round"/>'; });
  // brillo (mate no brilla; metálico brilla fuerte con un segundo reflejo)
  if(ac!=='mate') pase(function(d,w){ return '<path d="'+d+'" fill="none" stroke="'+(ac==='metal'?'#ffffff':cla)+'" stroke-width="'+(w*.3).toFixed(2)+'" stroke-linecap="round" opacity="'+(ac==='metal'?.85:.7)+'" transform="translate(-.35 -.55)"/>'; });
  if(ac==='metal') pase(function(d,w){ return '<path d="'+d+'" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="'+(w*.3).toFixed(2)+'" stroke-linecap="round" transform="translate(.35 .55)"/>'; });
  if((tipo==='ruta'||tipo==='mtb'||tipo==='bmx')&&!sk){ var w0=tubos[1][1];
    s+='<path d="M'+_bP(_bL(hb,bb,.14))+' L'+_bP(_bL(hb,bb,.28))+'" stroke="#f8fafc" stroke-width="'+(w0-1.4).toFixed(1)+'"/>'
      +'<path d="M'+_bP(_bL(hb,bb,.31))+' L'+_bP(_bL(hb,bb,.34))+'" stroke="#f8fafc" stroke-width="'+(w0-1.4).toFixed(1)+'" opacity=".85"/>'; }
  // caramagiolas (cicloviaje lleva dos)
  function botella(t,cTapa){ var bc=_bL(hb,bb,t), ba=_bAng(hb,bb);
    return '<g transform="translate('+_bC(bc)+') rotate('+(ba+180).toFixed(1)+')"><rect x="-4.6" y="-4.6" width="9.2" height="3.4" rx="1.4" fill="#e2e8f0" stroke="#64748b" stroke-width=".5"/><rect x="4.2" y="-4" width="1.6" height="2.2" rx=".4" fill="'+cTapa+'"/><path d="M-1.6 -4.6 L-1.6 -1.2" stroke="#64748b" stroke-width=".6"/></g>'; }
  if(tipo==='ruta'||tipo==='mtb') s+=botella(.54,col);
  if(tipo==='cicloviaje') s+=botella(.4,'#0d9488')+botella(.72,'#0d9488');
  if(tipo==='urbana') s+='<path d="M'+_bP([bb[0]+3,bb[1]-7])+' L'+_bP([rw[0]+4,rw[1]-4.6])+' Q'+_bP([rw[0]+1,rw[1]-4.6])+' '+_bP([rw[0]+2,rw[1]-1])+' L'+_bP([bb[0]+2,bb[1]-1])+' Z" fill="#1f2937" stroke="#0b0f17" stroke-width=".5"/>';
  // tubo de dirección + horquilla
  s+=_bTubo('M'+_bP(ht)+' L'+_bP(hb),3.6,sk==='chile'?'#f8fafc':tinta,borde,ac==='mate'?tinta:cla)+'<path d="M'+_bP([ht[0]-.4,ht[1]-1.4])+' L'+_bP([ht[0]+.2,ht[1]+.6])+'" stroke="#111827" stroke-width="4.4" stroke-linecap="round"/>';
  if(tipo==='mtb'){ var mid=_bL(hb,fw,.45);
    s+='<path d="M'+_bP(hb)+' L'+_bP(_bL(hb,fw,.55))+'" stroke="#e5e7eb" stroke-width="2.6" stroke-linecap="round"/><path d="M'+_bP(mid)+' L'+_bP(fw)+'" stroke="#111827" stroke-width="4.2" stroke-linecap="round"/>'
      +'<path d="'+_bCap([hb[0]-2.4,hb[1]+.4],[hb[0]+2.6,hb[1]+1],1.6,1.6)+'" fill="#111827"/>'; }
  else s+=_bTubo('M'+_bP(hb)+' Q'+_bP([hb[0]+(tipo==='ruta'?5:4),(hb[1]+fw[1])/2+2])+' '+_bP(fw),tipo==='bmx'?3:2.3,col2||(tipo==='playera'?col:osc),'#0b0f17',col2?_lpShade(col2,.45):(tipo==='playera'?cla:col));

  // ---- CARGA (producto, sirve en cualquier bici): alforjas, caja de reparto, bikepacking ----
  var alf='#b45309', alfO='#78350f', rk2=rk;
  if(B.biciCarga==='alforjas'){
    // carpa enrollada sobre la parrilla, con correas
    s+='<path d="'+_bCap([rw[0]-11,rk2-3.4],[rw[0]+8,rk2-3.4],3.4,3.4)+'" fill="#14532d"/><path d="'+_bCap([rw[0]-11,rk2-4],[rw[0]+8,rk2-4],2.6,2.6)+'" fill="#15803d"/>'
      +'<path d="M'+(rw[0]-5)+' '+(rk2-6.8)+' l0 6.8 M'+(rw[0]+3)+' '+(rk2-6.8)+' l0 6.8" stroke="#111827" stroke-width="1"/>'
      +'<ellipse cx="'+(rw[0]-14.2)+'" cy="'+(rk2-3.4)+'" rx="1.2" ry="3.4" fill="#166534"/>';
    // alforja trasera (lado cercano): bolsillo, cierre enrollable, hebillas, reflectante, sombra lateral
    s+='<rect x="'+(rw[0]-14)+'" y="'+rk2+'" width="17" height="16" rx="3.2" fill="'+alf+'" stroke="'+alfO+'" stroke-width=".8"/>'
      +'<rect x="'+(rw[0]-.4)+'" y="'+(rk2+.6)+'" width="2.8" height="14.8" rx="1.4" fill="rgba(0,0,0,.2)"/>'
      +'<path d="M'+(rw[0]-13.2)+' '+(rk2+1.2)+' l13 0" stroke="rgba(255,255,255,.22)" stroke-width=".8" stroke-linecap="round"/>'
      +'<path d="M'+(rw[0]-14)+' '+(rk2+4)+' l17 0" stroke="'+alfO+'" stroke-width=".8"/>'
      +'<path d="M'+(rw[0]-10)+' '+(rk2+4)+' l0 5 M'+(rw[0]-1)+' '+(rk2+4)+' l0 5" stroke="#111827" stroke-width="1"/>'
      +'<rect x="'+(rw[0]-12)+'" y="'+(rk2+9)+'" width="13" height="5" rx="1.4" fill="'+_lpShade(alf,-.12)+'" stroke="'+alfO+'" stroke-width=".5"/>'
      +'<rect x="'+(rw[0]-13.4)+'" y="'+(rk2+6.6)+'" width="2.2" height="1.1" fill="#e5e7eb"/>';
    // parrilla delantera baja + alforja chica
    s+='<path d="M'+_bP(_bL(hb,fw,.35))+' L'+(fw[0]+4)+' '+(fw[1]-12)+' L'+_bP(fw)+'" fill="none" stroke="#374151" stroke-width="1.2"/>'
      +'<rect x="'+(fw[0]-4)+'" y="'+(fw[1]-13)+'" width="11" height="12" rx="2.6" fill="'+alf+'" stroke="'+alfO+'" stroke-width=".8"/><rect x="'+(fw[0]+4.6)+'" y="'+(fw[1]-12.4)+'" width="2" height="10.8" rx="1" fill="rgba(0,0,0,.2)"/>'
      +'<path d="M'+(fw[0]-4)+' '+(fw[1]-9.6)+' l11 0" stroke="'+alfO+'" stroke-width=".7"/><path d="M'+(fw[0]+1.5)+' '+(fw[1]-9.6)+' l0 4" stroke="#111827" stroke-width=".9"/>';
  }
  if(B.biciCarga==='caja'){ var cx0=rw[0]-14, cy0=rk2-17;
    s+='<rect x="'+cx0+'" y="'+cy0+'" width="22" height="17" rx="2.4" fill="#fc4c02" stroke="#9a3412" stroke-width=".8"/>'
      +'<rect x="'+(cx0+17.4)+'" y="'+(cy0+.6)+'" width="4" height="15.8" rx="1.6" fill="rgba(0,0,0,.2)"/><path d="M'+(cx0+.8)+' '+(cy0+4)+' l20.4 0" stroke="#9a3412" stroke-width=".8"/>'
      +'<path d="M'+(cx0+1.2)+' '+(cy0+1.4)+' l15 0" stroke="rgba(255,255,255,.3)" stroke-width=".9" stroke-linecap="round"/>'
      +'<circle cx="'+(cx0+9)+'" cy="'+(cy0+10.4)+'" r="4.2" fill="#fff"/><text x="'+(cx0+9)+'" y="'+(cy0+12.2)+'" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="4.6" fill="#fc4c02">LP</text>'; }
  if(B.biciCarga==='bikepacking'){
    // bolso de marco (llena el triángulo) + bolso de sillín en cono
    var tri=[_bL(st,ht,.1),_bL(st,ht,.9),_bL(hb,bb,.62)], cen=[(tri[0][0]+tri[1][0]+tri[2][0])/3,(tri[0][1]+tri[1][1]+tri[2][1])/3];
    tri=tri.map(function(p){ return _bL(p,cen,.16); });
    s+='<path d="M'+_bP(tri[0])+' L'+_bP(tri[1])+' L'+_bP(tri[2])+' Z" fill="#475569" stroke="#1e293b" stroke-width=".8" stroke-linejoin="round"/>'
      +'<path d="M'+_bP(_bL(tri[0],tri[1],.08))+' L'+_bP(_bL(tri[2],tri[1],.12))+'" stroke="#f97316" stroke-width=".7" stroke-dasharray="1 .5"/>'
      +'<path d="M'+_bP(_bL(tri[0],tri[1],.1))+' L'+_bP(_bL(tri[0],tri[1],.85))+'" stroke="rgba(255,255,255,.18)" stroke-width="1" stroke-linecap="round"/>';
    s+='<path d="M'+(sd[0]-4)+' '+(sd[1]-1.4)+' L'+(sd[0]-15)+' '+(sd[1]-4.4)+' Q'+(sd[0]-18.4)+' '+(sd[1]-2.2)+' '+(sd[0]-15)+' '+(sd[1]+1.4)+' L'+(sd[0]-4)+' '+(sd[1]+3.2)+' Z" fill="#374151" stroke="#111827" stroke-width=".6"/>'
      +'<path d="M'+(sd[0]-7)+' '+(sd[1]-2.2)+' l0 5 M'+(sd[0]-11)+' '+(sd[1]-3.2)+' l0 5.2" stroke="#111827" stroke-width=".8"/><path d="M'+(sd[0]-14.6)+' '+(sd[1]-3.4)+' l9.6 2.6" stroke="rgba(255,255,255,.18)" stroke-width=".8"/>'; }
  // triciclo adaptado: canasto trasero grande de rejilla, de fábrica (entre las dos ruedas de atrás)
  if(modelo==='triciclo'){ var tb=[rw[0]-12,rw[1]-G.r-12];
    s+='<path d="M'+_bP([tb[0]+4,tb[1]+11])+' L'+_bP(rw)+' M'+_bP([tb[0]+18,tb[1]+11])+' L'+_bP(rw)+' M'+_bP([tb[0]+21,tb[1]+6])+' L'+_bP([st[0]-1,st[1]+4])+'" stroke="#475569" stroke-width="1.3" stroke-linecap="round"/>'
      +'<rect x="'+tb[0]+'" y="'+tb[1]+'" width="22" height="11.6" rx="1.6" fill="rgba(148,163,184,.25)" stroke="#94a3b8" stroke-width="1.1"/>'
      +'<path d="M'+(tb[0]+4.4)+' '+tb[1]+' l0 11.6 M'+(tb[0]+8.8)+' '+tb[1]+' l0 11.6 M'+(tb[0]+13.2)+' '+tb[1]+' l0 11.6 M'+(tb[0]+17.6)+' '+tb[1]+' l0 11.6 M'+tb[0]+' '+(tb[1]+5.8)+' l22 0" stroke="#94a3b8" stroke-width=".55"/>'
      +'<path d="M'+(tb[0]-.6)+' '+(tb[1]+.2)+' l23.2 0" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round"/>'; }
  // banderín (extra): mástil flexible desde la parrilla o el eje, flamea
  // con una bandera comprada el banderín va siempre (aunque el extra elegido sea otro)
  if(B.biciExtra==='banderin'||B.bandera){ var mx=rw[0]-(conParrilla?12:3), my=conParrilla?rk2-1:rw[1]-2, top=rk2-31;
    var fl=['M'+mx+' '+top+' Q'+(mx-5)+' '+(top+1)+' '+(mx-10)+' '+(top+3)+' L'+mx+' '+(top+6)+' Z','M'+mx+' '+top+' Q'+(mx-5)+' '+(top+3)+' '+(mx-10)+' '+(top+2)+' L'+mx+' '+(top+6)+' Z','M'+mx+' '+top+' Q'+(mx-5)+' '+(top-1)+' '+(mx-10)+' '+(top+4)+' L'+mx+' '+(top+6)+' Z'];
    s+='<path d="M'+mx+' '+my+' L'+mx+' '+top+'" stroke="#e5e7eb" stroke-width=".8"/>'+(B.bandera?_bBandera(B.bandera,mx,top,anim):_bAP(fl,'#f97316',anim,.8)); }

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
  // bolso de manubrio (con alforjas) · rollo de manubrio (bikepacking) · canasto
  if(B.biciCarga==='alforjas') s+='<rect x="'+(S[0]+1)+'" y="'+(S[1]+.8)+'" width="9" height="7" rx="1.8" fill="#0f766e" stroke="#134e4a" stroke-width=".7"/><rect x="'+(S[0]+7.6)+'" y="'+(S[1]+1.4)+'" width="1.4" height="5.8" rx=".6" fill="rgba(0,0,0,.25)"/><rect x="'+(S[0]+2.2)+'" y="'+(S[1]+1.6)+'" width="6.6" height="2.6" rx=".6" fill="rgba(226,232,240,.7)"/>';
  if(B.biciCarga==='bikepacking'){ var rl=[S[0]+3.4,S[1]+3];
    s+='<circle cx="'+rl[0].toFixed(1)+'" cy="'+rl[1].toFixed(1)+'" r="3.8" fill="#14532d"/><circle cx="'+(rl[0]-.5).toFixed(1)+'" cy="'+(rl[1]-.6).toFixed(1)+'" r="2.8" fill="#15803d"/><circle cx="'+rl[0].toFixed(1)+'" cy="'+rl[1].toFixed(1)+'" r="1.4" fill="none" stroke="#166534" stroke-width=".6"/>'
      +'<path d="M'+(rl[0]-1.4).toFixed(1)+' '+(rl[1]-3.8).toFixed(1)+' l0 7.6 M'+(rl[0]+1.4).toFixed(1)+' '+(rl[1]-3.8).toFixed(1)+' l0 7.6" stroke="#111827" stroke-width=".8"/>'; }
  if(B.biciCarga==='canasto'){ var bx=ht[0]+2.4, by=ht[1]-7.6;
    s+='<path d="M'+bx+' '+by+' l12 0 l-1.6 9.4 l-8.8 0 Z" fill="#c08a4d" stroke="#7c5a2e" stroke-width=".8" stroke-linejoin="round"/>'
      +'<path d="M'+(bx+8.6)+' '+by+' l3.4 0 l-1.6 9.4 l-2.6 0 Z" fill="rgba(0,0,0,.18)"/>'
      +'<path d="M'+(bx+.6)+' '+(by+3)+' l10.8 0 M'+(bx+1.1)+' '+(by+6)+' l9.8 0 M'+(bx+4)+' '+by+' l.2 9.4 M'+(bx+8)+' '+by+' l-.3 9.4" stroke="#7c5a2e" stroke-width=".55"/>'
      +'<path d="M'+(bx-.8)+' '+(by+.2)+' l13.6 0" stroke="#7c5a2e" stroke-width="1.3" stroke-linecap="round"/><path d="M'+(bx-.4)+' '+(by-.4)+' l12 0" stroke="rgba(255,255,255,.3)" stroke-width=".5"/>'; }
  // MASCOTA (producto): va en el canasto; si la bici no trae canasto, la mascota trae el suyo.
  // En el triciclo va en el canasto trasero.
  if(B.mascota){
    var mb;
    if(modelo==='triciclo') mb=[rw[0]-1,rw[1]-G.r-12.6];
    else { var bx2=ht[0]+2.4, by2=ht[1]-7.6; mb=[bx2+6,by2];
      if(B.biciCarga!=='canasto') s+='<path d="M'+bx2+' '+by2+' l12 0 l-1.6 9.4 l-8.8 0 Z" fill="#c08a4d" stroke="#7c5a2e" stroke-width=".8" stroke-linejoin="round"/>'
        +'<path d="M'+(bx2+8.6)+' '+by2+' l3.4 0 l-1.6 9.4 l-2.6 0 Z" fill="rgba(0,0,0,.18)"/><path d="M'+(bx2+.6)+' '+(by2+3)+' l10.8 0 M'+(bx2+1.1)+' '+(by2+6)+' l9.8 0 M'+(bx2+4)+' '+by2+' l.2 9.4 M'+(bx2+8)+' '+by2+' l-.3 9.4" stroke="#7c5a2e" stroke-width=".55"/>'; }
    s+=_bMascota(B.mascota,mb,anim);
  }
  // EXTRAS: luces (delantera fija + trasera que parpadea) · patito con timbre
  if(B.biciExtra==='luces'){ var lf=[ht[0]+1.2,ht[1]+2.4], lr=_bL(st,sd,.25);
    s+='<path d="M'+_bP([lf[0]+3.6,lf[1]+.6])+' l13 -3.6 l0 8.4 Z" fill="rgba(253,230,138,.22)"/><rect x="'+lf[0].toFixed(1)+'" y="'+lf[1].toFixed(1)+'" width="4" height="2.6" rx=".9" fill="#1f2937"/><rect x="'+(lf[0]+2.6).toFixed(1)+'" y="'+(lf[1]+.4).toFixed(1)+'" width="1.4" height="1.8" rx=".5" fill="#fde68a"/>'
      +'<rect x="'+(lr[0]-3.4).toFixed(1)+'" y="'+(lr[1]-1).toFixed(1)+'" width="2.4" height="3" rx=".8" fill="#ef4444" stroke="#7f1d1d" stroke-width=".4">'+(anim?'<animate attributeName="opacity" values="1;.25;1" dur=".9s" repeatCount="indefinite"/>':'')+'</rect>'; }
  if(B.biciExtra==='patito'){ var pd=[ht[0]+2.2,ht[1]-4.2];
    s+='<ellipse cx="'+pd[0]+'" cy="'+pd[1]+'" rx="2.8" ry="2" fill="#facc15" stroke="#a16207" stroke-width=".4"/><path d="M'+(pd[0]-2.6)+' '+(pd[1]-.6)+' l-1.4 -1.2 l.4 1.8 Z" fill="#facc15" stroke="#a16207" stroke-width=".3"/>'
      +'<circle cx="'+(pd[0]+1.6)+'" cy="'+(pd[1]-2.2)+'" r="1.6" fill="#facc15" stroke="#a16207" stroke-width=".4"/><path d="M'+(pd[0]+3)+' '+(pd[1]-2.3)+' l1.6 .2 l-1.6 .8 Z" fill="#f97316"/><circle cx="'+(pd[0]+2)+'" cy="'+(pd[1]-2.6)+'" r=".35" fill="#111827"/>'
      +'<path d="M'+(pd[0]-1.6)+' '+(pd[1]-.4)+' q1.2 -.9 2.4 0" fill="none" stroke="#fde68a" stroke-width=".5"/>'
      +'<circle cx="'+(hand[0]+1.6).toFixed(1)+'" cy="'+(hand[1]+1.8).toFixed(1)+'" r="1.3" fill="#e5e7eb" stroke="#6b7280" stroke-width=".4"/>'; }

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
  if(TJ&&(TJ.capa||TJ.puas)){ var fondo='', T0=[GL[0]+.6,GL[1]-2.2];
    if(TJ.capa){ var c0=[SH[0]-1.5,SH[1]-.5];
      var cp3=[[-27,9,-17,19],[-28,13,-19,21],[-26,6,-15,17]].map(function(q){ return 'M'+_bP(c0)+' Q'+_bP([c0[0]-9,c0[1]-2])+' '+_bP([c0[0]+q[0],c0[1]+q[1]])+' Q'+_bP([c0[0]+q[2],c0[1]+q[3]])+' '+_bP([GL[0]-4,GL[1]+3])+' Z'; });
      fondo+=_bAP(cp3,_lpShade(TJ.capa,-.25),anim,.6)+_bAP(cp3,TJ.capa,anim,.6,' transform="translate(-.6 -.8) scale(.97)" transform-origin="'+_bP(c0)+'"'); }
    if(TJ.puas){ for(var pi=0;pi<6;pi++){ var pb=_bL(T0,shp,.12+pi*.15), a1=[pb[0]+bn[0]*4.6-(shp[0]-T0[0])*.05,pb[1]+bn[1]*4.6-(shp[1]-T0[1])*.05], a2=[pb[0]+bn[0]*4.6+(shp[0]-T0[0])*.05,pb[1]+bn[1]*4.6+(shp[1]-T0[1])*.05], tp=[pb[0]+bn[0]*8.4,pb[1]+bn[1]*8.4];
        fondo+='<path d="M'+_bP(a1)+' L'+_bP(tp)+' L'+_bP(a2)+' Z" fill="'+TJ.puas+'" stroke="#14532d" stroke-width=".4" stroke-linejoin="round"/>'; }
      fondo+='<path d="M'+_bP([GL[0]-3,GL[1]-2])+' Q'+_bP([GL[0]-12,GL[1]-2.6])+' '+_bP([GL[0]-19,GL[1]+5])+' Q'+_bP([GL[0]-11,GL[1]+2.6])+' '+_bP([GL[0]-2,GL[1]+2.4])+' Z" fill="'+TJ.pol+'" stroke="#14532d" stroke-width=".5"/>'; }
    s+='<g transform="translate('+F[0].esp+')">'+_bAT('translate',col_('esp'),anim,dur)+fondo+'</g>'; }
  var glr='rotate(12 '+_bP(GL)+')';
  s+='<g transform="translate('+F[0].gl+')">'+_bAT('translate',col_('gl'),anim,dur)
    +'<ellipse cx="'+GL[0].toFixed(1)+'" cy="'+GL[1].toFixed(1)+'" rx="5.6" ry="4.3" fill="'+somb(R.pierna)+'" transform="'+glr+'"/>'
    +'<ellipse cx="'+(GL[0]-.5).toFixed(1)+'" cy="'+(GL[1]-.6).toFixed(1)+'" rx="4.3" ry="3.1" fill="'+R.pierna+'" transform="'+glr+'"/>'
    +'<path d="'+_bArc(GL,3.4,195,265)+'" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.1" stroke-linecap="round"/></g>';
  // torso: se mece entero con el cuerpo; base en sombra + volumen con luz + patrón del traje recortado al torso
  var T0=[GL[0]+.6,GL[1]-2.2], tors=_bLimb(T0,shp,5.6,6.1,5.4,-1,.56), cid='bt'+(++_biciUid);
  function banda(t,w,c){ var p=_bL(T0,shp,t); return '<path d="M'+_bP([p[0]-bn[0]*10,p[1]-bn[1]*10])+' L'+_bP([p[0]+bn[0]*10,p[1]+bn[1]*10])+'" stroke="'+c+'" stroke-width="'+w+'"/>'; }
  function aLo(t0,t1,off,w,c){ var a=_bL(T0,shp,t0), b=_bL(T0,shp,t1); return '<path d="M'+_bP([a[0]+bn[0]*off,a[1]+bn[1]*off])+' L'+_bP([b[0]+bn[0]*off,b[1]+bn[1]*off])+'" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round"/>'; }
  var pat='';
  if(TJ){
    if(TJ.pat==='equipo') pat=aLo(0,1.1,-4.4,3.4,'#111827')+banda(.5,3,'#f8fafc')+banda(.6,1,Y.poleraS);
    else if(TJ.pat==='retro') pat=banda(.68,1.5,'#f8fafc')+banda(.75,1.5,'#f8fafc')+aLo(.05,.4,-3,.9,'rgba(255,255,255,.4)');
    else if(TJ.pat==='enduro') pat=aLo(0,1.1,3.6,4.4,'#1f2937')+banda(.34,1.6,'#f8fafc')+aLo(.2,.9,-4.6,1.4,'#facc15');
    else if(TJ.pat==='chile'){ var cp=_bL(T0,shp,.86); cp=[cp[0]-bn[0]*1.6,cp[1]-bn[1]*1.6];
      pat=banda(.85,7.4,'#f8fafc')+'<circle cx="'+cp[0].toFixed(1)+'" cy="'+cp[1].toFixed(1)+'" r="3.2" fill="#0039a6"/><path d="'+_lpStar(cp[0],cp[1],1.7,.6)+'" fill="#fff"/>'; }
    else if(TJ.pat==='lunares'){ for(var ti=0;ti<7;ti++) for(var di=-3;di<=3;di++){ var p=_bL(T0,shp,.04+ti*.16), d=di*3.3+(ti%2?1.65:0);
      pat+='<circle cx="'+(p[0]+bn[0]*d).toFixed(1)+'" cy="'+(p[1]+bn[1]*d).toFixed(1)+'" r="1.15" fill="#dc2626"/>'; } }
    else if(TJ.pat==='lider') pat=banda(.38,.8,'#111827')+banda(.44,.8,'#111827')+aLo(.62,.8,-2.6,2.6,'#111827');
    else if(TJ.pat==='huaso') pat=banda(.06,2.6,'#dc2626')+banda(.26,1,'#f8fafc')+banda(.33,1.3,'#1d4ed8')+banda(.4,1,'#f8fafc')+banda(.68,1,'#f8fafc')+banda(.75,1.3,'#1d4ed8')+banda(.82,1,'#f8fafc');
    else if(TJ.pat==='pascuero'){ var hb2=_bL(T0,shp,.2); pat=banda(.04,2.8,'#f8fafc')+aLo(.2,1.05,-4.6,1.8,'#f8fafc')+banda(.2,2.2,'#111827')+'<rect x="'+(hb2[0]-bn[0]*3.4-1.2).toFixed(1)+'" y="'+(hb2[1]-bn[1]*3.4-1.2).toFixed(1)+'" width="2.4" height="2.4" rx=".3" fill="none" stroke="#facc15" stroke-width=".7"/>'; }
    else if(TJ.pat==='heroe'){ var em=_bL(T0,shp,.66); em=[em[0]-bn[0]*2.6,em[1]-bn[1]*2.6]; pat=banda(.12,1.4,'#facc15')+'<circle cx="'+em[0].toFixed(1)+'" cy="'+em[1].toFixed(1)+'" r="2.6" fill="#facc15" stroke="#a16207" stroke-width=".4"/><path d="M'+(em[0]+.4).toFixed(1)+' '+(em[1]-1.9).toFixed(1)+' l-1.4 2 l1 0 l-.7 1.8 l1.8 -2.3 l-1 0 Z" fill="#dc2626"/>'; }
    else if(TJ.pat==='dino') pat=aLo(.05,1,-4.2,3.4,'#86efac');
    else if(TJ.pat==='arcoiris') ['#2563eb','#dc2626','#111827','#facc15','#16a34a'].forEach(function(c,i){ pat+=banda(.44+i*1.2/td,1.25,c); });
  }
  s+='<g transform="translate('+F[0].esp+')">'+_bAT('translate',col_('esp'),anim,dur)
    +'<path d="'+tors+'" fill="'+somb(Y.polera)+'"/><path d="'+_bLimb(T0,shp,5.6*.74,6.1*.74,5.4*.74,-1,.56)+'" fill="'+Y.polera+'"'+LUZ+'/>'
    +(pat?'<clipPath id="'+cid+'"><path d="'+tors+'"/></clipPath><g clip-path="url(#'+cid+')" opacity=".96">'+pat+'</g>':'')+'</g>';
  var det='';
  det+='<path d="M'+_bP([hip[0]+bn[0]*4.4,hip[1]+bn[1]*4.4])+' L'+_bP([shp[0]+bn[0]*3.8,shp[1]+bn[1]*3.8])+'" stroke="rgba(255,255,255,.22)" stroke-width="2.2" stroke-linecap="round"/>';
  if(TJ&&(R.extra==='franja'||R.extra==='flores')) R.extra='';
  if(R.extra==='franja') det+='<path d="M'+_bP(_bL(hip,shp,.12))+' L'+_bP(_bL(shp,hip,.1))+'" stroke="#f8fafc" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>'
    +'<path d="'+_bCap([hip[0]+bn[0]*3+(shp[0]-hip[0])*.1,hip[1]+bn[1]*3+(shp[1]-hip[1])*.1],[hip[0]+bn[0]*3.4+(shp[0]-hip[0])*.32,hip[1]+bn[1]*3.4+(shp[1]-hip[1])*.32],1.3,1.2)+'" fill="'+Y.poleraS+'" opacity=".8"/>';
  if(R.extra==='mochila'||R.extra==='hidra') det+='<path d="M'+_bP([shp[0]+bn[0]*2,shp[1]+bn[1]*2-1])+' Q'+_bP(_bL(hip,shp,.6))+' '+_bP([hip[0]+(shp[0]-hip[0])*.25,hip[1]+(shp[1]-hip[1])*.25+1.6])+'" fill="none" stroke="'+(R.extra==='hidra'?'#0f172a':osc)+'" stroke-width="1.3" stroke-linecap="round"/>';
  if(R.extra==='capucha') det+='<path d="'+_bCap([shp[0]+bn[0]*3.6,shp[1]+bn[1]*3.6],[shp[0]+bn[0]*4.4-(shp[0]-hip[0])*.28,shp[1]+bn[1]*4.4-(shp[1]-hip[1])*.28],3.2,2.6)+'" fill="'+Y.poleraS+'"/>'
    +'<path d="M'+_bP(_bL(hip,shp,.82))+' l1.2 4" stroke="#f8fafc" stroke-width=".7" stroke-linecap="round"/>';
  if(R.extra==='flores') [[.3,-2],[.55,1.8],[.78,-1.2],[.45,-3.6]].forEach(function(q){ var p=_bL(hip,shp,q[0]); p=[p[0]+bn[0]*q[1],p[1]+bn[1]*q[1]];
    det+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="1.3" fill="#fef3c7" opacity=".9"/><circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r=".5" fill="#f59e0b"/>'; });
  if(R.extra==='buff') det+='<path d="'+_bCap(_bL(hip,shp,.9),[shp[0]+(shp[0]-hip[0])*.05,shp[1]+(shp[1]-hip[1])*.05],3.4,3.2)+'" fill="#0d9488"/><path d="M'+_bP(_bL(hip,shp,.9))+' l1.6 1.4" stroke="#f2b705" stroke-width=".8"/>'
    +'<path d="M'+_bP(_bL(hip,shp,.3))+' l3 -1.4" stroke="'+Y.poleraS+'" stroke-width="1.4" stroke-linecap="round"/>';
  if(B.biciExtra==='dorsal'){ var dc=_bL(hip,shp,.4); dc=[dc[0]+bn[0]*3.4,dc[1]+bn[1]*3.4];
    det+='<g transform="translate('+_bC(dc)+') rotate('+(ta+90).toFixed(1)+')"><rect x="-3.8" y="-2.8" width="7.6" height="5.6" rx=".7" fill="#fff" stroke="#9ca3af" stroke-width=".4"/><path d="M-3 -2 l.01 0 M3 -2 l.01 0 M-3 2 l.01 0 M3 2 l.01 0" stroke="#6b7280" stroke-width=".7" stroke-linecap="round"/>'
      +'<text x="0" y="1.7" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="4.6" fill="#111827">7</text></g>'; }
  s+='<g transform="translate('+F[0].esp+')">'+_bAT('translate',col_('esp'),anim,dur)+det+'</g>';
  s+=_bAP(col_('cuello'),Y.pielS,anim,dur);

  s+=pierna('n')+brazo('n');

  // ---- cabeza: el Pistero del usuario (se mece con el cuerpo; inclinada según la postura) ----
  var inc=pose==='sinmanos'?0:(pose==='caballito'?-4:(G.inc+aero*8+(pose==='pie'?4:0))), cab=_bCabeza(o,cfg.expr,HEAD,52);
  var hv=F.map(function(f){ return _bC(f.head); });
  s+='<g transform="translate('+hv[0]+')">'+_bAT('translate',hv,anim,dur)+(inc?'<g transform="rotate('+inc+' '+_bP(HEAD)+')">'+cab+'</g>':cab)+'</g>';
  // caballito: todo (menos la sombra del piso) gira sobre el punto donde la rueda trasera toca el suelo
  if(pose==='caballito') s=sombraPiso+'<g transform="rotate(-15 '+_bP([rw[0]+G.r*.25,rw[1]+G.r])+')">'+s.replace(sombraPiso,'')+'</g>';
  return '<svg viewBox="-4 -14 132 124" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}

/* ===== ESTELAS: lo que deja Pistero al pedalear (sale de la rueda trasera hacia atrás) =====
   p = punto de salida (detrás de la rueda trasera, a media altura). Quieta (tienda) = un
   cuadro congelado con las partículas repartidas, para que igual se vea en la tarjeta. */
function _bEstela(id,p,anim){
  if(!id) return '';
  var s='', n=10, dur=1.3, i;
  function part(forma,dx,dy,rot,col,k){
    forma='<g transform="scale(1.6)">'+forma+'</g>';
    var x1=p[0]-32, f=k/n, x=p[0]+(x1-p[0])*f;
    var y=p[1]+dy;
    if(!anim) return '<g transform="translate('+x.toFixed(1)+' '+(y+dx*f).toFixed(1)+') rotate('+(rot*f).toFixed(0)+')" opacity="'+(1-f*.85).toFixed(2)+'">'+forma+'</g>';
    return '<g opacity="0">'+forma
      +'<animateTransform attributeName="transform" type="translate" values="'+p[0]+' '+y+';'+(p[0]-32)+' '+(y+dx)+'" dur="'+dur+'s" begin="'+(k*dur/n).toFixed(2)+'s" repeatCount="indefinite"/>'
      +'<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.12;.7;1" dur="'+dur+'s" begin="'+(k*dur/n).toFixed(2)+'s" repeatCount="indefinite"/></g>';
  }
  if(id==='arcoiris'){
    // cinta arcoíris ondulada que corre hacia atrás
    ['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'].forEach(function(c,j){ var y=p[1]-7+j*2.3;
      s+='<path d="M'+p[0]+' '+y+' q-8 -3 -16 0 t-16 0 t-6 0" fill="none" stroke="'+c+'" stroke-width="2.4" stroke-linecap="round" opacity=".85" stroke-dasharray="8 3">'
        +(anim?'<animate attributeName="stroke-dashoffset" values="0;22" dur=".7s" repeatCount="indefinite"/>':'')+'</path>'; });
    return s;
  }
  if(id==='fuego'){
    var fr=['M'+p[0]+' '+(p[1]+8)+' q-9 -2 -16 -10 q6 2 8 -1 q-6 -3 -6 -10 q7 6 14 6 Z','M'+p[0]+' '+(p[1]+8)+' q-11 -1 -18 -8 q6 1 8 -3 q-7 -4 -5 -11 q6 7 15 7 Z','M'+p[0]+' '+(p[1]+8)+' q-8 -3 -14 -12 q6 3 8 0 q-5 -3 -7 -8 q8 5 13 5 Z'];
    return '<g transform="translate('+p[0]+' '+(p[1]+8)+') scale(1.6) translate('+(-p[0])+' '+(-p[1]-8)+')">'+_bAP(fr,'#ef4444',anim,.35,' opacity=".85"')+_bAP(fr,'#f97316',anim,.3,' transform="translate(.8 1.2) scale(.85)" transform-origin="'+p[0]+' '+(p[1]+8)+'"')+_bAP(fr,'#facc15',anim,.35,' transform="translate(1.5 2) scale(.6)" transform-origin="'+p[0]+' '+(p[1]+8)+'"')+'</g>';
  }
  for(i=0;i<n;i++){
    var dy=[-7,4,-2,8,-5,1,6,-8,3,-3][i%10], forma;
    if(id==='chispas') forma='<path d="M0 -1.8 L.5 -.5 L1.8 0 L.5 .5 L0 1.8 L-.5 .5 L-1.8 0 L-.5 -.5 Z" fill="'+(i%2?'#fde047':'#fb923c')+'"/>';
    else if(id==='hojas') forma='<path d="M-2 0 Q0 -1.8 2 0 Q0 1.8 -2 0 Z" fill="'+['#ea580c','#dc2626','#ca8a04'][i%3]+'"/><path d="M-2 0 L2 0" stroke="rgba(0,0,0,.25)" stroke-width=".3"/>';
    else if(id==='nieve') forma='<circle r="'+(i%3?.9:1.3)+'" fill="#fff"/>';
    else forma='<circle r="'+(1+(i%3)*.5)+'" fill="rgba(186,230,253,.25)" stroke="#bae6fd" stroke-width=".4"/><circle cx="-.4" cy="-.4" r=".3" fill="#fff"/>';
    var deriva=(id==='nieve'?5:(id==='hojas'?7:(id==='burbujas'?-9:-2)));
    s+=part(forma,deriva,dy,id==='hojas'?300:0,'',i);
  }
  return s;
}
/* ===== BANDERAS del banderín: rectángulo que flamea (ondulación de la tela) =====
   El asta va a la derecha (la bandera flamea hacia atrás), así que el cantón queda a la derecha. */
function _bBandera(id,mx,top,anim){
  var w=11, h=7, x=mx-w, t='';
  function franjasH(cols){ var k=cols.length, r=''; cols.forEach(function(c,i){ r+='<rect x="'+x+'" y="'+(top+i*h/k).toFixed(2)+'" width="'+w+'" height="'+(h/k+.05).toFixed(2)+'" fill="'+c+'"/>'; }); return r; }
  function franjasV(cols){ var k=cols.length, r=''; cols.forEach(function(c,i){ r+='<rect x="'+(x+i*w/k).toFixed(2)+'" y="'+top+'" width="'+(w/k+.05).toFixed(2)+'" height="'+h+'" fill="'+c+'"/>'; }); return r; }
  if(id==='chile') t='<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+h+'" fill="#d52b1e"/><rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+h/2+'" fill="#fff"/><rect x="'+(mx-4)+'" y="'+top+'" width="4" height="'+h/2+'" fill="#0039a6"/><path d="'+_lpStar(mx-2,top+h/4,1.1,.42)+'" fill="#fff"/>';
  else if(id==='argentina') t=franjasH(['#74acdf','#fff','#74acdf'])+'<circle cx="'+(x+w/2)+'" cy="'+(top+h/2)+'" r=".9" fill="#f6b40e"/>';
  else if(id==='peru') t=franjasV(['#d91023','#fff','#d91023']);
  else if(id==='bolivia') t=franjasH(['#d52b1e','#f9e300','#007934']);
  else if(id==='colombia') t='<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+h/2+'" fill="#fcd116"/><rect x="'+x+'" y="'+(top+h/2)+'" width="'+w+'" height="'+h/4+'" fill="#003893"/><rect x="'+x+'" y="'+(top+h*.75)+'" width="'+w+'" height="'+h/4+'" fill="#ce1126"/>';
  else if(id==='mexico') t=franjasV(['#ce1126','#fff','#006847'])+'<circle cx="'+(x+w/2)+'" cy="'+(top+h/2)+'" r=".9" fill="#8b5a2b"/>';
  else if(id==='uruguay') t=franjasH(['#fff','#0038a8','#fff','#0038a8','#fff','#0038a8','#fff','#0038a8','#fff'])+'<rect x="'+(mx-4)+'" y="'+top+'" width="4" height="'+(h*5/9).toFixed(2)+'" fill="#fff"/><circle cx="'+(mx-2)+'" cy="'+(top+h*5/18).toFixed(2)+'" r="1.1" fill="#fcd116"/>';
  else if(id==='espana') t='<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+h+'" fill="#aa151b"/><rect x="'+x+'" y="'+(top+h/4)+'" width="'+w+'" height="'+h/2+'" fill="#f1bf00"/>';
  else t=franjasH(['#e40303','#ff8c00','#ffed00','#008026','#004dff','#750787']);
  // ondulación: la tela se tuerce un poco (skewY) y una sombra de pliegue la cruza
  var pl='<path d="M'+(x+3)+' '+top+' l0 '+h+'" stroke="rgba(0,0,0,.18)" stroke-width="1.6"/><path d="M'+(x+7)+' '+top+' l0 '+h+'" stroke="rgba(255,255,255,.18)" stroke-width="1.2"/>';
  return '<g transform-origin="'+mx+' '+top+'">'+(anim?'<animateTransform attributeName="transform" type="skewY" values="0;-7;3;-4;0" dur=".9s" repeatCount="indefinite"/>':'')+t+pl
    +'<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+h+'" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".3"/></g>';
}

/* ===== MASCOTAS: perro (quiltro / negro) con orejas al viento y gato con cola que se mece =====
   p = centro del borde superior del canasto; mira hacia adelante (derecha). */
function _bMascota(id,p,anim){
  var t='<g transform="translate('+_bC(p)+') scale(1.3)">';
  if(id==='gato'){
    var c='#f59e0b', cs='#b45309';
    var cola=['M-3.4 -1 Q-8 -4 -6.4 -9.4','M-3.4 -1 Q-9 -6 -9 -10.4','M-3.4 -1 Q-7 -3 -4.6 -9'];
    t+=_bAP(cola,'none',anim,1.4,' stroke="'+c+'" stroke-width="1.8" stroke-linecap="round"');
    t+='<ellipse cx="-1.4" cy="0" rx="1.3" ry=".9" fill="'+c+'"/><ellipse cx="2.6" cy="0" rx="1.3" ry=".9" fill="'+c+'"/>'
      +'<ellipse cx="0" cy="-2.2" rx="3.4" ry="2.8" fill="'+cs+'"/><ellipse cx="-.3" cy="-2.6" rx="2.8" ry="2.2" fill="'+c+'"/>'
      +'<path d="M-.4 -8.4 L.2 -11.4 L2 -8.8 Z M3 -8.6 L4.8 -11 L5 -7.8 Z" fill="'+c+'" stroke="'+cs+'" stroke-width=".4" stroke-linejoin="round"/><path d="M.5 -9 L.6 -10.4 L1.4 -9.1 Z" fill="#fda4af"/>'
      +'<circle cx="2.2" cy="-6.2" r="3.3" fill="'+cs+'"/><circle cx="1.9" cy="-6.6" r="2.8" fill="'+c+'"/>'
      +'<path d="M.4 -8.6 l.6 1.4 M2 -9.3 l.2 1.4" stroke="'+cs+'" stroke-width=".55" stroke-linecap="round"/>'
      +'<ellipse cx="3.3" cy="-6.8" rx=".7" ry=".9" fill="#16a34a"/><ellipse cx="3.5" cy="-7" rx=".25" ry=".6" fill="#111827"/>'
      +'<path d="M5.1 -5.6 l.6 -.1 l-.3 .6 Z" fill="#f472b6"/><path d="M5.3 -5.2 l2.6 -.6 M5.3 -4.9 l2.6 .3 M5.2 -4.6 l2.2 1" stroke="#fff" stroke-width=".3" opacity=".9"/>';
  } else {
    var dc=id==='negro'?'#262b36':'#a0703c', dcs=id==='negro'?'#111827':'#6b4423', hoc=id==='negro'?'#4b5563':'#f1d9b5';
    t+='<ellipse cx="-1.6" cy="0" rx="1.4" ry="1" fill="'+dc+'"/><ellipse cx="2.6" cy="0" rx="1.4" ry="1" fill="'+dc+'"/>'
      +'<ellipse cx="0" cy="-2.4" rx="3.8" ry="3.1" fill="'+dcs+'"/><ellipse cx="-.4" cy="-2.9" rx="3.1" ry="2.4" fill="'+dc+'"/>'
      +'<path d="M-2.4 -4.4 Q.6 -3.2 3.6 -4.6" fill="none" stroke="#dc2626" stroke-width="1.1" stroke-linecap="round"/><circle cx="1" cy="-3.6" r=".7" fill="#facc15"/>'
      +'<circle cx="1.8" cy="-6.6" r="3.5" fill="'+dcs+'"/><circle cx="1.5" cy="-7" r="3" fill="'+dc+'"/>'
      +'<ellipse cx="4.9" cy="-5.8" rx="2.2" ry="1.6" fill="'+hoc+'"/><circle cx="6.8" cy="-6.2" r=".8" fill="#111827"/><circle cx="6.6" cy="-6.5" r=".25" fill="#fff"/>'
      +'<circle cx="3" cy="-7.8" r=".6" fill="#111827"/><circle cx="3.15" cy="-8" r=".2" fill="#fff"/>'
      +'<path d="M5 -4.5 q.3 2 1.3 .6 l-.2 -.6 Z" fill="#f472b6" stroke="#be185d" stroke-width=".25"/>';
    // oreja caída que flamea con el viento
    t+='<g><path d="M-.2 -9.2 Q-3.6 -10 -3.8 -6.2 Q-2.2 -6.6 .6 -7.6 Z" fill="'+dcs+'"/>'
      +(anim?'<animateTransform attributeName="transform" type="rotate" values="0 0 -9;-16 0 -9;6 0 -9;-10 0 -9;0 0 -9" dur=".6s" repeatCount="indefinite"/>':'')+'</g>';
  }
  return t+'</g>';
}

/* ===== HANDBIKE (inclusión, siempre gratis): se pedalea con los brazos =====
   Pistero va recostado entre las dos ruedas traseras, piernas estiradas en el apoyapiés,
   y las dos manos giran la biela delante del pecho (las dos manijas van juntas, como en
   una handbike real). Codos con articulación, torso que acompaña cada vuelta. */
function _pistHandbikeSVG(o,cfg,opts){
  var anim=cfg.pedal!==false, Y=_bPersona(o), B=_biciOpts(opts,'handbike');
  var col=o.biciCol||_lpColCasco(o.casco), osc=_lpShade(col,-.45), cla=_lpShade(col,.5);
  var TJ=_BICI_TRAJE[B.traje]||null; if(TJ&&TJ.pol){ Y.polera=TJ.pol; Y.poleraS=_lpShade(TJ.pol,-.3); }
  var dur=cfg.cadencia||1, N=16, s='', LUZ=' transform="translate(-.5 -.6)"';
  var rw=[36,88], rwL=[31.6,86.4], fw=[104,95], CR=[66,56], rc=6.5, HIP=[46,75], SH=[40,52], HEAD=[43.6,38];
  var Gr={r:15,tw:3}, Gf={r:8.6,tw:2.8};
  function somb(c){ return _lpShade(c,-.24); }
  // sombra + ruedas (la trasera lejana asoma)
  s+='<ellipse cx="68" cy="104.6" rx="48" ry="3.2" fill="rgba(0,0,0,.28)"/>';
  if(cfg.rapido) s+='<g stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"><path d="M2 66 L16 66"/><path d="M6 78 L22 78"/></g>';
  s+='<g opacity=".6">'+_biciRueda(rwL,Gr,'handbike',anim,dur*.6,col,B)+'</g>';
  // poses: la mano recorre el círculo de la biela; el torso acompaña
  var dmax=0,k; for(k=0;k<N;k++){ var th0=k*2*Math.PI/N, h0=[CR[0]+rc*Math.cos(th0),CR[1]+rc*Math.sin(th0)]; dmax=Math.max(dmax,Math.hypot(h0[0]-SH[0],h0[1]-SH[1])+1.4); }
  var La=dmax/2+.8, F=[];
  for(k=0;k<N;k++){
    var th=k*2*Math.PI/N, f={}, mv=Math.cos(th)*1.1, H=[CR[0]+rc*Math.cos(th),CR[1]+rc*Math.sin(th)];
    var sh=[SH[0]+mv,SH[1]+Math.sin(th)*.4], shF=[sh[0]-1.6,sh[1]+.6], HF=[H[0]-1.2,H[1]-.6];
    var par=function(key,A,Bp,ra,rm,rb,lado,t){ f[key]=_bLimb(A,Bp,ra,rm,rb,lado,t); f[key+'_i']=_bLimb(A,Bp,ra*.7,rm*.7,rb*.7,lado,t); };
    [['n',sh,H],['f',shF,HF]].forEach(function(pp){ var E=_bCodo(pp[1],pp[2],La); par(pp[0]+'bra',pp[1],E,3,2.9,2.4,1,.4); par(pp[0]+'ant',E,pp[2],2.5,2.5,2,1,.32); par(pp[0]+'man',pp[1],_bL(pp[1],E,.5),3.7,3.6,3.2,1,.5); f[pp[0]+'H']=_bC(pp[2]); });
    f.torso=_bLimb([HIP[0]-1,HIP[1]-2],sh,6.2,6.6,5.6,-1,.5); f.torso_i=_bLimb([HIP[0]-1,HIP[1]-2],sh,4.4,4.7,4,-1,.5);
    f.cuello=_bCap(sh,_bL(sh,[HEAD[0]+mv*.8,HEAD[1]],.35),2.6,2.5);
    f.head=_bC([mv*.8,Math.sin(th)*.5]); f.crank=(th*180/Math.PI).toFixed(1);
    F.push(f);
  }
  function col_(x){ return F.map(function(f){ return f[x]; }); }
  function vol(key,c){ return _bAP(col_(key),somb(c),anim,dur)+_bAP(col_(key+'_i'),c,anim,dur,LUZ); }
  function brazo(x){ var cp=x==='n'?Y.piel:Y.pielS, cpo=x==='n'?Y.polera:Y.poleraS;
    return vol(x+'bra',cp)+vol(x+'ant',cp)+vol(x+'man',cpo)
      +'<circle r="2.5" fill="'+(x==='n'?'#1f2937':'#111827')+'" cx="0" cy="0" transform="translate('+F[0][x+'H']+')">'+_bAT('translate',col_(x+'H'),anim,dur)+'</circle>'; }
  // brazo lejano detrás de todo
  s+=brazo('f');
  // cuadro: viga baja de la silla al tubo de dirección, horquilla, brazo de la biela
  var cuadro='M40 84 L92 80', tubDir='M93 70 L95.6 81', boom='M93.4 71 L'+_bP(CR);
  s+=_bEstela(B.estela,[rw[0]+2,rw[1]-5],anim);
  s+=_bTubo(cuadro,4.4,col,osc,cla)+_bTubo(tubDir,3.6,col,osc,cla)+_bTubo('M95.6 81 Q100 86 '+_bP(fw),2.4,osc,'#0b0f17',col)+_bTubo(boom,3.4,col,osc,cla);
  // cadena de la biela a la rueda delantera
  s+='<path d="M'+_bP([CR[0],CR[1]-5])+' L'+_bP([fw[0],fw[1]-2.6])+' M'+_bP([CR[0],CR[1]+5])+' L'+_bP([fw[0],fw[1]+2.6])+'" fill="none" stroke="#4b5563" stroke-width="1.1" stroke-dasharray="1.2 .7">'+(anim?'<animate attributeName="stroke-dashoffset" values="0;-3.8" dur="'+(dur/2)+'s" repeatCount="indefinite"/>':'')+'</path>';
  s+=_biciRueda(rw,Gr,'handbike',anim,dur*.6,col,B)+_biciRueda(fw,Gf,'handbike',anim,dur*.45,col,B);
  // asiento tipo butaca con respaldo reclinado
  s+='<path d="M38 82 Q36 70 33 57 L38.4 56 Q41.6 69 44 79 L56 79.4 Q57 83 54 84 L40 84.6 Z" fill="#1f2937" stroke="#0b0f17" stroke-width=".7" stroke-linejoin="round"/>'
    +'<path d="M35.6 60 Q37.6 70 40.2 80" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1.2" stroke-linecap="round"/>';
  // piernas estiradas en el apoyapiés (con correa)
  var pc=TJ?TJ.sh:'#1f2937', knee=[64,72.4], ank=[82.4,78.6];
  s+='<path d="'+_bLimb(HIP,knee,5,4.6,3.6,-1,.4)+'" fill="'+somb(pc)+'"/><path d="'+_bLimb(HIP,knee,3.5,3.2,2.5,-1,.4)+'" fill="'+pc+'"'+LUZ+'/>'
    +'<path d="'+_bLimb(knee,ank,3.6,3.4,2.6,1,.35)+'" fill="'+somb(pc)+'"/><path d="'+_bLimb(knee,ank,2.5,2.4,1.8,1,.35)+'" fill="'+pc+'"'+LUZ+'/>'
    +'<path d="M84 76 Q88 76 88.4 82 L83 83.4" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round"/>'
    +'<g transform="translate(84.6 79.4) rotate(-64)">'+_bZapato({zap:'#f8fafc',suela:'#94a3b8'},function(x){return x;},Y.piel)+'</g>'
    +'<path d="M82.6 77.4 l3.4 2.6" stroke="#111827" stroke-width="1.2" stroke-linecap="round"/>';
  // torso + cuello (se mecen con la biela)
  s+=_bAP(col_('torso'),somb(Y.polera),anim,dur)+_bAP(col_('torso_i'),Y.polera,anim,dur,LUZ)+_bAP(col_('cuello'),Y.pielS,anim,dur);
  // biela con manijas (gira) — delante del torso, detrás del brazo cercano
  s+='<g transform="rotate('+F[0].crank+' '+_bP(CR)+')">'+(anim?'<animateTransform attributeName="transform" type="rotate" from="0 '+_bP(CR)+'" to="360 '+_bP(CR)+'" dur="'+dur+'s" repeatCount="indefinite"/>':'')
    +'<circle cx="'+CR[0]+'" cy="'+CR[1]+'" r="5" fill="none" stroke="#6b7280" stroke-width="1.6" stroke-dasharray=".9 .7"/><path d="M'+_bP(CR)+' l'+rc+' 0" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>'
    +'<path d="'+_bCap([CR[0]+rc,CR[1]-1.6],[CR[0]+rc,CR[1]+1.6],1.4,1.4)+'" fill="#111827"/></g><circle cx="'+CR[0]+'" cy="'+CR[1]+'" r="1.4" fill="#111827"/>';
  s+=brazo('n');
  // banderín alto de seguridad (de serie en las handbike: van bajas y así las ven los autos)
  var mx=26, top=24;
  var fl=['M'+mx+' '+top+' Q'+(mx-5)+' '+(top+1)+' '+(mx-10)+' '+(top+3)+' L'+mx+' '+(top+6)+' Z','M'+mx+' '+top+' Q'+(mx-5)+' '+(top+3)+' '+(mx-10)+' '+(top+2)+' L'+mx+' '+(top+6)+' Z','M'+mx+' '+top+' Q'+(mx-5)+' '+(top-1)+' '+(mx-10)+' '+(top+4)+' L'+mx+' '+(top+6)+' Z'];
  s+='<path d="M36 88 L'+mx+' 84 M'+mx+' 84 L'+mx+' '+top+'" stroke="#e5e7eb" stroke-width=".8"/>'+(B.bandera?_bBandera(B.bandera,mx,top,anim):_bAP(fl,'#f97316',anim,.8));
  // cabeza
  var cab=_bCabeza(o,cfg.expr,HEAD,50), hv=col_('head');
  s+='<g transform="translate('+hv[0]+')">'+_bAT('translate',hv,anim,dur)+'<g transform="rotate(-6 '+_bP(HEAD)+')">'+cab+'</g></g>';
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
