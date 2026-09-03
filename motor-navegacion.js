// ===== PENDIENTE ANTICIPADA: lee el perfil de elevación de la ruta HACIA ADELANTE
// (una llamada por lotes a Open-Meteo, gratis) y avisa la subida/bajada ANTES de llegar,
// sin depender del ruido de altitud del GPS. Si el perfil no se cargó, la navegación
// usa igual el método reactivo (comentarPendiente) como respaldo. =====
let rutaPerfil=[], pendAntCooldown=0; const pendAntAvisadas=new Set();
async function _prefetchPerfilRuta(){
  rutaPerfil=[]; pendAntAvisadas.clear(); pendAntCooldown=0;
  try{
    const pts=rutaLatLngs; if(!pts||pts.length<2) return;
    let total=0; const acum=[0];
    for(let i=1;i<pts.length;i++){ total+=calculateDistance(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]); acum.push(total); }
    if(total<250) return; // ruta muy corta para avisos anticipados
    const step=Math.max(120, total/95); // <=100 muestras (límite de Open-Meteo)
    const muestras=[]; let next=0;
    for(let i=0;i<pts.length;i++){ if(acum[i]>=next-1){ muestras.push({d:acum[i], lat:pts[i][0], lon:pts[i][1]}); next+=step; if(muestras.length>=100) break; } }
    if(muestras.length<3) return;
    const lats=muestras.map(function(m){return m.lat.toFixed(5);}).join(',');
    const lons=muestras.map(function(m){return m.lon.toFixed(5);}).join(',');
    const r=await _fetchT('https://api.open-meteo.com/v1/elevation?latitude='+lats+'&longitude='+lons, 12000);
    const j=await r.json(); const ele=(j&&j.elevation)||[];
    if(ele.length!==muestras.length) return;
    rutaPerfil=muestras.map(function(m,i){ return {d:m.d, ele:ele[i], lat:m.lat, lon:m.lon}; });
  }catch(e){ rutaPerfil=[]; }
}
// Responde "¿qué pendiente hay?" con el dato real: si hay perfil de ruta cargado
// (navegación con destino) usa la MISMA lógica de avisarPendienteAnticipada pero
// sin sus efectos secundarios (cooldown, marcar como avisada) porque esto es una
// consulta, no un aviso proactivo. Si no hay perfil (GPS libre, o nav sin perfil
// aún cargado), cae al detector reactivo (zonaPendienteActual).
function _pendienteActualTexto(){
  const loc=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
  if(rutaPerfil && rutaPerfil.length && loc){
    let iNow=0, best=Infinity;
    for(let i=0;i<rutaPerfil.length;i++){ const dd=calculateDistance(loc.lat,loc.lon,rutaPerfil[i].lat,rutaPerfil[i].lon); if(dd<best){ best=dd; iNow=i; } }
    if(best<=150){
      const dNow=rutaPerfil[iNow].d, eleNow=rutaPerfil[iNow].ele;
      let iAhead=-1;
      for(let i=iNow+1;i<rutaPerfil.length;i++){ if(rutaPerfil[i].d-dNow>=180){ iAhead=i; break; } }
      if(iAhead>=0){
        const grade=((rutaPerfil[iAhead].ele-eleNow)/(rutaPerfil[iAhead].d-dNow))*100;
        const _u=_umbralPendiente();
        const _gTxt=Math.round(Math.abs(grade))+'%';
        const _fuerte=Math.abs(grade)>=_u*2;
        if(grade>=_u) return 'Vamos en subida'+(_fuerte?' fuerte':'')+' ahora mismo, al '+_gTxt+'. Dale con ganas.';
        if(grade<=-_u) return 'Vamos en bajada'+(_fuerte?' pronunciada':'')+' ahora mismo, al '+_gTxt+'. Ojo con la velocidad.';
        return 'Vamos en terreno más o menos plano por ahora.';
      }
    }
  }
  if(zonaPendienteActual==='subida') return 'Vamos en subida ahora mismo, dale con ganas.';
  if(zonaPendienteActual==='bajada') return 'Vamos en bajada ahora mismo, ojo con la velocidad.';
  return 'Por ahora vamos en terreno parejo.';
}
/* Cuánto camino mirar hacia adelante, según a qué velocidad vas.
   Antes eran 180 metros fijos. En bici son ~30 segundos de aviso (bien), pero en auto
   a 60 km/h son 10 segundos: el aviso llega cuando ya pasaste el tramo. Reportado en
   ruta el 2026-07-20 andando en auto. Ahora se mira ~35 segundos de viaje, con piso y
   techo para que no se vuelva absurdo ni detenido ni volando. */
function _metrosAMirar(velKmh){
  const v=(typeof velKmh==='number' && isFinite(velKmh) && velKmh>0) ? velKmh : 18;
  return Math.max(180, Math.min(600, (v/3.6)*35));
}
/* Analiza el terreno que viene mirando la FORMA del perfil, no solo los dos extremos.
   El bug (reportado en ruta el 2026-07-20, yendo en auto): se comparaba la altura de
   ahora contra la de un punto 180 m más adelante y nada de lo que había en medio. Si
   el camino bajaba y volvía a subir un poco, los extremos daban "subida" aunque lo que
   venía en realidad fuera una recta — que es justo lo que se escuchó: en plena bajada,
   aviso de subida, y adelante había plano.
   Ahora se recorre el tramo punto por punto acumulando cuánto sube y cuánto baja, y
   solo se llama subida (o bajada) cuando ese sentido DOMINA de verdad y hay desnivel
   suficiente para no ser ruido del mapa de elevación.
   Función pura para poder testearla sin salir a pedalear (tests/pendientes.test.mjs). */
