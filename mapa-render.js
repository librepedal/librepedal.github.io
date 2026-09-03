/* ===== Mapa principal: MapLibre GL + OpenFreeMap (vectorial, gratis, sin cuenta) =====
   Reemplaza los mosaicos planos de Leaflet/OSM por un estilo sobrio y elegante,
   igual de prolijo que las apps líderes del rubro. Se deja una capa de compatibilidad
   (mlMarker/mlPolyline + parches en mp.setView/fitBounds/removeLayer) para que el
   resto de las funciones seguidoras del mapa casi no cambien de forma. */
/* Rediseño mapa 2026-07-29 (SPEC): el default era `/styles/dark` — ninguna app de rutas
   arranca en negro (Strava/Komoot/Google abren en claro). Se cambia a `liberty`, el estilo
   de calles CLARO y legible de OpenFreeMap. El oscuro/satélite/topo quedan como alternadores
   de `btnCapaMapa`, no como default. */
var LP_ESTILO_CALLES='https://tiles.openfreemap.org/styles/liberty'; // var a propósito: usada desde fuera de este archivo (mapas de selección manual de POI)
const LP_ESTILO_TOPO={version:8,sources:{topo:{type:'raster',tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png','https://b.tile.opentopomap.org/{z}/{x}/{y}.png','https://c.tile.opentopomap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:17,attribution:'© OpenTopoMap'}},layers:[{id:'topo',type:'raster',source:'topo'}]};
const LP_ESTILO_SAT={version:8,sources:{sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'© Esri, Maxar, Earthstar Geographics'}},layers:[{id:'sat',type:'raster',source:'sat'}]};
function mlLatLngBounds(arr){
  let minLat=Infinity,maxLat=-Infinity,minLon=Infinity,maxLon=-Infinity;
  arr.forEach(function(p){ const lat=(p.lat!=null)?p.lat:p[0], lon=(p.lon!=null)?p.lon:(p.lng!=null?p.lng:p[1]); if(lat<minLat)minLat=lat; if(lat>maxLat)maxLat=lat; if(lon<minLon)minLon=lon; if(lon>maxLon)maxLon=lon; });
  if(!isFinite(minLat)){ minLat=maxLat=0; minLon=maxLon=0; }
  return { _b:[[minLon,minLat],[maxLon,maxLat]], pad:function(p){ const dx=Math.max((maxLon-minLon)*p,0.01), dy=Math.max((maxLat-minLat)*p,0.01); return {_b:[[minLon-dx,minLat-dy],[maxLon+dx,maxLat+dy]]}; } };
}
// Insignia discreta y consistente para casi todos los puntos del mapa (mismo tono
// translúcido, mismo tamaño). Solo lo que de verdad necesita saltar a la vista
// (ej. un punto crítico/peligro) recibe un anillo de color propio.
// 2026-08-31: el fondo tintado antes era SIEMPRE rojizo (rgba(226,84,74,...)) sin
// importar qué ringColor de verdad se pasara -- funcionaba por casualidad para peligro
// (rojo real) pero quedaba desalineado para cualquier otro color (ej. taller naranja en
// COLABORADORES, l.7655 de esta versión). Ahora el tinte SALE del propio ringColor.
function _lpHexA(hex, a){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex||'');
  if(!m) return null;
  const n = parseInt(m[1], 16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}
function lpBadgeHTML(icon, ringColor){
  const ring = ringColor || 'rgba(255,255,255,.35)';
  const bg = ringColor ? (_lpHexA(ringColor,.18) || 'rgba(226,84,74,.18)') : 'rgba(14,18,28,.85)';
  return '<div style="width:28px;height:28px;border-radius:50%;background:'+bg+';border:1.5px solid '+ring+';display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4)"><span style="font-size:13px;filter:saturate(.75) brightness(1.05)">'+icon+'</span></div>';
}
function mlMarker(latlng, opts){
  opts=opts||{};
  const lat=latlng[0], lon=latlng[1];
  let el=null;
  if(opts.icon && opts.icon.html){ const wrap=document.createElement('div'); wrap.innerHTML=opts.icon.html; el=wrap.firstElementChild; }
  return {
    _ml:null, _map:null,
    addTo:function(map){ this._map=map; this._ml=el?new maplibregl.Marker({element:el}):new maplibregl.Marker({color:'#fc4c02'}); this._ml.setLngLat([lon,lat]).addTo(map); return this; },
    bindPopup:function(html){ this._popup=new maplibregl.Popup({offset:18,maxWidth:'240px'}).setHTML(html); if(this._ml) this._ml.setPopup(this._popup); return this; },
    openPopup:function(){ if(this._ml) this._ml.togglePopup(); return this; },
    setIcon:function(newOpts){ if(!this._ml||!newOpts||!newOpts.html) return this; const wrap=document.createElement('div'); wrap.innerHTML=newOpts.html; const newEl=wrap.firstElementChild; this._ml.getElement().replaceWith(newEl); this._ml._element=newEl; return this; },
    setLatLng:function(ll){ if(this._ml) this._ml.setLngLat([ll[1],ll[0]]); return this; },
    getLatLng:function(){ if(!this._ml) return {lat:lat,lng:lon}; const c=this._ml.getLngLat(); return {lat:c.lat,lng:c.lng}; },
    remove:function(){ if(this._ml) this._ml.remove(); }
  };
}
let _mlLineSeq=0;
function mlPolyline(latlngs, opts){
  opts=opts||{};
  const id='mlline_'+(++_mlLineSeq);
  const haloId=id+'_halo';
  const coords=(latlngs||[]).map(function(p){ return Array.isArray(p)?[p[1],p[0]]:[p.lon,p.lat]; });
  return {
    _id:id, _map:null, _coords:coords,
    addTo:function(map){
      if(!map) return this; // sin mapa no se agrega nada (evita crash Sentry: map.isStyleLoaded de undefined)
      this._map=map;
      const add=function(){
        if(map.getSource(id)) return;
        map.addSource(id,{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:coords}}});
        const w=opts.weight||4;
        // Halo oscuro debajo de la línea (mismo source, layer aparte agregado primero): sin
        // esto, el dorado de "tu ruta" (#ffd700) se camuflaba contra las avenidas principales
        // del estilo "calles", pintadas en un amarillo/naranja casi igual -- la importación
        // y el trazado funcionaban bien, pero a simple vista parecía que no había pasado nada.
        map.addLayer({id:haloId,type:'line',source:id,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0a0f1d','line-width':w+4,'line-opacity':0.6}});
        map.addLayer({id:id,type:'line',source:id,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':opts.color||'#fc4c02','line-width':w,'line-opacity':opts.opacity!=null?opts.opacity:0.85}});
      };
      if(map.isStyleLoaded()) add(); else map.once('idle',add);
      return this;
    },
    addLatLng:function(ll){ this._coords.push([ll[1],ll[0]]); if(this._map&&this._map.getSource(id)) this._map.getSource(id).setData({type:'Feature',geometry:{type:'LineString',coordinates:this._coords}}); return this; },
    getBounds:function(){ return mlLatLngBounds(this._coords.map(function(c){return {lat:c[1],lon:c[0]};})); },
    remove:function(){ if(this._map){ if(this._map.getLayer(haloId)) this._map.removeLayer(haloId); if(this._map.getLayer(id)) this._map.removeLayer(id); if(this._map.getSource(id)) this._map.removeSource(id); } }
  };
}
function _prepararMapaCompat(map){
  // Acepta tanto [lat,lon] (array, estilo Leaflet) como {lat,lng}/{lat,lon} (lo que
  // devuelve getLatLng() de mlMarker) — un solo llamador pasaba el objeto directo y
  // tiraba una excepción real (Invalid LngLat) porque un objeto no tiene índices [0]/[1].
  map.setView=function(latlng,zoom){
    const lat=Array.isArray(latlng)?latlng[0]:latlng.lat;
    const lon=Array.isArray(latlng)?latlng[1]:(latlng.lng!=null?latlng.lng:latlng.lon);
    this.jumpTo({center:[lon,lat],zoom:zoom}); return this;
  };
  const _origFitBounds=map.fitBounds.bind(map);
  map.fitBounds=function(bounds,opts){ opts=opts||{}; const b=bounds&&bounds._b?bounds._b:bounds; const pad=opts.padding?(Array.isArray(opts.padding)?Math.max.apply(null,opts.padding):opts.padding):40; _origFitBounds(b,{padding:pad,maxZoom:16,duration:500}); return this; };
  // OJO: mlPolyline.remove() llama internamente a this._map.removeLayer(idString) para
  // borrar su layer/source nativo — si acá solo aceptáramos objetos con .remove(), esa
  // llamada con un string nunca haría nada y la ruta vieja quedaría fantasma en el mapa
  // para siempre (además de generar errores de MapLibre al intentar borrar el source
  // mientras el layer seguía vivo). Por eso hay que conservar el removeLayer nativo.
  const _origRemoveLayer=map.removeLayer.bind(map);
  map.removeLayer=function(obj){
    if(obj&&typeof obj.remove==='function'){ obj.remove(); }
    else if(typeof obj==='string'){ try{ _origRemoveLayer(obj); }catch(e){} }
    return this;
  };
  return map;
}
// Capa de calles (vectorial, sobria) vs. topográfica (OpenTopoMap): la de calles no
// dibuja huellas/senderos rurales que sí existen en OSM pero no se ven en ese estilo.
// La topográfica los muestra, además de curvas de nivel — útil para caminos interiores.
let capaMapaTipo=(function(){ try{ return localStorage.getItem('lp_capa_mapa')||'calles'; }catch(e){ return 'calles'; } })();
// No todos llevan diario de sus viajes — esto es opt-in, apagado por defecto. El
// comando de voz "guarda mi bitácora" funciona SIEMPRE, esté esto activado o no
// (si alguien lo pide explícitamente, no hay razón para negárselo); esta preferencia
// solo controla si la app lo OFRECE por su cuenta en algún otro lugar.
var bitacoraViajesOn=(function(){ try{ return localStorage.getItem('lp_bitacora_viajes')==='1'; }catch(e){ return false; } })(); // var a propósito: leida desde fuera de este archivo (comando de voz "guarda tu viaje")
function _actualizarBtnBitacoraViajes(){ const b=document.getElementById('btnBitacoraViajes'); if(b){ b.innerText=bitacoraViajesOn?'🎒 Bitácora de viajes: ON':'🎒 Bitácora de viajes: OFF'; b.style.background=bitacoraViajesOn?'rgba(16,185,129,0.15)':''; b.style.borderColor=bitacoraViajesOn?'#10b981':''; } }
function toggleBitacoraViajes(){
  bitacoraViajesOn=!bitacoraViajesOn;
  try{ localStorage.setItem('lp_bitacora_viajes', bitacoraViajesOn?'1':'0'); }catch(e){}
  _actualizarBtnBitacoraViajes();
  h(bitacoraViajesOn?'Bitácora de viajes activada. Cuando termines una ruta te voy a preguntar si quieres anotar dónde te hospedaste.':'Bitácora de viajes desactivada. Si igual quieres guardarla alguna vez, solo dime "guarda mi bitácora".');
}
var gpsAhorro=(function(){ try{ return localStorage.getItem('lp_gps_ahorro')==='1'; }catch(e){ return false; } })(); // var a propósito: leida desde fuera de este archivo (configuración del GPS watch)
function _actualizarBtnAhorroGPS(){ const b=document.getElementById('btnAhorroGPS'); if(b){ b.innerText=gpsAhorro?'🔋 Ahorro GPS: ON':'🔋 Ahorro GPS: OFF'; b.style.background=gpsAhorro?'rgba(16,185,129,0.15)':''; b.style.borderColor=gpsAhorro?'#10b981':''; } }
async function toggleAhorroGPS(){
  gpsAhorro=!gpsAhorro;
  try{ localStorage.setItem('lp_gps_ahorro', gpsAhorro?'1':'0'); }catch(e){}
  _actualizarBtnAhorroGPS();
  // Si el GPS ya está corriendo (nativo, en segundo plano), lo reinicia con la nueva
  // frecuencia sin que el usuario tenga que apagar y prender el viaje — cuidando de
  // mantener el callback correcto (navegación turn-by-turn vs GPS libre).
  const opts=gpsAhorro?{enableHighAccuracy:false,maximumAge:8000,timeout:15000}:{enableHighAccuracy:true,maximumAge:1000,timeout:10000};
  if(lpBackgroundGeo.disponible()){
    if(document.getElementById('nav-screen').classList.contains('active')){ await lpBackgroundGeo.restart(_navBgCallback); }
    else if(ig){ await lpBackgroundGeo.restart(); }
  } else {
    // Navegador (sin plugin nativo): watchPosition no relee sus opciones solo con
    // cambiar la variable — hay que cortar el watch viejo y abrir uno nuevo con las
    // opciones nuevas, si no el botón dice "cambié la precisión" pero en los hechos
    // sigue exactamente igual hasta que se apague y prenda el GPS de nuevo.
    if(document.getElementById('nav-screen').classList.contains('active') && gpsWatchId){
      navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId=navigator.geolocation.watchPosition(_navGeoCallback,function(err){ console.error("GPS:",err); },opts);
    } else if(ig && gw){
      navigator.geolocation.clearWatch(gw);
      gw=navigator.geolocation.watchPosition(ug,hg,opts);
    }
  }
  h(gpsAhorro?'Ahorro de GPS activado. Va a gastar menos batería, con un poco menos de precisión.':'Ahorro de GPS desactivado. Vuelvo a la máxima precisión.');
}
/* Rediseño 2026-07-29 (SPEC): las 4 capas viven detrás de UN botón "Capas" que abre una
   hoja compacta. Despeja el mapa. Los toggles (toggleCapaCiclistas/toggleCapaReportes) no
   cambian: solo se muestran/ocultan aquí. Se cierra al tocar fuera. */
function toggleCapasPanel(){
  var p=document.getElementById('capasPanel'); if(!p) return;
  var abrir=!p.classList.contains('show');
  p.classList.toggle('show', abrir);
  var b=document.getElementById('btnCapasToggle'); if(b) b.classList.toggle('on', abrir);
  if(abrir){
    setTimeout(function(){
      document.addEventListener('click', function cerrar(e){
        if(!p.contains(e.target) && e.target.id!=='btnCapasToggle' && !(b&&b.contains(e.target))){
          p.classList.remove('show'); if(b) b.classList.remove('on'); document.removeEventListener('click', cerrar);
        }
      });
    }, 0);
  }
}
function _estiloDeCapa(t){ return t==='topo'?LP_ESTILO_TOPO:t==='sat'?LP_ESTILO_SAT:LP_ESTILO_CALLES; }
/* ===== Temas de mapa "videojuego" (2026-08-14) — 3 en el lanzamiento: Aventura, Neón, Arcade.
   Recolor de las capas del estilo liberty vía setPaintProperty (patrón PROBADO en
   lp-work/prototipos-mapa). ADITIVO y todo en try/catch: si algo falla, el mapa base sigue.
   NO usa body.tema-* (esas clases son del tema de UI Sólido/Cristal — no las piso). Los otros
   3 (Maqueta 3D, Blueprint, Acuarela) quedan para post-lanzamiento. */
const LP_CAPAS=['calles','topo','sat','aventura','neon','arcade'];
const LP_CAPA_NOMBRE={calles:'Calles',topo:'Topográfico',sat:'Satélite',aventura:'Aventura',neon:'Neón',arcade:'Arcade'};
function _siguienteCapa(t){ var i=LP_CAPAS.indexOf(t); return LP_CAPAS[(i+1)%LP_CAPAS.length]; }
const LP_DEM_MAPA='https://tiles.mapterhorn.com/tilejson.json';
const LP_PAL_MAPA={
  aventura:{bg:'#e7d4a8',bgHondo:'#e0c99a',agua:'#8fb2b0',aguaL:'#5f8a86',bosque:'#9aae74',pasto:'#c2cf92',arena:'#ecd9a6',edif:'#d7bd8c',edifB:'#a9895a',vMayor:'#c79a4f',vMayorC:'#8f6a30',vMenor:'#dcc48c',vMenorC:'#b0925c',sendero:'#8a5a2b',riel:'#a1855c',borde:'#8a7a55',texto:'#4a3620',halo:'#f3e7c6',haloW:1.4},
  neon:{bg:'#0a0f1d',bgHondo:'#0d1526',agua:'#08213f',aguaL:'#1e9fe0',bosque:'#0f2a1e',pasto:'#122a1c',arena:'#1a2030',edif:'#12203a',edifB:'#1c3a66',vMayor:'#00e5ff',vMayorC:'#063540',vMenor:'#ff7a3c',vMenorC:'#3a1c10',sendero:'#b26bff',riel:'#334455',borde:'#25406a',texto:'#cfe9ff',halo:'#04070f',haloW:1.6,glow:true},
  arcade:{bg:'#57b85a',bgHondo:'#4fae52',agua:'#22a0e6',aguaL:'#1580c0',bosque:'#3f9e46',pasto:'#63c463',arena:'#e8d38a',edif:'#eaeaea',edifB:'#9aa0a6',vMayor:'#ffffff',vMayorC:'#222222',vMenor:'#f0f0f0',vMenorC:'#555555',sendero:'#8a5a2b',riel:'#888888',borde:'#222222',texto:'#0e2a12',halo:'#ffffff',haloW:2}
};
function _reskinMapa(map,P){
  var set=function(id,p,v){ try{ map.setPaintProperty(id,p,v); }catch(e){} };
  var layers=(map.getStyle()&&map.getStyle().layers)||[];
  for(var i=0;i<layers.length;i++){ var L=layers[i]; var sl=L['source-layer']||'', id=(L.id||'').toLowerCase(), t=L.type;
    if(t==='background'){ set(L.id,'background-color',P.bg); continue; }
    if(t==='fill'){
      if(/water/.test(sl)||/water/.test(id)){ set(L.id,'fill-color',P.agua); set(L.id,'fill-opacity',1); continue; }
      if(/building/.test(sl)){ set(L.id,'fill-color',P.edif); set(L.id,'fill-opacity',.9); set(L.id,'fill-outline-color',P.edifB); continue; }
      if(/(wood|forest)/.test(id)){ set(L.id,'fill-color',P.bosque); set(L.id,'fill-opacity',.55); continue; }
      if(/(park|grass|garden|pitch|golf|meadow|scrub|cemetery|recreation)/.test(id)){ set(L.id,'fill-color',P.pasto); set(L.id,'fill-opacity',.5); continue; }
      if(/(sand|beach|desert)/.test(id)){ set(L.id,'fill-color',P.arena); continue; }
      if(/landcover/.test(sl)){ set(L.id,'fill-color',P.bosque); set(L.id,'fill-opacity',.32); continue; }
      set(L.id,'fill-color',P.bgHondo); set(L.id,'fill-opacity',.45); continue;
    }
    if(t==='line'){
      if(/waterway/.test(sl)){ set(L.id,'line-color',P.aguaL); continue; }
      if(/(boundary|admin)/.test(sl)){ set(L.id,'line-color',P.borde); set(L.id,'line-dasharray',[3,2]); continue; }
      if(/(rail|transit)/.test(id)){ set(L.id,'line-color',P.riel); continue; }
      if(/(path|track|footway|cycle|trail|steps|pedestrian)/.test(id)){ set(L.id,'line-color',P.sendero); set(L.id,'line-dasharray',[2,2]); continue; }
      var mayor=/(motorway|trunk|primary)/.test(id), casing=/casing/.test(id);
      set(L.id,'line-color', mayor?(casing?P.vMayorC:P.vMayor):(casing?P.vMenorC:P.vMenor));
      if(P.glow && !casing && mayor){ set(L.id,'line-blur',2); }
      continue;
    }
    if(t==='symbol'){ set(L.id,'text-color',P.texto); set(L.id,'text-halo-color',P.halo); set(L.id,'text-halo-width',P.haloW); continue; }
  }
}
function _hillshadeMapa(map){
  try{ if(!map.getSource('lp-dem')) map.addSource('lp-dem',{type:'raster-dem',url:LP_DEM_MAPA});
    if(!map.getLayer('lp-relieve')){ var before, ls=map.getStyle().layers; for(var i=0;i<ls.length;i++){ if(ls[i].type==='symbol'){ before=ls[i].id; break; } }
      map.addLayer({id:'lp-relieve',type:'hillshade',source:'lp-dem',paint:{'hillshade-exaggeration':0.45,'hillshade-shadow-color':'#7a5230','hillshade-highlight-color':'#f6ead0','hillshade-accent-color':'#8a6a3a'}},before);
    }
  }catch(e){}
}
var LP_MAPA_POST={
  aventura:function(m){ _hillshadeMapa(m); try{ m.setTerrain(null); }catch(e){} try{ m.easeTo({pitch:50,bearing:-16,duration:500}); }catch(e){} try{ m.setSky({'sky-color':'#e9c98f','horizon-color':'#e7d0a0','fog-color':'#e7d8b4','fog-ground-blend':0.5,'sky-horizon-blend':0.7}); }catch(e){} },
  neon:function(m){ try{ m.setTerrain(null); }catch(e){} try{ m.easeTo({pitch:46,bearing:-10,duration:500}); }catch(e){} try{ m.setSky({'sky-color':'#0a0f1d','horizon-color':'#12325a','fog-color':'#0a0f1d','fog-ground-blend':0.6}); }catch(e){} },
  arcade:function(m){ try{ m.setTerrain(null); }catch(e){} try{ m.easeTo({pitch:36,bearing:0,duration:500}); }catch(e){} }
};
/* Se llama en cada style.load de mp (inicial y tras cada cambio de capa). */
function _aplicarTemaMapa(){
  if(!mp) return;
  try{
    var t=capaMapaTipo, P=LP_PAL_MAPA[t];
    if(P){ _reskinMapa(mp,P); (LP_MAPA_POST[t]||function(){})(mp); }
    else { try{ mp.setTerrain(null); }catch(e){} try{ if(mp.getPitch()>3) mp.easeTo({pitch:0,bearing:0,duration:400}); }catch(e){} }
  }catch(e){}
}
/* Control flotante: cicla calles→topo→sat→aventura→neón→arcade. */
function _actualizarBtnCapaMapa(){ const b=document.getElementById('btnCapaMapa'); if(b){ b.innerHTML='<i class="fas fa-layer-group"></i>'; b.title='Mapa: '+(LP_CAPA_NOMBRE[capaMapaTipo]||capaMapaTipo)+' · toca para '+(LP_CAPA_NOMBRE[_siguienteCapa(capaMapaTipo)]||''); } }
function toggleCapaMapa(){
  if(!mp) return;
  capaMapaTipo=_siguienteCapa(capaMapaTipo);
  try{ localStorage.setItem('lp_capa_mapa',capaMapaTipo); }catch(e){}
  // {diff:false} = recarga completa del estilo. Necesario porque calles/aventura/neón/arcade
  // comparten el MISMO URL (liberty): sin esto, MapLibre no dispara style.load y el recolor no corre.
  mp.setStyle(_estiloDeCapa(capaMapaTipo), {diff:false});
  mp.once('idle',function(){
    if(crl && crl._coords && crl._coords.length>1){ crl._map=null; crl.addTo(mp); }
  });
  _actualizarBtnCapaMapa();
  try{ h('Mapa '+(LP_CAPA_NOMBRE[capaMapaTipo]||capaMapaTipo)+'.'); }catch(e){}
}
function _mapaFalloVisible(msg){
  const c=document.getElementById('map'); if(!c) return;
  c.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:24px;text-align:center;color:#9fb3c8;font-size:0.85rem;background:#0a0f1d">'+escapeHTML(msg)+'</div>';
  try{ if(window.Sentry) Sentry.captureMessage('Mapa principal no cargó: '+msg); }catch(e){}
}
async function im(){
  if(mp) return;
  try{
    if(typeof maplibregl==='undefined'){ _mapaFalloVisible('No se pudo cargar el motor del mapa (sin conexión a unpkg.com). Revisa tu internet y vuelve a intentar.'); return; }
    const canvasTest=document.createElement('canvas');
    if(!canvasTest.getContext('webgl2') && !canvasTest.getContext('webgl')){ _mapaFalloVisible('Tu dispositivo no soporta el mapa 3D (WebGL). Avísanos para revisarlo.'); return; }
    // Arranca centrado en tu zona real (si ya la tenemos) en vez de una vista del
    // mundo entero — con el estilo vectorial nuevo, verlo tan alejado se lee como
    // un bloque de color plano porque el detalle de calles recién aparece más cerca.
    const _yo=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
    const _centroInicial=_yo?[_yo.lon,_yo.lat]:[-70.65,-33.45];
    const _zoomInicial=_yo?12:5;
    mp=new maplibregl.Map({container:'map',style:_estiloDeCapa(capaMapaTipo),center:_centroInicial,zoom:_zoomInicial,attributionControl:false,pitchWithRotate:true});
    _prepararMapaCompat(mp);
    // Brújula + tilt: rotas el mapa con dos dedos y lo inclinas (vista 3D); la brújula lo vuelve al norte.
    // El NavigationControl (trae su propio zoom+brújula) y el FullscreenControl quedan en el
    // código pero nunca se ven: .maplibregl-ctrl-top-right está en display:none porque el control
    // nativo de MapLibre (blanco, cuadrado) no combinaba con el resto de la app. El zoom real que
    // usa la gente es el botón propio .map-zoom-ctrl (más abajo, del lado izquierdo).
    mp.addControl(new maplibregl.NavigationControl({showCompass:true, visualizePitch:true}),'top-right');
    mp.addControl(new maplibregl.FullscreenControl(),'top-right');
    // attributionControl:false arriba + este addControl explícito en 'bottom-left': 2026-08-23,
    // Inty encontró que el (i) de atribución (que MapLibre pone solo, por defecto en
    // bottom-right) quedaba tapado por los botones propios (recentrar/reportar, también
    // bottom-right). Se mueve al mismo rincón que la escala, que ya vive ahí sin problema
    // (MapLibre apila varios controles en la misma esquina sin que se pisen).
    mp.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
    mp.addControl(new maplibregl.ScaleControl({maxWidth:110, unit:'metric'}),'bottom-left');
    // Botón "ubícame": lo tocas y el mapa vuela hasta tu posición real con un punto
    // azul que se mueve solo mientras te desplazas (control nativo de MapLibre).
    mp.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true,showAccuracyCircle:true}),'top-right');
    // Mantén presionado (o clic derecho) en cualquier punto del mapa para navegar ahí — como las apps grandes.
    mp.on('contextmenu', function(e){ try{ const _lat=e.lngLat.lat.toFixed(6), _lon=e.lngLat.lng.toFixed(6); new maplibregl.Popup({offset:12}).setLngLat(e.lngLat).setHTML('<div class="lp-pop"><div class="lp-ic"><i class="fas fa-location-dot"></i></div><div class="lp-body"><div class="lp-t">Punto elegido</div><a href="#" class="lp-cta" onclick="irAlPuntoYNavegar('+_lat+','+_lon+',\'este punto\');return false"><i class="fas fa-compass"></i> Navegar aquí</a></div></div>').addTo(mp); }catch(_){} });
    mp.on('error',function(e){ try{ console.error('MapLibre error:',e&&e.error); if(window.Sentry) Sentry.captureException((e&&e.error)||new Error('MapLibre error desconocido')); }catch(e2){} });
    mp.once('load',function(){ if(!ghostMode) subscribeToUsers(); subscribeToMapPoints(); if(typeof _dibujarZonasRojas==='function') _dibujarZonasRojas(); if(typeof _cargarEstadoCofres==='function') _cargarEstadoCofres(); if(typeof _iniciarEscuchaSOS==='function') _iniciarEscuchaSOS(); mp.on('zoomend', _actualizarVisibilidadCiclistas); _actualizarVisibilidadCiclistas(); });
    mp.on('style.load', _aplicarTemaMapa); // aplica el tema de mapa (aventura/neón/arcade) en cada carga de estilo, y resetea (plano) en calles/topo/sat
  }catch(err){
    mp=null;
    _mapaFalloVisible('No se pudo iniciar el mapa: '+(err&&err.message?err.message:'error desconocido'));
    try{ if(window.Sentry) Sentry.captureException(err); }catch(e2){}
  }
}
function irAlPuntoYNavegar(lat,lon,name){
  lat=parseFloat(lat); lon=parseFloat(lon); name=name||'este punto';
  cv('map');
  setTimeout(function(){ if(!mp) return; if(mp._irMarker) mp.removeLayer(mp._irMarker); mp._irMarker=mlMarker([lat,lon],{}).addTo(mp).bindPopup('<b>'+escapeHTML(name)+'</b>').openPopup(); mp.setView([lat,lon],15); },160);
  setTimeout(async function(){ if(await lpConfirmar('¿Iniciar navegación hacia '+name+'?')){ await getCurrentLocation(); /* 2026-08-20: siempre pide un fix de GPS fresco al iniciar — antes reusaba currentUserLocation de cuando cargó la app, minutos atrás, y la ruta arrancaba mal calculada desde ahí */ if(!currentUserLocation){ lpAviso('Necesito tu GPS para navegar'); return; } currentTrip=null; calculateAndStartNavigation(currentUserLocation.lat,currentUserLocation.lon,lat,lon,name); } },450);
}
// Con puntos de todo Chile (miles), pintarlos TODOS como marcadores DOM sin importar
// el zoom trababa el mapa en celulares modestos. La primera versión de esto cortaba
// duro por zoom (nada visible hasta acercarte mucho) — pero eso hacía que con el país
// a la vista no se viera NADA, que se leía como "los puntos no aparecen". Ahora en vez
// de esconderlos, se limita CUÁNTOS se dibujan a la vez (tope fijo) tomando una
// muestra pareja de los que están en pantalla: con poco zoom ves igual cobertura por
// todo Chile (salteado), y a medida que te acercas terminas viendo todos, sin saltos.
let pointsUnsub=null, mapPointsData=[], mapPointsRenderTimer=null;
const MAPPOINTS_MAX_RENDER=350;
/* Puntos del mapa: caché local + sincronización incremental (2026-08-23).
   ANTES: `collection('recommendations').onSnapshot(...)` SIN filtro y SIN limit(), o sea
   la colección ENTERA en cada apertura del mapa. Firestore cobra por documento leído, y
   esa colección la escriben los usuarios (addRecommendation/agregarPOI): crece para
   siempre. El comentario original ya hablaba de "~4.000 puntos". Con el plan gratis en
   50.000 lecturas al día PARA TODO EL PROYECTO, era una bomba de tiempo: no molesta hasta
   que un día se lleva la cuota de todos.
   AHORA: los puntos se guardan en el teléfono y solo se le piden a Firestore los que
   llegaron DESPUÉS de la última sincronización (`where('ts','>', ...)`). El listener sigue
   siendo en vivo — pero una consulta filtrada solo lee los documentos que casan, así que
   en régimen cuesta casi cero. De regalo, el mapa se pinta al instante desde la caché en
   vez de esperar la red.
   Refresco completo cada 7 días: `likeRecommendation()` actualiza likes/ratings SIN tocar
   `ts`, así que esos cambios no los trae la consulta incremental. Para el mapa da igual
   (solo usa lat/lon/cat/título), pero conviene que no se desfase para siempre.
   No hay borrado de recomendaciones en toda la app — verificado — así que la caché no
   puede mostrar fantasmas de puntos eliminados. */
const MAPPOINTS_CACHE_KEY='lp_mappoints_v1';
const MAPPOINTS_REFRESCO_TOTAL_MS=7*24*60*60*1000;
function _mapPointsCacheLeer(){
  try{
    const c=JSON.parse(localStorage.getItem(MAPPOINTS_CACHE_KEY)||'null');
    if(!c || !Array.isArray(c.puntos)) return null;
    if(!(c.ultimaSync>0) || (Date.now()-c.ultimaSync)>MAPPOINTS_REFRESCO_TOTAL_MS) return null; // caché vieja: refresco completo
    return c;
  }catch(e){ return null; }
}
/* Solo los campos que el mapa usa de verdad (ver _renderizarPuntosVisibles: lat, lon, cat,
   user para separar los sembrados de OSM, title y desc para el globo).
   Esto NO es prolijidad: un documento de `recommendations` puede traer `foto`, que es una
   imagen en base64 (previewFoto usa readAsDataURL). Guardar eso en localStorage —que tiene
   ~5 MB para TODA la app— reventaba de dos maneras: la escritura fallaba y la caché no
   servía de nada en silencio, y peor, al llenar el almacenamiento se caían las otras
   escrituras, incluida gd() con los kilómetros y las rutas del usuario. gd() tiene su
   propio catch silencioso, así que la pérdida habría sido invisible. */
function _mapPointNube(d){
  return {id:d.id, lat:d.lat, lon:d.lon, cat:d.cat, user:d.user,
          title:d.title, desc:(typeof d.desc==='string'?d.desc.slice(0,200):''), tsMs:d.tsMs||0};
}
const MAPPOINTS_CACHE_MAX=6000;          // tope de puntos guardados
const MAPPOINTS_CACHE_MAX_BYTES=1500000; // ~1,5 MB: deja el resto de localStorage libre
function _mapPointsCacheGuardar(){
  try{
    let maxTs=0;
    mapPointsData.forEach(function(d){ if(d.tsMs>maxTs) maxTs=d.tsMs; });
    const payload=JSON.stringify({ultimaSync:Date.now(), maxTs:maxTs,
                                  puntos:mapPointsData.slice(0,MAPPOINTS_CACHE_MAX).map(_mapPointNube)});
    // Antes de escribir, no después: si no entra, se descarta la caché entera en vez de
    // dejar el almacenamiento al borde y hacer fallar a gd() (los km del usuario).
    if(payload.length>MAPPOINTS_CACHE_MAX_BYTES){ try{ localStorage.removeItem(MAPPOINTS_CACHE_KEY); }catch(_){} return; }
    localStorage.setItem(MAPPOINTS_CACHE_KEY, payload);
  }catch(e){
    // Almacenamiento lleno o modo privado: se borra lo propio para no dejar ocupado un
    // espacio que necesitan los datos del usuario. La app sigue, solo pierde el ahorro.
    try{ localStorage.removeItem(MAPPOINTS_CACHE_KEY); }catch(_){}
  }
}
function _mapPointsAplicar(snap){
  // Fusión por id: un punto que ya estaba se reemplaza, uno nuevo se agrega. Nunca se
  // borra nada (la consulta incremental no ve lo viejo, y eso NO significa que no exista).
  const porId={};
  mapPointsData.forEach(function(d){ porId[d.id]=d; });
  snap.forEach(function(doc){
    const d=doc.data();
    if(!(d.lat&&d.lon)) return;
    d.id=doc.id;
    try{ d.tsMs=(d.ts&&d.ts.toMillis)?d.ts.toMillis():(d.tsMs||0); }catch(e){ d.tsMs=d.tsMs||0; }
    porId[d.id]=d;
  });
  mapPointsData=Object.keys(porId).map(function(k){ return porId[k]; });
  // Subconjunto para el aviso de voz (solo agua/mirador/hospedaje): se arma UNA vez
  // acá, no en cada fix de GPS, porque recorrer los puntos completos con cálculo
  // de distancia incluido en cada actualización de posición era pesado de más para
  // un celular andando en bici (batería/CPU en un recorrido de varias horas).
  puntosAvisoRelevantes=mapPointsData.filter(function(d){ return CATEGORIAS_AVISO[d.cat]; });
  _renderizarPuntosVisibles();
  _mapPointsCacheGuardar();
}
// Puntos sembrados de OpenStreetMap (2026-08-25): son 4.028 de los 4.029 puntos del mapa
// —prácticamente todo— y casi no cambian nunca (dato importado una vez, no algo que la
// comunidad edite). Viven EMPAQUETADOS con la app en puntos-osm.json, mismo origen: cero
// llamada a Firestore, cero dependencia de Capone, y el navegador lo cachea solo como
// cualquier otro archivo estático. Esto deja el "primer open sin caché" en costo CERO para
// el 99,98% del mapa, no solo barato.
function _mapPointsSemillaEstatica(cb){
  let listo=false;
  const terminar=function(ok){ if(listo) return; listo=true; cb(ok); };
  fetch('puntos-osm.json').then(function(r){ return r.ok?r.json():null; }).then(function(d){
    if(!d || !Array.isArray(d.puntos) || !d.puntos.length){ terminar(false); return; }
    mapPointsData=d.puntos;
    puntosAvisoRelevantes=mapPointsData.filter(function(x){ return CATEGORIAS_AVISO[x.cat]; });
    try{ _renderizarPuntosVisibles(); }catch(e){}
    _mapPointsCacheGuardar();
    terminar(true);
  }).catch(function(){ terminar(false); });
}
// Caché compartida entre todos los testers (Cloudflare Worker de Capone, cachea la lectura
// pesada horas enteras) — respaldo SOLO si el archivo estático de arriba falla (404, build
// viejo sin el archivo, etc.). Si esto TAMBIÉN falla (Capone caído, sin red, CORS) se sigue
// exactamente como antes de cualquiera de estos dos cambios: full read directo a Firestore.
// Nunca deja al mapa peor de lo que ya estaba.
const MAPA_CACHE_COMPARTIDO_URL='https://asistente-inty.pages.dev/api/mapa-librepedal';
function _mapPointsSemillaCompartida(cb){
  let listo=false;
  const terminar=function(ok){ if(listo) return; listo=true; cb(ok); };
  const vencido=setTimeout(function(){ terminar(false); },4000);
  fetch(MAPA_CACHE_COMPARTIDO_URL).then(function(r){ return r.ok?r.json():null; }).then(function(d){
    clearTimeout(vencido);
    if(!d || !Array.isArray(d.puntos) || !d.puntos.length){ terminar(false); return; }
    mapPointsData=d.puntos;
    puntosAvisoRelevantes=mapPointsData.filter(function(x){ return CATEGORIAS_AVISO[x.cat]; });
    try{ _renderizarPuntosVisibles(); }catch(e){}
    _mapPointsCacheGuardar();
    terminar(true);
  }).catch(function(){ clearTimeout(vencido); terminar(false); });
}
function subscribeToMapPoints(){
  // Los handlers del mapa se enganchan ANTES del `return` de abajo, y aparte de la
  // suscripción. Motivo: esta función también se llama desde avisarPuntosCercanos(), o sea
  // en pleno viaje y posiblemente SIN haber abierto el mapa todavía (mp === null). En ese
  // caso quedaba `pointsUnsub` seteado pero los handlers sin poner, y cuando el ciclista
  // abría el mapa el `return` temprano cortaba antes de engancharlos: los puntos no se
  // volvían a dibujar al mover ni al hacer zoom en TODA la sesión.
  if(mp && !subscribeToMapPoints._handlers){
    subscribeToMapPoints._handlers=true;
    mp.on('moveend', _renderizarPuntosVisiblesThrottled);
    mp.on('zoomend', _renderizarPuntosVisiblesThrottled);
  }
  if(pointsUnsub) return;
  const cache=_mapPointsCacheLeer();
  if(!cache && !subscribeToMapPoints._semillaIntentada){
    subscribeToMapPoints._semillaIntentada=true;
    pointsUnsub=function(){}; // guarda de reentrada mientras se resuelve el fetch async
    _mapPointsSemillaEstatica(function(ok){
      if(ok){ pointsUnsub=null; subscribeToMapPoints(); return; }
      _mapPointsSemillaCompartida(function(){ pointsUnsub=null; subscribeToMapPoints(); });
    });
    return;
  }
  let consulta=db.collection('recommendations');
  if(cache){
    // Pintar YA con lo que hay en el teléfono, sin esperar a la red.
    mapPointsData=cache.puntos;
    puntosAvisoRelevantes=mapPointsData.filter(function(d){ return CATEGORIAS_AVISO[d.cat]; });
    try{ _renderizarPuntosVisibles(); }catch(e){}
    if(cache.maxTs>0) consulta=consulta.where('ts','>',firebase.firestore.Timestamp.fromMillis(cache.maxTs));
  }
  const incremental=!!(cache && cache.maxTs>0);
  pointsUnsub=consulta.onSnapshot(_mapPointsAplicar, function(e){
    // Si la consulta incremental falla (p.ej. por un índice que falta), no alcanza con
    // borrar la caché para la próxima sesión: el mapa se quedaría con los puntos viejos
    // TODA esta sesión. Se rehace la suscripción completa acá mismo, una sola vez —
    // `_mapPointsReintento` evita que un error persistente entre en bucle.
    try{ localStorage.removeItem(MAPPOINTS_CACHE_KEY); }catch(_){}
    if(incremental && !subscribeToMapPoints._reintento){
      subscribeToMapPoints._reintento=true;
      try{ if(pointsUnsub) pointsUnsub(); }catch(_){}
      pointsUnsub=null;
      mapPointsData=[];
      subscribeToMapPoints();
    }
  });
  // (el enganche de moveend/zoomend subió al principio de la función, ver la nota de allá)
}
function _renderizarPuntosVisiblesThrottled(){
  if(mapPointsRenderTimer) clearTimeout(mapPointsRenderTimer);
  mapPointsRenderTimer=setTimeout(_renderizarPuntosVisibles, 250);
}
// Metros por pixel en Mercator (misma fórmula que usa el ScaleControl nativo de
// MapLibre) — depende de la latitud, no solo del zoom: Chile va de Arica (~-18°) a
// Punta Arenas (~-53°), y a un mismo zoom un grado de longitud mide bastante menos
// cerca del polo que cerca del ecuador. Sin esto, un umbral fijo en "zoom" muestra
// los puntos a escalas reales distintas según en qué parte del país estés.
function _kmPorPixel(zoom, lat){ return 156543.03392804097 * Math.cos(lat*Math.PI/180) / Math.pow(2, zoom) / 1000; }
// "Escala visible" = km reales que representa una referencia de 100px en el centro
// del mapa — el mismo criterio que el ScaleControl de la esquina, para que "30 km"
// acá sea el mismo "30 km" que se ve dibujado en el mapa.
function _escalaVisibleKm(mapa){ const c=mapa.getCenter(); return _kmPorPixel(mapa.getZoom(), c.lat) * 100; }
// Con miles de puntos sembrados desde OpenStreetMap, mostrarlos todos apenas se abre
// el mapa a nivel país los inunda de íconos de mirador. El tope ahora escala con el
// zoom: casi nada a nivel país, más a nivel ciudad, todos los que entren en pantalla
// a nivel calle.
function _maxRenderParaZoom(zoom){
  if(zoom<6) return 0;
  if(zoom<9) return 40;
  if(zoom<12) return 150;
  return MAPPOINTS_MAX_RENDER;
}
// 2026-08-21 (pedido de Inty, ajustado en vivo probando varios valores): agua,
// miradores y demás puntos de interés (comunidad Y sembrados) solo se ven con el
// mapa a ~30 km de escala visible o más cerca — más alejado que eso se ven
// amontonados y ensucian el mapa. Los ciclistas NO tienen este límite, se ven
// siempre sin importar la escala.
// Categorías de los puntos del mapa (agua/comida/mirador/etc, sembrados de OSM +
// comunidad). Mismo patrón que REPORTE_CATS/_repIco (Font Awesome a color, no emoji) --
// reusa el mismo ícono y color de "mirador"/"taller" que REPORTE_CATS ya usa para que un
// mismo concepto no se vea distinto según de qué lista salió el punto.
const LP_PUNTO_CAT={
  agua:{fa:'droplet',c:'#38bdf8',l:'Agua'},
  comida:{fa:'utensils',c:'#f59e0b',l:'Comida'},
  vista:{fa:'mountain-sun',c:'#3b82f6',l:'Vista'},
  mirador:{fa:'mountain-sun',c:'#3b82f6',l:'Mirador'},
  camping:{fa:'campground',c:'#10b981',l:'Camping'},
  taller:{fa:'screwdriver-wrench',c:'#22d3ee',l:'Taller'},
  hostel:{fa:'house',c:'#ffd700',l:'Hospedaje'},
  seguridad:{fa:'shield-halved',c:'#ff4d4d',l:'Seguridad'}
};
function _lpPopupPunto(titulo,desc,cat,lat,lon){
  const x=LP_PUNTO_CAT[cat]||{fa:'location-dot',c:'#fc4c02'};
  return '<div class="lp-pop" style="--cc:'+x.c+'"><div class="lp-ic"><i class="fas fa-'+x.fa+'"></i></div><div class="lp-body"><div class="lp-t">'+escapeHTML(titulo||'Punto')+'</div>'+(desc?'<div class="lp-d">'+escapeHTML(desc)+'</div>':'')+'<a href="#" class="lp-cta" onclick="irAlPuntoYNavegar('+lat+','+lon+');return false"><i class="fas fa-compass"></i> Ir aquí</a></div></div>';
}
function _renderizarPuntosVisibles(){
  if(!mp) return;
  if(mp._pts){ mp._pts.forEach(function(m){ mp.removeLayer(m); }); }
  mp._pts=[];
  if(_escalaVisibleKm(mp) > 30) return;
  const b=mp.getBounds(), margen=0.08;
  const w=b.getWest()-margen, e=b.getEast()+margen, s=b.getSouth()-margen, n=b.getNorth()+margen;
  const enVista=mapPointsData.filter(function(d){ return !(d.lon<w||d.lon>e||d.lat<s||d.lat>n); });
  const comunidad=enVista.filter(function(d){ return d.user!=='osm-data'; });
  const sembrados=enVista.filter(function(d){ return d.user==='osm-data'; });
  const maxSembrados=_maxRenderParaZoom(mp.getZoom());
  const paso=Math.max(1, Math.ceil(sembrados.length/Math.max(1,maxSembrados)));
  const pintar=function(d){
    const cat=LP_PUNTO_CAT[d.cat]||{fa:'location-dot',c:'#fc4c02'};
    const m=mlMarker([d.lat,d.lon],{icon:{html:lpBadgeHTML('<i class="fas fa-'+cat.fa+'"></i>',cat.c)}}).addTo(mp);
    m.bindPopup(_lpPopupPunto(d.title,d.desc,d.cat,d.lat,d.lon));
    mp._pts.push(m);
  };
  comunidad.forEach(pintar);
  if(maxSembrados>0) sembrados.forEach(function(d,i){ if(i%paso===0) pintar(d); });
}
// Aviso anticipado por voz: cuando te acercas a ~300m de un mirador, punto de agua u
// hospedaje real del mapa (sembrado o de la comunidad), Pistero avisa una sola vez
// por punto (no se repite ni satura si hay varios seguidos: uno por tick como máximo).
var puntosAvisados=new Set(); // var a propósito: reseteada desde fuera de este archivo al iniciar navegación
let puntosAvisoRelevantes=[];
const CATEGORIAS_AVISO={agua:'agua', mirador:'mirador', vista:'mirador', hostel:'hospedaje'};
const FRASES_AVISO={agua:'Ojo, a unos metros hay un punto de agua marcado por la comunidad.', mirador:'Ojo, a unos metros hay un mirador marcado por la comunidad.', hospedaje:'Ojo, a unos metros hay un hospedaje marcado por la comunidad.'};
// ~300m de margen grueso en grados (sobra, es solo para descartar barato antes del
// cálculo real de distancia, que es harto más caro por la trigonometría).
const AVISO_MARGEN_DEG=0.01;
/* BUG REAL (Inty, 2026-07-14): "avisó del mirador mucho después de que lo pasé".
   El radio era un CÍRCULO FIJO de 300m — y un círculo NO tiene dirección: estar 300m DESPUÉS
   del punto también cumple <=300. Con muestras de GPS separadas (en auto, o con la pantalla
   apagada) la primera muestra que cae dentro del círculo puede ser cuando YA lo pasaste → te
   avisa tarde, cuando ya no sirve de nada. Fix: radio escalado a la velocidad (~25s de
   anticipación) + avisar SOLO si la distancia viene bajando (te estás acercando). */
let _distPrevPunto={};
function avisarPuntosCercanos(lat,lon,speed){
  // Los puntos se suscriben normalmente al abrir el mapa; si el ciclista nunca lo
  // abrió (arrancó directo a navegar), los pedimos igual aquí para que el aviso
  // funcione sin depender de haber visitado esa pantalla primero.
  if(!pointsUnsub) subscribeToMapPoints();
  if(!puntosAvisoRelevantes.length || !vozActiva || vozOcupada() || vozCola.length) return;
  const _vms=Math.max(2,(speed||0)/3.6);
  const _radio=Math.max(300, _vms*25); // bici ~300m, auto a 82 ~570m: siempre ~25s antes
  for(let i=0;i<puntosAvisoRelevantes.length;i++){
    const d=puntosAvisoRelevantes[i];
    if(Math.abs(d.lat-lat)>AVISO_MARGEN_DEG || Math.abs(d.lon-lon)>AVISO_MARGEN_DEG) continue; // descarte barato
    const tipo=CATEGORIAS_AVISO[d.cat];
    const id=d.id||(d.lat+','+d.lon);
    if(puntosAvisados.has(id)) continue;
    const _dist=calculateDistance(lat,lon,d.lat,d.lon);
    const _prev=_distPrevPunto[id]; _distPrevPunto[id]=_dist;
    const _acercandose=(_prev===undefined)||(_dist<_prev); // si ya lo dejaste atrás, avisar no sirve
    if(_dist<=_radio && _acercandose){
      puntosAvisados.add(id);
      const nombre=(d.title||'').replace(/^[^\wÁÉÍÓÚáéíóúñÑ]+/,'').trim();
      h(FRASES_AVISO[tipo]+(nombre?(' '+nombre+'.'):''));
      return;
    }
  }
}
function toggleRadarOnMap(){
  radarActive=!radarActive;
  if(radarActive){
    cv('map');
    if(radarCircle){ mp.removeLayer(radarCircle); radarCircle=null; }
    if(sm.length===0) subscribeToUsers();
    h("Radar activado. Buscándote a ti primero.");
    // Primero te ubica A TI (el usuario principal): si hay un ciclista en la otra
    // punta del mundo, antes esto hacía zoom out hasta el planeta entero y tu propio
    // punto quedaba perdido. Ahora siempre centra en tu posición real.
    setTimeout(function(){
      if(!mp) return;
      const yo=currentUserLocation || (us.la!=null?{lat:us.la,lon:us.lo}:null);
      if(yo){ mp.setView([yo.lat,yo.lon],13); }
      else {
        const pts=sm.map(function(m){ return m.getLatLng(); });
        if(pts.length>=2){ mp.fitBounds(mlLatLngBounds(pts).pad(0.3)); }
        else if(pts.length===1){ mp.setView(pts[0], 4); }
        else { mp.setView([20,0], 2); }
      }
      h(sm.length>0 ? ("Encontré "+sm.length+" ciclista"+(sm.length>1?"s":"")+" en el mundo. Tócalos en el mapa para ver quiénes son.") : "Por ahora no hay otros ciclistas con ubicación visible. ¡Pronto se sumarán a la ruta!");
    }, 1300);
  } else {
    sm.forEach(function(m){mp.removeLayer(m);}); sm=[];
    if(radarCircle){ mp.removeLayer(radarCircle); radarCircle=null; }
    h("Radar desactivado.");
  }
}
