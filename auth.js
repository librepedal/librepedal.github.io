window.lpUID = null;
// Upgrade de auth: reemplaza el uid anónimo (aleatorio, distinto por dispositivo)
// por uno ESTABLE = tu propio cu, igual en cualquier celular donde inicies sesión.
// Así Firestore puede verificar dueño real (request.auth.uid == campo `user`, que
// ya se guarda en cada documento desde siempre) sin tener que re-escribir nada.
// Si falla (sin señal, Worker caído) la sesión anónima ya activa sigue funcionando
// exactamente igual que hasta ahora — no bloquea ni rompe el login.
// En local (pruebas) apunta al Worker de staging; en producción, al de siempre.
const AUTH_TOKEN_URL = (location.hostname==='localhost'||location.hostname==='127.0.0.1')
  ? 'https://librepedal-auth-staging.librepedal.workers.dev'
  : 'https://librepedal-auth.librepedal.workers.dev';
const _EMAIL_LINK_KEY='lp_pending_email';
function _actionCodeSettings(){ return { url: location.origin + location.pathname, handleCodeInApp: true }; }

// Paso 1 del login: manda el enlace mágico al correo (Firebase entrega el correo).
async function _enviarLinkMagico(email){
  await firebase.auth().sendSignInLinkToEmail(email, _actionCodeSettings());
  try{ localStorage.setItem(_EMAIL_LINK_KEY, email); }catch(e){}
}

// Canjea la sesión Firebase YA verificada (por el link) por un token uid==cu del Worker.
function _lpDbg(ev,extra){
  try{
    var arr=JSON.parse(localStorage.getItem('lpFullTrace')||'[]');
    arr.push(Object.assign({t:Date.now(),ev:ev},extra||{}));
    localStorage.setItem('lpFullTrace', JSON.stringify(arr));
  }catch(e){}
}
async function _canjearIdTokenPorSesion(){
  _lpDbg('canjear:start');
  const u=firebase.auth().currentUser; if(!u){ _lpDbg('canjear:sin-user'); throw new Error('sin sesión Firebase'); }
  const idJwt=await u.getIdToken(true);
  _lpDbg('canjear:tengo-idJwt', {len: idJwt ? idJwt.length : 0});
  const r=await fetch(AUTH_TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:idJwt})});
  const data=await r.json().catch(function(){return null;});
  _lpDbg('canjear:respuesta', {status:r.status, ok:r.ok, data: data});
  if(!r.ok||!data||!data.token) throw new Error((data&&data.error)||'no se pudo verificar el correo');
  await firebase.auth().signInWithCustomToken(data.token);
  _lpDbg('canjear:signInWithCustomToken-OK');
  return data.cu;
}

// Compat con el onload de sesión existente: si Firebase ya tiene una sesión verificada
// (con correo, no anónima), la canjea a uid==cu; si no, no hace nada — el usuario
// verificará con el link cuando corresponda. Ya NO manda {cu} sin verificar (eso era el hueco).
async function _actualizarAuthConTokenPersonalizado(cuVal){
  try{
    const u=firebase.auth().currentUser;
    if(u && !u.isAnonymous && u.uid===cuVal) return;              // ya verificado y estable
    if(u && u.email && !u.isAnonymous){ await _canjearIdTokenPorSesion(); }
  }catch(e){}
}

