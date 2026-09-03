function contactosSOS(){ try{ return JSON.parse(localStorage.getItem('lp_sos_'+cu))||[]; }catch(e){ return []; } }
function guardarContactosSOS(arr){ try{ localStorage.setItem('lp_sos_'+cu, JSON.stringify(arr)); }catch(e){} }
function _telMarcar(num){ try{ const n=String(num).replace(/[^0-9+]/g,''); if(!n) return false; const tel=n.charAt(0)==='+'?n:('+'+n); window.location.href='tel:'+tel; return true; }catch(e){ return false; } }
// Llama a un contacto por su nombre (o a un numero suelto / a emergencias).
function pisteroLlamar(objetivo){
  const orig=(objetivo||'').trim(); const q=normalizar(orig).replace(/^(a la|al|a|la|el)\s+/,'').trim();
  if(!q){ h('¿A quien llamo? Dime el nombre de un contacto guardado.'); return; }
  // Numero suelto: 'llama al 133', 'marca 912345678'
  if(/^[0-9+][0-9+\s]{2,}$/.test(orig)){ h('Marcando '+orig+'. Confirma la llamada en el telefono.'); _telMarcar(orig); return; }
  // Emergencias en Chile
  const EMERG=[{re:/(emergencia|ambulancia|samu|urgencia)/,num:'131',nom:'emergencias (SAMU)'},{re:/(bombero|incendio)/,num:'132',nom:'bomberos'},{re:/(carabinero|policia|paco)/,num:'133',nom:'carabineros'}];
  for(let i=0;i<EMERG.length;i++){ if(EMERG[i].re.test(q)){ h('Llamando a '+EMERG[i].nom+'. Confirma la llamada en el telefono.'); _telMarcar(EMERG[i].num); return; } }
  const cs=contactosSOS();
  if(!cs.length){ h('Todavia no tienes contactos guardados. Agregalos en Contactos de emergencia y podre llamarlos por voz.'); try{ gestionarContactosSOS(); }catch(e){} return; }
  let c=cs.find(function(x){ return normalizar(x.nombre)===q; })
      || cs.find(function(x){ return normalizar(x.nombre).split(/\s+/).some(function(p){ return p===q; }); })
      || cs.find(function(x){ return normalizar(x.nombre).indexOf(q)>=0 || q.indexOf(normalizar(x.nombre))>=0; });
  if(!c){ h('No tengo a "'+orig+'" en tus contactos. Revisa el nombre o agregalo en Contactos de emergencia.'); try{ gestionarContactosSOS(); }catch(e){} return; }
  h('Llamando a '+c.nombre+'. Confirma la llamada en el telefono.'); _telMarcar(c.fono);
}
function llamarContactoSOS(i){ const c=contactosSOS()[i]; if(c){ h('Llamando a '+c.nombre+'. Confirma la llamada en el telefono.'); _telMarcar(c.fono); } }
function gestionarContactosSOS(){
  document.getElementById('modalTitle').innerText='🆘 Contactos de emergencia';
  const cs=contactosSOS();
  let html='<p style="color:#9fb3c8;font-size:0.82rem;margin-top:0">A estos contactos les llega tu SOS con tu ubicación. Pon el número con código de país (ej: 56912345678).</p>';
  html+=cs.map(function(x,i){ return '<div style="display:flex;gap:8px;align-items:center;background:var(--gl);padding:8px 10px;border-radius:10px;margin-bottom:6px"><div style="flex:1"><strong>'+escapeHTML(x.nombre)+'</strong><div style="font-size:0.75rem;color:#8aa">'+escapeHTML(x.fono)+'</div></div><button class="route-btn" style="background:#16a34a;color:#fff" onclick="llamarContactoSOS('+i+')"><i class="fas fa-phone"></i> Llamar</button><button class="route-btn delete" onclick="borrarContactoSOS('+i+')">Quitar</button></div>'; }).join('');
  html+='<div style="background:rgba(0,0,0,0.3);padding:10px;border-radius:10px;margin-top:8px"><input id="sosNombre" placeholder="Nombre del contacto"><input id="sosFono" placeholder="Teléfono con código país (569...)"><button class="ab" onclick="agregarContactoSOS()"><i class="fas fa-plus"></i> Agregar contacto</button></div>';
  document.getElementById('modalContent').innerHTML=html; document.getElementById('userModal').classList.add('on');
}
function agregarContactoSOS(){ const n=(document.getElementById('sosNombre').value||'').trim(); const f=(document.getElementById('sosFono').value||'').replace(/[^0-9]/g,''); if(!n||f.length<8) return lpAviso('Pon un nombre y un teléfono válido con código de país (ej: 56912345678)'); const cs=contactosSOS(); if(cs.some(function(x){ return x.fono===f; })){ lpAviso('Ese teléfono ya está en tus contactos de emergencia.'); return; } cs.push({nombre:n,fono:f}); guardarContactosSOS(cs); const en=document.getElementById('sosNombre'); if(en) en.value=''; const ef=document.getElementById('sosFono'); if(ef) ef.value=''; h('Contacto de emergencia guardado.'); gestionarContactosSOS(); }
function borrarContactoSOS(i){ const cs=contactosSOS(); cs.splice(i,1); guardarContactosSOS(cs); gestionarContactosSOS(); }
/* ===== DETECCIÓN DE CAÍDAS =====
   Usa el acelerómetro del celular (DeviceMotion, gratis, sin hardware extra). Una
   caída real tiene una firma de dos partes: un impacto fuerte (aceleración total
   sobre un umbral) seguido de quietud (a diferencia de pasar por un bache, donde
   seguís pedaleando normal después). Solo corre durante un viaje activo, para no
   gastar batería ni dar falsas alarmas con el celular guardado sin andar en bici.
   Nota honesta: WhatsApp no permite mandar un mensaje sin que la persona lo toque
   dentro de la app (por seguridad/antispam de Meta) — así que "automático" acá
   significa que preparamos todo y lo dejamos a un toque, no un envío 100% silencioso. */
