/* Libre Pedal — Memoria de comportamiento de Pistero (25-ago-2026)
   Perfil que aprende observando lo que el ciclista HACE (no lo que dice de sí mismo),
   100% local -- localStorage, mismo patrón que ya usa pisteroHistorial -- así que esto
   NO agrega ningún read nuevo a Firestore ni a ningún servicio pago. Ver
   COORDINACION-IA/vision-doctrina/VISION-MAESTRA.md, sección "Conocer al usuario de
   verdad": hora de salida, si para mucho, si aprieta en subidas, y sobre todo la señal
   que nadie medía -- cuándo lo mandan a callar.

   Reglas de rigor (para no inventar patrones de datos ruidosos o escasos):
   1. Tamaño mínimo de muestra antes de reportar cualquier rasgo (MIN_MUESTRAS_*).
   2. Ventana deslizante (últimas N muestras) -- lo viejo se cae solo del promedio,
      no hace falta "vencer" nada a mano.
   3. Toda señal de entrada llega YA filtrada por el pipeline de GPS que existe en
      index.html (velocidad Doppler + ventana de posición + techo de plausibilidad en
      ug(), pendiente con histéresis + mínimo de 5 puntos/35m en comentarPendiente()) --
      este módulo NO lee coordenadas crudas, solo consume los números que esas
      funciones ya depuraron.
*/
(function(){
'use strict';

var MIN_MUESTRAS_HORA=5, MIN_MUESTRAS_PARADA=5, MIN_MUESTRAS_SUBIDA=8;
var MIN_OFERTAS_SILENCIO=5, TASA_SILENCIO_SUPRIME=0.4;
var VENTANA_SILENCIO=20, VENTANA_VIAJES=20, VENTANA_PARADAS=60, VENTANA_SUBIDA=40;
var MS_CORRELACION_SILENCIO=12000; // si te callas dentro de esta ventana desde que Pistero habló, cuenta como reacción a ESE comentario

function _cu(){ try{ return (typeof cu!=='undefined'&&cu)?cu:'anon'; }catch(e){ return 'anon'; } }
function _key(){ return 'lp_perfilaprendido_'+_cu(); }

function _vacio(){ return { version:1, categorias:{}, horasSalida:[], viajesParada:[], subida:[] }; }
var perfil=null;
function _cargar(){
  if(perfil) return perfil;
  try{ var r=localStorage.getItem(_key()); perfil=r?JSON.parse(r):_vacio(); }catch(e){ perfil=_vacio(); }
  if(!perfil||typeof perfil!=='object') perfil=_vacio();
  if(!perfil.categorias) perfil.categorias={};
  if(!perfil.horasSalida) perfil.horasSalida=[];
  if(!perfil.viajesParada) perfil.viajesParada=[];
  if(!perfil.subida) perfil.subida=[];
  return perfil;
}
function _guardar(){ try{ localStorage.setItem(_key(), JSON.stringify(perfil)); }catch(e){} }

// ===== Categorías de frases ambientales: si una se silencia seguido, se retira sola
// (VISION-MAESTRA.md: "Aprender de ser callado"). No es un castigo permanente -- vive
// en una ventana de las últimas VENTANA_SILENCIO ofertas, así que si el patrón cambia
// (otro humor del día, se corrigió lo que molestaba) se recupera sola con el tiempo. =====
var _ultimaOfrecida=null; // {cat, t} -- para correlacionar con el próximo "cállate"
function categoriaPermitida(categoria){
  var p=_cargar(), c=p.categorias[categoria];
  if(!c || c.ofertas<MIN_OFERTAS_SILENCIO) return true; // sin muestra suficiente: no suprime, no inventa
  return (c.silencios/c.ofertas) < TASA_SILENCIO_SUPRIME;
}
function registrarOferta(categoria){
  if(!categoria) return;
  var p=_cargar();
  if(!p.categorias[categoria]) p.categorias[categoria]={ofertas:0,silencios:0,hist:[]};
  var c=p.categorias[categoria];
  c.hist.push({t:Date.now(),silenciada:false});
  if(c.hist.length>VENTANA_SILENCIO) c.hist.shift();
  c.ofertas=c.hist.length; c.silencios=c.hist.filter(function(x){return x.silenciada;}).length;
  _ultimaOfrecida={cat:categoria,t:Date.now()};
  _guardar();
}
function registrarSilencio(){
  if(!_ultimaOfrecida) return;
  var vencido = Date.now()-_ultimaOfrecida.t>MS_CORRELACION_SILENCIO;
  var cat=_ultimaOfrecida.cat;
  _ultimaOfrecida=null;
  if(vencido) return; // te callaste, pero de algo que ya había pasado hace rato -- no es reacción a esa categoría
  var p=_cargar(), c=p.categorias[cat];
  if(c && c.hist.length){
    c.hist[c.hist.length-1].silenciada=true;
    c.silencios=c.hist.filter(function(x){return x.silenciada;}).length;
    _guardar();
  }
}

// ===== Hora de salida =====
function registrarInicioViaje(){
  var p=_cargar();
  p.horasSalida.push(new Date().getHours());
  if(p.horasSalida.length>VENTANA_VIAJES) p.horasSalida.shift();
  _guardar();
}

// ===== Paradas: duración real por parada (no cuánto dura el viaje) =====
var _paradaIniT=0;
function registrarParada(sp, spAnterior){
  if(sp===0 && spAnterior>0){ _paradaIniT=Date.now(); return; }
  if(sp>0 && spAnterior===0 && _paradaIniT){
    var durMin=(Date.now()-_paradaIniT)/60000;
    _paradaIniT=0;
    // Descarta ruido de GPS (parada de segundos) y "olvidos" de cerrar el viaje
    // (parada de horas, el ciclista se fue a hacer otra cosa con el GPS prendido).
    if(durMin<0.3 || durMin>45) return;
    var p=_cargar();
    p.viajesParada.push(+durMin.toFixed(1));
    if(p.viajesParada.length>VENTANA_PARADAS) p.viajesParada.shift();
    _guardar();
  }
}

// ===== Esfuerzo en subida: velocidad real mantenida en pendiente exigente =====
var _tUltimaMuestraSubida=0;
function registrarEsfuerzoSubida(kmh, pendiente){
  if(pendiente==null || pendiente<4 || !kmh || kmh<=0) return; // solo subidas de verdad (>=4%), no ruido de plano
  var ahora=Date.now();
  if(ahora-_tUltimaMuestraSubida<15000) return; // 1 muestra cada 15s -- no satura con cada fix del GPS
  _tUltimaMuestraSubida=ahora;
  var p=_cargar();
  p.subida.push(+kmh.toFixed(1));
  if(p.subida.length>VENTANA_SUBIDA) p.subida.shift();
  _guardar();
}

// ===== Resumen en texto plano para el prompt de Pistero (campo "preferencias", que
// worker.js YA sabe leer -- ver personalidad() en worker-ia/worker.js). Solo entran
// rasgos con muestra suficiente: sin dato real cerca, mejor no decir nada. =====
function resumenTexto(){
  var p=_cargar(), partes=[];
  if(p.horasSalida.length>=MIN_MUESTRAS_HORA){
    var buckets={manana:0,tarde:0,noche:0};
    p.horasSalida.forEach(function(hh){ if(hh>=5&&hh<12)buckets.manana++; else if(hh>=12&&hh<19)buckets.tarde++; else buckets.noche++; });
    var top=Object.keys(buckets).sort(function(a,b){return buckets[b]-buckets[a];})[0];
    if(buckets[top]/p.horasSalida.length>=0.5){
      partes.push('suele salir a andar '+({manana:'en la mañana',tarde:'en la tarde',noche:'de noche'}[top]));
    }
  }
  if(p.viajesParada.length>=MIN_MUESTRAS_PARADA){
    var prom=p.viajesParada.reduce(function(a,b){return a+b;},0)/p.viajesParada.length;
    if(prom<3) partes.push('para poco durante sus viajes, casi no se detiene');
    else if(prom>10) partes.push('para bastante seguido a descansar o mirar el paisaje');
  }
  if(p.subida.length>=MIN_MUESTRAS_SUBIDA){
    var promKmh=p.subida.reduce(function(a,b){return a+b;},0)/p.subida.length;
    partes.push('en subidas exigentes (4%+) mantiene unos '+promKmh.toFixed(1)+' km/h de promedio');
  }
  return partes.length ? (partes.join('; ')+'.') : '';
}

// Solo lectura -- para pistero-diag.js. No expone nada que no exista ya en
// localStorage; existe porque "¿por qué dejó de sonar esta categoría?" no se
// puede responder desde afuera sin ver ofertas/silencios crudos, no solo el
// booleano de categoriaPermitida().
function debugCategorias(){
  var p=_cargar(), out={};
  Object.keys(p.categorias).forEach(function(cat){
    var c=p.categorias[cat];
    out[cat]={ofertas:c.ofertas, silencios:c.silencios, tasa:c.ofertas?+(c.silencios/c.ofertas).toFixed(2):0, permitida:categoriaPermitida(cat)};
  });
  return out;
}

window.PisteroMemoria={
  categoriaPermitida: categoriaPermitida,
  registrarOferta: registrarOferta,
  registrarSilencio: registrarSilencio,
  registrarInicioViaje: registrarInicioViaje,
  registrarParada: registrarParada,
  registrarEsfuerzoSubida: registrarEsfuerzoSubida,
  resumenTexto: resumenTexto,
  debugCategorias: debugCategorias
};
})();
