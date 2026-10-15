/* ===== UN SOLO MAPA — etapa 1: buscar y dejar puntos =====
   Maqueta aprobada por Inty el 2026-10-15 (disenos-ui/un-solo-mapa/maqueta.html).
   Antes había tres mapas: el chico de "Viaje rápido" ("No lo encuentro: elegir en el mapa"), el
   "Mapa" y el de navegación. Y dejar un punto de interés estaba escondido: solo desde el "+" del
   Mapa, con un abanico que se cerraba solo a los 6 s, sin la opción "punto de interés", y
   mantener apretado el mapa solo ofrecía "Navegar aquí".
   Ahora, en el Mapa:
   - Arriba, "¿A dónde vamos?" (el mismo #quick-dest de siempre: startQuickTrip, la voz y
     pisteroNavegar siguen funcionando igual). Abajo, "Grabar un paseo".
   - Mantener apretado cualquier lugar → hoja con "Ir aquí" y "Dejar un punto aquí". La hoja no
     se cierra sola. El pin se puede arrastrar para afinar el lugar.
   - "+" deja un punto donde estás, con un toque.
   - Seis tipos claros: punto de interés, agua, mirador, servicio, peligro, control. Peligro,
     servicio y control muestran una segunda fila chica con los subtipos de siempre.
   - Sin cuenta completa, en vez del error técnico, se ofrece entrar con Google.
   Etapa 2 (pendiente): navegar sobre este mismo mapa en vez del mapa aparte de navegación. */

// Tipos de la hoja: clave del reporte (REPORTE_CATS, reportes.js) y subtipos opcionales.
const MU_TIPOS=[
  {k:'interes',  l:'Punto de interés', fa:'star',                 c:'#a855f7'},
  {k:'agua',     l:'Agua',             fa:'droplet',              c:'#2bc4b4'},
  {k:'mirador',  l:'Mirador',          fa:'camera',               c:'#3b82f6'},
  {k:'util',     l:'Servicio',         fa:'store',                c:'#f59e0b', subs:['util','taller','alojamiento']},
  {k:'critico',  l:'Peligro',          fa:'triangle-exclamation', c:'#ef4444', subs:['critico','objeto','animal','accidente','taco']},
  {k:'policia',  l:'Control',          fa:'shield-halved',        c:'#3b82f6'}
];
const MU_LARGO_MS=550; // mantener apretado

/* Pura (tests/mapa-unico.test.mjs): ¿puede esta sesión dejar puntos? Las reglas de Firestore
   exigen cuenta real (signedInReal: no anónima). */
function muPuedePublicar(usuario){ return !!(usuario && !usuario.isAnonymous); }
// Pura: texto de "dónde" para la hoja ("a 1,2 km de ti").
function muTextoDistancia(m){
  if(m==null || !isFinite(m)) return '';
  if(m<50) return 'donde estás';
  if(m<1000) return 'a '+(Math.round(m/10)*10)+' m de ti';
  return 'a '+(Math.round(m/100)/10).toString().replace('.', ',')+' km de ti';
}

let _muLugar=null, _muPin=null, _muTipo=null, _muSub=null, _muLargoT=null, _muIni=null, _muEnganchado=false;

