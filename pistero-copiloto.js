/* ================================================================
   pistero-copiloto.js — Pistero en ruta: copiloto breve y directo
   ================================================================
   Aprobado por Inty el 2026-10-04 ("la precaución vial es invasiva y se equivoca";
   "debe ser breve y directo"). Ver COORDINACION-IA/HANDOFF-2026-10-04-NOCHE.md §3.5.

   - Copiloto (siempre, fuera del tope): subidas, bajadas largas, curvas, viento, clima.
     Informa lo que viene; la persona decide. Sin "cuidado", "frena" ni "respeta".
   - Compañía: 4 por viaje (salida, 2 intermedias, llegada). Viajes de más de 60 km
     suman 1 cada 30 km extra, hasta 6. "Pistero habla" (Ajustes) controla solo esto:
     Callado = solo la llegada, Normal = 4, Hablador = 6.
   - Dato cultural: 1 cada 10 km (Hablador: cada 5), una vez por lugar.
   - Se acabó el banco "ciudad" (confundía pueblos con ciudad: "semáforo" en el campo),
     los sermones de velocidad y el hito cada 10 km.
   La lógica es pura (tests/pistero-copiloto.test.mjs); lo de abajo solo la conecta. */

var COP_MAX_COMPANIA = 6;

/* ---------- lógica pura ---------- */
function copNivel(){
  var c = (typeof pisteroCharla !== 'undefined') ? pisteroCharla : 'normal';
  return (c === 'callado' || c === 'hablador') ? c : 'normal';
}
// Cuántas frases de compañía tiene el viaje en total (salida + intermedias + llegada).
function copTotalCompania(kmTotal, nivel){
  if(nivel === 'callado') return 1; // solo la llegada
  if(nivel === 'hablador') return COP_MAX_COMPANIA;
  if(kmTotal > 60) return Math.min(COP_MAX_COMPANIA, 4 + Math.ceil((kmTotal - 60) / 30));
  return 4;
}
// Km del viaje en que van las frases intermedias.
// Con destino: repartidas parejo (22 km -> 7,3 y 14,7). Sin destino: 5, 15, 45 y 75 km.
function copPuntosIntermedios(kmTotal, nivel){
  var total = copTotalCompania(kmTotal || 0, nivel);
  var n = nivel === 'callado' ? 0 : total - 2;
  var out = [];
  if(kmTotal > 0){
    for(var i = 1; i <= n; i++) out.push(Math.round(kmTotal * i / (n + 1) * 10) / 10);
  } else {
    // Sin destino no se sabe el largo: se ofrecen las 4 y copCompaniaEnRuta() deja solo
    // 5 y 15 en Normal hasta que el viaje se alarga (igual que la regla de los 60 km).
    out = nivel === 'callado' ? [] : [5, 15, 45, 75];
  }
  return out;
}
function _copKm(km){ var r = Math.round(km); return (Math.abs(km - r) < 0.05 ? r : Math.round(km * 10) / 10).toString().replace('.', ','); }
function copTextoIntermedio(i, n, kmTotal, kmPunto){
  if(kmTotal > 0){
    var f = (i + 1) / (n + 1);
    if(Math.abs(f - 1/3) < 0.04) return 'Un tercio. Buen ritmo.';
    if(Math.abs(f - 1/2) < 0.04) return 'Mitad del camino.';
    if(Math.abs(f - 2/3) < 0.04) return 'Dos tercios. Queda poco.';
    var faltan = kmTotal - kmPunto;
    return faltan < kmTotal / 4 ? 'Quedan ' + _copKm(faltan) + ' km.' : _copKm(kmPunto) + ' km. Buen ritmo.';
  }
  return kmPunto === 5 ? '5 km. Buen ritmo.' : _copKm(kmPunto) + ' km. Vas bien.';
}
function copSalidaTexto(kmTotal, destino){
  var lugar = String(destino || '').split(',')[0].trim();
  if(kmTotal > 0 && lugar) return _copKm(kmTotal) + ' km a ' + lugar + '. Vamos.';
  return 'Grabando. Vamos.';
}
function copDuracion(ms){
  var min = Math.max(0, Math.round(ms / 60000));
  if(min < 60) return min + ' minutos';
  var h = Math.floor(min / 60), m = min % 60;
  return h + ':' + (m < 10 ? '0' : '') + m;
}
function copLlegadaTexto(km, ms, record){
  return 'Llegaste. ' + _copKm(km) + ' km en ' + copDuracion(ms) + '.' + (record ? ' Tu viaje más largo.' : '');
}
// Subida/bajada anticipada (perfil de elevación de la ruta). distM = largo del tramo.
// Devuelve null cuando no vale la pena hablar (bajada corta y suave).
function copPendienteTexto(tipo, grade, distM){
  var g = Math.abs(Math.round(grade)), d = Math.max(100, Math.round(distM / 100) * 100);
  if(tipo === 'subida'){
    if(g >= 8) return 'Subida muy fuerte: ' + g + '%, ' + d + ' metros.';
    return (g >= 5 ? 'Subida fuerte, ' : 'Subida, ') + d + ' metros.';
  }
  if(tipo === 'bajada'){
    if(g >= 8) return 'Bajada fuerte: ' + g + '%.';
    if(d >= 500) return 'Bajada larga.';
  }
  return null;
}
// Cada cuántos km puede sonar un dato cultural.
function copKmEntreDatos(nivel){ return nivel === 'hablador' ? 5 : 10; }

