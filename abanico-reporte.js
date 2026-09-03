/* ================= ABANICO DE REPORTE (v7.29) =================
   ADITIVO: el botón "Reportar" del mapa (#fabReportar) despliega un abanico animado
   con Peligro · Control · Servicio · Mirador (los 4 de la SPEC). Cada opción abre el
   MODAL de reporte que YA existe (reportarEnRuta) con la categoría preseleccionada
   (seleccionarCatReporte) — NO edita ni reemplaza el sistema de reportes maduro.
   Se cierra solo si no se elige (timeout) o al volver a tocar el botón. */
var _abnTimer=null;
function _cerrarAbanico(){ var f=document.getElementById('abanicoReporte'); if(f) f.classList.remove('on'); if(_abnTimer){ clearTimeout(_abnTimer); _abnTimer=null; } }
// 2026-08-23: cada botón del abanico ya NO abre reportarEnRuta() (el modal de las 11
// categorías completas) — abre un desplegable chico ahí mismo con solo los sub-tipos
// de esa categoría. reportarEnRuta()/seleccionarCatReporte() quedan sin usar (no se
// borran: no rompe nada dejarlas, y documentan cómo era el flujo viejo si hiciera
// falta revisarlo). Pedido directo de Inty tras probar el flujo real: "esto tiene que
// ser rápido" — te lleva a otra pantalla con todo para buscar, eso se saca.
var REP_FAN_GRUPO={critico:'peligro', policia:'control', util:'servicio', mirador:'lugar'};
function _abanicoElegir(cat, btnEl){
  _cerrarAbanico();
  _abrirSubmenuReporte(cat, btnEl);
}
function _clickFueraSubmenuReporte(e){ var d=document.getElementById('repSubmenu'); if(d && !d.contains(e.target)) _cerrarSubmenuReporte(); }
function _cerrarSubmenuReporte(){ var d=document.getElementById('repSubmenu'); if(d) d.remove(); document.removeEventListener('click', _clickFueraSubmenuReporte, true); }
function _abrirSubmenuReporte(catFan, btnEl){
  try{
    _cerrarSubmenuReporte();
    var grupo=REP_FAN_GRUPO[catFan]; if(!grupo) return;
    var items=Object.keys(REPORTE_CATS).filter(function(k){ return REPORTE_CATS[k].g===grupo; });
    var d=document.createElement('div'); d.id='repSubmenu'; d.className='rep-drop';
    d.innerHTML=items.map(function(k){
      var c=REPORTE_CATS[k];
      return '<button type="button" class="rep-drop-item" onclick="_elegirSubcategoriaReporte(\''+k+'\')"><span class="rdi-ic" style="color:'+c.c+'">'+_repIco(c)+'</span>'+c.l+'</button>';
    }).join('');
    document.body.appendChild(d);
    if(btnEl){
      var r=btnEl.getBoundingClientRect();
      d.style.right=Math.max(8,(window.innerWidth-r.left+8))+'px';
      d.style.top=Math.max(8, Math.min(window.innerHeight-d.offsetHeight-8, r.top+r.height/2-d.offsetHeight/2))+'px';
    } else { d.style.right='14px'; d.style.top='120px'; }
    requestAnimationFrame(function(){ d.classList.add('on'); });
    setTimeout(function(){ document.addEventListener('click', _clickFueraSubmenuReporte, true); }, 0);
  }catch(e){ try{ if(window.Sentry) Sentry.captureException(e); }catch(_e){} }
}
function _cerrarReporteRapido(){
  var q=document.getElementById('repQuick'); if(q) q.remove();
  reporteMapa=null; reporteMapaCoords=null; reporteMapaMarker=null;
}
function _elegirSubcategoriaReporte(key){
  try{
    _cerrarSubmenuReporte();
    reporteCatSel=key;
    reporteMapa=null; reporteMapaCoords=null; reporteMapaMarker=null; // mismo reset que reportarEnRuta()
    var c=REPORTE_CATS[key]; if(!c) return;
    var extra = key==='superficie'
      ? '<div id="repSuperficieExtra" style="margin-bottom:8px"><select id="repSuperficieTipo"><option value="">Tipo de superficie...</option>'+Object.keys(SUPERFICIE_TIPOS).map(function(k){return '<option value="'+k+'">'+SUPERFICIE_TIPOS[k]+'</option>';}).join('')+'</select><select id="repDificultad" style="margin-top:6px"><option value="">Dificultad del tramo...</option>'+Object.keys(DIFICULTAD_NIVELES).map(function(k){return '<option value="'+k+'">'+DIFICULTAD_NIVELES[k]+'</option>';}).join('')+'</select></div>'
      : '';
    var html=''
      +'<div class="rq-head"><span class="rq-ic" style="color:'+c.c+'">'+_repIco(c)+'</span><span class="rq-t">'+c.l+'</span><button type="button" class="rq-close" onclick="_cerrarReporteRapido()" title="Cerrar">&times;</button></div>'
      +'<div class="rq-loc"><i class="fas fa-location-dot"></i> Publicando en tu ubicación actual</div>'
      +extra
      +'<textarea id="repText" rows="2" placeholder="Descripción (opcional)..." maxlength="500" style="width:100%;background:#000;border:1px solid #333;color:#fff;border-radius:10px;padding:9px;font-size:0.85rem"></textarea>'
      +'<button type="button" class="ab sec" id="btnReporteMapa" style="margin-top:8px" onclick="toggleReporteMapa()"><i class="fas fa-location-dot"></i> No estoy ahí: marcar el punto en el mapa</button>'
      +'<div id="reporte-mapa-manual" style="display:none;margin-top:8px"><div id="reporte-mapa-manual-inner" style="height:180px;border-radius:10px;overflow:hidden"></div><p id="reporteMapaEstado" class="rq-hint">Toca el mapa donde está el punto exacto — no tiene que ser donde estás parado tú ahora.</p></div>'
      +'<button type="button" class="rq-pub" onclick="enviarReporte()"><i class="fas fa-paper-plane"></i> Publicar (+15 Darma)</button>';
    var q=document.getElementById('repQuick');
    if(!q){ q=document.createElement('div'); q.id='repQuick'; q.className='rep-quick'; document.body.appendChild(q); }
    q.innerHTML=html;
    requestAnimationFrame(function(){ q.classList.add('on'); });
  }catch(e){ try{ if(window.Sentry) Sentry.captureException(e); }catch(_e){} }
}
function abrirAbanicoReporte(){
  try{
    var f=document.getElementById('abanicoReporte');
    if(f && f.classList.contains('on')){ _cerrarAbanico(); return; }
    if(!f){
      // 2026-08-23: los emoji (⚠️👮🏪📸) salen por pedido directo de Inty ("íconos
      // genéricos") — se reemplazan por SVG propios estilo lucide (mismo trazo de
      // 1.7px que ya usan los íconos de la esfera), elegidos tras revisar cómo lo
      // resuelven Waze (triángulo de alerta para peligro, insignia/escudo para
      // control — no un dibujo literal de policía) y Komoot (set de línea limpia
      // para los POI de la ruta). Opción A elegida por Inty sobre una alternativa
      // en placa de color.
      var opts=[
        {l:'Peligro', i:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>', c:'#ef4444', cat:'critico'},
        {l:'Control', i:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', c:'#3b82f6', cat:'policia'},
        {l:'Servicio',i:'<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M9 21v-7h6v7"/>', c:'#f59e0b', cat:'util'},
        {l:'Mirador', i:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.2"/>', c:'#3b82f6', cat:'mirador'}
      ];
      f=document.createElement('div'); f.id='abanicoReporte';
      f.innerHTML=opts.map(function(o,i){ return '<button type="button" class="abn-op" style="--d:'+(i*45)+'ms;border-color:'+o.c+'" onclick="_abanicoElegir(\''+o.cat+'\',this)"><span class="abn-e" style="color:'+o.c+'"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+o.i+'</svg></span>'+o.l+'</button>'; }).join('');
      var fab=document.getElementById('fabReportar');
      if(fab && fab.parentNode) fab.parentNode.appendChild(f); else document.body.appendChild(f);
    }
    // forzar reflow para que la transición corra aunque se acabe de crear
    void f.offsetWidth;
    f.classList.add('on');
    if(_abnTimer) clearTimeout(_abnTimer);
    _abnTimer=setTimeout(_cerrarAbanico, 6000);
  }catch(e){ try{ if(window.Sentry) Sentry.captureException(e); }catch(_e){} }
}
/* =============== FIN ABANICO DE REPORTE =============== */
