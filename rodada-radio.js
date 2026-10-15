/* ===== RADIO DE RODADA — la Punta y la Cola hablan, todo el grupo escucha =====
   Pedido de Inty 2026-10-14 (después del evento): en una rodada grupal siempre hay alguien
   adelante avisando cómo viene el camino y un auto de apoyo (o el último ciclista) cerrando
   atrás. Necesitan hablarse, y el resto del grupo tiene que ENTERARSE de lo que dicen.
   Diseño en rodada-grupal.md.

   - Solo dos teléfonos transmiten: la PUNTA (el que va más adelante) y la COLA (el auto de
     apoyo si hay uno en la sala; si no, el último ciclista). Todos los demás solo escuchan.
   - Los roles NO se eligen a mano: la app los asigna según quién va adelante y quién atrás,
     y van cambiando durante la rodada. Para que no parpadeen entre dos que van a la par, el
     cambio exige 50 m de diferencia sostenidos 30 s.
   - Viaja AUDIO REAL (decisión de Inty, 2026-10-14), no texto: un mensaje corto grabado
     (máx. 20 s, Opus a 16 kbps ≈ 40 KB) que se reproduce solo en los audífonos de todos.
     Es un walkie-talkie "de mensajes" y no una llamada en vivo: con señal mala el mensaje
     llega tarde, pero llega — una llamada se cortaría en la primera cuesta.
   - Va por Realtime Database y no por Firestore: misma razón que las posiciones en vivo
     (tests/rtd-posiciones.test.mjs) — su cuota es aparte y se paga por datos, no por lecturas.
   - La voz de Pistero manda: si suena un giro o un aviso de seguridad, la radio espera (o se
     pausa) y sigue después. Una indicación de giro perdida en una bajada es peor que un
     mensaje de radio atrasado.

   Avance sobre la ruta = km recorridos en este viaje (totalDistance). Todos parten juntos del
   punto de encuentro, así que lo recorrido ordena al pelotón aunque la rodada no tenga ruta
   cargada, y funciona igual en rutas de ida y vuelta (donde la distancia en línea recta al
   punto de partida mentiría). */

const RADIO_MAX_MS=20000;            // tope por mensaje: es para avisar, no para conversar
const RADIO_MIN_MS=500;              // menos que esto es un toque sin querer: no se manda
const RADIO_BITRATE=16000;           // voz clara en Opus y ~40 KB por 20 s
const RADIO_MAX_CHARS=120000;        // base64 de 20 s a 16 kbps cabe holgado (igual tope en database.rules.json)
const RADIO_VIGENCIA_MS=10*60000;    // un mensaje de hace más de 10 min ya no sirve: no se reproduce
const RADIO_ESPERA_MAX_MS=30000;     // lo más que un mensaje espera a que Pistero termine
const RADIO_POS_CADA_MS=5000;       // cada cuánto publica cada teléfono su avance
const ROL_MARGEN_M=50;               // diferencia mínima para quitarle el rol a alguien
const ROL_SOSTENIDO_MS=30000;        // ...y sostenida este tiempo
const ROL_SIN_SENAL_MS=60000;        // sin posición hace más de esto: no cuenta para Punta ni Cola
const HUECO_GRUPO_M=800;             // más que esto entre dos ciclistas seguidos = el grupo se cortó
const AVISO_HUECO_CADA_MS=180000;    // el aviso de grupo cortado no se repite antes de 3 min
const AVISO_REZAGO_CADA_MS=120000;   // ni el de "quedó detrás del auto" (por persona) antes de 2 min

/* ---------- Lógica pura (probada en tests/rodada-radio.test.mjs) ---------- */

