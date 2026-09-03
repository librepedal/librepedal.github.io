/* ===== PUNTOS DE INTERÉS (POI) desde Ciclo Bitácora: buscar un lugar, marcarlo
   en el mapa comunitario y ganar Darma. Reusa REPORTE_CATS + la colección reportes. */
let poiCatSel=null;
function renderPoiCats(){ const c=document.getElementById('poi-cats'); if(!c) return; c.innerHTML=Object.keys(REPORTE_CATS).map(function(k){ const x=REPORTE_CATS[k]; const sel=poiCatSel===k; return '<div onclick="seleccionarPoiCat(\''+k+'\')" style="border:2px solid '+(sel?x.c:'#2a3147')+';background:'+(sel?'rgba(255,255,255,0.05)':'transparent')+';border-radius:10px;padding:8px;cursor:pointer;text-align:center"><div style="font-size:1.35rem;line-height:1.1">'+_repIco(x)+'</div><div style="font-size:0.72rem;font-weight:800;color:'+x.c+'">'+x.l+'</div></div>'; }).join(''); }
function seleccionarPoiCat(k){ poiCatSel=k; renderPoiCats(); }
// Mini-mapa para marcar el punto a mano: la búsqueda por texto (Nominatim) no
// encuentra lugares sin nombre oficial (un aguada, una entrada de camino sin
// dirección) — acá tocas el mapa directo y usamos esas coordenadas, sin buscar nada.
let poiMapaManual=null, poiManualCoords=null, poiManualMarker=null;
function togglePoiMapaManual(){
  const cont=document.getElementById('poi-mapa-manual'), btn=document.getElementById('btnPoiMapaManual');
  const abrir=cont.style.display==='none';
  cont.style.display=abrir?'block':'none';
  btn.innerText=abrir?'✖️ Cerrar mapa':'📍 No lo encuentra: márcalo directo en el mapa';
  if(!abrir) return;
  if(!poiMapaManual){
    const yo=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
    poiMapaManual=new maplibregl.Map({container:'poi-mapa-manual-inner', style:LP_ESTILO_CALLES, center:yo?[yo.lon,yo.lat]:[-70.65,-33.45], zoom:yo?14:5});
    poiMapaManual.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    poiMapaManual.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true,showAccuracyCircle:true}),'top-right');
    poiMapaManual.on('click', function(e){
      poiManualCoords={lat:e.lngLat.lat, lon:e.lngLat.lng};
      if(poiManualMarker) poiManualMarker.remove();
      poiManualMarker=new maplibregl.Marker({color:'#fc4c02'}).setLngLat(e.lngLat).addTo(poiMapaManual);
      document.getElementById('poiMapaManualEstado').innerText='📍 Punto marcado — listo para compartir.';
    });
  }
  setTimeout(function(){ poiMapaManual.resize(); },250);
}
// Elegir un destino de navegación tocando el mapa (como "seleccionar en el mapa" de
// Google Maps): para puntos que no aparecen en ninguna búsqueda porque no están
// mapeados como lugar (una toma de agua escondida, una picada sin nombre, etc.).
// No hace falta snapping propio: OSRM ya rutea por el camino real más cercano al
// punto elegido, así que el usuario llega hasta donde el mapa tenga camino, y el
// resto (si el punto está fuera de cualquier camino mapeado) lo hace por su cuenta.
let puntoMapaViaje=null, puntoViajeCoords=null, puntoViajeMarker=null;
function togglePuntoMapaViaje(){
  const cont=document.getElementById('punto-mapa-viaje');
  const abrir=cont.style.display==='none';
  cont.style.display=abrir?'block':'none';
  if(!abrir) return;
  if(!puntoMapaViaje){
    const yo=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
    puntoMapaViaje=new maplibregl.Map({container:'punto-mapa-viaje-inner', style:LP_ESTILO_CALLES, center:yo?[yo.lon,yo.lat]:[-70.65,-33.45], zoom:yo?14:5});
    puntoMapaViaje.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    puntoMapaViaje.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true,showAccuracyCircle:true}),'top-right');
    puntoMapaViaje.on('click', function(e){
      puntoViajeCoords={lat:e.lngLat.lat, lon:e.lngLat.lng};
      if(puntoViajeMarker) puntoViajeMarker.remove();
      puntoViajeMarker=new maplibregl.Marker({color:'#fc4c02'}).setLngLat(e.lngLat).addTo(puntoMapaViaje);
      document.getElementById('puntoMapaViajeEstado').innerText='📍 Punto marcado. Te llevo por el camino real más cerca de ahí; si no hay camino mapeado hasta el punto, el último tramo puede que sea a pie.';
      const btn=document.getElementById('btnNavegarPuntoMapa'); if(btn) btn.style.display='block';
    });
  }
  setTimeout(function(){ puntoMapaViaje.resize(); },250);
}
async function navegarAPuntoMapaElegido(){
  if(!puntoViajeCoords){ lpAviso('Marca un punto en el mapa primero.'); return; }
  // 2026-08-20: fix de GPS fresco SIEMPRE al iniciar, no solo si currentUserLocation nunca
  // se había pedido — si no, la ruta arrancaba calculada desde donde estabas al abrir la
  // app, no desde donde estás parado ahora mismo.
  showLoading("Obteniendo ubicación...");
  await getCurrentLocation();
  hideLoading();
  if(!currentUserLocation){ lpAviso("Necesito tu GPS"); return; }
  currentTrip=null;
  const lat=puntoViajeCoords.lat, lon=puntoViajeCoords.lon;
  // Esta es la señal más confiable que existe para el mapa propio: un ciclista real
  // marcó el punto exacto con su GPS porque el buscador no lo encontró. Si el campo de
  // búsqueda todavía tiene el texto que escribió, queda asociado para la próxima vez.
  const qb=document.getElementById('quick-dest'); const textoBuscado=qb?qb.value.trim():'';
  if(textoBuscado) _guardarDireccionPropia(textoBuscado, lat, lon, textoBuscado, 'manual');
  const cont=document.getElementById('punto-mapa-viaje'); if(cont) cont.style.display='none';
  if(puntoViajeMarker){ puntoViajeMarker.remove(); puntoViajeMarker=null; }
  puntoViajeCoords=null;
  const btn=document.getElementById('btnNavegarPuntoMapa'); if(btn) btn.style.display='none';
  await calculateAndStartNavigation(currentUserLocation.lat, currentUserLocation.lon, lat, lon, 'Punto marcado en el mapa');
}
let _agregandoPOI=false;
let _agregandoHostel=false;
let _creandoRodada=false;
let _enviandoFrase=false;
async function agregarPOI(){
  const q=document.getElementById('poi-buscar').value.trim();
  const desc=document.getElementById('poi-desc').value.trim();
  if(!poiManualCoords && !q){ lpAviso('Escribe el lugar o dirección, o márcalo directo en el mapa.'); return; }
  if(!poiCatSel){ lpAviso('Elige una categoría para el punto.'); return; }
  if(!desc){ lpAviso('Cuenta brevemente qué es este punto.'); return; }
  if(_agregandoPOI) return; // evita duplicar el punto y el Darma con doble-tap
  _agregandoPOI=true;
  try{
    let dest=null;
    if(poiManualCoords){ dest=poiManualCoords; }
    else{
      h('Buscando "'+q+'" en el mapa...');
      try{ dest=await geocodeDestino(q); }catch(e){}
      if(!dest){ lpAviso('No encontré "'+q+'". Prueba con más detalle, o márcalo directo en el mapa con el botón de abajo.'); return; }
    }
    let comuna='Mi zona';
    try{ const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=json&accept-language=es&zoom=12&lat='+dest.lat+'&lon='+dest.lon); const j=await r.json(); const a=j.address||{}; comuna=a.city||a.town||a.village||a.municipality||a.county||a.state||'Mi zona'; }catch(e){}
    await db.collection('reportes').add({cat:poiCatSel, text:desc, lugar:q||'Marcado en el mapa', user:cu, nombre:nombreUsuario, lat:dest.lat, lon:dest.lon, comuna:comuna, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()});
    _ganarDarma(15); au(); if(typeof sincronizarStats==='function') sincronizarStats();
    document.getElementById('poi-buscar').value=''; document.getElementById('poi-desc').value=''; poiCatSel=null; renderPoiCats();
    poiManualCoords=null; if(poiManualMarker){ poiManualMarker.remove(); poiManualMarker=null; }
    document.getElementById('poi-mapa-manual').style.display='none';
    document.getElementById('btnPoiMapaManual').innerText='📍 No lo encuentra: márcalo directo en el mapa';
    try{ _pisteroMood='contento'; }catch(e){} h('¡Punto compartido en '+comuna+'! Ya está en el mapa para toda la comunidad. Quince de Darma para ti. 🙌');
  }catch(err){ lpAviso('No se pudo compartir: '+(err.code||err.message)); }
  finally{ _agregandoPOI=false; }
}
function openDiario(){ cv('diario'); } // toda la inicializacion vive en cv('diario'), un solo lugar
function renderDiarioEstados(){ const c=document.getElementById('diarioEstado'); if(!c) return; c.innerHTML=DIARIO_ESTADOS.map(function(s){ const sel=diarioEstadoSel===s.l; return '<button onclick="diarioEstadoSel=\''+s.l+'\';renderDiarioEstados()" style="flex:1;min-width:88px;padding:10px;border-radius:10px;border:2px solid '+(sel?'var(--p)':'#2a3147')+';background:'+(sel?'rgba(252,76,2,0.12)':'var(--gl)')+';color:#fff;font-weight:700;font-size:0.78rem;cursor:pointer">'+s.e+' '+s.l+'</button>'; }).join(''); }
function cargarDiario(){ const km=document.getElementById('diarioKm'); if(km) km.innerText=us.di.toFixed(2); let d={}; try{ d=JSON.parse(localStorage.getItem(diarioHoyKey()))||{}; }catch(e){} diarioEstadoSel=d.estado||null; const meta=document.getElementById('diarioMeta'), comp=document.getElementById('diarioComplejo'), refl=document.getElementById('diarioReflexion'); if(meta) meta.value=d.meta||''; if(comp) comp.value=d.complejo||''; if(refl) refl.value=d.reflexion||''; renderDiarioEstados(); renderDiarioHistorial(); }
function guardarDiario(){ const fecha=_fechaLocalYMD(); const d={estado:diarioEstadoSel, meta:document.getElementById('diarioMeta').value, complejo:document.getElementById('diarioComplejo').value, reflexion:document.getElementById('diarioReflexion').value, km:us.di, fecha:fecha, local_ts:Date.now()}; localStorage.setItem(diarioHoyKey(),JSON.stringify(d)); /* respaldo en la nube (tu cuenta) para no perderlo al cambiar de teléfono */ if(cu){ try{ db.collection('diarios').doc(cu+'_'+fecha).set({user:cu, fecha:fecha, estado:d.estado||'', meta:d.meta||'', complejo:d.complejo||'', reflexion:d.reflexion||'', km:d.km||0, ts:firebase.firestore.FieldValue.serverTimestamp()}); }catch(e){} } h('Diario guardado y respaldado en tu cuenta. Buen camino.'); renderDiarioHistorial(); }
// Compara fechas por dispositivo: si escribiste el mismo día en dos celulares, se queda
// con la versión más reciente (nube vs local) en vez de ignorar la nube solo porque ya
// había "algo" guardado localmente (eso perdía cambios más nuevos de otro dispositivo).
async function sincronizarDiarioNube(){
  if(!cu) return;
  try{
    const snap=await db.collection('diarios').where('user','==',cu).get();
    snap.forEach(function(doc){
      const x=doc.data(); if(!x.fecha) return;
      const key='lp_diario_'+cu+'_'+x.fecha;
      const cloudMs=(x.ts&&x.ts.seconds)?x.ts.seconds*1000:0;
      let local=null; try{ local=JSON.parse(localStorage.getItem(key)); }catch(e){}
      if(!local || cloudMs>(local.local_ts||0)){
        localStorage.setItem(key, JSON.stringify({estado:x.estado,meta:x.meta,complejo:x.complejo,reflexion:x.reflexion,km:x.km,fecha:x.fecha,local_ts:cloudMs}));
      }
    });
  }catch(e){}
}
function exportarMisDatos(){ const data={ app:'Libre Pedal', version:APP_VERSION, exportado:new Date().toISOString(), usuario:cu, nombre:nombreUsuario, perfil:{helmet:typeof selectedHelmet!=='undefined'?selectedHelmet:null, skin:typeof selectedSkin!=='undefined'?selectedSkin:null, lens:typeof selectedLens!=='undefined'?selectedLens:null, extras:typeof selectedExtras!=='undefined'?selectedExtras:[], piel:typeof selectedPiel!=='undefined'?selectedPiel:null, ojos:typeof selectedOjos!=='undefined'?selectedOjos:null, labios:typeof selectedLabios!=='undefined'?selectedLabios:null, vello:typeof selectedVello!=='undefined'?selectedVello:null, peinado:typeof selectedPeinado!=='undefined'?selectedPeinado:null, panuelo:typeof selectedPanuelo!=='undefined'?selectedPanuelo:null, unlocked:(typeof getDesbloqueados==='function'?getDesbloqueados():[])}, stats:us, pistOpts:(function(){try{return JSON.parse(localStorage.getItem('lp_pist_'+(cu||'anon'))||'null');}catch(e){return null;}})(), rutas:(typeof rutasLocales==='function'?rutasLocales():[]), diario:[] }; const pre='lp_diario_'+(cu||'anon')+'_'; Object.keys(localStorage).filter(function(k){return k.indexOf(pre)===0;}).sort().forEach(function(k){ try{ data.diario.push(JSON.parse(localStorage.getItem(k))); }catch(e){} }); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='LibrePedal-respaldo-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); h('Respaldo descargado: tus rutas, diario, perfil y estadísticas. Guárdalo a salvo.'); }
function importarMisDatos(input){
  const f=input.files&&input.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=function(){
    try{
      const data=JSON.parse(r.result);
      if(!data || (data.app && data.app!=='Libre Pedal')){ lpAviso('Ese archivo no es un respaldo de Libre Pedal.'); input.value=''; return; }
      if(data.pistOpts){ try{ localStorage.setItem('lp_pist_'+(cu||'anon'), JSON.stringify(data.pistOpts)); if(typeof renderPistCustom==='function') renderPistCustom(); if(typeof updateCustomizePreview==='function') updateCustomizePreview(); }catch(e){} }
      let nR=0, nD=0;
      // RUTAS: se suman a las que ya tienes (sin duplicar por localId) — no pierdes nada.
      if(Array.isArray(data.rutas) && data.rutas.length && typeof rutasLocales==='function'){
        const actuales=rutasLocales(); const ids={}; actuales.forEach(function(x){ if(x&&x.localId) ids[x.localId]=1; });
        const nuevas=data.rutas.filter(function(x){ return x && x.localId && x.points && x.points.length && !ids[x.localId]; });
        nR=nuevas.length; if(nR) rutasLocalesSet(actuales.concat(nuevas));
      }
      // DIARIO: solo sobrescribe si la entrada del respaldo es más nueva que la que
      // ya tienes — antes pisaba SIEMPRE, así que restaurar un respaldo viejo podía
      // borrar silenciosamente algo que escribiste hoy mismo para esa fecha (mismo
      // cuidado que ya tenía sincronizarDiarioNube, que acá no se aplicaba).
      if(Array.isArray(data.diario)){ data.diario.forEach(function(d){ if(d&&d.fecha){ try{
        const key='lp_diario_'+(cu||'anon')+'_'+d.fecha;
        let local=null; try{ local=JSON.parse(localStorage.getItem(key)); }catch(e2){}
        if(!local || (d.local_ts||0)>(local.local_ts||0)){ localStorage.setItem(key, JSON.stringify(d)); nD++; }
      }catch(e){} } }); }
      // PERFIL (casco/skin/lente): los 3 deben guardarse en localStorage, no solo en la
      // variable en memoria — si no, al recargar la app (login.onload lee de localStorage,
      // ver línea ~2007) el casco restaurado sobrevive pero el skin y el lente se pierden.
      if(data.perfil){ try{
        if(data.perfil.helmet){ selectedHelmet=data.perfil.helmet; localStorage.setItem('lp_helmet_'+cu, selectedHelmet); }
        if(data.perfil.skin){ selectedSkin=data.perfil.skin; localStorage.setItem('lp_skin_'+cu, selectedSkin); }
        if(data.perfil.lens){ selectedLens=data.perfil.lens; localStorage.setItem('lp_lens_'+cu, selectedLens); }
        if(Array.isArray(data.perfil.extras)){ selectedExtras=data.perfil.extras; localStorage.setItem('lp_extras_'+cu, JSON.stringify(selectedExtras)); }
        if(data.perfil.piel){ selectedPiel=data.perfil.piel; localStorage.setItem('lp_piel_'+cu, selectedPiel); }
        if(data.perfil.ojos){ selectedOjos=data.perfil.ojos; localStorage.setItem('lp_ojos_'+cu, selectedOjos); }
        if(data.perfil.labios){ selectedLabios=data.perfil.labios; localStorage.setItem('lp_labios_'+cu, selectedLabios); }
        if(data.perfil.vello){ selectedVello=data.perfil.vello; localStorage.setItem('lp_vello_'+cu, selectedVello); }
        if(data.perfil.peinado){ selectedPeinado=data.perfil.peinado; localStorage.setItem('lp_peinado_'+cu, selectedPeinado); }
        if(data.perfil.panuelo){ selectedPanuelo=data.perfil.panuelo; localStorage.setItem('lp_panuelo_'+cu, selectedPanuelo); }
        // Ítems comprados con Darma: UNIÓN con lo que ya hay local, nunca reemplazo
        // (mismo cuidado que reg() — un respaldo viejo no debe hacerte perder algo
        // que compraste después de generarlo).
        if(Array.isArray(data.perfil.unlocked) && typeof getDesbloqueados==='function'){
          const localArr=getDesbloqueados();
          const union=localArr.concat(data.perfil.unlocked.filter(function(x){return localArr.indexOf(x)===-1;}));
          localStorage.setItem('lp_unlocked_'+(cu||'anon'), JSON.stringify(union));
        }
        if(typeof initCustomization==='function') initCustomization();
      }catch(e){} }
      // ESTADÍSTICAS: nunca bajan tu progreso, toma el valor mayor (km, Darma, calorías).
      if(data.stats && typeof us==='object'){ try{ ['di','d','c'].forEach(function(k){ if((data.stats[k]||0)>(us[k]||0)) us[k]=data.stats[k]; }); localStorage.setItem('lp_u_'+cu, JSON.stringify(us)); }catch(e){} }
      input.value='';
      if(typeof renderRutas==='function') renderRutas(); if(typeof cargarDiario==='function') cargarDiario(); if(typeof au==='function') au();
      h('Respaldo restaurado: '+nR+' rutas y '+nD+' días de diario, más tu perfil y estadísticas. Todo de vuelta.');
    }catch(e){ input.value=''; lpAviso('Ese archivo no es un respaldo válido de Libre Pedal.'); }
  };
  r.readAsText(f);
}

/* ===== EXPORT ADMIN: lista completa de usuarios registrados ===== */
const ADMIN_ID = 'intyrivera_a_gmail_com';   // ID del admin (correo transformado)
async function verAnaliticasAdmin(){
  if(cu!==ADMIN_ID){ lpAviso('Solo el administrador puede ver las analíticas.'); return; }
  h('Cargando analíticas de uso...');
  try{
    // 2026-08-23: sin limit(). La coleccion /usage recien se habilito (su regla no
    // existia y todo caia al deny por defecto), asi que hoy esta casi vacia — pero pasa
    // a tener UN documento por usuario y crece con cada registro. Con tope antes de que
    // duela, no despues.
    const snap=await db.collection('usage').limit(500).get();
    const pantalla={}, tiempo={}, funcion={}, voz={}; let total=0, activos7d=0; const ahora=Date.now();
    snap.forEach(function(doc){ const d=doc.data(); total++;
      const uu=(d.ultimoUso&&d.ultimoUso.toMillis)?d.ultimoUso.toMillis():0; if(uu && (ahora-uu)<7*86400000) activos7d++;
      ['pantalla','tiempo','funcion','voz'].forEach(function(g){ const dst=(g==='pantalla')?pantalla:(g==='tiempo')?tiempo:(g==='voz')?voz:funcion; if(d[g]) Object.keys(d[g]).forEach(function(k){ dst[k]=(dst[k]||0)+(Number(d[g][k])||0); }); });
    });
    function top(o, sufijo){ const e=Object.entries(o).sort(function(a,b){return b[1]-a[1];}).slice(0,10); if(!e.length) return '<p style="color:#888;font-size:0.8rem">Sin datos todavía.</p>'; return e.map(function(x){ return '<div style="display:flex;justify-content:space-between;font-size:0.82rem;padding:3px 0;border-bottom:1px solid #222"><span>'+escapeHTML(x[0])+'</span><b style="color:var(--p)">'+x[1]+(sufijo||'')+'</b></div>'; }).join(''); }
    const tiempoMin={}; Object.keys(tiempo).forEach(function(k){ tiempoMin[k]=Math.round(tiempo[k]/60); });
    let html='<p style="font-size:0.9rem"><b>'+total+'</b> usuarios con actividad · <b style="color:var(--g)">'+activos7d+'</b> activos (últimos 7 días)</p>';
    html+='<h4 style="color:var(--p);font-size:0.85rem;margin:12px 0 4px"><i class="fas fa-mobile-screen"></i> Pantallas más vistas</h4>'+top(pantalla);
    html+='<h4 style="color:var(--p);font-size:0.85rem;margin:12px 0 4px"><i class="fas fa-stopwatch"></i> Dónde pasan más tiempo</h4>'+top(tiempoMin,' min');
    html+='<h4 style="color:var(--p);font-size:0.85rem;margin:12px 0 4px"><i class="fas fa-bolt"></i> Funciones más usadas</h4>'+top(funcion);
    if(Object.keys(voz).length) html+='<h4 style="color:var(--p);font-size:0.85rem;margin:12px 0 4px"><i class="fas fa-microphone-lines"></i> Voz/arquetipo</h4>'+top(voz);
    document.getElementById('modalTitle').innerHTML='<i class="fas fa-chart-column"></i> Analíticas de uso';
    document.getElementById('modalContent').innerHTML=html;
    document.getElementById('userModal').classList.add('on');
  }catch(e){ lpAviso('No pude cargar las analíticas: '+(e.message||e)); }
}
async function exportarUsuariosAdmin(){
  if(cu!==ADMIN_ID){ lpAviso('Solo el administrador puede exportar la lista de usuarios.'); return; }
  h('Obteniendo lista de usuarios registrados...');
  try{
    // 2026-08-23: sin limit() esto leia la coleccion ENTERA. Hoy son ~65 usuarios y no
    // se nota; con 5.000 son 5.000 lecturas de golpe (10% de la cuota diaria gratis de
    // TODO el proyecto) cada vez que se abre el panel. Se muestran los 300 mas nuevos,
    // que es para lo que sirve la pantalla; el total real sale de count(), que cuesta
    // 1 lectura por cada 1.000 documentos en vez de una por documento.
    const snap=await db.collection('users').orderBy('createdAt','desc').limit(300).get();
    const emails=await _mapaEmailsPrivados();
    const rows=[['Nombre','Email']]; // solo nombre y correo: para tu respaldo de registros
    snap.forEach(function(doc){ const d=doc.data();
      rows.push([ d.nombre||'', emails[doc.id]||'' ]);
    });
    const csv=rows.map(function(r){ return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
    const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download='LibrePedal-usuarios-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    h('Descargado: '+( snap.size)+' usuarios en el CSV. Ábrelo en Excel.');
  }catch(e){ lpAviso('No se pudo exportar: '+(e.message||e)); }
}

/* ===== TE DOY ALOJO: trueque ciclista, solo usuarios con 6+ meses ===== */
function mesesDesdeRegistro(){
  const key='lp_creado_'+cu; let ts=parseInt(localStorage.getItem(key)||'0',10);
  if(!ts){ ts=Date.now(); localStorage.setItem(key,String(ts)); }
  return Math.floor((Date.now()-ts)/(1000*60*60*24*30));
}
function requiere6Meses(){ return mesesDesdeRegistro()>=6; }
/* 2026-08-23: loadHostels() se llamaba al INICIAR SESION, y arrastra initVotosHostels()
   = guiComments where type=='voto' limit(500). Eran ~550 documentos por cada apertura de
   la app para una funcion que ni siquiera es alcanzable: "Te doy alojo" quedo OCULTO en el
   commit 8f2d678 (se saco el boton, pero no la carga de datos). Ahora carga aca, que es el
   unico lugar desde donde se puede llegar. */
async function abrirTeDoyAlojo(){
  _subUnaVez('hostels', loadHostels);
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-house"></i> Te doy alojo';
  const c=document.getElementById('modalContent'); c.innerHTML='<p style="color:#888">Cargando...</p>'; document.getElementById('userModal').classList.add('on');
  const meses=mesesDesdeRegistro();
  if(!requiere6Meses()){
    const faltan=6-meses;
    c.innerHTML='<div style="text-align:center;padding:20px"><div style="font-size:3rem"><i class="fas fa-lock"></i> </div><h3 style="color:var(--p)">Función exclusiva</h3><p style="color:#9fb3c8;font-size:0.85rem">Esta opción se desbloquea cuando llevas <strong>6 meses</strong> en la comunidad de Libre Pedal.<br>Te faltan <strong style="color:var(--g)">'+faltan+' mes'+(faltan!==1?'es':'')+'</strong> para acceder.</p><p style="color:#7d8ba0;font-size:0.76rem">Es para garantizar que solo ciclistas comprometidos participen. Sigue pedaleando y aportando a la comunidad. 🚴</p></div>';
    return;
  }
  // Usuario habilitado: ver ofertas y publicar la propia
  try{
    const snap=await db.collection('alojo').orderBy('ts','desc').limit(50).get();
    let html='<p style="font-size:0.8rem;color:#9fb3c8;margin-top:0"><i class="fas fa-handshake"></i> Intercambio de techo, comida y ayuda entre ciclistas de confianza. Comunidad verificada.</p>';
    if(!snap.empty){
      html+='<h4 style="font-size:0.85rem;color:var(--p)">Ofertas disponibles</h4>';
      snap.forEach(function(doc){ const d=doc.data(); html+='<div class="cd" style="margin-bottom:8px"><div style="font-weight:800;font-size:0.86rem;color:var(--p)">'+escapeHTML(d.nombre||'Ciclista')+'</div><div style="font-size:0.76rem;color:#9fb3c8"><i class="fas fa-location-dot"></i> '+escapeHTML(d.zona||'Zona no indicada')+'</div><div style="font-size:0.82rem;color:#dfe7ff;margin-top:4px">'+escapeHTML(d.desc||'')+'</div><button class="ab sec" style="width:auto;padding:6px 12px;margin-top:6px;font-size:0.75rem" onclick="abrirChatAmigo(\''+doc.data().user+'\')"><i class="fas fa-comment"></i> Contactar</button></div>'; });
    } else { html+='<p style="color:#888;font-size:0.8rem">Aún no hay ofertas. ¡Sé el primero en compartir alojo!</p>'; }
    html+='<h4 style="font-size:0.85rem;color:var(--g);margin-top:14px">Publicar mi oferta</h4>';
    html+='<input id="alojoZona" type="text" placeholder="Tu ciudad / zona" maxlength="80" style="margin-bottom:6px"><textarea id="alojoDesc" rows="3" placeholder="Qué ofreces: tipo de alojo, comida, cómo contactar..." maxlength="500"></textarea><button class="ab" style="margin-top:6px" onclick="publicarAlojo()"><i class="fas fa-house"></i> Publicar mi oferta (+20 Darma)</button>';
    c.innerHTML=html;
  }catch(e){ c.innerHTML='<p style="color:#888">No se pudo cargar.</p>'; }
}
let _publicandoAlojo=false;
async function publicarAlojo(){
  const zona=document.getElementById('alojoZona')?.value.trim();
  const desc=document.getElementById('alojoDesc')?.value.trim();
  if(!zona||!desc){ lpAviso('Rellena zona y descripción antes de publicar.'); return; }
  if(_publicandoAlojo) return; // evita duplicar la oferta y el Darma con doble-tap
  _publicandoAlojo=true;
  try{
    await db.collection('alojo').add({user:cu, nombre:nombreUsuario, zona:zona, desc:desc, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()});
    _ganarDarma(20); au(); sincronizarStats();
    try{ _pisteroMood='contento'; }catch(e){} h('¡Oferta publicada! Otros ciclistas ya pueden contactarte. Veinte de Darma para ti. 🏡');
    closeModal();
  }catch(e){ lpAviso('No se pudo publicar: '+(e.message||e)); }
  finally{ _publicandoAlojo=false; }
}
function renderDiarioHistorial(){ const c=document.getElementById('diarioHistorial'); if(!c) return; const pre='lp_diario_'+(cu||'anon')+'_'; const keys=Object.keys(localStorage).filter(function(k){return k.indexOf(pre)===0;}).sort().reverse().filter(function(k){return k!==diarioHoyKey();}); if(!keys.length){ c.innerHTML=''; return; } let html='<h4 style="font-size:0.85rem;color:var(--p)">Días anteriores</h4>'; keys.slice(0,12).forEach(function(k){ let d={}; try{d=JSON.parse(localStorage.getItem(k));}catch(e){return;} const est=DIARIO_ESTADOS.find(function(s){return s.l===d.estado;}); html+='<div class="cd" style="margin-bottom:8px"><div style="font-weight:800;font-size:0.76rem;color:#9fb3c8">'+escapeHTML(d.fecha||'')+' · '+(est?est.e+' '+est.l:'')+' · '+(d.km?(+d.km).toFixed(1):0)+' km</div>'+(d.meta?'<div style="font-size:0.78rem;margin-top:3px"><i class="fas fa-bullseye"></i> '+escapeHTML(d.meta)+'</div>':'')+(d.complejo?'<div style="font-size:0.75rem;color:#cdd;margin-top:3px"><i class="fas fa-dumbbell"></i> '+escapeHTML(d.complejo)+'</div>':'')+(d.reflexion?'<div style="font-size:0.75rem;color:#9fb3c8;font-style:italic;margin-top:3px"><i class="fas fa-comment"></i> '+escapeHTML(d.reflexion)+'</div>':'')+'</div>'; }); c.innerHTML=html; }
function rm(l){ document.getElementById('ml').innerHTML=l.map(function(i){ return '<div class="cd" onclick="h(\''+i.t+'. '+i.s.replace(/'/g,"\\'")+'\')"><b style="color:var(--p);font-size:0.85rem">'+i.t+'</b><p style="margin:6px 0;font-size:0.8rem">'+i.s+'</p><small style="color:#888;font-size:0.7rem">Fuente: '+i.f+'</small></div>'; }).join(''); }
function fm(){ const v=document.getElementById('bm').value.toLowerCase(); rm(MG.filter(function(i){ return i.t.toLowerCase().indexOf(v)!==-1||i.s.toLowerCase().indexOf(v)!==-1; })); }
function toggleSecretForm(){ document.getElementById('secretForm').classList.toggle('show'); }
let _agregandoRepairTip=false;
async function addRepairTip(){ const title=document.getElementById('repair-title').value.trim(); const desc=document.getElementById('repair-desc').value.trim(); if(!title||!desc) return lpAviso("Completa los campos"); if(_agregandoRepairTip) return; _agregandoRepairTip=true; try{ await db.collection('repairTips').add({user:cu,nombre:nombreUsuario,title:title,desc:desc,authUid:window.lpUID||null,h:new Date().toLocaleString(),ts:firebase.firestore.FieldValue.serverTimestamp()}); document.getElementById('repair-title').value=''; document.getElementById('repair-desc').value=''; toggleSecretForm(); h("Truco compartido. ¡Gracias!"); }catch(e){ lpAviso('No se pudo compartir: '+(e.message||e)); } finally{ _agregandoRepairTip=false; } }
function loadRepairTips(){ db.collection('repairTips').orderBy('ts','desc').limit(20).onSnapshot(function(snapshot){ const c=document.getElementById('repair-tips'); if(!c) return; if(snapshot.empty){ c.innerHTML='<p style="color:#888">Sé el primero en compartir</p>'; return; } const html='<h4 style="margin:12px 0 8px 0;color:var(--g);font-size:0.9rem">Trucos de la comunidad</h4>'+snapshot.docs.map(function(doc){ const data=doc.data(); return '<div class="repair-tip"><strong style="font-size:0.85rem">'+escapeHTML(data.title)+'</strong><p style="font-size:0.8rem">'+escapeHTML(data.desc)+'</p><small style="color:#888;font-size:0.7rem">Por: '+escapeHTML(data.nombre||data.user)+' - '+escapeHTML(data.h)+'</small></div>'; }).join(''); c.innerHTML=html; }); }
function filtrarCategoria(cat,btn){ categoriaActual=cat; btn.parentElement.querySelectorAll('.gtt').forEach(function(b){b.classList.remove('on');}); btn.classList.add('on'); fg(cat); }
function fg(c){ const f=c==='todos'?CG:CG.filter(function(i){return i.cat===c;}); const el=document.getElementById('gl'); if(!el) return; el.innerHTML=f.map(function(i){ return '<div class="gi" onclick="h(\''+i.t+'. '+i.d.replace(/'/g,"\\'")+'\')"><h4 style="margin:0 0 6px 0;color:var(--p);font-size:0.85rem">'+i.t+'</h4><p style="margin:0 0 6px 0;font-size:0.8rem">'+i.d+'</p><div>'+i.tg.map(function(t){return '<span style="background:#333;padding:2px 5px;border-radius:5px;font-size:0.6rem;margin-right:3px">'+t+'</span>';}).join('')+'</div></div>'; }).join(''); }
/* ===== FOTOS + VALORACIÓN (hospedajes y recomendaciones) =====
   La foto se comprime a 700px JPEG (~100KB) y viaja dentro del documento
   de Firestore: gratis, sin necesitar Firebase Storage. */
const fotosPendientes={hostel:null,rec:null};
function comprimirFoto(file,cb){
  const r=new FileReader();
  r.onload=function(ev){
    const img=new Image();
    img.onload=function(){
      const MAX=700; let w=img.width,alto=img.height;
      if(w>MAX){ alto=alto*MAX/w; w=MAX; }
      if(alto>MAX){ w=w*MAX/alto; alto=MAX; }
      const c=document.createElement('canvas'); c.width=w; c.height=alto;
      c.getContext('2d').drawImage(img,0,0,w,alto);
      cb(c.toDataURL('image/jpeg',0.6));
    };
    img.onerror=function(){ cb(null); };
    img.src=ev.target.result;
  };
  r.readAsDataURL(file);
}
function previewFoto(inp,tipo){
  const f=inp.files&&inp.files[0]; if(!f) return;
  comprimirFoto(f,function(data){
    if(!data){ lpAviso('No pude leer esa imagen, prueba con otra.'); return; }
    fotosPendientes[tipo]=data;
    const p=document.getElementById(tipo+'-foto-prev');
    if(p){ p.src=data; p.style.display='block'; }
  });
}
function limpiarFoto(tipo){ fotosPendientes[tipo]=null; const p=document.getElementById(tipo+'-foto-prev'); if(p){ p.src=''; p.style.display='none'; } const i=document.getElementById(tipo+'-foto'); if(i) i.value=''; }
function claveVoto(){ return String(cu||'anon').replace(/[.#$\/\[\]]/g,'_'); }
function estrellasHTML(col,id,data){
  let votes,avg,mio;
  if(col==='hostels'){
    // Las reglas de Firestore no dejan ACTUALIZAR hostels: los votos viven como
    // documentos aparte en guiComments (type:'voto') y se suman aquí.
    const v=votosHostels[id]||{}; const ns=Object.keys(v).map(function(k){return v[k].n;});
    votes=ns.length; avg=votes?ns.reduce(function(a,b){return a+b;},0)/votes:0;
    const me=v[String(cu||'anon')]; mio=me?me.n:0;
  } else {
    votes=data.votes||0; avg=votes?(data.ratingSum/votes):0;
    mio=(data.ratedBy||{})[claveVoto()]||0;
  }
  let s='<div style="margin-top:6px">';
  for(let i=1;i<=5;i++){ s+='<span onclick="valorar(\''+col+'\',\''+id+'\','+i+')" style="cursor:pointer;font-size:1.1rem;color:'+(i<=Math.round(mio||avg)?'var(--g)':'#3a4a5a')+'"><i class="fas fa-star"></i> </span>'; }
  s+=' <span style="color:#8aa;font-size:0.68rem">'+(votes?(avg.toFixed(1)+' · '+votes+(votes===1?' voto':' votos')+(mio?' · el tuyo: '+mio+'★':'')):'sé el primero en valorar')+'</span></div>';
  return s;
}
let votosHostels={}; // hostelId -> { usuario: {n, ts} }  (voto más reciente por usuario)
function initVotosHostels(){
  try{
    db.collection('guiComments').where('type','==','voto').limit(500).onSnapshot(function(s){
      const v={};
      s.forEach(function(doc){ const d=doc.data(); if(!d.target) return; const k=String(d.user||'anon'); const ts=(d.ts&&d.ts.seconds)||0; v[d.target]=v[d.target]||{}; const prev=v[d.target][k]; if(!prev||ts>=prev.ts){ v[d.target][k]={n:d.n||0,ts:ts}; } });
      votosHostels=v; renderHostelsLista();
    });
  }catch(e){}
}
async function valorar(col,id,n){
  try{
    if(col==='hostels'){
      // create-only: cada voto es un doc nuevo; se cuenta el último por usuario
      await db.collection('guiComments').add({type:'voto',target:id,user:cu||'anon',n:n,ts:firebase.firestore.FieldValue.serverTimestamp()});
    } else {
      const ref=db.collection(col).doc(id);
      const doc=await ref.get(); if(!doc.exists) return;
      const data=doc.data(); const by=data.ratedBy||{}; const k=claveVoto();
      const anterior=by[k]||0;
      // Antes se leía ratedBy completo, se modificaba en el cliente y se
      // reescribía entero — dos personas valorando casi al mismo tiempo se
      // pisaban (la escritura más tardía borraba en silencio el voto de la
      // otra, igual que pasaba con "asistentes" en rodadas). Con increment()
      // y una escritura de solo ESA clave del mapa (dot-path), cada voto suma
      // su delta sin importar qué haya escrito otro usuario en el medio.
      const cambios={}; cambios['ratedBy.'+k]=n;
      cambios.votes=firebase.firestore.FieldValue.increment(anterior?0:1);
      cambios.ratingSum=firebase.firestore.FieldValue.increment(n-anterior);
      await ref.update(cambios);
    }
    h('Gracias por tu valoración de '+n+(n===1?' estrella.':' estrellas.'));
  }catch(e){ lpAviso('No se pudo guardar tu valoración: '+(e.message||e)); }
}
function filtrarHostels(tipo,btn){ hostelTipoActual=tipo; btn.parentElement.querySelectorAll('.gtt').forEach(function(b){b.classList.remove('on');}); btn.classList.add('on'); renderHostelsLista(); }
async function addHostel(){ const name=document.getElementById('hostel-name').value.trim(); const tipo=document.getElementById('hostel-type').value; const location=document.getElementById('hostel-location').value.trim(); const desc=document.getElementById('hostel-desc').value.trim(); if(!name||!location) return lpAviso("Completa nombre y dirección"); if(_agregandoHostel) return; _agregandoHostel=true; try{ const d={user:cu,nombre:nombreUsuario,tipo:tipo,name:name,location:location,desc:desc,ratingSum:0,votes:0,ratedBy:{},authUid:window.lpUID||null,h:new Date().toLocaleString(),ts:firebase.firestore.FieldValue.serverTimestamp()}; if(hostelCoords){ d.lat=hostelCoords.lat; d.lon=hostelCoords.lon; } if(fotosPendientes.hostel){ d.foto=fotosPendientes.hostel; } await db.collection('hostels').add(d); document.getElementById('hostel-name').value=''; document.getElementById('hostel-location').value=''; document.getElementById('hostel-desc').value=''; limpiarFoto('hostel'); hostelCoords=null; document.getElementById('map-hostel-select').classList.remove('show'); document.getElementById('gpsStatus').classList.remove('show'); h("Alojamiento publicado. ¡Gracias por aportar a la comunidad!"); }catch(e){ lpAviso('No pude publicar el alojamiento ahora. ¿Tienes señal? Inténtalo otra vez.'); } finally{ _agregandoHostel=false; } }
function loadHostels(){ if(!loadHostels._votos){ loadHostels._votos=true; initVotosHostels(); } db.collection('hostels').orderBy('ts','desc').limit(50).onSnapshot(function(snapshot){ allHostels=[]; snapshot.forEach(function(doc){ const d=doc.data(); if(/^TEST-/.test(d.name||'')) return; allHostels.push(Object.assign({id:doc.id},d)); }); renderHostelsLista(); }, function(){ const c=document.getElementById('hostel-list'); if(c) c.innerHTML='<p style="color:#7d8ba0;font-size:0.8rem;text-align:center;padding:20px 0">No se pudieron cargar los alojamientos. Revisa tu conexión.</p>'; }); }
function renderHostelsLista(){ const c=document.getElementById('hostel-list'); if(!c) return; if(allHostels.length===0){ c.innerHTML='<p style="color:#888">Sin alojamientos</p>'; return; } let html='', count=0; for(const data of allHostels){ if(hostelTipoActual!=='todos'&&data.tipo!==hostelTipoActual) continue; const nombre=data.nombre||data.user; const coords=data.lat&&data.lon?'<div style="font-size:0.7rem;color:#aaa;margin-top:3px">GPS: '+data.lat.toFixed(5)+', '+data.lon.toFixed(5)+'</div>':''; const irBtn=(data.lat&&data.lon)?'<button class="ab" style="margin-top:6px;padding:7px;font-size:0.78rem" onclick="irAlPuntoYNavegar('+data.lat+','+data.lon+')"><i class="fas fa-compass"></i> Ir / Navegar</button>':''; const foto=data.foto?'<img src="'+escapeHTML(data.foto)+'" loading="lazy" alt="" style="width:100%;border-radius:10px;margin:6px 0;max-height:170px;object-fit:cover">':''; html+='<div class="hostel-card"><h4>'+escapeHTML(data.name)+'</h4>'+foto+'<p style="font-size:0.8rem">'+escapeHTML(data.location||'')+'</p><p style="font-size:0.8rem">'+escapeHTML(data.desc||'')+'</p>'+coords+estrellasHTML('hostels',data.id,data)+'<small style="color:#888;font-size:0.7rem">Por: '+escapeHTML(nombre)+' - '+escapeHTML(data.h)+'</small>'+irBtn+'</div>'; count++; } c.innerHTML = count===0 ? '<p style="color:#888">Sin alojamientos de ese tipo</p>' : html; }
function toggleHostelMap(){ const mapDiv=document.getElementById('map-hostel-select'); const st=document.getElementById('gpsStatus'); if(mapDiv.classList.contains('show')){ mapDiv.classList.remove('show'); st.classList.remove('show'); return; } mapDiv.classList.add('show'); st.classList.add('show'); st.innerText='Obteniendo ubicación...'; if(!mapHostelSelect){ mapHostelSelect=L.map('map-hostel-select').setView([-34.6037,-58.3816],13); L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapHostelSelect); } if(!navigator.geolocation){ st.innerText='GPS no disponible'; return; } navigator.geolocation.getCurrentPosition(function(pos){ const lat=pos.coords.latitude, lon=pos.coords.longitude; hostelCoords={lat:lat,lon:lon}; mapHostelSelect.setView([lat,lon],16); if(mapHostelSelect._um) mapHostelSelect.removeLayer(mapHostelSelect._um); mapHostelSelect._um=L.marker([lat,lon]).addTo(mapHostelSelect); st.innerText='Ubicación: '+lat.toFixed(5)+', '+lon.toFixed(5); mapHostelSelect.on('click',function(e){ hostelCoords={lat:e.latlng.lat,lon:e.latlng.lng}; if(mapHostelSelect._um) mapHostelSelect.removeLayer(mapHostelSelect._um); mapHostelSelect._um=L.marker([e.latlng.lat,e.latlng.lng]).addTo(mapHostelSelect); st.innerText='Punto: '+e.latlng.lat.toFixed(5)+', '+e.latlng.lng.toFixed(5); }); setTimeout(function(){ mapHostelSelect.invalidateSize(); },300); }, function(err){ st.innerText='Error: '+err.message; }, {enableHighAccuracy:true,timeout:10000}); }
let _agregandoComentarioGuia=false;
async function addComment(){ const input=document.getElementById('comment-input'); const text=input.value.trim(); if(!text) return; if(_agregandoComentarioGuia) return; _agregandoComentarioGuia=true; const hora=new Date().toLocaleTimeString(); try{ await db.collection('guiComments').add({user:cu,nombre:nombreUsuario,text:text,authUid:window.lpUID||null,h:hora,ts:firebase.firestore.FieldValue.serverTimestamp()}); input.value=''; h("Comentario publicado."); }catch(e){ lpAviso('No se pudo publicar el comentario.'); } finally{ _agregandoComentarioGuia=false; } }
function addRecommendation(){ const title=document.getElementById('rec-title').value.trim(); const cat=document.getElementById('rec-cat').value; const desc=document.getElementById('rec-desc').value.trim(); if(!title||!desc) return lpAviso("Completa los campos"); const rd={user:cu,nombre:nombreUsuario,title:title,cat:cat,desc:desc,likes:0,likedBy:[],ratingSum:0,votes:0,ratedBy:{},authUid:window.lpUID||null,h:new Date().toLocaleString(),ts:firebase.firestore.FieldValue.serverTimestamp()}; if(fotosPendientes.rec){ rd.foto=fotosPendientes.rec; } db.collection('recommendations').add(rd); document.getElementById('rec-title').value=''; document.getElementById('rec-desc').value=''; limpiarFoto('rec'); h("Recomendación publicada."); }
function loadRecommendations(){ db.collection('recommendations').orderBy('ts','desc').limit(50).onSnapshot(function(snapshot){ const c=document.getElementById('rec-list'); if(!c) return; if(snapshot.empty){ c.innerHTML='<p style="color:#888">Sé el primero</p>'; return; } const html=snapshot.docs.filter(function(doc){ return !/^TEST-/.test(doc.data().title||''); }).map(function(doc){ const data=doc.data(); const nombre=data.nombre||data.user; const liked=data.likedBy&&data.likedBy.indexOf(cu)!==-1; return '<div class="rec-card"><h4>'+escapeHTML(data.title)+'</h4>'+(data.foto?'<img src="'+escapeHTML(data.foto)+'" loading="lazy" alt="" style="width:100%;border-radius:10px;margin:6px 0;max-height:170px;object-fit:cover">':'')+'<div class="meta" style="font-size:0.75rem;color:#888">Por <strong>'+escapeHTML(nombre)+'</strong> · '+escapeHTML(data.h)+'</div><div style="font-size:0.85rem">'+escapeHTML(data.desc)+'</div>'+estrellasHTML('recommendations',doc.id,data)+'<div class="rec-actions"><button class="rec-btn '+(liked?'active':'')+'" onclick="likeRecommendation(\''+doc.id+'\')">Me gusta ('+(data.likes||0)+')</button>'+((data.lat&&data.lon)?'<button class="rec-btn" onclick="irAlPuntoYNavegar('+data.lat+','+data.lon+')"><i class="fas fa-compass"></i> Ir</button>':'')+'</div></div>'; }).join(''); c.innerHTML=html; }); }
// arrayUnion/arrayRemove + increment(): la version anterior leia likes/likedBy
// completos y los reescribia enteros - dos "me gusta" casi simultaneos se
// pisaban entre si (mismo problema que "asistentes" en rodadas). Asi, cada
// like suma o resta su delta atomicamente sin importar el orden de llegada.
async function likeRecommendation(docId){
  const ref=db.collection('recommendations').doc(docId);
  const doc=await ref.get(); const data=doc.data();
  const yaLeGustaba=(data.likedBy||[]).indexOf(cu)!==-1;
  await ref.update({
    likes: firebase.firestore.FieldValue.increment(yaLeGustaba?-1:1),
    likedBy: yaLeGustaba ? firebase.firestore.FieldValue.arrayRemove(cu) : firebase.firestore.FieldValue.arrayUnion(cu)
  });
}
function showNewTripForm(){ addedDests=[]; document.getElementById('trip-name').value=''; document.getElementById('trip-start').value=''; renderAddedDests(); filterDestType('hostel',document.querySelector('#v-newtrip .gtt')); cv('newtrip'); try{ if(typeof _mantencionAvisoPreViaje==='function') _mantencionAvisoPreViaje(); }catch(e){} }
function filterDestType(type,btn){ currentFilter=type; btn.parentElement.querySelectorAll('.gtt').forEach(function(b){b.classList.remove('on');}); btn.classList.add('on'); if(type==='hostel') renderHostelOptions(); else { document.getElementById('dest-options').innerHTML=''; document.getElementById('custom-dest-form').style.display='block'; } }
function renderHostelOptions(){ document.getElementById('custom-dest-form').style.display='none'; const c=document.getElementById('dest-options'); if(allHostels.length===0){ c.innerHTML='<p style="color:#888">Sin hostels guardados</p>'; return; } c.innerHTML=allHostels.map(function(hh,i){ return '<div class="hostel-option" onclick="addHostelDest('+i+')"><div><strong style="font-size:0.85rem">'+escapeHTML(hh.name)+'</strong><div style="font-size:0.7rem;color:#888">'+escapeHTML(hh.location)+'</div></div><i class="fas fa-plus" style="color:var(--p)"></i></div>'; }).join(''); }
function addHostelDest(idx){ const hh=allHostels[idx]; addedDests.push({name:hh.name,addr:hh.location,lat:hh.lat,lon:hh.lon,type:'hostel'}); renderAddedDests(); h("Agregado: "+hh.name); }
function addCustomDest(){ const name=document.getElementById('custom-dest-name').value.trim(); const addr=document.getElementById('custom-dest-addr').value.trim(); if(!name||!addr) return lpAviso("Completa los campos"); addedDests.push({name:name,addr:addr,lat:null,lon:null,type:'custom'}); document.getElementById('custom-dest-name').value=''; document.getElementById('custom-dest-addr').value=''; renderAddedDests(); }
function removeDest(idx){ addedDests.splice(idx,1); renderAddedDests(); }
function renderAddedDests(){ const c=document.getElementById('added-dests'); if(addedDests.length===0){ c.innerHTML='<p style="color:#888">Agrega destinos</p>'; return; } c.innerHTML=addedDests.map(function(d,i){ return '<div class="added-dest-item"><div style="background:var(--p);color:#000;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.7rem">'+(i+1)+'</div><div style="flex:1"><strong style="font-size:0.8rem">'+escapeHTML(d.name)+'</strong><div style="font-size:0.7rem;color:#888">'+escapeHTML(d.addr)+'</div></div><button onclick="removeDest('+i+')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.7rem">X</button></div>'; }).join(''); }
async function saveAndStartTrip(){ const name=document.getElementById('trip-name').value.trim(); const start=document.getElementById('trip-start').value.trim(); if(!name) return lpAviso("Ponle nombre al viaje"); if(!start) return lpAviso("Indica el origen"); if(addedDests.length===0) return lpAviso("Agrega al menos un destino"); try{ await db.collection('trips').add({user:cu,nombre:nombreUsuario,name:name,start:start,destinations:addedDests,authUid:window.lpUID||null,createdAt:firebase.firestore.FieldValue.serverTimestamp(),status:'pending'}); h("Viaje guardado: "+name); cv('trips'); }catch(err){ lpAviso("Error: "+err.message); } }
function loadTrips(){ db.collection('trips').where('user','==',cu).onSnapshot(function(snapshot){ trips=[]; snapshot.forEach(function(doc){ trips.push(Object.assign({id:doc.id},doc.data())); }); trips.sort(function(a,b){ return ((b.createdAt&&b.createdAt.seconds)||0)-((a.createdAt&&a.createdAt.seconds)||0); }); renderTrips(); }, function(){ const c=document.getElementById('trips-list'); if(c) c.innerHTML='<p style="color:#7d8ba0;font-size:0.8rem;text-align:center;padding:20px 0">No se pudieron cargar tus viajes. Revisa tu conexión.</p>'; }); }
function renderTrips(){ const c=document.getElementById('trips-list'); if(!c) return; if(trips.length===0){ c.innerHTML='<p style="color:#888;text-align:center;padding:15px">Aún no tienes viajes</p>'; return; } let html=''; for(let t=0;t<trips.length;t++){ const trip=trips[t]; let dests=''; for(let d=0;d<trip.destinations.length;d++){ dests+='<div>'+(d+1)+'. '+escapeHTML(trip.destinations[d].name)+'</div>'; } const badge=trip.status==='completed'?'(completado)':trip.status==='active'?'(en curso)':'(pendiente)'; html+='<div class="trip-card"><h3>'+escapeHTML(trip.name)+' <span style="font-size:0.7rem;color:#888">'+badge+'</span></h3><div class="meta">Desde: '+escapeHTML(trip.start)+' · '+trip.destinations.length+' destinos</div>'; if(trip.gpsData&&trip.gpsData.distance){ html+='<div style="color:var(--p);font-size:0.8rem;margin-bottom:8px">'+trip.gpsData.distance.toFixed(2)+' km · '+trip.gpsData.duration+'</div>'; } html+='<div class="dest-list">'+dests+'</div><div class="actions">'; if(trip.status!=='completed'){ html+='<button class="btn btn-start" onclick="startNavigation(\''+trip.id+'\')">Iniciar</button>'; } else { html+='<button class="btn btn-view" onclick="viewCompletedTrip(\''+trip.id+'\')">Ver</button>'; } html+='<button class="btn btn-delete" onclick="deleteTrip(\''+trip.id+'\')">Borrar</button></div></div>'; } c.innerHTML=html; }
async function deleteTrip(id){ if(await lpConfirmar("¿Eliminar este viaje?")){ db.collection('trips').doc(id).delete(); } }
function viewCompletedTrip(tripId){ const trip=trips.find(function(t){return t.id===tripId;}); if(!trip||!trip.gpsData||!trip.gpsData.points) return lpAviso("Este viaje no tiene ruta grabada"); currentTrip=trip; gpsPoints=trip.gpsData.points; totalDistance=trip.gpsData.distance||0; document.getElementById('nav-screen').classList.add('active'); if(navMap) navMap.remove(); navMap=L.map('nav-map').setView([gpsPoints[0].lat,gpsPoints[0].lon],15); L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(navMap); showHostelsOnNavMap(); drawGpsRoute(); document.getElementById('navText').innerText="Ruta completada"; document.getElementById('navDistTotal').innerText=totalDistance.toFixed(2); document.getElementById('navTime').innerText=trip.gpsData.duration||'0 min'; document.getElementById('navSpeed').innerText='0'; document.getElementById('etaDist').innerText=totalDistance.toFixed(2)+' km'; document.getElementById('etaDuration').innerText=trip.gpsData.duration||'0 min'; document.getElementById('etaTime').innerText='--:--'; showSpeechBubble("Recorriste "+totalDistance.toFixed(2)+" km"); }
async function startNavigation(tripId){ const trip=trips.find(function(t){return t.id===tripId;}); if(!trip) return; currentTrip=trip; showLoading("Obteniendo ubicación..."); await getCurrentLocation(); /* 2026-08-20: siempre fresco, ver navegarAPuntoMapaElegido */ if(!currentUserLocation){ hideLoading(); lpAviso("Necesito tu GPS para navegar"); return; } const dest=trip.destinations[trip.destinations.length-1]; let dLat=dest.lat, dLon=dest.lon, geoAproximado=false; if(!dLat||!dLon){ showLoading("Buscando "+dest.name+"..."); try{ const r=await geocodeDestino(dest.addr||dest.name); if(r){ dLat=r.lat; dLon=r.lon; geoAproximado=!!r.aproximado; } }catch(e){} hideLoading(); } if(!dLat||!dLon){ lpAviso('No pude ubicar "'+(dest.name||'el destino')+'". Escríbelo con más detalle (ciudad o región), o usa 📍 "elegir en el mapa" para marcarlo tú.'); return; } if(geoAproximado){ const seguir=await lpConfirmar('No encontré el número exacto de "'+(dest.name||'el destino')+'", pero sí la calle. ¿Uso este punto aproximado igual?'); if(!seguir) return; _guardarDireccionPropia(dest.addr||dest.name, dLat, dLon, dest.name, 'confirmado-aproximado'); } await calculateAndStartNavigation(currentUserLocation.lat,currentUserLocation.lon,dLat,dLon,dest.name); }
// Geocodificador global e inteligente: reconoce cualquier punto del mundo, pero
// si conocemos tu ubicación, prefiere los resultados cercanos (para términos
// genéricos como "la plaza", "farmacia", "supermercado"). Sigue siendo global:
// si lo más relevante está lejos (ej. "Torre Eiffel"), igual lo encuentra.
// Desplegable de sugerencias mientras escribes el destino (autocompletado).
let destinoElegido=null, sugTimer=null;
function sugerirDestino(q){
  destinoElegido=null;
  const box=document.getElementById('sugerencias-dest'); if(!box) return;
  q=(q||'').trim();
  if(q.length<3){ box.classList.remove('show'); box.innerHTML=''; return; }
  clearTimeout(sugTimer);
  sugTimer=setTimeout(async function(){
    const cc=await paisDelUsuario();
    // BUSCADOR PREDICTIVO (17-ago-2026). Antes esto iba solo a Nominatim, que NO es un
    // buscador de los que completan mientras escribís: exige el nombre casi entero. Inty
    // escribió "baldía" —así transcribe la voz "Valdivia", porque en Chile la b y la v
    // suenan igual— y recibió "Sin resultados"; con razón concluyó que el mapa no servía.
    // Y con "Providencia" el primer resultado era Rhode Island, Estados Unidos.
    // Photon (mismo OpenStreetMap detrás, gratis) sí es predictivo y acepta palabras a
    // medias: "puerto var" -> Puerto Varas, "cajon del maip" -> Cajón del Maipo,
    // "las cond" -> Las Condes. Con sesgo geográfico además ordena bien: "provi" devuelve
    // Providencia de Santiago, no Provin de Francia. Nominatim queda de RESPALDO si
    // Photon no responde, así que no se pierde nada de lo que ya andaba.
    let g=[];
    const sesgo=_sesgoBusqueda(cc);
    const tieneNumero=/\d/.test(q);
    try{
      let pu='https://photon.komoot.io/api/?limit=6&q='+encodeURIComponent(q);
      if(sesgo) pu+='&lat='+sesgo.lat+'&lon='+sesgo.lon;
      const rp=await fetch(pu); const jp=await rp.json();
      g=((jp&&jp.features)||[]).map(function(f){
        const p=f.properties||{}, c=(f.geometry&&f.geometry.coordinates)||[];
        const partes=[p.name, p.district||p.city||p.county, p.state, p.country].filter(Boolean);
        return { lat:c[1], lon:c[0], display_name:partes.join(', '), housenumber:p.housenumber||null };
      }).filter(function(x){ return x.lat!=null && x.lon!=null; });
      // Photon (el buscador predictivo) casi nunca tiene el número de casa cargado
      // fuera del centro de Santiago, pero tampoco devuelve 0 resultados: en vez de
      // "sin resultados" ofrece cosas sueltas sin relación real con la dirección
      // pedida (ej. "Balmaceda 456, Lago Ranco" -> sugiere un pasaje en Lautaro, a
      // 300 km). Si la búsqueda trae número y NINGUNA sugerencia de Photon trae un
      // housenumber real, se descartan y se cae al respaldo de Nominatim de abajo,
      // que sí indexa house_number cuando existe y si no, al menos ubica la calle
      // correcta en la comuna correcta (más útil que una sugerencia al azar).
      if(tieneNumero && !g.some(function(x){ return x.housenumber; })) g=[];
    }catch(e){}
    if(!g.length){
      let url='https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=es&limit=6&q='+encodeURIComponent(q);
      if(cc) url+='&countrycodes='+cc;
      if(currentUserLocation){ const d=3,lo=currentUserLocation.lon,la=currentUserLocation.lat; url+='&viewbox='+(lo-d)+','+(la+d)+','+(lo+d)+','+(la-d); }
      try{ const r=await fetch(url); g=await r.json(); }catch(e){}
    }
    if(!g||!g.length){ box.innerHTML='<div class="sug" style="color:#7d8ba0">Sin resultados para "'+escapeHTML(q)+'"</div>'; box.classList.add('show'); return; }
    // titulo/resto se muestran como HTML: igual que en el resto de la app (rutas,
    // chat, comunidad) van por escapeHTML antes de insertarse — display_name viene
    // de OpenStreetMap, una fuente externa editable por cualquiera, y antes se
    // insertaba directo sin escapar (inconsistente con el resto del código, que sí
    // lo hace en todos lados). "nm" es aparte: solo se usa dentro del atributo
    // onclick como string de JS, ahí lo que protege es sacar las comillas, no escapeHTML.
    box.innerHTML=g.map(function(it){ const parts=(it.display_name||'').split(','); const titulo=escapeHTML(parts[0]); const resto=escapeHTML(parts.slice(1,4).join(',').trim()); const nm=(it.display_name||'').replace(/['"\\]/g,' ').slice(0,90); return '<div class="sug" onclick="elegirSugerencia('+it.lat+','+it.lon+',\''+nm+'\')"><strong>'+titulo+'</strong>'+(resto?'<br><small>'+resto+'</small>':'')+'</div>'; }).join('');
    box.classList.add('show');
  }, 350);
}
function elegirSugerencia(lat,lon,nombre){
  destinoElegido={lat:parseFloat(lat),lon:parseFloat(lon),name:nombre};
  const qd=document.getElementById('quick-dest'); if(qd) qd.value=nombre;
  const box=document.getElementById('sugerencias-dest'); if(box){ box.classList.remove('show'); box.innerHTML=''; }
}
// País del usuario (código ISO, ej "cl") para resolver bien destinos ambiguos
// como "Santiago" (la capital de TU país, no otra del mundo). Se cachea.
let paisUsuario=localStorage.getItem('lp_pais')||null;
// Deduce el país por la ZONA HORARIA del teléfono. Es instantáneo, no pide permisos y
// no depende de la red ni del GPS. Existe porque el buscador de direcciones quedaba sin
// ninguna referencia geográfica cuando el país era desconocido: alguien en Santiago
// escribía "Providencia" y el primer resultado era Rhode Island, Estados Unidos. El
// usuario concluye, con razón, que el buscador no sirve. Reportado el 17-ago-2026.
function _paisPorZonaHoraria(){
  var tz='';
  try{ tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''; }catch(e){ return null; }
  var mapa={
    'America/Santiago':'cl','Pacific/Easter':'cl',
    'America/Argentina':'ar','America/Buenos_Aires':'ar',
    'America/Lima':'pe','America/Bogota':'co','America/Mexico_City':'mx',
    'America/La_Paz':'bo','America/Asuncion':'py','America/Montevideo':'uy',
    'America/Guayaquil':'ec','America/Caracas':'ve','America/Costa_Rica':'cr',
    'America/Guatemala':'gt','America/Santo_Domingo':'do','America/Puerto_Rico':'pr',
    'Europe/Madrid':'es','Atlantic/Canary':'es'
  };
  if(mapa[tz]) return mapa[tz];
  // "America/Argentina/Cordoba" y similares: se prueba con el prefijo de dos tramos.
  var pref=tz.split('/').slice(0,2).join('/');
  if(mapa[pref]) return mapa[pref];
  return null;
}
// Punto de referencia para ordenar los resultados del buscador. Primero el GPS real; si
// no hay (permiso no dado todavía, o recién abrió la app), el centro del país deducido de
// la zona horaria. Sin ninguna referencia, el buscador devuelve el mundo entero ordenado
// por popularidad global y aparecen lugares de otros continentes antes que el de al lado.
const _CENTROS_PAIS={
  cl:{lat:-33.45,lon:-70.66}, ar:{lat:-34.60,lon:-58.38}, pe:{lat:-12.05,lon:-77.04},
  co:{lat:4.71,lon:-74.07},   mx:{lat:19.43,lon:-99.13}, bo:{lat:-16.50,lon:-68.15},
  py:{lat:-25.28,lon:-57.63}, uy:{lat:-34.90,lon:-56.16}, ec:{lat:-0.18,lon:-78.47},
  ve:{lat:10.48,lon:-66.90},  cr:{lat:9.93,lon:-84.08},   gt:{lat:14.63,lon:-90.51},
  do:{lat:18.49,lon:-69.93},  pr:{lat:18.47,lon:-66.11},  es:{lat:40.42,lon:-3.70}
};
function _sesgoBusqueda(cc){
  if(typeof currentUserLocation!=='undefined' && currentUserLocation && currentUserLocation.lat!=null){
    return { lat:currentUserLocation.lat, lon:currentUserLocation.lon };
  }
  return (cc && _CENTROS_PAIS[cc]) ? _CENTROS_PAIS[cc] : null;
}
async function paisDelUsuario(){
  if(paisUsuario) return paisUsuario;
  // Antes de rendirse por falta de GPS: la zona horaria ya dice el país en la práctica.
  var tzCc=_paisPorZonaHoraria();
  if(tzCc){ paisUsuario=tzCc; try{ localStorage.setItem('lp_pais',tzCc); }catch(e){} return paisUsuario; }
  if(!currentUserLocation) return null;
  try{ const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=3&lat='+currentUserLocation.lat+'&lon='+currentUserLocation.lon); const j=await r.json(); const cc=(j.address&&j.address.country_code)?j.address.country_code:null; if(cc){ paisUsuario=cc; try{ localStorage.setItem('lp_pais',cc); }catch(e){} } }catch(e){}
  return paisUsuario;
}
// Variantes de escritura para cuando la VOZ transcribe mal un lugar: "qui/que" suena
// igual que "ki/ke" (ej: "Kiman" -> "Quimán"), y "ca/co/cu" como "ka/ko/ku". Solo se
// usan si la búsqueda tal cual no encuentra nada, así no molestan en el caso normal.
function _variantesFoneticas(q){
  const orig=(q||'').toLowerCase(), set=new Set();
  const add=function(s){ s=(s||'').trim(); if(s && s.toLowerCase()!==orig) set.add(s); };
  add(q.replace(/[kK]([eiéíEIÉÍ])/g,'qu$1').replace(/[kK]/g,'c')); // k+e/i -> qu ; resto k -> c
  add(q.replace(/[kK]/g,'qu'));
  add(q.replace(/[kK]/g,'c'));
  add(q.replace(/\bw/gi,'gu'));           // "wilson" -> "guilson"
  add(q.replace(/qu([eiéí])/gi,'k$1'));   // por si viene al revés
  return Array.from(set).slice(0,2); // solo las 2 mejores: no saturar Nominatim (~1 req/seg)
}
// Quita el número de casa de una dirección ("Av Providencia 1234" -> "Av Providencia",
// "1234 Providencia" -> "Providencia"). Se usa como último respaldo del geocoder: OSM en
// Chile casi no tiene cargados los números de puerta fuera del centro de Santiago (los
// voluntarios mapean la calle como línea, pero nadie marca el punto de cada número), así
// que buscar "Los Militares 1234" da 0 resultados aunque "Los Militares" sí exista. Sin
// esto la app respondía "no encontré esa dirección" en seco.
function _quitarNumeroDireccion(q){
  q=(q||'').trim();
  // El número de casa va pegado al nombre de calle, antes de la primera coma
  // ("Los Militares 1348, Las Condes" / "1348 Los Militares"): solo se limpia
  // ese primer segmento, el resto (comuna/región) se conserva tal cual.
  const partes=q.split(',');
  const original=partes[0];
  let calle=original.replace(/^\s*\d{1,6}\s*[,#]?\s*/,'').replace(/[,#]?\s*\d{1,6}\s*[a-zA-Z]?\s*$/,'').trim();
  if(calle.length<3 || calle===original.trim()) return null;
  partes[0]=calle;
  return partes.join(',').trim();
}
// Interpolación por número (2026-08-30): cuando Nominatim encuentra la calle pero no el
// número exacto, muchas veces OSM SÍ tiene otros números reales mapeados en esa misma
// calle (verificado: "Los Militares" en Las Condes tiene 37 números en OSM, aunque
// Nominatim no los use para una búsqueda con número que no calza exacto). Overpass (los
// datos crudos de OSM, gratis y sin límite real de uso) permite consultarlos: se toman
// los dos números ya mapeados más cercanos al pedido, uno menor y uno mayor, y se
// interpola la posición proporcionalmente — igual que hacen los geocodificadores
// profesionales cuando falta el punto exacto. Mucho más preciso que plantarse en el
// centro de toda la calle, que es lo único que había antes. Solo se intenta como último
// recurso (ya falló Nominatim con el número, y con las variantes fonéticas).
function _extraerNumeroDireccion(q){
  const m=String(q||'').split(',')[0].match(/\d{1,6}/);
  return m ? parseInt(m[0],10) : null;
}
async function _interpolarPorNumero(query){
  const num=_extraerNumeroDireccion(query);
  const calle=_quitarNumeroDireccion(query);
  if(!num || !calle) return null;
  const partes=calle.split(',');
  const nombreCalle=partes[0].trim();
  const comuna=(partes[1]||'').trim();
  if(!nombreCalle || !comuna) return null;
  const escOverpass=s=>String(s).replace(/["\\^$.*+?()[\]{}|]/g,'\\$&');
  try{
    const ql='[out:json][timeout:12];area["name"="'+escOverpass(comuna)+'"]["boundary"="administrative"]->.a;'
      +'node["addr:housenumber"]["addr:street"~"^'+escOverpass(nombreCalle)+'$",i](area.a);out body 80;';
    const r=await _fetchT('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(ql), 10000);
    const j=await r.json();
    const pts=(j.elements||[]).map(function(e){
      const hn=parseInt((e.tags&&e.tags['addr:housenumber'])||'',10);
      return (isNaN(hn)||e.lat==null||e.lon==null) ? null : {n:hn, lat:e.lat, lon:e.lon};
    }).filter(Boolean);
    if(!pts.length) return null;
    pts.sort(function(a,b){ return a.n-b.n; });
    let below=null, above=null;
    for(const p of pts){ if(p.n<=num) below=p; if(p.n>=num && !above) above=p; }
    if(below && above && below.n!==above.n){
      const f=(num-below.n)/(above.n-below.n);
      return {lat: below.lat+(above.lat-below.lat)*f, lon: below.lon+(above.lon-below.lon)*f};
    }
    const nearest=(below||above);
    return nearest ? {lat:nearest.lat, lon:nearest.lon} : null;
  }catch(e){ return null; }
}
// Mapa propio de direcciones: Nominatim/Photon casi no tienen números de casa cargados
// en Chile fuera del centro de Santiago, y eso no lo arregla ningún reintento — falta el
// dato, no falta buscar mejor. La solución real y gratis es que LibrePedal construya su
// propio catastro con lo que sus propios ciclistas van confirmando: cada vez que alguien
// llega a una dirección exacta (geocode limpio), acepta un punto aproximado a sabiendas,
// o la marca a mano en el mapa porque no se encontró, ESE punto queda guardado. La
// próxima persona que busque lo mismo lo encuentra al instante, sin depender de nadie
// externo, y con el uso real de la app se cubre justo lo que la comunidad necesita — no
// hace falta mapear Chile entero, solo las direcciones que los ciclistas realmente piden.
function _keyDireccion(q){
  return String(q||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,200);
}
async function _buscarDireccionPropia(query){
  const key=_keyDireccion(query);
  if(!key || typeof db==='undefined') return null;
  try{
    const doc=await db.collection('direccionesGeo').doc(key).get();
    if(doc.exists){ const d=doc.data(); if(d && d.lat!=null && d.lon!=null) return {lat:d.lat, lon:d.lon, name:d.name||query}; }
  }catch(e){}
  return null;
}
function _guardarDireccionPropia(query, lat, lon, name, origen){
  const key=_keyDireccion(query);
  if(!key || typeof db==='undefined' || typeof cu==='undefined' || !cu) return;
  try{
    db.collection('direccionesGeo').doc(key).set({
      q: String(query||'').slice(0,200), lat: lat, lon: lon, name: String(name||query||'').slice(0,300),
      origen: origen||'geocoder', creadoPor: cu, creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true}).catch(function(){});
  }catch(e){}
}
// Google Geocoding vía proxy propio (2026-08-30): último recurso PAGADO, solo cuando ya
// falló todo lo gratis (mapa propio, Nominatim, Photon, interpolación Overpass). Probado
// en vivo: Google rechaza en seco cualquier key restringida por referrer HTTP para esta
// API ("API keys with referer restrictions cannot be used with this API") -- llamarla
// directo desde el navegador no es opción real. La llave vive SOLO como secreto de
// Cloudflare en worker-ia (GOOGLE_GEOCODING_API_KEY), nunca en este archivo ni en el
// repo. El freno de gasto real (Google no ofrece corte automático duro para esta API,
// verificado en la consola) también vive del lado del servidor -- ver
// _geoPresupuestoMensual en worker-ia/worker.js, falla CERRADO si no puede confirmar
// cupo. El cliente no necesita (ni puede) verificar presupuesto por su cuenta: solo
// pregunta, y confía en lo que responda el Worker.
async function _geocodeGoogle(query){
  try{
    const r=await _fetchT(IA_URL+'/?geo='+encodeURIComponent(query), 10000);
    const j=await r.json();
    if(j.status!=='OK' || j.lat==null || j.lon==null) return null;
    const numPedido=_extraerNumeroDireccion(query);
    const comp=j.address_components||[];
    const hnComp=comp.find(function(c){ return c.types && c.types.indexOf('street_number')>=0; });
    const numEncontrado=hnComp?parseInt(hnComp.long_name,10):null;
    const houseMatch=(numPedido==null)||(numEncontrado!=null && numEncontrado===numPedido);
    return {lat:j.lat, lon:j.lon, name:j.name, houseMatch:houseMatch};
  }catch(e){ return null; }
}
async function geocodeDestino(query){
  const propia=await _buscarDireccionPropia(query);
  if(propia) return propia;
  const cc=await paisDelUsuario();
  async function intentar(q){
    const baseUrl='https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=es&limit=8&q='+encodeURIComponent(q);
    async function buscar(extra){ try{ const r=await _fetchT(baseUrl+extra, 12000); const j=await r.json(); return j||[]; }catch(e){ return []; } }
    const impOf=function(x){ return parseFloat((x&&x.importance)||0); };
    const porImp=function(a,b){ return impOf(b)-impOf(a); };
    const porDist=function(a,b){ if(!currentUserLocation) return 0; return calculateDistance(currentUserLocation.lat,currentUserLocation.lon,parseFloat(a.lat),parseFloat(a.lon)) - calculateDistance(currentUserLocation.lat,currentUserLocation.lon,parseFloat(b.lat),parseFloat(b.lon)); };
    // Buscamos en tu país Y en el mundo, y elegimos con criterio.
    const local = cc ? await buscar('&countrycodes='+cc) : [];
    const global = await buscar('');
    if(!local.length && !global.length) return null;
    const localBest = local.length ? local.slice().sort(porImp)[0] : null;
    const globalBest = global.length ? global.slice().sort(porImp)[0] : null;
    let best;
    // Si hay un buen match en TU país y no existe uno global MUCHO más relevante,
    // se prefiere el local (así "Santiago" => tu país, no otra del mundo).
    if(localBest && impOf(localBest)>=0.35 && (!globalBest || (impOf(globalBest)-impOf(localBest))<0.25)){
      best = (impOf(localBest)<0.45 && currentUserLocation) ? local.slice().sort(porDist)[0] : localBest;
    } else if(globalBest){
      best = globalBest; // hito mundial famoso (Torre Eiffel, Machu Picchu, etc.)
    } else {
      best = localBest;
    }
    // OJO (2026-08-30): Nominatim casi nunca devuelve 0 resultados solo porque el número
    // de casa no calza — su búsqueda libre suele ignorar el número silenciosamente y
    // devolver la calle igual, como si hubiera "encontrado" la dirección completa. Antes
    // este código confiaba en cualquier resultado no-nulo como si fuera exacto, así que la
    // interpolación por Overpass casi nunca llegaba a usarse. `houseMatch` distingue los
    // dos casos comparando el número pedido contra `address.house_number` (el único campo
    // donde Nominatim confirma que sí encontró ESE número, no solo la calle).
    const numPedido=_extraerNumeroDireccion(q);
    const numEncontrado=best.address && best.address.house_number ? parseInt(best.address.house_number,10) : null;
    const houseMatch = (numPedido==null) || (numEncontrado!=null && numEncontrado===numPedido);
    return {lat:parseFloat(best.lat), lon:parseFloat(best.lon), name:best.display_name, houseMatch:houseMatch};
  }
  let r=await intentar(query);
  if(r && r.houseMatch){ _guardarDireccionPropia(query, r.lat, r.lon, r.name, 'geocoder'); return r; }
  let candidato = r; // "encontró algo" pero sin confirmar el número — respaldo si nada mejor aparece
  // No se encontró tal cual: la voz suele escribir "ki/ka" donde va "qui/ca". Reintenta.
  for(const v of _variantesFoneticas(query)){
    r=await intentar(v);
    if(r && r.houseMatch){ _guardarDireccionPropia(query, r.lat, r.lon, r.name, 'geocoder'); return r; }
    if(r && !candidato) candidato=r;
  }
  // Último intento con datos reales antes de resignarse a un punto aproximado: Google
  // Geocoding vía proxy propio (pago, freno de gasto real del lado del servidor -- ver
  // _geocodeGoogle). Deliberadamente lo ÚLTIMO que se prueba, no lo primero — todo lo
  // gratis ya falló acá. Si el Worker rechaza por presupuesto agotado, simplemente
  // devuelve null y seguimos al respaldo de abajo, sin romper nada.
  try{
    const rg=await _geocodeGoogle(query);
    if(rg && rg.houseMatch){ _guardarDireccionPropia(query, rg.lat, rg.lon, rg.name, 'google'); return rg; }
    if(rg && !candidato) candidato=rg;
  }catch(e){}
  // Último respaldo: si la dirección traía número de casa, probamos sin él. OSM en Chile
  // casi nunca tiene el número exacto mapeado fuera del centro de Santiago, pero la calle
  // sola sí suele existir.
  const sinNumero=_quitarNumeroDireccion(query);
  if(sinNumero){ const rStreet=await intentar(sinNumero); if(rStreet && !candidato) candidato=rStreet; }
  if(candidato){
    candidato.aproximado=true;
    // Refinamiento: si Overpass tiene otros números reales en esta calle, se usa esa
    // posición interpolada en vez del centro de toda la calle (ver _interpolarPorNumero).
    // Se marca "aproximado" para que quien llama avise al usuario en vez de navegar en
    // silencio a un punto que no es el número pedido — y solo se guarda en el mapa propio
    // si esa persona lo confirma (ver startQuickTrip/startNavigation).
    try{ const interp=await _interpolarPorNumero(query); if(interp){ candidato.lat=interp.lat; candidato.lon=interp.lon; } }catch(e){}
    return candidato;
  }
  return null;
}
async function startQuickTrip(){ const destInput=document.getElementById('quick-dest').value.trim(); if(!destInput){ lpAviso("Escribe un destino"); return; } currentTrip=null; showLoading("Obteniendo ubicación..."); await getCurrentLocation(); /* 2026-08-20: siempre fresco, ver navegarAPuntoMapaElegido */ if(!currentUserLocation){ hideLoading(); lpAviso("Necesito tu GPS"); return; } const box=document.getElementById('sugerencias-dest'); if(box){ box.classList.remove('show'); } showLoading("Buscando: "+destInput); try{ const dest=(destinoElegido && destinoElegido.name && destInput===destinoElegido.name) ? destinoElegido : await geocodeDestino(destInput); if(!dest){ hideLoading(); lpAviso('No encontré "'+destInput+'". Los nombres poco comunes a veces no están en el buscador. Escríbelo con más detalle (agrega la ciudad o región), o toca 📍 "No lo encuentro: elegir en el mapa" para marcar el punto exacto tú.'); return; } hideLoading(); if(dest.aproximado){ const seguir=await lpConfirmar('No encontré el número exacto de "'+destInput+'", pero sí la calle. ¿Uso este punto aproximado igual?'); if(!seguir) return; _guardarDireccionPropia(destInput, dest.lat, dest.lon, dest.name, 'confirmado-aproximado'); } await calculateAndStartNavigation(currentUserLocation.lat,currentUserLocation.lon,dest.lat,dest.lon,dest.name); }catch(err){ hideLoading(); lpAviso(((err&&err.name==='AbortError')||!navigator.onLine) ? 'Estás sin señal para buscar el destino. Prueba de nuevo con internet, o marca el punto en el mapa.' : 'No pude buscar ese destino ahora. Inténtalo otra vez.'); } }
function _tileXY(lat,lon,zoom){ const n=Math.pow(2,zoom); const x=Math.floor((lon+180)/360*n); const latRad=lat*Math.PI/180; const y=Math.floor((1-Math.log(Math.tan(latRad)+1/Math.cos(latRad))/Math.PI)/2*n); return {x:x,y:y}; }
async function descargarMapaRuta(){
  const btn=document.getElementById('btnDescargarMapa');
  if(!routeLine){ h('Todavía no tengo una ruta calculada para descargar.'); return; }
  if(!('serviceWorker' in navigator) || !navigator.serviceWorker.controller){ lpAviso('La descarga offline necesita que la app esté instalada/activa como PWA.'); return; }
  const b=routeLine.getBounds();
  const urls=[];
  [13,14,15,16].forEach(function(z){
    const tl=_tileXY(b.getNorth(),b.getWest(),z), br=_tileXY(b.getSouth(),b.getEast(),z);
    const xMin=Math.max(0,tl.x-1), xMax=br.x+1, yMin=Math.max(0,tl.y-1), yMax=br.y+1;
    for(let x=xMin;x<=xMax;x++){ for(let y=yMin;y<=yMax;y++){ urls.push('https://a.tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png'); } }
  });
  if(urls.length>3000){ lpAviso('La ruta es muy larga para descargar de una vez ('+urls.length+' mosaicos). Descarga tramos más cortos.'); return; }
  btn.disabled=true; btn.innerText='Descargando 0 / '+urls.length+'...';
  function onMsg(e){
    if(!e.data) return;
    if(e.data.type==='PRECACHE_PROGRESS'){ btn.innerText='Descargando '+e.data.done+' / '+e.data.total+'...'; }
    else if(e.data.type==='PRECACHE_DONE'){ btn.innerText='✅ Mapa descargado ('+e.data.done+' mosaicos)'; h('Listo, descargué el mapa de tu ruta. Ya puedes andar sin señal por esta zona.'); navigator.serviceWorker.removeEventListener('message',onMsg); setTimeout(function(){ btn.disabled=false; btn.innerText='📥 Descargar mapa de la ruta (para andar sin señal)'; },4000); }
  }
  navigator.serviceWorker.addEventListener('message',onMsg);
  navigator.serviceWorker.controller.postMessage({type:'PRECACHE_TILES',urls:urls});
}
function _navBgCallback(location){ _navPosUpdate(location.latitude, location.longitude, location.accuracy, (location.speed&&location.speed>0.7)?location.speed*3.6:0, location.altitude); }
// Nombrada (no anónima) para poder reusarla al reiniciar el watchPosition web
// cuando cambia el Ahorro de GPS a mitad de una navegación (ver toggleAhorroGPS).
function _navGeoCallback(pos){ _navPosUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed, pos.coords.altitude); }
function _navPosUpdate(lat,lon,accuracy,speedMs,altitude){
  // Mismo resguardo que ug(): coordenadas corruptas (null/NaN) no deben tocar ningún
  // cálculo de distancia ni mover el marcador (Leaflet lanza excepción con NaN, lo
  // que cortaría en seco todo lo que viene después en esta misma función).
  if(!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  if(accuracy>30){ _gpsBadgeToggle('navGpsSignalBadge', true); return; }
  _gpsBadgeToggle('navGpsSignalBadge', false);
  // Pausa manual: seguimos mostrando tu posición pero NO contamos km, tiempo ni recalculamos.
  if(viajePausaManual){ if(helmetMarker&&navMap){ helmetMarker.setLatLng([lat,lon]); if(navAutoFollow) navMap.panTo([lat,lon]); } document.getElementById('navSpeed').innerText='0'; return; }
  const _now=Date.now();
  // Ventana de velocidad SEPARADA del registro de distancia (mismo patrón que el GPS
  // libre con posHistory/currentRoute): antes esto se calculaba sobre gpsPoints, que
  // solo recibía puntos cuando había movimiento real >=12m — como al detenerte del
  // todo dejaban de llegar puntos nuevos a gpsPoints, la velocidad quedaba pegada en
  // lo último que marcaba y nunca volvía a 0 (ni se detectaba la pausa).
  const _nuevoPuntoNav={lat:lat,lon:lon,t:_now};
  if(_filtrarSaltoVentana(navPosHistory, _nuevoPuntoNav)) navPosHistory.push(_nuevoPuntoNav);
  while(navPosHistory.length>1 && (_now-navPosHistory[0].t)>12000) navPosHistory.shift();
  _altitudConFallback(navPendienteHistory, lat, lon, altitude);
  const _spWin=velocidadVentana(navPosHistory);
  const _speedBase=(_spWin<6)?0:_spWin;
  // Mismo criterio riguroso que ug(): una vez confirmado el movimiento real por la
  // ventana de posición, se prefiere coords.speed (Doppler del chip GPS) para el
  // número exacto — reporte real: 70 km/h reales se mostraban como más de 100.
  const _velHWNav=_velocidadHardware(speedMs);
  const speed=(_speedBase>0 && _velHWNav!=null && _velHWNav<=_velMaxPlausibleKmh()) ? _velHWNav : _speedBase;
  _actualizarPausaViaje(speed, 'navPausaBadge');
  _verificarSegmentos(lat,lon);
  // jitter: no suma distancia/calorías si el salto es < 12 m (deriva del GPS quieto),
  // pero el punto igual queda registrado arriba para la velocidad real.
  // Bug real (2026-08-30, reporte de Inty "marcó mi posición superlejos de donde estaba"):
  // igual que en ug() (GPS libre), este chequeo de plausibilidad solo protegía el
  // kilometraje — el marcador (helmetMarker+panTo), _actualizarLiveTrack y el track
  // dibujado (gpsPoints) se actualizaban con el fix crudo sin ningún filtro, así que un
  // glitch del chip GPS (multipath/rebote de señal) teletransportaba al ciclista en el
  // mapa de navegación. lastGpsPoint se sigue re-anclando SIEMPRE (si no, un salto real y
  // sostenido se quedaría pegado en vez de ponerse al día en el fix siguiente).
  let _saltoPosOKNav=true;
  if(lastGpsPoint){
    const dist=calculateDistance(lastGpsPoint.lat,lastGpsPoint.lon,lat,lon);
    if(dist>=12){
      _saltoPosOKNav=_saltoEsPlausible(dist, _now-(lastGpsPoint.t||_now));
      // Salto implausible (glitch del GPS): no suma al kilometraje ni mueve nada visual,
      // pero re-ancla lastGpsPoint igual para que el próximo fix se calcule contra el
      // punto correcto. Mismo bug real que en ug() (GPS libre): sin exigir speed>0, el
      // ruido normal del GPS estando quieto se colaba de a poco al kilometraje aunque
      // "speed" (ya calculada arriba, con ventana de varios puntos) mostrara 0 = parado.
      if(speed>0 && _saltoPosOKNav){ const dkm=dist/1000; totalDistance+=dkm; us.di+=dkm; _kmEsteViaje+=dkm; _sumarKmModo(dkm); _sumarKmMantencion(dkm); us.c+=dkm*30; au(); }
      if(_saltoPosOKNav) gpsPoints.push({lat:lat,lon:lon,speed:speed,timestamp:_now,alt:(altitude!=null?altitude:null)});
      lastGpsPoint={lat:lat,lon:lon,t:_now};
    }
  }
  else { gpsPoints.push({lat:lat,lon:lon,speed:speed,timestamp:_now,alt:(altitude!=null?altitude:null)}); lastGpsPoint={lat:lat,lon:lon,t:_now}; }
  if(_saltoPosOKNav){
    _actualizarLiveTrack(lat,lon);
    if(helmetMarker){ helmetMarker.setLatLng([lat,lon]); if(navAutoFollow) navMap.panTo([lat,lon]); }
  }
  L.polyline(gpsPoints.map(function(p){return [p.lat,p.lon];}),{color:'#10b981',weight:4,opacity:0.7}).addTo(navMap);
  document.getElementById('navSpeed').innerText=Math.round(speed);
  document.getElementById('navDistTotal').innerText=totalDistance.toFixed(2);
  const elS=Math.floor(tiempoActivoMs()/1000), mm=Math.floor(elS/60), ss=elS%60;
  document.getElementById('navTime').innerText=mm+':'+(ss<10?'0':'')+ss;
  _detectarModoEquivocado(speed);
  checkFuel(totalDistance);
  actualizarZona(lat,lon); // detecta comuna + cuenta anécdota de la IA
  bromasDelCamino(speed, routeTotalDistance); // bromas también al navegar a un destino (antes solo salían en el GPS libre); manda el total de la ruta para espaciarlas según lo largo del viaje (ver comentario en motor-gps.js)
  if(rutaPerfil.length) avisarPendienteAnticipada(lat,lon); else comentarPendiente(navPendienteHistory, speed);
  avisarPuntosCercanos(lat,lon,speed);
  avisarReportesCercanos(lat,lon,speed);
  /* Rumbo real deducido de los dos últimos puntos del track (más confiable que
     coords.heading, que en teléfonos casi parados devuelve null o basura). Se calcula
     UNA vez y lo usan tanto el aviso de ciclista adelante como el de viento en contra. */
  let _rumbo=null;
  if(typeof gpsPoints!=='undefined' && gpsPoints && gpsPoints.length>1){
    const _a=gpsPoints[gpsPoints.length-2], _b=gpsPoints[gpsPoints.length-1];
    _rumbo=(_a&&_b)?_bearingEntrePuntos({lat:_a.lat,lon:_a.lon},{lat:_b.lat,lon:_b.lon}):null;
  }
  if(typeof _revisarCiclistasAdelante==='function'){ _revisarCiclistasAdelante(lat,lon,_rumbo,speed); }
  if(typeof _avisarVientoEnContra==='function'){ _avisarVientoEnContra(_rumbo); }
  _avisoLluviaProactivo(lat,lon); vigilarClima(lat,lon);
  _verificarFatiga(tiempoActivoMs(), speed);
  checkNavigationSteps(lat,lon,speed);
  verificarDesviacion(lat,lon);
  compararRitmoHistorico(totalDistance, tiempoActivoMs());
  _guardarEstadoNavParaReanudar();
}
/* Recalculo automático si te desvías (como Waze). CLAVE: mide la distancia a TODA la
   ruta (no solo al tramo actual) y con distancia punto-a-SEGMENTO real. Antes solo
   miraba el paso actual: si el índice de paso iba atrasado creía que te habías salido
   aunque estuvieras en plena carretera, y recalculaba en falso. */
let rutaLatLngs=[];
