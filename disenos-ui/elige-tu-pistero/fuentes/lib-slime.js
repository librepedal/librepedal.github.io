
/* Slime con capas de Gemini (casco y cuerpo de gelatina dibujados por Gemini) + animación de gelatina.
   Marco 1376x768 = el de las imágenes de Gemini. El casco se recorta del fondo verde y el cuerpo del fondo
   azul marino, en el navegador. Cara en vector (ojos de cuenta brillantes y boca) para hablar y cambiar de expresión.
   Diferencia con el orbe: el cuerpo es un resorte poco amortiguado (tiembla y se asienta), se apoya en el suelo
   y el casco se hunde/rebota con la coronilla de la gelatina.
   crearSlimeCapas(el, urlCasco, urlCuerpo) -> Promise<{estado(nombre)}> */
function _recortarFondo(url, esFondo, despues){
  return new Promise(function(ok,mal){ var im=new Image(); im.onload=function(){
    var c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; var x=c.getContext('2d'); x.drawImage(im,0,0);
    var d=x.getImageData(0,0,c.width,c.height), p=d.data;
    for(var i=0;i<p.length;i+=4){ var a=esFondo(p[i],p[i+1],p[i+2],p,i); if(a<1) p[i+3]=Math.round(255*Math.max(0,a)); }
    if(despues) despues(p,c.width,c.height);
    x.putImageData(d,0,0); ok(c.toDataURL('image/png')); }; im.onerror=mal; im.src=url; });
}
function _sinVerde(r,g,b,p,i){ var m=Math.max(r,b), v=g-m; if(v<=18) return 1; p[i+1]=m; return 1-(v-18)/70; }
function _sinMarino(r,g,b){ // fondo ~ (22,30,64); la gelatina es naranja: distancia de color al fondo
  var d=Math.sqrt((r-22)*(r-22)+(g-30)*(g-30)+(b-64)*(b-64)); return d<26?0:(d<70?(d-26)/44:1); }
function _rellenarVentilacionesSlime(p,W,H){ // inundación desde los bordes: lo transparente conectado al borde es fondo; lo demás, hueco del casco
  var N=W*H, fuera=new Uint8Array(N), cola=new Int32Array(N), n=0, k;
  function poner(q){ if(!fuera[q]&&p[q*4+3]<250){ fuera[q]=1; cola[n++]=q; } }
  for(k=0;k<W;k++){ poner(k); poner((H-1)*W+k); } for(k=0;k<H;k++){ poner(k*W); poner(k*W+W-1); }
  for(var h=0;h<n;h++){ var q=cola[h], x=q%W; if(x>0) poner(q-1); if(x<W-1) poner(q+1); if(q>=W) poner(q-W); if(q<N-W) poner(q+W); }
  for(q=0;q<N;q++){ var i=q*4; if(!fuera[q]&&p[i+3]<255){ var a=p[i+3]/255; p[i]=Math.round(p[i]*a+34*(1-a)); p[i+1]=Math.round(p[i+1]*a+31*(1-a)); p[i+2]=Math.round(p[i+2]*a+33*(1-a)); p[i+3]=255; } } }