// Miembros con posición fresca, de más adelante a más atrás.
function radioOrdenarPeloton(miembros, ahora){
  return Object.keys(miembros||{}).map(function(uid){ return Object.assign({uid:uid}, miembros[uid]); })
    .filter(function(m){ return typeof m.avance==='number' && typeof m.ts==='number' && (ahora-m.ts)<=ROL_SIN_SENAL_MS; })
    .sort(function(a,b){ return (b.avance-a.avance) || (a.uid<b.uid?-1:1); });
}
// Quién DEBERÍA tener cada rol ahora mismo, sin mirar quién lo tiene.
function radioProponerRoles(ordenados){
  const bicis=ordenados.filter(function(m){ return m.tipo!=='auto'; });
  const autos=ordenados.filter(function(m){ return m.tipo==='auto'; });
  const punta=bicis.length?bicis[0].uid:null;
  let cola=null;
  if(autos.length) cola=autos[autos.length-1].uid;          // el auto de apoyo cierra el grupo
  else if(bicis.length>1) cola=bicis[bicis.length-1].uid;   // sin auto: el último ciclista
  return {punta:punta, cola:cola};
}
/* Aplica la propuesta con histéresis. `pendiente` recuerda desde cuándo hay un candidato
   distinto para cada rol; se devuelve actualizado y hay que pasarlo en la próxima vuelta.
   El rol cambia de inmediato si quien lo tiene ya no está (sin señal o se fue), si entra un
   auto (siempre es Cola) o si el candidato coincide con el otro rol. */
function radioDecidirRoles(actual, ordenados, pendiente, ahora){
  actual=actual||{}; pendiente=Object.assign({}, pendiente||{});
  const prop=radioProponerRoles(ordenados);
  const porUid={}; ordenados.forEach(function(m){ porUid[m.uid]=m; });
  const res={punta:actual.punta||null, cola:actual.cola||null};
  ['punta','cola'].forEach(function(rol){
    const cand=prop[rol], tiene=res[rol];
    if(cand===tiene){ delete pendiente[rol]; return; }
    const mTiene=tiene?porUid[tiene]:null, mCand=cand?porUid[cand]:null;
    const inmediato = !mTiene || !mCand || (mCand.tipo==='auto') || (mTiene.tipo==='auto')
      || (rol==='punta' && res.cola===tiene) || (rol==='cola' && res.punta===tiene);
    if(inmediato){ res[rol]=cand; delete pendiente[rol]; return; }
    const ventaja = rol==='punta' ? (mCand.avance-mTiene.avance) : (mTiene.avance-mCand.avance);
    if(ventaja<ROL_MARGEN_M){ delete pendiente[rol]; return; }
    if(!pendiente[rol] || pendiente[rol].uid!==cand){ pendiente[rol]={uid:cand, desde:ahora}; return; }
    if(ahora-pendiente[rol].desde>=ROL_SOSTENIDO_MS){ res[rol]=cand; delete pendiente[rol]; }
  });
  if(res.punta && res.punta===res.cola) res.cola=prop.cola!==res.punta?prop.cola:null;
  return {roles:res, pendiente:pendiente};
}
/* Un solo teléfono decide los roles, para que todos vean lo mismo: el del creador de la
   rodada si tiene señal; si no, el miembro conectado de uid menor (todos llegan a la misma
   cuenta sin hablarse). */
