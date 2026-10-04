function skinColor(id){ const s=skinOptions.find(function(x){return x.id===id;}); return s?s.c:'#fc4c02'; }
function miniHelmetSVG(helmetId, accent){ const hd=helmetDesigns.find(function(x){return x.id===helmetId;})||helmetDesigns[0]; const col=hd.color||'#00aaff'; return '<svg viewBox="0 0 100 84" xmlns="http://www.w3.org/2000/svg">'
  +'<path d="M16 50 Q16 78 50 80 Q84 78 84 50 Z" fill="#f4c9a0"/>'
  +'<path d="M12 54 A38 36 0 0 1 88 54 Z" fill="'+col+'"/>'
  +'<path d="M12 54 Q50 66 88 54 L88 48 Q50 60 12 48 Z" fill="rgba(0,0,0,0.3)"/>'
  +'<path d="M50 22 L50 52" stroke="'+(accent||'#fc4c02')+'" stroke-width="6" stroke-linecap="round"/>'
  +'<circle cx="40" cy="62" r="5" fill="#fff"/><circle cx="60" cy="62" r="5" fill="#fff"/>'
  +'<circle cx="41" cy="63" r="2.4" fill="#16203a"/><circle cx="61" cy="63" r="2.4" fill="#16203a"/>'
  +'<path d="M42 72 Q50 78 58 72" stroke="#7a4a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
  +'</svg>'; }
function riderMarkerHTML(helmetId, accent, mine, opts){ if(!mine && opts && typeof opts==='object' && typeof _pistoDe==='function'){ return '<div class="helmet-pin"><div class="hp-in" style="--blink-delay:'+(Math.random()*RIDER_BLINK_MAX_S).toFixed(2)+'s">'+_pistoDe(opts,'feliz')+'</div></div>'; } var _o=(mine&&typeof _pistOpts==='function')?_pistOpts():{casco:helmetId,piel:'claro',lentes:''}; var _cc=(mine&&typeof _pistCascoCol==='function')?_pistCascoCol():(((typeof helmetDesigns!=='undefined'&&helmetDesigns.find(function(h){return h.id===helmetId;}))||{}).color||'#00aaff'); var _pc=(mine&&typeof _pistPielCol==='function')?_pistPielCol():'#f4c9a0'; var blinkDelay=(Math.random()*RIDER_BLINK_MAX_S).toFixed(2)+'s'; return '<div class="helmet-pin'+(mine?' mine':'')+'"><div class="hp-in" style="--blink-delay:'+blinkDelay+'">'+_pisteroExprSVG('feliz', _cc, _pc, _o.lentes, _o.bigote, _o.acc, _o)+'</div></div>'; }
// Popup de un ciclista en el mapa (2026-08-31, pedido de Inty: "no quiero nada generico").
// Reusa EXACTAMENTE el mismo color de casco que ya pinta riderMarkerHTML() para el pin
// (busca en helmetDesigns por helmetId) y dibuja el mismo Pistero, más grande, adentro del
// popup -- cero datos nuevos, cero lecturas extra a Firestore.
function _lpAvatarSVG(helmetId, opts){
  if(opts && typeof opts==='object' && typeof _pistoDe==='function'){ var oo=_pistNormal(opts); return {cc:_lpColCasco(oo.casco), svg:_pistoDe(oo,'feliz')}; }
  var cc = ((typeof helmetDesigns!=='undefined' && helmetDesigns.find(function(h){return h.id===helmetId;}))||{}).color || '#00aaff';
  var svg = (typeof _pisteroExprSVG==='function') ? _pisteroExprSVG('feliz', cc, '#f4c9a0', '', '', '', {casco:helmetId,piel:'claro',lentes:''}) : '';
  return {cc:cc, svg:svg};
}
function _lpPopupCiclista(nombre, helmetId, userId, opts){
  var av = _lpAvatarSVG(helmetId, opts);
  return '<div class="lp-pop" style="--cc:'+av.cc+'"><div class="lp-ic lp-av">'+av.svg+'</div><div class="lp-body"><div class="lp-t">'+escapeHTML(nombre)+'</div><a href="#" class="lp-cta" onclick="verPerfilUsuario(\''+userId+'\');return false"><i class="fas fa-id-card"></i> Ver perfil</a></div></div>';
}

