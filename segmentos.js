/* ===== SEGMENTOS Y TABLA DE LÍDERES (estilo Strava) =====
   Un segmento es un tramo con inicio y fin fijos: los mismos puntos con los que
   arrancó y terminó alguna ruta ya grabada (no hace falta mapear calles aparte).
   Mientras andás, si pasás cerca del punto de inicio se "arma" el cronómetro; al
   pasar cerca del fin, se guarda tu marca. Todo con el mismo GPS que ya corre. */
const SEGMENTO_RADIO_M=40;
var segmentosActivos=[], segmentosEstado={}, segmentosCargados=false; // var a propósito: reseteadas/leidas desde fuera de este archivo (fin de viaje, bucle de GPS)
async function iniciarSeguimientoSegmentos(lat,lon){
  segmentosEstado={}; segmentosActivos=[]; _segPrev=null;
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
/* 2026-10-15 (auditoría "sin datos falsos"), tres errores que daban marcas falsas:
   1. Con posiciones cada 15-30 s (pantalla apagada) se saltaba el círculo de 40 m del inicio o del fin:
      el segmento no se armaba o cerraba tarde. Ahora se mira el TRAMO entre la posición anterior y la
      actual, y la hora de paso se interpola (segPaso, pura).
   2. Segmento de ida y vuelta (inicio = fin): se armaba y cerraba en el mismo instante → "récord" de
      0 s. Ahora para cerrar hay que haberse alejado al menos 150 m del inicio. (No se usa el largo
      guardado del segmento: los creados desde paseos grabados antes de este arreglo traen un largo
      equivocado — ver km-viaje.js.)
   3. En vehículo se registraban tiempos en la tabla de los ciclistas. Ahora no se arma en modo Motorizado.
   Además se descarta una marca imposible: más de 90 km/h promedio en línea recta (un mínimo seguro). */
const SEGMENTO_SALIDA_M=150;
function segPaso(prev, cur, punto, radioM){
  // ¿el tramo prev→cur pasa a menos de radioM de punto? Devuelve la hora de paso (ms) o null.
  const k=111320, c=Math.cos(punto.lat*Math.PI/180);
  const bx=(cur.lon-punto.lon)*k*c, by=(cur.lat-punto.lat)*k;
  if(!prev) return Math.hypot(bx,by)<radioM ? cur.t : null;
  const ax=(prev.lon-punto.lon)*k*c, ay=(prev.lat-punto.lat)*k;
  const dx=bx-ax, dy=by-ay, len2=dx*dx+dy*dy;
  let t=len2>0?-(ax*dx+ay*dy)/len2:1; t=Math.max(0,Math.min(1,t));
  return Math.hypot(ax+t*dx, ay+t*dy)<radioM ? Math.round(prev.t+(cur.t-prev.t)*t) : null;
}
let _segPrev=null;
function _verificarSegmentos(lat,lon){
  const cur={lat:lat, lon:lon, t:Date.now()}, prev=_segPrev; _segPrev=cur;
  if(!segmentosActivos.length) return;
  if(typeof actividadTipo!=='undefined' && actividadTipo==='moto') return; // la tabla es de quienes van a pulso
  segmentosActivos.forEach(function(s){
    if(!s.inicio||!s.fin) return;
    const est=segmentosEstado[s.id]||(segmentosEstado[s.id]={armado:false,inicioMs:null,salio:false});
    if(!est.armado){
      const tIni=segPaso(prev, cur, s.inicio, SEGMENTO_RADIO_M);
      if(tIni!=null){ est.armado=true; est.inicioMs=tIni; est.salio=false; h('Entraste al segmento '+s.nombre+'. ¡Dale con todo!'); }
    } else {
      if(!est.salio){ if(calculateDistance(lat,lon,s.inicio.lat,s.inicio.lon)>SEGMENTO_SALIDA_M) est.salio=true; else return; } // ida y vuelta: primero hay que irse
      const tFin=segPaso(prev, cur, s.fin, SEGMENTO_RADIO_M);
      if(tFin==null) return;
      const tiempoMs=tFin-est.inicioMs;
      est.armado=false;
      const rectaKm=calculateDistance(s.inicio.lat,s.inicio.lon,s.fin.lat,s.fin.lon)/1000;
      if(!(tiempoMs>0) || rectaKm/(tiempoMs/3600000)>90) return; // marca imposible: no se guarda
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
    let esRecord=false, mejoraSeg=null, sabido=false;
    try{
      const prevSnap=await db.collection('segmentoTiempos').where('segmentoId','==',segmento.id).where('user','==',cu).get();
      // 2026-10-15: sin señal la consulta responde con lo guardado en el teléfono (puede estar vacío): no se
      // afirma "primera vez" ni "récord" (ni se da Darma) si el dato no viene del servidor.
      sabido=!(prevSnap.metadata && prevSnap.metadata.fromCache);
      const prevMin=prevSnap.docs.reduce(function(m,d){ const t=d.data().tiempoMs; return (t!=null && t<m)?t:m; }, Infinity);
      if(sabido && prevMin!==Infinity && tiempoMs<prevMin){ esRecord=true; mejoraSeg=Math.round((prevMin-tiempoMs)/1000); }
      else if(sabido && prevMin===Infinity){ esRecord=true; } // primera vez que lo corres
    }catch(e){}
    // 2026-10-15: sin señal, esperar al servidor dejaba el resultado del segmento sin decir hasta volver la conexión.
    // La marca queda en cola y sube sola; el resultado se dice ya.
    await lpEscrituraConTope(db.collection('segmentoTiempos').add({segmentoId:segmento.id, user:cu, nombre:nombreUsuario||'Ciclista', tiempoMs:tiempoMs, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()}), 4000);
    const tiempoTxt=_fmtSegmentoTiempo(tiempoMs);
    if(esRecord && mejoraSeg){ const _g=_ganarDarma(10); h('¡Nuevo récord personal en '+segmento.nombre+'! '+tiempoTxt+', '+mejoraSeg+' segundos más rápido que tu mejor marca. '+_g+' de Darma por la marca nueva.'); }
    else if(esRecord){ const _g=_ganarDarma(10); h('¡Terminaste el segmento '+segmento.nombre+' en '+tiempoTxt+'! Primera vez que lo corres, esa es tu marca a superar. '+_g+' de Darma.'); }
    else if(!sabido){ h('Terminaste el segmento '+segmento.nombre+' en '+tiempoTxt+'. Sin señal no puedo compararlo con tus marcas; queda guardado y lo verás en la tabla.'); }
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
    await db.collection('segmentos').add({nombre:nombre.trim(), desc:'', inicio:{lat:inicio.lat,lon:inicio.lon}, fin:{lat:fin.lat,lon:fin.lon}, distanciaKm:(typeof kmTrazado==='function'?Math.round(kmTrazado(r.points)*100)/100:(r.distance||0)), creadoPor:cu, nombreCreador:nombreUsuario||'Ciclista', ts:firebase.firestore.FieldValue.serverTimestamp()});
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
    // Auditoría 2026-09-09 (XSS crítico): antes se armaba `nom` con escapeHTML(...).replace(/'/g,"\\'")
    // e iba directo dentro de onclick="...('...','ESO')" -- pero escapeHTML YA convirtió las
    // comillas en &#39;, así que el .replace no encontraba nada (dead code). El navegador
    // decodifica esas entidades ANTES de correr el JS del onclick, así que un nombre de
    // segmento con una comilla rompía el string y ejecutaba JS arbitrario -- alcanzable
    // desde la UI normal, sin bypasear nada. Fix: el nombre ya NO se interpola en el
    // onclick; va en un atributo data-nombre (contexto HTML normal, un solo nivel de
    // parseo) y se lee desde ahí con this.dataset.nombre al momento del click.
    c.innerHTML=_btnVolverModal()+snap.docs.map(function(d){ const s=d.data(); const nomEsc=escapeHTML(s.nombre||''); return '<div class="novedad-card"><h4>'+nomEsc+'</h4><p>'+(s.distanciaKm||0).toFixed(2)+' km · por '+escapeHTML(s.nombreCreador||'Ciclista')+'</p><button class="ab sec" style="margin:0" data-nombre="'+nomEsc+'" onclick="verTablaLideresSegmento(\''+d.id+'\',this.dataset.nombre)"><i class="fas fa-trophy"></i> Ver tabla de líderes</button></div>'; }).join('');
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
