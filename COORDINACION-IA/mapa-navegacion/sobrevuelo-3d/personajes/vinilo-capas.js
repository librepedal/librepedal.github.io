/* COPIA de feature/armario-piezas:disenos-ui/pistero-nuevo/vector/vinilo-capas.js (Inty: "sigue") +
   EXTENSIÓN PARA EL SOBREVUELO (2026-10-07), marcada SOBREVUELO: estados persistentes 'r:<estado>' (los 12 de
   EXPRESIONES-PERSONAJES.md) en el lenguaje del androide: ojos de diafragma, boca de matriz LED, cejas de LED,
   movimiento de servo (rápido y seco). No cambia los 5 estados originales. Para fusionar en su rama.
   Androide de vinilo con capas de Gemini (casco y cabeza lisa dibujados por Gemini) + animación de robot.
   Marco 1376x768 = el de las imágenes de Gemini. Ojos = diafragma de cámara (las hojas se cierran para parpadear y
   se abren al sorprenderse) y boca = matriz de LED naranjos, dibujados en vector para poder animarlos.
   Diferencia con el orbe y el slime: se mueve como un servo (gira rápido, se pasa un poquito, frena en seco y queda
   quieto), no flota ni tiembla.
   crearViniloCapas(el, urlCasco, urlCabeza) -> Promise<{estado(nombre)}> */
function _recortarCapa(url, alfa, despues){
  return new Promise(function(ok,mal){ var im=new Image(); im.onload=function(){
    var c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; var x=c.getContext('2d'); x.drawImage(im,0,0);
    var d=x.getImageData(0,0,c.width,c.height), p=d.data, W=c.width;
    for(var i=0;i<p.length;i+=4){ var a=alfa(p[i],p[i+1],p[i+2],p,i,(i/4)%W,Math.floor(i/4/W)); if(a<1) p[i+3]=Math.round(255*Math.max(0,a)); }
    if(despues) despues(p,W,c.height);
    x.putImageData(d,0,0); ok(c.toDataURL('image/png')); }; im.onerror=mal; im.src=url; });
}
// casco: fuera el verde y fuera las correas (todo lo que cuelga bajo el borde del casco)
function _vCasco(r,g,b,p,i,x,y){ if(y>366) return 0; var m=Math.max(r,b), v=g-m; if(v>6) p[i+1]=Math.round(g-(v-6)*.85); if(v<=18) return 1;
  p[i+1]=m; return 1-(v-18)/70; }
// cabeza: fuera el azul marino del fondo (el cuello y la polera los saca la máscara redonda del mentón)
function _vCabeza(r,g,b,p,i,x,y){ var d=Math.sqrt((r-14)*(r-14)+(g-22)*(g-22)+(b-48)*(b-48)); return d<24?0:(d<60?(d-24)/36:1); }
function _rellenarVentilaciones(p,W,H){ // inundación desde los bordes: lo transparente conectado al borde es fondo; lo demás, hueco del casco
  var N=W*H, fuera=new Uint8Array(N), cola=new Int32Array(N), n=0, k;
  function poner(q){ if(!fuera[q]&&p[q*4+3]<250){ fuera[q]=1; cola[n++]=q; } }
  for(k=0;k<W;k++){ poner(k); poner((H-1)*W+k); } for(k=0;k<H;k++){ poner(k*W); poner(k*W+W-1); }
  for(var h=0;h<n;h++){ var q=cola[h], x=q%W; if(x>0) poner(q-1); if(x<W-1) poner(q+1); if(q>=W) poner(q-W); if(q<N-W) poner(q+W); }
  for(q=0;q<N;q++){ var i=q*4; if(!fuera[q]&&p[i+3]<255){ var a=p[i+3]/255; p[i]=Math.round(p[i]*a+34*(1-a)); p[i+1]=Math.round(p[i+1]*a+31*(1-a)); p[i+2]=Math.round(p[i+2]*a+33*(1-a)); p[i+3]=255; } } }
