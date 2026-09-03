// Paso 1: el formulario ya no entra directo — manda el enlace mágico al correo.
async function enviarLinkMagico(e){
  e.preventDefault();
  const nombre=document.getElementById('nombre-input').value.trim();
  const e_val=document.getElementById('em').value.trim();
  // _lpAvisoLogin y no lpAviso en TODA esta función: lpAviso() -> mostrarBocadillo() se
  // niega a mostrarse fuera de v-pistero/v-map, o sea que en la pantalla de login era
  // MUDO. Esto es lo que vivieron los 51 testers la noche del 15/16-ago: escribían su
  // correo, tocaban "Enviarme el enlace", el botón se reseteaba y no aparecía NADA —
  // ni el error de cupo agotado ni "falta tu nombre". Concluyeron que la app no servía.
  if(!nombre) return _lpAvisoLogin("Ingresá tu nombre");
  if(!e_val||!e_val.includes('@')) return _lpAvisoLogin("El correo es obligatorio");
  const paisSel=(document.getElementById('pais-input')||{}).value||'auto';
  try{ localStorage.setItem('lp_pending_nombre',nombre); localStorage.setItem('lp_pending_pais',paisSel); }catch(_e){}
  const btn=e.target.querySelector('button[type=submit]');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Enviando...'; }
  try{
    await _enviarLinkMagico(e_val);
    _mostrarPantallaRevisaCorreo(e_val);
  }catch(err){
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-paper-plane"></i> Enviarme el enlace'; }
    var _code=(err&&err.code)?' ('+err.code+')':'';
    if(err && err.code==='auth/quota-exceeded'){
      _lpAvisoLogin('Hoy se llenó el cupo de correos de la app — no es culpa tuya.\n\nEscribile a Inty por WhatsApp y te manda un enlace directo para entrar al toque. Mañana el envío por correo vuelve a funcionar solo.');
    } else {
      _lpAvisoLogin('No se pudo enviar el enlace'+_code+': '+((err&&err.message)||err));
    }
  }
}
function _mostrarPantallaRevisaCorreo(email){
  var box=document.querySelector('#auth .auth-box'); if(!box){ _lpAvisoLogin('Enlace enviado a '+email); return; }
  box.innerHTML='<div style="text-align:center;padding:14px 6px">'
    +'<div style="font-size:2.6rem;color:var(--p);margin-bottom:10px"><i class="fas fa-envelope-circle-check"></i></div>'
    +'<h2 style="font-size:1.1rem;margin:0 0 8px;color:#e7edf6">Revisa tu correo</h2>'
    +'<p style="font-size:0.88rem;color:#9fb3c8;line-height:1.55">Te enviamos un enlace a <b style="color:#dfe7ff">'+escapeHTML(email)+'</b>.<br>Ábrelo desde este teléfono para entrar. Puede tardar un par de minutos — revisa también spam.</p>'
    +'<p id="reenviarLinkWrap" style="font-size:0.76rem;color:#7d8ba0;margin-top:14px">¿No llegó? <a href="#" id="reenviarLinkBtn" style="color:var(--p);font-weight:700">Reenviar enlace</a></p>'
    +'</div>';
  var _rb=document.getElementById('reenviarLinkBtn');
  if(_rb) _rb.onclick=function(ev){ ev.preventDefault(); _reenviarLinkMagico(email); };
}
// Reenvía de verdad (sin recargar la app ni perder el email ya escrito). Cooldown
// de 20s para no gatillar el limite de envios de Firebase si alguien clickea seguido.
var _reenviandoLink=false;
async function _reenviarLinkMagico(email){
  if(_reenviandoLink) return;
  var wrap=document.getElementById('reenviarLinkWrap'); var btn=document.getElementById('reenviarLinkBtn');
  _reenviandoLink=true;
  if(btn){ btn.style.pointerEvents='none'; btn.style.opacity='0.6'; }
  if(wrap) wrap.firstChild && (wrap.innerHTML='Reenviando…');
  try{
    await _enviarLinkMagico(email);
    if(wrap) wrap.innerHTML='Reenviado. Revisa tu correo (y spam) — puede tardar un par de minutos.';
  }catch(err){
    if(err && err.code==='auth/quota-exceeded'){
      if(wrap) wrap.innerHTML='Estamos con mucha demanda ahorita. No es un error tuyo — intenta más tarde.';
    } else {
      var _code=(err&&err.code)||'sin-código';
      if(wrap) wrap.innerHTML='No se pudo reenviar ('+escapeHTML(_code)+'). Espera un minuto e intenta de nuevo, o escríbeme.';
    }
  }
  setTimeout(function(){ _reenviandoLink=false; var b=document.getElementById('reenviarLinkBtn'); if(b){ b.style.pointerEvents='auto'; b.style.opacity='1'; } }, 20000);
}
// Paso 2: se llama al volver del correo, con la sesión YA verificada y el token uid==cu listo.
async function _completarLoginVerificadoOriginal(cuVal, nombre, e_val){
  cu=cuVal; if(typeof _cargarEstadoFundador==='function') _cargarEstadoFundador();
  // Guard movido AQUÍ (antes vivía solo dentro de _mostrarBienvenidaFundador, que corre
  // 900ms después): si el login se dispara dos veces casi seguidas (doble tap real del
  // usuario, o el propio SDK de auth reemitiendo el evento), se agendaban dos setTimeout
  // antes de que cualquiera alcanzara a escribir el flag en localStorage — ambos pasaban
  // el chequeo y el modal de bienvenida aparecía dos veces. Marcar el flag AQUÍ, de forma
  // síncrona antes de agendar, cierra esa ventana de carrera.
  if(typeof _mostrarBienvenidaFundador==='function' && cuVal && !localStorage.getItem('lp_onboard_'+cuVal)){ localStorage.setItem('lp_onboard_'+cuVal,'1'); setTimeout(_mostrarBienvenidaFundador,900); }
  nombreUsuario=nombre;
  const paisSel=localStorage.getItem('lp_pending_pais')||'auto';
  if(paisSel!=='auto'){ paisUsuario=paisSel; } else { paisUsuario=null; }
  try{ localStorage.setItem('lp_pais',paisUsuario||''); }catch(e){}
  localStorage.setItem('lp_session',cu);
  localStorage.setItem('lp_nombre_'+cu,nombre);
  // authUid: uid real de Firebase Auth, ademas del id legado (cu, derivado del email).
  // Se guarda de forma aditiva para migrar mas adelante a reglas de Firestore por-dueno sin romper nada hoy.
  const _authUid = window.lpUID || (firebase.auth().currentUser && firebase.auth().currentUser.uid) || null;
  // Detecta si es realmente un usuario NUEVO (no uno que perdió la sesión local y
  // volvió a pasar por el formulario) para llevar la cuenta total de suscritos sin
  // tener que leer la colección completa cada vez que alguien quiere votar — ver
  // votarComunidad() más abajo.
  let _esUsuarioNuevo=false, _prevData=null;
  try{ const _prevDoc=await db.collection('users').doc(cu).get(); _esUsuarioNuevo=!_prevDoc.exists; if(_prevDoc.exists) _prevData=_prevDoc.data(); }catch(e){}
  // Si ya existía cuenta en la nube (celular nuevo, reinstalación o sesión perdida),
  // recupera el look y los ítems comprados con Darma en vez de pisarlos con los
  // valores por defecto de este dispositivo — antes esto sobrescribía en Firestore
  // el casco/skin/lente/extras guardados con 'giro'/'cyan'/'none'/[] cada vez que
  // alguien volvía a iniciar sesión en un teléfono nuevo, borrando lo ya comprado.
  let _unlockedFinal=getDesbloqueados();
  if(_prevData){
    if(_prevData.helmet) selectedHelmet=_prevData.helmet;
    if(_prevData.lens) selectedLens=_prevData.lens;
    if(_prevData.skin) selectedSkin=_prevData.skin;
    if(Array.isArray(_prevData.extras)) selectedExtras=_prevData.extras;
    if(Array.isArray(_prevData.unlocked)){ _unlockedFinal=_unlockedFinal.concat(_prevData.unlocked.filter(function(x){return _unlockedFinal.indexOf(x)===-1;})); }
    if(_prevData.piel) selectedPiel=_prevData.piel;
    if(_prevData.ojos) selectedOjos=_prevData.ojos;
    if(_prevData.labios) selectedLabios=_prevData.labios;
    if(_prevData.vello) selectedVello=_prevData.vello;
    if(_prevData.peinado) selectedPeinado=_prevData.peinado;
    if(_prevData.panuelo) selectedPanuelo=_prevData.panuelo;
    // Mismo cuidado para el modo de actividad y la personalidad de Pistero: sin esto,
    // alguien que ya había elegido "MTB" o una personalidad distinta perdía esa
    // elección al volver a entrar desde un teléfono nuevo (quedaba pisada por el
    // default de este dispositivo, 'ciclismo'/'cercano', en vez de conservarse).
    if(_prevData.actividad && ACTIVIDADES.some(function(a){return a.id===_prevData.actividad;})) actividadTipo=_prevData.actividad;
    if(_prevData.temaUi==='solido'||_prevData.temaUi==='cristal'){ temaUI=_prevData.temaUi; try{localStorage.setItem('lp_tema_ui',temaUI);}catch(e){} if(typeof _aplicarTemaUI==='function') _aplicarTemaUI(); }
    if(_prevData.personalidad) pisteroPersonalidad=_prevData.personalidad;
  }
  // 2026-08-24: restaura km/darma/kmPorModo/mantención ANTES de la escritura de mas
  // abajo, con el mismo criterio "gana el mas grande" que sincronizarAlEntrar(). Sin
  // esto, un primer login por codigo en un dispositivo/navegador nuevo escribia
  // km:(us.di)||0 SIN haber leido la nube -- en una cuenta con km real de otro
  // dispositivo, eso lo pisaba con 0 (encontrado en vivo probando esta rama: el campo
  // `km` de una cuenta real quedo en 0 mientras `kmPorModo.moto` seguia con datos
  // reales, justo la firma de este bug). Restaurar primero vuelve esa escritura
  // inofensiva: sube de vuelta el mismo maximo que ya tenia.
  _restaurarDesdeNube(_prevData);
  // Se abre la compuerta de mantencion tambien en ESTE camino (antes solo la abria
  // sincronizarAlEntrar(), que este login nunca llama): sin esto, ganar Darma o marcar
  // una mantencion como hecha durante la PRIMERA sesion de una cuenta no subia nada
  // hasta el proximo recargo de pagina.
  _mantListoParaSubir=true;
  try{ localStorage.setItem('lp_unlocked_'+cu, JSON.stringify(_unlockedFinal)); }catch(e){}
  localStorage.setItem('lp_helmet_'+cu,selectedHelmet);
  localStorage.setItem('lp_lens_'+cu,selectedLens);
  localStorage.setItem('lp_skin_'+cu,selectedSkin);
  localStorage.setItem('lp_extras_'+cu,JSON.stringify(selectedExtras));
  localStorage.setItem('lp_piel_'+cu,selectedPiel);
  localStorage.setItem('lp_ojos_'+cu,selectedOjos);
  localStorage.setItem('lp_labios_'+cu,selectedLabios);
  localStorage.setItem('lp_vello_'+cu,selectedVello);
  localStorage.setItem('lp_peinado_'+cu,selectedPeinado);
  localStorage.setItem('lp_panuelo_'+cu,selectedPanuelo);
  try{ localStorage.setItem('lp_actividad',actividadTipo); }catch(e){}
  try{ localStorage.setItem('lp_personalidad',pisteroPersonalidad); }catch(e){}
  _aplicarTemaActividad();
  /* km y darma se inicializan en 0 A PROPÓSITO: Firestore EXCLUYE del `orderBy` a los
     documentos que no tienen el campo, así que un usuario creado sin `km` no aparecía al
     final del ranking — simplemente NO EXISTÍA para él. El 2026-07-20, mirando los datos
     reales, 16 de 29 usuarios estaban en esa situación. Naciendo con el campo en 0, nadie
     vuelve a quedar invisible. */
  try{ await db.collection('users').doc(cu).set({nombre:nombre,km:(us&&us.di)||0,kmPorModo:_kmPorModoParaNube(),darma:(us&&us.d)||0,helmet:selectedHelmet,lens:selectedLens,skin:selectedSkin,extras:selectedExtras,unlocked:_unlockedFinal,piel:selectedPiel,ojos:selectedOjos,labios:selectedLabios,vello:selectedVello,peinado:selectedPeinado,panuelo:selectedPanuelo,actividad:actividadTipo,personalidad:pisteroPersonalidad,createdAt:firebase.firestore.FieldValue.serverTimestamp(),visible:true,lat:null,lon:null,authUid:_authUid},{merge:true}); }catch(err){ console.error(err); }
  // El correo va APARTE, en un documento privado que solo el dueño (o el admin
  // real) puede leer — antes vivía en /users/{id}, que es de lectura pública a
  // propósito (Ranking mundial, "ver perfil de otro"), así que cualquiera podía
  // sacar el correo de toda la comunidad sin ser admin. Ver firestore.rules.
  try{ await db.collection('usersPrivate').doc(cu).set({email:e_val},{merge:true}); }catch(err){ console.error(err); }
  if(_esUsuarioNuevo){ try{ await db.collection('meta').doc('contadores').set({totalUsuarios:firebase.firestore.FieldValue.increment(1)},{merge:true}); }catch(e){} }
  document.getElementById('auth').style.display='none';
  document.getElementById('logoutBtn').style.display='block';
  document.getElementById('ghostBtn').style.display='block';
  const _ap=document.getElementById('admin-panel'); if(_ap) _ap.style.display=(cu===ADMIN_ID)?'block':'none';
  {const _wn=document.getElementById('welcome-name'); if(_wn) _wn.innerText=nombre;} // el nombre se saco de la cabecera; se deja tolerante por si vuelve
  us=_lsJSON('lp_u_'+cu, {d:0,n:'Novato',di:0,c:0,la:null,lo:null});
  uj=_lsJSON('lp_j_'+cu, []);
  rh=_lsJSON('lp_r_'+cu, []);
  await im(); au(); rm(MG); fg('todos');
  loadTrips(); loadRoutesList(); cargarFrasesComunidad(); /* 2026-08-23: loadRepairTips/loadHostels/loadRecommendations salieron de aqui -> se enganchan al abrir SU pantalla (_subUnaVez en cv()). loadHostels era el peor: arrastra initVotosHostels() = guiComments limit(500), ~550 documentos por apertura para "Te doy alojo", que ademas esta OCULTO desde el commit 8f2d678. */
  if(!ghostMode) subscribeToUsers();
  subscribeToFriendRequests(); /* 2026-08-23: solo este queda al arranque (pinta insignias que se ven fuera de su pantalla y es una query chica, solo TUS solicitudes). chat/comments/reportes/novedades se enganchan al abrir su pantalla -- ver _subUnaVez(). */
  getCurrentLocation();
  publicarUbicacionInicial();
  solicitarPermisosEsenciales();
  _intentarReanudarNavegacion();
  // 2026-08-15: pedido de Inty -- el tutorial automático se disparaba a los 2.6s SIN
  // esperar a que terminara de hablar el mensaje de bienvenida, cortándolo a mitad de
  // camino. El mensaje de bienvenida ya le dice al usuario que puede preguntarle a
  // Pistero cualquier duda -- y Pistero YA sabe mostrar el tutorial paso a paso cuando
  // se lo piden por chat (línea ~10487: "tutorial"/"ayuda"/"no entiendo") o desde el
  // botón "Ver tutorial" en Ajustes (línea ~1069). No se tocó esa lógica, solo se sacó
  // el arranque automático y forzado la primera vez.
  // 2026-08-15: los timeouts fijos (2600ms / 1050ms) para abrirEsfera() no esperaban a
  // que terminara la voz -- el mensaje de primera vez (~17s estimados) quedaba cortado
  // por el flash+sonido de abrirEsfera(). Ahora se espera a que vozHablando sea false.
  if(localStorage.getItem('lp_tut_'+cu)!=='done'){
    setTimeout(function(){
      _pisteroIntroPrimeraVez(nombre);
      _esperarFinVoz(function(){ if(cu) localStorage.setItem('lp_tut_'+cu,'done'); if(typeof abrirEsfera==='function') abrirEsfera(); });
    }, 500);
  } else {
    setTimeout(function(){
      if(!_pisteroIntroPrimeraVez(nombre)) h(saludoBienvenida(nombre));
      _esperarFinVoz(function(){ if(typeof abrirEsfera==='function') abrirEsfera(); });
    },600);
  }
}

