// ===== Personalidad de Pistero: el tono cambia, la identidad (Pistero, chileno,
// experto) no. 'cercano' es el default — mismo tono que siempre tuvo la app.
/* Los arquetipos dejaron de ser rasgos abstractos («relajado», «directo») y pasaron a ser
   TIPOS DE CICLISTA, para que uno se reconozca en alguno (idea de Inty, 2026-07-20).
   Varios ids se conservan aunque cambie la etiqueta —`sabio`→Veterano, `relajado`→Hippie,
   `aventurero`→Malas Ideas, `maternal`→Tío— **a propósito**: esos ids ya tienen bancos de
   frases escritos y cambiarlos los habría tirado a la basura. La etiqueta es lo que ve el
   usuario; el id es cosa de la máquina.
   Los ids que salieron de la lista (humoristico, guia, sensible, directo, picaro, relator)
   siguen funcionando para quien los tenga elegidos: sus frases no se borraron.
   «Malas Ideas» es la broma: sus ideas siempre terminan siendo buenas. */
function _labelPersonalidad(p){
  const fem=(typeof pisteroGenero!=='undefined' && pisteroGenero==='c');
  return fem ? (p.labelF||p.label) : p.label;
}
/* 2026-07-20 — Inty: "poner Pistero X Pistero Y está demás, deja el adjetivo solamente".
   Tenía razón: la lista se titula "Tipos de Pistero", así que repetir "Pistero" en las 12
   filas es ruido puro y encima alarga cada etiqueta hasta cortarse en pantalla angosta.
   Queda solo el adjetivo. Los IDs no cambian: son los que guardan la preferencia del
   usuario y las claves de los 364 bancos de frases en FRASES_ARQ. */
