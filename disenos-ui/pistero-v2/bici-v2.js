/* ===== LA BICI DE PISTERO v2 (2026-10-04, Inty: "la bici está genérica, mejórala") =====
   Reemplazo directo de pistero-bici.js (misma firma _pistBiciSVG(opts,cfg), mismo viewBox).
   Qué cambia respecto de v1:
   - Cada tipo es una bici de verdad, reconocible por su silueta Y sus piezas:
       ruta    → aro perfil alto, manubrio de ruta con manetas, caramagiola, ciclocomputador, postura aerodinámica
       mtb     → neumático con tacos, horquilla con suspensión, frenos de disco, tija telescópica, mochila de hidratación
       urbana  → cuadro abierto, canasto de mimbre, parrilla con reflectante, guardabarros, cubrecadena, luz, jeans y mochila
       bmx     → ruedas de rayos gruesos de color, manubrio alto con travesaño y protector, pegs, polerón
       playera → cuadro cruiser de doble tubo, neumáticos balón con banda blanca, manubrio ancho, timbre, asiento con resortes
   - Transmisión real: plato con dientes, cadena que corre, piñón y cambio trasero.
   - Pistero con cuerpo (no palitos): torso, brazos con codo, piernas con muslo y pantorrilla,
     calzado y ropa según la bici (calza + calcetín, short holgado, jeans, buzo, short de playa).
   - Contorno oscuro + brillo en el cuadro: se lee bien chico (sobrevuelo) y grande (tienda).
   Sin ids ni gradientes: varias bicis en la misma página no chocan. Animación SMIL, sin JS por frame. */

// catálogo (PIST_BICI / PIST_BICI_COL) en pistero-armario.js

