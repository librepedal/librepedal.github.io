// ===== Avisos del Taller fuera de la sección (2026-10-04, pedido de Inty: "la app debe
// avisar cuando ya se necesita hacer cualquier cosa, un aviso, no solo mostrar en la
// sección"). Antes los avisos de mantención solo corrían dentro de au() -- o sea, SOLO
// mientras se grababa un viaje con el GPS -- y como burbuja de Pistero dentro de la app.
// Quien no salía a pedalear nunca se enteraba de que se le vencía la Revisión Técnica.
//
// Tres capas, de la más fuerte a la más suave:
//  1. Notificaciones del teléfono PROGRAMADAS (llegan con la app cerrada): fechas que se
//     conocen de antemano -- documentos a 30 días, 7 días y el día; ítems que vencen por
//     tiempo; el recordatorio mensual del odómetro. Usa @capacitor/local-notifications,
//     que ya viene en la app desde la v8.800 (no necesita versión nueva en Play).
//  2. Notificación inmediata al cruzar un umbral de km (durante o al terminar un viaje).
//  3. Recuadro en la Esfera de Inicio con lo pendiente + revisión al abrir la app.
// En el navegador (sin app instalada) solo existen la 3 y la burbuja de Pistero.
//
// Un solo dueño de los ids de notificación: 7100-7899 programadas, 7900-7989 inmediatas.
const TALLER_NOTIF_ID_MIN=7100, TALLER_NOTIF_ID_MAX=7989;
const TALLER_HORA_AVISO=10; // 10:00 hora local: ni de madrugada ni a la hora de dormir

function _tallerPlugin(){ try{ return (typeof lpPlugin==='function') ? lpPlugin('LocalNotifications') : null; }catch(e){ return null; } }
function _tallerNotifBiciActiva(){ try{ return localStorage.getItem('lp_taller_notif_bici')!=='0'; }catch(e){ return true; } }
function _tallerNotifVehActiva(){ return !(us.vehCfg && us.vehCfg.notif===false); }

// Lista de lo que hay que hacer ahora (vencido o por vencer), para el recuadro de Inicio.
function _tallerPendientes(){
  const out=[];
  try{
    if(typeof _mantData==='function'){
      const md=_mantData();
      Object.keys(MANT_ITEMS).forEach(function(k){ const p=_mantProgreso(k, md); if(p.vencido||p.cerca) out.push({sec:'bici', t:MANT_ITEMS[k].l+(p.vencido?' (toca ya)':' (pronto)'), vencido:p.vencido}); });
    }
    if(typeof _vehEnUso==='function' && _vehEnUso()){
      const vd=_vehData();
      _vehItemsVisibles().forEach(function(k){ const p=_vehProgreso(k, vd); if(p.vencido||p.cerca) out.push({sec:'veh', t:VEH_ITEMS[k].l+(p.vencido?' (vencido)':' (pronto)'), vencido:p.vencido}); });
      _docRecalcular(false);
      const dd=_docData(), cfg=us.vehCfg||null;
      Object.keys(DOC_ITEMS).forEach(function(k){
        if(k==='permisoCuota2' && !(cfg && cfg.cuotas)) return;
        const e=_docEstado(k, dd);
        if(e.estado==='vencido'||e.estado==='porVencer') out.push({sec:'veh', t:DOC_ITEMS[k].l+(e.estado==='vencido'?' (vencido)':' (en '+e.dias+' días)'), vencido:e.estado==='vencido'});
      });
    }
  }catch(e){}
  return out;
}
function _tallerActualizarBanner(){
  const b=document.getElementById('esTallerAviso'); if(!b) return;
  const pend=_tallerPendientes();
  if(!pend.length){ b.style.display='none'; return; }
  const hayVencido=pend.some(function(p){ return p.vencido; });
  b.style.borderColor = hayVencido ? '#ef4444' : '#eab308';
  const t1=document.getElementById('esTallerAvisoT1'), t2=document.getElementById('esTallerAvisoT2');
  if(t1) t1.textContent = pend.length===1 ? '1 cosa por hacer' : (pend.length+' cosas por hacer');
  if(t2) t2.textContent = pend.slice(0,2).map(function(p){ return p.t; }).join(' · ')+(pend.length>2?' · …':'');
  b.style.display='flex';
}
function _tallerAbrir(){
  try{ if(typeof cerrarEsfera==='function') cerrarEsfera(); }catch(e){}
  cv('mac');
  try{ if(typeof _renderTaller==='function') _renderTaller(); }catch(e){}
}

