/* ===== NAVEGAR UNA RUTA GPX, SOLO POR VOZ =====
   Pedido de Inty 2026-10-15: "un ciclista no puede ir viendo el teléfono para seguir un mapa,
   tiene que ser audible: girar a la izquierda, a la derecha, viene una subida, una bajada".
   Hasta hoy la app solo navegaba hacia un DESTINO (OSRM calcula el camino y sus giros). Una ruta
   GPX ya trae el camino; lo que faltaba eran los giros. Este módulo los saca de la forma de la
   línea y se los entrega al MISMO motor de navegación de siempre (checkNavigationSteps,
   showStepInstruction, avisos de pendiente), así que se oye igual que una navegación normal.

   - Giros, sin señal: la línea se simplifica (saca el temblor del GPS), se remuestrea cada 10 m
     y se mide cuánto cambia el rumbo entre los 30 m de antes y los 30 m de después de cada punto.
     Desde 50° es un giro; desde 110°, curva cerrada; desde 160°, media vuelta. Dos giros a menos
     de 50 m se dicen juntos ("a la izquierda y enseguida a la derecha").
   - Nombres de calles, si hay señal al partir: se pasa la línea por el "map matching" de OSRM.
     Si OSRM ve un cruce en ese giro, se agrega el nombre ("gira a la izquierda por Camino a
     Llifén"); si no ve ningún cruce, el camino solo dobla y se dice "curva a la izquierda".
     También agrega giros suaves en cruces que la forma sola no delata (una bifurcación a 30°),
     pero solo si el cruce queda pegado a la línea del GPX. Sin señal, se queda con lo de la forma.
   - Subidas y bajadas: si el GPX trae alturas, el perfil sale de ahí (sin señal). Si no, lo pide
     el motor de siempre (_prefetchPerfilRuta, Open-Meteo).
   - Desvío: no se recalcula hacia un destino; se guía de vuelta a la línea ("está a 80 metros,
     hacia tu derecha") y se avisa al volver. La búsqueda de "dónde voy" mira solo cerca de lo
     ya avanzado: en una ruta de ida y vuelta por el mismo camino, la vuelta no se confunde con
     la ida.
   - Llegar al inicio: si estás lejos del punto de partida y hay señal, se antepone el tramo
     hasta ahí (OSRM) como una sola navegación continua. */

const GPXN_DP_M=8;          // tolerancia de simplificación: menos que esto es temblor del GPS
const GPXN_PASO_M=10;       // remuestreo
const GPXN_VENTANA=3;       // 3 pasos de 10 m = 30 m antes y después del punto
const GPXN_GIRO_MIN=50;     // grados
const GPXN_CERRADA=110;
const GPXN_VUELTA=160;
const GPXN_JUNTAR_M=50;     // dos giros más cerca que esto se dicen en una frase
const GPXN_FUERA_M=60;      // más lejos que esto de la línea = fuera de ruta
const GPXN_AVISO_FUERA_CADA_MS=90000;
const GPXN_VEL_KMH=18;      // para la hora estimada de llegada en bici

/* ---------- Geometría (pura, tests/navegar-gpx.test.mjs) ---------- */

function gpxnDist(a, b){
  const R=6371000, r=Math.PI/180;
  const dLat=(b.lat-a.lat)*r, dLon=(b.lon-a.lon)*r;
  const s=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return 2*R*Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}
