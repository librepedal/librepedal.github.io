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

  // ---------- Slime · Gotitas ----------
  // Rehecha (Inty 2026-10-07: "las gotas del slime están genéricas"). Antes: gota de agua plana (se corta, salpica, se seca).
  // Ahora, como gelatina viva:
  //  - MATERIAL: la gota se pinta con la misma imagen de la gelatina (patrón con la textura de su lóbulo de abajo: color,
  //    burbujitas y brillos de Gemini), con brillo blanco nítido arriba y la luz que la atraviesa abajo, como el cuerpo.
  //  - COMPORTAMIENTO: una gelatina es espesa: asoma en el costado, cuelga en un HILO grueso que se estira lento, el hilo se
  //    corta y vuelve al cuerpo, el trocito cae como un domo que tiembla, y el Slime lo reabsorbe: se arrastra de vuelta y se funde.
  // Recorrido medido sobre la imagen del cuerpo (contorno a alfa > 128): costado más ancho en y≈630 (x 375 / 1000), debajo se
  // recoge (y 660: x 391 / 981); suelo bajo el borde y≈690. Va en el grupo "frente": se mueve con la gelatina.
  var GOTA_RUTA={
    izq:{p:[[389,588],[384,600],[379,612],[375,624],[373,632]], cuelga:[395,641], sale:-1, src:[660,560], vuelve:[440,690]},
    der:{p:[[985,588],[991,600],[996,612],[1000,624],[1002,632]], cuelga:[977,641], sale:1, src:[660,560], vuelve:[935,690]}
  };
  var SUELO_GOTA=690;
  function slimeGotitas(el){
    var svg=el.querySelector('svg'); if(!svg) return null;
    var frente=[].filter.call(svg.querySelectorAll('g[clip-path]'),function(g){ return g.querySelector('image'); })[0]; if(!frente) return null;
    var href=frente.querySelector('image').getAttribute('href'), defs=defsDe(svg), u='pzg'+(++uid);
    var luz=nodo('radialGradient',{id:u+'l',cx:'.5',cy:'.5',r:'.5'}); luz.appendChild(nodo('stop',{offset:'0','stop-color':'#ffb05a','stop-opacity':'.55'})); luz.appendChild(nodo('stop',{offset:'1','stop-color':'#ff8a30','stop-opacity':'0'}));
    defs.appendChild(luz);
    var borde=nodo('radialGradient',{id:u+'r',cx:'.42',cy:'.38',r:'.65'}); borde.appendChild(nodo('stop',{offset:'.55','stop-color':'#873a0b','stop-opacity':'0'})); borde.appendChild(nodo('stop',{offset:'1','stop-color':'#873a0b','stop-opacity':'.6'})); defs.appendChild(borde);
    var tras=nodo('radialGradient',{id:u+'t',cx:'.5',cy:'.5',r:'.5'}); tras.appendChild(nodo('stop',{offset:'0','stop-color':'#f3a040','stop-opacity':'.75'})); tras.appendChild(nodo('stop',{offset:'1','stop-color':'#eb8a22','stop-opacity':'0'})); defs.appendChild(tras);
    var suave=nodo('filter',{id:u+'s',x:'-50%',y:'-50%',width:'200%',height:'200%'}); suave.appendChild(nodo('feGaussianBlur',{stdDeviation:'2.2'})); defs.appendChild(suave);
    // DETRÁS del cuerpo (primera capa del frente): el borde de la gelatina tapa la unión, como en un goteo real que nace bajo el borde
    var g=nodo('g',{'class':'pieza-gotitas pieza-tinte'}); frente.insertBefore(g,frente.firstChild);
    var gotas=[], vivo=true, prox=.5, ult=performance.now(), lado=Math.random()<.5?'izq':'der', n=0, quieta=false;
    function sobre(t,ruta,r){ var p=ruta.p, f=Math.min(p.length-1.001,Math.max(0,t*(p.length-1))), i=Math.floor(f), k=f-i;
      return [p[i][0]+(p[i+1][0]-p[i][0])*k+ruta.sale*(r||10)*.2, p[i][1]+(p[i+1][1]-p[i][1])*k]; } // sobresale de la superficie: se ve como una gota sobre el costado
    function nueva(){
      var ruta=GOTA_RUTA[lado]; lado=lado==='izq'?'der':'izq'; var id=u+'p'+(++n);
      // patrón con la textura de la gelatina: se corre cada cuadro para que bajo la gota quede el lóbulo de abajo del cuerpo
      var pat=nodo('pattern',{id:id,patternUnits:'userSpaceOnUse',x:'0',y:'0',width:'1376',height:'768'});
      pat.appendChild(nodo('image',{href:href,x:'0',y:'0',width:'1376',height:'768'})); defs.appendChild(pat);
      var d={ruta:ruta, t:0, R:22+Math.random()*6, pat:pat,
        brilloSuelo:nodo('ellipse',{fill:'url(#'+u+'l)',opacity:'0'}),
        hilo:nodo('path',{fill:'url(#'+id+')'}),
        gota:nodo('path',{fill:'url(#'+id+')'}), sombra:nodo('path',{fill:'url(#'+u+'r)'}),
        trasluz:nodo('ellipse',{fill:'url(#'+u+'t)'}),
        brillo:nodo('ellipse',{fill:'#fff',opacity:'.8',filter:'url(#'+u+'s)'}),
        chispa:nodo('circle',{fill:'#fff',opacity:'.9'})};
      ['brilloSuelo','hilo','gota','trasluz','sombra','brillo','chispa'].forEach(function(k){ g.appendChild(d[k]); }); gotas.push(d); }
    function ovalo(x,y,rx,ry){ return 'M'+(x-rx)+' '+y+' A'+rx+' '+ry+' 0 1 0 '+(x+rx)+' '+y+' A'+rx+' '+ry+' 0 1 0 '+(x-rx)+' '+y+' Z'; }
    function domo(x,yS,rx,ry){ return 'M'+(x-rx)+' '+yS+' C'+(x-rx)+' '+(yS-ry*1.1)+' '+(x+rx)+' '+(yS-ry*1.1)+' '+(x+rx)+' '+yS+' Z'; }
    function arco(x,y,r,a0,a1){ var p=Math.PI/180; return 'M'+(x+Math.cos(a0*p)*r).toFixed(1)+' '+(y+Math.sin(a0*p)*r).toFixed(1)+' A'+r+' '+r+' 0 0 1 '+(x+Math.cos(a1*p)*r).toFixed(1)+' '+(y+Math.sin(a1*p)*r).toFixed(1); }
    function pintar(d,x,y,rx,ry,esDomo){ d.x=x; // gota (o domo) con su material, brillo nítido arriba y trasluz abajo
      var forma=esDomo?domo(x,y,rx,ry):ovalo(x,y,rx,ry); d.gota.setAttribute('d',forma); d.sombra.setAttribute('d',forma);
      var cy=esDomo?y-ry*.5:y, r=Math.min(rx,ry);
      d.pat.setAttribute('patternTransform','translate('+(x-d.ruta.src[0]).toFixed(1)+' '+(cy-d.ruta.src[1]).toFixed(1)+')');
      var by=esDomo?y-ry*.62:cy-ry*.42; d.brillo.setAttribute('cx',(x-rx*.34).toFixed(1)); d.brillo.setAttribute('cy',by.toFixed(1)); d.brillo.setAttribute('rx',(rx*.3).toFixed(1)); d.brillo.setAttribute('ry',(ry*.17).toFixed(1)); d.brillo.setAttribute('transform','rotate(-28 '+(x-rx*.34).toFixed(1)+' '+by.toFixed(1)+')');
      d.trasluz.setAttribute('cx',x.toFixed(1)); d.trasluz.setAttribute('cy',(esDomo?y-ry*.25:cy+ry*.38).toFixed(1)); d.trasluz.setAttribute('rx',(rx*.62).toFixed(1)); d.trasluz.setAttribute('ry',(ry*.36).toFixed(1));
      d.chispa.setAttribute('cx',(x+rx*.12).toFixed(1)); d.chispa.setAttribute('cy',(by-ry*.08).toFixed(1)); d.chispa.setAttribute('r',(r*.06).toFixed(1)); }
    function cuadro(now){
      if(!vivo) return;
      var dt=Math.min(.05,(now-ult)/1000); ult=now;
      if(!reduce && !quieta){ prox-=dt; if(prox<0 && gotas.length<2){ nueva(); prox=3+Math.random()*2.5; } }
      gotas=gotas.filter(function(d){
        if(!reduce && !quieta) d.t+=dt; var t=d.t, R=d.R, c=d.ruta.cuelga, v=d.ruta.vuelve;
        d.hilo.setAttribute('d','');
        if(t<1.2){ // asoma y baja pegada al costado
          var r=R*(.35+.45*t/1.2), q=sobre(Math.pow(t/1.2,1.4),d.ruta,r); pintar(d,q[0],q[1],r,r*1.1,false);
        } else if(t<2.8){ // cuelga en un hilo espeso que se estira lento
          var k=(t-1.2)/1.6, rb=R*(.62+.1*k), yb=c[1]+R*.75+(SUELO_GOTA-rb-(c[1]+R*.75))*k*k, w=R*(.55-.4*k), wb=R*(.4-.3*k); // el bulbo baja hasta tocar el suelo: el hilo queda a la vista
          // hilo: tapa redonda metida en el borde (sin puntas), se afina hacia la gota y la une con una curva
          var ax=c[0]-d.ruta.sale*3, w2=Math.max(w,R*.2);
          d.hilo.setAttribute('d','M'+(ax-w2)+' '+c[1]+' A'+w2+' '+(w2*.8)+' 0 0 1 '+(ax+w2)+' '+c[1]+' C'+(ax+w2)+' '+(c[1]+(yb-c[1])*.45)+' '+(c[0]+wb)+' '+(yb-rb*1.1)+' '+(c[0]+wb)+' '+(yb-rb*.55)+' L'+(c[0]-wb)+' '+(yb-rb*.55)+' C'+(c[0]-wb)+' '+(yb-rb*1.1)+' '+(ax-w2)+' '+(c[1]+(yb-c[1])*.45)+' '+(ax-w2)+' '+c[1]+' Z');
          pintar(d,c[0],yb,rb,rb*(1+.12*k),false);
        } else if(t<3.05){ // el hilo se corta: lo de arriba vuelve al cuerpo, el trocito se apoya y se aplasta
          var k2=(t-2.8)/.25, rb2=R*.92;
          d.hilo.setAttribute('d','M'+(c[0]-R*.18*(1-k2))+' '+(c[1]-4)+' L'+(c[0]+R*.18*(1-k2))+' '+(c[1]-4)+' L'+c[0]+' '+(c[1]+R*1.6*(1-k2))+' Z');
          pintar(d,c[0],SUELO_GOTA,rb2*(1+.25*k2),rb2*(1.9-.7*k2),true);
        } else if(t<4.1){ // tiembla como gelatina (oscilación amortiguada)
          var k3=t-3.05, s=.22*Math.exp(-3.6*k3)*Math.sin(17*k3);
          pintar(d,c[0],SUELO_GOTA,R*1.15*(1-s*.6),R*1.2*(1+s),true);
        } else if(t<5.3){ // el Slime la reabsorbe: se arrastra hacia el cuerpo y se funde
          var k4=(t-4.1)/1.2, e=k4*k4*(3-2*k4), x=c[0]+(v[0]-c[0])*e, ond=Math.sin(k4*Math.PI*3)*.06;
          pintar(d,x,SUELO_GOTA,R*1.15*(1-.45*e)*(1+ond),R*1.2*(1-.55*e)*(1-ond),true);
          d.gota.setAttribute('opacity',(1-Math.max(0,(k4-.55)/.45)).toFixed(2));
          d.sombra.setAttribute('opacity',d.gota.getAttribute('opacity')); ['trasluz','brillo','chispa'].forEach(function(k5){ d[k5].setAttribute('opacity',((k5==='brillo'?.8:1)*(1-k4)).toFixed(2)); });
        } else { ['brilloSuelo','hilo','gota','trasluz','sombra','brillo','chispa'].forEach(function(k6){ d[k6].remove(); }); d.pat.remove(); return false; }
        // la luz que atraviesa la gelatina pinta el suelo de naranjo (no una mancha oscura)
        var enSuelo=t>2.6?Math.min(1,(t-2.6)/.4)*(t>4.1?Math.max(0,1-(t-4.1)/1.2):1):0, gx=t>4.1?d.x:c[0];
        d.brilloSuelo.setAttribute('cx',gx.toFixed(1)); d.brilloSuelo.setAttribute('cy',SUELO_GOTA+2); d.brilloSuelo.setAttribute('rx',(R*2).toFixed(1)); d.brilloSuelo.setAttribute('ry',(R*.45).toFixed(1));
        d.brilloSuelo.setAttribute('opacity',enSuelo.toFixed(2));
        return true; });
      if(el.isConnected && !document.hidden) requestAnimationFrame(cuadro); else setTimeout(function(){ ult=performance.now(); requestAnimationFrame(cuadro); },250);
    }
    if(reduce){ nueva(); gotas[0].t=2.2; } // movimiento reducido: una gota quieta colgando de su hilo
    requestAnimationFrame(cuadro);
    return { quitar:function(){ vivo=false; g.remove(); luz.remove(); borde.remove(); tras.remove(); suave.remove(); gotas.forEach(function(d){ d.pat.remove(); }); },
             // para revisar en grande: congela una gota en el segundo t de su vida (lado 'izq' o 'der')
             _revisar:function(t,l){ quieta=true; gotas.forEach(function(d){ d.t=99; }); lado=l||'der'; nueva(); gotas[gotas.length-1].t=t; } };
  }

  // ---------- Slime · Fruta adentro (arte de Gemini) ----------
  // Referencia real: la gelatina con fruta (durazno en conserva en cubos y guindas), con la fruta suspendida porque se agrega
  // cuando la gelatina empieza a cuajar; se ve suave a través de ella. Gemini la dibujó EDITANDO la capa del cuerpo del Slime
  // (misma cámara 1376x768): fuera de la fruta la gelatina coincide con la original. v2 = v1 sin el cubo que quedaba detrás
  // de la boca (x 570–726, y 396–504: se devolvió la gelatina original con borde suave). La fruta tiene casi el color de la
  // gelatina, así que no se puede separar por diferencia: la pieza reemplaza la imagen del cuerpo en todas sus copias
  // (cuerpo y frente) con el mismo recorte del fondo azul marino que lib-slime, y al quitarla vuelve la original.
  function slimeFruta(el){
    var svg=el.querySelector('svg'), src=(window.PIEZAS_IMG||{}).slimeFruta; if(!svg||!src||typeof _recortarFondo!=='function') return null;
    var cuerpo=svg.querySelector('g[id$="cuerpo"] > image'); if(!cuerpo) return null;
    var original=cuerpo.getAttribute('href'), copias=[].filter.call(svg.querySelectorAll('image'),function(i){ return i.getAttribute('href')===original; }), vivo=true;
    _recortarFondo(src,_sinMarino).then(function(png){ if(vivo) copias.forEach(function(i){ i.setAttribute('href',png); }); });
    return { quitar:function(){ vivo=false; copias.forEach(function(i){ i.setAttribute('href',original); }); } };
  }

  // ---------- Orbe: datos medidos en lib-orbe.js (marco 1024; orbe CX 522, CY 647, R 293) ----------
  var OCX=522, OCY=647, OR=293;
  function orbeGrupos(el){ var svg=el.querySelector('svg'); if(!svg) return null;
    var cuerpo=[].filter.call(svg.children,function(g){ return g.tagName==='g' && g.querySelector('circle') && g.querySelector('image'); })[0];
    return cuerpo?{svg:svg,cuerpo:cuerpo}:null; }
  function bucle(el,f){ var vivo=true, ult=performance.now();
    function c(now){ if(!vivo) return; var dt=Math.min(.05,(now-ult)/1000); ult=now; f(dt,now);
      if(el.isConnected && !document.hidden) requestAnimationFrame(c); else setTimeout(function(){ ult=performance.now(); requestAnimationFrame(c); },250); }
    requestAnimationFrame(c); return function(){ vivo=false; }; }
  function brillo(defs,u){ var f=nodo('filter',{id:u,x:'-50%',y:'-50%',width:'200%',height:'200%'});
    f.appendChild(nodo('feGaussianBlur',{stdDeviation:'6',result:'b'})); var m=nodo('feMerge',{}); m.appendChild(nodo('feMergeNode',{'in':'b'})); m.appendChild(nodo('feMergeNode',{'in':'SourceGraphic'})); f.appendChild(m); defs.appendChild(f); return f; }

  // ---------- Orbe · Chispas ----------
  // Como una bengala (estrellita): trazos cortos muy brillantes, centro blanco que pasa a naranjo, a veces se bifurcan,
  // viven una fracción de segundo y caen un poco. Salen del borde visible del orbe (no de arriba: ahí está el casco).
  // Chisporrotea de a poco en reposo y revienta cuando celebra o se sorprende.
  function orbeChispas(el){
    var G=orbeGrupos(el); if(!G) return null; var u='pzc'+(++uid), f=brillo(defsDe(G.svg),u+'f');
    var g=nodo('g',{'class':'pieza-chispas',filter:'url(#'+u+'f)'}); G.svg.appendChild(g);
    var ch=[], prox=.4;
    function sale(n){ for(var i=0;i<n;i++){
      var a=(-35+Math.random()*250)*Math.PI/180, sx=OCX+Math.cos(a)*OR*.98, sy=OCY+Math.sin(a)*OR*.98, v=420+Math.random()*520;
      var abre=(Math.random()-.5)*.7, dx=Math.cos(a+abre), dy=Math.sin(a+abre);
      var l=nodo('line',{stroke:'#fffaf0','stroke-width':(9+Math.random()*5).toFixed(1),'stroke-linecap':'round'}); g.appendChild(l);
      var rama=Math.random()<.35?nodo('line',{stroke:'#ffd28a','stroke-width':'6','stroke-linecap':'round'}):null; if(rama) g.appendChild(rama);
      ch.push({x:sx,y:sy,vx:dx*v,vy:dy*v,t:0,vida:.18+Math.random()*.22,l:l,rama:rama,giro:(Math.random()<.5?-1:1)*(.5+Math.random()*.5)}); } }
    var parar=bucle(el,function(dt){
      if(!reduce){ prox-=dt; if(prox<0){ sale(1+Math.floor(Math.random()*2)); prox=.9+Math.random()*1.6; } }
      g.setAttribute('transform',G.cuerpo.getAttribute('transform')||''); // salen del orbe donde esté (salta, respira)
      ch=ch.filter(function(c){ if(!reduce) c.t+=dt; var k=c.t/c.vida; if(k>=1){ c.l.remove(); if(c.rama) c.rama.remove(); return false; }
        if(!reduce){ c.vy+=520*dt; c.x+=c.vx*dt; c.y+=c.vy*dt; }
        var sp=Math.sqrt(c.vx*c.vx+c.vy*c.vy)||1, L=34+30*(1-k), col=k<.35?'#fffaf0':(k<.7?'#ffd28a':'#ff8a3c');
        c.l.setAttribute('x1',c.x.toFixed(1)); c.l.setAttribute('y1',c.y.toFixed(1)); c.l.setAttribute('x2',(c.x-c.vx/sp*L).toFixed(1)); c.l.setAttribute('y2',(c.y-c.vy/sp*L).toFixed(1));
        c.l.setAttribute('stroke',col); c.l.setAttribute('opacity',(1-k*k).toFixed(2));
        if(c.rama){ var ra=Math.atan2(c.vy,c.vx)+c.giro, rl=L*.55; c.rama.setAttribute('x1',c.x.toFixed(1)); c.rama.setAttribute('y1',c.y.toFixed(1));
          c.rama.setAttribute('x2',(c.x+Math.cos(ra)*rl).toFixed(1)); c.rama.setAttribute('y2',(c.y+Math.sin(ra)*rl).toFixed(1)); c.rama.setAttribute('opacity',(k>.3?(1-k):0).toFixed(2)); }
        return true; });
    });
    if(reduce){ sale(6); ch.forEach(function(c){ c.t=c.vida*.3; c.x+=c.vx*.06; c.y+=c.vy*.06; }); } // movimiento reducido: chispas quietas
    return { estado:function(n){ if(!reduce && (n==='feliz'||n==='sorpresa')) sale(n==='feliz'?16:10); },
             quitar:function(){ parar(); g.remove(); f.remove(); } };
  }

  // ---------- Orbe · Destello al hablar ----------
  // Reemplaza a la "Estela de luz" (Inty 2026-10-07: casi no se veía; eligió "destello al hablar").
  // Referencia real: el filtro de estrella de fotografía (Hoya Star 6, Tiffen Star). Líneas grabadas en el vidrio difractan cada
  // luz fuerte en rayos finos perpendiculares a las líneas; 3 direcciones = 6 puntas, y el LARGO del rayo crece con el BRILLO de
  // la luz. En el Orbe la luz que habla es su boca: en cada sílaba se enciende (lib-orbe: halo .6 + .3·s al hablar) y le salen
  // 6 rayos que se alargan y se recogen con la voz. Callado no hay destello, igual que una luz apagada no hace estrella.
  // Va encima de todo (el filtro está en la "cámara") y sigue al orbe y a la cara: boca medida en lib-orbe (CX 522, MY 722).
  var BOCA_X=522, BOCA_Y=730;
  function orbeDestello(el){
    var G=orbeGrupos(el); if(!G) return null; var u='pzd'+(++uid), defs=defsDe(G.svg), f=brillo(defs,u+'f');
    var halo=G.cuerpo.querySelector('circle'), cara=G.svg.querySelector('[id$="cara"]');
    var L=470, W=22; // rayo a plena voz (marco 1024): pasa el borde del orbe (R 293); base de 44 = ~5 px en la tarjeta de 124 px (con 26 no se distinguía)
    var gr=nodo('radialGradient',{id:u+'g',gradientUnits:'userSpaceOnUse',cx:'0',cy:'0',r:L});
    gr.appendChild(nodo('stop',{offset:'0','stop-color':'#ffffff','stop-opacity':'1'})); gr.appendChild(nodo('stop',{offset:'.22','stop-color':'#fff1d6','stop-opacity':'.95'}));
    gr.appendChild(nodo('stop',{offset:'.6','stop-color':'#ffb36b','stop-opacity':'.55'})); gr.appendChild(nodo('stop',{offset:'1','stop-color':'#ff8a3c','stop-opacity':'0'}));
    defs.appendChild(gr);
    var sigue=nodo('g',{'class':'pieza-destello','pointer-events':'none',style:'mix-blend-mode:screen'}), enCara=nodo('g',{}), estrella=nodo('g',{filter:'url(#'+u+'f)',opacity:'0'});
    sigue.appendChild(enCara); enCara.appendChild(estrella); G.svg.appendChild(sigue);
    // 6 puntas (Star 6): una vertical y las otras cada 60°; cada rayo es una aguja que se afina hasta la punta
    [90,150,210,270,330,30].forEach(function(a){ var r=a*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
      estrella.appendChild(nodo('path',{fill:'url(#'+u+'g)',d:'M'+(-s*W).toFixed(1)+' '+(c*W).toFixed(1)+' L'+(c*L).toFixed(1)+' '+(-s*L).toFixed(1)+' L'+(s*W).toFixed(1)+' '+(-c*W).toFixed(1)+' Z'})); });
    estrella.appendChild(nodo('circle',{r:'34',fill:'url(#'+u+'g)'})); // el núcleo: la luz de la boca encandilada
    var est='reposo', k=0;
    var parar=bucle(el,function(dt){
      var s=0; if(est==='hablar' && halo) s=Math.max(0,Math.min(1,((+halo.getAttribute('opacity')||0)-.6)/.3)); // brillo de la sílaba
      if(reduce) s=est==='hablar'?.55:0;
      k+=(s-k)*Math.min(1,dt*(s>k?28:11)); // se enciende al instante y se recoge un poco más lento, como una luz real
      sigue.setAttribute('transform',G.cuerpo.getAttribute('transform')||'');
      enCara.setAttribute('transform',cara?(cara.getAttribute('transform')||''):'');
      var e=.25+.75*k; // el largo sigue al brillo
      estrella.setAttribute('transform','translate('+BOCA_X+' '+BOCA_Y+') scale('+e.toFixed(3)+')');
      estrella.setAttribute('opacity',(k<.04?0:Math.min(1,k*1.4)).toFixed(2));
    });
    return { estado:function(n){ est=n; }, quitar:function(){ parar(); sigue.remove(); f.remove(); gr.remove(); } };
  }

  // ---------- Orbe · Visera (arte de Gemini) ----------
  // Referencia real: visera de casco MTB (ABUS MoDrop): pieza curva y baja sobre el borde delantero, fijada a los costados
  // con tornillos de pivote. Gemini la dibujó EDITANDO la capa del casco del Orbe (misma cámara, 1024x1024, fondo verde):
  // medido contra el original, solo cambia la franja de la visera (y 416–600); el resto coincide. Por eso la pieza
  // reemplaza la imagen de la capa del casco (mismo recorte de verde que lib-orbe) y al quitarla vuelve la original.
  function orbeVisera(el){
    var svg=el.querySelector('svg'), src=(window.PIEZAS_IMG||{}).orbeVisera; if(!svg||!src||typeof _recortarVerde!=='function') return null;
    var capa=svg.querySelector('g[id$="casco"] > image'); if(!capa) return null;
    var original=capa.getAttribute('href'), vivo=true;
    _recortarVerde(src).then(function(png){ if(vivo) capa.setAttribute('href',png); });
    return { quitar:function(){ vivo=false; capa.setAttribute('href',original); } };
  }

  // ---------- Androide · Antena con resorte (arte de Gemini + rebote) ----------
  // Referencia real: la bandera de seguridad de bici con base de resorte: el resorte deja que la vara se doble y la devuelve
  // a su lugar oscilando. Gemini la dibujó editando la capa del casco (misma cámara 1376x768); se separó como capa propia
  // (gemini/vinilo-antena.png, en x 859 y 13) para poder moverla. Gira sobre la base del resorte (873,137) como un resorte
  // poco amortiguado (~2,6 Hz) empujado por la aceleración de la cabeza: el giro del servo y los saltos (lib-vinilo mueve
  // el grupo "todo" con translate(ang*1.4, hy) rotate(ang)). Va dentro del grupo del casco: se mueve con él.
  var ANT={x:859,y:13,w:296,h:152,px:873,py:137};
  function viniloAntena(el){
    var svg=el.querySelector('svg'), src=(window.PIEZAS_IMG||{}).viniloAntena; if(!svg||!src) return null;
    var casco=svg.querySelector('g[id$="casco"]'), todo=svg.querySelector('g[id$="todo"]'); if(!casco||!todo) return null;
    var g=nodo('g',{'class':'pieza-antena'}); g.appendChild(nodo('image',{'class':'pieza-img',href:src,x:ANT.x,y:ANT.y,width:ANT.w,height:ANT.h})); casco.appendChild(g);
    var th=0, tv=0, prev=null, vPrev=null, K=270, C=3.2;
    var parar=bucle(el,function(dt){ if(dt<=0) return;
      var tr=todo.getAttribute('transform')||'', m=/translate\((-?[\d.]+) (-?[\d.]+)\) rotate\((-?[\d.]+)/.exec(tr);
      var s=m?{x:+m[1],y:+m[2],a:+m[3]}:{x:0,y:0,a:0}, v=prev?{x:(s.x-prev.x)/dt,y:(s.y-prev.y)/dt,a:(s.a-prev.a)/dt}:{x:0,y:0,a:0};
      var acc=vPrev?{x:(v.x-vPrev.x)/dt,y:(v.y-vPrev.y)/dt,a:(v.a-vPrev.a)/dt}:{x:0,y:0,a:0}; prev=s; vPrev=v;
      // inercia: la vara se queda atrás cuando la base acelera (giro del servo y saltos; va inclinada ~40°, así que el salto también la dobla)
      var empuje=reduce?0:-(acc.a*2+acc.x*.06-acc.y*.07);
      tv+=(-K*th-C*tv+Math.max(-4000,Math.min(4000,empuje)))*dt; th+=tv*dt; th=Math.max(-22,Math.min(22,th));
      // tal como la dibujó Gemini medía 307 de largo y el banderín se salía del recuadro del modelo (viewBox hasta x 986) y tapaba
      // el texto de la tarjeta: se achica a la mitad y se levanta 30° sobre su base (punta en x ~992 aun con el rebote máximo)
      g.setAttribute('transform','rotate('+(th-30).toFixed(2)+' '+ANT.px+' '+ANT.py+') translate('+ANT.px+' '+ANT.py+') scale(.5) translate(-'+ANT.px+' -'+ANT.py+')'); });
    return { estado:function(n){ if(!reduce && (n==='feliz'||n==='sorpresa')) tv+=n==='sorpresa'?-230:190; },
             quitar:function(){ parar(); g.remove(); },
             _th:function(){ return th; } };
  }

  // ---------- Androide · Calcomanías reflectantes (arte de Gemini + destello) ----------
  // Referencia real: los adhesivos reflectantes MSA Scotchlite "tetraedro" para casco (triángulos en hilera, material 3M):
  // de día gris plateado mate; de noche devuelven la luz hacia quien la apunta. Gemini los dibujó editando la capa del casco;
  // se separaron por diferencia (gemini/vinilo-calcos.png, x 410 y 225). Gemini puso 3 por lado, pero el de más afuera queda
  // sobre el borde sombreado y sale roto al separarlo: quedan los 2 limpios de cada lado. Destello: la misma capa pasada
  // a blanco, que se prende un instante cada 5,5 s (mismo ritmo que las calcomanías del Casco vivo). No se tiñe con el estilo.
  var CAL={x:410,y:225,w:560,h:110};
  function viniloCalcos(el){
    var svg=el.querySelector('svg'), src=(window.PIEZAS_IMG||{}).viniloCalcos; if(!svg||!src) return null;
    var casco=svg.querySelector('g[id$="casco"]'); if(!casco) return null;
    var u='pzr'+(++uid), f=nodo('filter',{id:u,x:'-20%',y:'-20%',width:'140%',height:'140%'});
    f.appendChild(nodo('feColorMatrix',{type:'matrix',values:'0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0',result:'b'}));
    f.appendChild(nodo('feGaussianBlur',{'in':'b',stdDeviation:'2.5',result:'h'})); var m=nodo('feMerge',{}); m.appendChild(nodo('feMergeNode',{'in':'h'})); m.appendChild(nodo('feMergeNode',{'in':'b'})); f.appendChild(m);
    defsDe(svg).appendChild(f);
    var g=nodo('g',{'class':'pieza-calcos'}), at={'class':'pieza-img',href:src,x:CAL.x,y:CAL.y,width:CAL.w,height:CAL.h};
    g.appendChild(nodo('image',at));
    var brillo=nodo('g',{filter:'url(#'+u+')',opacity:'0'}); brillo.appendChild(nodo('image',at));
    if(!reduce) brillo.appendChild(nodo('animate',{attributeName:'opacity',values:'0;0;1;.2;0',keyTimes:'0;.86;.9;.95;1',dur:'5.5s',begin:'-'+((Date.now()/1000)%5.5).toFixed(2)+'s',repeatCount:'indefinite'}));
    g.appendChild(brillo); casco.appendChild(g);
    return { quitar:function(){ g.remove(); f.remove(); } };
  }

  // ---------- Cyberpunk · Cables de luz (arte de Gemini + parpadeo) ----------
  // Referencia real: el cable EL (electroluminiscente) del cosplay cyberpunk: tubo delgado que brilla parejo en todo su largo
  // y se usa para trazar las líneas de los paneles; lo alimenta un inversor y, si el contacto falla, parpadea. Gemini lo trazó
  // editando la capa del casco (borde bajo de la cáscara y líneas del centro, con broches); se separó por diferencia
  // (gemini/ciber-cables.png, x 440 y 20). Va en el grupo del casco y SÍ toma el color de neón del estilo (no lleva
  // pieza-img). Parpadeo: se apaga en el mismo cuadro de la interferencia del modelo (lib-ciber corre el casco translate(-3 0)).
  var CAB={x:440,y:20,w:500,h:300};
  function ciberCables(el){
    var svg=el.querySelector('svg'), src=(window.PIEZAS_IMG||{}).ciberCables; if(!svg||!src) return null;
    var casco=svg.querySelector('g[id$="casco"]'); if(!casco) return null;
    var im=nodo('image',{'class':'pieza-cables',href:src,x:CAB.x,y:CAB.y,width:CAB.w,height:CAB.h}); casco.appendChild(im);
    var parar=bucle(el,function(){ var gl=/translate\(-3 0\)/.test(casco.getAttribute('transform')||''); im.setAttribute('opacity',gl&&!reduce?'.15':'1'); });
    return { quitar:function(){ parar(); im.remove(); } };
  }

  // ---------- Cyberpunk · Grafitis del casco (arte de Gemini) ----------
  // Referencia real: el tag de Nueva York hecho con marcador de apretar Krink K-60, que define el estilo "drippy": al apretar
  // más el marcador, la pintura chorrea en hilos (spectrumstore.com/en/krink); y un tag de spray con su borde difuso
  // (overspray). Dicen "Libre" y "Pedal" (Inty: "si el casco va a estar con grafiti que sea Libre Pedal"). Gemini los pintó
  // editando la capa del casco (gemini/ciber-grafitis-v2.jpg): tag blanco que chorrea a la izquierda y tag rosado fluor a la
  // derecha, sin tapar las ventilaciones. Se separó por color y diferencia, recortado a la silueta del casco
  // (gemini/ciber-grafitis.png, x 480 y 189). Es pintura: NO toma el color de neón del estilo (pieza-img) y va en el grupo del
  // casco, así que salta con él en la interferencia.
  var GRA={x:480,y:189,w:424,h:113};
  function ciberGrafitis(el){
    var svg=el.querySelector('svg'), src=(window.PIEZAS_IMG||{}).ciberGrafitis; if(!svg||!src) return null;
    var casco=svg.querySelector('g[id$="casco"]'); if(!casco) return null;
    var im=nodo('image',{'class':'pieza-img pieza-grafitis',href:src,x:GRA.x,y:GRA.y,width:GRA.w,height:GRA.h});
    var cab=casco.querySelector('.pieza-cables'); if(cab) casco.insertBefore(im,cab); else casco.appendChild(im);  // los cables quedan encima de la pintura
    return { quitar:function(){ im.remove(); } };
  }

  // ---------- Cyberpunk · Visor partido (arte de Gemini + luz corrida) ----------
  // Referencia real: el vidrio de un teléfono que se cayó: se parte desde un punto de impacto con grietas finas en estrella y
  // una grieta larga, pero la pantalla de abajo sigue prendida (en la prueba de caída del LG G4 la pantalla trizada siguió
  // funcionando, gsmarena.com/newscomm-12258p2.php). Gemini trazó la grieta editando la capa de la cabeza (misma cámara,
  // gemini/ciber-visor-v1.jpg); se separó solo lo que cae sobre el vidrio negro (gemini/ciber-visor.png, x 550 y 192).
  // La grieta va ENCIMA de la luz del visor, y la luz sigue prendida a los dos lados: del lado derecho de la grieta se ve
  // corrida unos píxeles, como la luz que cruza el borde de un vidrio partido. La grieta no toma el neón (pieza-img).
  var VIS={x:550,y:192,w:254,h:321};
  function ciberVisor(el){
    var svg=el.querySelector('svg'), src=(window.PIEZAS_IMG||{}).ciberVisor; if(!svg||!src) return null;
    var pant=svg.querySelector('g[id$="pant"]'); if(!pant||!pant.parentNode) return null;
    var marco=pant.parentNode, frente=marco.parentNode, u='pzv'+(++uid), defs=defsDe(svg);
    // la grieta larga va del impacto (618,297) a (770,507): se prolonga para partir la pantalla en dos lados
    var cI=nodo('clipPath',{id:u+'i'}), cD=nodo('clipPath',{id:u+'d'});
    cI.appendChild(nodo('path',{d:'M584 250 L837 600 L400 600 L400 250 Z'})); cD.appendChild(nodo('path',{d:'M584 250 L1000 250 L1000 600 L837 600 Z'}));
    defs.appendChild(cI); defs.appendChild(cD);
    if(!pant.id) pant.id=u+'p';
    var izq=nodo('g',{'clip-path':'url(#'+u+'i)'}); marco.insertBefore(izq,pant); izq.appendChild(pant);
    var der=nodo('g',{'clip-path':'url(#'+u+'d)'}); der.appendChild(nodo('use',{href:'#'+pant.id,transform:'translate(4 -3)'})); marco.appendChild(der);
    var im=nodo('image',{'class':'pieza-img pieza-visor',href:src,x:VIS.x,y:VIS.y,width:VIS.w,height:VIS.h}); frente.appendChild(im);
    return { quitar:function(){ marco.insertBefore(pant,izq); izq.remove(); der.remove(); im.remove(); cI.remove(); cD.remove(); } };
  }

  // ---------- Androide · Ojo de otro color ----------
  // Sus ojos son diafragmas de cámara (lib-vinilo.js: iris naranjo encendido, hojas, brillo). Referencia real: el
  // TRATAMIENTO de los lentes de cámara: un lente multicapa refleja pequeños destellos violeta y verde, y cada tratamiento
  // tiene su tinte. El ojo derecho pasa a un lente verdeazulado con esos reflejos; en los ojos de LED (feliz, dormir)
  // conserva su color, así nunca vuelve a verse naranjo. Ojo derecho medido en lib-vinilo: EX 795, EY 391, RI 43.
  function viniloOjo(el){
    var svg=el.querySelector('svg'); if(!svg) return null;
    var ojo=[].filter.call(svg.querySelectorAll('g[clip-path]'),function(g){ return /o1\)$/.test(g.getAttribute('clip-path')||''); })[0]; if(!ojo) return null;
    var filtro='hue-rotate(148deg) saturate(.92)'; // naranjo -> verdeazulado (tinte de tratamiento de lente)
    ojo.style.filter=filtro;
    var u='pzo'+(++uid), fb=nodo('filter',{id:u,x:'-50%',y:'-50%',width:'200%',height:'200%'}); fb.appendChild(nodo('feGaussianBlur',{stdDeviation:'1.4'})); defsDe(svg).appendChild(fb);
    var g=nodo('g',{'clip-path':ojo.getAttribute('clip-path'),'class':'pieza-ojo','pointer-events':'none'}); ojo.parentNode.insertBefore(g,ojo.nextSibling);
    var gb=nodo('g',{filter:'url(#'+u+')'}); g.appendChild(gb); // destellos difusos, como los reflejos reales de un lente
    var violeta=nodo('path',{fill:'none',stroke:'#c77dff','stroke-width':'5','stroke-linecap':'round',opacity:'.6'}), verde=nodo('path',{fill:'none',stroke:'#9dff7a','stroke-width':'3.5','stroke-linecap':'round',opacity:'.45'});
    gb.appendChild(violeta); gb.appendChild(verde);
    function arco(x,y,r,a0,a1){ var p=Math.PI/180; return 'M'+(x+Math.cos(a0*p)*r).toFixed(1)+' '+(y+Math.sin(a0*p)*r).toFixed(1)+' A'+r+' '+r+' 0 0 1 '+(x+Math.cos(a1*p)*r).toFixed(1)+' '+(y+Math.sin(a1*p)*r).toFixed(1); }
    var parar=bucle(el,function(){
      var c=ojo.querySelector('circle'), lente=c && /url\(/.test(c.getAttribute('fill')||''); // diafragma (no LED)
      if(!lente){ violeta.setAttribute('d',''); verde.setAttribute('d',''); return; }
      var x=+c.getAttribute('cx'), y=+c.getAttribute('cy');
      violeta.setAttribute('d',arco(x,y,31,-62,-18)); verde.setAttribute('d',arco(x,y,24,118,152)); });
    return { quitar:function(){ parar(); g.remove(); fb.remove(); ojo.style.filter=''; } };
  }

  // ---------- Casco vivo (vector, lib-frente.js, marco 200x200) ----------
  // Sus piezas se dibujan DENTRO de su propio SVG, en su mismo estilo (LED con brillo). Cada pieza entrega el trozo de SVG
  // para la expresión actual: svg(expr,color,u). Medidas de lib-frente: cáscara y 18–119, visera 104–153 (borde de arriba
  // en y 104), ojos LED en x 80 / 120 (y 111–137), boca en y 157.
  var LEDC='#d9fbff';
  // el modelo se redibuja en cada expresión: las animaciones siguen su reloj en vez de partir de cero
  function fase(dur){ return ' begin="-'+((Date.now()/1000)%dur).toFixed(2)+'s"'; }
  // Cejas: el mismo LED de la cara, sobre la visera. En una cara de pocos trazos las cejas son lo que más cambia la expresión.
  function cascoCejas(expr){
    var W=' fill="none" stroke="'+LEDC+'" stroke-width="3.4" stroke-linecap="round"', s='';
    function par(dI,dD){ return '<path d="'+dI+'"'+W+'/><path d="'+dD+'"'+W+'/>'; }
    if(expr==='sorprendido') s=par('M71 107 Q80 101 89 107','M111 107 Q120 101 129 107');          // bien arriba y curvas
    else if(expr==='riendo') s=par('M71 108 Q80 103.5 89 108','M111 108 Q120 103.5 129 108');
    else if(expr==='concentrado') s=par('M70 105.5 L89 109.5','M130 105.5 L111 109.5');            // bajan hacia el centro
    else if(expr==='sueno') s=par('M72 109 L88 109','M112 109 L128 109');                         // planas y bajas
    else if(expr==='guino') s=par('M71 107.5 Q80 104 89 107.5','M111 109.5 Q120 108 129 109.5');  // la del guiño baja
    else if(expr==='hablando') s='<g>'+par('M71 108 Q80 104.5 89 108','M111 108 Q120 104.5 129 108')+'<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.2;0 0;0 -0.6;0 0" dur=".9s" repeatCount="indefinite"/></g>';
    else s=par('M71 108 Q80 104.5 89 108','M111 108 Q120 104.5 129 108');                         // feliz
    return s; }
  // Calcomanías reflectantes: alas a los costados de la cáscara, como los kits de vinilo reflectante 3M para cascos.
  // Mate plateado; cuando les llega una luz (como un foco de auto de noche) devuelven un destello blanco.
  function cascoCalcos(expr,color,u){
    function ala(esp){ // ala de 3 plumas en la franja baja de la cáscara (y 81–101), bajo las ventilaciones; esp=-1 izquierda
      var tr=esp<0?'':' transform="translate(200 0) scale(-1 1)"';
      return '<g'+tr+'><path d="M60 100 C52 101 42 99 34 94 C40 95 46 95 51 94 C45 92 40 89 37 85 C44 88 50 89 55 89 C52 87 50 84 49 81 C55 85 60 89 63 94 C64 97 63 99 60 100 Z"/></g>'; }
    var forma=ala(-1)+ala(1);
    return '<g fill="#c9ced6" opacity=".92">'+forma+'</g>'
      +'<g fill="#ffffff" filter="url(#'+u+'cg)" opacity="0">'+forma
      +'<animate attributeName="opacity" values="0;0;1;.2;0" keyTimes="0;.86;.9;.95;1" dur="5.5s"'+fase(5.5)+' repeatCount="indefinite"/></g>'; }
  // Luz frontal y direccionales: como el casco Lumos (luz blanca adelante, direccionales ámbar a los costados que parpadean al doblar).
  function cascoLuces(expr,color,u){
    var blink=function(desde){ return '<animate attributeName="opacity" values="0;1;0;1;0;1;0;0" keyTimes="0;'+desde+';'+(desde+.06)+';'+(desde+.12)+';'+(desde+.18)+';'+(desde+.24)+';'+(desde+.3)+';1" dur="8s"'+fase(8)+' calcMode="discrete" repeatCount="indefinite"/>'; }; // discreta: una direccional se prende y se apaga de golpe (con interpolación se encendía lento por segundos)
    // Direccionales agrandadas (Inty 2026-10-07: "agranda las direccionales"; antes 8x6 = ~5 px en la tarjeta de 124 px):
    // tira ámbar a lo largo del borde bajo de la cáscara (contorno CASC de lib-frente: (30,106) -> esquina (40,119)),
    // metida 3 unidades hacia adentro, con halo ancho para que se lea como luz encendida a tamaño de tarjeta.
    var TIRA='M33 86 C31.6 95 32 102 33.6 108 C35 113 37 116 40 117.5';
    function lado(esp,desde){ var tr=esp<0?'':' transform="translate(200 0) scale(-1 1)"';
      return '<g'+tr+'><g opacity="0">'+blink(desde)
        +'<path d="'+TIRA+'" fill="none" stroke="#ffb020" stroke-width="11" stroke-linecap="round" opacity=".35" filter="url(#'+u+'cg)"/>'
        +'<path d="'+TIRA+'" fill="none" stroke="#ffc24a" stroke-width="5" stroke-linecap="round"/>'
        +'<path d="'+TIRA+'" fill="none" stroke="#fff3cf" stroke-width="1.8" stroke-linecap="round"/></g></g>'; }
    return '<rect x="86" y="97" width="28" height="5" rx="2.5" fill="#fffbe8" filter="url(#'+u+'cg)"/>'
      +lado(-1,.1)+lado(1,.55); }
  var CASCO_DEFS=function(u){ return '<filter id="'+u+'cg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'; };

  return { ciber:{ cables:ciberCables, grafitis:ciberGrafitis, visor:ciberVisor }, slime:{ burbujas:slimeBurbujas, gotitas:slimeGotitas, fruta:slimeFruta }, orbe:{ chispas:orbeChispas, destello:orbeDestello, visera:orbeVisera }, vinilo:{ ojo:viniloOjo, antena:viniloAntena, calcos:viniloCalcos },
           casco:{ cejas:{svg:cascoCejas}, calcos:{svg:cascoCalcos}, luces:{svg:cascoLuces}, _defs:CASCO_DEFS } };
})();
