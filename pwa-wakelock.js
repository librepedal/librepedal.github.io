/* ===== PWA: Service Worker + Wake Lock (GPS/voz con pantalla apagada) ===== */
if('serviceWorker' in navigator){
  // Auto-actualización: si entra un Service Worker nuevo y toma control,
  // recargamos para que el usuario reciba siempre la última versión — PERO
  // antes se creía a ciegas que un controllerchange siempre significa "hay
  // versión nueva", y recargaba igual aunque la versión ya fuera la correcta.
  // Con varios despliegues seguidos (racha normal de trabajo), el SW puede
  // activarse por reinstalaciones redundantes o por inconsistencia momentánea
  // entre nodos del CDN — eso se sentía como "la app arranca dos veces" sin
  // que hiciera falta. Ahora se reverifica contra version.txt antes de decidir:
  // si ya estás en la versión correcta, no se recarga nada.
  let lpRefrescando=false;
  navigator.serviceWorker.addEventListener('controllerchange', function(){
    if(lpRefrescando) return;
    // Comparte el mismo freno que la auto-reparación por version.txt (arriba): si esa
    // ya recargó la página en esta visita, no sumamos una SEGUNDA recarga por este
    // otro mecanismo — evita el "arranca dos veces" cuando ambos se disparan seguidos.
    if(typeof _lpYaRecargoEstaVisita==='function' && _lpYaRecargoEstaVisita()) return;
    lpRefrescando=true; // se marca YA (antes del fetch async) para que un segundo
                         // controllerchange casi simultáneo no dispare su propia
                         // verificación en paralelo
    fetch('version.txt?cb='+Date.now(), {cache:'no-store'}).then(function(r){return r.text();}).then(function(v){
      v=(v||'').replace(/^﻿/,'').trim();
      if(v && v===APP_VERSION){ lpRefrescando=false; return; } // ya estás al día: no hacía falta recargar
      if(typeof _lpMarcarRecargaEstaVisita==='function') _lpMarcarRecargaEstaVisita();
      window.location.reload();
    }).catch(function(){
      // sin poder confirmar la versión, se mantiene el comportamiento de antes
      // (recargar) para no dejar a nadie atascado en una versión vieja
      if(typeof _lpMarcarRecargaEstaVisita==='function') _lpMarcarRecargaEstaVisita();
      window.location.reload();
    });
  });
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js?v='+APP_VERSION).then(function(reg){
      // forzar chequeo de versión nueva en cada arranque
      try{ reg.update(); }catch(e){}
      if(reg.waiting){ reg.waiting.postMessage('skipWaiting'); }
      reg.addEventListener('updatefound', function(){ const nw=reg.installing; if(nw){ nw.addEventListener('statechange', function(){ if(nw.state==='installed' && navigator.serviceWorker.controller){ nw.postMessage('skipWaiting'); } }); } });
    }).catch(function(e){ console.warn('SW no registrado:', e); });
  });
}

/* Mantiene la pantalla despierta mientras se navega/graba, para que GPS y voz sigan.
   Si el usuario apaga la pantalla igual, el navegador suelta el lock; al volver, se re-adquiere. */
const lpWakeLock = (function(){
  let lock=null, wanted=false;
  async function request(){
    if(!('wakeLock' in navigator)) return;
    try{ lock=await navigator.wakeLock.request('screen');
      lock.addEventListener('release', function(){ lock=null; });
    }catch(e){ /* batería baja u otra restricción: seguimos sin lock */ }
  }
  document.addEventListener('visibilitychange', function(){
    if(wanted && document.visibilityState==='visible' && !lock) request();
  });
  return {
    enable: function(silencioso, sinSalud){ wanted=true; request(); if(!sinSalud) lpSalud.start(silencioso); },
    disable: function(){ wanted=false; if(lock){ lock.release().catch(function(){}); lock=null; } lpSalud.stop(); }
  };
})();
function _navActivoAhora(){ const n=document.getElementById('nav-screen'); return !!(n && n.classList.contains('active')); }
function _lpWLoff(){ try{ if(typeof lpWakeLock==='object' && !(typeof ig!=='undefined'&&ig) && !_navActivoAhora() && !(typeof manosLibresOn!=='undefined'&&manosLibresOn)) lpWakeLock.disable(); }catch(e){} }
