/* ===== MAPA COMUNITARIO: "Reportar en Ruta" (público, agrupado por zona) ===== */
/* 2026-07-20 — Inty: "para dejar un local o negocio aparece un pan, muy genérico como
   los otros iconos" + "le falta simplificar los puntos de interés". Las dos cosas eran
   la misma: 10 categorías planas, y CINCO de ellas (crítico, animal, objeto, taco,
   accidente) son lo mismo — un peligro. Por eso se sentía largo y genérico.
   Ahora cada categoría declara su GRUPO y el selector se dibuja agrupado: el ciclista
   elige primero QUÉ TIPO de cosa reporta (4 grupos) y recién ahí el detalle.
   Las CLAVES no cambian a propósito: los reportes ya guardados en Firestore siguen
   valiendo. Cambiar las claves habría dejado huérfano todo el mapa comunitario. */
const REPORTE_GRUPOS={
  peligro:{l:'⚠️ Un peligro',   h:'Algo que puede hacerte daño ahora'},
  servicio:{l:'🛠️ Algo que sirve', h:'Dónde comer, dormir, cargar agua o arreglar la bici'},
  lugar:{l:'📍 Un lugar',       h:'Vale la pena parar o saberlo antes'},
  control:{l:'👮 Control policial', h:'Fiscalización en la ruta'}
};
var REPORTE_CATS={ // var a propósito: leida desde fuera de este archivo (renderPoiCats, avisos de ruta, selector de categoría)
  critico:{g:'peligro',e:'⚠️',fa:'triangle-exclamation',l:'Peligro en el camino',c:'#ef4444',h:'Perros sueltos, camino cortado, sin agua'},
  accidente:{g:'peligro',e:'🚑',fa:'car-burst',l:'Accidente',c:'#dc2626',h:'Choque o atropello reciente en la vía'},
  objeto:{g:'peligro',e:'🪨',fa:'road-barrier',l:'Objeto en la vía',c:'#f97316',h:'Piedra, fierro, rama u otro objeto atravesado'},
  animal:{g:'peligro',e:'🐕',fa:'paw',l:'Animal en la vía',c:'#a8a29e',h:'Perro suelto, o animal muerto que puede sorprenderte'},
  taco:{g:'peligro',e:'🚙',fa:'traffic-light',l:'Taco / congestión',c:'#eab308',h:'Tráfico detenido o muy lento'},
  util:{g:'servicio',e:'🏪',fa:'store',l:'Negocio o picada',c:'#f59e0b',h:'Almacén, café, comida al paso, agua gratis'},
  taller:{g:'servicio',e:'🔧',fa:'screwdriver-wrench',l:'Taller de bicis',c:'#22d3ee',h:'Dónde arreglar o inflar, y si atiende ciclistas'},
  alojamiento:{g:'servicio',e:'🏕️',fa:'tent',l:'Dónde dormir',c:'#10b981',h:'Campings, hospedajes, acampada libre y precios'},
  mirador:{g:'lugar',e:'📸',fa:'mountain-sun',l:'Mirador',c:'#3b82f6',h:'Spots para detenerse y registrar el paisaje'},
  superficie:{g:'lugar',e:'🛣️',fa:'road',l:'Estado del camino',c:'#8b5cf6',h:'Asfalto, ripio o tierra — y qué tan exigente está'},
  policia:{g:'control',e:'👮',fa:'shield-halved',l:'Control policial',c:'#3b82f6',h:'Carabineros o fiscalización en la ruta'}
};
/* Ícono VISUAL de una categoría de reporte: Font Awesome a color (a medida, no emoji).
   Cae al emoji si faltara el campo 'fa'. El emoji (c.e) se mantiene SOLO donde Pistero
   lo dice por voz (ahí el ícono no sirve). 2026-08-14. */
