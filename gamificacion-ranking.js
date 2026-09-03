async function mostrarRanking(modo, volverA){
  const actual=modo || ((typeof actividadTipo!=='undefined' && _modoCompite(actividadTipo)) ? actividadTipo : 'ciclismo');
  /* Auditoria 2026-07-20: el destino del "volver" estaba fijo en 'mostrarLogrosComunidad'.
     Entrando al ranking desde "mi puesto" (esfera o Estadisticas), el atras del modal te
     dejaba en una pantalla por la que jamas pasaste. Ahora quien abre decide, y si no
     dice nada, no hay a donde volver: simplemente se cierra. */
  if(volverA!==undefined) _modalVolverA=volverA;
  else if(!modo) _modalVolverA=null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-ranking-star"></i> Top 100 · '+(MODOS_QUE_COMPITEN[actual]||'Ruta');
  const c=document.getElementById('modalContent');
  c.innerHTML=_btnVolverModal()+'<p style="color:#888">Cargando ranking...</p>';
  document.getElementById('userModal').classList.add('on');
  await sincronizarStats();
  // Selector de disciplina: cada una con su tabla.
  let tabs='<div style="display:flex;gap:6px;margin:0 0 10px;flex-wrap:wrap">';
  for(const m in MODOS_QUE_COMPITEN){
    const on=(m===actual);
    tabs+='<button onclick="mostrarRanking(\''+m+'\')" style="flex:1;min-height:40px;padding:0 10px;border-radius:10px;font-size:0.78rem;font-weight:700;cursor:pointer;border:1px solid '+(on?'var(--p)':'#242c3e')+';background:'+(on?'rgba(252,76,2,0.14)':'var(--gl)')+';color:'+(on?'var(--p)':'#9fb3c8')+'">'+MODOS_QUE_COMPITEN[m]+'</button>';
  }
  tabs+='</div>';
  try{
    const snap=await db.collection('users').orderBy('kmPorModo.'+actual,'desc').limit(100).get();
    const med=['🥇','🥈','🥉'];
    let html=_btnVolverModal()+tabs;
    let pos=0, filas='';
    snap.forEach(function(doc){
      const d=doc.data(), km=(d.kmPorModo&&d.kmPorModo[actual])||0;
      if(km<=0) return; // sin kilómetros en esta disciplina no se muestra
      pos++;
      const yo=doc.id===cu;
      filas+='<div onclick="verPerfilUsuario(\''+doc.id+'\',\'mostrarRanking\')" style="display:flex;align-items:center;gap:10px;padding:9px;border-radius:10px;margin-bottom:5px;cursor:pointer;background:'+(yo?'rgba(252,76,2,0.12)':'var(--gl)')+';border:1px solid '+(yo?'var(--p)':'#242c3e')+'"><div style="font-size:1.05rem;font-weight:800;min-width:30px;text-align:center">'+(med[pos-1]||('#'+pos))+'</div><div style="flex:1;font-weight:700;font-size:0.86rem;color:'+(yo?'var(--p)':'#dfe7ff')+'">'+escapeHTML(d.nombre||'Ciclista')+(yo?' (tú)':'')+'</div><div style="font-weight:800;color:var(--g);font-size:0.9rem">'+km.toFixed(0)+' km</div></div>';
    });
    if(!pos){
      html+='<p style="color:#9fb3c8;font-size:0.84rem;line-height:1.5">Todavía nadie tiene kilómetros registrados en <strong style="color:#dfe7ff">'+(MODOS_QUE_COMPITEN[actual]||'')+'</strong>.<br><br>Los kilómetros se empezaron a separar por disciplina el 20 de julio de 2026: sal a rodar en este modo y serás el primero.</p>';
    } else {
      html+='<p style="color:#9fb3c8;font-size:0.82rem;margin-top:0">Los que más kilómetros suman en '+(MODOS_QUE_COMPITEN[actual]||'')+' 🌎</p>'+filas
        +'<p style="font-size:0.68rem;color:#7d8ba0;text-align:center;margin-top:8px">Toca un ciclista para ver su perfil y sus rutas.</p>';
    }
    html+='<p style="font-size:0.68rem;color:#7d8ba0;text-align:center;margin-top:10px">Cada disciplina compite con los suyos. Los kilómetros en vehículo no entran: ese modo acompaña, no compite.</p>';
    c.innerHTML=html;
  }catch(e){
    c.innerHTML=_btnVolverModal()+tabs+'<p style="color:#888">No se pudo cargar el ranking. Intenta de nuevo en un momento.</p>';
  }
}
async function _mostrarRankingGlobalViejo(){
  _modalVolverA='mostrarLogrosComunidad';
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-ranking-star"></i> Top 100 kilómetros'; const c=document.getElementById('modalContent'); c.innerHTML=_btnVolverModal()+'<p style="color:#888">Cargando ranking mundial...</p>'; document.getElementById('userModal').classList.add('on');
  await sincronizarStats();
  try{ const snap=await db.collection('users').orderBy('km','desc').limit(100).get();
    if(snap.empty){ c.innerHTML=_btnVolverModal()+'<p style="color:#888">Aún no hay datos. ¡Activa el GPS y suma kilómetros para entrar al ranking!</p>'; return; }
    const med=['🥇','🥈','🥉']; let html=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.82rem;margin-top:0">Los cicloviajeros con más kilómetros del mundo 🌎</p>'; let pos=0;
    snap.forEach(function(doc){ const d=doc.data(); pos++; const yo=doc.id===cu; html+='<div onclick="verPerfilUsuario(\''+doc.id+'\',\'mostrarRanking\')" style="display:flex;align-items:center;gap:10px;padding:9px;border-radius:10px;margin-bottom:5px;cursor:pointer;background:'+(yo?'rgba(252,76,2,0.12)':'var(--gl)')+';border:1px solid '+(yo?'var(--p)':'#242c3e')+'"><div style="font-size:1.05rem;font-weight:800;min-width:30px;text-align:center">'+(med[pos-1]||('#'+pos))+'</div><div style="flex:1;font-weight:700;font-size:0.86rem;color:'+(yo?'var(--p)':'#dfe7ff')+'">'+escapeHTML(d.nombre||'Ciclista')+(yo?' (tú)':'')+'</div><div style="font-weight:800;color:var(--g);font-size:0.9rem">'+(d.km||0).toFixed(0)+' km</div></div>'; });
    html+='<p style="font-size:0.68rem;color:#7d8ba0;text-align:center;margin-top:8px">Toca un ciclista para ver su perfil y sus rutas.</p>';
    c.innerHTML=html;
  }catch(e){ c.innerHTML=_btnVolverModal()+'<p style="color:#888">No se pudo cargar el ranking. Intenta de nuevo en un momento.</p>'; }
}
/* ===== PERFIL PÚBLICO: ver desempeño, logros y rutas de otros ciclistas ===== */
async function verPerfilUsuario(userId, volverA){
  // volverA es opcional a propósito: se llama desde 4 lugares — Amigos, Ranking,
  // y 2 popups del mapa (radar de ciclistas / navegación). Desde el mapa no hay
  // "pantalla padre" del modal a la que volver (la "✕" ya deja en el mapa
  // correctamente), así que esos 2 casos no pasan el parámetro.
  _modalVolverA=volverA||null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-person-biking"></i> Perfil de ciclista';
  const c=document.getElementById('modalContent'); c.innerHTML=_btnVolverModal()+'<p style="color:#888">Cargando perfil...</p>'; document.getElementById('userModal').classList.add('on');
  try{
    const doc=await db.collection('users').doc(userId).get(); const d=doc.exists?doc.data():{};
    const nombre=d.nombre||userId, km=d.km||0, darma=d.darma||0;
    let nivel='Novato'; if(darma>50)nivel='Explorador'; if(darma>150)nivel='Nómada'; if(darma>500)nivel='Leyenda';
    const kmMetas=[1,10,50,100,250,500,1000,2500,5000], darmaMetas=[10,50,150,500,1000];
    const logrosPub=kmMetas.filter(function(m){return km>=m;}).length + darmaMetas.filter(function(m){return darma>=m;}).length;
    // rutas del ciclista
    let rutas=[], totalKm=0; try{ const rs=await db.collection('routes').where('user','==',userId).limit(50).get(); rs.forEach(function(r){ const x=r.data(); rutas.push(x); totalKm+=(x.distance||0); }); }catch(e){}
    // _pistSet() guarda campos PLANOS pist* en el doc (no un objeto anidado) — armar
    // el shape que espera _pistoDe() a partir de esos mismos campos.
    const avatar=(typeof _pistoDe==='function')?_pistoDe({casco:d.pistCasco,piel:d.pistPiel,lentes:d.pistLentes,lentesCol:d.pistLentesCol,bigote:d.pistBigote,acc:d.pistAcc,pelo:d.pistPelo,peloCol:d.pistPeloCol,pest:d.pistPest,aro:d.pistAro,pano:d.pistPano},'feliz'):'';
    let html=_btnVolverModal()+'<div style="text-align:center"><div style="width:110px;height:110px;margin:0 auto"><svg viewBox="0 0 200 200" style="width:100%;height:100%">'+avatar+'</svg></div><h3 style="margin:6px 0;color:var(--p)">'+escapeHTML(nombre)+'</h3><div style="color:var(--g);font-weight:800;font-size:0.85rem">'+escapeHTML(nivel)+'</div></div>';
    html+='<div class="stats-grid" style="margin:12px 0"><div class="stat-card"><div class="stat-value">'+km.toFixed(0)+'</div><div class="stat-label">Km totales</div></div><div class="stat-card"><div class="stat-value">'+darma+'</div><div class="stat-label">Darma</div></div><div class="stat-card"><div class="stat-value">'+logrosPub+'</div><div class="stat-label">Logros</div></div><div class="stat-card"><div class="stat-value">'+rutas.length+'</div><div class="stat-label">Rutas</div></div></div>';
    html+='<p style="font-size:0.8rem;color:#9fb3c8;text-align:center">Ha recorrido y grabado <strong style="color:var(--p)">'+totalKm.toFixed(1)+' km</strong> en '+rutas.length+' ruta'+(rutas.length===1?'':'s')+'.</p>';
    if(rutas.length){ html+='<button class="ab" onclick="mostrarRutasDe(\''+userId+'\',\''+encodeURIComponent(nombre)+'\')"><i class="fas fa-map"></i> Ver por dónde ha pedaleado</button>'; }
    if(userId!==cu){ html+='<button class="ab sec" style="margin-top:6px" onclick="abrirChatAmigo(\''+userId+'\')"><i class="fas fa-comment"></i> Enviar mensaje</button>'; }
    html+='<div id="perfilComunidadSlot"></div>';
    c.innerHTML=html;
    if(typeof renderPerfilComunidad==='function') renderPerfilComunidad(userId, userId===cu);
  }catch(e){ c.innerHTML=_btnVolverModal()+'<p style="color:#888">No se pudo cargar el perfil.</p>'; }
}
async function mostrarRutasDe(userId,nombreEnc){
  const nombre=nombreEnc?decodeURIComponent(nombreEnc):'este ciclista';
  closeModal(); cv('map');
  h('Cargando las rutas de '+nombre+'...');
  try{
    const rs=await db.collection('routes').where('user','==',userId).limit(40).get();
    if(rs.empty){ h(nombre+' aún no tiene rutas grabadas.'); return; }
    if(!mp) return; let bounds=[];
    rs.forEach(function(doc){ const r=doc.data(); if(r.points&&r.points.length){ const latlngs=r.points.map(function(p){return [p.lat,p.lon];}); mlPolyline(latlngs,{color:'#ff9800',weight:3,opacity:0.85}).addTo(mp); bounds=bounds.concat(latlngs); } });
    if(bounds.length){ mp.fitBounds(mlLatLngBounds(bounds.map(function(p){return {lat:p[0],lon:p[1]};})).pad(0.2)); }
    h('Estas son las rutas de '+nombre+', marcadas en naranja. 🧡');
  }catch(e){ h('No pude cargar sus rutas.'); }
}