function gpxnRumbo(a, b){
  const r=Math.PI/180;
  const y=Math.sin((b.lon-a.lon)*r)*Math.cos(b.lat*r);
  const x=Math.cos(a.lat*r)*Math.sin(b.lat*r)-Math.sin(a.lat*r)*Math.cos(b.lat*r)*Math.cos((b.lon-a.lon)*r);
  return (Math.atan2(y, x)/r+360)%360;
}
function gpxnNorm(x){ x=((x+180)%360+360)%360-180; return x===-180?180:x; } // (-180, 180]: + derecha, - izquierda
// Douglas-Peucker en metros locales (iterativo: un track de miles de puntos no revienta la pila).
function gpxnSimplificar(pts, tol){
  if(!pts || pts.length<3) return (pts||[]).slice();
  const lat0=pts[0].lat*Math.PI/180, k=111320;
  const xy=pts.map(function(p){ return [p.lon*k*Math.cos(lat0), p.lat*k]; });
  const keep=new Uint8Array(pts.length); keep[0]=keep[pts.length-1]=1;
  const pila=[[0, pts.length-1]];
  while(pila.length){
    const par=pila.pop(), a=par[0], b=par[1];
    const ax=xy[a][0], ay=xy[a][1], dx=xy[b][0]-ax, dy=xy[b][1]-ay, len2=dx*dx+dy*dy;
    let maxD=-1, idx=-1;
    for(let i=a+1;i<b;i++){
      let t=len2>0?((xy[i][0]-ax)*dx+(xy[i][1]-ay)*dy)/len2:0; t=Math.max(0, Math.min(1, t));
      const d=Math.hypot(xy[i][0]-(ax+t*dx), xy[i][1]-(ay+t*dy));
      if(d>maxD){ maxD=d; idx=i; }
    }
    if(maxD>tol){ keep[idx]=1; pila.push([a, idx], [idx, b]); }
  }
  return pts.filter(function(_, i){ return keep[i]; });
}
// Un punto cada `paso` metros a lo largo de la línea, con su distancia acumulada (d) y altura si hay.
function gpxnRemuestrear(pts, paso){
  const out=[]; if(!pts || pts.length<2) return out;
  const conAlt=function(p){ return typeof p.alt==='number' && isFinite(p.alt); };
  out.push({lat:pts[0].lat, lon:pts[0].lon, d:0, alt:conAlt(pts[0])?pts[0].alt:null});
  let acum=0, sig=paso;
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1], b=pts[i], seg=gpxnDist(a, b);
    if(seg<=0) continue;
    while(acum+seg>=sig){
      const t=(sig-acum)/seg;
      out.push({lat:a.lat+(b.lat-a.lat)*t, lon:a.lon+(b.lon-a.lon)*t, d:sig,
        alt:(conAlt(a)&&conAlt(b))?a.alt+(b.alt-a.alt)*t:null});
      sig+=paso;
    }
    acum+=seg;
  }
  const u=pts[pts.length-1];
  if(acum-out[out.length-1].d>1) out.push({lat:u.lat, lon:u.lon, d:acum, alt:conAlt(u)?u.alt:null});
  return out;
}
// Giros por la forma: [{i, d, ang, lat, lon}] — ang + derecha, - izquierda.
function gpxnDetectarGiros(rm){
  const k=GPXN_VENTANA, cand=[];
  for(let i=k;i<rm.length-k;i++){
    const ang=gpxnNorm(gpxnRumbo(rm[i], rm[i+k])-gpxnRumbo(rm[i-k], rm[i]));
    if(Math.abs(ang)>=GPXN_GIRO_MIN) cand.push({i:i, ang:ang});
  }
  // Puntos seguidos del mismo giro: se queda el de mayor ángulo.
  const giros=[];
  for(let j=0;j<cand.length;j++){
    const c=cand[j], ult=giros[giros.length-1];
    if(ult && c.i-ult._fin<=2 && Math.sign(c.ang)===Math.sign(ult.ang)){
      ult._fin=c.i;
      if(Math.abs(c.ang)>Math.abs(ult.ang)){ ult.i=c.i; ult.ang=c.ang; }
    } else giros.push({i:c.i, ang:c.ang, _fin:c.i});
  }
  return giros.map(function(g){ return {i:g.i, d:rm[g.i].d, ang:g.ang, lat:rm[g.i].lat, lon:rm[g.i].lon}; });
}
function _gpxnLado(ang){ return ang>0?'derecha':'izquierda'; }
function gpxnModificador(ang){
  const a=Math.abs(ang), lado=ang>0?'right':'left';
  if(a>=GPXN_VUELTA) return 'uturn';
  if(a>=GPXN_CERRADA) return 'sharp '+lado;
  if(a>=GPXN_GIRO_MIN) return lado;
  return 'slight '+lado;
}
// Frase de un giro. curva=true cuando OSRM confirmó que ahí no hay cruce (el camino solo dobla).
function gpxnTextoGiro(ang, calle, curva){
  const a=Math.abs(ang), lado=_gpxnLado(ang), s=calle?' por '+calle:'';
  if(a>=GPXN_VUELTA) return 'Da media vuelta y sigue la ruta de regreso';
  if(curva) return (a>=GPXN_CERRADA?'Curva cerrada a la ':'Curva a la ')+lado;
  if(a>=GPXN_CERRADA) return 'Curva cerrada a la '+lado+s;
  if(a>=GPXN_GIRO_MIN) return 'Gira a la '+lado+s;
  return 'Mantente a la '+lado+s;
}
// Perfil para los avisos de subida/bajada, desde las alturas del GPX (sin señal). Cada 40 m,
// suavizado (la altura del GPS salta) en el mismo formato que _prefetchPerfilRuta.
function gpxnPerfil(rm){
  const con=rm.filter(function(p){ return p.alt!=null; });
  if(rm.length<5 || con.length<rm.length*0.6) return [];
  const out=[];
  for(let i=0;i<rm.length;i+=4){
    let s=0, n=0;
    for(let j=Math.max(0, i-8);j<=Math.min(rm.length-1, i+8);j++){ if(rm[j].alt!=null){ s+=rm[j].alt; n++; } }
    if(n) out.push({d:rm[i].d, ele:s/n, lat:rm[i].lat, lon:rm[i].lon});
  }
  return out;
}
/* La ruta lista para el motor de navegación: pasos con el mismo formato que los de OSRM
   ({instruction, distance, maneuver:{type, modifier, location:[lon,lat]}}) + dRuta (dónde cae
   cada paso a lo largo de la ruta), la línea, el perfil y la distancia total. */
