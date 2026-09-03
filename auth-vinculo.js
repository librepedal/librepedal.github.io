// Vuelta del correo: verifica el link, canjea el idToken por el token uid==cu y arma la sesión.
async function _completarDesdeLinkMagico(){
  var authEl=document.getElementById('auth');
  var email='';
  try{ email=localStorage.getItem(_EMAIL_LINK_KEY)||''; }catch(e){}
  // Enlace generado a mano y mandado por WhatsApp (ver scripts/generar-enlaces-acceso.js):
  // el tester nunca pidió el enlace desde ESTE teléfono, así que no hay correo guardado
  // en localStorage y sin esto le saldría un prompt pidiéndoselo. El generador mete el
  // correo en `?em=` para que entre de un solo toque, sin escribir nada.
  if(!email){ try{ email=(new URLSearchParams(location.search).get('em')||'').trim(); }catch(e){} }
  if(!email){ try{ email=(window.prompt('Confirma tu correo para completar el ingreso:')||'').trim(); }catch(e){} }
  if(!email){ if(authEl) authEl.style.display='flex'; rm(MG); fg('todos'); initCustomization(); return; }
  try{
    if(typeof showLoading==='function') showLoading('Verificando tu correo...');
    await firebase.auth().signInWithEmailLink(email, location.href);
    var cuVal=await _canjearIdTokenPorSesion();
    var nombre=localStorage.getItem('lp_pending_nombre')||localStorage.getItem('lp_nombre_'+cuVal)||'Ciclista';
    try{ history.replaceState(null,'',location.origin+location.pathname); }catch(e){}
    try{ localStorage.removeItem(_EMAIL_LINK_KEY); }catch(e){}
    if(typeof hideLoading==='function') hideLoading();
    await _completarLoginVerificado(cuVal, nombre, email);
  }catch(err){
    if(typeof _lpDbg==='function') _lpDbg('completarDesdeLinkMagico:CATCH', {msg: err&&err.message, name: err&&err.name, stack: err&&err.stack&&err.stack.substring(0,600)});
    if(typeof hideLoading==='function') hideLoading();
    // _lpAvisoLogin y no lpAviso: en la pantalla de login lpAviso() es MUDO
    // (mostrarBocadillo se niega a mostrarse fuera de v-pistero/v-map), así que un
    // enlace vencido o ya usado dejaba al tester mirando una pantalla sin explicación.
    _lpAvisoLogin('No se pudo completar el ingreso: '+((err&&err.message)||err)+'. Pedí el enlace de nuevo.');
    if(authEl) authEl.style.display='flex'; rm(MG); fg('todos'); initCustomization();
  }
}

