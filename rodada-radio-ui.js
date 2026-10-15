/* ===== RADIO DE RODADA — pantalla =====
   Maqueta aprobada por Inty el 2026-10-15 (disenos-ui/rodada-radio-gpx/maqueta.html):
   - Un panel abajo, encima del mapa: quién eres (Punta / Cola / escuchas), el orden del pelotón
     en pocas filas, la franja del mensaje que está sonando y UN botón grande para hablar.
   - Quien no es Punta ni Cola ve el botón apagado y dice por qué: no hay botones que no respondan.
   - Se minimiza a una píldora para no tapar la navegación.
   - Botón del audífono (decisión de Inty, desde la primera versión): un toque empieza a grabar,
     otro toque envía (o a los 20 s). Usa Media Session: Android le manda al navegador el botón
     play/pausa del audífono solo si la página tiene un audio "activo", por eso mientras está
     encendido suena un audio en silencio. No todos los audífonos ni todas las versiones de la
     app lo entregan: hay que probarlo en el teléfono. El botón en pantalla funciona siempre.
   La lógica (roles, audio, reglas) vive en rodada-radio.js. */

const RR_FILAS_MAX=6; // más de 7 nombres obliga a leer en plena ruta (Ley de Miller, ver METODO-TRABAJO-DISENO.md)

/* Pura (tests/rodada-radio.test.mjs): filas a mostrar del pelotón. Con pocos, todos; con muchos,
   los 2 de adelante, un resumen del medio y los 2 de atrás. El hueco grande se marca en su lugar
   si cae entre filas visibles; si no, va como aviso debajo de la primera fila. */
function radioFilasPeloton(ord, roles, yo){
  roles=roles||{};
  const fila=function(m){ return {tipo:'m', uid:m.uid, nombre:m.nombre||'Ciclista', auto:m.tipo==='auto', km:(m.avance||0)/1000, punta:m.uid===roles.punta, cola:m.uid===roles.cola, yo:m.uid===yo}; };
  let filas;
  if(ord.length<=RR_FILAS_MAX) filas=ord.map(fila);
  else {
    const medio=ord.slice(2, ord.length-2);
    filas=[fila(ord[0]), fila(ord[1]),
      {tipo:'grupo', cuantos:medio.length, kmDesde:medio[medio.length-1].avance/1000, kmHasta:medio[0].avance/1000},
      fila(ord[ord.length-2]), fila(ord[ord.length-1])];
    const yoEnMedio=medio.find(function(m){ return m.uid===yo; });
    if(yoEnMedio) filas.splice(3, 0, fila(yoEnMedio)); // tú siempre te ves
  }
  // La marca del corte va justo antes del primero que quedó atrás; si ese está dentro del resumen
  // del medio, justo después del último visible de adelante; si los dos están en el medio, tras el resumen.
  const huecos=(typeof radioHuecos==='function') ? radioHuecos(ord) : [];
  huecos.forEach(function(hh){
    const marca={tipo:'hueco', metros:Math.round(hh.metros/100)*100};
    const i=filas.findIndex(function(f){ return f.tipo==='m' && f.uid===hh.atras.uid; });
    if(i>0){ filas.splice(i, 0, marca); return; }
    const j=filas.findIndex(function(f){ return f.tipo==='m' && f.uid===hh.adelante.uid; });
    if(j>=0){ filas.splice(j+1, 0, marca); return; }
    const g=filas.findIndex(function(f){ return f.tipo==='grupo'; });
    filas.splice(g>=0?g+1:filas.length, 0, marca);
  });
  return filas;
}
function _rrKm(n){ return n.toFixed(1).replace('.', ','); }

let _rrTitulo='', _rrAvisoTimer=null;
function _rr(id){ return document.getElementById(id); }