// ENTRAR CON GOOGLE — NATIVO (2026-08-16): en la app instalada (APK) que YA trae el
// plugin @capacitor-firebase/authentication compilado, usa el selector de cuenta real
// de Android en vez de abrir una ventana web dentro del WebView — evita de raíz los 3
// bugs de abajo (COOP/missing-initial-state/origin_mismatch), que son todos del camino
// web. En instalaciones VIEJAS (sin el plugin) lpPlugin() devuelve null y sigue el
// camino web de siempre, sin ningún cambio de comportamiento para ellas — aditivo,
// cero riesgo de regresión. El link mágico SIGUE siendo la opción visible por ahora
// (se saca en un cambio aparte, una vez confirmado que esto funciona en un teléfono
// real) — este commit SOLO agrega la capacidad de usar el nativo cuando está.
// Aviso que SÍ se ve en la pantalla de login: lpAviso()/mostrarBocadillo() se niega a
// mostrar nada fuera de las vistas v-pistero/v-map (ver mostrarBocadillo más abajo), así
// que en el login cualquier error de Google quedaba MUDO — el usuario tocaba el botón,
// algo fallaba de verdad, y no pasaba nada visible. Encontrado 2026-08-16 probando en
// teléfono real: el spinner "Entrando con Google..." aparecía y desaparecía sin dejar
// rastro del error real. window.alert() no depende de ninguna vista/DOM, siempre se ve.
function _lpAvisoLogin(msg){ try{ window.alert(String(msg)); }catch(e){} }

