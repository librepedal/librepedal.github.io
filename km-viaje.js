/* ===== KM HONESTOS (Inty 2026-10-15) =====
   "Estábamos en el camping Los Castaños y fuimos hasta el Parque Inglés. En la aplicación marca
   5 kilómetros y eran muchos más. No podemos estar entregando datos falsos."
   Datos reales de su cuenta (rutas del 8 al 11 de octubre): "Río Claro → Parque Inglés" quedó con
   0,27 km en 136 minutos; "San Clemente → Camping Los Castaños", 4,26 km en 7 horas.

   Causa: el contador solo sumaba un tramo si la "ventana de velocidad" (los últimos 12-15 s de
   posiciones) confirmaba movimiento, y la ponía en 0 bajo 6 km/h. Con la pantalla apagada, en el
   bolsillo o con mala señal en la cordillera, el GPS entrega una posición cada 15-30 s: la ventana
   queda con un solo punto, la velocidad da 0 y el tramo NO se suma. Lo mismo en una subida lenta
   o caminando. El trazado sí guardaba esas posiciones: lo que fallaba era el contador.

   Cómo se cuenta ahora (mismo método en vivo y sobre un trazado guardado):
   1. Cada posición se promedia con las de los últimos 15 s: el temblor del GPS se cancela.
   2. Se avanza desde un punto ancla: una posición a ≥30 m (y a ≥2 veces la precisión que dice el
      GPS) queda como candidata; se confirma si la siguiente sigue alejándose del ancla. El temblor
      salta para cualquier lado; el que viaja se aleja.
   3. Bajo 2 km/h desde el ancla es deriva, no viaje.
   Medido con recorridos simulados (tests/km-viaje.test.mjs): 99-100 % del recorrido con posiciones
   cada 25 s, a 4-5 km/h y con ruido de ±15 m; 0 km en 7 horas quieto con temblor de ±25-40 m. */

const KMV_MIN_M=30;          // avance mínimo desde el ancla…
const KMV_FACTOR_PREC=2;     // …y al menos 2 veces la precisión del GPS (si se conoce)
const KMV_MIN_KMH=2;         // más lento que esto desde el ancla es deriva, no viaje
const KMV_SUAVE_MS=15000;    // ventana de promedio

function _kmvHav(a, b){
  const R=6371, r=Math.PI/180, dLa=(b.lat-a.lat)*r, dLo=(b.lon-a.lon)*r;
  const s=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLo/2)*Math.sin(dLo/2);
  return 2*R*Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}
/* Contador (en vivo: uno para grabar, otro para navegar). tramo(p, forzar) recibe {lat, lon, t, acc}
   y devuelve los km confirmados con esa posición. forzar=true: hueco de pantalla apagada
   (gps-hueco.js), se suma la recta de una vez. fin() devuelve lo que quedaba por confirmar. */
function crearContadorKm(){
  let ancla=null, cand=null, ventana=[];
  function suave(p){
    ventana.push(p);
    while(ventana.length && p.t-ventana[0].t>KMV_SUAVE_MS) ventana.shift();
    let la=0, lo=0, acc=0, nAcc=0;
    ventana.forEach(function(q){ la+=q.lat; lo+=q.lon; if(q.acc>0){ acc+=q.acc; nAcc++; } });
    const n=ventana.length;
    return {lat:la/n, lon:lo/n, t:p.t, acc:nAcc?acc/nAcc:0};
  }
  return {
    reiniciar:function(){ ancla=null; cand=null; ventana=[]; },
    tramo:function(p, forzar){
      if(!p || !isFinite(p.lat) || !isFinite(p.lon)) return 0;
      p={lat:p.lat, lon:p.lon, t:p.t||0, acc:p.acc||0};
      if(!ancla){ ancla=p; ventana=[p]; return 0; }
      if(forzar){ const d=_kmvHav(ancla, p); ancla=p; cand=null; ventana=[p]; return d; }
      const s=suave(p), min=Math.max(KMV_MIN_M, KMV_FACTOR_PREC*(s.acc||0))/1000;
      let km=0;
      const dAS=_kmvHav(ancla, s);
      if(cand){
        if(dAS>=min && dAS>=_kmvHav(ancla, cand)){ km=_kmvHav(ancla, cand); ancla=cand; }
        cand=null;
      }
      const d=_kmvHav(ancla, s);
      if(d>=min){
        const dtH=(s.t-ancla.t)/3600000;
        if(dtH>0 && d/dtH<KMV_MIN_KMH) ancla=s; else cand=s;
      }
      return km;
    },
    fin:function(){ const k=cand?_kmvHav(ancla, cand):0; if(cand){ ancla=cand; cand=null; } return k; }
  };
}
var kmvContadorLibre=crearContadorKm(), kmvContadorNav=crearContadorKm(); // var: los usan motor-gps.js y funciones-mapa-viajes.js
// Largo de un trazado guardado, con el mismo método que el contador en vivo.
function _kmTrazadoSimple(v){
  if(v.length<2) return 0;
  const c=crearContadorKm(); let km=0;
  v.forEach(function(p){ km+=c.tramo({lat:p.lat, lon:p.lon, t:p.t||p.timestamp||0, acc:p.acc}, !!p.est); });
  return km+c.fin();
}
/* Trazados SIN la precisión del GPS (rutas guardadas: sus puntos no traen acc): el umbral del contador
   queda en 30 m y el temblor de una noche quieto con mala señal (±40-60 m) se cuela como avance.
   Medido 2026-10-16: 12 h quieto con ±40 m sumaba 15,5 km; un viaje de 3 días con 2 noches grabando,
   246 km en vez de 195. Por eso, si la mayoría de los puntos no trae acc, se sacan los puntos "quietos"
   (a menos de 200 m de donde estabas 5 minutos antes Y de donde estás 5 minutos después: a 3 km/h ya
   avanzas 250 m en 5 min) y se cuenta cada tramo en movimiento por separado. Con acc, igual que antes. */
