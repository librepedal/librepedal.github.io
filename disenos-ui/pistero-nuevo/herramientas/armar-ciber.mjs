import fs from 'fs';
const V='C:/Users/flgan/lp-audit/disenos-ui/pistero-nuevo/';
const orbe=fs.readFileSync('plantilla-orbe-pub.html','utf8').split('\n');
let head=orbe.slice(0,24).join('\n')
 .replace('<title>Orbe animado</title>','<title>Pistero cyberpunk</title>')
 .replace('Pistero orbe · animación','Pistero cyberpunk · animación')
 .replace(/<h1>.*<\/h1>/,'<h1>Una pantalla con <span>casco</span></h1>')
 .replace(/<p class="lead">.*<\/p><\/header>/,'<p class="lead">El casco y la cabeza los dibujó Gemini por separado, a partir del androide cyberpunk que elegiste, con el casco limpio, sin visera. La cara es una pantalla con un visor de lado a lado, como Gort de <i>El día que la Tierra se detuvo</i>: una ranura angosta y una sola luz adentro que se mueve al mirar. El visor y la boca son líneas de luz cian, hechas en código para que se animen. Se recorre sola por sus estados; toca uno para verlo.</p></header>');
const b64=f=>'data:image/jpeg;base64,'+fs.readFileSync(V+'gemini/'+f).toString('base64');
const js=fs.readFileSync(V+'vector/ciber-capas.js','utf8');
const html=head+`
<div class="escena"><div class="esc"><div id="o"></div><div class="b" id="b"><button data-e="reposo">Reposo</button><button data-e="hablar">Hablar</button><button data-e="feliz">Feliz</button><button data-e="sorpresa">Sorpresa</button><button data-e="dormir">Dormir</button></div><div class="barra">En la barra de abajo: <span id="c"></span></div></div>
<div><ul>
<li><b>Se mueve a saltos:</b> cambia de pose de golpe, a 12 cuadros por segundo, como el anime de animación limitada. No flota, no tiembla y no gira con motores.</li>
<li><b>Interferencias:</b> cada tanto la pantalla falla, con una doble imagen naranja y cian.</li>
<li><b>Visor tipo Gort:</b> una sola luz con el centro blanco recorre la ranura cuando mira a los lados. Al hablar late con la voz. Al sorprenderse la ranura se abre, como cuando Gort levanta su visor. Para parpadear la ranura se cierra en una línea.</li>
<li><b>Hablar:</b> la boca es una onda de sonido que sigue la voz.</li>
<li><b>Feliz, sorpresa y dormir:</b> en feliz el visor se curva hacia arriba y rebota a saltos; en sorpresa la ranura se abre y la boca forma una "O"; al dormir el visor y la boca quedan en líneas tenues que laten lento.</li>
</ul>
<p class="ref">Cada modelo se mueve a su manera: el orbe flota, el slime tiembla, el androide se mueve con motores y el cyberpunk va a saltos digitales.</p></div></div>
</div>
<script>
${js}
(function(){ var CAS='${b64('ciber-capa-casco.jpg')}', CAB='${b64('ciber-capa-cabeza.jpg')}'; Promise.all([crearCiberCapas(document.getElementById('o'),CAS,CAB),crearCiberCapas(document.getElementById('c'),CAS,CAB)]).then(function(A){ var o=A[0], c=A[1];
 var seq=['reposo','hablar','feliz','reposo','sorpresa','hablar','dormir'], k=0, auto=true, btns=document.querySelectorAll('#b button');
 function poner(e){ o.estado(e); c.estado(e); btns.forEach(function(b){ b.classList.toggle('on',b.dataset.e===e); }); }
 poner('reposo'); setInterval(function(){ if(!auto) return; k=(k+1)%seq.length; poner(seq[k]); },2600);
 document.getElementById('b').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ auto=false; poner(b.dataset.e); } }); }); })();
</script>
`;
fs.mkdirSync('ciberpub',{recursive:true}); fs.writeFileSync('ciberpub/index.html',html); fs.writeFileSync(V+'vector/ciber-capas-pub.html',html); console.log(html.length);
