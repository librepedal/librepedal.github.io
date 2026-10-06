/* Orbe animado como personaje (no como foto que sube y baja). Principios de animación clásica:
   anticipación, aplastar y estirar, el casco llega después que el cuerpo (inercia), acciones secundarias
   (parpadeo, mirar alrededor) y ritmo. Estados como Duolingo/Rive: reposo, hablar, feliz, sorpresa, dormir.
   crearOrbe(contenedor) -> { estado(nombre) } */
function crearOrbe(el){
  var u='oa'+Math.random().toString(36).slice(2,6);
  el.innerHTML='<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible">'
   +'<defs><radialGradient id="'+u+'g" cx=".42" cy=".42" r=".65"><stop offset="0" stop-color="#ffe2c8"/><stop offset=".35" stop-color="#ff9a52"/><stop offset=".8" stop-color="#fc4c02"/><stop offset="1" stop-color="#c43a00"/></radialGradient>'
   +'<radialGradient id="'+u+'h" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#fc4c02" stop-opacity=".55"/><stop offset="1" stop-color="#fc4c02" stop-opacity="0"/></radialGradient>'
   +'<filter id="'+u+'b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="x"/><feMerge><feMergeNode in="x"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
   +'<clipPath id="'+u+'c"><circle cx="100" cy="126" r="42"/></clipPath></defs>'
   +'<ellipse id="'+u+'sombra" cx="100" cy="180" rx="32" ry="5" fill="#000" opacity=".35"/>'
   +'<g id="'+u+'cuerpo">'
   +  '<circle id="'+u+'halo" cx="100" cy="126" r="64" fill="url(#'+u+'h)"/>'
   +  '<circle cx="100" cy="126" r="42" fill="url(#'+u+'g)"/>'
   +  '<ellipse cx="86" cy="112" rx="12" ry="7" fill="#fff" opacity=".35" transform="rotate(-25 86 112)"/>'
   +  '<g clip-path="url(#'+u+'c)"><g id="'+u+'cara" filter="url(#'+u+'b)" fill="#fffaf0" stroke="#fffaf0">'
   +    '<g id="'+u+'ojoI"><ellipse cx="89" cy="128" rx="4.6" ry="5.4" stroke="none"/></g>'
   +    '<g id="'+u+'ojoD"><ellipse cx="111" cy="128" rx="4.6" ry="5.4" stroke="none"/></g>'
   +    '<path id="'+u+'boca" d="M89 142 Q100 151 111 142" fill="none" stroke-width="3.4" stroke-linecap="round"/>'
   +  '</g></g>'
   +'</g>'
   +'<g id="'+u+'casco">'
   +  '<defs><linearGradient id="'+u+'k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4d75"/><stop offset=".6" stop-color="#243250"/><stop offset="1" stop-color="#18223b"/></linearGradient></defs>'
   +  '<path d="M51.1 136.4 A50 50 0 1 1 148.9 136.4 C150 118 138 110 124 108 C114 106.5 106 106 100 106 C94 106 86 106.5 76 108 C62 110 50 118 51.1 136.4 Z" fill="url(#'+u+'k)"/>'
   +  '<path d="M86.8 83.0 Q72.6 92.0 62.0 111.0 L63.8 111.0 Q75.6 92.0 88.0 83.0 Z" fill="#0f1628"/>'
   +  '<path d="M91.2 83.0 Q81.8 92.0 74.7 111.0 L76.9 111.0 Q85.5 92.0 92.7 83.0 Z" fill="#0f1628"/>'
   +  '<path d="M108.8 83.0 Q118.2 92.0 125.3 111.0 L127.5 111.0 Q121.9 92.0 110.3 83.0 Z" fill="#0f1628"/>'
   +  '<path d="M113.2 83.0 Q127.4 92.0 138.0 111.0 L139.8 111.0 Q130.4 92.0 114.4 83.0 Z" fill="#0f1628"/>'
   +  '<path d="M100 78 Q104 96 102 108 L98 108 Q96 96 100 78 Z" fill="#fc4c02"/>'
   +  '<path d="M70 87 Q100 75 130 87" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".22"/>'
   +  '<path d="M51.1 136.4 C50 118 62 110 76 108 C86 106.5 94 106 100 106 C106 106 114 106.5 124 108 C138 110 150 118 148.9 136.4" fill="none" stroke="#0d1424" stroke-width="3" stroke-linecap="round"/>'
   +'</g></svg>';
  var $=function(id){ return el.querySelector('#'+u+id); };
  var cuerpo=$('cuerpo'), casco=$('casco'), cara=$('cara'), ojoI=$('ojoI'), ojoD=$('ojoD'), boca=$('boca'), halo=$('halo'), sombra=$('sombra');
  var est='reposo', tEst=0, t0=performance.now(), last=t0;
  // resortes: el casco sigue al cuerpo con retraso (inercia)
  var cy=0, cv=0, by=0, sx=1, sy=1, mx=0, mxObj=0, prox=2+Math.random()*2, parp=0, proxParp=1.5;
  function bocaD(abierta, sonrisa){ // abierta 0..1, sonrisa -1..1
    var y=142, w=11, c=y+9*sonrisa; if(abierta<.05) return 'M'+(100-w)+' '+y+' Q100 '+c+' '+(100+w)+' '+y;
    var h=abierta*10; return 'M'+(100-w*.8)+' '+y+' Q100 '+(y-h*.35)+' '+(100+w*.8)+' '+y+' Q100 '+(y+h+4*sonrisa)+' '+(100-w*.8)+' '+y+' Z'; }
  function cuadro(now){
    var dt=Math.min(.05,(now-last)/1000); last=now; var t=(now-t0)/1000, te=t-tEst;
    var objY=0, objSx=1, objSy=1, abierta=0, sonrisa=1, ojoEsc=1, ojoForma='normal', haloO=.55+.08*Math.sin(t*2.2), haloR=64;
    // respiración (reposo)
    var resp=Math.sin(t*2.1); objSy=1+.018*resp; objSx=1-.012*resp;
    if(est==='hablar'){ var s=Math.abs(Math.sin(te*13))*(.5+.5*Math.sin(te*3.1)); abierta=s; haloO=.6+.3*s; haloR=66+6*s; objY=-1.5*s; }
    if(est==='feliz'){ // anticipación -> salto estirado -> aterrizaje aplastado -> rebote chico
      if(te<.18){ var k=te/.18; objSy=1-.14*k; objSx=1+.12*k; objY=4*k; }
      else if(te<.55){ var k2=(te-.18)/.37; objY=-26*Math.sin(Math.PI*k2); objSy=1+.1*Math.sin(Math.PI*k2); objSx=1-.07*Math.sin(Math.PI*k2); }
      else if(te<.75){ var k3=(te-.55)/.2; objSy=1-.12*Math.sin(Math.PI*k3); objSx=1+.1*Math.sin(Math.PI*k3); }
      else if(te<1.05){ var k4=(te-.75)/.3; objY=-7*Math.sin(Math.PI*k4); }
      ojoForma='feliz'; sonrisa=1.2; haloO=.8; haloR=70; if(te>1.6){ est='reposo'; tEst=t; }
    }
    if(est==='sorpresa'){ var a=Math.min(1,te/.12); objSy=1+.12*a*Math.exp(-te*3); objSx=1-.08*a*Math.exp(-te*3); objY=-6*a*Math.exp(-te*4);
      ojoEsc=1+.6*a; abierta=.7*a; sonrisa=0; haloO=.9; if(te>1.4){ est='reposo'; tEst=t; } }
    if(est==='dormir'){ objSy=1+.035*Math.sin(t*1.2); objSx=1-.025*Math.sin(t*1.2); objY=2; ojoForma='cerrado'; sonrisa=.3; haloO=.25+.08*Math.sin(t*1.2); haloR=58; }
    // mirar alrededor (acción secundaria), solo en reposo y hablando
    if(est==='reposo'||est==='hablar'){ prox-=dt; if(prox<0){ mxObj=[-9,-5,0,0,5,9][Math.floor(Math.random()*6)]; prox=1.6+Math.random()*2.6; } } else mxObj=0;
    mx+=(mxObj-mx)*Math.min(1,dt*7);
    // parpadeo
    if(ojoForma==='normal'){ proxParp-=dt; if(proxParp<0){ parp=.14; proxParp=2.2+Math.random()*3; } }
    if(parp>0){ parp-=dt; ojoEsc*=Math.max(.08,Math.abs(parp-.07)/.07); }
    // suavizado del cuerpo
    by+=(objY-by)*Math.min(1,dt*18); sx+=(objSx-sx)*Math.min(1,dt*20); sy+=(objSy-sy)*Math.min(1,dt*20);
    // casco con resorte (llega después)
    var fuerza=(by-cy)*180-cv*14; cv+=fuerza*dt; cy+=cv*dt;
    var base=168, orig='100 '+base;
    cuerpo.setAttribute('transform','translate(0 '+by.toFixed(2)+') translate(100 '+base+') scale('+sx.toFixed(3)+' '+sy.toFixed(3)+') translate(-100 -'+base+')');
    var techo=(1-sy)*(base-84); // el tope del orbe baja cuando se aplasta
    casco.setAttribute('transform','translate(0 '+(cy+techo).toFixed(2)+') rotate('+(mx*.25).toFixed(2)+' 100 110)');
    cara.setAttribute('transform','translate('+mx.toFixed(2)+' 0) translate(100 128) scale('+(1-Math.abs(mx)/60).toFixed(3)+' 1) translate(-100 -128)');
    halo.setAttribute('opacity',haloO.toFixed(2)); halo.setAttribute('r',haloR.toFixed(1));
    sombra.setAttribute('rx',(32*(1-by/-60)).toFixed(1)); sombra.setAttribute('opacity',(.35*(1+by/80)).toFixed(2));
    // ojos
    [ojoI,ojoD].forEach(function(o,i){ var x=i?111:89;
      if(ojoForma==='feliz') o.innerHTML='<path d="M'+(x-6)+' 131 Q'+x+' 121 '+(x+6)+' 131" fill="none" stroke-width="3.4" stroke-linecap="round"/>';
      else if(ojoForma==='cerrado') o.innerHTML='<path d="M'+(x-6)+' 129 Q'+x+' 133 '+(x+6)+' 129" fill="none" stroke-width="3" stroke-linecap="round"/>';
      else o.innerHTML='<ellipse cx="'+x+'" cy="128" rx="'+(4.6*Math.min(1.5,ojoEsc>1?ojoEsc:1)).toFixed(2)+'" ry="'+(5.4*ojoEsc).toFixed(2)+'" stroke="none"/>'; });
    boca.setAttribute('d',bocaD(abierta,sonrisa)); boca.setAttribute('fill',abierta>.05?'#fffaf0':'none');
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(n){ est=n; tEst=(performance.now()-t0)/1000; } };
}
