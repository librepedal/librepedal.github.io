
/* Orbe con capas de Gemini (casco y orbe dibujados por Gemini) + la animación que aprobó Inty.
   Marco 1024x1024 = el de las imágenes de Gemini. El casco se recorta del fondo verde en el navegador
   (las ventilaciones quedan transparentes y la luz del orbe asoma por ellas). La cara es de luz, en vector,
   para poder hablar y cambiar de expresión.
   crearOrbeCapas(el, urlCasco, urlOrbe) -> Promise<{estado(nombre)}> */
function _recortarVerde(url){
  return new Promise(function(ok,mal){ var im=new Image(); im.onload=function(){
    var c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; var x=c.getContext('2d'); x.drawImage(im,0,0);
    var d=x.getImageData(0,0,c.width,c.height), p=d.data;
    for(var i=0;i<p.length;i+=4){ var r=p[i],g=p[i+1],b=p[i+2], m=Math.max(r,b), v=g-m;
      if(v>18){ var a=Math.max(0,Math.min(1,1-(v-18)/70)); p[i+3]=Math.round(255*a); p[i+1]=m; } }
    x.putImageData(d,0,0); ok(c.toDataURL('image/png')); }; im.onerror=mal; im.src=url; });
}
function crearOrbeCapas(el, urlCasco, urlOrbe){
  return _recortarVerde(urlCasco).then(function(casco){
  var u='oc'+Math.random().toString(36).slice(2,6);
  var CX=522, CY=647, R=293;            // orbe dentro del casco (medido sobre la imagen de Gemini)
  el.innerHTML='<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible">'
   +'<defs><radialGradient id="'+u+'h" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#fc4c02" stop-opacity=".5"/><stop offset="1" stop-color="#fc4c02" stop-opacity="0"/></radialGradient>'
   +'<clipPath id="'+u+'c"><circle cx="512" cy="512" r="338"/></clipPath>'+'<clipPath id="'+u+'f"><path d="M120 690 C210 575 360 548 522 548 C684 548 834 575 924 690 L924 1024 L120 1024 Z"/></clipPath>'
   +'<filter id="'+u+'b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="x"/><feMerge><feMergeNode in="x"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
   +'<ellipse id="'+u+'sombra" cx="'+CX+'" cy="990" rx="230" ry="22" fill="#000" opacity=".35"/>'
   +'<g id="'+u+'cuerpo">'
   +  '<circle id="'+u+'halo" cx="'+CX+'" cy="'+CY+'" r="'+(R*1.45)+'" fill="url(#'+u+'h)"/>'
   +  '<g transform="translate('+CX+' '+CY+') scale('+(R/338).toFixed(4)+') translate(-512 -512)"><image href="'+urlOrbe+'" x="0" y="0" width="1024" height="1024" clip-path="url(#'+u+'c)"/></g>'
   +'</g>'
   +'<g id="'+u+'casco"><image href="'+casco+'" x="0" y="0" width="1024" height="1024"/></g>'
   +'<g id="'+u+'frente" clip-path="url(#'+u+'f)">'
   +  '<g transform="translate('+CX+' '+CY+') scale('+(R/338).toFixed(4)+') translate(-512 -512)"><image href="'+urlOrbe+'" x="0" y="0" width="1024" height="1024" clip-path="url(#'+u+'c)"/></g>'
   +  '<g id="'+u+'cara" filter="url(#'+u+'b)" fill="#fffaf0" stroke="#fffaf0">'
   +    '<g id="'+u+'ojoI"></g><g id="'+u+'ojoD"></g>'
   +    '<path id="'+u+'boca" d="" fill="none" stroke-width="17" stroke-linecap="round"/>'
   +  '</g>'
   +'</g>'
   +'</svg>';
  var $=function(id){ return el.querySelector('#'+u+id); };
  var frente=$('frente'), cuerpo=$('cuerpo'), cascoG=$('casco'), cara=$('cara'), ojoI=$('ojoI'), ojoD=$('ojoD'), boca=$('boca'), halo=$('halo'), sombra=$('sombra');
  var S=5.12, EY=650, EX=[449,595], MY=722;
  var est='reposo', tEst=0, t0=performance.now(), last=t0;
  var cy=0, cv=0, by=0, sx=1, sy=1, mx=0, mxObj=0, prox=2+Math.random()*2, parp=0, proxParp=1.5;
  function bocaD(ab, son){ var w=68, c=MY+44*son; if(ab<.05) return 'M'+(CX-w)+' '+MY+' Q'+CX+' '+c+' '+(CX+w)+' '+MY;
    var h=ab*52; return 'M'+(CX-w*.8)+' '+MY+' Q'+CX+' '+(MY-h*.35)+' '+(CX+w*.8)+' '+MY+' Q'+CX+' '+(MY+h+20*son)+' '+(CX-w*.8)+' '+MY+' Z'; }
  function cuadro(now){
    var dt=Math.min(.05,(now-last)/1000); last=now; var t=(now-t0)/1000, te=t-tEst;
    var objY=0, objSx=1, objSy=1, ab=0, son=1, ojoEsc=1, forma='normal', haloO=.55+.08*Math.sin(t*2.2), haloK=1;
    var resp=Math.sin(t*2.1); objSy=1+.018*resp; objSx=1-.012*resp;
    if(est==='hablar'){ var s=Math.abs(Math.sin(te*13))*(.5+.5*Math.sin(te*3.1)); ab=s; haloO=.6+.3*s; haloK=1+.08*s; objY=-1.5*s; }
    if(est==='feliz'){
      if(te<.18){ var k=te/.18; objSy=1-.14*k; objSx=1+.12*k; objY=4*k; }
      else if(te<.55){ var k2=(te-.18)/.37; objY=-26*Math.sin(Math.PI*k2); objSy=1+.1*Math.sin(Math.PI*k2); objSx=1-.07*Math.sin(Math.PI*k2); }
      else if(te<.75){ var k3=(te-.55)/.2; objSy=1-.12*Math.sin(Math.PI*k3); objSx=1+.1*Math.sin(Math.PI*k3); }
      else if(te<1.05){ var k4=(te-.75)/.3; objY=-7*Math.sin(Math.PI*k4); }
      forma='feliz'; son=1.2; haloO=.8; haloK=1.08; if(te>1.6){ est='reposo'; tEst=t; } }
    if(est==='sorpresa'){ var a=Math.min(1,te/.12); objSy=1+.12*a*Math.exp(-te*3); objSx=1-.08*a*Math.exp(-te*3); objY=-6*a*Math.exp(-te*4);
      ojoEsc=1+.6*a; ab=.7*a; son=0; haloO=.9; if(te>1.4){ est='reposo'; tEst=t; } }
    if(est==='dormir'){ objSy=1+.035*Math.sin(t*1.2); objSx=1-.025*Math.sin(t*1.2); objY=2; forma='cerrado'; son=.3; haloO=.25+.08*Math.sin(t*1.2); haloK=.9; }
    if(est==='reposo'||est==='hablar'){ prox-=dt; if(prox<0){ mxObj=[-9,-5,0,0,5,9][Math.floor(Math.random()*6)]; prox=1.6+Math.random()*2.6; } } else mxObj=0;
    mx+=(mxObj-mx)*Math.min(1,dt*7);
    if(forma==='normal'){ proxParp-=dt; if(proxParp<0){ parp=.14; proxParp=2.2+Math.random()*3; } }
    if(parp>0){ parp-=dt; ojoEsc*=Math.max(.08,Math.abs(parp-.07)/.07); }
    by+=(objY-by)*Math.min(1,dt*18); sx+=(objSx-sx)*Math.min(1,dt*20); sy+=(objSy-sy)*Math.min(1,dt*20);
    var fuerza=(by-cy)*180-cv*14; cv+=fuerza*dt; cy+=cv*dt;
    var base=CY+R;
    cuerpo.setAttribute('transform','translate(0 '+(by*S).toFixed(1)+') translate('+CX+' '+base+') scale('+sx.toFixed(3)+' '+sy.toFixed(3)+') translate(-'+CX+' -'+base+')');
    frente.setAttribute('transform',cuerpo.getAttribute('transform'));
    var techo=(1-sy)*(2*R);
    cascoG.setAttribute('transform','translate(0 '+((cy*S)+techo).toFixed(1)+') rotate('+(mx*.25).toFixed(2)+' '+CX+' 560)');
    cara.setAttribute('transform','translate('+(mx*S).toFixed(1)+' 0) translate('+CX+' '+EY+') scale('+(1-Math.abs(mx)/60).toFixed(3)+' 1) translate(-'+CX+' -'+EY+')');
    halo.setAttribute('opacity',haloO.toFixed(2)); halo.setAttribute('r',(R*1.45*haloK).toFixed(0));
    sombra.setAttribute('rx',(230*(1+by/60)).toFixed(0)); sombra.setAttribute('opacity',(.35*(1+by/80)).toFixed(2));
    [ojoI,ojoD].forEach(function(o,i){ var x=EX[i];
      if(forma==='feliz') o.innerHTML='<path d="M'+(x-30)+' '+(EY+14)+' Q'+x+' '+(EY-38)+' '+(x+30)+' '+(EY+14)+'" fill="none" stroke-width="17" stroke-linecap="round"/>';
      else if(forma==='cerrado') o.innerHTML='<path d="M'+(x-30)+' '+(EY+4)+' Q'+x+' '+(EY+24)+' '+(x+30)+' '+(EY+4)+'" fill="none" stroke-width="15" stroke-linecap="round"/>';
      else o.innerHTML='<ellipse cx="'+x+'" cy="'+EY+'" rx="'+(23*Math.min(1.5,ojoEsc>1?ojoEsc:1)).toFixed(1)+'" ry="'+(26*ojoEsc).toFixed(1)+'" stroke="none"/>'; });
    boca.setAttribute('d',bocaD(ab,son)); boca.setAttribute('fill',ab>.05?'#fffaf0':'none');
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(n){ est=n; tEst=(performance.now()-t0)/1000; } };
  });
}

