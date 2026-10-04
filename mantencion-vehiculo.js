// ===== Mantención del vehículo + documentación al día (2026-09-06, pedido de Inty:
// "que Pistero recuerde a qué kilometraje le toca la mantención... no es un dato, tiene
// que avisar" + "revisión técnica, permiso de circulación, SOAP, toda la
// documentación"). Mismo motor que mantencion-preventiva.js (bici), pero con su PROPIO
// contador de km (us.vehKm) -- antes de esto, manejar en modo Motorizado sumaba
// kilometraje al desgaste de la CADENA de la bici (_sumarKmMantencion corría para
// cualquier actividad, sin filtrar por actividadTipo). Ver el fix en motor-gps.js:
// ahora cada modo va a su propio contador, ninguno envejece por los km del otro.
//
// v2 (2026-10-04, pedido de Inty: "datos y recomendaciones reales" + "la app debe avisar,
// no solo mostrar en la sección"):
//  - us.vehKm pasa a ser el ODÓMETRO real cuando el usuario lo ingresa (_vehSetOdometro):
//    todos los kmBase se corren en la misma diferencia, así nada pierde lo que llevaba, y
//    los km grabados con GPS siguen sumando encima. Sin odómetro ingresado funciona igual
//    que antes (cuenta desde 0).
//  - Cada ítem acepta el intervalo del manual del usuario (umbralKmUser/umbralMesesUser)
//    y la fecha/km del último cambio real.
//  - Documentos calculados con las reglas reales (ver DOC_ITEMS y _docRecalcular).
//
// Intervalos por defecto -- con fuente, no inventados:
//  - Aceite y filtro: 10.000 km o 12 meses (plan de mantención Toyota Chile: "1 año o
//    10.000 km"). El intervalo exacto es del fabricante: se ajusta por ítem.
//  - Neumáticos: rotar cada ~10.000 km (Michelin: 6.000-8.000 millas o lo que diga el
//    fabricante del vehículo). Edad: desde los 5 años, inspección anual por un profesional;
//    reemplazo a los 10 años desde su fabricación como máximo (Michelin).
//  - Frenos: revisión cada 20.000 km o 24 meses (referencia; manda el manual).
//  - Filtro de aire: 15.000 km o 12 meses (referencia; manda el manual).
//  - Batería: dura 3 a 5 años; desde los 3 años, probarla cada año (AAA).
//  - Cadena de moto: lubricar cada 500 km (manual Honda: cada 300 millas/500 km o antes
//    si se ve seca). Solo se muestra si el vehículo es una moto.
// A diferencia de la bici, NO hay factor de clima (_factorDesgasteClima): la lluvia
// gasta más rápido una cadena expuesta o unos cables sin funda, pero el aceite, los
// frenos y la batería de un vehículo cerrado se rigen por el odómetro real, no por si
// llovió en el camino -- aplicar el mismo multiplicador acá sería copiar sin pensar.
const VEH_ITEMS={
  aceite:     {l:'Aceite y filtro',          fa:'oil-can',        c:'#ef4444', umbralKm:10000, umbralMeses:12, taller:true,  tip:'Cambio de aceite y filtro cada 10.000 km o 12 meses, lo que ocurra primero (plan habitual, por ejemplo Toyota Chile). Si tu manual dice otra cosa, ajústalo abajo.'},
  neumaticos: {l:'Neumáticos',               fa:'circle-dot',     c:'#10b981', umbralKm:10000, umbralMeses:60, taller:true,  tip:'Rota cada ~10.000 km para un desgaste parejo. Desde los 5 años de fabricación, que los revise un profesional una vez al año; cámbialos a los 10 años como máximo aunque se vean bien (Michelin). La fecha está en el costado: DOT y 4 dígitos (semana y año).'},
  frenos:     {l:'Frenos (pastillas/discos)',fa:'hand',           c:'#3b82f6', umbralKm:20000, umbralMeses:24, taller:true,  tip:'Revisión cada 20.000 km o 24 meses como referencia; manda tu manual. Ruido metálico al frenar: no esperes al umbral, ve al taller ahora.'},
  filtroAire: {l:'Filtro de aire',           fa:'wind',           c:'#8b5cf6', umbralKm:15000, umbralMeses:12, taller:false, tip:'Cada 15.000 km o 12 meses como referencia; manda tu manual. Un filtro sucio hace que el motor consuma más.'},
  bateria:    {l:'Batería',                  fa:'car-battery',    c:'#f59e0b', umbralKm:null,  umbralMeses:36, taller:false, tip:'Una batería dura de 3 a 5 años. Desde los 3 años, pide que la prueben una vez al año (AAA). Si cuesta partir en frío, pruébala ya.'},
  cadenaMoto: {l:'Cadena: lubricar',         fa:'link',           c:'#eab308', umbralKm:500,   umbralMeses:null, taller:false, soloMoto:true, tip:'Lubrica la cadena cada 500 km o antes si se ve seca (manual Honda), con lubricante para cadenas de moto. Revisa también la tensión según tu manual.'}
};
function _vehData(){
  if(!us.veh || typeof us.veh!=='object') us.veh={};
  Object.keys(VEH_ITEMS).forEach(function(k){
    if(!us.veh[k]) us.veh[k]={kmBase:(typeof us.vehKm==='number'&&isFinite(us.vehKm))?us.vehKm:0, fecha:new Date().toISOString(), umbralKm:VEH_ITEMS[k].umbralKm, umbralMeses:VEH_ITEMS[k].umbralMeses, historial:[], avisado:false};
    var _vi=us.veh[k];
    if(!_vi.fecha) _vi.fecha=new Date().toISOString();
    // El intervalo del manual del usuario (si lo puso) manda sobre el valor por defecto.
    _vi.umbralKm=(typeof _vi.umbralKmUser==='number' && _vi.umbralKmUser>0) ? _vi.umbralKmUser : VEH_ITEMS[k].umbralKm;
    _vi.umbralMeses=(typeof _vi.umbralMesesUser==='number' && _vi.umbralMesesUser>0) ? _vi.umbralMesesUser : VEH_ITEMS[k].umbralMeses;
  });
  return us.veh;
}
// Llamar SOLO cuando actividadTipo==='moto' (ver motor-gps.js) -- es el odómetro del
// vehículo, no se mezcla con el de la bici.
function _sumarKmVehiculo(km){ if(!(km>0)) return; us.vehKm=(us.vehKm||0)+km; }
function _vehProgreso(key, data){
  const d=(data||_vehData())[key], km=(us.vehKm||0)-(d.kmBase||0);
  let mesesDesde=null;
  if(d.fecha){ mesesDesde=(Date.now()-new Date(d.fecha).getTime())/(1000*60*60*24*30.44); }
  const pctKm = d.umbralKm ? Math.min(1, km/d.umbralKm) : 0;
  const pctMeses = (d.umbralMeses && mesesDesde!=null) ? Math.min(1, mesesDesde/d.umbralMeses) : 0;
  const pct=Math.max(pctKm, pctMeses);
  return {km:km, mesesDesde:mesesDesde, pct:pct, vencido:pct>=1, cerca:(pct>=0.85 && pct<1)};
}
// Configuración del vehículo (v2). Vive en us.vehCfg; se sube a la nube con el resto.
function _vehCfg(){
  if(!us.vehCfg || typeof us.vehCfg!=='object') us.vehCfg={tipo:'auto', digito:null, nuevo:false, chiFecha:null, cuotas:false, notif:true, odoFecha:null};
  return us.vehCfg;
}
function _vehItemsVisibles(){
  const esMoto=_vehCfg().tipo==='moto';
  return Object.keys(VEH_ITEMS).filter(function(k){ return !VEH_ITEMS[k].soloMoto || esMoto; });
}
// Odómetro real: corre TODOS los kmBase en la misma diferencia, así cada ítem conserva
// los km que ya llevaba desde su último cambio; de acá en adelante us.vehKm ES el odómetro.
function _vehSetOdometro(valor){
  const v=Math.round(Number(valor));
  if(!isFinite(v) || v<0 || v>2000000) return false;
  const data=_vehData();
  const delta=v-(us.vehKm||0);
  Object.keys(data).forEach(function(k){ data[k].kmBase=(Number(data[k].kmBase)||0)+delta; });
  us.vehKm=v;
  _vehCfg().odoFecha=new Date().toISOString();
  return true;
}
function _numCL(n){ return Math.round(Number(n)||0).toLocaleString('es-CL'); }
function _leerNumero(id){
  const el=document.getElementById(id); if(!el) return null;
  const limpio=String(el.value||'').replace(/[^\d]/g,'');
  if(!limpio) return null;
  const n=Number(limpio); return isFinite(n) ? n : null;
}
// Gasto del año calendario actual, sumando los costos anotados en el historial.
function _gastoAnio(data){
  const anio=new Date().getFullYear(); let total=0;
  Object.keys(data||{}).forEach(function(k){
    const hist=(data[k] && Array.isArray(data[k].historial)) ? data[k].historial : [];
    hist.forEach(function(r){ if(r && r.fecha && new Date(r.fecha).getFullYear()===anio && typeof r.costo==='number' && isFinite(r.costo) && r.costo>0) total+=r.costo; });
  });
  return total;
}
function renderVehiculoCfg(){
  const cont=document.getElementById('vehCfg'); if(!cont) return;
  const cfg=_vehCfg();
  const res=document.getElementById('vehCfgResumen');
  if(res) res.textContent = (cfg.tipo==='moto'?'Moto':'Auto') + ' · ' + (cfg.odoFecha ? ('odómetro '+_numCL(us.vehKm)+' km') : 'falta el odómetro') + (cfg.digito!=null ? ' · patente termina en '+cfg.digito : '');
  const dig=[1,2,3,4,5,6,7,8,9,0].map(function(n){ return '<option value="'+n+'"'+(cfg.digito===n?' selected':'')+'>'+n+'</option>'; }).join('');
  cont.innerHTML=''
    +'<div class="mi-row" style="margin-bottom:8px"><label style="flex:1;display:flex;align-items:center;gap:8px"><input type="radio" style="width:20px;height:20px;min-width:20px;margin:0;flex:none" name="vehTipo" value="auto"'+(cfg.tipo!=='moto'?' checked':'')+'> Auto / camioneta</label><label style="flex:1;display:flex;align-items:center;gap:8px"><input type="radio" style="width:20px;height:20px;min-width:20px;margin:0;flex:none" name="vehTipo" value="moto"'+(cfg.tipo==='moto'?' checked':'')+'> Moto</label></div>'
    +'<label for="vehOdo" class="mi-sub" style="display:block;margin:6px 0 4px">¿Cuántos km marca hoy tu odómetro?</label>'
    +'<input type="text" inputmode="numeric" id="vehOdo" placeholder="Ej: 84.250" value="'+(cfg.odoFecha?_numCL(us.vehKm):'')+'">'
    +'<label for="vehDigito" class="mi-sub" style="display:block;margin:10px 0 4px">¿En qué número termina tu patente?</label>'
    +'<select id="vehDigito"><option value="">Elegir</option>'+dig+'</select>'
    +'<label style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" style="width:20px;height:20px;min-width:20px;margin:0;flex:none" id="vehNuevo"'+(cfg.nuevo?' checked':'')+'> Es nuevo, sin su primera Revisión Técnica</label>'
    +'<div id="vehChiWrap" style="margin-top:6px'+(cfg.nuevo?'':';display:none')+'"><label for="vehChi" class="mi-sub" style="display:block;margin-bottom:4px">Fecha de tu Certificado de Homologación (CHI)</label><input type="date" id="vehChi" value="'+(cfg.chiFecha||'')+'"></div>'
    +'<label style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" style="width:20px;height:20px;min-width:20px;margin:0;flex:none" id="vehCuotas"'+(cfg.cuotas?' checked':'')+'> Pago el Permiso de Circulación en 2 cuotas</label>'
    +'<label style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" style="width:20px;height:20px;min-width:20px;margin:0;flex:none" id="vehNotif"'+(cfg.notif!==false?' checked':'')+'> Avisarme con notificaciones del teléfono</label>'
    +'<button type="button" class="ab" style="margin-top:12px" onclick="_vehGuardarCfg()"><i class="fas fa-check"></i> Guardar mi vehículo</button>';
  const nuevo=document.getElementById('vehNuevo');
  if(nuevo) nuevo.onchange=function(){ const w=document.getElementById('vehChiWrap'); if(w) w.style.display=nuevo.checked?'':'none'; };
}
function _vehGuardarCfg(){
  const cfg=_vehCfg();
  const tipoEl=document.querySelector('input[name="vehTipo"]:checked');
  const odo=_leerNumero('vehOdo');
  const digEl=document.getElementById('vehDigito');
  const nuevoEl=document.getElementById('vehNuevo'), chiEl=document.getElementById('vehChi');
  const cuotasEl=document.getElementById('vehCuotas'), notifEl=document.getElementById('vehNotif');
  if(nuevoEl && nuevoEl.checked && !(chiEl && chiEl.value)){ lpAviso('Falta la fecha del Certificado de Homologación (CHI) para calcular tu primera Revisión Técnica.'); return; }
  if(odo!=null && !_vehSetOdometro(odo)){ lpAviso('Ese kilometraje no parece válido. Revisa el número.'); return; }
  cfg.tipo=(tipoEl && tipoEl.value==='moto')?'moto':'auto';
  cfg.digito=(digEl && digEl.value!=='') ? Number(digEl.value) : null;
  cfg.nuevo=!!(nuevoEl && nuevoEl.checked);
  cfg.chiFecha=(cfg.nuevo && chiEl && chiEl.value) ? chiEl.value : null;
  cfg.cuotas=!!(cuotasEl && cuotasEl.checked);
  cfg.notif=!!(notifEl && notifEl.checked);
  _docRecalcular(true);
  gd(); renderVehiculoCfg(); renderMantencionVehiculo(); renderDocumentacion();
  try{ if(typeof _tallerAlCambiar==='function') _tallerAlCambiar(cfg.notif); }catch(e){}
  h('Listo, tu vehículo quedó guardado. Te aviso cuando toque algo.');
}
function renderMantencionVehiculo(){
  const cont=document.getElementById('vehLista'); if(!cont) return;
  const data=_vehData();
  let vencidos=0, cerca=0;
  const gasto=_gastoAnio(data);
  const cab = '<div class="mi-sub" style="margin:0 0 8px">Gastado en '+new Date().getFullYear()+': <b style="color:#e7edf6">$'+_numCL(gasto)+'</b>'+(gasto?'':' · anota el costo al registrar un cambio')+'</div>';
  cont.innerHTML=cab+_vehItemsVisibles().map(function(key){
    const info=VEH_ITEMS[key], d=data[key], p=_vehProgreso(key, data);
    if(p.vencido) vencidos++; else if(p.cerca) cerca++;
    const color = p.vencido?'#ef4444':(p.cerca?'#eab308':'#35c46a');
    const badge = p.vencido?'<span class="mi-badge" style="background:rgba(239,68,68,.16);color:#ef4444">Vencido</span>':(p.cerca?'<span class="mi-badge" style="background:rgba(234,179,8,.16);color:#eab308">Cerca</span>':'<span class="mi-badge" style="background:rgba(53,196,106,.16);color:#35c46a">OK</span>');
    const histHTML = (d.historial&&d.historial.length) ? ('<ul class="mi-hist">'+d.historial.slice(-5).reverse().map(function(reg){ return '<li>'+new Date(reg.fecha).toLocaleDateString()+' · '+_numCL(reg.km)+' km'+(reg.costo?' · $'+Number(reg.costo).toLocaleString('es-CL'):'')+(reg.nota?' · '+escapeHTML(reg.nota):'')+'</li>'; }).join('')+'</ul>') : '<p class="mi-sub" style="margin:6px 0">Sin historial todavía.</p>';
    const tallerNota = info.taller ? '<p style="color:#e7a33e;margin:6px 0 0"><i class="fas fa-triangle-exclamation"></i> Trabajo de mecánico — no DIY.</p>' : '';
    const ultKm = Math.max(0, Math.round(Number(d.kmBase)||0));
    const ultFecha = d.fecha ? String(d.fecha).slice(0,10) : '';
    const presets = key==='aceite' ? '<div class="mi-row" style="margin-top:6px"><button type="button" class="ab sec" style="margin:0" onclick="_vehPreset(\'aceite\',10000,12)">10.000 km / 12 meses</button><button type="button" class="ab sec" style="margin:0" onclick="_vehPreset(\'aceite\',5000,6)">5.000 km / 6 meses</button></div>' : '';
    return '<details class="mant-item"><summary>'
      +'<span class="mi-ic" style="background:rgba(255,255,255,.06);color:'+info.c+'"><i class="fas fa-'+info.fa+'"></i></span>'
      +'<span class="mi-txt"><span class="mi-t">'+info.l+'</span><div class="mi-bar"><div class="mi-fill" style="width:'+Math.round(p.pct*100)+'%;background:'+color+'"></div></div><div class="mi-sub">'+_mantTextoAvance(p, d)+'</div></span>'
      +badge
      +'</summary>'
      +'<div class="mi-body">'
      +'<p style="margin:0 0 6px">'+info.tip+'</p>'
      +tallerNota
      +histHTML
      +'<div class="mi-row"><input type="number" id="vehCosto_'+key+'" placeholder="Costo (opcional)"><input type="text" id="vehNota_'+key+'" placeholder="Nota (opcional)" maxlength="80"></div>'
      +'<button type="button" class="ab" style="margin-top:8px" onclick="_vehMarcarHecho(\''+key+'\')"><i class="fas fa-check"></i> Ya lo cambié / revisé hoy</button>'
      +'<details style="margin-top:10px"><summary class="mi-sub" style="cursor:pointer">Ajustar: último cambio e intervalo de tu manual</summary>'
      +'<div class="mi-row" style="margin-top:6px"><input type="text" inputmode="numeric" id="vehUltKm_'+key+'" placeholder="Último cambio a los km" value="'+(ultKm?_numCL(ultKm):'')+'"><input type="date" id="vehUltFecha_'+key+'" value="'+ultFecha+'"></div>'
      +'<div class="mi-row"><input type="text" inputmode="numeric" id="vehUmbKm_'+key+'" placeholder="Cada km" value="'+(d.umbralKm?_numCL(d.umbralKm):'')+'"><input type="text" inputmode="numeric" id="vehUmbMes_'+key+'" placeholder="Cada meses" value="'+(d.umbralMeses||'')+'"></div>'
      +presets
      +'<button type="button" class="ab sec" style="margin-top:8px" onclick="_vehGuardarAjuste(\''+key+'\')"><i class="fas fa-floppy-disk"></i> Guardar ajuste</button>'
      +'</details>'
      +'</div></details>';
  }).join('');
  const resumen=document.getElementById('vehResumen');
  if(resumen) resumen.textContent = vencidos ? (vencidos+' vencid'+(vencidos>1?'os':'o')+' — revisa') : (cerca ? (cerca+' por vencer pronto') : 'Todo al día');
}
function _vehPreset(key, km, meses){
  const a=document.getElementById('vehUmbKm_'+key), b=document.getElementById('vehUmbMes_'+key);
  if(a) a.value=_numCL(km); if(b) b.value=String(meses);
}
function _vehGuardarAjuste(key){
  const d=_vehData()[key]; if(!d) return;
  const ultKm=_leerNumero('vehUltKm_'+key), umbKm=_leerNumero('vehUmbKm_'+key), umbMes=_leerNumero('vehUmbMes_'+key);
  const fEl=document.getElementById('vehUltFecha_'+key);
  if(ultKm!=null){
    if(ultKm>(us.vehKm||0)){ lpAviso('El último cambio no puede ser a más km que tu odómetro actual ('+_numCL(us.vehKm)+' km). Actualiza primero el odómetro en "Mi vehículo".'); return; }
    d.kmBase=ultKm;
  }
  if(fEl && fEl.value){
    const f=new Date(fEl.value+'T12:00:00');
    if(f.getTime()>Date.now()){ lpAviso('La fecha del último cambio no puede ser futura.'); return; }
    d.fecha=f.toISOString();
  }
  d.umbralKmUser=(umbKm!=null && umbKm>0) ? umbKm : null;
  d.umbralMesesUser=(umbMes!=null && umbMes>0 && umbMes<=240) ? umbMes : null;
  d.avisado=false;
  _vehData(); gd(); renderMantencionVehiculo();
  try{ if(typeof _tallerAlCambiar==='function') _tallerAlCambiar(false); }catch(e){}
  h('Ajuste guardado.');
}
function _vehMarcarHecho(key){
  const d=_vehData()[key]; if(!d) return;
  const costoEl=document.getElementById('vehCosto_'+key), notaEl=document.getElementById('vehNota_'+key);
  const costo=(costoEl&&costoEl.value)?parseFloat(costoEl.value):null;
  const nota=(notaEl&&notaEl.value)?notaEl.value.trim():null;
  d.historial=d.historial||[];
  d.historial.push({fecha:new Date().toISOString(), km:(us.vehKm||0)-(d.kmBase||0), costo:(costo!=null&&isFinite(costo)&&costo>0)?costo:null, nota:nota});
  d.kmBase=us.vehKm||0;
  d.fecha=new Date().toISOString();
  d.avisado=false;
  gd(); renderMantencionVehiculo();
  _ganarDarma(5);
  try{ if(typeof _tallerAlCambiar==='function') _tallerAlCambiar(false); }catch(e){}
  try{ _pisteroMood='contento'; }catch(e){} h('¡Buena! Quedó registrado. Cinco de Darma por mantener tu vehículo al día.');
}
// El vehículo está "en uso" para avisos si el usuario anda en modo Motorizado o si ya
// configuró su vehículo (v2: antes solo avisaba en modo Motorizado, así que quien
// pedaleaba ese día nunca se enteraba de que se le vencía la Revisión Técnica del auto).
function _vehEnUso(){
  return (typeof actividadTipo!=='undefined' && actividadTipo==='moto') || !!(us.vehCfg && typeof us.vehCfg==='object');
}
// Aviso proactivo: se dispara UNA vez por ítem al cruzar el umbral, mismo criterio que
// mantencion-preventiva.js -- avisar aunque no estés mirando Taller, sin repetir cada
// vez que abrís la app.
function _vehRevisarAvisos(){
  try{
    if(!_vehEnUso()) return;
    const data=_vehData();
    _vehItemsVisibles().forEach(function(key){
      const p=_vehProgreso(key, data), d=data[key];
      if(p.vencido && !d.avisado){
        d.avisado=true;
        const info=VEH_ITEMS[key];
        const msg = info.umbralKm ? ('Oye, ya van '+_numCL(p.km)+' km desde tu último cambio de '+info.l.toLowerCase()+' — '+(info.taller?'llévalo al taller cuando puedas.':'revísalo cuando puedas.')) : ('Oye, a tu '+info.l.toLowerCase()+' le toca revisión — '+(info.taller?'llévalo al taller cuando puedas.':'revísala cuando puedas.'));
        h(msg);
        try{ if(typeof _tallerNotificarAhora==='function') _tallerNotificarAhora(info.l, msg); }catch(e){}
      } else if(!p.vencido && d.avisado){ d.avisado=false; }
    });
  }catch(e){}
}

