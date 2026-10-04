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
// Casco: color y ACABADO son independientes (pedido de Inty 2026-10-04: "el usuario
// puede elegir colores, accesorios, todo independiente"). `casco` es un id de esta
// lista O cualquier color '#rrggbb' elegido con el selector libre. Los `fx` de
// gradiente son pinturas especiales; metal/perla/neon solo dan el acabado por
// defecto a quien los tenía guardados de antes.
var PIST_CASCO=[
  {id:'azul',c:'#00aaff',n:'Azul'},{id:'naranja',c:'#fc4c02',n:'Naranja'},{id:'verde',c:'#5c8a3a',n:'Verde'},
  {id:'morado',c:'#7c3aed',n:'Morado'},{id:'rojo',c:'#e11d48',n:'Rojo'},{id:'negro',c:'#20242e',n:'Negro'},
  {id:'celeste',c:'#38bdf8',n:'Celeste'},{id:'dorado',c:'#d4a017',n:'Dorado',fx:'metal'},
  {id:'blanco',c:'#f1f5f9',n:'Blanco'},{id:'rosa',c:'#f472b6',n:'Rosa'},{id:'menta',c:'#5eead4',n:'Menta'},
  {id:'lima',c:'#a3e635',n:'Lima'},{id:'amarillo',c:'#facc15',n:'Amarillo'},{id:'coral',c:'#fb7185',n:'Coral'},
  {id:'lila',c:'#c4b5fd',n:'Lila'},{id:'militar',c:'#556b2f',n:'Militar'},
  {id:'cromo',c:'#b8c2cf',n:'Cromo',fx:'metal'},{id:'cobre',c:'#c26a3d',n:'Cobre',fx:'metal'},
  {id:'perla',c:'#f8fafc',n:'Perla',fx:'perla'},{id:'neon',c:'#39ff14',n:'Neón',fx:'neon'},
  {id:'atardecer',c:'#f97316',n:'Atardecer',fx:'atardecer',css:'linear-gradient(180deg,#7c3aed,#ec4899,#f97316)'},
  {id:'arcoiris',c:'#ef4444',n:'Arcoíris',fx:'arcoiris',css:'linear-gradient(90deg,#ef4444,#f97316,#facc15,#22c55e,#3b82f6,#8b5cf6)'},
  {id:'galaxia',c:'#1e1b4b',n:'Galaxia',fx:'galaxia',css:'radial-gradient(circle at 35% 35%,#7c3aed,#312e81 55%,#0f0a2e)'},
  {id:'oceano',c:'#0369a1',n:'Océano',fx:'oceano',css:'linear-gradient(180deg,#22d3ee,#1e3a8a)'}
];
var PIST_ACABADO=[{id:'',n:'Brillante'},{id:'mate',n:'Mate'},{id:'metal',n:'Metálico'},{id:'perla',n:'Perlado'},{id:'carbono',n:'Carbono'},{id:'neon',n:'Neón'}];
// Paleta general para las piezas que aceptan color propio (accesorio, equipo, marco).
// '' = el color original de la pieza.
var PIST_COLORES=[
  {id:'#ffffff',n:'Blanco'},{id:'#111827',n:'Negro'},{id:'#9ca3af',n:'Gris'},{id:'#dc2626',n:'Rojo'},
  {id:'#fc4c02',n:'Naranja'},{id:'#facc15',n:'Amarillo'},{id:'#84cc16',n:'Lima'},{id:'#16a34a',n:'Verde'},
  {id:'#14b8a6',n:'Turquesa'},{id:'#22d3ee',n:'Celeste'},{id:'#2563eb',n:'Azul'},{id:'#1e3a8a',n:'Marino'},
  {id:'#7c3aed',n:'Morado'},{id:'#c084fc',n:'Lila'},{id:'#ec4899',n:'Rosa'},{id:'#f9a8d4',n:'Rosa pastel'},
  {id:'#8b5a2b',n:'Café'},{id:'#d4a017',n:'Dorado'}
];
var PIST_PIEZA_COL=[{id:'',n:'Original'}].concat(PIST_COLORES);
var PIST_ARO_COL=[{id:'',n:'Oro'},{id:'#d1d5db',n:'Plata'},{id:'#e8a598',n:'Oro rosa'},{id:'#111827',n:'Negro'},{id:'#ec4899',n:'Rosa'},{id:'#2563eb',n:'Azul'},{id:'#16a34a',n:'Verde'},{id:'#dc2626',n:'Rojo'}];
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
  diseno:'franja',disenoCol:'#fc4c02',gadget:'',marca:'',ojosCol:'',labios:'',cuello:'',
  acabado:'',accCol:'',gadgetCol:'',marcoCol:'',aroCol:''};
