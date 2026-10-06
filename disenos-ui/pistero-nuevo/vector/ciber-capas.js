/* Androide cyberpunk con capas de Gemini (casco limpio y cabeza de pantalla negra, dibujados por Gemini) + animación digital.
   Marco 1376x768 = el de las imágenes de Gemini. La cara es una pantalla: ojos y boca de líneas de barrido cian, en vector.
   Diferencia con los otros modelos: se mueve "a saltos" (12 cuadros por segundo, como animación limitada de anime),
   la pantalla tiene interferencias (corte horizontal y doble imagen cian/naranja) y parpadea apagándose como un tubo de TV.
   crearCiberCapas(el, urlCasco, urlCabeza) -> Promise<{estado(nombre)}> */
function _recortarCiber(url, alfa, despues){
  return new Promise(function(ok,mal){ var im=new Image(); im.onload=function(){
    var c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; var x=c.getContext('2d'); x.drawImage(im,0,0);
    var d=x.getImageData(0,0,c.width,c.height), p=d.data, W=c.width;
    for(var i=0;i<p.length;i+=4){ var a=alfa(p[i],p[i+1],p[i+2],p,i,(i/4)%W,Math.floor(i/4/W)); if(a<1) p[i+3]=Math.round(255*Math.max(0,a)); }
    if(despues) despues(p,W,c.height);
    x.putImageData(d,0,0); ok(c.toDataURL('image/png')); }; im.onerror=mal; im.src=url; });
}
function _cVerde(r,g,b,p,i){ var m=Math.max(r,b), v=g-m; if(v>6) p[i+1]=Math.round(g-(v-6)*.85); if(v<=18) return 1; return 1-(v-18)/70; }
// casco: sin los brazos que bajan hacia el mentón (solo casco y orejeras)
function _cCasco(r,g,b,p,i,x,y){ if(y>432) return 0; return _cVerde(r,g,b,p,i); }
// cabeza: sin el cuello (corte que sigue el mentón en V de la pantalla)
function _cCabeza(r,g,b,p,i,x,y){ var dx=Math.abs(x-688), lim=dx<52?566:(dx<130?566-(dx-52)*.55:(dx<200?523-(dx-130)*1.1:440)); if(y>lim+Math.max(0,140-dx)*0) return 0; return _cVerde(r,g,b,p,i); }
function _rellenarHuecosCiber(p,W,H){ // huecos encerrados del casco -> interior oscuro (no se ve la cabeza por las ventilaciones)
  var N=W*H, fuera=new Uint8Array(N), cola=new Int32Array(N), n=0, k;
  function poner(q){ if(!fuera[q]&&p[q*4+3]<250){ fuera[q]=1; cola[n++]=q; } }
  for(k=0;k<W;k++){ poner(k); poner((H-1)*W+k); } for(k=0;k<H;k++){ poner(k*W); poner(k*W+W-1); }
  for(var h=0;h<n;h++){ var q=cola[h], x=q%W; if(x>0) poner(q-1); if(x<W-1) poner(q+1); if(q>=W) poner(q-W); if(q<N-W) poner(q+W); }
  for(q=0;q<N;q++){ var i=q*4; if(!fuera[q]&&p[i+3]<255){ var a=p[i+3]/255; p[i]=Math.round(p[i]*a+14*(1-a)); p[i+1]=Math.round(p[i+1]*a+16*(1-a)); p[i+2]=Math.round(p[i+2]*a+20*(1-a)); p[i+3]=255; } } }