let crashDetectorActivo=false, crashUltimoImpacto=0, crashAlertaActiva=false, crashCountdownId=null;
const CRASH_UMBRAL_G=3.5;
/* Muestras de MOVIMIENTO tomadas del acelerómetro justo después del impacto.
   Antes la quietud se preguntaba al número de velocidad que se ve en pantalla, y eso
   tenía dos fallas graves (barrido #8): la velocidad viene de una ventana de 10-15s de
   posiciones GPS, así que a los 3s de chocar a 30 km/h TODAVÍA marca 30 -> el sistema
   creía que seguías andando y NO avisaba una caída real; y si el GPS no tenía señal el
   texto era "--", que parseFloat convertía en 0 -> creía que estabas quieto y avisaba
   sin motivo. El acelerómetro no tiene retardo y mide directo lo que importa: si el
   cuerpo se está moviendo o no. */
let crashMuestrasMov=[];
const CRASH_MOV_QUIETO=0.22;   // variación en g por debajo de la cual el teléfono NO se está moviendo
const CRASH_VENTANA_MS=3600;   // cuánto rato después del golpe se juntan muestras
const CRASH_VENTANA_QUIETUD=1200; // solo cuentan los últimos 1,2 s: la pregunta es «¿está quieto AHORA?»
/* Velocidad mínima ANTES del golpe para tratarlo como caída de ciclista.
   Caso real (2026-07-20): a una amiga de Inty se le cayó el teléfono al suelo con la
   app abierta y saltó la alerta. Un teléfono que se cae y un ciclista que se cae se ven
   IGUAL después del impacto: golpe fuerte y después quietud. Lo que los distingue es el
   ANTES — el ciclista venía andando, el teléfono no.
   Y acá el retardo del GPS juega A FAVOR: la velocidad que se ve en el instante del
   golpe refleja los últimos 10-15s, o sea justo antes del impacto. El mismo lag que
   arruinaba la medición de quietud es exactamente lo que sirve para mirar al pasado.
   Si el GPS no sabe la velocidad, NO se filtra: mejor una alarma de más que perderse
   una caída real por falta de señal.
   Por qué importa el equilibrio: las falsas alarmas seguidas terminan en que alguien
   apague la función, y una función apagada no salva a nadie. */