function gpxnPasos(points, nombre){
  const validos=(points||[]).filter(function(p){ return p && isFinite(p.lat) && isFinite(p.lon); });
  if(validos.length<2) return {error:'Esa ruta no tiene puntos que pueda seguir.'};
  const rm=gpxnRemuestrear(gpxnSimplificar(validos, GPXN_DP_M), GPXN_PASO_M);
  const total=rm[rm.length-1].d;
  if(total<200) return {error:'La ruta es muy corta para guiarte por ella.'};
  const giros=gpxnDetectarGiros(rm);
  const pasos=[{instruction:'Comienza la ruta'+(nombre?' '+nombre:''), maneuver:{type:'depart', modifier:'straight', location:[rm[0].lon, rm[0].lat]}, dRuta:0}];
  for(let j=0;j<giros.length;j++){
    const g=giros[j], sig=giros[j+1];
    const paso={instruction:gpxnTextoGiro(g.ang), ang:g.ang, maneuver:{type:'turn', modifier:gpxnModificador(g.ang), location:[g.lon, g.lat]}, dRuta:g.d};
    if(sig && sig.d-g.d<GPXN_JUNTAR_M && Math.abs(g.ang)<GPXN_VUELTA && Math.abs(sig.ang)<GPXN_VUELTA){
      paso.instruction+=' y enseguida a la '+_gpxnLado(sig.ang);
      paso.junto=sig.ang; j++;
    }
    pasos.push(paso);
  }
  const u=rm[rm.length-1];
  pasos.push({instruction:'Has llegado al final de la ruta', maneuver:{type:'arrive', modifier:'straight', location:[u.lon, u.lat]}, dRuta:total});
  _gpxnNumerar(pasos, total);
  return {
    pasos:pasos, distancia:total, duracion:total/(GPXN_VEL_KMH/3.6),
    latlngs:rm.map(function(p){ return [p.lat, p.lon]; }), cum:rm.map(function(p){ return p.d; }),
    perfil:gpxnPerfil(rm), nombre:nombre||'la ruta'
  };
}
function _gpxnNumerar(pasos, total){
  pasos.forEach(function(p, i){ p.index=i; p.geometry=null; p.distance=((i<pasos.length-1)?pasos[i+1].dRuta:total)-p.dRuta; });
}
// Dónde estás respecto de la línea. desde/hasta (metros a lo largo de la ruta) acotan la búsqueda.
function gpxnPosicionEnRuta(lat, lon, latlngs, cum, desde, hasta){
  const k=111320, c=Math.cos(lat*Math.PI/180);
  let mejor={dist:Infinity, dRuta:0, lat:lat, lon:lon};
  for(let i=0;i<latlngs.length-1;i++){
    if(desde!=null && cum[i+1]<desde) continue;
    if(hasta!=null && cum[i]>hasta) break;
    const ax=latlngs[i][1]*k*c, ay=latlngs[i][0]*k, bx=latlngs[i+1][1]*k*c, by=latlngs[i+1][0]*k, px=lon*k*c, py=lat*k;
    const dx=bx-ax, dy=by-ay, len2=dx*dx+dy*dy;
    let t=len2>0?((px-ax)*dx+(py-ay)*dy)/len2:0; t=Math.max(0, Math.min(1, t));
    const d=Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
    if(d<mejor.dist) mejor={dist:d, dRuta:cum[i]+(cum[i+1]-cum[i])*t, lat:latlngs[i][0]+(latlngs[i+1][0]-latlngs[i][0])*t, lon:latlngs[i][1]+(latlngs[i+1][1]-latlngs[i][1])*t};
  }
  return mejor;
}
// Hacia dónde queda un punto según hacia dónde vas.
function gpxnLadoRelativo(rumboMarcha, rumboAlPunto){
  const a=gpxnNorm(rumboAlPunto-rumboMarcha);
  if(Math.abs(a)<=35) return 'adelante';
  if(Math.abs(a)>=145) return 'atras';
  return a>0?'derecha':'izquierda';
}
function gpxnTextoDistancia(m){ return m>=1000 ? (Math.round(m/100)/10).toString().replace('.', ',')+' kilómetros' : (Math.round(m/10)*10)+' metros'; }
function gpxnTextoFuera(dist, lado){
  const d=gpxnTextoDistancia(dist);
  if(lado==='atras') return 'Te pasaste: la ruta quedó atrás, a '+d+'. Da la vuelta cuando puedas.';
  if(lado==='adelante') return 'Te saliste de la ruta. Está '+d+' más adelante, sigue derecho.';
  if(lado==='derecha' || lado==='izquierda') return 'Te saliste de la ruta. Está a '+d+', hacia tu '+lado+'.';
  return 'Te saliste de la ruta. Está a '+d+'.';
}
/* Junta los nombres de calles de OSRM (map matching) con los giros por forma.
   osrmPasos: [{lat, lon, type, modifier, name}] · cubierto(lat,lon): ¿OSRM alcanzó a ver ese lugar? */