// ENTRAR CON CÓDIGO DE TESTER (2026-08-16, temporal para la prueba cerrada).
// El worker valida el código compartido Y que el correo esté en la lista de testers,
// y recién ahí firma un token. Acá solo se canjea ese token por la sesión, igual que
// hace el camino del link mágico. Ver worker-auth/worker.js, rama `modo:'codigo'`.
async function _entrarConCodigoTester(){
  var codigo=(document.getElementById('codigoTesterInput')||{}).value||'';
  var correo=(document.getElementById('correoTesterInput')||{}).value||'';
  codigo=codigo.trim().toUpperCase(); correo=correo.trim().toLowerCase();
  if(!codigo) return _lpAvisoLogin('Escribí el código que te pasaron.');
  if(!correo||correo.indexOf('@')===-1) return _lpAvisoLogin('Escribí el correo con el que te inscribiste a la prueba.');
  var btn=document.getElementById('btnEntrarCodigo');
  if(btn){ btn.disabled=true; btn.innerText='Entrando...'; }
  try{
    if(typeof showLoading==='function') showLoading('Entrando...');
    var r=await fetch(AUTH_TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modo:'codigo',codigo:codigo,email:correo})});
    var data=await r.json().catch(function(){return null;});
    if(!r.ok||!data||!data.token) throw new Error((data&&data.error)||('no se pudo entrar ('+r.status+')'));
    await firebase.auth().signInWithCustomToken(data.token);
    var nombre=localStorage.getItem('lp_nombre_'+data.cu)||(correo.split('@')[0])||'Ciclista';
    if(typeof hideLoading==='function') hideLoading();
    await _completarLoginVerificado(data.cu, nombre, correo);
  }catch(err){
    if(typeof hideLoading==='function') hideLoading();
    if(btn){ btn.disabled=false; btn.innerText='Entrar'; }
    // Reporte automático a Sentry (17-ago-2026): este ingreso funciona en la web pero
    // falla en la app instalada, y pedirle a Inty que dicte el error costó varias rondas.
    // Se manda el contexto que dice DÓNDE se corta —si la petición al worker ni sale, si
    // sale y responde otra cosa, o si falla el paso de Firebase— y sobre todo si corre en
    // app nativa o en navegador, que es justamente la diferencia entre lo que anda y lo
    // que no. Así el próximo fallo se diagnostica leyendo Sentry, sin interrogar a nadie.
    try{
      if(window.Sentry && Sentry.captureException){
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
          tags:{ donde:'entrarConCodigoTester',
                 nativo: (typeof window.Capacitor!=='undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? 'si' : 'no' },
          extra:{ correo:correo, urlWorker:AUTH_TOKEN_URL,
                  version:(typeof APP_VERSION!=='undefined'?APP_VERSION:'?'),
                  agente:(navigator.userAgent||'').slice(0,180) }
        });
      }
    }catch(_s){}
    _lpAvisoLogin('No se pudo entrar: '+((err&&err.message)||err));
  }
}
(function(){
  function wire(){
    // Ya no hay enlace "Soy tester y tengo un código" que desplegar: la caja está abierta
    // y es lo primero de la pantalla. Se quitó el wiring de ese enlace junto con él, para
    // no dejar código muerto apuntando a un elemento que no existe.
    var b=document.getElementById('btnEntrarCodigo');
    if(b) b.addEventListener('click',function(){ _entrarConCodigoTester(); });
    var ci=document.getElementById('correoTesterInput');
    if(ci) ci.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); _entrarConCodigoTester(); } });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire); else wire();
})();
async function _entrarConGoogleNativo(){
  var plugin=lpPlugin('FirebaseAuthentication');
  if(typeof showLoading==='function') showLoading('Entrando con Google...');
  try{
    var r=await plugin.signInWithGoogle();
    var idToken=r && r.credential && r.credential.idToken;
    if(!idToken) throw new Error('Google no devolvió credencial');
    var cred=firebase.auth.GoogleAuthProvider.credential(idToken);
    var res=await firebase.auth().signInWithCredential(cred);
    if(res && res.user){ await _completarDesdeGoogle(res.user); }
    else throw new Error('Firebase no completó la sesión');
  }catch(err){
    if(typeof hideLoading==='function') hideLoading();
    var code=(err&&err.code)||'';
    if(code==='ERR_CANCELED') return; // el usuario cerró el selector de cuenta, no es un error real
    _lpAvisoLogin('No se pudo entrar con Google: '+((err&&err.message)||err));
  }
}
// ENTRAR CON GOOGLE (un toque, sin correos): redirect es lo más confiable en PWA móvil.
async function _entrarConGoogle(){
  var pluginNativo=lpPlugin('FirebaseAuthentication');
  if(pluginNativo){ return _entrarConGoogleNativo(); }
  // Diagnóstico SOLO a consola (nunca en pantalla): el 2026-08-16 esto era un alert()
  // visible y quedó desplegado un rato — cualquiera que entrara por la web veía un JSON
  // crudo al tocar el botón. Sirve para depurar por qué el plugin nativo no aparece en
  // una instalación concreta, sin ensuciar la pantalla de nadie.
  try{
    console.warn('[LP] sin plugin nativo de auth:', (typeof window.Capacitor==='undefined') ? 'window.Capacitor no existe' : {
      isNative: (window.Capacitor.isNativePlatform ? window.Capacitor.isNativePlatform() : 'sin isNativePlatform'),
      platform: window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'sin getPlatform',
      plugins: window.Capacitor.Plugins ? Object.keys(window.Capacitor.Plugins) : 'sin Capacitor.Plugins'
    });
  }catch(_e){}
  // APP INSTALADA SIN EL PLUGIN NATIVO (2026-08-16): callejón sin salida comprobado.
  // Dentro del WebView, accounts.google.com NO está en allowNavigation, así que Android
  // abre el login de Google en el navegador EXTERNO; la vuelta del redirect aterriza en
  // Chrome, que es otro contexto de almacenamiento que el de la app -> Firebase responde
  // "missing initial state" y el usuario queda tirado en una pantalla de error en blanco,
  // fuera de la app. No hay forma de arreglarlo desde la web: el arreglo real es el plugin
  // nativo, que viaja compilado en el .aab. Hasta que actualicen, los mandamos por el
  // camino que SÍ funciona (enlace al correo) en vez de romperles la sesión.
  try{
    var _esAppNativa = (typeof window.Capacitor!=='undefined') && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    if(_esAppNativa){
      _lpAvisoLogin('Entrar con Google todavía no está disponible en esta versión de la app.\n\nActualizá Libre Pedal desde Play Store para activarlo.\n\nMientras tanto podés entrar con tu correo: escribilo arriba y tocá "Enviarme el enlace".');
      var _em=document.getElementById('em'); if(_em){ try{ _em.scrollIntoView({behavior:'smooth',block:'center'}); _em.focus(); }catch(e){} }
      return;
    }
  }catch(_e2){}
  // HISTORIAL de este botón (para quien lo toque después, que no repita el mismo camino):
  // 1) signInWithPopup solo: se colgaba en Chrome por Cross-Origin-Opener-Policy de
  //    accounts.google.com (bloquea el postMessage de vuelta sin rechazar la promesa).
  // 2) signInWithRedirect directo (reemplazo del punto 1): PROBADO EN VIVO varias veces
  //    con getRedirectResult() instrumentado — vuelve SIEMPRE {credential:null,user:null},
  //    incluso justo después de un login real completo en Google. El auth state nunca
  //    llega a tener el usuario real ni un instante (confirmado con onAuthStateChanged
  //    logueado paso a paso). No es un problema de timing ni de nuestro código de arranque:
  //    Firebase nunca recibe de vuelta la sesión por este camino, en este navegador/entorno.
  // 3) ESTE (actual): no dependemos de que NINGUNA promesa se resuelva con el usuario.
  //    Escuchamos onAuthStateChanged directamente — sea cual sea el mecanismo interno que
  //    termine poniendo un usuario real (no-anónimo, con email) en Firebase, lo agarramos
  //    ahí. signInWithPopup sigue siendo el disparador (si cuelga por COOP, dejamos el
  //    listener vivo de todos modos por si el estado sí cambió por dentro); si la promesa
  //    truena por popup bloqueado, caemos a signInWithRedirect como último recurso.
  var provider=new firebase.auth.GoogleAuthProvider();
  if(typeof showLoading==='function') showLoading('Entrando con Google...');
  var yaCompletado=false;
  var unsub=firebase.auth().onAuthStateChanged(function(u){
    if(!yaCompletado && u && !u.isAnonymous && u.email){
      yaCompletado=true;
      try{ unsub(); }catch(e){}
      _completarDesdeGoogle(u);
    }
  });
  setTimeout(function(){ if(!yaCompletado && typeof hideLoading==='function') hideLoading(); }, 15000);
  try{
    var res=await firebase.auth().signInWithPopup(provider);
    if(res && res.user && !yaCompletado){
      yaCompletado=true;
      try{ unsub(); }catch(e){}
      await _completarDesdeGoogle(res.user);
    }
  }catch(err){
    var code=(err&&err.code)||'';
    if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request'){
      try{ unsub(); }catch(e){}
      if(typeof hideLoading==='function') hideLoading();
      return;
    }
    if(code.indexOf('popup')>-1||code==='auth/operation-not-supported-in-this-environment'){
      try{ await firebase.auth().signInWithRedirect(provider); }
      catch(e2){ try{ unsub(); }catch(e){} if(typeof hideLoading==='function') hideLoading(); _lpAvisoLogin('No se pudo abrir Google: '+((e2&&e2.message)||e2)); }
      return; // el listener sigue vivo por si igual completa; window.onload también revisa el retorno
    }
    // Cualquier otro código (incluido lo que deja colgado el COOP): NO apagamos el listener,
    // puede que el auth state sí haya cambiado por dentro pese al error de la promesa.
    console.warn('signInWithPopup no concluyó limpio, el listener de auth state sigue activo:', code);
  }
}
// Vuelta de Google: canjea el idToken verificado por el token uid==cu y arma la sesión.
async function _completarDesdeGoogle(user){
  _lpDbg('completarDesdeGoogle:start', {email: user && user.email});
  try{
    if(typeof showLoading==='function') showLoading('Entrando con Google...');
    var cuVal=await _canjearIdTokenPorSesion();
    var email=(user&&user.email)||'';
    var nombre=(user&&user.displayName)||localStorage.getItem('lp_nombre_'+cuVal)||'Ciclista';
    try{ history.replaceState(null,'',location.origin+location.pathname); }catch(e){}
    if(typeof hideLoading==='function') hideLoading();
    _lpDbg('completarDesdeGoogle:antes-de-completarLoginVerificado', {cuVal:cuVal});
    await _completarLoginVerificado(cuVal, nombre, email);
    _lpDbg('completarDesdeGoogle:OK-FINAL', {hasSession: !!localStorage.getItem('lp_session')});
  }catch(err){
    _lpDbg('completarDesdeGoogle:CATCH', {msg: err && err.message, stack: err && err.stack && err.stack.substring(0,300)});
    if(typeof hideLoading==='function') hideLoading();
    _lpAvisoLogin('No se pudo entrar con Google: '+((err&&err.message)||err));
    var a=document.getElementById('auth'); if(a) a.style.display='flex'; rm(MG); fg('todos'); initCustomization();
  }
}

