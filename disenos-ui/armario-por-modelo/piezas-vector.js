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

  // ---------- Orbe · Estela de luz ----------
  // Como una foto de exposición larga: una luz que se mueve deja un rastro continuo que se apaga hacia atrás. Va DETRÁS del
  // orbe (el orbe tapa su posición actual): el rastro asoma cuando se mueve (respira, salta al celebrar, se sorprende).
  // Quieto no deja estela, igual que en la foto. El ancho es el del orbe: se ve apenas se mueve más de ~2 % de su tamaño.
  function orbeEstela(el){
    var G=orbeGrupos(el); if(!G) return null; var u='pze'+(++uid), defs=defsDe(G.svg), f=brillo(defs,u+'f');
    var gr=nodo('radialGradient',{id:u+'g',cx:'.5',cy:'.5',r:'.5'});
    gr.appendChild(nodo('stop',{offset:'0','stop-color':'#ffe2b8','stop-opacity':'.9'})); gr.appendChild(nodo('stop',{offset:'.6','stop-color':'#ff9a4a','stop-opacity':'.55'})); gr.appendChild(nodo('stop',{offset:'1','stop-color':'#ff7a2a','stop-opacity':'0'}));
    defs.appendChild(gr);
    var g=nodo('g',{'class':'pieza-estela',filter:'url(#'+u+'f)'}); G.svg.insertBefore(g,G.cuerpo);
    // fantasmas del orbe en sus posiciones de antes: el más reciente más fuerte, los viejos se apagan (exposición larga)
    var N=7, fant=[]; for(var i=0;i<N;i++){ var c=nodo('circle',{cx:OCX,r:(OR*.97).toFixed(0),fill:'url(#'+u+'g)',opacity:'0'}); g.appendChild(c); fant.push(c); }
    var hist=[], DUR=.6;
    var parar=bucle(el,function(dt,now){
      var m=/translate\(0 (-?[\d.]+)\)/.exec(G.cuerpo.getAttribute('transform')||''), y=OCY+(m?+m[1]:0), t=now/1000;
      hist.push({t:t,y:y}); while(hist.length&&hist[0].t<t-DUR) hist.shift();
      fant.forEach(function(c,i){ var edad=(i+1)/N*DUR, h=null;
        for(var k=hist.length-1;k>=0;k--){ if(t-hist[k].t>=edad){ h=hist[k]; break; } }
        var sep=h?Math.abs(h.y-y):0; // solo asoma lo que el orbe ya no tapa
        if(reduce||!h||sep<5){ c.setAttribute('opacity','0'); return; }
        c.setAttribute('cy',h.y.toFixed(1)); c.setAttribute('opacity',((1-edad/DUR)*.75*Math.min(1,sep/40)).toFixed(2)); });
    });
    return { quitar:function(){ parar(); g.remove(); f.remove(); gr.remove(); } };
  }

  return { slime:{ burbujas:slimeBurbujas, gotitas:slimeGotitas }, orbe:{ chispas:orbeChispas, estela:orbeEstela } };
})();
