function limpiarParaVoz(t){
  return String(t).replace(/SOS/g,'ese o ese').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu,'').replace(/\s{2,}/g,' ').trim();
}
function cargarVoces(){ try{ const vs=speechSynthesis.getVoices(); vozPref = vs.find(function(v){return /es(-|_)(CL|419|MX)/i.test(v.lang);}) || vs.find(function(v){return (v.lang||'').toLowerCase().indexOf('es')===0;}) || null; }catch(e){} }
if('speechSynthesis' in window){ cargarVoces(); speechSynthesis.onvoiceschanged = cargarVoces; }
/* 2026-08-24: se saca la restriccion "solo se muestra en v-pistero/v-map". Encontrado
   haciendo QA en vivo: el buscador de destino de INICIO (la pantalla mas usada de toda
   la app) llama lpAviso("Necesito tu GPS") cuando falla -- y como Inicio no es ninguna
   de esas dos vistas, el aviso se tragaba en silencio. El usuario tocaba "Iniciar
   navegacion" y no pasaba absolutamente NADA visible: ni error, ni feedback.
   No es un caso aislado: lpAviso() se llama 98 veces en todo el archivo, y esta funcion
   es la UNICA via visual que tiene -- a diferencia de h() (la voz), que SI llega sin
   importar la pantalla (mostrarBocadillo() es solo la mitad visual de h(), no bloquea
   la mitad hablada). O sea 98 avisos de error quedaban mudos Y ciegos en 13 de las ~15
   pantallas de la app.
   Este limite YA estaba documentado como un problema, no una decision a proposito: existe
   _lpAvisoLogin() (unas lineas mas arriba) especificamente "porque lpAviso() es MUDO"
   fuera de esas dos vistas -- pero ese parche cubre SOLO login, con un window.alert()
   bloqueante que el propio codigo evita a proposito en el resto de la app. El resto de
   las 98 llamadas nunca tuvo parche.
   Por que es seguro sacarlo: #pisteroBubble es position:fixed, hijo directo de <body>,
   z-index:2100 (verificado en vivo) -- no esta anidado dentro de ninguna vista, asi que
   no hay ninguna razon de DOM/CSS para que solo pudiera mostrarse en dos de ellas. Sacar
   la restriccion solo AGREGA visibilidad donde hoy no hay ninguna; no le quita nada a
   las pantallas donde ya funcionaba. */
function mostrarBocadillo(t,ms){ const b=document.getElementById('pisteroBubble'); if(!b) return; const tut=document.getElementById('tutorialOverlay'); if(tut && tut.classList.contains('on')) return; /* en el tutorial solo brillo+voz, sin cuadro de texto */ b.innerText=t; b.classList.add('show'); clearTimeout(b._to);
  // Default proporcional al largo del texto (misma idea que _durEstVoz para la voz, pero
  // sin depender de ella: este bloque se prueba aislado en tests/aviso-visual.test.mjs, no
  // puede asumir que otras funciones existan en ese entorno). Antes era 4.5s fijos siempre
  // -- en una respuesta larga de Pistero el subtítulo desaparecía mucho antes de que
  // terminara de sonar la voz. Piso de 4.5s (no parpadea en textos cortos), techo de 55s.
  const _msDefault=Math.min(55000, Math.max(4500, (t||'').length*75));
  b._to=setTimeout(function(){ b.classList.remove('show'); },ms||_msDefault); }
/* Obtiene un plugin nativo de Capacitor. CLAVE: con la web en vivo (server.url) el
   puente inyectado NO tiene registerPlugin; los plugins viven en Capacitor.Plugins. */
function lpPlugin(nombre){
  if(typeof window.Capacitor==='undefined') return null;
  if(Capacitor.Plugins && Capacitor.Plugins[nombre]) return Capacitor.Plugins[nombre];
  if(typeof Capacitor.registerPlugin==='function'){ try{ return Capacitor.registerPlugin(nombre); }catch(e){} }
  return null;
}
/* Voz NATIVA de Android (motor TTS del sistema). */
const lpTTS = (function(){
  let TTS=null;
  function getTTS(){ if(!TTS){ TTS=lpPlugin('TextToSpeech'); } return TTS; }
  function intentar(t, texto, langs){
    if(!langs.length){ try{ t.speak({text:texto, rate:1.0, pitch:1.05, volume:1.0}); }catch(e){} return; }
    const opts={text:texto, lang:langs[0], rate:1.0, pitch:1.05, volume:1.0, category:'playback'};
    try{ const p=t.speak(opts); if(p&&p.catch){ p.catch(function(){ intentar(t, texto, langs.slice(1)); }); } }
    catch(e){ intentar(t, texto, langs.slice(1)); }
  }
  return {
    disponible:function(){ return !!getTTS(); },
    hablar:function(texto){ const t=getTTS(); if(!t) return; try{ t.stop(); }catch(e){}
      intentar(t, texto, ['es-CL','es-MX','es-ES','es-US','es']); },
    stop:function(){ if(TTS){ try{ TTS.stop(); }catch(e){} } }
  };
})();
function diagnosticoGPS(){
  const info=[];
  const cap=(typeof window.Capacitor!=='undefined');
  const bg=lpPlugin('BackgroundGeolocation');
  info.push('Capacitor (APK): '+(cap?'SÍ':'NO — estás en la web/navegador'));
  info.push('Plugin de segundo plano: '+(bg?'OK ✓':'NO ENCONTRADO'));
  info.push('Grabar con pantalla apagada: '+(lpBackgroundGeo.disponible()?'DISPONIBLE ✓':'NO'));
  info.push('GPS activo ahora: '+((ig||document.getElementById('nav-screen').classList.contains('active'))?'sí':'no'));
  info.push('Mantener pantalla (WakeLock): '+(('wakeLock' in navigator)?'sí':'no'));
  let veredicto;
  if(!cap) veredicto='⚠️ Estás en el NAVEGADOR. Con la pantalla apagada el sistema suspende el GPS; el rastreo real con pantalla apagada SOLO funciona en la APP instalada.';
  else if(!bg) veredicto='⚠️ La APP no trae el plugin de segundo plano. Hay que reconstruir el APK con @capacitor-community/background-geolocation (+ permiso de ubicación en segundo plano).';
  else veredicto='✅ Todo listo: graba con la pantalla apagada.';
  lpAviso('📡 DIAGNÓSTICO GPS\n\n'+info.join('\n')+'\n\n'+veredicto+'\n\n(Sácale una foto y mándamela)');
}
async function diagnosticoVoz(){
  let info=[];
  info.push('Capacitor (motor nativo): '+(typeof window.Capacitor!=='undefined'?'SÍ':'NO — estás en la web, no en el APK'));
  if(typeof window.Capacitor!=='undefined'){
    try{ info.push('Plataforma: '+(Capacitor.getPlatform?Capacitor.getPlatform():'?')); }catch(e){}
    info.push('Capacitor.Plugins: '+(Capacitor.Plugins?Object.keys(Capacitor.Plugins).join(', ').slice(0,80):'no expuesto'));
    let TTS=lpPlugin('TextToSpeech'); info.push('Plugin de voz: '+(TTS?'OK ✓':'NO encontrado'));
    if(TTS){
      try{ const l=await TTS.getSupportedLanguages(); const arr=(l&&l.languages)?l.languages:[]; const es=arr.filter(function(x){return String(x).toLowerCase().indexOf('es')===0;}); info.push('Voces instaladas: '+arr.length); info.push('Voces en español: '+(es.length?es.slice(0,6).join(', '):'NINGUNA (instala voz en español)')); }catch(e){ info.push('Idiomas: '+(e.message||e)); }
      try{ await TTS.speak({text:'Hola, soy Pistero. Prueba de voz.', lang:'es-ES'}); info.push('Reproducción: ejecutada (¿la escuchaste?)'); }catch(e){ info.push('Reproducción ERROR: '+(e.message||e)); }
    }
  } else {
    try{ if('speechSynthesis' in window){ speechSynthesis.speak(new SpeechSynthesisUtterance('Prueba de voz web')); info.push('Voz web probada'); } }catch(e){}
  }
  lpAviso('🔊 DIAGNÓSTICO DE VOZ\n\n'+info.join('\n')+'\n\n(Sácale una foto y mándamela)');
}
/* ===== BOCA ANIMADA: visemas reales, no una curva estirándose verticalmente =====
   Antes "hablar" era un solo <path> de sonrisa estirado en scaleY con CSS keyframes
   a ritmo perfectamente parejo (0.18s, lineal) — se veía plano y mecánico. Ahora se
   cicla por JS entre formas de boca distintas (cerrada, entreabierta, redonda,
   ancha, "o", fruncida) con timing IRREGULAR entre cuadros, que es lo que de
   verdad distingue una boca hablando de una animación robótica. */
