/* ===== SONIDOS DEL TALLER Y DEL SOBREVUELO (2026-10-04, Inty: "quiero oír") =====
   Cada pieza de la tienda suena al tocarla (timbre, patito, perro, gato, banderín, estelas,
   motor…) y el sobrevuelo tiene su ambiente (cadena o motor) y sus momentos (viento al ir
   rápido, fanfarria en la cima, timbre o bocina al llegar).
   - Todo sintetizado con Web Audio en el momento: cero archivos, cero datos.
   - Usa el motor de audio de la app (_ac/_reverb de esfera.js) si está; si no, el suyo.
   - Respeta "Voz: OFF" (vozActiva===false → silencio total).
   - Volumen contenido: todo pasa por un compresor y una ganancia general baja (Inty ya
     pidió antes bajar sonidos "muy fuertes": ver sonido-cadena.js). */
var _psCtx=null, _psSalida=null;
function _psAC(){
  if(typeof _ac==='function') return _ac();
  _psCtx=_psCtx||new (window.AudioContext||window.webkitAudioContext)();
  if(_psCtx.state==='suspended'){ try{ _psCtx.resume(); }catch(e){ /* gate:permitido el navegador reanuda solo al siguiente gesto */ } }
  return _psCtx;
}
function _psSilencio(){ return (typeof vozActiva!=='undefined' && vozActiva===false) || typeof window==='undefined' || !(window.AudioContext||window.webkitAudioContext); }
// salida común: compresor suave + volumen general bajo + una pizca de reverb (si existe)
function _psOut(){
  var ac=_psAC();
  if(_psSalida && _psSalida.context===ac) return _psSalida;
  var comp=ac.createDynamicsCompressor(); comp.threshold.value=-22; comp.knee.value=20; comp.ratio.value=3; comp.attack.value=.005; comp.release.value=.25;
  // 2026-10-04 Inty: primero "bajarle un poco" (.55 → .35), después "muy fuerte, muy invasivo" (→ .14)
  // + paso bajo a 4,5 kHz: lo agudo y chillón es lo que más molesta al oído.
  var suave=ac.createBiquadFilter(); suave.type='lowpass'; suave.frequency.value=4500; suave.Q.value=.5;
  var g=ac.createGain(); g.gain.value=.14; comp.connect(suave); suave.connect(g); g.connect(ac.destination);
  if(typeof _reverb==='function'){ try{ var s=ac.createGain(); s.gain.value=.08; comp.connect(s); s.connect(_reverb()); }catch(e){ console.warn('[sonidos] sin reverb', e); } }
  _psSalida=comp; return comp;
}
// ---- piezas básicas ----
function _psTono(f,t0,dur,o){ o=o||{}; var ac=_psAC(), os=ac.createOscillator(), g=ac.createGain();
  os.type=o.tipo||'sine'; os.frequency.setValueAtTime(f,t0); if(o.a) os.frequency.exponentialRampToValueAtTime(o.a,t0+(o.en||dur));
  var v=o.v||.18; g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(v,t0+(o.ataque||.008)); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  var dst=_psOut(); if(o.filtro){ var bq=ac.createBiquadFilter(); bq.type=o.filtro; bq.frequency.value=o.ff||1200; bq.Q.value=o.q||1; os.connect(bq); bq.connect(g); } else os.connect(g);
  g.connect(dst); os.start(t0); os.stop(t0+dur+.05); return os; }
function _psRuido(t0,dur,o){ o=o||{}; var ac=_psAC(), len=Math.max(1,Math.floor(ac.sampleRate*dur)), b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0);
  for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*(o.forma?o.forma(i/len):1);
  var src=ac.createBufferSource(); src.buffer=b; var bq=ac.createBiquadFilter(); bq.type=o.filtro||'bandpass'; bq.frequency.setValueAtTime(o.ff||1500,t0); if(o.fa) bq.frequency.exponentialRampToValueAtTime(o.fa,t0+dur); bq.Q.value=o.q||1;
  var g=ac.createGain(); g.gain.value=o.v||.15; src.connect(bq); bq.connect(g); g.connect(_psOut()); src.start(t0); return src; }
