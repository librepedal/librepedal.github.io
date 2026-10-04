/* ================================================================
   bienvenida-huella.js — Bienvenida de Pistero + "Dejar mi huella" + Mapa de huellas
   ================================================================
   Aprobado por Inty el 2026-10-04 (texto, pantalla completa, N° de ciclista, insignia
   Fundador, huella en el mapa). Ver COORDINACION-IA/BIENVENIDA-TEXTO-APROBADO-2026-10-04.md
   y el mockup disenos-ui/bandeja-y-bienvenida/mockup.html (pantallas 1, 2 y 2b).

   - Bienvenida: UNA vez por cuenta (localStorage + users/{cu}.bienvenidaVista, para no
     repetirla en otro teléfono). Voz PREGRABADA (voces-el/bienvenida/, generada una sola
     vez con scripts/gen-voz-bienvenida.js): nunca llama a ElevenLabs en vivo. Si falta un
     mp3, la frase igual aparece a su ritmo, en silencio.
   - N° de ciclista: orden real de registro (createdAt), el mismo que ya usa
     mostrarFundadores() en gamificacion-comunidad.js. No se guarda ni se puede falsear.
   - Fundador: entre los primeros LP_FUNDADORES_CUPO (1.000, promesa que YA está en
     producción) O registrado durante el primer año desde el lanzamiento. Lo que más
     favorezca a cada persona: nadie pierde lo que la app ya le prometió.
   - Huella: la idea es PRIVADA (huellas/{cu}_{1|2}, solo la lee su dueño o el admin).
     En el mapa solo se ve cuántas huellas hay por comuna (huellasZona/{zona}), con
     coordenadas redondeadas a ~10 km. Nunca el texto ni la ubicación exacta.
   - Obras del fondo (obrasFondo/*): las escribe solo el admin; es la huella grande de
     la comunidad. Hoy no hay ninguna.
   Aditivo y en try/catch, como el resto de la app: si algo falla, la app sigue igual. */

var BH_FRASES = [
  'Llegaste justo a tiempo.',
  'Desde hoy eres parte de algo que nunca se había hecho.',
  'Aquí no venimos a contar kilómetros: venimos a cambiar las cosas.',
  'Tu voz, tus rutas, tus ideas van a marcar el camino de miles que vienen detrás.',
  'Esto recién empieza, y tú estás aquí desde el principio.',
  'Vamos a dejar una huella que nadie podrá borrar.',
  'Bienvenido a Libre Pedal.'
];
// 24-sep-2026: primera versión en producción en Google Play (8.800). Fundador = un año desde ahí.
var BH_FUNDADOR_HASTA_MS = Date.UTC(2027, 8, 24, 3);
var BH_IDEA_MIN = 8, BH_IDEA_MAX = 280, BH_IDEAS_MAX = 2;