function radioElegirArbitro(creador, ordenados){
  if(creador && ordenados.some(function(m){ return m.uid===creador; })) return creador;
  const uids=ordenados.map(function(m){ return m.uid; }).sort();
  return uids[0]||null;
}
// Huecos grandes entre ciclistas seguidos (el auto no cuenta: va donde puede).
function radioHuecos(ordenados){
  const bicis=ordenados.filter(function(m){ return m.tipo!=='auto'; });
  const out=[];
  for(let i=1;i<bicis.length;i++){
    const d=bicis[i-1].avance-bicis[i].avance;
    if(d>HUECO_GRUPO_M) out.push({adelante:bicis[i-1], atras:bicis[i], metros:d});
  }
  return out;
}
// Ciclistas que quedaron DETRÁS del auto de apoyo (el auto ya no los está cuidando).
function radioDetrasDeCola(ordenados, colaUid){
  const cola=ordenados.find(function(m){ return m.uid===colaUid; });
  if(!cola || cola.tipo!=='auto') return [];
  return ordenados.filter(function(m){ return m.tipo!=='auto' && m.avance < cola.avance-ROL_MARGEN_M; });
}
// Lo que suena para cada uno cuando cambian los roles.
function radioFrasesCambio(antes, despues, yo, nombres){
  antes=antes||{}; const out=[];
  const nom=function(uid){ return (nombres&&nombres[uid])||'otro ciclista'; };
  if(despues.punta!==antes.punta){
    if(despues.punta===yo) out.push('Ahora eres la Punta: lo que digas por radio lo escucha todo el grupo.');
    else if(antes.punta===yo) out.push('Ya no eres la Punta. Sigues escuchando la radio.');
    else if(despues.punta) out.push('Nueva punta: '+nom(despues.punta)+'.');
  }
  if(despues.cola!==antes.cola){
    if(despues.cola===yo) out.push('Ahora eres la Cola: cierras el grupo y tu radio se escucha.');
    else if(antes.cola===yo) out.push('Ya no eres la Cola. Sigues escuchando la radio.');
  }
  return out;
}

/* ---------- Estado y conexión ---------- */

let radioRodadaId=null, radioCreador=null, _radioDesde=0;
let _radioMiembros={}, _radioRoles={}, _radioPendiente={};
let _radioRefs=[], _radioTimer=null;
let _radioRecorder=null, _radioChunks=[], _radioInicioGrab=0, _radioTopeGrab=null, _radioStream=null;
let _radioCola=[], _radioSonando=null, _radioVigia=null;
let _radioUltHueco=0, _radioUltRezago={};

function _radioBase(){ return 'rodadaRadio/'+radioRodadaId; }
function _radioMiTipo(){ return (typeof actividadTipo!=='undefined' && actividadTipo==='moto') ? 'auto' : 'bici'; }
function _radioAvanceM(){ return Math.round(((typeof totalDistance!=='undefined' && totalDistance)||0)*1000); }
function radioMiRol(){
  if(!radioRodadaId || !cu) return null;
  if(_radioRoles.punta===cu) return 'punta';
  if(_radioRoles.cola===cu) return 'cola';
  return 'oyente';
}
function radioPuedoHablar(){ const r=radioMiRol(); return r==='punta' || r==='cola'; }

/* Entra a la radio de una rodada. Se llama al partir la rodada (con el GPS ya andando),
   no al confirmar asistencia: confirmar es días antes; la radio es para la ruta. */