function crearCiberCapas(el, urlCasco, urlCabeza){
  return Promise.all([_recortarCiber(urlCasco,_cCasco,_rellenarHuecosCiber),_recortarCiber(urlCabeza,_cCabeza)]).then(function(r){
  var casco=r[0], cabeza=r[1], u='cc'+Math.random().toString(36).slice(2,6);
  var CX=688, PIV=560, EY=372, EX=[612,764], MY=470, CIAN='#46f0ff';
  el.innerHTML='<svg viewBox="440 14 496 640" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible">'
   +'<defs><clipPath id="'+u+'f"><path d="M548 768 L548 300 C600 290 640 288 688 288 C736 288 776 290 828 300 L828 768 Z"/></clipPath>'
   +'<clipPath id="'+u+'p"><path d="M560 300 L816 300 L822 430 C800 500 740 545 688 556 C636 545 576 500 554 430 Z"/></clipPath>'
   +'<filter id="'+u+'g" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="4" result="x"/><feMerge><feMergeNode in="x"/><feMergeNode in="x"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
   +'<pattern id="'+u+'s" width="8" height="7" patternUnits="userSpaceOnUse"><rect width="8" height="4" fill="#fff"/></pattern>'
   +'<mask id="'+u+'m" maskUnits="userSpaceOnUse" x="0" y="0" width="1376" height="768"><rect x="0" y="0" width="1376" height="768" fill="url(#'+u+'s)"/></mask></defs>'
   +'<g id="'+u+'todo">'
   +  '<image href="'+cabeza+'" x="0" y="0" width="1376" height="768"/>'
   +  '<g id="'+u+'casco"><image href="'+casco+'" x="0" y="0" width="1376" height="768"/></g>'
   +  '<g clip-path="url(#'+u+'f)"><image href="'+cabeza+'" x="0" y="0" width="1376" height="768"/>'
   +    '<g clip-path="url(#'+u+'p)"><g id="'+u+'pant"></g></g>'
   +  '</g>'
   +'</g>'
   +'</svg>';
  var $=function(id){ return el.querySelector('#'+u+id); };
  var todo=$('todo'), cascoG=$('casco'), pant=$('pant');
  var est='reposo', tEst=0, t0=performance.now(), cuadroN=-1;
  var pose={x:0,y:0,r:0}, prox=1.2, poseObj={x:0,y:0,r:0}, glitch=0, proxGlitch=2.5, parp=0, proxParp=2.2, mir=0;
  // un ojo = forma rellena de líneas de barrido (máscara de franjas) + brillo
  function forma(d){ return '<path d="'+d+'" fill="'+CIAN+'" mask="url(#'+u+'m)"/>'; }
  function ojoD(x, tipo, alto){ var w=30, h=26*alto;
    if(tipo==='feliz') return 'M'+(x-34)+' '+(EY+10)+' L'+x+' '+(EY-18)+' L'+(x+34)+' '+(EY+10)+' L'+(x+34)+' '+(EY+22)+' L'+x+' '+(EY-6)+' L'+(x-34)+' '+(EY+22)+' Z';
    if(tipo==='dormir') return 'M'+(x-30)+' '+(EY+6)+' H'+(x+30)+' V'+(EY+12)+' H'+(x-30)+' Z';
    if(tipo==='grande'){ w=38; h=36; }
    if(h<4) return 'M'+(x-w-6)+' '+(EY-2)+' H'+(x+w+6)+' V'+(EY+3)+' H'+(x-w-6)+' Z'; // se apaga en una línea, como un tubo de TV
    return 'M'+(x-w)+' '+EY+' A'+w+' '+h+' 0 1 1 '+(x+w)+' '+EY+' A'+w+' '+h+' 0 1 1 '+(x-w)+' '+EY+' Z'
      +' M'+(x-w-16)+' '+(EY-h*.55)+' L'+(x-w-6)+' '+EY+' L'+(x-w-16)+' '+(EY+h*.55)+' L'+(x-w-11)+' '+(EY+h*.55)+' L'+(x-w-1)+' '+EY+' L'+(x-w-11)+' '+(EY-h*.55)+' Z'
      +' M'+(x+w+16)+' '+(EY-h*.55)+' L'+(x+w+6)+' '+EY+' L'+(x+w+16)+' '+(EY+h*.55)+' L'+(x+w+11)+' '+(EY+h*.55)+' L'+(x+w+1)+' '+EY+' L'+(x+w+11)+' '+(EY-h*.55)+' Z'; }
  function bocaD(tipo, t){ var w=62;
    if(tipo==='onda'){ var s='M'+(CX-w)+' '+MY, k; for(k=0;k<=16;k++){ var xx=CX-w+k*w/8, a=(1-Math.pow((k-8)/8,2))*(10+16*Math.abs(Math.sin(t*9+k*.9))); s+=' L'+xx.toFixed(1)+' '+(MY-a).toFixed(1); }
      for(k=16;k>=0;k--){ var xx2=CX-w+k*w/8, a2=(1-Math.pow((k-8)/8,2))*(10+16*Math.abs(Math.sin(t*9+k*.9+.4))); s+=' L'+xx2.toFixed(1)+' '+(MY+a2).toFixed(1); } return s+' Z'; }
    if(tipo==='o') return 'M'+(CX-22)+' '+MY+' A22 26 0 1 1 '+(CX+22)+' '+MY+' A22 26 0 1 1 '+(CX-22)+' '+MY+' Z M'+(CX-12)+' '+MY+' A12 15 0 1 0 '+(CX+12)+' '+MY+' A12 15 0 1 0 '+(CX-12)+' '+MY+' Z';
    if(tipo==='linea') return 'M'+(CX-24)+' '+(MY-2)+' H'+(CX+24)+' V'+(MY+4)+' H'+(CX-24)+' Z';
    return 'M'+(CX-w)+' '+(MY-16)+' Q'+CX+' '+(MY+46)+' '+(CX+w)+' '+(MY-16)+' L'+(CX+w-12)+' '+(MY-6)+' Q'+CX+' '+(MY+16)+' '+(CX-w+12)+' '+(MY-6)+' Z'; } // sonrisa
  function cuadro(now){
    var t=(now-t0)/1000, te=t-tEst, n=Math.floor(t*12);
    if(n!==cuadroN){ cuadroN=n; var dt=1/12; // todo cambia a 12 cuadros por segundo: movimiento a saltos
      var tipoOjo='normal', tipoBoca='sonrisa', alto=1, brillo=1;
      if(est==='hablar') tipoBoca='onda';
      if(est==='feliz'){ tipoOjo='feliz'; poseObj={x:0,y:(Math.floor(te*6)%2? -8:4),r:0}; if(te>1.6){ est='reposo'; tEst=t; } }
      if(est==='sorpresa'){ tipoOjo='grande'; tipoBoca='o'; poseObj={x:0,y:-10,r:0}; if(te<.25) glitch=.2; if(te>1.5){ est='reposo'; tEst=t; } }
      if(est==='dormir'){ tipoOjo='dormir'; tipoBoca='linea'; brillo=.35+.25*(Math.floor(t*2)%2); poseObj={x:0,y:8,r:-3}; }
      if(est==='reposo'||est==='hablar'){ prox-=dt; if(prox<0){ var i=Math.floor(Math.random()*5); poseObj={x:[-10,-5,0,5,10][i],y:0,r:[-4,-2,0,2,4][i]}; mir=[-1,-.5,0,.5,1][i]; prox=1.3+Math.random()*2.2; } }
      else mir=0;
      // la pose salta directo a la nueva (con un cuadro intermedio), como animación limitada
      pose.x+=(poseObj.x-pose.x)*.6; pose.y+=(poseObj.y-pose.y)*.6; pose.r+=(poseObj.r-pose.r)*.6;
      if(tipoOjo==='normal'){ proxParp-=dt; if(proxParp<0){ parp=3; proxParp=2.4+Math.random()*3; } }
      if(parp>0){ alto=[.04,.3,.04][3-parp]; parp--; }
      proxGlitch-=dt; if(proxGlitch<0){ glitch=.18; proxGlitch=3+Math.random()*4; }
      var gl=glitch>0; glitch-=dt;
      var ojos=ojoD(EX[0]+mir*12,tipoOjo,alto)+' '+ojoD(EX[1]+mir*12,tipoOjo,alto), boca=bocaD(tipoBoca,t);
      var cara='<g filter="url(#'+u+'g)" opacity="'+brillo.toFixed(2)+'">'+forma(ojos)+forma(boca)+'</g>';
      if(gl){ var dy=Math.round(Math.random()*60)-30; // interferencia: doble imagen naranja/cian y un corte corrido
        cara='<g opacity=".55" transform="translate(-7 0)">'+forma(ojos).replace(CIAN,'#ff7a1a')+forma(boca).replace(CIAN,'#ff7a1a')+'</g>'+cara
          +'<rect x="548" y="'+(EY+dy)+'" width="280" height="6" fill="'+CIAN+'" opacity=".5"/>'; }
      if(est==='dormir') cara+='<rect x="548" y="'+(300+((t*60)%260)).toFixed(0)+'" width="280" height="10" fill="'+CIAN+'" opacity=".12"/>';
      pant.innerHTML=cara;
      todo.setAttribute('transform','translate('+(pose.x+(gl?4:0)).toFixed(1)+' '+pose.y.toFixed(1)+') rotate('+pose.r.toFixed(2)+' '+CX+' '+PIV+')');
      cascoG.setAttribute('transform',gl?'translate(-3 0)':'');
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(nm){ est=nm; tEst=(performance.now()-t0)/1000; } };
  });
}
