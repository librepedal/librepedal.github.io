/* COPIA de feature/armario-piezas:disenos-ui/pistero-nuevo/vector/orbe-capas.js (movimiento aprobado por Inty) +
   EXTENSIÓN PARA EL SOBREVUELO (2026-10-07), marcada "SOBREVUELO": estados persistentes 'r:<estado>' (los 12 de
   EXPRESIONES-PERSONAJES.md) en el lenguaje del Orbe: cuerpo elástico (aplastar/estirar), saltitos, halo que respira y
   cambia de color, cara de luz. No cambia los 5 estados originales. Para fusionar en su rama.
   Orbe con capas de Gemini (casco y orbe dibujados por Gemini) + la animación que aprobó Inty.
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
   +'<defs><radialGradient id="'+u+'h" cx=".5" cy=".5" r=".5"><stop id="'+u+'h1" offset=".6" stop-color="#fc4c02" stop-opacity=".5"/><stop id="'+u+'h2" offset="1" stop-color="#fc4c02" stop-opacity="0"/></radialGradient>'
   +'<clipPath id="'+u+'c"><circle cx="512" cy="512" r="338"/></clipPath>'+'<clipPath id="'+u+'f"><path d="M120 690 C210 575 360 548 522 548 C684 548 834 575 924 690 L924 1024 L120 1024 Z"/></clipPath>'
   +'<filter id="'+u+'b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="x"/><feMerge><feMergeNode in="x"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
   +'<ellipse id="'+u+'sombra" cx="'+CX+'" cy="990" rx="230" ry="22" fill="#000" opacity=".35"/>'
   +'<g id="'+u+'cuerpo">'
   +  '<circle id="'+u+'halo" cx="'+CX+'" cy="'+CY+'" r="'+(R*1.45)+'" fill="url(#'+u+'h)"/>'
   +  '<g transform="translate('+CX+' '+CY+') scale('+(R/338).toFixed(4)+') translate(-512 -512)"><image href="'+urlOrbe+'" x="0" y="0" width="1024" height="1024" clip-path="url(#'+u+'c)"/></g>'
   +  '<circle id="'+u+'tinte" cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="#ff2d2d" opacity="0" style="mix-blend-mode:multiply"/>'
   +'</g>'
   +'<g id="'+u+'casco"><image href="'+casco+'" x="0" y="0" width="1024" height="1024"/></g>'
   +'<g id="'+u+'frente" clip-path="url(#'+u+'f)">'
   +  '<g transform="translate('+CX+' '+CY+') scale('+(R/338).toFixed(4)+') translate(-512 -512)"><image href="'+urlOrbe+'" x="0" y="0" width="1024" height="1024" clip-path="url(#'+u+'c)"/></g>'
   +  '<circle id="'+u+'tinte2" cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="#ff2d2d" opacity="0" style="mix-blend-mode:multiply"/>' // SOBREVUELO: tinte también en el frente
   +  '<g id="'+u+'cara" filter="url(#'+u+'b)" fill="#fffaf0" stroke="#fffaf0">'
   +    '<g id="'+u+'ojoI"></g><g id="'+u+'ojoD"></g>'
   +    '<path id="'+u+'boca" d="" fill="none" stroke-width="17" stroke-linecap="round"/>'
   +  '</g>'
   +'</g>'
   +'<g id="'+u+'extra" fill="#fffaf0" filter="url(#'+u+'b)"></g>'
   +'</svg>';
  var $=function(id){ return el.querySelector('#'+u+id); };
  var tinte2=$('tinte2'), tinte=$('tinte'), extraG=$('extra'), h1=$('h1'), h2=$('h2'), frente=$('frente'), cuerpo=$('cuerpo'), cascoG=$('casco'), cara=$('cara'), ojoI=$('ojoI'), ojoD=$('ojoD'), boca=$('boca'), halo=$('halo'), sombra=$('sombra');
  var S=5.12, EY=650, EX=[449,595], MY=722;
  var est='reposo', tEst=0, t0=performance.now(), last=t0;
  var cy=0, cv=0, by=0, sx=1, sy=1, mx=0, mxObj=0, prox=2+Math.random()*2, parp=0, proxParp=1.5;
  // SOBREVUELO: son<0 = boca hacia abajo; wj = ancho (boca chica de jadeo)
  function bocaD(ab, son, wj){ var w=wj||68, c=MY+44*son; if(ab<.05) return 'M'+(CX-w)+' '+MY+' Q'+CX+' '+c+' '+(CX+w)+' '+MY;
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
    // ===== SOBREVUELO: estados persistentes según la ruta =====
    var jadeo=false, haloCol='#fc4c02', tinteO=0, tinteCol='#ff2d2d', extra='', vib=0, guinoD=false, ceja=0;
    if(est.indexOf('r:')===0){ var re=est.slice(2), salto=function(f,h){ var ph=(te*f)%1; return -h*Math.max(0,Math.sin(ph*Math.PI*2)); };
      if(re==='feliz'){ /* respira y mira alrededor (como en reposo) */ }
      if(re==='contento'){ forma='feliz'; son=1.25; objY=salto(1.6,10); haloO=.75; haloK=1.06; }
      if(re==='guino'){ guinoD=true; son=1.2; haloO=.7; mxObj=4; }
      if(re==='preocupado'){ ojoEsc=.8; ceja=1; son=-.45; objSy=.97; objSx=1.02; objY=2; haloO=.35; mxObj=7; }   // cejas muy arriba al centro, boca hacia abajo, se encoge y mira de reojo
      if(re==='cansado'){ jadeo=true; forma='mitad'; ab=.45+.25*Math.abs(Math.sin(te*2.6));   // jadea con la boca abierta (lo que lo separa de preocupado)
         son=0; objSy=.95+.02*Math.sin(te*2.6); objSx=1.04; objY=3; haloO=.42; extra='gota'; }
      if(re==='enojado'){ forma='enojado'; son=-.3; ab=0; vib=2.2; objSy=1.02; objSx=.99; haloCol='#ff3b1f'; haloO=.85; tinteO=.26; }
      if(re==='agotado'){ jadeo=true; forma='caido'; ab=.45+.25*Math.abs(Math.sin(te*2)); son=0; objY=10; objSy=.92+.02*Math.sin(te*2); objSx=1.07; haloCol='#e0301e'; haloO=.25+.15*Math.abs(Math.sin(te*5)); tinteO=.28; extra='gota2'; }
      if(re==='emocionado'){ forma='feliz'; ab=.35; son=1.3; objY=salto(2.4,7); haloO=.85; haloK=1.08; }
      if(re==='adrenalina'){ ojoEsc=1.35; ab=.75; son=1.15; objSx=.94; objSy=1.08; vib=1.2; haloCol='#ffb347'; haloO=.95; haloK=1.18; extra='estela'; }
      if(re==='sorprendido'){ jadeo=true; ojoEsc=1.6; ab=.75; son=0; objY=-6; haloO=.9; }
      if(re==='orgulloso'){ forma='feliz'; son=1.4; objSy=1.05; objSx=.97; objY=salto(.9,6); haloCol='#ffc94d'; haloO=.95; haloK=1.15; extra='destellos'; }
      if(re==='pensando'){ mxObj=-8; ceja=-1; son=.1; haloO=.45+.15*Math.sin(te*1.5); extra='puntos'; }
      if(re!=='feliz' && re!=='guino' && re!=='preocupado' && re!=='pensando') mxObj=0;
    }
    if(est==='reposo'||est==='hablar'||est==='r:feliz'){ prox-=dt; if(prox<0){ mxObj=[-9,-5,0,0,5,9][Math.floor(Math.random()*6)]; prox=1.6+Math.random()*2.6; } } else if(est.indexOf('r:')!==0) mxObj=0;
    mx+=(mxObj-mx)*Math.min(1,dt*7);
    if(forma==='normal'&&!guinoD){ proxParp-=dt; if(proxParp<0){ parp=.14; proxParp=2.2+Math.random()*3; } }
    if(parp>0){ parp-=dt; ojoEsc*=Math.max(.08,Math.abs(parp-.07)/.07); }
    by+=(objY-by)*Math.min(1,dt*18); sx+=(objSx-sx)*Math.min(1,dt*20); sy+=(objSy-sy)*Math.min(1,dt*20);
    var fuerza=(by-cy)*180-cv*14; cv+=fuerza*dt; cy+=cv*dt;
    var base=CY+R, jit=vib?(Math.sin(t*60)*vib):0;
    cuerpo.setAttribute('transform','translate('+(jit*S).toFixed(1)+' '+(by*S).toFixed(1)+') translate('+CX+' '+base+') scale('+sx.toFixed(3)+' '+sy.toFixed(3)+') translate(-'+CX+' -'+base+')');
    frente.setAttribute('transform',cuerpo.getAttribute('transform'));
    var techo=(1-sy)*(2*R);
    cascoG.setAttribute('transform','translate(0 '+((cy*S)+techo).toFixed(1)+') rotate('+(mx*.25).toFixed(2)+' '+CX+' 560)');
    var kc=est.indexOf('r:')===0?1.45:1; // SOBREVUELO: cara 45 % más grande para que se lea en el rostro chico
    cara.setAttribute('transform','translate('+(mx*S).toFixed(1)+' '+(est==='r:pensando'?-14:0)+') translate(0 '+(kc>1?18:0)+') translate('+CX+' '+(EY+20)+') scale('+((1-Math.abs(mx)/60)*kc).toFixed(3)+' '+kc+') translate(-'+CX+' -'+(EY+20)+')');
    h1.setAttribute('stop-color',haloCol); h2.setAttribute('stop-color',haloCol); [tinte,tinte2].forEach(function(tt){ tt.setAttribute('opacity',tinteO.toFixed(2)); tt.setAttribute('fill',tinteCol); });
    var ex='';
    if(extra==='gota'||extra==='gota2'){ [0,.5].slice(0,extra==='gota2'?2:1).forEach(function(o,k){ var ph=((te*.7)+o)%1, gx=CX+(k?-210:205), gy=CY-60+ph*190; ex+='<path d="M'+gx+' '+(gy-20)+' q14 22 0 34 q-14 -12 0 -34z" opacity="'+(1-ph).toFixed(2)+'"/>'; }); }
    if(extra==='estela'){ for(var k5=0;k5<4;k5++){ var ph5=((te*2.2)+k5*.25)%1, ey=CY-160+k5*95; ex+='<rect x="'+(CX-R-60-ph5*160).toFixed(0)+'" y="'+ey+'" width="110" height="12" rx="6" opacity="'+(1-ph5).toFixed(2)+'"/><rect x="'+(CX+R-50+ph5*160).toFixed(0)+'" y="'+(ey+40)+'" width="110" height="12" rx="6" opacity="'+(1-ph5).toFixed(2)+'"/>'; } }
    if(extra==='destellos'){ [[CX-R-30,CY-170],[CX+R+20,CY-120],[CX+R-10,CY+150]].forEach(function(p3,k6){ var e3=.5+.5*Math.sin(te*5+k6*2); ex+='<path transform="translate('+p3[0]+' '+p3[1]+') scale('+(.6+.6*e3).toFixed(2)+')" d="M0 -36 L9 -9 L36 0 L9 9 L0 36 L-9 9 L-36 0 L-9 -9 Z" fill="#ffd84d"/>'; }); }
    if(extra==='puntos'){ for(var k7=0;k7<3;k7++) if(Math.floor(te*2.5)%4>k7) ex+='<circle cx="'+(CX+120+k7*48)+'" cy="'+(EY-120-k7*22)+'" r="'+(12+k7*4)+'"/>'; }
    extraG.innerHTML=ex;
    halo.setAttribute('opacity',haloO.toFixed(2)); halo.setAttribute('r',(R*1.45*haloK).toFixed(0));
    sombra.setAttribute('rx',(230*(1+by/60)).toFixed(0)); sombra.setAttribute('opacity',(.35*(1+by/80)).toFixed(2));
    [ojoI,ojoD].forEach(function(o,i){ var x=EX[i];
      var cj=ceja?'<path d="M'+(x-32)+' '+(EY-40)+' L'+(x+32)+' '+(EY-40+(ceja>0?(i?24:-24):(i?-12:12)))+'" fill="none" stroke-width="16" stroke-linecap="round" transform="'+(i?'':'')+'"/>':'';
      if(guinoD && i===1){ o.innerHTML='<path d="M'+(x-30)+' '+(EY+14)+' Q'+x+' '+(EY-38)+' '+(x+30)+' '+(EY+14)+'" fill="none" stroke-width="17" stroke-linecap="round"/>'; return; }
      if(forma==='mitad'){ o.innerHTML=cj+'<path d="M'+(x-24)+' '+(EY-2)+' L'+(x+24)+' '+(EY-2)+' Q'+(x+24)+' '+(EY+26)+' '+x+' '+(EY+26)+' Q'+(x-24)+' '+(EY+26)+' '+(x-24)+' '+(EY-2)+' Z" stroke="none"/>'; return; }
      if(forma==='caido'){ o.innerHTML='<path d="M'+(x-28)+' '+(EY+10)+' Q'+x+' '+(EY+30)+' '+(x+28)+' '+(EY+10)+'" fill="none" stroke-width="13" stroke-linecap="round"/><path d="M'+(x-24)+' '+(EY-6)+' L'+(x+24)+' '+(EY+6)+'" fill="none" stroke-width="9" stroke-linecap="round" opacity=".7" transform="'+(i?'scale(-1 1) translate('+(-2*x)+' 0)':'')+'"/>'; return; }
      if(forma==='enojado'){ var dir=i?-1:1; o.innerHTML='<path d="M'+(x-24)+' '+(EY-6+dir*-12)+' L'+(x+24)+' '+(EY-6+dir*12)+' L'+(x+24)+' '+(EY+24)+' Q'+x+' '+(EY+34)+' '+(x-24)+' '+(EY+24)+' Z" stroke="none"/>'; return; }
      if(cj && forma==='normal'){ o.innerHTML=cj+'<ellipse cx="'+x+'" cy="'+EY+'" rx="'+(23*ojoEsc).toFixed(1)+'" ry="'+(26*ojoEsc).toFixed(1)+'" stroke="none"/>'; return; }
      if(forma==='feliz') o.innerHTML='<path d="M'+(x-30)+' '+(EY+14)+' Q'+x+' '+(EY-38)+' '+(x+30)+' '+(EY+14)+'" fill="none" stroke-width="17" stroke-linecap="round"/>';
      else if(forma==='cerrado') o.innerHTML='<path d="M'+(x-30)+' '+(EY+4)+' Q'+x+' '+(EY+24)+' '+(x+30)+' '+(EY+4)+'" fill="none" stroke-width="15" stroke-linecap="round"/>';
      else o.innerHTML='<ellipse cx="'+x+'" cy="'+EY+'" rx="'+(23*Math.min(1.5,ojoEsc>1?ojoEsc:1)).toFixed(1)+'" ry="'+(26*ojoEsc).toFixed(1)+'" stroke="none"/>'; });
    // SOBREVUELO: jadeo = boca chica y redonda (no sonrisa)
    boca.setAttribute('d',bocaD(ab,son,jadeo?30:0)); boca.setAttribute('fill',ab>.05?'#fffaf0':'none');
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(n){ est=n; tEst=(performance.now()-t0)/1000; },
           estadoRuta:function(n){ var e='r:'+n; if(est!==e){ est=e; tEst=(performance.now()-t0)/1000; } }, svg:el.querySelector('svg') }; // SOBREVUELO
  });
}