async function _completarLoginVerificado(cuVal, nombre, e_val){
  if(typeof _lpDbg==='function') _lpDbg('completarLoginVerificado:ENTRA', {cuVal:cuVal});
  try{
    await _completarLoginVerificadoOriginal(cuVal, nombre, e_val);
    if(typeof _lpDbg==='function') _lpDbg('completarLoginVerificado:TERMINO-OK');
  }catch(err){
    if(typeof _lpDbg==='function') _lpDbg('completarLoginVerificado:THREW', {msg: err&&err.message, name: err&&err.name, stack: err&&err.stack&&err.stack.substring(0,600)});
    throw err;
  }
}
async function cerrarSesion(){ if(ulp){ulp();ulp=null;} if(await lpConfirmar("¿Cerrar sesión?")){ try{ await firebase.auth().signOut(); }catch(e){} localStorage.removeItem('lp_session'); location.reload(); } }
function toggleGhost(){ ghostMode=!ghostMode; localStorage.setItem('lp_ghost_'+cu,ghostMode); updateGhostButton(); if(ghostMode){ if(ulp){ulp();ulp=null;} db.collection('users').doc(cu).set({visible:false,lat:null,lon:null},{merge:true}); _rtdOcultarPosicion(); h("Modo fantasma activado. Nadie te ve."); } else { subscribeToUsers(); h("Modo fantasma desactivado. Vuelves al mapa."); } }
// Ahora vive dentro del menú de la ficha de usuario: sin fondo de píldora, el estado
// se marca con el cian de Pistero cuando está activo.
function updateGhostButton(){ const btn=document.getElementById('ghostBtn'); if(!btn) return; btn.innerText='👻 Modo fantasma: '+(ghostMode?'ON':'OFF'); btn.style.color=ghostMode?'#12b3a6':''; }
function toggleUserMenu(e){ if(e&&e.stopPropagation) e.stopPropagation(); const m=document.getElementById('uMenu'); if(m) m.classList.toggle('on'); }
function cerrarUserMenu(){ const m=document.getElementById('uMenu'); if(m) m.classList.remove('on'); }
document.addEventListener('click', function(e){ if(!e.target.closest || !e.target.closest('.uchip-wrap')) cerrarUserMenu(); });