const CRASH_VEL_MINIMA=5;      // km/h
// Se puede apagar desde Ajustes (ej: si vas a hacer MTB agresivo, donde los baches
// fuertes son parte normal del andar y darían demasiadas falsas alarmas).
let crashDeteccionOn=(function(){ try{ return localStorage.getItem('lp_crash_on')!=='0'; }catch(e){ return true; } })();
function _actualizarBtnCrash(){ const b=document.getElementById('btnCrashToggle'); if(b) b.innerText=crashDeteccionOn?'🚨 Detección de caídas: ON':'🚨 Detección de caídas: OFF'; }
function toggleDeteccionCaidas(){
  crashDeteccionOn=!crashDeteccionOn;
  try{ localStorage.setItem('lp_crash_on', crashDeteccionOn?'1':'0'); }catch(e){}
  _actualizarBtnCrash();
  if(!crashDeteccionOn) detenerDeteccionCaidas();
  else if(ig || document.getElementById('nav-screen').classList.contains('active')) iniciarDeteccionCaidas();
  h(crashDeteccionOn?'Detección de caídas activada.':'Detección de caídas desactivada.');
}
function _crashMotionHandler(e){
  if(crashAlertaActiva) return;
  // OJO: 'acceleration' viene SIN gravedad (quieto ≈ 0 g) y 'accelerationIncludingGravity'
  // viene CON ella (quieto ≈ 1 g). Medir movimiento contra la base equivocada daría
  // justo lo contrario de lo real, así que se ajusta según cuál entregó el teléfono.
  const sinGravedad=!!e.acceleration;
  const a=e.acceleration||e.accelerationIncludingGravity;
  if(!a) return;
  const mag=Math.sqrt(Math.pow(a.x||0,2)+Math.pow(a.y||0,2)+Math.pow(a.z||0,2))/9.8;
  const ahora=Date.now();
  if(mag>CRASH_UMBRAL_G && ahora-crashUltimoImpacto>4000){
    // ¿Venías andando? Si no, esto es un teléfono que se cayó, no un ciclista.
    if(!_impactoEsDeCiclista(_velocidadEnPantalla())) return;
    crashUltimoImpacto=ahora;
    crashMuestrasMov=[];
    setTimeout(function(){ _verificarQuietudTrasImpacto(1); }, 1500);
    return; // el golpe mismo no cuenta como movimiento posterior
  }
  /* Junta el movimiento posterior al golpe, PERO solo el RECIENTE.
     Auditoría del 2026-07-20: antes se guardaba todo desde los 250 ms y la decisión miraba
     el MÁXIMO de todo el búfer. Una caída real no es golpe-y-quietud: es golpe, medio
     segundo o más de revolcón (la bici encima, el cuerpo rodando, el teléfono girando en
     el bolsillo) y RECIÉN AHÍ quietud. Ese revolcón dejaba muestras muy sobre el umbral,
     el máximo quedaba contaminado para siempre y el sistema concluía "sigue moviéndose"
     — o sea, el caso central del producto no disparaba la alerta NUNCA.
     Ahora la ventana se desliza: solo cuentan los últimos ~1,2 s, así que lo que se
     pregunta es «¿está quieto AHORA?» y no «¿estuvo quieto todo el rato?». */
  const desde=ahora-crashUltimoImpacto;
  if(crashUltimoImpacto && desde>250 && desde<=CRASH_VENTANA_MS){
    crashMuestrasMov.push({t:ahora, m:Math.abs(mag-(sinGravedad?0:1))});
    while(crashMuestrasMov.length && ahora-crashMuestrasMov[0].t>CRASH_VENTANA_QUIETUD) crashMuestrasMov.shift();
    if(crashMuestrasMov.length>500) crashMuestrasMov.shift();
  }
}
/* ¿El golpe le pasó a alguien que venía andando? Función pura, testeable sin teléfono.
   Con la velocidad desconocida devuelve true a propósito: sin señal GPS preferimos una
   alarma de más (cuesta un toque) antes que perdernos una caída real. */
function _impactoEsDeCiclista(velPrevia){
  if(typeof velPrevia!=='number' || !isFinite(velPrevia)) return true;
  return velPrevia>=CRASH_VEL_MINIMA;
}
/* Decide si tras el golpe la persona quedó QUIETA. Función pura y aparte para poder
   testearla sin teléfono (ver tests/caidas.test.mjs).
   Devuelve: 'caida' | 'siguemoviendose' | 'sindatos'
   El acelerómetro manda; el GPS solo se usa si no llegaron muestras, y sabiendo que
   llega atrasado. Ante la falta total de datos se avisa igual: hay 30 segundos y un
   botón para cancelar, así que equivocarse avisando cuesta un toque, y equivocarse
   callando puede costar mucho más. */
