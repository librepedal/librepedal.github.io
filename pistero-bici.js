/* ===== LA BICI DE PISTERO (2026-10-04, pedido de Inty: "Pistero no puede no tener bici") =====
   Pistero de lado, montado en SU bici y pedaleando de verdad: piernas con rodilla
   (cinemática inversa simple), bielas y ruedas girando sincronizadas (SMIL, sin JS por
   frame). La cabeza es el MISMO Pistero que arma el usuario (_pistoDe), con el gesto
   que se pida. Tipos de bici y color se eligen en la pestaña "Bici" de la tienda.
   Lo usa el sobrevuelo (sobrevuelo-viaje.js) y la tienda (pistero-tienda.js). */

// catálogo (PIST_BICI / PIST_BICI_COL) en pistero-armario.js

// Geometría por tipo (viewBox 0 0 124 108). r = radio de rueda.
var _BICI_G={
  ruta:   {r:15,rw:[30,88],fw:[94,88],bb:[60,90],st:[52,60],ht:[86,59],hb:[88,69],sd:[46,57],hip:[52,54],sh:[68,39],hand:[92,58],head:[72,25]},
  mtb:    {r:15,rw:[30,88],fw:[94,88],bb:[60,90],st:[54,64],ht:[86,60],hb:[89,71],sd:[48,61],hip:[54,58],sh:[68,41],hand:[93,54],head:[71,26]},
  urbana: {r:15,rw:[30,88],fw:[94,88],bb:[60,90],st:[50,60],ht:[86,58],hb:[88,68],sd:[44,57],hip:[50,54],sh:[60,35],hand:[82,48],head:[62,21]},
  bmx:    {r:12,rw:[36,92],fw:[88,92],bb:[60,92],st:[54,70],ht:[84,64],hb:[85,72],sd:[48,67],hip:[54,64],sh:[66,44],hand:[86,48],head:[68,29]},
  playera:{r:15,rw:[30,88],fw:[94,88],bb:[60,90],st:[50,60],ht:[86,58],hb:[88,68],sd:[44,57],hip:[49,54],sh:[59,35],hand:[77,47],head:[61,21]}
};
function _bP(p){ return p[0].toFixed(1)+' '+p[1].toFixed(1); }
// rodilla para cadera H, pedal P, largo de muslo/canilla L (rodilla hacia adelante)
function _biciRodilla(H,P,L){
  var dx=P[0]-H[0], dy=P[1]-H[1], d=Math.min(Math.sqrt(dx*dx+dy*dy),2*L-0.01), base=Math.atan2(dy,dx), a=Math.acos(d/(2*L));
  var k1=[H[0]+L*Math.cos(base-a),H[1]+L*Math.sin(base-a)], k2=[H[0]+L*Math.cos(base+a),H[1]+L*Math.sin(base+a)];
  return k1[0]>k2[0]?k1:k2;
}
function _biciRueda(c,r,tipo,anim,dur){
  var ancho=(tipo==='mtb'||tipo==='playera')?5:(tipo==='bmx'?4.2:3), sp='';
  for(var i=0;i<6;i++){ var a=i*Math.PI/6; sp+='M'+_bP([c[0]-Math.cos(a)*(r-3),c[1]-Math.sin(a)*(r-3)])+' L'+_bP([c[0]+Math.cos(a)*(r-3),c[1]+Math.sin(a)*(r-3)])+' '; }
  return '<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="none" stroke="#111827" stroke-width="'+ancho+'"'+(tipo==='mtb'?' stroke-dasharray="2.2 1.4"':'')+'/>'
    +(tipo==='mtb'?'<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="none" stroke="#1f2937" stroke-width="3.4"/>':'')
    +'<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(r-2.4)+'" fill="none" stroke="#9ca3af" stroke-width="1"/>'
    +'<g><path d="'+sp+'" stroke="#cbd5e1" stroke-width=".55"/>'+(anim?'<animateTransform attributeName="transform" type="rotate" from="0 '+c[0]+' '+c[1]+'" to="360 '+c[0]+' '+c[1]+'" dur="'+dur+'s" repeatCount="indefinite"/>':'')+'</g>'
    +'<circle cx="'+c[0]+'" cy="'+c[1]+'" r="1.6" fill="#4b5563"/>';
}
function _pistBiciSVG(opts, cfg){
  cfg=cfg||{}; var o=_pistNormal(opts), tipo=o.biciTipo||'ruta', G=_BICI_G[tipo]||_BICI_G.ruta;
  var col=o.biciCol||_lpColCasco(o.casco), oscuro=_lpShade(col,-.35), claro=_lpShade(col,.45);
  var piel=(PIST_PIEL.find(function(p){return p.id===o.piel;})||PIST_PIEL[0]).c;
  var polera=(o.cuello==='maillot'&&o.pano)?o.pano:(o.disenoCol&&o.disenoCol!=='#ffffff'?o.disenoCol:'#fc4c02'), short='#111827';
  var anim=cfg.pedal!==false, dur=cfg.cadencia||0.9, rc=7, s='';
  // sombra en el piso + líneas de velocidad
  s+='<ellipse cx="62" cy="'+(G.rw[1]+G.r+2)+'" rx="44" ry="3.2" fill="rgba(0,0,0,.28)"/>';
  if(cfg.rapido) s+='<g stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"><path d="M2 60 L16 60"/><path d="M6 70 L22 70"/><path d="M0 80 L12 80"/></g>';
  // piernas: cuadros clave de la pedalada (8 por vuelta), pierna lejana desfasada media vuelta
  var L=(Math.hypot(G.bb[0]-G.hip[0],G.bb[1]-G.hip[1])+rc)/2+.6;
  function pierna(fase, cerca){
    var mus=[], can=[], pies=[];
    for(var k=0;k<=8;k++){ var th=fase+k*Math.PI/4, P=[G.bb[0]+rc*Math.cos(th),G.bb[1]+rc*Math.sin(th)], K=_biciRodilla(G.hip,P,L);
      mus.push('M'+_bP(G.hip)+' L'+_bP(K)); can.push('M'+_bP(K)+' L'+_bP(P)); pies.push(_bP([P[0]+1.5,P[1]])); }
    var f=cerca?1:.72, cs=cerca?short:_lpShade(short,.15), cp=cerca?piel:_lpShade(piel,-.25);
    function A(attr,vals){ return anim?'<animate attributeName="'+attr+'" values="'+vals.join(';')+'" dur="'+dur+'s" repeatCount="indefinite"/>':''; }
    return '<path d="'+mus[0]+'" stroke="'+cs+'" stroke-width="'+(6.5*f+1)+'" stroke-linecap="round">'+A('d',mus)+'</path>'
      +'<path d="'+can[0]+'" stroke="'+cp+'" stroke-width="'+(4.6*f+.6)+'" stroke-linecap="round">'+A('d',can)+'</path>'
      +'<ellipse cx="0" cy="0" rx="3.6" ry="1.9" fill="'+(cerca?'#f8fafc':'#cbd5e1')+'" stroke="#334155" stroke-width=".5" transform="translate('+pies[0].replace(' ',',')+')">'+(anim?'<animateTransform attributeName="transform" type="translate" values="'+pies.map(function(p){return p.replace(' ',',');}).join(';')+'" dur="'+dur+'s" repeatCount="indefinite"/>':'')+'</ellipse>';
  }
  s+=pierna(Math.PI,false);
  s+=_biciRueda(G.rw,G.r,tipo,anim,dur*.75)+_biciRueda(G.fw,G.r,tipo,anim,dur*.75);
  // guardabarros (urbana/playera)
  if(tipo==='urbana'||tipo==='playera'){ s+='<path d="M'+(G.rw[0]-G.r-1)+' '+(G.rw[1]-2)+' A'+(G.r+3)+' '+(G.r+3)+' 0 0 1 '+(G.rw[0]+G.r-2)+' '+(G.rw[1]-8)+'" fill="none" stroke="'+oscuro+'" stroke-width="2.4"/><path d="M'+(G.fw[0]-G.r+3)+' '+(G.fw[1]-9)+' A'+(G.r+3)+' '+(G.r+3)+' 0 0 1 '+(G.fw[0]+G.r+1)+' '+(G.fw[1]-2)+'" fill="none" stroke="'+oscuro+'" stroke-width="2.4"/>'; }
  // cuadro
  var w=(tipo==='mtb'||tipo==='bmx')?4.2:(tipo==='ruta'?3:3.6), cuadro;
  if(tipo==='urbana') cuadro='M'+_bP(G.hb)+' Q66 92 '+_bP(G.bb)+' M'+_bP(G.st)+' L'+_bP(G.bb)+' L'+_bP(G.rw)+' L'+_bP(G.st);
  else if(tipo==='playera') cuadro='M'+_bP(G.ht)+' Q70 62 54 66 Q48 70 '+_bP(G.bb)+' M'+_bP(G.hb)+' Q72 78 '+_bP(G.bb)+' M'+_bP(G.st)+' L'+_bP(G.bb)+' L'+_bP(G.rw)+' L'+_bP(G.st);
  else cuadro='M'+_bP(G.st)+' L'+_bP(G.ht)+' L'+_bP(G.hb)+' L'+_bP(G.bb)+' Z M'+_bP(G.bb)+' L'+_bP(G.rw)+' L'+_bP(G.st);
  s+='<path d="'+cuadro+'" fill="none" stroke="'+col+'" stroke-width="'+w+'" stroke-linejoin="round" stroke-linecap="round"/>';
  s+='<path d="'+cuadro+'" fill="none" stroke="'+claro+'" stroke-width="'+(w*.3)+'" stroke-linejoin="round" stroke-linecap="round" opacity=".7" transform="translate(-.5 -.7)"/>';
  // horquilla (doble en MTB = suspensión)
  s+='<path d="M'+_bP(G.ht)+' L'+_bP(G.fw)+'" stroke="'+(tipo==='mtb'?'#374151':oscuro)+'" stroke-width="'+(tipo==='mtb'?4.4:2.8)+'" stroke-linecap="round"/>';
  if(tipo==='mtb') s+='<path d="M'+_bP([G.ht[0]+2.2,G.ht[1]+9])+' L'+_bP([G.fw[0]-.8,G.fw[1]-6])+'" stroke="#e5e7eb" stroke-width="1.6" stroke-linecap="round"/>';
  if(tipo==='bmx') s+='<circle cx="'+G.rw[0]+'" cy="'+G.rw[1]+'" r="2.4" fill="#9ca3af"/><circle cx="'+G.fw[0]+'" cy="'+G.fw[1]+'" r="2.4" fill="#9ca3af"/>';
  // manubrio según tipo
  var bar;
  if(tipo==='ruta') bar='M'+_bP(G.ht)+' L'+_bP([G.ht[0]+4,G.ht[1]-3])+' Q'+_bP([G.ht[0]+11,G.ht[1]-3])+' '+_bP([G.ht[0]+9,G.ht[1]+3])+' Q'+_bP([G.ht[0]+8,G.ht[1]+7])+' '+_bP([G.ht[0]+4,G.ht[1]+6]);
  else if(tipo==='mtb') bar='M'+_bP(G.ht)+' L'+_bP([G.ht[0]+3,G.ht[1]-6])+' M'+_bP([G.ht[0]-3,G.ht[1]-6])+' L'+_bP([G.ht[0]+10,G.ht[1]-6]);
  else if(tipo==='bmx') bar='M'+_bP(G.ht)+' L'+_bP([G.ht[0]+1,G.ht[1]-16])+' M'+_bP([G.ht[0]-4,G.ht[1]-16])+' L'+_bP([G.ht[0]+6,G.ht[1]-16])+' M'+_bP([G.ht[0]-2,G.ht[1]-8])+' L'+_bP([G.ht[0]+4,G.ht[1]-8]);
  else bar='M'+_bP(G.ht)+' L'+_bP([G.ht[0]+1,G.ht[1]-8])+' Q'+_bP([G.ht[0]-1,G.ht[1]-12])+' '+_bP([G.hand[0]-2,G.hand[1]]);
  s+='<path d="'+bar+'" fill="none" stroke="#1f2937" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
  if(tipo==='urbana') s+='<path d="M'+_bP([G.ht[0]+3,G.ht[1]-9])+' l10 0 l-1.5 9 l-8 0 Z" fill="#c08a4d" stroke="#7c5a2e" stroke-width=".8"/><path d="M'+_bP([G.ht[0]+4,G.ht[1]-6])+' l8 0 M'+_bP([G.ht[0]+4.5,G.ht[1]-3])+' l7 0" stroke="#7c5a2e" stroke-width=".6"/>';
  // asiento, plato y bielas
  s+='<path d="M'+_bP(G.st)+' L'+_bP([G.sd[0]+5,G.sd[1]+2])+'" stroke="#374151" stroke-width="2"/><path d="M'+_bP([G.sd[0]-1,G.sd[1]])+' Q'+_bP([G.sd[0]+5,G.sd[1]-2.6])+' '+_bP([G.sd[0]+11,G.sd[1]])+' Z" fill="#111827" stroke="#111827" stroke-width="1.6" stroke-linejoin="round"/>';
  s+='<circle cx="'+G.bb[0]+'" cy="'+G.bb[1]+'" r="4.6" fill="none" stroke="#6b7280" stroke-width="1.4"/>';
  s+='<g><path d="M'+_bP(G.bb)+' l'+rc+' 0 M'+_bP(G.bb)+' l-'+rc+' 0" stroke="#4b5563" stroke-width="1.8" stroke-linecap="round"/>'+(anim?'<animateTransform attributeName="transform" type="rotate" from="0 '+G.bb[0]+' '+G.bb[1]+'" to="360 '+G.bb[0]+' '+G.bb[1]+'" dur="'+dur+'s" repeatCount="indefinite"/>':'')+'</g>';
  // torso (polera) + brazo
  s+='<path d="M'+_bP(G.hip)+' L'+_bP(G.sh)+'" stroke="'+polera+'" stroke-width="12" stroke-linecap="round"/><path d="M'+_bP([G.hip[0]+2,G.hip[1]-3])+' L'+_bP([G.sh[0]+1,G.sh[1]+1])+'" stroke="rgba(255,255,255,.22)" stroke-width="2.4" stroke-linecap="round"/>';
  var codo=[(G.sh[0]+G.hand[0])/2+1,(G.sh[1]+G.hand[1])/2+2.5];
  s+='<path d="M'+_bP(G.sh)+' L'+_bP(codo)+'" stroke="'+polera+'" stroke-width="5.4" stroke-linecap="round"/><path d="M'+_bP(codo)+' L'+_bP(G.hand)+'" stroke="'+piel+'" stroke-width="4" stroke-linecap="round"/><circle cx="'+G.hand[0]+'" cy="'+G.hand[1]+'" r="2.4" fill="#1f2937"/>';
  s+=pierna(0,true);
  // cabeza: el Pistero del usuario, con el gesto pedido
  var hw=54, cabeza=_pistoDe(o,cfg.expr||'feliz').replace('<svg viewBox="0 0 100 84"','<svg x="'+(G.head[0]-hw/2)+'" y="'+(G.head[1]-hw*0.6)+'" width="'+hw+'" height="'+(hw*0.84).toFixed(1)+'" viewBox="0 0 100 84"');
  s+=cabeza;
  return '<svg viewBox="-4 -14 132 124" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}