const _bocaFrames=[
  {d:'M86 162 Q100 174 114 162', fill:'none', stroke:'#7a4a2a', sw:'3.4', w:6}, // cerrada / reposo
  {d:'M94 168 a6 3 0 1 0 12 0 a6 3 0 1 0 -12 0', fill:'#6b3320', stroke:'#4a2214', sw:'1.2', w:4}, // apenas abierta
  {d:'M91 168 a9 7 0 1 0 18 0 a9 7 0 1 0 -18 0', fill:'#6b3320', stroke:'#4a2214', sw:'1.2', w:3}, // media, redonda
  {d:'M84 167 a16 4 0 1 0 32 0 a16 4 0 1 0 -32 0', fill:'#6b3320', stroke:'#4a2214', sw:'1.2', w:2}, // ancha ("ee")
  {d:'M92 169 a8 10 0 1 0 16 0 a8 10 0 1 0 -16 0', fill:'#6b3320', stroke:'#4a2214', sw:'1.2', w:1}, // redonda grande ("oh")
  {d:'M96 167 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0', fill:'#5a2a1a', stroke:'#4a2214', sw:'1', w:2} // fruncida ("m"/"u")
];
function _bocaAplicar(i){
  const f=_bocaFrames[i];
  document.querySelectorAll('.pboca').forEach(function(p){
    // Cerrada (i===0): usa el color de labios del personaje (data-labios), no un
    // café fijo — así el color elegido en Personalización se respeta también
    // mientras habla, no solo en la pose estática.
    const stroke = (i===0) ? (p.getAttribute('data-labios')||f.stroke) : f.stroke;
    p.setAttribute('d', f.d); p.setAttribute('fill', f.fill); p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', f.sw);
  });
}
function _bocaSiguiente(anterior){
  const pesos=_bocaFrames.map(function(f){return f.w;});
  const total=pesos.reduce(function(a,b){return a+b;},0);
  let r=Math.random()*total, i=0;
  for(; i<_bocaFrames.length-1; i++){ r-=pesos[i]; if(r<=0) break; }
  return (i===anterior && _bocaFrames.length>1) ? _bocaSiguiente(anterior) : i;
}
function _bocaIniciarCiclo(){
  clearTimeout(window._bocaTO);
  let ultimo=0;
  (function cuadro(){
    ultimo=_bocaSiguiente(ultimo);
    _bocaAplicar(ultimo);
    window._bocaTO=setTimeout(cuadro, 65+Math.random()*95); // cadencia irregular: 65-160ms
  })();
}
function _bocaDetener(){ clearTimeout(window._bocaTO); _bocaAplicar(0); }
// Bug real (2026-08-31, reporte de Inty: "no reacciona al cállate"): _pisteroHabla() pausaba
// AQUÍ el reconocimiento continuo de manos libres (_pausarManosLibres, que hace stop() real
// del reconocimiento) mientras Pistero hablaba, y recién lo reanudaba 400ms después de que
// terminara. Pero "cállate" es exactamente la orden que alguien dice MIENTRAS él está
// hablando -para cortarlo-, así que caía justo en la ventana donde el micrófono estaba
// apagado del todo: nunca llegaba a escucharse. Se deja de pausar acá — el mic de manos
// libres se mantiene abierto todo el tiempo; el filtro de "no confundir su propio audio con
// un comando" ahora vive en el handler de resultados (_iniciarEscuchaContinua) y en
// _procesarFraseManosLibres, que mientras vozHablando es true solo dejan pasar el silencio.
function _pisteroHabla(ms){ document.body.classList.add('pistero-hablando'); try{ if(typeof _setExprPistero==='function'){ var _mm=(typeof _pisteroMood==='string'&&_pisteroMood)?('hablando_'+_pisteroMood):'hablando'; _setExprPistero(_mm); } }catch(e){} _bocaIniciarCiclo(); try{ lpMusic.duck(); }catch(e){} clearTimeout(window._phTO); window._phTO=setTimeout(function(){ document.body.classList.remove('pistero-hablando'); _bocaDetener(); try{ lpMusic.unduck(); }catch(e){} }, ms||3000); }
function _pisteroCalla(){ clearTimeout(window._phTO); document.body.classList.remove('pistero-hablando'); _bocaDetener(); try{ lpMusic.unduck(); }catch(e){} try{ _pisteroMood=null; }catch(e){} try{ if(typeof _setExprPistero==='function') _setExprPistero((typeof micOn!=='undefined'&&micOn)?'escuchando':'feliz'); }catch(e){} }

