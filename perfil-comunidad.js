/* ================================================================
   perfil-comunidad.js — Perfil de comunidad de Libre Pedal
   ================================================================
   Modulo APARTE de index.html (misma directiva de arquitectura de
   Inty del 2026-08-13/14: codigo nuevo en su propio archivo).
   Se engancha dentro de verPerfilUsuario() (index.html) via el div
   #perfilComunidadSlot -- esa funcion sigue intacta, solo se le
   agrego el slot y el llamado a renderPerfilComunidad().

   Modelo de datos:
   - users/{id}.bio        -> PUBLICA (la coleccion users ya es de
     lectura publica). Presentacion corta del ciclista.
   - users/{id}.oficio, .trueque, .voluntariado -> PUBLICAS, mismo
     criterio que bio. Seccion "Oficio, trueque y voluntariado":
     editable solo cuando _truequeDesbloqueado() da true (6 meses en
     la comunidad, mismo umbral que "Te doy alojo" en index.html, MAS
     50 de Darma -- pedido explicito de Inty 2026-08-31: "un espacio
     que se desbloquea con darma y tiempo en la app"). Visible para
     cualquiera que vea el perfil (como bio), no requiere amistad.
   - perfilPrivado/{id}    -> PRIVADA. fotos[] (base64, via el mismo
     comprimirFoto() que ya usan hostales/recomendaciones) y
     relatos[] ({texto,fecha}). Solo el dueno o sus AMIGOS aceptados
     pueden leerla -- lo hace cumplir la regla de Firestore (no el
     cliente), via la coleccion amistades/{uidMenor_uidMayor} que se
     escribe en acceptFriendRequest() al aceptar una solicitud.
   Requiere que Inty publique las reglas nuevas de firestore.rules
   (no se puede hacer automatico, ver REGLAS-FIREBASE.txt). Sin esas
   reglas, esto no rompe nada: perfilPrivado sencillamente no deja
   leer/escribir hasta que se publiquen. */
