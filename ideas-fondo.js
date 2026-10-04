/* ===== IDEAS PARA EL FONDO DE LA COMUNIDAD (2026-10-04, pedido de Inty) =====
   Cada usuario deja SU idea de qué hacer con el fondo que se junte con las
   suscripciones; después la comunidad vota cuáles se hacen.

   Datos (Firestore):
   - ideasFondo/{uid}  -> UNA idea por usuario (editable): {user, nombre, texto,
                          categoria, clave, ts}. `clave` = texto normalizado (sin
                          tildes, sin palabras vacías, palabras ordenadas) para
                          detectar ideas REPETIDAS aunque estén escritas distinto.
   - votosFondo/{uid}  -> UN voto por suscriptor: {idea: <uid del autor>, ts}.
                          La regla de Firestore exige users/{uid}.premium.activo,
                          que solo escribe el worker de compras: el voto cuenta
                          solo con suscripción activa, no se puede falsear desde
                          el cliente.
   Conteo: count() por idea/categoría (1 lectura por cada 1.000 docs), igual que
   la votación de comunidad en gamificacion-comunidad.js. */

var IDEAS_FONDO_CATS=[
  {id:'ciclovias',n:'Ciclovías y calles seguras',i:'fa-road'},
  {id:'bicicleteros',n:'Bicicleteros y estacionamientos',i:'fa-square-parking'},
  {id:'talleres',n:'Talleres y reparación gratis',i:'fa-screwdriver-wrench'},
  {id:'bicis',n:'Bicis para quien no tiene',i:'fa-bicycle'},
  {id:'seguridad',n:'Seguridad y SOS',i:'fa-shield-halved'},
  {id:'rodadas',n:'Rodadas y eventos',i:'fa-people-group'},
  {id:'naturaleza',n:'Naturaleza y reforestar',i:'fa-tree'},
  {id:'otra',n:'Otra idea',i:'fa-lightbulb'}
];
var IDEAS_FONDO_MAX=280;
var _IDEA_VACIAS=['de','la','el','los','las','un','una','unos','unas','y','o','u','para','en','con','que','a','al','del','por','se','lo','mas','muy','mi','mis','su','sus','es','son','hay','como','todo','todos','toda','todas','esto','este','esta','ese','esa','me','nos','les','le','ya','si','no','pero','sin','sobre','entre','hacer','poner','tener','mas','menos','creo','seria','sería','podria','podría','ojala','ojalá','idea','quiero','gustaria','gustaría'];

// "Más ciclovías seguras en Santiago!!" y "ciclovias en santiago, seguras" -> misma clave
function _ideaClave(t){
  var w=String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9ñ\s]/g,' ').split(/\s+/)
    .filter(function(x){ return x.length>2 && _IDEA_VACIAS.indexOf(x)===-1; })
    .map(function(x){ return x.length>4 ? x.replace(/(es|s)$/,'') : x; });
  var u=[]; w.forEach(function(x){ if(u.indexOf(x)===-1) u.push(x); });
  return u.sort().join(' ').slice(0,120);
}
// Suscripción REAL (no el atajo de voz-motor.js, que hoy deja todo libre): el voto
// solo vale con us.premium activo, escrito por el worker de compras.
function _tieneSuscripcionActiva(){
  return !!(typeof us!=='undefined' && us && us.premium && us.premium.activo && (!us.premium.expira || us.premium.expira > Date.now()));
}

