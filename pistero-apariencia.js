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
function riderMarkerHTML(helmetId, accent, mine){ var _o=(mine&&typeof _pistOpts==='function')?_pistOpts():{casco:helmetId,piel:'claro',lentes:''}; var _cc=(mine&&typeof _pistCascoCol==='function')?_pistCascoCol():(((typeof helmetDesigns!=='undefined'&&helmetDesigns.find(function(h){return h.id===helmetId;}))||{}).color||'#00aaff'); var _pc=(mine&&typeof _pistPielCol==='function')?_pistPielCol():'#f4c9a0'; var blinkDelay=(Math.random()*RIDER_BLINK_MAX_S).toFixed(2)+'s'; return '<div class="helmet-pin'+(mine?' mine':'')+'"><div class="hp-in" style="--blink-delay:'+blinkDelay+'">'+_pisteroExprSVG('feliz', _cc, _pc, _o.lentes, _o.bigote, _o.acc, _o)+'</div></div>'; }
// Popup de un ciclista en el mapa (2026-08-31, pedido de Inty: "no quiero nada generico").
// Reusa EXACTAMENTE el mismo color de casco que ya pinta riderMarkerHTML() para el pin
// (busca en helmetDesigns por helmetId) y dibuja el mismo Pistero, más grande, adentro del
// popup -- cero datos nuevos, cero lecturas extra a Firestore.
function _lpAvatarSVG(helmetId){
  var cc = ((typeof helmetDesigns!=='undefined' && helmetDesigns.find(function(h){return h.id===helmetId;}))||{}).color || '#00aaff';
  var svg = (typeof _pisteroExprSVG==='function') ? _pisteroExprSVG('feliz', cc, '#f4c9a0', '', '', '', {casco:helmetId,piel:'claro',lentes:''}) : '';
  return {cc:cc, svg:svg};
}
function _lpPopupCiclista(nombre, helmetId, userId){
  var av = _lpAvatarSVG(helmetId);
  return '<div class="lp-pop" style="--cc:'+av.cc+'"><div class="lp-ic lp-av">'+av.svg+'</div><div class="lp-body"><div class="lp-t">'+escapeHTML(nombre)+'</div><a href="#" class="lp-cta" onclick="verPerfilUsuario(\''+userId+'\');return false"><i class="fas fa-id-card"></i> Ver perfil</a></div></div>';
}

