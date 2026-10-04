/* ===== PISTERO DESDE ATRÁS (sobrevuelo en primera persona) — 2026-10-04 =====
   Pedido de Inty: "debe ir de frente en dirección de la ruta y hacer caras según el
   esfuerzo y velocidad". Con la cámara detrás, Pistero se ve DE ESPALDAS avanzando hacia
   el fondo de la pantalla; la cabeza mira hacia atrás (a la cámara, como en los juegos de
   carreras) para que se vean sus gestos.

   La cabeza NO va dentro de este SVG: es una capa aparte (layout.cab, en % de la caja) que
   sobrevuelo-viaje.js cambia sola cuando cambia el gesto — así la pedalada (SMIL) no se
   reinicia a cada cara. Reusa ropa y colores de pistero-bici.js (_BICI_ROPA, _BICI_TRAJE,
   _bPersona, _biciOpts) sin tocar ese archivo.

   _pistAtrasSVG(opts, {vehiculo, cadencia (s por vuelta; 0 = sin pedalear), rapido, pose})
     pose: ''      sentado, manos en la manilla
           'pie'   de pie en los pedales (subidas)      · 'aero'  agachado (bajadas, velocidad)
           'seca'  se seca el sudor con la mano izq.    · 'puno'  puño en alto (cima)
           'brazos' los dos brazos arriba (llegada)     · 'suelo' parado con un pie en el suelo
     → {svg, cab:{l,t,w,h}}   (viewBox 0 0 100 110) */