// GOOGLE MODERNO (GIS): obtiene el credential directo, sin popup/redirect que rebote
// en dominio propio + app instalada. Entra con signInWithCredential (llamada directa).
var _GIS_CLIENT_ID='857811917976-cqqkdjr9sk5te2mb1hb4lk0ri7iufsc8.apps.googleusercontent.com';
async function _gisCallback(resp){
  try{
    if(!resp || !resp.credential) return;
    if(typeof showLoading==='function') showLoading('Entrando con Google...');
    var cred=firebase.auth.GoogleAuthProvider.credential(resp.credential);
    var res=await firebase.auth().signInWithCredential(cred);
    if(res && res.user){ await _completarDesdeGoogle(res.user); }
    else if(typeof hideLoading==='function'){ hideLoading(); }
  }catch(err){
    if(typeof hideLoading==='function') hideLoading();
    _lpAvisoLogin('No se pudo entrar con Google: '+((err&&err.message)||err));
  }
}
function _initGIS(n){
  n=n||0;
  try{
    if(window.google && google.accounts && google.accounts.id){
      google.accounts.id.initialize({ client_id:_GIS_CLIENT_ID, callback:_gisCallback, auto_select:false, cancel_on_tap_outside:true });
      var cont=document.getElementById('gbtn');
      if(cont){ cont.innerHTML=''; google.accounts.id.renderButton(cont, { type:'standard', theme:'filled_blue', size:'large', text:'continue_with', shape:'pill', logo_alignment:'center', width:280 }); }
      return;
    }
  }catch(e){}
  if(n<50){ setTimeout(function(){ _initGIS(n+1); }, 150); }
  else { var fb=document.getElementById('gbtnFallback'); if(fb) fb.style.display='flex'; } // GIS no cargó: botón de respaldo
}
try{ var fb=document.getElementById('gbtnFallback'); if(fb) fb.style.display='flex'; }catch(e){} // GIS/FedCM desactivado: origin_mismatch persistente, se usa el flujo probado (popup/redirect)

