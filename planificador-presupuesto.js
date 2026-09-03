async function mostrarPlanificadorPresupuesto(){
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-wallet"></i> Planificador por presupuesto';
  const c=document.getElementById('modalContent');
  c.innerHTML='<p style="font-size:0.85rem;color:#9fb3c8;margin-bottom:8px">Te ayudo a armar el viaje según lo que quieras gastar, buscando opciones reales de la comunidad cerca de tu destino.</p>'+
    '<input type="number" id="plan-presupuesto" placeholder="Presupuesto total (tu moneda, ej: 40000)" min="0">'+
    '<input type="number" id="plan-dias" placeholder="Días de viaje (ej: 3)" min="1">'+
    '<select id="plan-pref"><option value="todos">Camping o alojamiento, lo que salga</option><option value="camping">Prefiero camping</option><option value="hospedaje">Prefiero alojamiento</option></select>'+
    '<button class="ab" style="margin-top:8px" onclick="buscarPlanPresupuesto()">Buscar opciones</button>'+
    '<div id="plan-resultado" style="margin-top:10px"></div>';
  document.getElementById('userModal').classList.add('on');
}
async function buscarPlanPresupuesto(){
  const presupuesto=Math.max(0,parseFloat(document.getElementById('plan-presupuesto').value)||0);
  const dias=Math.max(1,parseInt(document.getElementById('plan-dias').value)||1);
  const pref=document.getElementById('plan-pref').value;
  const res=document.getElementById('plan-resultado');
  if(!presupuesto){ res.innerHTML='<p style="color:#888">Dime cuánto quieres gastar en total.</p>'; return; }
  res.innerHTML='<p style="color:#888">Buscando opciones cerca de tu destino...</p>';
  let lat=null, lon=null;
  if(addedDests && addedDests.length){
    const last=addedDests[addedDests.length-1];
    lat=last.lat; lon=last.lon;
    if(!lat||!lon){ try{ const g=await geocodeDestino(last.addr||last.name); if(g){ lat=g.lat; lon=g.lon; } }catch(e){} }
  }
  if((!lat||!lon) && currentUserLocation){ lat=currentUserLocation.lat; lon=currentUserLocation.lon; }
  const dNoches=Math.max(0,dias-1);
  const partAloj = pref==='camping' ? 0.15 : 0.4;
  const presupAloj=presupuesto*partAloj, presupComida=presupuesto-presupAloj;
  const porNoche=dNoches>0?Math.round(presupAloj/dNoches):0, porDiaComida=Math.round(presupComida/dias);
  let html='<div style="background:var(--gl);padding:10px;border-radius:10px;margin-bottom:10px">'+
    '<div style="font-size:0.8rem;color:#9fb3c8">Referencia con tu presupuesto:</div>'+
    '<div style="font-weight:800;color:var(--p)"><i class="fas fa-bowl-food"></i> ~'+porDiaComida.toLocaleString('es')+' /día en comida · <i class="fas fa-campground"></i> ~'+porNoche.toLocaleString('es')+' /noche en alojamiento</div></div>';
  try{
    const snap=await db.collection('hostels').limit(60).get();
    let items=[];
    snap.forEach(function(doc){ const d=doc.data(); if(/^TEST-/.test(d.name||'')) return; if(pref!=='todos' && d.tipo!==pref) return; let dist=null; if(lat&&lon&&d.lat&&d.lon) dist=calculateDistance(lat,lon,d.lat,d.lon)/1000; items.push({data:d,dist:dist}); });
    items.sort(function(a,b){ if(a.dist==null) return 1; if(b.dist==null) return -1; return a.dist-b.dist; });
    items=items.slice(0,5);
    html+='<h4 style="color:var(--p);font-size:0.85rem;margin:10px 0 6px"><i class="fas fa-campground"></i> Opciones de alojamiento cerca (de la comunidad)</h4>';
    html += items.length ? items.map(function(it){ const d=it.data; return '<div style="background:var(--gl);padding:8px;border-radius:8px;margin-bottom:6px"><strong style="font-size:0.85rem">'+escapeHTML(d.name)+'</strong><span style="color:#8aa;font-size:0.7rem"> · '+escapeHTML(d.tipo||'')+'</span>'+(it.dist!=null?' <span style="color:var(--p);font-size:0.7rem">'+it.dist.toFixed(1)+' km</span>':'')+'<div style="font-size:0.75rem;color:#9fb3c8">'+escapeHTML(d.location||'')+'</div></div>'; }).join('') : '<p style="color:#888;font-size:0.8rem">Aún no hay opciones cargadas por la comunidad en esa zona. ¡Sé el primero en aportar en CicloGuía!</p>';
  }catch(e){ html+='<p style="color:#888;font-size:0.8rem">No pude cargar alojamientos ahora.</p>'; }
  try{
    const snap=await db.collection('recommendations').orderBy('likes','desc').limit(30).get();
    let items=[];
    snap.forEach(function(doc){ const d=doc.data(); if(/^TEST-/.test(d.title||'')) return; let dist=null; if(lat&&lon&&d.lat&&d.lon) dist=calculateDistance(lat,lon,d.lat,d.lon)/1000; items.push({data:d,dist:dist}); });
    items=items.filter(function(it){ return it.dist==null || it.dist<80; });
    items.sort(function(a,b){ if(a.dist==null) return 1; if(b.dist==null) return -1; return a.dist-b.dist; });
    items=items.slice(0,5);
    html+='<h4 style="color:var(--p);font-size:0.85rem;margin:10px 0 6px"><i class="fas fa-camera"></i> Panoramas y actividades cerca</h4>';
    html += items.length ? items.map(function(it){ const d=it.data; return '<div style="background:var(--gl);padding:8px;border-radius:8px;margin-bottom:6px"><strong style="font-size:0.85rem">'+escapeHTML(d.title)+'</strong>'+(it.dist!=null?' <span style="color:var(--p);font-size:0.7rem">'+it.dist.toFixed(1)+' km</span>':'')+'<div style="font-size:0.75rem;color:#9fb3c8">'+escapeHTML(d.desc||'')+'</div></div>'; }).join('') : '<p style="color:#888;font-size:0.8rem">Aún no hay recomendaciones cargadas en esa zona. ¡Comparte una desde Comparte un Punto de Interés en tu Bitácora!</p>';
  }catch(e){ html+='<p style="color:#888;font-size:0.8rem">No pude cargar recomendaciones ahora.</p>'; }
  res.innerHTML=html;
  h('Listo, armé un plan de referencia con tu presupuesto y opciones reales de la comunidad cerca de tu destino.');
}