function gpxnEnriquecer(ruta, osrmPasos, cubierto){
  if(!ruta || !ruta.pasos || !osrmPasos || !osrmPasos.length) return ruta;
  const usados=new Set();
  ruta.pasos.forEach(function(p){
    if(p.maneuver.type!=='turn') return;
    const loc={lat:p.maneuver.location[1], lon:p.maneuver.location[0]};
    let best=-1, bd=40;
    osrmPasos.forEach(function(o, i){ const d=gpxnDist(loc, o); if(d<bd && o.type!=='depart' && o.type!=='arrive'){ bd=d; best=i; } });
    if(best>=0){
      usados.add(best);
      if(osrmPasos[best].name && !p.junto && Math.abs(p.ang)<GPXN_VUELTA) p.instruction=gpxnTextoGiro(p.ang, osrmPasos[best].name);
    } else if(cubierto && cubierto(loc.lat, loc.lon) && !p.junto && Math.abs(p.ang)<GPXN_VUELTA){
      p.instruction=gpxnTextoGiro(p.ang, null, true); p.curva=true;
    }
  });
  // Cruces que la forma no delata (bifurcación suave): solo si quedan pegados a la línea.
  const nuevos=[];
  osrmPasos.forEach(function(o, i){
    if(usados.has(i) || !/^(turn|fork|end of road)$/.test(o.type||'') || !/left|right/.test(o.modifier||'')) return;
    const pos=gpxnPosicionEnRuta(o.lat, o.lon, ruta.latlngs, ruta.cum);
    if(pos.dist>25) return;
    if(ruta.pasos.some(function(p){ return Math.abs(p.dRuta-pos.dRuta)<GPXN_JUNTAR_M; })) return;
    const izq=/left/.test(o.modifier), s=o.name?' por '+o.name:'';
    nuevos.push({instruction:(o.type==='fork'?'En la bifurcación, mantente a la ':'Mantente a la ')+(izq?'izquierda':'derecha')+s,
      maneuver:{type:o.type==='fork'?'fork':'turn', modifier:(izq?'slight left':'slight right'), location:[pos.lon, pos.lat]}, dRuta:pos.dRuta});
  });
  if(nuevos.length){
    ruta.pasos=ruta.pasos.concat(nuevos).sort(function(a, b){ return a.dRuta-b.dRuta; });
    _gpxnNumerar(ruta.pasos, ruta.distancia);
  }
  return ruta;
}
/* Antepone el tramo hasta el inicio (pasos de OSRM ya convertidos) a la ruta GPX: una sola
   navegación. El "llegaste" del tramo se cambia por el aviso de que empieza la ruta. */