function _decidirQuietudCaida(muestrasMov, velocidadGps){
  if(muestrasMov && muestrasMov.length>=5){
    let maxMov=0;
    for(let i=0;i<muestrasMov.length;i++) if(muestrasMov[i]>maxMov) maxMov=muestrasMov[i];
    return maxMov<=CRASH_MOV_QUIETO ? 'caida' : 'siguemoviendose';
  }
  if(typeof velocidadGps!=='number' || !isFinite(velocidadGps)) return 'sindatos';
  return velocidadGps<3 ? 'caida' : 'siguemoviendose';
}
/* Velocidad actual, o `null` cuando de verdad NO se sabe.
   Auditoría del 2026-07-20: el comentario anterior decía que el marcador muestra "--" sin
   señal. **Es falso**: los únicos que escriben ahí ponen `Math.round(...)`, o sea siempre
   un número — y el valor inicial del HTML es `0`. Resultado: esta función jamás devolvía
   `null`, la red de seguridad («si no se sabe la velocidad, no filtres») era código muerto,
   y peor: mientras el GPS todavía no engancha, el marcador dice 0 → el filtro concluía
   «no venías andando» → **se descartaba toda caída**.
   Ahora la señal de "no se sabe" viene de donde corresponde: si no hay un fix de GPS
   reciente, no hay velocidad confiable, y ante la duda NO se filtra. */
const CRASH_FIX_FRESCO_MS=12000;
function _velocidadEnPantalla(){
  const hayFix = (typeof lastFixTime!=='undefined' && lastFixTime && (Date.now()-lastFixTime)<CRASH_FIX_FRESCO_MS);
  if(!hayFix) return null; // sin fix reciente: velocidad desconocida, no un cero real
  const navActivo=document.getElementById('nav-screen').classList.contains('active');
  const el=document.getElementById(navActivo?'navSpeed':'spd');
  if(!el) return null;
  const v=parseFloat(String(el.innerText).replace(',','.'));
  return isFinite(v) ? v : null;
}
/* Dos chequeos de quietud (1,5 s y 3 s después del golpe).
   Auditoría del 2026-07-20: antes, si el PRIMER chequeo veía movimiento, se hacía `return`
   y **no se agendaba el segundo** — así que el revolcón normal de una caída cancelaba la
   vigilancia para siempre. Ahora el primero nunca descarta: solo el segundo decide. Un
   bache sigue filtrado, porque a los 3 s quien pasó un bache va pedaleando y se ve. */
