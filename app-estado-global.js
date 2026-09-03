let cu=null,uj=[],us={d:0,n:'Novato',di:0,c:0,la:null,lo:null,sumVelDist:0},mp,crl,gw,ig=false,rh=[],sm=[],cm=[],sc='classic',ghostMode=false,lastPos=null,ulp=null,radarActive=false,currentRoute=[],friendRequestSent=[],mapAllRoutes=null,mapHostelSelect=null,hostelCoords=null,nombreUsuario='',radarCircle=null,lastFixTime=0,posHistory=[];
let categoriaActual='todos', hostelTipoActual='todos';
let trips=[], currentTrip=null, navMap=null, helmetMarker=null, routeLine=null;
let addedDests=[], currentFilter='hostel', allHostels=[];
let gpsPoints=[], lastGpsPoint=null, totalDistance=0, gpsWatchId=null, tripStartTime=0, navPosHistory=[];
// Evita perder el track al cerrar la navegación (✕) sin haber guardado explícitamente
// (con "Terminar" o al llegar). true apenas finishTrip/finishTripAuto/guardarRutaNavegada
// ya guardaron algo, para que endNavigation() no tenga que re-guardar por su cuenta.
let navGuardado=false;
/* Saludos SIN el nombre del usuario.
   Reportado por Inty (2026-07-20): la app saludaba «Hola yo» — el nombre del perfil había
   quedado guardado como "yo" y se lo metía tal cual a la frase. Pero el problema de fondo
   no era ese dato: **decir el nombre no aporta nada**. Un amigo que te habla no te dice tu
   nombre en cada saludo; suena a formulario, y con cualquier nombre raro o mal escrito
   queda ridículo. Se sacó de todas las frases en vez de parchar el caso "yo". */