function _repIco(c){ return (c&&c.fa)?('<i class="fas fa-'+c.fa+'" style="color:'+(c.c||'currentColor')+'"></i>'):((c&&c.e)||'📍'); }
// Vigencia de cada categoría de peligro para los avisos proactivos: un taco de
// ayer ya no sirve de nada (y podría hasta desviar mal), pero un objeto tirado
// en la vía puede seguir ahí días después. Cada una expira a su propio ritmo.
const REPORTE_VIGENCIA_MS={policia:3*3600000, taco:2*3600000, accidente:6*3600000, animal:24*3600000, objeto:48*3600000, critico:72*3600000};
// Modelo Waze (pedido de Inty): un reporte NO se quita del mapa por reloj — se queda
// hasta que la comunidad diga "ya no está". Con 2 desmentidos ("no hay nadie") desaparece
// para todos. La vigencia de arriba solo se usa para los AVISOS proactivos de voz (Pistero
// no anda gritando un control policial de hace 3 horas), pero el pin sigue en el mapa.
const REPORTE_DESMENTIDO_UMBRAL=2;
function reporteVisible(r){ return ((r&&r.desmentidoPor||[]).length) < REPORTE_DESMENTIDO_UMBRAL; }
// Edad para el aviso proactivo: cada "sigue ahí" reinicia el reloj (igual que Waze),
// así un peligro que la gente sigue confirmando no se apaga solo.
function _reporteEdadMs(r){
  const base=(r.lastConfirm&&r.lastConfirm.seconds)?r.lastConfirm.seconds:((r.ts&&r.ts.seconds)?r.ts.seconds:null);
  return base==null?null:(Date.now()-base*1000);
}
// Reportes de PELIGRO por voz o texto: sin soltar el manubrio ni el volante, y
// sin tener que abrir ningún formulario. Cada categoría tiene su propio patrón
// de habla natural chilena + el texto que queda en el mapa + la confirmación
// que Pistero dice de vuelta (con gracia, no un "reporte enviado" seco). Si
// alguien quiere contar más detalle, "Reportar en Ruta" sigue disponible.
const REPORTE_VOZ={
  policia:{regex:/\b(pacos?|tombos?|carabineros?|polic[ií]as?|control policial|control de carabineros|fiscalizaci[oó]n|ret[eé]n)\b/, texto:'Control policial reportado por la comunidad.', confirma:'Anotado, ojo con los pacos. Gracias por el dato, colega.'},
  animal:{regex:/\banimal(es)?\s+(muerto|atropellado)|\b(perro|gato|vaca|caballo|zorro)\s+(muerto|atropellado)|\bcarro[ñn]a\b/, texto:'Animal atropellado en la vía, cuidado al pasar.', confirma:'Qué pena, gracias por avisar. Ya lo dejé marcado para que otros bajen la velocidad ahí.'},
  objeto:{regex:/\b(objeto|piedra|fierro|palo|escombro|rama|vidrio)s?\s+(en la (v[ií]a|pista|calzada|carretera|calle|camino)|tirad[oa]|atravesad[oa])|hay algo (tirado|atravesado)/, texto:'Objeto en la vía que puede ser peligroso.', confirma:'Marcado. Ese tipo de sorpresas en el camino no perdonan, buen ojo.'},
  taco:{regex:/\btaco\b|\bcongesti[oó]n\b|atochamiento|tr[aá]fico (pesado|parado|detenido|colapsado)/, texto:'Taco reportado por la comunidad.', confirma:'Anotado el taco. Con este dato, el resto se ahorra el mal rato.'},
  accidente:{regex:/\baccidente\b|\bchoque\b|\batropell\w*|volc[oó] un auto/, texto:'Accidente reciente en la vía, extremar precaución.', confirma:'Marcado con prioridad. Ojalá estén todos bien — gracias por avisar, así el resto va con más cuidado.'}
};
function _detectarReporteVoz(texto){
  if(!texto) return null;
  for(const cat in REPORTE_VOZ){ if(REPORTE_VOZ[cat].regex.test(texto)) return cat; }
  return null;
}
async function reportarPorVozRapido(cat){
  const info=REPORTE_CATS[cat], voz=REPORTE_VOZ[cat];
  if(!info||!voz) return 'No reconocí ese tipo de aviso.';
  let loc=currentUserLocation || (us&&us.la!=null?{lat:us.la,lon:us.lo}:null);
  if(!loc) return 'Necesito tu ubicación para dejar el aviso. Activa el GPS y cuéntame de nuevo.';
  try{
    let comuna='Mi zona';
    try{ const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=json&accept-language=es&zoom=12&lat='+loc.lat+'&lon='+loc.lon); const j=await r.json(); const a=j.address||{}; comuna=a.city||a.town||a.village||a.municipality||a.county||a.state||'Mi zona'; }catch(e){}
    await db.collection('reportes').add({cat:cat, text:voz.texto, user:cu, nombre:nombreUsuario, lat:loc.lat, lon:loc.lon, comuna:comuna, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()});
    _ganarDarma(15); au(); if(typeof sincronizarStats==='function') sincronizarStats();
    return voz.confirma;
  }catch(err){ return 'No se pudo enviar el aviso, inténtalo de nuevo en un rato.'; }
}
// ===== Consulta de peligros en una RUTA concreta ("Pistero, ¿hay policías en mi
// ruta a Valparaíso?"). OJO con las expectativas: no existe ninguna fuente de
// datos policiales en vivo (ni pública ni gratuita) — lo que SÍ tenemos es el
// mapa comunitario (reportesData), igual que Waze funciona a punta de reportes
// de otros usuarios, no de una cámara satelital. La respuesta siempre es
// honesta sobre esa limitación: dice lo que la comunidad reportó, y si no hay
// nada, aclara que eso NO es garantía de que esté despejado.
const REPORTE_LABEL_VOZ={policia:'control policial', animal:'animal en la vía', objeto:'objeto en la vía', taco:'taco', accidente:'accidente'};
// Requiere un destino explícito ("...hasta/hacia/a X") o una de estas frases
// de pregunta clara — así "hay pacos en el camino" (una frase declarativa
// normal, sin destino) sigue yendo al reporte rápido de siempre, y no se
// confunde con una consulta.
// var a propósito: usada desde fuera de este archivo (comandos de voz)
var CONSULTA_RUTA_OPENER_RE=/\b(sabes si hay|dime si hay|av[ií]same si hay|cu[eé]ntame si hay|hay o no hay|habr[ai]|hab[ií]a)\b/;
function _extraerDestinoConsulta(t){
  const m=t.match(/(?:hasta|hacia|\ba\b)\s+([^,.]+)$/);
  return (m && m[1]) ? limpiarDestino(m[1]) : null;
}
async function _obtenerRutaGeometria(startLat,startLon,destLat,destLon){
  const url='https://router.project-osrm.org/route/v1/'+_osrmPerfil()+'/'+startLon+','+startLat+';'+destLon+','+destLat+'?overview=full&geometries=geojson';
  const resp=await _fetchT(url, 15000);
  const data=await resp.json();
  if(data.code!=='Ok'||!data.routes||!data.routes.length) return null;
  return {coords: data.routes[0].geometry.coordinates.map(function(c){ return [c[1],c[0]]; })};
}
async function consultarPeligrosEnRuta(categoria, destinoTexto){
  const label=REPORTE_LABEL_VOZ[categoria]||categoria;
  let coords, etiquetaRuta;
  if(destinoTexto){
    if(!currentUserLocation) return 'Necesito tu ubicación para revisar la ruta. Activa el GPS y pregúntame de nuevo.';
    h('Dame un segundo, reviso los reportes de la comunidad en tu ruta a '+destinoTexto+'...');
    let dest; try{ dest=await geocodeDestino(destinoTexto); }catch(e){ dest=null; }
    if(!dest) return 'No encontré "'+destinoTexto+'". Dime el destino con más detalle (ciudad o región).';
    let geo; try{ geo=await _obtenerRutaGeometria(currentUserLocation.lat,currentUserLocation.lon,dest.lat,dest.lon); }catch(e){ geo=null; }
    if(!geo) return 'No pude calcular la ruta a '+destinoTexto+' ahora mismo.';
    coords=geo.coords; etiquetaRuta='a '+destinoTexto;
  } else if(typeof rutaLatLngs!=='undefined' && rutaLatLngs && rutaLatLngs.length){
    coords=rutaLatLngs; etiquetaRuta='en tu ruta';
  } else {
    return '¿A qué destino? Dime "hay '+label+' en mi ruta a" y el lugar, o pregúntame mientras vas navegando.';
  }
  const ahora=Date.now();
  const vig=REPORTE_VIGENCIA_MS[categoria]||24*3600000;
  const encontrados=reportesData.filter(function(r){
    if(r.cat!==categoria || r.lat==null || r.lon==null) return false;
    if(!reporteVisible(r)) return false; // la comunidad ya lo desmintió
    const ms=_reporteEdadMs(r);
    if(ms!=null && ms>vig) return false;
    // Consulta puntual bajo pedido (no un chequeo por cada fix del GPS), así que
    // no hay apuro por saltar puntos: revisa el trazado completo para no dejar
    // huecos de cobertura en tramos rectos donde OSRM pone pocos vértices.
    for(let i=0;i<coords.length;i++){ if(calculateDistance(coords[i][0],coords[i][1],r.lat,r.lon)<=600) return true; }
    return false;
  });
  if(!encontrados.length) return 'No tengo reportes de la comunidad de '+label+' '+etiquetaRuta+'. Ojo, esto es lo que otros ciclistas han marcado, no una garantía de que esté despejado — igual anda atento.';
  encontrados.sort(function(a,b){ return ((b.ts&&b.ts.seconds)||0)-((a.ts&&a.ts.seconds)||0); });
  const masReciente=encontrados[0];
  const hace=tiempoTranscurrido(masReciente.ts);
  return 'Sí, la comunidad reportó '+encontrados.length+' '+(encontrados.length>1?'avisos':'aviso')+' de '+label+' '+etiquetaRuta+'. El más reciente fue '+hace+(masReciente.comuna?(' cerca de '+masReciente.comuna):'')+'. Anda con cuidado.';
}
// ===== Aviso PROACTIVO de peligros: Pistero avisa ANTES de llegar, no después.
// Mismo patrón que avisarPuntosCercanos() (agua/mirador/hospedaje) pero para los
// reportes de peligro de la comunidad, con vigencia por categoría (ver arriba). =====
var reportesData=[], reportesAvisoRelevantes=[], reportesAvisados=new Set(); // var a propósito: leidas/escritas desde fuera de este archivo (aviso de superficie en ruta, reset al iniciar viaje)
const REPORTE_AVISO_MARGEN_DEG=0.01;
function _calcularReportesAvisoRelevantes(){
  const ahora=Date.now();
  reportesAvisoRelevantes=reportesData.filter(function(r){
    const vig=REPORTE_VIGENCIA_MS[r.cat]; if(!vig) return false;
    if(!r.lat||!r.lon) return false;
    if(!reporteVisible(r)) return false; // la comunidad ya dijo que no está: no avisar
    const ms=_reporteEdadMs(r); // cuenta desde el último "sigue ahí" si lo hubo
    return ms==null || ms<=vig; // sin timestamp aún (recién publicado, servidor no confirmó) cuenta como vigente
  });
}
// Frase chistosa del control policial (guiño a "El Club de la Comedia": Sergio Freire).
// Alterna entre las 2 tomas torpes; ambas están pre-grabadas en voz chilena (manifest).
let _policiaAlterna=0;
const _POLICIA_CHISTOSO=[
  "Buenos días, buenas tardes… control a tres kilómetros.",
  "Eeeh… buenos días, buenas tardes… hay control a tres kilómetros, no má."
];
let _distPrevRep={};
function avisarReportesCercanos(lat,lon,speed){
  if(!reportesAvisoRelevantes.length || !vozActiva || vozOcupada() || vozCola.length) return;
  // El control policial le interesa sobre todo al motorizado (va rápido): se avisa
  // con 3 km de anticipación en moto/auto, más cerca en bici/caminata.
  const esMoto=(typeof actividadTipo!=='undefined' && actividadTipo==='moto');
  for(let i=0;i<reportesAvisoRelevantes.length;i++){
    const r=reportesAvisoRelevantes[i];
    const esPolicia=(r.cat==='policia');
    const margen=(esPolicia&&esMoto)?0.04:REPORTE_AVISO_MARGEN_DEG; // ~4 km de descarte barato para policía en moto
    if(Math.abs(r.lat-lat)>margen || Math.abs(r.lon-lon)>margen) continue;
    const id=r.id||(r.lat+','+r.lon+','+r.cat);
    if(reportesAvisados.has(id)) continue;
    const dist=calculateDistance(lat,lon,r.lat,r.lon);
    // Mismo fix que los puntos: el umbral era un círculo fijo (sin dirección) y avisaba
    // igual DESPUÉS de pasar el peligro. Ahora escala con la velocidad y solo avisa si te
    // estás acercando — un peligro que ya dejaste atrás no se avisa, se calla.
    const _vms=Math.max(2,(speed||0)/3.6);
    const umbral=esPolicia?(esMoto?3000:600):Math.max(400,_vms*20);
    const _prev=_distPrevRep[id]; _distPrevRep[id]=dist;
    const _acercandose=(_prev===undefined)||(dist<_prev);
    if(dist<=umbral && _acercandose){
      reportesAvisados.add(id);
      if(esPolicia && esMoto && pisteroPersonalidad==='humoristico'){
        h(_POLICIA_CHISTOSO[(_policiaAlterna++)%_POLICIA_CHISTOSO.length]); // frase torpe pre-grabada, alternada
      } else if(esPolicia){
        const km=dist/1000;
        h('Atento, control de carabineros reportado por la comunidad '+(km>=1?('a '+km.toFixed(1).replace('.',',')+' kilómetros'):'a unos metros')+'. Tranquilo y a lo legal.');
      } else {
        const c=REPORTE_CATS[r.cat];
        h('Ojo, '+c.e+' '+c.l.toLowerCase()+' reportado por la comunidad a unos metros: '+r.text);
      }
      return;
    }
  }
}
// "Algún panorama por esta zona": usa los datos REALES que ya publicó la
// comunidad (miradores, picadas/datos útiles, alojamiento — reportesData, la
// misma fuente que ya alimenta el aviso proactivo de peligros) filtrados por
// distancia real a tu posición. Si no hay nada marcado por acá, lo dice
// honestamente en vez de inventar algo — mismo principio que las anécdotas de
// Wikipedia (mejor callar que inventar).
const CATS_PANORAMA={mirador:1, util:1, alojamiento:1};
function _pisteroPanoramaCerca(){
  const loc=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
  if(!loc){ h('Necesito tu ubicación para buscar panoramas cerca — activa el GPS y pregúntame de nuevo.'); return; }
  const RADIO_KM=25;
  const cercanos=(reportesData||[]).filter(function(r){ return CATS_PANORAMA[r.cat] && r.lat!=null && r.lon!=null; })
    .map(function(r){ return Object.assign({}, r, {dist: calculateDistance(loc.lat,loc.lon,r.lat,r.lon)/1000}); })
    .filter(function(r){ return r.dist<=RADIO_KM; })
    .sort(function(a,b){ return a.dist-b.dist; });
  if(!cercanos.length){ h('No tengo ningún panorama marcado por la comunidad cerca tuyo todavía. Si conoces algo bueno por acá, repórtalo con "Reportar en Ruta" y le sirve al que venga después.'); return; }
  const top=cercanos.slice(0,3);
  const texto=top.map(function(r){ const info=REPORTE_CATS[r.cat]||{e:'📍',l:'Dato'}; const desc=(r.text||'').split(/[.!?]/)[0]; return info.e+' '+desc+' (a '+r.dist.toFixed(1)+' km)'; }).join('. ');
  h('Por esta zona la comunidad marcó: '+texto+'. Míralo en el mapa para más detalle.');
}
var SUPERFICIE_TIPOS={asfalto:'🛣️ Asfalto',ripio:'🪨 Ripio',tierra:'🟤 Tierra',mixto:'🔀 Mixto'}; // var a propósito: leida desde fuera de este archivo (aviso de superficie en ruta, formulario de reporte)
var DIFICULTAD_NIVELES={facil:'🟢 Fácil',media:'🟡 Media',dificil:'🔴 Difícil'}; // var a propósito: leida desde fuera de este archivo (formulario de reporte)
var reporteCatSel=null; // var a propósito: escrita desde fuera de este archivo (selector de categoría del formulario)
let reporteMarkers=[];
var reporteMapa=null, reporteMapaCoords=null, reporteMapaMarker=null; // var a propósito: reseteadas desde fuera de este archivo
function reportarEnRuta(){
  reporteCatSel=null;
  // El mapa vive DENTRO del modal: cada vez que se abre, innerHTML destruye el
  // contenedor viejo (y con él, el mapa de MapLibre que apuntaba adentro) — hay
  // que soltar la referencia vieja o el próximo toggle intentaría dibujar sobre
  // un mapa ya muerto.
  reporteMapa=null; reporteMapaCoords=null; reporteMapaMarker=null;
  let html='<p style="color:#9fb3c8;font-size:0.85rem;margin-top:0">Tu dato queda público en el mapa de tu zona para ayudar a otros ciclistas. Elige qué reportas:</p><div id="repCats" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  Object.keys(REPORTE_GRUPOS).forEach(function(gk){
    const g=REPORTE_GRUPOS[gk];
    const hijos=Object.keys(REPORTE_CATS).filter(function(x){ return REPORTE_CATS[x].g===gk; });
    if(!hijos.length) return;
    html+='<div style="margin:10px 0 4px;font-size:0.82rem;font-weight:700;color:#e2e8f0">'+g.l+'</div>';
    hijos.forEach(function(k){ const c=REPORTE_CATS[k]; html+='<div class="rep-cat" data-k="'+k+'" onclick="seleccionarCatReporte(\''+k+'\')" style="border:2px solid #2a3147;border-radius:12px;padding:12px;cursor:pointer;text-align:center"><div style="font-size:1.7rem;line-height:1.1;margin-bottom:2px">'+_repIco(c)+'</div><div style="font-weight:800;font-size:0.82rem;color:'+c.c+'">'+c.l+'</div><div style="font-size:0.64rem;color:#7d8ba0;margin-top:3px;line-height:1.2">'+c.h+'</div></div>'; }); });
  html+='</div><div id="repSuperficieExtra" style="display:none;margin-top:10px"><select id="repSuperficieTipo"><option value="">Tipo de superficie...</option>'+Object.keys(SUPERFICIE_TIPOS).map(function(k){return '<option value="'+k+'">'+SUPERFICIE_TIPOS[k]+'</option>';}).join('')+'</select><select id="repDificultad" style="margin-top:6px"><option value="">Dificultad del tramo...</option>'+Object.keys(DIFICULTAD_NIVELES).map(function(k){return '<option value="'+k+'">'+DIFICULTAD_NIVELES[k]+'</option>';}).join('')+'</select></div><textarea id="repText" rows="3" placeholder="Cuenta el dato con detalle (ej: almacén con pan amasado caliente al km 12)..." maxlength="500" style="width:100%;margin-top:12px;background:#000;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:0.9rem"></textarea>'
    +'<button class="ab sec" type="button" style="margin-top:8px" id="btnReporteMapa" onclick="toggleReporteMapa()"><i class="fas fa-location-dot"></i> No estoy ahí: marcar el punto en el mapa</button>'
    +'<div id="reporte-mapa-manual" style="display:none;margin-top:8px"><div id="reporte-mapa-manual-inner" style="height:220px;border-radius:10px;overflow:hidden"></div><p id="reporteMapaEstado" style="font-size:0.7rem;color:#9fb3c8;margin:6px 0 0">Toca el mapa donde está el punto exacto — no tiene que ser donde estás parado tú ahora.</p></div>'
    +'<button class="ab" style="margin-top:8px" onclick="enviarReporte()"><i class="fas fa-location-dot"></i> Publicar en mi zona (+15 Darma)</button>';
  document.getElementById('modalTitle').innerHTML='<i class="fas fa-triangle-exclamation"></i> Reportar en Ruta';
  document.getElementById('modalContent').innerHTML=html;
  document.getElementById('userModal').classList.add('on');
}
// Igual que "elegir en el mapa" del planificador de viaje y del punto manual del
// diario (mismo patrón en toda la app): reportar algo que NO está donde tú estás
// parado ahora mismo (ej. viste un control policial más adelante, o te avisaron
// de un animal atropellado en otro tramo) — antes el reporte SIEMPRE usaba tu
// propia posición GPS, sin ninguna forma de elegir otro punto.
function toggleReporteMapa(){
  const cont=document.getElementById('reporte-mapa-manual'), btn=document.getElementById('btnReporteMapa');
  if(!cont||!btn) return;
  const abrir=cont.style.display==='none';
  cont.style.display=abrir?'block':'none';
  btn.innerText=abrir?'✖️ Cerrar mapa':'📍 No estoy ahí: marcar el punto en el mapa';
  if(!abrir) return;
  if(!reporteMapa){
    const yo=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
    reporteMapa=new maplibregl.Map({container:'reporte-mapa-manual-inner', style:LP_ESTILO_CALLES, center:yo?[yo.lon,yo.lat]:[-70.65,-33.45], zoom:yo?14:5});
    reporteMapa.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    reporteMapa.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true,showAccuracyCircle:true}),'top-right');
    reporteMapa.on('click', function(e){
      reporteMapaCoords={lat:e.lngLat.lat, lon:e.lngLat.lng};
      if(reporteMapaMarker) reporteMapaMarker.remove();
      reporteMapaMarker=new maplibregl.Marker({color:'#fc4c02'}).setLngLat(e.lngLat).addTo(reporteMapa);
      const est=document.getElementById('reporteMapaEstado'); if(est) est.innerText='📍 Punto marcado — se va a publicar ahí, no en tu ubicación actual.';
    });
  }
  setTimeout(function(){ reporteMapa.resize(); },250);
}
function seleccionarCatReporte(k){ reporteCatSel=k; document.querySelectorAll('#repCats .rep-cat').forEach(function(el){ el.style.borderColor = el.getAttribute('data-k')===k ? REPORTE_CATS[k].c : '#2a3147'; el.style.background = el.getAttribute('data-k')===k ? 'rgba(255,255,255,0.05)' : 'transparent'; }); const extra=document.getElementById('repSuperficieExtra'); if(extra) extra.style.display=(k==='superficie')?'block':'none'; }
let _enviandoReporte=false;
async function enviarReporte(){
  if(!reporteCatSel){ lpAviso('Elige primero una categoría'); return; }
  // 2026-08-23: la descripción pasa a OPCIONAL (pedido de Inty: "esto tiene que ser
  // rápido" — antes bloqueaba publicar sin escribir nada). Sigue pudiéndose escribir,
  // solo que ya no es obligatoria.
  const text=document.getElementById('repText').value.trim();
  // Si marcaste un punto en el mapa (botón "No estoy ahí"), publica AHÍ — no en tu
  // GPS. Antes el reporte siempre usaba tu ubicación actual, sin excepción: no había
  // forma de avisar un control policial o un animal atropellado más adelante, solo
  // lo que tuvieras justo debajo de la rueda en ese momento.
  let loc=reporteMapaCoords || currentUserLocation || (us.la?{lat:us.la,lon:us.lo}:null);
  if(!loc){ lpAviso('Necesito tu ubicación para ubicar el reporte. Activa el GPS, o marca el punto en el mapa.'); getCurrentLocation(); return; }
  if(_enviandoReporte) return; // evita duplicar el documento y el Darma con doble-tap
  _enviandoReporte=true;
  try{
    let comuna='Mi zona';
    try{ const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=json&accept-language=es&zoom=12&lat='+loc.lat+'&lon='+loc.lon); const j=await r.json(); const a=j.address||{}; comuna=a.city||a.town||a.village||a.municipality||a.county||a.state||'Mi zona'; }catch(e){}
    const data={cat:reporteCatSel, text:text, user:cu, nombre:nombreUsuario, lat:loc.lat, lon:loc.lon, comuna:comuna, authUid:window.lpUID||null, ts:firebase.firestore.FieldValue.serverTimestamp()};
    if(reporteCatSel==='superficie'){
      const tipoEl=document.getElementById('repSuperficieTipo'), difEl=document.getElementById('repDificultad');
      // Antes eran opcionales: se podía publicar "Estado del camino" sin decir ni el
      // tipo de superficie ni la dificultad, dejando el dato sin nada útil para filtrar
      // o mostrar en el mapa (solo texto libre). Ahora se exige al menos el tipo.
      if(!tipoEl || !tipoEl.value){ lpAviso('Elige el tipo de superficie (asfalto, ripio, tierra o mixto)'); return; }
      data.superficie=tipoEl.value;
      if(difEl && difEl.value) data.dificultad=difEl.value;
    }
    await db.collection('reportes').add(data);
    _ganarDarma(15); au(); sincronizarStats();
    _cerrarReporteRapido();
    // 2026-08-23: pedido de Inty tras probar en vivo — publicaba bien pero si el mapa
    // estaba muy alejado (más del umbral de ~30km visibles que ya usan los reportes,
    // ver renderReporteMarkers) el pin propio quedaba oculto por diseño y parecía que
    // "no se guardó". Ahora, si estás así de alejado, el mapa se acerca solo hasta un
    // zoom donde el reporte se ve, centrado en el punto publicado.
    try{
      if(mp && typeof _escalaVisibleKm==='function' && _escalaVisibleKm(mp)>30){
        mp.easeTo({center:[loc.lon,loc.lat], zoom:Math.max(mp.getZoom(),13), duration:700});
      } else if(mp){
        mp.easeTo({center:[loc.lon,loc.lat], duration:500});
      }
    }catch(e){}
    try{ _pisteroMood='contento'; }catch(e){} h('¡Gracias por aportar a la comunidad! Tu dato ya está en el mapa de '+comuna+'. Quince de Darma para ti.');
  }catch(err){ lpAviso('No se pudo enviar: '+err.message); }
  finally{ _enviandoReporte=false; }
}
function tiempoTranscurrido(ts){ if(!ts||!ts.seconds) return 'recién'; const s=Math.floor(Date.now()/1000)-ts.seconds; if(s<60) return 'recién'; const m=Math.floor(s/60); if(m<60) return 'hace '+m+' min'; const h2=Math.floor(m/60); if(h2<24) return 'hace '+h2+' h'; const d=Math.floor(h2/24); if(d<7) return 'hace '+d+' día'+(d>1?'s':''); const w=Math.floor(d/7); return 'hace '+w+' sem'; }
// Botones "¿sigue ahí?" estilo Waze — van en el popup del mapa y en la lista.
function _confirmBtnsHTML(id){
  if(!id) return '';
  return '<div style="margin-top:7px;display:flex;gap:6px">'
    +'<button onclick="confirmarReporte(\''+id+'\',true)" style="flex:1;background:rgba(16,185,129,0.15);border:1px solid #10b981;color:#10b981;border-radius:8px;padding:6px 8px;font-size:0.72rem;font-weight:700;cursor:pointer"><i class="fas fa-thumbs-up"></i> Sigue ahí</button>'
    +'<button onclick="confirmarReporte(\''+id+'\',false)" style="flex:1;background:rgba(255,90,90,0.14);border:1px solid #ff5a5a;color:#ff8a8a;border-radius:8px;padding:6px 8px;font-size:0.72rem;font-weight:700;cursor:pointer"><i class="fas fa-ban"></i> Ya no está</button>'
    +'</div>';
}
function _confirmCountsHTML(r){
  const cf=(r.confirmadoPor||[]).length, ds=(r.desmentidoPor||[]).length;
  if(!cf&&!ds) return '';
  let s='<div style="font-size:0.64rem;color:#7d8ba0;margin-top:3px">';
  if(cf) s+='✔ '+cf+' confirma'+(cf>1?'n':'')+' que sigue';
  if(cf&&ds) s+=' · ';
  if(ds) s+='✖ '+ds+' dice'+(ds>1?'n':'')+' que no';
  return s+'</div>';
}
// Confirmación comunitaria: "sigue ahí" reinicia el reloj del aviso; "ya no está" suma
// un desmentido. Con REPORTE_DESMENTIDO_UMBRAL desmentidos el pin desaparece para todos.
// arrayUnion evita que el mismo usuario cuente dos veces (mismo patrón que las rodadas).
let _avisoDesmentidoHablado=false; // ver comentario dentro de confirmarReporte()
async function confirmarReporte(id, sigue){
  if(!id || typeof db==='undefined' || !db) return;
  if(typeof _esCiclistaConfiable==='function' && !_esCiclistaConfiable()){ lpAviso('Para validar reportes de seguridad necesitas haber pedaleado al menos '+LP_KM_CONFIANZA+' km con la app. Así el mapa se protege de cuentas falsas. ¡Sigue sumando km en bici!'); return; }
  const uid=window.lpUID||cu||'anon';
  const doc=reportesData.find(function(x){ return x.id===id; });
  const yaVoto=doc && (((doc.confirmadoPor||[]).indexOf(uid)>=0) || ((doc.desmentidoPor||[]).indexOf(uid)>=0));
  const ref=db.collection('reportes').doc(id);
  try{
    if(sigue){
      await ref.update({ confirmadoPor: firebase.firestore.FieldValue.arrayUnion(uid), lastConfirm: firebase.firestore.FieldValue.serverTimestamp() });
      h('¡Gracias! Confirmado que sigue ahí. Así el mapa se mantiene al día.');
    } else {
      await ref.update({ desmentidoPor: firebase.firestore.FieldValue.arrayUnion(uid) });
      // Solo se HABLA la primera vez por sesión (pedido de Inty: si borras 3 reportes
      // seguidos — ej. varios avisos de "animal en el camino" que ya pasaste — Pistero
      // no tiene que repetir la misma frase 3 veces). El cuadro de texto sí se muestra
      // siempre, para que cada acción tenga su confirmación visual.
      const _txtDesmentido='Anotado: ya no está. Gracias por avisar, colega — el resto te lo agradece.';
      if(!_avisoDesmentidoHablado){ _avisoDesmentidoHablado=true; h(_txtDesmentido); }
      else { mostrarBocadillo(_txtDesmentido); }
    }
    if(!yaVoto){ _ganarDarma(2); au(); if(typeof sincronizarStats==='function') sincronizarStats(); } // +2 Darma solo la 1ª vez, sin farmear
  }catch(e){ lpAviso('No se pudo registrar tu confirmación, intenta de nuevo en un rato.'); }
  try{ if(mp) mp.closePopup(); }catch(e){}
}
// ===== Capas del mapa (pedido de Inty: "un solo mapa para todo"). Los reportes se
// agrupan en 3 capas que se muestran/ocultan con los chips; ciclistas es aparte (radar). =====
const CAPA_GRUPOS={
  peligros:['policia','critico','accidente','objeto','animal','taco'],
  puntos:['util','taller','alojamiento','superficie'], // 'taller' es categoría nueva (2026-07-20): explícita, no por el fallback
  miradores:['mirador']
};
let mapaCapas={peligros:true, puntos:true, miradores:true};
function _grupoDeCat(cat){ for(const g in CAPA_GRUPOS){ if(CAPA_GRUPOS[g].indexOf(cat)>=0) return g; } return 'puntos'; }
// Dibuja los marcadores de reportes desde reportesData, respetando reporteVisible (Waze)
// y las capas encendidas. Reutilizable: lo llama el snapshot y también cada toggle de capa.
function renderReporteMarkers(){
  if(!mp) return;
  reporteMarkers.forEach(function(m){ mp.removeLayer(m); }); reporteMarkers=[];
  // 2026-08-21 (pedido de Inty, mismo umbral de ~30 km de escala visible que
  // _renderizarPuntosVisibles): más alejado que eso los reportes/alertas se ocultan
  // — solo se ven los ciclistas, sin amontonarse con íconos de peligro/servicios.
  if(_escalaVisibleKm(mp) > 30) return;
  reportesData.filter(reporteVisible).forEach(function(r){
    if(!(r.lat&&r.lon)) return;
    if(!mapaCapas[_grupoDeCat(r.cat)]) return; // capa apagada
    const c=REPORTE_CATS[r.cat]||REPORTE_CATS.util;
    const badge=lpBadgeHTML(_repIco(c), r.cat==='critico'?c.c:null);
    const extra=(r.superficie||r.dificultad)?('<br>'+(r.superficie?SUPERFICIE_TIPOS[r.superficie]||'':'')+' '+(r.dificultad?DIFICULTAD_NIVELES[r.dificultad]||'':'')):'';
    const mk=mlMarker([r.lat,r.lon],{icon:{html:badge}}).addTo(mp).bindPopup('<b>'+_repIco(c)+' '+c.l+'</b>'+extra+'<br>'+escapeHTML(r.text)+'<br><small>'+escapeHTML(r.nombre||'Ciclista')+' · '+tiempoTranscurrido(r.lastConfirm||r.ts)+'</small>'+_confirmCountsHTML(r)+'<br><a href="#" onclick="irAlPuntoYNavegar('+r.lat+','+r.lon+',\''+escapeHTML(c.l).replace(/'/g,"\\'")+'\');return false" style="color:#fc4c02;font-weight:700"><i class="fas fa-compass"></i> Ir aquí</a>'+_confirmBtnsHTML(r.id));
    reporteMarkers.push(mk);
  });
}
/* ===== COLABORADORES — negocios aliados, curados a mano =====
   Van aparte de `reportes` (que es lo que sube la comunidad) porque estos son acuerdos:
   deben salir SIEMPRE, no depender de que alguien los reporte ni caducar como un aviso
   de taco. Coordenadas sacadas de los enlaces de Google Maps que mandó Inty el
   2026-07-21 — no son aproximadas ni inventadas: son el punto exacto del negocio.
   En la landing aparecen como auspiciadores (sección "Quienes hacen posible"). */
const COLABORADORES=[
  {n:'La Ruka del Ciclista', lat:-41.96044,   lon:-72.4682742, e:'🚲',
   d:'Punto ciclista en Hornopirén, Hualaihué. Tupuales 1.', tipo:'Punto ciclista'},
  {n:'Hostal Refugio Oasis', lat:-40.193985,  lon:-72.2587829, e:'🛏️',
   d:'Hospedaje en Llifén, Futrono — a orillas del lago Ranco.', tipo:'Hospedaje'},
  {n:'Bodega Chumpeco',      lat:-40.2002762, lon:-72.2595328, e:'🏪',
   d:'Cervecería y sandwichería en Llifén, Futrono.', tipo:'Comida y bebida'}
];
let colaboradorMarkers=[];
function renderColaboradores(){
  if(!mp) return;
  colaboradorMarkers.forEach(function(m){ mp.removeLayer(m); }); colaboradorMarkers=[];
  if(!mapaCapas.puntos) return; // viajan con la capa de Servicios
  COLABORADORES.forEach(function(c){
    const mk=mlMarker([c.lat,c.lon],{icon:{html:lpBadgeHTML(c.e,'#fc4c02')}}).addTo(mp)
      .bindPopup('<b>'+c.e+' '+escapeHTML(c.n)+'</b><br>'+escapeHTML(c.d)+
                 '<br><small style="color:#fc4c02"><i class="fas fa-star"></i> Colabora con Libre Pedal · '+escapeHTML(c.tipo)+'</small>');
    colaboradorMarkers.push(mk);
  });
}
function toggleCapaReportes(grupo, el){
  mapaCapas[grupo]=!mapaCapas[grupo];
  if(el) el.classList.toggle('on', mapaCapas[grupo]);
  renderReporteMarkers(); renderColaboradores();
}
function toggleCapaCiclistas(el){
  toggleRadarOnMap(); // ya sube/baja el radar y sus marcadores
  if(el) el.classList.toggle('on', radarActive);
}
function subscribeToReportes(){
  db.collection('reportes').orderBy('ts','desc').limit(200).onSnapshot(function(snap){
    const docs=[]; snap.forEach(function(d){ const x=d.data(); x.id=d.id; docs.push(x); });
    reportesData=docs; _calcularReportesAvisoRelevantes();
    renderReporteMarkers();
    renderColaboradores(); // los aliados se dibujan siempre, no dependen de que alguien los reporte
    renderReportesComunidad(docs.filter(reporteVisible));
  });
}
function renderReportesComunidad(docs){
  const cont=document.getElementById('reportes-comunidad'); if(!cont) return;
  if(!docs.length){ cont.innerHTML='<div class="cd"><h4 style="margin-top:0;font-size:0.9rem"><i class="fas fa-location-dot"></i> Mapa Comunitario</h4><p style="color:#888;font-size:0.8rem;margin:0">Aún no hay reportes. ¡Sé el primero en aportar un dato de tu zona con "Reportar en Ruta"!</p></div>'; return; }
  const byZona={}; docs.forEach(function(r){ const z=r.comuna||'Mi zona'; (byZona[z]=byZona[z]||[]).push(r); });
  let html='<div class="cd"><h4 style="margin-top:0;font-size:0.9rem"><i class="fas fa-location-dot"></i> Mapa Comunitario · datos de la ruta</h4>';
  Object.keys(byZona).forEach(function(z){ html+='<div style="margin-top:10px"><div style="font-weight:800;color:var(--p);font-size:0.82rem;border-bottom:1px solid #223;padding-bottom:4px;margin-bottom:6px">📌 '+escapeHTML(z)+'</div>'; byZona[z].forEach(function(r){ const c=REPORTE_CATS[r.cat]||REPORTE_CATS.util; const extra=(r.superficie||r.dificultad)?('<div style="font-size:0.68rem;color:#a78bfa;margin-top:2px">'+(r.superficie?SUPERFICIE_TIPOS[r.superficie]||'':'')+' '+(r.dificultad?DIFICULTAD_NIVELES[r.dificultad]||'':'')+'</div>'):''; html+='<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #15202e"><div style="font-size:1.05rem;line-height:1.2">'+_repIco(c)+'</div><div style="flex:1"><div style="font-size:0.8rem;color:#dfe7ff;line-height:1.3">'+escapeHTML(r.text)+'</div>'+extra+'<div style="font-size:0.65rem;color:#7d8ba0;margin-top:2px">'+escapeHTML(r.nombre||'Ciclista')+' · '+tiempoTranscurrido(r.lastConfirm||r.ts)+'</div>'+_confirmCountsHTML(r)+_confirmBtnsHTML(r.id)+'</div></div>'; }); html+='</div>'; });
  html+='</div>'; cont.innerHTML=html;
}