// Arranque de auth: NO pisar con login anónimo una sesión verificada persistida.
(function(){
  try{
    if(firebase.auth){
      var _primera=true;
      firebase.auth().onAuthStateChanged(async function(u){
        window.lpUID = u ? u.uid : null;
        if(typeof _lpDbg==='function') _lpDbg('onAuthStateChanged', {primera:_primera, hasU:!!u, anon: u?u.isAnonymous:null, uidLen: u?String(u.uid).length:null});
        if(_primera){
          _primera=false;
          if(!u){
            if(typeof _lpDbg==='function') _lpDbg('anonBlock:esperando-redirect');
            // Antes de firmar como anónimo, esperamos a que termine de revisarse
            // getRedirectResult() (vuelta de Google) — si no, esta carrera podía pisar
            // una sesión real recién confirmada con una anónima nueva, silenciosamente.
            try{ await Promise.race([window.__lpRedirectListo, new Promise(function(r){ setTimeout(r,4000); })]); }catch(e){}
            if(typeof _lpDbg==='function') _lpDbg('anonBlock:despues-de-esperar', {currentUserAhora: !!firebase.auth().currentUser});
            if(!firebase.auth().currentUser){
              if(typeof _lpDbg==='function') _lpDbg('anonBlock:LLAMANDO-signInAnonymously');
              firebase.auth().signInAnonymously().catch(function(e){ console.warn('Auth anónimo no disponible aún:', e && e.code); });
            }
          }
        }
      });
    }
  }catch(e){}
})();