// ===== Cara expresiva de Pistero (casco + ojos kawaii + expresiones + mirada) =====
function _bigoteSVG(id){ if(id==='bigote') return '<path d="M40 70 Q45 67.5 50 70.5 Q55 67.5 60 70 Q56 73.5 50 72 Q44 73.5 40 70 Z" fill="#5a3a1a"/>'; if(id==='candado') return '<path d="M40 70 Q45 67.5 50 70.5 Q55 67.5 60 70 Q56 73.5 50 72 Q44 73.5 40 70 Z" fill="#5a3a1a"/><path d="M46.5 77 Q50 81.5 53.5 77 Q51.5 78.7 50 78.7 Q48.5 78.7 46.5 77 Z" fill="#5a3a1a"/>'; if(id==='barba') return '<path d="M27 65 Q29 81 50 83 Q71 81 73 65 Q63 73 50 72 Q37 73 27 65 Z" fill="#5a3a1a" opacity="0.92"/>'; return ''; }
function _accCascoSVG(id){ if(id==='camara') return '<rect x="45" y="21" width="10" height="7" rx="1.5" fill="#1a1a1a"/><circle cx="50" cy="24.5" r="2.2" fill="#3a7bd5"/><circle cx="50" cy="24.5" r="0.9" fill="#cfe8ff"/>'; if(id==='luz') return '<circle cx="50" cy="22" r="3.4" fill="#fff59d"/><path d="M50 22 L44 16 M50 22 L56 16 M50 22 L50 14" stroke="#fff59d" stroke-width="1.1" opacity="0.6" stroke-linecap="round"/>'; if(id==='cresta') return '<path d="M40 27 Q44 13 47 26" fill="none" stroke="#fc4c02" stroke-width="3" stroke-linecap="round"/><path d="M47 26 Q50 10 53 26" fill="none" stroke="#fc4c02" stroke-width="3" stroke-linecap="round"/><path d="M53 26 Q56 13 60 27" fill="none" stroke="#fc4c02" stroke-width="3" stroke-linecap="round"/>'; if(id==='antena') return '<line x1="50" y1="23" x2="50" y2="11" stroke="#333" stroke-width="1.5"/><circle cx="50" cy="10" r="2.5" fill="#fc4c02"/>'; return ''; }
function _lentesSVG(id, col){ col=col||'#16203a'; if(id==='deportivas') return '<path d="M28 58 Q50 56 72 58 Q73 63 70 68 Q50 66 30 68 Q27 63 28 58 Z" fill="'+col+'" opacity=".92"/><path d="M29 58.5 Q50 56.5 71 58.5" stroke="rgba(255,255,255,.45)" stroke-width="1.2" fill="none"/><path d="M48 61.5 L52 61.5" stroke="#0b1220" stroke-width="2"/>'; if(id==='redondas') return '<g stroke="#3a3f52" stroke-width="1.8" fill="'+col+'" fill-opacity=".55"><circle cx="40" cy="63" r="8"/><circle cx="60" cy="63" r="8"/></g><path d="M48 63 L52 63" stroke="#3a3f52" stroke-width="1.8"/><path d="M32 62 L26.5 60.5" stroke="#3a3f52" stroke-width="1.6" fill="none"/><path d="M68 62 L73.5 60.5" stroke="#3a3f52" stroke-width="1.6" fill="none"/>'; if(id==='aviador') return '<g stroke="#c9a227" stroke-width="1.3"><path d="M31 59.5 Q41 58.5 48.5 60.5 Q48.5 68 40 68.5 Q31.5 68 31 60.5 Z" fill="'+col+'" opacity=".85"/><path d="M69 59.5 Q59 58.5 51.5 60.5 Q51.5 68 60 68.5 Q68.5 68 69 60.5 Z" fill="'+col+'" opacity=".85"/><path d="M48.5 60.5 Q50 60 51.5 60.5" fill="none"/><path d="M31 60 L26.5 58.5" fill="none"/><path d="M69 60 L73.5 58.5" fill="none"/></g>'; return ''; }
function _pestanasSVG(){ return '<g stroke="#16203a" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M33.5 58.5 Q30 57 28.5 54.5"/><path d="M35.5 57 Q33 55.2 31.5 52.8"/><path d="M38 56.2 Q36.5 54 35.8 51.6"/><path d="M66.5 58.5 Q70 57 71.5 54.5"/><path d="M64.5 57 Q67 55.2 68.5 52.8"/><path d="M62 56.2 Q63.5 54 64.2 51.6"/></g>'; }
function _peloSVG(col){ col=col||'#4a3222'; return '<g fill="'+col+'"><path d="M13 53 Q11 60 15 60 Q14 56 18 53 Z"/><path d="M87 53 Q89 60 85 60 Q86 56 82 53 Z"/><path d="M84 50 Q98 58 94 74 Q90 82 84 80 Q90 70 82 58 Q80 53 84 50 Z"/><circle cx="83" cy="49" r="7"/><circle cx="83" cy="49" r="7" fill="rgba(0,0,0,.14)"/><circle cx="83" cy="49" r="4.6"/></g><circle cx="83" cy="49" r="2.2" fill="rgba(255,255,255,.25)"/>'; }
function _aroSVG(id){ if(id==='argolla') return '<g fill="none" stroke="#e8c34a" stroke-width="2.2"><circle cx="15" cy="70" r="4"/><circle cx="85" cy="70" r="4"/></g>'; if(id==='perla') return '<circle cx="15" cy="69" r="2.6" fill="#fef3c7" stroke="#e8c34a" stroke-width="0.8"/><circle cx="85" cy="69" r="2.6" fill="#fef3c7" stroke="#e8c34a" stroke-width="0.8"/>'; return ''; }
function _panoletaSVG(col){ col=col||'#fc4c02'; return '<path d="M22 74 Q50 86 78 74 Q80 82 72 86 Q50 92 28 86 Q20 82 22 74 Z" fill="'+col+'"/><path d="M22 74 Q50 84 78 74" stroke="rgba(0,0,0,.15)" stroke-width="1.5" fill="none"/><path d="M34 79 l3 4 M44 81 l2 4 M56 81 l-2 4 M66 79 l-3 4" stroke="rgba(255,255,255,.4)" stroke-width="1" stroke-linecap="round"/>'; }
function _pisteroExprSVG(expr, helmetCol, skinCol, lentes, bigote, accesorio, x){
  x=x||{};
  var col=(helmetCol||'#00aaff'), accent='#fc4c02', skin=(skinCol||'#f4c9a0');
  var base='<path d="M16 50 Q16 78 50 80 Q84 78 84 50 Z" fill="'+skin+'"/>'
    +'<path d="M12 54 A38 36 0 0 1 88 54 Z" fill="'+col+'"/>'
    +'<path d="M12 54 Q50 66 88 54 L88 48 Q50 60 12 48 Z" fill="rgba(0,0,0,0.3)"/>'
    +'<path d="M50 22 L50 52" stroke="'+accent+'" stroke-width="6" stroke-linecap="round"/>';
  var cheeks='<ellipse cx="30" cy="71" rx="5.5" ry="3.2" fill="#ff9db0" opacity=".55"/><ellipse cx="70" cy="71" rx="5.5" ry="3.2" fill="#ff9db0" opacity=".55"/>';
  var SMILE='<path d="M43 73 Q50 79 57 73" stroke="#7a4a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
  function eO(x,blink){ return '<g class="lp-eye'+(blink?' lp-parpadeo':'')+'"><ellipse cx="'+x+'" cy="63" rx="6.2" ry="7.6" fill="#16203a"/><g class="lp-iris"><circle cx="'+(x-2.2)+'" cy="60" r="2.5" fill="#fff"/><circle cx="'+(x+2)+'" cy="65.5" r="1.2" fill="#fff" opacity=".85"/></g></g>'; }
  function eH(x){ return '<path d="M'+(x-6)+' 64 Q'+x+' 57 '+(x+6)+' 64" stroke="#16203a" stroke-width="2.8" fill="none" stroke-linecap="round"/>'; }
  function eW(x){ return '<g class="lp-eye"><ellipse cx="'+x+'" cy="62.5" rx="7" ry="8.8" fill="#16203a"/><g class="lp-iris"><circle cx="'+(x-2.5)+'" cy="59" r="2.9" fill="#fff"/><circle cx="'+(x+2.4)+'" cy="66" r="1.4" fill="#fff" opacity=".85"/></g></g>'; }
  function eU(x){ return '<ellipse cx="'+x+'" cy="61" rx="6" ry="7.4" fill="#16203a"/><circle cx="'+(x-1)+'" cy="56.5" r="2.6" fill="#fff"/>'; }
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
  return '<svg viewBox="0 0 100 84" xmlns="http://www.w3.org/2000/svg">'+(x.pelo?_peloSVG(x.peloCol):'')+base+(accesorio?_accCascoSVG(accesorio):'')+(x.aro?_aroSVG(x.aro):'')+eyes+(x.pest?_pestanasSVG():'')+(lentes?_lentesSVG(lentes,x.lentesCol):'')+cheeks+mouth+(bigote?_bigoteSVG(bigote):'')+(x.pano?_panoletaSVG(x.pano):'')+'</svg>';
}
var _pisteroExprActual='feliz';
var _pisteroMood=null;
function _setExprPistero(expr){
  if(!expr) expr='feliz';
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
  if(cu){ try{ db.collection('users').doc(cu).set({unlocked:firebase.firestore.FieldValue.arrayUnion(id)},{merge:true}); }catch(e){} }
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
var PIST_CASCO=[{id:'azul',c:'#00aaff',n:'Azul'},{id:'naranja',c:'#fc4c02',n:'Naranja'},{id:'verde',c:'#5c8a3a',n:'Verde'},{id:'morado',c:'#7c3aed',n:'Morado'},{id:'rojo',c:'#e11d48',n:'Rojo'},{id:'negro',c:'#20242e',n:'Negro'},{id:'celeste',c:'#38bdf8',n:'Celeste'},{id:'dorado',c:'#d4a017',n:'Dorado'}];
var PIST_PIEL=[{id:'claro',c:'#f4c9a0',n:'Claro'},{id:'medio',c:'#e8b48a',n:'Medio'},{id:'trigueno',c:'#d9a06b',n:'Trigueño'},{id:'moreno',c:'#c68642',n:'Moreno'},{id:'oscuro',c:'#8d5524',n:'Oscuro'}];
var PIST_LENTES=[{id:'',n:'Sin lentes'},{id:'deportivas',n:'Deportivas'},{id:'redondas',n:'Redondas'},{id:'aviador',n:'Aviador'}];
var PIST_BIGOTE=[{id:'',n:'Sin barba'},{id:'bigote',n:'Bigote'},{id:'candado',n:'Candado'},{id:'barba',n:'Barba'}];
var PIST_ACC=[{id:'',n:'Ninguno'},{id:'camara',n:'Cámara'},{id:'luz',n:'Luz'},{id:'cresta',n:'Cresta'},{id:'antena',n:'Antena'}];
var PIST_PELO=[{id:'',n:'Sin pelo'},{id:'mono',n:'Moño con cola'}];
var PIST_PELO_COL=[{id:'#4a3222',n:'Castaño'},{id:'#d0a63a',n:'Rubio'},{id:'#1c130c',n:'Negro'},{id:'#8a3b1e',n:'Rojizo'},{id:'#6b7280',n:'Canoso'}];
var PIST_LENTES_COL=[{id:'#16203a',n:'Negro'},{id:'#1e40af',n:'Azul'},{id:'#fc4c02',n:'Naranja'},{id:'#ec4899',n:'Rosa'},{id:'#166534',n:'Verde'},{id:'#6d28d9',n:'Morado'}];
var PIST_PEST=[{id:'',n:'Sin pestañas'},{id:'si',n:'Con pestañas'}];
var PIST_ARO=[{id:'',n:'Sin aros'},{id:'argolla',n:'Argolla'},{id:'perla',n:'Perla'}];
var PIST_PANO=[{id:'',n:'Sin pañoleta'},{id:'#fc4c02',n:'Naranja'},{id:'#1e40af',n:'Azul'},{id:'#ec4899',n:'Rosa'}];
function _pistOpts(){ try{ return Object.assign({casco:'azul',piel:'claro',lentes:'',lentesCol:'#16203a',bigote:'',acc:'',pelo:'',peloCol:'#4a3222',pest:'',aro:'',pano:''}, JSON.parse(localStorage.getItem('lp_pist_'+(cu||'anon'))||'{}')); }catch(e){ return {casco:'azul',piel:'claro',lentes:'',lentesCol:'#16203a',bigote:'',acc:'',pelo:'',peloCol:'#4a3222',pest:'',aro:'',pano:''}; } }
function _pistSet(k,v){ try{ var o=_pistOpts(); o[k]=v; localStorage.setItem('lp_pist_'+(cu||'anon'), JSON.stringify(o)); }catch(e){} if(cu){ try{ db.collection('users').doc(cu).set({pistCasco:_pistOpts().casco,pistPiel:_pistOpts().piel,pistLentes:_pistOpts().lentes,pistLentesCol:_pistOpts().lentesCol,pistBigote:_pistOpts().bigote,pistAcc:_pistOpts().acc,pistPelo:_pistOpts().pelo,pistPeloCol:_pistOpts().peloCol,pistPest:_pistOpts().pest,pistAro:_pistOpts().aro,pistPano:_pistOpts().pano},{merge:true}); }catch(e){} } renderPistCustom(); if(typeof updateCustomizePreview==='function') updateCustomizePreview(); if(typeof _setExprPistero==='function') _setExprPistero(_pisteroExprActual||'feliz'); if(typeof subscribeToUsers==='function' && !ghostMode){ try{ if(_miMarker&&mp){} }catch(e){} } }
function _pistCascoCol(){ var o=_pistOpts(); var h=PIST_CASCO.find(function(x){return x.id===o.casco;}); return h?h.c:'#00aaff'; }
function _pistPielCol(){ var o=_pistOpts(); var p=PIST_PIEL.find(function(x){return x.id===o.piel;}); return p?p.c:'#f4c9a0'; }
function _pistoNuevo(expr){ var o=_pistOpts(); return _pisteroExprSVG(expr||'feliz', _pistCascoCol(), _pistPielCol(), o.lentes, o.bigote, o.acc, o); }
// Mismo Pistero de _pistoNuevo() pero para un `pistOpts` ARBITRARIO (de Firestore,
// no de localStorage) -- _pistOpts()/_pistoNuevo() estan atados al usuario logueado
// (leen 'lp_pist_'+cu del dispositivo), asi que no sirven para dibujar el personaje
// de OTRO usuario. Usado en verPerfilUsuario() para que el perfil de comunidad
// muestre el Pistero real de quien sea, no siempre el mismo por defecto.
function _pistoDe(opts, expr){
  var o=Object.assign({casco:'azul',piel:'claro',lentes:'',lentesCol:'#16203a',bigote:'',acc:'',pelo:'',peloCol:'#4a3222',pest:'',aro:'',pano:''}, opts||{});
  var h=PIST_CASCO.find(function(x){return x.id===o.casco;});
  var p=PIST_PIEL.find(function(x){return x.id===o.piel;});
  return _pisteroExprSVG(expr||'feliz', h?h.c:'#00aaff', p?p.c:'#f4c9a0', o.lentes, o.bigote, o.acc, o);
}
function _pistSwatch(inner,sel,onclick,label){ return '<div class="pist-sw'+(sel?' sel':'')+'" onclick="'+onclick+'" title="'+label+'"><div class="pist-sw-ico">'+inner+'</div><div class="pist-sw-lbl">'+label+'</div></div>'; }
function renderPistCustom(){ var o=_pistOpts();
  function _mix(extra){ return Object.assign({},o,extra||{}); }
  var gc=document.getElementById('pistCascoGrid'); if(gc) gc.innerHTML=PIST_CASCO.map(function(h){ return _pistSwatch(_pisteroExprSVG('feliz',h.c,_pistPielCol(),o.lentes,o.bigote,o.acc,o),o.casco===h.id,"_pistSet('casco','"+h.id+"')",h.n); }).join('');
  var gp=document.getElementById('pistPielGrid'); if(gp) gp.innerHTML=PIST_PIEL.map(function(p){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),p.c,o.lentes,o.bigote,o.acc,o),o.piel===p.id,"_pistSet('piel','"+p.id+"')",p.n); }).join('');
  var gpe=document.getElementById('pistPeloGrid'); if(gpe) gpe.innerHTML=PIST_PELO.map(function(p){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),o.lentes,o.bigote,o.acc,_mix({pelo:p.id})),o.pelo===p.id,"_pistSet('pelo','"+p.id+"')",p.n); }).join('');
  var gpc=document.getElementById('pistPeloColGrid'); if(gpc) gpc.innerHTML=PIST_PELO_COL.map(function(c){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),o.lentes,o.bigote,o.acc,_mix({pelo:'mono',peloCol:c.id})),o.peloCol===c.id,"_pistSet('peloCol','"+c.id+"')",c.n); }).join('');
  var gl=document.getElementById('pistLentesGrid'); if(gl) gl.innerHTML=PIST_LENTES.map(function(l){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),l.id,o.bigote,o.acc,o),o.lentes===l.id,"_pistSet('lentes','"+l.id+"')",l.n); }).join('');
  var glc=document.getElementById('pistLentesColGrid'); if(glc) glc.innerHTML=PIST_LENTES_COL.map(function(c){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),o.lentes||'deportivas',o.bigote,o.acc,_mix({lentesCol:c.id})),o.lentesCol===c.id,"_pistSet('lentesCol','"+c.id+"')",c.n); }).join('');
  var gpt=document.getElementById('pistPestGrid'); if(gpt) gpt.innerHTML=PIST_PEST.map(function(p){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),o.lentes,o.bigote,o.acc,_mix({pest:p.id})),o.pest===p.id,"_pistSet('pest','"+p.id+"')",p.n); }).join('');
  var gan=document.getElementById('pistAroGrid'); if(gan) gan.innerHTML=PIST_ARO.map(function(a){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),o.lentes,o.bigote,o.acc,_mix({aro:a.id})),o.aro===a.id,"_pistSet('aro','"+a.id+"')",a.n); }).join('');
  var gpn=document.getElementById('pistPanoGrid'); if(gpn) gpn.innerHTML=PIST_PANO.map(function(p){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),o.lentes,o.bigote,o.acc,_mix({pano:p.id})),o.pano===p.id,"_pistSet('pano','"+p.id+"')",p.n); }).join('');
  var gb=document.getElementById('pistBigoteGrid'); if(gb) gb.innerHTML=PIST_BIGOTE.map(function(b){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),o.lentes,b.id,o.acc,o),o.bigote===b.id,"_pistSet('bigote','"+b.id+"')",b.n); }).join('');
  var ga=document.getElementById('pistAccGrid'); if(ga) ga.innerHTML=PIST_ACC.map(function(a){ return _pistSwatch(_pisteroExprSVG('feliz',_pistCascoCol(),_pistPielCol(),o.lentes,o.bigote,a.id,o),o.acc===a.id,"_pistSet('acc','"+a.id+"')",a.n); }).join('');
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
function _perfilAcordeon(el){ document.querySelectorAll('#v-customize .pgrupo').forEach(function(d){ if(d!==el && d.open) d.open=false; }); setTimeout(function(){ try{ el.scrollIntoView({block:'nearest'}); }catch(e){} }, 60); }
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
function updateCustomizePreview(){ const p=document.getElementById('customize-preview-svg'); if(p) p.innerHTML=_pistoNuevo('feliz'); const n=document.getElementById('customizeCharacterName'); if(n&&nombreUsuario) n.innerText=nombreUsuario; }
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
  db.collection('users').doc(cu).update({helmet:selectedHelmet, lens:selectedLens, skin:selectedSkin, extras:selectedExtras, piel:selectedPiel, ojos:selectedOjos, labios:selectedLabios, vello:selectedVello, peinado:selectedPeinado, panuelo:selectedPanuelo}).catch(function(){});
  if(helmetMarker) helmetMarker.setIcon(L.divIcon({className:'',html:riderMarkerHTML(selectedHelmet, skinColor(selectedSkin), true),iconSize:[50,34],iconAnchor:[25,17]}));
  h("Tu personaje quedó listo. Te ves de lujo.");
}
