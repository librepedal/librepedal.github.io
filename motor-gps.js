

/* GPS NATIVO EN SEGUNDO PLANO (solo en la app Android con Capacitor).
   Corre un Foreground Service que entrega la ubicación AUNQUE LA PANTALLA ESTÉ
   APAGADA, y la inyecta en el mismo motor (ug) que usa la versión web.
   En la web no hace nada: disponible() devuelve false. */
const lpBackgroundGeo = (function(){
  let watcherId=null, BG=null;
  function getBG(){ if(!BG){ BG=lpPlugin('BackgroundGeolocation'); } return BG; }
  return {
    disponible: function(){ return !!getBG(); },
    // onLocation es opcional: si no se pasa, alimenta el registro simple (ug).
    // La navegación turn-by-turn pasa su propio manejador para seguir guiando con la pantalla apagada.
    start: async function(onLocation){
      const bg=getBG(); if(!bg || watcherId) return;
      const cb = onLocation || function(location){ if(typeof ug==='function') ug({coords:{latitude:location.latitude, longitude:location.longitude, accuracy:location.accuracy, speed:location.speed, altitude:location.altitude}}); };
      // Con Ahorro GPS activo pedimos fixes cada 25m en vez de 8m: bastante menos
      // preciso en curvas cerradas, pero muchas menos lecturas de GPS = más batería
      // para viajes largos. El usuario elige el trade-off desde Inicio.
      const df=(typeof gpsAhorro!=='undefined' && gpsAhorro) ? 25 : 8;
      try{
        watcherId = await bg.addWatcher({
          backgroundMessage: "Registrando tu ruta. Toca para volver a Libre Pedal.",
          backgroundTitle: "Libre Pedal pedaleando contigo 🚴",
          requestPermissions: true,
          stale: false,
          distanceFilter: df
        }, function(location, error){
          if(error || !location) return;
          cb(location);
        });
      }catch(e){}
    },
    restart: async function(onLocation){ await this.stop(); await this.start(onLocation); },
    stop: async function(){ if(BG && watcherId){ try{ await BG.removeWatcher({id:watcherId}); }catch(e){} watcherId=null; } },
    _p:function(){ return getBG(); }
  };
})();
// v7.27 — queja real de Inty: la app NO debe grabar el viaje ni pedir el micrófono al ABRIR.
// Antes esta función arrancaba el GPS solo (toggleGPS) y "precalentaba" el micrófono apenas
// entrabas — se sentía que te grababa y espiaba desde el inicio. Ahora el GPS/grabación arranca
// SOLO cuando tú lo decides (botón Iniciar GPS, o al pedir una ruta) y el micrófono se pide
// recién cuando tocas el botón de voz. El modo fantasma sigue siendo el control de privacidad
// de la posición publicada.
function solicitarPermisosEsenciales(){
  /* A propósito NO arranca el GPS ni pide el micrófono al abrir la app (ver comentario arriba). */
}
function _actualizarBtnGPS(){
  const btn=document.getElementById('btnGPSLibre'); if(!btn) return;
  /* Rediseño 2026-07-29: sin verde loud (compite con "Iniciar navegación" y rompe el acento único).
     Reposo = secundario tonal; grabando = tinte rojo compacto (afordancia clara de "toca para parar"). */
  if(ig){ btn.innerHTML='<i class="fas fa-stop"></i> Detener grabación'; btn.style.background='rgba(220,38,38,0.18)'; btn.style.borderColor='rgba(220,38,38,0.5)'; btn.style.color='#ff9d9d'; }
  else { btn.innerHTML='<i class="fas fa-location-dot"></i> Grabar un paseo'; btn.style.background=''; btn.style.borderColor=''; btn.style.color=''; }
}
// silencioso: cuando el GPS se prende SOLO (al iniciar sesión, para grabar sin que
// tengas que acordarte de apretar un botón — ver solicitarPermisosEsenciales), no
// tiene sentido que Pistero anuncie "estoy grabando tu viaje" ni te recuerde revisar
// la presión de las ruedas apenas abres la app: quejas reales de Inty, esos avisos
// solo deberían sonar cuando el viaje arranca de verdad (tocas el botón, o pides una
// ruta). El GPS sigue grabando igual en silencio; solo se calla el aviso inmediato.
function toggleGPS(silencioso){
  const btn=document.getElementById('btnGPSLibre');
  if(!ig){
    rutaDocId=null; puntosGuardados=0; spAnterior=0;
    _logrosDelViaje=[]; _kmEsteViaje=0; // arranca el conteo del resumen de este viaje
    ultimoMovimientoTime=Date.now(); rutaSegCerrada=true; rutaSegDistIni=us.di;
    // Reinicia el reloj de "parado" al prender el GPS: si no, como este reloj
    // arranca en 0 en una sesión nueva, el aviso de "revisa la bici/pinchazo"
    // se disparaba de inmediato con solo estar quieto un instante (ej. mientras
    // se ve el tutorial recién logueado, sin haber pedaleado nada todavía).
    lastFraseParadoTime=Date.now();
    viajePausedMs=0; viajePausedDesde=null; posHistory=[]; vueltasRegistradas=[]; _gpsBadgeToggle('dashPausaBadge', false);
    pendienteHistory=[]; zonaPendienteActual='plano'; tFraseSubida=0; tFraseBajada=0;
    puntosAvisados=new Set(); reportesAvisados=new Set();
    _avisoLluviaHecho=false; _ultimoChequeoLluvia=0; _fatigaBuffer=[]; _avisoFatigaHecho=false; _velPromInicioFatiga=null;
    segmentosCargados=false; segmentosActivos=[]; segmentosEstado={};
    try{ if(window.PisteroMemoria) PisteroMemoria.registrarInicioViaje(); }catch(e){}
    iniciarDeteccionCaidas();
    if(lpBackgroundGeo.disponible()){
      lpBackgroundGeo.start(); ig=true;
      if(btn){ btn.innerHTML="<i class='fas fa-stop'></i> Detener grabación"; btn.style.background="rgba(220,38,38,0.18)"; btn.style.borderColor="rgba(220,38,38,0.5)"; btn.style.color="#ff9d9d"; }
      currentRoute=[]; crl=mlPolyline([],{color:'#ffd700',weight:3,opacity:0.95}).addTo(mp);
      lpWakeLock.enable(silencioso);
      tripStartTime=Date.now(); _iniciarCronometroDash();
      _subUnaVez('reportes', subscribeToReportes); /* 2026-08-23: al grabar SI hacen falta aunque no hayas abierto el mapa (avisos de peligro/zona de Pistero) */
      if(!silencioso) _prevueloPistero(true);
    } else if("geolocation" in navigator){
      gw=navigator.geolocation.watchPosition(ug,hg,gpsAhorro?{enableHighAccuracy:false,maximumAge:8000,timeout:15000}:{enableHighAccuracy:true,maximumAge:1000});
      ig=true; if(btn){ btn.innerHTML="<i class='fas fa-stop'></i> Detener grabación"; btn.style.background="rgba(220,38,38,0.18)"; btn.style.borderColor="rgba(220,38,38,0.5)"; btn.style.color="#ff9d9d"; }
      currentRoute=[]; crl=mlPolyline([],{color:'#ffd700',weight:3,opacity:0.95}).addTo(mp);
      lpWakeLock.enable(silencioso);
      tripStartTime=Date.now(); _iniciarCronometroDash();
      _subUnaVez('reportes', subscribeToReportes); /* 2026-08-23: al grabar SI hacen falta aunque no hayas abierto el mapa (avisos de peligro/zona de Pistero) */
      if(!silencioso) _prevueloPistero(false);
    } else { lpAviso("Tu dispositivo no soporta GPS"); }
    // Aviso ÚNICO (2026-08, bug ruta = línea recta): en Android el rastreo con la pantalla
    // apagada/bolsillo necesita ubicación en "Permitir siempre". El permiso normal solo graba
    // con la app abierta y deja el track como una recta entre inicio y fin. Se muestra 1 sola vez.
    try{ if(!localStorage.getItem('lp_tip_bg_ubic')){ localStorage.setItem('lp_tip_bg_ubic','1'); setTimeout(function(){ lpAviso('Consejo: para que se grabe tu ruta con la pantalla apagada, activa la Ubicación en "Permitir siempre" en los ajustes del teléfono. Con el permiso normal, el trazado puede quedar como una línea recta.'); }, 4500); } }catch(e){}
  } else {
    if(lpBackgroundGeo.disponible()){ lpBackgroundGeo.stop(); } else if(gw){ navigator.geolocation.clearWatch(gw); }
    ig=false; _lpWLoff(); detenerDeteccionCaidas(); _detenerCronometroDash();
    if(liveTrackActivo){ liveTrackActivo=false; _actualizarBtnSeguimientoVivo(); if(liveTrackId) db.collection('liveTracking').doc(liveTrackId).update({activo:false}).catch(function(){}); }
    if(btn){ btn.innerHTML="<i class='fas fa-location-dot'></i> Grabar un paseo"; btn.style.background=""; btn.style.borderColor=""; btn.style.color=""; }
    if(currentRoute.length>1){ autoGuardarRuta(false,false); }
    sincronizarStats();
    if(cu&&!ghostMode){ db.collection('users').doc(cu).set({lat:null,lon:null},{merge:true}); _rtdOcultarPosicion(); }
    try{ if(_logrosListo) _chequearLogros(false); }catch(e){} // por si algo cruzó el umbral justo con el último dato sincronizado
    try{ _mostrarResumenViaje(); }catch(e){}
  }
}
function toggleSaver(){
  const s=document.getElementById('saver'); if(!s) return;
  const on=s.classList.toggle('on');
  if(on){
    if(typeof lpWakeLock==='object') lpWakeLock.enable();
    const sp=document.getElementById('spd'); document.getElementById('saverSpd').innerText=sp?sp.innerText:'0';
    document.getElementById('saverKm').innerText=us.di.toFixed(2);
    h("Modo ahorro activado. Sigo guiándote por voz; la pantalla queda al mínimo. Toca para volver.");
  } else {
    // Si activaste "Ahorro pantalla" SIN tener el GPS ni la navegación corriendo
    // (el botón está siempre disponible en Ajustes, no depende de eso), el wake
    // lock que pidió esta misma función nunca se soltaba al salir — el teléfono
    // se quedaba sin poder apagar la pantalla solo nunca más. Si el GPS libre o
    // la navegación SÍ siguen activos, no se toca: son ellos quienes lo necesitan
    // y lo sueltan cuando corresponda (ver toggleGPS / endNavigation).
    const navActivo = document.getElementById('nav-screen') && document.getElementById('nav-screen').classList.contains('active');
    _lpWLoff();
  }
}
// Bromas/comentarios del camino. Se llama en AMBOS modos: GPS libre (ug) y navegación a destino (_navPosUpdate).
// Si Pistero está ocupado, NO gasta la broma: se reintenta en el próximo fix (no se pierden).
// kmRutaTotal: SOLO lo manda quien navega a un destino trazado (funciones-mapa-viajes.js
// pasa routeTotalDistance, conocido desde que OSRM traza la ruta A->B). En GPS libre no
// se conoce de antemano cuánto se va a andar, así que se omite y el intervalo queda fijo.
// Por qué existe (2026-09-03, reporte de Inty: "no quiero que esté bromeando todo el
// tiempo... hay que considerar la cantidad de frases según los km que se recorran"): con
// el intervalo fijo de 1.5 km, una ruta de 120 km (caso real de un tester) permitía hasta
// 80 disparos de broma en carretera -- se sentía como charla constante. BROMAS_OBJETIVO_RUTA
// fija cuántas bromas "de ritmo" tiene sentido para una ruta ENTERA, sin importar qué tan
// larga sea, y de ahí se deriva el espaciado real: rutas cortas ya quedaban bien con el
// mínimo de 1.5 km (nunca da tiempo a exagerar), rutas largas ahora se espacian de verdad.
const BROMAS_OBJETIVO_RUTA=10;
function bromasDelCamino(sp, kmRutaTotal){
  if(!vozActiva) return;
  if(vozOcupada()||vozCola.length) return;
  const _cm=(typeof _charlaMult==='function')?_charlaMult():1; // "cuánto habla Pistero" (Ajustes): escala la cadencia
  const _kmEntreFrases=(typeof kmRutaTotal==='number' && kmRutaTotal>0) ? Math.max(1.5, kmRutaTotal/BROMAS_OBJETIVO_RUTA) : 1.5;
  if(sp===0){
    if(Date.now()-lastFraseParadoTime>=1200000*_cm){ const _fr=obtenerFraseUnica('parado'); if(_fr){ h(_fr); lastFraseParadoTime=Date.now(); } } // parado
  } else if(zonaActual==='ciudad'){
    if(Date.now()-tFraseCiudad>=240000*_cm){ const _fr=(Math.random()<0.25)?obtenerFraseUnica('profunda'):obtenerFraseUnica('ciudad'); if(_fr){ h(_fr); tFraseCiudad=Date.now(); } } // ciudad
  } else {
    if(us.di-kmUltimaFrase>=_kmEntreFrases*_cm){ const _fr=(sp<18&&Math.random()<0.3)?obtenerFraseUnica('profunda'):obtenerFrasePorVelocidad(sp); if(_fr){ h(_fr); kmUltimaFrase=us.di; } } // carretera
  }
  /* Auditoria 2026-07-20: el banco `motivacional` estaba escrito y traducido a 4 paises
     (cl/ar/mx/es/co) y NADIE lo pedia nunca -> frases que el usuario jamas iba a oir.
     Se conecta al hito de cada 10 km, que hoy pasaba en silencio: cruzar una decena es
     logro y merece que el Pistero lo note. Va fuera del if/else para que valga en ciudad
     y en carretera, y con su propio contador para no competir con las frases de ritmo. */
  /* Bug encontrado de paso: kmUltimaFrase NO se reseteaba en ningun lado. Tras un viaje
     largo quedaba alto y en el viaje siguiente la condicion (us.di - kmUltimaFrase >= 1.5)
     era falsa durante kilometros: el Pistero se quedaba mudo al empezar de nuevo. En vez
     de enganchar cada punto de inicio (hay varios: startQuickTrip, startNavigation,
     saveAndStartTrip...), se detecta solo el reinicio viendo que la distancia retroceda. */
  if(us.di+0.05 < kmUltimaFrase || us.di < _ultimoHitoKm*10){ kmUltimaFrase=0; _ultimoHitoKm=0; }
  const _hito=Math.floor(us.di/10);
  if(_hito>0 && _hito>_ultimoHitoKm){
    _ultimoHitoKm=_hito;
    const _fh=obtenerFraseUnica('motivacional');
    if(_fh) h((_hito*10)+' kilómetros. '+_fh);
  }
}
/* ===== PENDIENTE EN VIVO: usa la altitud del GPS (misma fuente del perfil de
   elevación) para detectar que vas subiendo o bajando, y comentarlo. El buffer
   guarda solo los puntos de los últimos ~120m (por distancia, no por tiempo: a
   6km/h una subida corta igual necesita unos segundos para acumular distancia
   suficiente y no confundir ruido del GPS con una pendiente real). */
