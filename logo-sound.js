/* Sonido del logo animado (video logo-presentacion.mp4), compartido entre
   bienvenida.html (landing) e index.html (login) para que la marca suene igual
   en los dos lados — pedido de Inty 2026-08-15, reemplaza el sonido anterior
   ("muy soso") por uno sincronizado a lo que pasa en el video, no un timer ciego.

   Cómo se ubicaron los tiempos: el clip mide 8.4s a 25fps (210 frames). Se
   analizó el brillo promedio de cada frame (ffprobe/signalstats) y el flash
   real del logo cae en el frame 186 → t=7.40s (brillo salta de ~58 a ~69, el
   pico de todo el clip). El resto de la curva sube suave desde ~2.4s, así que
   ahí van los clics de anticipación (mismo lenguaje que el piñón de la rueda
   de carga: cadenaClick).

   Suena UNA sola vez por sesión (sessionStorage): se engancha al primer gesto
   real del usuario (los navegadores bloquean audio audible sin eso) y dispara
   cada capa cuando el video *de verdad* pasa por ese punto — si el gesto llega
   después del primer loop, simplemente suena en el loop en el que ya está
   desbloqueado. Nunca dos veces. */
(function(){
  var SKEY='lp_logo_sound_played';
  if(sessionStorage.getItem(SKEY)==='1') return;
  if(localStorage.getItem('lp_land_sfx')==='off') return; // toggle de silencio de la landing, si existe

  var video = document.querySelector('.lp-logo-video, .hero-logo-video');
  if(!video) return;

  var ac=null, verb=null;
  function getAc(){
    ac = ac || new (window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended'){ try{ ac.resume(); }catch(e){} }
    return ac;
  }
  function getVerb(){
    if(verb) return verb;
    var c=getAc(), sr=c.sampleRate, len=Math.floor(sr*2.2);
    var buf=c.createBuffer(2,len,sr);
    for(var ch=0; ch<2; ch++){ var d=buf.getChannelData(ch); for(var i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3); } }
    var conv=c.createConvolver(); conv.buffer=buf;
    var wet=c.createGain(); wet.gain.value=0.5; conv.connect(wet); wet.connect(c.destination);
    verb=conv; return verb;
  }

  var unlocked=false;
  function unlock(){
    if(unlocked) return;
    unlocked=true;
    try{ getAc(); }catch(e){}
  }
  document.addEventListener('pointerdown', unlock, {once:true, passive:true});
  document.addEventListener('keydown', unlock, {once:true});
  document.addEventListener('touchstart', unlock, {once:true, passive:true});

  function clickPinon(t, freq, vol){
    try{
      var c=getAc(), len=Math.floor(c.sampleRate*0.014);
      var buf=c.createBuffer(1,len,c.sampleRate), d=buf.getChannelData(0);
      for(var i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2); }
      var src=c.createBufferSource(); src.buffer=buf;
      var bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=freq; bp.Q.value=4.5;
      var g=c.createGain(); g.gain.value=vol;
      src.connect(bp); bp.connect(g); g.connect(c.destination);
      src.start(t);
    }catch(e){}
  }
  function swellNoise(t0, dur, peakVol, f0, f1){
    try{
      var c=getAc(), len=Math.floor(c.sampleRate*dur);
      var buf=c.createBuffer(1,len,c.sampleRate), d=buf.getChannelData(0);
      for(var i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(Math.sin(Math.PI*i/len),1.5); }
      var src=c.createBufferSource(); src.buffer=buf;
      var bp=c.createBiquadFilter(); bp.type='bandpass';
      bp.frequency.setValueAtTime(f0,t0); bp.frequency.exponentialRampToValueAtTime(f1,t0+dur); bp.Q.value=1;
      var g=c.createGain(); g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(peakVol,t0+dur*0.7); g.gain.linearRampToValueAtTime(0,t0+dur);
      src.connect(bp); bp.connect(g); g.connect(c.destination);
      src.start(t0);
    }catch(e){}
  }
  function bellHit(t, freq, dur, vol){
    try{
      var c=getAc(), o=c.createOscillator(), g=c.createGain();
      o.type='sine'; o.frequency.value=freq;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.02); g.gain.exponentialRampToValueAtTime(0.0006,t+dur);
      o.connect(g); g.connect(c.destination);
      g.connect(getVerb());
      o.start(t); o.stop(t+dur+0.05);
    }catch(e){}
  }
  function shimmer(t0, dur, vol){
    try{
      var c=getAc(), len=Math.floor(c.sampleRate*dur);
      var buf=c.createBuffer(1,len,c.sampleRate), d=buf.getChannelData(0);
      for(var i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4); }
      var src=c.createBufferSource(); src.buffer=buf;
      var hp=c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=3200;
      var g=c.createGain(); g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.0004,t0+dur);
      src.connect(hp); hp.connect(g); g.connect(c.destination);
      g.connect(getVerb());
      src.start(t0);
    }catch(e){}
  }

  /* Partitura — t en segundos DENTRO del clip (0 a 8.4). */
  var beats=[
    {t:0.00, done:false, fn:function(t){ clickPinon(t,1500,0.05); }},
    {t:2.35, done:false, fn:function(t){ clickPinon(t,1350,0.045); swellNoise(t,0.5,0.022,900,1400); }},
    {t:2.75, done:false, fn:function(t){ clickPinon(t,1480,0.04); }},
    {t:3.15, done:false, fn:function(t){ clickPinon(t,1620,0.035); }},
    {t:7.40, done:false, fn:function(t){
      bellHit(t, 587.33, 0.55, 0.05);
      bellHit(t+0.09, 880.00, 0.65, 0.045);
      bellHit(t+0.16, 1174.66, 0.7, 0.03);
      shimmer(t, 0.9, 0.035);
    }}
  ];

  function tick(){
    if(!unlocked) return;
    var c, ct, now, pending=false;
    try{ c=getAc(); ct=video.currentTime; now=c.currentTime; }catch(e){ return; }
    beats.forEach(function(b){
      if(!b.done){
        if(ct>=b.t && ct<b.t+0.4){ b.done=true; b.fn(now); }
        else pending=true;
      }
    });
    if(!pending){
      sessionStorage.setItem(SKEY,'1');
      video.removeEventListener('timeupdate', tick);
    }
  }
  video.addEventListener('timeupdate', tick);
})();
