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
   +'<clipPath id="'+u+'c"><circle cx="100" cy="128" r="52"/></clipPath></defs>'
   +'<ellipse id="'+u+'sombra" cx="100" cy="192" rx="40" ry="5" fill="#000" opacity=".35"/>'
   +'<g id="'+u+'cuerpo">'
   +  '<circle id="'+u+'halo" cx="100" cy="128" r="78" fill="url(#'+u+'h)"/>'
   +  '<circle cx="100" cy="128" r="52" fill="url(#'+u+'g)"/>'
   +  '<ellipse cx="82" cy="104" rx="16" ry="9" fill="#fff" opacity=".35" transform="rotate(-25 82 104)"/>'
   +  '<g clip-path="url(#'+u+'c)"><g id="'+u+'cara" filter="url(#'+u+'b)" fill="#fffaf0" stroke="#fffaf0">'
   +    '<g id="'+u+'ojoI"><ellipse cx="86" cy="128" rx="4.6" ry="5.4" stroke="none"/></g>'
   +    '<g id="'+u+'ojoD"><ellipse cx="114" cy="128" rx="4.6" ry="5.4" stroke="none"/></g>'
   +    '<path id="'+u+'boca" d="M89 142 Q100 151 111 142" fill="none" stroke-width="3.4" stroke-linecap="round"/>'
   +  '</g></g>'
   +'</g>'
   +'<g id="'+u+'casco">'
   +  '<path d="M44 112 C40 72 66 48 100 46 C134 48 160 72 156 112 C150 106 128 100 100 100 C72 100 50 106 44 112 Z" fill="#243250"/>'
   +  '<path d="M56 74 C70 58 86 52 100 52 C114 52 130 58 144 74 C130 64 116 60 100 60 C84 60 70 64 56 74 Z" fill="#3a4b70" opacity=".8"/>'
   +  '<rect x="70" y="62" width="9" height="26" rx="4.5" fill="#121a2e" transform="rotate(-12 74 75)"/><rect x="72" y="76" width="5" height="10" rx="2.5" fill="#ff8a3d" opacity=".75" transform="rotate(-12 74 75)"/><rect x="121" y="62" width="9" height="26" rx="4.5" fill="#121a2e" transform="rotate(12 125 75)"/><rect x="123" y="76" width="5" height="10" rx="2.5" fill="#ff8a3d" opacity=".75" transform="rotate(12 125 75)"/><rect x="85" y="56" width="9" height="30" rx="4.5" fill="#121a2e"/><rect x="87" y="73" width="5" height="12" rx="2.5" fill="#ff8a3d" opacity=".75"/><rect x="106" y="56" width="9" height="30" rx="4.5" fill="#121a2e"/><rect x="108" y="73" width="5" height="12" rx="2.5" fill="#ff8a3d" opacity=".75"/>'
   +  '<rect x="97" y="48" width="6" height="40" rx="3" fill="#fc4c02"/>'
   +  '<path d="M46 110 C70 102 130 102 154 110" fill="none" stroke="#141c33" stroke-width="4" stroke-linecap="round"/>'
   +  '<path d="M50 112 C52 140 70 166 92 176 M150 112 C148 140 130 166 108 176" fill="none" stroke="#141c33" stroke-width="3" stroke-linecap="round"/>'
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
    var objY=0, objSx=1, objSy=1, abierta=0, sonrisa=1, ojoEsc=1, ojoForma='normal', haloO=.55+.08*Math.sin(t*2.2), haloR=78;
    // respiración (reposo)
    var resp=Math.sin(t*2.1); objSy=1+.018*resp; objSx=1-.012*resp;
    if(est==='hablar'){ var s=Math.abs(Math.sin(te*13))*(.5+.5*Math.sin(te*3.1)); abierta=s; haloO=.6+.3*s; haloR=80+6*s; objY=-1.5*s; }
    if(est==='feliz'){ // anticipación -> salto estirado -> aterrizaje aplastado -> rebote chico
      if(te<.18){ var k=te/.18; objSy=1-.14*k; objSx=1+.12*k; objY=4*k; }
      else if(te<.55){ var k2=(te-.18)/.37; objY=-26*Math.sin(Math.PI*k2); objSy=1+.1*Math.sin(Math.PI*k2); objSx=1-.07*Math.sin(Math.PI*k2); }
      else if(te<.75){ var k3=(te-.55)/.2; objSy=1-.12*Math.sin(Math.PI*k3); objSx=1+.1*Math.sin(Math.PI*k3); }
      else if(te<1.05){ var k4=(te-.75)/.3; objY=-7*Math.sin(Math.PI*k4); }
      ojoForma='feliz'; sonrisa=1.2; haloO=.8; haloR=84; if(te>1.6){ est='reposo'; tEst=t; }
    }
    if(est==='sorpresa'){ var a=Math.min(1,te/.12); objSy=1+.12*a*Math.exp(-te*3); objSx=1-.08*a*Math.exp(-te*3); objY=-6*a*Math.exp(-te*4);
      ojoEsc=1+.6*a; abierta=.7*a; sonrisa=0; haloO=.9; if(te>1.4){ est='reposo'; tEst=t; } }
    if(est==='dormir'){ objSy=1+.035*Math.sin(t*1.2); objSx=1-.025*Math.sin(t*1.2); objY=2; ojoForma='cerrado'; sonrisa=.3; haloO=.25+.08*Math.sin(t*1.2); haloR=72; }
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
    var base=180, orig='100 '+base;
    cuerpo.setAttribute('transform','translate(0 '+by.toFixed(2)+') translate(100 '+base+') scale('+sx.toFixed(3)+' '+sy.toFixed(3)+') translate(-100 -'+base+')');
    var techo=(1-sy)*(base-76); // el tope del orbe baja cuando se aplasta
    casco.setAttribute('transform','translate(0 '+(cy+techo).toFixed(2)+') rotate('+(mx*.25).toFixed(2)+' 100 110)');
    cara.setAttribute('transform','translate('+mx.toFixed(2)+' 0) translate(100 128) scale('+(1-Math.abs(mx)/60).toFixed(3)+' 1) translate(-100 -128)');
    halo.setAttribute('opacity',haloO.toFixed(2)); halo.setAttribute('r',haloR.toFixed(1));
    sombra.setAttribute('rx',(40*(1-by/-60)).toFixed(1)); sombra.setAttribute('opacity',(.35*(1+by/80)).toFixed(2));
    // ojos
    [ojoI,ojoD].forEach(function(o,i){ var x=i?114:86;
      if(ojoForma==='feliz') o.innerHTML='<path d="M'+(x-6)+' 131 Q'+x+' 121 '+(x+6)+' 131" fill="none" stroke-width="3.4" stroke-linecap="round"/>';
      else if(ojoForma==='cerrado') o.innerHTML='<path d="M'+(x-6)+' 129 Q'+x+' 133 '+(x+6)+' 129" fill="none" stroke-width="3" stroke-linecap="round"/>';
      else o.innerHTML='<ellipse cx="'+x+'" cy="128" rx="'+(4.6*Math.min(1.5,ojoEsc>1?ojoEsc:1)).toFixed(2)+'" ry="'+(5.4*ojoEsc).toFixed(2)+'" stroke="none"/>'; });
    boca.setAttribute('d',bocaD(abierta,sonrisa)); boca.setAttribute('fill',abierta>.05?'#fffaf0':'none');
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(n){ est=n; tEst=(performance.now()-t0)/1000; } };
}
