/* ================================================================
   voz-trozos.js — Frases de Pistero armadas con trozos PREGRABADOS
   ================================================================
   Pedido de Inty (2026-10-04): no gastar ElevenLabs en vivo en las frases del copiloto
   (pistero-copiloto.js). Las que llevan números ("Llegaste. 22 km en 1:18.") no se
   pueden pregrabar enteras, así que se arman con trozos: "Llegaste." + "veintidós" +
   "kilómetros en" + "una hora" + "dieciocho" + "minutos".

   - Trozos por género Y personalidad (voces-el/trozos/<g>/<arq>/<clave>.mp3), generados
     una sola vez con scripts/gen-voz-trozos.js usando el mismo voice_id de cada
     arquetipo: nunca se mezclan dos timbres en una frase.
   - Lo único que va en vivo es el nombre de un lugar ("Llifén"): el worker lo deja en
     caché 24 h, así que se paga una vez por lugar, no por viaje.
   - Si falta el manifest o un trozo, la frase sigue por el camino de siempre
     (voz-motor.js). Cero riesgo: sin los audios la app se comporta igual que hoy.
   Lógica pura probada en tests/voz-trozos.test.mjs. */

/* ---------- catálogo de trozos (clave -> lo que se graba) ---------- */
var VT_UNIDADES = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
var VT_DECENAS = { 3:'treinta', 4:'cuarenta', 5:'cincuenta', 6:'sesenta', 7:'setenta', 8:'ochenta', 9:'noventa' };
var VT_CENTENAS = { 1:'ciento', 2:'doscientos', 3:'trescientos', 4:'cuatrocientos', 5:'quinientos', 6:'seiscientos', 7:'setecientos', 8:'ochocientos', 9:'novecientos' };
function vtPalabra(n){
  if(n < 30) return VT_UNIDADES[n];
  var d = Math.floor(n / 10), u = n % 10;
  return VT_DECENAS[d] + (u ? ' y ' + VT_UNIDADES[u] : '');
}

var VT_FRASES = {
  // Frases fijas del copiloto (pistero-copiloto.js, clima-datos.js, motor-gps.js, Ajustes).
  'f_grabando': 'Grabando. Vamos.',
  'f_tercio': 'Un tercio. Buen ritmo.',
  'f_mitad': 'Mitad del camino.',
  'f_dos_tercios': 'Dos tercios. Queda poco.',
  'f_empieza_subida': 'Empieza una subida.',
  'f_bajada_larga': 'Bajada larga.',
  'f_tormenta': 'Tormenta cerca. Busca dónde parar.',
  'f_callado': 'Voy a hablar solo lo justo.',
  'f_hablador': 'Buena, te acompaño más seguido.',
  'f_normal': 'Listo, ritmo normal.',
  'f_record': 'Tu viaje más largo.',
  // Piezas para armar.
  'p_llegaste': 'Llegaste.',
  'p_vamos': 'Vamos.',
  'p_buen_ritmo': 'Buen ritmo.',
  'p_vas_bien': 'Vas bien.',
  'p_quedan': 'Quedan',
  'p_km_a': 'kilómetros a',
  'p_km_en': 'kilómetros en',
  'p_km_en1': 'kilómetro en',
  'p_kilometros': 'kilómetros.',
  'p_kilometro': 'kilómetro.',
  'p_metros': 'metros.',
  'p_subida_fuerte': 'Subida fuerte,',
  'p_subida': 'Subida,',
  'p_subida_muy_fuerte': 'Subida muy fuerte:',
  'p_bajada_fuerte': 'Bajada fuerte:',
  'p_por_ciento_coma': 'por ciento,',
  'p_por_ciento': 'por ciento.',
  'p_viento_contra': 'Viento en contra,',
  'p_se_levanto_viento': 'Se levantó viento:',
  'p_km_hora': 'kilómetros por hora.',
  'p_sube_lluvia': 'Sube la lluvia:',
  'p_baja_lluvia': 'Baja la lluvia:',
  'p_bajo_temp': 'Bajó la temperatura:',
  'p_grados': 'grados.',
  'p_grado': 'grado.',
  'p_hora': 'hora',
  'p_horas': 'horas',
  'p_minutos': 'minutos.',
  'p_minuto': 'minuto.',
  'p_horas_fin': 'horas.',
  'p_hora_fin': 'hora.',
  'p_coma': 'coma',
  'p_menos': 'menos',
  'p_mil': 'mil',
  'p_cien': 'cien'
};
(function(){
  var i;
  for(i = 0; i < 100; i++) VT_FRASES['n_' + i] = vtPalabra(i);
  // a_N: antes de un sustantivo masculino ("un kilómetro", "veintiún", "treinta y un metros").
  // m_N: antes de "hora" ("una hora", "veintiuna horas").
  for(i = 1; i < 100; i += 10) if(i !== 11) VT_FRASES['a_' + i] = (i === 1 ? 'un' : i === 21 ? 'veintiún' : VT_DECENAS[Math.floor(i / 10)] + ' y un');
  VT_FRASES['m_1'] = 'una'; VT_FRASES['m_21'] = 'veintiuna';
  for(i = 1; i <= 9; i++) VT_FRASES['c_' + i] = VT_CENTENAS[i];
})();
function vtClaves(){ return Object.keys(VT_FRASES); }

