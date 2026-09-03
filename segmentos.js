/* ===== SEGMENTOS Y TABLA DE LÍDERES (estilo Strava) =====
   Un segmento es un tramo con inicio y fin fijos: los mismos puntos con los que
   arrancó y terminó alguna ruta ya grabada (no hace falta mapear calles aparte).
   Mientras andás, si pasás cerca del punto de inicio se "arma" el cronómetro; al
   pasar cerca del fin, se guarda tu marca. Todo con el mismo GPS que ya corre. */
const SEGMENTO_RADIO_M=40;
var segmentosActivos=[], segmentosEstado={}, segmentosCargados=false; // var a propósito: reseteadas/leidas desde fuera de este archivo (fin de viaje, bucle de GPS)
async function iniciarSeguimientoSegmentos(lat,lon){
  segmentosEstado={}; segmentosActivos=[];
  try{
    // Bounding box aproximado (~5km) alrededor del punto de partida: Firestore no
    // tiene geo-queries nativas sin infraestructura extra, y para esta escala alcanza
    // con un rango en latitud (indexado solo, sin índice compuesto) + filtro de
    // longitud en el cliente.
    const delta=0.045;
    const snap=await db.collection('segmentos').where('inicio.lat','>=',lat-delta).where('inicio.lat','<=',lat+delta).limit(50).get();
    segmentosActivos=snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); }).filter(function(s){ return s.inicio && s.inicio.lon!=null && s.inicio.lon>=lon-delta && s.inicio.lon<=lon+delta; });
  }catch(e){ segmentosActivos=[]; }
}
function _fmtSegmentoTiempo(ms){ const m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000); return m+':'+(s<10?'0':'')+s; }
function _actualizarBadgeSegmento(){
  let armado=null;
  segmentosActivos.forEach(function(s){ const est=segmentosEstado[s.id]; if(est&&est.armado) armado={s:s,est:est}; });
  ['segmentoBadge','navSegmentoBadge'].forEach(function(id){
    const el=document.getElementById(id); if(!el) return;
    if(armado){ el.style.display='inline-flex'; el.innerText='🏁 '+armado.s.nombre+' · '+_fmtSegmentoTiempo(Date.now()-armado.est.inicioMs); }
    else { el.style.display='none'; }
  });
}
function _verificarSegmentos(lat,lon){
  if(!segmentosActivos.length) return;
  segmentosActivos.forEach(function(s){
    if(!s.inicio||!s.fin) return;
    const est=segmentosEstado[s.id]||(segmentosEstado[s.id]={armado:false,inicioMs:null});
    if(!est.armado){
      if(calculateDistance(lat,lon,s.inicio.lat,s.inicio.lon)<SEGMENTO_RADIO_M){ est.armado=true; est.inicioMs=Date.now(); h('Entraste al segmento '+s.nombre+'. ¡Dale con todo!'); }
    } else if(calculateDistance(lat,lon,s.fin.lat,s.fin.lon)<SEGMENTO_RADIO_M){
      const tiempoMs=Date.now()-est.inicioMs;
      est.armado=false;
      _guardarTiempoSegmento(s, tiempoMs);
    }
  });
  _actualizarBadgeSegmento();
}
async function _guardarTiempoSegmento(segmento, tiempoMs){
  try{
    // Compara contra tu propia mejor marca ANTES de guardar la nueva, para poder
    // avisar si fue récord personal — de otra forma solo sabrías el tiempo pelado,
    // sin nada con qué compararlo hasta entrar a la tabla de líderes.
    let esRecord=false, mejoraSeg=null;
    try{
      const prevSnap=await db.collection('segmentoTiempos').where('segmentoId','==',segmento.id).where('user','==',cu).get();
      const prevMin=prevSnap.docs.reduce(function(m,d){ const t=d.data().tiempoMs; return (t!=null && t<m)?t:m; }, Infinity);
      if(prevMin!==Infinity && tiempoMs<prevMin){ esRecord=true; mejoraSeg=Math.round((prevMin-tiempoMs)/1000); }
      else if(prevMin===Infinity){ esRecord=true; } // primera vez que lo corres
    }catch(e){}
    await db.collection('segmentoTiempos').add({segmentoId:segmento.id, user:cu, nombre:nombreUsuario||'Ciclista', tiempoMs:tiempoMs, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()});
    const tiempoTxt=_fmtSegmentoTiempo(tiempoMs);
    if(esRecord && mejoraSeg){ h('¡Nuevo récord personal en '+segmento.nombre+'! '+tiempoTxt+', '+mejoraSeg+' segundos más rápido que tu mejor marca. +10 Darma por la marca nueva.'); _ganarDarma(10); au(); sincronizarStats(); }
    else if(esRecord){ h('¡Terminaste el segmento '+segmento.nombre+' en '+tiempoTxt+'! Primera vez que lo corres, esa es tu marca a superar. +10 Darma.'); _ganarDarma(10); au(); sincronizarStats(); }
    else { h('Terminaste el segmento '+segmento.nombre+' en '+tiempoTxt+'. No superaste tu mejor marca, así que esta vuelta no suma Darma — pero sigue quedando en tu historial.'); }
    _actualizarBadgeSegmento();
  }catch(e){}
}
async function crearSegmentoDesdeRuta(localId){
  const r=_rutaPorId(localId);
  if(!r || !r.points || r.points.length<2){ lpAviso('Esta ruta no tiene suficientes puntos para ser un segmento.'); return; }
  const nombre=await lpPedirTexto('Nombre del segmento:','ej: Subida al mirador');
  if(!nombre || !nombre.trim()) return;
  const inicio=r.points[0], fin=r.points[r.points.length-1];
  try{
    await db.collection('segmentos').add({nombre:nombre.trim(), desc:'', inicio:{lat:inicio.lat,lon:inicio.lon}, fin:{lat:fin.lat,lon:fin.lon}, distanciaKm:r.distance||0, creadoPor:cu, nombreCreador:nombreUsuario||'Ciclista', ts:firebase.firestore.FieldValue.serverTimestamp()});
    h('Segmento "'+nombre.trim()+'" creado. Ya cualquiera puede competir por el mejor tiempo ahí.');
  }catch(e){ lpAviso('No se pudo crear el segmento.'); }
}
async function verSegmentos(){
  _modalVolverA=null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-flag-checkered"></i> Segmentos';
  const c=document.getElementById('modalContent');
  c.innerHTML=_btnVolverModal()+'<p style="color:#888">Cargando segmentos...</p>';
  document.getElementById('userModal').classList.add('on');
  try{
    const snap=await db.collection('segmentos').orderBy('ts','desc').limit(50).get();
    if(snap.empty){ c.innerHTML=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.85rem">Aún no hay segmentos. Crea uno desde Historial de rutas → elige una ruta → <i class="fas fa-flag-checkered"></i> Crear segmento.</p>'; return; }
    c.innerHTML=_btnVolverModal()+snap.docs.map(function(d){ const s=d.data(); const nom=escapeHTML(s.nombre||'').replace(/'/g,"\\'"); return '<div class="novedad-card"><h4>'+escapeHTML(s.nombre||'')+'</h4><p>'+(s.distanciaKm||0).toFixed(2)+' km · por '+escapeHTML(s.nombreCreador||'Ciclista')+'</p><button class="ab sec" style="margin:0" onclick="verTablaLideresSegmento(\''+d.id+'\',\''+nom+'\')"><i class="fas fa-trophy"></i> Ver tabla de líderes</button></div>'; }).join('');
  }catch(e){ c.innerHTML=_btnVolverModal()+'<p style="color:#888">No se pudieron cargar los segmentos.</p>'; }
}
async function verTablaLideresSegmento(segmentoId, nombre){
  _modalVolverA='verSegmentos';
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-trophy"></i> '+escapeHTML(nombre);
  const c=document.getElementById('modalContent');
  c.innerHTML=_btnVolverModal()+'<p style="color:#888">Cargando tabla de líderes...</p>';
  document.getElementById('userModal').classList.add('on');
  try{
    // Sin orderBy en la consulta (evita necesitar un índice compuesto): se ordena
    // en el cliente, liviano porque son pocas marcas por segmento.
    const snap=await db.collection('segmentoTiempos').where('segmentoId','==',segmentoId).limit(300).get();
    // Bug real (2026-08-31): _guardarTiempoSegmento hace .add() en CADA intento -- un
    // documento nuevo por corrida, nunca sobrescribe. Sin deduplicar por usuario, alguien
    // que corre el mismo segmento varias veces mejorando su marca ocupaba varios puestos
    // del top 20 (hasta el podio completo) con sus propios intentos, desplazando a otros
    // ciclistas. "Tabla de líderes estilo Strava" debe ser por MEJOR marca de cada uno, no
    // por intento -- se agrupa por usuario quedándose con su tiempoMs mínimo antes de
    // ordenar y cortar a 20.
    const porUsuario=new Map();
    snap.docs.forEach(function(d){ const x=d.data(); const key=x.user||d.id; const prev=porUsuario.get(key); if(!prev || x.tiempoMs<prev.tiempoMs) porUsuario.set(key,x); });
    const tiempos=Array.from(porUsuario.values()).sort(function(a,b){return a.tiempoMs-b.tiempoMs;}).slice(0,20);
    if(!tiempos.length){ c.innerHTML=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.85rem">Nadie ha marcado tiempo todavía. ¡Sé el primero!</p>'; return; }
    const med=['🥇','🥈','🥉']; let pos=0;
    c.innerHTML=_btnVolverModal()+tiempos.map(function(t){ pos++; const mins=Math.floor(t.tiempoMs/60000), segs=Math.floor((t.tiempoMs%60000)/1000); const yo=t.user===cu; return '<div style="display:flex;align-items:center;gap:10px;padding:9px;border-radius:10px;margin-bottom:5px;background:'+(yo?'rgba(252,76,2,0.12)':'var(--gl)')+';border:1px solid '+(yo?'var(--p)':'#242c3e')+'"><div style="font-weight:800;min-width:30px;text-align:center">'+(med[pos-1]||('#'+pos))+'</div><div style="flex:1;font-weight:700;font-size:0.86rem">'+escapeHTML(t.nombre||'Ciclista')+(yo?' (tú)':'')+'</div><div style="font-weight:800;color:var(--g)">'+mins+'m '+segs+'s</div></div>'; }).join('');
  }catch(e){ c.innerHTML=_btnVolverModal()+'<p style="color:#888">No se pudo cargar la tabla.</p>'; }
}
