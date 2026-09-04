/* ===== GAMIFICACIÓN: Logros (gratis) + Ranking Top 100 ===== */
function statViajesCompletados(){ return (typeof trips!=='undefined'&&trips)?trips.filter(function(t){return t&&t.status==='completed';}).length:0; }
function statBitacora(){ const pre='lp_diario_'+(cu||'anon')+'_'; return Object.keys(localStorage).filter(function(k){return k.indexOf(pre)===0;}).length; }
const LOGROS=[
  {e:'<i class="fas fa-hands-clapping"></i>',t:'Bienvenido',d:'Te uniste a la comunidad',val:function(){return 1;},meta:1,u:''},
  {e:'<i class="fas fa-bicycle"></i>',t:'Primer pedaleo',d:'Tu primer kilómetro',val:function(){return us.di;},meta:1,u:'km'},
  {e:'<i class="fas fa-person-biking"></i>',t:'¡Mira mamá, sin rueditas!',d:'Tus primeros 10 km',val:function(){return us.di;},meta:10,u:'km'},
  {e:'<i class="fas fa-binoculars"></i>',t:'Explorador',d:'50 km recorridos',val:function(){return us.di;},meta:50,u:'km'},
  {e:'<i class="fas fa-gauge-high"></i>',t:'Centenario',d:'100 km recorridos',val:function(){return us.di;},meta:100,u:'km'},
  {e:'<i class="fas fa-fire"></i>',t:'Fondista',d:'250 km recorridos',val:function(){return us.di;},meta:250,u:'km'},
  {e:'<i class="fas fa-mountain"></i>',t:'Rutero',d:'500 km recorridos',val:function(){return us.di;},meta:500,u:'km'},
  {e:'<i class="fas fa-medal"></i>',t:'Cicloviajero',d:'1000 km — ¡elegible a premios!',val:function(){return us.di;},meta:1000,u:'km'},
  {e:'<i class="fas fa-earth-americas"></i>',t:'Trotamundos',d:'2500 km recorridos',val:function(){return us.di;},meta:2500,u:'km'},
  {e:'<i class="fas fa-trophy"></i>',t:'Leyenda del pedal',d:'5000 km recorridos',val:function(){return us.di;},meta:5000,u:'km'},
  {e:'<i class="fas fa-handshake"></i>',t:'Primer aporte',d:'Gana 10 de Darma aportando',val:function(){return us.d;},meta:10,u:''},
  {e:'<i class="fas fa-seedling"></i>',t:'Colaborador',d:'50 de Darma',val:function(){return us.d;},meta:50,u:''},
  {e:'<i class="fas fa-star"></i>',t:'Pilar de la comunidad',d:'150 de Darma',val:function(){return us.d;},meta:150,u:''},
  {e:'<i class="fas fa-gem"></i>',t:'Guardián',d:'500 de Darma',val:function(){return us.d;},meta:500,u:''},
  {e:'<i class="fas fa-crown"></i>',t:'Embajador',d:'1000 de Darma',val:function(){return us.d;},meta:1000,u:''},
  {e:'<i class="fas fa-compass"></i>',t:'Primer viaje',d:'Completa 1 viaje',val:statViajesCompletados,meta:1,u:''},
  {e:'<i class="fas fa-map-location-dot"></i>',t:'Viajero',d:'5 viajes completados',val:statViajesCompletados,meta:5,u:''},
  {e:'<i class="fas fa-suitcase"></i>',t:'Aventurero',d:'10 viajes completados',val:statViajesCompletados,meta:10,u:''},
  {e:'<i class="fas fa-tent"></i>',t:'Nómada',d:'25 viajes completados',val:statViajesCompletados,meta:25,u:''},
  {e:'<i class="fas fa-battery-half"></i>',t:'Con energía',d:'Quema 1000 calorías',val:function(){return us.c;},meta:1000,u:'cal'},
  {e:'<i class="fas fa-bolt"></i>',t:'Máquina',d:'5000 calorías quemadas',val:function(){return us.c;},meta:5000,u:'cal'},
  {e:'<i class="fas fa-hand-fist"></i>',t:'Imparable',d:'15000 calorías',val:function(){return us.c;},meta:15000,u:'cal'},
  {e:'<i class="fas fa-book"></i>',t:'Cronista',d:'Escribe en tu Ciclo Bitácora',val:statBitacora,meta:1,u:''},
  {e:'<i class="fas fa-book-open"></i>',t:'Memorias',d:'7 días de bitácora',val:statBitacora,meta:7,u:''}
];
function mostrarLogrosComunidad(){
  _modalVolverA=null; // es el menú raíz de este grupo: la "✕" ya vuelve al lugar correcto
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-trophy"></i> Logros y comunidad';
  document.getElementById('modalContent').innerHTML='<div style="display:flex;flex-direction:column;gap:8px">'
    +'<button class="ab" style="margin:0" onclick="mostrarLogros()"><i class="fas fa-trophy"></i> Mis logros</button>'
    +'<button class="ab sec" style="margin:0" onclick="mostrarRanking(null,&quot;mostrarLogrosComunidad&quot;)"><i class="fas fa-medal"></i> Ranking mundial</button>'
    +'<button class="ab sec" style="margin:0" onclick="verSegmentos()"><i class="fas fa-flag-checkered"></i> Segmentos y tabla de líderes</button>'
    +'<button class="ab sec" style="margin:0" onclick="verRetos()"><i class="fas fa-bullseye"></i> Retos y temporadas</button>'
    +'<button class="ab sec" style="margin:0" onclick="mostrarResumenAnual()"><i class="fas fa-chart-column"></i> Mi año en Libre Pedal</button>'
    +'<button class="ab sec" style="margin:0" onclick="verRecomendacionRutas()"><i class="fas fa-compass"></i> Rutas para ti</button>'
    +'<button class="ab sec" style="margin:0" onclick="mostrarTienda(true)"><i class="fas fa-dharmachakra"></i> Tienda de Darma</button>'
    +'<button class="ab sec" style="margin:0" onclick="mostrarComunidad()"><i class="fas fa-handshake"></i> Meta de la comunidad (vota)</button>'
    +'<button class="ab sec" style="margin:0" onclick="mostrarFundadores()"><i class="fas fa-medal"></i> Socios Fundadores</button>'
    +'</div>';
  document.getElementById('userModal').classList.add('on');
}
// 2026-08-24: _modalVolverA='mostrarLogrosComunidad' (en esta función y en
// verSegmentos/verRetos/mostrarResumenAnual/verRecomendacionRutas/mostrarFundadores/
// mostrarComunidad) apuntaba a un menú-hub que ya no existe en Social desde la
// reorganización del 23-ago — cada una de estas 7 ahora es un botón directo, así
// que "Volver" quedaba huérfano (el botón "← Volver" llevaba a una pantalla
// inalcanzable desde ningún otro lado). Pasa a null: sin botón "Volver" propio, el
// "✕" del modal ya cierra correctamente de vuelta a Social.
function mostrarLogros(){
  _modalVolverA=null;
  let desb=0; const items=LOGROS.map(function(l){ const v=l.val()||0; const done=v>=l.meta; if(done)desb++; return {l:l,done:done,pct:Math.min(100,Math.round(v/l.meta*100)),v:v}; });
  let html=_btnVolverModal()+'<p style="color:#9fb3c8;font-size:0.85rem;margin-top:0">Has desbloqueado <strong style="color:var(--g)">'+desb+' de '+LOGROS.length+'</strong> logros. Son <strong>gratis</strong> y muestran tu avance en la comunidad. 🚴</p>';
  items.forEach(function(it){ const l=it.l;
    if(it.done){
      html+='<div class="lg-item lg-done"><span class="lg-medal"><span class="lg-glow"></span><span class="lg-ic">'+l.e+'</span></span><div class="lg-body"><div class="lg-title">'+escapeHTML(l.t)+'<span class="lg-check"><i class="fas fa-check"></i></span></div><div class="lg-desc">'+escapeHTML(l.d)+'</div></div></div>';
    } else {
      const off=(125.66*(1-it.pct/100)).toFixed(1);
      html+='<div class="lg-item lg-mystery"><span class="lg-medal"><svg class="lg-prog" viewBox="0 0 46 46"><circle class="lg-prog-bg" cx="23" cy="23" r="20"></circle><circle class="lg-prog-fg" cx="23" cy="23" r="20" style="stroke-dashoffset:'+off+'"></circle></svg><span class="lg-ic lg-q">?</span></span><div class="lg-body"><div class="lg-title">Logro por descubrir</div><div class="lg-desc">'+_pistaLogro(l)+'</div></div></div>';
    }
  });
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-trophy"></i> Logros'; document.getElementById('modalContent').innerHTML=html; document.getElementById('userModal').classList.add('on');
}
/* ===== Logros OCULTOS + anuncio de Pistero (2026-08-14) =====
   Aditivo: si algo falla, cae en silencio (try/catch) y no afecta al resto de la app. */