// ===== Cara expresiva de Pistero (casco + ojos kawaii + expresiones + mirada) =====
function _pisteroExprSVG(expr, helmetCol, skinCol, lentes, bigote, accesorio, x){
  // v2 (pistero-armario.js): pelo detrás/delante del casco, casco con diseño y
  // acabado, correas, gadgets, marcas, color de ojos, labial y cuello.
  x=_pistNormal(x);
  var col=(helmetCol||'#00aaff'), skin=(skinCol||'#f4c9a0'), EC=(x.ojosCol||'#16203a');
  var base=_peloAtrasSVG(x.pelo,x.peloCol,x)
    +'<path d="M16 50 Q16 78 50 80 Q84 78 84 50 Z" fill="'+skin+'"/>'
    +'<path d="M22 74 Q50 84 78 74 Q66 80 50 80 Q34 80 22 74 Z" fill="rgba(0,0,0,.06)"/>'
    +_peloFrenteSVG(x.pelo,x.peloCol,x)
    +_cascoSVG(col,x)+_correasSVG();
  var cheeks='<ellipse cx="30" cy="71" rx="5.5" ry="3.2" fill="#ff9db0" opacity=".55"/><ellipse cx="70" cy="71" rx="5.5" ry="3.2" fill="#ff9db0" opacity=".55"/>';
  var SMILE='<path d="M43 73 Q50 79 57 73" stroke="#7a4a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
  function eO(x,blink){ return '<g class="lp-eye'+(blink?' lp-parpadeo':'')+'"><ellipse cx="'+x+'" cy="63" rx="6.2" ry="7.6" fill="'+EC+'"/><g class="lp-iris"><circle cx="'+(x-2.2)+'" cy="60" r="2.5" fill="#fff"/><circle cx="'+(x+2)+'" cy="65.5" r="1.2" fill="#fff" opacity=".85"/></g></g>'; }
  function eH(x){ return '<path d="M'+(x-6)+' 64 Q'+x+' 57 '+(x+6)+' 64" stroke="#16203a" stroke-width="2.8" fill="none" stroke-linecap="round"/>'; }
  function eW(x){ return '<g class="lp-eye"><ellipse cx="'+x+'" cy="62.5" rx="7" ry="8.8" fill="'+EC+'"/><g class="lp-iris"><circle cx="'+(x-2.5)+'" cy="59" r="2.9" fill="#fff"/><circle cx="'+(x+2.4)+'" cy="66" r="1.4" fill="#fff" opacity=".85"/></g></g>'; }
  function eU(x){ return '<ellipse cx="'+x+'" cy="61" rx="6" ry="7.4" fill="'+EC+'"/><circle cx="'+(x-1)+'" cy="56.5" r="2.6" fill="#fff"/>'; }
  function eHf(x){ return '<path d="M'+(x-6.5)+' 62 Q'+x+' 66 '+(x+6.5)+' 62" stroke="#16203a" stroke-width="3.4" fill="none" stroke-linecap="round"/>'; }
  function eC(x){ return '<path d="M'+(x-6)+' 62 L'+(x+6)+' 62" stroke="#16203a" stroke-width="2.8" stroke-linecap="round"/>'; }
  var eyes, mouth;
  if(expr==='hablando'){ eyes=eO(40)+eO(60); mouth='<ellipse class="lp-boca" cx="50" cy="74" rx="4" ry="4.8" fill="#5a2f1a"/><path d="M47 76 Q50 79 53 76" fill="#ff7a90"/>'; }
  else if(expr==='hablando_enojado'){ eyes='<path d="M32 52 L44 56" stroke="#16203a" stroke-width="2.6" stroke-linecap="round"/><path d="M68 52 L56 56" stroke="#16203a" stroke-width="2.6" stroke-linecap="round"/>'+eO(40)+eO(60); mouth='<ellipse class=\"lp-boca\" cx=\"50\" cy=\"74\" rx=\"4\" ry=\"4.8\" fill=\"#5a2f1a\"/><path d=\"M47 76 Q50 79 53 76\" fill=\"#ff7a90\"/>'; }
  else if(expr==='hablando_preocupado'){ eyes='<path d="M33 55 Q40 52 45 55" stroke="#16203a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M55 55 Q60 52 67 55" stroke="#16203a" stroke-width="2.2" fill="none" stroke-linecap="round"/>'+eO(40)+eO(60); mouth='<ellipse class=\"lp-boca\" cx=\"50\" cy=\"74\" rx=\"4\" ry=\"4.8\" fill=\"#5a2f1a\"/><path d=\"M47 76 Q50 79 53 76\" fill=\"#ff7a90\"/>'; }
  else if(expr==='hablando_contento'){ eyes=eH(40)+eH(60); mouth='<ellipse class=\"lp-boca\" cx=\"50\" cy=\"74\" rx=\"4\" ry=\"4.8\" fill=\"#5a2f1a\"/><path d=\"M47 76 Q50 79 53 76\" fill=\"#ff7a90\"/>'; }
  else if(expr==='hablando_cansado'){ eyes=eHf(40)+eHf(60); mouth='<ellipse class=\"lp-boca\" cx=\"50\" cy=\"74\" rx=\"4\" ry=\"4.8\" fill=\"#5a2f1a\"/><path d=\"M47 76 Q50 79 53 76\" fill=\"#ff7a90\"/><path d="M76 58 Q79 63 76 66 Q73 63 76 58 Z" fill="#7fd0ff"/>'; }
  else if(expr==='escuchando'||expr==='emocionado'){ eyes=eO(40)+eO(60); mouth='<path d="M44 72 Q50 80 56 72 Z" fill="#5a2f1a"/><path d="M47.5 75 Q50 79 52.5 75" fill="#ff7a90"/>'; }
  else if(expr==='contento'){ eyes=eH(40)+eH(60); mouth=SMILE; }
  else if(expr==='guino'){ eyes=eH(40)+eO(60,true); mouth=SMILE; }
  else if(expr==='sorprendido'){ eyes=eW(40)+eW(60); mouth='<ellipse cx="50" cy="74.5" rx="2.6" ry="3.3" fill="#5a2f1a"/>'; }
  else if(expr==='pensando'){ eyes='<path d="M33 53 Q40 50 46 53" stroke="#16203a" stroke-width="2.2" fill="none" stroke-linecap="round"/>'+eU(40)+eU(60); mouth='<path d="M44 74 L54 74" stroke="#7a4a2a" stroke-width="2.4" stroke-linecap="round"/><circle cx="72" cy="70" r="1.4" fill="#7a4a2a"/><circle cx="77" cy="68" r="1.1" fill="#7a4a2a"/>'; }
  else if(expr==='enojado'){ eyes='<path d="M32 52 L44 56" stroke="#16203a" stroke-width="2.6" stroke-linecap="round"/><path d="M68 52 L56 56" stroke="#16203a" stroke-width="2.6" stroke-linecap="round"/>'+eO(40)+eO(60); mouth='<path d="M43 77 Q50 71 57 77" stroke="#7a4a2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>'; }
  else if(expr==='cansado'){ eyes=eHf(40)+eHf(60); mouth='<path d="M45 74 L55 74" stroke="#7a4a2a" stroke-width="2.4" stroke-linecap="round"/><path d="M76 58 Q79 63 76 66 Q73 63 76 58 Z" fill="#7fd0ff"/>'; }
  else if(expr==='preocupado'){ eyes='<path d="M33 55 Q40 52 45 55" stroke="#16203a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M55 55 Q60 52 67 55" stroke="#16203a" stroke-width="2.2" fill="none" stroke-linecap="round"/>'+eO(40)+eO(60); mouth='<path d="M44 75 Q47 72 50 75 Q53 78 56 75" stroke="#7a4a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>'; }
  else if(expr==='dormido'){ eyes=eC(40)+eC(60); mouth='<ellipse cx="50" cy="75" rx="2.4" ry="3" fill="#5a2f1a"/><text x="72" y="46" font-size="11" fill="#7fd0ff" font-family="sans-serif">z</text><text x="79" y="40" font-size="8" fill="#7fd0ff" font-family="sans-serif">z</text>'; }
  else { eyes=eO(40,true)+eO(60,true); mouth=SMILE; }
  return '<svg viewBox="0 0 100 84" xmlns="http://www.w3.org/2000/svg">'+base+(accesorio?_accCascoSVG(accesorio,x.accCol):'')+(x.gadget?_gadgetSVG(x.gadget,x.gadgetCol):'')+(x.aro?_aroSVG(x.aro,x.aroCol):'')+eyes+(x.pest?_pestanasSVG(x.pest):'')+(lentes?_lentesSVG(lentes,x.lentesCol,x.marcoCol):'')+(x.marca==='rubor'?'':cheeks)+(x.marca?_marcaSVG(x.marca,x):'')+_labiosMouth(mouth,x.labios)+(bigote?_bigoteSVG(bigote):'')+(x.cuello?_cuelloSVG(x.cuello,x.pano):'')+'</svg>';
}
var _pisteroExprActual='feliz';
var _pisteroMood=null;
function _setExprPistero(expr){
  if(!expr) expr='feliz';
  _pintarMiPistero();
  _pisteroExprActual=expr;
  var svg=(typeof _pistOpts==='function')?_pisteroExprSVG(expr, _pistCascoCol(), _pistPielCol(), _pistOpts().lentes, _pistOpts().bigote, _pistOpts().acc, _pistOpts()):_pisteroExprSVG(expr);
  var ids=['micBtn','esMic'];
  for(var i=0;i<ids.length;i++){ var b=document.getElementById(ids[i]); if(!b) continue; var c=b.querySelector('.orb-cara'); if(c) c.innerHTML=svg; }
  _aplicarMirada();
}
// Mirada: los ojos siguen por donde se mueve el usuario en la app.
var _miradaX=0,_miradaY=0,_miradaRAF=0;
function _aplicarMirada(){ var els=document.querySelectorAll('#micBtn .lp-iris, #esMic .lp-iris'); for(var i=0;i<els.length;i++){ els[i].style.transform='translate('+_miradaX.toFixed(2)+'px,'+_miradaY.toFixed(2)+'px)'; } }
function _pisteroMira(px,py){
  var el=document.getElementById('micBtn'); if(!el||!el.offsetParent) el=document.getElementById('esMic');
  if(!el||!el.offsetParent) return;
  var r=el.getBoundingClientRect(); var cx=r.left+r.width/2, cy=r.top+r.height/2;
  var dx=px-cx, dy=py-cy; var d=Math.sqrt(dx*dx+dy*dy)||1; var m=2.8;
  _miradaX=dx/d*m; _miradaY=dy/d*m;
  if(!_miradaRAF) _miradaRAF=requestAnimationFrame(function(){ _miradaRAF=0; _aplicarMirada(); });
}
var _idleTOP=null;
function _resetIdlePistero(){ if(_idleTOP) clearTimeout(_idleTOP); if(_pisteroExprActual==='dormido') _setExprPistero('feliz'); _idleTOP=setTimeout(function(){ if(_pisteroExprActual==='feliz' && !document.body.classList.contains('pistero-hablando') && !(typeof micOn!=='undefined'&&micOn) && document.visibilityState==='visible') _setExprPistero('dormido'); }, 150000); }
document.addEventListener('pointermove', function(e){ _pisteroMira(e.clientX,e.clientY); _resetIdlePistero(); }, {passive:true});
document.addEventListener('touchmove', function(e){ if(e.touches&&e.touches[0]) _pisteroMira(e.touches[0].clientX,e.touches[0].clientY); _resetIdlePistero(); }, {passive:true});
document.addEventListener('pointerdown', function(){ _resetIdlePistero(); }, {passive:true});
(function(){ function ini(){ try{ _setExprPistero(_pisteroExprActual); _resetIdlePistero(); }catch(e){} } if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ini); else setTimeout(ini,60); })();