const KMV_QUIETO_MS=300000, KMV_QUIETO_M=200;
function _kmvEnMovimiento(v){
  const tt=function(p){ return p.t||p.timestamp||0; };
  if(!v.every(function(p){ return tt(p)>0; })) return [v];
  const quieto=v.map(function(){ return false; });
  let a=0, b=0;
  for(let i=0;i<v.length;i++){
    const ti=tt(v[i]);
    while(a<i && tt(v[a+1])<=ti-KMV_QUIETO_MS) a++;
    if(b<i) b=i;
    while(b<v.length-1 && tt(v[b])<ti+KMV_QUIETO_MS) b++;
    const antes=(ti-tt(v[a])>=KMV_QUIETO_MS*0.8), despues=(tt(v[b])-ti>=KMV_QUIETO_MS*0.8);
    if(antes && despues && _kmvHav(v[a], v[i])*1000<KMV_QUIETO_M && _kmvHav(v[i], v[b])*1000<KMV_QUIETO_M) quieto[i]=true;
  }
  const tramos=[]; let cur=[];
  v.forEach(function(p, i){ if(quieto[i]){ if(cur.length) tramos.push(cur); cur=[]; } else cur.push(p); });
  if(cur.length) tramos.push(cur);
  return tramos;
}
function kmTrazado(pts){
  const v=(pts||[]).filter(function(p){ return p && isFinite(p.lat) && isFinite(p.lon); });
  if(v.length<2) return 0;
  const conAcc=v.filter(function(p){ return p.acc>0; }).length;
  if(conAcc>=v.length/2) return _kmTrazadoSimple(v);
  return _kmvEnMovimiento(v).reduce(function(s, tr){ return s+_kmTrazadoSimple(tr); }, 0);
}
/* ¿Cuántos km sumar por un tramo suelto? (respaldo simple, mismo criterio de umbrales)
   o: {km, dtMs, sp (velocidad de la ventana, 0 si no confirmó), precision (m), maxKmh} */
function kmASumar(o){
  const km=o.km||0, m=km*1000;
  if(!(m>=12)) return 0;
  const dtH=(o.dtMs||0)/3600000, vImpl=dtH>0?km/dtH:Infinity;
  if(o.maxKmh && vImpl>o.maxKmh) return 0;
  if(o.sp>0) return km;
  return (m>=Math.max(KMV_MIN_M, KMV_FACTOR_PREC*(o.precision||0)) && vImpl>=KMV_MIN_KMH) ? km : 0;
}
/* Rutas del teléfono guardadas con menos km que su propio trazado (el bug de arriba): se corrigen
   una vez, y su copia en la nube. Prudente con las rutas viejas (sus puntos no traen la precisión
   del GPS): solo sube, nunca baja, y solo si el resultado es de alguien que viajó — promedio de
   al menos 3 km/h en toda la duración. Si el teléfono pasó horas quieto con mala señal, no se
   "corrige" con temblor. Devuelve cuántas corrigió. */
