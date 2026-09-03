function getCurrentLocation(){
  return new Promise(function(resolve){
    showLoading("Obteniendo tu ubicación...");
    if(!navigator.geolocation){ hideLoading(); resolve(null); return; }
    let listo=false;
    function fin(v){ if(listo) return; listo=true; clearTimeout(failsafe); hideLoading(); resolve(v); }
    // RED DE SEGURIDAD: si el permiso de GPS queda pendiente (el usuario no responde
    // el aviso), los callbacks nunca llegan y el timeout de la API no corre —
    // sin esto la pantalla de carga quedaba pegada para siempre al iniciar.
    const failsafe=setTimeout(function(){ const qs=document.getElementById('quick-start'); if(qs) qs.value="Ubicación manual"; fin(null); },16000);
    navigator.geolocation.getCurrentPosition(function(pos){
      currentUserLocation={lat:pos.coords.latitude, lon:pos.coords.longitude, accuracy:pos.coords.accuracy};
      const qs=document.getElementById('quick-start'); if(qs) qs.value="Mi ubicación actual";
      // El mapa arranca centrado en un punto genérico (aún no sabe dónde estás);
      // apenas llega el GPS real, hace zoom hasta tu ubicación en vez de dejarte
      // mirando medio país o medio Chile.
      if(mp) mp.flyTo({center:[pos.coords.longitude,pos.coords.latitude], zoom:15, duration:1800});
      showSpeechBubble("Ubicación detectada"); fin(currentUserLocation);
    }, function(){ const qs=document.getElementById('quick-start'); if(qs) qs.value="Ubicación manual"; showSpeechBubble("No se pudo obtener el GPS"); fin(null); },
    {enableHighAccuracy:true, timeout:15000, maximumAge:0});
  });
}
// Botón 🎯 del Mapa Global: a diferencia del mapa de navegación, este mapa
// nunca te sigue solo (es para explorar la comunidad, no para ir a un destino),
// así que no hace falta "soltar" ningún seguimiento — solo centra en tu
// posición actual, como el botón equivalente de Google Maps.
function _mapaRecentrar(){
  if(currentUserLocation){ if(mp) mp.flyTo({center:[currentUserLocation.lon,currentUserLocation.lat], zoom:15, duration:1200}); return; }
  getCurrentLocation().then(function(loc){ if(loc && mp) mp.flyTo({center:[loc.lon,loc.lat], zoom:15, duration:1200}); });
}
function showLoading(t){ try{ if(typeof _setExprPistero==='function') _setExprPistero('pensando'); }catch(e){} document.getElementById('loadingText').innerText=t; const ov=document.getElementById('loadingOverlay'); ov.classList.add('show'); ov.onclick=hideLoading; /* escape de emergencia: un toque la cierra si algo queda pegado */ cadenaIniciar(0.5); }
function hideLoading(){ document.getElementById('loadingOverlay').classList.remove('show'); cadenaDetener(); try{ if(typeof _setExprPistero==='function' && _pisteroExprActual==='pensando') _setExprPistero(document.body.classList.contains('pistero-hablando')?'hablando':((typeof micOn!=='undefined'&&micOn)?'escuchando':'feliz')); }catch(e){} }
