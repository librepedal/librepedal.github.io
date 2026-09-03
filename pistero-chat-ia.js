// ===== Chat con Pistero IA: le manda tu perfil + los hospedajes de la comunidad y
// responde de rutas, mecánica, gastos de viaje y todo lo de la app (por texto y voz). =====
let pisteroHistorial=[];
function _pisteroBurbuja(txt, quien, pensando){
  const cont=document.getElementById('pisteroMsgs'); if(!cont) return null;
  const div=document.createElement('div');
  div.className='pmsg '+(quien==='yo'?'pmsg-yo':'pmsg-pistero')+(pensando?' pensando':'');
  div.innerHTML=(quien==='pistero'?'<b>Pistero:</b> ':'')+escapeHTML(txt);
  cont.appendChild(div); cont.scrollTop=cont.scrollHeight;
  return div;
}
function _pisteroKey(){ return 'lp_pistero_'+(cu||'anon'); }
function _pisteroGuardar(){ try{ localStorage.setItem(_pisteroKey(), JSON.stringify(pisteroHistorial.slice(-40))); }catch(e){} }
function _pisteroCargar(){ try{ const r=localStorage.getItem(_pisteroKey()); pisteroHistorial=r?(JSON.parse(r)||[]):[]; }catch(e){ pisteroHistorial=[]; } }
function pisteroSugerencia(t){ const i=document.getElementById('pisteroInput'); if(i) i.value=t; preguntarPistero(); }
function pisteroNavegar(lugar){ const qd=document.getElementById('quick-dest'); if(qd) qd.value=lugar; if(typeof startQuickTrip==='function') startQuickTrip(); }
// Contexto que Pistero conoce de ti (se manda al Worker en cada pregunta): tu
// actividad real en la app, para personalizar sin preguntarte de nuevo las cosas.
function _pisteroContexto(){
  const c={};
  try{
    c.horaLocal=new Date().getHours();
    // Si va pedaleando AHORA MISMO (no solo "tiene la app abierta"): mismo patrón
    // que ya usa la detección de caídas para leer la velocidad actual (navSpeed
    // durante navegación turn-by-turn, spd en GPS libre). Antes Pistero respondía
    // siempre igual de largo estés parado tomando té o subiendo una cuesta.
    const navActivo=document.getElementById('nav-screen') && document.getElementById('nav-screen').classList.contains('active');
    const elVel=document.getElementById(navActivo?'navSpeed':'spd');
    const velActual=elVel?(parseFloat(elVel.innerText)||0):0;
    c.enMovimiento = (navActivo || (typeof ig!=='undefined'&&ig)) && velActual>=3;
    if(typeof trips!=='undefined'&&trips) c.viajesCompletados=trips.filter(function(t){return t.status==='completed';}).length;
    if(typeof speedReadings!=='undefined'&&speedReadings.length) c.velMediaKmh=+(speedReadings.reduce(function(a,b){return a+b;},0)/speedReadings.length).toFixed(1);
    c.ultimasRutas=rutasLocales().slice(-4).reverse().map(function(r){ return {nombre:r.nombreRuta||null, km:+(r.distance||0).toFixed(1), fecha:new Date(r.startTime).toLocaleDateString()}; });
  }catch(e){}
  return c;
}
// Pistero OBEDECE órdenes: el Worker devuelve etiquetas [ACCION:...] al final de la
// respuesta. Regla anti-invasivo: si TÚ lo pediste (tu mensaje suena a orden), se
// ejecuta al tiro; si fue idea del modelo, queda como botón opcional y tú decides.
const PISTERO_VISTAS_OK={dash:1,map:1,trips:1,routes:1,diario:1,mac:1,gui:1,chat:1,customize:1,stats:1,musica:1,ajustes:1};
const PISTERO_NOMBRES={dash:'Inicio',map:'el Mapa',trips:'Mis viajes',routes:'el Historial de rutas',diario:'la Bitácora',mac:'el Taller',gui:'la CicloGuía',chat:'Social',customize:'tu Perfil',stats:'Estadísticas',musica:'Música',ajustes:'Ajustes'};
// El modelo a veces manda un id "natural" en vez del id EXACTO que le dimos en el
// prompt (dice "perfil" en vez de "customize", "inicio" en vez de "dash") — sin esto,
// la orden se rechazaba en silencio y el ciclista no se enteraba de que no pasó nada.
const PISTERO_ALIAS={inicio:'dash',home:'dash',perfil:'customize',personaje:'customize',social:'chat',amigos:'chat',mapa:'map',taller:'mac',mecanica:'mac',guia:'gui',cicloguia:'gui',hospedaje:'gui',hospedajes:'gui',viajes:'trips','mis viajes':'trips',rutas:'trips',historial:'trips',bitacora:'diario',diario:'diario',estadisticas:'stats',estadistica:'stats'};
function _pisteroResolverVista(arg){
  if(!arg) return null;
  if(PISTERO_VISTAS_OK[arg]) return arg;
  const norm=normalizar(arg);
  if(PISTERO_VISTAS_OK[norm]) return norm;
  return PISTERO_ALIAS[norm]||null;
}
function _pisteroBotonAccion(txt, fn, icon){
  const cont=document.getElementById('pisteroMsgs'); if(!cont) return;
  const wrap=document.createElement('div'); wrap.className='pmsg-acciones';
  const b=document.createElement('button'); b.className='pacc'; if(icon){ b.innerHTML='<i class="fas '+icon+'"></i> '+escapeHTML(txt); } else { b.textContent=txt; } b.onclick=fn;
  wrap.appendChild(b); cont.appendChild(wrap); cont.scrollTop=cont.scrollHeight;
}
function _pisteroObedecer(acciones, pedido){
  if(!acciones||!acciones.length) return;
  const p=normalizar(pedido||'');
  const pidioIr=/(lleva|llevame|llevanos|vamos|navega|ir (a|hasta)|anda|ruta (a|hasta)|guiame|marcame|partamos)/.test(p);
  const pidioAbrir=/(abre|abrir|abreme|muestra|muestrame|ve (a|al)|entra|ensename|dejame en|ponme en)/.test(p);
  const pidioGps=/(gps|graba|grabar|registra|empieza a grabar|deten|detener)/.test(p);
  // "Enséñame a usar X": Pistero conoce la app entera y, en vez de solo describirla en
  // texto, te LLEVA hasta el elemento real con el mismo spotlight del tutorial inicial.
  // Amplio a propósito: "cómo mando un sos", "cómo se usa", "dónde está" son la forma
  // NATURAL de preguntar esto — si se deja muy estricto, la mayoría de las preguntas
  // reales de "cómo hago X" no auto-ejecutan y el usuario tiene que tocar un botón
  // extra para algo que ya pidió explícitamente que le mostraran.
  const pidioEnsenar=/(ensena|ense[ñn]a|muestra|muestrame|^como |^c[oó]mo | como | c[oó]mo |que es|para que sirve|explica|explicame|donde esta|donde encuentro|donde queda|d[oó]nde est[aá]|d[oó]nde encuentro|d[oó]nde queda)/.test(p);
  acciones.slice(0,2).forEach(function(a){
    if(a.tipo==='navegar' && a.arg){
      if(pidioIr){ pisteroNavegar(a.arg); }
      else _pisteroBotonAccion('Iniciar navegación a '+a.arg, function(){ pisteroNavegar(a.arg); }, 'fa-compass');
    } else if(a.tipo==='abrir'){
      const destino=_pisteroResolverVista(a.arg);
      if(!destino) return;
      if(pidioAbrir||pidioIr){ cv(destino); }
      else _pisteroBotonAccion('Abrir '+(PISTERO_NOMBRES[destino]||destino), function(){ cv(destino); }, 'fa-arrow-right');
    } else if(a.tipo==='gps'){
      if(pidioGps){ toggleGPS(); }
      else _pisteroBotonAccion('GPS: grabar mi ruta', function(){ toggleGPS(); }, 'fa-location-dot');
    } else if(a.tipo==='mostrar'){
      const idx=TUTORIAL_TEMAS[normalizar(a.arg||'')];
      if(idx==null) return;
      if(pidioEnsenar||pidioAbrir||pidioIr){ mostrarPasoTutorial(idx); }
      else _pisteroBotonAccion('Muéstramelo en la app', function(){ mostrarPasoTutorial(idx); }, 'fa-hand-pointer');
    }
  });
}
// Pistero que ACTÚA: según lo que pediste, ofrece botones que operan la app.
function _pisteroPintarAcciones(msg){
  const cont=document.getElementById('pisteroMsgs'); if(!cont||!msg) return;
  const acts=[];
  const nav=msg.match(/(?:ll[eé]va(?:me|nos)|vamos|navega|nav[eé]game|ir|ruta|and[aá] )\s+(?:a|hacia|hasta|para)\s+([^.?!\n]{3,40})/i);
  if(nav){ const lugar=nav[1].replace(/\s+(porfa|por favor|plis|ahora)\b.*/i,'').trim(); if(lugar) acts.push({t:'Iniciar navegación a '+lugar, i:'fa-compass', f:function(){ pisteroNavegar(lugar); }}); }
  if(/(hospedaj|alojar|aloj[oa]\b|d[oó]nde\s+(duermo|dormir|alojo)|hostal|camping)/i.test(msg)) acts.push({t:'Ver hospedajes de la comunidad', i:'fa-bed', f:function(){ cv('gui'); }});
  if(/(planific|plan[eé]a|itinerario|viaje de\s+\d|\d+\s*d[ií]as)/i.test(msg)) acts.push({t:'Abrir planificador de viaje', i:'fa-map-location-dot', f:function(){ cv('trips'); }});
  if(!acts.length) return;
  const wrap=document.createElement('div'); wrap.className='pmsg-acciones';
  acts.forEach(function(a){ const b=document.createElement('button'); b.className='pacc'; if(a.i){ b.innerHTML='<i class="fas '+a.i+'"></i> '+escapeHTML(a.t); } else { b.textContent=a.t; } b.onclick=a.f; wrap.appendChild(b); });
  cont.appendChild(wrap); cont.scrollTop=cont.scrollHeight;
}
function abrirPistero(){
  cv('pistero');
  if(!abrirPistero._init){
    abrirPistero._init=true;
    _pisteroCargar();
    if(pisteroHistorial.length){
      pisteroHistorial.slice(-20).forEach(function(m){ _pisteroBurbuja(m.content, m.role==='user'?'yo':'pistero'); });
      _pisteroBurbuja('¡Hola de nuevo! ¿Seguimos donde quedamos? Pregúntame lo que quieras 🚴','pistero');
    } else {
      _pisteroBurbuja('¡Hola! Soy Pistero 🚴. Pregúntame por rutas, arreglos de bici, dónde alojar o cómo planear tu viaje con gastos. ¿En qué te ayudo?','pistero');
    }
  }
  setTimeout(function(){ const i=document.getElementById('pisteroInput'); if(i) i.focus(); },250);
}
async function preguntarPistero(){
  // Candado contra doble envío (pedido de Inty 2026-08-08, "sale otro globo a la
  // derecha"): en Android el botón "enviar" del teclado a veces dispara el keypress
  // dos veces (bug conocido de WebView con Gboard), o el dedo alcanza a tocar también
  // el ✈️ mientras el Enter ya mandó el mensaje — sin este candado, el mismo texto se
  // enviaba dos veces y aparecían dos globos naranjos (del usuario) seguidos.
  if(preguntarPistero._enCurso) return;
  const inp=document.getElementById('pisteroInput'); if(!inp) return;
  const msg=inp.value.trim(); if(!msg) return;
  preguntarPistero._enCurso=true;
  try{
    trackEvent('funcion','chat_pistero');
    inp.value='';
    _pisteroBurbuja(msg,'yo');
    const _msgNorm=normalizar(msg);
    // Consulta escrita sobre peligros en una ruta ("¿hay policías en mi ruta a
    // X?"): mismo criterio que por voz — solo cuenta como consulta con destino
    // explícito o pregunta clara, si no, es un reporte normal.
    {
      const _catConsultaMsg=_detectarReporteVoz(_msgNorm);
      if(_catConsultaMsg){
        const _destinoConsultaMsg=_extraerDestinoConsulta(_msgNorm);
        if(_destinoConsultaMsg || CONSULTA_RUTA_OPENER_RE.test(_msgNorm)){
          const _respConsulta=await consultarPeligrosEnRuta(_catConsultaMsg, _destinoConsultaMsg);
          _pisteroBurbuja(_respConsulta,'pistero'); try{ h(_respConsulta, null, {sinBocadillo:true}); }catch(e){}
          return;
        }
      }
    }
    // Reportes de peligro escritos (pacos, animal atropellado, objeto en la vía,
    // taco, accidente): se resuelven aquí mismo, sin gastar una llamada a la IA —
    // son datos concretos para el mapa, no una conversación.
    const _catReporte=_detectarReporteVoz(_msgNorm);
    if(_catReporte){ const _conf=await reportarPorVozRapido(_catReporte); _pisteroBurbuja(_conf,'pistero'); try{ h(_conf, null, {sinBocadillo:true}); }catch(e){} return; }
    const pensando=_pisteroBurbuja('Pistero está pensando…','pistero',true);
    const hosp=(typeof allHostels!=='undefined'&&allHostels?allHostels:[]).slice(0,12).map(function(hh){
      return {name:hh.name, tipo:hh.tipo, location:hh.location, desc:(hh.desc||'').toString().slice(0,120)};
    });
    const gustos=(typeof selectedHelmet!=='undefined'&&selectedHelmet)?('estilo/casco '+selectedHelmet):'';
    // Perfil que aprende de verdad (VISION-MAESTRA.md "Conocer al usuario de verdad"):
    // hora de salida, si para mucho, esfuerzo real en subidas -- observado, no preguntado.
    // Solo llega texto si hay muestra suficiente (ver pistero-memoria.js), si no va vacío.
    const preferencias=(window.PisteroMemoria?PisteroMemoria.resumenTexto():'');
    const payload={
      mensaje:msg,
      usuario:{ nombre:nombreUsuario||'Ciclista', pais:paisUsuario||'Chile', kmTotal:Math.round((us&&us.di)||0), nivel:(us&&us.n)||'Novato', darma:(us&&us.d)||0, gustos:gustos, preferencias:preferencias, personalidad:pisteroPersonalidad, actividad:actividadTipo },
      contexto:_pisteroContexto(),
      hospedajes:hosp,
      historial:pisteroHistorial.slice(-12)
    };
    try{
      // Con fetch() plano y sin timeout, si el Worker se cuelga (no cae, solo no
      // contesta) la burbuja "Pistero está pensando…" quedaba pegada PARA SIEMPRE —
      // el catch de abajo nunca se disparaba porque la promesa nunca se rechazaba.
      const r=await _fetchT(IA_URL, 25000, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      const data=await r.json();
      let resp=(data&&data.respuesta)?data.respuesta:'Uy, no te cacho bien ahora. ¿Me lo repites?';
      // Separa las etiquetas de acción del texto: no se muestran ni se leen en voz.
      const acciones=[];
      resp=resp.replace(/\[ACCION:([a-z]+)(?:\|([^\]]+))?\]/gi, function(_m,tipo,arg){ acciones.push({tipo:tipo.toLowerCase(), arg:(arg||'').trim()}); return ''; })
        // Red de seguridad: si por lo que sea el Worker deja pasar una etiqueta de
        // herramienta [BUSCAR:...]/[CLIMA:...] sin resolver, nunca debe leerse ni
        // mostrarse tal cual (se ve como "código" en vez de una respuesta normal).
        .replace(/\[(BUSCAR|CLIMA):[^\]]*\]/gi, '')
        .replace(/\s{2,}/g,' ').trim();
      if(!resp && acciones.length) resp='¡Hecho!';
      if(pensando){ pensando.classList.remove('pensando'); pensando.innerHTML='<b>Pistero:</b> '+escapeHTML(resp); }
      else _pisteroBurbuja(resp,'pistero');
      const cont=document.getElementById('pisteroMsgs'); if(cont) cont.scrollTop=cont.scrollHeight;
      pisteroHistorial.push({role:'user',content:msg}); pisteroHistorial.push({role:'pistero',content:resp});
      if(pisteroHistorial.length>40) pisteroHistorial=pisteroHistorial.slice(-40);
      _pisteroGuardar();
      try{ h(resp, null, {sinBocadillo:true}); }catch(e){}
      _pisteroObedecer(acciones, msg);
      if(!acciones.length) _pisteroPintarAcciones(msg);
    }catch(e){
      if(pensando){ pensando.classList.remove('pensando'); pensando.innerHTML='<b>Pistero:</b> '+escapeHTML('Se me cortó la señal. Inténtalo de nuevo en un ratito.'); }
    }
  } finally {
    preguntarPistero._enCurso=false;
  }
}
let pisteroRec=null;
async function pisteroPorVoz(){
  // App instalada: micrófono NATIVO si el APK trae el plugin.
  const _nat=lpPlugin('SpeechRecognition');
  if(_nat&&_nat.start){
    const btn=document.getElementById('pisteroMic'); if(btn) btn.classList.add('grabando');
    try{ pararVoz(); }catch(e){}
    _pausarManosLibres();
    const t=await _micNativoEscuchar();
    if(btn) btn.classList.remove('grabando');
    _reanudarManosLibres();
    if(t){ const st=quitarEcoPistero(t)||t; handleVoiceCommand(st); }
    else _vozNoEntendi();
    return;
  }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ h('En la app escríbeme la pregunta aquí abajo; la voz funciona en Chrome.'); const i=document.getElementById('pisteroInput'); if(i){ try{ i.focus(); }catch(e){} } return; }
  if(!window.isSecureContext){ h('La voz solo funciona desde la página publicada.'); return; }
  try{ pararVoz(); }catch(e){}
  _pausarManosLibres();
  try{
    pisteroRec=new SR(); pisteroRec.lang='es-CL'; pisteroRec.continuous=false; pisteroRec.interimResults=false; pisteroRec.maxAlternatives=1;
    const btn=document.getElementById('pisteroMic'); if(btn) btn.classList.add('grabando');
    pisteroRec.onresult=function(e){ const t=e.results[0][0].transcript; const st=quitarEcoPistero(t)||t; if(st) handleVoiceCommand(st); else _vozNoEntendi(); };
    pisteroRec.onend=function(){ const b=document.getElementById('pisteroMic'); if(b) b.classList.remove('grabando'); _reanudarManosLibres(); };
    pisteroRec.onerror=function(){ const b=document.getElementById('pisteroMic'); if(b) b.classList.remove('grabando'); _reanudarManosLibres(); };
    pisteroRec.start();
  }catch(e){ const b=document.getElementById('pisteroMic'); if(b) b.classList.remove('grabando'); _reanudarManosLibres(); }
}
// 2026-08-20: antes era una sola variable (el ÚLTIMO lugar nada más), así que si la ruta
// pasaba de vuelta por una ciudad ya visitada (ida y vuelta, o límite de zona con ruido de
// GPS), el freno "una vez por zona" ya no aplicaba porque ultimoLugarAnecdota apuntaba a
// OTRA ciudad — y volvía a sonar. Con un Set queda bloqueada CUALQUIER ciudad ya anunciada
// en esta sesión, no solo la inmediatamente anterior.
let lugaresAnecdotaContados=new Set();
function _anecdotasContadas(){ try{ return JSON.parse(localStorage.getItem('lp_anecdotas'))||[]; }catch(e){ return []; } }
function _marcarAnecdota(t){ try{ const a=_anecdotasContadas(); if(a.indexOf(t)===-1){ a.push(t); localStorage.setItem('lp_anecdotas', JSON.stringify(a.slice(-250))); } }catch(e){} }
async function contarAnecdotaDelLugar(clave, full, lat, lon){
  if(!clave || lugaresAnecdotaContados.has(clave)) return; // una sola vez por zona (en esta sesión), sin importar el orden en que se visiten
  lugaresAnecdotaContados.add(clave);
  if(lat==null || lon==null) return;
  try{
    // 1) Wikipedia geosearch: artículos REALES cercanos a tu posición
    const gr=await fetch('https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord='+lat+'%7C'+lon+'&gsradius=10000&gslimit=12&format=json&origin=*');
    const gj=await gr.json();
    const lista=(gj.query&&gj.query.geosearch)||[];
    if(!lista.length) return; // sin datos reales cerca → mejor callar que inventar
    // 2) elegir un lugar que NO se haya contado antes (así en otra sesión/ruta cuenta algo distinto)
    const contadas=_anecdotasContadas();
    let cand=lista.filter(function(x){ return contadas.indexOf(x.title)===-1; });
    if(!cand.length) cand=lista;
    const elegido=cand[Math.floor(Math.random()*Math.min(cand.length,5))]; // entre los más cercanos no contados
    if(!elegido) return;
    // 3) traer el RESUMEN real del artículo
    const sr=await fetch('https://es.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(elegido.title)+'?redirect=true');
    const sj=await sr.json();
    let ext=(sj.extract||'').trim();
    if(!ext || (sj.type&&sj.type.indexOf('disambiguation')!==-1)) return;
    // 4) recortar a ~2 frases para que sea breve
    const frases=ext.split(/(?<=[.!?])\s+/);
    let texto=frases.slice(0,2).join(' ');
    if(texto.length>240) texto=frases[0];
    _marcarAnecdota(elegido.title);
    const intros=['Dato de por aquí:','Fíjate en esto:','Un dato del lugar:','Para que sepas:','Mira qué interesante:'];
    hAmbiente(intros[Math.floor(Math.random()*intros.length)]+' '+texto);
  }catch(e){}
}
// "Cuéntame otra historia de este lugar" / mitos / leyendas / nombre antiguo,
// PEDIDO por voz (a diferencia de contarAnecdotaDelLugar de arriba, que es
// automática y suena una sola vez por zona sin que nadie la pida). Reusa el
// mismo geosearch real de Wikipedia y el mismo registro de "ya contadas" (para
// que "otra" de verdad traiga una distinta), pero SIN el freno de "una vez
// por zona" — si lo pides a propósito, se te da, las veces que quieras
// mientras queden candidatos sin contar cerca tuyo.
async function _pisteroHistoriaLugar(pedirMito){
  const loc=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
  if(!loc){ h('Necesito tu ubicación para buscar la historia de este lugar — activa el GPS y pregúntame de nuevo.'); return; }
  h('Dame un segundo, busco algo interesante de por aquí...');
  try{
    const gr=await fetch('https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord='+loc.lat+'%7C'+loc.lon+'&gsradius=10000&gslimit=15&format=json&origin=*');
    const gj=await gr.json();
    const lista=(gj.query&&gj.query.geosearch)||[];
    if(!lista.length){ h('No encontré nada documentado de este lugar en Wikipedia todavía — andas por zonas poco exploradas, ¡buena señal!'); return; }
    const contadas=_anecdotasContadas();
    let cand=lista.filter(function(x){ return contadas.indexOf(x.title)===-1; });
    if(!cand.length) cand=lista; // ya se contaron todas las cercanas: se repiten (mejor que quedar mudo)
    // Si pidió mito/leyenda específicamente, prioriza un candidato cuyo TÍTULO lo
    // sugiera — Wikipedia no permite filtrar geosearch por contenido, así que esto
    // es lo más certero sin inventar nada; si no hay ninguno así, se avisa honesto.
    let elegido=null, esMitoReal=false;
    if(pedirMito){
      for(let i=0;i<cand.length;i++){ if(/mito|leyenda|legendari[oa]/i.test(cand[i].title)){ elegido=cand[i]; esMitoReal=true; break; } }
    }
    if(!elegido) elegido=cand[Math.floor(Math.random()*Math.min(cand.length,6))];
    if(!elegido) return;
    const sr=await fetch('https://es.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(elegido.title)+'?redirect=true');
    const sj=await sr.json();
    let ext=(sj.extract||'').trim();
    if(!ext || (sj.type&&sj.type.indexOf('disambiguation')!==-1)){ h('No encontré un buen dato de este lugar justo ahora, prueba de nuevo en un rato.'); return; }
    const frases=ext.split(/(?<=[.!?])\s+/);
    let texto=frases.slice(0,3).join(' ');
    if(texto.length>320) texto=frases.slice(0,2).join(' ');
    _marcarAnecdota(elegido.title);
    // 2026-08-20: antes esto desbloqueaba TODO lo ya anunciado (con la variable única no
    // había forma de desbloquear solo el lugar actual). Ahora que ya la pediste a mano,
    // tiene más sentido que la automática NO la repita después — ya la escuchaste.
    const aviso=(pedirMito && !esMitoReal) ? 'No tengo un mito o leyenda específico documentado por aquí, pero mira este dato real: ' : '';
    h(aviso+texto);
  }catch(e){ h('No pude buscar la historia de este lugar ahora mismo, prueba de nuevo en un rato.'); }
}
// Fondo tipo GTA: postal del lugar (imagen de Wikipedia según tu ubicación).
let ultimoFondoLugar='';
function _fondoEl(){ let el=document.getElementById('fondoPostal'); if(!el){ el=document.createElement('div'); el.id='fondoPostal'; document.body.insertBefore(el, document.body.firstChild); } return el; }
function _aplicarFondo(cand,i){
  if(i>=cand.length) return;
  const im=new Image();
  im.onload=function(){ const el=_fondoEl(); el.style.backgroundImage='url("'+cand[i]+'")'; el.classList.add('on'); };
  im.onerror=function(){ _aplicarFondo(cand,i+1); };
  im.src=cand[i];
}
async function fondoDelLugar(lugar,lat,lon){
  if(!lugar || lugar===ultimoFondoLugar) return;
  ultimoFondoLugar=lugar;
  try{
    let titulo=lugar;
    // Nombres de ciudad ambiguos (Santiago, Valencia, Córdoba...) caen en páginas de
    // desambiguación sin foto. Geolocalizamos el artículo real más cercano primero.
    if(lat!=null && lon!=null){
      try{
        const gr=await fetch('https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord='+lat+'%7C'+lon+'&gsradius=10000&gslimit=1&format=json&origin=*');
        const gj=await gr.json();
        const hit=gj.query && gj.query.geosearch && gj.query.geosearch[0];
        if(hit && hit.title) titulo=hit.title;
      }catch(e){}
    }
    let thumb='', orig='';
    async function traer(t){ const r=await fetch('https://es.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(t)+'?redirect=true'); const j=await r.json(); return {thumb:(j.thumbnail&&j.thumbnail.source)||'', orig:(j.originalimage&&j.originalimage.source)||''}; }
    ({thumb,orig}=await traer(titulo));
    if(!thumb && !orig && titulo!==lugar) ({thumb,orig}=await traer(lugar));
    const cand=[];
    if(thumb) cand.push(thumb.replace(/\/\d+px-([^\/]+)$/,'/1280px-$1'));
    if(orig) cand.push(orig);
    if(thumb) cand.push(thumb);
    if(cand.length) _aplicarFondo(cand,0);
  }catch(e){}
}
async function actualizarZona(lat,lon){
  const now=Date.now();
  if(now-zonaLastCheck<90000 && zonaLastPos && calculateDistance(zonaLastPos.lat,zonaLastPos.lon,lat,lon)<300) return;
  zonaLastCheck=now; zonaLastPos={lat:lat,lon:lon};
  try{
    const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=es&zoom=16&lat='+lat+'&lon='+lon);
    const j=await r.json(); const a=j.address||{}; const tipo=((j.type||'')+' '+(j.class||'')).toLowerCase();
    const esCiudad = !/motorway|trunk|primary/.test(tipo) && !!(a.suburb||a.neighbourhood||a.city_district||a.quarter||a.residential||/residential|living_street|pedestrian/.test(tipo));
    if(esCiudad){ zonaActual='ciudad'; ultimaPosCiudad={lat:lat,lon:lon}; }
    else {
      // Recién a 1 km fuera de la ciudad se considera CARRETERA (y arrancan sus mensajes).
      if(zonaActual==='ciudad' && ultimaPosCiudad && calculateDistance(ultimaPosCiudad.lat,ultimaPosCiudad.lon,lat,lon)<1000){ /* aún en zona urbana, mantenemos ciudad */ }
      else { zonaActual='carretera'; }
    }
    const lugar=a.city||a.town||a.village||a.municipality||a.county||'';
    const full=[lugar,a.state,a.country].filter(Boolean).join(', ');
    if(lugar){ contarAnecdotaDelLugar(lugar, full, lat, lon); fondoDelLugar(lugar, lat, lon); }
  }catch(e){}
}