function _atrasPierna(cad,lado,R,Y,cp,cs,uy){
  // muslo y canilla de una pierna vistos desde atrás: el pie sube y baja con la biela
  uy=uy||0; var hip=[50+lado*5.2,68+uy], fr=[], kr=[];
  for(var k=0;k<=8;k++){ var th=k*Math.PI/4+(lado>0?Math.PI:0), py=87+6.5*Math.sin(th), px=50+lado*7.6;
    var ky=73.5+uy*.5+3.2*Math.sin(th), kx=50+lado*(8.6+1.6*Math.max(0,-Math.sin(th)));
    fr.push([px,py]); kr.push([kx,ky]); }
  function d(i){ return 'M'+hip[0]+' '+hip[1]+' L'+kr[i][0].toFixed(1)+' '+kr[i][1].toFixed(1)+' L'+fr[i][0].toFixed(1)+' '+fr[i][1].toFixed(1); }
  var vals=[]; for(var i=0;i<=8;i++) vals.push(d(i));
  var anim=cad>0, A=function(v){ return anim?'<animate attributeName="d" values="'+v.join(';')+'" dur="'+cad+'s" repeatCount="indefinite"/>':''; };
  var corto=(R.hasta||1)<=1;
  // pierna completa en color piel y encima el short/pantalón hasta la rodilla o hasta abajo
  var muslo=[]; for(var j=0;j<=8;j++) muslo.push('M'+hip[0]+' '+hip[1]+' L'+(hip[0]+(kr[j][0]-hip[0])*(corto?.92:1)).toFixed(1)+' '+(hip[1]+(kr[j][1]-hip[1])*(corto?.92:1)).toFixed(1)+(corto?'':' L'+fr[j][0].toFixed(1)+' '+(fr[j][1]-1).toFixed(1)));
  var pie=[]; for(var m=0;m<=8;m++) pie.push(fr[m][0].toFixed(1)+','+fr[m][1].toFixed(1));
  return '<path d="'+vals[0]+'" fill="none" stroke="'+cp+'" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">'+A(vals)+'</path>'
    +'<path d="'+muslo[0]+'" fill="none" stroke="'+cs+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">'+A(muslo)+'</path>'
    +'<ellipse rx="2.6" ry="1.9" fill="'+(R.zap||R.suela||'#111827')+'" stroke="#111827" stroke-width=".5" transform="translate('+pie[0]+')">'+(anim?'<animateTransform attributeName="transform" type="translate" values="'+pie.join(';')+'" dur="'+cad+'s" repeatCount="indefinite"/>':'')+'</ellipse>';
}
function _pistAtrasSVG(opts,cfg){
  cfg=cfg||{}; var o=_pistNormal(opts), veh=cfg.vehiculo||o.biciTipo||'ruta', s='', cad=(cfg.cadencia===undefined?0.7:cfg.cadencia);
  var Y=(typeof _bPersona==='function')?_bPersona(o):{piel:'#f4c9a0',polera:'#fc4c02',poleraS:'#b33600'};
  var R=Object.assign({},(typeof _BICI_ROPA!=='undefined'&&(_BICI_ROPA[veh]||_BICI_ROPA.ruta))||{pierna:'#111827',hasta:.72,zap:'#f8fafc',suela:'#111827'});
  var B=(typeof _biciOpts==='function')?_biciOpts(opts,veh):{};
  var TJ=(typeof _BICI_TRAJE!=='undefined'&&B.traje)?_BICI_TRAJE[B.traje]:null;
  if(TJ){ if(TJ.pol){ Y.polera=TJ.pol; Y.poleraS=_lpShade(TJ.pol,-.3); } if((R.hasta||1)<=1) R.pierna=TJ.sh; }
  var col=o.biciCol||_lpColCasco(o.casco), osc=_lpShade(col,-.4), piel=Y.piel, pielS=_lpShade(piel,-.22);
  var cab={l:24,t:3.5,w:52,h:40};
  s+='<ellipse cx="50" cy="106" rx="'+(veh==='auto'?34:17)+'" ry="3.4" fill="rgba(0,0,0,.3)"/>';
  if(cfg.rapido) s+='<g stroke="rgba(255,255,255,.8)" stroke-width="1.6" stroke-linecap="round"><path d="M10 40 L4 62"/><path d="M90 40 L96 62"/><path d="M16 70 L12 86"/><path d="M84 70 L88 86"/></g>';

  if(veh==='auto'){
    // auto visto desde atrás: Pistero se ve por el vidrio trasero, su bici en el techo
    var ca=o.motorCol||col;
    s+='<rect x="47" y="26" width="6" height="20" rx="1" fill="#1f2937"/><ellipse cx="50" cy="28" rx="2" ry="8" fill="none" stroke="#111827" stroke-width="2.4"/><path d="M30 46 L70 46" stroke="#4b5563" stroke-width="2"/>'
      +'<path d="M18 104 L18 74 Q18 62 30 58 L34 48 Q36 44 42 44 L58 44 Q64 44 66 48 L70 58 Q82 62 82 74 L82 104 Z" fill="'+ca+'" stroke="'+_lpShade(ca,-.4)+'" stroke-width="1.2"/>'
      +'<path d="M36 50 L64 50 L67 60 L33 60 Z" fill="#9cc3e6" stroke="#1f2937" stroke-width="1"/>'
      +'<rect x="20" y="74" width="12" height="7" rx="2" fill="#ef4444" stroke="#7f1d1d" stroke-width=".6"/><rect x="68" y="74" width="12" height="7" rx="2" fill="#ef4444" stroke="#7f1d1d" stroke-width=".6"/>'
      +'<rect x="40" y="84" width="20" height="7" rx="1.2" fill="#f8fafc" stroke="#1f2937" stroke-width=".6"/><path d="M18 96 L82 96" stroke="#111827" stroke-width="5"/>'
      +'<rect x="20" y="98" width="10" height="8" rx="2" fill="#111827"/><rect x="70" y="98" width="10" height="8" rx="2" fill="#111827"/>';
    return {svg:'<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>', cab:{l:37,t:34,w:26,h:20}};
  }
  if(veh==='moto'){
    var cm=o.motorCol||col;
    s+='<ellipse cx="50" cy="90" rx="6.5" ry="16" fill="#151a23"/><rect x="38" y="62" width="24" height="12" rx="3" fill="#1f2937"/><rect x="40" y="72" width="20" height="5" rx="1.5" fill="#ef4444"/>'
      +'<rect x="35" y="50" width="30" height="13" rx="3" fill="'+cm+'" stroke="'+_lpShade(cm,-.4)+'" stroke-width="1"/>'
      +'<rect x="24" y="64" width="9" height="16" rx="2" fill="#374151"/><rect x="67" y="64" width="9" height="16" rx="2" fill="#374151"/>'
      +'<path d="M22 50 L78 50" stroke="#1f2937" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="46" r="2.6" fill="#cbd5e1" stroke="#374151"/><circle cx="80" cy="46" r="2.6" fill="#cbd5e1" stroke="#374151"/>'
      +'<path d="M44 66 L40 82 M56 66 L60 82" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/><rect x="36" y="80" width="7" height="5" rx="1" fill="#111827"/><rect x="57" y="80" width="7" height="5" rx="1" fill="#111827"/>'
      +'<path d="M38 64 L36 46 Q50 40 64 46 L62 64 Z" fill="#334155"/><path d="M50 44 L50 63" stroke="#1e293b" stroke-width="1.2"/>'
      +'<path d="M37 47 L25 50 M63 47 L75 50" stroke="#334155" stroke-width="5" stroke-linecap="round"/>';
    return {svg:'<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>', cab:cab};
  }
  // bicis (y triciclo/handbike con dos ruedas atrás)
  var dos=(veh==='triciclo'||veh==='handbike'), ancho={mtb:4.2,playera:4.8,bmx:3.6,cicloviaje:3.4,gravel:3.2,triciclo:3.6,handbike:3.2}[veh]||2.6;
  function rueda(x){ return '<ellipse cx="'+x+'" cy="89" rx="'+ancho+'" ry="17" fill="#151a23"/><ellipse cx="'+x+'" cy="89" rx="'+(ancho*.45).toFixed(1)+'" ry="15.5" fill="none" stroke="#4b5563" stroke-width=".6"/>'; }
  if(dos) s+=rueda(30)+rueda(70)+'<path d="M30 80 L70 80" stroke="'+col+'" stroke-width="3"/>';
  else s+=rueda(50);
  // alforjas, parrilla y guardabarros según el tipo
  var carga=B.biciCarga||'';
  if(carga==='alforjas'||veh==='cicloviaje') s+='<rect x="33" y="68" width="10" height="17" rx="2.4" fill="#b45309" stroke="#78350f" stroke-width=".7"/><rect x="57" y="68" width="10" height="17" rx="2.4" fill="#b45309" stroke="#78350f" stroke-width=".7"/><path d="M34 73 L42 73 M58 73 L66 73" stroke="#fde68a" stroke-width=".8"/><rect x="41" y="64" width="18" height="5" rx="2.4" fill="#166534"/>';
  else if(veh==='urbana'||veh==='playera'||veh==='triciclo') s+='<path d="M50 70 L50 76" stroke="'+osc+'" stroke-width="'+(ancho*1.6)+'" stroke-linecap="round"/><rect x="46" y="74" width="8" height="2.6" rx="1" fill="#ef4444"/>';
  if(veh==='triciclo') s+='<rect x="38" y="62" width="24" height="12" rx="2" fill="#c08a4d" stroke="#7c5a2e" stroke-width=".8"/>';
  // tija y asiento, luz trasera
  s+='<path d="M50 70 L50 80" stroke="'+col+'" stroke-width="3.4"/><ellipse cx="50" cy="68.5" rx="5" ry="2.2" fill="#111827"/>';
  if(!dos) s+='<rect x="47.6" y="77" width="4.8" height="3.2" rx="1" fill="#ef4444"/><circle cx="50" cy="78.6" r="3.4" fill="#ef4444" opacity=".25"/>';
  // manubrio (más ancho en MTB/BMX)
  var mb={mtb:27,bmx:25,playera:26,urbana:23,triciclo:23}[veh]||19;
  s+='<path d="M'+(50-mb)+' 56 L'+(50+mb)+' 56" stroke="#1f2937" stroke-width="2.4" stroke-linecap="round"/><rect x="'+(50-mb-1.5)+'" y="54.2" width="5" height="3.6" rx="1.4" fill="#111827"/><rect x="'+(50+mb-3.5)+'" y="54.2" width="5" height="3.6" rx="1.4" fill="#111827"/>';
  // para el esqueleto animado (_pistAtrasRig): solo la bici; el cuerpo lo mueve el rig
  if(cfg.soloBici) return {s:s,mb:mb,R:R,Y:Y,TJ:TJ,piel:piel,pielS:pielS};
  // pose: sube/baja el torso (uy) y decide qué hace cada brazo y pierna
  var pose=cfg.pose||'', uy={pie:-5,aero:5,suelo:-1}[pose]||0, cs=R.pierna||'#111827';
  if(pose==='suelo') cad=0;
  // piernas (la cadencia 0 = va sin pedalear, p.ej. en bajada) — handbike: estiradas adelante
  if(veh==='handbike') s+='<path d="M45 70 L42 82 M55 70 L58 82" stroke="'+cs+'" stroke-width="6" stroke-linecap="round"/>';
  else if(pose==='suelo') s+='<path d="M44.8 67 L38 86 L33 103" fill="none" stroke="'+pielS+'" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M44.8 67 L38.6 84" stroke="'+cs+'" stroke-width="6" stroke-linecap="round"/><ellipse cx="32" cy="104" rx="3.4" ry="2" fill="'+(R.zap||'#111827')+'" stroke="#111827" stroke-width=".5"/>'+_atrasPierna(0,1,R,Y,piel,cs,uy);
  else s+=_atrasPierna(cad,-1,R,Y,pielS,cs,uy)+_atrasPierna(cad,1,R,Y,piel,cs,uy);
  var arriba='<g transform="translate(0 '+uy+')">';
  arriba+='<path d="M41 64 Q50 71 59 64 L58 70 Q50 74 42 70 Z" fill="'+cs+'"/>';
  // espalda con polera de ciclista: costura, bolsillos traseros y el color del traje (agachado = más corta y ancha)
  var pol=Y.polera, polS=Y.poleraS||_lpShade(pol,-.3), hom=pose==='aero'?4:0;
  arriba+='<path d="M42 67 L'+(37-hom)+' '+(46+hom)+' Q50 '+(40+hom)+' '+(63+hom)+' '+(46+hom)+' L58 67 Q50 69 42 67 Z" fill="'+pol+'" stroke="'+polS+'" stroke-width=".8"/>';
  arriba+='<path d="M50 '+(43+hom)+' L50 66" stroke="'+polS+'" stroke-width="1" opacity=".7"/><path d="M41.5 60 Q50 62.5 58.5 60" fill="none" stroke="'+polS+'" stroke-width=".9"/><path d="M46 60.6 L46 65 M54 60.6 L54 65" stroke="'+polS+'" stroke-width=".8"/>';
  if(R.extra==='mochila') arriba+='<rect x="42" y="'+(47+hom)+'" width="16" height="'+(15-hom)+'" rx="4" fill="#334155" stroke="#1e293b" stroke-width=".8"/>';
  if(R.extra==='hidra') arriba+='<path d="M43 '+(47+hom)+' L57 '+(47+hom)+' L56 61 Q50 63 44 61 Z" fill="#1d4ed8" stroke="#1e3a8a" stroke-width=".8"/>';
  if(TJ&&TJ.capa) arriba+='<path d="M38 46 Q50 42 62 46 L66 74 Q50 78 34 74 Z" fill="'+TJ.capa+'" opacity=".92"/>';
  // brazos: a la manilla (manilla queda fija en la bici: se compensa uy) o haciendo el gesto
  var hL=[39-hom,47+hom], hR=[61+hom,47+hom], gy=55.5-uy;
  function brazo(H,M,codo){ return '<path d="M'+H[0]+' '+H[1]+(codo?' L'+codo[0]+' '+codo[1]:'')+' L'+M[0]+' '+M[1]+'" fill="none" stroke="'+pol+'" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="'+M[0]+'" cy="'+M[1]+'" r="2.3" fill="'+piel+'"/>'; }
  var codoAero=pose==='aero'?7:0;
  var izq=(pose==='seca')?brazo(hL,[25,27],[22,40])+'<path d="M21 23 Q19 27 21 29 Q23 27 21 23 Z" fill="#7fd0ff"/>':(pose==='brazos')?brazo(hL,[30,6],[31,28]):brazo(hL,[50-mb+1,gy],codoAero?[50-mb-3,gy-2]:null);
  var der=(pose==='puno'||pose==='brazos')?brazo(hR,[70,6],[69,28])+'<circle cx="70" cy="5" r="3.2" fill="'+piel+'" stroke="'+pielS+'" stroke-width=".6"/>':brazo(hR,[50+mb-1,gy],codoAero?[50+mb+3,gy-2]:null);
  if(pose==='brazos') izq+='<circle cx="30" cy="5" r="3.2" fill="'+piel+'" stroke="'+pielS+'" stroke-width=".6"/>';
  arriba+=izq+der+'<rect x="46.5" y="'+(40+hom)+'" width="7" height="5" rx="2" fill="'+pielS+'"/></g>';
  s+=arriba;
  cab={l:24,t:+(3.5+(uy+hom)/110*100).toFixed(1),w:52,h:40};
  if(veh==='handbike') cab={l:24,t:12,w:52,h:40};
  return {svg:'<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>', cab:cab};
}