(function(){
  'use strict';
  const MAX_FOTOS = 9;
  const TRUEQUE_MESES_MIN = 6;   // mismo umbral que requiere6Meses() (Te doy alojo)
  const TRUEQUE_DARMA_MIN = 50;  // nivel "Explorador" -- primer escalon real de aporte

  // meses/darma reales del ciclista dueño de la sesión (mesesDesdeRegistro() y `us`
  // viven en index.html, cargado antes de que esto se invoque -- ver nota de arriba).
  function _mesesActuales(){ return (typeof mesesDesdeRegistro==='function') ? mesesDesdeRegistro() : 0; }
  function _darmaActual(){ return (typeof us!=='undefined' && us && us.d) || 0; }
  function _truequeDesbloqueado(){ return _mesesActuales()>=TRUEQUE_MESES_MIN && _darmaActual()>=TRUEQUE_DARMA_MIN; }

  function _htmlTruequeLocked(){
    const faltanMeses = Math.max(0, TRUEQUE_MESES_MIN - _mesesActuales());
    const faltanDarma = Math.max(0, TRUEQUE_DARMA_MIN - _darmaActual());
    const req = [];
    if(faltanMeses>0) req.push('<strong style="color:var(--g)">'+faltanMeses+' mes'+(faltanMeses!==1?'es':'')+'</strong>');
    if(faltanDarma>0) req.push('<strong style="color:var(--g)">'+faltanDarma+' Darma</strong>');
    return '<div style="text-align:center;padding:10px 4px">'
      + '<div style="font-size:1.8rem;color:var(--p)"><i class="fas fa-lock"></i></div>'
      + '<p style="color:#9fb3c8;font-size:0.8rem;margin:6px 0 0">Se desbloquea con <strong>'+TRUEQUE_MESES_MIN+' meses</strong> en la comunidad y <strong>'+TRUEQUE_DARMA_MIN+' de Darma</strong>.'
      + (req.length ? '<br>Te falta'+(req.length>1?'n':'')+' '+req.join(' y ')+'.' : '')
      + '</p></div>';
  }

  function _htmlTruequeForm(d){
    const oficio=(d&&d.oficio)||'', trueque=(d&&d.trueque)||'', volunt=(d&&d.voluntariado)||'';
    return '<input id="oficioInput" type="text" maxlength="60" placeholder="Tu oficio (ej: mecánico, guía, fotógrafo...)" value="'+escapeHTML(oficio)+'" style="width:100%;background:var(--gl);color:#fff;border:1px solid #2a3147;border-radius:8px;padding:8px;font-family:inherit;margin-bottom:6px">'
      + '<textarea id="truequeInput" maxlength="300" placeholder="Qué ofreces en trueque: reparaciones, alojo, comida..." style="width:100%;min-height:56px;background:var(--gl);color:#fff;border:1px solid #2a3147;border-radius:8px;padding:8px;font-family:inherit;margin-bottom:6px">'+escapeHTML(trueque)+'</textarea>'
      + '<textarea id="voluntariadoInput" maxlength="300" placeholder="En qué puedes ser voluntario: primeros auxilios, traducción, guía local..." style="width:100%;min-height:56px;background:var(--gl);color:#fff;border:1px solid #2a3147;border-radius:8px;padding:8px;font-family:inherit">'+escapeHTML(volunt)+'</textarea>'
      + '<button class="ab sec" style="margin-top:6px" onclick="guardarTruequeComunidad()"><i class="fas fa-check"></i> Guardar</button>';
  }

  function _htmlTruequeView(d){
    const oficio=(d&&d.oficio)||'', trueque=(d&&d.trueque)||'', volunt=(d&&d.voluntariado)||'';
    if(!oficio && !trueque && !volunt) return '<p style="color:#c7d4e6;font-size:0.85rem">Este ciclista todavía no compartió en qué puede ayudar a la comunidad.</p>';
    let html='';
    if(oficio) html+='<p style="margin:0 0 6px"><span style="color:#7d8ba0;font-size:0.68rem;text-transform:uppercase;letter-spacing:.4px">Oficio</span><br><span style="color:#dfe7ff;font-size:0.85rem;font-weight:700">'+escapeHTML(oficio)+'</span></p>';
    if(trueque) html+='<p style="margin:0 0 6px"><span style="color:#7d8ba0;font-size:0.68rem;text-transform:uppercase;letter-spacing:.4px">Trueque</span><br><span style="color:#c7d4e6;font-size:0.85rem">'+escapeHTML(trueque)+'</span></p>';
    if(volunt) html+='<p style="margin:0"><span style="color:#7d8ba0;font-size:0.68rem;text-transform:uppercase;letter-spacing:.4px">Voluntariado</span><br><span style="color:#c7d4e6;font-size:0.85rem">'+escapeHTML(volunt)+'</span></p>';
    return html;
  }

  window.renderPerfilComunidad = async function(userId, esPropio){
    const slot = document.getElementById('perfilComunidadSlot');
    if(!slot) return;
    slot.innerHTML = '<p style="color:#888;font-size:0.8rem">Cargando presentación...</p>';

    let d = {};
    try{
      const doc = await db.collection('users').doc(userId).get();
      d = (doc.exists && doc.data()) || {};
    }catch(e){}
    const bio = d.bio || '';

    let html = '<div class="section-info" style="margin-top:12px"><h4><i class="fas fa-id-card"></i> Presentación</h4>';
    if(esPropio){
      html += '<textarea id="bioInput" maxlength="300" placeholder="Cuéntale a la comunidad quién eres, qué buscas en la ruta..." style="width:100%;min-height:70px;background:var(--gl);color:#fff;border:1px solid #2a3147;border-radius:8px;padding:8px;font-family:inherit">'+escapeHTML(bio)+'</textarea>';
      html += '<button class="ab sec" style="margin-top:6px" onclick="guardarBioComunidad()"><i class="fas fa-check"></i> Guardar presentación</button>';
    } else {
      html += '<p style="color:#c7d4e6;font-size:0.85rem">'+(bio?escapeHTML(bio):'Este ciclista todavía no se ha presentado.')+'</p>';
    }
    html += '</div>';

    html += '<div class="section-info" style="margin-top:12px"><h4><i class="fas fa-handshake"></i> Oficio, trueque y voluntariado</h4>';
    html += esPropio ? (_truequeDesbloqueado() ? _htmlTruequeForm(d) : _htmlTruequeLocked()) : _htmlTruequeView(d);
    html += '</div>';

    html += '<div id="perfilPrivadoBox" style="margin-top:10px"></div>';
    slot.innerHTML = html;
    _cargarPerfilPrivado(userId, esPropio);
  };

  window.guardarTruequeComunidad = async function(){
    if(!cu || !_truequeDesbloqueado()) return;
    const oficio=(document.getElementById('oficioInput')||{}).value||'';
    const trueque=(document.getElementById('truequeInput')||{}).value||'';
    const volunt=(document.getElementById('voluntariadoInput')||{}).value||'';
    try{
      await db.collection('users').doc(cu).set({oficio:oficio.trim().slice(0,60), trueque:trueque.trim().slice(0,300), voluntariado:volunt.trim().slice(0,300)}, {merge:true});
      if(typeof h==='function') h('Guardado.');
    }catch(e){ if(typeof h==='function') h('No se pudo guardar, intenta de nuevo.'); }
  };

  async function _cargarPerfilPrivado(userId, esPropio){
    const box = document.getElementById('perfilPrivadoBox'); if(!box) return;
    box.innerHTML = '<p style="color:#888;font-size:0.78rem">Cargando galería...</p>';
    try{
      const doc = await db.collection('perfilPrivado').doc(userId).get();
      const d = doc.exists ? doc.data() : {};
      const fotos = d.fotos || [];
      const relatos = d.relatos || [];

      let html = '<div class="section-info"><h4><i class="fas fa-images"></i> Galería'+(esPropio?'':' (solo amigos)')+'</h4>';
      if(esPropio){
        html += '<input type="file" accept="image/*" id="fotoPerfilInput" style="display:none" onchange="subirFotoPerfil(event)">'
             + '<button class="ab sec" onclick="document.getElementById(\'fotoPerfilInput\').click()"'+(fotos.length>=MAX_FOTOS?' disabled':'')+'><i class="fas fa-camera"></i> Subir foto ('+fotos.length+'/'+MAX_FOTOS+')</button>';
      }
      if(fotos.length){
        html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px">'+fotos.map(function(f,i){
          return '<div style="position:relative"><img src="'+f+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px">'
               + (esPropio?'<button onclick="borrarFotoPerfil('+i+')" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;cursor:pointer">✕</button>':'')
               + '</div>';
        }).join('')+'</div>';
      } else {
        html += '<p style="color:#888;font-size:0.78rem;margin-top:6px">Sin fotos todavía.</p>';
      }
      html += '</div>';

      html += '<div class="section-info" style="margin-top:10px"><h4><i class="fas fa-book-open"></i> Relatos</h4>';
      if(esPropio){
        html += '<textarea id="relatoInput" maxlength="500" placeholder="Comparte una experiencia de ruta..." style="width:100%;min-height:60px;background:var(--gl);color:#fff;border:1px solid #2a3147;border-radius:8px;padding:8px;font-family:inherit"></textarea>'
             + '<button class="ab sec" style="margin-top:6px" onclick="publicarRelato()"><i class="fas fa-feather"></i> Publicar relato</button>';
      }
      if(relatos.length){
        html += relatos.slice().reverse().map(function(r){
          return '<div style="border-top:1px solid #2a3147;padding:8px 0;margin-top:8px"><p style="font-size:0.62rem;color:#7d8ba0;margin:0 0 3px">'+escapeHTML(r.fecha||'')+'</p><p style="font-size:0.85rem;color:#c7d4e6;margin:0;white-space:pre-wrap">'+escapeHTML(r.texto||'')+'</p></div>';
        }).join('');
      } else {
        html += '<p style="color:#888;font-size:0.78rem;margin-top:6px">Sin relatos todavía.</p>';
      }
      html += '</div>';

      if(!esPropio){
        html += '<button class="ab sec" style="margin-top:10px" onclick="compartirPerfilComunidad(\''+userId+'\')"><i class="fas fa-share-nodes"></i> Compartir este perfil</button>';
      }
      box.innerHTML = html;
    }catch(e){
      box.innerHTML = '<div class="section-info"><h4><i class="fas fa-lock"></i> Galería y relatos</h4><p style="color:#888;font-size:0.8rem">Este contenido es privado — solo lo ven sus amigos. Agrégalo de amigo para verlo.</p></div>';
    }
  }

  window.guardarBioComunidad = async function(){
    const el = document.getElementById('bioInput'); if(!el || !cu) return;
    try{
      await db.collection('users').doc(cu).set({bio: el.value.slice(0,300)}, {merge:true});
      if(typeof h==='function') h('Presentación guardada.');
    }catch(e){ if(typeof h==='function') h('No se pudo guardar, intenta de nuevo.'); }
  };

  window.subirFotoPerfil = function(ev){
    const file = ev.target.files[0]; if(!file || !cu) return;
    if(typeof comprimirFoto!=='function') return;
    comprimirFoto(file, async function(b64){
      try{
        const doc = await db.collection('perfilPrivado').doc(cu).get();
        const fotosActuales = (doc.exists && doc.data().fotos) || [];
        if(fotosActuales.length >= MAX_FOTOS){ if(typeof h==='function') h('Ya tienes el máximo de '+MAX_FOTOS+' fotos. Borra alguna para subir otra.'); return; }
        await db.collection('perfilPrivado').doc(cu).set({fotos: firebase.firestore.FieldValue.arrayUnion(b64)}, {merge:true});
        if(typeof h==='function') h('Foto agregada.');
        _cargarPerfilPrivado(cu, true);
      }catch(e){ if(typeof h==='function') h('No se pudo subir la foto.'); }
    });
    ev.target.value = '';
  };

  window.borrarFotoPerfil = async function(idx){
    if(!cu) return;
    try{
      const doc = await db.collection('perfilPrivado').doc(cu).get();
      const fotos = (doc.exists && doc.data().fotos) || [];
      fotos.splice(idx,1);
      await db.collection('perfilPrivado').doc(cu).set({fotos: fotos}, {merge:true});
      _cargarPerfilPrivado(cu, true);
    }catch(e){ if(typeof h==='function') h('No se pudo borrar la foto.'); }
  };

  window.publicarRelato = async function(){
    const el = document.getElementById('relatoInput'); if(!el || !cu) return;
    const v = el.value.trim(); if(!v) return;
    try{
      const fecha = new Date().toLocaleDateString('es-CL', {day:'numeric', month:'long', year:'numeric'});
      await db.collection('perfilPrivado').doc(cu).set({relatos: firebase.firestore.FieldValue.arrayUnion({texto: v.slice(0,500), fecha: fecha})}, {merge:true});
      if(typeof h==='function') h('Relato publicado.');
      el.value = '';
      _cargarPerfilPrivado(cu, true);
    }catch(e){ if(typeof h==='function') h('No se pudo publicar el relato.'); }
  };

  window.compartirPerfilComunidad = function(userId){
    const texto = 'Mira el perfil de este ciclista en Libre Pedal';
    const url = location.origin + '/?perfil=' + encodeURIComponent(userId);
    if(navigator.share){
      navigator.share({title:'Libre Pedal', text:texto, url:url}).catch(function(){});
    } else if(navigator.clipboard){
      navigator.clipboard.writeText(url).then(function(){ if(typeof h==='function') h('Copié el link del perfil.'); });
    }
  };
})();
