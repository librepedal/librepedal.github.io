/* Pistero "casco vivo" — calco vectorial de la imagen de Gemini (disenos-ui/pistero-nuevo/gemini/
   gemini-descarga-tamano-completo.jpeg). Coordenadas en el marco de esa imagen mostrada a 2000x1116;
   el viewBox recorta la cabeza. Capas separadas para el armario: cáscara (color), ventilaciones, franja,
   visera y LED (expresión). */
function pisteroCascoSVG(o){
  o=o||{};
  var C=o.color||'#fc4c02';
  function tono(hex,k){ var n=parseInt(hex.slice(1),16), r=n>>16, g=(n>>8)&255, b=n&255;
    function f(c){ return Math.max(0,Math.min(255,Math.round(k<0?c*(1+k):c+(255-c)*k))); }
    return '#'+((1<<24)+(f(r)<<16)+(f(g)<<8)+f(b)).toString(16).slice(1); }
  var CS=tono(C,-.22), CO=tono(C,-.42), CL=tono(C,.32);
  var LED=o.led||'#d9fbff', GLOW=o.glow||'#7fe9f7';
  var u='pc'+Math.random().toString(36).slice(2,7);
  var s='<svg viewBox="640 145 726 815" xmlns="http://www.w3.org/2000/svg">';
  s+='<defs><filter id="'+u+'g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    +'<linearGradient id="'+u+'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3440"/><stop offset=".55" stop-color="#2a2232"/><stop offset="1" stop-color="#1c1a2a"/></linearGradient>'
    +'<clipPath id="'+u+'k"><path d="'+CASCARA+'"/></clipPath></defs>';
  // cabeza oscura detrás (se lee también sobre fondo claro)
  s+='<path d="M842 512 C842 650 872 780 940 860 C1000 925 1110 925 1170 860 C1240 790 1300 690 1318 600 L1330 505 Z" fill="#141b2e"/>';
  // correa (detrás de la visera, por delante de la cabeza)
  s+='<path d="M742 606 C760 690 800 760 842 808 C900 870 980 915 1052 932 M1052 932 C1110 900 1160 860 1192 826" fill="none" stroke="#3a3d58" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>';
  s+='<rect x="800" y="752" width="44" height="60" rx="9" fill="#4a4e6c" transform="rotate(-38 822 782)"/>';
  s+='<rect x="1058" y="902" width="56" height="26" rx="8" fill="#4a4e6c" transform="rotate(-28 1086 915)"/>';
  // cáscara
  s+='<path d="'+CASCARA+'" fill="'+C+'"/>';
  s+='<g clip-path="url(#'+u+'k)">'
    // sombra inferior y brillo superior
    +'<path d="M640 420 C760 470 1000 470 1360 420 L1360 640 L640 640 Z" fill="'+CS+'"/>'
    +'<path d="M700 300 C800 210 960 178 1080 186 C1180 194 1260 230 1310 290 C1230 240 1130 214 1030 214 C900 214 790 248 700 300 Z" fill="'+CL+'" opacity=".55"/>'
    // costillas entre ventilaciones (superficie iluminada de la espuma) y volumen del costado izquierdo
    +'<path d="M668 420 C664 360 676 320 700 296 C690 340 688 420 700 520 C704 560 712 590 720 606 C700 596 674 540 668 420 Z" fill="'+CL+'" opacity=".35"/>'
    +'<path d="M662 448 C820 470 1080 474 1344 452 L1344 492 C1180 494 980 502 850 514 C780 520 720 500 662 480 Z" fill="'+CO+'" opacity=".55"/>'
    // franja blanca
    +'<path d="M968 172 L1046 166 L1148 262 L1090 270 Z" fill="#f6eee8"/>'
    +'</g>';
  // ventilaciones (huecos oscuros con borde interior más claro)
  var V=[
    'M712 336 C726 312 760 300 790 304 C784 322 770 340 748 352 C734 360 716 356 712 336 Z',
    'M812 330 C828 314 856 318 872 334 L936 404 C948 420 934 438 914 430 C880 414 846 392 820 366 C806 352 802 340 812 330 Z',
    'M982 300 C1000 292 1020 300 1028 318 L1066 420 C1072 440 1052 452 1036 440 C1010 420 990 384 980 346 C976 328 972 308 982 300 Z',
    'M1098 270 C1116 262 1136 270 1144 290 L1182 418 C1188 440 1164 452 1148 436 C1124 404 1106 360 1098 318 C1094 298 1090 278 1098 270 Z',
    'M1214 298 C1232 292 1250 304 1256 324 L1276 420 C1280 442 1258 450 1244 434 C1228 404 1218 370 1212 336 C1210 320 1206 304 1214 298 Z',
    'M1302 356 C1316 356 1326 372 1328 392 L1330 436 C1328 452 1312 452 1306 438 C1300 414 1296 388 1296 370 C1296 362 1298 357 1302 356 Z'];
  var CEN=[[750,330],[875,375],[1022,370],[1140,355],[1243,370],[1312,404]];
  V.forEach(function(d,i){ var c=CEN[i], t='translate('+c[0]+' '+c[1]+') scale(1.3) translate('+(-c[0])+' '+(-c[1])+')';
    // relieve: borde iluminado arriba-derecha, sombra abajo-izquierda, hueco y fondo de la espuma
    s+='<g transform="'+t+'"><path d="'+d+'" fill="none" stroke="'+CL+'" stroke-width="10" stroke-linejoin="round" opacity=".55"/><path d="'+d+'" fill="'+CL+'" transform="translate(7 -6)"/><path d="'+d+'" fill="'+CO+'" transform="translate(-5 6)"/><path d="'+d+'" fill="#2e3050"/><path d="'+d+'" fill="#4b4e6e" transform="translate(3 -4) scale(.94)" transform-origin="'+c[0]+' '+c[1]+'" opacity=".55"/></g>'; });
  // borde inferior del casco (el canto sobre la visera)
  s+='<path d="M848 506 C1000 496 1180 490 1342 486" fill="none" stroke="'+CO+'" stroke-width="10" stroke-linecap="round"/>';
  // visera
  var VIS='M850 512 L1338 500 C1342 560 1336 636 1294 686 C1266 716 1232 714 1210 690 C1194 670 1178 662 1162 668 C1146 676 1124 700 1078 706 C970 714 888 694 864 652 C854 620 850 560 850 512 Z';
  s+='<path d="'+VIS+'" fill="url(#'+u+'v)" opacity=".94"/>';
  s+='<path d="M852 516 L1336 504 L1336 524 L852 534 Z" fill="'+C+'" opacity=".28"/>';
  s+='<path d="M1296 506 L1338 504 C1340 560 1336 620 1314 660 C1306 640 1300 580 1296 506 Z" fill="#ffffff" opacity=".14"/>';
  // LED: ojos y boca (cambian con la expresión)
  var expr=o.expr||'feliz', led='', W=' fill="none" stroke="'+LED+'" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"';
  var OJO_I=[1054,603], OJO_D=[1236,602], BOCA=[1150,750];
  function pill(c,h){ h=h||86; return '<rect x="'+(c[0]-18)+'" y="'+(c[1]-h/2)+'" width="36" height="'+h+'" rx="18"/>'; }
  function arcoArriba(c){ return '<path d="M'+(c[0]-26)+' '+(c[1]+12)+' Q'+c[0]+' '+(c[1]-30)+' '+(c[0]+26)+' '+(c[1]+12)+'"'+W+'/>'; }
  var parpadeo=o.parpadeo!==false?'<animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 .08;1 1" keyTimes="0;.92;.96;1" dur="4.2s" repeatCount="indefinite" additive="sum"/>':'';
  function ojosQueParpadean(h){ return '<g transform-origin="1145 603">'+pill(OJO_I,h)+pill(OJO_D,h)+parpadeo+'</g>'; }
  if(expr==='feliz') led=ojosQueParpadean()+'<path d="M1112 744 Q1150 770 1188 744"'+W+'/>';
  else if(expr==='riendo') led=arcoArriba(OJO_I)+arcoArriba(OJO_D)+'<path d="M1108 734 L1192 734 Q1186 782 1150 784 Q1114 782 1108 734 Z"/>';
  else if(expr==='sorprendido') led='<circle cx="'+OJO_I[0]+'" cy="'+OJO_I[1]+'" r="30"/><circle cx="'+OJO_D[0]+'" cy="'+OJO_D[1]+'" r="30"/><circle cx="'+BOCA[0]+'" cy="'+(BOCA[1]+4)+'" r="17"/>';
  else if(expr==='sueno') led='<path d="M1030 612 Q1054 628 1078 612 M1212 612 Q1236 628 1260 612"'+W+'/><path d="M1134 752 L1166 752"'+W+'/>';
  else if(expr==='concentrado') led='<rect x="1022" y="588" width="66" height="24" rx="12" transform="rotate(8 1055 600)"/><rect x="1203" y="588" width="66" height="24" rx="12" transform="rotate(-8 1236 600)"/><path d="M1124 750 L1176 750"'+W+'/>';
  else if(expr==='guino') led=pill(OJO_I)+arcoArriba(OJO_D)+'<path d="M1112 744 Q1150 770 1188 744"'+W+'/>';
  else if(expr==='hablando') led=ojosQueParpadean()+'<ellipse cx="1150" cy="752" rx="30" ry="14"><animate attributeName="ry" values="6;20;10;22;6" dur=".6s" repeatCount="indefinite"/></ellipse>';
  s+='<g fill="'+LED+'" filter="url(#'+u+'g)">'+led+'</g>';
  s+='</svg>';
  return s;
}
var CASCARA='M690 614 C664 560 654 470 662 400 C672 300 760 212 900 182 C1000 162 1112 168 1202 200 C1290 236 1340 330 1344 432 L1344 488 C1180 492 980 500 850 512 C808 528 770 560 744 608 C732 628 702 630 690 614 Z';
