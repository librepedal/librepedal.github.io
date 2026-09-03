function em(){ const i=document.getElementById('chi'), t=i.value.trim(); if(!t||!cu) return; const n=new Date(), h2=(n.getHours().toString().padStart(2,'0'))+':'+(n.getMinutes().toString().padStart(2,'0')); db.collection('chat').add({a:cu,nombre:nombreUsuario,t:t,h:h2,ts:firebase.firestore.FieldValue.serverTimestamp()}); i.value=""; }
function rc(){ const c=document.getElementById('chm'); if(!c) return; c.innerHTML=cm.map(function(m){ return '<div class="ms '+(m.a===cu?'sf':'ot')+'">'+(m.a!==cu?'<div class="ma">'+escapeHTML(m.nombre||m.a)+' · '+escapeHTML(m.h)+'</div>':'')+'<div class="mb">'+escapeHTML(m.t)+'</div>'+(m.a===cu?'<div class="ma" style="text-align:right;margin-top:3px">'+escapeHTML(m.h)+'</div>':'')+'</div>'; }).join(''); c.scrollTop=c.scrollHeight; }
/* ===== CHAT PRIVADO ENTRE AMIGOS (1 a 1) ===== */
let dmUnsub=null, dmConvId=null;
function convIdDe(a,b){ return [a,b].sort().join('__'); }
async function abrirChatAmigo(friendId){
  const nombre=await getNombreUsuario(friendId);
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-comment-dots"></i> '+escapeHTML(nombre);
  const c=document.getElementById('modalContent');
  c.innerHTML='<div id="dmMsgs" style="max-height:52vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:4px 2px"><p style="color:#888;font-size:0.8rem">Cargando conversación...</p></div>'
    +'<div style="display:flex;gap:6px;margin-top:8px"><input id="dmInput" type="text" placeholder="Mensaje para '+escapeHTML(nombre)+'..." style="flex:1" onkeypress="if(event.key===\'Enter\')enviarDM()"><button class="ab" style="width:auto;padding:10px 14px;margin:0" onclick="enviarDM()">Enviar</button></div>'
    +'<button class="ab sec" style="margin-top:8px" onclick="cerrarChatAmigo()"><i class="fas fa-arrow-left"></i> Volver a amigos</button>';
  document.getElementById('userModal').classList.add('on');
  dmConvId=convIdDe(cu,friendId);
  if(dmUnsub){ dmUnsub(); dmUnsub=null; }
  dmUnsub=db.collection('dm').doc(dmConvId).collection('messages').orderBy('ts','asc').limit(200).onSnapshot(function(snap){
    const box=document.getElementById('dmMsgs'); if(!box) return;
    if(snap.empty){ box.innerHTML='<p style="color:#888;font-size:0.8rem;text-align:center;padding:10px">Escríbele el primer mensaje a '+escapeHTML(nombre)+' 👋</p>'; return; }
    box.innerHTML=snap.docs.map(function(d){ const m=d.data(); const mio=m.from===cu; return '<div style="max-width:82%;align-self:'+(mio?'flex-end':'flex-start')+';background:'+(mio?'rgba(252,76,2,0.16)':'var(--gl)')+';padding:7px 11px;border-radius:12px"><div style="font-size:0.86rem;color:#fff;line-height:1.3">'+escapeHTML(m.text)+'</div></div>'; }).join('');
    box.scrollTop=box.scrollHeight;
  }, function(err){ const box=document.getElementById('dmMsgs'); if(box) box.innerHTML='<p style="color:#888;font-size:0.8rem">No se pudo cargar el chat.</p>'; });
}
function enviarDM(){
  const inp=document.getElementById('dmInput'); if(!inp) return; const text=inp.value.trim(); if(!text||!dmConvId||!cu) return;
  db.collection('dm').doc(dmConvId).collection('messages').add({from:cu, nombre:nombreUsuario, text:text, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()});
  inp.value='';
}
function cerrarChatAmigo(){ if(dmUnsub){ dmUnsub(); dmUnsub=null; } dmConvId=null; showAmigosYSolicitudes(); }
async function showFriendsList(){ _modalVolverA=null; document.getElementById('modalTitle').innerText='Amigos'; const c=document.getElementById('modalContent'); c.innerHTML='<p style="color:#888">Cargando...</p>'; document.getElementById('userModal').classList.add('on'); try{ const res=await Promise.all([ db.collection('friendRequests').where('from','==',cu).get(), db.collection('friendRequests').where('to','==',cu).get() ]); const ids={}; res[0].docs.forEach(function(d){ const x=d.data(); if(x.status==='accepted'&&x.to) ids[x.to]=true; }); res[1].docs.forEach(function(d){ const x=d.data(); if(x.status==='accepted'&&x.from) ids[x.from]=true; }); const friendIds=Object.keys(ids); if(friendIds.length===0){ c.innerHTML='<p style="color:#888">Aún no tienes amigos</p><button class="ab" onclick="showUserListForFriendRequest()">Buscar ciclistas</button>'; return; } let html=''; for(const friendId of friendIds){ const nombre=await getNombreUsuario(friendId); html+='<div class="chat-user-item" style="display:flex;align-items:center;gap:8px"><div style="width:30px;height:30px;background:var(--p);border-radius:50%"></div><div style="flex:1;cursor:pointer" onclick="verPerfilUsuario(\''+friendId+'\',\'showFriendsList\')"><h4 style="margin:0;color:var(--p);font-size:0.9rem">'+escapeHTML(nombre)+'</h4><p style="margin:0;font-size:0.7rem;color:#aaa;text-decoration:underline">Ver perfil</p></div><button class="ab" style="width:auto;padding:7px 12px;margin:0;font-size:0.78rem" onclick="abrirChatAmigo(\''+friendId+'\')"><i class="fas fa-comment"></i> Chat</button></div>'; } c.innerHTML=html+'<button class="ab sec" style="margin-top:8px" onclick="showUserListForFriendRequest()">Agregar más</button>'; }catch(e){ c.innerHTML='<p style="color:#888">No se pudieron cargar los amigos. Intenta de nuevo.</p><button class="ab" onclick="showUserListForFriendRequest()">Buscar ciclistas</button>'; } }
async function showFriendRequests(){ _modalVolverA=null; document.getElementById('modalTitle').innerText='Solicitudes'; const c=document.getElementById('modalContent'); c.innerHTML='<p style="color:#888">Cargando...</p>'; document.getElementById('userModal').classList.add('on'); const snapshot=await db.collection('friendRequests').where('to','==',cu).get(); const pend=snapshot.docs.filter(function(d){return d.data().status==='pending';}); if(pend.length===0){ c.innerHTML='<p style="color:#888">Sin solicitudes</p>'; return; } let html=''; for(const doc of pend){ const data=doc.data(); const nombre=await getNombreUsuario(data.from); html+='<div class="friend-request"><span><strong>'+escapeHTML(nombre)+'</strong></span><div><button class="ab" style="width:auto;padding:6px 10px;margin:2px;font-size:0.75rem" onclick="acceptFriendRequest(\''+doc.id+'\',\''+data.from+'\')">Aceptar</button><button class="ab" style="width:auto;padding:6px 10px;margin:2px;background:#dc2626;font-size:0.75rem" onclick="rejectFriendRequest(\''+doc.id+'\')">Rechazar</button></div></div>'; } c.innerHTML=html; }
function acceptFriendRequest(reqId,fromUser){
  db.collection('friendRequests').doc(reqId).update({status:'accepted'}).then(function(){
    // Espejo con id determinista (uid menor + '_' + uid mayor) para que la regla de
    // Firestore del perfil privado (fotos/relatos) pueda chequear "son amigos" con
    // un exists() simple, sin necesitar una query — ver perfil-comunidad.js.
    try{ const a=cu<fromUser?cu:fromUser, b=cu<fromUser?fromUser:cu; db.collection('amistades').doc(a+'_'+b).set({a:a,b:b}); }catch(e){}
    h("¡Nuevo amigo agregado!"); showAmigosYSolicitudes();
  }).catch(function(){ h("No se pudo aceptar, intenta de nuevo."); });
}
// 2026-08-23: Amigos + Solicitudes fusionados en una sola vista (pedido de Inty:
// "eso debería ir todo junto y se despliega para ver todo el contenido") — antes
// eran dos botones que llevaban a showFriendsList()/showFriendRequests() por
// separado. Reusa exactamente la misma lógica de ambas, solo las junta en un mismo
// c.innerHTML: primero las solicitudes pendientes (si hay), después la lista de
// amigos. showFriendsList()/showFriendRequests() quedan intactas sin llamar desde
// acá, por si algo más viejo las necesitara.
async function showAmigosYSolicitudes(){
  _modalVolverA=null;
  document.getElementById('modalTitle').innerText='Amigos';
  const c=document.getElementById('modalContent');
  c.innerHTML='<p style="color:#888">Cargando...</p>';
  document.getElementById('userModal').classList.add('on');
  try{
    // 2026-08-24: antes pedía 'to'==cu dos veces (una para solicitudes pendientes,
    // otra adentro del Promise.all para los amigos aceptados) — misma query,
    // lectura de Firestore duplicada en cada apertura de esta pantalla. Ahora se
    // pide una sola vez y se reusan esos docs para ambas cosas; las dos queries
    // que sí son distintas ('from'==cu y 'to'==cu) van en paralelo desde el arranque.
    const res=await Promise.all([
      db.collection('friendRequests').where('from','==',cu).get(),
      db.collection('friendRequests').where('to','==',cu).get()
    ]);
    const snapTo=res[1];
    const pend=snapTo.docs.filter(function(d){ return d.data().status==='pending'; });
    const ids={};
    res[0].docs.forEach(function(d){ const x=d.data(); if(x.status==='accepted'&&x.to) ids[x.to]=true; });
    snapTo.docs.forEach(function(d){ const x=d.data(); if(x.status==='accepted'&&x.from) ids[x.from]=true; });
    const friendIds=Object.keys(ids);
    let html='';
    if(pend.length){
      html+='<h4 style="font-size:0.85rem;color:var(--g);margin:0 0 8px"><i class="fas fa-inbox"></i> Solicitudes ('+pend.length+')</h4>';
      for(const doc of pend){
        const data=doc.data(); const nombre=await getNombreUsuario(data.from);
        html+='<div class="friend-request"><span><strong>'+escapeHTML(nombre)+'</strong></span><div><button class="ab" style="width:auto;padding:6px 10px;margin:2px;font-size:0.75rem" onclick="acceptFriendRequest(\''+doc.id+'\',\''+data.from+'\')">Aceptar</button><button class="ab" style="width:auto;padding:6px 10px;margin:2px;background:#dc2626;font-size:0.75rem" onclick="rejectFriendRequest(\''+doc.id+'\')">Rechazar</button></div></div>';
      }
      html+='<h4 style="font-size:0.85rem;color:var(--p);margin:14px 0 8px"><i class="fas fa-users"></i> Tus amigos</h4>';
    }
    if(friendIds.length===0){
      html+='<p style="color:#888">Aún no tienes amigos</p><button class="ab" onclick="showUserListForFriendRequest()">Buscar ciclistas</button>';
    } else {
      for(const friendId of friendIds){
        const nombre=await getNombreUsuario(friendId);
        html+='<div class="chat-user-item" style="display:flex;align-items:center;gap:8px"><div style="width:30px;height:30px;background:var(--p);border-radius:50%"></div><div style="flex:1;cursor:pointer" onclick="verPerfilUsuario(\''+friendId+'\',\'showAmigosYSolicitudes\')"><h4 style="margin:0;color:var(--p);font-size:0.9rem">'+escapeHTML(nombre)+'</h4><p style="margin:0;font-size:0.7rem;color:#aaa;text-decoration:underline">Ver perfil</p></div><button class="ab" style="width:auto;padding:7px 12px;margin:0;font-size:0.78rem" onclick="abrirChatAmigo(\''+friendId+'\')"><i class="fas fa-comment"></i> Chat</button></div>';
      }
      html+='<button class="ab sec" style="margin-top:8px" onclick="showUserListForFriendRequest()">Agregar más</button>';
    }
    c.innerHTML=html;
  }catch(e){ c.innerHTML='<p style="color:#888">No se pudieron cargar los amigos. Intenta de nuevo.</p><button class="ab" onclick="showUserListForFriendRequest()">Buscar ciclistas</button>'; }
}
function rejectFriendRequest(reqId){ db.collection('friendRequests').doc(reqId).update({status:'rejected'}); h("Solicitud rechazada."); showAmigosYSolicitudes(); }
async function showUserListForFriendRequest(){
  _modalVolverA='showAmigosYSolicitudes'; // antes 'showFriendsList' -- ver fusión Amigos+Solicitudes más arriba
  document.getElementById('modalTitle').innerText='Ciclistas en la comunidad'; const c=document.getElementById('modalContent'); c.innerHTML=_btnVolverModal()+'<p style="color:#888">Buscando ciclistas en todo el mundo...</p>'; document.getElementById('userModal').classList.add('on');
  // Trae del servidor quiénes ya son amigos o tienen una solicitud pendiente contigo,
  // para no mostrar "Agregar" de nuevo tras recargar la app (evita duplicados).
  let yaRelacionados={};
  try{
    const [a,b]=await Promise.all([
      db.collection('friendRequests').where('from','==',cu).get(),
      db.collection('friendRequests').where('to','==',cu).get()
    ]);
    a.docs.concat(b.docs).forEach(function(d){ const x=d.data(); if(x.status==='pending'||x.status==='accepted'){ yaRelacionados[x.from===cu?x.to:x.from]=x.status; } });
  }catch(e){}
  const snapshot=await db.collection('users').where('visible','==',true).get(); let items=[]; for(const doc of snapshot.docs){ if(doc.id===cu) continue; if(yaRelacionados[doc.id]==='accepted') continue; const data=doc.data(); if(data.lat&&data.lon){ const dist=currentUserLocation?gd2(currentUserLocation.lat,currentUserLocation.lon,data.lat,data.lon):null; items.push({id:doc.id, nombre:data.nombre||doc.id, dist:dist}); } } if(currentUserLocation) items.sort(function(a,b){ return (a.dist||0)-(b.dist||0); }); let html=''; items.forEach(function(it){ const sent=friendRequestSent.indexOf(it.id)!==-1 || yaRelacionados[it.id]==='pending'; const distTxt=(it.dist!=null)?(it.dist<1?Math.round(it.dist*1000)+' m':it.dist.toFixed(it.dist<100?1:0)+' km'):'—'; html+='<div class="nearby-user"><div style="width:35px;height:35px;background:var(--p);border-radius:50%"></div><div style="flex:1"><h4 style="margin:0;color:var(--p);font-size:0.9rem">'+escapeHTML(it.nombre)+'</h4><div class="distance">'+distTxt+'</div></div>'+(sent?'<span style="color:#888;font-size:0.75rem">Enviada</span>':'<button class="route-btn" onclick="sendFriendRequest(\''+it.id+'\')">Agregar</button>')+'</div>'; }); c.innerHTML = _btnVolverModal()+(items.length===0 ? '<p style="color:#888">Aún no hay otros ciclistas con ubicación visible. ¡Pronto se sumarán a la comunidad!</p>' : '<p style="color:var(--g);font-size:0.85rem;margin-bottom:10px">'+items.length+' ciclista'+(items.length>1?'s':'')+' en la comunidad'+(currentUserLocation?' (ordenados por cercanía)':'')+'</p>'+html); }