function generateCharacterSVG(helmetId, lensId, skinId, extras, look){
  const helmet = helmetDesigns.find(function(x){return x.id===helmetId;}) || helmetDesigns[0];
  const lens = lensOptions.find(function(x){return x.id===lensId;}) || lensOptions[0];
  const accent = skinColor(skinId);
  extras = extras || [];
  look = look || {};
  // Rostro configurable (tono de piel, ojos, labios, vello facial, peinado,
  // pañoleta) — todas con un valor por defecto que reproduce EXACTO el look
  // original, así que un personaje que nunca toca esto no cambia en nada.
  const piel = pielOptions.find(function(x){return x.id===look.piel;}) || pielOptions[0];
  const ojos = ojosOptions.find(function(x){return x.id===look.ojos;}) || ojosOptions[0];
  const labios = labiosOptions.find(function(x){return x.id===look.labios;}) || labiosOptions[0];
  const vello = velloFacialOptions.find(function(x){return x.id===look.vello;}) || velloFacialOptions[0];
  const peinado = peinadoOptions.find(function(x){return x.id===look.peinado;}) || peinadoOptions[0];
  const panuelo = panueloOptions.find(function(x){return x.id===look.panuelo;}) || panueloOptions[0];
  const col = helmet.color || '#00aaff';
  const eyeRx = ojos.shape==='almendrado' ? 11 : 10, eyeRy = ojos.shape==='almendrado' ? 8.5 : 11;
  let s = '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">';
  // sombra en el suelo
  s += '<ellipse cx="100" cy="184" rx="44" ry="7" fill="rgba(0,0,0,0.22)"/>';
  // pelo largo/cola/trenzas: va DETRÁS de la cara y el casco (asoma por atrás)
  if(peinado.svgBack) s += peinado.svgBack;
  // cara (forma de rostro bajo la visera, tono de piel elegido; enmarca ojos y boca)
  s += '<path d="M64 126 Q64 172 100 174 Q136 172 136 126 Z" fill="'+piel.c+'"/>';
  // casco FRONTAL: cupula vista de frente sobre la frente
  s += '<path d="M40 132 A60 58 0 0 1 160 132 Z" fill="'+col+'"/>';
  // visera / borde inferior del casco
  s += '<path d="M40 132 Q100 150 160 132 L160 125 Q100 143 40 125 Z" fill="rgba(0,0,0,0.30)"/>';
  // franja central de color (personalizacion)
  s += '<path d="M100 76 L100 130" stroke="'+accent+'" stroke-width="9" stroke-linecap="round"/>';
  // ventilaciones (ranuras en la cupula)
  s += '<path d="M70 102 q7 -16 14 0" stroke="rgba(0,0,0,0.22)" stroke-width="5" fill="none" stroke-linecap="round"/>';
  s += '<path d="M116 102 q7 -16 14 0" stroke="rgba(0,0,0,0.22)" stroke-width="5" fill="none" stroke-linecap="round"/>';
  // brillo del casco
  s += '<path d="M60 118 A48 48 0 0 1 90 84" stroke="rgba(255,255,255,0.35)" stroke-width="4" fill="none" stroke-linecap="round"/>';
  // pelo corto/rulos: asoma por debajo del borde del casco, a los lados
  if(peinado.svgSide) s += peinado.svgSide;
  // ojos (debajo de la visera, parpadean; forma e iris según lo elegido)
  s += '<ellipse cx="83" cy="144" rx="'+eyeRx+'" ry="'+eyeRy+'" fill="#ffffff"><animate attributeName="ry" values="'+eyeRy+';'+eyeRy+';1;'+eyeRy+';'+eyeRy+'" dur="4s" repeatCount="indefinite"/></ellipse>';
  s += '<ellipse cx="117" cy="144" rx="'+eyeRx+'" ry="'+eyeRy+'" fill="#ffffff"><animate attributeName="ry" values="'+eyeRy+';'+eyeRy+';1;'+eyeRy+';'+eyeRy+'" dur="4s" repeatCount="indefinite"/></ellipse>';
  s += '<circle cx="85" cy="146" r="4.6" fill="'+ojos.iris+'"/><circle cx="119" cy="146" r="4.6" fill="'+ojos.iris+'"/>';
  s += '<circle cx="86.6" cy="144.2" r="1.5" fill="#fff"/><circle cx="120.6" cy="144.2" r="1.5" fill="#fff"/>';
  if(ojos.pestanas){
    s += '<path d="M74 136 l-4 -5M79 133 l-2 -6M89 131 l1 -6" stroke="#1a1a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    s += '<path d="M126 136 l4 -5M121 133 l2 -6M111 131 l-1 -6" stroke="#1a1a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  }
  // mejillas
  s += '<circle cx="72" cy="158" r="4.5" fill="rgba(255,120,120,0.35)"/><circle cx="128" cy="158" r="4.5" fill="rgba(255,120,120,0.35)"/>';
  // boca (sonrisa en reposo; el color de labios elegido queda en data-labios para
  // que _bocaAplicar lo use también mientras habla, no solo en la pose fija)
  s += '<path class="pboca" data-labios="'+labios.c+'" d="M86 162 Q100 174 114 162" stroke="'+labios.c+'" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
  // vello facial (bigote/barba) sobre la boca
  if(vello.svg) s += vello.svg;
  // lentes (reposicionados a la nueva altura de ojos)
  if(lensId!=='none' && lens.svg) s += '<g transform="translate(0,28)">'+lens.svg+'</g>';
  // pañoleta/cuello
  if(panuelo.svg) s += panuelo.svg;
  // accesorios del casco
  extras.forEach(function(id){ const ex=extrasOptions.find(function(x){return x.id===id;}); if(ex) s+=ex.svg; });
  s += '</svg>';
  return s;
}

/* ===== TIENDA DE DARMA: desbloquear skins, lentes, accesorios y cascos ===== */
const PRECIOS = {
  amarillo:30, morado:40, naranja:40, azul:50, negro:70,
  aviator:50, mirrored:80, amber:60, pink:60,
  faro:60, antena:90, calco:40, bandana:70,
  poc:80, kask:90, lazer:100, rudy:120, abus:140, limar:150,
  estilo2:60, estilo3:90, fondoespacial:70,
  // Lentes nuevos
  redondos:35, catEye:55, transparente:30, grandes:65,
  // Accesorios de casco nuevos
  ledLateral:70, banderin:45, cintaReflectante:35, corona:120, orejas:50,
  // Ojos: los colores base (café/azul/verde/miel/gris) quedan SIEMPRE gratis a
  // propósito — representar tu identidad no debería tener precio. Solo la forma y
  // los extras (pestañas) son cosmético de tienda, como los lentes.
  ojoAlmendrado:25, ojoPestanas:35, ojoPestanasAzul:45,
  // Labios (color, tipo maquillaje — cosmético liviano)
  labioRojo:20, labioRosado:20, labioCoral:20, labioVino:25, labioNude:20,
  // Vello facial
  bigoteFino:20, bigoteGrueso:25, barbaCandado:30, perilla:20, barbaCorta:35, barbaCompleta:40,
  // Peinados
  cortoNegro:25, cortoCastano:25, cortoRubio:25, rulos:30, rulosPelirrojos:35, colaCastana:35, trenzas:40, largoSuelto:45,
  // Pañoleta / cuello
  panueloRoja:20, panueloAzul:20, panueloNegra:20, panueloLunares:30, panueloBuff:35
};
function seleccionarEstilo(n){ const id='estilo'+n; if(n>1 && !estaDesbloqueado(id)){ comprarItem(id); if(!estaDesbloqueado(id)) return; } esEstilo=n; try{ localStorage.setItem('lp_estilo',n); }catch(e){} h('Estilo de energía activado.'); renderEstilos(); }
function renderEstilos(){ const c=document.getElementById('estilosGrid'); if(!c) return; const nombres=['Arcos neón','Tesla azul','Plasma']; let html=''; for(let n=1;n<=3;n++){ const id='estilo'+n; const lock=(n>1 && !estaDesbloqueado(id)); const sel=(esEstilo===n); html+='<div class="custom-option'+(sel?' selected':'')+(lock?' locked':'')+'" onclick="seleccionarEstilo('+n+')">'+(lock?'<div class="lock-badge"><i class="fas fa-lock"></i> '+PRECIOS[id]+'✨</div>':'')+'<div class="check">OK</div><div style="font-size:1.7rem;line-height:1.4"><i class="fas fa-bolt"></i> </div><div class="label">'+nombres[n-1]+'</div></div>'; } c.innerHTML=html; }
function seleccionarFondoEsfera(n){ if(n===2 && !estaDesbloqueado('fondoespacial')){ comprarItem('fondoespacial'); if(!estaDesbloqueado('fondoespacial')) return; } esFondoModo=n; try{ localStorage.setItem('lp_fondo_esfera',n); }catch(e){} h('Fondo de la esfera actualizado.'); renderFondosEsfera(); }
function renderFondosEsfera(){ const c=document.getElementById('fondosEsferaGrid'); if(!c) return; const nombres=['Postales de Chile','Espacial'], emojis=['🏞️','🌌']; let html=''; for(let n=1;n<=2;n++){ const lock=(n===2 && !estaDesbloqueado('fondoespacial')); const sel=(esFondoModo===n); html+='<div class="custom-option'+(sel?' selected':'')+(lock?' locked':'')+'" onclick="seleccionarFondoEsfera('+n+')">'+(lock?'<div class="lock-badge"><i class="fas fa-lock"></i> '+PRECIOS.fondoespacial+'✨</div>':'')+'<div class="check">OK</div><div style="font-size:1.7rem;line-height:1.4">'+emojis[n-1]+'</div><div class="label">'+nombres[n-1]+'</div></div>'; } c.innerHTML=html; }
function getDesbloqueados(){ try{ return JSON.parse(localStorage.getItem('lp_unlocked_'+(cu||'anon'))||'[]'); }catch(e){ return []; } }
function estaDesbloqueado(id){ return true; } // v8.20: TODO liberado, nada bloqueado por Darma (pedido de Inty). Darma sigue para ranking/premios.
function comprarItem(id){ const costo=PRECIOS[id]||0; if(us.d<costo){ lpAviso('Te faltan '+(costo-us.d)+' de Darma para esto. ¡Aporta a la comunidad (reportes, puntos, rutas) para ganar más!'); return; } us.d-=costo; const arr=getDesbloqueados(); if(arr.indexOf(id)===-1) arr.push(id); try{ localStorage.setItem('lp_unlocked_'+(cu||'anon'),JSON.stringify(arr)); }catch(e){}
  // Respalda en la nube lo que ya pagaste con Darma — si no, al cambiar de teléfono
  // o reinstalar, perdías el ítem aunque tu saldo de Darma (ya gastado) sí viajaba.
  if(cu){
    db.collection('users').doc(cu).set({unlocked:firebase.firestore.FieldValue.arrayUnion(id)},{merge:true}).catch(function(err){
      try{ if(window.Sentry) Sentry.captureException(err,{tags:{donde:'comprarItem'}}); }catch(_e){}
      h('No se pudo respaldar tu compra en la nube, revisa tu conexión. Si cambias de teléfono podrías perderla.');
    });
  }
  au(); if(typeof sincronizarStats==='function') sincronizarStats(); h('¡Desbloqueado! Ya puedes usarlo en tu Perfil.'); mostrarTienda(); }
function mostrarTienda(desdeLogros){
  // Se abre desde 2 lugares distintos: el menú de Logros (ahí sí tiene sentido
  // "← Volver" a ese menú) y al tocar un ítem bloqueado en Personalizar (ahí la
  // "✕" ya te deja de vuelta en Personalizar correctamente, un "Volver a Logros"
  // sería confuso porque nunca estuviste ahí).
  _modalVolverA=desdeLogros?'mostrarLogrosComunidad':null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-store"></i> Tienda de Darma';
  let html=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.84rem;margin-top:0">Tienes <strong style="color:var(--g)">'+us.d+' de Darma ✨</strong>. Gánala aportando a la comunidad y desbloquea skins, lentes, accesorios y cascos.</p>';
  const grupos=[['<i class="fas fa-palette"></i> Colores premium',skinOptions],['<i class="fas fa-glasses"></i> Lentes',lensOptions],['<i class="fas fa-wand-magic-sparkles"></i> Accesorios del casco',extrasOptions],['<i class="fas fa-helmet-safety"></i> Cascos premium',helmetDesigns],['<i class="fas fa-eye"></i> Ojos',ojosOptions],['💋 Labios',labiosOptions],['💇 Peinado',peinadoOptions],['🧔 Vello facial',velloFacialOptions],['🧣 Pañoleta',panueloOptions]];
  grupos.forEach(function(gp){ const items=gp[1].filter(function(it){return it.id in PRECIOS;}); if(!items.length) return; html+='<h4 style="color:var(--p);font-size:0.85rem;margin:12px 0 6px">'+gp[0]+'</h4>'; items.forEach(function(it){ const unlocked=estaDesbloqueado(it.id); const costo=PRECIOS[it.id]; const puede=us.d>=costo; html+='<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;margin-bottom:5px;background:var(--gl);border:1px solid '+(unlocked?'var(--g)':'#242c3e')+'"><div style="flex:1"><div style="font-weight:700;font-size:0.84rem;color:#dfe7ff">'+escapeHTML((it.brand?it.brand+' ':'')+it.name)+'</div><div style="font-size:0.68rem;color:'+(unlocked?'var(--g)':'#7d8ba0')+'">'+(unlocked?'Desbloqueado ✓':(costo+' ✨ Darma'))+'</div></div>'+(unlocked?'<span style="color:var(--g);font-weight:800;font-size:1.1rem"><i class="fas fa-check"></i> </span>':'<button class="ab" style="width:auto;padding:7px 12px;margin:0;font-size:0.76rem;'+(puede?'':'opacity:0.45')+'" onclick="comprarItem(\''+it.id+'\')">Desbloquear</button>')+'</div>'; }); });
  html+='<div style="margin-top:16px;padding:12px;border-radius:10px;background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(252,76,2,0.08));border:1px solid var(--g)">'+
    '<h4 style="color:var(--g);font-size:0.9rem;margin:0 0 6px"><i class="fas fa-person-biking"></i> Libre Pedal Pro <span style="font-size:0.62rem;background:#333;color:#aaa;padding:2px 7px;border-radius:8px;vertical-align:middle">Muy pronto</span></h4>'+
    '<div style="font-size:0.76rem;color:#cfe8ff;line-height:1.7"><i class="fas fa-check"></i> Mapas offline sin conexión<br><i class="fas fa-check"></i> Colección completa de cascos y voces<br><i class="fas fa-check"></i> Estadísticas y respaldo avanzado del historial<br><i class="fas fa-check"></i> Insignia de apoyo a la comunidad</div>'+
    '<button class="ab sec" style="margin-top:10px" disabled onclick="return false">Disponible próximamente</button>'+
    '</div>';
  document.getElementById('modalContent').innerHTML=html;
  document.getElementById('userModal').classList.add('on');
}
function gridHTML(items, selectedId, onclickName, multi){
  return items.map(function(it){
    const sel = multi ? (selectedExtras.indexOf(it.id)!==-1) : (selectedId===it.id);
    let inner;
    if(it.c){ inner='<div class="skin-swatch" style="background:'+it.c+'"></div>'; }
    else { inner='<svg viewBox="0 0 200 130">'+(it.svg||'<text x="100" y="80" text-anchor="middle" font-size="26" fill="#888">--</text>')+'</svg>'; }
    const locked = !estaDesbloqueado(it.id);
    return '<div class="custom-option'+(sel?' selected':'')+(locked?' locked':'')+'" onclick="'+onclickName+'(\''+it.id+'\')">'+(locked?'<div class="lock-badge"><i class="fas fa-lock"></i> '+PRECIOS[it.id]+'✨</div>':'')+'<div class="check">OK</div>'+inner+'<div class="label">'+(it.brand?it.brand+' ':'')+it.name+'</div></div>';
  }).join('');
}
// ===== PERSONALIZACION DE PISTERO (v8.22): compone sobre la cara de frente. Reemplaza el personaje viejo.
function _pistOpts(){ try{ return _pistNormal(JSON.parse(localStorage.getItem('lp_pist_'+(cu||'anon'))||'{}')); }catch(e){ return _pistNormal({}); } }
// Guarda el objeto completo: local + Firestore. `pistOpts` (mapa completo, v2) es lo
// que leen las versiones nuevas; los campos sueltos pist* se mantienen para que las
// versiones viejas de la app sigan dibujando algo razonable.
function _pistGuardar(o){ if(typeof _ptLimpiar==='function') o=_ptLimpiar(o); try{ localStorage.setItem('lp_pist_'+(cu||'anon'), JSON.stringify(o)); }catch(e){ console.warn('[pistero] no se pudo guardar el personaje en el dispositivo', e); } if(cu){ try{ db.collection('users').doc(cu).set({pistOpts:o,pistCasco:o.casco,pistPiel:o.piel,pistLentes:o.lentes,pistLentesCol:o.lentesCol,pistBigote:o.bigote,pistAcc:o.acc,pistPelo:o.pelo,pistPeloCol:o.peloCol,pistPest:o.pest,pistAro:o.aro,pistPano:(o.cuello==='panoleta'?o.pano:'')},{merge:true}).catch(function(e){ console.warn('[pistero] no se pudo sincronizar el personaje', e); }); }catch(e){ console.warn('[pistero] no se pudo sincronizar el personaje', e); } } renderPistCustom(); if(typeof updateCustomizePreview==='function') updateCustomizePreview(); if(typeof _setExprPistero==='function') _setExprPistero(_pisteroExprActual||'feliz'); _pintarMiPistero(); }
function _pistSet(k,v){ var o=_pistOpts(); o[k]=v;
  if(k==='cuello'){ if(!v) o.pano=''; else if(!o.pano) o.pano='#fc4c02'; }
  if(k==='pano' && v && !o.cuello) o.cuello='panoleta';
  if(k==='disenoCol' && !o.diseno) o.diseno='franja';
  _pistGuardar(o); }
// "Sorpréndeme": cambia el ESTILO (casco, diseño, pelo, accesorios, ropa), nunca la
// identidad (piel, ojos, pestañas, labial y barba quedan como el usuario los eligió).
function _pistSorpresa(){ var o=_pistOpts();
  function r(l){ return l[Math.floor(Math.random()*l.length)].id; }
  function q(p,l){ return Math.random()<p ? r(l.filter(function(x){return x.id;})) : ''; }
  o.casco=r(PIST_CASCO); o.acabado=q(.4,PIST_ACABADO); o.diseno=r(PIST_DISENO); o.disenoCol=r(PIST_ACENTO);
  if(o.pelo) o.pelo=r(PIST_PELO.filter(function(x){return x.id;}));
  o.lentes=q(.55,PIST_LENTES); o.lentesCol=r(PIST_LENTES_COL); o.marcoCol=q(.4,PIST_PIEZA_COL);
  o.acc=q(.65,PIST_ACC); o.accCol=q(.5,PIST_PIEZA_COL);
  o.gadget=q(.3,PIST_GADGET); o.gadgetCol=q(.5,PIST_PIEZA_COL); o.marca=q(.35,PIST_MARCA);
  o.cuello=q(.6,PIST_CUELLO); o.pano=o.cuello?r(PIST_PANO):'';
  _pistGuardar(o); }
// Pistero del usuario en toda la app (pestaña Pistero, chip de usuario, título de la
// sección): el MISMO personaje que arma en la tienda. Solo repinta si cambió.
var _miPistKey='';
function _pintarMiPistero(forzar){ var els=document.querySelectorAll('.lp-mi-pistero'); if(!els.length) return; var o=_pistOpts(), k=JSON.stringify(o); if(!forzar && k===_miPistKey) return; _miPistKey=k; var svg=_pistoDe(o,'feliz'); for(var i=0;i<els.length;i++) els[i].innerHTML=svg; }
function _pistCascoCol(){ return _lpColCasco(_pistOpts().casco); }
function _pistPielCol(){ var o=_pistOpts(); var p=PIST_PIEL.find(function(x){return x.id===o.piel;}); return p?p.c:'#f4c9a0'; }
function _pistoNuevo(expr){ var o=_pistOpts(); return _pisteroExprSVG(expr||'feliz', _pistCascoCol(), _pistPielCol(), o.lentes, o.bigote, o.acc, o); }
// Mismo Pistero de _pistoNuevo() pero para un `pistOpts` ARBITRARIO (de Firestore,
// no de localStorage) -- _pistOpts()/_pistoNuevo() estan atados al usuario logueado
// (leen 'lp_pist_'+cu del dispositivo), asi que no sirven para dibujar el personaje
// de OTRO usuario. Usado en verPerfilUsuario() para que el perfil de comunidad
// muestre el Pistero real de quien sea, no siempre el mismo por defecto.
function _pistoDe(opts, expr){
  var o=_pistNormal(opts);
  var p=PIST_PIEL.find(function(x){return x.id===o.piel;});
  return _pisteroExprSVG(expr||'feliz', _lpColCasco(o.casco), p?p.c:'#f4c9a0', o.lentes, o.bigote, o.acc, o);
}
function _pistSwatch(inner,sel,onclick,label){ return '<div class="pist-sw'+(sel?' sel':'')+'" onclick="'+onclick+'" title="'+label+'"><div class="pist-sw-ico">'+inner+'</div><div class="pist-sw-lbl">'+label+'</div></div>'; }
function _pistChip(c,sel,onclick,label){ return '<div class="pist-chip'+(sel?' sel':'')+'" onclick="'+onclick+'" title="'+label+'" aria-label="'+label+'"><span style="background:'+c+'"></span></div>'; }
// Chip "+" con selector de color libre: cualquier color, no solo los de la lista.
function _pistChipLibre(k,actual,esLibre){ var v=_LP_HEX.test(actual||'')?actual:'#fc4c02'; return '<label class="pist-chip pist-chip-libre'+(esLibre?' sel':'')+'" title="Otro color" aria-label="Otro color"><span style="'+(esLibre?'background:'+v:'')+'"></span><input type="color" value="'+v+'" onchange="_pistSet(\''+k+'\',this.value)"></label>'; }
var _PIST_ORIGINAL='repeating-linear-gradient(45deg,#cbd5e1 0 3px,#64748b 3px 6px)';
// Grupos del armario. zoom = recorte del viewBox para que lo chico (ojos, labios,
// aros) se vea en el ícono; chip = selector de color redondo; libre = además el
// selector de color libre. Cada pieza tiene su propio color, independiente del resto.
var _PIST_CARA='12 34 76 64';
// tarjeta del Taller: Pistero quieto en su bici (las piezas del modo Motorizado van en su propio grupo)
function _pistTallerSVG(o){ return (typeof _pistBiciSVG==='function')?_pistBiciSVG(o,{pedal:false}):''; }
var PIST_GRUPOS=[
  {g:'pistCascoGrid',k:'casco',l:function(){return PIST_CASCO;},chip:1,libre:1,col:function(it){return it.css||it.c;}},
  {g:'pistAcabadoGrid',k:'acabado',l:function(){return PIST_ACABADO;}},
  {g:'pistDisenoGrid',k:'diseno',l:function(){return PIST_DISENO;}},
  {g:'pistDisenoColGrid',k:'disenoCol',l:function(){return PIST_ACENTO;},chip:1,libre:1},
  {g:'pistAccGrid',k:'acc',l:function(){return PIST_ACC;}},
  {g:'pistAccColGrid',k:'accCol',l:function(){return PIST_PIEZA_COL;},chip:1,libre:1,vacio:_PIST_ORIGINAL},
  {g:'pistGadgetGrid',k:'gadget',l:function(){return PIST_GADGET;}},
  {g:'pistGadgetColGrid',k:'gadgetCol',l:function(){return PIST_PIEZA_COL;},chip:1,libre:1,vacio:_PIST_ORIGINAL},
  {g:'pistPielGrid',k:'piel',l:function(){return PIST_PIEL;}},
  {g:'pistPeloGrid',k:'pelo',l:function(){return PIST_PELO;}},
  {g:'pistPeloColGrid',k:'peloCol',l:function(){return PIST_PELO_COL;},chip:1,libre:1},
  {g:'pistOjosColGrid',k:'ojosCol',l:function(){return PIST_OJOS_COL;},chip:1,libre:1,vacio:'#16203a'},
  {g:'pistPestGrid',k:'pest',l:function(){return PIST_PEST;},zoom:_PIST_CARA},
  {g:'pistLentesGrid',k:'lentes',l:function(){return PIST_LENTES;},zoom:_PIST_CARA},
  {g:'pistLentesColGrid',k:'lentesCol',l:function(){return PIST_LENTES_COL;},chip:1,libre:1},
  {g:'pistMarcoColGrid',k:'marcoCol',l:function(){return PIST_PIEZA_COL;},chip:1,libre:1,vacio:_PIST_ORIGINAL},
  {g:'pistMarcaGrid',k:'marca',l:function(){return PIST_MARCA;},zoom:_PIST_CARA},
  {g:'pistLabiosGrid',k:'labios',l:function(){return PIST_LABIOS;},chip:1,libre:1,vacio:'#c98a73'},
  {g:'pistAroGrid',k:'aro',l:function(){return PIST_ARO;},zoom:_PIST_CARA},
  {g:'pistAroColGrid',k:'aroCol',l:function(){return PIST_ARO_COL;},chip:1,libre:1,vacio:'#e8c34a'},
  {g:'pistCuelloGrid',k:'cuello',l:function(){return PIST_CUELLO;}},
  {g:'pistPanoGrid',k:'pano',l:function(){return PIST_PANO;},chip:1,libre:1},
  {g:'pistBigoteGrid',k:'bigote',l:function(){return PIST_BIGOTE;}},
  {g:'pistBiciGrid',k:'biciTipo',l:function(){return PIST_BICI;},svg:function(o){ return _pistBiciSVG(o,{pedal:false}); }},
  {g:'pistBiciColGrid',k:'biciCol',l:function(){return PIST_BICI_COL;},chip:1,libre:1,vacio:_PIST_ORIGINAL},
  // ---- Taller (2026-10-04): cada tarjeta muestra a Pistero en su bici con esa pieza puesta
  {g:'pistBiciCol2Grid',k:'biciCol2',l:function(){return PIST_BICI_COL2;},chip:1,libre:1,vacio:'#334155'},
  {g:'pistMotorGrid',k:'motorTipo',l:function(){return PIST_MOTOR;},svg:function(o){ return _pistBiciSVG(o,{pedal:false,vehiculo:o.motorTipo==='moto'?'moto':'auto'}); }},
  {g:'pistBiciSkinGrid',k:'biciSkin',l:function(){return PIST_BICI_SKIN;},svg:_pistTallerSVG},
  {g:'pistBiciAcabGrid',k:'biciAcab',l:function(){return PIST_BICI_ACAB;},svg:_pistTallerSVG},
  {g:'pistNeumGrid',k:'biciNeum',l:function(){return PIST_NEUM;},svg:_pistTallerSVG},
  {g:'pistArosGrid',k:'biciAros',l:function(){return PIST_AROS;},svg:_pistTallerSVG},
  {g:'pistCargaGrid',k:'biciCarga',l:function(){return PIST_CARGA;},svg:_pistTallerSVG},
  {g:'pistExtraGrid',k:'biciExtra',l:function(){return PIST_EXTRA;},svg:_pistTallerSVG},
  {g:'pistBanderaGrid',k:'bandera',l:function(){return PIST_BANDERA;},svg:function(o){ return _pistTallerSVG(Object.assign({},o,{biciExtra:'banderin'})); }},
  {g:'pistMascotaGrid',k:'mascota',l:function(){return PIST_MASCOTA;},svg:_pistTallerSVG},
  {g:'pistTrajeGrid',k:'traje',l:function(){return PIST_TRAJE;},svg:_pistTallerSVG},
  {g:'pistEstelaGrid',k:'estela',l:function(){return PIST_ESTELA;},svg:_pistTallerSVG}
];
function renderPistCustom(){ if(typeof _ptRender==='function' && _ptRender()) return; var o=_pistOpts();
  PIST_GRUPOS.forEach(function(G){
    var el=document.getElementById(G.g); if(!el) return;
    // Solo se dibuja el grupo abierto (son ~250 opciones); al abrir otro,
    // _perfilAcordeon() vuelve a llamar a renderPistCustom().
    var det=el.closest&&el.closest('details'); if(det && !det.open) return;
    var lista=G.l(), actual=(o[G.k]||'');
    var html=lista.map(function(it){
      var sel=actual===it.id, on="_pistSet('"+G.k+"','"+it.id+"')";
      if(G.chip) return _pistChip(it.id?(G.col?G.col(it):it.id):G.vacio,sel,on,it.n);
      var m={}; m[G.k]=it.id; var svg=_pistoDe(Object.assign({},o,m),'feliz');
      if(G.zoom) svg=svg.replace('viewBox="0 0 100 84"','viewBox="'+G.zoom+'"');
      return _pistSwatch(svg,sel,on,it.n);
    }).join('');
    if(G.libre) html+=_pistChipLibre(G.k,actual,!!actual && !lista.some(function(it){return it.id===actual;}));
    el.innerHTML=html;
  });
}
function initCustomization(){ try{ renderPistCustom(); }catch(e){}
  const map = [['helmetGrid',helmetDesigns,selectedHelmet,'selectHelmet',false],
               ['skinGrid',skinOptions,selectedSkin,'selectSkin',false],
               ['accessoryGrid',lensOptions,selectedLens,'toggleLens',false],
               ['customizeHelmetGrid',helmetDesigns,selectedHelmet,'selectHelmet',false],
               ['customizeSkinGrid',skinOptions,selectedSkin,'selectSkin',false],
               ['customizeAccessoryGrid',lensOptions,selectedLens,'toggleLens',false],
               ['customizeExtrasGrid',extrasOptions,null,'toggleExtra',true],
               ['customizePielGrid',pielOptions,selectedPiel,'selectPiel',false],
               ['customizeOjosGrid',ojosOptions,selectedOjos,'selectOjos',false],
               ['customizeLabiosGrid',labiosOptions,selectedLabios,'selectLabios',false],
               ['customizeVelloGrid',velloFacialOptions,selectedVello,'selectVello',false],
               ['customizePeinadoGrid',peinadoOptions,selectedPeinado,'selectPeinado',false],
               ['customizePanueloGrid',panueloOptions,selectedPanuelo,'selectPanuelo',false]];
  map.forEach(function(m){ const el=document.getElementById(m[0]); if(el) el.innerHTML=gridHTML(m[1],m[2],m[3],m[4]); });
  updatePreview(); updateCustomizePreview(); renderEstilos(); renderFondosEsfera();
  renderActividadGrid(); renderPersonalidadGrid(); renderTemaUIGrid();
  actualizarBadgeAdmin();
}
// Aviso de nuevos registros desde la ultima vez que el admin miro el Panel Admin
// (sin servicios externos: se compara con la fecha guardada localmente).
async function actualizarBadgeAdmin(){
  if(cu!==ADMIN_ID) return;
  const badge=document.getElementById('adminNuevosBadge'); if(!badge) return;
  const lastSeen=parseInt(localStorage.getItem('lp_admin_last_seen')||'0');
  try{
    const snap=await db.collection('users').orderBy('createdAt','desc').limit(200).get();
    let nuevos=0;
    snap.forEach(function(doc){ const d=doc.data(); const t=(d.createdAt&&d.createdAt.seconds)?d.createdAt.seconds*1000:0; if(t>lastSeen) nuevos++; });
    if(nuevos>0){ badge.innerText='🔔 '+nuevos+' registro'+(nuevos>1?'s':'')+' nuevo'+(nuevos>1?'s':'')+' desde tu última visita'; badge.style.display='block'; }
    else { badge.style.display='none'; }
  }catch(e){}
  localStorage.setItem('lp_admin_last_seen', Date.now());
}
// El correo vive en /usersPrivate/{id} desde 2026-07-14 (ver reg() y
// firestore.rules) — solo el dueño o el admin real pueden leerlo. Las dos
// vistas de admin que antes leían d.email directo de /users (público) ahora
// piden este mapa aparte y lo cruzan por id de documento (mismo `cu`).
async function _mapaEmailsPrivados(){
  const map={};
  // 2026-08-23: sin limit() leia TODOS los correos privados. Se acota al mismo tope que
  // la lista que acompana (300): si algun dia hace falta el padron completo, es un
  // export paginado, no una lectura de golpe.
  try{ const snap=await db.collection('usersPrivate').limit(300).get(); snap.forEach(function(doc){ map[doc.id]=doc.data().email||''; }); }catch(e){}
  return map;
}
async function mostrarTodosRegistrados(){
  if(cu!==ADMIN_ID){ lpAviso('Solo el administrador puede ver esta lista.'); return; }
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-users"></i> Todos los registrados';
  const c=document.getElementById('modalContent');
  c.innerHTML='<p style="color:#888">Cargando...</p>';
  document.getElementById('userModal').classList.add('on');
  try{
    // 2026-08-23: sin limit() esto leia la coleccion ENTERA. Hoy son ~65 usuarios y no
    // se nota; con 5.000 son 5.000 lecturas de golpe (10% de la cuota diaria gratis de
    // TODO el proyecto) cada vez que se abre el panel. Se muestran los 300 mas nuevos,
    // que es para lo que sirve la pantalla; el total real sale de count(), que cuesta
    // 1 lectura por cada 1.000 documentos en vez de una por documento.
    const snap=await db.collection('users').orderBy('createdAt','desc').limit(300).get();
    const emails=await _mapaEmailsPrivados();
    let html='<p style="font-size:0.8rem;color:var(--p);margin-bottom:8px">Total: '+snap.size+' registrados</p>';
    snap.forEach(function(doc){
      const d=doc.data();
      const fecha=d.createdAt?new Date(d.createdAt.seconds*1000).toLocaleDateString():'—';
      const compartiendo=(d.lat&&d.lon)?'<span style="color:var(--g)"><i class="fas fa-location-dot"></i> comparte ubicación</span>':'<span style="color:#888">sin ubicación compartida</span>';
      html+='<div style="background:var(--gl);padding:8px;border-radius:8px;margin-bottom:6px"><strong style="font-size:0.85rem">'+escapeHTML(d.nombre||'(sin nombre)')+'</strong><div style="font-size:0.75rem;color:#9fb3c8">'+escapeHTML(emails[doc.id]||'')+'</div><div style="font-size:0.68rem;color:#7d8ba0;margin-top:2px">'+fecha+' · '+compartiendo+'</div></div>';
    });
    c.innerHTML=html;
  }catch(e){ c.innerHTML='<p style="color:#888">No se pudo cargar la lista.</p>'; }
}
function selectHelmet(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedHelmet=id; initCustomization(); }
function selectSkin(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedSkin=id; initCustomization(); }
function toggleLens(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedLens = (selectedLens===id) ? 'none' : id; initCustomization(); }
function toggleExtra(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } const i=selectedExtras.indexOf(id); if(i===-1) selectedExtras.push(id); else selectedExtras.splice(i,1); initCustomization(); }
function _perfilAcordeon(el){ document.querySelectorAll('#v-customize .pgrupo').forEach(function(d){ if(d!==el && d.open) d.open=false; }); if(el.open){ try{ renderPistCustom(); }catch(e){ console.warn('[pistero] no se pudo dibujar el grupo del armario', e); } } setTimeout(function(){ try{ el.scrollIntoView({block:'nearest'}); }catch(e){ /* gate:permitido scroll cosmetico, navegadores viejos sin scrollIntoView */ } }, 60); }
function _tabPersonalizar(tab){
  document.querySelectorAll('#tabsPersonalizar .tab-pill').forEach(function(b){ b.classList.toggle('active', b.dataset.tab===tab); });
  document.querySelectorAll('#v-customize .tab-panel').forEach(function(p){ p.classList.toggle('active', p.dataset.panel===tab); });
}
function selectPiel(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedPiel=id; initCustomization(); }
function selectOjos(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedOjos=id; initCustomization(); }
function selectLabios(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedLabios=id; initCustomization(); }
function selectVello(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedVello=id; initCustomization(); }
function selectPeinado(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedPeinado=id; initCustomization(); }
function selectPanuelo(id){ if(!estaDesbloqueado(id)){ mostrarTienda(); return; } selectedPanuelo=id; initCustomization(); }
function updatePreview(){ const p=document.getElementById('preview-svg'); if(p) p.innerHTML=_pistoNuevo('feliz'); const n=document.getElementById('characterNameDisplay'); if(n&&nombreUsuario) n.innerText=nombreUsuario; }
function updateCustomizePreview(){ if(typeof _ptPreview==='function' && document.getElementById('ptPanel')){ _ptPreview(); return; } const p=document.getElementById('customize-preview-svg'); if(p) p.innerHTML=_pistoNuevo('feliz'); const n=document.getElementById('customizeCharacterName'); if(n&&nombreUsuario) n.innerText=nombreUsuario; }
function saveCustomization(){
  localStorage.setItem('lp_helmet_'+cu, selectedHelmet);
  localStorage.setItem('lp_lens_'+cu, selectedLens);
  localStorage.setItem('lp_skin_'+cu, selectedSkin);
  localStorage.setItem('lp_extras_'+cu, JSON.stringify(selectedExtras));
  localStorage.setItem('lp_piel_'+cu, selectedPiel);
  localStorage.setItem('lp_ojos_'+cu, selectedOjos);
  localStorage.setItem('lp_labios_'+cu, selectedLabios);
  localStorage.setItem('lp_vello_'+cu, selectedVello);
  localStorage.setItem('lp_peinado_'+cu, selectedPeinado);
  localStorage.setItem('lp_panuelo_'+cu, selectedPanuelo);
  // Auditoría 2026-09-22: lo local (arriba) es lo GARANTIZADO -- por eso el mensaje de
  // éxito no espera a la nube. Pero /users es el doc PÚBLICO que otros ciclistas leen para
  // dibujar tu marcador en el mapa (subscribeToUsers) -- si este update fallaba en
  // silencio (antes .catch vacío), vos te veías bien en tu propio teléfono pero los demás
  // seguían viendo tu casco/skin viejo en el mapa, sin ningún aviso de que la nube no se
  // había actualizado.
  db.collection('users').doc(cu).update({helmet:selectedHelmet, lens:selectedLens, skin:selectedSkin, extras:selectedExtras, piel:selectedPiel, ojos:selectedOjos, labios:selectedLabios, vello:selectedVello, peinado:selectedPeinado, panuelo:selectedPanuelo}).catch(function(err){
    try{ if(window.Sentry) Sentry.captureException(err,{tags:{donde:'saveCustomization'}}); }catch(_e){}
    h('Tu personaje quedó guardado en este teléfono, pero no se pudo sincronizar con la nube -- otros ciclistas podrían seguir viéndote con el look anterior. Revisa tu conexión.');
  });
  if(helmetMarker) helmetMarker.setIcon(L.divIcon({className:'',html:riderMarkerHTML(selectedHelmet, skinColor(selectedSkin), true),iconSize:[50,34],iconAnchor:[25,17]}));
  h("Tu personaje quedó listo. Te ves de lujo.");
}