function _verificarQuietudTrasImpacto(intento){
  if(crashAlertaActiva) return;
  const muestras=crashMuestrasMov.map(function(x){ return x && typeof x==='object' ? x.m : x; });
  const veredicto=_decidirQuietudCaida(muestras, _velocidadEnPantalla());
  if(intento===1){ setTimeout(function(){ _verificarQuietudTrasImpacto(2); }, 1500); return; } // el primero nunca descarta
  if(veredicto==='siguemoviendose') return; // a los 3 s sigue en movimiento: no fue caída
  mostrarAlertaCaida();
}
function iniciarDeteccionCaidas(){
  if(!crashDeteccionOn || crashDetectorActivo || typeof DeviceMotionEvent==='undefined') return;
  crashDetectorActivo=true;
  // iOS exige pedir permiso con un gesto del usuario; Android no lo necesita y el
  // request simplemente no existe ahí (por eso el chequeo de función antes de llamar).
  if(typeof DeviceMotionEvent.requestPermission==='function'){
    DeviceMotionEvent.requestPermission().then(function(r){ if(r==='granted') window.addEventListener('devicemotion', _crashMotionHandler); }).catch(function(){});
  } else {
    window.addEventListener('devicemotion', _crashMotionHandler);
  }
}
function detenerDeteccionCaidas(){
  crashDetectorActivo=false;
  window.removeEventListener('devicemotion', _crashMotionHandler);
}
function mostrarAlertaCaida(){
  crashAlertaActiva=true;
  let restante=30;
  const overlay=document.createElement('div');
  overlay.id='crashAlertOverlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(180,0,0,0.97);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;color:#fff';
  overlay.innerHTML='<div style="font-size:3rem"><i class="fas fa-tower-broadcast"></i> </div><h2 style="margin:10px 0">¿Estás bien?</h2><p style="font-size:0.95rem;max-width:320px">Detectamos un golpe fuerte. Si no respondes, dejamos listo el SOS para tus contactos en <strong id="crashCountdown">30</strong>s.</p><button id="crashCancelBtn" style="margin-top:20px;background:#fff;color:#b91c1c;border:none;border-radius:30px;padding:16px 32px;font-size:1.1rem;font-weight:800;cursor:pointer"><i class="fas fa-circle-check"></i> Estoy bien</button>';
  document.body.appendChild(overlay);
  document.getElementById('crashCancelBtn').onclick=cancelarAlertaCaida;
  try{ if(navigator.vibrate) navigator.vibrate([300,100,300,100,300]); }catch(e){}
  _sonidoAlarmaCaida();
  if(typeof hUrgente==='function') hUrgente('Detecté un golpe fuerte. Toca "Estoy bien" si estás bien, o preparo el SOS.'); // seguridad: no la pisa ninguna otra voz
  crashCountdownId=setInterval(function(){
    restante--;
    const el=document.getElementById('crashCountdown'); if(el) el.innerText=restante;
    if(restante<=0){ clearInterval(crashCountdownId); crashCountdownId=null; _dispararSOSPorCaida(); }
  },1000);
}
function cancelarAlertaCaida(){
  crashAlertaActiva=false;
  if(crashCountdownId){ clearInterval(crashCountdownId); crashCountdownId=null; }
  _detenerAlarmaCaida();
  const overlay=document.getElementById('crashAlertOverlay'); if(overlay) overlay.remove();
  if(typeof h==='function') h('Qué bueno que estás bien. Sigo grabando tu ruta.');
}
// Alarma sonora fuerte además de la vibración: si te caíste y quedaste inconsciente
// o aturdido, un sonido intermitente ayuda a que alguien cerca note que pasa algo,
// no solo que tú mismo veas la pantalla. Se repite hasta que se cancela la alerta.
let crashAlarmaId=null;
function _sonidoAlarmaCaida(){
  try{
    const ac=_ac();
    function beep(){
      if(!crashAlertaActiva) return;
      const osc=ac.createOscillator(), gain=ac.createGain();
      osc.type='square'; osc.frequency.value=880;
      gain.gain.setValueAtTime(0.0001, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ac.currentTime+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+0.35);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime+0.4);
    }
    beep();
    crashAlarmaId=setInterval(beep, 900);
  }catch(e){}
}
function _detenerAlarmaCaida(){ if(crashAlarmaId){ clearInterval(crashAlarmaId); crashAlarmaId=null; } }
function _dispararSOSPorCaida(){
  const overlay=document.getElementById('crashAlertOverlay');
  const cs=contactosSOS();
  const loc=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
  const url=loc?('https://www.google.com/maps?q='+loc.lat+','+loc.lon):'';
  const msg='🚨 Posible caída en bicicleta. Soy '+(nombreUsuario||'un ciclista')+' y podría necesitar ayuda.'+(url?(' Mi ubicación: '+url):'');
  // ÚNICO aviso que sale SOLO, sin que nadie toque nada: si quedaste inconsciente, esto
  // es lo único real que llega a avisar a alguien. Los de WhatsApp de abajo necesitan un
  // toque humano (restricción real de Meta, no se puede saltar) -- este no, escribe
  // directo a Firestore. No reemplaza una llamada real a emergencias, pero es la
  // diferencia entre "nadie se entera" y "los ciclistas de la zona saben que hay
  // alguien con problemas ahí". Mismo límite de 1 cada 2 min que el botón manual.
  try{ if(typeof _broadcastSOS==='function') _broadcastSOS(loc?loc.lat:null, loc?loc.lon:null); }catch(e){}
  var emerg='<div style="display:flex;gap:6px;margin:12px 0"><a href="tel:133" style="flex:1;text-align:center;text-decoration:none;background:#fff;color:#b91c1c;border-radius:10px;padding:10px 4px;font-weight:800;font-size:0.78rem;line-height:1.15"><i class="fas fa-phone"></i> 133<br><small>Carabineros</small></a><a href="tel:131" style="flex:1;text-align:center;text-decoration:none;background:#fff;color:#b91c1c;border-radius:10px;padding:10px 4px;font-weight:800;font-size:0.78rem;line-height:1.15"><i class="fas fa-truck-medical"></i> 131<br><small>SAMU</small></a><a href="tel:132" style="flex:1;text-align:center;text-decoration:none;background:#fff;color:#b91c1c;border-radius:10px;padding:10px 4px;font-weight:800;font-size:0.78rem;line-height:1.15"><i class="fas fa-fire"></i> 132<br><small>Bomberos</small></a></div>';
  if(overlay) overlay.innerHTML='<div style="font-size:3rem"><i class="fas fa-arrow-up-from-bracket"></i></div><h2 style="margin:10px 0">Toca para avisar</h2><p style="font-size:0.85rem;max-width:320px">Ya avisamos de forma anónima a los ciclistas de tu zona. Por seguridad, WhatsApp exige un toque tuyo para mandar el mensaje a tus contactos — ya está todo listo, solo toca abajo. Si es grave, llama directo:</p><div id="crashSosLinks" style="margin-top:8px;width:100%;max-width:320px"></div><button onclick="cancelarAlertaCaida()" style="margin-top:16px;background:none;border:1px solid #fff;color:#fff;border-radius:20px;padding:10px 20px;font-size:0.85rem;cursor:pointer">Cerrar</button>';
  const cont=document.getElementById('crashSosLinks');
  if(!cont) return;
  if(cs.length===0){ cont.innerHTML=emerg+'<p style="color:#ffd0d0;font-size:0.85rem">No tienes contactos de emergencia guardados. Toca el botón SOS en Inicio para agregarlos.</p>'; }
  else { cont.innerHTML=emerg+cs.map(function(x){ return '<a href="https://wa.me/'+x.fono+'?text='+encodeURIComponent(msg)+'" target="_blank" style="display:block;text-align:center;text-decoration:none;background:#25D366;color:#03301a;border-radius:10px;padding:12px;font-weight:800;margin-bottom:8px"><i class="fas fa-arrow-up-from-bracket"></i> Enviar a '+escapeHTML(x.nombre)+'</a>'; }).join(''); }
  try{ if(navigator.vibrate) navigator.vibrate([500,200,500,200,500]); }catch(e){}
}
/* ===== SEGUIMIENTO EN VIVO: comparte tu ubicación con un link, sin que la otra
   persona necesite cuenta ni la app instalada. Va "a caballo" de las actualizaciones
   de posición normales del GPS (con su propio throttle de 15s para no saturar
   Firestore de escrituras). Se marca inactivo (no se borra) al detener el GPS, así
   quien tiene el link ve "dejó de compartir" en vez de una ubicación vieja sin aviso. */
