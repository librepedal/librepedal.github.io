/* Pistero "casco vivo" DE FRENTE (para el ícono, el chat y la selección de modelo). Calcado de la versión
   frontal generada en Gemini (disenos-ui/pistero-nuevo/gemini/captura-05-icono-frente.jpg). Simétrico.
   o.color = color del casco · o.expr = feliz|riendo|sorprendido|sueno|concentrado|guino|hablando */
function pisteroFrenteSVG(o){
  o=o||{};
  var C=o.color||'#fc4c02';
  function tono(hex,k){ var n=parseInt(hex.slice(1),16), r=n>>16, g=(n>>8)&255, b=n&255;
    function f(c){ return Math.max(0,Math.min(255,Math.round(k<0?c*(1+k):c+(255-c)*k))); }
    return '#'+((1<<24)+(f(r)<<16)+(f(g)<<8)+f(b)).toString(16).slice(1); }
  var CS=tono(C,-.2), CO=tono(C,-.42), CL=tono(C,.34), LED=o.led||'#d9fbff';
  var u='pf'+Math.random().toString(36).slice(2,7);
  var CASC='M30 106 C26 60 58 20 100 18 C142 20 174 60 170 106 C171 115 167 121 160 119 C156 111 150 106 142 105 L58 105 C50 106 44 111 40 119 C33 121 29 115 30 106 Z';
  var VIS='M44 104 L156 104 C161 121 158 139 146 147 C136 153 124 151 118 145 C112 139 106 135 100 135 C94 135 88 139 82 145 C76 151 64 153 54 147 C42 139 39 121 44 104 Z';
  var s='<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">';
  s+='<defs><filter id="'+u+'g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    +'<linearGradient id="'+u+'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3440"/><stop offset=".55" stop-color="#2a2232"/><stop offset="1" stop-color="#1c1a2a"/></linearGradient>'
    +'<clipPath id="'+u+'k"><path d="'+CASC+'"/></clipPath></defs>';
  // cabeza oscura y correas
  s+='<path d="M46 108 C46 150 68 178 100 182 C132 178 154 150 154 108 Z" fill="#141b2e"/>';
  s+='<path d="M40 114 C46 140 62 164 88 178 M160 114 C154 140 138 164 112 178" fill="none" stroke="#3a3d58" stroke-width="4.5" stroke-linecap="round"/>';
  s+='<rect x="92" y="174" width="16" height="9" rx="3" fill="#4a4e6c"/>';
  // cáscara con sombra baja y brillo alto
  s+='<path d="'+CASC+'" fill="'+C+'"/>';
  s+='<g clip-path="url(#'+u+'k)"><path d="M20 84 C60 96 140 96 180 84 L180 130 L20 130 Z" fill="'+CS+'"/>'
    +'<path d="M44 56 C62 32 82 24 100 24 C118 24 138 32 156 56 C138 42 120 36 100 36 C80 36 62 42 44 56 Z" fill="'+CL+'" opacity=".55"/>'
    +'<path d="M28 96 C70 102 130 102 172 96 L172 112 L28 112 Z" fill="'+CO+'" opacity=".5"/></g>';
  // ventilaciones con relieve (centro, internas, externas)
  var V=[['M92 34 Q100 26 108 34 L108 76 Q100 84 92 76 Z',100,55],
         ['M70 40 Q77 33 84 39 L86 78 Q78 86 72 78 Z',78,60],['M130 39 Q123 33 116 40 L114 78 Q122 86 128 78 Z',122,60],
         ['M50 58 Q55 50 62 54 L66 84 Q58 92 52 84 Z',58,72],['M150 58 Q145 50 138 54 L134 84 Q142 92 148 84 Z',142,72]];
  V.forEach(function(v){ var d=v[0];
    s+='<path d="'+d+'" fill="none" stroke="'+CL+'" stroke-width="3" stroke-linejoin="round" opacity=".6"/>'
      +'<path d="'+d+'" fill="'+CO+'" transform="translate(0 1.8)"/><path d="'+d+'" fill="#2e3050"/>'
      +'<path d="'+d+'" fill="#4b4e6e" opacity=".5" transform="translate('+v[1]+' '+(v[2]-1.5)+') scale(.8) translate('+(-v[1])+' '+(-v[2])+')"/>'; });
  s+='<rect x="94.5" y="19" width="11" height="9" rx="3" fill="#f6eee8"/>';
  // visera
  s+='<path d="'+VIS+'" fill="url(#'+u+'v)" opacity=".95"/>';
  s+='<path d="M44 104 L156 104 L157 110 L43 110 Z" fill="'+C+'" opacity=".3"/>';
  s+='<path d="M140 106 L156 105 C159 120 157 132 151 140 C148 128 144 116 140 106 Z" fill="#fff" opacity=".14"/>';
  // LED
  var e=o.expr||'feliz', W=' fill="none" stroke="'+LED+'" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"', led='';
  var parp=o.parpadeo!==false?'<animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 .08;1 1" keyTimes="0;.92;.96;1" dur="4.2s" repeatCount="indefinite" additive="sum"/>':'';
  function ojos(){ return '<g transform-origin="100 124"><rect x="73.5" y="111" width="13" height="26" rx="6.5"/><rect x="113.5" y="111" width="13" height="26" rx="6.5"/>'+parp+'</g>'; }
  function arco(x){ return '<path d="M'+(x-8)+' 128 Q'+x+' 115 '+(x+8)+' 128"'+W+'/>'; }
  if(e==='feliz') led=ojos()+'<path d="M90 157 Q100 165 110 157"'+W+'/>';
  else if(e==='riendo') led=arco(80)+arco(120)+'<path d="M88 154 L112 154 Q110 168 100 168 Q90 168 88 154 Z"/>';
  else if(e==='sorprendido') led='<circle cx="80" cy="124" r="9"/><circle cx="120" cy="124" r="9"/><circle cx="100" cy="160" r="5"/>';
  else if(e==='sueno') led='<path d="M72 126 Q80 131 88 126 M112 126 Q120 131 128 126"'+W+'/><path d="M94 159 L106 159"'+W+'/>';
  else if(e==='concentrado') led='<rect x="69" y="119" width="22" height="8" rx="4" transform="rotate(8 80 123)"/><rect x="109" y="119" width="22" height="8" rx="4" transform="rotate(-8 120 123)"/><path d="M92 159 L108 159"'+W+'/>';
  else if(e==='guino') led='<rect x="73.5" y="111" width="13" height="26" rx="6.5"/>'+arco(120)+'<path d="M90 157 Q100 165 110 157"'+W+'/>';
  else if(e==='hablando') led=ojos()+'<ellipse cx="100" cy="159" rx="8" ry="4"><animate attributeName="ry" values="2;6;3;7;2" dur=".6s" repeatCount="indefinite"/></ellipse>';
  s+='<g fill="'+LED+'" filter="url(#'+u+'g)">'+led+'</g></svg>';
  return s;
}