/* ---------- estado del viaje ---------- */
var _copHechos = 0, _copUltimoKmViaje = -1, _copKmDato = -1e9, _copLlegadaTs = 0;
// El viaje se reinicia solo: si los km del viaje bajan, es un viaje nuevo.
function _copSincronizar(kmViaje){
  if(kmViaje + 0.05 < _copUltimoKmViaje){ _copHechos = 0; _copKmDato = -1e9; }
  _copUltimoKmViaje = kmViaje;
}
// Llamado en cada punto de GPS (bromasDelCamino en motor-gps.js).
function copCompaniaEnRuta(kmViaje, kmRutaTotal){
  _copSincronizar(kmViaje);
  var nivel = copNivel();
  var puntos = copPuntosIntermedios(kmRutaTotal || 0, nivel);
  if(!(kmRutaTotal > 0) && nivel === 'normal'){
    // Sin destino: 2 intermedias; si el viaje pasa de 60 km, se suman las de 45 y 75.
    puntos = kmViaje > 40 ? puntos : puntos.slice(0, 2);
  }
  if(_copHechos >= puntos.length || kmViaje < puntos[_copHechos]) return null;
  var i = _copHechos;
  while(_copHechos < puntos.length && kmViaje >= puntos[_copHechos]) _copHechos++; // si saltó varios (señal perdida), dice uno solo
  return copTextoIntermedio(i, puntos.length, kmRutaTotal || 0, puntos[i]);
}
function copPuedeDato(kmViaje){
  _copSincronizar(kmViaje);
  return kmViaje - _copKmDato >= copKmEntreDatos(copNivel());
}
function copMarcarDato(kmViaje){ _copKmDato = kmViaje; }
// Llegada: 1 sola vez aunque la llamen la navegación y el resumen del viaje a la vez.
function copDecirLlegada(km, ms){
  try{
    if(!(km >= 0.5) || Date.now() - _copLlegadaTs < 120000) return;
    _copLlegadaTs = Date.now();
    var clave = 'lp_viaje_max_' + ((typeof cu !== 'undefined' && cu) || 'anon');
    var max = parseFloat(localStorage.getItem(clave) || '0') || 0;
    var record = max > 0 && km > max + 0.05;
    if(km > max) localStorage.setItem(clave, String(Math.round(km * 100) / 100));
    if(typeof h === 'function') h(copLlegadaTexto(km, ms, record));
  }catch(e){}
}

// Para el diagnóstico hablado ("hace rato no te escucho", pistero-diag.js).
function copEstado(){
  var km = (typeof _kmEsteViaje === 'number') ? _kmEsteViaje : 0;
  var nav = (typeof document !== 'undefined') && document.getElementById('nav-screen') && document.getElementById('nav-screen').classList.contains('active');
  var tot = (nav && typeof routeTotalDistance === 'number') ? routeTotalDistance : 0;
  var nivel = copNivel(), puntos = copPuntosIntermedios(tot, nivel);
  if(!(tot > 0) && nivel === 'normal' && km <= 40) puntos = puntos.slice(0, 2);
  var prox = null;
  for(var i = 0; i < puntos.length; i++) if(puntos[i] > km){ prox = puntos[i]; break; }
  return { nivel: nivel, kmViaje: Math.round(km * 10) / 10, kmRuta: tot, proximoKm: prox };
}
