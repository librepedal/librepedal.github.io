/* ================================================================
   foto-viaje.js — "Foto del viaje" (diseño aprobado por Inty el 2026-10-16, maqueta
   disenos-ui/foto-del-viaje/, artifact HYYmRzB81WJF5LFGoJinKz: "me gustan esas dos").
   ================================================================
   - El MAPA PEQUEÑO: mapa vectorial de OpenStreetMap (OpenFreeMap) con relieve sombreado
     (DEM Terrarium, AWS Open Data), en los colores de la app, con la ruta en naranja.
   - El BLOQUE DE DATOS: nombre y fecha, distancia, tiempo en movimiento, desnivel y la
     altimetría (perfil de subidas y bajadas).
   - Con foto del usuario: la foto arriba, el mapa pequeño encima de ella y el bloque abajo.
     Sin foto: el mapa grande es la imagen, con el mismo bloque. La foto es opcional.
   - Formatos: Historia 9:16 (1080x1920) y Publicación 4:5 (1080x1350).
   - Datos REALES (auditoría "sin datos falsos", 2026-10-15): tiempo en movimiento calculado de
     los puntos; desnivel y altimetría del perfil topográfico de la ruta (el mismo de "Perfil de
     elevación", rutas.js) o, sin señal, de la altitud del GPS. Si no hay altitud, no se muestran
     (nunca un 0 inventado).
   - El mapa se dibuja con MapLibre, que se carga recién al abrir esta pantalla. Sin señal (o si
     el mapa no carga en 15 s) la tarjeta queda con el trazo solo sobre fondo oscuro.
   - Compartir: navigator.share con archivo (web y app con @capacitor/share vía compartir-nativo.js);
     si no se puede, lpGuardarArchivo (descarga / menú de la app). */

/* ---------- datos (funciones puras: tests/foto-viaje.test.mjs) ---------- */
function _fvDistM(a, b){
  var R = 6371000, toR = Math.PI / 180;
  var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
function _fvT(p){ var t = p && (p.t != null ? p.t : p.timestamp); return (typeof t === 'number' && isFinite(t)) ? t : null; }
function _fvAlt(p){ var a = p && (p.alt != null ? p.alt : p.ele); return (typeof a === 'number' && isFinite(a)) ? a : null; }
function _fvPuntos(pts){
  return (pts || []).map(function(p){ return { lat: +p.lat, lon: +(p.lon != null ? p.lon : p.lng), t: _fvT(p), alt: _fvAlt(p) }; })
    .filter(function(p){ return isFinite(p.lat) && isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180; });
}
// Tiempo en movimiento: tramos entre 2 y 90 km/h y de menos de 10 min entre puntos.
function _fvStats(ruta){
  var pts = _fvPuntos(ruta && ruta.points);
  var km = (ruta && typeof ruta.distance === 'number' && ruta.distance > 0) ? ruta.distance : 0;
  var kmPts = 0, movMs = 0;
  for(var i = 1; i < pts.length; i++){
    var d = _fvDistM(pts[i - 1], pts[i]); kmPts += d / 1000;
    var t0 = pts[i - 1].t, t1 = pts[i].t;
    if(t0 != null && t1 != null && t1 > t0){
      var dt = t1 - t0, v = (d / 1000) / (dt / 3600000);
      if(dt < 600000 && v >= 2 && v <= 90) movMs += dt;
    }
  }
  if(!(km > 0)) km = kmPts;
  var t0r = (ruta && ruta.startTime) || (pts[0] && pts[0].t), t1r = (ruta && ruta.endTime) || (pts.length && pts[pts.length - 1].t);
  var totalMs = (t0r && t1r && t1r > t0r) ? (t1r - t0r) : 0;
  if(totalMs > 0 && movMs > totalMs) movMs = totalMs;
  return { km: km, movMs: movMs, velMov: movMs > 0 ? km / (movMs / 3600000) : 0, puntos: pts };
}
// Perfil {perfil:[{dist,alt}], subida, altMax, altMin} -> forma que dibuja la altimetría. null si no sirve.
function _fvPerfil(d){
  if(!d || !d.perfil || d.perfil.length < 3) return null;
  var p = d.perfil.filter(function(x){ return x && isFinite(x.alt) && isFinite(x.dist); });
  if(p.length < 3) return null;
  var mn = Infinity, mx = -Infinity; p.forEach(function(x){ if(x.alt < mn) mn = x.alt; if(x.alt > mx) mx = x.alt; });
  return { perfil: p, subida: Math.max(0, Math.round(d.subida || 0)), altMin: Math.round(mn), altMax: Math.round(mx) };
}
function _fvHoras(ms){
  var m = Math.round((ms || 0) / 60000);
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
}
function _fvNum(n, dec){ return (Number(n) || 0).toFixed(dec).replace('.', ','); }
// Datos que se imprimen, en orden. Los que no hay (sin tiempo, sin altitud) no aparecen.
function _fvDatos(st, perfil){
  var out = [{ v: _fvNum(st.km, st.km >= 100 ? 0 : 1), u: 'km', l: 'Distancia' }];
  if(st.movMs >= 60000) out.push({ v: _fvHoras(st.movMs), u: 'h', l: 'En movimiento' });
  if(perfil) out.push({ v: String(perfil.subida), u: 'm', l: 'Desnivel +' });
  else if(st.velMov > 0) out.push({ v: _fvNum(st.velMov, 1), u: 'km/h', l: 'Vel. media' });
  return out;
}
function _fvFecha(r){
  try{ return r && r.startTime ? new Date(r.startTime).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) : ''; }catch(e){ return ''; }
}
// Mercator para el trazo sin mapa (proyección de los mapas web).
function _fvMercY(lat){ var la = Math.max(-85, Math.min(85, lat)) * Math.PI / 180; return -Math.log(Math.tan(Math.PI / 4 + la / 2)) * 180 / Math.PI; }
function _fvEncajar(pts, x, y, w, h, margen){
  var P = pts.map(function(p){ return [p.lon, _fvMercY(p.lat)]; });
  var a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  P.forEach(function(p){ if(p[0] < a) a = p[0]; if(p[0] > b) b = p[0]; if(p[1] < c) c = p[1]; if(p[1] > d) d = p[1]; });
  var s = Math.min((w - 2 * margen) / Math.max(1e-9, b - a), (h - 2 * margen) / Math.max(1e-9, d - c));
  var ox = x + (w - (b - a) * s) / 2, oy = y + (h - (d - c) * s) / 2;
  return P.map(function(p){ return [ox + (p[0] - a) * s, oy + (p[1] - c) * s]; });
}

