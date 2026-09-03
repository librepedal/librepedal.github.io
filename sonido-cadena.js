/* ===== SONIDO DE CADENA EN EL PIÑÓN (trinquete metálico realista, alta calidad) =====
   Un piñón libre = tren de clics metálicos que aceleran/frenan con la velocidad.
   Se usa al girar la rueda de carga y al tocar/mover la esfera. */
function cadenaClick(v){
  try{
    const ac=_ac(), t0=ac.currentTime, verb=_reverb();
    // Burst de ruido muy corto con decay = el "tic" del trinquete
    const len=Math.floor(ac.sampleRate*0.011);
    const buf=ac.createBuffer(1,len,ac.sampleRate); const d=buf.getChannelData(0);
    for(let i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2); }
    const src=ac.createBufferSource(); src.buffer=buf;
    // Queja real de Inty: "genérico y muy fuerte". Causa 1 (genérico): solo tenía dos
    // resonancias agudas (2.9-5.7kHz) — sonaba a "tic" fino de sintetizador, sin el
    // cuerpo grave metálico de un trinquete real. Se agrega bp0 (grave) para el "clac"
    // mecánico. Causa 2 (fuerte): bp1+bp2 se sumaban en el mismo nodo de ganancia ANTES
    // de aplicar v — dos resonancias sumadas suenan más fuerte de lo que v sugiere. Se
    // compensa con un factor fijo (antes *0.55) en vez de subir v en cada lugar que lo llama.
    // 2026-08-15: Inty pidió otra vuelta — sigue sonando fuerte y quiere más realismo.
    // Bajado el factor de ganancia (0.55->0.30) y las resonancias agudas de Q más
    // angosto (6.5/7 -> 4.5/5): un Q muy alto suena "tonal"/sintético (silbido fino),
    // uno más ancho se parece más al clic seco de un piñón real. Decay más rápido
    // (pow 2.6->3.2) = transiente más corto y percusivo, menos "zumbido".
    const bp0=ac.createBiquadFilter(); bp0.type='bandpass'; bp0.frequency.value=950+Math.random()*250; bp0.Q.value=3.5;
    const bp1=ac.createBiquadFilter(); bp1.type='bandpass'; bp1.frequency.value=2900+Math.random()*500; bp1.Q.value=4.5;
    const bp2=ac.createBiquadFilter(); bp2.type='bandpass'; bp2.frequency.value=5000+Math.random()*700; bp2.Q.value=5;
    const g=ac.createGain(); g.gain.value=(v==null?0.05:v)*0.30;
    const gBody=ac.createGain(); gBody.gain.value=0.5; // el grave aporta cuerpo, no debe tapar el "tic"
    const send=ac.createGain(); send.gain.value=0.07; // pizca de reverb = "alta calidad", sin embarrar
    src.connect(bp0); src.connect(bp1); src.connect(bp2);
    bp0.connect(gBody); gBody.connect(g); bp1.connect(g); bp2.connect(g);
    g.connect(ac.destination); g.connect(send); send.connect(verb);
    src.start(t0);
  }catch(e){}
}
let _cad={on:false, timer:0, vel:0, coast:false};
function _cadTick(){
  if(!_cad.on) return;
  cadenaClick(0.025+_cad.vel*0.045);
  if(_cad.coast){ _cad.vel*=0.90; if(_cad.vel<0.05){ _cad.on=false; return; } } // piñón libre: frena y para solo
  const gap=62-_cad.vel*44; // rápido → clics juntos (~18ms), lento → separados (~62ms)
  _cad.timer=setTimeout(_cadTick, Math.max(16, gap+(Math.random()*8-4)));
}
function cadenaIniciar(v){ _cad.coast=false; _cad.vel=Math.max(_cad.vel, v||0.4); if(!_cad.on){ _cad.on=true; _cadTick(); } }
function cadenaVel(v){ _cad.coast=false; _cad.vel=Math.max(0,Math.min(1,v)); if(!_cad.on){ _cad.on=true; _cadTick(); } }
function cadenaDetener(){ _cad.on=false; clearTimeout(_cad.timer); }
function cadenaCoast(){ _cad.coast=true; } // soltaste: la cadena desacelera y se detiene sola
// Compatibilidad con llamadas previas
function sonidoCadenaIniciar(){ cadenaIniciar(0.4); }
function sonidoCadenaDetener(){ cadenaCoast(); }