function _muYo(){ return (typeof currentUserLocation!=='undefined' && currentUserLocation) || ((typeof us!=='undefined' && us && us.la!=null)?{lat:us.la, lon:us.lo}:null); }
function _muDondeTexto(lugar){
  const yo=_muYo();
  return (yo && typeof calculateDistance==='function') ? muTextoDistancia(calculateDistance(yo.lat, yo.lon, lugar.lat, lugar.lon)) : 'el punto que marcaste';
}
function _muPonerPin(lugar){
  if(typeof mp==='undefined' || !mp) return;
  try{
    if(!_muPin){
      const el=document.createElement('div'); el.className='mu-pin';
      el.innerHTML='<svg width="34" height="42" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 29s9-9.3 9-16A9 9 0 1 0 3 13c0 6.7 9 16 9 16z" fill="#ff6a2b" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="12.5" r="3.4" fill="#fff"/></svg>';
      _muPin=new maplibregl.Marker({element:el, anchor:'bottom', draggable:true});
      _muPin.on('dragend', function(){ const c=_muPin.getLngLat(); _muLugar={lat:c.lat, lon:c.lng}; _muActualizarLugares(); });
    }
    _muPin.setLngLat([lugar.lon, lugar.lat]).addTo(mp);
  }catch(e){}
}
function _muQuitarPin(){ if(_muPin){ try{ _muPin.remove(); }catch(e){} } }
function _muActualizarLugares(){
  const t=_muLugar?_muDondeTexto(_muLugar):'';
  const a=document.getElementById('muLugarMenu'), b=document.getElementById('muLugarPunto');
  if(a) a.textContent=t?('Lugar marcado · '+t):''; if(b) b.textContent=t?('Se publica en el pin · '+t+' · puedes arrastrarlo'):'';
}
function _muHoja(cual){
  ['muHojaMenu','muHojaPunto'].forEach(function(id){ const h=document.getElementById(id); if(h) h.hidden=(id!==cual); });
}
function muCerrar(){ _muHoja(null); _muQuitarPin(); _muLugar=null; }

/* ---- Mantener apretado ---- */
let _muAbiertoEn=0;
function muAbrirMenu(lugar){
  _muAbiertoEn=Date.now();
  _muLugar=lugar; _muPonerPin(lugar); _muActualizarLugares(); _muHoja('muHojaMenu');
  const ay=document.getElementById('muAyuda'); if(ay) ay.hidden=true;
  try{ localStorage.setItem('lp_mu_ayuda_vista','1'); }catch(e){}
}
function muIrAqui(){
  if(!_muLugar) return;
  const l=_muLugar; muCerrar();
  if(typeof irAlPuntoYNavegar==='function') irAlPuntoYNavegar(l.lat, l.lon, 'este punto');
}
function muAbrirPunto(){ if(!_muLugar) return; _muActualizarLugares(); _muElegir(null); _muHoja('muHojaPunto'); }
// "+": un punto donde estás, sin buscar en el mapa.
async function muDejarPuntoAqui(){
  let yo=_muYo();
  if(!yo && typeof getCurrentLocation==='function'){ try{ await getCurrentLocation(); }catch(e){} yo=_muYo(); }
  if(!yo){ lpAviso('Necesito tu GPS para dejar el punto donde estás. También puedes mantener apretado el lugar en el mapa.'); return; }
  _muLugar={lat:yo.lat, lon:yo.lon}; _muPonerPin(_muLugar); muAbrirPunto();
}

/* ---- Hoja "¿Qué hay aquí?" ---- */
function _muPintarTipos(){
  const c=document.getElementById('muCats'); if(!c || c.childElementCount) return;
  c.innerHTML=MU_TIPOS.map(function(t){
    return '<button type="button" class="mu-cat" style="--c:'+t.c+'" data-k="'+t.k+'" aria-pressed="false" onclick="_muElegir(\''+t.k+'\')"><i class="fas fa-'+t.fa+'" aria-hidden="true"></i>'+t.l+'</button>';
  }).join('');
}
function _muElegir(k){
  _muPintarTipos();
  _muTipo=k; _muSub=k;
  document.querySelectorAll('#muCats .mu-cat').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.k===k)); });
  const t=MU_TIPOS.find(function(x){ return x.k===k; });
  const subs=document.getElementById('muSubs');
  if(subs){
    if(t && t.subs){
      subs.innerHTML=t.subs.map(function(s){ const rc=(typeof REPORTE_CATS!=='undefined')&&REPORTE_CATS[s]; return '<button type="button" class="mu-sub" data-s="'+s+'" aria-pressed="'+(s===_muSub)+'" onclick="_muElegirSub(\''+s+'\')">'+escapeHTML(rc?rc.l:s)+'</button>'; }).join('');
      subs.hidden=false;
    } else { subs.hidden=true; subs.innerHTML=''; }
  }
  const p=document.getElementById('muPublicar');
  if(p){ p.disabled=!k; p.textContent=k?('Publicar '+t.l.toLowerCase()):'Elige qué hay aquí'; }
}
function _muElegirSub(s){
  _muSub=s;
  document.querySelectorAll('#muSubs .mu-sub').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.s===s)); });
}
async function muPublicar(){
  if(!_muSub || !_muLugar) return;
  const u=(typeof firebase!=='undefined' && firebase.auth)?firebase.auth().currentUser:null;
  if(!muPuedePublicar(u)){
    if(await lpConfirmar('Para dejar puntos, entra con tu cuenta de Google. Así tu aporte queda a tu nombre y nadie puede llenar el mapa de basura.\n\n¿Entrar ahora?')){
      if(typeof _entrarConGoogle==='function') _entrarConGoogle();
    }
    return;
  }
  const nota=(document.getElementById('muNota')||{}).value||'';
  const lugar=_muLugar;
  const p=document.getElementById('muPublicar'); if(p){ p.disabled=true; p.textContent='Publicando…'; }
  const ok=(typeof publicarPuntoMapa==='function') ? await publicarPuntoMapa(_muSub, nota.trim(), lugar) : false;
  if(ok){ const n=document.getElementById('muNota'); if(n) n.value=''; muCerrar(); }
  else if(p){ p.disabled=false; _muElegir(_muTipo); }
}

