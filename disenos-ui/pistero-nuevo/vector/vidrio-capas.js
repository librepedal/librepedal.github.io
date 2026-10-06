/* Vidrio y luz con capas de Gemini (casco limpio y cabeza de vidrio esmerilado, dibujados por Gemini) + animación de trazos de luz.
   Marco 1376x768 = el de las imágenes de Gemini. La cara son líneas de luz naranja que viven bajo el vidrio, en vector.
   Diferencia con los otros modelos: los gestos se "dibujan con luz" (cada línea se borra y se vuelve a trazar al cambiar
   de expresión) y el movimiento es lento y suave, con la luz del interior que respira y se enciende al hablar.
   crearVidrioCapas(el, urlCasco, urlCabeza) -> Promise<{estado(nombre)}> */
function _recortarVidrio(url, alfa, despues){
  return new Promise(function(ok,mal){ var im=new Image(); im.onload=function(){
    var c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; var x=c.getContext('2d'); x.drawImage(im,0,0);
    var d=x.getImageData(0,0,c.width,c.height), p=d.data, W=c.width;
    for(var i=0;i<p.length;i+=4){ var a=alfa(p[i],p[i+1],p[i+2],p,i,(i/4)%W,Math.floor(i/4/W)); if(a<1) p[i+3]=Math.round(255*Math.max(0,a)); }
    if(despues) despues(p,W,c.height);
    x.putImageData(d,0,0); ok(c.toDataURL('image/png')); }; im.onerror=mal; im.src=url; });
}
function _vdCasco(r,g,b,p,i,x,y){ if(y>410) return 0; return _vdVerde(r,g,b,p,i); } // sin las correas que cuelgan bajo el casco
function _vdVerde(r,g,b,p,i){ var m=Math.max(r,b), v=g-m; if(v>0) p[i+1]=m; /* sin borde verdoso */ if(v<=18) return 1; return 1-(v-18)/70; }
function _vdMarino(r,g,b){ var d=Math.sqrt((r-16)*(r-16)+(g-24)*(g-24)+(b-48)*(b-48)); return d<22?0:(d<70?(d-22)/48:1); }
function _vdHuecos(p,W,H){ // huecos encerrados del casco -> interior naranjo oscuro (como en la imagen elegida), nunca la cabeza
  var N=W*H, fuera=new Uint8Array(N), cola=new Int32Array(N), n=0, k;
  function poner(q){ if(!fuera[q]&&p[q*4+3]<250){ fuera[q]=1; cola[n++]=q; } }
  for(k=0;k<W;k++){ poner(k); poner((H-1)*W+k); } for(k=0;k<H;k++){ poner(k*W); poner(k*W+W-1); }
  for(var h=0;h<n;h++){ var q=cola[h], x=q%W; if(x>0) poner(q-1); if(x<W-1) poner(q+1); if(q>=W) poner(q-W); if(q<N-W) poner(q+W); }
  for(q=0;q<N;q++){ var i=q*4; if(!fuera[q]&&p[i+3]<255){ var a=p[i+3]/255; p[i]=Math.round(p[i]*a+176*(1-a)); p[i+1]=Math.round(p[i+1]*a+74*(1-a)); p[i+2]=Math.round(p[i+2]*a+34*(1-a)); p[i+3]=255; } } }