let pendienteHistory=[], navPendienteHistory=[];
function _actualizarPendienteHistory(buffer, lat, lon, alt){
  if(alt==null || isNaN(alt)) return;
  buffer.push({lat:lat,lon:lon,alt:alt});
  while(buffer.length>2 && calculateDistance(buffer[0].lat,buffer[0].lon,buffer[buffer.length-1].lat,buffer[buffer.length-1].lon)>90) buffer.shift();
}
// Respaldo de altitud: varios Android no reportan p.coords.altitude (queda null todo
// el viaje), y sin altitud nunca se arma el buffer de pendiente. Cuando pasa eso, se
// pide una altitud aproximada a Open-Meteo (gratis, sin key) cada ~45s como respaldo,
// nada más que para poder seguir detectando subidas/bajadas.
let navUltimoFallbackAlt=0, navFallbackAltEnCurso=false;
function _altitudConFallback(buffer, lat, lon, altitudeGPS){
  if(altitudeGPS!=null && !isNaN(altitudeGPS)){ _actualizarPendienteHistory(buffer, lat, lon, altitudeGPS); return; }
  const ahora=Date.now();
  if(navFallbackAltEnCurso || ahora-navUltimoFallbackAlt<20000) return;
  navFallbackAltEnCurso=true; navUltimoFallbackAlt=ahora;
  fetch('https://api.open-meteo.com/v1/elevation?latitude='+lat+'&longitude='+lon)
    .then(function(r){ return r.json(); })
    .then(function(d){ const alt=(d && d.elevation && d.elevation[0]!=null)?d.elevation[0]:null; if(alt!=null) _actualizarPendienteHistory(buffer, lat, lon, alt); })
    .catch(function(){})
    .finally(function(){ navFallbackAltEnCurso=false; });
}
function calcularPendienteActual(buffer){
  if(buffer.length<5) return null;
  const dist=calculateDistance(buffer[0].lat,buffer[0].lon,buffer[buffer.length-1].lat,buffer[buffer.length-1].lon);
  if(dist<35) return null; // span mínimo para que el ruido de altitud no invente pendientes falsas
  // promedia los 2 primeros y 2 últimos puntos para no dejarse engañar por un solo salto de altitud
  const altIni=(buffer[0].alt+buffer[1].alt)/2, altFin=(buffer[buffer.length-1].alt+buffer[buffer.length-2].alt)/2;
  return ((altFin-altIni)/dist)*100; // % de pendiente
}
// Zona de pendiente con histéresis (entra en subida/bajada con umbral más alto que
// el que usa para salir) para no estar cambiando de opinión con cada fix del GPS.
let zonaPendienteActual='plano', tFraseSubida=0, tFraseBajada=0;
function comentarPendiente(buffer, sp){
  if(sp===0) return; // parado no hay pendiente que comentar
  const pend=calcularPendienteActual(buffer);
  if(pend==null) return;
  try{ if(window.PisteroMemoria) PisteroMemoria.registrarEsfuerzoSubida(sp, pend); }catch(e){}
  const umbral=_umbralPendiente(), salida=umbral/2; // salir de la zona con la mitad del umbral de entrada (histéresis)
  let zonaNueva=zonaPendienteActual;
  if(zonaPendienteActual==='subida'){ if(pend<salida) zonaNueva='plano'; }
  else if(zonaPendienteActual==='bajada'){ if(pend>-salida) zonaNueva='plano'; }
  else { if(pend>umbral) zonaNueva='subida'; else if(pend<-umbral) zonaNueva='bajada'; }
  if(zonaNueva===zonaPendienteActual) return;
  zonaPendienteActual=zonaNueva;
  if(!vozActiva || vozOcupada() || vozCola.length) return;
  if(zonaNueva==='subida' && Date.now()-tFraseSubida>=180000){ const _fr=obtenerFraseUnica('subida'); if(_fr){ h(_fr); tFraseSubida=Date.now(); } }
  else if(zonaNueva==='bajada' && Date.now()-tFraseBajada>=180000){ const _fr=obtenerFraseUnica('bajada'); if(_fr){ h(_fr); tFraseBajada=Date.now(); } }
}
// Antes esto se descartaba en silencio: con mala señal (dentro de un edificio, entre
// cerros, día nublado) la velocidad se quedaba pegada sin ninguna explicación. Ahora
// se avisa con una insignia mientras dura, y desaparece sola apenas el GPS mejora.
function _gpsBadgeToggle(id, mostrar){ const el=document.getElementById(id); if(el) el.style.display=mostrar?'inline-flex':'none'; }
// Techo de velocidad plausible entre dos fixes de GPS: si un salto de posición
// implica ir más rápido que esto, es ruido/corrupción del GPS (rebote de señal al
// salir de un túnel, error del chip), no un desplazamiento real — se descarta ANTES
// de sumarlo al kilometraje, que si no queda corrupto para siempre (silenciosamente,
// sin ningún error visible). 90 km/h cubre hasta la bajada más rápida en bici; en modo
// moto/auto se permite más.
function _velMaxPlausibleKmh(){ return (typeof actividadTipo!=='undefined' && actividadTipo==='moto') ? 200 : 90; }
function _saltoEsPlausible(distMetros, msTranscurridos){
  if(!msTranscurridos || msTranscurridos<=0) return true; // sin referencia de tiempo confiable, no hay como objetar
  const kmh=(distMetros/1000)/(msTranscurridos/3600000);
  return kmh<=_velMaxPlausibleKmh();
}
// ===== Velocidad RIGUROSA: reporte real de un ciclista/conductor — iba a 70 km/h
// y la app marcaba más de 100. Causa: la velocidad en pantalla se calculaba SOLO
// comparando posiciones (centroide de los últimos ~10-15s) e ignoraba por completo
// coords.speed, la velocidad que el propio chip GPS mide por efecto Doppler — mucho
// más precisa que derivar de la posición, sobre todo a velocidad de auto, donde el
// margen de error normal del GPS (5-20 m) pesa menos sobre el Doppler que sobre una
// resta de posiciones en una ventana corta. Ahora se prioriza coords.speed cuando el
// dispositivo lo entrega (y pasa el techo de plausibilidad); el cálculo por posición
// queda solo como respaldo para cuando el GPS no lo entrega (pasa en algunos
// navegadores/chips).
function _velocidadHardware(speedMs){
  if(speedMs==null || !Number.isFinite(speedMs)) return null; // el dispositivo no entrega este dato: sin info, toca usar el cálculo por posición
  if(speedMs<=0.7) return 0; // el propio chip GPS dice que estás prácticamente detenido
  return speedMs*3.6;
}
// Segunda capa de rigor, para cuando SÍ toca calcular por posición (respaldo): un
// solo fix con rebote de señal (multipath típico en autopista, túneles, cañones
// urbanos) puede colar un salto imposible dentro de la ventana de 2-4 puntos que
// usa velocidadVentana() y corromper el promedio entero. Se descarta ANTES de
// entrar a la ventana, igual que ya se hace con el kilometraje acumulado.
function _filtrarSaltoVentana(historyArr, punto){
  if(!historyArr.length) return true;
  const last=historyArr[historyArr.length-1];
  const dtMs=(punto.t||punto.timestamp)-(last.t||last.timestamp);
  if(dtMs<=0) return true; // sin referencia de tiempo confiable, no hay como objetar
  if(dtMs>20000) return true; // último punto muy viejo (señal cortada un rato): re-ancla en vez de quedar pegado comparando contra algo obsoleto
  return _saltoEsPlausible(calculateDistance(last.lat,last.lon,punto.lat,punto.lon), dtMs);
}
function ug(p){
  // Bug real (2026-08-31): sin esta guarda, un fix de GPS que ya venía en camino cuando se
  // apaga/oculta el GPS (clearWatch no cancela una lectura en vuelo -- borde real en
  // algunos Android) podía ejecutar igual toda la función, incluida la escritura de
  // "visible:true" con lat/lon reales más abajo -- sin orden garantizado contra la escritura
  // de "ocultar" (lat/lon null) del botón, dejando un pin fantasma con la última posición
  // real hasta el próximo fix o refresco, pese a haber detenido/ocultado el GPS a propósito.
  if(!ig) return;
  const la=p.coords.latitude, lo=p.coords.longitude;
  // Descarta fixes con coordenadas corruptas (null/NaN, típico con señal muy débil en
  // Android): sin este chequeo, null se convierte en 0 al hacer cuentas y la distancia
  // al (0,0) se suma de golpe al kilometraje total, silenciosamente, sin ningún error.
  if(!Number.isFinite(la) || !Number.isFinite(lo)) return;
  // Descarta fixes imprecisos: el GPS "salta" varios metros aunque estés quieto.
  // OJO (2026-08: reporte de Inty, ruta grabada como LÍNEA RECTA de un punto a otro): el
  // umbral de 35 m era demasiado estricto. En ciudad, al arrancar o con día nublado el GPS
  // reporta 40-60 m de precisión REAL (no ruido), y botábamos casi todos los puntos → el
  // track quedaba con solo inicio y fin = recta. Se sube a 65 m para no perder el trazado.
  // La distancia/km NO se infla por esto: más abajo solo se suma con sp>0 (movimiento real
  // confirmado por la ventana de velocidad) y _saltoEsPlausible, que ya filtran el ruido.
  if(p.coords.accuracy && p.coords.accuracy>65){ _gpsBadgeToggle('gpsSignalBadge', true); return; }
  _gpsBadgeToggle('gpsSignalBadge', false);
  const moved = us.la ? gd2(us.la,us.lo,la,lo) : 0; // km desde el último punto válido
  const _msDesdeUltimoFix=lastFixTime?(Date.now()-lastFixTime):0; // para el chequeo de velocidad plausible más abajo
  // Bug real (2026-08-30, reporte de Inty "marcó mi posición superlejos de donde estaba"):
  // este chequeo de plausibilidad SOLO protegía el kilometraje sumado (más abajo) — el
  // marcador visual, el track guardado y la posición publicada para otros ciclistas se
  // actualizaban con el fix crudo SIN pasar por ningún filtro, así que un solo glitch del
  // chip GPS (multipath/rebote de señal, con accuracy reportada igual <=65m) teletransportaba
  // el punto azul en el mapa. us.la/us.lo se siguen re-anclando SIEMPRE más abajo (para que
  // el próximo fix compare bien), así que si el salto es real y sostenido el marcador se pone
  // al día solo, con un atraso de un único fix (1-2s) — no se queda pegado.
  const _saltoPosOK = !us.la || _saltoEsPlausible(moved*1000, _msDesdeUltimoFix);
  // VELOCIDAD VERIFICADA POR DESPLAZAMIENTO REAL (ventana ~10s). Es la fuente de
  // verdad para saber SI te estás moviendo: promedia el ruido del GPS. Si en 10s no
  // nos desplazamos de verdad, estamos QUIETOS aunque el GPS reporte velocidad
  // fantasma (caso casa) — este chequeo se mantiene igual que siempre.
  const _nuevoPunto={lat:la,lon:lo,t:Date.now()};
  if(_filtrarSaltoVentana(posHistory, _nuevoPunto)) posHistory.push(_nuevoPunto);
  while(posHistory.length>1 && (Date.now()-posHistory[0].t)>12000) posHistory.shift();
  _altitudConFallback(pendienteHistory, la, lo, p.coords.altitude);
  // El piso queda en 6 (no en 4, aunque "lento" arranque ahí en la categoría): bajarlo
  // a 4 dejaba pasar ruido del GPS como si fuera movimiento real estando quieto, y por
  // eso nunca se detectaba "parado" (que habla cada 20 min) — se quedaba pegado en modo
  // ciudad/carretera, que comenta mucho más seguido.
  const spVentana=velocidadVentana(posHistory);
  const _spBase = (spVentana<6) ? 0 : spVentana;
  // Reporte real de un ciclista/conductor: iba a 70 km/h y la app marcaba más de
  // 100. Una vez que la ventana por posición YA confirmó que hay movimiento real
  // (_spBase>0, protege contra la velocidad fantasma estando parado), preferimos
  // coords.speed — la velocidad Doppler del propio chip GPS — para el NÚMERO
  // exacto: a velocidad de auto, el margen de error normal del GPS pesa mucho más
  // sobre una resta de posiciones en una ventana corta que sobre el Doppler.
  const _velHW=_velocidadHardware(p.coords.speed);
  let sp = (_spBase>0 && _velHW!=null && _velHW<=_velMaxPlausibleKmh()) ? _velHW : _spBase;
  lastFixTime=Date.now();
  document.getElementById('spd').innerText=Math.round(sp);
  { const _sv=document.getElementById('saverSpd'); if(_sv) _sv.innerText=Math.round(sp); }
  updateSpeedStatus(sp);
  _actualizarPausaViaje(sp, 'dashPausaBadge');
  if(_saltoPosOK) _actualizarLiveTrack(la,lo);
  if(!segmentosCargados){ segmentosCargados=true; iniciarSeguimientoSegmentos(la,lo); } else { _verificarSegmentos(la,lo); }
  if(sp>maxSpeed) maxSpeed=sp;
  speedReadings.push(sp);
  // Al DETENERTE (pasar de moverte a 0), guarda automáticamente la ruta hecha (checkpoint).
  if(sp===0 && spAnterior>0 && currentRoute.length>=2 && currentRoute.length>puntosGuardados){ autoGuardarRuta(true,true); }
  if(sp>0){ ultimoMovimientoTime=Date.now(); rutaSegCerrada=false; }
  try{ if(window.PisteroMemoria) PisteroMemoria.registrarParada(sp, spAnterior); }catch(e){}
  spAnterior=sp;
  // Bromas segun velocidad: se disparan para TODAS las velocidades (parado, lento,
  // normal, rapido). El throttle interno de obtenerFraseUnica evita el spam.
  actualizarZona(la,lo); // detecta ciudad/carretera en segundo plano
  bromasDelCamino(sp);
  comentarPendiente(pendienteHistory, sp);
  _detectarModoEquivocado(sp); // también en GPS libre, no solo navegando a un destino
  avisarPuntosCercanos(la,lo,sp);
  avisarReportesCercanos(la,lo,sp);
  _avisoLluviaProactivo(la,lo); vigilarClima(la,lo);
  _verificarFatiga(tiempoActivoMs(), sp);
  // JITTER: ignora desplazamientos < 12 m (deriva del GPS estando parado).
  if(us.la && moved<0.012){ return; }
  // Salto implausible (rebote de señal, glitch del chip GPS): no lo sumamos al
  // kilometraje, pero igual re-anclamos la posición para que el PRÓXIMO fix se
  // calcule bien (si no, un solo glitch dejaría todos los fixes siguientes también
  // "implausibles" por comparar contra un punto viejo).
  // Reporte real: parado, la app sumó 0,3 km solo. Causa: este chequeo comparaba
  // SOLO dos puntos consecutivos — el ruido normal del GPS estando quieto (puede
  // "saltar" 15-30 m sin moverte nada) pasa esa comparación de a poco, aunque
  // "sp" (la velocidad YA calculada arriba con la ventana de varios puntos, que
  // promedia y cancela justo ese ruido) muestre 0 = estás parado de verdad. Se
  // agrega sp>0 como condición: solo suma kilometraje cuando la propia app ya
  // confirmó que hay movimiento real, no solo que un par de puntos lo sugieren.
  if(us.la && sp>0 && _saltoPosOK){ us.di+=moved; _kmEsteViaje+=moved; _sumarKmModo(moved); _sumarKmMantencion(moved); us.c+=(moved*30); au(); const _sk=document.getElementById('saverKm'); if(_sk) _sk.innerText=us.di.toFixed(2); }
  us.la=la; us.lo=lo;
  if(typeof _chequearZonaRoja==='function') _chequearZonaRoja(la,lo);
  if(typeof _chequearCofre==='function') _chequearCofre(la,lo,sp);
  // Todo lo visual/publicado (track guardado, marcador, posición que ven otros ciclistas)
  // solo se mueve con fixes plausibles — el glitch descartado no entra al historial.
  if(_saltoPosOK){
    currentRoute.push({lat:la,lon:lo,t:Date.now(),alt:(p.coords.altitude!=null?p.coords.altitude:null)});
    if(crl){ crl.addLatLng([la,lo]); mp.fitBounds(crl.getBounds(),{padding:[50,50]}); }
    if(cu&&!ghostMode){ if(!lastPos||gd2(lastPos.lat,lastPos.lon,la,lo)>=0.05){ const plat=Math.round(la*100)/100, plon=Math.round(lo*100)/100; /* precisión ~1 km: privacidad, no revela tu ubicación exacta */ db.collection('users').doc(cu).set({lat:plat,lon:plon,lastUpdate:firebase.firestore.FieldValue.serverTimestamp(),visible:true},{merge:true}); _rtdPublicarPosicion(plat, plon); lastPos={lat:la,lon:lo}; } }
  }
  /* (las bromas por velocidad ahora se disparan mas arriba, para todas las velocidades) */
}
// ===== ZONAS ROJAS: sectores marcados como inseguros para ciclistas (multi-ciudad).
// Referenciales (fuentes: CIPER "puntos de violencia", prensa) + se afinan con reportes
// de la comunidad. Pistero avisa al acercarse, prioridad INFO (no pisa giros ni seguridad).
var ZONAS_ROJAS=[
  {n:'Barrio Meiggs', lat:-33.4515, lon:-70.6790, r:0.7, ciudad:'Santiago'},
  {n:'Estación Central', lat:-33.4525, lon:-70.6790, r:0.6, ciudad:'Santiago'},
  {n:'Plaza de Armas', lat:-33.4378, lon:-70.6504, r:0.5, ciudad:'Santiago'},
  {n:'Patronato y La Vega', lat:-33.4295, lon:-70.6480, r:0.5, ciudad:'Santiago'},
  {n:'Plaza Baquedano', lat:-33.4373, lon:-70.6345, r:0.5, ciudad:'Santiago'},
  {n:'el centro de Valparaíso', lat:-33.0458, lon:-71.6197, r:0.7, ciudad:'Valparaíso'},
  {n:'Avenida Argentina, Valparaíso', lat:-33.0472, lon:-71.6021, r:0.5, ciudad:'Valparaíso'},
  {n:'el centro de Viña del Mar', lat:-33.0245, lon:-71.5518, r:0.4, ciudad:'Viña del Mar'},
  {n:'el centro de Concepción', lat:-36.8270, lon:-73.0503, r:0.5, ciudad:'Concepción'},
  {n:'el centro de Antofagasta', lat:-23.6509, lon:-70.3975, r:0.5, ciudad:'Antofagasta'},
  {n:'el centro de Coquimbo', lat:-29.9533, lon:-71.3436, r:0.4, ciudad:'Coquimbo'},
  {n:'el centro de Temuco', lat:-38.7359, lon:-72.5904, r:0.4, ciudad:'Temuco'},
  {n:'el centro de Iquique', lat:-20.2140, lon:-70.1520, r:0.4, ciudad:'Iquique'},
  {n:'el centro de Rancagua', lat:-34.1708, lon:-70.7444, r:0.4, ciudad:'Rancagua'}
];
var _zrAviso={};
function _chequearZonaRoja(la,lo){
  if(!(la&&lo)||typeof gd2!=='function'||typeof ZONAS_ROJAS==='undefined') return;
  try{
    for(var i=0;i<ZONAS_ROJAS.length;i++){
      var z=ZONAS_ROJAS[i];
      if(gd2(la,lo,z.lat,z.lon)<=z.r){
        var now=Date.now();
        if(!_zrAviso[z.n] || (now-_zrAviso[z.n])>600000){
          _zrAviso[z.n]=now;
          try{ _pisteroMood='preocupado'; }catch(e){}
          h('Ojo: estás entrando a '+z.n+', un sector marcado como inseguro para ciclistas. Mantente atento, no te detengas si no hace falta y evalúa una ruta alternativa.', PRIO_VOZ.INFO);
        }
        return; // uno a la vez, no encadena avisos
      }
    }
  }catch(e){}
}
var _zrMarkers=[];
function _dibujarZonasRojas(){
  if(!mp || typeof ZONAS_ROJAS==='undefined' || typeof mlMarker!=='function') return;
  try{
    _zrMarkers.forEach(function(m){ try{ mp.removeLayer(m); }catch(e){} }); _zrMarkers=[];
    // Mismo umbral de ~30 km de escala visible que agua/miradores/alertas (pedido de
    // Inty, 2026-08-22): a escala país/mundo, las zonas de riesgo saturaban el mapa
    // igual que antes lo hacían los POI — ahora respetan el mismo protocolo visual.
    if(typeof _escalaVisibleKm==='function' && _escalaVisibleKm(mp)>30) return;
    ZONAS_ROJAS.forEach(function(z){
      try{
        var mk=mlMarker([z.lat,z.lon],{icon:{html:lpBadgeHTML('<i class="fas fa-triangle-exclamation" style="color:#ff6b6b"></i>','#ff3b3b')}}).addTo(mp)
          .bindPopup('<b style="color:#ff5a5a"><i class="fas fa-triangle-exclamation"></i> Zona de riesgo</b><br>'+escapeHTML(z.n)+'<br><small style="color:#888">Sector marcado como inseguro para ciclistas. Mantente atento y evita detenerte.</small>');
        _zrMarkers.push(mk);
      }catch(e){}
    });
  }catch(e){}
}
// ===== COFRES OCULTOS: premios sorpresa en tramos aleatorios y poco recorridos.
// DORMIDO hasta LP_COFRES_ACTIVAR usuarios. Los cofres se definen por hash de la celda
// del mapa (aleatorio pero consistente, impredecible). 1 de cada LP_COFRE_RAREZA celdas.
// Cada cofre se reclama UNA vez por usuario -> repetir tu ruta no sirve, explorar si.
var LP_COFRES_ACTIVAR=3000, LP_COFRE_CELDA=0.0045, LP_COFRE_RAREZA=400;
var _cofresActivos=false, _cofreCheckTs=0;
async function _cargarEstadoCofres(){ try{ if(typeof _totalUsuariosSuscritos!=='function') return; var t=await _totalUsuariosSuscritos(); _cofresActivos=(t>=LP_COFRES_ACTIVAR); }catch(e){} }
function _hashCelda(str){ var h=5381; for(var i=0;i<str.length;i++){ h=((h<<5)+h+str.charCodeAt(i))>>>0; } return h; }
function _cofreEnCelda(la,lo){ var gy=Math.round(la/LP_COFRE_CELDA), gx=Math.round(lo/LP_COFRE_CELDA); var id='c:'+gy+':'+gx; var hh=_hashCelda(id+'|librepedal-cofre-v1'); if(hh % LP_COFRE_RAREZA !== 0) return null; return { id:id, lat:gy*LP_COFRE_CELDA, lon:gx*LP_COFRE_CELDA, premio: 20 + (hh % 9)*10 }; }
function _cofresReclamados(){ try{ return JSON.parse(localStorage.getItem('lp_cofres_'+(cu||'anon'))||'[]'); }catch(e){ return []; } }
function _reclamarCofre(id){ try{ var a=_cofresReclamados(); if(a.indexOf(id)<0){ a.push(id); localStorage.setItem('lp_cofres_'+(cu||'anon'), JSON.stringify(a.slice(-500))); } }catch(e){} }
function _chequearCofre(la,lo,sp){
  if(!_cofresActivos || !(la&&lo)) return;
  if(!(sp>4 && sp<50)) return; // velocidad de bici plausible: no parado, no auto
  var now=Date.now(); if(now-_cofreCheckTs<4000) return; _cofreCheckTs=now;
  var cof=_cofreEnCelda(la,lo); if(!cof) return;
  if(typeof gd2==='function' && gd2(la,lo,cof.lat,cof.lon)>0.25) return; // dentro de ~250m del centro
  if(_cofresReclamados().indexOf(cof.id)>=0) return;
  _reclamarCofre(cof.id);
  try{ _pisteroMood='contento'; }catch(e){}
  try{ _ganarDarma(cof.premio); }catch(e){}
  if(typeof h==='function') h('¡Sorpresa! Encontraste un cofre oculto en un rincón poco pedaleado. Te ganaste '+cof.premio+' de Darma. Sigue explorando, hay más escondidos por ahí.', (typeof PRIO_VOZ!=='undefined')?PRIO_VOZ.INFO:2);
}
function updateSpeedStatus(speed){
  const el=document.getElementById('speedStatus'); if(!el) return;
  const _u=_ritmoUmbrales();
  if(speed===0){ el.innerText='Detenido'; el.style.color='#888'; }
  else if(speed<_u.lento){ el.innerText='Ritmo lento'; el.style.color='#ff9800'; }
  else if(speed<_u.normal){ el.innerText='Ritmo normal'; el.style.color='#10b981'; }
  else { el.innerText='¡Rápido!'; el.style.color='#ff3333'; }
  pv(speed);
}
