// Pistero v2 — "armario": catálogo ampliado + piezas SVG del personaje.
// Mismo formato de siempre (SVG inline, viewBox 0 0 100 84, mismas coordenadas de
// cara/ojos/boca), así que todo lo guardado antes sigue dibujándose igual.
// Lo consume pistero-apariencia.js (_pisteroExprSVG / renderPistCustom).
//
// Geometría de referencia:
//   casco  = 'M12 54 A38 36 0 0 1 88 54 Z'  (cúpula, tope en y=18)
//   cara   = 'M16 50 Q16 78 50 80 Q84 78 84 50 Z' (borde: y64→x19, y71→x24)
//   ojos   = (40,63) y (60,63) · boca ≈ y74 · mentón y=80 (el lienzo termina en 84)
//
// PELO (pedido de Inty 2026-10-04): el moño con la cola en gancho no era lógico. Con
// casco puesto el pelo SOLO puede salir por debajo del casco: patillas, mechones que
// enmarcan la cara y largo que cae recto con la gravedad. Ningún mechón se curva
// hacia arriba ni hace gancho.

var _lpUid=0;
function _lpMirror(s){ return '<g transform="matrix(-1 0 0 1 100 0)">'+s+'</g>'; }
function _lpStar(cx,cy,R,r){ r=r||R*0.45; var p=''; for(var i=0;i<10;i++){ var a=-Math.PI/2+i*Math.PI/5, rr=(i%2?r:R); p+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(2)+' '+(cy+rr*Math.sin(a)).toFixed(2)+' '; } return p+'Z'; }
function _lpHeart(cx,cy,s){ return 'M'+cx+' '+(cy+s*0.9)+' C'+(cx-s*1.6)+' '+(cy-s*0.2)+' '+(cx-s*0.6)+' '+(cy-s*1.3)+' '+cx+' '+(cy-s*0.35)+' C'+(cx+s*0.6)+' '+(cy-s*1.3)+' '+(cx+s*1.6)+' '+(cy-s*0.2)+' '+cx+' '+(cy+s*0.9)+' Z'; }

// ───────────────────────── Catálogo ─────────────────────────
var PIST_CASCO=[
  {id:'azul',c:'#00aaff',n:'Azul'},{id:'naranja',c:'#fc4c02',n:'Naranja'},{id:'verde',c:'#5c8a3a',n:'Verde'},
  {id:'morado',c:'#7c3aed',n:'Morado'},{id:'rojo',c:'#e11d48',n:'Rojo'},{id:'negro',c:'#20242e',n:'Negro'},
  {id:'celeste',c:'#38bdf8',n:'Celeste'},{id:'dorado',c:'#d4a017',n:'Dorado',fx:'metal'},
  {id:'blanco',c:'#f1f5f9',n:'Blanco'},{id:'rosa',c:'#f472b6',n:'Rosa'},{id:'menta',c:'#5eead4',n:'Menta'},
  {id:'lima',c:'#a3e635',n:'Lima'},{id:'amarillo',c:'#facc15',n:'Amarillo'},{id:'coral',c:'#fb7185',n:'Coral'},
  {id:'lila',c:'#c4b5fd',n:'Lila'},{id:'militar',c:'#556b2f',n:'Militar'},
  {id:'cromo',c:'#b8c2cf',n:'Cromo',fx:'metal'},{id:'cobre',c:'#c26a3d',n:'Cobre',fx:'metal'},
  {id:'perla',c:'#f8fafc',n:'Perla',fx:'perla'},{id:'atardecer',c:'#f97316',n:'Atardecer',fx:'atardecer'},
  {id:'arcoiris',c:'#ef4444',n:'Arcoíris',fx:'arcoiris'},{id:'galaxia',c:'#1e1b4b',n:'Galaxia',fx:'galaxia'},
  {id:'oceano',c:'#0369a1',n:'Océano',fx:'oceano'},{id:'neon',c:'#39ff14',n:'Neón',fx:'neon'}
];
var PIST_DISENO=[
  {id:'',n:'Liso'},{id:'franja',n:'Franja'},{id:'doble',n:'Doble franja'},{id:'rayo',n:'Rayo'},
  {id:'llamas',n:'Llamas'},{id:'cuadros',n:'Cuadros'},{id:'estrellas',n:'Estrellas'},{id:'lunares',n:'Lunares'},
  {id:'tigre',n:'Tigre'},{id:'ondas',n:'Ondas'},{id:'corazones',n:'Corazones'},{id:'camuflaje',n:'Camuflaje'},
  {id:'zigzag',n:'Zigzag'},{id:'chile',n:'Chile'},{id:'numero',n:'Carrera'}
];
var PIST_ACENTO=[
  {id:'#fc4c02',n:'Naranja'},{id:'#ffffff',n:'Blanco'},{id:'#111827',n:'Negro'},{id:'#facc15',n:'Amarillo'},
  {id:'#ec4899',n:'Rosa'},{id:'#22d3ee',n:'Celeste'},{id:'#84cc16',n:'Lima'},{id:'#8b5cf6',n:'Morado'},
  {id:'#dc2626',n:'Rojo'},{id:'#d4a017',n:'Dorado'}
];
var PIST_PIEL=[{id:'claro',c:'#f4c9a0',n:'Claro'},{id:'porcelana',c:'#fbe0cc',n:'Porcelana'},{id:'medio',c:'#e8b48a',n:'Medio'},{id:'trigueno',c:'#d9a06b',n:'Trigueño'},{id:'canela',c:'#b97a4a',n:'Canela'},{id:'moreno',c:'#c68642',n:'Moreno'},{id:'oscuro',c:'#8d5524',n:'Oscuro'},{id:'ebano',c:'#5c3a1e',n:'Ébano'}];
var PIST_PELO=[
  {id:'',n:'Sin pelo'},{id:'corto',n:'Corto'},{id:'flequillo',n:'Flequillo'},{id:'melena',n:'Melena'},
  {id:'largo',n:'Largo liso'},{id:'ondulado',n:'Ondulado'},{id:'rizado',n:'Rizado'},{id:'afro',n:'Afro'},
  {id:'cola',n:'Cola al lado'},{id:'coletas',n:'Coletas'},{id:'trenzas',n:'Trenzas'},{id:'trenza',n:'Trenza'}
];
var PIST_PELO_COL=[
  {id:'#4a3222',n:'Castaño'},{id:'#1c130c',n:'Negro'},{id:'#7a5232',n:'Castaño claro'},{id:'#a8683a',n:'Caramelo'},
  {id:'#d0a63a',n:'Rubio'},{id:'#eadfc4',n:'Platinado'},{id:'#8a3b1e',n:'Rojizo'},{id:'#c4541e',n:'Cobrizo'},
  {id:'#6b7280',n:'Canoso'},{id:'#f472b6',n:'Rosa'},{id:'#a78bfa',n:'Lila'},{id:'#3b82f6',n:'Azul'},
  {id:'#34d399',n:'Menta'},{id:'#ef4444',n:'Rojo fuego'}
];
var PIST_LENTES=[
  {id:'',n:'Sin lentes'},{id:'deportivas',n:'Deportivas'},{id:'redondas',n:'Redondas'},{id:'aviador',n:'Aviador'},
  {id:'escudo',n:'Escudo'},{id:'mascara',n:'Antiparras'},{id:'cuadrados',n:'Retro'},{id:'gato',n:'Ojo de gato'},
  {id:'corazon',n:'Corazón'},{id:'estrella',n:'Estrella'}
];
var PIST_LENTES_COL=[
  {id:'#16203a',n:'Negro'},{id:'#1e40af',n:'Azul'},{id:'#fc4c02',n:'Naranja'},{id:'#ec4899',n:'Rosa'},
  {id:'#166534',n:'Verde'},{id:'#6d28d9',n:'Morado'},{id:'#b8860b',n:'Dorado'},{id:'#94a3b8',n:'Plata'},
  {id:'#0ea5e9',n:'Turquesa'},{id:'#dc2626',n:'Rojo'},{id:'#f59e0b',n:'Ámbar'}
];
var PIST_OJOS_COL=[{id:'',n:'Noche'},{id:'#4a2a16',n:'Café'},{id:'#1d4ed8',n:'Azul'},{id:'#15803d',n:'Verde'},{id:'#a16207',n:'Miel'},{id:'#475569',n:'Gris'},{id:'#6d28d9',n:'Violeta'}];
var PIST_PEST=[{id:'',n:'Sin pestañas'},{id:'si',n:'Con pestañas'},{id:'largas',n:'Largas'}];
var PIST_LABIOS=[{id:'',n:'Natural'},{id:'#e75480',n:'Rosa'},{id:'#c81d3a',n:'Rojo'},{id:'#f2665a',n:'Coral'},{id:'#7b1e3a',n:'Vino'},{id:'#b56b5a',n:'Nude'},{id:'#9333ea',n:'Uva'}];
var PIST_MARCA=[
  {id:'',n:'Nada'},{id:'pecas',n:'Pecas'},{id:'rubor',n:'Rubor'},{id:'lunar',n:'Lunar'},{id:'barro',n:'Barro'},
  {id:'curita',n:'Curita'},{id:'corazon',n:'Corazón'},{id:'brillos',n:'Brillos'},{id:'guerrero',n:'Pintura'}
];
var PIST_BIGOTE=[{id:'',n:'Sin barba'},{id:'bigote',n:'Bigote'},{id:'candado',n:'Candado'},{id:'barba',n:'Barba'}];
var PIST_ACC=[
  {id:'',n:'Ninguno'},{id:'camara',n:'Cámara'},{id:'luz',n:'Luz'},{id:'cresta',n:'Cresta'},{id:'antena',n:'Antena'},
  {id:'vikingo',n:'Vikingo'},{id:'diablo',n:'Diablito'},{id:'unicornio',n:'Unicornio'},{id:'gato',n:'Gato'},
  {id:'oso',n:'Oso'},{id:'conejo',n:'Conejo'},{id:'corona',n:'Corona'},{id:'aureola',n:'Aureola'},
  {id:'helice',n:'Hélice'},{id:'flor',n:'Flor'},{id:'lazo',n:'Lazo'},{id:'alas',n:'Alas'},
  {id:'pinchos',n:'Punk'},{id:'dino',n:'Dino'},{id:'brote',n:'Brote'},{id:'estrella',n:'Estrellita'}
];
var PIST_GADGET=[
  {id:'',n:'Nada'},{id:'visera',n:'Visera MTB'},{id:'gopro',n:'Cámara lateral'},{id:'luzroja',n:'Luz trasera'},
  {id:'espejo',n:'Espejo'},{id:'reflectante',n:'Reflectante'},{id:'banderin',n:'Banderín'}
];
var PIST_ARO=[{id:'',n:'Sin aros'},{id:'argolla',n:'Argolla'},{id:'perla',n:'Perla'},{id:'estrella',n:'Estrella'},{id:'corazon',n:'Corazón'},{id:'colgante',n:'Colgante'},{id:'doble',n:'Doble'}];
var PIST_CUELLO=[{id:'',n:'Nada'},{id:'panoleta',n:'Pañoleta'},{id:'buff',n:'Buff'},{id:'bufanda',n:'Bufanda'},{id:'maillot',n:'Maillot'},{id:'pajarita',n:'Corbatín'},{id:'collar',n:'Collar'}];
var PIST_PANO=[
  {id:'#fc4c02',n:'Naranja'},{id:'#1e40af',n:'Azul'},{id:'#ec4899',n:'Rosa'},{id:'#dc2626',n:'Rojo'},
  {id:'#111827',n:'Negro'},{id:'#16a34a',n:'Verde'},{id:'#facc15',n:'Amarillo'},{id:'#7c3aed',n:'Morado'},
  {id:'#38bdf8',n:'Celeste'},{id:'#f8fafc',n:'Blanco'}
];