// Gesto y postura según lo que está pasando AHORA en la ruta (pendiente g en fracción, velocidad v
// en km/h; null si la ruta no trae ese dato).
//   muy empinado → aprieta (enojado) · subida → cansado con sudor · parado → pensando
//   bajada o > 35 km/h → emocionado · > 45 km/h → sorprendido · rápido en plano → contento
function _pistGestoEsfuerzo(g,v){
  if(v!==null && v<2) return {expr:'pensando',cad:0,sway:0,rapido:0,pose:'suelo'};
  if(g!==null && g>0.09) return {expr:'enojado',cad:1.05,sway:1,rapido:0,pose:'pie'};
  if(g!==null && g>0.045) return {expr:'cansado',cad:0.95,sway:1,rapido:0,pose:'pie'};
  if(v!==null && v>45) return {expr:'sorprendido',cad:0,sway:0,rapido:1,pose:'aero'};
  if((g!==null && g<-0.05) || (v!==null && v>35)) return {expr:'emocionado',cad:0,sway:0,rapido:1,pose:'aero'};
  if(v!==null && v>25) return {expr:'contento',cad:0.42,sway:0,rapido:1,pose:''};
  return {expr:'feliz',cad:0.68,sway:0,rapido:0,pose:''};
}

// Nuca de Pistero (cabeza vista desde atrás, mirando al camino): su casco con su diseño y
// accesorio, el pelo que cae por detrás según su peinado, orejas y el ajuste del casco.
// Mismo viewBox que la cara (0 0 100 84) para poder girar entre una y otra.
function _pistNucaSVG(opts){
  var o=_pistNormal(opts), piel=(PIST_PIEL.find(function(p){return p.id===o.piel;})||PIST_PIEL[0]).c, pc=o.peloCol||'#4a3222', pS=_lpShade(pc,-.25), s='';
  var hebras=function(d){ return '<path d="'+d+'" fill="none" stroke="'+pS+'" stroke-width=".9" stroke-linecap="round"/>'; };
  var trenza=function(x,y0,y1){ var t=''; for(var y=y0;y<y1;y+=5) t+='<ellipse cx="'+x+'" cy="'+y+'" rx="3.8" ry="3" fill="'+pc+'" stroke="'+pS+'" stroke-width=".7"/>'; return t; };
  // orejas y nuca
  s+='<ellipse cx="15" cy="62" rx="3.6" ry="5.4" fill="'+_lpShade(piel,-.08)+'"/><ellipse cx="85" cy="62" rx="3.6" ry="5.4" fill="'+_lpShade(piel,-.08)+'"/>';
  s+='<path d="M17 50 Q17 76 50 78 Q83 76 83 50 Z" fill="'+piel+'"/><path d="M40 77 L40 84 L60 84 L60 77 Q50 79 40 77 Z" fill="'+_lpShade(piel,-.15)+'"/>';
  var p=o.pelo;
  if(p) s+='<path d="M17 50 Q20 64 50 70 Q80 64 83 50 Z" fill="'+pc+'"/>'+hebras('M30 56 Q36 64 44 67 M70 56 Q64 64 56 67 M50 56 L50 69');
  if(p==='largo'||p==='ondulado') s+='<path d="M16 52 Q12 70 16 84 L84 84 Q88 70 84 52 Q50 64 16 52 Z" fill="'+pc+'"/>'+hebras(p==='ondulado'?'M28 62 Q24 70 30 76 Q26 80 28 84 M50 64 Q46 72 52 78 Q48 82 50 84 M72 62 Q76 70 70 76 Q74 80 72 84':'M28 62 L26 84 M40 65 L39 84 M50 66 L50 84 M60 65 L61 84 M72 62 L74 84');
  else if(p==='melena') s+='<path d="M16 52 Q14 68 20 78 Q50 84 80 78 Q86 68 84 52 Q50 64 16 52 Z" fill="'+pc+'"/>'+hebras('M30 62 L30 79 M50 66 L50 81 M70 62 L70 79');
  else if(p==='rizado'||p==='afro'){ var r=p==='afro'?7.5:5.6; [[22,60],[34,68],[50,71],[66,68],[78,60],[28,76],[50,80],[72,76]].forEach(function(c){ s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="'+pc+'" stroke="'+pS+'" stroke-width=".7"/>'; }); }
  else if(p==='cola'||p==='mono') s+='<path d="M45 66 Q42 76 46 84 L54 84 Q58 76 55 66 Z" fill="'+pc+'"/>'+hebras('M48 70 L48 84 M52 70 L52 84')+'<rect x="44" y="64" width="12" height="4" rx="2" fill="'+(o.disenoCol||'#fc4c02')+'"/>';
  else if(p==='coletas') s+='<path d="M22 60 Q12 70 16 84 L24 84 Q22 72 28 64 Z M78 60 Q88 70 84 84 L76 84 Q78 72 72 64 Z" fill="'+pc+'"/><circle cx="25" cy="61" r="2.6" fill="'+(o.disenoCol||'#fc4c02')+'"/><circle cx="75" cy="61" r="2.6" fill="'+(o.disenoCol||'#fc4c02')+'"/>';
  else if(p==='trenzas') s+=trenza(26,62,84)+trenza(74,62,84);
  else if(p==='trenza') s+=trenza(50,68,84);
  // ajuste del casco en la nuca (la "ruedita" que se aprieta)
  s+='<path d="M24 58 Q50 70 76 58" fill="none" stroke="#1f2937" stroke-width="1.6" opacity=".75"/><rect x="45.5" y="62.6" width="9" height="4" rx="2" fill="#111827"/><circle cx="50" cy="64.6" r="1.2" fill="#6b7280"/>';
  // casco (con su diseño/acabado), su accesorio y el equipo que se ve desde atrás
  var col=_lpColCasco(o.casco), casco=_cascoSVG(col,o);
  s+=casco+(o.acc?_accCascoSVG(o.acc,o.accCol):'')+((o.gadget==='luzroja'||o.gadget==='reflectante'||o.gadget==='banderin')?_gadgetSVG(o.gadget,o.gadgetCol):'');
  if(o.gadget!=='luzroja') s+='<rect x="45" y="47" width="10" height="4.4" rx="1.6" fill="#ef4444" stroke="#7f1d1d" stroke-width=".5"/><circle cx="50" cy="49.2" r="5" fill="#ef4444" opacity=".22"/>';
  return '<svg viewBox="0 0 100 84" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}

/* ===== Esqueleto animado (movimiento orgánico) =====
   El cuerpo de espaldas se mueve CUADRO A CUADRO en vez de cambiar de dibujo: cada parte
   (caderas, torso, brazos, piernas) persigue suave su postura objetivo, así todo transiciona
   sin saltos. Pedalada con inercia (arranca y se detiene de a poco; sin pedalear deja las
   bielas niveladas), cadera que se mece con cada pedalada, balanceo de pie sincronizado con
   la pedalada, brazos "de goma" en curva hacia la mano y cabeza que acompaña.
   rig.update({cad, pose, sway, rapido}, dt_ms) -> {sway (grados), cabezaDy, cabezaRot (grados)} */
function _pistAtrasRig(opts,veh){
  var B=_pistAtrasSVG(opts,{vehiculo:veh,soloBici:true});
  if(!B || typeof B.s!=='string') return null;           // moto/auto: sin esqueleto
  var R=B.R, Y=B.Y, mb=B.mb, piel=B.piel, pielS=B.pielS, cs=R.pierna||'#111827', pol=Y.polera, polS=Y.poleraS||_lpShade(pol,-.3);
  var corto=(R.hasta||1)<=1, zap=R.zap||R.suela||'#111827', TJ=B.TJ, hb=(veh==='handbike');
  function pierna(id,c){ return '<path class="rg-'+id+'s" fill="none" stroke="'+c+'" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><path class="rg-'+id+'c" fill="none" stroke="'+cs+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><ellipse class="rg-'+id+'f" rx="2.6" ry="1.9" fill="'+zap+'" stroke="#111827" stroke-width=".5"/>'; }
  var svg='<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">'
    +'<g class="rg-lin" opacity="0" stroke="rgba(255,255,255,.85)" stroke-width="1.6" stroke-linecap="round"><path d="M10 40 L4 62"/><path d="M90 40 L96 62"/><path d="M16 70 L12 86"/><path d="M84 70 L88 86"/></g>'
    +B.s
    +(hb?'<path d="M45 70 L42 82 M55 70 L58 82" stroke="'+cs+'" stroke-width="6" stroke-linecap="round"/>':pierna('L',pielS)+pierna('R',piel))
    +'<g class="rg-arr"><path d="M41 64 Q50 71 59 64 L58 70 Q50 74 42 70 Z" fill="'+cs+'"/>'
    +'<path class="rg-tor" fill="'+pol+'" stroke="'+polS+'" stroke-width=".8"/>'
    +'<path class="rg-esp" stroke="'+polS+'" stroke-width="1" opacity=".7"/><path d="M41.5 60 Q50 62.5 58.5 60" fill="none" stroke="'+polS+'" stroke-width=".9"/><path d="M46 60.6 L46 65 M54 60.6 L54 65" stroke="'+polS+'" stroke-width=".8"/>'
    +(R.extra==='mochila'?'<rect x="42" y="47" width="16" height="15" rx="4" fill="#334155" stroke="#1e293b" stroke-width=".8"/>':'')
    +(R.extra==='hidra'?'<path d="M43 47 L57 47 L56 61 Q50 63 44 61 Z" fill="#1d4ed8" stroke="#1e3a8a" stroke-width=".8"/>':'')
    +(TJ&&TJ.capa?'<path d="M38 46 Q50 42 62 46 L66 74 Q50 78 34 74 Z" fill="'+TJ.capa+'" opacity=".92"/>':'')
    +'<rect class="rg-cue" x="46.5" y="40" width="7" height="5" rx="2" fill="'+pielS+'"/></g>'
    +'<path class="rg-aL" fill="none" stroke="'+pol+'" stroke-width="4.6" stroke-linecap="round"/><circle class="rg-mL" r="2.3" fill="'+piel+'"/>'
    +'<path class="rg-aR" fill="none" stroke="'+pol+'" stroke-width="4.6" stroke-linecap="round"/><circle class="rg-mR" r="2.3" fill="'+piel+'"/>'
    +'</svg>';
  var E={}, g={L:[50-mb+1,55.5],R:[50+mb-1,55.5]};
  var c={th:0,w:0,uy:0,hom:0,suelo:0,sw:0,lin:0,hL:g.L.slice(),hR:g.R.slice()};
  function ease(a,b,tau,dt){ return a+(b-a)*(1-Math.exp(-dt/tau)); }
  function f1(n){ return n.toFixed(1); }
  // brazo "de goma": curva hacia afuera, más doblada mientras más cerca esté la mano del hombro
  function brazo(S,H,lado){
    var mx=(S[0]+H[0])/2, my=(S[1]+H[1])/2, dx=H[0]-S[0], dy=H[1]-S[1], d=Math.sqrt(dx*dx+dy*dy)||1;
    var nx=-dy/d, ny=dx/d; if(nx*lado<0){ nx=-nx; ny=-ny; }
    var k=Math.max(0,17-d)*.55+1.6;
    return 'M'+f1(S[0])+' '+f1(S[1])+' Q'+f1(mx+nx*k)+' '+f1(my+ny*k+1)+' '+f1(H[0])+' '+f1(H[1]);
  }
  return {
    svg:svg,
    bind:function(root){ ['Ls','Lc','Lf','Rs','Rc','Rf','arr','tor','esp','cue','aL','mL','aR','mR','lin'].forEach(function(k){ E[k]=root.querySelector('.rg-'+k); }); },
    update:function(st,dt){
      dt=Math.min(dt,80); var pose=st.pose||'';
      // pedalada con inercia; sin pedalear, las bielas se nivelan solas
      var wT=(st.cad>0 && pose!=='suelo')?2*Math.PI/st.cad:0; c.w=ease(c.w,wT,350,dt); c.th+=c.w*dt/1000;
      if(wT===0 && c.w<.6){ c.th=ease(c.th,Math.round(c.th/Math.PI)*Math.PI,250,dt); }
      c.uy=ease(c.uy,{pie:-5,aero:5,suelo:-1}[pose]||0,190,dt);
      c.hom=ease(c.hom,pose==='aero'?4:0,230,dt);
      c.suelo=ease(c.suelo,pose==='suelo'?1:0,260,dt);
      c.sw=ease(c.sw,st.sway?5:0,450,dt);
      c.lin=ease(c.lin,st.rapido?1:0,300,dt);
      var tL=pose==='seca'?[26,29]:pose==='brazos'?[22,21]:g.L, tR=(pose==='puno'||pose==='brazos')?[78,21]:g.R;
      c.hL=[ease(c.hL[0],tL[0],170,dt),ease(c.hL[1],tL[1],170,dt)]; c.hR=[ease(c.hR[0],tR[0],170,dt),ease(c.hR[1],tR[1],170,dt)];
      var pedaleando=Math.min(1,c.w/4), dePie=Math.max(0,-c.uy/5);
      // la cadera se mece con cada pedalada (más de pie); el torso acompaña
      var bob=Math.sin(2*c.th)*(.45+.9*dePie)*pedaleando, uy=c.uy+bob, hom=c.hom;
      if(E.lin) E.lin.setAttribute('opacity',f1(c.lin));
      if(!hb) [-1,1].forEach(function(l){
        var ph=c.th+(l>0?Math.PI:0), sn=Math.sin(ph), H=[50+l*5.2,68+uy];
        var P=[50+l*7.6,87+6.5*sn], K=[50+l*(8.6+1.6*Math.max(0,-sn)),73.5+uy*.5+3.2*sn];
        if(l<0 && c.suelo>.01){ var s=c.suelo; P=[P[0]+(33-P[0])*s,P[1]+(103-P[1])*s]; K=[K[0]+(38-K[0])*s,K[1]+(86-K[1])*s]; }
        var id=l<0?'L':'R', Kc=[H[0]+(K[0]-H[0])*.92,H[1]+(K[1]-H[1])*.92];
        if(E[id+'s']) E[id+'s'].setAttribute('d','M'+f1(H[0])+' '+f1(H[1])+' L'+f1(K[0])+' '+f1(K[1])+' L'+f1(P[0])+' '+f1(P[1]));
        if(E[id+'c']) E[id+'c'].setAttribute('d','M'+f1(H[0])+' '+f1(H[1])+' L'+f1(corto?Kc[0]:K[0])+' '+f1(corto?Kc[1]:K[1])+(corto?'':' L'+f1(P[0])+' '+f1(P[1]-1)));
        if(E[id+'f']){ E[id+'f'].setAttribute('cx',f1(P[0])); E[id+'f'].setAttribute('cy',f1(P[1])); }
      });
      if(E.arr) E.arr.setAttribute('transform','translate(0 '+f1(uy)+')');
      if(E.tor) E.tor.setAttribute('d','M42 67 L'+f1(37-hom)+' '+f1(46+hom)+' Q50 '+f1(40+hom)+' '+f1(63+hom)+' '+f1(46+hom)+' L58 67 Q50 69 42 67 Z');
      if(E.esp) E.esp.setAttribute('d','M50 '+f1(43+hom)+' L50 66');
      if(E.cue) E.cue.setAttribute('y',f1(40+hom));
      var SL=[39-hom,47+hom+uy], SR=[61+hom,47+hom+uy];
      if(E.aL){ E.aL.setAttribute('d',brazo(SL,c.hL,-1)); E.mL.setAttribute('cx',f1(c.hL[0])); E.mL.setAttribute('cy',f1(c.hL[1])); }
      if(E.aR){ E.aR.setAttribute('d',brazo(SR,c.hR,1)); E.mR.setAttribute('cx',f1(c.hR[0])); E.mR.setAttribute('cy',f1(c.hR[1])); }
      var sway=c.sw*Math.sin(c.th);
      return {sway:sway, cabezaDy:uy+hom, cabezaRot:-sway*.5+Math.sin(c.th*2)*.8*pedaleando};
    }
  };
}