function radioEntrar(rodadaId, creador){
  if(!rodadaId || !cu || typeof rtdb==='undefined') return false;
  if(radioRodadaId===rodadaId) return true;
  radioSalir();
  radioRodadaId=rodadaId; radioCreador=creador||null; _radioDesde=Date.now();
  _radioPublicarPosicion();
  const base=_radioBase();
  const rMiembros=rtdb.ref(base+'/miembros');
  rMiembros.on('value', function(s){ _radioMiembros=(s&&s.val())||{}; _radioRevisarGrupo(); }, function(){});
  const rRoles=rtdb.ref(base+'/roles');
  rRoles.on('value', function(s){ _radioAplicarRoles((s&&s.val())||{}); }, function(){});
  const rMsgs=rtdb.ref(base+'/msgs').orderByChild('ts').startAt(_radioDesde);
  rMsgs.on('child_added', function(s){ _radioLlegaMensaje(s&&s.val()); }, function(){});
  _radioRefs=[rMiembros, rRoles, rMsgs];
  _radioTimer=setInterval(_radioLatido, RADIO_POS_CADA_MS);
  return true;
}
function radioSalir(){
  _radioRefs.forEach(function(r){ try{ r.off(); }catch(e){} }); _radioRefs=[];
  clearInterval(_radioTimer); _radioTimer=null;
  radioCancelarGrabacion();
  if(radioRodadaId && cu){ try{ rtdb.ref(_radioBase()+'/miembros/'+cu).remove(); }catch(e){} }
  _radioCola=[]; if(_radioSonando){ try{ _radioSonando.pause(); }catch(e){} _radioSonando=null; }
  clearInterval(_radioVigia); _radioVigia=null;
  radioRodadaId=null; radioCreador=null; _radioMiembros={}; _radioRoles={}; _radioPendiente={};
  _radioUltHueco=0; _radioUltRezago={};
}
function _radioPublicarPosicion(){
  if(!radioRodadaId || !cu) return;
  try{
    rtdb.ref(_radioBase()+'/miembros/'+cu).set({
      nombre:(typeof nombreUsuario!=='undefined' && nombreUsuario)||'Ciclista',
      tipo:_radioMiTipo(), avance:_radioAvanceM(), ts:Date.now()
    }).catch(function(err){
      // Sin las reglas de Firebase publicadas la base rechaza todo: decirlo una vez, no culpar a la señal.
      if(_radioSinPermiso(err) && !_radioAvisoPermiso){ _radioAvisoPermiso=true; lpAviso('La radio no está habilitada todavía en el servidor. Avísale a Libre Pedal.'); }
    });
  }catch(e){}
}
let _radioAvisoPermiso=false;
function _radioSinPermiso(err){ const t=String((err && (err.code||err.message))||'').toLowerCase(); return t.indexOf('permission')>=0; }
function _radioLatido(){
  _radioPublicarPosicion();
  const ahora=Date.now();
  const ord=radioOrdenarPeloton(_radioMiembros, ahora);
  if(radioElegirArbitro(radioCreador, ord)!==cu) return;
  const r=radioDecidirRoles(_radioRoles, ord, _radioPendiente, ahora);
  _radioPendiente=r.pendiente;
  if(r.roles.punta!==_radioRoles.punta || r.roles.cola!==_radioRoles.cola){
    try{ rtdb.ref(_radioBase()+'/roles').set({punta:r.roles.punta||'', cola:r.roles.cola||'', arbitro:cu, ts:ahora}).catch(function(){}); }catch(e){}
  }
}
function _radioAplicarRoles(nuevos){
  const antes=_radioRoles;
  const despues={punta:nuevos.punta||null, cola:nuevos.cola||null};
  _radioRoles=despues;
  const nombres={}; Object.keys(_radioMiembros).forEach(function(u){ nombres[u]=_radioMiembros[u].nombre; });
  radioFrasesCambio(antes, despues, cu, nombres).forEach(function(f){ h(f, PRIO_VOZ.INFO); });
  if(antes.punta===cu || antes.cola===cu){ if(!radioPuedoHablar()) radioTerminarDeHablar(); }
  if(typeof radioAlCambiarRoles==='function') try{ radioAlCambiarRoles(radioMiRol()); }catch(e){}
}
// Avisos de grupo: solo los recibe a quien le sirven (la Punta espera, la Cola vuelve).
function _radioRevisarGrupo(){
  const ahora=Date.now(), rol=radioMiRol();
  const ord=radioOrdenarPeloton(_radioMiembros, ahora);
  if(typeof radioAlActualizar==='function') try{ radioAlActualizar(ord); }catch(e){}
  if(rol==='punta' && ahora-_radioUltHueco>AVISO_HUECO_CADA_MS){
    const huecos=radioHuecos(ord);
    if(huecos.length){
      _radioUltHueco=ahora;
      const hh=huecos[0];
      h('El grupo se cortó: hay '+(Math.round(hh.metros/100)*100)+' metros entre '+(hh.adelante.nombre||'un ciclista')+' y '+(hh.atras.nombre||'el siguiente')+'.', PRIO_VOZ.INFO);
    }
  }
  if(rol==='cola'){
    radioDetrasDeCola(ord, cu).forEach(function(m){
      if(ahora-(_radioUltRezago[m.uid]||0)<AVISO_REZAGO_CADA_MS) return;
      _radioUltRezago[m.uid]=ahora;
      h((m.nombre||'Un ciclista')+' quedó detrás de ti.', PRIO_VOZ.INFO);
    });
  }
}

