/* MOLDE DE CABEZA COMÚN para todos los modelos de Pistero (viewBox 0 0 200 200, de frente).
   Todos los modelos se dibujan dentro de este molde y los accesorios se dibujan UNA vez sobre él:
     corona y=24 · borde del casco y=104 (justo sobre los ojos) · línea de ojos y=124
     sienes x=40/160 (correas) · ancho del casco 30..170 (140) · ancho de cabeza = 80% del casco (112)
     base de la cabeza y=180 (si el modelo tiene cuello, nace aquí).
   o.modelo: 'orbe' | 'slime' · o.casco: color · o.lentes: true/false · o.molde: dibuja las guías */
var MOLDE={corona:24, bordeCasco:104, ojos:124, sienI:40, sienD:160, cascoI:30, cascoD:170, cabezaR:56, cx:100, cy:124, base:180};

function _mTono(hex,k){ var n=parseInt(hex.slice(1),16), r=n>>16, g=(n>>8)&255, b=n&255;
  function f(c){ return Math.max(0,Math.min(255,Math.round(k<0?c*(1+k):c+(255-c)*k))); }
  return '#'+((1<<24)+(f(r)<<16)+(f(g)<<8)+f(b)).toString(16).slice(1); }

// --- cabezas (cada modelo, dentro del molde) ---
function _mCabezaOrbe(u){
  var M=MOLDE;
  return '<defs><radialGradient id="'+u+'o" cx=".45" cy=".55" r=".6"><stop offset="0" stop-color="#ff7a2e"/><stop offset=".65" stop-color="#ffb07a"/><stop offset="1" stop-color="#fff1e4"/></radialGradient>'
    +'<filter id="'+u+'h" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>'
    +'<circle cx="'+M.cx+'" cy="'+M.cy+'" r="'+(M.cabezaR+6)+'" fill="#fc4c02" opacity=".45" filter="url(#'+u+'h)"/>'
    +'<circle cx="'+M.cx+'" cy="'+M.cy+'" r="'+M.cabezaR+'" fill="url(#'+u+'o)"/>';
}
function _mCabezaSlime(u){
  var M=MOLDE;
  return '<defs><linearGradient id="'+u+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3d"/><stop offset="1" stop-color="#e2580f"/></linearGradient></defs>'
    +'<path d="M48 120 C48 86 72 70 100 70 C128 70 152 86 152 120 C152 150 160 166 164 176 C150 182 140 172 132 178 C122 186 110 176 100 182 C90 176 78 186 68 178 C60 172 50 182 36 176 C40 166 48 150 48 120 Z" fill="url(#'+u+'s)" opacity=".93"/>'
    +'<g fill="#fff" opacity=".35"><circle cx="72" cy="150" r="3"/><circle cx="130" cy="142" r="2.2"/><circle cx="118" cy="165" r="1.8"/><circle cx="84" cy="168" r="2"/></g>'
    +'<path d="M62 104 C66 94 74 88 84 86" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/>';
}
function _mCara(modelo){
  var M=MOLDE;
  if(modelo==='orbe') return '<g fill="#fffaf2"><circle cx="86" cy="'+M.ojos+'" r="4.6"/><circle cx="114" cy="'+M.ojos+'" r="4.6"/></g><path d="M88 140 Q100 150 112 140" fill="none" stroke="#fffaf2" stroke-width="3.6" stroke-linecap="round"/>';
  return '<g fill="#1b2340"><ellipse cx="84" cy="'+(M.ojos+2)+'" rx="7" ry="8.5"/><ellipse cx="116" cy="'+(M.ojos+2)+'" rx="7" ry="8.5"/></g><g fill="#fff"><circle cx="86.5" cy="'+(M.ojos-1)+'" r="2.4"/><circle cx="118.5" cy="'+(M.ojos-1)+'" r="2.4"/></g><path d="M88 146 Q100 156 112 146" fill="none" stroke="#7a2a0a" stroke-width="3.4" stroke-linecap="round"/>';
}

