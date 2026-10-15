/* ===== RUTAS RECOMENDADAS DESDE GPX =====
   Pedido de Inty 2026-10-15: cualquier usuario sube el GPX de una ruta que YA hizo y queda
   publicada como "ruta recomendada": se ve en el mapa de todos con un color propio (distinto
   del naranjo de la ruta en curso y del dorado de tus rutas) y cualquiera la puede descargar
   en GPX para llevarla a su app.

   Hoy importarGPX() (motor-navegacion.js) solo guarda la ruta en TU historial. Esto la
   publica para la comunidad, en su propia colección (rutasRecomendadas) y no en /routes:
   /routes son los viajes grabados de cada uno (alimentan estadísticas, retos y "Rutas para
   ti"); una ruta recomendada es otra cosa — alguien diciendo "esta vale la pena".

   Privacidad: un GPX ya hecho casi siempre parte o termina en la casa de quien lo grabó.
   Se recortan 200 m de cada punta antes de publicar (mismo criterio que pointsPub de
   /routes, pero por distancia y sin redondear el resto: una ruta para seguir necesita la
   línea exacta, no una aproximación a 100 m). El GPX descargable sale de lo publicado, nunca
   del archivo original. */

const RREC_COLECCION='rutasRecomendadas';
const RREC_COLOR='#a855f7';          // violeta: ni el naranjo de la ruta en curso ni el dorado de las tuyas
const RREC_RECORTE_M=200;            // privacidad: se come esto de cada punta
const RREC_MAX_PUNTOS=1500;          // ~60 KB por documento; sobra para que la línea se vea fiel
const RREC_MIN_KM=1;                 // menos que esto no es una ruta para recomendar
const RREC_RADIO_CELDAS=1;           // busca en la celda de 1° donde estás y las 8 vecinas (~110 km)

/* ---------- Lógica pura (probada en tests/rutas-recomendadas.test.mjs) ---------- */

function _rrecDistM(a, b){
  const R=6371000, rad=Math.PI/180;
  const dLat=(b.lat-a.lat)*rad, dLon=(b.lon-a.lon)*rad;
  const s=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return 2*R*Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}