/* ---------- mapa con relieve (MapLibre, se carga solo aquí) ---------- */
var FV_ML_URL = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
var FV_ML_SRI = 'sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj';
var FV_ESTILO = 'https://tiles.openfreemap.org/styles/dark';
var FV_DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
var _fvMlProm = null;
function _fvCargarMapLibre(){
  if(window.maplibregl) return Promise.resolve(window.maplibregl);
  if(_fvMlProm) return _fvMlProm;
  _fvMlProm = new Promise(function(ok, mal){
    var s = document.createElement('script'); s.src = FV_ML_URL; s.integrity = FV_ML_SRI; s.crossOrigin = 'anonymous';
    s.onload = function(){ window.maplibregl ? ok(window.maplibregl) : mal(new Error('sin maplibregl')); };
    s.onerror = function(){ _fvMlProm = null; mal(new Error('no cargó MapLibre')); };
    document.head.appendChild(s);
  });
  return _fvMlProm;
}
// Colores "noche Libre Pedal" sobre el estilo oscuro de OpenFreeMap (mismos de la maqueta aprobada).
function _fvTemaNoche(map){
  map.getStyle().layers.forEach(function(l){
    try{
      var id = l.id;
      if(l.type === 'background') map.setPaintProperty(id, 'background-color', '#0e1628');
      else if(l.type === 'fill' && /water/.test(id)) map.setPaintProperty(id, 'fill-color', '#0a2440');
      else if(l.type === 'fill' && /park|wood|landcover|grass|forest/.test(id)) map.setPaintProperty(id, 'fill-color', '#12203a');
      else if(l.type === 'line' && /water|river|stream/.test(id)) map.setPaintProperty(id, 'line-color', '#123a62');
      else if(l.type === 'line' && /(road|highway|street|path|track|bridge|tunnel)/.test(id) && !/casing|outline/.test(id)) map.setPaintProperty(id, 'line-color', '#3b4d6e');
      else if(l.type === 'line' && /casing|outline|rail/.test(id)) map.setPaintProperty(id, 'line-color', '#17233b');
      else if(l.type === 'line' && /boundary|admin/.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
      else if(l.type === 'symbol'){
        map.setPaintProperty(id, 'text-color', '#a9bad3'); map.setPaintProperty(id, 'text-halo-color', '#0e1628'); map.setPaintProperty(id, 'text-halo-width', 1.4);
        if(/poi|housenumber|shield/.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
      }
    }catch(e){}
  });
  map.addSource('fv-dem', { type: 'raster-dem', tiles: [FV_DEM], tileSize: 256, encoding: 'terrarium', maxzoom: 14 });
  var primera = map.getStyle().layers.find(function(l){ return l.type === 'line' || l.type === 'symbol'; });
  map.addLayer({ id: 'fv-relieve', type: 'hillshade', source: 'fv-dem', paint: { 'hillshade-shadow-color': '#050912', 'hillshade-highlight-color': '#3a5683', 'hillshade-accent-color': '#0a1222', 'hillshade-exaggeration': 0.55, 'hillshade-illumination-direction': 315 } }, primera && primera.id);
}
var _fvMapas = {}; // caché en esta sesión: clave ruta+tamaño -> {img, pts}
// Devuelve {img: canvas w x h, pts: [[x,y]...]} o null (sin señal / falla). Nunca rechaza.
function _fvMapa(clave, puntos, w, h){
  var k = clave + '|' + w + 'x' + h;
  if(_fvMapas[k]) return _fvMapas[k];
  _fvMapas[k] = _fvCargarMapLibre().then(function(ml){
    return new Promise(function(ok){
      var cont = document.createElement('div');
      cont.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + w + 'px;height:' + h + 'px;pointer-events:none;opacity:0';
      document.body.appendChild(cont);
      var map, listo = false;
      var fin = function(r){ if(listo) return; listo = true; clearTimeout(tope); try{ map && map.remove(); }catch(e){} cont.remove(); ok(r); };
      var tope = setTimeout(function(){ fin(null); }, 25000); // teléfonos modestos: la tarjeta grande puede tardar
      try{
        map = new ml.Map({ container: cont, style: FV_ESTILO, interactive: false, attributionControl: false, preserveDrawingBuffer: true, pixelRatio: 1, fadeDuration: 0 });
      }catch(e){ fin(null); return; }
      map.on('error', function(){ /* una tesela que falla no tumba el mapa; el tope de 15 s cubre el resto */ });
      map.on('load', function(){
        try{
          _fvTemaNoche(map);
          var b = new ml.LngLatBounds([puntos[0].lon, puntos[0].lat], [puntos[0].lon, puntos[0].lat]);
          puntos.forEach(function(p){ b.extend([p.lon, p.lat]); });
          map.fitBounds(b, { padding: Math.round(Math.min(w, h) * 0.12), animate: false });
        }catch(e){ fin(null); return; }
        map.once('idle', function(){
          setTimeout(function(){
            try{
              var c = document.createElement('canvas'); c.width = w; c.height = h;
              c.getContext('2d').drawImage(map.getCanvas(), 0, 0, w, h);
              var pts = puntos.map(function(p){ var q = map.project([p.lon, p.lat]); return [q.x, q.y]; });
              fin({ img: c, pts: pts });
            }catch(e){ fin(null); }
          }, 300);
        });
      });
    });
  }).catch(function(){ return null; });
  _fvMapas[k].then(function(r){ if(!r) delete _fvMapas[k]; }); // sin señal: se reintenta la próxima vez
  return _fvMapas[k];
}

/* ---------- dibujo ---------- */
var FV_FORMATOS = { historia: { w: 1080, h: 1920, n: 'Historia' }, post: { w: 1080, h: 1350, n: 'Publicación' } };
var FV_NAR = '#fc4c02', FV_FONDO = '#0a0f1d';
var FV_DISP = '"Barlow Condensed","Arial Narrow",system-ui,sans-serif', FV_TXT = 'Barlow,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
var _fvLogo = null;
function _fvCargarLogo(){
  if(_fvLogo) return _fvLogo;
  _fvLogo = new Promise(function(ok){ var i = new Image(); i.onload = function(){ ok(i); }; i.onerror = function(){ ok(null); }; i.src = 'logo-transparent.png'; });
  return _fvLogo;
}
// La tipografía del diseño aprobado (Barlow / Barlow Condensed) no la carga el resto de la app: se pide aquí.
function _fvFuentes(){
  var tope = new Promise(function(ok){ setTimeout(ok, 3000); });
  try{
    var hoja = document.getElementById('fvFuentes'), cargo;
    if(!hoja){
      hoja = document.createElement('link'); hoja.id = 'fvFuentes'; hoja.rel = 'stylesheet';
      hoja.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@500;600&display=swap';
      cargo = new Promise(function(ok){ hoja.onload = ok; hoja.onerror = ok; });
      document.head.appendChild(hoja);
    }else cargo = Promise.resolve();
    // primero la hoja (si no, fonts.load no conoce las fuentes y responde al tiro sin nada), después las fuentes
    var listo = cargo.then(function(){
      if(!document.fonts || !document.fonts.load) return;
      return Promise.all([document.fonts.load('700 80px "Barlow Condensed"'), document.fonts.load('600 24px Barlow')]);
    });
    return Promise.race([listo, tope]).catch(function(){});
  }catch(e){ return tope; }
}
function _fvRedondo(ctx, x, y, w, h, r){
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function _fvSombra(ctx, b, c){ ctx.shadowColor = c || 'rgba(0,0,0,.55)'; ctx.shadowBlur = b; ctx.shadowOffsetY = b / 4; }
function _fvSinSombra(ctx){ ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
function _fvTexto(ctx, t, x, y, font, color, align){ ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(t, x, y); }
function _fvEspaciado(ctx, t, x, y, font, color, sp){
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  var cx = x; for(var i = 0; i < t.length; i++){ ctx.fillText(t[i], cx, y); cx += ctx.measureText(t[i]).width + sp; } return cx - x;
}
// Corta el texto a un ancho, en hasta `lineas` líneas (la última con "…" si no cabe).
function _fvLineas(ctx, t, ancho, lineas){
  var pal = String(t || '').split(/\s+/), out = [], cur = '';
  for(var i = 0; i < pal.length; i++){
    var prueba = cur ? cur + ' ' + pal[i] : pal[i];
    if(ctx.measureText(prueba).width <= ancho || !cur) cur = prueba; else { out.push(cur); cur = pal[i]; }
  }
  if(cur) out.push(cur);
  if(out.length > lineas){ out = out.slice(0, lineas); var u = out[lineas - 1]; while(u.length > 1 && ctx.measureText(u + '…').width > ancho) u = u.slice(0, -1); out[lineas - 1] = u.replace(/\s+$/, '') + '…'; }
  return out;
}
function _fvTrazo(ctx, xy, g){
  if(xy.length < 2) return;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); xy.forEach(function(p, i){ i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
  ctx.save(); ctx.shadowColor = 'rgba(252,76,2,.9)'; ctx.shadowBlur = g * 2.6; ctx.strokeStyle = 'rgba(252,76,2,.85)'; ctx.lineWidth = g; ctx.stroke(); ctx.restore();
  ctx.strokeStyle = 'rgba(10,15,29,.55)'; ctx.lineWidth = g + 6; ctx.stroke();
  ctx.strokeStyle = FV_NAR; ctx.lineWidth = g; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,214,190,.9)'; ctx.lineWidth = Math.max(1.5, g * 0.22); ctx.stroke();
  var a = xy[0], b = xy[xy.length - 1], r = g * 1.15;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a[0], a[1], r + 4, 0, 7); ctx.fill(); ctx.fillStyle = '#3ddc84'; ctx.beginPath(); ctx.arc(a[0], a[1], r, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b[0], b[1], r + 4, 0, 7); ctx.fill(); ctx.fillStyle = FV_NAR; ctx.beginPath(); ctx.arc(b[0], b[1], r, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b[0], b[1], r * 0.42, 0, 7); ctx.fill();
}
// Tarjeta del mapa: con mapa real si llegó, si no el trazo sobre fondo oscuro. Siempre con borde blanco.
function _fvTarjetaMapa(ctx, mapa, puntos, x, y, w, h, radio, grosor){
  ctx.save(); _fvSombra(ctx, 40, 'rgba(0,0,0,.6)'); _fvRedondo(ctx, x, y, w, h, radio); ctx.fillStyle = '#0e1628'; ctx.fill(); _fvSinSombra(ctx); ctx.clip();
  if(mapa && mapa.img){
    var kx = w / mapa.img.width, ky = h / mapa.img.height;
    ctx.drawImage(mapa.img, x, y, w, h);
    _fvTrazo(ctx, mapa.pts.map(function(p){ return [x + p[0] * kx, y + p[1] * ky]; }), grosor);
  }else{
    var g = ctx.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, '#16223a'); g.addColorStop(1, '#0b1222'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    _fvTrazo(ctx, _fvEncajar(puntos, x, y, w, h, Math.min(w, h) * 0.12), grosor);
  }
  ctx.restore();
  _fvRedondo(ctx, x, y, w, h, radio); ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 3; ctx.stroke();
  if(mapa && mapa.img) _fvTexto(ctx, '© OpenStreetMap', x + w - 16, y + h - 14, '500 16px ' + FV_TXT, 'rgba(255,255,255,.6)', 'right');
}
// Altimetría: área con degradado naranja, línea, máx. arriba a la derecha y mín. abajo a la izquierda.
function _fvAltimetria(ctx, perfil, x, y, w, h){
  var P = perfil.perfil, dt = P[P.length - 1].dist || 1, mn = perfil.altMin, mx = perfil.altMax, span = Math.max(1, mx - mn);
  var X = function(p){ return x + (p.dist / dt) * w; }, Y = function(p){ return y + h - ((p.alt - mn) / span) * h; };
  ctx.beginPath(); P.forEach(function(p, i){ i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p)); }); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
  var gp = ctx.createLinearGradient(0, y, 0, y + h); gp.addColorStop(0, 'rgba(252,76,2,.55)'); gp.addColorStop(1, 'rgba(252,76,2,0)'); ctx.fillStyle = gp; ctx.fill();
  ctx.beginPath(); P.forEach(function(p, i){ i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p)); });
  ctx.strokeStyle = FV_NAR; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
  _fvTexto(ctx, 'máx. ' + mx + ' m', x + w, y - 12, '600 21px ' + FV_TXT, 'rgba(255,255,255,.6)', 'right');
  _fvTexto(ctx, 'mín. ' + mn + ' m', x, y + h + 32, '600 21px ' + FV_TXT, 'rgba(255,255,255,.6)', 'left');
}
// Bloque de datos: nombre, fecha, cifras y altimetría. Devuelve nada; dibuja desde `top`.
function _fvBloque(ctx, o, W, top, post){
  var M = 64, datos = _fvDatos(o.stats, o.perfil);
  ctx.font = '700 ' + (post ? 52 : 58) + 'px ' + FV_DISP;
  var lin = _fvLineas(ctx, o.titulo, W - 2 * M, post ? 1 : 2), y = top + (post ? 48 : 52);
  lin.forEach(function(l, i){ _fvTexto(ctx, l, M, y + i * (post ? 54 : 60), '700 ' + (post ? 52 : 58) + 'px ' + FV_DISP, '#fff'); });
  y += (lin.length - 1) * (post ? 54 : 60);
  if(o.fecha){ _fvEspaciado(ctx, o.fecha.toUpperCase(), M, y + 42, '600 23px ' + FV_TXT, 'rgba(255,255,255,.68)', 2.5); }
  var cw = (W - 2 * M) / datos.length, yv = y + (post ? 150 : 172), tam = post ? 82 : 92;
  datos.forEach(function(d, i){
    var x = M + cw * i, f = tam;
    ctx.font = '700 ' + f + 'px ' + FV_DISP;
    while(f > 50 && ctx.measureText(d.v).width + 70 > cw - 16){ f -= 4; ctx.font = '700 ' + f + 'px ' + FV_DISP; }
    var vw = ctx.measureText(d.v).width;
    _fvTexto(ctx, d.v, x, yv, '700 ' + f + 'px ' + FV_DISP, '#fff');
    _fvTexto(ctx, d.u, x + vw + 8, yv, '700 ' + Math.round(f * 0.4) + 'px ' + FV_DISP, FV_NAR);
    _fvEspaciado(ctx, d.l.toUpperCase(), x, yv + 36, '600 22px ' + FV_TXT, 'rgba(255,255,255,.72)', 2.5);
  });
  return yv + 36;
}
// La foto cubre SOLO su zona (0..H): sin el recorte, una foto vertical se pasaba por debajo del bloque de datos.
function _fvFondoFoto(ctx, W, H, foto){
  var s = Math.max(W / foto.width, H / foto.height), w = foto.width * s, h = foto.height * s;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.drawImage(foto, (W - w) / 2, (H - h) / 2, w, h);
  ctx.restore();
}
// o: {foto?, formato, stats, perfil?, mapa?, titulo, fecha, logo?}
function fvDibujar(canvas, o){
  var F = FV_FORMATOS[o.formato] || FV_FORMATOS.historia, W = F.w, H = F.h, post = o.formato === 'post', M = 64;
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = FV_FONDO; ctx.fillRect(0, 0, W, H);
  var tieneAlt = !!o.perfil;
  // dónde empieza el bloque de datos (cabe nombre, fecha, cifras y, si hay, altimetría)
  var alto = post ? (tieneAlt ? 450 : 300) : (tieneAlt ? 650 : 420);
  var top = H - alto - (post ? 24 : 40);
  if(o.foto){
    _fvFondoFoto(ctx, W, top + 60, o.foto);
    var g = ctx.createLinearGradient(0, top - 220, 0, top + 60); g.addColorStop(0, 'rgba(10,15,29,0)'); g.addColorStop(1, FV_FONDO);
    ctx.fillStyle = g; ctx.fillRect(0, top - 220, W, 280);
    var t = ctx.createLinearGradient(0, 0, 0, 230); t.addColorStop(0, 'rgba(5,8,16,.5)'); t.addColorStop(1, 'rgba(5,8,16,0)'); ctx.fillStyle = t; ctx.fillRect(0, 0, W, 230);
    var lado = post ? 400 : 540;
    _fvTarjetaMapa(ctx, o.mapa, o.stats.puntos, M, top - lado - 10, lado, lado, 32, post ? 8 : 9);
  }else{
    var r = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, W); r.addColorStop(0, 'rgba(252,76,2,.20)'); r.addColorStop(1, 'rgba(252,76,2,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    var my = post ? 150 : 190, mh = top - my - 30;
    _fvTarjetaMapa(ctx, o.mapa, o.stats.puntos, M, my, W - 2 * M, mh, 36, 11);
  }
  // marca arriba
  if(o.logo){ var lw = post ? 104 : 118, lh = lw * o.logo.height / o.logo.width; _fvSombra(ctx, 14); ctx.drawImage(o.logo, M, post ? 30 : 48, lw, lh); _fvSinSombra(ctx); }
  else _fvTexto(ctx, 'LIBRE PEDAL', M, post ? 90 : 108, '700 46px ' + FV_DISP, '#fff');
  // bloque de datos
  var fin = _fvBloque(ctx, o, W, top, post);
  if(tieneAlt){
    var py = fin + (post ? 50 : 70), ph = post ? 110 : H - 70 - 60 - py;
    _fvAltimetria(ctx, o.perfil, M, py, W - 2 * M, Math.max(90, Math.min(post ? 110 : 230, ph)));
  }
  if(!post) _fvTexto(ctx, 'librepedal.cl', W - M, H - 40, '600 24px ' + FV_TXT, 'rgba(255,255,255,.6)', 'right');
  return canvas;
}