var PIST_DEF={casco:'azul',piel:'claro',lentes:'',lentesCol:'#16203a',bigote:'',acc:'',pelo:'',peloCol:'#4a3222',pest:'',aro:'',pano:'',
  diseno:'franja',disenoCol:'#fc4c02',gadget:'',marca:'',ojosCol:'',labios:'',cuello:''};

// ───────────────────────── Casco ─────────────────────────
var _LP_DOME='M12 54 A38 36 0 0 1 88 54 Z';
function _cascoFxDefs(fx,c,u){
  if(fx==='metal'||fx==='perla') return '<linearGradient id="g'+u+'" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="'+(fx==='perla'?'.85':'.75')+'"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="'+(fx==='perla'?'.08':'.32')+'"/></linearGradient>'
    +(fx==='perla'?'<linearGradient id="h'+u+'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f9a8d4" stop-opacity=".45"/><stop offset=".5" stop-color="#a5f3fc" stop-opacity=".35"/><stop offset="1" stop-color="#c4b5fd" stop-opacity=".45"/></linearGradient>':'');
  if(fx==='arcoiris') return '<linearGradient id="g'+u+'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ef4444"/><stop offset=".2" stop-color="#f97316"/><stop offset=".4" stop-color="#facc15"/><stop offset=".6" stop-color="#22c55e"/><stop offset=".8" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>';
  if(fx==='atardecer') return '<linearGradient id="g'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset=".45" stop-color="#ec4899"/><stop offset="1" stop-color="#f97316"/></linearGradient>';
  if(fx==='oceano') return '<linearGradient id="g'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>';
  if(fx==='galaxia') return '<radialGradient id="g'+u+'" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#7c3aed"/><stop offset=".55" stop-color="#312e81"/><stop offset="1" stop-color="#0f0a2e"/></radialGradient>';
  return '';
}
function _disenoSVG(id,a){
  a=a||'#fc4c02';
  if(id==='franja') return '<path d="M50 22 L50 52" stroke="'+a+'" stroke-width="6" stroke-linecap="round"/>';
  if(id==='doble') return '<path d="M44 21 L44 55 M56 21 L56 55" stroke="'+a+'" stroke-width="3.6"/>';
  if(id==='rayo') return '<path d="M31 24 L21 41 L29 40.5 L23 54 L38 35 L30 35.5 L36 24 Z" fill="'+a+'"/>'+_lpMirror('<path d="M31 24 L21 41 L29 40.5 L23 54 L38 35 L30 35.5 L36 24 Z" fill="'+a+'"/>');
  if(id==='llamas') return '<path d="M10 56 L10 44 Q14 38 16 45 Q19 30 25 43 Q29 26 34 42 Q38 33 41 44 Q45 24 50 41 Q55 24 59 44 Q62 33 66 42 Q71 26 75 43 Q81 30 84 45 Q86 38 90 44 L90 56 Z" fill="'+a+'"/><path d="M10 56 L12 49 Q16 45 18 50 Q22 40 27 49 Q31 38 35 49 Q40 42 43 50 Q47 36 50 48 Q53 36 57 50 Q60 42 65 49 Q69 38 73 49 Q78 40 82 50 Q84 45 88 49 L90 56 Z" fill="#fde047" opacity=".75"/>';
  if(id==='cuadros'){ var s=''; for(var r=0;r<2;r++) for(var c=0;c<20;c++){ if((r+c)%2) continue; s+='<rect x="'+(10+c*4)+'" y="'+(36+r*4)+'" width="4" height="4" fill="'+a+'"/>'; } return '<rect x="10" y="36" width="80" height="8" fill="rgba(0,0,0,.55)"/>'+s; }
  if(id==='estrellas') return '<g fill="'+a+'"><path d="'+_lpStar(30,34,4.2)+'"/><path d="'+_lpStar(50,26,5)+'"/><path d="'+_lpStar(70,34,4.2)+'"/><path d="'+_lpStar(40,45,3)+'"/><path d="'+_lpStar(62,46,3)+'"/><path d="'+_lpStar(20,47,2.6)+'"/><path d="'+_lpStar(81,47,2.6)+'"/></g>';
  if(id==='lunares'){ var d=''; [[26,36],[38,28],[50,38],[62,28],[74,36],[32,48],[44,49],[56,49],[68,48],[50,22],[18,48],[82,48]].forEach(function(p){ d+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.1"/>'; }); return '<g fill="'+a+'">'+d+'</g>'; }
  if(id==='tigre') return '<g fill="'+a+'"><path d="M12 40 Q22 41 30 46 Q22 45 13 47 Z"/><path d="M16 30 Q26 33 32 39 Q24 37 17 36 Z"/><path d="M26 21 Q34 26 37 33 Q31 29 25 27 Z"/><path d="M50 18 Q47 26 50 32 Q53 26 50 18 Z"/></g>'+_lpMirror('<g fill="'+a+'"><path d="M12 40 Q22 41 30 46 Q22 45 13 47 Z"/><path d="M16 30 Q26 33 32 39 Q24 37 17 36 Z"/><path d="M26 21 Q34 26 37 33 Q31 29 25 27 Z"/></g>');
  if(id==='ondas') return '<g fill="none" stroke="'+a+'" stroke-width="2.6" stroke-linecap="round"><path d="M10 46 Q16 41 22 46 T34 46 T46 46 T58 46 T70 46 T82 46 T94 46"/><path d="M14 36 Q20 31 26 36 T38 36 T50 36 T62 36 T74 36 T86 36"/><path d="M26 27 Q32 22 38 27 T50 27 T62 27 T74 27"/></g>';
  if(id==='corazones') return '<g fill="'+a+'"><path d="'+_lpHeart(30,36,3.4)+'"/><path d="'+_lpHeart(50,27,4)+'"/><path d="'+_lpHeart(70,36,3.4)+'"/><path d="'+_lpHeart(40,47,2.6)+'"/><path d="'+_lpHeart(60,47,2.6)+'"/><path d="'+_lpHeart(19,48,2.2)+'"/><path d="'+_lpHeart(81,48,2.2)+'"/></g>';
  if(id==='camuflaje') return '<path d="M14 44 Q20 36 28 40 Q32 46 24 50 Q16 52 14 44 Z M40 26 Q48 20 54 26 Q56 32 48 33 Q40 33 40 26 Z M62 40 Q70 34 78 40 Q80 48 70 48 Q62 47 62 40 Z M34 44 Q38 40 44 44 Q42 50 36 50 Z" fill="'+a+'"/><path d="M26 30 Q32 25 37 30 Q34 35 28 35 Z M58 30 Q64 25 70 30 Q66 35 60 34 Z M46 44 Q52 40 58 45 Q54 50 48 49 Z" fill="rgba(0,0,0,.35)"/>';
  if(id==='zigzag') return '<path d="M10 42 L16 36 L22 42 L28 36 L34 42 L40 36 L46 42 L52 36 L58 42 L64 36 L70 42 L76 36 L82 42 L88 36 L92 40" fill="none" stroke="'+a+'" stroke-width="3.4" stroke-linejoin="round"/>';
  if(id==='chile') return '<rect x="10" y="38" width="80" height="18" fill="#d52b1e"/><rect x="10" y="16" width="80" height="22" fill="#fff"/><rect x="10" y="16" width="34" height="22" fill="#0039a6"/><path d="'+_lpStar(32,30,4.4)+'" fill="#fff"/>';
  if(id==='numero') return '<circle cx="50" cy="35" r="10" fill="#fff" stroke="'+a+'" stroke-width="2.2"/><text x="50" y="40" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="14" fill="#111827">7</text>'
    +'<path d="M14 46 L30 42 M70 42 L86 46" stroke="'+a+'" stroke-width="2.6" stroke-linecap="round"/>';
  return '';
}
function _cascoSVG(col,x){
  var u=++_lpUid, def=(typeof PIST_CASCO!=='undefined'&&PIST_CASCO.find(function(h){return h.id===x.casco && h.c===col;}))||null, fx=def&&def.fx;
  var defs='<clipPath id="c'+u+'"><path d="'+_LP_DOME+'"/></clipPath>'+_cascoFxDefs(fx,col,u);
  var fill=(fx==='arcoiris'||fx==='atardecer'||fx==='oceano'||fx==='galaxia')?'url(#g'+u+')':col;
  var s='<defs>'+defs+'</defs><path d="'+_LP_DOME+'" fill="'+fill+'"/>';
  if(fx==='galaxia') s+='<g fill="#fff"><circle cx="30" cy="32" r=".9"/><circle cx="44" cy="24" r=".7"/><circle cx="62" cy="30" r="1"/><circle cx="72" cy="42" r=".7"/><circle cx="24" cy="46" r=".7"/><circle cx="54" cy="44" r=".6"/><path d="'+_lpStar(38,38,1.8,.6)+'"/><path d="'+_lpStar(66,22,1.5,.5)+'"/></g><ellipse cx="58" cy="36" rx="12" ry="5" fill="#ec4899" opacity=".25" transform="rotate(-20 58 36)"/>';
  var dis=(x.diseno===undefined?'franja':x.diseno);
  if(dis) s+='<g clip-path="url(#c'+u+')">'+_disenoSVG(dis,x.disenoCol)+'</g>';
  // ventilaciones + volumen
  s+='<g fill="rgba(0,0,0,.30)"><ellipse cx="38" cy="31" rx="2.8" ry="8" transform="rotate(28 38 31)"/><ellipse cx="62" cy="31" rx="2.8" ry="8" transform="rotate(-28 62 31)"/><ellipse cx="24.5" cy="43" rx="2.2" ry="6" transform="rotate(48 24.5 43)"/><ellipse cx="75.5" cy="43" rx="2.2" ry="6" transform="rotate(-48 75.5 43)"/></g>';
  if(fx==='metal'||fx==='perla') s+='<path d="'+_LP_DOME+'" fill="url(#g'+u+')"/>';
  if(fx==='perla') s+='<path d="'+_LP_DOME+'" fill="url(#h'+u+')"/>';
  if(fx==='neon') s+='<path d="M13 53 A37 35 0 0 1 87 53" fill="none" stroke="#eaffd9" stroke-width="1.2" opacity=".8"/>';
  s+='<path d="M12 54 Q50 45 88 54 Z" fill="rgba(0,0,0,.13)"/>';
  s+='<path d="M21 42 Q27 26 45 21" stroke="rgba(255,255,255,.5)" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="19.6" cy="46.4" r="1.3" fill="rgba(255,255,255,.45)"/>';
  s+='<path d="M12 54 Q50 66 88 54 L88 48 Q50 60 12 48 Z" fill="rgba(0,0,0,0.3)"/>';
  return s;
}
// correas del casco (bajan por detrás de las mejillas hasta el mentón)
function _correasSVG(){ return '<g fill="none" stroke="#1f2937" stroke-width="1.3" stroke-linecap="round" opacity=".55"><path d="M18.5 56 Q20 70 31 78.6"/><path d="M81.5 56 Q80 70 69 78.6"/></g><rect x="47.6" y="79.2" width="4.8" height="2.6" rx="1" fill="#1f2937" opacity=".55"/>'; }

// ───────────────────────── Pelo ─────────────────────────
// _peloAtras: detrás de la cara (largo que cae). _peloFrente: patillas/mechones
// sobre el borde de la cara, ANTES del casco (el ala del casco los tapa arriba).
function _hebras(d){ return '<path d="'+d+'" fill="none" stroke="rgba(0,0,0,.2)" stroke-width=".9" stroke-linecap="round"/>'; }
function _brillo(d){ return '<path d="'+d+'" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="1.2" stroke-linecap="round"/>'; }
function _rulos(pts,col){ var s=''; pts.forEach(function(p){ s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+p[2]+'" fill="'+col+'" stroke="rgba(0,0,0,.16)" stroke-width=".8"/>'; }); return s; }
function _peloAtrasSVG(id,col,x){
  col=col||'#4a3222'; if(id==='mono') id='cola';
  var L='';
  if(id==='largo') L='<path d="M14 50 C9.5 60 7.5 72 6.5 84 L26 84 C22.5 80 20.5 75 19.5 69 Z" fill="'+col+'"/>'+_hebras('M13 58 C10.5 66 10 75 9.5 84 M17 64 C15 71 14.5 78 15 84')+_brillo('M15.5 54 C13 61 12 69 12 77');
  else if(id==='ondulado') L='<path d="M14 50 C7 55 12 61 8 66 C4 71 10 75 6 80 L5 84 L26 84 C22.5 80 20.5 75 19.5 69 Z" fill="'+col+'"/>'+_hebras('M13 57 C9 62 13 66 10 71 C7 75 11 79 9 84')+_brillo('M15.5 54 C12 59 15 63 13 68');
  else if(id==='melena') L='<path d="M14 50 C9 58 8 68 10.5 75 Q14.5 80.5 23 77.5 C21.5 72 19.5 66 18.5 58 Z" fill="'+col+'"/>'+_hebras('M13.5 58 C11.5 65 11.5 71 13.5 76')+_brillo('M15.5 54 C13 60 12.5 66 13.5 71');
  else if(id==='rizado') L=_rulos([[14,54,6],[11,61.5,6.5],[11.5,69.5,6.5],[14.5,76.5,6],[20.5,80.5,5]],col);
  else if(id==='afro') L=_rulos([[11,51,8.5],[6.5,60.5,9],[6.5,70.5,8.6],[10.5,79,8],[19,83,7]],col);
  else if(id==='coletas') L='<path d="M15 60 C7 62 4.5 70 5.5 79 Q6.5 84 9.5 84 C9.5 77 11 69.5 17 65 Z" fill="'+col+'"/>'+_hebras('M12 64 C8.5 68 7.5 74 8 82')+'<ellipse cx="15.2" cy="62.2" rx="2.6" ry="3.4" fill="'+(x.disenoCol||'#fc4c02')+'" transform="rotate(-30 15.2 62.2)"/>';
  if(L) L=L+_lpMirror(L);
  if(id==='cola') L='<path d="M81 57 C89.5 59 93.5 67 92.5 76 C92 80 91 83 90 84 L80.5 84 C82.5 78 84 71.5 82 64 Z" fill="'+col+'"/>'
      +_hebras('M85 63 C88.5 68 89.5 75 87.5 84 M83 66 C85 72 85 78 83.5 84')+_brillo('M86.5 62 C89.5 67 90.5 72 90 77')
      +'<rect x="79.6" y="58.4" width="6.4" height="3.6" rx="1.6" fill="'+(x.disenoCol||'#fc4c02')+'" transform="rotate(22 82.8 60.2)"/>';
  if(id==='trenza') L='<path d="M80 56 C86 58 88 62 87 66 L84 66 C84 62 82.5 60 80 59 Z" fill="'+col+'"/>';
  return L;
}
function _trenzaSeg(cx,cy,col,k){ return '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(3.9*k)+'" ry="'+(3*k)+'" fill="'+col+'" stroke="rgba(0,0,0,.22)" stroke-width=".8" transform="rotate(-22 '+cx+' '+cy+')"/><ellipse cx="'+(cx+0.6*k)+'" cy="'+(cy+2.4*k)+'" rx="'+(3.9*k)+'" ry="'+(3*k)+'" fill="'+col+'" stroke="rgba(0,0,0,.22)" stroke-width=".8" transform="rotate(22 '+(cx+0.6*k)+' '+(cy+2.4*k)+')"/>'; }
function _peloFrenteSVG(id,col,x){
  col=col||'#4a3222'; if(id==='mono') id='cola'; if(!id) return '';
  // nacimiento del pelo bajo el ala del casco (sienes)
  var sien='<path d="M15 51.5 Q20 52.5 24.5 55 L22.5 58.5 Q18.5 56.5 16 58 Z" fill="'+col+'"/>';
  var s='';
  if(id==='corto') s=_lpMirror('<path d="M15.5 51.5 L20 53 L19.6 61.5 Q17.4 60.6 16.2 57.6 Z" fill="'+col+'"/>')+'<path d="M15.5 51.5 L20 53 L19.6 61.5 Q17.4 60.6 16.2 57.6 Z" fill="'+col+'"/>';
  else if(id==='flequillo'){ s=sien+_lpMirror(sien)+'<path d="M17 53 Q29 54 40 57.5 Q33 58.5 29 63 Q27.5 59.5 24 61.5 Q23.5 58 19 60 Z" fill="'+col+'"/>'+_hebras('M22 56 Q27 57.5 30 61.5')+_brillo('M24 55.2 Q31 56.2 36 57.6'); }
  else if(id==='largo'||id==='ondulado'||id==='melena'){ var m='<path d="M16.5 52 Q14 62 17.5 73 Q19.6 63.5 22.5 54.5 Z" fill="'+col+'"/>'; s=sien+_lpMirror(sien)+m+_lpMirror(m); }
  else if(id==='rizado'||id==='afro'){ var r=_rulos([[17.5,55.5,3.6],[17,61.5,3],[18.5,66.5,2.4]],col); s=r+_lpMirror(r); }
  else if(id==='cola'){ s=sien+_lpMirror(sien)+'<path d="M16.5 52 Q14.5 59 17.6 66 Q19.6 59.5 22 54.5 Z" fill="'+col+'"/>'; }
  else if(id==='coletas'){ s=sien+_lpMirror(sien); }
  else if(id==='trenzas'){ var t=sien; [[17,59],[16.2,64.4],[15.5,69.8],[14.9,75.2]].forEach(function(p){ t+=_trenzaSeg(p[0],p[1],col,1); }); t+='<rect x="12.4" y="79.6" width="5" height="2.4" rx="1.2" fill="'+(x.disenoCol||'#fc4c02')+'"/><path d="M13 82 L12.4 84 L17.4 84 L16.8 82 Z" fill="'+col+'"/>'; s=t+_lpMirror(t); }
  else if(id==='trenza'){ var u=_lpMirror(sien)+sien; [[82.5,59],[83.6,64.4],[84.6,69.8],[85.4,75.2]].forEach(function(p){ u+=_trenzaSeg(p[0],p[1],col,1.15); }); u+='<rect x="83" y="80" width="6" height="2.6" rx="1.3" fill="'+(x.disenoCol||'#fc4c02')+'"/><path d="M83.6 82.6 L83 84 L89 84 L88.4 82.6 Z" fill="'+col+'"/>'; s=u; }
  return s;
}

// ───────────────────────── Accesorios ─────────────────────────
function _accCascoSVG(id){
  if(id==='camara') return '<rect x="45" y="21" width="10" height="7" rx="1.5" fill="#1a1a1a"/><circle cx="50" cy="24.5" r="2.2" fill="#3a7bd5"/><circle cx="50" cy="24.5" r="0.9" fill="#cfe8ff"/>';
  if(id==='luz') return '<circle cx="50" cy="22" r="3.4" fill="#fff59d"/><path d="M50 22 L44 16 M50 22 L56 16 M50 22 L50 14" stroke="#fff59d" stroke-width="1.1" opacity="0.6" stroke-linecap="round"/>';
  if(id==='cresta') return '<path d="M40 27 Q44 13 47 26" fill="none" stroke="#fc4c02" stroke-width="3" stroke-linecap="round"/><path d="M47 26 Q50 10 53 26" fill="none" stroke="#fc4c02" stroke-width="3" stroke-linecap="round"/><path d="M53 26 Q56 13 60 27" fill="none" stroke="#fc4c02" stroke-width="3" stroke-linecap="round"/>';
  if(id==='antena') return '<line x1="50" y1="23" x2="50" y2="11" stroke="#333" stroke-width="1.5"/><circle cx="50" cy="10" r="2.5" fill="#fc4c02"/>';
  var h;
  if(id==='vikingo'){ h='<path d="M25 34 Q11 31 8 13 Q16 24 30 27 Z" fill="#f1e6c8" stroke="#b9a77a" stroke-width=".8"/><path d="M12.5 23 Q16 26 20 27.5 M10 18 Q12.5 21 15.5 22.5" stroke="#b9a77a" stroke-width=".8" fill="none"/><path d="M23 34.5 L31 26 L33.5 29 L26 37 Z" fill="#8b6b3d"/>'; return h+_lpMirror(h); }
  if(id==='diablo'){ h='<path d="M32 25.5 Q27 15 22 10 Q33 13 38.5 23 Z" fill="#dc2626"/><path d="M31 21 Q28 16 24.5 12.5" stroke="rgba(255,255,255,.35)" stroke-width="1" fill="none" stroke-linecap="round"/>'; return h+_lpMirror(h); }
  if(id==='unicornio') return '<path d="M45.5 20.5 L50 1.5 L54.5 20.5 Z" fill="#fde68a" stroke="#f59e0b" stroke-width=".7"/><path d="M46.6 16 L53.6 13.5 M47.6 11.2 L52.6 9.2 M48.6 6.6 L51.6 5.4" stroke="#f472b6" stroke-width="1.1" stroke-linecap="round"/><path d="M44 21 Q40 17 41 12 Q43 17 46 18 Z" fill="#c4b5fd"/><path d="M56 21 Q60 17 59 12 Q57 17 54 18 Z" fill="#7dd3fc"/>';
  if(id==='gato'){ h='<path d="M23 31 L26 11 L40 22.5 Z" fill="#1f2937"/><path d="M26 27 L27.6 16 L35.5 22.6 Z" fill="#f9a8d4"/>'; return h+_lpMirror(h); }
  if(id==='oso'){ h='<circle cx="27" cy="25" r="7.4" fill="#8b5a2b"/><circle cx="27" cy="25" r="3.8" fill="#d4a373"/>'; return h+_lpMirror(h); }
  if(id==='conejo'){ h='<ellipse cx="40" cy="10.5" rx="4.6" ry="11" fill="#f8fafc" stroke="#cbd5e1" stroke-width=".7" transform="rotate(-12 40 10.5)"/><ellipse cx="40" cy="11.5" rx="2.2" ry="8" fill="#f9a8d4" transform="rotate(-12 40 11.5)"/>'; return h+_lpMirror(h); }
  if(id==='corona') return '<path d="M37 23 L35 8 L42.5 15 L50 4.5 L57.5 15 L65 8 L63 23 Q50 20 37 23 Z" fill="#f5c518" stroke="#b8860b" stroke-width=".9" stroke-linejoin="round"/><circle cx="50" cy="16" r="2" fill="#e11d48"/><circle cx="41.5" cy="18.5" r="1.4" fill="#2563eb"/><circle cx="58.5" cy="18.5" r="1.4" fill="#16a34a"/><circle cx="35" cy="8" r="1.2" fill="#fff7cc"/><circle cx="50" cy="4.5" r="1.2" fill="#fff7cc"/><circle cx="65" cy="8" r="1.2" fill="#fff7cc"/>';
  if(id==='aureola') return '<ellipse cx="50" cy="9" rx="17" ry="4.2" fill="none" stroke="#fde047" stroke-width="5" opacity=".25"/><ellipse cx="50" cy="9" rx="17" ry="4.2" fill="none" stroke="#fde047" stroke-width="2.4"/>';
  if(id==='helice') return '<line x1="50" y1="19" x2="50" y2="10.5" stroke="#4b5563" stroke-width="1.6"/><ellipse cx="41.5" cy="9.5" rx="8.5" ry="2.4" fill="#ef4444"/><ellipse cx="58.5" cy="9.5" rx="8.5" ry="2.4" fill="#3b82f6"/><circle cx="50" cy="9.5" r="2.2" fill="#facc15"/>';
  if(id==='flor'){ var f=''; for(var i=0;i<5;i++){ var a=i*72*Math.PI/180; f+='<circle cx="'+(29+4*Math.cos(a)).toFixed(2)+'" cy="'+(24+4*Math.sin(a)).toFixed(2)+'" r="3.4" fill="#f9a8d4" stroke="#ec4899" stroke-width=".5"/>'; } return '<path d="M33 27 Q37 30 36 34" stroke="#16a34a" stroke-width="1.4" fill="none"/>'+f+'<circle cx="29" cy="24" r="2.4" fill="#facc15"/>'; }
  if(id==='lazo') return '<path d="M69 25 L58 18 L59.5 31 Z" fill="#ec4899"/><path d="M69 25 L80 18 L78.5 31 Z" fill="#ec4899"/><path d="M60 20.5 L66 24 M78 20.5 L72 24" stroke="rgba(0,0,0,.18)" stroke-width="1"/><circle cx="69" cy="25" r="3" fill="#db2777"/>';
  if(id==='alas'){ h='<path d="M15 44 Q2 39 1.5 26 Q6 31 10 31.5 Q5 35 9.5 38 Q6 40 15 41 Z" fill="#fff" stroke="#94a3b8" stroke-width=".8" stroke-linejoin="round"/><path d="M13.5 41 Q7 37 4 30" stroke="#cbd5e1" stroke-width=".8" fill="none"/>'; return h+_lpMirror(h); }
  if(id==='pinchos'){ var p=''; [-62,-40,-18,0,18,40,62].forEach(function(dg){ var t=(90-dg)*Math.PI/180, bx=50+37*Math.cos(t), by=54-35*Math.sin(t), tx=50+48*Math.cos(t), ty=54-46*Math.sin(t), nx=Math.sin(t)*3.4, ny=Math.cos(t)*3.4; p+='<path d="M'+(bx-nx).toFixed(1)+' '+(by-ny).toFixed(1)+' L'+tx.toFixed(1)+' '+ty.toFixed(1)+' L'+(bx+nx).toFixed(1)+' '+(by+ny).toFixed(1)+' Z"/>'; }); return '<g fill="#cbd5e1" stroke="#64748b" stroke-width=".7" stroke-linejoin="round">'+p+'</g>'; }
  if(id==='dino') return '<g fill="#22c55e" stroke="#15803d" stroke-width=".8" stroke-linejoin="round"><path d="M40 21 Q41 11 46 14 Q46 18 46 19.5 Z"/><path d="M45 19 Q50 5 55 19 Z"/><path d="M54 19.5 Q54 14 54 14 Q59 11 60 21 Z"/></g>';
  if(id==='brote') return '<path d="M50 19 Q49 13 51 8" stroke="#16a34a" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M51 9 Q56 3 62 6 Q57 11 51 9 Z" fill="#4ade80"/><path d="M50.5 12 Q45 7 39.5 9.5 Q44.5 14 50.5 12 Z" fill="#22c55e"/>';
  if(id==='estrella') return '<path d="M50 19 Q46 15 50 12 Q54 9 50 6" stroke="#9ca3af" stroke-width="1.1" fill="none"/><path d="'+_lpStar(50,4.5,5,2.2)+'" fill="#facc15" stroke="#ca8a04" stroke-width=".6"/>';
  return '';
}
function _gadgetSVG(id){
  if(id==='visera') return '<path d="M20 53.5 Q50 43 80 53.5 Q83 56 81 58.5 Q50 50 19 58.5 Q17 56 20 53.5 Z" fill="#111827" opacity=".88"/><path d="M24 53.2 Q50 45.6 76 53.2" stroke="rgba(255,255,255,.28)" stroke-width="1" fill="none"/>';
  if(id==='gopro') return '<path d="M82 45 L86 43" stroke="#374151" stroke-width="2.2"/><rect x="84" y="36.5" width="10" height="8" rx="1.6" fill="#111827"/><circle cx="89" cy="40.5" r="2.6" fill="#1e3a8a"/><circle cx="88.3" cy="39.8" r=".9" fill="#bfdbfe"/><circle cx="92.4" cy="37.8" r=".6" fill="#ef4444"/>';
  if(id==='luzroja') return '<circle cx="15" cy="46" r="5.4" fill="#ef4444" opacity=".28"/><rect x="12" y="44.2" width="6" height="3.6" rx="1.6" fill="#ef4444" stroke="#7f1d1d" stroke-width=".6"/><rect x="13" y="45" width="2" height="1.2" rx=".6" fill="#fecaca"/>';
  if(id==='espejo') return '<path d="M15 50 L7 44.5" stroke="#374151" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="5.2" cy="42.5" rx="3.8" ry="2.9" fill="#cbd5e1" stroke="#374151" stroke-width="1"/><path d="M3.4 41.6 Q5 40.4 6.8 41" stroke="#fff" stroke-width=".8" fill="none"/>';
  if(id==='reflectante') return '<path d="M13.5 47 Q50 34 86.5 47" fill="none" stroke="#e5e7eb" stroke-width="3"/><path d="M13.5 47 Q50 34 86.5 47" fill="none" stroke="#fef08a" stroke-width="3" stroke-dasharray="2 6" opacity=".9"/><path d="'+_lpStar(30,40.6,1.8,.5)+'" fill="#fff"/>';
  if(id==='banderin') return '<line x1="83" y1="46" x2="96" y2="2" stroke="#6b7280" stroke-width="1.2"/><path d="M96 2 L84 6 L94.6 10.8 Z" fill="#fc4c02"/>';
  return '';
}
function _aroSVG(id){
  if(id==='argolla') return '<g fill="none" stroke="#e8c34a" stroke-width="2.2"><circle cx="15" cy="70" r="4"/><circle cx="85" cy="70" r="4"/></g>';
  if(id==='perla') return '<circle cx="15" cy="69" r="2.6" fill="#fef3c7" stroke="#e8c34a" stroke-width="0.8"/><circle cx="85" cy="69" r="2.6" fill="#fef3c7" stroke="#e8c34a" stroke-width="0.8"/>';
  if(id==='estrella') return '<path d="'+_lpStar(15,69,3.2)+'" fill="#facc15" stroke="#ca8a04" stroke-width=".5"/><path d="'+_lpStar(85,69,3.2)+'" fill="#facc15" stroke="#ca8a04" stroke-width=".5"/>';
  if(id==='corazon') return '<path d="'+_lpHeart(15,69,2.6)+'" fill="#ec4899"/><path d="'+_lpHeart(85,69,2.6)+'" fill="#ec4899"/>';
  if(id==='colgante') return '<g stroke="#e8c34a" stroke-width="1"><line x1="15" y1="67" x2="15" y2="72"/><line x1="85" y1="67" x2="85" y2="72"/></g><path d="M15 71.5 Q12.6 75 15 76.8 Q17.4 75 15 71.5 Z" fill="#38bdf8" stroke="#e8c34a" stroke-width=".6"/><path d="M85 71.5 Q82.6 75 85 76.8 Q87.4 75 85 71.5 Z" fill="#38bdf8" stroke="#e8c34a" stroke-width=".6"/>';
  if(id==='doble') return '<g fill="none" stroke="#cbd5e1" stroke-width="1.4"><circle cx="15" cy="68" r="2.4"/><circle cx="85" cy="68" r="2.4"/><circle cx="14.6" cy="72.4" r="2.6"/><circle cx="85.4" cy="72.4" r="2.6"/></g>';
  return '';
}
function _lentesSVG(id, col){
  col=col||'#16203a';
  var brillo='<path d="M32 60.5 L36 58.6 M52 60.5 L56 58.6" stroke="rgba(255,255,255,.55)" stroke-width="1.1" stroke-linecap="round"/>';
  if(id==='deportivas') return '<path d="M28 58 Q50 56 72 58 Q73 63 70 68 Q50 66 30 68 Q27 63 28 58 Z" fill="'+col+'" opacity=".92"/><path d="M29 58.5 Q50 56.5 71 58.5" stroke="rgba(255,255,255,.45)" stroke-width="1.2" fill="none"/><path d="M48 61.5 L52 61.5" stroke="#0b1220" stroke-width="2"/>';
  if(id==='redondas') return '<g stroke="#3a3f52" stroke-width="1.8" fill="'+col+'" fill-opacity=".55"><circle cx="40" cy="63" r="8"/><circle cx="60" cy="63" r="8"/></g><path d="M48 63 L52 63" stroke="#3a3f52" stroke-width="1.8"/><path d="M32 62 L26.5 60.5" stroke="#3a3f52" stroke-width="1.6" fill="none"/><path d="M68 62 L73.5 60.5" stroke="#3a3f52" stroke-width="1.6" fill="none"/>';
  if(id==='aviador') return '<g stroke="#c9a227" stroke-width="1.3"><path d="M31 59.5 Q41 58.5 48.5 60.5 Q48.5 68 40 68.5 Q31.5 68 31 60.5 Z" fill="'+col+'" opacity=".85"/><path d="M69 59.5 Q59 58.5 51.5 60.5 Q51.5 68 60 68.5 Q68.5 68 69 60.5 Z" fill="'+col+'" opacity=".85"/><path d="M48.5 60.5 Q50 60 51.5 60.5" fill="none"/><path d="M31 60 L26.5 58.5" fill="none"/><path d="M69 60 L73.5 58.5" fill="none"/></g>';
  if(id==='escudo') return '<path d="M25 57 Q50 52.5 75 57 Q76.5 65 71 70.5 Q61 72.5 53 67.5 Q50 65.5 47 67.5 Q39 72.5 29 70.5 Q23.5 65 25 57 Z" fill="'+col+'" opacity=".93"/><path d="M27 58 Q50 54 73 58" stroke="rgba(255,255,255,.5)" stroke-width="1.3" fill="none"/><path d="M31 66 Q37 62 44 60" stroke="rgba(255,255,255,.25)" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  if(id==='mascara') return '<path d="M26 61 L13 58 M74 61 L87 58" stroke="#111827" stroke-width="3.2" stroke-linecap="round"/><rect x="25.5" y="54.5" width="49" height="16" rx="7.5" fill="'+col+'" opacity=".88" stroke="#111827" stroke-width="2.2"/><path d="M29 59 Q38 56.5 47 58" stroke="rgba(255,255,255,.55)" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M47.5 70.5 Q50 66.5 52.5 70.5" fill="#111827"/>';
  if(id==='cuadrados') return '<g stroke="#2b2f3d" stroke-width="2" fill="'+col+'" fill-opacity=".5"><rect x="31.5" y="56.5" width="16" height="13" rx="2.2"/><rect x="52.5" y="56.5" width="16" height="13" rx="2.2"/></g><path d="M47.5 61.5 Q50 60 52.5 61.5" stroke="#2b2f3d" stroke-width="2" fill="none"/><path d="M31.5 59 L26 58 M68.5 59 L74 58" stroke="#2b2f3d" stroke-width="1.6"/>'+brillo;
  if(id==='gato') return '<g fill="'+col+'" fill-opacity=".7" stroke="#111827" stroke-width="1.7" stroke-linejoin="round"><path d="M27 55.5 Q38 57.5 48 59.5 Q48 67.5 40.5 68.5 Q32.5 68.5 31 61.5 Z"/><path d="M73 55.5 Q62 57.5 52 59.5 Q52 67.5 59.5 68.5 Q67.5 68.5 69 61.5 Z"/></g><path d="M48 60 Q50 59 52 60" stroke="#111827" stroke-width="1.7" fill="none"/>'+brillo;
  if(id==='corazon') return '<g fill="'+col+'" fill-opacity=".78" stroke="#be185d" stroke-width="1.5"><path d="'+_lpHeart(40,62.5,6.6)+'"/><path d="'+_lpHeart(60,62.5,6.6)+'"/></g><path d="M46.5 60.5 Q50 59 53.5 60.5" stroke="#be185d" stroke-width="1.5" fill="none"/><path d="M31 59 L26.5 58 M69 59 L73.5 58" stroke="#be185d" stroke-width="1.4"/>'+brillo;
  if(id==='estrella') return '<g fill="'+col+'" fill-opacity=".78" stroke="#ca8a04" stroke-width="1.4" stroke-linejoin="round"><path d="'+_lpStar(40,63.5,9.5,4.6)+'"/><path d="'+_lpStar(60,63.5,9.5,4.6)+'"/></g><path d="M47.5 61 Q50 60 52.5 61" stroke="#ca8a04" stroke-width="1.4" fill="none"/>';
  return '';
}
function _pestanasSVG(tipo){
  var k=(tipo==='largas')?1.5:1;
  function lado(sx){ return '<path d="M'+(50+sx*16.5)+' 58.5 Q'+(50+sx*(20-0+0))+' '+(57-1*k)+' '+(50+sx*(21.5+0.8*k))+' '+(54.5-1.6*(k-1))+'"/><path d="M'+(50+sx*14.5)+' 57 Q'+(50+sx*17)+' '+(55.2-1*(k-1))+' '+(50+sx*(18.5+0.6*k))+' '+(52.8-2.2*(k-1))+'"/><path d="M'+(50+sx*12)+' 56.2 Q'+(50+sx*13.5)+' '+(54-1*(k-1))+' '+(50+sx*(14.2+0.4*k))+' '+(51.6-2.6*(k-1))+'"/>'; }
  return '<g stroke="#16203a" stroke-width="'+(1.3*(k>1?1.1:1))+'" fill="none" stroke-linecap="round">'+lado(-1)+lado(1)+'</g>';
}
function _marcaSVG(id,x){
  if(id==='pecas'){ var d=''; [[25,66],[28,68.5],[31.5,66.5],[27,64],[33,69],[75,66],[72,68.5],[68.5,66.5],[73,64],[67,69],[47,68],[53,68]].forEach(function(p){ d+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r=".75"/>'; }); return '<g fill="#9a5a32" opacity=".6">'+d+'</g>'; }
  if(id==='rubor') return '<ellipse cx="29" cy="71" rx="7.4" ry="4.2" fill="#ff7a96" opacity=".55"/><ellipse cx="71" cy="71" rx="7.4" ry="4.2" fill="#ff7a96" opacity=".55"/><g stroke="#ff5c7c" stroke-width=".8" stroke-linecap="round" opacity=".7"><path d="M25 70 L26.5 72 M28.5 70 L30 72 M32 70 L33.5 72"/><path d="M67 70 L68.5 72 M70.5 70 L72 72 M74 70 L75.5 72"/></g>';
  if(id==='lunar') return '<circle cx="63.5" cy="76.6" r="1.1" fill="#3b2314"/>';
  if(id==='barro') return '<g fill="#6b4423" opacity=".8"><circle cx="27" cy="72" r="2.2"/><circle cx="31" cy="75" r="1.3"/><circle cx="23.5" cy="68" r="1"/><circle cx="33.5" cy="71.5" r=".8"/><circle cx="68" cy="77" r="1.4"/><circle cx="71.5" cy="74.5" r=".8"/><ellipse cx="26" cy="74.5" rx="3" ry="1.2" transform="rotate(25 26 74.5)"/></g>';
  if(id==='curita') return '<g transform="rotate(-28 71 70)"><rect x="64" y="67.6" width="14" height="4.8" rx="2.4" fill="#f3c99a" stroke="#d9a46c" stroke-width=".5"/><rect x="69" y="67.6" width="4" height="4.8" fill="#e8b17a"/><circle cx="66.4" cy="69.2" r=".35" fill="#c8915a"/><circle cx="66.4" cy="70.8" r=".35" fill="#c8915a"/><circle cx="75.6" cy="69.2" r=".35" fill="#c8915a"/><circle cx="75.6" cy="70.8" r=".35" fill="#c8915a"/></g>';
  if(id==='corazon') return '<path d="'+_lpHeart(71,71.5,2.6)+'" fill="#e11d48"/>';
  if(id==='brillos') return '<g fill="#fde047"><path d="'+_lpStar(26,57.5,2.4,.8)+'"/><path d="'+_lpStar(74,57.5,2.4,.8)+'"/><path d="'+_lpStar(29.5,75,1.6,.55)+'"/><path d="'+_lpStar(70.5,75,1.6,.55)+'"/></g>';
  if(id==='guerrero') return '<g stroke="'+((x&&x.disenoCol&&x.disenoCol!=='#ffffff')?x.disenoCol:'#dc2626')+'" stroke-width="1.8" stroke-linecap="round"><path d="M23 68.5 L33 69.5 M23.5 72.5 L33 73"/><path d="M77 68.5 L67 69.5 M76.5 72.5 L67 73"/></g>';
  return '';
}
function _bigoteSVG(id){ if(id==='bigote') return '<path d="M40 70 Q45 67.5 50 70.5 Q55 67.5 60 70 Q56 73.5 50 72 Q44 73.5 40 70 Z" fill="#5a3a1a"/>'; if(id==='candado') return '<path d="M40 70 Q45 67.5 50 70.5 Q55 67.5 60 70 Q56 73.5 50 72 Q44 73.5 40 70 Z" fill="#5a3a1a"/><path d="M46.5 77 Q50 81.5 53.5 77 Q51.5 78.7 50 78.7 Q48.5 78.7 46.5 77 Z" fill="#5a3a1a"/>'; if(id==='barba') return '<path d="M27 65 Q29 81 50 83 Q71 81 73 65 Q63 73 50 72 Q37 73 27 65 Z" fill="#5a3a1a" opacity="0.92"/>'; return ''; }
function _panoletaSVG(col){ col=col||'#fc4c02'; return '<path d="M22 74 Q50 86 78 74 Q80 82 72 86 Q50 92 28 86 Q20 82 22 74 Z" fill="'+col+'"/><path d="M22 74 Q50 84 78 74" stroke="rgba(0,0,0,.15)" stroke-width="1.5" fill="none"/><path d="M34 79 l3 4 M44 81 l2 4 M56 81 l-2 4 M66 79 l-3 4" stroke="rgba(255,255,255,.4)" stroke-width="1" stroke-linecap="round"/>'; }
function _cuelloSVG(tipo,col){
  col=col||'#fc4c02';
  if(tipo==='panoleta') return _panoletaSVG(col);
  if(tipo==='buff') return '<path d="M24 76 Q50 84.5 76 76 L77 84 L23 84 Z" fill="'+col+'"/><path d="M24 76 Q50 84.5 76 76" stroke="rgba(0,0,0,.18)" stroke-width="1.2" fill="none"/><path d="M28 80.5 Q50 87 72 80.5" stroke="rgba(255,255,255,.35)" stroke-width="1.2" fill="none" stroke-dasharray="3 2"/>';
  if(tipo==='bufanda') return '<path d="M21 74 Q50 85 79 74 L80 81 Q50 91 20 81 Z" fill="'+col+'"/><path d="M22 77.5 Q50 88 78 77.5" stroke="rgba(255,255,255,.4)" stroke-width="1.6" fill="none"/><path d="M62 80 L72 79 L74 84 L63 84 Z" fill="'+col+'" stroke="rgba(0,0,0,.18)" stroke-width=".8"/><path d="M64 84 L64.4 82 M67 84 L67.2 82 M70 84 L70.2 82" stroke="rgba(0,0,0,.25)" stroke-width=".7"/>';
  if(tipo==='maillot') return '<path d="M12 84 Q18 77.5 31 78.6 Q50 86.5 69 78.6 Q82 77.5 88 84 Z" fill="'+col+'"/><path d="M31 78.6 Q50 86.5 69 78.6" stroke="#fff" stroke-width="1.4" fill="none" opacity=".85"/><path d="M50 82.4 L50 84" stroke="#9ca3af" stroke-width="1.4"/><circle cx="50" cy="82.6" r=".9" fill="#d1d5db"/>';
  if(tipo==='pajarita') return '<path d="M50 81.2 L42.5 78 L42.5 84 Z M50 81.2 L57.5 78 L57.5 84 Z" fill="'+col+'" stroke="rgba(0,0,0,.25)" stroke-width=".6"/><rect x="48" y="79.4" width="4" height="3.6" rx="1.1" fill="'+col+'" stroke="rgba(0,0,0,.3)" stroke-width=".6"/>';
  if(tipo==='collar') return '<path d="M27 78.5 Q50 89 73 78.5" fill="none" stroke="#f5c518" stroke-width="1.5" stroke-dasharray="1.6 .9"/><circle cx="50" cy="83.2" r="1.7" fill="'+col+'" stroke="#f5c518" stroke-width=".7"/>';
  return '';
}
function _labiosMouth(mouth,lab){ if(!lab) return mouth; return mouth.replace(/#7a4a2a/g,lab).replace(/stroke-width="2\.4"/,'stroke-width="2.9"').replace(/fill=\\?"#5a2f1a\\?"/g,'fill="#5a2f1a" stroke="'+lab+'" stroke-width="1.6"'); }

// Normaliza un objeto de opciones (viejo o nuevo) a la forma v2.
function _pistNormal(o){
  // los campos undefined (p.ej. un doc de Firestore viejo) NO pisan el default
  var r=Object.assign({},PIST_DEF); o=o||{}; for(var k in o){ if(o[k]!==undefined && o[k]!==null) r[k]=o[k]; }
  if(r.pelo==='mono') r.pelo='cola';
  // Solo valores del catálogo: el objeto puede venir de Firestore (lo escribe el
  // cliente de otro usuario) y estos valores se insertan tal cual en el SVG.
  var CAT={casco:PIST_CASCO,piel:PIST_PIEL,lentes:PIST_LENTES,lentesCol:PIST_LENTES_COL,bigote:PIST_BIGOTE,acc:PIST_ACC,pelo:PIST_PELO,peloCol:PIST_PELO_COL,
    pest:PIST_PEST,aro:PIST_ARO,diseno:PIST_DISENO,disenoCol:PIST_ACENTO,gadget:PIST_GADGET,marca:PIST_MARCA,ojosCol:PIST_OJOS_COL,labios:PIST_LABIOS,cuello:PIST_CUELLO};
  for(var c in CAT){ var v=r[c]; if(!CAT[c].some(function(it){return it.id===v;})) r[c]=PIST_DEF[c]; }
  if(r.pano && !/^#[0-9a-fA-F]{3,8}$/.test(r.pano)) r.pano='#fc4c02';
  if(r.diseno===undefined) r.diseno='franja';
  if(!r.cuello && r.pano) r.cuello='panoleta';
  if(r.cuello && !r.pano) r.pano='#fc4c02';
  return r;
}
