function hg(e){ h("La señal de GPS está inestable."); }
function gd2(a,b,c,d){ const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
// Velocidad REAL por ventana (~10s): compara el centroide de la 1ª mitad de
// posiciones vs la 2ª mitad. El ruido del GPS se promedia y se cancela; solo
// queda el desplazamiento verdadero. Devuelve km/h (0 si estás quieto).
function velocidadVentana(pts){
  const now=Date.now();
  const w=pts.filter(function(p){ return now-(p.t||p.timestamp)<=15000; });
  if(w.length<4){
    // El GPS nativo en segundo plano manda fixes por DISTANCIA (cada 8m), no por tiempo:
    // andando lento (subida, ciudad) puede no juntar 4 puntos en la ventana. Con 2 alcanza.
    if(w.length>=2){
      const a=w[0], b=w[w.length-1], dt2=((b.t||b.timestamp)-(a.t||a.timestamp))/1000;
      if(dt2>=2) return (gd2(a.lat,a.lon,b.lat,b.lon)*1000/dt2)*3.6;
    }
    return 0;
  }
  const half=Math.floor(w.length/2);
  const cen=function(arr){ let la=0,lo=0,t=0; arr.forEach(function(p){ la+=p.lat; lo+=p.lon; t+=(p.t||p.timestamp); }); const n=arr.length||1; return {lat:la/n,lon:lo/n,t:t/n}; };
  const c1=cen(w.slice(0,half)), c2=cen(w.slice(half));
  const dt=(c2.t-c1.t)/1000;
  if(dt<2) return 0;
  return (gd2(c1.lat,c1.lon,c2.lat,c2.lon)*1000/dt)*3.6;
}
function pv(v){ const f=document.getElementById('pf'); if(!f) return; const _u=_ritmoUmbrales(); const c=v===0?'parado':v<_u.lento?'lento':v>=_u.normal?'rapido':'normal'; f.className='ph '+sc+(c==='lento'?' worried':c==='rapido'?' happy':''); }
function se(e){ const f=document.getElementById('pf'); if(f) f.className='ph '+sc+' '+e; }
let _ultimoSyncStats=0;
/* ===== KILÓMETROS POR MODO DE VIAJE =====
   Hasta v7.12 los kilómetros se sumaban TODOS al mismo contador (`us.di`) y el ranking
   ordenaba por ese único número, bajo el título "los cicloviajeros con más kilómetros del
   mundo". O sea que los kilómetros hechos EN AUTO competían con los pedaleados: un viaje
   de 300 km manejando le gana a casi cualquier ciclista real. Frente a la élite del
   ciclismo chileno eso destruye la credibilidad del ranking completo (ver DOCTRINA 1 en
   VISION-MAESTRA.md).
   `us.dm` guarda el desglose por disciplina. `us.di` NO se toca: es lo que se muestra en
   pantalla y lo que ya tienen guardado todos los usuarios — acá no se rompe nada de lo
   que existe, solo se agrega el detalle que faltaba. */
function _sumarKmModo(km){
  if(!(km>0)) return;
  if(!us.dm || typeof us.dm!=='object') us.dm={};
  const modo=(typeof actividadTipo!=='undefined' && actividadTipo) ? actividadTipo : 'ciclismo';
  us.dm[modo]=(us.dm[modo]||0)+km;
}