function _pistaLogro(l){
  try{
    if(l.u==='km') return 'Pista: algo de kilómetros…';
    if(l.u==='cal') return 'Pista: algo de energía…';
    if(/Darma/i.test(l.d)) return 'Pista: aporte a la comunidad…';
    if(/viaje/i.test(l.d)) return 'Pista: viajes completados…';
    if(/bit[aá]cora/i.test(l.d)) return 'Pista: tu Ciclo Bitácora…';
  }catch(e){}
  return 'Pista: un primer paso…';
}
var LOGROS_FRASES={
  'Bienvenido':'¡Bienvenido a la comunidad, compadre! Esto recién empieza.',
  'Primer pedaleo':'¡Tu primer kilómetro! Así se parte, de a poco y con ganas.',
  '¡Mira mamá, sin rueditas!':'¡Diez kilómetros! Mírate, hecho todo un ciclista.',
  'Explorador':'¡Cincuenta kilómetros! Ya andas explorando en serio.',
  'Centenario':'¡Cien kilómetros, mi estimado! Eso ya es harta pedaleada.',
  'Fondista':'¡Doscientos cincuenta! Piernas de fondista, compadre.',
  'Rutero':'¡Quinientos kilómetros! Rutero de verdad. La constancia le gana al talento.',
  'Cicloviajero':'¡Mil kilómetros! Elegible a premios y con toda la ruta ganada.',
  'Trotamundos':'¡Dos mil quinientos! Trotamundos, ni las distancias te frenan.',
  'Leyenda del pedal':'¡Cinco mil kilómetros! Eso no se compra, eso se pedalea. Leyenda.',
  'Primer aporte':'¡Tu primer aporte a la comunidad! Gracias, así se construye.',
  'Colaborador':'¡Cincuenta de Darma! Colaborador de tomo y lomo.',
  'Pilar de la comunidad':'¡Pilar de la comunidad! Esto no sería igual sin ti.',
  'Guardián':'¡Quinientos de Darma! Guardián de esta comunidad, compadre.',
  'Embajador':'¡Mil de Darma! Embajador oficial de Libre Pedal.',
  'Primer viaje':'¡Primer viaje completado! Y el primero de muchos.',
  'Viajero':'¡Cinco viajes! Ya le tomaste el gusto a esto.',
  'Aventurero':'¡Diez viajes! Aventurero de tomo y lomo.',
  'Nómada':'¡Veinticinco viajes! Nómada, la casa es la ruta.',
  'Con energía':'¡Mil calorías quemadas! Pura energía, compadre.',
  'Máquina':'¡Cinco mil calorías! Andas hecho una máquina.',
  'Imparable':'¡Quince mil calorías! Imparable, no hay quién te pare.',
  'Cronista':'¡Escribiste en tu bitácora! Cronista de tus propias rutas.',
  'Memorias':'¡Siete días de bitácora! Puras memorias sobre ruedas.'
};
function _fraseLogro(l){ return (l&&LOGROS_FRASES[l.t]) || ('¡Desbloqueaste '+(l?l.t:'un logro')+'! Sigue así, compadre.'); }
function _toastLogro(l){
  try{
    var el=document.createElement('div'); el.className='logro-toast';
    el.innerHTML='<span class="logro-toast__ic">'+l.e+'</span><div class="logro-toast__b"><b>¡Logro desbloqueado!</b><span>'+escapeHTML(l.t)+'</span></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('on'); });
    setTimeout(function(){ el.classList.remove('on'); setTimeout(function(){ try{ el.remove(); }catch(e){} }, 450); }, 4600);
  }catch(e){}
}
// Logros conseguidos y km recorridos DURANTE el viaje activo -- se resetean al
// empezar un viaje (toggleGPS/iniciarNavegacion) y se leen/vacían al terminarlo
// (_mostrarResumenViaje). us.di es el total HISTÓRICO del usuario, no sirve para
// saber cuánto anduvo en ESTE viaje puntual.
var _logrosDelViaje=[], _kmEsteViaje=0;
function _anunciarLogro(l){
  try{ _toastLogro(l); }catch(e){}
  try{ if(typeof h==='function') h(_fraseLogro(l)); }catch(e){}
  try{ _logrosDelViaje.push(l); }catch(e){}
}
// Cierre del viaje (pedido de Inty 2026-08-26: "hoy terminar la ruta queda mudo,
// sin ningún resumen"). Reusa el look de medalla de Logros (.lg-medal), con una
// entrada especial -- no es un componente nuevo, es la misma medalla en grande.
function _mostrarResumenViaje(){
  var logros=_logrosDelViaje.slice(); _logrosDelViaje=[];
  var kmViaje=_kmEsteViaje; _kmEsteViaje=0;
  if(kmViaje<0.05 && !logros.length) return; // viaje nulo (se tocó el botón sin pedalear nada): no hay nada que celebrar
  var duracionMs=tripStartTime?Math.max(0,Date.now()-tripStartTime):0;
  var minutos=Math.max(0,Math.round(duracionMs/60000));
  var velMedia=duracionMs>0?(kmViaje/(duracionMs/3600000)):0;
  var medallasHTML=logros.map(function(l,i){
    return '<div class="rv-medalla"><div class="rv-medalla-ic-wrap" style="--rv-d:'+(i*180)+'ms"><span class="rv-medalla-ic">'+l.e+'</span></div><div class="rv-medalla-nombre">'+escapeHTML(l.t)+'</div></div>';
  }).join('');
  var html=''
    +'<div class="rv-stats">'
    +'<div class="rv-stat"><b>'+kmViaje.toFixed(2)+'</b><span>km</span></div>'
    +'<div class="rv-stat"><b>'+minutos+'</b><span>min</span></div>'
    +'<div class="rv-stat"><b>'+velMedia.toFixed(1)+'</b><span>km/h prom.</span></div>'
    +'</div>'
    +(logros.length?('<h4 class="rv-titulo-logros">¡'+logros.length+' logro'+(logros.length>1?'s':'')+' nuevo'+(logros.length>1?'s':'')+'!</h4><div class="rv-medallas">'+medallasHTML+'</div>'):'');
  var modal=document.getElementById('resumenViajeModal');
  if(!modal){
    modal=document.createElement('div'); modal.id='resumenViajeModal'; modal.className='rv-overlay';
    modal.innerHTML='<div class="rv-card"><button class="rv-cerrar" onclick="document.getElementById(\'resumenViajeModal\').classList.remove(\'on\')"><i class="fas fa-xmark"></i></button><h3 class="rv-h">¡Viaje terminado!</h3><div id="rvContenido"></div></div>';
    document.body.appendChild(modal);
  }
  document.getElementById('rvContenido').innerHTML=html;
  requestAnimationFrame(function(){ modal.classList.add('on'); });
}
var _logrosListo=false;
function _logrosDesbKey(){ return 'lp_logros_desb_'+(cu||'anon'); }
function _chequearLogros(silencioso){
  try{
    if(!cu || typeof LOGROS==='undefined') return;
    var prev; try{ prev=JSON.parse(localStorage.getItem(_logrosDesbKey())||'[]'); }catch(e){ prev=[]; }
    if(!Array.isArray(prev)) prev=[];
    var set={}; prev.forEach(function(i){ set[i]=1; });
    var nuevos=[];
    LOGROS.forEach(function(l,idx){
      var v=0; try{ v=l.val()||0; }catch(e){ v=0; }
      if(v>=l.meta && !set[idx]){ set[idx]=1; nuevos.push(l); }
    });
    try{ localStorage.setItem(_logrosDesbKey(), JSON.stringify(Object.keys(set).map(Number))); }catch(e){}
    if(!silencioso && nuevos.length){ _anunciarLogro(nuevos[0]); } // uno a la vez, sin atochar la voz
  }catch(e){}
}
function _iniciarLogros(){ try{ _chequearLogros(true); _logrosListo=true; }catch(e){} }
/* Sube tus kilómetros y tu Darma a la nube.
   OJO con el catch: antes se tragaba el error en silencio, así que si la escritura fallaba
   (permisos, sesión a medio levantar, sin red) NADIE se enteraba — ni el usuario ni
   nosotros. Ahora se reporta a Sentry: un fallo acá significa que a alguien se le están
   quedando los kilómetros guardados solo en el teléfono, y eso hay que verlo. */