const PERSONALIDADES=[
  {id:'cercano',    label:'🚴 El de siempre', labelF:'🚴 La de siempre'},
  {id:'compadre',   label:'🧉 Compadre',      labelF:'🧉 Comadre'},
  {id:'entrenador', label:'💪 Entrenador',    labelF:'💪 Entrenadora'},
  {id:'roquero',    label:'🎸 Roquero',       labelF:'🎸 Roquera'},
  {id:'profe',      label:'🎓 Profe',         labelF:'🎓 Profe'},
  {id:'solitario',  label:'🌄 Solitario',     labelF:'🌄 Solitaria'},
  {id:'loco',       label:'🤪 Loco',          labelF:'🤪 Loca'},
  {id:'cicletero',  label:'🔧 Cicletero',     labelF:'🔧 Cicletera'},
  {id:'sabio',      label:'🎖️ Veterano',      labelF:'🎖️ Veterana'},
  {id:'relajado',   label:'🌻 Hippie',        labelF:'🌻 Hippie'},
  {id:'aventurero', label:'💡 Malas Ideas',   labelF:'💡 Malas Ideas'},
  {id:'maternal',   label:'🧣 Tío',           labelF:'🧣 Tía'},
  {id:'seductor',   label:'🌹 Seductor',      labelF:'🌹 Seductora'},
  {id:'otaku',      label:'🎌 Otaku',         labelF:'🎌 Otaku'}
];
let pisteroPersonalidad=localStorage.getItem('lp_personalidad')||'cercano';
// Variedad de voz por arquetipo: Azure es-CL solo tiene 2 voces (Catalina/Lorenzo), no hay
// más "voces" chilenas que pedir por nombre — así que la variedad viene de prosodia
// (velocidad/tono) sobre esa misma voz, no de cambiar de voz. Números conservadores a
// propósito (nunca se escuchó en vivo: mejor quedarse corto que sonar robótico o forzado).
// 2026-07-21 (sesión 2, Inty me reasignó la voz): este mapa quedó DESINCRONIZADO cuando
// los arquetipos pasaron a ser tipos de ciclista. Tenía claves viejas que ya no existen
// (humoristico, guia, sensible, directo, relator, picaro) y 5 arquetipos actuales
// (roquero, profe, solitario, loco, cicletero) SIN entrada -> caían al default -> "todos
// suenan igual", que es justo lo que reclamó Inty. Ahora las 12 claves calzan 1:1 con los
// ids de PERSONALIDADES y el rango se abrió (rate -18%..+22%, pitch -8%..+10%) para que se
// distingan de verdad. Cubierto por tests/voz-prosodia.test.mjs para que no vuelva a driftar.
const PERSONALIDAD_PROSODIA={
  cercano:   {rate:'+0%',  pitch:'+0%'},   // el de siempre: neutro
  compadre:  {rate:'-4%',  pitch:'-3%'},   // chileno cálido, tranquilo
  entrenador:{rate:'+16%', pitch:'+3%'},   // firme y con pila
  roquero:   {rate:'+2%',  pitch:'-8%'},   // grave, con actitud
  profe:     {rate:'-8%',  pitch:'+2%'},   // pausado y claro
  solitario: {rate:'-14%', pitch:'-5%'},   // parco, bajo, poca energía
  loco:      {rate:'+22%', pitch:'+10%'},  // acelerado y agudo
  cicletero: {rate:'+6%',  pitch:'-2%'},   // práctico, directo
  sabio:     {rate:'-18%', pitch:'-8%'},   // veterano, lento y grave
  relajado:  {rate:'-16%', pitch:'+0%'},   // hippie, mundo tranquilo
  aventurero:{rate:'+12%', pitch:'+6%'},   // "malas ideas", ágil y pícaro
  maternal:  {rate:'-9%',  pitch:'-1%'},   // tío/tía, suave
  seductor:  {rate:'-10%', pitch:'-4%'},   // elegante, suave y pausado
  otaku:     {rate:'+10%', pitch:'+7%'}    // entusiasta, agudo y rápido
};
// 2026-08-16: el audio PRE-GRABADO (ElevenLabs/Azure fijo) sonaba igual sin importar
// el arquetipo elegido -- solo la voz EN VIVO (Azure runtime) aplicaba esta prosodia.
// Como ElevenLabs tiene prioridad y cubre la mayoría de las frases, en la práctica
// casi nunca se oía la personalidad elegida, y cuando SÍ caía a la voz en vivo (frases
// nuevas) sonaba de golpe distinto -- eso es lo que reportó Inty como "voces
// diferentes en las frases". playbackRate es lo único que un <audio> puede ajustar
// sin re-generar el archivo (no hay pitch real sin procesar la onda); los navegadores
// modernos preservan el tono al cambiar la velocidad, así que no suena a ardilla.
function _rateArq(){
  var pr=PERSONALIDAD_PROSODIA[pisteroPersonalidad]||PERSONALIDAD_PROSODIA.cercano;
  var n=parseInt(pr.rate,10)||0;
  return Math.max(0.75,Math.min(1.25, 1+n/100));
}
function elegirPersonalidad(id){
  if(!PERSONALIDADES.some(function(p){return p.id===id;})) return;
  pisteroPersonalidad=id; try{ localStorage.setItem('lp_personalidad',id); }catch(e){}
  try{ trackEvent('voz', id); }catch(e){} // mide qué arquetipo eligen (para decidir premium)
  // Igual que la actividad: se sube al perfil para no perderla al cambiar de celular.
  if(cu){ try{ db.collection('users').doc(cu).set({personalidad:id},{merge:true}).catch(function(){}); }catch(e){} }
  renderPersonalidadGrid();
  h('Listo, así te hablo de ahora en adelante.');
}
function renderPersonalidadGrid(){
  const c=document.getElementById('personalidadGrid'); if(!c) return;
  c.innerHTML=PERSONALIDADES.map(function(p){ return '<div class="custom-option'+(p.id===pisteroPersonalidad?' selected':'')+'" onclick="elegirPersonalidad(\''+p.id+'\')" style="text-align:left;padding:9px 34px 9px 12px"><div class="check">OK</div><strong style="font-size:0.82rem">'+_labelPersonalidad(p)+'</strong><button onclick="previsualizarPersonalidad(\''+p.id+'\',event)" style="position:absolute;bottom:4px;right:4px;background:rgba(252,76,2,0.15);border:1px solid var(--p);color:var(--p);border-radius:50%;width:26px;height:26px;font-size:0.75rem;cursor:pointer;line-height:1;padding:0" title="Escuchar voz" aria-label="Escuchar voz"><i class="fas fa-volume-high"></i></button></div>'; }).join('');
}
/* Probador de voces: deja escuchar cómo suena cada arquetipo ANTES de elegirlo, con la
   voz ElevenLabs real (voces-el/) — pidió Inty un "probador" en la selección de
   personalidad. Toma la primera frase disponible de ese arquetipo en FRASES_ARQ, la busca
   en el manifest de ElevenLabs y reproduce el mp3 ya generado. Si no hay frase o no está en
   el catálogo (aún no generado), no hace nada — no interrumpe ni rompe la selección normal.
   stopPropagation evita que el clic en el botón también dispare elegirPersonalidad(). */