/* ---------- números -> claves ---------- */
// genero: 'm' (kilómetros, metros, grados: "veintiún"), 'f' (horas: "veintiuna"), '' (suelto: "veintiuno").
function _vtMenor100(n, genero){
  if(n % 10 === 1 && n !== 11){
    if(genero === 'm') return ['a_' + n];
    if(genero === 'f' && (n === 1 || n === 21)) return ['m_' + n];
  }
  return ['n_' + n];
}
function _vtMenor1000(n, genero){
  if(n < 100) return _vtMenor100(n, genero);
  if(n === 100) return ['p_cien'];
  var c = Math.floor(n / 100), r = n % 100;
  return ['c_' + c].concat(r ? _vtMenor100(r, genero) : []);
}
function vtNumero(n, genero){
  n = Math.round(Math.abs(n));
  if(n >= 1000000) return null;
  if(n < 1000) return _vtMenor1000(n, genero);
  var m = Math.floor(n / 1000), r = n % 1000;
  var miles = m === 1 ? ['p_mil'] : _vtMenor1000(m, 'm').concat(['p_mil']);
  return miles.concat(r ? _vtMenor1000(r, genero) : []);
}
// "6,4" -> seis coma cuatro (sin apócope: "uno coma cinco kilómetros").
function vtDecimal(txt, genero){
  var p = String(txt).replace('.', ',').split(',');
  var ent = parseInt(p[0], 10); if(isNaN(ent)) return null;
  if(p.length === 1) return vtNumero(ent, genero);
  var dec = parseInt(p[1], 10); if(isNaN(dec) || p[1].length !== 1) return null;
  return vtNumero(ent, '').concat(['p_coma', 'n_' + dec]);
}
function _vtEsUno(txt){ return String(txt).replace(',', '.') === '1'; }

/* ---------- frase -> plan de trozos ---------- */
// Devuelve [{c:'clave'} | {vivo:'texto'}] o null si la frase no se puede armar.
var _VT_FIJAS = null;
function vtPlan(texto){
  var t = String(texto || '').trim(), m, k;
  if(!_VT_FIJAS){ _VT_FIJAS = {}; for(k in VT_FRASES) if(k.indexOf('f_') === 0) _VT_FIJAS[VT_FRASES[k]] = k; }
  if(_VT_FIJAS[t]) return [{ c: _VT_FIJAS[t] }];
  var C = function(arr){ return arr ? arr.map(function(c){ return { c: c }; }) : null; };
  var unir = function(){ var out = []; for(var i = 0; i < arguments.length; i++){ if(!arguments[i]) return null; out = out.concat(arguments[i]); } return out; };
  var km = function(x){ return C(vtDecimal(x, 'm')); };

  if((m = t.match(/^(\d+(?:,\d)?) km a (.+)\. Vamos\.$/))) return unir(km(m[1]), C(['p_km_a']), [{ vivo: m[2] + '.' }], C(['p_vamos']));
  if((m = t.match(/^(\d+(?:,\d)?) km\. (Buen ritmo|Vas bien)\.$/)))
    return unir(km(m[1]), C([_vtEsUno(m[1]) ? 'p_kilometro' : 'p_kilometros', m[2] === 'Buen ritmo' ? 'p_buen_ritmo' : 'p_vas_bien']));
  if((m = t.match(/^Quedan (\d+(?:,\d)?) km\.$/))) return unir(C(['p_quedan']), km(m[1]), C([_vtEsUno(m[1]) ? 'p_kilometro' : 'p_kilometros']));
  if((m = t.match(/^Llegaste\. (\d+(?:,\d)?) km en (?:(\d+) minutos|(\d+):(\d\d))\.( Tu viaje más largo\.)?$/))){
    var dur;
    if(m[2] != null){ var mi = +m[2]; dur = unir(C(vtNumero(mi, 'm')), C([mi === 1 ? 'p_minuto' : 'p_minutos'])); }
    else {
      var hh = +m[3], mm = +m[4];
      dur = unir(C(vtNumero(hh, 'f')), C([hh === 1 ? (mm ? 'p_hora' : 'p_hora_fin') : (mm ? 'p_horas' : 'p_horas_fin')]),
        mm ? unir(C(vtNumero(mm, 'm')), C([mm === 1 ? 'p_minuto' : 'p_minutos'])) : []);
    }
    return unir(C(['p_llegaste']), km(m[1]), C([_vtEsUno(m[1]) ? 'p_km_en1' : 'p_km_en']), dur, m[5] ? C(['f_record']) : []);
  }
  if((m = t.match(/^Subida( fuerte)?, (\d+) metros\.$/))) return unir(C([m[1] ? 'p_subida_fuerte' : 'p_subida']), C(vtNumero(+m[2], 'm')), C(['p_metros']));
  if((m = t.match(/^Subida muy fuerte: (\d+)%, (\d+) metros\.$/))) return unir(C(['p_subida_muy_fuerte']), C(vtNumero(+m[1], 'm')), C(['p_por_ciento_coma']), C(vtNumero(+m[2], 'm')), C(['p_metros']));
  if((m = t.match(/^Bajada fuerte: (\d+)%\.$/))) return unir(C(['p_bajada_fuerte']), C(vtNumero(+m[1], 'm')), C(['p_por_ciento']));
  if((m = t.match(/^(Viento en contra,|Se levantó viento:) (\d+) kilómetros por hora\.$/)))
    return unir(C([m[1] === 'Viento en contra,' ? 'p_viento_contra' : 'p_se_levanto_viento']), C(vtNumero(+m[2], 'm')), C(['p_km_hora']));
  if((m = t.match(/^(Sube|Baja) la lluvia: (\d+) por ciento\.$/))) return unir(C([m[1] === 'Sube' ? 'p_sube_lluvia' : 'p_baja_lluvia']), C(vtNumero(+m[2], 'm')), C(['p_por_ciento']));
  if((m = t.match(/^Bajó la temperatura: (-?\d+) grados\.$/))){
    var g = +m[1];
    return unir(C(['p_bajo_temp']), g < 0 ? C(['p_menos']) : [], C(vtNumero(g, 'm')), C([Math.abs(g) === 1 ? 'p_grado' : 'p_grados']));
  }
  return null;
}

