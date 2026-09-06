// ===== Mantención del vehículo + documentación al día (2026-09-06, pedido de Inty:
// "que Pistero recuerde a qué kilometraje le toca la mantención... no es un dato, tiene
// que avisar" + "revisión técnica, permiso de circulación, SOAP, toda la
// documentación"). Mismo motor que mantencion-preventiva.js (bici), pero con su PROPIO
// contador de km (us.vehKm) -- antes de esto, manejar en modo Motorizado sumaba
// kilometraje al desgaste de la CADENA de la bici (_sumarKmMantencion corría para
// cualquier actividad, sin filtrar por actividadTipo). Ver el fix en motor-gps.js:
// ahora cada modo va a su propio contador, ninguno envejece por los km del otro.
//
// Umbrales por defecto, de manuales de mantención de fabricante y normativa chilena
// real, no inventados -- igual criterio que mantencion-preventiva.js:
//  - Aceite y filtro: 10.000 km/12 meses (aceite sintético moderno; el mineral es
//    mucho más seguido, ~5.000 km -- el usuario lo edita si el suyo pide otra cosa).
//  - Neumáticos: rotar cada 10.000 km (desgaste parejo); cambiar a los 5 años aunque
//    el dibujo se vea bien -- el caucho se reseca con el tiempo, no solo con el uso
//    (mismo criterio que ya usa mantencion-preventiva.js para los neumáticos de bici).
//  - Frenos: revisar cada 20.000 km/24 meses.
//  - Filtro de aire: 15.000 km/12 meses.
//  - Batería: por tiempo, no por km -- ~36 meses de vida típica en Chile (clima
//    variable, partidas en frío gastan más).
// A diferencia de la bici, NO hay factor de clima (_factorDesgasteClima): la lluvia
// gasta más rápido una cadena expuesta o unos cables sin funda, pero el aceite, los
// frenos y la batería de un vehículo cerrado se rigen por el odómetro real, no por si
// llovió en el camino -- aplicar el mismo multiplicador acá sería copiar sin pensar.
const VEH_ITEMS={
  aceite:     {l:'Aceite y filtro',          fa:'oil-can',        c:'#ef4444', umbralKm:10000, umbralMeses:12, taller:true,  tip:'Cambio de aceite y filtro cada 10.000 km o 12 meses (aceite sintético — el mineral es más seguido, revisa tu manual). Motor sin aceite fresco se desgasta más rápido y puede fallar.'},
  neumaticos: {l:'Neumáticos',               fa:'circle-dot',     c:'#10b981', umbralKm:10000, umbralMeses:60, taller:true,  tip:'Rota cada 10.000 km para desgaste parejo. Cambia a los 5 años aunque el dibujo se vea bien — el caucho se reseca igual.'},
  frenos:     {l:'Frenos (pastillas/discos)',fa:'hand',           c:'#3b82f6', umbralKm:20000, umbralMeses:24, taller:true,  tip:'Revisión cada 20.000 km o 24 meses. Ruido metálico al frenar: no esperes al umbral, ve al taller ahora.'},
  filtroAire: {l:'Filtro de aire',           fa:'wind',           c:'#8b5cf6', umbralKm:15000, umbralMeses:12, taller:false, tip:'Cada 15.000 km o 12 meses. Sucio de más, el motor consume más bencina.'},
  bateria:    {l:'Batería',                  fa:'car-battery',    c:'#f59e0b', umbralKm:null,  umbralMeses:36, taller:false, tip:'Por tiempo, no por km (~3 años de vida típica en Chile). Si cuesta partir en frío, revísala aunque falte para el umbral.'}
};
function _vehData(){
  if(!us.veh || typeof us.veh!=='object') us.veh={};
  Object.keys(VEH_ITEMS).forEach(function(k){
    if(!us.veh[k]) us.veh[k]={kmBase:0, fecha:new Date().toISOString(), umbralKm:VEH_ITEMS[k].umbralKm, umbralMeses:VEH_ITEMS[k].umbralMeses, historial:[], avisado:false};
    var _vi=us.veh[k];
    if(!_vi.fecha) _vi.fecha=new Date().toISOString();
    _vi.umbralKm=VEH_ITEMS[k].umbralKm;
    _vi.umbralMeses=VEH_ITEMS[k].umbralMeses;
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
function renderMantencionVehiculo(){
  const cont=document.getElementById('vehLista'); if(!cont) return;
  const data=_vehData();
  let vencidos=0, cerca=0;
  cont.innerHTML=Object.keys(VEH_ITEMS).map(function(key){
    const info=VEH_ITEMS[key], d=data[key], p=_vehProgreso(key, data);
    if(p.vencido) vencidos++; else if(p.cerca) cerca++;
    const color = p.vencido?'#ef4444':(p.cerca?'#eab308':'#35c46a');
    const badge = p.vencido?'<span class="mi-badge" style="background:rgba(239,68,68,.16);color:#ef4444">Vencido</span>':(p.cerca?'<span class="mi-badge" style="background:rgba(234,179,8,.16);color:#eab308">Cerca</span>':'<span class="mi-badge" style="background:rgba(53,196,106,.16);color:#35c46a">OK</span>');
    const histHTML = (d.historial&&d.historial.length) ? ('<ul class="mi-hist">'+d.historial.slice(-5).reverse().map(function(reg){ return '<li>'+new Date(reg.fecha).toLocaleDateString()+' · '+reg.km.toFixed(0)+' km'+(reg.costo?' · $'+reg.costo:'')+(reg.nota?' · '+escapeHTML(reg.nota):'')+'</li>'; }).join('')+'</ul>') : '<p class="mi-sub" style="margin:6px 0">Sin historial todavía.</p>';
    const tallerNota = info.taller ? '<p style="color:#e7a33e;margin:6px 0 0"><i class="fas fa-triangle-exclamation"></i> Trabajo de mecánico — no DIY.</p>' : '';
    return '<details class="mant-item"><summary>'
      +'<span class="mi-ic" style="background:rgba(255,255,255,.06);color:'+info.c+'"><i class="fas fa-'+info.fa+'"></i></span>'
      +'<span class="mi-txt"><span class="mi-t">'+info.l+'</span><div class="mi-bar"><div class="mi-fill" style="width:'+Math.round(p.pct*100)+'%;background:'+color+'"></div></div><div class="mi-sub">'+p.km.toFixed(0)+' km desde el último cambio'+(d.umbralKm?(' de '+d.umbralKm):'')+'</div></span>'
      +badge
      +'</summary>'
      +'<div class="mi-body">'
      +'<p style="margin:0 0 6px">'+info.tip+'</p>'
      +tallerNota
      +histHTML
      +'<div class="mi-row"><input type="number" id="vehCosto_'+key+'" placeholder="Costo (opcional)"><input type="text" id="vehNota_'+key+'" placeholder="Nota (opcional)" maxlength="80"></div>'
      +'<button type="button" class="ab" style="margin-top:8px" onclick="_vehMarcarHecho(\''+key+'\')"><i class="fas fa-check"></i> Ya lo cambié / revisé</button>'
      +'</div></details>';
  }).join('');
  const resumen=document.getElementById('vehResumen');
  if(resumen) resumen.textContent = vencidos ? (vencidos+' vencid'+(vencidos>1?'os':'o')+' — revisa') : (cerca ? (cerca+' por vencer pronto') : 'Todo al día');
}
function _vehMarcarHecho(key){
  const d=_vehData()[key]; if(!d) return;
  const costoEl=document.getElementById('vehCosto_'+key), notaEl=document.getElementById('vehNota_'+key);
  const costo=(costoEl&&costoEl.value)?parseFloat(costoEl.value):null;
  const nota=(notaEl&&notaEl.value)?notaEl.value.trim():null;
  d.historial=d.historial||[];
  d.historial.push({fecha:new Date().toISOString(), km:(us.vehKm||0)-(d.kmBase||0), costo:costo, nota:nota});
  d.kmBase=us.vehKm||0;
  d.fecha=new Date().toISOString();
  d.avisado=false;
  gd(); renderMantencionVehiculo();
  _ganarDarma(5);
  try{ _pisteroMood='contento'; }catch(e){} h('¡Buena! Quedó registrado. Cinco de Darma por mantener tu vehículo al día.');
}
// Aviso proactivo: se dispara UNA vez por ítem al cruzar el umbral, mismo criterio que
// mantencion-preventiva.js -- avisar aunque no estés mirando Taller, sin repetir cada
// vez que abrís la app.
function _vehRevisarAvisos(){
  try{
    if(typeof actividadTipo==='undefined' || actividadTipo!=='moto') return;
    const data=_vehData();
    Object.keys(VEH_ITEMS).forEach(function(key){
      const p=_vehProgreso(key, data), d=data[key];
      if(p.vencido && !d.avisado){
        d.avisado=true;
        const info=VEH_ITEMS[key];
        h('Che, ya van '+p.km.toFixed(0)+' km desde tu último cambio de '+info.l.toLowerCase()+' — '+(info.taller?'llévalo al taller cuando puedas.':'revísalo cuando puedas.'));
      } else if(!p.vencido && d.avisado){ d.avisado=false; }
    });
  }catch(e){}
}

/* ===== Documentación al día: Revisión Técnica, Permiso de Circulación, SOAP. A
   diferencia de arriba, estos NO se calculan solos -- nadie puede saber la fecha real
   de vencimiento salvo el dueño del vehículo (depende de cuándo lo tramitó, no de un
   umbral fijo). El usuario la ingresa una vez; Pistero cuenta los días y avisa a 30,
   a 7, y el día que vence -- una vez cada uno, mismo criterio de "avisa una vez, no
   cada vez que abrís la app" que ya usa el resto de Taller. */
const DOC_ITEMS={
  revisionTecnica:   {l:'Revisión Técnica',        fa:'magnifying-glass',  c:'#3b82f6', tip:'Obligatoria, anual, en una Planta de Revisión Técnica (PRT) autorizada. Circular vencida es multa y puede dejarte sin cobertura del seguro en un choque.'},
  permisoCirculacion:{l:'Permiso de Circulación',  fa:'file-invoice',      c:'#10b981', tip:'Se paga en tu municipalidad. Sin él (o vencido) no puedes circular — un control de Carabineros lo pide junto con la Revisión Técnica y el SOAP.'},
  soap:              {l:'SOAP',                    fa:'briefcase-medical', c:'#f59e0b', tip:'Seguro Obligatorio de Accidentes Personales — cubre a las víctimas de un choque, sean quienes sean. Se compra junto al Permiso de Circulación, en una compañía de seguros o notaría.'}
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
function renderDocumentacion(){
  const cont=document.getElementById('docLista'); if(!cont) return;
  const data=_docData();
  let vencidos=0, porVencer=0;
  cont.innerHTML=Object.keys(DOC_ITEMS).map(function(key){
    const info=DOC_ITEMS[key], d=data[key], e=_docEstado(key, data);
    if(e.estado==='vencido') vencidos++; else if(e.estado==='porVencer') porVencer++;
    const color = e.estado==='vencido'?'#ef4444':(e.estado==='porVencer'?'#eab308':(e.estado==='sinFecha'?'#7d8ba0':'#35c46a'));
    const badgeTxt = e.estado==='vencido'?'Vencido':(e.estado==='porVencer'?'Por vencer':(e.estado==='sinFecha'?'Sin fecha':'Vigente'));
    const sub = e.estado==='sinFecha' ? 'Ingresa la fecha de vencimiento que dice tu documento.' :
      ('Vence el '+new Date(d.vence+'T00:00:00').toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'})+' · '+(e.dias<0?('vencido hace '+Math.abs(e.dias)+' días'):(e.dias===0?'vence hoy':('en '+e.dias+' días'))));
    return '<details class="mant-item doc-item"><summary>'
      +'<span class="mi-ic" style="background:rgba(255,255,255,.06);color:'+info.c+'"><i class="fas fa-'+info.fa+'"></i></span>'
      +'<span class="mi-txt"><span class="mi-t">'+info.l+'</span><div class="mi-sub">'+sub+'</div></span>'
      +'<span class="mi-badge" style="background:'+color+'29;color:'+color+'">'+badgeTxt+'</span>'
      +'</summary>'
      +'<div class="mi-body">'
      +'<p style="margin:0 0 8px">'+info.tip+'</p>'
      +'<input type="date" id="docFecha_'+key+'" value="'+(d.vence||'')+'" onchange="_docSetFecha(\''+key+'\', this.value)" style="width:100%;background:#000;border:1px solid #2a3240;color:#fff;border-radius:8px;padding:8px">'
      +'</div></details>';
  }).join('');
  const resumen=document.getElementById('docResumen');
  if(resumen) resumen.textContent = vencidos ? (vencidos+' vencid'+(vencidos>1?'os':'o')+' — revisa') : (porVencer ? (porVencer+' por vencer pronto') : 'Todo al día');
}
function _docSetFecha(key, valor){
  const d=_docData()[key]; if(!d) return;
  d.vence=valor||null; d.avisado30=false; d.avisado7=false; d.avisadoVencido=false;
  gd(); renderDocumentacion();
  h('Anotado. Te aviso a tiempo antes de que venza.');
}
function _docRevisarAvisos(){
  try{
    if(typeof actividadTipo==='undefined' || actividadTipo!=='moto') return;
    const data=_docData();
    Object.keys(DOC_ITEMS).forEach(function(key){
      const d=data[key]; if(!d.vence) return;
      const e=_docEstado(key, data), info=DOC_ITEMS[key];
      if(e.estado==='vencido' && !d.avisadoVencido){ d.avisadoVencido=true; h('Che, tu '+info.l+' está VENCIDA — regularízala apenas puedas.'); }
      else if(e.dias<=7 && e.dias>=0 && !d.avisado7){ d.avisado7=true; h('Tu '+info.l+' vence en '+e.dias+' día'+(e.dias===1?'':'s')+' — no lo dejes para el final.'); }
      else if(e.dias<=30 && e.dias>7 && !d.avisado30){ d.avisado30=true; h('Tu '+info.l+' vence en '+e.dias+' días — agenda con tiempo.'); }
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
    const criticosVeh=Object.keys(VEH_ITEMS).filter(function(key){ const p=_vehProgreso(key, dataVeh); return p.vencido||p.cerca; }).map(function(key){ return VEH_ITEMS[key].l; });
    const dataDoc=_docData();
    const criticosDoc=Object.keys(DOC_ITEMS).filter(function(key){ const e=_docEstado(key, dataDoc); return e.estado==='vencido'||e.estado==='porVencer'; }).map(function(key){ return DOC_ITEMS[key].l; });
    const criticos=criticosVeh.concat(criticosDoc);
    if(criticos.length) lpAviso('Antes de un viaje largo: revisa '+criticos.join(', ')+' — está'+(criticos.length>1?'n':'')+' por vencer. Mira Taller para el detalle.');
  }catch(e){}
}