var _ideaCatSel='';
// Tarjeta plegada: no interrumpe la bienvenida; se abre solo si el usuario quiere.
function _ideaFondoTarjetaHTML(){
  return '<div class="idea-fondo" id="ideaFondo">'
    +'<button type="button" class="idea-fondo-cab" onclick="_ideaFondoAbrir()" aria-expanded="false"><i class="fas fa-lightbulb"></i><span><b>¿Qué hacemos con el fondo de la comunidad?</b><small>Opcional · deja tu idea en 1 minuto</small></span><i class="fas fa-chevron-down idea-fondo-chev"></i></button>'
    +'<div class="idea-fondo-cuerpo">'
      +'<p>Con las suscripciones juntamos un fondo. Cuando llegue a un monto importante, lo usamos en lo que decida la comunidad. ¿Tú qué harías?</p>'
      +'<div class="idea-fondo-cats">'+IDEAS_FONDO_CATS.map(function(c){ return '<button type="button" class="idea-cat" data-cat="'+c.id+'" onclick="_ideaFondoCat(\''+c.id+'\')"><i class="fas '+c.i+'"></i> '+c.n+'</button>'; }).join('')+'</div>'
      +'<textarea id="ideaFondoTexto" rows="3" maxlength="'+IDEAS_FONDO_MAX+'" placeholder="Ej: un taller gratis de reparación en mi comuna"></textarea>'
      +'<button type="button" class="ab" onclick="enviarIdeaFondo()"><i class="fas fa-paper-plane"></i> Enviar mi idea</button>'
      +'<p class="idea-fondo-nota"><i class="fas fa-circle-info"></i> Votan quienes tienen <b>suscripción activa</b>: cada suscripción es un voto. El fondo existe solo si la gente se suscribe; sin suscripciones no hay fondo que repartir.</p>'
    +'</div></div>';
}
function _ideaFondoAbrir(){
  var el=document.getElementById('ideaFondo'); if(!el) return;
  var abierto=el.classList.toggle('abierto');
  var b=el.querySelector('.idea-fondo-cab'); if(b) b.setAttribute('aria-expanded', abierto?'true':'false');
  if(abierto && cu){ // si ya dejó una idea antes, se la mostramos para editarla
    db.collection('ideasFondo').doc(cu).get().then(function(d){
      if(!d.exists) return; var x=d.data()||{}, t=document.getElementById('ideaFondoTexto');
      if(t && !t.value) t.value=x.texto||''; if(x.categoria) _ideaFondoCat(x.categoria);
    }).catch(function(e){ console.warn('[ideas-fondo] no se pudo leer tu idea anterior', e); });
  }
}
function _ideaFondoCat(id){
  _ideaCatSel=(_ideaCatSel===id)?'':id;
  document.querySelectorAll('#ideaFondo .idea-cat').forEach(function(b){ b.classList.toggle('sel', b.getAttribute('data-cat')===_ideaCatSel); });
}
async function enviarIdeaFondo(){
  if(!cu){ lpAviso('Inicia sesión para dejar tu idea.'); return; }
  var t=document.getElementById('ideaFondoTexto'), texto=(t&&t.value||'').trim().slice(0,IDEAS_FONDO_MAX);
  if(texto.length<8){ lpAviso('Cuéntanos un poco más tu idea (al menos unas palabras).'); return; }
  try{
    await db.collection('ideasFondo').doc(cu).set({user:cu,nombre:String(nombreUsuario||'Ciclista').slice(0,60),texto:texto,
      categoria:_ideaCatSel||'otra',clave:_ideaClave(texto),ts:firebase.firestore.FieldValue.serverTimestamp()});
    var el=document.getElementById('ideaFondo');
    if(el) el.querySelector('.idea-fondo-cuerpo').innerHTML='<p class="idea-fondo-ok"><i class="fas fa-circle-check"></i> ¡Gracias! Tu idea quedó guardada. Puedes cambiarla cuando quieras en <b>Comunidad</b>.</p>';
    if(typeof h==='function') h('Gracias por tu idea. Entre todos decidimos qué se hace con el fondo.');
  }catch(e){ console.warn('[ideas-fondo] no se pudo guardar la idea', e); lpAviso('No se pudo guardar tu idea, intenta de nuevo.'); }
}

