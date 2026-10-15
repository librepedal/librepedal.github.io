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
function kmTrazado(pts){
  const v=(pts||[]).filter(function(p){ return p && isFinite(p.lat) && isFinite(p.lon); });
  if(v.length<2) return 0;
  const c=crearContadorKm(); let km=0;
  v.forEach(function(p){ km+=c.tramo({lat:p.lat, lon:p.lon, t:p.t||p.timestamp||0, acc:p.acc}, !!p.est); });
  return km+c.fin();
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
    const horas=(r.endTime&&r.startTime&&r.endTime>r.startTime)?(r.endTime-r.startTime)/3600000:null;
    const creible=horas ? (kt/horas>=3) : true;
    if(kt>kg*1.15 && kt-kg>0.3 && creible){
      r.distanciaAntes=kg; r.distance=Math.round(kt*100)/100; r.calories=Math.round(r.distance*(typeof kcalPorKm==='function'?kcalPorKm():30)); n++;
      if(r.firebaseId && typeof db!=='undefined'){ try{ db.collection('routes').doc(r.firebaseId).update({distance:r.distance, calories:r.calories}).catch(function(){}); }catch(e){} }
    }
  });
  if(tocadas){ rutasLocalesSet(arr); if(n && typeof renderRutas==='function') renderRutas(); }
  return n;
}