/* ---------- lógica pura (probada en tests/bienvenida-huella.test.mjs) ---------- */
function bhFrases(genero){
  var f = BH_FRASES.slice();
  if(genero === 'c') f[6] = 'Bienvenida a Libre Pedal.';
  return f;
}
function bhEsFundador(num, createdMs){
  var cupo = (typeof LP_FUNDADORES_CUPO !== 'undefined') ? LP_FUNDADORES_CUPO : 1000;
  return !!((num && num <= cupo) || (createdMs && createdMs < BH_FUNDADOR_HASTA_MS));
}
function bhSlug(t){
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function bhZonaId(pais, comuna){
  var p = bhSlug(pais).slice(0, 3) || 'xx', c = bhSlug(comuna);
  return c ? p + '__' + c : null;
}
function bhIdeaValida(t){
  var s = String(t || '').trim();
  return s.length >= BH_IDEA_MIN && s.length <= BH_IDEA_MAX;
}
function bhSiguienteSlot(usados){
  for(var i = 1; i <= BH_IDEAS_MAX; i++) if((usados || []).indexOf(i) === -1) return i;
  return null;
}
// ~10 km: el mapa nunca muestra dónde vive nadie, solo la zona.
function bhRedondear(x){ return Math.round(x * 10) / 10; }

/* ---------- utilidades de pantalla ---------- */
function _bhEsc(s){ return (typeof escapeHTML === 'function') ? escapeHTML(s) : String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function _bhGenero(){ return (typeof pisteroGenero !== 'undefined' && pisteroGenero === 'c') ? 'c' : 'l'; }
function _bhCara(){
  try{ var o = _pistOpts(); return _pisteroExprSVG('feliz', _pistCascoCol(), _pistPielCol(), o.lentes, o.bigote, o.acc, o); }
  catch(e){ return ''; }
}
function _bhCapa(id, html){
  var v = document.getElementById(id); if(v) v.remove();
  var d = document.createElement('div'); d.id = id; d.className = 'bh-capa'; d.innerHTML = html;
  document.body.appendChild(d); return d;
}
function _bhCerrar(id){ var v = document.getElementById(id); if(v) v.remove(); }
var _bhAudio = null;
// Reproduce un mp3 pregrabado y resuelve al terminar. Sin archivo/sin permiso de audio:
// espera lo que tardaría en decirse (~62 ms por letra) para mantener el ritmo.
function _bhDecir(id, texto){
  return new Promise(function(ok){
    var listo = false, fin = function(){ if(!listo){ listo = true; ok(); } };
    var espera = function(){ setTimeout(fin, Math.max(1600, String(texto || '').length * 62)); };
    try{
      if(_bhAudio){ try{ _bhAudio.pause(); }catch(e){} }
      var a = new Audio('voces-el/bienvenida/' + _bhGenero() + '-' + id + '.mp3');
      _bhAudio = a;
      a.onended = fin;
      a.onerror = espera;
      var p = a.play(); if(p && p.catch) p.catch(espera);
    }catch(e){ espera(); }
  });
}
function _bhCallar(){ if(_bhAudio){ try{ _bhAudio.pause(); }catch(e){} _bhAudio = null; } }

/* ---------- datos ---------- */
var _bhYo = null; // {num, fundador}
async function _bhMiNumero(){
  if(_bhYo) return _bhYo;
  var num = null, created = null;
  try{ var n = +localStorage.getItem('lp_nciclista_' + cu); if(n > 0) num = n; }catch(e){}
  try{
    var me = await db.collection('users').doc(cu).get();
    var ts = me.exists ? me.data().createdAt : null;
    if(ts && ts.toMillis){
      created = ts.toMillis();
      if(!num){
        var agg = await db.collection('users').where('createdAt', '<', ts).count().get();
        num = (agg.data().count || 0) + 1;
        try{ localStorage.setItem('lp_nciclista_' + cu, String(num)); }catch(e){}
      }
    }
  }catch(e){}
  _bhYo = { num: num, fundador: bhEsFundador(num, created || Date.now()) };
  return _bhYo;
}

/* ---------- 1 · Bienvenida ---------- */
async function bhIniciar(nombre, seguir){
  var listo = function(vista){ try{ seguir && seguir(vista === true); }catch(e){} };
  try{
    if(typeof cu === 'undefined' || !cu) return listo();
    if(localStorage.getItem('lp_bienv_' + cu)) return listo();
    try{
      var d = await db.collection('users').doc(cu).get();
      if(d.exists && d.data().bienvenidaVista){ localStorage.setItem('lp_bienv_' + cu, '1'); return listo(); }
    }catch(e){}
    bhMostrarBienvenida(function(){ listo(true); });
  }catch(e){ listo(); }
}

async function bhMostrarBienvenida(alCerrar){
  var frases = bhFrases(_bhGenero());
  var html = '<div class="bh-wel" role="dialog" aria-modal="true" aria-label="Bienvenida a Libre Pedal">'
    + '<svg class="bh-track" viewBox="0 0 310 120" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 100 C 60 60, 110 118, 170 80 S 270 40, 330 70"/></svg>'
    + '<div class="bh-in">'
    + '<span class="bh-cara bh-x">' + _bhCara() + '</span>'
    + '<div class="bh-txt">' + frases.map(function(f, i){
        return '<span class="bh-x' + (i === 0 ? ' bh-t1' : '') + (i === 5 ? ' bh-hl' : '') + '">' + _bhEsc(f) + '</span>';
      }).join('') + '</div>'
    + '<div class="bh-sello bh-x" id="bhSello" hidden></div>'
    + '<div class="bh-btns bh-x">'
    +   '<button type="button" class="bh-btn bh-pri" id="bhHuella"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4c-2 0-3 2-3 5s1 5 3 5 3-2 3-5-1-5-3-5zM6 17h4l-.5 3h-3z"/><path d="M16 8c-2 0-3 2-3 5s1 5 3 5 3-2 3-5-1-5-3-5z" opacity=".55"/></svg>Dejar mi huella</button>'
    +   '<button type="button" class="bh-btn bh-sec" id="bhRodar">Vamos a rodar</button>'
    +   '<button type="button" class="bh-link" id="bhAyuda">¿Dudas? Ayuda y contacto</button>'
    + '</div></div></div>';
  var capa = _bhCapa('bhBienvenida', html);
  var marcar = function(){
    try{ localStorage.setItem('lp_bienv_' + cu, '1'); }catch(e){}
    // La presentación vieja de Pistero sobra después de esto.
    try{ localStorage.setItem('lp_intro_pistero_' + cu, '1'); }catch(e){}
    try{ db.collection('users').doc(cu).set({ bienvenidaVista: true, introPistero: true }, { merge: true }); }catch(e){}
  };
  var cerrado = false;
  var cerrar = function(despues){
    if(cerrado) return; cerrado = true; _bhCallar(); marcar(); _bhCerrar('bhBienvenida');
    if(despues) despues(); else alCerrar();
  };
  capa.querySelector('#bhRodar').onclick = function(){ cerrar(); };
  capa.querySelector('#bhHuella').onclick = function(){ cerrar(function(){ bhAbrirHuella(alCerrar); }); };
  capa.querySelector('#bhAyuda').onclick = function(){ cerrar(function(){ alCerrar(); try{ cv('ajustes'); }catch(e){} }); };

  var yoP = _bhMiNumero();
  var ver = function(el){ if(el) el.classList.add('bh-vis'); };
  var xs = capa.querySelectorAll('.bh-txt .bh-x');
  ver(capa.querySelector('.bh-cara'));
  for(var i = 0; i < xs.length; i++){
    if(cerrado) return;
    ver(xs[i]);
    await _bhDecir('b' + (i + 1), frases[i]);
  }
  if(cerrado) return;
  var yo = await yoP;
  var sello = capa.querySelector('#bhSello');
  if(yo && yo.num){
    sello.innerHTML = _bhEscudo() + '<span><small>Ciclista</small><b>N° ' + yo.num.toLocaleString('es-CL') + '</b>'
      + (yo.fundador ? '<em>Fundador</em>' : '') + '</span>';
    sello.hidden = false; sello.classList.add('bh-sellar');
  }
  setTimeout(function(){ ver(capa.querySelector('.bh-btns')); }, yo && yo.num ? 900 : 0);
}
function _bhEscudo(){
  return '<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M20 2 L37 8 V22 C37 32 29 39 20 42 C11 39 3 32 3 22 V8 Z" fill="rgba(255,215,0,.12)" stroke="#ffd700" stroke-width="2"/><g stroke="#ffd700" stroke-width="2.2" stroke-linecap="round"><path d="M20 12v3M20 29v3M10 22h3M27 22h3M13 15l2 2M25 27l2 2M13 29l2-2M25 17l2-2"/></g><circle cx="20" cy="22" r="5.5" fill="none" stroke="#ffd700" stroke-width="2"/><circle cx="20" cy="22" r="1.6" fill="#ffd700"/></svg>';
}

/* ---------- 2 · Dejar mi huella ---------- */
var _bhLugar = null; // {pais, comuna, lat, lon}
async function _bhDetectarLugar(){
  if(_bhLugar) return _bhLugar;
  var loc = (typeof currentUserLocation !== 'undefined' && currentUserLocation) ? currentUserLocation : null;
  var pais = (typeof paisUsuario !== 'undefined' && paisUsuario) ? paisUsuario : 'cl';
  if(!loc) return { pais: pais, comuna: '', lat: null, lon: null };
  var comuna = '';
  try{
    var r = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&accept-language=es&zoom=10&lat=' + loc.lat + '&lon=' + loc.lon);
    var j = await r.json(), a = j.address || {};
    comuna = a.city || a.town || a.village || a.municipality || a.county || '';
    if(a.country_code) pais = a.country_code;
  }catch(e){}
  _bhLugar = { pais: pais, comuna: comuna, lat: bhRedondear(loc.lat), lon: bhRedondear(loc.lon) };
  return _bhLugar;
}
async function _bhMisSlots(){
  var usados = [];
  for(var i = 1; i <= BH_IDEAS_MAX; i++){
    try{ var d = await db.collection('huellas').doc(cu + '_' + i).get(); if(d.exists) usados.push(i); }catch(e){}
  }
  return usados;
}

async function bhAbrirHuella(alSalir){
  var salir = function(){ _bhCerrar('bhHuellaCapa'); if(alSalir) alSalir(); };
  if(typeof cu === 'undefined' || !cu){ if(typeof lpAviso === 'function') lpAviso('Inicia sesión para dejar tu huella.'); return; }
  var capa = _bhCapa('bhHuellaCapa', '<div class="bh-pant"><div class="bh-top"><button type="button" class="bh-volver" aria-label="Volver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><h3>Dejar mi huella</h3></div><div class="bh-cuerpo"><p class="bh-sub">Cargando…</p></div></div>');
  capa.querySelector('.bh-volver').onclick = salir;
  var usados = await _bhMisSlots(), slot = bhSiguienteSlot(usados);
  var lugar = await _bhDetectarLugar();
  var cuerpo = capa.querySelector('.bh-cuerpo');
  if(!slot){
    cuerpo.innerHTML = '<p class="bh-intro"><b>Ya dejaste tus 2 huellas.</b> Están sumadas a lo que pide la comunidad.</p>'
      + '<button type="button" class="bh-btn bh-pri" id="bhVerMapa">Ver el mapa de huellas</button>';
    cuerpo.querySelector('#bhVerMapa').onclick = function(){ _bhCerrar('bhHuellaCapa'); bhAbrirMapa(alSalir); };
    return;
  }
  cuerpo.innerHTML = '<p class="bh-intro"><b>Nuestra huella es lo que vamos a construir juntos.</b> Con el fondo de la comunidad haremos realidad lo que más se pida. Empieza con tu idea.</p>'
    + '<label class="bh-lbl" for="bhIdea">¿Qué cambiarías en tus rutas?</label>'
    + '<textarea id="bhIdea" class="bh-ta" rows="3" maxlength="' + BH_IDEA_MAX + '" placeholder="Ej: un bebedero y un punto de reparación en mi ruta"></textarea>'
    + '<div class="bh-loc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>'
    +   '<input id="bhComuna" maxlength="60" placeholder="Tu comuna" value="' + _bhEsc(lugar.comuna) + '" aria-label="Comuna"></div>'
    + '<p class="bh-nota"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span>Tu idea es privada. En el mapa solo se ve cuántas huellas hay en cada comuna, nunca tu texto ni tu ubicación exacta.</span></p>'
    + '<button type="button" class="bh-btn bh-pri" id="bhMarcar">Marcar mi huella</button>'
    + '<p class="bh-fine">' + (slot === 1 ? 'Puedes dejar 2 ideas' : 'Te queda 1 idea') + '</p>';
  var btn = cuerpo.querySelector('#bhMarcar');
  btn.onclick = async function(){
    var texto = cuerpo.querySelector('#bhIdea').value.trim();
    var comuna = cuerpo.querySelector('#bhComuna').value.trim();
    if(!bhIdeaValida(texto)){ if(typeof lpAviso === 'function') lpAviso('Cuéntanos tu idea en al menos ' + BH_IDEA_MIN + ' letras.'); return; }
    var zona = bhZonaId(lugar.pais, comuna);
    if(!zona){ if(typeof lpAviso === 'function') lpAviso('Escribe tu comuna para marcar tu huella.'); return; }
    btn.disabled = true; btn.textContent = 'Marcando…';
    var yo = await _bhMiNumero();
    try{
      await _bhGuardar(slot, texto, lugar, comuna, zona, yo.fundador);
    }catch(e){
      console.error(e); btn.disabled = false; btn.textContent = 'Marcar mi huella';
      if(typeof lpAviso === 'function') lpAviso('No se pudo guardar tu huella. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    _bhCerrar('bhHuellaCapa');
    bhAbrirMapa(alSalir, { recien: true, zona: zona, fundador: yo.fundador, primera: slot === 1 });
  };
}

// Huella (privada) + contador de su comuna, en UNA escritura atómica: la regla de
// huellasZona exige que el contador suba exactamente 1 y solo junto a la PRIMERA huella.
async function _bhGuardar(slot, texto, lugar, comuna, zona, fundador){
  var FV = firebase.firestore.FieldValue;
  // Si la comuna ya está en el mapa, se reusa su nombre y su punto tal cual (la regla
  // exige que no cambien): "Futrono" y "futrono" son la misma huella en el mapa.
  var previa = null;
  if(slot === 1){ try{ var zd = await db.collection("huellasZona").doc(zona).get(); if(zd.exists) previa = zd.data(); }catch(e){} }
  var intentar = async function(fund){
    var b = db.batch();
    b.set(db.collection("huellas").doc(cu + "_" + slot), {
      user: cu, texto: texto, pais: lugar.pais, comuna: comuna, zona: zona, fundador: !!fund, ts: FV.serverTimestamp()
    });
    if(slot === 1){
      var z = { pais: previa ? previa.pais : lugar.pais, comuna: previa ? previa.comuna : comuna, n: FV.increment(1), nf: FV.increment(fund ? 1 : 0) };
      if(!(previa && previa.lat != null) && lugar.lat !== null){ z.lat = lugar.lat; z.lon = lugar.lon; }
      b.set(db.collection("huellasZona").doc(zona), z, { merge: true });
    }
    await b.commit();
  };
  try{ await intentar(fundador); }
  catch(e){
    // Caso borde: Fundador por estar entre los primeros 1.000 pero registrado después del
    // primer año (la regla no puede contar usuarios). La huella se marca igual, sin el dorado.
    if(!fundador) throw e;
    await intentar(false);
  }
  try{ localStorage.setItem("lp_huella_zona_" + cu, zona); }catch(e){}
}

/* ---------- 2b · Mapa de huellas ---------- */
var _bhMapa = null;
async function bhAbrirMapa(alSalir, info){
  info = info || {};
  var salir = function(){ _bhCallar(); if(_bhMapa){ try{ _bhMapa.remove(); }catch(e){} _bhMapa = null; } _bhCerrar('bhMapaCapa'); if(alSalir) alSalir(); };
  var capa = _bhCapa('bhMapaCapa', '<div class="bh-pant"><div class="bh-top"><button type="button" class="bh-volver" aria-label="Volver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><h3>Mapa de huellas</h3></div>'
    + '<div id="bhMapaDiv" class="bh-mapa"></div><div class="bh-cuerpo" id="bhMapaInfo"><p class="bh-sub">Cargando huellas…</p></div></div>');
  capa.querySelector('.bh-volver').onclick = salir;

  var miZona = info.zona || (function(){ try{ return localStorage.getItem('lp_huella_zona_' + cu); }catch(e){ return null; } })();
  var zonas = [], obras = [];
  try{ var s = await db.collection('huellasZona').limit(1000).get(); s.forEach(function(d){ var z = d.data(); z.id = d.id; zonas.push(z); }); }catch(e){}
  try{ var o = await db.collection('obrasFondo').limit(200).get(); o.forEach(function(d){ obras.push(d.data()); }); }catch(e){}
  var mia = zonas.find(function(z){ return z.id === miZona; }) || null;
  var paisMio = mia ? mia.pais : ((typeof paisUsuario !== 'undefined' && paisUsuario) || 'cl');
  var totPais = zonas.filter(function(z){ return z.pais === paisMio; }).reduce(function(n, z){ return n + (z.n || 0); }, 0);

  try{
    var centro = mia && mia.lat != null ? [mia.lat, mia.lon]
      : (typeof currentUserLocation !== 'undefined' && currentUserLocation ? [currentUserLocation.lat, currentUserLocation.lon] : [-39.8, -73.2]);
    _bhMapa = L.map('bhMapaDiv', { zoomControl: false, attributionControl: false }).setView(centro, 7);
    L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(_bhMapa);
    zonas.forEach(function(z){
      if(z.lat == null) return;
      var com = (z.n || 0) - (z.nf || 0);
      if(com > 0) L.circleMarker([z.lat, z.lon], { radius: 4 + Math.min(10, Math.sqrt(com) * 2), color: '#fc4c02', fillColor: '#fc4c02', fillOpacity: .85, weight: 0 }).addTo(_bhMapa);
      if(z.nf > 0) L.circleMarker([z.lat, z.lon], { radius: 6 + Math.min(10, Math.sqrt(z.nf) * 2), color: '#ffd700', fillColor: '#ffd700', fillOpacity: .25, weight: 2.4 }).addTo(_bhMapa);
    });
    obras.forEach(function(ob){
      if(ob.lat == null) return;
      L.circleMarker([ob.lat, ob.lon], { radius: 12, color: '#fff', weight: 2, dashArray: '3 3', fillColor: '#fff', fillOpacity: .08 }).addTo(_bhMapa)
        .bindPopup('<b>' + _bhEsc(ob.titulo || 'Obra de la comunidad') + '</b>' + (ob.anio ? '<br>' + _bhEsc(String(ob.anio)) : ''));
    });
    if(mia && mia.lat != null){
      L.marker([mia.lat, mia.lon], { icon: L.divIcon({ className: 'bh-yo', html: '<i></i><span>Tú</span>', iconSize: [18, 18] }) }).addTo(_bhMapa);
    }
    setTimeout(function(){ if(_bhMapa) _bhMapa.invalidateSize(); }, 250);
  }catch(e){ console.error(e); }

  var msg = '';
  if(info.recien){
    msg = info.fundador
      ? '<div class="bh-msg"><b>Tu huella de Fundador quedó marcada para siempre.</b>' + (_bhYo && _bhYo.num ? ' Eres el ciclista N° ' + _bhYo.num.toLocaleString('es-CL') + ' de Libre Pedal.' : '') + '</div>'
      : '<div class="bh-msg"><b>Tu huella quedó marcada.</b> Ya eres parte de lo que pide la comunidad.</div>';
    _bhDecir(info.fundador ? 'h1' : 'h2', info.fundador ? 'Tu huella de Fundador quedó marcada para siempre.' : 'Tu huella quedó marcada.');
  }
  var el = capa.querySelector('#bhMapaInfo');
  el.innerHTML = msg
    + '<div class="bh-cnt">' + (mia ? '<span><b>' + (mia.n || 0) + '</b> ' + ((mia.n || 0) === 1 ? 'huella' : 'huellas') + ' en ' + _bhEsc(mia.comuna || '') + '</span>' : '<span></span>')
    + '<span><b>' + totPais + '</b> en tu país</span></div>'
    + '<div class="bh-leg"><span><i class="bh-lf"></i>Fundadores</span><span><i class="bh-lc"></i>Comunidad</span><span><i class="bh-lo"></i>Obras del fondo</span></div>'
    + (mia ? '<button type="button" class="bh-btn bh-sec" id="bhCompartir">Compartir mi huella</button>'
           : '<button type="button" class="bh-btn bh-pri" id="bhDejar">Dejar mi huella</button>')
    + '<p class="bh-fine">Cuando la comunidad crezca, el 10% de Premium hará realidad lo que más se pida, y quedará marcado aquí como obra.</p>';
  var c = el.querySelector('#bhCompartir');
  if(c) c.onclick = function(){
    var t = 'Dejé mi huella en Libre Pedal, la comunidad ciclista que va a cambiar nuestras rutas. Súmate: https://librepedal.cl';
    try{ if(navigator.share){ navigator.share({ text: t }).catch(function(){}); return; } }catch(e){}
    try{ navigator.clipboard.writeText(t); if(typeof lpAviso === 'function') lpAviso('Copiado. Pégalo donde quieras compartirlo.'); }catch(e){}
  };
  var dj = el.querySelector('#bhDejar');
  if(dj) dj.onclick = function(){ if(_bhMapa){ try{ _bhMapa.remove(); }catch(e){} _bhMapa = null; } _bhCerrar('bhMapaCapa'); bhAbrirHuella(alSalir); };
}