/* ---------- Hablar (solo Punta y Cola) ---------- */

function _radioMime(){
  const ops=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4','audio/webm'];
  for(let i=0;i<ops.length;i++){ try{ if(window.MediaRecorder && MediaRecorder.isTypeSupported(ops[i])) return ops[i]; }catch(e){} }
  return '';
}
async function radioEmpezarAHablar(){
  if(!radioRodadaId){ lpAviso('No estás en una rodada.'); return false; }
  if(!radioPuedoHablar()){ lpAviso('Solo la Punta y la Cola hablan por la radio. Tú la escuchas.'); return false; }
  if(_radioRecorder) return true;
  if(!window.MediaRecorder || !navigator.mediaDevices){ lpAviso('Este teléfono no permite grabar audio desde la app.'); return false; }
  try{
    _radioStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}});
  }catch(e){ lpAviso('Necesito permiso de micrófono para la radio.'); return false; }
  const mime=_radioMime();
  try{ _radioRecorder=new MediaRecorder(_radioStream, mime?{mimeType:mime, audioBitsPerSecond:RADIO_BITRATE}:{audioBitsPerSecond:RADIO_BITRATE}); }
  catch(e){ _radioSoltarMic(); lpAviso('No pude abrir el micrófono.'); return false; }
  _radioChunks=[]; _radioInicioGrab=Date.now();
  _radioRecorder.ondataavailable=function(ev){ if(ev.data && ev.data.size) _radioChunks.push(ev.data); };
  _radioRecorder.onstop=_radioEnviarGrabacion;
  _radioRecorder.start();
  _radioTopeGrab=setTimeout(radioTerminarDeHablar, RADIO_MAX_MS);
  if(typeof radioAlGrabar==='function') try{ radioAlGrabar(true); }catch(e){}
  return true;
}
function radioTerminarDeHablar(){
  clearTimeout(_radioTopeGrab); _radioTopeGrab=null;
  if(_radioRecorder && _radioRecorder.state!=='inactive'){ try{ _radioRecorder.stop(); }catch(e){} }
}
function radioCancelarGrabacion(){
  clearTimeout(_radioTopeGrab); _radioTopeGrab=null;
  if(_radioRecorder){ _radioRecorder.onstop=null; try{ if(_radioRecorder.state!=='inactive') _radioRecorder.stop(); }catch(e){} }
  _radioRecorder=null; _radioChunks=[]; _radioSoltarMic();
  if(typeof radioAlGrabar==='function') try{ radioAlGrabar(false); }catch(e){}
}
function _radioSoltarMic(){ if(_radioStream){ try{ _radioStream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} } _radioStream=null; }
function _radioEnviarGrabacion(){
  const dur=Date.now()-_radioInicioGrab;
  const tipo=(_radioRecorder && _radioRecorder.mimeType)||'audio/webm';
  const blob=new Blob(_radioChunks, {type:tipo});
  _radioRecorder=null; _radioChunks=[]; _radioSoltarMic();
  if(typeof radioAlGrabar==='function') try{ radioAlGrabar(false); }catch(e){}
  if(dur<RADIO_MIN_MS || !blob.size) return;
  const fr=new FileReader();
  fr.onload=function(){
    const audio=String(fr.result||'');
    if(audio.length>RADIO_MAX_CHARS){ lpAviso('El mensaje quedó muy largo. Intenta uno más corto.'); return; }
    const rol=radioMiRol(); if(rol!=='punta' && rol!=='cola') return;
    try{
      rtdb.ref(_radioBase()+'/msgs').push({
        de:cu, nombre:(typeof nombreUsuario!=='undefined' && nombreUsuario)||'Ciclista',
        rol:rol, audio:audio, dur:Math.min(dur, RADIO_MAX_MS), ts:Date.now()
      }).catch(function(err){ lpAviso(_radioSinPermiso(err) ? 'La radio no está habilitada todavía: el mensaje no salió.' : 'Sin señal: el mensaje no salió.'); });
    }catch(e){ lpAviso('No se pudo enviar el mensaje.'); }
    _radioLimpiarMisViejos();
  };
  fr.readAsDataURL(blob);
}
// Cada uno borra sus propios mensajes vencidos: así la sala no crece sin fin.
function _radioLimpiarMisViejos(){
  try{
    rtdb.ref(_radioBase()+'/msgs').orderByChild('de').equalTo(cu).once('value', function(s){
      const v=(s&&s.val())||{}, lim=Date.now()-RADIO_VIGENCIA_MS;
      Object.keys(v).forEach(function(k){ if(v[k] && v[k].ts<lim) rtdb.ref(_radioBase()+'/msgs/'+k).remove().catch(function(){}); });
    });
  }catch(e){}
}