/* ---------- reproducción (la llama _reproducirVoz en voz-motor.js) ---------- */
window.VT_MANIFEST = null;
try{
  fetch('voces-el/trozos/manifest.json')
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(mf){ window.VT_MANIFEST = mf; })
    .catch(function(){});
}catch(e){}
function _vtArq(){ return (typeof pisteroPersonalidad !== 'undefined' && pisteroPersonalidad) ? pisteroPersonalidad : 'cercano'; }
// ¿Se puede decir esta frase con trozos para la voz actual? Devuelve el plan o null.
function vtPlanDisponible(texto){
  try{
    var mf = window.VT_MANIFEST, g = (typeof pisteroGenero !== 'undefined' && pisteroGenero === 'c') ? 'c' : 'l';
    if(!mf || !mf.voces || !mf.voces[g] || mf.voces[g].indexOf(_vtArq()) === -1) return null;
    var plan = vtPlan(texto);
    if(!plan) return null;
    for(var i = 0; i < plan.length; i++) if(plan[i].c && mf.claves.indexOf(plan[i].c) === -1) return null;
    return plan;
  }catch(e){ return null; }
}
// Toca los trozos uno tras otro. Si el PRIMERO falla, la frase entera sigue por el camino
// de siempre (alFallar); si falla uno a mitad, se salta y sigue, para no repetir la frase.
function _vozTrozos(item, durEst, plan, miGen, alFallar){
  var g = (typeof pisteroGenero !== 'undefined' && pisteroGenero === 'c') ? 'c' : 'l', arq = _vtArq();
  var rate = (typeof _rateArq === 'function') ? _rateArq() : 1;
  var i = 0, sono = false;
  var terminar = function(){ if(miGen !== vozGen) return; clearTimeout(vozTimerFin); _vozNeuralAudio = null; _vozSiguiente(); };
  var siguiente = function(){
    if(miGen !== vozGen) return;
    if(i >= plan.length) return terminar();
    var s = plan[i++], url;
    if(s.c) url = 'voces-el/trozos/' + g + '/' + arq + '/' + s.c + '.mp3';
    else url = IA_URL + '/?eltts=' + encodeURIComponent(s.vivo.slice(0, 120)) + '&g=' + g + '&voz=' + encodeURIComponent(_vozELid()) + '&vel=' + _velArq();
    var a = new Audio(url);
    if(s.c){ try{ a.playbackRate = rate; }catch(e){} }
    _vozNeuralAudio = a;
    clearTimeout(vozTimerFin);
    vozTimerFin = setTimeout(siguiente, 6000); // un trozo colgado no deja mudo a Pistero
    a.onplaying = function(){ sono = true; };
    a.onended = siguiente;
    a.onerror = function(){ if(!sono && i === 1 && alFallar){ clearTimeout(vozTimerFin); alFallar(); } else siguiente(); };
    var p = a.play(); if(p && p.catch) p.catch(a.onerror);
  };
  if(typeof _pisteroHabla === 'function') _pisteroHabla(durEst);
  siguiente();
}
