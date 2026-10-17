/* ================================================================
   pioneros.js — Distintivo "Pionero" para los testers del comienzo
   ================================================================
   Pedido de Inty (2026-10-04): quienes probaron la app desde el principio tienen algo
   que nadie más puede tener, por encima de Fundador, y Premium gratis para siempre
   desde que Premium empiece a cobrar (ver _esPremium() en voz-motor.js).

   - pioneros/{cu}: lo escribe SOLO el admin (firestore.rules). Lectura pública: el
     distintivo se ve en el perfil y en el mapa de huellas.
   - El admin pega los correos en el Panel Admin; aquí se convierten al id de cuenta
     (`cu`) con la MISMA transformación que worker-auth/worker.js (cuDeEmail sobre el
     correo en minúsculas). El correo NO se guarda en ningún lado: ni en el repo
     (que es público) ni en Firestore.
   Aditivo y en try/catch, como el resto de la app. */

var _lpPionero = false;

/* ---------- lógica pura (probada en tests/pioneros.test.mjs) ---------- */
// Espejo exacto de cuDeEmail() en worker-auth/worker.js (que recibe el correo ya en minúsculas).
function pioCuDeEmail(email){
  var e = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e.replace(/[^a-zA-Z0-9]/g, '_') : null;
}
// Saca los correos de un texto pegado (comas, saltos de línea, espacios, punto y coma).
function pioCorreosDeTexto(t){
  var vistos = {}, out = [];
  String(t || '').split(/[\s,;]+/).forEach(function(x){
    var e = x.trim().toLowerCase().replace(/^<|>$/g, '');
    if(pioCuDeEmail(e) && !vistos[e]){ vistos[e] = 1; out.push(e); }
  });
  return out;
}

/* ---------- estado de la cuenta actual ---------- */
async function pioCargarMiEstado(){
  try{
    if(typeof cu === 'undefined' || !cu) return false;
    try{ if(localStorage.getItem('lp_pionero_' + cu) === '1') _lpPionero = true; }catch(e){}
    var d = await db.collection('pioneros').doc(cu).get();
    _lpPionero = d.exists;
    try{ localStorage.setItem('lp_pionero_' + cu, _lpPionero ? '1' : '0'); }catch(e){}
  }catch(e){}
  return _lpPionero;
}
function pioSoyPionero(){ return !!_lpPionero; }

/* ---------- distintivo ---------- */
function pioEmblema(){
  return '<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M20 2 L37 8 V22 C37 32 29 39 20 42 C11 39 3 32 3 22 V8 Z" fill="rgba(232,241,255,.14)" stroke="#e8f1ff" stroke-width="2"/><path d="M20 2 L37 8 V22 C37 32 29 39 20 42" fill="none" stroke="#ffd700" stroke-width="2"/><path d="M14 33V11" stroke="#e8f1ff" stroke-width="2.2" stroke-linecap="round"/><path d="M14.5 12h13l-3.5 4.5 3.5 4.5h-13z" fill="#ffd700"/></svg>';
}
function pioInsignia(){
  return '<span class="pio-insignia">' + pioEmblema() + '<span>Pionero</span></span>';
}
// Perfil de otro ciclista (verPerfilUsuario en gamificacion-ranking.js).
async function pioInsigniaPerfil(userId){
  try{
    var d = await db.collection('pioneros').doc(userId).get();
    if(!d.exists) return;
    var slot = document.getElementById('perfilComunidadSlot');
    if(!slot || document.getElementById('pioPerfil')) return;
    var div = document.createElement('div');
    div.id = 'pioPerfil'; div.className = 'pio-perfil';
    div.innerHTML = pioInsignia() + '<small>Estuvo desde el comienzo de Libre Pedal</small>';
    slot.parentNode.insertBefore(div, slot);
  }catch(e){}
}

/* ---------- Panel Admin ---------- */
async function pioAdminMarcar(){
  var ta = document.getElementById('pioCorreos'), st = document.getElementById('pioEstado');
  if(!ta || !st) return;
  if(typeof cu === 'undefined' || cu !== ADMIN_ID){ st.textContent = 'Solo el administrador puede marcar Pioneros.'; return; }
  var correos = pioCorreosDeTexto(ta.value);
  if(!correos.length){ st.textContent = 'No encontré correos válidos.'; return; }
  st.textContent = 'Marcando ' + correos.length + '…';
  try{
    var FV = firebase.firestore.FieldValue, b = db.batch();
    correos.forEach(function(e){ b.set(db.collection('pioneros').doc(pioCuDeEmail(e)), { desde: FV.serverTimestamp() }); });
    await b.commit();
    ta.value = '';
    st.textContent = correos.length === 1 ? '1 Pionero marcado.' : correos.length + ' Pioneros marcados.';
    pioAdminContar();
  }catch(e){ console.error(e); st.textContent = 'No se pudo guardar. Revisa la conexión.'; }
}
async function pioAdminContar(){
  var el = document.getElementById('pioTotal'); if(!el) return;
  try{ var a = await db.collection('pioneros').count().get(); el.textContent = 'Pioneros marcados: ' + (a.data().count || 0); }catch(e){}
}
