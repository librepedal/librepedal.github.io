/* ================================================================
   elige-pistero.js — "Elige tu Pistero" en la app (fases B y D del plan
   COORDINACION-IA/PLAN-ELIGE-PISTERO-APP.md; maqueta aprobada: disenos-ui/elige-tu-pistero/).
   ================================================================
   - Primera vez: pantalla completa para elegir entre los 6 modelos (orden barajado por persona,
     PistModelos.orden()) y confirmación "¡X ya es tu Pistero!". Una vez por cuenta, después de la
     bienvenida; también a quienes ya usaban la app (recomendación del plan: sin eso la prueba no
     junta datos). Llave: lp_pm_elegido_<cu> + pistOpts.modelo en Firestore (otros teléfonos).
   - Armario: tarjeta "Tu Pistero" + "Cambiar modelo" arriba de la tienda.
   - El modelo elegido se ve en la app: chip de usuario, barra de abajo, "Pregúntale a Pistero",
     ranking/perfil de comunidad y pantalla de Fundadores (_pistAvatar). Los lugares chicos usan una
     imagen fija del modelo real (pistero-modelos/img/mini-*.png, herramientas/pistero-modelos/
     miniaturas.mjs): una animación por capas ahí no se nota y gasta batería.
   - Pendiente (fase C/D resto): piezas del armario por modelo, sobrevuelo y marcador del mapa con el
     modelo. Hasta entonces esos lugares siguen con el Clásico.
   Datos de la prueba (sin datos personales): epContar() suma en pistModelosStats/{id}. */

var EP_IDS = ['ciber', 'orbe', 'slime', 'vinilo', 'casco', 'clasico'];
var EP_CAPAS = { ciber: 1, orbe: 1, slime: 1, vinilo: 1 };

// Modelo válido o 'clasico' (el valor puede venir de Firestore, escrito por el cliente de otro usuario).
function epModeloValido(id){ return EP_IDS.indexOf(id) >= 0 ? id : 'clasico'; }
function epMiModelo(){
  try{ return epModeloValido((typeof _pistOpts === 'function' ? _pistOpts() : {}).modelo); }catch(e){ return 'clasico'; }
}
// expresión del Pistero clásico -> estado de la miniatura
function epEstadoMini(expr){
  var x = String(expr || '');
  if(/habl|cont|explic/.test(x)) return 'hablar';
  if(/feliz|emoc|ri|celebr|gui/.test(x)) return 'feliz';
  return 'reposo';
}
// HTML del avatar de cualquier ciclista (opts = pistOpts de esa persona). SVG en todos los casos, para que
// encaje donde antes iba el SVG del Clásico (algunos llamadores le cambian el tamaño con replace('<svg ', ...)).
function _pistAvatar(opts, expr){
  var id = epModeloValido(opts && opts.modelo);
  if(id === 'clasico' || typeof PistModelos === 'undefined') return _pistoDe(opts || {}, expr || 'feliz');
  if(id === 'casco'){
    var x = (PistModelos && PistModelos.svgDe) ? PistModelos.svgDe('casco', epEstadoMini(expr) === 'hablar' ? 'hablar' : (epEstadoMini(expr) === 'feliz' ? 'feliz' : 'reposo')) : '';
    return x || _pistoDe(opts || {}, expr || 'feliz');
  }
  var src = (window.PM_BASE || 'pistero-modelos/') + 'img/mini-' + id + '-' + epEstadoMini(expr) + '.png';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pistero"><image href="' + src + '" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/></svg>';
}
function _pistAvatarMio(expr){ return _pistAvatar(typeof _pistOpts === 'function' ? _pistOpts() : {}, expr); }

/* ---------- guardar ---------- */
function epGuardar(id){
  id = epModeloValido(id);
  var antes = epMiModelo();
  if(typeof _pistOpts === 'function' && typeof _pistGuardar === 'function'){ var o = _pistOpts(); o.modelo = id; _pistGuardar(o); }
  try{ if(typeof cu !== 'undefined' && cu) localStorage.setItem('lp_pm_elegido_' + cu, id); }catch(e){}
  // marca aparte de pistOpts.modelo: _pistNormal deja 'clasico' a todos por defecto, así que el modelo solo
  // no dice si la persona ya pasó por la pantalla. pmElegido sí (y viaja a sus otros teléfonos).
  try{ if(typeof cu !== 'undefined' && cu && typeof db !== 'undefined') db.collection('users').doc(cu).set({ pmElegido: id }, { merge: true }).catch(function(){}); }catch(e){}
  try{ if(typeof _pintarMiPistero === 'function') _pintarMiPistero(true); }catch(e){}
  epArmarioTarjeta();
  if(antes !== id) epContar(id, antes);
}
// Conteo agregado por modelo (fase E mínima): cuántos lo eligen y cuántos lo dejan. Sin uid ni datos personales.
function epContar(id, antes){
  try{
    if(typeof db === 'undefined' || !firebase || !firebase.firestore) return;
    var inc = firebase.firestore.FieldValue.increment(1);
    db.collection('pistModelosStats').doc(id).set({ elegido: inc }, { merge: true }).catch(function(){});
    if(antes && antes !== id) db.collection('pistModelosStats').doc(antes).set({ dejado: inc }, { merge: true }).catch(function(){});
  }catch(e){}
}

