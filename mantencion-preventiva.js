// ===== Mantención preventiva (2026-08-23, pedido de Inty) =====
// Umbrales por defecto de guías reales (Bike Gremlin / CyclingTrend), no inventados
// — esto es seguridad, no se adivina. El usuario los puede editar; se guardan en
// us.mant junto al resto de sus stats (gd() los persiste solo, es el mismo objeto).
const MANT_ITEMS={
  cadena:      {l:'Cadena',             fa:'link',         c:'#f59e0b', umbralKm:2500, umbralMeses:12, taller:false, tip:'Mide el desgaste con un medidor de cadena. Si pasa 0.5–0.75%, cámbiala antes de que gaste también el cassette.'},
  pastillas:   {l:'Pastillas de freno', fa:'hand',         c:'#ef4444', umbralKm:2000, umbralMeses:12, taller:true,  tip:'Revisa el grosor. Si están al límite, es trabajo de taller — los frenos no son DIY.'},
  cables:      {l:'Cables y fundas',    fa:'wave-square',  c:'#3b82f6', umbralKm:5000, umbralMeses:12, taller:false, tip:'Si los cambios o los frenos se sienten duros o lentos, puede ser hora de cambiarlos.'},
  rodamientos: {l:'Rodamientos',        fa:'circle-notch', c:'#8b5cf6', umbralKm:4000, umbralMeses:6,  taller:false, tip:'Revisa juego y ruido en dirección, bujes y pedalier.'},
  neumaticos:  {l:'Neumáticos',         fa:'circle',       c:'#10b981', umbralKm:null, umbralMeses:24, taller:false, tip:'Revisa el dibujo y busca cortes en la carcasa — la goma se reseca aunque no la uses.'}
};
function _mantData(){
  if(!us.mant || typeof us.mant!=='object') us.mant={};
  Object.keys(MANT_ITEMS).forEach(function(k){
    // fecha:new Date() en vez de null (bug encontrado 2026-08-24): un ítem con
    // umbralKm:null (neumáticos, 100% por tiempo) dependía de que ALGO le pusiera
    // fecha para siquiera empezar a contar — sin eso, mesesDesde quedaba null para
    // siempre y el aviso "la goma se reseca aunque no la uses" nunca se disparaba.
    // Hoy es la fecha más honesta que tenemos (no sabemos cuándo cambió de verdad),
    // igual que "última sincronización" en cualquier tracker que arranca de cero.
    if(!us.mant[k]) us.mant[k]={kmBase:0, fecha:new Date().toISOString(), umbralKm:MANT_ITEMS[k].umbralKm, umbralMeses:MANT_ITEMS[k].umbralMeses, historial:[], avisado:false};
    // Migracion (2026-08-24): el arreglo de arriba solo alcanza a quien abre Taller por
    // primera vez. Todo el que lo abrio desde que salio la funcion (23-ago) ya tiene el
    // objeto guardado con fecha:null, y como este bloque solo corre `if(!us.mant[k])`,
    // se lo quedaba para siempre: el aviso por tiempo seguia sin dispararse nunca para
    // ellos. Se rellena la fecha faltante una sola vez, con el mismo criterio honesto
    // (hoy = cuando empezamos a contar). Tambien se re-sincronizan los umbrales para que
    // un cambio futuro en MANT_ITEMS llegue a los datos ya guardados.
    var _mi=us.mant[k];
    if(!_mi.fecha) _mi.fecha=new Date().toISOString();
    _mi.umbralKm=MANT_ITEMS[k].umbralKm;
    _mi.umbralMeses=MANT_ITEMS[k].umbralMeses;
  });
  return us.mant;
}
// Clima real durante el viaje (lo pone _climaFxAplicar más abajo): lluvia o nieve
// gastan cadena, cables y rodamientos mucho más rápido que un km seco — contarlos
// "más pesado" para la mantención es más honesto que sumar todos los km igual.
let _climaModoActual='off';
function _factorDesgasteClima(){ return (_climaModoActual==='lluvia'||_climaModoActual==='nieve')?1.5:1; }
function _sumarKmMantencion(km){ if(!(km>0)) return; us.mantKm=(us.mantKm||0)+km*_factorDesgasteClima(); }
// 2026-08-24: acepta `data` ya calculado (el objeto que devuelve _mantData()) para no
// volver a recorrer los 5 ítems cada vez — antes cada llamada llamaba a _mantData()
// de nuevo, y como au() (cada punto de GPS) llama a esto ~10 veces por tick entre
// renderMantencion()+_mantencionRevisarAvisos(), eran ~10 recorridos redundantes por
// tick. Sigue funcionando sin el segundo argumento (fallback a _mantData()) por si
// algo más lo llama suelto.
function _mantProgreso(key, data){
  const d=(data||_mantData())[key], km=(us.mantKm||0)-(d.kmBase||0);
  let mesesDesde=null;
  if(d.fecha){ mesesDesde=(Date.now()-new Date(d.fecha).getTime())/(1000*60*60*24*30.44); }
  const pctKm = d.umbralKm ? Math.min(1, km/d.umbralKm) : 0;
  const pctMeses = (d.umbralMeses && mesesDesde!=null) ? Math.min(1, mesesDesde/d.umbralMeses) : 0;
  const pct=Math.max(pctKm, pctMeses);
  return {km:km, mesesDesde:mesesDesde, pct:pct, vencido:pct>=1, cerca:(pct>=0.85 && pct<1)};
}
function renderMantencion(){
  const cont=document.getElementById('mantLista'); if(!cont) return;
  const data=_mantData();
  let vencidos=0, cerca=0;
  cont.innerHTML=Object.keys(MANT_ITEMS).map(function(key){
    const info=MANT_ITEMS[key], d=data[key], p=_mantProgreso(key, data);
    if(p.vencido) vencidos++; else if(p.cerca) cerca++;
    const color = p.vencido?'#ef4444':(p.cerca?'#eab308':'#35c46a');
    const badge = p.vencido?'<span class="mi-badge" style="background:rgba(239,68,68,.16);color:#ef4444">Vencido</span>':(p.cerca?'<span class="mi-badge" style="background:rgba(234,179,8,.16);color:#eab308">Cerca</span>':'<span class="mi-badge" style="background:rgba(53,196,106,.16);color:#35c46a">OK</span>');
    const histHTML = (d.historial&&d.historial.length) ? ('<ul class="mi-hist">'+d.historial.slice(-5).reverse().map(function(h){ return '<li>'+new Date(h.fecha).toLocaleDateString()+' · '+h.km.toFixed(0)+' km'+(h.costo?' · $'+h.costo:'')+(h.nota?' · '+escapeHTML(h.nota):'')+'</li>'; }).join('')+'</ul>') : '<p class="mi-sub" style="margin:6px 0">Sin historial todavía.</p>';
    const tallerNota = info.taller ? '<p style="color:#e7a33e;margin:6px 0 0"><i class="fas fa-triangle-exclamation"></i> Cuando toque cambiarlas, es trabajo de taller — no DIY.</p>' : '';
    return '<details class="mant-item"><summary>'
      +'<span class="mi-ic" style="background:rgba(255,255,255,.06);color:'+info.c+'"><i class="fas fa-'+info.fa+'"></i></span>'
      +'<span class="mi-txt"><span class="mi-t">'+info.l+'</span><div class="mi-bar"><div class="mi-fill" style="width:'+Math.round(p.pct*100)+'%;background:'+color+'"></div></div><div class="mi-sub">'+p.km.toFixed(0)+' km desde el último cambio'+(d.umbralKm?(' de '+d.umbralKm):'')+'</div></span>'
      +badge
      +'</summary>'
      +'<div class="mi-body">'
      +'<p style="margin:0 0 6px">'+info.tip+'</p>'
      +tallerNota
      +histHTML
      +'<div class="mi-row"><input type="number" id="mantCosto_'+key+'" placeholder="Costo (opcional)"><input type="text" id="mantNota_'+key+'" placeholder="Nota (opcional)" maxlength="80"></div>'
      +'<button type="button" class="ab" style="margin-top:8px" onclick="_mantencionMarcarHecho(\''+key+'\')"><i class="fas fa-check"></i> Ya la cambié / revisé</button>'
      +'</div></details>';
  }).join('');
  const resumen=document.getElementById('mantResumen');
  if(resumen) resumen.textContent = vencidos ? (vencidos+' vencid'+(vencidos>1?'os':'o')+' — revisa') : (cerca ? (cerca+' por vencer pronto') : 'Todo al día');
}
function _mantencionMarcarHecho(key){
  const d=_mantData()[key]; if(!d) return;
  const costoEl=document.getElementById('mantCosto_'+key), notaEl=document.getElementById('mantNota_'+key);
  const costo=(costoEl&&costoEl.value)?parseFloat(costoEl.value):null;
  const nota=(notaEl&&notaEl.value)?notaEl.value.trim():null;
  d.historial=d.historial||[];
  d.historial.push({fecha:new Date().toISOString(), km:(us.mantKm||0)-(d.kmBase||0), costo:costo, nota:nota});
  d.kmBase=us.mantKm||0;
  d.fecha=new Date().toISOString();
  d.avisado=false;
  gd(); renderMantencion();
  _ganarDarma(5);
  try{ _pisteroMood='contento'; }catch(e){} h('¡Buena! Quedó registrado. Cinco de Darma por mantener tu bici al día.');
}
// Aviso proactivo: se dispara UNA vez por ítem al cruzar el umbral (no cada vez que
// abrís la app) — mismo criterio que ya usamos hoy para "ya no está" en los reportes
// del mapa: la voz repetida molesta, el dato sigue disponible igual en Taller.
function _mantencionRevisarAvisos(){
  try{
    const data=_mantData();
    Object.keys(MANT_ITEMS).forEach(function(key){
      const p=_mantProgreso(key, data), d=data[key];
      if(p.vencido && !d.avisado){
        d.avisado=true;
        const info=MANT_ITEMS[key];
        h('Che, ya van '+p.km.toFixed(0)+' km desde tu último cambio de '+info.l.toLowerCase()+' — '+(info.taller?'llévala al taller cuando puedas.':'revísala cuando puedas.'));
      } else if(!p.vencido && d.avisado){ d.avisado=false; }
    });
  }catch(e){}
}
// Antes de planificar un viaje largo: si algo está vencido o por vencer, avisar ACÁ —
// pedido de Inty: evitar quedar varado en medio de un viaje de varios días por algo
// que se veía venir, no solo enterarte cuando ya se cumplió el km.
function _mantencionAvisoPreViaje(){
  try{
    const data=_mantData();
    const criticos=Object.keys(MANT_ITEMS).filter(function(key){ const p=_mantProgreso(key, data); return p.vencido||p.cerca; }).map(function(key){ return MANT_ITEMS[key].l; });
    if(criticos.length) lpAviso('Antes de un viaje largo: revisa '+criticos.join(', ')+' — está'+(criticos.length>1?'n':'')+' por vencer. Mira Taller para el detalle.');
  }catch(e){}
}
/* El vehículo NO compite: es un rol de apoyo, no una disciplina. Sus kilómetros se
   registran igual (sirven para tus propias estadísticas) pero no entran a ningún ranking. */