// Saca `metros` de cada punta. Si la ruta es tan corta que no queda nada, devuelve [].
function rrecRecortarPuntas(pts, metros){
  if(!pts || pts.length<2) return [];
  let i=0, acc=0;
  while(i<pts.length-1 && acc<metros){ acc+=_rrecDistM(pts[i], pts[i+1]); i++; }
  let j=pts.length-1; acc=0;
  while(j>0 && acc<metros){ acc+=_rrecDistM(pts[j-1], pts[j]); j--; }
  return i<j ? pts.slice(i, j+1) : [];
}
// Deja como máximo `max` puntos, repartidos parejo y conservando siempre el último.
function rrecSimplificar(pts, max){
  if(!pts || pts.length<=max) return (pts||[]).slice();
  const paso=(pts.length-1)/(max-1), out=[];
  for(let k=0;k<max;k++) out.push(pts[Math.round(k*paso)]);
  return out;
}
// Lo que se guarda de cada punto: lat/lon a 5 decimales (~1 m) y altura si viene.
function rrecLimpiarPunto(p){
  const o={lat:Math.round(p.lat*1e5)/1e5, lon:Math.round(p.lon*1e5)/1e5};
  if(typeof p.alt==='number' && !isNaN(p.alt)) o.alt=Math.round(p.alt);
  return o;
}
function rrecResumen(pts){
  let dist=0, subida=0, s=90, w=180, n=-90, e=-180;
  for(let k=0;k<pts.length;k++){
    const p=pts[k];
    if(k){ dist+=_rrecDistM(pts[k-1], p); if(typeof p.alt==='number' && typeof pts[k-1].alt==='number' && p.alt>pts[k-1].alt) subida+=p.alt-pts[k-1].alt; }
    s=Math.min(s,p.lat); n=Math.max(n,p.lat); w=Math.min(w,p.lon); e=Math.max(e,p.lon);
  }
  return {distance:Math.round(dist/10)/100, subida:Math.round(subida), bbox:{s:s,w:w,n:n,e:e}};
}
// Celda de 1° (~110 km) del punto de partida: con eso se buscan las rutas cercanas con un
// solo `where in`, sin índice geográfico.
function rrecCelda(lat, lon){ return Math.floor(lat)+'_'+Math.floor(lon); }
function rrecCeldasVecinas(lat, lon){
  const out=[];
  for(let a=-RREC_RADIO_CELDAS;a<=RREC_RADIO_CELDAS;a++) for(let b=-RREC_RADIO_CELDAS;b<=RREC_RADIO_CELDAS;b++) out.push(rrecCelda(lat+a, lon+b));
  return out;
}
/* Arma el documento a publicar desde los puntos de un GPX. Devuelve {error} si no sirve. */
function rrecArmarDocumento(points, nombre, desc){
  const validos=(points||[]).filter(function(p){ return p && typeof p.lat==='number' && typeof p.lon==='number' && !isNaN(p.lat) && !isNaN(p.lon); });
  if(validos.length<2) return {error:'Ese GPX no tiene puntos de ruta que pueda leer.'};
  const recortada=rrecRecortarPuntas(validos, RREC_RECORTE_M);
  if(recortada.length<2) return {error:'La ruta es muy corta para recomendarla.'};
  const puntos=rrecSimplificar(recortada, RREC_MAX_PUNTOS).map(rrecLimpiarPunto);
  const res=rrecResumen(puntos);
  if(res.distance<RREC_MIN_KM) return {error:'La ruta es muy corta para recomendarla (menos de 1 km).'};
  return {
    nombre:String(nombre||'Ruta recomendada').trim().slice(0,100),
    desc:String(desc||'').trim().slice(0,400),
    puntos:puntos, distance:res.distance, subida:res.subida, bbox:res.bbox,
    inicio:{lat:puntos[0].lat, lon:puntos[0].lon}, celda:rrecCelda(puntos[0].lat, puntos[0].lon)
  };
}

/* ---------- Nube ---------- */

async function rrecPublicar(points, nombre, desc){
  if(!cu){ lpAviso('Entra con tu cuenta para recomendar una ruta.'); return null; }
  const d=rrecArmarDocumento(points, nombre, desc);
  if(d.error){ lpAviso(d.error); return null; }
  d.autor=cu; d.authUid=window.lpUID||null;
  d.nombreAutor=(typeof nombreUsuario!=='undefined' && nombreUsuario)||'Ciclista';
  d.ts=firebase.firestore.FieldValue.serverTimestamp();
  try{
    const ref=await db.collection(RREC_COLECCION).add(d);
    h('Listo: "'+d.nombre+'" quedó como ruta recomendada, '+d.distance.toFixed(1)+' kilómetros. Ya la ve la comunidad en el mapa.');
    return ref.id;
  }catch(e){ lpAviso('No se pudo publicar la ruta. Revisa tu señal e inténtalo de nuevo.'); return null; }
}
// Recomendadas que parten cerca (~110 km a la redonda). Sin GPS, no se adivina: lista vacía.
async function rrecListarCerca(lat, lon){
  if(lat==null || lon==null) return [];
  try{
    const snap=await db.collection(RREC_COLECCION).where('celda','in',rrecCeldasVecinas(lat, lon)).limit(60).get();
    return snap.docs.map(function(doc){ return Object.assign({id:doc.id}, doc.data()); });
  }catch(e){ return []; }
}
function rrecDescargarGPX(id){
  db.collection(RREC_COLECCION).doc(id).get().then(function(doc){
    if(!doc.exists){ lpAviso('Esa ruta ya no está publicada.'); return; }
    const r=doc.data();
    if(_descargarGPX(_gpxDeRuta(r.puntos||[], r.nombre||'Ruta recomendada'), r.nombre||'ruta-recomendada')) h(GPX_LISTO);
  }).catch(function(){ lpAviso('No pude abrir esa ruta.'); });
}
async function rrecBorrar(id){
  try{ await db.collection(RREC_COLECCION).doc(id).delete(); h('Quitaste la ruta de las recomendadas.'); return true; }
  catch(e){ lpAviso('No se pudo quitar la ruta.'); return false; }
}