function crearVidrioCapas(el, urlCasco, urlCabeza, geo){
  geo=geo||{};
  return Promise.all([_recortarVidrio(urlCasco,_vdCasco,_vdHuecos),_recortarVidrio(urlCabeza,_vdMarino)]).then(function(r){
  var casco=r[0], cabeza=r[1], u='vd'+Math.random().toString(36).slice(2,6);
  var CX=geo.cx||687, PIV=geo.piv||640, EY=geo.ey||402, EX=geo.ex||[620,752], BY=geo.by||354, MY=geo.my||512;
  var NAR='#ffb27a';
  el.innerHTML='<svg viewBox="'+(geo.vb||'430 40 516 640')+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible">'
   +'<defs><clipPath id="'+u+'f"><path d="'+(geo.frente||'M478 768 L478 410 L524 410 L524 297 L850 297 L850 410 L897 410 L897 768 Z')+'"/></clipPath>'
   +'<radialGradient id="'+u+'l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>'
   +'<filter id="'+u+'g" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="5" result="x"/><feMerge><feMergeNode in="x"/><feMergeNode in="x"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
   +'<ellipse id="'+u+'sombra" cx="'+CX+'" cy="'+(geo.suelo||668)+'" rx="150" ry="12" fill="#000" opacity=".3"/>'
   +'<g id="'+u+'todo">'
   +  '<image href="'+cabeza+'" x="0" y="0" width="1376" height="768"/>'
   +  '<g id="'+u+'casco"><image href="'+casco+'" x="0" y="0" width="1376" height="768"/></g>'
   +  '<g clip-path="url(#'+u+'f)"><image href="'+cabeza+'" x="0" y="0" width="1376" height="768"/>'
   +    '<ellipse id="'+u+'luz" cx="'+CX+'" cy="'+(EY+40)+'" rx="150" ry="170" fill="url(#'+u+'l)" style="mix-blend-mode:screen"/>'
   +    '<g id="'+u+'cara" filter="url(#'+u+'g)" fill="none" stroke="'+NAR+'" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"></g>'
   +  '</g>'
   +'</g>'
   +'</svg>';
  var $=function(id){ return el.querySelector('#'+u+id); };
  var todo=$('todo'), cascoG=$('casco'), cara=$('cara'), luz=$('luz'), sombra=$('sombra');
  var est='reposo', tEst=0, t0=performance.now(), last=t0;
  var ang=0, angObj=0, hy=0, mir=0, mirObj=0, prox=2, parp=0, proxParp=2.5, gestoAnt='', trazo=1, cy=0, cv=0;
  // trazos de cada gesto (líneas de luz): cejas, ojos, boca
  function gesto(nombre, ab, t){
    var g={}, e=EX, h=20;
    g.cejas=[ 'M'+(e[0]-24)+' '+(BY+4)+' Q'+e[0]+' '+(BY-10)+' '+(e[0]+24)+' '+(BY+2), 'M'+(e[1]-24)+' '+(BY+2)+' Q'+e[1]+' '+(BY-10)+' '+(e[1]+24)+' '+(BY+4) ];
    g.ojos=[ 'M'+e[0]+' '+(EY-h)+' L'+e[0]+' '+(EY+h), 'M'+e[1]+' '+(EY-h)+' L'+e[1]+' '+(EY+h) ];
    g.boca='M'+(CX-46)+' '+(MY-6)+' Q'+CX+' '+(MY+24)+' '+(CX+46)+' '+(MY-6);
    if(nombre==='feliz'){ g.ojos=[ 'M'+(e[0]-20)+' '+(EY+6)+' Q'+e[0]+' '+(EY-22)+' '+(e[0]+20)+' '+(EY+6)], g.ojos[1]='M'+(e[1]-20)+' '+(EY+6)+' Q'+e[1]+' '+(EY-22)+' '+(e[1]+20)+' '+(EY+6);
      g.cejas=[ 'M'+(e[0]-24)+' '+(BY-6)+' Q'+e[0]+' '+(BY-22)+' '+(e[0]+24)+' '+(BY-8), 'M'+(e[1]-24)+' '+(BY-8)+' Q'+e[1]+' '+(BY-22)+' '+(e[1]+24)+' '+(BY-6) ];
      g.boca='M'+(CX-54)+' '+(MY-12)+' Q'+CX+' '+(MY+40)+' '+(CX+54)+' '+(MY-12); }
    if(nombre==='sorpresa'){ g.ojos=[ 'M'+e[0]+' '+(EY-32)+' L'+e[0]+' '+(EY+32), 'M'+e[1]+' '+(EY-32)+' L'+e[1]+' '+(EY+32) ];
      g.cejas=[ 'M'+(e[0]-24)+' '+(BY-14)+' Q'+e[0]+' '+(BY-30)+' '+(e[0]+24)+' '+(BY-16), 'M'+(e[1]-24)+' '+(BY-16)+' Q'+e[1]+' '+(BY-30)+' '+(e[1]+24)+' '+(BY-14) ];
      g.boca='M'+CX+' '+(MY-14)+' a16 20 0 1 1 -.1 0 Z'; }
    if(nombre==='dormir'){ g.ojos=[ 'M'+(e[0]-18)+' '+(EY+6)+' Q'+e[0]+' '+(EY+16)+' '+(e[0]+18)+' '+(EY+6), 'M'+(e[1]-18)+' '+(EY+6)+' Q'+e[1]+' '+(EY+16)+' '+(e[1]+18)+' '+(EY+6) ];
      g.cejas=[ 'M'+(e[0]-22)+' '+(BY+10)+' L'+(e[0]+22)+' '+(BY+10), 'M'+(e[1]-22)+' '+(BY+10)+' L'+(e[1]+22)+' '+(BY+10) ];
      g.boca='M'+(CX-22)+' '+(MY+2)+' L'+(CX+22)+' '+(MY+2); }
    if(nombre==='hablar'){ var a=4+ab*26; g.boca='M'+(CX-40)+' '+(MY-4)+' Q'+CX+' '+(MY-4-a*.3)+' '+(CX+40)+' '+(MY-4)+' Q'+CX+' '+(MY+a+10)+' '+(CX-40)+' '+(MY-4)+' Z'; }
    return g; }
  function cuadro(now){
    var dt=Math.min(.05,(now-last)/1000); last=now; var t=(now-t0)/1000, te=t-tEst;
    var ab=0, nombre=est, brillo=.85+.15*Math.sin(t*1.6), objY=0;
    if(est==='hablar'){ ab=Math.abs(Math.sin(te*11))*(.55+.45*Math.sin(te*2.7)); brillo=.95+.35*ab; }
    if(est==='feliz'){ objY=-8*Math.sin(Math.min(1,te/.6)*Math.PI); brillo=1.2; if(te>1.8){ est='reposo'; tEst=t; } }
    if(est==='sorpresa'){ objY=-6; brillo=1.3; if(te>1.6){ est='reposo'; tEst=t; } }
    if(est==='dormir'){ brillo=.35+.12*Math.sin(t*1.1); objY=5+2*Math.sin(t*1.1); angObj=-4; }
    // mirar: giros lentos y suaves (sin rebote): es de vidrio, se mueve con calma
    if(est==='reposo'||est==='hablar'){ prox-=dt; if(prox<0){ var i=Math.floor(Math.random()*5); angObj=[-5,-2.5,0,2.5,5][i]; mirObj=[-1,-.5,0,.5,1][i]; prox=2.2+Math.random()*2.8; } }
    else if(est!=='dormir'){ angObj=0; mirObj=0; }
    ang+=(angObj-ang)*Math.min(1,dt*2.2); mir+=(mirObj-mir)*Math.min(1,dt*2.6);
    hy+=(objY+3*Math.sin(t*1.3)-hy)*Math.min(1,dt*4);
    cv+=((hy-cy)*120-cv*16)*dt; cy+=cv*dt;               // el casco acompaña con un leve retraso
    // al cambiar de gesto, los trazos se borran y se vuelven a dibujar con luz
    var clave=(nombre==='hablar'?'reposo':nombre); if(clave!==gestoAnt){ gestoAnt=clave; trazo=0; }
    trazo=Math.min(1,trazo+dt*2.4);
    // parpadeo: las líneas de los ojos se encogen a un punto de luz y vuelven
    if(nombre==='reposo'||nombre==='hablar'){ proxParp-=dt; if(proxParp<0){ parp=.24; proxParp=2.8+Math.random()*3.4; } }
    var g=gesto(nombre, ab, t), esc=1; if(parp>0){ parp-=dt; esc=Math.max(.08,Math.abs(parp-.12)/.12); }
    var ox=mir*12, s='';
    function linea(d, k){ var L=420; return '<path d="'+d+'" pathLength="'+L+'" stroke-dasharray="'+L+'" stroke-dashoffset="'+(L*(1-Math.max(0,Math.min(1,trazo*1.6-k*.3)))).toFixed(1)+'"/>'; }
    s+='<g transform="translate('+ox.toFixed(1)+' 0)">';
    s+=linea(g.cejas[0],0)+linea(g.cejas[1],0);
    s+='<g transform="translate(0 '+EY+') scale(1 '+esc.toFixed(3)+') translate(0 -'+EY+')">'+linea(g.ojos[0],.5)+linea(g.ojos[1],.5)+'</g>';
    s+=linea(g.boca,1)+'</g>';
    cara.innerHTML=s; cara.setAttribute('opacity',Math.min(1,brillo).toFixed(2));
    luz.setAttribute('opacity',Math.min(1,brillo*.8).toFixed(2)); luz.setAttribute('cx',(CX+ox).toFixed(1));
    todo.setAttribute('transform','translate('+(ang*1.2).toFixed(1)+' '+hy.toFixed(1)+') rotate('+ang.toFixed(2)+' '+CX+' '+PIV+')');
    cascoG.setAttribute('transform','translate(0 '+(cy-hy).toFixed(1)+')');
    sombra.setAttribute('rx',(150-hy).toFixed(0));
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(nm){ est=nm; tEst=(performance.now()-t0)/1000; } };
  });
}
