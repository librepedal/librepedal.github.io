/* MODO BOLSILLO EN LA NAVEGACIÓN (2026-10-09). Inty: "la app no está dando indicaciones con la pantalla apagada,
   soluciónalo ya". Con la pantalla APAGADA (botón de encendido) la app instalada deja de recibir el GPS (puente de
   Capacitor; el arreglo de raíz va en la versión nueva de Play Store, android.useLegacyBridge) y sin GPS Pistero no sabe
   cuándo hablar. Lo que sí funciona hoy en cualquier teléfono: NO apagarla sino ponerla en negro (#saver, "Ahorro
   pantalla"): la pantalla sigue encendida para Android (Screen Wake Lock, WebView 84+ según MDN), el GPS sigue llegando
   y Pistero sigue guiando. Ese modo existía pero escondido en Perfil > Rendimiento: acá se pone a mano durante la
   navegación (mismo lugar y forma que los botones flotantes del mapa) y se avisa UNA vez al empezar a navegar. */
(function(){
  var CSS='.nav-bolsillo-btn{position:absolute;right:14px;bottom:266px;z-index:550;background:rgba(15,20,35,0.92);color:#e8edf6;'
    +'border:2px solid rgba(255,255,255,0.2);width:46px;height:46px;border-radius:50%;font-size:1.15rem;cursor:pointer;display:flex;'
    +'align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.5);-webkit-tap-highlight-color:transparent}'
    +'.nav-bolsillo-btn:active{transform:scale(0.94)}';
  var AVISO='lp_tip_bolsillo';
  function montar(){
    var nav=document.getElementById('nav-screen'); if(!nav || document.getElementById('btnNavBolsillo')) return;
    var st=document.createElement('style'); st.id='lp-bolsillo-css'; st.textContent=CSS; document.head.appendChild(st);
    var b=document.createElement('button'); b.id='btnNavBolsillo'; b.className='nav-bolsillo-btn'; b.type='button';
    b.title='Modo bolsillo: pantalla negra, Pistero te sigue guiando'; b.setAttribute('aria-label','Modo bolsillo: pantalla en negro sin cortar la guía por voz');
    b.innerHTML='<i class="fas fa-battery-half"></i>';
    b.onclick=function(e){ e.stopPropagation(); if(typeof toggleSaver==='function') toggleSaver(); };
    nav.appendChild(b);
    // aviso único al empezar a navegar (la clase "active" la pone la app al abrir la navegación)
    try{ new MutationObserver(function(){ if(nav.classList.contains('active')) avisar(); }).observe(nav,{attributes:true,attributeFilter:['class']}); }catch(e){}
  }
  function avisar(){
    try{ if(localStorage.getItem(AVISO)) return; localStorage.setItem(AVISO,'1'); }catch(e){ return; }
    setTimeout(function(){ if(typeof lpAviso==='function') lpAviso('Para que Pistero te siga dando las indicaciones, no apagues la pantalla con el botón de encendido: toca el botón de la batería (modo bolsillo). La pantalla queda en negro y gasta poco.'); }, 6000);
  }
  // en negro y navegando: la velocidad y los km son los de la navegación (#navSpeed/#navDistTotal); el #saver solo lo
  // actualizaba la grabación libre (ug) y se quedaba en 0 navegando
  function espejo(){
    var sv=document.getElementById('saver'), nav=document.getElementById('nav-screen');
    if(!sv || !sv.classList.contains('on') || !nav || !nav.classList.contains('active')) return;
    var v=document.getElementById('navSpeed'), d=document.getElementById('navDistTotal'), a=document.getElementById('saverSpd'), k=document.getElementById('saverKm');
    if(v && a) a.innerText=v.innerText; if(d && k) k.innerText=d.innerText;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',montar); else montar();
  setInterval(espejo,1000);
  window.lpModoBolsillo={montar:montar, avisar:avisar, espejo:espejo};
})();