let _vozPreviewAudio=null;
function previsualizarPersonalidad(id, ev){
  try{ if(ev && ev.stopPropagation) ev.stopPropagation(); }catch(e){}
  try{
    let frase=null;
    for(const cat of Object.keys(FRASES_ARQ)){ if(FRASES_ARQ[cat][id] && FRASES_ARQ[cat][id].length){ frase=FRASES_ARQ[cat][id][0]; break; } }
    if(!frase) return;
    const fid=(typeof VOCES_MANIFEST_EL!=='undefined') && VOCES_MANIFEST_EL && VOCES_MANIFEST_EL.map && VOCES_MANIFEST_EL.map[frase];
    if(!fid) return;
    if(_vozPreviewAudio){ try{ _vozPreviewAudio.pause(); }catch(e){} }
    pararVoz(); // si Pistero venía hablando, que no se encime con el preview de la voz
    const a=new Audio('voces-el/'+pisteroGenero+fid+'.mp3');
    _vozPreviewAudio=a;
    a.play().catch(function(){});
  }catch(e){}
}
let navUserMarkers = [], maxSpeed = 0, speedReadings = [];
// Umbrales de ritmo FIJOS (km/h), iguales en frases, ánimo del personaje y el
// indicador del panel: parado=0, lento 4-8, normal 8-16, rápido 16+.
const RITMO_LENTO_MAX = 8, RITMO_NORMAL_MAX = 16;
// Umbrales de "vas lento/normal/rápido" por modo de actividad: los de ciclismo
// (8/16 km/h) no tienen sentido caminando (mucho más lento) ni en auto/moto
// (mucho más rápido) — sin esto, un viaje en auto siempre calificaba de "muy
// rápido" y una caminata siempre de "muy lenta", sin importar el ritmo real.
function _ritmoUmbrales(){
  const m=(typeof actividadTipo!=='undefined')?actividadTipo:'ciclismo';
  if(m==='trekking') return {lento:3, normal:7};
  if(m==='moto') return {lento:20, normal:90};
  if(m==='cicloviaje') return {lento:6, normal:12};
  if(m==='mtb') return {lento:6, normal:14};
  if(m==='ciclismo' && cicloCargado) return {lento:6, normal:12}; // más lento por el peso de la carga
  return {lento:RITMO_LENTO_MAX, normal:RITMO_NORMAL_MAX};
}
// Umbral de pendiente (%) a partir del cual vale la pena avisar/comentar: a
// un caminante no le importa un 4% (lo hace sin pensarlo), a un cicloviajero
// cargado un 3% ya se siente en las piernas, y a alguien motorizado casi
// nada le hace ruido salvo una cuesta de verdad.
function _umbralPendiente(){
  const m=(typeof actividadTipo!=='undefined')?actividadTipo:'ciclismo';
  if(m==='trekking') return 8;
  if(m==='moto') return 12;
  if(m==='cicloviaje') return 3;
  if(m==='mtb') return 5;
  if(m==='ciclismo' && cicloCargado) return 3;
  return 4;
}
let nextHydrateKm = 5, nextEatKm = 20;
let recognition = null, micOn = false;
let vozPref = null, vozActiva = (localStorage.getItem('lp_voz') !== 'off');
// Índices de la barra inferior: 0=Inicio 1=Mapa 2=Pistero 3=Social 4=Perfil.
// Taller/diario no aparecen: viven en la esfera, no marcan ningún botón de la barra.
const viewNav = {dash:0, routes:0, trips:0, newtrip:0, musica:0, ajustes:0, diario:0, mac:0, map:1, gui:1, pistero:2, chat:3, rec:3, novedades:3, customize:4, stats:4};