/* ===== REPRODUCTOR LIBRE PEDAL: radios gratis + música propia, con auto-volumen cuando Pistero habla ===== */
var lpMusic=(function(){ // var a propósito: los botones del reproductor (HTML onclick), manos libres y comandos de voz lo llaman desde fuera de este archivo
  const RADIOS=[
    {n:'📻 Groove Salad · chill para rodar',u:'https://ice1.somafm.com/groovesalad-128-mp3'},
    {n:'📻 Indie Pop Rocks · alegre',u:'https://ice1.somafm.com/indiepop-128-mp3'},
    {n:'📻 Beat Blender · electrónica',u:'https://ice1.somafm.com/beatblender-128-mp3'},
    {n:'📻 Boot Liquor · ruta americana',u:'https://ice1.somafm.com/bootliquor-128-mp3'},
    {n:'📻 Metal Detector · a todo pedal',u:'https://ice1.somafm.com/metal-128-mp3'}
  ];
  const audio=new Audio(); audio.preload='none'; audio.crossOrigin='anonymous';
  let lista=RADIOS.slice(), idx=0, propias=false, ducked=false, fadeTO=null;
  const $=function(id){ return document.getElementById(id); };
  function ui(){ const p=$('lpPlayer'),b=$('lpPlayBtn'),t=$('lpTrackName'); if(!p) return; p.classList.toggle('playing',!audio.paused); p.classList.toggle('ducking',ducked&&!audio.paused); if(b) b.innerText=audio.paused?'▶':'⏸'; if(t) t.innerText=(lista[idx]&&lista[idx].n)||'Radio Libre Pedal'; }
  function fadeTo(v,ms){ clearInterval(fadeTO); const desde=audio.volume, pasos=8, dur=(ms||350)/pasos; let i=0; fadeTO=setInterval(function(){ i++; audio.volume=Math.max(0,Math.min(1,desde+(v-desde)*(i/pasos))); if(i>=pasos) clearInterval(fadeTO); },dur); }
  function _revocarPropias(){ if(propias){ lista.forEach(function(t){ if(t.u && t.u.indexOf('blob:')===0){ try{ URL.revokeObjectURL(t.u); }catch(e){} } }); } }
  function cargar(i){ idx=(i+lista.length)%lista.length; const estaba=!audio.paused; audio.src=lista[idx].u; if(estaba||audio.dataset.want==='1'){ play(); } ui(); }
  function play(){
    audio.dataset.want='1';
    // Si Pistero ya está hablando cuando arranca la música (ej: abres el reproductor
    // y le das play justo mientras te saluda), que arranque bajito desde el primer
    // instante — si no, suena a todo volumen un momento antes de que el duck() de
    // _pisteroHabla() alcance a bajarla.
    if(document.body.classList.contains('pistero-hablando')){ ducked=true; audio.volume=0.05; }
    audio.play().then(ui).catch(function(){ const t=$('lpTrackName'); if(t) t.innerText='⚠️ Esta radio no respondió, prueba otra (⏭)'; });
  }
  function pause(){ audio.dataset.want='0'; audio.pause(); ui(); }
  audio.onplay=ui; audio.onpause=ui;
  audio.onerror=function(){ const t=$('lpTrackName'); if(t) t.innerText='⚠️ Sin señal aquí, prueba otra (⏭)'; };
  audio.onended=function(){ if(propias){ cargar(idx+1); play(); } };
  return {
    toggle:function(){ if(!audio.src) cargar(0); if(audio.paused){ play(); } else { pause(); } },
    next:function(){ cargar(idx+1); },
    prev:function(){ cargar(idx-1); },
    play:function(){ if(!audio.src) cargar(0); play(); },
    pause:pause,
    sonando:function(){ return !audio.paused; },
    duck:function(){ if(audio.paused) return; ducked=true; fadeTo(0.05,250); ui(); }, /* 5%: Pistero se escucha clarito sobre la música */
    unduck:function(){ if(!ducked) return; ducked=false; if(!audio.paused) fadeTo(1,700); ui(); },
    // Los blobs de "tu música" (📁) no se liberan solos: si cargas archivos varias
    // veces, o vuelves a radios después de haber cargado tu música, las URLs viejas
    // quedaban vivas en memoria para siempre. Se revocan antes de reemplazar la lista.
    cargarArchivos:function(files){ if(!files||!files.length) return; _revocarPropias(); lista=Array.prototype.map.call(files,function(f){ return {n:'🎵 '+f.name.replace(/\.[^.]+$/,''),u:URL.createObjectURL(f)}; }); propias=true; cargar(0); play(); try{ h('Tu música lista. '+lista.length+' canciones a bordo.'); }catch(e){} },
    radios:function(){ _revocarPropias(); lista=RADIOS.slice(); propias=false; cargar(0); }
  };
})();

/* ===== CALCULADORA DE GASTOS DEL VIAJE ===== */
async function calcularKmRutaPlanificada(){
  try{
    const start=(document.getElementById('trip-start').value||'').trim();
    const puntos=[];
    if(start){ try{ const g0=await geocodeDestino(start); if(g0) puntos.push({lat:g0.lat,lon:g0.lon}); }catch(e){} }
    for(const d of addedDests){
      if(d.lat&&d.lon){ puntos.push({lat:d.lat,lon:d.lon}); }
      else{ try{ const g=await geocodeDestino(d.addr||d.name); if(g) puntos.push({lat:g.lat,lon:g.lon}); }catch(e){} }
    }
    if(puntos.length<2) return null;
    let total=0;
    for(let i=0;i<puntos.length-1;i++){
      const a=puntos[i], b=puntos[i+1];
      const url='https://router.project-osrm.org/route/v1/'+_osrmPerfil()+'/'+a.lon+','+a.lat+';'+b.lon+','+b.lat+'?overview=false';
      const r=await fetch(url); const j=await r.json();
      if(j.code==='Ok' && j.routes && j.routes[0]) total+=j.routes[0].distance/1000;
    }
    return total?Math.round(total):null;
  }catch(e){ return null; }
}
async function toggleGastosPanel(){
  const g=document.getElementById('gastos-panel');
  const abrir = g.style.display==='none' || !g.style.display;
  g.style.display = abrir ? 'block' : 'none';
  if(abrir){
    const kmInput=document.getElementById('gasto-km');
    if(!kmInput.value && addedDests && addedDests.length){
      kmInput.placeholder='Calculando distancia real de tu ruta...';
      const km=await calcularKmRutaPlanificada();
      if(km){ kmInput.value=km; kmInput.placeholder='Kilómetros del viaje (ej: 250)'; h('Calculé '+km+' km reales para tu ruta según tus paradas. Puedes ajustarlo si quieres.'); }
      else { kmInput.placeholder='Kilómetros del viaje (ej: 250)'; }
    }
  }
}
function calcularGastos(){
  const km=Math.max(0,parseFloat(document.getElementById('gasto-km').value)||0);
  const dias=Math.max(1,parseInt(document.getElementById('gasto-dias').value)||1);
  const comida=Math.max(0,parseFloat(document.getElementById('gasto-comida').value)||0);
  const noche=Math.max(0,parseFloat(document.getElementById('gasto-noche').value)||0);
  if(!km){ h('Dime cuántos kilómetros tiene el viaje.'); return; }
  const noches=Math.max(0,dias-1);
  const tComida=comida*dias, tNoche=noche*noches;
  const imprevistos=Math.round((tComida+tNoche)*0.1);
  const total=tComida+tNoche+imprevistos;
  const agua=Math.max(1,Math.round(km*0.06));
  const kmDia=Math.round(km/dias);
  const fmt=function(n){ return Math.round(n).toLocaleString('es'); };
  document.getElementById('gastos-resultado').innerHTML=
    '🍜 Comida ('+dias+(dias===1?' día':' días')+'): <strong>'+fmt(tComida)+'</strong><br>'+
    '🏕️ Alojamiento ('+noches+(noches===1?' noche':' noches')+'): <strong>'+fmt(tNoche)+'</strong><br>'+
    '🔧 Imprevistos (10%): <strong>'+fmt(imprevistos)+'</strong><br>'+
    '💧 Agua total recomendada: <strong>'+agua+' litros</strong><br>'+
    '🚴 Ritmo: <strong>'+kmDia+' km/día</strong>'+(kmDia>120?' <span style="color:var(--g)">— exigente, considera un día más</span>':'')+'<br>'+
    '<span style="color:var(--g);font-weight:800;font-size:0.95rem">TOTAL: '+fmt(total)+'</span>';
  h('Presupuesto listo: '+fmt(total)+' en total, pedaleando '+kmDia+' kilómetros por día.'+(kmDia>120?' Ese ritmo está exigente, capitán.':''));
}