function radioEntrarDesdeRodada(id, creador, titulo){
  if(!radioEntrar(id, creador)){ lpAviso('No pude entrar a la radio. Revisa que tengas sesión iniciada.'); return; }
  if(typeof escucharCanalRodada==='function') escucharCanalRodada(id); // los avisos de un toque del mismo grupo
  _rrTitulo=titulo||'Rodada';
  try{ localStorage.setItem('lp_radio_activa', JSON.stringify({id:id, creador:creador||null, titulo:_rrTitulo, hasta:Date.now()+12*3600000})); }catch(e){}
  if(typeof closeModal==='function') closeModal();
  radioPanelAbrir();
  radioAlCambiarRoles(radioMiRol());
  h('Entraste a la radio de la rodada. Hablan la Punta y la Cola; la app las elige sola según quién va adelante y quién atrás.', PRIO_VOZ.INFO);
}
// Si la app se cerró a mitad de rodada, al volver se reengancha sola (hasta 12 h después de entrar).
function radioReanudar(){
  if(radioRodadaId || !cu) return;
  let g=null; try{ g=JSON.parse(localStorage.getItem('lp_radio_activa')); }catch(e){}
  if(!g || !g.id || !(g.hasta>Date.now())) return;
  if(!radioEntrar(g.id, g.creador)) return;
  if(typeof escucharCanalRodada==='function') escucharCanalRodada(g.id);
  _rrTitulo=g.titulo||'Rodada';
  radioPanelMinimizar();
  radioAlCambiarRoles(radioMiRol());
}
function radioSalirDesdePanel(){
  radioAudifono(false);
  radioSalir();
  if(typeof salirCanalRodada==='function') salirCanalRodada();
  try{ localStorage.removeItem('lp_radio_activa'); }catch(e){}
  _rr('rrPanel').hidden=true; _rr('rrPildora').hidden=true;
  h('Saliste de la radio de la rodada.', PRIO_VOZ.INFO);
}
// Si se abre un modal (Rodadas, Perfil, ...) con el panel desplegado, el panel se minimiza para no taparlo.
(function(){
  function vigilar(){
    const m=document.getElementById('userModal'); if(!m || !window.MutationObserver) return;
    new MutationObserver(function(){ if(m.classList.contains('on') && !_rr('rrPanel').hidden) radioPanelMinimizar(); }).observe(m, {attributes:true, attributeFilter:['class']});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', vigilar); else vigilar();
})();
function radioPanelAbrir(){ _rr('rrPanel').hidden=false; _rr('rrPildora').hidden=true; _rr('rrTitulo').textContent='RADIO · '+_rrTitulo; }
function radioPanelMinimizar(){ _rr('rrPanel').hidden=true; _rr('rrPildora').hidden=false; _rrPildora(); }
function _rrPildora(){
  const rol=radioMiRol();
  _rr('rrPildoraTxt').textContent= rol==='punta'?'Radio · eres la Punta' : rol==='cola'?'Radio · eres la Cola' : 'Radio';
}
function _rrAviso(t){
  const a=_rr('rrAviso'); if(!a) return;
  a.textContent=t; a.hidden=false; clearTimeout(_rrAvisoTimer);
  _rrAvisoTimer=setTimeout(function(){ a.hidden=true; }, 3500);
}

/* ---- Callbacks que llama rodada-radio.js ---- */
let _rrRolPrevio=null;
function radioAlCambiarRoles(rol){
  const habla=(rol==='punta' || rol==='cola');
  const titulos={punta:'Eres la Punta', cola:'Eres la Cola', oyente:'Escuchas la radio'};
  const subs={punta:'Lo que digas lo escucha todo el grupo', cola:'Cierras el grupo; lo que digas lo escucha todo el grupo', oyente:'Hablan la Punta y la Cola'};
  const r=rol||'oyente';
  _rr('rrRolTitulo').textContent=titulos[r]||titulos.oyente;
  _rr('rrRolSub').textContent=subs[r]||subs.oyente;
  _rr('rrRol').classList.toggle('rr-oyente', !habla);
  _rr('rrRol').querySelector('use').setAttribute('href', habla?'#rr-radio':'#rr-oreja');
  const b=_rr('rrPtt'); b.classList.toggle('rr-apagado', !habla); b.disabled=!habla;
  if(!b.classList.contains('rr-grabando')) _rr('rrPttTxt').textContent=habla?'Mantén para hablar':'Solo hablan la Punta y la Cola';
  if(_rrRolPrevio!==null && _rrRolPrevio!==r){
    _rrAviso(habla ? (r==='punta'?'Ahora eres la Punta: tu radio se escucha.':'Ahora eres la Cola: tu radio se escucha.') : 'Ya no hablas por la radio. Sigues escuchando.');
  }
  _rrRolPrevio=r;
  _rrPildora();
  if(!habla) radioAudifono(false, true);
}
function radioAlGrabar(grabando){
  const b=_rr('rrPtt'); if(!b) return;
  b.classList.toggle('rr-grabando', !!grabando);
  _rr('rrPttTxt').innerHTML=grabando?'Grabando… suelta para enviar <span class="rr-ola"><i></i><i></i><i></i><i></i><i></i></span>':(radioPuedoHablar()?'Mantén para hablar':'Solo hablan la Punta y la Cola');
}
function radioAlEntrante(msg){
  const e=_rr('rrEntrante'); if(!e) return;
  if(!msg){ e.hidden=true; return; }
  _rr('rrEntranteTxt').textContent=(msg.rol==='punta'?'Punta':'Cola')+' · '+(msg.nombre||'');
  e.hidden=false;
}
function radioAlActualizar(ord){
  const p=_rr('rrPeloton'); if(!p) return;
  _rr('rrCuantos').textContent=ord.length+(ord.length===1?' en la sala':' en la sala');
  const filas=radioFilasPeloton(ord, {punta:_radioRoles.punta, cola:_radioRoles.cola}, cu);
  p.innerHTML=filas.map(function(f){
    if(f.tipo==='hueco') return '<div class="rr-hueco">▲ grupo cortado · '+f.metros+' m</div>';
    if(f.tipo==='grupo') return '<div class="rr-fila"><svg width="18" height="18"><use href="#rr-bici"/></svg><span>+'+f.cuantos+' ciclistas</span><span class="rr-km">'+_rrKm(f.kmDesde)+'–'+_rrKm(f.kmHasta)+'</span></div>';
    const color=f.punta?'var(--rr-naranjo)':(f.cola?'var(--rr-teal)':'currentColor');
    const tag=f.punta?'<span class="rr-tag rr-p">Punta</span>':(f.cola?'<span class="rr-tag rr-c">Cola</span>':'');
    return '<div class="rr-fila'+(f.yo?' rr-yo':'')+'"><svg width="18" height="18" style="color:'+color+'"><use href="#rr-'+(f.auto?'auto':'bici')+'"/></svg><span>'+escapeHTML(f.nombre)+(f.yo?' (tú)':'')+tag+'</span><span class="rr-km">'+_rrKm(f.km)+' km</span></div>';
  }).join('');
}

/* ---- Botón en pantalla: mantener apretado ---- */
(function(){
  function enlazar(){
    const b=_rr('rrPtt'); if(!b) return;
    // Abrir el micrófono tarda (permiso, getUserMedia): si se suelta antes de que arranque,
    // se corta apenas arranque, en vez de quedar grabando solo hasta el tope de 20 s.
    let apretado=false;
    const apretar=function(){ apretado=true; radioEmpezarAHablar().then(function(ok){ if(ok && !apretado) radioTerminarDeHablar(); }); };
    const soltar=function(){ apretado=false; if(b.classList.contains('rr-grabando')) radioTerminarDeHablar(); };
    b.addEventListener('pointerdown', function(ev){ if(b.disabled) return; ev.preventDefault(); try{ b.setPointerCapture(ev.pointerId); }catch(e){} apretar(); });
    ['pointerup','pointercancel'].forEach(function(t){ b.addEventListener(t, soltar); });
    b.addEventListener('keydown', function(ev){ if((ev.key===' '||ev.key==='Enter') && !ev.repeat && !b.disabled){ ev.preventDefault(); apretar(); } });
    b.addEventListener('keyup', function(ev){ if(ev.key===' '||ev.key==='Enter') soltar(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', enlazar); else enlazar();
})();

/* ---- Botón del audífono ---- */
let _rrSilencio=null, _rrSilencioURL=null, _rrAudOn=false;
function _rrWavSilencio(){
  // 1 s de silencio, WAV 8 kHz 8 bits mono: lo mínimo para que el navegador vea "audio sonando".
  const n=8000, buf=new ArrayBuffer(44+n), v=new DataView(buf);
  const w=function(o,s){ for(let i=0;i<s.length;i++) v.setUint8(o+i, s.charCodeAt(i)); };
  w(0,'RIFF'); v.setUint32(4,36+n,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,8000,true); v.setUint32(28,8000,true); v.setUint16(32,1,true); v.setUint16(34,8,true); w(36,'data'); v.setUint32(40,n,true);
  for(let i=0;i<n;i++) v.setUint8(44+i,128);
  return URL.createObjectURL(new Blob([buf], {type:'audio/wav'}));
}
function _rrBip(veces){
  try{
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
    const ctx=new C();
    for(let k=0;k<(veces||1);k++){
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.frequency.value=k?660:880; g.gain.value=0.15;
      o.connect(g); g.connect(ctx.destination);
      const t=ctx.currentTime+k*0.16; o.start(t); o.stop(t+0.09);
    }
    setTimeout(function(){ try{ ctx.close(); }catch(e){} }, 800);
  }catch(e){}
}
function _rrAudifonoToque(){
  if(!radioPuedoHablar()){ lpAviso('Solo la Punta y la Cola hablan por la radio.'); return; }
  if(_radioRecorder){ radioTerminarDeHablar(); _rrBip(2); }
  else { radioEmpezarAHablar().then(function(ok){ if(ok) _rrBip(1); }); }
  if(_rrSilencio) _rrSilencio.play().catch(function(){}); // el sistema lo pausa al apretar: se reanuda
}
function _rrTecla(ev){ if(ev.key==='MediaPlayPause' || ev.key==='MediaPlay' || ev.key==='MediaPause'){ ev.preventDefault(); _rrAudifonoToque(); } }
function radioAudifono(activar, silencioso){
  const chk=_rr('rrAudifono'); if(chk) chk.checked=!!activar;
  if(activar===_rrAudOn) return;
  _rrAudOn=!!activar;
  if(activar){
    if(!radioPuedoHablar()){ _rrAudOn=false; if(chk) chk.checked=false; if(!silencioso) lpAviso('El botón del audífono sirve cuando eres la Punta o la Cola.'); return; }
    if(!_rrSilencioURL) _rrSilencioURL=_rrWavSilencio();
    _rrSilencio=new Audio(_rrSilencioURL); _rrSilencio.loop=true;
    _rrSilencio.play().catch(function(){});
    try{
      if('mediaSession' in navigator){
        navigator.mediaSession.metadata=new MediaMetadata({title:'Radio de la rodada', artist:'Libre Pedal'});
        ['play','pause','nexttrack','previoustrack'].forEach(function(a){ try{ navigator.mediaSession.setActionHandler(a, _rrAudifonoToque); }catch(e){} });
      }
    }catch(e){}
    document.addEventListener('keydown', _rrTecla);
    if(!silencioso) h('Listo: un toque al botón del audífono empieza a grabar y otro lo envía. Si no responde, usa el botón de la pantalla.', PRIO_VOZ.INFO);
  } else {
    if(_rrSilencio){ try{ _rrSilencio.pause(); }catch(e){} _rrSilencio=null; }
    try{ if('mediaSession' in navigator) ['play','pause','nexttrack','previoustrack'].forEach(function(a){ try{ navigator.mediaSession.setActionHandler(a, null); }catch(e){} }); }catch(e){}
    document.removeEventListener('keydown', _rrTecla);
  }
}
