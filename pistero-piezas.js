/* ===== MINIATURAS DE PIEZA SOLA (armario de Pistero, 2026-10-05) =====
   Pedido de Inty: "si el usuario quiere elegir lentes, sale solo lentes; y se van montando en el
   Pistero que está al lado de Sorpréndeme. Y así con todo lo demás". Antes cada tarjeta repetía al
   Pistero completo y solo cambiaba un detalle. Ahora cada tarjeta muestra SOLO la pieza, encuadrada
   en su zona real de Pistero (mismas coordenadas: viewBox 0 0 100 84), y el ÚNICO Pistero completo
   es el grande de arriba. Cuando la pieza sola no se entiende, va sobre una silueta tenue del casco o
   de la cara (sin ojos ni boca: no es otro Pistero).
   _ptPiezaSVG devuelve '' cuando la categoría se muestra mejor con el personaje (traje, auto/moto,
   dorsal): ahí la tarjeta sigue usando el dibujo de siempre. */
var _PZ_SIL_CASCO='<path d="M12 54 A38 36 0 0 1 88 54 Z" fill="#5b6984" opacity=".5"/><path d="M12 54 Q50 66 88 54 L88 48 Q50 60 12 48 Z" fill="#45526b" opacity=".6"/>';
var _PZ_SIL_CARA='<path d="M16 50 Q16 78 50 80 Q84 78 84 50 Z" fill="#5b6984" opacity=".42"/>';
// lienzo de piel SIN ojos ni boca: para lo que va pintado en la cara (pecas, aros, barba)
function _pzPiel(o){ var p=PIST_PIEL.find(function(it){return it.id===o.piel;}); return '<path d="M16 50 Q16 78 50 80 Q84 78 84 50 Z" fill="'+(p?p.c:'#f4c9a0')+'"/><path d="M22 74 Q50 84 78 74 Q66 80 50 80 Q34 80 22 74 Z" fill="rgba(0,0,0,.07)"/>'; }
// encuadre de cada familia (medido sobre la geometría real de Pistero)
var _PZ_VB={casco:'9 14 82 46', acc:'2 -10 96 64', gadget:'0 -8 100 66', lentes:'20 50 60 26', pelo:'-4 6 108 86',
  pest:'28 50 44 24', marca:'16 52 68 30', aro:'8 56 84 30', cuello:'10 64 80 30', bigote:'32 62 36 18', piel:'14 46 72 36'};
var _PZ_BICI={biciTipo:1,biciSkin:1,biciAcab:1,biciNeum:1,biciAros:1,biciCarga:1,biciExtra:1,bandera:1,mascota:1,estela:1};
function _pzSvg(vb,cuerpo){ return '<svg viewBox="'+vb+'" xmlns="http://www.w3.org/2000/svg">'+cuerpo+'</svg>'; }
function _ptPiezaSVG(k,id,opts){
  try{
    var o=(typeof _pistNormal==='function')?_pistNormal(opts):opts, col=_lpColCasco(o.casco);
    if(k==='acabado') return _pzSvg(_PZ_VB.casco,_cascoSVG(col,Object.assign({},o,{acabado:id,diseno:''})));
    if(k==='diseno') return _pzSvg(_PZ_VB.casco,_cascoSVG(col,Object.assign({},o,{diseno:id})));
    if(k==='acc') return _pzSvg(_PZ_VB.acc,_PZ_SIL_CASCO+(id?_accCascoSVG(id,o.accCol):''));
    if(k==='gadget') return _pzSvg(_PZ_VB.gadget,_PZ_SIL_CASCO+(id?_gadgetSVG(id,o.gadgetCol):''));
    if(k==='lentes') return _pzSvg(_PZ_VB.lentes,id?_lentesSVG(id,o.lentesCol,o.marcoCol):'');
    if(k==='pelo'){ var x=Object.assign({},o,{pelo:id}); return _pzSvg(_PZ_VB.pelo,(id?_peloAtrasSVG(id,o.peloCol,x):'')+_PZ_SIL_CARA+(id?_peloFrenteSVG(id,o.peloCol,x):'')+_PZ_SIL_CASCO); }
    if(k==='pest') return _pzSvg(_PZ_VB.pest,_pzPiel(o)+'<ellipse cx="40" cy="63" rx="6.2" ry="7.6" fill="#16203a"/><ellipse cx="60" cy="63" rx="6.2" ry="7.6" fill="#16203a"/>'+(id?_pestanasSVG(id):''));
    if(k==='marca') return _pzSvg(_PZ_VB.marca,_pzPiel(o)+(id?_marcaSVG(id,Object.assign({},o,{marca:id})):''));
    if(k==='aro') return _pzSvg(_PZ_VB.aro,_pzPiel(o)+(id?_aroSVG(id,o.aroCol):''));
    if(k==='cuello') return _pzSvg(_PZ_VB.cuello,'<path d="M22 70 Q50 86 78 70 Q72 80 50 82 Q28 80 22 70 Z" fill="#334058" opacity=".45"/>'+(id?_cuelloSVG(id,o.pano||'#fc4c02'):''));
    if(k==='bigote') return _pzSvg(_PZ_VB.bigote,_pzPiel(o)+(id?_bigoteSVG(id):''));
    if(k==='piel'){ var p=PIST_PIEL.find(function(it){return it.id===id;}); var c=p?p.c:'#f4c9a0';
      return _pzSvg(_PZ_VB.piel,'<path d="M16 50 Q16 78 50 80 Q84 78 84 50 Z" fill="'+c+'"/><path d="M22 74 Q50 84 78 74 Q66 80 50 80 Q34 80 22 74 Z" fill="rgba(0,0,0,.08)"/><ellipse cx="30" cy="71" rx="5.5" ry="3.2" fill="#ff9db0" opacity=".5"/><ellipse cx="70" cy="71" rx="5.5" ry="3.2" fill="#ff9db0" opacity=".5"/>'); }
    if(_PZ_BICI[k] && typeof _pistBiciSVG==='function'){
      if(k==='biciExtra' && id==='dorsal') return ''; // el dorsal va en la espalda del ciclista
      var m={}; m[k]=id; if(k==='bandera') m.biciExtra='banderin';
      var b=_pistBiciSVG(Object.assign({},o,m),{pedal:false,sinJinete:true});
      var conJinete=(o.biciTipo==='handbike'&&k!=='biciTipo')||(k==='biciTipo'&&id==='handbike'); // la handbike se dibuja siempre con su ciclista
      return conJinete?b:b.replace(/viewBox="[^"]*"/,'viewBox="-6 30 136 82"');
    }
  }catch(e){ console.warn('[armario] miniatura de pieza no disponible', k, id, e); }
  return '';
}
