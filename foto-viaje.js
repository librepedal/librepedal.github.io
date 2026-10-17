/* ================================================================
   foto-viaje.js — "Foto del viaje": tu foto + un mapa pequeño de la ruta + los datos del viaje,
   lista para compartir (pedido de Inty 2026-10-16, "como lo hace Strava").
   ================================================================
   - Formatos: Historia 9:16 (1080x1920) y Publicación 4:5 (1080x1350).
   - Estilos: "Mapa y datos" (mapa pequeño en una tarjeta + datos), "Ruta sobre la foto" (el trazo
     dibujado encima de la foto, sin mapa) y "Solo datos".
   - Sin foto también funciona (fondo oscuro de la app).
   - Datos REALES de la ruta guardada (regla "sin datos falsos", auditoría 2026-10-15):
     · tiempo EN MOVIMIENTO calculado de los puntos (no la hora de inicio a fin, que incluye paradas);
     · desnivel solo si los puntos traen altitud, con el mismo umbral de 3 m que el resto de la app;
       si no hay altitud, el dato no se muestra (nunca se inventa un 0).
   - Mapa: teselas oscuras de CARTO (datos de OpenStreetMap, permiten CORS). Si no cargan (sin señal),
     la tarjeta queda con el trazo solo, sin romper la imagen. Atribución dentro de la imagen.
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
// Tiempo en movimiento: tramos entre 2 y 90 km/h y de menos de 10 min entre puntos (con la pantalla
// apagada llegan cada 15-30 s: eso cuenta; una parada larga o un salto imposible, no).
function _fvStats(ruta){
  var pts = _fvPuntos(ruta && ruta.points);
  var km = (ruta && typeof ruta.distance === 'number' && ruta.distance > 0) ? ruta.distance : 0;
  var kmPts = 0, movMs = 0, sube = 0, conAlt = 0, ref = null;
  for(var i = 1; i < pts.length; i++){
    var d = _fvDistM(pts[i - 1], pts[i]); kmPts += d / 1000;
    var t0 = pts[i - 1].t, t1 = pts[i].t;
    if(t0 != null && t1 != null && t1 > t0){
      var dt = t1 - t0, v = (d / 1000) / (dt / 3600000);
      if(dt < 600000 && v >= 2 && v <= 90) movMs += dt;
    }
  }
  for(var j = 0; j < pts.length; j++){
    var a = pts[j].alt; if(a == null) continue; conAlt++;
    if(ref == null){ ref = a; continue; }
    if(a - ref >= 3){ sube += a - ref; ref = a; } else if(ref - a >= 3){ ref = a; }
  }
  if(!(km > 0)) km = kmPts;
  var t0r = (ruta && ruta.startTime) || (pts[0] && pts[0].t), t1r = (ruta && ruta.endTime) || (pts.length && pts[pts.length - 1].t);
  var totalMs = (t0r && t1r && t1r > t0r) ? (t1r - t0r) : 0;
  if(totalMs > 0 && movMs > totalMs) movMs = totalMs;
  return {
    km: km,
    movMs: movMs,
    velMov: movMs > 0 ? km / (movMs / 3600000) : 0,
    desnivel: conAlt >= Math.max(2, pts.length * 0.5) ? Math.round(sube) : null,
    puntos: pts
  };
}
function _fvDur(ms){
  var m = Math.round((ms || 0) / 60000);
  if(m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min';
}
function _fvNum(n, dec){ return (Number(n) || 0).toFixed(dec).replace('.', ','); }
// Datos que se imprimen, en orden. Los que no hay (sin tiempo, sin altitud) no aparecen.
function _fvDatos(st){
  var out = [{ v: _fvNum(st.km, st.km >= 100 ? 0 : 1), u: 'km', l: 'Distancia' }];
  if(st.movMs > 0) out.push({ v: _fvDur(st.movMs), u: '', l: 'En movimiento' });
  if(st.desnivel != null) out.push({ v: String(st.desnivel), u: 'm', l: 'Desnivel +' });
  if(st.velMov > 0) out.push({ v: _fvNum(st.velMov, 1), u: 'km/h', l: 'Vel. media' });
  return out;
}
// Mercator web (el mismo de los mapas) en píxeles de mundo a zoom z.
function _fvMerc(lat, lon, z){
  var s = 256 * Math.pow(2, z), sin = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180);
  return { x: (lon + 180) / 360 * s, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s };
}
// Zoom y centro para que la ruta quepa en w x h con margen.
function _fvEncuadre(pts, w, h, margen){
  var z = 17;
  for(; z > 1; z--){
    var mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    for(var i = 0; i < pts.length; i++){ var p = _fvMerc(pts[i].lat, pts[i].lon, z); if(p.x < mnx) mnx = p.x; if(p.x > mxx) mxx = p.x; if(p.y < mny) mny = p.y; if(p.y > mxy) mxy = p.y; }
    if(mxx - mnx <= w - 2 * margen && mxy - mny <= h - 2 * margen) return { z: z, cx: (mnx + mxx) / 2, cy: (mny + mxy) / 2 };
  }
  var c = _fvMerc(pts[0].lat, pts[0].lon, 1); return { z: 1, cx: c.x, cy: c.y };
}

/* ---------- dibujo ---------- */
var FV_FORMATOS = { historia: { w: 1080, h: 1920, n: 'Historia' }, post: { w: 1080, h: 1350, n: 'Publicación' } };
var FV_ESTILOS = [{ id: 'mapa', n: 'Mapa y datos' }, { id: 'ruta', n: 'Ruta sobre la foto' }, { id: 'datos', n: 'Solo datos' }];
var _fvTeselas = {}; // caché de imágenes de teselas en esta sesión
function _fvTesela(z, x, y){
  var n = Math.pow(2, z); x = ((x % n) + n) % n;
  var k = z + '/' + x + '/' + y;
  if(_fvTeselas[k]) return _fvTeselas[k];
  _fvTeselas[k] = new Promise(function(ok){
    var im = new Image(); im.crossOrigin = 'anonymous';
    var t = setTimeout(function(){ ok(null); }, 6000);
    im.onload = function(){ clearTimeout(t); ok(im); };
    im.onerror = function(){ clearTimeout(t); ok(null); };
    im.src = 'https://' + 'abcd'[(x + y) % 4] + '.basemaps.cartocdn.com/dark_all/' + z + '/' + x + '/' + y + '@2x.png';
  });
  return _fvTeselas[k];
}
function _fvRedondo(ctx, x, y, w, h, r){
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function _fvTrazo(ctx, xy, grosor){
  if(xy.length < 2) return;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); xy.forEach(function(p, i){ i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = grosor + 8; ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = grosor + 4; ctx.stroke();
  ctx.strokeStyle = '#fc4c02'; ctx.lineWidth = grosor; ctx.stroke();
  var a = xy[0], b = xy[xy.length - 1], r = grosor * 1.35;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(a.x, a.y, r + 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y, r + 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#fc4c02'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
}
// Ruta en un rectángulo: con mapa de fondo (conMapa) o solo el trazo.
async function _fvRutaEn(ctx, pts, x, y, w, h, conMapa, grosor){
  if(pts.length < 2) return;
  var e = _fvEncuadre(pts, w, h, Math.round(Math.min(w, h) * 0.12));
  var ox = e.cx - w / 2, oy = e.cy - h / 2;
  ctx.save(); _fvRedondo(ctx, x, y, w, h, conMapa ? 28 : 0); if(conMapa) ctx.clip();
  if(conMapa){
    ctx.fillStyle = '#0d1426'; ctx.fillRect(x, y, w, h);
    var tx0 = Math.floor(ox / 256), tx1 = Math.floor((ox + w) / 256), ty0 = Math.floor(oy / 256), ty1 = Math.floor((oy + h) / 256);
    var pedidos = [];
    for(var tx = tx0; tx <= tx1; tx++) for(var ty = ty0; ty <= ty1; ty++){
      if(ty < 0 || ty >= Math.pow(2, e.z)) continue;
      (function(tx, ty){ pedidos.push(_fvTesela(e.z, tx, ty).then(function(im){ if(im){ try{ ctx.drawImage(im, x + tx * 256 - ox, y + ty * 256 - oy, 256, 256); }catch(_e){} } })); })(tx, ty);
    }
    await Promise.all(pedidos);
  }
  var xy = pts.map(function(p){ var m = _fvMerc(p.lat, p.lon, e.z); return { x: x + m.x - ox, y: y + m.y - oy }; });
  _fvTrazo(ctx, xy, grosor);
  if(conMapa){
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '600 15px system-ui,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('© OpenStreetMap © CARTO', x + w - 12, y + h - 8);
  }
  ctx.restore();
  if(conMapa){ ctx.save(); _fvRedondo(ctx, x, y, w, h, 28); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); }
}
function _fvFondo(ctx, W, H, foto){
  if(foto){
    var s = Math.max(W / foto.width, H / foto.height), fw = foto.width * s, fh = foto.height * s;
    ctx.drawImage(foto, (W - fw) / 2, (H - fh) / 2, fw, fh);
  }else{
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#162038'); g.addColorStop(.6, '#0a0f1d'); g.addColorStop(1, '#170c06');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var r = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, W * .9); r.addColorStop(0, 'rgba(252,76,2,.28)'); r.addColorStop(1, 'rgba(252,76,2,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }
  // Velo abajo para que los datos se lean sobre cualquier foto (y arriba, para la marca).
  var v = ctx.createLinearGradient(0, H * .5, 0, H); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.78)');
  ctx.fillStyle = v; ctx.fillRect(0, H * .5, W, H * .5);
  var t = ctx.createLinearGradient(0, 0, 0, 220); t.addColorStop(0, 'rgba(0,0,0,.45)'); t.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = t; ctx.fillRect(0, 0, W, 220);
}
function _fvTexto(ctx, txt, x, y, font, color, align){
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 10; ctx.fillText(txt, x, y); ctx.shadowBlur = 0;
}
var FV_TIT = '"Barlow Condensed","Arial Narrow",system-ui,sans-serif';
async function fvDibujar(canvas, o){
  var F = FV_FORMATOS[o.formato] || FV_FORMATOS.historia, W = F.w, H = F.h;
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  try{ if(document.fonts && document.fonts.load) await Promise.race([document.fonts.load('700 80px "Barlow Condensed"'), new Promise(function(ok){ setTimeout(ok, 1500); })]); }catch(e){}
  _fvFondo(ctx, W, H, o.foto);
  var M = 64, st = o.stats, datos = _fvDatos(st);
  // Marca arriba
  _fvTexto(ctx, 'LIBRE PEDAL', M, 112, '700 52px ' + FV_TIT, '#ffffff');
  _fvTexto(ctx, 'librepedal.cl', W - M, 108, '600 30px system-ui,sans-serif', 'rgba(255,255,255,.85)', 'right');
  // Datos abajo: título de la ruta y la fecha, y la fila de cifras.
  var yBase = H - M - 30;
  var cols = datos.length, cw = (W - 2 * M) / cols;
  datos.forEach(function(d, i){
    var cx = M + cw * i;
    _fvTexto(ctx, d.l.toUpperCase(), cx, yBase, '600 26px system-ui,sans-serif', 'rgba(255,255,255,.8)');
    ctx.font = '700 ' + (cols > 3 ? 70 : 84) + 'px ' + FV_TIT;
    var vw = ctx.measureText(d.v).width;
    _fvTexto(ctx, d.v, cx, yBase - 40, '700 ' + (cols > 3 ? 70 : 84) + 'px ' + FV_TIT, '#ffffff');
    if(d.u) _fvTexto(ctx, d.u, cx + vw + 8, yBase - 40, '700 34px ' + FV_TIT, '#fc4c02');
  });
  var yTit = yBase - 40 - (cols > 3 ? 70 : 84) - 34;
  if(o.fecha) _fvTexto(ctx, o.fecha, M, yTit, '600 28px system-ui,sans-serif', 'rgba(255,255,255,.85)');
  if(o.titulo){
    var t = String(o.titulo); ctx.font = '700 50px ' + FV_TIT;
    while(t.length > 4 && ctx.measureText(t).width > W - 2 * M) t = t.slice(0, -2);
    if(t !== String(o.titulo)) t = t.replace(/\s*\S?$/, '') + '…';
    _fvTexto(ctx, t, M, yTit - 44, '700 50px ' + FV_TIT, '#ffffff');
  }
  var techoDatos = yTit - 44 - 60;
  // Ruta
  if(o.estilo === 'mapa' && st.puntos.length > 1){
    var mw = o.formato === 'post' ? 420 : 520, mh = o.formato === 'post' ? 360 : 520;
    await _fvRutaEn(ctx, st.puntos, W - M - mw, techoDatos - mh, mw, mh, true, 9);
  }else if(o.estilo === 'ruta' && st.puntos.length > 1){
    var top = 170, alto = techoDatos - top - 20;
    await _fvRutaEn(ctx, st.puntos, M, top, W - 2 * M, alto, false, 12);
  }
  return canvas;
}

/* ---------- pantalla ---------- */
var _fv = null; // { ruta, stats, foto, formato, estilo }
function _fvCerrar(){ var c = document.getElementById('fvCapa'); if(c) c.remove(); _fv = null; }
function _fvFecha(r){ try{ return r.startTime ? new Date(r.startTime).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; }catch(e){ return ''; } }
async function _fvRender(){
  if(!_fv) return;
  var cv = document.getElementById('fvCanvas'); if(!cv) return;
  var gen = (_fv.gen = (_fv.gen || 0) + 1);
  var tmp = document.createElement('canvas');
  await fvDibujar(tmp, { foto: _fv.foto, formato: _fv.formato, estilo: _fv.estilo, stats: _fv.stats, titulo: _fv.ruta.nombreRuta || 'Mi viaje en bici', fecha: _fvFecha(_fv.ruta) });
  if(!_fv || gen !== _fv.gen) return; // llegó otro cambio mientras se dibujaba
  cv.width = tmp.width; cv.height = tmp.height; cv.getContext('2d').drawImage(tmp, 0, 0);
  _fvChips();
}
function _fvChips(){
  if(!_fv) return;
  document.querySelectorAll('#fvCapa [data-fv-formato]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-fv-formato') === _fv.formato); });
  document.querySelectorAll('#fvCapa [data-fv-estilo]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-fv-estilo') === _fv.estilo); });
  var bf = document.getElementById('fvBtnFoto'); if(bf) bf.innerHTML = '<i class="fas fa-camera"></i> ' + (_fv.foto ? 'Cambiar foto' : 'Agregar tu foto');
}
function _fvElegirFoto(){
  var inp = document.getElementById('fvArchivo'); if(!inp) return;
  inp.value = ''; inp.click();
}
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
  var nombre = 'libre-pedal-viaje.jpg';
  var file = new File([b], nombre, { type: 'image/jpeg' });
  var km = _fvNum(_fv.stats.km, 1);
  try{
    if(navigator.canShare && navigator.canShare({ files: [file] })){
      await navigator.share({ files: [file], title: 'Mi viaje en Libre Pedal', text: km + ' km pedaleados con Libre Pedal · librepedal.cl' });
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
function fvAbrirConRuta(ruta){
  if(!ruta || !ruta.points || ruta.points.length < 2){ lpAviso('Esa ruta no tiene puntos para dibujarla.'); return; }
  _fvCerrar();
  _fv = { ruta: ruta, stats: _fvStats(ruta), foto: null, formato: 'historia', estilo: 'mapa' };
  var chipsF = Object.keys(FV_FORMATOS).map(function(k){ return '<button type="button" class="fv-chip" data-fv-formato="' + k + '">' + FV_FORMATOS[k].n + '</button>'; }).join('');
  var chipsE = FV_ESTILOS.map(function(e){ return '<button type="button" class="fv-chip" data-fv-estilo="' + e.id + '">' + e.n + '</button>'; }).join('');
  var capa = document.createElement('div'); capa.id = 'fvCapa'; capa.className = 'fv-capa';
  capa.innerHTML = ''
    + '<div class="fv-top"><button type="button" class="fv-volver" aria-label="Volver"><i class="fas fa-arrow-left"></i></button><h3>Foto del viaje</h3></div>'
    + '<div class="fv-lienzo"><canvas id="fvCanvas" aria-label="Vista previa de la imagen para compartir"></canvas></div>'
    + '<div class="fv-ctrl">'
    + '<div class="fv-fila">' + chipsE + '</div>'
    + '<div class="fv-fila">' + chipsF + '</div>'
    + '<button type="button" id="fvBtnFoto" class="fv-btn fv-sec"></button>'
    + '<div class="fv-dos"><button type="button" id="fvBtnGuardar" class="fv-btn fv-sec"><i class="fas fa-download"></i> Guardar</button>'
    + '<button type="button" id="fvBtnCompartir" class="fv-btn fv-pri"><i class="fas fa-share-nodes"></i> Compartir</button></div>'
    + '<input type="file" id="fvArchivo" accept="image/*" hidden>'
    + '</div>';
  document.body.appendChild(capa);
  capa.querySelector('.fv-volver').onclick = _fvCerrar;
  capa.querySelectorAll('[data-fv-formato]').forEach(function(b){ b.onclick = function(){ _fv.formato = b.getAttribute('data-fv-formato'); _fvRender(); }; });
  capa.querySelectorAll('[data-fv-estilo]').forEach(function(b){ b.onclick = function(){ _fv.estilo = b.getAttribute('data-fv-estilo'); _fvRender(); }; });
  document.getElementById('fvBtnFoto').onclick = _fvElegirFoto;
  document.getElementById('fvBtnCompartir').onclick = _fvCompartir;
  document.getElementById('fvBtnGuardar').onclick = _fvGuardar;
  document.getElementById('fvArchivo').onchange = function(e){ _fvFotoElegida(e.target.files && e.target.files[0]); };
  _fvChips(); _fvRender();
}
// Desde "Mis rutas" (botón de la cámara). Igual que exportarRutaGPX: local primero; si la ruta solo está
// en la nube, _traerPuntosRuta trae el track exacto (es tuya).
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