var _LP_HEX=/^#[0-9a-fA-F]{6}$/;
// oscurece (f<0) o aclara (f>0) un '#rrggbb'
function _lpShade(hex,f){ if(!_LP_HEX.test(hex||'')) return hex; var n=parseInt(hex.slice(1),16); function t(c){ return Math.max(0,Math.min(255,Math.round(f<0?c*(1+f):c+(255-c)*f))); } return '#'+((1<<24)|(t(n>>16)<<16)|(t((n>>8)&255)<<8)|t(n&255)).toString(16).slice(1); }
function _lpGrad(id,c){ return '<linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+_lpShade(c,.45)+'"/><stop offset=".55" stop-color="'+c+'"/><stop offset="1" stop-color="'+_lpShade(c,-.38)+'"/></linearGradient>'; }
function _lpColCasco(id){ var h=PIST_CASCO.find(function(x){return x.id===id;}); return h?h.c:(_LP_HEX.test(id||'')?id:'#00aaff'); }
// ───────────────────────── Casco ─────────────────────────
var _LP_DOME='M12 54 A38 36 0 0 1 88 54 Z';
function _cascoFxDefs(fx,ac,u){
  var d='';
  if(fx==='arcoiris') d+='<linearGradient id="g'+u+'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ef4444"/><stop offset=".2" stop-color="#f97316"/><stop offset=".4" stop-color="#facc15"/><stop offset=".6" stop-color="#22c55e"/><stop offset=".8" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>';
  else if(fx==='atardecer') d+='<linearGradient id="g'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset=".45" stop-color="#ec4899"/><stop offset="1" stop-color="#f97316"/></linearGradient>';
  else if(fx==='oceano') d+='<linearGradient id="g'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>';
  else if(fx==='galaxia') d+='<radialGradient id="g'+u+'" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#7c3aed"/><stop offset=".55" stop-color="#312e81"/><stop offset="1" stop-color="#0f0a2e"/></radialGradient>';
  if(ac==='metal'||ac==='perla') d+='<linearGradient id="m'+u+'" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="'+(ac==='perla'?'.85':'.75')+'"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="'+(ac==='perla'?'.08':'.32')+'"/></linearGradient>';
  if(ac==='perla') d+='<linearGradient id="h'+u+'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f9a8d4" stop-opacity=".45"/><stop offset=".5" stop-color="#a5f3fc" stop-opacity=".35"/><stop offset="1" stop-color="#c4b5fd" stop-opacity=".45"/></linearGradient>';
  if(ac==='carbono') d+='<pattern id="p'+u+'" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="3.2" fill="rgba(0,0,0,.30)"/><rect x="1.6" width="1.6" height="1.6" fill="rgba(255,255,255,.10)"/></pattern>';
  return d;
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
  var u=++_lpUid, def=(typeof PIST_CASCO!=='undefined'&&PIST_CASCO.find(function(h){return h.id===x.casco && h.c===col;}))||null;
  var fx=def&&def.fx, ac=x.acabado||'', grad=(fx==='arcoiris'||fx==='atardecer'||fx==='oceano'||fx==='galaxia');
  var s='<defs><clipPath id="c'+u+'"><path d="'+_LP_DOME+'"/></clipPath>'+_cascoFxDefs(grad?fx:'',ac,u)+'</defs><path d="'+_LP_DOME+'" fill="'+(grad?'url(#g'+u+')':col)+'"/>';
  if(fx==='galaxia') s+='<g fill="#fff"><circle cx="30" cy="32" r=".9"/><circle cx="44" cy="24" r=".7"/><circle cx="62" cy="30" r="1"/><circle cx="72" cy="42" r=".7"/><circle cx="24" cy="46" r=".7"/><circle cx="54" cy="44" r=".6"/><path d="'+_lpStar(38,38,1.8,.6)+'"/><path d="'+_lpStar(66,22,1.5,.5)+'"/></g><ellipse cx="58" cy="36" rx="12" ry="5" fill="#ec4899" opacity=".25" transform="rotate(-20 58 36)"/>';
  if(ac==='carbono') s+='<path d="'+_LP_DOME+'" fill="url(#p'+u+')"/>';
  if(x.diseno) s+='<g clip-path="url(#c'+u+')">'+_disenoSVG(x.diseno,x.disenoCol)+'</g>';
  // ventilaciones + volumen
  s+='<g fill="rgba(0,0,0,.30)"><ellipse cx="38" cy="31" rx="2.8" ry="8" transform="rotate(28 38 31)"/><ellipse cx="62" cy="31" rx="2.8" ry="8" transform="rotate(-28 62 31)"/><ellipse cx="24.5" cy="43" rx="2.2" ry="6" transform="rotate(48 24.5 43)"/><ellipse cx="75.5" cy="43" rx="2.2" ry="6" transform="rotate(-48 75.5 43)"/></g>';
  if(ac==='metal'||ac==='perla') s+='<path d="'+_LP_DOME+'" fill="url(#m'+u+')"/>';
  if(ac==='perla') s+='<path d="'+_LP_DOME+'" fill="url(#h'+u+')"/>';
  if(ac==='mate') s+='<path d="'+_LP_DOME+'" fill="rgba(0,0,0,.07)"/>';
  if(ac==='neon'){ var gl=_lpShade(_LP_HEX.test(col)?col:'#39ff14',.55); s+='<path d="M12.5 53.5 A37.5 35.5 0 0 1 87.5 53.5" fill="none" stroke="'+gl+'" stroke-width="5" opacity=".28"/><path d="M13 53 A37 35 0 0 1 87 53" fill="none" stroke="'+gl+'" stroke-width="1.3"/>'; }
  s+='<path d="M12 54 Q50 45 88 54 Z" fill="rgba(0,0,0,.13)"/>';
  if(ac!=='mate') s+='<path d="M21 42 Q27 26 45 21" stroke="rgba(255,255,255,'+(ac==='metal'||ac==='perla'?'.7':'.5')+')" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="19.6" cy="46.4" r="1.3" fill="rgba(255,255,255,.45)"/>';
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
function _accCascoSVG(id,col){
  // `col` (opcional) = color elegido para el accesorio; sin él, el color original.
  function C(def){ return col||def; }
  var h, k, u;
  if(id==='camara'){ k=C('#1a1a1a'); return '<rect x="45" y="21" width="10" height="7" rx="1.5" fill="'+k+'"/><circle cx="50" cy="24.5" r="2.2" fill="#3a7bd5"/><circle cx="50" cy="24.5" r="0.9" fill="#cfe8ff"/>'; }
  if(id==='luz'){ k=C('#fff59d'); return '<circle cx="50" cy="22" r="3.4" fill="'+k+'"/><path d="M50 22 L44 16 M50 22 L56 16 M50 22 L50 14" stroke="'+k+'" stroke-width="1.1" opacity="0.6" stroke-linecap="round"/>'; }
  if(id==='cresta'){ k=C('#fc4c02'); return '<g fill="none" stroke="'+k+'" stroke-width="3" stroke-linecap="round"><path d="M40 27 Q44 13 47 26"/><path d="M47 26 Q50 10 53 26"/><path d="M53 26 Q56 13 60 27"/></g>'; }
  if(id==='antena') return '<line x1="50" y1="23" x2="50" y2="11" stroke="#333" stroke-width="1.5"/><circle cx="50" cy="10" r="2.5" fill="'+C('#fc4c02')+'"/>';
  if(id==='vikingo'){ k=C('#f1e6c8'); u=++_lpUid; h='<path d="M25 34 Q11 31 8 13 Q16 24 30 27 Z" fill="url(#a'+u+')" stroke="'+_lpShade(k,-.35)+'" stroke-width=".7"/><path d="M12.5 23 Q16 26 20 27.5 M10 18 Q12.5 21 15.5 22.5" stroke="'+_lpShade(k,-.3)+'" stroke-width=".8" fill="none"/><path d="M10.5 16.5 Q13 23 21 26.5" stroke="rgba(255,255,255,.6)" stroke-width=".9" fill="none" stroke-linecap="round"/><path d="M23 34.5 L31 26 L33.5 29 L26 37 Z" fill="#8b6b3d" stroke="#5b4426" stroke-width=".5"/><path d="M24.8 33.4 L31.4 26.6" stroke="#c9a227" stroke-width="1.1"/><circle cx="26.5" cy="34" r=".6" fill="#e5e7eb"/><circle cx="30.6" cy="29.6" r=".6" fill="#e5e7eb"/>'; return '<defs><linearGradient id="a'+u+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+_lpShade(k,.35)+'"/><stop offset=".6" stop-color="'+k+'"/><stop offset="1" stop-color="'+_lpShade(k,-.35)+'"/></linearGradient></defs>'+h+_lpMirror(h); }
  if(id==='diablo'){ k=C('#dc2626'); h='<path d="M32 25.5 Q27 15 22 10 Q33 13 38.5 23 Z" fill="'+k+'"/><path d="M31 21 Q28 16 24.5 12.5" stroke="rgba(255,255,255,.35)" stroke-width="1" fill="none" stroke-linecap="round"/>'; return h+_lpMirror(h); }
  if(id==='unicornio'){ k=C('#fde68a'); u=++_lpUid; return '<defs><linearGradient id="a'+u+'" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="'+k+'"/><stop offset=".5" stop-color="#f9a8d4"/><stop offset="1" stop-color="#a5f3fc"/></linearGradient></defs><path d="M44 21 Q39.5 16.5 40.5 11 Q43 16.5 46.5 18 Z" fill="#c4b5fd"/><path d="M56 21 Q60.5 16.5 59.5 11 Q57 16.5 53.5 18 Z" fill="#7dd3fc"/><path d="M45.5 20.5 L50 1 L54.5 20.5 Z" fill="url(#a'+u+')" stroke="'+_lpShade(k,-.35)+'" stroke-width=".6"/><path d="M45.9 17.6 L54.1 14.8 M46.8 13.4 L53.2 11 M47.8 9.2 L52.2 7.6 M48.7 5.4 L51.2 4.5" stroke="rgba(255,255,255,.75)" stroke-width="1" stroke-linecap="round"/><path d="M47.6 19.5 L50 4" stroke="rgba(255,255,255,.45)" stroke-width=".8"/><path d="'+_lpStar(56,4,2.2,.6)+'" fill="#fff"/><path d="'+_lpStar(43.5,8,1.4,.45)+'" fill="#fff"/>'; }
  if(id==='gato'){ k=C('#1f2937'); h='<path d="M23 31 L26 11 L40 22.5 Z" fill="'+k+'"/><path d="M26 27 L27.6 16 L35.5 22.6 Z" fill="#f9a8d4"/>'; return h+_lpMirror(h); }
  if(id==='oso'){ k=C('#8b5a2b'); h='<circle cx="27" cy="25" r="7.4" fill="'+k+'"/><circle cx="27" cy="25" r="3.8" fill="'+_lpShade(k,.35)+'"/>'; return h+_lpMirror(h); }
  if(id==='conejo'){ k=C('#f8fafc'); h='<ellipse cx="40" cy="10.5" rx="4.6" ry="11" fill="'+k+'" stroke="'+_lpShade(k,-.2)+'" stroke-width=".7" transform="rotate(-12 40 10.5)"/><ellipse cx="40" cy="11.5" rx="2.2" ry="8" fill="#f9a8d4" transform="rotate(-12 40 11.5)"/>'; return h+_lpMirror(h); }
  if(id==='corona'){ k=C('#f5c518'); u=++_lpUid; return '<defs>'+_lpGrad('a'+u,k)+'</defs><path d="M37 23 L35 8 L42.5 15 L50 4.5 L57.5 15 L65 8 L63 23 Q50 20 37 23 Z" fill="url(#a'+u+')" stroke="'+_lpShade(k,-.45)+'" stroke-width=".8" stroke-linejoin="round"/><path d="M37.2 21 Q50 18 62.8 21 L63 23 Q50 20 37 23 Z" fill="'+_lpShade(k,-.3)+'"/><path d="M38.5 19 L37.4 11.5 L42 16 M50 7.5 L46.5 13" stroke="rgba(255,255,255,.65)" stroke-width=".9" fill="none" stroke-linecap="round"/>'
    +'<circle cx="50" cy="16" r="2.3" fill="#e11d48" stroke="'+_lpShade(k,-.4)+'" stroke-width=".6"/><circle cx="49.3" cy="15.3" r=".7" fill="#fff" opacity=".85"/><circle cx="41.5" cy="18.3" r="1.6" fill="#2563eb" stroke="'+_lpShade(k,-.4)+'" stroke-width=".5"/><circle cx="41" cy="17.8" r=".5" fill="#fff"/><circle cx="58.5" cy="18.3" r="1.6" fill="#16a34a" stroke="'+_lpShade(k,-.4)+'" stroke-width=".5"/><circle cx="58" cy="17.8" r=".5" fill="#fff"/>'
    +'<circle cx="35" cy="8" r="1.4" fill="#fff7cc"/><circle cx="50" cy="4.5" r="1.5" fill="#fff7cc"/><circle cx="65" cy="8" r="1.4" fill="#fff7cc"/><path d="'+_lpStar(67.5,5,2.6,.7)+'" fill="#fff"/>'; }
  if(id==='aureola'){ k=C('#fde047'); u=++_lpUid; return '<defs><radialGradient id="a'+u+'"><stop offset=".55" stop-color="'+k+'" stop-opacity=".55"/><stop offset="1" stop-color="'+k+'" stop-opacity="0"/></radialGradient></defs><ellipse cx="50" cy="9" rx="24" ry="9" fill="url(#a'+u+')"/><ellipse cx="50" cy="9.6" rx="17" ry="4.2" fill="none" stroke="'+_lpShade(k,-.35)+'" stroke-width="2.6"/><ellipse cx="50" cy="9" rx="17" ry="4.2" fill="none" stroke="'+k+'" stroke-width="2.2"/><path d="M36 7.6 Q43 5.2 52 5" stroke="#fff" stroke-width="1" fill="none" stroke-linecap="round" opacity=".9"/><path d="'+_lpStar(31,6,2.2,.6)+'" fill="#fff"/><path d="'+_lpStar(70,12.5,1.6,.5)+'" fill="#fff"/>'; }
  if(id==='helice'){ u=++_lpUid; var c1=C('#ef4444'), c2=col?_lpShade(col,-.3):'#3b82f6'; return '<line x1="50" y1="19" x2="50" y2="10.5" stroke="#4b5563" stroke-width="1.6"/><ellipse cx="41.5" cy="9.5" rx="8.5" ry="2.4" fill="'+c1+'" stroke="'+_lpShade(c1,-.35)+'" stroke-width=".5"/><ellipse cx="58.5" cy="9.5" rx="8.5" ry="2.4" fill="'+c2+'" stroke="'+_lpShade(c2,-.35)+'" stroke-width=".5"/><path d="M35 8.6 Q40 7.6 45 8.4 M55 8.4 Q60 7.6 65 8.6" stroke="rgba(255,255,255,.6)" stroke-width=".8" fill="none" stroke-linecap="round"/><circle cx="50" cy="9.5" r="2.4" fill="#facc15" stroke="#ca8a04" stroke-width=".5"/><circle cx="49.3" cy="8.8" r=".7" fill="#fff"/>'; }
  if(id==='flor'){ k=C('#f9a8d4'); var f=''; for(var i=0;i<5;i++){ var a=i*72*Math.PI/180; f+='<circle cx="'+(29+4*Math.cos(a)).toFixed(2)+'" cy="'+(24+4*Math.sin(a)).toFixed(2)+'" r="3.4" fill="'+k+'" stroke="'+_lpShade(k,-.25)+'" stroke-width=".5"/>'; } return '<path d="M33 27 Q37 30 36 34" stroke="#16a34a" stroke-width="1.4" fill="none"/>'+f+'<circle cx="29" cy="24" r="2.4" fill="#facc15"/>'; }
  if(id==='lazo'){ k=C('#ec4899'); return '<path d="M69 25 L58 18 L59.5 31 Z" fill="'+k+'"/><path d="M69 25 L80 18 L78.5 31 Z" fill="'+k+'"/><path d="M60 20.5 L66 24 M78 20.5 L72 24" stroke="rgba(0,0,0,.18)" stroke-width="1"/><circle cx="69" cy="25" r="3" fill="'+_lpShade(k,-.18)+'"/>'; }
  if(id==='alas'){ k=C('#ffffff'); u=++_lpUid; var sh=_lpShade(k,-.22), ln=_lpShade(k,-.42); h='<path d="M15 45 Q1 41 0.5 26 Q5 31.5 9.5 32 Q3.5 35.5 8.5 39 Q4.5 41.5 15 42 Z" fill="'+sh+'" stroke="'+ln+'" stroke-width=".7" stroke-linejoin="round"/><path d="M15.5 43 Q4.5 38 4 28 Q8 32.5 12 33 Q7.5 36 11.5 38.5 Q8.5 40.5 15.5 40.5 Z" fill="'+k+'" stroke="'+ln+'" stroke-width=".6" stroke-linejoin="round"/><path d="M15.5 40.5 Q10 37 8 32.5 M15 42.5 Q8.5 40 5.5 34.5 M14 44 Q6 42 3 37" stroke="'+ln+'" stroke-width=".55" fill="none" opacity=".7"/><path d="M12.5 34 Q10 32.8 8.6 30.6" stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round"/>'; return h+_lpMirror(h)+'<path d="'+_lpStar(4,24,1.7,.5)+'" fill="#fff"/>'; }
  if(id==='pinchos'){ k=C('#cbd5e1'); u=++_lpUid; var p='', b=''; [-62,-40,-18,0,18,40,62].forEach(function(dg){ var t=(90-dg)*Math.PI/180, bx=50+37*Math.cos(t), by=54-35*Math.sin(t), tx=50+48*Math.cos(t), ty=54-46*Math.sin(t), nx=Math.sin(t)*3.4, ny=Math.cos(t)*3.4; p+='<path d="M'+(bx-nx).toFixed(1)+' '+(by-ny).toFixed(1)+' L'+tx.toFixed(1)+' '+ty.toFixed(1)+' L'+(bx+nx).toFixed(1)+' '+(by+ny).toFixed(1)+' Z"/>'; b+='<path d="M'+(bx-nx*.4).toFixed(1)+' '+(by-ny*.4).toFixed(1)+' L'+(tx-nx*.12).toFixed(1)+' '+(ty-ny*.12).toFixed(1)+'"/>'; }); return '<defs>'+_lpGrad('a'+u,k)+'</defs><g fill="url(#a'+u+')" stroke="'+_lpShade(k,-.5)+'" stroke-width=".7" stroke-linejoin="round">'+p+'</g><g stroke="rgba(255,255,255,.75)" stroke-width=".7" stroke-linecap="round">'+b+'</g>'; }
  if(id==='dino'){ k=C('#22c55e'); u=++_lpUid; return '<defs>'+_lpGrad('a'+u,k)+'</defs><g fill="url(#a'+u+')" stroke="'+_lpShade(k,-.4)+'" stroke-width=".8" stroke-linejoin="round"><path d="M40 21 Q41 11 46 14 Q46 18 46 19.5 Z"/><path d="M45 19 Q50 5 55 19 Z"/><path d="M54 19.5 Q54 14 54 14 Q59 11 60 21 Z"/></g><g fill="'+_lpShade(k,-.25)+'"><circle cx="50" cy="14" r="1.1"/><circle cx="48.4" cy="16.6" r=".7"/><circle cx="43.6" cy="16.5" r=".7"/><circle cx="56.4" cy="16.5" r=".7"/></g><path d="M48 15 Q49 10 50.5 8.5" stroke="rgba(255,255,255,.6)" stroke-width=".8" fill="none" stroke-linecap="round"/>'; }
  if(id==='brote'){ k=C('#4ade80'); return '<path d="M50 19 Q49 13 51 8" stroke="#16a34a" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M51 9 Q56 3 62 6 Q57 11 51 9 Z" fill="'+k+'"/><path d="M50.5 12 Q45 7 39.5 9.5 Q44.5 14 50.5 12 Z" fill="'+_lpShade(k,-.18)+'"/>'; }
  if(id==='estrella'){ k=C('#facc15'); return '<path d="M50 19 Q46 15 50 12 Q54 9 50 6" stroke="#9ca3af" stroke-width="1.1" fill="none"/><path d="'+_lpStar(50,4.5,5,2.2)+'" fill="'+k+'" stroke="'+_lpShade(k,-.3)+'" stroke-width=".6"/>'; }
  return '';
}
function _gadgetSVG(id,col){
  function C(def){ return col||def; }
  var k;
  if(id==='visera'){ k=C('#111827'); return '<path d="M20 53.5 Q50 43 80 53.5 Q83 56 81 58.5 Q50 50 19 58.5 Q17 56 20 53.5 Z" fill="'+k+'" opacity=".9"/><path d="M24 53.2 Q50 45.6 76 53.2" stroke="rgba(255,255,255,.28)" stroke-width="1" fill="none"/>'; }
  if(id==='gopro'){ k=C('#111827'); return '<path d="M82 45 L86 43" stroke="#374151" stroke-width="2.2"/><rect x="84" y="36.5" width="10" height="8" rx="1.6" fill="'+k+'"/><circle cx="89" cy="40.5" r="2.6" fill="#1e3a8a" stroke="#0b1220" stroke-width=".6"/><circle cx="88.3" cy="39.8" r=".9" fill="#bfdbfe"/><circle cx="92.4" cy="37.8" r=".6" fill="#ef4444"/>'; }
  if(id==='luzroja'){ k=C('#ef4444'); return '<circle cx="15" cy="46" r="5.4" fill="'+k+'" opacity=".28"/><rect x="12" y="44.2" width="6" height="3.6" rx="1.6" fill="'+k+'" stroke="'+_lpShade(k,-.5)+'" stroke-width=".6"/><rect x="13" y="45" width="2" height="1.2" rx=".6" fill="#fff" opacity=".7"/>'; }
  if(id==='espejo'){ k=C('#374151'); return '<path d="M15 50 L7 44.5" stroke="'+k+'" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="5.2" cy="42.5" rx="3.8" ry="2.9" fill="#cbd5e1" stroke="'+k+'" stroke-width="1"/><path d="M3.4 41.6 Q5 40.4 6.8 41" stroke="#fff" stroke-width=".8" fill="none"/>'; }
  if(id==='reflectante'){ k=C('#fef08a'); return '<path d="M13.5 47 Q50 34 86.5 47" fill="none" stroke="#e5e7eb" stroke-width="3"/><path d="M13.5 47 Q50 34 86.5 47" fill="none" stroke="'+k+'" stroke-width="3" stroke-dasharray="2 6" opacity=".9"/><path d="'+_lpStar(30,40.6,1.8,.5)+'" fill="#fff"/>'; }
  if(id==='banderin'){ k=C('#fc4c02'); return '<line x1="83" y1="46" x2="96" y2="2" stroke="#6b7280" stroke-width="1.2"/><path d="M96 2 L84 6 L94.6 10.8 Z" fill="'+k+'"/>'; }
  return '';
}
function _aroSVG(id,col){
  var m=col||'#e8c34a', o=_lpShade(m,-.3);
  if(id==='argolla') return '<g fill="none" stroke="'+m+'" stroke-width="2.2"><circle cx="15" cy="70" r="4"/><circle cx="85" cy="70" r="4"/></g>';
  if(id==='perla') return '<circle cx="15" cy="69" r="2.6" fill="#fef3c7" stroke="'+m+'" stroke-width="0.8"/><circle cx="85" cy="69" r="2.6" fill="#fef3c7" stroke="'+m+'" stroke-width="0.8"/>';
  if(id==='estrella'){ var e=col||'#facc15'; return '<path d="'+_lpStar(15,69,3.2)+'" fill="'+e+'" stroke="'+_lpShade(e,-.3)+'" stroke-width=".5"/><path d="'+_lpStar(85,69,3.2)+'" fill="'+e+'" stroke="'+_lpShade(e,-.3)+'" stroke-width=".5"/>'; }
  if(id==='corazon'){ var c=col||'#ec4899'; return '<path d="'+_lpHeart(15,69,2.6)+'" fill="'+c+'"/><path d="'+_lpHeart(85,69,2.6)+'" fill="'+c+'"/>'; }
  if(id==='colgante') return '<g stroke="'+m+'" stroke-width="1"><line x1="15" y1="67" x2="15" y2="72"/><line x1="85" y1="67" x2="85" y2="72"/></g><path d="M15 71.5 Q12.6 75 15 76.8 Q17.4 75 15 71.5 Z" fill="#38bdf8" stroke="'+m+'" stroke-width=".6"/><path d="M85 71.5 Q82.6 75 85 76.8 Q87.4 75 85 71.5 Z" fill="#38bdf8" stroke="'+m+'" stroke-width=".6"/>';
  if(id==='doble'){ var d=col||'#cbd5e1'; return '<g fill="none" stroke="'+d+'" stroke-width="1.4"><circle cx="15" cy="68" r="2.4"/><circle cx="85" cy="68" r="2.4"/><circle cx="14.6" cy="72.4" r="2.6"/><circle cx="85.4" cy="72.4" r="2.6"/></g>'; }
  return '';
}
function _lentesSVG(id, col, marco){
  col=col||'#16203a';
  function M(def){ return marco||def; }
  var brillo='<path d="M32 60.5 L36 58.6 M52 60.5 L56 58.6" stroke="rgba(255,255,255,.55)" stroke-width="1.1" stroke-linecap="round"/>', f;
  if(id==='deportivas') return '<path d="M28 58 Q50 56 72 58 Q73 63 70 68 Q50 66 30 68 Q27 63 28 58 Z" fill="'+col+'" opacity=".92"'+(marco?' stroke="'+marco+'" stroke-width="1.6"':'')+'/><path d="M29 58.5 Q50 56.5 71 58.5" stroke="rgba(255,255,255,.45)" stroke-width="1.2" fill="none"/><path d="M48 61.5 L52 61.5" stroke="'+M('#0b1220')+'" stroke-width="2"/>';
  if(id==='redondas'){ f=M('#3a3f52'); return '<g stroke="'+f+'" stroke-width="1.8" fill="'+col+'" fill-opacity=".55"><circle cx="40" cy="63" r="8"/><circle cx="60" cy="63" r="8"/></g><path d="M48 63 L52 63" stroke="'+f+'" stroke-width="1.8"/><path d="M32 62 L26.5 60.5" stroke="'+f+'" stroke-width="1.6" fill="none"/><path d="M68 62 L73.5 60.5" stroke="'+f+'" stroke-width="1.6" fill="none"/>'; }
  if(id==='aviador'){ f=M('#c9a227'); return '<g stroke="'+f+'" stroke-width="1.3"><path d="M31 59.5 Q41 58.5 48.5 60.5 Q48.5 68 40 68.5 Q31.5 68 31 60.5 Z" fill="'+col+'" opacity=".85"/><path d="M69 59.5 Q59 58.5 51.5 60.5 Q51.5 68 60 68.5 Q68.5 68 69 60.5 Z" fill="'+col+'" opacity=".85"/><path d="M48.5 60.5 Q50 60 51.5 60.5" fill="none"/><path d="M31 60 L26.5 58.5" fill="none"/><path d="M69 60 L73.5 58.5" fill="none"/></g>'; }
  if(id==='escudo') return '<path d="M25 57 Q50 52.5 75 57 Q76.5 65 71 70.5 Q61 72.5 53 67.5 Q50 65.5 47 67.5 Q39 72.5 29 70.5 Q23.5 65 25 57 Z" fill="'+col+'" opacity=".93"'+(marco?' stroke="'+marco+'" stroke-width="1.8"':'')+'/><path d="M27 58 Q50 54 73 58" stroke="rgba(255,255,255,.5)" stroke-width="1.3" fill="none"/><path d="M31 66 Q37 62 44 60" stroke="rgba(255,255,255,.25)" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  if(id==='mascara'){ f=M('#111827'); return '<path d="M26 61 L13 58 M74 61 L87 58" stroke="'+f+'" stroke-width="3.2" stroke-linecap="round"/><rect x="25.5" y="54.5" width="49" height="16" rx="7.5" fill="'+col+'" opacity=".88" stroke="'+f+'" stroke-width="2.2"/><path d="M29 59 Q38 56.5 47 58" stroke="rgba(255,255,255,.55)" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M47.5 70.5 Q50 66.5 52.5 70.5" fill="'+f+'"/>'; }
  if(id==='cuadrados'){ f=M('#2b2f3d'); return '<g stroke="'+f+'" stroke-width="2" fill="'+col+'" fill-opacity=".5"><rect x="31.5" y="56.5" width="16" height="13" rx="2.2"/><rect x="52.5" y="56.5" width="16" height="13" rx="2.2"/></g><path d="M47.5 61.5 Q50 60 52.5 61.5" stroke="'+f+'" stroke-width="2" fill="none"/><path d="M31.5 59 L26 58 M68.5 59 L74 58" stroke="'+f+'" stroke-width="1.6"/>'+brillo; }
  if(id==='gato'){ f=M('#111827'); return '<g fill="'+col+'" fill-opacity=".7" stroke="'+f+'" stroke-width="1.7" stroke-linejoin="round"><path d="M27 55.5 Q38 57.5 48 59.5 Q48 67.5 40.5 68.5 Q32.5 68.5 31 61.5 Z"/><path d="M73 55.5 Q62 57.5 52 59.5 Q52 67.5 59.5 68.5 Q67.5 68.5 69 61.5 Z"/></g><path d="M48 60 Q50 59 52 60" stroke="'+f+'" stroke-width="1.7" fill="none"/>'+brillo; }
  if(id==='corazon'){ f=M('#be185d'); return '<g fill="'+col+'" fill-opacity=".78" stroke="'+f+'" stroke-width="1.5"><path d="'+_lpHeart(40,62.5,6.6)+'"/><path d="'+_lpHeart(60,62.5,6.6)+'"/></g><path d="M46.5 60.5 Q50 59 53.5 60.5" stroke="'+f+'" stroke-width="1.5" fill="none"/><path d="M31 59 L26.5 58 M69 59 L73.5 58" stroke="'+f+'" stroke-width="1.4"/>'+brillo; }
  if(id==='estrella'){ f=M('#ca8a04'); return '<g fill="'+col+'" fill-opacity=".78" stroke="'+f+'" stroke-width="1.4" stroke-linejoin="round"><path d="'+_lpStar(40,63.5,9.5,4.6)+'"/><path d="'+_lpStar(60,63.5,9.5,4.6)+'"/></g><path d="M47.5 61 Q50 60 52.5 61" stroke="'+f+'" stroke-width="1.4" fill="none"/>'; }
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
  // Quien eligió cromo/cobre/dorado/perla/neón antes de v2 no tenía acabado aparte:
  // se le da el acabado que esa opción traía incluido.
  if(o.acabado===undefined||o.acabado===null){ var hd=PIST_CASCO.find(function(h){return h.id===r.casco;}); r.acabado=(hd&&(hd.fx==='metal'||hd.fx==='perla'||hd.fx==='neon'))?hd.fx:''; }
  // Solo valores del catálogo o colores '#rrggbb': el objeto puede venir de Firestore
  // (lo escribe el cliente de otro usuario) y estos valores se insertan tal cual en el SVG.
  var CAT={piel:PIST_PIEL,lentes:PIST_LENTES,bigote:PIST_BIGOTE,acc:PIST_ACC,pelo:PIST_PELO,pest:PIST_PEST,aro:PIST_ARO,
    diseno:PIST_DISENO,gadget:PIST_GADGET,marca:PIST_MARCA,cuello:PIST_CUELLO,acabado:PIST_ACABADO};
  for(var c in CAT){ var v=r[c]; if(!CAT[c].some(function(it){return it.id===v;})) r[c]=PIST_DEF[c]; }
  // colores libres (selector de color): '' (= original/sin) o hex de 6 dígitos
  ['peloCol','lentesCol','disenoCol','pano','ojosCol','labios','accCol','gadgetCol','marcoCol','aroCol'].forEach(function(c){ if(r[c]!=='' && !_LP_HEX.test(String(r[c]))) r[c]=PIST_DEF[c]; });
  if(!_LP_HEX.test(String(r.casco)) && !PIST_CASCO.some(function(h){return h.id===r.casco;})) r.casco=PIST_DEF.casco;
  if(!r.cuello && r.pano) r.cuello='panoleta';
  if(r.cuello && !r.pano) r.pano='#fc4c02';
  return r;
}