// Sección para el modal de Comunidad: ideas más votadas + temas que más se repiten.
async function _ideasFondoSeccionHTML(){
  var html='<div class="idea-fondo-sec"><h4><i class="fas fa-lightbulb"></i> Ideas para el fondo</h4>'
    +'<p class="idea-fondo-sub">Las propone la comunidad. Votan quienes tienen suscripción activa: un voto por suscripción.</p>';
  try{
    // temas que más se repiten (count por categoría)
    var porCat=await Promise.all(IDEAS_FONDO_CATS.map(function(c){ return db.collection('ideasFondo').where('categoria','==',c.id).count().get().then(function(a){ return {c:c,n:a.data().count||0}; }).catch(function(){ return {c:c,n:0}; }); }));
    var totalIdeas=porCat.reduce(function(s,x){return s+x.n;},0);
    if(totalIdeas){
      porCat.sort(function(a,b){return b.n-a.n;});
      html+='<div class="idea-temas">'+porCat.filter(function(x){return x.n;}).map(function(x){ var p=Math.round(x.n/totalIdeas*100); return '<div class="idea-tema"><span><i class="fas '+x.c.i+'"></i> '+x.c.n+'</span><b>'+x.n+'</b><div class="idea-barra"><div style="width:'+p+'%"></div></div></div>'; }).join('')+'</div>';
    }
    // ideas recientes + sus votos
    var snap=await db.collection('ideasFondo').orderBy('ts','desc').limit(25).get();
    var ideas=[]; snap.forEach(function(d){ ideas.push(Object.assign({id:d.id},d.data())); });
    var miVoto=null; if(cu){ try{ var mv=await db.collection('votosFondo').doc(cu).get(); if(mv.exists) miVoto=mv.data().idea; }catch(e){ console.warn('[ideas-fondo] no se pudo leer tu voto', e); } }
    await Promise.all(ideas.map(function(it){ return db.collection('votosFondo').where('idea','==',it.id).count().get().then(function(a){ it.votos=a.data().count||0; }).catch(function(){ it.votos=0; }); }));
    // repetidas: misma clave = misma idea escrita distinto; se muestran juntas
    var grupos={}; ideas.forEach(function(it){ var k=it.clave||it.id; (grupos[k]=grupos[k]||[]).push(it); });
    var lista=Object.keys(grupos).map(function(k){ var g=grupos[k]; g.sort(function(a,b){return (b.votos||0)-(a.votos||0);}); return {top:g[0],igual:g.length,votos:g.reduce(function(s,x){return s+(x.votos||0);},0)}; });
    lista.sort(function(a,b){ return (b.votos-a.votos)||(b.igual-a.igual); });
    var sus=_tieneSuscripcionActiva();
    if(!lista.length) html+='<p class="idea-fondo-sub">Aún no hay ideas. ¡Sé la primera persona en proponer!</p>';
    lista.slice(0,12).forEach(function(g){
      var it=g.top, cat=IDEAS_FONDO_CATS.find(function(c){return c.id===it.categoria;})||IDEAS_FONDO_CATS[IDEAS_FONDO_CATS.length-1], mio=(miVoto===it.id);
      html+='<div class="idea-item'+(mio?' sel':'')+'"><div class="idea-txt"><i class="fas '+cat.i+'"></i> '+escapeHTML(it.texto)+'<small>'+escapeHTML(it.nombre||'Ciclista')+(g.igual>1?' · <b>'+g.igual+' personas propusieron lo mismo</b>':'')+'</small></div>'
        +'<button type="button" class="idea-votar" '+(sus?'onclick="votarIdeaFondo(\''+escapeHTML(it.id)+'\')"':'disabled title="Necesitas suscripción activa para votar"')+'><i class="fas '+(sus?(mio?'fa-circle-check':'fa-thumbs-up'):'fa-lock')+'"></i> '+g.votos+'</button></div>';
    });
    if(!sus) html+='<p class="idea-fondo-nota"><i class="fas fa-lock"></i> Para votar necesitas una suscripción activa. Cada suscripción suma al fondo y vale un voto: sin suscripciones no hay fondo.</p>';
  }catch(e){ console.warn('[ideas-fondo] no se pudieron cargar las ideas', e); html+='<p class="idea-fondo-sub">No se pudieron cargar las ideas ahora.</p>'; }
  html+=_ideaFondoTarjetaHTML()+'</div>';
  return html;
}
async function votarIdeaFondo(ideaId){
  if(!cu) return;
  if(!_tieneSuscripcionActiva()){ lpAviso('Para votar necesitas una suscripción activa: cada suscripción es un voto y suma al fondo.'); return; }
  try{ await db.collection('votosFondo').doc(cu).set({idea:String(ideaId).slice(0,120),ts:firebase.firestore.FieldValue.serverTimestamp()}); if(typeof h==='function') h('¡Voto registrado!'); if(typeof mostrarComunidad==='function') mostrarComunidad(); }
  catch(e){ console.warn('[ideas-fondo] no se pudo votar', e); lpAviso('No se pudo registrar tu voto, intenta de nuevo.'); }
}