function corregirKmRutasLocales(){
  if(typeof rutasLocales!=='function') return 0;
  const arr=rutasLocales(); let n=0, tocadas=0;
  arr.forEach(function(r){
    if(!r || r.kmCorregidos || !r.points || r.points.length<2 || r.importada) return;
    r.kmCorregidos=true; tocadas++;
    const kt=kmTrazado(r.points), kg=r.distance||0;
    // horas EN MOVIMIENTO (sin las noches ni las paradas largas, ver _kmvEnMovimiento): con la duración
    // total, un viaje de varios días con noches de camping quedaba bajo 3 km/h y no se corregía nunca.
    let horas=(r.endTime&&r.startTime&&r.endTime>r.startTime)?(r.endTime-r.startTime)/3600000:null;
    try{
      const v=r.points.filter(function(p){ return p && isFinite(p.lat) && isFinite(p.lon); });
      const hm=_kmvEnMovimiento(v).reduce(function(s, tr){ const a=tr[0].t||tr[0].timestamp||0, b=tr[tr.length-1].t||tr[tr.length-1].timestamp||0; return s+(b>a?(b-a)/3600000:0); }, 0);
      if(hm>0 && (horas==null || hm<horas)) horas=hm;
    }catch(e){}
    const creible=horas ? (kt/horas>=3) : true;
    if(kt>kg*1.15 && kt-kg>0.3 && creible){
      r.distanciaAntes=kg; r.distance=Math.round(kt*100)/100; r.calories=Math.round(r.distance*(typeof kcalPorKm==='function'?kcalPorKm():30)); n++;
      if(r.firebaseId && typeof db!=='undefined'){ try{ db.collection('routes').doc(r.firebaseId).update({distance:r.distance, calories:r.calories}).catch(function(){}); }catch(e){} }
    }
  });
  if(tocadas){ rutasLocalesSet(arr); if(n && typeof renderRutas==='function') renderRutas(); }
  return n;
}
/* Los km que corregirKmRutasLocales() le devolvió a cada ruta NO llegaban al total de la cuenta
   (us.di), ni al desglose por disciplina, ni al odómetro de la mantención. Inty, 2026-10-16:
   "anduve del 9 al 12 como 200 kilómetros y no se ven reflejados en los kilómetros totales".
   Esto suma UNA vez por ruta la diferencia (distance - distanciaAntes) y la marca. Solo corre
   después de leer la nube (_mantListoParaSubir): sumar antes y que después la nube "gane" con un
   número más alto haría perder lo sumado. Devuelve los km sumados. */
function sumarKmRecuperados(){
  if(typeof rutasLocales!=='function' || typeof us==='undefined' || !us) return 0;
  if(typeof _mantListoParaSubir!=='undefined' && !_mantListoParaSubir) return 0;
  const arr=rutasLocales(); let total=0, tocadas=0;
  arr.forEach(function(r){
    if(!r || r.kmSumadosAlTotal || !(r.distanciaAntes>=0) || r.importada) return;
    // La 8.824 corrigió con el cálculo de antes del filtro de puntos quietos: si el trazado hoy da
    // menos, se vuelve al valor honesto (nunca por debajo de lo que tenía antes de corregirse).
    if(r.points && r.points.length>1){
      const kt=Math.round(kmTrazado(r.points)*100)/100;
      if(r.distance>kt*1.05+0.1){ r.distance=Math.max(kt, Number(r.distanciaAntes)||0); r.calories=Math.round(r.distance*(typeof kcalPorKm==='function'?kcalPorKm():30));
        if(r.firebaseId && typeof db!=='undefined'){ try{ db.collection('routes').doc(r.firebaseId).update({distance:r.distance, calories:r.calories}).catch(function(){}); }catch(e){} } }
    }
    const delta=(Number(r.distance)||0)-(Number(r.distanciaAntes)||0);
    r.kmSumadosAlTotal=true; tocadas++;
    if(!(delta>0) || delta>1500) return; // más de 1.500 km en un viaje no es una corrección creíble
    const modo=r.modo||'ciclismo';
    us.di=(Number(us.di)||0)+delta;
    if(!us.dm || typeof us.dm!=='object') us.dm={};
    us.dm[modo]=(Number(us.dm[modo])||0)+delta;
    if(modo==='moto'){ if(typeof _sumarKmVehiculo==='function') _sumarKmVehiculo(delta); }
    else if(typeof _sumarKmMantencion==='function') _sumarKmMantencion(delta);
    us.c=(Number(us.c)||0)+delta*(typeof kcalPorKm==='function'?kcalPorKm():30);
    total+=delta;
  });
  if(tocadas) rutasLocalesSet(arr);
  if(total>0){
    try{ if(typeof cu!=='undefined' && cu) localStorage.setItem('lp_u_'+cu, JSON.stringify(us)); }catch(e){}
    try{ if(typeof au==='function') au(); }catch(e){}
    try{ if(typeof sincronizarStats==='function') sincronizarStats(); }catch(e){}
  }
  return total;
}
// Corrige las rutas y suma lo recuperado al total, con aviso. Se llama al terminar de leer la nube y al abrir Mis rutas.
function recuperarKmCortos(){
  let n=0, km=0;
  try{ n=corregirKmRutasLocales(); }catch(e){}
  try{ km=sumarKmRecuperados(); }catch(e){}
  if(km>=0.5){
    const txt='Recuperé '+(km>=10?Math.round(km):km.toFixed(1)).toString().replace('.',',')+' kilómetros de viajes que habían quedado cortos. Ya están en tu total.';
    try{ if(typeof lpAviso==='function') lpAviso(txt); }catch(e){}
    try{ if(typeof h==='function') h(txt); }catch(e){}
  }
  return {rutas:n, km:km};
}