const MODOS_QUE_COMPITEN={ciclismo:'Ruta',mtb:'MTB / Gravel',trekking:'Trekking'};
function _modoCompite(m){ return !!MODOS_QUE_COMPITEN[m]; }
/* Arma el mapa de kilómetros por modo SIEMPRE con todas las claves que compiten, aunque
   valgan 0.
   Auditoría del 2026-07-20: se subía `us.dm || {}`, y **un mapa vacío no crea el campo
   anidado** `kmPorModo.ciclismo`. Como Firestore excluye del `orderBy` los documentos que
   no tienen el campo, el ranking por disciplina repetía exactamente el bug que se acababa
   de arreglar: todo usuario nuevo nacía invisible, y la sincronización de rescate no
   rescataba a nadie en la dimensión nueva. Con las claves en 0 desde el registro, todos
   entran al ranking desde el primer día. */
function _kmPorModoParaNube(){
  const out={};
  for(const m in MODOS_QUE_COMPITEN) out[m]=0;
  if(us && us.dm && typeof us.dm==='object'){ for(const m in us.dm){ const v=Number(us.dm[m]); if(isFinite(v)&&v>0) out[m]=v; } }
  return out;
}
var CO2_KG_POR_KM=0.18; // un auto promedio emite ~180 g CO2/km; pedalear en vez de manejar lo evita
var CO2_KG_POR_ARBOL_ANIO=21; // un arbol joven absorbe ~21 kg CO2 al anio