function crearViniloCapas(el, urlCasco, urlCabeza){
  return Promise.all([_recortarCapa(urlCasco,_vCasco,_rellenarVentilaciones),_recortarCapa(urlCabeza,_vCabeza)]).then(function(r){
  var casco=r[0], cabeza=r[1], u='vc'+Math.random().toString(36).slice(2,6);
  var CX=688, PIV=600, EY=391, EX=[581,795], RI=43, MY=508;   // medidos sobre la imagen (cuencas de los ojos y boca)
  var hojas=7;
  el.innerHTML='<svg viewBox="390 14 596 620" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible">'
   +'<defs><clipPath id="'+u+'f"><path d="M380 768 L380 410 L458 356 C518 304 600 290 688 289 C776 290 858 304 918 356 L996 410 L996 768 Z"/></clipPath>'
   +'<filter id="'+u+'mb"><feGaussianBlur stdDeviation="1.6"/></filter><mask id="'+u+'m" maskUnits="userSpaceOnUse" x="0" y="0" width="1376" height="768"><g fill="#fff" filter="url(#'+u+'mb)"><rect x="0" y="0" width="1376" height="500"/><ellipse cx="690" cy="420" rx="226" ry="171"/></g></mask><radialGradient id="'+u+'i" cx=".5" cy=".5" r=".5"><stop offset=".25" stop-color="#ffb066"/><stop offset=".7" stop-color="#ff7a1a"/><stop offset="1" stop-color="#b84a08"/></radialGradient>'
   +'<clipPath id="'+u+'o0"><circle cx="'+EX[0]+'" cy="'+EY+'" r="'+RI+'"/></clipPath><clipPath id="'+u+'o1"><circle cx="'+EX[1]+'" cy="'+EY+'" r="'+RI+'"/></clipPath>'
   +'<filter id="'+u+'g" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="3.2" result="x"/><feMerge><feMergeNode in="x"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
   +'<ellipse id="'+u+'sombra" cx="'+CX+'" cy="612" rx="170" ry="14" fill="#000" opacity=".3"/>'
   +'<g id="'+u+'todo">'
   +  '<image href="'+cabeza+'" x="0" y="0" width="1376" height="768" mask="url(#'+u+'m)"/>'
   +  '<g id="'+u+'casco"><image href="'+casco+'" x="0" y="0" width="1376" height="768"/></g>'
   +  '<g clip-path="url(#'+u+'f)"><image href="'+cabeza+'" x="0" y="0" width="1376" height="768" mask="url(#'+u+'m)"/>'
   +    '<g id="'+u+'ojo0" clip-path="url(#'+u+'o0)"></g><g id="'+u+'ojo1" clip-path="url(#'+u+'o1)"></g>'
   +    '<g id="'+u+'boca" filter="url(#'+u+'g)"></g>'
   +  '</g>'
   +'</g>'
   +'<g id="'+u+'extra"></g>'
   +'</svg>';
  var $=function(id){ return el.querySelector('#'+u+id); };
  var extraG=$('extra'), todo=$('todo'), cascoG=$('casco'), ojos=[$('ojo0'),$('ojo1')], boca=$('boca'), sombra=$('sombra');
  var est='reposo', tEst=0, t0=performance.now(), last=t0;
  // servos: ángulo y altura de la cabeza con resorte casi crítico (se pasa apenas y frena)
  var ang=0, av=0, angObj=0, hy=0, hv=0, cy=0, cv=0, mir=0, mirObj=0, prox=1.5, ap=1, apObj=1, parp=0, proxParp=2;
  function diafragma(x, abre, giro){ // abre 0 (cerrado) .. 1.6 (muy abierto)
    var r0=Math.max(0,15*abre), s='<circle cx="'+x+'" cy="'+EY+'" r="'+RI+'" fill="url(#'+u+'i)"/>', pts=[];
    for(var k=0;k<hojas;k++){ var a=giro+k*2*Math.PI/hojas; pts.push([x+r0*Math.cos(a), EY+r0*Math.sin(a)]); }
    for(var k2=0;k2<hojas;k2++){ var p=pts[k2], a2=giro+k2*2*Math.PI/hojas+1.25; // cada hoja sale tangente de la abertura hacia el borde
      s+='<line x1="'+p[0].toFixed(1)+'" y1="'+p[1].toFixed(1)+'" x2="'+(p[0]+60*Math.cos(a2)).toFixed(1)+'" y2="'+(p[1]+60*Math.sin(a2)).toFixed(1)+'" stroke="#5a2204" stroke-width="2.6" opacity=".85"/>'; }
    if(r0>.5) s+='<polygon points="'+pts.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' ')+'" fill="#140804"/>';
    s+='<circle cx="'+x+'" cy="'+EY+'" r="'+(RI-1)+'" fill="none" stroke="#2a0f02" stroke-width="5" opacity=".7"/>';
    s+='<ellipse cx="'+(x-13)+'" cy="'+(EY-17)+'" rx="13" ry="8" fill="#fff" opacity=".55" transform="rotate(-30 '+(x-13)+' '+(EY-17)+')"/>';
    return s; }
  var LC='#ff8a2a'; // SOBREVUELO: color de los LED (rojo al apretar/agotado, dorado orgulloso)
  function ojoArco(x, arriba){ // ojos de LED cuando está feliz (^ ^) o durmiendo (_ _)
    var s='<circle cx="'+x+'" cy="'+EY+'" r="'+RI+'" fill="#0d0a0a"/>';
    for(var k=-3;k<=3;k++){ var px=x+k*10, py=arriba? EY+8-Math.cos(k/3*Math.PI/2)*20 : EY+6+Math.cos(k/3*Math.PI/2)*7;
      s+='<circle cx="'+px+'" cy="'+py.toFixed(1)+'" r="3.6" fill="'+LC+'"/>'; }
    return s; }
  function ledBoca(modo, t, ab){ // matriz de 15 columnas x 5 filas
    var s='', col=15, dx=9.2, dy=8.4;
    for(var c=0;c<col;c++){ var u0=(c-(col-1)/2)/((col-1)/2), x=CX+(c-(col-1)/2)*dx, filas=[];
      if(modo==='sonrisa'){ var ys=MY-9+15*(1-u0*u0); s+='<circle cx="'+x.toFixed(1)+'" cy="'+ys.toFixed(1)+'" r="3.3" fill="'+LC+'"/>'; for(var fi=1;fi<(Math.abs(u0)<.75?3:2);fi++) s+='<circle cx="'+x.toFixed(1)+'" cy="'+(ys-fi*dy).toFixed(1)+'" r="3.3" fill="'+LC+'"/>'; }
      else if(modo==='habla'){ var h=Math.max(0,ab*(1-.55*u0*u0)*(.6+.4*Math.sin(t*23+c*1.7))*2.6); for(var f=-Math.round(h);f<=Math.round(h);f++) filas.push(f+1); }
      
      else if(modo==='linea'){ if(Math.abs(u0)<.5) filas=[1]; }
      // SOBREVUELO: onda (preocupado), dientes (aprieta), corta (pensando), falla (agotado: LED que se apagan)
      else if(modo==='onda'){ if(Math.abs(u0)<.85){ var yo=Math.round(Math.sin(c*1.1+t*3)*1); filas=[1+yo]; } }
      else if(modo==='dientes'){ if(Math.abs(u0)<.8) filas=c%2?[0,2]:[0,1,2]; }
      else if(modo==='corta'){ if(u0>.1&&u0<.6) filas=[1]; }
      filas.forEach(function(f){ s+='<circle cx="'+x.toFixed(1)+'" cy="'+(MY+(f-1)*dy).toFixed(1)+'" r="3.3" fill="'+LC+'"/>'; }); }
    if(modo==='o'||modo==='oGrande'||modo==='oJadeo'){ var ro=modo==='oGrande'?1.45:(modo==='oJadeo'?.7+.35*Math.abs(Math.sin(t*2.6)):1);
      for(var k=0;k<12;k++){ var a=k*Math.PI/6; if(falla && Math.sin(t*13+k*7)>.55) continue; s+='<circle cx="'+(CX+21*ro*Math.cos(a)).toFixed(1)+'" cy="'+(MY+23*ro*Math.sin(a)).toFixed(1)+'" r="3.3" fill="'+LC+'"/>'; } }
    return s; }
  var falla=false; // SOBREVUELO: LED que fallan (agotado)
  // SOBREVUELO: cejas de LED (5 puntos) — dir>0 preocupado (sube al centro), dir<0 aprieta (baja al centro)
  function cejaLed(x,k,dir){ var s2=''; for(var q=0;q<5;q++){ var hacia=k?-1:1, px=x-24+q*12, cen=(k?(4-q):q)/4; s2+='<circle cx="'+px+'" cy="'+(EY-RI-16-dir*cen*14+dir*7).toFixed(1)+'" r="3.4" fill="'+LC+'"/>'; } return s2; }
  function cuadro(now){
    var dt=Math.min(.033,(now-last)/1000); last=now; var t=(now-t0)/1000, te=t-tEst;
    var objY=0, modoBoca='sonrisa', ab=0, forma='diafragma', brillo=1;
    apObj=1;
    if(est==='hablar'){ ab=.35+.65*Math.abs(Math.sin(te*7.5))*(.6+.4*Math.sin(te*2.3)); modoBoca='habla'; objY=-1.2*Math.abs(Math.sin(te*7.5)); }
    if(est==='feliz'){ forma='feliz'; // dos asentimientos de servo
      objY=(te<.9)? (Math.floor(te/.22)%2===0?7:-4) : 0; if(te>1.9){ est='reposo'; tEst=t; } }
    if(est==='sorpresa'){ objY=te<.08?4:-10; apObj=1.6; modoBoca='o'; if(te>1.6){ est='reposo'; tEst=t; } }
    if(est==='dormir'){ forma='dormir'; modoBoca='linea'; objY=6+2*Math.sin(t*1.1); brillo=.45+.15*Math.sin(t*1.1); apObj=0; }
    // ===== SOBREVUELO: estados persistentes según la ruta =====
    LC='#ff8a2a'; falla=false; var cejaD=0, guinoD=false, extra='', tic=0, lid=0, lidAng=0;
    if(est.indexOf('r:')===0){ var re=est.slice(2), paso=Math.floor(te*4);
      if(re==='contento'){ forma='feliz'; objY=(Math.floor(te/.3)%4===0)?6:0; }
      if(re==='guino'){ guinoD=true; angObj=5; }
      if(re==='preocupado'){ lid=.22; lidAng=-14; apObj=.62; cejaD=1; modoBoca='onda'; objY=2; }
      if(re==='cansado'){ lid=.5; apObj=.38; modoBoca='oJadeo'; objY=6; brillo=.8; LC='#ffa24d'; }
      if(re==='enojado'){ lid=.4; lidAng=18; apObj=.28; cejaD=-1; modoBoca='dientes'; LC='#ff3b1f'; tic=Math.sin(t*48)*1.4; }
      if(re==='agotado'){ lid=.66; lidAng=-10; apObj=.15+.25*Math.max(0,Math.sin(t*9)*Math.sin(t*2.3)); modoBoca='oJadeo'; LC='#ff4a3a'; falla=true; objY=11; brillo=.62+.2*Math.abs(Math.sin(t*3)); extra='humo'; tic=(paso%3===0)?-2:0; }
      if(re==='emocionado'){ forma='feliz'; modoBoca='habla'; ab=.7; objY=(Math.floor(te/.18)%2)?-5:3; }
      if(re==='adrenalina'){ apObj=1.6; modoBoca='oGrande'; objY=-6; LC='#ffd2a0'; extra='viento'; tic=Math.sin(t*40)*1; }
      if(re==='sorprendido'){ apObj=1.6; modoBoca='o'; objY=-10; }
      if(re==='orgulloso'){ forma='feliz'; LC='#ffd84d'; objY=-6; extra='destellos'; }
      if(re==='pensando'){ lid=.2; apObj=.85; mirObj=-1; modoBoca='corta'; extra='puntos'; }
      if(re==='feliz'){ /* mira a saltos como en reposo */ }
    }
    // mirar: gira a saltos (servo), cada tanto
    if(est==='reposo'||est==='hablar'||est==='r:feliz'){ prox-=dt; if(prox<0){ var i=Math.floor(Math.random()*5); angObj=[-6,-3,0,3,6][i]; mirObj=[-1,-.5,0,.5,1][i]; prox=1.4+Math.random()*2.4; } }
    else if(est.indexOf('r:')!==0){ angObj=0; mirObj=0; } else if(est!=='r:guino'&&est!=='r:pensando'){ angObj=0; mirObj=0; } // SOBREVUELO
    av+=((angObj-ang)*420-av*34)*dt; ang+=av*dt;          // servo: rápido, un poquito de pasada, frena
    mir+=(mirObj-mir)*Math.min(1,dt*16);
    hv+=((objY-hy)*600-hv*40)*dt; hy+=hv*dt;
    cv+=((hy-cy)*900-cv*30)*dt; cy+=cv*dt;               // el casco va firme; solo un leve retraso
    // parpadeo = el diafragma se cierra y abre
    if(forma==='diafragma' && est!=='dormir' && est.indexOf('r:')!==0){ proxParp-=dt; if(proxParp<0){ parp=.22; proxParp=2.6+Math.random()*3.2; } }
    var abre=apObj; if(parp>0){ parp-=dt; abre*=Math.abs(parp-.11)/.11; }
    ap+=(abre-ap)*Math.min(1,dt*(parp>0?40:12));
    todo.setAttribute('transform','translate('+(ang*1.4+tic).toFixed(1)+' '+hy.toFixed(1)+') rotate('+ang.toFixed(2)+' '+CX+' '+PIV+')');
    cascoG.setAttribute('transform','translate(0 '+(cy-hy).toFixed(1)+')');
    sombra.setAttribute('rx',(170-hy*.8).toFixed(0));
    ojos.forEach(function(o,k){ var x=EX[k]+mir*9;
      o.innerHTML= (forma==='feliz'||(guinoD&&k===1))? ojoArco(EX[k],true) : forma==='dormir'? ojoArco(EX[k],false) : diafragma(x, ap, ap*.9+k*.3);
      // SOBREVUELO: párpado de vinilo (obturador) que baja desde arriba; lidAng>0 = inclinado hacia el centro (bravo)
      if(lid>0 && forma==='diafragma'){ var ex0=EX[k], yb=EY-RI+2*RI*lid, sg=(k?-1:1)*lidAng; o.innerHTML+='<g transform="rotate('+sg+' '+ex0+' '+yb.toFixed(1)+')"><rect x="'+(ex0-RI-10)+'" y="'+(EY-RI-30)+'" width="'+(2*RI+20)+'" height="'+(yb-(EY-RI-30)).toFixed(1)+'" fill="#d9dce2"/><rect x="'+(ex0-RI-10)+'" y="'+(yb-4).toFixed(1)+'" width="'+(2*RI+20)+'" height="6" fill="#4a4e57"/></g>'; }
      o.setAttribute('opacity',brillo.toFixed(2)); });
    boca.innerHTML=ledBoca(modoBoca,t,ab)+(cejaD?cejaLed(EX[0],0,cejaD)+cejaLed(EX[1],1,cejaD):''); boca.setAttribute('opacity',brillo.toFixed(2));
    // SOBREVUELO: extras (humo de esfuerzo, viento, destellos, puntos) — fuera del recorte de la cara
    var ex='';
    if(extra==='humo'){ [0,.5].forEach(function(o2,k2){ var ph=((te*.7)+o2)%1; ex+='<circle cx="'+(CX+(k2?-150:160)+ph*20*(k2?-1:1))+'" cy="'+(300-ph*90).toFixed(0)+'" r="'+(14+ph*22).toFixed(0)+'" fill="#cfd6e0" opacity="'+(.55*(1-ph)).toFixed(2)+'"/>'; }); }
    if(extra==='viento'){ for(var k3=0;k3<4;k3++){ var p3=((te*2.4)+k3*.25)%1; ex+='<rect x="'+(CX+150+p3*110).toFixed(0)+'" y="'+(EY-100+k3*60)+'" width="110" height="11" rx="5" fill="#fff" opacity="'+(.75*(1-p3)).toFixed(2)+'"/>'; } }
    if(extra==='destellos'){ [[CX-200,EY-140],[CX+195,EY-110],[CX+180,MY+40]].forEach(function(q,k4){ var e3=.5+.5*Math.sin(te*5+k4*2); ex+='<path transform="translate('+q[0]+' '+q[1]+') scale('+(.7+.7*e3).toFixed(2)+')" d="M0 -34 L9 -9 L34 0 L9 9 L0 34 L-9 9 L-34 0 L-9 -9 Z" fill="#ffd84d"/>'; }); }
    if(extra==='puntos'){ for(var k5=0;k5<3;k5++) if(Math.floor(te*2.5)%4>k5) ex+='<circle cx="'+(CX+120+k5*40)+'" cy="'+(EY-120-k5*20)+'" r="'+(10+k5*3)+'" fill="#ff8a2a"/>'; }
    extraG.innerHTML=ex;
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { estado:function(n){ est=n; tEst=(performance.now()-t0)/1000; },
           estadoRuta:function(n){ var e='r:'+n; if(est!==e){ est=e; tEst=(performance.now()-t0)/1000; } }, svg:el.querySelector('svg') }; // SOBREVUELO
  });
}
