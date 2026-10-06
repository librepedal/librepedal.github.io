import fs from 'fs';
const V='C:/Users/flgan/lp-audit/disenos-ui/pistero-nuevo/';
const orbe=fs.readFileSync('plantilla-orbe-pub.html','utf8').split('\n');
let head=orbe.slice(0,24).join('\n')
 .replace('<title>Orbe animado</title>','<title>Pistero de vidrio</title>')
 .replace('Pistero orbe · animación','Pistero vidrio y luz · animación')
 .replace(/<h1>.*<\/h1>/,'<h1>Vidrio y <span>luz</span></h1>')
 .replace(/<p class="lead">.*<\/p><\/header>/,'<p class="lead">El casco y la cabeza de vidrio esmerilado los dibujó Gemini por separado, a partir del modelo de vidrio que elegiste, ahora de frente y con el casco limpio. La cara son líneas de luz naranja bajo el vidrio, hechas en código. Se recorre sola por sus estados; toca uno para verlo.</p></header>');
const b64=f=>'data:image/jpeg;base64,'+fs.readFileSync(V+'gemini/'+f).toString('base64');
const js=fs.readFileSync(V+'vector/vidrio-capas.js','utf8');
const html=head+`
<div class="escena"><div class="esc"><div id="o"></div><div class="b" id="b"><button data-e="reposo">Reposo</button><button data-e="hablar">Hablar</button><button data-e="feliz">Feliz</button><button data-e="sorpresa">Sorpresa</button><button data-e="dormir">Dormir</button></div><div class="barra">En la barra de abajo: <span id="c"></span></div></div>
<div><ul>
<li><b>Gestos dibujados con luz:</b> al cambiar de expresión, cada línea se borra y se vuelve a trazar, como luz que escribe por dentro del vidrio.</li>
<li><b>Calma:</b> se mueve lento y suave, sin rebotes. Es el más tranquilo de todos.</li>
<li><b>La luz respira:</b> el brillo de adentro sube y baja despacio y se enciende más al hablar.</li>
<li><b>Parpadeo:</b> las líneas de los ojos se encogen hasta un punto de luz y vuelven.</li>
<li><b>Feliz, sorpresa y dormir:</b> en feliz los ojos se curvan y las cejas suben; en sorpresa los ojos se alargan y la boca dibuja una "o"; al dormir los ojos quedan cerrados y la luz baja.</li>
</ul>
<p class="ref">Cada modelo se mueve a su manera: el orbe flota, el slime tiembla, el androide se mueve con motores y el cyberpunk va a saltos digitales y el de vidrio dibuja sus gestos con luz.</p></div></div>
</div>
<script>
${js}
(function(){ var CAS='${b64('vidrio-capa-casco.jpg')}', CAB='${b64('vidrio-capa-cabeza.jpg')}'; Promise.all([crearVidrioCapas(document.getElementById('o'),CAS,CAB),crearVidrioCapas(document.getElementById('c'),CAS,CAB)]).then(function(A){ var o=A[0], c=A[1];
 var seq=['reposo','hablar','feliz','reposo','sorpresa','hablar','dormir'], k=0, auto=true, btns=document.querySelectorAll('#b button');
 function poner(e){ o.estado(e); c.estado(e); btns.forEach(function(b){ b.classList.toggle('on',b.dataset.e===e); }); }
 poner('reposo'); setInterval(function(){ if(!auto) return; k=(k+1)%seq.length; poner(seq[k]); },2600);
 document.getElementById('b').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ auto=false; poner(b.dataset.e); } }); }); })();
</script>
`;
fs.mkdirSync('vidriopub',{recursive:true}); fs.writeFileSync('vidriopub/index.html',html); fs.writeFileSync(V+'vector/vidrio-capas-pub.html',html); console.log(html.length);