window.onload = async function(){
  const sesion = localStorage.getItem('lp_session');
  _lpDbg('onload:start', {hasSesionLS: !!sesion, href: location.href});
  initVoz();
  const _elVer=document.getElementById('lpVerMostrada'); if(_elVer) _elVer.innerText=APP_VERSION;
  _actualizarBtnAhorroGPS();
  _actualizarBtnBitacoraViajes();
  _actualizarBtnCrash();
  _actualizarBtnGPS();
  _actualizarBtnManosLibres();
  // Espera a saber si la app se va a recargar sola por una actualización (máx. 1.5s)
  // antes de activar GPS/voz de arranque — si se recarga, esta instancia nunca sigue.
  try{ await Promise.race([window.__lpListoParaArrancar, new Promise(function(r){ setTimeout(r,1500); })]); }catch(e){}
  // Vuelta de Google (redirect): si el usuario entró con Google, completar y salir.
  try{
    if(typeof firebase!=='undefined' && firebase.auth){
      var _gr=await firebase.auth().getRedirectResult();
      var _grDump='NOPE';
      try{ _grDump = JSON.stringify(_gr, function(k,v){ return v===undefined?'__undef__':v; }); }catch(_e1){ _grDump='STRINGIFY-FAIL:'+_e1.message; }
      _lpDbg('onload:getRedirectResult', {resultShape: _grDump.substring(0,900), opType: (_gr&&('opType_is_'+_gr.operationType)), credVal: (_gr&&('credVal_is_'+(_gr.credential===null?'NULL':(_gr.credential===undefined?'UNDEF':'SOMETHING')))), userVal: (_gr&&('userVal_is_'+(_gr.user===null?'NULL':(_gr.user===undefined?'UNDEF':'SOMETHING')))), url: location.href});
      if(typeof window.__lpResolverRedirect==='function') window.__lpResolverRedirect();
      if(_gr && _gr.user){ await _completarDesdeGoogle(_gr.user); return; }
    } else if(typeof window.__lpResolverRedirect==='function') window.__lpResolverRedirect();
  }catch(_eg){ _lpDbg('onload:getRedirectResult-CATCH', {code:_eg&&_eg.code, msg:_eg&&_eg.message}); console.warn('getRedirectResult', _eg && _eg.code); if(typeof window.__lpResolverRedirect==='function') window.__lpResolverRedirect(); }
  // Login por link mágico (respaldo): si el usuario volvió del correo, completar y salir.
  if(typeof firebase!=='undefined' && firebase.auth && firebase.auth().isSignInWithEmailLink && firebase.auth().isSignInWithEmailLink(location.href)){
    await _completarDesdeLinkMagico();
    return;
  }
  if(sesion){
    cu=sesion; if(typeof _cargarEstadoFundador==='function') _cargarEstadoFundador();
    _actualizarAuthConTokenPersonalizado(cu); // no bloquea el resto del arranque
    nombreUsuario=localStorage.getItem('lp_nombre_'+cu)||'Ciclista';
    selectedHelmet=localStorage.getItem('lp_helmet_'+cu)||'giro';
    selectedLens=localStorage.getItem('lp_lens_'+cu)||'none';
    selectedSkin=localStorage.getItem('lp_skin_'+cu)||'cyan';
    try{ selectedExtras=JSON.parse(localStorage.getItem('lp_extras_'+cu))||[]; }catch(e){ selectedExtras=[]; }
    selectedPiel=localStorage.getItem('lp_piel_'+cu)||'pielClara';
    selectedOjos=localStorage.getItem('lp_ojos_'+cu)||'ojoCafe';
    selectedLabios=localStorage.getItem('lp_labios_'+cu)||'labioNatural';
    selectedVello=localStorage.getItem('lp_vello_'+cu)||'velloNinguno';
    selectedPeinado=localStorage.getItem('lp_peinado_'+cu)||'pelado';
    selectedPanuelo=localStorage.getItem('lp_panuelo_'+cu)||'panueloNinguno';
    ghostMode=localStorage.getItem('lp_ghost_'+cu)==='true';
    updateGhostButton();
    {const _wn=document.getElementById('welcome-name'); if(_wn) _wn.innerText=nombreUsuario;} // el nombre se saco de la cabecera; se deja tolerante por si vuelve
    const vb=document.getElementById('vozBtn'); if(vb) vb.innerHTML='<i class="fas fa-volume-'+(vozActiva?'high':'xmark')+'"></i> Voz: '+(vozActiva?'ON':'OFF');
    const vnb=document.getElementById('vozNeuralBtn'); if(vnb) vnb.innerHTML='<i class="fas fa-wand-magic-sparkles"></i> Voz mejorada: '+(vozMejorada?'ON':'OFF');
    const gnb=document.getElementById('generoBtn'); if(gnb){ const esP=pisteroGenero==='l'; gnb.innerHTML='<i class="fas fa-'+(esP?'person':'person-dress')+'"></i> Guía: '+(esP?'Pistero':'Pistera'); }
    us=_lsJSON('lp_u_'+cu, {d:0,n:'Novato',di:0,c:0,la:null,lo:null});
    uj=_lsJSON('lp_j_'+cu, []);
    rh=_lsJSON('lp_r_'+cu, []);
    document.getElementById('auth').style.display='none';
    document.getElementById('logoutBtn').style.display='block';
    document.getElementById('ghostBtn').style.display='block';
    const adminPanel=document.getElementById('admin-panel'); if(adminPanel) adminPanel.style.display=(cu===ADMIN_ID)?'block':'none';
    await im(); au(); rm(MG); fg('todos');
    loadTrips(); loadRoutesList(); cargarFrasesComunidad(); /* 2026-08-23: loadRepairTips/loadHostels/loadRecommendations salieron de aqui -> se enganchan al abrir SU pantalla (_subUnaVez en cv()). loadHostels era el peor: arrastra initVotosHostels() = guiComments limit(500), ~550 documentos por apertura para "Te doy alojo", que ademas esta OCULTO desde el commit 8f2d678. */
    initCustomization();
    // 2026-08-15: antes eran 2 timeouts de tiempo fijo (950ms para abrirEsfera, 3000ms
    // para el mic de manos libres) adivinando cuanto dura el saludo -- con saludos
    // largos, el flash+sonido de abrirEsfera() cortaba la voz a mitad de frase (mismo
    // bug que el del tutorial). Ahora se espera de verdad a que vozHablando sea false.
    setTimeout(function(){
      h(saludoBienvenida(nombreUsuario));
      _esperarFinVoz(function(){
        if(typeof abrirEsfera==='function') abrirEsfera();
        if(manosLibresOn) _iniciarEscuchaContinua();
      });
    },500);
    if(!ghostMode) subscribeToUsers();
    subscribeToFriendRequests(); /* 2026-08-23: solo este queda al arranque (pinta insignias que se ven fuera de su pantalla y es una query chica, solo TUS solicitudes). chat/comments/reportes/novedades se enganchan al abrir su pantalla -- ver _subUnaVez(). */ revisarRodadasProximas(); revisarRetosCumplidos();
    getCurrentLocation();
    publicarUbicacionInicial();
    solicitarPermisosEsenciales();
    sincronizarAlEntrar(); // sube los km que quedaron guardados solo en el teléfono
    _intentarReanudarNavegacion();
  } else {
    document.getElementById('auth').style.display='flex';
    rm(MG); fg('todos'); initCustomization();
  }
};