const frasesLento = ["¿Vas pedaleando o estás parando la chala?","Oye, te va a adelantar un guarén.","Un corpóreo del Doctor Simi corre más rápido.","¿Vas cansado o andas buscando monedas en el suelo?","Apúrate, que el lanchón de Chiloé te pilla.","Dale un poco más de color al pedaleo.","¿Te dio la pálida o qué pasó?","Mi abuelita pedalea más rápido que tú.","Tranquilo: las pirámides se hicieron ladrillo a ladrillo.","Si vas más lento, te van a multar por estorbar.","¿Pedaleas o estás meditando, maestro?","He visto tortugas con más prisa que tú.","Mi sombra ya llegó y te está esperando.","¿Todo bien por ahí?"];
const frasesNormal = ["¡Eso! Ritmo impecable, vas como avión.","Así da gusto, mantén ese pulso.","Ni don Francisco tenía ese aguante.","Ritmo preciso, me encanta.","A este paso llegamos a tomar tecito calientito.","La bicicleta es el vehículo perfecto, y tú lo confirmas.","No hay camino largo cuando suena buena música.","Disfruta: el destino importa tanto como el camino.","La felicidad se mide en kilómetros, y vas sumando.","Dos ruedas y un horizonte, no se necesita más.","El asfalto es tu lienzo, sigue pintando.","Cada subida tiene su bajada, recuérdalo.","Pedalear es volver a lo esencial.","La libertad huele a cadena recién aceitada."];
const frasesRapido = ["¡Pará un poco, fierita!","¡Vas hecho un cuete!","Modo Matrix activado, cuidado.","A esa velocidad te sacan parte.","¿Te persigue alguien o por qué tanta prisa?","Modo cohete encendido.","¡Estás volando, respira!","Frena un poquito en las curvas.","Pedaleas como si no hubiera mañana.","El viento ya ni te alcanza.","Cadena limpia, mente clara, piernas locas.","Vas tan rápido que el GPS está mareado."];
const frasesParado = ["¿Se soltó la cadena?","Buen momento para echar la yegua un rato.","Si pinchaste, saca los parches con calma.","¿Descansando o pegado al celular?","Toma agüita, que hidratarse es clave.","Respira hondo, pero no te quedes dormido.","¿Todo bien? Avísame si necesitas algo.","Un pinchazo es solo una excusa para estirar las piernas.","Revisa los radios mientras estás parado.","Aprovecha y ajusta el asiento."];
const frasesSubida = ["Esto se puso cuesta arriba, ¡dale con todo!","Subida a la vista, baja un cambio y no te apures.","Aquí se separan los pollos de las gallinas: ¡sube esa cuesta!","Un poco de sufrimiento ahora, después bajas volando.","Respira hondo, esta subida se acaba... en algún momento.","Las piernas van a hablar después de esto. ¡Vamos que se puede!","Cuesta arriba: ritmo parejo y no te la juegues toda de una.","Cada pedaleo en esta subida es Darma ganado, campeón."];
const frasesBajada = ["Bajada a la vista: cuidado con la velocidad y los baches.","Ahora te toca disfrutar, pero ojo con los frenos.","Se viene la bajada, agárrate que esto vuela.","Aprovecha de descansar las piernas, ya te ganaste esta bajada.","Ojo con las curvas en la bajada, no hay apuro.","Bajando rico, pero con la vista bien puesta en el camino."];
const frasesProfundas = ["Mira tus alforjas: si todo lo que necesitas cabe ahí, ¿para qué cargar con tanta m***** en la vida?","En la ciudad todo va a mil. Acá el mundo cambia al ritmo de tus ojos. Habita el presente, mijo.","El viento en contra enseña que no controlamos nada. Fluir es aprender a pedalear con lo que toque.","No estás de visita; tú eres parte de la naturaleza. Siente el aire y conéctate.","El silencio de la ruta no está vacío, está lleno de respuestas. Escúchate de verdad.","Para disfrutar la bajada, primero hay que sudar la subida. Así es la vida también.","El viaje te deja a solas contigo mismo. No le tengas miedo a tus pensamientos, déjalos pasar.","La felicidad es simple: un plato de comida caliente y un lugar donde tirar el saco.","Pedalear aquí es elegir ver el mundo con tus propios ojos, no a través de una pantalla.","La ruta no es cuántos kilómetros dejas atrás, sino cuántas trancas mentales vas botando.","Éxito no es acumular cosas. La verdadera riqueza es elegir dónde armar la carpa hoy.","El camino es un espejo. Lo que te molesta de la ruta, sánalo pedaleando.","El único kilómetro real es el que estás pisando ahora. Deja de pensar en la meta y disfruta.","La bici no miente: te muestra de qué estás hecho cuando las piernas ya no dan más.","La ciudad te enseña a competir; el pedal te enseña a compartir y conectar con la gente.","Desconéctate para conectar. Que tu único mapa sea el que dibujas con el corazón."];
const frasesMotivacionales = ["¡Vamos, que tú puedes!","El que se rinde no llega, y tú no eres de esos.","La subida está dura, pero la bajada es gloria.","Piensa en la bebida heladita que te espera.","¡Saca la garra!","Rómpete las piernas hoy y agradécelo mañana.","En la ciudad todo va a mil, tú lleva tu propio ritmo.","El viento en contra también enseña.","No estás de visita en este camino, eres parte de él.","Para disfrutar la bajada, primero hay que sudar la subida.","La felicidad es simple: dos ruedas y ganas.","Pedalear es elegir ver el mundo de verdad.","Tu única competencia eres tú mismo.","Cada pedalada cuenta, no lo olvides.","Desconéctate del ruido para conectar contigo.","El presente es un regalo, pedaléalo con calma.","Las cuestas más duras llevan a las mejores vistas.","Tu bicicleta no miente, te lleva donde pones el alma."];