/* Mantencion -> nube (2026-08-24). La mantencion preventiva nacio el 23-ago guardando
   SOLO en localStorage (gd()), igual que los kilometros antes del arreglo del 20-jul: si
   el usuario cambia de telefono o limpia los datos, pierde el historial de cada cambio de
   cadena, pastillas y transmision, con sus costos. Es el mismo tipo de perdida silenciosa
   que ya nos costo una vez, asi que viaja por el mismo camino que los km.
   Se sanitiza a proposito: esta carga va en la MISMA escritura que `km`, y un solo valor
   invalido (undefined/NaN) hace fallar el set() completo — o sea, un historial raro
   dejaria de subir tambien los kilometros. Preferimos subir el item recortado antes que
   arriesgar el dato critico. */
function _mantParaNube(){
  const out={};
  try{
    const src=us.mant; if(!src || typeof src!=='object') return out;
    const num=function(v){ return (typeof v==='number' && isFinite(v)) ? v : null; };
    Object.keys(src).forEach(function(k){
      const d=src[k]; if(!d || typeof d!=='object') return;
      out[k]={
        kmBase: num(d.kmBase)||0,
        fecha: (typeof d.fecha==='string' && d.fecha) ? d.fecha : null,
        avisado: !!d.avisado,
        historial: (Array.isArray(d.historial)?d.historial:[]).slice(-30).map(function(h){
          return {
            fecha: (h && typeof h.fecha==='string') ? h.fecha : null,
            km: num(h && h.km)||0,
            costo: num(h && h.costo),
            nota: (h && typeof h.nota==='string') ? h.nota : null
          };
        })
      };
    });
  }catch(e){}
  return out;
}
/* Nada de esto se sube hasta haber leído la nube. Es la misma trampa que ya costó
   kilómetros el 2026-07-20, y con la mantención muerde más fuerte: `historial` es un ARRAY,
   y Firestore con {merge:true} REEMPLAZA arrays enteros (a los mapas los fusiona, a los
   arrays no). El escenario: teléfono nuevo o datos borrados -> `us.mant` arranca vacío ->
   salta cualquier logro en los primeros segundos -> _ganarDarma() -> sincronizarStats()
   sube historiales VACÍOS y borra los de la nube -> cuando sincronizarAlEntrar() corre a
   los 4 segundos, ya no queda nada que restaurar. Pérdida definitiva y silenciosa.
   Bug real (2026-08-31): el comentario original decía que km/Darma "siguen subiendo como
   siempre... y el criterio de gana-el-más-grande los protege" — FALSO. Ese criterio vive
   SOLO en _restaurarDesdeNube() (la LECTURA); esta función (la ESCRITURA) mandaba
   `km:us.di||0` sin condición. au() corre SÍNCRONO en el login (línea ~4696), antes de que
   sincronizarAlEntrar() alcance a leer la nube 4s después (línea ~7986) — su throttle
   (_ultimoSyncStats arranca en 0) deja pasar un sincronizarStats() inmediato. En un
   teléfono nuevo/datos borrados, `us.di` local es 0: esa subida temprana pisaba el km/Darma
   real de la nube con 0, y para cuando sincronizarAlEntrar() leía, ya no quedaba nada que
   restaurar — pérdida definitiva, exactamente el mismo patrón que la mantención, solo que
   nunca se le puso la misma compuerta. Ahora km/kmPorModo/darma esperan la misma bandera. */