function gpxnUnir(acerc, ruta){
  const off=acerc.distancia;
  const pasosA=acerc.pasos.filter(function(p){ return p.maneuver.type!=='arrive'; });
  const pasosR=ruta.pasos.map(function(p){ return Object.assign({}, p, {dRuta:p.dRuta+off}); });
  pasosR[0].instruction='Llegaste al inicio de '+ruta.nombre+'. Desde aquí te guío por la ruta';
  const todos=pasosA.concat(pasosR);
  const out={
    pasos:todos, distancia:off+ruta.distancia, duracion:acerc.duracion+ruta.duracion,
    latlngs:acerc.latlngs.concat(ruta.latlngs), cum:acerc.cum.concat(ruta.cum.map(function(d){ return d+off; })),
    perfil:ruta.perfil.map(function(p){ return Object.assign({}, p, {d:p.d+off}); }), nombre:ruta.nombre
  };
  _gpxnNumerar(out.pasos, out.distancia);
  return out;
}

/* ---------- Red (OSRM) ---------- */

async function _gpxnMatch(ruta){
  const n=Math.min(100, ruta.latlngs.length), idx=[];
  for(let i=0;i<n;i++) idx.push(Math.round(i*(ruta.latlngs.length-1)/(n-1)));
  const coords=idx.map(function(i){ return ruta.latlngs[i][1].toFixed(5)+','+ruta.latlngs[i][0].toFixed(5); }).join(';');
  const radios=idx.map(function(){ return 25; }).join(';');
  const perfil=(typeof _osrmPerfil==='function')?_osrmPerfil():'cycling';
  const r=await _fetchT('https://router.project-osrm.org/match/v1/'+perfil+'/'+coords+'?steps=true&overview=false&gaps=ignore&tidy=true&radiuses='+radios, 12000);
  const j=await r.json();
  if(!j || j.code!=='Ok' || !j.matchings) return null;
  const pasos=[];
  j.matchings.forEach(function(m){ (m.legs||[]).forEach(function(l){ (l.steps||[]).forEach(function(s){
    const ml=s.maneuver&&s.maneuver.location; if(!ml) return;
    pasos.push({lat:ml[1], lon:ml[0], type:s.maneuver.type, modifier:s.maneuver.modifier||'', name:s.name||''});
  }); }); });
  const vistos=idx.map(function(i, k){ return {lat:ruta.latlngs[i][0], lon:ruta.latlngs[i][1], ok:!!(j.tracepoints && j.tracepoints[k])}; });
  const cubierto=function(lat, lon){
    let best=null, bd=Infinity;
    vistos.forEach(function(v){ const d=gpxnDist({lat:lat, lon:lon}, v); if(d<bd){ bd=d; best=v; } });
    return !!(best && best.ok);
  };
  return {pasos:pasos, cubierto:cubierto};
}
async function _gpxnAcercamiento(yo, ini){
  const perfil=(typeof _osrmPerfil==='function')?_osrmPerfil():'cycling';
  const r=await _fetchT('https://router.project-osrm.org/route/v1/'+perfil+'/'+yo.lon+','+yo.lat+';'+ini[1]+','+ini[0]+'?overview=full&geometries=geojson&steps=true', 12000);
  const j=await r.json();
  if(!j || j.code!=='Ok' || !j.routes || !j.routes.length) return null;
  const route=j.routes[0];
  const latlngs=route.geometry.coordinates.map(function(c){ return [c[1], c[0]]; });
  const cum=[0]; for(let i=1;i<latlngs.length;i++) cum.push(cum[i-1]+gpxnDist({lat:latlngs[i-1][0], lon:latlngs[i-1][1]}, {lat:latlngs[i][0], lon:latlngs[i][1]}));
  let acum=0;
  const pasos=route.legs[0].steps.map(function(s){
    const p={instruction:getTurnInstruction(s.maneuver.type, s.maneuver.modifier, s.name), maneuver:s.maneuver, dRuta:acum};
    acum+=s.distance; return p;
  });
  return {pasos:pasos, distancia:cum[cum.length-1], duracion:route.duration, latlngs:latlngs, cum:cum};
}

