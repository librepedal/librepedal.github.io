/* COPIA de feature/armario-piezas:disenos-ui/pistero-nuevo/vector/slime-capas.js (Inty: "sigue") +
   EXTENSIÓN PARA EL SOBREVUELO (2026-10-07), marcada SOBREVUELO: estados persistentes 'r:<estado>' (los 12 de
   EXPRESIONES-PERSONAJES.md) en el lenguaje del Slime: gelatina con resortes (tiembla, se aplasta, se derrite, se
   ladea con inercia), ojos de cuenta y boca con lengua. No cambia los 5 estados originales. Para fusionar en su rama.
   Slime con capas de Gemini (casco y cuerpo de gelatina dibujados por Gemini) + animación de gelatina.
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
   +'<g id="'+u+'extra"></g>'
   +'</svg>';
  var $=function(id){ return el.querySelector('#'+u+id); };
  var extraG=$('extra'), frente=$('frente'), cuerpo=$('cuerpo'), cascoG=$('casco'), cara=$('cara'), ojoI=$('ojoI'), ojoD=$('ojoD'), boca=$('boca'), lengua=$('lengua'), sombra=$('sombra');
  var est='reposo', tEst=0, t0=performance.now(), last=t0;
  // resortes poco amortiguados = gelatina (tiembla y se asienta)
  var sy=1, vy=0, sx=1, vx=0, by=0, bv=0, cy=0, cv=0, ladeo=0, lv=0, mx=0, mxObj=0, ultMx=0, prox=2+Math.random()*2, parp=0, proxParp=1.5;
  // SOBREVUELO: cejas oscuras (dir>0 = preocupado, sube al centro; dir<0 = enojado, baja al centro) y párpado de gelatina
  function ceja(x,i,dir){ var adentro=i?x-34:x+34, afuera=i?x+34:x-34, yA=EY-58+(dir>0?-14:16), yF=EY-58+(dir>0?8:-10);
    return '<path d="M'+afuera+' '+yF+' L'+adentro+' '+yA+'" fill="none" stroke="#1a0c0a" stroke-width="13" stroke-linecap="round"/>'; }
  function parpado(x,esc,k){ k=k||0; var ry=40*esc; return '<path d="M'+(x-46)+' '+(EY-ry-10)+' L'+(x+46)+' '+(EY-ry-10)+' L'+(x+46)+' '+(EY-4+k)+' Q'+x+' '+(EY+6+k)+' '+(x-46)+' '+(EY-4+k)+' Z" fill="#e57a2c"/><path d="M'+(x-40)+' '+(EY-4+k)+' Q'+x+' '+(EY+6+k)+' '+(x+40)+' '+(EY-4+k)+'" fill="none" stroke="#1a0c0a" stroke-width="9" stroke-linecap="round"/>'; }
  function ojo(x, esc, forma){
    if(forma==='feliz') return '<path d="M'+(x-32)+' '+(EY+12)+' Q'+x+' '+(EY-34)+' '+(x+32)+' '+(EY+12)+'" fill="none" stroke="#1a0c0a" stroke-width="15" stroke-linecap="round"/>';
    if(forma==='cerrado') return '<path d="M'+(x-32)+' '+(EY+4)+' Q'+x+' '+(EY+26)+' '+(x+32)+' '+(EY+4)+'" fill="none" stroke="#1a0c0a" stroke-width="13" stroke-linecap="round"/>';
    var rx=36*Math.max(1,Math.min(1.25,esc)), ry=40*esc;
    return '<ellipse cx="'+x+'" cy="'+EY+'" rx="'+(rx+7).toFixed(1)+'" ry="'+(ry+7).toFixed(1)+'" fill="#ffd2a8" opacity=".55"/>'
      +'<ellipse cx="'+x+'" cy="'+EY+'" rx="'+rx.toFixed(1)+'" ry="'+ry.toFixed(1)+'" fill="url(#'+u+'o)"/>'
      +(ry>12?'<ellipse cx="'+(x+11)+'" cy="'+(EY-14*esc).toFixed(1)+'" rx="11" ry="'+(10*Math.min(1,esc)).toFixed(1)+'" fill="#fff"/><circle cx="'+(x-13)+'" cy="'+(EY+16*esc).toFixed(1)+'" r="4.5" fill="#fff" opacity=".7"/>':''); }
  // SOBREVUELO: wj = ancho de la boca (jadeo / asombro = boca angosta y alta, no sonrisa)
  function bocaD(ab, son, wj){ var w=wj||40;
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
    // ===== SOBREVUELO: estados persistentes según la ruta =====
    var jadeo=false, lidK=0, cejaD=0, lid=false, guinoD=false, extra='', filtro='', vib=0, mirarArriba=0;
    if(est.indexOf('r:')===0){ var re=est.slice(2), rebote=function(f,h){ var ph=(te*f)%1; return ph<.18?{sy:.86,y:0}:(ph<.5?{sy:1.08,y:-h*Math.sin(Math.PI*(ph-.18)/.32)}:{sy:1,y:0}); };
      if(re==='contento'){ var rb=rebote(1.1,34); objSy=rb.sy; objY=rb.y; forma='feliz'; son=1.3; }
      if(re==='guino'){ guinoD=true; son=1.2; mxObj=8; }
      if(re==='preocupado'){ cejaD=1; ojoEsc=.88; son=-.6; objSy=.94+.01*Math.sin(t*14); mxObj=10; }
      if(re==='cansado'){ jadeo=true; lid=true; ab=.45+.25*Math.abs(Math.sin(te*2.4)); son=.2; objSy=.88+.02*Math.sin(te*2.4); extra='sudor'; }
      if(re==='enojado'){ cejaD=-1; son=-.35; objSy=1.02; vib=2.2; filtro='saturate(1.35) hue-rotate(-12deg)'; }
      if(re==='agotado'){ jadeo=true; lid=true; lidK=14; ojoEsc=.9; ab=.95; son=.1; objSy=.78+.02*Math.sin(te*2); filtro='saturate(1.25) hue-rotate(-16deg) brightness(.82)'; extra='gotas'; }
      if(re==='emocionado'){ var rb2=rebote(1.7,26); objSy=rb2.sy; objY=rb2.y; forma='feliz'; ab=.55; son=1.2; }
      if(re==='adrenalina'){ ojoEsc=1.3; ab=1; son=.9; objSy=1.06; vib=1.2; extra='viento'; }
      if(re==='sorprendido'){ jadeo=true; ojoEsc=1.3; ab=.7; son=0; objSy=1.08; }
      if(re==='orgulloso'){ forma='feliz'; son=1.5; objSy=1.1+.015*Math.sin(t*3); filtro='brightness(1.12) saturate(1.1)'; extra='destellos'; }
      if(re==='pensando'){ mxObj=-12; mirarArriba=1; son=.15; extra='puntos'; }
      if(re!=='guino'&&re!=='preocupado'&&re!=='pensando') mxObj=0;
    }
    if(est==='reposo'||est==='hablar'||est==='r:feliz'){ prox-=dt; if(prox<0){ mxObj=[-14,-8,0,0,8,14][Math.floor(Math.random()*6)]; prox=1.8+Math.random()*2.6; } } else if(est.indexOf('r:')!==0) mxObj=0;
    mx+=(mxObj-mx)*Math.min(1,dt*9);
    // al mirar a un lado la gelatina se ladea al revés y tiembla (inercia)
    lv+=(mx-ultMx)*-60; ultMx=mx; lv+=(-ladeo*170-lv*7)*dt; ladeo+=lv*dt;
    // resortes de gelatina: rígidos y poco amortiguados
    vy+=((objSy-sy)*260-vy*9)*dt; sy+=vy*dt;
    var objSx=1/Math.sqrt(Math.max(.5,sy)); vx+=((objSx-sx)*260-vx*9)*dt; sx+=vx*dt;
    bv+=((objY-by)*320-bv*22)*dt; by+=bv*dt;
    if(forma==='normal'&&!lid&&!guinoD){ proxParp-=dt; if(proxParp<0){ parp=.15; proxParp=2.4+Math.random()*3; } }
    if(parp>0){ parp-=dt; ojoEsc*=Math.max(.06,Math.abs(parp-.075)/.075); }
    var RIM=300, tc=-(SUELO-RIM)*(sy-1)+by;            // cuánto se movió la gelatina a la altura del borde del casco
    cv+=((tc-cy)*520-cv*26)*dt; cy+=cv*dt; cy=tc+Math.max(-7,Math.min(7,cy-tc)); // la sigue con retraso, sin despegarse
    var lad2=ladeo+(vib?Math.sin(t*55)*vib:0)+(extra==='viento'?-7:0);
    var tr='translate(0 '+by.toFixed(1)+') translate('+CX+' '+SUELO+') skewX('+lad2.toFixed(2)+') scale('+sx.toFixed(3)+' '+sy.toFixed(3)+') translate(-'+CX+' -'+SUELO+')';
    cuerpo.setAttribute('transform',tr); frente.setAttribute('transform',tr);
    if(cuerpo.style.filter!==filtro){ cuerpo.style.filter=filtro; frente.style.filter=filtro; } // SOBREVUELO: tinte de la gelatina
    var corrX=-Math.tan(ladeo*Math.PI/180)*(SUELO-300)*sy;
    cascoG.setAttribute('transform','translate('+corrX.toFixed(1)+' '+cy.toFixed(1)+') rotate('+(-ladeo*.4+mx*.15).toFixed(2)+' '+CX+' 300) translate('+CX+' 300) scale('+Math.sqrt(sx).toFixed(3)+' 1) translate(-'+CX+' -300)');
    cara.setAttribute('transform','translate('+(mx*2.6).toFixed(1)+' '+(Math.abs(mx)*.3-mirarArriba*12).toFixed(1)+')');
    sombra.setAttribute('rx',(300*sx*(1+by/400)).toFixed(0)); sombra.setAttribute('opacity',(.4*(1+by/300)).toFixed(2));
    // SOBREVUELO: guiño, párpados y cejas encima de los ojos de cuenta
    ojoI.innerHTML=ojo(EX[0],ojoEsc,forma)+(lid?parpado(EX[0],ojoEsc,lidK):'')+(cejaD?ceja(EX[0],0,cejaD):'');
    ojoD.innerHTML=(guinoD?ojo(EX[1],1,'feliz'):ojo(EX[1],ojoEsc,forma))+(lid?parpado(EX[1],ojoEsc,lidK):'')+(cejaD?ceja(EX[1],1,cejaD):'');
    var ex='';
    if(extra==='sudor'){ var ph=(te*.8)%1; ex='<path d="M'+(CX+175)+' '+(EY-70+ph*150)+' q16 26 0 40 q-16 -14 0 -40z" fill="#fff4e8" opacity="'+(.9*(1-ph)).toFixed(2)+'"/>'; }
    if(extra==='gotas'){ [0,.45].forEach(function(o,k){ var p2=((te*.6)+o)%1, gx=CX+(k?-170:190); ex+='<ellipse cx="'+gx+'" cy="'+(SUELO-10+p2*60).toFixed(0)+'" rx="'+(16-8*p2).toFixed(1)+'" ry="'+(22-6*p2).toFixed(1)+'" fill="#d9611f" opacity="'+(1-p2).toFixed(2)+'"/>'; }); }
    if(extra==='viento'){ for(var k3=0;k3<4;k3++){ var p3=((te*2.4)+k3*.25)%1; ex+='<rect x="'+(CX+120+p3*110).toFixed(0)+'" y="'+(EY-120+k3*62)+'" width="120" height="13" rx="6" fill="#fff" opacity="'+(.75*(1-p3)).toFixed(2)+'"/>'; } }
    if(extra==='destellos'){ [[CX-185,EY-150],[CX+185,EY-120],[CX+170,MY+70]].forEach(function(q,k4){ var e3=.5+.5*Math.sin(te*5+k4*2); ex+='<path transform="translate('+q[0]+' '+q[1]+') scale('+(.7+.7*e3).toFixed(2)+')" d="M0 -38 L10 -10 L38 0 L10 10 L0 38 L-10 10 L-38 0 L-10 -10 Z" fill="#ffd84d"/>'; }); }
    if(extra==='puntos'){ for(var k5=0;k5<3;k5++) if(Math.floor(te*2.5)%4>k5) ex+='<circle cx="'+(CX+110+k5*44)+'" cy="'+(EY-110-k5*22)+'" r="'+(13+k5*4)+'" fill="#1a0c0a"/>'; }
    extraG.innerHTML=ex;
    var bo=bocaD(ab,son,jadeo?22:0); boca.setAttribute('d',bo.b); lengua.setAttribute('d',bo.l);
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(n){ est=n; tEst=(performance.now()-t0)/1000; },
           estadoRuta:function(n){ var e='r:'+n; if(est!==e){ est=e; tEst=(performance.now()-t0)/1000; } }, svg:el.querySelector('svg') }; // SOBREVUELO
  });
}