function _analizarTerrenoAdelante(perfil, iNow, metros, umbral, minDesnivel){
  if(!perfil || !perfil.length || iNow<0 || iNow>=perfil.length-1) return null;
  const dNow=perfil[iNow].d, eleNow=perfil[iNow].ele;
  let subeTotal=0, bajaTotal=0, iFin=-1, eleAnt=eleNow;
  for(let i=iNow+1;i<perfil.length;i++){
    if(perfil[i].d-dNow>metros) break;
    const dif=perfil[i].ele-eleAnt;
    if(dif>0) subeTotal+=dif; else bajaTotal+=-dif;
    eleAnt=perfil[i].ele; iFin=i;
  }
  if(iFin<0) return null;
  const dSeg=perfil[iFin].d-dNow;
  if(dSeg<60) return null;                       // tramo demasiado corto para opinar
  /* Sin al menos 3 tramos no se puede saber la FORMA del terreno, solo la recta entre
     dos puntos sueltos. El perfil se muestrea con 480 puntos repartidos en toda la
     ruta: en un viaje largo (auto) eso deja un punto cada ~200 m, y opinar con eso es
     adivinar. Preferimos callar: un aviso equivocado es peor que ninguno. */
  if(iFin-iNow<3) return {dist:dSeg, tipo:'plano', neto:0, grade:0, sube:subeTotal, baja:bajaTotal, sinResolucion:true};
  const neto=perfil[iFin].ele-eleNow;
  const grade=(neto/dSeg)*100;
  const res={dist:dSeg, neto:neto, grade:grade, sube:subeTotal, baja:bajaTotal};
  // Sube y baja parecido = terreno ondulado, no una subida ni una bajada.
  const domina = Math.abs(neto)>=minDesnivel && (neto>0 ? subeTotal>=bajaTotal*2 : bajaTotal>=subeTotal*2);
  if(!domina){ res.tipo='plano'; return res; }
  if(grade>=umbral) res.tipo='subida';
  else if(grade<=-umbral) res.tipo='bajada';
  else res.tipo='plano';
  return res;
}
const PEND_MIN_DESNIVEL=6; // metros: bajo esto es ruido del mapa de elevación, no un cerro
function avisarPendienteAnticipada(lat,lon){
  if(!rutaPerfil.length || !vozActiva || vozOcupada() || vozCola.length) return;
  const ahora=Date.now();
  if(ahora-pendAntCooldown<40000) return; // no más de un aviso anticipado cada 40s
  let iNow=0, best=Infinity;
  for(let i=0;i<rutaPerfil.length;i++){ const dd=calculateDistance(lat,lon,rutaPerfil[i].lat,rutaPerfil[i].lon); if(dd<best){ best=dd; iNow=i; } }
  if(best>150) return; // lejos del perfil (fuera de ruta): no opino
  const r=_analizarTerrenoAdelante(rutaPerfil, iNow, _metrosAMirar(_velocidadEnPantalla()), _umbralPendiente(), PEND_MIN_DESNIVEL);
  if(!r || r.tipo==='plano') return;
  const key=Math.round((rutaPerfil[iNow].d+r.dist)/150);
  if(pendAntAvisadas.has(key)) return;
  pendAntAvisadas.add(key); pendAntCooldown=ahora;
  const dist=Math.round(r.dist/10)*10;
  // 2026-08-20: antes avisaba "subida"/"bajada" sin decir cuánta pendiente — y el dato
  // real (r.grade, % calculado del perfil de elevación de verdad) ya estaba disponible,
  // solo no se usaba. Fuerte = el doble o más del umbral que ya usa el modo actual para
  // considerar que ALGO es pendiente (ver _umbralPendiente): mismo criterio, no uno nuevo.
  const gradeTxt=Math.round(Math.abs(r.grade))+'%';
  const fuerte=Math.abs(r.grade)>=_umbralPendiente()*2;
  if(r.tipo==='subida') h('Ojo, se viene una subida'+(fuerte?' fuerte':'')+' al '+gradeTxt+' en los próximos '+dist+' metros. Baja un cambio y dosifica.');
  else h('Prepárate: viene una bajada'+(fuerte?' pronunciada':'')+' al '+gradeTxt+' en unos '+dist+' metros. Ojo con la velocidad y los frenos.');
}
function _distPuntoASegmento(plat,plon, alat,alon, blat,blon){
  const R=6371000, tr=Math.PI/180, cl=Math.cos(plat*tr);
  const px=plon*tr*cl*R, py=plat*tr*R, ax=alon*tr*cl*R, ay=alat*tr*R, bx=blon*tr*cl*R, by=blat*tr*R;
  const dx=bx-ax, dy=by-ay, len2=dx*dx+dy*dy;
  let t = len2>0 ? ((px-ax)*dx+(py-ay)*dy)/len2 : 0; t=Math.max(0,Math.min(1,t));
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}
function verificarDesviacion(lat,lon){
  if(navRecalculando) return;
  const pts=rutaLatLngs;
  if(!pts || pts.length<2) return;
  let minDist=Infinity;
  for(let i=0;i<pts.length-1;i++){
    const d=_distPuntoASegmento(lat,lon, pts[i][0],pts[i][1], pts[i+1][0],pts[i+1][1]);
    if(d<minDist){ minDist=d; if(minDist<45) break; } // ya estás sobre la ruta, no sigas midiendo
  }
  if(minDist>95){
    navFixesFueraDeRuta++;
    if(navFixesFueraDeRuta<4) return;
    const ahora=Date.now();
    if(ahora<navRecalcSilencioHasta) return; // en pausa: zona sin camino claro, no insistir
    if(ahora-navUltimoRecalcTime<NAV_RECALC_COOLDOWN_MS) return; // no recalcular más de 1 vez seguida
    recalcularRuta(lat,lon);
  } else {
    navFixesFueraDeRuta=0;
    navRecalcIntentos=0; // estás sobre la ruta: se resetea el contador de intentos
  }
}
async function recalcularRuta(lat,lon){
  if(navRecalculando || navDestLat==null) return;
  navRecalculando=true; navFixesFueraDeRuta=0;
  navUltimoRecalcTime=Date.now();
  navRecalcIntentos++;
  if(navRecalcIntentos<=NAV_RECALC_MAX_SEGUIDOS){
    showSpeechBubble('Recalculando ruta...');
    try{ _pisteroMood='preocupado'; }catch(e){}
    h('Te desviaste del camino, dame un segundo que te recalculo.');
  } else {
    // varios recálculos seguidos y sigues fuera de ruta: probablemente estás en un
    // camino rural que no está mapeado. Dejamos de insistir un rato en vez de repetir
    // la misma frase sin parar — se reintenta solo, más tarde, sin avisar cada vez.
    navRecalcIntentos=0;
    navRecalcSilencioHasta=Date.now()+NAV_RECALC_BACKOFF_MS;
    showSpeechBubble('Sigo tu ruta como pueda...');
    h('Por esta zona no tengo un camino claro marcado. Sigue no más, cualquier cosa te aviso.');
  }
  try{
    const url='https://router.project-osrm.org/route/v1/'+_osrmPerfil()+'/'+lon+','+lat+';'+navDestLon+','+navDestLat+'?overview=full&geometries=geojson&steps=true';
    const resp=await _fetchT(url, 15000); const data=await resp.json();
    if(data.code!=='Ok'||!data.routes||!data.routes.length){ navRecalculando=false; return; }
    const route=data.routes[0], steps=route.legs[0].steps;
    const latlngs=route.geometry.coordinates.map(function(c){return [c[1],c[0]];});
    rutaLatLngs=latlngs; _prefetchPerfilRuta();
    if(routeLine && navMap) navMap.removeLayer(routeLine);
    if(navMap) routeLine=L.polyline(latlngs,{color:'#fc4c02',weight:6,opacity:0.9,lineCap:'round',lineJoin:'round'}).addTo(navMap);
    navSteps=steps.map(function(step,index){ return {instruction:getTurnInstruction(step.maneuver.type,step.maneuver.modifier,step.name),distance:step.distance,maneuver:step.maneuver,geometry:step.geometry,index:index}; });
    currentStepIndex=0; lastSpokenStep=-1; _navDistPrev=Infinity; routeTotalDistance=route.distance/1000; routeTotalDuration=Math.round(route.duration/60);
    const arrival=new Date(Date.now()+route.duration*1000);
    document.getElementById('etaTime').innerText=arrival.getHours().toString().padStart(2,'0')+':'+arrival.getMinutes().toString().padStart(2,'0');
    document.getElementById('etaDist').innerText=routeTotalDistance.toFixed(2)+' km';
    document.getElementById('etaDuration').innerText=routeTotalDuration+' min';
    if(navSteps.length>0) showStepInstruction(0);
  }catch(e){ /* si falla, seguimos con la ruta anterior y lo reintenta el próximo desvío */ }
  navRecalculando=false;
}
function _detenerGpsLibreSiActivo(){
  // Si "GPS libre" (ig) estaba grabando cuando arranca una navegación a destino (ej.
  // le pides un lugar a Pistero mientras el GPS libre ya iba grabando), había quedado
  // un watcher de posición VIVO llamando a ug() al mismo tiempo que el watcher propio
  // de la navegación llama a _navPosUpdate() para el mismo GPS real — cada fix se
  // contaba y se anunciaba por voz DOS VECES: desplazamiento fantasma en el mapa
  // (kilometraje doblado) y frases pisándose entre sí. Se apaga ANTES de que la
  // navegación abra el suyo, igual que hace el botón "Detener GPS" manual.
  if(!ig) return;
  if(currentRoute.length>1){ autoGuardarRuta(false,false); } // no perder lo ya grabado en GPS libre
  if(lpBackgroundGeo.disponible()){ lpBackgroundGeo.stop(); } else if(gw){ navigator.geolocation.clearWatch(gw); gw=null; }
  ig=false; _detenerCronometroDash();
  _actualizarBtnGPS();
}
// ===== Mapa de navegación LIBRE, como Google Maps: mientras no lo tocas, sigue tu
// posición sola; apenas lo arrastras, se suelta del seguimiento para que explores
// a gusto; el botón 🎯 lo retoma. Antes esto se peleaba con vos: cada fix de GPS
// (cada 1-2s) forzaba panTo() encima de cualquier movimiento manual, haciendo
// imposible mirar el mapa libremente mientras ibas navegando. =====
let navAutoFollow=true;
function _navDetenerAutoFollow(){
  if(!navAutoFollow) return;
  navAutoFollow=false;
  const b=document.getElementById('btnNavRecenter'); if(b) b.style.display='flex';
}
function _navRecentrar(){
  navAutoFollow=true;
  const b=document.getElementById('btnNavRecenter'); if(b) b.style.display='none';
  if(navMap && helmetMarker){ navMap.panTo(helmetMarker.getLatLng()); }
}
// ===== Alternativas de ruta, como Google Maps: si OSRM devuelve más de un
// camino razonable, se muestran para elegir en vez de arrancar directo con el
// primero — reutiliza el modal genérico de la app (mismo que "Reportar en
// Ruta"), no hace falta UI nueva. Si solo hay un camino (lo normal en rutas
// rurales/cicloturismo), no aparece ningún selector: cero fricción extra.
// Reporte real de Inty: le pidió por voz "la ruta alternativa, no la más
// rápida" y Pistero no entendió — el selector solo se podía tocar en la
// pantalla, ningún sentido para "manos libres" (nadie va a mirar/tocar el
// teléfono manejando o pedaleando). Ahora también se anuncia por voz al
// abrirse y se puede elegir hablando. =====
let _rutaAlternativaEnEspera=null; // null, o {routes:[...]} mientras el selector espera respuesta
// Reportes de la comunidad que caen cerca del trazado de un camino candidato —
// como Waze, que avisa qué hay en la ruta ANTES de tomarla, no después de
// toparse con eso. Corredor de 150m: bastante para no perderse reportes en la
// vereda de enfrente, no tanto como para traer los de otra calle paralela.
// Se muestrea el trazado (no cada punto) porque una ruta larga puede traer
// cientos de coordenadas y esto corre por cada reporte candidato.
function _reportesCercaDe(coords, lista){
  if(!coords || !coords.length || !lista || !lista.length) return [];
  const CORREDOR_M=150, paso=Math.max(1,Math.floor(coords.length/60));
  return lista.filter(function(r){
    if(!r.lat||!r.lon) return false;
    for(let i=0;i<coords.length;i+=paso){
      if(calculateDistance(r.lat,r.lon,coords[i][1],coords[i][0])<=CORREDOR_M) return true;
    }
    return false;
  });
}
// Peligros/controles vigentes (usa el mismo filtro de vigencia que los avisos
// por voz — reportesAvisoRelevantes). La superficie del camino NO tiene
// vigencia (un tramo no "deja de ser ripio" con el tiempo, a diferencia de un
// control policial), así que se busca aparte en _superficieEnRuta().
function _reportesEnRuta(coords){
  return _reportesCercaDe(coords, reportesAvisoRelevantes);
}
// Superficie del camino reportada por la comunidad (asfalto/ripio/tierra/mixto)
// cerca del trazado — para elegir la ruta sabiendo si es asfalto o ripio ANTES
// de arrancar a pedalear, no descubriéndolo en el camino. Se usa reportesData
// completo (no reportesAvisoRelevantes, que excluye superficie por no tener
// vigencia) y se devuelve el tipo más repetido si hay varios reportes distintos
// en el mismo camino.
function _superficieEnRuta(coords){
  const reps=_reportesCercaDe(coords, (reportesData||[]).filter(function(r){ return r.cat==='superficie' && r.superficie; }));
  if(!reps.length) return null;
  const conteo={};
  reps.forEach(function(r){ conteo[r.superficie]=(conteo[r.superficie]||0)+1; });
  return Object.keys(conteo).sort(function(a,b){ return conteo[b]-conteo[a]; })[0];
}
function _elegirRutaAlternativa(routes){
  return new Promise(function(resolve){
    let html='<p style="color:#9fb3c8;font-size:0.85rem;margin-top:0">Encontré más de un camino posible, elige el que prefieras (o dime "la más rápida" / "la alternativa"):</p>';
    routes.forEach(function(r,i){
      const km=(r.distance/1000).toFixed(1), min=Math.round(r.duration/60);
      const coords=(r.geometry&&r.geometry.coordinates)||[];
      const repsRuta=_reportesEnRuta(coords);
      const avisoReportes=repsRuta.length ? ('<div style="font-size:0.72rem;color:#f59e0b;margin-top:3px">⚠️ '+repsRuta.length+' aviso'+(repsRuta.length>1?'s':'')+' de la comunidad en el camino: '+repsRuta.slice(0,3).map(function(x){ const c=REPORTE_CATS[x.cat]; return c?_repIco(c)+' '+c.l:''; }).join(', ')+'</div>') : '';
      const superficie=_superficieEnRuta(coords);
      const avisoSuperficie=superficie ? ('<div style="font-size:0.72rem;color:#8b5cf6;margin-top:3px">'+SUPERFICIE_TIPOS[superficie]+' reportado en el camino</div>') : '';
      html+='<div class="rep-cat" style="border:2px solid #2a3147;border-radius:12px;padding:14px;cursor:pointer;text-align:left;margin-bottom:10px" onclick="_elegirRutaAlternativaConfirmar('+i+')"><div style="font-weight:800;color:'+(i===0?'var(--p)':'#e2e8f0')+'">'+(i===0?'🚀 Ruta más rápida':'🔀 Ruta alternativa '+i)+'</div><div style="font-size:0.8rem;color:#9fb3c8;margin-top:4px">'+km+' km · '+min+' min <span id="rutaDesnivel'+i+'" style="color:#5c7690">· calculando desnivel...</span></div>'+avisoSuperficie+avisoReportes+'</div>';
    });
    document.getElementById('modalTitle').innerHTML='<i class="fas fa-map-location-dot"></i> Elige tu ruta';
    document.getElementById('modalContent').innerHTML=html;
    document.getElementById('userModal').classList.add('on');
    const resumenVoz=routes.map(function(r,i){ return (i===0?'la más rápida':'la alternativa'+(routes.length>2?' '+i:''))+', '+(r.distance/1000).toFixed(1)+' kilómetros'; }).join('; ');
    h('Encontré '+routes.length+' caminos: '+resumenVoz+'. Dime cuál prefieres, o tócala en la pantalla.');
    _rutaAlternativaEnEspera={routes:routes};
    window._resolverEleccionRuta=function(i){ _rutaAlternativaEnEspera=null; closeModal(); delete window._resolverEleccionRuta; resolve(i); };
    // Desnivel de cada camino ANTES de elegir (como Komoot) — no bloquea las
    // tarjetas (ya se ven con distancia/tiempo), se rellena solo cuando llega.
    // Si el usuario ya eligió y cerró el modal, el span no existe: no pasa nada.
    routes.forEach(function(r,i){
      const pts=(r.geometry&&r.geometry.coordinates||[]).map(function(c){ return {lat:c[1],lon:c[0]}; });
      calcularDesnivelDEM(pts).then(function(d){
        const el=document.getElementById('rutaDesnivel'+i); if(!el) return;
        el.style.color='#9fb3c8';
        el.innerText=d ? ('· ↗'+d.subida+'m ↘'+d.bajada+'m') : '';
      }).catch(function(){ const el=document.getElementById('rutaDesnivel'+i); if(el) el.innerText=''; });
    });
  });
}
function _elegirRutaAlternativaConfirmar(i){ if(window._resolverEleccionRuta) window._resolverEleccionRuta(i); }
// Interpreta la respuesta hablada al selector de rutas: "la más rápida"/"la
// primera" -> índice 0; "la alternativa"/"la segunda" -> índice 1; también
// entiende "opción 2"/"la 2" con el número que sea, por si hay 3+ caminos.
function _detectarEleccionRutaPorVoz(t){
  if(!_rutaAlternativaEnEspera) return null;
  const n=_rutaAlternativaEnEspera.routes.length;
  // "no la más rápida, quiero la alternativa" es una forma MUY natural de decirlo
  // (aclarar descartando la otra) — sin esto, "más rápida" matchea primero y elige
  // justo lo contrario de lo que se pidió. Una negación justo antes de una opción
  // descarta esa opción, aunque la palabra aparezca en la frase.
  const niegaRapida=/no\s+(la\s+)?(mas rapida|primera)/.test(t);
  const niegaAlternativa=/no\s+(la\s+)?(alternativa|segunda)/.test(t);
  if(!niegaRapida && /mas rapida|la primera|primera opcion|opcion (uno|1)\b/.test(t)) return 0;
  if(!niegaAlternativa && n>1 && /\balternativa\b|la segunda|segunda opcion|opcion (dos|2)\b/.test(t)) return 1;
  const m=t.match(/opcion (\d+)|\bla (\d+)\b/);
  if(m){ const idx=parseInt(m[1]||m[2],10)-1; if(idx>=0 && idx<n) return idx; }
  return null;
}
async function calculateAndStartNavigation(startLat,startLon,destLat,destLon,destName){
  trackEvent('funcion','navegacion');
  // Si ya había una navegación en curso (ej. el usuario pide por voz un destino nuevo
  // sin haber terminado el anterior), la cerramos primero para que guarde su avance
  // en vez de perderlo silenciosamente al pisar el estado con la ruta nueva.
  if(document.getElementById('nav-screen').classList.contains('active')) endNavigation();
  _detenerGpsLibreSiActivo();
  // 2026-08-23: los reportes ya no se enganchan al iniciar sesion. Aca SI hacen falta
  // aunque no hayas pasado por el mapa: _avisoSuperficieRuta() los usa para avisarte del
  // ripio ANTES de salir, no en el camino.
  _subUnaVez('reportes', subscribeToReportes);
  navGuardado=false;
  document.getElementById('nav-screen').classList.add('active');
  _actualizarBtnManosLibres();
  if(navMap) navMap.remove();
  navMap=L.map('nav-map').setView([startLat,startLon],15);
  L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(navMap);
  // Mapa libre, como Google Maps: sigue tu posición sola mientras no la toques,
  // pero apenas la arrastras/haces zoom con el dedo se suelta del seguimiento
  // automático para que puedas mirar lo que quieras — el botón 🎯 la retoma.
  navAutoFollow=true;
  const _btnNavRecenter=document.getElementById('btnNavRecenter'); if(_btnNavRecenter) _btnNavRecenter.style.display='none';
  navMap.on('dragstart', _navDetenerAutoFollow);
  showHostelsOnNavMap(); subscribeToUsersOnNavMap();
  document.getElementById('navText').innerText="Calculando ruta..."; document.getElementById('navDist').innerText="";
  nextHydrateKm=5; nextEatKm=20;
  // Reinicia el reloj de "parado" al arrancar una navegación nueva: si no, como estás
  // quieto un instante antes de empezar a pedalear, podía disparar el aviso de "revisa
  // la bici" justo al arrancar la ruta con solo con que hubieran pasado 20 min desde la
  // última vez (en cualquier contexto anterior, no relacionado a este viaje).
  lastFraseParadoTime=Date.now();
  navDestLat=destLat; navDestLon=destLon; navDestName=destName; navRecalculando=false; navFixesFueraDeRuta=0;
  navRecalcIntentos=0; navUltimoRecalcTime=0; navRecalcSilencioHasta=0;
  puntosAvisados=new Set(); reportesAvisados=new Set();
  _avisoLluviaHecho=false; _ultimoChequeoLluvia=0; _fatigaBuffer=[]; _avisoFatigaHecho=false; _velPromInicioFatiga=null;
  navPosHistory=[]; viajePausedMs=0; viajePausedDesde=null; viajePausaManual=false; vueltasRegistradas=[]; _gpsBadgeToggle('navPausaBadge', false); kmUltimoRitmoComentado=0;
  (function(){ const b=document.getElementById('btnPausaViaje'); if(b){ b.innerHTML='<i class="fas fa-pause"></i> Pausar'; b.style.background='linear-gradient(135deg,#f59e0b,#d97706)'; } })();
  navPendienteHistory=[]; zonaPendienteActual='plano'; tFraseSubida=0; tFraseBajada=0;
  iniciarDeteccionCaidas();
  iniciarSeguimientoSegmentos(startLat,startLon);
  try{
    const url='https://router.project-osrm.org/route/v1/'+_osrmPerfil()+'/'+startLon+','+startLat+';'+destLon+','+destLat+'?overview=full&geometries=geojson&steps=true&alternatives=true';
    const resp=await _fetchT(url, 15000); const data=await resp.json();
    if(data.code!=='Ok'||!data.routes||!data.routes.length){ lpAviso("No pude calcular la ruta"); endNavigation(); return; }
    // Si hay más de un camino razonable, se elige antes de arrancar (como Google
    // Maps); con uno solo (lo normal en rutas rurales) sigue igual que siempre.
    let _rutaIdx=0;
    if(data.routes.length>1){
      document.getElementById('navText').innerText="Elige tu ruta...";
      _rutaIdx=await _elegirRutaAlternativa(data.routes);
    }
    const route=data.routes[_rutaIdx], steps=route.legs[0].steps;
    const latlngs=route.geometry.coordinates.map(function(c){return [c[1],c[0]];});
    rutaLatLngs=latlngs; _prefetchPerfilRuta();
    if(routeLine) navMap.removeLayer(routeLine);
    routeLine=L.polyline(latlngs,{color:'#fc4c02',weight:6,opacity:0.9,lineCap:'round',lineJoin:'round'}).addTo(navMap);
    navMap.fitBounds(routeLine.getBounds(),{padding:[80,80]});
    navSteps=steps.map(function(step,index){ return {instruction:getTurnInstruction(step.maneuver.type,step.maneuver.modifier,step.name),distance:step.distance,maneuver:step.maneuver,geometry:step.geometry,index:index}; });
    currentStepIndex=0; lastSpokenStep=-1; _navDistPrev=Infinity; routeTotalDistance=route.distance/1000; routeTotalDuration=Math.round(route.duration/60);
    const arrival=new Date(Date.now()+route.duration*1000);
    document.getElementById('etaTime').innerText=arrival.getHours().toString().padStart(2,'0')+':'+arrival.getMinutes().toString().padStart(2,'0');
    document.getElementById('etaDist').innerText=routeTotalDistance.toFixed(2)+' km';
    document.getElementById('etaDuration').innerText=routeTotalDuration+' min';
    if(helmetMarker) navMap.removeLayer(helmetMarker);
    helmetMarker=L.marker([startLat,startLon],{icon:L.divIcon({className:'',html:riderMarkerHTML(selectedHelmet,skinColor(selectedSkin),true),iconSize:[50,34],iconAnchor:[25,17]})}).addTo(navMap);
    tripStartTime=Date.now(); gpsPoints=[{lat:startLat,lon:startLon,timestamp:Date.now()}]; lastGpsPoint={lat:startLat,lon:startLon,t:Date.now()}; totalDistance=0;
    _logrosDelViaje=[]; _kmEsteViaje=0; // arranca el conteo del resumen de este viaje (navegación a destino)
    if(gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
    if(lpBackgroundGeo.disponible()) lpBackgroundGeo.stop();
    lpWakeLock.enable();
    if(lpBackgroundGeo.disponible()){
      // Nativo: el GPS sigue guiando la navegación aunque la pantalla esté apagada.
      lpBackgroundGeo.start(_navBgCallback);
    } else {
      gpsWatchId=navigator.geolocation.watchPosition(_navGeoCallback,function(err){ console.error("GPS:",err); },gpsAhorro?{enableHighAccuracy:false,maximumAge:8000,timeout:15000}:{enableHighAccuracy:true,maximumAge:1000,timeout:10000});
    }
    if(navSteps.length>0) showStepInstruction(0);
    showSpeechBubble("En ruta a "+destName.split(',')[0]);
    h("Vamos a "+destName.split(',')[0]+". Yo te voy guiando, tú disfruta el camino.");
    anunciarClimaRuta(destLat,destLon,'Clima en tu destino'); // antes de salir a pedalear
  }catch(err){ console.error(err); lpAviso(((err&&err.name==='AbortError')||!navigator.onLine) ? 'No pude calcular la ruta: parece que estás sin señal. Prueba de nuevo cuando tengas internet.' : 'No pude calcular la ruta ahora. Inténtalo otra vez.'); endNavigation(); }
}
/* MODO EQUIVOCADO — reporte real de Inty (2026-07-14): iba en AUTO a 82 km/h pero la app estaba
   en modo BICI, así que Pistero le hablaba de pedalear y de tomar agua. Los umbrales por modo ya
   existían y estaban bien; el problema era que nadie le avisaba a la app que había cambiado de
   vehículo. 82 km/h sostenidos NO son pedaleando: la app tiene que darse cuenta sola.
   Se cambia UNA vez por sesión y se avisa siempre, con cómo revertirlo. */
let _velAltaDesde=0, _autoModoHecho=false;
function _detectarModoEquivocado(sp){
  const m=(typeof actividadTipo!=='undefined')?actividadTipo:'ciclismo';
  if(m==='moto' || _autoModoHecho){ return; }
  if(!sp){ _velAltaDesde=0; return; }
  const techo=(m==='trekking')?18:50; // a pie >18 km/h, o en bici >50 km/h, sostenidos = vas en vehículo
  if(sp>techo){
    if(!_velAltaDesde){ _velAltaDesde=Date.now(); return; }
    if(Date.now()-_velAltaDesde>60000){ // un minuto entero, para no confundir una bajada rápida
      _autoModoHecho=true;
      try{ elegirActividad('moto', true); }catch(e){}
      h('Oye, llevas un rato a '+Math.round(sp)+' por hora. Eso no es pedaleando, así que me cambié a modo vehículo para no hablarte tonteras de bici. Si me equivoqué, cámbialo en tu perfil.');
    }
  } else { _velAltaDesde=0; }
}
// Reporte real de Inty (2026-07-14): "voy en auto y recomienda agua". En modo vehículo no
// corresponde — nadie necesita hidratarse cada 5 km ni comer una barra por ir manejando.
function checkFuel(distKm){
  if(typeof actividadTipo!=='undefined' && actividadTipo==='moto') return;
  if(distKm>=nextHydrateKm){ h("Llevas "+Math.round(distKm)+" kilómetros. Toma un par de tragos de agua para no deshidratarte."); nextHydrateKm+=5; }
  if(distKm>=nextEatKm){ h("Vas en "+Math.round(distKm)+" kilómetros. Come algo ligero, una fruta o una barra, para recargar energía."); nextEatKm+=20; }
}
/* ===== RITMO vs TU PROMEDIO HISTÓRICO ===== */
// us.sumVelDist guarda la suma de (velocidad media de cada viaje * sus km); dividido
// por us.di (km totales de siempre) da el promedio histórico ponderado por distancia
// — un viaje de 40km pesa más en el promedio que uno de 2km, que es lo justo.
function _actualizarVelocidadHistorica(distanciaKm, duracionActivaMs){
  if(!distanciaKm || distanciaKm<0.3 || !duracionActivaMs || duracionActivaMs<60000) return; // muy corto para ser representativo
  const velEsteViaje=distanciaKm/(duracionActivaMs/3600000);
  if(!isFinite(velEsteViaje) || velEsteViaje<=0 || velEsteViaje>80) return; // descarta outliers imposibles
  us.sumVelDist=(us.sumVelDist||0)+velEsteViaje*distanciaKm;
  gd();
}
let kmUltimoRitmoComentado=0;
function compararRitmoHistorico(distanciaKm, duracionActivaMs){
  if(!vozActiva || vozOcupada() || vozCola.length) return;
  const kmHistoricos=us.sumVelDist?us.di:0;
  if(!kmHistoricos || kmHistoricos<10) return; // recién empezando, sin promedio propio confiable todavía
  if(!distanciaKm || distanciaKm<2 || duracionActivaMs<180000) return; // deja pasar el arranque del viaje
  if(distanciaKm-kmUltimoRitmoComentado<3) return; // un aviso cada 3km, no más seguido
  const velHistorica=us.sumVelDist/us.di;
  if(velHistorica<3) return;
  const velActual=distanciaKm/(duracionActivaMs/3600000);
  const diffPct=(velActual-velHistorica)/velHistorica;
  kmUltimoRitmoComentado=distanciaKm;
  if(diffPct>0.15) h('Vas más rápido que tu promedio de siempre, ¡buen ritmo!');
  else if(diffPct<-0.15) h('Vas más lento que tu ritmo habitual. Tranquilo, disfruta el camino.');
}
let _unsubUsersOnNavMap=null;
let _navMapUsersActive=false;
function subscribeToUsersOnNavMap(){
  navUserMarkers.forEach(function(m){ if(navMap) navMap.removeLayer(m); }); navUserMarkers=[];
  // 2026-08-20: antes esto abría una SEGUNDA suscripción a Firestore, idéntica a la del
  // mapa principal (subscribeToUsers) — cada actualización de posición se leía dos veces,
  // doblando el consumo de cuota (170K lecturas vs 2,9K escrituras el día que se cayó la
  // app). Ahora comparte la ÚNICA suscripción del mapa principal: solo activa el flag de
  // render y pinta de inmediato con el último snapshot ya en memoria (_lastUsersSnapshotDocs),
  // sin esperar el próximo cambio ni abrir una lectura nueva.
  _navMapUsersActive=true;
  if(!ulp) subscribeToUsers();
  _renderNavMapUsers(_lastUsersSnapshotDocs||[]);
}
function getTurnInstruction(type,modifier,street){ const s=street?' por '+street:''; switch(type){ case 'depart':return 'Comienza el recorrido'+s; case 'arrive':return 'Has llegado a tu destino'; case 'turn':
  // 2026-08-20: OSRM manda modifier="sharp left"/"sharp right" (dato real del motor de
  // rutas, no inventado) — pero como "left"/"right" se revisaban ANTES que "sharp", una
  // curva cerrada SIEMPRE calzaba primero con el genérico "left"/"right" (porque "sharp
  // left" contiene "left") y el aviso de curva cerrada nunca se alcanzaba a decir. Dead
  // code real. Ahora "sharp" se revisa primero.
  if(modifier&&modifier.indexOf('sharp')!==-1){ if(modifier.indexOf('left')!==-1) return 'Curva cerrada a la izquierda'+s; if(modifier.indexOf('right')!==-1) return 'Curva cerrada a la derecha'+s; return 'Curva cerrada'+s; }
  if(modifier&&modifier.indexOf('left')!==-1) return 'Gira a la izquierda'+s; if(modifier&&modifier.indexOf('right')!==-1) return 'Gira a la derecha'+s; return 'Gira'+s; case 'roundabout': case 'rotary': return 'Toma la rotonda'+s; case 'merge': return 'Incorpórate'+s; case 'fork': if(modifier&&modifier.indexOf('left')!==-1) return 'En la bifurcación, mantente a la izquierda'+s; if(modifier&&modifier.indexOf('right')!==-1) return 'En la bifurcación, mantente a la derecha'+s; return 'Toma la bifurcación'+s; case 'end of road': return 'Al final del camino'+s; case 'continue': return 'Sigue recto'+s; case 'new name': return 'Continúa'+s; default: return 'Continúa'+s; } }
// 2026-07-14: bug real reportado por Inty — los avisos de giro llegaban tarde
// (a veces prácticamente al llegar al giro, no antes). Causa: esta función
// medía la distancia al FINAL de la geometría del paso ACTUAL — que en
// realidad es el INICIO del paso SIGUIENTE, o sea el punto del PRÓXIMO giro —
// pero anunciaba la instrucción del paso actual (la de un giro que, si existía,
// ya había pasado). El aviso correcto solo salía en la rama de abajo, cuando ya
// se estaba a menos de 20m del giro, y encima con un setTimeout de 2s extra —
// para cuando se alcanzaba a decir, muchas veces el ciclista ya había pasado el
// punto. Fix: usar maneuver.location directo (OSRM ya lo entrega, no hay que
// derivarlo de la geometría) — así la distancia medida y la instrucción
// anunciada corresponden SIEMPRE al mismo punto, con aviso anticipado real.
let _navDistPrev = Infinity; // distancia al giro en la muestra anterior (para detectar que ya se pasó)
function checkNavigationSteps(lat,lon,speed){
  if(currentStepIndex>=navSteps.length) return;
  const step=navSteps[currentStepIndex];
  const ml=step.maneuver&&step.maneuver.location;
  if(!ml) return;
  const loc={lat:ml[1],lon:ml[0]};
  const dist=calculateDistance(lat,lon,loc.lat,loc.lon);
  let rem=0; for(let i=currentStepIndex;i<navSteps.length;i++) rem+=navSteps[i].distance;
  document.getElementById('navDist').innerText=formatDistance(rem);
  document.getElementById('etaDist').innerText=(rem/1000).toFixed(2)+' km';
  // Aviso ANTICIPADO real: a 120m del giro (no del final del tramo actual),
  // con margen de sobra para que llegue a tiempo aunque la voz esté ocupada
  // con otra cosa (showStepInstruction interrumpe, no encola). El paso
  // "arrive" no usa este aviso temprano — diría "llegaste" 120m antes de
  // llegar; la llegada real la celebra showArrival() más abajo.
  // BUG REAL (reportado por Inty en ruta, 2026-07-14): los umbrales eran FIJOS (aviso 120m,
  // avance 15m) y eso solo funciona en bici. A 82 km/h vas a 23 m/s y el GPS entrega una
  // posición por segundo → te mueves ~23m entre muestras y SALTAS ENTERO el radio de 15m sin
  // que ninguna caiga adentro → currentStepIndex nunca avanza → NUNCA avisa un giro (se quedaba
  // pegado en "Comienza el recorrido"). Y 120m a esa velocidad son 5 segundos: tarde igual.
  // Fix: umbrales por TIEMPO, escalados con la velocidad real, + detectar que ya se pasó el giro.
  const vms = Math.max(2, (speed||0)/3.6);        // m/s (mínimo 2 para no encogerlo detenido)
  const avisoM = Math.max(80, vms*15);            // ~15 s de anticipación: bici ~80m, auto ~340m
  const pasoM  = Math.max(18, vms*2.5);           // radio de paso, escalado a la velocidad
  if(dist<avisoM && lastSpokenStep!==currentStepIndex && step.maneuver.type!=='arrive'){
    showStepInstruction(currentStepIndex); lastSpokenStep=currentStepIndex;
  }
  // Avanza si entró al radio O si ya lo dejó atrás (la distancia venía bajando y empezó a subir).
  // Esa segunda condición es la que salva a cualquier velocidad, sin depender del radio.
  const yaPaso = (_navDistPrev < avisoM && dist > _navDistPrev + 5);
  if(dist < pasoM || yaPaso){
    _navDistPrev = Infinity;
    currentStepIndex++;
    if(currentStepIndex>=navSteps.length) showArrival();
  } else {
    _navDistPrev = dist;
  }
}
function showStepInstruction(i){ if(i>=navSteps.length) return; const step=navSteps[i]; document.getElementById('navIcon').innerText=getStepIcon(step.maneuver.type,step.maneuver.modifier); document.getElementById('navText').innerText=step.instruction; document.getElementById('navDist').innerText=formatDistance(step.distance); showAlert(step.instruction); hCorta(step.instruction); lastSpokenStep=i; /* marca el paso como YA dicho: evita que checkNavigationSteps repita el arranque ("Comienza el recorrido") por estar parado en el origen — redundancia real reportada por Inty */ }
function getStepIcon(type,modifier){ switch(type){ case 'depart':return '🚴'; case 'arrive':return '🏁'; case 'turn': if(modifier&&modifier.indexOf('left')!==-1) return '⬅️'; if(modifier&&modifier.indexOf('right')!==-1) return '➡️'; return '🔄'; case 'roundabout': case 'rotary': return '🔁'; case 'fork': return '🔱'; case 'continue': return '⬆️'; default: return '➡️'; } }
function showAlert(text){ const a=document.getElementById('navAlert'); a.innerText=text; a.classList.add('show'); setTimeout(function(){ a.classList.remove('show'); },3000); }
function showArrival(){ document.getElementById('navIcon').innerText='🏁'; document.getElementById('navText').innerText='¡Llegaste!'; document.getElementById('navDist').innerText='0 m'; showAlert('¡Llegaste!'); try{ _pisteroMood='contento'; }catch(e){} h('¡Llegamos! Lo lograste. Que descanses esas piernas.'); if(currentTrip) finishTripAuto(); else guardarRutaNavegada();
  // El resumen de viaje va SOLO acá (llegada real) -- endNavigation() también se
  // llama al cancelar con la X o si falla el cálculo de ruta, y ahí no hay nada
  // que festejar.
  setTimeout(function(){ endNavigation(); try{ if(_logrosListo) _chequearLogros(false); }catch(e){} try{ _mostrarResumenViaje(); }catch(e){} }, 2500);
}
async function guardarRutaNavegada(){
  if(!cu||gpsPoints.length<2) return;
  navGuardado=true;
  _actualizarVelocidadHistorica(totalDistance, tiempoActivoMs());
  const pts=gpsPoints.map(function(p){return {lat:p.lat,lon:p.lon,t:p.timestamp,alt:(p.alt!=null?p.alt:null)};});
  const localId='n'+pts[0].t;
  // Origen: nunca tiene nombre propio (solo coordenadas del primer fix), así que se
  // geocodifica igual que en el guardado de GPS libre. Destino: ya tenemos el nombre
  // real (navDestName, el lugar que se buscó/marcó al iniciar la navegación) — no
  // hace falta adivinarlo con el último punto del GPS.
  const origenNombre=await nombreDeLugar(pts[0].lat,pts[0].lon);
  const destinoNombre=navDestName?navDestName.split(',')[0].trim():await nombreDeLugar(pts[pts.length-1].lat,pts[pts.length-1].lon);
  const nombreRuta=origenNombre+' → '+destinoNombre;
  const data={localId:localId,user:cu,nombre:nombreUsuario,nombreRuta:nombreRuta,points:pts,startTime:pts[0].t,endTime:pts[pts.length-1].t,distance:totalDistance,calories:Math.round(totalDistance*30),savedAt:Date.now()};
  guardarRutaLocalObj(data); renderRutas();
  _subirRutaNube(localId,{user:cu,nombre:nombreUsuario,nombreRuta:nombreRuta,points:pts,startTime:data.startTime,endTime:data.endTime,distance:totalDistance,calories:data.calories,savedAt:firebase.firestore.FieldValue.serverTimestamp()});
  revisarRetosCumplidos();
  return data;
}
// ===== Persistencia de la navegación activa: sobrevive un apagón de pantalla.
// Reporte real de Inty: se apagó la pantalla, se encendió, y la ruta ya no
// estaba — tocó volver a ponerla a mano para seguir el viaje. Causa: Chrome
// (y otros navegadores móviles) pueden "descartar" una pestaña en segundo
// plano con la pantalla apagada para liberar memoria, borrando TODO el estado
// que vivía solo en variables de JavaScript (destino, ruta, progreso) — el
// WakeLock evita que la pantalla se apague sola, pero no evita que el usuario
// la apague a mano con el botón físico, y ahí no hay wake lock que valga.
// La solución no es evitar el descarte (no se puede, es el navegador quien
// decide), sino guardar lo esencial para reconstruir el viaje al volver.
const NAV_RESUME_KEY='lp_nav_activa';
function _guardarEstadoNavParaReanudar(){
  if(!navDestLat || !navDestLon) return;
  try{
    localStorage.setItem(NAV_RESUME_KEY, JSON.stringify({
      destLat:navDestLat, destLon:navDestLon, destName:navDestName,
      tripId:(currentTrip&&currentTrip.id)||null,
      totalDistance:totalDistance, tripStartTime:tripStartTime,
      // tope de puntos: en un viaje larguísimo no tiene sentido guardar cada
      // punto para "reanudar" (el track completo ya se sube aparte al terminar);
      // con los últimos ~2000 alcanza de sobra para no perder continuidad.
      gpsPoints:gpsPoints.slice(-2000),
      guardadoEn:Date.now()
    }));
  }catch(e){} // localStorage lleno o modo privado: no hay resumen, pero tampoco debe cortar la navegación
}
function _limpiarEstadoNavGuardado(){ try{ localStorage.removeItem(NAV_RESUME_KEY); }catch(e){} }
// Se llama una vez al arrancar la app (tras loguear): si había un viaje a medio
// camino cuando la pestaña se perdió, lo retoma solo, sin preguntar — preguntar
// obligaría a tocar la pantalla justo en el escenario (manejando/pedaleando)
// que motivó todo esto.
async function _intentarReanudarNavegacion(){
  let data; try{ data=JSON.parse(localStorage.getItem(NAV_RESUME_KEY)); }catch(e){ data=null; }
  if(!data || !data.destLat || !data.destLon) return;
  // Vencido (más de 3 horas desde el último guardado): lo más probable es que el
  // viaje haya terminado de otra forma (cerraste la app del todo) y esto quedó
  // pegado — mejor no reaparecer solo con una ruta vieja y quizás ya irrelevante.
  if(!data.guardadoEn || (Date.now()-data.guardadoEn)>3*3600000){ _limpiarEstadoNavGuardado(); return; }
  _limpiarEstadoNavGuardado(); // se vuelve a guardar solo apenas la navegación reanudada avance
  await getCurrentLocation(); // 2026-08-20: siempre fresco, ver navegarAPuntoMapaElegido
  if(!currentUserLocation) return; // sin GPS no hay cómo recalcular la ruta
  await calculateAndStartNavigation(currentUserLocation.lat, currentUserLocation.lon, data.destLat, data.destLon, data.destName);
  // calculateAndStartNavigation arranca el progreso en cero, como cualquier viaje
  // nuevo — sin esto, "reanudar" te dejaría con el odómetro reiniciado y el
  // tramo ya recorrido antes del apagón, perdido.
  if(data.gpsPoints && data.gpsPoints.length){ gpsPoints=data.gpsPoints; lastGpsPoint=gpsPoints[gpsPoints.length-1]; }
  if(data.totalDistance) totalDistance=data.totalDistance;
  if(data.tripStartTime) tripStartTime=data.tripStartTime;
  if(data.tripId) currentTrip={id:data.tripId};
  document.getElementById('navDistTotal').innerText=totalDistance.toFixed(2);
  h('Recuperé tu viaje a '+(data.destName?data.destName.split(',')[0].trim():'tu destino')+', seguimos.');
}
function finishTripAuto(){ navGuardado=true; _actualizarVelocidadHistorica(totalDistance, tiempoActivoMs()); const el=Math.floor(tiempoActivoMs()/1000), mins=Math.floor(el/60), hh=Math.floor(mins/60), mm=mins%60; const dur=hh>0?hh+'h '+mm+'min':mm+' min'; db.collection('trips').doc(currentTrip.id).update({status:'completed',completedAt:firebase.firestore.FieldValue.serverTimestamp(),gpsData:{points:gpsPoints,distance:totalDistance,duration:dur,calories:Math.round(totalDistance*30),pointCount:gpsPoints.length}}).then(function(){ }).catch(function(){ }); }
function formatDistance(m){ if(m<1000) return Math.round(m)+' m'; return (m/1000).toFixed(1)+' km'; }
function showHostelsOnNavMap(){ allHostels.forEach(function(hh){ if(hh.lat&&hh.lon){ L.marker([hh.lat,hh.lon],{icon:L.divIcon({className:'',html:'<div style="background:#ffd700;width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #ffd700"></div>',iconSize:[26,26],iconAnchor:[13,13]})}).addTo(navMap).bindPopup('<b>'+escapeHTML(hh.name)+'</b><br>'+escapeHTML(hh.location)); } }); }
function drawGpsRoute(){ if(gpsPoints.length<2) return; if(routeLine) navMap.removeLayer(routeLine); routeLine=L.polyline(gpsPoints.map(function(p){return [p.lat,p.lon];}),{color:'#fc4c02',weight:5,opacity:0.8}).addTo(navMap); if(gpsPoints.length>10) navMap.fitBounds(routeLine.getBounds(),{padding:[50,50]}); }
function showSpeechBubble(text){ const b=document.getElementById('speechBubble'); if(!b) return; b.innerText=text; b.classList.add('show'); setTimeout(function(){ b.classList.remove('show'); },4000); }
async function finishTrip(){ if(!currentTrip&&gpsPoints.length===0){ endNavigation(); return; } if(await lpConfirmar("¿Terminar y guardar el viaje?")){ if(gpsWatchId){ navigator.geolocation.clearWatch(gpsWatchId); gpsWatchId=null; } navGuardado=true; const el=Math.floor((Date.now()-tripStartTime)/1000), mins=Math.floor(el/60), hh=Math.floor(mins/60), mm=mins%60; const dur=hh>0?hh+'h '+mm+'min':mm+' min'; if(currentTrip){ try{ await db.collection('trips').doc(currentTrip.id).update({status:'completed',completedAt:firebase.firestore.FieldValue.serverTimestamp(),gpsData:{points:gpsPoints,distance:totalDistance,duration:dur,calories:Math.round(totalDistance*30),pointCount:gpsPoints.length}}); }catch(e){ } } else { guardarRutaNavegada(); } setTimeout(endNavigation,2500); } }
// Si el usuario cierra con "✕" sin haber pasado por "Terminar" ni por la llegada
// automática, igual guardamos lo recorrido hasta ahí (nunca se pierde el track).
function endNavigation(){
  // Corta a Pistero YA: sin esto, si estaba hablando o tenía frases en cola cuando
  // cerraste la navegación, seguía sonando (o la cola se seguía vaciando) de un viaje
  // que ya terminó — instrucciones de giro sonando segundos después de cerrar el mapa.
  pararVoz();
  _limpiarEstadoNavGuardado(); // el viaje terminó de forma normal: no hay nada que reanudar después
  if(!navGuardado && gpsPoints.length>=2){
    if(currentTrip){
      _actualizarVelocidadHistorica(totalDistance, tiempoActivoMs());
      const el=Math.floor(tiempoActivoMs()/1000), mins=Math.floor(el/60), hh=Math.floor(mins/60), mm=mins%60, dur=hh>0?hh+'h '+mm+'min':mm+' min';
      db.collection('trips').doc(currentTrip.id).update({status:'completed',completedAt:firebase.firestore.FieldValue.serverTimestamp(),gpsData:{points:gpsPoints,distance:totalDistance,duration:dur,calories:Math.round(totalDistance*30),pointCount:gpsPoints.length}}).catch(function(){});
    } else {
      guardarRutaNavegada();
    }
  }
  navGuardado=false;
  // Red de seguridad final: asegura que el km de este viaje quede en la nube al
  // cerrar, sin depender del sync periódico de 60s (un viaje corto podría cerrar
  // antes de que ese primer sync se dispare).
  if(typeof sincronizarStats==='function') sincronizarStats();
  _lpWLoff(); detenerDeteccionCaidas();
  if(liveTrackActivo){ liveTrackActivo=false; _actualizarBtnSeguimientoVivo(); if(liveTrackId) db.collection('liveTracking').doc(liveTrackId).update({activo:false}).catch(function(){}); }
  if(gpsWatchId){ navigator.geolocation.clearWatch(gpsWatchId); gpsWatchId=null; } if(lpBackgroundGeo.disponible()) lpBackgroundGeo.stop(); _navMapUsersActive=false; navUserMarkers.forEach(function(m){ if(navMap) navMap.removeLayer(m); }); navUserMarkers=[]; document.getElementById('nav-screen').classList.remove('active'); currentTrip=null; helmetMarker=null; routeLine=null; navSteps=[]; rutaLatLngs=[]; rutaPerfil=[]; currentStepIndex=0; lastSpokenStep=-1; gpsPoints=[]; lastGpsPoint=null; navPosHistory=[]; viajePausedMs=0; viajePausedDesde=null; viajePausaManual=false; _gpsBadgeToggle('navPausaBadge', false); loadTrips();
}
// Historial de vistas para el botón "← Atrás" del header: cv() apila la vista que
// dejas atrás (salvo cuando el que llama es volverAtras()); "Inicio" siempre limpia
// el historial (es un punto de reinicio, no tiene sentido "volver" desde ahí a algo
// de una sesión de navegación anterior).
let _viewHistory=[], _viewActual='dash';
function _actualizarBtnAtras(){ const b=document.getElementById('btnAtras'); if(b) b.style.display=_viewHistory.length?'inline-flex':'none'; }
/* El botón atrás DE LA PANTALLA debe consumir una entrada del historial del navegador,
   igual que lo haría el botón físico.
   Auditoría del 2026-07-20: antes hacía `_viewHistory.pop()` sin tocar el historial, así
   que cada uso dejaba una **entrada fantasma**. Caso cotidiano: Inicio → Mapa (se apila)
   → Inicio desde la barra (se limpia `_viewHistory`, la pila del navegador NO). Ahí el
   primer toque al botón físico parecía **no hacer nada**, y el segundo **cerraba la app**
   — justo lo que v7.06 vino a arreglar.
   `_volviendoDesdeBoton` evita que el `popstate` resultante haga un segundo retroceso. */
let _volviendoDesdeBoton=false;
function volverAtras(){
  if(_viewHistory.length && history.state && history.state.lpView){
    _volviendoDesdeBoton=true;
    history.back(); // el popstate hace el trabajo; así pila y _viewHistory quedan parejas
    setTimeout(function(){ _volviendoDesdeBoton=false; }, 400);
    return;
  }
  _volverAtrasAhora();
}
function _volverAtrasAhora(){ const prev=_viewHistory.pop(); if(prev){ cv(prev, true); if(prev==='dash') abrirEsfera(); } else { cv('dash'); abrirEsfera(); } }
/* ===== BOTÓN ATRÁS DEL TELÉFONO =====
   Reportado por Inty (2026-07-20): apretar "atrás" en Android SALÍA de la app en vez de
   volver a la pantalla anterior, y al reabrirla la app arrancaba de cero — perdiendo lo
   que estuvieras haciendo.
   Causa: la app cambia de pantalla mostrando y ocultando divs (.view), sin tocar el
   historial del navegador. Para Android no había "nada atrás", así que hacía lo suyo por
   defecto: cerrar. El historial interno (_viewHistory) ya existía y el botón de la
   pantalla ya funcionaba; lo que faltaba era conectarlos.
   La solución no necesita plugins: en el WebView de Capacitor el botón atrás recorre el
   historial del navegador y solo sale cuando ya no queda nada. Dándole entradas reales,
   se comporta como cualquiera espera. Sirve igual en la web instalada como PWA. */
function _cerrarCapaAbierta(){
  // El aviso de caída NUNCA se cierra con el botón atrás: es una alerta de seguridad y
  // se sale de ella tocando "Estoy bien" a propósito.
  if(document.getElementById('crashAlertOverlay')) return false;
  const tut=document.getElementById('tutorialOverlay');
  if(tut && tut.classList.contains('on')){ if(typeof cerrarTutorial==='function') cerrarTutorial(); else tut.classList.remove('on'); return true; }
  const abiertas=document.querySelectorAll('.modal.on, #userModal.on');
  if(abiertas.length){ abiertas[abiertas.length-1].classList.remove('on'); return true; }
  return false;
}
function _registrarPasoEnHistorial(id){
  try{ history.pushState({lpView:id}, ''); }catch(e){}
}
window.addEventListener('popstate', function(){
  /* 1) ALERTA DE CAÍDA: se traga el botón atrás y no pasa NADA más.
     Auditoría del 2026-07-20: antes `_cerrarCapaAbierta()` devolvía `false` acá, y eso NO
     protegía nada — caía a los casos siguientes. Con la cuenta regresiva de 30 s corriendo,
     apretar atrás podía **cerrar la app**, matando el temporizador, la alarma sonora y el
     SOS pendiente. Un ciclista aturdido cancelaba su propio auxilio sin querer.
     Ahora se repone la entrada del historial y se corta acá: de esa pantalla se sale
     tocando "Estoy bien", a propósito. */
  if(document.getElementById('crashAlertOverlay')){ _registrarPasoEnHistorial(_viewActual); return; }
  /* 1b) NAVEGACIÓN EN CURSO: tampoco se sale con el botón atrás.
     Es una pantalla a completo con el viaje grabándose; perderla de un botonazo era
     justo la queja que originó v7.06. Se corta acá y se avisa cómo salir de verdad. */
  const nav=document.getElementById('nav-screen');
  if(nav && nav.classList.contains('active')){
    _registrarPasoEnHistorial(_viewActual);
    try{ h('Vas navegando. Para terminar el viaje usa el botón Terminar, así no se pierde tu ruta.'); }catch(e){}
    return;
  }
  // 2) Si hay algo encima (modal, tutorial), el atrás cierra eso primero.
  if(_cerrarCapaAbierta()){ _registrarPasoEnHistorial(_viewActual); return; }
  // 3) Si hay pantallas atrás dentro de la app, se vuelve a la anterior.
  if(_viewHistory.length){ _volverAtrasAhora(); return; }
  // 4) Si ya estás en el inicio, no se hace nada: ahí sí corresponde que Android cierre.
});
/* ===== ANALYTICS: qué usa el usuario y dónde pasa tiempo. Buffer en memoria +
   escritura ATÓMICA (FieldValue.increment) con throttle — NO escribe en cada toque
   (eficiente y sin carreras de datos). El panel de admin agrega estos docs. Para lo
   profundo (retención/embudos) se recomienda Firebase Analytics aparte. ===== */
let _evBuf={}, _evFlushT=null, _secDesde=0, _secActual=null;
function _sanKey(s){ return String(s||'x').toLowerCase().replace(/[^a-z0-9_]/g,'_').slice(0,40)||'x'; }
function trackEvent(grupo, clave, cuanto){
  if(typeof cu==='undefined' || !cu) return;
  const k=_sanKey(grupo)+'|'+_sanKey(clave);
  _evBuf[k]=(_evBuf[k]||0)+(cuanto||1);
  if(!_evFlushT) _evFlushT=setTimeout(_flushAnalytics, 25000);
}
function _trackPantalla(id){
  const ahora=Date.now();
  if(_secActual && _secDesde){ const seg=(ahora-_secDesde)/1000; if(seg>1 && seg<7200) trackEvent('tiempo', _secActual, Math.round(seg)); }
  _secActual=id; _secDesde=ahora;
  trackEvent('pantalla', id);
}
function _flushAnalytics(){
  _evFlushT=null;
  const keys=Object.keys(_evBuf); if(!keys.length || typeof cu==='undefined' || !cu) return;
  const F=firebase.firestore.FieldValue;
  const upd={ ultimoUso:F.serverTimestamp(), nombre:(typeof nombreUsuario!=='undefined'?nombreUsuario:'')||'', kmTotal:Math.round((us&&us.di)||0) };
  keys.forEach(function(k){ const p=k.split('|'); if(!upd[p[0]]) upd[p[0]]={}; upd[p[0]][p[1]]=F.increment(_evBuf[k]); });
  _evBuf={};
  try{ db.collection('usage').doc(cu).set(upd,{merge:true}); }catch(e){}
}
document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden'){ if(_secActual&&_secDesde){ const seg=(Date.now()-_secDesde)/1000; if(seg>1&&seg<7200) trackEvent('tiempo',_secActual,Math.round(seg)); _secDesde=Date.now(); } _flushAnalytics(); } });
window.addEventListener('pagehide', _flushAnalytics);
function cv(id, _esVolver){
  const _es=document.getElementById('esferaScreen'); if(_es&&_es.classList.contains('on')&&typeof cerrarEsfera==='function') cerrarEsfera(); /* navegar cierra la esfera (p.ej. comandos de voz) */
  const el=document.getElementById('v-'+id);
  if(!el){
    // Vista inexistente (id con typo, o una vista que se renombró y quedó un botón
    // viejo apuntando al nombre anterior): antes esto dejaba la pantalla COMPLETAMENTE
    // en blanco (se le quitaba "on" a todas las secciones y nunca se le volvía a poner
    // a ninguna), sin ningún mensaje ni forma de volver salvo adivinar otro botón.
    console.warn('cv(): vista inexistente "'+id+'", volviendo a Inicio.');
    if(id!=='dash') return cv('dash');
    return;
  }
  _trackPantalla(id);
  /* "Inicio" es el punto de reinicio: limpia el historial interno. Antes NO limpiaba el del
     navegador, y esa diferencia dejaba entradas fantasma — el primer toque al botón físico
     no hacía nada visible y el segundo cerraba la app. Ahora se reemplaza la entrada actual
     en vez de apilar, así ambas pilas quedan parejas. */
  if(id==='dash' && !_esVolver){
    _viewHistory=[];
    try{ history.replaceState({lpView:'dash'}, ''); }catch(e){}
  }
  else if(!_esVolver && _viewActual && _viewActual!==id){
    _viewHistory.push(_viewActual); if(_viewHistory.length>15) _viewHistory.shift();
    _registrarPasoEnHistorial(id); // le da al botón atrás del teléfono algo que retroceder
  }
  _viewActual=id; _actualizarBtnAtras();
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('on'); }); el.classList.add('on'); document.body.setAttribute('data-vista', id); document.querySelectorAll('.nb').forEach(function(x){ x.classList.remove('on'); }); const ni=viewNav[id], nbs=document.querySelectorAll('.nb'); if(ni!=null&&nbs[ni]) nbs[ni].classList.add('on'); window.scrollTo(0,0); if(id==='map') setTimeout(function(){ if(mp) mp.resize(); },120); if(id==='routes'){ renderRutas(); setTimeout(function(){ if(mapAllRoutes) mapAllRoutes.invalidateSize(); },120); } if(id==='trips'){ renderRutas(); } if(id==='customize') initCustomization(); if(id==='stats') updateStatsView(); /* 2026-08-23: cada pantalla engancha SU listener la primera vez que se abre (ver
     _subUnaVez). Antes se enganchaban los 11 al iniciar sesion aunque nunca entraras. */
  if(id==='chat')      _subUnaVez('chat', subscribeToChat);
  if(id==='novedades') _subUnaVez('novedades', subscribeToNovedades);
  if(id==='rec')       _subUnaVez('recomendaciones', loadRecommendations);
  if(id==='gui')       _subUnaVez('comentarios', subscribeToComments);
  if(id==='map')       _subUnaVez('reportes', subscribeToReportes);
  if(id==='mac')       _subUnaVez('repairTips', loadRepairTips);
  if(id==='mac'){ if(typeof _actualizarTallerCercano==='function') _actualizarTallerCercano(); /* 2026-08-24: renderizar AL ABRIR. renderMantencion() solo se llamaba desde au(), y desde que au() la condiciona a que Taller este visible (para no reconstruir 5 tarjetas en cada punto de GPS), abrir Taller sin estar pedaleando dejaba la lista VACIA: al iniciar la app au() corre con Inicio a la vista, el guard bloquea, y cv('mac') no renderizaba nada. El guard esta bien; lo que faltaba era este render de apertura. */ if(typeof renderMantencion==='function') renderMantencion(); } if(id==='diario'){ /* Auditoria 2026-07-20: entrando por la esfera la Bitacora quedaba a medio
     inicializar (sin categorias de puntos y sin sincronizar con la nube) porque cv() solo
     hacia cargarDiario() y openDiario() hacia tres cosas mas. La misma pantalla se veia
     distinta segun por donde entraras: eso es exactamente la falta de concordancia que
     reporto Inty. Ahora la inicializacion vive en un solo lugar. */
    cargarDiario(); if(typeof renderPoiCats==='function') renderPoiCats();
    if(typeof sincronizarDiarioNube==='function') sincronizarDiarioNube().then(function(){ cargarDiario(); }).catch(function(){});
  } }