let _mantListoParaSubir=false;
async function sincronizarStats(){
  if(!cu) return;
  const _authUid=window.lpUID||(firebase.auth().currentUser&&firebase.auth().currentUser.uid)||null;
  const datos={nombre:nombreUsuario||'Ciclista', authUid:_authUid};
  if(_mantListoParaSubir){
    datos.km=us.di||0;
    datos.kmPorModo=_kmPorModoParaNube();
    datos.darma=us.d||0;
    datos.mant=_mantParaNube();
    datos.mantKm=(typeof us.mantKm==='number'&&isFinite(us.mantKm))?us.mantKm:0;
  }
  try{
    await db.collection('users').doc(cu).set(datos,{merge:true});
  }catch(e){
    try{ if(window.Sentry&&Sentry.captureException) Sentry.captureException(e,{tags:{donde:'sincronizarStats'}}); }catch(_){}
  }
}
/* Sincroniza UNA vez al entrar a la app.
   Encontrado el 2026-07-20 mirando los datos REALES de producción: de 29 usuarios, 16 no
   tenían el campo `km`. O sea el 55% era INVISIBLE en el ranking — y no "al final de la
   lista": Firestore excluye del `orderBy` a los documentos que no tienen el campo, así
   que directamente no existían para el ranking, pedalearan lo que pedalearan. Entre
   ellos había gente real con nombre, no cuentas de prueba.
   Causa: `sincronizarStats()` solo corría durante un viaje con GPS de más de 60 segundos
   o al ganar Darma. Quien pedaleó sin que se diera ese momento exacto dejó sus
   kilómetros guardados solo en su teléfono, para siempre.
   Con esto cualquiera que abra la app sube lo que tenga y entra al ranking SOLO, sin que
   nadie tenga que tocarle la cuenta ni correr una migración. */
