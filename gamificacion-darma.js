function _co2Evitado(km){ return (km||0)*CO2_KG_POR_KM; }
function _arbolesEq(kg){ return Math.max(0,(kg||0)/CO2_KG_POR_ARBOL_ANIO); }
function _fmtCo2(kg){ return (kg>=1000)?((kg/1000).toFixed(2)+' t'):(Math.round(kg)+' kg'); }
var _esFundador=false, _miNumFundador=null;
function _cerrarBienvenida(){ try{ document.getElementById('userModal').classList.remove('on'); }catch(e){} }
async function _mostrarBienvenidaFundador(){
  try{
    // El guard de "solo una vez" ya se marcó de forma síncrona en el punto donde se
    // agenda este setTimeout (ver cu=cuVal más arriba) -- aquí solo queda validar que
    // seguimos con sesión.
    if(!cu) return;
    var CUPO=(typeof LP_FUNDADORES_CUPO!=='undefined'?LP_FUNDADORES_CUPO:1000);
    var num=(typeof _miNumFundador!=='undefined'&&_miNumFundador)?_miNumFundador:null;
    var es=(typeof _esFundador!=='undefined')?_esFundador:false;
    if(num==null){ try{ var me=await db.collection('users').doc(cu).get(); var ts=me.exists?me.data().createdAt:null; if(ts){ var agg=await db.collection('users').where('createdAt','<',ts).count().get(); num=(agg.data().count||0)+1; es=num<=CUPO; } }catch(e){} }
    var mt=document.getElementById('modalTitle'), mc=document.getElementById('modalContent'), um=document.getElementById('userModal');
    if(!mt||!mc||!um) return;
    var pist=(typeof _pistoNuevo==='function')?_pistoNuevo('contento').replace('<svg ','<svg width="78" height="65" '):'';
    var titulo, sub, benef='';
    if(es && num){ mt.innerHTML='<i class="fas fa-medal" style="color:#ffd700"></i> \u00a1Eres Socio Fundador!'; titulo='Socio Fundador'; sub='Eres de los primeros '+CUPO+'. Tu lugar es tuyo para siempre.'; benef='<ul style="font-size:0.8rem;color:#cdd6e6;line-height:1.7;margin:10px 0;padding-left:18px"><li>Insignia de fundador \u00fanica</li><li><b>Doble Darma</b> por cada acci\u00f3n</li><li>Prioridad y entradas extra en los sorteos</li><li>Acceso anticipado a lo nuevo</li></ul>'; }
    else { mt.innerHTML='<i class="fas fa-hands-clapping"></i> \u00a1Bienvenido!'; titulo='Ya eres parte de la comunidad'; sub='Bienvenido a Libre Pedal, el movimiento ciclista.'; }
    mc.innerHTML='<div style="text-align:center;margin-bottom:4px">'+pist+'</div>'+
      '<div style="text-align:center;font-weight:800;color:var(--g);font-size:1.05rem">'+titulo+'</div>'+
      '<div style="text-align:center;font-size:0.8rem;color:#9fb3c8;margin-top:4px">'+sub+'</div>'+benef+
      '<div style="border-top:1px solid #223;margin:12px 0 8px;padding-top:10px;font-size:0.78rem;color:#9fb3c8;line-height:1.9">'+
        '<div><i class="fas fa-location-dot" style="color:var(--p);width:22px"></i> Graba tus rutas sin apretar nada</div>'+
        '<div><i class="fas fa-comment-dots" style="color:var(--p);width:22px"></i> Pistero te acompa\u00f1a por voz</div>'+
        '<div><i class="fas fa-users" style="color:var(--p);width:22px"></i> Comunidad que se cuida (SOS y zonas rojas)</div>'+
        '<div><i class="fas fa-face-smile" style="color:var(--p);width:22px"></i> Personaliza tu Pistero en Perfil</div>'+
      '</div>'+
      '<button class="bg" onclick="_cerrarBienvenida()"><i class="fas fa-bicycle"></i> \u00a1A pedalear!</button>';
    um.classList.add('on');
  }catch(e){}
}
async function _cargarEstadoFundador(){ try{ if(!cu||typeof db==='undefined') return; try{ var _cf=JSON.parse(localStorage.getItem('lp_fundador_'+cu)||'null'); if(_cf){ _miNumFundador=_cf.no; _esFundador=!!_cf.es; } }catch(e){} const me=await db.collection('users').doc(cu).get(); const ts=me.exists?me.data().createdAt:null; if(!ts) return; const agg=await db.collection('users').where('createdAt','<',ts).count().get(); _miNumFundador=(agg.data().count||0)+1; _esFundador=_miNumFundador<=(typeof LP_FUNDADORES_CUPO!=='undefined'?LP_FUNDADORES_CUPO:1000); try{ localStorage.setItem('lp_fundador_'+cu, JSON.stringify({no:_miNumFundador,es:_esFundador})); }catch(e){} }catch(e){} }
function _ganarDarma(n){ var mult=_esFundador?2:1; us.d+=Math.round((n||0)*mult); if(typeof au==='function') au(); if(typeof sincronizarStats==='function') sincronizarStats(); }
// km de BICICLETA para confianza (ciclismo+cicloviaje+mtb; NO auto ni trekking) — pedido de Inty
function _kmBiciConfianza(){ var m=(us&&us.dm)||{}; var bike=(Number(m.ciclismo)||0)+(Number(m.cicloviaje)||0)+(Number(m.mtb)||0); if(bike<=0){ var modo=(typeof actividadTipo!=="undefined"&&actividadTipo)?actividadTipo:"ciclismo"; if(modo==="ciclismo"||modo==="cicloviaje"||modo==="mtb") return (us&&us.di)||0; } return bike; }
var LP_KM_CONFIANZA=10; // km de bici reales para acciones sensibles (anti cuentas falsas)
function _esCiclistaConfiable(){ return _kmBiciConfianza()>=LP_KM_CONFIANZA; }
function au(){
  // 2026-08-23: la grilla de 5 tarjetas (dt/cl/avgSpeed/totalTrips) + la barra de
  // Desempeño (performanceFill) SALIERON de Inicio (v-dash) por pedido de Inty: duplicaban
  // exactamente los mismos datos que ya vive completos en Estadísticas (v-stats,
  // statKm/statCal/statAvgSpeed/etc.) y en el HUD de la esfera. Los ids viejos se dejan
  // con guarda (if(el)) por si alguna vista vieja en caché todavía los tiene, en vez de
  // que au() reviente al no encontrarlos — pero el elemento nuevo es #dashResumenTxt,
  // una sola línea que resume km+viajes y lleva a Estadísticas si tocas ahí.
  var _dt=document.getElementById('dt'); if(_dt) _dt.innerText=us.di.toFixed(2);
  var _cl=document.getElementById('cl'); if(_cl) _cl.innerText=Math.round(us.c);
  if(us.d>50)us.n="Explorador"; if(us.d>150)us.n="Nómada"; if(us.d>500)us.n="Leyenda";
  document.getElementById('nv').innerText=us.n+" ("+us.d+")";
  var dd=document.getElementById('darmaDash'); if(dd) dd.innerText=us.d;
  var _avgS=document.getElementById('avgSpeed'); if(_avgS) _avgS.innerText=speedReadings.length>0?(speedReadings.reduce(function(a,b){return a+b;},0)/speedReadings.length).toFixed(1):'0';
  var _tt=document.getElementById('totalTrips'); var _tripsCompletos=_totalViajesCompletos(); if(_tt) _tt.innerText=_tripsCompletos;
  var _c2d=document.getElementById('co2Dash'); if(_c2d) _c2d.innerText=_fmtCo2(_co2Evitado(us.di));
  const perf=Math.min(100,Math.round((us.di/10)*100)); const pf=document.getElementById('performanceFill'); if(pf){ pf.style.width=perf+'%'; if(pf.parentElement) pf.parentElement.setAttribute('data-pct',perf+'%'); }
  var _resumen=document.getElementById('dashResumenTxt'); if(_resumen) _resumen.innerText=us.di.toFixed(1)+' km · '+_tripsCompletos+(_tripsCompletos===1?' viaje':' viajes');
  // 2026-08-24: renderMantencion() reconstruye el innerHTML de 5 tarjetas — solo
  // vale la pena si Taller es la pantalla que se está viendo ahora mismo. Antes
  // corría en CADA punto de GPS sin importar qué pantalla estuviera abierta (mapa,
  // esfera, lo que sea), gastando batería de más en cada viaje.
  // _mantencionRevisarAvisos() SÍ sigue corriendo siempre — ese es el punto: avisar
  // proactivo aunque no estés mirando Taller.
  try{
    if(typeof renderMantencion==='function'){ const _vMac=document.getElementById('v-mac'); if(_vMac && _vMac.classList.contains('on')) renderMantencion(); }
    if(typeof _mantencionRevisarAvisos==='function') _mantencionRevisarAvisos();
  }catch(e){}
  try{ if(_logrosListo&&typeof _chequearLogros==='function') _chequearLogros(false); }catch(e){} gd();
  // Sincroniza tu km total a la nube cada ~60s mientras avanzas (no en cada punto,
  // sería un montón de escrituras a Firestore). Antes esto SOLO pasaba en eventos
  // sueltos de Darma o al apagar el GPS libre — quien solo navegaba a un destino
  // (sin usar nunca el GPS libre) podía terminar viajes enteros sin que su km
  // llegara jamás a la nube: acumulaba distancia real, pero el ranking (que lee
  // el campo 'km' de Firestore) nunca se enteraba. Con esto el número en la nube
  // nunca queda más de un minuto atrás, pase lo que pase con la app después.
  const _ahoraSync=Date.now();
  if(cu && (_ahoraSync-_ultimoSyncStats)>60000){ _ultimoSyncStats=_ahoraSync; if(typeof sincronizarStats==='function') sincronizarStats(); }
}