// ---- Notificaciones del teléfono ----
function _tallerFechaAviso(fechaISO, diasAntes){
  // fechaISO 'YYYY-MM-DD' -> Date a las 10:00 locales, `diasAntes` días antes.
  const p=String(fechaISO).slice(0,10).split('-').map(Number);
  if(p.length!==3 || p.some(function(n){ return !isFinite(n); })) return null;
  return new Date(p[0], p[1]-1, p[2]-diasAntes, TALLER_HORA_AVISO, 0, 0);
}
function _tallerFechaVenceTiempo(fechaUltimo, meses){
  const f=new Date(fechaUltimo); if(isNaN(f.getTime()) || !(meses>0)) return null;
  return new Date(f.getFullYear(), f.getMonth()+meses, f.getDate(), TALLER_HORA_AVISO, 0, 0);
}
// Arma la lista completa de notificaciones futuras (pura: no toca el plugin). Exportada
// para los tests.
function _tallerNotificacionesFuturas(ahora){
  ahora=ahora||new Date();
  const lista=[]; let id=TALLER_NOTIF_ID_MIN;
  function add(fecha, titulo, cuerpo){
    if(!fecha || fecha.getTime()<=ahora.getTime()+60000) return;
    if(id>7899) return;
    lista.push({id:id++, title:titulo, body:cuerpo, at:fecha});
  }
  try{
    if(typeof _vehEnUso==='function' && _vehEnUso() && _tallerNotifVehActiva()){
      _docRecalcular(false);
      const dd=_docData(), cfg=us.vehCfg||null;
      Object.keys(DOC_ITEMS).forEach(function(k){
        if(k==='permisoCuota2' && !(cfg && cfg.cuotas)) return;
        const d=dd[k]; if(!d || !d.vence) return;
        const n=DOC_ITEMS[k].l, fem=!!DOC_ITEMS[k].f;
        add(_tallerFechaAviso(d.vence,30), n+': vence en 30 días', 'Vence el '+_tallerFechaTxt(d.vence)+'. Agénda'+(fem?'la':'lo')+' con tiempo.');
        add(_tallerFechaAviso(d.vence,7),  n+': vence en 7 días',  'Vence el '+_tallerFechaTxt(d.vence)+'. No '+(fem?'la':'lo')+' dejes para el final.');
        add(_tallerFechaAviso(d.vence,0),  n+': vence hoy',         (k==='permisoCuota2' ? 'Hoy es el último día para pagar la segunda cuota del Permiso.' : ((fem?'La ':'El ')+n+' vence hoy. Sin '+(fem?'ella':'él')+' no puedes circular.')));
      });
      const vd=_vehData();
      _vehItemsVisibles().forEach(function(k){
        const d=vd[k]; if(!d || !d.umbralMeses || !d.fecha) return;
        add(_tallerFechaVenceTiempo(d.fecha, d.umbralMeses), VEH_ITEMS[k].l+': le toca', 'Se cumple el plazo por tiempo de tu '+VEH_ITEMS[k].l.toLowerCase()+'. Revísalo en Taller.');
      });
      if(cfg && cfg.odoFecha){
        const f=new Date(cfg.odoFecha);
        if(!isNaN(f.getTime())) add(new Date(f.getFullYear(), f.getMonth(), f.getDate()+30, TALLER_HORA_AVISO, 0, 0), '¿Cuántos km marca tu '+(cfg.tipo==='moto'?'moto':'auto')+'?', 'Actualiza el odómetro en Taller para que los avisos de mantención calcen.');
      }
    }
    if(typeof _mantData==='function' && _tallerNotifBiciActiva()){
      const md=_mantData();
      Object.keys(MANT_ITEMS).forEach(function(k){
        const d=md[k]; if(!d || !d.umbralMeses || !d.fecha) return;
        add(_tallerFechaVenceTiempo(d.fecha, d.umbralMeses), MANT_ITEMS[k].l+': toca revisar', 'Se cumple el plazo de revisión de tu bici. Mira el detalle en Taller.');
      });
    }
  }catch(e){}
  return lista;
}
function _tallerFechaTxt(iso){
  try{ return new Date(String(iso).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long'}); }catch(e){ return iso; }
}
let _tallerProgramando=false;
async function _tallerProgramarNotificaciones(){
  const ln=_tallerPlugin(); if(!ln || _tallerProgramando) return;
  _tallerProgramando=true;
  try{
    const perm=await ln.checkPermissions();
    if(!perm || perm.display!=='granted') return;
    // Cancela SOLO las nuestras (otras partes de la app podrían usar el plugin).
    const pend=await ln.getPending();
    const nuestras=((pend && pend.notifications)||[]).filter(function(n){ const i=Number(n.id); return i>=TALLER_NOTIF_ID_MIN && i<=7899; }).map(function(n){ return {id:Number(n.id)}; });
    if(nuestras.length) await ln.cancel({notifications:nuestras});
    const lista=_tallerNotificacionesFuturas();
    // isExactNotification:false en todos los schedule: el manifest quita SCHEDULE_EXACT_ALARM
    // (46896db), y sin él el plugin abre "Alarmas y recordatorios" y el schedule() nunca
    // resuelve (probado en emulador 2026-10-04). Unos minutos de holgura no importan aquí.
    if(lista.length){
      await ln.schedule({notifications:lista.map(function(n){ return {id:n.id, title:n.title, body:n.body, schedule:{at:n.at, allowWhileIdle:true}, isExactNotification:false}; })});
    }
  }catch(e){
    try{ if(window.Sentry) Sentry.captureException(e, {tags:{donde:'tallerProgramarNotificaciones'}}); }catch(_e){}
  }finally{ _tallerProgramando=false; }
}
let _tallerIdInmediata=7900;
async function _tallerNotificarAhora(titulo, cuerpo){
  const ln=_tallerPlugin(); if(!ln) return;
  try{
    const perm=await ln.checkPermissions();
    if(!perm || perm.display!=='granted') return;
    const id=_tallerIdInmediata; _tallerIdInmediata = _tallerIdInmediata>=TALLER_NOTIF_ID_MAX ? 7900 : _tallerIdInmediata+1;
    await ln.schedule({notifications:[{id:id, title:String(titulo), body:String(cuerpo), schedule:{at:new Date(Date.now()+1500), allowWhileIdle:true}, isExactNotification:false}]});
  }catch(e){}
}
// Pide el permiso de notificaciones EN CONTEXTO (cuando el usuario activa los avisos),
// nunca al abrir la app en frío. Devuelve true si quedó concedido.
async function _tallerPedirPermiso(){
  const ln=_tallerPlugin(); if(!ln) return false;
  try{
    let perm=await ln.checkPermissions();
    if(perm && perm.display==='granted') return true;
    perm=await ln.requestPermissions();
    return !!(perm && perm.display==='granted');
  }catch(e){ return false; }
}
// Llamada tras cualquier cambio en Taller (guardar vehículo, marcar hecho, ajustar).
function _tallerAlCambiar(pedirPermiso){
  _tallerActualizarBanner();
  (async function(){
    if(pedirPermiso){
      const ok=await _tallerPedirPermiso();
      if(!ok && _tallerPlugin()) lpAviso('Sin permiso de notificaciones, te aviso solo dentro de la app. Puedes activarlo en los ajustes del teléfono.');
    }
    await _tallerProgramarNotificaciones();
  })();
  _tallerRenderNotifFila();
}
// Fila "Avisos en el teléfono" en Taller de bici (el vehículo la tiene en "Mi vehículo").
async function _tallerRenderNotifFila(){
  const f=document.getElementById('tallerNotifFila'); if(!f) return;
  const ln=_tallerPlugin();
  if(!ln){ f.style.display='none'; return; }
  let concedido=false;
  try{ const p=await ln.checkPermissions(); concedido=!!(p && p.display==='granted'); }catch(e){}
  const activo=_tallerNotifBiciActiva() && concedido;
  f.style.display='flex';
  f.innerHTML='<span><i class="fas fa-bell"></i> Avisos en el teléfono</span>'
    +(activo ? '<button type="button" class="ab sec" style="margin:0;width:auto;padding:6px 12px" onclick="_tallerNotifBici(false)">Activados · apagar</button>'
             : '<button type="button" class="ab" style="margin:0;width:auto;padding:6px 12px" onclick="_tallerNotifBici(true)">Activar</button>');
}
async function _tallerNotifBici(activar){
  try{ localStorage.setItem('lp_taller_notif_bici', activar?'1':'0'); }catch(e){}
  if(activar){
    const ok=await _tallerPedirPermiso();
    if(!ok){ lpAviso('Sin permiso de notificaciones, te aviso solo dentro de la app. Puedes activarlo en los ajustes del teléfono.'); }
  }
  await _tallerProgramarNotificaciones();
  _tallerRenderNotifFila();
}

// ---- Al abrir la app: revisar, mostrar el recuadro y preguntar el odómetro ----
let _tallerUltimaRevision=0;
async function _tallerAlAbrir(){
  if(typeof us==='undefined' || !us) return;
  if(Date.now()-_tallerUltimaRevision<10*60*1000) return; // a lo más cada 10 minutos
  _tallerUltimaRevision=Date.now();
  try{ if(typeof _mantencionRevisarAvisos==='function') _mantencionRevisarAvisos(); }catch(e){}
  try{ if(typeof _vehRevisarAvisos==='function') _vehRevisarAvisos(); }catch(e){}
  try{ if(typeof _docRevisarAvisos==='function') _docRevisarAvisos(); }catch(e){}
  try{ if(typeof gd==='function') gd(); }catch(e){}
  _tallerActualizarBanner();
  await _tallerProgramarNotificaciones();
  await _tallerPreguntarOdometro();
}
// Una vez al mes (si el vehículo está configurado), y a lo más cada 7 días si la persona
// dijo "ahora no" -- para no insistir.
async function _tallerPreguntarOdometro(){
  try{
    const cfg=us.vehCfg; if(!cfg || typeof cfg!=='object' || !cfg.odoFecha) return;
    const dias=(Date.now()-new Date(cfg.odoFecha).getTime())/86400000;
    if(!(dias>=30)) return;
    let ult=0; try{ ult=Number(localStorage.getItem('lp_odo_preguntado'))||0; }catch(e){}
    if(Date.now()-ult<7*86400000) return;
    try{ localStorage.setItem('lp_odo_preguntado', String(Date.now())); }catch(e){}
    const v=await lpPedirTexto('¿Cuántos km marca hoy tu '+(cfg.tipo==='moto'?'moto':'auto')+'? Así los avisos de mantención calzan con el real (último registro: '+Math.round(us.vehKm||0).toLocaleString('es-CL')+' km).', 'Ej: '+Math.round((us.vehKm||0)+800).toLocaleString('es-CL'));
    if(v==null) return;
    const n=Number(String(v).replace(/[^\d]/g,''));
    if(!n || n<(us.vehKm||0)){ lpAviso('Ese número es menor que el último registro ('+Math.round(us.vehKm||0).toLocaleString('es-CL')+' km). Revísalo en Taller > Mi vehículo.'); return; }
    if(_vehSetOdometro(n)){ gd(); _tallerActualizarBanner(); await _tallerProgramarNotificaciones(); h('Listo, odómetro actualizado.'); }
  }catch(e){}
}
// Arranque: espera a que haya sesión (`cu`) y los datos del usuario (`us`).
(function(){
  let intentos=0;
  function probar(){
    intentos++;
    const listo=(typeof cu!=='undefined' && cu) && (typeof us!=='undefined' && us);
    if(listo){ setTimeout(_tallerAlAbrir, 5000); return; }
    if(intentos<60) setTimeout(probar, 2000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', probar); else probar();
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState==='visible' && typeof cu!=='undefined' && cu) _tallerAlAbrir();
  });
})();
