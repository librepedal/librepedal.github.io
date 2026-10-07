/* COPIA de feature/armario-piezas:disenos-ui/pistero-nuevo/vector/ciber-capas.js (modelo aprobado por Inty) +
   EXTENSIÓN PARA EL SOBREVUELO (2026-10-07), marcada "SOBREVUELO". No cambia los 5 estados originales; agrega
   estados persistentes 'r:<estado>' (los 12 de EXPRESIONES-PERSONAJES.md) en el mismo lenguaje del modelo:
   visor-ranura tipo Gort, boca LED de barrido, 12 cuadros/s, interferencia naranja/cian. Para fusionar en su rama.
   Androide cyberpunk con capas de Gemini (casco limpio y cabeza de pantalla negra, dibujados por Gemini) + animación digital.
   Marco 1376x768 = el de las imágenes de Gemini. La cara es una pantalla: visor de lado a lado y boca de líneas de barrido cian, en vector.
   Diferencia con los otros modelos: se mueve "a saltos" (12 cuadros por segundo, como animación limitada de anime),
   la pantalla tiene interferencias (doble imagen cian/naranja) y parpadea apagándose como un tubo de TV.
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
  function forma(d,col){ return '<path d="'+d+'" fill="'+(col||CIAN)+'" mask="url(#'+u+'m)"/>'; }
  // ojos = un visor de lado a lado (idea de Inty), con Gort de "El día que la Tierra se detuvo" (1951) como referencia:
  // una ranura angosta en una cabeza lisa y UNA luz adentro que se corre al mirar; la ranura se abre al sorprenderse.
  function capsula(x0,x1,y,hh){ hh=Math.max(2.5,hh); return 'M'+(x0+hh)+' '+(y-hh)+' H'+(x1-hh)+' A'+hh+' '+hh+' 0 0 1 '+(x1-hh)+' '+(y+hh)+' H'+(x0+hh)+' A'+hh+' '+hh+' 0 0 1 '+(x0+hh)+' '+(y-hh)+' Z'; }
  function visor(tipo, alto, mir, color, voz){ var x0=CX-106, x1=CX+106, hh=11*alto;
    var capa=function(d,op){ return '<path d="'+d+'" fill="'+color+'"'+(op<1?' opacity="'+op+'"':'')+' mask="url(#'+u+'m)"/>'; };
    if(tipo==='feliz') return capa('M'+x0+' '+(EY+14)+' Q'+CX+' '+(EY-36)+' '+x1+' '+(EY+14)+' L'+x1+' '+(EY+26)+' Q'+CX+' '+(EY-24)+' '+x0+' '+(EY+26)+' Z',1);
    // SOBREVUELO: guiño = mitad izquierda en arco feliz, mitad derecha con la luz normal
    if(tipo==='guino') return capa('M'+x0+' '+(EY+12)+' Q'+(CX-53)+' '+(EY-26)+' '+(CX-8)+' '+(EY+12)+' L'+(CX-8)+' '+(EY+22)+' Q'+(CX-53)+' '+(EY-14)+' '+x0+' '+(EY+22)+' Z',1)+capa(capsula(CX+14,x1,EY+4,hh*.8),1);
    // SOBREVUELO: aprieta = la ranura se quiebra en V hacia el centro (ceño de Gort)
    if(tipo==='enojado'){ var q=8*alto; return capa('M'+x0+' '+(EY-14)+' L'+(CX-10)+' '+(EY+8)+' L'+(CX-10)+' '+(EY+8+2*q)+' L'+x0+' '+(EY-14+2*q)+' Z',1)+capa('M'+x1+' '+(EY-14)+' L'+(CX+10)+' '+(EY+8)+' L'+(CX+10)+' '+(EY+8+2*q)+' L'+x1+' '+(EY-14+2*q)+' Z',1); }
    // SOBREVUELO: preocupado = la ranura se quiebra hacia ARRIBA en el centro (cejas de preocupación; lo opuesto al ceño)
    if(tipo==='preocupado'){ var q2=7*alto; return capa('M'+x0+' '+(EY+8)+' L'+(CX-10)+' '+(EY-12)+' L'+(CX-10)+' '+(EY-12+2*q2)+' L'+x0+' '+(EY+8+2*q2)+' Z',1)+capa('M'+x1+' '+(EY+8)+' L'+(CX+10)+' '+(EY-12)+' L'+(CX+10)+' '+(EY-12+2*q2)+' L'+x1+' '+(EY+8+2*q2)+' Z',1); }
    if(tipo==='dormir') return capa(capsula(x0,x1,EY+6,2.5),.25)+capa(capsula(CX-30,CX+30,EY+6,2.5),.8);
    if(tipo==='grande') hh=22*alto;                        // la ranura se abre, como cuando Gort levanta el visor
    var w=(tipo==='grande'?96:70)*(1+.25*(voz||0)), c=CX+Math.max(-1,Math.min(1,mir))*60;
    return capa(capsula(x0,x1,EY,hh),.3)                    // la ranura, tenue
      +capa(capsula(Math.max(x0,c-w*.9),Math.min(x1,c+w*.9),EY,hh),.35) // halo de la luz
      +capa(capsula(Math.max(x0,c-w/2),Math.min(x1,c+w/2),EY,hh),1)  // la luz
      +(hh>4?'<path d="'+capsula(c-w*.28,c+w*.28,EY,hh*.45)+'" fill="#e6fdff" opacity="'+(.85+.15*(voz||0)).toFixed(2)+'"/>':''); } // centro blanco, como el brillo que sale de la ranura de Gort
  function bocaD(tipo, t){ var w=62;
    if(tipo==='onda'){ var s='M'+(CX-w)+' '+MY, k; for(k=0;k<=16;k++){ var xx=CX-w+k*w/8, a=(1-Math.pow((k-8)/8,2))*(10+16*Math.abs(Math.sin(t*9+k*.9))); s+=' L'+xx.toFixed(1)+' '+(MY-a).toFixed(1); }
      for(k=16;k>=0;k--){ var xx2=CX-w+k*w/8, a2=(1-Math.pow((k-8)/8,2))*(10+16*Math.abs(Math.sin(t*9+k*.9+.4))); s+=' L'+xx2.toFixed(1)+' '+(MY+a2).toFixed(1); } return s+' Z'; }
    if(tipo==='o') return 'M'+(CX-22)+' '+MY+' A22 26 0 1 1 '+(CX+22)+' '+MY+' A22 26 0 1 1 '+(CX-22)+' '+MY+' Z M'+(CX-12)+' '+MY+' A12 15 0 1 0 '+(CX+12)+' '+MY+' A12 15 0 1 0 '+(CX-12)+' '+MY+' Z';
    // SOBREVUELO: dientes apretados (barras verticales de LED), jadeo (óvalo que late lento), grito (onda grande y rápida)
    if(tipo==='dientes'){ var dd='', k2; for(k2=0;k2<7;k2++){ var xx3=CX-42+k2*14; dd+='M'+xx3+' '+(MY-10)+' h8 v20 h-8 Z '; } return dd; }
    if(tipo==='jadeo'){ var ry=14+10*Math.abs(Math.sin(t*3.2)); return 'M'+(CX-20)+' '+MY+' A20 '+ry.toFixed(1)+' 0 1 1 '+(CX+20)+' '+MY+' A20 '+ry.toFixed(1)+' 0 1 1 '+(CX-20)+' '+MY+' Z'; }
    if(tipo==='grito'){ var g2='M'+(CX-w)+' '+MY, k3; for(k3=0;k3<=16;k3++){ var xg=CX-w+k3*w/8, ag=(1-Math.pow((k3-8)/8,2))*(18+22*Math.abs(Math.sin(t*16+k3*1.3))); g2+=' L'+xg.toFixed(1)+' '+(MY-ag).toFixed(1); }
      for(k3=16;k3>=0;k3--){ var xg2=CX-w+k3*w/8, ag2=(1-Math.pow((k3-8)/8,2))*(18+22*Math.abs(Math.sin(t*16+k3*1.3+.5))); g2+=' L'+xg2.toFixed(1)+' '+(MY+ag2).toFixed(1); } return g2+' Z'; }
    if(tipo==='linea') return 'M'+(CX-24)+' '+(MY-2)+' H'+(CX+24)+' V'+(MY+4)+' H'+(CX-24)+' Z';
    return 'M'+(CX-w)+' '+(MY-16)+' Q'+CX+' '+(MY+46)+' '+(CX+w)+' '+(MY-16)+' L'+(CX+w-12)+' '+(MY-6)+' Q'+CX+' '+(MY+16)+' '+(CX-w+12)+' '+(MY-6)+' Z'; } // sonrisa
  function cuadro(now){
    var t=(now-t0)/1000, te=t-tEst, n=Math.floor(t*12);
    if(n!==cuadroN){ cuadroN=n; var dt=1/12; // todo cambia a 12 cuadros por segundo: movimiento a saltos
      var tipoOjo='normal', tipoBoca='sonrisa', alto=1, brillo=1, voz=0;
      if(est==='hablar'){ tipoBoca='onda'; voz=Math.abs(Math.sin(t*9)); }
      if(est==='feliz'){ tipoOjo='feliz'; poseObj={x:0,y:(Math.floor(te*6)%2? -8:4),r:0}; if(te>1.6){ est='reposo'; tEst=t; } }
      if(est==='sorpresa'){ tipoOjo='grande'; tipoBoca='o'; poseObj={x:0,y:-10,r:0}; if(te<.25) glitch=.2; if(te>1.5){ est='reposo'; tEst=t; } }
      // ===== SOBREVUELO: estados persistentes según la ruta =====
      var col=CIAN, extra='';
      if(est.indexOf('r:')===0){ var re=est.slice(2), lt=Math.floor(t*12);
        if(['feliz','preocupado','adrenalina','pensando'].indexOf(re)<0) mir=0; if(re!=='feliz') poseObj={x:0,y:0,r:0};
        if(re==='feliz'){ prox-=dt; if(prox<0){ var i2=Math.floor(Math.random()*5); mir=[-1,-.5,0,.5,1][i2]; poseObj={x:[-6,-3,0,3,6][i2],y:0,r:[-3,-1,0,1,3][i2]}; prox=1.5+Math.random()*2; } }
        if(re==='contento'){ tipoOjo='feliz'; poseObj={x:0,y:(Math.floor(te*4)%2?-5:2),r:0}; }
        if(re==='guino'){ tipoOjo='guino'; poseObj={x:0,y:0,r:4}; }
        if(re==='preocupado'){ tipoOjo='preocupado'; tipoBoca='linea'; mir=.6; poseObj={x:0,y:-3,r:0}; if(lt%30===0) glitch=.09; }
        if(re==='cansado'){ alto=.5; brillo=.78; tipoBoca='jadeo'; poseObj={x:0,y:(Math.floor(te*3)%2?3:0),r:-2}; extra='gota'; }
        if(re==='enojado'){ tipoOjo='enojado'; tipoBoca='dientes'; col='#ffb347'; poseObj={x:(lt%2?2:-2),y:2,r:0}; if(lt%18===0) glitch=.1; }
        if(re==='agotado'){ alto=.28+.18*(Math.floor(t*5)%2); brillo=.55+.3*(Math.floor(t*3)%2); tipoBoca='jadeo'; col='#ff5a5f'; poseObj={x:0,y:9,r:-4}; if(lt%10===0) glitch=.15; extra='gota'; }
        if(re==='emocionado'){ tipoOjo='feliz'; tipoBoca='onda'; voz=.6; poseObj={x:0,y:-3,r:3}; extra='viento1'; }
        if(re==='adrenalina'){ tipoOjo='grande'; tipoBoca='grito'; mir=Math.sin(t*10); voz=1; col='#b9fbff'; poseObj={x:0,y:-4,r:5}; if(lt%6===0) glitch=.12; extra='viento'; }
        if(re==='sorprendido'){ tipoOjo='grande'; tipoBoca='o'; poseObj={x:0,y:-10,r:0}; }
        if(re==='orgulloso'){ tipoOjo='feliz'; col='#ffd84d'; poseObj={x:0,y:(Math.floor(te*3)%2?-6:0),r:0}; extra='destellos'; }
        if(re==='pensando'){ alto=.6; mir=-.8; tipoBoca='linea'; extra='puntos'; }
      }
      if(est==='dormir'){ tipoOjo='dormir'; tipoBoca='linea'; brillo=.35+.25*(Math.floor(t*2)%2); poseObj={x:0,y:8,r:-3}; }
      if(est==='reposo'||est==='hablar'){ prox-=dt; if(prox<0){ var i=Math.floor(Math.random()*5); poseObj={x:[-10,-5,0,5,10][i],y:0,r:[-4,-2,0,2,4][i]}; mir=[-1,-.5,0,.5,1][i]; prox=1.3+Math.random()*2.2; } }
      else if(est.indexOf('r:')!==0) mir=0; // SOBREVUELO: los estados de ruta manejan su mirada
      // la pose salta directo a la nueva (con un cuadro intermedio), como animación limitada
      pose.x+=(poseObj.x-pose.x)*.6; pose.y+=(poseObj.y-pose.y)*.6; pose.r+=(poseObj.r-pose.r)*.6;
      if(tipoOjo==='normal'){ proxParp-=dt; if(proxParp<0){ parp=3; proxParp=2.4+Math.random()*3; } }
      if(parp>0){ alto=[.04,.3,.04][3-parp]; parp--; }
      proxGlitch-=dt; if(proxGlitch<0){ glitch=.18; proxGlitch=3+Math.random()*4; }
      var gl=glitch>0; glitch-=dt;
      var boca=bocaD(tipoBoca,t);
      var ex2='';
      if(extra==='gota'){ var gy=(t*90)%140; ex2='<rect x="'+(CX+92)+'" y="'+(EY+10+gy).toFixed(0)+'" width="10" height="14" fill="#7fd0ff" opacity="'+(1-gy/140).toFixed(2)+'"/>'; }
      if(extra==='viento'){ for(var w2=0;w2<3;w2++){ var wx=CX-120+((t*700+w2*90)%260); ex2+='<rect x="'+wx.toFixed(0)+'" y="'+(EY+40+w2*22)+'" width="46" height="5" fill="#e6fdff" opacity=".7"/>'; } }
      if(extra==='viento1'){ var wx1=CX-120+((t*520)%260); ex2+='<rect x="'+wx1.toFixed(0)+'" y="'+(EY+52)+'" width="40" height="5" fill="#e6fdff" opacity=".6"/>'; }
      if(extra==='destellos'){ [[CX-110,EY-40],[CX+104,EY-30],[CX+80,MY+10]].forEach(function(s2,k4){ if((Math.floor(t*6)+k4)%3) ex2+='<path d="M'+s2[0]+' '+(s2[1]-14)+' L'+(s2[0]+4)+' '+(s2[1]-4)+' L'+(s2[0]+14)+' '+s2[1]+' L'+(s2[0]+4)+' '+(s2[1]+4)+' L'+s2[0]+' '+(s2[1]+14)+' L'+(s2[0]-4)+' '+(s2[1]+4)+' L'+(s2[0]-14)+' '+s2[1]+' L'+(s2[0]-4)+' '+(s2[1]-4)+' Z" fill="#ffd84d"/>'; }); }
      if(extra==='puntos'){ for(var p2=0;p2<3;p2++) if(Math.floor(t*3)%4>p2) ex2+='<rect x="'+(CX+40+p2*18)+'" y="'+(EY-46)+'" width="10" height="10" fill="'+CIAN+'"/>'; }
      var cara='<g filter="url(#'+u+'g)" opacity="'+brillo.toFixed(2)+'">'+visor(tipoOjo,alto,mir,col,voz)+forma(boca,col)+ex2+'</g>';
      if(gl){ // interferencia: doble imagen naranja/cian (sin franja que cruce la cara)
        cara='<g opacity=".55" transform="translate(-7 0)">'+visor(tipoOjo,alto,mir,'#ff7a1a',voz)+forma(boca).replace(CIAN,'#ff7a1a')+'</g>'+cara; }
      pant.innerHTML=cara;
      todo.setAttribute('transform','translate('+(pose.x+(gl?4:0)).toFixed(1)+' '+pose.y.toFixed(1)+') rotate('+pose.r.toFixed(2)+' '+CX+' '+PIV+')');
      cascoG.setAttribute('transform',gl?'translate(-3 0)':'');
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(nm){ est=nm; tEst=(performance.now()-t0)/1000; },
           estadoRuta:function(nm){ var e='r:'+nm; if(est!==e){ est=e; tEst=(performance.now()-t0)/1000; } }, svg:el.querySelector('svg') }; // SOBREVUELO
  });
}