var liveTrackId=null, liveTrackActivo=false; // var a propósito: se leen/escriben desde fuera de este archivo (fin de viaje, ciclistas cercanos)
let liveTrackUltimoEnvio=0;
function _actualizarBtnSeguimientoVivo(){ const b=document.getElementById('btnSeguimientoVivo'); if(b) b.innerText=liveTrackActivo?'🔴 Compartiendo ubicación (toca para detener)':'📡 Compartir ubicación en vivo'; }
async function toggleSeguimientoVivo(){
  if(!cu) return;
  if(liveTrackActivo){
    liveTrackActivo=false;
    if(liveTrackId){ try{ await db.collection('liveTracking').doc(liveTrackId).update({activo:false}); }catch(e){} }
    liveTrackId=null;
    _actualizarBtnSeguimientoVivo();
    h('Dejé de compartir tu ubicación en vivo. Ese link ya no sirve — la próxima vez que compartas te doy uno nuevo.');
    return;
  }
  // Un link NUEVO cada vez (no se reutiliza ni se guarda en el celular): si alguna
  // vez compartiste este link con alguien en quien ya no confías, no puede volver a
  // verte solo porque reactivaste el seguimiento — necesitaría el link nuevo, que
  // solo tú vas a tener.
  liveTrackId=cu.replace(/[^a-zA-Z0-9]/g,'')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const loc=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
  try{
    /* `modo` se publica desde 2026-07-21 para que el aviso de ciclista adelante sepa a
       quién avisar y de quién: un motorizado necesita saber que el punto que tiene a 400 m
       es una BICI, no otro auto. Sin este campo el aviso no puede distinguirlos. */
    await db.collection('liveTracking').doc(liveTrackId).set({nombre:nombreUsuario||'Ciclista', lat:loc?loc.lat:null, lon:loc?loc.lon:null, activo:true, modo:(typeof actividadTipo!=='undefined'?actividadTipo:'ciclismo'), ts:firebase.firestore.FieldValue.serverTimestamp()});
    liveTrackActivo=true; liveTrackUltimoEnvio=0;
    _actualizarBtnSeguimientoVivo();
    const url=location.origin+location.pathname.replace(/index\.html$/,'')+'seguir.html?id='+liveTrackId;
    mostrarLinkSeguimientoVivo(url);
  }catch(e){ lpAviso('No se pudo activar el seguimiento en vivo. Revisa tu conexión.'); }
}
// Invitar amigos: mensaje corto, honesto, sin exagerar ("comunidad enorme" cuando
// recién está empezando) — solo lo que la app de verdad hace hoy.
function invitarAmigos(){
  const url='https://librepedal.pages.dev';
  const msg='Ando pedaleando con Libre Pedal: te guía como Waze, te graba la ruta sola y tiene comunidad de ciclistas. Pruébala gratis: '+url;
  if(navigator.share){
    navigator.share({title:'Libre Pedal', text:msg}).catch(function(){});
    return;
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(msg).then(function(){ h('Copié el mensaje de invitación. Pégalo donde quieras compartirlo.'); }).catch(function(){ _mostrarInvitacionManual(msg); });
    return;
  }
  _mostrarInvitacionManual(msg);
}
function _mostrarInvitacionManual(msg){
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-user-plus"></i> Invita a un amigo';
  document.getElementById('modalContent').innerHTML='<p style="color:#9fb3c8;font-size:0.85rem;margin-top:0">Copia este mensaje y compártelo donde quieras:</p><textarea readonly rows="4" style="width:100%" onclick="this.select()">'+escapeHTML(msg)+'</textarea>';
  document.getElementById('userModal').classList.add('on');
}
function mostrarLinkSeguimientoVivo(url){
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-satellite-dish"></i> Ubicación en vivo';
  document.getElementById('modalContent').innerHTML='<p style="color:#9fb3c8;font-size:0.85rem;margin-top:0">Comparte este link con quien quieras que vea tu posición en tiempo real. No necesita cuenta ni tener la app instalada.</p>'
    +'<input type="text" readonly value="'+url+'" style="margin-bottom:8px" onclick="this.select()">'
    +'<button class="ab" onclick="navigator.clipboard.writeText(\''+url+'\').then(function(){h(\'Link copiado.\');})"><i class="fas fa-clipboard"></i> Copiar link</button>'
    +(navigator.share?'<button class="ab sec" onclick="navigator.share({title:\'Sígueme en vivo por Libre Pedal\',url:\''+url+'\'})"><i class="fas fa-share-from-square"></i> Compartir</button>':'')
    +'<p style="font-size:0.7rem;color:#7d8ba0;margin-top:10px">Se actualiza mientras estés con el GPS activo. Toca "Compartir ubicación en vivo" de nuevo para detenerlo.</p>';
  document.getElementById('userModal').classList.add('on');
}
function _actualizarLiveTrack(lat,lon){
  if(!liveTrackActivo || !liveTrackId) return;
  const ahora=Date.now();
  if(ahora-liveTrackUltimoEnvio<15000) return;
  liveTrackUltimoEnvio=ahora;
  db.collection('liveTracking').doc(liveTrackId).update({lat:lat,lon:lon,ts:firebase.firestore.FieldValue.serverTimestamp()}).catch(function(){});
}
/* ===== SENSORES BLUETOOTH (pulsómetro / potenciómetro) =====
   Web Bluetooth, gratis, sin apps ni hardware propietario — cualquier sensor
   estándar BLE (Heart Rate Service 0x180D, Cycling Power Service 0x1818) sirve. */
