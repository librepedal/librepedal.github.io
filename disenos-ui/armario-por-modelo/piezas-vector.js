/* Piezas propias que son luz o efecto (vector, como las caras): se agregan al SVG que ya armó cada modelo
   (crearXCapas) sin tocar su código. Cada pieza: PIEZAS_VECTOR[modelo][pieza](elModelo) -> {quitar()}.
   Referencias reales en PIEZAS.md. */
var PIEZAS_VECTOR = (function(){
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function nodo(tag, at){ var n=document.createElementNS(NS,tag); for(var k in at) n.setAttribute(k,at[k]); return n; }
  function defsDe(svg){ var d=svg.querySelector('defs'); if(!d){ d=nodo('defs',{}); svg.insertBefore(d,svg.firstChild); } return d; }
  var uid=0;

  // ---------- Slime · Burbujas ----------
  // Aire atrapado en gelatina: esfera transparente con borde claro, brillo arriba a la izquierda y un reflejo tenue abajo
  // (la luz que la burbuja concentra). Suben lento y se desvanecen arriba; quedan DENTRO de la gelatina (máscara con la
  // misma imagen del cuerpo) y DEBAJO de la cara. Van en el grupo "frente" del Slime: se mueven y tiemblan con él.
  function slimeBurbujas(el){
    var svg=el.querySelector('svg'); if(!svg) return null;
    var frente=[].filter.call(svg.querySelectorAll('g[clip-path]'),function(g){ return g.querySelector('image'); })[0]; if(!frente) return null;
    var img=frente.querySelector('image'), cara=img.nextElementSibling, u='pzb'+(++uid);
    var defs=defsDe(svg);
    var f=nodo('filter',{id:u+'b',x:'0',y:'0',width:'1',height:'1'}); f.appendChild(nodo('feColorMatrix',{type:'matrix',values:'0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'}));
    var m=nodo('mask',{id:u+'m',maskUnits:'userSpaceOnUse',x:'0',y:'0',width:'1376',height:'768'});
    m.appendChild(nodo('image',{href:img.getAttribute('href'),x:'0',y:'0',width:'1376',height:'768',filter:'url(#'+u+'b)'}));
    defs.appendChild(f); defs.appendChild(m);
    var g=nodo('g',{mask:'url(#'+u+'m)','class':'pieza-burbujas'});
    // [x, y de partida, radio, segundos en subir, desfase] — a los lados y abajo, lejos de los ojos (EY 382) y la boca (MY 458)
    // radios pensados para la tarjeta del Perfil (el Slime mide ~124 px: radio 34 = ~6 px en pantalla)
    var B=[[462,610,34,9,0],[548,560,18,7,2.1],[912,600,38,10,1.2],[972,540,20,8,4.6],[660,640,16,6.5,3.3],[770,628,26,8.5,5.4],[850,520,15,7.5,.6]];
    B.forEach(function(b){
      var x=b[0], y=b[1], r=b[2], dur=b[3], del=b[4], sube=60+r*2.2;
      var gb=nodo('g',{opacity:reduce?'.8':'0'});
      gb.appendChild(nodo('circle',{cx:x,cy:y,r:r,fill:'rgba(255,240,222,.10)',stroke:'rgba(255,246,232,.62)','stroke-width':Math.max(1.6,r*.14)}));
      gb.appendChild(nodo('ellipse',{cx:x-r*.38,cy:y-r*.4,rx:r*.3,ry:r*.2,fill:'#fff',opacity:'.9',transform:'rotate(-35 '+(x-r*.38)+' '+(y-r*.4)+')'}));
      gb.appendChild(nodo('path',{d:'M'+(x-r*.55)+' '+(y+r*.42)+' Q'+x+' '+(y+r*.82)+' '+(x+r*.55)+' '+(y+r*.42),fill:'none',stroke:'rgba(255,214,170,.55)','stroke-width':Math.max(1.2,r*.12),'stroke-linecap':'round'}));
      if(!reduce){
        gb.appendChild(nodo('animateTransform',{attributeName:'transform',type:'translate',values:'0 0; '+(r*.5).toFixed(1)+' '+(-sube*.5).toFixed(1)+'; '+(-r*.3).toFixed(1)+' '+(-sube).toFixed(1),dur:dur+'s',begin:(-del)+'s',repeatCount:'indefinite',calcMode:'spline',keySplines:'.4 0 .6 1; .4 0 .6 1'}));
        gb.appendChild(nodo('animate',{attributeName:'opacity',values:'0;.95;.95;0',keyTimes:'0;.15;.75;1',dur:dur+'s',begin:(-del)+'s',repeatCount:'indefinite'}));
      }
      g.appendChild(gb);
    });
    frente.insertBefore(g,cara);
    return { quitar:function(){ g.remove(); f.remove(); m.remove(); } };
  }

  return { slime:{ burbujas:slimeBurbujas } };
})();