function crearSlimeCapas(el, urlCasco, urlCuerpo){
  return Promise.all([_recortarFondo(urlCasco,_sinVerde,_rellenarVentilacionesSlime),_recortarFondo(urlCuerpo,_sinMarino)]).then(function(r){
  var casco=r[0], cuerpoImg=r[1], u='sc'+Math.random().toString(36).slice(2,6);
  var CX=688, SUELO=678, TOPE=132;     // eje, base y coronilla de la gelatina (medidos sobre la imagen)
  var EY=382, EX=[578,797], MY=458;    // ojos y boca (de la imagen de referencia aprobada)
  el.innerHTML='<svg viewBox="318 40 740 700" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible">'
   +'<defs><clipPath id="'+u+'f"><path id="'+u+'fp" d="M336 768 L336 430 L448 354 C502 316 590 296 688 295 C786 296 874 316 928 354 L1040 430 L1040 768 Z"/></clipPath>'
   +'<radialGradient id="'+u+'o" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#3a2a26"/><stop offset=".7" stop-color="#160d0c"/><stop offset="1" stop-color="#0a0606"/></radialGradient></defs>'
   +'<ellipse id="'+u+'sombra" cx="'+CX+'" cy="'+(SUELO+6)+'" rx="300" ry="20" fill="#000" opacity=".4"/>'
   +'<g id="'+u+'cuerpo"><image href="'+cuerpoImg+'" x="0" y="0" width="1376" height="768"/></g>'
   +'<g id="'+u+'casco"><image href="'+casco+'" x="0" y="0" width="1376" height="768"/></g>'
   +'<g id="'+u+'frente" clip-path="url(#'+u+'f)">'
   +  '<image href="'+cuerpoImg+'" x="0" y="0" width="1376" height="768"/>'
   +  '<g id="'+u+'cara"><g id="'+u+'ojoI"></g><g id="'+u+'ojoD"></g>'
   +    '<path id="'+u+'boca" d="" fill="#2a0d08" stroke="#2a0d08" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
   +    '<path id="'+u+'lengua" d="" fill="#e0603a"/>'
   +  '</g>'
   +'</g>'
   +'</svg>';
  var $=function(id){ return el.querySelector('#'+u+id); };
  var frente=$('frente'), cuerpo=$('cuerpo'), cascoG=$('casco'), cara=$('cara'), ojoI=$('ojoI'), ojoD=$('ojoD'), boca=$('boca'), lengua=$('lengua'), sombra=$('sombra');
  var est='reposo', tEst=0, t0=performance.now(), last=t0;
  // resortes poco amortiguados = gelatina (tiembla y se asienta)
  var sy=1, vy=0, sx=1, vx=0, by=0, bv=0, cy=0, cv=0, ladeo=0, lv=0, mx=0, mxObj=0, ultMx=0, prox=2+Math.random()*2, parp=0, proxParp=1.5;
  function ojo(x, esc, forma){
    if(forma==='feliz') return '<path d="M'+(x-32)+' '+(EY+12)+' Q'+x+' '+(EY-34)+' '+(x+32)+' '+(EY+12)+'" fill="none" stroke="#1a0c0a" stroke-width="15" stroke-linecap="round"/>';
    if(forma==='cerrado') return '<path d="M'+(x-32)+' '+(EY+4)+' Q'+x+' '+(EY+26)+' '+(x+32)+' '+(EY+4)+'" fill="none" stroke="#1a0c0a" stroke-width="13" stroke-linecap="round"/>';
    var rx=36*Math.max(1,Math.min(1.25,esc)), ry=40*esc;
    return '<ellipse cx="'+x+'" cy="'+EY+'" rx="'+(rx+7).toFixed(1)+'" ry="'+(ry+7).toFixed(1)+'" fill="#ffd2a8" opacity=".55"/>'
      +'<ellipse cx="'+x+'" cy="'+EY+'" rx="'+rx.toFixed(1)+'" ry="'+ry.toFixed(1)+'" fill="url(#'+u+'o)"/>'
      +(ry>12?'<ellipse cx="'+(x+11)+'" cy="'+(EY-14*esc).toFixed(1)+'" rx="11" ry="'+(10*Math.min(1,esc)).toFixed(1)+'" fill="#fff"/><circle cx="'+(x-13)+'" cy="'+(EY+16*esc).toFixed(1)+'" r="4.5" fill="#fff" opacity=".7"/>':''); }
  function bocaD(ab, son){ var w=40;
    if(ab<.05) return {b:'M'+(CX-w)+' '+(MY-4)+' Q'+CX+' '+(MY+30*son)+' '+(CX+w)+' '+(MY-4)+' Q'+CX+' '+(MY+6*son)+' '+(CX-w)+' '+(MY-4)+' Z', l:''};
    var h=12+ab*40;
    return {b:'M'+(CX-w)+' '+(MY-6)+' Q'+CX+' '+(MY-12)+' '+(CX+w)+' '+(MY-6)+' Q'+(CX+w*.6)+' '+(MY+h)+' '+CX+' '+(MY+h)+' Q'+(CX-w*.6)+' '+(MY+h)+' '+(CX-w)+' '+(MY-6)+' Z',
            l:'M'+(CX-w*.45)+' '+(MY+h*.72)+' Q'+CX+' '+(MY+h*.35)+' '+(CX+w*.45)+' '+(MY+h*.72)+' Q'+CX+' '+(MY+h*.98)+' '+(CX-w*.45)+' '+(MY+h*.72)+' Z'}; }
  function cuadro(now){
    var dt=Math.min(.033,(now-last)/1000); last=now; var t=(now-t0)/1000, te=t-tEst;
    var objY=0, objSy=1+.022*Math.sin(t*1.9), ab=0, son=1, ojoEsc=1, forma='normal';
    if(est==='hablar'){ var s=Math.abs(Math.sin(te*12))*(.5+.5*Math.sin(te*2.9)); ab=s; objSy+=.035*s; }
    if(est==='feliz'){ // se aplasta, salta estirado, cae y tiembla
      if(te<.2) objSy=.83;
      else if(te<.55){ objSy=1.12; objY=-80*Math.sin(Math.PI*(te-.2)/.35); }
      else if(te<.62) objSy=.82;
      forma='feliz'; son=1.3; if(te>1.9){ est='reposo'; tEst=t; } }
    if(est==='sorpresa'){ objSy=te<.1?.92:1.08; ojoEsc=te<.1?1:1.3; ab=te<.1?0:.6; son=0; if(te>1.5){ est='reposo'; tEst=t; } }
    if(est==='dormir'){ objSy=.93+.03*Math.sin(t*1.1); forma='cerrado'; son=.4; }
    if(est==='reposo'||est==='hablar'){ prox-=dt; if(prox<0){ mxObj=[-14,-8,0,0,8,14][Math.floor(Math.random()*6)]; prox=1.8+Math.random()*2.6; } } else mxObj=0;
    mx+=(mxObj-mx)*Math.min(1,dt*9);
    // al mirar a un lado la gelatina se ladea al revés y tiembla (inercia)
    lv+=(mx-ultMx)*-60; ultMx=mx; lv+=(-ladeo*170-lv*7)*dt; ladeo+=lv*dt;
    // resortes de gelatina: rígidos y poco amortiguados
    vy+=((objSy-sy)*260-vy*9)*dt; sy+=vy*dt;
    var objSx=1/Math.sqrt(Math.max(.5,sy)); vx+=((objSx-sx)*260-vx*9)*dt; sx+=vx*dt;
    bv+=((objY-by)*320-bv*22)*dt; by+=bv*dt;
    if(forma==='normal'){ proxParp-=dt; if(proxParp<0){ parp=.15; proxParp=2.4+Math.random()*3; } }
    if(parp>0){ parp-=dt; ojoEsc*=Math.max(.06,Math.abs(parp-.075)/.075); }
    var RIM=300, tc=-(SUELO-RIM)*(sy-1)+by;            // cuánto se movió la gelatina a la altura del borde del casco
    cv+=((tc-cy)*520-cv*26)*dt; cy+=cv*dt; cy=tc+Math.max(-7,Math.min(7,cy-tc)); // la sigue con retraso, sin despegarse
    var tr='translate(0 '+by.toFixed(1)+') translate('+CX+' '+SUELO+') skewX('+ladeo.toFixed(2)+') scale('+sx.toFixed(3)+' '+sy.toFixed(3)+') translate(-'+CX+' -'+SUELO+')';
    cuerpo.setAttribute('transform',tr); frente.setAttribute('transform',tr);
    var corrX=-Math.tan(ladeo*Math.PI/180)*(SUELO-300)*sy;
    cascoG.setAttribute('transform','translate('+corrX.toFixed(1)+' '+cy.toFixed(1)+') rotate('+(-ladeo*.4+mx*.15).toFixed(2)+' '+CX+' 300) translate('+CX+' 300) scale('+Math.sqrt(sx).toFixed(3)+' 1) translate(-'+CX+' -300)');
    cara.setAttribute('transform','translate('+(mx*2.6).toFixed(1)+' '+(Math.abs(mx)*.3).toFixed(1)+')');
    sombra.setAttribute('rx',(300*sx*(1+by/400)).toFixed(0)); sombra.setAttribute('opacity',(.4*(1+by/300)).toFixed(2));
    ojoI.innerHTML=ojo(EX[0],ojoEsc,forma); ojoD.innerHTML=ojo(EX[1],ojoEsc,forma);
    var bo=bocaD(ab,son); boca.setAttribute('d',bo.b); lengua.setAttribute('d',bo.l);
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(n){ est=n; tEst=(performance.now()-t0)/1000; } };
  });
}

