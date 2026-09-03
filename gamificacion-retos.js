/* ===== RETOS Y TEMPORADAS =====
   Desafíos con fecha límite sobre el Darma que ya existe (ej: "500km en julio").
   El progreso se calcula sumando las rutas guardadas del celular (rutasLocales, la
   fuente de verdad de siempre) que caen dentro de las fechas del reto — no hace
   falta llevar un contador aparte. Cubre las rutas del "viaje rápido"/GPS libre,
   que es el flujo principal de la app; los viajes multi-destino no suman acá. */
function calcularProgresoReto(reto){
  const ini=reto.fechaInicio, fin=reto.fechaFin;
  return rutasLocales().filter(function(r){ return r.startTime>=ini && r.startTime<=fin; }).reduce(function(s,r){ return s+(r.distance||0); },0);
}
// Antes de esto, "cumplir" un reto solo se notaba si entrabas a mirar la pantalla de
// Retos por curiosidad — nadie te avisaba justo cuando de verdad lo lograbas pedaleando.
// Se revisa al terminar cada viaje (cuando recién se guardó el km que pudo completarlo).
function _retosCumplidosLS(){ try{ return JSON.parse(localStorage.getItem('lp_retos_cumplidos_'+cu))||[]; }catch(e){ return []; } }
async function revisarRetosCumplidos(){
  if(!cu) return;
  try{
    const ahora=Date.now();
    const snap=await db.collection('retos').where('fechaFin','>=',ahora).limit(30).get();
    const yaAvisados=_retosCumplidosLS();
    for(const doc of snap.docs){
      const r=doc.data();
      if(yaAvisados.indexOf(doc.id)!==-1) continue;
      const km=calcularProgresoReto(r);
      if(km>=(r.metaKm||Infinity)){
        yaAvisados.push(doc.id);
        h('¡Cumpliste el reto "'+r.titulo+'"! Sumaste '+km.toFixed(0)+' de '+r.metaKm+' km. +30 Darma extra por lograrlo.');
        _ganarDarma(30); au(); sincronizarStats();
      }
    }
    try{ localStorage.setItem('lp_retos_cumplidos_'+cu, JSON.stringify(yaAvisados)); }catch(e){}
  }catch(e){}
}
async function verRetos(){
  _modalVolverA=null;
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-bullseye"></i> Retos y temporadas';
  const c=document.getElementById('modalContent');
  c.innerHTML=_btnVolverModal()+'<p style="color:#888">Cargando retos...</p>';
  document.getElementById('userModal').classList.add('on');
  try{
    const ahora=Date.now();
    const snap=await db.collection('retos').orderBy('fechaFin','desc').limit(30).get();
    const activos=[], pasados=[];
    snap.forEach(function(d){ const r=Object.assign({id:d.id},d.data()); (r.fechaFin>=ahora?activos:pasados).push(r); });
    if(!activos.length && !pasados.length){ c.innerHTML=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.85rem">Todavía no hay retos activos.</p>'; return; }
    function tarjeta(r){
      const km=calcularProgresoReto(r);
      const pct=Math.min(100, Math.round((km/r.metaKm)*100));
      const diasRestantes=Math.max(0, Math.ceil((r.fechaFin-ahora)/86400000));
      return '<div class="novedad-card"><h4>'+escapeHTML(r.titulo||'')+'</h4>'+(r.desc?'<p>'+escapeHTML(r.desc)+'</p>':'')
        +'<div style="height:8px;background:#222b3d;border-radius:4px;overflow:hidden;margin:8px 0"><div style="height:100%;width:'+pct+'%;background:var(--p)"></div></div>'
        +'<p style="font-size:0.75rem;color:#9fb3c8;margin:0">'+km.toFixed(1)+' / '+(r.metaKm||0)+' km · '+(r.fechaFin>=ahora?(diasRestantes+' días restantes'):'Terminado')+(pct>=100?' · ✅ ¡Cumplido!':'')+'</p></div>';
    }
    c.innerHTML=_btnVolverModal()+(activos.length?'<h4 style="color:var(--p);margin:0 0 8px">Activos</h4>'+activos.map(tarjeta).join(''):'')
      +(pasados.length?'<h4 style="color:#7d8ba0;margin:14px 0 8px">Terminados</h4>'+pasados.slice(0,5).map(tarjeta).join(''):'');
  }catch(e){ c.innerHTML=_btnVolverModal()+'<p style="color:#888">No se pudieron cargar los retos.</p>'; }
}
let _creandoReto=false;
async function crearReto(){
  if(cu!==ADMIN_ID) return; // el botón solo se muestra al admin, pero la función se re-verifica igual
  const titulo=(document.getElementById('retoTitulo').value||'').trim();
  const desc=(document.getElementById('retoDesc').value||'').trim();
  const metaKm=parseFloat(document.getElementById('retoMeta').value);
  const dias=parseInt(document.getElementById('retoDias').value,10);
  // Números negativos son "truthy" en JS (!(-5) es false): el chequeo anterior los dejaba pasar.
  if(!titulo || !(metaKm>0) || !(dias>0)){ lpAviso('Completa título, meta en km y duración en días (ambos mayores a cero)'); return; }
  if(_creandoReto) return; // evita duplicar el reto con doble-tap
  _creandoReto=true;
  try{
    await db.collection('retos').add({titulo:titulo, desc:desc, metaKm:metaKm, fechaInicio:Date.now(), fechaFin:Date.now()+dias*86400000, ts:firebase.firestore.FieldValue.serverTimestamp()});
    document.getElementById('retoTitulo').value=''; document.getElementById('retoDesc').value=''; document.getElementById('retoMeta').value=''; document.getElementById('retoDias').value='';
    h('Reto publicado.');
  }catch(e){ lpAviso('No se pudo crear el reto.'); }
  finally{ _creandoReto=false; }
}
/* ===== RECAPITULACIÓN ANUAL (estilo "Wrapped") =====
   Resumen visual y compartible del año, armado como imagen con Canvas 2D — nada de
   servicios externos, se calcula con las rutas que ya están guardadas en el celular. */
function calcularResumenAnual(anio){
  const ini=new Date(anio,0,1).getTime(), fin=new Date(anio+1,0,1).getTime();
  const rutas=rutasLocales().filter(function(r){ return r.startTime>=ini && r.startTime<fin; });
  const totalKm=rutas.reduce(function(s,r){return s+(r.distance||0);},0);
  const totalCal=rutas.reduce(function(s,r){return s+(r.calories||0);},0);
  const viajeMax=rutas.reduce(function(m,r){return (r.distance||0)>m?(r.distance||0):m;},0);
  const porMes={};
  rutas.forEach(function(r){ const m=new Date(r.startTime).getMonth(); porMes[m]=(porMes[m]||0)+(r.distance||0); });
  let mesTop=-1, mesTopKm=0;
  Object.keys(porMes).forEach(function(m){ if(porMes[m]>mesTopKm){ mesTopKm=porMes[m]; mesTop=parseInt(m,10); } });
  const nombresMes=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return { anio:anio, viajes:rutas.length, totalKm:totalKm, totalCal:totalCal, viajeMax:viajeMax, mesTop: mesTop>=0?nombresMes[mesTop]:null, mesTopKm:mesTopKm };
}
function _dibujarTarjetaAnual(ctx, W, H, r){
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#151b2e'); grad.addColorStop(1,'#0a0f1d');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle='#fc4c02'; ctx.font='bold 42px sans-serif';
  ctx.fillText('🚲 Libre Pedal', W/2, 90);
  ctx.fillStyle='#ffd700'; ctx.font='bold 28px sans-serif';
  ctx.fillText('Mi año '+r.anio, W/2, 140);
  ctx.fillStyle='#fff'; ctx.font='bold 88px sans-serif';
  ctx.fillText(r.totalKm.toFixed(0), W/2, 280);
  ctx.fillStyle='#9fb3c8'; ctx.font='28px sans-serif';
  ctx.fillText('kilómetros recorridos', W/2, 320);
  const stats=[
    ['🚴 Viajes', r.viajes],
    ['🔥 Calorías', Math.round(r.totalCal).toLocaleString('es-CL')],
    ['🏆 Viaje más largo', r.viajeMax.toFixed(1)+' km'],
    ['📅 Mes más activo', r.mesTop?(r.mesTop+' ('+r.mesTopKm.toFixed(0)+' km)'):'--']
  ];
  let y=400;
  stats.forEach(function(s){
    ctx.fillStyle='#7d8ba0'; ctx.font='22px sans-serif'; ctx.fillText(s[0], W/2, y);
    ctx.fillStyle='#ffd700'; ctx.font='bold 30px sans-serif'; ctx.fillText(String(s[1]), W/2, y+38);
    y+=100;
  });
  // Comparación relatable (referencia chilena conocida) — el número pelado de km no
  // dice mucho de un vistazo; compararlo con una ruta famosa sí, y hace la tarjeta
  // más compartible (que es todo el punto de un "wrapped").
  if(r.totalKm>=10){
    const veces=r.totalKm/120;
    ctx.fillStyle='#fc4c02'; ctx.font='italic 22px sans-serif';
    ctx.fillText('🗺️ Como pedalear Santiago–Valparaíso '+(veces<1?veces.toFixed(1):Math.round(veces))+' '+(veces<2?'vez':'veces'), W/2, y+10);
  }
  ctx.fillStyle='#3a4a5a'; ctx.font='18px sans-serif';
  ctx.fillText('librepedal.pages.dev', W/2, H-40);
}
function mostrarResumenAnual(){
  const anio=new Date().getFullYear();
  const r=calcularResumenAnual(anio);
  if(r.viajes===0){
    _modalVolverA=null;
    document.getElementById('modalTitle').innerHTML='<i class="fas fa-chart-simple"></i> Mi año en Libre Pedal';
    document.getElementById('modalContent').innerHTML=_btnVolverModal()+'<p style="color:#9fb3c8;text-align:center;padding:20px 0">Todavía no tienes viajes registrados este '+anio+'. ¡Sal a pedalear y vuelve más adelante!</p>';
    document.getElementById('userModal').classList.add('on');
    return;
  }
  const overlay=document.createElement('div');
  overlay.id='wrappedOverlay';
  overlay.style.cssText='position:fixed;inset:0;background:#000;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px';
  const canvas=document.createElement('canvas');
  canvas.width=800; canvas.height=1000;
  canvas.style.cssText='max-width:100%;max-height:75vh;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.6)';
  const ctx=canvas.getContext('2d');
  _dibujarTarjetaAnual(ctx, canvas.width, canvas.height, r);
  overlay.appendChild(canvas);
  const botones=document.createElement('div');
  botones.style.cssText='display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;justify-content:center';
  botones.innerHTML='<button id="wrappedDescargar" class="ab" style="width:auto;padding:12px 20px"><i class="fas fa-download"></i> Descargar</button>'+(navigator.share?'<button id="wrappedCompartir" class="ab sec" style="width:auto;padding:12px 20px"><i class="fas fa-share-from-square"></i> Compartir</button>':'')+'<button id="wrappedCerrar" class="ab sec" style="width:auto;padding:12px 20px;background:none;border:1px solid #555"><i class="fas fa-xmark"></i> Cerrar</button>';
  overlay.appendChild(botones);
  document.body.appendChild(overlay);
  document.getElementById('wrappedCerrar').onclick=function(){ overlay.remove(); };
  document.getElementById('wrappedDescargar').onclick=function(){
    canvas.toBlob(function(blob){
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='libre-pedal-'+anio+'.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); },4000);
    });
  };
  if(navigator.share){
    document.getElementById('wrappedCompartir').onclick=function(){
      canvas.toBlob(function(blob){
        const file=new File([blob], 'libre-pedal-'+anio+'.png', {type:'image/png'});
        if(navigator.canShare && navigator.canShare({files:[file]})){ navigator.share({files:[file], title:'Mi año en Libre Pedal', text:'Mi resumen '+anio+' pedaleando 🚴'}).catch(function(){}); }
        else { navigator.share({title:'Mi año en Libre Pedal', text:'Recorrí '+r.totalKm.toFixed(0)+' km en '+anio+' con Libre Pedal 🚴'}).catch(function(){}); }
      });
    };
  }
}