/* ---------- Escuchar (todos) ---------- */

// Decide qué hacer con un mensaje que llega. Pura, para poder probarla.
function radioDebeReproducir(msg, yo, desde, ahora){
  if(!msg || !msg.audio || typeof msg.ts!=='number') return false;
  if(msg.de===yo) return false;                           // no me escucho a mí mismo
  if(msg.ts<desde) return false;                          // de antes de entrar: no se relee
  if(ahora-msg.ts>RADIO_VIGENCIA_MS) return false;        // vencido: ya no sirve
  return msg.rol==='punta' || msg.rol==='cola';
}
function _radioLlegaMensaje(msg){
  if(!radioDebeReproducir(msg, cu, _radioDesde, Date.now())) return;
  _radioCola.push(msg);
  _radioSiguiente();
}
function _radioPisteroOcupado(){ return (typeof vozHablando!=='undefined' && vozHablando) || (typeof micOn!=='undefined' && micOn); }
function _radioSiguiente(){
  if(_radioSonando || !_radioCola.length) return;
  // Pistero primero. Con tope: si vozHablando quedara pegado por un error de otro lado, la
  // radio no puede quedar muda para siempre.
  const prox=_radioCola[0]; if(!prox._espera) prox._espera=Date.now();
  if(_radioPisteroOcupado() && Date.now()-prox._espera<RADIO_ESPERA_MAX_MS){ setTimeout(_radioSiguiente, 400); return; }
  const msg=_radioCola.shift();
  if(Date.now()-msg.ts>RADIO_VIGENCIA_MS){ _radioSiguiente(); return; }
  const a=new Audio(msg.audio);
  _radioSonando=a;
  const fin=function(){ clearInterval(_radioVigia); _radioVigia=null; _radioSonando=null; if(typeof radioAlEntrante==='function') try{ radioAlEntrante(null); }catch(e){} setTimeout(_radioSiguiente, 300); };
  if(typeof radioAlEntrante==='function') try{ radioAlEntrante(msg); }catch(e){}
  a.onended=fin; a.onerror=fin;
  // Si Pistero arranca a hablar a mitad del mensaje (un giro), la radio se pausa y retoma después.
  _radioVigia=setInterval(function(){
    if(!_radioSonando) return;
    if(_radioPisteroOcupado()){ if(!a.paused) try{ a.pause(); }catch(e){} }
    else if(a.paused && !a.ended){ a.play().catch(function(){}); }
  }, 250);
  a.play().catch(fin);
}
function radioCallar(){ _radioCola=[]; if(_radioSonando){ try{ _radioSonando.pause(); }catch(e){} } clearInterval(_radioVigia); _radioVigia=null; _radioSonando=null; if(typeof radioAlEntrante==='function') try{ radioAlEntrante(null); }catch(e){} }