let bleHRDevice=null, blePowerDevice=null, bleHR=null, blePower=null;
function _bleDisponible(){ return typeof navigator!=='undefined' && !!navigator.bluetooth; }
function _parseHR(dataview){
  const flags=dataview.getUint8(0);
  const es16bits=(flags & 0x01)!==0;
  return es16bits ? dataview.getUint16(1,true) : dataview.getUint8(1);
}
function _parsePower(dataview){
  // La potencia instantánea (int16) va siempre justo después de los 2 bytes de
  // flags, sin importar qué otros campos opcionales traiga el sensor.
  return dataview.getInt16(2,true);
}
// El Bluetooth de bici se corta seguido (el sensor se aleja un segundo, hay
// interferencia, etc.) — sin reconexión automática, cada corte esporádico te
// obligaba a ir hasta Ajustes y tocar "Conectar" de nuevo en plena ruta.
async function _reconectarBLE(device, onReady, tipo, sigueActivo){
  for(let intento=0; intento<5; intento++){
    await new Promise(function(r){ setTimeout(r, 2000); });
    if(!sigueActivo()) return; // el usuario desconectó a propósito mientras reintentábamos
    try{ const server=await device.gatt.connect(); await onReady(server); h(tipo+' reconectado.'); return; }catch(e){}
  }
}
async function conectarPulsometro(){
  if(!_bleDisponible()){ lpAviso('Tu navegador no soporta Bluetooth (usa Chrome en Android, con el Bluetooth del celular encendido).'); return; }
  try{
    const device=await navigator.bluetooth.requestDevice({filters:[{services:['heart_rate']}]});
    async function suscribir(server){
      const service=await server.getPrimaryService('heart_rate');
      const char=await service.getCharacteristic('heart_rate_measurement');
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', function(e){ bleHR=_parseHR(e.target.value); _actualizarBleUI(); });
    }
    await suscribir(await device.gatt.connect());
    bleHRDevice=device;
    device.addEventListener('gattserverdisconnected', function(){ bleHR=null; _actualizarBleUI(); if(bleHRDevice===device) _reconectarBLE(device, suscribir, 'Pulsómetro', function(){ return bleHRDevice===device; }); });
    _actualizarBleUI();
    h('Pulsómetro conectado.');
  }catch(e){ if(e.name!=='NotFoundError') lpAviso('No se pudo conectar el pulsómetro: '+e.message); }
}
async function conectarPotenciometro(){
  if(!_bleDisponible()){ lpAviso('Tu navegador no soporta Bluetooth (usa Chrome en Android, con el Bluetooth del celular encendido).'); return; }
  try{
    const device=await navigator.bluetooth.requestDevice({filters:[{services:['cycling_power']}]});
    async function suscribir(server){
      const service=await server.getPrimaryService('cycling_power');
      const char=await service.getCharacteristic('cycling_power_measurement');
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', function(e){ blePower=_parsePower(e.target.value); _actualizarBleUI(); });
    }
    await suscribir(await device.gatt.connect());
    blePowerDevice=device;
    device.addEventListener('gattserverdisconnected', function(){ blePower=null; _actualizarBleUI(); if(blePowerDevice===device) _reconectarBLE(device, suscribir, 'Potenciómetro', function(){ return blePowerDevice===device; }); });
    _actualizarBleUI();
    h('Potenciómetro conectado.');
  }catch(e){ if(e.name!=='NotFoundError') lpAviso('No se pudo conectar el potenciómetro: '+e.message); }
}
function desconectarBluetooth(){
  if(bleHRDevice && bleHRDevice.gatt.connected) bleHRDevice.gatt.disconnect();
  if(blePowerDevice && blePowerDevice.gatt.connected) blePowerDevice.gatt.disconnect();
  bleHR=null; blePower=null; bleHRDevice=null; blePowerDevice=null;
  _actualizarBleUI();
  h('Sensores Bluetooth desconectados.');
}
// Zonas de esfuerzo genéricas (sin pedirte edad ni FC máxima, que no tenemos):
// umbrales típicos de un adulto en bici, solo para dar una referencia de color,
// no un dato clínico. Da más contexto que ver un número pelado.
function _zonaHR(bpm){
  if(bpm<100) return {c:'#9fb3c8',l:'suave'};
  if(bpm<130) return {c:'#10b981',l:'moderado'};
  if(bpm<155) return {c:'#f59e0b',l:'intenso'};
  return {c:'#ef4444',l:'máximo'};
}
function _actualizarBleUI(){
  const zonaHR=bleHR!=null?_zonaHR(bleHR):null;
  [
    {id:'dashBleHR', val:bleHR, icon:'❤️', suf:' bpm', color:zonaHR?zonaHR.c:null},
    {id:'navBleHR', val:bleHR, icon:'❤️', suf:' bpm', color:zonaHR?zonaHR.c:null},
    {id:'dashBlePower', val:blePower, icon:'⚡', suf:'W'},
    {id:'navBlePower', val:blePower, icon:'⚡', suf:'W'}
  ].forEach(function(x){
    const el=document.getElementById(x.id); if(!el) return;
    if(x.val!=null){
      el.style.display='inline-flex';
      el.innerText=x.icon+' '+x.val+x.suf;
      if(x.color){ el.style.color=x.color; el.style.borderColor=x.color; }
    }
    else { el.style.display='none'; }
  });
}
