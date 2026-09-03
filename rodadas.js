/* ===== RODADAS GRUPALES =====
   Estilo Strava Clubs (protocolo de excelencia): antes solo se podía avisar un
   punto de encuentro en texto libre — nadie sabía qué ruta se iba a andar hasta
   llegar. Se puede adjuntar (opcional) una de las rutas YA grabadas por quien
   organiza: reutiliza lo que ya existe (rutasLocales) en vez de armar un
   planificador de rutas nuevo. Se guarda solo un RESUMEN liviano (nombre,
   distancia, desnivel si ya se calculó) — nunca el trazado completo (miles de
   puntos GPS), para no inflar el documento ni las lecturas del listado. */
async function crearRodada(){
  const titulo=(document.getElementById('rodadaTitulo').value||'').trim();
  const desc=(document.getElementById('rodadaDesc').value||'').trim();
  const puntoEncuentro=(document.getElementById('rodadaPunto').value||'').trim();
  const fechaStr=document.getElementById('rodadaFecha').value;
  if(!titulo || !puntoEncuentro || !fechaStr){ lpAviso('Completa título, punto de encuentro y fecha'); return; }
  const fecha=new Date(fechaStr).getTime();
  if(!fecha || isNaN(fecha)){ lpAviso('Fecha inválida'); return; }
  if(fecha < Date.now()-3600000){ lpAviso('Esa fecha ya pasó. Pon una fecha futura para la rodada.'); return; }
  if(_creandoRodada) return; _creandoRodada=true;
  try{
    const data={titulo:titulo, desc:desc, puntoEncuentro:puntoEncuentro, fecha:fecha, creadoPor:cu, nombreCreador:nombreUsuario||'Ciclista', asistentes:[cu], authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()};
    const selRuta=document.getElementById('rodadaRutaSel'), idx=selRuta?selRuta.value:'';
    if(idx!==''){
      const r=rutasLocales()[Number(idx)];
      if(r) data.ruta={nombreRuta:r.nombreRuta||'Ruta sin nombre', distance:r.distance||0, subida:(r.elevDEM&&r.elevDEM.subida)||null};
    }
    await db.collection('rodadas').add(data);
    document.getElementById('rodadaTitulo').value=''; document.getElementById('rodadaDesc').value=''; document.getElementById('rodadaPunto').value=''; document.getElementById('rodadaFecha').value=''; if(selRuta) selRuta.value='';
    h('Rodada creada. Ya se avisa a la comunidad.');
    verRodadas();
  }catch(e){ lpAviso('No se pudo crear la rodada.'); }
  finally{ _creandoRodada=false; }
}
async function verRodadas(){
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-people-group"></i> Rodadas grupales';
  const c=document.getElementById('modalContent');
  const rutasOpts=rutasLocales().filter(function(r){return r.nombreRuta && r.distance;}).map(function(r,i){ return '<option value="'+i+'">'+escapeHTML(r.nombreRuta)+' · '+r.distance.toFixed(1)+' km</option>'; }).join('');
  const selectorRuta=rutasOpts ? ('<select id="rodadaRutaSel"><option value="">Sin ruta (solo punto de encuentro)</option>'+rutasOpts+'</select>') : '';
  c.innerHTML='<div style="background:rgba(0,0,0,0.3);padding:10px;border-radius:10px;margin-bottom:12px"><h4 style="margin:0 0 8px;font-size:0.85rem;color:var(--p)">Organizar una rodada</h4><input type="text" id="rodadaTitulo" placeholder="Título (ej: Rodada nocturna Providencia)"><input type="text" id="rodadaPunto" placeholder="Punto de encuentro"><input type="datetime-local" id="rodadaFecha">'+selectorRuta+'<textarea id="rodadaDesc" rows="2" placeholder="Detalles (opcional)..."></textarea><button class="ab" style="margin-top:6px" onclick="crearRodada()">Publicar rodada</button></div><div id="rodadasList"><p style="color:#888">Cargando rodadas...</p></div>';
  document.getElementById('userModal').classList.add('on');
  try{
    const ahora=Date.now();
    const snap=await db.collection('rodadas').orderBy('fecha','asc').limit(50).get();
    const cont=document.getElementById('rodadasList');
    const futuras=[]; snap.forEach(function(d){ const r=Object.assign({id:d.id},d.data()); if(r.fecha>=ahora-3600000) futuras.push(r); });
    if(!futuras.length){ cont.innerHTML='<p style="color:#9fb3c8;font-size:0.85rem">No hay rodadas próximas. ¡Organiza la primera!</p>'; return; }
    cont.innerHTML=futuras.map(function(r){
      const asistentes=r.asistentes||[];
      const voy=asistentes.indexOf(cu)!==-1;
      const fecha=new Date(r.fecha).toLocaleString('es-CL',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      const rutaHTML=r.ruta ? ('<p style="color:var(--g)"><i class="fas fa-road"></i> '+escapeHTML(r.ruta.nombreRuta)+' · '+r.ruta.distance.toFixed(1)+' km'+(r.ruta.subida?(' · <i class="fas fa-arrow-trend-up"></i> '+r.ruta.subida+'m'):'')+'</p>') : '';
      return '<div class="novedad-card"><h4>'+escapeHTML(r.titulo||'')+'</h4><p><i class="fas fa-calendar"></i> '+fecha+' · <i class="fas fa-location-dot"></i> '+escapeHTML(r.puntoEncuentro||'')+'</p>'+rutaHTML+(r.desc?'<p>'+escapeHTML(r.desc)+'</p>':'')+'<p style="color:#7d8ba0;font-size:0.72rem">Organiza: '+escapeHTML(r.nombreCreador||'Ciclista')+' · '+asistentes.length+' confirmados</p><button class="ab '+(voy?'sec':'')+'" style="margin:0" onclick="toggleAsistenciaRodada(\''+r.id+'\')">'+(voy?'<i class="fas fa-circle-check"></i> Vas · toca para cancelar':'<i class="fas fa-person-biking"></i> Confirmar asistencia')+'</button></div>';
    }).join('');
  }catch(e){ document.getElementById('rodadasList').innerHTML='<p style="color:#888">No se pudieron cargar las rodadas.</p>'; }
}
/* ===== CANAL DE RODADA — avisos entre ciclistas del grupo y el escolta =====
   Diseño completo en COORDINACION-IA/DISENO-CANAL-RODADA.md.

   La idea central: viaja TEXTO, la voz se sintetiza en cada teléfono. En vez de
   transmitir audio (caro, pesado, y muerto sin señal), se manda un aviso de ~20 bytes y
   en el teléfono del que recibe lo cuenta SU Pistero, con SU arquetipo. Gasta lo que un
   mensaje de texto, aguanta la señal mala de una cuesta y no necesita micrófono abierto.

   Por qué NO el walkie-talkie con los autos: ya se intentó (Cycle Safety Technologies,
   BikeShield) y los ciclistas lo rechazaron — solo sirve si el auto la instala, traslada
   la culpa al ciclista y pone al conductor mirando la pantalla. Entre gente del mismo
   grupo ninguno de esos problemas existe. */
const RODADA_AVISOS={
  hoyo:     {e:'🕳️', l:'Hoyo',      t:'Ojo, hoyo adelante.',         seg:true},
  autoatras:{e:'🚗', l:'Auto atrás', t:'Auto por atrás, a la derecha.', seg:true},
  frenando: {e:'🛑', l:'Frenando',  t:'Están frenando adelante.',     seg:true},
  quedado:  {e:'✋', l:'Me quedé',   t:'se quedó atrás.',              seg:false},
  pinchazo: {e:'🔧', l:'Pinchazo',  t:'tuvo un pinchazo.',            seg:false},
  paramos:  {e:'💧', l:'Paramos',   t:'Paramos un rato.',             seg:false}
};
let rodadaActivaId=null, _rodadaUnsub=null, _rodadaUltimoEnvio=0;
const RODADA_MIN_ENTRE_AVISOS=8000; // un aviso cada 8s por persona: el canal es para lo urgente, no para conversar

/* El texto se arma distinto según si el aviso habla del CAMINO o de la PERSONA:
   "Ojo, hoyo adelante" no necesita nombre; "el Manuel se quedó atrás" sí. */
function _textoAviso(tipo, nombre){
  const a=RODADA_AVISOS[tipo]; if(!a) return null;
  return a.seg ? a.t : ((nombre||'Alguien')+' '+a.t);
}
async function enviarAvisoRodada(tipo){
  if(!rodadaActivaId){ lpAviso('No estás en una rodada activa.'); return; }
  if(!RODADA_AVISOS[tipo]) return;
  const ahora=Date.now();
  if(ahora-_rodadaUltimoEnvio < RODADA_MIN_ENTRE_AVISOS){
    lpAviso('Espera un poco antes de mandar otro aviso.'); return;
  }
  _rodadaUltimoEnvio=ahora;
  try{
    await db.collection('rodadaAvisos').add({
      rodada:rodadaActivaId, uid:cu, nombre:(typeof nombreUsuario!=='undefined'?nombreUsuario:'Ciclista'),
      tipo:tipo, ts:Date.now()
    });
    h('Avisado al grupo.', PRIO_VOZ.INFO);
  }catch(e){ lpAviso('No se pudo enviar el aviso.'); }
}
/* Escucha los avisos del grupo. Solo los NUEVOS: al entrar no se relee el historial,
   porque oír de golpe los diez avisos de la última hora sería insoportable. */
function escucharCanalRodada(id){
  if(_rodadaUnsub){ _rodadaUnsub(); _rodadaUnsub=null; }
  rodadaActivaId=id||null;
  if(!id) return;
  const desde=Date.now();
  _rodadaUnsub=db.collection('rodadaAvisos').where('rodada','==',id)
    .onSnapshot(function(snap){
      snap.docChanges().forEach(function(ch){
        if(ch.type!=='added') return;
        const d=ch.doc.data();
        if(!d || d.ts<desde) return;   // viejo: no se relee el historial
        if(d.uid===cu) return;          // no me repito mi propio aviso
        const a=RODADA_AVISOS[d.tipo]; if(!a) return;
        /* En modo Rutero el canal solo dice lo de seguridad: al que está compitiendo no
           se le interrumpe para contarle que el grupo paró a tomar agua. */
        const compitiendo=(typeof actividadTipo!=='undefined' && actividadTipo==='ciclismo' && typeof modoRutero!=='undefined' && modoRutero);
        if(compitiendo && !a.seg) return;
        h(_textoAviso(d.tipo, d.nombre), a.seg?PRIO_VOZ.SEGURIDAD:PRIO_VOZ.INFO);
      });
    }, function(){ /* sin señal: se reintenta solo cuando vuelve */ });
}
function salirCanalRodada(){
  if(_rodadaUnsub){ _rodadaUnsub(); _rodadaUnsub=null; }
  rodadaActivaId=null;
}
function _botoneraRodada(){
  return Object.keys(RODADA_AVISOS).map(function(k){
    const a=RODADA_AVISOS[k];
    return '<button class="ab sec" style="margin:0;min-height:56px;font-size:0.86rem" onclick="enviarAvisoRodada(\''+k+'\')">'+a.e+'<br>'+a.l+'</button>';
  }).join('');
}
async function toggleAsistenciaRodada(id){
  try{
    const ref=db.collection('rodadas').doc(id);
    const doc=await ref.get();
    if(!doc.exists) return;
    const asistentes=doc.data().asistentes||[];
    const voy=asistentes.indexOf(cu)!==-1;
    // arrayUnion/arrayRemove son atómicos en el servidor. Antes se leía el array
    // completo, se modificaba en el cliente y se reescribía entero — si dos
    // personas confirmaban asistencia casi al mismo tiempo, la escritura más
    // tardía pisaba a la otra SIN avisar (quien confirmó primero desaparecía de
    // la lista, en silencio). Con arrayUnion/arrayRemove cada confirmación se
    // suma/resta sola, sin importar qué haya escrito otro usuario en el medio.
    await ref.update({ asistentes: voy ? firebase.firestore.FieldValue.arrayRemove(cu) : firebase.firestore.FieldValue.arrayUnion(cu) });
    /* El canal de rodada se prende al confirmar asistencia y se apaga al bajarse: nadie
       tiene que acordarse de entrar a un canal aparte. Si te bajas, dejas de oír al grupo
       en el acto — que es lo que uno espera al tocar "ya no voy". */
    if(voy) salirCanalRodada(); else escucharCanalRodada(id);
    verRodadas();
  }catch(e){ lpAviso('No se pudo actualizar tu asistencia.'); }
}
// Antes, confirmar "voy" a una rodada era mudo: no había ningún aviso el día que
// tocaba, así que era fácil olvidarla entre todo lo demás. Revisa al abrir la app
// si hay alguna rodada confirmada dentro de las próximas 24h y la recuerda por voz,
// una sola vez por rodada (para no repetirla cada vez que abres la app ese día).
function _rodadasAvisadasLS(){ try{ return JSON.parse(localStorage.getItem('lp_rodadas_avisadas_'+cu))||[]; }catch(e){ return []; } }
async function revisarRodadasProximas(){
  if(!cu) return;
  try{
    const ahora=Date.now(), en24h=ahora+86400000;
    const snap=await db.collection('rodadas').where('fecha','>=',ahora).where('fecha','<=',en24h).limit(20).get();
    const avisadas=_rodadasAvisadasLS();
    for(const doc of snap.docs){
      const r=doc.data();
      if((r.asistentes||[]).indexOf(cu)===-1) continue;
      if(avisadas.indexOf(doc.id)!==-1) continue;
      avisadas.push(doc.id);
      const cuando=new Date(r.fecha).toLocaleString('es-CL',{weekday:'long',hour:'2-digit',minute:'2-digit'});
      h('Recuerda: mañana tienes la rodada "'+r.titulo+'" en '+(r.puntoEncuentro||'el punto de encuentro')+', '+cuando+'.');
    }
    try{ localStorage.setItem('lp_rodadas_avisadas_'+cu, JSON.stringify(avisadas.slice(-50))); }catch(e){}
  }catch(e){}
}