/* ===== PISTERO TRAVIESO: aparece de sorpresa, saluda y se esconde ===== */
(function(){
  const frasesTravieso=["¡Buuu! ¿Me extrañabas?","¿y si salimos a pedalear un rato?","Aquí vigilando que no se oxide la cadena.","Me aburrí de esperar, ¡vamos a rodar!","Revisa el aire de las ruedas","Tócame el micrófono y te llevo donde quieras.","¿Sabías que la primera vuelta en bici de la historia terminó en un árbol? Tú lo haces mejor."];
  let peek=null;
  function crear(){ peek=document.createElement('div'); peek.id='pisteroPeek'; peek.textContent='🚴'; peek.title='¡Pistero!'; peek.onclick=function(){ ocultar(); h('¡Me pillaste! Dime a dónde vamos.'); }; document.body.appendChild(peek); }
  function mostrar(){
    const tut=document.getElementById('tutorialOverlay');
    if(document.hidden||(tut&&tut.classList.contains('on'))||vozOcupada()){ prox(); return; } // ocupado: vuelve más rato
    if(!peek) crear();
    peek.classList.add('peek');
    hAmbiente(frasesTravieso[Math.floor(Math.random()*frasesTravieso.length)]);
    setTimeout(ocultar,8000); prox();
  }
  function ocultar(){ if(peek) peek.classList.remove('peek'); }
  function prox(){ setTimeout(mostrar, 480000+Math.random()*420000); }
  prox();
})();
/* ===== COLA DE VOZ: Pistero nunca se pisa a sí mismo =====
   - h(t): habla, o espera su turno si ya está hablando (cola máx 3). JAMÁS corta la frase en curso.
   - hAmbiente(t): comentario ambiental (bromas, anécdotas, travieso): si Pistero está ocupado, se descarta sin más.
   - hCorta(t): corta lo que suene y habla ya (pasos del tutorial, urgencias). */
var vozCola=[], vozHablando=false; // var a propósito: leidas/escritas desde fuera de este archivo (avisos de peligro/terreno, manos libres, Pistero)
let vozTimerFin=null;
// vozGen: "número de turno" de la voz. Cada frase nueva (o cada corte manual) lo
// sube. Bug real reportado por Inty: "a veces habla la voz nueva y aparece la
// antigua de una mujer" — pasaba porque pausar un audio con play() todavía
// pendiente (pararVoz(), o hCorta() interrumpiendo con una frase nueva) hace que
// ese play() RECHACE con AbortError; el .catch(fallback) de esa frase YA
// cancelada disparaba igual la voz nativa (es-ES, mujer) por encima de la frase
// nueva que ya iba sonando — sin que nada de eso dependiera de si la frase vieja
// seguía siendo la vigente. Cada función de voz ahora guarda el número de turno
// con el que nació y, antes de caer a la siguiente voz de respaldo, comprueba
// que ese turno siga siendo el actual — si ya no lo es, se queda callada.
let vozGen=0;
// Prioridad de voz: los avisos NO se pisan entre sí. Lógica probada en tests/voz-prioridad.test.mjs.
// Niveles (mayor = más importante): ambiente < info < navegación < seguridad.
var PRIO_VOZ = { AMBIENTE:1, INFO:2, NAV:3, SEGURIDAD:4 }; // var a propósito: usada desde avisos de peligro/cofres/ciclistas cerca, fuera de este archivo
let vozPrioActual = 0; // prioridad de lo que suena AHORA (0 = nada)
function decidirVoz(actualPrio, nuevaPrio){
  if(!(actualPrio>0)) return 'interrumpe';            // silencio -> habla ya
  if(nuevaPrio===PRIO_VOZ.AMBIENTE) return 'descarta'; // ambiental nunca espera ni pisa
  if(nuevaPrio>actualPrio) return 'interrumpe';        // más importante -> corta e impone
  return 'encola';                                    // igual o menor -> espera turno
}
var vozMejorada = localStorage.getItem('lp_vozneural')!=='off'; // var a propósito: leida desde fuera de este archivo (botón de UI). voz chilena (Worker Azure) por DEFECTO ENCENDIDA; solo se apaga si el usuario la desactivó (antes arrancaba off -> "volvía la voz antigua" al reinstalar/limpiar localStorage). Fallback a la nativa si no hay red.
let _vozNeuralAudio = null;
var pisteroGenero = localStorage.getItem('lp_genero')||'l'; // var a propósito: leida/escrita desde fuera de este archivo (avatar, voz por archivo, botón de UI). 'l'=Pistero (Lorenzo) / 'c'=Pistera (Catalina)
let VOCES_MANIFEST = null; // índice de frases fijas pre-generadas en voz chilena (Azure), se carga de voces/manifest.json
(function(){ try{ fetch('voces/manifest.json').then(function(r){return r.ok?r.json():null;}).then(function(m){ VOCES_MANIFEST=m; }).catch(function(){}); }catch(e){} })();
function vozOcupada(){ return vozHablando || (typeof micOn!=='undefined' && micOn); }
function pararVoz(){ vozGen++; vozCola=[]; clearTimeout(vozTimerFin); vozHablando=false; vozPrioActual=0; try{ speechSynthesis.cancel(); }catch(e){} try{ lpTTS.stop(); }catch(e){} try{ if(_vozNeuralAudio){ _vozNeuralAudio.pause(); _vozNeuralAudio.onended=_vozNeuralAudio.onerror=_vozNeuralAudio.onloadedmetadata=_vozNeuralAudio.onplaying=null; _vozNeuralAudio=null; } }catch(e){} _pisteroCalla(); }
// Como pararVoz pero SIN borrar la cola: para cuando algo más importante interrumpe pero lo pendiente debe seguir sonando después.
function _cortarActual(){ vozGen++; clearTimeout(vozTimerFin); vozHablando=false; vozPrioActual=0; try{ speechSynthesis.cancel(); }catch(e){} try{ lpTTS.stop(); }catch(e){} try{ if(_vozNeuralAudio){ _vozNeuralAudio.pause(); _vozNeuralAudio.onended=_vozNeuralAudio.onerror=_vozNeuralAudio.onloadedmetadata=_vozNeuralAudio.onplaying=null; _vozNeuralAudio=null; } }catch(e){} }
function h(t, prio){
  prio = prio || PRIO_VOZ.INFO;
  // 3er argumento posicional a propósito, sin nombrarlo en la firma (arguments[2], no
  // "opts"): tests/aviso-visual.test.mjs extrae este bloque buscando el texto exacto
  // "function h(t, prio){" -- cambiar la firma rompe ese extractor. opts.sinBocadillo
  // (2026-09-03, reporte de Inty: "doble diálogo" en la pantalla de Pistero) deja que el
  // llamador se salte el subtítulo flotante cuando el mismo texto YA quedó escrito en el
  // historial de chat visible (#pisteroMsgs) -- ahí el bocadillo es pura redundancia, dos
  // cajas mostrando lo mismo, una encima de otra. Se decide en el punto de llamada (ver
  // preguntarPistero), NUNCA aquí por vista activa: h() no sabe ni debe saber qué pantalla
  // hay al frente -- eso lo sigue resolviendo mostrarBocadillo() igual que siempre para
  // cualquier otro llamador (voz por manos libres, avisos, tutorial).
  const opts = arguments[2];
  if(!(opts && opts.sinBocadillo)) mostrarBocadillo(t);
  if(!vozActiva) return;
  const limpio = limpiarParaVoz(t);
  if(!limpio) return;
  const item = {t:t, limpio:limpio, prio:prio};
  const q = decidirVoz(vozPrioActual, prio);
  if(q==='descarta') return;                              // ambiental con algo sonando: no molesta
  if(q==='encola'){ if(vozCola.length<4) vozCola.push(item); return; } // igual/menor: espera su turno
  if(vozHablando) _cortarActual();                        // más importante: corta lo actual (sin perder la cola) y habla ya
  _reproducirVoz(item);
}
function hAmbiente(t){ if(typeof micOn!=='undefined'&&micOn) return; h(t, PRIO_VOZ.AMBIENTE); } // broma/anécdota: calla si te está escuchando; nunca pisa nada
function hCorta(t){ h(t, PRIO_VOZ.NAV); }        // navegación/tutorial: corta lo menos importante, pero NO pisa seguridad ni otro giro
function hUrgente(t){ try{ _pisteroMood='enojado'; }catch(e){} h(t, PRIO_VOZ.SEGURIDAD); } // caída/SOS: manda sobre todo
function _durEstVoz(txt){ return Math.min(55000, Math.max(1800, txt.length*75)); }
// 2026-08-15: helper para no repetir el bug del tutorial (algo visual/sonoro
// disparado con un setTimeout de tiempo fijo, cortando la voz de Pistero a
// mitad de frase). h()/_reproducirVoz() ponen vozHablando=true de forma
// SINCRONICA al llamar h(), asi que esperar este flag es seguro llamando la
// funcion justo despues de h(). Tope de seguridad por si vozHablando queda
// pegado en true por algun error de otro lado.
/* Espera a que Pistero termine de hablar y recién ahí sigue. El respiro de
   600ms no es adorno: sin él la esfera se abría EXACTO en la última sílaba del
   saludo y se sentía atropellado (lo notó Inty el 2026-08-17). Una persona
   deja pasar un instante entre que termina de hablar y hace lo siguiente. */
