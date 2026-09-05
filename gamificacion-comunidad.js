// documentos, cada apertura de "Comunidad" (o cada intento de votar) leía la
// colección ENTERA solo para contar cuántos hay — con el proyecto acercándose a
// 5.000 usuarios de verdad, eso son miles de lecturas de Firestore por un solo
// clic (el cupo gratis diario es 50.000 lecturas TOTALES para toda la app). Se
// mantiene un contador aparte (`meta/contadores.totalUsuarios`), incrementado en
// reg() solo cuando el usuario es realmente nuevo (no en cada login).
async function _totalUsuariosSuscritos(){
  try{ const doc=await db.collection('meta').doc('contadores').get(); return (doc.exists && doc.data().totalUsuarios) || 0; }catch(e){ return 0; }
}
var LP_FUNDADORES_CUPO=1000;
async function mostrarFundadores(){
  _modalVolverA=null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-medal"></i> Socios Fundadores';
  const c=document.getElementById('modalContent');
  c.innerHTML=_btnVolverModal()+'<p style="color:#888">Cargando...</p>';
  document.getElementById('userModal').classList.add('on');
  let miNum=null, total=0, primeros=[];
  try{ const t=await db.collection('users').count().get(); total=t.data().count||0; }catch(e){}
  try{ if(cu){ const me=await db.collection('users').doc(cu).get(); const myTs=me.exists?me.data().createdAt:null; if(myTs){ const agg=await db.collection('users').where('createdAt','<',myTs).count().get(); miNum=(agg.data().count||0)+1; } } }catch(e){}
  try{ const snap=await db.collection('users').orderBy('createdAt','asc').limit(60).get(); snap.forEach(function(doc){ const d=doc.data(); primeros.push({id:doc.id, nombre:d.nombre||'Ciclista'}); }); }catch(e){}
  const cupoUsado=Math.min(total,LP_FUNDADORES_CUPO);
  const quedan=Math.max(0,LP_FUNDADORES_CUPO-total);
  const soyFundador=miNum && miNum<=LP_FUNDADORES_CUPO;
  let html=_btnVolverModal();
  if(cu && miNum){
    if(soyFundador){
      html+='<div style="background:linear-gradient(135deg,#3a2f00,#1a1500);border:1px solid var(--g);border-radius:12px;padding:14px;text-align:center;margin-bottom:12px"><div style="margin-bottom:2px"><svg viewBox="0 0 64 64" width="52" height="52" xmlns="http://www.w3.org/2000/svg"><path d="M32 6 l2.3 4.7 5.2 .7 -3.8 3.6 .9 5.1 -4.6-2.4 -4.6 2.4 .9-5.1 -3.8-3.6 5.2-.7z" fill="#ffd700"/><path d="M13 37 Q11 27 18 22" stroke="#ffd700" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M51 37 Q53 27 46 22" stroke="#ffd700" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="32" cy="37" r="17" fill="#241c00" stroke="#ffd700" stroke-width="2.5"/><circle cx="32" cy="37" r="12.5" fill="none" stroke="#fc4c02" stroke-width="1.4" opacity="0.75"/><path d="M22 39 Q22 30 32 30 Q42 30 42 39 Z" fill="#fc4c02"/><path d="M21.5 39.5 Q32 43.5 42.5 39.5 L42.5 37.8 Q32 41.5 21.5 37.8 Z" fill="rgba(0,0,0,0.35)"/><path d="M32 24 L32 30" stroke="#ffd700" stroke-width="2.4" stroke-linecap="round"/><circle cx="27.5" cy="40" r="2.4" fill="#fff"/><circle cx="36.5" cy="40" r="2.4" fill="#fff"/></svg></div><div style="font-weight:800;color:var(--g);font-size:1rem;margin-top:4px">Socio Fundador</div><div style="font-size:0.74rem;color:#cdd6e6;margin-top:4px">Eres de los primeros '+LP_FUNDADORES_CUPO+'. Tu lugar es tuyo para siempre.</div></div>';
    } else {
      html+='<div style="background:var(--gl);border:1px solid #2a3240;border-radius:12px;padding:14px;text-align:center;margin-bottom:12px"><div style="font-weight:800;color:var(--p);font-size:0.95rem">Ya eres parte de la comunidad</div><div style="font-size:0.74rem;color:#9fb3c8;margin-top:4px">El cupo de Fundador (primeros '+LP_FUNDADORES_CUPO+') ya se llenó, pero tu lugar en la historia queda.</div></div>';
    }
  }
  const pctF=Math.round((cupoUsado/LP_FUNDADORES_CUPO)*100);
  html+='<div style="background:var(--gl);padding:12px;border-radius:10px;margin-bottom:12px"><div style="font-size:0.78rem;color:#9fb3c8;text-align:center">Los <strong style="color:var(--p)">primeros '+LP_FUNDADORES_CUPO+'</strong> ciclistas son Socios Fundadores — un lugar que no se vuelve a dar.</div></div>';
  html+='<h4 style="color:var(--p);font-size:0.85rem;margin:0 0 6px">Beneficios de por vida</h4><ul style="font-size:0.76rem;color:#cdd6e6;line-height:1.6;margin:0 0 12px;padding-left:18px"><li>Insignia de fundador única (no se vuelve a dar)</li><li>Más Darma por cada acción</li><li>Acceso anticipado a lo nuevo</li><li>Entradas extra y prioridad en los sorteos de la comunidad</li></ul>';
  html+='<h4 style="color:var(--p);font-size:0.85rem;margin:0 0 6px"><i class="fas fa-trophy"></i> Muro de Fundadores</h4>';
  primeros.forEach(function(f,i){ const medal=i<3?['#ffd700','#c0c0c0','#cd7f32'][i]:null; html+='<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-bottom:1px solid #15202e"><div style="width:26px;text-align:center;font-weight:800;color:'+(medal||'#7d8ba0')+'">'+(medal?'<i class=\'fas fa-medal\'></i>':(i+1))+'</div><div style="flex:1;font-size:0.82rem;color:#dfe7ff">'+escapeHTML(f.nombre)+(f.id===cu?' <span style="color:var(--g)">(tú)</span>':'')+'</div></div>'; });
  if(!cu) html+='<p style="color:#888;font-size:0.8rem;margin-top:10px">Inicia sesión para ver tu insignia de fundador.</p>';
  c.innerHTML=html;
}
async function mostrarComunidad(){
  _modalVolverA=null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-handshake"></i> Comunidad Libre Pedal';
  const c=document.getElementById('modalContent');
  c.innerHTML=_btnVolverModal()+'<p style="color:#888">Cargando...</p>';
  document.getElementById('userModal').classList.add('on');
  const META=5000;
  const total=await _totalUsuariosSuscritos();
  const pct=Math.min(100,Math.round((total/META)*100));
  const opciones=[
    {id:'reforestar',texto:'🌳 Reforestar zonas naturales'},
    {id:'seguridad',texto:'🚨 Botón SOS con central de emergencia'},
    {id:'bicis',texto:'🚲 Bicicletas y accesorios para quien no tiene'},
    {id:'deportistas',texto:'🏆 Apoyo a deportistas ciclistas'}
  ];
  let votos={}; opciones.forEach(function(o){ votos[o.id]=0; });
  let miVoto=null;
  try{
    // 2026-08-23: antes se traía la colección ENTERA para contar los votos a mano en el
    // teléfono. Con 5.000 votantes eran 5.000 lecturas cada vez que alguien abría
    // Comunidad — y esto lo puede disparar cualquier usuario, no solo el admin.
    // Ahora: un count() por opción (Firestore cobra 1 lectura por cada 1.000 documentos
    // contados, no una por documento) + UN solo doc para saber qué votaste vos.
    // Son ~6 lecturas en vez de N, y deja de crecer con la comunidad.
    // Mismo patrón que ya usaba el sorteo acá abajo, incluido el respaldo por si count()
    // no está disponible.
    // Se cuenta cuántos count() salieron bien: si NINGUNO funciona (p.ej. un SDK sin
    // agregaciones), hay que caer al respaldo. Con un catch por opción y nada más, los
    // cinco fallaban en silencio, el catch de afuera no se enteraba y la pantalla mostraba
    // CERO votos en todo — peor que la lectura cara que estamos evitando.
    let conteosOk=0;
    await Promise.all(opciones.map(async function(o){
      try{
        const a=await db.collection('votacionComunidad').where('opcion','==',o.id).count().get();
        votos[o.id]=a.data().count||0; conteosOk++;
      }catch(e){}
    }));
    if(!conteosOk) throw new Error('sin agregaciones');
    const mio=await db.collection('votacionComunidad').doc(cu).get();
    if(mio.exists) miVoto=mio.data().opcion;
  }catch(eCount){
    try{
      const snap=await db.collection('votacionComunidad').get();
      snap.forEach(function(doc){ const d=doc.data(); if(votos[d.opcion]!=null) votos[d.opcion]++; if(doc.id===cu) miVoto=d.opcion; });
    }catch(e){}
  }
  const totalVotos=Object.values(votos).reduce(function(a,b){return a+b;},0)||1;
  let sorteoTotal=0, yaParticipo=false;
  try{
    // Total por count() (0 docs) + un solo doc para saber si participaste, en vez de leer TODO el sorteo.
    const agg=await db.collection('sorteoComunidad').count().get(); sorteoTotal=agg.data().count||0;
    const mine=await db.collection('sorteoComunidad').doc(cu).get(); yaParticipo=mine.exists;
  }catch(eCount){
    try{ const snap=await db.collection('sorteoComunidad').get(); sorteoTotal=snap.size; snap.forEach(function(doc){ if(doc.id===cu) yaParticipo=true; }); }catch(e){}
  }
  // La votación está ABIERTA desde ya (antes esperaba a los 5.000 usuarios) — así
  // la gente participa desde ahora, y al llegar a la meta ya hay votos reales
  // acumulados para saber qué decidió la comunidad de verdad.
  let html=_btnVolverModal();
  const ACTIVA_VOTACION=1000; // la votacion se activa a los 1000; el conteo NO se muestra (pedido de Inty)
  if(total < ACTIVA_VOTACION){
    html+='<div style="background:var(--gl);padding:16px;border-radius:12px;margin-bottom:12px;text-align:center"><div style="font-size:1.6rem;color:var(--p)"><i class="fas fa-lock"></i></div><h4 style="color:var(--p);font-size:0.9rem;margin:8px 0 4px">La votación se activa pronto</h4><p style="font-size:0.78rem;color:#9fb3c8;margin:0">Cuando la comunidad crezca lo suficiente, entre todos decidimos en qué invertir. Sigue pedaleando y aportando — tu voz va a contar.</p></div>';
  } else {
    html+='<h4 style="color:var(--p);font-size:0.85rem;margin-bottom:6px">¿En qué priorizamos como comunidad?</h4><p style="font-size:0.72rem;color:#8aa;margin:0 0 8px">Vota — entre todos decidimos en qué se invierte.</p>';
    opciones.forEach(function(o){
      const p=Math.round((votos[o.id]/totalVotos)*100), sel=(miVoto===o.id);
      html+='<div class="custom-option'+(sel?' selected':'')+'" style="text-align:left;margin-bottom:6px;padding:10px" onclick="votarComunidad(\''+o.id+'\')">'+(sel?'<div class="check">OK</div>':'')+'<strong style="font-size:0.85rem">'+o.texto+'</strong><div style="background:#111;border-radius:6px;height:7px;margin-top:5px;overflow:hidden"><div style="background:var(--g);height:100%;width:'+p+'%"></div></div><div style="font-size:0.68rem;color:#8aa;margin-top:2px">'+p+'%</div></div>';
    });
    html+='<div style="margin-top:16px;padding:12px;border-radius:10px;background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(252,76,2,0.08));border:1px solid var(--g)"><h4 style="color:var(--g);font-size:0.9rem;margin:0 0 6px"><i class="fas fa-gift"></i> Sorteo de la comunidad</h4><p style="font-size:0.78rem;color:#9fb3c8;margin:0 0 8px">Se ofrece <strong style="color:#dfe7ff">2 veces al año</strong>. Para que sea justo: una participación por persona, y el premio y la fecha se anuncian a toda la comunidad antes de sortear.</p>'+(yaParticipo?'<button class="ab sec" disabled onclick="return false"><i class="fas fa-circle-check"></i> Ya estás participando</button>':'<button class="ab" onclick="participarSorteo()"><i class="fas fa-champagne-glasses"></i> Anotarme al sorteo</button>')+'</div>';
  }
    // Frases de la comunidad: cada ciclista puede aportar su frase para que Pistero la
  // diga en la app. Queda en revisión hasta que el admin la aprueba (no sale de inmediato).
  html+='<div style="margin-top:16px;padding:12px;border-radius:10px;background:var(--gl)">'+
    '<h4 style="color:var(--p);font-size:0.9rem;margin:0 0 6px"><i class="fas fa-pen"></i> Agrega tus mejores frases</h4>'+
    '<p style="font-size:0.75rem;color:#9fb3c8;margin:0 0 8px">Escribe una frase para que Pistero la diga en la app. Queda en revisión antes de salir para todos.</p>'+
    '<textarea id="fraseComunidadInput" rows="2" maxlength="140" placeholder="Ej: A este paso llegamos antes que el bus..."></textarea>'+
    '<button class="ab" style="margin-top:6px" onclick="enviarFraseComunidad()">Enviar frase</button>'+
    '<div id="misFrasesComunidad" style="margin-top:10px"></div>'+
    '</div>';
  if(cu===ADMIN_ID){
    let pendientes=0;
    try{ const psnap=await db.collection('frasesComunidad').where('aprobada','==',false).get(); pendientes=psnap.size; }catch(e){}
    html+='<button class="ab sec" style="margin-top:10px" onclick="mostrarRevisionFrases()"><i class="fas fa-magnifying-glass"></i> Revisar frases pendientes ('+pendientes+')</button>';
  }
  c.innerHTML=html;
  renderMisFrasesComunidad();
}
async function enviarFraseComunidad(){
  const inp=document.getElementById('fraseComunidadInput'); if(!inp||!cu) return;
  const texto=inp.value.trim();
  if(!texto) return;
  if(texto.length>140){ lpAviso('Máximo 140 caracteres.'); return; }
  if(_enviandoFrase) return; _enviandoFrase=true;
  try{
    await db.collection('frasesComunidad').add({user:cu, nombre:nombreUsuario||'Ciclista', texto:texto, aprobada:false, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()});
    inp.value='';
    h('¡Gracias! Tu frase queda en revisión.');
    renderMisFrasesComunidad();
  }catch(e){ lpAviso('No se pudo enviar tu frase, intenta de nuevo.'); }
  finally{ _enviandoFrase=false; }
}
async function renderMisFrasesComunidad(){
  const c=document.getElementById('misFrasesComunidad'); if(!c||!cu) return;
  try{
    const snap=await db.collection('frasesComunidad').where('user','==',cu).get();
    const arr=snap.docs.map(function(d){return d.data();}).sort(function(a,b){ return ((b.ts&&b.ts.seconds)||0)-((a.ts&&a.ts.seconds)||0); });
    if(arr.length===0){ c.innerHTML=''; return; }
    c.innerHTML='<div style="font-size:0.72rem;color:#8aa;margin-bottom:4px">Tus frases enviadas:</div>'+arr.map(function(f){
      const estado=f.aprobada?'✅ Ya suena en la app':'⏳ En revisión';
      return '<div style="background:#111;border-radius:8px;padding:8px;margin-bottom:5px;font-size:0.78rem"><div>"'+escapeHTML(f.texto)+'"</div><div style="color:#8aa;font-size:0.68rem;margin-top:3px">'+estado+'</div></div>';
    }).join('');
  }catch(e){}
}
async function mostrarRevisionFrases(){
  if(cu!==ADMIN_ID) return;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-magnifying-glass"></i> Revisar frases de la comunidad';
  const c=document.getElementById('modalContent');
  c.innerHTML='<p style="color:#888">Cargando...</p>';
  try{
    const snap=await db.collection('frasesComunidad').where('aprobada','==',false).get();
    const arr=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());}).sort(function(a,b){ return ((a.ts&&a.ts.seconds)||0)-((b.ts&&b.ts.seconds)||0); });
    if(arr.length===0){ c.innerHTML='<p style="color:#888">No hay frases pendientes.</p><button class="ab sec" style="margin-top:10px" onclick="mostrarComunidad()"><i class="fas fa-arrow-left"></i> Volver</button>'; return; }
    let html=arr.map(function(f){
      return '<div style="background:var(--gl);border-radius:10px;padding:10px;margin-bottom:8px"><div style="font-size:0.85rem">"'+escapeHTML(f.texto)+'"</div><div style="color:#8aa;font-size:0.68rem;margin:4px 0 8px">de '+escapeHTML(f.nombre||'Ciclista')+'</div><div style="display:flex;gap:6px"><button class="ab" style="margin:0;width:auto;padding:6px 12px;font-size:0.75rem" onclick="aprobarFrase(\''+f.id+'\')"><i class="fas fa-circle-check"></i> Aprobar</button><button class="ab sec" style="margin:0;width:auto;padding:6px 12px;font-size:0.75rem;background:#dc2626;color:#fff" onclick="rechazarFrase(\''+f.id+'\')"><i class="fas fa-xmark"></i> Rechazar</button></div></div>';
    }).join('');
    html+='<button class="ab sec" style="margin-top:6px" onclick="mostrarComunidad()"><i class="fas fa-arrow-left"></i> Volver</button>';
    c.innerHTML=html;
  }catch(e){ c.innerHTML='<p style="color:#888">No se pudieron cargar las frases pendientes.</p>'; }
}
async function aprobarFrase(id){
  // Agrega solo la frase recién aprobada al pool en vez de releer TODA la colección
  // de nuevo (cargarFrasesComunidad hacía un .get() completo en cada aprobación).
  try{
    await db.collection('frasesComunidad').doc(id).update({aprobada:true});
    const doc=await db.collection('frasesComunidad').doc(id).get();
    const t=doc.exists?doc.data().texto:null;
    if(t){
      if(frasesNormal.indexOf(t)===-1) frasesNormal.push(t);
      if(frasesNeutro.normal.indexOf(t)===-1) frasesNeutro.normal.push(t);
    }
    h('Frase aprobada, ya suena en la app.'); mostrarRevisionFrases();
  }catch(e){ lpAviso('No se pudo aprobar.'); }
}
async function rechazarFrase(id){
  if(!await lpConfirmar('¿Eliminar esta frase?')) return;
  try{ await db.collection('frasesComunidad').doc(id).delete(); mostrarRevisionFrases(); }catch(e){ lpAviso('No se pudo eliminar.'); }
}
// La votación ya NO espera a los 5.000 usuarios — Inty: "eso le da a la gente
// participación, luego cuando seamos 5.000 ya tendremos los votos y se hará la
// que diga la comunidad". Ahora se puede votar desde ya; lo que se gatea a los
// 5.000 es la EJECUCIÓN de la opción ganadora (y el sorteo, que sigue igual).
async function votarComunidad(opcionId){
  if(!cu) return;
  try{ await db.collection('votacionComunidad').doc(cu).set({opcion:opcionId,ts:firebase.firestore.FieldValue.serverTimestamp()}); h('¡Voto registrado! Gracias por construir la comunidad.'); mostrarComunidad(); }catch(e){ lpAviso('No se pudo registrar tu voto, intenta de nuevo.'); }
}
async function participarSorteo(){
  if(!cu) return;
  try{ await db.collection('sorteoComunidad').doc(cu).set({nombre:nombreUsuario||'Ciclista',ts:firebase.firestore.FieldValue.serverTimestamp()}); h('¡Listo, quedaste anotado en el sorteo!'); mostrarComunidad(); }catch(e){ lpAviso('No se pudo registrar tu participación, intenta de nuevo.'); }
}
async function reporteDeViaje(){
  if(!addedDests || addedDests.length===0){ lpAviso('Agrega al menos un destino primero'); return; }
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-map-location-dot"></i> Reporte del viaje';
  const c=document.getElementById('modalContent'); c.innerHTML='<p style="color:#888">Preparando el reporte y el clima de cada parada...</p>'; document.getElementById('userModal').classList.add('on');
  let html='<div style="background:var(--gl);padding:10px;border-radius:10px;margin-bottom:10px"><strong style="color:var(--p)"><i class="fas fa-location-dot"></i> Paradas ('+addedDests.length+')</strong>';
  addedDests.forEach(function(d,i){ html+='<div style="font-size:0.85rem;padding:3px 0;border-bottom:1px solid #222">'+(i+1)+'. '+escapeHTML(d.name)+(d.addr?(' — '+escapeHTML(d.addr)):'')+'</div>'; });
  html+='</div>';
  let vozResumen='';
  // Clima de CADA parada (no solo la última), geolocalizando las que aún no tengan coordenadas.
  for(let i=0;i<addedDests.length;i++){
    const d=addedDests[i];
    let lat=d.lat, lon=d.lon;
    if(!lat||!lon){ try{ const g=await geocodeDestino(d.addr||d.name); if(g){ lat=g.lat; lon=g.lon; } }catch(e){} }
    if(!lat||!lon){ html+='<div style="background:var(--gl);padding:8px;border-radius:8px;margin-bottom:6px"><strong style="font-size:0.85rem">'+(i+1)+'. '+escapeHTML(d.name)+'</strong><div style="color:#888;font-size:0.78rem">No pude ubicar esta parada para el clima.</div></div>'; continue; }
    const w=await climaDeZona(lat,lon);
    if(w && w.current){
      html+='<div style="background:rgba(252,76,2,0.08);border:1px solid var(--p);padding:10px;border-radius:10px;margin-bottom:8px"><strong style="color:var(--p);font-size:0.85rem"><i class="fas fa-cloud-sun"></i> '+(i+1)+'. '+escapeHTML(d.name)+'</strong>';
      html+='<div style="font-size:1.3rem;font-weight:800;margin:4px 0">'+Math.round(w.current.temperature_2m)+'° · '+wmoTexto(w.current.weather_code)+'</div>';
      html+='<div style="font-size:0.78rem;color:#9fb3c8">Viento '+Math.round(w.current.wind_speed_10m)+' km/h</div>';
      if(w.daily && w.daily.time){ const dias=['Hoy','Mañana','Pasado']; html+='<div style="margin-top:8px;display:flex;gap:6px">'; for(let k=0;k<3&&k<w.daily.time.length;k++){ html+='<div style="flex:1;background:var(--gl);border-radius:8px;padding:6px;text-align:center"><div style="font-size:0.7rem;color:#8aa">'+dias[k]+'</div><div style="font-weight:700;font-size:0.8rem">'+Math.round(w.daily.temperature_2m_max[k])+'° / '+Math.round(w.daily.temperature_2m_min[k])+'°</div><div style="font-size:0.62rem;color:#7dd">'+wmoTexto(w.daily.weather_code[k])+'</div><div style="font-size:0.62rem;color:#6ad"><i class="fas fa-umbrella"></i> '+(w.daily.precipitation_probability_max[k]||0)+'%</div></div>'; } html+='</div>'; }
      html+='<div style="font-size:0.6rem;color:#556;margin-top:6px">Datos en vivo · Open-Meteo</div></div>';
      if(i===addedDests.length-1){ const lluvia=(w.daily&&w.daily.precipitation_probability_max&&w.daily.precipitation_probability_max[0])||0; vozResumen='En '+(d.name||'tu destino')+' hay '+Math.round(w.current.temperature_2m)+' grados, '+wmoTexto(w.current.weather_code)+(lluvia>50?'. Ojo, alta probabilidad de lluvia, lleva capa.':'.'); }
    } else { html+='<div style="background:var(--gl);padding:8px;border-radius:8px;margin-bottom:6px"><strong style="font-size:0.85rem">'+(i+1)+'. '+escapeHTML(d.name)+'</strong><div style="color:#888;font-size:0.78rem">No pude traer el clima de esta parada ahora.</div></div>'; }
  }
  c.innerHTML=html;
  if(vozResumen) h('Reporte listo. '+vozResumen);
}