/* ---------- Navegación ---------- */

var navModoGPX=false; // var: lo leen motor-navegacion.js (verificarDesviacion, recalcularRuta) y endNavigation
let _gpxnRuta=null, _gpxnProgreso=0, _gpxnFuera=0, _gpxnAvisadoFuera=false, _gpxnUltAvisoFuera=0;

/* Punto de entrada: "Pedalearla" (rutas recomendadas) y "Navegar por voz" (tus rutas). */
async function navegarRutaGPX(points, nombre){
  const base=gpxnPasos(points, nombre);
  if(base.error){ lpAviso(base.error); return false; }
  if(typeof lpAsegurarUbicacion==='function' && !(await lpAsegurarUbicacion())) return false;
  if(typeof getCurrentLocation==='function') await getCurrentLocation();
  const yo=(typeof currentUserLocation!=='undefined')?currentUserLocation:null;
  if(!yo){ lpAviso('Necesito tu GPS para guiarte por la ruta.'); return false; }
  h('Preparo la ruta '+base.nombre+'. Un momento.', PRIO_VOZ.INFO);
  // Con señal: nombres de calles y el tramo hasta el inicio. Sin señal, sigue con lo de la forma.
  try{ const m=await _gpxnMatch(base); if(m) gpxnEnriquecer(base, m.pasos, m.cubierto); }catch(e){}
  let ruta=base;
  const ini=base.latlngs[0];
  if(gpxnDist({lat:yo.lat, lon:yo.lon}, {lat:ini[0], lon:ini[1]})>150){
    try{ const a=await _gpxnAcercamiento(yo, ini); if(a) ruta=gpxnUnir(a, base); }catch(e){}
  }
  if(typeof currentTrip!=='undefined') currentTrip=null;
  // calculateAndStartNavigation recibe la ruta lista (6º argumento): no llama a OSRM y activa el
  // modo GPX con gpxnEmpezar() DESPUÉS de cerrar una navegación anterior (que lo apagaría).
  const fin=ruta.latlngs[ruta.latlngs.length-1];
  await calculateAndStartNavigation(yo.lat, yo.lon, fin[0], fin[1], ruta.nombre, ruta);
  return true;
}
// "Navegar por voz" desde tus rutas guardadas (importadas de un GPX o grabadas por ti).
function navegarRutaLocal(id){
  const r=(typeof _rutaPorId==='function')?_rutaPorId(id):null;
  const nombre=(r && r.nombreRuta)||'tu ruta';
  if(r && r.points && r.points.length>1){ navegarRutaGPX(r.points, nombre); return; }
  if(typeof _traerPuntosRuta==='function') _traerPuntosRuta(id, function(pts, doc){ navegarRutaGPX(pts||[], (doc&&doc.nombreRuta)||nombre); });
  else lpAviso('Esa ruta no tiene puntos guardados.');
}
function gpxnEmpezar(ruta){ _gpxnRuta=ruta; _gpxnProgreso=0; _gpxnFuera=0; _gpxnAvisadoFuera=false; _gpxnUltAvisoFuera=0; navModoGPX=true; }
function gpxnTerminar(){ navModoGPX=false; _gpxnRuta=null; }