/* ---------- En el mapa (maqueta aprobada por Inty 2026-10-15, disenos-ui/rodada-radio-gpx) ---------- */

let _rrecDatos=[], _rrecLineas=[], _rrecIntentos=0;
// Se llama cuando el mapa principal carga (mapa-render.js) y después de publicar una ruta.
async function rrecCargarEnMapa(){
  if(typeof mp==='undefined' || !mp) return;
  const yo=(typeof currentUserLocation!=='undefined' && currentUserLocation) || ((typeof us!=='undefined' && us && us.la!=null)?{lat:us.la, lon:us.lo}:null);
  if(!yo){ if(_rrecIntentos++<6) setTimeout(rrecCargarEnMapa, 20000); return; } // todavía sin GPS: reintenta un rato
  _rrecDatos=(await rrecListarCerca(yo.lat, yo.lon)).filter(function(r){ return r.puntos && r.puntos.length>1; });
  rrecRepintar();
}
// Dibuja (o vuelve a dibujar tras cambiar la capa del mapa, que borra todo lo agregado).
function rrecRepintar(){
  if(typeof mp==='undefined' || !mp) return;
  _rrecLineas.forEach(function(x){ try{ x.off(); }catch(e){} try{ mp.removeLayer(x.linea); }catch(e){} try{ x.inicio.remove(); }catch(e){} });
  _rrecLineas=_rrecDatos.map(function(r){
    const linea=mlPolyline(r.puntos.map(function(p){ return [p.lat,p.lon]; }), {color:RREC_COLOR, weight:4, opacity:0.9}).addTo(mp);
    const abrir=function(){ rrecVerTarjeta(r.id); };
    const cursor=function(){ try{ mp.getCanvas().style.cursor='pointer'; }catch(e){} };
    const sinCursor=function(){ try{ mp.getCanvas().style.cursor=''; }catch(e){} };
    mp.on('click', linea._id, abrir); mp.on('mouseenter', linea._id, cursor); mp.on('mouseleave', linea._id, sinCursor);
    // Una línea de 4 px cuesta tocarla con el dedo: el punto de partida es el blanco fácil.
    const inicio=mlMarker([r.inicio.lat, r.inicio.lon], {icon:{html:'<div class="rrec-inicio" role="button" aria-label="Ruta recomendada: '+escapeHTML(r.nombre||'')+'"></div>'}}).addTo(mp);
    try{ inicio._ml.getElement().addEventListener('click', function(ev){ ev.stopPropagation(); abrir(); }); }catch(e){}
    return {linea:linea, inicio:inicio, off:function(){ mp.off('click', linea._id, abrir); mp.off('mouseenter', linea._id, cursor); mp.off('mouseleave', linea._id, sinCursor); }};
  });
}
function _rrecPorId(id){ return _rrecDatos.find(function(r){ return r.id===id; }); }
const _RREC_LEYENDA='<div class="rrec-leyenda"><span><i style="background:'+RREC_COLOR+'"></i>Recomendada</span><span><i style="background:#ffd700"></i>Tus rutas</span><span><i style="background:#fc4c02"></i>En curso</span></div>';
function rrecVerTarjeta(id){
  const r=_rrecPorId(id); if(!r) return;
  if(typeof _modalVolverA!=='undefined') _modalVolverA=null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-route"></i> Ruta recomendada';
  const esMia=(typeof cu!=='undefined' && cu && r.autor===cu);
  document.getElementById('modalContent').innerHTML=_RREC_LEYENDA+
    '<div class="rrec-tarjeta"><span class="rrec-sello">Ruta recomendada</span>'+
    '<h4>'+escapeHTML(r.nombre||'Ruta recomendada')+'</h4>'+
    '<div class="rrec-datos"><span><b>'+(r.distance||0).toFixed(1)+'</b> km</span>'+(r.subida?'<span><b>'+r.subida+'</b> m subida</span>':'')+'<span>de '+escapeHTML(r.nombreAutor||'un ciclista')+'</span></div>'+
    (r.desc?'<p class="rrec-desc">'+escapeHTML(r.desc)+'</p>':'')+
    '<div class="rrec-botones"><button class="ab rrec-pri" onclick="rrecPedalear(\''+r.id+'\')"><i class="fas fa-person-biking"></i> Pedalearla</button>'+
    '<button class="ab sec" onclick="rrecDescargarGPX(\''+r.id+'\')"><i class="fas fa-download"></i> Bajar GPX</button></div>'+
    (esMia?'<button class="ab sec rrec-quitar" onclick="rrecQuitarDesdeTarjeta(\''+r.id+'\')"><i class="fas fa-trash-can"></i> Quitar de las recomendadas</button>':'')+
    '</div>';
  document.getElementById('userModal').classList.add('on');
}
/* Pedalearla: la ruta queda en TUS rutas (dorado, con perfil de elevación y todo lo demás) y
   Pistero te lleva hasta su punto de partida. La navegación giro a giro por un trazado GPX no
   existe todavía en la app: hasta el inicio se navega como a cualquier destino, y desde ahí la
   línea violeta queda en el mapa para seguirla. */
