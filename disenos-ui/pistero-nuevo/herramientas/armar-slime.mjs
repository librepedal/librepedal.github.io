import fs from 'fs';
const V='C:/Users/flgan/lp-audit/disenos-ui/pistero-nuevo/';
const orbe=fs.readFileSync('plantilla-orbe-pub.html','utf8').split('\n');
let head=orbe.slice(0,24).join('\n')
 .replace('<title>Orbe animado</title>','<title>Pistero slime</title>')
 .replace('Pistero orbe · animación','Pistero slime · animación')
 .replace(/<h1>.*<\/h1>/,'<h1>Una gelatina con <span>casco</span></h1>')
 .replace(/<p class="lead">.*<\/p><\/header>/,'<p class="lead">El casco y el cuerpo de gelatina los dibujó Gemini por separado (el mismo slime que elegiste); la cara y el movimiento son nuestros. El casco va calzado sobre la gelatina; por sus ventilaciones se ve el acolchado oscuro. Se recorre sola por sus estados; toca uno para verlo.</p></header>');
const b64=f=>'data:image/jpeg;base64,'+fs.readFileSync(V+'gemini/'+f).toString('base64');
const js=fs.readFileSync(V+'vector/slime-capas.js','utf8');
const html=head+`
<div class="escena"><div class="esc"><div id="o"></div><div class="b" id="b"><button data-e="reposo">Reposo</button><button data-e="hablar">Hablar</button><button data-e="feliz">Feliz</button><button data-e="sorpresa">Sorpresa</button><button data-e="dormir">Dormir</button></div><div class="barra">En la barra de abajo: <span id="c"></span></div></div>
<div><ul>
<li><b>Es gelatina, no una pelota:</b> todo su movimiento es un resorte blando; después de cada gesto tiembla y se asienta solo.</li>
<li><b>Pies en el suelo:</b> se aplasta y se estira desde la base, sin perder volumen (si se achata, se ensancha).</li>
<li><b>Salto de alegría:</b> se agacha, salta estirado, cae aplastado y queda tembleque.</li>
<li><b>El casco va calzado:</b> sigue a la gelatina a la altura del borde, con un pequeño retraso, pero nunca se despega ni se hunde.</li>
<li><b>Mira hacia los lados:</b> la cara se mueve y la gelatina se ladea al revés por inercia, con el casco acompañándola.</li>
<li><b>Ojos de cuenta brillantes:</b> como en la imagen que elegiste; parpadea solo, se abren al sorprenderse y se cierran al dormir.</li>
</ul>
<p class="ref">Diferente del orbe a propósito: el orbe flota y brilla; el slime pesa, se apoya y tiembla.</p></div></div>
</div>
<script>
${js}
(function(){ var CAS='${b64('slime-capa-casco.jpg')}', CUE='${b64('slime-capa-cuerpo.jpg')}'; Promise.all([crearSlimeCapas(document.getElementById('o'),CAS,CUE),crearSlimeCapas(document.getElementById('c'),CAS,CUE)]).then(function(A){ var o=A[0], c=A[1];
 var seq=['reposo','hablar','feliz','reposo','sorpresa','hablar','dormir'], k=0, auto=true, btns=document.querySelectorAll('#b button');
 function poner(e){ o.estado(e); c.estado(e); btns.forEach(function(b){ b.classList.toggle('on',b.dataset.e===e); }); }
 poner('reposo'); setInterval(function(){ if(!auto) return; k=(k+1)%seq.length; poner(seq[k]); },2600);
 document.getElementById('b').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ auto=false; poner(b.dataset.e); } }); }); })();
</script>
`;
fs.writeFileSync('slimepub/index.html',html); console.log(html.length);