/* ===== Documentación al día: Revisión Técnica, Permiso de Circulación, SOAP.
   v2 (2026-10-04): se CALCULAN con las reglas reales, ya no hace falta escribir la fecha.
   Fuentes:
   - Permiso de Circulación (ChileAtiende, ficha 9611): autos particulares y motos pagan
     del 1 de febrero al 31 de marzo; en 2 cuotas, la segunda del 1 al 31 de agosto.
   - SOAP: se paga hasta el 31 de marzo de cada año (requisito del Permiso).
   - Revisión Técnica: calendario del Ministerio de Transportes por último dígito de la
     patente -- 9 enero, 0 febrero, 1 abril, 2 mayo, 3 junio, 4 julio, 5 agosto,
     6 septiembre, 7 octubre, 8 noviembre (marzo y diciembre sin dígito asignado).
   - Vehículo nuevo: Decreto 104 (MTT, Diario Oficial 18-06-2026), la primera Revisión
     Técnica se hace entre los 36 y 48 meses desde el Certificado de Homologación (CHI).
   El usuario marca "Ya lo hice / pagué" y el vencimiento pasa al ciclo siguiente.
   Pistero avisa a 30, a 7 y el día que vence -- una vez cada uno. */
const DOC_ITEMS={
  revisionTecnica:   {l:'Revisión Técnica',        f:true,  fa:'magnifying-glass',  c:'#3b82f6', tip:'Obligatoria y anual, en una Planta de Revisión Técnica (PRT) autorizada. Circular con ella vencida es multa y puede dejarte sin cobertura del seguro en un choque.'},
  permisoCirculacion:{l:'Permiso de Circulación',  fa:'file-invoice',      c:'#10b981', tip:'Se paga en tu municipalidad del 1 de febrero al 31 de marzo (autos particulares y motos). Pide la Revisión Técnica y el SOAP vigentes.'},
  permisoCuota2:     {l:'Permiso: 2ª cuota',       f:true,  fa:'file-invoice',      c:'#10b981', tip:'Si pagaste el Permiso en dos cuotas, la segunda se paga del 1 al 31 de agosto.'},
  soap:              {l:'SOAP',                    fa:'briefcase-medical', c:'#f59e0b', tip:'Seguro Obligatorio de Accidentes Personales: cubre a las víctimas de un choque, sean quienes sean. Se compra hasta el 31 de marzo, antes de pagar el Permiso.'}
};
function _docData(){
  if(!us.doc || typeof us.doc!=='object') us.doc={};
  Object.keys(DOC_ITEMS).forEach(function(k){
    if(!us.doc[k]) us.doc[k]={vence:null, avisado30:false, avisado7:false, avisadoVencido:false};
  });
  return us.doc;
}
function _docEstado(key, data){
  const d=(data||_docData())[key];
  if(!d.vence) return {dias:null, estado:'sinFecha'};
  const dias=Math.round((new Date(d.vence+'T00:00:00').getTime()-Date.now())/(1000*60*60*24));
  let estado='vigente';
  if(dias<0) estado='vencido'; else if(dias<=30) estado='porVencer';
  return {dias:dias, estado:estado};
}
const RT_MES_POR_DIGITO={9:1, 0:2, 1:4, 2:5, 3:6, 4:7, 5:8, 6:9, 7:10, 8:11};
function _isoFecha(anio, mes, dia){ return anio+'-'+String(mes).padStart(2,'0')+'-'+String(dia).padStart(2,'0'); }
function _ultimoDiaMes(anio, mes){ return new Date(anio, mes, 0).getDate(); }
// Vencimiento calculado de un documento, o null si no se puede calcular (falta dato).
// `hecho` = último vencimiento que el usuario marcó como hecho/pagado (YYYY-MM-DD).
// Regla: el primer vencimiento del ciclo que (a) sea posterior a `hecho` y (b) no haya
// pasado hace más de 31 días (si pasó hace más y nunca lo marcó, damos por hecho que lo
// hizo -- sin Permiso ni SOAP no se puede circular -- y pasamos al ciclo siguiente en vez
// de gritarle "vencido" a alguien que configura la app en noviembre). Dentro de esos 31
// días sí se muestra "vencido": puede que de verdad no lo haya hecho, y tiene el botón
// "Ya lo hice / pagué" para corregirlo.
function _docCalcVence(key, cfg, hecho, hoy){
  hoy=hoy||new Date();
  const anioHoy=hoy.getFullYear();
  const hoyISO=_isoFecha(anioHoy, hoy.getMonth()+1, hoy.getDate());
  const limiteAtras=new Date(hoy.getTime()-31*86400000);
  const limiteISO=_isoFecha(limiteAtras.getFullYear(), limiteAtras.getMonth()+1, limiteAtras.getDate());
  function primero(cand){
    for(let i=0;i<cand.length;i++){ const c=cand[i]; if(hecho && c<=hecho) continue; if(c<limiteISO) continue; return c; }
    return null;
  }
  const anios=[anioHoy-1, anioHoy, anioHoy+1, anioHoy+2];
  if(key==='permisoCirculacion' || key==='soap') return primero(anios.map(function(a){ return _isoFecha(a,3,31); }));
  if(key==='permisoCuota2') return (cfg && cfg.cuotas) ? primero(anios.map(function(a){ return _isoFecha(a,8,31); })) : null;
  if(key==='revisionTecnica'){
    if(!cfg) return null;
    if(cfg.nuevo && cfg.chiFecha && !hecho){
      // Primera revisión: a más tardar a los 48 meses del CHI (Decreto 104).
      const chi=new Date(cfg.chiFecha+'T12:00:00'); if(isNaN(chi.getTime())) return null;
      const lim=new Date(chi.getFullYear(), chi.getMonth()+48, chi.getDate());
      return _isoFecha(lim.getFullYear(), lim.getMonth()+1, lim.getDate());
    }
    const mes=RT_MES_POR_DIGITO[cfg.digito];
    if(!mes) return null;
    return primero(anios.map(function(a){ return _isoFecha(a, mes, _ultimoDiaMes(a, mes)); }));
  }
  return null;
}
// Recalcula los vencimientos desde la configuración. Un documento con fecha escrita a
// mano (d.manual) no se toca. `forzar` reinicia los avisos ya dados si la fecha cambió.
function _docRecalcular(forzar){
  const data=_docData(), cfg=us.vehCfg||null;
  Object.keys(DOC_ITEMS).forEach(function(k){
    const d=data[k]; if(d.manual) return;
    const v=_docCalcVence(k, cfg, d.hecho||null);
    if(v!==d.vence){ d.vence=v; d.avisado30=false; d.avisado7=false; d.avisadoVencido=false; }
    else if(forzar && !v){ d.vence=null; }
  });
}
function renderDocumentacion(){
  const cont=document.getElementById('docLista'); if(!cont) return;
  _docRecalcular(false);
  const data=_docData(), cfg=us.vehCfg||null;
  let vencidos=0, porVencer=0;
  const keys=Object.keys(DOC_ITEMS).filter(function(k){ return k!=='permisoCuota2' || (cfg && cfg.cuotas); });
  cont.innerHTML=keys.map(function(key){
    const info=DOC_ITEMS[key], d=data[key], e=_docEstado(key, data);
    if(e.estado==='vencido') vencidos++; else if(e.estado==='porVencer') porVencer++;
    const color = e.estado==='vencido'?'#ef4444':(e.estado==='porVencer'?'#eab308':(e.estado==='sinFecha'?'#7d8ba0':'#35c46a'));
    const badgeTxt = e.estado==='vencido'?'Vencido':(e.estado==='porVencer'?'Por vencer':(e.estado==='sinFecha'?'Sin fecha':'Vigente'));
    const falta = (key==='revisionTecnica' && (!cfg || (cfg.digito==null && !(cfg.nuevo && cfg.chiFecha)))) ? 'Indica el último dígito de tu patente en "Mi vehículo" y la calculo sola.' : 'Ingresa la fecha de vencimiento.';
    const sub = e.estado==='sinFecha' ? falta :
      ('Vence el '+new Date(d.vence+'T00:00:00').toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'})+' · '+(e.dias<0?('vencido hace '+Math.abs(e.dias)+' días'):(e.dias===0?'vence hoy':('en '+e.dias+' días'))));
    const extraNuevo = (key==='revisionTecnica' && cfg && cfg.nuevo && cfg.chiFecha && !d.hecho) ? (function(){ const c=new Date(cfg.chiFecha+'T12:00:00'); const desde=new Date(c.getFullYear(), c.getMonth()+36, c.getDate()); return '<p class="mi-sub" style="margin:0 0 8px">Auto nuevo: puedes hacerla desde el '+desde.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'})+' (36 meses del CHI) y a más tardar en la fecha de arriba (48 meses, Decreto 104 de 2026).</p>'; })() : '';
    return '<details class="mant-item doc-item"><summary>'
      +'<span class="mi-ic" style="background:rgba(255,255,255,.06);color:'+info.c+'"><i class="fas fa-'+info.fa+'"></i></span>'
      +'<span class="mi-txt"><span class="mi-t">'+info.l+'</span><div class="mi-sub">'+sub+'</div></span>'
      +'<span class="mi-badge" style="background:'+color+'29;color:'+color+'">'+badgeTxt+'</span>'
      +'</summary>'
      +'<div class="mi-body">'
      +'<p style="margin:0 0 8px">'+info.tip+'</p>'
      +extraNuevo
      +(d.vence?'<button type="button" class="ab" onclick="_docMarcarHecho(\''+key+'\')"><i class="fas fa-check"></i> Ya lo hice / pagué</button>':'')
      +'<label for="docFecha_'+key+'" class="mi-sub" style="display:block;margin:10px 0 4px">¿Tu documento dice otra fecha? Escríbela:</label>'
      +'<input type="date" id="docFecha_'+key+'" value="'+(d.manual?(d.vence||''):'')+'" onchange="_docSetFecha(\''+key+'\', this.value)" style="width:100%;background:#000;border:1px solid #2a3240;color:#fff;border-radius:8px;padding:8px">'
      +'</div></details>';
  }).join('');
  const resumen=document.getElementById('docResumen');
  if(resumen) resumen.textContent = vencidos ? (vencidos+' vencid'+(vencidos>1?'os':'o')+' — revisa') : (porVencer ? (porVencer+' por vencer pronto') : 'Todo al día');
}
function _docMarcarHecho(key){
  const d=_docData()[key]; if(!d || !d.vence) return;
  d.hecho=d.vence; d.manual=false;
  d.avisado30=false; d.avisado7=false; d.avisadoVencido=false;
  _docRecalcular(false);
  gd(); renderDocumentacion();
  try{ if(typeof _tallerAlCambiar==='function') _tallerAlCambiar(false); }catch(e){}
  h('Anotado. Te aviso cuando vuelva a tocar.');
}
function _docSetFecha(key, valor){
  const d=_docData()[key]; if(!d) return;
  if(valor){ d.vence=valor; d.manual=true; }
  else { d.manual=false; d.vence=null; _docRecalcular(false); }
  d.avisado30=false; d.avisado7=false; d.avisadoVencido=false;
  gd(); renderDocumentacion();
  try{ if(typeof _tallerAlCambiar==='function') _tallerAlCambiar(false); }catch(e){}
  h('Anotado. Te aviso a tiempo antes de que venza.');
}
function _docRevisarAvisos(){
  try{
    if(!_vehEnUso()) return;
    _docRecalcular(false);
    const data=_docData(), cfg=us.vehCfg||null;
    Object.keys(DOC_ITEMS).forEach(function(key){
      if(key==='permisoCuota2' && !(cfg && cfg.cuotas)) return;
      const d=data[key]; if(!d.vence) return;
      const e=_docEstado(key, data), info=DOC_ITEMS[key];
      let msg=null;
      if(e.estado==='vencido' && !d.avisadoVencido){ d.avisadoVencido=true; msg='Oye, tu '+info.l+' está '+(info.f?'VENCIDA':'VENCIDO')+' — regularíza'+(info.f?'la':'lo')+' apenas puedas.'; }
      else if(e.dias<=7 && e.dias>=0 && !d.avisado7){ d.avisado7=true; d.avisado30=true; msg='Tu '+info.l+' vence '+(e.dias===0?'hoy':('en '+e.dias+' día'+(e.dias===1?'':'s')))+' — no '+(info.f?'la':'lo')+' dejes para el final.'; }
      else if(e.dias<=30 && e.dias>7 && !d.avisado30){ d.avisado30=true; msg='Tu '+info.l+' vence en '+e.dias+' días — agenda con tiempo.'; }
      if(msg){ h(msg); }
    });
  }catch(e){}
}
// Antes de planificar un viaje largo: mismo criterio que _mantencionAvisoPreViaje
// (bici) -- si algo del vehículo o de sus papeles está vencido o por vencer, avisar
// ACÁ, no solo cuando ya te agarró un control en la carretera.
function _vehAvisoPreViaje(){
  try{
    if(typeof actividadTipo==='undefined' || actividadTipo!=='moto') return;
    const dataVeh=_vehData();
    const criticosVeh=_vehItemsVisibles().filter(function(key){ const p=_vehProgreso(key, dataVeh); return p.vencido||p.cerca; }).map(function(key){ return VEH_ITEMS[key].l; });
    _docRecalcular(false);
    const dataDoc=_docData(), cfg=us.vehCfg||null;
    const criticosDoc=Object.keys(DOC_ITEMS).filter(function(key){ if(key==='permisoCuota2' && !(cfg && cfg.cuotas)) return false; const e=_docEstado(key, dataDoc); return e.estado==='vencido'||e.estado==='porVencer'; }).map(function(key){ return DOC_ITEMS[key].l; });
    const criticos=criticosVeh.concat(criticosDoc);
    if(criticos.length) lpAviso('Antes de un viaje largo: revisa '+criticos.join(', ')+' — está'+(criticos.length>1?'n':'')+' por vencer. Mira Taller para el detalle.');
  }catch(e){}
}