function rrecPedalear(id){
  const r=_rrecPorId(id); if(!r) return;
  try{
    const ya=rutasLocales().some(function(x){ return x.rrecId===id; });
    if(!ya){
      rutasLocalesSet(rutasLocales().concat([{ localId:'rrec_'+id, rrecId:id, nombreRuta:r.nombre||'Ruta recomendada', points:r.puntos, distance:r.distance||0, calories:Math.round((r.distance||0)*30), startTime:Date.now(), importada:true }]));
      if(typeof renderRutas==='function') renderRutas();
    }
  }catch(e){}
  if(typeof closeModal==='function') closeModal();
  irAlPuntoYNavegar(r.inicio.lat, r.inicio.lon, 'el inicio de '+(r.nombre||'la ruta'));
}
async function rrecQuitarDesdeTarjeta(id){
  if(!(await lpConfirmar('¿Quitar esta ruta de las recomendadas? Deja de verse en el mapa de todos.'))) return;
  if(await rrecBorrar(id)){ _rrecDatos=_rrecDatos.filter(function(r){ return r.id!==id; }); rrecRepintar(); if(typeof closeModal==='function') closeModal(); }
}
/* Después de importar un GPX (importarGPX, motor-navegacion.js) se ofrece recomendarla. Se
   pregunta SIEMPRE antes de publicar, también si entró por "Recomendar una ruta a la
   comunidad": publicar es para todos y no se hace sin un sí explícito. La descripción es
   opcional (lpPedirTexto devuelve null tanto vacío como cancelado: las dos cosas = sin texto). */
let _rrecDesdeBoton=false;
function rrecSubirGPX(){ _rrecDesdeBoton=true; document.getElementById('gpxFileInput').click(); }
async function rrecOfrecerPublicar(points, nombre){
  const directo=_rrecDesdeBoton; _rrecDesdeBoton=false;
  if(typeof cu==='undefined' || !cu) return;
  const pregunta=(directo?'¿Publicar "'+nombre+'" como ruta recomendada?':'¿Recomiendas "'+nombre+'" a la comunidad?')+
    '\nSe verá en violeta en el mapa de todos y la podrán bajar en GPX. Para cuidar tu casa, se borran 200 m del inicio y del final.';
  if(!(await lpConfirmar(pregunta))) return;
  const desc=await lpPedirTexto('Cuéntale a los demás cómo es (opcional).', 'Ej: ripio los últimos 5 km, buena sombra');
  const id=await rrecPublicar(points, nombre, desc||'');
  if(id) rrecCargarEnMapa();
}