// ---- grabaciones reales (animales: Inty, "deberían sonar como los animales. Es obvio") ----
// Archivos y licencias en sonidos/CREDITOS.md (crédito del ladrido en terminos.html).
// Se cargan la primera vez que se piden y quedan en memoria; si el navegador no puede
// decodificarlas (Ogg en algún Safari viejo), suena la versión sintetizada como respaldo.
// ruta relativa a ESTE archivo (sirve igual en la app y en las páginas de diseño)
var _PS_BASE=(typeof document!=='undefined'&&document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/[^/]*$/,''):'';
var _PS_MUESTRAS={perro:_PS_BASE+'sonidos/perro-ladrido.ogg',gato:_PS_BASE+'sonidos/gato-maullido.ogg',timbre:_PS_BASE+'sonidos/timbre-bici.wav',auto:_PS_BASE+'sonidos/auto-partida.ogg'}, _psBuf={};
function _psMuestra(n,t,rate,v,respaldo){
  var ac=_psAC();
  function tocar(buf){ var src=ac.createBufferSource(), g=ac.createGain(); src.buffer=buf; src.playbackRate.value=rate||1; g.gain.value=v||.8; src.connect(g); g.connect(_psOut()); src.start(Math.max(t,ac.currentTime)); }
  var b=_psBuf[n];
  if(b&&b!=='cargando'&&b!=='error'){ tocar(b); return; }
  if(b==='error'||typeof fetch!=='function'){ if(respaldo) respaldo(t); return; }
  if(b==='cargando') return;
  _psBuf[n]='cargando';
  fetch(_PS_MUESTRAS[n]).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); })
    .then(function(ab){ return new Promise(function(ok,mal){ ac.decodeAudioData(ab,ok,mal); }); })
    .then(function(buf){ _psBuf[n]=buf; tocar(buf); })
    .catch(function(e){ _psBuf[n]='error'; console.warn('[sonidos] grabación no disponible, uso la sintetizada:', n, e); if(respaldo) respaldo(ac.currentTime); });
}
var _psDecae=function(p){ return Math.pow(1-p,2.5); }, _psCampana=function(p){ return Math.sin(Math.PI*p); };
// ---- sonidos ----
var PS={
  timbre:function(t){ _psMuestra('timbre',t,1,.45,PS.timbreSint); },
  timbreSint:function(t){ [0,.16].forEach(function(dt){ [[2350,.16],[2350*2.76,.07],[2350*5.4,.035]].forEach(function(p){ _psTono(p[0],t+dt,.7,{v:p[1],ataque:.002}); }); }); },
  patito:function(t){ [0,.2].forEach(function(dt){ _psTono(900,t+dt,.17,{tipo:'triangle',a:1450,en:.08,v:.16,filtro:'bandpass',ff:1600,q:2}); }); },
  bocina:function(t){ [0,.22].forEach(function(dt){ _psTono(392,t+dt,.17,{tipo:'square',v:.07,filtro:'lowpass',ff:1600}); _psTono(494,t+dt,.17,{tipo:'square',v:.06,filtro:'lowpass',ff:1600}); }); },
  clic:function(t){ _psRuido(t,.03,{ff:2600,q:4,v:.25,forma:_psDecae}); _psRuido(t+.06,.03,{ff:1800,q:4,v:.2,forma:_psDecae}); },
  cadena:function(t){ for(var i=0;i<10;i++) _psRuido(t+i*.045,.012,{ff:3200+Math.random()*900,q:4.5,v:.12,forma:_psDecae}); },
  spray:function(t){ _psRuido(t,.45,{filtro:'highpass',ff:4200,v:.09,forma:function(p){ return p<.08?p/.08:1-(p-.08)*.6; }}); },
  brillo:function(t){ [1568,2093,2637].forEach(function(f,i){ _psTono(f,t+i*.06,.5,{v:.07}); }); },
  aro:function(t){ _psTono(3100,t,.6,{v:.08,ataque:.002}); _psTono(3100*2.4,t,.3,{v:.03,ataque:.002}); },
  inflar:function(t){ [0,.28].forEach(function(dt){ _psRuido(t+dt,.22,{ff:900,fa:2400,q:1.2,v:.12,forma:_psCampana}); }); },
  cierre:function(t){ for(var i=0;i<12;i++) _psRuido(t+i*.022,.012,{ff:2200+i*90,q:3,v:.1,forma:_psDecae}); },
  mimbre:function(t){ _psRuido(t,.25,{ff:420,q:6,v:.16,forma:_psCampana}); _psRuido(t+.18,.2,{ff:520,q:6,v:.12,forma:_psCampana}); },
  caja:function(t){ _psTono(150,t,.25,{a:70,v:.22}); _psRuido(t,.06,{ff:800,v:.12,forma:_psDecae}); },
  viento:function(t){ _psRuido(t,1,{ff:600,fa:1100,q:.8,v:.12,forma:function(p){ return _psCampana(p)*(.6+.4*Math.sin(p*60)); }}); },
  luces:function(t){ _psRuido(t,.02,{ff:3000,q:3,v:.22,forma:_psDecae}); _psTono(1320,t+.04,.16,{v:.06}); },
  papel:function(t){ for(var i=0;i<6;i++) _psRuido(t+i*.05,.04,{filtro:'highpass',ff:2500+Math.random()*1500,v:.07,forma:_psDecae}); },
  tela:function(t){ _psRuido(t,.32,{ff:900,fa:2600,q:.9,v:.1,forma:_psCampana}); },
  perro:function(t){ _psMuestra('perro',t,1,.5,PS.perroSint); },
  perroNegro:function(t){ _psMuestra('perro',t,.82,.55,PS.perroSint); },
  gato:function(t){ _psMuestra('gato',t,1,.45,PS.gatoSint); },
  perroSint:function(t){ [0,.24].forEach(function(dt){ _psTono(560,t+dt,.16,{tipo:'sawtooth',a:300,en:.14,v:.16,filtro:'bandpass',ff:1000,q:1.6}); _psRuido(t+dt,.05,{ff:1400,v:.06,forma:_psDecae}); }); },
  gatoSint:function(t){ var ac=_psAC(), os=ac.createOscillator(), bq=ac.createBiquadFilter(), g=ac.createGain();
    os.type='sawtooth'; os.frequency.setValueAtTime(520,t); os.frequency.linearRampToValueAtTime(820,t+.22); os.frequency.linearRampToValueAtTime(470,t+.6);
    bq.type='bandpass'; bq.Q.value=3; bq.frequency.setValueAtTime(700,t); bq.frequency.linearRampToValueAtTime(1600,t+.25); bq.frequency.linearRampToValueAtTime(800,t+.6);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.12,t+.05); g.gain.exponentialRampToValueAtTime(.0001,t+.62);
    os.connect(bq); bq.connect(g); g.connect(_psOut()); os.start(t); os.stop(t+.7); },
  chispas:function(t){ for(var i=0;i<16;i++) _psRuido(t+Math.random()*.6,.008,{filtro:'highpass',ff:5000,v:.18,forma:_psDecae}); },
  hojas:function(t){ for(var i=0;i<5;i++) _psRuido(t+i*.11,.1,{filtro:'highpass',ff:2800,v:.06,forma:_psCampana}); },
  nieve:function(t){ [2093,2637,3136,2349,2794].forEach(function(f,i){ _psTono(f,t+i*.12,.5,{v:.04}); }); },
  burbujas:function(t){ for(var i=0;i<6;i++) _psTono(500+Math.random()*400,t+i*.09,.08,{a:1400+Math.random()*600,v:.08}); },
  arcoiris:function(t){ [523,659,784,1047,1319,1568].forEach(function(f,i){ _psTono(f,t+i*.07,.6,{v:.06,tipo:'triangle'}); }); },
  fuego:function(t){ _psRuido(t,1,{filtro:'lowpass',ff:500,fa:1400,v:.2,forma:_psCampana}); PS.chispas(t+.15); },
  fanfarria:function(t){ [[523,0],[659,.12],[784,.24],[1047,.4]].forEach(function(n){ _psTono(n[0],t+n[1],n[1]===.4?.7:.2,{tipo:'triangle',v:.08}); }); },
  moto:function(t){ var ac=_psAC(), os=ac.createOscillator(), bq=ac.createBiquadFilter(), g=ac.createGain(), lfo=ac.createOscillator(), lg=ac.createGain();
    os.type='sawtooth'; os.frequency.setValueAtTime(55,t); os.frequency.exponentialRampToValueAtTime(150,t+.5); os.frequency.exponentialRampToValueAtTime(70,t+1.2);
    lfo.frequency.value=28; lg.gain.value=12; lfo.connect(lg); lg.connect(os.frequency);
    bq.type='lowpass'; bq.frequency.value=900; g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.12,t+.08); g.gain.exponentialRampToValueAtTime(.0001,t+1.3);
    os.connect(bq); bq.connect(g); g.connect(_psOut()); os.start(t); lfo.start(t); os.stop(t+1.35); lfo.stop(t+1.35); },
  auto:function(t){ _psMuestra('auto',t,1,.4,PS.autoSint); },
  autoSint:function(t){ _psRuido(t,.35,{filtro:'lowpass',ff:300,v:.18,forma:function(p){ return .5+.5*Math.sin(p*70); }}); PS.moto(t+.3); PS.bocina(t+1.1); }
};
// qué suena cada pieza de la tienda (lo que no está acá usa el de su categoría)
var _PS_PIEZA={
  biciExtra:{patito:'patito',luces:'luces',banderin:'viento',dorsal:'papel',nada:'clic'},
  biciCarga:{canasto:'mimbre',alforjas:'cierre',bikepacking:'cierre',caja:'caja',nada:'clic'},
  mascota:{quiltro:'perro',negro:'perroNegro',gato:'gato'},
  estela:{chispas:'chispas',hojas:'hojas',nieve:'nieve',burbujas:'burbujas',arcoiris:'arcoiris',fuego:'fuego'},
  biciAcab:{metal:'brillo',neon:'brillo',carbono:'brillo'},
  motorTipo:{moto:'moto',auto:'auto'},
  biciTipo:{handbike:'cadena',triciclo:'timbre',bmx:'clic',gravel:'cadena'}
};
var _PS_CATEGORIA={biciTipo:'timbre',biciCol:'spray',biciCol2:'spray',biciSkin:'spray',biciAcab:'spray',biciNeum:'inflar',biciAros:'aro',biciCarga:'clic',biciExtra:'timbre',bandera:'viento',traje:'tela',mascota:'',estela:'',motorTipo:''};
function _psNombre(k,id){ var m=_PS_PIEZA[k]; return (m&&m[id])||(k in _PS_CATEGORIA?_PS_CATEGORIA[k]:''); }
// tocar una pieza en la tienda → suena (la usa _ptElegir de pistero-tienda.js)
var _psUltimo={n:'',t:0};
function pistSonar(k,id){
  if(_psSilencio()) return;
  var n=_psNombre(k,id); if(!n||!PS[n]) return;
  var ahora=Date.now(); if(_psUltimo.n===n && ahora-_psUltimo.t<1500) return; _psUltimo={n:n,t:ahora};
  try{ PS[n](_psAC().currentTime+.02); }catch(e){ console.warn('[sonidos] no sonó', k, id, e); }
}
function pistSonarNombre(n){ if(_psSilencio()||!PS[n]) return; try{ PS[n](_psAC().currentTime+.02); }catch(e){ console.warn('[sonidos] no sonó', n, e); } }
// ---- ambiente del sobrevuelo: cadena (bici) o motor (auto/moto) mientras avanza ----
function pistSonidoViaje(veh){
  var parar=function(){};
  if(_psSilencio()) return {parar:parar,momento:function(){}};
  try{
    if(veh==='auto'){ pistSonarNombre('auto'); }
    else if(veh==='moto'){
      var ac=_psAC(), os=ac.createOscillator(), bq=ac.createBiquadFilter(), g=ac.createGain(), lfo=ac.createOscillator(), lg=ac.createGain(), t=ac.currentTime;
      os.type='sawtooth'; os.frequency.value=78; lfo.frequency.value=24; lg.gain.value=6; lfo.connect(lg); lg.connect(os.frequency);
      bq.type='lowpass'; bq.frequency.value=700; g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.03,t+.6); g.gain.setValueAtTime(.03,t+2.4); g.gain.exponentialRampToValueAtTime(.0001,t+3.6);
      os.connect(bq); bq.connect(g); g.connect(_psOut()); os.start(t); lfo.start(t);
      os.stop(t+3.7); lfo.stop(t+3.7);
      parar=function(){ try{ var t2=ac.currentTime; if(t2<t+3.6){ g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(Math.max(.0001,g.gain.value),t2); g.gain.exponentialRampToValueAtTime(.0001,t2+.5); } }catch(e){ console.warn('[sonidos] motor', e); } };
    } else if(typeof cadenaVel==='function'){ cadenaVel(.25); var tc=setTimeout(function(){ if(typeof cadenaCoast==='function') cadenaCoast(); },2500); parar=function(){ clearTimeout(tc); if(typeof cadenaCoast==='function') cadenaCoast(); }; }
  }catch(e){ console.warn('[sonidos] ambiente del viaje', e); }
  // momentos del viaje: rápido = viento · cima = fanfarria · llegada = timbre (o bocina en auto/moto)
  function momento(e){ if(!e) return;
    if(e.rapido) pistSonarNombre('viento');
    else if(e.pose==='sinmanos') pistSonarNombre('fanfarria');
    else if(e.pose==='caballito') pistSonarNombre(veh==='moto'||veh==='auto'?'bocina':'timbre');
  }
  return {parar:parar,momento:momento};
}