function _esperarFinVoz(cb, maxEsperaMs, respiroMs){
  var limite=Date.now()+(maxEsperaMs||20000);
  var respiro=(respiroMs==null)?600:respiroMs;
  (function _chk(){
    if(!vozHablando || Date.now()>limite){ setTimeout(cb, respiro); return; }
    setTimeout(_chk, 300);
  })();
}
function _reproducirVoz(item){
  const miGen=++vozGen; // turno de esta frase — ver nota junto a "let vozGen" más arriba
  vozHablando=true;
  vozPrioActual = item.prio || PRIO_VOZ.INFO; // qué tan importante es lo que suena ahora
  const durEst=_durEstVoz(item.limpio);
  mostrarBocadillo(item.t, durEst+600);
  _pisteroHabla(durEst);
  clearTimeout(vozTimerFin);
  /* Voz chilena (Lorenzo / Catalina). Orden: 1º el MP3 ya grabado, 2º Azure en vivo,
     y solo al final la voz del navegador.
     OJO con la red: antes TODO este bloque estaba detrás de `navigator.onLine`, así que
     un bajón de señal a mitad de ruta mandaba a Pistero a la voz vieja del navegador —
     reportado por Inty (2026-07-20): "por ahí se anda colando la voz que teníamos
     antes... en algunos momentos cambia la voz". Pero las frases fijas son ARCHIVOS
     LOCALES (voces/*.mp3) que el service worker guarda tras oírlas una vez: no necesitan
     internet. Solo la voz EN VIVO lo necesita, y solo ella debe depender de la red.
     Además `navigator.onLine` miente seguido (dice que no hay red cuando sí, y al revés),
     así que mientras menos cosas cuelguen de él, mejor. */
  if(vozMejorada){
    // v7.80: voz por ARQUETIPO (clips SLR71 chilenos en voces/<arq>/<id>.mp3).
    // v8.06: DESACTIVADA la capa de voces por arquetipo (SLR71) — se colaban voces distintas por frase.
    // v8.48 (2026-08-14): REACTIVADA con ElevenLabs (voces-el/), un mp3 FIJO pregenerado por
    // frase+género+arquetipo. Ver voz-elevenlabs.js.
    // 2026-08-16 (pedido de Inty, "la voz elegida manda en TODA la app"): se bajó la
    // prioridad del pregrabado a "respaldo" porque el catálogo de ENTONCES no cubría el
    // banco genérico (poolPais: motivacional, frases por modo, etc.) — esas frases sin
    // pregrabado sonaban con Azure/voz nativa mientras las de FRASES_ARQ sonaban con el
    // pregrabado, mezclando timbre a mitad de conversación.
    // 2026-09-03 (costo real, pedido de Inty): recalentar en vivo TODO el catálogo de
    // FRASES_ARQ+FRASES_SISTEMA cada vez que el caché de 24h expira (Cache-Control:
    // max-age=86400 en worker-ia/worker.js) proyecta gastar varias veces el presupuesto
    // MENSUAL completo de voz (ver COORDINACION-IA/EN-USO.md, análisis con números
    // reales). El pregrabado de esas dos fuentes SÍ está indexado por arquetipo real
    // (scripts/gen-voces-elevenlabs.js genera cada mp3 con el voice_id del arquetipo
    // exacto de esa frase — el MISMO mapa VOZ_ARQ que usa el worker en vivo), así que
    // usarlo primero no reintroduce el bug de 2026-08-16: no hay mezcla porque ambas
    // fuentes (pregrabado y en vivo) usan la voz del mismo arquetipo. Vuelve a tener
    // prioridad SOLO si la frase está en el manifest -- lo que no está ahí (motivacional,
    // frases por modo, tips de ruta, banco por país) sigue generándose en vivo exactamente
    // igual que hoy, sin cambio de comportamiento ni riesgo de mezcla.
    const _idEL = (typeof VOCES_MANIFEST_EL!=='undefined') && VOCES_MANIFEST_EL && VOCES_MANIFEST_EL.map && VOCES_MANIFEST_EL.map[item.t];
    const _id = VOCES_MANIFEST && VOCES_MANIFEST.map && VOCES_MANIFEST.map[item.t];
    if(_idEL && typeof _vozArchivoEL==='function'){
      vozTimerFin=setTimeout(_vozSiguiente, 12000);
      _vozArchivoEL(item, durEst, _idEL, miGen);
      return;
    }
    vozTimerFin=setTimeout(_vozSiguiente, 12000);
    _vozElevenRuntime(item, durEst, miGen, false, { idEL:_idEL, idAz:_id });
    return;
  }
  vozTimerFin=setTimeout(_vozSiguiente, Math.round(durEst*1.4)+800); // respaldo con margen: solo actúa si el motor se quedó pegado
  _vozNativaOWeb(item, durEst);
}
function _vozNativaOWeb(item, durEst){ try{ if(_vozNeuralAudio){ _vozNeuralAudio.pause(); _vozNeuralAudio.onplaying=_vozNeuralAudio.onended=_vozNeuralAudio.onerror=_vozNeuralAudio.onloadedmetadata=null; _vozNeuralAudio=null; } }catch(e){}
  clearTimeout(vozTimerFin); vozTimerFin=setTimeout(_vozSiguiente, Math.round((durEst||_durEstVoz(item.limpio))*1.4)+800);
  if(lpTTS.disponible()){ lpTTS.hablar(item.limpio); return; } // nativa: avanza con el tiempo estimado
  if(!('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel(); // limpia estados zombis del motor (no hay nada nuestro sonando en este punto)
    const u = new SpeechSynthesisUtterance(item.limpio);
    u.lang='es-ES';
    // La voz nativa (respaldo sin red) también respeta la personalidad: antes usaba un tono
    // fijo para todos, así que sin red los 12 arquetipos sonaban idénticos. Se parte de la
    // misma base (1.05/1.08) y se le suma la prosodia del arquetipo, con tope para que
    // nunca suene roto. (2026-07-21, sesión 2)
    const _pr=PERSONALIDAD_PROSODIA[pisteroPersonalidad]||PERSONALIDAD_PROSODIA.cercano;
    u.rate=Math.max(0.6,Math.min(1.6, 1.05 + (parseInt(_pr.rate,10)||0)/100));
    u.pitch=Math.max(0.6,Math.min(1.6, 1.08 + (parseInt(_pr.pitch,10)||0)/100));
    if(vozPref) u.voice=vozPref;
    u.onend=u.onerror=function(){ clearTimeout(vozTimerFin); _vozSiguiente(); };
    speechSynthesis.speak(u);
  }catch(e){ clearTimeout(vozTimerFin); _vozSiguiente(); }
}
function _vozArchivo(item, durEst, id, miGen){
  // Reproduce la frase fija ya grabada en voz chilena (Azure): voces/{genero}{id}.mp3.
  // Si el archivo no carga (404, red), cae a la voz chilena EN VIVO (no a la gringa).
  try{ if(_vozNeuralAudio){ _vozNeuralAudio.pause(); _vozNeuralAudio.onplaying=_vozNeuralAudio.onended=_vozNeuralAudio.onerror=_vozNeuralAudio.onloadedmetadata=null; _vozNeuralAudio=null; } }catch(e){} try{ speechSynthesis.cancel(); }catch(e){} try{ lpTTS.stop(); }catch(e){} 
  let cayo=false;
  // miGen!==vozGen: esta frase ya no es la vigente (se cortó o ya empezó la
  // siguiente) — no caer a la voz de respaldo por algo que ya nadie está esperando.
  // A la nativa y no a Azure (2026-08-16): estos archivos pregrabados ya son EL RESPALDO
  // de la voz en vivo, asi que si tambien fallan no queda nada mejor que intentar — mandarlos
  // de vuelta a Azure hacia rebotar la cadena entre motores sin ganar nada.
  const fallback=function(){ if(cayo || miGen!==vozGen) return; cayo=true; _vozNativaOWeb(item, durEst); };
  try{
    const a=new Audio('voces/'+pisteroGenero+id+'.mp3');
    const _pr=_rateArq(); try{ a.playbackRate=_pr; }catch(_e2){}
    _vozNeuralAudio=a;
    a.onloadedmetadata=function(){ if(isFinite(a.duration)&&a.duration>0){ var ms=a.duration*1000/_pr; clearTimeout(vozTimerFin); _pisteroHabla(ms+300); vozTimerFin=setTimeout(_vozSiguiente, Math.round(ms)+2500); } };
    a.onplaying=function(){ cayo=true; }; // ya suena: comprometidos con este audio, no dispares un segundo (evita voz duplicada)
    a.onended=function(){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); };
    a.onerror=function(){ if(cayo){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); } else { fallback(); } };
    const p=a.play(); if(p&&p.catch) p.catch(function(){ fallback(); });
  }catch(e){ fallback(); }
}
function _vozArchivoArq(item, durEst, arq, id, miGen){
  // Frase fija en la voz chilena del arquetipo (SLR71): voces/{arq}/{id}.mp3.
  try{ if(_vozNeuralAudio){ _vozNeuralAudio.pause(); _vozNeuralAudio.onplaying=_vozNeuralAudio.onended=_vozNeuralAudio.onerror=_vozNeuralAudio.onloadedmetadata=null; _vozNeuralAudio=null; } }catch(e){} try{ speechSynthesis.cancel(); }catch(e){} try{ lpTTS.stop(); }catch(e){} 
  let cayo=false;
  // A la nativa y no a Azure (2026-08-16): estos archivos pregrabados ya son EL RESPALDO
  // de la voz en vivo, asi que si tambien fallan no queda nada mejor que intentar — mandarlos
  // de vuelta a Azure hacia rebotar la cadena entre motores sin ganar nada.
  const fallback=function(){ if(cayo || miGen!==vozGen) return; cayo=true; _vozNativaOWeb(item, durEst); };
  try{
    const a=new Audio('voces/'+arq+'/'+id+'.mp3');
    _vozNeuralAudio=a;
    a.onloadedmetadata=function(){ if(isFinite(a.duration)&&a.duration>0){ clearTimeout(vozTimerFin); _pisteroHabla(a.duration*1000+300); vozTimerFin=setTimeout(_vozSiguiente, Math.round(a.duration*1000)+2500); } };
    a.onplaying=function(){ cayo=true; };
    a.onended=function(){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); };
    a.onerror=function(){ if(cayo){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); } else { fallback(); } };
    const p=a.play(); if(p&&p.catch) p.catch(function(){ fallback(); });
  }catch(e){ fallback(); }
}
// VOCES CHILENAS DE ELEVENLABS (2026-08-16). Azure murió (suscripción vencida: el
// worker devolvía 502 con code:401) y con él se fue la voz chilena. En vez de renovar
// Azure, Pistero pasa a hablar SIEMPRE por ElevenLabs, con voces chilenas de verdad:
//   Pistera -> Victoria (chilena profesional)
//   Pistero -> Cristian Cornejo (chileno)
// Se mandan por `&voz=` en la petición, así no hay que tocar el worker (es UNO solo,
// `librepedal-ia`, sirve Chile y el resto de la región — no existe un worker
// "-sudamerica" separado, ver git log de worker-ia/wrangler.toml, commit 90114fb).
// Para cambiar de voz alcanza con reemplazar el id de acá: el catálogo completo se
// consulta en `<worker>/?voces=1`.
const VOZ_EL_F = 'Fd38GRHtJllY0CuguAy9'; // Victoria — Chilean Professional Fresh
const VOZ_EL_M = 'ClNifCEVq1smkl4M3aTk'; // Cristian Cornejo — Spanish Chilean
// Voz EN VIVO con acento propio por país (expansión, 2026-09-03). Hoy vacío a propósito:
// todo país sin entrada acá cae al par chileno de arriba, mismo comportamiento de
// siempre (Argentina y el resto ya tienen jerga propia en frasesFlavor, pero se habla
// con acento chileno hasta que haya un voice_id real — ver investigación en
// LibrePedal-privado/PLAN-LANZAMIENTO-<PAIS>.md). Agregar {m:'id_masc', c:'id_fem'} acá
// con la clave del país (paisFrases(), ej. 'ar') apenas haya un voice_id confirmado.
const VOZ_EL_POR_PAIS = {};
function _vozELid(){
  const par = VOZ_EL_POR_PAIS[paisFrases()];
  if (par) return (pisteroGenero==='l') ? par.m : par.c;
  return (pisteroGenero==='l') ? VOZ_EL_M : VOZ_EL_F;
}
// Velocidad de habla del arquetipo elegido, traducida al parámetro de ElevenLabs.
// La base es 0.92 y no 1.0 a propósito: Pistero le habla a alguien pedaleando, con
// viento y ruido de calle — se entiende mejor un poco más pausado. Sobre esa base se
// aplica el ajuste del arquetipo (el "sabio" habla más lento, el "loco" más rápido),
// acotado al rango que acepta ElevenLabs para que ninguna personalidad quede ininteligible.
function _velArq(){
  var base=0.92;
  try{
    var pr=PERSONALIDAD_PROSODIA[pisteroPersonalidad]||PERSONALIDAD_PROSODIA.cercano;
    var n=parseInt(pr.rate,10)||0;          // ej. '-18%' -> -18
    var v=base*(1+n/200);                   // se aplica a la mitad: el % estaba pensado
                                            // para Azure, que exagera menos que ElevenLabs
    return Math.max(0.75, Math.min(1.1, Math.round(v*100)/100));
  }catch(e){ return base; }
}
function _vozAzureRuntime(item, durEst, miGen, _yaProboEleven){
  // Voz chilena Azure EN VIVO para frases dinámicas (nombre, calles, números, chat).
  // Va por el Worker (/aztts, la llave está segura en el servidor). Cachea en Cloudflare,
  // así frases repetidas no vuelven a pegarle a Azure.
  //
  // ORDEN DE RESPALDO (arreglado 2026-08-16): si Azure falla, se prueba ElevenLabs ANTES
  // de rendirse con la voz nativa. Antes caía directo a la nativa, y eso fue exactamente
  // lo que pasó: la suscripción de Azure venció (el worker devolvía 502 con code:401) y,
  // como los usuarios chilenos van por Azure, TODOS terminaban escuchando la voz nativa
  // de Android — lo que Inty describió como "volvió la voz antigua". ElevenLabs estuvo
  // vivo todo el tiempo, solo que nadie lo intentaba. `_yaProboEleven` corta el rebote
  // infinito entre los dos motores.
  let cayo=false;
  const fallback=function(){ if(cayo || miGen!==vozGen) return; cayo=true;
    if(!_yaProboEleven) _vozElevenRuntime(item, durEst, miGen, true);
    else _vozNativaOWeb(item, durEst);
  };
  try{
    const pros=PERSONALIDAD_PROSODIA[pisteroPersonalidad]||PERSONALIDAD_PROSODIA.cercano;
    const a=new Audio(IA_URL+'/?aztts='+encodeURIComponent(item.limpio.slice(0,480))+'&g='+pisteroGenero+'&rate='+encodeURIComponent(pros.rate)+'&pitch='+encodeURIComponent(pros.pitch));
    _vozNeuralAudio=a;
    a.onloadedmetadata=function(){ if(isFinite(a.duration)&&a.duration>0){ clearTimeout(vozTimerFin); _pisteroHabla(a.duration*1000+300); vozTimerFin=setTimeout(_vozSiguiente, Math.round(a.duration*1000)+2500); } };
    a.onplaying=function(){ cayo=true; }; // ya suena: no dispares un segundo audio aunque llegue un error tardío
    a.onended=function(){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); };
    a.onerror=function(){ if(cayo){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); } else { fallback(); } };
    const p=a.play(); if(p&&p.catch) p.catch(function(){ fallback(); });
  }catch(e){ fallback(); }
}
function _vozElevenRuntime(item, durEst, miGen, _yaProboAzure, _respaldo){
  // Voz EN VIVO por ElevenLabs — es el motor principal de Pistero desde el 2026-08-16.
  // Va por el worker (/eltts, la llave vive en el servidor) y le manda la voz elegida en
  // `&voz=`. Cachea en Cloudflare, así una frase repetida no vuelve a pegarle a ElevenLabs.
  //
  // Escalera de respaldo, en orden: (1) el mp3 PREGRABADO de esa misma frase, si existe —
  // sirve sin red y suena mucho mejor que la nativa; (2) Azure, por si algún día vuelve;
  // (3) la voz nativa del teléfono, último recurso. `_yaProboAzure` corta el rebote
  // infinito entre motores, y `_respaldo` trae los ids de los catálogos pregrabados.
  let cayo=false;
  const fallback=function(){ if(cayo || miGen!==vozGen) return; cayo=true;
    const r=_respaldo||{};
    if(r.idEL && typeof _vozArchivoEL==='function') _vozArchivoEL(item, durEst, r.idEL, miGen);
    else if(r.idAz && typeof _vozArchivo==='function') _vozArchivo(item, durEst, r.idAz, miGen);
    else if(!_yaProboAzure) _vozAzureRuntime(item, durEst, miGen, true);
    else _vozNativaOWeb(item, durEst);
  };
  try{
    // Va por IA_URL (worker propio) y NO por IA_URL_NEUTRA: ese otro vive en una cuenta
    // de Cloudflare distinta, sin acceso desde acá, así que no se le podían agregar
    // cosas como la velocidad. Los dos sirven /eltts igual.
    // `vel` traduce la velocidad del arquetipo (PERSONALIDAD_PROSODIA, de -18% a +22%)
    // al parámetro de ElevenLabs. Sin esto la voz salía siempre a la velocidad por
    // defecto —rápida— y un tester reportó que no se le entendía a Pistero.
    const a=new Audio(IA_URL+'/?eltts='+encodeURIComponent(item.limpio.slice(0,480))+'&g='+pisteroGenero+'&voz='+encodeURIComponent(_vozELid())+'&vel='+_velArq());
    _vozNeuralAudio=a;
    a.onloadedmetadata=function(){ if(isFinite(a.duration)&&a.duration>0){ clearTimeout(vozTimerFin); _pisteroHabla(a.duration*1000+300); vozTimerFin=setTimeout(_vozSiguiente, Math.round(a.duration*1000)+2500); } };
    a.onplaying=function(){ cayo=true; }; // ya suena: no dispares un segundo audio aunque llegue un error tardío
    a.onended=function(){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); };
    a.onerror=function(){ if(cayo){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); } else { fallback(); } };
    const p=a.play(); if(p&&p.catch) p.catch(function(){ fallback(); });
  }catch(e){ fallback(); }
}
function _vozNeural(item, durEst){
  let cayo=false;
  const fallback=function(){ if(cayo) return; cayo=true; _vozNativaOWeb(item, durEst); };
  const ctrl=new AbortController();
  const to=setTimeout(function(){ try{ctrl.abort();}catch(e){} fallback(); }, 6000); // >6s = mejor la voz nativa ya
  fetch(IA_URL+'?tts='+encodeURIComponent(item.limpio.slice(0,480)), {signal:ctrl.signal})
    .then(function(r){ return r.json(); })
    .then(function(d){
      clearTimeout(to);
      if(cayo) return;
      if(!d || !d.audio){ fallback(); return; }
      try{
        const a=new Audio('data:audio/wav;base64,'+d.audio);
        _vozNeuralAudio=a;
        a.onloadedmetadata=function(){ // recalibra animación de boca, ducking y respaldo al largo REAL del audio
          if(isFinite(a.duration) && a.duration>0){
            clearTimeout(vozTimerFin);
            _pisteroHabla(a.duration*1000+300);
            vozTimerFin=setTimeout(_vozSiguiente, Math.round(a.duration*1000)+2500);
          }
        };
        a.onended=a.onerror=function(){ clearTimeout(vozTimerFin); _vozNeuralAudio=null; _vozSiguiente(); };
        const p=a.play(); if(p&&p.catch) p.catch(function(){ fallback(); });
      }catch(e){ fallback(); }
    })
    .catch(function(){ clearTimeout(to); fallback(); });
}
function _vozSiguiente(){
  // Corta cualquier audio que siga sonando/cargando de la frase anterior antes de avanzar.
  // Bug real (2026-08-30, reporte de Inty "se cuelan las voces, unas sobre otras"): cuando
  // este avance lo dispara el timer de seguridad de 12s de _reproducirVoz() (la voz en vivo
  // -Azure/ElevenLabs- tarda en cargar por señal débil, típico pedaleando), el <audio> viejo
  // seguía vivo de fondo sin pausar y podía terminar de cargar y arrancar a sonar TARDE,
  // superpuesto con la frase siguiente que este mismo _vozSiguiente() ya puso a sonar.
  try{ if(_vozNeuralAudio){ _vozNeuralAudio.pause(); _vozNeuralAudio.onended=_vozNeuralAudio.onerror=_vozNeuralAudio.onloadedmetadata=_vozNeuralAudio.onplaying=null; _vozNeuralAudio=null; } }catch(e){}
  try{ speechSynthesis.cancel(); }catch(e){}
  try{ lpTTS.stop(); }catch(e){}
  vozHablando=false; vozPrioActual=0;
  // saca el de MÁS prioridad (no el primero): un aviso importante no espera detrás de uno menor
  let idx=-1, mejor=-1;
  for(let i=0;i<vozCola.length;i++){ const p=vozCola[i].prio||PRIO_VOZ.INFO; if(p>mejor){ mejor=p; idx=i; } }
  const sig = idx>=0 ? vozCola.splice(idx,1)[0] : null;
  /* La frase siguiente ya salió de la cola pero todavía no suena: durante esos 350 ms el
     estado decía "silencio" y NADIE la protegía.
     Auditoría del 2026-07-20: si en esa ventana entraba otra frase —hasta una broma
     ambiental—, `decidirVoz(0, prio)` respondía 'interrumpe' fuera cual fuera su prioridad,
     `_reproducirVoz` hacía `clearTimeout(vozTimerFin)` y **mataba el temporizador de una
     frase que ya no estaba en ninguna cola**: se perdía para siempre. Podía tragarse un
     aviso de seguridad o una instrucción de giro.
     Se deja la prioridad de la frase comprometida ANUNCIADA durante la pausa, así el bus
     la respeta como si ya estuviera sonando. */
  if(sig){
    vozPrioActual = sig.prio || PRIO_VOZ.INFO;
    vozTimerFin=setTimeout(function(){ _reproducirVoz(sig); },350); // pausa natural entre frases
  }
  else { _pisteroCalla(); }
}
function toggleVoz(){
  vozActiva=!vozActiva;
  localStorage.setItem('lp_voz', vozActiva?'on':'off');
  const b=document.getElementById('vozBtn');
  if(b) b.innerHTML='<i class="fas fa-volume-'+(vozActiva?'high':'xmark')+'"></i> Voz: '+(vozActiva?'ON':'OFF');
  if(vozActiva) h("Voz activada. Te acompaño en el camino.");
  else pararVoz();
}
function toggleVozNeural(){
  vozMejorada=!vozMejorada;
  localStorage.setItem('lp_vozneural', vozMejorada?'on':'off');
  const b=document.getElementById('vozNeuralBtn');
  if(b) b.innerHTML='<i class="fas fa-wand-magic-sparkles"></i> Voz mejorada: '+(vozMejorada?'ON':'OFF');
  pararVoz(); // corta SIEMPRE lo que esté sonando antes de confirmar — si no, la voz vieja y la nueva se encimaban (sonaba duplicada)
  if(vozMejorada){ if(!vozActiva){ vozActiva=true; localStorage.setItem('lp_voz','on'); } h("Voz mejorada activada. Así me escucho ahora, ¿mejor así?"); }
  else h("Voz mejorada desactivada, vuelvo a la voz de siempre.");
}
function toggleGenero(){
  pisteroGenero = (pisteroGenero==='l') ? 'c' : 'l';
  localStorage.setItem('lp_genero', pisteroGenero);
  const b=document.getElementById('generoBtn');
  const esP = pisteroGenero==='l';
  if(b) b.innerHTML='<i class="fas fa-'+(esP?'person':'person-dress')+'"></i> Guía: '+(esP?'Pistero':'Pistera');
  pararVoz();
  h(esP ? 'Ahora soy Pistero, tu compañero de ruta.' : 'Ahora soy Pistera, tu compañera de ruta.');
}