/* ---------- pantalla ---------- */
var _ep = null;
function _epCerrar(){
  var c = document.getElementById('epCapa'); if(c) c.remove();
  if(_ep && _ep.timer) clearInterval(_ep.timer);
  _ep = null;
}
function _epMini(id){
  if(id === 'clasico') return _pistoDe(typeof _pistOpts === 'function' ? _pistOpts() : {}, 'feliz');
  return _pistAvatar({ modelo: id }, 'reposo');
}
function _epTextos(){
  if(!_ep) return;
  var m = PistModelos.porId[_ep.actual];
  var cap = document.getElementById('epCapa'); if(!cap) return;
  cap.querySelectorAll('.j-nombre').forEach(function(e){ e.textContent = m.n; });
  cap.querySelectorAll('.j-mov').forEach(function(e){ e.textContent = m.mov; });
  var b = cap.querySelector('#epUsar'); if(b) b.textContent = 'Usar a ' + m.n;
  cap.querySelectorAll('.ep-mini').forEach(function(x){ var on = x.getAttribute('data-id') === _ep.actual; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
}
async function _epMostrar(id, estado){
  if(!_ep) return;
  var h = document.getElementById('epStage'); if(!h) return;
  var gen = (_ep.gen = (_ep.gen || 0) + 1);
  if(!_ep.inst[id]){
    var el = document.createElement('div'); el.className = 'ep-mod';
    _ep.inst[id] = { el: el, api: null, prom: PistModelos.crear(el, id).then(function(a){ _ep && _ep.inst[id] && (_ep.inst[id].api = a); return a; }).catch(function(){ return null; }) };
  }
  var it = _ep.inst[id];
  if(it.el.parentNode !== h){ h.innerHTML = ''; h.appendChild(it.el); it.el.classList.remove('ep-entra'); void it.el.offsetWidth; it.el.classList.add('ep-entra'); }
  var a = it.api || await it.prom;
  if(!_ep || gen !== _ep.gen) return;
  if(a) a.poner(estado || 'reposo');
}
// modo: 'primera' (después de la bienvenida) | 'cambiar' (desde el Armario)
function epAbrir(modo, alCerrar){
  if(typeof PistModelos === 'undefined'){ if(alCerrar) alCerrar(); return; }
  _epCerrar();
  var orden = PistModelos.orden(), elegido = epMiModelo();
  _ep = { modo: modo, alCerrar: alCerrar, inst: {}, actual: modo === 'cambiar' ? elegido : orden[0] };
  var minis = orden.map(function(id){
    var m = PistModelos.porId[id];
    return '<button type="button" class="ep-mini" data-id="' + id + '"><span class="ep-cara">' + _epMini(id) + '</span><small>' + m.n + '</small></button>';
  }).join('');
  var capa = document.createElement('div'); capa.id = 'epCapa'; capa.className = 'ep-capa';
  capa.innerHTML = ''
    + '<div class="ep-pant" id="epElegir">'
    + '<div class="ep-hdr">' + (modo === 'cambiar' ? '<button type="button" class="ep-volver" id="epVolver" aria-label="Volver"><i class="fas fa-arrow-left"></i></button>' : '<span class="ep-logo">LIBRE <i>PEDAL</i></span>') + '<span class="ep-chip">' + (modo === 'cambiar' ? 'Cambiar modelo' : 'Tu compañero') + '</span></div>'
    + '<div class="ep-cont">'
    + '<div><div class="ep-t1">Elige tu Pistero</div><div class="ep-t2">Va contigo en cada viaje: te guía, te avisa y celebra contigo.</div></div>'
    + '<div class="ep-stage"><div class="ep-hueco" id="epStage"></div></div>'
    + '<div class="ep-nombre"><b class="j-nombre"></b><span class="j-mov"></span></div>'
    + '<div class="ep-tira">' + minis + '</div>'
    + '<div class="ep-gratis">Lanzamiento: todos los modelos gratis por tiempo limitado.</div>'
    + '<button type="button" class="ep-btn" id="epUsar"></button>'
    + '<div class="ep-peq">Lo puedes cambiar cuando quieras en el Armario.</div>'
    + '</div></div>'
    + '<div class="ep-pant ep-listo" id="epListo" hidden>'
    + '<div class="ep-stage ep-stage-gde"><div class="ep-hueco" id="epStageListo"></div></div>'
    + '<div class="ep-t1" id="epTListo"></div>'
    + '<div class="ep-t2" style="max-width:280px">Lo vas a ver en Inicio, en tu perfil y en el ranking.</div>'
    + '<button type="button" class="ep-btn" id="epEmpezar" style="width:100%;max-width:340px;margin-top:14px">' + (modo === 'cambiar' ? 'Listo' : 'Empezar a pedalear') + '</button>'
    + '</div>';
  document.body.appendChild(capa);
  capa.querySelectorAll('.ep-mini').forEach(function(b){
    b.onclick = function(){
      var id = b.getAttribute('data-id'); _ep.actual = id; _epTextos(); _epMostrar(id, 'feliz');
      setTimeout(function(){ if(_ep && _ep.actual === id) _epMostrar(id, 'reposo'); }, 1600);
    };
  });
  var v = capa.querySelector('#epVolver'); if(v) v.onclick = function(){ var cb = _ep && _ep.alCerrar; _epCerrar(); if(cb) cb(); };
  capa.querySelector('#epUsar').onclick = function(){
    var id = _ep.actual, m = PistModelos.porId[id];
    epGuardar(id);
    document.getElementById('epElegir').hidden = true; document.getElementById('epListo').hidden = false;
    document.getElementById('epTListo').textContent = '¡' + m.n + ' ya es tu Pistero!';
    var st = document.getElementById('epStageListo'), it = _ep.inst[id];
    if(it){ st.innerHTML = ''; st.appendChild(it.el); }
    _ep.gen++; (it && (it.api ? Promise.resolve(it.api) : it.prom) || Promise.resolve(null)).then(function(a){ if(a) a.poner('feliz'); });
  };
  capa.querySelector('#epEmpezar').onclick = function(){ var cb = _ep && _ep.alCerrar; _epCerrar(); if(cb) cb(); };
  _epTextos(); _epMostrar(_ep.actual, 'reposo');
  // el modelo a la vista vive (como en la maqueta): reposo, habla, se alegra, se sorprende
  var seq = ['reposo', 'hablar', 'reposo', 'feliz', 'reposo', 'sorpresa'], k = 0;
  _ep.timer = setInterval(function(){ if(!_ep || !document.getElementById('epElegir') || document.getElementById('epElegir').hidden) return; k = (k + 1) % seq.length; var it = _ep.inst[_ep.actual]; if(it && it.api) it.api.poner(seq[k]); }, 2600);
}
// Una vez por cuenta, después de la bienvenida. Si ya eligió (en este u otro teléfono), sigue de largo.
async function epIniciar(alCerrar){
  var listo = function(){ if(alCerrar) alCerrar(); };
  try{
    if(typeof cu === 'undefined' || !cu || typeof PistModelos === 'undefined') return listo();
    if(localStorage.getItem('lp_pm_elegido_' + cu)) return listo();
    try{
      var d = await db.collection('users').doc(cu).get();
      var dd = d.exists ? d.data() : {};
      if(EP_IDS.indexOf(dd.pmElegido) >= 0){
        // ya eligió en otro teléfono: se trae su modelo y no se vuelve a preguntar
        localStorage.setItem('lp_pm_elegido_' + cu, dd.pmElegido);
        var o = (typeof _pistOpts === 'function') ? _pistOpts() : null;
        if(o){ o.modelo = epModeloValido(dd.pistOpts && dd.pistOpts.modelo || dd.pmElegido); try{ localStorage.setItem('lp_pist_' + cu, JSON.stringify(o)); }catch(e){} }
        try{ _pintarMiPistero(true); epArmarioTarjeta(); }catch(e){}
        return listo();
      }
    }catch(e){ /* sin señal: se muestra igual; elegir guarda local y sube cuando se pueda */ }
    epAbrir('primera', listo);
  }catch(e){ listo(); }
}

/* ---------- Armario: tarjeta "Tu Pistero" ---------- */
function epArmarioTarjeta(){
  var t = document.getElementById('pistTienda'); if(!t || typeof PistModelos === 'undefined') return;
  var c = document.getElementById('epTarjeta');
  if(!c){ c = document.createElement('div'); c.id = 'epTarjeta'; c.className = 'ep-tarj'; t.parentNode.insertBefore(c, t); }
  var id = epMiModelo(), m = PistModelos.porId[id];
  c.innerHTML = '<span class="ep-tarj-cara">' + _pistAvatarMio('feliz') + '</span>'
    + '<span class="ep-tarj-der"><small>Tu Pistero</small><b>' + m.n + '</b><span>' + m.mov + '</span>'
    + '<button type="button" class="ep-btn ep-sec" onclick="epAbrir(\'cambiar\', epArmarioTarjeta)">Cambiar modelo</button></span>'
    + (id === 'clasico' ? '' : '<p class="ep-tarj-nota">Las piezas de abajo son del Clásico: se ven cuando lo usas a él. Las de ' + m.n + ' llegan pronto.</p>');
}
(function(){
  function ini(){ try{ epArmarioTarjeta(); }catch(e){} }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ini); else ini();
})();
