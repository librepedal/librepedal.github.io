function wmoTexto(c){ const m={0:'despejado',1:'mayormente despejado',2:'parcialmente nublado',3:'nublado',45:'neblina',48:'neblina',51:'llovizna ligera',53:'llovizna',55:'llovizna intensa',61:'lluvia ligera',63:'lluvia',65:'lluvia fuerte',66:'lluvia helada',67:'lluvia helada',71:'nieve ligera',73:'nieve',75:'nieve intensa',77:'nieve',80:'chubascos',81:'chubascos',82:'chubascos fuertes',85:'nevadas',86:'nevadas',95:'tormenta',96:'tormenta con granizo',99:'tormenta con granizo'}; return m[c]||'clima variable'; }
async function climaDeZona(lat,lon){ try{ const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&hourly=precipitation_probability,temperature_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=3'); return await r.json(); }catch(e){ return null; } }
/* Enganche del efecto visual de clima (clima-fx.js) a los datos REALES de Open-Meteo.
   Mapeo de codigo WMO (mismas categorias que wmoTexto, arriba) a los modos que expone
   climaFxSetMode(). Umbral de "sol" (calor extremo) = 30 grados — CONFIRMADO por Inty
   2026-08-14. Tormenta (95-99) usa el modo 'lluvia' (el mas intenso, el modulo no tiene
   un modo propio de tormenta). Cielo despejado bajo 30 grados = 'solsuave', agregado el
   2026-08-17: antes un dia lindo y fresco no mostraba NADA, que fue justo el reclamo. */
function _climaFxModoDesde(codigo,temp){
  if(codigo==null) return 'off';
  if(codigo>=95) return 'lluvia';
  if((codigo>=51&&codigo<=67)||(codigo>=80&&codigo<=82)) return 'lluvia';
  if((codigo>=71&&codigo<=77)||codigo===85||codigo===86) return 'nieve';
  if(codigo===45||codigo===48) return 'neblina';
  if(codigo===2||codigo===3) return 'nubes';
  // Cielo despejado: 30°C o más es golpe de calor ('sol' = ondas de radiación
  // + pollo asado). Un día lindo normal muestra 'solsuave', que es solo luz.
  if(codigo===0||codigo===1) return (temp!=null&&temp>=30)?'sol':'solsuave';
  return 'off';
}
function _climaFxAplicar(w){
  if(!w||!w.current) return;
  const modo=_climaFxModoDesde(w.current.weather_code,w.current.temperature_2m);
  _climaModoActual=modo; // usado por _factorDesgasteClima() en la mantención preventiva
  if(!window.climaFxSetMode) return;
  try{ window.climaFxSetMode(modo); }catch(e){}
}
/* Cobertura de la pantalla de login (#auth) y de cualquier momento sin viaje activo:
   vigilarClima() solo corre durante un viaje (ver mas abajo), asi que sin esto el clima
   nunca se veia antes de arrancar a pedalear. NO pide permiso de geolocalizacion nuevo
   (seria un prompt sorpresa en el login, riesgoso justo antes del lanzamiento) — usa la
   Permissions API para preguntar en silencio si el permiso YA esta concedido de una
   sesion anterior, y solo ahi consulta el clima. Si no esta concedido, no hace nada: el
   efecto igual se activa apenas el usuario prenda el GPS por cualquier via existente. */
async function _climaFxInicial(){
  try{
    if(!navigator.permissions||!navigator.geolocation) return;
    const st=await navigator.permissions.query({name:'geolocation'});
    if(st.state!=='granted') return;
    navigator.geolocation.getCurrentPosition(function(pos){
      climaDeZona(pos.coords.latitude,pos.coords.longitude).then(_climaFxAplicar);
    }, function(){}, {enableHighAccuracy:false, timeout:8000, maximumAge:600000});
  }catch(e){}
}
if(document.readyState==='complete') _climaFxInicial(); else window.addEventListener('load',_climaFxInicial);
setInterval(function(){ if(currentUserLocation) climaDeZona(currentUserLocation.lat,currentUserLocation.lon).then(_climaFxAplicar); }, 1200000);
// Comando de voz "¿cómo está el clima?": responde con datos REALES de tu zona (la
// misma API que ya usa el resumen de ruta), no con lo que la IA general "crea" que
// hace el clima ahí — eso es lo que antes hacía que Pistero "no supiera" contestar.
// Reporte real de Inty: preguntó "el clima de mañana en X" y no le respondió —
// esta función solo sabía el clima de AHORA en tu ubicación ACTUAL, ignoraba
// "mañana" y cualquier lugar mencionado. Ahora entiende ambos (climaDeZona ya
// traía el pronóstico de 3 días, solo faltaba usarlo; el lugar se geocodifica
// igual que un destino de viaje, con el mismo buscador de siempre).
async function _pisteroDecirClima(raw){
  raw=raw||'';
  let dia=0, diaTexto='ahora mismo', diaTextoCap='Ahora mismo';
  if(/pasado\s+ma[ñn]ana/i.test(raw)){ dia=2; diaTexto='pasado mañana'; diaTextoCap='Pasado mañana'; }
  else if(/\bma[ñn]ana\b/i.test(raw)){ dia=1; diaTexto='mañana'; diaTextoCap='Mañana'; }
  // "en <lugar>", cortando antes de "hoy/mañana/pasado mañana" si vienen pegados
  // después del lugar (ej. "el clima en Viña del Mar mañana"), o al final/signo
  // de puntuación si no. Descarta candidatos que en realidad son parte del tiempo
  // ("en la tarde/noche/mañana") para no intentar geocodificar eso como si fuera
  // un lugar real.
  const mLugar=raw.match(/\ben\s+([a-záéíóúñüA-ZÁÉÍÓÚÑÜ][a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s]{2,40}?)(?:\s+(?:hoy|ma[ñn]ana|pasado\s+ma[ñn]ana)\b|[\?\.!,]|$)/i);
  let lat, lon, nombreLugar=null;
  if(mLugar && mLugar[1] && !/^(la |el )?(tarde|noche|mañana|manana|madrugada|momento|rato)$/i.test(mLugar[1].trim())){
    const candidato=mLugar[1].trim();
    h('Dame un segundo, busco el clima de '+candidato+'...');
    let dest=null; try{ dest=await geocodeDestino(candidato); }catch(e){ dest=null; }
    if(dest){ lat=dest.lat; lon=dest.lon; nombreLugar=candidato; }
  }
  if(lat==null){
    lat=currentUserLocation&&currentUserLocation.lat; lon=currentUserLocation&&currentUserLocation.lon;
    if(!lat && us && us.la){ lat=us.la; lon=us.lo; }
  }
  if(!lat){ h('Necesito saber dónde estás para el clima — activa el GPS, o dime el lugar, y pregúntame de nuevo.'); return; }
  if(!nombreLugar) h('Dame un segundo, reviso el clima'+(dia>0?' de '+diaTexto:' de tu zona')+'...');
  let w=null; try{ w=await climaDeZona(lat,lon); }catch(e){ w=null; }
  if(!w){ h('No pude traer el clima ahora mismo, prueba de nuevo en un rato.'); return; }
  const lugarTxt=nombreLugar?(' en '+nombreLugar):'';
  if(dia===0){
    if(!w.current){ h('No pude traer el clima ahora mismo, prueba de nuevo en un rato.'); return; }
    const temp=Math.round(w.current.temperature_2m);
    const desc=wmoTexto(w.current.weather_code);
    const lluvia=(w.daily && w.daily.precipitation_probability_max && w.daily.precipitation_probability_max[0]) || 0;
    const remate = lluvia>=50 ? '. Alta probabilidad de lluvia hoy, lleva algo para el agua.' : lluvia>=20 ? '. Puede caer algo de lluvia, ojo con eso.' : '.';
    h('Ahora mismo hay '+temp+' grados'+lugarTxt+' y está '+desc+remate);
    return;
  }
  if(!w.daily || w.daily.weather_code==null || w.daily.weather_code[dia]==null){ h('No tengo el pronóstico de '+diaTexto+' todavía, prueba con el clima de hoy.'); return; }
  const max=Math.round(w.daily.temperature_2m_max[dia]), min=Math.round(w.daily.temperature_2m_min[dia]);
  const desc=wmoTexto(w.daily.weather_code[dia]);
  const lluvia=w.daily.precipitation_probability_max[dia]||0;
  const remate = lluvia>=50 ? ' Alta probabilidad de lluvia, lleva algo para el agua.' : lluvia>=20 ? ' Puede caer algo de lluvia, ojo con eso.' : '';
  h(diaTextoCap+lugarTxt+' va a estar '+desc+', entre '+min+' y '+max+' grados.'+remate);
}
// ===== Predicción real: lluvia ANTES de que caiga, no solo "hoy hay % de lluvia" al
// salir. Mira las próximas 2 horas del pronóstico horario y avisa una sola vez por
// viaje si viene fuerte, con tiempo para buscar techo o cambiar de planes.
var _ultimoChequeoLluvia=0, _avisoLluviaHecho=false; // var a propósito: se resetean desde fuera de este archivo al terminar/reiniciar un viaje
/* ===== VIGILANCIA DEL CLIMA DURANTE EL VIAJE =====
   Pedido por Inty (2026-07-20): que la app siga mirando el clima y, si CAMBIA respecto
   a lo que ya había pronosticado, lo diga con anticipación.
   Antes solo existía un aviso de lluvia que sonaba UNA vez por viaje y no recordaba el
   pronóstico anterior: si el tiempo empeoraba después, la app se quedaba muda. Ahora se
   guarda una foto del pronóstico al empezar y cada chequeo se compara contra ella.
   Solo se habla cuando el cambio es REAL y le cambia la decisión al ciclista — un 5% más
   de probabilidad no le sirve a nadie y desgasta la confianza en la voz (ver DOCTRINA 2
   en VISION-MAESTRA.md: el silencio es lo que le da valor a lo que sí se dice). */
let _climaBase=null, _climaUltimoAviso=0, _climaUltimoChequeo=0;
const CLIMA_MIN_ENTRE_AVISOS=1500000; // 25 min: ni el clima cambia tan rápido ni conviene hablar tanto
/* Cada cuánto se CONSULTA la API — distinto de cada cuánto se HABLA.
   Auditoría del 2026-07-20: el único freno miraba `_climaUltimoAviso`, que solo se
   actualiza cuando efectivamente hay algo que decir. Como la mayor parte del viaje no hay
   nada que anunciar, ese freno nunca bloqueaba y se llamaba a Open-Meteo **en cada
   actualización de GPS** — cerca de una petición por segundo, por usuario. Batería, datos
   móviles y camino directo a que nos limiten la API, lo que además dejaría sin clima a la
   esfera y al aviso de lluvia.
   Y había un segundo efecto peor: `_climaBase` se reemplazaba en cada vuelta, así que la
   comparación era contra la lectura de hace un segundo. Ningún pronóstico se mueve 30
   puntos en un segundo — el aviso de "cambió el pronóstico" era casi inalcanzable. */
const CLIMA_MIN_ENTRE_CHEQUEOS=900000; // 15 min entre consultas a la API
/* Decide si el clima cambió lo suficiente como para interrumpir al ciclista.
   Función pura y aparte para poder probarla sin salir a pedalear (tests/clima.test.mjs).
   base y actual: {lluvia:0-100, viento:km/h, temp:°C, codigo:WMO} */
function _cambioClimaRelevante(base, actual){
  if(!base || !actual) return null;
  const n=v=>(typeof v==='number' && isFinite(v)) ? v : null;
  const lluviaB=n(base.lluvia), lluviaA=n(actual.lluvia);
  const vientoB=n(base.viento), vientoA=n(actual.viento);
  const tempB=n(base.temp), tempA=n(actual.temp);
  // Tormenta: se avisa siempre, sin comparar con nada. Es la única que puede costar caro.
  if(n(actual.codigo)!==null && actual.codigo>=95)
    return {tipo:'tormenta', severidad:3, texto:'Ojo, se está armando tormenta por acá. Busca dónde parar, esto no es para seguir pedaleando.'};
  if(lluviaB!==null && lluviaA!==null){
    if(lluviaA-lluviaB>=30 && lluviaA>=50)
      return {tipo:'empeora', severidad:2, texto:'Cambió el pronóstico: ahora dan '+Math.round(lluviaA)+' por ciento de lluvia, bastante más que hace un rato. Si puedes, busca techo.'};
    if(lluviaB-lluviaA>=30 && lluviaA<30)
      return {tipo:'mejora', severidad:1, texto:'Buenas noticias: se despejó el pronóstico, la lluvia bajó a '+Math.round(lluviaA)+' por ciento. Sigue tranquilo.'};
  }
  // El viento en contra cansa más que la lluvia y casi ninguna app lo avisa.
  if(vientoB!==null && vientoA!==null && vientoA-vientoB>=15 && vientoA>=25)
    return {tipo:'viento', severidad:2, texto:'Se levantó viento: van '+Math.round(vientoA)+' kilómetros por hora. Si lo tienes en contra, baja un cambio y no pelees con él.'};
  // Mojado y con frío es donde la gente se complica de verdad.
  if(tempB!==null && tempA!==null && tempB-tempA>=5)
    return {tipo:'frio', severidad:2, texto:'Bajó la temperatura '+Math.round(tempB-tempA)+' grados, van '+Math.round(tempA)+'. Si andas mojado, abrígate antes de la próxima bajada.'};
  return null;
}
/* Vigila el clima durante todo el viaje, no solo al principio. La primera vez guarda la
   foto del pronóstico; después compara y solo habla si cambió de verdad. */
let _vientoUltimoAviso=0;
const VIENTO_MIN_ENTRE_AVISOS=480000; // 8 min: el rumbo cambia con las curvas, pero no hay que atosigar
const VIENTO_KMH_MIN=15; // bajo esto no se nota pedaleando, no vale la pena avisar
const VIENTO_ANGULO_CONTRA=50; // grados de tolerancia entre de dónde sopla el viento y tu rumbo, para llamarlo "en contra"
function _diferenciaAngular(a,b){ let d=Math.abs(a-b)%360; if(d>180) d=360-d; return d; }
/* Viento en contra: 2026-08-20, pedido nuevo de Inty. Usa el MISMO dato de viento que ya
   consulta vigilarClima (_climaBase) — no agrega otra llamada a la API — más el rumbo real
   calculado de tus últimos puntos GPS (mismo patrón que _revisarCiclistasAdelante). Solo
   aplica a modos donde el viento realmente se siente pedaleando: en auto/moto a velocidad
   de ruta no se nota, y no tiene sentido avisarlo ahí. Dato real, no cosmético:
   wind_direction_10m es de dónde SOPLA el viento (convención meteorológica) — si sopla
   desde cerca de tu propio rumbo de avance, te está pegando de frente. */
function _avisarVientoEnContra(rumbo){
  if(rumbo==null || !vozActiva || vozOcupada() || vozCola.length) return;
  if(typeof actividadTipo!=='undefined' && actividadTipo!=='ciclismo' && actividadTipo!=='cicloviaje' && actividadTipo!=='mtb') return;
  if(!_climaBase || _climaBase.viento==null || _climaBase.direccion==null) return;
  if(_climaBase.viento<VIENTO_KMH_MIN) return;
  const ahora=Date.now();
  if(ahora-_vientoUltimoAviso<VIENTO_MIN_ENTRE_AVISOS) return;
  if(_diferenciaAngular(_climaBase.direccion, rumbo)>VIENTO_ANGULO_CONTRA) return;
  _vientoUltimoAviso=ahora;
  h('Viento en contra, como '+Math.round(_climaBase.viento)+' kilómetros por hora. Vas a sentir más resistencia de lo normal.');
}
async function vigilarClima(lat,lon){
  // vozActiva solo bloquea el AVISO hablado — si el modulo de efectos visuales de clima
  // esta cargado, igual necesitamos seguir consultando para mantener el efecto al dia
  // aunque el usuario tenga la voz apagada (son dos features independientes).
  // 2026-08-24: ahora hay un TERCER consumidor del clima que no tiene nada que ver con
  // la voz ni con los efectos visuales — _climaModoActual alimenta _factorDesgasteClima()
  // (la mantencion preventiva desgasta 1.5x mas con lluvia/nieve). Con la voz apagada y
  // el modulo de efectos sin cargar, esta linea cortaba antes de _climaFxAplicar(), asi
  // que _climaModoActual se quedaba en 'off' y ese 1.5x no se aplicaba NUNCA. El freno
  // real de consultas a la API es CLIMA_MIN_ENTRE_CHEQUEOS (15 min) unas lineas mas
  // abajo, que sigue intacto: sacar este corte no agrega trafico, solo deja de saltarse
  // la actualizacion del modo de clima.
  const ahora=Date.now();
  if(ahora-_climaUltimoChequeo<CLIMA_MIN_ENTRE_CHEQUEOS) return; // freno de CONSULTA: sin esto se llamaba a la API cada segundo
  // El freno de AVISO (25 min) estaba ACA, antes de _climaFxAplicar(), y frenaba de más:
  // con la voz ENCENDIDA los efectos visuales y el desgaste por lluvia se actualizaban cada
  // 25 min, y con la voz apagada cada 15. Al revés de lo razonable, y por la misma causa de
  // fondo que el arreglo de arriba: un solo guard sirviendo a tres features distintas.
  // Ahora baja a donde corresponde — justo antes de hablar — y el único freno de tráfico
  // sigue siendo el de CONSULTA, que no se toca.
  _climaUltimoChequeo=ahora;
  try{
    const w=await climaDeZona(lat,lon);
    if(!w||!w.current) return;
    _climaFxAplicar(w);
    if(!vozActiva) return; // el resto de la funcion es solo para el AVISO hablado
    // Freno del AVISO, en su lugar: acá ya se aplicaron los efectos y el desgaste, así que
    // callarse no le quita nada a las otras dos features. `_climaBase` no se toca si se
    // corta acá, igual que antes: la próxima comparación sigue partiendo de la última foto
    // que sí se anunció.
    if(_climaBase && ahora-_climaUltimoAviso<CLIMA_MIN_ENTRE_AVISOS) return;
    const horas=w.hourly&&w.hourly.precipitation_probability, tiempos=w.hourly&&w.hourly.time;
    let lluvia=null;
    if(horas&&tiempos){
      const ahoraISO=(w.current.time||'').slice(0,13);
      let idx=tiempos.findIndex(function(t){ return t.slice(0,13)>=ahoraISO; });
      if(idx<0) idx=0;
      const prox=horas.slice(idx,idx+2);
      if(prox.length) lluvia=Math.max.apply(null,prox);
    }
    const foto={ lluvia:lluvia, viento:w.current.wind_speed_10m, direccion:w.current.wind_direction_10m, temp:w.current.temperature_2m, codigo:w.current.weather_code };
    if(!_climaBase){ _climaBase=foto; return; } // primera lectura: solo se guarda, no se habla
    const cambio=_cambioClimaRelevante(_climaBase, foto);
    _climaBase=foto; // la foto nueva pasa a ser la referencia
    if(!cambio) return;
    _climaUltimoAviso=ahora;
    // Prioridad SEGURIDAD solo para tormenta: lo demás no debe pisar una instrucción de ruta.
    if(cambio.severidad>=3 && typeof hUrgente==='function') hUrgente(cambio.texto);
    else if(!vozOcupada() && !vozCola.length) h(cambio.texto);
  }catch(e){}
}
async function _avisoLluviaProactivo(lat,lon){
  if(_avisoLluviaHecho || !vozActiva) return;
  const ahora=Date.now();
  if(ahora-_ultimoChequeoLluvia<1200000) return; // no chequear más de 1 vez cada 20 min
  _ultimoChequeoLluvia=ahora;
  try{
    const w=await climaDeZona(lat,lon);
    const horas=w&&w.hourly&&w.hourly.precipitation_probability, tiempos=w&&w.hourly&&w.hourly.time;
    if(!horas||!tiempos) return;
    // Open-Meteo con timezone=auto devuelve current.time y hourly.time en la MISMA hora
    // local de la zona consultada — comparar contra current.time (no contra un ISO UTC
    // del navegador) evita el desfase de varias horas que rompía esto en Chile/LatAm.
    const ahoraISO=(w.current&&w.current.time)?w.current.time.slice(0,13):new Date().toISOString().slice(0,13);
    let idx=tiempos.findIndex(function(t){ return t.slice(0,13)>=ahoraISO; });
    if(idx<0) idx=0;
    const proximas2h=horas.slice(idx,idx+2);
    const maxProb=Math.max.apply(null, proximas2h.length?proximas2h:[0]);
    if(maxProb>=60){
      _avisoLluviaHecho=true;
      if(!vozOcupada() && !vozCola.length) h('Ojo, viene probabilidad alta de lluvia en las próximas horas — '+Math.round(maxProb)+' por ciento. Si puedes, busca techo o apúrate.');
    }
  }catch(e){}
}
// ===== Predicción real: cansancio ANTES de que sea evidente. Compara tu ritmo de
// los primeros ~15 min (fresco) contra una ventana móvil de los últimos 15 min; si
// cayó fuerte y llevas rato activo, sugiere un respiro — una sola vez por viaje.
var _fatigaBuffer=[], _avisoFatigaHecho=false, _velPromInicioFatiga=null; // var a propósito: se resetean desde fuera de este archivo al terminar/reiniciar un viaje
function _verificarFatiga(duracionActivaMs, speedActual){
  try{
    if(!vozActiva || _avisoFatigaHecho || !speedActual || speedActual<=0) return;
    if(typeof actividadTipo!=='undefined' && actividadTipo==='moto') return; // la velocidad de un vehículo no refleja el cansancio del conductor
    _fatigaBuffer.push({t:Date.now(), v:speedActual});
    const VENTANA=15*60000;
    while(_fatigaBuffer.length>1 && Date.now()-_fatigaBuffer[0].t>VENTANA) _fatigaBuffer.shift();
    if(!duracionActivaMs || duracionActivaMs<15*60000) return; // necesita referencia fresca de al menos 15 min
    const prom=function(arr){ return arr.reduce(function(a,b){return a+b.v;},0)/arr.length; };
    if(_velPromInicioFatiga==null){ if(_fatigaBuffer.length>=5) _velPromInicioFatiga=prom(_fatigaBuffer); return; }
    if(duracionActivaMs<40*60000 || _fatigaBuffer.length<5) return; // deja pasar tiempo real desde la referencia
    const velActual=prom(_fatigaBuffer);
    const caidaPct=(_velPromInicioFatiga-velActual)/_velPromInicioFatiga;
    // Piso absoluto: si la referencia inicial se capturó en una bajada rápida, una caída
    // porcentual de 25% puede seguir siendo un ritmo llano totalmente normal. Solo
    // avisamos si, además, el ritmo ACTUAL es genuinamente bajo para la actividad.
    const pisoAbsoluto=(typeof actividadTipo!=='undefined' && actividadTipo==='trekking')?2.5:10;
    if(caidaPct>=0.25 && velActual<=pisoAbsoluto){
      _avisoFatigaHecho=true;
      if(!vozOcupada() && !vozCola.length){ try{ _pisteroMood='cansado'; }catch(e){} h('Se nota que bajaste harto el ritmo respecto a como arrancaste. Si puedes, date un respiro corto, toma agua y sigue con calma.'); }
    }
  }catch(e){}
}
// Pronostico al registrar una ruta: se anuncia al poner un destino (antes de salir)
// y de nuevo al guardar/terminar el viaje (util para lo que viene despues de pedalear).
async function anunciarClimaRuta(lat,lon,intro){
  if(lat==null||lon==null) return;
  try{
    const w=await climaDeZona(lat,lon);
    if(w && w.current){
      const lluvia=(w.daily&&w.daily.precipitation_probability_max&&w.daily.precipitation_probability_max[0])||0;
      h((intro||'Clima de la zona')+': '+Math.round(w.current.temperature_2m)+' grados, '+wmoTexto(w.current.weather_code)+(lluvia>50?'. Probabilidad de lluvia alta, abrígate.':'.'));
    }
  }catch(e){}
}