/* ---- Grabar un paseo, desde el mapa ---- */
function muGrabar(){ if(typeof toggleGPS==='function') toggleGPS(); setTimeout(_muGrabarEstado, 400); }
function _muGrabarEstado(){
  const t=document.getElementById('muGrabarTxt'), b=document.getElementById('muGrabar'); if(!t) return;
  const grabando=(typeof ig!=='undefined' && ig);
  t.textContent=grabando?'Detener grabación':'Grabar un paseo';
  if(b) b.classList.toggle('mu-grabando', grabando);
}

/* ---- Enganche al mapa (lo llama mapa-render.js cuando el mapa carga) ---- */
function muEnganchar(map){
  if(!map || _muEnganchado) return; _muEnganchado=true;
  _muPintarTipos();
  // Escritorio y Android: el navegador manda "contextmenu" con clic derecho o al mantener apretado.
  map.on('contextmenu', function(e){ clearTimeout(_muLargoT); muAbrirMenu({lat:e.lngLat.lat, lon:e.lngLat.lng}); });
  // Respaldo táctil: algunos WebView no mandan contextmenu al mantener apretado.
  map.on('touchstart', function(e){
    clearTimeout(_muLargoT);
    if(!e.originalEvent || e.originalEvent.touches.length!==1) return;
    _muIni=e.point;
    const ll=e.lngLat;
    _muLargoT=setTimeout(function(){ muAbrirMenu({lat:ll.lat, lon:ll.lng}); }, MU_LARGO_MS);
  });
  map.on('touchmove', function(e){ if(_muIni && e.point && Math.hypot(e.point.x-_muIni.x, e.point.y-_muIni.y)>10) clearTimeout(_muLargoT); });
  ['touchend','touchcancel','dragstart','zoomstart'].forEach(function(ev){ map.on(ev, function(){ clearTimeout(_muLargoT); }); });
  // Un toque corto en el mapa cierra la hoja (no se cierra sola). El "click" que llega al soltar
  // un mantener-apretado no cuenta.
  map.on('click', function(){
    if(Date.now()-_muAbiertoEn<700) return;
    if(!document.getElementById('muHojaMenu').hidden || !document.getElementById('muHojaPunto').hidden) muCerrar();
  });
  setInterval(_muGrabarEstado, 2000); // el paseo también se puede iniciar/detener desde otras pantallas
  let vista=false; try{ vista=localStorage.getItem('lp_mu_ayuda_vista')==='1'; }catch(e){}
  if(!vista){ const ay=document.getElementById('muAyuda'); if(ay){ ay.hidden=false; setTimeout(function(){ ay.hidden=true; }, 9000); } }
  _muGrabarEstado();
}
