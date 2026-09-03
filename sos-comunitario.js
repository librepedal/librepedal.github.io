// ===== SOS COMUNITARIO (PASO 1: envio). Escribe una alerta ANONIMA y GRUESA (~5km):
// NO lleva identidad ni ubicacion exacta -> los desconocidos no pueden localizarte.
// La ubicacion exacta sigue yendo SOLO a tus contactos (WhatsApp) y al 133.
// ===== SOS COMUNITARIO (PASO 2: recibir). Solo ciclistas de CONFIANZA (km de bici) reciben,
// y solo una alerta de BAJA PRECISION (zona ~5-10km, sin identidad ni ubicacion exacta).
var _sosListener=null, _sosVistos={};
function _iniciarEscuchaSOS(){
  try{
    if(_sosListener) return;
    if(typeof db==='undefined' || !db) return;
    if(typeof _esCiclistaConfiable==='function' && !_esCiclistaConfiable()) return; // cuentas sin km reales NO reciben (anti-abuso)
    _sosListener = db.collection('sosAlertas').orderBy('ts','desc').limit(15).onSnapshot(function(snap){
      var now=Date.now();
      snap.docChanges().forEach(function(ch){
        if(ch.type!=='added') return;
        var d=ch.doc.data()||{}, id=ch.doc.id;
        if(_sosVistos[id] || (window._misSOS && window._misSOS[id])) return;
        _sosVistos[id]=1;
        var ts=(d.ts&&d.ts.seconds)?d.ts.seconds*1000:0;
        if(ts && (now-ts)>1200000) return; // ignora alertas de mas de 20 min
        var mla=(typeof us!=='undefined')?us.la:null, mlo=(typeof us!=='undefined')?us.lo:null;
        if(mla!=null && d.clat!=null && typeof gd2==='function'){ if(gd2(mla,mlo,d.clat,d.clon)>10) return; } // solo si esta a ~10km
        try{ _pisteroMood='preocupado'; }catch(e){}
        if(typeof h==='function') h('Atencion: un ciclista pidio ayuda cerca de tu zona. Mantente atento y, si puedes, llama a Carabineros al 133. Por seguridad no tenemos su ubicacion exacta.', (typeof PRIO_VOZ!=='undefined')?PRIO_VOZ.INFO:2);
        if(typeof lpAviso==='function') lpAviso('Un ciclista pidio ayuda cerca de tu zona. Considera llamar al 133.');
      });
    }, function(err){ /* si las reglas bloquean la lectura, degrada en silencio */ });
  }catch(e){}
}
async function _broadcastSOS(lat,lon){
  try{
    if(typeof db==='undefined' || !db || !cu){ if(typeof lpAviso==='function') lpAviso('No se pudo avisar a la comunidad (sin conexion). Usa el 133 y tus contactos.'); return; }
    var now=Date.now();
    if(now-(window._ultimoSOSbc||0) < 120000){ if(typeof h==='function') h('Ya avisaste a la comunidad hace poco. Si sigues en peligro, llama al 133.'); return; }
    if(lat==null||lon==null){ if(navigator.geolocation){ if(typeof h==='function') h('Ubicando tu zona para avisar a la comunidad...'); navigator.geolocation.getCurrentPosition(function(p){ _broadcastSOS(p.coords.latitude,p.coords.longitude); }, function(){ if(typeof lpAviso==='function') lpAviso('No pude obtener tu zona (permiso de ubicacion). No se avisó a la comunidad; usa el 133 y tus contactos.'); }, {enableHighAccuracy:true,timeout:8000,maximumAge:0}); } else { if(typeof lpAviso==='function') lpAviso('Tu telefono no entrega ubicacion.'); } return; }
    var clat=Math.round(lat/0.05)*0.05, clon=Math.round(lon/0.05)*0.05; // gruesa ~5km
    window._ultimoSOSbc=now;
    var _ref=await db.collection('sosAlertas').add({ clat:clat, clon:clon, ts:firebase.firestore.FieldValue.serverTimestamp() });
    try{ window._misSOS=window._misSOS||{}; if(_ref&&_ref.id) window._misSOS[_ref.id]=1; }catch(e){}
    if(typeof h==='function') h('Listo: avisamos a los ciclistas de tu zona, sin tu ubicacion exacta ni tu nombre. Si estas en peligro, llama tambien al 133.');
  }catch(e){ if(typeof lpAviso==='function') lpAviso('No se pudo avisar a la comunidad ahora. Usa la llamada al 133 y tus contactos.'); }
}
function enviarSOS(){
  const cs=contactosSOS();
  function seguir(lat,lon){
    window._sosLoc={lat:lat,lon:lon};
    var emerg='<div style="display:flex;gap:6px;margin-bottom:10px"><a href="tel:133" class="ab" style="flex:1;margin:0;text-align:center;text-decoration:none;background:#dc2626;color:#fff;border-color:#dc2626;font-size:0.78rem;line-height:1.15"><i class="fas fa-phone"></i> 133<br><small>Carabineros</small></a><a href="tel:131" class="ab" style="flex:1;margin:0;text-align:center;text-decoration:none;background:#dc2626;color:#fff;border-color:#dc2626;font-size:0.78rem;line-height:1.15"><i class="fas fa-truck-medical"></i> 131<br><small>SAMU</small></a><a href="tel:132" class="ab" style="flex:1;margin:0;text-align:center;text-decoration:none;background:#dc2626;color:#fff;border-color:#dc2626;font-size:0.78rem;line-height:1.15"><i class="fas fa-fire"></i> 132<br><small>Bomberos</small></a></div>';
    const url=(lat!=null)?('https://www.google.com/maps?q='+lat+','+lon):'';
    const msg=url?('🆘 SOS. Soy '+(nombreUsuario||'un ciclista')+' y necesito AYUDA URGENTE. Estoy aquí ahora: '+url):('🆘 SOS. Soy '+(nombreUsuario||'un ciclista')+' y necesito AYUDA URGENTE. (No logré adjuntar mi ubicación — llámame o revisa mi GPS.)');
    if(cs.length===0){
      if(navigator.share){ navigator.share({title:'SOS Libre Pedal', text:msg}).catch(function(){}); }
      else { try{ window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank'); }catch(e){ lpAviso(msg); } }
      document.getElementById('modalTitle').innerText='🆘 SOS';
      document.getElementById('modalContent').innerHTML=emerg+'<p style="color:#ffd0d0;font-size:0.82rem">Llama a emergencias arriba, o guarda contactos para avisarles rápido.</p><button class="ab" onclick="gestionarContactosSOS()">Agregar contactos de emergencia</button>';
      document.getElementById('userModal').classList.add('on');
      return;
    }
    document.getElementById('modalTitle').innerText='🆘 Enviar SOS';
    let html=emerg+'<p style="color:#ffd0d0;font-size:0.85rem;margin-top:0">O toca un contacto para enviarle tu SOS por WhatsApp (el mensaje y tu ubicación ya van escritos).</p>';
    html+=cs.map(function(x){ return '<a href="https://wa.me/'+x.fono+'?text='+encodeURIComponent(msg)+'" target="_blank" class="ab" style="display:block;text-align:center;text-decoration:none;background:#25D366;color:#03301a;border-color:#25D366;margin-bottom:6px"><i class="fas fa-arrow-up-from-bracket"></i> Enviar a '+escapeHTML(x.nombre)+'</a>'; }).join('');
    html+='<button class="ab" style="background:#7c3aed;border-color:#7c3aed;color:#fff;margin-bottom:6px" onclick="_broadcastSOS()"><i class="fas fa-bullhorn"></i> Avisar a ciclistas cerca (anonimo)</button>';
    html+='<button class="ab sec" onclick="gestionarContactosSOS()">Editar contactos</button>';
    document.getElementById('modalContent').innerHTML=html; document.getElementById('userModal').classList.add('on');
    h('Alerta lista. Toca a quién quieres avisar.');
  }
  // En un SOS la ubicacion ACTUAL es lo mas importante: pedimos SIEMPRE un fix fresco del GPS
  // y usamos el cache solo de respaldo (una posicion vieja puede mandar el auxilio al lugar equivocado).
  var _cacheLoc = currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
  if(!navigator.geolocation){ if(_cacheLoc) seguir(_cacheLoc.lat,_cacheLoc.lon); else { seguir(null,null); lpAviso('Tu telefono no entrega ubicacion. El SOS ira SIN ubicacion — activa el GPS y avisa a un contacto por telefono.'); } return; }
  hUrgente('Ubicando tu posicion para el SOS, un segundo...');
  var _sosDone=false;
  var _sosT=setTimeout(function(){ if(_sosDone) return; _sosDone=true; if(_cacheLoc) seguir(_cacheLoc.lat,_cacheLoc.lon); else { seguir(null,null); lpAviso('No alcance a fijar tu ubicacion. El SOS va sin ella — activa el permiso de ubicacion para tu seguridad.'); } }, 9000);
  navigator.geolocation.getCurrentPosition(function(p){ if(_sosDone) return; _sosDone=true; clearTimeout(_sosT); seguir(p.coords.latitude,p.coords.longitude); },
    function(){ if(_sosDone) return; _sosDone=true; clearTimeout(_sosT); if(_cacheLoc) seguir(_cacheLoc.lat,_cacheLoc.lon); else { seguir(null,null); lpAviso('No pude obtener tu ubicacion (permiso denegado). Activa la ubicacion para que el SOS la incluya.'); } },
    {enableHighAccuracy:true, timeout:8000, maximumAge:0});
}
