/* ===== Recordatorios inteligentes de salud y seguridad (mientras pedaleas) =====
   Solo se activan durante un pedaleo real (GPS/navegación) y se pueden apagar
   con localStorage 'lp_salud'='off'. Espaciados para acompañar, no molestar. */
// ===== Tips "idioma de la ruta": buenas practicas REALES por modo, durante el viaje.
// Prioridad baja (hAmbiente) -> NUNCA pisan un giro, un peligro ni otro comentario.
// Los motorizados reutilizan los consejos que ya existian (apertura holandesa, etc.).
const TIPS_RUTA = {
  ciclismo: [
    "El freno delantero hace el setenta por ciento de la frenada. Modulalo, nunca de golpe, y frena antes de la curva, no dentro.",
    "Cadencia entre ochenta y noventa. Pedalear suave y redondo cansa menos y cuida mas las rodillas que forzar el plato grande.",
    "Sobre veinticinco por hora, el viento es casi todo lo que te frena. Baja el torso y ahorras energia sin pedalear mas.",
    "En la curva, pedal de afuera abajo y con peso, y mira a la salida, no la rueda de adelante.",
    "En calles estrechas toma el centro del carril. Que te vean; no pegado a la vereda, donde te abren una puerta.",
    "Luz roja atras y blanca adelante, tambien de dia. La mayoria de los atropellos son por no ser visto."
  ],
  cicloviaje: [
    "Carga el peso pesado abajo y centrado, cerca del pedalier. Arriba o muy atras, la direccion se pone inestable.",
    "Reparte la carga: mas o menos cuarenta por ciento adelante y sesenta atras. Demasiado peso adelante hace pesada la direccion.",
    "En subida cargado, quedate sentado. Parado pierdes traccion en la rueda de atras y gastas de mas.",
    "Con carga, baja un poco la presion de los neumaticos para mas agarre y confort. Pero sin pasarte, o pellizcas la camara.",
    "Revisa los pernos de las parrillas y portabultos todos los dias. La vibracion del camino los va aflojando."
  ],
  mtb: [
    "Mira a donde quieres ir, no el obstaculo. Si miras la piedra, terminas en la piedra.",
    "En los descensos, sillin abajo y el cuerpo atras y bajo. Centro de gravedad bajo es control.",
    "Posicion de ataque: codos afuera, rodillas flexionadas, talones abajo y el peso al centro.",
    "No bloquees la rueda. Derrapar te hace perder control y rompe el sendero. Frena antes de lo tecnico, modulando.",
    "En raices y piedras, deja que la bici se mueva bajo ti. La inercia es tu amiga."
  ],
  trekking: [
    "En subida, pasos cortos y ritmo parejo. Si la pendiente es fuerte, zigzaguea para bajarle la inclinacion.",
    "Usa bastones. Bajan harto la carga en las rodillas, sobre todo cuando vas bajando.",
    "En bajada, amarra fuerte la parte de adelante de la bota. Asi el pie no golpea y no te salen unas negras.",
    "Toma agua a sorbos seguido, como medio litro por hora en esfuerzo. No esperes a tener sed.",
    "Ve a ritmo conversacional. Si no puedes hablar, vas muy fuerte para durar."
  ],
  moto: [
    "Abre la puerta con la mano de mas lejos: la apertura holandesa. El cuerpo se gira solo y te obliga a mirar atras. Evita el golpe que mas ciclistas manda al hospital.",
    "Antes de doblar a la derecha, mira el espejo y el punto ciego. El ciclista de tu costado viene mas rapido de lo que crees.",
    "Si vas a doblar en la esquina, no adelantes al ciclista antes. Ganas dos segundos y te lo llevas. Quedate atras, llegas igual.",
    "La ciclovia no es estacionamiento. Parar ahi obliga al ciclista a salirse al trafico, la maniobra mas peligrosa, y se la provocaste tu.",
    "Deja tres segundos de distancia con el de adelante. El doble si esta lloviendo.",
    "En la curva, mira la salida, no el borde. Vas hacia donde miras: entra lento y sale acelerando.",
    "Con la primera lluvia el asfalto esta mas resbaloso por el aceite. Frena antes y mas suave."
  ]
};
let _tipsUsados=[];
function _soltarTipRuta(){
  if(typeof vozActiva!=='undefined' && !vozActiva) return;
  const modo=(typeof actividadTipo!=='undefined')?actividadTipo:'ciclismo';
  const pool=TIPS_RUTA[modo]||TIPS_RUTA.ciclismo;
  if(!pool||!pool.length) return;
  let dispo=pool.filter(function(t){ return _tipsUsados.indexOf(t)<0; });
  if(!dispo.length){ _tipsUsados=[]; dispo=pool; }
  const tip=dispo[Math.floor(Math.random()*dispo.length)];
  _tipsUsados.push(tip); if(_tipsUsados.length>60) _tipsUsados=_tipsUsados.slice(-60);
  if(typeof hAmbiente==='function') hAmbiente(tip);
}
const lpSalud = (function(){
  let timer=null, mins=0;
  const recurrentes=[
    {cada:20, msg:"Toma agüita, mijo. Hidrátate aunque no tengas sed."},
    {cada:35, msg:"Estira las piernas y la espalda en la próxima parada."},
    {cada:60, msg:"Come algo: una fruta o snack para no quedarte sin pila."},
    {cada:90, msg:"Reaplica bloqueador y cuídate del sol."}
  ];
  function activo(){ return localStorage.getItem('lp_salud')!=='off'; }
  function tick(){
    if(!activo()) return;
    mins++;
    recurrentes.forEach(function(r){ if(mins % r.cada === 0 && typeof h==='function') h(r.msg); });
    if(mins>0 && mins % 11 === 7) _soltarTipRuta(); // Tip de ruta cada ~11 min, prioridad baja
  }
  return {
    start:function(silencioso){
      if(timer || !activo()) return; mins=0;
      // Chequeo de la bici al partir (una sola vez, sin pisar el aviso de GPS) —
      // pero SOLO si el viaje arrancó de verdad (silencioso=falsy). Si el GPS se
      // prendió solo al abrir la app, este aviso no tiene sentido todavía: quejas
      // reales de Inty, sonaba como si ya hubieras salido a pedalear sin haberlo
      // decidido. Los recordatorios recurrentes (hidratación, etc.) sí siguen
      // corriendo igual — esos ya tardan varios minutos en aparecer.
      // Aviso al partir, distinto por modo de actividad (pedido de Inty 2026-08-08):
      // ciclismo/MTB/cicloviaje = chequeo mecánico de la bici; trekking = frase motivadora;
      // motorizado = niveles de agua/aceite, pero NO cada viaje (se sentía spam) — aleatorio,
      // forzado al menos una vez al mes por si el azar nunca lo saca.
      if(!silencioso) setTimeout(function(){
        if(!activo() || typeof h!=='function') return;
        if(actividadTipo==='trekking'){
          h("Recuerda llevar fuego, ese fuego que llevas dentro. ¡Buen viaje!");
        } else if(actividadTipo==='moto'){
          var _kNiveles='lp_aviso_niveles_'+(cu||'x');
          var _diasNiveles=(Date.now()-parseInt(localStorage.getItem(_kNiveles)||'0',10))/86400000;
          if(_diasNiveles>=30 || Math.random()<0.25){
            h("¿Hace cuánto que no revisas los niveles de agua y aceite? ¡Buen viaje!");
            localStorage.setItem(_kNiveles, String(Date.now()));
          }
        } else {
          h("Antes de salir: revisa tu bici. ¡Buen viaje!");
        }
      }, 6500);
      timer=setInterval(tick, 60000);
    },
    stop:function(){ if(timer){ clearInterval(timer); timer=null; } mins=0; }
  };
})();