// Geometría por tipo (viewBox 0 0 124 108). r = radio de rueda, tw = grosor de neumático.
// rw/fw ruedas · bb eje de pedalier · st unión tubo superior/sillín · ht/hb arriba/abajo del tubo de dirección
// sd centro del sillín · hip cadera · sh hombro · head centro de la cabeza (la mano sale del manubrio)
var _BICI_G={
  ruta:   {r:15.5,tw:2.6,rw:[30,88],fw:[94,88],bb:[60,90],st:[52,62],ht:[84,60],hb:[87,70],sd:[49,55.5],hip:[50,52],sh:[70,41],head:[76,27]},
  mtb:    {r:15.5,tw:4.4,rw:[30,88],fw:[94,88],bb:[60,91],st:[53,66],ht:[85,58],hb:[88,70],sd:[50,59.5],hip:[51,56],sh:[67,40],head:[71,26]},
  urbana: {r:15.5,tw:3.2,rw:[30,88],fw:[94,88],bb:[60,90],st:[50,62],ht:[84,56],hb:[87,68],sd:[47,55.5],hip:[48,52],sh:[56,33],head:[60,19]},
  bmx:    {r:12,  tw:3.8,rw:[36,92],fw:[88,92],bb:[60,93],st:[55,74],ht:[83,66],hb:[85,76],sd:[52,70.5],hip:[53,64],sh:[63,45],head:[66,31]},
  playera:{r:15.5,tw:5.4,rw:[30,88],fw:[95,88],bb:[58,90],st:[48,62],ht:[86,58],hb:[88,68],sd:[46,55.5],hip:[46,51],sh:[53,33],head:[57,19]}
};
// ropa por tipo: pierna (piernaHasta = hasta dónde cubre el muslo 0..1; 2 = pierna completa), calzado
var _BICI_ROPA={
  ruta:   {pierna:'#111827',hasta:.72,anchoP:0,calcetin:'#f8fafc',zap:'#f8fafc',suela:'#111827',extra:'franja'},
  mtb:    {pierna:'#3f4a3a',hasta:.92,anchoP:1.1,calcetin:'#1f2937',zap:'#374151',suela:'#111827',extra:'hidra'},
  urbana: {pierna:'#2f5592',hasta:2,anchoP:.4,calcetin:'',zap:'#f8fafc',suela:'#94a3b8',extra:'mochila'},
  bmx:    {pierna:'#1f2937',hasta:2,anchoP:.6,calcetin:'',zap:'#dc2626',suela:'#f8fafc',extra:'capucha'},
  playera:{pierna:'#0ea5e9',hasta:.62,anchoP:1.2,calcetin:'',zap:'',suela:'#7c5a2e',extra:'flores'}
};
function _bP(p){ return p[0].toFixed(1)+' '+p[1].toFixed(1); }
function _bL(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]; }
function _bAng(a,b){ return Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI; }
// articulación de dos segmentos iguales de largo L entre A y B; elegir(k1,k2) decide hacia dónde dobla
function _bIK(A,B,L,elegir){
  var dx=B[0]-A[0], dy=B[1]-A[1], d=Math.min(Math.sqrt(dx*dx+dy*dy),2*L-0.01), base=Math.atan2(dy,dx), a=Math.acos(d/(2*L));
  var k1=[A[0]+L*Math.cos(base-a),A[1]+L*Math.sin(base-a)], k2=[A[0]+L*Math.cos(base+a),A[1]+L*Math.sin(base+a)];
  return elegir(k1,k2);
}
// rodilla hacia adelante (se mantiene el nombre de v1)
function _biciRodilla(H,P,L){ return _bIK(H,P,L,function(a,b){ return a[0]>b[0]?a:b; }); }
// cápsula ahusada de A (radio ra) a B (radio rb): misma estructura siempre → se puede animar 'd'
function _bCap(A,B,ra,rb){
  var dx=B[0]-A[0], dy=B[1]-A[1], d=Math.sqrt(dx*dx+dy*dy)||1, nx=-dy/d, ny=dx/d;
  return 'M'+_bP([A[0]+nx*ra,A[1]+ny*ra])+' L'+_bP([B[0]+nx*rb,B[1]+ny*rb])+' A'+rb+' '+rb+' 0 0 0 '+_bP([B[0]-nx*rb,B[1]-ny*rb])
    +' L'+_bP([A[0]-nx*ra,A[1]-ny*ra])+' A'+ra+' '+ra+' 0 0 0 '+_bP([A[0]+nx*ra,A[1]+ny*ra])+' Z';
}
// arco de circunferencia (grados, 0 = derecha, 270 = arriba; crece en sentido horario)
function _bArc(c,R,a1,a2){
  function p(a){ a=a*Math.PI/180; return [c[0]+R*Math.cos(a),c[1]+R*Math.sin(a)]; }
  return 'M'+_bP(p(a1))+' A'+R+' '+R+' 0 '+((a2-a1)>180?1:0)+' 1 '+_bP(p(a2));
}
// tubo con contorno oscuro + color + brillo (se lee chico y grande)
function _bTubo(d,w,col,osc,cla){
  return '<path d="'+d+'" fill="none" stroke="'+osc+'" stroke-width="'+(w+1.5).toFixed(1)+'" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<path d="'+d+'" fill="none" stroke="'+cla+'" stroke-width="'+(w*.32).toFixed(2)+'" stroke-linecap="round" stroke-linejoin="round" opacity=".75" transform="translate(-.35 -.55)"/>';
}
function _biciRueda(c,G,tipo,anim,dur,col){
  var r=G.r, tw=G.tw, rr=r-tw/2, s='', sp='', i, a;
  s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="none" stroke="#151a23" stroke-width="'+tw+'"/>';
  if(tipo==='mtb') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r+tw/2).toFixed(1)+'" fill="none" stroke="#151a23" stroke-width="1.7" stroke-dasharray="1.4 1.2"/>';
  if(tipo==='bmx') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r+tw/2-.2).toFixed(1)+'" fill="none" stroke="#151a23" stroke-width="1.2" stroke-dasharray="1 1"/>';
  if(tipo==='playera') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr+1.1).toFixed(1)+'" fill="none" stroke="#f5ead4" stroke-width="1.5"/>';
  // aro
  if(tipo==='ruta') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr-2).toFixed(1)+'" fill="none" stroke="#1f2937" stroke-width="4"/>';
  else s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr-.8).toFixed(1)+'" fill="none" stroke="'+(tipo==='bmx'?col:'#cbd5e1')+'" stroke-width="1.5"/>';
  // rayos (giran) — BMX: 5 rayos gruesos de color; resto: 16 rayos cruzados finos
  var g='';
  if(tipo==='bmx'){
    for(i=0;i<5;i++){ a=i*2*Math.PI/5-Math.PI/2; g+='<path d="M'+_bP(c)+' L'+_bP([c[0]+Math.cos(a)*(rr-1.4),c[1]+Math.sin(a)*(rr-1.4)])+'" stroke="'+col+'" stroke-width="2.2" stroke-linecap="round"/>'; }
  } else {
    var ri=(tipo==='ruta'?rr-4:rr-1.5);
    for(i=0;i<16;i++){ a=i*Math.PI/8; var o=(i%2?.35:-.35);
      sp+='M'+_bP([c[0]+Math.cos(a+o)*1.6,c[1]+Math.sin(a+o)*1.6])+' L'+_bP([c[0]+Math.cos(a)*ri,c[1]+Math.sin(a)*ri])+' '; }
    g+='<path d="'+sp+'" stroke="#d6dde6" stroke-width=".45"/>';
    if(tipo==='ruta') g+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rr-2).toFixed(1)+'" fill="none" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="7 '+(2*Math.PI*(rr-2)/2-7).toFixed(1)+'"/>';
  }
  g+='<circle cx="'+(c[0]+rr-1.2).toFixed(1)+'" cy="'+c[1]+'" r=".7" fill="#9ca3af"/>';
  s+='<g>'+g+(anim?'<animateTransform attributeName="transform" type="rotate" from="0 '+c[0]+' '+c[1]+'" to="360 '+c[0]+' '+c[1]+'" dur="'+dur+'s" repeatCount="indefinite"/>':'')+'</g>';
  // disco de freno (MTB)
  if(tipo==='mtb') s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="4.4" fill="none" stroke="#b6bcc6" stroke-width="1.5"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="4.4" fill="none" stroke="#6b7280" stroke-width=".6" stroke-dasharray=".8 1.4"/>';
  s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(tipo==='bmx'?2.6:1.9)+'" fill="#6b7280" stroke="#374151" stroke-width=".6"/>';
  return s;
}
function _pistBiciSVG(opts, cfg){
  cfg=cfg||{}; var o=_pistNormal(opts), tipo=o.biciTipo||'ruta', G=_BICI_G[tipo]||_BICI_G.ruta, R=_BICI_ROPA[tipo]||_BICI_ROPA.ruta;
  var col=o.biciCol||_lpColCasco(o.casco), osc=_lpShade(col,-.45), cla=_lpShade(col,.5);
  var piel=(PIST_PIEL.find(function(p){return p.id===o.piel;})||PIST_PIEL[0]).c, pielS=_lpShade(piel,-.18);
  var polera=(o.cuello==='maillot'&&o.pano)?o.pano:(o.disenoCol&&o.disenoCol!=='#ffffff'?o.disenoCol:'#fc4c02'), poleraS=_lpShade(polera,-.3);
  var anim=cfg.pedal!==false, dur=cfg.cadencia||0.9, rc=7, s='';
  function A(attr,vals,d){ return anim?'<animate attributeName="'+attr+'" values="'+vals.join(';')+'" dur="'+(d||dur)+'s" repeatCount="indefinite"/>':''; }

  // ---- manubrio: define dónde va la mano ----
  var ht=G.ht, bar='', barExtra='', S, hand;
  if(tipo==='ruta'){ S=[ht[0]+4.5,ht[1]-2.6]; hand=[S[0]+4,S[1]-1.2];
    bar='M'+_bP(S)+' L'+_bP([S[0]+3.6,S[1]])+' Q'+_bP([S[0]+8,S[1]+.6])+' '+_bP([S[0]+7.2,S[1]+5])+' Q'+_bP([S[0]+6.4,S[1]+9.4])+' '+_bP([S[0]+2,S[1]+8.6]);
    barExtra='<path d="M'+_bP([S[0]+2.6,S[1]-.4])+' q1.6 -2.4 3.4 -.4 l-.4 1.6 Z" fill="#111827"/><path d="M'+_bP([S[0]+5.4,S[1]+.6])+' q1.6 3 .2 6" fill="none" stroke="#374151" stroke-width="1" stroke-linecap="round"/>'
      +'<rect x="'+(S[0]-1.6).toFixed(1)+'" y="'+(S[1]-2.6).toFixed(1)+'" width="3.4" height="2" rx=".5" fill="#111827" stroke="#64748b" stroke-width=".4"/>'; }
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

  // ---- sombra + líneas de velocidad ----
  var piso=G.rw[1]+G.r+2;
  s+='<ellipse cx="62" cy="'+piso+'" rx="46" ry="3.2" fill="rgba(0,0,0,.28)"/>';
  if(cfg.rapido) s+='<g stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"><path d="M2 58 L16 58"/><path d="M6 68 L22 68"/><path d="M0 78 L12 78"/></g>';

  // ---- piernas (8 cuadros por vuelta; la lejana desfasada media vuelta) ----
  var L=(Math.hypot(G.bb[0]-G.hip[0],G.bb[1]-G.hip[1])+rc)/2+.6, ap=R.anchoP;
  function pierna(fase, cerca){
    var F={mus:[],can:[],ropa:[],ropa2:[],cal:[],pie:[]}, k;
    for(k=0;k<=8;k++){
      var th=fase+k*Math.PI/4, P=[G.bb[0]+rc*Math.cos(th),G.bb[1]+rc*Math.sin(th)], K=_biciRodilla(G.hip,P,L), T=[P[0]-.4,P[1]-1.7];
      F.mus.push(_bCap(G.hip,K,4.4,3.3)); F.can.push(_bCap(K,T,3.2,2));
      if(R.hasta<=1) F.ropa.push(_bCap(G.hip,_bL(G.hip,K,R.hasta),4.6+ap,3.6+ap*.8));
      else { F.ropa.push(_bCap(G.hip,K,4.6+ap,3.5+ap*.5)); F.ropa2.push(_bCap(K,T,3.4+ap*.5,2.5+ap*.4)); }
      if(R.calcetin) F.cal.push(_bCap(_bL(K,T,.68),T,2.3,2.1));
      F.pie.push(_bP([P[0]+1.2,P[1]-.4]).replace(' ',','));
    }
    var sh=cerca?0:-.28, c=function(x){ return sh?_lpShade(x,sh):x; };
    var t='<path d="'+F.mus[0]+'" fill="'+c(piel)+'">'+A('d',F.mus)+'</path>'
      +'<path d="'+F.can[0]+'" fill="'+c(piel)+'">'+A('d',F.can)+'</path>'
      +'<path d="'+F.ropa[0]+'" fill="'+c(R.pierna)+'">'+A('d',F.ropa)+'</path>';
    if(F.ropa2.length) t+='<path d="'+F.ropa2[0]+'" fill="'+c(R.pierna)+'">'+A('d',F.ropa2)+'</path>';
    if(F.cal.length) t+='<path d="'+F.cal[0]+'" fill="'+c(R.calcetin)+'">'+A('d',F.cal)+'</path>';
    // calzado: zapatilla con suela; playera = sandalia (pie a la vista)
    var zap=R.zap?'<path d="M-3.4 -.4 Q-3.6 -3 -.6 -3.2 L2.8 -2.4 Q5.6 -1.6 5.2 .4 Z" fill="'+c(R.zap)+'" stroke="'+c(R.suela)+'" stroke-width=".5"/><path d="M-3.6 .5 L5.4 .5" stroke="'+c(R.suela)+'" stroke-width="1.3" stroke-linecap="round"/>'
      :'<path d="M-3 -.4 Q-3.2 -2.6 -.4 -2.8 L2.6 -2 Q5 -1.4 4.6 .2 Z" fill="'+c(piel)+'"/><path d="M-3.4 .6 L5 .6" stroke="'+c(R.suela)+'" stroke-width="1.1" stroke-linecap="round"/><path d="M.6 -2.6 L1.6 .2" stroke="'+c(R.suela)+'" stroke-width=".7"/>';
    t+='<g transform="translate('+F.pie[0]+')">'+zap+(anim?'<animateTransform attributeName="transform" type="translate" values="'+F.pie.join(';')+'" dur="'+dur+'s" repeatCount="indefinite"/>':'')+'</g>';
    return t;
  }
  s+=pierna(Math.PI,false);

  // ---- brazo lejano (detrás de todo) ----
  function brazo(cerca){
    var H=cerca?hand:[hand[0]-1.4,hand[1]-.8], Sh=cerca?G.sh:[G.sh[0]-1.6,G.sh[1]+.6], d=Math.hypot(H[0]-Sh[0],H[1]-Sh[1]), La=Math.max(d/2+1.4,11);
    var E=_bIK(Sh,H,La,function(a,b){ return a[1]>b[1]?a:b; }), cp=cerca?piel:pielS, cpo=cerca?polera:poleraS;
    return '<path d="'+_bCap(Sh,E,2.9,2.4)+'" fill="'+cp+'"/><path d="'+_bCap(E,H,2.4,2)+'" fill="'+cp+'"/>'
      +'<path d="'+_bCap(Sh,_bL(Sh,E,.55),3.6,3.1)+'" fill="'+cpo+'"/>'
      +'<circle cx="'+H[0].toFixed(1)+'" cy="'+H[1].toFixed(1)+'" r="2.4" fill="'+(cerca?'#1f2937':'#111827')+'"/>';
  }
  s+=brazo(false);

  // ---- guardabarros / parrilla (detrás de las ruedas) ----
  var rw=G.rw, fw=G.fw, bb=G.bb, st=G.st, hb=G.hb, sd=G.sd;
  if(tipo==='urbana'){
    var pr=[rw[0]-11,rw[1]-G.r-3.4], pf=[rw[0]+8,rw[1]-G.r-3.4];
    s+='<path d="M'+_bP(pr)+' L'+_bP(pf)+' M'+_bP([rw[0]-6,pr[1]])+' L'+_bP(rw)+' M'+_bP([rw[0]+4,pr[1]])+' L'+_bP(rw)+' M'+_bP(pf)+' L'+_bP([st[0]-1,st[1]+3])+'" fill="none" stroke="#475569" stroke-width="1.3" stroke-linecap="round"/>'
      +'<rect x="'+(pr[0]-1.6).toFixed(1)+'" y="'+(pr[1]-.4).toFixed(1)+'" width="2.6" height="3" rx=".6" fill="#ef4444" stroke="#991b1b" stroke-width=".4"/>';
  }

  // ---- ruedas ----
  s+=_biciRueda(rw,G,tipo,anim,dur*.75,col)+_biciRueda(fw,G,tipo,anim,dur*.75,col);
  if(tipo==='bmx') s+='<path d="'+_bCap([rw[0]-3,rw[1]],[rw[0]+3,rw[1]],1.5,1.5)+'" fill="#cbd5e1" stroke="#64748b" stroke-width=".5"/><path d="'+_bCap([fw[0]-3,fw[1]],[fw[0]+3,fw[1]],1.5,1.5)+'" fill="#cbd5e1" stroke="#64748b" stroke-width=".5"/>';
  if(tipo==='urbana'||tipo==='playera'){
    var fc=tipo==='playera'?col:'#1f2937', fco=tipo==='playera'?osc:'#0b0f17';
    s+=_bTubo(_bArc(rw,G.r+G.tw/2+1.6,170,320),1.8,fc,fco,tipo==='playera'?cla:'#475569')+_bTubo(_bArc(fw,G.r+G.tw/2+1.6,215,365),1.8,fc,fco,tipo==='playera'?cla:'#475569');
  }

  // ---- transmisión: cadena, piñón, cambio ----
  var conCambio=(tipo==='ruta'||tipo==='mtb'), plato=(tipo==='bmx'?5:6), pin=(tipo==='bmx'?2.4:3.2);
  s+='<circle cx="'+rw[0]+'" cy="'+rw[1]+'" r="'+pin+'" fill="none" stroke="#9ca3af" stroke-width="1.6"/>';
  var abajo=conCambio?[rw[0]+1.4,rw[1]+7.4]:[rw[0],rw[1]+pin];
  var cad='M'+_bP([bb[0],bb[1]-plato])+' L'+_bP([rw[0],rw[1]-pin])+' M'+_bP([bb[0],bb[1]+plato])+' L'+_bP(abajo);
  s+='<path d="'+cad+'" fill="none" stroke="#4b5563" stroke-width="1.15" stroke-dasharray="1.2 .7">'+A('stroke-dashoffset',['0','-3.8'],dur/2)+'</path>';
  if(conCambio) s+='<path d="M'+_bP(rw)+' L'+_bP([rw[0]+2.2,rw[1]+3.4])+' L'+_bP(abajo)+'" fill="none" stroke="#374151" stroke-width="1.4" stroke-linecap="round"/><circle cx="'+(rw[0]+2.2)+'" cy="'+(rw[1]+3.4)+'" r="1.1" fill="#9ca3af"/><circle cx="'+abajo[0]+'" cy="'+abajo[1]+'" r="1.1" fill="#9ca3af"/>';

  // ---- cuadro ----
  var ss=_bL(st,bb,.08), tubos=[], w;
  if(tipo==='ruta') tubos=[['M'+_bP(st)+' L'+_bP(G.ht),2.8],['M'+_bP(hb)+' L'+_bP(bb),3.8],['M'+_bP(bb)+' L'+_bP(st),3],['M'+_bP(bb)+' L'+_bP(rw),2.2],['M'+_bP(ss)+' L'+_bP(rw),1.9]];
  else if(tipo==='mtb') tubos=[['M'+_bP(st)+' L'+_bP(G.ht),3.4],['M'+_bP(hb)+' L'+_bP(bb),4.6],['M'+_bP(bb)+' L'+_bP(st),3.4],['M'+_bP(bb)+' L'+_bP(rw),2.6],['M'+_bP(ss)+' L'+_bP(rw),2.2]];
  else if(tipo==='urbana') tubos=[['M'+_bP(hb)+' Q'+_bP([66,91])+' '+_bP([bb[0]+1.5,bb[1]-1.5]),3.8],['M'+_bP(G.ht)+' Q'+_bP([64,68])+' '+_bP(_bL(st,bb,.5)),2.6],['M'+_bP(bb)+' L'+_bP(st),3.2],['M'+_bP(bb)+' L'+_bP(rw),2.4],['M'+_bP(ss)+' L'+_bP(rw),2.2]];
  else if(tipo==='bmx') tubos=[['M'+_bP(st)+' L'+_bP(G.ht),4.2],['M'+_bP(hb)+' L'+_bP(bb),4.6],['M'+_bP(bb)+' L'+_bP(st),3.8],['M'+_bP(bb)+' L'+_bP(rw),3],['M'+_bP(st)+' L'+_bP(rw),2.6]];
  else tubos=[['M'+_bP(G.ht)+' Q'+_bP([70,60])+' '+_bP([55,70])+' Q'+_bP([51,74])+' '+_bP([bb[0]-1,bb[1]-2]),3.6],['M'+_bP(hb)+' Q'+_bP([72,78])+' '+_bP([bb[0]+1,bb[1]-1]),3.6],['M'+_bP(bb)+' L'+_bP(st),3.4],['M'+_bP(bb)+' L'+_bP(rw),2.6],['M'+_bP(ss)+' L'+_bP(rw),2.6]];
  // contorno de todos primero, luego color y brillo → uniones limpias
  tubos.forEach(function(t){ s+='<path d="'+t[0]+'" fill="none" stroke="'+osc+'" stroke-width="'+(t[1]+1.5).toFixed(1)+'" stroke-linecap="round" stroke-linejoin="round"/>'; });
  tubos.forEach(function(t){ s+='<path d="'+t[0]+'" fill="none" stroke="'+col+'" stroke-width="'+t[1]+'" stroke-linecap="round" stroke-linejoin="round"/>'; });
  tubos.forEach(function(t){ s+='<path d="'+t[0]+'" fill="none" stroke="'+cla+'" stroke-width="'+(t[1]*.32).toFixed(2)+'" stroke-linecap="round" opacity=".75" transform="translate(-.35 -.55)"/>'; });
  // calcomanía en el tubo diagonal (ruta/mtb/bmx)
  if(tipo==='ruta'||tipo==='mtb'||tipo==='bmx'){ var w0=tubos[1][1];
    s+='<path d="M'+_bP(_bL(hb,bb,.14))+' L'+_bP(_bL(hb,bb,.28))+'" stroke="#f8fafc" stroke-width="'+(w0-1.4).toFixed(1)+'" stroke-linecap="butt"/>'
      +'<path d="M'+_bP(_bL(hb,bb,.31))+' L'+_bP(_bL(hb,bb,.34))+'" stroke="#f8fafc" stroke-width="'+(w0-1.4).toFixed(1)+'" stroke-linecap="butt" opacity=".85"/>'; }
  // caramagiola (ruta/mtb)
  if(tipo==='ruta'||tipo==='mtb'){ var bc=_bL(hb,bb,.54), ba=_bAng(hb,bb);
    s+='<g transform="translate('+_bP(bc).replace(' ',',')+') rotate('+(ba+180).toFixed(1)+')"><rect x="-4.6" y="-4.6" width="9.2" height="3.4" rx="1.4" fill="#e2e8f0" stroke="#64748b" stroke-width=".5"/><rect x="4.2" y="-4" width="1.6" height="2.2" rx=".4" fill="'+col+'"/><path d="M-1.6 -4.6 L-1.6 -1.2" stroke="#64748b" stroke-width=".6"/></g>'; }
  // cubrecadena (urbana)
  if(tipo==='urbana') s+='<path d="M'+_bP([bb[0]+3,bb[1]-7])+' L'+_bP([rw[0]+4,rw[1]-4.6])+' Q'+_bP([rw[0]+1,rw[1]-4.6])+' '+_bP([rw[0]+2,rw[1]-1])+' L'+_bP([bb[0]+2,bb[1]-1])+' Z" fill="#1f2937" stroke="#0b0f17" stroke-width=".5"/>';
  // tubo de dirección + horquilla
  s+=_bTubo('M'+_bP(G.ht)+' L'+_bP(hb),3.6,col,osc,cla)+'<path d="M'+_bP([G.ht[0]-.4,G.ht[1]-1.4])+' L'+_bP([G.ht[0]+.2,G.ht[1]+.6])+'" stroke="#111827" stroke-width="4.4" stroke-linecap="round"/>';
  if(tipo==='mtb'){ var mid=_bL(hb,fw,.45);
    s+='<path d="M'+_bP(hb)+' L'+_bP(_bL(hb,fw,.55))+'" stroke="#e5e7eb" stroke-width="2.6" stroke-linecap="round"/><path d="M'+_bP(mid)+' L'+_bP(fw)+'" stroke="#111827" stroke-width="4.2" stroke-linecap="round"/>'
      +'<path d="'+_bCap([hb[0]-2.4,hb[1]+.4],[hb[0]+2.6,hb[1]+1],1.6,1.6)+'" fill="#111827"/>'; }
  else s+=_bTubo('M'+_bP(hb)+' Q'+_bP([hb[0]+(tipo==='ruta'?5:4),(hb[1]+fw[1])/2+2])+' '+_bP(fw),tipo==='bmx'?3:2.3,tipo==='playera'?col:osc,'#0b0f17',tipo==='playera'?cla:col);

  // ---- tija + sillín ----
  var conResorte=(tipo==='playera');
  s+='<path d="M'+_bP(st)+' L'+_bP([sd[0]+.6,sd[1]+(conResorte?3.4:1.4)])+'" stroke="'+(tipo==='mtb'?'#111827':'#9ca3af')+'" stroke-width="2.2" stroke-linecap="round"/>';
  if(tipo==='mtb') s+='<path d="M'+_bP(_bL(st,sd,.5))+' L'+_bP(_bL(st,sd,.62))+'" stroke="#cbd5e1" stroke-width="2.4"/>';
  if(conResorte) s+='<path d="M'+_bP([sd[0]-3,sd[1]+1.6])+' l0 2.4 M'+_bP([sd[0]+3.6,sd[1]+1.6])+' l0 2.4" stroke="#9ca3af" stroke-width="1.4" stroke-dasharray=".6 .5"/>';
  if(tipo==='ruta'||tipo==='mtb') s+='<path d="M'+_bP([sd[0]-6,sd[1]-.2])+' Q'+_bP([sd[0]-6.4,sd[1]-2.6])+' '+_bP([sd[0]-2,sd[1]-2.4])+' L'+_bP([sd[0]+7,sd[1]-1.2])+' Q'+_bP([sd[0]+8.2,sd[1]-.2])+' '+_bP([sd[0]+6.4,sd[1]+.6])+' Z" fill="#111827" stroke="#334155" stroke-width=".4"/>';
  else s+='<path d="M'+_bP([sd[0]-5.6,sd[1]+1.6])+' Q'+_bP([sd[0]-6.6,sd[1]-2.8])+' '+_bP([sd[0]-1,sd[1]-2.6])+' L'+_bP([sd[0]+5.4,sd[1]-1.6])+' Q'+_bP([sd[0]+6.6,sd[1]+.4])+' '+_bP([sd[0]+4,sd[1]+1.6])+' Z" fill="'+(tipo==='playera'?'#7c5a2e':'#1f2937')+'" stroke="#0b0f17" stroke-width=".5"/>';

  // ---- manubrio ----
  s+='<path d="M'+_bP(G.ht)+' L'+_bP(S)+'" stroke="#374151" stroke-width="2.4" stroke-linecap="round"/>';
  s+='<path d="'+bar+'" fill="none" stroke="'+(tipo==='bmx'?'#cbd5e1':'#1f2937')+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'+barExtra;
  // canasto de mimbre + luz (urbana)
  if(tipo==='urbana'){ var bx=G.ht[0]+2.4, by=G.ht[1]-7.6;
    s+='<path d="M'+bx+' '+by+' l12 0 l-1.6 9.4 l-8.8 0 Z" fill="#c08a4d" stroke="#7c5a2e" stroke-width=".8" stroke-linejoin="round"/>'
      +'<path d="M'+(bx+.6)+' '+(by+3)+' l10.8 0 M'+(bx+1.1)+' '+(by+6)+' l9.8 0 M'+(bx+4)+' '+by+' l.2 9.4 M'+(bx+8)+' '+by+' l-.3 9.4" stroke="#7c5a2e" stroke-width=".55"/>'
      +'<path d="M'+(bx-.8)+' '+(by+.2)+' l13.6 0" stroke="#7c5a2e" stroke-width="1.3" stroke-linecap="round"/>'
      +'<path d="M'+(bx+3)+' '+(by+10.6)+' l4.4 0 l1 2.4 l-6.4 0 Z" fill="#fde68a" stroke="#a16207" stroke-width=".5"/>'; }

  // ---- bielas + plato (el plato con dientes gira con las bielas) ----
  var biela='<g><circle cx="'+bb[0]+'" cy="'+bb[1]+'" r="'+plato+'" fill="none" stroke="#6b7280" stroke-width="1.7" stroke-dasharray=".9 .7"/><circle cx="'+bb[0]+'" cy="'+bb[1]+'" r="'+(plato-1.6)+'" fill="none" stroke="#9ca3af" stroke-width="1.1"/>'
    +'<path d="M'+_bP(bb)+' l'+rc+' 0 M'+_bP(bb)+' l-'+rc+' 0" stroke="#374151" stroke-width="2" stroke-linecap="round"/>'
    +(anim?'<animateTransform attributeName="transform" type="rotate" from="0 '+bb[0]+' '+bb[1]+'" to="360 '+bb[0]+' '+bb[1]+'" dur="'+dur+'s" repeatCount="indefinite"/>':'')+'</g><circle cx="'+bb[0]+'" cy="'+bb[1]+'" r="1.4" fill="#111827"/>';
  s+=biela;

  // ---- torso + accesorio de espalda ----
  var hip=G.hip, shp=G.sh, ta=_bAng(hip,shp), td=Math.hypot(shp[0]-hip[0],shp[1]-hip[1]), bn=[(shp[1]-hip[1])/td,-(shp[0]-hip[0])/td]; // bn = normal hacia la espalda
  if(R.extra==='mochila'||R.extra==='hidra'){ var m=_bL(hip,shp,R.extra==='hidra'?.6:.55), mo=R.extra==='hidra'?4.6:5.6, mc=[m[0]+bn[0]*mo,m[1]+bn[1]*mo];
    s+='<g transform="translate('+_bP(mc).replace(' ',',')+') rotate('+ta.toFixed(1)+')">'+(R.extra==='hidra'
      ?'<rect x="-5.4" y="-3" width="10.8" height="6" rx="2.6" fill="#334155" stroke="#0f172a" stroke-width=".6"/><path d="M-3 0 L3 0" stroke="#f97316" stroke-width="1"/>'
      :'<rect x="-6.8" y="-4" width="13.6" height="8" rx="2.6" fill="'+osc+'" stroke="#0b0f17" stroke-width=".6"/><rect x="-4" y="-5.2" width="6" height="2.6" rx="1" fill="'+col+'" stroke="#0b0f17" stroke-width=".5"/>')+'</g>'; }
  s+='<path d="'+_bCap(hip,shp,6.3,5.6)+'" fill="'+polera+'"/>';
  s+='<path d="M'+_bP([hip[0]+bn[0]*4.4,hip[1]+bn[1]*4.4])+' L'+_bP([shp[0]+bn[0]*3.8,shp[1]+bn[1]*3.8])+'" stroke="rgba(255,255,255,.22)" stroke-width="2.2" stroke-linecap="round"/>';
  if(R.extra==='franja') s+='<path d="M'+_bP(_bL(hip,shp,.12))+' L'+_bP(_bL(shp,hip,.1))+'" stroke="#f8fafc" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>'
    +'<path d="'+_bCap([hip[0]+bn[0]*4.6,hip[1]+bn[1]*4.6],[hip[0]+bn[0]*4.6+(shp[0]-hip[0])*.25,hip[1]+bn[1]*4.6+(shp[1]-hip[1])*.25],1.6,1.4)+'" fill="'+poleraS+'"/>';
  if(R.extra==='mochila'||R.extra==='hidra') s+='<path d="M'+_bP([shp[0]+bn[0]*2,shp[1]+bn[1]*2-1])+' Q'+_bP(_bL(hip,shp,.6))+' '+_bP([hip[0]+(shp[0]-hip[0])*.25,hip[1]+(shp[1]-hip[1])*.25+1.6])+'" fill="none" stroke="'+(R.extra==='hidra'?'#0f172a':osc)+'" stroke-width="1.3" stroke-linecap="round"/>';
  if(R.extra==='capucha') s+='<path d="'+_bCap([shp[0]+bn[0]*3.6,shp[1]+bn[1]*3.6],[shp[0]+bn[0]*4.4-(shp[0]-hip[0])*.28,shp[1]+bn[1]*4.4-(shp[1]-hip[1])*.28],3.2,2.6)+'" fill="'+poleraS+'"/>'
    +'<path d="M'+_bP(_bL(hip,shp,.82))+' l1.2 4" stroke="#f8fafc" stroke-width=".7" stroke-linecap="round"/>';
  if(R.extra==='flores'){ [[.3,-2],[.55,1.8],[.78,-1.2],[.45,-3.6]].forEach(function(f){ var p=_bL(hip,shp,f[0]); p=[p[0]+bn[0]*f[1],p[1]+bn[1]*f[1]];
    s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="1.3" fill="#fef3c7" opacity=".9"/><circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r=".5" fill="#f59e0b"/>'; }); }
  // cuello
  s+='<path d="'+_bCap(shp,_bL(shp,G.head,.35),2.6,2.6)+'" fill="'+pielS+'"/>';

  // ---- pierna y brazo cercanos ----
  s+=pierna(0,true);
  s+=brazo(true);

  // ---- cabeza: el Pistero del usuario, con el gesto pedido (inclinada según la postura) ----
  var hw=52, inc={ruta:10,mtb:6,urbana:0,bmx:4,playera:-3}[tipo]||0;
  var cabeza=_pistoDe(o,cfg.expr||'feliz').replace('<svg viewBox="0 0 100 84"','<svg x="'+(G.head[0]-hw/2)+'" y="'+(G.head[1]-hw*0.6)+'" width="'+hw+'" height="'+(hw*0.84).toFixed(1)+'" viewBox="0 0 100 84"');
  s+=inc?'<g transform="rotate('+inc+' '+_bP(G.head)+')">'+cabeza+'</g>':cabeza;
  return '<svg viewBox="-4 -14 132 124" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}
