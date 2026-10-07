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
  // Gota de gelatina recién desmoldada: baja por el costado pegada a la superficie, queda colgando bajo el borde, se estira,
  // el cuello se adelgaza hasta cortarse, cae y se aplasta en el suelo en una manchita que se seca.
  // Recorrido medido sobre la imagen del cuerpo (contorno a alfa > 128): el costado se ensancha hasta y≈630 (x 375 / 1000) y
  // debajo se recoge (y 660: x 391 / 981). Suelo bajo el borde: y≈690. Va en el grupo "frente": se mueve con la gelatina.
  // Lleva la clase pieza-tinte para tomar el mismo color que la gelatina cuando se cambia el Estilo.
  var GOTA_RUTA={
    izq:{p:[[389,588],[384,600],[379,612],[375,624],[375,636],[382,648],[391,660]], cuelga:[394,664], sale:-1},
    der:{p:[[985,588],[991,600],[996,612],[1000,624],[999,636],[994,648],[981,660]], cuelga:[978,663], sale:1}
  };
  var SUELO_GOTA=690;
  function slimeGotitas(el){
    var svg=el.querySelector('svg'); if(!svg) return null;
    var frente=[].filter.call(svg.querySelectorAll('g[clip-path]'),function(g){ return g.querySelector('image'); })[0]; if(!frente) return null;
    var g=nodo('g',{'class':'pieza-gotitas pieza-tinte'}); frente.appendChild(g);
    var gotas=[], vivo=true, prox=.6, ult=performance.now(), lado=Math.random()<.5?'izq':'der';
    function sobre(t,ruta){ // punto del recorrido a la fracción t (0..1), un poco hacia afuera de la superficie
      var p=ruta.p, f=Math.min(p.length-1.001,Math.max(0,t*(p.length-1))), i=Math.floor(f), k=f-i;
      return [p[i][0]+(p[i+1][0]-p[i][0])*k+ruta.sale*7, p[i][1]+(p[i+1][1]-p[i][1])*k]; }
    function nueva(){
      var ruta=GOTA_RUTA[lado]; lado=lado==='izq'?'der':'izq';
      var d={ruta:ruta, t:0, R:22+Math.random()*6, /* ~8 % del ancho de la gelatina: en la tarjeta del Perfil (124 px) la gota se ve de ~8 px */ cuerpo:nodo('path',{fill:'#f07a28','fill-opacity':'.9',stroke:'rgba(120,45,8,.35)','stroke-width':'1.6'}),
        brillo:nodo('ellipse',{fill:'#fff',opacity:'.85'}), mancha:nodo('ellipse',{fill:'#f07a28','fill-opacity':'.7',opacity:'0'})};
      g.appendChild(d.mancha); g.appendChild(d.cuerpo); g.appendChild(d.brillo); gotas.push(d); }
    // forma de lágrima: cuello de ancho w en (x0,y0) y bulbo de radio r centrado en (x0,yb)
    function lagrima(x0,y0,yb,r,w){ return 'M'+(x0-w)+' '+y0+' C'+(x0-w*.6)+' '+((y0+yb)/2)+' '+(x0-r)+' '+(yb-r*.7)+' '+(x0-r)+' '+yb
      +' A'+r+' '+r+' 0 1 0 '+(x0+r)+' '+yb+' C'+(x0+r)+' '+(yb-r*.7)+' '+(x0+w*.6)+' '+((y0+yb)/2)+' '+(x0+w)+' '+y0+' Z'; }
    function cuadro(now){
      if(!vivo) return;
      var dt=Math.min(.05,(now-ult)/1000); ult=now;
      if(!reduce){ prox-=dt; if(prox<0 && gotas.length<2){ nueva(); prox=2.4+Math.random()*2.2; } }
      gotas=gotas.filter(function(d){
        if(!reduce) d.t+=dt; var t=d.t, R=d.R, c=d.ruta.cuelga, x, y, path;
        if(t<1.1){ // baja pegada al costado (va acelerando)
          var q=sobre(Math.pow(t/1.1,1.6),d.ruta), r=R*(.55+.25*t/1.1);
          path='M'+(q[0]-r)+' '+q[1]+' A'+r+' '+(r*1.15)+' 0 1 0 '+(q[0]+r)+' '+q[1]+' A'+r+' '+(r*1.15)+' 0 1 0 '+(q[0]-r)+' '+q[1]+' Z'; x=q[0]; y=q[1];
        } else if(t<1.85){ // cuelga del borde y se estira; el cuello se adelgaza
          var k=(t-1.1)/.75, yb=c[1]+R*(.9+1.1*k*k), w=R*(.75-.6*k); x=c[0]; y=yb;
          path=lagrima(c[0],c[1]-2,yb,R*(.8+.2*k),w);
        } else if(t<2.15){ // se corta y cae (gravedad)
          var k2=(t-1.85)/.3; y=c[1]+R*2+(SUELO_GOTA-R-(c[1]+R*2))*k2*k2; x=c[0];
          path='M'+(x-R*.8)+' '+y+' A'+(R*.8)+' '+R+' 0 1 0 '+(x+R*.8)+' '+y+' A'+(R*.8)+' '+R+' 0 1 0 '+(x-R*.8)+' '+y+' Z';
        } else { // se aplasta en el suelo y se seca
          var k3=Math.min(1,(t-2.15)/.9); x=c[0]; path='';
          d.mancha.setAttribute('cx',x); d.mancha.setAttribute('cy',SUELO_GOTA); d.mancha.setAttribute('rx',(R*(1.1+1.2*Math.min(1,k3*4))).toFixed(1)); d.mancha.setAttribute('ry',(R*.32).toFixed(1));
          d.mancha.setAttribute('opacity',(1-k3).toFixed(2));
          if(k3>=1){ d.cuerpo.remove(); d.brillo.remove(); d.mancha.remove(); return false; }
        }
        d.cuerpo.setAttribute('d',path); d.brillo.setAttribute('opacity',path?'.85':'0');
        if(path){ d.brillo.setAttribute('cx',(x-R*.28).toFixed(1)); d.brillo.setAttribute('cy',(y-R*.15).toFixed(1)); d.brillo.setAttribute('rx',(R*.22).toFixed(1)); d.brillo.setAttribute('ry',(R*.32).toFixed(1)); }
        return true; });
      if(el.isConnected && !document.hidden) requestAnimationFrame(cuadro); else setTimeout(function(){ ult=performance.now(); requestAnimationFrame(cuadro); },250);
    }
    if(reduce){ nueva(); gotas[0].t=1.6; } // movimiento reducido: una gota quieta colgando del borde
    requestAnimationFrame(cuadro);
    return { quitar:function(){ vivo=false; g.remove(); } };
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