/* ---------- pantalla ---------- */
var _fv = null; // { ruta, clave, stats, perfil, foto, formato, mapa, logo }
function _fvCerrar(){ var c = document.getElementById('fvCapa'); if(c) c.remove(); _fv = null; }
function _fvMapaParaFormato(){
  if(!_fv) return Promise.resolve(null);
  var post = _fv.formato === 'post', tieneAlt = !!_fv.perfil;
  var w, h;
  if(_fv.foto){ w = h = post ? 400 : 540; }
  else{ var alto = post ? (tieneAlt ? 450 : 300) : (tieneAlt ? 650 : 420), H = post ? 1350 : 1920, top = H - alto - (post ? 24 : 40), my = post ? 150 : 190; w = 1080 - 128; h = top - my - 30; }
  return _fvMapa(_fv.clave, _fv.stats.puntos, Math.round(w), Math.round(h));
}
async function _fvRender(){
  if(!_fv) return;
  var cv = document.getElementById('fvCanvas'); if(!cv) return;
  var gen = (_fv.gen = (_fv.gen || 0) + 1);
  var est = document.getElementById('fvEstado');
  var datos = { foto: _fv.foto, formato: _fv.formato, stats: _fv.stats, perfil: _fv.perfil, titulo: _fv.ruta.nombreRuta || 'Mi viaje en bici', fecha: _fvFecha(_fv.ruta), logo: _fv.logo, mapa: null };
  // 1) al tiro con el trazo solo; 2) cuando llega el mapa con relieve, se repinta
  var pMapa = _fvMapaParaFormato(), yaListo = false;
  pMapa.then(function(){ yaListo = true; });
  await Promise.resolve();
  fvDibujar(cv, datos);
  if(est && !yaListo){ est.hidden = false; est.textContent = 'Cargando el mapa…'; }
  var mapa = await pMapa;
  if(!_fv || gen !== _fv.gen) return;
  if(mapa){ datos.mapa = mapa; fvDibujar(cv, datos); }
  if(est){ if(mapa) est.hidden = true; else { est.hidden = false; est.textContent = 'Sin conexión: la ruta va sin el mapa de fondo.'; } }
  _fvBotones();
}
function _fvBotones(){
  if(!_fv) return;
  document.querySelectorAll('#fvCapa [data-fv-formato]').forEach(function(b){ var on = b.getAttribute('data-fv-formato') === _fv.formato; b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  var bf = document.getElementById('fvBtnFoto'); if(bf) bf.innerHTML = '<i class="fas fa-camera"></i> ' + (_fv.foto ? 'Cambiar foto' : 'Agregar tu foto');
  var bq = document.getElementById('fvBtnQuitar'); if(bq) bq.hidden = !_fv.foto;
}
function _fvElegirFoto(){ var inp = document.getElementById('fvArchivo'); if(!inp) return; inp.value = ''; inp.click(); }
function _fvFotoElegida(file){
  if(!file || !_fv) return;
  var url = URL.createObjectURL(file), im = new Image();
  im.onload = function(){ if(_fv){ _fv.foto = im; _fvRender(); } setTimeout(function(){ URL.revokeObjectURL(url); }, 1000); };
  im.onerror = function(){ URL.revokeObjectURL(url); lpAviso('No pude abrir esa foto. Prueba con otra.'); };
  im.src = url;
}
function _fvBlob(){
  var cv = document.getElementById('fvCanvas');
  return new Promise(function(ok){ try{ cv.toBlob(function(b){ ok(b); }, 'image/jpeg', 0.92); }catch(e){ ok(null); } });
}
async function _fvCompartir(){
  if(!_fv) return;
  var b = await _fvBlob(); if(!b){ lpAviso('No se pudo armar la imagen. Inténtalo de nuevo.'); return; }
  var nombre = 'libre-pedal-viaje.jpg', file = new File([b], nombre, { type: 'image/jpeg' });
  try{
    if(navigator.canShare && navigator.canShare({ files: [file] })){
      await navigator.share({ files: [file], title: 'Mi viaje en Libre Pedal', text: _fvNum(_fv.stats.km, 1) + ' km con Libre Pedal · librepedal.cl' });
      return;
    }
  }catch(e){ if(e && e.name === 'AbortError') return; }
  var r = await lpGuardarArchivo(b, nombre, 'Mi viaje en Libre Pedal');
  if(r === 'descargado') lpAviso('Imagen guardada en Descargas. Súbela a tus redes desde ahí.');
}
async function _fvGuardar(){
  if(!_fv) return;
  var b = await _fvBlob(); if(!b){ lpAviso('No se pudo armar la imagen. Inténtalo de nuevo.'); return; }
  var r = await lpGuardarArchivo(b, 'libre-pedal-viaje.jpg', 'Mi viaje en Libre Pedal');
  if(r === 'descargado') lpAviso('Imagen guardada en Descargas.');
}
// Perfil: el topográfico guardado de la ruta (rutas.js, v:2); si no, el del GPS al tiro y se afina con el topográfico.
function _fvPerfilInicial(r){
  if(r.elevDEM && r.elevDEM.v === 2) return _fvPerfil(r.elevDEM);
  try{ return (typeof calcularDesnivel === 'function') ? _fvPerfil(calcularDesnivel(r.points)) : null; }catch(e){ return null; }
}
function _fvAfinarPerfil(r){
  if((r.elevDEM && r.elevDEM.v === 2) || typeof calcularDesnivelDEM !== 'function') return;
  calcularDesnivelDEM(r.points).then(function(d){
    var p = _fvPerfil(d);
    if(!p || !_fv || _fv.ruta !== r) return;
    _fv.perfil = p; _fvRender();
    try{ // se guarda igual que "Perfil de elevación" para no volver a pedirlo
      d.v = 2;
      if(r.localId && typeof rutasLocales === 'function'){ var arr = rutasLocales(), x = arr.find(function(y){ return y.localId === r.localId; }); if(x){ x.elevDEM = d; rutasLocalesSet(arr); } }
      if(r.firebaseId && typeof db !== 'undefined') db.collection('routes').doc(r.firebaseId).update({ elevDEM: d }).catch(function(){});
    }catch(e){}
  }).catch(function(){});
}
function fvAbrirConRuta(ruta){
  if(!ruta || !ruta.points || ruta.points.length < 2){ lpAviso('Esa ruta no tiene puntos para dibujarla.'); return; }
  _fvCerrar();
  _fv = { ruta: ruta, clave: ruta.localId || ruta.firebaseId || String(ruta.startTime || Date.now()), stats: _fvStats(ruta), perfil: _fvPerfilInicial(ruta), foto: null, formato: 'historia', logo: null };
  var capa = document.createElement('div'); capa.id = 'fvCapa'; capa.className = 'fv-capa';
  capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', 'Foto del viaje');
  capa.innerHTML = ''
    + '<div class="fv-top"><button type="button" class="fv-volver" aria-label="Volver"><i class="fas fa-arrow-left"></i></button><h3>Foto del viaje</h3>'
    + '<div class="fv-seg" role="group" aria-label="Formato"><button type="button" data-fv-formato="historia">Historia</button><button type="button" data-fv-formato="post">Publicación</button></div></div>'
    + '<div class="fv-lienzo"><canvas id="fvCanvas" aria-label="Vista previa de la imagen para compartir"></canvas>'
    + '<div class="fv-sobre"><button type="button" id="fvBtnFoto" class="fv-pill"></button><button type="button" id="fvBtnQuitar" class="fv-pill fv-pill-x" aria-label="Quitar la foto (solo el mapa)" title="Quitar la foto" hidden><i class="fas fa-xmark"></i></button></div></div>'
    + '<div class="fv-ctrl"><p id="fvEstado" class="fv-estado" hidden></p><button type="button" id="fvBtnGuardar" class="fv-btn fv-sec"><i class="fas fa-download"></i> Guardar</button>'
    + '<button type="button" id="fvBtnCompartir" class="fv-btn fv-pri"><i class="fas fa-share-nodes"></i> Compartir</button>'
    + '<input type="file" id="fvArchivo" accept="image/*" hidden></div>';
  document.body.appendChild(capa);
  capa.querySelector('.fv-volver').onclick = _fvCerrar;
  capa.querySelectorAll('[data-fv-formato]').forEach(function(b){ b.onclick = function(){ if(!_fv) return; _fv.formato = b.getAttribute('data-fv-formato'); _fvBotones(); _fvRender(); }; });
  document.getElementById('fvBtnFoto').onclick = _fvElegirFoto;
  document.getElementById('fvBtnQuitar').onclick = function(){ if(_fv){ _fv.foto = null; _fvRender(); } };
  document.getElementById('fvBtnCompartir').onclick = _fvCompartir;
  document.getElementById('fvBtnGuardar').onclick = _fvGuardar;
  document.getElementById('fvArchivo').onchange = function(e){ _fvFotoElegida(e.target.files && e.target.files[0]); };
  _fvBotones();
  Promise.all([_fvCargarLogo(), _fvFuentes()]).then(function(r){ if(_fv){ _fv.logo = r[0]; _fvRender(); } });
  _fvAfinarPerfil(ruta);
}
// Desde "Mis rutas". Igual que exportarRutaGPX: local primero; si la ruta solo está en la nube,
// _traerPuntosRuta trae el track exacto (es tuya).
function fvAbrir(id){
  var r = (typeof _rutaPorId === 'function') ? _rutaPorId(id) : null;
  if(r && r.points && r.points.length){ fvAbrirConRuta(r); return; }
  if(typeof _traerPuntosRuta === 'function'){
    _traerPuntosRuta(id, function(pts, doc){ fvAbrirConRuta(Object.assign({}, doc || {}, r || {}, { points: pts || [] })); });
    return;
  }
  lpAviso('No encontré esa ruta.');
}
function fvDesdeResumen(){
  var m = document.getElementById('resumenViajeModal'); if(m) m.classList.remove('on');
  fvAbrirUltima();
}
// Desde el resumen al terminar un viaje: la ruta recién guardada (la más nueva).
function fvAbrirUltima(){
  var arr = (typeof rutasLocales === 'function') ? rutasLocales() : [];
  var r = arr.slice().sort(function(a, b){ return (b.savedAt || b.startTime || 0) - (a.savedAt || a.startTime || 0); })[0];
  if(!r){ lpAviso('Todavía no hay un viaje guardado para la foto.'); return; }
  fvAbrirConRuta(r);
}

/* ---------- hoja "Compartir" de cada ruta (Mis rutas) ----------
   Un solo botón "Compartir" que abre esta hoja, con la foto como opción principal (maqueta aprobada,
   "dónde va cada botón"). El GPX NO va aquí: tiene su propio botón de descarga (retro de Inty, ver
   tests/video-compartir-redes.test.mjs: "compartir es compartir"). */
function fvHojaCompartir(id){
  var vieja = document.getElementById('fvHoja'); if(vieja) vieja.remove();
  var h = document.createElement('div'); h.id = 'fvHoja'; h.className = 'fv-hoja-velo';
  h.innerHTML = '<div class="fv-hoja" role="dialog" aria-label="Compartir este viaje"><div class="fv-asa"></div>'
    + '<button type="button" class="fv-op fv-op-dest" data-a="foto"><span class="fv-op-ic"><i class="fas fa-camera"></i></span><span><b>Foto del viaje</b><small>El mapa con tu ruta y tus datos, con tu foto si quieres</small></span></button>'
    + '<button type="button" class="fv-op" data-a="vuelo"><span class="fv-op-ic"><i class="fas fa-helicopter"></i></span><span><b>Sobrevuelo del viaje</b><small>Tu ruta en 3D</small></span></button>'
    + '<button type="button" class="fv-op" data-a="texto"><span class="fv-op-ic"><i class="fas fa-comment"></i></span><span><b>Enviar por mensaje</b><small>Los km y el link de la app</small></span></button>'
    + '</div>';
  document.body.appendChild(h);
  var cerrar = function(){ h.remove(); };
  h.addEventListener('click', function(e){ if(e.target === h) cerrar(); });
  h.querySelectorAll('[data-a]').forEach(function(b){
    b.onclick = function(){
      var a = b.getAttribute('data-a'); cerrar();
      if(a === 'foto') fvAbrir(id);
      else if(a === 'vuelo' && typeof verSobrevueloRuta === 'function') verSobrevueloRuta(id);
      else if(a === 'texto' && typeof compartirViaje === 'function') compartirViaje(id);
    };
  });
}