// Antes de crear la solicitud, revisa si ya existe una (en cualquier sentido) para no
// duplicarla cada vez que el usuario recarga la app y vuelve a tocar "Agregar".
async function sendFriendRequest(toUser){
  try{
    const [a,b]=await Promise.all([
      db.collection('friendRequests').where('from','==',cu).where('to','==',toUser).get(),
      db.collection('friendRequests').where('from','==',toUser).where('to','==',cu).get()
    ]);
    const yaExiste=a.docs.concat(b.docs).some(function(d){ const s=d.data().status; return s==='pending'||s==='accepted'; });
    if(yaExiste){ friendRequestSent.push(toUser); h("Ya tienes una solicitud o amistad con esta persona."); showUserListForFriendRequest(); return; }
    await db.collection('friendRequests').add({from:cu,fromNombre:nombreUsuario,to:toUser,status:'pending',authUid:window.lpUID||null,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    friendRequestSent.push(toUser); h("Solicitud enviada."); showUserListForFriendRequest();
  }catch(e){ lpAviso('No se pudo enviar la solicitud, intenta de nuevo.'); }
}
function closeModal(){ document.getElementById('userModal').classList.remove('on'); if(dmUnsub){ dmUnsub(); dmUnsub=null; } dmConvId=null; _modalVolverA=null; }