const saludosBienvenida=[
  "¡Qué alegría verte! Te estaba esperando para pedalear.",
  "Justo pensaba en ti. ¿Listo para sumar kilómetros?",
  "Bienvenido de vuelta. Contigo el camino se hace más bonito.",
  "Agarra la bici, que hoy se ve un lindo día para rodar.",
  "Me alegra que volvieras. Vamos a hacer historia sobre dos ruedas.",
  "¡Compadre! Aquí estoy, listo para acompañarte a donde sea.",
  "Qué bueno tenerte de nuevo. ¿Para dónde agarramos hoy?",
  "¡Buenas! Pistero reportándose, listo para la aventura.",
  "Te echaba de menos. No es lo mismo el camino sin ti.",
  "¡Arriba! Cada pedalada cuenta y hoy las vamos a disfrutar todas.",
  "¡Qué gusto! Respira hondo, que la ruta nos espera.",
  "Hola de nuevo. Recuerda: lo lindo no es la meta, es el viaje.",
  "Listo el casco, lista la sonrisa. Vamos a rodar tranquilos.",
  "Bienvenido. Hoy también voy a cuidar cada kilómetro contigo.",
  "Me encanta pedalear contigo. ¿A dónde nos lleva el corazón hoy?",
  "Qué bonito verte. Sea corto o largo el viaje, lo hacemos juntos."
];
function saludoBienvenida(nombre){
  const last=parseInt(localStorage.getItem('lp_saludo')||'-1',10);
  let i=Math.floor(Math.random()*saludosBienvenida.length);
  if(saludosBienvenida.length>1){ let guard=0; while(i===last&&guard<20){ i=Math.floor(Math.random()*saludosBienvenida.length); guard++; } }
  localStorage.setItem('lp_saludo',String(i));
  return saludosBienvenida[i].replace(/NOMBRE/g, nombre||'ciclista');
}
let frasesUsadas = {lento:[], normal:[], rapido:[], parado:[], motivacional:[], profunda:[], ciudad:[], subida:[], bajada:[]};
// EL USUARIO ELIGE CUÁNTO HABLA PISTERO (feedback Inty). Escala TODAS las cadencias de charla.
// callado = habla lo justo (cadencia x2.6) · normal = como siempre · hablador = más seguido (x0.55).
// No afecta lo esencial (saludo, pre-vuelo, control/SOS): esos van igual.
let pisteroCharla = (function(){ try{ return localStorage.getItem('lp_charla')||'normal'; }catch(e){ return 'normal'; } })();
function _charlaMult(){ return pisteroCharla==='callado' ? 2.6 : pisteroCharla==='hablador' ? 0.55 : 1; }
function _charlaLabel(){ return pisteroCharla==='callado'?'Callado':pisteroCharla==='hablador'?'Hablador':'Normal'; }
function updateCharlaBtn(){ var b=document.getElementById('btnCharla'); if(b) b.innerHTML='🗣️ Pistero habla: '+_charlaLabel(); }
function toggleCharla(){
  pisteroCharla = pisteroCharla==='normal' ? 'hablador' : pisteroCharla==='hablador' ? 'callado' : 'normal';
  try{ localStorage.setItem('lp_charla', pisteroCharla); }catch(e){}
  updateCharlaBtn();
  try{ if(typeof h==='function'){ h(pisteroCharla==='callado'?'Voy a hablar solo lo justo.' : pisteroCharla==='hablador'?'Buena, te acompaño más seguido.' : 'Listo, ritmo normal.'); } }catch(e){}
}
try{ if(document.readyState!=='loading'){ setTimeout(updateCharlaBtn,300); } else { document.addEventListener('DOMContentLoaded', function(){ setTimeout(updateCharlaBtn,300); }); } }catch(e){}
let lastFraseTime = 0;
// El diálogo de "parado" (revisar la bici, tomar agua...) necesita SU PROPIO reloj,
// igual que ciudad/carretera lo tienen (tFraseCiudad/kmUltimaFrase). Antes reusaba
// lastFraseTime, que es global a TODAS las categorías: si acababas de escuchar
// cualquier otra frase mientras andabas, tenían que pasar 20 min de silencio total
// desde esa última frase (de cualquier tipo) para que "parado" pudiera hablar — en la
// práctica eso casi nunca se daba salvo al arrancar la ruta, cuando aún no había hablado nada.
let lastFraseParadoTime = 0;
// Frases que manda la comunidad: quedan en revisión (admin) y una vez aprobadas se
// mezclan en el pool "normal" (chileno y neutro) para que Pistero las diga a cualquiera.
let frasesComunidadAprobadas = [];
async function cargarFrasesComunidad(){
  try{
    // 2026-08-23: `where('aprobada','==',true)` filtra, pero NO acota — si la comunidad
    // aporta 3.000 frases aprobadas, esto lee 3.000 documentos en CADA inicio de sesión.
    // Es una colección de la comunidad, no del usuario, así que crece sola. 300 frases ya
    // son muchísimas para que Pistero no se repita; el tope no le quita nada al usuario y
    // le pone techo al gasto para siempre.
    const snap = await db.collection('frasesComunidad').where('aprobada','==',true).limit(300).get();
    frasesComunidadAprobadas = snap.docs.map(function(d){ return d.data().texto; }).filter(Boolean);
    frasesComunidadAprobadas.forEach(function(t){
      if(frasesNormal.indexOf(t)===-1) frasesNormal.push(t);
      if(frasesNeutro.normal.indexOf(t)===-1) frasesNeutro.normal.push(t);
    });
  }catch(e){}
}
const MIN_INTERVALO = 10000;
let navSteps = [], currentStepIndex = 0, lastSpokenStep = -1, routeTotalDistance = 0, routeTotalDuration = 0;
// Recálculo automático si te desvías de la ruta sugerida (como Waze): guardamos el
// destino activo para poder recalcular sin pedírselo de nuevo al usuario, y un
// contador de fixes consecutivos lejos de la ruta para no recalcular por un salto
// puntual del GPS (solo si se sostiene unos segundos, evitando falsas alarmas).
let navDestLat=null, navDestLon=null, navDestName='', navRecalculando=false, navFixesFueraDeRuta=0;
// Freno para zonas rurales sin camino mapeado: si el desvío se sostiene y OSRM no
// logra devolver una ruta que coincida (común fuera de ciudad), sin esto la app
// entraba en bucle recalculando y avisando por voz sin parar. Tras varios intentos
// seguidos, hace una pausa larga y silenciosa antes de volver a intentar.
let navRecalcIntentos=0, navUltimoRecalcTime=0, navRecalcSilencioHasta=0;
const NAV_RECALC_COOLDOWN_MS=22000, NAV_RECALC_MAX_SEGUIDOS=3, NAV_RECALC_BACKOFF_MS=180000;
// Auto-pausa: si estás quieto un buen rato (parada de foto, semáforo largo, comer),
// el reloj del viaje no debería seguir corriendo como si estuvieras pedaleando. Se
// paran ambas cosas (visual + cómputo) al detectar sp===0 y se retoman solas al moverte.
let viajePausedMs=0, viajePausedDesde=null, viajePausaManual=false;
function tiempoActivoMs(){
  if(!tripStartTime) return 0;
  const elapsedTotal=Date.now()-tripStartTime;
  const pausadoAhora=viajePausedDesde?(Date.now()-viajePausedDesde):0;
  return Math.max(0, elapsedTotal-viajePausedMs-pausadoAhora);
}
// Cronómetro visible del dashboard en GPS libre: antes solo existía el reloj de la
// navegación turn-by-turn (navTime); en "GPS libre" (el modo que más se usa, sin
// destino fijado) no había ningún tiempo a la vista mientras pedaleabas. Tickea cada
// segundo de verdad (no solo cuando llega un fix de GPS, que puede tardar) y respeta
// la auto-pausa (tiempoActivoMs ya descuenta el tiempo parado).
let dashCronoInterval=null;
function _formatoCrono(ms){
  const s=Math.floor(ms/1000), mm=Math.floor(s/60)%60, ss=s%60, hh=Math.floor(s/3600);
  return (hh>0?hh+':'+(mm<10?'0':'')+mm:mm)+':'+(ss<10?'0':'')+ss;
}
function _iniciarCronometroDash(){
  const el=document.getElementById('dashCrono'); if(!el) return;
  el.style.display='block'; el.innerHTML='<i class="fas fa-stopwatch"></i> 0:00';
  const c=document.getElementById('dashCronoControles'); if(c) c.style.display='flex';
  clearInterval(dashCronoInterval);
  dashCronoInterval=setInterval(function(){ el.innerHTML='<i class="fas fa-stopwatch"></i> '+_formatoCrono(tiempoActivoMs()); },1000);
}
function _detenerCronometroDash(){
  clearInterval(dashCronoInterval); dashCronoInterval=null;
  const el=document.getElementById('dashCrono'); if(el) el.style.display='none';
  const c=document.getElementById('dashCronoControles'); if(c) c.style.display='none';
}
function _actualizarPausaViaje(sp, badgeId){
  // Si el ciclista puso pausa MANUAL, mandamos nosotros: la auto-pausa por velocidad
  // no debe reanudar sola ni apagar el aviso. Se queda pausado hasta tocar Reanudar.
  if(viajePausaManual){ const elm=document.getElementById(badgeId); if(elm) elm.style.display='inline-flex'; return; }
  const enPausa = (sp===0);
  if(enPausa && !viajePausedDesde){ viajePausedDesde=Date.now(); }
  else if(!enPausa && viajePausedDesde){ viajePausedMs+=(Date.now()-viajePausedDesde); viajePausedDesde=null; }
  const el=document.getElementById(badgeId); if(el) el.style.display=enPausa?'inline-flex':'none';
}
// Pausa/Reanuda el viaje a mano: congela reloj, km y calorías; no recalcula ni cuenta
// el movimiento hecho durante la pausa (empujar la bici, subir a una micro, etc.).
// Reporte real: este botón solo existía en la pantalla de navegación a destino —
// en "GPS libre" (el modo que más se usa, sin destino fijado) no había forma de
// pausar a mano, solo la auto-pausa por velocidad. Ahora un solo botón (y una
// sola función) sirve para las dos pantallas: actualiza ambos botones y ambos
// badges de pausa, así no importa desde cuál pantalla lo tocaste.
function togglePausaViaje(){
  viajePausaManual=!viajePausaManual;
  const btnNav=document.getElementById('btnPausaViaje'), btnDash=document.getElementById('btnPausaDash');
  if(viajePausaManual){
    if(!viajePausedDesde) viajePausedDesde=Date.now();   // congela el tiempo activo
    lastGpsPoint=null;                                    // al reanudar no cuenta el tramo de la pausa
    _gpsBadgeToggle('navPausaBadge', true); _gpsBadgeToggle('dashPausaBadge', true);
    if(btnNav){ btnNav.innerHTML='<i class="fas fa-play"></i> Reanudar'; btnNav.style.background='linear-gradient(135deg,#10b981,#059669)'; }
    if(btnDash){ btnDash.innerHTML='<i class="fas fa-play"></i> Reanudar'; btnDash.style.color='#10b981'; btnDash.style.borderColor='#10b981'; }
    try{ showSpeechBubble('Viaje en pausa'); }catch(e){}
    h('Viaje en pausa. Cuando quieras seguir, toca Reanudar.');
  } else {
    if(viajePausedDesde){ viajePausedMs+=(Date.now()-viajePausedDesde); viajePausedDesde=null; }
    lastGpsPoint=null;
    _gpsBadgeToggle('navPausaBadge', false); _gpsBadgeToggle('dashPausaBadge', false);
    if(btnNav){ btnNav.innerHTML='<i class="fas fa-pause"></i> Pausar'; btnNav.style.background='linear-gradient(135deg,#f59e0b,#d97706)'; }
    if(btnDash){ btnDash.innerHTML='<i class="fas fa-pause"></i> Pausar'; btnDash.style.color=''; btnDash.style.borderColor=''; }
    try{ showSpeechBubble('¡Seguimos!'); }catch(e){}
    h('Seguimos pedaleando.');
  }
}
// Vueltas (lap): marca el tiempo transcurrido desde la última vuelta (o desde el
// inicio si es la primera) — para comparar tramos o hacer series, sin depender de
// segmentos predefinidos en el mapa. Se resetea al iniciar cada viaje nuevo.
let vueltasRegistradas=[];
function marcarVuelta(){
  if(!tripStartTime){ h('Todavía no hay ningún viaje en marcha para marcar una vuelta.'); return; }
  const ahora=tiempoActivoMs();
  const anterior=vueltasRegistradas.length ? vueltasRegistradas[vueltasRegistradas.length-1].totalMs : 0;
  const parcial=ahora-anterior;
  vueltasRegistradas.push({numero:vueltasRegistradas.length+1, totalMs:ahora, parcialMs:parcial});
  const n=vueltasRegistradas.length;
  try{ showSpeechBubble('🏁 Vuelta '+n+': '+_formatoCrono(parcial)); }catch(e){}
  h('Vuelta '+n+' marcada: '+_formatoCrono(parcial)+'. Tiempo total: '+_formatoCrono(ahora)+'.');
}
function verVueltas(){
  if(!vueltasRegistradas.length){ lpAviso('Todavía no marcaste ninguna vuelta en este viaje. Toca "🏁 Vuelta" para registrar la primera.'); return; }
  let html='<div style="max-height:50vh;overflow-y:auto">';
  vueltasRegistradas.slice().reverse().forEach(function(v){
    html+='<div style="display:flex;justify-content:space-between;padding:8px 4px;border-bottom:1px solid #15202e"><span style="color:#9fb3c8">Vuelta '+v.numero+'</span><span style="font-weight:800;font-variant-numeric:tabular-nums">'+_formatoCrono(v.parcialMs)+'</span><span style="color:#7d8ba0;font-variant-numeric:tabular-nums">total '+_formatoCrono(v.totalMs)+'</span></div>';
  });
  html+='</div>';
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-flag-checkered"></i> Vueltas de este viaje';
  document.getElementById('modalContent').innerHTML=html;
  document.getElementById('userModal').classList.add('on');
}
// Reinicia el cronómetro a cero SIN cortar el GPS ni perder distancia/track — para
// cuando quieres empezar a cronometrar de nuevo (ej. terminaste el calentamiento y
// arranca el entreno de verdad) sin tener que apagar y prender el viaje entero.
async function reiniciarCronometro(){
  if(!tripStartTime){ h('Todavía no hay ningún viaje en marcha.'); return; }
  if(!(await lpConfirmar('¿Reiniciar el cronómetro a cero? La distancia y el recorrido NO se pierden, solo el tiempo.'))) return;
  tripStartTime=Date.now(); viajePausedMs=0; viajePausedDesde=null; vueltasRegistradas=[];
  h('Cronómetro reiniciado. La distancia y el recorrido siguen intactos.');
}
let currentUserLocation = null;
let selectedHelmet = 'giro', selectedLens = 'none', selectedSkin = 'cyan', selectedExtras = [];
let selectedPiel = 'pielClara', selectedOjos = 'ojoCafe', selectedLabios = 'labioNatural', selectedVello = 'velloNinguno', selectedPeinado = 'pelado', selectedPanuelo = 'panueloNinguno';
function _lookActual(){ return {piel:selectedPiel, ojos:selectedOjos, labios:selectedLabios, vello:selectedVello, peinado:selectedPeinado, panuelo:selectedPanuelo}; }