// Puesto real en el ranking general (no solo si estás en el Top 100): cuenta cuántos
// ciclistas tienen más km que tú y le suma 1. Se calcula aparte porque mostrarRanking()
// solo trae el Top 100, así que alguien fuera de esa lista antes no tenía forma de
// saber en qué puesto va.
async function actualizarMiPuesto(){
  // Actualiza TODOS los indicadores de rango a la vez (Estadísticas y la fila de
  // abajo de la Esfera) — antes solo existía dentro de Estadísticas, así que en la
  // pantalla de inicio real de la app (la Esfera) nunca se veía tu puesto.
  const els=[document.getElementById('statPuesto'), document.getElementById('esPuesto')].filter(Boolean);
  if(!els.length || !cu) return;
  els.forEach(function(el){ el.innerText='…'; });
  try{
    const miKm=us.di||0;
    // Ranking por AGREGACIÓN count(): lee 0 documentos (antes leía TODOS los usuarios con
    // más km que tú, miles de lecturas por un solo número). Si el SDK no la soporta, cae al
    // método viejo — mismo resultado, cero regresión.
    let rank=null;
    try{ const agg=await db.collection('users').where('km','>',miKm).count().get(); rank=(agg.data().count||0)+1; }
    catch(eCount){ const snap=await db.collection('users').where('km','>',miKm).get(); rank=snap.size+1; }
    els.forEach(function(el){ el.innerText='#'+rank; });
  }catch(e){ els.forEach(function(el){ el.innerText='—'; }); }
}
function updateStatsView(){
  document.getElementById('statKm').innerText=us.di.toFixed(1);
  document.getElementById('statTrips').innerText=_totalViajesCompletos();
  document.getElementById('statCal').innerText=Math.round(us.c);
  document.getElementById('statDarma').innerText=us.d;
  document.getElementById('statAvgSpeed').innerText=speedReadings.length>0?(speedReadings.reduce(function(a,b){return a+b;},0)/speedReadings.length).toFixed(1):'0';
  document.getElementById('statMaxSpeed').innerText=maxSpeed.toFixed(1); var _kgC=_co2Evitado(us.di); var _sc=document.getElementById('statCo2'); if(_sc) _sc.innerText=_fmtCo2(_kgC); var _scl=document.getElementById('statCo2Lbl'); if(_scl) _scl.innerText='CO₂ evitado · ~'+_arbolesEq(_kgC).toFixed(1)+' árboles/año';
  actualizarMiPuesto();
  const perf=Math.min(100,Math.round((us.di/10)*100));
  document.getElementById('statPerformanceFill').style.width=perf+'%';
  { const sp=document.getElementById('statPerformanceFill'); if(sp.parentElement) sp.parentElement.setAttribute('data-pct',perf+'%'); }
  const ct=trips.filter(function(t){return t.status==='completed'&&t.gpsData;});
  const ck=document.getElementById('chartKm'), cd=document.getElementById('chartDuration'), cc=document.getElementById('chartCal');
  if(ct.length===0){ ck.innerHTML=cd.innerHTML=cc.innerHTML='<p style="color:#888;font-size:0.8rem;text-align:center;width:100%">Todavía no hay viajes multi-destino completados. Estos gráficos se llenan solos cuando termines uno.</p>'; return; }
  const maxKm=Math.max.apply(null,ct.map(function(t){return t.gpsData.distance||0;}));
  const maxDur=Math.max.apply(null,ct.map(function(t){return parseInt((t.gpsData.duration||'0').replace(/[^0-9]/g,''))||0;}));
  const maxCal=Math.max.apply(null,ct.map(function(t){return t.gpsData.calories||0;}));
  ck.innerHTML=ct.map(function(t){ const v=maxKm>0?((t.gpsData.distance||0)/maxKm)*100:0; return '<div class="chart-bar-item" style="height:'+v+'%" title="'+(t.gpsData.distance||0).toFixed(2)+' km"></div>'; }).join('');
  cd.innerHTML=ct.map(function(t){ const d=parseInt((t.gpsData.duration||'0').replace(/[^0-9]/g,''))||0; const v=maxDur>0?(d/maxDur)*100:0; return '<div class="chart-bar-item" style="height:'+v+'%;background:var(--g)" title="'+d+' min"></div>'; }).join('');
  cc.innerHTML=ct.map(function(t){ const cal=t.gpsData.calories||0; const v=maxCal>0?(cal/maxCal)*100:0; return '<div class="chart-bar-item" style="height:'+v+'%;background:var(--r)" title="'+cal+' cal"></div>'; }).join('');
}
// GPX completo (Strava/Komoot/Wikiloc lo leen entero): lat/lon + elevación + tiempo + nombre.
function _gpxDeRuta(pts, nombre){
  let gpx='<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Libre Pedal" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>'+escapeHTML(nombre||'Ruta Libre Pedal')+'</name><trkseg>\n';
  pts.forEach(function(p){ gpx+='<trkpt lat="'+p.lat+'" lon="'+p.lon+'">'; if(p.alt!=null&&!isNaN(p.alt)) gpx+='<ele>'+p.alt+'</ele>'; const ts=p.timestamp||p.t; if(ts) gpx+='<time>'+new Date(ts).toISOString()+'</time>'; gpx+='</trkpt>\n'; });
  return gpx+'</trkseg></trk>\n</gpx>';
}
function _descargarGPX(gpx, nombre){
  const blob=new Blob([gpx],{type:'application/gpx+xml'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=(nombre||'libre-pedal-ruta').replace(/[^\w-]+/g,'_').slice(0,50)+'.gpx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(url); },3000);
}
function exportarDatosGPX(){ if(gpsPoints.length===0){ lpAviso("No hay una ruta activa para exportar"); return; } _descargarGPX(_gpxDeRuta(gpsPoints,'Ruta Libre Pedal'),'libre-pedal-ruta'); h("Ruta exportada en GPX con elevación y tiempo. Súbela a Strava, Komoot o Wikiloc."); }
// IMPORTAR GPX: trae a Libre Pedal una ruta de Strava/Wikiloc/Komoot (o de un amigo).
// Lee tracks (<trkpt>) o rutas (<rtept>), con elevación y tiempo si los trae, y la guarda
// en tu historial para verla, ver su perfil, hacerle video o pedalearla.
function importarGPX(input){
  const file=input && input.files && input.files[0]; if(!file){ return; }
  const reader=new FileReader();
  reader.onload=function(ev){
    try{
      const xml=new DOMParser().parseFromString(String(ev.target.result), 'application/xml');
      if(xml.getElementsByTagName('parsererror').length){ lpAviso('Ese archivo no parece un GPX válido.'); input.value=''; return; }
      let nodos=Array.prototype.slice.call(xml.getElementsByTagName('trkpt'));
      if(nodos.length<2) nodos=Array.prototype.slice.call(xml.getElementsByTagName('rtept'));
      const points=nodos.map(function(p){
        const lat=parseFloat(p.getAttribute('lat')), lon=parseFloat(p.getAttribute('lon'));
        const o={lat:lat, lon:lon};
        const e=p.getElementsByTagName('ele')[0]; if(e){ const a=parseFloat(e.textContent); if(!isNaN(a)) o.alt=a; }
        const tt=p.getElementsByTagName('time')[0]; if(tt){ const ts=Date.parse(tt.textContent); if(!isNaN(ts)) o.timestamp=ts; }
        return o;
      }).filter(function(p){ return !isNaN(p.lat) && !isNaN(p.lon); });
      if(points.length<2){ lpAviso('Ese GPX no tiene puntos de ruta que pueda leer.'); input.value=''; return; }
      let dist=0; for(let i=1;i<points.length;i++){ dist+=calculateDistance(points[i-1].lat,points[i-1].lon,points[i].lat,points[i].lon)/1000; }
      const nom=xml.getElementsByTagName('name')[0];
      const nombre=(nom && nom.textContent && nom.textContent.trim()) || file.name.replace(/\.(gpx|xml)$/i,'') || 'Ruta importada';
      const ruta={ localId:'imp_'+Date.now(), nombreRuta:nombre, points:points, distance:dist, calories:Math.round(dist*30), startTime:(points[0].timestamp||Date.now()), importada:true };
      rutasLocalesSet(rutasLocales().concat([ruta]));
      if(typeof renderRutas==='function') renderRutas();
      input.value='';
      h('¡Importé "'+nombre+'", '+dist.toFixed(1)+' kilómetros! Ya está en tu historial: tócala para verla o pedalearla.');
    }catch(e){ input.value=''; lpAviso('No pude leer ese GPX. ¿Seguro que es un archivo de ruta?'); }
  };
  reader.onerror=function(){ input.value=''; lpAviso('No pude abrir el archivo.'); };
  reader.readAsText(file);
}
/* ===== COMPARTIR UN VIAJE =====
   Faltaba, y es de las cosas que más rinden: la app ya compartía el resumen ANUAL (una
   vez al año) y la ubicación en vivo, pero no el viaje recién terminado — que es lo que
   la gente muestra de verdad, todas las semanas. Cada viaje compartido es la app
   llegando gratis a alguien que no la conoce.
   Se arma el texto acá y se usa el compartir nativo del teléfono (WhatsApp, Instagram,
   lo que tenga): sin depender de la API de ninguna red social ni de credenciales. */
function _frasePresumir(km){
  if(km>=100) return 'Hoy rompí los 100 kilómetros.';
  if(km>=60)  return 'Buena jornada arriba de la bici.';
  if(km>=30)  return 'Salida redonda de hoy.';
  if(km>=10)  return 'Pedaleada de hoy, cortita pero sabrosa.';
  return 'Salí a rodar un rato.';
}
function compartirViaje(id){
  const r=(typeof _rutaPorId==='function')?_rutaPorId(id):null;
  if(!r){ h('No encontré esa ruta para compartirla.'); return; }
  const km=(r.distance||0), cal=Math.round(r.calories||0);
  const fecha=r.startTime?new Date(r.startTime).toLocaleDateString('es-CL',{day:'numeric',month:'long'}):'';
  let txt=_frasePresumir(km)+' '+km.toFixed(1)+' km';
  if(r.duration) txt+=' en '+r.duration;
  if(cal>0) txt+=' · '+cal+' calorías';
  if(fecha) txt+=' ('+fecha+')';
  txt+='\n\nGrabado con Libre Pedal 🚴 https://librepedal.cl';
  if(navigator.share){
    navigator.share({title:'Mi viaje en Libre Pedal', text:txt}).catch(function(){});
    return;
  }
  // Sin compartir nativo (navegador de escritorio): al portapapeles, que igual sirve.
  try{
    navigator.clipboard.writeText(txt).then(function(){ h('Copié tu viaje al portapapeles. Pégalo donde quieras.'); })
      .catch(function(){ lpAviso(txt); });
  }catch(e){ lpAviso(txt); }
}
function exportarRutaGPX(id){
  function armar(pts,nombre){ if(!pts||!pts.length){ lpAviso('Esa ruta no tiene puntos para exportar.'); return; } _descargarGPX(_gpxDeRuta(pts,nombre), nombre); h('Ruta exportada en GPX. Súbela a Strava, Komoot o Wikiloc.'); }
  const r=_rutaPorId(id);
  if(r&&r.points&&r.points.length){ armar(r.points, r.nombreRuta||('Ruta '+new Date(r.startTime).toLocaleDateString())); return; }
  db.collection('routes').doc(id).get().then(function(doc){ if(doc.exists){ const dd=doc.data(); armar((dd.points||[]), dd.nombreRuta||'Ruta Libre Pedal'); } else { lpAviso('No pude abrir esa ruta.'); } }).catch(function(){ lpAviso('No pude abrir esa ruta.'); });
}
function generarPDFBromas(){ const {jsPDF}=window.jspdf; const doc=new jsPDF(); doc.setFillColor(10,15,29); doc.rect(0,0,210,297,'F'); doc.setTextColor(252,76,2); doc.setFontSize(32); doc.text('Libre Pedal',105,80,{align:'center'}); doc.setFontSize(18); doc.text('Frases de Pistero',105,100,{align:'center'}); doc.setTextColor(255,255,255); doc.setFontSize(10); doc.text('Generado: '+new Date().toLocaleDateString(),105,150,{align:'center'}); const pagina=function(titulo,color,arr){ doc.addPage(); doc.setFillColor(color.r,color.g,color.b); doc.rect(0,0,210,20,'F'); doc.setTextColor(255,255,255); doc.setFontSize(16); doc.text(titulo,105,13,{align:'center'}); doc.setTextColor(0,0,0); doc.setFontSize(11); let y=35; arr.forEach(function(b,i){ if(y>270){ doc.addPage(); y=20; } doc.setFont(undefined,'bold'); doc.text((i+1)+'.',15,y); doc.setFont(undefined,'normal'); const lines=doc.splitTextToSize(b,170); doc.text(lines,25,y); y+=lines.length*6+4; }); }; pagina('LENTO',{r:37,g:99,b:235},frasesLento); pagina('NORMAL',{r:16,g:185,b:129},frasesNormal); pagina('RAPIDO',{r:220,g:38,b:38},frasesRapido); pagina('PARADO',{r:100,g:100,b:100},frasesParado); pagina('MOTIVACIONAL',{r:255,g:215,b:0},frasesMotivacionales); pagina('PROFUNDAS',{r:139,g:92,b:246},frasesProfundas); doc.save('LibrePedal.pdf'); h("PDF descargado."); }
/* ===== AVISO DE CICLISTA ADELANTE (para el que va motorizado) =====
   Pedido de Inty 2026-07-21: si un motorizado y un ciclista, ambos con la app, se
   encuentran en ruta, avisarle al motorizado ANTES de que lo vea.

   Este es el único caso donde el aviso automovilista↔ciclista se sostiene, y hay que
   construirlo cuidando las críticas que hundieron a las apps que lo intentaron
   (BikeShield, Cycle Safety Technologies — ver DISENO-CANAL-RODADA.md):

   1. "Pone al conductor mirando el teléfono" -> acá es SOLO VOZ. No hay nada que mirar,
      ninguna alerta visual que exija atención. Se oye y se sigue conduciendo.
   2. "Traslada la culpa al ciclista" -> el aviso NUNCA dice ni sugiere que el ciclista
      deba tener la app. Es una ayuda extra para el que conduce, no una obligación del
      que pedalea. Si no hay aviso, el deber de cuidado del conductor es exactamente el
      mismo: por eso la frase termina recordando el metro y medio, que es ley en Chile.
   3. "Solo sirve si ambos la tienen" -> cierto, y por eso esto SUMA pero no reemplaza a
      nada. No se anuncia como sistema de seguridad: es una cortesía entre usuarios. */
const CICLISTA_AVISO_SEG=25;          // avisar ~25 s antes de alcanzarlo
const CICLISTA_AVISO_MIN_M=150;       // nunca menos de 150 m: más cerca ya no da tiempo a nada
const CICLISTA_AVISO_MAX_M=800;       // más lejos de 800 m el aviso es ruido
const CICLISTA_AVISO_ARCO=50;         // grados a cada lado del rumbo: solo lo que está ADELANTE
const CICLISTA_AVISO_REPETIR_MS=180000; // no repetir por el mismo ciclista antes de 3 min
let _ciclistasCerca=[], _ciclistaAvisado={}, _ciclistaSub=null;

/* La distancia de aviso sale de la velocidad real, igual que las cuestas: a 100 km/h
   alcanzas a un ciclista mucho antes que a 40, y el aviso tiene que llegar con el mismo
   tiempo de reacción en los dos casos. */
function _metrosAvisoCiclista(velKmh){
  const m=(velKmh||0)/3.6*CICLISTA_AVISO_SEG;
  return Math.max(CICLISTA_AVISO_MIN_M, Math.min(CICLISTA_AVISO_MAX_M, m));
}
/* ¿Está adelante? Se compara el rumbo hacia el ciclista con el rumbo en que voy.
   Un ciclista que ya pasé, o que va por la otra pista en sentido contrario a 300 m,
   no se avisa: sería un aviso inútil que enseña a ignorar los avisos. */
function _vaAdelante(rumboMio, rumboAlCiclista){
  if(rumboMio===null || rumboMio===undefined) return true; // sin rumbo confiable, mejor avisar
  let d=Math.abs(((rumboAlCiclista-rumboMio+540)%360)-180);
  return d<=CICLISTA_AVISO_ARCO;
}
function _revisarCiclistasAdelante(miLat,miLon,miRumbo,velKmh){
  if(typeof actividadTipo==='undefined' || actividadTipo!=='moto') return; // solo para el que va motorizado
  if(!_ciclistasCerca.length) return;
  const umbral=_metrosAvisoCiclista(velKmh);
  const ahora=Date.now();
  for(let i=0;i<_ciclistasCerca.length;i++){
    const c=_ciclistasCerca[i];
    if(!c || !c.lat || !c.lon) continue;
    const m=calculateDistance(miLat,miLon,c.lat,c.lon)*1000;
    if(m>umbral) continue;
    const rumbo=_bearingEntrePuntos({lat:miLat,lon:miLon},{lat:c.lat,lon:c.lon});
    if(!_vaAdelante(miRumbo,rumbo)) continue;
    if(ahora-(_ciclistaAvisado[c.id]||0) < CICLISTA_AVISO_REPETIR_MS) continue;
    _ciclistaAvisado[c.id]=ahora;
    h('Ciclista adelante, a unos '+Math.round(m/10)*10+' metros. Dale su metro y medio al pasar.', PRIO_VOZ.SEGURIDAD);
    return; // uno por vez: dos avisos encimados no se entienden
  }
}
/* Solo se suscribe si vas motorizado. Al que pedalea no le sirve y le gastaría datos.
   2026-09-03: la query where('activo','==',true) de acá abajo quedó DESHABILITADA a
   propósito -- las reglas de Firestore ahora niegan "list" sobre liveTracking (solo
   permiten "get" de un id conocido, para el link de seguimiento en seguir.html) porque
   esta misma query, sin ningún filtro, dejaba que cualquiera (con o sin cuenta, sin
   haber recibido ningún link) enumerara en vivo la posición y nombre de TODA persona
   compartiendo ubicación en cualquier parte del mundo -- hallazgo real de privacidad,
   no hipotético. El aviso "ciclista adelante" a quien va motorizado queda apagado
   hasta que exista una función de servidor (con credenciales de administrador, fuera
   del alcance de las reglas de cliente) que reciba la posición de quien pregunta y
   devuelva SOLO "hay alguien cerca" sin exponer lat/lon/nombre de terceros a nadie
   que no se lo haya compartido. No se intenta la query igual porque fallaría con
   permission-denied en cada apertura -- eso ensuciaría los reportes de error (Sentry)
   sin ningún beneficio real. */
function suscribirCiclistasCerca(){
  if(_ciclistaSub){ _ciclistaSub(); _ciclistaSub=null; }
  _ciclistasCerca=[];
}
function calculateDistance(lat1,lon1,lat2,lon2){ const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2); return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*1000; }
/* Taller: derivar al usuario a un taller de bicicletas REAL, no una busqueda a ciegas.
   Antes el boton "Buscar taller cercano" abria una busqueda de texto sin ubicacion —
   Google adivinaba por IP, no por donde el usuario esta parado. Ahora, en dos pasos:
   1) mejora inmediata: centra la busqueda en su ubicacion GPS real (currentUserLocation,
      la misma variable que ya usa el SOS de caidas).
   2) mejor esfuerzo: consulta Overpass (OpenStreetMap, gratis, sin API key) por talleres
      de verdad cerca, y si encuentra uno, cambia el link a una ruta directa con nombre y
      distancia. Si no hay internet o Overpass no responde, se queda con la mejora del
      paso 1 — nunca peor que el link generico de antes.
   Igual que el SOS: nunca se abre nada solo (los WebView/navegadores mobile bloquean
   window.open() despues de un await); se deja un <a href> real para que el usuario lo
   toque cuando quiera. */
async function _actualizarTallerCercano(){
  const links=document.querySelectorAll('.taller-cercano-link');
  if(!links.length) return;
  const loc=currentUserLocation || (typeof us!=='undefined' && us && us.la!=null ? {lat:us.la,lon:us.lo} : null);
  if(!loc) return;
  links.forEach(function(a){ a.href='https://www.google.com/maps/search/taller+de+bicicletas/@'+loc.lat+','+loc.lon+',14z'; });
  try{
    const ctrl=new AbortController(); const to=setTimeout(function(){ ctrl.abort(); },7000);
    const q='[out:json][timeout:6];(node["shop"="bicycle"](around:6000,'+loc.lat+','+loc.lon+');way["shop"="bicycle"](around:6000,'+loc.lat+','+loc.lon+'););out center 8;';
    const r=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(q),{signal:ctrl.signal});
    clearTimeout(to);
    const j=await r.json();
    const opciones=(j.elements||[]).map(function(e){
      const lat=e.lat!=null?e.lat:(e.center&&e.center.lat), lon=e.lon!=null?e.lon:(e.center&&e.center.lon);
      if(lat==null||lon==null) return null;
      return {nombre:(e.tags&&e.tags.name)||'Taller de bicicletas', lat:lat, lon:lon, d:calculateDistance(loc.lat,loc.lon,lat,lon)};
    }).filter(Boolean).sort(function(a,b){ return a.d-b.d; });
    if(opciones.length){
      const t=opciones[0], km=(t.d/1000).toFixed(1);
      const url='https://www.google.com/maps/dir/?api=1&origin='+loc.lat+','+loc.lon+'&destination='+t.lat+','+t.lon+'&travelmode=bicycling';
      document.querySelectorAll('.taller-cercano-link').forEach(function(a){ a.href=url; a.innerHTML='<i class="fas fa-location-dot"></i> '+escapeHTML(t.nombre)+' · '+km+' km'; });
    }
  }catch(e){ /* sin internet, timeout, o Overpass caido: queda la mejora del paso 1 */ }
}