// --- accesorios (UNA sola vez, sobre el molde) ---
function _mCasco(col){
  var M=MOLDE, CO=_mTono(col,-.4), CL=_mTono(col,.3);
  var cas='M'+M.cascoI+' '+(M.bordeCasco+2)+' C26 60 58 '+(M.corona-4)+' 100 '+(M.corona-6)+' C142 '+(M.corona-4)+' 174 60 '+M.cascoD+' '+(M.bordeCasco+2)+' C171 113 166 118 160 116 C150 108 128 104 100 104 C72 104 50 108 40 116 C34 118 29 113 '+M.cascoI+' '+(M.bordeCasco+2)+' Z';
  var V=['M92 30 Q100 22 108 30 L108 72 Q100 80 92 72 Z','M70 38 Q77 31 84 37 L86 76 Q78 84 72 76 Z','M130 37 Q123 31 116 38 L114 76 Q122 84 128 76 Z','M50 56 Q55 48 62 52 L66 84 Q58 92 52 84 Z','M150 56 Q145 48 138 52 L134 84 Q142 92 148 84 Z'];
  var s='<path d="'+cas+'" fill="'+col+'"/>';
  s+='<path d="M44 54 C62 30 82 22 100 22 C118 22 138 30 156 54 C138 40 120 34 100 34 C80 34 62 40 44 54 Z" fill="'+CL+'" opacity=".45"/>';
  V.forEach(function(d){ s+='<path d="'+d+'" fill="'+CO+'" transform="translate(0 1.6)"/><path d="'+d+'" fill="#1a2036"/>'; });
  s+='<rect x="96" y="20" width="8" height="58" rx="4" fill="#fc4c02" opacity=".9"/>';
  s+='<path d="M'+(M.cascoI+3)+' '+(M.bordeCasco+3)+' C70 100 130 100 '+(M.cascoD-3)+' '+(M.bordeCasco+3)+'" fill="none" stroke="'+CO+'" stroke-width="4" stroke-linecap="round"/>';
  return s;
}
function _mCorreas(){ var M=MOLDE; return '<path d="M'+M.sienI+' 114 C44 140 62 164 92 176 M'+M.sienD+' 114 C156 140 138 164 108 176" fill="none" stroke="#2a3150" stroke-width="3.6" stroke-linecap="round"/><rect x="94" y="172" width="12" height="8" rx="2.5" fill="#4a4e6c"/>'; }
function _mLentes(){ // sobre el casco (no tapan la cara de luz)
  return '<path d="M52 76 C70 68 130 68 148 76 C148 88 138 94 126 92 C118 91 112 86 100 86 C88 86 82 91 74 92 C62 94 52 88 52 76 Z" fill="#1e3a8a" opacity=".9"/><path d="M52 76 C70 68 130 68 148 76" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round"/><path d="M60 78 C70 74 80 73 88 74 L86 79 C78 79 70 80 62 82 Z" fill="#7dd3fc" opacity=".7"/>';
}
function _mGuias(){
  var M=MOLDE, l=function(y,c,t){ return '<line x1="10" y1="'+y+'" x2="190" y2="'+y+'" stroke="'+c+'" stroke-width=".8" stroke-dasharray="3 3"/><text x="12" y="'+(y-2)+'" font-size="6" fill="'+c+'" font-family="system-ui">'+t+'</text>'; };
  return '<g opacity=".95">'+l(M.corona,'#22d3ee','corona')+l(M.bordeCasco,'#ffd700','borde del casco')+l(M.ojos,'#3ccf8e','ojos')+l(M.base,'#c084fc','base')
    +'<line x1="'+M.cascoI+'" y1="14" x2="'+M.cascoI+'" y2="190" stroke="#ff6b6b" stroke-width=".8" stroke-dasharray="3 3"/><line x1="'+M.cascoD+'" y1="14" x2="'+M.cascoD+'" y2="190" stroke="#ff6b6b" stroke-width=".8" stroke-dasharray="3 3"/>'
    +'<circle cx="'+M.cx+'" cy="'+M.cy+'" r="'+M.cabezaR+'" fill="none" stroke="#fff" stroke-width=".8" stroke-dasharray="2 3"/></g>';
}

function pisteroMoldeSVG(o){
  o=o||{}; var u='m'+Math.random().toString(36).slice(2,7), modelo=o.modelo||'orbe';
  var s='<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">';
  s+=(modelo==='slime'?_mCabezaSlime(u):_mCabezaOrbe(u));
  s+=_mCorreas();
  s+=_mCara(modelo);
  s+=_mCasco(o.casco||'#243250');
  if(o.lentes) s+=_mLentes();
  if(o.molde) s+=_mGuias();
  return s+'</svg>';
}
