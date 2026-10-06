import fs from 'fs';
const V='C:/Users/flgan/lp-audit/disenos-ui/pistero-nuevo/';
const orbe=fs.readFileSync('plantilla-orbe-pub.html','utf8').split('\n');
let head=orbe.slice(0,24).join('\n')
 .replace('<title>Orbe animado</title>','<title>Pistero androide</title>')
 .replace('Pistero orbe · animación','Pistero androide de vinilo · animación')
 .replace(/<h1>.*<\/h1>/,'<h1>Un androide con <span>casco</span></h1>')
 .replace(/<p class="lead">.*<\/p><\/header>/,'<p class="lead">El casco y la cabeza de vinilo los dibujó Gemini por separado, a partir del androide que elegiste. Los ojos de diafragma, la boca de luces y el movimiento son nuestros. El casco va limpio, sin anteojos ni correas (los lentes serán un accesorio aparte), y por sus ventilaciones se ve el acolchado oscuro, no la cabeza. Se recorre sola por sus estados; toca uno para verlo.</p></header>');
const b64=f=>'data:image/jpeg;base64,'+fs.readFileSync(V+'gemini/'+f).toString('base64');
const js=fs.readFileSync(V+'vector/vinilo-capas.js','utf8');
const html=head+`
<div class="escena"><div class="esc"><div id="o"></div><div class="b" id="b"><button data-e="reposo">Reposo</button><button data-e="hablar">Hablar</button><button data-e="feliz">Feliz</button><button data-e="sorpresa">Sorpresa</button><button data-e="dormir">Dormir</button></div><div class="barra">En la barra de abajo: <span id="c"></span></div></div>
<div><ul>
<li><b>Se mueve como robot:</b> gira la cabeza con motores, rápido, se pasa apenas y frena en seco. No flota como el orbe ni tiembla como el slime.</li>
<li><b>Ojos de cámara:</b> para parpadear, las hojas del diafragma se cierran y se vuelven a abrir. Al sorprenderse se abren al máximo.</li>
<li><b>Boca de luces:</b> una matriz de puntos naranjos. Sonríe en reposo, al hablar se mueve como un ecualizador y al sorprenderse forma una "O".</li>
<li><b>Feliz:</b> asiente dos veces con golpes cortos de motor, y los ojos cambian a ^ ^ hechos de puntos de luz.</li>
<li><b>Dormir:</b> el diafragma queda cerrado y las luces bajan.</li>
<li><b>Mira hacia los lados:</b> el diafragma se corre dentro del ojo y la cabeza gira con el casco puesto.</li>
</ul>
<p class="ref">Cada modelo tiene su propia forma de moverse: el orbe flota, el slime tiembla y el androide se mueve con motores.</p></div></div>
</div>
<script>
${js}
(function(){ var CAS='${b64('vinilo-capa-casco.jpg')}', CAB='${b64('vinilo-capa-cabeza.jpg')}'; Promise.all([crearViniloCapas(document.getElementById('o'),CAS,CAB),crearViniloCapas(document.getElementById('c'),CAS,CAB)]).then(function(A){ var o=A[0], c=A[1];
 var seq=['reposo','hablar','feliz','reposo','sorpresa','hablar','dormir'], k=0, auto=true, btns=document.querySelectorAll('#b button');
 function poner(e){ o.estado(e); c.estado(e); btns.forEach(function(b){ b.classList.toggle('on',b.dataset.e===e); }); }
 poner('reposo'); setInterval(function(){ if(!auto) return; k=(k+1)%seq.length; poner(seq[k]); },2600);
 document.getElementById('b').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ auto=false; poner(b.dataset.e); } }); }); })();
</script>
`;
fs.writeFileSync('vinilopub/index.html',html); fs.writeFileSync(V+'vector/vinilo-capas-pub.html',html); console.log(html.length);