function normalizar(t){ return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
// Deja SOLO el lugar: quita "pistero", muletillas y verbos de comando para que la búsqueda no falle.
function limpiarDestino(raw){
  let s=String(raw||'').trim().replace(/[.,;!?¿¡]+$/,'');
  s=s.replace(/^\s*pistero,?\s+/i,'');
  s=s.replace(/^\s*(oye|ya|eh|em|este|a ver|mira|por favor|porfa)\s+/i,'');
  s=s.replace(/^\s*(me\s+)?(quiero|necesito|me gustaria|megustaria|podrias|puedes|deseo)\s+/i,'');
  s=s.replace(/^\s*(que me lleves|que me guies|ll[eé]vame|llevarme|llevar|llevame|ir|irme|vamos|vamonos|voy|navegar|navega|nav[eé]game|gu[ií]ame|guiarme|busca(?:r|me)?|encontrar|encuentra|planifica(?:r|me)?(?: un| el| mi)? viaje|arma(?:r)?(?: un| el| mi)? viaje|como (?:llego|voy)|llegar|ir a dar una vuelta)\b/i,'');
  s=s.replace(/^\s*(la |el )?direcci[oó]n(?: de)?\s+/i,'');
  s=s.replace(/^\s*(a la|al|a|hasta|hacia|para|por|en|el lugar)\s+/i,'');
  s=s.replace(/\s+(por favor|porfa|gracias|pistero)$/i,'');
  return s.trim();
}
// Anti-eco: si el mic alcanzó a escuchar al propio Pistero por el parlante,
// recorta su frase (completa o el pedazo final) de lo reconocido.
function quitarEcoPistero(t){
  let s=normalizar(t).replace(/[.,;!?¿¡:]/g,'').replace(/\s{2,}/g,' ').trim();
  const ecos=llamadosAlViaje.concat(['Te escucho, capitán.','¿A qué lugar te llevo?','¿A dónde vamos?','Dime tu destino.']);
  ecos.forEach(function(f){
    const nf=normalizar(f).replace(/[.,;!?¿¡:]/g,'').replace(/\s{2,}/g,' ').trim();
    if(!nf) return;
    const i=s.indexOf(nf);
    if(i>-1){ s=(s.slice(0,i)+' '+s.slice(i+nf.length)).replace(/\s{2,}/g,' ').trim(); return; }
    const w=nf.split(' ');
    for(let k=w.length-1;k>=2;k--){
      const frag=w.slice(w.length-k).join(' ');
      if(s===frag){ s=''; break; }
      if(s.indexOf(frag+' ')===0){ s=s.slice(frag.length).trim(); break; }
    }
  });
  return s;
}
function initVoz(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ recognition=null; return; }
  recognition=new SR();
  recognition.lang='es-CL';
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=1;
  recognition.onresult=function(e){ const t=e.results[0][0].transcript; const sinEco=quitarEcoPistero(t); mostrarBocadillo('Te escuché: "'+(sinEco||t)+'"'); if(!sinEco){ h('¿A dónde vamos? Toca el micrófono y dime solo el lugar.'); return; } handleVoiceCommand(sinEco); };
  recognition.onend=function(){ micOn=false; updateMicBtn(); try{ lpMusic.unduck(); }catch(e){} };
  recognition.onerror=function(e){
    micOn=false; updateMicBtn(); try{ lpMusic.unduck(); }catch(e){}
    const err=e&&e.error;
    if(err==='not-allowed'||err==='service-not-allowed'){ h("Necesito permiso para usar el micrófono. Actívalo en el candado de la barra del navegador."); }
    else if(err==='no-speech'){ h("No te escuché. Toca el micrófono y habla de nuevo."); }
    else if(err==='audio-capture'){ h("No encuentro un micrófono en este dispositivo."); }
    else if(err==='network'){ hCorta("Sin señal no puedo escucharte. Anota tu destino a mano y te llevo igual."); cv('trips'); setTimeout(function(){ const qd=document.getElementById('quick-dest'); if(qd) qd.focus(); },300); }
    else if(err!=='aborted'){ h("Hubo un problema con el micrófono. Inténtalo otra vez."); }
  };
}
// ===== MANOS LIBRES: escucha continua, sin apretar el micrófono cada vez =====
// Pedido explícito de Inty: "si vas en bicicleta o manejando no hay tiempo para
// estar apretando el botón del micrófono, no tiene lógica". Con esto activado,
// el reconocimiento queda escuchando todo el tiempo (se reinicia solo cada vez
// que el navegador lo corta por su cuenta, cosa que hace seguido incluso con
// continuous:true — es una limitación conocida de la Web Speech API, no un bug
// de acá) y SOLO responde cuando lo llamas por su nombre ("Pistero, ...") — así
// no interrumpe una charla normal con quien vaya pedaleando al lado. La única
// excepción es "cállate/silencio": esa funciona SIEMPRE, sin decir "Pistero"
// antes, porque es la orden más urgente y no puede tener fricción.
let manosLibresOn=(function(){ try{ return localStorage.getItem('lp_manos_libres')==='1'; }catch(e){ return false; } })();
// El navegador exige un gesto del usuario para abrir el micrófono: arrancamos la
// escucha continua en el primer toque real (que ocurre de inmediato al usar la app).
document.addEventListener('pointerdown', function _lpArrancaOrbe(){ document.removeEventListener('pointerdown',_lpArrancaOrbe); try{ if(manosLibresOn && !_reconocimientoContinuo && !_tocandoNativoContinuo){ _iniciarEscuchaContinua(); } if(manosLibresOn && typeof lpWakeLock==='object') lpWakeLock.enable(true,true); }catch(e){} if(typeof updateMicBtn==='function') updateMicBtn(); }, false);
// El orbe se esconde mientras se escribe, para no tapar inputs de chat/Pistero.
document.addEventListener('focusin', function(e){ const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) document.body.classList.add('lp-typing'); });
document.addEventListener('focusout', function(e){ const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) document.body.classList.remove('lp-typing'); });
// Bug real (2026-08-31, reporte de Inty: "el botón que ha tapado" al registrar un punto/
// alojamiento). #micBtn flota FIJO (bottom+left:50%) en TODAS las vistas, con z-index 2200 —
// más alto que cualquier botón normal de la página. Al scrollear una pantalla larga (ej.
// "Nuevo alojamiento": Marcar con GPS → mapa → Publicar), el botón "Publicar" pasa, en algún
// punto del scroll, justo por la franja fija donde vive el orbe — y en ESE instante el toque
// le llega al orbe, no al botón de abajo: el botón queda tapado de verdad, no solo visualmente.
// Se detecta en vivo (con requestAnimationFrame, sin recalcular en cada evento de scroll) si
// hay un <button>/<a> real justo debajo del orbe en ese momento; si lo hay, se atenúa y deja
// pasar el toque (mismo mecanismo ya usado para "escribiendo", arriba) hasta que deje de haber
// solapamiento. No cambia nada del tamaño/posición/comportamiento normal del orbe.
(function(){
  let _raf=null;
  function revisar(){
    _raf=null;
    try{
      const mic=document.getElementById('micBtn');
      if(!mic) return;
      const cs=getComputedStyle(mic);
      if(cs.display==='none'||cs.visibility==='hidden'){ document.body.classList.remove('mic-tapando-boton'); return; }
      const r=mic.getBoundingClientRect();
      if(r.width<2||r.height<2){ document.body.classList.remove('mic-tapando-boton'); return; }
      const pts=[[r.left+6,r.top+6],[r.right-6,r.top+6],[r.left+6,r.bottom-6],[r.right-6,r.bottom-6],[(r.left+r.right)/2,(r.top+r.bottom)/2]];
      let tapando=false;
      for(let i=0;i<pts.length && !tapando;i++){
        const els=document.elementsFromPoint(pts[i][0],pts[i][1]);
        const debajo=els.find(function(el){ return el!==mic && !mic.contains(el); });
        if(!debajo) continue;
        // El fix original (2026-08-31) solo protegía <button>/<a> porque ahí el problema
        // era doble (visual Y funcional: el toque no llegaba). Pero el mismo orbe fijo tapa
        // igual de seguido párrafos de texto explicativo largos (ej. "Manos libres" en
        // Ajustes) -- ahí no hay nada que tocar, pero el usuario tampoco puede leer esa
        // línea mientras el orbe está encima. Un <p> con texto real (no una etiqueta corta)
        // cuenta también como "tapando", con el mismo umbral simple que ya usa
        // limpiarParaVoz-style: 20+ caracteres para no reaccionar a labels cortos sueltos.
        const esTextoLargo=debajo.tagName==='P' && (debajo.textContent||'').trim().length>20;
        if(debajo.tagName==='BUTTON'||debajo.tagName==='A'||debajo.closest('button')||debajo.closest('a')||esTextoLargo) tapando=true;
      }
      document.body.classList.toggle('mic-tapando-boton', tapando);
    }catch(e){}
  }
  function programar(){ if(_raf) return; _raf=requestAnimationFrame(revisar); }
  window.addEventListener('scroll', programar, {passive:true, capture:true});
  window.addEventListener('resize', programar, {passive:true});
})();
let _reconocimientoContinuo=null, _manosLibresPausado=false, _tocandoNativoContinuo=false;
// v7.66: fin-de-idea por silencio. El micro continuo se corta y reinicia solo
// (limite del navegador); antes eso PARTIA la frase. Ahora acumulamos lo dicho en
// _flBuffer y solo cerramos la idea tras _FL_FIN_IDEA ms sin voz nueva. El reloj es
// INDEPENDIENTE del micro: aunque se reinicie, la idea no se corta.
let _flBuffer='', _flSilTimer=null;
const _FL_FIN_IDEA=3000;
function _esSilencioCmd(t){ const n=normalizar(t); return /^(detente|para|ya)\.?$/.test(n) || /c[aá]llate|\bcalla\b|silencio|no hables m[aá]s|deja(te)? de hablar|quiero silencio|no digas nada|basta ya/.test(n); }
function _flCerrarIdea(){ clearTimeout(_flSilTimer); _flSilTimer=null; const idea=_flBuffer.trim(); _flBuffer=''; if(idea) _procesarFraseManosLibres(idea); }
// Auto-apagado: si en manos libres nadie le habla por un buen rato, el micrófono NO
// tiene por qué seguir encendido gastando batería. Se apaga solo tras 12 min de silencio.
let _manosLibresUltimoUso=Date.now();
const _MANOS_LIBRES_MAX_INACTIVO=12*60*1000;
function _manosLibresInactivoDemasiado(){ return (Date.now()-_manosLibresUltimoUso) > _MANOS_LIBRES_MAX_INACTIVO; }
function _autoApagarManosLibres(){
  manosLibresOn=false; try{ localStorage.setItem('lp_manos_libres','0'); }catch(e){}
  _detenerEscuchaContinua(); _lpWLoff(); _actualizarBtnManosLibres();
  h('Apagué el micrófono de manos libres porque llevabas rato sin usarlo, para cuidarte la batería. Actívalo de nuevo cuando quieras.');
}
// Reporte real: Inty quería activar manos libres A MITAD DE UNA NAVEGACIÓN
// activa, tuvo que salir a Ajustes para hacerlo, y "Atrás" lo devolvió a
// Inicio en vez de a la navegación (la pantalla de navegación es un overlay
// aparte que no vive en el historial de "Atrás" — perdía su lugar). El arreglo
// no es tocar ese historial: es que NUNCA tenga que salir de la navegación
// para esto — el mismo botón está ahora también arriba del mapa mientras
// navegas.
function _actualizarBtnManosLibres(){
  const b=document.getElementById('btnManosLibres'); if(b) b.innerText=manosLibresOn?'🎙️ Manos libres: ON':'🎙️ Manos libres: OFF';
  const nb=document.getElementById('btnNavManosLibres'); if(nb) nb.classList.toggle('on', manosLibresOn);
  if(typeof updateMicBtn==='function') updateMicBtn();
}
function toggleManosLibres(){
  manosLibresOn=!manosLibresOn;
  try{ localStorage.setItem('lp_manos_libres', manosLibresOn?'1':'0'); }catch(e){}
  _actualizarBtnManosLibres();
  if(manosLibresOn){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const nat=lpPlugin('SpeechRecognition');
    if(!SR && !(nat&&nat.start)){ h('Tu navegador no soporta escucha continua. Sigue usando el botón del micrófono.'); manosLibresOn=false; try{ localStorage.setItem('lp_manos_libres','0'); }catch(e){} _actualizarBtnManosLibres(); return; }
    // Aviso honesto de una limitación real (confirmada en dispositivo real): a
    // diferencia del GPS (que tiene su propio servicio nativo y sigue con la
    // pantalla apagada), la escucha de voz vive en la app misma — si apagas la
    // pantalla a mano, deja de escuchar. Mejor decirlo de entrada que dejar que
    // alguien crea que le está fallando el micrófono.
    h('Manos libres activado. Dime "Pistero" y lo que necesites, sin tocar nada. Para callarme, di "cállate". Mantengo la pantalla encendida mientras te escucho; si la apagas a mano, dejo de oírte. Se apaga solo tras 12 min sin hablarme.');
    _manosLibresUltimoUso=Date.now();
    try{ if(typeof lpWakeLock==='object') lpWakeLock.enable(true,true); }catch(e){}
    _iniciarEscuchaContinua();
  } else {
    h('Manos libres desactivado.');
    _detenerEscuchaContinua();
    _lpWLoff();
  }
}
function _procesarFraseManosLibres(t){
  if(!t) return;
  const norm=normalizar(t);
  // El silencio funciona SIEMPRE, sin necesitar el nombre — es la orden más
  // urgente y no puede depender de que Pistero "te haya escuchado bien" el nombre.
  if(/^(detente|para|ya)\.?$/.test(norm) || /c[aá]llate|\bcalla\b|silencio|no hables m[aá]s|deja(te)? de hablar|quiero silencio|no digas nada|basta ya/.test(norm)){ _manosLibresUltimoUso=Date.now(); handleVoiceCommand(t); return; }
  // Mientras Pistero habla (mic nativo Android, sin el buffer del camino web) solo el
  // silencio -ya resuelto arriba- se procesa; el resto se ignora para no confundir su
  // propio audio con una orden real.
  if(typeof vozHablando!=='undefined' && vozHablando) return;
  const m=t.match(/pistero[,:.]?\s*(.*)$/i);
  if(!m) return; // no te dirigiste a él por su nombre: sigue escuchando en silencio, no interrumpe
  _manosLibresUltimoUso=Date.now(); // te dirigiste a él: sigue despierto
  const resto=(m[1]||'').trim();
  if(!resto){ h('Dime.'); return; }
  handleVoiceCommand(resto);
}
function _iniciarEscuchaContinua(){
  if(_manosLibresPausado) return; // hay otra captura puntual (mic normal / chat) en curso
  const nat=lpPlugin('SpeechRecognition');
  if(nat&&nat.start){ _iniciarEscuchaContinuaNativa(); return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) return;
  if(_reconocimientoContinuo){ try{ _reconocimientoContinuo.onend=null; _reconocimientoContinuo.stop(); }catch(e){} }
  const r=new SR();
  r.lang='es-CL'; r.continuous=true; r.interimResults=true; r.maxAlternatives=1;
  r.onresult=function(e){
    let huboVoz=false;
    // Pistero ya no pausa este mic mientras habla (ver _pisteroHabla). Mientras está
    // hablando, cualquier resultado que NO sea el comando de silencio se ignora del todo
    // -ni se ejecuta ni se acumula al buffer de la idea en curso- para no confundir su
    // propio audio saliendo por el parlante con una orden real del usuario.
    const _pisteroHablandoAhora=(typeof vozHablando!=='undefined') && vozHablando;
    for(let i=e.resultIndex;i<e.results.length;i++){
      const seg=e.results[i][0].transcript;
      if(!seg) continue;
      const esFinal=e.results[i].isFinal;
      const t=esFinal?(quitarEcoPistero(seg)||seg):null;
      if(esFinal && t && _esSilencioCmd(t)){ clearTimeout(_flSilTimer); _flSilTimer=null; _flBuffer=''; _manosLibresUltimoUso=Date.now(); handleVoiceCommand(t); continue; }
      if(_pisteroHablandoAhora) continue;
      huboVoz=true;
      if(esFinal && t) _flBuffer=(_flBuffer+' '+t).trim();
    }
    if(huboVoz){ clearTimeout(_flSilTimer); _flSilTimer=setTimeout(_flCerrarIdea, _FL_FIN_IDEA); }
  };
  // no-speech es lo NORMAL en modo continuo (silencio ambiental mientras pedaleas
  // sin hablar) — no es un error real, el navegador lo corta y este mismo onend
  // lo reinicia solo.
  r.onerror=function(){};
  r.onend=function(){ _reconocimientoContinuo=null; if(manosLibresOn && _manosLibresInactivoDemasiado()){ _autoApagarManosLibres(); return; } if(manosLibresOn && !_manosLibresPausado) setTimeout(function(){ if(manosLibresOn && !_manosLibresPausado) _iniciarEscuchaContinua(); }, 250); };
  _reconocimientoContinuo=r;
  try{ r.start(); }catch(e){}
}
function _detenerEscuchaContinua(){
  if(_reconocimientoContinuo){ try{ _reconocimientoContinuo.onend=null; _reconocimientoContinuo.stop(); }catch(e){} _reconocimientoContinuo=null; }
  _tocandoNativoContinuo=false;
  clearTimeout(_flSilTimer); _flSilTimer=null; _flBuffer='';
}
// App instalada (plugin nativo): no soporta "continuous" real, así que se simula
// reiniciando la captura de a una vez apenas termina la anterior — hay una pausa
// perceptible entre frases, pero igual sin tocar el botón.
async function _iniciarEscuchaContinuaNativa(){
  if(_tocandoNativoContinuo) return;
  _tocandoNativoContinuo=true;
  while(manosLibresOn && !_manosLibresPausado){
    if(_manosLibresInactivoDemasiado()){ _autoApagarManosLibres(); break; }
    const t=await _micNativoEscuchar();
    if(!manosLibresOn || _manosLibresPausado) break;
    if(t){ const sinEco=quitarEcoPistero(t)||t; _procesarFraseManosLibres(sinEco); }
    await new Promise(function(res){ setTimeout(res,400); });
  }
  _tocandoNativoContinuo=false;
}
// Coordina con el mic de "empuja para hablar" y el chat de Pistero: el micrófono
// del dispositivo solo admite una captura a la vez, así que mientras esos capturan
// su propia frase puntual, la escucha continua se pausa y se reanuda sola al
// terminar — sin esto, las dos capturas peleaban por el mismo micrófono.
function _pausarManosLibres(){ if(!manosLibresOn) return; _manosLibresPausado=true; _detenerEscuchaContinua(); }
function _reanudarManosLibres(){ if(!manosLibresOn) return; _manosLibresPausado=false; setTimeout(function(){ if(manosLibresOn && !_manosLibresPausado) _iniciarEscuchaContinua(); }, 400); }
const llamadosAlViaje=[
  "¿Dónde quieres ir?",
  "¿Dónde vamos esta vez?",
  "¿Cuál será la ruta de hoy?",
  "Cuéntame, ¿a dónde pedaleamos?",
  "¿Hacia dónde apuntamos hoy?",
  "Dime el lugar y yo te guío.",
  "¿Qué aventura tienes en mente?",
  "Tú dime el destino, yo pongo el camino.",
  "¿A qué rincón vamos hoy?",
  "Soy todo oídos: ¿tu destino?"
];
// Micrófono NATIVO para la app instalada: el WebView de Android NO trae
// webkitSpeechRecognition, así que si el APK incluye el plugin
// @capacitor-community/speech-recognition, escuchamos por ahí. Devuelve el texto
// reconocido, '' si no captó nada, o null si no hay plugin nativo (usar web).
async function _micNativoEscuchar(){
  const SR=lpPlugin('SpeechRecognition');
  if(!SR||!SR.start) return null;
  try{
    if(SR.requestPermissions){ try{ await SR.requestPermissions(); }catch(e){} }
    else if(SR.requestPermission){ try{ await SR.requestPermission(); }catch(e){} }
    const res=await SR.start({language:'es-CL', maxResults:1, partialResults:false, popup:false});
    return (res&&res.matches&&res.matches[0])||'';
  }catch(e){ return ''; }
}
async function toggleMic(){
  // 1) App instalada: intenta el micrófono NATIVO (si el APK trae el plugin).
  const _nat=lpPlugin('SpeechRecognition');
  if(_nat&&_nat.start){
    if(micOn) return;
    try{ pararVoz(); }catch(e){}
    try{ lpMusic.duck(); }catch(e){}
    _pausarManosLibres();
    micOn=true; updateMicBtn(); beepMic();
    mostrarBocadillo('🎙️ '+llamadosAlViaje[Math.floor(Math.random()*llamadosAlViaje.length)]);
    const t=await _micNativoEscuchar();
    micOn=false; updateMicBtn(); try{ lpMusic.unduck(); }catch(e){}
    _reanudarManosLibres();
    if(t){ const sinEco=quitarEcoPistero(t); mostrarBocadillo('Te escuché: "'+(sinEco||t)+'"'); if(sinEco) handleVoiceCommand(sinEco); else h('¿A dónde vamos? Toca el micrófono y dime solo el lugar.'); }
    else h('No te escuché bien. Toca el micrófono y dime tu destino de nuevo.');
    return;
  }
  // 2) Web (Chrome): reconocimiento del navegador.
  if(!recognition){
    h("En la app instalada el micrófono aún no está disponible; escríbeme aquí abajo a dónde vamos. (En Chrome la voz sí funciona.)");
    const qd=document.getElementById('quick-dest'); if(qd){ try{ qd.focus(); }catch(e){} }
    return;
  }
  if(!window.isSecureContext){ h("Los comandos de voz solo funcionan con candado de seguridad, es decir desde la página publicada, no abriendo el archivo directo."); return; }
  if(micOn){ try{recognition.stop();}catch(e){} micOn=false; updateMicBtn(); _reanudarManosLibres(); return; }
  try{
    // CLAVE: Pistero se calla ANTES de abrir el mic. Si habla con el mic abierto,
    // el reconocimiento escucha su voz por el parlante y la mezcla con tu destino.
    pararVoz();
    try{ lpMusic.duck(); }catch(e){}
    _pausarManosLibres();
    recognition.start(); micOn=true; updateMicBtn();
    beepMic();
    mostrarBocadillo('🎙️ '+llamadosAlViaje[Math.floor(Math.random()*llamadosAlViaje.length)]);
  }
  catch(e){ micOn=false; updateMicBtn(); _reanudarManosLibres(); h("Espera un segundo y vuelve a tocar el micrófono."); }
}
function beepMic(){ try{ const ac=window._lpAC||(window._lpAC=new (window.AudioContext||window.webkitAudioContext)()); if(ac.state==='suspended') ac.resume(); const o=ac.createOscillator(), g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='sine'; o.frequency.setValueAtTime(660,ac.currentTime); o.frequency.setValueAtTime(990,ac.currentTime+0.09); g.gain.setValueAtTime(0.0001,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.18,ac.currentTime+0.03); g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+0.22); o.start(ac.currentTime); o.stop(ac.currentTime+0.25); }catch(e){} }
function updateMicBtn(){ const on=(typeof micOn!=='undefined'&&micOn)||(typeof manosLibresOn!=='undefined'&&manosLibresOn); const b=document.getElementById('micBtn'); if(b) b.classList.toggle('listening',on); const e=document.getElementById('esMic'); if(e) e.classList.toggle('listening',micOn); try{ if(typeof _setExprPistero==='function') _setExprPistero(document.body.classList.contains('pistero-hablando')?'hablando':(on?'escuchando':'feliz')); }catch(e){} }
