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
