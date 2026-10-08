/* ===== SOBREVUELO 3D: la línea pegada al camino — guardada en el teléfono y pedida al worker (separado de sobrevuelo-3d.js, 2026-10-08) =====
   Sin estado del vuelo: solo localStorage, fetch y la distancia hav (se recibe de sobrevuelo-3d.js con SB3Pegada.usar(hav)). */
(function(){
var hav=null;
// línea pegada al camino guardada en el teléfono: llave PROPIA (no dentro de las rutas, para no comerles espacio y que
// guardar una ruta nueva nunca falle por esto), 1 punto cada 25 m, máx. 10 rutas.
var SB3_PEGADAS='lp_sbv3_pegadas';
function sb3LeerPegada(id){ if(!id) return null; try{ var t=JSON.parse(localStorage.getItem(SB3_PEGADAS)||'{}'); return t[id]||null; }catch(e){ return null; } }
function sb3GuardarPegada(id,coords,metodo){ if(!id||!coords||coords.length<2) return; try{
  var t=JSON.parse(localStorage.getItem(SB3_PEGADAS)||'{}'), out=[coords[0]];
  for(var i=1;i<coords.length;i++){ if(hav(out[out.length-1],coords[i])>=25||i===coords.length-1) out.push(coords[i]); }
  t[id]={c:out.map(function(c){ return [+c[0].toFixed(5),+c[1].toFixed(5)]; }),m:metodo,f:Date.now()};
  var ids=Object.keys(t).sort(function(a,b){ return (t[a].f||0)-(t[b].f||0); }); while(ids.length>10){ delete t[ids.shift()]; }
  localStorage.setItem(SB3_PEGADAS,JSON.stringify(t)); }catch(e){ /* sin espacio: se vuelve a pegar la próxima vez, nada más */ } }

// worker que pega cada ruta al camino UNA vez y la guarda (worker-sobrevuelo/): así no se le pide a Valhalla desde cada
// teléfono. Si no responde (sin publicar, sin red, límite), pegarAlCamino sigue directo como antes.
var SB3_WORKER='https://librepedal-sobrevuelo.librepedal.workers.dev';
var SB3_METODOS={valhalla:1,parcial:1,gps:1};
function sb3PorWorker(muestra){
  if(!SB3_WORKER || typeof fetch!=='function') return Promise.reject(new Error('sin worker'));
  var ctl=(typeof AbortController==='function')?new AbortController():null;
  var to=setTimeout(function(){ if(ctl) ctl.abort(); },45000); /* una ruta larga y nueva tarda: de a 2 tramos en Valhalla */
  return fetch(SB3_WORKER,{method:'POST',headers:{'content-type':'application/json'},signal:ctl?ctl.signal:undefined,
      body:JSON.stringify({puntos:muestra.map(function(p){ return [+p.lat.toFixed(5),+p.lon.toFixed(5)]; })})})
  .then(function(r){ if(!r.ok) throw new Error('worker '+r.status); return r.json(); })
  .then(function(j){ clearTimeout(to);
    var c=j&&j.c, ok=Array.isArray(c)&&c.length>=2&&c.every(function(p){ return p&&typeof p[0]==='number'&&typeof p[1]==='number'&&isFinite(p[0])&&isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90; });
    if(!ok||!SB3_METODOS[j.m]) throw new Error('respuesta inválida');
    return {coords:c,metodo:j.m,motivo:(j.cache?'guardada ':'')+(j.t||'')}; },
    function(e){ clearTimeout(to); throw e; });
}
window.SB3Pegada={usar:function(h){ hav=h; }, leer:sb3LeerPegada, guardar:sb3GuardarPegada, porWorker:sb3PorWorker};
})();