/* ⚠️ NUNCA subir a ciegas: primero se MIRA lo que hay en la nube.
   Auditoría de calidad del 2026-07-20: `us` se hidrata SOLO desde localStorage (no existe
   ni una línea que lea `us.di` desde Firestore). Si alguien reinstala la app, limpia los
   datos del navegador o entra desde otro teléfono, `us.di` arranca en 0 — y esta función,
   que corre incondicionalmente al entrar, le sobrescribía sus kilómetros en la nube con
   CERO. Pérdida definitiva, silenciosa, y provocada justo por el arreglo que rescató a los
   16 usuarios invisibles.
   Ahora manda el número más grande: si la nube tiene más, se RESTAURA al teléfono (que es
   lo que uno espera al reinstalar) y recién entonces se sincroniza. */
/* Compartida por sincronizarAlEntrar() (recarga / sesión que vuelve) Y por
   _completarLoginVerificadoOriginal() (PRIMER login interactivo por código de tester,
   que ya lee `_prevData` para restaurar cosméticas y no necesita otra lectura a
   Firestore para esto). Nace de una prueba en vivo el 2026-08-24: el login por código
   NUNCA pasaba por sincronizarAlEntrar(), así que en la primera sesión de cualquier
   cuenta (incluida una que ya tuviera km/mantención reales en la nube desde otro
   dispositivo) esos datos no se restauraban — y peor, la escritura de
   _completarLoginVerificadoOriginal() sube `km:(us&&us.di)||0` SIN haber leído la nube
   primero, así que en una cuenta existente con km real, un primer login desde un
   dispositivo/navegador nuevo lo pisaba con 0. Restaurar ANTES de esa escritura la
   vuelve inofensiva: escribe de vuelta el mismo máximo que ya tenía.
   "Gana el más grande/avanzado", nunca se pisa lo que ya existe con algo más pobre.
   Mantención se compara item por item y se copia el objeto ENTERO del ganador, no
   campo por campo: kmBase, fecha e historial se escriben juntos al marcar "ya la
   cambié", así que mezclar el kmBase de la nube con la fecha del teléfono daría un
   ítem incoherente. Criterio de "más avanzado": más cambios registrados; a igualdad,
   mayor kmBase; a igualdad, fecha más nueva.
   Devuelve true si algo cambió (para que quien llama decida si avisa/persiste). */
