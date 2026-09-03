/* ===== CICLISTAS DE LA COMUNIDAD: pelotón demo por todo Chile + usuarios reales al entrar ===== */
// Al registrarse o entrar, publica tu zona aproximada (~1 km, por privacidad):
// así apareces al tiro en el mapa sin esperar a pedalear.
function publicarUbicacionInicial(){
  if(!cu||ghostMode||!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos){
    const plat=Math.round(pos.coords.latitude*100)/100, plon=Math.round(pos.coords.longitude*100)/100;
    db.collection('users').doc(cu).set({lat:plat,lon:plon,lastUpdate:firebase.firestore.FieldValue.serverTimestamp(),visible:true},{merge:true}).catch(function(){});
    _rtdPublicarPosicion(plat, plon);
  },function(){},{enableHighAccuracy:false,timeout:8000,maximumAge:600000});
}
function subscribeToChat(){ db.collection('chat').orderBy('ts','asc').limit(100).onSnapshot(function(snapshot){ cm=snapshot.docs.map(function(doc){ const data=doc.data(); return Object.assign({},data,{nombre:data.nombre||data.a}); }); rc(); }); }
/* Escapa texto de usuarios para evitar inyección HTML/XSS al meterlo en innerHTML. */
function escapeHTML(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function subscribeToComments(){ db.collection('guiComments').orderBy('ts','desc').limit(50).onSnapshot(function(snapshot){ const c=document.getElementById('gui-comments'); if(!c) return; if(snapshot.empty){ c.innerHTML='<p style="color:#888">Sé el primero en comentar</p>'; return; } c.innerHTML=snapshot.docs.filter(function(doc){ const data=doc.data(); return data.type!=='voto' && data.text; }).map(function(doc){ const data=doc.data(); return '<div class="global-comment"><div class="author">'+escapeHTML(data.nombre||data.user)+'</div><div class="time">'+escapeHTML(data.h)+'</div><div class="text">'+escapeHTML(data.text)+'</div></div>'; }).join(''); }); }
function subscribeToFriendRequests(){ db.collection('friendRequests').where('to','==',cu).onSnapshot(function(snapshot){ const pend=snapshot.docs.filter(function(d){return d.data().status==='pending';}).length; const b=document.getElementById('solicBadge'); if(b){ if(pend>0){ b.innerText=pend; b.style.display='inline-block'; } else { b.style.display='none'; } } const eb=document.getElementById('esAvisos'); if(eb) eb.setAttribute('data-n', pend>0?String(Math.min(pend,99)):'0'); const nav=document.querySelector('.nb[onclick*="chat"]'); if(nav){ nav.style.position='relative'; let dot=nav.querySelector('.nav-dot'); if(pend>0){ if(!dot){ dot=document.createElement('span'); dot.className='nav-dot'; dot.style.cssText='position:absolute;top:4px;right:calc(50% - 18px);width:9px;height:9px;background:var(--r);border-radius:50%'; nav.appendChild(dot); } } else if(dot){ dot.remove(); } } if(pend>0) h('Tienes '+pend+' solicitud de amistad pendiente. Míralas en Social.'); }); }