// Rumbo de marcha según tus últimas posiciones (al menos 10 m de diferencia, si no es ruido).
function _gpxnRumboMarcha(){
  if(typeof gpsPoints==='undefined' || gpsPoints.length<2) return null;
  const u=gpsPoints[gpsPoints.length-1];
  for(let i=gpsPoints.length-2;i>=0 && i>=gpsPoints.length-15;i--){
    if(gpxnDist(gpsPoints[i], u)>=10) return gpxnRumbo(gpsPoints[i], u);
  }
  return null;
}
/* Reemplaza el recálculo hacia el destino cuando se navega un GPX (lo llama verificarDesviacion). */
function gpxnVerificar(lat, lon){
  const r=_gpxnRuta; if(!r) return;
  // Mira cerca de lo ya avanzado: en una ida y vuelta, el camino de regreso no se confunde con el de ida.
  // Si cerca de lo avanzado no estás, se mira toda la ruta: puede que te hayas unido más adelante
  // (o atrás) por otro camino, o al menos sirve para decir hacia dónde queda lo más cercano.
  let pos=gpxnPosicionEnRuta(lat, lon, r.latlngs, r.cum, _gpxnProgreso-300, _gpxnProgreso+3000);
  if(pos.dist>GPXN_FUERA_M){
    const global=gpxnPosicionEnRuta(lat, lon, r.latlngs, r.cum);
    if(global.dist<pos.dist) pos=global;
    if(pos.dist<=GPXN_FUERA_M) _gpxnProgreso=pos.dRuta; // te uniste en otro punto: desde ahí
  }
  if(pos.dist<=GPXN_FUERA_M){
    _gpxnProgreso=Math.max(_gpxnProgreso, pos.dRuta);
    if(_gpxnAvisadoFuera){ _gpxnAvisadoFuera=false; h('Volviste a la ruta. Sigo guiándote.', PRIO_VOZ.NAV); }
    _gpxnFuera=0;
    // Si cortaste camino y pasaste de largo un giro, el motor no se queda esperándolo.
    let salto=false;
    while(currentStepIndex<navSteps.length-1 && navSteps[currentStepIndex].dRuta!=null && navSteps[currentStepIndex].dRuta<_gpxnProgreso-40){ currentStepIndex++; salto=true; }
    if(salto){ _navDistPrev=Infinity; if(typeof showStepInstruction==='function' && navSteps[currentStepIndex].maneuver.type!=='arrive'){ document.getElementById('navText').innerText=navSteps[currentStepIndex].instruction; } }
    return;
  }
  _gpxnFuera++;
  if(_gpxnFuera<4) return; // 4 posiciones seguidas fuera: no es un salto del GPS
  const ahora=Date.now();
  if(_gpxnAvisadoFuera && ahora-_gpxnUltAvisoFuera<GPXN_AVISO_FUERA_CADA_MS) return;
  _gpxnAvisadoFuera=true; _gpxnUltAvisoFuera=ahora;
  const rm=_gpxnRumboMarcha();
  const lado=rm==null?null:gpxnLadoRelativo(rm, gpxnRumbo({lat:lat, lon:lon}, {lat:pos.lat, lon:pos.lon}));
  try{ _pisteroMood='preocupado'; }catch(e){}
  h(gpxnTextoFuera(pos.dist, lado), PRIO_VOZ.NAV);
}