function _restaurarDesdeNube(nube){
  if(!nube) return false;
  let restaurado=false;
  // premium (2026-09-04): NO usa el criterio "gana el mayor" del resto de esta función --
  // no tiene sentido comparar, la nube es la ÚNICA fuente de verdad real (la escribe el
  // worker de verificación de compras, nunca el cliente; ver firestore.rules,
  // premiumSinTocar()). Se copia tal cual, siempre que venga en el payload -- SIN marcar
  // `restaurado` (eso dispara "Recuperé tus kilómetros" hablado en sincronizarAlEntrar();
  // confirmar el estado de suscripción no es "recuperar kilómetros" y NO debe generar una
  // frase hablada en cada apertura de sesión de un usuario premium).
  if(nube.premium && typeof nube.premium==='object'){ us.premium=nube.premium; }
  const kmNube=Number(nube.km)||0, kmLocal=Number(us.di)||0;
  const daNube=Number(nube.darma)||0, daLocal=Number(us.d)||0;
  if(kmNube>kmLocal+0.05){ us.di=kmNube; restaurado=true; }
  if(daNube>daLocal){ us.d=daNube; restaurado=true; }
  if(nube.kmPorModo && typeof nube.kmPorModo==='object'){
    if(!us.dm || typeof us.dm!=='object') us.dm={};
    for(const m in nube.kmPorModo){ if((Number(nube.kmPorModo[m])||0)>(Number(us.dm[m])||0)){ us.dm[m]=Number(nube.kmPorModo[m])||0; restaurado=true; } }
  }
  const kmMantNube=Number(nube.mantKm)||0, kmMantLocal=Number(us.mantKm)||0;
  if(kmMantNube>kmMantLocal+0.05){ us.mantKm=kmMantNube; restaurado=true; }
  if(nube.mant && typeof nube.mant==='object'){
    if(!us.mant || typeof us.mant!=='object') us.mant={};
    Object.keys(nube.mant).forEach(function(k){
      const dn=nube.mant[k]; if(!dn || typeof dn!=='object') return;
      const dl=us.mant[k];
      const hn=(Array.isArray(dn.historial)?dn.historial.length:0);
      const hl=(dl&&Array.isArray(dl.historial))?dl.historial.length:0;
      let nubeGana;
      if(!dl) nubeGana=true;
      else if(hn!==hl) nubeGana=hn>hl;
      else if((Number(dn.kmBase)||0)!==(Number(dl.kmBase)||0)) nubeGana=(Number(dn.kmBase)||0)>(Number(dl.kmBase)||0);
      else nubeGana=(new Date(dn.fecha||0).getTime()||0)>(new Date(dl.fecha||0).getTime()||0);
      if(nubeGana){
        us.mant[k]={kmBase:Number(dn.kmBase)||0, fecha:dn.fecha||null, avisado:!!dn.avisado,
                    historial:Array.isArray(dn.historial)?dn.historial:[],
                    umbralKm:(dl&&dl.umbralKm!==undefined)?dl.umbralKm:null,
                    umbralMeses:(dl&&dl.umbralMeses!==undefined)?dl.umbralMeses:null};
        restaurado=true;
      }
    });
    // los umbrales los vuelve a fijar _mantData() desde MANT_ITEMS (fuente de verdad
    // del codigo, no de la nube), asi que no se suben ni se confia en ellos.
    try{ if(typeof _mantData==='function') _mantData(); }catch(e){}
  }
  return restaurado;
}
function sincronizarAlEntrar(){
  if(!cu) return;
  setTimeout(async function(){
    try{
      let nube=null;
      try{ const doc=await db.collection('users').doc(cu).get(); if(doc.exists) nube=doc.data(); }catch(e){}
      if(_restaurarDesdeNube(nube)){
        try{ localStorage.setItem('lp_u_'+cu, JSON.stringify(us)); }catch(e){}
        try{ if(typeof au==='function') au(); }catch(e){}
        try{ h('Recuperé tus kilómetros desde tu cuenta. Bienvenido de vuelta.'); }catch(e){}
      }
      // Recién acá se habilita la subida de la mantención: ya se leyó la nube y, si tenía
      // algo mejor, ya está fusionado en `us.mant`. Antes de este punto una subida habría
      // pisado el historial de la nube con arrays vacíos (ver nota en sincronizarStats).
      _mantListoParaSubir=true;
      sincronizarStats(); // recién ahora se sube, con el número correcto
      try{ _iniciarLogros(); }catch(e){} // baseline de logros: registra lo ya ganado SIN anunciar; habilita anuncios reales
    }catch(e){
      // Si la lectura falló, igual hay que abrir la compuerta: dejarla cerrada para
      // siempre significaría que a ese usuario la mantención NUNCA le llega a la nube —
      // que es justo el bug que vinimos a arreglar. Lo que se protege es el orden (leer
      // antes de escribir), no el éxito de la lectura: acá ya se intentó.
      _mantListoParaSubir=true;
      try{ if(window.Sentry&&Sentry.captureException) Sentry.captureException(e,{tags:{donde:'sincronizarAlEntrar'}}); }catch(_){}
    }
  }, 4000); // deja que la sesión termine de levantar
}
